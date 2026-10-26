# BCS Supabase integration and enterprise CSV import

19 October 2026. **REVIEW REQUIRED — local implementation tested; live import, deployment and PostgreSQL worker acceptance BLOCKED.**

Workspace `E:\Bulk-Communicatio-System`; main; HEAD `2c073ba7b3c11965703e92f52a21cd24b105065e`. The dirty Windows working tree, not HEAD alone, was the starting point. All pre-existing source paths remain. No installation, database mutation, migration execution, auth login/session creation, account change, AWS/SES request, email, staging, commit or push occurred. Existing authentication was preserved; only the common error response now identifies missing schema objects explicitly.

## A–B. Existing schema and actual read-only connection evidence

Read root AGENTS, current status/master, requested implementation/readiness/stabilization reports, ADRs and routed database/security/UI/component/testing requirements. Older foundation statements that no application/tests exist are historical; current source/scripts take precedence. Reviewed original migrations and existing API/worker/contract/UI implementation rather than rebuilding them.

`database/TableDesign.json` is actually a CSV export containing JSON cells, not a standalone JSON object. Its 10 sections were parsed safely. `database.zip` has 38 entries; it was inventoried without extracting over source. Both remain byte-identical.

The existing `.local/bcs-connect.cjs` loader verifies bcs-dev, ap-south-1, project reference, database postgres and verified TLS. Fresh administrative catalog queries ran in **BEGIN READ ONLY**, followed by ROLLBACK. No recipient values were collected into reports. One initial catalog probe failed with 42703 because the permission column is permission_code, not code; the corrected metadata-only queries passed.

| Catalog measure | Owner export | Fresh database |
|---|---:|---:|
| Tables | 60 | 60 |
| Column definitions | 582 | 582 |
| Constraints | 445 | 445 |
| Indexes | 147 | 147 |
| Policies | 110 | 110 |
| User triggers | 10 | 10 |
| Ledger versions | 001–021 | 001–021, including 010 |

All 60 tables retain enabled and FORCE RLS. Both existing bcs_recipient_reader and bcs_app_backend connected using verified TLS, have no superuser/BYPASSRLS/CREATE/TEMP capabilities, and returned zero visible recipients when no session/scope context was supplied. That proves this unscoped probe denied visibility; it does not prove every authenticated tenant policy. Anonymous and authenticated browser roles have neither bcs schema usage nor recipient SELECT privileges. The Supabase dashboard's Data API schema setting was not independently queried; effective database grants were inspected.

No configured disposable PostgreSQL runtime was available: psql, pg_dump, pg_restore, Docker and Podman were absent on PATH. No isolated runner was pointed at bcs-dev. Existing write-bearing live tests remained disabled. No current authenticated browser session was used; sign-in would create a database session and was outside read-only acceptance.

The ledger stores version/description/time, **not source checksums**. Version 010 and its expected description are present, but exact applied-byte provenance requires separate owner evidence. Fresh deployment fingerprint: `ea56122b321e00e5d7924cf7ebaa3a0de19795697f838fe58dfc53cf2936d6b3`. Detailed metadata is retained only in the ignored backup evidence folder.

## C–D. CSV workflow and uniqueness

Communication → Recipient Selection now offers Download Sample CSV and Import CSV beside the preserved Export CSV. The sample is UTF-8 BOM, fictional .invalid data, with no tenant identifiers. Actual browser download was 428 bytes and matches `examples/import/contacts.sample.csv` exactly.

The existing dialog/buttons/tokens and grid scrolling are reused. Picker/drop, strict UTF-8 decoding, BOM, quoted commas/escaped quotes/CRLF/LF, header allowlist/duplicate rejection, previews, confirmation, progress, bounded chunk cancellation, safe row-error download, receipt totals and latest-50 batch history are implemented. The browser never stores authoritative import data in localStorage. Synthetic mode offers preview only, with no fake persistence.

Limits: 2,000,000-byte CSV; 5,000 rows; 500 characters/cell; 25 rows/chunk; 150,000 streamed request bytes. Extremely wide chunks exceeding the payload bound are rejected and must be corrected; limits are enforced server-side. Missing/invalid required fields, malformed dates, email, E.164 phones, unsupported lifecycle status and unknown/ambiguous active taxonomy are rejected. Per-row errors contain row numbers/codes rather than personal data. Exported cells are formula-escaped.

