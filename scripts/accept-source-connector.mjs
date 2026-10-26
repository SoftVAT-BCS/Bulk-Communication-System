import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {openSource} from '../apps/web/src/server/connector-adapters.ts';
if(process.env.BCS_ISOLATED_ACCEPTANCE!=='I_CONFIRM_DISPOSABLE_LOCAL_DATABASE'||!process.env.BCS_ISOLATED_CONNECTOR_FILE){console.error('BLOCKED: isolated connector configuration required; no connection attempted.');process.exit(2);}
const c=JSON.parse(readFileSync(process.env.BCS_ISOLATED_CONNECTOR_FILE,'utf8'));
assert(c.syntheticOnly===true&&['postgresql','mysql','mssql'].includes(c.engine)&&c.host==='127.0.0.1'&&c.database==='bcs_connector_isolated'&&Number(c.port)>=1024&&c.views.length===1&&c.views[0]==='contacts','Only explicitly disposable synthetic connector sources are allowed');
const adapter=await openSource({...c,password:process.env[c.passwordEnv]??'',ca:readFileSync(c.caFile,'utf8')});
try{const cols=await adapter.discover();assert(cols.some(x=>x.column==='target_id'));const rows=await adapter.read('contacts','target_id','');assert.equal(rows.length,2);assert(rows.every(r=>String(r.email).endsWith('@example.invalid')));assert.deepEqual(rows.map(r=>r.target_id),['00001','00002']);const next=await adapter.read('contacts','target_id','00001');assert.equal(next.length,1);assert.equal(next[0].target_id,'00002');console.log(`PASS: ${c.engine} isolated TLS discovery and cursor reads; no source writes`);}finally{await adapter.close();}
