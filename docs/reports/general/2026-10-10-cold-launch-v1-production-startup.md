# Cold Launch V1 Production Startup Integration

This report was written by Codex on 2026-10-10 via Codex desktop.

## Objective

Promote the approved Cold Launch V1 Tenant Tree into the real BOURXE startup lifecycle. Retire the rejected Cold Launch V2 Paper and Delivery candidate. Preserve authentication, tenant readiness, routing, theme persistence, and ordinary route loading behavior.

## Skills used

- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `typescript-advanced-types`
- `accessibility`
- `redesign-existing-projects`
- `mobile-app-ui-design`
- `safe-area-handling`
- `review-animations`
- `tailwind-css-patterns`
- `karpathy`

## Startup lifecycle audit

1. Current cold-start presentation was `SplashOverlay`, mounted from `src/App.tsx` while `showSplash` was true.
2. Session initialization is owned by `src/App.tsx`. It restores the Supabase session with `resolveSessionSafely('app bootstrap')`.
3. Authentication readiness is determined by `authLoading`, `offlineAccessLoading`, `session`, and Supabase `onAuthStateChange` events.
4. Profile readiness is determined by `profileLoading` and `resolvedProfileUserId`.
5. Tenant and workspace readiness are owned by `WorkspaceProvider`, `EntityProvider`, and `TenantGate`. `resolveGatePhase` maps provider state to loading, onboarding, recovery, or ready.
6. The visible startup fallbacks were the generic circuit `SplashOverlay`, `PageLoader` during auth/profile waits, and `PageLoader` plus `LoadingTips` inside the tenant gate.
7. Startup failure and recovery already exist through `ErrorBoundary`, `GateError`, `OfflineAccessBlocked`, `UpdateGate`, `BiometricGate`, and Supabase auth cleanup. These mechanisms remain authoritative.
8. Initial session restoration and ordinary route loading use different surfaces. `SplashOverlay` is entry-level; `PageLoader` is also used by React `Suspense` for lazy route code.
9. `PageLoader` is shared with unrelated workflows, so it was not globally replaced.
10. The app has `Suspense` boundaries in `App.tsx` and `AppShell.tsx`. They remain on `PageLoader` to avoid showing Cold Launch during ordinary route transitions.

## Root architectural decisions

- Extracted the approved Tenant Tree into `ColdLaunchTenantTreePresentation`.
- Kept `/cold-launch-preview` as a V1-only preview gateway with local controls.
- Wired production startup through the existing `SplashOverlay` boundary.
- Wired tenant/workspace readiness through the existing `TenantGate` loading phase.
- Removed the previous 600 ms minimum splash display delay.
- Left session, profile, offline access, workspace, entity, schema exposure, routing, and retry logic unchanged.
- Left lazy route `Suspense` fallbacks on `PageLoader`.

## Files changed

- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
- `src/pages/ColdLaunchPreview.tsx`
- `src/components/app/SplashOverlay.tsx`
- `src/components/app/TenantGate.tsx`
- `src/App.tsx`
- `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `src/tests/critical/coldLaunchProductionStartup.test.js`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md`
- `docs/reports/general/2026-10-10-cold-launch-v1-production-startup.md`

Removed rejected V2 files:

- `src/components/cold-launch/ColdLaunchPaperDeliveryPreview.tsx`
- `src/components/cold-launch/cold-launch-v2-theme.ts`
- `src/tests/critical/coldLaunchV2PaperDelivery.test.js`
- `docs/reports/general/2026-10-09-cold-launch-v2-paper-delivery.md`

## Theme and presentation

The shared presentation reuses `getPhotoHeroVars` from Onboarding V2. The five approved families and Light/Dark appearances remain available in preview. Production uses the deterministic Slate Navy family while startup is pending and reads the current root or system light/dark appearance without writing preferences. No global theme registry entry was added.

## Preserved contracts

- Official BX launcher artwork remains the center logo.
- Public brand text remains BOURXE.
- Tenant Tree topology, workspace labels, product-document labels, animated connection paths, Quick Tips, Replay, Connection Error, and Retry remain in preview.
- Production contains no preview controls.
- Production startup completion is still driven by existing readiness state, not animation timing.
- Production failure and retry behavior remains owned by existing app gates.
- Ordinary route transitions still use `PageLoader`.
- Onboarding V2 was not modified.

## Verification

Passed:

- `bun test src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `bun test src/tests/critical/coldLaunchProductionStartup.test.js`
- `bun test src/tests/critical/tenantGate.test.js`
- `bun test src/tests/critical/workspaceBootstrapDecision.test.js`
- `bun test src/tests/critical/moreNavigation.test.js`
- `bun test src/tests/critical/productionComposition.test.js`
- `bun test src/tests/critical/themeToggleExposure.test.js`
- `bun test src/tests/critical/themePrdContract.test.js`
- `bun run typecheck`
- `git diff --check`
- `git status --short`

Attempted:

- `bun test src/tests/critical/themePreferencePersistence.test.js` did not run because that file does not exist in this repository. Theme preference mutation is covered statically by `coldLaunchProductionStartup.test.js` and by the existing theme tests listed above.

Not run:

- `bun run build`. It is prohibited on this host.
- `bun run audit:load`. No schema, query, or data-layer logic changed.

Working tree note:

- Pre-existing or concurrent dirty files remain outside this scope, including `AGENTS.md`, `README.md`, `PhotoHeroPreview.tsx`, Onboarding V2 files/tests/reports, and app-update wording changes in `UpdateBanner.tsx`, `UpdateGate.tsx`, and `UpdateSheet.tsx`. They were not reverted.

## Limitations

No browser or device rendering inspection is claimed in this report. Visual acceptance and WCAG contrast are not claimed from source inspection alone.
