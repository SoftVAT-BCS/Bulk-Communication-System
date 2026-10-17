# Step 3C-1 — Dynamic SaaS recipient read foundation

Date: 17 October 2026. Status: implemented locally, awaiting owner review and runtime-role provisioning. No live database connection or SQL execution occurred. Design choices and access proposal are **Proposed**, not owner-accepted production authentication.

## Scope and checkpoint

Canonical workspace: `E:\Bulk-Communicatio-System`. Starting HEAD: `44eeb3f6b983da76279ba87dd468202e8feba5e3`. Existing documentation, SQL additions, next-env.d.ts and other untracked owner files were preserved. No staging, commit, push, alternate checkout, deployment, source database access, AWS call or email send.

The owner reports bcs-dev (Mumbai, PostgreSQL 17.11), private `bcs` schema, migrations 001–009, and enriched synthetic records. These remote facts remain **unverified in this task**. Original migrations and seeds remain byte-for-byte unchanged. The historical differently scoped proposal is actually named `Codex_0001_bcs_demo_recipients.sql`; it is neither imported nor used by this implementation.

## Inventory and implementation map

| Surface | Current source | Step 3C-1 state / future dependency |
|---|---|---|
| Dashboard | apps/web/src/previews.tsx | Synthetic preview only; future authorized scoped counters, no fabricated delivery claims |
| Communication recipients | apps/web/src/communication.tsx | Synthetic UI Demo remains default; optional server read mode |
| Compose and templates | email-workspace.tsx, email-composer.tsx, email-templates.tsx, email-store.ts | Existing browser-local demo drafts and rich HTML designer preserved; no persistence or send integration |
| Scheduling | previews.tsx | Synthetic event/queue previews; future event/rule/outbound persistence |
| Reports | previews.tsx | Synthetic preview; future provider events, real suppression and delivery reconciliation |
| Configuration | configuration.tsx | Preview mappings/rights/settings; future authenticated company/portal administration |
| Shared UI | packages/ui/src | Existing SmartMultiSelect and TanStack EnterpriseGrid reused; optional disabled-matching reason and loading/error empty text added |
| Contracts | packages/contracts/src/index.ts | Browser-safe recipient/detail, group/subgroup, filters, sort, pages, error and response types |
| API foundation | apps/web/src/server + app/api/bcs/v1 | Same-origin Next Node Route Handlers; apps/api, apps/worker and packages/config remain future foundations |

### Read endpoints

- `GET /api/bcs/v1/audience/options` — stored active groups and dependent subgroups.
- `GET /api/bcs/v1/recipients` — search, groups/subgroups, status, sort, descending, zero-based page and size.
- `GET /api/bcs/v1/recipients/[id]` — authorized UUID detail.

Only named filter keys accepted; duplicate/unknown parameters and tenant IDs rejected. UUID lists max20; search max120 characters; page max100000; size only10/20/50. Search uses case-insensitive literal substring matching over name/email/target_id/recipient_group (wildcards are literal). Sort keys map to fixed server column names; UUID tie-breaker is stable. Membership EXISTS avoids duplicate recipient rows. Counts and rows share one repeatable-read read-only transaction. Out-of-range pages clamp to the last page, including empty page0. “Eligible” means Active for local selection, **not marketing consent**.

Normalized summary fields retain the existing grid contract. `targetId` shows the source student ID; opaque `id` identifies the authorized detail. Detail maps grade/dob/gender/mobile_no/whatsapp_no/address_1/address_2/city/pin/state_name/district_name/st_id/dt_id with nullable values. Company/portal UUIDs are not DTO fields. No SELECT-star queries. Legacy `groupId` is an empty compatibility field in DB summaries; normalized group memberships drive filtering, not that legacy field.

Browser search is debounced250ms, AbortController cancellation plus stale-result guards protect pages/details, requests expire after12seconds. Old result rows disappear during new loads. Database label appears only after both server read endpoints succeed. Failures remain unavailable; there is no automatic fallback. Offline fixture mode is chosen explicitly by server configuration.

DB page/individual selections persist locally across filters. Select-all-matching and deselect-matching are disabled because there is no authorized server selection handle. Export/Continue-to-compose are also disabled for DB recipients; composer receives no DB selection. Existing synthetic composer/template behavior is otherwise unchanged. Detail contacts are labelled synthetic/not dialable.

## Trust and database access

There is no real login/session layer yet. This is an explicit **local development demonstration identity**, not SaaS authentication. NODE_ENV must be development. Host must be loopback; mismatched Origin, external Fetch-Site and Forwarded are rejected. Next inserts X-Forwarded-For from the socket; only a single loopback value is accepted. These HTTP checks are defense in depth, not authentication: keep `next dev --hostname 127.0.0.1`, do not put a proxy/tunnel in front of it or expose it externally. Local machine users remain trusted. Production mode rejects this identity.

