# BCS current work status

## Step 3B-2 offline isolation refinement — 17 October 2026

Verified main/44eeb3f6b983da76279ba87dd468202e8feba5e3 and the six Step 3B-1 working files. Removed only the proposed global demo taxonomy constraint, replacing it with required nonblank group/category checks. The fixture validator remains unchanged. [Step 3B-2 review](../architecture/STEP-3B-2-ISOLATION-REVIEW.md) documents role preflights, future Step 3B-3 access/import gates and synthetic optional-field test cases.

Preferred placement is a separate BCS development database/project, pending owner approval. SoftVAT production access remains blocked. No SQL execution, role creation, imports or live connections. Stop for owner review; no further development is authorized.

## Step 3B-1 offline recipient foundation — 16 October 2026

Verified main at 44eeb3f6b983da76279ba87dd468202e8feba5e3: the prior UI checkpoint commit is complete. The older conditional-commit text below is historical.

Prepared a proposed bcs_demo.recipients migration, exact 17-column mapping, aggregate CSV validation and backend-only isolation/import plan. See [recipient foundation](../architecture/RECIPIENT-DATA-FOUNDATION.md). Source has 240 records and is tab-delimited, CP1252-compatible. No SQL execution, database connection, live import or UI modification. Decisions and deployment remain pending owner review.

## Step 3A-V3 owner-approved UI checkpoint — 16 October 2026

The owner visually approved the displayed Step 3A-V2 synthetic Compose/Templates UI
on 2026-10-16: expanded Compose, Create/Edit Template Designer, shared HTML toolbar,
template operations and live preview. Completed implementation includes the five-page
React shell, synthetic recipients, shared selects/grid and browser-local drafts/templates.
V3 reran typecheck, lint, 33 tests in 5 files and production build successfully.
Lint retains 11 informational suggestions, with no errors or warnings. Working-tree
git diff --check passes. A local checkpoint commit remains conditional on exact staged
inventory, staged whitespace/content review and repeated preservation checks.

Owner visual approval does not certify a supported full browser matrix, 200% zoom,
full accessibility or email-client rendering; those acceptance checks remain OPEN.
Supabase recipient tables, source adapters/APIs, backend authorization, SES/real sends
and production deployment are not implemented. No live database or AWS work authorized.

Next proposed activity: a separately authorized database architecture/migration review,
with isolation from the existing SoftVAT CRM PRODUCTION database. No tables, imports
or live connections are approved by this checkpoint. Stop after the local checkpoint.
Earlier sections below retain historical results and their then-current approval status.

## Step 3A-V2 rich email designer — 16 October 2026

IMPLEMENTED / LOCALLY TESTED / PENDING OWNER VISUAL APPROVAL. One shared local Tiptap
editor powers the large Create/Edit Template designer and expanded Compose workspace.
Templates/drafts save only in versioned browser-local synthetic-demo storage. Template
application, rich formatting, preview, independent drafts and unsaved guards work.
Recipient selection, Configuration and five-page navigation remain intact. No sends,
Supabase/AWS/SES access. Reviewed strict installation added Tiptap 3.32.0 and DOMPurify
3.4.17; existing runtime/framework/typecheck/lint pins remain unchanged.

Typecheck, lint (11 existing infos, no errors/warnings), 33 tests in 5 files, build,
resolved dependency graph and production audit pass (zero vulnerabilities). Actual
browser checks cover light/dark at 1440, 1280, 768 and 390px: no React page overflow,
reachable designer footer, save/reload, formatting, safe paste, focus and selection.
200% browser zoom and owner visual approval remain pending.

12/12 IPX and 3/3 archival TSX hashes/lengths pass. Downloads/CSV, helper/scripts,
root rules, historical reports, provider and prior tests preserved. main/HEAD unchanged
at 2a78293ae7db68fbee62e4fbc0689949d0ba5782; empty index, no remotes. One modified
tracked status file and 53 untracked files (prior 41 plus 12 V2). No stage/commit/push.
See [V2 implementation, exact changes and verification](../implementation/STEP-3A-V2-RICH-EMAIL-EDITOR.md).

Next activity: owner visual/accessibility acceptance at http://127.0.0.1:3000/communication,
including manual 200% browser zoom. Stop; earlier sections remain historical evidence.

## Step 3A-V1 fidelity recovery — 16 October 2026

Owner rejected the original Step 3A visuals. The corrected UI is implemented and locally
tested but NOT YET OWNER ACCEPTED. Communication and all four Configuration tab
presentations now follow the original IPX; shared multi-select option spacing, popup
containment/focus, grid styling and mobile container constraints were corrected.
The deterministic 240 IPX-equivalent fictional records retain 213 Active-only eligibility.
Configuration switches/forms are memory-only previews, with no connections or grants.

