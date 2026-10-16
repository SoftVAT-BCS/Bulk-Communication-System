# UNIVERSAL NOTIFY — MASTER PROJECT CONTEXT & DEVELOPMENT HANDOVER

**Project Name:** Universal Notify  
**Product Category:** Universal Email & Notification Engine  
**Presentation Standard:** IPX – Interactive Product Experience  
**Project Stage:** IPX V1 Completed — Partner Review / Production Planning  
**Development Approach:** ChatGPT for planning, architecture and review; Codex for implementation  
**Target Platforms:** Desktop, Laptop, Tablet and Mobile  
**Primary Communication Provider:** Amazon Simple Email Service (SES)

---

# 1. PROJECT INTRODUCTION

This ChatGPT Project is dedicated exclusively to the planning, architecture, UI/UX, development, testing, integration, deployment and future expansion of **Universal Notify**.

Universal Notify is not intended to be another ordinary bulk-email application.

Our objective is to develop a **reusable, database-independent, portal-independent Email & Notification Engine** capable of integrating with multiple software applications without duplicating the core communication functionality.

The initial use case is educational institutions, training centres and learning management systems.

However, the architecture must support future integrations with:

- Educational portals and Learning Management Systems
- Customer Relationship Management (CRM) applications
- SoftVAT CRM and related business applications
- SAMATVA HMS and healthcare administration applications
- ERP and other business management portals
- Standalone enterprise applications
- Future web applications using different technologies

The fundamental principle is:

**Develop the communication engine and reusable pages once. Configure and integrate them wherever required.**

Each connected portal may have a completely different database, database structure, authentication system, user hierarchy and permission model.

Universal Notify must accommodate those differences through secure integration adapters, validated mapping configurations and reusable interfaces.

---

# 2. CURRENT PROJECT STATUS

We have already discussed and finalized the primary functional requirements and UI architecture.

An interactive HTML-based presentation prototype has been developed.

**Existing deliverable:**

`Universal_Notify_Partner_UI_Review_V1.zip`

The ZIP contains a folder with the five-page application.

Main entry point:

`Universal_Notify_UI_Review/index.html`

Individual demonstration pages:

- `dashboard.html`
- `communication.html`
- `scheduling.html`
- `reports.html`
- `configuration.html`

The prototype includes static educational data, interactive navigation, grids and demonstrations of key business workflows.

Approximately 240 fictional student records are available for UI evaluation.

The prototype works offline without requiring a database, backend server or Amazon SES connection.

**Current status:**

The UI design and navigation system have been reviewed and positively accepted by the project owner.

The prototype is being shared with a business partner for additional feedback.

**Important distinction:**

The existing HTML prototype is an IPX demonstration. It is not a production application.

Real database connections, authentication, authorization, email sending, background processing and persistent data management have not yet been implemented.

The production application must be developed separately while preserving the approved user experience.

---

# 3. IPX — INTERACTIVE PRODUCT EXPERIENCE

We use the designation:

**IPX – Interactive Product Experience**

for our professional interactive software presentations.

An IPX is a high-fidelity, interactive UI/UX prototype intended to demonstrate the proposed product experience to customers, partners, management and investors.

It should provide realistic navigation and usable interactions with fictional or synthetic data.

Our presentation naming convention is:

**Universal Notify — IPX V1.0**

Future revisions may be identified as IPX V1.1, V1.2 and so forth.

The term IPX is our chosen internal presentation standard, not a claim of exclusive ownership or invention.

The completed IPX should serve as a visual and interaction reference throughout production development.

---

# 4. FINALIZED APPLICATION NAVIGATION

We initially considered 12 separate UI pages.

However, the project owner decided to consolidate them using page-level tabs.

**Finalized architecture: Five Main Pages.**

### Page 1 — Independent Dashboard

A standalone application dashboard showing:

- Total available recipients
- Eligible recipients
- Emails sent today
- Scheduled emails
- Pending queue
- Successfully delivered emails
- Failed and bounced emails
- Spam complaint indicators
- Upcoming educational classes
- Recent notifications
- Campaign performance
- Amazon SES sending health
- Portal-wise and group-wise statistics

The dashboard must support selecting a specific portal or viewing an authorized consolidated summary.

Display meaningful charts, informative KPIs and concise operational alerts.

Dashboard data must be permission-scoped.

### Page 2 — Communication

