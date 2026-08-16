
# Product Requirements Document (PRD)

## Project: BIGDROPS Platform Office (Operations Console)
The Platform Office PRD at this path is a mirrored copy for context only
my origin 
https://github.com/Bigdrops/bigdrops-platform-office/blob/main/docs%2FPRD%2Fplatform-office-prd.md
**Status:** Locked Architecture (Frozen)  
**Version:** 1.3  
**Date:** 2026-08-16  
**Repository path:** `docs/prd/platform-office-prd.md`  
**Dependencies:** Multi-Tenancy PRD (v2.1)

---

## 1. Executive Summary
**Illustration:** An interactive HTML reference illustrating this document's model
alongside the other two PRDs in this set (workspace resolution, entity provisioning,
action-based permissions, invite acceptance). Not a spec — if it and this document
ever disagree, this document wins.
https://github.com/Bigdrops/bigdrops-app/blob/main/docs/prd/multi-tenancy/three-prd-tenancy-illustration.html

The Platform Office is an independent, high-density Operations Console (NOC) designed exclusively for BIGDROPS platform operators. It is the centralized cockpit used to observe, maintain, and recover the multi-tenant BIGDROPS system.

It is designed as an "Operations OS" rather than a standard admin CRUD panel, prioritizing end-to-end operational workflows, high information density, and strict data isolation.

The Platform Office inherits from a mature, pre-engineered visual and preferences infrastructure — a proven codebase that provides canonical theming, navigation, and layout systems. Engineers shall treat this as a foundation to extend, not a legacy to replace.

---

## 2. Fundamental Architectural Boundaries

### 2.1 Application Independence

- **Decoupled Lifecycle**: The Platform Office is a distinct application from the BIGDROPS ERP. It maintains its own independent build, routing, deployment, and release lifecycle.
- **Repository Strategy**: Repository organization (monorepo vs. multi-repo) is an implementation detail. Architecturally, the codebases must remain modular and independently deployable.

### 2.2 Data Isolation (The "No-Cross" Rule)

> **The Isolation Boundary:** The Platform Office is strictly prohibited from peering into tenant-isolated business schemas (e.g., `workspace_xxxx.invoices`, `waybills`, `projects`). It has zero read/write access to tenant business data.

**Explicit Metadata Consumption:** The Platform Office reads and interacts *only* with explicit, platform-wide observability models residing in the `public` schema.

```

[public] Schema Only                          [tenant] Isolated Schemas
• public.workspaces                           • workspace_acme.invoices
• public.platform_operators                   • workspace_beta.waybills
• public.entity_provisioning_status           • workspace_gamma.projects
│                                             │
▼                                             ▼
┌───────────────────────┐                     ┌───────────────────────┐
│    PLATFORM OFFICE    │                     │     BIGDROPS ERP      │
│ (Operations Console)  │                     │   (Business App)      │
└───────────────────────┘                     └───────────────────────┘

```

### 2.3 Principle of Least Privilege

- **Infrastructure-Only Scope**: Platform operators manage workspace existence, provisioning health, and system status. They hold zero authority over, or visibility into, workspace membership, internal team roles, or business-data content.

### 2.4 Service Layer Rule (Strict Data Isolation Enforcement)

To guarantee compliance with the "No-Cross" tenant isolation directive, a physical barrier is enforced between the rendering layers and the database:

- **Direct Access Ban:** Presentational UI routes, layouts, and components **shall not** import or query the Supabase client directly.
- **Service Mediation:** All read/write operations must go through domain-specific service wrappers (e.g., `workspace-service.ts`, `incident-service.ts`) located within `src/lib/services/`. These services are the *only* files permitted to call the backend database.

### 2.5 Administration Boundary (v1.3)

The Platform Office is an operations/governance console, not a business-administration console.

