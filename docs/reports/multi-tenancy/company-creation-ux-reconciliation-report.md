# Company Creation UX Reconciliation Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Reconcile the company creation UX against the Multi-Tenancy PRD and Adaptive Mobile-First UIUX Facelift PRD. Ensure company creation is a deliberate, first-class management experience with accurate provisioning feedback.

## Scope

- Audit current company creation against both PRDs.
- Fix provisioning status feedback (was silently ignored).
- Add explicit phase states (form → creating → provisioning → success/error).
- Verify no remaining multi-company blockers.
- Preserve existing tenancy architecture.

## Skills Used

- appllama-app-design-skill (mobile-first UX patterns)
- mobile-app-ui-design (mobile UI/UX design principles)
- karpathy (surgical changes, simplicity first)

## Documentation Standard

ADS-STE100 Simplified Technical English

## PRD Reconciliation

### Company Creation Fields

The Multi-Tenancy PRD §9 defines entity creation as:

> Entity creation itself runs through a SECURITY DEFINER RPC... before executing CREATE SCHEMA.

The `entities` table schema has: `id`, `workspace_id`, `display_name`, `slug`, `entity_type`, `is_active`.

The PRD does not require any additional fields at creation time. Company name, address, tax details, logo, and banking info belong in Company Settings after creation. The current one-field form is correct per the PRD.

### Provisioning Lifecycle

The PRD §9.1 defines provisioning transitions:

```
pending → creating → ready | failed
```

The `provisionEntity()` RPC returns `{ status: string }`. The previous implementation did not check this return value — if provisioning failed, the user saw "Company created successfully." This was incorrect.

### Multi-Company State

The PRD §9 explicitly supports multiple companies per workspace:

> The application must route them directly into a "Create your first Company" flow — there is no meaningful dashboard state with zero entities.

Multiple companies are a valid, supported state. The previous `entityCount > 1 → multi-entity` gate was already removed in the prior fix.

## Changes Made

### 1. CreateCompanySheet.tsx — Phase-Based Creation Flow

Replaced the single `loading` boolean with a `CreationPhase` state machine:

| Phase | Meaning |
|-------|---------|
| `form` | User is entering company name |
| `creating` | `createEntity()` RPC is in progress |
| `provisioning` | `provisionEntity()` RPC is in progress |
| `success` | Company created and provisioned (or provisioning in progress) |
| `error` | Creation or provisioning failed |

Key improvements:
- **Checks provisioning return value** — if `provisionResult.status === 'failed'`, shows error instead of false success.
- **Shows accurate status** — "Setting up schema…" during provisioning, "Company created" on success.
- **Workspace context** — description shows which workspace the company belongs to.
- **Close button hidden during processing** — prevents accidental dismiss mid-creation.
- **Success auto-closes** — brief 1.2s success display before sheet closes.
- **Error recovery** — "Try Again" button returns to form state.
- **Uses `var(--bd-overlay-radius)`** — consistent with Facelift overlay standard.
- **Accessible** — close button has `aria-label`, decorative icons marked `aria-hidden`.

### 2. CompanyCreation.tsx — Same Phase-Based Flow

The onboarding page (first-company creation) now uses the same phase-based approach:
- Checks provisioning return value.
- Shows processing/success/error states.
- Uses `selectEntity(entity.id)` after creation to make new company active.
- "Try Again" button for error recovery.

### 3. No Additional Fields Added

Per the PRD, company creation only requires a name. Additional company details (address, tax info, logo, banking) belong in Company Settings. Added a hint: "You can update company details later in Company Settings."

## Tenancy Safety

- Company creation scoped to current workspace via `workspace.id`.
- `selectEntity(entity.id)` makes new company active without changing workspace.
- `refreshEntity()` re-fetches entity list from database.
- No cross-workspace entity selection introduced.
- Existing RLS/authorization preserved.
- Backend `createEntity()` and `provisionEntity()` RPCs remain authoritative.

## Verification Result

- `bun run typecheck`: passed
- `bun run audit:load`: not required (no schema/query/data-layer changes)
- `git status`: 2 files changed, both within scope
- `grep "multi-entity|Multiple companies|future phase"`: no results (all blockers removed)

## Risks or Limitations

- No runtime/device testing performed. Static verification only.
- The `provisionEntity()` RPC may return 'creating' for async provisioning. The current implementation treats this as success (provisioning is in progress). A future enhancement could poll `getEntityProvisioningStatus()` until 'ready' or 'failed'.
- The CompanyCreation onboarding page and CreateCompanySheet share similar logic but are not extracted into a shared form primitive. This is acceptable because they serve different presentation contexts (full page vs bottom sheet) and the form is a single field.

## Deferred Work

- Workspace creation (deferred per previous reconciliation audit).
- Company Settings enhancement (address, tax details, etc.) — separate task.
- Invitation management — separate task.
- Role/permission assignment — separate task.
- Provisioning polling (poll `getEntityProvisioningStatus` until terminal state) — future enhancement.
