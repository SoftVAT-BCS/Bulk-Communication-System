# BCS SaaS implementation readiness

Review date: 19 October 2026. Workspace: `E:\Bulk-Communicatio-System`.
Branch: `main`. Base HEAD: `2c073ba7b3c11965703e92f52a21cd24b105065e`.

## 1. Acceptance verdict and evidence boundary

**PASS — stabilization scope and preservation review. REVIEW REQUIRED — consolidated SaaS implementation readiness.** The stabilization changes are suitable as the starting point for an owner-approved implementation increment. This is not production, live-isolation or browser visual certification. All architecture additions below are **Proposed**.

Reviewed the stabilization report, all 23 existing-file changes against their saved pre-stabilization backups, current implementations and migration sources through 021. All 23 current after-hashes and all 23 backup before-hashes match `.local/regression-20261019-132109/changed-files.json`. The stabilization diff is narrower than the complete dirty tree: many current tracked modifications and untracked modules predate stabilization. They must not be reset or treated as newly approved changes.

The five reported failures had test-contract or test-performance causes:

1. Administration mock lacked the permission/home required by SessionGate; supplying a valid dashboard permission preserves access denial behavior.
2. User Creation test used outdated readiness text/button naming and omitted its directory response; contract-shaped mocks and accessible assertions retain the disabled-state expectation.
3. Template lifecycle test exercised the intentional synthetic/local mode, not the authenticated server mode. Full workspace rendering and character-by-character rich-editor input caused overhead. The real EmailWorkspace is now isolated and bulk text pasted, preserving lifecycle assertions.
4. Draft test had the same overhead; persistence/reload and keep/discard assertions remain. No timeout increase.
5. “Connected portal” named both navigation and a select. The assertion now scopes an accessible combobox query to the User Rights tabpanel.

One additional navigation timeout occurred in the baseline and passed later without changing its test. Two new mock-HTTP tests exercise the actual authenticated email hook and confirm no local-storage fallback. Mocks do not prove database persistence.

The other source changes replace 42 informational string-concatenation diagnostics with equivalent template literals. Review found no SQL statement, authorization, dependency, styling or functional redesign in these changes. WORK-STATUS records the work. The new stabilization report is also in scope.

### Exact 23-file stabilization review

| Existing file | Scope |
|---|---|
| `apps/web/src/campaign-workspace.tsx` | Equivalent string construction |
| `apps/web/src/client-recipients.ts` | Equivalent string construction |
| `apps/web/src/communication.tsx` | Equivalent string construction |
| `apps/web/src/configuration.tsx` | Equivalent string construction |
| `apps/web/src/database-configuration.tsx` | Equivalent string construction |
| `apps/web/src/database-email-store.ts` | Equivalent string construction |
| `apps/web/src/email-composer.tsx` | Equivalent string construction |
| `apps/web/src/recipient-csv.ts` | Equivalent CSV string construction; quoting/BOM/newlines preserved |
| `apps/web/src/server/activity.ts` | Equivalent string construction |
| `apps/web/src/server/campaigns.ts` | Equivalent string construction |
| `apps/web/src/server/configuration-service.ts` | Equivalent string construction |
| `apps/web/src/server/contacts-api.ts` | Equivalent string construction |
| `apps/web/src/server/documents.ts` | Equivalent string construction |
| `apps/web/src/server/schedule-validation.ts` | Equivalent string construction |
| `apps/web/src/server/scheduling.ts` | Equivalent string construction |
| `packages/ui/src/grid.tsx` | Equivalent string construction |
| `tests/authenticated-documents.test.ts` | Equivalent string construction |
| `tests/recipient-server.test.ts` | Equivalent string construction |
| `tests/supabase-session-live.test.ts` | Equivalent string construction; live opt-in unchanged |
| `tests/admin-ui-cleanup.test.tsx` | Current permission/readiness contract assertions |
| `tests/email-editor.test.tsx` | Isolated editor harness, efficient input, remote-hook coverage |
| `tests/fidelity.test.tsx` | Scoped accessible query |
| `docs/handover/WORK-STATUS.md` | Stabilization status |