Server-only settings supply the reviewed synthetic UUIDs. Every request checks the actual database current_user and role flags, no memberships, no object ownership, no bcs schema CREATE, FORCE RLS on all six read tables, no writes/other BCS table reads or BCS function EXECUTE. Then transaction-local company/portal settings are set and a scoped join verifies **exact** codes `softvat-bcs-demo` / `skillmonk-demo`. Only then can repository reads execute. All SQL data values use bind parameters.

`BEGIN ... REPEATABLE READ READ ONLY`, local4second statement timeout,8second idle transaction timeout,6second driver query timeout, and finally ROLLBACK run on the same checked-out client. Pool max2, connect timeout4seconds, idle10seconds. Failed rollback discards the connection. Settings are not session-level and cannot leak through a transaction pool. Catalog gate precedes application reads. No named prepared statements. API errors contain a generated request ID and generic safe message/code, never driver text, SQL, connection values or credentials. No custom logging of database errors; Next dev request logging can contain search text, so use only the synthetic dataset.

### Pending access SQL — NOT EXECUTED

`database/proposals/010_recipient_reader_PENDING_APPROVAL.sql` creates a fresh NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOINHERIT, NOCREATEDB, NOCREATEROLE, NOREPLICATION role named `bcs_recipient_reader`, with USAGE on bcs and SELECT only on:

1. companies — exact demo company validation
2. portals — exact demo portal validation
3. audience_groups — group options
4. audience_subgroups — subgroup options
5. recipients — summary/detail/counts
6. recipient_group_memberships — normalized filtering

It aborts for existing role/policies or missing migration9/FORCE RLS, rather than overwriting. Policies require both valid local settings **and literal synthetic UUID bounds** resolved during owner execution. Matching restrictive policies prevent later permissive policies widening the demo boundary. No writes, sequence access, schema CREATE or functions are granted. No public/anon/authenticated/service_role grants. Credentials and LOGIN provisioning are deliberately separate owner actions. Existing migrations001–009 are never replayed.

Custom GUCs are mutable by a credential holder and do not authenticate a tenant. This proposal is safe only as an identity permanently bounded to one synthetic scope; it is not reusable SaaS multi-tenancy. Production needs trusted principal/API-client authentication and allowed-portal resolution, a reviewed identity/authorization model, negative tenant tests, and independent permission review. Administrative changes can invalidate assumptions; owners must review grants/policies before enabling the runtime flag. Runtime checks do not prove arbitrary policy correctness.

`database/proposals/010_VERIFY_READ_ONLY.sql` is also unexecuted. It contains missing/malformed scope, expected scoped counts, mismatched company/portal, and same-connection rollback/reuse probes. Before claiming cross-tenant security, owner must also test actual other-company/portal IDs where present, anon access, role attributes/privileges and all six tables with invalid scope. No extra test records are inserted. Migration revocation directions are comments in the proposal; stopping server, disabling login, revoking the six grants and dropping only the two policies per table is the narrow rollback. Do not DROP OWNED/CASCADE or erase history.

## Connection prerequisites and exact owner steps

**Stop gate:** do not execute010 merely because it exists. Next action is owner review/approval of this access proposal and provisioning of the restricted runtime identity in bcs-dev. No password is requested in chat. No live connection was attempted: there is no owner-managed apps/web/.env.local here.

After separate approval, owner uses **bcs-dev** SQL Editor to review/apply the proposal and perform credential provisioning securely, then verify the role/policies with the included queries. Never copy the SQL Editor/admin postgres credential into runtime configuration. Obtain the dedicated role URI, host, port and user from the project's **Connect** panel and retrieve its official server CA. Endpoints are not invented in this repository.

