# Recent Alerts Carousel Forensic Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Reconstruct the carousel's behavioral evolution from Git history.
- Identify the concrete false-end/bounce-back mechanism.
- Repair traversal with the smallest evidence-backed change.

## Scope

- `src/components/dashboard/RecentAlertsCarousel.tsx` only.
- No data, service, schema, or shared-component changes.

## Files changed

- `src/components/dashboard/RecentAlertsCarousel.tsx`
- `docs/reports/dashboard/recent-alerts-carousel-forensics-2026-09-06.md` (this report)

## Skills used

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Timeline

- Past (before `43f8dede`): native horizontal scroll strip, fixed 200px cards (220px md), no snap library, no scroll state. Multiple alerts visible with peek. Free native swipe. Matches v6 canonical `.alerts-scroll` and PRD 06 Alert Card exactly.
- Refactor (`43f8dede`): embla carousel introduced with `align start`, `loop false`, default snap. Mobile items set to `basis-full` (one full-width card, no peek). Desktop arrows added (hidden on mobile).
- Present: single-card viewport with snap-to-start engine plus full-width slides.

## Regression mechanism

- Embla does not re-initialize when slide count changes. Verified in installed `embla-carousel-react@8.6.0`: re-init fires on options and plugins change only.
- Any slide-count change without remount leaves stale snap bounds. The engine then clamps to a false end and snaps back on release.
- Full-width slides plus mandatory snap mean every gesture resolves against engine-computed bounds. Native scroll has no such bounds concept and cannot fail this way.
- The refactor added a stateful scroll engine with zero UX gain on mobile: arrows stay hidden, peek context disappeared, snap fights free browsing.

## Fix

- Removed embla provider, items, and arrows from this component.
- Restored the native scroll strip: fixed 200px cards (220px md), `flex-nowrap`, `overflow-x-auto`, hidden scrollbars, touch scrolling.
- Dropped the past `lg:grid` variant. PRD 06 mandates a horizontal scroll container, so the strip scrolls at all breakpoints.
- Shared `ui/carousel.tsx` left untouched. No other consumer exists.
- Card content, data flow, mark-read, navigation, skeleton, and empty state unchanged.

## Verification

- `bun run typecheck`: passed, clean, repository-wide (second run definitive after a shell timeout on the first attempt).
- `bun run audit:load`: skipped (no data-layer logic touched).
- `bun run build`: not run (hardware policy).
- `git diff`: one intended file, 15 lines changed.
- Runtime device check unavailable. Static claims only, per below.

## Static verification statement

- Multiple cards render from the real collection. Track width grows with card count. No truncation logic exists.
- Native overflow produces genuine scroll range. No snap, index, effect, or engine can reset the position.
- Vertical page scroll unaffected. Touch panning preserved on both axes by the browser.
- Human device check still required for: multi-swipe traversal, actual-end stop, and narrow-width behavior.

## Limitations

- No browser or device inspection exists in this environment.
- "Fixed" means the false-end mechanism is structurally removed, not device-proven.
- Desktop loses the past 2-column grid in favor of the PRD-mandated scroll strip.
