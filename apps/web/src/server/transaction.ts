import type { PoolClient } from "pg";
import { ReadError, uuid } from "./validation";
export type Connection = Pick<PoolClient, "query" | "release">;
export interface Scope { company: string; portal: string }
export const requiredTables = ["companies", "portals", "recipients", "audience_groups", "audience_subgroups", "recipient_group_memberships"];
// Only the fingerprinted native pg_stat_statements 1.11 monitoring views are excepted from unexpected reads.
// Writes and all BCS/role/DDL/function checks remain mandatory.
// Catalog-only gate precedes all application reads. Fail closed on role drift.
export const roleCheck = `SELECT current_database() = 'postgres' AND current_user = 'bcs_recipient_reader' AND r.rolcanlogin
 AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication)
 AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member=r.oid)
 AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relowner=r.oid)
 AND NOT has_database_privilege(current_user,current_database(),'CREATE,TEMPORARY')
 AND NOT EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND has_schema_privilege(current_user,n.oid,'CREATE'))
 AND (SELECT count(*)=6 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='bcs' AND c.relname=ANY($1::text[]) AND c.relrowsecurity AND c.relforcerowsecurity AND has_table_privilege(c.oid,'SELECT'))
 AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f')
 AND (has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(c.oid,'INSERT,UPDATE,REFERENCES') OR ((n.nspname<>'bcs' OR c.relname <> ALL($1::text[])) AND NOT (n.nspname='extensions' AND c.relkind='v' AND pg_get_userbyid(c.relowner)='postgres'
 AND ((c.relname='pg_stat_statements' AND CASE WHEN c.relkind='v' THEN md5(pg_get_viewdef(c.oid)) END='ad1495ce5b4c54e4501e907a1f6aae8c')
 OR (c.relname='pg_stat_statements_info' AND CASE WHEN c.relkind='v' THEN md5(pg_get_viewdef(c.oid)) END='1807985dc152d2828720e1272d549775'))
 AND EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
 WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e' AND e.extname='pg_stat_statements' AND e.extversion='1.11')
 AND (SELECT count(*)=2 FROM pg_proc mp JOIN pg_namespace mn ON mn.oid=mp.pronamespace
 WHERE mn.nspname='extensions' AND NOT mp.prosecdef AND pg_get_userbyid(mp.proowner)='postgres'
 AND ((mp.proname='pg_stat_statements' AND CASE WHEN mp.prokind='f' THEN md5(pg_get_functiondef(mp.oid)) END='507a52a27907a48b0018326a15b3c595')
 OR (mp.proname='pg_stat_statements_info' AND CASE WHEN mp.prokind='f' THEN md5(pg_get_functiondef(mp.oid)) END='1ab5e3c4a7d6213abb0022730b9931ce')))) AND (has_table_privilege(c.oid,'SELECT') OR has_any_column_privilege(c.oid,'SELECT')))))
 AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND CASE WHEN c.relkind='S' THEN has_sequence_privilege(c.oid,'USAGE,SELECT,UPDATE') ELSE false END)
 AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND (n.nspname='bcs' OR p.prosecdef) AND has_function_privilege(p.oid,'EXECUTE')) AS safe
 FROM pg_roles r WHERE r.rolname=current_user`;
export async function scopedRead<T>(connect: () => Promise<Connection>, scope: Scope, read: (client: Connection) => Promise<T>): Promise<T> {
  if (!uuid.test(scope.company) || !uuid.test(scope.portal)) throw new ReadError(403, "INVALID_SCOPE");
  const client = await connect(); let discard = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '4000ms'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '8000ms'");
    await client.query("SET LOCAL search_path = pg_catalog");
    const role = await client.query(roleCheck, [requiredTables]);
    if (role.rows[0]?.safe !== true) throw new ReadError(503, "UNSAFE_RUNTIME_ROLE");
    await client.query("SELECT set_config('bcs.company_id',$1,true), set_config('bcs.portal_id',$2,true)", [scope.company, scope.portal]);
    const identity = await client.query("SELECT c.id FROM bcs.companies c JOIN bcs.portals p ON p.company_id=c.id WHERE c.id=$1::uuid AND p.id=$2::uuid AND c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo'", [scope.company, scope.portal]);
    if (identity.rows.length !== 1) throw new ReadError(403, "INVALID_SCOPE");
    return await read(client);
  } finally {
    try { await client.query("ROLLBACK"); } catch { discard = true; }
    client.release(discard);
  }
}
