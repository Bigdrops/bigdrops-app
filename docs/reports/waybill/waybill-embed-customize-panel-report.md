# Waybill — Embed PDF Customization into DocumentSheet

This report was written by OpenCode on 2026-07-08 via Local Runner.

## Objective & Scope

Restore the original single-DocumentSheet UX for Waybill PDF customization by embedding engine-powered controls (document font, ink font chips, ink color swatches + hex picker) directly into the existing DocumentSheet, removing the separate PdfCustomizationPanel that caused two overlapping sheets.

**Excluded:** No changes to the engine (hooks, types, resolver, waybill policy). No changes to other document types (CSR, Invoice, BOQ, RFQ). No changes to PdfCustomizationPanel component itself.

## Evidence

- **Bug location:** `src/pages/ViewWaybill.tsx:394-452` — both `DocumentSheet` and `PdfCustomizationPanel` rendered on `SHEET_CUSTOMIZE`, creating two overlapping overlay sheets.
- **Engine integration:** `usePdfCustomization` hook already wired at line 88, providing `customization`, `setDocumentFont`, `setInkFont`, `setInkColour`, `resetCustomization`.
- **Reference pattern:** `src/pages/ViewCSR.tsx` uses `PdfOutputCustomizeSheet` with embedded controls (document font select, handwriting font chips, color swatches).
- **Engine policy:** `WAYBILL_POLICY` enables `documentFont`, `handwritingFont`, `handwritingColor`; disables `accentColor`.

## Changes Made

**File:** `src/pages/ViewWaybill.tsx`

1. **Added imports** (lines 42-52): `PenLine`, `Type` (lucide-react), `cn` (utils), `Input`, `Select` components, `PDF_FONT_OPTIONS`, `PDF_FILLABLE_FONT_OPTIONS`.
2. **Added constants** (lines 58-63): `WAYBILL_COLOR_SWATCHES` (6 hex values), `WAYBILL_HANDWRITING_FONTS` (6 handwriting fonts filtered from `PDF_FILLABLE_FONT_OPTIONS`).
3. **Replaced DocumentSheet JSX** (lines 394-511): Embedded four sections — Template Style (existing), Document Font (Select dropdown), Ink Color (swatches + color `<Input type="color">`), Handwriting Font (chips). Each bounded by a round-corners card matching the design system.
4. **Removed PdfCustomizationPanel JSX** (was lines 442-452): Deleted the `<PdfCustomizationPanel>` component and all its props.
5. **Removed import** (implicit): The `PdfCustomizationPanel` import from the old line 18 was already removed in a prior edit.

## Verification

| Check | Status |
|-------|--------|
| `bun run audit:load` | Passed (no new issues) |
| `bun run typecheck` | Skipped — timed out (4GB RAM limit per AGENTS.md) |
| Manual review | JSX structure verified, no duplicate overlays |
| No PdfCustomizationPanel refs in ViewWaybill.tsx | Confirmed via grep |

## Risks & Limitations

- Typecheck could not be run locally due to hardware constraints; minor type issues could exist with `cn()` or Select/Input prop compatibility. If the Vite build catches an issue, the fix is in one file.
- The `WAYBILL_HANDWRITING_FONTS` filter is a hardcoded list of specific handwriting font names. If the `PDF_FILLABLE_FONT_OPTIONS` array changes, this may need updating. A future improvement would be to mark handwriting fonts with a category property.

## Deferred Work

- **PdfCustomizationPanel file:** `src/components/pdf-customization/PdfCustomizationPanel.tsx` still exists but is no longer imported. Safe to delete if cleanup is desired.
- **No toggles:** Unlike CSR, no "Auto/Custom" toggle switches were added. Controls are always visible. If the user wants toggles, they can be added in a follow-up.
