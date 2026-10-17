# Step 3C-2B — restricted reader deployment and live acceptance

17 October 2026. **Implemented and verified against bcs-dev.** Local Recipient Selection now uses PostgreSQL through the dedicated reader. This supersedes the permission blocker in STEP-3C2-LIVE-PREFLIGHT-RESULT.md. It does not make the other synthetic application areas production-backed.

Local review URL: http://127.0.0.1:3000/communication. The server binds only 127.0.0.1. Normal startup reads ignored apps/web/.env.local without terminal password prompts. No administrator credential is loaded by Next.js.

## Four inherited permissions: root cause and resolution

| Permission | Verified live facts | Resolution |
|---|---|---|
| PUBLIC TEMPORARY on postgres | PostgreSQL database default; owned by postgres. NOINHERIT cannot subtract PUBLIC rights. Fifteen existing non-pg roles had effective TEMP. | Removed only PUBLIC TEMPORARY, preserving PUBLIC CONNECT. Twelve explicit TEMP grants retain existing service/application roles' access; postgres/dashboard_user already had direct rights and supabase_admin remains superuser. Newly created reader has neither TEMP nor CREATE. |
| extensions.pg_stat_statements | postgres-owned view, extension pg_stat_statements 1.11; native C invoker function, not SECURITY DEFINER. | No extension object or ACL changes. Exception to the unexpected-read ACL check requires exact schema, view name/type, owner, extension/version and view/native-function definition fingerprints. |
| extensions.pg_stat_statements_info | Same extension/owner; contains deallocation/reset metadata rather than query text. | Same narrow exception. Writes remain forbidden even on these objects. |
| public.rls_auto_enable() | Zero arguments; RETURNS event_trigger; postgres owner; SECURITY DEFINER; fixed pg_catalog search_path; one ensure_rls ddl_command_end dependency, enabled for CREATE TABLE / CREATE TABLE AS / SELECT INTO. | Revoked only PUBLIC EXECUTE. Existing explicit postgres/anon/authenticated/service_role grants retained. Function body, owner, trigger and tags unchanged. Reader has no memberships and cannot execute it. |

The monitoring grants are platform monitoring ACLs, not evidence of tenant-data escalation. More strongly, the actual reader lacks USAGE on extensions, and direct reads of both views fail with 42501. PostgreSQL documents masking other users' query text/query IDs unless superuser or pg_read_all_stats; ordinary aggregate execution metrics can remain visible when schema access is available. We did not grant lasting schema access or read other users' SQL.

An additional isolated masking probe attempted a transactional schema grant then SET LOCAL ROLE. The supplied administrator is not permitted to SET ROLE to this reader (42501); the entire probe rolled back. Thus masking itself is supported by official guidance, **not claimed as live-tested**. Actual reader denial of both views is live-tested. No role membership was added to circumvent this boundary.

The event-trigger return type does not provide an ordinary SQL callable routine. Nevertheless removing unnecessary PUBLIC EXECUTE is defense in depth and satisfies the dangerous-definer gate. This is not a claim that the old grant was an exploitable bypass. The existing function's exception/logging behavior was inspected but not rewritten.

## Versioned SQL and recovery

- database/proposals/010a_bcs_dev_permission_remediation.sql: exact database ACL, function ACL/body fingerprint, role inventory and enabled-trigger preconditions; explicit named TEMP preservation; two targeted PUBLIC revocations; postconditions.
- database/proposals/010a_bcs_dev_permission_restore.sql: recovery instructions and guarded reversal of only those changes. Stop the local server and disable reader LOGIN first. Keeps reader CONNECT, policies and migration history; does not drop roles or records. Restores PUBLIC TEMP/EXECUTE and removes only the twelve compensating TEMP grants. Any ACL drift that prevents baseline comparison aborts recovery for review.
- database/proposals/010_recipient_reader_PENDING_APPROVAL.sql: existing filename retained for history; **executed under current owner authorization**, not pending approval now. Added only the fingerprinted monitoring read exception and safe catalog type evaluation.

Remediation and 010 were executed together in one transaction. A temporary public test table verified automatic RLS after the EXECUTE change; its savepoint was rolled back. A temporary-table probe under anon verified preserved TEMP and was rolled back. No test table remains. Before commit all existing non-system roles still had TEMP, PUBLIC CONNECT remained, and reader gates passed.

Two earlier attempts failed with 42809 and rolled back fully: PostgreSQL reordered a sequence-privilege predicate and evaluated it on an index. Explicit CASE type guards now prevent invalid catalog-function calls in both provisioner and runtime. This was a catalog evaluation defect, not a permission bypass. No completed migration rehearsal was replayed; 001–009 were never rerun.

Recovery SQL is supplied for incident use and was **not executed against the accepted deployment**. Managed Auth/Storage/Realtime end-to-end service suites were not exercised; evidence consists of retained effective service-role grants, unchanged function/trigger definitions and the successful transactional probes.

## Provisioning, credential and TLS results

