# Cost & Pricing Sheet PRD 01 — Product and Domain Architecture

Status: Authoritative. Planning only. This document authorizes no implementation.
Date: 2026-09-29
Repository path: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`
Package: `docs/prd/cost-pricing-sheet/`. Sibling documents:
[02-cost-pricing-sheet-presentation-pdf-view-contract.md](02-cost-pricing-sheet-presentation-pdf-view-contract.md),
[03-cost-pricing-sheet-implementation-readiness-roadmap.md](03-cost-pricing-sheet-implementation-readiness-roadmap.md),
[waterfall-roadmap.html](waterfall-roadmap.html). Supersedes `docs/prd/boq-architecture-prd.md` (§§1–7, 9–24).
Authoritative scope: product identity, product decisions, calculation architecture,
persistence, rows, groups, CP/SP, columns, Sub Description, import, photos, prefix engine,
save lifecycle, duplicate, conversion, lineage, audit, export, RFQ isolation, migrations,
shared-infrastructure boundaries.
Evidence basis: `docs/prd/boq-architecture-prd.md` (2026-09-29, §§1–38);
`docs/reports/cost-pricing-sheet/boq-presentation-demolition-phase1-report-2026-09-29.md`;
`docs/reports/cost-pricing-sheet/boq-reconstruction-transplant-plan-2026-09-29.md`;
`docs/reports/cost-pricing-sheet/boq-quotation-compatibility-audit-2026-09-29.md`;
repository re-audit on 2026-09-29 (calculation call graph, standards posture).
Skills used: writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

> Evidence rule. Claims marked *(evidence)* were verified against the repository.
> Prior reports are inputs, not authority. Corrections to the superseded PRD appear
> under "Corrections to the superseded PRD" and in File 03.
>
> Terminology note. "Cost & Pricing Sheet" is the canonical product and domain
> name. "BOQ" is the legacy implementation identifier: it survives in production
> code, table names (`boqs`, `boq_rows`), routes, types, audit entity values,
> and historical reports. This package uses the canonical name in prose and
> preserves legacy identifiers verbatim wherever they name implementation.

---

## 1. Product intent

Cost & Pricing Sheet serves a builder who needs a priced schedule of works. The builder estimates cost,
sets a selling price, sees margin, then converts the schedule into a customer-facing
Quotation. The product must support that path end to end:

```text
Estimate → Cost & Pricing Sheet → convert → Quotation → convert → Invoice
```

Each arrow is a one-way snapshot. Each daughter document becomes independent after
creation. Lineage records ancestry. Lineage creates no live synchronization.
The canonical progression is Cost & Pricing Sheet → Quotation → Invoice.

The Cost & Pricing Sheet is an INTERNAL commercial preparation document. It is
not the customer-facing Quotation and it is not a conventional Bill of
Quantities. Its core concerns: CP as internal cost price; SP as intended
selling price; profit as SP-derived revenue less CP-derived cost; margin as
internal commercial analysis; commercial configuration that prepares the
customer-facing state; conversion that produces a Quotation snapshot.

Intent requirements:

| Requirement | Consequence |
| :--- | :--- |
| The builder must see profit | CP, SP, cost, selling price, gross profit stay first-class |
| The schedule must become a quote | Conversion is a lossless field mapping for shared fields |
| The quote must look like a normal Quotation | Cost & Pricing Sheet needs Quotation-compatible commercial columns |
| The schedule must group work | Groups are first-class in Cost & Pricing Sheet and in Cost & Pricing Sheet import |
| The schedule must be importable | Cost & Pricing Sheet is a first-class JSON Import document |
| The schedule must show photos | Cost & Pricing Sheet uses the established Cloudinary architecture |
| The schedule must number correctly | Cost & Pricing Sheet fully conforms to the Prefix Engine standard |
| The design must land on solid ground | Domain and persistence prepare before the V12 transplant |

---

## 2. Cost & Pricing Sheet domain identity

Cost & Pricing Sheet is a **costing and pricing schedule**. This identity test governs every future decision.

### 2.1 Identity invariants

These properties MUST survive any refactoring, any Quotation compatibility work,
and any design transplant.

| ID | Invariant |
| :--- | :--- |
| I1 | Every Cost & Pricing Sheet item carries both a Cost Price and a Selling Price. |
| I2 | Total Cost = Σ(CP × quantity). |
| I3 | Total Selling Price = Σ(SP × quantity). |
| I4 | Gross Profit = Total Selling Price − Total Cost. |
| I5 | Per-row profit = (SP − CP) × quantity. |
| I6 | CP is never a tax base. CP never appears on a Quotation. |
| I7 | SP is the commercial price of a Cost & Pricing Sheet item. |
| I8 | Cost & Pricing Sheet totals are not the same object as Quotation totals. Both may be shown. |
| I9 | Cost & Pricing Sheet must never become Quotation with a CP field added. |

### 2.2 What Cost & Pricing Sheet is not

- Cost & Pricing Sheet is not a Tax Hub source document (see §4.7).
- Cost & Pricing Sheet is not a Compliance Hub source document (see §4.7).
- Cost & Pricing Sheet is not an Invoice. It has no payment state, no due date, and no amount in words today.
- Cost & Pricing Sheet is not a receipt. It is outside the receipt lifecycle.

### 2.3 Locked formulas

No task may change these without a separate, explicit authorization.

| Formula | Source | Status |
| :--- | :--- | :--- |
| `total_cost = Σ(cp × quantity)` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `total_selling_price = Σ(sp × quantity)` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `gross_profit = total_selling_price − total_cost` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `row_profit = (sp − cp) × quantity` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `line_subtotal = quantity × unit_price` | `src/lib/Calculations.ts` | Locked |
| VAT, discount, install, extra charges, WHT, payable | `src/lib/Calculations.ts` | Locked |

---

## 3. Authoritative product decisions

Where an older standard or prior report conflicts with these decisions, File 03 records
the conflict and the decision governs.

| ID | Decision |
| :--- | :--- |
| D1 | Cost & Pricing Sheet supports groups. |
| D2 | Cost & Pricing Sheet JSON Import supports groups. |
| D3 | Cost & Pricing Sheet Column Settings must reach Quotation-level capability. |
| D4 | Cost & Pricing Sheet includes Quotation-compatible VAT, discount, and install behavior. |
| D5 | D4 does not make Cost & Pricing Sheet a Tax Hub or Compliance Hub source document. |
| D6 | CP remains Cost & Pricing Sheet-specific. |
| D7 | SP maps to Quotation `unit_price` at conversion. |
| D8 | Conversion is snapshot-based. |
| D9 | Later Cost & Pricing Sheet changes do not mutate an existing Quotation. |
| D10 | Later Quotation changes do not mutate an existing Invoice. |
| D11 | Invoice changes never propagate upward. |
| D12 | Lineage is ancestry and audit history. It is not synchronization. |
| D13 | Sub Description is a per-item capability, not a Column Settings option. |
| D14 | Production photos use the established Cloudinary architecture. |
| D15 | The V12 transplant consumes prepared architecture. It does not invent it. |
| D16 | `src/lib/Calculations.ts` is the shared commercial financial engine for Cost & Pricing Sheet. |
| D17 | Cost & Pricing Sheet gains a dedicated domain adapter at `src/domain/boq/calculations.ts`. The adapter maps SP to `unit_price`, retains CP, and derives costing. It duplicates no shared formula. |
| D18 | `pdfcn Forme` is the selected Cost & Pricing Sheet PDF renderer (contract in File 02). |
| D19 | The View Page candidate stays unresolved until explicit human acceptance (contract in File 02). |

---

## 4. Commercial calculation architecture

This section supersedes §10 of the previous PRD. The two-layer shape stands.
The engine ownership is now exact.

### 4.1 Verified call graph (evidence, 2026-09-29)

`src/lib/Calculations.ts` declares the production entry points
`calculateDocument`, `normalizeDocumentInput`, `computeDocument`, and `reverseVat`.
It computes with `decimal.js` (precision 20, `ROUND_HALF_UP`).

Production callers of `computeDocument`:

| Caller | Role |
| :--- | :--- |
| `src/pages/InvoiceFormPage.tsx` | Invoice form totals |
| `src/pages/QuotationFormPage.tsx` | Quotation form totals |
| `src/pages/ViewInvoice.tsx` | Invoice view totals |
| `src/pages/view-invoice-actions.ts` | Invoice view-data totals |
| `src/pages/view-quotation-actions.ts` (`loadQuotationViewData`) | Quotation view-data totals (consumed by `ViewQuotation.tsx` through `useQuotationViewData`) |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Invoice PDF-download totals |
| `src/utils/csvDocumentSummary.ts` | CSV summary over canonical result keys |

`src/domain/invoice/calculations.ts` holds Invoice/Quotation domain utilities:
calculation input extraction, editable-input hydration, legacy inference, row VAT
resolution, extra-charge resolution, summary-row construction, ColumnConfig
integration, InvoiceItem integration. These helpers stay active.

`calcTotals()` and `resolveRowVat()` in that file have **zero production
invocations** *(evidence: the only import site is the barrel re-export in
`src/components/useInvoiceColumns.tsx`; no call site exists under `src/`)*.
They are dead code. They stay untouched until a separate task removes them.

Result: one live commercial engine (`computeDocument`), one live domain-helper
layer, one dead totals function. No drift can occur between two live engines
because only one engine is live.

### 4.2 Normative model

```text
Cost & Pricing Sheet rows
   │
   ├──► SHARED COMMERCIAL MATH — src/lib/Calculations.ts :: computeDocument()
   │      input : quantity, unit_price = sp, vat_rate, discount_rate,
   │              install_rate, install_rate_override, install_rate_taxable,
   │              row_type, group_id, group_name
   │      output: subtotal, installRateTotal, discount, vat, wht,
   │              extraChargesTotal, grandTotal, totalPayable,
   │              taxableBase, per-row line values, group subtotals
   │      scope : shared commercial math ONLY
   │
   └──► COSTING DERIVATION — src/domain/boq/calculations.ts (new adapter)
          input : quantity, cp, sp, row_type + shared commercial result
          output: total_cost, total_selling_price, gross_profit,
                  row_profit, margin
          scope : Cost & Pricing Sheet costing ONLY
