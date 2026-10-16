# BCS / Universal Notify - Agent Instructions

## Start here

Canonical Windows workspace: `E:\Bulk-Communicatio-System` (the spelling is intentional).
Approved offline IPX: `IPX/IPX-BCS/`. Do not rename the workspace or modify IPX.
Work on one explicitly authorized activity at a time. This repository is a documentation
and folder foundation, not a working production application.

Read `docs/handover/WORK-STATUS.md` and `docs/PROJECT-MASTER.md` first. Then use the
routing table below; do not reread every long document or the archived handover for
an unrelated small task. Inspect the actual working tree before claiming its status.

| Task | Required additional reference |
|---|---|
| UI, layout, theme or responsive work | `docs/standards/UI-DESIGN-SYSTEM.md`, `docs/reference/IPX-BASELINE.md` |
| Selects, multi-selects, grids, forms or dialogs | `docs/standards/REUSABLE-COMPONENTS.md` |
| Architecture, framework or package choice | `docs/architecture/ARCHITECTURE.md`, `docs/adr/DECISION-LOG.md` |
| Database, integration or field mapping | `docs/architecture/DATABASE-ARCHITECTURE.md` |
| Authentication, permission, data or sending work | `docs/standards/SECURITY-STANDARDS.md` |
| Verification or acceptance | `docs/standards/TESTING-AND-ACCEPTANCE.md` |
| Planning or next increment | `docs/requirements/DEVELOPMENT-ROADMAP.md` |

## Non-negotiable boundaries

- Preserve approved IPX visuals: sidebar, page tabs, typography, colours, spacing,
  cards, searchable checkbox multi-selects, grid toolbars and interactions.
  Do not replace them with a generic admin template or default library styling.
- Build shared controls in `packages/ui`; pages configure and reuse them.
  Do not create a different dropdown or grid implementation for each page.
- Keep the five-page navigation. Frontend menu visibility is not authorization.
- No changes to other projects, repositories, global configuration or filesystem ACLs.
  Stop on a wrong workspace, denied access, conflicting files or missing prerequisites.
- Initial setup must never overwrite existing files. Later edits require a scoped,
  authorized task; preserve unrelated edits and review diffs. No destructive resets,
  cleanup, mass replacements, new worktrees, commits, pushes or deployment without
  explicit authorization. No automatic Git initialization in the documentation step.
- No live database access, source database writes, AWS calls or real emails without
  separate explicit authorization. Demo actions must never silently become live sends.
- Keep secrets server-side; no secrets or real recipient data in source, logs, examples
  or documentation. Use synthetic fixtures. Enforce tenant/portal authorization in APIs
  and workers; revalidate eligibility, consent/preferences and suppression before sending.
- Production data must not be backed by browser localStorage. Local UI preferences
  may use approved local storage; IPX browser state is demonstration state only.
- A preferred stack, proposed schema or generated document is not an accepted ADR.
  Verify current official compatibility/security information before choosing versions.
- Do not assert tests, migrations, persistence, connectivity or deployment succeeded
  without evidence from that activity. Identify work as proposed, implemented, tested
  and/or owner-accepted separately.

## Task workflow

1. Confirm workspace, scope, applicable instructions, relevant files and Git state
   when Git is initialized. Report material conflicts before making changes.
2. Read only the relevant specifications. Inspect the actual IPX when changing UI.
   Search the workspace for referenced component sources before asking for them again.
   Never claim to have inspected absent SmartSelect/SmartMultiSelect/SmartSearchLookup files.
3. Implement only the approved increment. Keep schema/provider/UI boundaries intact.
4. Run applicable checks from the real project scripts. At this checkpoint no npm
   manifests, runtime scripts or automated application tests have been established;
   do not invent commands or report placeholder tests as passing.
5. Review changed files and confirm IPX remains unmodified. Update WORK-STATUS and
   any affected source-of-truth document as part of an authorized implementation task.
   Log new design decisions as Proposed until the owner accepts them.
6. Report changed files, verification evidence, unrun tests, blockers, approvals needed
   and exactly one next activity. Stop for the owner's confirmation.

Provide exact Windows CMD instructions and complete paths for owner-run steps.
Do not install frameworks or implement business features merely because folders exist.
Use `docs/README.md` as the documentation index. The historical handover is reference
material, not a new task. This file guides agents; it is not a security enforcement layer.
