import { scryptSync } from 'node:crypto';
import { describe,it,expect,vi } from 'vitest';
import { checkPassword, requestToken, jsonBody, response } from '../apps/web/src/server/app-service';
import { cleanDocument } from '../apps/web/src/server/document-safety';
vi.mock('server-only',()=>({}));
describe('authenticated document boundary',()=>{
 it('verifies salted password hashes and rejects mismatches',()=>{const salt='a'.repeat(32);const hash=`${salt}:${scryptSync('long-test-password',salt,64).toString('hex')}`;expect(checkPassword('long-test-password',hash)).toBe(true);expect(checkPassword('wrong-password',hash)).toBe(false);expect(checkPassword('anything','broken')).toBe(false);});
 it('requires a bounded session token',()=>{expect(()=>requestToken(new Request('http://localhost'))).toThrow();expect(()=>requestToken(new Request('http://localhost',{headers:{cookie:'bcs_session=broken'}}))).toThrow();expect(requestToken(new Request('http://localhost',{headers:{cookie:`other=x; bcs_session=${'a'.repeat(43)}`}}))).toBe('a'.repeat(43));});
 it('sanitizes on the server without browser globals',()=>{const d=cleanDocument('<p>Safe <strong>bold</strong></p><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">link</a>');expect(d.html).not.toMatch(/script|onclick|alert\(/i);expect(d.html).toContain('<strong>bold</strong>');expect(d.plainText).toContain('Safe bold');});
 it('rejects oversized or non-string documents',()=>{expect(()=>cleanDocument(null)).toThrow();expect(()=>cleanDocument('x'.repeat(100001))).toThrow();});
 it('rejects malformed and oversized request bodies',async()=>{const req=(body:string)=>new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body});await expect(jsonBody(req('[]'))).rejects.toThrow();await expect(jsonBody(req('{'))).rejects.toThrow();await expect(jsonBody(req('x'.repeat(150001)))).rejects.toThrow();});
 it('never returns driver exception details',async()=>{const r=await response(async()=>{throw Error('private connection credentials');});expect(r.status).toBe(503);expect(await r.text()).not.toContain('credentials');expect(r.headers.get('cache-control')).toBe('no-store');});
});