```

The adapter MUST NOT reimplement VAT, discount, WHT, install, or extra-charge
math. It calls `computeDocument()` for commercial values. It calls the existing
`computeBoqTotals()` / `computeRowProfit()` in
`src/domain/boq/calculateBoqTotals.ts` for costing derivation. Those helpers
remain authoritative and locked. No second commercial engine exists.

### 4.3 Ownership table

| Question | Owner | Answer |
| :--- | :--- | :--- |
| Tax base | Shared engine | `sp` (§5.2 rule 3) |
| Discount base | Shared engine | `sp` × quantity |
| Install | Shared engine | Shared behavior, unchanged |
| Extra charges | Shared engine | `custom_fields.extraCharges` |
| WHT | Shared engine | Not enabled for Cost & Pricing Sheet in stage 1 (§4.6) |
| Group install subtotal | Shared engine | `ComputedGroup.installTotal` |
| Group cost / profit | Cost & Pricing Sheet adapter | Separate return object |
| Total cost | Cost & Pricing Sheet adapter via `computeBoqTotals` | Locked |
| Gross profit | Cost & Pricing Sheet adapter via `computeBoqTotals` | Locked |
| Margin | Cost & Pricing Sheet adapter | `gross_profit / total_selling_price` |
| Row profit | Cost & Pricing Sheet adapter via `computeRowProfit` | Locked |

### 4.4 Prohibitions

1. `src/lib/Calculations.ts` MUST NOT receive a `cp` input.
2. `computeBoqTotals` formulas MUST NOT change.
3. The Cost & Pricing Sheet adapter MUST NOT copy shared VAT/discount/WHT/install/extra-charge formulas.
4. No PDF template, preview model, or view component may calculate. They consume
   prepared values (contract in File 02).
5. `calcTotals` and `resolveRowVat` stay unused. No new caller may adopt them.

### 4.5 Adapter return contract

`DocumentResult` has no cost or profit field. The adapter MUST NOT fold costing
into it. A Cost & Pricing Sheet-owned value object carries Cost & Pricing Sheet totals beside `DocumentResult`:

```ts
// Target contract — src/domain/boq/calculations.ts (new)
interface BoqCommercialView {
  commercial: DocumentResult        // from computeDocument(), SP as unit_price
  costing: BoqTotals                // from computeBoqTotals(), locked formulas
  groups: BoqGroupTotals[]          // group_id, group_cost, group_selling, group_profit
}
interface BoqTotals {
  total_cost: number
  total_selling_price: number
  gross_profit: number
  margin_percent: number
}
interface BoqGroupTotals {
  group_id: string
  group_cost: number
  group_selling: number
  group_profit: number
}
```

No shared type changes. Invoice and Quotation behavior does not change.

### 4.6 Scope of commercial behavior on Cost & Pricing Sheet

| Capability | Cost & Pricing Sheet scope | Storage | Migration |
| :--- | :--- | :--- | :--- |
| VAT Rate | In scope (D4) | `vat_rate` column + `calculationInputs` | M2 + none |
| Discount Rate | In scope (D4) | `discount_rate` column + `calculationInputs` | M2 + none |
| Discount type/timing | In scope | `custom_fields.calculationInputs` | None |
| Install Rate | In scope (D4) | `install_rate` column | M2 |
| Install multiplier | In scope | `columnConfig.formula` | None |
| Install taxable | In scope | `install_rate_taxable` column | M2 |
| Row overrides | In scope | three nullable columns | M2 |
| Extra charges | In scope | `custom_fields.extraCharges` | None |
| WHT | **Out of scope, stage 1** | — | — |
| Workmanship / transportation / shipping legacy fields | **Out of scope for Cost & Pricing Sheet** | — | — |
| Amount in words | **Out of scope, stage 1** | — | — |

WHT and amount-in-words stay out of stage 1. Nothing prevents later addition.
Excluding them keeps the Cost & Pricing Sheet totals bar consistent with V12, which shows cost,
selling, profit, and margin.

### 4.7 Tax / Compliance Hub boundary

Normative. D5 requires it.

Cost & Pricing Sheet commercial behavior exists for calculation and presentation only.
Cost & Pricing Sheet MUST NOT join any Tax Hub source-document list, any Compliance Hub ingestion
path, `ItemSourceType`, `src/modules/accounting` ingestion, or any tax-return or
NRS reporting scope.

Evidence that no incorrect coupling exists today *(evidence)*: a search of `src/`
for `boq`/`boqs` combined with `tax`, `compliance`, `nrs`, `hub` returns zero
matches; `src/modules/tax` and `src/modules/compliance` hold no Cost & Pricing Sheet reference;
`ItemSourceType` is `'invoice' | 'quotation'` only.

---

## 5. Price ownership: CP / SP / unit_price

| Field | Owner | Meaning | Converted? |
| :--- | :--- | :--- | :--- |
| `cp` | Cost & Pricing Sheet only | Cost price the builder pays | No |
| `sp` | Cost & Pricing Sheet only | Selling price to the customer | Yes → `unit_price` |
| `unit_price` | Quotation and Invoice | The commercial price | Quotation → Invoice |

Rules:

1. `cp` is Cost & Pricing Sheet-only. It MUST NOT reach `quotation_items`, a Quotation column, or a Quotation custom column.
2. `sp` is Cost & Pricing Sheet's commercial price. It occupies the role `unit_price` plays in Quotation.
3. `sp` is the tax base. Cost & Pricing Sheet VAT and discount apply to `sp`, never to `cp`. Derivation: D7 maps `sp → unit_price`, and Quotation taxes `unit_price`. If Cost & Pricing Sheet taxed CP, a converted Quotation would disagree with its source Cost & Pricing Sheet.
4. `cp` is retained through lineage. A user who needs cost after conversion opens the source Cost & Pricing Sheet through `conversionTrail.source` or `source_boq_id`.
5. No Quotation CP field may be invented (D6).

Prohibited: copying `cp` into `quotation_items.custom_data` under a hidden key;
creating a `custom_cp` column during conversion; deriving Quotation totals from `cp`.

---

## 6. Cost & Pricing Sheet ↔ Quotation compatibility contract

Quotation is the compatibility reference. Cost & Pricing Sheet must be structurally compatible
wherever practical.

### 6.1 Compatibility levels

| Level | Meaning |
| :--- | :--- |
| **Native** | Same field name, same type, same semantics. Copy is exact. |
| **Mapped** | Different name. Conversion renames deterministically. |
| **Cost & Pricing Sheet-only** | Exists only on Cost & Pricing Sheet. Conversion omits it by design. |
| **Quotation-only** | Exists only on Quotation. Cost & Pricing Sheet gains it. |
| **Recomputed** | Derived by the target document from copied inputs. |

### 6.2 Field contract

| Concern | Cost & Pricing Sheet | Quotation | Level | Rule |
| :--- | :--- | :--- | :--- | :--- |
| Description | `description` | `description` | Native | Copy |
| Sub Description | `sub_description` | `sub_description` | Native | Copy |
| Make | `make` | `make` | Native | Copy. Cost & Pricing Sheet renames `make_brand` |
| Quantity | `quantity` | `quantity` | Native | Copy |
| Unit | `unit` | `unit` | Native | Copy |
| Commercial price | `sp` | `unit_price` | Mapped | `unit_price = sp` |
| Cost price | `cp` | — | Cost & Pricing Sheet-only | Omit by design (D6) |
| Amount | derived | `amount` | Recomputed | Target derives `quantity × unit_price` |
| VAT rate | `vat_rate` | `vat_rate` | Native | Copy |
| Discount rate | `discount_rate` | `discount_rate` | Native | Copy |
| Install rate | `install_rate` | `install_rate` | Native | Copy |
| Install override | `install_rate_override` | `install_rate_override` | Native | Copy |
| Install taxable | `install_rate_taxable` | `install_rate_taxable` | Native | Copy |
| Photo | `image_url` | `image_url` | Native | Copy |
| Row kind | `row_type` | `row_type` | Native | Copy after Cost & Pricing Sheet renames values |
| Group id | `group_id` | `group_id` | Native | Copy |
| Group name | `group_name` | `group_name` | Native | Copy |
| Custom data | `custom_data` | `custom_data` | Native | Copy |
| Custom columns | `columnConfig` | `columnConfig` | Mapped | Strip/rename Cost & Pricing Sheet-only keys (File 02 of this package covers conversion; mapping rules preserved from superseded §20.4) |
| Group metadata | `groupMeta` | `groupMeta` | Native | Copy verbatim |
| Calc inputs | `calculationInputs` | `calculationInputs` | Native | Copy verbatim |
| Extra charges | `extraCharges` | `extraCharges` | Native | Copy verbatim |
| Item image flag | `showItemImages` | `showItemImages` | Native | Copy verbatim |
| Title | `title` | `quotation_title` | Mapped | Rename |
| Notes | `notes` | `notes` | Native | Copy |
| Project | `project_id` | `project_id` | Native | Copy |
| Client | `client_name` | `client_name` | Mapped | Client-field correction applies (see conversion rules; `vendor_name` is legacy fallback only) |
| Vendor | `vendor_name` | — | Cost & Pricing Sheet-only | Omit |
| Lineage | `conversionTrail` | `conversionTrail` | Mapped | Write `source` on target |
| Document number | `boq_number` | `quotation_number` | Recomputed | Allocate fresh |

### 6.3 No parallel frameworks

Cost & Pricing Sheet MUST NOT receive its own column framework, its own import pipeline, its own
group implementation, its own photo uploader, or its own numbering engine. Every
capability resolves to shared infrastructure or a shared extension.

---

## 7. Column Settings architecture

### 7.1 Reference contract

Quotation Column Settings is the reference *(evidence: `src/components/ColumnManager.tsx`
+ `src/domain/invoice/columns.ts`)*: fixed Description row at index 0; 9 built-ins
(`removable: false`); user `custom_*` columns; drag and up/down reorder; editable
labels; TEXT/NUM badges; show / hide (`show` ↔ `hide_display`); remove / restore
from totals (`hide_full` ↔ `show`); install multiplier via `ColumnConfig.formula`;
reset behind confirm; Row Overrides for per-row `vat_rate`, `discount_rate`,
`install_rate_override`; persistence in `custom_fields.columnConfig`.

Three visibility modes: `show` (form, PDF, view; active); `hide_display`
(form only; still active); `hide_full` (no context; forced to 0, excluded).

Target for Cost & Pricing Sheet: every capability above. Cost & Pricing Sheet MUST NOT keep `TableColumnControls`.
Cost & Pricing Sheet-specific additions: `cp` and `sp` as first-class built-ins (D6).

### 7.2 Normative design — document-scoped built-ins

One framework, per-document built-in sets, via optional parameters:

| Change | Shape | Default | Regression risk |
| :--- | :--- | :--- | :--- |
| `useInvoiceColumns(initial?, builtins?)` | optional param | `BUILTIN_COLUMNS` | None |
| `resolveFinancialColumns(saved, builtins?)` | optional param | `BUILTIN_COLUMNS` | None |
| `getResetColumnConfigs(builtins?)` | optional param | `BUILTIN_COLUMNS` | None |
| `resolveColumnBehavior(columns, items, context, opts?)` | optional opts | unchanged | None |
| `ColumnManager` `hideFullDenyList?: string[]` | optional prop | `[]` | None |
| New `BOQ_BUILTIN_COLUMNS` | Cost & Pricing Sheet-owned export | n/a | None |

Rejected alternative: adding `cp` and `sp` to shared `BUILTIN_COLUMNS`. Every
Invoice and Quotation caller would inherit them and leak Cost & Pricing Sheet costing into
unrelated documents.

No parallel framework: no `useBoqColumns`, no Cost & Pricing Sheet `ColumnManager`, no second
`ColumnConfig` type.

### 7.3 Cost & Pricing Sheet canonical column order

```ts
// Target — src/domain/boq/columns.ts (new)
export const BOQ_BUILTIN_COLUMNS: ColumnConfig[] = [
  { key: 'description',  label: 'Description',       visible: true, visibilityMode: 'show',        removable: false },
  { key: 'quantity',     label: 'Quantity',          visible: true, visibilityMode: 'show',        removable: false },
  { key: 'make',         label: 'Make / Brand',      visible: true, visibilityMode: 'show',        removable: false },
  { key: 'unit',         label: 'Unit',              visible: true, visibilityMode: 'show',        removable: false },
  { key: 'cp',           label: 'CP',                visible: true, visibilityMode: 'show',        removable: false },
  { key: 'sp',           label: 'SP',                visible: true, visibilityMode: 'show',        removable: false, includeInTotal: true },
  { key: 'amount',       label: 'Amount',            visible: true, visibilityMode: 'show',        removable: false },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: false, visibilityMode: 'hide_display', removable: false, includeInTotal: true, formula: '' },
  { key: 'vat_rate',     label: 'VAT Rate',    type: 'vat_rate',     visible: false, visibilityMode: 'hide_display', removable: false },
  { key: 'discount_rate',label: 'Discount Rate', type: 'discount_rate', visible: false, visibilityMode: 'hide_display', removable: false },
  // custom_* appended by the shared system
]
```

Notes: `sp` replaces `unit_price` as Cost & Pricing Sheet's commercial column; `sub_description`
is absent (§8); install, VAT, discount default to `hide_display` as in Quotation;
`amount` is `quantity × sp`.

### 7.4 Cost & Pricing Sheet hide-full deny list

`hide_full` on a locked costing field invalidates Cost & Pricing Sheet totals. Quotation permits
`hide_full` on `quantity` and `unit_price`. Cost & Pricing Sheet diverges:

```ts
export const BOQ_HIDE_FULL_DENY_LIST = ['description', 'quantity', 'cp', 'sp']
```

`quantity`, `cp`, `sp` allow `show` and `hide_display` but never `hide_full`.
`make`, `unit`, `amount`, `install_rate`, `vat_rate`, `discount_rate`, and
`custom_*` allow all three modes. `ColumnManager` renders "Remove from totals"
disabled for deny-listed keys. The deny list defaults to empty, so Invoice and
Quotation behavior is unchanged.

### 7.5 Mandatory / built-in field semantics

Seven levels: (1) exists in schema, (2) appears in editor, (3) appears in
view/PDF, (4) participates in calculation, (5) may be `hide_display`,
(6) may be `hide_full`, (7) may never be semantically disabled.

| Field | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| :--- | :-: | :-: | :-: | :---: | :-: | :-: | :-: |
| `description` | ✔ | ✔ | ✔ | costing input | ✘ | ✘ | ✔ |
| `sub_description` | ✔ | ✔ | ✔ | ✘ | n/a | n/a | ✔ |
| `quantity` | ✔ | ✔ | ✔ | shared + costing | ✔ | ✘ | ✔ |
| `make` | ✔ | ✔ | ✔ | ✘ | ✔ | ✔ | ✘ |
| `unit` | ✔ | ✔ | ✔ | ✘ | ✔ | ✔ | ✘ |
| `cp` | ✔ | ✔ | ✔ | costing | ✔ | ✘ | ✔ |
| `sp` | ✔ | ✔ | ✔ | shared + costing | ✔ | ✘ | ✔ |
| `amount` | derived | ✔ | ✔ | shared | ✔ | ✔ | ✘ |
| `install_rate` | ✔ | ✔ | ✔ | shared | ✔ | ✔ | ✘ |
| `vat_rate` | ✔ | ✔ | ✔ | shared | ✔ | ✔ | ✘ |
| `discount_rate` | ✔ | ✔ | ✔ | shared | ✔ | ✔ | ✘ |
| `notes` | ✔ | ✔ | ✔ | ✘ | n/a | n/a | ✘ |
| `image_url` | ✔ | ✔ | ✔ | ✘ | n/a | n/a | ✘ |

Non-disableable set: `description`, `quantity`, `cp`, `sp`, `sub_description`.
Quotation's `hide_full` semantics MUST NOT be applied blindly to `quantity`,
`cp`, or `sp`.

---

## 8. Sub Description contract

Decision (D13): Sub Description is a per-item capability. It is not a Column
Settings entry.

Quotation reference *(evidence)*: absent from `BUILTIN_COLUMNS`; per-item
`InvoiceItem.sub_description`; database column `quotation_items.sub_description`;
inline disclosure toggle in `MobileItemCard`; forced into the import `itemSchema`;
rendered in PDF/view.

Cost & Pricing Sheet migration: domain key `sub_description` (renamed from `specification`);
`boq_rows` column `sub_description` (M2); legacy read accepts
`cells.specification` as fallback; never present in Column Settings; per-item
disclosure control in the editor; rendered from the item in view/PDF;
`sub_description` import key; copied on duplicate; copied to
`quotation_items.sub_description` on conversion.

V12 interpretation: V12 renders Sub Description as a per-item disclosure row.
That presentation survives. V12 also places `specification` in its canonical
order with a visibility toggle. The transplant MUST remove it from the column
surface. This reinterprets V12; it does not modify the approved V12 file.

---

## 9. Groups architecture

Decision: Cost & Pricing Sheet adopts Quotation's row and group representation directly.
Direct adoption beats boundary normalization on conversion compatibility,
persistence clarity, maintenance, and import reuse. Migration risk is bounded
to Cost & Pricing Sheet's own tables.

Normative target:

```ts
row_type: 'group_header' | 'standard'   // was: 'section' | 'item'
group_id: string | null
group_name: string
```

Header row: `row_type: 'group_header'`, `group_id`, `group_name`,
`description = group_name`, `quantity = 0`, `sp = 0`, `cp = 0`.
Standard row: `row_type: 'standard'`, nullable `group_id`, `group_name`.
Membership: `items[].group_id` is canonical. Ordering: array order of
`boq_rows.sort_order`. Metadata: `boqs.custom_fields.groupMeta: Record<id,
{ name, showSubtotal }>`. `showSubtotal` lives in `groupMeta` only, never on
the row. Normalization ports `normalizeQuotationGrouping` semantics:
canonicalize ids, regenerate on collision, never silently ungroup.
Operations: `addBoqGroup`, `updateGroupName`, `toggleGroupSubtotal`,
`deleteGroup`, `addItemToGroup`, `commitGrouping`. Rows + `groupMeta` persist
together. Group subtotals: shared-engine `ComputedGroup` (install) plus
`BoqGroupTotals` (cost, selling, profit). PDF/view: header band + per-group
subtotal row. Clear all: `commitGrouping([singleItem], [])`.

JSON Import groups: Add mode has full group support; Update mode ignores groups.
Cost & Pricing Sheet reuses shared `buildApplyResult` unchanged and supplies only
`createItem: () => makeEmptyBoqItem()`. No Cost & Pricing Sheet-specific group logic.

Backfill: `boq_rows.row_type` `'section'` → `'group_header'`, `'item'` →
`'standard'`; header name moves from `section_title` to `group_name` +
`description`; `custom_fields.table_rows` receives the same rename on the
legacy read path.

---

## 10. JSON Import architecture

Decision: Cost & Pricing Sheet becomes a first-class JSON Import document on the shared pipeline.
No isolated Cost & Pricing Sheet engine.

Reused unchanged: `src/domain/import/parse.ts`, `normalize.ts`, `validate.ts`,
`resolve.ts`, `overwrite.ts`, `apply.ts`, `tableState.ts`,
`src/components/import/JsonImportLayout.tsx`.

Shared generalizations required: widen `documentType` in
`promptGenerator.ts` from `'invoice' | 'quotation'` to include `'boq'`; emit
group rules only when the module declares group support; add `'cp'` and `'sp'`
to `ImportFieldKey` in `types.ts` so CP/SP are first-class, not custom columns.

New Cost & Pricing Sheet files:

```text
src/domain/boq/importAdapter.ts        prompts · schema · applyResult
src/domain/boq/schema.ts               strict Zod schema (optional — may live in adapter)
src/components/boq/BoqImportSheet.tsx  wraps JsonImportLayout
```

Import contract: fields `description`, `sub_description`, `quantity`, `unit`,
`make`, `cp`, `sp`, `vat_rate`, `discount_rate`, `install_rate`; `custom_fields`
sub-object creates columns through the pipeline; groups in Add mode;
`temp_ref` and `group_id` in Add mode; `row_number` 1..N over standard rows in
Update mode; overwrite confirmation via `detectOverwriteTargets`; verbatim
discipline block; `JsonImportLayout` only with a pre-computed prompt prop;
missing values are `null`, never guessed; schema frozen after import.

---

## 11. Item photo / Cloudinary architecture

V12's local data-URL uploader is presentation-only. It MUST NOT become
production architecture (D14).

Shared pieces, reused *(evidence: `src/lib/documentImageUploadPolicy.ts`,
`src/domain/documentMedia.ts`, `src/components/invoice/MobileItemCard.tsx`)*:
`IMAGE_ACCEPT_ATTRIBUTE`; `isSupportedImageFile(file)`;
`getUnsupportedImageErrorMessage`; cloud `ddhqvv77g`; preset `ml_default`
(unsigned); endpoint `https://api.cloudinary.com/v1_1/ddhqvv77g/image/upload`;
stored value `data.secure_url`; canonicalization
`resolveCanonicalItemImageUrl`.

