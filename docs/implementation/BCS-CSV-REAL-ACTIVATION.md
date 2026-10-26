# Real CSV activation — 19 October 2026

## Actual outcome

Migration 026 APPLIED and COMMITTED to existing bcs-dev / bcs. No 022–025 migrations were applied. Authenticated single-contact import attempted once, REJECTED, with 0 inserted, 0 updated, 1 rejected (UNKNOWN_OR_AMBIGUOUS_SUBGROUP). Work stopped on the portal mismatch as instructed; no retry, portal switch, fixture edit or privileged SQL contact insert was attempted.

## Authorization and SQL

The owner explicitly authorized this development-only migration and waived backup/restore. Removed only the backup-hash guard and updated its comments/error message. Retained explicit transaction authorization, verified TLS/target, database/role identity, exact 001–021 ledger, existing-object checks, forced RLS, restricted roles, session-function fingerprint, scoped uniqueness, development-plan guard and original 240-row fingerprint. No backup hash or approval evidence was invented. The transaction-local approval value reflects the owner's actual activation instruction.

Existing app/Auth/admin configuration was compared privately: all point to the same Supabase project and database postgres. The admin loader also verified bcs-dev/ap-south-1 and TLS certificates. Fresh catalog fingerprint matched the earlier review exactly before execution.

Executed database/deployment/bcs-dev-csv-only/026_csv_only.sql in one transaction. Added two receipt columns, two constraints, profile-column write grants and 16 policies (three restrictive); inserted only ledger version 26. Before COMMIT, verified original policies, authentication functions, roles/memberships, tables, indexes, triggers and ledger rows unchanged. Committed postflight verified the two columns and all 16 policies. SQL SHA-256: 3969faa7fd689992e378ed667d6ea9de6df6a17643780c73a0763f0fb828c3fb. Ledger now 001–021 plus 026. No recipient DML in migration.

## Authenticated test and blocker

Used only the existing one-contact-acceptance.csv through the existing localhost:3000 application, INSERT NEW ONLY. Preview showed one valid row, Inactive, ISO DOB 2000-01-15. Clicked Confirm import once.

The server-authenticated portal was **softvat_crm**, company softvat-bcs-demo. The reviewed fixture taxonomy (Data Science & AI / GenAI · Weekend) belongs to **skillmonk-demo**. It was rejected in the current portal. The earlier application display/fixture assumption did not establish the actual server session portal. No security bypass or change to portal identity was made to force success.

Batch receipt: 8bd4cd6e-4f70-40f0-84db-69c65aa66872. Actual receipt and csv.contacts.import audit share the same company/portal and matching actor/owner; inserted=0, updated=0, rejected=1. No row exists for BCS-CSV-ACCEPT-20261019-ONE. This verifies authenticated receipt/audit persistence for a rejected row, NOT successful recipient import.

Original skillmonk-demo recipients remain exactly 240 with fingerprint 203944bbb5b9d90003d457d13a534c9a. The uploaded 241-row CSV was not submitted. No real emails, SES, deployment, credential changes or new database. No application rebuild or new demo.

## Changed files and verification boundary

- database/deployment/bcs-dev-csv-only/026_csv_only.sql — waived backup gate removed; other guards retained.
- database/deployment/bcs-dev-csv-only/README.md — actual execution status and current owner decision.
- docs/handover/WORK-STATUS.md — actual current result.
- docs/implementation/BCS-CSV-REAL-ACTIVATION.md — this report.

Existing app source, fixture, migrations 001–025, Login Fix 09, users/rights definitions and IPX were not edited. Private ignored intake/evidence: .local/csv-real-activation-20261019/. No staging, commit or push. Typecheck/lint/tests/build were not rerun: this task changed SQL/documentation only and explicitly prohibited rebuilding. Prior passing results are historical, not new results.

Next activity: resolve the authenticated portal selection to the intended skillmonk-demo scope through the existing authorized workflow, verify server session scope before submission, then rerun only the approved one-contact fixture. This is pending owner direction because this task required stopping on a database/security mismatch.
