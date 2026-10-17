BEGIN;
SET LOCAL search_path=pg_catalog;
DO $g$ BEGIN IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=14) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=15) THEN RAISE EXCEPTION 'Migration order mismatch at 015'; END IF; END $g$;
ALTER TABLE bcs.dispatch_jobs ADD COLUMN is_paused boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN bcs.dispatch_jobs.is_paused IS 'A future dispatch worker must exclude paused jobs when claiming leases. No worker is activated by this migration.';
GRANT SELECT ON bcs.campaign_recipients,bcs.dispatch_jobs,bcs.delivery_attempts TO bcs_app_backend;
GRANT SELECT(email_normalized) ON bcs.recipients TO bcs_app_backend;
CREATE POLICY app_report_recipient ON bcs.recipients FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'reports.view') OR bcs.session_allows(company_id,portal_id,'suppression.manage'));
DO $p$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['campaigns','outbound_messages','campaign_recipients'] LOOP
 EXECUTE format('CREATE POLICY app_activity_read ON bcs.%I FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''reports.view'') OR bcs.session_allows(company_id,portal_id,''queue.manage''))',t);
 END LOOP; END $p$;
DO $p$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['dispatch_jobs','delivery_attempts','provider_events'] LOOP
 EXECUTE format('CREATE POLICY app_activity_read ON bcs.%I FOR SELECT TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.outbound_messages m WHERE m.company_id=%I.company_id AND m.id=%I.message_id AND (bcs.session_allows(m.company_id,m.portal_id,''reports.view'') OR bcs.session_allows(m.company_id,m.portal_id,''queue.manage''))))',t,t,t);
 END LOOP; END $p$;
GRANT SELECT(email_normalized,recorded_at,released_at,source_reference) ON bcs.email_suppressions TO bcs_app_backend;
CREATE POLICY app_report_suppressions ON bcs.email_suppressions FOR SELECT TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.recipients r WHERE r.company_id=email_suppressions.company_id AND r.email_normalized=email_suppressions.email_normalized AND (bcs.session_allows(r.company_id,r.portal_id,'reports.view') OR bcs.session_allows(r.company_id,r.portal_id,'suppression.manage'))));
GRANT INSERT(company_id,email_normalized,reason,source_reference),UPDATE(is_active,released_at,source_reference) ON bcs.email_suppressions TO bcs_app_backend;
CREATE POLICY app_manual_suppression_insert ON bcs.email_suppressions FOR INSERT TO bcs_app_backend WITH CHECK(reason='manual' AND bcs.session_allows(company_id,NULL,'suppression.manage'));
CREATE POLICY app_manual_suppression_update ON bcs.email_suppressions FOR UPDATE TO bcs_app_backend USING(reason='manual' AND bcs.session_allows(company_id,NULL,'suppression.manage')) WITH CHECK(reason='manual' AND bcs.session_allows(company_id,NULL,'suppression.manage'));
GRANT UPDATE(is_paused,job_state,available_at) ON bcs.dispatch_jobs TO bcs_app_backend;
CREATE POLICY app_queue_update ON bcs.dispatch_jobs FOR UPDATE TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.outbound_messages m WHERE m.company_id=dispatch_jobs.company_id AND m.id=dispatch_jobs.message_id AND bcs.session_allows(m.company_id,m.portal_id,'queue.manage'))) WITH CHECK(EXISTS(SELECT 1 FROM bcs.outbound_messages m WHERE m.company_id=dispatch_jobs.company_id AND m.id=dispatch_jobs.message_id AND bcs.session_allows(m.company_id,m.portal_id,'queue.manage')));
GRANT UPDATE(delivery_state) ON bcs.outbound_messages TO bcs_app_backend;
CREATE POLICY app_queue_message_update ON bcs.outbound_messages FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'queue.manage')) WITH CHECK(bcs.session_allows(company_id,portal_id,'queue.manage'));
CREATE POLICY app_activity_audit_insert ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'queue.manage') OR bcs.session_allows(company_id,NULL,'suppression.manage'));
CREATE POLICY app_activity_audit_read ON bcs.audit_events FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'reports.view') OR bcs.session_allows(company_id,portal_id,'queue.manage'));
INSERT INTO bcs.schema_migrations(version,description) VALUES(15,'Scoped delivery reports, manual suppression and non-dispatching queue controls');
COMMIT;
