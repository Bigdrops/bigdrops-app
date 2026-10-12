# Cold Launch White Screen Handoff Repair

This report was written by Codex on 2026-10-11 via Codex desktop.

Skills used: superpowers:systematic-debugging, react-dev, typescript-advanced-types, frontend-design, review-animations, accessibility, safe-area-handling, superpowers:verification-before-completion, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Remove the blank white startup screen that appeared after Cold Launch V1.

## Scope

This task changed startup presentation only.

No authentication logic, tenant authorization, provisioning rules, Supabase queries, schema files, dashboard UI, Onboarding V2, or Cold Launch V1 tree animation logic was changed.

## Identified Owner

The white screen was `src/components/app/PageLoader.tsx`.

Evidence:

- It rendered a full-screen `bg-background` wrapper.
- It rendered one empty `h-14 w-14 rounded-[18px]` square.
- It had no logo, no Quick Tips, and no startup atmosphere.

Rendering paths:

- `src/App.tsx` top-level `Suspense` fallback.
- `src/App.tsx` offline/profile fallback branches.
- `src/components/app/AppShell.tsx` route-level lazy page fallback.

The AppShell fallback matched the reported final handoff risk. It can appear after tenant readiness completes and before the first destination route module resolves.

## Decision

The loader was not deleted.

The safer repair was to add a startup-only PageLoader mode and use it only for startup handoff boundaries.

Reason:

- The fallback has a real function during lazy module loading.
- Removing it would require a broader route-readiness mechanism.
- A broad mechanism could affect normal route transitions.

## Changes Made

### `src/components/app/PageLoader.tsx`

- Added `variant="startup"`.
- Added a branded startup fallback surface.
- Reused `BxLogo` from `src/components/layout/bx-logo.tsx`.
- Reused `useLoadingTip` for Quick Tips.
- Reused `getPhotoHeroVars` from Onboarding V2 theme architecture.
- Added safe-area-aware layout.
- Kept the default lightweight loader unchanged.
- Added no spinner, progress bar, percentage, or artificial loading state.

### `src/App.tsx`

- Changed startup-level `PageLoader` usages to `variant="startup"`.
- Kept Cold Launch V1 ownership and passive provisioning overlay logic unchanged.

### `src/components/app/AppShell.tsx`

- Added `InitialRouteReadyMarker`.
- Used `variant="startup"` only until the first real route content commits.
- After first content commit, normal route-level lazy loading uses the existing default loader.

### `src/tests/critical/coldLaunchProductionStartup.test.js`

- Added regression checks for the startup PageLoader.
- Verified the fallback includes the BX logo and Quick Tips.
- Verified the startup fallback is scoped to the first route handoff.
- Preserved checks for one-shot tree animation and disabled production signal travel.

## Startup Lifecycle Impact

Before:

Cold Launch could exit, then AppShell or route Suspense could show the blank PageLoader.

After:

Cold Launch exits only when the existing readiness path permits it. If a first destination module is still loading, the user sees a themed BX-logo startup fallback with Quick Tips instead of a blank white screen.

Ordinary post-startup route loading keeps the existing lightweight loader after the first route content has rendered.

## Verification

- `bun run typecheck`: passed.
- `bun test src/tests/critical/coldLaunchProductionStartup.test.js`: passed, 16 tests.
- `bun test src/tests/critical/coldLaunchPreviewAtmosphere.test.js`: passed, 4 tests.
- `bun test src/tests/critical/tenantGate.test.js`: passed, 12 tests.
- `bun test src/tests/critical/productionComposition.test.js`: passed, 6 tests.
- `git diff --check`: passed.
- `git status --short`: scoped changes only.
- `bun run build`: not run. Hardware policy prohibits it.

## Supabase Push Status

Not applicable. No schema, query, migration, or data-layer logic was changed.

## Risks And Limitations

- No browser or mobile-device rendering was performed in this pass.
- The themed fallback uses Slate Navy atmospheric tokens when no user theme family is available at fallback time.
- Visual acceptance on the user's Android Chrome device still needs manual confirmation.

## Deferred Work

- Capture mobile, fold, and desktop screenshots after the next device run.
- If product wants exact persisted family matching before AppShell applies preferences, add a small read-only preference handoff later. Do not add it without a separate task because it touches theme timing.
