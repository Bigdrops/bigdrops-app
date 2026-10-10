# Cold Launch V1 Forensic Audit

This report was written by Codex on 2026-10-10 via Codex desktop.

Skills used: superpowers:systematic-debugging, react-dev, typescript-advanced-types, review-animations, superpowers:verification-before-completion, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Find the source-level causes of two reported runtime defects in the approved Cold Launch V1 Tenant Tree.

- Defect 1: the Tenant Tree repeatedly shoots outward and retracts.
- Defect 2: the user still sees a TenantGate-related loading presentation.

This was a zero-code forensic audit. No application source, test, CSS, config, or existing report was changed.

## Scope

Inspected source paths:

- `src/App.tsx`
- `src/components/app/TenantGate.tsx`
- `src/components/app/BiometricGate.tsx`
- `src/components/app/PageLoader.tsx`
- `src/components/app/AppShell.tsx`
- `src/components/loading/LoadingTips.tsx`
- `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`
- `src/components/cold-launch/PreviewTree.tsx`
- `src/components/cold-launch/preview-tree-geometry.ts`
- `src/pages/ColdLaunchPreview.tsx`
- `src/pages/ProvisioningProgress.tsx`
- `src/pages/WorkspacePendingApproval.tsx`
- `src/domain/tenant/tenantGate.ts`
- `src/hooks/useLoadingTip.ts`
- `src/tests/critical/coldLaunchProductionStartup.test.js`
- `src/tests/critical/coldLaunchPreviewAtmosphere.test.js`
- `src/tests/critical/tenantGate.test.js`
- prior reports under `docs/reports/general/`

## Executive Finding

Defect 1 has a proven source-level motion cause and a possible lifecycle cause.

- Proven: the Tenant Tree renders one static edge path and one animated signal path on the same geometry. The animated signal path repeats forever and animates `stroke-dashoffset` from `1` to `-1`, with opacity returning to `0`. This can read as repeated branch motion on the same connections. Evidence: `src/components/cold-launch/PreviewTree.tsx:145-157`, `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:207-214`.
- Possible: the App can produce an intermediate render where `showColdLaunch` is false before `TenantGate` reports loading in a layout effect. That can unmount and remount the Cold Launch component and restart one-shot reveal animations. Evidence: `src/App.tsx:494-500`, `src/App.tsx:558-580`, `src/components/app/TenantGate.tsx:91-98`.
- Unverified: runtime frequency and visual timing on the user's device. This audit did not run the app or browser automation.

Defect 2 has proven remaining source-level paths for non-Cold-Launch loading or waiting presentations.

- `TenantGate` no longer renders `ColdLaunchTenantTreePresentation` in its `loading` phase. Evidence: `src/components/app/TenantGate.tsx:91-98`.
- But `TenantGate` still routes to full-screen waiting pages for non-ready tenant phases, including provisioning and pending approval. These pages use their own cards, spinners, animations, and `LoadingTips`. Evidence: `src/components/app/TenantGate.tsx:118-128`, `src/pages/ProvisioningProgress.tsx:38-86`, `src/pages/WorkspacePendingApproval.tsx:74-132`.
- `BiometricGate` can still render `PageLoader` plus `LoadingTips` before `TenantGate` mounts. Evidence: `src/App.tsx:558-573`, `src/components/app/BiometricGate.tsx:145-155`.
- `Suspense` boundaries still use `PageLoader`. Evidence: `src/App.tsx:536`, `src/components/app/AppShell.tsx:275`.

## Production Startup Ownership

### Current owner

`App.tsx` owns the production Cold Launch presentation.

Evidence:

- `src/App.tsx:13` imports `ColdLaunchTenantTreePresentation`.
- `src/App.tsx:494-500` derives `showColdLaunch` from:
  - `authLoading`
  - `profileLoading`
  - `offlineAccessLoading`
  - `waitingForProfileResolution`
  - `tenantGateLoading`
- `src/App.tsx:580` renders `<ColdLaunchTenantTreePresentation tipPathname="/" />` when `showColdLaunch` is true.

### TenantGate current behavior

`TenantGate` does not render Cold Launch in the `loading` phase.

Evidence:

- `src/components/app/TenantGate.tsx:91-94` calls `onLoadingChange?.(phase === 'loading')`.
- `src/components/app/TenantGate.tsx:96-98` returns `null` for `case 'loading'`.
- `src/components/app/TenantGate.tsx` has no import of `ColdLaunchTenantTreePresentation`.

