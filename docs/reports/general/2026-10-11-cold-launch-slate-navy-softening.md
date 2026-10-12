# Cold Launch Slate Navy Softening Report

This report was written by Codex on 2026-10-11 via Codex desktop.

## Objective

Refine the Cold Launch V1 Slate Navy appearance so that it feels softer and closer to the approved Onboarding V2 Navy/Dark atmosphere.

This was a presentation-only change.

## Scope

The change is scoped to the Cold Launch Tenant Tree presentation and focused static coverage.

Pre-existing dirty files were present before this task:

- `src/App.tsx`
- `src/components/app/AppShell.tsx`
- `src/components/app/PageLoader.tsx`
- `src/tests/critical/coldLaunchProductionStartup.test.js`
- `docs/reports/general/2026-10-11-cold-launch-white-screen-handoff.md`

Those files were not intentionally edited by this task.

## Files changed

- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
- `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `docs/reports/general/2026-10-11-cold-launch-slate-navy-softening.md`

## Skills used

Skills used: frontend-design, react-dev, review-animations, accessibility, safe-area-handling, typescript-advanced-types, karpathy, superpowers:verification-before-completion

Documentation standard: ASD-STE100 Simplified Technical English

## Original theme discrepancy

Cold Launch already used Onboarding V2 theme variables, but it applied one generic dark overlay recipe to all dark families.

For Slate Navy/Dark, this made the screen heavier than Onboarding V2:

- The lower shade pushed toward near-black.
- The grid lines were more visible.
- Node glass and strokes were more technical and outlined.
- The central brand glow felt denser than the softer Onboarding V2 light field.

## Onboarding V2 materials referenced

The refinement uses the actual Onboarding V2 Slate Navy recipe from `src/components/onboarding/photo-hero-v2-theme.ts`:

- `linear-gradient(165deg,#16283f 0%,#1e3a5f 44%,#3b5c82 78%,#7d97b4 100%)`
- `#60a5fa`
- `#93c5fd`
- `#fbbf24`
- `#0b1524`
- `#13233a`
- `rgba(15,23,42,.5)`
- `rgba(148,163,184,.22)`

The Onboarding V2 source file was not modified.

## Changes made

Added `data-family={family}` to the Cold Launch root element.

Added Slate Navy-only CSS selectors:

- `.clp[data-family="slate-navy"][data-appearance="dark"]`
- `.clp[data-family="slate-navy"][data-appearance="dark"]::before`
- `.clp[data-family="slate-navy"][data-appearance="dark"]::after`
- `.clp[data-family="slate-navy"][data-appearance="light"]`
- `.clp[data-family="slate-navy"][data-appearance="light"]::after`

Dark Slate Navy now uses:

- A softer Onboarding V2 diagonal slate-blue gradient.
- More diffused blue radial fields.
- A restrained amber accent field.
- A lighter bottom shade.
- Subdued grid lines.
- Softer glass borders and node shadows.
- A softer BX logo aura.

Light Slate Navy received a small scoped adjustment for coherent line and grid softness.

## Preserved behavior

The task did not change:

- Tenant Tree geometry.
- Node coordinates.
- Workspace and document labels.
- BX logo asset.
- Quick Tips content or rotation.
- Startup state ownership.
- TenantGate.
- Provisioning.
- Authentication.
- PageLoader handoff behavior.
- Onboarding V2.
- Other Cold Launch theme families.

The production signal-travel restriction remains in place.

The one-shot reveal rules remain in place:

- `clp-ring-in`
- `clp-draw`
- `clp-pop`

## Verification result

Verification:

- `bun run typecheck`: passed.
- `bun test src/tests/critical/coldLaunchPreviewAtmosphere.test.js`: passed. 5 tests passed.
- `bun test src/tests/critical/coldLaunchProductionStartup.test.js`: passed. 16 tests passed.
- `bun test src/tests/critical/productionComposition.test.js`: passed. 6 tests passed.
- `bun test src/tests/critical/tenantGate.test.js`: passed. 12 tests passed.
- `git diff --check`: passed.
- `git status --short`: completed. The working tree still contains pre-existing startup files from the prior task plus the files changed by this task.
- `bun run audit:load`: not run. The user prohibited it for this task.
- `bun run build`: not run. The hardware policy prohibits it.

## Supabase push status

Not applicable. No schema, query, or data-layer logic changed.

## Risks or limitations

No browser or device rendering was performed during this task.

The result is statically verified only. Mobile visual acceptance still needs a real device or browser check.

The working tree contains pre-existing startup handoff changes from a prior task. They remain outside this task's scope.

## Deferred work

Validate the Slate Navy/Dark appearance on:

- Narrow Android phone.
- Fold outer display.
- Fold inner display.
- Tablet.
- Desktop.

Check that the softer grid and glass treatment read correctly after browser rendering.
