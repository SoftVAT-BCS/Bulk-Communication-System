import 'server-only';
import { randomBytes } from 'node:crypto';
import { validSession,jsonBody,digest,requestToken,session } from './app-service';
import { ReadError,uuid } from './validation';
import { firstAuthorizedPage } from '../role-home';
import { text } from './campaign-validation';
export function tenantOverview(request:Request){return validSession(request,async(c,s)=>{
  const memberships=(await c.query("SELECT p.company_id,sc.portal_id,co.company_name,po.portal_name FROM bcs.principals p JOIN bcs.principals current_p ON current_p.identity_issuer=p.identity_issuer AND current_p.external_subject=p.external_subject JOIN bcs.companies co ON co.id=p.company_id AND co.status IN ('active','trial') JOIN bcs.principal_portal_scopes sc ON sc.company_id=p.company_id AND sc.principal_id=p.id JOIN bcs.portals po ON po.company_id=sc.company_id AND po.id=sc.portal_id AND po.status IN ('active','draft') WHERE current_p.company_id=$1 AND current_p.id=$2 AND p.status='active' AND EXISTS(SELECT 1 FROM bcs.principal_role_assignments a JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id WHERE a.company_id=p.company_id AND a.principal_id=p.id AND (a.portal_id IS NULL OR a.portal_id=sc.portal_id) AND (a.expires_at IS NULL OR a.expires_at>now())) ORDER BY co.company_name,po.portal_name",[s.company_id,s.principal_id])).rows;
  const base={company:s.company_id,portal:s.portal_id,memberships,permissions:s.permissions};
  if(!s.permissions.includes('access.manage'))return {...base,subscriptions:[],usage:[],plans:[],platform:false};
  const platform=(await c.query('SELECT bcs.is_platform_operator() allowed')).rows[0].allowed;
  return {...base,platform,resources:(await c.query('SELECT bcs.tenant_resource_usage($1) resources',[s.company_id])).rows[0].resources,companies:platform?(await c.query('SELECT * FROM bcs.platform_company_registry()')).rows:[],subscriptions:(await c.query('SELECT plan_code,state,begins_at,ends_at FROM bcs.company_subscriptions WHERE company_id=$1 ORDER BY created_at DESC LIMIT 10',[s.company_id])).rows,usage:(await c.query('SELECT metric_code,period_start,period_end,used_units,reserved_units FROM bcs.usage_counters WHERE company_id=$1 ORDER BY period_start DESC LIMIT 50',[s.company_id])).rows,plans:(await c.query("SELECT plan_code,plan_name,plan_limits FROM bcs.saas_plans WHERE status='active'")).rows};
});}
export function tenantWrite(request:Request){return validSession(request,async(c,s)=>{
  const b=await jsonBody(request);
  if(b.action==='switch'){
    if(!uuid.test(String(b.company))||!uuid.test(String(b.portal)))throw new ReadError(400,'INVALID_CONTEXT');
    const target=(await c.query("SELECT p.id FROM bcs.principals p JOIN bcs.principals current_p ON p.identity_issuer=current_p.identity_issuer AND p.external_subject=current_p.external_subject WHERE current_p.company_id=$1 AND current_p.id=$2 AND p.company_id=$3 AND p.status='active'",[s.company_id,s.principal_id,b.company])).rows;if(target.length!==1)throw new ReadError(403,'CONTEXT_DENIED');
    const token=randomBytes(32).toString('base64url');
    await c.query('INSERT INTO bcs.application_sessions(token_hash,company_id,principal_id,portal_id,expires_at) SELECT $1,$2,$3,$4,expires_at FROM bcs.application_sessions WHERE token_hash=$5 AND expires_at>now() AND revoked_at IS NULL',[digest(token),b.company,target[0].id,b.portal,digest(requestToken(request))]);
    const current=await session(c,token); // Revalidates active company, portal ownership, scopes and roles; transaction rolls back on denial.
    await c.query('UPDATE bcs.application_sessions SET revoked_at=now() WHERE token_hash=$1',[digest(requestToken(request))]);
    return {token,home:firstAuthorizedPage(current.permissions)};
  }
  if(!s.permissions.includes('access.manage'))throw new ReadError(403,'PERMISSION_DENIED');
  if(b.action==='provision')return (await c.query('SELECT * FROM bcs.provision_company($1,$2,$3)',[text(b.code,63),text(b.name,240),text(b.plan,63)])).rows[0];
  if(b.action==='company-status'||b.action==='subscription'){
    if(!uuid.test(String(b.company)))throw new ReadError(400,'INVALID_COMPANY');
    return (await c.query('SELECT bcs.administer_company($1,$2,$3) saved',[b.company,b.action,text(b.value,80)])).rows[0];
  }
  throw new ReadError(400,'INVALID_TENANT_ACTION');
});}
