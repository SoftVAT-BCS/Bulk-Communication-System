# Supabase Auth login correction — 17 October 2026

## Confirmed cause

The original sign-in did not contact Supabase Auth. It accepted only a local username matching `[a-z0-9_.-]{3,80}` and verified a scrypt hash from `bcs.local_credentials`. An email address was rejected before any password verification. The `.local` hint described that separate bootstrap account, not the owner's Supabase account. The previous 12-character local password restriction also had no relationship to the existing Supabase password policy.

A read-only bcs-dev Auth metadata check confirmed the owner-specified existing account has a password, a confirmed email, and no active ban. No password/hash was printed. No Auth account was created, updated or duplicated; no emails were sent.

## Implementation

- Server-only `supabase-auth.ts` posts email/password to the project's HTTPS Auth password endpoint, then verifies the returned access token through `/auth/v1/user`. No Data API call, SDK dependency or service_role key is used.
- Strict configured Supabase HTTPS origin; redirects rejected; requests timed out; provider failures reduced to controlled errors. Only publishable/legacy anon keys accepted; secret/service_role configuration rejected. No password-reset, signup or email endpoint invoked.
- Email confirmation is required even if upstream configuration permits an unconfirmed login. Verified MFA factors fail closed with MFA_REQUIRED; second-factor UI is not implemented.
- Login resolves the trusted issuer plus verified Supabase subject to exactly one active existing BCS principal. Email, user metadata and browser scope values never confer permissions. Existing principal/company/portal/role checks remain authoritative.
- The owner-authorized existing Supabase UUID was explicitly bound to the existing owner principal through its existing identity_issuer/external_subject fields. No new principal, role, scope or permission was created. Private rollback metadata: `.local/auth-principal-before.json`; original grants/scopes: `.local/auth-permissions-before.json`. Two existing bootstrap sessions were revoked. No schema migration or new database grant required.
- Existing 256-bit opaque BCS sessions reused; only SHA-256 token hashes stored in PostgreSQL. HttpOnly, SameSite=Strict, host-only cookie; Secure on HTTPS. Local HTTP uses the existing loopback-only gate. Absolute expiry is capped at one hour and upstream token lifetime, with no automatic refresh. Old cookie revoked on reauthentication; logout revokes the stored session and clears the cookie. Expired-session logout also clears it successfully.
- Supabase access/refresh tokens are not returned to browser, persisted or logged. No fallback to local bootstrap credentials. Existing local credential records remain preserved but unused by login.
- Existing BCS permissions, portal scope and account status are checked on every protected request. An upstream Supabase account change does not instantly revoke an already-issued independent BCS session; its maximum lifetime is one hour. BCS session/principal revocation takes effect immediately.
- Sign-in UI retains existing layout/components and now says Email and describes a confirmed, authorized Supabase account. Missing Auth configuration is distinguished from a bad password. Data API settings and all dynamic modules were preserved.

## Private configuration and genuine prerequisite

`apps/web/.env.local` remains Git ignored. BCS_SUPABASE_URL was set privately from the verified bcs-dev project configuration. Add BCS_SUPABASE_PUBLISHABLE_KEY from that same project's Settings / API Keys. Use the publishable key or legacy anon key, never secret/service_role/admin credentials. The safe `.env.example` has empty placeholders only. Restart the existing dev server after changing configuration.

The owner password stays private. After the key is configured, use the normal localhost sign-in form with the existing account. Do not put the password in chat, source, reports or command history.

## Verification boundary

Focused tests: 13 provider/configuration tests with mocked Auth responses; 5 actual PostgreSQL session tests with mocked external identity (18 total). They cover successful opaque session creation and mapped permissions, incorrect-password responses, email confirmation, mismatched IDs, MFA fail-closed, controlled outage/throttling, privileged-key rejection, no local fallback, unknown principal denial, real database expiry/logout/replay denial and CSRF. Probe-created session rows are removed by exact token hashes. These prove application/session behavior, not the owner's actual password.

Live successful Supabase password login and a real incorrect-password attempt cannot be performed until the publishable key is configured. The owner password was not available to the agent. No actual owner password test is claimed. Full-suite/build results and final local runtime are recorded in the delivery addendum.

Relevant primary references: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [server-confirmed getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

## Files changed

Existing: server/app-service.ts, app/api/bcs/app/session/route.ts, session-gate.tsx, .env.example, WORK-STATUS.md. New: server/supabase-auth.ts, tests/supabase-auth.test.ts, tests/supabase-session-live.test.ts, this report. Ignored configuration/backup/probe artifacts remain private. Earlier dynamic-feature edits and unrelated files remain intact. No staging, commit, push, real sending or AWS operation.

## Final delivery evidence

Full opt-in suite: 163/163 passed (19 files). Production build and typecheck passed. Lint passed with informational suggestions only; two new test non-null assertions were corrected and the five live session tests rerun successfully. Protected IPX/reference hashes: 28/28 unchanged. Targeted known-credential scan: no matches in source or 10 built browser chunks. Original role assignments and portal scopes were compared with the private baseline and are identical. Git index empty; no commit/push.

Local development server left running at http://127.0.0.1:3000/ (launcher PID 8892). Homepage returned 200; anonymous session returned 401; password submission with missing publishable key returned the intended 503 AUTH_NOT_CONFIGURED. No real password request was made to Supabase. Existing generated next-env bytes restored. The sole setup blocker is still the missing project publishable/anon key. Owner successful login and live incorrect-password/unauthorized-Supabase-user tests remain unexecuted; the mocked-provider and actual-database tests above are not presented as substitutes for those checks.

## Resolved configuration and live login verification

This addendum supersedes the missing-key blocker and untested-owner-login statements above.

- Owner privately supplied BCS_SUPABASE_PUBLISHABLE_KEY. Supabase accepted it; Auth settings report email/password enabled and email confirmation required. No key value printed or copied into source/report.
- Local server restarted with that configuration (launcher PID 2788), at http://127.0.0.1:3000/.
- A real request using the existing owner's email and a generated incorrect password returned HTTP 401 / INVALID_LOGIN, no Set-Cookie, and unchanged BCS session count. No repeated password guessing or real password access occurred.
- Anonymous GET requests to session, documents, campaigns and configuration each returned 401.
- Owner entered the actual password privately and confirmed "signed in". Read-only metadata independently confirmed one newly created Supabase Auth session and an active BCS session mapped to the existing principal and its authorized company/portal. No duplicate Auth user or BCS principal was created. The owner session remains open; it was not used for expiry/logout mutation testing.
- Full opt-in regression suite rerun: 163/163 PASS, 19 files. Logout, replay denial and expiry executed against actual PostgreSQL using separate test sessions and mocked verified external identities. Unauthorized valid-identity mapping was tested with a mocked Supabase subject; no second real Auth user's password was available or requested. These boundaries are explicit; no full real multi-user login claim.
- Original role assignments and portal scopes compared identically with the saved baseline. All 28 protected reference hashes still match. Targeted known-secret scan found no matches in source or the browser chunks checked. No production configuration, Data API setting, email, AWS, commit or push.
- No application source changes were needed in this continuation; configuration activation, runtime restart, tests and documentation updates only. Previous typecheck/lint/build results remain applicable to unchanged application source.

No authentication setup blocker remains for the confirmed owner account. MFA sign-in and immediate upstream account-revocation propagation retain the limitations documented above. Next action: review the existing dynamic workflow while signed in; sending remains disabled.
