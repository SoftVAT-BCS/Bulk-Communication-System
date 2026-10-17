-- SOFTVAT BCS v1 / MIGRATION 005 -- Audiences, campaigns, durable queue and SES outcomes.
-- Database storage only; no dispatch worker, delivery claims or provider integration.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=4)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=5) THEN
   RAISE EXCEPTION 'BCS migration order mismatch at 005'; END IF;
END $guard$;

CREATE TABLE bcs.audience_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  created_by uuid,
  selection_type text NOT NULL CHECK (selection_type IN ('explicit','all_matching','source_event')),
  normalized_filter jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(normalized_filter)='object'),
  source_scope_hash text NOT NULL CHECK (btrim(source_scope_hash) <> ''),
  scope_generation bigint NOT NULL DEFAULT 1 CHECK (scope_generation >= 1),
  selection_status text NOT NULL DEFAULT 'draft' CHECK (selection_status IN ('draft','locked','expired','revoked')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,id),
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,created_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.audience_selection_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  selection_id uuid NOT NULL,
  source_recipient_key text NOT NULL CHECK (btrim(source_recipient_key) <> ''),
  decision text NOT NULL CHECK (decision IN ('include','exclude')),
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,selection_id,source_recipient_key),
  FOREIGN KEY(company_id,portal_id,selection_id)
    REFERENCES bcs.audience_selections(company_id,portal_id,id) ON DELETE RESTRICT
);
-- Large all-matching selections are resolved server-side against an authorized scope;
-- this table only records inclusion/exclusion exceptions, not a browser-downloaded full list.

CREATE TABLE bcs.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  campaign_code text NOT NULL CHECK (btrim(campaign_code) <> ''),
  title text NOT NULL CHECK (btrim(title) <> ''),
  communication_class text NOT NULL CHECK (communication_class IN ('operational','educational','marketing')),
  campaign_type text NOT NULL DEFAULT 'announcement',
  selection_id uuid,
  template_id uuid,
  sender_identity_id uuid,
  subject_snapshot text NOT NULL DEFAULT '',
  html_snapshot text NOT NULL DEFAULT '',
  text_snapshot text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'UTC',
  scheduled_for timestamptz,
  priority smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
  idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','review','approved','scheduled','queued','sending','completed','partial','paused','cancelled','failed')),
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,campaign_code),
  UNIQUE(company_id,portal_id,idempotency_key),
  UNIQUE(company_id,portal_id,id),
  UNIQUE(company_id,id),
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,portal_id,selection_id)
    REFERENCES bcs.audience_selections(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,template_id) REFERENCES bcs.email_templates(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,sender_identity_id) REFERENCES bcs.sender_identities(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,created_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,approved_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT
);
CREATE INDEX campaigns_time_idx ON bcs.campaigns(company_id,portal_id,scheduled_for) WHERE state IN ('scheduled','queued');
CREATE TRIGGER campaigns_touch BEFORE UPDATE ON bcs.campaigns FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();

CREATE TABLE bcs.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  recipient_id uuid,
  source_recipient_key text NOT NULL CHECK (btrim(source_recipient_key) <> ''),
  email_snapshot text NOT NULL CHECK (email_snapshot LIKE '%@%'),
  email_normalized text GENERATED ALWAYS AS (lower(btrim(email_snapshot))) STORED,
  display_name_snapshot text,
  personalization jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(personalization)='object'),
  eligibility_state text NOT NULL DEFAULT 'pending' CHECK (eligibility_state IN ('pending','eligible','suppressed','skipped','expired')),
  exclusion_reason text,
  resolved_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,campaign_id,email_normalized),
  UNIQUE(company_id,portal_id,id),
  UNIQUE(company_id,portal_id,campaign_id,id),
  FOREIGN KEY(company_id,portal_id,campaign_id) REFERENCES bcs.campaigns(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,portal_id,recipient_id) REFERENCES bcs.recipients(company_id,portal_id,id) ON DELETE RESTRICT
);
-- One campaign cannot enqueue two messages to the same normalized email; if several
-- source records share an email with different personalization, API must flag for review.
CREATE INDEX campaign_recipients_campaign_idx ON bcs.campaign_recipients(company_id,portal_id,campaign_id,eligibility_state);

