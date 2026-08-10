AUDIT TRAIL RENOVATION — PRE-PRD RECONNAISSANCE REPORT

You are working on the BIGDROPS business platform.

This is NOT an implementation task.

Do not modify application code, migrations, schemas, UI components, or configuration.

Your job is to perform a comprehensive evidence-gathering investigation of the EXISTING audit-trail system so that a subsequent design agent can write a Backend PRD and Frontend PRD for an audit-trail renovation/upgrade.

The existing application already has audit functionality. This is therefore a RENovation + ARCHITECTURAL UPGRADE, NOT a greenfield audit implementation.

---

CRITICAL: READ AGENTS.md BEFORE INVESTIGATION

OpenCode has full repository access.

Read `AGENTS.md` immediately and follow all applicable repository rules.

Also load the relevant skills from `docs/PROJECTSKILLINDEX.md` based on this investigation, especially anything relevant to:

- Supabase/Postgres architecture
- multi-tenancy
- frontend architecture
- TypeScript architecture
- audit/compliance systems

---

1. MANDATORY PRE-INVESTIGATION CONTEXT CORPUS

Before investigating or reporting on the existing audit system, inspect ALL of the following repository areas/documents. These are mandatory inputs because the audit-trail architecture is being renovated alongside the workspace/company multi-tenancy architecture and the broader platform architecture.

1.1 Multi-Tenancy Reports

Inspect: `docs/Reports/multi-tenancy/`

Read the relevant reports in this directory, especially:
- gap analyses
- architecture investigations
- schema-per-entity investigations
- provisioning reports
- tenant-context investigations
- current-schema/search-path investigations
- reports describing public vs entity-local data

Do not assume every report is current. For each relevant report determine:
- date
- stated architecture/version
- whether findings were subsequently resolved
- whether the finding still applies to the live repository/database

Use the reports as historical/evidence context, not unquestioned truth.

1.2 Multi-Tenancy PRD

Mandatory: `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`

Read the complete document, not merely search snippets.

Extract every requirement that can affect audit architecture, especially requirements concerning:
- workspace
- company/entity
- tenant
- entity identity
- public schema
- entity schemas
- schema routing
- current_schema
- workspace-level operations
- entity/company-level operations
- permissions
- membership
- RLS
- RPCs
- audit/activity/event storage
- platform events
- entity-local events
- data isolation

Explicitly identify the sections that constrain future Audit Router behavior.

1.3 ERP Frontend PRD

Mandatory: `docs/prd/multi-tenancy/erp-frontend-prd-v1.1.md`

Inspect how the frontend architecture defines:
- workspace
- company/entity context
- navigation
- workspace switching
- company switching
- dashboard context
- document context
- global vs company-scoped UI
- settings
- permissions
- platform/workspace surfaces

Determine which frontend assumptions directly affect:
- Audit Center
- dashboard audit previews
- document audit previews
- workspace audit
- company audit
- navigation into audit

Do NOT redesign the ERP frontend. Instead identify constraints the audit UI must respect.

1.4 Platform Office PRD

Mandatory: `docs/prd/Platform-god/platform-office-prd.md`

This document must be treated as an audit-adjacent architectural dependency. Determine:
- what Platform Office is responsible for
- what constitutes a platform-level event
- what constitutes an operational/business event
- whether Platform Office has administrative visibility into workspace/company activity
- whether platform operations require their own audit trail
- whether platform users/administrators are distinct actors
- whether platform events belong in workspace audit, company audit, or a separate platform scope
- how platform-level observability/compliance interacts with tenant isolation

Do not automatically merge Platform Office audit with business/company audit. The investigation must explicitly answer whether Platform Office implies a THIRD conceptual audit scope:

```
Platform
↓
Workspace
↓
Company
```

or whether platform events are intentionally represented elsewhere. This is an architectural question that must be resolved from evidence.

1.5 Existing Audit-Trail Reports

Mandatory: `docs/Reports/Audit-trail/`

