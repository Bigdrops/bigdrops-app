# Design Lab Atmospheric Redesign Report

Date: 2026-10-11.
Scope: Rescue completion of the Design Lab redesign after Codex exhausted its usage mid-task. Codex delivered the page, registry, routing, and navigation; this session verified the implementation, added focused tests, fixed one stale label assertion, and reports the result.

## Previous structural problems

- Oversized generic heading with redundant explanatory text.
- Weak content hierarchy and excessive empty space.
- Generic white preview card with no meaningful preview artwork.
- Flat main-app background, no dedicated testing-space identity.
- User-facing "V2" suffix in the title.

## New layout architecture (`src/pages/DesignLab.tsx`)

- Compact header: navigation menu button, flask identity mark, strong title, one supporting line. No instructional paragraphs.
- Experience collection: section head with live registry count, registry-driven cards, no fake previews, no status badges, no placeholder panels.
- Featured preview card: CSS-composed thumbnail (brand row, document glyph, Invoice #2049 glass card at ₦1,250,000) derived from the onboarding visual language, title, description, capability pills, and a full-card Open Preview action with visible focus.
- Responsive: single column on mobile, split thumbnail/body from 720px, wider split from 1040px, capped content width, safe-area padding, bottom-navigation clearance. No horizontal overflow by construction.

## Theme mapping and source authority

- Design Lab reads `preference.themePresetId` and `preference.themeMode` from `useThemePreferenceContext` (provider mounted in AppShell). No second picker, no independent persistence, no global token changes.
- Family resolves through `isPhotoHeroFamilyId` with a slate-navy fallback for non-onboarding families. Appearance resolves light/dark/system with a live media-query listener.
- Materials come directly from `getPhotoHeroVars(family, appearance)` in `src/components/onboarding/photo-hero-v2-theme.ts`. Amber Light therefore renders the atmospheric onboarding recipe while the main app keeps its existing Amber Light styling.
- Onboarding V2 preview behavior is unchanged.

## Preview registry behavior (`src/lib/designLabPreviews.ts`)

- Typed `DESIGN_LAB_PREVIEWS` registry. The single entry keeps internal id `onboarding-v2` and route `/photohero-preview`; the user-facing name is `Onboarding Experience`.
- Routes and More Options, drawer, and desktop navigation entries are wired in AppShell, Layout, navData, and MoreOptions. No new primary navigation entry.

## Files changed this session

- Added `src/tests/critical/designLab.test.js` (8 tests: registry contract, public label, 5x2 material resolution, amber-light atmosphere, preference following, card behavior, responsive contracts, route registration).
- Fixed one stale assertion in `src/tests/critical/moreNavigation.test.js` (`Onboarding V2` to `Onboarding Experience`).
- Added this report.

Pre-existing work preserved untouched: Codex's Design Lab page, registry, route, navigation, cold-launch, AppShell, PageLoader, and report files.

## Static verification results

- `bun run typecheck`: passed.
- Focused tests, 38 passed and 0 failed: designLab (8), moreNavigation (7), photoHeroV2LightMode (10), productionComposition (6), themePrdContract (7).
- `git diff --check`: passed with no whitespace errors.
- Full critical suite: 7 accounting and CPS suites fail intermittently across runs and pass in isolation (paymentAccountingIntegration verified 22 of 22 alone). The failures vary between identical-code runs and sit outside this task's scope. No Design Lab, navigation, onboarding, or theme test fails.
- `bun run build` was not run (hardware policy). No browser or device verification was performed.

## Remaining mobile visual acceptance

- Confirm the atmospheric header, thumbnail, and glass surfaces stay legible on a small handset in Amber Light and Slate Navy Dark.
- Confirm the split card composition at fold widths has no cramped metadata.
- Confirm bottom navigation and safe-area clearance on a real device.
