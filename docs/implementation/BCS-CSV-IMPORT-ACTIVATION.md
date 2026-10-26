# CSV-only bcs-dev activation review — 19 October 2026

Status: PREPARED; database activation and one-contact persistence acceptance await explicit owner approval and verified backup/restore evidence. No schema SQL, data import or sending was executed. Application source was not changed in this task.

## Actual read-only findings

Existing bcs-dev verified with the existing private connection loader and verified TLS, in READ ONLY transactions. Ledger is exactly 001–021. Catalog: 60 tables, 582 columns, 445 constraints, 147 indexes, 110 policies, 10 triggers; all 60 tables have enabled and forced RLS. Backend role has no superuser, BYPASSRLS, role/database creation or replication privileges and no inherited memberships. Catalog table grants show no anon/authenticated/PUBLIC access to BCS tables. Dashboard Data API exposure settings were not independently inspected; this migration grants none of those roles access.

Company softvat-bcs-demo / portal skillmonk-demo contains 240 recipients. Aggregate baseline fingerprint: 203944bbb5b9d90003d457d13a534c9a. No collision for the proposed one-contact test identifier/email. Live recipient contents are not reproduced in this report.

Development plan IS assigned: bcs_dev_internal / BCS Internal Development, active plan and current trial subscription, max_contacts=10000, max_live_emails=0. Older documentation saying the plan is missing is superseded by this read-only observation. No subscription was changed. Existing CSV code does not implement per-import plan quota accounting; do not interpret assignment as quota-enforcement acceptance.

## Compatibility and correction

Reviewed existing CSV server transaction, existing recipients.import authorization, session_allows, current policies/constraints and column/table grants. Existing company/portal/target uniqueness, batch idempotency, taxonomy and receipt/audit tables are sufficient. Optional recipient profile writes need the 11 column grants; receipt storage needs two columns. No dependency on migrations 022–025 was found for this CSV route. Authentication, User Management and Login Fix 09 are unchanged.

The original proposal's permissive ownership policies could be bypassed by existing permissive API policies. The final alternative adds three restrictive boundaries: owner-session checks for CSV batches, parent-batch visibility for errors, and actor-session validation for CSV audit inserts. Non-CSV API batches retain their original authorization. PostgreSQL combines restrictive policies with AND: [official RLS documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html). Runtime denial/positive cases still require approved database acceptance; static review is not proof of executed RLS.

Guards require existing 001–021, no CSV columns, correct session authorization definition, restricted role, forced RLS, recipient identity constraint, unchanged 240-row baseline, active development plan, explicit approval and verified-backup hash. Existing objects are not silently overwritten. No public objects, source migrations 001–025, authentication functions or credentials are modified. This alternative 026 must not be combined with the old bundled 026; later 022–025 rollout requires reconciliation.

## Exact additions and modification

- database/deployment/bcs-dev-csv-only/026_csv_only.sql — proposed final minimum migration; NOT executed.
- database/deployment/bcs-dev-csv-only/preflight_readonly.sql — rerunnable metadata/plan/baseline checks; executed read-only successfully.
- database/deployment/bcs-dev-csv-only/postflight_readonly.sql — future schema and single-contact receipt/audit checks; NOT executed because columns do not yet exist.
- database/deployment/bcs-dev-csv-only/one-contact-acceptance.csv — one fictional Inactive contact, 18 columns, existing active taxonomy, ISO DOB.
- database/deployment/bcs-dev-csv-only/README.md — exact SQL Editor instructions, approval/backup gates and recovery steps.
- docs/implementation/BCS-CSV-IMPORT-ACTIVATION.md — this report.
- docs/handover/WORK-STATUS.md — current status entry only.

Original proposal preserved. Private ignored intake backups and live metadata evidence are under .local/csv-activation-20261019-170733/; they are not staged. Do not publish private evidence or environment files.

## Verification

| Check | Actual result |
|---|---|
| npm.cmd run typecheck | Exit 0 |
| npm.cmd run lint | Exit 0; one pre-existing informational noUselessFragments diagnostic, no fixes |
| npm.cmd test | Exit 0; 396 passed, 16 skipped in two integration suites; live tests disabled |
| npm.cmd run build | Exit 0; production build succeeds |
| Final SQL static scope checks | 16 policies, three restrictive; no table/role creation, drops or recipient DML; sole INSERT is ledger |
| One-contact fixture | Actual application parser/validator passes; one record, 18 fields, Inactive, 2000-01-15 |
| Read-only preflight SQL | Executed successfully; no migration executed |
| IPX / archived Smart controls | 12/12 and 3/3 SHA-256 and size matches |
| All pre-existing files | Unchanged at verification before the authorized WORK-STATUS entry; final check allows that entry only |
| Live CSV persistence / cross-owner RLS / receipt/audit | Pending approval; not claimed passed |

## Approval and acceptance boundary

Next activity: owner approval of the exact SQL package and ONE fictional-contact authenticated test, plus verified backup/restore evidence. The user explicitly requires approval before enabling persistence. Follow [execution instructions](../../database/deployment/bcs-dev-csv-only/README.md). Do not select or import the existing 241-row CSV. Require INSERT NEW ONLY, one valid preview row, one inserted receipt, matching company/portal/actor audit and unchanged original 240-row fingerprint. There are no real emails or SES operations.

If migration fails, stop and roll back its transaction. After commit, stop further imports and use an explicitly approved forward repair/scoped recovery; do not automatically drop columns, delete contacts or restore the whole database over unrelated work. Existing file backup provides local rollback evidence; restore only this task's changed document if specifically needed, never reset the dirty working tree.

## Git checkpoint

Branch main, HEAD 2c073ba7b3c11965703e92f52a21cd24b105065e. Zero staged files. All pre-existing dirty files and the untracked Step1G helper are preserved; no commit or push.

Final verification: 39 tracked dirty files and 163 untracked files (including pre-existing work), zero staged. Only WORK-STATUS.md changed among the pre-existing files; six new nonignored files belong to this task. Final SQL SHA-256: 2d0518e9896a002953c1ce8510235a954459ad1496f02f1d8a6032827385e7ec. The final read-only check again confirmed 240 unchanged recipients and zero fictional-test identity collisions. Local Markdown links pass. Exact final status inventory is preserved privately in .local/csv-activation-20261019-170733/final-git-status.txt.
