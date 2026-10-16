# Database and integration architecture

Status: **Logical requirements and proposed contracts only. No SQL/migrations executed.**
Source basis: original handover sections 7-10, 16, 20 and 23.

## Ownership

Universal Notify has its own central PostgreSQL database. Each connected portal retains
its source database and business rules. Central configuration must not imply authority to
change source records. Initial source access is read-only. No existing SoftVAT, SkillMonk,
SAMATVA, HCX or other project database may be accessed during foundation setup.

## Candidate central record groups

| Area | Information to model; physical tables/names not decided |
|---|---|
| Organization/integration | Tenant and portal registrations, approved connection metadata, secret references, mapping versions |
| Identity/access | Principals or federated subjects, memberships, role/action grants and authorized organizational scope |
| Composition | Templates, categories, drafts, personalization field definitions and attachment metadata |
| Recipient plan | Source references, selection intent, exclusions and the minimum required execution snapshot |
| Scheduling | Business-event identity/revision, notification rules, scheduled jobs and cancellation state |
| Delivery | Campaigns, attempts, uncertain outcomes, provider message references and feedback events |
| Preferences | Consent/basis references, category preferences, unsubscribes and scoped suppression |
| Governance | Append-only audit events as appropriate, retention/deletion bookkeeping and mapping change history |

Avoid copying full source profiles when only an ID, address and approved personalization
fields are required. Define retention and encryption before retaining recipient snapshots.
A schema diagram is not evidence that a central database has been provisioned.

## Source adapter contracts

Support MySQL, Microsoft SQL Server and PostgreSQL through explicit adapters, and an
authenticated portal API contract where available. Connection settings vary by method:
a portal API is not a SQL database engine and should not require meaningless SQL fields.
This is a production clarification of the IPX configuration examples, not permission to
redesign the approved page layout without review.

Discover only permitted schemas/views/columns. Test Connection checks connectivity;
Validate Mapping checks approved fields and relationships; Preview Data returns a limited,
authorized sample. A successful connection does not prove recipient authorization or
mapping correctness. Never report these checks as successful based on static demo labels.

Mappings cover stable source keys, display name, email, groups/subgroups and relationships,
active rules, eligibility/preferences, class identity/time and approved optional fields.
Treat identifiers differently from values: values are parameterized and identifiers come
from validated allowlists. Do not accept arbitrary joins or administrator-authored SQL.
Use a reviewed view or explicit adapter contract where complex relationships are needed.

## Common data and query rules

Define source-neutral records with a stable portal-scoped source identity. Use display
labels and column definitions supplied through approved configuration, not hard-coded
student/customer/hospital field names in reusable controls. Missing optional fields must
be handled explicitly; missing required fields block mapping activation.

The API scopes every search, count, page, preview and export. Sorting has a stable tie-breaker.
Search/filter/sort fields are allowlisted; page sizes and preview limits are bounded.
Use server-side selection references for large matching sets instead of fetching all records
into the browser. Preserve the user's reviewed selection intent when filters change.
Snapshot versus dynamic membership and selection expiry require an explicit ADR.

Revalidate authorization, preferences and suppression at final send time. Define an audited
deduplication policy for repeated email addresses and different personalization values;
do not deduplicate across unrelated tenant boundaries or silently merge different people.
Empty results and permission-denied results must not leak unauthorized recipient counts.

## Concurrency and scheduling proposals

Use explicit versions for editable records and stable idempotency keys for relevant actions.
Associate notification jobs with the class/event revision so reschedules and cancellations
can invalidate old reminders. Store unambiguous execution instants and the intended timezone
context; establish timezone defaults with the owner rather than hard-coding a browser clock.

A durable dispatch/outbox and retry design must be reviewed before real sending. Handle
an ambiguous provider response without blindly resending. The UI must display unknown or
pending reconciliation states honestly. No concrete table or index is approved yet.

## Migration gate

Before any migration: confirm the exact environment, authorize changes, review schema,
isolation, grants/least privilege, backup/recovery, forward/rollback strategy and tests.
Keep development/test/production configurations separate. Use synthetic fixtures. The
`database/migrations` and `database/seeds` folders stay empty in Step 1C.
