-- Step 3C-2B, owner-authorized bcs-dev remediation v1. Run before 010.
-- No CONNECT revoke; preserve all existing non-system roles' effective TEMP access.
-- All changes are transactional. No application data or extension object changes.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $check$
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='bcs_recipient_reader') THEN RAISE EXCEPTION 'Target/role state mismatch'; END IF;
 IF (SELECT datacl::text FROM pg_database WHERE datname=current_database()) IS DISTINCT FROM '{=Tc/postgres,postgres=CTc/postgres,supabase_etl_admin=C/postgres,supabase_storage_admin=C/postgres,dashboard_user=CTc/postgres}' THEN RAISE EXCEPTION 'Database ACL drift'; END IF;
 IF (SELECT proacl::text FROM pg_proc WHERE oid='public.rls_auto_enable()'::regprocedure) IS DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
 OR md5(pg_get_functiondef('public.rls_auto_enable()'::regprocedure))<>'846ec2fbff751d24b890656d63c3a9bf' THEN RAISE EXCEPTION 'Function drift'; END IF;
 IF (SELECT array_agg(rolname::text ORDER BY rolname) FROM pg_roles WHERE rolname !~ '^pg_') IS DISTINCT FROM ARRAY['anon','authenticated','authenticator','dashboard_user','pgbouncer','postgres','service_role','supabase_admin','supabase_auth_admin','supabase_etl_admin','supabase_privileged_role','supabase_read_only_user','supabase_realtime_admin','supabase_replication_admin','supabase_storage_admin']::text[] THEN RAISE EXCEPTION 'Role inventory drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_event_trigger WHERE evtname='ensure_rls' AND evtfoid='public.rls_auto_enable()'::regprocedure AND evtenabled='O' AND evtevent='ddl_command_end') THEN RAISE EXCEPTION 'RLS event trigger drift'; END IF;
END $check$;
GRANT TEMPORARY ON DATABASE postgres TO "anon", "authenticated", "authenticator", "pgbouncer", "service_role", "supabase_auth_admin", "supabase_etl_admin", "supabase_privileged_role", "supabase_read_only_user", "supabase_realtime_admin", "supabase_replication_admin", "supabase_storage_admin";
REVOKE TEMPORARY ON DATABASE postgres FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname !~ '^pg_' AND NOT has_database_privilege(oid,'postgres','TEMPORARY')) THEN RAISE EXCEPTION 'Existing service TEMP permission lost'; END IF;
 IF EXISTS(SELECT 1 FROM pg_database d CROSS JOIN LATERAL aclexplode(d.datacl) a WHERE datname='postgres' AND grantee=0 AND privilege_type='TEMPORARY') THEN RAISE EXCEPTION 'PUBLIC TEMP remains'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_database d CROSS JOIN LATERAL aclexplode(d.datacl) a WHERE datname='postgres' AND grantee=0 AND privilege_type='CONNECT') THEN RAISE EXCEPTION 'PUBLIC CONNECT lost'; END IF;
END $verify$;
COMMIT;
