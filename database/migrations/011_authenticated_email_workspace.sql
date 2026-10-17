-- 011: Authenticated local application foundation. Additive; reader 010 unchanged.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$ BEGIN
 IF current_database()<>'postgres' OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=10) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=11) OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='bcs_app_backend') THEN RAISE EXCEPTION 'Migration 011 prerequisites conflict'; END IF;
END $guard$;
CREATE ROLE bcs_app_backend LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT CONNECT ON DATABASE postgres TO bcs_app_backend;
GRANT USAGE ON SCHEMA bcs TO bcs_app_backend;
CREATE TABLE bcs.local_credentials (
 username text PRIMARY KEY CHECK(username ~ '^[a-z0-9_.-]{3,80}$'),
 company_id uuid NOT NULL, principal_id uuid NOT NULL,
 password_hash text NOT NULL, failed_attempts integer NOT NULL DEFAULT 0,
 locked_until timestamptz, UNIQUE(company_id,principal_id),
 FOREIGN KEY(company_id,principal_id) REFERENCES bcs.principals(company_id,id)
);
CREATE TABLE bcs.application_sessions (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 company_id uuid NOT NULL,principal_id uuid NOT NULL,portal_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 FOREIGN KEY(company_id,principal_id) REFERENCES bcs.principals(company_id,id),
 FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id)
);
ALTER TABLE bcs.local_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.local_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE bcs.application_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.application_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON bcs.local_credentials,bcs.application_sessions FROM PUBLIC,anon,authenticated,service_role;
-- Private authentication metadata is server-only; no endpoint lists hashes/tokens.
GRANT SELECT,UPDATE(failed_attempts,locked_until) ON bcs.local_credentials TO bcs_app_backend;
GRANT SELECT,INSERT,UPDATE(revoked_at) ON bcs.application_sessions TO bcs_app_backend;
CREATE POLICY app_credentials ON bcs.local_credentials TO bcs_app_backend USING(true) WITH CHECK(true);
CREATE POLICY app_sessions ON bcs.application_sessions TO bcs_app_backend USING(true) WITH CHECK(true);
DO $meta$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['principals','roles','permissions','role_permissions','principal_role_assignments','principal_portal_scopes','companies','portals'] LOOP
 EXECUTE format('GRANT SELECT ON bcs.%I TO bcs_app_backend',t);
 EXECUTE format('CREATE POLICY app_auth_metadata ON bcs.%I FOR SELECT TO bcs_app_backend USING(true)',t);
 END LOOP;
END $meta$;
-- Fixed, parameterized policy helper; no dynamic SQL. Session token is hashed server-side.
CREATE FUNCTION bcs.session_allows(c uuid,p uuid,permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $body$
 SELECT EXISTS(
 SELECT 1 FROM bcs.application_sessions s
 JOIN bcs.principals u ON u.company_id=s.company_id AND u.id=s.principal_id AND u.status='active'
 JOIN bcs.companies co ON co.id=s.company_id AND co.status IN ('active','trial')
 JOIN bcs.portals po ON po.company_id=s.company_id AND po.id=s.portal_id AND po.status='active'
 JOIN bcs.principal_portal_scopes sc ON sc.company_id=s.company_id AND sc.principal_id=s.principal_id AND sc.portal_id=s.portal_id
 JOIN bcs.principal_role_assignments a ON a.company_id=s.company_id AND a.principal_id=s.principal_id AND (a.portal_id IS NULL OR a.portal_id=s.portal_id) AND (a.expires_at IS NULL OR a.expires_at>statement_timestamp())
 JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id AND rp.permission_code=permission
 WHERE s.token_hash=current_setting('bcs.session_hash',true) AND s.company_id=c
 AND (p=s.portal_id OR (p IS NULL AND a.portal_id IS NULL))
 AND s.revoked_at IS NULL AND s.expires_at>statement_timestamp())
$body$;
REVOKE ALL ON FUNCTION bcs.session_allows(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION bcs.session_allows(uuid,uuid,text) TO bcs_app_backend;
GRANT SELECT,INSERT,UPDATE ON bcs.email_templates,bcs.email_drafts TO bcs_app_backend;
GRANT SELECT,INSERT ON bcs.email_template_revisions,bcs.audit_events TO bcs_app_backend;
CREATE POLICY app_templates_read ON bcs.email_templates FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'templates.view'));
CREATE POLICY app_templates_insert ON bcs.email_templates FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'templates.manage'));
CREATE POLICY app_templates_update ON bcs.email_templates FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'templates.manage')) WITH CHECK(bcs.session_allows(company_id,portal_id,'templates.manage'));
CREATE POLICY app_drafts ON bcs.email_drafts TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'compose.draft') AND owner_principal_id=(SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true))) WITH CHECK(bcs.session_allows(company_id,portal_id,'compose.draft') AND owner_principal_id=(SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true)));
CREATE POLICY app_revisions ON bcs.email_template_revisions TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.email_templates t WHERE t.company_id=email_template_revisions.company_id AND t.id=template_id)) WITH CHECK(EXISTS(SELECT 1 FROM bcs.email_templates t WHERE t.company_id=email_template_revisions.company_id AND t.id=template_id AND bcs.session_allows(t.company_id,t.portal_id,'templates.manage')));
CREATE POLICY app_audit ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'compose.draft') OR bcs.session_allows(company_id,portal_id,'templates.manage'));
INSERT INTO bcs.schema_migrations(version,description) VALUES(11,'Local authenticated sessions, RBAC-bound template and draft persistence');
COMMIT;