| CSV column | Actual destination |
|---|---|
| Contact ID | recipients.target_id, unchanged string identity |
| Name / Email | name / email; email normalized lowercase; database generated email_normalized retained |
| Group | recipient_group plus existing audience_groups membership |
| Subgroup | existing audience_subgroups + recipient_group_memberships; no new subgroup column |
| Category | recipients.category, required descriptive field, not a substitute for subgroup |
| Grade / Date of Birth / Gender | grade / dob (strict ISO date) / gender |
| Mobile Number / WhatsApp Number | mobile_no / whatsapp_no (optional E.164) |
| Address Line 1 / Address Line 2 / City | address_1 / address_2 / city |
| PIN Code | pin, string preserving leading zeros |
| State Name / District Name | state_name / district_name; existing st_id/dt_id are untouched |
| Status | status, constrained lifecycle handling below |

Contact ID, Name, Email, Group, Subgroup and Category are required. Optional headers may be omitted; default status is Inactive. Group/Subgroup must uniquely resolve to existing active names in the authenticated portal. Sample taxonomy is illustrative and must be replaced. No implicit taxonomy creation or cross-portal lookup is performed.

The server rejects injected tenant keys and derives company/portal/principal from the existing session. `UNIQUE(company_id,portal_id,target_id)` remains authoritative. Normalized email remains nonunique; collisions across different IDs in the same portal are rejected for owner resolution, never merged. Different companies/portals can use the same source ID.

Modes: INSERT_NEW_ONLY rejects existing IDs; SKIP_EXISTING records skips; UPDATE_EXISTING_BY_CONTACT_ID changes the allowed profile fields only. Optional blanks clear optional fields in explicit update mode. Existing Inactive/Bounced/Unsubscribed states cannot reactivate. New Active requests import Inactive; an existing Active record whose email changes becomes Inactive. No consent evidence, preferences, suppression, audit history, state/district IDs or server identity is overwritten.

Imports use existing transaction/session authorization and share the same portal advisory-lock key with the existing contact API. Shared identity validation is reused. Each chunk commits its recipients, memberships, batch/errors and audit together. The unique existing external_batch_key, request SHA-256 and preceding committed batch ID enforce immutable replay and sequential continuation. File hash + mode + principal + portal determines stable replay across browser reloads. Duplicate IDs/emails across chunks are tracked by hashed identities in the owner-scoped receipt. Concurrent imports serialize per portal; actual PostgreSQL concurrency execution remains unverified.

A chunk is atomic, **the entire file is not**. Cancellation stops before the next chunk; it cannot undo an in-flight or committed chunk. Network retry recovers the same receipt, never assumes success. Recipient refresh occurs only after a successful API response, after the transaction helper commits. Partial rejected rows and committed counts remain visible. History is bounded to the latest 50 chunks, not an unbounded import explorer. Existing API-client idempotency records remain untouched: the nonnullable api_client_id FK is not falsely populated with a principal ID. CSV reuses existing import batches for session idempotency.

## E–F. Permission/RLS and proposed migration package

Existing permission recipients.import was confirmed in the live catalogue. UI checks are advisory; the API requires that permission and the existing active session/portal/role and CSRF/origin checks. No export/select permission grants write access. The actual unauthenticated GET returned HTTP 401 LOGIN_REQUIRED. Missing CSV columns return CSV_IMPORT_MIGRATION_NOT_APPLIED. Other missing schema objects now return DATABASE_SCHEMA_NOT_READY rather than generic failure or synthetic records.

Prepared, **not applied**: `database/proposals/026_session_csv_import_PENDING_APPROVAL.sql`. It adds only csv_owner/csv_receipt to existing batches, narrow optional recipient column grants, owner-scoped receipts/errors, taxonomy membership and audit policies. No business tables, email uniqueness changes, consent rights or automatic role assignment. Existing contact API and api_idempotency_records behavior remain.

Separate proposed deployment variants and integrity manifest are in [database/deployment/bcs-dev-022-026](../../database/deployment/bcs-dev-022-026/REVIEW.md). Original migrations 022–025 are unchanged; no isolated guard was edited or bypassed. The controlled wrapper validates all source hashes, fresh target/role/schema/ledger, 010 provenance evidence, backup/restore/isolated-acceptance files and explicit owner authorization before one atomic transaction. Lock/statement limits and postflight checks are included. Its apply path has **not** been executed or PostgreSQL-tested.

