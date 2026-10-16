# Step 3A-V1 visual fidelity recovery

Owner rejected Step 3A visuals. Status: corrected candidate, locally tested; NOT OWNER ACCEPTED.

## Before-edit mismatch ledger — 16 October 2026

Checkpoint: main / 2a78293ae7db68fbee62e4fbc0689949d0ba5782; empty index,
no remotes; one modified tracked status document plus 34 untracked entries including
the preserved Step1G helper. 85-file starting hash snapshot captured; 12 IPX and
3 archival TSX hashes pass. Dependencies are already installed and remain pinned.

The owner ZIP README and all four current screenshots plus approved Communication,
Portal, Mapping, SES and Rights screenshots were inspected. PNGs were extracted only
to ignored `.local/v1-reference/`, without overwriting. The original ZIP is unchanged.
The user explicitly authorizes a new read-only loopback IPX HTTP comparison server in
this task: port 3001 serves only nine allowlisted HTML/CSS/JS/SVG paths, GET/HEAD only.
No server file was placed in IPX; no other workspace files or directory listings served.

| Surface | IPX expectation / source | Before defect | Shared correction / acceptance |
|---|---|---|---|
| Communication heading | app.js:52 Communication studio, delivery-workspace subtitle and two actions | Short generic heading, disabled filler action | Restore text/actions; same-browser comparison |
| Multi-select | app.js:41–42, .pop-option/.pop-search/.btn.tiny | React Select injected option layout overrides class display/gap; checkboxes touch text, both footer buttons equally prominent | Explicit engine styles, 9px option gap, primary tiny Done; keyboard and rendered geometry checks |
| Popup containment | .pop-menu anchored near trigger | Inline popup width has no right-edge collision handling; subgroup trigger starts mid-page and pushes Done past viewport | Shared top-layer anchored dialog, viewport collision calculation, narrow-screen sheet; resize/focus/edge measurements |
| Recipient grid | app.js:45–48 .name-flex/.avatar/.key/.gridfoot | Generic DEMO names, missing stage/avatar, oversized actions, substituted labels, missing summary cards | Deterministic IPX-equivalent fixtures, compact icon actions, badges/columns/footer/summary cards |
| Width constraints | .grid-scroll bounds the wide table | Tab-panel ancestor and minimum-content sizes not consistently constrained; popup can enlarge document | Constrain wrappers and internal scroll regions; no html/body overflow hiding |
| Portal / mapping / SES | app.js:65–67 split + panel-stack, populated demo fields | Generic disabled field placeholders and repeated guidance card | Full tab-specific demo presentation with shared labeled fields; no network/persistence |
| Rights | app.js:68 nine modules × six actions, five roles, portal selector, switches | Three roles × four disabled checkbox columns | Restore module matrix, selectors and preview switches; no authorization/persistent save |

Before captures: `.local/v1-evidence/ipx-communication-before.jpg` and
`react-communication-before.jpg`, same in-app browser tab at measured 1440×900,
light theme, top position, group popup open, zero selection. Separate existing tabs
retained different viewport overrides; subsequent comparisons use one tab and record
actual `innerWidth`/`innerHeight`, not merely requested dimensions.

Safety difference retained: only Active recipients are eligible (213), while IPX allows
Inactive too (225). Source styling is authoritative; its looser demo eligibility is not.

## V1 result — 16 October 2026

Implemented and locally tested; **NOT YET OWNER ACCEPTED**. Step 3A's original
visuals were rejected. This review supersedes its earlier visual-status statements.
No installation, version change, scaffolding, backend, database or sending work occurred.

### Changes and comparisons

- Communication restores the exact heading/subtitle/filter labels, compact icon actions,
  student IDs, avatars/stages, status badges, grid footer and two summary cards. Source:
  IPX Assets/app.js lines 41–48 and 52; styles.css lines 1–4 (.grid-bar, .grid-subbar,
  .data-table, .gridfoot, .name-flex, .avatar, .key, .pop-option, .btn.tiny).
- Multi-select is still React Select, with explicit flex option styling and 9px checkbox
  gap. Clear and primary Done use IPX tiny buttons. A shared top-layer native dialog
  positions against the viewport; at <=760 CSS pixels it becomes a bottom sheet.
  Explicit Tab/Shift+Tab cycling supplements native dialog behavior. Escape, outside
  pointer dismissal, trigger focus return, retained search and IME guards were checked.
- Grid remains TanStack-controlled. Only Active recipients can be selected, with global
  IDs preserved across filtering/paging/tabs; 10/20/50 rows, density, columns, sorting,
  details and filtered fictional CSV export are supported. Export quotes CSV and guards
  formula-like values. Detail focus return was checked in the browser.
