-- SOFTVAT BCS: READ-ONLY preflight for the newly-created dedicated bcs-dev project.
-- This query does not create/alter any database object.
-- Run only after manually confirming Supabase project name AND project ref.
SELECT current_database() AS database_name,
       current_user AS executing_role,
       current_setting('server_version') AS postgres_version,
       current_setting('server_version_num')::integer AS postgres_version_number,
       current_setting('search_path') AS current_search_path,
       (SELECT rolsuper OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname = current_user) AS admin_can_bypass_rls,
       (SELECT count(*) FROM pg_catalog.pg_namespace WHERE nspname = 'bcs') AS existing_bcs_schemas,
       (SELECT count(*) FROM pg_catalog.pg_namespace WHERE nspname = 'bcs_demo') AS existing_old_demo_schemas,
       (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'bcs') AS existing_bcs_objects,
       pg_catalog.gen_random_uuid() AS uuid_function_available;
-- Expected: PostgreSQL >= 15; dedicated bcs-dev project; no bcs schema/objects;
-- admin_can_bypass_rls=true for running the initial SQL Editor migrations.
-- In Supabase dashboard: Data API DISABLED, bcs NOT in any exposed schema list.
-- Do NOT paste a database password or service key into this editor/chat.
