# BOQ Close-Out Audit Report

This report was written by Buffy on 2026-09-17 via Freebuff.

## Objective

Audit the three trailing sub-tasks of the BOQ renovation after the previous
agent finished the work but crashed before writing its report:

1. `amount_in_words` for BOQ (Total Selling Price in words).
2. PDF column-width visual QA on `TableDocumentPdfDocument`.
3. End-to-end browser test of BOQ to quotation conversion.

This session is an audit pass. It verifies delivered work, records defects,
and states what stays open.

## Scope

Read-only inspection of the working tree and commit history. Typecheck and
test runs. No application code changed in this session.

## Files changed

- `docs/reports/boq/boq-close-out-audit-report-2026-09-17.md` (this report).

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Sub-task 1: amount_in_words for BOQ

### What was delivered

Commit `c0eeeb93` contains the amount-in-words work. The audit traced every
file in that commit that touches this feature.

### Reuse precedent — what the audit found

The task asked for a precedent check before choosing import versus copy.
The audit found a precedent split, and the delivered choice does not match
the newer pattern:

| Consumer | Source of numberToWords | Pattern |
|---|---|---|
| Invoice save hook (`useInvoiceSave.ts`) | `@/lib/formatters/money` | Shared import |
| Invoice form page (`InvoiceFormPage.tsx`) | `@/lib/formatters/money` | Shared import |
| BOQ form and preview (this task) | `@/lib/formatters/money` | Shared import |
| Receipt preview model (`src/domain/receipt/previewModel.ts`) | Private local function | Domain-local copy |

The receipt copy is older, private, and never exported. The invoice and BOQ
consumers use the shared exporter. BOQ importing from
`src/lib/formatters/money.ts` follows the dominant cross-domain pattern and
keeps business logic out of UI components. The receipt copy is a leftover
duplication candidate, not a blocker.

Verdict: reuse choice is correct per precedent.

### Wiring coverage — partial

| Display surface | Wired | Evidence |
|---|---|---|
| BoqForm Output tab | Yes | Line 83, below the totals block |
| BoqPreview | Yes | Line 30, below the totals strip |
| ViewBoq hero metrics | **No** | Metrics show Total Selling Price only, no words line |
| BOQ PDF | **No** | `TableDocumentPdfDocument.tsx` has no words output |

The delivered value is correct in kind: `numberToWords(totals.total_selling_price)`
represents Total Selling Price, not any tax-inclusive total. BOQ has no VAT
or WHT concept, so this matches the confirmed direction.

Defect D1 (minor, gap): amount in words is absent from ViewBoq and the BOQ
PDF. Consistency requirement in the task was "form, preview, view page, PDF".

### Behavior notes found during audit

- Zero renders as `ZERO NAIRA ONLY`. Kobo uses `Math.round`, so `x.999`
  naira can produce a kobo carry that the words omit from the naira part
  (`naira = Math.floor(num)`). Cosmetic edge case, negligible at document
  scale, no fix applied in an audit pass.

## Sub-task 2: PDF column-width visual QA

### What exists in code

`TableDocumentPdfDocument.tsx` uses `widthsByKey`:

`description 30, specification 16, quantity 8, unit 8, make_brand 10,
cp 8, sp 8, profit 10`, plus `s_no 8`. These match the rebalance described
in the task (34→30, 18→16, 10→8, 12→10).

### What the audit could verify

- Typecheck passes. The audit gate re-ran `bun run typecheck`: pass.
- The rendered PDF inspection itself was not performed. No PDF artifact,
  screenshot, or observation record exists in the repository. The report
  for this session is the first written record.

### What the audit found in code instead

- Alignment: all body cells render through `PdfCurrencyText` with the same
  style. `PdfCurrencyText` applies a locked currency font when the string
  looks like currency, otherwise plain `Text`. There is no right-alignment
  property on cp, sp, or profit cells. Numeric alignment is therefore
  left-aligned and font-consistent, not right-aligned. The task asked to
  confirm current behavior: it is left-aligned with a dedicated currency
  font for currency-shaped strings.
- Wrapping: react-pdf `Text` wraps by default, so long descriptions wrap
  rather than overflow. This is inference from the renderer, not observed
  output. It needs the visual pass to confirm.
- The audit ran `src/tests/pdf`: 27 pass, 33 fail. Failures include a
  currency formatting mismatch (`'₦ 150,000'` vs `'150,000'`) and column
  merge/layout assertions in the commercial PDF path. These tests cover
  the commercial invoice PDF engine, not the table-document BOQ PDF, so
  they are not evidence against this sub-task. They are pre-existing
  failures in an adjacent area.

Defect D2 (medium, unverified): the visual QA pass left no evidence. The
column rebalance is computed, not observed. Still open.

## Sub-task 3: End-to-end browser test of BOQ to quotation conversion

### What the audit could verify statically

`src/pages/view-boq-actions.ts` conversion path:

- `source_boq_id: boq.id` is set in the quotation INSERT payload (line 81).
- `custom_fields` carries the conversion trail via `withSourceTrail` and
  `buildTrailLink` (lines 82-91).
- Item mapping sets `unit_price: item.sp || item.unit_price || 0` and
  `amount: quantity * sp` (lines 100-102). CP does not flow into
  quotation items.
- The database migration `20260916000000` added `source_boq_id` to every
  schema with a `quotations` table. The prior audit report records a
  successful `supabase db push` and column confirmation on
  `entity_bigdrops-main_main` and `entity_bigdrops-main_agbado`.

### What the audit could not verify

No test run happened. No quotation row was queried. No browser session was
recorded. The five acceptance checks in the task (row-level
`source_boq_id`, sp-equals-unit_price per item, CP absence in the stored
record, badge render and navigation, null `source_boq_id` on an unrelated
quotation) remain unproven at runtime.

The prior audit report already listed this item as deferred for the same
reason. It remains deferred.

Defect D3 (medium, unverified): end-to-end conversion remains untested
against a real entity schema.

## Verification

```
- bun run audit:load: passed (pre-existing warnings only; CreateCompanySheet
  and RoleBuilder size warnings unchanged)
- bun run typecheck: passed
- bun test src/tests/pdf + src/tests/document: 27 pass, 33 fail — all
  failures pre-existing in the commercial PDF engine and document view
  areas, none in BOQ or table-document code
- bun run build: skipped due to hardware policy
- supabase db push: not applicable (no SQL changed in this session;
  migration 20260916000000 already pushed by the prior session)
- git status: clean before and after this report
```

## Risks or limitations

- This audit verifies code and history, not rendered pixels or live rows.
  Sub-tasks 2 and 3 need an environment with a browser and a live Supabase
  connection.
- The pdf test failures predate this phase. They point at the commercial
  invoice engine, and one assertion conflicts with current currency
  formatting (`₦ 150,000`). Fixing them is out of scope for a BOQ audit.

## Deferred work

| Item | Owner note |
|---|---|
| D1: wire amount-in-words into ViewBoq metrics and `TableDocumentPdfDocument` | Small code change, in scope for a follow-up code task |
| D2: actual visual QA of BOQ PDF column widths with long text | Needs browser or PDF render run |
| D3: live E2E conversion test with row-level DB assertions | Needs running dev server and entity schema access |
| Optional: consolidate receipt-local `numberToWords` into the shared exporter | Cross-domain cleanup, separate task |

## Closing statement

Sub-task 1 is done in code and shipped in commit `c0eeeb93`, with two
display surfaces still unwired (D1). Sub-task 2 and sub-task 3 are not
done: no evidence of execution exists. The BOQ renovation phase stays
open until D2 and D3 are executed and recorded.