Upload lifecycle (normative): hidden file input with the accept attribute;
validate after selection; `FormData` with `file` and `upload_preset`; POST to
the shared endpoint; store `data.secure_url` in `image_url`; on failure show
`feedback.error('Upload failed', ...)` without clearing the photo; clear the
input value; save and hydration run `resolveCanonicalItemImageUrl`; temporary
URLs (`blob:`, `file:`, `content:`, `capacitor://`, `filesystem:`) never
persist; replace overwrites; remove sets `null`.

Shared upload function: extract `src/lib/itemPhotoUpload.ts` with
`uploadItemPhoto(file): Promise<string>`. `MobileItemCard` refactors to call
it (behavior-preserving). Cost & Pricing Sheet calls it. One account, one preset, one
implementation. No second account, preset, or Cost & Pricing Sheet-only uploader is permitted.

Duplicate copies `image_url`. Conversion copies it to
`quotation_items.image_url`. PDF/view render it from the prepared item. Remove
clears the field; the Cloudinary asset is not deleted (matches Invoice/Quotation
behavior — no delete path exists in `src/`, evidence).

Persistence: `boq_rows.image_url` (real column). It wins on parity with
`quotation_items`, queryability, normalization, conversion, and ownership.
Avoiding a migration is explicitly rejected as a decision driver. Migration M2
adds the column regardless.

