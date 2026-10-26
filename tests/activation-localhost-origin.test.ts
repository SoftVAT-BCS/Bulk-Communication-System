import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateInvitedUser } from '../apps/web/src/server/invitation-activation';

vi.mock('server-only', () => ({}));
const provider = 'https://abcdefghijklmnopqrst.supabase.co';
const invited = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.invalid', email_confirmed_at: '2026-10-18T00:00:00Z', is_anonymous: false };
const respond = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const payload = { tokenHash: 'a'.repeat(64), password: 'Valid test password 2026!', confirmPassword: 'Valid test password 2026!' };
const req = (overrides: Record<string, string> = {}) => new Request('http://localhost:3000/api/bcs/app/activation', {
  method: 'POST',
  headers: {
    host: '127.0.0.1:3000',
    origin: 'http://127.0.0.1:3000',
    'sec-fetch-site': 'same-origin',
    'x-forwarded-for': '127.0.0.1',
    'Content-Type': 'application/json',
    ...overrides,
  },
  body: JSON.stringify(payload),
});

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('BCS_SUPABASE_URL', provider);
  vi.stubEnv('BCS_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('BCS local-only activation through Next.js host normalization', () => {
  it('accepts a local browser Host even when the internal request URL is localhost', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(respond({ access_token: 'verified-session' }))
      .mockResolvedValueOnce(respond(invited))
      .mockResolvedValueOnce(respond(invited));
    vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(req())).resolves.toEqual({ activated: true, next: '/login' });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0][0]).toBe(`${provider}/auth/v1/verify`);
  });
  it('rejects a non-loopback Host before contacting Supabase', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(req({ host: 'attacker.example:3000' }))).rejects.toMatchObject({ status: 403, code: 'LOCAL_DEMO_ONLY' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects a forged browser Origin before contacting Supabase', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(req({ origin: 'https://attacker.example' }))).rejects.toMatchObject({ status: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects a non-loopback forwarded IP before contacting Supabase', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(activateInvitedUser(req({ 'x-forwarded-for': '203.0.113.44' }))).rejects.toMatchObject({ status: 403, code: 'LOCAL_DEMO_ONLY' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
