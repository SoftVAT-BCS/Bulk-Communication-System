-- SoftVAT BCS / MIGRATION 001 COMPLETE REVERSIBLE REHEARSAL v2
-- Target: dedicated Supabase project bcs-dev only (Mumbai / ap-south-1).
-- This is NOT a permanent migration; do not execute migrations 001-008 yet.
-- Original reviewed 001_foundation.sql SHA-256: 98f39ab1646368eca95c149454a76f22b423ca9e22319f5c8bc21969c70b854f
-- Generated from exactly 23 individual SQL statements of that source.
-- The original BEGIN, SET LOCAL search_path and COMMIT are excluded by design;
-- the original guard/DDL/permission insert/revokes/secure DO statements are preserved.
-- Run ALL of this file as one SQL Editor query, NOT just the final SELECT.
-- This deliberately creates schema/tables/permissions temporarily inside one
-- PL/pgSQL exception subtransaction, asserts results, and forces a rollback.
-- On an unexpected error the statement fails and the subtransaction rolls back.
-- No existing bcs schema is permitted; if one exists, STOP without changes.
-- IMPORTANT: Static construction review only; not executed on PostgreSQL here.

DO $bcs_rehearsal_v2$
DECLARE
    v_ready boolean := false;
    v_table_count integer := 0;
    v_permission_count integer := 0;
    v_schema_oid oid;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='bcs') THEN
        RAISE EXCEPTION 'STOP: bcs schema already exists. Do not rerun rehearsal.';
    END IF;
    BEGIN
        -- Same effective search_path as the original transaction, scoped to
        -- the exception subtransaction and automatically reverted with it.
        PERFORM pg_catalog.set_config('search_path','pg_catalog',true);

        -- Source statement 1/23
        EXECUTE $bcs_sql_01$
DO $guard$
BEGIN
  IF current_setting('server_version_num')::integer < 150000 THEN
    RAISE EXCEPTION 'BCS design requires PostgreSQL 15 or later';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'bcs') THEN
    RAISE EXCEPTION 'bcs schema already exists: STOP and reconcile; do not overwrite';
  END IF;
  IF NOT COALESCE((SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user), false) THEN
    RAISE EXCEPTION 'Migration role must bypass RLS for reviewed setup and demo seed; STOP';
  END IF;
END
$guard$;
$bcs_sql_01$;

        -- Source statement 2/23
        EXECUTE $bcs_sql_02$
CREATE SCHEMA bcs;
$bcs_sql_02$;

        -- Source statement 3/23
        EXECUTE $bcs_sql_03$
REVOKE ALL ON SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
$bcs_sql_03$;

        -- Source statement 4/23
        EXECUTE $bcs_sql_04$
CREATE TABLE bcs.schema_migrations (
  version integer PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
$bcs_sql_04$;

        -- Source statement 5/23
        EXECUTE $bcs_sql_05$
CREATE TABLE bcs.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code text NOT NULL UNIQUE CHECK (company_code ~ '^[a-z][a-z0-9_-]{2,62}$'),
  company_name text NOT NULL CHECK (length(btrim(company_name)) BETWEEN 2 AND 240),
  legal_name text,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','suspended','closed')),
  default_timezone text NOT NULL DEFAULT 'UTC',
  billing_reference text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
$bcs_sql_05$;

        -- Source statement 6/23
        EXECUTE $bcs_sql_06$
CREATE TABLE bcs.portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_code text NOT NULL CHECK (portal_code ~ '^[a-z][a-z0-9_-]{1,62}$'),
  portal_name text NOT NULL CHECK (btrim(portal_name) <> ''),
  portal_kind text NOT NULL CHECK (portal_kind IN ('education','crm','hms','erp','other')),
  integration_mode text NOT NULL DEFAULT 'portal_api' CHECK (integration_mode IN ('portal_api','read_only_connector','bcs_native')),
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','retired')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, portal_code),
  UNIQUE (company_id, id)
);
$bcs_sql_06$;

        -- Source statement 7/23
        EXECUTE $bcs_sql_07$
CREATE TABLE bcs.principals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  identity_issuer text NOT NULL CHECK (btrim(identity_issuer) <> ''),
  external_subject text NOT NULL CHECK (btrim(external_subject) <> ''),
  display_name text,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','retired')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, identity_issuer, external_subject),
  UNIQUE (company_id, id)
);
$bcs_sql_07$;

        -- Source statement 8/23
        EXECUTE $bcs_sql_08$