Page-level tabs:

**Tab A: Recipients**

Group selection, subgroup selection, advanced recipient grid, searching, filtering and selection management.

**Tab B: Compose & Send**

Email subject, sender, recipients, HTML body, attachments, personalization, preview, send test, send now and schedule options.

**Tab C: Templates**

Reusable email templates for class schedules, rescheduling, cancellations, reminders, newsletters and other communications.

Recipient selections must be preserved while moving between communication tabs.

### Page 3 — Scheduling

Page-level tabs:

**Tab A: Class Schedule**

Create and view upcoming classes, select groups and subgroups, configure class details and initiate class notifications.

**Tab B: Reschedule & Cancellation**

Update schedules, cancel classes, notify affected participants and invalidate obsolete reminders.

**Tab C: Email Queue**

View scheduled email jobs, queue status, processing windows, retry attempts, priority and pause/resume actions.

### Page 4 — Reports

Page-level tabs:

**Tab A: Summary Reports**

Campaign-level, portal-level, group-level and date-range reporting.

**Tab B: Delivery History**

Individual email delivery records, provider event statuses, timestamps, failures and retry details.

**Tab C: Bounces & Unsubscribes**

Hard bounces, soft bounces, spam complaints, unsubscribe history, suppression rules and delivery restrictions.

Reports should support filtering, pagination, sorting, column selection and CSV/Excel exports.

### Page 5 — Configuration

Page-level tabs:

**Tab A: Portal & Database**

Create and manage portal configurations and secure connection settings.

**Tab B: Table & Column Mapping**

Map external recipient, group, subgroup, class and related database structures to Universal Notify's common model.

**Tab C: Amazon SES**

Configure verified email identities, domain authentication, sending controls, SES regions and feedback processing.

**Tab D: User Rights**

Control authorized access to portals, pages, tabs, recipient groups and permitted actions.

The five-page navigation structure should remain stable unless a genuine business requirement justifies a change.

---

# 5. UI/UX DESIGN REQUIREMENTS

The project owner expects a world-class, professional enterprise application.

The approved IPX demonstrated:

- Clean enterprise visual design
- Compact sidebar navigation
- Professional page-level tabs
- Responsive dashboard cards
- Advanced grid controls
- Light/dark appearance support
- Consistent spacing and typography
- Mobile-friendly navigation
- Clear action buttons
- Professional forms and lookup controls

Design principles:

1. Simple and intuitive UI.
2. Minimal unnecessary whitespace.
3. High information density without clutter.
4. Consistent fonts, colours, controls and spacing.
5. Clear visual hierarchy.
6. Reusable grids, forms, dropdowns, modals and tabs.
7. Full keyboard accessibility.
8. Responsive design for all target screen sizes.
9. No horizontal overflow of the entire application on mobile.
10. Appropriate empty, loading, success and error states.
11. Compact and Comfortable grid modes.
12. Configurable column visibility.
13. Professional feedback for all user actions.
14. Consistent navigation whether the application runs standalone or inside another portal.

Desktop should support full grid functionality.

Mobile should adapt the interface intelligently using appropriately designed cards, mobile-friendly filters, controlled horizontal table scrolling where necessary and accessible lookup dialogs.

Avoid creating separate business logic for mobile devices.

---

# 6. ADVANCED SEARCH GRID — CRITICAL REQUIREMENT

The recipient search grid is one of the most important components.

The project owner has provided examples of previously developed reusable controls:

- `SmartSelect(1).tsx`
- `SmartMultiSelect(1).tsx`
- `SmartSearchLookup(1).tsx`

These represent the preferred lookup interaction style.

They demonstrate features such as:

- Searchable dropdowns
- Multi-selection
- Configurable display columns
- Keyboard navigation
- Search filtering
- Selected-row indicators
- Mobile search dialogs
- Clear selection
- Loading and validation states
- Reusable component behaviour

Review these components before deciding whether to reuse, adapt or replace them in the production implementation.

Do not assume these components are directly compatible with every future project.

## Recipient selection requirements

**Group:**

Searchable multi-select.

**Subgroup:**

Searchable multi-select filtered by selected groups.

**Recipients:**

Advanced searchable grid containing relevant fields such as:

- Selection checkbox
- Student/recipient ID
- Recipient name
- Email address
- Group
- Subgroup
- Class/batch
- Enrollment or recipient status
- Email eligibility
- Last notification status

