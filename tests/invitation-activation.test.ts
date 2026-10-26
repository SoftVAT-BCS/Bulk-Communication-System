import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateInvitedUser } from '../apps/web/src/server/invitation-activation';

vi.mock('server-only', () => ({}));
const authUrl = 'https://abcdefghijklmnopqrst.supabase.co';
const fakeHash = 'a'.repeat(64);
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'invited@example.com', email_confirmed_at: '2026-10-18T00:00:00Z', is_anonymous: false };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const body = { tokenHash: fakeHash, password: 'Complex Password 2026!', confirmPassword: 'Complex Password 2026!' };
const request = (data: Record<string, unknown>, origin = 'http://127.0.0.1:3000') => new Request('http://127.0.0.1:3000/api/bcs/app/activation', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('BCS_SUPABASE_URL', authUrl);
  vi.stubEnv('BCS_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('BCS invited-user account activation', () => {
  it('rejects mismatching passwords without consuming the invite', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(request({ ...body, confirmPassword: 'different' }))).rejects.toMatchObject({ code: 'PASSWORD_REQUIREMENTS_NOT_MET', status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects a cross-origin browser request', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(request(body, 'https://unsafe.example.com'))).rejects.toMatchObject({ code: 'LOCAL_DEMO_ONLY' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('verifies the invitation and account before updating the invited user password', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ access_token: 'verified-invite-session' }))
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json(user));
    vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(request(body))).resolves.toEqual({ activated: true, next: '/login' });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0][0]).toBe(`${authUrl}/auth/v1/verify`);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ type: 'invite', token_hash: fakeHash });
    expect(fetcher.mock.calls[1][0]).toBe(`${authUrl}/auth/v1/user`);
    expect(fetcher.mock.calls[2][1].method).toBe('PUT');
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ password: body.password });
  });
  it('does not change passwords when Supabase rejects an expired invite', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({}, 400)); vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(request(body))).rejects.toMatchObject({ code: 'INVITATION_EXPIRED_OR_INVALID', status: 400 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('accepts a legacy confirmed invite access-token only after checking provider identity', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(user)).mockResolvedValueOnce(json(user));
    vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(request({ ...body, tokenHash: undefined, accessToken: 'X'.repeat(40) }))).resolves.toEqual({ activated: true, next: '/login' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('never updates a password for an unverified anonymous identity', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ access_token: 'invited-session' }))
      .mockResolvedValueOnce(json({ ...user, is_anonymous: true }));
    vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(request(body))).rejects.toMatchObject({ code: 'INVITED_IDENTITY_NOT_VERIFIED' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
