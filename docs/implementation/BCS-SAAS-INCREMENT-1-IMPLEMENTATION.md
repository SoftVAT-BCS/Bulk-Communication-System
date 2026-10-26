# Universal Notify — SaaS increment 1

Date: 19 October 2026. Workspace: `E:\Bulk-Communicatio-System`.
Branch/base: `main` / `2c073ba7b3c11965703e92f52a21cd24b105065e`.

## Result and boundaries

**IMPLEMENTED and locally TESTED:** tenant membership resolution, shared simulation policy validation, a durable synthetic-fixture Node worker, campaign policy UI/API source, and automated negative/concurrency/regression coverage.

**PARTIAL overall:** this is an independently runnable simulation increment, not an accepted PostgreSQL-backed campaign dispatcher. The existing application's real campaign queue remains paused and untouched. The worker cannot read real recipients or connect to Supabase. Its persistence adapter accepts only synthetic `.invalid` fixtures under `.local/saas-simulation`.

**BLOCKED:** PostgreSQL worker adapter, actual policy persistence, worker role/RLS, transaction/lease/quota integration and real campaign progress require separately authorized isolated PostgreSQL execution. No such environment/execution was authorized, and psql, Docker and Podman were not found on PATH. The task explicitly permits stopping that integration step while implementing independent components. No SQL file was executed. A missing instance was not bypassed by using existing Supabase.

**PENDING:** owner browser visual acceptance and isolated database acceptance. This is not full SaaS, hosted deployment, live sending or production certification.

## What changed

### Tenant context

The existing Supabase Auth verification, opaque sessions, issuer/subject mapping, role-aware navigation and local-origin/CSRF guards remain. A pure membership resolver now preserves the one-company path; multiple memberships require an explicit company ID. That ID is matched only against server-read principal memberships and then passes the existing active company, owned portal, scope and role checks. Unknown/duplicate mappings fail closed. No email-derived role or tenant claim is trusted.

The existing login screen reveals a company-ID field only after the authenticated mapping returns COMPANY_SELECTION_REQUIRED. It clears the password and requires a fresh sign-in. It does not expose a list of other companies. Subscription and tenant-scope interfaces include negative tests. Full tenant switching, company provisioning and removal of the fixed recipient reader scope are not implemented or claimed.

### Policy engine and existing campaign screen

Shared contracts accept batch sizes 1/5/10/25/50 and intervals 5/10/30/60/120/300/600 seconds. Custom intervals are validated against server-owned bounds (default 5–600 seconds). They validate simulation-only mode, rate/daily/campaign/subscription limits, maximum concurrency, retry counts/backoff, ISO start instant and IANA timezone. No new dependencies or package versions were selected.

The campaign workspace reuses SmartSelect, FormField and ActionButton. It adds batch/interval/start/timezone inputs, validation, an explicitly qualified duration estimate and a draft-policy save action. Policy changes require campaigns.schedule and the existing compose.draft database RLS. The API uses session-derived company/portal IDs, draft state and optimistic revision checks, and writes an audit record in the existing transaction. Foreign/stale/non-draft records share a safe failure. If 022 is absent, it returns SIMULATION_MIGRATION_NOT_APPLIED; it never pretends the save succeeded.

The estimate uses the currently selected recipient snapshot, not an authoritative resolved audience of the selected saved campaign. It is labeled as a planning estimate and is not used for dispatch. Simulation caps shown in this first UI are provisional safety defaults, not SES quotas or billing entitlements. Authoritative account/subscription limits further restrict the fixture engine; database policy enforcement remains blocked. No fake progress, active real-queue resume control or new live send button was added.

### Independently runnable simulation worker

Entrypoint: `apps/worker/src/main.ts`. It supports init, once, run, status, pause, resume and cancel for synthetic fixtures only. It does not load .env files, import a provider SDK or create a network/database connection. It cannot enable SES by environment variable. Each receipt is independently addressed and personalized; no recipient batching into To/CC.

The engine uses durable timestamps for batch starts, UTC quota days, validated display timezone/start instant, tenant-bound reservations, current eligibility checks, unique lease tokens, expiry recovery, stale completion rejection, bounded retries and dead-letter outcomes. Pauses/cancels invalidate outstanding leases; completed receipts cannot be replayed. Company policy, subscription, daily/campaign limits, rate and maximum concurrency constrain claims. Quota reservations are held until completion/release. Receipt counts represent simulation usage only, never billable/live sending.

