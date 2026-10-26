"use client";
import { createContext,useContext,useCallback,useEffect,useState,type ReactNode } from "react";
import { ActionButton,Panel,FormField } from "@bcs/ui";
import { canVisitPage, safeWorkspacePage } from "./role-home";
const RightsContext=createContext<string[]>([]);
export function useSessionRights(){return useContext(RightsContext);}
export function SessionGate({children}:{children:ReactNode}) {
 const [name,setName]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[username,setUsername]=useState(""),[password,setPassword]=useState("");
 const [permissions,setPermissions]=useState<string[]>([]),[home,setHome]=useState("/");
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/bcs/app/session',{cache:'no-store'});const j=await r.json();if(r.ok){setName(j.data.name);setPermissions(Array.isArray(j.data.permissions)?j.data.permissions:[]);setHome(safeWorkspacePage(j.data.home));}else if(r.status===401){setName(null);setPermissions([]);}else setError('Application connection unavailable.');}catch{setError('Application connection unavailable.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{if(name&&home!=="/"&&window.location.pathname==="/")window.location.replace(home);},[name,home]);
 if(loading)return <p role="status">Checking session…</p>;
 if(name){
  if(!canVisitPage(window.location.pathname,permissions))return <Panel title="Access restricted" subtitle="Your BCS role does not permit this page"><div className="bcs-card-body"><p>You are signed in, but this page is not assigned to your role.</p><p><a href={home}>Open your authorized workspace →</a></p></div></Panel>;
  return <RightsContext.Provider value={permissions}>{children}</RightsContext.Provider>;
 }
 return <Panel title="Sign in" subtitle="Private local workspace · no live sending"><form className="bcs-card-body" onSubmit={async e=>{e.preventDefault();setLoading(true);setError('');try{const r=await fetch('/api/bcs/app/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});setPassword('');if(!r.ok){const j=await r.json();setError(j.error?.code==='AUTH_NOT_CONFIGURED'?'Supabase sign-in is awaiting server configuration.':j.error?.code==='ACCOUNT_NOT_AUTHORIZED'?'This account has no authorized BCS workspace.':j.error?.code==='MFA_REQUIRED'?'This account requires MFA; this sign-in form does not yet support its second factor.':'Sign in failed. Check your confirmed account or try again later.');setLoading(false);}else await refresh();}catch{setError('Application unavailable.');setLoading(false);}}}><FormField label="Email"><input type="email" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} /></FormField><FormField label="Password"><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></FormField>{error&&<p role="alert">{error}</p>}<ActionButton type="submit" primary>Sign in</ActionButton><p className="helper">Use your confirmed Supabase account. Access requires an assigned BCS principal and portal. <a href="/login">Open full sign-in page</a>.</p></form></Panel>;
}
