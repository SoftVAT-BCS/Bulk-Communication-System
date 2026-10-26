# Regression stabilization — 19 October 2026

Workspace: `E:\Bulk-Communicatio-System`; branch main; HEAD unchanged at
`2c073ba7b3c11965703e92f52a21cd24b105065e`. Existing tracked and untracked work
was inventoried before editing. Changes below are relative to that intake, not HEAD.

## Findings and corrections

1. Administration workspace test mocked only a name. SessionGate now intentionally
   requires route permissions, so it correctly denied Dashboard. The mock now supplies
   dashboard.view and a valid home; no authentication or permission code was weakened.
2. Invitation test used old case-sensitive readiness text and an exact button name
   without the current arrow. Its directory request also lacked a response. Updated
   the contract-shaped mock, readiness assertion and accessible button query while
   retaining the unavailable/disabled expectation. BcsUserCreation is unchanged.
3. Template lifecycle test combined many per-character input events, full Workspace
   rendering and Tiptap operations in one five-second test. It renders synthetic mode,
   not the authenticated server-backed workflow: local storage remains intentional there.
   Isolated the real EmailWorkspace (including actual editor and local persistence hooks)
   from unrelated grid/sidebar rendering and used actual paste events for bulk text.
   Create/reload/edit/duplicate/preview/apply/delete assertions remain.
4. Saved-draft workflow had the same long UI-event/render overhead. It now uses the
   same isolated harness and paste input, retaining tab switch/reload, independent draft
   persistence and keep/discard confirmations. Timeout settings are unchanged.
5. Connected portal identifies both a select and a navigation landmark. The fidelity
   test now scopes to the User Rights tabpanel and queries the combobox by accessible
   name. No design or reusable-control behavior changed.

Baseline also found one additional timeout in tests/ui.test.tsx's combined navigation/
selection test. It passed subsequent targeted and full runs without modifying that file.
This is observed timing variability, not evidence of a production navigation defect.

Two new mock-HTTP tests exercise the actual database email hook: template save/reload/
archive and draft save/reload without localStorage writes, plus unavailable-API denial
without local fallback. They do not claim real PostgreSQL persistence or RLS validation.
Current server/local selection was checked against Workspace and EmailWorkspace source.

All 42 Biome diagnostics were useTemplate informational suggestions. Each expression
was inspected; scoped concatenation-to-template changes preserve string values, URL
encoding, CSV quoting/BOM/newlines, generated identifiers and SQL parameter values.
No SQL statement, auth flow, privilege, dependency or broad formatting rewrite was made.
No unrestricted automatic formatter/fixer was run.

## Verification

| Run | Exit | Result |
|---|---|---|
| Baseline npm test (JSON reporter) | 1 | 182 passed, 6 failed, 16 skipped; 204 total |
| Baseline npm run lint (JSON reporter) | 0 | 42 informational diagnostics |
| Initial targeted correction run | 1 | 19 passed, 2 failed; interim encoding mismatch corrected before final verification |
| Corrected targeted run | 0 | 23 passed |
| First full-suite rerun | 1 | 188 passed, 2 email timeouts, 16 skipped |
| Final npm.cmd run typecheck | 0 | Passed |
| Final npm.cmd run lint | 0 | 135 files; zero diagnostics |
| Final npm.cmd test | 0 | 190 passed, 16 skipped; 206 total, 27 files passed / 2 skipped |
| npm.cmd run build | 0 | Next.js production build completed; static and dynamic routes generated |

Commands were invoked separately with their exit codes captured. The first full rerun
overlapped a build; final full suite ran without that build load after input optimization.
The build changed generated next-env.d.ts route imports; its exact pre-task bytes were
restored from backup to preserve existing work. This restoration does not undo source fixes.

All 16 skipped tests are existing opt-in live suites: 11 in recipient-live.integration.test.ts
(restricted connection, runtime/options, four statuses, filtering, scope, pooling, write/DDL
denial and monitoring ACL), and 5 in supabase-session-live.test.ts (identity mapping,
unmapped identity denial, expiry, logout/replay and cross-origin denial). BCS_LIVE_TESTS=0
was set only for test command processes; no credentials/configuration files were changed.
Skipped tests were not enabled because SQL/live database execution is outside this task.

Preservation checks: 12 IPX hashes/sizes and three archival Smart TSX hashes/sizes match
their saved manifests. All migrations 001–021 retain intake bytes. SessionGate, role-home,
Supabase authentication, activation/recovery and user-management implementations retain
intake bytes. All pre-existing files remain present; no unrelated file was removed.
No real database, Supabase Auth, SES or bulk-send verification was performed.
No new browser visual/pixel acceptance was performed; these are source/unit/build checks.

## Exact changed-file inventory

Test corrections/coverage:

- `tests/admin-ui-cleanup.test.tsx`
- `tests/email-editor.test.tsx`
- `tests/fidelity.test.tsx`

String-template style changes only:

- `apps/web/src/campaign-workspace.tsx`
- `apps/web/src/client-recipients.ts`
- `apps/web/src/communication.tsx`
- `apps/web/src/configuration.tsx`
- `apps/web/src/database-configuration.tsx`
- `apps/web/src/database-email-store.ts`
- `apps/web/src/email-composer.tsx`
- `apps/web/src/recipient-csv.ts`
- `apps/web/src/server/activity.ts`
- `apps/web/src/server/campaigns.ts`
- `apps/web/src/server/configuration-service.ts`
- `apps/web/src/server/contacts-api.ts`
- `apps/web/src/server/documents.ts`
- `apps/web/src/server/schedule-validation.ts`
- `apps/web/src/server/scheduling.ts`
- `packages/ui/src/grid.tsx`
- `tests/authenticated-documents.test.ts`
- `tests/recipient-server.test.ts`
- `tests/supabase-session-live.test.ts`

Documentation: `docs/handover/WORK-STATUS.md` and this new report.
Total: 23 existing files modified, one new report. Local backup/log artifacts are ignored
by existing repository rules; no ignore rules changed.

## Backups, evidence and rollback

Byte-preserving backups: `E:\Bulk-Communicatio-System\.local\regression-20261019-132109\backups`.
The parent directory contains before/after hashes, the pre-task Git status, a review diff
and a guarded rollback script. Backups include pre-existing edits and untracked sources;
they are not reconstructed from HEAD. Do not reset/revert the dirty working tree.

Owner-run rollback from Windows CMD, only if desired:

```cmd
powershell.exe -NoProfile -File "E:\Bulk-Communicatio-System\.local\regression-20261019-132109\rollback.ps1"
```

The script checks every current file against this task's after-hash and every backup
against its before-hash before restoring any original bytes. It refuses later edits or
missing backups. It does not stage, reset, delete new documentation, or remove logs.
Keep this report and evidence as history if rolling back. The script was reviewed, not run.

Evidence under `E:\Bulk-Communicatio-System\.local`:
regression-before-tests.json, regression-before-lint.json, regression-targeted.json,
regression-targeted-after.json, regression-tests-after.txt, regression-tests-final.txt,
regression-typecheck-final.txt, regression-lint-final.txt and regression-build.txt.

Recommendation: suitable for owner-reviewed, incremental SaaS development on this
stabilized baseline. Not production certification: live isolation/authentication tests,
supported-browser acceptance, recovery verification and deployment gates remain separate.
Exactly one next activity: owner review of this stabilization diff before further development.
