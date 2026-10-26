import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import type {Client} from 'pg';
import {POST,GET,DELETE} from '../apps/web/app/api/bcs/app/session/route';
import {digest} from '../apps/web/src/server/app-service';
import {authenticatePassword} from '../apps/web/src/server/supabase-auth';
vi.mock('server-only',()=>({}));
vi.mock('../apps/web/src/server/supabase-auth',()=>({authenticatePassword:vi.fn()}));
const live=process.env.BCS_LIVE_TESTS==='1';
describe.skipIf(!live)('real BCS sessions with mocked external Auth identity',()=>{
 let admin:Client;let issuer:string;let subject:string;const tokens:string[]=[];
 const request=(method:string,cookie='')=>new Request('http://127.0.0.1:3000/api/bcs/app/session',{method,headers:{origin:'http://127.0.0.1:3000','content-type':'application/json',cookie},...(method==='POST'?{body:JSON.stringify({username:'synthetic@example.invalid',password:'test-password'})}:{})});
 beforeAll(async()=>{const e=parseEnv(readFileSync('apps/web/.env.local','utf8'));for(const[k,v]of Object.entries(e))vi.stubEnv(k,v);vi.stubEnv('NODE_ENV','development');admin=await createRequire(import.meta.url)('../.local/bcs-connect.cjs')();issuer=`${e.BCS_SUPABASE_URL}/auth/v1`;const row=(await admin.query("SELECT DISTINCT u.external_subject FROM bcs.principals u JOIN bcs.principal_portal_scopes sc ON sc.company_id=u.company_id AND sc.principal_id=u.id JOIN bcs.principal_role_assignments a ON a.company_id=u.company_id AND a.principal_id=u.id AND (a.portal_id IS NULL OR a.portal_id=sc.portal_id) AND (a.expires_at IS NULL OR a.expires_at>now()) JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id AND rp.permission_code='dashboard.view' WHERE u.identity_issuer=$1 AND u.status='active' LIMIT 1",[issuer])).rows;if(row.length!==1)throw Error('Expected existing dashboard-authorized principal');subject=row[0].external_subject;},20000);
 afterAll(async()=>{if(admin){await admin.query('DELETE FROM bcs.application_sessions WHERE token_hash=ANY($1::text[])',[tokens.map(digest)]);await admin.end();}vi.unstubAllEnvs();});
 async function signIn(){vi.mocked(authenticatePassword).mockResolvedValue({subject,issuer,expiresIn:60});const r=await POST(request('POST'));expect(r.status).toBe(200);expect(await r.json()).toEqual({data:{authenticated:true,home:'/'}});const cookie=r.headers.get('set-cookie');if(!cookie)throw Error('Cookie missing');expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=Strict');expect(cookie).toContain('Max-Age=60');const token=cookie.split(';')[0].split('=')[1];tokens.push(token);return cookie.split(';')[0];}
 it('maps only the trusted subject and creates an opaque server session',async()=>{const cookie=await signIn();expect((await GET(request('GET',cookie))).status).toBe(200);},20000);
 it('denies an unmapped valid Supabase identity despite a supplied email',async()=>{vi.mocked(authenticatePassword).mockResolvedValue({subject:randomUUID(),issuer,expiresIn:60});expect((await POST(request('POST'))).status).toBe(403);},20000);
 it('rejects expiry in the database',async()=>{const cookie=await signIn();await admin.query("UPDATE bcs.application_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[digest(cookie.split('=')[1])]);expect((await GET(request('GET',cookie))).status).toBe(401);expect((await DELETE(request('DELETE',cookie))).status).toBe(200);},20000);
 it('revokes logout and prevents replay',async()=>{const cookie=await signIn();expect((await DELETE(request('DELETE',cookie))).status).toBe(200);expect((await GET(request('GET',cookie))).status).toBe(401);},20000);
 it('denies cross-origin password submission before provider authentication',async()=>{vi.mocked(authenticatePassword).mockClear();const r=await POST(new Request('http://127.0.0.1:3000/api/bcs/app/session',{method:'POST',headers:{origin:'https://other.invalid'}}));expect(r.status).toBe(403);expect(authenticatePassword).not.toHaveBeenCalled();});
});
