# Universal Notify — consolidated SaaS source implementation

19 October 2026. **REVIEW REQUIRED. Local source implemented and tested; database integration and end-to-end SaaS acceptance remain UNVERIFIED. SIMULATION ONLY.**

Workspace: `E:\Bulk-Communicatio-System`. Branch `main`; HEAD remains `2c073ba7b3c11965703e92f52a21cd24b105065e`. Existing dirty working tree was the baseline. No staging, commit, push, live Supabase connection, SQL execution, customer database access, AWS request or email transmission occurred. No system service was installed. Historical reports and migrations 001–022 were preserved.

## Delivered scope and evidence boundaries

| Workstream | Status | Implemented source and limits |
|---|---|---|
| Tenant administration | IMPLEMENTED / offline TESTED / DB UNVERIFIED | Authenticated membership listing and explicit company/portal switch; trusted issuer/subject mapping; old session revocation; platform-operator-gated provisioning, activation/suspension, plan assignment, company resource counts and audit. Existing portal and company-user/role services reused. No platform operator, plan or identity was provisioned in a real database. |
| Tenant isolation | Offline contracts TESTED / PostgreSQL BLOCKED | Existing session/RLS checks retained; composite tenant keys reused; guarded worker scopes and two-tenant SQL acceptance runner prepared. Unit mocks do not prove PostgreSQL isolation. |
| Subscriptions and quotas | IMPLEMENTED source / DB UNVERIFIED | Atomic company locks for contact/user/portal insertion quotas; explicit bounded active plans; sending reservations/counters through existing tables. Missing plan fails closed. Billing/payment processing is not implemented or enabled. |
| Four connectors | IMPLEMENTED / offline TESTED / connectivity UNVERIFIED | pg, mysql2, mssql and pinned-address HTTPS REST readers; registry allowlists, verified TLS, bounded reads, discovery, mapping preview/validation/approval, sync, safe row errors, checkpoint CAS, idempotent contact import, audit/receipts. Source accounts still require independently verified SELECT-only permissions. |
| Existing contact API | PRESERVED / regression TESTED | Existing scoped bearer credentials, rate limit, idempotency, duplicate email handling, taxonomy synchronization and inactive new-recipient behavior reused. No synthetic fixture substitutes for a failed source connection. |
| Embedding | IMPLEMENTED / offline TESTED / DB UNVERIFIED | Ed25519 issuer/audience/company/portal/origin/redirect binding; assertion ≤60s; code 30s, one use; session 5 minutes; memory-only bearer; restricted reporting; logout; frame-ancestor allowlist; standalone sessions reject embedded tokens. Replay constraint execution remains unverified. |
| Campaign management | Existing workflow PRESERVED; independent review IMPLEMENTED / DB UNVERIFIED | Existing drafts/templates/personalization/snapshots/scheduling extended with independent reviewer API/UI and approved revision recording. Rejection needs a reason; creator cannot self-approve; stale revision rejected. Reviewer does not require compose/export rights. |
| PostgreSQL worker | IMPLEMENTED source / execution BLOCKED | Reuses fixture engine and existing queue; company lock, SKIP LOCKED with complete-accounting check, fenced leases, reservations, pacing/rate/daily/subscription limits, retry/recovery, receipt/attempt/audit writes. Explicit isolated target and restricted role only. No database claims/settlements executed. |
| Queue control/reconciliation | IMPLEMENTED / offline TESTED / DB UNVERIFIED | Pause/cancel revoke leases and close simulated attempts; release held reservations. Resume rejects active leases. Unknown outcomes are quarantined to dead letter with a reason and never resent automatically. |
| SES | DISABLED contracts TESTED / provider integration PENDING | Single-recipient message/sender/attachment contracts, error classification and verified event-to-suppression mapping. Submit always throws `SES_DISABLED_BY_RELEASE`. No SDK, network sender, credential requirement or activation switch. Event signature verification/persistence is not a deployed provider integration. |
| Reporting | IMPLEMENTED source / offline TESTED / DB UNVERIFIED | Scoped simulation counts, queued/processing/failed/excluded/retry metrics, attempts, leases, audit, company counters and authorized formula-safe CSV. Simulated receipts never increment delivered-email counts. Full operational telemetry and long-history pagination remain partial. |
| UI | IMPLEMENTED / component TESTED / partial browser TESTED | Shared Panel/FormField/ActionButton/EmailPreview controls; existing five-page shell intact. Tenant panel in Administration/Configuration; connectors in Configuration; review in Communication; simulation summaries/controls in Dashboard/Reports/Scheduling. New data loads explicitly; server errors shown without fake success. Authenticated populated screens await isolated DB acceptance. |
| Production deployment | BLOCKED / NOT ACCEPTED | Existing development/loopback application guards retained. No hosted security, real connectors, billing, production worker scaling, hosted SSO or live delivery acceptance claimed. |

