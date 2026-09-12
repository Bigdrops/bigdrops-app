# Product Guidance Live Launch Anchor Report

This report was written by Muse Spark on 2026-09-12 via OpenCode.

## Objective

Make the Product Guidance system the persistent guidance layer for the two live launch journeys (new-user pre-dashboard, established-user cold launch). Keep onboarding free of tips.

## Scope

In scope:

- Session-scoped guidance engine with deterministic rotation.
- Guidance slots on splash, loading, error, offline, and provisioning-failed states.
- Inactivity guidance with workflow-safety caps.
- Contextual launch status lines and connectivity states.

Out of scope:

- Authentication, tenant resolution, biometric, and provisioning logic (unchanged).
- Onboarding manuscript (unchanged, no tips).
- Financial calculations and PDF rendering.

## Files Changed

New:

- `src/domain/guidance/guidanceEngine.ts` — session engine, selection, status lines.
- `src/components/guidance/GuidanceTip.tsx` — renderer, avatar slot, inactivity nudge.
- `src/tests/critical/guidanceEngine.test.js` — 7 engine checks.

Modified:

- `src/hooks/useLoadingTip.ts` — engine-backed slots, same caller API.
- `src/components/loading/LoadingTips.tsx` — reuses shared avatar slot.
- `src/components/app/TenantGate.tsx` — recovery guidance under gate errors.
- `src/components/app/OfflineAccessBlocked.tsx` — offline guidance under blocked state.
- `src/pages/ProvisioningFailed.tsx` — recovery guidance under failure card.
- `src/App.tsx` — stage-aware splash status, inactivity mount, legacy rotation removed.
- `src/index.css` — guidance entrance motion token.

## Skills Used

Skills used: mobile-app-ui-design, mobile-android-design, animate, accessibility, html-wireframe
Documentation standard: ASD-STE100 Simplified Technical English

Note: mobile-android-design is Material 3 based. The PRD forbids Material 3. This task uses only its platform behavior rules (touch targets, adaptive layouts, screen-reader support). Visual tokens stay slate-navy.

## Changes Made

- One `GuidanceEngine` serves all consumers. Selection order: context, priority, least-recent, view count, id. No random calls.
- Loader mounts pin engine slots. Deactivation hides the tip. History never resets. Second passes continue rotation.
- Errors keep primary position. Guidance renders beneath the error card. Retry controls keep focus order.
- Offline shows the sync workflow tip. Reconnect shows recovery status. No forced reloads.
- Slow loads show honest waiting status. No fake progress.
- Inactivity prompts cap at 2 per session with a 10-minute gap. Focused input raises the threshold. Dirty forms cap at Passive. Guidance never navigates and never touches form state.
- Motion uses transform and opacity only (200ms ease-out). Reduced motion collapses to a fade. Illustrations reuse existing CSS avatar families. Theme tokens only. No wireframe hex values.
- Layouts stay in flow for phone, foldable, tablet, and desktop. The inactivity banner fixes above the bottom nav with safe-area offset. Touch targets meet 44px.

## Verification Result

- `bun run typecheck`: 6 errors, all in `src/domain/tax/` (pre-existing work from another agent, present before this task). Zero errors in task files.
- `bun run audit:load`: no new findings in task files (25 oversized, 6 broad selects, 3 heavy limits — same as baseline).
- `bun run test` (guidance + tenant gate): 18 pass, 0 fail.
- ESLint on task files: 0 errors.
- `git status`: only intended files changed. No pre-existing work reverted.
- `bun run build`: skipped due to hardware policy.

## Risks or Limitations

- Pre-existing typecheck errors in `src/domain/tax/` block a clean full-repo typecheck. Owner of that work must fix them.
- Pre-existing ESLint errors in `src/App.tsx` (unused vars, `any` types) remain. This task did not touch those lines.
- No mascot art exists yet. The architecture supports an illustration slot. Asset format choice stays open.
- Exposure history is session memory only. Cross-session history needs a later phase.
- Inactivity detection uses input listeners and focus checks. It does not read form dirty flags directly. Focused input is the conservative proxy.

## Deferred Work

- Phase 3 Passive inline hints inside forms.
- Cross-session exposure history and settings reset control.
- Attention-level character moment with authored art.
- Learning conditions (retire tips after user acts).
- Usage counters without new analytics infrastructure.
- Slow-connection detection beyond elapsed-time threshold.
