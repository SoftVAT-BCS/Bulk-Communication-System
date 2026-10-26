# BCS User Management — Consolidated source upgrade

## Provenance

This package was built from the **latest attached** `BCS_User_Management_Current_Source.zip` (`apps/web/src` only). Earlier owner-supplied `BCS_All_Pages_Complete_TSX_TS_Source_Updated.zip` provides **reference only** for the unchanged users App Router endpoint and migration structure. Current App Router, UI package and tests were not in the latest ZIP, so installer preflights the existing route rather than overwrites it.

## Changes

- Company user directory with search, name, email, role/portal and status.
- Edit display name in BCS; synchronize Supabase user metadata if its admin API responds. When synchronization fails, show explicit partial-success status.
- Suspend/restore BCS access and revoke BCS sessions; cannot modify self or users holding `access.manage`.
- Resend unconfirmed invitations through Supabase Auth Admin, with explicit error if provider refuses an already-invited account.
- Replace an **unactivated** incorrect-email invite only: first suspend the old BCS principal, then send a NEW invitation to corrected email; older Supabase identity remains for administrator reconciliation. If sending fails, the old account **stays disabled**. Activated users need the account owner's verified email-change process; admin one-click update is intentionally unavailable.
- Request password recovery through Supabase Auth Recovery email. New branded `BCS_SUPABASE_RECOVERY_TEMPLATE.html` must be reviewed and installed in Supabase manually. Recovery and invitation tokens are verified server-side before updating any password.
- Audit reads for each company principal; metadata excludes email/name/secrets. Rights assignment links preselect a company-authorized user.
- Dashboard greets the authenticated display name.
- No password fields, tokens or secret keys are logged/stored in the BCS database.

## One-time migration

`database/migrations/021_company_user_management.sql` grants UPDATE of **display_name and status only**, using a company-wide RLS policy for `access.manage`. Migration **MUST be applied manually** after an approved backup and current-schema review. It will refuse to rerun.

## Required Supabase settings

- Existing private BCS Supabase Admin key stays in `.env.local` (never package/upload it).
- Existing `BCS_INVITE_REDIRECT_URL` must point to local `/activate` for development.
- **Authentication → Emails → Reset Password:** paste `docs/email/BCS_SUPABASE_RECOVERY_TEMPLATE.html` before testing password recovery. The template uses `{{ .SiteURL }}` and `{{ .TokenHash }}`; configure Site URL to the same approved BCS address.
- Existing **Invite user** template and login remain unchanged.
- In production replace localhost URLs with approved HTTPS domains and review signup, MFA, invitation expiry and provider rate limits.

## Verification boundaries

Do not assume live RLS, cross-tenant denial, recovery, SMTP or browser acceptance passed until verified on `bcs-dev`. Execute the included Windows verifier; it runs TypeScript, Biome, targeted tests and the production build after installation. No Supabase SQL is run by the installer. The original schema and IPX archives remain unchanged.

## Manual acceptance matrix

1. Owner sign-in, list company users and ensure other-company users remain invisible.
2. Edit a standard user's name; refresh, sign in as that user and check dashboard greeting.
3. Suspend one standard user; existing BCS session should be revoked, login denied; restore user and retest.
4. Verify self and manager-account suspension protections.
5. Check history after each change.
6. Open User Rights from a user: user should be preselected and backend scope checks enforced.
7. Resend a genuinely pending invitation; expect provider-specific failure if Supabase disallows resending an existing invite.
8. Replace wrong email only for unconfirmed user; confirm old BCS access remains disabled and new invite remains company-scoped.
9. After installing the recovery template, request password recovery and complete a fresh, one-time reset link.
10. Confirm no changes were made to SES sending, recipients, IPX, secrets or external source portals.
