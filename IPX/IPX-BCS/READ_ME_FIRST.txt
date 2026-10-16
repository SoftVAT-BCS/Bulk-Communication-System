UNIVERSAL NOTIFY — PARTNER UI REVIEW PACKAGE (V1.0)
Date: 16 October 2026
Status: INTERACTIVE OFFLINE UI PROTOTYPE — NOT A LIVE EMAIL APPLICATION

HOW TO OPEN
1. Extract the ZIP into a folder on Windows.
2. Open index.html in Chrome, Edge or another modern browser.
3. Use the left navigation to browse 5 pages.
4. Use the appearance toggle to try both light/dark themes.
5. Use a narrow browser window or a phone browser to evaluate responsive layouts.
6. Keep the entire Assets folder next to the HTML files.

MAIN APPLICATION PAGES
1. dashboard.html — Independent overview, KPI cards, upcoming classes, recent campaigns, charts, sending health.
2. communication.html — Tabs: Recipient Selection / Compose & Send / Templates.
3. scheduling.html — Tabs: Class Schedule / Reschedule & Cancellation / Email Queue.
4. reports.html — Tabs: Overview / Delivery History / Bounces & Unsubscribes.
5. configuration.html — Tabs: Portal & Database / Field Mapping / Amazon SES / User Rights.
index.html opens the dashboard as the default entry page.

INTERACTIVE FEATURES THAT CAN BE TRIED
• Recipient grid: demo students, Course/Group + Batch/Subgroup searchable multi-select dropdowns.
• Dependent subgroup options: choose course(s) first to scope visible batches.
• Search by name, student ID, group and email.
• Sort by column, switch 10/20/50 rows per page, change Compact/Comfortable density.
• Show/hide columns, select/deselect individuals, current page or all matching authorized example records.
• Selection stays intact while changing filters and switching between tabs.
• CSV export for recipients, reports, suppression lists and queue.
• Email composer with dynamic personalized preview and sample templates.
• Local-only attachment names (NOT UPLOADED); queue/demo send simulation.
• Classes, reschedule/cancellation event previews and demo queue state toggles.
• Configuration examples for MySQL, SQL Server, PostgreSQL and portal API adapters.
• Table/column mapping preview; SES settings, mock permissions and explanatory security controls.
• Theme selection, demo templates, draft settings, selected recipients and demo queue items stored locally in browser where supported.

DEMO DATA
• 240 fictional students across 4 courses, 12 batches and several email eligibility states.
• Fictional campaign / delivery logs / class schedule entries.
• Dashboard and report summary KPIs are illustrative historical figures and do not necessarily sum to the 240 grid demonstration records.
• All email addresses use example.com; no real personal data.

IMPORTANT LIMITATIONS / FUTURE PRODUCTION WORK
• This package makes NO NETWORK CALLS, NO DATABASE CONNECTIONS and SENDS NO EMAIL.
• Amazon SES, SQS, S3, EventBridge, DNS verification, real auth/permissions and scheduling workers are NOT connected.
• Buttons marked demo illustrate user flows; they do not trigger real-world actions.
• Table/column names are only example mappings; live integration needs server-side credential storage, approved views or APIs, secure joins, tenant isolation and validation.
• Security, accessibility and behavior need full production implementation and testing.
• Lookups in this standalone HTML package are dependency-free JavaScript demonstrations of the requested UX. A future React/Next.js application can reuse or adapt the uploaded SmartSelect, SmartMultiSelect and SmartSearchLookup patterns; the source React components are not bundled/executed here.
• Real email deliverability needs verified SPF/DKIM/DMARC, opted-in audiences for marketing, opt-out rules, bounce/complaint event handling, SES quotas and continuous monitoring. Throttling alone does not prevent spam.

PARTNER FEEDBACK SUGGESTIONS
Please review and comment on:
[ ] Overall UI appearance / branding / typography / legibility
[ ] Dashboard information and action placement
[ ] Recipient search, group/subgroup behavior and Select All semantics
[ ] Grid columns, sorting, density, pagination, responsiveness
[ ] Email composer, template and attachment workflow
[ ] Class schedule, reschedule and cancellation workflow
[ ] Queue visibility and reporting
[ ] Configuration process for different portals and database engines
[ ] Role/page permissions and safe administration
[ ] Mobile usability, readability and tap targets
[ ] Missing features and desired changes

Share feedback in any format. No installation or internet connection is required.