Read the relevant reports in this directory. These reports represent prior investigation into the existing audit system and MUST be compared against the current repository and live database.

For every major prior finding:
1. Locate the original claim.
2. Verify whether the implementation still matches it.
3. Verify whether the live database still matches it.
4. Mark it:
   - CONFIRMED
   - RESOLVED
   - PARTIALLY RESOLVED
   - SUPERSEDED
   - CONTRADICTED BY CURRENT STATE
   - UNVERIFIABLE

Pay particular attention to reports concerning:
- audit_logs
- activity_events
- audit RPCs
- missing RPCs
- CSR audit
- Waybill audit
- Invoice audit
- Quotation audit
- event vocabulary
- audit UI
- document history
- audit persistence
- audit schema
- audit routing
- actor attribution

Do not simply summarize these reports. Use them as hypotheses to verify against the CURRENT system.

---

2. CONTEXT-CORPUS CROSS-VALIDATION

After reading the above documents, create a matrix:

| Source | Architectural Claim | Current Repo State | Live DB State | Status | Audit Impact |

The purpose is to prevent an old report or PRD from silently becoming the source of truth when implementation has already moved beyond it.

Where sources conflict, explicitly identify the conflict.

Use the following precedence for determining CURRENT FACT:
1. Live database state for database reality
2. Current repository implementation for application reality
3. Current approved PRD requirements for intended future architecture
4. Investigation reports for historical/evidence context
5. Older reports/design notes as supporting historical context

Do NOT use this precedence to erase contradictions.

If the current implementation violates an approved PRD requirement, report:

```
CURRENT IMPLEMENTATION:
...

PRD REQUIREMENT:
...

GAP:
...

AUDIT CONSEQUENCE:
...
```

---

3. CORE INVESTIGATION OBJECTIVE

Determine exactly how audit currently works across BIGDROPS.

We need enough evidence to design the future architecture around this target model:

WORKSPACE-LEVEL AUDIT

A workspace has its own audit trail. There should be ONE workspace-level audit trail. Do NOT design multiple workspace-level audit clones.

Workspace-level events concern the workspace itself and workspace-scoped/platform operations.

COMPANY-LEVEL AUDIT

Companies/entities inside a workspace have their own independent audit trails. Each company must have its own company-level audit stream. A company audit trail must NOT silently become the workspace audit trail.

A workspace can therefore conceptually contain:

```
Workspace Audit
├── Company A Audit
├── Company B Audit
└── Company C Audit
```

The workspace audit and each company audit are independent streams with explicit scope.

FRONTEND TARGET DIRECTION

The existing UI already contains audit surfaces. The future design is expected to have:

1. Dashboard — company-level audit mini-clone where appropriate
2. Document View pages — company-level audit mini-clone where appropriate
3. Audit Center / Audit Trail mother shell — authoritative full audit experience capable of switching/filtering between the relevant audit scopes

The exact UX is NOT yet decided. Your job is to discover what currently exists and provide evidence that allows the next design phase to decide this safely.

---

4. MANDATORY AUDIT SCOPE ANALYSIS

The reconnaissance MUST explicitly determine whether BIGDROPS needs exactly these audit scopes:

Scope A — Workspace Audit: One authoritative audit stream for the workspace itself. Examples: workspace settings, membership changes, workspace configuration, workspace-level administration, workspace lifecycle, workspace-level security/permission changes.

Scope B — Company Audit: Independent audit stream for each company/entity inside the workspace. Examples: invoices, quotations, payments, CSR, Waybill, projects, company settings, company document operations, company financial activity.

Scope C — Platform Audit: Determine from Platform Office PRD and current architecture whether platform-level events require an independent platform audit scope. DO NOT assume Scope C exists. Prove or disprove it from the architecture corpus and current implementation.

The final report MUST state one of:
- TWO scopes: Workspace + Company
- THREE scopes: Platform + Workspace + Company
- Another explicitly justified model

---

5. AUDIT DATA OWNERSHIP QUESTION

