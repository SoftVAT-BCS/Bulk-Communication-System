-- PROPOSED / NOT EXECUTED. See docs/architecture/RECIPIENT-DATA-FOUNDATION.md.
-- Run only after target, backup, owner role and isolated rehearsal approval.
-- Existing schema causes an atomic failure; never mask incompatible objects.
BEGIN;
SET LOCAL ROLE bcs_demo_owner;
SET LOCAL search_path = pg_catalog;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user
               AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN
        RAISE EXCEPTION 'Expected non-login, non-superuser, non-BYPASSRLS owner';
    END IF;
END $$;

CREATE SCHEMA bcs_demo AUTHORIZATION bcs_demo_owner;
REVOKE ALL ON SCHEMA bcs_demo FROM PUBLIC;

CREATE TABLE bcs_demo.recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_key text NOT NULL CHECK (portal_key ~ '^[a-z][a-z0-9_-]{0,62}$'),
    target_id text NOT NULL CHECK (target_id <> '' AND target_id = btrim(target_id)),
    name text NOT NULL CHECK (name <> '' AND name = btrim(name)),
    email text NOT NULL CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
    recipient_group text NOT NULL CONSTRAINT recipients_group_nonblank
        CHECK (recipient_group ~ '[^[:space:]]'),
    category text NOT NULL CONSTRAINT recipients_category_nonblank
        CHECK (category ~ '[^[:space:]]'),
    grade text CHECK (grade IS NULL OR (grade <> '' AND grade = btrim(grade))),
    dob date,
    gender text CHECK (gender IS NULL OR gender <> ''),
    mobile_no text CHECK (mobile_no IS NULL OR mobile_no ~ '^\+[1-9][0-9]{7,14}$'),
    whatsapp_no text CHECK (whatsapp_no IS NULL OR whatsapp_no ~ '^\+[1-9][0-9]{7,14}$'),
    address_1 text CHECK (address_1 IS NULL OR address_1 <> ''),
    address_2 text CHECK (address_2 IS NULL OR address_2 <> ''),
    city text CHECK (city IS NULL OR city <> ''),
    pin text CHECK (pin IS NULL OR pin <> ''),
    st_id text CHECK (st_id IS NULL OR st_id <> ''),
    dt_id text CHECK (dt_id IS NULL OR dt_id <> ''),
    status text NOT NULL CHECK (status IN ('Active', 'Inactive', 'Bounced', 'Unsubscribed')),
    created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT statement_timestamp(),
    CONSTRAINT recipients_portal_target_key UNIQUE (portal_key, target_id)
);
REVOKE ALL ON bcs_demo.recipients FROM PUBLIC;
CREATE INDEX recipients_portal_group_category_idx ON bcs_demo.recipients (portal_key, recipient_group, category);
CREATE INDEX recipients_portal_status_idx ON bcs_demo.recipients (portal_key, status);
CREATE INDEX recipients_portal_email_idx ON bcs_demo.recipients (portal_key, lower(email) text_pattern_ops);
CREATE INDEX recipients_portal_name_idx ON bcs_demo.recipients (portal_key, lower(name) text_pattern_ops);

CREATE FUNCTION bcs_demo.guard_recipient_update() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
    IF ROW(NEW.id, NEW.portal_key, NEW.target_id, NEW.created_at)
       IS DISTINCT FROM ROW(OLD.id, OLD.portal_key, OLD.target_id, OLD.created_at) THEN
        RAISE EXCEPTION 'Recipient identity and creation timestamp are immutable';
    END IF;
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION bcs_demo.guard_recipient_update() FROM PUBLIC;
CREATE TRIGGER recipients_before_update BEFORE UPDATE ON bcs_demo.recipients
FOR EACH ROW EXECUTE FUNCTION bcs_demo.guard_recipient_update();

ALTER TABLE bcs_demo.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcs_demo.recipients FORCE ROW LEVEL SECURITY;
-- Intentionally NO access policies or runtime grants: default deny until reviewed.
-- Refuse inherited default grants rather than silently exposing new BCS objects.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_namespace n, LATERAL aclexplode(n.nspacl) a
        WHERE n.nspname = 'bcs_demo' AND a.grantee <> n.nspowner
        UNION ALL
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
            LATERAL aclexplode(c.relacl) a
        WHERE n.nspname = 'bcs_demo' AND a.grantee <> c.relowner
        UNION ALL
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
            LATERAL aclexplode(p.proacl) a
        WHERE n.nspname = 'bcs_demo' AND a.grantee <> p.proowner
    ) THEN
        RAISE EXCEPTION 'Unexpected BCS privileges; review owner default ACLs before retry';
    END IF;
END $$;
COMMIT;