Essential grid functionality:

- Search across configured columns
- Sort by column
- Multiple column filters
- Select individual records
- Deselect individual records
- Select all visible rows
- Deselect all visible rows
- Select all matching filtered records
- Clear entire selection
- Persistent selection across pages
- Persistent selection across filter changes
- Pagination
- Adjustable page size
- Column show/hide
- Compact/Comfortable layouts
- CSV/Excel export
- Display total results
- Display selected results
- Preview final recipients before sending

**Important selection distinction:**

"Select All Visible" means the currently displayed page.

"Select All Matching" means the full filtered result set across all pages, limited to the user's authorized and eligible recipients.

These must be implemented as distinct actions.

For large databases, do not download thousands of records merely to implement selection.

Use a server-side selection model with appropriate include/exclude handling.

At final send time, the backend must revalidate recipient authorization, eligibility, consent and suppression status.

Duplicate email addresses should not receive duplicate copies of the same notification unintentionally.

---

# 7. MULTI-DATABASE CONNECTIVITY

Universal Notify must support portals using different database engines.

Primary database types:

1. MySQL
2. Microsoft SQL Server
3. PostgreSQL

Future adapters may support MariaDB, Oracle or other systems.

Example:

Education Portal A may use MySQL.

Business CRM B may use Microsoft SQL Server.

Hospital Portal C may use PostgreSQL.

All three must connect to the same Universal Notify communication engine without modifying its core email composition and delivery logic.

## Integration methods

Support two principal approaches.

**Method A — Secure Portal API**

Preferred for modern applications.

The external portal exposes approved and authenticated APIs for groups, subgroups, recipients, scheduling and relevant business events.

**Method B — Database Connector**

Useful for legacy applications where appropriate APIs are unavailable.

Use restricted, read-only database credentials, approved database views or explicit allowlisted query mappings.

Never expose database credentials to frontend code.

Never permit unrestricted SQL generated from arbitrary user-entered table or column names.

For private databases, evaluate secure integration agents or controlled network connectivity rather than exposing database servers publicly.

---

# 8. UNIVERSAL TABLE & COLUMN MAPPING

Different portals may use different database structures and naming conventions.

For example:

| Common Field | MySQL Education | MS SQL CRM | PostgreSQL Portal |
|---|---|---|---|
| Recipient ID | student_id | CustomerID | recipient_id |
| Name | student_name | CustomerName | full_name |
| Email | email | EmailID | email_address |
| Group | course_id | CategoryID | group_id |
| Subgroup | batch_id | SubCategoryID | subgroup_id |

These are example mappings, not real database schemas.

The configuration interface should allow authorized administrators to define:

- Source database or API
- Approved schema and table/view
- Primary key
- Recipient name field
- Email field
- Group source
- Subgroup source
- Group/subgroup relationships
- Required joins or approved views
- Active/inactive rules
- Recipient eligibility
- Consent or notification preferences
- Class identifiers
- Class dates and times
- Optional organization-specific fields

Provide:

**Test Connection**

Validates secure connectivity.

**Discover Schema**

Lists permitted schemas, tables/views and columns.

**Validate Mapping**

Checks field compatibility, relationships and required columns.

**Preview Data**

Shows a limited, authorized sample.

**Save Configuration**

Stores validated mappings and configuration metadata.

Table and column mapping alone cannot replace external portal business rules or authorization.

Any connected portal data must remain securely isolated from other portals.

---

# 9. CENTRAL UNIVERSAL NOTIFY DATABASE

The communication application should maintain its own central PostgreSQL database.

This is independent of the connected portal databases.

It should store:

- Portal registrations
- Integration configurations
- Validated mapping definitions
- User roles and permissions
- Email templates
- Notification rules
- Campaign records
- Recipient selection references/snapshots as needed
- Scheduled jobs
- Email queues
- Delivery attempts
- Amazon SES message identifiers
- Bounce and complaint events
- Unsubscribe and suppression records
- Audit history
- File attachment metadata

Do not duplicate entire external portal databases unnecessarily.

Retain only the information required for authorized notification execution, reporting and auditing.

Define appropriate data retention, encryption and deletion policies.

---

# 10. EDUCATIONAL COMMUNICATION WORKFLOWS

The initial educational use cases include:

**Class Scheduled**

