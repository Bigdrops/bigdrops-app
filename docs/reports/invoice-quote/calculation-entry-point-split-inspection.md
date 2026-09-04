# Calculation Entry-Point Split Inspection Report

This report was written by Buffy on 2026-09-04 via Freebuff.

---

## Objective

Inspect the entry-point naming split between AGENTS.md and the
actual financial calculation code. This task is read-only.

It produced findings only. It made no code changes and gave no
recommendation to merge, delete, or rename anything.

## Scope

- `src/lib/Calculations.ts`
- `src/domain/invoice/calculations.ts`
- All callers of both files
- The relationship between the two paths
- The commit history of both files
- The blast radius of the non-canonical path

## Files Changed

None. This task modified no files.

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

No changes were made. The findings are below.

---

## Finding 1: Complete map of both files

### `src/lib/Calculations.ts` (canonical engine)

Header comment: "Single source of truth for all document financial
math. Shared by: NewInvoice, EditInvoice, NewQuotation,
EditQuotation, all preview/detail screens, all PDF templates."

Exports:

| Export | Signature | Purpose |
|--------|-----------|---------|
| `calculateDocument` | `(input: DocumentInput) => DocumentResult` | Core two-pass engine. Computes per-row subtotal, install, VAT base, discount, VAT, totals, WHT, grand total, payable. |
| `normalizeDocumentInput` | `(raw: RawDocumentInput) => DocumentInput` | Resolves raw rates from `cf.calculationInputs` first, then `cf`, then legacy document fields. Never reads `document.vat/discount/wht` as rates. |
| `computeDocument` | `(raw: RawDocumentInput) => DocumentResult` | Convenience wrapper: `normalizeDocumentInput` then `calculateDocument`. This is the entry point all production code uses. |
| `DiscountType`, `DiscountTiming`, `WhtType` | type aliases | `'fixed'\|'percent'`, `'before_tax'\|'after_tax'`, `'fixed'\|'percent'` |
| `InputItem`, `ExtraCharge`, `VisibleRowEffects`, `DocumentInput` | interfaces | Input contracts |
| `ComputedItem`, `ComputedGroup`, `DocumentResult` | interfaces | Output contracts, including `discountPercentEquivalent` |

Numeric approach: decimal.js, verified current at the top of the
file:

```ts
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })
```

### `src/domain/invoice/calculations.ts` (parallel layer)

Exports:

| Export | Signature | Purpose |
|--------|-----------|---------|
| `calcTotals` | `({ items, columns, invoice, customFields, discountType, discountTiming, whtType }) => CalculationResult` | Full legacy totals engine: subtotal, install, VAT, discount, WHT, grand total, payable, custom column totals. |
| `resolveRowVat` | `(item: InvoiceItem, globalVatPct: number) => number` | Row VAT rate: returns the row override or the global percent. |
| `buildSummaryRows` | `({ invoice, totals, customFields, chargeLabels, summaryLabels }) => SummaryRow[]` | Display-row builder for PDF and preview summaries. Reads pre-computed totals. |
| `buildCalculationInputs` | `({ invoice, discountType, discountTiming, whtType }) => CalculationInputs` | Packages form-state inputs. Reads `invoice.vat/discount/wht` as input rates. |
| `extractCalculationInputs` | `(invoice?, customFields) => CalculationInputs` | Saved-inputs-first variant. |
| `buildEditableCalculationInputs` | `(calculationInputs, opts) => EditableCalculationInputs` | Zeroes global VAT/discount when not in use. |
| `inferLegacyCalculationInputs` | `({ invoice, items, customFields }) => CalculationInputs` | Back-derives rates from stored totals for legacy documents. |
| `inferLegacyCalculationState` | `({ invoice, items, customFields }) => LegacyCalculationState` | Hydration wrapper used by edit paths. |
| `resolveExtraCharges` | `(customFields?, invoice?) => ExtraCharge[]` | Normalizes extra-charge sources. |

