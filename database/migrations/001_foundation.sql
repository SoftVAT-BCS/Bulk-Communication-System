-- SOFTVAT BCS v1 / MIGRATION 001 -- Platform, company identity and authorization metadata.
-- REVIEW FIRST. This is a new, empty, private 'bcs' schema, not the old 'bcs_demo' script.
-- Not idempotent: rerunning a completed version deliberately fails.
BEGIN;
SET LOCAL search_path = pg_catalog;
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

CREATE SCHEMA bcs;
REVOKE ALL ON SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE bcs.schema_migrations (
  version integer PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

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

CREATE TABLE bcs.permissions (
  permission_code text PRIMARY KEY CHECK (permission_code ~ '^[a-z][a-z0-9_.-]*$'),
  description text NOT NULL
);

CREATE TABLE bcs.role_permissions (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL,
  permission_code text NOT NULL REFERENCES bcs.permissions(permission_code) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (company_id, role_id, permission_code),
  FOREIGN KEY (company_id, role_id) REFERENCES bcs.roles(company_id, id) ON DELETE RESTRICT
);

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
-- Never store credentials or executable SQL in setting_value.

CREATE FUNCTION bcs.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $body$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END
$body$;

CREATE TRIGGER companies_touch BEFORE UPDATE ON bcs.companies
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
CREATE TRIGGER portals_touch BEFORE UPDATE ON bcs.portals
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
CREATE TRIGGER principals_touch BEFORE UPDATE ON bcs.principals
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();

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

INSERT INTO bcs.schema_migrations(version,description) VALUES (1,'Platform companies, portals, identity and RBAC metadata');

-- Default deny for every new table. Only the privileged SQL Editor role can use these
-- until a separately reviewed API role and trustworthy authorization model exist.
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
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
COMMIT;