For every audit event category, determine WHO OWNS THE EVENT.

Use an explicit matrix:

| Event | Platform | Workspace | Company | Document | Current Owner | Future Owner |

Examples to investigate:
- user joined workspace
- workspace settings changed
- company created
- company settings changed
- invoice created
- invoice edited
- quotation created
- quotation dispatched
- payment recorded
- CSR created
- Waybill created
- document converted
- document deleted
- role changed
- membership revoked
- platform administrator action

This is critical because an event's ownership determines where it belongs in the future audit routing model.

---

6. LIVE DATABASE INVESTIGATION — MANDATORY

You MUST inspect the actual connected Supabase database.

Do NOT use Docker. Do NOT start a local Supabase instance. Do NOT invent schema state from repository migrations alone.

Use the existing authenticated/connected Supabase environment and obtain a LIVE database dump/inspection through PowerShell.

Use PowerShell commands/tools available in the environment.

The purpose is to compare:
- A. Repository definitions
- B. Current live database state

The live database is authoritative for determining what actually exists in the connected environment.

Inspect at minimum:
- schemas
- tables
- views
- functions
- RPC functions
- triggers
- trigger functions
- indexes relevant to audit
- foreign keys
- RLS policies
- grants/permissions where relevant
- audit-related enums/types
- audit-related metadata columns
- workspace-related tables
- company/entity/tenant-related tables
- membership/role relationships
- any schema-per-entity infrastructure already present
- any existing activity/event infrastructure
- any existing audit_logs infrastructure

Capture the relevant SQL definitions and relationships in the report.

DO NOT modify the database. DO NOT apply migrations. DO NOT create tables/functions. DO NOT use Docker.

---

7. REPOSITORY AUDIT INVENTORY

Search the entire repository for all audit-related implementation.

Do not assume the feature is called only "audit".

Search for concepts including, but not limited to:
- audit
- audit_logs
- activity_events
- activity
- history
- timeline
- compliance
- event
- recordcreated
- recordupdated
- recorddeleted
- audit RPCs
- activity RPCs
- logging functions
- document history
- document activity
- change history
- created_by
- updated_by
- actor
- performed_by
- metadata
- event_type
- entity_id
- workspace_id
- company_id
- tenant_id
- current_schema
- schema routing

Identify every meaningful audit implementation rather than only files explicitly named "audit".

---

8. BACKEND ARCHITECTURE REPORT

Document the CURRENT backend architecture.

8.1 Audit Persistence

Where are audit records stored? Identify:
- tables
- schemas
- views
- RPCs
- direct inserts
- triggers
- server-side functions
- client-side persistence
- any duplicated storage systems

Explicitly determine whether audit_logs and activity_events are:
- actually separate systems
- aliases/views
- partially overlapping systems
- completely different purposes
- historical leftovers
- currently both active

Do not assume they should be merged. Establish evidence first.

8.2 Event Vocabulary

Produce an inventory of existing event types. For each event identify:
- event name/type
- source module
- persistence mechanism
- actor
- target entity
- target document
- metadata
- timestamp
- current scope
- whether the event is generated automatically or explicitly
- whether it is versioned
- whether event semantics are consistent

Identify duplicate or inconsistent event naming.

8.3 Current RPC Architecture

Inventory every audit/activity-related RPC. For each RPC document:
- exact function name
- arguments
- return type
- schema
- SQL body/function definition
- tables written to
- whether it assumes public schema
- whether it knows tenant/company/workspace identity
- whether it derives identity internally
- whether it trusts client-provided identifiers
- whether it is called from frontend code
- all known call sites

Pay special attention to the recently investigated CSR and Waybill audit RPC situation. Determine whether:
- record_csr_created exists in live DB
- record_waybill_created exists in live DB
- record_invoice_created exists
- other record audit RPCs exist
- repository and live DB disagree

Do not fix anything. Report only.

8.4 Direct Supabase Calls