### Remaining competing or adjacent presentation paths

| Path | Evidence | Presentation type | Startup risk |
| --- | --- | --- | --- |
| `BiometricGate` gated state | `src/components/app/BiometricGate.tsx:145-155` | `PageLoader` plus `LoadingTips` | Can appear before `TenantGate` mounts. `showColdLaunch` does not include biometric gated state. |
| App route suspense | `src/App.tsx:536` | `PageLoader` | Can show while a lazy route chunk loads. It is shared with non-startup route loading. |
| Unauthenticated offline check | `src/App.tsx:550-552` | `PageLoader` | Usually covered by `offlineAccessLoading`, but still a separate rendered child. |
| Profile resolution route branch | `src/App.tsx:553-554` | `PageLoader` | Covered by `waitingForProfileResolution`, but still a child fallback below overlay. |
| AppShell suspense | `src/components/app/AppShell.tsx:275-345` | `PageLoader` | Can appear after Cold Launch exits and route modules load. |
| Tenant provisioning | `src/components/app/TenantGate.tsx:124-125`, `src/pages/ProvisioningProgress.tsx:38-86` | Full-screen card, spinner, tips | This is not `phase === 'loading'`, but it is a TenantGate-owned startup/waiting screen. |
| Pending approval | `src/components/app/TenantGate.tsx:118-119`, `src/pages/WorkspacePendingApproval.tsx:74-132` | Full-screen card, animations, tips | This is a TenantGate-owned waiting room, not Cold Launch. |

## Tenant Tree Animation Inventory

| Element | Source file | Animation | Duration | Iteration | Direction | Fill mode | Animated properties | Retraction/reset risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ring circles `.clp-ring` | `PreviewTree.tsx:114-122`, CSS `ColdLaunchTenantTreePresentation.tsx:196-199` | `clp-ring-in` | `6s` | `1` default | `normal` default | `both` | `opacity: 0` to `.72` | Does not reverse. Resets on component remount or `clp-run` re-add. |
| Static edge paths `.clp-edge` | `PreviewTree.tsx:125-144`, CSS `ColdLaunchTenantTreePresentation.tsx:200-206` | `clp-draw` | `6.5s` | `1` default | `normal` default | `both` | `stroke-dasharray: 1`, `stroke-dashoffset: 1` to `0`, `opacity: 0` to `.78` | Does not reverse. Resets on component remount or `clp-run` re-add. |
| Signal paths `.clp-signal` | `PreviewTree.tsx:145-157`, CSS `ColdLaunchTenantTreePresentation.tsx:207-214` | `clp-signal-travel` | `5.8s` | `infinite` | `normal` default | `none` default | `stroke-dashoffset: 1` to `-1`, `opacity: 0` to `.9` to `0` | Proven repeated motion on the same connection geometry. Resets every loop. Can look like repeated outward travel and disappearance. |
| Node groups `.clp-node` | `PreviewTree.tsx:170-191`, CSS `ColdLaunchTenantTreePresentation.tsx:218-220` | `clp-pop` | `6s` | `1` default | `normal` default | `both` | `opacity: 0` to `1`, `translate(var(--fx), var(--fy)) scale(.92)` to `none` | Does not reverse. Resets on component remount or `clp-run` re-add. |
| Hot node pills `.clp-n-hot .clp-pill` | `PreviewTree.tsx:173-187`, CSS `ColdLaunchTenantTreePresentation.tsx:224-226` | `clp-node-wake` | `5.8s` | `infinite` | `normal` default | `none` default | `stroke-opacity`, `filter` | Ambient. Does not move geometry. |
| Error affected signal `.clp-affected-signal` | CSS `ColdLaunchTenantTreePresentation.tsx:232-233`, keyframe `241` | `clp-signal-fail` | `4.6s` | `infinite` | `normal` default | `none` default | `stroke-dashoffset`, `opacity` | Preview/error state only unless `networkState="error"` is passed. Production default is `normal`. |
| Retry recovery signal `.clp-recovery-signal` | `PreviewTree.tsx:158-166`, CSS `ColdLaunchTenantTreePresentation.tsx:238-242` | `clp-recovery-wave` | `2.2s` | `1` default | `normal` default | `both` | `stroke-dashoffset`, `opacity` | Preview/retrying state only unless `networkState="retrying"` is passed. Production default is `normal`. |
| Logo `.clp-logo` | CSS `ColdLaunchTenantTreePresentation.tsx:247-250` | `clp-idle` | `3.4s` | `infinite` | `normal` default | `none` default | `transform: scale(1)` to `1.025` | Ambient. Does not move tree geometry. |
| Tip text `.clp-tip-text` | `ColdLaunchTenantTreePresentation.tsx:39`, CSS `266-267` | `clp-tip-fade` | `.45s` | `1` default | `normal` default | `both` | `opacity: 1`, `translateY(4px)` to `none` | No blank opacity state. Repeats when the `key` changes. |
| Retry icon `.clp-retry svg` | CSS `ColdLaunchTenantTreePresentation.tsx:273-274` | `clp-retry-spin` | `.9s` | `infinite` | `normal` default | `none` default | `rotate(360deg)` | Preview/retrying state only. |
| `.clp-pulse` CSS | CSS `ColdLaunchTenantTreePresentation.tsx:215-217` | `clp-handoff` | `3s` | `infinite` | `normal` default | `none` default | `stroke-dashoffset`, `opacity` | No current JSX element uses `clp-pulse`. It is dead CSS unless a future element gets that class. |

