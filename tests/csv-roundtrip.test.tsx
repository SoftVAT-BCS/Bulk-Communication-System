import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {webcrypto} from 'node:crypto';
import {recipientCsv,type ExportRecipient} from '../apps/web/src/recipient-csv';
import {csvHeaders,parseContactCsv,validateCsvRows,importDisposition} from '../packages/contracts/src/contact-csv';
vi.mock('../apps/web/src/session-gate',()=>({useSessionRights:()=>['recipients.import']}));
import {ContactImport} from '../apps/web/src/contact-import';
const fixture:ExportRecipient={id:'internal',targetId:'000123',name:'Sample, "Person"',email:'sample@example.invalid',groupId:'g',group:'Course',subgroup:'Batch',category:'Student',status:'Active',stage:'',joined:'',dob:'15-01-2000',mobileNo:'+919876543210',whatsappNo:'+919876543211',pin:'001234',stateName:'Example State',districtName:'Example District'};
afterEach(()=>vi.unstubAllGlobals());
it('exports all 18 named fields and round trips date, category, status, phone and leading zeros',()=>{
 const csv=recipientCsv([fixture]);const parsed=parseContactCsv(csv);expect(Object.keys(parsed[0])).toEqual([...csvHeaders]);
 expect(parsed[0]).toMatchObject({'Contact ID':'000123',Category:'Student',Status:'Active','Date of Birth':'2000-01-15','Mobile Number':'+919876543210','PIN Code':'001234'});
 expect(validateCsvRows(parsed).errors).toEqual([]);
});
it.each(['Active','Inactive','Bounced','Unsubscribed'] as const)('retains existing %s status and guards across all modes',status=>{
 const row=parseContactCsv(recipientCsv([{...fixture,status}]))[0],old={status,email_normalized:row.Email};
 expect(importDisposition('INSERT_NEW_ONLY',old,row).action).toBe('reject');expect(importDisposition('SKIP_EXISTING',old,row).action).toBe('skip');expect(importDisposition('UPDATE_EXISTING_BY_CONTACT_ID',old,{...row,Status:'Inactive'})).toEqual({action:'update',status});
});
it('round trips literal apostrophes and formula protection without accumulating guards',()=>{
 for(const name of ['=formula',"'literal","'+literal"]){const first=recipientCsv([{...fixture,name}]);const parsed=parseContactCsv(first)[0];expect(parsed.Name).toBe(name);expect(recipientCsv([{...fixture,name:parsed.Name}])).toBe(first);}
});
it('loads the real exporter output into authenticated import preview with zero errors and no import request',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('crypto',webcrypto);
 render(<ContactImport database onCommitted={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Import CSV'}));
 const bytes=new TextEncoder().encode(recipientCsv([fixture]));const file=new File([bytes],'export.csv',{type:'text/csv'});Object.defineProperty(file,'arrayBuffer',{value:async()=>bytes.buffer});
 fireEvent.change(screen.getByLabelText('Choose or drop CSV file'),{target:{files:[file]}});
 expect(await screen.findByText(/Preview: 1 rows; 0 local validation errors/)).toBeTruthy();
 const preview=within(screen.getByRole('region',{name:'CSV preview'}));expect(preview.getAllByText('2000-01-15')).toHaveLength(2);expect(preview.getByText('Student')).toBeTruthy();expect(preview.getByText('Active')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Confirm import'}).hasAttribute('disabled')).toBe(false);expect(fetch.mock.calls.every(([,options])=>!options?.method||options.method==='GET')).toBe(true);
});
