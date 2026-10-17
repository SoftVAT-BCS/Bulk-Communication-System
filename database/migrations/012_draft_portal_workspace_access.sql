-- Allow authenticated configuration/content preparation for draft portals; paused/retired remain denied.
-- No connection activation or sending is enabled. Reader 010 unchanged.
BEGIN;
DO $g$ BEGIN IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=11) OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=12) THEN RAISE EXCEPTION 'Migration order mismatch'; END IF; END $g$;
CREATE OR REPLACE FUNCTION bcs.session_allows(c uuid,p uuid,permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $body$
 SELECT EXISTS(
 SELECT 1 FROM bcs.application_sessions s
 JOIN bcs.principals u ON u.company_id=s.company_id AND u.id=s.principal_id AND u.status='active'
 JOIN bcs.companies co ON co.id=s.company_id AND co.status IN ('active','trial')
 JOIN bcs.portals po ON po.company_id=s.company_id AND po.id=s.portal_id AND po.status IN ('draft','active')
 JOIN bcs.principal_portal_scopes sc ON sc.company_id=s.company_id AND sc.principal_id=s.principal_id AND sc.portal_id=s.portal_id
 JOIN bcs.principal_role_assignments a ON a.company_id=s.company_id AND a.principal_id=s.principal_id AND (a.portal_id IS NULL OR a.portal_id=s.portal_id) AND (a.expires_at IS NULL OR a.expires_at>statement_timestamp())
 JOIN bcs.role_permissions rp ON rp.company_id=a.company_id AND rp.role_id=a.role_id AND rp.permission_code=permission
 WHERE s.token_hash=current_setting('bcs.session_hash',true) AND s.company_id=c
 AND (p=s.portal_id OR (p IS NULL AND a.portal_id IS NULL))
 AND s.revoked_at IS NULL AND s.expires_at>statement_timestamp())
$body$;

INSERT INTO bcs.schema_migrations(version,description) VALUES(12,'Authenticated content preparation in draft portals; no sending');
COMMIT;
