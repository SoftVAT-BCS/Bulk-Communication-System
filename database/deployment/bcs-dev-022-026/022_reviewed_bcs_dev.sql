-- PROPOSED bcs-dev deployment variant 022; NOT EXECUTED.
-- Run only through the reviewed wrapper. Original isolated migration is untouched.
-- Wrapper owns one atomic transaction across all variants; no standalone COMMIT.
DO $deployment$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres'
 OR current_setting('bcs.deployment_approval',true) IS DISTINCT FROM 'BCS_DEV_022_026_OWNER_APPROVED'
 OR COALESCE(current_setting('bcs.verified_backup_sha256',true),'') !~ '^[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=21)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=22)
 THEN RAISE EXCEPTION 'Reviewed deployment context/order required for 022'; END IF;
END $deployment$;
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