CREATE TABLE bcs.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  role_code text NOT NULL CHECK (role_code ~ '^[a-z][a-z0-9_.-]*$'),
  role_name text NOT NULL CHECK (btrim(role_name) <> ''),
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, role_code),
  UNIQUE (company_id, id)
);
$bcs_sql_08$;

        -- Source statement 9/23
        EXECUTE $bcs_sql_09$
CREATE TABLE bcs.permissions (
  permission_code text PRIMARY KEY CHECK (permission_code ~ '^[a-z][a-z0-9_.-]*$'),
  description text NOT NULL
);
$bcs_sql_09$;

        -- Source statement 10/23
        EXECUTE $bcs_sql_10$
CREATE TABLE bcs.role_permissions (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL,
  permission_code text NOT NULL REFERENCES bcs.permissions(permission_code) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (company_id, role_id, permission_code),
  FOREIGN KEY (company_id, role_id) REFERENCES bcs.roles(company_id, id) ON DELETE RESTRICT
);
$bcs_sql_10$;

        -- Source statement 11/23
        EXECUTE $bcs_sql_11$
CREATE TABLE bcs.principal_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  principal_id uuid NOT NULL,
  role_id uuid NOT NULL,
  portal_id uuid,
  assigned_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz,
  UNIQUE NULLS NOT DISTINCT (company_id, principal_id, role_id, portal_id),
  FOREIGN KEY (company_id, principal_id) REFERENCES bcs.principals(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, role_id) REFERENCES bcs.roles(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, portal_id) REFERENCES bcs.portals(company_id, id) ON DELETE RESTRICT
);
$bcs_sql_11$;

        -- Source statement 12/23
        EXECUTE $bcs_sql_12$
CREATE TABLE bcs.principal_portal_scopes (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  principal_id uuid NOT NULL,
  portal_id uuid NOT NULL,
  scope_rules jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(scope_rules) = 'object'),
  granted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (company_id, principal_id, portal_id),
  FOREIGN KEY (company_id, principal_id) REFERENCES bcs.principals(company_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, portal_id) REFERENCES bcs.portals(company_id, id) ON DELETE RESTRICT
);
$bcs_sql_12$;

        -- Source statement 13/23
        EXECUTE $bcs_sql_13$
CREATE TABLE bcs.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid,
  client_code text NOT NULL CHECK (client_code ~ '^[a-z][a-z0-9_-]*$'),
  credential_hash text NOT NULL CHECK (credential_hash ~ '^[a-f0-9]{64}$'),
  credential_fingerprint text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(scopes) = 'array'),
  status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled','active','revoked')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, client_code),
  UNIQUE (company_id, id),
  FOREIGN KEY (company_id, portal_id) REFERENCES bcs.portals(company_id, id) ON DELETE RESTRICT
);
$bcs_sql_13$;

        -- Source statement 14/23
        EXECUTE $bcs_sql_14$
-- credential_hash must be produced from a high-entropy token via a verified server-side scheme;
-- never insert plaintext keys, passwords, AWS access keys, or secrets into this table.

CREATE TABLE bcs.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  setting_key text NOT NULL CHECK (setting_key ~ '^[a-z][a-z0-9_.-]*$'),
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, setting_key),
  UNIQUE (company_id, id)
);
$bcs_sql_14$;

        -- Source statement 15/23
        EXECUTE $bcs_sql_15$
-- Never store credentials or executable SQL in setting_value.

CREATE FUNCTION bcs.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $body$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END
$body$;
$bcs_sql_15$;

        -- Source statement 16/23
        EXECUTE $bcs_sql_16$
CREATE TRIGGER companies_touch BEFORE UPDATE ON bcs.companies
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
$bcs_sql_16$;

        -- Source statement 17/23
        EXECUTE $bcs_sql_17$
CREATE TRIGGER portals_touch BEFORE UPDATE ON bcs.portals
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
$bcs_sql_17$;

        -- Source statement 18/23
        EXECUTE $bcs_sql_18$
CREATE TRIGGER principals_touch BEFORE UPDATE ON bcs.principals
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
$bcs_sql_18$;

        -- Source statement 19/23
        EXECUTE $bcs_sql_19$
