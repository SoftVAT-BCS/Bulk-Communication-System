# Consolidated dynamic implementation â€” partial result, 17 October 2026

The master authorization is **not fully completed**. This run establishes authenticated local sessions and PostgreSQL template/draft persistence on top of the existing recipient reader. It also adds current dashboard aggregates and a bounded authorized CSV export. It does not turn the remaining previews into a complete SaaS application. The verified baseline is preserved in local partial checkpoint e68340f. The continuation below adds scheduling, reports and queue controls; full master acceptance remains unmet.

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

`011_authenticated_email_workspace.sql` and `012_draft_portal_workspace_access.sql` were executed transactionally against the authorized bcs-dev project. Migration 013 subsequently added scoped dashboard SELECT policies and column-restricted provider/recipient/suppression access. Migrations 001â€“010 were not rerun or edited.

Added `bcs.local_credentials`, `bcs.application_sessions`, their RLS policies and indexes, restricted backend login role, and fixed-search-path security-definer `bcs.session_allows`. Added backend-specific policies/grants on existing auth metadata, templates, revisions, drafts and audit tables. At that checkpoint the catalog contained 59 FORCE-RLS tables and 13 migration records; migrations 014–015 below are subsequent additive changes. Migration 012 permits content preparation in a draft portal; paused/retired portals remain excluded. No portal was activated and no provider was connected.

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
| Scheduling / Class Schedule | YES | YES (create/edit revisions; no delete by design) | YES | YES for tested API/role checks; full matrix NO | First 200 events; pagination, outer-tab unsaved guard and complete browser form acceptance remain |
| Scheduling / Reschedule & Cancellation | YES | YES (revision/reschedule/cancel) | YES | YES for tested API/role checks; full matrix NO | Browser mutation acceptance and campaign queue bridge remain; queued notifications reject edits |
| Scheduling / Email Queue | YES | YES for existing safe jobs | YES | YES for tested API/role checks; full matrix NO | Campaign queue preparation, priority editing and worker lifecycle remain; sending disabled |
| Reports / Overview | YES | N/A (read) | YES (aggregate reads) | YES for owner scope; full matrix NO | Reuses dashboard 7/30/90-day trends; custom date/portal filters and full requested metric coverage remain |
| Reports / Delivery History | YES | N/A (read) | YES (query/export) | YES for tested API/role checks; full matrix NO | Existing message query, details, attempts/events and CSV implemented; nonempty provider event browser acceptance remains |
| Reports / Bounces & Unsubscribes | YES | YES (manual suppression/release only) | YES | YES for tested API/role checks; full matrix NO | Event ingestion, dedicated reason filter and full operator/browser negative matrix remain |
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
- No emails, AWS calls, public deployment or push. Baseline verification preceded the authorized local checkpoint e68340f.

## Remaining risks and next activity

This is a local foundation, not production-ready SaaS. Account provisioning/recovery, multi-portal selection, scalable login throttling, operator browser permission presentation, session administration and the remaining module contracts need implementation and negative tests. API document listing currently requires templates.view and returns at most 100 templates; draft-only permission workflows need separate endpoint/UI refinement. All browser modes and database outage flows have not been exercised. No owner acceptance is implied.

Next activity: complete the authenticated recipient-selection-to-campaign contract and durable dry-run scheduling/queue, then complete dashboard scope selection and connect the remaining report and configuration tabs. The existing master authorization already covers routine implementation; this report is not a new approval gate.

## Dashboard and export continuation

`GET /api/bcs/app/dashboard?days=7|30|90` requires dashboard.view and reads only the authenticated scope. No sample fallback. Company-wide suppressions/provider metadata require company-wide permission; provider credential references are not granted or returned. Delivery totals require signature-verified provider events and count distinct messages. UTC trend data is returned; an empty dataset explicitly says no delivery data yet.

`GET /api/bcs/app/recipients/export` requires recipients.export, matches the authenticated demo scope and uses the original restricted reader in a REPEATABLE READ, READ ONLY transaction. It reuses validated filters/sorts, neutralizes spreadsheet formulas and exports at most 1,000 rows; larger results are rejected explicitly. It does not grant reader write access or fetch all contacts into browser memory to simulate selection. CSV export is now wired to the existing grid button in authenticated mode. Larger asynchronous exports and persisted export audit/jobs remain unfinished.