Safety deltas: the deployment worker is NOLOGIN with no scope/password; embedding uses deny-all RLS because original 024's broad backend embed policy requires separate security acceptance. 025 retains independent review/quota triggers. A fresh read-only query found **one active/trial company lacking a current resource plan**; deployment preflight refuses that condition. No plan, operator, role membership or worker credential was provisioned.

## G–K. Verification, feature status and limits

| Feature | Status and evidence |
|---|---|
| Catalog reconciliation / TLS / anonymous grants | TESTED live read-only; exact baseline counts above |
| Login Fix 09 / activation / recovery / users / rights | PRESERVED, regression TESTED; current authenticated browser acceptance UNVERIFIED |
| CSV parser/template/validation | IMPLEMENTED / TESTED offline and actual browser sample |
| CSV UI and three duplicate modes | IMPLEMENTED; preview/browser and mocked API TESTED |
| Authenticated CSV persistence / RLS / idempotency races | Source IMPLEMENTED; actual database execution BLOCKED by unapplied 026 and acceptance gates |
| Existing recipient search/export/selection/navigation/editor | PRESERVED; full regression TESTED; synthetic browser smoke |
| Campaign review / snapshot / scheduling / simulation reports | Existing implementation preserved; offline regression TESTED; migration-dependent DB acceptance BLOCKED |
| PostgreSQL durable simulation worker | Existing implementation preserved; engine tests pass; actual claims/concurrency/fencing/recovery BLOCKED |
| Tenant subscriptions/resource quota deployment | PARTIAL; source exists, missing plan and isolated validation block activation |
| Embedding | PARTIAL; source preserved, proposed live deployment deliberately DENIED pending scoped-security acceptance |
| SES | DISABLED, existing fail-closed tests pass; no network send or provider activation |
| Migration wrapper / postflight / install check / rollback | Prepared source, syntax/integrity/dry-run checked; apply/restore UNVERIFIED |
| Production SaaS readiness | BLOCKED; no end-to-end production certification |

Final commands ran independently, without overlap between test and build:

| Command | Exit | Measured result |
|---|---:|---|
| npm.cmd run typecheck | 0 | TypeScript passed |
| npm.cmd run lint | 0 after correction | 177 files, no diagnostics |
| npm.cmd test | 0 | **341 passed, 16 skipped, 357 total**; 36 files passed / 2 skipped |
| npm.cmd run build | 0 | Successful optimized build, TypeScript and 34 routes/pages generated |
| git diff --check | 0 | Existing CRLF conversion notices only; no whitespace errors |
| Deployment dry-run / script syntax | 0 | Source hashes verified; no writes |

All 295 prior passing tests remain passing; 46 tests were added. Coverage includes CSV syntax/limits/errors, scopes, permissions/injection, collision policies, status preservation, taxonomy, replay, continuation ordering, shared serialization and UI denial. API tests use mocked queries: they do not prove SQL, transaction, quota-trigger or RLS execution. The 16 skipped tests remain 11 recipient-live.integration and 5 supabase-session-live tests; they were not relabeled passing or enabled against live data.

Intermediate issues were corrected: initial UI tests used unavailable DOM matchers; initial lint caught dependency/type/key/regex diagnostics; final lint caught preview region semantics. No timeout increase, broad automatic fixer or weakened safety assertion. The browser caught mobile dialog overflow; the preview now scrolls inside the existing grid region. At 390px viewport, document width was 375px and dialog scroll/client widths both 342px; at 768px, document 753px and dialog widths both 558px. Desktop/tablet/mobile screenshots are saved. File-picker preview showed one fictional row and zero errors; Escape dismissed the dialog. Browser checks were synthetic, not an authenticated import or owner visual acceptance. Large viewport screenshots and local DOM metrics are not pixel-perfect certification of all screens/themes.

Existing worker source supports batch sizes 1/5/10/25/50, preset intervals 5/10/30/60/120/300/600 and bounded custom intervals, independent personalization, leases/fencing, retry/backoff, pacing, quota reservations and truthful simulation receipts. No new live worker configuration was enabled. The isolated adapter still refuses bcs-dev. Existing 1,000-job/21,000-reservation bounds and pending operational scaling/monitoring remain; this task does not claim they were removed.

