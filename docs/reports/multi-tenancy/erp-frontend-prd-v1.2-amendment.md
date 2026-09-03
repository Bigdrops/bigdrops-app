# ERP Frontend PRD v1.2 Amendment Report

This report was written by opencode (deepseek-v4-flash-free) on 2026-08-15 via Local Runner.

## Objective

Update `erp-frontend-prd-v1.1.md` so that workspace creation and company creation move into ERP frontend scope.

The product model:

- Creating a company is inside the app.
- Creating a workspace is inside the app.
- Workspace creation requires approval from the Platform Office.
- Company creation does not require approval.

The PRD previously listed workspace creation, workspace approval, and entity provisioning as outside the ERP frontend.

## Scope

The amendment covers:

- Version bump from 1.1 to 1.2.
- Section 2: deployment prerequisites.
- Section 8: application startup flow.
- Section 9: backend dependencies.
- Section 10.7: switcher UI placement (new).
- Section 12: provisioning behaviour.
- Sections 12.1 and 12.2: in-app creation flows (new).
- Section 15: Phase 1 deliverables.
- Section 16: explicit non-goals.
- Section 19: Phase 1 acceptance criteria.
- Section 20: future enhancements.

The amendment does not cover:

- Backend SQL changes.
- Frontend implementation.
- Platform Office changes.

The amendment covers a standards conformance review after the v1.2 changes were written.
See the Changes made section for the added conformance section.

## Files changed

- `docs/prd/multi-tenancy/erp-frontend-prd-v1.1.md` (amended)
- `docs/Reports/multi-tenancy/erp-frontend-prd-v1.2-amendment.md` (this report)

## Skills used

Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English

## Documentation standard

This report follows ADS-STE100 Simplified Technical English.

## Changes made

### Section 2: deployment prerequisites

The section now separates the preconditions from the creation flows.

The ERP requires:

- The multi-tenant backend infrastructure.
- A schema template.
- At least one platform operator.

The ERP now performs:

- Workspace creation in the app. The new workspace has status `pending_approval`.
- Company creation in the app. The app inserts the entity and calls the provisioning RPC.

The following stay outside the ERP frontend:

- Initial platform bootstrap.
- Workspace approval.
- Provisioning implementation details.

### Section 8: application startup flow

The diagram now routes:

- A user without a workspace into a "Create Workspace" flow.
- The new workspace into a "Pending Approval" screen.
- An approved workspace into the entity resolution step.
- A workspace with zero entities into a "Create your first Company" flow.
- The created company into the provisioning status check.

### Section 9: backend dependencies

The section now lists the creation contracts the frontend calls:

- Insert into `workspaces`.
- Insert into `entities`.
- `provision_entity` or `create_entity_schema` RPC.
- `get_entity_provisioning_status`.

The frontend still does not depend on:

- Workspace approval workflow.
- Provisioning implementation details.
- Advisory locks.
- Retry logic.
- Schema cloning implementation.
- RLS generation internals.

### Section 10.7: switcher UI placement (new)

This new section records the product placement rules:

- Workspace switching is a settings-level concern.
- The workspace switch entry point belongs in the Settings area.
- Company switching is a navigation concern.
- On mobile, the company switcher must appear in the side drawer of the hamburger menu on the left-hand side.

These rules apply to the future switcher UIs in section 20.
They do not affect Phase 1 creation flows.

### Section 12: provisioning behaviour

The `creating` state now permits polling after an in-app company creation.

The frontend polls `get_entity_provisioning_status` until the status is `ready` or `failed`.

Realtime subscriptions stay out of scope.

### Sections 12.1 and 12.2: in-app creation flows (new)

Section 12.1 defines the in-app workspace creation flow:

1. The user submits a workspace name and slug.
2. The app inserts a row into `public.workspaces`.
3. The new workspace has status `pending_approval`.
4. The app shows the Pending Approval Screen.
5. A platform operator approves the workspace in the Platform Office.
6. The `approve_workspace` RPC inserts the owner membership.
7. The app detects the workspace is `active` and resolves it.
8. The app routes the user to the Company Creation Flow.

