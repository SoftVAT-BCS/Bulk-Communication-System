-- CSV-only alternative 026 for existing bcs-dev 001-021.
-- Owner authorized development-only activation without a backup/restore exercise.
-- Explicit execution approval and all identity/schema/security guards remain required.
-- Do NOT combine with bundled 026.
-- No dependency on SaaS/worker migrations 022-025. No recipient data changes.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $gate$
DECLARE item text;
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres'
 OR current_setting('bcs.csv_deployment_approval',true) IS DISTINCT FROM 'BCS_DEV_CSV_ONLY_OWNER_APPROVED'
 OR (SELECT count(*) FROM bcs.schema_migrations WHERE version BETWEEN 1 AND 21)<>21
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version>21)
 OR NOT EXISTS(SELECT 1 FROM bcs.permissions WHERE permission_code='recipients.import')
 THEN RAISE EXCEPTION 'CSV-only deployment requires reviewed bcs-dev 001-021, explicit owner approval'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='bcs' AND table_name='contact_import_batches' AND column_name IN ('csv_owner','csv_receipt'))
 THEN RAISE EXCEPTION 'Existing CSV definitions require review; no silent overwrite'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='bcs_app_backend' AND NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication))
 THEN RAISE EXCEPTION 'Restricted runtime role required'; END IF;
 FOREACH item IN ARRAY ARRAY['recipients','audience_groups','audience_subgroups','recipient_group_memberships','contact_import_batches','contact_import_errors','audit_events'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bcs' AND c.relname=item AND c.relrowsecurity AND c.relforcerowsecurity)
  THEN RAISE EXCEPTION 'Required forced RLS missing on %',item; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='bcs.recipients'::regclass AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (company_id, portal_id, target_id)')
 THEN RAISE EXCEPTION 'Company/portal/contact uniqueness missing'; END IF;
END $gate$;

DO $drift$
BEGIN
 IF md5(pg_get_functiondef('bcs.session_allows(uuid,uuid,text)'::regprocedure)) <> 'd8e1f8954a959a7560ff157c51b0f116'
 THEN RAISE EXCEPTION 'Session authorization definition changed; review required'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE member='bcs_app_backend'::regrole)
 THEN RAISE EXCEPTION 'Backend role memberships require review'; END IF;
 IF (SELECT count(*) FROM bcs.recipients WHERE company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2' AND portal_id='1dc3ad5d-35b4-4b01-aaaf-cc824fe7f52d') <> 240
 OR (SELECT md5(string_agg(md5(to_jsonb(r)::text),',' ORDER BY id)) FROM bcs.recipients r WHERE company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2' AND portal_id='1dc3ad5d-35b4-4b01-aaaf-cc824fe7f52d') IS DISTINCT FROM '203944bbb5b9d90003d457d13a534c9a'
 THEN RAISE EXCEPTION 'Recipient baseline changed; refresh review, do not bypass'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bcs.company_subscriptions s JOIN bcs.saas_plans p USING(plan_code) WHERE s.company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2' AND s.plan_code='bcs_dev_internal' AND s.state IN ('trial','active') AND s.begins_at<=now() AND (s.ends_at IS NULL OR s.ends_at>now()) AND p.status='active' AND (p.plan_limits->>'max_contacts')::integer>=241 AND (p.plan_limits->>'max_live_emails')::integer=0)
 THEN RAISE EXCEPTION 'Active development plan with sufficient contact allowance and disabled live email required'; END IF;
END $drift$;
ALTER TABLE bcs.contact_import_batches ADD COLUMN csv_owner uuid,
 ADD COLUMN csv_receipt jsonb,
 ADD CONSTRAINT csv_owner_scope FOREIGN KEY(company_id,csv_owner) REFERENCES bcs.principals(company_id,id),
 ADD CONSTRAINT csv_receipt_shape CHECK ((csv_owner IS NULL AND csv_receipt IS NULL) OR (csv_owner IS NOT NULL AND csv_receipt IS NOT NULL AND jsonb_typeof(csv_receipt)='object'));
GRANT INSERT(grade,dob,gender,mobile_no,whatsapp_no,address_1,address_2,city,pin,state_name,district_name),UPDATE(grade,dob,gender,mobile_no,whatsapp_no,address_1,address_2,city,pin,state_name,district_name) ON bcs.recipients TO bcs_app_backend;
CREATE POLICY csv_recipient_read ON bcs.recipients FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_recipient_insert ON bcs.recipients FOR INSERT TO bcs_app_backend WITH CHECK(status<>'Active' AND bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_recipient_update ON bcs.recipients FOR UPDATE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import')) WITH CHECK(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_groups_read ON bcs.audience_groups FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_subgroups_read ON bcs.audience_subgroups FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_membership_read ON bcs.recipient_group_memberships FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_membership_insert ON bcs.recipient_group_memberships FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_membership_delete ON bcs.recipient_group_memberships FOR DELETE TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import'));
CREATE POLICY csv_batch_read ON bcs.contact_import_batches FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import') AND csv_owner IN (SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND revoked_at IS NULL AND expires_at>now()));
CREATE POLICY csv_batch_insert ON bcs.contact_import_batches FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'recipients.import') AND csv_owner IN (SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND revoked_at IS NULL AND expires_at>now()));
CREATE POLICY csv_error_read ON bcs.contact_import_errors FOR SELECT TO bcs_app_backend USING(bcs.session_allows(company_id,portal_id,'recipients.import') AND EXISTS(SELECT 1 FROM bcs.contact_import_batches b WHERE b.company_id=contact_import_errors.company_id AND b.portal_id=contact_import_errors.portal_id AND b.id=contact_import_errors.batch_id AND b.csv_owner IS NOT NULL));
CREATE POLICY csv_error_insert ON bcs.contact_import_errors FOR INSERT TO bcs_app_backend WITH CHECK(bcs.session_allows(company_id,portal_id,'recipients.import') AND EXISTS(SELECT 1 FROM bcs.contact_import_batches b WHERE b.company_id=contact_import_errors.company_id AND b.portal_id=contact_import_errors.portal_id AND b.id=contact_import_errors.batch_id AND b.csv_owner IS NOT NULL));
CREATE POLICY csv_audit_insert ON bcs.audit_events FOR INSERT TO bcs_app_backend WITH CHECK(action='csv.contacts.import' AND bcs.session_allows(company_id,portal_id,'recipients.import') AND actor_principal_id IN (SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND revoked_at IS NULL AND expires_at>now()));
-- No permissions on consent, preferences, suppressions, credentials or provider tables.
-- Existing API idempotency remains client-keyed. CSV uses the existing unique batch key
-- plus immutable request hash, owner, chunk sequence and previous committed batch ID.
-- Restrictive policies AND with existing permissive API/session policies.
-- Non-CSV API batches retain their original access rules; CSV batches require owner session.
CREATE POLICY csv_batch_owner_boundary ON bcs.contact_import_batches AS RESTRICTIVE FOR ALL TO bcs_app_backend USING(csv_owner IS NULL OR (bcs.session_allows(company_id,portal_id,'recipients.import') AND csv_owner IN (SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND company_id=contact_import_batches.company_id AND portal_id=contact_import_batches.portal_id AND revoked_at IS NULL AND expires_at>now()))) WITH CHECK(csv_owner IS NULL OR (bcs.session_allows(company_id,portal_id,'recipients.import') AND csv_owner IN (SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND company_id=contact_import_batches.company_id AND portal_id=contact_import_batches.portal_id AND revoked_at IS NULL AND expires_at>now())));
-- Parent batch RLS protects errors even when the existing API policy is permissive.
CREATE POLICY csv_error_owner_boundary ON bcs.contact_import_errors AS RESTRICTIVE FOR ALL TO bcs_app_backend USING(EXISTS(SELECT 1 FROM bcs.contact_import_batches b WHERE b.company_id=contact_import_errors.company_id AND b.portal_id=contact_import_errors.portal_id AND b.id=contact_import_errors.batch_id)) WITH CHECK(EXISTS(SELECT 1 FROM bcs.contact_import_batches b WHERE b.company_id=contact_import_errors.company_id AND b.portal_id=contact_import_errors.portal_id AND b.id=contact_import_errors.batch_id));
CREATE POLICY csv_audit_actor_boundary ON bcs.audit_events AS RESTRICTIVE FOR INSERT TO bcs_app_backend WITH CHECK(action<>'csv.contacts.import' OR (bcs.session_allows(company_id,portal_id,'recipients.import') AND actor_principal_id IN (SELECT principal_id FROM bcs.application_sessions WHERE token_hash=current_setting('bcs.session_hash',true) AND company_id=audit_events.company_id AND portal_id=audit_events.portal_id AND revoked_at IS NULL AND expires_at>now())));
INSERT INTO bcs.schema_migrations(version,description) VALUES(26,'Permission-scoped session CSV imports and immutable chunk receipts');
COMMIT;
