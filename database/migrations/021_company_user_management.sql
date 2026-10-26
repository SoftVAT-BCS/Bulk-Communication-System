-- SoftVAT BCS 021: company-scoped BCS user management.
-- Apply ONCE only after live review of migration 020, role grants and backups.
-- This does not modify auth.users, email addresses, passwords or Supabase configuration.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=20)
      OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=21) THEN
    RAISE EXCEPTION 'BCS user management migration order mismatch at 021';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bcs_app_backend'
    AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb) THEN
    RAISE EXCEPTION 'Expected restricted BCS application role missing or elevated';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='bcs' AND tablename='principals'
    AND policyname='app_company_user_management_update') THEN
    RAISE EXCEPTION 'BCS user management policy already exists';
  END IF;
END $guard$;

-- Grant ONLY BCS display name / BCS access-status changes; NOT email or identity.
GRANT UPDATE(display_name,status) ON bcs.principals TO bcs_app_backend;
GRANT SELECT(id,company_id,display_name,email,status,identity_issuer,external_subject,created_at,updated_at)
  ON bcs.principals TO bcs_app_backend;
CREATE POLICY app_company_user_management_update ON bcs.principals
  FOR UPDATE TO bcs_app_backend
  USING(bcs.session_allows(company_id,NULL,'access.manage'))
  WITH CHECK(status IN ('active','suspended') AND bcs.session_allows(company_id,NULL,'access.manage'));

-- Existing audit RLS policies, company-scoped session access and roles remain enforced.
INSERT INTO bcs.schema_migrations(version,description)
VALUES(21,'Restricted company user display-name and access-state management');
COMMIT;