Security: the upload is unsigned and bypasses Supabase. Tenant isolation is by
URL only. Cost & Pricing Sheet MUST NOT extend beyond this established pattern.

---

## 12. Prefix engine architecture

Conformance against `docs/standard/prefix-engine-settings-standard.md`
*(evidence)*: `DEFAULT_PREFIXES.boq` present; `resolvePrefix(prefixes, 'boq')`
used; `getNextBoqNumber` calls shared `nextAutomaticNumber`; cursor helpers
`fetchAutoCursor` / `advanceAutoCursor` used in duplicate and convert; cursor
storage in `settings.document_prefixes.__auto_seq`; `boq` in the DB CHECK and
the settings UI. Missing: create-path wiring (form demolished), `withUniqueRetry`
on create (no create path), DB uniqueness on `boqs.boq_number` (no unique
index), edit immutability guard.

Uniqueness gap: the standard requires `withUniqueRetry` on every insert, which
retries only on PostgreSQL `23505`. `quotations` has a unique index;
`boqs` has only `idx_boqs_archived_active` and `idx_boqs_archived_at`.
Migration M1 is required (File 03).

Numbering rules (normative): prefix always from
`resolvePrefix(settings?.document_prefixes, 'boq')`; fallback
`getNextBoqNumber(rows, prefix = 'BOQ', ...)`; serial layout `BOQ-000001`
(6-digit zero-padded); create wrapped in `withUniqueRetry`; automatic allocation
reads the cursor, skips occupied numbers, retries on `23505`; manual numbers
attempted exactly as typed with no normalization; manual numbers MUST NOT
advance the cursor; automatic allocation skips occupied ids at or above the
cursor; cursor advances only after successful automatic allocation; number
immutable after creation; untouched auto-filled values are system candidates,
not manual; duplicate allocates a fresh automatic number; prefix reset clears
cursor families.

