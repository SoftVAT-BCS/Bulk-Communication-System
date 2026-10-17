# Step 3B-2 offline isolation refinement

Prepared 2026-10-17. Status: **Proposed; offline reviewed, not deployed or SQL-tested.**
Owner authorized refinement, not database placement, role creation, access or import.
Baseline: main / `44eeb3f6b983da76279ba87dd468202e8feba5e3`.
See [recipient mapping and import foundation](RECIPIENT-DATA-FOUNDATION.md).

## Revised migration scope

[Migration 0001](../../database/migrations/0001_bcs_demo_recipients.sql) is an unexecuted
candidate. Only the demo group/category tuple CHECK was removed, with its separator
comma adjusted; the two required columns now have named nonblank CHECKs. Empty strings
and strings consisting only of SQL POSIX whitespace fail. This is not a global taxonomy.
The fixture validator and its strict vocabulary/checksum gate remain byte-for-byte unchanged.
Future portal adapters validate their own relationships. Tenant-scoped reference tables
may later be justified; no extra tables or executable access migration are added now.

Exact created object inventory, all within `bcs_demo`:

- Schema `bcs_demo`.
- Table `bcs_demo.recipients` (21 columns: 17 mapped + 4 internal).
- Explicit indexes `recipients_portal_group_category_idx`, `recipients_portal_status_idx`,
  `recipients_portal_email_idx`, `recipients_portal_name_idx`.
- Implicit primary/unique indexes `recipients_pkey`, `recipients_portal_target_key`.
- Trigger function `bcs_demo.guard_recipient_update()`.
- Table trigger `recipients_before_update`.

Table creation also creates PostgreSQL-managed row/array types and text-storage internals;
no extension, role, sequence, policy, API view or other business table is requested.
All prior types, status validation, identity immutability, timestamps, indexes, transaction,
fail-on-existing-schema behavior, PUBLIC revokes and ENABLE/FORCE RLS remain unchanged.

## Role and privilege preflight design

No preflight below was run against a database. A future DBA must first confirm the exact
approved target, supported server version, owner, connection identity and role graph.
`bcs_demo_owner` must exist as NOLOGIN, NOSUPERUSER, NOBYPASSRLS; also require
NOCREATEROLE, NOCREATEDB and no unrelated memberships as deployment prerequisites.
The migration only asserts the first three attributes; that assertion is not a full audit.
Owner requires database CREATE for schema creation and normal trusted-language access.
Keep database CREATE out of runtime identities and review its removal after deployment.

Use a dedicated BCS migrator, not an application login. On PostgreSQL 16+ the DBA should
grant membership in bcs_demo_owner with SET TRUE, INHERIT FALSE and ADMIN FALSE.
Review every indirect path: SET and INHERIT are distinct membership options; disabling
one path does not neutralize another. On supported pre-16 versions, membership permits
SET ROLE and the login's NOINHERIT attribute controls automatic inheritance; require
that login to have only the reviewed BCS membership, without ADMIN OPTION. Recheck the
chosen version's documentation/support at deployment; no server version is selected here.
Only the authorized DBA/grantor with necessary administration rights provisions this.
Do not place grant commands in 0001 or assume managed hosting permits them.
If the role is missing or SET ROLE denied, stop; never remove SET LOCAL ROLE or switch
to postgres/service_role/superuser to make the migration or import work.

Inventory both directions of memberships for owner, migrator, reader and importer;
inspect PUBLIC, database/schema/table/column/function ACLs, owner default privileges,
ownership and effective inherited rights. Reject unrelated SoftVAT memberships and
runtime paths to owner, BYPASSRLS or privileged roles. No runtime grant options, role
administration, schema CREATE, DELETE, TRUNCATE or unrestricted SET ROLE. NOINHERIT
alone does not prevent SET ROLE; owner control can alter policies, so runtime must not
be an owner or its member. The migration's ACL check detects explicit grants on its new
objects, not every indirect effective privilege or platform administrator capability.
Inventory event triggers, extension hooks, exposed schemas and publications; unexpected
DDL effects or platform grants block execution until understood in an isolated rehearsal.

Keep ENABLE and FORCE RLS. With no policies, normal roles are denied by RLS even if a
future test grants table access; without grants, permission denial occurs earlier. Test
both layers separately. FORCE subjects the owner to RLS, but superuser/BYPASSRLS still
bypass it and owner can change DDL. Unique constraints are not a substitute for portal
authorization; avoid leaking conflict details to unauthorized callers.

## Proposed Step 3B-3, gated increments

**Placement decision remains with the owner:** a separate BCS development PostgreSQL
database/Supabase project is preferred. Existing softvat-crm is production and blocked
unless the owner separately accepts documented risks, recovery evidence and exact scope.
Do not create a hosted project, alter billing or inspect production to settle this question.

