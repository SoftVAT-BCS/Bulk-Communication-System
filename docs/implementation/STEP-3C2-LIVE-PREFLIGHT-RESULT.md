# Step 3C-2 — live private preflight result

17 October 2026. **Verified administrative read-only connectivity; stopped before provisioning on effective-privilege security gates.** This is not completed dynamic application integration. Owner authorization is present and is not being requested again for ordinary provisioning.

## Administrative connection and TLS

The owner-provided `.local/bcs-admin.env` and `.local/prod-ca-2021.crt` exist and are ignored by Git. Configuration was parsed privately; only field-presence and validation booleans were printed. The project-reference field contained a recognized project URL, not a bare reference. The preflight safely extracted its reference and verified it against the connection username and regional pooler hostname; it did not guess an endpoint or alter private values. Project label bcs-dev and region ap-south-1 matched the private configuration. Database `postgres` was confirmed by SQL. Project/organization names remain owner-supplied labels; no other project or management API was accessed.

Connection used the supplied ap-south-1 Supabase pooler endpoint, official CA, mandatory certificate verification and default pg/Node hostname verification. The encrypted connection reported authorized=true and TLSv1.3. No insecure retry occurred. The user's rotated-credential assertion was used; password rotation cannot be independently established by a successful login, and the old conversation password was never read or compared. Administrative credentials were used ONLY for the authorized one-time preflight, never application runtime.

All SQL executed here was inside READ ONLY transactions, followed by ROLLBACK. Queries returned BCS counts and privilege/catalog metadata only. No account, grant, password, migration or business record was changed. No credentials or complete connection values appear in this report or helper source. Ignored helper: `.local/bcs-private-preflight.cjs`; it reads private config in memory and emits only controlled results/error codes.

## Actual database observations (administrative read-only connection)

| Check | Actual result |
|---|---:|
|BCS base tables|57|
|BCS FORCE RLS tables|57|
|Migration records|9|
|Existing BCS policies|0|
|Dedicated bcs_recipient_reader role exists|No|
|Companies / portals|1 / 1|
|Recipients in exact synthetic company/portal|240|
|Active|213|
|Inactive|12|
|Bounced|7|
|Unsubscribed|8|
|Groups|4|
|Subgroups|12|
|Recipient memberships|240|

Scope lookup used exact codes softvat-bcs-demo and skillmonk-demo and parameterized private UUIDs. UUIDs were not printed. These counts match the requested fixture, but were **not** obtained using a restricted reader. Detailed enriched-field, stable paging and dynamic API checks using that reader remain pending. A single company/portal also limits future cross-tenant production acceptance.

## Genuine security blockers discovered

The proposed reader has no role memberships, but every PostgreSQL role still receives applicable PUBLIC privileges. The existing strict migration/runtime guards would reject the following effective access:

| Existing PUBLIC privilege | Conflict |
|---|---|
|TEMPORARY on database postgres|Reader could create temporary tables; violates the strict no-DDL gate|
|SELECT on extensions.pg_stat_statements_info|Additional view read outside the six-table allowlist|
|SELECT on extensions.pg_stat_statements|Additional view read outside the six-table allowlist; query-statistics content was NOT read|
|EXECUTE on public.rls_auto_enable (SECURITY DEFINER)|Current guard rejects callable non-system SECURITY DEFINER grants; owner/DBA must inspect this managed trigger function's invocation/dependencies before classifying/remediating it|

Only ACL metadata was inspected for extension/public objects; no view rows or function bodies were read, and no function was invoked. The existence of a SECURITY DEFINER grant alone does not prove an exploitable bypass. It is a failed gate requiring review, not evidence of exploitation.

A per-role REVOKE cannot subtract permissions inherited from PUBLIC. NOINHERIT and default_transaction_read_only do not solve that problem. Existing instructions explicitly prohibit automatically removing broader privileges or weakening safeguards. Therefore migration010 was **not executed**, not even as a trial; the current code's gates were retained. No reader credential was generated, no apps/web/.env.local was created, and database mode was not enabled.

## Reviewable remediation boundary — NOT AUTHORIZED OR EXECUTED HERE