Numeric approach: plain JavaScript number arithmetic, verified
current (`reduce`, `*`, `/`, `Math.max`, no decimal library).

## Finding 2: Callers of each file

### Callers of `src/lib/Calculations.ts`

| Caller | Function | Document type | Path | Reachable |
|--------|----------|---------------|------|-----------|
| `src/pages/InvoiceFormPage.tsx` | `computeDocument` | Invoice | Form/edit | Yes |
| `src/pages/QuotationFormPage.tsx` | `computeDocument` | Quotation | Form/edit | Yes |
| `src/pages/ViewInvoice.tsx` | `computeDocument` | Invoice | View preview | Yes |
| `src/pages/viewInvoiceActions.ts` | `computeDocument` | Invoice | View data load | Yes |
| `src/pages/viewQuotationActions.ts` | `computeDocument` | Quotation | View data load | Yes |
| `src/components/document-view/invoice/invoicePdfActions.ts` | `computeDocument` | Invoice | PDF download | Yes |
| `src/hooks/useInvoiceSave.ts` | types only | Invoice | Save | Yes |
| `src/hooks/useQuotationSave.ts` | types only | Quotation | Save | Yes |
| `src/tests/critical/calculations.test.js` | `calculateDocument`, `normalizeDocumentInput`, `computeDocument` | Test | Test file | Test only |
| `src/tests/critical/globalDiscountHydration.test.js` | `computeDocument` | Test | Test file | Test only |

`calculateDocument` and `normalizeDocumentInput` have no production
callers. All production callers use `computeDocument`.

### Callers of `src/domain/invoice/calculations.ts`

| Caller | Function | Document type | Path | Reachable |
|--------|----------|---------------|------|-----------|
| `src/components/useInvoiceColumns.tsx` | `calcTotals`, `resolveRowVat` and others | Re-export hub | Re-export only | No call site |
| `src/pages/InvoiceFormPage.tsx` | `buildCalculationInputs` (via re-export) | Invoice | Form/edit | Yes |
| `src/pages/QuotationFormPage.tsx` | `buildCalculationInputs` (via re-export) | Quotation | Form/edit | Yes |
| `src/components/quotation/quotationFormUtils.ts` | `buildCalculationInputs` (via re-export) | Quotation | Form utils | Yes |
| `src/pages/viewQuotationActions.ts` | `buildCalculationInputs` | Quotation | View data load | Yes |
| `src/hooks/useInvoiceHydration.ts` | `inferLegacyCalculationState` | Invoice | Edit hydration | Yes |
| `src/domain/quotation/normalize.ts` | `inferLegacyCalculationState` | Quotation | Edit hydration | Yes |
| `src/components/invoice/TotalsPanel.tsx` | `buildSummaryRows` | Invoice | Form summary panel | Yes |
| `src/domain/invoice/projections/financialProjection.ts` | `buildSummaryRows` | Invoice | View/PDF rows | Yes |
| `src/domain/quotation/previewModel.ts` | `buildSummaryRows` | Quotation | View/PDF rows | Yes |
| `src/utils/csvDocumentSummary.ts` | `buildSummaryRows` | Invoice, Quotation | CSV export | Yes |
| `src/tests/invoice/totalsTruthPreview.test.js` | static source assertions only | Test | Test file | Test only |

`calcTotals` and `resolveRowVat` have no production call site.
`useInvoiceColumns.tsx` imports and re-exports them, but no file
imports `calcTotals` or `resolveRowVat` from that hub or from the
`@/domain/invoice` barrel. A repository-wide word-boundary search
found zero references outside the definition file and the re-export
hub.

`extractCalculationInputs`, `buildEditableCalculationInputs`, and
`inferLegacyCalculationInputs` are called internally by other
functions in the same file, but have no external callers.

## Finding 3: Overlap and divergence

### Scenario A: single item, VAT only

Input: one standard row, quantity 2, unit price 1000. VAT 7.5%.
No discount, no WHT, no install, no extra charges.