## Changed-file groups and preservation

New server modules: app-service, documents/document-safety, recipient-access/export, dashboard; corresponding app API routes. New client modules: session-gate, database-email-store, database-dashboard and recipient-csv. Existing workspace/pages, communication/export button and email persistence callbacks connect these services. Shared email-html supports the server sanitizer; email-modal and rich-email-editor only receive storage-neutral label changes. No layout/CSS, grid/select or original IPX rewrite. Existing jsdom version is declared as a runtime dependency; no framework upgrade. Safe .env.example updated; private .env.local remains ignored. Added migrations 011â€“013, focused tests, this report and WORK-STATUS update.

The baseline was subsequently committed locally as e68340f, explicitly labelled partial; no completion claim or push. Original unrelated Activities.txt, baseline script, CSV validator and pre-existing next-env changes are preserved.

Final suite note: the first unconstrained 106-test run had one existing editor workflow exceed its original 5-second timeout (105 passed). With the development server stopped and two workers, all 106 passed without changing assertions or timeouts. Lint passed after correcting dashboard row keys. The 28 original IPX/reference files in the preserved baseline matched exactly; known local credential values were absent from tracked/unignored sources and the generated browser JavaScript examined. No staged changes.

Final local startup verified: all five page routes returned HTTP 200; hidden development process remains running on 127.0.0.1:3000. A stale Prachaara offline page appeared in the existing browser tab during restart; navigating directly to /communication restored BCS. No unrelated service-worker/site-storage changes were made. Original next-env bytes restored after runtime startup.


## Final consolidated continuation — tested partial checkpoint

The owner-requested baseline checkpoint was created first: **e68340f** (`feat: checkpoint partial authenticated database workspace and dashboard`). The current continuation is also partial, not a final application-completion commit. Its commit identifier is recorded by Git and in the delivery message. This section supersedes earlier verification/status statements above.

### Newly implemented and applied

