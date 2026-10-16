# BCS Smart Controls - Historical Reference Snapshots

Prepared: 16 October 2026.
Intended location: `docs/reference/smart-controls/` in `E:\Bulk-Communicatio-System`.

## Status and authority

These are three previously uploaded user source files recovered from the available
Library. Their original bytes and upload filenames, including `(1)`, are preserved.
They are reference snapshots, NOT an installed package, a tested component library,
or an approved production implementation. Availability does not establish that
these are the latest versions in their originating project.

The approved BCS IPX remains the visual and interaction authority. Do not replace
its sidebar, tabs, grid or selection experience with another project's appearance.
Do not silently accept an architectural choice merely because these files exist.

## Included source files

- `SmartSelect(1).tsx`
- `SmartMultiSelect(1).tsx`
- `SmartSearchLookup(1).tsx`

`SOURCE-MANIFEST.json` records source identifiers, available version, byte counts and
SHA-256 digests. Compare the original bytes, not newline-normalized text.
The manifest is integrity/provenance metadata, not an independent backup or a
certificate of code quality, ownership or license permission.

## Initial dependency observations - source inspection only

- SmartSelect imports `useField` from `./forms/FormContext`. That dependency is not
  included in this bundle. Do not invent its behavior or copy unrelated project files.
- SmartSelect imports `./SmartSearchLookup` and SmartMultiSelect imports both
  `./SmartSearchLookup` and the SmartSelect option type from `./SmartSelect`.
  The `(1)` upload filenames have deliberately NOT been renamed to resolve those
  imports. This reference bundle is not intended to compile in place.
- The lookup imports React hooks/types and `createPortal` from react-dom. Source
  includes `sv-lookup-*`/`sv-smart-lookup` CSS class references; their original
  stylesheet definitions are not included in this bundle.
- The three source files have no direct import from the `react-select` package.
  Custom React controls and the separately distributed react-select package must
  not be treated as the same thing. The owner's React Select requirement remains
  a review input, not permission to silently change the implementation choice.
- Source-reuse rights/license provenance, all required dependencies, supported
  React versions, accessibility, async behavior, form reset/validation behavior
  and BCS visual compatibility still require review.

## Import and review rules

1. Check the outer ZIP checksum provided with the owner-approved task.
2. Accept only the five flat archive entries listed in that task. Reject any
   traversal paths, directories, symbolic links or unexpected entries.
3. Preserve source bytes. Refuse different existing destination files. Identical
   existing files may be retained; do not normalize line endings or rename sources.
4. Do not add these TSX snapshots to application imports, TypeScript build inputs,
   package manifests, runtime code or a development server.
5. Document dependencies/gaps before recommending direct reuse, adaptation behind
   stable BCS wrappers, or a different implementation for owner review.
6. Do not change any IPX file, historical setup report or checksum inventory.

## Work performed on this bundle

The three sources were materialized as raw files, their dependencies were inspected,
and archive round-trip byte checks were performed. No React build, application
startup, browser test, accessibility test, package installation or Windows command
execution was performed to produce this bundle.
