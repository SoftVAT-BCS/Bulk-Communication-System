# Smart controls reference review

Status: SOURCE REVIEW ONLY — NOT PRODUCTION-READY OR OWNER-ACCEPTED.
Checked: 16 October 2026. Scope: historical snapshots, approved IPX and BCS contracts.
No compilation, browser, accessibility, compatibility or application tests ran.

## Import, provenance and integrity

The Step 2A finding that the TSX files were absent was correct at that checkpoint.
Step 2B imported the owner-supplied Downloads/BCS_Smart_Controls_Reference_V1.zip
to [smart-controls](smart-controls/README.md), without renaming or formatting.

Archive SHA-256: `5eca43fc84513c9c6862ea9dd6dca0ff25464b3285662165a87e941d45f79d83`.
Exactly five flat regular entries were accepted. Unexpected/duplicate names,
traversal paths, links and conflicting destination content were rejected by preflight.
All destinations were absent; FileMode.CreateNew provided exclusive creation.
All five imported files matched their archive bytes. The three sources also matched
the sizes and hashes in [SOURCE-MANIFEST.json](smart-controls/SOURCE-MANIFEST.json).

| Source | Bytes | SHA-256 |
|---|---:|---|
| SmartSelect(1).tsx | 5711 | 4e60508cfb3cd137de3dd0165d5798503770625c601226b19cbeeda2473ccd45 |
| SmartMultiSelect(1).tsx | 1550 | 49f43540edbc2535bf85183d0c12156422866b425c5a53bf6d640fdb8893d8bb |
| SmartSearchLookup(1).tsx | 23770 | 257113927428e3d64b8b1429dfe8875ae3d6fa4e27b0fb70ceab9335544b567c |

The manifest identifies available Library version 1 uploads. It does not establish
the latest originating-project versions, ownership, license permission or completeness.
No source license was supplied. Obtain owner confirmation of reuse rights and any
upstream notices before copying/adapting code into production. Do not infer an MIT
license from React or react-select licenses.

## Source findings and BCS implications

Line numbers below refer to the unchanged imported files.

| Area and evidence | Observed source behavior | Gap / acceptance requirement |
|---|---|---|
| [SmartSelect](smart-controls/SmartSelect%281%29.tsx), lines 2–5 | Imports React, ./forms/FormContext and ./SmartSearchLookup | FormContext is absent. Local imports do not resolve the preserved (1) filenames. Do not rename snapshots or invent missing dependencies. |
| SmartSelect, lines 7–28, 39–47 | Typed IDs, labels, descriptions, context, disabled options; converts option JSX to records | Useful adapter pattern; optgroup flattening does not carry group labels/disabled context. style is declared but not forwarded by the implementation. Preserve explicit BCS contracts, not fabricated DOM events. |
| SmartSelect, lines 50–79 | Controlled value or local default; missing selected ID receives an unavailable label; default changes/reset update uncontrolled state | Parent must reset controlled values. Required validation cannot treat an unavailable ID as valid simply because selectedRows has an entry. Reset and dynamic option changes require tests. |
| SmartSelect, lines 73–79 | Filters className to selected utility-layout classes; useField provides label/id; sv-border substring marks invalid | Coupled to another form/theme system. Replace only in a separately approved production adapter; do not transplant its appearance. Missing FormContext behavior is unknown. |
| [SmartMultiSelect](smart-controls/SmartMultiSelect%281%29.tsx), lines 6–21 | Controlled IDs or local initial default; preserves unavailable IDs with fallback labels; toggles individual IDs and clears all | Does not pass onFormReset or reconcile later defaultValue changes. errorMessage is forwarded but invalid is not. No dependent-group policy, disabled reason contract or server selection reference. |
| [SmartSearchLookup](smart-controls/SmartSearchLookup%281%29.tsx), lines 17–48, 138–184 | Generic stable ID rows, customizable columns/labels, selected ID set, local filtering, default 100-row cap | This is a lookup, not EnterpriseGrid. No total-count/page-token/sort/export/all-matching backend contract. A loaded-row cap is not server pagination or virtualization. |
| Lookup, lines 157–170, 228–236 | Local substring filtering; onSearch debounce defaults to 250ms; custom required validity | Timer cleanup cancels pending debounce only, not in-flight requests. onSearch also runs for initial/empty queries; minChars does not gate it. No abort/generation guard or stale scope protection. Parent adapter must own these. |
| Lookup, lines 309–355, 503–514 | Disabled/loading selection guards; multi remains open and clears query; selected item gets a check glyph | IPX uses visible checkbox choices, persistent menu search and Clear/Done footer (IPX app.js 41–42). Snapshot is not a drop-in visual/interaction match. Disabled reason display is missing. |
| Lookup, lines 234–236, 527–545 | Custom validity, ARIA attributes, hidden named values, portal rendering | Missing IDs still count as selections; errors are not associated through aria-describedby. Verify controlled reset, empty multi submission, disabled fieldsets and portal focus semantics. |
| Lookup, lines 371–459 | Arrows, PageUp/Down, Home/End, Enter, Escape and Tab handling | Active-index navigation does not skip disabled options; Enter selection is guarded. IME guard occurs after navigation keys. No demonstrated screen-reader acceptance or modal focus trap. |
| Lookup, lines 195–225, 238–247, 295–300, 462–518 | Positioned desktop popup; mobile sheet at 640px; scroll lock; mobile search; touch outside-close | BCS CSS uses 1220/1000/760/480 breakpoints. Sheet adaptation needs owner visual review, focus/zoom/virtual keyboard tests and reachable actions. Source alone proves none of those. |
| Lookup, lines 487–545 | sv-lookup-* and sv-smart-lookup classes; createPortal into nearest dialog or body | Referenced styles are absent. Theme variables must reach the portal root; test dark mode, stacking, clipping and embedded isolation. Do not assume ancestor-scoped CSS follows a body portal. |