### Authentication and protected behavior

Login Fix 09 route-permission handling, restricted authentication, activation/recovery, User Creation, User Management and User Rights implementation files retain their pre-stabilization bytes. Current `app-service.ts` checks active principal/company/portal, scope and role permission; trusted issuer/subject mapping remains in `supabase-auth.ts`. No email-based identity fallback or frontend-only authorization was introduced. `session-gate.tsx`, `role-home.ts`, `user-onboarding.ts`, `user-management.ts`, `invitation-activation.ts` and the activation route were preserved. Tenant checks remain in source; their live enforcement is **UNVERIFIED in this review**.

All 12 IPX files, including the original ZIP, match the saved SHA-256/size baseline. All three archived Smart controls match their source manifest. No new visual comparison was performed; byte preservation is not a pixel comparison of React. The approved five-page layout and reusable controls were not redesigned. Migration sources retain their pre-stabilization bytes.

### Recorded test evidence reviewed, not rerun

| Command / run | Recorded exit | Result |
|---|---:|---|
| Baseline tests | 1 | 182 passed, 6 failed, 16 skipped; 204 total |
| Baseline lint | 0 | 42 informational diagnostics |
| Final `npm.cmd run typecheck` | 0 | Passed |
| Final `npm.cmd run lint` | 0 | 135 files; no diagnostics |
| Final `npm.cmd test` | 0 | 190 passed, 16 skipped; 206 total; 27 files passed, 2 skipped |
| Final `npm.cmd run build` | 0 | Production build completed; generated static/dynamic routes |

Evidence: `docs/implementation/REGRESSION-STABILIZATION-2026-10-19.md` and ignored `.local/regression-{typecheck-final,lint-final,tests-final,build}.txt`. The earlier build regenerated next-env.d.ts; stabilization restored its exact intake bytes and reran typechecking. Build completion does not establish hosted runtime support. This acceptance activity read evidence and verified source integrity; it did not rerun commands that generate artifacts or access services.

### All 16 skipped integration cases

`tests/recipient-live.integration.test.ts` has 11 cases:

1. Verified TLS and restricted login.
2. Actual runtime guard and expected counts/options.
3. Active status filtering.
4. Inactive status filtering.
5. Bounced status filtering.
6. Unsubscribed status filtering.
7. Search, pagination, sorting, memberships and enriched details.
8. Missing/empty/malformed/foreign GUC scope denial on six tables.
9. Wrong trusted scope and pooled-connection scope cleanup.
10. Write, temporary DDL, unrelated reads and definer execution denial.
11. Monitoring-view ACL does not confer schema access.

`tests/supabase-session-live.test.ts` has five cases:

12. Trusted subject mapping and opaque session creation.
13. Unmapped valid identity denied despite supplied email.
14. Database session expiry.
15. Logout revocation and replay denial.
16. Cross-origin password submission rejected before provider authentication.

These remain opt-in through BCS_LIVE_TESTS. They were intentionally disabled in stabilization. Some mutate test session records; do not enable them against live data as part of this read-only review. Historical successful probes are not substituted for a current isolated integration run.

## 2. Existing versus missing features

IMPLEMENTED means current source implements the stated bounded behavior; it does not imply deployed/live-verified. PARTIAL means substantial source exists but the requested end-to-end capability is incomplete. PENDING means the runtime capability is absent. UNVERIFIED identifies an execution/evidence gap.

