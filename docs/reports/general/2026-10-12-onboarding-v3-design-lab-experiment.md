# Onboarding V3 Design Lab Experiment Report

This report was written by Buffy on 2026-10-12 via Freebuff Desktop.

## Objective

Build a new BOURXE onboarding experiment for the Design Lab at `/design-lab/onboarding-v3`. The experiment must not replace production onboarding, the PhotoHero preview, or the independent Onboarding V2 route.

## Scope

In scope:

- A welcome stage with the official BX artwork and a depot scene.
- Three product scenes: sales and procurement, logistics, connected operations.
- Separate sign-in and sign-up screens.
- The five Design Lab theme families and both appearances.
- The six Design Lab viewports.
- Critical test coverage for the experiment.

Out of scope:

- Production onboarding routes.
- Supabase calls, auth calls, and application navigation.
- The saved user theme preference.

## Files Changed

- Added `src/components/onboarding-v3/onboarding-v3-preview.tsx`. The stage set, the theme layer, and the stylesheet.
- Added `src/components/onboarding-v3/onboarding-v3-scenes.tsx`. Four deterministic SVG scenes.
- Added `src/components/onboarding-v3/onboarding-v3-arc.css`. Arc password adaptation for the auth screens.
- Added `src/lib/designLabViewports.ts` and `src/components/design-lab/viewport-stage.tsx`. Resolved viewport presets and the frame.
- Added `src/pages/DesignLab.tsx` and `src/components/design-lab/design-lab-theme.ts`.
- Updated `src/lib/designLabPreviews.ts` with the `onboarding-v3-experience` entry.
- Updated `src/components/app/AppShell.tsx` with the `/design-lab/onboarding-v3` route.
- Added `src/tests/critical/onboardingV3.test.js`, `src/tests/critical/designLab.test.js`, and `src/tests/critical/designLabViewports.test.js`.

Skills used: mobile-app-ui-design, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### Journey

The experiment holds one local `screen` state with four stages: `welcome`, `story`, `signin`, and `signup`. All stages mount from one component. The only navigation target is `/design-lab`.

### Scenes

Each scene is a deterministic SVG. Identifiers come from a `useId`-derived prefix, so two mounted scenes never share a `clipPath` or gradient. The welcome scene contains four parts: backdrop, gate, ground, and subject.

### Scene geometry repair

Runtime measurement found three defects in the welcome scene. The repair follows.

1. The crate animation and the ramp deck did not agree. The crate travelled on a vector of `52,-46` while the deck line runs `62,-60`. The crate drifted off the deck. The travel vector is now `62,-60`.
2. The second crate used a different base point. With a half-cycle animation delay, the two crates landed on the same point in half of every cycle. Both crates now start at the foot of the deck. The animation delay sets the spacing.
3. The ramp deck used the ground colour at 92 percent opacity. The deck and the apron read as one dark mass. The deck now mixes 82 percent of the deep tone with the field tint.

### Auth chrome repair

Runtime measurement found the floating dock covering the sign-in submit action at the compact phone tier. The dock is now removed on both auth screens. The auth bar carries the palette and close controls in normal flow, so no floating control can land on a form.

### Contrast repair

The shared copy token measured 3.09:1 on the darkest light-mode canvas band. The experiment now defines `--ob3-copy`, which darkens the shared copy toward the ink in light appearance. The field boundary token in light appearance is an opaque 40 percent to 59 percent ink mix, which clears the 3:1 non-text threshold on the white field.

## Verification Result

Commands run:

- `bun run audit:load` — passed. No new heavy-risk finding in the changed files.
- `bun run typecheck` — passed.
- `bunx eslint` on the added files — passed.
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/onboardingV3.test.js` — 19 passed, 0 failed.
- `bun run test` — 8 failures, all in CPS, CSR, and theme-toggle tests. Those tests belong to other work in progress in this checkout. No failure names an onboarding or Design Lab file.

Live measurement results:

- Ramp deck against ground: 1.50:1 to 2.05:1 in all ten family and appearance combinations. The value was 1.00:1 before the repair.
- Crate against ramp deck: 1.07:1 to 1.29:1. The crate stroke holds 1.43:1 or more against both surfaces, so the crate boundary stays visible.
- Crate placement: the crate base sits 6.7 pixels below the deck edge at every point of the climb.
- Crate separation: the smallest distance between two clearly visible crates is 24.6 pixels. The previous base offset produced 0.5 pixels, a full coincidence.
- Compact phone tier, 390 by 844: no horizontal scroll. The sign-in submit button ends at 600 pixels and stays clear of the dock. All controls on the auth bar are 44 by 44 pixels.

## Supabase Push Status

Not applicable. No SQL and no database file changed.

## Risks or Limitations

- `bun run audit:load` reports a BLOAT advisory for `onboarding-v3-preview.tsx` (1440 lines) and `onboarding-v3-scenes.tsx` (888 lines). The advisory limit is 600 lines. The audit exits 0. Both files are within the existing 43 oversized files.
- Screenshot capture stopped responding late in the session. The final scene geometry is verified by document measurement, not by a fresh screenshot.
- The light-appearance crate has the lowest surface separation, 1.07:1 against the deck. The crate outline carries the boundary in that case. A device review must confirm the read.
- Physical device review of the keyboard state, the fold states, and reduced motion is still outstanding.

## Deferred Work

- Device acceptance on narrow Android, fold closed, fold open, tablet, and desktop.
- Motion review with the operating system reduced-motion setting enabled.
- Split the two oversized V3 files. The stage set, the stylesheet, and the four scenes can move to separate modules.
