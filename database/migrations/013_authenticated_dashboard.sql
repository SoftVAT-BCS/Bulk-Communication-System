-- Authenticated dashboard aggregates. No provider credential references are exposed.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=12) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=13) THEN RAISE EXCEPTION 'Migration order mismatch at 013'; END IF;
END $guard$;
GRANT SELECT(id,company_id,portal_id,status) ON bcs.recipients TO bcs_app_backend;
CREATE POLICY app_dashboard_recipients ON bcs.recipients FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'dashboard.view'));
GRANT SELECT ON bcs.campaigns,bcs.outbound_messages,bcs.class_events,bcs.sending_policies TO bcs_app_backend;
DO $policies$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['campaigns','outbound_messages','class_events','sending_policies'] LOOP
 EXECUTE format('CREATE POLICY app_dashboard_read ON bcs.%I FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''dashboard.view''))',t);
 END LOOP;
END $policies$;
GRANT SELECT(id,company_id,account_code,provider,aws_region,account_status,verified_max_send_rate,verified_max_24h,checked_at) ON bcs.provider_accounts TO bcs_app_backend;
CREATE POLICY app_dashboard_providers ON bcs.provider_accounts FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,NULL,'dashboard.view'));
GRANT SELECT(id,company_id,reason,is_active) ON bcs.email_suppressions TO bcs_app_backend;
CREATE POLICY app_dashboard_suppressions ON bcs.email_suppressions FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,NULL,'dashboard.view'));
GRANT SELECT(id,company_id,message_id,event_type,occurred_at,signature_verified) ON bcs.provider_events TO bcs_app_backend;
CREATE POLICY app_dashboard_events ON bcs.provider_events FOR SELECT TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.outbound_messages m WHERE m.company_id=provider_events.company_id AND m.id=provider_events.message_id AND bcs.session_allows(m.company_id,m.portal_id,'dashboard.view')));
CREATE POLICY app_dashboard_audit ON bcs.audit_events FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'dashboard.view'));
INSERT INTO bcs.schema_migrations(version,description) VALUES(13,'Scoped authenticated dashboard reads without provider secrets');
COMMIT;