The notes state that:

- The app does not call `approve_workspace`.
- The app does not set workspace status to `active`.
- The `idx_one_pending_workspace_per_creator` constraint allows one pending workspace per creator.

Section 12.2 defines the in-app company creation flow:

1. The app shows the "Create your first Company" flow.
2. The user submits a company name, slug, and type.
3. The app inserts a row into `public.entities`.
4. The app calls `provision_entity` with the new entity id.
5. The provisioning RPC creates the tenant schema and clones the template.
6. The app polls `get_entity_provisioning_status` until the status is `ready` or `failed`.
7. On `ready`, the app resolves the entity and continues application startup.
8. On `failed`, the app shows the provisioning failure page.

The notes state that:

- The app never constructs schema names.
- The app never executes schema DDL.
- The provisioning RPC enforces the `create_entity` permission.

### Section 15: Phase 1 deliverables

Phase 1 now includes:

- Workspace Creation Flow.
- Company Creation Flow (zero-entity onboarding).
- Pending Approval Screen.
- Provisioning Progress Screen.

### Section 16: explicit non-goals

The section now clarifies the switch UIs:

- Workspace switch UI is the switch between existing workspaces.
- Entity switch UI is the switch between existing companies.
- Workspace approval UI stays in the Platform Office.
- Application routing is not changed for migrated modules.

### Section 19: acceptance criteria

Phase 1 now includes these acceptance criteria:

- The user can create a workspace in the app.
- The pending workspace shows the Pending Approval Screen.
- The owner can create a first company in the app.
- Company creation provisions the tenant schema.
- Provisioning progress is visible until `ready` or `failed`.

### Section 20: future enhancements

The section now records the switcher entry points:

- Workspace switcher UI entry point: Settings.
- Entity switcher UI entry point: side drawer of the hamburger menu, LHS, on mobile.

The section now clarifies polling:

- Startup-time status check remains in scope.
- Polling after in-app company creation remains in scope.
- Live provisioning updates via Realtime stay deferred.

### Section 21: standards conformance (new)

All 14 standards under `docs/standard/` were read and triaged.

Two standards bind the PRD:

- `lifecycle-ownership-standard.md`: business rules must live in the domain layer.
  Pages, forms, components, and hooks own presentation only.
  This applies to tenant resolution, provisioning orchestration, and the creation flows.
- `docs-commit-workflow-standard.md`: the commit format is `<gitmoji> <type>(<scope>): <subject>`, maximum 72 characters.
  This is a process standard. It applies when committing this document.

The remaining 12 standards govern document modules and PDF, prefix, and JSON import behaviour.
They do not bind Phase 1.
Phase 1 migrates no business modules.
These standards bind the later phases in which business modules migrate.

## Verification

The amendment was checked against the backend contracts:

- `workspaces_insert_authenticated` RLS policy allows any authenticated user to insert a workspace.
- `entities_insert_member` RLS policy allows a workspace owner to insert an entity.
- `provision_entity` is a SECURITY DEFINER RPC.
- The `idx_one_pending_workspace_per_creator` index exists in migration `20260714000000`.

Results:

- bun run audit:load: passed, pre-existing findings only
- bun run typecheck: passed
- git status: PRD file modified, other changes pre-existing
- bun run build: skipped due to hardware policy

## Risks or limitations

- The product model is recorded in the PRD. The implementation must follow it.
- The switcher UI placement rules apply to future sections.
- The in-app creation flows require the backend contracts verified above.
- The 12 non-binding standards were read once. They are not quoted in the PRD.
  They will bind the later phases that migrate business modules.

## Deferred work

- Implement the in-app workspace creation flow.
- Implement the in-app company creation flow.
- Implement the Pending Approval Screen.
- Implement the Provisioning Progress Screen.
- Wire the new flows into the application routing.
- Resume the backend execution: owner permissions seed, Plan D, Plan E, Plan F, Plan G.