| Feature | Classification | Existing evidence and remaining work |
|---|---|---|
| Company and portal administration | PARTIAL | Migration 001; configuration-service company edits/portal CRUD. No complete SaaS tenant provisioning, suspension, owner transfer or multi-company selection lifecycle. |
| Authentication, activation/recovery and user rights | IMPLEMENTED, local scope | app-service, supabase-auth, invitation-activation, user-onboarding/user-management and their tests. Hosted origins, identity reuse across tenants and session switching need design. |
| Tenant authorization / RLS | PARTIAL; live UNVERIFIED | Composite tenant keys, FORCE RLS, session_allows and api_context exist. Auth metadata/session policies trust the private backend; not every table has a tenant-filtering policy. Isolated multi-tenant runtime/catalog tests remain required. |
| SaaS subscriptions and quotas | PARTIAL | Migration 007 plan/subscription/usage/reservation tables; contact accepted-usage counters. No complete plan lifecycle, concurrent quota enforcement, billing lifecycle or reconciliation worker. |
| External connectors/mapping | PARTIAL | Migration 003 and Configuration save connection/mapping metadata. Validation accepts native BCS PostgreSQL recipients; external adapters are explicitly unsupported. No MySQL/MSSQL/external PostgreSQL extraction runtime. |
| Contact import API | IMPLEMENTED, development-only | contacts-api/contact-validation and /api/bcs/v1/contacts: scoped token, idempotency, safe batch errors, taxonomy, usage and rate windows. 100 rows/request, 60 requests/minute/client. Public deployment, client lifecycle and subscription enforcement pending. |
| Campaigns and recipient snapshots | PARTIAL | campaigns.ts and migration 016 support create/edit/review/approve/schedule/prepare/cancel, revisions, eligibility and deduplicated snapshots. Cross-user approval and durable execution incomplete. |
| Scheduling and queue preparation | PARTIAL | scheduling.ts, campaign preparation and migrations 005/006/014/015; prepared jobs paused. Durable claim/retry/lease execution not implemented. |
| Durable background worker | PENDING | Queue schema exists; apps/worker has no executable implementation. |
| Templates and drafts | IMPLEMENTED, bounded | Server-backed documents/revisions/archive and email workspace; synthetic mode deliberately local. Live persistence not revalidated here. |
| Individual personalization | PARTIAL | personalization.ts permits student_name/course_name/batch_name, escapes HTML, rejects attribute variables and missing fields. Needs reviewed mapping/version contract and broader fields. |
| Batch sizes, intervals and sending limits | PARTIAL | Sending-policy rate/daily/retry fields exist; no end-to-end 1/5/10/25/50 batching and interval scheduler. |
| Simulation dispatch | PENDING | Paused preparation is not a simulation worker. Explicit simulated outcomes, retries and reports needed. |
| SES adapter | PENDING / disabled configuration | Provider/sender metadata exists and configuration saves disabled. No approved live adapter or sending authorization. |
| Reporting and audit | PARTIAL | activity/dashboard queries, audit events, verified provider-event structures, exports and suppression controls. Simulation reporting, quota reconciliation, retention and worker observability incomplete. |
| Embedding and scoped SSO | PENDING | Illustrative UI wording is not an authenticated embed protocol. No issuer/audience/origin/replay contract or hardened embed entrypoint found. |
| Hosted SaaS runtime | UNVERIFIED / blocked by current guards | app-service and contact requests are explicitly development/loopback restricted; recipient-access is fixed to configured demo scope. A successful production build does not remove these restrictions. |

Specific source constraints: `apps/web/src/server/app-service.ts:16` restricts backend runtime; `recipient-access.ts:6` binds reader scope; `configuration-service.ts:6` onward implements metadata/native validation; `contacts-api.ts:1` onward implements token/import operations; `campaigns.ts:1` onward contains lifecycle and snapshots. These compact files have long lines: inspect full functions, not line fragments. Campaign resolution requires the selection creator to be the current principal, so another approver cannot simply reuse the creator's selection. API approval exists but independent-reviewer policy is not established. Login expects exactly one mapped principal, so the same external subject mapped to multiple companies needs explicit handling.

## 3. Migration source inventory through 021

No SQL executed and no live catalog or applied-migration ledger inspected.

