# Consolidated dynamic implementation — partial result, 17 October 2026

The master authorization is **not fully completed**. This run establishes authenticated local sessions and PostgreSQL template/draft persistence on top of the existing recipient reader. It also adds current dashboard aggregates and a bounded authorized CSV export. It does not turn the remaining previews into a complete SaaS application. Work is preserved without a completion commit because the full acceptance gates have not passed.

## Implemented boundary

- Server-only restricted `bcs_app_backend` pool, verified TLS and transaction-local session context. Existing `bcs_recipient_reader` retains six SELECT tables, twelve scoped policies, no memberships and no DDL.
- Local owner bootstrap, salted scrypt password verification, persisted failed-login lockout, hashed random session tokens, eight-hour expiry, HttpOnly/SameSite Strict cookies, logout revocation and same-origin write checks. HTTPS adds Secure; the authorized HTTP loopback development cookie cannot use Secure.
- Existing principal, role, permission and portal-scope tables drive API authorization. PostgreSQL `session_allows` resolves the valid session and checks company, portal and permission. No browser company/portal ID establishes authority.
- Owner credentials live only in ignored `.local/bcs-owner-bootstrap.env`. Runtime connection lives only in ignored `apps/web/.env.local`; do not copy either into reports or deployment packages.
- Templates: create/customize/copy/edit/archive, duplicate-name serialization, optimistic revisions, immutable revision snapshots, audit events and server-side HTML sanitization. Existing browser templates remain untouched. Built-in samples remain samples.
- Drafts: create/save/edit latest owned draft, persisted sender/reply-to/category/subject/HTML/plain text, optimistic conflicts and audit. New message creates a new draft identity. Multiple-draft registry/chooser is not implemented.
- Authenticated recipient APIs require `recipients.view` and match the existing fixed demo reader scope. Other portal scopes are denied instead of returning the demo portal's contacts.
- No silent browser-storage fallback when database access fails. Existing IPX, grid, selects and editor layout retained. Shared sanitizer accepts a server DOM; two editor labels were made storage-neutral.

## Database changes actually applied

`011_authenticated_email_workspace.sql` and `012_draft_portal_workspace_access.sql` were executed transactionally against the authorized bcs-dev project. Migration 013 subsequently added scoped dashboard SELECT policies and column-restricted provider/recipient/suppression access. Migrations 001–010 were not rerun or edited.

Added `bcs.local_credentials`, `bcs.application_sessions`, their RLS policies and indexes, restricted backend login role, and fixed-search-path security-definer `bcs.session_allows`. Added backend-specific policies/grants on existing auth metadata, templates, revisions, drafts and audit tables. Catalog now contains 59 FORCE-RLS tables and 13 migration records. Migration 012 permits content preparation in a draft portal; paused/retired portals remain excluded. No portal was activated and no provider was connected.

One local owner principal, role/permission assignments and portal scope were bootstrapped. Existing recipient data was preserved. Dedicated test documents were used for verification; no business records were overwritten.

| Backend resource | Runtime permissions | Enforcement |
|---|---|---|
| Credentials | SELECT; update failed count/lock expiry only | Backend-only auth metadata; never returned by API |
| Sessions | SELECT, INSERT; update revocation only | Backend-only auth metadata; hashed tokens |
| Principals/roles/permissions/scopes/company/portal metadata | SELECT | Private auth resolution; no browser metadata-list endpoint |
| Templates | SELECT, INSERT, UPDATE | Session scope plus templates.view/manage RLS |
| Revisions | SELECT, INSERT | Visible parent/template permission; no UPDATE/DELETE |
| Drafts | SELECT, INSERT, UPDATE | Session scope, compose.draft and owner principal |
| Audit events | INSERT, SELECT as granted by migration | Scoped policy; application logs document operations |
| Recipients | No backend UPDATE | Existing separate restricted reader only |

No SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, replication or role membership is used by application runtime. No hardcoded passwords. No Supabase Data API/service_role. Administrator credentials were confined to authorized provisioning and identified test cleanup.

## API and runtime