## Database reconciliation and additive package

Reviewed existing definitions and reused their objects rather than creating a parallel business data model:

- 001: companies, portals, principals, roles, role permissions, principal portal scopes; composite company/portal foreign keys.
- 002/009: recipients and preference/suppression data. Status is not evidence of consent.
- 003: portal_connections, data_mappings, connector_sync_checkpoints and integration_event_receipts.
- 004: templates/revisions, provider accounts, sender identities and disabled sending configuration.
- 005: audience_selections, campaign revisions/snapshots, **outbound_messages**, dispatch_jobs and delivery_attempts. There is no `outgoing_messages` table. Attempt time is `attempted_at`.
- 006: scheduling, audit and export metadata. 007: saas_plans, subscriptions, usage_counters, quota_reservations and API idempotency.
- 008: finalized RLS/privilege foundation. Separate `database/proposals/010_recipient_reader_PENDING_APPROVAL.sql` remains a distinct provenance dependency.
- 011–015: private authenticated application role/session/RBAC, dashboard/scheduling/report/queue policies. 016–019: campaigns, configuration, contact imports and taxonomy. 020–021: scoped onboarding and user management.
- 022: simulation policy and truthful simulation receipts/attempt constraints. It was not executed by this task.

New ordered migration paths (all **Proposed, not executed or deployment-approved**):

1. `E:\Bulk-Communicatio-System\database\migrations\023_isolated_simulation_worker.sql`: dedicated restricted worker, explicit worker/company scopes, simulation timestamp and narrow object/column grants. No seeded worker password or scope.
2. `E:\Bulk-Communicatio-System\database\migrations\024_tenant_embed_and_workflows.sql`: explicit platform-operator registry, guarded definer provisioning/admin functions, resource counts, one-time embed grants, embedded session fields and scoped connector/review/control policies.
3. `E:\Bulk-Communicatio-System\database\migrations\025_quotas_and_independent_review.sql`: independent approval/revision function and atomic insertion quota triggers.

Each requires the exact disposable database name, marker, privileged isolated owner, predecessor ledger entry and absent own version. Existing incompatible objects fail creation rather than being silently reused. No DROP/TRUNCATE or replacement of historical functions/tables. Security-definer functions pin `search_path=pg_catalog`, revoke PUBLIC execution and explicitly gate callers. They require separate PostgreSQL adversarial review, especially the privileged function ownership and FORCE-RLS behavior. No application user becomes a platform operator implicitly. An operator cannot suspend their own current company.

## Connector contract and limitations

Private registry keyed by the existing `endpoint_reference`: `BCS_CONNECTOR_REGISTRY_FILE`. Example: `examples/connectors/registry.example.json` (disabled entries, synthetic identifiers only). Host, database, schema, allowed views and credential **environment references** are operator-controlled; browser requests only identify a registered connection/mapping. Private registry and CA files are runtime files excluded from Next deployment tracing.

Workflow: existing Configuration registers metadata and mapping → new console discovers/previews → validates → approves → synchronizes. Validation/approval also requires company-level portal management. Mapping uses `primary_key_field` as targetId, plus name/email/group/subgroup. Imported source status does **not** grant consent or activate new contacts. Existing contact API remains authoritative for duplicates and per-row errors. A rejected import does not advance the checkpoint; a replay queries its original batch status before advancing. Concurrent checkpoint advancement fails with a conflict instead of overwriting newer progress.

