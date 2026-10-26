# BCS UI cleanup and user-invitation readiness

This source-only patch:

1. Removes the redundant Database Connections item from the sidebar. The existing `/admin/connections` route and **Configuration → Portal & Database** form remain intact.
2. Removes the repeated sign-in notice and duplicate sign-out button from authenticated page content. The sidebar Log Out action continues to revoke the BCS session.
3. Updates User Creation to show the actual `GET /api/bcs/app/users` capability response instead of claiming its API route is missing. No button is enabled until the server reports invitation readiness.
4. Repairs the onboarding grant check: migration `020_user_onboarding_scoped.sql` grants six column-level INSERT privileges, so a full-table `has_table_privilege(...,'INSERT')` check would incorrectly fail. The corrected query requires all six column privileges and refuses broad table INSERT.
5. Adjusts the Administration navigation test and adds focused UI tests. No SQL or secrets are included in the patch.

## What is still required to activate user invitations

**Not performed by installation.** These are real Supabase Auth invitation emails, distinct from the disabled Amazon SES bulk sender.

- Review and apply existing additive migration `database/migrations/020_user_onboarding_scoped.sql` **only after confirming migration 019 is present**, testing the restricted backend role, and having a recovery plan.
- Configure `BCS_SUPABASE_ADMIN_KEY` with a private, rotated **Supabase secret API key** (not a publishable or legacy anon key), server-side only in `apps/web/.env.local` and never in an uploaded ZIP.
- Configure `BCS_INVITE_REDIRECT_URL=http://127.0.0.1:3000/activate` and add this exact redirect under Supabase Auth URL allowlist.
- Confirm the current server-side invitation implementation works with the Supabase Auth Admin API, and test with one designated non-production mailbox before inviting real users. A failed BCS database write after a successful Auth invite requires reconciliation; the existing endpoint intentionally reports that condition.
- Test authorization: company-wide `access.manage`, portal scope, inability to grant permissions not held, no duplicate principals, rejected unauthenticated invitations, and actual activation/login.

**No secrets should be pasted into chat or committed.** Never enable invitation buttons merely by changing a front-end Boolean.

## Verification on owner's Windows development system

`npm.cmd run typecheck`, `npm.cmd run lint`, targeted tests and `npm.cmd run build`. Check Git status and ensure all protected IPX and archival Smart source hashes are unchanged.