CREATE TABLE bcs.campaign_assets (
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  campaign_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  PRIMARY KEY(company_id,campaign_id,asset_id),
  FOREIGN KEY(company_id,campaign_id) REFERENCES bcs.campaigns(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,asset_id) REFERENCES bcs.file_assets(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  campaign_recipient_id uuid NOT NULL,
  delivery_state text NOT NULL DEFAULT 'queued' CHECK (delivery_state IN
     ('queued','in_flight','submitted','delivered','bounced','complained','suppressed','failed','unknown','cancelled')),
  provider_message_id text,
  message_idempotency_key text NOT NULL CHECK (btrim(message_idempotency_key) <> ''),
  subject_snapshot text NOT NULL,
  html_snapshot text NOT NULL,
  text_snapshot text NOT NULL DEFAULT '',
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  submitted_at timestamptz,
  delivered_at timestamptz,
  next_attempt_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,campaign_id,campaign_recipient_id),
  UNIQUE(company_id,message_idempotency_key),
  UNIQUE(company_id,id),
  UNIQUE(company_id,campaign_id,id),
  FOREIGN KEY(company_id,portal_id,campaign_id) REFERENCES bcs.campaigns(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,portal_id,campaign_id,campaign_recipient_id)
    REFERENCES bcs.campaign_recipients(company_id,portal_id,campaign_id,id) ON DELETE RESTRICT
);
CREATE INDEX messages_status_idx ON bcs.outbound_messages(company_id,delivery_state,created_at);
CREATE INDEX messages_provider_ref_idx ON bcs.outbound_messages(company_id,provider_message_id)
 WHERE provider_message_id IS NOT NULL;
CREATE TRIGGER messages_touch BEFORE UPDATE ON bcs.outbound_messages FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();

CREATE TABLE bcs.dispatch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  message_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  job_state text NOT NULL DEFAULT 'pending' CHECK (job_state IN
    ('pending','leased','retry_wait','completed','cancelled','dead_letter','unknown')),
  priority smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
  available_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 4 CHECK (max_attempts BETWEEN 1 AND 21),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,message_id),
  FOREIGN KEY(company_id,campaign_id,message_id)
    REFERENCES bcs.outbound_messages(company_id,campaign_id,id) ON DELETE RESTRICT
);
-- Future worker must claim jobs transactionally with FOR UPDATE SKIP LOCKED and leases.
-- Do not automatically retry ambiguous 'unknown' SES outcomes without reconciliation.
CREATE INDEX dispatch_pending_idx ON bcs.dispatch_jobs(job_state,available_at,priority)
 WHERE job_state IN ('pending','retry_wait');
CREATE TRIGGER dispatch_jobs_touch BEFORE UPDATE ON bcs.dispatch_jobs
 FOR EACH ROW EXECUTE FUNCTION bcs.touch_updated_at();

CREATE TABLE bcs.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  message_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  provider_request_key text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('accepted','rejected','timeout','transport_failure','unknown')),
  error_code text,
  retryable boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  completed_at timestamptz,
  UNIQUE(company_id,message_id,attempt_number),
  FOREIGN KEY(company_id,message_id) REFERENCES bcs.outbound_messages(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  provider_account_id uuid NOT NULL,
  message_id uuid,
  external_event_key text NOT NULL CHECK (btrim(external_event_key) <> ''),
  provider_message_id text,
  event_type text NOT NULL CHECK (event_type IN ('send','delivery','bounce','complaint','reject','rendering_failure','delivery_delay','subscription')),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  signature_verified boolean NOT NULL DEFAULT false,
  safe_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_details)='object'),
  UNIQUE(company_id,provider_account_id,external_event_key),
  FOREIGN KEY(company_id,provider_account_id) REFERENCES bcs.provider_accounts(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,message_id) REFERENCES bcs.outbound_messages(company_id,id) ON DELETE RESTRICT
);
CREATE INDEX provider_events_message_idx ON bcs.provider_events(company_id,message_id,occurred_at DESC);

CREATE TABLE bcs.unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  message_id uuid NOT NULL,
  token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(token_hash),
  FOREIGN KEY(company_id,message_id) REFERENCES bcs.outbound_messages(company_id,id) ON DELETE RESTRICT
);
-- The public unsubscribe URL contains a random raw token, never the stored hash.
-- Backend must apply suppression and record evidence in a single authorized transaction.

ALTER TABLE bcs.email_drafts ADD CONSTRAINT drafts_audience_selection_fk
 FOREIGN KEY(company_id,portal_id,recipient_selection_ref)
 REFERENCES bcs.audience_selections(company_id,portal_id,id) ON DELETE RESTRICT;

INSERT INTO bcs.schema_migrations(version,description)
VALUES (5,'Campaigns, resolved recipients, dispatch queue, attempts, SES feedback, unsubscribe tokens');
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
DO $secure$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
 END LOOP;
END $secure$;
COMMIT;
