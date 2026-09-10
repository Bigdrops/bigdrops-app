# Midnight Onyx Theme Integration Report

This report was written by Buffy on 2026-09-10 via Freebuff.

## Objective

Add the user-supplied "Design System — AI Tools Discovery App" as a new theme family in the live app theme system. The theme must follow the theme PRD: token contract, light and dark variants, existing engine mechanics, and the signature gradient-black treatment.

## Scope

The theme engine only. No UI components changed. The engine derives every component token from core colors, so one new family covers all screens.

## Files changed

- `src/lib/themePresets.ts`
- `src/tests/critical/themePrdContract.test.js`
- `src/components/layout/MobileSidebar.tsx`

## Skills used

Skills used: design-system-starter
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

New family ID: `midnight-onyx`. Label: "Midnight Onyx".

### Palette mapping

The spec describes a near-black mobile app: `#0A0A0A` to `#121212` backgrounds, charcoal cards, dark blue-teal capability pills (`#1A2A3A` to `#2C3E50`), a warm ivory primary button (`#F5F0E8` to `#EDE7DF`) with dark text, white text on dark, and `#1A1A1A` text on light. Mapped into `CoreColors`:

| Core color | Dark variant (native) | Light variant | Spec source |
|---|---|---|---|
| bg | `#0a0a0a` | `#f5f5f7` | Deep Black |
| surface | `#121212` | `#ffffff` | main dark areas |
| surfaceRaised | `#1a1a1c` | `#fafafa` | light gray cards |
| surfaceMuted | `#1f1f23` | `#f0f0f2` | `#F0F0F2` Gemini card tone |
| surfaceStrong | `#2c3e50` | `#e4e4e8` | navy pill range |
| ink | `#ffffff` | `#1a1a1a` | spec text tokens |
| ink2 | `#9ca3af` | `#6b7280` | muted `#6B7280` to `#9CA3AF` |
| primary | `#ffffff` | `#2c3e50` | white pill CTA (dark) / navy pill (light) |
| secondary | `#24425c` | `#1a2a3a` | capability pills, gradient deep stop |
| attention | `#f87171` | `#ef4444` | red notification dot |

### Decisions and assumptions

1. Dark is the native mode of the spec. The light variant inverts the same roles. The white pill primary in dark mode carries dark text through the luminance-aware foreground derivation, so buttons read as the reference image's white pills.
2. The gradient uses primary to secondary at 135 degrees per PRD: navy to deep teal in light, ivory to blue-teal in dark.
3. Lines follow the codebase rule: ink-based rgba at .07/.14 light and .08/.16 dark. Nav uses the same rule.
4. Status, success, and warning constants stay shared with other families. The spec does not define them.
5. Registry mapping rules do not apply. This family is not a ShadcnBlocks theme; values come from the user spec.

### Gradient black retention

The spec defines a signature gradient-black hero treatment: black to charcoal with blue undertones. The default PRD gradient formula (primary to secondary) did not retain it, because the dark primary is a light CTA color.

The spec defines a signature gradient-black hero treatment: black to charcoal with blue undertones. The default PRD gradient formula (primary to secondary) did not retain it, because the dark primary is a light pill fill. Fixes applied:

1. `makePreset` takes an optional `semanticOverrides` argument. The preset passes the dark gradient through a new `DARK_SEMANTIC_OVERRIDES` map: `linear-gradient(135deg, #0a0a0a 0%, #14161d 55%, #1e2b40 100%)`. `getDarkVariantSemanticTokens` merges the map. The light gradient keeps the PRD formula (navy to deep teal).
2. The only `var(--gradient)` consumer, `MobileSidebar.tsx`, wrapped the token in `hsl()`. That is invalid for a gradient value, so no theme gradient ever rendered. Fixed with the Tailwind data-type hint `bg-[image:var(--gradient)]`.

### Reference-image parity pass

A reference image set a higher bar: serif italic display type, warm cream light surfaces, pure white pill CTAs, soft blue accents, and gradient-black hero panels. Changes made to match:

1. Serif display voice. The preset overrides `bd-font-display-family` to `'Source Serif 4'`, weight 400, tracking -0.02em. Source Serif 4 ships with italic axes in `index.html`. Body type stays Manrope. Both modes carry the override through `DARK_FOREGROUND_OVERRIDES`.
2. Cream light mode. Light `bg` moved from cool gray `#f5f5f7` to warm cream `#f5f2ec`, per the image's middle screen.
3. Soft blue accent. `sage` now carries the image's steel blue (`#7da2c6` light, `#8fa9c4` dark) with a soft tint `sageSoft`.
4. White pill CTA in dark mode. Dark `primary` moved from ivory to `#ffffff` so buttons and the pricing CTA read as the image's white pills. The gradient-black override is untouched, so the hero panel keeps its black treatment.
5. Fill-to-text contrast fix. New `readableOn()` helper picks dark or white text by fill luminance. It replaces hardcoded white text on `primary-foreground`, button, nav, action-icon, FAB, brand, and accent tokens. This fixes a latent bug: a light fill (ivory, light blue) previously got white text and failed contrast.

### Registration sites

All edits stay inside the established structure:

1. `MIDNIGHT_LIGHT` and `MIDNIGHT_DARK` core color blocks, placed after `COCOA_DARK`.
2. `"midnight-onyx"` added to `ADDITIONAL_THEME_IDS`.
3. `makePreset(...)` entry in `THEME_PRESETS` after `warm-cocoa`.
4. `"midnight-onyx": MIDNIGHT_DARK` in `DARK_VARIANTS`.
5. Family added to the contract test `SELECTABLE_FAMILIES` list.

No other file needs the ID. `SELECTABLE_THEME_PRESETS` filters `THEME_PRESETS`, so the Settings UI lists the new theme without changes. No component hardcodes family IDs.

## Verification

- `bun run typecheck`: passed (exit 0)
- `bun test src/tests/critical/themePrdContract.test.js`: 7 pass, 0 fail. The family passes the full PRD token check in light and dark, both variants expose the same token set, the dark gradient starts from `#0a0a0a`, the ivory-era fill carries dark text, and the serif display voice loads in both modes.
- `bun run audit:load`: passed
- `bun run test`: 288 pass, 4 fail. The 4 failures are pre-existing accounting suites from another agent's in-flight work. They fail without my changes and I did not touch them.

## Risks or limitations

- The light variant is an inversion, not a spec screen. The spec shows dark screens only. Contrast pairs are safe, but the light look is a judgment call.
- `surfaceStrong` in dark mode is a saturated navy pill color. Components that use it for borders get a tinted edge. This matches the spec's pill aesthetic but differs from other families, which use a neutral strong surface.

## Deferred work

- No commit made. The working tree holds staged work from other agents; committing needs a separate instruction.
- A settings-panel screenshot pass in both modes is left to manual review.
