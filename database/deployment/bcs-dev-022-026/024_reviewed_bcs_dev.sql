-- PROPOSED bcs-dev deployment variant 024; NOT EXECUTED.
-- Run only through the reviewed wrapper. Original isolated migration is untouched.
-- Wrapper owns one atomic transaction across all variants; no standalone COMMIT.
DO $deployment$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres'
 OR current_setting('bcs.deployment_approval',true) IS DISTINCT FROM 'BCS_DEV_022_026_OWNER_APPROVED'
 OR COALESCE(current_setting('bcs.verified_backup_sha256',true),'') !~ '^[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=23)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=24)
 THEN RAISE EXCEPTION 'Reviewed deployment context/order required for 024'; END IF;
END $deployment$;
CREATE TABLE bcs.platform_operators(company_id uuid NOT NULL,principal_id uuid NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(company_id,principal_id),FOREIGN KEY(company_id,principal_id) REFERENCES bcs.principals(company_id,id));
ALTER TABLE bcs.platform_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.platform_operators FORCE ROW LEVEL SECURITY;
REVOKE ALL ON bcs.platform_operators FROM PUBLIC,anon,authenticated,service_role,bcs_app_backend;
CREATE FUNCTION bcs.is_platform_operator() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM bcs.application_sessions s JOIN bcs.platform_operators o ON o.company_id=s.company_id AND o.principal_id=s.principal_id JOIN bcs.companies co ON co.id=s.company_id AND co.status IN ('active','trial') JOIN bcs.principals p ON p.company_id=s.company_id AND p.id=s.principal_id AND p.status='active' WHERE s.token_hash=current_setting('bcs.session_hash',true) AND s.revoked_at IS NULL AND s.expires_at>now() AND o.expires_at>now() AND bcs.session_allows(s.company_id,NULL,'access.manage'))
$$;
REVOKE ALL ON FUNCTION bcs.is_platform_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bcs.is_platform_operator() TO bcs_app_backend;
CREATE FUNCTION bcs.platform_company_registry() RETURNS TABLE(id uuid,company_name text,status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN IF NOT bcs.is_platform_operator() THEN RAISE EXCEPTION 'Platform operator required'; END IF;RETURN QUERY SELECT co.id,co.company_name,co.status FROM bcs.companies co ORDER BY co.company_name LIMIT 200;END $$;
REVOKE ALL ON FUNCTION bcs.platform_company_registry() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bcs.platform_company_registry() TO bcs_app_backend;
CREATE FUNCTION bcs.provision_company(code text,title text,plan text) RETURNS TABLE(company uuid,portal uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner_record record; principal uuid; role_id uuid;
BEGIN
 IF NOT bcs.is_platform_operator() THEN RAISE EXCEPTION 'Platform operator required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bcs.saas_plans WHERE plan_code=plan AND status='active') THEN RAISE EXCEPTION 'Approved active plan required'; END IF;
 SELECT p.* INTO STRICT owner_record FROM bcs.application_sessions s JOIN bcs.principals p ON p.company_id=s.company_id AND p.id=s.principal_id WHERE s.token_hash=current_setting('bcs.session_hash',true);
 INSERT INTO bcs.companies(company_code,company_name) VALUES(code,title) RETURNING id INTO company;
 INSERT INTO bcs.company_subscriptions(company_id,plan_code,state,ends_at) VALUES(company,plan,'trial',now()+interval '30 days');
 INSERT INTO bcs.portals(company_id,portal_code,portal_name,portal_kind,integration_mode,status) VALUES(company,'default','Default portal','other','bcs_native','active') RETURNING id INTO portal;
 INSERT INTO bcs.principals(company_id,identity_issuer,external_subject,display_name,email) VALUES(company,owner_record.identity_issuer,owner_record.external_subject,owner_record.display_name,owner_record.email) RETURNING id INTO principal;
 INSERT INTO bcs.roles(company_id,role_code,role_name,is_builtin) VALUES(company,'company-administrator','Company administrator',true) RETURNING id INTO role_id;
 INSERT INTO bcs.role_permissions(company_id,role_id,permission_code) SELECT company,role_id,p.permission_code FROM bcs.permissions p WHERE bcs.session_allows(owner_record.company_id,NULL,p.permission_code);
 INSERT INTO bcs.principal_role_assignments(company_id,principal_id,role_id) VALUES(company,principal,role_id);
 INSERT INTO bcs.principal_portal_scopes(company_id,principal_id,portal_id) VALUES(company,principal,portal);
 INSERT INTO bcs.audit_events(company_id,portal_id,actor_principal_id,action,entity_type,entity_reference) VALUES(company,portal,principal,'company.provision','company',company::text);
 RETURN NEXT;
END $$;
CREATE FUNCTION bcs.administer_company(company uuid,action text,value text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT bcs.is_platform_operator() THEN RAISE EXCEPTION 'Platform operator required'; END IF;
 PERFORM 1 FROM bcs.companies WHERE id=company FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Company unavailable'; END IF;
 IF action='company-status' AND value='suspended' AND EXISTS(SELECT 1 FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND company_id=company) THEN RAISE EXCEPTION 'Cannot suspend the operator current company'; END IF;
 IF action='company-status' AND value IN ('active','suspended') THEN
  UPDATE bcs.companies SET status=value WHERE id=company;
  IF value='suspended' THEN UPDATE bcs.application_sessions SET revoked_at=now() WHERE company_id=company AND revoked_at IS NULL; END IF;
 ELSIF action='subscription' AND EXISTS(SELECT 1 FROM bcs.saas_plans WHERE plan_code=value AND status='active') THEN
  UPDATE bcs.company_subscriptions SET state='cancelled',ends_at=now() WHERE company_id=company AND state IN ('active','trial');
  INSERT INTO bcs.company_subscriptions(company_id,plan_code,state,ends_at) VALUES(company,value,'active',now()+interval '30 days');
 ELSE RAISE EXCEPTION 'Invalid administration action'; END IF;
 INSERT INTO bcs.audit_events(company_id,action,entity_type,entity_reference,safe_metadata) VALUES(company,'company.'||action,'company',company::text,jsonb_build_object('value',value));RETURN true;
END $$;
REVOKE ALL ON FUNCTION bcs.provision_company(text,text,text),bcs.administer_company(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bcs.provision_company(text,text,text),bcs.administer_company(uuid,text,text) TO bcs_app_backend;
GRANT SELECT ON bcs.saas_plans,bcs.company_subscriptions,bcs.usage_counters TO bcs_app_backend;
CREATE POLICY app_active_plans ON bcs.saas_plans FOR SELECT TO bcs_app_backend USING(status='active');
CREATE POLICY app_own_subscription ON bcs.company_subscriptions FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,NULL,'access.manage'));
CREATE POLICY app_own_usage ON bcs.usage_counters FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,NULL,'access.manage'));

