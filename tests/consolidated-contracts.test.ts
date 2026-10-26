import { describe,it,expect,vi } from 'vitest';
import { generateKeyPairSync,sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
vi.mock('server-only',()=>({}));
import { offlineSource,restURL,publicAddress,identifier } from '../apps/web/src/server/connector-adapters';
import { previewSource } from '../apps/web/src/server/connector-service';
import { verifyEmbed,type EmbedIssuer } from '../apps/web/src/server/embed-contract';
import { isolatedWorkerURL } from '../apps/worker/src/postgres-store';
import { disabledSesAdapter,validateProviderMessage,providerEventEffect,classifyProviderError } from '../packages/contracts/src/provider-contract';
import { requireTenantScope,resolveMembership } from '../apps/web/src/server/tenant-context';
const row={id:'00001',name:'Synthetic Student',email:'student@example.invalid',group:'Demo',subgroup:'Batch A',status:'Active'};
const mapping={targetId:'id',name:'name',email:'email',group:'group',subgroup:'subgroup'};
describe('offline connector contracts (no connectivity claim)',()=>{
 for(const engine of ['postgresql','mysql','mssql','portal_api'] as const){
  it(`${engine}: discovers, preserves identifiers and advances bounded cursor`,async()=>{const a=offlineSource(engine,[row,{...row,id:'00002',email:'second@example.invalid'}]);const r=await previewSource(a,'contacts','id','00001',mapping);expect(r.read).toBe(1);expect(r.next).toBe('00002');expect(r.contacts[0].targetId).toBe('00002');expect(r.errors).toEqual([]);await a.close();});
  it(`${engine}: reports invalid rows without treating them as contacts`,async()=>{const r=await previewSource(offlineSource(engine,[{...row,email:'invalid'}]),'contacts','id','',mapping);expect(r.contacts).toEqual([]);expect(r.errors).toEqual([{row:1,code:'INVALID_MAPPED_CONTACT'}]);});
 }
 it('rejects undiscovered columns',async()=>{await expect(previewSource(offlineSource('mysql',[row]),'contacts','id','',{...mapping,name:'missing'})).rejects.toThrow('MAPPING_COLUMN_NOT_DISCOVERED');});
 it('limits offline pages to 100',async()=>{expect((await offlineSource('postgresql',Array.from({length:101},(_,i)=>({...row,id:String(i).padStart(4,'0')}))).read('contacts','id','')).length).toBe(100);});
 for(const url of ['http://example.invalid/api','https://127.0.0.1/api','https://localhost/api','https://user:pass@example.invalid','https://example.invalid:8443/api','https://example.invalid/api?redirect=x'])it(`rejects URL ${url}`,()=>expect(()=>restURL(url)).toThrow());
 for(const ip of ['127.0.0.1','10.1.1.1','172.16.0.1','192.168.0.1','169.254.169.254','100.64.1.1','198.18.0.1','::1','::ffff:127.0.0.1'])it(`denies private address ${ip}`,()=>expect(publicAddress(ip)).toBe(false));
 it('rejects SQL identifier injection',()=>expect(()=>identifier('contacts; DROP TABLE x')).toThrow());
});
describe('signed scoped embedding',()=>{
 const keys=generateKeyPairSync('ed25519');const issuer:EmbedIssuer={issuer:'synthetic-crm',audience:'bcs',company:'company-a',portals:['portal-a'],origins:['http://127.0.0.1:3200'],redirects:['http://127.0.0.1:3107/embed'],publicKey:keys.publicKey.export({format:'pem',type:'spki'}).toString(),permissions:['reports.view']};
 const a={iss:issuer.issuer,aud:'bcs',sub:'user-a',company:'company-a',portal:'portal-a',origin:issuer.origins[0],redirect:issuer.redirects[0],jti:'synthetic_replay_0001',iat:1000,exp:1050};
 function signed(patch:object={}){const raw=Buffer.from(JSON.stringify({...a,...patch})).toString('base64url');return [raw,sign(null,Buffer.from(raw),keys.privateKey).toString('base64url')] as const;}
 it('accepts correct signed scope',()=>expect(verifyEmbed(...signed(),issuer,1010).company).toBe('company-a'));
 for(const patch of [{company:'company-b'},{portal:'portal-b'},{aud:'other'},{iss:'other'},{origin:'https://evil.invalid'},{redirect:'https://evil.invalid'},{exp:1001},{iat:1100},{exp:1200}])it(`denies ${JSON.stringify(patch)}`,()=>expect(()=>verifyEmbed(...signed(patch),issuer,1010)).toThrow());
 it('denies tampered assertion',()=>{const [raw,sig]=signed();expect(()=>verifyEmbed(`${raw}a`,sig,issuer,1010)).toThrow();});
 it('declares durable single-use replay protection (SQL source contract)',()=>{const sql=readFileSync('database/migrations/024_tenant_embed_and_workflows.sql','utf8');expect(sql).toContain('UNIQUE(issuer,replay_id)');const ts=readFileSync('apps/web/src/server/embedding.ts','utf8');expect(ts).toContain('used_at IS NULL AND expires_at>now()');expect(ts).toContain("now()+interval '5 minutes'");});
});
describe('tenant and isolated worker boundaries',()=>{
 it('requires explicit company selection for multiple memberships',()=>expect(()=>resolveMembership([{id:'a',company_id:'11111111-1111-4111-8111-111111111111'},{id:'b',company_id:'22222222-2222-4222-8222-222222222222'}])).toThrow('COMPANY_SELECTION_REQUIRED'));
 for(const record of [{companyId:'b',portalId:'a'},{companyId:'a',portalId:'b'}])it(`denies foreign scope ${JSON.stringify(record)}`,()=>expect(()=>requireTenantScope({companyId:'a',portalId:'a',active:true,permissions:['reports.view']},record,'reports.view')).toThrow());
 it('denies a suspended context',()=>expect(()=>requireTenantScope({companyId:'a',portalId:'a',active:false,permissions:['reports.view']},{companyId:'a',portalId:'a'},'reports.view')).toThrow());
 it('accepts only explicit restricted disposable worker target',()=>expect(isolatedWorkerURL('postgresql://bcs_simulation_worker:synthetic@127.0.0.1:55432/bcs_consolidated_isolated')).toContain('55432'));
 for(const url of ['postgres://postgres:synthetic@127.0.0.1:55432/bcs_consolidated_isolated','postgres://bcs_simulation_worker:synthetic@remote.invalid:55432/bcs_consolidated_isolated','postgres://bcs_simulation_worker:synthetic@127.0.0.1:55432/postgres','postgres://bcs_simulation_worker:synthetic@127.0.0.1:55432/bcs_consolidated_isolated?sslmode=disable'])it(`rejects worker target ${url}`,()=>expect(()=>isolatedWorkerURL(url)).toThrow());
 it('review SQL requires independent actor and current revision',()=>{const sql=readFileSync('database/migrations/025_quotas_and_independent_review.sql','utf8');expect(sql).toContain('row.created_by=actor OR row.revision<>expected');expect(sql).toContain("row.state<>'review'");expect(sql).toContain('approved_revision=CASE');expect(sql).toContain('pg_advisory_xact_lock');});
});
describe('disabled SES contracts',()=>{
 const m={to:'one@example.invalid',subject:'Hello',html:'<p>Hello</p>',text:'Hello',attachments:[]};const sender={region:'ap-south-1',email:'sender@example.invalid',verified:true,rate:1,daily:100};
 it('never invokes a network or injectable sending adapter',async()=>{const network=vi.spyOn(globalThis,'fetch');await expect(disabledSesAdapter.submit(m)).rejects.toThrow('SES_DISABLED_BY_RELEASE');expect(network).not.toHaveBeenCalled();network.mockRestore();});
 it('validates a single recipient',()=>{expect(()=>validateProviderMessage(m,sender)).not.toThrow();expect(()=>validateProviderMessage({...m,to:'one@example.invalid,two@example.invalid'},sender)).toThrow();});
 it('rejects unverified sender and oversized attachment',()=>{expect(()=>validateProviderMessage(m,{...sender,verified:false})).toThrow();expect(()=>validateProviderMessage({...m,attachments:[{name:'large',bytes:11*1024*1024}]},sender)).toThrow();});
 it('denies cross-tenant provider events and returns deterministic suppression key',()=>{const e={eventId:'event-1',companyId:'a',accountId:'acct',messageId:'m',signatureVerified:true,type:'complaint' as const,occurredAt:'2026-10-19T00:00:00Z'};expect(()=>providerEventEffect(e,{companyId:'b',accountId:'acct'})).toThrow();expect(providerEventEffect(e,{companyId:'a',accountId:'acct'})).toEqual({deduplicationKey:'a:acct:event-1',suppress:true,state:'complained'});expect(classifyProviderError('Timeout')).toBe('unknown');});
});
