# Invoice and Quote PDF Output Settings Verification Report

This report was written by Buffy on 2026-09-04 via Freebuff.

---

## Objective

Verify that the Invoice and Quote PDF Output Settings architecture
matches the agreed final behavior:

- Remove PDF document-option switches from the Invoice and Quote
  create/edit forms.
- Keep Bank Details functionality on the forms.
- Keep the four useful PDF switches on the View pages only.
- Remove the three percentage preferences from active application
  behavior.
- VAT, WHT, and Discount percentages always display where applicable.
- The fixed-discount percentage consumes `discountPercentEquivalent`
  from the calculation result. The PDF layer does not calculate it.

## Scope

- Invoice and Quote create/edit form render paths
- Invoice and Quote View page controls
- The three percentage preference fields and their consumers
- The PDF summary-label and rendering path
- The `discountPercentEquivalent` data flow

## Files Changed

This task (current session) changed one file:

| File | Change |
|------|--------|
| `src/pages/ViewInvoice.tsx` | Added `discountPercentEquivalent: documentTotals.discountPercentEquivalent` to the screen-preview totals subset passed to `buildInvoicePreviewModel` |

The other files listed below were changed by the prior task
(`invoice-quote-pdf-output-settings-removal`) and were verified,
not modified, in this session:

| File | Prior change |
|------|--------------|
| `src/components/PdfOutputSettings.tsx` | Renders only `PdfBankControls` (Bank Details) |
| `src/components/document-view/shared/DocumentOptionsCard.tsx` | Re-added Show Balance Due and Show Amount in Words rows |
| `src/components/document-view/quotation/QuotationViewPage.tsx` | Passes `hideBalanceDue` to the options card |
| `src/domain/document/pdfSummaryLabels.ts` | Consumes pre-computed percentages only |
| `src/domain/invoice/normalize.ts` | Stripped the three percentage defaults |
| `src/domain/invoice/renderTypes.ts` | Stripped the three percentage fields from `PdfOutputLike` |
| `src/domain/invoice/types.ts` | Stripped the three percentage fields from `InvoicePdfOutput` |
| `src/hooks/useQuotationViewData.ts` | Removed percentage defaults from `defaultPdfOutput` |

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Step 1: Form architecture verification

`InvoiceFormPage.tsx` line 523 and `QuotationFormPage.tsx` line 748
render `PdfOutputSettings`. That component now renders only
`PdfBankControls`:

- Show Bank Details switch
- Selected bank-account display
- Switch Account picker

No document-option switch (Footer, Tagline, Balance Due, Amount in
Words, or any percentage switch) renders on either create/edit form.

`PdfOutputSettings` acting as a Bank Details wrapper is the existing
pattern from the prior task. This task performed no rename or
refactor of that component.

### Step 2: View-page control verification

Invoice View (`InvoiceWorkspace.tsx`) renders:

- `BankDetailsCard`
- `DocumentOptionsCard` with all four retained switches:
  Show Bank Details, Show Tagline, Show Footer, Show Balance Due,
  Show Amount in Words

Quote View (`QuotationViewPage.tsx`) renders:

- `BankDetailsCard`
- `DocumentOptionsCard` with `hideBalanceDue` and `hideMergeQty`

The quote view shows Tagline, Footer, and Amount in Words. It does
not show Balance Due because quotations have no balance-due concept.

Each switch traces through `onOutputChange` to the shared
`handleSaveCustomization` path and reaches the PDF render input as
`pdfOutput` fields.

### Step 3: Percentage preferences

Repository-wide search found zero references to
`showVatPercentage`, `showWhtPercentage`, or `showDiscountPercentage`
in `src/`, `src/tests`, or `supabase/`.

The only remaining occurrences are inert documentation files under
`docs/`: prompts, tickets, and historical reports. No runtime path
reads them.

### Step 4: Percentages always display

`pdfSummaryLabels.ts` builds the VAT, WHT, and Discount label
strings unconditionally:

- VAT label appends the percentage whenever a VAT percent exists.
- WHT label appends the percentage whenever the WHT type is
  percent.
- Discount label appends the percentage for a percent discount
  (reads the configured rate) and for a fixed discount (reads the
  engine-derived equivalent when present).

No renderer or template conditions on the removed preference fields.

### Step 5: Fixed discount percentage is engine-owned

`src/lib/Calculations.ts` produces `discountPercentEquivalent` in
`DocumentResult`. Producers and consumers are:

- `Calculations.ts` line 475: computes the value with Decimal.
- `Calculations.ts` line 562: returns it in the result object.
- `financialProjection.ts`, `quotation/previewModel.ts`,
  `invoicePdfActions.ts`, `ViewInvoice.tsx`: pass it through the
  projection totals.
- `pdfSummaryLabels.ts`: reads it from the extras. It performs zero
  percentage arithmetic. Its doc comment states the value is
  display-only and must not be recalculated at that layer.

The existing `discount` field is unchanged.

### Step 6: Data-flow mismatch check

Invoice and quote paths both normalize the document and call
`computeDocument` from `src/lib/Calculations.ts`. The result reaches
both preview and download paths. The label layer consumes
`discountPercentEquivalent` from that result.

`discountType` parity check: the engine derives
`discountType = (ci.discountType ?? cf.discountType)` (line 626 of
`Calculations.ts`). Both label call sites use the same expression
`calculationInputs?.discountType ?? customFields?.discountType`.
No mismatch exists.

Gap found and fixed: the Invoice View on-screen preview totals
subset omitted `discountPercentEquivalent`, so the preview label
showed a fixed discount without its percentage while the downloaded
PDF showed it. `ViewInvoice.tsx` now includes the field. Both paths
now agree.

## Verification Result

- `bun run audit:load`: passed (pre-existing warnings only, no new
  findings from the one-line change)
- `bun run typecheck`: passed (exit code 0)
- `git status --short`: matches the baseline captured before this
  task, with no files changed beyond the task files. The baseline
  contains pre-existing staged work from other agents (NRS-docs
  conversions, tenant and PostgREST work, prior reports). No
  pre-existing change was reverted or overwritten.
- `bun run build`: not executed (hardware policy)

Static verification summary:

- Invoice and Quote create/edit forms render no document-option
  switch.
- Invoice View retains Show Footer, Show Tagline, Show Balance Due,
  Show Amount in Words.
- Quote View retains Tagline, Footer, Amount in Words. Balance Due
  is correctly absent.
- No UI switch remains for the three percentage fields.
- PDF rendering does not condition on the three percentage fields.
- Fixed-discount percentage display uses `discountPercentEquivalent`
  from the calculation result. No PDF or label code performs
  percentage arithmetic.
- Financial calculation formulas are unchanged.

## Risks or Limitations

- Persisted historical percentage-preference values remain in
  existing documents as inert data. No migration removed them. This
  is safe because no runtime code reads those fields.
- The quote PDF render path uses a legacy layout (`pdfDownloadHandler.ts`).
  It consumes labels from the shared preview model, so percentage
  behavior stays consistent with the screen preview.

## Deferred Work

1. The known calculation entry-point naming split remains:
   AGENTS.md section 3 names `calcTotals()` and `resolveRowVat()`,
   while `src/lib/Calculations.ts` exports `calculateDocument()`
   and `computeDocument()`. Not resolved in this task.
2. The casing finding from earlier reports remains deferred:
   `src/lib/Calculations.ts` (PascalCase) is the git-tracked path;
   all imports use PascalCase; no rename performed.
3. `ViewQuotation.tsx` passes a `previewControls` prop that
   `QuotationViewPage` declares but does not render. This is a dead
   prop, not a duplicate control. It was not fixed because the
   rendered `DocumentOptionsCard` already provides the correct
   quote controls.
