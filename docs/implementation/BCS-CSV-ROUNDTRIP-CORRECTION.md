# CSV export/import correction — 19 October 2026

## Outcome and evidence boundary

Implemented the authenticated CSV round trip. No database connection, SQL execution, recipient import, Auth operation, email, package installation or new application mode was performed. Existing 001–025 migration files and previously proposed/deployment 026 files remain untouched. Database import still requires owner-approved SQL deployment and subsequent acceptance; this report does not claim live persistence.

The latest message contains no separate CSV attachment path. The available local original is a 240-row, 17-column Windows-1252 tab-delimited demonstration file; the other local export is a 240-row six-column UTF-8 file. Neither is the reported 18-column export. They were inspected only for structure, not modified or included in reports. Tests use the existing 18-column import contract and fabricated recipients, including the reported 15-01-2000 date. No real contact values are included.

## Actual corrections

The authenticated exporter previously emitted only six summary fields. It now requests full details from the existing read repository, exports exactly the shared 18 headers, and validates the output with the same parser/validator used by Import CSV. Invalid source rows fail closed with an explicit export correction message, rather than yielding an unusable download.

DOB is selected with PostgreSQL `to_char(dob,'YYYY-MM-DD')`; the serializer also converts legacy DD-MM-YYYY values to ISO. Category uses `recipients.category`; Status uses `recipients.status`. Subgroup comes from the active scoped membership, not the Category alias used by the display summary. More than one matching membership is rejected by the scalar SQL subquery, rather than arbitrarily choosing a membership and losing data. Missing/invalid taxonomy, duplicate email addresses or invalid source fields require source review, not fabricated values.

CSV spreadsheet guards are now reversible in the shared parser, including +E.164 phone numbers, formula-like values and literal apostrophes. UTF-8 BOM, quoted fields, escaped quotes, CRLF records and string identifiers are retained. Do not resave through a spreadsheet that coerces identifiers or dates before testing the round trip.

Import preview additionally displays Category, Date of Birth and Status using the existing dialog/table styling. Existing statuses are retained on updates; changing the email of an Active contact still deactivates it safely. New Active rows remain Inactive pending separate consent review. Import never updates preferences, consent evidence or suppression records. Existing tenant/portal lock, unique target key, chunk receipts and replay rules remain in force.

## Exact 18-column mapping

| CSV header | Existing source/target |
|---|---|
| Contact ID | recipients.target_id (string, never internal UUID) |
| Name | name |
| Email | email |
| Group | recipient_group; validated active audience group |
| Subgroup | active recipient_group_memberships / audience_subgroups |
| Category | category |
| Grade | grade |
| Date of Birth | dob, YYYY-MM-DD |
| Gender | gender |
| Mobile Number | mobile_no, E.164 |
| WhatsApp Number | whatsapp_no, E.164 |
| Address Line 1 | address_1 |
| Address Line 2 | address_2 |
| City | city |
| PIN Code | pin (string) |
| State Name | state_name |
| District Name | district_name |
| Status | status |

Company and portal are taken exclusively from the authenticated session, never CSV columns. Existing UNIQUE(company_id, portal_id, target_id) remains the identity constraint. Insert New rejects existing IDs; Skip Existing leaves them untouched; Update Existing updates the same scoped identity and preserves its current status except safe deactivation on email change. Optional blank profile fields still clear those fields during updates, as disclosed by the existing UI. Identical uploads replay immutable receipts; they do not reapply edits.

## Minimum independent database proposal — NOT EXECUTED

`database/proposals/026_bcs_dev_csv_only_PENDING_APPROVAL.sql`

The existing import API only needs receipt ownership/JSON columns and permission-scoped session RLS on existing tables; it does not use the worker, embedding or quota schema introduced by 022–025. The new file is an alternative 026 based on 001–021, not an instruction to apply the bundled 022–026 package. It adds two batch columns and constraints, grants only missing recipient profile-column writes to the existing backend role, adds session/portal/permission-scoped policies to the existing recipient/taxonomy/import/audit tables, and records version 26. It creates no business tables, roles, accounts, permissions, consent or recipient rows.

