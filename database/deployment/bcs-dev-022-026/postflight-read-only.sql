BEGIN READ ONLY;
SET LOCAL statement_timeout='8s';
SELECT current_database(),current_user,current_setting('transaction_read_only');
SELECT version,description FROM bcs.schema_migrations ORDER BY version;
SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='bcs'::regnamespace AND relkind='r' ORDER BY relname;
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname IN ('bcs_app_backend','bcs_simulation_worker');
SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE schemaname='bcs' AND (policyname LIKE 'csv_%' OR tablename='embed_grants');
SELECT p.proname,r.rolname AS owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.pronamespace='bcs'::regnamespace ORDER BY p.proname;
-- No recipient records, authentication secrets or configuration values are returned.
ROLLBACK;
