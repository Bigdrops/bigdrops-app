# BIGDROPS ERP Multi-Tenant Frontend Architecture & Migration PRD  
**Version:** 1.1 (Approved for Implementation)  
**Status:** Approved  
**Authors:** BIGDROPS Architecture Council  
**Applies To:** BIGDROPS ERP Frontend  
**Related Documents:**
- Multi-Tenancy Backend PRD v2.1
- Entity Provisioning Engine PRD
- Platform Office PRD
- AGENTS.md

---

# 1. Executive Summary
The BIGDROPS ERP changes from a single-tenant architecture to a multi-tenant architecture. The multi-tenant architecture uses PostgreSQL schema isolation.
The backend infrastructure is complete and operational.
It includes:
- Workspace system
- Entity system
- Platform operators
- Authorization model
- Provisioning engine
- Tenant schema creation
- Schema-level RLS

The frontend is still single-tenant.
This PRD describes how the ERP frontend will use the new multi-tenant backend.
The migration must not disrupt existing business functions.

---

# 2. Deployment Prerequisites
The ERP frontend requires these items before it can operate in multi-tenant mode:
- At least one active Workspace must exist.
- At least one active Entity must exist.
- The Entity provisioning status must be `ready`.
- The tenant schema must exist.

These tasks are outside the ERP frontend:
- Initial platform bootstrap
- Workspace creation
- Workspace approval
- Entity provisioning

They belong to the deployment/bootstrap process and the Platform Office.
The ERP assumes these backend contracts already exist.

---

# 3. Objectives
## Primary Objective
Add tenant-aware frontend infrastructure.
Each business module must operate inside the correct tenant schema.

---

## Secondary Objectives
- Keep existing application behavior during migration.
- Do not use dual-write or dual-read runtime architectures.
- Migrate incrementally.
- Keep backward compatibility until final cutover.
- Centralize tenant resolution.
- Prevent tenant logic duplication across modules.

---

# 4. Current Backend Status
Completed:
- ✅ Workspace hierarchy
- ✅ Entity hierarchy
- ✅ Platform operator model
- ✅ Workspace membership model
- ✅ Entity provisioning engine
- ✅ Automatic schema creation
- ✅ Automatic table cloning
- ✅ Automatic RLS installation

Example Production Deployment:
- Workspace: `bigdrops-main`
- Entity: `BIGDROPS`
- Schema: `entity_bigdrops-main_main`
- Provisioning Status: `ready`

---

# 5. Current Frontend Status
Current ERP architecture:
```

Authentication
│
▼
Supabase Client
│
▼
Public Tables
│
▼
Business Modules

```
Every module reads directly from the public schema.
Examples:
- invoices
- quotations
- receipts
- projects
- rfqs
- clients
- settings

No tenant context exists.

---

# 6. Target Architecture
Target architecture:
```

Authentication
│
▼
Workspace Provider
│
▼
Entity Provider (resolves active entity and schema)
│
▼
Authorization Provider
│
▼
Tenant Client
│
▼
Business Services
│
▼
UI

```
Each layer has exactly one responsibility.
Business modules never determine tenant context.

---

# 7. Architectural Principles
## Principle 1
Tenant resolution occurs exactly once.

---

## Principle 2
Business modules consume tenant context.
They never construct tenant context.

---

## Principle 3
Workspace resolution always occurs before entity resolution.

---

## Principle 4
Entity resolution always occurs before authorization evaluation.

---

## Principle 5
Authorization evaluation always occurs before business operations.

---

## Principle 6
Every migrated module must use the Tenant Client.

---

## Principle 7
A single business operation must never read from or write to both the public schema and a tenant schema.
During incremental migration, different request handlers may read from different schemas.
But no handler may mix schema contexts within a single request/response cycle.
One-time migration utilities that are run during the cutover may read from one schema and write to the other.

---

# 8. Application Startup & Tenant Resolution Flow
Application startup sequence:
```

Application Start
│
▼
User Authenticated?
┌──────┴──────┐
│             │
No            Yes
│             │
Login    Resolve Workspace Membership
│
▼
Workspace Found?
│
No          Yes
│             │
Workspace Required   Resolve Entities
│
▼
Entity Count?
┌────┼─────────┐
│    │         │
0    1         >1
│    │         │
Empty State  Auto Select  Future Entity Selector
│
▼
Check Provisioning Status
│
┌────┼────────────┐
│    │            │
Ready  Creating    Failed
│    │            │
ERP  Loading  Error Screen

```

