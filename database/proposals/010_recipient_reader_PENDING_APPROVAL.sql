-- OWNER-AUTHORIZED / UNEXECUTED. Verify target and all security prerequisites before execution. bcs-dev ONLY.
-- Review this entire file first. NOT part of automatic application startup.
-- Step 3C-2 review: LOGIN is declared; no password is included or provisioned.
-- Owner separately provisions a NEW credential securely after approval; never reuse the exposed one.
-- Dedicated identity cannot be reused for customer data or production.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$
DECLARE company uuid; portal uuid; table_name text; predicate text;
BEGIN
 IF current_database()<>'postgres' THEN RAISE EXCEPTION 'Wrong database; expected postgres in owner-verified bcs-dev'; END IF;
 IF NOT EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version=9)
 OR EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version=10)
 OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bcs_recipient_reader') THEN
   RAISE EXCEPTION 'Stop: migration prerequisite or runtime role conflicts';
 END IF;
 SELECT c.id,p.id INTO STRICT company,portal FROM bcs.companies c
 JOIN bcs.portals p ON p.company_id=c.id
 WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo';
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='bcs' AND tablename IN
 ('companies','portals','recipients','audience_groups','audience_subgroups','recipient_group_memberships')) THEN
   RAISE EXCEPTION 'Existing policies require independent review; do not overwrite';
 END IF;
 CREATE ROLE bcs_recipient_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
 -- Defense in depth, not a substitute for grants/RLS (the login can reset this setting).
 ALTER ROLE bcs_recipient_reader SET default_transaction_read_only = on;
 GRANT CONNECT ON DATABASE postgres TO bcs_recipient_reader;
 -- PUBLIC privileges are additive even with NOINHERIT. A per-role REVOKE cannot deny them.
 -- Abort the entire transaction; do not revoke from PUBLIC or alter other roles here.
 IF has_database_privilege('bcs_recipient_reader',current_database(),'CREATE,TEMPORARY')
 OR EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_'
   AND n.nspname<>'information_schema' AND has_schema_privilege('bcs_recipient_reader',n.oid,'CREATE')) THEN
   RAISE EXCEPTION 'Inherited DDL privileges detected; STOP for separately reviewed PUBLIC/schema privilege remediation';
 END IF;
 GRANT USAGE ON SCHEMA bcs TO bcs_recipient_reader;
 FOREACH table_name IN ARRAY ARRAY['companies','portals','recipients','audience_groups','audience_subgroups','recipient_group_memberships'] LOOP
   IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='bcs' AND c.relname=table_name AND c.relrowsecurity AND c.relforcerowsecurity) THEN
     RAISE EXCEPTION 'Required FORCE RLS missing';
   END IF;
   -- Compare as text: missing/empty/malformed settings return no rows, never bypass RLS.
   -- Literal IDs bind this role permanently to the synthetic portal; GUCs alone are NOT authority.
   predicate := format('current_setting(''bcs.company_id'',true)=%L AND current_setting(''bcs.portal_id'',true)=%L',company::text,portal::text);
   IF table_name='companies' THEN predicate := predicate || format(' AND id=%L::uuid',company);
   ELSIF table_name='portals' THEN predicate := predicate || format(' AND company_id=%L::uuid AND id=%L::uuid',company,portal);
   ELSE predicate := predicate || format(' AND company_id=%L::uuid AND portal_id=%L::uuid',company,portal);
   END IF;
   EXECUTE format('GRANT SELECT ON bcs.%I TO bcs_recipient_reader',table_name);
   EXECUTE format('CREATE POLICY bcs_demo_read ON bcs.%I FOR SELECT TO bcs_recipient_reader USING (%s)',table_name,predicate);
   -- Restrictive policy prevents a future permissive policy from broadening this demo identity.
   EXECUTE format('CREATE POLICY bcs_demo_boundary ON bcs.%I AS RESTRICTIVE FOR SELECT TO bcs_recipient_reader USING (%s)',table_name,predicate);
 END LOOP;
 -- Effective privileges include PUBLIC grants. Do not assume that the grants above are exhaustive.
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f')
   AND (has_table_privilege('bcs_recipient_reader',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('bcs_recipient_reader',c.oid,'INSERT,UPDATE,REFERENCES')
   OR ((n.nspname<>'bcs' OR c.relname NOT IN ('companies','portals','recipients','audience_groups','audience_subgroups','recipient_group_memberships'))
   AND NOT (n.nspname='extensions' AND c.relkind='v' AND pg_get_userbyid(c.relowner)='postgres'
 AND ((c.relname='pg_stat_statements' AND CASE WHEN c.relkind='v' THEN md5(pg_get_viewdef(c.oid)) END='ad1495ce5b4c54e4501e907a1f6aae8c')
 OR (c.relname='pg_stat_statements_info' AND CASE WHEN c.relkind='v' THEN md5(pg_get_viewdef(c.oid)) END='1807985dc152d2828720e1272d549775'))
 AND EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
 WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e' AND e.extname='pg_stat_statements' AND e.extversion='1.11')
 AND (SELECT count(*)=2 FROM pg_proc mp JOIN pg_namespace mn ON mn.oid=mp.pronamespace
 WHERE mn.nspname='extensions' AND NOT mp.prosecdef AND pg_get_userbyid(mp.proowner)='postgres'
 AND ((mp.proname='pg_stat_statements' AND CASE WHEN mp.prokind='f' THEN md5(pg_get_functiondef(mp.oid)) END='507a52a27907a48b0018326a15b3c595')
 OR (mp.proname='pg_stat_statements_info' AND CASE WHEN mp.prokind='f' THEN md5(pg_get_functiondef(mp.oid)) END='1ab5e3c4a7d6213abb0022730b9931ce'))))
   AND (has_table_privilege('bcs_recipient_reader',c.oid,'SELECT') OR has_any_column_privilege('bcs_recipient_reader',c.oid,'SELECT')))))
 OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND CASE WHEN c.relkind='S' THEN has_sequence_privilege('bcs_recipient_reader',c.oid,'USAGE,SELECT,UPDATE') ELSE false END)
 OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
   AND (n.nspname='bcs' OR p.prosecdef) AND has_function_privilege('bcs_recipient_reader',p.oid,'EXECUTE')) THEN
   RAISE EXCEPTION 'Unexpected inherited table/function access; STOP for separate privilege review';
 END IF;
