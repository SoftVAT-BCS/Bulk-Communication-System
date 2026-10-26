// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { batchSizes, intervals, validatePolicy, effectiveLimit, estimateDuration } from '../packages/contracts/src/dispatch-policy';
import { syntheticFixture } from '../apps/worker/src/fixture';
import { claim, complete, controlCampaign, tick, type SimulationState } from '../apps/worker/src/simulation-engine';
import { FixtureStore } from '../apps/worker/src/fixture-store';
import { resolveMembership, requireTenantScope } from '../apps/web/src/server/tenant-context';
const now = Date.parse('2026-10-19T10:00:00Z');
function single(count=11,batch=5) {
  const s=syntheticFixture(count,batch,now);s.accounts=s.accounts.slice(0,1);s.dispatch_jobs=s.dispatch_jobs.filter(j=>j.companyId===s.accounts[0].id);s.recipients=s.recipients.filter(r=>r.companyId===s.accounts[0].id);return s;
}
function memory(s:SimulationState) {return {async transaction<T>(fn:(s:SimulationState)=>T){return fn(s);}};}
function store(s:SimulationState){const path=resolve('.local/saas-simulation',`test-${randomUUID()}.json`);const db=new FixtureStore(path);db.initialize(s);return db;}
describe('simulation dispatch policy',()=>{
  it.each(batchSizes)('independently addresses exact and remainder batches of %i',async batch=>{
    for(const count of [0,1,batch,batch*2,batch*2+1]){
      const s=single(count,batch);let time=now;
      for(let n=0;n<Math.ceil(count/batch)+1;n++){const result=await tick(memory(s),time);expect(result.claimed).toBeLessThanOrEqual(batch);time+=5000;}
      expect(s.receipts).toHaveLength(count);expect(new Set(s.receipts.map(r=>r.jobId)).size).toBe(count);
      expect(s.receipts.every(r=>r.outcome==='simulated'&&!r.to.includes(','))).toBe(true);
      expect(estimateDuration(count,syntheticFixture(1,batch,now).dispatch_jobs[0].policy)).toBe(Math.max(0,Math.ceil(count/batch)-1)*5);
    }
  });
  it.each(intervals)('paces durable batch starts at %i seconds',async interval=>{
    const s=single(2,1);s.dispatch_jobs.forEach(j=>{j.policy.intervalSeconds=interval;});
    await tick(memory(s),now);await tick(memory(s),now+interval*1000-1);expect(s.receipts).toHaveLength(1);
    await tick(memory(s),now+interval*1000);expect(s.receipts).toHaveLength(2);
  });
  it('validates custom bounds, all numeric limits, timezone and start instant',()=>{
    const p=single(1).dispatch_jobs[0].policy;
    expect(validatePolicy({...p,intervalSeconds:17}).intervalSeconds).toBe(17);
    for(const patch of [{mode:'ses'},{batchSize:2},{intervalSeconds:4},{intervalSeconds:601},{dailyLimit:0},{maxConcurrency:51},{maxAttempts:22},{backoffSeconds:1000},{startAt:'tomorrow'},{timezone:'Not/AZone'}]) expect(()=>validatePolicy({...p,...patch})).toThrow();
    expect(()=>validatePolicy(p,{minIntervalSeconds:0,maxIntervalSeconds:600})).toThrow();
    expect(()=>effectiveLimit('foreign',single(1).accounts[0].subscription,100,now)).toThrow();
  });
  it('honors scheduled starts without browser timers',async()=>{
    const s=single(1);s.dispatch_jobs[0].policy.startAt=new Date(now+60000).toISOString();
    expect((await tick(memory(s),now)).claimed).toBe(0);expect((await tick(memory(s),now+60000)).simulated).toBe(1);
  });
});
describe('tenant and queue safeguards',()=>{
  it('caps campaign totals independently of available subscription quota',async()=>{
    const s=single(10,5);s.dispatch_jobs.forEach(j=>{j.policy.campaignLimit=2;});
    await tick(memory(s),now);await tick(memory(s),now+5000);expect(s.receipts).toHaveLength(2);
  });
  it('holds concurrency reservations until completion and honors company rate',()=>{
    const s=single(10,10);s.accounts[0].maxConcurrency=2;s.accounts[0].ratePerSecond=1;
    expect(claim(s,now)).toHaveLength(1);expect(claim(s,now+5000)).toHaveLength(1);expect(claim(s,now+10000)).toHaveLength(0);
    expect(s.quota_reservations.filter(r=>r.state==='held')).toHaveLength(2);
  });
  it('does not dispatch for an expired subscription or suspended company',async()=>{
    const s=single(1);s.accounts[0].subscription.endsAt=now;expect((await tick(memory(s),now)).claimed).toBe(0);
    s.accounts[0].subscription.endsAt=now+86400000;s.accounts[0].active=false;expect((await tick(memory(s),now)).claimed).toBe(0);
  });
  it('rolls a UTC daily limit forward without resetting subscription usage',async()=>{
    const s=single(2,1);s.accounts[0].dailyLimit=1;s.accounts[0].subscription.endsAt=now+172800000;
    await tick(memory(s),now);await tick(memory(s),now+5000);expect(s.receipts).toHaveLength(1);
    await tick(memory(s),now+86400000);expect(s.receipts).toHaveLength(2);
  });
  it('preserves single company mapping and requires an explicit valid multiple membership',()=>{
    const a={id:'a',company_id:'11111111-1111-4111-8111-111111111111'},b={id:'b',company_id:'22222222-2222-4222-8222-222222222222'};
    expect(resolveMembership([a])).toEqual(a);expect(()=>resolveMembership([a,b])).toThrow('COMPANY_SELECTION_REQUIRED');
    expect(resolveMembership([a,b],b.company_id)).toEqual(b);expect(()=>resolveMembership([a],b.company_id)).toThrow();
    expect(()=>resolveMembership([],a.company_id)).toThrow();
  });
  it('denies cross-company, foreign portal, missing permissions and suspended scope',()=>{
    const c={companyId:'a',portalId:'p',active:true,permissions:['queue.manage']};
    requireTenantScope(c,{companyId:'a',portalId:'p'},'queue.manage');
    for(const r of [{companyId:'b',portalId:'p'},{companyId:'a',portalId:'q'}])expect(()=>requireTenantScope(c,r,'queue.manage')).toThrow();
    expect(()=>requireTenantScope({...c,active:false},c,'queue.manage')).toThrow();
    expect(()=>requireTenantScope(c,c,'access.manage')).toThrow();
  });
  it('keeps company quotas isolated and refuses unauthorized portals',async()=>{
    const s=syntheticFixture(3,5,now);s.accounts[0].dailyLimit=1;s.accounts[1].dailyLimit=2;
    await tick(memory(s),now);expect(s.receipts.filter(r=>r.companyId==='synthetic-a')).toHaveLength(1);expect(s.receipts.filter(r=>r.companyId==='synthetic-b')).toHaveLength(2);
    s.accounts[1].active=false;await tick(memory(s),now+5000);expect(s.receipts).toHaveLength(3);
  });
  it('excludes suppressed, unsubscribed, inactive and missing-evidence recipients',async()=>{
    const s=single(4);s.recipients[0].suppressed=true;s.recipients[1].subscribed=false;s.recipients[2].status='Inactive';s.recipients[3].evidence=false;
    expect((await tick(memory(s),now)).simulated).toBe(0);expect(s.dispatch_jobs.every(j=>j.state==='excluded')).toBe(true);
  });
  it('revalidates eligibility after a claim',()=>{
    const s=single(1);const [j]=claim(s,now);s.recipients[0].suppressed=true;
    expect(complete(s,j,now+1)).toBe(false);expect(s.receipts).toHaveLength(0);expect(s.quota_reservations[0].state).toBe('released');
  });
  it('personalizes each message and escapes HTML',async()=>{
    const s=single(2);s.recipients[0].name='<Alice>';await tick(memory(s),now);
    expect(s.receipts[0].html).toContain('&lt;Alice&gt;');expect(s.receipts[1].subject).toContain('Learner 1');expect(s.receipts[0].subject).not.toBe(s.receipts[1].subject);
  });
  it('rejects unsafe personalization rather than producing a fake success',async()=>{
    const s=single(1);s.dispatch_jobs[0].html='<a title="{{student_name}}">link</a>';await tick(memory(s),now);
    expect(s.dispatch_jobs[0].state).toBe('dead_letter');expect(s.receipts).toHaveLength(0);
  });
  it('reserves quotas atomically across concurrent workers',async()=>{
    const s=single(20,10);s.accounts[0].subscription.limit=7;const db=store(s);
    await Promise.all([tick(db,now),tick(new FixtureStore(db.path),now),tick(new FixtureStore(db.path),now)]);
    const result=await db.transaction(s=>structuredClone(s));expect(result.receipts).toHaveLength(7);
    expect(result.quota_reservations.filter(r=>r.state==='consumed')).toHaveLength(7);expect(new Set(result.receipts.map(r=>r.jobId)).size).toBe(7);
  });
  it('recovers persisted leases after restart and rejects stale fencing tokens',async()=>{
    const db=store(single(1));const [old]=await db.transaction(s=>claim(s,now,1000));
    const restarted=new FixtureStore(db.path);await restarted.transaction(s=>claim(s,now+1001));
    const [fresh]=await restarted.transaction(s=>claim(s,now+6001));expect(fresh.token).not.toBe(old.token);
    expect(await restarted.transaction(s=>complete(s,old,now+6002))).toBe(false);
    expect(await restarted.transaction(s=>complete(s,fresh,now+6002))).toBe(true);
    expect(await restarted.transaction(s=>complete(s,fresh,now+6003))).toBe(false);
  });
  it('bounds retry backoff and dead letters exhausted attempts',async()=>{
    const s=single(1);s.dispatch_jobs[0].failuresBeforeSuccess=10;
    await tick(memory(s),now);expect(s.dispatch_jobs[0].availableAt).toBe(now+5000);
    await tick(memory(s),now+5000);expect(s.dispatch_jobs[0].availableAt).toBe(now+15000);
    await tick(memory(s),now+15000);expect(s.dispatch_jobs[0].state).toBe('dead_letter');expect(s.receipts).toHaveLength(0);
  });
  it('pauses, resumes and cancels while refusing outstanding lease completion',()=>{
    const s=single(2,1);const [j]=claim(s,now);const args=['synthetic-a','synthetic-a-portal','demo-campaign'] as const;
    controlCampaign(s,...args,'pause');expect(complete(s,j,now+1)).toBe(false);expect(claim(s,now+5000)).toHaveLength(0);
    controlCampaign(s,...args,'resume');const [next]=claim(s,now+5000);expect(next).toBeDefined();controlCampaign(s,...args,'cancel');
    expect(complete(s,next,now+5001)).toBe(false);expect(s.dispatch_jobs.every(j=>j.state==='cancelled')).toBe(true);
    expect(()=>controlCampaign(s,...args,'resume')).toThrow('CAMPAIGN_CANCELLED');
    expect(()=>controlCampaign(s,'foreign',args[1],args[2],'pause')).toThrow('CAMPAIGN_NOT_FOUND');
  });
  it('does not call network dispatch, even when fetch is available',async()=>{
    const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
    try {await tick(memory(single(1)),now);expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
    expect(readFileSync('apps/worker/src/main.ts','utf8')).not.toContain('DATABASE_URL');
  });
  it('runs independent Node processes against one durable fixture without duplicate receipts',async()=>{
    const name=`process-${randomUUID()}`;const db=new FixtureStore(resolve('.local/saas-simulation',`${name}.json`));const fixture=single(11);fixture.accounts[0].subscription.startsAt=0;fixture.accounts[0].subscription.endsAt=Date.now()+86400000;fixture.dispatch_jobs.forEach(j=>{j.availableAt=0;j.policy.startAt='1970-01-01T00:00:00Z';});db.initialize(fixture);
    const run=promisify(execFile);
    await Promise.all([run(process.execPath,['apps/worker/src/main.ts','once',name]),run(process.execPath,['apps/worker/src/main.ts','once',name])]);
    const result=await db.transaction(s=>s.receipts);expect(result).toHaveLength(5);expect(new Set(result.map(r=>r.jobId)).size).toBe(5);
  });
  it('refuses duplicate fixture imports, real addresses and overwriting a fixture',()=>{
    const s=single(1),db=store(s);expect(()=>db.initialize(s)).toThrow();
    s.dispatch_jobs.push({...s.dispatch_jobs[0]});expect(()=>store(s)).toThrow('DUPLICATE_JOB');
    const other=single(1);other.recipients[0].email='real@example.com';expect(()=>store(other)).toThrow('SYNTHETIC_ADDRESSES_REQUIRED');
  });
});
