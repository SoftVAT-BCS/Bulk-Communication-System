# Decision log

Prepared: 16 October 2026. This is a registry, not a claim that formal technical ADRs exist.
**Owner-confirmed** below records prior explicit requirements; **Proposed** requires review.
Nothing is automatically approved merely because an assistant generated this document.

## Owner-confirmed requirements and workspace decisions

| ID | Decision | Evidence/status |
|---|---|---|
| D-001 | Dedicated project/chat label BCS Phase 1; product working name Universal Notify | Owner chat and original handover |
| D-002 | Canonical workspace `E:\Bulk-Communicatio-System`; IPX at `IPX/IPX-BCS` | Owner screenshots/CMD, 16 October 2026; spelling intentional |
| D-003 | Preserve approved IPX; five main pages with page-level tabs | Original handover and explicit UI requirements |
| D-004 | No UI compromise; searchable multi-select and advanced grids must match IPX | Owner request, 16 October 2026 |
| D-005 | Shared reusable controls instead of page-specific duplicate widgets | Owner request and handover |
| D-006 | MySQL, Microsoft SQL Server, PostgreSQL sources; secure API/connector integration | Original handover |
| D-007 | Independent central PostgreSQL data store and configurable mapping | Original handover logical requirement, not provisioning approval |
| D-008 | Amazon SES selected; controlled sending, suppression/preferences and feedback required | Original handover; actual quotas/configuration unknown |
| D-009 | Standalone/integrated modes and server-enforced portal/action rights | Original handover |
| D-010 | Exact CMD instructions, one activity at a time, durable Markdown context | Owner request |
| D-011 | Production folder boundaries under apps/packages/database/docs/scripts/tests | Step 1B explicitly requested and creation confirmed |

## Technical direction and remaining decisions

| ID | Topic | Status / question |
|---|---|---|
| P-001 | Framework/runtime/package manager | OWNER-APPROVED HIGH-LEVEL DIRECTION: Next.js 16/React 19/TypeScript; npm workspaces preferred. Exact runtime/packages require compatibility checks and approval; TypeScript 7.0.2 PROVISIONAL |
| P-002 | Smart controls and grid library | CONDITIONAL IMPLEMENTATION CHOICE: react-select wrappers and headless TanStack Table only with demonstrated IPX/accessibility parity; recovered-code dependencies/provenance/reuse rights unresolved |
| P-003 | Authentication/session/federation | Choose standalone and embedded trust contracts before protected data access |
| P-004 | Central schema and query layer | Review physical model, isolation, migrations, retention and test environment |
| P-005 | All-matching recipient selection | Define stable selection intent, snapshot membership, exclusions, expiry and final review |
| P-006 | Durable scheduling/dispatch | Choose queue/outbox/worker strategy, uncertain outcomes and retry rules |
| P-007 | AWS supporting services | Justify SQS, S3 and feedback routing rather than provisioning everything by default |
| P-008 | Local/hosted development and production | Confirm Windows prerequisites, cost, environment separation and deployment plan |
| P-009 | Source-owned class scheduling | Default source ownership; any authorized write/in-engine schedule ownership needs a specific contract |
| P-010 | Baseline/version control | Original pre-initialization question retained historically; rules and main/e50dfea baseline now verified. Step 2C authorizes one verified local checkpoint and archival TSX-only Git/editor rules. Independent backup remains pending; no push |
| P-011 | Testing foundation | Proposed Vitest/RTL plus Playwright on an approved supported host; native Windows 10 is not listed by current Playwright requirements |

Step 2B proposals and approval questions Q1-Q6 are in
[PHASE-1-ARCHITECTURE-PROPOSAL](../architecture/PHASE-1-ARCHITECTURE-PROPOSAL.md).
The [Smart controls review](../reference/SMART-CONTROLS-REVIEW.md) records static source
evidence and import integrity. Step 2C owner instruction conditionally ratifies the high-level
direction; exact versions and unresolved details are not finally Accepted. Existing IDs remain.

Step 2C approval evidence: owner message and Downloads/BCS_Phase1_Step2C_Codex_Prompt.txt,
16 October 2026. Next web/future Fastify API/durable worker boundaries are approved
conceptually; deployment and exact HTTP/job infrastructure remain open. Central PostgreSQL,
least-privilege multi-database/API adapters, tenant/portal isolation, backend permissions,
audit, consent/preferences, deduplication/idempotency and outbox/queue direction are approved
for detailed design. SES remains future delivery only. P-003 through P-009 retain their
unresolved implementation questions. Vitest/RTL remain proposed; supported-host Playwright
execution/CI is required, with no native Windows 10 support assumed. Step 2D/readiness and
any implementation require fresh authorization; this checkpoint does not authorize development.

## How to record a new ADR

Use an unused filename `ADR-NNNN-descriptive-title.md`. Record context, alternatives,
proposed decision, consequences, security/privacy, UI impact, cost/prerequisites, testing,
rollback/migration and approval evidence. States: Proposed, Accepted, Rejected or Superseded.
Include an owner approval date/reference before Accepted. Do not invent ADR numbers for
an implementation that has not been discussed. Update this registry and the relevant
source-of-truth document after an accepted change.