Fixture transactions use an exclusive process lock, flush a temporary file and atomically replace the JSON state. Job transition, quota settlement and simulated receipt are saved together. Competing processes were tested. The engine rechecks eligibility/subscription at completion and rejects unsafe/missing personalization. It has no injectable live-send adapter. An explicit live-provider mode fails validation.

Important durability boundary: lease expiry/restart is tested after a committed claim. A process crash *inside* a fixture transaction can leave an orphan lock; the store fails closed with FIXTURE_LOCK_BUSY and does not automatically steal a potentially active lock. Stop all fixture processes and inspect the owner before any manual recovery. Unexpected lock files or corrupt state must not be deleted blindly. Filesystem power-loss guarantees are not certified. This fixture adapter is not a production alternative to PostgreSQL and does not create a second production queue.

### Existing schema reuse and proposed SQL

Reviewed existing queue/message/attempt/reservation/usage/campaign sources. The actual message table is `bcs.outbound_messages`, not the prompt's informal outgoing_messages name. No replacement business or queue tables were created.

- `database/migrations/022_simulation_policy_and_receipts.sql`: **Proposed, unexecuted** nullable campaign policy, simulation receipt/pacing columns, explicit attempt mode/result and narrow policy-column grant. Existing outcome constraints are retained; simulated records cannot become provider-submitted/delivered facts. Reruns and conflicting existing definitions fail. Existing 001–021 bytes remain unchanged.
- `database/fixtures/022_simulation_policy_isolated.sql`: **Unexecuted** disposable-database fixture for the actual policy CHECK expression, including null-mode and unsupported batch/interval rejection. It refuses databases not named bcs_increment1_isolated and rolls its temporary fixture back. This is not an RLS/worker acceptance suite.

Migration 010 remains `database/proposals/010_recipient_reader_PENDING_APPROVAL.sql`. Its source location and historical deployment references were reconciled; the current applied ledger/checksum was not queried. 022 requires ledger entries 010 and 021 and refuses an existing 022. An authorized operator must reconcile the actual 010 checksum/approval before execution. No old file was moved, renamed or rerun.

The delta intentionally creates no worker grants or claim/settlement functions. A PostgreSQL adapter and simulation-aware legacy reporting still need implementation and isolated tests before any database-backed worker can run. The existing schema's unknown outcome is kept separate from the new explicit simulation result; no accepted/delivered result is fabricated.

## Verification

The original 190-passing-test baseline remains covered. New tests exercise all batch sizes and remainder cases, all preset intervals, custom validation, scheduled starts, independent personalization, suppression/consent/inactive exclusions, two tenant scopes, subscription/daily/campaign/rate/concurrency limits, reservations, process concurrency, persistent lease restart/fencing, retry exhaustion, pause/resume/cancel, duplicate rejection, API denial, missing migration, tenant injection and network non-use. Multi-membership login UI and scoped policy controls are tested.

Tests use synthetic fixtures and mocked policy API transactions. They do not prove PostgreSQL transaction semantics, RLS, persistence or actual Supabase identity behavior. The same 16 existing live integration tests remain skipped (11 restricted-recipient database tests and five session database tests). No skipped test was relabeled passed.

Initial targeted checks found a browser-only setup assumption in the new Node suite and an unavailable matcher in a new UI test; both were corrected. Initial lint found two new-code diagnostics; both were corrected manually. No timeout increase, bulk formatter or weakened assertion was used.

The production build regenerated next-env.d.ts; its exact pre-task bytes were restored, followed by another typecheck. Existing generated-source changes were not overwritten with HEAD. No new actual browser/pixel comparison was performed; shared-control DOM tests and the successful build do not substitute for owner visual acceptance.

## Startup instructions — synthetic fixture only

Run from Windows CMD. Initialization deliberately refuses to overwrite an existing fixture. Pick a new fixture name for a separate run; do not remove existing data to bypass that check.

```cmd
cd /d "E:\Bulk-Communicatio-System"
node "E:\Bulk-Communicatio-System\apps\worker\src\main.ts" init owner-demo
node "E:\Bulk-Communicatio-System\apps\worker\src\main.ts" run owner-demo
```

Stop the running worker with Ctrl+C. From another CMD window:

```cmd
cd /d "E:\Bulk-Communicatio-System"
node "E:\Bulk-Communicatio-System\apps\worker\src\main.ts" status owner-demo
node "E:\Bulk-Communicatio-System\apps\worker\src\main.ts" pause owner-demo synthetic-a synthetic-a-portal demo-campaign
node "E:\Bulk-Communicatio-System\apps\worker\src\main.ts" resume owner-demo synthetic-a synthetic-a-portal demo-campaign
node "E:\Bulk-Communicatio-System\apps\worker\src\main.ts" cancel owner-demo synthetic-a synthetic-a-portal demo-campaign
```