CREATE FUNCTION bcs.tenant_resource_usage(company uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN IF NOT bcs.session_allows(company,NULL,'access.manage') THEN RAISE EXCEPTION 'Company administration required'; END IF;
 RETURN jsonb_build_object('contacts',(SELECT count(*) FROM bcs.recipients WHERE company_id=company),'users',(SELECT count(*) FROM bcs.principals WHERE company_id=company),'portals',(SELECT count(*) FROM bcs.portals WHERE company_id=company));END $$;
REVOKE ALL ON FUNCTION bcs.tenant_resource_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bcs.tenant_resource_usage(uuid) TO bcs_app_backend;
CREATE TABLE bcs.embed_grants(code_hash text PRIMARY KEY CHECK(code_hash~'^[a-f0-9]{64}$'),company_id uuid NOT NULL,portal_id uuid NOT NULL,principal_id uuid NOT NULL,issuer text NOT NULL,replay_id text NOT NULL,parent_origin text NOT NULL,permissions jsonb NOT NULL CHECK(jsonb_typeof(permissions)='array'),expires_at timestamptz NOT NULL,used_at timestamptz,UNIQUE(issuer,replay_id),FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id),FOREIGN KEY(company_id,principal_id) REFERENCES bcs.principals(company_id,id));
ALTER TABLE bcs.embed_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.embed_grants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON bcs.embed_grants FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE(used_at) ON bcs.embed_grants TO bcs_app_backend;
-- Embedding remains disabled pending a separate scoped grant-exchange acceptance.
CREATE POLICY private_embed_exchange ON bcs.embed_grants TO bcs_app_backend USING(false) WITH CHECK(false);
ALTER TABLE bcs.application_sessions ADD COLUMN embed_origin text;
ALTER TABLE bcs.application_sessions ADD COLUMN embedded_permissions jsonb;
-- Private backend authenticates signed assertion before touching grants; browser receives only a short-lived code.

