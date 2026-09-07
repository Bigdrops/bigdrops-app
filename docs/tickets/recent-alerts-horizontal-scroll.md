# Ticket: Recent Alerts horizontal scrolling remains broken

## Current symptom

Dashboard Recent Alerts renders alert cards, but horizontal traversal fails on mobile. Swiping moves once, then the track behaves as if it reached a false end boundary and bounces/snaps back. Later alerts are not reliably reachable. Forward and backward travel both degrade.

## Expected behavior

With N alerts, the user swipes through all N in both directions. The track stops only at the real end. No snap-back, no position reset, no hidden cards.

## Already attempted

- `43f8dede` replaced the native scroll strip with an embla snap carousel (`basis-full` mobile items, `align start`, `loop false`). Regression followed.
- A later change restored the native strip: `flex flex-nowrap gap-2 overflow-x-auto`, fixed 200px cards (220px md), no snap library, no scroll/index state.
- Forensics report: `docs/Reports/dashboard/recent-alerts-carousel-forensics-2026-09-06.md`.
- The committed fix is present in `RecentAlertsCarousel.tsx`, yet the symptom persists per user inspection.

## Relevant paths

- `src/components/dashboard/RecentAlertsCarousel.tsx` (track, cards, states)
- `src/hooks/useNotifications.ts` (fetch, markRead, refresh lifecycle)
- `src/components/ui/carousel.tsx` (embla wrapper, now unused here — do not delete yet)
- `docs/TEMPLATES/React-temps/reui/*carousel*` (embla reference, same pattern as removed code)
- Canonical spec: `mobile-dashboard-v6.html` `.alerts-scroll`, PRD 06 Alert Card (200px, horizontal scroll, no snap)

## History findings (established, not assumed)

- Pre-`43f8dede`: native strip, multiple visible, free swipe. Partially working, never fully verified.
- No commit was ever fully known-good. Do not rollback blindly.
- embla 8.6.0 re-inits on options/plugins change only, never on slide-count change (verified in bundle).

## Investigation checklist

1. Reproduce on-device with 5+ alerts. Record whether the track, cards, or data cause the stall.
2. Inspect computed geometry at runtime: viewport width, track scrollWidth, card widths, shrink behavior.
3. Check whether `notifications` identity or count churns across renders (refresh loops, tenant context, realtime).
4. Check ancestor containers for overflow/clipping/transform that could trap touch scrolling.
5. Check whether skeleton/empty/data branches remount mid-gesture and reset scroll position.
6. Verify touch-action negotiation between horizontal strip and vertical page scroll.
7. Determine the actual root cause BEFORE changing architecture again.
8. If a carousel engine returns, prove why native scroll cannot satisfy the requirement.

## Constraints

- Preserve alert data, navigation, read/unread, skeleton, and empty states.
- No new carousel dependency without repository evidence.
- Do not assume any prior commit worked fully.
