# Onboarding V3 Outsourced Synthesis

Date: 2026-10-11

## Scope

Created a new Design Lab-only BOURXE Onboarding V3 experience. V3 does not replace production onboarding, the existing PhotoHero preview, or the independent Onboarding V2 route.

## Outsourced Files Inspected

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/claude.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/claude-v2.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/deepseek.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/openai.html`
- Original PhotoHero truck reference inspected: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero-v2.html`

## Comparative Findings

- `claude.html`: Strong compact mobile flow, theme controls, direct sign-in access, and reduced-motion handling. Weakness: more abstract artwork and some overcompressed product scenes.
- `claude-v2.html`: Stronger navigation, keyboard/swipe behavior, separated auth views, and a clear truck/waybill scene. Weakness: prototype-only form replacement behavior and tax copy that could imply automation guarantees.
- `deepseek.html`: Rich welcome, strong chips, polished route pacing, separate auth, and clear finance/tax scene. Weakness: prototype local theme persistence and heavier JS-driven scene steps.
- `openai.html`: Best cinematic storytelling, strongest mobile auth separation, physical business scenes, tenant boundaries, and improved PhotoHero-style vehicle. Weakness: standalone theme system and prototype JavaScript are not suitable for direct application use.

## Selected Ideas

- Cinematic physical scenes from `openai.html`.
- Compact navigation and immediate returning-user sign-in from `claude-v2.html`.
- Welcome capability chips and route pacing discipline from `deepseek.html`.
- Recognizable moving vehicle character from the original PhotoHero logistics slide.

## Rejected Ideas

- Wholesale copied HTML/CSS/JS.
- Prototype `localStorage` theme persistence.
- Generic connected-node diagrams.
- Nested auth scroll containers.
- Candidate codes, review labels, and competition controls.
- Tax copy that implies automatic compliance.

## Final V3 Direction

V3 is a separate onboarding journey with:

- A dedicated Welcome screen.
- Exactly five introduction slides:
  1. Multitenancy and independent business workspaces.
  2. RFQ, quotations, item library, Cost & Pricing Sheets, invoices, and payments.
  3. Logistics and operations with a visibly moving BOURXE waybill vehicle.
  4. Finance and tax with VAT and WHT prominence.
  5. Connected business operations across sales, procurement, logistics, projects, service, finance, and teams.
- A dedicated Sign In screen.
- A dedicated Sign Up screen.

## Component Architecture

- Added `src/components/onboarding/OnboardingV3Experience.tsx`.
- Added `src/pages/OnboardingV3Preview.tsx`.
- Updated `src/lib/designLabPreviews.ts` with the independent `onboarding-v3` entry.
- Updated `src/components/app/AppShell.tsx` with `/onboarding-v3-preview`.
- Added `src/tests/critical/onboardingV3Experience.test.js`.

V3 reuses:

- `photo-hero-v2-theme.ts` for the five family/light-dark atmospheric theme system.
- Official BX logo asset.
- Arc `PasswordField` and `PasswordStrength` components.

V3 does not import or reuse the V1/V2 slide controllers.

## Verification Results

- `bun test src/tests/critical/onboardingV3Experience.test.js`: passed.
- `bun run typecheck`: passed.
- `bun test src/tests/critical/onboardingV3Experience.test.js src/tests/critical/onboardingV2Independent.test.js src/tests/critical/designLab.test.js src/tests/critical/photoHeroV2LightMode.test.js src/tests/critical/moreNavigation.test.js src/tests/critical/productionComposition.test.js`: passed.
- `git diff --check`: passed with line-ending warnings on pre-existing dirty files only.
- `git status --short`: confirmed V3 additions plus pre-existing dirty/untracked work.

## Remaining Device Acceptance

Static verification cannot prove final visual quality. V3 still needs hands-on review on narrow Android, fold closed, fold open, tablet, desktop, reduced motion, and mobile keyboard states.
