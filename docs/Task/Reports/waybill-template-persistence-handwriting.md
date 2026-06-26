# Waybill — Template Persistence & Fillable Handwriting Controls

## Summary

Removed the Bicolor template, made the Waybill template picker persist the user's selection via `localStorage`, and added fillable handwriting font/color controls to the Waybill customize sheet (mirroring the CSR pattern).

## Files Changed

| File | Change |
|---|---|
| `src/components/waybill/BicolorTemplate.tsx` | **Deleted** — entire file removed |
| `src/components/waybill/WaybillPDF.tsx` | Removed `BicolorTemplateDocument` import, removed `'bicolor'` from type union, removed the `if (template === 'bicolor')` routing block |
| `src/components/waybill/waybillUtils.ts` | Removed `'bicolor'` from `WaybillPdfTemplateId` type; `normalizeWaybillPdfTemplateId()` now maps `'bicolor'`/`'split'` → `'classic'` |
| `src/components/waybill/WaybillTemplateSelector.tsx` | Removed `bicolor` from `TEMPLATE_OPTIONS` and `THEMES` |
| `src/pages/ViewWaybill.tsx` | See details below |

## ViewWaybill.tsx Changes

1. **Imports added**: `cn`, `PenLine`, `Type`, `Switch`, `PdfFillableFontChoice`
2. **Constants added**: `WAYBILL_TEMPLATE_KEY`, `WAYBILL_COLOR_SWATCHES`, `WAYBILL_HANDWRITING_FONTS`
3. **Template state**: Initializes from `localStorage` key `waybill_view_template`, defaults to `'classic'`
4. **New states**: `customFont` and `customColor` initialized from localStorage
5. **Sync useEffect**: Syncs `designPreset` when `customFont`/`customColor` change; persists template to localStorage
6. **Ink Color section**: Toggleable section with 5 colour swatches + hex input
7. **Handwriting Font section**: Toggleable section with 6 font chips (Reenie Beanie, Caveat, Kalam, Patrick Hand, Handlee, Sue Ellen Francisco)
8. **Save button**: Persists template, font, and color to localStorage before saving to DB

## Verification

- `bun run typecheck` — passed clean
- `bun run lint` — timed out (full project scan, pre-existing)
