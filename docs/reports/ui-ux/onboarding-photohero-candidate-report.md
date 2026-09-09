# Onboarding Photo-Hero Candidate Report

This report was written by Buffy on 2026-09-09 via Freebuff.

---

## Objective

Build a third onboarding HTML candidate that keeps the user-supplied reference concept (cinematic photo-style heroes, floating glass stat cards, auth tabs, SSO buttons) but rebuilt to pass the Facelift PRD and the quality bar of the two existing prototypes. Visual verification stays with the user.

## Scope

- New file: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero.html`
- Reference input: user-pasted 4-slide onboarding HTML (Unsplash backgrounds, glass overlays, SSO).
- The two existing prototypes were not modified in this task.

## Skills used

Skills used: apple-design, animate, shadcn-ui (loaded for component patterns; not directly applicable to a standalone HTML prototype)
Documentation standard: ASD-STE100 Simplified Technical English

## Files changed

- `BIGDROPS_Onboarding-PhotoHero.html` — new file (the only change).

## Changes made

### Kept from the user's reference

- Cinematic full-bleed hero backgrounds with content over them.
- Floating glass stat cards (invoice card with rows; shipment progress card with driver and vehicle).
- Auth slide with Sign Up / Sign In tabs, Google and Apple SSO buttons, "or continue with email" divider, forgot-password link.
- 5-slide story: Intro → Invoicing → Logistics → Projects → Sign Up.

### Fixed against the reference (PRD and quality conflicts)

| Reference issue | This file |
|---|---|
| Blue accent `#2563eb`, not PRD palette | Slate-navy locked tokens, light + Liquid Onyx dark |
| Hotlinked Unsplash photos (fragile, off-brand) | Self-contained layered SVG scenes over CSS gradient "photo" backdrops with vignettes and blurred light blobs |
| Hard-coded `VAT (7.5%)` on a marketing surface | "VAT — Applied" (Tax PRD: no invented statutory values) |
| Button-only navigation, CSS-transition track | Spring swipe engine: 1:1 tracking, rubber-band edges, momentum projection (0.998), velocity handoff, interruptible spring (response 0.42s), flick veto ±350 px/s |
| No safe areas | `env(safe-area-inset-top/bottom)` everywhere; 640px small-phone query |
| Unlabeled inputs, inline onclick dots, no status region | Labelled fields, `aria-invalid`/`aria-describedby`, tablist/tabs with `aria-selected`, `role="status"` step announcer, skiplink, focus-visible |
| No reduced motion | Full reduced-motion block; `prefers-reduced-transparency` gives the glass card a solid fallback |
| No loading/disabled states | Busy spinner + disabled state on both auth CTAs |

### Animation decisions (animate skill)

- Gate: onboarding = rare/first-time tier; purpose = Explanation.
- Glass cards materialize with a blur-to-sharp rise (700ms, `cubic-bezier(.22,1,.36,1)`), rows stagger 45–110ms, progress bar scaleX 0→1.
- Van reuses the night-road treatment: headlight beam sweep, motion streaks, spinning wheels, soft radial shadow.
- Properties: transform/opacity/filter only; entrances ease-out; loops linear or ease-in-out; no `ease-in` anywhere.

## Verification result

Verification:
- Visual verification: left to the user per standing instruction. Not executed.
- Code review pass done: fixed one missing keyframe (`growW`) after write.
- bun run audit:load / typecheck: not applicable (docs prototype only)
- git status: new untracked file only; other agents' modified src files untouched

Deep links: `#s0`–`#s4` (e.g. `BIGDROPS_Onboarding-PhotoHero.html#s4` opens the auth slide directly).

## Risks or limitations

- The "photo" feel is CSS gradients + blur blobs, not raster photography. If real photos are wanted later, self-hosted WebP images should replace the `.scene` backgrounds — layout will not change.
- SSO buttons are prototype-only; wiring is Supabase OAuth in the app.
- Chrome (top bar, rail, dots) switches to a light variant over the auth slide; if the user prefers the dark-on-light look, one class toggle set controls it.

## Update 2026-09-09 (same day)

The night-road hero vehicle changed from a van to a branded keke tricycle (yellow body, navy band, three spinning wheels, headlight beam kept). Unused van body gradient removed.

## Deferred work

- User visual review on devices.
- Candidate selection: 6-slide brand prototype, 7-slide Tax Ease, or this 5-slide photo-hero.
- Optional self-hosted photography pass if the gradient scenes do not hit the mark.
