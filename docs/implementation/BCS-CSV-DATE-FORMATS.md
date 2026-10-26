# CSV calendar-date support — 19 October 2026

## Result and root cause

Implemented locale-independent date normalization in the shared CSV contract and existing Import CSV preview. The previous validator accepted only YYYY-MM-DD; consequently valid 15-01-2000 values failed INVALID_DATE. The new parser validates Gregorian calendar components explicitly, never uses browser/Windows locale to interpret CSV and never converts DOB timestamps to a different timezone.

Owner file verified with the actual shared parser/normalizer/validator: `Downloads/Import Export/UniversalNotify_Synthetic_Recipients_Export.csv`, 29,754 bytes, 241 records and 18 columns. Auto and Indian modes both report 241 valid rows, zero date errors and zero other validation errors. SHA-256: `82027f46cb9df877e529bfa5131a962baeb6a23e1e840b2f55d101da36ed8e5d`. No recipient values are copied into this report. Original bytes are preserved.

Authenticated browser preview VERIFIED at http://127.0.0.1:3000/communication after owner sign-in. Loaded the exact file into the existing Import CSV dialog: Auto Detect displayed 241 rows, 0 local validation errors, and 15-01-2000 -> 2000-01-15 sample conversions. Searched for Indian in the shared searchable selector and selected it; the preview remained error-free. Confirm Import was never clicked: the dialog remained Not imported: 0 / 241 rows processed. Screenshot evidence (cropped above recipient data): `.local/csv-dates-20261019-165507/authenticated-date-preview.png`. No authentication bypass or credential request was used.

## Supported interpretation