Find every frontend/backend direct write to audit/activity tables. Record:
- file
- function
- table
- operation
- payload shape
- scope fields

8.5 Existing Abstraction Boundaries

Determine whether there is currently any central abstraction equivalent to:
- Audit.emit(...)
- AuditRegistry
- AuditRouter
- AuditPersistence
- AuditFormatter

If none exists, explicitly state that. If partial equivalents exist, map them.

---

9. MULTI-TENANCY / WORKSPACE MODEL INVESTIGATION

This is critical. Determine exactly how BIGDROPS currently models:
- user
- workspace
- company/entity/tenant
- membership
- current workspace
- current company/entity
- company ownership
- workspace membership
- company membership
- roles
- permissions
- schema routing
- current_schema
- entity schema
- public schema

Find the actual source of truth for each. Do not infer.

Create a relationship model such as:

```
User
↓
Workspace
↓
Company/Entity
```

but only if the actual database confirms this structure.

Determine whether one workspace can contain multiple companies/entities.

Determine how the application knows:
- "which workspace am I operating in?"
- "which company am I operating in?"
- "is this event workspace-level or company-level?"

Determine whether those concepts are currently conflated anywhere.

Identify every place where tenant/company identity is currently represented as:
- user ID
- entity ID
- workspace ID
- schema name
- company ID
- implicit context

Flag dangerous conflations.

---

10. TENANCY PRD COMPATIBILITY

Inspect the existing multi-tenancy PRD and related architecture documents in the repository.

Determine what the current tenancy design requires for audit.

Pay particular attention to:
- workspace-level/public events
- company/entity-local events
- public-as-entity-zero concepts
- schema-per-entity
- current_schema
- search_path
- RPC behavior
- RLS
- audit placement
- entity/workspace boundaries

Do not redesign tenancy. Instead answer:

"What must the audit architecture respect so that the upcoming tenancy architecture does not require another audit rewrite?"

---

11. FRONTEND AUDIT SURFACE INVENTORY

Map every existing audit/history/activity UI. For every surface identify:
- file path
- route/page
- component
- data source
- query/RPC
- event filtering
- scope
- actor display
- timestamps
- metadata display
- pagination
- search
- filtering
- navigation
- document linking
- empty states
- loading states
- error states
- permissions

11.1 Dashboard Audit/Activity

Determine what currently appears on the dashboard. Determine whether it is:
- real audit data
- notification data
- activity data
- mock/static data
- document history
- some combination

11.2 Document-Level History/Activity

Find every document page containing: history, activity, audit, timeline. Identify how those records are sourced and scoped.

11.3 Full Audit Center / Audit Trail

Find the current mother audit surface, if one exists. Document:
- route
- component tree
- backend source
- filters
- scope
- permissions
- UX behavior

11.4 Other Audit Surfaces

Find any additional: admin audit, compliance history, project history, payment history, document history, system activity.

Determine whether they use the same backend or independent implementations.

---

12. FRONTEND SCOPE MODEL

Using the ERP frontend PRD + Golden Dashboard + existing application, explicitly map:

Dashboard: Expected audit preview = Company Audit mini-clone.

Document View: Expected audit preview = Company Audit mini-clone filtered to the current document.

Audit Center: Expected mother shell = Workspace Audit + Company Audit.

If Platform Audit is proven necessary, document exactly where it belongs.

The report must also determine whether the dashboard/document mini-clones should:
- query the central audit infrastructure directly
- use a shared read model
- use a dedicated audit query service
- remain temporary compatibility views

Do not make the final architectural decision without evidence.

---

13. GOLDEN DASHBOARD TEMPLATE

Inspect the repository's dashboard template: `docs/TEMPLATES/React-temps/Golden-dashboard.tsx`

Treat this file as the current design reference for the future dashboard. Do not modify it.

Analyze specifically the audit-related section and its relationship to:
- Activity & Alerts
- Notifications
- Recent Documents
- Audit Trail
- navigation
- company context
- workspace context

