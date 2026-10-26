import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { localRequest, ReadError } from "./validation";
import { authenticatePassword } from "./supabase-auth";
import { firstAuthorizedPage } from "../role-home";
import { resolveMembership } from "./tenant-context";
let pool: Pool | undefined;
export const sessionCookie = "bcs_session";
export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function checkPassword(value: string, encoded: string) {
  const [salt, expected] = encoded.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(expected ?? "")) return false;
  const actual = scryptSync(value, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
function backendPool() {
  if (process.env.NODE_ENV !== "development" || process.env.BCS_APPLICATION_MODE !== "authenticated") throw new ReadError(503,"APPLICATION_NOT_CONFIGURED");
  if (!pool) {
    try {
      const url = new URL(process.env.BCS_APP_DATABASE_URL ?? "");
      const isolated=process.env.BCS_ISOLATED_ACCEPTANCE==='I_CONFIRM_DISPOSABLE_LOCAL_DATABASE'&&url.hostname==='127.0.0.1'&&Number(url.port)>=1024&&url.pathname==='/bcs_consolidated_isolated'&&url.username==='bcs_app_backend';
      if (!/^bcs_app_backend(?:\.[a-z0-9]+)?$/.test(decodeURIComponent(url.username)) || !url.password || (url.pathname !== "/postgres"&&!isolated) || url.search || url.hash || !["postgres:","postgresql:"].includes(url.protocol)) throw Error();
      pool = new Pool({ connectionString:url.toString(),ssl:isolated?false:{ca:readFileSync(/* turbopackIgnore: true */ process.env.BCS_DATABASE_CA_FILE ?? "","utf8"),rejectUnauthorized:true},max:3,connectionTimeoutMillis:5000,query_timeout:8000 });
      pool.on("error",()=>{});
    } catch { throw new ReadError(503,"APPLICATION_NOT_CONFIGURED"); }
  }
  return pool;
}
export async function transaction<T>(work:(c:PoolClient)=>Promise<T>) {
  const c=await backendPool().connect();let discard=false;
  try {
    await c.query("BEGIN");await c.query("SET LOCAL statement_timeout='6000ms'");await c.query("SET LOCAL idle_in_transaction_session_timeout='10000ms'");await c.query("SET LOCAL search_path=pg_catalog");
    const role=await c.query("SELECT current_user='bcs_app_backend' AND NOT(rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication) AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMPORARY') AS safe FROM pg_roles r WHERE rolname=current_user");
    if(role.rows[0]?.safe!==true)throw new ReadError(503,"UNSAFE_RUNTIME_ROLE");
    if(process.env.BCS_ISOLATED_ACCEPTANCE==='I_CONFIRM_DISPOSABLE_LOCAL_DATABASE'){const guard=await c.query("SELECT current_database()='bcs_consolidated_isolated' AND shobj_description(oid,'pg_database')='BCS_DISPOSABLE_SYNTHETIC_ONLY' safe FROM pg_database WHERE datname=current_database()");if(guard.rows[0]?.safe!==true)throw new ReadError(503,'ISOLATED_DATABASE_MARKER_REQUIRED');}
    const value=await work(c);await c.query("COMMIT");return value;
  } catch(e) {try{await c.query("ROLLBACK");}catch{discard=true;}throw e;} finally{c.release(discard);}
}
export interface Session { company_id:string; principal_id:string; portal_id:string; display_name:string; permissions:string[] }
export function requestToken(request:Request) {
  const value=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length+1)??"";
  if(!/^[A-Za-z0-9_-]{43}$/.test(value))throw new ReadError(401,"LOGIN_REQUIRED");return value;
}
export async function session(c:PoolClient,token:string):Promise<Session> {
  await c.query("SELECT set_config('bcs.session_hash',$1,true)",[digest(token)]);
  const r=await c.query(`SELECT s.company_id,s.principal_id,s.portal_id,u.display_name,
 ARRAY(SELECT DISTINCT rp.permission_code FROM bcs.principal_role_assignments a JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id WHERE a.company_id=s.company_id AND a.principal_id=s.principal_id AND (a.portal_id IS NULL OR a.portal_id=s.portal_id) AND (a.expires_at IS NULL OR a.expires_at>now())) AS permissions
 FROM bcs.application_sessions s
 JOIN bcs.principals u ON u.company_id=s.company_id AND u.id=s.principal_id AND u.status='active'
 JOIN bcs.companies co ON co.id=s.company_id AND co.status IN ('active','trial')
 JOIN bcs.portals po ON po.company_id=s.company_id AND po.id=s.portal_id AND po.status IN ('draft','active')
 JOIN bcs.principal_portal_scopes sc ON sc.company_id=s.company_id AND sc.principal_id=s.principal_id AND sc.portal_id=s.portal_id
 WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND coalesce(to_jsonb(s)->>'embed_origin','')=''
 AND EXISTS (SELECT 1 FROM bcs.principal_role_assignments a
   JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id
   WHERE a.company_id=s.company_id AND a.principal_id=s.principal_id
   AND (a.portal_id IS NULL OR a.portal_id=s.portal_id)
   AND (a.expires_at IS NULL OR a.expires_at>now()))`,[digest(token)]);
  if(r.rows.length!==1)throw new ReadError(401,"LOGIN_REQUIRED");return r.rows[0];
}
function checkRequest(request:Request,write=false) {
  const url=new URL(request.url),host=request.headers.get("host")??url.host;
  if(!/^(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$/.test(host))throw new ReadError(403,"LOCAL_DEMO_ONLY");
  const canonical=new URL(url);canonical.host=host;
  localRequest(new Request(canonical,{headers:request.headers}),process.env.NODE_ENV);
  if(write && request.headers.get("origin")!==canonical.origin)throw new ReadError(403,"CSRF_REJECTED");
}
/** Read a valid company-and-portal-scoped session without requiring dashboard.view.
 * UI routing is NOT authorization: each feature API still uses authorized(). */
export async function validSession<T>(request:Request,work:(c:PoolClient,s:Session)=>Promise<T>) {
  checkRequest(request,request.method!=="GET");
  const token=requestToken(request);
  return transaction(async c=>work(c,await session(c,token)));
}
export async function authorized<T>(request:Request,permission:string,work:(c:PoolClient,s:Session)=>Promise<T>) {
  return validSession(request,async(c,s)=>{if(!s.permissions.includes(permission))throw new ReadError(403,"PERMISSION_DENIED");return work(c,s);});
}
export async function login(request:Request) {
  checkRequest(request,true);
  const body=await jsonBody(request);
  const email=typeof body.username==='string'?body.username.trim().toLowerCase():'';
  const password=typeof body.password==='string'?body.password:'';
  const identity=await authenticatePassword(email,password);
  const token=randomBytes(32).toString("base64url");
  let home = '/';
  await transaction(async c=>{
    // Mapping is explicitly provisioned by subject + trusted issuer; never by email.
    const principal=await c.query("SELECT id,company_id FROM bcs.principals WHERE identity_issuer=$1 AND external_subject=$2 AND status='active'",[identity.issuer,identity.subject]);
    const owner=resolveMembership(principal.rows,body.companyId);
    const scopes=await c.query(`SELECT sc.portal_id FROM bcs.principal_portal_scopes sc
      JOIN bcs.portals po ON po.company_id=sc.company_id AND po.id=sc.portal_id AND po.status IN ('draft','active')
      JOIN bcs.companies co ON co.id=sc.company_id AND co.status IN ('active','trial')
      WHERE sc.company_id=$1 AND sc.principal_id=$2
      AND EXISTS (SELECT 1 FROM bcs.principal_role_assignments a
        JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id
        WHERE a.company_id=sc.company_id AND a.principal_id=sc.principal_id
        AND (a.portal_id IS NULL OR a.portal_id=sc.portal_id)
        AND (a.expires_at IS NULL OR a.expires_at>now()))
      ORDER BY sc.portal_id`,[owner.company_id,owner.id]);
    if(!scopes.rowCount)throw new ReadError(403,"ACCOUNT_NOT_AUTHORIZED");
    await c.query("INSERT INTO bcs.application_sessions(token_hash,company_id,principal_id,portal_id,expires_at) VALUES($1,$2,$3,$4,now()+($5::int*interval '1 second'))",[digest(token),owner.company_id,owner.id,scopes.rows[0].portal_id,identity.expiresIn]);
    const current = await session(c,token);
    home = firstAuthorizedPage(current.permissions);
    try {const old=requestToken(request);await c.query("UPDATE bcs.application_sessions SET revoked_at=now() WHERE token_hash=$1",[digest(old)]);}catch(e){if(!(e instanceof ReadError&&e.code==='LOGIN_REQUIRED'))throw e;}
  });
  return {token,maxAge:identity.expiresIn,home};
}
export async function jsonBody(request:Request):Promise<Record<string,unknown>> {
  if(!request.headers.get("content-type")?.startsWith("application/json"))throw new ReadError(415,"JSON_REQUIRED");
  const text=await request.text();if(text.length>150000)throw new ReadError(413,"BODY_TOO_LARGE");
  try {const b:unknown=JSON.parse(text);if(!b||typeof b!=="object"||Array.isArray(b))throw Error();return b as Record<string,unknown>;}catch{throw new ReadError(400,"INVALID_BODY");}
}
export async function response(work:()=>Promise<unknown>) {
 const requestId=randomBytes(12).toString("hex");try{return Response.json({data:await work(),requestId},{headers:{"Cache-Control":"no-store"}});}catch(e){const known=e instanceof ReadError;const schemaMissing=typeof e==="object"&&e!==null&&"code" in e&&["42P01","42703","42883"].includes(String(e.code));return Response.json({error:{code:known?e.code:schemaMissing?"DATABASE_SCHEMA_NOT_READY":"APPLICATION_UNAVAILABLE",message:known?e.code:schemaMissing?"Required database objects are unavailable. Review unapplied migrations; no demo fallback was used.":"The operation could not be completed.",requestId}},{status:known?e.status:503,headers:{"Cache-Control":"no-store"}});}
}
