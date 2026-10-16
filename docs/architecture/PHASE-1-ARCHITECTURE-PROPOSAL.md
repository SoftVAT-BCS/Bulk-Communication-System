# Phase 1 architecture proposal

Status: OWNER-APPROVED HIGH-LEVEL DIRECTION — CONDITIONAL IMPLEMENTATION CHOICES.
Prepared and public sources checked in Step 2B: 16 October 2026.
Ratified by the owner's Step 2C instruction and full task specification, 16 October 2026.
Exact versions and unresolved details are not finally Accepted. No application was scaffolded,
compiled, installed, started or tested. Public metadata is evidence, not runtime proof.

## Step 2C authority and remaining gates

This section supersedes the Step 2B approval questions below only as stated.
Step 2B research remains historical evidence, not a refreshed compatibility certification.

| Status | Direction / remaining condition |
|---|---|
| OWNER-APPROVED HIGH-LEVEL DIRECTION | One secure standalone/embedded Email & Notification Engine; exact five-page/tab IPX pixel and interaction fidelity, responsive light/dark layouts and accessible keyboard operation |
| OWNER-APPROVED HIGH-LEVEL DIRECTION | React 19 + Next.js 16 + TypeScript; npm workspaces preferred. Node v24.16.0 and npm 11.13.0 are observed tools only |
| CONDITIONAL IMPLEMENTATION CHOICE | One react-select engine behind packages/ui SmartSelect, SmartMultiSelect and SmartSearchLookup wrappers, only with demonstrated IPX checkbox search/Clear/Done, controlled values, disabled/unavailable choices, mobile lookup, async and keyboard parity |
| CONDITIONAL IMPLEMENTATION CHOICE | Headless TanStack Table with server filtering/sorting/pagination; visible-page selection distinct from all matching authorized rows; persistence across pages/filters, explicit include/exclude, safe export and high-density/mobile parity |
| OWNER-APPROVED HIGH-LEVEL DIRECTION | Next web, separately bounded future Fastify API and independently durable worker/queue; portal/provider-independent contracts and adapters; no premature microservices |
| OWNER-APPROVED HIGH-LEVEL DIRECTION | Central PostgreSQL separate from external MySQL, SQL Server, PostgreSQL or authorized APIs; least privilege, tenant/portal isolation, backend permissions, audit, consent/category preferences, deduplication and idempotency |
| OWNER-APPROVED HIGH-LEVEL DIRECTION | SES future delivery with quota-aware pacing and suppression/complaint/bounce feedback; no inbox-placement promises; transactional outbox/queue direction for later detailed review |
| PROPOSED/UNRESOLVED | Exact runtime/package versions and official compatibility/security checks plus owner approval before installation/scaffolding; TypeScript 7.0.2 stays PROVISIONAL |
| PROPOSED/UNRESOLVED | Source provenance/reuse rights and missing FormContext/CSS before any recovered code enters production; static review does not establish tested React parity |
| PROPOSED/UNRESOLVED | Vitest/RTL locally as proposed; Playwright only on an officially supported host/CI, never presumed native Windows 10 support; no WSL/Docker/Windows change authorized |
| PROPOSED/UNRESOLVED | Identity/federation, schema/query layer, selection membership/exclusions/expiry and final send-time revalidation, exact HTTP/job infrastructure, topology and independent backup verification |

Step 2C authorizes only a verified 16-path documentation/reference checkpoint and one
local commit. Original IPX, TSX bytes and historical reports remain immutable.
A fresh Step 2D owner decision is required after remaining gates are resolved; no
scaffolding, installation, live access or application development is authorized here.

## 1. Repository observations and authority

Canonical workspace: E:\Bulk-Communicatio-System. Starting branch main, HEAD
e50dfeadf8cd468cc9cf6a8adb124f8d728a59b5, 34 tracked files, empty staging area and only
the known untracked scripts/BCS_Phase1_Step1G_FirstBaseline.cmd. That helper remains
unexecuted. Step 1C/1E reports record successful historical setup; Git proves the
later first commit. Independent backup verification remains pending.

