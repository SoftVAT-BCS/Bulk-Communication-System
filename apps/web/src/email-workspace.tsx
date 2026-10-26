"use client";
import { forwardRef, useImperativeHandle, useState } from "react";
import type { EmailTemplate } from "@bcs/contracts";
import { EmailConfirm, SmartSelect, emailContent } from "@bcs/ui";
import { blankDraft, useEmailWorkspace } from "./email-store";
import { useDatabaseEmailWorkspace } from "./database-email-store";
import { EmailComposer } from "./email-composer";
import { EmailTemplates, TemplateDesigner } from "./email-templates";
export interface EmailWorkspaceHandle { newMessage():void }
export const EmailWorkspace=forwardRef<EmailWorkspaceHandle,{tab:string;onTab(tab:string):void;selected:ReadonlySet<string>;snapshot?:string;database?:boolean}>(function EmailWorkspace({tab,onTab,selected,snapshot,database=false},ref){
  const localState=useEmailWorkspace(!database),remoteState=useDatabaseEmailWorkspace(database);const state=database?remoteState:localState;const [designer,setDesigner]=useState<EmailTemplate|null>(null),[pending,setPending]=useState<null|{kind:"new"}|{kind:"draft";id:string}|{kind:"apply";template:EmailTemplate}>(null);
  const apply=(template:EmailTemplate)=>{state.setDraft({...state.draft,subject:template.subject,category:template.category,content:emailContent(template.content.html)});state.setNotice("");onTab("Compose & Send");};
  const useTemplate=(template:EmailTemplate)=>state.dirty?setPending({kind:"apply",template}):apply(template);
  const reset=()=>{if(database)remoteState.newDraft();else state.setDraft(blankDraft());state.setNotice("");onTab("Compose & Send");};
  useImperativeHandle(ref,()=>({newMessage:()=>state.dirty?setPending({kind:"new"}):reset()}));
  const openDraft=(id:string)=>{void remoteState.loadDraft(id).catch(()=>state.setNotice('Draft unavailable; current edits retained.'));};
  return <>{database&&tab==='Compose & Send'&&<SmartSelect label="Open saved draft" value={null} options={remoteState.drafts.map(d=>({value:d.id,label:d.subject||'Untitled draft'}))} onChange={id=>{if(id){if(state.dirty)setPending({kind:'draft',id});else openDraft(id);}}} />}{state.warnings.map(warning=><div key={warning} role="alert" className="notice amber bcs-email-demo-note">{warning}</div>)}{state.notice&&<p className="notice green bcs-email-demo-note" role="status">{state.notice}</p>}{!state.ready?<p role="status">Loading email workspace…</p>:tab==="Templates"?<EmailTemplates database={database} templates={state.templates} onUse={useTemplate} onDesign={setDesigner} onSave={state.saveTemplate} onDelete={state.deleteTemplate} />:tab==="Compose & Send"?<EmailComposer snapshot={snapshot} draft={state.draft} onChange={draft=>{state.setDraft(draft);state.setNotice("");}} templates={state.templates} onApply={useTemplate} database={database} selected={selected} dirty={state.dirty} onSave={state.saveDraft} onRecipients={()=>onTab("Recipient Selection")} onSaveTemplate={()=>setDesigner({id:"",name:"",category:state.draft.category,subject:state.draft.subject,description:"",content:emailContent(state.draft.content.html),updatedAt:"",builtIn:false})} />:null}
    {designer&&<TemplateDesigner database={database} initial={designer} templates={state.templates} onSave={state.saveTemplate} onClose={()=>setDesigner(null)} />}{pending&&<EmailConfirm title={pending.kind==="new"?"Start a new message?":"Replace unsaved draft?"} onCancel={()=>setPending(null)} onConfirm={()=>{if(pending.kind==="new")reset();else if(pending.kind==='draft')openDraft(pending.id);else apply(pending.template);setPending(null);}}>This replaces your unsaved draft in memory. Your last explicitly saved draft remains until you save again. Selected recipients are unchanged.</EmailConfirm>}
  </>;
});