Typecheck and build pass; Biome passes with 11 informational suggestions and no
errors/warnings; 14 tests in 3 files pass. Actual in-app browser measurements pass
80 route/tab/width combinations (320 through 1440); no document/main overflow or
clipped Clear/Done. Dark popup, resize, keyboard cycling, dismissal/focus return,
mobile drawer and recipient operations checked. Required 200% browser zoom remains
UNVERIFIED because the available browser tool could not apply it. No claim of supported
native Windows 10 Playwright or full accessibility/owner acceptance.

12/12 IPX and 3/3 archival TSX checksums pass; Downloads/CSV, root rules, historical
reports, manifests/lockfile and Step1G helper are unchanged. No installation, staging,
commit, push, database, AWS or SES activity. Git remains main at
2a78293ae7db68fbee62e4fbc0689949d0ba5782, empty index, no remotes; one tracked status
edit and 41 untracked files (including prior Step3A work and the preserved helper).
See [V1 review, exact inventory and evidence](../implementation/STEP-3A-V1-VISUAL-FIDELITY-REVIEW.md).

Next activity: owner visual/accessibility review of the corrected candidate at
http://127.0.0.1:3000/communication and /configuration, including 200% zoom.
Stop here; no next increment is authorized. Earlier sections below are historical
checkpoints; their test counts and pending visual statements are superseded by V1.

## Step 3A approved resume - 16 October 2026 (historical)

Owner approved Biome 2.5.15 replacing the unsupported ESLint 9 toolchain; TypeScript
5.9.3 retained. Strict project-local installation completed with lifecycle scripts
disabled. Lockfile/peer checks pass, npm audit reports zero vulnerabilities. Five React
routes and newly authored shared controls now exist. Recipient Selection uses 240
fictional records, with 213 Active/eligible; selection/filter/grid interactions work.
Other tabs are clearly labeled inactive visual previews. No real persistence or sends.

Typecheck, Biome lint, 9 tests in 2 files and production build pass. All five routes
rendered at http://127.0.0.1:3000 in the in-app browser; listener is loopback only.
Exact IPX screenshot parity, full responsive/200% zoom/accessibility acceptance remain
pending; browser policy blocked opening the original file URL and no workaround was used.
See [Step 3A implementation and verification report](../implementation/STEP-3A-UI-FOUNDATION.md)
for security sources, component contracts, changed files and explicit limitations.

All 12 IPX and 3 archived Smart TSX hashes still match. Downloads/CSV/historical reports,
root preservation rules and the Step1G helper are unchanged. main remains at
2a78293ae7db68fbee62e4fbc0689949d0ba5782; no staged files, remotes, commit or push.
No Supabase/AWS/SES/API/worker activity. Historical Smart reuse rights remain unresolved;
their source was not adapted into production. Next activity: owner visual/accessibility
acceptance review of Step 3A against the IPX; stop before any next increment.

**Everything below is the historical Step 2C checkpoint. Its pending-install/scaffold
and next-Step-2D statements describe that older checkpoint, not current Step 3A status.**

Updated checkpoint: 16 October 2026, Phase 1 Step 2C conditional ratification and safe local checkpoint.
The original Step 1C checkpoint is retained in Git and immutable setup reports.

## Workspace

- Canonical: `E:\Bulk-Communicatio-System`.
- Approved reference: `IPX/IPX-BCS/`; preserve its HTML, Assets and support files.
- Confirmed top-level folders: apps, database, docs, IPX, packages, scripts, tests.
- Observed Git `2.54.0.windows.1`, Node `v24.16.0`, npm.cmd `11.13.0`; these are not approved stack versions.
- Verified Step 2C starting baseline: `main`, HEAD `e50dfeadf8cd468cc9cf6a8adb124f8d728a59b5`, one commit and 34 tracked files.
- Baseline message: `chore(bcs): preserve approved IPX and project foundation`.
- Step 2A and Step 2B starting state: no tracked/staged changes; only untracked `scripts/BCS_Phase1_Step1G_FirstBaseline.cmd`. Preserve without execution/staging.
- Observed Windows 10 Pro, build 19045. Current Playwright does not list native Windows 10 support; see proposal for a supported testing route.

## Completed / confirmed

Step 1A: owner supplied a read-only CMD transcript showing the correct path and IPX
entry files, Assets directory, readme and partner feedback form.

Step 1B: owner supplied creation output for apps/web, apps/api, apps/worker;
packages/ui, contracts, config, integrations, notification-core, email-providers;
database/migrations, seeds; docs/architecture, adr, standards, requirements, handover,
reference; scripts; tests/unit, integration, e2e, security, visual. Seven top-level
folders are visible in Explorer. No error lines are shown in the supplied creation log.

