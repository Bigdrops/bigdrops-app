# Design Lab More Options Report

This report was written by Codex on 2026-10-11 via Codex desktop.

## Objective

Add a permanent Design Lab under More Options.

Retire the Cold Launch preview route and keep production Cold Launch unchanged.

## Scope

The change affects app navigation, route registration, the new Design Lab page, and focused regression tests.

The production Cold Launch startup presentation remains in `src/App.tsx`.

## Files changed

- `src/components/app/AppShell.tsx`
- `src/components/Layout.tsx`
- `src/components/layout/navData.ts`
- `src/pages/MoreOptions.tsx`
- `src/pages/DesignLab.tsx`
- `src/lib/designLabPreviews.ts`
- `src/pages/ColdLaunchPreview.tsx`
- `src/components/cold-launch/PreviewTree.tsx`
- `src/components/cold-launch/preview-tree-geometry.ts`
- `src/tests/critical/moreNavigation.test.js`
- `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `src/tests/critical/coldLaunchProductionStartup.test.js`

## Skills used

Skills used: frontend-design, react-dev, mobile-app-ui-design, accessibility, safe-area-handling, typescript-advanced-types, karpathy, verification-before-completion

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added `/design-lab` as an authenticated app route.
- Added `DesignLab` as a reusable testing workspace page.
- Added `DESIGN_LAB_PREVIEWS` as a typed preview registry.
- Registered `Onboarding V2` as the first Design Lab entry.
- Kept `/photohero-preview` as the existing Onboarding V2 preview route.
- Replaced the More Options preview links with one `Design Lab` link.
- Replaced mobile drawer and desktop More navigation preview entries with `Design Lab`.
- Removed the `/cold-launch-preview` route.
- Deleted `src/pages/ColdLaunchPreview.tsx`.
- Kept `ColdLaunchTenantTreePresentation`, `PreviewTree`, Quick Tips, and production startup wiring.
- Updated focused tests to assert the new route and the retired Cold Launch preview route.

## Production preservation evidence

- `src/App.tsx` still renders `ColdLaunchTenantTreePresentation` during startup.
- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx` remains in place.
- `src/components/cold-launch/PreviewTree.tsx` remains in place because production uses it through the presentation component.
- No authentication, tenant, Supabase, provisioning, or startup readiness code was changed for this task.

## Verification result

- `bun run typecheck`: passed.
- `bun test src/tests/critical/moreNavigation.test.js src/tests/critical/photoHeroV2LightMode.test.js src/tests/critical/coldLaunchProductionStartup.test.js src/tests/critical/coldLaunchPreviewAtmosphere.test.js`: passed, 41 tests.
- `bun test src/tests/critical/productionComposition.test.js`: passed, 6 tests.
- `bun run build`: not run. It is prohibited by the hardware policy.

## Supabase push status

Not applicable. No schema, query, or data-layer logic changed.

## Risks or limitations

- Browser and device rendering were not executed.
- The working tree had pre-existing changes before this task:
  - `src/App.tsx`
  - `src/components/app/AppShell.tsx`
  - `src/components/app/PageLoader.tsx`
  - `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
  - `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
  - `src/tests/critical/coldLaunchProductionStartup.test.js`
  - `docs/reports/general/2026-10-11-cold-launch-slate-navy-grid-removal.md`
  - `docs/reports/general/2026-10-11-cold-launch-slate-navy-softening.md`
  - `docs/reports/general/2026-10-11-cold-launch-white-screen-handoff.md`

## Deferred work

- Add future previews by appending entries to `DESIGN_LAB_PREVIEWS`.