Automatically inform the selected students about the class name, date, time, instructor, location or online joining link.

**Class Rescheduled**

Communicate the revised date and time and invalidate outdated reminders.

**Class Cancelled**

Notify relevant recipients that the class will not take place.

**Class Reminder**

Automatically send configurable reminders before the scheduled class.

**Educational Newsletter**

Send newsletters, announcements, learning materials and related updates to subscribed recipients.

**General Communication**

Allow authorized users to compose one-time or scheduled communications to selected recipients.

Use event-driven notifications where the connected portal can provide authenticated business events.

Each event should have a stable identifier and idempotency protection to avoid duplicate notifications.

Class scheduling data should remain owned by the source portal unless Universal Notify is explicitly designated as the authoritative scheduling system.

---

# 11. EMAIL COMPOSER

The Compose & Send tab should support:

- Verified sender identity
- Sender name
- Reply-to email
- Recipient preview
- Email category
- Subject
- Rich HTML editor
- Plain-text alternative
- Personalization variables
- Template selection
- Preview
- Desktop/mobile email preview
- Test email
- Attachment selection
- Send now
- Schedule later
- Draft saving

Example personalization:

`Dear {{recipient_name}}`

`Your {{course_name}} class has been scheduled for {{class_datetime}}.`

Personalization variables must be validated against authorized available fields.

Avoid exposing sensitive data through template substitution.

---

# 12. ATTACHMENT MANAGEMENT

The application should support:

- PDF documents
- Images
- Educational notes
- Presentations
- Other approved files
- Video links

Preferred storage:

**Amazon S3**

For small permitted files, direct email attachments may be considered.

For large files and videos, use secure document or media links.

Access-controlled material should use appropriate authorization and time-limited links.

Required controls:

- File-type allowlist
- File-size limits
- Malware scanning strategy
- Secure storage
- Attachment preview
- Attachment removal
- Proper MIME handling
- Storage access permissions
- Expiry and cleanup policies

Do not attach large video files indiscriminately to bulk emails.

---

# 13. AMAZON SES INTEGRATION

Amazon Simple Email Service is the selected production delivery provider.

The application must support:

- AWS region configuration
- Verified sending domain
- Verified sender identity
- SPF
- DKIM
- DMARC
- Amazon SES sending quotas
- SES send-rate restrictions
- Delivery tracking
- Bounce handling
- Complaint handling
- Suppression management
- Sending configuration sets
- Secure credential management

Potential supporting AWS services:

**Amazon SQS:** Background email queue processing.

**Amazon S3:** Attachment and file storage.

**Amazon EventBridge / SNS:** SES delivery and feedback events.

The exact AWS implementation should be justified during architecture planning rather than adding unnecessary infrastructure.

No real AWS credentials are to be included in code, demo HTML, logs or documentation.

---

# 14. SMART EMAIL SCHEDULING & DELIVERABILITY

The system must support sending approximately 1,000–5,000 emails per day initially, with future scalability.

The objective is reliable, compliant sending—not bypassing email providers' spam protections.

Required capabilities:

- Background job processing
- Rate-limited delivery
- Configurable sending intervals
- SES quota awareness
- Automatic retries for transient failures
- Exponential backoff where appropriate
- Queue pause/resume
- Campaign cancellation
- Priority-based scheduling
- Separate educational and marketing communication categories
- Duplicate prevention
- Delivery event processing
- Domain authentication checks
- Suppression management

A default configurable sending policy may distribute a campaign over a specified time period.

However, queue intervals alone cannot guarantee inbox placement.

The production application should adapt to SES quotas, recipient engagement, delivery failures and spam complaints.

**Priority example:**

High Priority — Class cancellations and urgent operational changes.

Normal Priority — Class schedules, reschedules and reminders.

Lower Priority — Newsletters and general promotional communications.

All sending must remain subject to applicable quotas, recipient preferences and delivery policies.

---

# 15. UNSUBSCRIBE, CONSENT & ANTI-SPAM REQUIREMENTS

Universal Notify must distinguish essential educational/operational messages from optional marketing communications.

Requirements include:

- Consent or another valid communication basis
- Category-specific preferences
- Unsubscribe mechanisms for marketing messages
- One-click unsubscribe where required
- Automatic suppression of unsubscribed addresses
- Hard-bounce handling
- Spam-complaint handling
- Prevention of repeated unsolicited sends
- Recipient deduplication
- Respect for applicable email provider and legal requirements