## L–M. Backup, rollback and exact Windows CMD commands

Verified source backup: `E:\Bulk-Communicatio-System\.local\supabase-integration-20261019-153455` — **287 tracked/nonignored untracked files**, byte-copied and SHA-256 verified before edits. Ignored credentials/build/dependency folders are not source exports. baseline-manifest.json, backups/, before/final Git status, changed-manifest.json, preservation-results.json, read-only metadata, logs and screenshots are retained there. The source SHA-256 manifest excludes itself to avoid recursive hashing. No database backup or restore proof was fabricated.

All 12 IPX and three archived Smart controls match saved SHA-256/size manifests. Ninety preservation checks passed, including existing migrations, historical implementation reports, authentication/user source, worker source, database.zip/TableDesign and the original CSV. All 287 intake source paths still exist. The Step1G helper remains unchanged/untracked. next-env.d.ts retained exact intake bytes after build. No original CSV was changed.

Preview (synthetic, no import persistence):

```cmd
cd /d E:\Bulk-Communicatio-System
call scripts\BCS_Integration_Preview.cmd
```

URL: `http://127.0.0.1:3107/communication`. Stop only that foreground preview with Ctrl+C; rerun the same command to restart. Do not terminate unrelated Node processes.

Source/install verification (does not install packages or SQL):

```cmd
cd /d E:\Bulk-Communicatio-System
call scripts\BCS_Integration_Install_Check.cmd
call scripts\BCS_Integration_Verify.cmd
node.exe scripts\bcs-reviewed-deployment.cjs --dry-run
node.exe scripts\bcs-integration-preflight.cjs
```

The install-check requires the delivered source hashes, Node major 24 and the existing dependency tree. A missing dependency fails closed; no silent installer or migration is hidden in it. No dependency versions changed in this task.

Existing isolated worker startup, **only after separately approved disposable environment and fixtures**:

```cmd
cd /d E:\Bulk-Communicatio-System
call scripts\BCS_Isolated_Simulation_Worker.cmd
```

Use the existing script's exact isolated environment/role/marker requirements. Stop its foreground process with Ctrl+C; preserve leases and restart using that same guarded script. Do not replace its URL with bcs-dev. No live worker startup command is supplied because live activation is not accepted.

Guarded source rollback, dry run first:

```cmd
cd /d E:\Bulk-Communicatio-System
powershell.exe -NoProfile -File E:\Bulk-Communicatio-System\scripts\BCS_Integration_Rollback.ps1
rem After reviewing the dry run and stopping task-owned processes only:
powershell.exe -NoProfile -File E:\Bulk-Communicatio-System\scripts\BCS_Integration_Rollback.ps1 -Apply
```

Rollback checks every delivered and backup hash, refuses later edits/unsafe paths, safety-copies current versions, restores only changed pre-existing bytes and quarantines task-created files without deletion. It does not touch Git or databases. Restore/apply was not executed. The existing pre-task work is recoverable from the intake backup, not from a destructive Git reset.

Authenticated acceptance procedure after separately authorized isolated provisioning: sign in with synthetic scoped users; exercise preview/three import modes/retry and cancellation; verify committed row/membership/receipt/audit counts and protected suppression; deny foreign tenant/portal, missing permission, suspended/expired/revoked sessions and replay; test competing import clients and workers; then compare all five pages plus Administration at desktop/tablet/mobile and keyboard. Do not run these mutations on bcs-dev as a substitute for isolation.

## N–P. Approval gates and remaining blockers

Database-write authorization is **not supplied**. Missing gates: independent backup/restore proof; migration-010 applied-source provenance; separately authorized disposable acceptance with real grants/RLS/transactions; current resource plans; owner review of proposed variants/026 and scoped embedding; authenticated browser import/worker acceptance. Hosted security, scalable worker operations, connector source-account acceptance and production deployment remain outside proven readiness. Unapplied schema requests fail explicitly; no synthetic data is substituted for database failure.

Exactly one recommended next activity: **owner review and authorization of an isolated PostgreSQL acceptance environment for this prepared package**, including restoration and RLS/concurrency checks before considering any bcs-dev migration approval.