GRANT SELECT,INSERT,UPDATE ON bcs.connector_sync_checkpoints,bcs.integration_event_receipts TO bcs_app_backend;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['connector_sync_checkpoints','integration_event_receipts'] LOOP
 EXECUTE format('CREATE POLICY app_scoped_connector ON bcs.%I TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,''mappings.manage'')) WITH CHECK(bcs.session_allows(company_id,portal_id,''mappings.manage''))',t);
END LOOP; END $$;
GRANT UPDATE(last_connectivity_test_at) ON bcs.portal_connections TO bcs_app_backend;
GRANT UPDATE(execution_mode,simulation_result,error_code,completed_at,retryable) ON bcs.delivery_attempts TO bcs_app_backend;
CREATE POLICY app_simulation_attempt_control ON bcs.delivery_attempts FOR UPDATE TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.outbound_messages m JOIN bcs.campaigns c ON c.company_id=m.company_id AND c.id=m.campaign_id WHERE m.company_id=delivery_attempts.company_id AND m.id=delivery_attempts.message_id AND c.simulation_policy IS NOT NULL AND bcs.session_allows(m.company_id,m.portal_id,'queue.manage'))) WITH CHECK(execution_mode='simulation');
GRANT UPDATE(lease_token,lease_expires_at,lease_owner) ON bcs.dispatch_jobs TO bcs_app_backend;
GRANT SELECT,UPDATE(state) ON bcs.quota_reservations TO bcs_app_backend;
CREATE POLICY app_simulation_reservations ON bcs.quota_reservations TO bcs_app_backend USING(metric_code='simulation.messages' AND EXISTS(SELECT 1 FROM bcs.dispatch_jobs j JOIN bcs.outbound_messages m ON m.company_id=j.company_id AND m.id=j.message_id WHERE j.company_id=quota_reservations.company_id AND j.id::text=split_part(quota_reservations.reservation_key,':',1) AND bcs.session_allows(m.company_id,m.portal_id,'queue.manage'))) WITH CHECK(metric_code='simulation.messages' AND EXISTS(SELECT 1 FROM bcs.dispatch_jobs j JOIN bcs.outbound_messages m ON m.company_id=j.company_id AND m.id=j.message_id WHERE j.company_id=quota_reservations.company_id AND j.id::text=split_part(quota_reservations.reservation_key,':',1) AND bcs.session_allows(m.company_id,m.portal_id,'queue.manage')));
CREATE POLICY app_simulation_campaign_controls ON bcs.campaigns FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'queue.manage')) WITH CHECK(bcs.session_allows(company_id,portal_id,'queue.manage'));
CREATE POLICY app_review_campaign_read ON bcs.campaigns FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'campaigns.approve') OR bcs.session_allows(company_id,portal_id,'reports.view'));
CREATE POLICY app_review_campaign_update ON bcs.campaigns FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'campaigns.approve')) WITH CHECK(bcs.session_allows(company_id,portal_id,'campaigns.approve'));
CREATE POLICY app_simulation_audit ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'queue.manage') OR bcs.session_allows(company_id,portal_id,'campaigns.approve') OR bcs.session_allows(company_id,portal_id,'mappings.manage'));
CREATE POLICY app_simulation_audit_read ON bcs.audit_events FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'reports.view'));
INSERT INTO bcs.schema_migrations(version,description) VALUES(24,'Explicit tenant administration, scoped embed grants and integrated workflow access');
