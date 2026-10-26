import 'server-only';

import { authorized, jsonBody, type Session } from './app-service';
import { authConfig } from './supabase-auth';
import { ReadError, uuid } from './validation';
import type { PoolClient } from 'pg';
import { listCompanyUsers, manageCompanyUser, preparePendingCorrection } from './user-management';

type Invitation = { email: string; displayName: string; roleId: string; portalId: string };
const localRedirect = /^http:\/\/(?:127\.0\.0\.1|localhost):3000\/activate$/;

function onboardingOptions() {
  const { url } = authConfig();
  const secret = process.env.BCS_SUPABASE_ADMIN_KEY ?? '';
  const redirect = process.env.BCS_INVITE_REDIRECT_URL ?? '';
  if (!/^sb_secret_[A-Za-z0-9_-]{15,}$/.test(secret) || !localRedirect.test(redirect)) {
    throw new ReadError(503, 'INVITATIONS_NOT_CONFIGURED');
  }
  return { url, secret, redirect };
}

async function requireCompanyAdmin(c: PoolClient, s: Session) {
  const allowed = await c.query<{ allowed: boolean }>(
    "SELECT bcs.session_allows($1,NULL,'access.manage') AS allowed", [s.company_id],
  );
  if (allowed.rows[0]?.allowed !== true) throw new ReadError(403, 'COMPANY_PERMISSION_REQUIRED');
}

/** Migration 020 grants INSERT only on six principal fields, not the entire table.
 * Require every approved column while rejecting a broad table INSERT grant. */
async function hasScopedPrincipalInsert(c: PoolClient): Promise<boolean> {
  const result = await c.query<{ allowed: boolean }>(
    `SELECT NOT has_table_privilege(current_user,'bcs.principals','INSERT')
      AND bool_and(has_column_privilege(current_user,'bcs.principals',needed.column_name,'INSERT')) AS allowed
      FROM unnest(ARRAY['company_id','identity_issuer','external_subject',
        'display_name','email','status']::text[]) AS needed(column_name)`,
  );
  return result.rows[0]?.allowed === true;
}

async function requireWritePermission(c: PoolClient) {
  if (!(await hasScopedPrincipalInsert(c))) throw new ReadError(503, 'USER_ENROLLMENT_MIGRATION_REQUIRED');
}

function parseInvitation(value: Record<string, unknown>): Invitation {
  if (value.action !== 'invite') throw new ReadError(400, 'INVALID_ACTION');
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  const displayName = typeof value.displayName === 'string' ? value.displayName.trim() : '';
  // Names are displayed by the Supabase HTML email template. Reject markup/control characters.
  const unsafeName = /[<>&]/.test(displayName) || [...displayName].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
  const roleId = typeof value.roleId === 'string' ? value.roleId : '';
  const portalId = typeof value.portalId === 'string' ? value.portalId : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !displayName || unsafeName || displayName.length > 120 || !uuid.test(roleId) || !uuid.test(portalId)) {
    throw new ReadError(400, 'INVALID_INVITATION');
  }
  return { email, displayName, roleId, portalId };
}

async function validateGrant(c: PoolClient, s: Session, payload: Invitation) {
  await requireCompanyAdmin(c, s);
  await requireWritePermission(c);
  const portal = await c.query(
    "SELECT 1 FROM bcs.portals WHERE company_id=$1 AND id=$2 AND status IN ('active','draft')",
    [s.company_id, payload.portalId],
  );
  if (portal.rowCount !== 1) throw new ReadError(404, 'PORTAL_NOT_FOUND');
  const role = await c.query(
    'SELECT id FROM bcs.roles WHERE company_id=$1 AND id=$2', [s.company_id, payload.roleId],
  );
  if (role.rowCount !== 1) throw new ReadError(404, 'ROLE_NOT_FOUND');
  const granted = await c.query<{ permission_code: string }>(
    'SELECT permission_code FROM bcs.role_permissions WHERE company_id=$1 AND role_id=$2',
    [s.company_id, payload.roleId],
  );
  if (!granted.rowCount || granted.rows.some(p => !s.permissions.includes(p.permission_code))) {
    throw new ReadError(403, 'CANNOT_GRANT_UNHELD_PERMISSION');
  }
  const exists = await c.query(
    'SELECT id FROM bcs.principals WHERE company_id=$1 AND lower(email)=$2', [s.company_id, payload.email],
  );
  if (exists.rowCount) throw new ReadError(409, 'COMPANY_PRINCIPAL_ALREADY_EXISTS');
}

export async function usersCapability(request: Request) {
  if (new URL(request.url).searchParams.has('view')) return listCompanyUsers(request);
  return authorized(request, 'access.manage', async (c, s) => {
    await requireCompanyAdmin(c, s);
    const writeAllowed = await hasScopedPrincipalInsert(c);
    let configured = false;
    try { onboardingOptions(); configured = true; } catch { /* Optional capability remains disabled. */ }
    return { invitationEnabled: configured && writeAllowed,
      setupRequired: configured ? (writeAllowed ? null : 'MIGRATION') : 'AUTH_ADMIN_CONFIGURATION' };
  });
}

