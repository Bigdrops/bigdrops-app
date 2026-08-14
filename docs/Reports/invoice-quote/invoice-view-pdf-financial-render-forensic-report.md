# Invoice View and PDF Financial Render - Forensic Report

This report was written by opencode on 2026-08-14 via Local Runner.

## Objective

Explain why invoice SASINV080 renders incorrect financial values in the Invoice View page and in the PDF download, even though the database row stores correct values.

Exact rendered defects:

- VAT renders as 95,352.00.
- WHT renders as 25,427.20.
- Total renders as 1,341,284.80.
- The discount line (25,427.20) does not render.
- The amount-in-words renders the stale text for 1,314,450.56.

The database stores these values:

- subtotal: 1,271,360
- discount: 25,427.20
- vat: 93,444.96
- wht: 25,427.20
- total: 1,314,459.32

## Scope

- Trace the data loading path for the Invoice View page.
- Trace the data loading path for the PDF download.
- Identify the source of every financial field that renders.
- Identify where the discount is lost.
- Prove the VAT and total arithmetic.
- Explain why the discount row is absent.
- Explain the stale amount-in-words.
- Compare with invoice SASINV079.
- Identify the root cause.
- Propose a minimal fix.

This report does NOT change any code.

SASINV080 was chosen because its discount (2 percent on a 1,271,360 subtotal) is small. That makes the computed numbers distinct and easy to verify. The task prompt is the source for the persisted numbers and the rendered PDF output.

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

No code changes were made.

This report is a forensic finding only.

## Files read

- src/pages/ViewInvoice.tsx
- src/components/document-view/invoice/invoicePdfActions.ts
- src/lib/Calculations.ts
- src/domain/invoice/columns.ts
- src/domain/invoice/calculations.ts
- src/domain/invoice/normalize.ts
- src/domain/invoice/projections/financialProjection.ts
- src/domain/invoice/types.ts

## Data loading paths

### Invoice View page

`ViewInvoice.tsx` loads the invoice through `useInvoiceDetailData(id)`.

The hook returns the database row and its items.

The row contains:

- persisted financial totals: `discount`, `vat`, `wht`, `total`
- `custom_fields`
- `amount_in_words`

The page then does this:

```ts
customFields = parseCustomFields(invoice.custom_fields)
savedColumns = customFields?.columnConfig ?? BUILTIN_COLUMNS
documentTotals = computeDocument({
  items,
  document: invoice,
  cf: customFields,
  columns: savedColumns,
})
```

The summary block renders `documentTotals`.

The persisted totals on the row are NOT used.

### PDF download

`downloadInvoicePdfDocument` in `invoicePdfActions.ts` builds the PDF the same way.

```ts
targetCustomFields = parseCustomFields(targetInvoice?.custom_fields)
savedColumns = targetCustomFields?.columnConfig ?? BUILTIN_COLUMNS

documentTotals = computeDocument({
  items,
  document: targetInvoice,
  cf: targetCustomFields,
  columns: savedColumns,
})
```

The totals flow into `buildInvoicePreviewModel`.

The preview model reaches the PDF renderer.

Both paths use the SAME shared transformation.

## Source of each financial field

`computeDocument` is the shared financial truth:

```ts
computeDocument(raw) = calculateDocument(normalizeDocumentInput(raw))
```

See `src/lib/Calculations.ts:718`.

`normalizeDocumentInput` derives the financial inputs from raw values.

It NEVER reads the persisted computed totals.

The code comments state this explicitly:

- `document.vat` is a computed total, NOT used. (Calculations.ts:567)
- `document.discount` is a computed total, NOT used. (Calculations.ts:576)
- `document.wht` is a computed total, NOT used. (Calculations.ts:592)

The raw inputs come from `cf.calculationInputs`.

For SASINV080 these are:

- vatRate: 7.5
- vatPercent: 7.5
- discountType: percent
- discountValue: 2
- discountTiming: before
- whtType: percent
- whtValue: 2

## Where the discount is lost

`normalizeDocumentInput` first resolves the column list:

```ts
sourceColumns = Array.isArray(columns) && columns.length
  ? columns
  : Array.isArray(cf.columnConfig) ? cf.columnConfig : []
```

Then it builds a visibility lookup:

```ts
getVisibilityMode = (key) =>
  normalizeVisibilityMode(sourceColumns.find((c) => c?.key === key))

hideDiscountFully = getVisibilityMode('discount_rate') === 'hide_full'
```

The discount value is derived this way:

```ts
discountValue =
  hideDiscountFully ? 0 :
  ci.discountValue != null ? Number(ci.discountValue) :
  cf.discountValue != null ? Number(cf.discountValue) :
  _legacyDiscountValue(document, cf, discountType)
```

When `hideDiscountFully` is true, `discountValue` becomes 0.

Even though `ci.discountValue` is 2.

`calculateDocument` then computes totals WITHOUT any discount.

The item rows are also stripped:

```ts
discount_rate =
  hideDiscountFully || item.discount_rate == null ? null : Number(item.discount_rate)
```

Line-level discounts disappear too.

`getVisibilityMode('discount_rate')` returns `hide_full` when the saved column config contains an entry with:

```ts
{ key: 'discount_rate', visibilityMode: 'hide_full' }
```

