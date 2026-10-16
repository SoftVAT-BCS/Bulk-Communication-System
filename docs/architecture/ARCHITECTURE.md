# BCS production architecture

Status: **Proposed logical architecture; no technical ADR accepted by this document.**
Folder creation is complete; executable application scaffolding is not.

## Boundaries mapped to the created folders

| Folder | Responsibility | Must not do |
|---|---|---|
| `apps/web` | Shared application shell and five pages, UI orchestration | Own source database credentials or implement sending in the browser |
| `apps/api` | Authenticated API, authorization, validation and workflow coordination | Treat hidden UI controls as permission enforcement |
| `apps/worker` | Durable job processing, controlled dispatch and retry coordination | Send without revalidating current rights/eligibility/suppression |
| `packages/ui` | Theme tokens and reusable display/input components | Depend directly on a portal schema or AWS SDK |
| `packages/contracts` | Versioned request/response, normalized data and event contracts | Mix browser-safe DTOs with credentials/internal database records |
| `packages/config` | Validated server/client configuration boundaries | Expose a server secret in a public configuration export |
| `packages/integrations` | Read-only database and authorized API adapters | Introduce arbitrary SQL or implicit writes to source systems |
| `packages/notification-core` | Templates, recipient plans, schedules and delivery policies | Depend on a particular portal UI or database column spelling |
| `packages/email-providers` | Provider adapter boundary, initially SES | Let pages bypass the notification engine |
| `database` | Reviewed central migrations and synthetic seeds | Run a migration merely because a folder exists |
| `tests` | Layered functional/security/visual verification | Treat illustrative demo behaviour as production evidence |

These are code ownership boundaries, not a commitment to many independently deployed
microservices. Separate API and worker folders do not decide the HTTP framework, process
layout, hosting vendor or deployment topology.

## Preferred candidates from the handover

React/Next.js, TypeScript, Node.js and PostgreSQL are preferred. Amazon SES is already a
product delivery decision. Queue implementation, object storage deployment, identity
provider, ORM/query layer, package manager, grid implementation and exact versions remain
open. The owner requests React Select-style searchable controls; the library/reuse decision
must preserve the IPX contract and be reviewed with the supplied Smart control patterns.
Do not silently substitute default HTML selects or default library visuals.

Before scaffolding, review compatible supported versions, licensing, security posture,
Windows development prerequisites, operational cost and deployment constraints using
current official sources. Do not inherit another project's runtime or cloud configuration.
Do not require Docker/WSL until the chosen development approach justifies it and the owner
approves installation.

## Proposed request and delivery flow

Authorized user -> web UI -> scoped API -> common model -> source adapter / central store.
Approved campaign intent -> durable recipient/job plan -> worker -> provider adapter -> SES.
Authenticated provider feedback -> verified event ingestion -> idempotent state update ->
authorized reports/dashboard and suppression updates.

A schedule/event change updates notification intent and invalidates obsolete pending work.
Already submitted mail cannot be recalled; show the actual outcome instead of pretending
cancellation reverses provider acceptance. Do not promise exactly-once external delivery:
define idempotency and uncertain-outcome handling in the dispatch design before live sending.

## Contracts to settle before implementation

- Trusted tenant/portal context, authenticated principal and action/record authorization.
- Normalized groups, subgroups, recipients, source keys, preferences and class events.
- Search/filter/sort pagination contract with allowlisted fields and safe limits.
- Explicit-ID versus all-matching selection intent, exclusions, expiry and recipient review.
- Draft/campaign revisions, scheduling timezone, cancellation and duplicate event handling.
- Sender identity/configuration scope, quotas, dispatch outcomes and event correlation.
- Errors with safe messages, correlation IDs and field-level validation details.
- Audit events, retention rules, attachment authorization and export permissions.

The backend must not trust totals, recipient lists, sender identities, permission toggles
or portal selectors submitted by the browser. Validate them against current authoritative
records. Source-specific adapter code normalizes data; UI pages remain source-neutral.

## Architecture gate

Record each significant choice in `docs/adr/DECISION-LOG.md` with alternatives, rationale,
consequences, cost/prerequisites and owner approval. Add a focused ADR file only for an
actual decision under review. Do not create false Accepted ADRs or placeholder technical
claims. Authentication and tenant-isolation contracts must precede real recipient access,
even though their fuller implementation appears later in the product roadmap.
