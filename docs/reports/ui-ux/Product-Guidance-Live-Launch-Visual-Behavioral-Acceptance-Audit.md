# Product Guidance Live Launch Visual and Behavioral Acceptance Audit

This report was written by Muse Spark on 2026-09-12 via OpenCode.

## Verdict

CONDITIONALLY ACCEPTED. The implementation passes with 4 minimal fixes made in this audit. No redesign. No unrelated changes.

## Objective

Prove the implemented Product Guidance system anchors correctly to the two live launch journeys, keeps onboarding tip-free, and holds one design language across phone, foldable, tablet, and desktop.

## Scope

Audited states:

- New-user: splash, profile load, workspace load, provisioning, provisioning failure, recoverable errors, network loss, reconnect, extended loading, approval waiting.
- Established-user: session restore, biometric background, profile load, workspace load, tenant gate, extended loading, offline access, blocked offline, recoverable errors, reconnect.
- Guidance: single engine, history survival, determinism, context routing, error subordination, focus safety, no navigation, inactivity safety, reduced motion, restraint.
- Connectivity: extended loading, disconnected, offline available, offline blocked, reconnecting, restored, failed despite connectivity.
- Responsive: phone 320px class, short phones, folded and unfolded foldable, tablet, desktop.
- Onboarding boundary: no tips in the onboarding manuscript.

## Skills Used

Skills used: mobile-app-ui-design, mobile-android-design, animate, accessibility, html-wireframe
Documentation standard: ASD-STE100 Simplified Technical English

Note: mobile-android-design served platform behavior only (targets, adaptive behavior, screen-reader rules). No Material 3 visual styling entered the implementation.

## Findings

### PASS areas (no change)

- One `GuidanceEngine` serves splash, TenantGate loading, export loading, gate errors, and provisioning failure. Verified by consumer trace.
- Selection is deterministic. No random calls exist in the guidance path.
- History survives remounts. Slots release on unmount. Exposure records persist.
- Errors stay primary. Recovery guidance renders beneath the card at level 4 with no focusable controls. Retry keeps DOM and focus order.
- Offline semantics unchanged. The 48-hour window copy and expiry logic are untouched.
- Guidance never navigates, never writes form state, never steals focus. Live regions use polite, never assertive.
- Onboarding is tip-free. No guidance imports exist in login, workspace creation, company creation, or onboarding references. The onboarding manuscript keeps its own storytelling.
- Theme tokens only. No wireframe hex values. No second visual language.
- CompanyCreation inline spinners are Level 1 to 2. No tips there is correct per the loading standard.

### FAIL areas (fixed, minimal)

1. Slow and reconnecting states were unreachable. The status resolver defined them, but the hook produced only online and offline. Prolonged waits never transitioned. Reconnects never acknowledged recovery.
2. ProvisioningProgress had no guidance slot. The gate-held provisioning wait (3-second poll, can run long) showed no tips.
3. WorkspacePendingApproval had no guidance slot. The approval waiting room (5-second poll, minutes of waiting) showed no tips.
4. BiometricGate rendered a bare loader. The biometric background had no guidance.
5. The inactivity banner could overlap the phone FAB zone (banner base 78px, FAB at 94px).

## Fixes Made

- `guidanceEngine.ts`: added pure `resolveEffectiveConnectivity` plus slot start-time tracking and a `slotConnectivity` read. Slow reflects elapsed waiting only. It never diagnoses the network.
- `useLoadingTip.ts`: effective connectivity drives status and slot context. Offline to online latches an 8-second reconnecting window. A 1-second ticker runs only while active. No setState sits in effect bodies.
- `ProvisioningProgress.tsx`, `WorkspacePendingApproval.tsx`: in-flow shared `LoadingTips` slots. Same rotation, same history.
- `BiometricGate.tsx`: shared `LoadingTips` inside the existing loader. Native sheet behavior unchanged.
- `GuidanceTip.tsx`: phone banner offset moved above the FAB zone. Desktop offset unchanged.
- `guidanceEngine.test.js`: added effective-connectivity cases (offline, reconnecting, window expiry, slow, idle).

## Verification Result

- Targeted tests (guidance plus tenant gate): 19 pass, 0 fail.
- ESLint on all touched files: 0 errors.
- `bun run typecheck`: task files clean. Pre-existing errors remain in `src/domain/tax/` (another agent's uncommitted work, present before this audit). Untouched per concurrency rules.
- `bun run audit:load`: skipped. No schema, query, or data-layer logic changed.
- `bun run build`: never run. Banned by task and hardware policy.
- `git status`: only audit-scoped files changed. No pre-existing work reverted. No unrelated files modified.

## Explicit Answers

- One engine serves both journeys: yes. Verified by trace.
- Onboarding tip-free: yes. Verified by import trace and manuscript check.
- Guidance survives sequential gates: yes. Singleton history, slot release without reset.
- Errors still primary: yes. Dominant position, focus order, subordinate styling.
- Bad internet as distinct states: yes, after fix. Offline, reconnecting, slow, restored, and failed states differ in copy and tip routing.
- Reconnect preserves experience: yes. Latch acknowledges recovery. No forced reloads. History intact.
- Inactivity workflow-safe: yes. Caps, cooldowns, focus-aware thresholds, Passive ceiling, no navigation, no state writes.
- Responsive across tiers: yes by construction. In-flow slots adapt with parents. Fixed banner respects safe areas and clears nav and FAB. Static audit only — no device lab run.
- Unnecessary changes: none. Each fix traces to a demonstrated acceptance gap.

## Risks or Limitations

- Static audit only. No on-device pass for foldable hinge zones, TalkBack traversal, or 320px rendering.
- StrictMode development double-mounts record one extra exposure per mount. Production unaffected.
- Inactivity detection uses focus state as the dirty-form proxy. It does not read form models.
- Slow state uses elapsed time. It does not measure network quality, by design.
- Pre-existing lint errors in `BiometricGate.tsx` and `App.tsx` remain. This audit did not touch those lines.
- Pre-existing typecheck errors in `src/domain/tax/` remain with their owner.

## Deferred Work

- Cross-session history, analytics, form-level passive hints, authored character moments, learning conditions, usage counters, network-quality detection. All explicitly out of scope. Nothing from that list was started.
