"use client";
import { useCallback,useEffect,useState,type ReactNode } from "react";
import { ActionButton,Panel,FormField } from "@bcs/ui";
export function SessionGate({children}:{children:ReactNode}) {
 const [name,setName]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[username,setUsername]=useState(""),[password,setPassword]=useState("");
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/bcs/app/session',{cache:'no-store'});const j=await r.json();if(r.ok)setName(j.data.name);else if(r.status!==401)setError('Application connection unavailable.');}catch{setError('Application connection unavailable.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 if(loading)return <p role="status">Checking session…</p>;
 if(name)return <><div className="notice">Signed in as {name}. <ActionButton onClick={async()=>{const r=await fetch('/api/bcs/app/session',{method:'DELETE'});if(r.ok){setName(null);window.location.reload();}else setError('Sign out failed.');}}>Sign out</ActionButton></div>{children}</>;
 return <Panel title="Sign in" subtitle="Private local workspace · no live sending"><form className="bcs-card-body" onSubmit={async e=>{e.preventDefault();setLoading(true);setError('');try{const r=await fetch('/api/bcs/app/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});setPassword('');if(!r.ok){setError('Sign in failed. Check your account or try again later.');setLoading(false);}else await refresh();}catch{setError('Application unavailable.');setLoading(false);}}}><FormField label="Username"><input autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} /></FormField><FormField label="Password"><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></FormField>{error&&<p role="alert">{error}</p>}<ActionButton type="submit" primary>Sign in</ActionButton><p className="helper">Initial owner credentials are stored privately in the workspace .local folder.</p></form></Panel>;
}
