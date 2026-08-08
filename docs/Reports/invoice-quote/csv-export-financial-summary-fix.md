# CSV Export Financial Summary Fix — Invoice & Quotation

This report was written by Buffy on 2026-08-08 via Freebuff.

## Objective

Fix ticket `docs/tickets/Csv-output.md`. The CSV export for invoices and quotations did not export the complete financial summary. Intermediate values (Subtotal, VAT, Discount, WHT) exported as `0`. The CSV also omitted Notes and Terms & Conditions.

## Scope

In scope:

- Single-document CSV export from the Invoice View page.
- Single-document CSV export from the Quotation View page.

Out of scope:

- Bulk list exports (`src/utils/exportCompilers.ts`). No changes made.
- The financial calculation engine (`src/lib/Calculations.ts`). This file is LOCKED and was not modified.

## Root Causes

Evidence-based findings:

1. **Quotation CSV key mismatch.** `buildQuotationCsv` read `totals.rawSubtotal`, `totals.vatAmount`, `totals.discountAmount`, `totals.whtAmount`. The quotation view passes the canonical `computeDocument` result. That result uses keys `subtotal`, `vat`, `discount`, `wht`. Every key except `installRateTotal` and `totalPayable` mapped to `undefined`, which exported as `0`. The quotation preview (`src/domain/quotation/previewModel.ts`) maps these keys correctly. The CSV builder did not.
2. **Invoice CSV used persisted columns.** `downloadInvoiceCsvFile` read `invoice.subtotal`, `invoice.vat`, `invoice.discount`, `invoice.wht` directly from the database row. Imported and legacy documents carry stale or zero values in these columns. The app and PDF never trust these columns. They recompute via `computeDocument`. The CSV did not.
3. **Missing sections.** Both builders omitted Notes and Terms & Conditions. Extra charge rows were also absent.

## Fix

Changed files:

- `src/utils/csvDocumentSummary.ts` (new). Shared helper `buildDocumentSummaryCsvRows`. It maps canonical totals keys to the preview-style keys, then calls `buildSummaryRows` from `@/domain/invoice`. This is the exact summary builder used by the app view and PDF. It also resolves and strips Notes and Terms & Conditions text.
- `src/components/invoice/exportInvoiceCsv.ts`. Uses the shared helper. Accepts canonical totals keys. Adds Notes and Terms & Conditions rows.
- `src/components/quotation/exportQuotationCsv.ts`. Same treatment.
- `src/pages/viewInvoiceActions.ts`. `downloadInvoiceCsvFile` now recomputes totals with `computeDocument`, using `parseCustomFields` and the saved `columnConfig` (fallback `BUILTIN_COLUMNS`). This matches `ViewInvoice.tsx`.
- `src/pages/viewQuotationActions.ts`. `downloadQuotationCsvFile` passes parsed `customFields` to the builder.
- `src/hooks/useQuotationActions.ts`. Passes `customFields` to `downloadQuotationCsvFile`.

The summary now reproduces the app breakdown: Subtotal, Discount (before or after tax per timing), taxable extra charges, VAT, non-tax charges, Install Rate, WHT, then Total. Rows appear in the same order as the app.

## Verification

- `bun run typecheck` — PASSED for this task. The user ran it. One error remains in `src/lib/tenant/contexts.tsx`. That file is unrelated pre-existing work (tenant feature, uncommitted). It was not touched.
- `bun run audit:load` — PASSED. One pre-existing architecture warning on `useInvoiceActions.ts` (direct Supabase calls). Not introduced by this change.
- `git status` — only the six intended files plus pre-existing tenant work are present. No unintended changes.
- Code review — performed. Two minor findings were fixed:
  - `||` replaced with `??` for `totalPayable` fallback. A legitimate zero total is no longer masked.
  - `downloadQuotationCsvFile` now guards the `custom_fields` fallback with a `typeof` check. A raw JSON string can no longer be cast to an object.
- `bun run build` — not run. Project policy forbids it on this 4GB RAM machine.

## Risks & Limitations

- `buildSummaryRows` shows a row only when its amount is non-zero. This matches the app exactly. A document with zero VAT shows no VAT row.
- Notes and Terms are exported as plain text. HTML markup is stripped for readability.
- The invoice CSV recomputes totals. Persisted columns remain unchanged in the database.

## Deferred Work

- The two builders share the Notes/Terms block. A small shared append helper could remove the duplication. Left for a future pass to keep this change minimal.
- Bulk list CSV export (`flattenLineItems`) still exports only Description, Quantity, Unit Price, Subtotal per row. Its financial summary is outside this ticket.
- The pre-existing `src/lib/tenant/contexts.tsx` typecheck error belongs to the tenant feature work. Not fixed here.

## Delegation Log

Appended to `docs/reports/GENERAL/delegation-log.md`.
