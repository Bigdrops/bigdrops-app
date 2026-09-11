# Ticket: Recent Alerts Horizontal Scroll — Symptom Persists After Structural Fix

## Status

Open. Structural root cause removed. On-device symptom unresolved.

## Current symptom

Dashboard Recent Alerts renders alert cards. Horizontal swipe on mobile fails. The
track behaves as if it reaches a false end boundary and bounces or snaps back.
Later cards are unreachable. Forward and backward traversal both degrade.

## Expected behavior

With N alerts, the user swipes through all N in both directions. The track stops
only at the real first and last card. No snap-back. No position reset. No hidden cards.

## Fix history

### Attempt 1 — embla carousel (commit `43f8dede`)

- Replaced native scroll strip with embla snap carousel.
- Mobile items set to `basis-full` (one full-width card, no peek).
- Result: regression. Embla does not re-initialize on slide-count change (verified in
  `embla-carousel-react@8.6.0`). Stale snap bounds caused false-end clamping.

### Attempt 2 — native scroll strip (commit `e33254d8`)

- Removed embla provider, items, and arrows.
- Restored: `flex flex-nowrap gap-2 overflow-x-auto`, fixed 200px cards (220px md),
  hidden scrollbars, `-webkit-overflow-scrolling: touch`.
- Source: `docs/reports/dashboard/recent-alerts-carousel-forensics-2026-09-06.md`.
- The false-end mechanism is structurally removed. The snap engine is gone.
- Result: symptom persists per user inspection on device. Root cause not yet confirmed.

## Current implementation

File: `src/components/dashboard/RecentAlertsCarousel.tsx`

- Track: `flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none]
  [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] md:gap-3`
- Cards: `min-w-[200px] w-[200px] shrink-0 md:min-w-[220px] md:w-[220px]`
- No carousel engine. No scroll state. No snap.
- Data source: `useNotifications()` via `src/hooks/useNotifications.ts`.
- Displays up to 8 alerts: `notifications.slice(0, 8)`.

## Relevant paths

- `src/components/dashboard/RecentAlertsCarousel.tsx` — track, cards, states
- `src/hooks/useNotifications.ts` — fetch, markRead, refresh lifecycle
- `src/components/ui/carousel.tsx` — embla wrapper, no longer used here; do not delete
- `docs/TEMPLATES/React-temps/reui/*carousel*` — embla reference, unused here
- Canonical spec: `mobile-dashboard-v6.html` `.alerts-scroll`, PRD 06 Alert Card
  (200px, horizontal scroll, no snap)
- Forensics report: `docs/reports/dashboard/recent-alerts-carousel-forensics-2026-09-06.md`

## Open investigation items

The structural fix is in place. The remaining candidates are:

1. **Ancestor overflow or clipping.**
   An ancestor element with `overflow: hidden`, `overflow: clip`, or a CSS `transform`
   can trap touch scrolling and prevent the track from receiving swipe events.
   Inspect the full ancestor chain from `RecentAlertsCarousel` up to `<body>`.

2. **Touch-action conflict.**
   A `touch-action: pan-y` or `touch-action: none` on an ancestor claims the gesture
   before the horizontal strip sees it. Inspect computed `touch-action` on the track
   and each ancestor.

3. **Data identity churn causing remount.**
   If `useNotifications` returns a new array reference on every render (refresh loop,
   realtime subscription, tenant context instability), React may remount the scroll
   container and reset `scrollLeft` to 0 mid-gesture.
   Check: does `notifications` identity stabilize after initial load?
   Check: is there a realtime subscription that fires repeatedly?

4. **Skeleton or empty branch swap mid-gesture.**
   If `loading` toggles back to `true` during a swipe (e.g., a refresh triggered by
   `markRead`), the skeleton branch replaces the scroll track and the scroll position
   is lost. Confirm that `loading` stays `false` after initial render.

5. **Card geometry at runtime.**
   Confirm that cards do not collapse below 200px due to flex shrink or content
   constraints. Check computed `scrollWidth` versus `clientWidth` on the track.

6. **`-webkit-overflow-scrolling: touch` presence.**
   This property enables momentum scrolling on iOS. Confirm it is not being overridden
   by a global reset or a utility class.

## Constraints

- Preserve alert data, navigation, read/unread, skeleton, and empty states.
- No new carousel dependency without repository evidence.
- Do not assume any prior commit was fully working.
- Do not roll back `e33254d8`. The embla false-end mechanism is a confirmed regression.

## Next step

Reproduce on device with 5 or more alerts. Use browser DevTools remote inspection to
read computed styles on the track and its ancestors. Record `scrollWidth`, `clientWidth`,
`touch-action`, `overflow`, and `transform` values. Identify which item in the open
investigation list above is the actual cause.
