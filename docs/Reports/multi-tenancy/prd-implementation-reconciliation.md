# Multi-Tenancy PRD Implementation Reconciliation Report

This report was written by Qwen on 2026-08-18 via Local Runner.
Updated by deepseek-v4-flash-free on 2026-08-16 via opencode (frontend invitation gate correction).

## Objective

- Compare the existing multi-tenancy implementation against the corrected PRDs.
- Classify every implementation area as compliant, contradiction, weaker, acceptable difference, or ambiguous.
- Apply minimal corrections for genuine contradictions and weaker implementations.
- Produce a reconciliation report with final counts.

## Scope

- Backend: multi-tenancy migrations under `supabase/migrations/`.
- Frontend: tenancy onboarding gate and tenant access layer under `src/`.
- PRDs: corrected Platform Office PRD v1.2, Multi-Tenancy Backend PRD v2.1, ERP Frontend PRD v1.3.
- Reference document: `three-prd-tenancy-illustration.html` (reference only, not a spec).
- Out of scope: new permission models, refactors, and library changes.

## PRDs Reviewed

- `docs/prd/Platform-god/platform-office-prd.md` (v1.2, locked).
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` (corrected v2.1, 2026-08-16 note).
- `docs/prd/multi-tenancy/erp-frontend-prd-v1.1.md` (corrected v1.3).

## Implementation Areas Reviewed

- Workspace lifecycle functions.
- Entity provisioning engine.
- Permission seeding and template application.
- Invitation acceptance backend.
- Tenancy RLS policies.
- Frontend onboarding gate.
- Frontend tenant client routing.

## PRD-Compliant Work

- Audit 1 (workspace lifecycle): `approve_workspace()` sets status to `active` and inserts the owner membership only. It does not initiate provisioning.
- Audit 2 (creator auto-grant): `provision_entity()` calls `_prov_seed_default_permissions(p_entity_id, auth.uid())` inside the same transaction before the entity is marked `ready`.
- Audit 4 (multiple memberships): backend allows multiple memberships. Phase 1 activates exactly one workspace.
- Audit 5 (entity access): access is denied by default, action-based, entity-scoped, and RLS-enforced.
- Audit 6 (tenant client): routing only, no public-schema fallback. Null schemaName throws.
- Audit 7 (public vs tenant boundary): public tables hold tenancy metadata. Tenant business tables live in entity schemas.
- Audit 8 (Plan A template): template and financial-view drift remain applied.
- Audit 10 (Platform Office isolation): platform office does not read tenant business data.

## Contradictions Found

- None classified as B.

## Weaker Implementations Found

- Audit 9: the default permission seeder grants an enumerated resource set. It omits `client`, `project`, `project_document`, `waybill`, `csr`, `letter`, `signatory`, and `bank_account`. Tenant RLS policies use these resource names, so the creator of a new entity could not open those tables. Corrected by migration `20260818000000_seed_wildcard_creator_permission.sql`.
- Audit 3: the backend invitation flow is complete, but the frontend had no pending-invitation gate phase. A user with a pending invitation and zero memberships was routed to Create Workspace. Corrected in this update.

## Corrections Required

- Audit 9 correction: add the PRD v2.1 §9.3 wildcard grant (`'*'` with view, create, edit, delete) to `_prov_seed_default_permissions()`. This matches the wildcard support already present in `has_entity_permission()`.

## Corrections Applied

### Audit 9: wildcard creator permission

- New migration `supabase/migrations/20260818000000_seed_wildcard_creator_permission.sql`.
- It redefines `_prov_seed_default_permissions()` to insert wildcard permission rows for the creating user.
- It preserves the existing enumerated grants.
- It uses `ON CONFLICT DO NOTHING`. It is idempotent and safe to re-run.
- It affects new entities only. Backfilling the live entity is out of scope.

### Audit 3: frontend pending-invitation gate

- `src/domain/tenant/tenantGate.ts`: added `'pending-invitation'` phase and `pendingInvitation` input. When the user has no workspace, the phase is `pending-approval`, then `pending-invitation`, then `create-workspace`.
- `src/lib/tenant/contexts.tsx`: `WorkspaceProvider` now queries `workspace_invitations` for a pending, unexpired invite when the user has no active membership. RLS (`workspace_invitations_select_member`) restricts rows to the caller email, so no email filter is sent.
- `src/domain/tenant/tenantCreation.ts`: added `acceptWorkspaceInvitation()` which calls the `accept_workspace_invitation` RPC. The client never writes membership or grant rows.
- `src/pages/WorkspaceInvitation.tsx`: new gate page with accept and sign-out actions, modeled on `WorkspacePendingApproval.tsx`.
- `src/components/app/TenantGate.tsx`: wired the new phase to render `WorkspaceInvitation`.
- `src/tests/critical/tenantGate.test.js`: added cases for invitation routing and pending-approval precedence.
- Behavior: after acceptance the provider refreshes, the gate re-resolves, and the user is treated as a member of the invited workspace.

## Deliberately Unchanged Implementation

- `getCurrentTenantId()` returning the cached user id: kept. It is used only for routing decisions, not authorization.
- The PRD v2.1 §9.3 example SQL uses an `actions` array column. The real schema uses per-row `action` values. The implementation is the correct representation.
- The acceptance screen is generic. It does not show the workspace name. An invitee with zero memberships cannot read the `workspaces` row under `workspaces_select_member` (member or creator only), so the name is unavailable without a schema or policy change.

## Remaining Ambiguities or Risks

- Live production entity `eca34515-0b30-482c-b12e-3963df164322` was not backfilled with the wildcard grant. If the owner needs access to the omitted resources now, run a targeted seed for that entity.
- Deferred backend work: seed default permissions for the legacy entity and backfill tenant `rfqs` rows from public.
- The acceptance screen shows no workspace name because of the `workspaces_select_member` policy. Add a name-only policy for invitees if a later phase requires it.

## Verification Result

- `bun run audit:load`: passed (pre-existing warnings remain; no new warnings from this change)
- `bun run typecheck`: passed
- `bun run test`: 143 passed, 0 failed (includes new pending-invitation gate cases)
- `git status`: modified phase-1 frontend files and this report; new files are the invitation gate, the migration, and this report
- `bun run build`: skipped due to hardware policy
- The migration is additive and idempotent.

Skills used: supabase-postgres-best-practices, supabase, karpathy
Documentation standard: ADS-STE100 Simplified Technical English