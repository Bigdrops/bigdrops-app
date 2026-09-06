# Record Payment Height Forensics Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Find the structural cause of the rendered-height gap versus the reference.
- Compress composition without removing controls or breaking touch targets.
- Report residuals honestly, with no measured-parity claims.

## Scope

- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` only.
- No service, accounting, schema, primitive, or reference changes.

## Files changed

- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`
- `docs/reports/invoice-quote/record-payment-height-forensics-2026-09-06.md` (this report)

## Skills used

Skills used: apple-design
Documentation standard: ASD-STE100 Simplified Technical English

## Forensic findings

- Sheet cleared. Mobile renders content height with a max cap. Base sheet adds no gap or padding. No forced height exists.
- Primitives cleared. Switch renders 28px. Select renders 40px. Inputs render 36px. No hidden containers remain.
- All conditional blocks gate correctly. Nothing mounted-but-empty consumes space.
- The excess came from card chrome around content the reference leaves chromeless.

## Changes

- Amount card removed. Balance row, hero input, chips, settlement, and progress now stack directly, matching the reference block.
- Attach card removed. Trigger is a plain row. Expanded uploader keeps its own borders.
- Notes fixed to 44px. Trigger reduced to 40px. Action buttons reduced to 44px with tighter top spacing.
- All handlers, validation, upload flow, and states unchanged.

## Block comparison (structural, not measured)

| Block | Reference | Production now | Status |
|---|---|---|---|
| Header | Compact title plus context | Title plus subtitle plus close | Parity, subtitle retained |
| Amount | Chromeless stack | Chromeless stack | Parity |
| Chips | 30px row | 36px row | Taller, project standard kept |
| Settlement plus progress | Inline strip | Inline strip | Parity |
| Details grid | 2-column, 36px fields | 2-column, 36 to 40px fields | Near parity |
| Notes | 44px | 44px | Parity |
| Attach collapsed | 36px row | 40px row | Near parity |
| Action bar | 40px row | 44px row | Near parity, HIG minimum |

## Residual gap

- Remaining difference comes from system type scale, touch minima, sheet subtitle, and safe padding.
- Full parity is unreachable without deleting controls or breaking touch standards.
- No runtime measurement tooling exists here. No measured claim is made.

## Verification

- `bun run typecheck`: passed, clean.
- `bun run audit:load`: skipped (UI-only change).
- `bun run build`: not run (hardware policy).
- `git diff`: one intended file, 12 insertions, 13 deletions.

## Limitations

- Method select renders 40px through the shared primitive while date and reference render 36px. Fixing it means touching the shared select. Left as is.
- Small-phone sheets still scroll when the bank row shows. Content, not chrome, causes it.
