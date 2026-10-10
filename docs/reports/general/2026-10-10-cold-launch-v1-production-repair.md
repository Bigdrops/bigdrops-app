# Cold Launch V1 Production Repair

Date: 2026-10-10

## Summary

The approved Cold Launch V1 Tenant Tree remains the production startup presentation. This repair fixes the missing tree, blank Quick Tip body, and competing startup loading presentation without changing authentication, tenant readiness, routing, Supabase access, or ordinary route loading.

## Root Causes

- Tree disappearance: production had two startup presentation owners. `App.tsx` rendered Cold Launch during auth/profile/offline loading, then `TenantGate.tsx` rendered another full-screen Cold Launch during tenant/entity loading. The second mount restarted the reveal from its intentional blank first frames, so the logo and atmosphere could remain while nodes and paths were invisible.
- Blank Quick Tips: the tip hook can return `null` on the first render while its guidance slot activates. The presentation had fallback text, but the tip body also faded from `opacity: 0`. Repeated startup remounts exposed that transparent interval.
- Competing presentation: confirmed. `TenantGate.tsx` owned a second loading presentation. It now reports tenant loading state to `App.tsx`; the app renders one shared Cold Launch instance for the whole startup interval.

## Files Changed

- `src/App.tsx`
  - Replaced old local splash state with derived `showColdLaunch`.
  - Included auth loading, profile loading, offline loading, profile-resolution waiting, and tenant-gate loading.
  - Passed `onLoadingChange` to `TenantGate`.
- `src/components/app/TenantGate.tsx`
  - Removed its full-screen loading presentation.
  - Added a presentation-only loading callback.
  - Preserved tenant phase resolution and all error/retry paths.
- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
  - Kept base tree rings, edges, and nodes visible when animation is absent or interrupted.
  - Kept one-shot reveal final states intact.
  - Prevented Quick Tip text from animating through a blank opacity state.
  - Added trimmed fallback text for invalid or initially unavailable tip content.
- `src/tests/critical/coldLaunchProductionStartup.test.js`
  - Updated production startup assertions for the single-owner loading contract.
  - Added checks for persistent tree geometry and non-blank Quick Tips.

## Animation Lifecycle

Before:

- App Cold Launch could unmount when auth/profile/offline loading finished.
- TenantGate could mount a second Cold Launch during workspace/entity loading.
- Reveal animation restarted from hidden node/path keyframes.
- Tip text could be transparent during its fade-in.

After:

- App owns the single production Cold Launch presentation.
- TenantGate remains the readiness authority but only reports loading state.
- Tree reveal still establishes once per mount and holds visible final geometry.
- Ambient signal and node glow animation may continue.
- Tip text remains visible during initial selection and rotation.

## Preserved Contracts

- Authentication and session restoration remain unchanged.
- Tenant and workspace readiness remain governed by `resolveGatePhase`.
- TenantGate error, retry, provisioning, selection, creation, invitation, approval, blocked, and unavailable paths remain intact.
- Ordinary route lazy loading still uses `PageLoader`.
- Preview controls remain isolated to `/cold-launch-preview`.
- No artificial startup delay, fake progress, generic spinner, schema change, or data-layer change was added.

## Verification

- `bun run typecheck`: passed.
- `bun test src/tests/critical/coldLaunchProductionStartup.test.js src/tests/critical/coldLaunchPreviewAtmosphere.test.js src/tests/critical/tenantGate.test.js src/tests/critical/productionComposition.test.js`: passed, 29 tests.
- `git diff --check`: passed with line-ending warnings only.
- `git status --short`: reviewed after changes.

## Limitations

No browser or device render was inspected during this repair, so visual acceptance is based on source-level cause analysis and focused static regression tests only.
