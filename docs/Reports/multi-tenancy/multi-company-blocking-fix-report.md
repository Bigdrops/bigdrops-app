# Multi-Company Blocking Fix Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Fix the critical regression where creating a second company inside an existing workspace causes the application to enter a global blocking state displaying "Multiple companies detected — Company selection is coming in a future phase."

## Scope

- Remove the obsolete single-company assumption from the tenant gate.
- Ensure the newly created company becomes the active entity after creation.
- Preserve all existing tenancy boundaries, provisioning, and workspace state.

## Files Changed

| File | Change |
|------|--------|
| `src/domain/tenant/tenantGate.ts` | Removed `multi-entity` phase from type, gate logic, and labels |
| `src/components/app/TenantGate.tsx` | Removed `multi-entity` rendering case |
| `src/components/layout/CreateCompanySheet.tsx` | Added explicit `selectEntity(entity.id)` after creation |
| `src/pages/CompanyCreation.tsx` | Added explicit `selectEntity(entity.id)` after creation |

## Skills Used

- karpathy (coding discipline — surgical changes, simplicity first)

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

### 1. Root Cause

In `src/domain/tenant/tenantGate.ts`, the function `resolveGatePhase` contained:

```typescript
if (input.entityCount > 1) return 'multi-entity'
```

This line caused the entire application to block whenever a workspace contained more than one company. The `multi-entity` phase rendered a full-screen blocking message in `TenantGate.tsx` with no way to proceed.

### 2. Why This Was Wrong

The `EntityProvider` in `src/lib/tenant/contexts.tsx` already handles multi-entity resolution correctly:

- Single entity: auto-selects it.
- Multiple entities: restores session pick or defaults to first entity.
- Provides `selectEntity(id)` for explicit switching.

The gate should not have blocked on `entityCount > 1`. The entity provider's selection logic is the correct resolution mechanism.

### 3. Fix: Remove `multi-entity` Phase

Removed three things from `tenantGate.ts`:

1. `'multi-entity'` from the `TenantGatePhase` type union.
2. `if (input.entityCount > 1) return 'multi-entity'` from `resolveGatePhase`.
3. `case 'multi-entity': return 'Multiple companies'` from `gatePhaseLabel`.

Removed the `multi-entity` rendering case from `TenantGate.tsx`.

After the fix, when `entityCount > 1`, the gate falls through to the provisioning status check, which correctly resolves the selected entity's state.

### 4. Fix: Explicit Entity Selection After Creation

Both `CreateCompanySheet.tsx` and `CompanyCreation.tsx` now call `selectEntity(entity.id)` after successful creation and provisioning. This ensures the newly created company becomes the active entity immediately, rather than relying on the entity provider's auto-selection which might restore a previous session pick.

### 5. Lifecycle After Fix

1. User creates Company B in a workspace that already has Company A.
2. `createEntity()` inserts the entity.
3. `provisionEntity()` kicks off schema provisioning.
4. `selectEntity(entity.id)` makes Company B the active entity.
5. `refreshEntity()` re-fetches the entity list from the database.
6. The gate re-evaluates: `entityCount > 0`, entity is resolved, provisioning check runs.
7. The application proceeds to `ready` phase and renders normally.
8. User can switch between Company A and Company B via the company switcher.

## Verification Result

- `bun run typecheck`: passed
- `bun run audit:load`: not required (no schema/query/data-layer changes)
- `git status`: 4 files changed from this task, plus pre-existing consolidation changes from the previous pass

## Risks or Limitations

- No runtime/device testing was performed. The fix is verified through static analysis and type checking only.
- The `selectEntity` call happens before `refreshEntity()` completes its async re-fetch. This is safe because `selectEntity` sets `selectedEntityId.current` (a ref), which the entity provider's effect checks when the re-fetch completes.

## Deferred Work

- Company creation UI enhancement (currently only company name field — should be reconciled with Multi-Tenancy PRD for required fields).
- Company switching from the sidebar (already implemented in the consolidation pass).
- Workspace creation (deferred per the previous reconciliation audit).