- It observes workspace lifecycle and provisioning according to its existing powers (approve, suspend, read-only archive/purge observation).
- It is **not** a tenant business-data administrator. It holds zero authority over company/entity business data and zero authority over ordinary company/entity business permissions.
- Company/entity administration and business permissions are ERP concerns (see the ERP Frontend PRD v1.5, §12.6–§12.7). The Platform Office does not administer them.
- The corrected approval rule stands: `approve_workspace()` transitions a workspace from `pending_approval` to `active`. Approval does **not** initiate entity/schema provisioning. Provisioning remains a separate, owner-initiated ERP operation.

---

## 3. Mobile-First Operations Philosophy

The Platform Office Operations Console treats mobile not merely as a responsive viewport target, but as a first-class, mission-critical execution environment.

### 3.1 Operational Ubiquity

Every critical operator workflow (incident triage, workspace approval, system health diagnostic) **must** be fully executable on a mobile viewport. There shall be no "desktop-only" administrative locks.

### 3.2 Adaptive vs. Responsive Layouts

- **Tables to Cards:** Multi-column data tables must gracefully transform into high-density operational card lists on mobile screens.
- **Dialogs to Bottom Sheets:** Interactive modal dialogs on desktop must render as swipe-to-dismiss bottom sheets (utilizing native drawer wrappers) on mobile devices to optimize for thumb-reach ergonomics.

### 3.3 Capacitor Packaging Readiness

All interactive surfaces must:
- Avoid hover-dependent logic
- Accommodate touch target minimums (44 × 44 CSS pixels)
- Respect iOS/Android safe-area bounds (`safe-area-inset-bottom`, `safe-area-inset-top`)

---

## 4. UI Reuse Policy

To protect the codebase from dependency bloat and styling divergence, the Platform Office enforces a strict component inheritance hierarchy:

1. **Keep/Reuse:** Utilize existing local UI primitives inside `src/components/ui/` directly.
2. **Adapt:** Extend existing local primitives through custom variants or layout options.
3. **Build/Introduce:** Implement custom primitives or third-party dependencies *only* when a critical technical capability is completely missing and cannot be elegantly crafted from the existing design system.

---

## 5. Operational Domain Contract (Integration Boundary)

The Platform Office communicates with the core multi-tenancy engine exclusively through documented backend contracts in the `public` schema. It relies on the following stable entities:

### 5.1 Provisioning Status (`public.entity_provisioning_status`)

Read-only for the Platform Office. This table is written to by backend provisioning pipelines and polled by the console to assess workspace creation health:

| Field | Type | Description |
|-------|------|-------------|
| `entity_id` | `uuid` (Primary Key) | Unique identifier for the entity |
| `status` | `text` | `pending`, `creating`, `ready`, `failed`, `purging`, `purged` |
| `last_error` | `text` | Most recent error message (if any) |
| `attempt_count` | `integer` | Number of provisioning attempts |
| `updated_at` | `timestamptz` | Last status update timestamp |

### 5.2 Workspace Status (`public.workspaces.status`)

Monitored to track the broad operational state of tenants:

- Supported states: `pending_approval`, `active`, `suspended`, `archived`

### 5.3 Platform Operators (`public.platform_operators`)

Defines role-based platform authority, completely distinct from ERP workspace-level permissions:

- **Enforced role:** `role = 'owner'` (possesses platform orchestration privileges)
- **Reserved roles:** `support`, `auditor`, `operations` (future roles, constrained to `public`-schema read-only tables)

### 5.4 Unified Event Log (`public.activity_events`)

All platform-level operations, security events, and console access logs are written to the shared `public.activity_events` ledger for unified audit capability.

---

## 6. Key Functional Domains & Workflows

### 6.1 Platform Overview (NOC Dashboard)

The "Home Screen" of the application. It acts as an aggregation layer that does not own data, but summarizes all other operational domains:

