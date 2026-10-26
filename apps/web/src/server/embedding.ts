import 'server-only';
import { randomBytes,createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { transaction,jsonBody } from './app-service';
import { localRequest,ReadError } from './validation';
import { verifyEmbed,type EmbedIssuer } from './embed-contract';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function embedExchange(request:Request){
  localRequest(request,process.env.NODE_ENV);const b=await jsonBody(request);
  if(b.action==='issue'){
    if(request.headers.has('origin')||request.headers.has('cookie'))throw new ReadError(403,'BACKEND_EXCHANGE_ONLY');
    let issuer:EmbedIssuer;try{issuer=JSON.parse(readFileSync(/* turbopackIgnore: true */ process.env.BCS_EMBED_ISSUERS_FILE??'','utf8'))[String(b.issuer)];}catch{throw new ReadError(503,'EMBED_NOT_CONFIGURED');}
    let a:ReturnType<typeof verifyEmbed>;try{a=verifyEmbed(String(b.assertion),String(b.signature),issuer);}catch{throw new ReadError(403,'EMBED_ASSERTION_DENIED');}
    return transaction(async c=>{
      const principal=(await c.query("SELECT p.id FROM bcs.principals p JOIN bcs.companies co ON co.id=p.company_id AND co.status IN ('active','trial') JOIN bcs.principal_portal_scopes sc ON sc.company_id=p.company_id AND sc.principal_id=p.id JOIN bcs.portals po ON po.company_id=sc.company_id AND po.id=sc.portal_id AND po.status='active' WHERE p.company_id=$1 AND p.identity_issuer=$2 AND p.external_subject=$3 AND p.status='active' AND sc.portal_id=$4",[a.company,a.iss,a.sub,a.portal])).rows;
      if(principal.length!==1)throw new ReadError(403,'EMBED_PRINCIPAL_DENIED');const code=randomBytes(32).toString('base64url');
      await c.query('INSERT INTO bcs.embed_grants(code_hash,company_id,portal_id,principal_id,issuer,replay_id,parent_origin,permissions,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval \'30 seconds\')',[hash(code),a.company,a.portal,principal[0].id,a.iss,a.jti,a.origin,JSON.stringify(issuer.permissions)]);
      return {code,expiresIn:30,redirect:a.redirect};
    });
  }
  if(b.action!=='redeem'||request.headers.get('origin')!==new URL(request.url).origin||typeof b.code!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.code))throw new ReadError(403,'EMBED_REDEEM_DENIED');
  const code=b.code;
  return transaction(async c=>{
    const grant=(await c.query('UPDATE bcs.embed_grants SET used_at=now() WHERE code_hash=$1 AND parent_origin=$2 AND used_at IS NULL AND expires_at>now() RETURNING *',[hash(code),b.parentOrigin])).rows[0];if(!grant)throw new ReadError(403,'EMBED_CODE_EXPIRED_OR_USED');
    const token=randomBytes(32).toString('base64url');await c.query("INSERT INTO bcs.application_sessions(token_hash,company_id,portal_id,principal_id,expires_at,embed_origin,embedded_permissions) VALUES($1,$2,$3,$4,now()+interval '5 minutes',$5,$6)",[hash(token),grant.company_id,grant.portal_id,grant.principal_id,grant.parent_origin,JSON.stringify(grant.permissions)]);
    return {token,expiresIn:300,mode:'embedded',sending:false};
  });
}
export async function embeddedData(request:Request){
  localRequest(request,process.env.NODE_ENV);
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new ReadError(403,'EMBED_ORIGIN_DENIED');
  const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];if(!token)throw new ReadError(401,'EMBED_SESSION_REQUIRED');
  return transaction(async c=>{
    const s=(await c.query("SELECT s.* FROM bcs.application_sessions s JOIN bcs.companies co ON co.id=s.company_id AND co.status IN ('active','trial') JOIN bcs.principals p ON p.company_id=s.company_id AND p.id=s.principal_id AND p.status='active' JOIN bcs.portals po ON po.company_id=s.company_id AND po.id=s.portal_id AND po.status='active' JOIN bcs.principal_portal_scopes sc ON sc.company_id=s.company_id AND sc.principal_id=s.principal_id AND sc.portal_id=s.portal_id WHERE s.token_hash=$1 AND s.embed_origin IS NOT NULL AND s.expires_at>now() AND s.revoked_at IS NULL",[hash(token)])).rows[0];if(!s)throw new ReadError(401,'EMBED_SESSION_EXPIRED');
    if(request.method==='DELETE'){await c.query('UPDATE bcs.application_sessions SET revoked_at=now() WHERE token_hash=$1',[hash(token)]);return {loggedOut:true};}
    await c.query("SELECT set_config('bcs.session_hash',$1,true)",[hash(token)]);
    if(!s.embedded_permissions.includes('reports.view')||!(await c.query("SELECT bcs.session_allows($1,$2,'reports.view') allowed",[s.company_id,s.portal_id])).rows[0].allowed)throw new ReadError(403,'EMBED_PERMISSION_DENIED');
    return {mode:'embedded',company:s.company_id,portal:s.portal_id,permissions:['reports.view'],campaigns:(await c.query('SELECT id,title,state FROM bcs.campaigns WHERE company_id=$1 AND portal_id=$2 ORDER BY created_at DESC LIMIT 50',[s.company_id,s.portal_id])).rows};
  });
}
