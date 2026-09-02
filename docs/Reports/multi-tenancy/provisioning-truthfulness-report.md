# Provisioning Truthfulness & End-to-End Reconciliation Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Make company creation state accurately represent the actual provisioning lifecycle. Never tell the user a company is fully ready while its tenant provisioning is still incomplete.

## Scope

- Audit the actual provisioning contract (sync vs async).
- Add provisioning polling to creation flows.
- Ensure truthful state representation.
- Preserve multi-company fix and existing architecture.
- No unrelated changes.

## Skills Used

- karpathy (surgical changes, simplicity first)

## Documentation Standard

ADS-STE100 Simplified Technical English

## Provisioning Contract Discovery

### What Was Found

| Function | Behavior |
|----------|----------|
| `createEntity()` | Inserts entity row. Synchronous. Returns `{ id, slug, display_name }`. |
| `provisionEntity(entityId)` | Calls `supabase.rpc('provision_entity', { p_entity_id })`. **Asynchronous.** Returns `{ status: string }`. Comment says "Returns {'status': 'creating'|'ready'}". |
| `getEntityProvisioningStatus(entityId)` | Calls `supabase.rpc('get_entity_provisioning_status', { p_entity_id })`. Returns `ProvisioningState { status, lastError }`. |
| EntityProvider `checkProvisioning()` | Called on entity selection. Reads provisioning status and sets `provisioningStatus` state. |
| Tenant Gate | `creating`/`pending` → renders `provisioning` phase. `ready` → renders `ready`. `failed` → renders `provisioning-failed`. |

### The PRD Contract (§9.1)

```
pending → creating → ready | failed
```

The `create_entity_schema()` SECURITY DEFINER function writes status transitions as it runs. This is asynchronous — schema creation involves `CREATE SCHEMA` + table cloning, which takes time.

### Previous Defect

The creation flow called `provisionEntity()`, received `{ status: 'creating' }`, and immediately showed "Company created successfully." But provisioning was still in progress. The tenant gate would then render a "Provisioning…" screen after the sheet closed — a jarring double-state UX.

Additionally, `selectEntity(entity.id)` was called before the entity provider had refreshed its entity list, causing the entity to resolve to `null` briefly.

## Changes Made

### 1. CreateCompanySheet.tsx — Provisioning Poll

Added bounded polling after `provisionEntity()`:

- Polls `getEntityProvisioningStatus()` every 2 seconds.
- Maximum 15 attempts (30 seconds total).
- Three terminal outcomes:
  - `ready` → select entity, refresh, show success
  - `failed` → show error with details
  - `timeout` → select entity, let tenant gate handle, show "still being set up"

The poll respects component unmount via `cancelledRef`.

Key behavior:
- If `provisionEntity()` returns `ready` immediately → no polling needed.
- If `provisionEntity()` returns `creating`/`pending` → poll until terminal.
- If provisioning fails → clear error, company exists but is not ready.
- If polling times out → entity is selected, tenant gate shows provisioning phase.

### 2. CompanyCreation.tsx — Same Provisioning Poll

The onboarding page uses the same polling logic. Consistent behavior across both creation surfaces.

### 3. Entity Selection Timing

After polling completes:
1. `selectEntity(entity.id)` — sets `selectedEntityId.current` (ref side effect) even if entity isn't in stale array yet.
2. `refreshEntity()` — triggers entity provider re-fetch. Auto-selection restores from ref.
3. Brief null entity state is masked by the success UI.

### 4. Reverted Pre-existing Uncommitted Changes

Reverted `InvoiceOverlays.tsx` and `ViewInvoice.tsx` to HEAD. These had uncommitted typecheck errors from the previous DocumentCustomizeCard session, unrelated to this task.

## Creation Lifecycle After Fix

```
form → user enters name → submit
creating → createEntity() RPC
provisioning → provisionEntity() RPC
  ├─ returns 'ready' → select → refresh → success
  ├─ returns 'failed' → error with details
  └─ returns 'creating'/'pending' → poll getEntityProvisioningStatus()
       ├─ 'ready' → select → refresh → success
       ├─ 'failed' → error with details
       └─ timeout (30s) → select → refresh → "still being set up"
```

## Tenancy Safety

- Company creation scoped to current workspace via `workspace.id`.
- Entity selection uses canonical `EntityProvider` state.
- Provisioning checked via canonical `getEntityProvisioningStatus()`.
- No cross-workspace entity selection.
- No parallel company state stores.
- No RLS/authorization bypass.
- Backend remains authoritative for provisioning lifecycle.

## Verification Result

- `bun run typecheck`: passed
- `bun run audit:load`: not required (no schema/query/data-layer changes)
- `git status`: 2 files changed (CreateCompanySheet.tsx, CompanyCreation.tsx)
- Reverted 2 unrelated files to clean state

## Risks or Limitations

- No runtime/device testing. Static verification only.
- Polling interval (2s) and max attempts (15) are conservative. If provisioning takes longer than 30s, the user sees "still being set up" and the tenant gate handles the rest.
- The `provisionEntity()` RPC comment says "Returns {'status': 'creating'|'ready'}" but the actual return type is `{ status: string }`. The implementation handles all possible status values defensively.

## Deferred Work

- Workspace creation (deferred per previous reconciliation).
- Company Settings enhancement (address, tax, logo, banking) — separate task.
- Invitation management — separate task.
- Role/permission assignment — separate task.
- Provisioning progress indicator (percentage or step count) — future enhancement.