- **System State Widget**: Live health status of the platform.
- **Orchestration Monitor**: Quick counts of workspaces awaiting approval or experiencing provisioning failures.
- **Active Incidents**: High-priority alert tracker pulling from the `public.platform_incidents` ledger.
- **System Volume Indicators**: Aggregated throughput rates without accessing tenant-specific transaction data.

### 6.2 Lifecycle Orchestration (Workspace Workflows)

Operators manage workspaces via controlled transition events rather than direct row-editing:

- **The Approval Path**: Transitioning a workspace from `pending_approval` to `active` via `approve_workspace()`. This does not initiate schema provisioning. Provisioning is a separate, owner-initiated action from within the ERP after approval (see the ERP Frontend PRD §12.2; backend PRD §9). The console observes provisioning progress read-only via `entity_provisioning_status` once the owner triggers it from the ERP.
- **The Lockout Path (Suspension)**: Flipped to instantly lock out a tenant workspace via RLS/global checks at the platform boundary. This is a non-destructive action that leaves business data intact. This is the only immediate, operator-driven transition the console performs.
- **The Termination Path (Purge/Archive)**: Archiving is owner-initiated from the ERP side (see Multi-Tenancy PRD §8), not a console action. Setting status = `archived` makes the workspace and all its entities inaccessible to members immediately (RLS denies on non-active status) with business data untouched. The console does not trigger archiving or the teardown. Console powers are limited to (a) suspending a workspace and (b) observing the background purge lifecycle read-only via `entity_provisioning_status` (`purging` → `purged`). One recovery exception remains from Multi-Tenancy PRD §8: before the purge job runs, the Platform Owner may restore an archived workspace to `active`.

### 6.3 Subscription & Entitlements

- **Status Modeling**: Track billing status decoupled from the actual payment processors (adhering to the deferred "WinRAR model" for MVP).
- **Entitlement Overrides**: Direct administrative ability to override system quotas, limits, or enable specific feature flags for a tenant workspace.

### 6.4 Operator Security & Safe-Action Allowlist

- **Centralized Identity, Bifurcated Auth**: Uses the shared `auth.users` identity pool, but isolates console authorization.
- **MFA Step-Up Gate**: The Platform Office implements its own explicit re-authentication / TOTP challenge at the console entry point, independent of whether the user has an active ERP session.
- **Console Session Policy**: Shorter session timeouts and mandatory inactivity logouts are enforced application-wide.
- **Safe-Action Allowlist**: The console is restricted to calling pre-approved, read-only, or non-destructive diagnostic RPCs (e.g., ping tests, health checks). Executing generic, un-sandboxed backend functions is strictly prohibited.

---

## 7. Migration Strategy

Rather than executing destructive, large-scale cleanups, migrations will follow a staged, non-breaking lifecycle:

1. **Decommission:** Sever navigation endpoints and dynamic redirects first.
2. **Verify:** Ensure compilation and build states remain green.
3. **Delete:** Prune the orphaned template routes and unused dependency modules.

---

## 8. Out-of-Scope Items (Explicitly Excluded)

The following items are explicitly **excluded** from the Platform Office scope:

1. **Direct Billing Integration**: No live Stripe/payment processor configuration hooks are implemented inside the workspace settings (deferred).
2. **ERP Team Membership**: Operators cannot view individual workspace user accounts, invite workspace staff, or alter granular workspace permissions.
3. **Data Inspection**: The console will never render a client document (Invoice, Waybill, CSR) or search raw transactional records.

---

## 9. Success Criteria

