// No apply action is inferred. Requires separately issued owner approval and restore evidence.
const fs=require('node:fs');const path=require('node:path');const {parseEnv}=require('node:util');
const {inspect,sha,root}=require('./bcs-integration-preflight.cjs');
async function run(){
 if(process.cwd().toLowerCase()!==root.toLowerCase())throw Error('WORKSPACE_MISMATCH');
 const manifestBytes=fs.readFileSync('database/deployment/bcs-dev-022-026/manifest.json'),manifest=JSON.parse(manifestBytes);
 const scripts=manifest.entries.map(e=>{if(sha(fs.readFileSync(e.source))!==e.sourceSha256||sha(fs.readFileSync(e.variant))!==e.variantSha256)throw Error('SOURCE_HASH_MISMATCH');return fs.readFileSync(e.variant,'utf8');});
 if(process.argv[2]!=='--apply'){console.log(JSON.stringify({dryRun:true,packageHash:sha(manifestBytes),versions:manifest.entries.map(e=>e.version),sourceIntegrity:true,writes:false,requires:['owner approval','verified backup and independent restore','fresh schema fingerprint','010 provenance approval','isolated acceptance evidence'],worker:'NOLOGIN',embedding:'DENY_ALL'}));return;}
 // All evidence lives in ignored private local storage; no secret or evidence content is printed.
 const approval=JSON.parse(fs.readFileSync('.local/bcs-deployment-approval.json','utf8'));
 const cfg=parseEnv(fs.readFileSync('.local/bcs-admin.env','utf8'));
 if(approval.authorization!=='BCS_DEV_022_026_OWNER_APPROVED'||approval.packageHash!==sha(manifestBytes)||approval.targetProjectReference!==cfg.BCS_ADMIN_PROJECT_REF||!approval.approvedBy||!approval.approvedAt||Date.now()-Date.parse(approval.approvedAt)>3600000||Date.parse(approval.approvedAt)>Date.now()||!Number.isFinite(Date.parse(approval.approvedAt)))throw Error('FRESH_EXPLICIT_APPROVAL_REQUIRED');
 for(const name of ['backup','restoreProof','isolatedAcceptanceProof']){const evidence=approval[name];if(!evidence||!path.isAbsolute(evidence.path)||!fs.statSync(evidence.path).isFile()||sha(fs.readFileSync(evidence.path))!==evidence.sha256)throw Error('VERIFIED_BACKUP_RESTORE_ACCEPTANCE_REQUIRED');}
 if(approval.migration010SourceSha256!==sha(fs.readFileSync('database/proposals/010_recipient_reader_PENDING_APPROVAL.sql'))||approval.migration010ProvenanceAccepted!==true)throw Error('MIGRATION_010_PROVENANCE_REQUIRED');
 let c;try{c=await require(path.join(root,'.local/bcs-connect.cjs'))();await c.query('BEGIN');await c.query("SET LOCAL search_path=pg_catalog");await c.query("SET LOCAL lock_timeout='3s'");await c.query("SET LOCAL statement_timeout='30s'");
 const identity=(await c.query("SELECT current_database()='postgres' AND current_user='postgres' valid")).rows[0];if(!identity.valid)throw Error('IDENTITY_MISMATCH');
 if(!(await c.query("SELECT pg_try_advisory_xact_lock(hashtextextended('bcs-reviewed-deployment',0)) locked")).rows[0].locked)throw Error('DEPLOYMENT_LOCK_BUSY');
 const state=await inspect(c);if(sha(JSON.stringify(state))!==approval.schemaFingerprint||state.ledger.map(r=>r.version).join(',')!==Array.from({length:21},(_,i)=>i+1).join(',')||state.tables.some(t=>!t.relforcerowsecurity)||state.roles.some(r=>r.rolname==='bcs_simulation_worker'))throw Error('BASELINE_DRIFT');
 const missingPlans=await c.query("SELECT count(*) AS missing FROM bcs.companies c WHERE c.status IN ('active','trial') AND NOT EXISTS(SELECT 1 FROM bcs.company_subscriptions s JOIN bcs.saas_plans p ON p.plan_code=s.plan_code AND p.status='active' WHERE s.company_id=c.id AND s.state IN ('active','trial') AND s.begins_at<=now() AND s.ends_at>now() AND p.plan_limits ?& ARRAY['contacts','users','portals'] AND (p.plan_limits->>'contacts') ~ '^[1-9][0-9]*$' AND (p.plan_limits->>'users') ~ '^[1-9][0-9]*$' AND (p.plan_limits->>'portals') ~ '^[1-9][0-9]*$')");if(Number(missingPlans.rows[0].missing)!==0)throw Error('APPROVED_RESOURCE_PLANS_REQUIRED');
 const importPermission=await c.query("SELECT 1 FROM bcs.permissions WHERE permission_code='recipients.import'");if(importPermission.rowCount!==1)throw Error('IMPORT_PERMISSION_MISSING');
 await c.query("SELECT set_config('bcs.deployment_approval',$1,true),set_config('bcs.verified_backup_sha256',$2,true)",[approval.authorization,approval.backup.sha256]);
 for(const sql of scripts)await c.query(sql);
 const after=await inspect(c);if(after.ledger.map(r=>r.version).join(',')!==Array.from({length:26},(_,i)=>i+1).join(',')||after.tables.some(t=>!t.relforcerowsecurity))throw Error('POSTFLIGHT_FAILED');
 const disabled=await c.query("SELECT NOT rolcanlogin disabled FROM pg_roles WHERE rolname='bcs_simulation_worker'");if(disabled.rows[0]?.disabled!==true)throw Error('WORKER_MUST_REMAIN_DISABLED');
 await c.query('COMMIT');console.log(JSON.stringify({committed:true,versions:[22,23,24,25,26],worker:'NOLOGIN',embedding:'DENY_ALL',sending:false}));
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});throw e;}finally{if(c)await c.end();}
}
run().catch(e=>{console.error(JSON.stringify({error:/^[A-Z_]+$/.test(e.message)?e.message:e.code||'DEPLOYMENT_REFUSED'}));process.exitCode=1;});
