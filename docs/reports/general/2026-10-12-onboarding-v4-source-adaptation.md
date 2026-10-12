# Onboarding V4 Source Adaptation Report

This report was written by Codex on 2026-10-12 via Codex Desktop.

## Objective

Implement BOURXE Onboarding V4 as a standalone Design Lab experiment.

Use `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/BOURXE_Ultimate_Onboarding.html` as the design source of truth.

## Scope

The work adds a preview-only experiment. It does not modify production onboarding, production authentication, PhotoHero V1, or the reference HTML.

## Files changed

- `src/components/onboarding-v4/onboarding-v4-preview.tsx`
- `src/pages/OnboardingV4Preview.tsx`
- `src/components/app/AppShell.tsx`
- `src/lib/designLabPreviews.ts`
- `src/tests/critical/onboardingV4.test.js`
- `docs/reports/general/2026-10-12-onboarding-v4-source-adaptation.md`

## Skills used

Skills used: design-artifact, redesign-existing-projects, ui-ux-pro-max, emil-design-eng, animate, review-animations, animation-vocabulary, html-prototype, react-dev, vercel-composition-patterns, mobile-app-ui-design, mobile-android-design, safe-area-handling, accessibility, signup, supabase, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added V4 as `/design-lab/onboarding-v4`.
- Registered V4 in the Design Lab preview list.
- Added a React wrapper that imports the supplied HTML as raw source.
- Preserved the source document inside an iframe with scripts and forms enabled.
- Injected selected Design Lab theme family and Light/Dark mode into the source document.
- Hid the source document's internal theme palette so Design Lab controls stay outside the simulated surface.
- Reused the existing compact Dashboard-style dock, popover, theme buttons, appearance buttons, and viewport switcher pattern.
- Used the shared `ViewportStage` and `useDesignLabViewport()` hook.
- Added focused V4 tests for route registration, Design Lab registration, source reference use, scene sequence, source animation preservation, viewport defaults, auth isolation, Google button presence, reduced-motion support, and responsive contracts.

## Source sections and animation coverage

The implementation preserves these source sections:

- Welcome city scene.
- Chapter 1: independent business workspaces and living tree animation.
- Chapter 2: commercial engine and kinetic paperwork press.
- Chapter 3: finance circuitry with VAT and WHT endpoints.
- Chapter 4: logistics road scene with moving three-wheeled BOURXE vehicle.
- Chapter 5: field service generator and technician scene.
- Dedicated Sign In screen.
- Dedicated Sign Up screen.

The source animation system remains present:

- City scanline, tram movement, and halo breathing.
- Branch draw and leaf growth.
- Paper feed, press piston, belt dash, and deal flag.
- Finance wire flow, orbit, pulse, and counter reveal.
- Road parallax, vehicle drive, wheel spin, chassis motion, package wave, and milestone states.
- Service rotor, spark, diagnostic signal, technician tilt, and report check draw.
- Chapter wipe transition.
- Reduced-motion override.

## Deviations from source

- The source internal theme palette is hidden. Reason: preview controls must stay outside the simulated content surface.
- Theme and appearance initialization is controlled by React. Reason: Design Lab must support the existing theme families and Light/Dark mode without writing production preferences.
- The iframe sandbox allows scripts and forms only. Reason: V4 must remain preview-only and must not navigate the parent app.
- Em dashes in the iframe source document are converted to hyphens at render time. Reason: V4 user-facing copy must not use em dashes.

## Google OAuth integration status

Production Google OAuth exists in `src/pages/Login.tsx` through `supabase.auth.signInWithOAuth({ provider: 'google' })`.

V4 does not call OAuth, Supabase auth, redirects, or mutations. The source Google buttons remain visual preview actions.

## Verification

- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/onboardingV4.test.js`: passed.
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/designLab.test.js`: passed.
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/designLabViewports.test.js`: passed.
- `bun run typecheck`: passed.
- `git diff --check`: passed with line-ending warnings on pre-existing changed files outside this V4 patch.
- `git status --short`: dirty before and after this task. Pre-existing changes were preserved.
- `bun run audit:load`: not run. No data-layer or schema logic changed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Risks or limitations

- Visual fidelity still needs human review in Design Lab. Passing tests only confirms source preservation and integration contracts.
- The source HTML uses an iframe. This keeps the source choreography intact, but it separates the prototype document from React component internals.
- The reference HTML imports Google Fonts. This behavior is inherited from the source.

## Deferred work

- User visual approval across Actual, Desktop, Fold Open, Fold Closed, Tablet, and Mobile.
- Optional browser screenshot review after an authenticated local Design Lab session is available.