Executed both functions. Output is identical:

| Metric | canonical | calcTotals |
|--------|-----------|------------|
| Subtotal | 2000 | 2000 |
| VAT | 150 | 150 |
| Grand total | 2150 | 2150 |
| Total payable | 2150 | 2150 |

### Scenario B: multi-item, mixed fixed discount and row VAT override

Input: item 1, quantity 1, unit 100000, VAT inherits global 7.5%.
Item 2, quantity 1, unit 50000, row VAT override 5%.
Fixed discount 10000, before tax. No WHT.

Executed both functions. Output agrees to floating-point noise:

| Metric | canonical | calcTotals |
|--------|-----------|------------|
| Subtotal | 150000 | 150000 |
| Discount | 10000 | 10000 |
| VAT | 9333.333333333334 | 9333.333333333332 |
| Total payable | 149333.33333333334 | 149333.33333333334 |

Both allocate the fixed discount proportionally. The allocation
weights differ (canonical uses per-row VAT base, calcTotals uses
row subtotal), but for this input the weights coincide because
neither row has an install amount.

### Scenarios where the two paths diverge

Executed comparisons produced different totals:

| Scenario | Metric | canonical | calcTotals |
|----------|--------|-----------|------------|
| C: after-tax percent discount 10%, VAT 7.5%, subtotal 100000 | Discount | 10750 | 10000 |
| C: same | Total payable | 96750 | 97500 |
| D: before-tax fixed 10000 + taxable extra charge 20000 | VAT | 8250 | 8125 |
| D: same | Total payable | 118250 | 118125 |
| E: row with taxable install 200 on subtotal 1000, VAT 7.5% | VAT | 90 | 75 |
| E: same | Total payable | 1290 | 1075 |

Exact points of divergence:

1. After-tax percent discount base. Canonical applies the percent
   to the VAT-inclusive line amount (subtotal + install + VAT).
   calcTotals computes the percent on the row subtotal only and
   subtracts the result after tax. Scenario C differs by 750.
2. Discount sharing with taxable extra charges. calcTotals spreads
   a before-tax fixed or percent discount over taxable extra
   charges (`extraTaxableDiscount`). Canonical never discounts
   extra charges. Scenario D VAT differs by 125.
3. Taxable install. Canonical adds the install amount to the row
   VAT base when `install_rate_taxable` is true. calcTotals never
   taxes install; it adds `installRateTotal` flat to the grand
   total. Scenario E total differs by 215.
4. Fixed-discount clamping. Canonical clamps the allocated fixed
   discount to the total eligible VAT base. calcTotals has no such
   clamp. A fixed discount larger than the base would behave
   differently.
5. Custom column totals. calcTotals totals visible numeric custom
   columns where `includeInTotal` is true (`customColTotal`).
   Canonical `DocumentResult` has no custom-column total concept.
6. Numeric approach. Canonical keeps Decimal values through the
   whole computation and rounds once at `toNumber()` (precision 20,
   half-up). calcTotals accumulates plain JavaScript floats, which
   can produce trailing-noise differences (see scenario B VAT).
7. Timing vocabulary. Canonical uses `'before_tax'`/`'after_tax'`.
   calcTotals uses `'before'`/`'after'`.
8. Install-rate visibility. calcTotals includes install only when
   the column configuration says it belongs in totals
   (`shouldIncludeColumnInTotals`). Canonical always sums install.

## Finding 4: History of the two files

- `src/domain/invoice/calculations.ts` is older. It was created on
  2026-03-17 in commit `ef006338` ("qyu").
- `src/lib/Calculations.ts` was created on 2026-03-19 in commit
  `1ba64a4b`, titled "Wire calculation engine, refactor PDF layer
  to dumb renderers". This commit also touched the domain file.
- The lib file carried the "Single source of truth" header from its
  creation commit.
- Both files have nine commits each. Their histories share commits
  from 2026-03-19 onward (`1ba64a4b`, `80b961ee`,
  `69d5343f`), which shows the two files were maintained in
  parallel, not in sequence.
