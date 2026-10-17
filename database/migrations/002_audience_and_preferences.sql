-- SOFTVAT BCS v1 / MIGRATION 002 -- Recipients, group hierarchy, consent, suppression and imports.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version = 1) OR
     EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version = 2) THEN
    RAISE EXCEPTION 'BCS migration order mismatch at 002';
  END IF;
END
$guard$;

CREATE TABLE bcs.audience_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  source_group_key text NOT NULL CHECK (btrim(source_group_key) <> ''),
  group_name text NOT NULL CHECK (btrim(group_name) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, portal_id, id),
  UNIQUE (company_id, portal_id, source_group_key),
  FOREIGN KEY (company_id, portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.audience_subgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  group_id uuid NOT NULL,
  source_subgroup_key text NOT NULL CHECK (btrim(source_subgroup_key) <> ''),
  subgroup_name text NOT NULL CHECK (btrim(subgroup_name) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  UNIQUE (company_id, portal_id, group_id, id),
  UNIQUE (company_id, portal_id, group_id, source_subgroup_key),
  FOREIGN KEY (company_id, portal_id, group_id)
    REFERENCES bcs.audience_groups(company_id,portal_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  -- All 17 fields from UniversalNotify_Recipient_Selection_Demo.csv:
  target_id text NOT NULL CHECK (target_id <> '' AND target_id = btrim(target_id)),
  name text NOT NULL CHECK (name <> '' AND name = btrim(name)),
  email text NOT NULL CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
                              AND email = btrim(email)),
  recipient_group text NOT NULL CHECK (btrim(recipient_group) <> ''),
  category text NOT NULL CHECK (btrim(category) <> ''),
  grade text,
  dob date,
  gender text,
  mobile_no text,
  whatsapp_no text,
  address_1 text,
  address_2 text,
  city text,
  pin text,
  st_id text,
  dt_id text,
  status text NOT NULL CHECK (status IN ('Active','Inactive','Bounced','Unsubscribed')),
  email_normalized text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, portal_id, target_id),
  UNIQUE (company_id, portal_id, id),
  FOREIGN KEY (company_id, portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  CHECK (grade IS NULL OR btrim(grade) <> ''),
  CHECK (mobile_no IS NULL OR mobile_no ~ '^\+[1-9][0-9]{7,14}$'),
  CHECK (whatsapp_no IS NULL OR whatsapp_no ~ '^\+[1-9][0-9]{7,14}$')
);
-- Group/category are source display labels; normalized memberships below provide group relationships.
-- Recipient email is not globally unique; deduplicate at campaign delivery level.
CREATE INDEX recipients_email_idx ON bcs.recipients(company_id,portal_id,email_normalized text_pattern_ops);
CREATE INDEX recipients_name_idx ON bcs.recipients(company_id,portal_id,lower(name) text_pattern_ops);
CREATE INDEX recipients_group_idx ON bcs.recipients(company_id,portal_id,recipient_group,category);
CREATE INDEX recipients_status_idx ON bcs.recipients(company_id,portal_id,status);

CREATE TABLE bcs.recipient_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  group_id uuid NOT NULL,
  subgroup_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id, portal_id, recipient_id, group_id, subgroup_id),
  FOREIGN KEY (company_id, portal_id, recipient_id)
    REFERENCES bcs.recipients(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (company_id, portal_id, group_id, subgroup_id)
    REFERENCES bcs.audience_subgroups(company_id,portal_id,group_id,id) ON DELETE RESTRICT
);
CREATE INDEX memberships_by_group_idx ON bcs.recipient_group_memberships(company_id,portal_id,group_id,subgroup_id);

CREATE TABLE bcs.recipient_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  communication_category text NOT NULL CHECK (communication_category IN ('operational','marketing','educational','other')),
  preference text NOT NULL CHECK (preference IN ('subscribed','unsubscribed','unknown')),
  legal_basis text CHECK (legal_basis IN ('consent','contract','legal_obligation','legitimate_interest','other')),
  evidence_ref text,
  effective_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (company_id,portal_id,recipient_id,communication_category),
  FOREIGN KEY (company_id,portal_id,recipient_id)
    REFERENCES bcs.recipients(company_id,portal_id,id) ON DELETE RESTRICT
);
-- No implied consent based on presence in the CSV, nor on 'Active' status.

CREATE TABLE bcs.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  communication_category text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('opt_in','opt_out','basis_recorded','basis_revoked','imported_evidence')),
  evidence_ref text,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  FOREIGN KEY (company_id,portal_id,recipient_id)
    REFERENCES bcs.recipients(company_id,portal_id,id) ON DELETE RESTRICT
);
CREATE INDEX consent_events_recipient_idx ON bcs.consent_events(company_id,portal_id,recipient_id,recorded_at DESC);

CREATE TABLE bcs.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  email_normalized text NOT NULL CHECK (email_normalized = lower(btrim(email_normalized)) AND email_normalized LIKE '%@%'),
  reason text NOT NULL CHECK (reason IN ('hard_bounce','complaint','unsubscribe','manual','policy')),
  scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company')),
  is_active boolean NOT NULL DEFAULT true,
  source_reference text,
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  released_at timestamptz,
  UNIQUE (company_id,email_normalized,reason),
  CHECK (released_at IS NULL OR NOT is_active)
);
CREATE INDEX active_suppressions_idx ON bcs.email_suppressions(company_id,email_normalized)
  WHERE is_active = true;

CREATE TABLE bcs.contact_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  external_batch_key text NOT NULL CHECK (btrim(external_batch_key) <> ''),
  original_file_name text,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  input_encoding text,
  input_delimiter text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected','importing','completed','failed')),
  reported_rows integer CHECK (reported_rows IS NULL OR reported_rows >= 0),
  accepted_rows integer CHECK (accepted_rows IS NULL OR accepted_rows >= 0),
  rejected_rows integer CHECK (rejected_rows IS NULL OR rejected_rows >= 0),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  completed_at timestamptz,
  UNIQUE (company_id,portal_id,external_batch_key),
  UNIQUE (company_id,portal_id,id),
  FOREIGN KEY (company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.contact_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  row_number integer NOT NULL CHECK (row_number >= 1),
  column_name text,
  error_code text NOT NULL,
  safe_message text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  FOREIGN KEY (company_id,portal_id,batch_id)
    REFERENCES bcs.contact_import_batches(company_id,portal_id,id) ON DELETE RESTRICT
);
CREATE INDEX import_errors_batch_idx ON bcs.contact_import_errors(company_id,portal_id,batch_id,row_number);

CREATE TRIGGER recipients_touch BEFORE UPDATE ON bcs.recipients
FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();

INSERT INTO bcs.schema_migrations(version,description)
VALUES (2,'Audience groups, recipients, memberships, preferences, suppressions and imports');
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
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
