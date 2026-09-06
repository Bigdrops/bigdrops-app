# Record Payment Compact Recomposition Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Recompose the Invoice Record Payment sheet to HTML-reference compactness.
- Keep one sheet, one scroll owner, real uploader behind an inline expander.
- Change zero payment behavior.

## Scope

- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- `src/components/ui/PaymentAttachmentUploader.tsx` (one optional prop)
- No service, accounting, schema, or calculation changes.

## Files changed

- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- `src/components/ui/PaymentAttachmentUploader.tsx`
- `docs/reports/invoice-quote/record-payment-compact-recomposition-2026-09-06.md` (this report)

## Skills used

Skills used: apple-design
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Amount consolidation

- Balance line, hero input, chips, settlement strip, and progress bar now live in one bordered card.
- Hero block and centering wrappers removed. Loose `-mt-3` overlap removed.
- Amount input made explicit `h-[52px]`. Old `h-13` class does not exist in the design system and generated no height.
- Chips fill card width with tighter gaps. Height stays `h-9` for touch.
- All parsing, formatting, validation wiring, and progress math unchanged.

### Details grid

- Unchanged. Date, method, conditional bank, reference, and notes were already compact.
- Labels, heights, and grid behavior preserved.

### Attach receipt expander

- New collapsed trigger row (`h-11`): icon, label, file-count badge, chevron.
- Expanded content renders the real uploader with heading hidden.
- State resets on sheet open. Toggle is manual only.
- Uploader keeps limits, types, previews, removal, errors, and statuses.
- New optional `hideHeading` prop defaults to false. Only caller uses it.

### Action area

- Stacked 52px pill plus text Cancel replaced with one row: Cancel plus Record.
- Record keeps all states, icons, shadows, and disabled behavior at `h-12`.
- No auto-close added. Save lifecycle untouched.

### Spacing

- Card gap `gap-4` to `gap-3`. Touch targets unchanged.

## Behavior preserved

- Form reset, balance load, bank preselect, method gating, reference, notes.
- Full validation set including required date and over-balance rejection.
- Atomic RPC, accounting event, audit, WHT draft, receipt retry.
- Upload-before-close, per-file statuses, double-submit guard, parent refresh.
- Loading, error, success, recorded, and saving states.

## Height result

- Collapsed sheet holds: amount card, details grid, one trigger row, one action row.
- Only attachment expansion adds height. No other interaction grows the sheet.
- No runtime measurement performed. Gain is structural, stated qualitatively.

## Verification

- `bun run typecheck`: passed, clean, repository-wide.
- `bun run audit:load`: skipped (no data-layer logic touched).
- `bun run build`: not run (hardware policy).
- `git status` and `git diff`: 2 intended files only. No unrelated changes.

## Risks and limitations

- Collapsed height estimated near the HTML reference, not measured on device.
- Chip and field heights kept at system values, slightly above the HTML raw pixels.
- Sheet header and max-height behavior unchanged via shared `DocumentSheet`.
