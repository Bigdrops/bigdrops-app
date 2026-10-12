# Onboarding Experience Slide Candidates

Date: 2026-10-11

## Summary

Added seven experimental onboarding slide candidates to the existing Onboarding Experience preview. This is additive only. The existing slide sequence remains available, and the logistics truck slide remains in the original carousel with its vehicle artwork, tracking card, wheel animation, and overall composition preserved.

## Existing Slide Inventory

- Intro
- Invoicing
- Logistics
- Projects
- Sign up

Confirmed winner preserved:

- Logistics truck slide. The truck illustration, launcher artwork, wheel animation, tracking route, tracking progress card, and slide placement inside the existing carousel remain intact.

## New Candidate List

- C01 - Connected Business: interconnected workspaces, documents, and operations.
- C02 - Sales Workflow: RFQ to quotation to invoice to payment.
- C03 - Procurement & Costing: item library, procurement inputs, costing, and pricing decision.
- C04 - Finance: receivables, accounting, tax, and reporting visibility.
- C05 - Projects: milestone and task progression.
- C06 - Field Service: equipment service to maintenance record to customer service report.
- C07 - Teamwork: roles, handoffs, and shared visibility.

## Candidate Review Mechanism

The existing preview control popover now includes a compact candidate selector. Users can choose the original slide sequence or any C01-C07 candidate. Candidate mode is preview-only and does not insert candidates into the production onboarding order.

The candidate view includes:

- Candidate-specific artwork.
- Candidate code, title, concept, tags, headline, and support copy.
- Candidate dot navigation.
- Return to existing slides.
- Sign-up jump into the existing auth preview.

## Theme Integration

Candidates reuse the existing Onboarding V2 theme engine through the parent preview. Candidate artwork consumes the established CSS variables, including `--glass-bg`, `--hero-accent`, `--primary`, and `--surface`.

Supported matrix remains unchanged:

- Slate Navy
- Amber Terracotta
- Ocean Teal
- Rose Gold
- Forest Green

Each still supports Light and Dark.

## Responsive Strategy

Candidates render inside the existing full-screen onboarding shell and reuse its safe-area spacing, bottom controls, reduced-motion rule, theme controls, and preview route wrapper. Artwork uses scalable SVG viewBox geometry with transform and opacity-based motion.

## Branding Changes

Visible onboarding preview branding now uses BOURXE:

- Top-bar app name.
- Logistics truck lettering.
- Auth icon alt text.
- Auth fine print.

The existing official launcher artwork remains in use. Internal file names and identifiers were not renamed.

## Files Modified

- `src/components/onboarding/PhotoHeroV2Preview.tsx`
- `src/components/onboarding/photo-hero-v2-candidates.tsx`
- `src/tests/critical/photoHeroV2LightMode.test.js`

## Static Verification

- `bun run typecheck`: passed.
- `bun test src\tests\critical\photoHeroV2LightMode.test.js`: passed, 15 tests.
- `bun test src\tests\critical\moreNavigation.test.js src\tests\critical\designLab.test.js src\tests\critical\photoHeroV2LightMode.test.js`: passed, 37 tests.
- `bun test src\tests\critical\productionComposition.test.js`: passed, 6 tests.
- `git diff --check`: passed, with line-ending warnings only.
- `git status --short`: captured after edits; pre-existing dirty files remain present.

## Scope Notes

No production Cold Launch, TenantGate, PageLoader, Supabase, schema, dashboard, or authentication logic was modified for this task.

Pre-existing dirty files were present before this task, including Cold Launch, Design Lab, navigation, and startup-related files. They were preserved.

## Remaining Visual Acceptance

No browser or device rendering was performed. Mobile, fold, tablet, and desktop visual acceptance still requires manual preview review in `/photohero-preview`.
