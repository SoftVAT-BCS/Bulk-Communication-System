-- SOFTVAT BCS v1 / MIGRATION 004 -- Sender identities, templates, rich HTML drafts and file metadata.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=3)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=4) THEN
   RAISE EXCEPTION 'BCS migration order mismatch at 004'; END IF;
END $guard$;

CREATE TABLE bcs.provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  account_code text NOT NULL CHECK (account_code ~ '^[a-z][a-z0-9_-]*$'),
  provider text NOT NULL DEFAULT 'amazon_ses' CHECK (provider = 'amazon_ses'),
  aws_region text NOT NULL CHECK (aws_region ~ '^[a-z]{2}-[a-z]+-[0-9]+$'),
  credential_secret_ref text,
  account_status text NOT NULL DEFAULT 'draft' CHECK (account_status IN ('draft','verified','paused','disabled')),
  verified_max_send_rate numeric(12,3) CHECK (verified_max_send_rate > 0),
  verified_max_24h bigint CHECK (verified_max_24h >= 0),
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,account_code),
  UNIQUE (company_id,id)
);

CREATE TABLE bcs.sender_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  provider_account_id uuid NOT NULL,
  identity_type text NOT NULL CHECK (identity_type IN ('domain','email')),
  identity_value text NOT NULL CHECK (btrim(identity_value) <> ''),
  display_name text,
  reply_to_email text,
  provider_verified boolean NOT NULL DEFAULT false,
  spf_status text NOT NULL DEFAULT 'unchecked' CHECK (spf_status IN ('unchecked','pass','fail')),
  dkim_status text NOT NULL DEFAULT 'unchecked' CHECK (dkim_status IN ('unchecked','pass','fail')),
  dmarc_status text NOT NULL DEFAULT 'unchecked' CHECK (dmarc_status IN ('unchecked','pass','fail')),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,provider_account_id,identity_type,identity_value),
  UNIQUE (company_id,id),
  FOREIGN KEY (company_id,provider_account_id) REFERENCES bcs.provider_accounts(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid,
  template_key text NOT NULL CHECK (template_key ~ '^[a-z][a-z0-9_.-]*$'),
  template_name text NOT NULL CHECK (btrim(template_name) <> ''),
  category text NOT NULL CHECK (category IN ('class_schedule','reschedule','cancellation','reminder','newsletter','announcement','other')),
  subject text NOT NULL CHECK (btrim(subject) <> ''),
  html_body text NOT NULL CHECK (btrim(html_body) <> ''),
  text_body text NOT NULL DEFAULT '',
  editor_document jsonb CHECK (editor_document IS NULL OR jsonb_typeof(editor_document)='object'),
  allowed_variables jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_variables)='array'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE NULLS NOT DISTINCT (company_id,portal_id,template_key),
  UNIQUE (company_id,id),
  FOREIGN KEY (company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,created_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,approved_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT
);
-- Rich HTML stored here MUST be sanitized for email-safe markup before preview/render/send.
-- Approved template revisions and immutable send snapshots are separate; no default sends.

CREATE TABLE bcs.email_template_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  template_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision >= 1),
  subject_snapshot text NOT NULL,
  html_snapshot text NOT NULL,
  text_snapshot text NOT NULL DEFAULT '',
  editor_snapshot jsonb,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,template_id,revision),
  FOREIGN KEY (company_id,template_id) REFERENCES bcs.email_templates(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,recorded_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  owner_principal_id uuid,
  template_id uuid,
  category text NOT NULL DEFAULT 'announcement',
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  text_body text NOT NULL DEFAULT '',
  editor_document jsonb,
  recipient_selection_ref uuid, -- Future audience selection; no FK until migration 005.
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','ready','archived')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,id),
  FOREIGN KEY (company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,owner_principal_id) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,template_id) REFERENCES bcs.email_templates(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.file_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  filename text NOT NULL CHECK (btrim(filename) <> ''),
  storage_provider text NOT NULL CHECK (storage_provider IN ('s3','private_object_store')),
  storage_bucket_ref text NOT NULL,
  storage_object_ref text NOT NULL,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','blocked','failed')),
  access_class text NOT NULL DEFAULT 'private' CHECK (access_class IN ('private','expiring_link')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,storage_provider,storage_bucket_ref,storage_object_ref),
  UNIQUE (company_id,id),
  FOREIGN KEY (company_id,created_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT
);
-- Store no file binaries in PostgreSQL; never return unvalidated public download URLs.

CREATE TABLE bcs.template_assets (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  template_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  PRIMARY KEY(company_id,template_id,asset_id),
  FOREIGN KEY (company_id,template_id) REFERENCES bcs.email_templates(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,asset_id) REFERENCES bcs.file_assets(company_id,id) ON DELETE RESTRICT
);
CREATE TABLE bcs.draft_assets (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  draft_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  PRIMARY KEY(company_id,draft_id,asset_id),
  FOREIGN KEY (company_id,draft_id) REFERENCES bcs.email_drafts(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,asset_id) REFERENCES bcs.file_assets(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.sending_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid,
  provider_account_id uuid NOT NULL,
  policy_name text NOT NULL,
  configured_rate_per_second numeric(12,3) CHECK (configured_rate_per_second > 0),
  configured_daily_budget bigint CHECK (configured_daily_budget >= 0),
  max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries BETWEEN 0 AND 20),
  is_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE NULLS NOT DISTINCT (company_id,portal_id,provider_account_id,policy_name),
  FOREIGN KEY (company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id,provider_account_id) REFERENCES bcs.provider_accounts(company_id,id) ON DELETE RESTRICT
);
-- Worker must use the minimum of SES-reported quota and internal policy; no "spam avoidance" guarantee.

CREATE TRIGGER templates_touch BEFORE UPDATE ON bcs.email_templates
 FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();
CREATE TRIGGER drafts_touch BEFORE UPDATE ON bcs.email_drafts
 FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();

INSERT INTO bcs.schema_migrations(version,description)
VALUES (4,'SES provider metadata, sender identities, HTML templates, drafts and file assets');
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
DO $secure$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
 END LOOP;
END $secure$;
COMMIT;
