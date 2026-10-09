# Onboarding PhotoHero V2 Theme Experiment Report

This report was written by Codex on 2026-10-09 via Codex desktop.

## Objective

Create a standalone PhotoHero V2 HTML experiment. The experiment keeps dark mode fixed and compares the PhotoHero visual design across five real BIGDROPS visual themes.

## Scope

The work is limited to documentation and prototype files. No production onboarding, authentication, startup, database, or application source files changed.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero-v2.html`
- `docs/reports/general/2026-10-09-onboarding-photohero-v2-theme-experiment.md`

## Skills used

Skills used: frontend-design, animate, accessibility, html, html-prototype, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Theme sources

The five theme families come from `src/lib/themePresets.ts`.

- Slate Navy uses `LIQUID_ONYX_CORE`, the dark variant of `slate-navy`.
- Amber Terracotta uses `AMBER_DARK`.
- Ocean Teal uses `TEAL_DARK`.
- Rose Gold uses `ROSE_DARK`.
- Forest Green uses `FOREST_DARK`.

The registry confirms that theme family selection is separate from light or dark mode. V2 uses the dark variants only.

## Theme-to-gradient mapping

Each theme maps its dark `bg`, `surface`, `primary`, `primaryBright`, `secondary`, and related semantic colors into local PhotoHero variables.

The mapping controls:

- Scene gradients.
- Blurred light fields.
- Hero accent fills and strokes.
- Glass tint and border highlights.
- Focus and active states.

The baseline Slate Navy mapping preserves the original dark PhotoHero feel.

## Glass styling approach

The prototype keeps the original glass recipe:

- Backdrop blur.
- Saturation.
- Translucent fill.
- Subtle border.
- Elevated shadow.

Theme changes adjust only tint, border color, and accent energy. Text contrast remains tied to dark-mode ink tokens.

## Verification

- `git status` was checked before and after.
- The original V1 file exists.
- The original V1 file has no git diff.
- `bun -e` inline-script syntax check passed.
- The V2 file contains five theme mappings.
- The V2 file contains interactive and compare modes.
- The compare mode creates five lightweight cards, not five full onboarding app instances.
- Dark presentation is fixed with `color-scheme: dark` and theme-specific dark variables.
- Reduced-motion and reduced-transparency CSS remain present.
- `bun run typecheck`, `bun run lint`, `bun run audit:load`, and `bun run build` were not run because this is a standalone HTML-only experiment and the request forbids those checks for this task.

## Supabase push status

Not applicable. No Supabase files or SQL files changed.

## Risks or limitations

- This was verified statically. A browser pass is still useful to tune the exact gradient strength on physical mobile and foldable screens.
- The original PhotoHero still uses prototype branding marks in SVG artwork. V2 preserves that source behavior because the request asked to preserve the original artwork and flow.

## Deferred work

- None.
