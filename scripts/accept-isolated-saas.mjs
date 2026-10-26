// No .env loading. No production fallback. This runner never creates or drops databases.
import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { PostgresSimulationStore } from '../apps/worker/src/postgres-store.ts';
import { claim,complete,tick } from '../apps/worker/src/simulation-engine.ts';
import { syntheticFixture } from '../apps/worker/src/fixture.ts';
const confirmation='I_CONFIRM_DISPOSABLE_LOCAL_DATABASE';
if(process.env.BCS_ISOLATED_ACCEPTANCE!==confirmation||!process.env.BCS_ISOLATED_ADMIN_URL||!process.env.BCS_ISOLATED_WORKER_URL){console.error('BLOCKED: explicit disposable database confirmation and isolated admin/worker URLs required. No connection attempted.');process.exit(2);}
const adminURL=new URL(process.env.BCS_ISOLATED_ADMIN_URL),workerURL=new URL(process.env.BCS_ISOLATED_WORKER_URL);
for(const u of [adminURL,workerURL])assert(u.hostname==='127.0.0.1'&&u.pathname==='/bcs_consolidated_isolated'&&Number(u.port)>=1024&&!u.search&&!u.hash&&['postgres:','postgresql:'].includes(u.protocol),'Only a loopback disposable database is allowed');
assert.equal(adminURL.username,'bcs_isolated_owner');assert.equal(workerURL.username,'bcs_simulation_worker');assert.equal(adminURL.port,workerURL.port);
const admin=new Client({connectionString:adminURL.toString(),connectionTimeoutMillis:3000,query_timeout:10000});let first,second;
const hash=s=>createHash('sha256').update(s).digest('hex');
try{
 await admin.connect();
 assert.equal((await admin.query("SELECT current_database()='bcs_consolidated_isolated' AND current_user='bcs_isolated_owner' AND shobj_description(d.oid,'pg_database')='BCS_DISPOSABLE_SYNTHETIC_ONLY' AND r.rolsuper AS safe FROM pg_database d,pg_roles r WHERE d.datname=current_database() AND r.rolname=current_user")).rows[0]?.safe,true,'Disposable database marker and isolated owner required');
 assert.equal(Number((await admin.query('SELECT count(*) n FROM bcs.companies')).rows[0].n),0,'Target must have no companies or customer data');
 assert.deepEqual((await admin.query('SELECT version FROM bcs.schema_migrations ORDER BY version')).rows.map(r=>r.version),Array.from({length:22},(_,i)=>i+1),'Reviewed baseline 001-022 is required; this runner does not rerun it');
 for(const path of ['023_isolated_simulation_worker.sql','024_tenant_embed_and_workflows.sql','025_quotas_and_independent_review.sql'])await admin.query(readFileSync(new URL(`../database/migrations/${path}`,import.meta.url),'utf8'));
 const password=decodeURIComponent(workerURL.password);assert(password.length>=20&&!/[\r\n]/.test(password));
 await admin.query(`ALTER ROLE bcs_simulation_worker PASSWORD '${password.replaceAll("'","''")}'`);
 // Disallow PUBLIC CREATE/TEMP on this explicitly disposable target only.
 await admin.query('REVOKE CREATE,TEMPORARY ON DATABASE bcs_consolidated_isolated FROM PUBLIC');
 await admin.query('GRANT CONNECT ON DATABASE bcs_consolidated_isolated TO bcs_app_backend');
 const limits={contacts:100,users:10,portals:5,simulation_daily:100,simulation_period:100,simulation_rate:50,simulation_concurrency:5};
 await admin.query("INSERT INTO bcs.saas_plans(plan_code,plan_name,status,plan_limits) VALUES('isolated-only','Synthetic acceptance only','active',$1)",[limits]);
 const tenants=[];
 for(const code of ['isolated-a','isolated-b']){
  const co=(await admin.query("INSERT INTO bcs.companies(company_code,company_name,status) VALUES($1,$1,'active') RETURNING id",[code])).rows[0].id;
  await admin.query("INSERT INTO bcs.company_subscriptions(company_id,plan_code,state,ends_at) VALUES($1,'isolated-only','trial',now()+interval '1 day')",[co]);
  const po=(await admin.query("INSERT INTO bcs.portals(company_id,portal_code,portal_name,portal_kind,integration_mode,status) VALUES($1,'demo','Synthetic demo','other','bcs_native','active') RETURNING id",[co])).rows[0].id;
  const actor=(await admin.query("INSERT INTO bcs.principals(company_id,identity_issuer,external_subject,display_name,email) VALUES($1,'isolated','same-owner','Synthetic owner','owner@example.invalid') RETURNING id",[co])).rows[0].id;
  const role=(await admin.query("INSERT INTO bcs.roles(company_id,role_code,role_name) VALUES($1,'isolated-admin','Synthetic administrator') RETURNING id",[co])).rows[0].id;
  await admin.query('INSERT INTO bcs.role_permissions(company_id,role_id,permission_code) SELECT $1,$2,permission_code FROM bcs.permissions',[co,role]);
  await admin.query('INSERT INTO bcs.principal_role_assignments(company_id,principal_id,role_id) VALUES($1,$2,$3)',[co,actor,role]);await admin.query('INSERT INTO bcs.principal_portal_scopes(company_id,principal_id,portal_id) VALUES($1,$2,$3)',[co,actor,po]);
  const token=hash(randomUUID());await admin.query("INSERT INTO bcs.application_sessions(token_hash,company_id,portal_id,principal_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '1 hour')",[token,co,po,actor]);
  const reviewer=(await admin.query("INSERT INTO bcs.principals(company_id,identity_issuer,external_subject,display_name,email) VALUES($1,'isolated','independent-reviewer','Synthetic reviewer','reviewer@example.invalid') RETURNING id",[co])).rows[0].id;
  const policy=syntheticFixture(1,5).dispatch_jobs[0].policy;
  const campaign=(await admin.query("INSERT INTO bcs.campaigns(company_id,portal_id,campaign_code,title,communication_class,idempotency_key,state,created_by,simulation_policy) VALUES($1,$2,'synthetic','Synthetic acceptance','educational','synthetic','queued',$3,$4) RETURNING id",[co,po,actor,policy])).rows[0].id;
  await admin.query('UPDATE bcs.campaigns SET approved_revision=revision,approved_by=$2,approved_at=now() WHERE id=$1',[campaign,reviewer]);
  for(let i=0;i<7;i++){
   const email=`learner-${i}@${code}.invalid`;
   const recipient=(await admin.query("INSERT INTO bcs.recipients(company_id,portal_id,target_id,name,email,recipient_group,category,status) VALUES($1,$2,$3,$4,$5,'Synthetic course','Synthetic batch','Active') RETURNING id",[co,po,`id-${i}`,`Synthetic ${i}`,email])).rows[0].id;
   if(i!==6)await admin.query("INSERT INTO bcs.recipient_preferences(company_id,portal_id,recipient_id,communication_category,preference,legal_basis,evidence_ref) VALUES($1,$2,$3,'educational','subscribed','consent','synthetic-only')",[co,po,recipient]);
   const cr=(await admin.query("INSERT INTO bcs.campaign_recipients(company_id,portal_id,campaign_id,recipient_id,source_recipient_key,email_snapshot,eligibility_state) VALUES($1,$2,$3,$4,$4::text,$5,'eligible') RETURNING id",[co,po,campaign,recipient,email])).rows[0].id;
   const m=(await admin.query("INSERT INTO bcs.outbound_messages(company_id,portal_id,campaign_id,campaign_recipient_id,message_idempotency_key,subject_snapshot,html_snapshot,text_snapshot) VALUES($1,$2,$3,$4,$4::text,'Hello {{student_name}}','<p>{{student_name}}</p>','Hello') RETURNING id",[co,po,campaign,cr])).rows[0].id;
   await admin.query('INSERT INTO bcs.dispatch_jobs(company_id,campaign_id,message_id,is_paused) VALUES($1,$2,$3,false)',[co,campaign,m]);
  }
  tenants.push({co,po,actor,token,campaign});
 }
 const [a,b]=tenants;
 await admin.query("INSERT INTO bcs.worker_scopes(role_name,company_id) VALUES('bcs_simulation_worker',$1)",[a.co]);
 await admin.query('BEGIN');await admin.query('SET LOCAL ROLE bcs_app_backend');await admin.query("SELECT set_config('bcs.session_hash',$1,true)",[a.token]);
 assert.equal((await admin.query("SELECT bcs.session_allows($1,$2,'reports.view') allowed",[a.co,a.po])).rows[0].allowed,true);
 assert.equal((await admin.query("SELECT bcs.session_allows($1,$2,'reports.view') allowed",[b.co,b.po])).rows[0].allowed,false);
 assert.equal(Number((await admin.query('SELECT count(*) n FROM bcs.campaigns WHERE company_id=$1',[b.co])).rows[0].n),0,'Cross-tenant RLS denied');await admin.query('ROLLBACK');
 first=new PostgresSimulationStore(workerURL.toString(),a.co);second=new PostgresSimulationStore(workerURL.toString(),a.co);
 const now=Date.now();const results=await Promise.all([first.transaction(s=>claim(s,now)),second.transaction(s=>claim(s,now))]);const leases=results.flat();assert.equal(leases.length,5,'Two workers share quota/concurrency and pacing');assert.equal(new Set(leases.map(l=>l.id)).size,5);
 const stale={...leases[0],token:randomUUID()};assert.equal(await second.transaction(s=>complete(s,stale,now+1)),false,'Stale lease cannot settle');
 for(const lease of leases)assert.equal(await second.transaction(s=>complete(s,lease,now+1)),true);
 assert.equal(await first.transaction(s=>complete(s,leases[0],now+2)),false,'Receipt cannot replay');
 const more=await tick(first,now+6000);assert.equal(more.simulated,1,'Consent-free seventh recipient excluded');
 const rows=(await admin.query('SELECT simulation_receipt,provider_message_id,submitted_at,delivered_at FROM bcs.outbound_messages WHERE company_id=$1',[a.co])).rows;
 assert.equal(rows.filter(r=>r.simulation_receipt).length,6);assert(rows.every(r=>!r.provider_message_id&&!r.submitted_at&&!r.delivered_at));
 assert.equal(Number((await admin.query("SELECT count(*) n FROM bcs.quota_reservations WHERE company_id=$1 AND state='held'",[a.co])).rows[0].n),0);
 const unauthorized=new PostgresSimulationStore(workerURL.toString(),b.co);try{await assert.rejects(()=>unauthorized.transaction(()=>true));}finally{await unauthorized.close();}
 // Replay and approval gates are tested against PostgreSQL, not inferred from the unit mocks.
 await admin.query("INSERT INTO bcs.embed_grants(code_hash,company_id,portal_id,principal_id,issuer,replay_id,parent_origin,permissions,expires_at) VALUES($1,$2,$3,$4,'isolated','replay-unique','http://127.0.0.1:3200','[\"reports.view\"]',now()+interval '30 seconds')",[hash('synthetic-code'),a.co,a.po,a.actor]);
 assert.equal((await admin.query('UPDATE bcs.embed_grants SET used_at=now() WHERE code_hash=$1 AND used_at IS NULL RETURNING code_hash',[hash('synthetic-code')])).rowCount,1);
 assert.equal((await admin.query('UPDATE bcs.embed_grants SET used_at=now() WHERE code_hash=$1 AND used_at IS NULL RETURNING code_hash',[hash('synthetic-code')])).rowCount,0);
 await admin.query('BEGIN');await admin.query("SELECT set_config('bcs.session_hash',$1,true)",[a.token]);await admin.query("UPDATE bcs.campaigns SET state='review' WHERE id=$1",[a.campaign]);await assert.rejects(()=>admin.query("SELECT bcs.review_campaign($1,1,'approve','')",[a.campaign]));await admin.query('ROLLBACK');
 console.log('PASS: migrations 023-025, two-tenant RLS, two workers, fencing, quota reservations, consent exclusion, replay rejection, self-review denial, truthful simulation receipts. Synthetic database retained for review.');
}catch(error){console.error('FAIL: isolated acceptance stopped; database retained. SQLSTATE:',error?.code??'ASSERTION_OR_PREFLIGHT');process.exitCode=1;}
finally{await first?.close();await second?.close();await admin.end().catch(()=>{});}
