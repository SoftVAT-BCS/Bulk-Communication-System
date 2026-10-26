# SoftVAT BCS — Invitation email and account activation

## Existing architecture preserved
- Next.js 16 + React / BCS IPX; existing five workspace pages and Administration routes.
- Supabase Auth for email/password identities; BCS PostgreSQL principals, company/portal scopes, roles, and RLS for authorization.
- BCS backend `/api/bcs/app/users` performs authorized invitations. No browser secret/API management token.
- Live Amazon SES campaign sending remains disabled; transactional Auth invitations are separate.

## Files in this upgrade
- `apps/web/src/bcs-user-creation.tsx`: invite form, directory and email preview.
- `apps/web/src/bcs-activate-account.tsx`: branded form with both password Show/Hide buttons.
- `apps/web/src/bcs-admin-pages.css`: small UI extensions.
- `apps/web/src/server/user-onboarding.ts`: validates display names and accepts normal or wrapped Supabase Auth response.
- `apps/web/src/server/invitation-activation.ts`: POST-only server verification of invite; sets password using the verified invited user token.
- `apps/web/app/api/bcs/app/activation/route.ts`: same-origin public activation endpoint (NOT administrative).
- `tests/invitation-activation.test.ts`: six synthetic tests, no emails or database operations.
- `Supabase_Configuration/INVITE_USER_TEMPLATE.html` in the kit: paste this HTML into Supabase Auth **Invite user** template.

## Before first invitation (operator actions)
1. Verify `bcs-dev` is the target project. In SQL Editor, run the read-only `CHECK_ONBOARDING_020_READ_ONLY.sql` from the kit. Apply the existing, reviewed `database/migrations/020_user_onboarding_scoped.sql` ONLY if missing, after normal backup/recovery review. Never rerun already-applied migration 020. It grants six-column INSERT to the restricted `bcs_app_backend` role and preserves RLS.
2. Supabase → Authentication → URL Configuration: for testing on the same PC, set **Site URL** to `http://127.0.0.1:3000`; add `http://127.0.0.1:3000/activate` to allowed redirect URLs. For external recipients use a deployed public HTTPS origin instead; `127.0.0.1` opens on THEIR computer, not yours. The current backend invitation redirect allowlist is deliberately limited to localhost until separately reviewed for production.
3. Supabase → Authentication → Emails → Email Templates → **Invite user**: paste the kit's `INVITE_USER_TEMPLATE.html`, and set subject from `INVITE_USER_EMAIL_SUBJECT.txt`. Save. Personalization uses `{{ .Data.display_name }}`. The email has a prominent named greeting and a blue **Click Here to Activate Your Account** button. The `{{ .TokenHash }}` is in the URL fragment, and the invitation token is consumed only when the recipient submits their password.
4. Verify Auth transactional email SMTP provider is configured, active, and has available rate limits. Gmail SMTP may be suitable for a small local trial; use a dedicated transactional provider for production and test deliverability. This is NOT the Amazon SES bulk campaign flow.
5. Privately set in `apps/web/.env.local` (never in chat, Git or a downloadable file):
   - `BCS_SUPABASE_URL` — project Auth base URL (already present)
   - `BCS_SUPABASE_PUBLISHABLE_KEY` — publishable key (already present)
   - `BCS_SUPABASE_ADMIN_KEY` — **server-only sb_secret_...** project secret key
   - `BCS_INVITE_REDIRECT_URL=http://127.0.0.1:3000/activate` for the same-PC development trial
   - Existing `BCS_APP_DATABASE_URL`, `BCS_DATABASE_CA_FILE`, and authenticated application settings unchanged.
6. Restart the BCS dev server and open `/admin/users`. It must report **Invitations ready**. If not, use its readiness error; do not bypass the permission checks.

## Expected test
1. Sign in as the existing authorized BCS workspace owner.
2. Open `/admin/users`. Enter a **new**, not yet registered email address, a display name, a role and portal.
3. Click **Preview invitation email**, then **Invite user**. The application calls `/api/bcs/app/users`; Supabase Auth sends the email. The response means the provider accepted the request, not guaranteed inbox delivery.
4. Open the email on the **same development computer**. It shows the recipient's name in prominent bold type and `Click Here to Activate Your Account`.
5. Clicking the button opens `/activate`. User enters **Create password** and **Confirm password**, with independent Show/Hide controls, then clicks **Activate My Account**.
6. The activation POST verifies the invite with Supabase before updating that same Auth identity's password. It does not create a BCS session or ask an admin to enter the recipient's password.
7. Click **Go to Login**. Sign in using the invited email and newly created password. The existing BCS session service independently enforces principal identity, role and portal authorization.

## Safety and limitations
- Never place `sb_secret_...`, `service_role`, database password or Auth admin key in React/HTML, email templates, query URLs, source control or screenshots.
- The installer creates no database objects, updates no auth templates, does not send email and does not configure secrets.
- Link is one-time and subject to Supabase email OTP expiration and SMTP rate limits. A consumed link cannot simply be retried; investigate the user in Supabase Auth and use an approved recovery/re-invitation workflow.
- Since BCS runtime presently rejects non-loopback request hosts, full remote recipient activation requires a separately reviewed public HTTPS deployment and server host/redirect allowlist work, not just changing `.env.local`.
- Migration 020 is still an owner action; its absence keeps invitation submission disabled.
- This package is tested for TS/TSX syntax and payload integrity in the build environment. Run `VERIFY_BCS_INVITATIONS.cmd` on Windows for actual TypeScript, lint, focused tests and build. A live invite is accepted only after the end-to-end trial succeeds.
