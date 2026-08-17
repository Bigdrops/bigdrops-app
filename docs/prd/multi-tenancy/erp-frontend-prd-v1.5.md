# BIGDROPS ERP Multi-Tenant Frontend Architecture & Migration PRD  
**Version:** 1.6 (Amended)  
**Status:** Approved  
**Authors:** BIGDROPS Architecture Council  
**Applies To:** BIGDROPS ERP Frontend  
**Related Documents:**
- Multi-Tenancy Backend PRD v2.1
- Entity Provisioning Engine PRD
- Platform Office PRD
- AGENTS.md

**Amendment Record:**
- **v1.6 (2026-08-17):** Resolved the role and teams model. Roles are user-defined labels over collections of abilities, implemented with the existing permission templates; a role has no authority of its own, and only expanded `entity_permissions` rows are evaluated (§12.6). Workspace Admin is the preloaded comprehensive workspace-wide role; Company Admin is a preloaded comprehensive role assigned at company scope only; administrative capabilities are abilities inside role bundles, not a separate authority layer (§12.6). Role assignment is limited to existing company members; roles never cross companies; the same user may hold different roles in different companies (§12.6). Added the Role Builder UX (§12.8) and Teams UX (§12.9). Role edit semantics remain deferred: the backend template "reapply" behavior stays authoritative until settled (§20). Documentation-only; no architecture change.
- **v1.5 (2026-08-16):** Formalized the invitation and authority model. (1) Invitation acceptance now offers Accept or Pass for now; passing never rejects, deletes, or revokes an invitation (§12.3). (2) Invitation lifecycle formalized: `pending`, `accepted`, `revoked`, `expired`; administrator-controlled expiration; an authorized workspace admin may revoke; revoked/expired invitations cannot be accepted (§12.5). (3) Added the two-level administration model: Workspace Admin vs Company/Entity Admin, with the Workspace Admin establishing the authority ceiling for subordinate company/entity administration (§12.6). (4) Distinguished administrative authority from business-resource permissions; the deny-by-default, entity-scoped, action-based permission model remains authoritative (§12.7). (5) Made explicit that a workspace may contain multiple companies/entities and that company/entity admin scope does not cross entities (§12.6). Documentation-only; no architecture change.
- **v1.4 (2026-08-16):** Formalized three resolved product decisions. (1) Multi-workspace membership: a user may hold membership in more than one workspace; Phase 1 activates exactly one workspace per session, and switching remains future work (§10.6, §14, §16, §20). (2) New-user onboarding: a user with no membership and no pending invitation chooses between Create a Workspace and Join a Workspace; joining is invitation-based only, never code-based (§2, §8, §12.1, new §12.4). (3) Automatic invite detection: pending invitations are detected automatically during startup; there is no separate "check for invitations" action (§8, §12.3, §19). Documentation-only; no architecture change.
- **v1.3 (2026-08-16):** Added in-app invite acceptance coverage. Startup now routes users with pending workspace invitations to accept them before entity resolution (§8). Added the `accept_workspace_invitation` dependency (§9), a new In-App Invite Acceptance flow (§12.3), pending-invitation display on the Diagnostic Page (§14), the multi-workspace switching non-goal (§16), and two acceptance criteria (§19). Documentation-only; no architecture change.
- **v1.2 (2026-08-15):** Moved workspace creation and company creation into ERP frontend scope. The ERP now creates workspaces (status `pending_approval`) and companies (entity provisioning) from inside the app. Workspace approval stays with the Platform Office. Added switcher UI placement rules: workspace switching is settings-level; company switching appears in the side drawer of the hamburger menu (LHS) on mobile. See sections 2, 8, 9, 10.7, 12, 15, 16, 19, and 20.

---
**Illustration:** An interactive HTML reference illustrating this document's model
alongside the other two PRDs in this set (workspace resolution, entity provisioning,
action-based permissions, invite acceptance). Not a spec — if it and this document
ever disagree, this document wins.
https://github.com/Bigdrops/bigdrops-app/blob/main/docs/prd/multi-tenancy/three-prd-tenancy-illustration.html

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
- The multi-tenant backend infrastructure must be deployed.
- A schema template must exist.
- At least one platform operator must exist.