- `POST /api/bcs/app/session`: local login; `GET`: current account and permissions; `DELETE`: revoke/logout.
- `GET /api/bcs/app/documents`: first 100 active templates and latest owned draft.
- `POST /api/bcs/app/documents`: validated template/draft/archive operations. Permission checks, parameterized SQL, revisions and audit occur in a transaction.
- Existing `/api/bcs/v1/audience/options`, `/recipients`, `/recipients/[id]` now require an authenticated authorized scope when authenticated mode is enabled.
- Controlled error envelopes include correlation IDs and suppress raw PostgreSQL/credential details.
- Private settings: existing reader settings and CA path; `BCS_APPLICATION_MODE=authenticated`; `BCS_APP_DATABASE_URL` for the separate backend role. No NEXT_PUBLIC credential variables.
- Runtime deliberately remains local development only. A successful production build is not authorization or readiness for deployment.

Windows CMD startup (existing ignored configuration loads automatically):

```cmd
cd /d E:\Bulk-Communicatio-System
npm.cmd run dev
```

Open http://127.0.0.1:3000/communication. Privately inspect the initial owner credentials with:

```cmd
notepad E:\Bulk-Communicatio-System\.local\bcs-owner-bootstrap.env
```

Do not paste its contents into chat. No password prompt or privileged runtime account is needed.

## Required page/tab matrix

YES means the stated subset is implemented/tested; NO means the full requested tab gate is not achieved. Partial operation is explicitly described below. All unfinished features are implementation work, not falsely attributed to missing credentials.

| Page / tab | Database-backed | Full functional actions | Persistence verified | Full security acceptance | Remaining |
|---|---|---|---|---|---|
| Dashboard | YES | NO (full scope) | YES (read aggregates) | YES for tested scope; NO for full matrix | Live counts/statuses/campaigns/messages/verified events, reporting periods, providers/policies/activity implemented. Cross-portal/company chooser and nonempty trend visualization acceptance remain |
| Communication / Recipient Selection | YES (read) | NO | NO (selection) | YES for existing reader; NO for full scope | Expiring all-matching contract, persistent selection, compose transfer, consent/suppression eligibility |
| Communication / Compose & Send | YES (draft subset) | NO | YES (draft subset) | NO (full workflow) | Draft registry/duplicate UI, database recipient preview, identity/assets, campaign review/approval, schedule/queue |
| Communication / Templates | YES (custom templates) | NO | YES | NO (full workflow) | Revision history UI, search/filter, assets, browser-template import |
| Scheduling / Class Schedule | NO | NO | NO | NO | All event CRUD, audience/template rules, reminder persistence |
| Scheduling / Reschedule & Cancellation | NO | NO | NO | NO | Updates, cancellation, audit, reminder invalidation |
| Scheduling / Email Queue | NO | NO | NO | NO | Durable queue preparation, worker leases/idempotency, dry-run processing |
| Reports / Overview | NO | NO | NO | NO | Authorized database aggregates/date filters |
| Reports / Delivery History | NO | NO | NO | NO | Query/export actual provider-event history |
| Reports / Bounces & Unsubscribes | NO | NO | NO | NO | Suppression reporting/actions and actual event queries |
| Configuration / Portal & Database | NO | NO | NO | NO | Tenant/portal CRUD and connection configuration |
| Configuration / Table & Column Mapping | NO | NO | NO | NO | Mapping persistence, validation and import integration |
| Configuration / Amazon SES | NO | NO | NO | NO | Private provider setup, verified identity/quota reads; real sending requires separate authorization |
| Configuration / User Rights | NO (UI) | NO | NO (UI) | NO (full admin flow) | User/role/scope management; backend permission enforcement exists |

SaaS client API, authenticated import idempotency/rate limits, usage accounting, attachments/storage and sending-provider abstraction are also unfinished. Browser-local import approach: preserve existing storage, require an explicit user-selected import, sanitize/validate server-side and detect duplicates; no silent import/deletion is implemented.

