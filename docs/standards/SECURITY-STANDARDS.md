# Security standards and safety gates

Status: **Required safeguards / proposed implementation detail. Not implemented or tested.**
The source handover sets authentication, least privilege, portal isolation, safe mapping,
consent/suppression, secrets protection, audit and non-destructive integration requirements.
The checks below make those requirements actionable; design details still need review.

## Authorization and tenant isolation

Validate trusted identity and portal/tenant scope on every protected API, preview, count,
lookup, export, attachment, queue action and worker operation. Enforce action-level and
record-level rights. Reject cross-portal identifiers even when guessed or copied from
another authorized session. Do not use a browser-selected portal ID as proof of access.

Standalone and parent-portal entry modes need explicit identity/session contracts. Embedded
context must be authenticated and constrained to the intended audience/scope; evaluate
expiry, replay, logout/revocation and authorized origin behaviour. Never accept arbitrary
email/user/role values or a demo rights toggle as authenticated identity.

## Secrets and connectivity

Store DB/provider credentials only in an approved server-side secrets mechanism. Do not
commit `.env` values, include passwords in documentation or log authorization tokens.
Separate development, test and production. Do not copy working credentials from other
projects. Prefer short-lived/least-privilege access where supported by the eventual host.

Source database credentials are restricted/read-only. Use approved APIs/views, validated
mapping identifiers and parameterized values. Restrict destinations and connections to
prevent the configuration UI from becoming an arbitrary internal-network request tool.
Use verified encrypted transport; do not disable certificate verification as a shortcut.
Private source databases must not be exposed publicly just to make integration easier.

## Email, events and recipient safeguards

No real send, including a test message, without explicit authorization for the environment,
sender and recipients. Keep production-disabled defaults and synthetic fixtures in early
increments. A queued/delivered demo label must never trigger a real provider call.

Distinguish operational/educational and optional marketing categories. Define lawful basis,
preferences and unsubscribe requirements with the responsible owner before activation.
Implement applicable provider/legal requirements after verifying current rules; this pack
is not a legal compliance certification. Process hard bounces, complaints, opt-outs and
other suppression states before subsequent dispatch. Prevent manual retries from bypassing them.

Verify the authenticity and expected account/region/portal relationship of provider or
source events. Deduplicate/replay-protect processing. Do not trust a message ID received
from an unauthenticated public request. Define delayed/out-of-order event handling and
record actual state transitions rather than overwriting history with a fabricated success.

Do not promise spam avoidance, delivery to inbox, exactly-once external email delivery or
accurate human-open tracking. Use verified provider quotas rather than the IPX's sample
8/second, 5,000/day or illustrative bounce/complaint thresholds.

## Input, content and file handling

Validate every boundary, including personalization variables, URLs, attachment references,
job schedule times, mapping definitions and export filters. Sanitize rich content, define
safe previews and avoid executing recipient/template content as application code.

Use file-type/size allowlists, a reviewed malware-scanning strategy, proper MIME handling,
private storage, authorized access and expiry/cleanup policies. Prefer secure links for
large files/videos; do not expose unrestricted storage URLs for protected materials.

Apply appropriate request rate/body limits, safe errors, correlation IDs and redacted logs.
Protect state-changing browser requests against session-related attacks under the chosen
authentication design. Escape CSV/Excel values that could execute as spreadsheet formulas.
Do not leak unauthorized counts, secrets or private recipients through error messages.

## Audit, recovery and approval

Audit who acted, authorized scope, relevant entity/version, intent, time and outcome without
copying unnecessary message bodies or credentials. Define retention/deletion, backup and
recovery before production data is retained. Queue pause/cancel/retry and permission or
mapping changes must be auditable.

Before live integration: approve the identity contract, isolation tests, connector grants,
secret handling and mapping tests. Before real email: additionally approve sender/domain
configuration, controlled recipients, queue/quotas, suppression, feedback, monitoring and
failure recovery. Before production: approve retention, backups, incident handling and
controlled rollout. None of those approvals is implied by creating these documents.
