import 'server-only';
import { ReadError, uuid } from './validation';

export interface VerifiedIdentity { subject: string; issuer: string; expiresIn: number }
export function authConfig() {
  const url = process.env.BCS_SUPABASE_URL ?? '';
  const key = process.env.BCS_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)) throw new ReadError(503, 'AUTH_NOT_CONFIGURED');
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey && key.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* Invalid configuration fails closed. */ }
  }
  if (!publicKey) throw new ReadError(503, 'AUTH_NOT_CONFIGURED');
  return { url, key };
}

// The Auth service verifies the password. No Data API, admin key, local password
// fallback, refresh-token persistence or client-supplied identity is involved.
export async function authenticatePassword(email: string, password: string): Promise<VerifiedIdentity> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 4096) throw new ReadError(401, 'INVALID_LOGIN');
  const { url, key } = authConfig();
  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 429) throw new ReadError(429, 'AUTH_RATE_LIMITED');
      if (response.status >= 500) throw new ReadError(503, 'AUTH_UNAVAILABLE');
      throw new ReadError(401, 'INVALID_LOGIN');
    }
    const credentials = await response.json();
    if (typeof credentials.access_token !== 'string' || !Number.isFinite(credentials.expires_in) || credentials.expires_in < 1) throw new ReadError(401, 'INVALID_LOGIN');
    // Verify against the trusted Auth server, rather than decoding an unverified JWT.
    const verified = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${credentials.access_token}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!verified.ok) throw new ReadError(401, 'INVALID_LOGIN');
    const user = await verified.json();
    if (!uuid.test(user.id ?? '') || user.id !== credentials.user?.id || !user.email_confirmed_at || user.is_anonymous) throw new ReadError(401, 'INVALID_LOGIN');
    if (user.factors?.some((factor: { status: string }) => factor.status === 'verified')) throw new ReadError(403, 'MFA_REQUIRED');
    return { subject: user.id, issuer: `${url}/auth/v1`, expiresIn: Math.min(3600, Math.floor(credentials.expires_in)) };
  } catch (error) {
    if (error instanceof ReadError) throw error;
    throw new ReadError(503, 'AUTH_UNAVAILABLE');
  }
}
