import 'server-only';

import { authConfig } from './supabase-auth';
import { jsonBody } from './app-service';
import { localRequest, ReadError, uuid } from './validation';

type ProviderSession = { access_token?: unknown; user?: { id?: unknown } };

type ProviderUser = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
  is_anonymous?: unknown;
};

/**
 * Accept an invited user's own password, never an administrator-chosen password.
 * This route is unauthenticated because the single-use Supabase invite token
 * is the credential. Provider verification is performed only on POST, never
 * when an email scanner previews the activation URL.
 *
 * No Supabase admin key is needed or accepted here. No BCS session is issued:
 * normal sign-in independently verifies the trusted Supabase user ID and
 * previously provisioned BCS company/portal assignments.
 */
export async function activateInvitedUser(request: Request) {
  // Next.js may construct request.url using an internal localhost origin even
  // when the browser correctly connected to 127.0.0.1. Match the existing BCS
  // session/API host normalization before enforcing the same local-only guard.
  // Do NOT trust an arbitrary Host: only an explicitly loopback host is valid.
  const requestUrl = new URL(request.url);
  const host = request.headers.get('host') ?? requestUrl.host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$/.test(host)) {
    throw new ReadError(403, 'LOCAL_DEMO_ONLY');
  }
  const canonical = new URL(requestUrl);
  canonical.host = host;
  localRequest(new Request(canonical, { headers: request.headers }), process.env.NODE_ENV);
  if (request.headers.get('origin') !== canonical.origin) {
    throw new ReadError(403, 'ACTIVATION_ORIGIN_REJECTED');
  }

  const body = await jsonBody(request);
  const type = body.type === 'recovery' ? 'recovery' : body.type === 'invite' || body.type === undefined ? 'invite' : null;
  if (!type) throw new ReadError(400, 'INVALID_ACTIVATION_TYPE');
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmation = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash : '';
  const legacyAccessToken = typeof body.accessToken === 'string' ? body.accessToken : '';

  // Validate before consuming a one-time invitation token.
  if (password.length < 12 || password.length > 128 || confirmation !== password) {
    throw new ReadError(400, 'PASSWORD_REQUIREMENTS_NOT_MET');
  }
  const isInviteHash = /^[A-Za-z0-9_-]{20,256}$/.test(tokenHash) && !legacyAccessToken;
  const isLegacyToken = !tokenHash && /^[A-Za-z0-9_.-]{20,8192}$/.test(legacyAccessToken);
  if (!isInviteHash && !isLegacyToken) {
    throw new ReadError(400, 'INVALID_INVITATION_TOKEN');
  }

  const { url, key } = authConfig();
  let accessToken = legacyAccessToken;
  if (isInviteHash) {
    let verify: Response;
    try {
      verify = await fetch(`${url}/auth/v1/verify`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, token_hash: tokenHash }),
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new ReadError(503, 'AUTH_PROVIDER_UNAVAILABLE');
    }
    if (verify.status === 429) throw new ReadError(429, 'ACTIVATION_RATE_LIMITED');
    if (!verify.ok) throw new ReadError(400, 'INVITATION_EXPIRED_OR_INVALID');
    const data = await verify.json().catch(() => ({})) as ProviderSession;
    if (typeof data.access_token !== 'string') {
      throw new ReadError(503, 'INVALID_PROVIDER_ACTIVATION_RESPONSE');
    }
    accessToken = data.access_token;
  }

  let verified: Response;
  try {
    verified = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ReadError(503, 'AUTH_PROVIDER_UNAVAILABLE');
  }
  if (!verified.ok) throw new ReadError(400, 'INVITATION_EXPIRED_OR_INVALID');
  const account = await verified.json().catch(() => ({})) as ProviderUser;
  if (typeof account.id !== 'string' || !uuid.test(account.id) || account.is_anonymous === true ||
    typeof account.email !== 'string' || !account.email_confirmed_at) {
    throw new ReadError(403, 'INVITED_IDENTITY_NOT_VERIFIED');
  }

  let updated: Response;
  try {
    updated = await fetch(`${url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: key, Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ReadError(503, 'PASSWORD_UPDATE_UNAVAILABLE');
  }
  if (updated.status === 429) throw new ReadError(429, 'ACTIVATION_RATE_LIMITED');
  if (!updated.ok) throw new ReadError(400, 'PASSWORD_UPDATE_REJECTED');

  return { activated: true, next: '/login' };
}