Cursor is a unique, stable, nonempty string key, at most 200 characters. Reads are limited to 100 per request. This is keyset import, **not CDC**: changes behind the current key require an explicit audited **Rescan**, then repeated sync. Unchanged payloads reuse idempotency receipts; changed payloads use a new content hash. Source key uniqueness/collation and SELECT-only grants require real-source review. Source deletes are not propagated automatically.

PostgreSQL read-only session/statement timeouts; MySQL read-only session and bounded operations; SQL Server encrypted connection, certificate validation and read-only intent (not a substitute for database grants). REST requires an approved HTTPS endpoint, verified public IPv4 DNS pinned to its socket, no redirects, no userinfo/query/hash configuration, max 256 KiB/100 rows, 8s timeout. Private/loopback/link-local/CGNAT and IPv6 are rejected. IPv6 support is deliberately pending equivalent range review.

Installed exact library versions after official/registry compatibility checks: mysql2 3.24.6, mssql 12.7.10, @types/mssql 12.3.0. Existing pg 8.23.1 and Node 24.16.0 retained. Installation used `--ignore-scripts --save-exact`; npm reported **0 vulnerabilities**. `npm ls --depth=0` exit 0. Evidence in backup logs. Official references: [mysql2 documentation](https://sidorares.github.io/node-mysql2/docs/documentation), [mysql2 TLS](https://sidorares.github.io/node-mysql2/docs/documentation/ssl), [node-mssql](https://github.com/tediousjs/node-mssql), [Tedious requirements](https://tediousjs.github.io/tedious/). This is compatibility/audit evidence, not a promise of future vulnerability absence.

## Embedded SSO contract

`POST /api/bcs/app/embed` issue is backend-only (no browser Origin or cookie), using a signed base64url assertion and configured issuer. Subject must already map to an active scoped principal. The returned code is handed from an allowed parent using `postMessage` with an exact target origin; never put it or reusable credentials in a URL. Child checks `event.source === window.parent`; redeem binds the code to the parent origin. Database unique `(issuer,replay_id)` plus atomic unused-code update enforce replay protection in source.

`/embed` displays only reporting context and campaigns, not standalone navigation. `/api/bcs/app/embed-session` requires a short-lived bearer, same-origin request, active company/portal/principal/scope, current report permission AND the configured embedded permission. Logout revokes it. `BCS_EMBED_FRAME_ORIGINS` controls frame ancestors; unset denies all framing. Standalone pages deny framing. HTTPS is required for hosted origins; loopback HTTP examples are solely local.

Examples for SoftVAT CRM, SAMATVA HMS and SkillMonk LMS are isolated in `examples/embedding/host.mjs` and `issuers.example.json`; no external repository changed. Host identity is synthetic and fixed in its server configuration. The example is **not** production host authentication. Configure reviewed Ed25519 key material outside source and the matching synthetic issuer/principal/portal. In CMD after isolated fixture provisioning:

```cmd
cd /d E:\Bulk-Communicatio-System
set BCS_ISOLATED_ACCEPTANCE=I_CONFIRM_DISPOSABLE_LOCAL_DATABASE
rem Supply private key and synthetic identity variables through your private operator environment.
node.exe examples\embedding\host.mjs
```

Local example paths: `http://127.0.0.1:3200/softvat-crm`, `/samatva-hms`, `/skillmonk-lms`. The BCS child is `http://127.0.0.1:3107/embed`. The host needs `BCS_DEMO_EMBED_PRIVATE_KEY`, `BCS_DEMO_COMPANY`, `BCS_DEMO_PORTAL`, `BCS_DEMO_SUBJECT`; BCS needs `BCS_EMBED_ISSUERS_FILE` and `BCS_EMBED_FRAME_ORIGINS=http://127.0.0.1:3200`. No keys are included in this delivery.

## Worker behavior and remaining constraints

`apps/worker/src/postgres-store.ts` adapts the existing engine. Both claim and settlement run transactions; company advisory lock serializes accounting, SKIP LOCKED is followed by a total-row check to prevent undercounting locked jobs. Scope is fixed from the worker's explicit company and database-authorized worker_scopes. Every settlement checks its previous lease token. Paused/inactive/unapproved campaigns cannot dispatch; changed recipient email invalidates the approved snapshot target; consent/suppression/active status are checked again.

Receipts are individually personalized, single-recipient **simulated** records; provider IDs and sent/delivered timestamps remain empty. Engine policies retain 1/5/10/25/50 batch sizes, 5/10/30/60/120/300/600s intervals (custom 5–600), bounded retries/backoff, UTC daily counters and subscription caps. Crash lease expiry is handled by the existing engine. PostgreSQL process restart/concurrency/fencing is not claimed tested here.

Current adapter intentionally caps a company's simulation job history at 1,000 and reservations at 21,000, failing closed above either bound. A scalable accounting/retention implementation and worker health heartbeat are still required before production. Current health output is lease diagnostics, not a full monitoring system. Unknown outcomes require manual audited quarantine; there is no automatic duplicate-send risk through retrying unknown provider outcomes.

## Isolated environment prerequisites and executable acceptance

**BLOCKER:** `psql`, Docker and Podman were not available on PATH. No system service was installed. No database connection was attempted. Both guarded runners were invoked without configuration and exited **2**, explicitly refusing to connect. Node emits `MODULE_TYPELESS_PACKAGE_JSON` warnings for the existing TypeScript execution layout; these do not prove database behavior and were not hidden.

Use a newly provisioned isolated PostgreSQL 15+ cluster on loopback port 55432, with no link to Supabase/customer systems and no existing BCS data. A reviewed privileged local role named `bcs_isolated_owner` is required solely for acceptance setup. Do not point it at an existing shared cluster: 023 creates a cluster-level role. Review role ownership, pg_hba and passwords privately.

A reviewed **schema-only synthetic baseline with ledger 001–022**, required roles/permissions and verified 010 provenance must be supplied offline as `.local\reviewed-baseline-schema.sql`. It must contain no customer data or credentials. Historical 011 contains a `postgres` database-name guard, so blindly replaying old migrations under a new name is NOT valid. This delivery does not rewrite those guards, dump live Supabase or rerun 001–022. If the reviewed baseline is unavailable, stop acceptance setup; obtain/build and review it in a separately authorized fresh environment.

Exact owner-run CMD steps once those prerequisites exist (never against bcs-dev):

```cmd
cd /d E:\Bulk-Communicatio-System
createdb.exe --host=127.0.0.1 --port=55432 --username=bcs_isolated_owner --template=template0 bcs_consolidated_isolated
psql.exe --host=127.0.0.1 --port=55432 --username=bcs_isolated_owner --dbname=bcs_consolidated_isolated --set=ON_ERROR_STOP=1 --file=E:\Bulk-Communicatio-System\.local\reviewed-baseline-schema.sql
psql.exe --host=127.0.0.1 --port=55432 --username=bcs_isolated_owner --dbname=bcs_consolidated_isolated --set=ON_ERROR_STOP=1 --command="COMMENT ON DATABASE bcs_consolidated_isolated IS 'BCS_DISPOSABLE_SYNTHETIC_ONLY';"
set BCS_ISOLATED_ACCEPTANCE=I_CONFIRM_DISPOSABLE_LOCAL_DATABASE
rem Privately set BCS_ISOLATED_ADMIN_URL and BCS_ISOLATED_WORKER_URL; never paste passwords into reports.
node.exe scripts\accept-isolated-saas.mjs
```

Runner requires loopback URL, exact DB/user/port, marker, isolated owner, zero companies, exact ledger 1–22; applies ONLY 023–025 once; creates synthetic `.invalid` records in two tenants; verifies scoped RLS, two workers, fencing, single receipts, reservations, consent exclusion, embed replay and self-review denial. Failure retains the database for investigation, does not clean/reset/rerun. A second run deliberately refuses the nonempty/applied target. Review its source before execution. The baseline artifact and a DB execution result are not supplied or claimed.

Worker startup after successful acceptance and operator-approved scope assignment:

```cmd
cd /d E:\Bulk-Communicatio-System
set BCS_ISOLATED_ACCEPTANCE=I_CONFIRM_DISPOSABLE_LOCAL_DATABASE
rem BCS_ISOLATED_WORKER_URL must use bcs_simulation_worker on 127.0.0.1:55432/bcs_consolidated_isolated.
rem Set BCS_SIMULATION_COMPANY to the reviewed synthetic company UUID.
call scripts\BCS_Isolated_Simulation_Worker.cmd
```

Stop with Ctrl+C in that worker window; restart the same command. Do not delete queue/fixture files. Expired leases recover using fencing. No Windows service is installed. App-side isolated mode additionally requires `BCS_APP_DATABASE_URL` for **bcs_app_backend**, the same marker/flag and the restricted runtime-role checks. Loopback unencrypted transport is allowed only for this explicit disposable mode; existing hosted TLS configuration remains unchanged. No synthetic sign-in fallback is installed; use existing verified session mechanisms or fixture sessions in the isolated harness.

### Focused integration commands

```cmd
cd /d E:\Bulk-Communicatio-System
set BCS_LIVE_TESTS=0
npm.cmd test -- tests\consolidated-contracts.test.ts -t postgresql
npm.cmd test -- tests\consolidated-contracts.test.ts -t mysql
npm.cmd test -- tests\consolidated-contracts.test.ts -t mssql
npm.cmd test -- tests\consolidated-contracts.test.ts -t portal_api
npm.cmd test -- tests\consolidated-contracts.test.ts -t embedding
npm.cmd test -- tests\saas-simulation.test.ts
```

These are **offline** contracts. For actual isolated PostgreSQL/MySQL/SQL Server source reads, provision separate disposable `bcs_connector_isolated` databases with verified TLS, reviewed SELECT-only accounts and the matching view from `examples/connectors/synthetic-views.sql.txt`. Supply `BCS_ISOLATED_CONNECTOR_FILE` referencing private JSON containing the SourceConfig plus `syntheticOnly:true`, `passwordEnv`, `caFile`; exact host `127.0.0.1`, one approved `contacts` view and port >=1024. Then run `node.exe scripts\accept-source-connector.mjs`. It validates two synthetic rows, discovery and cursor paging without writes. No real connector test ran here. REST remains offline-tested; do not relax SSRF rules for localhost testing.

## Verification results

- Typecheck: exit **0**.
- Biome lint: exit **0**, no diagnostics, no automatic fixes.
- Full regression suite: **295 passed / 16 skipped**, exit **0**; original 230 tests retained. 16 live integration tests remain skipped under `BCS_LIVE_TESTS=0`.
- Production build: exit **0**. Initial build warned about two dynamic filesystem traces; runtime-only annotations corrected those and the repeat build completed with **no warnings**. No deployment performed.
- New focused contracts/UI/API checks after correction: **65 passed**, exit **0**.
- npm dependency tree: exit **0**; installation audit: **0 vulnerabilities**.
- Isolated runner gates: exit **2** as expected without explicit prerequisites; **no connection attempted**. JavaScript runner syntax checks pass.
- Git whitespace check: exit **0** (existing CRLF-to-LF informational warnings only; no normalization performed). Guarded rollback **dry run passed**, exit **0**; rollback was not applied.
- No migration executed and no SQL result is presented as proven. SQL/source checks cannot certify RLS, grants, triggers or transaction semantics.
- Live skipped suites: `tests/recipient-live.integration.test.ts` (actual restricted reader/TLS/filter/scope/privilege probes) and `tests/supabase-session-live.test.ts` (real session mapping/expiry/logout/replay and CSRF). They remain opt-in and unauthorized here.

Browser evidence: actual local Next dev server at `http://127.0.0.1:3107`, with **BCS_APPLICATION_MODE=synthetic**, **BCS_DATA_MODE=synthetic**. Desktop dashboard and recipient navigation verified; mobile recipient, Compose, Configuration, Scheduling and Reports checked at 390×844. Measured document width 375, viewport 390: no page-level horizontal overflow on those checks. Embedded page waits for authorization. Screenshots in backup: `desktop-dashboard.png`, `mobile-recipient.png`, `mobile-compose.png`, `mobile-configuration.png`, `embedded-closed.png`. These are synthetic UI checks, not owner approval or authenticated SaaS end-to-end proof. Task-owned preview server was stopped after checks; any pre-existing server was untouched.

One-click source verification (does not install, migrate or connect):

```cmd
cd /d E:\Bulk-Communicatio-System
call scripts\BCS_Consolidated_Validate.cmd
```

To reopen the safe local UI:

```cmd
cd /d E:\Bulk-Communicatio-System
set BCS_APPLICATION_MODE=synthetic
set BCS_DATA_MODE=synthetic
set BCS_LIVE_TESTS=0
set NEXT_TELEMETRY_DISABLED=1
npm.cmd run dev --workspace=@bcs/web -- --port 3107
```

## Preservation, backup and rollback

Verified intake backup: `E:\Bulk-Communicatio-System\.local\saas-consolidated-20261019-140610`. Contains **250 tracked/nonignored source files**, including untracked application modules and migrations, copied and SHA-256 verified before implementation. Excludes generated dependencies/build outputs and ignored private runtime material; those were not treated as source to distribute. `baseline-manifest.json`, `backups/`, and `git-status-before.txt` retain the exact intake. All pre-existing source paths remain present. The generated `apps/web/next-env.d.ts` was restored to its exact intake bytes after build.

Evidence files: `preservation-results.json`, `approved-reference-results.json`, `changed-manifest.json`, `source-sha256.json`, `git-status-final.txt`, command logs and browser images. Source manifest excludes itself and the report to avoid recursive hashes; changed-manifest includes the finalized report. Manifests and backups are local and ignored; no credentials are intentionally included in the distributable source inventory.

Guarded rollback (not executed):

```cmd
cd /d E:\Bulk-Communicatio-System
powershell.exe -NoProfile -File E:\Bulk-Communicatio-System\scripts\BCS_Consolidated_Rollback.ps1
rem Review dry run. Stop task-owned processes first.
powershell.exe -NoProfile -File E:\Bulk-Communicatio-System\scripts\BCS_Consolidated_Rollback.ps1 -Apply
```

Rollback refuses any post-delivery hash mismatch or unsafe/reparse path, verifies original backup hashes, copies every current changed file to a new safety archive, restores only changed pre-existing files and quarantines task-created files without deletion. It never resets Git or touches databases. Installed node_modules is not rolled back automatically; reconcile it separately against the restored package lock. No SQL rollback was needed because none ran. For a future failed disposable acceptance, retain the target for review; do not rerun migrations or drop objects as an automatic recovery step.

## Remaining blockers and next activity

This is **not error-free production certification or complete end-to-end SaaS acceptance**. Main blockers: missing disposable PostgreSQL baseline/runtime; execution verification of new grants/RLS/security-definer functions and quota triggers; authenticated browser workflows; real TLS source-account integration; secure hosted issuer/session/CSRF/MFA lifecycle; scalable worker accounting/retention and monitoring; real signed provider-event persistence and attachment storage; production deployment and separately authorized SES release. Existing local development guards remain intentional. Browser approval of the new authenticated panels is outstanding.

**Exactly one recommended next activity:** provision and review the isolated PostgreSQL acceptance environment, then execute the guarded consolidated acceptance runner and authenticated browser acceptance against synthetic fixtures only. Keep Supabase bcs-dev and SES untouched.

## Exact task-relative changed files and final Git status

Pre-existing unrelated dirty and untracked files are not attributed to this task. All 12 IPX hashes/sizes match the saved approved IPX manifest; all three Smart TSX hashes/sizes match their original source manifest. Intake preservation additionally verified 45 reference/migration files. No pre-existing source path was removed. The Step1G helper is unchanged. New/changed source scan found no private-key material, AWS access-key pattern or unresolved merge marker; no private .local file is staged.

This task changed **46 files**: 11 pre-existing files modified, 35 new files.

| Action | Workspace-relative path |
|---|---|
| Modify | `apps/web/app/admin/users/page.tsx` |
| Create | `apps/web/app/api/bcs/app/campaign-review/route.ts` |
| Create | `apps/web/app/api/bcs/app/connectors/route.ts` |
| Create | `apps/web/app/api/bcs/app/embed-session/route.ts` |
| Create | `apps/web/app/api/bcs/app/embed/route.ts` |
| Create | `apps/web/app/api/bcs/app/simulation/route.ts` |
| Create | `apps/web/app/api/bcs/app/tenants/route.ts` |
| Create | `apps/web/app/embed/page.tsx` |
| Modify | `apps/web/next.config.ts` |
| Modify | `apps/web/package.json` |
| Create | `apps/web/src/embedded-portal.tsx` |
| Create | `apps/web/src/saas-console.tsx` |
| Modify | `apps/web/src/server/app-service.ts` |
| Create | `apps/web/src/server/campaign-review.ts` |
| Modify | `apps/web/src/server/campaigns.ts` |
| Create | `apps/web/src/server/connector-adapters.ts` |
| Create | `apps/web/src/server/connector-service.ts` |
| Create | `apps/web/src/server/embed-contract.ts` |
| Create | `apps/web/src/server/embedding.ts` |
| Create | `apps/web/src/server/simulation-operations.ts` |
| Create | `apps/web/src/server/tenant-administration.ts` |
| Modify | `apps/web/src/session-gate.tsx` |
| Modify | `apps/web/src/workspace.tsx` |
| Create | `apps/worker/src/postgres-main.ts` |
| Create | `apps/worker/src/postgres-store.ts` |
| Create | `database/migrations/023_isolated_simulation_worker.sql` |
| Create | `database/migrations/024_tenant_embed_and_workflows.sql` |
| Create | `database/migrations/025_quotas_and_independent_review.sql` |
| Modify | `docs/adr/DECISION-LOG.md` |
| Modify | `docs/handover/WORK-STATUS.md` |
| Create | `docs/implementation/BCS-CONSOLIDATED-SAAS-COMPLETION.md` |
| Create | `examples/connectors/registry.example.json` |
| Create | `examples/connectors/synthetic-views.sql.txt` |
| Create | `examples/embedding/host.mjs` |
| Create | `examples/embedding/issuers.example.json` |
| Modify | `package-lock.json` |
| Modify | `package.json` |
| Create | `packages/contracts/src/provider-contract.ts` |
| Create | `scripts/BCS_Consolidated_Rollback.ps1` |
| Create | `scripts/BCS_Consolidated_Validate.cmd` |
| Create | `scripts/BCS_Isolated_Simulation_Worker.cmd` |
| Create | `scripts/accept-isolated-saas.mjs` |
| Create | `scripts/accept-source-connector.mjs` |
| Create | `tests/consolidated-api.test.ts` |
| Create | `tests/consolidated-contracts.test.ts` |
| Create | `tests/consolidated-ui.test.tsx` |

Final complete `git status --short --untracked-files=all` (includes preserved earlier work):

```text
 M apps/web/.env.example
 M apps/web/app/api/bcs/app/session/route.ts
 M apps/web/app/layout.tsx
 M apps/web/next-env.d.ts
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
?? apps/web/src/server/embed-contract.ts
?? apps/web/src/server/embedding.ts
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
?? docs/architecture/BCS-SAAS-IMPLEMENTATION-READINESS.md
?? docs/email/BCS_SUPABASE_RECOVERY_TEMPLATE.html
?? docs/implementation/BCS-CONSOLIDATED-SAAS-COMPLETION.md
?? docs/implementation/BCS-SAAS-INCREMENT-1-IMPLEMENTATION.md
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
?? packages/contracts/src/dispatch-policy.ts
?? packages/contracts/src/provider-contract.ts
?? scripts/BCS_Consolidated_Rollback.ps1
?? scripts/BCS_Consolidated_Validate.cmd
?? scripts/BCS_Isolated_Simulation_Worker.cmd
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? scripts/accept-isolated-saas.mjs
?? scripts/accept-source-connector.mjs
?? scripts/validate_recipient_csv.py
?? tests/activation-link-strictmode.test.tsx
?? tests/activation-localhost-origin.test.ts
?? tests/admin-navigation.test.tsx
?? tests/admin-rights-layout.test.tsx
?? tests/admin-ui-cleanup.test.tsx
?? tests/consolidated-api.test.ts
?? tests/consolidated-contracts.test.ts
?? tests/consolidated-ui.test.tsx
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

Index remains empty; branch and HEAD unchanged.
