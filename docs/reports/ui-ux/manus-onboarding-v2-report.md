# Manus Onboarding Template v2 Report

This report was written by Buffy on 2026-09-10 via Freebuff.

## Objective

Coach the manus onboarding template into a v2 candidate. Apply the BIGDROPS visual system: white and slate navy. Review the whole page for mobile, fold, and desktop. Give every slide a story that attracts. Remove the Files.tax branding.

## Scope

One new design-direction prototype. No source files changed. The v1 template `files-tax-onboarding-manus.html` stays untouched for comparison.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-manus-v2.html` — new file

Skills used: mobile-app-ui-design, animate, redesign-existing-projects, design-system-starter
Documentation standard: ASD-STE100 Simplified Technical English

## Brand correction

Files.tax is an internal module name from an agent analogy. It leaked into a PRD and then into the v1 template as a brand. v2 removes it. The v2 candidate is BIGDROPS-branded end to end. Taxes are presented in plain words: "Monthly tax position", not a product name.

## Design system applied

All tokens follow `Design.md`:

- Light: `--bg #f0f4f8`, `--surface #ffffff`, `--primary #1e3a5f`
- Dark: `--bg #0f172a`, `--primary #60a5fa` (Liquid Onyx values)
- Manrope for UI, DM Mono for the invoice figure
- 135° primary-to-secondary gradient on logo, brand tile, CTAs, workspace icons
- 18–20px card radius, primary-tinted shadows
- Dark mode through the same semantic custom properties

## Story arc

Each slide is one narrative beat with a headline that sells the outcome:

1. **Welcome** — "Run the whole operation from one place." Brand tile with orbiting module chips: Invoices, Waybills, Taxes, Projects, Delivery.
2. **Invoicing** — "From job done to money in." Invoice assembles: ₦1,250,000 in DM Mono, VAT and WHT shown as *Applied* states, Sent → Viewed → Paid progress fills.
3. **Logistics** — "Every delivery, on record." Lagos → Abuja route draws itself, truck marker travels, two waybills with statuses, live tracking and proof-of-delivery chips.
4. **Taxes** — "Taxes, without the headache." Monthly tax position card: VAT tracked, WHT tracked, attention items in review. Recorded → Calculated → Ready flow. "Built from your records" chip carries the side-effect philosophy. No rates, no amounts, no deadline dates.
5. **Workspaces** — "Every business in its lane." Dark slate board, two businesses, Books/VAT/WHT/Files chips, isolation badge.
6. **Get started** — Create / Join / Sign in choice cards. Create form with validation and password meter. Submit leads to the approval-gate waiting panel.

## PRD conformance carried into v2

- Multi-tenancy v2.1 §9.4: the create flow ends in a "Waiting for approval" panel. Request received → Awaiting review → Workspace opened. The copy states that the screen updates by itself and that no success is claimed before approval. No fake progress percentages.
- Join path added: "Join a workspace" with its own email pane and invite guidance.
- Sign-in copy: "Approval status appears on sign-in — no need to recheck."
- Tax guardrails: no statutory values invented anywhere. States only.
- §9.4.4: `role="status"` live region for step announcements and approval wait. `role="alert"` error messages.

## Whole-page review applied

- Mobile: single column, safe-area insets on all four sides, 44px back/dot targets, CTA in the thumb zone, short-phone media query
- Fold (540–639px): wider gutters, layout stays single column
- ≥640px: two-column stage (art left, copy right), centered 880px content
- ≥1024px: 1040px content, larger type scale, wider bottom zone
- Bottom action bar hides on the final slide so the forms own the screen

## Motion decisions (animate skill)

- Gate: onboarding = rare/first-time tier. Delight budget spent here. Purpose: Explanation.
- Entrance reveals: 30–80ms stagger, `cubic-bezier(.23,1,.32,1)` ease-out, opacity + transform only
- Route trace and truck: transform-only travel, `--linew` custom property feeds the distance, no `left` animation
- Orbit rings: 26s/40s linear loops, reverse direction for depth
- Loops (float, flow dot, pulse): gentle amplitudes, linear or ease-in-out
- Reduced motion: full override block; flow dot parks at 52%, route trace and truck complete instantly, reveals show without movement
- Slide transitions: spring engine with velocity handoff and rubber-banding (carried from the candidate family)

## Verification

- Script block checked with `node --check`: JS PARSE OK
- Structure counts: 6 slides, 3/3 forms closed, 11/11 buttons closed, zero malformed-tag leftovers
- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: new prototype file plus pre-existing files from other agents, untouched

## Risks or limitations

- Visual verification in a browser belongs to the project lead, per instruction.
- The truck distance uses `--linew` measured at load; a resize during slide 3 recalculates it through `metrics()`.
- Deep links: `#s0` through `#s5`.

## Deferred work

- Committing the design-direction files is a separate decision.
- If adopted, the SSO buttons from the PhotoHero candidate can be added to the sign-in pane.