The application should protect sender reputation and clearly show warnings when delivery health deteriorates.

Do not promise 100% Spam-folder avoidance.

---

# 16. USER RIGHTS & PERMISSIONS

Universal Notify must work in two deployment modes.

**Standalone Mode**

Universal Notify authenticates users through its own supported identity system.

**Embedded / Integrated Mode**

Users enter through an authorized parent portal or CRM.

The integrated application validates the parent portal's authenticated identity and scoped authorization context.

Required permissions may include:

- Dashboard View
- Recipient View
- Recipient Select
- Template View
- Template Manage
- Compose Email
- Send Test
- Schedule Email
- Send Email
- Approve Campaign
- View Reports
- Export Reports
- Manage Queue
- Manage Portal
- Manage Database Mapping
- Manage SES Settings
- Manage User Rights

Permissions should be enforceable by portal, page, tab, action and authorized organizational scope.

Frontend menu visibility alone is not sufficient.

Backend authorization must validate every protected operation.

---

# 17. REUSABLE APPLICATION ARCHITECTURE

Develop the application as a collection of reusable modules rather than a monolithic portal-specific implementation.

Proposed conceptual layers:

**Presentation Layer**

Reusable React pages, components, tabs, grids, search controls and form systems.

**Application API Layer**

Receives authorized requests and coordinates application workflows.

**Integration Layer**

Connects with supported external databases and APIs.

**Common Data Model**

Normalizes recipients, groups, subgroups, classes and communication data.

**Notification Engine**

Manages templates, events, messages, schedules and queues.

**Provider Layer**

Integrates with Amazon SES and potentially future email providers.

**Persistence Layer**

Maintains central application configurations, audit history and communication records.

Use clean interfaces and explicit contracts so each connected portal can reuse the same functionality.

The same UI should work with different portal datasets without modifying the core page code.

---

# 18. PREFERRED TECHNOLOGY STACK

The initial proposed technology stack is:

| Component | Preferred Technology |
|---|---|
| Frontend | React / Next.js |
| Language | TypeScript |
| Backend | Node.js / TypeScript |
| Central Database | PostgreSQL |
| Search Controls | Reusable React search/lookup controls |
| Email Provider | Amazon SES |
| Queue | Amazon SQS / background worker |
| File Storage | Amazon S3 |
| Database Connectivity | Secure adapters for MySQL, MS SQL and PostgreSQL |
| Reporting | Server-side data APIs and reusable grids |
| UI | Responsive enterprise design system |
| Testing | Automated unit, integration, security and UI tests |
| Development Assistant | Codex |

This stack is the current recommendation, not a finalized technical ADR.

Architecture choices should be evaluated before production implementation.

---

# 19. GRID AND FORM STANDARDIZATION

All list and lookup screens must use common reusable components.

The existing SmartSelect, SmartMultiSelect and SmartSearchLookup examples should be examined as reference implementations.

Standardize:

- Searchable Select
- Searchable Multi-Select
- Advanced Search Lookup
- Filterable Data Grid
- Server-side Pagination
- Column Visibility
- Column Sorting
- Bulk Selection
- Filter Persistence
- Responsive Modal
- Confirmation Dialog
- Form Validation
- Error Handling
- Loading State
- Empty State
- Save and Cancel Actions

Avoid individually coded dropdown and grid implementations for each page.

All standard components should have documented props, event contracts and accessibility requirements.

---

# 20. REPORTING REQUIREMENTS

The Reports page must be capable of supporting:

- Portal-wise delivery reports
- Group-wise delivery reports
- Subgroup-wise delivery reports
- Campaign-wise reports
- Student/recipient-wise sending history
- Date-range reports
- Scheduled versus actual sending
- Failed and retried notifications
- Bounce statistics
- Spam complaint statistics
- Unsubscribe reports
- Queue performance
- SES quota utilization

Display clear distinctions between:

- Queued
- Submitted to SES
- Accepted by SES
- Delivered according to provider events
- Bounced
- Complained
- Suppressed
- Failed
- Cancelled

A provider acceptance event must not be mistaken for confirmed recipient delivery or inbox placement.

Email open metrics may be unreliable because of email client privacy protections.

CSV/Excel export should respect the user's permissions and applicable data protection requirements.

