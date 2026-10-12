# Onboarding V5 Design Lab Redesign Report

This report was written by Codex on 2026-10-12 via Codex Desktop.

## Objective

Give the existing V5 story distinct business environments. Make the workspaces chapter show independent businesses. Make the finance chapter read as a tax command centre.

## Scope

The change is limited to V5 presentation, V5 scene styles, and the focused V5 test. The Design Lab route, theme and viewport controls, chapter order, navigation, and preview authentication remain in place.

## Files changed

- `src/components/onboarding-v5/onboarding-v5-preview.tsx`
- `src/components/onboarding-v5/onboarding-v5-scenes.tsx`
- `src/components/onboarding-v5/onboarding-v5-scenes.css`
- `src/tests/critical/onboardingV5.test.js`
- `docs/reports/ui-ux/2026-10-12-onboarding-v5-design-lab-redesign.md`

Skills used: redesign-existing-projects, ui-ux-pro-max, emil-design-eng, animate, animation-vocabulary, review-animations, prototype, mobile-app-ui-design, accessibility, react-dev, typescript-advanced-types, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Replaced the shared isometric SVG floor with a separate environment for each chapter. Each scene mounts only for its active chapter.
- Added three sample businesses to the workspaces scene: Activa Electrical, Northline Fleet, and Marketline Supply. Each has its own workspace boundary, team state, operating records, and environment. A short focus sequence moves across the business contexts without moving records between them.
- Added a tax workflow to the existing finance chapter. A commercial record enters separate VAT and WHT lanes. The scene then shows reconciliation, an obligation timeline, tax documents, and a retained filing confirmation. All tax content is illustrative. No rate, deadline, or automatic filing claim is present.
- Added a document workroom for commercial work, a dispatch yard and moving vehicle for logistics, a service bay and report for field work, and a BOURXE brand resolution for conversion.
- Changed the chapter rail to a compact text marker. Moved Design Lab controls to the top edge, away from the story actions.
- Added a narrow tax layout that changes the desktop lanes into a vertical workflow. Scene layouts use the existing Design Lab container breakpoints. Scene colours use the selected theme tokens.
- Added separate entrance timings for the scenes. Reduced motion removes these animations and leaves complete static scenes.

## Verification

- `bun run typecheck`: passed.
- `bun test src/tests/critical/onboardingV5.test.js`: 12 passed, 0 failed.
- `git diff --check`: passed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not run due to the hardware rule.
- Supabase push status: not applicable.

## Risks or limitations

- The unauthenticated local browser opened the application's sign-in gate at the Design Lab route. It did not render the V5 scene. Visual quality, text fit, and motion timing still need review in an authenticated Design Lab session across the five theme families and viewport presets.
- The sample tax workflow is a visual explanation. It is not a tax calculation or filing service.

## Deferred work

- Review the rendered V5 scenes in Design Lab and adjust the visual direction from user feedback. This report does not record design approval.