Official security/backup references checked during review: [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) and [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). FORCE RLS alone does not constrain a privileged definer owner; actual restricted-role acceptance is still required.

## Exact task-relative changed files

34 task-relative files: 7 modified, 27 new. All other listed Git changes predate this task.

| Action | Workspace-relative path |
|---|---|
| Create | `apps/web/app/api/bcs/app/contact-import/route.ts` |
| Modify | `apps/web/src/client-recipients.ts` |
| Modify | `apps/web/src/communication.tsx` |
| Create | `apps/web/src/contact-import.tsx` |
| Modify | `apps/web/src/server/app-service.ts` |
| Modify | `apps/web/src/server/contact-validation.ts` |
| Modify | `apps/web/src/server/contacts-api.ts` |
| Create | `apps/web/src/server/csv-import.ts` |
| Create | `apps/web/src/server/import-shared.ts` |
| Create | `database/deployment/bcs-dev-022-026/022_reviewed_bcs_dev.sql` |
| Create | `database/deployment/bcs-dev-022-026/023_reviewed_bcs_dev.sql` |
| Create | `database/deployment/bcs-dev-022-026/024_reviewed_bcs_dev.sql` |
| Create | `database/deployment/bcs-dev-022-026/025_reviewed_bcs_dev.sql` |
| Create | `database/deployment/bcs-dev-022-026/026_reviewed_bcs_dev.sql` |
| Create | `database/deployment/bcs-dev-022-026/REVIEW.md` |
| Create | `database/deployment/bcs-dev-022-026/manifest.json` |
| Create | `database/deployment/bcs-dev-022-026/postflight-read-only.sql` |
| Create | `database/proposals/026_session_csv_import_PENDING_APPROVAL.sql` |
| Modify | `docs/adr/DECISION-LOG.md` |
| Modify | `docs/handover/WORK-STATUS.md` |
| Create | `docs/implementation/BCS-INTEGRATION-SOURCE-SHA256.json` |
| Create | `docs/implementation/BCS-SUPABASE-END-TO-END-INTEGRATION.md` |
| Create | `examples/import/contacts.sample.csv` |
| Create | `packages/contracts/src/contact-csv.ts` |
| Create | `scripts/BCS_Integration_Install_Check.cmd` |
| Create | `scripts/BCS_Integration_Preview.cmd` |
| Create | `scripts/BCS_Integration_Rollback.ps1` |
| Create | `scripts/BCS_Integration_Verify.cmd` |
| Create | `scripts/bcs-integration-preflight.cjs` |
| Create | `scripts/bcs-reviewed-deployment.cjs` |
| Create | `scripts/bcs-source-integrity.cjs` |
| Create | `tests/contact-csv.test.ts` |
| Create | `tests/contact-import-ui.test.tsx` |
| Create | `tests/csv-import-api.test.ts` |

## Final Git status

Branch main; HEAD unchanged at 2c073ba7b3c11965703e92f52a21cd24b105065e; index empty. Full status includes preserved pre-existing work:

