import 'server-only';

import type { PoolClient } from 'pg';
import { authorized, type Session } from './app-service';
import { authConfig } from './supabase-auth';
import { ReadError, uuid } from './validation';

export type ManagedUserAction = 'edit_name' | 'suspend' | 'restore' | 'resend_invite' | 'recover_password' | 'correct_pending_email';
export type UserManagementBody = Record<string, unknown>;

export function validatedDisplayName(value: unknown): string {
  const raw = typeof value === 'string' ? value : '';
  const name = raw.trim().replace(/ {2,}/g, ' ');
  if (name.length < 2 || name.length > 120 || /[<>&]/.test(name) ||
    [...raw].some(ch => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)) {
    throw new ReadError(400, 'INVALID_DISPLAY_NAME');
  }
  return name;
}

export function validatedEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ReadError(400, 'INVALID_EMAIL');
  }
  return email;
}

export function principalId(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new ReadError(400, 'INVALID_PRINCIPAL');
  return value;
}

function managementProvider() {
  const { url, key } = authConfig();
  const secret = process.env.BCS_SUPABASE_ADMIN_KEY ?? '';
  if (!/^sb_secret_[A-Za-z0-9_-]{15,}$/.test(secret)) throw new ReadError(503, 'AUTH_ADMIN_CONFIGURATION_REQUIRED');
  return { url, key, secret };
}

function redirectForRecovery(): string {
  const redirect = process.env.BCS_INVITE_REDIRECT_URL ?? '';
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost):3000\/activate$/.test(redirect)) {
    throw new ReadError(503, 'AUTH_REDIRECT_NOT_CONFIGURED');
  }
  return redirect;
}

export interface ManagedPrincipal {
  id: string;
  display_name: string | null;
  email: string | null;
  status: string;
  identity_issuer: string;
  external_subject: string;
}

async function canManage(c: PoolClient, s: Session): Promise<void> {
  const r = await c.query<{ allowed: boolean }>(
    "SELECT bcs.session_allows($1,NULL,'access.manage') AS allowed", [s.company_id],
  );
  if (r.rows[0]?.allowed !== true) throw new ReadError(403, 'COMPANY_PERMISSION_REQUIRED');
}

/** Verify the actual restricted-role grants and scoped RLS policy.
 * Migration history is deliberately not readable by the application role.
 */
async function managementReady(c: PoolClient): Promise<boolean> {
  const r = await c.query<{ ready: boolean }>(
    `SELECT has_column_privilege(current_user,'bcs.principals','display_name','UPDATE')
      AND has_column_privilege(current_user,'bcs.principals','status','UPDATE')
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname='bcs' AND tablename='principals'
          AND policyname='app_company_user_management_update'
      ) AS ready`,
  );
  return r.rows[0]?.ready === true;
}

async function lookup(c: PoolClient, s: Session, id: string, forUpdate = false): Promise<ManagedPrincipal> {
  const r = await c.query<ManagedPrincipal>(
    `SELECT id,display_name,email,status,identity_issuer,external_subject
     FROM bcs.principals WHERE company_id=$1 AND id=$2 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [s.company_id, id],
  );
  if (r.rowCount !== 1) throw new ReadError(404, 'COMPANY_USER_NOT_FOUND');
  return r.rows[0];
}

async function audit(c: PoolClient, s: Session, id: string, action: string, metadata: Record<string, unknown> = {}): Promise<void> {
  // No email addresses, names, invitation tokens or passwords in audit metadata.
  await c.query(
    `INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference,safe_metadata)
     VALUES($1,$2,$3,$4,'principal',$5,$6::jsonb)`,
    [s.company_id, s.portal_id, s.principal_id, action, id, JSON.stringify(metadata)],
  );
}

async function lockCompany(c: PoolClient, s: Session): Promise<void> {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${s.company_id}:user-management`]);
}

async function protectManagementRole(c: PoolClient, s: Session, target: ManagedPrincipal): Promise<void> {
  if (target.id === s.principal_id) throw new ReadError(403, 'CANNOT_MODIFY_SELF');
  const result = await c.query(
    `SELECT 1 FROM bcs.principal_role_assignments a
     JOIN bcs.role_permissions r ON r.company_id=a.company_id AND r.role_id=a.role_id
     WHERE a.company_id=$1 AND a.principal_id=$2 AND r.permission_code='access.manage'
       AND (a.expires_at IS NULL OR a.expires_at>now()) LIMIT 1`,
    [s.company_id, target.id],
  );
  if (result.rowCount) throw new ReadError(403, 'MANAGER_ACCOUNT_PROTECTED');
}

