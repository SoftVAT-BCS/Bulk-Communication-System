# Step 3C-2 — Restricted Supabase access review

17 October 2026. **Prepared, not executed; STOP for owner review before privileges are granted.** This owner-defined Step 3C-2 is restricted connectivity, not the older proposed templates/drafts increment. No templates, UI, editor, imports, sending or administration features are added.

## 1. SQL proposal review

Reviewed and corrected `E:\Bulk-Communicatio-System\database\proposals\010_recipient_reader_PENDING_APPROVAL.sql`. Original review copy is retained in ignored `.local/step3c2-original-010.sql`. Existing migrations 001–009 and seeds are unchanged.

Changes:
- Declare LOGIN, with **no password supplied**. Owner separately provisions a fresh credential after approval. Never use the previously exposed password. LOGIN alone does not make password authentication work without a password.
- Retain NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOINHERIT and NOREPLICATION; no memberships or ownership.
- Require database `postgres`; project bcs-dev and region ap-south-1 must still be privately verified by the owner in Supabase. Database name alone does not identify the project.
- Explicit CONNECT on postgres, schema USAGE on bcs, SELECT on the six required tables only. Role default_transaction_read_only=on is defense in depth, not an authorization boundary because users can reset it.
- Retain existing FORCE RLS; refuse missing prerequisites, existing reader role, migration10 or existing policies rather than overwrite them.
- Keep per-table SELECT policy bcs_demo_read plus matching RESTRICTIVE bcs_demo_boundary. Both require transaction-local company/portal settings AND literal UUID bounds resolved from exact codes softvat-bcs-demo / skillmonk-demo. Missing, malformed or other scope returns no rows. The company table is bound to company ID; portal table to company+portal ID; the other four tables to company_id+portal_id.
- Guard effective privileges, including inherited PUBLIC grants: reject database CREATE/TEMPORARY, CREATE on application schemas, unexpected table/column reads or writes, sequence access, BCS functions and callable non-system SECURITY DEFINER functions. No shared grants/policies are automatically revoked or weakened. Existing BCS default-deny for anon/authenticated/service_role is untouched.

### Important inherited-privilege prerequisite

PostgreSQL normally grants PUBLIC database TEMPORARY; NOINHERIT or REVOKE FROM this one role cannot subtract PUBLIC privileges. Public schema CREATE, column grants and callable SECURITY DEFINER functions can also matter. The proposal aborts transactionally if these checks fail; the backend likewise rejects the role. It does **not** perform broad PUBLIC revocations. If bcs-dev has such privileges, owner/DBA must assess impacts and separately approve remediation before a strict no-DDL reader can be enabled. No remote privilege state has been inspected or assumed here. Standard system catalog visibility/functions remain PostgreSQL platform behavior; this is not a claim to sandbox arbitrary SQL or revoke PostgreSQL built-ins. No actual PostgreSQL execution or policy correctness acceptance is claimed.