| Number | Source responsibility |
|---|---|
| 001 | Company/portal/principal/role/permission/API-client foundation |
| 002 | Audience, taxonomy, consent/preferences, suppression and import records |
| 003 | Connector, mapping, discovery, receipt and sync metadata |
| 004 | Templates/revisions/drafts/assets, SES metadata and sending policies |
| 005 | Selections, campaigns/snapshots, outgoing messages, jobs/leases/attempts and feedback |
| 006 | Class events, notification rules/schedules, webhooks, exports, retention and audit |
| 007 | SaaS plans, subscriptions, usage, quota reservations, API idempotency and billing metadata |
| 008 | Final guards, grants/revocations, RLS and triggers |
| 009 | Recipient state/district |
| 010 | Restricted reader proposal and verification/remediation sources |
| 011 | Authenticated email workspace, sessions, private backend grants and session authorization |
| 012 | Draft portal workspace access |
| 013 | Authenticated dashboard |
| 014 | Authenticated scheduling |
| 015 | Reports and paused queue controls |
| 016 | Campaign revision/lifecycle workspace and paused job inserts |
| 017 | Configuration workspace grants/policies |
| 018 | Scoped contact API identity, limits and import access |
| 019 | Contact taxonomy access |
| 020 | Scoped user onboarding |
| 021 | Company user management |

001–009 and 011–021 are in `database/migrations`. **010 is in `database/proposals/010_recipient_reader_PENDING_APPROVAL.sql`, not the numbered migrations directory.** Associated verification/remediation files are also proposals. Reconcile authoritative approval, applied version and checksum before designing deployment; do not infer missing or successful deployment from filenames. Legacy Codex_0001, rollback rehearsal and preflight files are not interchangeable with this chain. Preserve all existing migration bytes; never rerun these as a shortcut.

## 4. Proposed consolidated architecture and file changes

Keep the current Next.js API and UI boundaries. Extend existing services; do not introduce a parallel administration or contact implementation in apps/api. Extract shared server-only policies into a package only when the worker genuinely needs them. Reuse packages/ui and the approved design. No exact new dependency versions are selected here; official compatibility/security evidence is a prerequisite to selecting drivers or identity libraries.

| Work | Proposed modifications | Proposed additions |
|---|---|---|
| A. SaaS administration | app-service.ts, recipient-access.ts, configuration-service.ts, user-management.ts, existing admin routes/screens | server/tenant-administration.ts, server/subscriptions.ts; scoped company/portal switching routes and tests |
| B/C. Source integrations | configuration-service.ts, configuration-validation.ts, contacts-api.ts, contact-validation.ts; retain existing import idempotency | packages/integrations/src/{contracts,mysql,mssql,postgresql,rest}.ts; server/connector-jobs.ts; connector contract/security tests |
| D. Embed/SSO | Existing session authorization and deployment response headers; preserve ordinary login | server/embed-sso.ts, app/api/bcs/embed/exchange/route.ts, dedicated embed entry and tests |
| E. Approvals/schedules | campaigns.ts, campaign-validation.ts, scheduling.ts and existing campaign workspace | Cross-user approval and stale-revision tests; shared eligibility policy only where needed |
| F/J/K. Worker and adapters | Existing queue/attempt schema and activity reporting | apps/worker/src/{main,claim,execute,recovery}.ts; packages/notification-core/src/{dispatch-policy,eligibility,quotas}.ts; packages/providers/src/{simulation,ses-disabled}.ts |
| G. Personalization | personalization.ts, documents.ts, campaign preparation | Versioned personalization/mapping contract and synthetic snapshot tests |
| H/I/L. Limits/reporting/audit | Configuration policy API/UI, activity.ts, dashboard, usage/reservations | Worker reconciliation/metrics, quota and simulation acceptance tests |

Names are planning targets, not authorization to create all files or libraries. Verify existing package layout before implementation. Keep templates and recipient identifiers stable; avoid copying server secrets or authoritative state into React/localStorage.

### API and security contracts

Every browser endpoint resolves the opaque server session and checks action, company, portal and record scope. Tenant switching creates/rebinds a server-authorized context and clears scoped caches/selections; never trust an arbitrary portal header. Preserve restricted-user landing-page behavior. Retain existing identity mappings; define an explicit company selection flow rather than silently taking a first match. Production origin/cookie/TLS configuration requires a new reviewed deployment profile; do not simply delete localhost guards.