---

# 21. MOBILE COMPATIBILITY

The application must be fully responsive.

Desktop:

- Sidebar navigation
- Page-level tabs
- Full-width advanced grids
- Multicolumn configuration forms
- Dashboard charts

Tablet:

- Adaptive sidebar
- Responsive cards
- Touch-friendly controls
- Flexible grids

Mobile:

- Collapsible navigation
- Compact dashboard
- Scrollable or adaptive tabs
- Mobile-friendly recipient selection
- Full-screen lookup dialogs where appropriate
- Responsive forms
- Readable reports
- Touch-friendly actions

No separate mobile backend should be necessary.

All screen sizes must use the same business rules and authorization contracts.

---

# 22. DESIGN REFERENCES AND EXISTING MATERIAL

The following materials were previously supplied or developed.

**A. Universal Notify IPX**

`Universal_Notify_Partner_UI_Review_V1.zip`

Primary reference for approved visual appearance, navigation, page structure and interactions.

**B. SoftVAT CRM Screenshot**

Reference for enterprise sidebar navigation, professional data grids and application layouts.

**C. Existing Smart Lookup Components**

- `SmartSelect(1).tsx`
- `SmartMultiSelect(1).tsx`
- `SmartSearchLookup(1).tsx`

Reference for reusable search selection controls.

**D. SoftVAT GTM Business Simulator HTML**

`SoftVAT_GTM_Business_Simulator_V3.html`

Reference for standalone, offline HTML-based interactive presentation packaging.

The GTM simulator's financial business logic is unrelated to Universal Notify and must not be copied into this project.

If these files are not accessible in the new ChatGPT Project, request that the owner attach the relevant files once.

Do not pretend to have inspected unavailable files.

---

# 23. PRODUCTION SECURITY REQUIREMENTS

Security should be incorporated from the beginning.

Minimum principles:

- Proper authentication
- Backend-enforced role permissions
- Tenant/portal isolation
- No frontend database credentials
- No frontend AWS secrets
- Read-only external database access where applicable
- No arbitrary administrator-authored SQL execution
- Validated field mappings
- Secure API authorization
- Encrypted data transmission
- Appropriate secrets storage
- Parameterized queries
- Rate limiting
- Input validation
- Audit logging
- Secure file handling
- Proper data retention
- No unauthorized cross-portal data access

Connected source databases must not be modified unless an explicit, separately authorized integration contract requires it.

Initial integrations should prioritize non-destructive, read-only access.

---

# 24. DEVELOPMENT GOVERNANCE

The project will be developed step by step using Codex.

The project owner prefers:

**One activity at a time.**

Development instructions should follow these rules:

1. Understand the exact requirement before suggesting implementation.
2. Respect the approved IPX design.
3. Never overwrite completed work unnecessarily.
4. Never introduce unrelated changes.
5. Preserve existing functionality.
6. Use complete, precise Codex prompts.
7. Explicitly identify the project workspace.
8. Do not invent local folder paths.
9. Confirm the canonical project directory before creating production files.
10. Do not access or modify unrelated repositories.
11. Use separate development, test and production configurations.
12. Require migration and schema review before database changes.
13. Use synthetic data for demonstrations and tests.
14. Never send real emails without explicit authorization.
15. Run relevant automated tests.
16. Summarize changed files and test results.
17. Record important architectural decisions.
18. Create commits only as instructed or authorized.
19. Identify blockers rather than silently implementing shortcuts.
20. Provide clear next-step guidance after each completed activity.

**Coding preference:**

Do not provide unnecessary source code directly in ChatGPT messages unless explicitly requested.

When implementation is required, provide a complete and carefully scoped Codex prompt.

For installation or configuration activities, provide Step 1 first, wait for confirmation, then continue.

---

# 25. DEVELOPMENT PHASES

The proposed phased roadmap is:

**Phase 0 — IPX Finalization**

Review partner feedback, finalize page layouts, interactions and application scope.

**Phase 1 — Production Architecture**

Finalize technology stack, repository structure, central data model, API contracts, security architecture and integration design.

**Phase 2 — Responsive UI Foundation**

Convert the approved HTML IPX into production-ready reusable React components, preserving appearance and interaction standards.

**Phase 3 — Database & Portal Integration**

Implement portal registrations, MySQL/MS SQL/PostgreSQL adapters, field mapping, schema validation and secure read-only recipient lookups.