---

# 9. Backend Dependencies
The frontend depends only on stable backend contracts.
The frontend must never depend on:
- Bootstrap workflow
- Workspace approval workflow
- Provisioning implementation details
- Advisory locks
- Retry logic
- Schema cloning implementation
- RLS generation internals

The frontend consumes only these stable backend states:
- Active workspace
- Active entity
- Provisioning status
- Resolved schema
- Effective authorizations

---

# 10. Provider Responsibilities
## Authentication Provider
Responsible for:
- Auth session
- Current user
- Session refresh

Does NOT know:
- Workspace
- Entity
- Schema

---

## Workspace Provider
Responsible for:
- Workspace membership
- Active workspace

Does NOT know:
- Schema
- Business data

---

## Entity Provider
Responsible for:
- Active entity
- Resolved tenant schema
- Provisioning status

Does NOT:
- Query invoices
- Query quotations
- Query projects

---

## Authorization Provider
Responsible for:
- Effective workspace role
- Effective entity permissions
- Feature access evaluation based on effective authorizations and subscription entitlements

Provides APIs such as:
```

hasAuthorization(resource, action)

```
The provider consumes backend authorization data but never performs business validation.
Business validation remains the responsibility of backend services.

Does NOT query business tables.

---

## Tenant Client
The Tenant Client is a routing abstraction only.
Its sole responsibility is to route database operations to the already-resolved tenant schema.

It MUST NOT perform:
- Authentication
- Authorization
- Permission evaluation
- Workspace discovery
- Entity discovery
- Schema construction
- Provisioning logic
- Business validation
- Application logic

Schema resolution:
```ts
supabase.schema(schemaName)
```

Everything else is outside its scope.

---

10.6 Future Workspace Switching

Phase 1 supports only one active workspace.
However, provider APIs must stay compatible with future workspace switching.
Providers must not assume that only one workspace can ever exist.
The absence of a switching UI in Phase 1 is a product decision.
It is not an architectural limitation.

---

11. Workspace & Entity Lifecycle States

Workspace Lifecycle

```
pending_approval
       ↓
active
       ↓
suspended
       ↓
archived
```

---

Entity Provisioning Lifecycle

The frontend must show only the actual backend provisioning states.
Valid states:

```
pending
creating
ready
failed
purging
purged
```

The frontend must not create extra states.
Retry operations are shown as repeated transitions:

```
failed
   ↓
creating
   ↓
ready
```

There is no “retrying” state.

---

12. Provisioning Behaviour

pending

Show an initialization screen.

---

creating

Show a provisioning progress screen.
Phase 1 checks the provisioning status once during startup.
Realtime subscriptions and polling are out of scope.

---

ready

Continue application startup.

---

failed

Show a provisioning failure page.
A retry will be available through a future Platform Office workflow.
If a temporary error occurs, the user can use a manual retry action (a “Retry Provisioning” button that re-checks the status). This action does not require a realtime connection.

---

purging

Block application access.

---

purged

Show a tenant unavailable page.

---

13. Schema Resolution

Current:

```ts
supabase.from("invoices")
```

Target:

```ts
tenantClient.from("invoices")
```

Internally:

```ts
supabase
  .schema(activeSchema)
  .from("invoices")
```

The global Supabase client continues to serve:

· workspaces
· entities
· platform metadata
· workspace memberships

The Tenant Client serves:

· invoices
· quotations
· projects
· receipts
· clients
· settings

---

14. Diagnostic Page

Route:

```
/debug/tenant
```

Purpose: Show the resolved tenant context for debugging.

Information displayed:

Authentication

· User
· Auth UID
· Session status

Platform

· Platform Operator
· Operator Role

Workspace

· Workspace ID
· Workspace Name
· Workspace Status

Membership

· Workspace Role
· Effective Permission Count

Entity

· Entity ID
· Entity Name
· Schema Name
· Expected Schema
· Schema Resolution Source

Resolution Source values include:

· Startup
· Cache
· Refresh
· Workspace Change
· Entity Change

Provisioning

· Provisioning Status
· Last Error (if available)

Database

· Active Schema
· Tenant Client Ready
· Tenant Client Version

Performance

· Resolution Time

