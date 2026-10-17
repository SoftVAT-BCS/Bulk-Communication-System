-- SOFTVAT BCS / MIGRATION 009: optional synthetic-recipient geography fields.
-- Run ONCE in the dedicated bcs-dev project AFTER migrations 001..008.
-- Non-destructive: adds two nullable TEXT columns to the existing recipients table only.
-- It does not import data, modify SoftVAT CRM, change RLS policies, or enable sending.
BEGIN;
SET LOCAL search_path = pg_catalog;

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version = 8)
     OR EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version = 9) THEN
    RAISE EXCEPTION 'BCS migration order mismatch at 009. Stop; do not rerun a completed migration';
  END IF;
  IF to_regclass('bcs.recipients') IS NULL THEN
    RAISE EXCEPTION 'Expected bcs.recipients table is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bcs' AND table_name = 'recipients'
      AND column_name IN ('state_name', 'district_name')
  ) THEN
    RAISE EXCEPTION 'At least one geography column already exists. Stop and inspect before continuing';
  END IF;
  IF NOT coalesce((SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user), false) THEN
    RAISE EXCEPTION 'Migration requires the reviewed admin SQL Editor role';
  END IF;
END $guard$;

ALTER TABLE bcs.recipients
  ADD COLUMN state_name text,
  ADD COLUMN district_name text,
  ADD CONSTRAINT recipients_state_name_nonblank
    CHECK (state_name IS NULL OR length(btrim(state_name)) BETWEEN 2 AND 120),
  ADD CONSTRAINT recipients_district_name_nonblank
    CHECK (district_name IS NULL OR length(btrim(district_name)) BETWEEN 2 AND 120);

-- Keep the established default-deny security posture for the altered table.
REVOKE ALL ON TABLE bcs.recipients FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE bcs.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs.recipients FORCE ROW LEVEL SECURITY;

INSERT INTO bcs.schema_migrations (version, description)
VALUES (9, 'Optional state and district names for SaaS recipient data');
COMMIT;
