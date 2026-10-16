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

## Pending technical decisions

| ID | Topic | Status / question |
|---|---|---|
| P-001 | Framework/runtime/package manager | Proposed React/Next.js + TypeScript/Node.js; verify exact choices/versions |
| P-002 | Smart controls and grid library | Review actual TSX references, React Select integration, accessibility, compatibility and licensing without weakening IPX |
| P-003 | Authentication/session/federation | Choose standalone and embedded trust contracts before protected data access |
| P-004 | Central schema and query layer | Review physical model, isolation, migrations, retention and test environment |
| P-005 | All-matching recipient selection | Define stable selection intent, snapshot membership, exclusions, expiry and final review |
| P-006 | Durable scheduling/dispatch | Choose queue/outbox/worker strategy, uncertain outcomes and retry rules |
| P-007 | AWS supporting services | Justify SQS, S3 and feedback routing rather than provisioning everything by default |
| P-008 | Local/hosted development and production | Confirm Windows prerequisites, cost, environment separation and deployment plan |
| P-009 | Source-owned class scheduling | Default source ownership; any authorized write/in-engine schedule ownership needs a specific contract |
| P-010 | Baseline/version control | Review backup, ignore and line-ending rules before Git initialization and any initial commit |

## How to record a new ADR

Use an unused filename `ADR-NNNN-descriptive-title.md`. Record context, alternatives,
proposed decision, consequences, security/privacy, UI impact, cost/prerequisites, testing,
rollback/migration and approval evidence. States: Proposed, Accepted, Rejected or Superseded.
Include an owner approval date/reference before Accepted. Do not invent ADR numbers for
an implementation that has not been discussed. Update this registry and the relevant
source-of-truth document after an accepted change.
