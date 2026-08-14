# Divine Blood Design Selection Report

This report was written by Buffy on 2026-08-14 via Freebuff.

## Objective

Select the design specification for the Bigdrops app design overhaul.

Compare two design documents:

- `docs/TEMPLATES/Designsdotmds/Divine-blood.md`
- `docs/TEMPLATES/Designsdotmds/reprise.md`

Evaluate each document against the actual application. Choose one design as the foundation. Do not combine both designs into one system.

The chosen design must support exactly two visual modes: Light and Dark.

## Scope

This report covers:

- The two design documents
- The current application structure
- The current theme system
- The current responsive behavior
- The current navigation and component system
- The current CSS and token architecture
- The file decision for the canonical design specification

This report does not change application code. It only changes design documentation.

## Files Changed

- Modified: `docs/TEMPLATES/Designsdotmds/Divine-blood.md`
- Deleted: `docs/TEMPLATES/Designsdotmds/reprise.md`
- Added: `docs/reports/Ui-Ux/divine-blood-design-selection-report.md`

Note: `docs/TEMPLATES/Designsdotmds/Reprise-blood.md` did not exist. Git history shows it was deleted in commit `67ec5d04`. The current Reprise design document was `docs/TEMPLATES/Designsdotmds/reprise.md`.

Note: Divine-blood.md was rewritten by the project lead on 2026-08-14. The new version is a full design system. It defines concrete color tokens, typography, motion, an AI assistant persona, and exactly two modes. This report reflects the new version.

## Skills Used

- redesign-existing-projects

## Documentation Standard

ADS-STE100 Simplified Technical English

## Design Recommendation

Use Divine Blood as the foundation.

Divine Blood is an adaptive design system. It describes one interface that transforms across device classes. It matches the actual application architecture.

Reprise is a style reference for one specific screen. It describes a bond-market terminal with a golden-hour photographic wallpaper. It is light-mode only. It has no responsive, dark-mode, or accessibility rules.

## Why

### Technical reasons

The application is a multi-device B2B suite. It runs on mobile, tablet, desktop, and Android foldables. It already implements most of the Divine Blood architecture:

- `src/components/app/AndroidFoldAwareness.tsx` applies fold geometry and layout mode
- `src/components/layout/MobileBottomNav.tsx` provides bottom navigation
- `src/components/layout/DesktopSidebar.tsx` provides the desktop sidebar
- `src/components/layout/MobileSidebar.tsx` provides the mobile drawer
- `src/components/Layout.tsx` manages the shell
- `src/index.css` handles safe-area insets and reduced motion
- `src/pages/DashboardRedesign.tsx` provides the FAB and quick actions

Divine Blood describes rules for these exact patterns. Adoption is mostly alignment, not a rewrite.

Reprise describes components that do not exist in the app. Examples:

- Royalty calendar
- Coupon list
- Bond details panel
- Risk overview panel
- AI credit signal panel
- Use of funds allocation

Reprise would require building a new visual world and new components. This creates high implementation cost and high design debt.

### Theme system reasons

The app currently has two theme layers:

1. `next-themes` with `defaultTheme="system"` and `enableSystem` in `src/main.tsx`
2. A preset system in `src/lib/themePresets.ts` with 29 fixed presets plus a custom mode

The theme settings UI is in `src/pages/settings/AppThemeSettingsSection.tsx`. The preset bundles apply through `src/lib/themeTokens.ts` from `AppThemeManager` in `src/components/app/AppShell.tsx`.

This architecture conflicts with the two-mode requirement. It must be simplified.

Divine Blood defines the exact color hierarchy for two modes:

- Light: White and Gold lead. Crimson supports.
- Dark: Black and Crimson lead. Gold supports.

This maps directly onto the existing `:root` and `.dark` token structure in `src/index.css`. The mode names in the document now use `Light` and `Dark`.

Reprise has no dark-mode tokens. It cannot support the two-mode requirement.

### Responsive reasons

Divine Blood defines breakpoints, device frames, touch targets, safe areas, orientation, and fold handling. The app already has these mechanisms:

- `src/hooks/FoldAwareness.ts` for fold geometry
- `data-layout-mode` on the html element
- Safe-area CSS variables
- Keyboard awareness in `src/components/app/KeyboardAwareness.tsx`

Reprise has no responsive rules at all.

## What to Keep

Keep the following Divine Blood ideas:

- One adaptive system with progressive layout transformation
- Breakpoint tiers at 640px, 1024px, and 1440px
- Mobile: bottom navigation, drawer, single column, compact hero
- KPI: 2 by 3 grid or horizontal scrolling on mobile
- Right rail becomes a bottom sheet or accordion on mobile
- 56px FAB for ReprAI on mobile
- Fold cover and flip cover treated as compact mobile
- Fold inner portrait treated as compact tablet
- Fold inner landscape treated as compact desktop
- Tablet: collapsible sidebar or icon rail
- Desktop: full three-region layout
- Safe-area support with `env(safe-area-inset-*)`
- Minimum 44px touch targets on coarse pointers
- Reduced-motion support
- Responsive typography and spacing scales
- QA matrix for target resolutions

