BEGIN;
SET LOCAL search_path=pg_catalog;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=15) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=16) THEN RAISE EXCEPTION 'Migration order mismatch at 016'; END IF; END $$;
ALTER TABLE bcs.campaigns ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE bcs.campaigns ADD COLUMN creation_hash text;
GRANT SELECT(id,company_id,portal_id,name,email,email_normalized,status,target_id,recipient_group) ON bcs.recipients TO bcs_app_backend;
GRANT SELECT ON bcs.recipient_preferences,bcs.recipient_group_memberships TO bcs_app_backend;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['recipients','recipient_preferences','recipient_group_memberships'] LOOP
 EXECUTE format('CREATE POLICY app_campaign_source ON bcs.%I FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''compose.draft''))',t);
END LOOP; END $$;
CREATE POLICY app_campaign_suppression ON bcs.email_suppressions FOR SELECT TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.recipients r WHERE r.company_id=email_suppressions.company_id AND r.email_normalized=email_suppressions.email_normalized AND bcs.session_allows(r.company_id,r.portal_id,'compose.draft')));
GRANT SELECT,INSERT ON bcs.audience_selections,bcs.audience_selection_overrides,bcs.campaigns,bcs.campaign_recipients,bcs.outbound_messages TO bcs_app_backend;
GRANT UPDATE(selection_status) ON bcs.audience_selections TO bcs_app_backend;
GRANT UPDATE(title,communication_class,subject_snapshot,html_snapshot,text_snapshot,selection_id,scheduled_for,timezone,priority,state,approved_by,approved_at,cancelled_at,revision) ON bcs.campaigns TO bcs_app_backend;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['audience_selections','audience_selection_overrides','campaigns','campaign_recipients','outbound_messages'] LOOP
 EXECUTE format('CREATE POLICY app_campaign_read ON bcs.%I FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''compose.draft''))',t);
 EXECUTE format('CREATE POLICY app_campaign_insert ON bcs.%I FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,''compose.draft''))',t);
END LOOP; END $$;
CREATE POLICY app_selection_update ON bcs.audience_selections FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'compose.draft') AND created_by=(SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true))) WITH CHECK(bcs.session_allows(company_id,portal_id,'compose.draft'));
CREATE POLICY app_campaign_update ON bcs.campaigns FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'compose.draft')) WITH CHECK(bcs.session_allows(company_id,portal_id,'compose.draft'));
GRANT INSERT(company_id,campaign_id,message_id,priority,available_at,is_paused) ON bcs.dispatch_jobs TO bcs_app_backend;
CREATE POLICY app_campaign_job_insert ON bcs.dispatch_jobs FOR INSERT TO bcs_app_backend WITH CHECK(is_paused AND EXISTS(SELECT 1 FROM bcs.campaigns c WHERE c.company_id=dispatch_jobs.company_id AND c.id=dispatch_jobs.campaign_id AND bcs.session_allows(c.company_id,c.portal_id,'campaigns.schedule')));
CREATE POLICY app_campaign_job_read ON bcs.dispatch_jobs FOR SELECT TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.campaigns c WHERE c.company_id=dispatch_jobs.company_id AND c.id=dispatch_jobs.campaign_id AND bcs.session_allows(c.company_id,c.portal_id,'compose.draft')));
CREATE POLICY app_campaign_audit ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'compose.draft'));
CREATE POLICY app_campaign_audit_read ON bcs.audit_events FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'compose.draft'));
INSERT INTO bcs.schema_migrations(version,description) VALUES(16,'Authenticated selection snapshots and paused campaign queue preparation');
COMMIT;