Identity guard: Cost & Pricing Sheet gains `src/domain/boq/assertIdentityImmutable.ts`,
mirroring the Quotation guard. It rejects mutation of `boq_number`,
`client_id` / client identity, and `custom_fields.conversionTrail`.

---

## 13. Persistence and authoritative row store

Problem *(evidence)*: Cost & Pricing Sheet writes rows to `boqs.custom_fields.table_rows` and to
`boq_rows`. `normalizeDbBoq` prefers the JSONB copy when non-empty. Two writable
stores hold one canonical state.

Decision: **`boq_rows` is the single authoritative, writable store for Cost & Pricing Sheet row
state.** It already has RLS policies, tenant schema, and `idx_boq_rows_boq_sort`.
Only columns are missing. It wins on conversion parity, queryability,
normalization, write atomicity, ownership, and existing infrastructure.

Field ownership map:

| State | Authoritative location | Legacy | Retirement |
| :--- | :--- | :--- | :--- |
| Rows | **`boq_rows`** | `custom_fields.table_rows` | Read fallback only; retire after backfill |
| Column configuration | `custom_fields.columnConfig` | `custom_fields.table_columns` | Replace; retire `table_columns` |
| Group metadata | `custom_fields.groupMeta` | `boq_rows.section_title` | Move; retire `section_title` after backfill |
| Calculation inputs | `custom_fields.calculationInputs` | none | New key, shared with Quotation |
| Media references | `boq_rows.image_url` | none | New column |
| Conversion lineage | `custom_fields.conversionTrail` | none | New key, shared with Quotation |
| Extra charges | `custom_fields.extraCharges` | none | New key, shared with Quotation |
| Item image flag | `custom_fields.showItemImages` | none | New key, shared with Quotation |
| Document header | `boqs` columns | — | Unchanged |

After this change Cost & Pricing Sheet uses the same `custom_fields` keys as Quotation, so
commercial-configuration snapshot is a shallow copy, matching
`convertQuotationToInvoice` *(evidence)*.