## What the New Document Resolves

The rewritten document resolves most gaps from the first assessment:

1. Mode naming: the document now uses only `Light` and `Dark`. It explicitly forbids separate Gold Light and Crimson Dark themes.
2. Concrete tokens: the document defines full light and dark token sets (`--db-canvas`, `--db-surface`, `--db-ink`, `--db-gold-*`, `--db-crimson-*`, semantic status colors).
3. Typography: the document specifies Instrument Sans for UI and Berkeley Mono for data, with a full type scale.
4. Responsive architecture: mobile, tablet, desktop, wide, fold, and flip rules remain.
5. Accessibility, motion, reduced motion, focus, loading, empty, and error states are defined.

## What to Resolve Before Implementation

Resolve the following conflicts between the new document and the app:

1. Primary color conflict. The app uses blue as the brand primary (`--primary: 225 75% 48%`). The document forbids blue as a brand accent. Re-map `--primary`, `--ring`, and the `tone-*` tokens to gold and crimson.
2. Token layer mapping. The document defines `--db-*` tokens. The app uses shadcn triplets and a `--bd-*` bridge. Map `--db-*` onto the existing layers or replace them. Do not maintain two parallel systems.
3. Dark selector. The document uses `[data-theme="dark"]`. The app uses the `.dark` class through `next-themes` with `attribute="class"`. Align these, either by switching the attribute or by writing the dark tokens under `.dark`.
4. Font loading. Neither Instrument Sans nor Berkeley Mono is loaded. The app loads many families in `src/main.tsx` and `index.html`. Trim to the two approved families. Berkeley Mono is commercial. Confirm licensing before production.
5. Steward entry points. The document defines Steward as an AI assistant with a FAB on mobile and a top-bar action on desktop. The app has no assistant. The mobile FAB currently opens the Create action sheet. Decide FAB ownership and the Steward surface.
6. Living material. The document defines blood and liquid gold motion. The app has `circuit-board.tsx` as a canvas precedent. Use CSS or canvas. Do not use framer-motion, which AGENTS.md forbids in production.
7. Fold awareness. Keep `data-layout-mode` and fold bounds from `AndroidFoldAwareness` as the hinge source.

## What to Remove

Remove the following legacy theme architecture:

1. `src/lib/themePresets.ts` and its 29 presets
2. `src/lib/themeTokens.ts` bundle machinery
3. `AppThemeManager` preset application in `src/components/app/AppShell.tsx`
4. `AppThemeSettingsSection` preset picker in `src/pages/settings/AppThemeSettingsSection.tsx`
5. The `app_theme_preset_id` and `app_theme_tokens` settings columns
6. `defaultTheme="system"` and `enableSystem` in `src/main.tsx`
7. `prefers-color-scheme` logic in `src/components/app/AndroidSystemBars.tsx`
8. `prefers-color-scheme` logic in `src/components/ui/circuit-board.tsx`
9. The `theme = 'system'` fallback in `src/components/ui/toaster.tsx`
10. Preset-driven font loading in `index.html` and `src/main.tsx`
11. The compliance test `src/tests/compliance/complianceThemePresetRegression.test.js`, which locks preset names
12. The palette helper tokens for amber, indigo, emerald, rose, and violet in `tailwind.config.js`, if unused

The OS preference may be used once as the initial default. After the user chooses Light or Dark, persist that choice.

## Migration Plan

1. Freeze preset application. Remove `AppThemeManager` preset logic.
2. Define the Divine Blood Light and Dark token sets in `src/index.css`. Re-map the brand primary from blue to gold and crimson.
3. Change `next-themes` to only light and dark. Remove the system option. Align the dark selector with the document.
4. Replace the theme settings UI with a two-option selector.
5. Delete the preset modules and unused settings columns.
6. Remove `prefers-color-scheme` consumers. Use the resolved mode instead.
7. Trim fonts to Instrument Sans and Berkeley Mono. Confirm the Berkeley Mono license.
8. Remove or rewrite the preset regression test.
9. Align the existing responsive architecture to the Divine Blood breakpoints and device rules.
10. Build the Steward entry points and the living material layers. Respect reduced motion.

## Verification Result

- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: two documentation changes present (delete of reprise.md, edit of Divine-blood.md)
- `bun run build`: skipped due to hardware policy

## Risks or Limitations

- Berkeley Mono is commercial. Confirm its license before locking it as a production asset. The document itself flags this.
- The app brand primary is blue. Re-mapping it to gold and crimson affects every button, link, focus ring, and tone token.
- The dark selector differs between the document and the app. Align it before writing dark tokens.
- Existing tenant rows may still contain `app_theme_preset_id` and `app_theme_tokens` values. The app must stop reading them without failing.
- The compliance test locks preset names. It must be updated at the same time as the preset removal.
- Steward and living material are new product surfaces. The app has no assistant today. Do not block the theme migration on them.

## Deferred Work

- The actual UI implementation
- The token value definitions
- The font-family selection
- The light and dark token sets
- The settings UI replacement
- The preset module deletion
