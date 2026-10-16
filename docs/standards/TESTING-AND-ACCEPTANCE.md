# Testing and acceptance

Status: test plan, not test execution evidence. No application test runner exists yet.
Creating `tests/unit`, `tests/integration`, `tests/e2e`, `tests/security` and `tests/visual`
does not mean tests have been authored or run.

## Verification layers

| Layer | Required evidence when its implementation exists |
|---|---|
| Unit | Validation, normalized contracts, selection transitions, eligibility, scheduling and state rules |
| Integration | Real isolated test-store persistence, authorized adapter boundaries, mapping rules and worker behaviour |
| End-to-end | All five pages/tabs and authorized workflow transitions with realistic synthetic fixtures |
| Security | Cross-tenant denial, unauthorized actions, secret redaction, input abuse, replay and suppression bypass attempts |
| Visual | IPX-to-production comparisons across reference states, themes, desktop/tablet/mobile widths |

Unit mocks are not a substitute for server persistence or isolation integration tests.
A static preview is not proof of working authentication, a database or SES. Report skipped
checks and missing prerequisites explicitly.

## Priority component scenarios

Test group/subgroup search, stable IDs, keyboard selection, Clear/Done, loading/errors,
disabled options with reasons, dependent filters and stale asynchronous responses. Test
portal/scope switching without selection leakage.

Test grid search across configured fields, filtering/sorting, ties, page-size changes,
column visibility, Compact/Comfortable density and selection across pages/tabs/filters.
Prove that Select page and Select all matching differ. Exercise explicit exclusions,
deselect matching, clear-all, zero matches, ineligible records and large matching results
without bulk downloading all recipients into the browser. Revalidate before send.

Test form validation, save/cancel, duplicate submissions, optimistic conflicts, safe preview,
missing personalization fields and attachment status. State must not appear saved when
only local browser demonstration storage has changed.

## Visual acceptance matrix

Cover Dashboard; Communication's three tabs; Scheduling's three tabs; Reports' three tabs;
and Configuration's four tabs. Capture select menus open/closed, selected grid rows,
columns panel, density modes, loading/empty/errors, modals, email preview and permissions.

Use the same CSS viewport, browser zoom, fixture, theme and scroll position for IPX and
production comparisons. Suggested initial viewport checks: 1440x900, 1280x800, 768x1024 and
390x844, plus the owner's actual browser viewport. These are proposed test dimensions,
not a claim about the screenshots' CSS viewport. Include 200% zoom/keyboard checks.

Avoid whole-page horizontal overflow and clipped actions. Check labels, focus, accessible
names and interaction state; report any required accessibility deviation for owner review.
Do not approve a generic component theme merely because functionality works.

## Data and delivery acceptance when authorized

Use synthetic data across at least two portal scopes and the approved source engines.
Test duplicate event/submit handling, stale class revisions, invalidated reminders,
cancellation during processing, interrupted workers, retryable/permanent provider failures,
quota limits, uncertain provider response, duplicate/out-of-order feedback and suppression.
Do not send real mail to exercise these cases without explicit authorization.

Provider acceptance is not delivery. Message delivery is not inbox placement. Preserve
these distinctions in tests, API contracts, UI badges and reports.

## Completion report for every increment

Record scope, changed files, actual commands, pass/fail counts where applicable, evidence
paths, tests not run and why, IPX preservation result, remaining blockers and next proposed
activity. Owner visual approval is separate from automated checks. Keep assertions tied
to the tested commit/files and environment.

## Step 1C documentation-only acceptance

The setup preflights workspace/expected directories, detects destination conflicts, creates
new files without overwrites, verifies their hashes and compares IPX file content before
and after. It writes a checksum inventory and success report. These checks verify document
installation and IPX content preservation for that run only, not a backup, browser state,
production functionality or tamper-proof protection against future edits.
