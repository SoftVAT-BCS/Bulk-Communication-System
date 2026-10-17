-- SOFTVAT BCS v1 / MIGRATION 003 -- Secure external-portal integration metadata.
-- Stores references/allowlisted contracts, NOT credentials or unrestricted SQL.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=2)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=3) THEN
   RAISE EXCEPTION 'BCS migration order mismatch at 003'; END IF;
END $guard$;

CREATE TABLE bcs.portal_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  connection_name text NOT NULL CHECK (btrim(connection_name) <> ''),
  source_engine text NOT NULL CHECK (source_engine IN ('mysql','mssql','postgresql','portal_api')),
  integration_method text NOT NULL CHECK (integration_method IN ('approved_api','private_agent','read_only_database')),
  endpoint_reference text NOT NULL CHECK (btrim(endpoint_reference) <> ''),
  credentials_secret_ref text,
  approved_source_schema text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings)='object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','suspended','retired')),
  last_connectivity_test_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,portal_id,connection_name),
  UNIQUE (company_id,portal_id,id),
  FOREIGN KEY (company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT
);
-- endpoint_reference should be an approved server-side alias for a private endpoint;
-- never place database passwords, raw connection strings, arbitrary SQL or API secrets in settings.

CREATE TABLE bcs.data_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('recipient','group','subgroup','class_event','consent')),
  mapping_version integer NOT NULL CHECK (mapping_version >= 1),
  approved_view_or_endpoint text NOT NULL CHECK (btrim(approved_view_or_endpoint) <> ''),
  primary_key_field text NOT NULL CHECK (primary_key_field ~ '^[a-zA-Z_][a-zA-Z0-9_]*$'),
  column_map jsonb NOT NULL CHECK (jsonb_typeof(column_map)='object'),
  validated_at timestamptz,
  approved_by uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','approved','disabled')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,portal_id,connection_id,entity_type,mapping_version),
  UNIQUE (company_id,portal_id,id),
  FOREIGN KEY (company_id,portal_id,connection_id)
    REFERENCES bcs.portal_connections(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,approved_by)
    REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT
);
-- Column/view identifiers must come from discovered, allowlisted source metadata.
-- This table is NOT permission to execute SQL text stored in mappings.

CREATE TABLE bcs.integration_event_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  source_event_key text NOT NULL CHECK (btrim(source_event_key) <> ''),
  source_event_kind text NOT NULL,
  source_revision text,
  verified_signature boolean NOT NULL DEFAULT false,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','duplicate','rejected','failed')),
  received_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  processed_at timestamptz,
  UNIQUE (company_id,portal_id,source_event_key),
  FOREIGN KEY (company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT
);
-- Verification of provider/portal signatures is the future API's responsibility;
-- a stored boolean value must never substitute for request authentication.

CREATE TABLE bcs.connector_sync_checkpoints (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  entity_type text NOT NULL,
  cursor_reference text,
  last_success_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (company_id,portal_id,connection_id,entity_type),
  FOREIGN KEY (company_id,portal_id,connection_id)
    REFERENCES bcs.portal_connections(company_id,portal_id,id) ON DELETE RESTRICT
);

CREATE TRIGGER portal_connections_touch BEFORE UPDATE ON bcs.portal_connections
 FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
INSERT INTO bcs.schema_migrations(version,description)
VALUES (3,'External portal connection metadata, mappings and verified event receipts');
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
DO $secure$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
 END LOOP;
END $secure$;
COMMIT;
