# Customization Persistence and Compactness Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Find why saved customization reverts after leave and return.
- Repair persistence at the smallest correct point.
- Make all four customization popups compact.
- Add only a targeted PRD clarification.

## Scope

- Customization save, load, and render paths for Invoice, Quotation, Waybill, CSR.
- Shared card spacing. One PRD sentence. No pipeline redesign.

## Files changed

- `src/domain/pdf/customization/commercial.ts`
- `src/components/document-view/invoice/InvoiceOverlays.tsx`
- `src/pages/ViewQuotation.tsx`
- `src/domain/invoice/types.ts`
- `src/domain/invoice/normalize.ts`
- `src/hooks/useQuotationViewData.ts`
- `src/pages/ViewWaybill.tsx`
- `src/components/document-view/shared/DocumentCustomizeCard.tsx`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/21-surfaces-and-overlays.md`
- `docs/reports/invoice-quote/pdf-customize-persistence-compactness-2026-09-06.md` (this report)

## Skills used

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

## Persistence

### Root cause

- The unification dropped the `setPdfDesignPreset` write on Save.
- The preset store froze. Engine localStorage kept live-writing accent and font.
- A legacy preset saved with customization toggles OFF vetoes new engine edits in downloads.
- The popup then shows saved values while the PDF renders defaults.
- This is the exact boundary of the regression: commit-time preset write.

### Old behavior

- Old sheet wrote the full design preset on Save, then persisted output and template.
- Save committed preset, output, and template together.

### Current behavior before this fix

- Save persisted output and template only. Preset argument passed as `undefined`.
- Both action handlers ignore the preset slot.
- `setPdfDesignPreset` has zero callers.

### Fix

- New `persistCommercialDesignPreset` commits engine accent and font into the preset store on Save, with toggles ON, preserving all other preset fields.
- Both Invoice and Quotation Save handlers call it before persisting output and template.
- Read paths already bridge engine over preset, so popup and PDF now agree.

### Additional proven holes fixed

- Invoice `getInvoicePdfOutput` dropped `landscapeLayout`. The toggle saved to DB but never round-tripped. Reader now passes it through. Type extended with optional field.
- `refreshQuotation` refreshed everything except `pdfOutput`. It now refreshes `pdfOutput` like the initial loader.
- Waybill template initialized from the global key only and ignored the per-document DB value. It now restores the DB value when the popup is closed. Cross-document leakage on return is fixed.

### Why this is the smallest fix

- No new store, no new architecture, no pipeline change.
- One helper plus two call sites restores the old commit contract.
- Reader and refresh fixes are one to three lines each at the exact loss points.

## Height

### Structural causes

- Ink and Handwriting sections rendered for commercial documents with empty configs. Two dead blocks added height.
- Section padding and gaps exceeded CSR/Waybill rhythm needs.

### Changes

- Ink section renders only with swatches. Handwriting section renders only with fonts. Commercial popups lose two dead blocks. CSR and Waybill unchanged.
- Card root `space-y-4` to `space-y-3`. Section `p-4` to `p-3`. Titles `mb-3` to `mb-2`. Accent and ink follow the same rhythm.

### Intentionally unchanged

- Template cards keep the 150-160px and 80px footprint.
- Miniature preview implementation untouched.
- `DocumentSheet` untouched (single scroll container, correct safe-area, no nested trap).
- Toggle rows, switches, selects, and Save `h-12` unchanged (touch targets intact).
- No control removed for height. Commercial keeps accent, font, layout toggles, save.

### Shared structure

- All four popups use the same card, spacing, hierarchy, and save.
- Height differs only by legitimate document-specific controls.

## PRD

- Clarification was necessary to lock density expectations.
- Changed `21-surfaces-and-overlays.md` `§5.1A` only. Added one rule: compact mobile-first density, shared controls use the same spacing and hierarchy, document-specific controls may add height.
- No other PRD edits. Miniature direction section untouched.

## Verification

- `bun run typecheck`: passed (clean, repeated runs).
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched).
- `bun run build`: not run (hardware policy).
- `git status`: only intended files changed. Pre-existing entries untouched.
- No runtime or device measurement performed. Height gain is structural (two dead blocks removed plus tighter rhythm), not measured.

## Risks and limitations

- Engine accent and font still live-write before Save. Full deferred-commit needs a hook redesign. Out of scope.
- Engine accent and font remain family-global, not per-document. Template and output are per-document. Scope difference is pre-existing engine design.
- CSR template key remains global by design. No per-document CSR template exists.