## Root-Cause Analysis

### Confirmed mechanism A: Infinite signal paths create repeated branch motion

`PreviewTree` renders two paths for each edge:

- The static edge path uses classes `clp-edge` and `clp-edge-*`. Evidence: `src/components/cold-launch/PreviewTree.tsx:127-144`.
- The animated signal path uses classes `clp-signal` and `clp-signal-*`. Evidence: `src/components/cold-launch/PreviewTree.tsx:145-157`.

The signal path is animated forever:

```css
.clp-run .clp-signal{animation:clp-signal-travel 5.8s linear infinite}
@keyframes clp-signal-travel{0%{stroke-dashoffset:1;opacity:0}8%{opacity:.9}34%{opacity:.9}56%,100%{stroke-dashoffset:-1;opacity:0}}
```

Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:213-214`.

This does not retract the static edge path. But it does repeatedly move a visible stroke along the same connection geometry and then reset it to the start. On a mobile screen, this can read as the branch shooting outward and retracting or disappearing.

Why the previous fix failed:

- It changed base visibility for `.clp-ring`, `.clp-edge`, and `.clp-node`.
- It did not change `.clp-signal`.
- The previous test at `src/tests/critical/coldLaunchProductionStartup.test.js:99-100` only checks that `.clp-ring`, `.clp-edge`, and `.clp-node` do not have `infinite`. It does not inspect `.clp-signal`.

### Confirmed mechanism B: One-shot reveal still restarts on remount

The main geometry reveal is one-shot and uses `both` fill mode.

Evidence:

- Ring reveal: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:198-199`.
- Edge reveal: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:205-206`.
- Node reveal: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:219-220`.

These animations do not reverse by CSS direction. They can reset only if:

- the component remounts,
- the `clp-run` class is removed and re-added,
- or the browser restarts the animation due to style reinsertion.

