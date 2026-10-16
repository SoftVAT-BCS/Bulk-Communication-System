# Universal Notify - Project Master

## Identity and objective

BCS means Bulk Communication System. The dedicated project/chat is **BCS Phase 1**.
The working product name remains **Universal Notify**. **IPX - Interactive Product
Experience** is the owner's internal presentation standard, not an exclusivity claim.

Build one secure, reusable, database-independent and portal-independent email and
notification engine. Education and learning portals are the initial use case; CRM,
SoftVAT-related applications, SAMATVA HMS, ERP and other portals are future integrations.
Those source applications keep their own data, identity and business rules. They must
not require duplicated communication page implementations.

Canonical workspace: `E:\Bulk-Communicatio-System`.
Approved offline reference: `E:\Bulk-Communicatio-System\IPX\IPX-BCS`.
Use the exact spelling; do not create a similarly named alternative project.

## Confirmed scope

| Main page | Page-level tabs / purpose |
|---|---|
| Dashboard | Independent, authorized portal-specific or consolidated operational overview |
| Communication | Recipient Selection; Compose & Send; Templates |
| Scheduling | Class Schedule; Reschedule & Cancellation; Email Queue |
| Reports | Overview (Summary Reports in the handover); Delivery History; Bounces & Unsubscribes |
| Configuration | Portal & Database; Table & Column Mapping; Amazon SES; User Rights |

These are five logical pages. `index.html` and `dashboard.html` are two entry files for
the same IPX dashboard, not a sixth product page. Preserve the actual approved IPX labels.

The communication workflow includes group/subgroup multi-search and multi-selection,
advanced recipient grids, persistent selections, personalized HTML/plain-text composition,
templates, draft saving, recipient preview, attachments/secure links, authorized test
sending, immediate sending and future scheduling. The production composer must go
beyond the prototype's illustrative textarea without losing the approved surrounding UI.

Educational notifications cover new schedules, reschedules, cancellations, configurable
reminders, newsletters and general communications. Obsolete reminders must be invalidated.
Source portals own class schedules unless a separate contract explicitly assigns ownership
to Universal Notify. A demo edit control is not permission to update a source database.

Operational reporting covers campaigns, portals, groups, subgroups, recipients, dates,
scheduled versus actual sends, retries, suppression, bounces, complaints and queue health.
Exports must obey authorization. Keep provider submission/acceptance separate from delivery
and never equate delivery with inbox placement or a person reading the message.

## Integration and delivery requirements

- Source database support: MySQL, Microsoft SQL Server and PostgreSQL. Modern portal APIs
  are preferred where appropriate; legacy connectors use restricted read-only access,
  approved views and validated mappings. Other engines remain future candidates.
- Standalone and embedded/integrated entry modes share the same business engine.
  Parent-portal identity and scope must be validated, not trusted from browser parameters.
- A central PostgreSQL store is separate from source databases. It retains configuration,
  templates, jobs, necessary recipient snapshots, delivery events, audit and preferences;
  it must not mirror entire source databases without justification.
- Amazon SES is the selected production email provider. Initial planning volume is
  approximately 1,000-5,000 emails/day, not a verified SES quota.
- Controlled queueing, rate limits, transient retries, priority, cancellation,
  suppression, consent/preferences and delivery feedback are required.
- Amazon S3 is the preferred file-store candidate; SQS and feedback routing services
  require a justified architecture decision. Do not assume all AWS services are approved.

## Non-negotiable user experience

The owner explicitly requires no compromise on the approved IPX design, searchable React
select/multi-select behaviour, advanced grids and reusable controls. Every page must use
shared components rather than individual look-alike implementations. Desktop, laptop,
tablet and mobile are required. Exact component and visual acceptance lives in the
standards documents; do not repeat or weaken those rules here.

## What is complete and what is not

Owner-approved: IPX visual direction, five-page navigation and the core business scope.
Observed: the offline prototype and the new production folder foundation exist locally.
Step 2B reconciliation, 16 October 2026: setup reports record success; Git main/e50dfea
contains the 34-file baseline. Step 2A intake is complete. Historical Smart sources are
now imported for reference only; see the [source review](reference/SMART-CONTROLS-REVIEW.md).
Step 2C records OWNER-APPROVED HIGH-LEVEL DIRECTION for React 19/Next.js 16/TypeScript,
preferred npm workspaces, future Fastify API/durable worker boundaries and secure
multi-portal/data architecture. react-select and headless TanStack Table are CONDITIONAL
IMPLEMENTATION CHOICES requiring exact IPX/accessibility parity. The
[ratified proposal](architecture/PHASE-1-ARCHITECTURE-PROPOSAL.md) distinguishes these from
unresolved exact versions (TypeScript 7.0.2 remains provisional), compatibility, source
provenance/reuse rights and supported testing environment. Step 2D and any scaffold need
fresh owner authorization; the local documentation commit is not development approval.
Not yet established at this checkpoint: a production framework, API, database schema,
authentication, actual connector, queue worker, SES sending, real reports, production
hosting or application test suite. Browser-saved demo templates do not establish backend
persistence. The screenshot's example metrics and rates are not live operational data.

Partner feedback remains a review input. It must be categorized as a defect, clarification,
visual change or scope change; only accepted changes alter the baseline.

## Working method and authority

ChatGPT plans/reviews; Codex implements approved increments; the owner approves important
decisions. Use exact CMD commands and one activity at a time. Keep source-of-truth Markdown
updated to avoid repeating full instructions. Git history now provides the verified baseline;
independent backup verification remains pending. Do not rerun historical installers to
undo later authorized documentation changes.

Source: the owner's original handover (archived under `docs/reference`), the 16 October
2026 workspace screenshots/CMD transcript, and the explicit UI/reuse/documentation requests
in the BCS Phase 1 chat. The source handover is retained in full rather than silently abridged.
