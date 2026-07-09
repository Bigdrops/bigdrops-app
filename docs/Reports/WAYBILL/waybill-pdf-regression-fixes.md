# Waybill PDF Regression Fixes + CSR Parity Closure

This report was written by OpenCode on 2026-07-09 via Local Runner.

**Date:** 2026-07-09  
**Verification gate:** `bun run typecheck` passed, `bun run audit:load` passed, build skipped per hardware policy

---

## Objective

Fix 5 Waybill PDF regression tickets (Issue 1: Minimal/Thermal crash, Issue 2: Premium number overflow) + 5 deferred CSR parity issues from prior audit (handwriting font parity, template defaults, documentFont capability).

---

## Scope

- Waybill PDF templates: Minimal, Thermal, Premium only (Classic/Evergreen/Slate unaffected)
- CSR customization module: `CSR_HANDWRITING_FONTS`, `CSR_TEMPLATE_DEFAULTS`, `CSR_CAPABILITIES`/`CSR_POLICY`
- CSS/Layout/Functional parity — no new features or UI additions

## Changes

### Issue 1: Minimal/Thermal `fillableBold`/`fillableColor` crash

**Root cause:** Both templates define `fillableBold` and `fillableColor` inside `createStyles()` (module-level closure), but reference them inline in JSX (component scope) where they're not accessible. Classic/Evergreen/Slate/Premium only use these inside `StyleSheet.create()` within the same function, so they work.

**Fix:** Added inline computation in component scope before `createStyles()` call:

`src/components/waybill/MinimalTemplate.tsx:305-308`:
```ts
const fillableChoice = getEffectiveFillableFont(preset)
const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
const fillableColor = preset.fillableColor || preset.textColor
```

`src/components/waybill/ThermalTemplate.tsx:317-320`: identical pattern.

### Issue 2: Premium waybill number overflow

**Root cause:** `docBox` renders waybill number at binary font-size heuristic (`> 18 ? 7 : 11`). Long numbers like `CUSTOMER-WAYBILL-2024-000001` (30+ chars) render at 7pt — still clips in the 104-wide container.

**Fix:** Three-tier heuristic at `src/components/waybill/PremiumTemplate.tsx:452`:
```
> 24 → 5.5
> 18 → 7
else → 9
```

### CSR Deferred: Handwriting font parity

**Root cause:** `CSR_HANDWRITING_FONTS` hardcoded 4 entries (`Caveat`, `Kalam`, `Patrick Hand`, `Indie Flower`), missing `Handlee` and `Sue Ellen Francisco` that Waybill's filter over `PDF_FILLABLE_FONT_OPTIONS` includes.

**Fix:** Added both at `src/pages/ViewCSR.tsx:59-60`:
```ts
{ value: 'Handlee', label: 'Handlee' },
{ value: 'Sue Ellen Francisco', label: 'Sue Ellen Francisco' },
```
Now 6 entries — matches Waybill.

### CSR Deferred: Template defaults used `font: 'Inter'`

**Root cause:** `CSR_TEMPLATE_DEFAULTS` used `font: 'Inter'` — a body font, not a valid handwriting/fillable font. This caused the dropdown to show but the engine couldn't resolve it to a registered PDF font.

**Fix:** Replaced with proper fillable fonts at `src/pages/ViewCSR.tsx:63-67`:
- Template '2': `Caveat`
- Template '3': `Patrick Hand`
- Template '4': `Handlee`

### CSR Deferred: `documentFont` capability disabled

**Root cause:** `CSR_CAPABILITIES.documentFont` and `CSR_POLICY.documentFont` both set to `false`, preventing the engine from respecting user-set document body font.

**Fix:** Set both to `true` in `src/domain/pdf/customization/csr.ts:10,19`. The resolver (`resolveSettings` in `resolver.ts:35-36`) gates on `cap && policy`, so both must be true.

### Reenie Beanie (pre-existing)

The FontKit compound-glyph buffer overflow for Reenie Beanie was already guarded by try/catch in `pdfFontRegistry.ts`. Verified — no additional changes needed.

---

## Verification

| Check | Result |
|-------|--------|
| `bun run typecheck` | Passed (0 errors) |
| `bun run audit:load` | Passed (no new findings) |
| `git status` | Only intended files modified |

## Files Modified

| File | Change |
|------|--------|
| `src/components/waybill/MinimalTemplate.tsx:305-308` | Added fillableBold/fillableColor in component scope |
| `src/components/waybill/ThermalTemplate.tsx:317-320` | Same fix |
| `src/components/waybill/PremiumTemplate.tsx:452` | Granular font-size heuristic |
| `src/pages/ViewCSR.tsx:54-67` | CSR_HANDWRITING_FONTS + CSR_TEMPLATE_DEFAULTS |
| `src/domain/pdf/customization/csr.ts:10,19` | `documentFont: true` |

## Deferred Work

No UI was added for CSR document font selection in the customize sheet — the engine now respects programmatic documentFont changes, but there's no dropdown/picker in the CSR UI. To be added when a user requests it.