Write rules: saves write `boq_rows` first, then `boqs` (or one transaction);
saves MUST NOT write `custom_fields.table_rows`; reads prefer `boq_rows`;
transitional legacy read hydrates from JSONB when `boq_rows` is empty and
backfills opportunistically with a log entry; the fallback is removed after the
backfill window.

Backfill: migration M3 copies `custom_fields.table_rows` into `boq_rows` where
empty, applying the §9 row rename and the §8 field rename (File 03).

---

## 14. Save / form lifecycle architecture

Standards: `document-form-consolidation-standard.md` (Cost & Pricing Sheet listed as "Under active
rebuild. Temporary state, not a permanent exception"), `document-save-orchestration.md`,
`lifecycle-ownership-standard.md`. Rule 3 of the consolidation standard permits
a dedicated form UI component inside a consolidated FormPage for a structurally
different domain. Cost & Pricing Sheet qualifies. Cost & Pricing Sheet uses a dedicated form UI, not
`SharedDocumentForm`.

Target file layout:

```text
src/pages/BoqFormPage.tsx                orchestration, mode: 'create' | 'edit'
src/pages/NewBoq.tsx                     3-line delegator: <BoqFormPage mode="create" />
src/pages/EditBoq.tsx                    3-line delegator: <BoqFormPage mode="edit" />
src/components/boq/BoqFormScreen.tsx     dedicated form UI (V12 transplant target)
src/components/boq/useBoqLineItems.ts    row + group operations
src/components/boq/boqFormUtils.ts       buildCustomFields · group meta helpers
src/components/boq/boqFormTypes.ts       editor state types
src/hooks/useBoqSave.ts                  DocumentSaveStrategy<BoqSaveInput>
```

Routes stay unchanged. `AppShell.tsx` already lazy-loads `NewBoq` and `EditBoq`.

Mode responsibilities: create owns next-number query and route-state prefill
(project, client, import); edit owns data loading, identity lock, and duplicate
from editable.

Save strategy (`useDocumentSave` supplies `validate`, `buildPayload`, `persist`,
`afterSave`, `getNavigationTarget`): `validate` enforces §14 validation plus the
edit-mode identity check; `buildPayload` is synchronous and MUST NOT call
`computeDocument` or the Cost & Pricing Sheet adapter (totals arrive pre-computed); `persist`
uses `withUniqueRetry` + `getNextBoqNumber` + cursor advance on create and plain
update on edit; `afterSave` emits audit, persists rows, writes lineage;
`getNavigationTarget` returns `/boqs/:id`.

Validation contract (derived from V12's save gate, evidence): `boq_number`
non-empty; every `standard` row has non-empty `description`, `quantity > 0`,
`sp > 0`; group headers exempt. Blocking errors highlight and scroll to the
offending row.

Lifecycle placement: init `createEmptyBoq`; load in `BoqFormPage` edit branch;
hydrate via `normalizeDbBoq` + `resolveFinancialColumns`; edit in form state;
compute shared + costing memoized in `BoqFormPage`; validate in strategy;
persist in strategy + `useDocumentSave`; export from prepared data only;
convert per File 02; revert out of scope for stage 1.

---

## 15. Snapshot lineage model

```text
Cost & Pricing Sheet  ──convert(snapshot)──►  Quotation  ──convert(snapshot)──►  Invoice
 ▲                                ▲                                 │
 │                                │                                 │
 └────── NO backward propagation ◄─┴─────────────────────────────────┘
```

Four distinct concepts, never conflated: (1) conversion snapshot — state copied
at one instant; (2) lineage — ancestry links, a record of a past event;
(3) audit history — field diffs and domain events; (4) live synchronization —
a subscription propagating later parent edits into a child. Concept 4 does not
exist *(evidence: no `onPostgresChange`, no document `.channel(`; the only
subscriptions live in `src/App.tsx` and `src/pages/Settings.tsx`)*.

Snapshot rules: at conversion, copy state per File 02; after creation the
daughter is independent. Cost & Pricing Sheet SP, tax, discount, column, group, or item changes
MUST NOT mutate the Quotation, transitively or otherwise. Later Quotation edits
MUST NOT change the Invoice. Invoice price changes are authoritative for that
Invoice and never propagate upward or backward.

Implementation prohibitions: no Postgres change listener updating a child; no
live parent foreign key re-read during child render; no daughter-total
recomputation from parent rows; no daughter writes from parent mutation
handlers; no "sync / refresh from source / update linked document" control.
`quotations.source_boq_id` is a lineage foreign key (`ON DELETE SET NULL`,
partial index). Lineage and conversion surfaces alone may read it.

Lineage storage: Cost & Pricing Sheet `custom_fields.conversionTrail.derived[]` lists produced
Quotations; Quotation `conversionTrail.source` holds
`{ id, type: 'boq', number, project_id, po_number, created_at }` plus direct FK
`source_boq_id`; Quotation `conversionTrail.derived[]` lists produced Invoices;
Invoice `conversionTrail.source` holds `{ id, type: 'quotation', ... }`.
Cost & Pricing Sheet uses the shared `withSourceTrail` / `appendDerivedTrail` helpers in
`src/domain/documentConversion.ts` and MUST NOT add a parent observer.

Known drift (lineage correctness, not sync): `DocumentTrailLink.type` in
`src/domain/invoice/types.ts` is `'invoice' | 'quotation'` and MUST gain
`'boq'`; `buildTrailLink({ type: 'quotation' })` currently mislabels the Cost & Pricing Sheet
source (File 03 records the fix).

---

## 16. RFQ isolation strategy

Current sharing *(evidence)*: `table-document` is shared by Cost & Pricing Sheet and RFQ.
RFQ components, shared table-document files, Cost & Pricing Sheet domain files, and RFQ domain
files all import it. RFQ is not reconstructed.

Strategy — controlled Cost & Pricing Sheet migration away, RFQ unchanged: Cost & Pricing Sheet row type becomes
the shared `InvoiceItem` contract; Cost & Pricing Sheet columns become `BOQ_BUILTIN_COLUMNS`;
Cost & Pricing Sheet stops importing `TableRowsEditor` and `TableColumnControls`; Cost & Pricing Sheet gains
`src/domain/boq/rows.ts`; `table-document` files stay untouched;
`templateRegistry.ts` keeps `RFQ_COLUMNS`; `BOQ_COLUMNS` becomes legacy-read
only, then retires; `TableDocumentType = 'rfq' | 'boq'` narrows only after Cost & Pricing Sheet
has no caller.

Prohibitions: do not change `TableDocumentRow` or `TableDocumentColumn` fields;
do not change `createEmptyTableRow` / `ensureTableRowKeys` signatures; do not
delete `RFQ_COLUMNS`; do not force RFQ onto the new architecture; do not remove
`'boq'` from `TableDocumentType` until Cost & Pricing Sheet has no caller.

Proof of isolation (before backend Phase C in File 03):

```bash
grep -rn "table-document" src/domain/boq src/components/boq src/pages/Boq*.tsx src/pages/NewBoq.tsx src/pages/EditBoq.tsx src/pages/ViewBoq.tsx
# → zero BOQ-owned matches (legacy read path excepted)
grep -rn "table-document" src/components/rfq src/domain/rfq
# → unchanged from baseline
```

---

## 17. Shared infrastructure reuse and generalization map

| Capability | Classification | Target |
| :--- | :--- | :--- |
| Prefix resolution | Direct reuse | `resolvePrefix` |
| Number generation | Direct reuse | `getNextBoqNumber`, `nextAutomaticNumber` |
| Cursor read/write | Direct reuse | `fetchAutoCursor`, `advanceAutoCursor` |
| Collision retry | Direct reuse after M1 | `withUniqueRetry` |
| Column hook | **Shared extension** | `useInvoiceColumns(initial?, builtins?)` |
| Column hydration | **Shared extension** | `resolveFinancialColumns(saved, builtins?)` |
| Reset | **Shared extension** | `getResetColumnConfigs(builtins?)` |
| Column UI | Direct reuse | `ColumnManager` + `hideFullDenyList` prop |
| Column persistence | Direct reuse | `custom_fields.columnConfig` |
| Column PDF helpers | Direct reuse | `getPdfColumns`, `getPdfCellValue` |
| Cost & Pricing Sheet built-ins | Cost & Pricing Sheet-specific domain | `src/domain/boq/columns.ts` |
| Cost & Pricing Sheet calculation adapter | Cost & Pricing Sheet-specific domain | `src/domain/boq/calculations.ts` (new) |
| Cost & Pricing Sheet costing derivation | Preserve, delegate | `computeBoqTotals`, `computeRowProfit` |
| Group model | Direct reuse | Quotation group contract |
| Group operations | Cost & Pricing Sheet adapter | `useBoqLineItems`, ported from `useQuotationLineItems` |
| Group metadata | Direct reuse | `custom_fields.groupMeta` |
| Group normalization | Direct reuse | `normalizeQuotationGrouping` semantics |
| Import pipeline | Direct reuse | `src/domain/import/**` |
| Import prompt | **Shared extension** | Widen `documentType`, add `cp`/`sp`, group-support flag |
| Import adapter | Cost & Pricing Sheet adapter | `src/domain/boq/importAdapter.ts` |
| Import UI | Direct reuse | `JsonImportLayout` |
| Image picker policy | Direct reuse | `documentImageUploadPolicy.ts` |
| Cloudinary upload | **Shared extension** | `src/lib/itemPhotoUpload.ts`, one preset |
| Image canonicalization | Direct reuse | `resolveCanonicalItemImageUrl` |
| Photo persistence | Cost & Pricing Sheet-specific | `boq_rows.image_url` |
| Commercial math | Direct reuse | `computeDocument` |
| Save orchestration | Direct reuse | `useDocumentSave` |
| Form orchestration | Cost & Pricing Sheet adapter | `BoqFormPage` |
| Form UI | Cost & Pricing Sheet-specific (Rule 3) | `BoqFormScreen` |
| Identity immutability | Cost & Pricing Sheet adapter | `src/domain/boq/assertIdentityImmutable.ts` |
| Conversion helpers | Direct reuse | `buildTrailLink`, `withSourceTrail`, `appendDerivedTrail` |
| Audit | Direct reuse + Cost & Pricing Sheet emitters | `recordAuditLog`, `record_activity_event` |
| FAB create | Direct reuse | `MobileFab` |
| FAB save | Direct reuse | `FormFooter` |
| FAB download | Direct reuse | `FloatingDownloadButton` |
| PDF customization | Preserve unchanged | `src/domain/pdf/customization/boq.ts` |
| PDF pipeline | Forme target | File 02 owns the contract |
| List page | Preserve unchanged | `BoqList`, `Boqs`, `DocumentQueryContext` |
| Export | **Fix required** | `exportFetchers.ts`, `exportCompilers.ts` |
| `table-document` | Preserve for RFQ | `src/domain/table-document/**`, `src/components/table-document/**` |

Shared files that accept behavior-preserving edits (optional parameters or
internal extraction only): `useInvoiceColumns.tsx`, `resolveFinancialColumns.ts`,
`getResetColumnConfigs` in `columns.ts`, `ColumnManager.tsx`,
`import/types.ts`, `import/promptGenerator.ts`, `MobileItemCard.tsx`,
`documentConversion.ts` (additive `'boq'` union member).
Regression guard after each shared edit: `columnVisibilityMode.test.js`,
`jsonGroupImport.test.js`, `calculations.test.js` MUST pass.

Shared files that MUST remain untouched: `src/lib/Calculations.ts` (no `cp`
input); `src/domain/invoice/calculations.ts` (deprecated functions stay dead);
`JsonImportLayout.tsx`; `documentImageUploadPolicy.ts`; `documentMedia.ts`;
`MobileFab.tsx`; `FloatingDownloadButton.tsx`;
`src/domain/pdf/customization/boq.ts`; `prefixConstants.ts`;
`documentNumbering.ts`; `documentConversion.ts` (except the additive union);
`useDocumentSave.ts`; `src/components/table-document/**`; RFQ files;
Quotation files; Invoice form files; the approved V12 HTML (read only).

---

## 20. Cost & Pricing Sheet → Quotation conversion mapping

Function `convertBOQToQuotation` in `src/pages/view-boq-actions.ts` is rewritten
to this contract.

Document header mapping: `quotation_number` recomputed through the shared
cursor + `getNextQuotationNumber`; `title` → `quotation_title`; `client_name` →
`client_name` (§9 Q3: `vendor_name` legacy fallback only); `vendor_name` and
`vendor_contact` omitted as Cost & Pricing Sheet-only; `project_id` copied; `issue_date` set to
today; `status` set to `'open'`; `notes` copied (new — currently missing);
`boq.id` → `source_boq_id`; `custom_fields.conversionTrail.source` written with
`type: 'boq'`; target `subtotal`/`total` zeroed (target recomputes on open).

Item mapping: `row_type`, `group_id`, `group_name` copied (after the §9 rename);
`sort_order` rebased 0..n; `description`, `sub_description` (new), `make`
(new — was unmapped `make_brand`), `quantity`, `unit` copied; `sp` →
`unit_price` (transformed); `cp` intentionally omitted; `amount` recomputed as
`quantity × unit_price`; `image_url`, `vat_rate`, `discount_rate`,
`install_rate`, `install_rate_override`, `install_rate_taxable`, `custom_data`,
row `notes` copied (new). Group header rows keep `quantity = 0`,
`unit_price = 0`, `cp = 0`.

Configuration mapping: `groupMeta`, `calculationInputs`, `extraCharges`,
`showItemImages` copied verbatim; `columnConfig` transformed
(`sp` key renamed to `unit_price` with label, visibility, and order preserved;
`cp` removed; `sub_description` never present; all other keys verbatim; result
passes through `resolveFinancialColumns`); `conversionTrail` writes source
only, never copies `derived`; `template_id`, palette, `table_rows` omitted.

Client-field correction: `boqs` holds both `client_name` and `vendor_name`
*(evidence)*. Current code prefers `vendor_name`. Target prefers `client_name`
with `vendor_name` as legacy fallback. This is a defect correction, not a
feature.

Unknown-column protection: `toQuotationItemRow` spreads remaining item keys
through `toDbItem`, but `quotation_items` has no `cp`, `sp`, `specification`,
or `make_brand` columns *(evidence)*. Conversion MUST construct the Quotation
row from an explicit whitelist (`toQuotationItemRowFromBoq`), never a spread.

Classification: copied — description, sub_description, make, quantity, unit,
row_type, group_id, group_name, image_url, VAT/discount/install rates and
overrides, custom_data, row notes, groupMeta, calculationInputs, extraCharges,
showItemImages, notes, project_id. Transformed — `sp → unit_price`,
column-config renames, client preference. Recomputed — `quotation_number`,
`amount`, `sort_order`, `issue_date`. Intentionally Cost & Pricing Sheet-only — `cp`, total
cost, gross profit, margin, template/palette, `vendor_name`, `vendor_contact`.
Intentionally omitted — `custom_fields.table_rows`, `table_columns`.

Post-conversion: advance the Quotation cursor after successful automatic
allocation; emit Quotation `LINK` audit + `LINKED` activity; write
`conversionTrail.derived` on the source Cost & Pricing Sheet; never write back to the Cost & Pricing Sheet.

---

## 21. Duplicate / transformation contract

The transformation standard's Duplicate Law governs: a duplicate is a clean
draft pre-filled with line items and pricing — no identity, no client, no
payments, no lineage. A new origin.

Current defect *(evidence)*: `duplicateBOQRecord` strips identity from the
`boqs` row but never reads or writes `boq_rows`. Items, groups, columns,
photos, and commercial settings are lost.

Target contract: new `id`, no carried identity; fresh automatic number through
`withUniqueRetry`; lineage shed (`conversionTrail` empty, no `source_boq_id`);
client, vendor, and project links shed; status `'open'`; issue date today.
Copied: all rows (including `cp`, `sp`, `sub_description`, `image_url`,
`custom_data`); groups (`row_type`, `group_id`, `group_name`, `groupMeta`);
`columnConfig`; custom data; photos; commercial settings (`calculationInputs`,
`extraCharges`, `showItemImages`, discount/WHT types); notes, terms, title.
Audit: `CREATE` on `audit_logs` + `CREATED` on `activity_events` (matches
Quotation duplicate, evidence). Source-state preference: duplicating from an
editable state reflects what the user sees, not the last saved version.

Order of operations: persist (or read) current editable state; strip identity,
lineage, client, project; allocate the number; insert `boqs`; insert `boq_rows`
with rebased `sort_order` and new row ids; write `custom_fields` minus lineage;
advance the cursor; emit audit; navigate to the form view in unsaved state.

---

## 22. Audit event contract

Infrastructure *(evidence)*: `audit_logs.entity_type` is unconstrained text;
`activity_events.entity_type` already includes `'boq'`; both generic RPCs
(`record_activity_event`, `record_audit_log`) accept any entity type. **No
migration is required.** Missing application code: `'boq'` in `AuditEntityType`,
`BOQ_TRACKED_FIELDS`, and `recordBoq*` emitters in `src/lib/audit.ts`. A
dedicated `record_boq_created` RPC is not required. Cost & Pricing Sheet rows are absent from
the audit-trail standard §6 matrix (File 03 §8 records the update).

Event matrix:

| Cost & Pricing Sheet event | `audit_logs` action | `activity_events` event_type | Payload |
| :--- | :--- | :--- | :--- |
| Create | `CREATE` | `CREATED` | `BOQ_TRACKED_FIELDS` |
| Meaningful edit | `UPDATE` | `UPDATED` | field diff of tracked fields |
| Duplicate | `CREATE` | `CREATED` | tracked fields |
| Status change | `STATUS_CHANGE` | `STATUS_CHANGED` | old/new |
| Convert to Quotation | `LINK` | `LINKED` | target id + number |
| Archive | `ARCHIVE` | `ARCHIVED` | reason |
| Delete | `DELETE` | — | `activity_events` has no `DELETED` type |

`BOQ_TRACKED_FIELDS`: `boq_number`, `title`, `client_name`, `vendor_name`,
`status`, `issue_date`, `project_id`, `template_id`, `notes`, `columnConfig`,
`groupMeta`, `calculationInputs`, `extraCharges`, `showItemImages`.

Row-level price state at conversion: `audit_logs.changes` holds field diffs;
the conversion instant is snapshotted in `activity_events.metadata` on the
`LINKED` event:

```json
{ "boq_number": "BOQ-000012", "quotation_number": "QTN-000045", "item_count": 42, "total_selling_price": 1850000, "total_cost": 1500000, "gross_profit": 350000 }
```

One-time snapshot. No subscription.

Audit must explain: Cost & Pricing Sheet creation; meaningful edits; duplication; conversion
with price state at that instant; the source/daughter relationship in both
directions; that lineage is ancestry, not synchronization.

---

## 23. Export contract

Defect *(evidence)*: `src/services/exportFetchers.ts:51` maps `BOQS` to
`'boq_items'`; `src/utils/exportCompilers.ts:126,176` carry the same wrong
name. Table `boq_items` does not exist. The child table is `boq_rows`.

Correction: `ITEMS_TABLE_MAP.BOQS` → `'boq_rows'`; `flattenLineItems`
`itemsKey` for `BOQS` → `'boq_rows'`; add `'boq_rows'` to `possibleItemProps`;
verify the flattened line-item property name against `domainSchemas.BOQS`
during implementation.

Export field mapping: `#` from row index; Description; Sub Description;
Make / Brand from `make`; Quantity; Unit; CP; SP; Amount (derived); Group from
`group_name`.

Verification: the reconstruction MUST include a static check that no
`boq_items` string remains anywhere under `src/`.

---

## 24. Corrections to the superseded PRD

1. Calculation ownership is now exact. The previous §10 described the two layers
   but left the adapter shape and the `src/domain/invoice/calculations.ts`
   question open. This file resolves both: `computeDocument()` is the only live
   engine; `calcTotals()`/`resolveRowVat()` are verified dead (barrel re-export
   only, zero invocations); the Cost & Pricing Sheet adapter delegates costing to the locked
   `computeBoqTotals()`.
2. The previous §25 pipeline (`BoqPdfDocument`, shared React-PDF renderers) is
   superseded by the Forme contract. File 02 owns it.
3. View Page status: the previous PRD recorded no accepted candidate. Four
   candidates now exist (V1–V4) and none carries explicit acceptance. Status
   remains UNRESOLVED. File 02 owns the evaluation.
4. No other verified finding is overturned. Identity, compatibility, lineage,
   conversion, duplicate, audit, export, RFQ, migration, and standards-delta
   findings carry forward unchanged.

---

## 25. Domain acceptance criteria

A future implementation agent can answer yes to every item:

- [ ] Cost & Pricing Sheet identity invariants I1–I9 are explicit and testable.
- [ ] Locked formulas are listed and marked unchangeable.
- [ ] `computeDocument()` is the only live commercial engine; the verified call graph names its callers.
- [ ] `calcTotals()`/`resolveRowVat()` have no new callers.
- [ ] The Cost & Pricing Sheet adapter maps SP→`unit_price`, retains CP, delegates costing to locked helpers, and duplicates no shared formula.
- [ ] CP never reaches a Quotation in any form. SP is the tax base.
- [ ] Compatibility levels cover every field. No parallel Cost & Pricing Sheet framework exists.
- [ ] Column parity, canonical order, and the hide-full deny list are specified.
- [ ] Sub Description is per-item, never a column.
- [ ] Groups, import, photos, prefix, persistence, save, RFQ isolation, and the reuse map are specified.
- [ ] Repository evidence and target architecture are clearly distinguished.
- [ ] Conversion mapping, duplicate contract, audit events, and export correction are specified.