- PostgreSQL 17.11; target matched private project reference and ap-south-1 pooler configuration.
- Migration count 10; reader LOGIN enabled, no SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION, no memberships and no table ownership.
- Exactly six BCS SELECT grants plus CONNECT and schema USAGE. No BCS writes, sequence privileges, schema CREATE or database CREATE/TEMP.
- Twelve SELECT policies (one permissive plus one restrictive on each of six tables). Literal synthetic company/portal bounds and transaction-local scope remain mandatory.
- All 57 original BCS tables retain RLS and FORCE RLS; original default-deny protections remain.
- Fresh cryptographic reader password generated privately. Only a SCRAM verifier was sent for provisioning; no plaintext password SQL, command argument or printed credential. Ignored apps/web/.env.local contains only restricted runtime configuration. Temporary credential handoff file removed.
- Actual reader authentication succeeded with encrypted, authorized TLS using the supplied official CA and Node hostname verification. No certificate bypass or privileged runtime fallback.
- PostgreSQL system catalog visibility and standard built-in capabilities remain; this is not an arbitrary-SQL sandbox. Future service roles requiring TEMP need individually reviewed grants. Extension upgrades fail the fingerprint gate until reviewed.

## Actual restricted-reader dataset

| Check | Result |
|---|---:|
|Recipients|240|
|Active|213|
|Inactive|12|
|Bounced|7|
|Unsubscribed|8|
|Groups|4|
|Subgroups|12|
|Memberships|240|

These counts were obtained through the reader and APIs, not substituted from administrator results. No existing business records were changed.

## Verification actually executed

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, 14 informational template suggestions, zero lint errors/warnings.
- npm.cmd test: 75 PASS; 11 live tests intentionally skipped without explicit opt-in.
- BCS_LIVE_TESTS=1 with tests/recipient-live.integration.test.ts: 11/11 PASS against the actual restricted login. Verified TLS, runtime guard, counts/statuses, search, stable nonduplicate paging, membership filters, enriched details, zero rows for missing/empty/malformed/wrong-company/wrong-portal scope across all six tables, pooled scope cleanup, READ ONLY / REPEATABLE READ, and denied temporary DDL, UPDATE planning, unrelated BCS reads and definer calls. The negative UPDATE uses EXPLAIN, not a write.
- node scripts/verify_bcs_reader_api.mjs: 40 PASS over actual HTTP endpoints, including seven sort keys in both directions, 10/20/50 page sizes, search, groups/subgroups, details, status counts, malformed/unknown/repeated inputs, rejected browser scope, nonexistent ID, foreign origin and unsupported POST.
- npm.cmd run build: PASS; five application surfaces and three read API routes remain.
- git diff --check: PASS.
- Protected-file hashes: 78 files match turn start, including all original IPX, React pages, reusable controls/editor, original migrations/seeds and reference sources. Generated next-env.d.ts restored to its turn-start contents, not included in checkpoint.
- Known private admin/reader secret scan of nonignored source: zero matches. Production browser chunks scanned: 7, zero known secrets or checked server-config identifiers. No credential/certificate staged.

Initial live test setup used a Node environment incompatible with the existing shared DOM test setup; corrected to the existing project environment. An initial monitoring test expected visible masked statistics, but the reader correctly lacked schema permission; replaced with an explicit denial assertion. Final results above reflect corrected tests, with those earlier findings retained here.

Browser verification used the existing local tab: database label with 240/213; STD-1207 search produced one record; enriched details loaded; Data Science & AI showed 60 records/53 eligible and three dependent subgroups; Python Morning showed 20/18; Next showed rows 11–20; Bounced showed seven/zero eligible with disabled checkboxes; clearing filters restored all records; Select page selected nine eligible records, and Clear all cleared them. Sorting by Student ID was exercised. No send/import/admin action was taken. Existing title/footer still say Synthetic UI/data because the dataset and other surfaces remain synthetic; the recipient source label distinguishes actual database reads.

No new complete mobile/zoom/visual-parity matrix is claimed. Approved UI source bytes were preserved. Database select-all-matching, CSV export and continuing these database selections to sending remain deliberately disabled; the HTML designer and other synthetic workflows remain unchanged. Mocked unavailable-database/error-redaction tests pass; no actual network outage was induced.

## Files and Git boundary

This increment changes apps/web/src/server/transaction.ts and the 010 proposal, adds the two 010a SQL files, live integration test, HTTP acceptance script and this report, and updates handover/architecture/status references. Private helper/evidence files remain ignored under .local; the only runtime configuration is ignored apps/web/.env.local. No UI redesign, dependency install, SES request, actual email or other-project access occurred.

The local checkpoint includes the previously authorized Step 3 database/read-adapter foundation needed for a coherent integration, with explicit paths only. Unrelated Activities.txt, the old first-baseline helper, CSV validator and generated next-env.d.ts remain unstaged. No push.

Next activity: owner review of local database-backed Recipient Selection. Production identity/session design, general multi-tenant authorization, sending and persistence of other synthetic areas remain separate increments.

## Official guidance reviewed

- [PostgreSQL 17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html): PUBLIC default database/function privileges are additive.
- [PostgreSQL 17 pg_stat_statements](https://www.postgresql.org/docs/17/pgstatstatements.html): other users' SQL text/query IDs restricted to superusers and pg_read_all_stats.
- [PostgreSQL event triggers](https://www.postgresql.org/docs/17/sql-createeventtrigger.html): event-trigger function/lifecycle contract.
- [Supabase event triggers](https://supabase.com/docs/guides/database/postgres/event-triggers): managed event-trigger support and automatic-RLS example.