Keep contact ingestion behind expiring, hashed, scoped server-client credentials. Add reviewed issuance/rotation/revocation and separate read/write scopes, body limits and subscription checks. Preserve idempotency conflicts, inactive new contacts, consent independence and suppression. Define idempotency retention longer than the supported retry window.

Connector adapters use read-only approved views/parameterized queries and allowlisted identifiers; no arbitrary SQL from UI. Use private agents or approved network paths for private databases, verified TLS, secret references and bounded extraction/checkpoints. REST integrations require approved host/path/method contracts, redirect and SSRF controls, payload limits, retry/backoff and replay-safe receipts. Configuration validation is not permission to contact arbitrary destinations. All integration tests initially use local synthetic adapters.

Embedding requires an owner-approved issuer/audience/origin and tenant mapping contract, short-lived single-use exchange, replay tracking, strict callback targets and scoped session expiry/revocation. Do not place service credentials or reusable access tokens in iframe URLs. Define CSP frame-ancestors, postMessage origin checks and cross-site cookie behavior explicitly; account for browsers blocking third-party cookies. Do not weaken standalone CSRF protection to make embedding work. Choose an established identity protocol/library only after current official security/compatibility review.

### Campaign and worker contract

Extend existing campaign revisions and snapshots. Separate creator selection access from reviewer access through explicit campaign-scoped authorization; do not globally remove creator ownership checks. Define whether approval requires a different actor, invalidate approval after content/audience/policy changes and audit every transition. Scheduled work uses UTC plus an explicit display timezone/DST policy.

A private worker has a dedicated least-privilege database role and tenant-bound job authorization, not browser credentials or a broad owner connection. Claims use short transactions, row locking with SKIP LOCKED, lease expiry and fencing tokens. Persist attempt identity before side effects; reject stale lease completion, retry with bounded backoff, dead-letter permanent failures and recover crashes. No promise of exactly-once external delivery. Serialize quota reservation and eligibility checks with claims; cancellation/pause must be rechecked before execution.

Revalidate active recipient status, consent/preferences, suppression, current tenant authorization and approved revision at dispatch. Use immutable recipient/content snapshots with explicit rules for invalidated source data. Reuse existing dispatch_jobs, outgoing_messages, delivery_attempts, usage_counters and quota_reservations rather than a second queue.

Only batch sizes **1, 5, 10, 25, 50** are accepted. Define interval as minimum time between batch starts within the configured scope; use durable next-eligible timestamps and bounded catch-up after downtime. Enforce per-company/portal policy, plan, daily and rate limits atomically across workers. The effective limit is the most restrictive approved limit. Define timezone/day boundaries, reservations, expiry and cancellation refund semantics. Simulation usage must be distinct from billable/live usage.

Default and only enabled adapter is SIMULATION. Record simulated acceptance/failure as simulated, never delivered/sent or a verified provider event. SES adapter is an explicit disabled implementation that refuses dispatch, with no SDK/client/network call or credentials requirement. Later enabling SES is a separate approval and deployment, not a UI switch in this increment.

## 5. Proposed additive database changes

Existing tables cover most business entities. Do not recreate companies, recipients, campaigns, templates, queues or subscriptions. After reconciling 010 and the actual deployment ledger, reserve new numbers after 021; names below are provisional:

1. `022_saas_scope_and_embedding.sql`: narrowly scoped tenant/session selection support and embed issuer/client configuration plus single-use exchange/replay records if the accepted protocol requires them; tenant-bound keys, RLS and minimal privileges. Avoid storing plaintext reusable tokens.
2. `023_dispatch_policy_and_simulation.sql`: extend sending policies with allowed batch size, interval and explicit simulation-only mode; add distinct simulation outcome representation to messages/attempts/reports, reservation linkage and any missing claim/fencing constraints/indexes. Existing message/attempt states do not presently represent simulation truthfully.
3. `024_quota_and_worker_guards.sql`: atomic reservation/settlement and lease operations with a dedicated worker role; tenant/permission checks, concurrency indexes, scoped audit and retention. Reuse existing subscription/usage/reservation tables. Include only functions/constraints absent after detailed catalog reconciliation.