Direct PostgreSQL commonly requires IPv6. For persistent Windows development on IPv4, use the official session pooler details from Connect. Transaction pooling may reuse different backend sessions between transactions, so do not depend on session state or named prepared statements. This adapter uses one client and local settings within each transaction. TLS certificate validation is mandatory (`rejectUnauthorized: true`), with owner-provided CA file. URL query parameters (including sslmode overrides) are rejected; there is no insecure TLS fallback. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres), [node-postgres SSL](https://node-postgres.com/features/ssl) and [pool transactions](https://node-postgres.com/apis/pool).

Windows CMD, only after approval/provisioning:

```cmd
cd /d "E:\Bulk-Communicatio-System"
if not exist "apps\web\.env.local" copy "apps\web\.env.example" "apps\web\.env.local"
notepad "E:\Bulk-Communicatio-System\apps\web\.env.local"
```

Privately enter BCS_DATA_MODE=database, BCS_RUNTIME_ROLE_VERIFIED=owner-reviewed-010, BCS_DATABASE_URL for bcs_recipient_reader, BCS_DATABASE_CA_FILE absolute CA path, BCS_DEMO_COMPANY_ID and BCS_DEMO_PORTAL_ID from the exact-code owner query. Do not use NEXT_PUBLIC variables. Keep .env.local ignored. Restart the local server after changes:

```cmd
cd /d "E:\Bulk-Communicatio-System"
npm.cmd run dev
```

Local URL: `http://127.0.0.1:3000/communication`. Default/explicit synthetic mode remains usable before provisioning. Production build is a compile check only, not permission to enable the demo identity with next start. Node24.16.0 observed; project range>=24.15<25. Added pinned pg8.23.1, server-only0.0.1, @types/pg8.23.1; pg engine>=16 supports this runtime. pg-native is optional and not installed. npm workspace install reported zero vulnerabilities (259 packages audited); this does not prove absence of vulnerabilities.

## Verification record

Final command results are recorded in WORK-STATUS. Automated tests use a mocked driver and jsdom; they do **not** execute PostgreSQL, validate SQL syntax against17.11, prove live counts, validate CA/role login or establish live RLS isolation. These are mandatory follow-up checks after owner setup.

Browser verified: real Next dev page synthetic label/counts and ID search; explicit database-mode unavailable state with disabled bulk/compose/export actions and no fixture fallback. HTTP route returned503 DATABASE_NOT_CONFIGURED; no connection attempted. Production build emits the three dynamic API routes and dynamic Communication route. All five existing routes remain. Existing rich editor tests retained. No production browser/database success claimed.

Preservation compares saved SHA-256 entries in .local/step3c1-preservation.json for the original SQL/seeds,11 extracted IPX files and3 archival TSX. The repository's saved IPX baseline additionally covers the original ZIP (12 total). Full200% zoom/accessibility and pixel parity acceptance remain unverified; no acceptance is inferred from jsdom or screenshot inspection.

## Proposed next increments

| Increment | Authorized later scope / dependencies |
|---|---|
|3C-2|Persist templates, draft versions and content; auth/ownership, sanitization, concurrency, audit and reload tests before writes|
|3C-3|Company/portal rights/mappings after real login/session authorization; replace fixed demo identity with trusted principal/API-client scope|
|3C-4|Persist scheduling/rules/queue; reports use actual provider outcomes and truthful pending/unknown states|
|3C-5|Authenticated company-scoped client contact ingestion with idempotency, mapping validation and quotas|
|3C-6|SES worker/events/suppression only after separate owner approval; recheck consent/preferences/suppression immediately before sends|

Same-origin Route Handlers are the first boundary to avoid a second public service. Extract the repository/contracts into the proposed Fastify API later after authentication and deployment topology approval. No generic CRUD across57tables, no ingestion endpoint, worker, billing, SES or source integration added in3C-1.

## Files and final check results

Changed for this task: apps/web/app/communication/page.tsx; apps/web/src/communication.tsx; apps/web/src/workspace.tsx; packages/ui/src/grid.tsx; packages/contracts/src/index.ts; apps/web/package.json; package.json; package-lock.json; docs/README.md; docs/adr/DECISION-LOG.md; docs/architecture/DATABASE-ARCHITECTURE.md; docs/handover/WORK-STATUS.md.

Added: apps/web/.env.example; apps/web/src/client-recipients.ts; server/config.ts, validation.ts, transaction.ts, repository.ts, runtime.ts, handler.ts under apps/web/src; app/api/bcs/v1/audience/options/route.ts, recipients/route.ts, recipients/[id]/route.ts under apps/web; tests/recipient-server.test.ts; tests/recipient-database-ui.test.tsx; the two database/proposals/010 files; this report. Ignored local evidence: .local/step3c1-preservation.json and .local/step3c1-browser.png. next-env.d.ts is Next-generated and retains its development-mode diff, present at intake. No business changes to synthetic.ts; its original bytes restored after a no-op text write.

| Command/check | Actual final result |
|---|---|
|npm.cmd run typecheck|PASS|
|npm.cmd run lint|PASS, 14 informational useTemplate suggestions; no warnings/errors|
|npm.cmd test|65 passed / 7 files; original 33 retained|
|npm.cmd run build|PASS; all five pages and three dynamic read endpoints compiled|
|git diff --check|PASS; CRLF-to-LF notices only|
|npm.cmd audit --omit=dev --audit-level=low|0 reported vulnerabilities|
|SHA-256 preservation|28 saved original files unchanged; full 12-file IPX baseline matches; 3 archived TSX unchanged|
|Browser/HTTP|Synthetic count and search verified; unconfigured database mode error verified; HTTP503 with safe request ID|
|Live PostgreSQL17.11, TLS login, policy enforcement and remote240counts|NOT RUN: owner provisioning/approval prerequisite|
|200%zoom, complete visual/accessibility acceptance|NOT RUN / not accepted|

Final Git status (includes preserved pre-existing owner changes; index is empty, HEAD unchanged):

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
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? scripts/validate_recipient_csv.py
?? tests/recipient-database-ui.test.tsx
?? tests/recipient-server.test.ts
```

## Subsequent access review

The owner-defined [Step 3C-2 restricted-access review](STEP-3C2-RESTRICTED-DATABASE-ACCESS.md) supersedes the historical NOLOGIN proposal above: LOGIN is now declared without a credential, with stricter effective-privilege gates. Still unexecuted. This step does not implement the earlier proposed templates increment.