INSERT INTO bcs.permissions(permission_code,description) VALUES
 ('dashboard.view','View the scoped dashboard'),
 ('recipients.view','List eligible scoped recipients'),
 ('recipients.select','Select authorized recipients'),
 ('recipients.export','Export authorized recipient data'),
 ('recipients.import','Import portal-owned contacts'),
 ('templates.view','Preview templates'),
 ('templates.manage','Create or edit templates'),
 ('compose.draft','Manage email drafts'),
 ('campaigns.send_test','Send approved test email'),
 ('campaigns.schedule','Schedule campaign'),
 ('campaigns.send','Dispatch an approved campaign'),
 ('campaigns.approve','Approve campaign'),
 ('scheduling.manage','Configure scheduling rules'),
 ('queue.manage','Manage sending queue'),
 ('reports.view','View scoped delivery reports'),
 ('reports.export','Export scoped report'),
 ('suppression.manage','Manage suppression and preferences'),
 ('portals.manage','Manage registered portals'),
 ('mappings.manage','Manage approved data mappings'),
 ('ses.manage','Manage SES settings'),
 ('access.manage','Grant scoped user rights');
$bcs_sql_19$;

        -- Source statement 20/23
        EXECUTE $bcs_sql_20$
INSERT INTO bcs.schema_migrations(version,description) VALUES (1,'Platform companies, portals, identity and RBAC metadata');
$bcs_sql_20$;

        -- Source statement 21/23
        EXECUTE $bcs_sql_21$
-- Default deny for every new table. Only the privileged SQL Editor role can use these
-- until a separately reviewed API role and trustworthy authorization model exist.
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
$bcs_sql_21$;

        -- Source statement 22/23
        EXECUTE $bcs_sql_22$
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
$bcs_sql_22$;

        -- Source statement 23/23
        EXECUTE $bcs_sql_23$
DO $secure$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
    EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
    EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
  END LOOP;
END
$secure$;
$bcs_sql_23$;

        -- Assert all foundation tables and their forced RLS while schema exists.
        SELECT n.oid INTO v_schema_oid
          FROM pg_catalog.pg_namespace n WHERE n.nspname = 'bcs';
        IF v_schema_oid IS NULL THEN
            RAISE EXCEPTION '001 rehearsal: schema creation missing';
        END IF;
        SELECT count(*) INTO v_table_count
          FROM pg_catalog.pg_class c
         WHERE c.relnamespace=v_schema_oid AND c.relkind IN ('r','p');
        IF v_table_count <> 11 THEN
            RAISE EXCEPTION '001 rehearsal: expected 11 tables, found %',v_table_count;
        END IF;
        SELECT count(*) INTO v_permission_count FROM bcs.permissions;
        IF v_permission_count <> 21 THEN
            RAISE EXCEPTION '001 rehearsal: expected 21 permission rows, found %',v_permission_count;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM bcs.schema_migrations WHERE version=1) THEN
            RAISE EXCEPTION '001 rehearsal: missing version=1 migration ledger entry';
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_catalog.pg_class c
             WHERE c.relnamespace=v_schema_oid AND c.relkind IN ('r','p')
               AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)
        ) THEN
            RAISE EXCEPTION '001 rehearsal: RLS not enabled and forced on all tables';
        END IF;
        IF pg_catalog.has_schema_privilege('anon',v_schema_oid,'USAGE')
           OR pg_catalog.has_schema_privilege('authenticated',v_schema_oid,'USAGE')
           OR pg_catalog.has_schema_privilege('service_role',v_schema_oid,'USAGE') THEN
            RAISE EXCEPTION '001 rehearsal: client roles have unexpected schema usage';
        END IF;

        v_ready := true;
        -- Intentional exception rolls back all changes inside this subtransaction.
        RAISE EXCEPTION USING ERRCODE='P0001',
                              MESSAGE='BCS_MIGRATION_001_EXPECTED_ROLLBACK';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF NOT v_ready OR SQLERRM <> 'BCS_MIGRATION_001_EXPECTED_ROLLBACK' THEN
                RAISE;
            END IF;
            -- Subtransaction already rolled back before entering handler.
            RAISE NOTICE 'BCS 001 rehearsal PASS: 11 tables, 21 permissions, forced RLS, denied grants; rolled back';
    END;

    IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='bcs') THEN
        RAISE EXCEPTION 'STOP: bcs schema still exists after intended rollback';
    END IF;
END
$bcs_rehearsal_v2$;

-- Read-only post-condition; confirm NO schema/table remains.
-- NOTE: this SELECT alone is not evidence that the DO above executed.
SELECT current_database() AS database_name,
       current_user AS executing_role,
       EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='bcs') AS bcs_schema_exists,
       (SELECT count(*) FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='bcs' AND c.relkind IN ('r','p')) AS bcs_table_count,
       CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='bcs')
       THEN 'STOP: bcs schema exists'
       ELSE 'PASS: no BCS objects remain; confirm full rehearsal ran'
       END AS after_rehearsal;