export async function listCompanyUsers(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = new Set(['view','principal']);
  if ([...params.keys()].some(k => !allowed.has(k))) throw new ReadError(400, 'INVALID_QUERY');
  const view = params.get('view') ?? 'directory';
  if (view === 'identity') {
    const id = principalId(params.get('principal'));
    const user = await authorized(request, 'access.manage', async(c,s) => {
      await canManage(c,s);
      return lookup(c,s,id);
    });
    // Network IO is outside the database transaction and its idle timeout.
    const identity = await getAuthUser(user);
    return { identity: {
      confirmed: !!identity.email_confirmed_at,
      activated: !!identity.last_sign_in_at,
      invited: !!identity.invited_at,
      emailMatches: true,
    } };
  }
  return authorized(request, 'access.manage', async (c, s) => {
    await canManage(c,s);
    if (view === 'directory') {
      const r = await c.query(
        `SELECT p.id,p.display_name,p.email,p.status,p.created_at,p.updated_at,
          ARRAY(SELECT DISTINCT a.role_id FROM bcs.principal_role_assignments a WHERE a.company_id=p.company_id AND a.principal_id=p.id) AS role_ids,
          ARRAY(SELECT sc.portal_id FROM bcs.principal_portal_scopes sc WHERE sc.company_id=p.company_id AND sc.principal_id=p.id) AS portal_ids
         FROM bcs.principals p WHERE p.company_id=$1 ORDER BY p.created_at DESC LIMIT 250`,
        [s.company_id],
      );
      return { users: r.rows, selfId: s.principal_id, managementEnabled: await managementReady(c) };
    }
    if (view === 'history') {
      const id = principalId(params.get('principal'));
      await lookup(c, s, id);
      const r = await c.query(
        `SELECT id,action,occurred_at,safe_metadata FROM bcs.audit_events
         WHERE company_id=$1 AND entity_type='principal' AND entity_reference=$2
         ORDER BY occurred_at DESC,id DESC LIMIT 50`,
        [s.company_id,id],
      );
      return { history: r.rows };
    }
    throw new ReadError(400, 'INVALID_VIEW');
  });
}

export type SupabaseAdminUser = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
  last_sign_in_at?: unknown;
  invited_at?: unknown;
  user_metadata?: Record<string, unknown>;
};

function isPendingIdentity(user: SupabaseAdminUser): boolean {
  return !user.email_confirmed_at && !user.last_sign_in_at;
}