`ColdLaunchTenantTreePresentation` inserts its CSS in a `<style>` element inside the component. Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:115-307`. A remount reinserts this style and restarts all `.clp-run` animations.

### Possible mechanism C: App can unmount Cold Launch before TenantGate reports loading

`showColdLaunch` depends on `tenantGateLoading`. Evidence: `src/App.tsx:494-500`.

`tenantGateLoading` changes only when `TenantGate` has mounted and its layout effect runs. Evidence: `src/components/app/TenantGate.tsx:91-94`.

The route branch mounts `TenantGate` only after session, profile, offline, and biometric gates allow it. Evidence: `src/App.tsx:547-573`.

Possible transition:

1. `authLoading`, `profileLoading`, `offlineAccessLoading`, and `waitingForProfileResolution` become false.
2. `tenantGateLoading` is still false because `TenantGate` has not run its layout effect yet.
3. `showColdLaunch` computes false in `App.tsx:494-500`.
4. Cold Launch is not rendered in `App.tsx:580`.
5. `TenantGate` layout effect runs and calls `onLoadingChange(true)` if the phase is `loading`.
6. App re-renders and mounts Cold Launch again.
7. The one-shot reveal animations restart from their initial frames.

This is a possible source-level remount path. The audit cannot prove how visible it is without runtime rendering.

### Unverified hypothesis D: Resize-driven graph rebuild can look like motion

`PreviewTree` measures its wrapper with `ResizeObserver`. Evidence: `src/components/cold-launch/PreviewTree.tsx:223-234`.

It rebuilds graph coordinates from current wrapper size. Evidence: `src/components/cold-launch/PreviewTree.tsx:236-245` and `src/components/cold-launch/preview-tree-geometry.ts:213-522`.

Viewport height changes from mobile browser chrome can change the wrapper height. That can change node positions. This does not reset CSS animations by itself because element keys are stable. But it can visually move established geometry.

This is a runtime hypothesis. It needs device rendering evidence.

## TenantGate Analysis

`TenantGate` no longer has a loading overlay for `phase === 'loading'`.

Evidence:

- `src/components/app/TenantGate.tsx:91-98` reports loading upward and returns `null`.

However, the cleanup did not eliminate all TenantGate-owned waiting screens. `resolveGatePhase` has non-ready phases beyond `loading`. Evidence: `src/domain/tenant/tenantGate.ts:137-149`.

Important TenantGate phases:

- `provisioning` is returned when provisioning status is `creating`, `pending`, or when schema exposure is false or null. Evidence: `src/domain/tenant/tenantGate.ts:218-229`.
- `pending-approval` is returned when there is a pending workspace and no usable workspace. Evidence: `src/domain/tenant/tenantGate.ts:198-210`.

`TenantGate` renders these as separate full-screen pages:

- `ProvisioningProgress` at `src/components/app/TenantGate.tsx:124-125`.
- `WorkspacePendingApproval` at `src/components/app/TenantGate.tsx:118-119`.

These pages contain their own loading or waiting presentation:

- `ProvisioningProgress` has a spinning `Loader2`, `provisionFloat`, `provisionPulse`, and `LoadingTips`. Evidence: `src/pages/ProvisioningProgress.tsx:40-86`.
- `WorkspacePendingApproval` has `approvalPulse`, `approvalSpin`, `approvalFloat`, and `LoadingTips`. Evidence: `src/pages/WorkspacePendingApproval.tsx:76-132`.

Therefore, the user can still see a TenantGate-related waiting presentation even after the `phase === 'loading'` branch was removed.

Why the previous cleanup did not eliminate it:

- The previous tests only checked `case 'loading': return null`. Evidence: `src/tests/critical/coldLaunchProductionStartup.test.js:40-45`.
- They did not assert that TenantGate non-ready phases avoid generic waiting/loading surfaces.
- They did not cover `ProvisioningProgress`, `WorkspacePendingApproval`, or `BiometricGate`.

## Preview and Production Differences

| Area | Preview | Production | Risk |
| --- | --- | --- | --- |
| Mount owner | `ColdLaunchPreview` route directly renders the presentation. Evidence: `src/pages/ColdLaunchPreview.tsx:89-197`. | `App.tsx` conditionally renders the presentation from `showColdLaunch`. Evidence: `src/App.tsx:494-580`. | Production can unmount/remount based on startup state. Preview usually stays mounted. |
| Replay | Preview toggles `isRunning` false and true using two animation frames. Evidence: `src/pages/ColdLaunchPreview.tsx:51-60`. | Production always uses default `isRunning=true`. Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:74`. | Preview explicitly tests animation restart. Production can restart only through remount or class/style reinsertion. |
| Theme | Preview passes explicit `family` and `appearance`. Evidence: `src/pages/ColdLaunchPreview.tsx:90-96`. | Production passes neither, so defaults are `family='slate-navy'` and ambient appearance from root/system. Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:69-85`. | Appearance changes can update vars without remount, but root theme timing can change visual style during startup. |
| Tip path | Preview passes `/cold-launch-preview`. Evidence: `src/pages/ColdLaunchPreview.tsx:96`. | Production passes `/`. Evidence: `src/App.tsx:580`. | Different context selection. Not a tree cause. |
| Connection feedback | Preview passes `showConnectionFeedback`, retry, and network controls. Evidence: `src/pages/ColdLaunchPreview.tsx:94-99`. | Production uses defaults: normal network, no connection feedback. Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:73-80`. | Error/retry animations should not appear in production unless props change. |
| Parent lifecycle | Preview is inside AppShell route suspense. Evidence: `src/components/app/AppShell.tsx:275-300`. | Production overlay sits outside BrowserRouter but inside AppUpdateProvider. Evidence: `src/App.tsx:521-580`. | Different remount triggers. |

## Previous Test Coverage Gap

The 29 reported focused tests did not establish runtime animation correctness.

Confirmed gaps:

