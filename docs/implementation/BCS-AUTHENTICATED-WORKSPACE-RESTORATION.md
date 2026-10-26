# Authenticated workspace restoration — 19 October 2026

## Result and root cause

Normal authenticated development startup restored on http://127.0.0.1:3000. Browser login and unauthenticated Administration protection verified. Actual owner/restricted-user sign-in and database-backed acceptance require owner browser validation; no passwords requested or submitted.

The source was intact. `scripts/BCS_Integration_Preview.cmd` explicitly sets both BCS_APPLICATION_MODE and BCS_DATA_MODE to synthetic and starts port 3107. Process environment overrides the existing authenticated/database settings in private apps/web/.env.local. The synthetic workspace therefore bypasses SessionGate by design; its login API cannot use the authenticated backend mode. This was a launcher mismatch, not deleted user management. The root layout also unconditionally advertised Synthetic UI in its browser title.

## Exact task changes

- `apps/web/app/layout.tsx`: neutral Universal Notify browser metadata; no screen redesign.
- `scripts/BCS_Start_Authenticated.cmd`: new normal launcher, canonical workspace and executable checks, local port 3000, scoped environment, live tests off.
- `scripts/bcs-authenticated-preflight.cjs`: new offline checks using Next's development environment precedence, correct modes, private configuration presence, restricted backend connection contract, public Auth key type, CA parsing, existing dev lock and port availability. Prints no private values and opens no database connection.
- `docs/handover/WORK-STATUS.md`: current task result.
- This report.

No changes to authentication, permissions, CSV Import/Export, SQL, campaigns, worker or preview launcher. The existing task-owned synthetic server was stopped through its original terminal with Ctrl+C. No unrelated process was terminated. Next regenerated next-env.d.ts during startup; it was restored only after verifying exact intake SHA-256 equality.

## Startup and URLs

Run in Windows CMD after stopping this task's already running server normally (Ctrl+C); never terminate an unknown listener:

```cmd
cd /d E:\Bulk-Communicatio-System
call E:\Bulk-Communicatio-System\scripts\BCS_Start_Authenticated.cmd
```

Normal: http://127.0.0.1:3000/
Login: http://127.0.0.1:3000/login
User Creation / Management: http://127.0.0.1:3000/admin/users
User Rights: http://127.0.0.1:3000/admin/rights
Recipients: http://127.0.0.1:3000/communication
Activation/recovery landing: http://127.0.0.1:3000/activate (requires the existing valid invitation/recovery link).

Synthetic support remains separately available via `E:\Bulk-Communicatio-System\scripts\BCS_Integration_Preview.cmd`. Stop the normal Next development server before using that launcher: both share one workspace dev lock. Port 3107 is not the normal authenticated workspace. No private configuration was changed.

## Verification

| Check | Result |
|---|---|
| npm.cmd run typecheck | Exit 0 |
| npm.cmd run lint | Exit 0 |
| npm.cmd test | Exit 0; 341 passed, 16 skipped; 36 passing suites, 2 skipped |
| npm.cmd run build | Exit 0 |
| Launcher configuration contract | 8 offline checks passed: accepted valid synthetic fixture configuration; rejected synthetic application/data modes, production NODE_ENV, isolated acceptance flag, elevated DB role, missing CA setting and invalid Auth key |
| Actual preflight | Passed after known preview stopped; correctly rejected an active Next dev lock beforehand |
| Actual startup | Next ready on 127.0.0.1:3000, existing private .env.local loaded |
| Browser | Existing login form visible; /admin/users presents SessionGate sign-in without a session |
| HTTP without cookies | Session, users, actual /api/bcs/v1/recipients return 401 |
| Preserved references | All 12 IPX SHA-256 + sizes and 3 Smart SHA-256 + sizes match original manifests |
| Private config | SHA-256 unchanged |

The initial probe of /api/bcs/app/recipients returned 404 because that is not the recipient route; the source-confirmed /api/bcs/v1/recipients correctly returned 401. No evidence is claimed from the incorrect route.

Logs and screenshot: `.local/auth-restoration-20261019-162129/` (typecheck.log, lint.log, test.log, build.log, login.png). Live tests remain disabled (BCS_LIVE_TESTS=0): 11 recipient integration cases and 5 Supabase session cases skipped. No write-bearing integration tests, SQL, migrations, Auth submissions or emails were executed. Build success is not live sign-in or database acceptance.

## Existing features preserved and acceptance boundary

Source review confirms existing Supabase password verification and trusted issuer/subject mapping; active company/portal/principal checks; role-aware firstAuthorizedPage (Fix 09); dynamic permission navigation; session-bound API authorization; existing User Creation/Management/profile edits/suspend/restore; User Rights; invite/recovery handling in /activate; logout/session protection; authenticated PostgreSQL recipients. Existing focused login-permission, Supabase Auth, activation, user-management and recovery tests pass. No permission grants or authentication replacements were made.

Owner browser checks (next activity):
1. Open /login, enter your existing owner credentials privately. Verify actual display name, permitted sidebar and Administration pages.
2. Inspect existing users, assignments, Edit User and Suspend/Restore controls without submitting changes. Check User Rights matrix and portal-specific scope.
3. In a separate private browser session, sign in as the existing restricted user. Verify its authorized landing page and denied unassigned Administration access (Fix 09).
4. Verify recipients load for the permitted portal, then logout and confirm protected routes require login again.
5. Invitation activation and password recovery source/tests are preserved. Actual link/password/email flows remain unexecuted; do not send invitations or recovery emails as part of this read-only acceptance.

No new authenticated session was created by this task. Database persistence, live account operations and recipient contents were not accepted on the basis of mocked tests. Prior deployment blockers for later SaaS work remain unchanged.

## Preservation, Git and rollback

Baseline: main, HEAD 2c073ba7b3c11965703e92f52a21cd24b105065e. Index empty. All pre-existing tracked/untracked files retained, including Step1G helper. All pre-existing source files were SHA-256 inventoried before edits; only layout.tsx and WORK-STATUS.md are authorized differences. Thus SQL 001–026 sources, CSV source and original data, campaign/worker, authentication and unrelated files remain byte-identical to intake. No staging, commit, push or database changes.

Intake inventory and full initial/final Git status are in `.local/auth-restoration-20261019-162129/`. Rollback uses the current-working-tree backups, never an old Git commit. Stop this task's server using Ctrl+C. After checking there have been no later edits, restore only the two changed existing files:

```cmd
cd /d E:\Bulk-Communicatio-System
copy /b /y .local\auth-restoration-20261019-162129\apps\web\app\layout.tsx apps\web\app\layout.tsx
copy /b /y .local\auth-restoration-20261019-162129\docs\handover\WORK-STATUS.md docs\handover\WORK-STATUS.md
```

The three new files can remain unused; no deletion or Git reset is required. For removal from the working tree, move only those three new files into a new private backup folder after reviewing any later modifications. Do not roll back pre-existing changes. Startup is development-only because that is the existing backend security contract; hosted production readiness is not implied.

Final Git summary: main at unchanged HEAD above; 37 modified tracked files (same count as intake), 149 untracked files (146 preserved plus the three new task files), zero staged files. Final hash comparison found exactly the two authorized existing-file changes and no missing files. Scoped Git whitespace verification passed; no merge-conflict markers found in the new deliverables.