Workspace creation now happens inside the ERP:
- An authenticated user without a workspace chooses between Create a Workspace and Join a Workspace (§8, §12.4).
- Joining is invitation-based only. There is no join-by-code flow.
- A user with a pending workspace invitation is routed to invitation acceptance before workspace creation.
- A user who chooses Create submits the workspace details; the new workspace has status `pending_approval`.
- A platform operator approves the workspace in the Platform Office.
- The workspace creator becomes the workspace owner.

Company creation now happens inside the ERP:
- A workspace owner creates a company in the app.
- The app inserts the entity and calls the provisioning RPC.
- The provisioning RPC creates the tenant schema.
- The provisioning status changes to `ready`.

These tasks stay outside the ERP frontend:
- Initial platform bootstrap
- Workspace approval
- Provisioning implementation details (schema cloning, RLS generation)

The ERP assumes the backend contracts for these flows already exist.

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
▼             ▼
Pending      Resolve Entities
Invitation?
┌────┴────┐
│         │
No        Yes
│         │
▼         ▼
Onboarding   Accept Invitation
Choice       │
(Create |    ▼
Join)   Resolve Workspace
│         Membership
│
├─ Create ──► Pending Approval (Screen)
│            │
│            ▼ (approved)
│         Resolve Workspace
│
└─ Join ──► Invitation request
            guidance (§12.4)
│
▼
Entity Count?
┌────┼─────────┐
│    │         │
0    1         >1
│    │         │
▼    ▼         │
Create your  Auto Select  Future Entity Selector
first Company
│          │
▼          │
Check Provisioning Status
│          │
┌───┼────┐  │
│   │    │  │
Ready Creating Failed
│   │    │  │
│  ERP  Loading Error
└───┴────┴──┘
 (all paths continue)