- Migration **014_authenticated_scheduling.sql**: scoped backend SELECT/INSERT on immutable event revisions and draft notification rules, scoped notification state updates, scheduling lookups and audit policies. Existing RLS/default-deny and reader protections retained.
- Migration **015_reports_and_queue_controls.sql**: additive dispatch pause flag; scoped report/queue reads, limited queue/message state updates, company-authorized manual suppression operations and audit policies. No worker or sender enabled. A future worker MUST honor `is_paused` before claiming jobs.
- Both migrations applied transactionally to dedicated bcs-dev. Migrations 001–013 were not rerun or changed. No new tables created; 59 FORCE-RLS tables and 15 migration records. Runtime remains restricted `bcs_app_backend`, with verified TLS; administrator access limited to authorized provisioning and exact synthetic fixture cleanup.
- Scheduling API/UI: authenticated event creation, group/subgroup/template validation, timezone conversion, date validation, immutable revisions, rescheduling, cancellation/reasons, history and reminder replacement. Per-event advisory lock plus optimistic revision rejects stale edits. Notification rules remain draft; persisted notifications do not imply queued campaign messages or sent mail. External-source events are read-only.
- Reports/queue API/UI: paginated/searchable/sortable records, UTC date/status filters, details, attempts/provider events, bounded authorized CSV export with formula protection. Existing shared EnterpriseGrid now has an optional non-selection report mode; default recipient selection behavior preserved.
- Queue pause/resume/cancel and eligible dead-letter retry persist transactionally. Leased/submitted/unknown/completed work cannot be modified by these actions. Attempt counts are retained. Terminal cancelled status takes precedence over the pause flag.
- Manual suppression requires company-wide suppression permission and a recipient in the session portal. Release only affects manual suppression, never bounce/complaint/unsubscribe records. Audit records retain the reason.
- Browser inspection found and corrected a timezone alias display mismatch (Asia/Kolkata versus the platform's supported-zone alias). Authenticated scheduling/report headers now accurately identify database-backed records.

### Executed verification for this continuation

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS; informational suggestions only, no errors/warnings.
- `$env:BCS_LIVE_TESTS='1'; npm.cmd test -- --maxWorkers=2`: **124/124 PASS**, 15 files. Retains the previous 106 tests, including 11 live database reader tests, and adds 18 timezone/filter/report-grid assertions. Original assertions/timeouts unchanged.
- `npm.cmd run build`: PASS, including the three new application API routes. Successful build does not make the development-only runtime deployable.
- Live scheduling HTTP/PostgreSQL probe: **18 assertions PASS**, including create/reload, timezone conversion, invalid range, reschedule, stale revision conflict, cancellation, history and superseded/cancelled reminder counts.
- Live report/queue HTTP/PostgreSQL probe: **22 assertions PASS**, including three list endpoints, queue pause/reload/resume, retry eligibility, dead-letter retry, cancellation/reload, manual suppression/release, CSV and forged scope parameter rejection. An initial isolated test-fixture SQL statement failed with 42P08 (UUID/text parameter inference); explicit casts repaired the fixture. The subsequent full probe passed; no application error was concealed.
- Restricted backend probe: **12 assertions PASS**, including nonprivileged role, no-session denial on templates/events/notifications/jobs/suppressions, wrong company/portal authorization, rejected out-of-scope template insert, and no recipient UPDATE/template DELETE.
- All probe-created events, rules, notifications, documents, jobs, campaign rows, suppression and identified audit records were cleaned up using exact generated IDs. Existing recipient records were not changed.
- Preservation: **28/28 original IPX/reference hashes matched**. Known saved credential values absent from tracked/unignored source files and the **10 built browser JavaScript chunks** scanned. This is a targeted leak check, not a comprehensive security audit.
- Browser: authenticated Class Schedule rendered, existing database groups appeared, Asia/Kolkata displayed correctly, and Reschedule & Cancellation loaded its empty state. Remaining browser results are recorded in the delivery addendum below. HTTP/database mutation probes are not claimed as complete browser form acceptance.

### Remaining implementation and acceptance

1. All four Configuration tabs still show clearly labelled synthetic previews: company/portal/connector CRUD, mapping versions/validation/approval/sample reads, SES metadata/policies and user/role/scope administration remain unimplemented. No missing credential is being used as an excuse for these code gaps.
2. Recipient selection snapshots, expiring all-matching contracts, deduplication/consent/suppression revalidation, campaign creation/edit/review/approval/schedule/cancel/history, approved attachment references and queue preparation/dry-run remain unimplemented.
3. SaaS client contact API, idempotent writes/import batches/errors, usage accounting and rate limiting remain unimplemented.
4. Full report metric/date/portal selector coverage, template history/search/assets/import, draft registry and multi-portal authenticated switching remain incomplete.
5. Scheduling needs server pagination beyond 200 events, create idempotency, unsaved outer-tab navigation handling and full browser mutation tests. Custom template required before scheduling; test templates were deliberately cleaned up.
6. Complete operator/tenant negative tests for every new write action, database outage flows, mobile/accessibility matrix and full five-page/13-tab CRUD acceptance remain unexecuted. Do not label these modules owner-accepted or production-ready.

Next implementation activity: connect the existing recipient selection and saved drafts to transactional campaign snapshots, review and non-sending queue preparation. The existing owner authorization covers this; no new routine approval gate is introduced.


### Browser and runtime delivery addendum

All six Scheduling/Reports tabs were opened in the authenticated browser. Class Schedule and Reschedule loaded empty event lists; the group selector returned four database groups. Email Queue and Delivery History returned explicit no-records states after loading. Reports Overview showed 240 recipients (213 Active, 12 Inactive, 7 Bounced, 8 Unsubscribed), 15 suppressions and zero delivery activity. Bounces & Unsubscribes loaded 15 stored rows. Screenshot: `.local/resume-suppression-browser.png`. Full browser create/edit/cancel/queue-action acceptance was not executed; those mutations were tested through actual HTTP/database probes.

After final server restart, dashboard (9 assertions) and recipient CSV (6 assertions, 240 total/213 Active) regression probes passed again. Catalog verification confirmed 59 FORCE-RLS tables, 15 migrations and 240 recipients. Local hidden development server remains at http://127.0.0.1:3000/ (launcher PID 27400 at handover). Pre-existing next-env bytes restored; unrelated files remain untracked/unstaged.

Continuation changed-file groups: scheduling/activity/report-overview API routes; scheduling/activity validators and server repositories; DatabaseScheduling/DatabaseActivity UI; workspace tab routing; report-mode dashboard reuse; optional shared grid non-selection mode; migrations 014–015; three focused test files; this report and WORK-STATUS. No dependencies, IPX files, secrets or other projects changed.
