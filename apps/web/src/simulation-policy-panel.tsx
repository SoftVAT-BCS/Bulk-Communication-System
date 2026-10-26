"use client";
import { useState } from 'react';
import { ActionButton, FormField, SmartSelect } from '@bcs/ui';
import { batchSizes, intervals, estimateDuration, validatePolicy } from '../../../packages/contracts/src/dispatch-policy';

export function SimulationPolicyPanel({ campaigns, count, onSaved }: { campaigns: {id:string;title:string;state:string;revision:number}[]; count:number; onSaved:()=>Promise<void> }) {
  const [batch,setBatch]=useState('5'), [interval,setInterval]=useState('30'), [custom,setCustom]=useState('30'), [campaign,setCampaign]=useState('');
  const [start,setStart]=useState(''), [timezone,setTimezone]=useState('UTC'), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const seconds=Number(interval==='custom'?custom:interval);
  const candidate={mode:'simulation',batchSize:Number(batch),intervalSeconds:seconds,ratePerSecond:50,dailyLimit:1000,campaignLimit:1000,subscriptionLimit:1000,maxConcurrency:50,maxAttempts:3,backoffSeconds:5,maxBackoffSeconds:300,startAt:start,timezone};
  let validation=''; let duration:number|null=null;
  try {const p=validatePolicy(candidate);duration=estimateDuration(count,p);}catch(e){validation=e instanceof Error?e.message:'Invalid policy';}
  async function save(){
    setBusy(true);setMessage('');
    try {
      const selected=campaigns.find(c=>c.id===campaign&&c.state==='draft');if(!selected)throw Error('Select a draft campaign.');
      const policy=validatePolicy(candidate);
      const r=await fetch('/api/bcs/app/simulation-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,revision:selected.revision,policy})});
      const j=await r.json();if(!r.ok)throw Error(j.error?.code??'Policy not saved');
      await onSaved();setMessage('Simulation policy saved. Database dispatch remains disabled pending isolated acceptance.');
    }catch(e){setMessage(e instanceof Error?e.message:'Policy not saved');}finally{setBusy(false);}
  }
  return <section aria-label="Simulation dispatch policy"><h3>Simulation-only dispatch policy</h3><p className="notice">No emails are sent. Each recipient receives an independent simulated message. Saving requires the reviewed database delta; the local fixture worker is separate from campaign data. No progress or dispatch controls are shown without an accepted database worker.</p><div className="form-grid">
    <SmartSelect label="Simulation draft campaign" value={campaign||null} options={campaigns.filter(c=>c.state==='draft').map(c=>({value:c.id,label:c.title}))} onChange={v=>setCampaign(v??'')} />
    <SmartSelect label="Simulation batch size" value={batch} options={batchSizes.map(n=>({value:String(n),label:String(n)}))} onChange={v=>setBatch(v??'5')} />
    <SmartSelect label="Batch interval (seconds)" value={interval} options={[...intervals.map(n=>({value:String(n),label:String(n)})),{value:'custom',label:'Custom (5–600 seconds)'}]} onChange={v=>setInterval(v??'30')} />
    {interval==='custom'&&<FormField label="Custom interval"><input aria-label="Custom interval" className="input" type="number" min={5} max={600} value={custom} onChange={e=>setCustom(e.target.value)} /></FormField>}
    <FormField label="Start instant (ISO with UTC offset)"><input aria-label="Simulation start instant" className="input" placeholder="2026-10-20T09:00:00+05:30" value={start} onChange={e=>setStart(e.target.value)} /></FormField>
    <FormField label="Timezone"><input aria-label="Simulation timezone" className="input" value={timezone} onChange={e=>setTimezone(e.target.value)} /></FormField>
  </div><p>Planning estimate for the selected recipient snapshot ({count} recipients): {duration===null?'enter a valid start instant':`${duration} seconds minimum between first and last batch starts`}. Eligibility, quotas, retries and execution time may extend this; it is not a completion promise.</p><p>Provisional simulation caps: 50/second, 1,000/day, 1,000/campaign and subscription period, concurrency 50. Authoritative server subscription limits must further restrict these; these are not SES quotas.</p>{validation&&<p role="status">{validation}</p>}{message&&<p role="status">{message}</p>}<ActionButton disabled={busy||!!validation||!campaign} onClick={()=>void save()}>Save simulation policy</ActionButton></section>;
}