- No comment, TODO, or deprecation note in either file documents
  the split or plans to remove one of them.
- `docs/standard/document-save-orchestration.md` names both
  function families: "Strategies must not import or call
  computeDocument, calcTotals, or resolveRowVat. Financial
  calculation is the exclusive domain of src/lib/Calculations.ts."
  This standard treats `src/lib/Calculations.ts` as the exclusive
  calculation domain, but does not say that `calcTotals` or
  `resolveRowVat` are dead.
- AGENTS.md section 3 says "Use calcTotals() and resolveRowVat()
  for financial calculations" and "src/lib/Calculations.ts is the
  financial source of truth". The function names it mandates live
  in `src/domain/invoice/calculations.ts`, not in the file it names
  as the source of truth. This is the naming split under
  inspection.

## Finding 5: Blast radius

### NRS and tax-compliance work

The NRS PRD work depends on the canonical file only:

- `docs/prd/.../Technical-plan-v1.1.md` section 5 anchors its
  numeric-precision guardrail to `Calculations.ts`, and open
  question 11.5 asks whether `Calculations.ts` uses fixed-point or
  decimal math.
- `docs/prd/.../Technical-plan.md` states that `Calculations.ts`
  holds `computeDocument()` and that `computeDocument()` is the
  single source of truth.
- The `discountPercentEquivalent` fix lives in
  `src/lib/Calculations.ts`. Its consumption path
  (`pdfSummaryLabels.ts`, `financialProjection.ts`,
  `quotation/previewModel.ts`, `invoicePdfActions.ts`,
  `ViewInvoice.tsx`) reads the canonical result and calls
  `buildSummaryRows` from the domain file for display rows only.
- Nothing in the NRS-relevant path calls `calcTotals` or
  `resolveRowVat`.

### Quotation reuse of the invoice domain layer

AGENTS.md section 3 requires quotation logic to reuse the invoice
domain layer. Verified current behavior:

- Quotation forms and views compute totals with
  `computeDocument` from `src/lib/Calculations.ts` — the same
  canonical file invoices use.
- Quotation edit hydration (`src/domain/quotation/normalize.ts`)
  reuses `inferLegacyCalculationState` from the invoice domain
  file.
- Quotation view and PDF rows reuse `buildSummaryRows` from the
  invoice domain file for display.
- Quotation reuses the `@/domain/invoice` barrel for types and
  helpers.

So quotation reuses the invoice domain layer for types, hydration,
and display rows, and shares the canonical totals engine with
invoices.

## Verification Result

- `bun run audit:load`: passed. Only pre-existing warnings, no new
  findings.
- `bun run typecheck`: passed (exit code 0).
- `git status --short`: empty. The working tree is clean. Staged
  work from other agents was committed by the project lead during
  this session (latest commit `1b0e344c`). This read-only task
  changed no files, so nothing was reverted or overwritten.
- `bun run build`: not executed (hardware policy).
- Scenario comparisons were executed in memory with `bun`. No files
  were written.

## Risks or Limitations

- The executed comparisons used the direct function inputs. The
  production callers pass normalized inputs through
  `normalizeDocumentInput` on the canonical side and through form
  state on the calcTotals side, so small input-shape differences
  could not be fully reproduced. The divergence points are
  structural and hold regardless of input shaping.
- `calcTotals` may behave differently when a real column
  configuration is supplied (install and custom column inclusion).
  The comparisons passed an empty column array, which means install
  totals and custom column totals defaulted to zero on that side.

## Deferred Work

No work was performed beyond inspection. The project lead must
decide the future of the two paths. The question, stated plainly:

Are `calcTotals()` and `resolveRowVat()` a legacy path that should
be deleted, or do they serve a real, still-needed purpose that
`calculateDocument()` does not cover — and is anything in
production currently depending on the non-canonical path in a way
that would break if it were removed?