IMPORTANT: Notifications are NOT part of this audit investigation unless the implementation currently conflates notifications and audit/activity.

The objective is NOT to turn the notification system into an audit system.

Determine whether the template's current "Audit Trail" section is:
- suitable as a company audit mini-clone
- better treated as a recent activity preview
- missing scope indicators
- missing actor/event semantics
- missing navigation to the mother Audit Center

Provide concrete recommendations based on the existing application architecture, not visual preference alone.

---

14. DOCUMENT VIEW AUDIT SURFACES

Find the current document view pages for major document types, including where applicable:
- Invoice
- Quotation
- CSR
- Waybill
- Payment
- Receipt
- Project
- other auditable business documents

Determine how each currently exposes history/activity/audit. For each module answer:
1. Does it show audit/history?
2. Where?
3. What backend source?
4. Is it company-scoped?
5. Is the document's company/entity known?
6. Are events filtered to the document?
7. Are events filtered to the tenant/company?
8. Can events from another company leak into the view?
9. Is the UI duplicated independently across modules?
10. Could it become a thin projection of the central Audit system?

---

15. SECURITY / ISOLATION AUDIT

This is mandatory. Evaluate the current audit system for isolation risks.

Specifically investigate:
- cross-workspace leakage
- cross-company leakage
- incorrect tenant IDs
- user ID used as tenant ID
- missing workspace filters
- missing company/entity filters
- RPCs accepting unsafe client-provided scope
- RLS gaps
- public-schema assumptions
- direct table access bypassing intended routing
- audit events that cannot be reliably attributed to a company/workspace
- events written to the wrong schema

Do not exploit anything. Perform static/database inspection only.

Rate each identified issue: Critical / High / Medium / Low / Informational. Explain why.

---

16. DATA MODEL REPORT

Produce the actual current audit-related data model.

For each audit/activity table include:
- schema
- table
- columns
- data types
- nullable status
- defaults
- primary key
- foreign keys
- indexes
- RLS
- policies
- triggers
- relationships

Then identify what information is currently missing for the desired future model.

At minimum evaluate the need for explicit concepts corresponding to:
- workspace scope
- company/entity scope
- actor
- event type
- event version
- target type
- target ID
- document type
- document ID
- metadata
- timestamp
- correlation/request ID where applicable
- source/module
- system vs human actor

Do NOT automatically recommend adding every field. Only recommend fields justified by the investigation.

---

17. CURRENT VS TARGET ARCHITECTURE GAP

Create a clear gap analysis:

CURRENT → TARGET

Cover:

Backend
- storage
- event registry
- event emission
- persistence
- routing
- tenancy
- workspace scope
- company scope
- security
- versioning

Frontend
- dashboard mini-clone
- document mini-clone
- mother Audit Center
- workspace audit
- company audit
- filtering
- navigation
- permissions
- loading/error states

Identify what can be reused, what must be replaced, and what should NOT be touched.

---

18. RENOVATION STRATEGY

Based strictly on evidence, propose a phased renovation strategy.

Do NOT write implementation code. Do NOT create migrations. Do NOT create PRDs yet.

The strategy should answer:
1. What should be preserved?
2. What should be consolidated?
3. What should be deprecated?
4. What should be introduced?
5. What should be migrated first?
6. What should remain temporarily as compatibility infrastructure?
7. How should existing audit data be preserved?
8. How can old and new audit paths coexist safely during migration?
9. How can workspace/company isolation be introduced without breaking current document modules?
10. How can the architecture become tenant-aware without scattering tenant/schema logic across document modules?

---

19. SPECIFIC ARCHITECTURAL QUESTION

Evaluate this proposed conceptual architecture:

```
                     AUDIT DOMAIN
                          │
                     Audit.emit()
                          │
                   Audit Registry
                          │
                     Audit Router
                     /           \
            Workspace Scope    Company Scope
                 │                  │
          Workspace Audit     Company Audit
                 │                  │
                 └──── Persistence ┘
                          │
                    Audit Storage
```

Frontend:

```
Dashboard
└── Company Audit Mini-Clone

Document View
└── Company Audit Mini-Clone

Audit Center
├── Workspace Audit
└── Company Audit
```

Determine whether this is compatible with the current repository/database. If not, explain exactly why. Do not force agreement.

---

20. AUDIT IS NOT NOTIFICATIONS

The Golden Dashboard contains a Notification Center. Do NOT merge Notification Center with Audit Trail.

Investigate only whether the existing backend accidentally conflates:
- notifications
- alerts
- activity feed
- audit events

If they are separate, keep them conceptually separate. If they currently share infrastructure, document the overlap and determine whether it is intentional.

---

21. FINAL ARCHITECTURAL QUESTION

The final report MUST answer:

> "Given the current application, live Supabase database, multi-tenancy PRD v2.1, ERP Frontend PRD v1.1, Platform Office PRD, existing multi-tenancy reports, existing audit-trail reports, and Golden Dashboard template, what is the safest architecture for renovating Audit Trail without creating a second rewrite when workspace/company schema routing becomes active?"

Do not implement the answer. Provide the evidence and recommended architectural direction so the next stage can produce the Backend and Frontend PRDs.

---

22. REPORT FORMAT

Create ONE markdown report under: `docs/Reports/`

Use a descriptive filename such as: `Audit-Trail-Renovation-Reconnaissance-YYYY-MM-DD.md`

The report must contain:
1. Executive Summary
2. Current Audit Architecture
3. Live Database Findings
4. Repository Findings
5. Existing Event/RPC Inventory
6. Existing Audit Data Model
7. Workspace / Company / Tenant Model
8. Existing Frontend Audit Surfaces
9. Golden Dashboard Analysis
10. Document View Audit Analysis
11. Security & Isolation Findings
12. Current vs Target Gap Analysis
13. Reusable Infrastructure
14. Technical Debt / Duplications
15. Renovation Strategy
16. Recommended Target Architecture
17. Open Questions Requiring Product/Architecture Decisions
18. Evidence Appendix

The Evidence Appendix must contain concrete file paths, database object names, function names, table names, and relevant code locations.

Do not make unsupported architectural claims.

Clearly distinguish:
- FACT
- OBSERVATION
- INFERENCE
- RECOMMENDATION

---

23. GIT SAFETY

This is a ZERO-CODE-CHANGE INVESTIGATION.

Before beginning:
- run `git status`

During investigation:
- do not modify source code
- do not modify migrations
- do not modify database
- do not install dependencies unless absolutely required for inspection
- do not run build
- do not run lint
- do not run typecheck

At completion:
- run `git status` again

The ONLY permitted repository modification is creation of the requested markdown report under `docs/Reports/`.

Verify that no application source files were modified.

---

24. HARD EXCLUSIONS

DO NOT:
- run Docker
- start local Supabase
- apply migrations
- modify SQL
- modify TypeScript
- modify React components
- redesign the UI
- implement Audit.emit()
- implement AuditRouter
- create AuditRegistry
- create new RPCs
- delete existing audit infrastructure
- merge audit tables
- speculate about missing database objects
- treat notifications as audit
- assume workspace == company
- assume company == tenant
- assume user == tenant
- assume public schema is sufficient for the future architecture

This task is reconnaissance only.

---

25. FINAL REQUIREMENT

The report must be detailed enough that a separate architecture agent can subsequently write:
1. Backend Audit Trail Renovation PRD
2. Frontend Audit Trail Renovation PRD

WITHOUT needing to rediscover the current repository or database architecture.

The next agent should be able to read this report and know:
- what exists
- what is broken
- what is duplicated
- what is already working
- what the live database actually contains
- where audit data is stored
- how audit events are generated
- how audit is currently displayed
- how workspace/company identity currently works
- where tenant isolation is weak
- what the Golden Dashboard expects
- what should be preserved
- what must change
- what remains undecided

Do not write those PRDs now. Produce the reconnaissance report only.

---

