# Proposed bcs-dev deployment package — no SQL executed

The original migrations 022–025 and the 010 proposal are byte-preserved. The five
separate deployment variants carry explicit owner-context, backup-hash, database,
role and predecessor guards. They are not standalone scripts: the wrapper owns one
atomic transaction, pins search_path, sets 3s lock/30s statement limits and acquires
an advisory deployment lock. Normal PostgreSQL object creation rejects conflicts.
No original guard is edited, no old migration is rerun, and no runtime string
replacement is performed by the deployment wrapper.

## Reviewed differences and remaining review

- 022: same additive simulation fields and truthful receipt constraints.
- 023: intended database is postgres; worker is **NOLOGIN**, no password or company
  scope is seeded. Original isolated worker still requires its exact loopback
  disposable database and marker. This package does not enable a bcs-dev worker.
- 024: original private_embed_exchange `USING(true)` is unsuitable for approval
  without separate isolation acceptance. The deployment variant uses **false/false**;
  embedding stays unavailable. Existing Auth/session mapping is unchanged.
- 025: same independent review and quota triggers. Every existing company needs an
  owner-approved active plan with contacts/users/portals limits before deployment,
  otherwise new insertions will intentionally fail. No subscription is fabricated.
- 026: reuses the existing recipients.import catalogue entry. Adds only owner/receipt
  columns on existing import batches and narrow session import policies/column grants.
  No new business table, unique-email constraint or automatic role assignment.

All new security-definer functions retain pg_catalog search_path, explicit caller
checks and PUBLIC execute revocation. Ownership remains the existing postgres role;
the package neither grants BYPASSRLS nor changes that role. Privileged ownership,
trigger behavior, cross-tenant denial and concurrency still need actual isolated
PostgreSQL acceptance. Source review and dry-run hashes cannot establish those facts.

## Operator prerequisites and gated command

First obtain a verified logical/physical database backup covering schema, data,
roles, grants, policies and project-specific dependencies, with a successful restore
into a separately authorized disposable environment. Record hashes and the exact
restore commands/logs. A source ZIP and a dashboard backup feature are insufficient.
Never put passwords/URLs on a shared command line or in this repository. Use the
existing private operator environment and a matching official PostgreSQL toolchain.
Do not execute restore/adversarial tests on bcs-dev.

Fresh read-only inspection (existing private bcs-dev loader required):

```cmd
cd /d E:\Bulk-Communicatio-System
node.exe scripts\bcs-integration-preflight.cjs
node.exe scripts\bcs-reviewed-deployment.cjs --dry-run
```

Only after explicit owner approval, create the ignored private evidence file
`.local/bcs-deployment-approval.json` with these fields:

- authorization: BCS_DEV_022_026_OWNER_APPROVED
- packageHash: exact dry-run package hash
- targetProjectReference: exact existing private BCS_ADMIN_PROJECT_REF value
- approvedBy and approvedAt: responsible owner and ISO instant, at most one hour old
- schemaFingerprint: fresh read-only preflight fingerprint
- migration010SourceSha256 and migration010ProvenanceAccepted: independently reviewed
  historical provenance. The actual ledger has no checksum column; a matching
  description is not proof of applied source-byte identity.
- backup, restoreProof, isolatedAcceptanceProof: each an absolute private file path
  plus sha256. Operator attests successful independent restoration and acceptance;
  a file hash alone does not prove that a restore/test succeeded.

After review and explicit approval only:

```cmd
cd /d E:\Bulk-Communicatio-System
node.exe scripts\bcs-reviewed-deployment.cjs --apply
node.exe scripts\bcs-integration-preflight.cjs
```

The wrapper rejects changed sources, wrong target/role, stale schema, wrong ledger,
existing worker, missing permission, missing/changed evidence or failed postflight.
It checks all 60 original tables retain FORCE RLS. Its atomic transaction rolls back
on failure; investigate errors rather than rerunning blindly. `postflight-read-only.sql`
adds safe catalog queries without exposing recipient/session data.

No database backup, restore rehearsal, write approval or isolated execution was
supplied in this assignment. **Deployment BLOCKED.** The wrapper's apply path is
prepared source, not execution-tested. No production readiness or enablement follows.

Recovery: retain additive fields; disable new application entry points and worker.
Do not DROP/TRUNCATE or rewrite ledger entries. Restore only using the independently
reviewed backup procedure and a separate recovery authorization.

References checked 19 October 2026: [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html),
[Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
FORCE RLS does not constrain a superuser/BYPASSRLS role; restricted-role execution
and definer review are mandatory acceptance evidence.
