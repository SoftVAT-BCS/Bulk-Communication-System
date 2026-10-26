-- REVIEW ONLY / NOT EXECUTED. Run only after separate isolated database authorization.
-- Requires 001-022 in a disposable DB named bcs_increment1_isolated, never Supabase live.
-- Copies the real CHECK expression into a temporary fixture; no business rows are read/written.
BEGIN;
SET LOCAL search_path=pg_catalog;
DO $guard$ BEGIN
 IF current_database()<>'bcs_increment1_isolated' THEN RAISE EXCEPTION 'Isolated fixture database required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=22) THEN RAISE EXCEPTION '022 required'; END IF;
END $guard$;
CREATE TEMP TABLE simulation_policy_fixture(simulation_policy jsonb);
DO $fixture$
DECLARE expression text; bad jsonb;
BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO STRICT expression FROM pg_constraint
 WHERE conrelid='bcs.campaigns'::regclass AND conname='campaign_simulation_policy_object';
 EXECUTE format('ALTER TABLE pg_temp.simulation_policy_fixture ADD CONSTRAINT actual_policy_check CHECK (%s)',expression);
 INSERT INTO pg_temp.simulation_policy_fixture VALUES
 ('{"mode":"simulation","batchSize":10,"intervalSeconds":30,"startAt":"2026-10-20T00:00:00Z","timezone":"UTC"}');
 FOR bad IN SELECT value FROM jsonb_array_elements('[
   {"mode":"ses","batchSize":10,"intervalSeconds":30,"startAt":"2026-10-20T00:00:00Z","timezone":"UTC"},
   {"mode":null,"batchSize":10,"intervalSeconds":30,"startAt":"2026-10-20T00:00:00Z","timezone":"UTC"},
   {"mode":"simulation","batchSize":2,"intervalSeconds":30,"startAt":"2026-10-20T00:00:00Z","timezone":"UTC"},
   {"mode":"simulation","batchSize":10,"intervalSeconds":1,"startAt":"2026-10-20T00:00:00Z","timezone":"UTC"}
 ]'::jsonb) LOOP
  BEGIN
   INSERT INTO pg_temp.simulation_policy_fixture VALUES(bad);
   RAISE EXCEPTION 'Invalid policy was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END LOOP;
END $fixture$;
ROLLBACK;
-- Receipt, worker-role/RLS, SKIP LOCKED, fencing and quota settlement DB tests remain
-- required before a PostgreSQL worker is implemented/accepted. This fixture is not that acceptance.
