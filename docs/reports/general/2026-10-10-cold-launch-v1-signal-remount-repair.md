# Cold Launch V1 Signal and Startup Handoff Repair

Date: 2026-10-10

## Scope

Implemented the repair plan from `docs/reports/general/2026-10-10-cold-launch-v1-forensic-audit.md`.

No production authentication, tenant decision rules, Supabase queries, schema files, dashboard modules, or Onboarding V2 files were changed.

## Animation Changes

- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
  - Disabled `.clp-signal` rendering for the production default `variant="original"`.
  - Restricted infinite `clp-signal-travel` to `data-variant="enhanced"` only.
  - Kept static `.clp-edge` geometry and one-shot `clp-draw` reveal unchanged.
  - Kept `clp-ring-in`, `clp-draw`, and `clp-pop` as one-shot establish animations with persistent final states.

Result: production no longer runs infinite `stroke-dashoffset` travel on the main Tenant Tree connection geometry.

## Startup Lifecycle Changes

- `src/App.tsx`
  - Added TenantGate phase tracking with `tenantGatePhase`.
  - Added `shouldAwaitTenantGateReport` so Cold Launch does not unmount between auth/profile readiness and the first TenantGate phase report.
  - Kept Cold Launch hidden for active native biometric verification through `biometricGateActive`.
  - Reset TenantGate startup presentation state when session, profile, offline access, or mandatory-update gates make TenantGate unreachable.

- `src/components/app/TenantGate.tsx`
  - Preserved `case 'loading': return null`.
  - Added optional `onPhaseChange` reporting.
  - Kept TenantGate as the authority for workspace/entity phase resolution.

- `src/components/app/BiometricGate.tsx`
  - Added optional `onGatedChange` reporting.
  - Kept native biometric verification interactive and outside the decorative Cold Launch overlay.

## Preserved Tenant-State Destinations

These states remain explicit destination screens and are not hidden behind an indefinite Cold Launch overlay:

- `WorkspacePendingApproval`
- `ProvisioningProgress`
- `CompanyCreation`
- `WorkspaceCreation`
- `WorkspaceSelection`
- `WorkspaceInvitation`
- `ProvisioningFailed`
- Tenant error and unavailable states

## Regression Coverage

Updated `src/tests/critical/coldLaunchProductionStartup.test.js` to verify:

- Production startup waits for the TenantGate first phase report.
- Terminal tenant destinations remain reachable.
- Biometric security UI remains outside Cold Launch.
- Production default does not activate infinite signal travel.
- Static edges still use the one-shot reveal.
- Preview controls remain excluded from production.

## Verification Results

- `bun run typecheck`: passed.
- `bun test src/tests/critical/coldLaunchProductionStartup.test.js`: 11 passed.
- `bun test src/tests/critical/coldLaunchPreviewAtmosphere.test.js`: 4 passed.
- `bun test src/tests/critical/tenantGate.test.js`: 11 passed.
- `bun test src/tests/critical/productionComposition.test.js`: 6 passed.

`bun run build` was not run.

## Remaining Verification

No browser or device rendering was performed in this pass. Mobile Chrome behavior should still be visually checked on the target device to confirm that the tree establishes once, holds, and exits only when the real startup lifecycle permits it.
