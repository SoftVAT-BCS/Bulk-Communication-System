import 'server-only';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { authorized,jsonBody } from './app-service';
import { ReadError,uuid } from './validation';
import { contact } from './contact-validation';
import { contactsApi } from './contacts-api';
import { openSource,identifier,type SourceConfig,type SourceAdapter } from './connector-adapters';
export function mapContacts(rows:Record<string,unknown>[],map:Record<string,string>) {
  const fields=['targetId','name','email','group','subgroup'];if(fields.some(k=>!map[k]))throw Error('MAPPING_FIELDS_REQUIRED');
  const contacts:Record<string,string>[]=[];const errors:{row:number;code:string}[]=[];
  rows.forEach((r,i)=>{try{const v=Object.fromEntries(fields.map(k=>[k,String(r[identifier(map[k])]??'')]));contact(v);contacts.push(v);}catch{errors.push({row:i+1,code:'INVALID_MAPPED_CONTACT'});}});return {contacts,errors};
}
export async function previewSource(adapter:SourceAdapter,table:string,key:string,cursor:string,map:Record<string,string>){
  const columns=await adapter.discover();if(Object.values(map).some(c=>!columns.some(v=>v.table===table&&v.column===c)))throw Error('MAPPING_COLUMN_NOT_DISCOVERED');
  const rows=await adapter.read(table,key,cursor);if(rows.length>100)throw Error('SOURCE_BATCH_LIMIT');
  if(rows.some(r=>r[key]===null||r[key]===undefined||!String(r[key])||String(r[key]).length>200)||new Set(rows.map(r=>String(r[key]))).size!==rows.length)throw Error('SOURCE_CURSOR_MUST_BE_UNIQUE_AND_BOUNDED');
  const result=mapContacts(rows,map);return {...result,next:rows.length?String(rows[rows.length-1][key]):cursor,read:rows.length};
}
interface Registry extends SourceConfig {companyId:string;portalId:string;enabled:boolean;passwordEnv:string;caEnv:string;ingestTokenEnv:string;bearerEnv?:string}
export async function connectorAction(request:Request){
  const b=await jsonBody(request);if(!uuid.test(String(b.connection))||!uuid.test(String(b.mapping))||!['discover','preview','validate','approve','sync','rescan'].includes(String(b.action)))throw new ReadError(400,'INVALID_CONNECTOR_ACTION');
  const source=await authorized(request,'mappings.manage',async(c,s)=>{
    const row=(await c.query("SELECT x.*,m.approved_view_or_endpoint,m.primary_key_field,m.column_map,m.id mapping_id,m.status mapping_status FROM bcs.portal_connections x JOIN bcs.data_mappings m ON m.company_id=x.company_id AND m.portal_id=x.portal_id AND m.connection_id=x.id WHERE x.company_id=$1 AND x.portal_id=$2 AND x.id=$3 AND m.id=$4 AND m.status<>'disabled' AND x.status NOT IN ('suspended','retired')",[s.company_id,s.portal_id,b.connection,b.mapping])).rows[0];
    if(!row)throw new ReadError(404,'APPROVED_CONNECTOR_NOT_FOUND');
    const checkpoint=(await c.query("SELECT cursor_reference FROM bcs.connector_sync_checkpoints WHERE company_id=$1 AND portal_id=$2 AND connection_id=$3 AND entity_type='recipient'",[s.company_id,s.portal_id,b.connection])).rows[0]?.cursor_reference??'';
    return {row,checkpoint,scope:s};
  });
  let entry:Registry;try{entry=JSON.parse(readFileSync(/* turbopackIgnore: true */ process.env.BCS_CONNECTOR_REGISTRY_FILE??'','utf8'))[source.row.endpoint_reference];}catch{throw new ReadError(503,'CONNECTOR_REGISTRY_UNAVAILABLE');}
  if(!entry?.enabled||entry.companyId!==source.scope.company_id||entry.portalId!==source.scope.portal_id||entry.engine!==source.row.source_engine)throw new ReadError(403,'CONNECTOR_NOT_APPROVED');
  if(b.action==='sync'&&(source.row.mapping_status!=='approved'||source.row.status!=='active'))throw new ReadError(409,'APPROVE_CONNECTOR_FIRST');
  if(b.action==='rescan')return authorized(request,'mappings.manage',async(c,s)=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,26))',[`${s.company_id}:${s.portal_id}:${b.connection}`]);await c.query("UPDATE bcs.connector_sync_checkpoints SET cursor_reference='' WHERE company_id=$1 AND portal_id=$2 AND connection_id=$3 AND entity_type='recipient'",[s.company_id,s.portal_id,b.connection]);await c.query("INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference) VALUES($1,$2,$3,'connector.rescan','connection',$4)",[s.company_id,s.portal_id,s.principal_id,b.connection]);return {saved:true,status:'rescan cursor reset; synchronize to review updates'};});
  const config={...entry,password:process.env[entry.passwordEnv]??'',ca:process.env[entry.caEnv]??'',bearer:entry.bearerEnv?process.env[entry.bearerEnv]:undefined};
  const adapter=await openSource(config);
  try{
    if(b.action==='discover')return {columns:await adapter.discover(),connected:true};
    const result=await previewSource(adapter,source.row.approved_view_or_endpoint,source.row.primary_key_field,source.checkpoint,{targetId:source.row.primary_key_field,...source.row.column_map});
    if(['validate','approve'].includes(String(b.action))){
      if(result.errors.length) return {errors:result.errors,saved:false};
      return authorized(request,'mappings.manage',async(c,s)=>{
        if(!(await c.query("SELECT bcs.session_allows($1,NULL,'portals.manage') allowed",[s.company_id])).rows[0].allowed)throw new ReadError(403,'COMPANY_PORTAL_PERMISSION_REQUIRED');
        const current=(await c.query('SELECT m.status FROM bcs.data_mappings m JOIN bcs.portal_connections x ON x.company_id=m.company_id AND x.id=m.connection_id WHERE m.company_id=$1 AND m.portal_id=$2 AND m.id=$3 AND x.endpoint_reference=$4 AND m.column_map=$5::jsonb AND m.primary_key_field=$6 AND m.approved_view_or_endpoint=$7 FOR UPDATE OF m,x',[s.company_id,s.portal_id,b.mapping,source.row.endpoint_reference,JSON.stringify(source.row.column_map),source.row.primary_key_field,source.row.approved_view_or_endpoint])).rows[0];
        if(!current||b.action==='approve'&&current.status!=='validated')throw new ReadError(409,'VALIDATE_CURRENT_MAPPING_FIRST');
        await c.query("UPDATE bcs.data_mappings SET status=$4,validated_at=now(),approved_by=$5 WHERE company_id=$1 AND portal_id=$2 AND id=$3",[s.company_id,s.portal_id,b.mapping,b.action==='approve'?'approved':'validated',b.action==='approve'?s.principal_id:null]);
        await c.query('UPDATE bcs.portal_connections SET status=$4,last_connectivity_test_at=now() WHERE company_id=$1 AND portal_id=$2 AND id=$3',[s.company_id,s.portal_id,b.connection,b.action==='approve'?'active':'validated']);
        return {saved:true,status:b.action==='approve'?'approved':'validated',read:result.read};
      });
    }
    if(b.action==='preview')return {...result,saved:false};
    if(result.errors.length) return {errors:result.errors,read:result.read,saved:false}; // No checkpoint advancement over mapping errors.
    const token=process.env[entry.ingestTokenEnv]??'';const hash=createHash('sha256').update(JSON.stringify([b.connection,b.mapping,source.checkpoint,result.contacts])).digest('hex');
    await authorized(request,'mappings.manage',async(c,s)=>{await c.query("SELECT set_config('bcs.api_hash',$1,true)",[createHash('sha256').update(token).digest('hex')]);const a=(await c.query("SELECT * FROM bcs.api_context('contacts.write')")).rows[0];if(!a||a.company_id!==s.company_id||a.portal_id!==s.portal_id)throw new ReadError(403,'CONNECTOR_INGEST_SCOPE_MISMATCH');});
    const imported=result.contacts.length?await contactsApi(new Request(new URL('/api/bcs/v1/contacts',request.url),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'Idempotency-Key':hash},body:JSON.stringify({contacts:result.contacts})})):null;
    if(imported&&'batchId' in imported){const batch=await contactsApi(new Request(new URL(`/api/bcs/v1/contacts?batch=${imported.batchId}`,request.url),{headers:{Authorization:`Bearer ${token}`}}));if('batch' in batch&&batch.batch.rejected_rows>0)return {imported,errors:batch.errors,saved:false};}
    return authorized(request,'mappings.manage',async(c,s)=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,26))',[`${s.company_id}:${s.portal_id}:${b.connection}`]);
      const current=(await c.query("SELECT cursor_reference FROM bcs.connector_sync_checkpoints WHERE company_id=$1 AND portal_id=$2 AND connection_id=$3 AND entity_type='recipient' FOR UPDATE",[s.company_id,s.portal_id,b.connection])).rows[0]?.cursor_reference??'';
      if(current!==source.checkpoint)throw new ReadError(409,'CONNECTOR_CHECKPOINT_CHANGED');
      if(s.company_id!==source.scope.company_id||s.portal_id!==source.scope.portal_id)throw new ReadError(403,'CONTEXT_CHANGED');
      await c.query("INSERT INTO bcs.connector_sync_checkpoints(company_id,portal_id,connection_id,entity_type,cursor_reference,last_success_at) VALUES($1,$2,$3,'recipient',$4,now()) ON CONFLICT(company_id,portal_id,connection_id,entity_type) DO UPDATE SET cursor_reference=excluded.cursor_reference,last_success_at=now()",[s.company_id,s.portal_id,b.connection,result.next]);
      await c.query("INSERT INTO bcs.integration_event_receipts(company_id,portal_id,source_event_key,source_event_kind,payload_sha256,status,processed_at) VALUES($1,$2,$3,'connector.sync',$4,'processed',now()) ON CONFLICT(company_id,portal_id,source_event_key) DO NOTHING",[s.company_id,s.portal_id,`connector:${hash}`,hash]);
      await c.query("UPDATE bcs.portal_connections SET last_connectivity_test_at=now() WHERE company_id=$1 AND portal_id=$2 AND id=$3",[s.company_id,s.portal_id,b.connection]);
      await c.query("INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference,safe_metadata) VALUES($1,$2,$3,'connector.sync','connection',$4,$5)",[s.company_id,s.portal_id,s.principal_id,b.connection,{read:result.read}]);
      return {imported,read:result.read,checkpoint:result.next,saved:true};
    });
  }finally{await adapter.close();}
}