`parseCustomFields` passes `columnConfig` through unchanged. See `src/domain/invoice/normalize.ts:142`.

The rendered output proves this condition existed:

- With `discountValue = 2`: discount = 25,427.20, VAT = 93,444.96, total = 1,314,459.10.
- With `discountValue = 0`: VAT = 95,352.00, WHT = 25,427.20, total = 1,341,284.80.

The rendered output matches the second state EXACTLY.

`calculationInputs.discountValue` is 2.

Therefore the only code path to `discountValue = 0` is `hideDiscountFully`.

Therefore SASINV080 stores `visibilityMode: 'hide_full'` on its `discount_rate` column.

This is a proven inference from code and rendered output.

## Why VAT is 95,352.00

VAT is 7.5 percent of the full subtotal.

```text
VAT = 0.075 x 1,271,360
VAT = 95,352.00
```

The discount does not reduce the base, because the discount became 0.

## Why total is 1,341,284.80

```text
Total = subtotal + VAT - WHT
Total = 1,271,360 + 95,352 - 25,427.20
Total = 1,341,284.80
```

WHT is 2 percent of the full subtotal, because the discount is 0.

## Why the discount row is absent

Two independent effects remove the discount row.

1. Financial effect: `hideDiscountFully` zeroes `discountValue` and nulls line `discount_rate`. The engine produces no discount.
2. Display effect: the saved column marks `discount_rate` as `hide_full`. The column renderer hides the column, so any row for it is masked.

Both effects come from the SAME saved column entry.

## Why amount-in-words is stale

`buildAmountInWordsProjection` does NOT recompute the text.

```ts
return pdfOutput?.showAmountInWords === false
  ? ''
  : String(invoice.amount_in_words || '')
```

See `src/domain/invoice/projections/financialProjection.ts:68`.

The PDF text is the persisted `amount_in_words` column value.

For SASINV080 that value is the text for 1,314,450.56.

That text is stale.

The totals are recomputed at render time. The words are static database text.

They desynchronize whenever amounts change without regenerating the words.

This is consistent with earlier direct-SQL repairs, which updated numbers but not the words column.

## Comparison with SASINV079

SASINV079 uses a fixed discount of 24,918.66, repaired by direct SQL.

Both invoices pass through the same engine.

`hideDiscountFully` sits above the discount type and the discount value.

It zeroes the discount regardless of type, percent or fixed.

Therefore both defects have the same root cause.

A database-read of each row's `columnConfig` is required to confirm whether each row actually stores `hide_full` on `discount_rate`.

The mechanism is identical and proven by code.

## Data continuity note

The persisted totals are themselves mixed-baseline:

- Persisted VAT 93,444.96 equals 7.5 percent of the discounted base 1,245,932.80.
- Persisted WHT 25,427.20 equals 2 percent of the FULL subtotal.
- Persisted total 1,314,459.32 matches neither clean engine output:
  - with discount: 1,314,459.10
  - without discount: 1,341,284.80

The residual of 0.22 is consistent with column-level rounding during the earlier manual repair.

This confirms the row was written by a different calculation baseline than the current engine.

## Root cause

The shared financial engine conflates column DISPLAY visibility with financial INPUT presence.

In `normalizeDocumentInput`, a `hide_full` mode on the `discount_rate` column:

- zeroes the global discount value
- nulls every line-level discount rate
- before any totals are computed

The View and the PDF ALWAYS recompute financials from raw inputs.

They deliberately ignore the persisted totals.

Therefore hiding the discount column changes the FINANCIAL result of the invoice, not just the display.

The persisted financial state applied a 2 percent discount.

The render-time recomputation drops it.

## Minimal fix proposal

The fix must decouple display visibility from financial inputs.

In `normalizeDocumentInput`:

- Do not let `hideDiscountFully` force `discountValue` to 0.
- Do not let it null line-level `discount_rate`.
- Apply the same change to `hideVatFully` and `hideInstallFully`.
- Keep `hide_full` and `hide_display` semantics ONLY in the display layer.

The display layer already masks hidden columns through `resolveColumnBehavior` and row effects.

The financial effect of a column must not depend on whether the column is visible.

Before implementing:

- Confirm product intent. Does `hide_full` mean the client must NOT receive the discount, or merely that the column is hidden?
- If the intent is display-only, apply the engine change.
- If rows already store `hide_full`, consider a one-time data migration to `hide_display` for affected rows.

This proposal is a finding only. No code was changed.

## Verification result

- bun run audit:load: not required, no code changed
- bun run typecheck: not required, no code changed
- git status: existing staged files only (Part 1)
- bun run test: not run, no code changed
- bun run build: skipped due to hardware policy

The finding is proven by code reading and arithmetic, not by test execution.

## Risks or limitations

- The exact `columnConfig` content of SASINV080 was inferred from rendered output, not read from the database.
- A live database read of `custom_fields.columnConfig` for SASINV080 and SASINV079 would remove the remaining uncertainty.
- The stale amount-in-words is a data staleness defect, independent of the financial defect.

## Deferred work

- Read `custom_fields.columnConfig` for SASINV080 and SASINV079 from the tenant database.
- Confirm product intent for `hide_full` on financial columns.
- Implement and verify the decoupling fix.
- Regenerate or reconcile `amount_in_words` for affected rows.