Keep these changes additive and fail explicitly on incompatible existing definitions. No destructive DROP/TRUNCATE or silent replacement of policies. Review SECURITY DEFINER ownership, fixed search_path and PUBLIC execution revocations where used. Composite foreign keys must preserve tenant relationships. Broad backend auth-metadata access in 011 is an explicit trusted boundary to review, not proof of tenant isolation by schema name.

Before execution: verify migration checksums/order and target database identity, review roles/Data API exposure, back up schema/data with restore evidence, test in an isolated environment, inspect lock/backfill impact and acquire owner deployment approval. No migration files were created by this review.

## 6. Simulation acceptance and regression safeguards

- Run existing typecheck/lint/tests/build separately, recording exit codes; preserve the 190-test baseline and disclose every skip. A new test count alone is not proof of unchanged behavior.
- Use at least two companies, multiple portals and principals with overlapping roles. Deny foreign IDs, exports, counts, mappings, snapshots, job claims and embed contexts. Test pool reuse, expired/revoked sessions and membership changes.
- Preserve Login Fix 09, restricted home selection, account activation/recovery and user management tests. Verify no privilege escalation through role assignment or company switching.
- Test all five batch sizes with zero recipients, 1, exact batch multiples and remainders; expected number of nonempty batches is ceiling(N/batchSize). Assert no oversize or duplicate attempts.
- Use a controlled clock for intervals, schedules, DST, rate/daily quota boundaries and retry backoff. Run competing workers to prove atomic quota reservation and tenant fairness.
- Simulate crash before/after claim, expired leases, stale completions, duplicate jobs, replayed commands, cancellation during execution, exhausted retries and unknown outcomes. Reconcile reservations without double charging or releasing another job's allowance.
- Assert suppressed, unsubscribed, inactive and ineligible recipients never reach even the simulation adapter; replay approval/content changes and missing personalization fields.
- Assert personalized content is escaped, tenant-scoped and deterministic for the recorded revision; variables in unsafe contexts fail closed. Never use real recipient data in fixtures/reports.
- Deny all provider/network calls in dispatch tests; SES-disabled must fail closed even if environmental credentials exist. Simulation reports must never show real delivery or alter provider verification facts.
- Exercise connector schema drift, invalid identifiers, forbidden hosts/redirects, changed credentials, pagination/checkpoints and identical/conflicting API retries using synthetic sources.
- Exercise embed wrong issuer/audience/origin, expiry/replay, foreign tenant, logout and third-party-cookie failure. Test same-origin standalone flows separately.
- Repeat approved IPX visual comparisons at desktop/tablet/mobile widths, both themes, keyboard/focus and overflow. Maintain five-page navigation and shared controls. Source hashes preserve references; owner visual acceptance remains separate.
- Run actual database/RLS/worker integration only in an explicitly authorized isolated environment. The 16 current live tests remain unverified until that approval; do not run the write-bearing session suite on existing live data.

## 7. Consolidated implementation sequence

1. Owner reviews this plan, dirty-tree provenance and migration 010 ledger discrepancy; ratify scope, identity/embedding contracts and simulation-only acceptance criteria. Preserve a complete local backup before authorized development.
2. Implement tenant/context and subscription policy extensions, isolated fixtures and cross-tenant regression tests. Preserve current login/activation contracts.
3. Add scoped connector lifecycle and approved adapters, extending contact import/idempotency and mapping. Validate offline adapters before any approved connectivity.
4. Complete campaign reviewer access, versioned personalization, scheduling and policy UI using existing controls; implement reviewed additive migrations in an isolated test environment only after separate execution approval.
5. Implement durable simulation worker, atomic quotas, leases/retries, intervals and batch sizes; keep SES disabled and prove network denial.
6. Add scoped embedding/SSO, simulation reporting, audit/reconciliation and operational pause/diagnostics. Complete isolated security and concurrency tests.
7. Run complete regression/build/visual and recovery acceptance; report evidence and seek owner approval before any hosted deployment or live integration. Live sending is outside this sequence.