These commands affect only the named synthetic fixture, never the application database. A cancelled fixture campaign cannot resume. Status reports simulated receipts, not email delivery. Test fixtures are retained under `.local/saas-simulation` rather than deleting pre-existing files. No long-running worker was left running by this task.

Installed Node v24.16.0 executes the worker directly without a package install. Node's native type stripping requires explicit file extensions and does not typecheck; the repository tsc check now includes apps/worker. See [official Node TypeScript documentation](https://nodejs.org/api/typescript.html). A future PostgreSQL claim adapter should use short locked transactions, not general reporting reads with SKIP LOCKED; see [PostgreSQL locking documentation](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE).

## Backup and guarded rollback

Verified complete source backup: `E:\Bulk-Communicatio-System\.local\saas-increment1-20261019-134358\backups` — 235 tracked/nonignored untracked files at intake, including migrations 016–021 and the readiness report. Relative paths and SHA-256/size records are in baseline-manifest.json. Private .local configuration, dependencies and generated ignored artifacts are excluded; .env.example is retained as source. No credential/private configuration was read into the backup.

The same directory contains verification-manifest.json, changed-files.json, review.diff, command logs and guarded rollback.py. Rollback first verifies every current changed/new file against its after-hash and every original backup against its before-hash. It refuses later edits, missing files or unexpected paths. Existing files are restored byte-for-byte; newly created source files are moved to a rollback-created-files archive inside this backup, preserving them rather than deleting them. Stop running development/fixture processes before owner-run rollback. It does not alter Git staging/history or databases. The rollback procedure is supplied and syntax-checked, not executed.

```cmd
cd /d "E:\Bulk-Communicatio-System"
python "E:\Bulk-Communicatio-System\.local\saas-increment1-20261019-134358\rollback.py" --apply
```

## Remaining gates

1. Review the source/delta and approve an isolated PostgreSQL environment plus migration/fixture execution. No Supabase live acceptance is implied.
2. Implement the scoped PostgreSQL store/worker role and transactional claim/settlement SQL against existing tables, with actual concurrency/RLS/crash tests and simulation-aware reports. Until then, real campaign dispatch/progress stays disabled.
3. Ratify simulation policy bounds and authoritative subscription policy provisioning. No billing lifecycle or full multi-company switcher is claimed.
4. Owner visual review of the extended campaign policy panel and conditional login company field.

Exactly one next activity: **owner review and authorization of isolated PostgreSQL integration acceptance for this simulation increment**. No connectors, embedding, paid services, live SES, deployment, staging, commit or push were undertaken.

## Final measured results and inventory

| Check | Exit/result |
|---|---|
| npm.cmd run typecheck (after restoring generated file) | 0 |
| npm.cmd run lint | 0; 147 files, no diagnostics |
| npm.cmd test | 0; 230 passed, 16 skipped, 246 total; 30 files passed, 2 skipped |
| npm.cmd run build | 0; production compilation and 26-page generation completed |
| Preserved IPX | 12/12 SHA-256 and size matches |
| Archived Smart controls | 3/3 SHA-256 and size matches |
| Existing database source files | All 29 intake files unchanged, including numbered migrations and 010 proposal |
| Source backup | 235/235 verified |
| Git staging | Empty; HEAD unchanged |

Command logs: `.local/saas-increment1-20261019-134358/{typecheck-final,lint-final,tests-final,build-final}.txt`. The extra 40 tests passed; no baseline tests were removed or skipped. High-confidence private-key/cloud-key/credential-URL and conflict-marker scans of changed/new source found no matches; this is not a complete secret-audit certification.

### Exact files modified by this increment (10)

- `apps/web/src/bcs-admin-login.tsx`
- `apps/web/src/campaign-workspace.tsx`
- `apps/web/src/server/app-service.ts`
- `biome.json`
- `docs/adr/DECISION-LOG.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/handover/WORK-STATUS.md`
- `package.json`
- `tests/setup.ts`
- `tsconfig.json`

### Exact source files created by this increment (15)