- All four Configuration tab presentations restored from app.js lines 65–69. Shared
  LabeledField and PermissionSwitch implement forms and nine modules x six actions,
  five roles and three portals. Preview changes are memory-only, scoped by role/portal;
  actions explicitly report that nothing was saved, connected, verified or granted.
- At measured 1440x900/light/scroll-top, IPX and React use the same font stack, 240px
  sidebar, 74px topbar, 13px body and 29px h1. All four Configuration comparisons have
  h1 y=128, tabs y=214.525 and first card header y=286.125/height=78. Shared header
  and card widths match. Screenshots are evidence of the sampled views, not automated
  pixel equality or owner approval.

### Overflow root causes and fixes

1. Inline popup minimum width and left anchoring lacked collision handling. Its shared
   dialog now clamps against the viewport/visual viewport and avoids ancestor clipping.
2. Tab-panel/grid/flex ancestors needed min-width:0 and bounded table scroll regions.
3. The absolute screen-reader Details heading escaped the scroll region's containing
   block. Browser measurement caught document width 814 versus client width 305;
   position:relative on .grid-scroll contains it, giving 305/305 after correction.
4. At 768px the topbar's optional demo ribbon caused 3px overflow; suppressing that
   ribbon at the tablet breakpoint retains navigation and theme actions.

No html/body overflow-x:hidden was added. Wide tables and tabs scroll in their own
containers. Mobile footer actions are visible within the dialog. Native mobile keyboard
and physical-device testing have not been performed.

### Actual validation

| Check | Result |
|---|---|
| npm.cmd run typecheck | Pass |
| npm.cmd run lint | Pass, no errors/warnings; 11 informational template-literal suggestions |
| npm.cmd test | 14/14 tests, 3/3 files; original 9 retained/adapted for approved fixture labels |
| npm.cmd run build | Pass; five application routes prerendered |
| Browser console sample | No warning/error entries returned |
| Document/main horizontal overflow | 80/80 final measured cases pass |
| Multi-select Clear/Done edges | Contained at all 10 widths |
| Dark theme, Tab/Shift+Tab, Escape, outside click, focus return, resize-open | Browser checked; focus-cycle defect found and fixed |
| Mobile navigation drawer | Open, Escape close, trigger focus return checked |
| Recipient operations | Browser: select page 9, page/tab persistence, deselect matching ->8, 10/20/50 rows, sorting, compact density, details/focus, clear |
| 200% browser zoom | UNVERIFIED: browser key command failed; width/DPR remained unchanged; no zoom capability exposed |

Browser facility: Codex in-app browser, not a claim of supported native Windows 10
Playwright acceptance. jsdom tests assert semantics/logic/styles, not browser geometry.
The 80-case matrix covers Communication with subgroup popup; all four Configuration
tabs; Dashboard, Scheduling and Reports initial views. Each uses height 900 and widths:

| innerWidth | document clientWidth = scrollWidth (all eight surfaces) |
|---|---|
| 320 | 305 |
| 375 | 360 |
| 390 | 375 |
| 480 | 465 |
| 760 | 745 |
| 768 | 753 |
| 1000 | 985 |
| 1220 | 1205 |
| 1280 | 1265 |
| 1440 | 1425 |

The 15px difference is the browser's vertical scrollbar. The supplied mobile screenshot
is 628px including browser chrome; its exact CSS viewport is not encoded. Both 480px
and adjacent mobile/tablet cases were checked; exact screenshot-device reproduction
is not claimed. Browser open-popup resize also passed from 1440 to 390 in dark mode.

Evidence (ignored, local): `.local/v1-evidence/viewport-matrix.json`,
`configuration-comparison.json`, `ipx-communication-before.jpg`,
`react-communication-before.jpg`, `react-communication-after.jpg`,
`react-mobile-320-after.jpg`, `react-mobile-390-after.jpg`, `react-mobile-dark.jpg`,
and matching `ipx-config-{portal,table,amazon,user}.jpg` /
`react-config-{portal,table,amazon,user}.jpg`.

### OPEN DEFECTS / acceptance gaps and intentional differences

- Owner visual approval remains REQUIRED; this is a corrected candidate, not accepted.
- Required 200% browser zoom is unverified. Full assistive-technology review and native
  mobile keyboard/physical-device checks are also outstanding.