A separate owner/DBA impact review must determine which managed and application roles need each of the four PUBLIC rights above. Check role memberships, explicit ACLs, database ownership, monitoring consumers and the managed RLS trigger's dependencies. Preserve existing required access with narrowly reviewed explicit grants before removing PUBLIC grants. Review Supabase support/operational requirements for managed extension and event-trigger objects; do not blanket-revoke privileges from all schemas/functions/tables.

Candidate change boundary, for a separately approved transaction after impact review: remove only the identified inherited privileges that conflict with the reader, preserving required existing roles' access explicitly, and record exact original ACLs for rollback. No executable broad-revocation script is supplied without the dependency/role review. Do not add exceptions to the reader's guard simply to make provisioning pass. If these managed privileges cannot be changed safely, stop and agree a different deployment/security boundary rather than claiming this reader meets the current strict contract.

Then re-run metadata preflight before executing the already-authorized010 provisioner. Generate the new reader credential only after the gates pass; use a private non-logging provisioning method and save only its credential in ignored apps/web/.env.local. The admin config must remain outside the application environment. Verify with the actual restricted identity before enabling database mode.

## Application and test boundary

Existing server endpoints remain implemented: GET /api/bcs/v1/audience/options, GET /api/bcs/v1/recipients and GET /api/bcs/v1/recipients/[id]. They retain tenant-bound SQL, parameterized filters, pagination/sorting, safe errors, production rejection and verified TLS requirements. Existing synthetic mode remains unchanged. Select-all-matching in database mode remains unavailable by the documented contract, as expressly permitted in the latest instructions.

NOT RUN because the role does not exist: restricted-role TLS/login, authorized reads, missing/malformed/wrong company/wrong portal isolation, restricted-role DML/DDL catalog denials, transaction scope reuse against PostgreSQL, enriched detail verification, database-backed API integration and desktop/mobile dynamic browser interactions. No substitute administrative result is presented as a restricted-role success. No new visual acceptance claim is made.

Local validation results and preservation checks are appended below after completion. No local commit will be made because required security/integration gates have not passed. No staging/push, real mail, SES, data import, cross-project access or migrations001–009 execution occurred.

## Next activity

**Owner/DBA review of the four inherited PUBLIC access paths and approval of a narrowly scoped remediation that preserves required managed-role behavior.** This is a new shared-privilege change outside the permission-grant scope, not another request to authorize the already-approved reader provisioning.

## Final local validation and changed-file inventory

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS;14 informational template suggestions, no errors/warnings.
- npm.cmd test:75/75 PASS across8files (13.05seconds).
- npm.cmd run build:PASS; five existing page surfaces and three dynamic read API routes retained.
- git diff --check:PASS.
- Preservation:80 protected files match this turn's saved hashes; all12IPX original baseline hashes match; archival controls/UI/editor, migrations001–009 and seeds unchanged. Generated next-env.d.ts restored to its exact turn-start bytes after build.
- Staging:none. Commit:none; all-gates-pass condition not met. HEAD remains44eeb3f6b983da76279ba87dd468202e8feba5e3 on main.

Changed existing files THIS turn: docs/implementation/STEP-3C2-RESTRICTED-DATABASE-ACCESS.md, docs/architecture/DATABASE-ARCHITECTURE.md and docs/handover/WORK-STATUS.md (appended execution evidence). New report: docs/implementation/STEP-3C2-LIVE-PREFLIGHT-RESULT.md. Ignored local evidence/helper files: step3c2-live-before.json, step3c2-live-next-env-before.txt, bcs-private-preflight.cjs and step3c2-live-lint.txt under .local. Owner admin environment/certificate contents were not modified or copied into runtime. Prior uncommitted implementation files remain preserved.

Final Git status (includes earlier uncommitted work):

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
?? docs/implementation/STEP-3C2-LIVE-PREFLIGHT-RESULT.md
?? docs/implementation/STEP-3C2-RESTRICTED-DATABASE-ACCESS.md
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? scripts/validate_recipient_csv.py
?? tests/reader-config.test.ts
?? tests/recipient-database-ui.test.tsx
?? tests/recipient-server.test.ts
```

## Resolved by Step 3C-2B

The separately authorized focused remediation is now executed and the actual restricted-reader integration passes. See [final result](STEP-3C2B-DYNAMIC-INTEGRATION-RESULT.md); retain this earlier preflight as history.
