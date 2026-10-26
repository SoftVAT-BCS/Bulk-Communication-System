import 'server-only';
import type {CsvOutcome} from '../../../../packages/contracts/src/csv-report';
import {createHash} from 'node:crypto';
import {authorized} from './app-service';
import {ReadError,uuid} from './validation';
import {csvLimits,importModes,importDisposition,validateCsvContact,type ImportMode,type CsvError,type CsvContact} from '../../../../packages/contracts/src/contact-csv';
import {lockContactPortal,contactEmailCollision} from './import-shared';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export async function boundedImportBody(request:Request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ReadError(415,'JSON_REQUIRED');
  const reader=request.body?.getReader();if(!reader)throw new ReadError(400,'INVALID_BODY');let length=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
  try{while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.byteLength;if(length>csvLimits.payload){await reader.cancel();throw new ReadError(413,'BODY_TOO_LARGE');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();const b=JSON.parse(text);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b as Record<string,unknown>;}catch(e){if(e instanceof ReadError)throw e;throw new ReadError(400,'INVALID_BODY');}finally{reader.releaseLock();}
}
export function csvImport(request:Request){return authorized(request,'recipients.import',async(c,s)=>{
  const ready=await c.query("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='bcs' AND table_name='contact_import_batches' AND column_name='csv_receipt') ready");
  if(!ready.rows[0]?.ready)throw new ReadError(503,'CSV_IMPORT_MIGRATION_NOT_APPLIED');
  const scope=[s.company_id,s.portal_id];
  if(request.method==='GET'){const names=(await c.query('SELECT co.company_name,p.portal_name FROM bcs.companies co JOIN bcs.portals p ON p.company_id=co.id WHERE co.id=$1 AND p.id=$2',scope)).rows[0];const context={companyId:s.company_id,portalId:s.portal_id,name:s.display_name,company:names?.company_name,portal:names?.portal_name};if(new URL(request.url).searchParams.get('context')==='1')return{context};return{context,batches:(await c.query('SELECT id,company_id,portal_id,csv_owner,original_file_name,created_at,completed_at,status,csv_receipt FROM bcs.contact_import_batches WHERE company_id=$1 AND portal_id=$2 AND csv_owner=$3 ORDER BY created_at DESC LIMIT 50',[...scope,s.principal_id])).rows};}
  const b=await boundedImportBody(request);
  if(new URL(request.url).searchParams.get('preview')==='1'){
    if(Object.keys(b).some(k=>!['rows','mode'].includes(k))||!importModes.includes(b.mode as ImportMode)||!Array.isArray(b.rows)||!b.rows.length||b.rows.length>csvLimits.chunk)throw new ReadError(400,'INVALID_CSV_PREVIEW');
    const input=b.rows.map((v,i)=>{try{return{row:i+1,contact:validateCsvContact(v)};}catch(e){return{row:i+1,error:e instanceof Error?e.message:'INVALID_ROW'};}});
    const good=input.filter(x=>x.contact).map(x=>({row:x.row,target:x.contact?.['Contact ID'],email:x.contact?.Email,group:x.contact?.Group,subgroup:x.contact?.Subgroup}));
    const found=await c.query(`WITH input AS (SELECT * FROM jsonb_to_recordset($3::jsonb) AS x("row" integer,target text,email text,"group" text,subgroup text))
    SELECT i.row, EXISTS(SELECT 1 FROM bcs.recipients r WHERE r.company_id=$1 AND r.portal_id=$2 AND r.target_id=i.target) AS existing,
    EXISTS(SELECT 1 FROM bcs.recipients r WHERE r.company_id=$1 AND r.portal_id=$2 AND r.email_normalized=i.email AND r.target_id<>i.target) AS collision,
    (SELECT count(*) FROM bcs.audience_groups g JOIN bcs.audience_subgroups sg ON sg.company_id=g.company_id AND sg.portal_id=g.portal_id AND sg.group_id=g.id WHERE g.company_id=$1 AND g.portal_id=$2 AND g.group_name=i."group" AND sg.subgroup_name=i.subgroup AND g.status='active' AND sg.status='active') AS matches FROM input i`,[...scope,JSON.stringify(good)]);
    return {scope:{companyId:s.company_id,portalId:s.portal_id},rows:input.map(x=>{const f=found.rows.find(r=>r.row===x.row);const code=x.error??(!f?'LOOKUP_UNAVAILABLE':Number(f.matches)!==1?'UNKNOWN_OR_AMBIGUOUS_SUBGROUP':f.collision?'EMAIL_COLLISION':f.existing&&b.mode==='INSERT_NEW_ONLY'?'TARGET_EXISTS':'');return{row:x.row,existing:f?Boolean(f.existing):null,code,action:code?'Rejected':f.existing?(b.mode==='SKIP_EXISTING'?'Skip':'Update'):'Insert'};})};
  }
  if(Object.keys(b).some(k=>!['upload','chunk','chunks','mode','rows','fileHash','previous'].includes(k))||!uuid.test(String(b.upload))||!/^[a-f0-9]{64}$/.test(String(b.fileHash))||!Number.isInteger(b.chunk)||!Number.isInteger(b.chunks)||Number(b.chunk)<0||Number(b.chunks)<1||Number(b.chunks)>200||Number(b.chunk)>=Number(b.chunks)||!importModes.includes(b.mode as ImportMode)||!Array.isArray(b.rows)||b.rows.length<1||b.rows.length>csvLimits.chunk||(Number(b.chunk)<Number(b.chunks)-1&&b.rows.length!==csvLimits.chunk))throw new ReadError(400,'INVALID_CSV_BATCH');
  // Stable file+mode identity makes a repeated identical file replay across browser reloads.
  const uploadHash=hash(`${b.fileHash}:${b.mode}`);b.upload=`${uploadHash.slice(0,8)}-${uploadHash.slice(8,12)}-${uploadHash.slice(12,16)}-${uploadHash.slice(16,20)}-${uploadHash.slice(20,32)}`;
  await lockContactPortal(c,...scope as [string,string]);
  const key=`csv:${s.principal_id}:${b.upload}:${b.chunk}`,requestHash=hash(JSON.stringify(b));
  const previous=(await c.query('SELECT id,content_sha256,csv_receipt FROM bcs.contact_import_batches WHERE company_id=$1 AND portal_id=$2 AND external_batch_key=$3',[...scope,key])).rows[0];
  if(previous){if(previous.content_sha256!==requestHash)throw new ReadError(409,'IDEMPOTENCY_CONFLICT');return{...previous.csv_receipt,batchId:previous.id,replayed:true};}
  const prior=(await c.query("SELECT id,csv_receipt FROM bcs.contact_import_batches WHERE company_id=$1 AND portal_id=$2 AND csv_owner=$3 AND csv_receipt->>'upload'=$4 ORDER BY (csv_receipt->>'chunk')::integer LIMIT 200",[...scope,s.principal_id,b.upload])).rows;
  if(prior.length!==Number(b.chunk)||(prior.length?b.previous!==prior.at(-1)?.id:b.previous!==null)||prior.some(p=>p.csv_receipt.fileHash!==b.fileHash||p.csv_receipt.mode!==b.mode||p.csv_receipt.chunks!==b.chunks))throw new ReadError(409,'INVALID_CONTINUATION');
  const seenTargets=new Set<string>(prior.flatMap(p=>p.csv_receipt.targets)),seenEmails=new Set<string>(prior.flatMap(p=>p.csv_receipt.emails)),targets:string[]=[],emails:string[]=[],errors:CsvError[]=[];
  const outcomes:CsvOutcome[]=[];
  let inserted=0,updated=0,skipped=0,validated=0;
  for(let i=0;i<b.rows.length;i++){
    const rowNumber=Number(b.chunk)*csvLimits.chunk+i+1;let r:CsvContact;
    try{r=validateCsvContact(b.rows[i]);if(seenTargets.has(hash(r['Contact ID'])))throw Error('DUPLICATE_TARGET');if(seenEmails.has(hash(r.Email)))throw Error('EMAIL_COLLISION');targets.push(hash(r['Contact ID']));emails.push(hash(r.Email));seenTargets.add(hash(r['Contact ID']));seenEmails.add(hash(r.Email));}catch(e){errors.push({row:rowNumber,code:e instanceof Error?e.message:'INVALID_ROW'});continue;}
    const taxonomy=(await c.query("SELECT g.id AS group_id,sg.id AS subgroup_id FROM bcs.audience_groups g JOIN bcs.audience_subgroups sg ON sg.company_id=g.company_id AND sg.portal_id=g.portal_id AND sg.group_id=g.id WHERE g.company_id=$1 AND g.portal_id=$2 AND g.group_name=$3 AND sg.subgroup_name=$4 AND g.status='active' AND sg.status='active' LIMIT 2",[...scope,r.Group,r.Subgroup])).rows;
    if(taxonomy.length!==1){errors.push({row:rowNumber,code:'UNKNOWN_OR_AMBIGUOUS_SUBGROUP'});continue;}
    if(await contactEmailCollision(c,s.company_id,s.portal_id,r.Email,r['Contact ID'])){errors.push({row:rowNumber,code:'EMAIL_COLLISION'});continue;}
    const old=(await c.query('SELECT id,status,email_normalized FROM bcs.recipients WHERE company_id=$1 AND portal_id=$2 AND target_id=$3 FOR UPDATE',[...scope,r['Contact ID']])).rows[0];
    const action=importDisposition(b.mode as ImportMode,old,r);validated++;
    if(action.action==='reject'){errors.push({row:rowNumber,code:'TARGET_EXISTS'});continue;}if(action.action==='skip'){skipped++;outcomes.push({row:rowNumber,result:'Skipped'});continue;}
    const values=[...scope,r['Contact ID'],r.Name,r.Email,r.Group,r.Category,r.Grade||null,r['Date of Birth']||null,r.Gender||null,r['Mobile Number']||null,r['WhatsApp Number']||null,r['Address Line 1']||null,r['Address Line 2']||null,r.City||null,r['PIN Code']||null,r['State Name']||null,r['District Name']||null,action.status];
    const fields=['name','email','recipient_group','category','grade','dob','gender','mobile_no','whatsapp_no','address_1','address_2','city','pin','state_name','district_name','status'];
    const sql=old?`UPDATE bcs.recipients SET ${fields.map((field,n)=>`${field}=$${n+4}`).join(',')} WHERE company_id=$1 AND portal_id=$2 AND target_id=$3 RETURNING id`:`INSERT INTO bcs.recipients(company_id,portal_id,target_id,${fields.join(',')}) VALUES(${values.map((_,n)=>`$${n+1}`).join(',')}) RETURNING id`;
    const recipient=(await c.query(sql,values)).rows[0];
    if(!recipient)throw new ReadError(409,'RECIPIENT_CHANGED');
    await c.query('DELETE FROM bcs.recipient_group_memberships WHERE company_id=$1 AND portal_id=$2 AND recipient_id=$3',[...scope,recipient.id]);
    await c.query('INSERT INTO bcs.recipient_group_memberships(company_id,portal_id,recipient_id,group_id,subgroup_id) VALUES($1,$2,$3,$4,$5)',[...scope,recipient.id,taxonomy[0].group_id,taxonomy[0].subgroup_id]);
    if(action.action==='insert')inserted++;else updated++;
    outcomes.push({row:rowNumber,result:action.action==='insert'?'Inserted':'Updated'});
  }
  outcomes.push(...errors.map(e=>({row:e.row,result:'Rejected' as const,code:e.code})));
  const receipt={outcomes,upload:b.upload,chunk:b.chunk,chunks:b.chunks,fileHash:b.fileHash,mode:b.mode,total:b.rows.length,validated,inserted,updated,skipped,rejected:errors.length,emailCollisions:errors.filter(e=>e.code==='EMAIL_COLLISION').length,groupErrors:errors.filter(e=>e.code==='UNKNOWN_OR_AMBIGUOUS_SUBGROUP').length,errors,targets,emails,completedAt:new Date().toISOString()};
  const batch=(await c.query("INSERT INTO bcs.contact_import_batches(company_id,portal_id,external_batch_key,content_sha256,status,reported_rows,accepted_rows,rejected_rows,completed_at,csv_owner,csv_receipt,input_encoding,input_delimiter) VALUES($1,$2,$3,$4,'completed',$5,$6,$7,now(),$8,$9,'UTF-8',',') RETURNING id",[...scope,key,requestHash,b.rows.length,inserted+updated,errors.length,s.principal_id,receipt])).rows[0].id;
  for(const e of errors)await c.query('INSERT INTO bcs.contact_import_errors(company_id,portal_id,batch_id,row_number,error_code,safe_message) VALUES($1,$2,$3,$4,$5,$6)',[...scope,batch,e.row,e.code,'Correct the indicated row; no source values retained.']);
  await c.query("INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference,safe_metadata) VALUES($1,$2,$3,'csv.contacts.import','contact_import',$4,$5)",[...scope,s.principal_id,batch,{inserted,updated,skipped,rejected:errors.length,chunk:b.chunk}]);
  return{...receipt,batchId:batch,replayed:false};
});}
