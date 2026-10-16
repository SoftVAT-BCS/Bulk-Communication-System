# Reusable component contracts

Owner requirement: one reusable component system for selects, multi-selects, search lookups,
grids, forms, tabs, dialogs and layouts, with the approved IPX experience on every page.
Status: contracts for implementation review, not implemented code or finalized library APIs.

## Component ownership and public contracts

Place shared UI in `packages/ui`; place browser-safe DTOs/query/selection contracts in
`packages/contracts`. Page-level adapters supply data and actions. Shared components do
not import a portal database driver, AWS credentials or source-specific table names.

Each component documents typed inputs, values, events, disabled/read-only behaviour,
validation, loading/empty/error states, accessibility, theme and responsive behaviour.
Use controlled state where the page must preserve selections/drafts; do not create competing
hidden state. Stable keys identify options and rows, not displayed labels or row positions.

## SmartSelect, SmartMultiSelect and SmartSearchLookup

The owner requests React Select-style searchable controls and the previously supplied
SmartSelect / SmartMultiSelect / SmartSearchLookup patterns. The HTML IPX uses dependency-free
JavaScript; it is not an installed React Select implementation. The three TSX reference
files were not bundled in that archive and were absent during Step 2A. Step 2B imported
the recovered historical snapshots under docs/reference/smart-controls/ and reviewed
their actual source. See [review and integrity evidence](../reference/SMART-CONTROLS-REVIEW.md).
FormContext/styles and reuse rights remain unresolved; no browser/build/accessibility
test has run. The snapshots are custom React controls, not the react-select package.
Step 2C conditionally approves one react-select engine behind stable BCS wrappers;
see [ratified direction](../architecture/PHASE-1-ARCHITECTURE-PROPOSAL.md). Exact IPX
interaction/accessibility parity must be demonstrated. Missing FormContext/CSS, provenance
and reuse rights must be resolved before recovered code enters production. No direct
snapshot copying, second engine or default library appearance is approved.

Preserve the searchable dropdown panel, checkbox options for multi-selection, selected
count, Clear/Done actions, visible selected rows, configurable labels/display fields,
keyboard navigation and mobile-friendly lookup behaviour. Default library chips/menus are
not automatically acceptable substitutes. Theme all option, hover, selected, disabled,
focus and validation states to match IPX.

Required contract fields include stable option key/label, single or multiple selected keys,
search query, asynchronous loading when needed, disabled-option reasons, configurable
visible columns, selection-change events, errors and dependent-filter context. Cancel or
ignore stale asynchronous responses so an older query cannot replace newer options.

Group is a searchable multi-select; subgroup is filtered by selected groups. Define clear
empty/all-group wording and subgroup invalidation with the owner. Changing a filter must
not silently clear the deliberately preserved recipient selection. Changing portal or
security scope must invalidate/revalidate the old selection before it can be used.

## EnterpriseGrid

Step 2C conditionally approves headless TanStack Table, preserving the approved IPX.
Filtering, sorting and pagination must be server-driven for production; visible-page
selection must never imply all authorized matches were selected. Explicit include/exclude
semantics, scope-safe export, dense/mobile parity and send-time revalidation remain required.

One shared grid implementation supports configurable typed columns, authorized data source,
row keys, query state, sorting, filtering, page size, counts, selection mode, column visibility,
density, row actions, export actions and all request states.

Required features: global search, configured column filters, stable sorting, server-side
pagination, adjustable page size, column show/hide, Compact/Comfortable modes, total/selected
counts, current-page selection, all-matching selection, explicit deselection, clear-all,
recipient preview and permission-scoped CSV/Excel exports. The prototype exposes 10/20/50
rows; retain that interaction while defining production limits separately.

Keep the IPX filter bar, action toolbar, checkbox column, selected-row shading, status
badges, details actions and footer. Loading must not falsely display a successful empty
result. Long values must remain accessible without expanding the entire application.

### Selection meanings (required)

| Action | Meaning |
|---|---|
| Select page / Select All Visible | Eligible authorized rows on the currently displayed page only |
| Select all matching | Eligible authorized matches across the full filtered result, not just loaded rows |
| Deselect page / visible | Remove selection only from the current visible eligible set |
| Deselect matching | Remove the current matching set without accidentally clearing unrelated selections |
| Clear entire selection | Explicitly remove all selection intent |

Selections persist across pagination, filter changes and Communication tabs. UI counters
must distinguish matches from selected records and actual eligible send recipients.
Do not infer selection from DOM checkboxes on the currently mounted page.

For large result sets, use a server-authorized selection reference with include/exclude
handling. The filter snapshot/all-matching membership policy must be settled in an ADR;
a later filter change must not silently redefine the earlier selection. Do not download
thousands of records to implement Select All. Review the final recipient plan and recheck
authorization, eligibility/preferences, suppression and deduplication before dispatch.

## Shared form and layout controls

Create reusable Button, Input, Textarea, DateTimeInput, Field, validation summary, Modal,
ConfirmDialog, Tabs, Toast, Badge, Card, AppShell, permission-aware action and empty/loading
components. Centralize tokens and styles; avoid copied implementations across the five pages.
A rich-text composer adapter must sanitize/validate content and render a safe preview.

Typed callbacks convey user intent; frontend controls never grant server permissions.
Controls may hide/disable actions for usability, but APIs/workers enforce the same restrictions.
Attachment selectors show real upload state only after the backend has implemented it.

## Component acceptance before widespread reuse

Create a focused component demonstration/test harness with synthetic fixtures. Compare
IPX appearance and behaviour, then test keyboard/touch operation, themes, large queries,
multiple-group dependency changes, stale responses and permission changes. Obtain owner
acceptance of the select and grid foundation before rolling it out across every page.
