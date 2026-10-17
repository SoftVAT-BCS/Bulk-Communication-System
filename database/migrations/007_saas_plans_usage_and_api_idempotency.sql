-- SOFTVAT BCS v1 / MIGRATION 007 -- SaaS plans, subscriptions, quotas and API request idempotency.
-- This is DATA STORAGE only, not a payment processor, licence enforcement or billing engine.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=6)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=7) THEN
   RAISE EXCEPTION 'BCS migration order mismatch at 007'; END IF;
END $guard$;

CREATE TABLE bcs.saas_plans (
  plan_code text PRIMARY KEY CHECK (plan_code ~ '^[a-z][a-z0-9_-]*$'),
  plan_name text NOT NULL,
  billing_period_months integer NOT NULL DEFAULT 1 CHECK (billing_period_months BETWEEN 1 AND 36),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  price_minor_units bigint NOT NULL DEFAULT 0 CHECK (price_minor_units >= 0),
  plan_limits jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(plan_limits)='object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
-- No actual plan prices or quotas are seeded: owner approval is required.

CREATE TABLE bcs.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  plan_code text NOT NULL REFERENCES bcs.saas_plans(plan_code) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'trial' CHECK (state IN ('trial','active','past_due','cancelled','expired')),
  begins_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  renews_at timestamptz,
  ends_at timestamptz,
  external_subscription_ref text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,id),
  CHECK (ends_at IS NULL OR ends_at >= begins_at)
);
CREATE UNIQUE INDEX one_active_subscription_per_company_idx ON bcs.company_subscriptions(company_id)
 WHERE state IN ('trial','active');

CREATE TABLE bcs.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  metric_code text NOT NULL CHECK (metric_code ~ '^[a-z][a-z0-9_.-]*$'),
  period_start date NOT NULL,
  period_end date NOT NULL,
  used_units bigint NOT NULL DEFAULT 0 CHECK (used_units >= 0),
  reserved_units bigint NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,metric_code,period_start,period_end),
  CHECK (period_end > period_start)
);

CREATE TABLE bcs.quota_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  metric_code text NOT NULL,
  reservation_key text NOT NULL CHECK (btrim(reservation_key) <> ''),
  reserved_units bigint NOT NULL CHECK (reserved_units > 0),
  state text NOT NULL DEFAULT 'held' CHECK (state IN ('held','consumed','released','expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,metric_code,reservation_key)
);
-- Reserving and consuming quotas must be done atomically by the future authorized API.

CREATE TABLE bcs.api_idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  api_client_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('POST','PUT','PATCH','DELETE')),
  operation_key text NOT NULL,
  idempotency_key text NOT NULL,
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  state text NOT NULL DEFAULT 'started' CHECK (state IN ('started','completed','failed','uncertain')),
  result_reference text,
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz NOT NULL,
  UNIQUE(company_id,api_client_id,method,operation_key,idempotency_key),
  FOREIGN KEY(company_id,api_client_id) REFERENCES bcs.api_clients(company_id,id) ON DELETE RESTRICT
);
-- Do not persist raw API request bodies, authentication headers or responses here.

CREATE TABLE bcs.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES bcs.companies(id) ON DELETE RESTRICT,
  subscription_id uuid,
  event_key text NOT NULL CHECK (btrim(event_key) <> ''),
  event_type text NOT NULL CHECK (event_type IN ('invoice_issued','payment_recorded','credit_issued','refund_recorded','adjustment')),
  reference_code text,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  amount_minor_units bigint NOT NULL,
  tax_minor_units bigint,
  state text NOT NULL DEFAULT 'recorded' CHECK (state IN ('recorded','verified','disputed','voided')),
  occurred_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  UNIQUE(company_id,event_key),
  FOREIGN KEY(company_id,subscription_id) REFERENCES bcs.company_subscriptions(company_id,id) ON DELETE RESTRICT
);
-- Financial event metadata only. No bank/card numbers, PCI data or payment credentials.

INSERT INTO bcs.schema_migrations(version,description)
VALUES (7,'SaaS plans/subscriptions, usage counters, quotas, API idempotency and billing metadata');
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
DO $secure$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
 END LOOP;
END $secure$;
COMMIT;