## 8. Risks, blockers and rollback

The working tree contains substantial uncommitted work beyond stabilization, including migrations 016–021. Preserve tracked and untracked files; HEAD alone cannot reconstruct it. Migration application state, live RLS, current Supabase settings, backups/restores and hosted behavior are not verified. Historical probes in documentation do not close these gaps. Some foundation documents still say no application/tests exist; current source and dated evidence supersede those descriptions, which were not edited here.

Primary development blockers: local-only runtime guards and fixed reader scope; ambiguous multi-company identity handling; approval selection ownership; missing worker/quota engine; missing external adapters and embed contract; simulation outcome representation; migration 010 provenance; skipped live integration tests. Provider permissions, billing rules, retention and source-system access require owner decisions. No production-readiness claim is made.

For this review rollback is simply owner removal of this newly created report if desired; no application rollback is required. For future work use byte-preserving per-increment backups including untracked files, guarded restoration and additive expand-first migrations. Pause workers and revoke new integration clients before rollback. Do not destructively reverse applied data migrations; prefer a reviewed forward repair and validated backup recovery plan. Keep old code compatible during rollout. Existing stabilization rollback remains `.local/regression-20261019-132109/rollback.ps1`, which verifies hashes; it was not executed here. Never use git reset/clean to reconstruct this dirty baseline.

Exactly one recommended next activity: **owner ratification of this consolidated simulation-only SaaS implementation plan and its unresolved identity/deployment contracts**.

### Official design references checked during this review

PostgreSQL documents SKIP LOCKED for competing queue consumers; it provides an inconsistent view unsuitable for general reporting, so use it only for claim transactions, not audience/report reads. See [PostgreSQL SELECT locking clause](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE).

The embedding/SSO proposal must be refined against current redirect, token replay and audience protections in [RFC 9700: OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html). These references support design review; they do not establish compatibility of an unselected library or certify the existing application.

## 9. Preservation evidence and exact Git status

The following inventories are measured from this review. SHA-256 and byte sizes match the saved IPX and Smart-control manifests; the IPX directory contains exactly 12 files. Git staging is empty, and no tracked `.local` or `.env.local` file was found. Thus no credential or private local file has entered staging; this is not a claim that a full repository secret audit was performed. No private configuration contents were copied into this report.