END $guard$;
INSERT INTO bcs.schema_migrations(version,description) VALUES(10,'Owner-reviewed synthetic recipient read identity; LOGIN declared; credential provisioned separately');
COMMIT;

-- Owner verification (catalog-only; no application writes):
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
FROM pg_roles WHERE rolname='bcs_recipient_reader';
SELECT table_name,privilege_type FROM information_schema.role_table_grants
WHERE grantee='bcs_recipient_reader' ORDER BY table_name,privilege_type;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual FROM pg_policies
WHERE schemaname='bcs' AND policyname IN ('bcs_demo_read','bcs_demo_boundary');
-- Also execute 010_VERIFY_READ_ONLY.sql only after separate approval, as the runtime role.
-- Provide only these resolved UUIDs in ignored server .env.local, never API responses:
SELECT c.id AS company_id,p.id AS portal_id FROM bcs.companies c JOIN bcs.portals p ON p.company_id=c.id
WHERE c.company_code='softvat-bcs-demo' AND p.portal_code='skillmonk-demo';

-- ROLLBACK / REVOCATION PLAN (manual owner approval; NOT executed below):
-- 1. Stop local BCS server. ALTER ROLE bcs_recipient_reader NOLOGIN;
-- 2. REVOKE SELECT ON bcs.companies,bcs.portals,bcs.recipients,bcs.audience_groups,
--    bcs.audience_subgroups,bcs.recipient_group_memberships FROM bcs_recipient_reader;
-- 3. REVOKE CONNECT ON DATABASE postgres FROM bcs_recipient_reader;
--    REVOKE USAGE ON SCHEMA bcs FROM bcs_recipient_reader;
-- 4. Drop bcs_demo_read and bcs_demo_boundary on each of the six named tables only.
-- 5. Review dependencies before DROP ROLE; do not DROP OWNED/CASCADE.
-- 6. Keep migration history; record revocation in a new reviewed migration.

-- Effective privilege inspection (owner-run only after approval, no data writes):
SELECT has_database_privilege('bcs_recipient_reader','postgres','CONNECT') AS connect_required,
 has_database_privilege('bcs_recipient_reader','postgres','CREATE') AS create_must_be_false,
 has_database_privilege('bcs_recipient_reader','postgres','TEMPORARY') AS temp_must_be_false;
SELECT nspname FROM pg_namespace WHERE nspname !~ '^pg_'
 AND nspname<>'information_schema' AND has_schema_privilege('bcs_recipient_reader',oid,'CREATE'); -- zero rows
-- LOGIN alone does not provide a password. Do not place password SQL in this file,
-- SQL Editor history, terminal arguments, reports or chat. Use an owner-controlled,
-- non-logging credential management route. If unavailable, STOP rather than improvise.
