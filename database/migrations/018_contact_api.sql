BEGIN;
SET LOCAL search_path=pg_catalog;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=17) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=18) THEN RAISE EXCEPTION 'Migration order mismatch at 018'; END IF; END $$;
CREATE FUNCTION bcs.api_context(required_scope text) RETURNS TABLE(company_id uuid,portal_id uuid,client_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT a.company_id,a.portal_id,a.id FROM bcs.api_clients a JOIN bcs.companies c ON c.id=a.company_id AND c.status IN ('trial','active') JOIN bcs.portals p ON p.company_id=a.company_id AND p.id=a.portal_id AND p.status IN ('draft','active')
 WHERE required_scope IN ('contacts.read','contacts.write') AND a.credential_hash=current_setting('bcs.api_hash',true) AND a.status='active' AND (a.expires_at IS NULL OR a.expires_at>statement_timestamp()) AND a.scopes ? required_scope;
$$;
CREATE FUNCTION bcs.api_allows(c uuid,p uuid,required_scope text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM bcs.api_context(required_scope) a WHERE a.company_id=c AND (p IS NULL OR a.portal_id=p)); $$;
REVOKE ALL ON FUNCTION bcs.api_context(text),bcs.api_allows(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION bcs.api_context(text),bcs.api_allows(uuid,uuid,text) TO bcs_app_backend;
CREATE TABLE bcs.api_request_windows(company_id uuid NOT NULL,portal_id uuid NOT NULL,api_client_id uuid NOT NULL,window_start timestamptz NOT NULL,requests integer NOT NULL CHECK(requests>0),PRIMARY KEY(company_id,api_client_id,window_start),FOREIGN KEY(company_id,api_client_id) REFERENCES bcs.api_clients(company_id,id),FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id));
ALTER TABLE bcs.api_request_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.api_request_windows FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE(requests) ON bcs.api_request_windows TO bcs_app_backend;
CREATE POLICY app_api_windows ON bcs.api_request_windows TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.api_context('contacts.write') a WHERE a.company_id=api_request_windows.company_id AND a.portal_id=api_request_windows.portal_id AND a.client_id=api_request_windows.api_client_id)) WITH CHECK(EXISTS(SELECT 1 FROM bcs.api_context('contacts.write') a WHERE a.company_id=api_request_windows.company_id AND a.portal_id=api_request_windows.portal_id AND a.client_id=api_request_windows.api_client_id));
GRANT INSERT(company_id,portal_id,target_id,name,email,recipient_group,category,status),UPDATE(name,email,recipient_group,category,status) ON bcs.recipients TO bcs_app_backend;
CREATE POLICY app_api_recipients_read ON bcs.recipients FOR SELECT TO bcs_app_backend USING(bcs.api_allows(company_id,portal_id,'contacts.write'));
CREATE POLICY app_api_recipients_insert ON bcs.recipients FOR INSERT TO bcs_app_backend WITH CHECK(status='Inactive' AND bcs.api_allows(company_id,portal_id,'contacts.write'));
CREATE POLICY app_api_recipients_update ON bcs.recipients FOR UPDATE TO bcs_app_backend USING(bcs.api_allows(company_id,portal_id,'contacts.write')) WITH CHECK(bcs.api_allows(company_id,portal_id,'contacts.write'));
GRANT SELECT,INSERT ON bcs.contact_import_batches,bcs.contact_import_errors,bcs.api_idempotency_records TO bcs_app_backend;
GRANT SELECT,INSERT,UPDATE(used_units,updated_at) ON bcs.usage_counters TO bcs_app_backend;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['contact_import_batches','contact_import_errors'] LOOP
 EXECUTE format('CREATE POLICY app_api_import ON bcs.%I TO bcs_app_backend USING(bcs.api_allows(company_id,portal_id,''contacts.write'')) WITH CHECK(bcs.api_allows(company_id,portal_id,''contacts.write''))',t);
END LOOP; END $$;
CREATE POLICY app_api_idempotency ON bcs.api_idempotency_records TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.api_context('contacts.write') a WHERE a.company_id=api_idempotency_records.company_id AND a.client_id=api_idempotency_records.api_client_id)) WITH CHECK(EXISTS(SELECT 1 FROM bcs.api_context('contacts.write') a WHERE a.company_id=api_idempotency_records.company_id AND a.client_id=api_idempotency_records.api_client_id));
CREATE POLICY app_api_usage ON bcs.usage_counters TO bcs_app_backend USING(bcs.api_allows(company_id,NULL,'contacts.write') AND metric_code='contacts.accepted') WITH CHECK(bcs.api_allows(company_id,NULL,'contacts.write') AND metric_code='contacts.accepted');
CREATE POLICY app_api_audit ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(bcs.api_allows(company_id,portal_id,'contacts.write') AND actor_principal_id IS NULL);
INSERT INTO bcs.schema_migrations(version,description) VALUES(18,'Scoped client-token contact import API, idempotency, rate windows and usage');
COMMIT;
