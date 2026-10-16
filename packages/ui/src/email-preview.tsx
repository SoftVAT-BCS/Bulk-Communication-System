"use client";
import { useMemo, useState } from "react";
import type { EmailContent } from "@bcs/contracts";
import { emailContent, personalizeEmail, unknownEmailTokens } from "./email-html";
export function EmailPreview({ content, subject, values }: { content:EmailContent; subject:string; values?:Record<string,string> }) {
  const [mode,setMode]=useState("Formatted");
  const safe=useMemo(()=>values ? personalizeEmail(content.html,values) : emailContent(content.html),[content.html,values]);
  const unknown=unknownEmailTokens(content);
  return <div className="bcs-email-preview"><fieldset className="bcs-email-preview-tabs" aria-label="Preview format">{["Formatted","Plain text","HTML"].map(label=><button type="button" className={mode===label?"active":""} aria-pressed={mode===label} key={label} onClick={()=>setMode(label)}>{label}</button>)}</fieldset><div className="bcs-email-envelope"><span className="tiny">SUBJECT · DEMO PREVIEW</span><h3>{subject || "Your email subject"}</h3></div>{unknown.length>0 && <p role="status" className="bcs-email-error">Unknown variables: {unknown.join(", ")}</p>}{mode==="Formatted" ? <div className="bcs-email-paper" ref={node=>{if(node)node.innerHTML=safe.plainText.trim() ? safe.html : "<p>Your message will appear here.</p>";}} /> : <section className="bcs-email-output" aria-label={`${mode} preview`}>{mode==="HTML"?safe.html:safe.plainText}</section>}<p className="bcs-email-preview-note">Browser preview only. Gmail / Outlook rendering requires separate email-client testing before future sending.</p></div>;
}