Notes:
auth.uid() is only meaningful inside authenticated application requests.
SQL Editor sessions do not contain JWT claims and return NULL.

Access to this page must be restricted to authorized users only (for example, users with a platform operator role).

---

15. Frontend Migration Phases

Phase 1

Infrastructure Deliverables:

· Workspace Provider
· Entity Provider
· Authorization Provider
· Tenant Client
· Diagnostic Page

No business modules migrated.

---

Phase 2

Read-only migration.
Candidate modules:

· Settings
· Clients

---

Phase 3

Invoice migration.
Read, Create, Update, Delete.

---

Phase 4

Remaining document modules:

· Quotations
· Receipts
· Waybills
· RFQs
· BOQs
· Projects

---

Phase 5

This phase performs a one-time migration of production business data from the public schema into the tenant schema.

Validation occurs before cutover.
The ERP application continues to use the public schema until the cutover.
There is no runtime synchronization between the schemas.
No dual-write architecture exists.
No runtime dual-read architecture exists.

Only migration utilities may temporarily read from one schema and write to the other during the cutover process.

---

Phase 6

Cutover.
The application switches fully to tenant schemas.
Public business tables become legacy.

---

16. Explicit Non-Goals

Phase 1 does NOT:

· Modify existing document hooks.
· Modify module adapters.
· Add workspace switch UI.
· Add entity switch UI.
· Delete public tables.
· Migrate business data.
· Remove the existing Supabase client.
· Change application routing.

---

17. System Invariants

Invariant 1
Exactly one active tenant context may exist for a given authenticated application session.

---

Invariant 2
Workspace resolution always occurs before entity resolution.

---

Invariant 3
Entity resolution always occurs before authorization evaluation.

---

Invariant 4
Every migrated business query must come from the Tenant Client.

---

Invariant 5
Business modules never resolve tenant context.

---

Invariant 6
Providers own state. Business modules consume state.

---

Invariant 7
Tenant context is immutable for the duration of a logical application operation.
Tenant context may change only through explicit workspace/entity switching initiated by the Workspace and Entity Providers.

---

Invariant 8 — Schema Resolution Ownership
No application layer outside the Entity Provider and Tenant Client may construct, infer, modify, cache, or manipulate tenant schema names.
Business modules, hooks, services, utilities, and UI components must consume the resolved schema only.
The Entity Provider and Tenant Client are the single source of truth for schema resolution.

---

Invariant 9 — Provider Isolation
Providers may consume state only from providers above them in the dependency hierarchy.
Lower layers must never influence higher layers.

---

18. Testing Strategy

Phase 1

Must verify:

· Workspace resolves.
· Entity resolves.
· Schema resolves.
· Tenant Client targets correct schema.
· Diagnostic page shows correct values.
· Existing application behavior stays unchanged.
· Business modules cannot access schema names directly.

---

Phase 2

Verify:

· Read operations run against tenant schema.
· Public schema remains untouched.

---

Phase 3

Verify:

· CRUD operations function correctly.
· Authorizations are enforced correctly.
· No cross-tenant access occurs.

---

Phase 4

Verify:

· Every migrated module operates only against the tenant schema.

---

Phase 5

Verify:

· Data migration completeness.
· Row counts.
· Referential integrity.
· Financial totals.
· Document integrity.

---

Phase 6

Verify:

· Public business tables are no longer accessed by the ERP.
· Entire application operates through tenant schemas.

---

19. Acceptance Criteria

Phase 1 is complete when:

· Workspace Provider resolves active workspace.
· Entity Provider resolves active entity.
· Authorization Provider resolves effective authorizations.
· Tenant Client targets the correct tenant schema.
· Diagnostic page shows complete tenant context.
· Existing ERP functionality stays operational.
· No business module has been migrated prematurely.
· No runtime code performs dual-schema reads.
· Architecture stays backward compatible until final cutover.
· Business modules cannot access schema names directly.
· Tenant context is resolved exactly once during application startup.

---

20. Future Enhancements (Out of Scope)

These capabilities are deferred:

· Workspace switcher UI
· Entity switcher UI
· Live provisioning updates via Realtime or polling
· Multi-workspace user experience
· Multi-entity navigation
· Tenant-aware caching optimizations
· Offline tenant synchronization
· Platform Office initiated workspace switching
· Platform Office provisioning notifications
· Platform Office realtime events
· Advanced authorization management UI
· Cross-tenant analytics and reporting

```