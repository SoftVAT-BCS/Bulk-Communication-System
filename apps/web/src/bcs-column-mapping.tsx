"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Panel, SmartSelect } from '@bcs/ui';

type Portal = { id: string; portal_name: string };
type Connection = { id: string; portal_id: string; connection_name: string; status: string };
type Mapping = { id: string; portal_id: string; connection_id: string; entity_type: string; mapping_version: number; approved_view_or_endpoint: string; primary_key_field: string; column_map: Record<string,string>; status: string };
type Data = { portals: Portal[]; connections: Connection[]; mappings: Mapping[] };
type Sample = Record<string,unknown>;
const initial = { portal: '', connection: '', source: 'recipients', primary: 'target_id', name: 'name', email: 'email', group: 'recipient_group', subgroup: 'category', status: 'status', classTable: '' };

export function BcsColumnMapping() {
  const [data,setData]=useState<Data|null>(null);
  const [form,setForm]=useState(initial);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [sample,setSample]=useState<Sample[]>([]);
  const load=useCallback(async()=>{
    const r=await fetch('/api/bcs/app/configuration?kind=mappings',{cache:'no-store'});
    const j=await r.json();
    if(!r.ok)throw Error(j.error?.code??'CONFIGURATION_UNAVAILABLE');
    setData(j.data as Data);
  },[]);
  useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Unavailable'));},[load]);
  const connections=useMemo(()=>data?.connections.filter(c=>c.portal_id===form.portal)??[],[data,form.portal]);
  const change=(key:keyof typeof form,value:string)=>setForm(f=>({...f,[key]:value,...(key==='portal'?{connection:''}:{})}));
  async function request(action:string, payload:Record<string,unknown>){
    setBusy(true);setError('');setNotice('');
    try {
      const r=await fetch('/api/bcs/app/configuration',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({kind:'mappings',action,...payload})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(String(j.error?.code??'MAPPING_OPERATION_FAILED'));
      if(Array.isArray(j.data?.sample))setSample(j.data.sample);
      await load();
      setNotice(action==='mapping'?'New mapping draft saved. Validate it before approving.':action==='validate'?'Native mapping validated; source sample loaded.':`Mapping ${action} completed.`);
    }catch(e){setError(e instanceof Error?e.message:'Operation failed');}
    finally{setBusy(false);}
  }
  async function save(e:FormEvent){e.preventDefault(); await request('mapping',form);}
  return <div className="bcs-admin-grid">
    <Panel title="Table & column mapping" subtitle="Normalize different data schemas into one recipient model">
      <form className="card-body bcs-admin-form" onSubmit={save}>
        <div className="bcs-info">Select a registered portal and connector. Mappings are versioned and require validation; no arbitrary SQL is executed.</div>
        <div className="form-grid">
          <SmartSelect label="Connected portal *" value={form.portal||null} onChange={v=>change('portal',v??'')} options={(data?.portals??[]).map(p=>({value:p.id,label:p.portal_name}))}/>
          <SmartSelect label="Source connection *" value={form.connection||null} onChange={v=>change('connection',v??'')} options={connections.map(c=>({value:c.id,label:c.connection_name}))}/>
          {([
            ['source','Recipient table / approved view'],['primary','Recipient primary key'],['name','Display name column'],['email','Email address column'],['group','Group / course foreign key'],['subgroup','Subgroup / batch foreign key'],['status','Eligibility / active field'],
          ] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={`mapping-${key}`}>{label} *</label><input id={`mapping-${key}`} className="input" value={form[key]} required maxLength={80} pattern="[a-zA-Z_][a-zA-Z0-9_]*" onChange={e=>change(key,e.target.value)} /></div>)}
          <div className="field bcs-full"><label htmlFor="mapping-class">Class schedule table / approved view (future adapter)</label><input id="mapping-class" value={form.classTable} className="input" disabled readOnly placeholder="Available when a class-event source adapter is approved" /></div>
        </div>
        <div className="bcs-chips"><span className="bcs-chip">Source table</span><span className="bcs-chip">Group / Subgroup</span><span className="bcs-chip">Recipient</span><span className="bcs-chip">Notify (disabled)</span></div>
        <p className="bcs-muted">The native BCS sample validator supports only approved PostgreSQL connection alias <strong>bcs-native</strong> and <strong>recipients</strong>. External sources require a separately configured adapter.</p>
        {error&&<p className="bcs-form-alert" role="alert">{error}</p>}{notice&&<p className="bcs-form-good" role="status">{notice}</p>}
        <div className="inline-actions"><button type="submit" className="bcs-btn bcs-btn-primary" disabled={busy||!data||!form.portal||!form.connection}>Save mapping draft</button><a className="bcs-btn" href="/admin/connections">Manage source connections</a></div>
      </form>
    </Panel>
    <div className="panel-stack"><Panel title="Stored mapping versions" subtitle="Company-authorized, audit-tracked changes">
      <div className="card-body bcs-directory">{(data?.mappings??[]).map(m=><div className="bcs-directory-row bcs-mapping-row" key={m.id}><div><strong>{m.approved_view_or_endpoint} · v{m.mapping_version}</strong><small>{m.status} · {data?.portals.find(p=>p.id===m.portal_id)?.portal_name??'Portal'}</small></div><div className="inline-actions">{m.status==='draft'&&<button type="button" className="bcs-btn bcs-btn-small" disabled={busy} onClick={()=>void request('validate',{id:m.id})}>Test sample</button>}{m.status==='validated'&&<button type="button" className="bcs-btn bcs-btn-small" disabled={busy} onClick={()=>void request('approve',{id:m.id})}>Approve</button>}{m.status!=='disabled'&&<button type="button" className="bcs-btn bcs-btn-small" disabled={busy} onClick={()=>void request('disable',{id:m.id})}>Disable</button>}</div></div>)}{data&&!data.mappings.length&&<p>No saved mappings.</p>}</div>
    </Panel><Panel title="Normalized recipient preview" subtitle="Only returned by the authorized native sample validator">
      <div className="bcs-table-frame"><table className="bcs-rights-table"><thead><tr><th>Recipient ID</th><th>Name</th><th>Email</th><th>Group</th></tr></thead><tbody>{sample.map((row,i)=><tr key={String(row.target_id??i)}><td>{String(row.target_id??'')}</td><td>{String(row.name??'')}</td><td>{String(row.email??'')}</td><td>{String(row.recipient_group??'')}</td></tr>)}</tbody></table>{!sample.length&&<div className="empty-state">No verified sample yet. Validate an approved native mapping to display records.</div>}</div>
    </Panel></div>
  </div>;
}
