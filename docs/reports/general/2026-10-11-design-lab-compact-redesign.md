# Design Lab Compact Redesign Report

Date: 2026-10-11.
Scope: Replace the rejected spacious Design Lab composition with the approved compact Mobile x Fold x Desktop direction. Atmospheric theme integration preserved.

## Removed structural elements

- Experiences, Atmosphere, and Appearance statistics panels deleted with their styles.
- Oversized featured preview composition deleted: giant invoice illustration, document glyph, glass value card, large Open Preview action, and redundant metadata.
- Helper text pruned to one supporting line. No status badges. No placeholder panels.
- Registry description shortened to `Themes, appearance, login and signup.`

## Mobile x Fold composition

- Compact header: 44px hamburger, 22px title with one concise line, 44px appearance toggle.
- Section head with live registry count, then compact horizontal cards: 104px theme-aware thumbnail, eyebrow, name with chevron, short description, capability pills.
- Collection grid stays single column on phones and moves to two columns from 600px for unfolded fold widths.
- Safe-area padding retained. Bottom navigation clearance retained. No horizontal overflow by construction.

## Desktop composition

- Existing desktop sidebar stays the navigation authority. The page hamburger carries `md:hidden`, which matches the shell contract because `DesktopSidebar` renders `hidden md:flex` and offers no collapse mode.
- Header keeps the title left and the appearance toggle right. Collection caps at 960px with two restrained columns, so a single entry never stretches into a hero panel.

## Drawer integration

- The hamburger calls `openSidebar` from `MobileChromeContext`, the same mechanism as every other page, with `aria-label`, `aria-expanded`, and visible focus. No separate drawer implementation.

## Appearance toggle integration

- One toggle reuses the dashboard behavior: Sun in dark mode and Moon in light mode, calling context `save({ themeMode })`. Design Lab keeps no appearance state and follows Light, Dark, and System preferences immediately, including persistence through existing app settings.

## Atmospheric theme preservation

- `getPhotoHeroVars(family, appearance)` integration unchanged across Slate Navy, Amber Terracotta, Ocean Teal, Rose Gold, and Forest Green in Light and Dark.
- New styles consume only onboarding recipe variables. No flat canvas, no independent picker, no palette duplication, no global token changes.

## Files changed this session

- Rewrote `src/pages/DesignLab.tsx` (compact header, toggle, registry cards, new styles).
- Extended `src/lib/designLabPreviews.ts` with a generic `eyebrow` field and the concise description.
- Rewrote `src/tests/critical/designLab.test.js` (11 tests for the compact contracts).
- Added this report.

All other dirty files predate this session and were preserved untouched.

## Static verification

- `bun run typecheck`: passed.
- Focused tests, 65 passed and 0 failed: designLab (11), moreNavigation (7), photoHeroV2LightMode (10), productionComposition (6), themePrdContract (7), coldLaunchPreviewAtmosphere (6), coldLaunchProductionStartup (18).
- `git diff --check`: passed with no whitespace errors.
- Full critical suite still shows intermittent accounting and CPS failures that vary between identical-code runs and pass in isolation. They sit outside this task and no Design Lab, navigation, onboarding, or theme test fails.
- `bun run build` was not run (hardware policy). No browser or device verification was performed.

## Remaining device acceptance checks

- Confirm compact density and thumbnail legibility on a small handset in Amber Light and Slate Navy Dark.
- Confirm two-column behavior on an unfolded fold device without cramped metadata.
- Confirm the hamburger opens the real drawer and the toggle flips the whole app, including Design Lab atmosphere, on device.
- Confirm bottom navigation clearance with the production tab bar visible.