```text
 M apps/web/.env.example
 M apps/web/app/api/bcs/app/session/route.ts
 M apps/web/app/layout.tsx
 M apps/web/next.config.ts
 M apps/web/package.json
 M apps/web/src/client-recipients.ts
 M apps/web/src/communication.tsx
 M apps/web/src/configuration.tsx
 M apps/web/src/database-email-store.ts
 M apps/web/src/email-composer.tsx
 M apps/web/src/email-workspace.tsx
 M apps/web/src/recipient-csv.ts
 M apps/web/src/server/activity.ts
 M apps/web/src/server/app-service.ts
 M apps/web/src/server/documents.ts
 M apps/web/src/server/schedule-validation.ts
 M apps/web/src/server/scheduling.ts
 M apps/web/src/session-gate.tsx
 M apps/web/src/workspace.tsx
 M biome.json
 M docs/adr/DECISION-LOG.md
 M docs/architecture/ARCHITECTURE.md
 M docs/handover/WORK-STATUS.md
 M docs/implementation/MASTER-DYNAMIC-IMPLEMENTATION-STATUS.md
 M package-lock.json
 M package.json
 M packages/ui/src/grid.tsx
 M packages/ui/src/icons.tsx
 M packages/ui/src/primitives.tsx
 M packages/ui/src/react.css
 M tests/authenticated-documents.test.ts
 M tests/email-editor.test.tsx
 M tests/fidelity.test.tsx
 M tests/recipient-database-ui.test.tsx
 M tests/recipient-server.test.ts
 M tests/setup.ts
 M tsconfig.json
?? Activities.txt
?? apps/web/app/activate/page.tsx
?? apps/web/app/admin/connections/page.tsx
?? apps/web/app/admin/rights/page.tsx
?? apps/web/app/admin/users/page.tsx
?? apps/web/app/api/bcs/app/activation/route.ts
?? apps/web/app/api/bcs/app/auth-public/route.ts
?? apps/web/app/api/bcs/app/campaign-review/route.ts
?? apps/web/app/api/bcs/app/campaigns/route.ts
?? apps/web/app/api/bcs/app/configuration/route.ts
?? apps/web/app/api/bcs/app/connectors/route.ts
?? apps/web/app/api/bcs/app/contact-import/route.ts
?? apps/web/app/api/bcs/app/embed-session/route.ts
?? apps/web/app/api/bcs/app/embed/route.ts
?? apps/web/app/api/bcs/app/selections/route.ts
?? apps/web/app/api/bcs/app/simulation-policy/route.ts
?? apps/web/app/api/bcs/app/simulation/route.ts
?? apps/web/app/api/bcs/app/tenants/route.ts
?? apps/web/app/api/bcs/app/users/route.ts
?? apps/web/app/api/bcs/v1/contacts/route.ts
?? apps/web/app/embed/page.tsx
?? apps/web/app/login/page.tsx
?? apps/web/src/bcs-activate-account.tsx
?? apps/web/src/bcs-admin-login.tsx
?? apps/web/src/bcs-admin-pages.css
?? apps/web/src/bcs-column-mapping.tsx
?? apps/web/src/bcs-configuration-panels.tsx
?? apps/web/src/bcs-portal-database.tsx
?? apps/web/src/bcs-ses-settings.tsx
?? apps/web/src/bcs-user-creation.tsx
?? apps/web/src/bcs-user-rights.tsx
?? apps/web/src/campaign-workspace.tsx
?? apps/web/src/contact-import.tsx
?? apps/web/src/database-configuration.tsx
?? apps/web/src/embedded-portal.tsx
?? apps/web/src/role-home.ts
?? apps/web/src/saas-console.tsx
?? apps/web/src/server/campaign-review.ts
?? apps/web/src/server/campaign-validation.ts
?? apps/web/src/server/campaigns.ts
?? apps/web/src/server/configuration-service.ts
?? apps/web/src/server/configuration-validation.ts
?? apps/web/src/server/connector-adapters.ts
?? apps/web/src/server/connector-service.ts
?? apps/web/src/server/contact-validation.ts
?? apps/web/src/server/contacts-api.ts
?? apps/web/src/server/csv-import.ts
?? apps/web/src/server/embed-contract.ts
?? apps/web/src/server/embedding.ts
?? apps/web/src/server/import-shared.ts
?? apps/web/src/server/invitation-activation.ts
?? apps/web/src/server/personalization.ts
?? apps/web/src/server/simulation-operations.ts
?? apps/web/src/server/simulation-policy.ts
?? apps/web/src/server/supabase-auth.ts
?? apps/web/src/server/tenant-administration.ts
?? apps/web/src/server/tenant-context.ts
?? apps/web/src/server/user-management.ts
?? apps/web/src/server/user-onboarding.ts
?? apps/web/src/simulation-policy-panel.tsx
?? apps/worker/src/fixture-store.ts
?? apps/worker/src/fixture.ts
?? apps/worker/src/main.ts
?? apps/worker/src/postgres-main.ts
?? apps/worker/src/postgres-store.ts
?? apps/worker/src/simulation-engine.ts
?? database.zip
?? database/TableDesign.json
?? database/deployment/bcs-dev-022-026/022_reviewed_bcs_dev.sql
?? database/deployment/bcs-dev-022-026/023_reviewed_bcs_dev.sql
?? database/deployment/bcs-dev-022-026/024_reviewed_bcs_dev.sql
?? database/deployment/bcs-dev-022-026/025_reviewed_bcs_dev.sql
?? database/deployment/bcs-dev-022-026/026_reviewed_bcs_dev.sql
?? database/deployment/bcs-dev-022-026/REVIEW.md
?? database/deployment/bcs-dev-022-026/manifest.json
?? database/deployment/bcs-dev-022-026/postflight-read-only.sql
?? database/fixtures/022_simulation_policy_isolated.sql
?? database/migrations/016_campaign_workspace.sql
?? database/migrations/017_configuration_workspace.sql
?? database/migrations/018_contact_api.sql
?? database/migrations/019_contact_taxonomy.sql
?? database/migrations/020_user_onboarding_scoped.sql
?? database/migrations/021_company_user_management.sql
?? database/migrations/022_simulation_policy_and_receipts.sql
?? database/migrations/023_isolated_simulation_worker.sql
?? database/migrations/024_tenant_embed_and_workflows.sql
?? database/migrations/025_quotas_and_independent_review.sql
?? database/proposals/026_session_csv_import_PENDING_APPROVAL.sql
?? docs/architecture/BCS-SAAS-IMPLEMENTATION-READINESS.md
?? docs/email/BCS_SUPABASE_RECOVERY_TEMPLATE.html
?? docs/implementation/BCS-CONSOLIDATED-SAAS-COMPLETION.md
?? docs/implementation/BCS-INTEGRATION-SOURCE-SHA256.json
?? docs/implementation/BCS-SAAS-INCREMENT-1-IMPLEMENTATION.md
?? docs/implementation/BCS-SUPABASE-END-TO-END-INTEGRATION.md
?? docs/implementation/BCS_ADMIN_MENU_RIGHTS_UI_PATCH.md
?? docs/implementation/BCS_AUTH_INVITATION_ACTIVATION.md
?? docs/implementation/BCS_UI_CLEANUP_INVITATION_READINESS.md
?? docs/implementation/BCS_USER_MANAGEMENT_ALL_IN_ONE.md
?? docs/implementation/REGRESSION-STABILIZATION-2026-10-19.md
?? docs/implementation/SAAS-CONTACT-API.md
?? docs/implementation/SUPABASE-AUTH-LOGIN-CORRECTION.md
?? examples/connectors/registry.example.json
?? examples/connectors/synthetic-views.sql.txt
?? examples/embedding/host.mjs
?? examples/embedding/issuers.example.json
?? examples/import/contacts.sample.csv
?? packages/contracts/src/contact-csv.ts
?? packages/contracts/src/dispatch-policy.ts
?? packages/contracts/src/provider-contract.ts
?? scripts/BCS_Consolidated_Rollback.ps1
?? scripts/BCS_Consolidated_Validate.cmd
?? scripts/BCS_Integration_Install_Check.cmd
?? scripts/BCS_Integration_Preview.cmd
?? scripts/BCS_Integration_Rollback.ps1
?? scripts/BCS_Integration_Verify.cmd
?? scripts/BCS_Isolated_Simulation_Worker.cmd
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? scripts/accept-isolated-saas.mjs
?? scripts/accept-source-connector.mjs
?? scripts/bcs-integration-preflight.cjs
?? scripts/bcs-reviewed-deployment.cjs
?? scripts/bcs-source-integrity.cjs
?? scripts/validate_recipient_csv.py
?? tests/activation-link-strictmode.test.tsx
?? tests/activation-localhost-origin.test.ts
?? tests/admin-navigation.test.tsx
?? tests/admin-rights-layout.test.tsx
?? tests/admin-ui-cleanup.test.tsx
?? tests/consolidated-api.test.ts
?? tests/consolidated-contracts.test.ts
?? tests/consolidated-ui.test.tsx
?? tests/contact-csv.test.ts
?? tests/contact-import-ui.test.tsx
?? tests/csv-import-api.test.ts
?? tests/dynamic-workflows.test.ts
?? tests/invitation-activation.test.ts
?? tests/login-permission-gate.test.ts
?? tests/personalization.test.ts
?? tests/saas-simulation.test.ts
?? tests/simulation-policy-api.test.ts
?? tests/simulation-policy-ui.test.tsx
?? tests/supabase-auth.test.ts
?? tests/supabase-session-live.test.ts
?? tests/user-management-readiness.test.ts
?? tests/user-management.test.ts
?? tests/user-recovery-activation.test.ts
```
