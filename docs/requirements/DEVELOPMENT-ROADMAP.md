# Development roadmap and approval gates

Status: original proposed phase plan retained. Do not renumber phases because a foundation
sub-step was added. The owner authorizes one activity at a time and reviews each phase.

## Phase 1 foundation sub-steps

| Activity | Checkpoint as this pack was prepared |
|---|---|
| Step 1A - read-only workspace verification | Confirmed by owner's CMD transcript: correct path, IPX files and installed Git; no Git repository then |
| Step 1B - safe folder creation | Confirmed by owner's CMD transcript and Explorer screenshot on 16 October 2026 |
| Step 1C - populated documentation and preservation evidence | This package; local execution and owner confirmation pending |
| Step 1D - repository/baseline protection | Next proposed activity only; review ignore/line-ending/backup strategy before separately authorized Git initialization |
| Step 2 - production architecture review | Pending; settle framework versions, contracts, security, development environment and technical ADRs |

Step 1D must not blanket-add secret files or change IPX bytes through line-ending conversion.
Git is version history, not an independent/off-device backup. Establish an appropriate
backup plan; do not confuse the SHA-256 inventory with a copy of the files. No initial
commit/push is authorized merely by this roadmap.

## Original delivery phases

| Phase | Purpose | Review gate |
|---|---|---|
| 0 - IPX finalization | Preserve V1, categorize partner feedback and accept revisions | Owner accepts baseline and scope changes |
| 1 - Production architecture | Stack, repository, central model, contracts, security/integration design | Explicit architecture decisions and safe local foundation |
| 2 - Responsive UI foundation | Reusable React components preserving IPX | Owner acceptance of shell, Smart controls and grid on target screens |
| 3 - Database & portal integration | Registrations, source adapters, mapping and safe recipient lookups | Approved isolated test environment and authorization/isolation controls |
| 4 - User authorization | Standalone/embedded identity and action/record rights | Server-enforced permission and tenant-isolation tests |
| 5 - Communication workflow | Selection, composition, templates, attachments and drafts | Validated persistent workflow with authorized synthetic tests |
| 6 - Scheduling & educational events | Reminders, reschedules, cancellations, rules and idempotency | Revision handling and duplicate prevention evidence |
| 7 - Amazon SES | Sender setup, delivery adapter and feedback | Separately authorized provider setup and limited controlled sending |
| 8 - Queue & deliverability | Persistent workers, quotas, retries, priorities, cancellation, suppression | Failure/recovery and safety tests before broader live use |
| 9 - Reports & dashboard | Actual permission-scoped metrics and history | Correct state definitions and consistent report data |
| 10 - Integration & security testing | Multiple portals/engines, isolation, scale and responsive behaviour | Evidence-based acceptance of the integrated system |
| 11 - Production readiness | Deployment, backup/recovery, monitoring, documentation and controlled rollout | Owner authorizes production release |

## Dependency rules

The numbered phases are product milestones, not permission to delay foundational security.
Identity/isolation contracts and enforceable access controls precede any real recipient data
access. Durable queueing, quota protection, suppression and authentic feedback handling
must be ready before live email, even if their fuller phase is numbered after the SES adapter.
Early integrations/tests use synthetic fixtures in an explicitly authorized isolated environment.

Do not jump from a successful UI preview to connecting live source databases or sending
mail. Do not launch multiple parallel phase implementations without owner authorization.
Partner feedback can refine requirements; record accepted scope/visual changes before work.