Owner-approved product/UI direction: preserve the IPX, five-page tabs, world-class
searchable selections and grids, and shared reusable components. Product is still an
interactive offline prototype plus a production foundation, not a live communication system.

## Current activity

Step 1C installation and Step 1E repository rules have SUCCESS reports beside this file.
The first baseline commit is verified above; do not repeat setup because the older
reports predate that commit. Their original owner-acceptance fields remain historical.
Step 2A completed read-only intake and tool/source review; no application tests ran.

**Step 2B - historical reference import, source review and proposed architecture.**
Imported five exact archive entries without overwrite; all five match archive bytes,
and all three TSX sources match SOURCE-MANIFEST sizes/SHA-256. All 12 IPX files match
the original inventory. Historical reports, scripts and protection rules are unchanged.
See [Smart controls review](../reference/SMART-CONTROLS-REVIEW.md) and
[architecture proposal](../architecture/PHASE-1-ARCHITECTURE-PROPOSAL.md).
Step 2B left seven modified documents and seven new files for review.
Step 2C records OWNER-APPROVED HIGH-LEVEL DIRECTION and CONDITIONAL IMPLEMENTATION
CHOICES; exact versions, compatibility and source reuse rights remain unresolved.
The owner authorizes one local 16-path checkpoint after all pre/post-staging gates pass.
The commit containing this checkpoint is identifiable by message:
`docs(bcs): ratify architecture direction and preserve UI references`.
No remote/push or application development is authorized; final commit verification is
reported separately, without amending this checkpoint to insert its own hash.

## Not yet developed / not authorized in this activity

No framework scaffold, package installation, API, real database/connector, authentication,
production React controls, queue worker, SES integration, production reporting, deployment
or application test suite. No Git initialization, staging, commit or push in Step 1C.
No authority to access another project's database, cloud resource or repository.

## Open items

