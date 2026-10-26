import type { DispatchPolicy } from '../../../packages/contracts/src/dispatch-policy.ts';
import type { SimulationState } from './simulation-engine.ts';
export function syntheticFixture(count = 11, batchSize = 5, now = Date.now()): SimulationState {
  const policy: DispatchPolicy = {mode:'simulation',batchSize,intervalSeconds:5,ratePerSecond:50,dailyLimit:1000,campaignLimit:1000,subscriptionLimit:1000,maxConcurrency:50,maxAttempts:3,backoffSeconds:5,maxBackoffSeconds:60,startAt:new Date(now).toISOString(),timezone:'UTC'};
  const state: SimulationState = {format:'bcs-synthetic-simulation-v1',accounts:[],recipients:[],dispatch_jobs:[],receipts:[],quota_reservations:[],nextBatchAt:{},controls:{}};
  for (const companyId of ['synthetic-a','synthetic-b']) {
    const portalId = `${companyId}-portal`;
    state.accounts.push({id:companyId,active:true,portals:[portalId],dailyLimit:1000,ratePerSecond:50,maxConcurrency:50,subscription:{companyId,state:'trial',limit:1000,startsAt:now-1000,endsAt:now+86400000}});
    for (let i=0;i<count;i++) {
      const id = `${companyId}-${i}`;
      state.recipients.push({id,companyId,portalId,email:`learner-${i}@${companyId}.invalid`,name:`Learner ${i}`,course:'Synthetic course',batch:'Demo batch',status:'Active',subscribed:true,evidence:true,suppressed:false});
      state.dispatch_jobs.push({id,companyId,portalId,campaignId:'demo-campaign',recipientId:id,subject:'Hello {{student_name}}',html:'<p>{{student_name}} — {{course_name}}</p>',policy:{...policy},availableAt:now,state:'pending',attempts:0});
    }
  }
  return state;
}
