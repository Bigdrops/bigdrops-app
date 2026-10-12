# Cold Launch Slate Navy Grid Removal Report

This report was written by Codex on 2026-10-11 via Codex desktop.

## Objective

Remove the decorative technical grid from the Cold Launch V1 Slate Navy presentation.

Preserve the functional Tenant Tree connections and startup behavior.

## Scope

This task corrected the failed Slate Navy softening pass.

Pre-existing dirty files were present before this task:

- `src/App.tsx`
- `src/components/app/AppShell.tsx`
- `src/components/app/PageLoader.tsx`
- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
- `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `src/tests/critical/coldLaunchProductionStartup.test.js`
- `docs/reports/general/2026-10-11-cold-launch-slate-navy-softening.md`
- `docs/reports/general/2026-10-11-cold-launch-white-screen-handoff.md`

This task only changed the Cold Launch Slate Navy grid removal, the startup PageLoader grid removal, focused tests, and this report.

## Files changed

- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
- `src/components/app/PageLoader.tsx`
- `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `src/tests/critical/coldLaunchProductionStartup.test.js`
- `docs/reports/general/2026-10-11-cold-launch-slate-navy-grid-removal.md`

## Skills used

Skills used: superpowers:systematic-debugging, frontend-design, react-dev, review-animations, accessibility, safe-area-handling, typescript-advanced-types, karpathy, superpowers:verification-before-completion

Documentation standard: ASD-STE100 Simplified Technical English

## Actual production background owner

`src/App.tsx` mounts:

- `ColdLaunchTenantTreePresentation` for the production Cold Launch overlay.

`ColdLaunchTenantTreePresentation` owns the visible Cold Launch background:

- Root element: `.clp`
- Atmospheric layer: `.clp::before`
- Vignette and decorative grid layer: `.clp::after`

`src/pages/ColdLaunchPreview.tsx` uses the same `ColdLaunchTenantTreePresentation` component. Therefore, production and preview share the same corrected source.

The startup handoff fallback uses `PageLoader variant="startup"`. Its startup-only visual owner is:

- `.bd-startup-loader`
- `.bd-startup-loader::before`

## Exact grid source

The decorative grid came from 1px tiled CSS gradients.

Cold Launch base grid:

- `.clp::after`
- `linear-gradient(... 1px, transparent 1px)`
- `linear-gradient(90deg, ... 1px, transparent 1px)`
- `background-size:auto,34px 34px,34px 34px`

The failed Slate Navy pass also added the same grid mechanism to:

- `.clp[data-family="slate-navy"][data-appearance="dark"]::after`
- `.clp[data-family="slate-navy"][data-appearance="light"]::after`

The startup PageLoader fallback had the same pattern in:

- `.bd-startup-loader::before`

## Why the previous softening was ineffective

The previous pass did not remove the grid.

It replaced the Slate Navy grid with lower-opacity 1px tiled gradients:

- `rgba(147,197,253,.055) 1px, transparent 1px`
- `rgba(147,197,253,.045) 1px, transparent 1px`
- `34px 34px`

That still rendered visible repeating horizontal and vertical lines.

## CSS changes

Cold Launch Slate Navy now keeps only a smooth vignette overlay in Slate Navy:

- Dark Slate Navy `.clp::after` override uses one non-tiled linear gradient.
- Light Slate Navy `.clp::after` override uses one non-tiled linear gradient.
- Both overrides use `background-size:auto`.
- Neither override contains `1px` grid gradients.
- Neither override contains `34px 34px` tiling.

The generic `.clp::after` grid remains available for non-Slate families only.

The startup PageLoader fallback now removes its tiled grid layer:

- `.bd-startup-loader::before` keeps `var(--vignette)`.
- It no longer contains 1px grid gradients.
- It no longer contains 34px background tiling.

## Production and preview parity

Production and preview both use `ColdLaunchTenantTreePresentation`.

The Slate Navy grid removal is in that shared presentation component.

The preview controls remain unchanged.

## Theme-family isolation

The removal is scoped to:

- `data-family="slate-navy"`
- `data-appearance="dark"`
- `data-appearance="light"`

The base grid rules were not removed for Amber Terracotta, Ocean Teal, Rose Gold, or Forest Green.

Onboarding V2 was not modified.

## Preserved behavior

The task did not change:

- Tenant Tree geometry.
- SVG connection paths.
- Workspace nodes.
- Document nodes.
- BX logo.
- BOURXE wordmark.
- Quick Tips.
- Tip rotation.
- Startup lifecycle.
- TenantGate.
- Provisioning.
- Biometric behavior.
- Route readiness.
- One-shot `clp-ring-in`.
- One-shot `clp-draw`.
- One-shot `clp-pop`.
- Production restriction on infinite signal travel.

Functional tree connections remain present through `.clp-edge` rules.

## Verification result

Verification:

- `bun run typecheck`: passed.
- `bun test src/tests/critical/coldLaunchPreviewAtmosphere.test.js`: passed. 6 tests passed.
- `bun test src/tests/critical/coldLaunchProductionStartup.test.js`: passed. 18 tests passed.
- `bun test src/tests/critical/productionComposition.test.js`: passed. 6 tests passed.
- `bun test src/tests/critical/tenantGate.test.js`: passed. 12 tests passed.
- Static search confirmed that Slate Navy `::after` blocks no longer contain 1px grid lines or 34px tiling.
- Static search confirmed that `.clp-edge` connection rules remain.
- `git diff --check`: passed.
- `git status --short`: completed. The working tree still contains pre-existing startup files and reports from prior tasks plus this task's report.
- `bun run audit:load`: not run. The user prohibited it for this task.
- `bun run build`: not run. The hardware policy prohibits it.

## Supabase push status

Not applicable. No schema, query, or data-layer logic changed.

## Risks or limitations

No browser or device rendering was performed.

The change is statically verified. Mobile visual acceptance still needs runtime inspection on the target device.

The working tree includes pre-existing startup handoff work from prior tasks.

## Deferred work

Inspect the production Cold Launch on mobile Chrome to confirm that no Slate Navy background grid is visible.
