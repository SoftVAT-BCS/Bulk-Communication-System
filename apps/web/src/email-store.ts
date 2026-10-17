"use client";
import { useEffect, useState } from "react";
import type { EmailDraft, EmailTemplate } from "@bcs/contracts";
import { emailContent, maxEmailHtml } from "@bcs/ui";
export const templateStoreKey="bcs-demo-templates-v1", draftStoreKey="bcs-demo-draft-v1";
export const emailCategories=["Class Schedule","Reschedule","Cancellation","Reminder","Newsletter","Resource","Announcement"];
export const blankDraft=():EmailDraft=>({subject:"",category:"Announcement",sender:"SkillMonk Academy",replyTo:"learning@example.com",content:emailContent("<p></p>")});
export function starterTemplates():EmailTemplate[] { return [
  ["Class Schedule Confirmation","Class Schedule","Your {{course_name}} class is confirmed","Your next learning session","Your class for {{batch_name}} is confirmed. Please check your learning portal for the session details."],
  ["Reschedule Notice","Reschedule","Updated schedule for {{course_name}}","A change to your class schedule","Your {{batch_name}} session has been rescheduled. Please check the updated timetable in your learning portal."],
  ["Cancellation Alert","Cancellation","Class cancellation — {{course_name}}","An important class update","Your upcoming {{batch_name}} session is cancelled. We will share the next available session in your learning portal."],
  ["Class Reminder","Reminder","A reminder for {{course_name}}","Ready for your next class?","Your {{batch_name}} class is coming up. Bring your questions and join the session through your learning portal."],
  ["Monthly Learning Newsletter","Newsletter","This month in {{course_name}}","Your monthly learning highlights","Celebrate your progress, explore new lessons and plan your next milestone. Your {{batch_name}} learning community is here to support you."],
  ["New Material Available","Resource","New resources for {{course_name}}","Keep your learning moving","New practice material is ready for {{batch_name}}. Visit your learning portal to explore the resources at your own pace."],
].map(([name,category,subject,heading,message],index)=>({id:`starter-${index+1}`,name,category,subject,description:heading,updatedAt:"2026-10-16T00:00:00.000Z",builtIn:true,content:emailContent(`<h2 style="color:#236bff">${heading}</h2><p>Hello {{student_name}},</p><p>${message}</p><p><strong>Keep learning. Keep growing.</strong></p><p>Warm regards,<br>SkillMonk Academy</p>`)})); }
function record(value:unknown):value is Record<string,unknown> {return typeof value==="object"&&value!==null&&!Array.isArray(value);}
function text(value:unknown,max:number):string {if(typeof value!=="string"||value.length>max)throw new Error("Invalid demo document field.");return value;}
export function readDraft(value:unknown):EmailDraft {
  if(!record(value)||!record(value.content)||value.content.version!==1)throw new Error("Unsupported draft version.");
  const category=text(value.category,40); if(!emailCategories.includes(category))throw new Error("Invalid category.");
  return {subject:text(value.subject,200),category,sender:text(value.sender,100),replyTo:text(value.replyTo,254),content:emailContent(text(value.content.html,maxEmailHtml))};
}
export function readTemplate(value:unknown):EmailTemplate {
  if(!record(value))throw new Error("Invalid template."); const draft=readDraft({...value,sender:"",replyTo:""});
  const id=text(value.id,100); if(!id.startsWith("custom-"))throw new Error("Invalid custom template ID.");
  const name=text(value.name,100).trim(); if(!name||!draft.subject.trim()||!draft.content.plainText.trim())throw new Error("Incomplete stored template.");
  const updatedAt=text(value.updatedAt,40); if(!Number.isFinite(Date.parse(updatedAt)))throw new Error("Invalid update time.");
  return {id,name,subject:draft.subject,category:draft.category,content:draft.content,description:text(value.description,300),updatedAt,builtIn:false};
}
export function loadDemoStore(storage:Pick<Storage,"getItem">) {
  let templates:EmailTemplate[]=[]; let draft=blankDraft(); const warnings:string[]=[]; let templatesBlocked=false,draftBlocked=false;
  try {const raw=storage.getItem(templateStoreKey);if(raw){if(raw.length>2_000_000)throw new Error();const data:unknown=JSON.parse(raw);if(!record(data)||data.version!==1||!Array.isArray(data.items)||data.items.length>50)throw new Error();templates=data.items.map(readTemplate);if(new Set(templates.map(t=>t.id)).size!==templates.length||new Set(templates.map(t=>t.name.toLowerCase())).size!==templates.length)throw new Error();}}
  catch {templates=[];templatesBlocked=true;warnings.push("Stored templates are unavailable or invalid. Existing storage was not overwritten; template saving is blocked in this session.");}
  try {const raw=storage.getItem(draftStoreKey);if(raw){if(raw.length>150_000)throw new Error();const data:unknown=JSON.parse(raw);if(!record(data)||data.version!==1)throw new Error();draft=readDraft(data.draft);}}
  catch {draftBlocked=true;warnings.push("Stored draft is unavailable or invalid. Existing storage was not overwritten; draft saving is blocked in this session.");}
  return {templates,draft,warnings,templatesBlocked,draftBlocked};
}
export function writeDemoStore(storage:Pick<Storage,"setItem">,key:string,value:unknown):string|null {try{storage.setItem(key,JSON.stringify(value));return null;}catch{return "Browser storage is denied or full. Not saved. Keep this page open and copy your work before leaving.";}}
export function templateValidation(template:EmailTemplate,all:EmailTemplate[],exceptId=template.id):string {
  if(!template.name.trim()||!template.subject.trim()||!template.content.plainText.replace(/\s|\u200b/g,"").length)return "Template name, subject and a meaningful email body are required.";
  if(template.name.length>100||template.subject.length>200||template.description.length>300||template.content.html.length>maxEmailHtml)return "A field exceeds its size limit.";
  if(!emailCategories.includes(template.category))return "Choose a valid category.";
  if(all.some(t=>t.id!==exceptId&&t.name.trim().toLowerCase()===template.name.trim().toLowerCase()))return "A template with that name already exists. Choose a different name.";
  return "";
}
export function copyTemplateName(name:string,all:EmailTemplate[]):string {let next=`${name.slice(0,85)} (copy)`,i=2;while(all.some(t=>t.name.toLowerCase()===next.toLowerCase()))next=`${name.slice(0,85)} (copy ${i++})`;return next;}
export function useEmailWorkspace(enabled=true) {
  const [ready,setReady]=useState(false),[custom,setCustom]=useState<EmailTemplate[]>([]),[draft,setDraft]=useState<EmailDraft>(blankDraft),[saved,setSaved]=useState("");
  const [warnings,setWarnings]=useState<string[]>([]),[blocked,setBlocked]=useState({templates:false,draft:false}),[notice,setNotice]=useState("");
  useEffect(()=>{if(!enabled)return;try{const result=loadDemoStore(window.localStorage);setCustom(result.templates);setDraft(result.draft);setSaved(JSON.stringify(result.draft));setWarnings(result.warnings);setBlocked({templates:result.templatesBlocked,draft:result.draftBlocked});}catch{setWarnings(["Browser storage is unavailable. Demo edits remain in memory only; nothing can be saved."]);setBlocked({templates:true,draft:true});}setReady(true);},[enabled]);
  const dirty=ready&&JSON.stringify(draft)!==saved;
  useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",guard);return()=>window.removeEventListener("beforeunload",guard);},[dirty]);
  const templates=ready?[...starterTemplates(),...custom]:[];
  const saveTemplate=(candidate:EmailTemplate,copy=false):string=>{
    const item={...candidate,id:copy||candidate.builtIn||!candidate.id?`custom-${crypto.randomUUID()}`:candidate.id,builtIn:false,updatedAt:new Date().toISOString(),name:copy?copyTemplateName(candidate.name,templates):candidate.name.trim(),content:emailContent(candidate.content.html)};
    const error=templateValidation(item,templates);if(error)return error;
    if(blocked.templates)return "Template storage is unavailable. Not saved; keep editing in memory.";
    const next=[...custom.filter(t=>t.id!==item.id),item];if(next.length>50)return "The demo supports up to 50 custom templates.";
    let failure:string|null;try{failure=writeDemoStore(window.localStorage,templateStoreKey,{version:1,items:next});}catch{failure="Browser storage is unavailable. Not saved.";}
    if(failure)return failure;setCustom(next);setNotice("Template saved in this browser only — synthetic demo.");return "";
  };
  const deleteTemplate=(id:string):string=>{if(blocked.templates)return "Template storage is unavailable. Nothing deleted.";if(!custom.some(t=>t.id===id))return "Starter templates cannot be deleted.";const next=custom.filter(t=>t.id!==id);let failure:string|null;try{failure=writeDemoStore(window.localStorage,templateStoreKey,{version:1,items:next});}catch{failure="Browser storage is unavailable. Nothing deleted.";}if(failure)return failure;setCustom(next);setNotice("Custom template deleted from this browser only.");return "";};
  const saveDraft=():string=>{if(blocked.draft)return "Draft storage is unavailable. Not saved.";if(draft.replyTo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.replyTo))return "Enter a valid reply-to address (demo only).";const safe=readDraft(draft);let failure:string|null;try{failure=writeDemoStore(window.localStorage,draftStoreKey,{version:1,draft:safe});}catch{failure="Browser storage is unavailable. Not saved.";}if(failure)return failure;setDraft(safe);setSaved(JSON.stringify(safe));setNotice("Draft saved in this browser only — synthetic demo.");return "";};
  return {ready,templates,draft,setDraft,dirty,warnings,notice,setNotice,saveTemplate,deleteTemplate,saveDraft};
}
