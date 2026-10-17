-- Restore ONLY 010a, after stopping runtime. Reader must be absent or NOLOGIN.
-- Ignores the retained reader CONNECT ACL during original-ACL comparison.
-- Does not undo 010 policies/migration history. Never DROP OWNED/CASCADE.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='bcs_recipient_reader' AND rolcanlogin) THEN RAISE EXCEPTION 'Stop runtime and disable reader LOGIN before recovery'; END IF;
 IF md5(pg_get_functiondef('public.rls_auto_enable()'::regprocedure))<>'846ec2fbff751d24b890656d63c3a9bf' THEN RAISE EXCEPTION 'Review function drift before restore'; END IF;
 IF (SELECT datacl::text FROM pg_database WHERE datname='postgres') IS DISTINCT FROM '{=c/postgres,postgres=CTc/postgres,supabase_etl_admin=CT/postgres,supabase_storage_admin=CT/postgres,dashboard_user=CTc/postgres,anon=T/postgres,authenticated=T/postgres,authenticator=T/postgres,pgbouncer=T/postgres,service_role=T/postgres,supabase_auth_admin=T/postgres,supabase_privileged_role=T/postgres,supabase_read_only_user=T/postgres,supabase_realtime_admin=T/postgres,supabase_replication_admin=T/postgres,bcs_recipient_reader=c/postgres}' OR (SELECT proacl::text FROM pg_proc WHERE oid='public.rls_auto_enable()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'Post-deployment ACL drift; review recovery instead of overwriting'; END IF;
END $guard$;
GRANT TEMPORARY ON DATABASE postgres TO PUBLIC;
REVOKE TEMPORARY ON DATABASE postgres FROM "anon", "authenticated", "authenticator", "pgbouncer", "service_role", "supabase_auth_admin", "supabase_etl_admin", "supabase_privileged_role", "supabase_read_only_user", "supabase_realtime_admin", "supabase_replication_admin", "supabase_storage_admin";
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC;
DO $verify$ BEGIN
 IF (SELECT array_remove(datacl,'bcs_recipient_reader=c/postgres'::aclitem)::text FROM pg_database WHERE datname='postgres') IS DISTINCT FROM '{=Tc/postgres,postgres=CTc/postgres,supabase_etl_admin=C/postgres,supabase_storage_admin=C/postgres,dashboard_user=CTc/postgres}' THEN RAISE EXCEPTION 'Original database ACL not restored'; END IF;
END $verify$;
COMMIT;
