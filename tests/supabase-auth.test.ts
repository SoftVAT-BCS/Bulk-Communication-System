import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {authenticatePassword,authConfig} from '../apps/web/src/server/supabase-auth';
vi.mock('server-only',()=>({}));
const id='11111111-1111-4111-8111-111111111111';
const user={id,email_confirmed_at:'2026-01-01T00:00:00Z'};
beforeEach(()=>{vi.stubEnv('BCS_SUPABASE_URL','https://abcdefghijklmnopqrst.supabase.co');vi.stubEnv('BCS_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const ok=(value:unknown)=>new Response(JSON.stringify(value));
describe('Supabase password verification transport',()=>{
 it('verifies the Auth user server-side and caps the session lifetime',async()=>{const f=vi.fn().mockResolvedValueOnce(ok({access_token:'test-token',expires_in:7200,user})).mockResolvedValueOnce(ok(user));vi.stubGlobal('fetch',f);expect(await authenticatePassword('test@example.invalid','test-password')).toEqual({subject:id,issuer:'https://abcdefghijklmnopqrst.supabase.co/auth/v1',expiresIn:3600});expect(f.mock.calls.map(c=>c[0])).toEqual(['https://abcdefghijklmnopqrst.supabase.co/auth/v1/token?grant_type=password','https://abcdefghijklmnopqrst.supabase.co/auth/v1/user']);expect(f.mock.calls[0][1].redirect).toBe('error');});
 it.each([400,401,422])('rejects incorrect credentials without forwarding provider details (%s)',async status=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private provider detail',{status})));await expect(authenticatePassword('test@example.invalid','wrong')).rejects.toMatchObject({status:401,code:'INVALID_LOGIN'});});
 it('rejects an unconfirmed Auth user even if a token was issued',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(ok({access_token:'x',expires_in:3600,user})).mockResolvedValueOnce(ok({id})));await expect(authenticatePassword('test@example.invalid','test')).rejects.toMatchObject({code:'INVALID_LOGIN'});});
 it('rejects a mismatched verified identity',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(ok({access_token:'x',expires_in:3600,user})).mockResolvedValueOnce(ok({...user,id:'22222222-2222-4222-8222-222222222222'})));await expect(authenticatePassword('test@example.invalid','test')).rejects.toThrow('INVALID_LOGIN');});
 it('does not bypass a verified MFA factor',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(ok({access_token:'x',expires_in:3600,user})).mockResolvedValueOnce(ok({...user,factors:[{status:'verified'}]})));await expect(authenticatePassword('test@example.invalid','test')).rejects.toThrow('MFA_REQUIRED');});
 it('returns controlled outage and throttling errors',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('private-url')));await expect(authenticatePassword('test@example.invalid','test')).rejects.toThrow('AUTH_UNAVAILABLE');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:429})));await expect(authenticatePassword('test@example.invalid','test')).rejects.toThrow('AUTH_RATE_LIMITED');});
 it.each(['sb_secret_test','',`x.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.x`])('rejects missing or privileged key configuration',key=>{vi.stubEnv('BCS_SUPABASE_PUBLISHABLE_KEY',key);expect(authConfig).toThrow('AUTH_NOT_CONFIGURED');});
 it('rejects arbitrary or non-TLS Auth destinations',()=>{vi.stubEnv('BCS_SUPABASE_URL','http://localhost:4444');expect(authConfig).toThrow('AUTH_NOT_CONFIGURED');});
 it('does not fall back to local owner credentials',async()=>{vi.stubGlobal('fetch',vi.fn());await expect(authenticatePassword('owner','test-password')).rejects.toThrow('INVALID_LOGIN');expect(fetch).not.toHaveBeenCalled();});
});