1. Approve target and isolated test environment, a currently supported PostgreSQL version,
   backup scope/retention and a restore test into a separate environment. Verify restored
   data/roles/ACLs and record recovery time. Parse and rehearse 0001 using the matching
   PostgreSQL toolchain in that authorized disposable environment. Require deliberate
   failures for existing schema, missing role, denied SET ROLE and unexpected ACLs.
2. Separately prepare/review a future access migration for one synthetic portal. Example
   placeholder `bcs_synthetic_01` is **not an owner-approved portal key**. The backend
   resolves the approved identifier from authenticated identity and trusted membership;
   a browser filter/header or caller-set session GUC cannot establish authority.
3. Use a dedicated backend reader and separate importer, neither owner nor BYPASSRLS.
   Future grants: schema USAGE, reader SELECT; importer SELECT and INSERT on portal_key
   plus the 17 source columns only. Default fail-on-change import needs no UPDATE.
   A later approved correction mode may grant UPDATE on only reviewed mutable fields,
   never id, portal_key, target_id or timestamps. No DELETE or TRUNCATE.
4. Future SELECT policy: TO the specific reader/importer roles, USING portal_key equals
   that approved literal key. INSERT policy: TO importer, WITH CHECK the same key.
   Only if correction mode is approved: UPDATE policy with both USING and WITH CHECK
   that key. No general PUBLIC/anon/authenticated/service_role policy. Audit all policies
   for permissive OR combinations; do not accidentally add a broad policy beside these.
5. Test default denial first without policies (including a separately authorized test
   role granted table privileges to exercise RLS). After access migration authorization,
   verify authorized SELECT/INSERT and any approved UPDATE positive cases. With a second
   synthetic portal fixture in the isolated security harness, prove cross-portal read,
   count, insert, update, upsert and key-reassignment denial, missing/forged scope denial,
   no owner SET ROLE path, and no scope leakage through pooled connections. Keep this
   second fixture out of the original CSV; no second production portal is provisioned.
6. Separately implement/review a transaction-safe parameterized importer. The existing
   Python script is **a fixture validator/converter, NOT an importer**. No backend or
   database driver is implemented in Step 3B-2.

Importer contract for later implementation:

- Explicit INSERT columns: portal_key, target_id, name, email, recipient_group, category,
  grade, dob, gender, mobile_no, whatsapp_no, address_1, address_2, city, pin, st_id, dt_id,
  status. Omit generated ID/timestamps. Use bound values, never string-built SQL or
  caller-supplied table/column names. No credentials in browser code or log output.
- Validate exact source hash, encoding, delimiter, headers, count, duplicate keys and
  mapping before writes. Exact empty optional cells become NULL; whitespace-only values
  fail review instead of silent coercion. Preserve source identifiers and leading zeros.
  Casefold duplicates are a rejection/review signal, never an identity merge. Verify
  chosen target collation does not create unintended case-insensitive unique equality.
- Acquire a transaction-scoped per-portal lock without waiting: a competing import must
  abort, not silently race or retry. Every approved importer must use the same lock
  protocol. Use SERIALIZABLE transaction semantics and abort serialization/uniqueness
  conflicts; test an independent writer that does not honor the advisory lock too.
- Initial empty portal: 240 inserted. Exact rerun: 0 inserted / 240 unchanged. Compare
  all 17 values NULL-safely for existing keys; any differing value aborts the batch.
  Do not use unconditional conflict UPDATE or DO NOTHING without final equality checks.
  A malformed row, count mismatch, conflicting repeat or concurrent write aborts the
  whole transaction. No automatic retries of conflicts in the initial reviewed importer.
- Check pre/post totals and group/category/status distributions before commit; zero
  changes means timestamps and UUIDs also remain unchanged. Unexpected existing rows
  block the initial import. Record only counts, source hash, authorized portal and outcome
  in a private receipt, not recipient data. Explicitly test late-row failure rollback.
- Never reactivate a suppressed recipient from a repeated file. Active does not establish
  consent, suppression clearance or sending eligibility. No automatic or test emails.

Search follow-up: define lowercase prefix queries that match current index expressions,
escape literal wildcard characters, and assess substring requirements separately. Do not
claim the btree indexes accelerate arbitrary contains queries. Authorize every search/count,
allowlist sorts and filters, cap page size, and use a deterministic unique tie-breaker such
as target_id within portal. Define cursor/snapshot semantics for stable pagination under
concurrent writes; test query plans before proposing additional extensions/indexes.

