import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {activateInvitedUser} from '../apps/web/src/server/invitation-activation';
vi.mock('server-only',()=>({}));
const origin='https://abcdefghijklmnopqrst.supabase.co';
const account={id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid',email_confirmed_at:'2026-10-18T00:00:00Z',is_anonymous:false};
const good=(obj:unknown)=>new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}});
const request=(type:'invite'|'recovery')=>new Request('http://localhost:3000/api/bcs/app/activation',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify({type,tokenHash:'b'.repeat(64),password:'Valid test password 2026!',confirmPassword:'Valid test password 2026!'})});
beforeEach(()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('BCS_SUPABASE_URL',origin);vi.stubEnv('BCS_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('recovering password with a one-time verified Supabase link',()=>{
  it('verifies a recovery token as recovery and never receives an admin key',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(good({access_token:'bearer-session'})).mockResolvedValueOnce(good(account)).mockResolvedValueOnce(good(account));vi.stubGlobal('fetch',fetcher);
    await expect(activateInvitedUser(request('recovery'))).resolves.toEqual({activated:true,next:'/login'});
    const verifyBody=JSON.parse(fetcher.mock.calls[0][1].body);
    expect(verifyBody).toMatchObject({type:'recovery',token_hash:'b'.repeat(64)});
    expect(fetcher.mock.calls[2][0]).toBe(`${origin}/auth/v1/user`);
    expect(fetcher.mock.calls[2][1].method).toBe('PUT');
    expect(fetcher.mock.calls[0][1].headers.apikey).toBe('sb_publishable_test');
  });
  it('still uses invite verification for existing invitation links',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(good({access_token:'bearer-session'})).mockResolvedValueOnce(good(account)).mockResolvedValueOnce(good(account));vi.stubGlobal('fetch',fetcher);
    await activateInvitedUser(request('invite'));
    expect(JSON.parse(fetcher.mock.calls[0][1].body).type).toBe('invite');
  });
});
