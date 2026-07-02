# CSR Zero-Regression Migration Report

**Date:** 2026-06-22
**Status:** Complete

## Objective

Replace raw `CsrObject` / `any` with typed `CsrRenderModel` across all CSR document surfaces (Doc View, Preview Panel, 4 PDF templates) and surface `call_type`, `system_down`, `engine_no`, and `defects_found` in all output paths.

## Architecture

- **Domain type:** `src/domain/csr/csrRenderModel.ts` — `CsrRenderModel` interface + `buildCsrRenderModel` transformer
- **Tests:** `src/tests/csr/csrRenderModel.test.js` — 20 unit tests
- **Doc View:** `src/components/document-view/csr/CsrDocumentPreview.tsx`
- **Preview Panel:** `src/components/csr/CSRPreviewContent.js`, `CSRPreviewPanel.tsx`
- **PDF templates:** `src/components/csr/preview-templates/` (types, utils, components, PulseFrame, SignalBands, Zinc, Crimson, index)

## Files Created

| File | Purpose |
|------|---------|
| `src/domain/csr/csrRenderModel.ts` | `CsrRenderModel` interface + `buildCsrRenderModel()` transformer |
| `src/tests/csr/csrRenderModel.test.js` | 20 unit tests covering all fields and edge cases |

## Files Modified

| File | Change |
|------|--------|
| `src/components/document-view/csr/CsrDocumentPreview.tsx` | Prop type → `CsrRenderModel`, added `engineNo` / `callTypeDisplay` / `systemDownDisplay` |
| `src/components/csr/CSRPreviewContent.js` | Battery label → "Charging Alternator Condition" |
| `src/components/csr/CSRPreviewPanel.tsx` | Prop type → `CsrRenderModel`, added call type / system status / engine no |
| `src/components/csr/preview-templates/types.ts` | `CsrPdfProps.csr` from `any` → `CsrRenderModel`, added `template` field |
| `src/components/csr/preview-templates/utils.ts` | All `csr` params typed as `CsrRenderModel` |
| `src/components/csr/preview-templates/components.tsx` | Added `engine_no` to `SharedEquipmentSection`, `callTypeDisplay`/`systemDownDisplay` to `StructuredTopIdentity`, new `DefectsFoundBlock` |
| `src/components/csr/preview-templates/PulseFrame.tsx` | Added `DefectsFoundBlock` import and usage |
| `src/components/csr/preview-templates/SignalBands.tsx` | Added `DefectsFoundBlock` band after Problem band |
| `src/components/csr/preview-templates/Zinc.tsx` | Added `engine_no`, `call_type`/`system_down` badges, `defects_found` block |
| `src/components/csr/preview-templates/Crimson.tsx` | Added `engine_no`, `call_type`/`system_down` badges, `defects_found` block |
| `src/components/csr/preview-templates/index.tsx` | `getCsrPdfDocument` param from `any` → `CsrPdfProps` |

## Audit Results

- **`CsrObject` references in preview-templates/:** 0
- **`any` for `csr` param:** 0 (last one fixed in `index.tsx:30`)
- **Tests passing:** 20/20
- **Build:** Compiles successfully

## Key Decisions

1. `buildCsrRenderModel()` is not yet wired at call sites (`NewCSR.tsx`, `ViewCSR.tsx`). Callers still pass raw `buildCsrPreviewData()` output. Compute-only fields (`callTypeDisplay`, `systemDownDisplay`) may be `undefined` at runtime until wiring is done.
2. Templates retain `csr = csr || {}` defensive fallback for safety.
3. Battery label single source: `CSRPreviewContent.js` — all consumers pick up "Charging Alternator Condition" automatically.
4. `CsrObject` (form capture layer) intentionally kept separate from `CsrRenderModel` (render layer) to prevent circular imports.

## Remaining Work

- Wire `buildCsrRenderModel()` at call sites (`NewCSR.tsx` line 239/340, `ViewCSR.tsx` line 202) to populate computed display fields