- `apps/web/app/api/bcs/app/simulation-policy/route.ts`
- `apps/web/src/server/simulation-policy.ts`
- `apps/web/src/server/tenant-context.ts`
- `apps/web/src/simulation-policy-panel.tsx`
- `apps/worker/src/fixture-store.ts`
- `apps/worker/src/fixture.ts`
- `apps/worker/src/main.ts`
- `apps/worker/src/simulation-engine.ts`
- `database/fixtures/022_simulation_policy_isolated.sql`
- `database/migrations/022_simulation_policy_and_receipts.sql`
- `docs/implementation/BCS-SAAS-INCREMENT-1-IMPLEMENTATION.md`
- `packages/contracts/src/dispatch-policy.ts`
- `tests/saas-simulation.test.ts`
- `tests/simulation-policy-api.test.ts`
- `tests/simulation-policy-ui.test.tsx`

Ignored local artifacts additionally created: verified backup/manifest/log/rollback files under `.local/saas-increment1-20261019-134358` and synthetic test fixture JSON files under `.local/saas-simulation`. No pre-existing ignored private configuration was changed.

### Final Git status

```text
 M apps/web/.env.example
 M apps/web/app/api/bcs/app/session/route.ts
 M apps/web/app/layout.tsx
 M apps/web/next-env.d.ts
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
?? apps/web/app/api/bcs/app/campaigns/route.ts
?? apps/web/app/api/bcs/app/configuration/route.ts
?? apps/web/app/api/bcs/app/selections/route.ts
?? apps/web/app/api/bcs/app/simulation-policy/route.ts
?? apps/web/app/api/bcs/app/users/route.ts
?? apps/web/app/api/bcs/v1/contacts/route.ts
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
?? apps/web/src/role-home.ts
?? apps/web/src/server/campaign-validation.ts
?? apps/web/src/server/campaigns.ts
?? apps/web/src/server/configuration-service.ts
?? apps/web/src/server/configuration-validation.ts
?? apps/web/src/server/contact-validation.ts
?? apps/web/src/server/contacts-api.ts
?? apps/web/src/server/invitation-activation.ts
?? apps/web/src/server/personalization.ts
?? apps/web/src/server/simulation-policy.ts
?? apps/web/src/server/supabase-auth.ts
?? apps/web/src/server/tenant-context.ts
?? apps/web/src/server/user-management.ts
?? apps/web/src/server/user-onboarding.ts
?? apps/web/src/simulation-policy-panel.tsx
?? apps/worker/src/fixture-store.ts
?? apps/worker/src/fixture.ts
?? apps/worker/src/main.ts
?? apps/worker/src/simulation-engine.ts
?? database/fixtures/022_simulation_policy_isolated.sql
?? database/migrations/016_campaign_workspace.sql
?? database/migrations/017_configuration_workspace.sql
?? database/migrations/018_contact_api.sql
?? database/migrations/019_contact_taxonomy.sql
?? database/migrations/020_user_onboarding_scoped.sql
?? database/migrations/021_company_user_management.sql
?? database/migrations/022_simulation_policy_and_receipts.sql
?? docs/architecture/BCS-SAAS-IMPLEMENTATION-READINESS.md
?? docs/email/BCS_SUPABASE_RECOVERY_TEMPLATE.html
?? docs/implementation/BCS-SAAS-INCREMENT-1-IMPLEMENTATION.md
?? docs/implementation/BCS_ADMIN_MENU_RIGHTS_UI_PATCH.md
?? docs/implementation/BCS_AUTH_INVITATION_ACTIVATION.md
?? docs/implementation/BCS_UI_CLEANUP_INVITATION_READINESS.md
?? docs/implementation/BCS_USER_MANAGEMENT_ALL_IN_ONE.md
?? docs/implementation/REGRESSION-STABILIZATION-2026-10-19.md
?? docs/implementation/SAAS-CONTACT-API.md
?? docs/implementation/SUPABASE-AUTH-LOGIN-CORRECTION.md
?? packages/contracts/src/dispatch-policy.ts
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? scripts/validate_recipient_csv.py
?? tests/activation-link-strictmode.test.tsx
?? tests/activation-localhost-origin.test.ts
?? tests/admin-navigation.test.tsx
?? tests/admin-rights-layout.test.tsx
?? tests/admin-ui-cleanup.test.tsx
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

Direct CLI smoke check: init/once/status each exited 0; two synthetic tenants produced 10 simulated receipts from 22 jobs, with 12 pending under pacing. No worker remained running. Node emitted nonfatal MODULE_TYPELESS_PACKAGE_JSON reparsing warnings; no global package module type was changed. git diff --check exited 0 (existing CRLF-conversion notices only; no whitespace errors).