- Tests are source-string tests. They do not render React, compute CSS, or observe animation timelines. Evidence: `src/tests/critical/coldLaunchProductionStartup.test.js:11-17`.
- The main startup test checks that `showColdLaunch` contains state names. Evidence: `src/tests/critical/coldLaunchProductionStartup.test.js:19-38`. It does not simulate state transitions.
- The TenantGate test checks pure `resolveGatePhase`. Evidence: `src/tests/critical/tenantGate.test.js:20-174`. It does not mount `TenantGate`.
- The "holds visible geometry" test excludes only `.clp-ring`, `.clp-edge`, and `.clp-node` infinite animations. Evidence: `src/tests/critical/coldLaunchProductionStartup.test.js:85-100`. It ignores `.clp-signal`, the repeated motion source.
- No test asserts that Cold Launch stays mounted across auth/profile to tenant loading.
- No test checks `BiometricGate` loading output.
- No test checks TenantGate non-ready pages such as `ProvisioningProgress` and `WorkspacePendingApproval`.
- No test uses fake timers or a CSS animation parser to detect repeated stroke-dashoffset animation on connection geometry.

Why green tests were possible:

- The tests verified that the intended strings existed.
- They did not verify actual component identity across lifecycle changes.
- They did not verify computed animation iteration counts for all connection-path layers.
- They did not inspect all TenantGate-controlled waiting screens.

## Quick Tips Secondary Check

Cold Launch Quick Tips now have fallback content:

- `tipMessage` uses `tip?.message?.trim() || 'Loading guidance...'`. Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:31-40`.
- `clp-tip-fade` keeps `opacity: 1` at `0%` and `100%`. Evidence: `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx:266-267`.

Remaining risks:

- `useLoadingTip` returns `null` until its activation effect runs. Evidence: `src/hooks/useLoadingTip.ts:152-162`, `src/hooks/useLoadingTip.ts:182-184`. Cold Launch covers this with fallback text.
- Shared `LoadingTips` still returns `null` when no tip exists. Evidence: `src/components/loading/LoadingTips.tsx:39-46`. This affects `BiometricGate`, `ProvisioningProgress`, and `WorkspacePendingApproval`, not the Cold Launch tip panel.

## Proposed Minimal Repair

Do not implement this in the audit pass. This is the implementation-ready plan for a later coding pass.

### `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`

1. Separate reveal motion from ambient connection motion.
2. For production default `variant="original"`, stop repeated connection-path travel after establish.
3. Keep static `.clp-edge` visible after `clp-draw`.
4. Remove or gate `.clp-run .clp-signal { animation: clp-signal-travel ... infinite }` behind an explicit preview/enhanced/ambient prop.
5. If ambient connection activity must remain, use a stationary opacity or glow modulation on already visible edges. Do not animate `stroke-dashoffset` on the main connection geometry.
6. Remove dead `.clp-pulse` CSS or keep it disabled until there is a real element and acceptance criterion.

### `src/App.tsx`

1. Replace derived `showColdLaunch` with a startup presentation state machine that cannot pass through false between auth/profile and tenant loading.
2. Treat "authenticated but tenant gate not yet reported" as still pending.
3. Include biometric-gated startup in the production Cold Launch ownership model, or explicitly document it as a separate security gate if product wants it separate.
4. Do not add a timer. Keep readiness authoritative.

### `src/components/app/TenantGate.tsx`

1. Keep `case 'loading': return null`.
2. Add explicit phase reporting if App must own all non-ready startup visuals.
3. Decide whether `provisioning`, `pending-approval`, and `create-company` are startup waiting screens or destination screens. The current code treats them as destination screens.

### `src/components/app/BiometricGate.tsx`

1. If the product requirement is one startup presentation until app access is ready, report gated biometric state to App.
2. Replace `PageLoader` plus `LoadingTips` during cold launch with the same Cold Launch presentation, or delay mounting `BiometricGate` children until App owns the display.
3. Preserve biometric auth behavior.

### `src/pages/ProvisioningProgress.tsx` and `src/pages/WorkspacePendingApproval.tsx`

1. Decide if these are startup waiting screens or user-action destination screens.
2. If they are startup waiting screens, route them through the single Cold Launch presentation.
3. If they are destination screens, update acceptance language so users can expect separate tenant state pages.

## Regression Test Plan

Do not write these tests in this audit pass.

Needed tests:

1. Render-level App startup transition test:
   - Simulate auth/profile loading true.
   - Resolve auth/profile.
   - Simulate TenantGate `phase === 'loading'`.
   - Assert the same Cold Launch instance remains mounted.

2. TenantGate phase ownership test:
   - Assert `loading` returns no UI.
   - Assert whether `provisioning` and `pending-approval` are expected destination screens or must be coordinated with App.

3. Animation CSS inventory test:
   - Parse `ColdLaunchTenantTreePresentation` styles.
   - Assert no production connection-path class with `pathLength={1}` has an infinite `stroke-dashoffset` animation unless explicitly approved.

4. Signal path test:
   - Assert `.clp-signal` is not active in production default, or assert it uses non-geometric properties only.

5. BiometricGate startup test:
   - Simulate `enabled=true`, native platform, and gated state.
   - Assert the expected production startup presentation contract.

6. Shared `LoadingTips` test:
   - Assert fallback behavior or acceptable null behavior for non-Cold-Launch loading surfaces.

7. Browser/device visual test:
   - Use a mobile viewport.
   - Record at least 12 seconds.
   - Confirm static tree geometry remains visible while allowed ambient effects continue.

## Risks and Unresolved Questions

- The audit did not run the app, browser, or device. Runtime visibility and frame timing remain unverified.
- The exact screen the user calls "TenantGate-related loading presentation" cannot be uniquely identified from source alone. Candidate paths are `BiometricGate`, `ProvisioningProgress`, `WorkspacePendingApproval`, and `PageLoader` under Suspense.
- The current acceptance language says "one production Cold Launch presentation", but the code still treats some tenant phases as destination screens. Product must decide whether provisioning and pending approval are part of startup or part of post-startup tenant state.
- The infinite signal path is confirmed. Whether it is the exact visual the user calls "retraction" requires runtime inspection.

## Git Scope Verification

Initial `git status --short` before investigation:

```text
 M AGENTS.md
