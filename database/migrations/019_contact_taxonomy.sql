BEGIN;
SET LOCAL search_path=pg_catalog;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=18) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=19) THEN RAISE EXCEPTION 'Migration order mismatch at 019'; END IF; END $$;
GRANT SELECT,INSERT ON bcs.audience_groups,bcs.audience_subgroups,bcs.recipient_group_memberships TO bcs_app_backend;
GRANT DELETE ON bcs.recipient_group_memberships TO bcs_app_backend;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['audience_groups','audience_subgroups','recipient_group_memberships'] LOOP
 EXECUTE format('CREATE POLICY app_api_taxonomy ON bcs.%I TO bcs_app_backend USING(bcs.api_allows(company_id,portal_id,''contacts.write'')) WITH CHECK(bcs.api_allows(company_id,portal_id,''contacts.write''))',t);
END LOOP; END $$;
INSERT INTO bcs.schema_migrations(version,description) VALUES(19,'Scoped contact import taxonomy membership maintenance');
COMMIT;
