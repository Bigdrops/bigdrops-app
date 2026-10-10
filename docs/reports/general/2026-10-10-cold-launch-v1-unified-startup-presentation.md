# Cold Launch V1 Unified Startup Presentation Ownership

This report was written by OpenCode on 2026-10-10.

## Objective

Make Cold Launch V1 the sole visible loading presentation throughout passive startup. Preserve provisioning functionality; suppress only its competing passive visual. Prior repairs (infinite signal travel disabled, remount gap closed, TenantGate phase reporting, biometric gated reporting) are preserved.

## Startup Presentation Ownership Changes

- `src/App.tsx`: `showColdLaunch` gains `isPassiveStartupPhase(tenantGatePhase)`. When TenantGate reports `provisioning`, the fixed Cold Launch overlay stays up over the still-mounted `ProvisioningProgress`, whose 3s polling, completion detection, and failure routing continue unchanged underneath. Phase transitions (`provisioning` to `ready`, `provisioning-failed`, or any actionable phase) exit Cold Launch through the existing readiness signals. No timers, no sticky flags, no remount-gap regression (TenantGate never unmounts on phase change).
- `src/domain/tenant/tenantGate.ts`: added pure `isPassiveStartupPhase` classifier. Tenant resolution semantics, authorization, queries, and schema untouched. `TenantGate`, `ProvisioningProgress`, `WorkspacePendingApproval`, and `BiometricGate` unchanged.

## Passive/Actionable State Classification

| State | Class | Visible presentation | Justification |
|---|---|---|---|
| Auth/profile/offline init, tenant loading, await-report | Passive | Cold Launch V1 | No user input possible or required |
| Automatic provisioning + status polling | Passive | Cold Launch V1 (owner stays mounted beneath) | Auto-completes in seconds; failure surfaces as `provisioning-failed` |
| Pending approval | Actionable | `WorkspacePendingApproval` screen preserved | Indefinite duration; carries approval information the user must read; owns Leave and Sign Out exits with no auto-completion path. Hiding it would trap the user with no exit. |
| Login, biometric verify, workspace/company creation and selection, invitation acceptance, provisioning failure, tenant errors | Actionable | Dedicated screens preserved | Each requires reading or action |
| Native biometric verification | Actionable | Native prompt + existing `PageLoader` backdrop, outside Cold Launch | Prior repair preserved; prompt stays interactive |

Trade documented: the optional Sign Out escape inside `ProvisioningProgress` is covered while Cold Launch shows it; provisioning auto-completes and its own dialog copy states it continues in the background, and failure/recovery screens stay reachable.

## Provisioning Lifecycle Preservation Evidence

- `TenantGate` still returns `<ProvisioningProgress />` for `provisioning` (mount preserved).
- `ProvisioningProgress` still owns `setInterval` refresh plus `recheckProvisioning` with cleanup (no duplicate or removed side effects).
- `App` never renders `<ProvisioningProgress />` itself and adds no provisioning logic.

## Modified Files

- `src/App.tsx` (presentation condition + import only)
- `src/domain/tenant/tenantGate.ts` (pure classifier only)
- `src/tests/critical/coldLaunchProductionStartup.test.js` (updated stale expression assertion; 3 new ownership tests)
- `src/tests/critical/tenantGate.test.js` (new `isPassiveStartupPhase` unit tests)
- `docs/reports/general/2026-10-10-cold-launch-v1-unified-startup-presentation.md` (this report)

## Regression Tests

- `isPassiveStartupPhase` true only for `loading` and `provisioning`; false for null and all 10 other phases (real unit tests against the domain module).
- App covers the provisioning phase with Cold Launch; owner stays mounted with polling intact.
- Pending approval keeps its screen, Leave/Sign Out actions, and refresh polling; never covered by Cold Launch.
- Failure and recovery screens (`provisioning-failed`, `error`, refresh handlers) unchanged and reachable.
- Prior suites untouched and passing: infinite signal travel stays disabled, one-shot reveal intact, Quick Tips intact, biometric gate interactive, preview V1-only.

## Verification Results

- `bun run typecheck`: passed, exit 0.
- `bun test` focused: `coldLaunchProductionStartup` + `tenantGate` + `productionComposition`: 32 pass, 0 fail. `coldLaunchPreviewAtmosphere`: 4 pass, 0 fail.
- `git diff --check`: passed.
- No render-level (jsdom) tests exist in this repo: no DOM test runner is installed, so lifecycle assertions are pure-logic unit tests plus source-ownership contracts; no new dependencies were added.
- `bun run audit:load`: not run (no schema, query, or data-layer change).
- `bun run build`: not run (4GB RAM prohibition).

## Remaining Device Validation Requirements

- On-device startup observation: Cold Launch holds through an actual provisioning phase with no card flash, then exits to the ready destination.
- Confirm a provisioning failure still surfaces its recovery screen from behind Cold Launch.
- Confirm an indefinite pending approval never shows Cold Launch and its Leave/Sign Out paths work.
- No browser automation was performed in this pass.