export async function inviteCompanyUser(request: Request): Promise<Record<string, unknown>> {
  const body = await jsonBody(request);
  if (body.action === 'correct_pending_email') {
    // The old BCS account is suspended before any new invitation is issued.
    // Any provider failure MUST be surfaced, not silently re-enable the wrong address.
    const correction = await preparePendingCorrection(request, body);
    if (!correction.displayName) throw new ReadError(409, 'PENDING_USER_MISSING_NAME');
    const replacementRequest = new Request(request.url, {
      method: 'POST', headers: request.headers,
      body: JSON.stringify({ action:'invite', email:correction.newEmail,
        displayName:correction.displayName, roleId:correction.roleId, portalId:correction.portalId }),
    });
    try {
      const result = await inviteCompanyUser(replacementRequest);
      return { ...result, replacedPrincipalId:correction.oldPrincipalId };
    } catch {
      throw new ReadError(409, 'OLD_INVITATION_SUSPENDED_REPLACEMENT_FAILED');
    }
  }
  if (body.action !== 'invite') return manageCompanyUser(request, body);
  const payload = parseInvitation(body);
  const options = onboardingOptions();
  // Preflight all authorization and DB permissions before calling an external provider.
  await authorized(request, 'access.manage', async (c, s) => {
    await validateGrant(c, s, payload);
    return { allowed: true };
  });

  let remoteUserId: string;
  try {
    const url = new URL('/auth/v1/invite', options.url);
    url.searchParams.set('redirect_to', options.redirect);
    const result = await fetch(url, {
      method: 'POST',
      headers: { apikey: options.secret, Authorization: `Bearer ${options.secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: payload.email, data: { display_name: payload.displayName, full_name: payload.displayName } }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
    });
    if (!result.ok) {
      throw new ReadError(result.status === 429 ? 429 : result.status >= 500 ? 503 : 409,
        result.status === 429 ? 'AUTH_INVITATION_RATE_LIMITED' : 'AUTH_INVITATION_NOT_ACCEPTED');
    }
    const body: unknown = await result.json();
    const raw = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const u = raw.user && typeof raw.user === 'object'
      ? raw.user as Record<string, unknown> : raw;
    if (typeof u.id !== 'string' || !uuid.test(u.id) || String(u.email ?? '').toLowerCase() !== payload.email) {
      throw new ReadError(503, 'AUTH_INVITATION_RESPONSE_INVALID');
    }
    remoteUserId = String(u.id);
  } catch (e) {
    if (e instanceof ReadError) throw e;
    throw new ReadError(503, 'AUTH_INVITATION_UNAVAILABLE');
  }

  // An external email invitation cannot participate in our local DB transaction.
  // On DB failure, report reconciliation; NEVER claim the user is provisioned.
  try {
    return await authorized(request, 'access.manage', async (c, s) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${s.company_id}:user-enrollment`]);
      await validateGrant(c, s, payload);
      const identityIssuer = `${options.url}/auth/v1`;
      const existing = await c.query(
        'SELECT id FROM bcs.principals WHERE identity_issuer=$1 AND external_subject=$2',
        [identityIssuer, remoteUserId],
      );
      if (existing.rowCount) throw new ReadError(409, 'AUTH_IDENTITY_ALREADY_LINKED');
      const p = await c.query<{ id: string }>(
        "INSERT INTO bcs.principals(company_id,identity_issuer,external_subject,display_name,email,status) VALUES($1,$2,$3,$4,$5,'active') RETURNING id",
        [s.company_id, identityIssuer, remoteUserId, payload.displayName, payload.email],
      );
      const principalId = p.rows[0].id;
      await c.query(
        'INSERT INTO bcs.principal_portal_scopes(company_id,principal_id,portal_id) VALUES($1,$2,$3)',
        [s.company_id, principalId, payload.portalId],
      );
      await c.query(
        'INSERT INTO bcs.principal_role_assignments(company_id,principal_id,role_id,portal_id) VALUES($1,$2,$3,$4)',
        [s.company_id, principalId, payload.roleId, payload.portalId],
      );
      await c.query(
        "INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference,safe_metadata) VALUES($1,$2,$3,'user.invited','principal',$4,$5::jsonb)",
        [s.company_id, s.portal_id, s.principal_id, principalId, JSON.stringify({ target_portal_id: payload.portalId })],
      );
      return { invited: true, principalId, message: 'Invitation submitted; activation must be completed by the recipient.' };
    });
  } catch {
    throw new ReadError(409, 'INVITATION_SENT_ONBOARDING_REQUIRES_RECONCILIATION');
  }
}
