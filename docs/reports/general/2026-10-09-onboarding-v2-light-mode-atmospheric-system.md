# Onboarding V2 — Light Mode Atmospheric System

This report was written by OpenCode on 2026-10-09.

## Objective

Test whether the approved onboarding visual direction holds in light mode across all five theme families, without creating another onboarding concept: preserve the existing composition while adding a genuine white-primary appearance with theme-aware cinematic gradients and glass surfaces. Ten combinations (5 families × light/dark), switchable independently inside the existing `/photohero-preview` route.

## Architecture

- The legacy preview rendered `BIGDROPS_Onboarding-PhotoHero-v2.html` through a sandboxed iframe. The iframe is replaced.
- New native React implementation inside the existing preview boundary:
  - `src/components/onboarding/photo-hero-v2-theme.ts` — family × appearance token derivation. Base tokens read live from the theme registry (`getThemePreset` for light, `getDarkVariantSemanticTokens` for dark). Dark cinematic recipe (scene gradients, fields, glass) preserved literally from the approved baseline; light uses one shared white-primary `color-mix` recipe so no per-family palette is hardcoded.
  - `src/components/onboarding/PhotoHeroV2Preview.tsx` — carousel, controls, compare matrix, preserved SVG illustrations and auth prototype. All styling is container-scoped (`oh2-` prefix); nothing touches `document.documentElement` or global tokens.
  - `src/pages/PhotoHeroPreview.tsx` — thin wrapper (shell + close). No iframe, no `?raw` import.
- No second implementation of the light-mode feature exists: the HTML reference is untouched (SHA256 `BFC077497F90E16922C466B6A08E36F83E781607E6E00955E38ABCB84EF450CD`, unchanged) and no new standalone HTML file was created. No V3/V4 artifact.

## Theme and Appearance Handling

- Family and appearance are independent React state, defaulting to Slate Navy / Dark (the baseline).
- Controls: five family buttons (swatch dot + text label, `aria-pressed`), Light/Dark buttons (Sun/Moon icon + text), Interactive/Compare mode buttons. Selection never requires reload and never writes persisted theme preferences.
- Compare mode renders all ten combinations as mini cards, each with its own vars.
- Dark appearance preserves the approved baseline gradients, fields, glass, and copy treatment.
- AA hardening (look preserved): white CTA keeps its fill with blackened primary text; light CTA is solid theme fill; pills pair mid-tone fills with near-black text; focus ring uses primary.

## Preserved Illustrations and Animations

- Five-screen sequence, approved copy, invoice/invoicing/project SVGs, glass stat cards, Lagos → Abuja tracking card with progress treatment, spring-physics swipe with rubber-banding, count-up total, reveal/float/streak/sweep motion, password meter, inline validation, prototype submits, skip/back/dots/rail, skip link, live region, arrow-key traversal.
- Animated keke intact: spinning wheels, headlight sweep, motion streaks, BX launcher artwork on the body.
- Official BX launcher artwork used unaltered via the existing icon import.

## Responsive Adjustments

- Original overlay geometry and breakpoints ported (≤620px stacked controls with pushed chrome; ≤640px-height compaction).
- Narrow-control offsets widened slightly for the three-group control bar.
- Slide text, bottom zone, and auth column gain a 680px cap on wide screens; cinematic scenes stay full-bleed.
- Forms pane scrolls internally so fields stay reachable above fixed footers and keyboards.

## Accessibility Considerations

- `aria-pressed` + text labels on all selectors (never color alone); `role=status` live announcements; labelled tabs, dots, and forms; 44px+ touch targets; visible focus ring.
- `prefers-reduced-motion` disables decorative animation and makes reveals instant; `prefers-reduced-transparency` swaps glass for opaque surfaces.
- Contrast targets are source-level (registry tokens + blackened-text formulas), not measured rendered WCAG results.

## Files Changed

- `src/components/onboarding/photo-hero-v2-theme.ts` (new)
- `src/components/onboarding/PhotoHeroV2Preview.tsx` (new)
- `src/pages/PhotoHeroPreview.tsx` (iframe wrapper replaced with native preview)
- `src/tests/critical/photoHeroV2LightMode.test.js` (new, 10 focused tests)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md` (§22.4 extended only)
- `docs/reports/general/2026-10-09-onboarding-v2-light-mode-atmospheric-system.md` (this report)

## Verification Results

- `bun run typecheck`: passed, zero errors.
- Focused test `photoHeroV2LightMode.test.js`: 10/10 pass (families, ten combos, light canvas ≥88% lightness, dark canvas ≤20%, glass ink pairing, theme-aware scenes, isolation of theme module/component/wrapper, HTML hash unchanged).
- Related `moreNavigation.test.js`: 7/7 pass (route registration untouched).
- `git diff --check`: passed (see final status).
- Static scope check: no changes to auth, Supabase, session, workspace, tenant, schema, cold-launch routing, dashboard theme, or global tokens. Pre-existing dirty file before work: `README.md` (untouched by this task). Unrelated untracked file `Design-direction/dashboard/themes/mobile-dashboard-v8.html` appeared during the session from outside this task and was left untouched.
- `bun run build`: not run (4GB RAM policy). `bun run audit:load`: not run (no schema/query/data-layer changes).

## Remaining Visual Acceptance Limitations

- No runtime screenshot pass: light-mode depth, glass legibility, and keke-on-light composition are source-level derivations awaiting human visual acceptance on device.
- Small-phone folded heights rely on ported compaction rules; physical keyboard/safe-area behavior needs on-device confirmation.
- `?` tiles in the invoice illustrations are preserved verbatim from the reference.
