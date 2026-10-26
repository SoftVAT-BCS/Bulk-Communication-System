-- PROPOSED / NOT EXECUTED. Increment 1 storage delta; not worker deployment approval.
-- Reconcile the applied checksum of proposals/010_recipient_reader_PENDING_APPROVAL.sql
-- against the isolated target ledger first. Preserve all 001-021 source bytes.
-- Existing queue is bcs.dispatch_jobs / bcs.outbound_messages (NOT outgoing_messages).
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=21)
 OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=10)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=22) THEN
  RAISE EXCEPTION 'BCS migration order mismatch at 022; reconcile 010 provenance';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='bcs'
   AND table_name='campaigns' AND column_name='simulation_policy') THEN
  RAISE EXCEPTION 'Existing simulation policy requires explicit compatibility review';
 END IF;
END $guard$;

ALTER TABLE bcs.campaigns ADD COLUMN simulation_policy jsonb;
ALTER TABLE bcs.campaigns ADD CONSTRAINT campaign_simulation_policy_object
 CHECK (simulation_policy IS NULL OR COALESCE((jsonb_typeof(simulation_policy)='object'
   AND simulation_policy->>'mode'='simulation'
   AND (simulation_policy->>'batchSize')::integer IN (1,5,10,25,50)
   AND (simulation_policy->>'intervalSeconds')::integer BETWEEN 5 AND 600
   AND simulation_policy ?& ARRAY['mode','batchSize','intervalSeconds','startAt','timezone']),false));
GRANT UPDATE(simulation_policy) ON bcs.campaigns TO bcs_app_backend;
-- Existing campaign UPDATE RLS requires compose.draft; API additionally requires campaigns.schedule.
-- Complete numeric/timezone validation is performed by the existing scoped backend API.
-- No existing campaign implicitly opts into simulation or gets unpaused.
ALTER TABLE bcs.dispatch_jobs ADD COLUMN simulation_next_batch_at timestamptz;
ALTER TABLE bcs.outbound_messages ADD COLUMN simulation_receipt jsonb;
ALTER TABLE bcs.outbound_messages ADD CONSTRAINT simulation_receipt_truth
 CHECK (simulation_receipt IS NULL OR COALESCE((jsonb_typeof(simulation_receipt)='object'
   AND simulation_receipt->>'outcome'='simulated'
   AND simulation_receipt ?& ARRAY['outcome','attemptKey','completedAt']
   AND provider_message_id IS NULL AND submitted_at IS NULL AND delivered_at IS NULL
   AND delivery_state NOT IN ('submitted','delivered')),false));
ALTER TABLE bcs.delivery_attempts ADD COLUMN execution_mode text NOT NULL DEFAULT 'live_disabled'
 CHECK (execution_mode IN ('live_disabled','simulation'));
ALTER TABLE bcs.delivery_attempts ADD COLUMN simulation_result text
 CHECK (simulation_result IN ('simulated','retryable_failure','permanent_failure'));
ALTER TABLE bcs.delivery_attempts ADD CONSTRAINT simulation_attempt_truth
 CHECK ((execution_mode='live_disabled' AND simulation_result IS NULL)
   OR (execution_mode='simulation' AND simulation_result IS NOT NULL AND outcome='unknown'));
-- Existing outcome CHECK is retained. Simulation never writes accepted/provider delivery.
-- Do not deploy a database worker until simulation-aware reporting and scoped worker
-- grants/claim/settlement SQL have passed separately authorized isolated DB tests.
-- Reuse existing lease tokens, quota_reservations and usage_counters; no duplicate tables.
INSERT INTO bcs.schema_migrations(version,description)
 VALUES(22,'Proposed simulation policies and receipt storage; no worker grants or activation');
COMMIT;

-- Prerequisites: reviewed owner migration role, backup+restore evidence, ledger/checksum
-- reconciliation, RLS/column-grant verification and isolated fixture acceptance.
-- Recovery: disable new policy actions; leave nullable additive columns in place.
-- Do not drop columns or rewrite old migrations as a rollback shortcut.
