import {parseCsvDate} from './csv-date';
/** Browser/server CSV contract. Values are data, never HTML or SQL. */
export const csvHeaders = ['Contact ID','Name','Email','Group','Subgroup','Category','Grade','Date of Birth','Gender','Mobile Number','WhatsApp Number','Address Line 1','Address Line 2','City','PIN Code','State Name','District Name','Status'] as const;
export const csvLimits = { bytes: 2_000_000, rows: 5000, chunk: 25, cell: 500, payload: 150000 };
export const importModes = ['INSERT_NEW_ONLY','SKIP_EXISTING','UPDATE_EXISTING_BY_CONTACT_ID'] as const;
export type ImportMode = typeof importModes[number];
export type CsvContact = Record<typeof csvHeaders[number],string>;
export type CsvError = { row:number; code:string };
export function csvCell(value:string){return `"${(/^[\s]*[=+@-]/.test(value)||value.startsWith("'")||/^[\t\r\n]/.test(value)?`'${value}`:value).replaceAll('"','""')}"`;}
export function csvDocument(rows:readonly (readonly string[])[]){return `\ufeff${rows.map(row=>row.map(csvCell).join(',')).join('\r\n')}\r\n`;}
export function sampleContacts(){return csvDocument([csvHeaders,['DEMO-001','Sample Person','sample.person@example.invalid','Example Group','Example Subgroup','Example Category','','2000-01-15','','','','','','Example City','','Example State','Example District','Inactive']]);}
// Reverse only the spreadsheet guard emitted by csvCell; retain literal apostrophes.
function decodeCsvCell(value:string){return value.startsWith("'") && (/^[\s]*[=+@-]/.test(value.slice(1))||value[1]==="'"||/^[\t\r\n]/.test(value.slice(1)))?value.slice(1):value;}
export function parseContactCsv(input:string):CsvContact[]{
  if(new TextEncoder().encode(input).length>csvLimits.bytes)throw Error('FILE_TOO_LARGE');
  const text=input.replace(/^\ufeff/,'');const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
  const field=()=>{if(cell.length>csvLimits.cell)throw Error('CELL_TOO_LONG');row.push(cell);cell='';closed=false;};
  const line=()=>{field();if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>csvLimits.rows+1)throw Error('TOO_MANY_ROWS');};
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='\0'||ch==='\ufffd')throw Error('INVALID_UTF8');if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;}else if(ch==='"'){if(cell||closed)throw Error('INVALID_CSV_QUOTE');quoted=true;}else if(ch===',')field();else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;line();}else{if(closed)throw Error('INVALID_CSV_QUOTE');cell+=ch;}if(cell.length>csvLimits.cell)throw Error('CELL_TOO_LONG');}
  if(quoted)throw Error('UNCLOSED_QUOTE');if(cell||row.length||closed)line();const headers=rows.shift()?.map(x=>x.trim());
  if(!headers||new Set(headers).size!==headers.length)throw Error('DUPLICATE_HEADERS');
  if(headers.some(h=>!(csvHeaders as readonly string[]).includes(h))||['Contact ID','Name','Email','Group','Subgroup','Category'].some(h=>!headers.includes(h)))throw Error('INVALID_HEADERS');
  if(!rows.length)throw Error('EMPTY_CSV');return rows.map(r=>{if(r.length!==headers.length)throw Error('COLUMN_COUNT');return Object.fromEntries(csvHeaders.map(h=>[h,decodeCsvCell(r[headers.indexOf(h)]??'').trim()])) as CsvContact;});
}
export function contactIdentity(target:string,name:string,email:string,group:string,subgroup:string){
  if(!target||target.length>100||!name||name.length>200||!group||group.length>100||!subgroup||subgroup.length>100)throw Error('REQUIRED_CONTACT_FIELDS');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('INVALID_EMAIL');
}
export function validateCsvContact(value:unknown):CsvContact{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_ROW');const obj=value as Record<string,unknown>;
  if(Object.keys(obj).some(k=>!(csvHeaders as readonly string[]).includes(k)))throw Error('UNKNOWN_COLUMN');
  const r=Object.fromEntries(csvHeaders.map(h=>{const v=obj[h]??'';if(typeof v!=='string'||v.length>csvLimits.cell||Array.from(v).some(ch=>ch.charCodeAt(0)<32||ch.charCodeAt(0)===127))throw Error('INVALID_CELL');return[h,v.trim()];})) as CsvContact;
  r.Email=r.Email.toLowerCase();contactIdentity(r['Contact ID'],r.Name,r.Email,r.Group,r.Subgroup);
  if(!r.Category||r.Category.length>100)throw Error('CATEGORY_REQUIRED');r.Status=r.Status||'Inactive';if(!['Active','Inactive','Bounced','Unsubscribed'].includes(r.Status))throw Error('INVALID_STATUS');
  const date=parseCsvDate(r['Date of Birth']).iso;r['Date of Birth']=date;if(date&&(date<'1900-01-01'||date>new Date().toISOString().slice(0,10)))throw Error('INVALID_DATE');
  for(const key of ['Mobile Number','WhatsApp Number'] as const)if(r[key]&&!/^\+[1-9][0-9]{7,14}$/.test(r[key]))throw Error('INVALID_PHONE');
  for(const key of ['State Name','District Name'] as const)if(r[key]&&(r[key].length<2||r[key].length>120))throw Error('INVALID_REGION');
  return r;
}
export function validateCsvRows(rows:unknown[]){const valid:{row:number;contact:CsvContact}[]=[],errors:CsvError[]=[],targets=new Set<string>(),emails=new Set<string>();rows.forEach((value,i)=>{try{const c=validateCsvContact(value);if(targets.has(c['Contact ID']))throw Error('DUPLICATE_TARGET');targets.add(c['Contact ID']);if(emails.has(c.Email))throw Error('EMAIL_COLLISION');emails.add(c.Email);valid.push({row:i+1,contact:c});}catch(e){errors.push({row:i+1,code:e instanceof Error?e.message:'INVALID_ROW'});}});return{valid,errors};}
export function importDisposition(mode:ImportMode,existing:{status:string;email_normalized:string}|undefined,row:CsvContact){
  if(!existing)return{action:'insert',status:row.Status==='Active'?'Inactive':row.Status};
  if(mode==='INSERT_NEW_ONLY')return{action:'reject',status:existing.status};
  if(mode==='SKIP_EXISTING')return{action:'skip',status:existing.status};
  return{action:'update',status:existing.status==='Active'&&existing.email_normalized!==row.Email?'Inactive':existing.status};
}
