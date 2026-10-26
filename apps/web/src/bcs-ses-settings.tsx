"use client";
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Panel, SmartSelect } from '@bcs/ui';

type Provider = { id: string; account_code: string; aws_region: string; credential_secret_ref: string|null; account_status: string; verified_max_send_rate: number|null; verified_max_24h: number|null };
type Identity = { id:string; provider_account_id:string; identity_type:string; identity_value:string; display_name:string|null; provider_verified:boolean; spf_status:string; dkim_status:string; dmarc_status:string };
type Policy = { id:string; portal_id:string; provider_account_id:string; policy_name:string; configured_rate_per_second:number|null; configured_daily_budget:number|null; max_retries:number; is_enabled:boolean };
type Data = { providers:Provider[]; identities:Identity[]; policies:Policy[]; portals:{id:string;portal_name:string}[] };
const regions=[{value:'ap-south-1',label:'Asia Pacific (Mumbai)'},{value:'ap-south-2',label:'Asia Pacific (Hyderabad)'},{value:'us-east-1',label:'US East (N. Virginia)'},{value:'eu-west-1',label:'Europe (Ireland)'}];
export function BcsSesSettings() {
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
  const [action,setAction]=useState<'provider'|'identity'|'policy'>('provider');
  const [id,setId]=useState('');
  const [form,setForm]=useState({code:'',region:'ap-south-1',secret:'',provider:'',portal:'',type:'email',value:'',name:'',rate:'1',daily:'100',retries:'3'});
  const load=useCallback(async()=>{
    const r=await fetch('/api/bcs/app/configuration?kind=ses',{cache:'no-store'});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error?.code??'SES_SETTINGS_UNAVAILABLE');setData(j.data as Data);
  },[]);
  useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Not available'));},[load]);
  const update=(key:keyof typeof form,value:string)=>setForm(f=>({...f,[key]:value}));
  function editProvider(p:Provider){setAction('provider');setId(p.id);setForm(f=>({...f,code:p.account_code,region:p.aws_region,secret:p.credential_secret_ref??''}));}
  function editPolicy(p:Policy){setAction('policy');setId(p.id);setForm(f=>({...f,provider:p.provider_account_id,portal:p.portal_id,name:p.policy_name,rate:String(p.configured_rate_per_second??'1'),daily:String(p.configured_daily_budget??'100'),retries:String(p.max_retries)}));}
  function clear(){setId('');setForm({code:'',region:'ap-south-1',secret:'',provider:'',portal:'',type:'email',value:'',name:'',rate:'1',daily:'100',retries:'3'});}
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{
    const r=await fetch('/api/bcs/app/configuration',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({kind:'ses',action,id,...form})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(String(j.error?.code??'SES_SETTINGS_NOT_SAVED'));
    await load();setNotice('Stored as BCS configuration metadata. No sender was verified and no email was sent.');clear();
  }catch(e){setError(e instanceof Error?e.message:'Not saved');}finally{setBusy(false);}}
  const ident=data?.identities[0];
  return <div className="bcs-admin-grid">
    <Panel title="Amazon SES & sender configuration" subtitle="Provider controls, sending policies and verified identity metadata">
      <form className="card-body bcs-admin-form" onSubmit={save}>
        <SmartSelect label="Configuration operation" options={[{value:'provider',label:'Amazon SES provider account'},{value:'identity',label:'Sender identity'},{value:'policy',label:'Sending policy (disabled)'}]} value={action} onChange={v=>{if(v){setAction(v as typeof action);clear();}}} />
        <div className="form-grid">
          {action==='provider'?<>
            <div className="field"><label htmlFor="ses-code">Provider account code *</label><input className="input" id="ses-code" required disabled={!!id} value={form.code} onChange={e=>update('code',e.target.value)} placeholder="aws_ses_mumbai" /></div>
            <SmartSelect label="SES AWS region *" options={regions} value={form.region} onChange={v=>update('region',v??'ap-south-1')}/>
            <div className="field bcs-full"><label htmlFor="ses-secret">Private credential reference (optional)</label><input className="input" id="ses-secret" value={form.secret} placeholder="secrets/ses-mumbai" onChange={e=>update('secret',e.target.value)}/><small className="bcs-muted">Reference only. Never paste AWS access keys.</small></div>
          </>:<>
            <SmartSelect label="Provider account *" value={form.provider||null} options={(data?.providers??[]).map(p=>({value:p.id,label:p.account_code}))} onChange={v=>update('provider',v??'')}/>
            {action==='identity'?<>
              <SmartSelect label="Identity type *" value={form.type} options={[{value:'email',label:'Email address'},{value:'domain',label:'Domain'}]} onChange={v=>update('type',v??'email')}/>
              <div className="field"><label htmlFor="identity-name">Sender display name *</label><input id="identity-name" className="input" required value={form.name} onChange={e=>update('name',e.target.value)}/></div>
              <div className="field"><label htmlFor="identity-value">Sender email / domain *</label><input id="identity-value" className="input" required value={form.value} onChange={e=>update('value',e.target.value)}/></div>
            </>:<>
              <SmartSelect label="Connected portal *" value={form.portal||null} options={(data?.portals??[]).map(p=>({value:p.id,label:p.portal_name}))} onChange={v=>update('portal',v??'')}/>
              <div className="field"><label htmlFor="policy-name">Policy name *</label><input id="policy-name" required className="input" value={form.name} disabled={!!id} onChange={e=>update('name',e.target.value)}/></div>
              <div className="field"><label htmlFor="policy-rate">Max sends / second (configured)</label><input id="policy-rate" className="input" type="number" step="0.1" min="0.1" required value={form.rate} onChange={e=>update('rate',e.target.value)}/></div>
              <div className="field"><label htmlFor="policy-daily">Daily sending budget</label><input id="policy-daily" className="input" type="number" min="0" step="1" required value={form.daily} onChange={e=>update('daily',e.target.value)}/></div>
              <div className="field"><label htmlFor="policy-retries">Max retries</label><input id="policy-retries" className="input" type="number" min="0" max="20" step="1" required value={form.retries} onChange={e=>update('retries',e.target.value)}/></div>
            </>}
          </>}
        </div>
        <div className="bcs-info">Sending stays disabled. These are stored settings only, not verified SES rates or DNS checks. No AWS connection is made from this form.</div>
        {error&&<p className="bcs-form-alert" role="alert">{error}</p>}{notice&&<p className="bcs-form-good" role="status">{notice}</p>}
        <div className="inline-actions"><button type="submit" className="bcs-btn bcs-btn-primary" disabled={!data||busy}>{busy?'Saving…':id?'Save changes':'Save settings'}</button>{id&&<button type="button" className="bcs-btn" onClick={clear}>New record</button>}</div>
      </form>
    </Panel>
    <div className="panel-stack"><Panel title="Domain authentication readiness" subtitle="Stored metadata · no live DNS validation">
      <div className="card-body">{[['SPF','Sender authorization',ident?.spf_status??'Not checked'],['DKIM','Cryptographic signing',ident?.dkim_status??'Not checked'],['DMARC','Alignment policy',ident?.dmarc_status??'Not checked'],['Unsubscribe','One-click marketing preference','Planned'],['Feedback','SES bounce / complaint handler','Not connected']].map(([label,description,state])=><div key={label} className="bcs-directory-row"><span className="bcs-avatar">◷</span><div><strong>{label}</strong><small>{description}</small></div><span className="bcs-chip">{state}</span></div>)}
      </div></Panel><Panel title="Stored provider & policy registry" subtitle="Sending disabled until verified and separately authorized"><div className="card-body">{(data?.providers??[]).map(p=><div className="bcs-directory-row" key={p.id}><div><strong>{p.account_code}</strong><small>{p.aws_region} · {p.account_status}</small></div><button type="button" className="bcs-btn bcs-btn-small" onClick={()=>editProvider(p)}>Edit</button></div>)}{(data?.identities??[]).map(p=><div className="bcs-directory-row" key={p.id}><div><strong>{p.identity_value}</strong><small>{p.provider_verified?'Provider verified':'Provider not verified'}</small></div></div>)}{(data?.policies??[]).map(p=><div className="bcs-directory-row" key={p.id}><div><strong>{p.policy_name}</strong><small>{p.is_enabled?'Configured active':'Disabled'} · {p.configured_rate_per_second??'—'} / sec</small></div><button type="button" className="bcs-btn bcs-btn-small" onClick={()=>editPolicy(p)}>Edit</button></div>)}{data&&!data.providers.length&&!data.identities.length&&!data.policies.length&&<p className="bcs-muted">No provider settings stored yet.</p>}</div></Panel></div>
  </div>;
}
