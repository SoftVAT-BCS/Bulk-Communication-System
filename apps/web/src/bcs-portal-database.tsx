"use client";

import {useCallback,useEffect,useState,type FormEvent} from "react";
import {Panel,SmartSelect} from "@bcs/ui";

type Portal={id:string;portal_name:string;portal_code:string;portal_kind:string;integration_mode:string;timezone:string;status:string};
type Connection={id:string;portal_id:string;connection_name:string;source_engine:string;integration_method:string;endpoint_reference:string;credentials_secret_ref:string|null;status:string;last_connectivity_test_at:string|null};
type Data={portals:Portal[];connections:Connection[];company:{company_name:string;default_timezone:string}};
const engineOptions=[{value:"mysql",label:"MySQL / MariaDB"},{value:"mssql",label:"Microsoft SQL Server"},{value:"postgresql",label:"PostgreSQL"},{value:"portal_api",label:"Secure REST API"}];
const methodOptions=[{value:"read_only_database",label:"Read-only database adapter"},{value:"approved_api",label:"Host portal API"},{value:"private_agent",label:"Private integration agent"}];

/** Exact four IPX database choices are immediately visible; no secrets or raw SQL.
 * Uses the ALREADY IMPLEMENTED configuration API. Connections are configuration
 * records, not proof of real external connectivity.
 */