MM README.md
 M "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md"
 M src/App.tsx
 D src/components/app/SplashOverlay.tsx
 M src/components/app/TenantGate.tsx
 M src/components/app/UpdateBanner.tsx
 M src/components/app/UpdateGate.tsx
 M src/components/app/UpdateSheet.tsx
 M src/index.css
 M src/pages/ColdLaunchPreview.tsx
 M src/pages/PhotoHeroPreview.tsx
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-slate-amber-glass-candidate.html"
?? docs/reports/general/2026-10-09-cold-launch-atmospheric-rescue.md
?? docs/reports/general/2026-10-09-onboarding-v2-light-mode-atmospheric-system.md
?? docs/reports/general/2026-10-10-cold-launch-v1-production-repair.md
?? docs/reports/general/2026-10-10-cold-launch-v1-production-startup.md
?? src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx
?? src/components/onboarding/
?? src/tests/critical/coldLaunchPreviewAtmosphere.test.js
?? src/tests/critical/coldLaunchProductionStartup.test.js
?? src/tests/critical/photoHeroV2LightMode.test.js
```

Final `git status --short` after report creation:

```text
 M AGENTS.md
MM README.md
 M "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md"
 M src/App.tsx
 D src/components/app/SplashOverlay.tsx
 M src/components/app/TenantGate.tsx
 M src/components/app/UpdateBanner.tsx
 M src/components/app/UpdateGate.tsx
 M src/components/app/UpdateSheet.tsx
 M src/index.css
 M src/pages/ColdLaunchPreview.tsx
 M src/pages/PhotoHeroPreview.tsx
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/themes/mobile-dashboard-slate-amber-glass-candidate.html"
?? docs/reports/general/2026-10-09-cold-launch-atmospheric-rescue.md
?? docs/reports/general/2026-10-09-onboarding-v2-light-mode-atmospheric-system.md
?? docs/reports/general/2026-10-10-cold-launch-v1-forensic-audit.md
?? docs/reports/general/2026-10-10-cold-launch-v1-production-repair.md
?? docs/reports/general/2026-10-10-cold-launch-v1-production-startup.md
?? src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx
?? src/components/onboarding/
?? src/tests/critical/coldLaunchPreviewAtmosphere.test.js
?? src/tests/critical/coldLaunchProductionStartup.test.js
?? src/tests/critical/photoHeroV2LightMode.test.js
```

Authorized change:

- Created this new Markdown report only.

Commands intentionally not run:

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run audit:load`
- `bun test`
- application runtime or browser automation

Supabase push status: not applicable. No schema, query, migration, or data-layer file was changed.
