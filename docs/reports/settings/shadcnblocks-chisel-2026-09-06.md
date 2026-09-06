# ShadcnBlocks Theme Chisel Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Chisel ShadcnBlocks registry themes into the BIGDROPS theme registry.
- Preserve the color-only contract, persistence, selector, and dark model.

## Scope

- `src/lib/themePresets.ts` only. No engine, selector, persistence, or styling changes.

## Files changed

- `src/lib/themePresets.ts`
- `docs/reports/settings/shadcnblocks-chisel-2026-09-06.md` (this report)

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Sources

- Official registry JSON per theme: `https://www.shadcnblocks.com/r/theme/{name}`.
- 12 of 13 themes fetched with full light plus dark tokens. Dark variants confirmed for all fetched themes.
- Alpine excluded: registry returns 401 without a Pro license key.
- oklch values converted to hex with a verified converter (citrus primary reproduces published `#b8e954`).

## Registered themes

- citrus, vercel, supabase, linear, claude, claymorphism, amber-minimal, cleanslate, falcon, modern-minimal, shadcnblocks, shadcn-default.
- Each has a light preset entry plus a dark variant entry.
- IDs added via `SHADCN_THEME_IDS` into `ALL_THEME_IDS`. Selector and persistence pick them up with no further changes.

## Mapping rules

- Official values used for background, surface, ink, primary, secondary, muted, attention, line, and nav.
- `surfaceRaised` equals card. `surfaceStrong` and `sageSoft` equal muted. `sage` equals secondary.
- `ink3` equals the oklch midpoint of muted-foreground and border, stored as hex.
- `line` and `lineStrong` follow the codebase rgba-of-ink convention.
- `attentionSoft` uses codebase constants. Fonts, radius, spacing, and shadows stay theme-invariant per PRD.
- Official primary and secondary foreground pairs override derived values in light and dark.

## Verification

- Selector: reads `SELECTABLE_THEME_PRESETS`. New IDs included automatically.
- Persistence: validates through `isThemePresetId`. New IDs accepted.
- Application: `AppShell` resolves presets and dark variants by ID only. No branching by theme.
- `bun run typecheck`: zero errors in changed files. One pre-existing failure in another agent's untracked `remediationContract.test.js` (syntax errors, untouched per concurrency rules).
- `bun run audit:load`: skipped (no data-layer logic touched).
- `bun run build`: not run (hardware policy).
- No runtime device check. Selector rendering and switching await human verification.

## Limitations

- Alpine (Pro) not implemented. Registry requires a license key.
- Stripe (Pro) not requested and not implemented.
- Derived tokens (ink3, surface steps) follow documented rules, not published values.
- Derived hex values round to 8-bit color. Sub-perceptual drift possible.