export function BcsPortalDatabase() {
 const[data,setData]=useState<Data|null>(null);
 const[portal,setPortal]=useState<string|null>(null),[name,setName]=useState(""),[engine,setEngine]=useState<string|null>("mysql"),[method,setMethod]=useState<string|null>("approved_api"),[alias,setAlias]=useState(""),[secret,setSecret]=useState(""),[editId,setEditId]=useState("");
 const[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const[portalEditor,setPortalEditor]=useState(false),[portalId,setPortalId]=useState('');
 const[portalForm,setPortalForm]=useState({code:'',name:'',portalKind:'education',method:'portal_api',timezone:'Asia/Kolkata',status:'draft'});
 function editPortal(p:Portal){setPortalId(p.id);setPortalForm({code:p.portal_code,name:p.portal_name,portalKind:p.portal_kind,method:p.integration_mode,timezone:p.timezone,status:p.status});setPortalEditor(true);}
 async function savePortal(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{
   const r=await fetch('/api/bcs/app/configuration',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({kind:'portals',action:'portal',id:portalId||undefined,...portalForm})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(String(j.error?.code??'PORTAL_NOT_SAVED'));
   await load();setNotice('Portal registry saved in PostgreSQL. External connectivity has not been verified.');setPortalId('');setPortalEditor(false);
 }catch(e){setError(e instanceof Error?e.message:'Portal save failed');}finally{setBusy(false);}}
 const load=useCallback(async()=>{const r=await fetch("/api/bcs/app/configuration?kind=portals",{cache:"no-store"});if(!r.ok)throw Error("You need portals.manage permission.");const j=await r.json();setData(j.data as Data);},[]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 function edit(c:Connection){setEditId(c.id);setPortal(c.portal_id);setName(c.connection_name);setEngine(c.source_engine);setMethod(c.integration_method);setAlias(c.endpoint_reference);setSecret(c.credentials_secret_ref??"");}
 async function save(e:FormEvent){e.preventDefault();if(!portal||!engine||!method)return;setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/bcs/app/configuration",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"portals",action:"connection",id:editId||undefined,portal,name,engine,method,endpoint:alias,secret})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(String(j.error?.code??"Not saved"));await load();setNotice("Connector draft saved in PostgreSQL. Connectivity has NOT been verified.");setEditId("");setName("");setAlias("");setSecret("");}catch(e){setError(e instanceof Error?e.message:"Not saved");}finally{setBusy(false);}}
 return <div className="bcs-admin-grid">
 <Panel title="Portal connection" subtitle="Register a source application and select its database provider"><form className="card-body bcs-admin-form" onSubmit={save}>
 <SmartSelect label="Portal / application name *" options={(data?.portals??[]).map(p=>({value:p.id,label:p.portal_name}))} value={portal} onChange={setPortal}/>
 <div className="form-grid"><SmartSelect label="Source database engine *" options={engineOptions} value={engine} onChange={setEngine}/><SmartSelect label="Integration method *" options={methodOptions} value={method} onChange={setMethod}/><div className="field"><label className="label" htmlFor="conn-name">Connection name *</label><input className="input" id="conn-name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="SkillMonk learner connection"/></div><div className="field"><label className="label" htmlFor="conn-alias">Database host / private endpoint alias *</label><input className="input" id="conn-alias" required maxLength={120} pattern="[a-z][a-z0-9_-]*(/[a-z0-9_-]+)*" title="Use a pre-approved server alias, not a raw password or connection URL." value={alias} onChange={e=>setAlias(e.target.value)} placeholder="skillmonk-reader"/></div>
 <div className="field"><label className="label" htmlFor="conn-port">Port</label><input className="input" id="conn-port" disabled value={engine==="mysql"?"3306":engine==="mssql"?"1433":engine==="postgresql"?"5432":"HTTPS"} readOnly/><small className="bcs-muted">Illustrative only. Network port belongs in private connector settings; the current API does not store this value.</small></div>
 <div className="field"><label className="label" htmlFor="conn-secret">Backend secret reference (optional)</label><input className="input" id="conn-secret" maxLength={120} pattern="[a-z][a-z0-9_-]*(/[a-z0-9_-]+)*" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="secrets/skillmonk-readonly"/><small className="bcs-muted">An alias only. Never enter credentials here.</small></div>
 <div className="field"><label htmlFor="connector-dbname">Database name (private adapter)</label><input className="input" id="connector-dbname" readOnly disabled value={engine==='mysql'?'skillmonk':engine==='postgresql'?'postgres':engine==='mssql'?'client_database':'REST endpoint'}/></div></div><div className="bcs-info">The original IPX includes a database-name field. The existing BCS API stores only an approved endpoint reference, not raw host/port/database credentials. Database name must be handled in the private adapter; do not fake persistence.</div>
 {error&&<p className="bcs-form-alert" role="alert">{error}</p>}{notice&&<p className="bcs-form-good" role="status">{notice}</p>}
 <div className="inline-actions"><button type="submit" className="bcs-btn bcs-btn-primary" disabled={!data||!portal||!engine||!method||!alias||!name||busy}>{busy?"Saving…":editId?"Update connector draft":"Save connection draft"}</button>{editId&&<button type="button" className="bcs-btn" onClick={()=>{setEditId("");setName("");setAlias("");setSecret("");}}>New connection</button>}</div>
 </form></Panel>
 <div className="panel-stack"><Panel title="Connected portal registry" subtitle="Company-scoped records"><div className="card-body">{(data?.portals??[]).map(p=><div className="bcs-directory-row" key={p.id}><span className="bcs-avatar">▣</span><div><strong>{p.portal_name}</strong><small>{p.portal_kind} · {p.integration_mode} · {p.status}</small></div><button type="button" className="bcs-btn bcs-btn-small" onClick={()=>editPortal(p)}>Edit</button></div>)}{!data&&<p>Loading portal registry…</p>}
 <button type="button" className="bcs-btn bcs-btn-primary" onClick={()=>{setPortalId('');setPortalForm({code:'',name:'',portalKind:'education',method:'portal_api',timezone:'Asia/Kolkata',status:'draft'});setPortalEditor(v=>!v);}}>+ New portal</button>
 {portalEditor&&<form className="bcs-admin-form bcs-portal-editor" onSubmit={savePortal}>
   <div className="field"><label htmlFor="portal-code">Portal code *</label><input className="input" id="portal-code" required disabled={!!portalId} value={portalForm.code} onChange={e=>setPortalForm(f=>({...f,code:e.target.value}))}/></div>
   <div className="field"><label htmlFor="portal-name">Portal name *</label><input className="input" id="portal-name" required value={portalForm.name} onChange={e=>setPortalForm(f=>({...f,name:e.target.value}))}/></div>
   <SmartSelect label="Portal kind" value={portalForm.portalKind} options={['education','crm','hms','erp','other'].map(value=>({value,label:value}))} onChange={v=>setPortalForm(f=>({...f,portalKind:v??'education'}))}/>
   <SmartSelect label="Integration mode" value={portalForm.method} options={[{value:'portal_api',label:'Secure portal API'},{value:'read_only_connector',label:'Read-only connector'},{value:'bcs_native',label:'BCS native'}]} onChange={v=>setPortalForm(f=>({...f,method:v??'portal_api'}))}/>
   <div className="field"><label htmlFor="portal-tz">Timezone</label><input id="portal-tz" className="input" value={portalForm.timezone} onChange={e=>setPortalForm(f=>({...f,timezone:e.target.value}))}/></div>
   <SmartSelect label="Status" value={portalForm.status} options={['draft','active','paused','retired'].map(value=>({value,label:value}))} onChange={v=>setPortalForm(f=>({...f,status:v??'draft'}))}/>
   <button type="submit" className="bcs-btn bcs-btn-primary" disabled={busy}>{portalId?'Save portal changes':'Create portal'}</button>
 </form>}</div></Panel><Panel title="Saved source connectors" subtitle="Connection records · not externally verified"><div className="card-body">{(data?.connections??[]).map(c=><div className="bcs-directory-row" key={c.id}><span className="bcs-avatar">⛁</span><div><strong>{c.connection_name}</strong><small>{engineOptions.find(o=>o.value===c.source_engine)?.label??c.source_engine} · {c.status}</small></div><button className="bcs-btn bcs-btn-small" type="button" onClick={()=>edit(c)}>Edit</button></div>)}{data&&!data.connections.length&&<p className="bcs-muted">No connector records yet.</p>}</div></Panel></div>
 </div>;
}