Deployment fails without explicit owner approval and verified backup fingerprint, the expected database/owner, all 001–021 versions, no later versions, forced RLS, restricted runtime role, existing recipients.import permission and the existing scoped unique key. Existing columns/policies cause failure rather than silent incompatible reuse. A single transaction and bounded locks prevent a partially applied migration. Source-level checks passed; PostgreSQL execution and policy behavior remain unverified.

Review prerequisites: confirm the exact bcs-dev project/connection privately; inspect current definitions/grants/policies; verify backup and restore rehearsal; review the policy composition and session function; verify no later migration was applied meanwhile. Approval settings are gates, not proof that a backup exists. Do not apply both this alternative and either old 026. Later SaaS deployment must reconcile the already-applied CSV version explicitly; do not run the old atomic 022–026 wrapper after this alternative. No existing migration was edited to conceal that conflict.

RLS complements SQL privileges; permissive policies combine with OR, so review all existing policies before deployment. See [official PostgreSQL RLS documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html). No grants to anon/authenticated/service_role or API schema exposure are introduced.

Rollback: before COMMIT any failure rolls back this proposal. After deployment, stop CSV writes and use a reviewed targeted reversal or verified restore; do not drop existing tables or erase import receipts casually. Source rollback can copy only this task's changed files from `.local/csv-roundtrip-20261019-163807/backup/` after checking for newer edits. Preserve all pre-existing local changes; never reset to HEAD.

## Changed files

Modified:
- apps/web/src/recipient-csv.ts
- apps/web/src/server/recipient-export.ts
- apps/web/src/server/repository.ts
- packages/contracts/src/contact-csv.ts
- apps/web/src/contact-import.tsx
- apps/web/src/communication.tsx
- docs/handover/WORK-STATUS.md

Added:
- tests/csv-roundtrip.test.tsx
- tests/csv-export-api.test.ts
- database/proposals/026_bcs_dev_csv_only_PENDING_APPROVAL.sql
- docs/implementation/BCS-CSV-ROUNDTRIP-CORRECTION.md

## Final authenticated verification

The existing authenticated server remains on port 3000. From Windows CMD:

```cmd
start "" "http://127.0.0.1:3000/communication"
```

Sign in privately with the existing authorized account. Export CSV, choose that unchanged file in Import CSV, inspect all 18 headers and confirm ISO DOB, Category, Status and zero local validation errors. **Stop before Confirm import** for the 240 records. The import SQL is still pending approval. After separately approved deployment, perform a narrowly reviewed import acceptance using approved test records and each duplicate mode; do not automatically load the full file. If the server is stopped, use the existing BCS_Start_Authenticated.cmd launcher first. No synthetic launcher is needed.

## Verification results and remaining acceptance limitation

- npm.cmd run typecheck: exit 0.
- npm.cmd run lint: exit 0.
- npm.cmd run build: exit 0.
- Initial suite after seven new tests: 348 passed, 16 skipped (exit 0).
- Final default-parallel npm.cmd test: two runs each had 350 passed, 16 skipped and one existing tests/ui.test.tsx navigation test exceeding its unchanged 5,000 ms limit (5,194 ms / 5,031 ms). All new CSV tests passed. This timing failure is disclosed, not hidden.
- npm.cmd test -- --maxWorkers=2: exit 0, entire suite passes with bounded concurrency; no timeout, assertion or test configuration changes. See bounded-test.log for exact totals.
- Added tests cover 18-column export, 240 fabricated records across export pages, DOB/category/status, phone and identifier round trip, formula guards, all duplicate modes/status protections, actual React import preview with zero validation errors and no POST, malformed-export rejection and static SQL guards. These are source/mock checks, not live PostgreSQL acceptance.
- All 12 IPX files and all three Smart archives match preserved SHA-256 and sizes. Hash inventory confirms every pre-existing file except the seven authorized edits is unchanged, including migrations 001–025, authentication, original CSV, worker/campaign source, scripts and Step1G helper.
- Final Git: main, HEAD 2c073ba7b3c11965703e92f52a21cd24b105065e, 39 modified tracked files, 153 untracked files, zero staged. This task adds four files and edits seven; all earlier changes remain. Full status and checks are saved under .local/csv-roundtrip-20261019-163807/.

Next activity: owner review of the CSV-only SQL and authenticated export/preview acceptance. Default parallel test timing remains a limitation; bounded-concurrency full-suite verification passed. No claim of live import readiness before SQL approval/deployment and explicit database-backed acceptance.