**Phase 4 — User Authorization**

Implement standalone authentication where needed, embedded portal authentication contracts and role-based page/action permissions.

**Phase 5 — Communication Workflow**

Implement recipient selection, HTML composition, templates, personalization, attachments and draft management.

**Phase 6 — Scheduling & Educational Events**

Implement class scheduling notifications, rescheduling, cancellations, reminders, notification policies and idempotency.

**Phase 7 — Amazon SES**

Implement verified sender configuration, production email delivery, secure credentials, sending limits, message tracking and feedback processing.

**Phase 8 — Queue & Deliverability**

Implement persistent background jobs, throttling, retries, priority, campaign cancellation and suppression rules.

**Phase 9 — Reports & Dashboard**

Connect UI dashboards and reports to real authorized operational data.

**Phase 10 — Integration & Security Testing**

Test multiple portals, different database engines, cross-tenant isolation, authorization, large recipient lists, mobile behaviour and SES failure scenarios.

**Phase 11 — Production Readiness**

Complete deployment planning, backup and recovery, monitoring, documentation and controlled production rollout.

Each phase should be independently reviewed before proceeding.

---

# 26. IMPORTANT COMPLETED DECISIONS

The following decisions have already been made and should not be repeatedly reopened without a clear technical reason:

- The product will be called Universal Notify for now.
- The main function is a reusable Email & Notification Engine.
- Amazon SES is the selected email delivery provider.
- We need support for MySQL, MS SQL Server and PostgreSQL source databases.
- The app should operate independently or as part of a portal.
- Database field mapping must be configurable.
- User rights must be configurable.
- Group and subgroup selection must support searchable multi-selection.
- Recipient grids must offer advanced search, sorting, pagination and bulk selection.
- Educational class schedules, reschedules and cancellations are core use cases.
- Email queueing and controlled sending are required.
- Attachments and secure document links are required.
- The UI has been consolidated into five main pages using page-level tabs.
- Mobile responsiveness is mandatory.
- The existing HTML IPX navigation and visual direction have been approved.
- Real production backend development has not yet started.
- The product must remain reusable across multiple portals.

---

# 27. CURRENT IMMEDIATE OBJECTIVE

The IPX V1 HTML prototype has been completed and reviewed positively by the project owner.

It is now being shared with a business partner to gather feedback.

The immediate objective is to:

1. Preserve the approved IPX V1 baseline.
2. Review and categorize partner feedback.
3. Identify any changes required in functionality, grids, configuration or UI.
4. Finalize the functional and technical blueprint.
5. Confirm the production project workspace.
6. Prepare the first properly scoped Codex development activity.

Do not jump directly to Amazon SES production integration or live database connectivity before architecture and security prerequisites are reviewed.

---

# 28. HOW CHATGPT SHOULD ASSIST ME

Act as my dedicated Universal Notify:

- Product Architect
- Technical Architect
- UI/UX Reviewer
- Database Integration Architect
- Security Reviewer
- Amazon SES Integration Advisor
- Quality Assurance Planner
- Codex Prompt Engineer
- Development Project Coordinator

Maintain continuity throughout this dedicated ChatGPT Project.

Prefer practical, production-minded advice.

Use concise explanations when I request a short answer.

When I request a detailed plan, provide complete structured coverage.

Avoid repeatedly asking for previously confirmed project requirements.

Always distinguish between:

**Completed / Approved**

**Proposed / Pending**

**Implemented / Tested**

**Not Yet Developed**

Never confuse a static IPX demonstration with functioning production software.

---

# 29. FIRST RESPONSE EXPECTED IN THIS NEW CHAT

Please acknowledge and understand the complete Universal Notify Master Project Context.

Confirm the following:

1. Our product objective.
2. Current IPX V1 status.
3. Finalized five-page UI architecture.
4. Multi-database integration requirements.
5. Amazon SES and controlled sending requirements.
6. Reusable UI and advanced grid requirements.
7. Production development status.
8. The immediate next activity.

Do not generate code or a Codex implementation prompt yet.

Wait for my next instruction or partner feedback before proceeding.

**Our ultimate objective is to build one secure, elegant, reusable communication engine that can be integrated into multiple applications with minimal portal-specific development.**

---

**END OF UNIVERSAL NOTIFY MASTER PROJECT HANDOVER**