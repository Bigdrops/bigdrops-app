# Phase 1 Onboarding Gate Frontend Report

This report was written by deepseek-v4-flash-free on 2026-08-15 via opencode.

## Objective

Build the frontend onboarding gate for multi-tenancy Phase 1. A signed-in user must see the correct onboarding screen based on workspace, entity, and provisioning state.

## Scope

- Create the tenant gate decision logic in the domain layer.
- Create the workspace and entity creation operations in the domain layer.
- Expose workspace and entity resolution state through React contexts.
- Render the correct onboarding screen from a single gate component.
- Mount the gate above the main application shell.
- Add a runnable test for the gate decision logic.

## Files changed

- `src/domain/tenant/tenantGate.ts`: NEW. Pure phase decision logic.
- `src/domain/tenant/tenantCreation.ts`: NEW. Workspace and entity creation, provisioning operations.
- `src/lib/tenant/contexts.tsx`: EDITED. Added workspace refresh, pending workspace state, and domain-routed provisioning checks.
- `src/components/app/TenantGate.tsx`: NEW. Gate presenter.
- `src/pages/WorkspaceCreation.tsx`: NEW. Workspace creation screen.
- `src/pages/WorkspacePendingApproval.tsx`: NEW. Pending approval screen.
- `src/pages/CompanyCreation.tsx`: NEW. Company creation screen.
- `src/pages/ProvisioningProgress.tsx`: NEW. Provisioning progress screen.
- `src/pages/ProvisioningFailed.tsx`: NEW. Provisioning failed screen.
- `src/components/app/AppShell.tsx`: EDITED. Removed workspace and entity providers.
- `src/App.tsx`: EDITED. Mounted providers and gate above the shell.
- `src/tests/critical/tenantGate.test.js`: NEW. Gate decision tests.

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

The gate exposes one phase per possible onboarding state:

- loading
- error
- create-workspace
- pending-approval
- create-company
- provisioning
- provisioning-failed
- blocked
- unavailable
- multi-entity
- ready

The decision order matters. Workspace loading and errors come first. A missing workspace routes to creation or pending approval. Then entity loading and errors. A zero entity count routes to company creation. More than one entity shows the multi-entity notice. The provisioning status then maps to ready, failed, provisioning, blocked, or unavailable.

The gate presenter maps each phase to a screen. The ready phase renders the main application shell. The gate mounts under `WorkspaceProvider` and `EntityProvider` and above `AppShell`.

The workspace and entity providers moved out of `AppShell`. `AppShell` keeps the authorization provider and the theme manager. `App.tsx` now owns the provider nesting.

Domain operations live in the domain layer:

- `createWorkspace` inserts a workspace.
- `createEntity` inserts an entity.
- `provisionEntity` calls the provisioning RPC.
- `getEntityProvisioningStatus` reads provisioning status and normalizes empty results.

The pure `slugify` helper lives in `tenantGate.ts`. `tenantCreation.ts` re-exports it so existing page imports stay unchanged.

## Verification

- `bun run audit:load`: passed. No new findings from the changed files.
- `bun run typecheck`: passed.
- `bun run test`: passed. 142 tests, 142 pass, 0 fail. Includes the new `tenantGate.test.js`.
- `git status`: shows only the intended new and modified files.

## Risks or limitations

- `getEntityProvisioningStatus` is `SECURITY DEFINER` and returns zero rows to unauthorized callers. The normalization handles an empty array, but unauthorized callers may be misrouted to the provisioning screen. This matches the existing RPC behavior.
- The approve path depends on the platform operator flow. It was not exercised end to end in this session.
- The multi-entity state shows an inline notice, not a routed screen.

## Deferred work

- Backend seeding of owner permissions for live entities.
- Plan D: `rfqs` data backfill and `rfq_items` foreign key re-add.
- Audit of remaining missing foreign keys per the final reconciliation blueprint.
