BEGIN;
SET LOCAL search_path=pg_catalog;
DO $g$ BEGIN IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=13) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=14) THEN RAISE EXCEPTION 'Migration order mismatch at 014'; END IF; END $g$;
GRANT SELECT,INSERT ON bcs.class_events,bcs.notification_rules TO bcs_app_backend;
GRANT SELECT,INSERT,UPDATE(state) ON bcs.scheduled_notifications TO bcs_app_backend;
DO $p$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['class_events','notification_rules','scheduled_notifications'] LOOP
 EXECUTE format('CREATE POLICY app_schedule_read ON bcs.%I FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''scheduling.manage''))',t);
 EXECUTE format('CREATE POLICY app_schedule_insert ON bcs.%I FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,''scheduling.manage''))',t);
 END LOOP; END $p$;
CREATE POLICY app_schedule_update ON bcs.scheduled_notifications FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'scheduling.manage')) WITH CHECK(bcs.session_allows(company_id,portal_id,'scheduling.manage'));
GRANT SELECT ON bcs.audience_groups,bcs.audience_subgroups TO bcs_app_backend;
DO $p$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['audience_groups','audience_subgroups','email_templates'] LOOP
 EXECUTE format('CREATE POLICY app_schedule_lookup ON bcs.%I FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''scheduling.manage''))',t);
 END LOOP; END $p$;
CREATE POLICY app_schedule_audit ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'scheduling.manage'));
INSERT INTO bcs.schema_migrations(version,description) VALUES(14,'Scoped immutable class revisions and durable dry-run notification scheduling');
COMMIT;