1. **Data Isolation Enforced**: No Platform Office query ever accesses tenant-isolated schemas. All data consumed originates from `public`-schema observability tables.
2. **Workspace Lifecycle Managed**: Operators can approve and suspend workspaces through controlled transition events and observe the archive/purge lifecycle read-only. Archiving itself is owner-initiated from the ERP.
3. **Provisioning Observability**: Failed provisioning attempts are visible with error details and retry history via `entity_provisioning_status`.
4. **Audit Completeness**: Every operator action (approve, suspend, archive, entitlement change) is recorded in `public.activity_events`.
5. **MFA Step-Up Enforced**: Re-authentication / TOTP challenge is required at console entry, independent of ERP session state.
6. **Safe-Action Allowlist**: Only pre-approved diagnostic RPCs are executable from the console; generic backend function execution is blocked.
7. **Decoupled Lifecycle**: Platform Office and ERP applications can be built, deployed, and released independently.
8. **No Business Data Access**: Platform operators never see client names, document numbers, or transaction amounts from tenant schemas.
9. **Mobile-First Operations**: Every critical operator workflow is fully executable on mobile viewports.
10. **Service Layer Enforcement**: UI components never directly import or query the Supabase client; all database operations go through domain-specific service wrappers.
11. **UI Reuse Policy Enforced**: New UI components follow the Keep → Adapt → Build hierarchy; dependencies are only introduced when the existing design system cannot elegantly satisfy the requirement.

---

## 10. Dependencies & Open Items

### 10.1 Upstream Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| `entity_provisioning_status` table | Multi-Tenancy Team | Implemented |
| `platform_operators` table | Multi-Tenancy Team | Implemented |
| `workspaces` table (status field) | Multi-Tenancy Team | Implemented |
| Platform Owner role provisioning | Multi-Tenancy Team | Planned |
| `public.activity_events` for audit | Audit Team | Implemented |

### 10.2 Open Items

- **Platform Incidents Table**: `public.platform_incidents` is referenced in the NOC Dashboard but not yet defined. This should be implemented by the Platform Office team as a `public`-schema table, following the same observability contract pattern.
- **Console Session Management**: Implementation of shorter timeouts and inactivity logout policies.
- **MFA Step-Up Integration**: TOTP challenge implementation at console entry point.
- **Service Layer Implementation**: Domain-specific service wrappers (`workspace-service.ts`, `incident-service.ts`) to mediate all database operations.

---

## 11. Integration Contract Summary

| Consumer | Producer | Data Exchanged | Direction |
|----------|----------|----------------|-----------|
| Platform Office | Multi-Tenancy Engine | `entity_provisioning_status` | Read-only |
| Platform Office | Multi-Tenancy Engine | `workspaces.status` | Read-only |
| Platform Office | Multi-Tenancy Engine | `platform_operators` | Read-only |
| Platform Office | Multi-Tenancy Engine | `workspace_approval` mutation | Write (via RPC) |
| Platform Office | Platform Office (self) | `activity_events` | Write |

---

## 12. Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-15 | Platform Office Team | Initial locked architecture |
| 1.1 | 2026-07-15 | Platform Office Team | Added Mobile-First Operations Philosophy; Service Layer Rule; UI Reuse Policy; Migration Strategy; updated Success Criteria |
| 1.2 | 2026-08-16 | Platform Office Team | Corrected §6.2 Lifecycle Orchestration to match the backend contract: `approve_workspace()` transitions `pending_approval` → `active` and never initiates `CREATE SCHEMA`; archiving is owner-initiated from the ERP (§8); console powers limited to suspend plus read-only purge observation, with the one restore exception. Aligned §9.2. |
| 1.3 | 2026-08-16 | Platform Office Team | Clarified §2.5 Administration Boundary: the Platform Office is an operations/governance console, not a tenant business-data administrator. It has no responsibility for company/entity business permissions (ERP concern). Preserved the approval rule: `approve_workspace()` → `pending_approval` → `active`; approval never initiates provisioning. Documentation-only; no architecture change. |

---

This document represents the absolute source of truth for the Platform Office workstream, incorporating the security guardrails, the structural boundaries, and the integration contract agreed upon with the multi-tenancy team.
```

source - https://github.com/Bigdrops/bigdrops-platform-office/blob/main/docs%2FPRD%2Fplatform-office-prd.md

its merely here for context for the multitenancy prd