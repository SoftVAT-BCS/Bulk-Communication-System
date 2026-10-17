-- SOFTVAT BCS v1 / MIGRATION 006 -- Business events, reminders, callbacks, reports and audit.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=5)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=6) THEN
   RAISE EXCEPTION 'BCS migration order mismatch at 006'; END IF;
END $guard$;

CREATE TABLE bcs.class_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  source_event_key text NOT NULL CHECK (btrim(source_event_key) <> ''),
  source_revision integer NOT NULL CHECK (source_revision >= 1),
  class_title text NOT NULL CHECK (btrim(class_title) <> ''),
  start_at timestamptz,
  end_at timestamptz,
  timezone text NOT NULL DEFAULT 'UTC',
  state text NOT NULL CHECK (state IN ('scheduled','rescheduled','cancelled')),
  source_event_type text NOT NULL DEFAULT 'class',
  safe_context jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_context)='object'),
  recorded_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,source_event_key,source_revision),
  UNIQUE(company_id,portal_id,id),
  CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at),
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT
);
-- Source portal remains class schedule authority; each change is a new revision.

CREATE TABLE bcs.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  rule_code text NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('created','rescheduled','cancelled','reminder')),
  template_id uuid,
  offset_before_start interval,
  priority smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','retired')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,rule_code),
  UNIQUE(company_id,portal_id,id),
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,template_id) REFERENCES bcs.email_templates(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid NOT NULL,
  class_event_id uuid NOT NULL,
  rule_id uuid NOT NULL,
  campaign_id uuid,
  deduplication_key text NOT NULL CHECK (btrim(deduplication_key) <> ''),
  planned_for timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled','cancelled','queued','completed','superseded')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,portal_id,deduplication_key),
  FOREIGN KEY(company_id,portal_id,class_event_id) REFERENCES bcs.class_events(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,portal_id,rule_id) REFERENCES bcs.notification_rules(company_id,portal_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,portal_id,campaign_id) REFERENCES bcs.campaigns(company_id,portal_id,id) ON DELETE RESTRICT
);
CREATE INDEX scheduled_notifications_due_idx ON bcs.scheduled_notifications(planned_for)
  WHERE state='scheduled';

CREATE TABLE bcs.client_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid,
  endpoint_label text NOT NULL,
  callback_https_url text NOT NULL CHECK (callback_https_url ~ '^https://'),
  signing_secret_ref text NOT NULL,
  subscribed_events jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(subscribed_events)='array'),
  status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled','active','paused')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,id),
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT
);
-- Outbound client callbacks must enforce URL allowlists/SSRF defenses and HMAC validation.

CREATE TABLE bcs.client_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  endpoint_id uuid NOT NULL,
  event_reference text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  http_status integer CHECK (http_status BETWEEN 100 AND 599),
  status text NOT NULL CHECK (status IN ('pending','succeeded','retryable','permanent_failure')),
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
  error_code text,
  UNIQUE(company_id,endpoint_id,event_reference,attempt_number),
  FOREIGN KEY(company_id,endpoint_id) REFERENCES bcs.client_webhook_endpoints(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.report_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid,
  requested_by uuid,
  report_kind text NOT NULL CHECK (report_kind IN ('summary','delivery_history','suppression','recipient_export','queue')),
  filter_scope jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filter_scope)='object'),
  export_format text NOT NULL CHECK (export_format IN ('csv','xlsx')),
  asset_id uuid,
  state text NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','running','completed','failed','expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  completed_at timestamptz,
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,requested_by) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,asset_id) REFERENCES bcs.file_assets(company_id,id) ON DELETE RESTRICT
);

CREATE TABLE bcs.retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  data_category text NOT NULL CHECK (data_category IN ('recipients','message_snapshots','provider_events','audit_events','assets','imports','exports')),
  retention_days integer NOT NULL CHECK (retention_days BETWEEN 1 AND 36500),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','paused')),
  legal_hold boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  UNIQUE(company_id,data_category)
);
-- No automatic deletion based on this table until a separately approved retention worker exists.

CREATE TABLE bcs.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  portal_id uuid,
  actor_principal_id uuid,
  actor_api_client_id uuid,
  action text NOT NULL CHECK (btrim(action) <> ''),
  entity_type text NOT NULL,
  entity_reference text,
  correlation_id text,
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_metadata)='object'),
  occurred_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  FOREIGN KEY(company_id,portal_id) REFERENCES bcs.portals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,actor_principal_id) REFERENCES bcs.principals(company_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(company_id,actor_api_client_id) REFERENCES bcs.api_clients(company_id,id) ON DELETE RESTRICT
);
CREATE INDEX audit_company_time_idx ON bcs.audit_events(company_id,occurred_at DESC);
-- Append-only enforcement requires restricted runtime privileges + audited API design;
-- migrations intentionally grant NO insert/update/delete access to any API role.

INSERT INTO bcs.schema_migrations(version,description)
VALUES (6,'Class events, notification rules, callbacks, exports, retention metadata, audits');
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
DO $secure$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
 END LOOP;
END $secure$;
COMMIT;
