# BCS documentation index

Prepared: 16 October 2026. Documentation baseline: Phase 1, Step 1C, version 1.0.
Project label: Bulk Communication System (BCS). Working product name: Universal Notify.

## Read the minimum needed

Start with [WORK-STATUS](handover/WORK-STATUS.md), then [PROJECT-MASTER](PROJECT-MASTER.md).
[AGENTS.md](../AGENTS.md) routes Codex to task-specific specifications. The repository
files, evidence and owner decisions are the working record; chat memory is not a
verbatim archive of the entire project.

| Document | Single responsibility |
|---|---|
| [PROJECT-MASTER](PROJECT-MASTER.md) | Product scope, five-page structure, requirements and authority |
| [ARCHITECTURE](architecture/ARCHITECTURE.md) | Logical boundaries and proposed technology decisions |
| [PHASE-1-ARCHITECTURE-PROPOSAL](architecture/PHASE-1-ARCHITECTURE-PROPOSAL.md) | Step 2B evidence and Step 2C ratification; approved direction, conditional tools and unresolved gates |
| [SMART-CONTROLS-REVIEW](reference/SMART-CONTROLS-REVIEW.md) | Recovered source integrity, dependency gaps and comparison with IPX |
| [Smart reference snapshots](reference/smart-controls/README.md) | Historical unchanged sources and provenance; not production code |
| [DATABASE-ARCHITECTURE](architecture/DATABASE-ARCHITECTURE.md) | Central data ownership, integration and mapping contracts |
| [UI-DESIGN-SYSTEM](standards/UI-DESIGN-SYSTEM.md) | Visual fidelity, themes and responsive standards |
| [REUSABLE-COMPONENTS](standards/REUSABLE-COMPONENTS.md) | Shared control contracts and selection semantics |
| [SECURITY-STANDARDS](standards/SECURITY-STANDARDS.md) | Implementation safeguards and approval gates |
| [TESTING-AND-ACCEPTANCE](standards/TESTING-AND-ACCEPTANCE.md) | Evidence and test acceptance criteria |
| [DEVELOPMENT-ROADMAP](requirements/DEVELOPMENT-ROADMAP.md) | Original phase numbering, sequencing and approvals |
| [DECISION-LOG](adr/DECISION-LOG.md) | Owner-confirmed decisions and pending technical decisions |
| [WORK-STATUS](handover/WORK-STATUS.md) | Current checkpoint and next authorized activity |
| [IPX-BASELINE](reference/IPX-BASELINE.md) | Reference file inventory, provenance and preservation rules |
| [ORIGINAL-PROJECT-HANDOVER](reference/ORIGINAL-PROJECT-HANDOVER.md) | Unedited historical handover supplied by the owner |

## Status and change control

**Owner-confirmed requirement** means a requirement already supplied/accepted by the
owner. **Proposed** means a recommendation awaiting decision. **Implemented** means
files/code exist. **Tested** requires named checks and results. **Owner-accepted** is a
separate recorded decision. Do not substitute any one of these labels for another.
Step 2C distinguishes OWNER-APPROVED HIGH-LEVEL DIRECTION, CONDITIONAL IMPLEMENTATION
CHOICE and PROPOSED/UNRESOLVED. Exact package versions and source reuse rights are not
finally Accepted. A fresh owner decision is required before any scaffold.

Preserve the original handover as historical evidence. Later explicit owner decisions
and the verified workspace update its old paths/status; they do not silently remove
its business requirements. When instructions or evidence conflict, identify the conflict
and request a decision rather than fabricating a reconciliation.

The original Step 1C setup creates new documentation only. It does not initialize Git, install packages,
connect databases, call AWS, start services, create application code or grant permissions.
The additional safeguards and test contracts are proposed implementation requirements,
not claims that these controls already work.

## Verification records generated locally

- `reference/IPX-BASELINE-SHA256.json`: file names, lengths and SHA-256 hashes of the
  owner's entire local `IPX` folder at setup. This inventory is not a backup.
- `handover/STEP-1C-INSTALL-REPORT.json`: successful initial setup evidence and the
  expected Markdown hashes. It is a historical record, not a continuously updated status.
- `handover/STEP-1E-REPOSITORY-RULES-REPORT.json`: later repository-rule setup evidence;
  predates the verified main/e50dfea first commit. Independent backup remains unverified.
- Step 2A verified the baseline read-only. Step 2B imports five reference files and updates
  only authorized Markdown; see the two new documents above. No application tests ran.
- Step 2C records conditional ratification and narrowly scoped archival TSX protection;
  one verified local documentation/reference commit is authorized, with no push or scaffold.

The installer never changes an existing different file. Identical Markdown is retained;
conflicts are reported before new files are written. A later approved documentation edit
must not be undone by rerunning the original setup.

## External technical references

These references explain tooling only; they do not change the owner's product scope.
Checked 16 October 2026:

- OpenAI, **Custom instructions with AGENTS.md**:
  https://developers.openai.com/codex/agent-configuration/agents-md
  (official page may redirect). Root instructions provide persistent agent guidance;
  detailed topic documents are explicitly referenced rather than assumed to auto-load.
- Microsoft, **System.IO.FileMode**:
  https://learn.microsoft.com/en-us/dotnet/api/system.io.filemode?view=netframework-4.8.1
  `CreateNew` refuses an already-existing destination instead of truncating it.

Tool documentation is time-sensitive. Recheck official guidance when changing setup or
Codex configuration. No account connection or cloud service is needed for this step.

## Step 3B-1 offline proposal

[Recipient data foundation](architecture/RECIPIENT-DATA-FOUNDATION.md): schema, complete CSV mapping, aggregate validation, security, import procedure and execution gates.

## Step 3B-2 offline review

[Isolation refinement and proposed Step 3B-3](architecture/STEP-3B-2-ISOLATION-REVIEW.md): revised SQL scope, role/RLS preflights, deployment decision, importer gates and optional-field test design.

- [Step 3C-1 dynamic data foundation](implementation/STEP-3C1-DYNAMIC-DATA-FOUNDATION.md) — optional server-side recipient read path; pending access proposal and owner connection gate.

Step 3C-2B: [restricted reader deployment and actual dynamic acceptance](implementation/STEP-3C2B-DYNAMIC-INTEGRATION-RESULT.md).