## Actual verification

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with informational suggestions only, no errors/warnings.
- `BCS_LIVE_TESTS=1 npm.cmd test -- --maxWorkers=2`: **106 passed**, including all prior 75 standard tests, 11 real reader integration tests and 20 new authentication/document, dashboard-filter and CSV tests.
- `npm.cmd run build`: passed. A dynamic CA-file tracing warning was corrected with a Turbopack tracing exclusion and the build passed again without that warning.
- Actual HTTP/PostgreSQL document probe: **23 assertions passed** (login/cookie, anonymous/CSRF rejection, save/reload/edit, duplicates/stale versions, sanitization, archive, revision/audit persistence and logout). Exact probe-created records were cleaned up.
- Actual restricted backend probe: **8 assertions passed** (role flags, no-session RLS, authorized scope, wrong company/portal, rejected out-of-scope INSERT, no recipient UPDATE or template DELETE). Write rejection used a rolled-back savepoint.
- Browser: owner sign-in, 240-recipient live grid, template customization/save, reload persistence and transfer to Compose observed. Browser draft save and reload also confirmed, followed by the actual dashboard showing 240 total, 213 Active, 12 Inactive, 7 Bounced, 8 Unsubscribed and zero verified deliveries. The two identified browser test documents and their test audit/revision rows were cleaned up. Screenshots retained privately under .local/master-draft-browser.png and .local/master-live-dashboard.png. Narrow viewport checked; full responsive matrix untested.
- Eleven additional live isolated tenant/operator assertions passed: no foreign documents, no unauthorized writes or exports, and foreign template editing rejected; exact synthetic tenant fixtures cleaned up. Nine dashboard assertions and six CSV assertions passed. These probes do not establish complete cross-tenant operator lifecycle, all role permutations, session recovery, full responsive/accessibility acceptance or email-client rendering.
- Current reader catalog verified: original reader grants/policies/role guard unchanged, auto-RLS function/trigger preserved. Original non-reader roles retain their TEMP permissions; new backend intentionally lacks TEMP, so the historical check that assumed only one restricted role required excluding both dedicated roles.
- No emails, AWS calls, public deployment, Git staging, commit or push.

## Remaining risks and next activity

This is a local foundation, not production-ready SaaS. Account provisioning/recovery, multi-portal selection, scalable login throttling, operator browser permission presentation, session administration and the remaining module contracts need implementation and negative tests. API document listing currently requires templates.view and returns at most 100 templates; draft-only permission workflows need separate endpoint/UI refinement. All browser modes and database outage flows have not been exercised. No owner acceptance is implied.

Next activity: complete the authenticated recipient-selection-to-campaign contract and durable dry-run scheduling/queue, then complete dashboard scope selection and connect the remaining report and configuration tabs. The existing master authorization already covers routine implementation; this report is not a new approval gate.

## Dashboard and export continuation

`GET /api/bcs/app/dashboard?days=7|30|90` requires dashboard.view and reads only the authenticated scope. No sample fallback. Company-wide suppressions/provider metadata require company-wide permission; provider credential references are not granted or returned. Delivery totals require signature-verified provider events and count distinct messages. UTC trend data is returned; an empty dataset explicitly says no delivery data yet.

`GET /api/bcs/app/recipients/export` requires recipients.export, matches the authenticated demo scope and uses the original restricted reader in a REPEATABLE READ, READ ONLY transaction. It reuses validated filters/sorts, neutralizes spreadsheet formulas and exports at most 1,000 rows; larger results are rejected explicitly. It does not grant reader write access or fetch all contacts into browser memory to simulate selection. CSV export is now wired to the existing grid button in authenticated mode. Larger asynchronous exports and persisted export audit/jobs remain unfinished.

## Changed-file groups and preservation

New server modules: app-service, documents/document-safety, recipient-access/export, dashboard; corresponding app API routes. New client modules: session-gate, database-email-store, database-dashboard and recipient-csv. Existing workspace/pages, communication/export button and email persistence callbacks connect these services. Shared email-html supports the server sanitizer; email-modal and rich-email-editor only receive storage-neutral label changes. No layout/CSS, grid/select or original IPX rewrite. Existing jsdom version is declared as a runtime dependency; no framework upgrade. Safe .env.example updated; private .env.local remains ignored. Added migrations 011–013, focused tests, this report and WORK-STATUS update.

HEAD remains b975a4d7bb5825984755cfb1420766f04ffac3aa. No new local commit because complete master-task acceptance is still unmet. Original unrelated Activities.txt, baseline script, CSV validator and pre-existing next-env changes are preserved.

Final suite note: the first unconstrained 106-test run had one existing editor workflow exceed its original 5-second timeout (105 passed). With the development server stopped and two workers, all 106 passed without changing assertions or timeouts. Lint passed after correcting dashboard row keys. The 28 original IPX/reference files in the preserved baseline matched exactly; known local credential values were absent from tracked/unignored sources and the generated browser JavaScript examined. No staged changes.

Final local startup verified: all five page routes returned HTTP 200; hidden development process remains running on 127.0.0.1:3000. A stale Prachaara offline page appeared in the existing browser tab during restart; navigating directly to /communication restored BCS. No unrelated service-worker/site-storage changes were made. Original next-env bytes restored after runtime startup.
