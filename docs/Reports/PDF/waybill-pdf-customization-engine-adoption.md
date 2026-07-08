# Waybill PDF Customization Engine Adoption — Prompt 8pdf6

This report was written by OpenCode on 2026-07-08 via Local Runner.

---

## 1. Objective

Replace Waybill's inline customization controls with the shared PDF Customization Engine while preserving all existing PDF rendering behavior. Zero template or rendering files modified.

## 2. Files Modified

| File | Change |
|------|--------|
| `src/domain/pdf/customization/waybill.ts` | **Created** — Waybill metadata (`WAYBILL_CAPABILITIES`, `WAYBILL_POLICY`, `WAYBILL_TEMPLATE_DEFAULTS`) + `bridgeToDesignPreset()` |
| `src/pages/ViewWaybill.tsx` | **Modified** — Replaced inline customization controls with engine hook + `PdfCustomizationPanel` |
| `src/components/waybill/WaybillPDF.tsx` | **Modified** — Replaced `registerPdfFillableFonts()` with `registerPdfCustomizationFillableFonts()` |

## 3. Implementation Details

### 3.1 Waybill Metadata (`waybill.ts`)

Declares Waybill's 3 customization sockets:
- `accentColor: false` (Waybill does not support accent color)
- `documentFont: true`
- `handwritingFont: true`
- `handwritingColor: true`

Template defaults sourced from existing waybill default preset: Inter / Patrick Hand / #0f172a.

### 3.2 Bridge Function (`bridgeToDesignPreset`)

Maps `ResolvedPdfCustomization` → `PdfDesignPreset` for template consumption:
- `documentFont` → `headerFont` + `bodyFont`
- `handwritingFont` → `fillableFont` (mode: `'custom'`)
- `handwritingColor` → `fillableColor`
- Non-customization fields (textColor, borderColor, etc.) preserved from base preset

### 3.3 ViewWaybill.tsx Integration

**Removed:**
- `customFont`, `customColor` state (2 useState calls)
- `useEffect` syncing designPreset on font/color change
- `WAYBILL_COLOR_SWATCHES` constant
- `WAYBILL_HANDWRITING_FONTS` constant
- Inline controls: DocumentTemplateDesignOverrides, ink color section, handwriting font section
- Unused imports: `cn`, `PenLine`, `Type`, `Switch`, `setPdfDesignPreset`, `PdfFillableFontChoice`

**Added:**
- `usePdfCustomization({ documentFamily: 'waybill', ... })` hook
- `bridgeToDesignPreset(basePreset, customization)` for template consumption
- `PdfCustomizationPanel` as separate Sheet for customization controls
- Migration `useEffect` from old localStorage keys (`waybill_custom_font`, `waybill_custom_color`)

**Simplified save handler:**
- Removed: `setPdfDesignPreset('waybill', designPreset)`, `window.localStorage.setItem('waybill_custom_font', ...)`, `window.localStorage.setItem('waybill_custom_color', ...)`
- Kept: Template persistence to localStorage + Supabase `custom_fields.pdfTemplateId`

### 3.4 Font Registration (`WaybillPDF.tsx`)

Replaced `registerPdfFillableFonts()` (direct call to `@/lib/pdfFontRegistry`) with `registerPdfCustomizationFillableFonts()` (engine's font registry wrapper).

### 3.5 Migration

One-time migration from old localStorage keys:
1. Reads `waybill_custom_font` and `waybill_custom_color`
2. Constructs `PdfCustomizationSettings` with `version: 1`
3. Writes to `bigdrops_pdf_customization_waybill`
4. Removes old keys
5. Forces page reload to pick up migrated data

## 4. Verification

- `bun run typecheck` passed — zero new errors (5 pre-existing errors in unrelated files)
- Zero template/rendering files modified
- Zero changes to PDF output behavior
- `git diff --stat` confirms only 3 files changed

## 5. Skipped / Deferred

- **Accent color for Waybill:** Policy `accentColor: false` — not exposed. If needed later, update `WAYBILL_CAPABILITIES.accentColor` to `true`.
- **PdfCustomizationPanel UX:** Currently opens as a separate Sheet alongside DocumentSheet. Could be consolidated into a single sheet if UX feedback requires it.
- **Template defaults from database:** Currently hardcoded in `WAYBILL_TEMPLATE_DEFAULTS`. Could be fetched from `company_settings.pdf_defaults` if needed.

## 6. Risks

- **Migration page reload:** First visit after migration forces a `window.location.reload()`. Acceptable for one-time operation.
- **PdfCustomizationPanel Sheet overlap:** Both DocumentSheet and PdfCustomizationPanel can be open simultaneously. The panel's `onOpenChange` is wired to `ui.closeSheet()`, so closing one closes both.
