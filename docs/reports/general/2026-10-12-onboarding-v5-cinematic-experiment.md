# BOURXE Onboarding V5 Cinematic Experiment

## Reference analysis

Required files inspected:

- `BOURXE_Ultimate_Onboarding.html`: strongest source for business-specific SVG scenes, chapter wipe, logistics vehicle, document press, finance processor, field-service equipment and auth form structure.
- `claude-v2.html`: useful compact mobile stage, tab rail, interruptible chapter movement, safe-area handling and form scroll behavior.
- `deepseek.html`: useful drag-aware carousel, richer auth validation states, reduced-motion checks and polished state-driven scene controls.
- `cta-index.tsx`: useful phone-shell CTA composition and tactile button treatment, but not reused as a card layout.
- `error1.tsx`: useful large typographic SVG treatment and pill button depth.
- `hero-index38.tsx`: useful cinematic entrance choreography, staggered copy and press feedback.
- `auth1.tsx`: useful split auth panel rhythm, Google button treatment and form hierarchy.
- `cta-demo.tsx`: useful CTA data rhythm only. The generic metrics were not reused.

## V5 visual concept

V5 uses a connected operations foundry: one continuous animated world where workspaces, commercial machinery, finance routing, logistics movement and field service occupy the same business floor. The opening is not a building hero. It presents a moving operating environment with dimensional platforms, machinery, a carrier, a road, service equipment and a final command surface.

## Scene motion

- Arrival: a wide business floor introduces scale with several active operational zones visible together.
- Chapter 1: independent workspace structures separate and settle into coordinated positions.
- Chapter 2: a document press moves requests across rollers into priced and approved paperwork.
- Chapter 3: a finance core routes VAT, WHT, payments and visibility as connected operational outputs.
- Chapter 4: a logistics truck travels across a road with cargo loading, road motion, city parallax and waybill progress.
- Chapter 5: a technician works on equipment while diagnostics run and a service report check is drawn.
- Conversion: chapter lanes converge into a command surface with the operating system mark completing the story.

Reduced motion keeps the full scene visible and disables continuous movement.

## Navigation and auth

The welcome screen has one primary story action: `Explore BOURXE`. A separate `Sign In` entry is available for returning users. Story navigation supports previous, next, chapter revisit and explicit skip. `Get Started` only appears at the conversion stage and opens Sign Up.

Sign In and Sign Up are separate presentation screens. Both include `Continue with Google`. All auth actions are local to the preview and call no Supabase methods, OAuth redirects or data mutations. Google OAuth is therefore an integration dependency for production wiring, not active in V5.

## Theme and viewport integration

V5 uses the existing Design Lab theme layer:

- Slate Navy
- Amber Terracotta
- Ocean Teal
- Rose Gold
- Forest Green

It supports Light and Dark appearance, uses the shared `ViewportStage` and `ViewportSwitcher`, and keeps the compact Dashboard-style customization controls outside the simulated surface. The component never reads `viewport.width` directly.

## Files changed

- `src/components/onboarding-v5/onboarding-v5-preview.tsx`
- `src/pages/OnboardingV5Preview.tsx`
- `src/lib/designLabPreviews.ts`
- `src/components/app/AppShell.tsx`
- `src/tests/critical/onboardingV5.test.js`
- `docs/reports/general/2026-10-12-onboarding-v5-cinematic-experiment.md`

## Skills loaded

- `design-artifact`
- `redesign-existing-projects`
- `ui-ux-pro-max`
- `emil-design-eng`
- `animate`
- `animation-vocabulary`
- `review-animations`
- `prototype`
- `mobile-app-ui-design`
- `mobile-android-design`
- `safe-area-handling`
- `accessibility`
- `signup`
- `react-dev`
- `typescript-advanced-types`
- `karpathy`

## Verification

Passed:

- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/onboardingV5.test.js`
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/designLab.test.js src/tests/critical/designLabViewports.test.js src/tests/critical/onboardingV4.test.js`
- `bun run typecheck`

Not run:

- `bun run build`, prohibited by the hardware gate.
- `bun run audit:load`, not required because no data layer, schema or query logic changed.

## Human visual review required

Static checks do not prove visual quality. Please review `/design-lab/onboarding-v5` across all Design Lab viewports and both appearances before accepting the art direction, animation timing, mobile composition and auth field readability.