- The sheet on narrow screens intentionally differs from IPX's anchored popup to keep
  actions reachable. IPX allows Inactive recipients; this implementation keeps the
  stricter 213 Active-only selection policy versus IPX's 225 eligible.
- Truthful demo copy, registry 'Demo mapping', readiness 'Not checked/Planned' badges,
  preview dialogs and additional explanatory text differ from IPX success-like states.
  These can change right-panel height. No actual connection/save/grant is represented.
- Next dev indicator is development chrome. Shell footer/demo labels retain foundation
  wording. Exact all-state pixel equality is not claimed. Dashboard/Scheduling/Reports
  received shared shell regression checks; their preview bodies were not expanded.
- Compose/send, scheduling, production reporting and all real service operations remain
  inactive previews. Archive provenance/reuse-rights questions remain unresolved; none
  of those reference implementations was copied into the new controls.

### Preservation and Git

All 12 original IPX files and all three archival TSX files match saved SHA-256 manifests.
All 85 preexisting files remain readable; only the authorized 14 existing implementation,
source/test and current-status files changed. Downloads, comparison ZIP, protected CSV,
historical reports, root rules, manifests/lockfile and Step1G helper match starting bytes.
CSV SHA-256: d4938008f983a48387f4fc2519bbb331eea734d677121e882c2230e59eef557e.
main/HEAD unchanged at 2a78293ae7db68fbee62e4fbc0689949d0ba5782, 41 tracked files,
empty index, no remotes. Starting inventory: one modified tracked file and 34 untracked.
Final inventory: one modified tracked file and 41 untracked (42 entries total).
No staging, commits, pushes or live services. The known Step1G helper remains untouched.

Exactly one next activity: owner visual/accessibility review of the corrected candidate
at http://127.0.0.1:3000/communication and /configuration against the preserved IPX,
including the outstanding 200% zoom check. Stop before further development.


### Exact V1 file scope (21 files)

Modified existing files (14):

- apps/web/src/communication.tsx
- apps/web/src/synthetic.ts
- apps/web/src/workspace.tsx
- packages/contracts/src/index.ts
- packages/ui/src/grid.tsx
- packages/ui/src/index.ts
- packages/ui/src/primitives.tsx
- packages/ui/src/react.css
- packages/ui/src/selects.tsx
- tests/selection.test.ts
- tests/setup.ts
- tests/ui.test.tsx
- docs/handover/WORK-STATUS.md
- docs/implementation/STEP-3A-UI-FOUNDATION.md

New files (7):

- apps/web/src/configuration.tsx
- packages/ui/src/form-kit.tsx
- packages/ui/src/icons.tsx
- packages/ui/src/multi-select.tsx
- packages/ui/src/popover.tsx
- tests/fidelity.test.tsx
- docs/implementation/STEP-3A-V1-VISUAL-FIDELITY-REVIEW.md

### Full final Git short inventory, including preexisting Step3A files

```text
 M docs/handover/WORK-STATUS.md
?? apps/web/app/communication/page.tsx
?? apps/web/app/configuration/page.tsx
?? apps/web/app/layout.tsx
?? apps/web/app/page.tsx
?? apps/web/app/reports/page.tsx
?? apps/web/app/scheduling/page.tsx
?? apps/web/next-env.d.ts
?? apps/web/next.config.ts
?? apps/web/package.json
?? apps/web/src/communication.tsx
?? apps/web/src/configuration.tsx
?? apps/web/src/previews.tsx
?? apps/web/src/synthetic.ts
?? apps/web/src/workspace.tsx
?? apps/web/tsconfig.json
?? biome.json
?? docs/implementation/STEP-3A-UI-FOUNDATION.md
?? docs/implementation/STEP-3A-V1-VISUAL-FIDELITY-REVIEW.md
?? package-lock.json
?? package.json
?? packages/contracts/package.json
?? packages/contracts/src/index.ts
?? packages/ui/package.json
?? packages/ui/src/form-kit.tsx
?? packages/ui/src/grid.tsx
?? packages/ui/src/icons.tsx
?? packages/ui/src/index.ts
?? packages/ui/src/ipx-base.css
?? packages/ui/src/multi-select.tsx
?? packages/ui/src/popover.tsx
?? packages/ui/src/primitives.tsx
?? packages/ui/src/react.css
?? packages/ui/src/selects.tsx
?? packages/ui/src/styles.css
?? scripts/BCS_Phase1_Step1G_FirstBaseline.cmd
?? tests/fidelity.test.tsx
?? tests/selection.test.ts
?? tests/setup.ts
?? tests/ui.test.tsx
?? tsconfig.json
?? vitest.config.mts
```