| Preserved file | Bytes | SHA-256 | Result |
|---|---:|---|---|
| `IPX/IPX-BCS/Assets/app.js` | 85647 | `932312d56892d8a2e744d9d9e71c3dacaadb0bc71103b65c634c9599a698c94f` | PASS |
| `IPX/IPX-BCS/Assets/favicon.svg` | 268 | `aa0e1760d24d228dc250b0aff5b1abf7968a7dd2536fd452bd85c70a7e902da9` | PASS |
| `IPX/IPX-BCS/Assets/styles.css` | 24771 | `46bc7f263f6178d6ede21810314f2e6deb9f6ef32b47c741df064b43aa2dfc0a` | PASS |
| `IPX/IPX-BCS/communication.html` | 565 | `d010d574bc54831e482b41dac2eac075e674bcc81172a41e75581daab3f2c5df` | PASS |
| `IPX/IPX-BCS/configuration.html` | 565 | `6a63b4d2ed5d7d7ed75dd98d46408d6b11c533ec8a415fee67e11491cb3e08de` | PASS |
| `IPX/IPX-BCS/dashboard.html` | 557 | `acd8ee6788faf3ec7c9fb7b271b68892aac9b4b72de092f6c12f4b6d468c26ca` | PASS |
| `IPX/IPX-BCS/index.html` | 557 | `acd8ee6788faf3ec7c9fb7b271b68892aac9b4b72de092f6c12f4b6d468c26ca` | PASS |
| `IPX/IPX-BCS/PARTNER_FEEDBACK.txt` | 1033 | `a8f8302463f2a639a568d7d81f707c066c73bd82a9b05207928dd831d0ec68b1` | PASS |
| `IPX/IPX-BCS/READ_ME_FIRST.txt` | 4466 | `d36b8733bf7804c9de2d4447cc75b487775575a79d3a393a4f3b67e964a4d8fa` | PASS |
| `IPX/IPX-BCS/reports.html` | 553 | `086aeca908d0f5d5417c54a9996d1a84cbb44660b8198eca59c85554ad9247bf` | PASS |
| `IPX/IPX-BCS/scheduling.html` | 559 | `5265fa871413b998eb5f3f64abc76954d4e05dfcbc065bf7d95fa69e6531fb79` | PASS |
| `IPX/Universal_Notify_Partner_UI_Review_V1.zip` | 38269 | `0c60b951ea59161cf50fa84a7d9f379dbeaab7a60ff9e771f04ff40a884e7147` | PASS |
| `docs/reference/smart-controls/SmartSelect(1).tsx` | 5711 | `4e60508cfb3cd137de3dd0165d5798503770625c601226b19cbeeda2473ccd45` | PASS |
| `docs/reference/smart-controls/SmartMultiSelect(1).tsx` | 1550 | `49f43540edbc2535bf85183d0c12156422866b425c5a53bf6d640fdb8893d8bb` | PASS |
| `docs/reference/smart-controls/SmartSearchLookup(1).tsx` | 23770 | `257113927428e3d64b8b1429dfe8875ae3d6fa4e27b0fb70ceab9335544b567c` | PASS |

### Final status (git status --short --untracked-files=all)

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
 M docs/handover/WORK-STATUS.md
 M docs/implementation/MASTER-DYNAMIC-IMPLEMENTATION-STATUS.md
 M packages/ui/src/grid.tsx
 M packages/ui/src/icons.tsx
 M packages/ui/src/primitives.tsx
 M packages/ui/src/react.css
 M tests/authenticated-documents.test.ts
 M tests/email-editor.test.tsx
 M tests/fidelity.test.tsx
 M tests/recipient-database-ui.test.tsx
 M tests/recipient-server.test.ts
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
?? apps/web/src/server/supabase-auth.ts
?? apps/web/src/server/user-management.ts
?? apps/web/src/server/user-onboarding.ts
?? database/migrations/016_campaign_workspace.sql
?? database/migrations/017_configuration_workspace.sql
?? database/migrations/018_contact_api.sql
?? database/migrations/019_contact_taxonomy.sql
?? database/migrations/020_user_onboarding_scoped.sql
?? database/migrations/021_company_user_management.sql
?? docs/architecture/BCS-SAAS-IMPLEMENTATION-READINESS.md
?? docs/email/BCS_SUPABASE_RECOVERY_TEMPLATE.html
?? docs/implementation/BCS_ADMIN_MENU_RIGHTS_UI_PATCH.md
?? docs/implementation/BCS_AUTH_INVITATION_ACTIVATION.md
?? docs/implementation/BCS_UI_CLEANUP_INVITATION_READINESS.md
?? docs/implementation/BCS_USER_MANAGEMENT_ALL_IN_ONE.md
?? docs/implementation/REGRESSION-STABILIZATION-2026-10-19.md
?? docs/implementation/SAAS-CONTACT-API.md
?? docs/implementation/SUPABASE-AUTH-LOGIN-CORRECTION.md
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
?? tests/supabase-auth.test.ts
?? tests/supabase-session-live.test.ts
?? tests/user-management-readiness.test.ts
?? tests/user-management.test.ts
?? tests/user-recovery-activation.test.ts
```

All 234 pre-existing tracked/nonignored untracked files in the acceptance intake inventory retain their SHA-256 hashes. Only this report was created by this acceptance review. Existing ignored backup/log evidence was read, not modified. No application tests, migrations, services, staging or commits were run in this review.
