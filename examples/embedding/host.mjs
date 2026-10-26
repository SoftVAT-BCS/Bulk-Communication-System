// Synthetic local host examples. Never load reusable credentials in the browser.
import { createServer } from 'node:http';
import { randomBytes,sign,createPrivateKey } from 'node:crypto';
if(process.env.BCS_ISOLATED_ACCEPTANCE!=='I_CONFIRM_DISPOSABLE_LOCAL_DATABASE')throw Error('ISOLATED_ACCEPTANCE_REQUIRED');
const bcs='http://127.0.0.1:3107',origin='http://127.0.0.1:3200';
const key=createPrivateKey(process.env.BCS_DEMO_EMBED_PRIVATE_KEY??'');if(key.asymmetricKeyType!=='ed25519')throw Error('ED25519_KEY_REQUIRED');
const company=process.env.BCS_DEMO_COMPANY,portal=process.env.BCS_DEMO_PORTAL,subject=process.env.BCS_DEMO_SUBJECT;
if(!company||!portal||!subject)throw Error('SYNTHETIC_FIXTURE_IDENTITY_REQUIRED');
const products={'softvat-crm':'SoftVAT CRM','samatva-hms':'SAMATVA HMS','skillmonk-lms':'SkillMonk LMS'};
createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin),slug=url.pathname.split('/')[1];if(!products[slug]){res.writeHead(404).end();return;}
 if(req.method==='POST'&&url.pathname===`/${slug}/authorize`){
  if(req.headers.origin!==origin){res.writeHead(403).end();return;}
  // Synthetic identity is fixed by local server configuration, never accepted from request fields.
  const now=Math.floor(Date.now()/1000);const assertion=Buffer.from(JSON.stringify({iss:slug,aud:'universal-notify',sub:subject,company,portal,origin,redirect:`${bcs}/embed`,jti:randomBytes(24).toString('base64url'),iat:now,exp:now+30})).toString('base64url');
  const r=await fetch(`${bcs}/api/bcs/app/embed`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'issue',issuer:slug,assertion,signature:sign(null,Buffer.from(assertion),key).toString('base64url')}),signal:AbortSignal.timeout(8000)});
  res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(await r.text());return;
 }
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'self'; frame-src ${bcs}; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'`}).end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${products[slug]} synthetic integration</title><h1>${products[slug]} · synthetic host</h1><p>No production identity or data. Sending disabled.</p><button id="authorize" disabled>Authorize scoped module</button><p id="status" role="status">Loading module…</p><iframe id="module" title="Universal Notify embedded reporting" src="${bcs}/embed" style="width:100%;height:600px;border:0" sandbox="allow-scripts allow-same-origin"></iframe><script>const frame=document.getElementById('module'),button=document.getElementById('authorize'),status=document.getElementById('status');frame.addEventListener('load',()=>{button.disabled=false;status.textContent='Ready for scoped authorization';});button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/${slug}/authorize',{method:'POST'});const j=await r.json();if(!r.ok)throw Error();frame.contentWindow.postMessage({type:'bcs:authorize',code:j.data.code},'${bcs}');status.textContent='One-time code handed to scoped module';}catch{status.textContent='Authorization unavailable';}finally{button.disabled=false;}};</script></html>`);
 }catch{res.writeHead(503).end('Synthetic host unavailable');}}).listen(3200,'127.0.0.1',()=>console.log('Synthetic hosts: http://127.0.0.1:3200/softvat-crm /samatva-hms /skillmonk-lms'));