Observed tools: Git 2.54.0.windows.1 at E:\Programs\Git\Git\cmd\git.exe;
Node v24.16.0 at E:\Programs\node.exe; npm.cmd 11.13.0 at E:\Programs\npm.cmd.
Windows 10 Pro, 10.0.19045/build 19045. No PATH changes. No project manifest,
lockfile, production source, migrations or application test suite exists.

Owner requirements remain the [Project Master](../PROJECT-MASTER.md) and
[decision registry D-001 through D-011](../adr/DECISION-LOG.md): approved IPX, five pages,
shared controls, central PostgreSQL, MySQL/SQL Server/PostgreSQL source support, SES,
standalone/embedded entry and server authorization. This proposal does not choose
a hosting/database provider or authorize deployment or connectivity.

Historical references now exist; their [source review](../reference/SMART-CONTROLS-REVIEW.md)
records integrity, missing FormContext/styles, unknown reuse rights and behavior gaps.
They are excluded from future application imports/build inputs.

## 2. Exact version shortlist and compatibility evidence

These Step 2B versions are illustrative candidates, not approved pins or a lockfile.
Reverify official compatibility and obtain owner approval before installation/scaffolding.
Links target public package metadata read during this review; latest tags can move.
Version-specific links identify the observed candidate. All transitive versions,
native binaries, type packages and peer resolution need review when installation
is separately authorized. An engine range match is not a complete support guarantee.

