# Waybill PDF Templates — Refactor & Expansion

**Date:** 2026-06-21

## Summary

Replaced the monolithic inline classic template inside `WaybillPDF.tsx` with a modular template architecture. Created two new standalone template components (`ClassicTemplate`, `ThermalTemplate`) and updated the type system, consumer pages, and preview map.

## Changes

### New types & normalization
- `src/components/waybill/waybillUtils.ts`
  - `WaybillPdfTemplateId`: replaced `'default'` with `'classic'`, added `'thermal'`
  - `normalizeWaybillPdfTemplateId()`: fallback changed from `'default'` to `'classic'`

### New template components
- `src/components/waybill/ClassicTemplate.tsx`
  - Replicates `classic-mockup.html` layout
  - Title hardcoded to "WAYBILL / DELIVERY NOTE" regardless of `model.header.type`
  - Dynamic meta grid from model (filters null entries)
  - Signature images rendered at 110×42
  - Date/Time blank lines under each signature for handwriting
  - Footer with waybill number, company name, page numbers
  - Accepts optional `designPreset` prop for fillable color/font styling

- `src/components/waybill/ThermalTemplate.tsx`
  - Replicates `wblbarebones.html` compact layout
  - Checkbox-style Delivery Mode (Hand/Vehicle/Other) and Delivery Reason (Transfer/Maint./Other)
  - Simplified table with #, Description, Qty columns
  - Condensed signature cards with Name/Time rows
  - No footer (thermal-optimized — no page numbers)
  - Self-contained styles, no design preset dependency

### Router component
- `src/components/waybill/WaybillPDF.tsx`
  - Removed ~110 lines of inline classic template JSX and `createStyles()`
  - Simplified props: only `model`, `designPreset`, `template` (removed `waybill`, `settings`)
  - Routes to `ClassicTemplate`, `ThermalTemplate`, or `WaybillMinimalContent`

### Consumer pages
- `src/pages/ViewWaybill.tsx`
  - Template options: `default` → `classic`, added `thermal`
  - Default template: `'classic'`
  - Removed obsolete `waybill`/`settings` props from `<WaybillPDF>`
  - Cleaned unused imports (`useMemo`, `resolvePdfWebFontFamily`)

### Preview map
- `src/components/document/DocumentDesignControls.tsx`
  - Added `classic` and `thermal` entries to `templatePreviewById`

## Key decisions
- Classic template still uses `designPreset` for fillable color/font (backward-compatible)
- Thermal template is self-styled (no design preset) — appropriate for thermal printer output
- Minimal template left untouched
