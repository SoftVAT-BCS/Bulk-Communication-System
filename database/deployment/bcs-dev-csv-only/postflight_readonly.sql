-- Run after approved migration; run again after the ONE-contact browser test.
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SELECT version,description FROM bcs.schema_migrations ORDER BY version;
SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='bcs' AND table_name='contact_import_batches' AND column_name IN ('csv_owner','csv_receipt');
SELECT tablename,policyname,permissive,cmd FROM pg_policies WHERE schemaname='bcs' AND policyname LIKE 'csv_%' ORDER BY tablename,policyname;
SELECT count(*) AS preserved_recipients, md5(string_agg(md5(to_jsonb(r)::text),',' ORDER BY id)) AS preserved_fingerprint FROM bcs.recipients r WHERE company_id='3d8dbe50-fa3f-4986-9501-33ab989f77e2' AND portal_id='1dc3ad5d-35b4-4b01-aaaf-cc824fe7f52d' AND target_id<>'BCS-CSV-ACCEPT-20261019-ONE';
-- Before test: zero rows below. After test: exactly one scoped Inactive recipient.
SELECT company_id,portal_id,target_id,status,dob FROM bcs.recipients WHERE target_id='BCS-CSV-ACCEPT-20261019-ONE';
-- Expected receipt: total=1, inserted=1, updated=0, rejected=0; same scope/owner as audit.
SELECT b.id,b.company_id,b.portal_id,b.csv_owner,b.reported_rows,b.accepted_rows,b.rejected_rows,b.csv_receipt->>'inserted' AS inserted,b.csv_receipt->>'updated' AS updated,b.csv_receipt->>'skipped' AS skipped,a.actor_principal_id=b.csv_owner AS matching_actor,a.company_id=b.company_id AND a.portal_id=b.portal_id AS matching_audit_scope,a.action,a.safe_metadata FROM bcs.contact_import_batches b LEFT JOIN bcs.audit_events a ON a.entity_reference=b.id::text AND a.action='csv.contacts.import' WHERE b.csv_receipt->'targets' @> '["b427a75a71ba91d0511488421cbfb29e6536b81920306892c1889aef62587577"]'::jsonb;
ROLLBACK;
