import { beforeEach, expect, it, vi } from 'vitest';
import { syntheticFixture } from '../apps/worker/src/fixture';
const harness = vi.hoisted(()=>({query:vi.fn(),denied:false}));
vi.mock('server-only',()=>({}));
vi.mock('../apps/web/src/server/app-service',()=>({
  authorized:async (_r:Request,permission:string,work:(c:unknown,s:unknown)=>Promise<unknown>)=>{
    if(permission!=='campaigns.schedule'||harness.denied)throw Error('PERMISSION_DENIED');
    return work({query:harness.query},{company_id:'company-a',portal_id:'portal-a',principal_id:'principal-a'});
  },jsonBody:(r:Request)=>r.json()
}));
import { saveSimulationPolicy } from '../apps/web/src/server/simulation-policy';
const id='11111111-1111-4111-8111-111111111111';
function request(patch:object={}){return new Request('http://127.0.0.1:3000/api/bcs/app/simulation-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,revision:1,policy:syntheticFixture(1).dispatch_jobs[0].policy,...patch})});}
beforeEach(()=>{harness.query.mockReset();harness.denied=false;});
it('does not access data after authorization denial',async()=>{harness.denied=true;await expect(saveSimulationPolicy(request())).rejects.toThrow('PERMISSION_DENIED');expect(harness.query).not.toHaveBeenCalled();});
it('fails closed when the proposed delta is not applied',async()=>{harness.query.mockResolvedValueOnce({rows:[{ready:false}]});await expect(saveSimulationPolicy(request())).rejects.toThrow('SIMULATION_MIGRATION_NOT_APPLIED');expect(harness.query).toHaveBeenCalledTimes(1);});
it('rejects tenant injection and unsupported batch sizes before mutation',async()=>{
  await expect(saveSimulationPolicy(request({companyId:'foreign'}))).rejects.toThrow('INVALID_POLICY_REQUEST');
  await expect(saveSimulationPolicy(request({policy:{...syntheticFixture(1).dispatch_jobs[0].policy,batchSize:2}}))).rejects.toThrow('INVALID_BATCH_SIZE');
  expect(harness.query).not.toHaveBeenCalled();
});
it('binds scope from the session and records a disabled-dispatch policy audit',async()=>{
  harness.query.mockResolvedValueOnce({rows:[{ready:true}]}).mockResolvedValueOnce({rowCount:1,rows:[{id,revision:2}]}).mockResolvedValueOnce({rows:[]});
  await expect(saveSimulationPolicy(request())).resolves.toEqual({id,revision:2,saved:true,dispatchEnabled:false});
  const [sql,args]=harness.query.mock.calls[1];expect(sql).toContain("state='draft'");expect(sql).toContain('company_id=$1 AND portal_id=$2');expect(args.slice(0,3)).toEqual(['company-a','portal-a',id]);
});
it('rejects foreign, stale and non-draft records with the same safe error',async()=>{
  harness.query.mockResolvedValueOnce({rows:[{ready:true}]}).mockResolvedValueOnce({rowCount:0,rows:[]});
  await expect(saveSimulationPolicy(request())).rejects.toThrow('DRAFT_UNAVAILABLE_OR_REVISION_CONFLICT');expect(harness.query).toHaveBeenCalledTimes(2);
});
