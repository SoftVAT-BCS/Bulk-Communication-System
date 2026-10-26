-- SoftVAT BCS 020: restricted company-wide user onboarding.
-- Run only after 019 is recorded and after reviewing the current role/policy inventory.
-- Enables one *column-scoped* INSERT on bcs.principals for an authenticated
-- access.manage company admin. It DOES NOT grant direct public or browser access.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version = 19)
      OR EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version = 20) THEN
    RAISE EXCEPTION 'BCS onboarding migration order mismatch at 020';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bcs_app_backend') THEN
    RAISE EXCEPTION 'Expected restricted backend role is absent';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='bcs' AND tablename='principals'
    AND policyname='app_company_user_enrollment') THEN
    RAISE EXCEPTION 'Onboarding policy already exists; stop and reconcile';
  END IF;
END $guard$;

GRANT INSERT (company_id,identity_issuer,external_subject,display_name,email,status)
  ON bcs.principals TO bcs_app_backend;
CREATE POLICY app_company_user_enrollment ON bcs.principals
  FOR INSERT TO bcs_app_backend
  WITH CHECK (
    status = 'active'
    AND bcs.session_allows(company_id, NULL, 'access.manage')
  );
-- Existing authenticated role/portal assignments and audit INSERT privileges
-- are supplied by migration 017 and must remain intact.
INSERT INTO bcs.schema_migrations(version,description)
VALUES(20,'Company-scoped restricted principal enrollment for authorized Auth invitations');
COMMIT;
