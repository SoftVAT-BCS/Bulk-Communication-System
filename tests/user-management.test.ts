import { afterEach, describe, expect, it, vi } from 'vitest';
import { validatedDisplayName, validatedEmail, principalId, manageCompanyUser } from '../apps/web/src/server/user-management';

vi.mock('server-only', () => ({}));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('BCS user management validation and company boundary', () => {
  it('normalizes full names and addresses without inventing user identity', () => {
    expect(validatedDisplayName('  Test   User ')).toBe('Test User');
    expect(validatedEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });
  it.each(['', ' ', '<script>', 'a\nname', 'a\u0000b', 'x'.repeat(121)])('rejects unsafe display names', value => {
    expect(() => validatedDisplayName(value)).toThrow('INVALID_DISPLAY_NAME');
  });
  it.each(['not-an-email', 'x@@mail.com', 'evil\r\n@example.com', 'x'.repeat(255)])('rejects invalid email', email => {
    expect(() => validatedEmail(email)).toThrow('INVALID_EMAIL');
  });
  it('requires an opaque UUID principal ID', () => {
    expect(principalId('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111');
    expect(() => principalId('owner@example.com')).toThrow('INVALID_PRINCIPAL');
  });
  it('rejects unknown actions and invalid identity references before touching a provider', async () => {
    const request = new Request('http://127.0.0.1:3000/api/bcs/app/users');
    await expect(manageCompanyUser(request, { action:'delete',principalId:'11111111-1111-4111-8111-111111111111' })).rejects.toMatchObject({ code:'INVALID_ACTION' });
    await expect(manageCompanyUser(request, { action:'suspend',principalId:'another-company-user' })).rejects.toMatchObject({ code:'INVALID_PRINCIPAL' });
  });
});