- Auto: year-first YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD; unambiguous day-first or month-first numeric dates using hyphen/slash/dot (single-digit components included); English DD-MMM-YYYY (case insensitive); extended ISO calendar timestamps.
- Explicit searchable choices: Auto Detect, DD-MM-YYYY (Indian), MM-DD-YYYY (US), YYYY-MM-DD (ISO), DD-MMM-YYYY, Excel 1900 and Excel 1904.
- 01/02/2000 is AMBIGUOUS_DATE in Auto, even if adjacent rows suggest a convention. Indian resolves to 2000-02-01; US resolves to 2000-01-02. No silent day/month swap. Mixed unambiguous formats normalize row by row; mixed ambiguous values require owner review/selection. A single choice must be valid for the whole file; incompatible mixed ambiguous conventions need source correction.
- ISO timestamps retain their written calendar date, including offsets. Supported time suffixes are T followed by HH:mm, optional seconds/fraction, and optional Z or signed offset. Ordinal/week/basic ISO forms, two-digit years and localized month names are not guessed.
- Excel numeric serials require the explicit 1900/1904 choice, never a guess based on operating system. Serial fractions are time-of-day and do not change DOB. 1900 serial 60 (the fictitious 1900-02-29) is rejected; 1904 serial zero is 1904-01-01. Bounds and impossible dates fail validation. [Microsoft date systems](https://support.microsoft.com/en-gb/excel/date-systems-in-excel), [1900 leap-day compatibility behavior](https://learn.microsoft.com/en-US/office/troubleshoot/excel/wrongly-assumes-1900-is-leap-year).
- Existing DOB limits (1900 through today) remain. Gregorian leap-year rules reject 1900-02-29 and accept 2000-02-29. Empty DOB remains an empty CSV value and becomes NULL through the existing server values mapping.

## Existing UI and API integration

The existing searchable SmartSelect displays Date Format in Import CSV. The preview shows detected format(s), three source-to-ISO sample conversions and normalized dates. Date parsing errors disable Confirm import until resolved. Other existing partial-row validation behavior is unchanged.

The authenticated session GET response adds only company/portal scope identifiers already validated by the existing session checks. The optional Remember date format for this portal action stores only the format code under a company/portal-scoped browser preference key. No CSV, contact values, credentials or server/database preferences are stored. It is a per-browser portal preference, not cross-device persistence. An explicit user choice takes precedence over a late preference load. The current import locks its interpretation, and chunk identity incorporates normalized rows so two interpretations do not silently share a receipt.

Before POST, dates are already YYYY-MM-DD. The shared server validator independently normalizes supported unambiguous input and rejects unresolved ambiguity. Company/portal/contact uniqueness, consent, suppression and status preservation are unchanged. No database/schema/migration changes were made.

Authenticated export defaults to ISO. The existing toolbar now offers ISO, Indian, US and English month-name export formats. The server validates the export format allowlist and rejects duplicate format parameters. ISO validation still occurs before rendering the selected export format. On reimport, choose the matching format if the exported numeric dates are ambiguous.

## Changed files

Modified existing files:
- packages/contracts/src/contact-csv.ts — shared DOB normalization.
- apps/web/src/contact-import.tsx — searchable selector, detection/conversion preview, scoped UI preference and normalized POST payload.
- apps/web/src/recipient-csv.ts — shared parser/formatter instead of one-off date conversion.
- apps/web/src/server/recipient-export.ts — allowlisted export date format.
- apps/web/src/communication.tsx — export date format selector using existing shared control.
- apps/web/app/api/bcs/app/session/route.ts — validated scope identifiers in session GET response; no authentication/permission logic changes.
- tests/csv-roundtrip.test.tsx — permits new read-only preference-context GET while still rejecting writes in the preview test.
- docs/handover/WORK-STATUS.md — current task status.

Added:
- packages/contracts/src/csv-date.ts — shared parsing/detection/calendar validation and export formatting.
- tests/csv-date.test.ts — format, ambiguity, mixed dates, leap-year, Excel and round-trip tests.
- tests/csv-date-preview.test.tsx — 241-row preview, searchable ambiguity resolution and per-portal preference tests.
- docs/implementation/BCS-CSV-DATE-FORMATS.md — this report.

## Acceptance and rollback

At http://127.0.0.1:3000/communication, sign in privately, open Import CSV and select the exact original CSV. Auto converts 15-01-2000 immediately; select Indian for ambiguous day-first rows. Inspect detected formats/sample conversions and the preview/error count. Do not click Confirm import. No new application or synthetic mode is needed.

Backups, intake SHA-256 manifest and test logs are in `.local/csv-dates-20261019-165507/`. To roll back source, stop the task-owned dev server normally and restore only the listed existing files from that backup after checking for later changes. New files may remain unused; no Git reset, deletion, database rollback or historical migration changes are required.

## Verification results

- npm.cmd run typecheck: exit 0; repeated after final source changes, exit 0.
- npm.cmd run lint: exit 0; repeated after final source changes, exit 0.
- npm.cmd test: exit 0, 396 passed and 16 skipped (40 passing suites, 2 skipped live-integration suites). Default parallel runner passed this time; no timeout/runner configuration changes.
- npm.cmd run build: exit 0.
- Focused date/preview/round-trip checks also passed after the final import interpretation-lock change.
- Exact owner file: 241 valid rows, 18 columns, zero date or other validation errors with Auto or Indian selection. Original file SHA-256 unchanged.
- All 12 IPX files and all three Smart archival files match baseline SHA-256 and byte sizes.
- Intake inventory comparison found exactly the eight listed existing-file changes and no missing pre-existing files. SQL/migrations, authentication implementation, User Management/Rights, original CSVs, all unrelated source and scripts remain unchanged.
- Final Git: main at 2c073ba7b3c11965703e92f52a21cd24b105065e; 39 modified tracked files and 157 untracked files, all earlier work retained; zero staged files. No commit or push.

Logs: `.local/csv-dates-20261019-165507/`. The 16 skipped cases require live database integration and were not enabled. No Confirm Import, schema execution, contact update or SES action was performed.

Separate observed limitation: the authenticated recipient grid displayed Database unavailable. CSV preview/validation runs locally and was verified successfully, but database-backed export/import connectivity was not accepted or changed in this date-format task. The prior CSV SQL proposal remains unexecuted. Next activity: owner review of the corrected preview and separate investigation of the existing recipient-reader availability before live import approval.
