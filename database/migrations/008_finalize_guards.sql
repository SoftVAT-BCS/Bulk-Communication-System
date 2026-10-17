-- SOFTVAT BCS v1 / MIGRATION 008 -- Final private-schema access gate and metadata.
-- IMPORTANT: No permissive RLS policies, no anon/authenticated/service_role grants.
-- A trusted API authorization design and dedicated runtime identity remain separate work.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=7)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=8) THEN
   RAISE EXCEPTION 'BCS migration order mismatch at 008'; END IF;
END $guard$;

REVOKE ALL ON SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA bcs FROM PUBLIC, anon, authenticated, service_role;

-- Migration runner owns objects; do not grant the owner or BYPASSRLS role to app clients.
-- Revoke schema-specific defaults if any; future migrations must STILL explicitly
-- revoke on newly created objects because global default ACLs are independent.
ALTER DEFAULT PRIVILEGES IN SCHEMA bcs REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA bcs REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA bcs REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

DO $secure$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
  EXECUTE format('ALTER TABLE bcs.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('ALTER TABLE bcs.%I FORCE ROW LEVEL SECURITY',t.relname);
 END LOOP;
END $secure$;

DO $aclcheck$
DECLARE t record; r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_schema_privilege(r,'bcs','USAGE') THEN
      RAISE EXCEPTION 'Unexpected USAGE on private bcs schema for role %', r;
    END IF;
  END LOOP;
  FOR t IN SELECT c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='bcs' AND c.relkind IN ('r','p') LOOP
    IF NOT t.relrowsecurity OR NOT t.relforcerowsecurity THEN
      RAISE EXCEPTION 'RLS not enforced on bcs.%', t.relname;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_table_privilege(r,t.oid,'SELECT') OR has_table_privilege(r,t.oid,'INSERT')
         OR has_table_privilege(r,t.oid,'UPDATE') OR has_table_privilege(r,t.oid,'DELETE') THEN
         RAISE EXCEPTION 'Unexpected data privileges on bcs.% for role %',t.relname,r;
      END IF;
    END LOOP;
  END LOOP;
END $aclcheck$;

COMMENT ON SCHEMA bcs IS 'Private SoftVAT Bulk Communication System SaaS storage. Not exposed by Supabase Data API. Backend auth/roles/policies not provisioned.';
COMMENT ON TABLE bcs.recipients IS '17-column portal recipient mapping plus tenant/portal identity. Not authority for consent or real send eligibility.';
COMMENT ON TABLE bcs.email_templates IS 'Sanitized rich HTML/template source; revisions and send-time snapshots required in trusted backend.';
COMMENT ON TABLE bcs.outbound_messages IS 'Provider submission is not confirmed delivery or inbox placement.';

INSERT INTO bcs.schema_migrations(version,description)
VALUES (8,'Private storage final grants/RLS hardening and metadata');
COMMIT;