Supabase review after explicit authorization: keep bcs_demo outside exposed schemas,
without anon/authenticated/service_role grants or exposed RPC/view wrappers. Inspect
REST/GraphQL, Realtime publications, default ACLs and effective roles. Do not change
the production CRM project's API configuration or disable its API as a workaround.
Separate schema, grants, RLS and backend authority are complementary controls.

## Optional-field synthetic test design (not executed)

The source's ten optional date/contact/address fields are empty. The unchanged fixture
validator cannot prove populated-field validation. Design separate synthetic unit tests
for the future mapper and corresponding database tests; never weaken the fixture hash.
Examples below are synthetic strings, not real contacts; never dial or send to them.

| Field/case | Positive expectation | Negative expectation / boundary |
|---|---|---|
| DOB | NULL; 2000-02-29 as exact ISO date | Reject 2001-02-29, 31/12/2000, timestamp text, future date relative to frozen test date 2026-10-17 |
| Mobile/WhatsApp | NULL; `+12025550123` accepted as format only | Reject missing +, +0 prefix, letters, spaces, seven or sixteen digits; test exactly eight and fifteen digits |
| Nullable fields | Exact empty CSV cell becomes NULL; NULL stays NULL | Reject whitespace-only input; literal `NULL` must not silently become SQL NULL |
| Unicode name/address/city | Synthetic `Demo Ω`, `Test नगर`, `Demo São` round-trip UTF-8 | Reject invalid byte sequences, NUL and prohibited controls; no replacement decoding |
| Unicode label whitespace | Nonempty multilingual labels retained | Reject U+00A0-only and U+2003-only labels in mapper; explicitly test SQL collation classification; reject invisible U+200B-only labels by reviewed API policy |
| Pin/ST ID/DT ID | `00123`, `ST-001`, `DT-002` retain zeros/case | Reject numeric coercion; country-specific postal validation requires portal contract |
| Gender | NULL or synthetic approved mapper label | No guessed enum; reject control/whitespace-only strings; portal vocabulary remains a decision |
| Group/category | Another portal's valid mapped pair accepted without SQL taxonomy change | Reject unmapped cross-group pairs in adapter; SQL alone only rejects blank labels |

Current SQL does not enforce future-date, all Unicode normalization or portal vocabulary
rules. Those require the future mapper and approved tests; do not describe them as working
database guarantees. Existing contact checks describe a proposed format, not reachability.

## Evidence and remaining gates

Official documentation read on 2026-10-17 (public pages only):

- [Role membership, current PostgreSQL](https://www.postgresql.org/docs/current/role-membership.html)
  and [PostgreSQL 16 GRANT](https://www.postgresql.org/docs/16/sql-grant.html): SET/INHERIT/ADMIN options.
- [PostgreSQL 15 role membership](https://www.postgresql.org/docs/15/role-membership.html): older NOINHERIT model.
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): default denial and bypass caveats.
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api): exposure, grants and RLS.

No target server was contacted. SQL parser/rehearsal and policy/import execution are
NOT EXECUTED: no database test environment is approved; no tool installation is authorized.
Existing UI tests establish UI regression evidence only, not SQL/RLS correctness.

Completed local verification, 2026-10-17:

- Fixture validator passed: 240 records / 17 columns, tab-separated, CP1252/Latin-1
  compatible, four groups of 60, twelve categories of 20; statuses Active 213,
  Inactive 12, Bounced 7, Unsubscribed 8. No source modifications or converted file.
- CSV SHA-256 remains `d4938008f983a48387f4fc2519bbb331eea734d677121e882c2230e59eef557e`.
- All 12 IPX and three archived Smart TSX hashes/sizes match their saved manifests.
  Validator, UI source, dependencies, Downloads and Step 1G helper retain pre-task hashes.
- SQL reverse-diff reconstruction matches the original candidate SHA-256 exactly,
  proving only the two column checks and tuple-constraint removal changed SQL bytes.
  Revised SQL SHA-256: `6056bd877cb788bbe04f8f407da1537dbd112496f66a228b92a3894aa9f18089`.
- Static SQL scope/default-deny checks, Markdown links, whitespace, conflict-marker
  and credential-pattern checks passed. These are not a SQL parser or security audit.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` and `npm.cmd run build`
  passed. Tests: 33 in five files. Lint: 11 informational suggestions, no fixes applied.
  No fresh browser visual testing was performed; approved UI files are unchanged.
- `psql` was not found on PATH; Python pglast/pg_query are unavailable in the checked
  interpreter. Nothing was installed and no alternative database was contacted.
- Git remains main at the baseline above, with nothing staged or committed. Five
  pre-existing candidate/documentation files changed and this one review page was added.
  The prior untracked validator and Step 1G helper remain unchanged.

Exactly one next safe activity: owner review of this proposal, including the separate
BCS development-project choice, before authorizing any isolated database rehearsal.
