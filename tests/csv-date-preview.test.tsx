import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {webcrypto} from 'node:crypto';
import {csvDocument,csvHeaders,parseContactCsv,sampleContacts} from '../packages/contracts/src/contact-csv';
vi.mock('../apps/web/src/session-gate',()=>({useSessionRights:()=>['recipients.import']}));
import {ContactImport} from '../apps/web/src/contact-import';
const company='11111111-1111-4111-8111-111111111111',portal='22222222-2222-4222-8222-222222222222';
function setup(){vi.stubGlobal('crypto',webcrypto);const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({data:{scope:{companyId:company,portalId:portal}}})});vi.stubGlobal('fetch',fetch);render(<ContactImport database onCommitted={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Import CSV'}));return fetch;}
function upload(dates:string[]){const row=parseContactCsv(sampleContacts())[0];const rows=dates.map((dob,i)=>({...row,'Contact ID':`TEST-${i}`,Email:`sample${i}@example.invalid`,'Date of Birth':dob}));const bytes=new TextEncoder().encode(csvDocument([csvHeaders,...rows.map(r=>csvHeaders.map(k=>r[k]))]));const file=new File([bytes],'dates.csv');Object.defineProperty(file,'arrayBuffer',{value:async()=>bytes.buffer});fireEvent.change(screen.getByLabelText('Choose or drop CSV file'),{target:{files:[file]}});}
afterEach(()=>{localStorage.clear();vi.unstubAllGlobals();});
it('previews 241 DD-MM-YYYY records without importing or changing the 18-column contract',async()=>{
 const fetch=setup();upload(Array(241).fill('15-01-2000'));expect(await screen.findByText(/Preview: 241 rows; 0 local validation errors/)).toBeTruthy();expect(within(screen.getByRole('region',{name:'CSV preview'})).getAllByText('2000-01-15')).toHaveLength(20);expect(screen.getByText(/Detected format: DD-MM-YYYY/)).toBeTruthy();expect(fetch.mock.calls.every(([,o])=>!o.method)).toBe(true);
});
it('searches date formats and resolves ambiguity; remembers only the format for authenticated portal',async()=>{
 const fetch=setup(),user=userEvent.setup();upload(['1/2/2000']);expect(await screen.findByText(/AMBIGUOUS_DATE/)).toBeTruthy();expect(screen.getByRole('button',{name:'Confirm import'}).hasAttribute('disabled')).toBe(true);
 await user.type(screen.getByRole('combobox',{name:'Date Format'}),'Indian');await user.click(screen.getByRole('option',{name:/Indian/}));
 expect(screen.getByText(/Preview: 1 rows; 0 local validation errors/)).toBeTruthy();expect(within(screen.getByRole('region',{name:'CSV preview'})).getByText('2000-02-01')).toBeTruthy();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Remember date format for this portal'}).hasAttribute('disabled')).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Remember date format for this portal'}));expect(localStorage.getItem(`bcs:csv-date:${company}:${portal}`)).toBe('DMY');expect(localStorage.length).toBe(1);expect(fetch.mock.calls.every(([,o])=>!o.method)).toBe(true);
});
it('loads only the matching portal preference and applies it to the preview',async()=>{
 localStorage.setItem(`bcs:csv-date:${company}:${portal}`,'MDY');localStorage.setItem(`bcs:csv-date:${company}:other`,'DMY');setup();await screen.findByText(/Using this browser saved date preference/);upload(['1/2/2000']);await screen.findByText(/Preview: 1 rows; 0 local validation errors/);expect(within(screen.getByRole('region',{name:'CSV preview'})).getByText('2000-01-02')).toBeTruthy();
});
