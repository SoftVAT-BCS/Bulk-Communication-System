import {describe,it,expect} from 'vitest';
import {csvDocument,csvHeaders,csvLimits,parseContactCsv,sampleContacts,validateCsvContact,validateCsvRows,importDisposition} from '../packages/contracts/src/contact-csv';
const row=()=>parseContactCsv(sampleContacts())[0];
describe('CSV contract',()=>{
 it('downloads a fictional UTF8 BOM template with no tenant columns',()=>{expect(sampleContacts().startsWith('\ufeff')).toBe(true);expect(row().Email).toContain('.invalid');expect(csvHeaders).not.toContain('Company ID');});
 it('parses quoted delimiters, escaped quotes and LF',()=>{const r=row();r.Name='Sample, "Person"';expect(parseContactCsv(csvDocument([csvHeaders,csvHeaders.map(k=>r[k])]).replaceAll('\r\n','\n'))[0].Name).toBe(r.Name);});
 it.each(['Company ID,Name,Email\na,b,c','Name,Name\na,b','Contact ID,Name,Email\na,b,c','"unclosed'])('rejects malformed headers/CSV %s',s=>expect(()=>parseContactCsv(s)).toThrow());
 it.each([['Email','bad'],['Date of Birth','2023-02-29'],['Date of Birth','2000-13-01'],['Contact ID',''],['Group',''],['Subgroup',''],['Category',''],['Status','sent'],['Mobile Number','0123'],['State Name','x']])('validates %s', (k,v)=>expect(()=>validateCsvContact({...row(),[k]:v})).toThrow());
 it('normalizes email and preserves identifiers',()=>{const r=validateCsvContact({...row(),'Contact ID':'000123',Email:' PERSON@EXAMPLE.INVALID '});expect(r['Contact ID']).toBe('000123');expect(r.Email).toBe('person@example.invalid');});
 it('reports partial errors and duplicate IDs/emails',()=>{const r=row();const v=validateCsvRows([r,r,{...r,'Contact ID':'other'},{...r,'Contact ID':'third',Email:'bad'}]);expect(v.valid).toHaveLength(1);expect(v.errors.map(e=>e.code)).toEqual(['DUPLICATE_TARGET','EMAIL_COLLISION','INVALID_EMAIL']);});
 it('rejects tenant injection',()=>expect(()=>validateCsvContact({...row(),company_id:'other'})).toThrow('UNKNOWN_COLUMN'));
 it('bounds bytes and rows',()=>{expect(()=>parseContactCsv('x'.repeat(csvLimits.bytes+1))).toThrow('FILE_TOO_LARGE');const r=row();expect(()=>parseContactCsv(csvDocument([csvHeaders,...Array.from({length:5001},()=>csvHeaders.map(k=>r[k]))]))).toThrow('TOO_MANY_ROWS');});
 it('escapes exported spreadsheet formulas',()=>expect(csvDocument([['=cmd',' +cmd','@cmd','-cmd']])).toContain("' +cmd"));
 it.each(['Inactive','Bounced','Unsubscribed'])('does not reactivate %s',status=>expect(importDisposition('UPDATE_EXISTING_BY_CONTACT_ID',{status,email_normalized:row().Email},{...row(),Status:'Active'}).status).toBe(status));
 it('distinguishes skip, reject and update; new active is inactive',()=>{const old={status:'Active',email_normalized:row().Email};expect(importDisposition('INSERT_NEW_ONLY',old,row()).action).toBe('reject');expect(importDisposition('SKIP_EXISTING',old,row()).action).toBe('skip');expect(importDisposition('UPDATE_EXISTING_BY_CONTACT_ID',old,row()).action).toBe('update');expect(importDisposition('INSERT_NEW_ONLY',undefined,{...row(),Status:'Active'}).status).toBe('Inactive');});
});