| Item | Proposed candidate / alternative | External facts and installed compatibility |
|---|---|---|
| Node | 24.22.0 LTS for the proposed build/test baseline; installed 24.16.0 is an observation only | [Official release index](https://nodejs.org/dist/index.json) lists 24.22.0 dated 2026-10-14; [release policy](https://nodejs.org/en/about/previous-releases) lists 24 as LTS, 26 as Current. Installed 24.16 meets the numeric ranges below, but is not the latest patch. No upgrade performed. |
| Next.js | 16.4.2 App Router | [Metadata](https://registry.npmjs.org/next/16.4.2): Node >=20.9.0, React/ReactDOM ^18.2.0 or specified 19 RC or ^19.0.0. [Installation](https://nextjs.org/docs/app/getting-started/installation): Windows supported, TypeScript minimum 5.1; App Router includes framework React canary features. [Support policy](https://nextjs.org/support-policy): 16 Active LTS, 15 Maintenance LTS. |
| React / ReactDOM | Both 19.3.1 | [React metadata](https://registry.npmjs.org/react/19.3.1), [ReactDOM metadata](https://registry.npmjs.org/react-dom/19.3.1): DOM peer React ^19.3.1. These satisfy the Next/react-select/table/testing peer ranges reviewed. No mixed React versions proposed. |
| TypeScript | 7.0.2 provisional current candidate; 5.9.3 comparison only | [7.0.2 metadata](https://registry.npmjs.org/typescript/7.0.2) reports Node >=16.20.0; [5.9.3 metadata](https://registry.npmjs.org/typescript/5.9.3) reports >=14.17. Both exceed Next's documented minimum; this does not prove Next plugin/bundler/type-library compatibility with 7.0.2. The attempted official 7.0 release-notes URL returned 404. Treat major-version integration as an explicit scaffold validation gate, not confirmed support; no automatic fallback to 5.9.3. |
| npm | Retain observed 11.13.0 initially, if approved | [Metadata](https://registry.npmjs.org/npm/11.13.0): Node ^20.17.0 or >=22.9.0. Installed Node qualifies. Latest metadata was 12.2.0; no need to add a package-manager migration merely to scaffold. |
| react-select | 5.10.2 | [Metadata](https://registry.npmjs.org/react-select/5.10.2): React and ReactDOM ^16.8.0 / ^17 / ^18 / ^19. One engine behind wrappers, conditional on IPX acceptance. |
| TanStack React Table | 9.3.1 | [Metadata](https://registry.npmjs.org/@tanstack%2freact-table/9.3.1): Node >=20, React >=18. [Upstream README](https://github.com/TanStack/table/blob/main/README.md) describes a headless table with control over markup/styles and table state features. Do not implement against older v8 examples without checking v9 APIs. |
| Fastify | 5.12.7, later API increment | [Metadata](https://registry.npmjs.org/fastify/5.12.7); [LTS policy](https://fastify.dev/docs/latest/Reference/LTS/) supports current patches of supported Node LTS lines. Its tabular examples still list Node 20/22, so Node 24 CI execution is not proven by that table. Validate on chosen current LTS before API acceptance. |
| Vitest / Vite | 5.0.5 / 8.3.4 for test tooling only | [Vitest metadata](https://registry.npmjs.org/vitest/5.0.5): Node ^22.12 / ^24 / >=26 and Vite ^6.4 / ^7 / ^8. [Vite metadata](https://registry.npmjs.org/vite/8.3.4): Node ^20.19 or >=22.12. Installed Node qualifies. Vite is not a second web application framework here. |
| React Testing Library / jsdom | 16.3.3 / 30.1.3 | [RTL metadata](https://registry.npmjs.org/@testing-library%2freact/16.3.3): React/DOM ^18 or ^19, @testing-library/dom ^10, matching React type peers. [jsdom metadata](https://registry.npmjs.org/jsdom/30.1.3): Node ^22.22.2 / ^24.15 / >=26. Installed Node qualifies. Additional test/type dependencies are not yet fully pinned. |
| Playwright Test | 1.64.1, on a supported host only | [Metadata](https://registry.npmjs.org/@playwright%2ftest/1.64.1): Node >=20. [Current requirements](https://playwright.dev/docs/intro): latest 22/24/26; Windows 11+, Server 2019+ or WSL; specified Linux/macOS versions. Native Windows 10 is not listed. |

Security evidence: [Next advisory GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
lists the image-optimization fix in 16.4.1 (and sharp >=0.35.5); 16.4.2 is later.
The [maintainer advisory index](https://github.com/vercel/next.js/security/advisories)
also contains current cache/server-action/image-response advisories. This is not a
complete vulnerability audit or a claim that every dependency is safe. Before an
authorized install, refresh advisories, verify patched transitive versions and pin
the reviewed graph. Do not use a historical version to avoid supported-host requirements.

Windows evidence has an additional qualification: [Node v24.16 BUILDING.md](https://github.com/nodejs/node/blob/v24.16.0/BUILDING.md)
lists Windows x64 >=10/Server 2016 but excludes vendor-EOL platforms. This machine's
vendor-support entitlement was not checked. Next's general Windows listing therefore
does not establish a fully supported Windows 10 stack in October 2026. Local version
commands succeeded; builds/tests remain unexecuted. Use a supported environment for
acceptance, without upgrading this computer or installing WSL/Docker in this activity.

## 3. Step 2B alternatives and questions, with Step 2C dispositions

### A. Framework and workspace — P-001 / P-008

Recommend Next.js App Router + React + TypeScript, with npm workspaces and one root
package-lock.json in a later authorized scaffold. This follows the preferred stack
and lets shared UI/contracts remain independent of pages. Use client boundaries only
for interactive controls; never import server secrets/adapters into client packages.
Keep dependencies explicit, pin direct versions for review, and later use npm ci
against the reviewed lockfile. Use npm.cmd on Windows to avoid ambiguous npm resolution.

[Official npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/)
supports local workspace packages without an extra orchestrator. An alternative is
pnpm plus an orchestration tool, but its installation/configuration and another lock
format are not justified for this initial scope. A React/Vite SPA would reduce Next
server conventions but diverge from the preferred framework and require separate
routing/server choices. Next Pages Router is another option; App Router is proposed
with stricter client/server boundaries, not because it proves an API/worker design.

Tradeoff: RSC/client boundaries and new TypeScript integration add validation work.
License/cost: Next/React MIT, TypeScript Apache-2.0, npm Artistic-2.0; no package
purchase or hosting commitment. Build/runtime resources still cost money.
UI impact: no template or library theme; retain IPX shell/tabs/tokens.
Acceptance: reviewed dependency resolution, typecheck/build on supported environment,
no server imports in browser bundles and all five routes/tabs present.
Q1 disposition: React 19/Next.js 16/TypeScript direction approved; npm workspaces preferred.
Target runtime and all exact versions require fresh validation and approval; TypeScript 7.0.2 stays provisional.
Any local runtime update requires separate authorization; none occurred here.

### B. One shared select and grid foundation — P-002 / P-005

Recommend react-select behind stable BCS SmartSelect, SmartMultiSelect and
SmartSearchLookup wrappers in packages/ui. Pages use key/label/value/query callbacks,
loading/error/disabled reasons, controlled selection, dependent scope and cancellation
contracts. Separate draft/selection ownership from visual widget internals.
Do not expose react-select internals as every page's public API.

The [upstream react-select README](https://github.com/JedWatson/react-select/blob/master/README.md)
documents controlled state and custom component/style extension points. Configure
one engine for single/multiple/rich-row lookups. Build the IPX checkbox menu, selected
count, Clear/Done and searchable behavior explicitly; neither default chips nor a
mobile sheet copied from the snapshots is automatically approved. No second independent
select engine without a documented exception. Adapting the snapshots instead would
require recovered dependencies, reuse permission, substantial repairs and explicit
resolution of the owner's package requirement. Direct unchanged reuse is unsuitable.

Recommend TanStack Table as headless state machinery for one EnterpriseGrid. BCS still
owns accessible markup, IPX toolbar/checkboxes/status badges, density, column menu,
loading/error/empty states, server query transport, stable keys, export authorization,
preview and page versus all-matching semantics. Headless does not mean these features
arrive as an approved grid. The latest guide URLs attempted during review returned
404; current API-level guidance must be resolved from upstream v9 sources before coding.
Alternative: a stock full grid reduces widget work but introduces appearance/licensing
tradeoffs; hand-writing all table state increases maintenance.

Styling: propose shared IPX-derived CSS tokens plus scoped component styles, no generic
admin theme and no forced Tailwind dependency. Expose theme tokens on popup portal roots,
namespace embedded styles and preserve light/dark/desktop/mobile behavior. A font-stack
name does not prove Inter availability; bundling a font is a later licensed asset choice.

License/cost: react-select and TanStack Table MIT; custom fidelity/accessibility work is
the principal cost. Historical source reuse rights remain unresolved.
Acceptance: synthetic harness comparing IPX at identical data/theme/viewport/zoom; checkbox
search, Clear/Done, selected counts, reset, unavailable/disabled IDs, out-of-order async
responses, dependent groups, keyboard/touch/focus and portal-scope invalidation.
Grid tests must distinguish selection across full matching results from loaded pages.
Q2 disposition: react-select and headless TanStack Table are CONDITIONAL IMPLEMENTATION
CHOICES, dependent on demonstrated IPX and accessibility parity. No snapshot production reuse approved.

### C. Web, API and worker ownership — P-003 through P-009

Recommend a modular application with a Next web process, a later Fastify API in apps/api,
and a separately runnable durable worker in apps/worker. They can share one deployment
environment/release; this is not a microservice mandate. No broker/service is added now.

| Boundary | Owner |
|---|---|
| apps/web / packages/ui | Five pages/tabs, accessible display/input, synthetic fixture adapters initially; no credentials, SQL or provider dispatch |
| packages/contracts | Browser-safe versioned DTOs, scoped keys, query/sort/page/error and selection-intent contracts; no ORM entities/secrets |
| apps/api | Authenticated identity, tenant/portal/action/record authorization, validation, scoped lookup/count/export, draft/campaign commands and audit |
| packages/integrations | Read-only source adapters and authorized portal API contracts; validated identifiers and normalized records |
| packages/notification-core | Recipient plans, class-event revisions, schedules, eligibility/preferences and delivery-state policies |
| apps/worker | Durable claims, current permission/eligibility/suppression revalidation, rate limiting, retries, cancellation and idempotency |
| packages/email-providers | SES adapter and provider result semantics; authentic feedback ingestion feeds central state/suppression |
| central PostgreSQL / database | Reviewed configuration, drafts, plans, jobs, minimal snapshots and audit; no source-database mirroring |
| packages/config | Explicit public/server configuration boundary and validation |

Compare Next Route Handlers: fewer initial processes and useful for a thin same-origin BFF,
but [Next's BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend) says these
public endpoints require explicit access control and are not a full backend replacement.
Do not place durable scheduling in request lifetimes. A Fastify API offers a clear portable
portal integration boundary; costs include HTTP/session/proxy configuration and another
process. Express is a possible simpler routing alternative, but would require more
project conventions for schema/validation. No Express version is selected.
Do not implement both Next business endpoints and Fastify copies of the same rules.

License/cost: Fastify MIT, self-managed runtime operational cost; no hosting provider
selected. UI impact: adapters preserve the same source-neutral controls; permission
controls never grant rights. Acceptance: contract checks and cross-tenant denial before
real records; failure/restart tests before workers send.
Q3 disposition: web/future Fastify API/durable worker boundaries approved conceptually;
exact HTTP/job infrastructure and deployment topology remain open. No scaffolding authorized.

### D. Verification approach and supported route — P-008 / proposed P-011

Recommend Vitest plus React Testing Library/jsdom for unit/component state and DOM
behavior; isolated real test-store integration tests for persistence and authorization;
Playwright for actual browser interactions/visual comparisons. Vitest's Vite tooling
is only for tests. [Vitest guide](https://vitest.dev/guide/) documents its runtime
requirements; [RTL](https://testing-library.com/docs/react-testing-library/intro/)
promotes tests through user-facing DOM behavior. jsdom is not layout or visual evidence.

Preferred supported browser route: an owner-approved existing Ubuntu 24.04 x64 runner
with current Node 24 LTS and Playwright's matched browser builds. Alternative: an existing
Windows 11 machine or supported Windows Server. Availability/access/cost of such a runner
has not been verified. WSL/Docker installation and Windows upgrades are not proposed as
automatic steps. An unsupported native Windows 10 run that happens to execute would not
prove documented support. A manual Windows 10 browser check could supplement, not replace,
supported automated acceptance.

Alternatives: Node's test runner for pure logic reduces tooling but does not cover the
component/visual requirement; browser-only tests are slower and less focused. Do not
downgrade Playwright to evade OS support.
License/cost: Vitest/RTL/jsdom/Vite MIT, Playwright Apache-2.0; runner capacity and browser
downloads have operational cost, with no account or service approved here.
Acceptance: same fixture/time/theme/zoom for IPX and production; all five pages/tabs,
open menus, grid states, 1440x900/1280x800/768x1024/390x844 plus 200% zoom; keyboard,
touch, focus restoration, screen-reader/manual accessibility review, async races,
selection persistence and negative authorization tests as implementations arrive.
Q4 disposition: Vitest/RTL remain proposed. Supported-host Playwright execution/CI is a
future requirement; host access and exact tooling remain unresolved. No tests ran here.

## 4. Decision gates without unnecessary blocking

| Gate | Must settle | Can remain deferred |
|---|---|---|
| Before first synthetic UI scaffold | Q1/Q2; packages/ui/contracts ownership; no-live-I/O fixture boundary; ID/query/selection interfaces; supported verification plan Q4; exclusion of snapshots from builds; provisional version validation/failure stop policy | Hosting, actual identity vendor, database credentials, ORM, broker and SES setup |
| Before real source data | Standalone/federated session trust, issuer/audience/origin/expiry/replay/revocation; tenant/action/record enforcement; read-only mapping grants/allowlists; scope-safe counts/export; secret storage; isolated integration tests; retention and approved schema | Live sending until its own gate |
| Before large recipient execution plans | Frozen versus dynamic all-matching membership, reviewed snapshot/reference, exclusions, expiry and scope binding; explicit IDs and deduplication; no silent membership change when filters change | Optimize storage/virtualization after measured need |
| Before real sending | Durable outbox/queue choice, leases/crash recovery, revision cancellation, idempotency, bounded transient retries, uncertain-provider outcomes, quotas; final permissions/eligibility/consent/suppression check; authentic feedback; sender/domain approval and authorized recipients | Additional channels, regional scaling and advanced analytics |
| Before production | Backup/restore evidence, monitoring, incident response, retention/deletion, deployment/environment separation and explicit release approval | Additional infrastructure only as justified |

Proposed policy direction: use tenant-bound immutable selection intent/reference with
explicit exclusions and expiry; invalidate/revalidate on scope changes. API and worker
recheck eligibility and suppression; a UI total is never send authority. Prefer a
transactional PostgreSQL outbox design for later comparison with SQS rather than
provisioning a broker now. Actual claim/lease/dispatch design remains Proposed.
Source portals retain class ownership; no implicit writes. Central PostgreSQL and SES
remain requirements; ORM, hosting and AWS supporting services remain undecided.

Q5 disposition: security/selection/outbox direction approved for later detailed review;
physical schema, membership/expiry and queue details remain unresolved. No live access.
Q6 disposition: Step 2C authorizes and applies the narrower docs/reference/smart-controls/*.tsx
Git/EditorConfig overrides only. All TSX bytes must match manifest and staged raw-object checks.
Owner confirmation of source reuse rights is required only if production code will be
copied/adapted; missing FormContext/CSS is not permission to invent or fetch unrelated code.

## 5. License evidence and limits

Checked upstream license texts, in addition to metadata:
[Next MIT](https://github.com/vercel/next.js/blob/canary/license.md),
[React MIT](https://github.com/facebook/react/blob/main/LICENSE),
[TypeScript Apache-2.0](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt),
[npm Artistic-2.0](https://github.com/npm/cli/blob/latest/LICENSE),
[Node license with bundled notices](https://github.com/nodejs/node/blob/v24.16.0/LICENSE),
[react-select MIT](https://github.com/JedWatson/react-select/blob/master/LICENSE),
[TanStack MIT](https://github.com/TanStack/table/blob/main/LICENSE),
[Fastify MIT](https://github.com/fastify/fastify/blob/main/LICENSE),
[Vitest MIT](https://github.com/vitest-dev/vitest/blob/main/LICENSE),
[RTL MIT](https://github.com/testing-library/react-testing-library/blob/main/LICENSE),
[Playwright Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE).
Vite/jsdom licenses above were verified in package metadata only. Branch license URLs
can change; retain notices and verify exact installed/transitive artifacts later.
No license or complete dependency bundle was supplied for the historical snapshots.

Research gaps are explicit: TypeScript 7 integration/release notes, TanStack v9 guide
availability/API details, exact Fastify Node 24 execution, Windows vendor-support status,
supported runner access, transitive security/license audit and installed-build behavior.
No public documentation was treated as an instruction to run its installation commands.

## 6. Next activity and separately gated future implementation

Recommended next activity: a separately authorized Step 2D readiness review to resolve
exact supported versions/platform, Smart-source reuse rights/dependencies and the supported
browser-test route before requesting scaffold authorization.

Only after those gates and separate implementation authorization:
build the synthetic reusable UI foundation in the existing workspace — five-page IPX shell
and a focused shared select/grid harness in packages/ui, with browser-safe contracts and
approved tests. No live API/database/worker/provider implementation in that increment.
Validate provisional versions first; stop and report incompatibility rather than silently
changing approved choices. Obtain owner visual acceptance before rolling controls out
through business workflows. No scaffold is authorized. Step 2C separately authorizes
one verified local documentation/reference commit only.

## 7. Step 2B verification record

Documentation/reference checks performed on 16 October 2026:

- Outer ZIP SHA-256 matched the task; five entry bytes matched after import; three
  source sizes/hashes matched the supplied SOURCE-MANIFEST.json.
- All 12 IPX file sizes/hashes matched the original inventory. Starting-hash comparison
  found changes only in the seven authorized existing Markdown files; the other 30
  recorded files (including historical reports, scripts, rules, IPX and both downloads)
  remained unchanged.
- 42 local Markdown file links in the nine authored/updated documents resolved.
- git diff --check and a whitespace scan of the nine documents found no errors.
- Branch main and HEAD e50dfeadf8cd468cc9cf6a8adb124f8d728a59b5 remained unchanged;
  34 tracked files; staged diff empty. Seven new files remain untracked (five reference
  entries plus the two new documents), along with the pre-existing Step 1G helper.
- apps, packages, database and tests still contained zero files. No package manifests,
  lockfiles, installs, migrations, builds, application tests, browsers or services ran.

These are historical Step 2B documentation/integrity checks, not application test results.
Owner review was pending then; Step 2C dispositions above record the later conditional ratification. Historical setup checksum reports were not regenerated after authorized edits.