async function adminRequest(path: string, method: 'GET'|'PUT'|'POST', body?: unknown) {
  const provider = managementProvider();
  let r: Response;
  try {
    r = await fetch(`${provider.url}${path}`, {
      method,
      headers: { apikey: provider.secret, Authorization: `Bearer ${provider.secret}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
      cache:'no-store', redirect:'error', signal:AbortSignal.timeout(12000),
    });
  } catch { throw new ReadError(503, 'AUTH_PROVIDER_UNAVAILABLE'); }
  if (r.status === 429) throw new ReadError(429, 'AUTH_PROVIDER_RATE_LIMITED');
  if (!r.ok) throw new ReadError(r.status===404?404:r.status>=500?503:409, 'AUTH_PROVIDER_OPERATION_REJECTED');
  const json: unknown = await r.json().catch(() => ({}));
  return json && typeof json === 'object' ? json as Record<string, unknown> : {};
}

function providerUserResponse(raw: Record<string, unknown>): SupabaseAdminUser {
  return (raw.user && typeof raw.user === 'object' ? raw.user : raw) as SupabaseAdminUser;
}

async function getAuthUser(principal: ManagedPrincipal): Promise<SupabaseAdminUser> {
  const provider = managementProvider();
  if (principal.identity_issuer !== `${provider.url}/auth/v1` || !uuid.test(principal.external_subject)) {
    throw new ReadError(409, 'IDENTITY_ISSUER_MISMATCH');
  }
  const user = providerUserResponse(await adminRequest(`/auth/v1/admin/users/${principal.external_subject}`, 'GET'));
  if (user.id !== principal.external_subject || String(user.email??'').toLowerCase() !== String(principal.email??'').toLowerCase()) {
    throw new ReadError(409, 'IDENTITY_EMAIL_MISMATCH');
  }
  return user;
}

/** Update BCS name first, then synchronize Auth profile metadata without touching email/password.
 * A provider failure is explicitly reported; database edits stay auditable. */
async function editName(request: Request, id: string, displayName: string) {
  const updated = await authorized(request,'access.manage',async(c,s)=>{
    await canManage(c,s);
    if (!(await managementReady(c))) throw new ReadError(503,'MIGRATION_021_REQUIRED');
    await lockCompany(c,s);
    const before = await lookup(c,s,id,true);
    if (before.status==='retired') throw new ReadError(409,'RETIRED_USER_LOCKED');
    await c.query('UPDATE bcs.principals SET display_name=$3 WHERE company_id=$1 AND id=$2',[s.company_id,id,displayName]);
    await audit(c,s,id,'user.name_updated');
    return before;
  });
  let metadataSynced = false;
  try {
    const auth = await getAuthUser(updated);
    await adminRequest(`/auth/v1/admin/users/${updated.external_subject}`, 'PUT', {
      user_metadata:{...(auth.user_metadata??{}),full_name:displayName,display_name:displayName},
    });
    metadataSynced = true;
  } catch { /* BCS name remains saved; disclose secondary synchronization status. */ }
  return { saved:true, metadataSynced, message:metadataSynced?'Name updated.':'BCS name saved; Supabase profile metadata synchronization pending.' };
}

async function changeStatus(request:Request,id:string,status:'active'|'suspended') {
  return authorized(request,'access.manage',async(c,s)=>{
    await canManage(c,s);
    if (!(await managementReady(c))) throw new ReadError(503,'MIGRATION_021_REQUIRED');
    await lockCompany(c,s);
    const target=await lookup(c,s,id,true);
    await protectManagementRole(c,s,target);
    if(target.status==='retired')throw new ReadError(409,'RETIRED_USER_LOCKED');
    if(target.status===status)throw new ReadError(409,'STATUS_ALREADY_SET');
    await c.query('UPDATE bcs.principals SET status=$3 WHERE company_id=$1 AND id=$2',[s.company_id,id,status]);
    await c.query('UPDATE bcs.application_sessions SET revoked_at=now() WHERE company_id=$1 AND principal_id=$2 AND revoked_at IS NULL',[s.company_id,id]);
    await audit(c,s,id,status==='active'?'user.restored':'user.suspended');
    return {saved:true,status};
  });
}

async function preflightProviderAction(request:Request,id:string) {
  return authorized(request,'access.manage',async(c,s)=>{
    await canManage(c,s);
    const target=await lookup(c,s,id);
    if(target.id===s.principal_id)throw new ReadError(403,'CANNOT_MODIFY_SELF');
    if(target.status!=='active')throw new ReadError(409,'INACTIVE_ACCOUNT');
    return target;
  });
}

async function resendInvitation(request:Request,id:string) {
  const target=await preflightProviderAction(request,id);
  const identity=await getAuthUser(target);
  if(!isPendingIdentity(identity))throw new ReadError(409,'ONLY_PENDING_INVITES_CAN_BE_RESENT');
  const p=managementProvider();
  const redirect=redirectForRecovery();
  const path=new URL(`${p.url}/auth/v1/invite`);
  path.searchParams.set('redirect_to',redirect);
  const res=providerUserResponse(await adminRequest(`${path.pathname}${path.search}`,'POST', {
    email:target.email,
    data:{...(identity.user_metadata??{}),display_name:target.display_name,full_name:target.display_name},
  }));
  if(res.id !== target.external_subject)throw new ReadError(409,'RESEND_IDENTITY_MISMATCH_RECONCILE');
  await authorized(request,'access.manage',async(c,s)=>{await canManage(c,s);await audit(c,s,id,'user.invitation_resent');});
  return {submitted:true,message:'Provider accepted the resend. Delivery is not guaranteed.'};
}

async function sendRecovery(request:Request,id:string) {
  const target=await preflightProviderAction(request,id);
  const identity=await getAuthUser(target);
  if(!identity.email_confirmed_at)throw new ReadError(409,'INVITATION_NOT_ACTIVATED');
  const {url,key}=authConfig();
  const path=new URL(`${url}/auth/v1/recover`);
  path.searchParams.set('redirect_to',redirectForRecovery());
  let response:Response;
  try{response=await fetch(path,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:target.email}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw new ReadError(503,'AUTH_PROVIDER_UNAVAILABLE');}
  if(response.status===429)throw new ReadError(429,'AUTH_PROVIDER_RATE_LIMITED');
  if(!response.ok)throw new ReadError(response.status>=500?503:409,'PASSWORD_RESET_NOT_ACCEPTED');
  await authorized(request,'access.manage',async(c,s)=>{await canManage(c,s);await audit(c,s,id,'user.password_recovery_requested');});
  return {submitted:true,message:'Password recovery requested. The user must follow their email link.'};
}

/** Does NOT change an active identity's email. Only an unverified invitation may
 * be replaced, and its old company access is suspended before a new invite is sent.
 * Caller must supply a confirmed role & portal because mappings can be multiple. */
export async function preparePendingCorrection(request:Request,body:UserManagementBody) {
  const id=principalId(body.principalId);
  const newEmail=validatedEmail(body.newEmail);
  const roleId=principalId(body.roleId);
  const portalId=principalId(body.portalId);
  const current=await authorized(request,'access.manage',async(c,s)=>{
    await canManage(c,s);
    if (!(await managementReady(c))) throw new ReadError(503,'MIGRATION_021_REQUIRED');
    const user=await lookup(c,s,id);
    await protectManagementRole(c,s,user);
    if(user.status!=='active')throw new ReadError(409,'INACTIVE_ACCOUNT');
    if(user.email===newEmail)throw new ReadError(409,'EMAIL_NOT_CHANGED');
    if((await c.query('SELECT 1 FROM bcs.principals WHERE company_id=$1 AND lower(email)=$2 LIMIT 1',[s.company_id,newEmail])).rowCount)throw new ReadError(409,'COMPANY_EMAIL_EXISTS');
    if (!(await c.query("SELECT 1 FROM bcs.portals WHERE company_id=$1 AND id=$2 AND status IN ('active','draft')", [s.company_id, portalId])).rowCount) throw new ReadError(404,'PORTAL_NOT_FOUND');
    if (!(await c.query('SELECT 1 FROM bcs.roles WHERE company_id=$1 AND id=$2',[s.company_id,roleId])).rowCount) throw new ReadError(404,'ROLE_NOT_FOUND');
    const granted=await c.query<{permission_code:string}>('SELECT permission_code FROM bcs.role_permissions WHERE company_id=$1 AND role_id=$2',[s.company_id,roleId]);
    if (!granted.rowCount || granted.rows.some(p=>!s.permissions.includes(p.permission_code))) throw new ReadError(403,'CANNOT_GRANT_UNHELD_PERMISSION');
    return user;
  });
  const identity=await getAuthUser(current);
  if(!isPendingIdentity(identity))throw new ReadError(409,'ACTIVE_EMAIL_REQUIRES_USER_VERIFICATION');
  await authorized(request,'access.manage',async(c,s)=>{
    await canManage(c,s);
    await lockCompany(c,s);
    const latest=await lookup(c,s,id,true);
    if(latest.status!=='active'||latest.email!==current.email)throw new ReadError(409,'USER_CHANGED_RETRY');
    await protectManagementRole(c,s,latest);
    await c.query("UPDATE bcs.principals SET status='suspended' WHERE company_id=$1 AND id=$2",[s.company_id,id]);
    await c.query('UPDATE bcs.application_sessions SET revoked_at=now() WHERE company_id=$1 AND principal_id=$2 AND revoked_at IS NULL',[s.company_id,id]);
    await audit(c,s,id,'user.pending_email_replaced',{new_invitation_required:true});
  });
  return {newEmail,displayName:current.display_name,roleId,portalId,oldPrincipalId:id};
}

export async function manageCompanyUser(request:Request,body:UserManagementBody) {
  const action=body.action;
  if(typeof action!=='string')throw new ReadError(400,'INVALID_ACTION');
  const id=principalId(body.principalId);
  if(action==='edit_name')return editName(request,id,validatedDisplayName(body.displayName));
  if(action==='suspend')return changeStatus(request,id,'suspended');
  if(action==='restore')return changeStatus(request,id,'active');
  if(action==='resend_invite')return resendInvitation(request,id);
  if(action==='recover_password')return sendRecovery(request,id);
  throw new ReadError(400,'INVALID_ACTION');
}