Sources: [PostgreSQL 17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html), [role attributes](https://www.postgresql.org/docs/17/role-attributes.html), [schema privileges](https://www.postgresql.org/docs/17/ddl-schemas.html).

## 2. Permission matrix

| Resource | Required permission | Row boundary / purpose |
|---|---|---|
|postgres database|CONNECT only; CREATE/TEMPORARY must be false|Owner-confirmed bcs-dev only|
|bcs schema|USAGE only; no CREATE|Name resolution|
|bcs.companies|SELECT|Exact synthetic company, both scope settings required|
|bcs.portals|SELECT|Exact synthetic company and SkillMonk demo portal|
|bcs.audience_groups|SELECT|Bound company/portal, group options|
|bcs.audience_subgroups|SELECT|Bound company/portal, stored group dependency|
|bcs.recipient_group_memberships|SELECT|Bound company/portal, normalized membership filtering|
|bcs.recipients|SELECT|Bound company/portal, counts/search/pages/detail|
|Other application tables/columns|None|Unexpected effective reads/writes reject provisioning/runtime|
|Application sequences / BCS functions|None|No defaults/sequence IDs/functions needed for read paths|
|INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER|None|Catalog checked; no write probes executed|
|Schema/database DDL, memberships, ownership, bypass attributes|None|Fail-closed privilege gate|

The database policies enforce the boundary independently of browser filtering. GUCs remain mutable by credential holders; literal policy bounds are essential. Do not reuse this demo reader for general SaaS authorization. No SELECT-all matching send handle, updates, import endpoints or outbound jobs exist in this increment.

## 3. Restricted role provisioning — owner-operated, after approval only

1. Verify project bcs-dev / Mumbai ap-south-1 / database postgres in the private Supabase dashboard. Complete rotation of the exposed credential through the owner's secure process; this task does not perform or claim that rotation.
2. Review the final010 proposal, all its guards, permission matrix and rollback comments. Review inherited privileges before approving execution. If the proposal aborts, STOP; do not remove its guards or substitute an administrator runtime credential.
3. Only after separate approval, owner executes010 using an authorized provisioning identity in the designated project. Provisioning administration is separate from application runtime. Codex has not connected using any administrative identity or executed this file.
4. Owner/DBA sets a **new dedicated reader credential** through an approved private credential-management route that does not retain plaintext in query/command history or logs. No password SQL, shell argument, chat message, screenshot or report should contain it. If such a route is unavailable, stop and arrange one; do not use SQL Editor saved history as a password store. No interactive terminal credential prompt is part of the backend design.
5. Owner verifies current_user, LOGIN and forbidden flags, effective ACLs, ownership/memberships, FORCE RLS and both policies on each of the six tables. Resolve the exact synthetic UUIDs with the proposal's code-filtered query; never derive scope from browser parameters. Runtime continues to verify exact company/portal codes on every scoped transaction.
6. Configure the ignored local file privately; only after restricted-role verification set the acknowledgement flag. The acknowledgement does not replace live runtime role checks.

No privileges are granted in this task. Revocation directions remain in010: stop the server; disable login; revoke only its six-table SELECT, schema USAGE and CONNECT; remove only its two policies per table after dependency review. Do not DROP OWNED/CASCADE or erase migration history.

## 4. TLS and connection

Use the actual custom-role connection information privately obtained from bcs-dev **Connect**. Do not copy the postgres administrator URI. Direct connections can need IPv6; use the official session pooler for IPv4 where appropriate. Custom pooler usernames use the dedicated role plus dashboard project reference. No real host, reference or credentials were supplied to or guessed by this task. Data API remains disabled and no PostgREST calls are used.

Existing pg driver uses verified TLS with owner-provided CA and rejectUnauthorized=true. Installed pg8.23.1 code was inspected: TLS host/servername comes from the connection host and Node checks certificate identity. Do not substitute an IP, override hostname checking or disable certificate verification. Config now also requires database path /postgres, rejects fragments and all URI query parameters (including sslmode overrides), and only permits the dedicated reader username/direct or pooler form. CA file errors yield a controlled response without filesystem/driver details. Actual certificate trust and hostname validation remain untested until owner setup.

See [Supabase Connect guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) and [SSL verification](https://supabase.com/docs/guides/platform/ssl-enforcement). Download the official certificate from the relevant project settings and keep it outside the web root. A certificate is not a password, but its configured path is server-only.

The backend uses a two-client pool, one checked-out client for BEGIN READ ONLY / role check / transaction-local scope / all reads / ROLLBACK. No named prepared statements or session scope reliance. Session pooler is preferred for this persistent local app; transaction pooling still requires all context/reads in the same transaction. Role drift or query errors return controlled errors, never fixture data labelled database-backed.

## 5. Non-interactive private local configuration

Verified: apps/web/.env.local does not exist; Git ignores it via `.env.*`, and it is not tracked. Existing `.env.example` exception is correct. No .gitignore edit was necessary. No secret file was created or populated. Examples contain empty placeholders only.

After approval and private provisioning, owner can run in Windows CMD:

```cmd
cd /d "E:\Bulk-Communicatio-System"
if not exist "apps\web\.env.local" copy "apps\web\.env.example" "apps\web\.env.local"
notepad "E:\Bulk-Communicatio-System\apps\web\.env.local"
```

Populate privately, without sharing values in chat:

| Variable | Value source |
|---|---|
|BCS_DATA_MODE|database only after provisioning; synthetic retains offline mode|
|BCS_RUNTIME_ROLE_VERIFIED|owner-reviewed-010 only after owner privilege verification|
|BCS_DATABASE_URL|New restricted-role URI from private Connect details; database postgres|
|BCS_DATABASE_CA_FILE|Absolute path to the official project CA file|
|BCS_DEMO_COMPANY_ID|UUID resolved for softvat-bcs-demo|
|BCS_DEMO_PORTAL_ID|UUID resolved for skillmonk-demo within that company|

Percent-encode the URI password component privately (never with an online converter). This also prevents raw special characters such as dollar signs being interpreted by dotenv variable expansion. Do not use NEXT_PUBLIC names. Do not print env values or inspect the file with terminal output, git add -f, snapshots or logs. `.gitignore` is not encryption; keep the local file under the owner's normal private Windows account protections. No ACL/global configuration changes are made here.

Restart in a fresh CMD after saving, ensuring no inherited BCS variables override the file. `npm.cmd run dev` from `E:\Bulk-Communicatio-System` starts the existing loopback-only server. Next automatically reads apps/web/.env.local; no CMD/PowerShell password prompt or password-bearing command is needed. Stop an old BCS process with Ctrl+C in its own terminal first; do not kill unrelated processes. Review URL: http://127.0.0.1:3000/communication. No database URL or tenant scope is returned to the browser. Keep the dev server unexposed; this fixed demonstration identity is not production login/authentication.

## 6. Tests and negative-isolation plan

Executed locally: typecheck PASS; lint PASS (14 existing informational suggestions, no warnings/errors); 75/75 tests across8files PASS; production build PASS. Ten new config tests cover non-interactive loading with mocked CA, required verified TLS, restricted username forms, wrong database, TLS override/fragment/missing credential rejection, CA-error redaction and production denial. These tests use fabricated noncredentials and do not connect or verify a real certificate. Existing65 UI/contract/repository/route tests remain passing.

Prepared but NOT executed: updated010_VERIFY_READ_ONLY.sql checks all six tables with no/invalid/company-mismatched/portal-mismatched/reused scope. It is a psql-format reference (variables for UUIDs), **not** an instruction to invoke password prompts. Later tests can use the backend's privately configured client with bound UUID parameters and identical SQL, without exposing connection data.

| Later authorized read-only check | Expected evidence |
|---|---|
|TLS trusted CA and correct hostname|Successful restricted login; no verification bypass|
|Actual current_user/LOGIN/flags/memberships/owner/ACL checks|Only reviewed identity; forbidden attributes/permissions absent|
|No scope; empty/malformed scope|Zero rows from every one of six tables|
|Valid synthetic scope|240 recipients;213 Active,12 Inactive,7 Bounced,8 Unsubscribed;4 groups,12 subgroups;240 memberships, only if actual counts match|
|Real company B and real portal B when present|Zero rows with swapped settings; inaccessible IDs return404 via detail API|
|A transaction then B transaction on same checked-out connection; rollback then unscoped|No inherited A scope or rows|
|Anonymous/authenticated/service_role schema grant metadata|No newly granted BCS access; never test service_role as app runtime|
|Forbidden write/DDL permissions|Catalog privilege predicates false; no INSERT/UPDATE/DELETE/TRUNCATE/CREATE statements attempted|
|Search/group-subgroup/status/page/sort/detail|Server results match authorized synthetic records; stable pages and counts|
|Unavailable DB, invalid CA/hostname or unsafe role|Controlled error, no secret/SQL leakage, no synthetic fallback|

No new records or extra test tenants are created. If actual alternate scopes are absent, record that limitation rather than claim complete cross-tenant verification. Production roles and real customer datasets are outside this test authorization. Browser visual/200%zoom acceptance was not repeated; UI/editor code is unchanged in this step.

## 7. Preservation and Git

Baseline saved in ignored .local/step3c2-before.json, capturing current working files rather than assuming HEAD was clean. Existing Step3C-1 and owner changes are preserved. No dependencies added. No migration execution, external DB connection, email, AWS, imports, writes, staging, commits or pushes. The final change/preservation check is recorded below after execution. Step3C-1 historical findings remain in its report; this review supersedes its NOLOGIN proposal and narrower effective-privilege check.

Changed in this step: two database/proposals/010 SQL files; server config.ts and transaction.ts; safe apps/web/.env.example; new tests/reader-config.test.ts; this report and appended handover/architecture references. Unrelated application files remain unchanged.

## 8. Exactly one next action

**Owner approval of this revised010 restricted-access package, including its inherited-privilege stop gates, before any database privileges are granted.** Restricted identity is not ready locally; live tests are stopped at that prerequisite. No request for credentials in chat.

### Final preservation evidence

53 protected files match turn-start SHA-256 hashes, including original IPX, archived controls, migrations/seeds, reusable UI and composer files. Next-generated next-env.d.ts restored only after matching its exact turn-start hash. Browser bundle scan: 10 chunks, zero checked server-variable/role markers. .env.local remains absent. No staging; existing branch/HEAD unchanged.

Final Git status (includes prior changes):

```text
 M apps/web/app/communication/page.tsx
 M apps/web/next-env.d.ts
 M apps/web/package.json
 M apps/web/src/communication.tsx
 M apps/web/src/workspace.tsx
 M docs/README.md
 M docs/adr/DECISION-LOG.md
 M docs/architecture/DATABASE-ARCHITECTURE.md
 M docs/handover/WORK-STATUS.md
 M package-lock.json
 M package.json
 M packages/contracts/src/index.ts
 M packages/ui/src/grid.tsx
?? Activities.txt
?? apps/web/.env.example
?? apps/web/app/api/
?? apps/web/src/client-recipients.ts
?? apps/web/src/server/
?? database/
?? docs/architecture/RECIPIENT-DATA-FOUNDATION.md
?? docs/architecture/STEP-3B-2-ISOLATION-REVIEW.md
?? docs/implementation/STEP-3C1-DYNAMIC-DATA-FOUNDATION.md
?? docs/implementation/STEP-3C2-RESTRICTED-DATABASE-ACCESS.md
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? scripts/validate_recipient_csv.py
?? tests/reader-config.test.ts
?? tests/recipient-database-ui.test.tsx
?? tests/recipient-server.test.ts
```

## Full authorization received — private access prerequisite (17 October 2026)

Owner now authorizes verified restricted-role provisioning, generation of a new credential, runtime configuration, live tests and one local commit only if all gates pass. This supersedes the earlier approval wait. No further routine approval is being requested.

Current access discovery: available browser inventory contains only the local Universal Notify tab, with no accessible Supabase session. No Supabase connector is available. No BCS/PG/Supabase connection variables were present in the current process; no private admin connection file was found in the project local configuration inventory, and apps/web/.env.local is absent. No old conversation password was used and no remote connection was attempted. This is an access handoff, not a missing authorization.

One-time private handoff: copy E:\Bulk-Communicatio-System\.local\bcs-admin.env.example to E:\Bulk-Communicatio-System\.local\bcs-admin.env, then privately populate the exact bcs-dev project reference, fresh/rotated administrative URI for one-time provisioning and official CA certificate path. The example contains blank credential fields only and is ignored by Git. Do not paste values in chat. This admin file is outside apps/web and must never be loaded by the application. Tell Codex only that it is configured; it can then validate the target privately, provision with the existing authorization, generate a new reader credential, and store ONLY the restricted credential in ignored apps/web/.env.local. If private admin configuration is not possible, the alternative handoff is signing into bcs-dev in the accessible in-app browser; no available browser session was assumed.

Windows CMD preparation (no password on the command line):

```cmd
cd /d "E:\Bulk-Communicatio-System"
if not exist ".local\bcs-admin.env" copy ".local\bcs-admin.env.example" ".local\bcs-admin.env"
notepad "E:\Bulk-Communicatio-System\.local\bcs-admin.env"
```

The metadata inspection query now uses the same exact pg_ schema-prefix test as the enforcement guards. No permissions or UI behavior changed in this continuation. Live row counts, TLS, actual restricted-role authorization/denials, dynamic browser checks and selected-matching completion remain pending access. No local commit is permitted until those gates pass; none created.

Continuation checks: typecheck PASS; lint PASS (14 informational suggestions); production build PASS; whitespace PASS; IPX baseline and archival/UI/source/migration/seed integrity PASS. First test run concurrent with build:74 passed,1 existing email-editor workflow timed out at5seconds. Sequential rerun with no test/code/timeout changes:75/75 passed across8files in12.50seconds. The timeout is recorded rather than hidden; no full live acceptance claim follows from this rerun. Database integration, live TLS/counts/isolation and dynamic browser checks remain NOT RUN because private access is unavailable. No staging or local commit; the owner's all-gates-pass condition is unmet.

## Subsequent live preflight

The private configuration is now present and verified TLS administrative read-only checks succeeded. The access-handoff blocker is resolved. Provisioning is instead blocked by actual inherited PUBLIC privileges; see the [live preflight execution result](STEP-3C2-LIVE-PREFLIGHT-RESULT.md). No migration010, runtime credential or success commit was created. Historical reports above are retained.

## Step 3C-2B supersedes the provisioning blocker

Targeted remediation, restricted-reader provisioning, private runtime configuration and live acceptance are now complete. See [Step3C-2B final result](STEP-3C2B-DYNAMIC-INTEGRATION-RESULT.md) for exact changes, exceptions, 11 real-reader tests and40 HTTP checks. Historical approval/access blockers above no longer describe the current state.
