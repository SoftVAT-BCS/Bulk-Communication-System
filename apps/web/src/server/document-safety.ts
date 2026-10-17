import "server-only";
import { createRequire } from "node:module";
import createDOMPurify from "dompurify";
import { sanitizeEmailHtml } from "../../../../packages/ui/src/email-html";
import { ReadError } from "./validation";
const require=createRequire(import.meta.url);
const {JSDOM}=require("jsdom") as {JSDOM:new(html:string)=>{window:Window & {close():void}}};
export function cleanDocument(value:unknown) {
 if(typeof value!=="string"||value.length>100000)throw new ReadError(400,"INVALID_DOCUMENT");
 const dom=new JSDOM("");
 try{const purify=createDOMPurify(dom.window as unknown as Parameters<typeof createDOMPurify>[0]);const html=sanitizeEmailHtml(value,{document:dom.window.document,sanitize:(v,o)=>String(purify.sanitize(v,o))});const t=dom.window.document.createElement('template');t.innerHTML=html;for(const el of t.content.querySelectorAll('br,p,h1,h2,h3,li'))el.append('\n');return {version:1 as const,html,plainText:(t.content.textContent??'').trim()};}finally{dom.window.close();}
}
