# bcs-dev CSV-only 026 — applied 19 October 2026

This is an alternative to the earlier bundled 026. Apply only to the reviewed existing bcs-dev ledger 001–021. Do not run migrations 022–025 or the other 026 as part of this task. Future SaaS deployment must explicitly reconcile ledger 026 and its objects; do not delete or relabel ledger entries to force a bundle through.

## Reviewed changes

Two nullable columns on existing contact_import_batches (csv_owner and csv_receipt), scoped owner FK and receipt-shape constraint; INSERT/UPDATE grants on 11 existing recipient profile columns; 13 permissive CSV policies plus three restrictive boundaries; one ledger entry. No new tables, roles, authentication functions, recipients, consent or suppression changes. Company/portal/target uniqueness and existing API import objects are reused.

Restrictive receipt/error ownership and audit actor checks prevent existing permissive API or other session policies from bypassing the CSV boundaries. Non-CSV API batches retain their existing policies. PostgreSQL combines permissive policies with OR and restrictive policies with AND: [official RLS documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Execution record and retained SQL Editor procedure

The owner explicitly authorized development-only activation and waived the backup/restore exercise. Migration 026 has now committed on the verified existing bcs-dev target. Do not rerun it. The one-contact authenticated test was rejected because the current session portal was softvat_crm while the fixture taxonomy belongs to skillmonk-demo. No recipient was inserted or updated. Further imports stopped on this mismatch. See ../../../docs/implementation/BCS-CSV-REAL-ACTIVATION.md.

The following procedure is retained for review; this database already has 026.

1. Owner approval was given in the activation request. The backup/restore requirement was explicitly waived for this development database; no backup hash was supplied or fabricated.
2. Open the existing **bcs-dev** Supabase project, then **SQL Editor**, **New query**. Confirm the project identity against the existing private connection configuration, database postgres and role postgres. Do not create a project/database or change credentials. See [Supabase database documentation](https://supabase.com/docs/guides/database/overview).
3. Paste and run the entire preflight_readonly.sql. Require ledger exactly 1–21, backend privilege flags false, forced RLS on all 60 tables, active bcs_dev_internal plan/subscription, max_contacts 10000 and max_live_emails 0, 240 preserved recipients, fingerprint 203944bbb5b9d90003d457d13a534c9a, and zero test-identity collisions. Stop on any discrepancy.
4. Open 026_csv_only.sql in a new SQL Editor query. Immediately AFTER its BEGIN; add this transaction-local execution authorization reflecting the explicit owner request:

~~~sql
SELECT set_config('bcs.csv_deployment_approval','BCS_DEV_CSV_ONLY_OWNER_APPROVED',true);
~~~

5. Execute the **entire transaction**, never a highlighted subset. Default file intentionally refuses execution without the execution approval setting. Do not bypass failed guards. On an error, stop; if the connection remains in an aborted transaction, issue ROLLBACK only. Do not retry by dropping objects or removing ledger entries.
6. Run the entire postflight_readonly.sql. Require ledger 1–21 plus 26, two expected columns, 16 csv_* policies including three RESTRICTIVE, and unchanged 240-recipient fingerprint. Before acceptance import there must be no fictional-contact or matching receipt/audit result. Runtime grants and RLS still need authenticated positive/negative acceptance.
7. Using the existing authenticated application at http://127.0.0.1:3000/communication, confirm company softvat-bcs-demo and portal skillmonk-demo. Close the old 241-row preview. Choose ONLY one-contact-acceptance.csv from this folder; require exactly one valid row, Contact ID BCS-CSV-ACCEPT-20261019-ONE, Inactive, DOB 2000-01-15, and INSERT NEW ONLY. Confirm Import once only after owner approval covers this test. Do not use SQL INSERT or privileged credentials as a substitute for the authenticated API.
8. Require one inserted, zero updated/rejected, and a returned batch receipt. Run postflight_readonly.sql again: exactly one contact with the expected company/portal, one matching receipt/audit with matching actor/scope and inserted=1, updated=0. The original 240 rows must retain the baseline fingerprint. Total scoped recipients should now be 241, including this one new fictional contact. This is NOT the uploaded 241-row CSV.
9. Verify unauthorized session/other-portal/other-owner receipt requests are denied without writing data. Reopen history as the authorized owner. Replay the same completed chunk only if separately included in acceptance authorization; replay should return the existing receipt without changing counts.

Owner CMD for reviewing the final SQL (does not execute it):

~~~cmd
cd /d E:\Bulk-Communicatio-System
notepad "E:\Bulk-Communicatio-System\database\deployment\bcs-dev-csv-only\026_csv_only.sql"
~~~

## Limitations and recovery

Migration 026 was executed and committed. The single authenticated import attempt produced a rejected receipt and audit, with no contact changes. Existing application code already checks readiness and uses recipients.import with a scoped session transaction. This package does not implement subscription quota enforcement; the verified plan assignment and migration guard are prerequisites, not per-import quota accounting. Successful contact insertion and broader positive/negative RLS acceptance remain pending. The rejected receipt/audit were verified in the actual authenticated portal.

Before COMMIT a failed migration rolls back transactionally. After commit do not automatically drop columns/policies or delete contacts: disable further CSV usage and investigate with an owner-approved forward repair or scoped recovery from the verified backup. A whole-database restore could overwrite unrelated activity and requires separate approval. Preserve the acceptance contact, receipt and audit unless explicit cleanup is authorized. Do not enable SES.
