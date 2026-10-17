-- UNEXECUTED. Owner runs as bcs_recipient_reader AFTER approval/provisioning.
-- psql variables demo_company and demo_portal must contain reviewed synthetic UUIDs.
-- These are read-only probes; every transaction is rolled back. No data creation.
SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user;
BEGIN READ ONLY;
-- All six counts must be zero: without_scope.
SELECT 'companies' AS table_name,count(*) AS must_be_zero FROM bcs.companies
UNION ALL
SELECT 'portals' AS table_name,count(*) AS must_be_zero FROM bcs.portals
UNION ALL
SELECT 'recipients' AS table_name,count(*) AS must_be_zero FROM bcs.recipients
UNION ALL
SELECT 'audience_groups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_groups
UNION ALL
SELECT 'audience_subgroups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_subgroups
UNION ALL
SELECT 'recipient_group_memberships' AS table_name,count(*) AS must_be_zero FROM bcs.recipient_group_memberships;
SELECT set_config('bcs.company_id','invalid',true),set_config('bcs.portal_id','invalid',true);
-- All six counts must be zero: invalid_scope.
SELECT 'companies' AS table_name,count(*) AS must_be_zero FROM bcs.companies
UNION ALL
SELECT 'portals' AS table_name,count(*) AS must_be_zero FROM bcs.portals
UNION ALL
SELECT 'recipients' AS table_name,count(*) AS must_be_zero FROM bcs.recipients
UNION ALL
SELECT 'audience_groups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_groups
UNION ALL
SELECT 'audience_subgroups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_subgroups
UNION ALL
SELECT 'recipient_group_memberships' AS table_name,count(*) AS must_be_zero FROM bcs.recipient_group_memberships;
ROLLBACK;
BEGIN READ ONLY;
SELECT set_config('bcs.company_id', :'demo_company', true),set_config('bcs.portal_id', :'demo_portal', true);
SELECT status,count(*) FROM bcs.recipients GROUP BY status ORDER BY status;
SELECT count(*) AS expected_4 FROM bcs.audience_groups;
SELECT count(*) AS expected_12 FROM bcs.audience_subgroups;
SELECT count(*) AS expected_240 FROM bcs.recipient_group_memberships;
SELECT count(*) AS must_be_zero_other_company FROM bcs.recipients WHERE company_id<> :'demo_company'::uuid;
SELECT count(*) AS must_be_zero_other_portal FROM bcs.recipients WHERE portal_id<> :'demo_portal'::uuid;
SELECT set_config('bcs.company_id','00000000-0000-0000-0000-000000000001',true);
-- All six counts must be zero: different_company.
SELECT 'companies' AS table_name,count(*) AS must_be_zero FROM bcs.companies
UNION ALL
SELECT 'portals' AS table_name,count(*) AS must_be_zero FROM bcs.portals
UNION ALL
SELECT 'recipients' AS table_name,count(*) AS must_be_zero FROM bcs.recipients
UNION ALL
SELECT 'audience_groups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_groups
UNION ALL
SELECT 'audience_subgroups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_subgroups
UNION ALL
SELECT 'recipient_group_memberships' AS table_name,count(*) AS must_be_zero FROM bcs.recipient_group_memberships;
SELECT set_config('bcs.company_id', :'demo_company',true),set_config('bcs.portal_id','00000000-0000-0000-0000-000000000002',true);
-- All six counts must be zero: different_portal.
SELECT 'companies' AS table_name,count(*) AS must_be_zero FROM bcs.companies
UNION ALL
SELECT 'portals' AS table_name,count(*) AS must_be_zero FROM bcs.portals
UNION ALL
SELECT 'recipients' AS table_name,count(*) AS must_be_zero FROM bcs.recipients
UNION ALL
SELECT 'audience_groups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_groups
UNION ALL
SELECT 'audience_subgroups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_subgroups
UNION ALL
SELECT 'recipient_group_memberships' AS table_name,count(*) AS must_be_zero FROM bcs.recipient_group_memberships;
ROLLBACK;
-- Same connection, fresh transaction: scope must not survive rollback.
BEGIN READ ONLY;
-- All six counts must be zero: reused_connection.
SELECT 'companies' AS table_name,count(*) AS must_be_zero FROM bcs.companies
UNION ALL
SELECT 'portals' AS table_name,count(*) AS must_be_zero FROM bcs.portals
UNION ALL
SELECT 'recipients' AS table_name,count(*) AS must_be_zero FROM bcs.recipients
UNION ALL
SELECT 'audience_groups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_groups
UNION ALL
SELECT 'audience_subgroups' AS table_name,count(*) AS must_be_zero FROM bcs.audience_subgroups
UNION ALL
SELECT 'recipient_group_memberships' AS table_name,count(*) AS must_be_zero FROM bcs.recipient_group_memberships;
ROLLBACK;
SELECT r.rolname,has_schema_privilege(r.rolname,'bcs','USAGE') AS must_be_false
FROM pg_roles r WHERE rolname IN ('anon','authenticated','service_role');
-- Owner additionally tests REAL other-company and other-portal UUIDs if present:
-- substitute them as settings above. No test records are created by this file.

-- Read-only catalog checks: each forbidden privilege below must be false.
SELECT current_database()='postgres' AS correct_database,
 has_database_privilege(current_user,current_database(),'CONNECT') AS connect_required,
 has_database_privilege(current_user,current_database(),'CREATE,TEMPORARY') AS forbidden_ddl;
SELECT n.nspname,c.relname,
 has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 OR has_any_column_privilege(c.oid,'INSERT,UPDATE,REFERENCES') AS forbidden_write
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='bcs' AND c.relkind IN ('r','p');
-- Do not issue even rollback-wrapped INSERT/UPDATE/DELETE/TRUNCATE/CREATE during this task.
