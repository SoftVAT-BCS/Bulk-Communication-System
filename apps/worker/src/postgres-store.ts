import { Pool,type PoolClient } from 'pg';
import { validatePolicy } from '../../../packages/contracts/src/dispatch-policy.ts';
import type { SimulationState,Store,SimulationJob } from './simulation-engine.ts';
export function isolatedWorkerURL(value:string){
  const u=new URL(value);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||u.pathname!=='/bcs_consolidated_isolated'||u.username!=='bcs_simulation_worker'||!u.password||!u.port||Number(u.port)<1024||u.search||u.hash)throw Error('ISOLATED_WORKER_DATABASE_REQUIRED');return u.toString();
}
const epoch=(value:unknown)=>new Date(String(value)).getTime();
/** Production-shaped adapter, deliberately restricted to a disposable local database. */
export class PostgresSimulationStore implements Store {
  readonly pool:Pool; readonly company:string;
  constructor(url:string,company:string){if(!/^[a-f0-9-]{36}$/i.test(company))throw Error('EXPLICIT_COMPANY_REQUIRED');this.company=company;this.pool=new Pool({connectionString:isolatedWorkerURL(url),max:2,connectionTimeoutMillis:3000,query_timeout:8000});this.pool.on('error',()=>{});}
  async close(){await this.pool.end();}
  async transaction<T>(work:(s:SimulationState)=>T):Promise<T>{
    const c=await this.pool.connect();let discard=false;
    try{
      await c.query('BEGIN');await c.query("SET LOCAL TIME ZONE 'UTC'");await c.query("SET LOCAL statement_timeout='7000ms'");
      const safe=(await c.query("SELECT current_database()='bcs_consolidated_isolated' AND current_user='bcs_simulation_worker' AND NOT(rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication) AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS safe FROM pg_roles r WHERE rolname=current_user")).rows[0]?.safe;if(!safe)throw Error('UNSAFE_WORKER_ROLE');
      await c.query("SELECT set_config('bcs.simulation_company',$1,true)",[this.company]);await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,23))',[this.company]);
      const s=await this.load(c);const before=structuredClone(s);const value=work(s);await this.save(c,before,s);await c.query('COMMIT');return value;
    }catch(e){try{await c.query('ROLLBACK');}catch{discard=true;}throw e;}finally{c.release(discard);}
  }
  private async load(c:PoolClient):Promise<SimulationState>{
    const account=(await c.query("SELECT co.id,co.status,s.state,s.begins_at,s.ends_at,p.plan_limits FROM bcs.companies co JOIN bcs.company_subscriptions s ON s.company_id=co.id AND s.state IN ('active','trial') JOIN bcs.saas_plans p ON p.plan_code=s.plan_code AND p.status='active' WHERE co.id=$1 AND s.begins_at<=now() AND s.ends_at>now()",[this.company])).rows;if(account.length!==1)throw Error('ACTIVE_BOUNDED_SUBSCRIPTION_REQUIRED');
    const a=account[0],limits=a.plan_limits;
    for(const key of ['simulation_daily','simulation_period','simulation_rate','simulation_concurrency'])if(!Number.isSafeInteger(limits[key])||limits[key]<1)throw Error('APPROVED_PLAN_LIMITS_REQUIRED');
    const rows=(await c.query(`SELECT j.*,m.portal_id,m.subject_snapshot,m.html_snapshot,m.simulation_receipt,m.campaign_recipient_id,c.simulation_policy,c.state campaign_state,c.communication_class,c.approved_revision,c.approved_by,c.created_by,po.status portal_status,r.name,r.email,r.recipient_group,r.category,r.status recipient_status,cr.recipient_id,cr.email_normalized snapshot_email,
      EXISTS(SELECT 1 FROM bcs.recipient_preferences p WHERE p.company_id=m.company_id AND p.portal_id=m.portal_id AND p.recipient_id=cr.recipient_id AND p.communication_category=c.communication_class AND p.preference='subscribed' AND p.legal_basis IS NOT NULL AND nullif(btrim(p.evidence_ref),'') IS NOT NULL) consent,
      EXISTS(SELECT 1 FROM bcs.email_suppressions es WHERE es.company_id=m.company_id AND es.email_normalized=r.email_normalized AND es.is_active) suppressed
      FROM bcs.dispatch_jobs j JOIN bcs.outbound_messages m ON m.company_id=j.company_id AND m.id=j.message_id JOIN bcs.campaigns c ON c.company_id=m.company_id AND c.portal_id=m.portal_id AND c.id=m.campaign_id JOIN bcs.portals po ON po.company_id=c.company_id AND po.id=c.portal_id JOIN bcs.campaign_recipients cr ON cr.company_id=m.company_id AND cr.portal_id=m.portal_id AND cr.id=m.campaign_recipient_id LEFT JOIN bcs.recipients r ON r.company_id=cr.company_id AND r.portal_id=cr.portal_id AND r.id=cr.recipient_id WHERE j.company_id=$1 AND c.simulation_policy IS NOT NULL ORDER BY j.priority,j.available_at,j.id LIMIT 1001 FOR UPDATE OF j SKIP LOCKED`,[this.company])).rows;
    const total=Number((await c.query('SELECT count(*) n FROM bcs.dispatch_jobs j JOIN bcs.campaigns c ON c.company_id=j.company_id AND c.id=j.campaign_id WHERE j.company_id=$1 AND c.simulation_policy IS NOT NULL',[this.company])).rows[0].n);if(total!==rows.length)throw Error('INCOMPLETE_LOCKED_ACCOUNTING_SNAPSHOT');
    if(rows.length>1000)throw Error('ISOLATED_WORKER_CAPACITY_1000');
    const s:SimulationState={format:'bcs-synthetic-simulation-v1',accounts:[{id:this.company,active:['active','trial'].includes(a.status),portals:[...new Set<string>(rows.filter(r=>r.portal_status==='active').map(r=>r.portal_id))],dailyLimit:limits.simulation_daily,ratePerSecond:limits.simulation_rate,maxConcurrency:limits.simulation_concurrency,subscription:{companyId:this.company,state:a.state,limit:limits.simulation_period,startsAt:epoch(a.begins_at),endsAt:epoch(a.ends_at)}}],recipients:[],dispatch_jobs:[],receipts:[],quota_reservations:[],nextBatchAt:{},controls:{}};
    for(const r of rows){
      if(r.email&&!/^[^@]+@[^@]+\.invalid$/.test(r.email))throw Error('ISOLATED_SYNTHETIC_RECIPIENTS_REQUIRED');
      const policy=validatePolicy(r.simulation_policy);
      const state:SimulationJob['state']=r.job_state==='unknown'?'dead_letter':r.job_state;
      s.dispatch_jobs.push({id:r.id,companyId:r.company_id,portalId:r.portal_id,campaignId:r.campaign_id,recipientId:r.campaign_recipient_id,subject:r.subject_snapshot,html:r.html_snapshot,policy,availableAt:epoch(r.available_at),state,attempts:r.attempt_count,token:r.lease_token??undefined,leaseExpiresAt:r.lease_expires_at?epoch(r.lease_expires_at):undefined,startedAt:r.simulation_started_at?epoch(r.simulation_started_at):undefined});
      s.recipients.push({id:r.campaign_recipient_id,companyId:r.company_id,portalId:r.portal_id,email:r.email??'missing@recipient.invalid',name:r.name??'',course:r.recipient_group??'',batch:r.category??'',status:r.email?.trim().toLowerCase()===r.snapshot_email?(r.recipient_status??'Inactive'):'Inactive',subscribed:r.consent,evidence:r.consent,suppressed:r.suppressed});
      const key=`${r.company_id}/${r.portal_id}/${r.campaign_id}`;if(r.campaign_state==='cancelled')s.controls[key]='cancelled';else if(r.is_paused||!r.approved_revision||!r.approved_by||r.approved_by===r.created_by||!['queued','sending','partial'].includes(r.campaign_state))s.controls[key]='paused';
      if(r.simulation_receipt)s.receipts.push({...r.simulation_receipt,jobId:r.id,companyId:r.company_id,portalId:r.portal_id,campaignId:r.campaign_id});
    }
    s.nextBatchAt[this.company]=Number((await c.query("SELECT setting_value->>'nextBatchAt' value FROM bcs.company_settings WHERE company_id=$1 AND setting_key='simulation.pacing'",[this.company])).rows[0]?.value??0);
    const reservations=(await c.query("SELECT reservation_key,state,created_at FROM bcs.quota_reservations WHERE company_id=$1 AND metric_code='simulation.messages' ORDER BY created_at DESC LIMIT 21001",[this.company])).rows;if(reservations.length>21000)throw Error('ISOLATED_RESERVATION_CAPACITY');
    s.quota_reservations=reservations.map(r=>({jobId:r.reservation_key.split(':')[0],token:r.reservation_key.split(':')[1],companyId:this.company,state:r.state,at:epoch(r.created_at)}));return s;
  }
  private async save(c:PoolClient,before:SimulationState,s:SimulationState){
    for(const j of s.dispatch_jobs){
      const old=before.dispatch_jobs.find(v=>v.id===j.id);if(!old||JSON.stringify(old)===JSON.stringify(j))continue;
      const updated=await c.query('UPDATE bcs.dispatch_jobs SET job_state=$3,attempt_count=$4,lease_token=$5,lease_expires_at=$6,lease_owner=$7,available_at=$8,last_error_code=$9,simulation_started_at=$10 WHERE company_id=$1 AND id=$2 AND lease_token IS NOT DISTINCT FROM $11::uuid RETURNING message_id',[this.company,j.id,j.state==='excluded'?'cancelled':j.state,j.attempts,j.token??null,j.leaseExpiresAt?new Date(j.leaseExpiresAt):null,j.token?`simulation-${process.pid}`:null,new Date(j.availableAt),j.failure??null,j.startedAt?new Date(j.startedAt):null,old.token??null]);if(updated.rowCount!==1)throw Error('STALE_WORKER_FENCE');const message=updated.rows[0].message_id;
      if(j.attempts>old.attempts)await c.query("INSERT INTO bcs.delivery_attempts(company_id,message_id,attempt_number,provider_request_key,outcome) VALUES($1,$2,$3,$4,'unknown')",[this.company,message,j.attempts,`simulation:${j.id}:${j.token}`]);
      if(j.state!=='leased'&&old.state==='leased')await c.query("UPDATE bcs.delivery_attempts SET execution_mode='simulation',simulation_result=$4,error_code=$5,retryable=$6,completed_at=now() WHERE company_id=$1 AND message_id=$2 AND attempt_number=$3",[this.company,message,j.attempts,j.state==='completed'?'simulated':j.state==='retry_wait'?'retryable_failure':'permanent_failure',j.failure??null,j.state==='retry_wait']);
      const receipt=s.receipts.find(r=>r.jobId===j.id);if(receipt&&!before.receipts.some(r=>r.jobId===j.id))await c.query('UPDATE bcs.outbound_messages SET simulation_receipt=$3,attempt_count=$4 WHERE company_id=$1 AND id=$2 AND simulation_receipt IS NULL',[this.company,message,{...receipt,attemptKey:`${j.id}:${j.attempts}`,completedAt:new Date(receipt.at).toISOString()},j.attempts]);
      await c.query("INSERT INTO bcs.audit_events(company_id,portal_id,action,entity_type,entity_reference,safe_metadata) VALUES($1,$2,$3,'dispatch_job',$4,$5)",[this.company,j.portalId,`simulation.${j.state}`,j.id,{attempt:j.attempts}]);
    }
    for(const r of s.quota_reservations){const previous=before.quota_reservations.find(v=>v.jobId===r.jobId&&v.token===r.token);if(previous?.state===r.state)continue;await c.query("INSERT INTO bcs.quota_reservations(company_id,metric_code,reservation_key,reserved_units,state) VALUES($1,'simulation.messages',$2,1,$3) ON CONFLICT(company_id,metric_code,reservation_key) DO UPDATE SET state=excluded.state",[this.company,`${r.jobId}:${r.token}`,r.state]);}
    await c.query("INSERT INTO bcs.company_settings(company_id,setting_key,setting_value) VALUES($1,'simulation.pacing',$2) ON CONFLICT(company_id,setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=now()",[this.company,{nextBatchAt:s.nextBatchAt[this.company]??0}]);
    await c.query("INSERT INTO bcs.usage_counters(company_id,metric_code,period_start,period_end,used_units,reserved_units) VALUES($1,'simulation.messages',current_date,current_date+1,$2,$3) ON CONFLICT(company_id,metric_code,period_start,period_end) DO UPDATE SET used_units=excluded.used_units,reserved_units=excluded.reserved_units,updated_at=now()",[this.company,s.receipts.filter(r=>new Date(r.at).toISOString().slice(0,10)===new Date().toISOString().slice(0,10)).length,s.quota_reservations.filter(r=>r.state==='held').length]);
  }
}