Workspace search found no FormContext source and no recovered sv-lookup stylesheet.
Only the approved IPX stylesheet exists outside Downloads; it does not supply this
component system. No originating repository was accessed.

## Approved IPX contract

[IPX app.js](../../IPX/IPX-BCS/Assets/app.js), lines 8–9, defines five pages and their tabs;
39–42 defines group/subgroup checkbox search; 47–48 defines the grid and density;
90 defines page/matching/clear selection; 120 updates dependent subgroups.
[IPX styles.css](../../IPX/IPX-BCS/Assets/styles.css), lines 1–4, defines tokens, typography,
sidebar, dark theme and responsive rules. Preserve these, including toolbar, selected
rows, counts, 10/20/50 page sizes, details actions and controlled scrolling.

Production [shared contracts](../standards/REUSABLE-COMPONENTS.md) require stable keys,
request states, accessible labels, keyboard/touch use, no silent recipient selection
loss across filters/tabs, and revalidation on portal/security-scope change.
Neither these snapshots nor IPX implement server-authorized all-matching selection,
expiry, exclusions, final eligibility/suppression checks or production persistence.

## React Select decision — conditional Step 2C approval

The three snapshots are custom React controls; none imports the `react-select` package.
The owner's React Select requirement remains explicit.

| Option | Benefit | Cost / constraint |
|---|---|---|
| Adapt recovered lookup as the one select engine | Rich-column popup and mobile-sheet patterns already visible in source | Missing styles/context, unknown reuse rights, reset/race/accessibility gaps; would require explicit owner approval if replacing the requested react-select package |
| react-select behind stable BCS SmartSelect/SmartMultiSelect/SmartSearchLookup wrappers | Honors package direction; controlled values, custom components/styles and multi-selection are supported extension points | Must implement IPX checkbox/count/Clear/Done layout, rich rows and mobile behavior; default chips/theme are unacceptable; no guarantee until demonstrated |
| Two unrelated engines | Could reduce one-off adaptation | Rejected as initial recommendation: duplicated keyboard, styling, reset and async behavior without a justified requirement |

Step 2C conditionally approves one react-select engine behind BCS wrappers, using snapshots
as reviewed behavioral references only. Demonstrated IPX/accessibility parity remains required. Do not copy unlicensed
source, promise the rich lookup fit, or fall back to a second engine silently.
If the fidelity harness cannot meet the contract, stop for a focused decision.

Official evidence checked 16 October 2026: [upstream README](https://github.com/JedWatson/react-select/blob/master/README.md)
describes controlled props and customization; [5.10.2 metadata](https://registry.npmjs.org/react-select/5.10.2)
declares React/ReactDOM 16.8/17/18/19 peer ranges; [upstream MIT license](https://github.com/JedWatson/react-select/blob/master/LICENSE)
applies to that package, not these recovered files. Dependency compatibility is declared,
not an executed BCS integration test.

## Byte-preservation policy — Step 2C

Before Step 2C, effective attributes were text=auto, eol=lf;
filter, ident and working-tree-encoding unspecified. Observed UTF-8 bytes have no BOM:

| File | CRLF sequences | Standalone LF |
|---|---:|---:|
| SmartSelect(1).tsx | 80 | 0 |
| SmartMultiSelect(1).tsx | 0 | 22 |
| SmartSearchLookup(1).tsx | 538 | 10 |

Those rules could normalize original bytes during staging/checkout.
Step 2C authorizes this narrower archival TSX-only .gitattributes override:

```gitattributes
docs/reference/smart-controls/*.tsx -text -filter -ident !eol !working-tree-encoding
```

Step 2C applies the same TSX-only EditorConfig section, unsetting charset, end_of_line,
indent_style, indent_size, insert_final_newline and trim_trailing_whitespace. This is
advisory only. Ordinary production TSX rules and IPX protections remain unchanged.
Effective Git text/filter/ident must be unset, eol/working-tree-encoding unspecified.
Before and after staging, verify source SHA-256/size against the unchanged manifest;
each staged blob must equal git hash-object --no-filters for its working file. Any
mismatch blocks the authorized local commit; no normalization or index reset is allowed.

## Review disposition and next dependency

Reference import: verified. Source review: completed. Production readiness, latest-source
status, licensing permission, browser behavior and production-component acceptance: not established.
High-level architecture ratification in Step 2C does not grant source reuse rights.
The [architecture proposal](../architecture/PHASE-1-ARCHITECTURE-PROPOSAL.md) contains the
single next increment and approval questions. Missing source dependencies block direct
snapshot reuse, not an approved independent react-select wrapper implementation.
