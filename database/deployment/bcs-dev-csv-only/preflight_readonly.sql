-- Run only in existing bcs-dev. Inspect every result; no data mutations.
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SELECT current_database(),current_user,current_setting('transaction_read_only');
SELECT version,description FROM bcs.schema_migrations ORDER BY version;
SELECT rolname,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname='bcs_app_backend';
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c WHERE c.relnamespace='bcs'::regnamespace AND c.relkind='r' ORDER BY c.relname;
SELECT s.state,p.plan_code,p.status,p.plan_limits,s.begins_at<=now() AS started,(s.ends_at IS NULL OR s.ends_at>now()) AS not_expired FROM bcs.company_subscriptions s JOIN bcs.saas_plans p USING(plan_code) WHERE s.company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2';
SELECT count(*) AS preserved_recipients, md5(string_agg(md5(to_jsonb(r)::text),',' ORDER BY id)) AS preserved_fingerprint FROM bcs.recipients r WHERE company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2' AND portal_id='1dc3ad5d-35b4-4b01-aaaf-cc824fe7f52d' AND target_id<>'BCS-CSV-ACCEPT-20261019-ONE';
SELECT count(*) AS test_identity_collisions FROM bcs.recipients WHERE company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2' AND portal_id='1dc3ad5d-35b4-4b01-aaaf-cc824fe7f52d' AND (target_id='BCS-CSV-ACCEPT-20261019-ONE' OR email_normalized='bcs.csv.accept.20261019@example.invalid');
ROLLBACK;
