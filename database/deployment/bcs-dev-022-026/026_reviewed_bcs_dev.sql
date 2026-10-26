-- PROPOSED bcs-dev deployment variant 026; NOT EXECUTED.
-- Run only through the reviewed wrapper. Original isolated migration is untouched.
-- Wrapper owns one atomic transaction across all variants; no standalone COMMIT.
DO $deployment$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres'
 OR current_setting('bcs.deployment_approval',true) IS DISTINCT FROM 'BCS_DEV_022_026_OWNER_APPROVED'
 OR COALESCE(current_setting('bcs.verified_backup_sha256',true),'') !~ '^[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=25)
 OR EXISTS(SELECT 1 FROM bcs.schema_migrations WHERE version=26)
 THEN RAISE EXCEPTION 'Reviewed deployment context/order required for 026'; END IF;
END $deployment$;
ALTER TABLE bcs.contact_import_batches ADD COLUMN csv_owner uuid,
 ADD COLUMN csv_receipt jsonb,
 ADD CONSTRAINT csv_owner_scope FOREIGN KEY(company_id,csv_owner) REFERENCES bcs.principals(company_id,id),
 ADD CONSTRAINT csv_receipt_shape CHECK ((csv_owner IS NULL AND csv_receipt IS NULL) OR (csv_owner IS NOT NULL AND jsonb_typeof(csv_receipt)='object'));
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
INSERT INTO bcs.schema_migrations(version,description) VALUES(26,'Permission-scoped session CSV imports and immutable chunk receipts');
