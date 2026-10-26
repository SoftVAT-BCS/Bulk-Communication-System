import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
const h=vi.hoisted(()=>({page:vi.fn(),permission:'recipients.export'}));
vi.mock('server-only',()=>({}));
vi.mock('../apps/web/src/server/app-service',()=>({response:async(fn:()=>Promise<unknown>)=>{try{await fn();return new Response(null);}catch{return new Response(null,{status:422});}},authorized:async(_r:Request,p:string,fn:(c:unknown,s:unknown)=>unknown)=>{expect(p).toBe(h.permission);return fn({}, {company_id:'company',portal_id:'portal'});}}));
vi.mock('../apps/web/src/server/runtime',()=>({readRepository:async(fn:(r:unknown)=>unknown)=>fn({page:h.page})}));
import {exportRecipients} from '../apps/web/src/server/recipient-export';
import {parseContactCsv,validateCsvRows,csvHeaders} from '../packages/contracts/src/contact-csv';
afterEach(()=>vi.unstubAllEnvs());
it('authenticated exporter requests full records across pages and emits import-valid CSV',async()=>{
 vi.stubEnv('BCS_DEMO_COMPANY_ID','company');vi.stubEnv('BCS_DEMO_PORTAL_ID','portal');
 const rows=Array.from({length:240},(_,n)=>({id:`uuid-${n}`,targetId:`000${n}`,name:`Sample ${n}`,email:`sample${n}@example.invalid`,group:'Course',subgroup:'Batch',category:'Student',dob:'2000-01-15',status:n%2?'Active':'Inactive',mobileNo:'+919876543210'}));
 h.page.mockImplementation(async(f:{page:number},full:boolean)=>{expect(full).toBe(true);return{total:240,rows:rows.slice(f.page*50,(f.page+1)*50)};});
 const response=await exportRecipients(new Request('http://127.0.0.1:3000/api/bcs/app/recipients/export'));expect(response.status).toBe(200);const data=parseContactCsv(await response.text());expect(data).toHaveLength(240);expect(Object.keys(data[0])).toEqual([...csvHeaders]);expect(validateCsvRows(data).errors).toEqual([]);expect(data[1].Status).toBe('Active');expect(data[0].Category).toBe('Student');
});
it('refuses a corrupt export instead of emitting a silently unimportable file',async()=>{
 vi.stubEnv('BCS_DEMO_COMPANY_ID','company');vi.stubEnv('BCS_DEMO_PORTAL_ID','portal');h.page.mockResolvedValue({total:1,rows:[{id:'1',name:'Sample',email:'sample@example.invalid',group:'Course',subgroup:'Batch',category:'Student',status:'',dob:'invalid'}]});
 expect((await exportRecipients(new Request('http://127.0.0.1:3000/api/bcs/app/recipients/export'))).status).toBe(422);
});
it('CSV-only proposal is additive, guarded at 021 and does not require worker migrations',()=>{
 const sql=readFileSync('database/proposals/026_bcs_dev_csv_only_PENDING_APPROVAL.sql','utf8');expect(sql).toContain('version BETWEEN 1 AND 21');expect(sql).not.toMatch(/version=25/);expect(sql).toContain('UNIQUE (company_id, portal_id, target_id)');expect(sql).toContain('BCS_DEV_CSV_ONLY_OWNER_APPROVED');expect(sql).not.toMatch(/CREATE TABLE|DROP |TRUNCATE |ALTER TABLE public\.|DISABLE ROW LEVEL SECURITY/);expect(sql).toContain("bcs.session_allows(company_id,portal_id,'recipients.import')");
});
