# PhotoHero Preview and Gradient Glass Direction Report

This report was written by Codex on 2026-10-09 via Codex Desktop.

## Objective

Create an application-hosted PhotoHero V2 preview. Replace prototype letter branding with official BIGDROPS app icons. Align the Cold Launch preview atmosphere with the PhotoHero V2 gradient and glass direction. Record the proposed direction in the Adaptive PRD.

## Scope

This task changed preview and documentation surfaces only. It did not change production authentication, onboarding, startup readiness, Supabase schema, or business calculations.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero-v2.html`
- `src/pages/PhotoHeroPreview.tsx`
- `src/components/app/AppShell.tsx`
- `src/components/layout/navData.ts`
- `src/components/Layout.tsx`
- `src/pages/MoreOptions.tsx`
- `src/pages/ColdLaunchPreview.tsx`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/17-app-entry-and-onboarding.md`
- `docs/reports/general/2026-10-09-photohero-preview-gradient-glass-direction.md`

## Skills used

Skills used: frontend-design, animate, accessibility, html, html-prototype, react-dev, typescript-advanced-types, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Replaced fake lowercase `b` marks in PhotoHero V2 with the official BIGDROPS launcher icon.
- Added `/photohero-preview` as an authenticated application preview route.
- Exposed PhotoHero Preview in the same preview navigation areas as Cold Launch Preview.
- Wrapped the standalone PhotoHero V2 HTML in a sandboxed iframe that uses the same HTML source.
- Kept PhotoHero V2 theme switching local to the prototype. It does not write the user's saved app theme.
- Updated Cold Launch preview atmosphere only: dark gradient foundation, theme-aware light fields, glass controls, and glass close button treatment.
- Preserved the approved Cold Launch tree component, topology, signal behavior, connection-error behavior, retry behavior, variants, and guidance layout.
- Added `Cinematic Gradient & Glass Surface Direction` to the Adaptive app-entry and onboarding PRD.

## Official logo assets

The preview uses:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png`

This export is 192 x 192 px and is suitable for small UI logo placements. It avoids scaling the App Store or Play Store marketing images into normal interface marks.

## Theme mapping

The five-theme PhotoHero mappings remain grounded in `src/lib/themePresets.ts`:

- Slate Navy uses `LIQUID_ONYX_CORE` for the dark presentation.
- Amber Terracotta uses `AMBER_DARK`.
- Ocean Teal uses `TEAL_DARK`.
- Rose Gold uses `ROSE_DARK`.
- Forest Green uses `FOREST_DARK`.

Cold Launch uses the live semantic theme bridge. HSL channel tokens are wrapped with `hsl(var(--token))`.

## Verification result

- `git status`: captured before changes and after changes.
- Original PhotoHero V1 diff: no changes.
- PhotoHero V2 static script parse: passed.
- Fake `b` branding search in PhotoHero V2: no remaining fake lettermark matches.
- Official logo path count in PhotoHero V2: 5 references.
- Preview route search: `/photohero-preview` registered in route and navigation surfaces.
- `bun run typecheck`: passed.
- `bun run build`: not run. The hardware policy prohibits it.

## Supabase push status

Not applicable. No schema, query, RLS, RPC, or data-layer logic changed.

## Risks or limitations

- The PhotoHero V2 HTML still inherits external Google Font links from V1.
- The app-hosted preview uses a sandboxed `srcDoc` iframe. This isolates prototype scripts from application state, but the iframe source is bundled HTML rather than a separately deployed static document.
- Cold Launch visual verification was source-based in this run. A browser feel-check can still tune gradient strength per theme.

## Deferred work

- Visual screenshot review across Mobile, Fold, and Desktop.
- Optional static-hosted preview document if the team wants a direct same-origin URL instead of bundled `srcDoc`.
