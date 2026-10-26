import 'server-only';
import { authorized, jsonBody } from './app-service';
import { ReadError, uuid } from './validation';
import { validatePolicy, PolicyError } from '../../../../packages/contracts/src/dispatch-policy';

/** Opt-in save only. An unapplied delta cannot affect the existing campaign workflow. */
export function saveSimulationPolicy(request: Request) {
  return authorized(request,'campaigns.schedule',async (c,s) => {
    const b = await jsonBody(request);
    if (Object.keys(b).some(k => !['id','revision','policy'].includes(k)) || !uuid.test(String(b.id)) || !Number.isSafeInteger(b.revision)) throw new ReadError(400,'INVALID_POLICY_REQUEST');
    let policy: ReturnType<typeof validatePolicy>;
    try { policy = validatePolicy(b.policy); } catch (e) { if (e instanceof PolicyError) throw new ReadError(400,e.message); throw e; }
    const available = await c.query("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='bcs' AND table_name='campaigns' AND column_name='simulation_policy') AS ready");
    if (available.rows[0]?.ready !== true) throw new ReadError(503,'SIMULATION_MIGRATION_NOT_APPLIED');
    const result = await c.query("UPDATE bcs.campaigns SET simulation_policy=$4,revision=revision+1 WHERE company_id=$1 AND portal_id=$2 AND id=$3 AND revision=$5 AND state='draft' RETURNING id,revision",[s.company_id,s.portal_id,b.id,policy,b.revision]);
    if (result.rowCount !== 1) throw new ReadError(409,'DRAFT_UNAVAILABLE_OR_REVISION_CONFLICT');
    await c.query("INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference,safe_metadata) VALUES($1,$2,$3,'campaign.simulation_policy','campaign',$4,$5)",[s.company_id,s.portal_id,s.principal_id,b.id,{batchSize:policy.batchSize,intervalSeconds:policy.intervalSeconds,mode:'simulation'}]);
    return {...result.rows[0],saved:true,dispatchEnabled:false};
  });
}
