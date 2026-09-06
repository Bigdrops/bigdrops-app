# Shared Template Picker Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Consolidate the triplicated picker carousel into one shared shell.
- Match the HTML reference density across Invoice, Quotation, Waybill, CSR.
- Preserve every legitimate document-specific control.

## Scope

- One new shared shell plus three thin picker wrappers.
- No engine, persistence, PDF, payment, or schema changes.

## Files changed

- `src/components/document-view/shared/TemplatePickerCarousel.tsx` (new)
- `src/components/document-view/shared/CommercialTemplatePicker.tsx`
- `src/components/csr/CsrTemplateCarousel.tsx`
- `src/components/waybill/WaybillTemplateSelector.tsx`
- `docs/reports/invoice-quote/shared-template-picker-2026-09-06.md` (this report)

## Skills used

Skills used: apple-design
Documentation standard: ASD-STE100 Simplified Technical English

## Architecture

- Before: three pickers duplicated carousel chrome (scroll container, scroll-into-view, card button, label block) with incidental divergence.
- After: `TemplatePickerCarousel` owns scrolling, snap, card density, selected state, and labels. Families supply normalized options only.
- CSR keeps its option registry and variant mapping. Waybill keeps its themes and accent rule. Commercial keeps its seven themes.
- Net effect: 209 lines removed, 44 added.

## Document differences

- Legitimate: option sets, theme tokens, mini layout (commercial table versus service lines), waybill accent rule.
- Unified: card width 150px, radius 20px, label plus blurb, edge bleed, selected treatment.
- CSR cards move from 160px to 150px. Waybill loses its check badge. Dark card plus ring remains the selected signal everywhere.

## Height comparison (static estimates, not measured)

| Document | Result | Versus HTML | Notes |
|---|---|---|---|
| Invoice | PASS | Approximate parity | Same sections as reference |
| Quotation | PASS | Approximate parity | Identical composition |
| Waybill | PASS | Shorter, legitimate | Fewer controls than reference |
| CSR | PASS | Shorter, legitimate | Fewer controls than reference |

- Estimates derive from class values with ±20 px tolerance.
- No runtime measurement tooling exists in this environment.
- Commercial default states scroll on small phones, same as the reference.

## Verification

- `bun run typecheck`: passed, clean.
- `bun run audit:load`: skipped (UI-only change).
- `bun run build`: not run (hardware policy).
- Callers confirmed: `InvoiceOverlays`, `ViewQuotation`, `ViewWaybill`, `ViewCSR`. Signatures unchanged.
- `git diff`: 3 picker files plus 1 new shell. No unrelated edits by this task.

## Concurrent change noted

- `supabase/migrations/20260906130000_accounting_reconciliation.sql` shows a 2-line modification made during this session by another agent. Left untouched per concurrency rules.

## Limitations

- Shell consolidation preserves density. It does not shorten the template section itself.
- Remaining commercial height comes from legitimate controls: accent, font, two layout toggles, save.
- Touch targets unchanged. No nested scroll added.