Partner feedback remains a pending review input. The three historical Smart TSX files
were absent during Step 2A and are now available under docs/reference/smart-controls/.
They are not production-ready: FormContext/styles, reuse rights and compatibility
remain unresolved. Step 2C applies Git/editor preservation only to archived smart-controls/*.tsx;
manifest and raw-versus-staged blob checks gate the local commit. Independent backup
verification remains pending. Supported browser-test environment and provisional version validation
are detailed in the proposal; no browser/accessibility/compatibility tests have run.

The archived handover names the original ZIP folder; the canonical local extraction
folder is now IPX/IPX-BCS. Keep this intentional path update without renaming user files.

## Next activity (proposed, not automatically authorized)

Request fresh authorization for Step 2D readiness review: exact supported versions/platform,
Smart-source reuse rights/dependencies and supported browser-test route. Resolve these
before requesting separate scaffold authorization. No development starts automatically.

## Update discipline

During an approved task, update this checkpoint with date, scope, changed files, actual
checks/results, owner acceptance, blockers and next activity. Preserve detailed older
evidence in Git/history or focused handovers; keep this page concise. Never log secrets,
private recipients or invented test results.

## Step 3C-1 — local read foundation, 17 October 2026

Implemented optional server-side recipient/options/detail endpoints against private bcs, parameterized scoped repository, explicit database/synthetic modes and server-only development identity. Preserved composer, drafts, approved controls and original SQL/seed contents. Added pinned pg8.23.1, server-only0.0.1 and @types/pg8.23.1 via existing npm workspaces.

Actual verification: typecheck PASS; Biome lint PASS (14 informational template-literal suggestions, no errors/warnings); Vitest65/65 across7files PASS, including all prior33; final production build PASS with3dynamic read API routes; git diff --check PASS (line-ending notices only); npm install audit and production audit reported0vulnerabilities. Saved28original files unchanged; all12IPX baseline hashes and3archival TSX hashes preserved. Checked browser chunks contain no server environment/role markers.

Actual browser: synthetic240/213 counts, source-ID search and unconfigured DB loading/unavailable states; no silent fixture fallback. Actual HTTP503 DATABASE_NOT_CONFIGURED, no DB connection attempted. Next adds a loopback forwarded address; local guard accepts that value and rejects external addresses. Isolated tests cover scoped transaction lifecycle, role gate, filter validation, safe errors, paging offsets, stored cascade and stale/cancelled requests. These do NOT prove SQL execution or live RLS. Full200%zoom/accessibility and visual acceptance remain unverified.

Database connectivity: NO. Owner role/credentials/CA and reviewed synthetic UUID configuration are not provisioned here. Pending010 proposal and read-only verification SQL are prepared only. No migrations001–009 replayed, no010execution, no SQL data writes, no source integrations, no emails/AWS, no staging/commit/push/deploy. Branch main/HEAD44eeb3f unchanged. Existing owner changes remain uncommitted; next-env.d.ts may be regenerated by Next dev/build.

Local review URL: http://127.0.0.1:3000/communication (Synthetic UI Demo; owner switches ignored server config only after approval). Implementation details, file map, security limits, exact Windows CMD setup and3C-2through3C-6roadmap: [Step3C-1](../implementation/STEP-3C1-DYNAMIC-DATA-FOUNDATION.md).

Exactly one next activity: owner review/approve the pending010 restricted-role proposal and securely provision/verify the bcs-dev read identity, then enable local database mode for live acceptance. STOP after3C-1; further increments are not started.

## Step 3C-2 — restricted database access review, 17 October 2026

Prepared revised pending010: LOGIN without embedded credentials, CONNECT on postgres, six-table SELECT and fixed synthetic company/portal RLS; fail-closed effective-privilege guards include inherited PUBLIC DDL/write/function paths. Backend matches these gates and rejects wrong database/URI overrides. No privileges granted or connection attempted. apps/web/.env.local absent, ignored and untracked; no secret file created. Previous exposed credential never used.

Actual checks: typecheck, lint and production build PASS; 75 tests across 8 files PASS (65 retained plus 10 configuration tests). SQL and live RLS/TLS/DB counts NOT tested against PostgreSQL. Full report, permission matrix, private setup and negative test plan: [Step 3C-2](../implementation/STEP-3C2-RESTRICTED-DATABASE-ACCESS.md). UI/editor and original migrations/seeds preserved; no stage/commit/push or external services.

Exactly one next action: owner approves the revised010 access package and its stop gates before any privilege grant. Stop here; restricted identity not ready.

## Step 3C-2 full authorization — access handoff

Owner approval for verified provisioning and a conditional local checkpoint is now received; do not ask for that approval again. The available browser has no Supabase session, and project/process inspection found no privately configured admin connection or runtime .env.local. No passwords printed/read from conversation, no remote connection, no provisioning or credential generation, no commit. Safe ignored one-time admin template prepared at .local/bcs-admin.env.example; it is never an application configuration file. See the updated Step3C-2 report for exact private handoff. Resume already-authorized work after owner configures private access; retain all security gates.

Continuation checks: typecheck PASS; lint PASS (14 informational suggestions); production build PASS; whitespace PASS; IPX baseline and archival/UI/source/migration/seed integrity PASS. First test run concurrent with build:74 passed,1 existing email-editor workflow timed out at5seconds. Sequential rerun with no test/code/timeout changes:75/75 passed across8files in12.50seconds. The timeout is recorded rather than hidden; no full live acceptance claim follows from this rerun. Database integration, live TLS/counts/isolation and dynamic browser checks remain NOT RUN because private access is unavailable. No staging or local commit; the owner's all-gates-pass condition is unmet.

## Step 3C-2 — live private connection verified, security gate reached

Private owner configuration is now available. Verified TLSv1.3 and database postgres via the target-matched ap-south-1 pooler; administrative READ ONLY queries confirm57tables,57FORCE RLS,9migrations,0policies,240recipients (213/12/7/8),4groups,12subgroups,240memberships; one company/portal. Reader absent. Migration010 not executed: inherited PUBLIC TEMPORARY plus two extension-view SELECT grants and a public SECURITY DEFINER function EXECUTE grant conflict with strict guards. No broader revocations or guard weakening performed. No reader credential/runtime .env.local or success commit created. See [live preflight result](../implementation/STEP-3C2-LIVE-PREFLIGHT-RESULT.md). Next: owner/DBA impact review and separately approved narrow inherited-privilege remediation; existing provisioning authorization remains valid.

Live-preflight continuation local checks:75/75tests, typecheck, lint, build and whitespace PASS. All12IPX and80turn-start protected file hashes preserved. Live restricted-reader/browser tests NOT RUN; security gate prevents provisioning. No commit. Full evidence and changed files in STEP-3C2-LIVE-PREFLIGHT-RESULT.md.

## Step 3C-2B completed — 17 October 2026

The owner-authorized targeted PUBLIC remediation and migration010 are committed in bcs-dev. Restricted reader/TLS, all six-table scope boundaries, 240 live recipients and 40 backend API checks pass. Local Recipient Selection runs at http://127.0.0.1:3000/communication. Standard tests75 PASS; separately opted-in real-reader tests11 PASS; typecheck/lint/build PASS. Approved UI/IPX/original SQL remain unchanged. No sending or public deployment. See [complete execution evidence and limitations](../implementation/STEP-3C2B-DYNAMIC-INTEGRATION-RESULT.md). Earlier access/provisioning blockers are resolved; next activity is owner review of this local increment.
