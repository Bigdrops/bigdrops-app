# Independent Onboarding V2 Implementation

Date: 2026-10-11

## Summary

Implemented a separate BOURXE Onboarding V2 preview experience. The existing PhotoHero onboarding carousel and its experimental candidate selector remain available as the V1 comparison surface. The new V2 has its own slide state, navigation, progress indicators, theme controls, animation lifecycle, and authentication presentation.

## Architecture

- Added `src/components/onboarding/OnboardingV2Experience.tsx` as the independent V2 presentation.
- Added `src/pages/OnboardingV2Preview.tsx` as the Design Lab route wrapper.
- Registered `/onboarding-v2-preview` in `src/components/app/AppShell.tsx`.
- Added a second Design Lab entry in `src/lib/designLabPreviews.ts`.

The V2 component reuses read-only presentation assets and contracts only:

- `getPhotoHeroVars`, `PHOTO_HERO_FAMILIES`, and `PHOTO_HERO_FAMILY_META` from the Onboarding atmospheric theme system.
- Official BX launcher artwork.
- Arc `PasswordField`, `PasswordStrength`, and `createPasswordRules`.

No Supabase, production auth routing, tenant logic, Cold Launch, or dashboard code was modified for V2 behavior.

## Slide Concepts

V2 contains exactly five introduction slides:

1. Multitenancy & Teamwork: separate tenant workspaces and role teams enter one BOURXE operating environment without implying shared tenant data.
2. Sales & Procurement: RFQ, Quotation, Item Library, Cost & Pricing Sheets, Invoice, and Payment move through one commercial workflow.
3. Logistics & Operations: a branded BOURXE vehicle moves through a Waybill route with shipment progress.
4. Tax & Finance: VAT and WHT are prominent in an invoice, payment, and reporting workflow.
5. Connected Business: Sales, Procurement, Logistics, Projects, Service, Finance, and Teams converge into one BOURXE workspace.

## Truck Reuse

The logistics slide adapts the approved PhotoHero truck visual language: branded vehicle body, official BX mark, BOURXE lettering, wheel motion, route context, and delivery progress. It is implemented inside V2 rather than importing or altering the existing V1 slide controller.

## Authentication Separation

V2 includes one dedicated authentication stage with Login and Signup views. The stage uses preview-local validation state and Arc password controls. It does not import Supabase or replace production login/signup routing.

## Design Lab Registration

Design Lab now has:

- `Onboarding Experience` at `/photohero-preview` for the existing V1 carousel and candidates.
- `Onboarding V2` at `/onboarding-v2-preview` for the new independent experience.

Future previews can continue to use the typed `DESIGN_LAB_PREVIEWS` registry.

## Verification

Commands run:

- `bun run typecheck` — passed.
- `bun test src\tests\critical\onboardingV2Independent.test.js src\tests\critical\designLab.test.js src\tests\critical\photoHeroV2LightMode.test.js src\tests\critical\moreNavigation.test.js src\tests\critical\productionComposition.test.js` — 54 passed, 0 failed.

New regression coverage verifies:

- Exactly five V2 introduction slides.
- Dedicated authentication stage with Login and Signup.
- V2 independence from PhotoHero V1 and candidate review.
- Required multitenancy, tax, sales/procurement, logistics, service, project, finance, and teamwork content.
- Moving branded vehicle implementation.
- Five theme families and Light/Dark support via the shared theme engine.
- Reduced-motion static behavior.
- Design Lab V1/V2 registration and route wiring.

## Remaining Checks

No browser or device rendering was performed. Mobile, fold, tablet, and desktop visual acceptance still needs runtime review, especially for artwork spacing and authentication form height on short Android screens.