```

Routing notes:

- A user with a pending workspace invitation matching their email must
  accept it before creating a workspace or resolving entities. They never
  see the Create Workspace flow while a pending invitation exists.
- Pending invitations are detected automatically during startup. There is
  no separate "check for invitations" user action.
- The invitation screen offers Accept invitation or Pass for now. Passing
  leaves the invitation `pending` and continues startup; it never rejects,
  deletes, or revokes the invitation (§12.3, §12.5).
- A user with no membership and no pending invitation chooses between
  Create a Workspace and Join a Workspace. Joining is invitation-based
  only; the Join path asks an existing workspace admin to send an
  invitation to the account's email (§12.4). Invitation codes do not
  exist.
- Invite acceptance is a single RPC call (`accept_workspace_invitation`,
  §9); the app never writes `workspace_members` or `entity_permissions`
  rows directly.
- After acceptance, startup continues from "Resolve Workspace
  Membership".
- Membership is not limited to one workspace. A user may hold membership
  in more than one workspace. Phase 1 activates exactly one workspace per
  session (§10.6); switching and multi-workspace session activation remain
  future work (§20).

---

# 9. Backend Dependencies
The frontend depends only on stable backend contracts.
The frontend calls these creation contracts:
- Insert into `workspaces` (new workspace, status `pending_approval`)
- Insert into `entities` (new company)
- `provision_entity` / `create_entity_schema` RPC (provisions the tenant schema)
- `get_entity_provisioning_status` (polls provisioning status)
- Select from `workspace_invitations` (pending invite scoped to the current user's email)
- `accept_workspace_invitation` RPC (accepts a pending invite)

The frontend must never depend on:
- Bootstrap workflow
- Workspace approval workflow
- Provisioning implementation details
- Advisory locks
- Retry logic
- Schema cloning implementation
- RLS generation internals
- Writing `workspace_invitation_entity_grants` rows (invite grants are set at invite-creation time; the app never constructs or modifies them)

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

Membership is not limited to one workspace. A user may hold membership in
more than one workspace; the database allows it. Phase 1 activates exactly
one workspace per session — a UI/session constraint, not a database
constraint. Switching between workspaces within a session, and activating
multiple workspaces per session, remain future work (§20).

---

10.7 Switcher UI Placement

Workspace switching is a settings-level concern.
The workspace switch entry point belongs in the Settings area.
It is not exposed in the primary navigation.

Company switching is a navigation concern.
At least on mobile, the company switcher must be exposed in the side drawer of the hamburger menu on the left-hand side (LHS).
On larger screens, the company switcher placement may use the equivalent navigation surface.

These placements apply to the future switcher UIs in section 20.
They do not affect Phase 1 creation flows.

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
After an in-app company creation, the frontend polls `get_entity_provisioning_status` until the status is `ready` or `failed`.
Realtime subscriptions are out of scope.

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

12.1 In-App Workspace Creation

Trigger: An authenticated user with no workspace membership and no
pending invitation chooses Create a Workspace (§8).

Flow:

1. The user submits a workspace name and slug.
2. The app inserts a row into `public.workspaces`.
3. The new workspace has status `pending_approval`.
4. The app shows the Pending Approval Screen.
5. A platform operator approves the workspace in the Platform Office.
6. The `approve_workspace` RPC inserts the owner membership.
7. The app detects the workspace is `active` and resolves it.
8. The app routes the user to the Company Creation Flow.

Notes:

- The app does not call `approve_workspace`.
- The app does not set workspace status to `active`.
- The `idx_one_pending_workspace_per_creator` constraint allows one pending workspace per creator.
- This flow runs only in the Create branch. A user with a pending invitation is routed to Invite Acceptance (§12.3). A user who chooses Join is routed to the In-App Join-Request flow (§12.4).

---

12.2 In-App Company Creation

Trigger: A workspace owner has an active workspace and zero entities.

Flow:

1. The app shows the "Create your first Company" flow.
2. The user submits a company name, slug, and type.
3. The app inserts a row into `public.entities`.
4. The app calls `provision_entity` with the new entity id.
5. The provisioning RPC creates the tenant schema and clones the template.
6. The app polls `get_entity_provisioning_status` until the status is `ready` or `failed`.
7. On `ready`, the app resolves the entity and continues application startup.
8. On `failed`, the app shows the provisioning failure page.

Notes:

- The app never constructs schema names.
- The app never executes schema DDL.
- The provisioning RPC enforces the `create_entity` permission.

12.3 In-App Invite Acceptance

Trigger: A user with no workspace membership has a pending workspace
invitation whose email matches their authenticated email (per backend §4,
`auth.jwt() ->> 'email'`).

The invitation screen must provide:

- the invitation information available under the existing security model
  (`invite_visibility`, backend §4)
- **Accept invitation**
- **Pass for now**

Flow:

1. During startup, after workspace membership resolution, the app selects
   `workspace_invitations` scoped to the current user's email.
2. If a pending invite exists, the app shows the Invite Acceptance flow
   instead of the Create Workspace flow.
3. **Accept invitation**: the app calls `accept_workspace_invitation` with
   the invitation id.
4. The RPC creates the `workspace_members` row (and any invite
   `entity_permissions`) server-side in a single transaction.
5. On success, the app resolves the workspace and continues startup.
6. **Pass for now**: the app dismisses the invitation screen and continues
   startup without changing the invitation. The invitation remains
   `pending`.

Notes:

- Acceptance is a single RPC call. The app never writes
  `workspace_members` or `entity_permissions` rows directly.
- The app never shows both Create Workspace and Invite Acceptance for
  the same user state; a pending invite always takes precedence (§8).
- Invite detection is automatic during startup. There is no separate
  "check for invitations" action (§8).
- **Pass for now** is NOT a rejection and is NOT a persisted invitation
  state. It never rejects, deletes, or revokes the invitation. The
  invitation stays `pending` and remains acceptable later while valid
  (§12.5). A user cannot permanently reject an invitation merely by
  pressing Pass.
- Passing may be offered again on a later startup while the invitation
  remains pending; automatic detection remains the primary mechanism. The
  UI may additionally provide a way to return to/re-check invitations
  later (§8, §12.5).

---

12.4 In-App Join-Request

Trigger: An authenticated user with no workspace membership and no
pending invitation chooses Join a Workspace (§8).

Flow:

1. The app shows guidance to contact a workspace administrator.
2. The administrator sends an invitation to the account's email.
3. On a later startup, the app auto-detects the pending invitation and
   shows the Invite Acceptance flow (§12.3).

Notes:

- Joining is invitation-based only. There is no join-by-code flow and
  no code entry UI (§16).
- The app does not show the Join flow when a pending invitation exists
  (§8, §12.3).

---

12.5 Invitation Lifecycle

An invitation may be in one of these states:

- `pending` — created by an authorized workspace administrator; may be
  accepted.
- `accepted` — the invitee accepted; the acceptance RPC created the
  membership/access records.
- `revoked` — an authorized workspace administrator rescinded the pending
  invitation.
- `expired` — the administrator-chosen expiration time passed.

Rules:

- **Pass for now is NOT a state.** It simply leaves a `pending`
  invitation untouched. It never rejects, deletes, or revokes it (§12.3).
- The administrator creating/sending an invitation chooses its expiration
  time. Invitation lifetime is administrator-controlled, subject to any
  platform-level maximum or validation rule already established in the
  backend PRD (see Multi-Tenancy PRD §4).
- An authorized workspace administrator may rescind/revoke a pending
  invitation.
- A `revoked` or `expired` invitation cannot be accepted.
- After successful acceptance, the server-side acceptance flow creates the
  appropriate membership/access records and the frontend resolves the
  newly available workspace. The frontend never writes
  `workspace_members` or entity permission records directly (§12.3).

---

12.6 Roles & Administration Model

This section states the resolved role and administration model. It replaces
the earlier provisional two-level administration description.

ROLE = ABILITY BUNDLE

- A role is a user-defined label over a collection of abilities.
- Roles are implemented with the existing permission templates (backend PRD
  §3.6): a role record reuses `permission_templates`; its abilities are
  `permission_template_items` rows; assigning the role expands those items
  into `entity_permissions` rows via `apply_permission_template()`.
- A role has no authority of its own. Only expanded `entity_permissions`
  rows are evaluated at query time; nothing is inferred from a role label.
- Roles are ordinary editable data. Deleting a role never revokes
  permissions already expanded for users.

PRELOADED ROLES

- Workspace Admin: the preloaded, comprehensive, workspace-wide role
  bundle. It is the authority ceiling for the workspace.
- Company Admin: the preloaded, comprehensive role that is assigned at
  company scope only. It is a company-scoped role, not a separate
  authority layer.
- There is no "super admin". Administrative capabilities are abilities
  inside role bundles, not a separate authority model.

AUTHORITY CEILING

```
WORKSPACE ADMIN
│
│ workspace-wide authority ceiling
▼
COMPANY-SCOPED ROLES  (including Company Admin)
│
│ per-company assignment, bounded by workspace administration
▼
ABILITIES — expanded entity_permissions rows
```

Use these terms consistently:

- Workspace Admin = workspace-wide governance role.
- Company Admin = preloaded comprehensive role assigned at company scope.
- Company-scoped role = any role assigned to one company/entity.
- Do NOT collapse these into a single "admin" concept.

A company-scoped role grants nothing outside its assigned company.

ASSIGNMENT RULES

- A role is assignable only to a user who is already a member of the
  target company/entity.
- Roles never cross companies: assigning role R in Company A grants
  nothing in Company B.
- The same user may hold different roles in different companies within
  one workspace.
  - Example: John, under workspace BIGDROPS Group, holds Admin in
    Company A, Finance in Company B, and no role in Company C.
- Company Admin assignment is a company-scoped step that happens after
  invitation acceptance creates the company membership.

INVITATION INTERACTION

- Invitation acceptance creates the workspace membership and the invite's
  entity grants (§12.3, §12.5). It does not assign roles.
- Role assignment is a separate, post-acceptance, company-scope step.
- Invitations never carry role payloads; they carry entity grants.

REPRESENTATION

- The model reuses the existing schema. No new permission schema or fixed
  hierarchy tables are prescribed in this documentation pass.
- Role edit semantics (live vs snapshot) are deferred; the backend
  template "reapply" behavior remains authoritative until settled (§20).

---

12.7 Role Abilities vs Business Permissions

Two distinct concepts exist and must not be conflated.

ROLE ABILITIES

- Answer: "Which ability labels are bundled under this role?"
- Examples inside a role bundle:
  - workspace governance (workspace scope)
  - membership management (workspace or company scope)
  - invitation management (workspace scope)
  - company/entity administration
  - invoice → view/create/edit/approve
  - client → view
  - project → edit
- Administrative capabilities are abilities inside role bundles. They are
  not a separate authority layer.

BUSINESS PERMISSIONS

- Answer: "What can this user do with business resources?"
- Examples:
  - invoice → view
  - invoice → create
  - invoice → edit
  - invoice → approve
  - client → view
  - project → edit
- Expressed as `entity_permissions` rows, expanded from role bundles via
  `apply_permission_template()`.

Rules:

- The existing deny-by-default, entity-scoped, action-based permission
  model remains authoritative for business operations (backend PRD §3).
- A role name never implies abilities outside its bundle. Only expanded
  `entity_permissions` rows are evaluated.
- Do NOT invent a new permission schema in this documentation pass.
- Role assignment is limited to existing company members; roles never
  cross companies (§12.6).

---

12.8 Role Builder UX

The Role Builder manages roles and their ability bundles. It is
workspace-level tooling, offered from the Workspace Admin surfaces.

CAPABILITIES

- Create, edit, duplicate, and delete role bundles.
- Name and describe a role.
- Toggle abilities on and off within the bundle.
- Preview the exact `entity_permissions` rows the role will expand into.
- Assign the role to existing company members.

ABILITY PICKER

- Abilities are grouped by category:
  Projects, Invoices, Quotations, Clients, RFQs, BOQs, Waybills, CSR,
  Receipts, Correspondence/Letters, and others.
- Each category shows a MARK ALL control with a confirmation step:
  Include Delete | Exclude Delete.
- Each category shows a three-state indicator: None / Partial / All.
- An ability that the current user may not grant is shown disabled.

DELEGATION RULES

- The workspace administration establishes the ceiling of what any role
  builder may include in a bundle.
- A user cannot create or assign a role whose abilities exceed the
  abilities available to that user.
- Role assignment is limited to existing company members; roles never
  cross companies (§12.6).
- Applying a role expands its items into `entity_permissions` rows for
  the assigned company only.

DEFERRED

- Role edit semantics (live vs snapshot) are deferred (§20). Until
  settled, editing a role does not alter existing `entity_permissions`
  rows unless "reapply" is explicitly invoked (backend PRD §3.6, §13).

---

12.9 Teams UX

Teams is the membership and governance surface. It has two scopes:

WORKSPACE SCOPE (workspace-wide)

- Members and invitations for the workspace.
- Workspace Admin management.
- Companies/entities in the workspace.
- Role management entry point (§12.8).

COMPANY SCOPE (per company/entity)

- Members and invitations for that company.
- Roles and Company Admin assignments for that company.
- The user's own role visibility within the company.

RULES

- Workspace scope is available to the Workspace Admin.
- Company scope is available to members and Company Admins of that
  company, bounded by workspace administration.
- Exact navigation placement is a frontend design decision; the two
  scopes must remain visibly distinct and must not collapse into a
  single "admin" concept (§12.6).

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
· Pending Invitations (count, matching the current user's email)

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
Phase 1 activates one workspace per session (§10.6); the diagnostic page
shows the resolved context for that workspace. When a user has multiple
workspaces or pending invitations, the page shows the counts; multi-workspace
session activation is future work (§20).

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
· Workspace Creation Flow
· Company Creation Flow (zero-entity onboarding)
· Pending Approval Screen
· Provisioning Progress Screen

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
· Add workspace switch UI (switching between existing workspaces).
· Add entity switch UI (switching between existing companies).
· Add workspace approval UI (approval stays in the Platform Office).
· Switch between existing workspaces within a session (a pending invitation is accepted into its single target workspace; activating multiple workspaces per session is future work).
· Implement invitation codes or join-by-code (joining is invitation-based only, §12.4).
· Allow a user to permanently reject an invitation via Pass for now (passing never revokes; only an authorized workspace admin revokes, §12.3, §12.5).
· Collapse Workspace Admin and Company Admin into a single "admin" concept (§12.6).
· Grant a Company Admin automatic unrestricted workspace authority (§12.6).
· Grant a Company Admin every business permission automatically (§12.7).
· Treat a role label as authority: only expanded `entity_permissions` rows are evaluated (§12.6, §12.7).
· Assign a role to a user who is not a member of the target company (§12.6).
· Assign roles across companies; roles never cross companies (§12.6).
· Invent new role-edit semantics; the backend template "reapply" behavior remains authoritative until settled (§20).
· Replace the deny-by-default, action-based business permission model with roles (§12.7).
· Delete public tables.
· Migrate business data.
· Remove the existing Supabase client.
· Change existing application routing for migrated modules.

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
· User can create a workspace in the app.
· User with a pending workspace invitation can accept it in-app and is routed into the target workspace.
· The invitation screen offers Accept invitation and Pass for now; passing leaves the invitation pending and never rejects, deletes, or revokes it.
· A revoked or expired invitation cannot be accepted in-app.
· Pending invitations are detected automatically during startup; no separate "check for invitations" action exists.
· A user with no membership and no invitation can choose Create a Workspace or Join a Workspace at startup.
· The Join flow shows administrator-contact guidance and never a code entry field.
· A user with multiple memberships sees exactly one active workspace per session, while membership in more than one workspace remains valid.
· Workspace Admin and Company Admin are shown as distinct scopes; Company Admin is a company-scoped role bounded by the workspace-level authority ceiling (§12.6).
· Business permissions remain deny-by-default, entity-scoped, and action-based; role labels are never evaluated as authority, only expanded `entity_permissions` rows are (§12.6, §12.7).
· A workspace may contain multiple companies/entities; a role assigned in one company grants nothing in another company (§12.6).
· A role can be assigned only to an existing member of the target company; roles never cross companies (§12.6).
· The same user can hold different roles in different companies within one workspace (§12.6).
· The Role Builder groups abilities by category, offers MARK ALL per category with Include Delete | Exclude Delete confirmation, and shows a None / Partial / All indicator (§12.8).
· Teams surfaces workspace and company scopes as visibly distinct; exact navigation placement is a frontend design decision (§12.9).
· Accepting an invitation never requires or triggers workspace creation.
· Pending workspace shows the Pending Approval Screen.
· Owner can create a first company in the app.
· Company creation provisions the tenant schema.
· Provisioning progress is visible until `ready` or `failed`.
· Existing ERP functionality stays operational.
· No business module has been migrated prematurely.
· No runtime code performs dual-schema reads.
· Architecture stays backward compatible until final cutover.
· Business modules cannot access schema names directly.
· Tenant context is resolved exactly once during application startup.

---

20. Future Enhancements (Out of Scope)

These capabilities are deferred:

· Workspace switcher UI (entry point: Settings)
· Entity switcher UI (entry point: side drawer of the hamburger menu, LHS, on mobile)
· Live provisioning updates via Realtime (startup-time status check remains in scope)
· General-purpose provisioning polling (polling after in-app company creation remains in scope)
· Multi-workspace user experience
· Multi-entity navigation
· Tenant-aware caching optimizations
· Offline tenant synchronization
· Platform Office initiated workspace switching
· Platform Office provisioning notifications
· Platform Office realtime events
· Advanced authorization management UI
· Role edit semantics — whether editing a role affects users who already hold it (live) or only future assignments (snapshot) is not settled. Until settled, the backend template behavior remains authoritative: editing a template never alters existing `entity_permissions` rows unless "reapply" is explicitly invoked (backend PRD §3.6, §13).
· Cross-tenant analytics and reporting

---

21. Standards Conformance

The PRD conforms to the active standards under `docs/standard/`.

- `lifecycle-ownership-standard.md` (binding):
  Business rules must live in the domain layer.
  Pages, forms, components, and hooks own presentation only.
  This applies to tenant resolution, provisioning orchestration, and the workspace and company creation flows.
- `docs-commit-workflow-standard.md` (process):
  The commit format is `<gitmoji> <type>(<scope>): <subject>`, maximum 72 characters.
  Applies when committing this document.

The remaining standards govern document modules (invoice, quotation, waybill, BOQ, RFQ, receipt, CSR, PDF) and prefix and JSON import behaviour.
They do not bind Phase 1.
Phase 1 migrates no business modules.
These standards bind the later phases in which business modules migrate.