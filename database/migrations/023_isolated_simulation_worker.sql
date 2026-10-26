-- PROPOSED. Execute only in the authorized disposable database; never bcs-dev.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $$ BEGIN
 IF current_database()<>'bcs_consolidated_isolated' OR NOT COALESCE((SELECT shobj_description(oid,'pg_database')='BCS_DISPOSABLE_SYNTHETIC_ONLY' FROM pg_database WHERE datname=current_database()),false) OR NOT COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname=current_user),false) OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=22)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=23) OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='bcs_simulation_worker') THEN
 RAISE EXCEPTION '023 requires a fresh isolated target and reviewed 001-022 baseline'; END IF;
END $$;
CREATE ROLE bcs_simulation_worker LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT CONNECT ON DATABASE bcs_consolidated_isolated TO bcs_simulation_worker;
GRANT USAGE ON SCHEMA bcs TO bcs_simulation_worker;
CREATE TABLE bcs.worker_scopes (
 role_name name NOT NULL, company_id uuid NOT NULL REFERENCES bcs.companies(id),
 PRIMARY KEY(role_name,company_id)
);
ALTER TABLE bcs.worker_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.worker_scopes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON bcs.worker_scopes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON bcs.worker_scopes TO bcs_simulation_worker;
CREATE POLICY worker_own_scopes ON bcs.worker_scopes FOR SELECT TO bcs_simulation_worker USING(role_name=current_user);
CREATE FUNCTION bcs.simulation_scope(company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT company::text=current_setting('bcs.simulation_company',true) AND EXISTS(SELECT 1 FROM bcs.worker_scopes WHERE role_name=current_user AND company_id=company)
$$;
REVOKE ALL ON FUNCTION bcs.simulation_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bcs.simulation_scope(uuid) TO bcs_simulation_worker;
ALTER TABLE bcs.dispatch_jobs ADD COLUMN simulation_started_at timestamptz;
GRANT SELECT ON bcs.companies,bcs.portals,bcs.company_subscriptions,bcs.saas_plans,bcs.recipients,bcs.recipient_preferences,bcs.email_suppressions,bcs.campaigns,bcs.campaign_recipients,bcs.dispatch_jobs,bcs.outbound_messages,bcs.delivery_attempts,bcs.quota_reservations,bcs.usage_counters,bcs.company_settings TO bcs_simulation_worker;
GRANT UPDATE(job_state,attempt_count,lease_token,lease_expires_at,lease_owner,available_at,last_error_code,simulation_started_at) ON bcs.dispatch_jobs TO bcs_simulation_worker;
GRANT UPDATE(simulation_receipt,attempt_count) ON bcs.outbound_messages TO bcs_simulation_worker;
GRANT INSERT,UPDATE ON bcs.delivery_attempts,bcs.quota_reservations,bcs.usage_counters,bcs.company_settings TO bcs_simulation_worker;
GRANT INSERT ON bcs.audit_events TO bcs_simulation_worker;
CREATE POLICY simulation_company ON bcs.companies FOR SELECT TO bcs_simulation_worker USING(bcs.simulation_scope(id));
CREATE POLICY simulation_plans ON bcs.saas_plans FOR SELECT TO bcs_simulation_worker USING(EXISTS(SELECT 1 FROM bcs.company_subscriptions s WHERE s.plan_code=saas_plans.plan_code AND bcs.simulation_scope(s.company_id)));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['portals','company_subscriptions','recipients','recipient_preferences','email_suppressions','campaigns','campaign_recipients','dispatch_jobs','outbound_messages','delivery_attempts','quota_reservations','usage_counters','audit_events'] LOOP
 EXECUTE format('CREATE POLICY simulation_worker_scope ON bcs.%I TO bcs_simulation_worker USING(bcs.simulation_scope(company_id)) WITH CHECK(bcs.simulation_scope(company_id))',t);
END LOOP; END $$;
CREATE POLICY simulation_worker_settings ON bcs.company_settings TO bcs_simulation_worker USING(bcs.simulation_scope(company_id) AND setting_key='simulation.pacing') WITH CHECK(bcs.simulation_scope(company_id) AND setting_key='simulation.pacing');
-- Worker has no provider metadata, credentials, session or recipient-write grants.
-- No scope or password is seeded. Explicit isolated fixture provisioning is required.
INSERT INTO bcs.schema_migrations(version,description) VALUES(23,'Isolated simulation worker role, tenant scopes and durable attempt timestamps');
COMMIT;
