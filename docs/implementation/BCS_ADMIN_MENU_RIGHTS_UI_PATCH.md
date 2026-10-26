# BCS Phase 1 — Administration Menu and Rights UI Patch

Date: 2026-10-17. Scope: **front-end navigation, permissions presentation, and focused regression tests**. Applies to the current approved `E:\Bulk-Communicatio-System` source snapshot following the successful user-administration patch and three-file lint hotfix.

## Features

- Main workspace navigation continues to provide exactly 5 original pages.
- An independent Administration section adds **User Creation**, **User Rights**, and **Database Connections** to the shared sidebar on authenticated application pages.
- A desktop topbar control toggles **Minimize main menu / Expand main menu**. Preference is kept as `bcs-sidebar-collapsed` in browser-local UI storage; no session or security state uses localStorage.
- Mobile navigation remains a drawer, with Escape and focus return retained.
- Main sidebar provides **Log Out**, which calls the existing `DELETE /api/bcs/app/session` endpoint and navigates to `/login` only on successful response. Failed requests display an error without claiming logout.
- User Rights keeps existing `GET/POST /api/bcs/app/configuration?kind=rights` contracts. Built-in roles are view-only; custom role grants require an explicit save. Permission display now offers six-category matrix and compact list, one permission per row.
- Existing user/portal role assignment, custom role creation and backend authorization remain intact.

## Explicit nonchanges

No PostgreSQL scripts, API routes, migrations (including pending 020), Supabase authentication logic, secret files, sending, recipient data, IPX files or archived Smart controls are changed. User invitations remain disabled until their required database/server configuration is independently accepted.

## New routes

- `/admin/users` — User Creation
- `/admin/rights` — User Rights
- `/admin/connections` — Database Connections
- `/login` — existing Supabase-authenticated login page

## Safe installation and rollback

The installer checks exact SHA-256 preimages; if any file differs unexpectedly it performs no writes. It backs up replaced files in `Downloads\BCS_Menu_Rights_Backups` and supports manual rollback, with checksums enforced again. It never executes SQL or Git operations.

## Verification to run on Windows

Stop dev server. Run `npm.cmd run typecheck`, `npm.cmd run lint`, targeted `vitest run tests/admin-navigation.test.tsx tests/admin-rights-layout.test.tsx`, then `npm.cmd run build`. Complete browser acceptance includes desktop expanded/collapsed, 760px drawer, logout behavior, and role matrix keyboard operation. The editor test may time out in concurrent full-suite execution despite passing separately; this is a known existing limitation, not resolved by this UI patch.

**Development status:** source prepared and TSX syntax checked in the packaging environment; the owner's actual runtime build and browser review are pending. No production acceptance is claimed.
