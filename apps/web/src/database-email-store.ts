"use client";
import {useCallback,useEffect,useState} from "react";
import type {EmailDraft,EmailTemplate} from "@bcs/contracts";
import {blankDraft,starterTemplates,copyTemplateName} from "./email-store";
export function useDatabaseEmailWorkspace(enabled:boolean){
 const [drafts,setDrafts]=useState<{id:string;subject:string;version:number}[]>([]);
 const [ready,setReady]=useState(false),[custom,setCustom]=useState<(EmailTemplate & {revision:number})[]>([]),[draft,setDraft]=useState<EmailDraft>(blankDraft),[saved,setSaved]=useState(''),[draftRef,setDraftRef]=useState<{id:string;version:number}|null>(null),[notice,setNotice]=useState(''),[warnings,setWarnings]=useState<string[]>([]);
 const load=useCallback(async(initial=false,id?:string)=>{const r=await fetch(`/api/bcs/app/documents${(id?`?draft=${id}`:'')}`,{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error?.code??'Load failed');setCustom(j.data.templates);setDrafts(j.data.drafts??[]);if(initial&&j.data.draft){setDraft(j.data.draft);setSaved(JSON.stringify(j.data.draft));setDraftRef({id:j.data.draft.id,version:j.data.draft.version});}if(initial&&!j.data.draft)setSaved(JSON.stringify(blankDraft()));setReady(true);},[]);
 useEffect(()=>{if(!enabled)return;void load(true).catch(()=>{setWarnings(['Database workspace unavailable. No browser-local fallback or save will occur.']);setReady(false);});},[enabled,load]);
 const dirty=ready&&JSON.stringify(draft)!==saved;
 useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 const templates=[...starterTemplates(),...custom];
 const post=async(body:unknown)=>{const r=await fetch('/api/bcs/app/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error?.code??'Save failed');return j.data;};
 const saveTemplate=async(item:EmailTemplate,copy=false):Promise<string>=>{if(!ready)return 'Database unavailable. Not saved.';try{const current=custom.find(t=>t.id===item.id);await post({kind:'template',id:copy||item.builtIn?'':item.id,version:current?.revision,name:copy?copyTemplateName(item.name,templates):item.name,description:item.description,category:item.category,subject:item.subject,html:item.content.html});await load();setNotice('Template and revision saved in PostgreSQL.');return '';}catch(e){return e instanceof Error?e.message:'Save failed';}};
 const deleteTemplate=async(id:string):Promise<string>=>{try{await post({kind:'archive',id,version:custom.find(t=>t.id===id)?.revision});await load();setNotice('Template archived in PostgreSQL.');return '';}catch(e){return e instanceof Error?e.message:'Archive failed';}};
 const saveDraft=async():Promise<string>=>{if(!ready)return 'Database unavailable. Not saved.';try{const result=await post({kind:'draft',...draftRef,subject:draft.subject,category:draft.category,sender:draft.sender,replyTo:draft.replyTo,html:draft.content.html});setDraftRef(result);setSaved(JSON.stringify(draft));await load();setNotice('Draft saved in PostgreSQL. Sending remains disabled.');return '';}catch(e){return e instanceof Error?e.message:'Save failed';}};
 const newDraft=()=>{setDraft(blankDraft());setDraftRef(null);setSaved(JSON.stringify(blankDraft()));};
 return {drafts,loadDraft:(id:string)=>load(true,id),newDraft,ready,templates,draft,setDraft,dirty,warnings,notice,setNotice,saveTemplate,deleteTemplate,saveDraft};
}
