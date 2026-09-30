# 01 — BOQ Domain Architecture

**Part of the BOQ PRD package.** Entry point: [README.md](README.md).

**Date:** 2026-09-29
**Documentation standard:** ASD-STE100 Simplified Technical English
**Skills used:** writing-clearly-and-concisely
**Status:** Domain/backend architecture RESOLVED. Planning authorization only. No implementation is authorized by this document.

**Source.** Split from `docs/prd/boq-architecture-prd.md`. Every section keeps its old section number in the heading. Example: `§5 (old §10)` means this is old section 10.

**Evidence rule.** Every claim marked *(evidence)* was verified against the repository. Prior reports are inputs, not authority. See [README §7](README.md) for current-state corrections.

**Companion documents.**

- [02 — BOQ Document Lifecycle](02-boq-document-lifecycle.md): save, convert, duplicate, audit, export.
- [03 — BOQ Presentation Contract](03-boq-presentation-contract.md): V12 gate, FAB, View Page, pdfcn Forme PDF.

---

## §1. BOQ Domain Identity (old §3)

BOQ is a **costing and pricing schedule**. This is the identity test for every future decision.

### §1.1 Identity Invariants

These properties MUST survive any refactoring, any Quotation compatibility work, and any design transplant.

| ID | Invariant |
| :--- | :--- |
| I1 | Every BOQ item carries both a Cost Price and a Selling Price. |
| I2 | Total Cost = Σ(CP × quantity). |
| I3 | Total Selling Price = Σ(SP × quantity). |
| I4 | Gross Profit = Total Selling Price − Total Cost. |
| I5 | Per-row profit = (SP − CP) × quantity. |
| I6 | CP is never a tax base. CP never appears on a Quotation. |
| I7 | SP is the commercial price of a BOQ item. |
| I8 | BOQ totals are not the same object as Quotation totals. Both may be shown. |
| I9 | BOQ must never become Quotation with a CP field added. |

### §1.2 What BOQ Is Not

- BOQ is not a Tax Hub source document. (§5.7)
- BOQ is not a Compliance Hub source document. (§5.7)
- BOQ is not an Invoice. It has no payment state, no due date, and no amount in words today.
- BOQ is not a receipt. It is outside the receipt lifecycle.

### §1.3 Locked Formulas

These are locked by the repository. No task may change them without a separate, explicit authorization.

| Formula | Source | Status |
| :--- | :--- | :--- |
| `total_cost = Σ(cp × quantity)` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `total_selling_price = Σ(sp × quantity)` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `gross_profit = total_selling_price − total_cost` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `row_profit = (sp − cp) × quantity` | `src/domain/boq/calculateBoqTotals.ts` | Locked |
| `line_subtotal = quantity × unit_price` | `src/lib/Calculations.ts` | Locked |
| VAT, discount, install, extra charges, WHT, payable | `src/lib/Calculations.ts` | Locked |

---

## §2. Target-State Architecture (old §6)

### §2.1 Layer Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│ V12 PRESENTATION (React transplant — LAST)                      │
│  BoqFormScreen  ·  BoqViewScreen  ·  responsive composition      │
│  renders prepared state · wires existing commands                │
└───────────────▲─────────────────────────────────────────────────┘
                │ props: state + commands
┌───────────────┴─────────────────────────────────────────────────┐
│ PAGE ORCHESTRATION                                              │
│  src/pages/BoqFormPage.tsx  (mode: create | edit)               │
│  NewBoq.tsx / EditBoq.tsx  — thin delegators                    │
│  useBoqSave (DocumentSaveStrategy)                              │
└───────────────▲─────────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────────┐
│ SHARED SERVICES  (direct reuse or shared extension)             │
│  useInvoiceColumns · resolveFinancialColumns · ColumnManager    │
│  JsonImportLayout · documentImageUploadPolicy · itemPhotoUpload │
│  resolvePrefix · nextAutomaticNumber · withUniqueRetry          │
│  useDocumentSave · MobileFab · FloatingDownloadButton           │
└───────────────▲─────────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────────┐
│ DOMAIN                                                          │
│  Layer 1  src/lib/Calculations.ts  computeDocument()            │
│           → VAT · discount · install · extra charges · totals   │
│  Layer 2  src/domain/boq/calculateBoqTotals.ts                  │
│           → CP · total cost · gross profit · margin             │
│  src/domain/boq/{columns,rows,groups,normalize,types}.ts        │
└───────────────▲─────────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────────┐
│ PERSISTENCE  (ONE authoritative row store)                      │
│  boqs            — document header + custom_fields              │
│  boq_rows        — AUTHORITATIVE rows (parity columns)          │
│  boqs.custom_fields — columnConfig · groupMeta ·                │
│                       calculationInputs · conversionTrail ·     │
│                       showItemImages · extraCharges             │
│  (custom_fields.table_rows — read-only legacy, then retired)    │
└─────────────────────────────────────────────────────────────────┘
```

### §2.2 Ownership Summary

| Concern | Owner | Notes |
| :--- | :--- | :--- |
| Commercial math | `src/lib/Calculations.ts` | Never bypassed |
| BOQ costing math | `src/domain/boq/calculateBoqTotals.ts` | Never folded into the shared engine |
| Column framework | Shared invoice column system | BOQ supplies a built-in set |
| Group model | Shared group contract | BOQ adopts, does not fork |
| JSON Import | Shared import pipeline | BOQ adds one adapter |
| Photo | Shared policy + shared upload | One Cloudinary preset |
| Numbering | Shared prefix engine | BOQ adds create wiring |
| Save | `useDocumentSave` | BOQ supplies a strategy |
| Audit | `src/lib/audit.ts` + generic RPCs | BOQ adds emitters |
| PDF composition | Shared pdfcn Forme renderer + BOQ-owned template | [03 §6](03-boq-presentation-contract.md) |

---

## §3. BOQ ↔ Quotation Compatibility Contract (old §7)

Quotation is the compatibility reference. BOQ must be structurally compatible wherever practical.

### §3.1 Compatibility Levels

| Level | Meaning |
| :--- | :--- |
| **Native** | Same field name, same type, same semantics. Copy is exact. |
| **Mapped** | Different name. Conversion renames deterministically. |
| **BOQ-only** | Exists only on BOQ. Conversion omits it by design. |
| **Quotation-only** | Exists only on Quotation. BOQ gains it. |
| **Recomputed** | Derived by the target document from copied inputs. |

### §3.2 Field Contract

| Concern | BOQ | Quotation | Level | Rule |
| :--- | :--- | :--- | :--- | :--- |
| Description | `description` | `description` | Native | Copy |
| Sub Description | `sub_description` | `sub_description` | Native | Copy |
| Make | `make` | `make` | Native | Copy. BOQ renames `make_brand` |
| Quantity | `quantity` | `quantity` | Native | Copy |
| Unit | `unit` | `unit` | Native | Copy |
| Commercial price | `sp` | `unit_price` | Mapped | `unit_price = sp` |
| Cost price | `cp` | — | BOQ-only | Omit by design (D6) |
| Amount | derived | `amount` | Recomputed | Target derives `quantity × unit_price` |
| VAT rate | `vat_rate` | `vat_rate` | Native | Copy |
| Discount rate | `discount_rate` | `discount_rate` | Native | Copy |
| Install rate | `install_rate` | `install_rate` | Native | Copy |
| Install override | `install_rate_override` | `install_rate_override` | Native | Copy |
| Install taxable | `install_rate_taxable` | `install_rate_taxable` | Native | Copy |
| Photo | `image_url` | `image_url` | Native | Copy |
| Row kind | `row_type` | `row_type` | Native | Copy after BOQ renames values |
| Group id | `group_id` | `group_id` | Native | Copy |
| Group name | `group_name` | `group_name` | Native | Copy |
| Custom data | `custom_data` | `custom_data` | Native | Copy |
| Custom columns | `columnConfig` | `columnConfig` | Mapped | Strip/rename BOQ-only keys ([02 §3.4](02-boq-document-lifecycle.md)) |
| Group metadata | `groupMeta` | `groupMeta` | Native | Copy verbatim |
| Calc inputs | `calculationInputs` | `calculationInputs` | Native | Copy verbatim |
| Extra charges | `extraCharges` | `extraCharges` | Native | Copy verbatim |
| Item image flag | `showItemImages` | `showItemImages` | Native | Copy verbatim |
| Title | `title` | `quotation_title` | Mapped | Rename |
| Notes | `notes` | `notes` | Native | Copy |
| Project | `project_id` | `project_id` | Native | Copy |
| Client | `client_name` | `client_name` | Mapped | See [02 §3.5](02-boq-document-lifecycle.md) |
| Vendor | `vendor_name` | — | BOQ-only | Omit |
| Lineage | `conversionTrail` | `conversionTrail` | Mapped | Write `source` on target |
| Document number | `boq_number` | `quotation_number` | Recomputed | Allocate fresh |

### §3.3 No Parallel Frameworks

BOQ MUST NOT receive its own column framework, its own import pipeline, its own group implementation, its own photo uploader, or its own numbering engine. Every capability in this table resolves to shared infrastructure or a shared extension.

---

## §4. Price Ownership: CP / SP / Unit Price (old §9)

### §4.1 Ownership Table

| Field | Owner | Meaning | Converted? |
| :--- | :--- | :--- | :--- |
| `cp` | BOQ only | Cost price the builder pays | No |
| `sp` | BOQ only | Selling price to the customer | Yes → `unit_price` |
| `unit_price` | Quotation and Invoice | The commercial price | Quotation → Invoice |

### §4.2 Rules

1. **`cp` is BOQ-only.** It MUST NOT be written to `quotation_items`. It MUST NOT appear as a Quotation column. It MUST NOT become a Quotation custom column.
2. **`sp` is BOQ's commercial price.** It occupies the role `unit_price` plays in Quotation.
3. **`sp` is the tax base.** If BOQ has VAT or discount, they apply to `sp`. They never apply to `cp`. Derivation: D7 states `sp → unit_price`, and Quotation taxes `unit_price`. If BOQ taxed CP instead, a converted Quotation would disagree with its source BOQ.
4. **`cp` is retained through lineage.** A user who needs the cost after conversion opens the source BOQ via `conversionTrail.source` or `source_boq_id`.
5. **No Quotation CP field may be invented** (D6).

### §4.3 Prohibited

- Copying `cp` into `quotation_items.custom_data` under a hidden key.
- Creating a `custom_cp` column during conversion.
- Deriving Quotation totals from `cp`.

---

## §5. Commercial Calculation Architecture (old §10)

### §5.1 The Conflict

Two calculators exist today *(evidence)*:

| Calculator | File | Produces |
| :--- | :--- | :--- |
| Shared commercial | `src/lib/Calculations.ts` | subtotal, install, VAT, discount, WHT, extra charges, grand total, payable, per-row line values, group install subtotals |
| BOQ costing | `src/domain/boq/calculateBoqTotals.ts` | total cost, total selling price, gross profit, per-row profit |

`AGENTS.md` states `computeDocument()` is the only production entry point for financial math, that financial logic must not be duplicated, and that `Calculations.ts` must not be bypassed.

`calculateBoqTotals.ts` states: "BOQ is a costing/pricing schedule — no VAT, discount, or WHT."

### §5.2 Normative Resolution — Two Layers Over One Row Set

BOQ MUST use both calculators, over the same rows, with a strict division of responsibility.

```text
BOQ rows
   │
   ├──► Layer 1  computeDocument({ items, columns, document, cf })
   │      input : quantity, unit_price = sp, vat_rate, discount_rate,
   │              install_rate, install_rate_override, install_rate_taxable,
   │              row_type, group_id, group_name
   │      outputs: subtotal, installRateTotal, discount, vat, wht,
   │               extraChargesTotal, grandTotal, totalPayable,
   │               taxableBase, per-row line values, group subtotals
   │      scope  : shared commercial math ONLY
   │
   └──► Layer 2  computeBoqTotals(rows) + computeRowProfit(row)
          input : quantity, cp, sp, row_type
          outputs: total_cost, total_selling_price, gross_profit,
                   row_profit, margin
          scope  : BOQ costing ONLY
```

### §5.3 Ownership Table

| Question | Owner | Answer |
| :--- | :--- | :--- |
| Tax base | Layer 1 | `sp` (§4.2 rule 3) |
| Discount base | Layer 1 | `sp` × quantity |
| Install | Layer 1 | Shared behavior, unchanged |
| Extra charges | Layer 1 | `custom_fields.extraCharges` |
| WHT | Layer 1 | Not enabled for BOQ initially (§5.6) |
| Group install subtotal | Layer 1 | `ComputedGroup.installTotal` |
| Group cost / profit | Layer 2 | BOQ extension, separate return object |
| Total cost | Layer 2 | Locked |
| Gross profit | Layer 2 | Locked |
| Margin | Layer 2 | `gross_profit / total_selling_price` |
| Row profit | Layer 2 | Locked |

### §5.4 What MUST NOT Change

1. `src/lib/Calculations.ts` MUST NOT receive a `cp` input.
2. `computeBoqTotals` formulas MUST NOT change.
3. Neither calculator may reimplement the other's math.
4. `calcTotals` and `resolveRowVat` in `src/domain/invoice/calculations.ts` remain deprecated and unused *(evidence: no production callers)*.

### §5.5 Layer 2 Return Contract

`DocumentResult` has no cost or profit field. Layer 2 MUST NOT be folded into it. A BOQ-owned value object carries the BOQ totals:

```ts
// Target contract — src/domain/boq/calculateBoqTotals.ts (extended, not replaced)
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

These sit beside `DocumentResult`. They do not replace it. No shared type changes.

### §5.6 Scope of Commercial Behavior on BOQ

| Capability | BOQ scope | Storage | Migration |
| :--- | :--- | :--- | :--- |
| VAT Rate | In scope (D4) | `vat_rate` column + `calculationInputs` | M2 + none |
| Discount Rate | In scope (D4) | `discount_rate` column + `calculationInputs` | M2 + none |
| Discount type/timing | In scope | `custom_fields.calculationInputs` | None |
| Install Rate | In scope (D4) | `install_rate` column | M2 |
| Install multiplier | In scope | `columnConfig.formula` | None |
| Install taxable | In scope (D4) | `install_rate_taxable` column | M2 |
| Row overrides | In scope | three nullable columns | M2 |
| Extra charges | In scope | `custom_fields.extraCharges` | None |
| WHT | **Out of scope, stage 1** | — | — |
| Workmanship / transportation / shipping legacy fields | **Out of scope for BOQ** | — | — |
| Amount in words | **Out of scope, stage 1** | — | — |

WHT and amount-in-words are excluded from stage 1. Nothing prevents adding them later. Excluding them keeps the BOQ totals bar consistent with V12, which shows cost, selling, profit, and margin.

### §5.7 Tax / Compliance Hub Boundary

**This section is normative. D5 requires it.**

BOQ commercial behavior exists for two purposes only:

- **A. BOQ calculation and presentation.** In scope.
- **B. Participation in Tax Hub or Compliance Hub workflows.** Out of scope.

Evidence that no incorrect coupling exists today *(evidence)*:

- A search of `src/` for `boq`/`boqs` combined with `tax`, `compliance`, `nrs`, `hub` returned **zero matches**.
- `src/modules/tax` and `src/modules/compliance` contain no BOQ document-type reference.
- `ItemSourceType` in `src/modules/item-library/types/itemLibrary.ts` is `'invoice' | 'quotation'` only.

**Prohibitions.** BOQ MUST NOT be added to:

1. Any Tax Hub source-document list.
2. Any Compliance Hub ingestion path.
3. `ItemSourceType`.
4. `src/modules/accounting` ingestion (`invoiceAccountingService`, `paymentAccountingService`, `sourceTransactionContract`).
5. Any tax-return or NRS reporting scope.

If a future task adds BOQ VAT, that task MUST NOT touch any of the above. Record it as a separate concern.

---

## §6. Column Settings Architecture (old §11)

### §6.1 Reference Contract

Quotation Column Settings is the reference. Its full capability list *(evidence, `src/components/ColumnManager.tsx` + `src/domain/invoice/columns.ts`)*:

| Capability | Detail |
| :--- | :--- |
| Fixed Description row | Index 0, label editable, position locked |
| Built-in columns | 9 keys, `removable: false` |
| Custom columns | `custom_*`, created by user or import, removable |
| Drag reorder | `GripHandle` + `moveColumn` |
| Up / down reorder | `ReorderButtons` |
| Editable labels | Any column |
| TEXT/NUM badge | From `TOTAL_AFFECTING_COLUMNS` |
| Show / hide | `show` ↔ `hide_display` |
| Remove / restore from totals | `hide_full` ↔ `show` |
| Install multiplier | `ColumnConfig.formula` |
| Reset to defaults | Behind confirm dialog |
| Row Overrides section | Per-row `vat_rate`, `discount_rate`, `install_rate_override` with Reset and Reset All |
| Persistence | `custom_fields.columnConfig` |

Three visibility modes *(evidence)*:

| Mode | Contexts | Calculation |
| :--- | :--- | :--- |
| `show` | form, PDF, view | active |
| `hide_display` | form only | **still active** |
| `hide_full` | none | forced to 0, excluded from totals |

### §6.2 Target for BOQ

BOQ MUST provide every capability in §6.1. BOQ MUST NOT keep `TableColumnControls`.

BOQ-specific additions: `cp` and `sp` as first-class built-ins (D6).

### §6.3 Normative Design — Document-Scoped Built-Ins

**Decision: one framework, per-document built-in sets, via optional parameters.**

| Change | Shape | Default | Regression risk |
| :--- | :--- | :--- | :--- |
| `useInvoiceColumns(initial?, builtins?)` | optional param | `BUILTIN_COLUMNS` | None |
| `resolveFinancialColumns(saved, builtins?)` | optional param | `BUILTIN_COLUMNS` | None |
| `getResetColumnConfigs(builtins?)` | optional param | `BUILTIN_COLUMNS` | None |
| `resolveColumnBehavior(columns, items, context, opts?)` | optional opts | unchanged | None |
| `ColumnManager` `hideFullDenyList?: string[]` | optional prop | `[]` | None |
| New `BOQ_BUILTIN_COLUMNS` | BOQ-owned export | n/a | None |

**Rejected alternative:** adding `cp` and `sp` to the shared `BUILTIN_COLUMNS`. Rejected because every Invoice and Quotation caller would inherit them, leaking BOQ costing into unrelated documents.

**No parallel framework.** BOQ MUST NOT create `useBoqColumns`, a BOQ `ColumnManager`, or a second `ColumnConfig` type.

### §6.4 BOQ Canonical Column Order

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

Notes:

1. `sp` replaces `unit_price` as BOQ's commercial price column. On conversion `sp → unit_price`.
2. `sub_description` is **absent**. (§8)
3. Defaults mirror Quotation: install, VAT, and discount start at `hide_display`.
4. `amount` is `quantity × sp`, matching Quotation's `amount` semantics on `unit_price`.

### §6.5 BOQ Hide-Full Deny List

`hide_full` on a locked costing field would invalidate BOQ totals. Quotation permits `hide_full` on `quantity` and `unit_price` *(evidence: `TOTAL_AFFECTING_COLUMNS` includes both)*. BOQ must diverge.

```ts
export const BOQ_HIDE_FULL_DENY_LIST = ['description', 'quantity', 'cp', 'sp']
```

| Field | `show` | `hide_display` | `hide_full` | Reason |
| :--- | :-: | :-: | :-: | :--- |
| `description` | ✔ | — | — | Always visible (shared `ALWAYS_VISIBLE_COLUMN_KEYS`) |
| `quantity` | ✔ | ✔ | ✘ | Layer 2 requires it |
| `cp` | ✔ | ✔ | ✘ | Layer 2 requires it |
| `sp` | ✔ | ✔ | ✘ | Layer 1 and Layer 2 require it |
| `make`, `unit`, `amount` | ✔ | ✔ | ✔ | Derived or cosmetic |
| `install_rate`, `vat_rate`, `discount_rate` | ✔ | ✔ | ✔ | `hide_full` correctly disables them |
| `custom_*` | ✔ | ✔ | ✔ | Removable outright |

`ColumnManager` MUST render the "Remove from totals" control disabled for deny-listed keys. The deny list defaults to empty, so Invoice and Quotation behavior is unchanged.

---

## §7. Mandatory / Built-In BOQ Field Semantics (old §12)

The seven-level distinction:

| # | Level | Description |
| :--- | :--- | :--- |
| 1 | Field exists in schema | A column or JSONB key persists it |
| 2 | Appears in the editor | Rendered as an editable control |
| 3 | Appears in view/PDF | Rendered in read-only output |
| 4 | Participates in calculations | Feeds Layer 1 or Layer 2 |
| 5 | May be `hide_display` | Hidden from PDF/view, still active |
| 6 | May be `hide_full` | Removed from all contexts and from math |
| 7 | May never be semantically disabled | Must always exist and always calculate |

### §7.1 Field Matrix

| Field | 1 schema | 2 editor | 3 view/PDF | 4 calc | 5 hide_display | 6 hide_full | 7 never disabled |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `description` | ✔ | ✔ | ✔ | L2 input | ✘ (always shown) | ✘ | ✔ |
| `sub_description` | ✔ | ✔ | ✔ | ✘ | n/a — not a column | n/a | ✔ (never removed) |
| `quantity` | ✔ | ✔ | ✔ | L1 + L2 | ✔ | ✘ | ✔ |
| `make` | ✔ | ✔ | ✔ | ✘ | ✔ | ✔ | ✘ |
| `unit` | ✔ | ✔ | ✔ | ✘ | ✔ | ✔ | ✘ |
| `cp` | ✔ | ✔ | ✔ | L2 | ✔ | ✘ | ✔ |
| `sp` | ✔ | ✔ | ✔ | L1 + L2 | ✔ | ✘ | ✔ |
| `amount` | derived | ✔ | ✔ | L1 | ✔ | ✔ | ✘ |
| `install_rate` | ✔ | ✔ | ✔ | L1 | ✔ | ✔ | ✘ |
| `vat_rate` | ✔ | ✔ | ✔ | L1 | ✔ | ✔ | ✘ |
| `discount_rate` | ✔ | ✔ | ✔ | L1 | ✔ | ✔ | ✘ |
| `notes` | ✔ | ✔ | ✔ | ✘ | n/a | n/a | ✘ |
| `image_url` | ✔ | ✔ | ✔ | ✘ | n/a | n/a | ✘ |

### §7.2 Quotation Blind-Application Warning

Quotation's `hide_full` semantics MUST NOT be applied blindly to `quantity`, `cp`, or `sp`. §6.5 defines the divergence. `hide_full` on those three would strip them from `shouldIncludeColumnInTotals` and break Layer 2.

### §7.3 Non-Disableable Set

`description`, `quantity`, `cp`, `sp`, `sub_description`.

---

## §8. Sub Description Contract (old §13)

### §8.1 Decision

Sub Description is a **per-item capability** (D13). It is **not** a Column Settings entry.

### §8.2 Quotation Reference (evidence)

| Question | Answer |
| :--- | :--- |
| In `BUILTIN_COLUMNS`? | **No** |
| Per-item field? | Yes — `InvoiceItem.sub_description` |
| Database column? | Yes — `quotation_items.sub_description` |
| Editable inline? | Yes — `MobileItemCard` disclosure toggle |
| In import prompt? | Yes — forced into `itemSchema` |
| In PDF/view? | Yes — via `InvoiceItem` |

### §8.3 BOQ Field Migration

BOQ's existing field is `specification`. V12 already labels it "Sub Description" *(evidence: `BOQ_LABELS.specification = 'Sub Description'`)*.

| Item | Target |
| :--- | :--- |
| Domain key | `sub_description` (renamed from `specification`) |
| `boq_rows` column | `sub_description` (M2) |
| Legacy read | `cells.specification` accepted as fallback during transition |
| Column Settings | **Not present.** Remove `specification` from the canonical order |
| Editor | Per-item disclosure control |
| View / PDF | Rendered from the item |
| Import | `sub_description` key, already generated by the shared prompt |
| Duplicate | Copied with rows |
| Conversion | Copied to `quotation_items.sub_description` |

### §8.4 V12 Interpretation

V12's item composition already renders Sub Description as a per-item disclosure row inside the item stack *(evidence: `subHTML(r)`, `editSub(id,val)`, collapsed "+ Add sub description")*. That presentation is correct and survives.

V12's **column** treatment does not survive. V12 places `specification` in `BOQ_CANONICAL_ORDER` and exposes a visibility toggle for it *(evidence)*. The transplant MUST remove it from the column settings surface.

This is recorded as a required V12 reinterpretation, not a change to the approved V12 file. This package does not modify V12. The full reinterpretation table is in [03 §2.4](03-boq-presentation-contract.md).

---

## §9. Groups Architecture (old §14)

### §9.1 Decision

BOQ adopts Quotation's row and group representation **directly**.

### §9.2 Options Considered

| Criterion | Direct adoption | Normalize at boundary |
| :--- | :--- | :--- |
| Conversion compatibility | Conversion is a copy | Adapters forever |
| Migration risk | One `row_type` backfill | None |
| RFQ isolation | Unaffected | Unaffected |
| Persistence clarity | One vocabulary end to end | Two vocabularies |
| Long-term maintenance | One group semantic | Duplicate semantics |
| JSON Import | Direct reuse of `buildApplyResult` | Custom group handling |

**Direct adoption wins on four of five criteria.** Migration risk is bounded to BOQ's own tables and is a one-time cost.

### §9.3 Normative Target

```ts
// Row vocabulary (target)
row_type: 'group_header' | 'standard'   // was: 'section' | 'item'
group_id: string | null
group_name: string
```

| Concern | Target |
| :--- | :--- |
| Header row | `row_type: 'group_header'`, `group_id`, `group_name`, `description = group_name`, `quantity = 0`, `sp = 0`, `cp = 0` |
| Standard row | `row_type: 'standard'`, `group_id` (nullable), `group_name` |
| Membership | `items[].group_id` is canonical |
| Ordering | Array order of `boq_rows.sort_order` |
| Metadata | `boqs.custom_fields.groupMeta: Record<id, { name, showSubtotal }>` |
| `showSubtotal` | Stored in `groupMeta` only, never on the row |
| Normalization | Port `normalizeQuotationGrouping` semantics — canonicalize ids, regenerate on collision, never silently ungroup |
| Creation / edit / delete | `addBoqGroup`, `updateGroupName`, `toggleGroupSubtotal`, `deleteGroup` |
| Item movement | `addItemToGroup`, `commitGrouping` |
| Persistence | Rows + `groupMeta`, written together |
| Group subtotals | Layer 1 `ComputedGroup` (install) **plus** Layer 2 `BoqGroupTotals` (cost, selling, profit) |
| PDF / view | Group header band, per-group subtotal row ([03 §5](03-boq-presentation-contract.md)) |
| Clear all | `commitGrouping([singleItem], [])` |

### §9.4 JSON Import Groups

Add mode: full group support. Update mode: groups ignored.

BOQ group import **reuses** the shared `buildApplyResult` unchanged. That function already:

- merges imported groups with existing groups;
- remaps ids only on real collision;
- treats `items[].group_id` as canonical and `itemIds` as corroboration;
- throws on an unknown group;
- throws when an item is absent from its group's `itemIds`;
- emits one header row per group;
- rebases `sort_order`.

BOQ supplies only `createItem: () => makeEmptyBoqItem()`. No BOQ-specific group logic.

### §9.5 Backfill

`boq_rows.row_type`: `'section'` → `'group_header'`, `'item'` → `'standard'`.
Header name moves from `section_title` to `group_name` + `description`.
`boqs.custom_fields.table_rows` receives the same rename during the legacy read path.

---

## §10. JSON Import Architecture (old §15)

### §10.1 Decision

BOQ becomes a first-class JSON Import document built on the existing shared pipeline. No isolated BOQ engine.

### §10.2 Shared Infrastructure (reused unchanged)

| File | Role | BOQ change |
| :--- | :--- | :--- |
| `src/domain/import/parse.ts` | Raw JSON → root | None |
| `src/domain/import/normalize.ts` | Candidate extraction | None |
| `src/domain/import/validate.ts` | Zod validation, skipped rows | None |
| `src/domain/import/resolve.ts` | Custom column creation, 10-column limit, `custom_<snake>` keys | None |
| `src/domain/import/overwrite.ts` | `detectOverwriteTargets` | None |
| `src/domain/import/apply.ts` | Add / Update, group emission | None |
| `src/domain/import/tableState.ts` | Table helpers | None |
| `src/components/import/JsonImportLayout.tsx` | Shared sheet | None |

### §10.3 Shared Infrastructure That Must Be Generalized

| File | Change | Why |
| :--- | :--- | :--- |
| `src/domain/import/promptGenerator.ts` | Widen `documentType` from `'invoice' \| 'quotation'` to include `'boq'` | Type blocks the call |
| `src/domain/import/promptGenerator.ts` | Emit group rules only when the module declares group support | Same generator, correct prompt |
| `src/domain/import/types.ts` | Add `'cp'` and `'sp'` to `ImportFieldKey` | CP/SP are first-class, not custom columns |

### §10.4 New BOQ Files

```text
src/domain/boq/importAdapter.ts     prompts · schema · applyResult
src/domain/boq/schema.ts            strict Zod schema (optional — may live in adapter)
src/components/boq/BoqImportSheet.tsx   wraps JsonImportLayout
```

### §10.5 Target Import Contract

| Element | Requirement |
| :--- | :--- |
| Fields | `description`, `sub_description`, `quantity`, `unit`, `make`, `cp`, `sp`, `vat_rate`, `discount_rate`, `install_rate` |
| Custom fields | `custom_fields` sub-object → import pipeline creates columns |
| Groups | Add mode yes; Update mode ignored |
| `temp_ref` | Add mode |
| `group_id` | Add mode |
| `row_number` | Update mode, range 1..N over standard rows |
| Overwrite | Confirmation via `detectOverwriteTargets` |
| Discipline block | Verbatim preamble |
| UI | `JsonImportLayout` only, prompt pre-computed and passed as a prop |
| Null semantics | Missing values are `null`. Never guessed |
| Column freeze | Schema frozen after import |

### §10.6 Stale Standard Clauses

`docs/standard/json-import-standard.md` conflicts with D1 and D2 in three clauses. They are listed in §18.1. This package does not edit the standard.

---

## §11. Item Photo / Cloudinary Architecture (old §16)

### §11.1 Responsibility Split

| Layer | Owner | Not the owner's job |
| :--- | :--- | :--- |
| V12 presentation | The approved design | Must not persist |
| Picker and upload policy | Shared code | — |
| Cloudinary | Shared code | — |
| Persistence | `boq_rows.image_url` | — |
| Domain | `image_url` on the BOQ row | — |

V12's local data-URL uploader is presentation-only. It MUST NOT be treated as production architecture (D14).

### §11.2 Shared Pieces (reused, evidence)

| Piece | Path |
| :--- | :--- |
| Accept attribute | `IMAGE_ACCEPT_ATTRIBUTE` |
| Validation | `isSupportedImageFile(file)` |
| Error text | `getUnsupportedImageErrorMessage(fileName)` |
| Cloud name | `ddhqvv77g` |
| Upload preset | `ml_default` (unsigned) |
| Endpoint | `https://api.cloudinary.com/v1_1/ddhqvv77g/image/upload` |
| Stored value | `data.secure_url` |
| Canonicalization | `resolveCanonicalItemImageUrl` in `src/domain/documentMedia.ts` |

All policy exports live in `src/lib/documentImageUploadPolicy.ts`.

### §11.3 Upload Lifecycle (normative)

1. `accept={IMAGE_ACCEPT_ATTRIBUTE}` on the hidden file input.
2. Validate with `isSupportedImageFile(file)` after selection. Reject with `getUnsupportedImageErrorMessage`.
3. `FormData` with `file` and `upload_preset`.
4. `POST` to the shared endpoint.
5. Store `data.secure_url` in `image_url`.
6. On failure show `feedback.error('Upload failed', ...)`. Do not clear the existing photo.
7. Clear the input `value` so re-selection works.
8. Save runs `resolveCanonicalItemImageUrl`. Temporary URLs (`blob:`, `file:`, `content:`, `capacitor://`, `filesystem:`) never persist.
9. Hydration runs `resolveCanonicalItemImageUrl` again.
10. Replace overwrites `image_url`. Remove sets it to `null`.

### §11.4 Shared Upload Function

Today the upload is embedded in `src/components/invoice/MobileItemCard.tsx` *(evidence: `CLOUD_NAME`, `UPLOAD_PRESET`, `handleImageUpload`)*.

BOQ's item card is V12-based, not `MobileItemCard`. Duplicating the fetch would create a second upload path.

**Normative target:** extract one shared function.

```text
src/lib/itemPhotoUpload.ts        NEW
  export const CLOUD_NAME = 'ddhqvv77g'
  export const UPLOAD_PRESET = 'ml_default'
  export async function uploadItemPhoto(file: File): Promise<string>
```

- `MobileItemCard` refactors to call it. Behavior-preserving.
- BOQ calls it.
- One account, one preset, one implementation.
- No second Cloudinary account, preset, or BOQ-only uploader is permitted.

### §11.5 Duplicate, Conversion, PDF

| Path | Target behavior |
| :--- | :--- |
| Duplicate | `image_url` copied with rows |
| BOQ → Quotation | `image_url` copied to `quotation_items.image_url` |
| PDF / view | Rendered from the prepared item ([03 §5](03-boq-presentation-contract.md)) |
| Remove | Clears the field. Existing Cloudinary asset is **not** deleted (matches current Invoice/Quotation behavior — no delete path exists in `src/`, evidence) |

### §11.6 Persistence Decision — Chosen Target

**Chosen: `boq_rows.image_url` (a real column).**

| Criterion | Real column | JSONB in `cells` |
| :--- | :--- | :--- |
| Parity with `quotation_items` | ✔ Exact | ✘ Different |
| Queryability ("which BOQs have photos") | ✔ Indexed | ✘ Requires JSON scan |
| Normalization | ✔ One field, one meaning | ✘ Buried in blob |
| Conversion | ✔ Straight copy | Needs unwrapping |
| Persistence ownership | ✔ Row store | Mixed |
| Migration complexity | One column | None |
| Existing row architecture | Consistent with typed columns | Reinforces split |

The column wins on five of six criteria. The only advantage of JSONB — avoiding a migration — is explicitly rejected as a decision driver. Migration M2 exists regardless (§15).

### §11.7 Security

The upload is unsigned and bypasses Supabase. Tenant isolation is by URL only. No per-tenant folder or signing exists *(evidence)*. BOQ MUST NOT extend beyond this established pattern.

---

## §12. Prefix Engine Architecture (old §17)

### §12.1 Conformance Status

Against `docs/standard/prefix-engine-settings-standard.md`:

| Requirement | Status | Evidence |
| :--- | :--- | :--- |
| `DEFAULT_PREFIXES.boq` present | ✔ | `src/domain/prefixConstants.ts` |
| `resolvePrefix(prefixes, 'boq')` | ✔ | `src/pages/view-boq-actions.ts` |
| `getNextBoqNumber(rows, prefix = 'BOQ', cursor)` | ✔ | `src/domain/boq/normalize.ts` |
| Uses shared `nextAutomaticNumber` | ✔ | same |
| `fetchAutoCursor` / `advanceAutoCursor` | ✔ | used in duplicate and convert |
| Cursor storage `settings.document_prefixes.__auto_seq` | ✔ | `src/domain/documentNumbering.ts` |
| DB CHECK includes `boq` | ✔ | `check_document_prefixes_format` |
| Settings UI entry | ✔ | `DocumentPrefixesSettingsSection.tsx` lines 46, 58, 82, 109, 157 |
| Create-path wiring | ✘ | Form demolished in Phase 1 |
| `withUniqueRetry` on create | ✘ | No create path |
| **DB uniqueness on `boqs.boq_number`** | ✘ | **No unique index exists** |
| Edit immutability guard | ✘ | No BOQ equivalent of `assertQuotationIdentityImmutable` |

### §12.2 The Uniqueness Gap

The standard §2 requires `withUniqueRetry` on every insert. That utility retries only on PostgreSQL `23505`, a unique-constraint violation. Standard §5.3 states that a manual number "MUST reserve exactly its own identifier through the existing database uniqueness constraint" and that "Duplicate identifiers are forbidden."

Evidence:

- `quotations_quotation_number_key` — unique index on `quotations` ✔
- `boqs` — only `idx_boqs_archived_active` and `idx_boqs_archived_at` ✘

**Migration M1 is required.** (§15)

### §12.3 Numbering Rules (normative)

| Rule | Requirement |
| :--- | :--- |
| Prefix | Always `resolvePrefix(settings?.document_prefixes, 'boq')` |
| Fallback default | `getNextBoqNumber(rows, prefix = 'BOQ', ...)` |
| Serial layout | `BOQ-000001`, 6-digit zero-padded |
| Create | Wrapped in `withUniqueRetry` |
| Automatic | Reads cursor, skip-checks occupied numbers, retries on `23505` |
| Manual | Attempted exactly as typed. No normalization, padding, or prefix repair |
| Manual isolation | A manual number MUST NOT advance the cursor |
| Occupied skipping | Automatic allocation skips occupied ids at or above the cursor |
| Cursor advance | Only after a successful **automatic** allocation |
| Edit | Number immutable after creation. No `withUniqueRetry` on update |
| Pre-fill | An untouched auto-filled value is a system candidate, not manual (§5.6) |
| Duplicate | Fresh automatic number. Never reuses the source number |
| Settings reset | Resetting the prefix clears its cursor families |

### §12.4 Identity Guard

BOQ MUST gain `src/domain/boq/assertIdentityImmutable.ts`, mirroring `src/domain/quotation/assertIdentityImmutable.ts`. It must reject mutation of:

- `boq_number`
- `client_id` / client identity (see [02 §3.5](02-boq-document-lifecycle.md))
- `custom_fields.conversionTrail` (lineage)

---

## §13. Persistence and Authoritative Row Store (old §18)

### §13.1 The Problem

BOQ writes rows to two places *(evidence)*: `boqs.custom_fields.table_rows` and `boq_rows`. `normalizeDbBoq` prefers the JSONB copy when it is non-empty. The two can disagree silently.

### §13.2 Decision

**`boq_rows` is the single authoritative, writable store for BOQ row state.**

### §13.3 Justification

| Criterion | `boq_rows` authoritative | `custom_fields.table_rows` authoritative |
| :--- | :--- | :--- |
| Conversion compatibility | Direct parity with `quotation_items` | Requires JSON array extraction |
| Queryability | Indexed, joinable | Opaque JSON |
| Normalization | One row = one item | Whole array rewritten per save |
| Write atomicity | Per-row updates | Whole-blob rewrite |
| Persistence ownership | Unambiguous | Keeps two copies |
| Existing infrastructure | Table, RLS, tenant grants, index exist | — |
| Migration | Add columns + backfill | Retain split |

`boq_rows` already exists with RLS policies, a tenant schema, and `idx_boq_rows_boq_sort` *(evidence)*. Only columns are missing.

### §13.4 Field Ownership Map

| State | Authoritative location | Legacy | Retirement |
| :--- | :--- | :--- | :--- |
| Rows | **`boq_rows`** | `boqs.custom_fields.table_rows` | Read fallback only; retire after backfill |
| Column configuration | `boqs.custom_fields.columnConfig` | `boqs.custom_fields.table_columns` | Replace; retire `table_columns` |
| Group metadata | `boqs.custom_fields.groupMeta` | `boq_rows.section_title` | Move; retire `section_title` after backfill |
| Calculation inputs | `boqs.custom_fields.calculationInputs` | none | New key, shared with Quotation |
| Media references | `boq_rows.image_url` | none | New column |
| Conversion lineage | `boqs.custom_fields.conversionTrail` | none | New key, shared with Quotation |
| Extra charges | `boqs.custom_fields.extraCharges` | none | New key, shared with Quotation |
| Item image flag | `boqs.custom_fields.showItemImages` | none | New key, shared with Quotation |
| Document header | `boqs` columns | — | Unchanged |

Note: after this change BOQ uses the **same** `custom_fields` keys as Quotation. That makes "commercial configuration snapshot" a shallow copy, matching what `convertQuotationToInvoice` already does *(evidence)*.

### §13.5 Write Rules

1. Saves MUST write `boq_rows` first, then `boqs` (or inside one transaction).
2. Saves MUST NOT write `custom_fields.table_rows`.
3. Reads MUST prefer `boq_rows`.
4. **Transitional legacy read:** if `boq_rows` is empty and `custom_fields.table_rows` is non-empty, hydrate in memory from the JSONB and opportunistically backfill `boq_rows`. Log the fallback.
5. After the backfill window, remove step 4 and stop writing the legacy key.

### §13.6 Backfill

Migration M3 (§15) copies `custom_fields.table_rows` into `boq_rows` where `boq_rows` is empty, applying the §9.5 row rename and the §8.3 field rename.

---

## §14. RFQ Isolation Strategy (old §27)

### §14.1 Current Sharing (verified)

`table-document` is shared by BOQ and RFQ.

Files importing `@/domain/table-document` or `@/components/table-document`:

| Group | Files |
| :--- | :--- |
| RFQ components | `RfqCustomizationPanel.tsx`, `RfqExportController.tsx`, `RfqExportView.tsx`, `RfqForm.tsx`, `RfqPdfDocument.tsx`, `RfqPreview.tsx` |
| Shared table-document | `TableColumnControls.tsx`, `TableDocumentExportController.tsx`, `TableDocumentExportSegment.tsx`, `TableDocumentPdfDocument.tsx`, `TableDocumentPreview.tsx`, `TableRowsEditor.tsx` |
| BOQ domain | `src/domain/boq/{types,normalize,factories,calculateBoqTotals}.ts` |
| RFQ domain | `src/domain/rfq/{types,normalize,factories,exportHelpers,importAdapter}.ts` |

RFQ is **not** being reconstructed.

### §14.2 Strategy

**Controlled BOQ migration away from `table-document`. RFQ keeps it unchanged.**

| Step | Action | RFQ impact |
| :--- | :--- | :--- |
| 1 | BOQ's row type becomes the shared `InvoiceItem` contract, not `TableDocumentRow` | None |
| 2 | BOQ's column set becomes `BOQ_BUILTIN_COLUMNS` (`ColumnConfig`), not `TableDocumentColumn` | None |
| 3 | BOQ stops importing `TableRowsEditor` and `TableColumnControls` | None |
| 4 | BOQ gains its own row helpers (`src/domain/boq/rows.ts`) | None |
| 5 | `table-document` files stay untouched | None |
| 6 | `templateRegistry.ts` keeps `RFQ_COLUMNS` for RFQ | None |
| 7 | `BOQ_COLUMNS` in `templateRegistry.ts` becomes legacy-read only during transition, then retires | None |
| 8 | `TableDocumentType = 'rfq' \| 'boq'` is narrowed only after BOQ no longer passes `'boq'` | None |

### §14.3 Prohibitions

1. Do not change `TableDocumentRow` fields while RFQ depends on them.
2. Do not change `TableDocumentColumn`.
3. Do not change `createEmptyTableRow` / `ensureTableRowKeys` signatures.
4. Do not delete `RFQ_COLUMNS`.
5. Do not force RFQ into the new BOQ architecture.
6. Do not remove `'boq'` from `TableDocumentType` until BOQ has no caller.

### §14.4 Proof of Isolation

Before Phase C of §20, the reconstruction MUST demonstrate:

```bash
grep -rn "table-document" src/domain/boq src/components/boq src/pages/Boq*.tsx src/pages/NewBoq.tsx src/pages/EditBoq.tsx src/pages/ViewBoq.tsx
# → zero BOQ-owned matches (legacy read path excepted)
grep -rn "table-document" src/components/rfq src/domain/rfq
# → unchanged from baseline
```

---

## §15. Schema / Migration Requirements (old §28)

Four migrations. **None created by this package.** Each is a separately authorized implementation task with a mandatory `supabase db push`.

### M1 — Unique constraint on `boqs.boq_number`

| | |
| :--- | :--- |
| **Why** | `prefix-engine-settings-standard.md` §2 and §5.3 require a unique constraint. `withUniqueRetry` needs `23505` to detect collisions. Without it, duplicate numbers are possible. |
| **Evidence** | `boqs` has only `idx_boqs_archived_active` and `idx_boqs_archived_at`. No unique index on `boq_number`. |
| **Scope** | Public template `boqs` **and** every tenant schema, matching the pattern in `20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql` |
| **Pre-step** | Detect and resolve existing duplicates and `NULL` values before adding the constraint. Report affected rows. |
| **Index** | `CREATE UNIQUE INDEX ... ON boqs (boq_number) WHERE boq_number IS NOT NULL` |
| **Risk** | Blocks if duplicates exist. Pre-step is mandatory. |

### M2 — `boq_rows` parity columns

| | |
| :--- | :--- |
| **Why** | `boq_rows` has 13 columns; `quotation_items` has 25. Parity, groups, and photos need typed columns. |
| **Add** | `sub_description text`, `make text`, `sp numeric`, `cp numeric`, `image_url text`, `group_id text`, `group_name text`, `vat_rate numeric`, `discount_rate numeric`, `install_rate numeric`, `install_rate_override boolean`, `install_rate_taxable boolean`, `amount numeric`, `custom_data jsonb NOT NULL DEFAULT '{}'` |
| **Row type** | `row_type` stays `text`. Values backfilled by M3. |
| **Scope** | Public template + all tenant schemas |
| **Risk** | Column additions are idempotent with `IF NOT EXISTS`. Low risk. |

**Backfill within M2:** `sp` and `cp` read from `cells->>'sp'` and `cells->>'cp'`; `sub_description` from `cells->>'specification'`; `make` from `cells->>'make_brand'`.

### M3 — Row store consolidation and row-type backfill

| | |
| :--- | :--- |
| **Why** | Two writable row stores. `'section'`/`'item'` must become `'group_header'`/`'standard'`. |
| **Steps** | 1. For each `boq` with empty `boq_rows` and non-empty `custom_fields.table_rows`, insert rows from JSONB.<br>2. Update `boq_rows.row_type`: `'section'` → `'group_header'`, `'item'` → `'standard'`.<br>3. Move `section_title` → `group_name` and → `description` on header rows.<br>4. Populate `boqs.custom_fields.groupMeta` from header rows.<br>5. Seed `custom_fields.columnConfig` from `custom_fields.table_columns` using the §6.4 order. |
| **Idempotent** | Yes — guard each step with a `WHERE` condition |
| **Risk** | Data migration. Run in a transaction. Verify row counts per `boq_id` before and after. |

### M4 — Legacy cleanup

| | |
| :--- | :--- |
| **Why** | Retire split state after M3 is verified in production. |
| **Steps** | 1. Stop writing `custom_fields.table_rows` (code change, not SQL).<br>2. Remove `custom_fields.table_columns` keys.<br>3. Drop `boq_rows.section_title` after one release cycle.<br>4. Keep `cells jsonb` for one release cycle as a read safety net, then drop. |
| **Risk** | Destructive. Requires a separate, explicit authorization. |

### §15.1 Migrations NOT Required

| Assumption | Verdict | Evidence |
| :--- | :--- | :--- |
| BOQ audit entity whitelist | **Not required** | `activity_events_entity_type_check` already includes `'boq'`; `audit_logs.entity_type` unconstrained |
| Prefix settings entry | **Not required** | `boq` already in `check_document_prefixes_format` and the settings UI |
| `boq_rows` RLS | **Not required** | Policies exist in `20260520090002_quotations.sql` |
| Tenant grants for `boq_rows` | **Not required** | Granted in `20260826000000` and later provisioning migrations |
| `source_boq_id` on quotations | **Not required** | Exists — `20260914130000` + `20260916000000` |
| New activity event type | **Not required** | `CREATED`, `UPDATED`, `LINKED`, `ARCHIVED` all exist |
| New audit RPC | **Not required** | Generic `record_audit_log` and `record_activity_event` accept `'boq'` |

---

## §16. Shared Infrastructure Reuse and Generalization Map (old §29)

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
| BOQ built-ins | BOQ-specific domain | `src/domain/boq/columns.ts` |
| Group model | Direct reuse | Quotation group contract |
| Group operations | BOQ adapter | `useBoqLineItems`, ported from `useQuotationLineItems` |
| Group metadata | Direct reuse | `custom_fields.groupMeta` |
| Group normalization | Direct reuse | `normalizeQuotationGrouping` semantics |
| Import pipeline | Direct reuse | `src/domain/import/**` |
| Import prompt | **Shared extension** | Widen `documentType`, add `cp`/`sp`, group-support flag |
| Import adapter | BOQ adapter | `src/domain/boq/importAdapter.ts` |
| Import UI | Direct reuse | `JsonImportLayout` |
| Image picker policy | Direct reuse | `documentImageUploadPolicy.ts` |
| Cloudinary upload | **Shared extension** | `src/lib/itemPhotoUpload.ts`, one preset |
| Image canonicalization | Direct reuse | `resolveCanonicalItemImageUrl` |
| Photo persistence | BOQ-specific | `boq_rows.image_url` |
| Commercial math | Direct reuse | `computeDocument` |
| BOQ costing math | Preserve unchanged | `computeBoqTotals`, `computeRowProfit` |
| Save orchestration | Direct reuse | `useDocumentSave` |
| Form orchestration | BOQ adapter | `BoqFormPage` |
| Form UI | BOQ-specific (per Rule 3) | `BoqFormScreen` |
| Identity immutability | BOQ adapter | `src/domain/boq/assertIdentityImmutable.ts` |
| Conversion helpers | Direct reuse | `buildTrailLink`, `withSourceTrail`, `appendDerivedTrail` |
| Audit | Direct reuse + BOQ emitters | `recordAuditLog`, `record_activity_event` |
| FAB create | Direct reuse | `MobileFab` |
| FAB save | Direct reuse | `FormFooter` |
| FAB download | Direct reuse | `FloatingDownloadButton` |
| PDF customization | Preserve unchanged | `src/domain/pdf/customization/boq.ts` |
| PDF renderer | Direct reuse of shared renderer | pdfcn Forme via `@formepdf/core` ([03 §6](03-boq-presentation-contract.md)) |
| List page | Preserve unchanged | `BoqList`, `Boqs`, `DocumentQueryContext` |
| Export | **Fix required** | `exportFetchers.ts`, `exportCompilers.ts` ([02 §7](02-boq-document-lifecycle.md)) |
| `table-document` | Preserve for RFQ | `src/domain/table-document/**`, `src/components/table-document/**` |

### §16.1 Shared Files Requiring Behavior-Preserving Edits

These are shared. Every edit MUST be a default-preserving parameter or an internal extraction.

| File | Edit | Guard |
| :--- | :--- | :--- |
| `src/components/useInvoiceColumns.tsx` | Optional `builtins` param | Default `BUILTIN_COLUMNS` |
| `src/domain/financial/resolveFinancialColumns.ts` | Optional `builtins` param | Default `BUILTIN_COLUMNS` |
| `src/domain/invoice/columns.ts` | Optional `builtins` param on `getResetColumnConfigs` | Default `BUILTIN_COLUMNS` |
| `src/components/ColumnManager.tsx` | Optional `hideFullDenyList` prop | Default `[]` |
| `src/domain/import/types.ts` | Add `'cp'`, `'sp'` to `ImportFieldKey` | Additive |
| `src/domain/import/promptGenerator.ts` | Widen `documentType`, add group-support flag | Default preserves current prompts |
| `src/components/invoice/MobileItemCard.tsx` | Call extracted `uploadItemPhoto` | Behavior-preserving |
| `src/domain/documentConversion.ts` | Widen `DocumentTrailLink.type` to include `'boq'` | Additive |

**Regression guard:** after each shared edit, `src/tests/invoice/columnVisibilityMode.test.js`, `src/tests/critical/jsonGroupImport.test.js`, and `src/tests/critical/calculations.test.js` MUST pass.

---

## §17. Standards Applicability Matrix (old §30)

All 15 files under `docs/standard/` were read for the original PRD. Classification: **C** conforming as-is · **M** applicable, implementation missing · **S** stale, needs a documentation update · **X** conflicts with the authoritative BOQ direction · **N** not applicable.

| # | Standard | Class | BOQ area | Concrete requirement | Reference implementation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `prefix-engine-settings-standard.md` | **M** | Numbering | Resolve via `resolvePrefix`; wrap create in `withUniqueRetry`; honour §5 manual/automatic rules; add M1 | Invoice, Quotation, RFQ |
| 2 | `fab-standard.md` (v1.1) | **M** | List, form, view | Shared `MobileFab`, `SaveAll` via `FormFooter`, `FloatingDownloadButton`; ambient float; one primary FAB | Existing shared FAB files |
| 3 | `json-import-standard.md` | **S** (§1, §6, §9) + **M** | Import | Adapter, Zod, `JsonImportLayout`, deterministic column creation, group rules | `src/domain/quotation/importAdapter.ts` |
| 4 | `document-column-standard.md` | **S** (§2, §4.3) + **M** | Columns | Use `useInvoiceColumns`, `resolveFinancialColumns`, `columnConfig` | Invoice, Quotation |
| 5 | `document-form-consolidation-standard.md` | **M** | Form | `BoqFormPage` + thin delegators; dedicated form UI permitted by Rule 3 | `InvoiceFormPage` (reference) |
| 6 | `document-save-orchestration.md` | **M** | Save | `useDocumentSave` strategy; `buildPayload` must not compute totals | Invoice, Quotation |
| 7 | `document-transformation-standard.md` | **M** | Edit, duplicate, convert | Identity immutability; Duplicate Law §3 (new origin, no lineage, no client) | `assertQuotationIdentityImmutable` |
| 8 | `lifecycle-ownership-standard.md` | **M** | All layers | Business rules in domain; UI owns presentation; pages coordinate | Quotation |
| 9 | `document-image-upload-policy.md` | **M** | Photo | Import from `documentImageUploadPolicy.ts`; validate after selection | `MobileItemCard` |
| 10 | `pdf-migration-standard.md` | **M** + **S** (see note) | PDF | Mandatory pipeline; renderers do not calculate | Invoice PDF templates |
| 11 | `pdf-customization-extension-standard.md` | **C** | PDF | `BOQ_CAPABILITIES`/`BOQ_POLICY`/`BOQ_TEMPLATE_DEFAULTS` already declared | `src/domain/pdf/customization/boq.ts` |
| 12 | `audit-trail-standard.md` | **S** (§6 matrix) + **M** | Audit | Add BOQ rows to the coverage matrix; emit `recordBoq*` | Invoice, Quotation |
| 13 | `receipt-standard.md` | **N** | — | Receipts are a separate family, outside the 3-Laws system | — |
| 14 | `docs-commit-workflow-standard.md` | **N** | — | Workflow only, not BOQ code | — |
| 15 | `Commercial Party Architecture Standard.md` | **N** | — | Contains only "coming soon". Per `AGENTS.md` §6, not authoritative | — |

**Note on standard 10.** `pdf-migration-standard.md` currently names the React-PDF pipeline (`DefaultPdfGenerator` + `CompositePdfDelivery` + `DefaultFeedbackBus`) as mandatory. The authoritative renderer decision for BOQ is pdfcn Forme ([03 §6](03-boq-presentation-contract.md)). The standard needs a renderer-neutral rewrite driven by `docs/prd/pdf-rendering-migration/`. That delta is recorded in §18.5. It is not edited by this package.

### §17.1 Conformance Summary

| Class | Count |
| :--- | :--- |
| C — conforming as-is | 1 |
| M — applicable, implementation missing | 9 |
| S — stale, needs documentation update | 3 (4 counting the pdf-migration note) |
| X — genuinely conflicts | 1 (embedded in §3: the group clauses) |
| N — not applicable | 3 |

Note: standard 3 (`json-import-standard.md`) is both **S** and **X**. Its group clauses actively contradict D1 and D2.

---

## §18. Standards Delta / Required Future Standards Updates (old §31)

**No standard is edited by this package.** The following updates are required in separate, explicitly authorized tasks.

### §18.1 `docs/standard/json-import-standard.md`

| Clause | Current text | Required change | Driven by |
| :--- | :--- | :--- | :--- |
| §1 | "If the module supports groups (Invoice/Quotation only)..." | Replace the module list with a capability flag; add BOQ | D1, D2 |
| §1 | "If the module does NOT support groups, a rule must state: 'Do not create groups.'" | Keep, but select by capability | D2 |
| §6 | "Groups are an Invoice and Quotation concern ONLY." | Add BOQ as group-capable | D1 |
| §6 | "No other module (Waybill, CSR, RFQ, Compliance Hub, Project Documents)..." | BOQ is absent from this exclusion list. State the rule by capability | D1 |
| §9 checklist | "Prompt does NOT include group rules (unless Invoice/Quotation)." | Add BOQ | D2 |

### §18.2 `docs/standard/document-column-standard.md`

| Clause | Current text | Required change | Driven by |
| :--- | :--- | :--- | :--- |
| §2 | Covered modules: Invoice, Quotation only | Add BOQ | D3 |
| §4.1 | `DEFAULT_COLUMN_ORDER` shown as the only canonical order | Note per-document built-in sets | BOQ `cp`/`sp` |
| §4.3 | "Nine built-in columns exist" | Note that BOQ's set differs (`sp` instead of `unit_price`, plus `cp`) | D3, D6 |
| §5.4 | `hide_full` semantics | Add the BOQ deny-list rule for `description`, `quantity`, `cp`, `sp` | Locked BOQ math |
| §11 | Adoption rules | Add the optional `builtins` parameter | Design in §6.3 |

### §18.3 `docs/standard/audit-trail-standard.md`

| Clause | Required change | Driven by |
| :--- | :--- | :--- |
| §6 coverage matrix | Add BOQ rows: CREATE, UPDATE, STATUS_CHANGE, LINK (convert), DUPLICATE, ARCHIVE | D3 |
| §6 coverage matrix | Note that `activity_events.entity_type` already permits `'boq'` | Evidence |

### §18.4 `docs/standard/document-transformation-standard.md`

| Clause | Required change | Driven by |
| :--- | :--- | :--- |
| §2.1 identity definition | Confirm BOQ identity = `boq_number` + client identity + lineage | Lineage model |
| §3 Duplicate Law | Explicitly list BOQ as covered; state that `cp`/`sp` **are** preserved while lineage and client are shed | [02 §5](02-boq-document-lifecycle.md) |
| §1 `type` union | If the document trail union is widened, list `'boq'` | [02 §4.4](02-boq-document-lifecycle.md) |

`docs/standard/fab-standard.md` needs no BOQ update. v1.1 already covers document modules generically.

### §18.5 `docs/standard/pdf-migration-standard.md` (added by this package)

| Clause | Current state | Required change | Driven by |
| :--- | :--- | :--- | :--- |
| Mandatory pipeline | Names `DefaultPdfGenerator` + `CompositePdfDelivery` + `DefaultFeedbackBus` with React-PDF ownership | Rewrite renderer-neutrally so the standard survives the pdfcn migration | Decision D16 (BOQ PDF renderer = pdfcn Forme); `docs/prd/pdf-rendering-migration/draft.md`; `docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md` |
| `PdfDocumentType` union | MUST include `'boq'` (already satisfied when BOQ PDF ships) | Keep during migration | Same |

The reconciliation report (`docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md`) already classifies which standards must remain authoritative and which need a renderer-neutral rewrite. The BOQ package consumes that work; it does not restate it.

### §18.6 Type-level update (code, not a standard)

`DocumentTrailLink.type` in `src/domain/invoice/types.ts` is `'invoice' | 'quotation'`. It MUST gain `'boq'` so a BOQ source is typed correctly ([02 §4.4](02-boq-document-lifecycle.md)). This is a code change recorded in §19.

---

## §19. Future Implementation File Map (old §32)

All paths verified except those marked "to create".

### §19.1 To Create

| Path | Purpose |
| :--- | :--- |
| `src/pages/BoqFormPage.tsx` | Consolidated orchestration, `mode` prop |
| `src/components/boq/BoqFormScreen.tsx` | Dedicated form UI — **V12 transplant target** |
| `src/components/boq/BoqViewScreen.tsx` | View UI — View Page target (candidate UNRESOLVED, [03 §9](03-boq-presentation-contract.md)) |
| `src/components/boq/useBoqLineItems.ts` | Row + group operations |
| `src/components/boq/boqFormUtils.ts` | `buildCustomFields`, group meta helpers |
| `src/components/boq/boqFormTypes.ts` | Editor state types |
| `src/components/boq/BoqImportSheet.tsx` | Wraps `JsonImportLayout` |
| `src/domain/boq/columns.ts` | `BOQ_BUILTIN_COLUMNS`, `BOQ_HIDE_FULL_DENY_LIST` |
| `src/domain/boq/rows.ts` | Row helpers replacing `table-document/rows` for BOQ |
| `src/domain/boq/importAdapter.ts` | `prompts`, `schema`, `applyResult` |
| `src/domain/boq/schema.ts` | Strict Zod import schema |
| `src/domain/boq/assertIdentityImmutable.ts` | Identity guard |
| `src/hooks/useBoqSave.ts` | `DocumentSaveStrategy` |
| `src/lib/itemPhotoUpload.ts` | Shared Cloudinary upload |
| `supabase/migrations/*_boq_number_unique.sql` | **M1** |
| `supabase/migrations/*_boq_row_parity.sql` | **M2** |
| `supabase/migrations/*_boq_row_consolidation.sql` | **M3** |
| `supabase/migrations/*_boq_legacy_cleanup.sql` | **M4** (separate authorization) |

### §19.2 To Modify

| Path | Change |
| :--- | :--- |
| `src/pages/NewBoq.tsx` | Placeholder → thin delegator |
| `src/pages/EditBoq.tsx` | Placeholder → thin delegator |
| `src/pages/ViewBoq.tsx` | Placeholder → real view |
| `src/domain/boq/types.ts` | Row type → `InvoiceItem` parity; add parity fields |
| `src/domain/boq/normalize.ts` | Parity columns, `groupMeta`, `columnConfig`, legacy read |
| `src/domain/boq/factories.ts` | `createEmptyBoq`, `makeEmptyBoqItem`, group factory |
| `src/domain/boq/calculateBoqTotals.ts` | Add `margin_percent`, `BoqGroupTotals`. Formulas unchanged |
| `src/pages/view-boq-actions.ts` | Rewrite conversion ([02 §3](02-boq-document-lifecycle.md)); rewrite duplicate ([02 §5](02-boq-document-lifecycle.md)); emit audit |
| `src/domain/invoice/types.ts` | Widen `DocumentTrailLink.type` with `'boq'` |
| `src/components/useInvoiceColumns.tsx` | Optional `builtins` param |
| `src/domain/financial/resolveFinancialColumns.ts` | Optional `builtins` param |
| `src/domain/invoice/columns.ts` | Optional `builtins` on `getResetColumnConfigs` |
| `src/components/ColumnManager.tsx` | Optional `hideFullDenyList` prop |
| `src/domain/import/types.ts` | Add `'cp'`, `'sp'` |
| `src/domain/import/promptGenerator.ts` | Widen `documentType`; group-support flag |
| `src/components/invoice/MobileItemCard.tsx` | Call `uploadItemPhoto` |
| `src/lib/audit.ts` | `'boq'` in `AuditEntityType`; `BOQ_TRACKED_FIELDS`; `recordBoq*` |
| `src/services/exportFetchers.ts` | `BOQS → 'boq_rows'` ([02 §7](02-boq-document-lifecycle.md)) |
| `src/utils/exportCompilers.ts` | `boq_items` → `boq_rows` |
| `src/components/boq/BoqList.tsx` | Verify links/export after rebuild |
| `src/domain/table-document/templateRegistry.ts` | Retire `BOQ_COLUMNS` after migration (RFQ untouched) |

### §19.3 Shared Files That Must Remain Untouched

| Path | Reason |
| :--- | :--- |
| `src/lib/Calculations.ts` | Financial source of truth. No `cp` input. |
| `src/domain/invoice/calculations.ts` | Deprecated. Do not touch. |
| `src/components/import/JsonImportLayout.tsx` | Shared wrapper. |
| `src/lib/documentImageUploadPolicy.ts` | Shared policy. |
| `src/domain/documentMedia.ts` | Shared media helpers. |
| `src/components/layout/MobileFab.tsx` | Shared FAB. |
| `src/components/document-view/shared/FloatingDownloadButton.tsx` | Shared FAB. |
| `src/domain/pdf/customization/boq.ts` | Already correct. |
| `src/domain/prefixConstants.ts` | BOQ prefix present. |
| `src/domain/documentNumbering.ts` | Cursor protocol. |
| `src/domain/documentConversion.ts` | Shared trail helpers (except the additive type union). |
| `src/hooks/useDocumentSave.ts` | Shared save orchestration. |
| `src/components/table-document/**` | RFQ depends on it. |
| `src/components/rfq/**`, `src/domain/rfq/**` | RFQ is out of scope. |
| `src/components/quotation/**`, `src/pages/QuotationFormPage.tsx` | Quotation must not change. |
| `src/pages/InvoiceFormPage.tsx`, `src/pages/NewInvoice.tsx`, `src/pages/EditInvoice.tsx` | Invoice must not change. |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v12.html` | Approved design. Read only. |

### §19.4 Decisions Required Before Coding

| Path | Decision | Reference |
| :--- | :--- | :--- |
| `src/domain/boq/types.ts` | Whether `cells jsonb` is dropped in M4 or retained | §15 M4 / [README §9](README.md) Q4 |
| `src/pages/view-boq-actions.ts` | Whether WHT is truly deferred | §5.6 / [README §9](README.md) Q1 |
| `src/components/boq/BoqFormScreen.tsx` | How much of V12's own column resolver survives | [03 §2.4](03-boq-presentation-contract.md) |
| `src/domain/boq/columns.ts` | Whether `amount` ships in stage 1 | §6.4 / [README §9](README.md) Q2 |

---

## §20. Ordered Backend / Domain Preparation Sequence (old §33)

Each phase ends in a verifiable state. **Phases A–G complete before Phase H begins.** The package-level waterfall view of this sequence is [README §10](README.md) and `waterfall-roadmap.html`.

### Phase A — Decisions and schema
1. Confirm the open items in [README §9](README.md).
2. Write **M1** (`boqs.boq_number` unique), with duplicate pre-check.
3. Push M1. The push must succeed.
4. Write **M2** (parity columns) with in-migration backfill from `cells`.
5. Push M2.
6. Write **M3** (row consolidation, row-type backfill, `groupMeta`, `columnConfig` seeding).
7. Push M3.
8. Run the standards updates in §18 as separate tasks.

### Phase B — Shared infrastructure extensions
9. Add the optional `builtins` parameter to `useInvoiceColumns`, `resolveFinancialColumns`, `getResetColumnConfigs`.
10. Add `hideFullDenyList` to `ColumnManager`.
11. Add `'cp'`/`'sp'` to `ImportFieldKey`.
12. Widen `generateImportPrompt`'s `documentType`; add the group-support flag.
13. Extract `src/lib/itemPhotoUpload.ts`; refactor `MobileItemCard` to call it.
14. Widen `DocumentTrailLink.type` with `'boq'`.
15. Run the regression guard: `columnVisibilityMode.test.js`, `jsonGroupImport.test.js`, `calculations.test.js`.

### Phase C — BOQ domain
16. Create `src/domain/boq/columns.ts` (`BOQ_BUILTIN_COLUMNS`, `BOQ_HIDE_FULL_DENY_LIST`).
17. Create `src/domain/boq/rows.ts`.
18. Rewire `src/domain/boq/types.ts` to the parity row contract.
19. Update `normalize.ts`: `columnConfig`, `groupMeta`, parity fields, legacy read.
20. Update `factories.ts`.
21. Extend `calculateBoqTotals.ts` with `margin_percent` and `BoqGroupTotals` (formulas unchanged).
22. Create `assertIdentityImmutable.ts`.
23. Prove RFQ isolation (§14.4).

### Phase D — Save and orchestration
24. Create `useBoqSave.ts` with `withUniqueRetry` + `getNextBoqNumber`.
25. Create `BoqFormPage.tsx`.
26. Convert `NewBoq.tsx` and `EditBoq.tsx` to thin delegators.
27. Create `useBoqLineItems.ts`, `boqFormUtils.ts`, `boqFormTypes.ts`.
28. Wire the Save FAB via `FormFooter`.

### Phase E — Columns and groups on the form
29. Wire `ColumnManager` with `BOQ_BUILTIN_COLUMNS` and `BOQ_HIDE_FULL_DENY_LIST`.
30. Wire group operations and `groupMeta` persistence.
31. Wire Layer 1 + Layer 2 totals in the form state.

### Phase F — JSON Import
32. Create `src/domain/boq/importAdapter.ts` and the Zod schema.
33. Create `BoqImportSheet.tsx`.
34. Verify Add-mode groups and Update-mode group rejection.

### Phase G — Photos, conversion, duplicate, audit, export
35. Wire `uploadItemPhoto` into the BOQ item card.
36. Rewrite `convertBOQToQuotation` per [02 §3](02-boq-document-lifecycle.md) (explicit row construction).
37. Rewrite `duplicateBOQRecord` per [02 §5](02-boq-document-lifecycle.md) (copy `boq_rows`).
38. Add `recordBoq*` emitters and `BOQ_TRACKED_FIELDS`.
39. Fix `exportFetchers.ts` and `exportCompilers.ts`.
40. Static check: no `boq_items` string remains under `src/`.

### Phase H — Presentation transplant (LAST)

Phase H is specified in [03 §3](03-boq-presentation-contract.md). It starts only after every gate in [03 §2](03-boq-presentation-contract.md) is green **and** the View Page candidate is explicitly accepted ([03 §9](03-boq-presentation-contract.md)).

45. M4 only after production verification.

---

## §21. Domain and Backend Risks (old §35, domain share)

Full risk register is split by domain: this section, [02 §8](02-boq-document-lifecycle.md), and [03 §10](03-boq-presentation-contract.md).

| ID | Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R1 | No unique constraint on `boqs.boq_number` | Duplicate numbers; Prefix standard violated | High without M1 | M1 before any create path |
| R2 | M3 backfill corrupts existing rows | Data loss | Medium | Transaction; row-count verification per `boq_id` |
| R3 | Split-brain row stores diverge during transition | Inconsistent saves | Medium | Single writer rule (§13.5); legacy read only |
| R4 | Shared column extension regresses Invoice/Quotation | Cross-document breakage | Medium | Optional parameters with unchanged defaults; regression tests |
| R5 | Two calculators produce contradictory totals | Wrong displayed totals | Medium | Fixed division of labor (§5.3); tax base = `sp` |
| R6 | `hide_full` on a locked field breaks Layer 2 | Wrong cost/profit | Medium | `BOQ_HIDE_FULL_DENY_LIST` |
| R10 | RFQ regression | RFQ breaks | Medium | Isolation proof (§14.4); no `table-document` edits |
| R11 | Stale standards mislead a future agent | Wrong implementation | High | §18 list; package states where it overrides |
| R14 | BOQ leaks into Tax/Compliance Hub | Scope creep, compliance risk | Low | §5.7 prohibitions |
| R19 | Unsigned Cloudinary preset | No per-tenant isolation | Accepted | Matches existing behavior; do not extend |
| R20 | Cloudinary orphan assets on remove | Storage growth | Accepted | No delete path exists today; out of scope |
| R21 | RFQ shares `TableDocumentType = 'rfq' \| 'boq'` | Premature narrowing breaks RFQ | Low | Narrow only after BOQ has no caller |
| R22 | Two stores persist during backfill window | Ambiguity | Medium | Single writer; scheduled M4 |

---

## §22. Domain Acceptance Criteria (old §38, domain share)

A future implementation agent can accept the domain architecture when it can answer **yes** to every item.

### Architecture and identity
- [ ] BOQ's identity as a costing/pricing document is explicit (§1).
- [ ] All nine identity invariants are stated and testable.
- [ ] Locked formulas are listed and marked as unchangeable.

### Compatibility
- [ ] Quotation compatibility is defined field by field (§3.2).
- [ ] Every field has a level: Native, Mapped, BOQ-only, Quotation-only, or Recomputed.
- [ ] No parallel BOQ framework exists for columns, import, groups, photos, or numbering.

### Price and calculation
- [ ] CP and SP ownership is explicit (§4).
- [ ] CP never reaches a Quotation, in any form.
- [ ] SP is defined as the tax base, with a derivation, not an invention (§4.2).
- [ ] Commercial calculation ownership is explicit: Layer 1 and Layer 2 (§5).
- [ ] No new financial formula is introduced.
- [ ] `src/lib/Calculations.ts` receives no `cp` input.
- [ ] Tax/discount/install behavior is separated from Tax/Compliance Hub participation (§5.7).
- [ ] Evidence shows no existing incorrect coupling.

### Columns and fields
- [ ] Column Settings parity lists every §6.1 capability.
- [ ] The document-scoped built-in design avoids a parallel framework (§6.3).
- [ ] The alternative (adding `cp`/`sp` to shared `BUILTIN_COLUMNS`) is explicitly rejected with a reason.
- [ ] All seven semantic levels are mapped for every BOQ field (§7.1).
- [ ] `hide_full` denial for `quantity`, `cp`, `sp` is specified with a reason (§6.5).

### Sub Description, groups, import
- [ ] Sub Description is modeled per item, not as a column (§8).
- [ ] The `specification` → `sub_description` migration is specified.
- [ ] The required V12 reinterpretation is recorded ([03 §2.4](03-boq-presentation-contract.md)).
- [ ] Groups are first-class in the row model, persistence, PDF, and duplicate (§9).
- [ ] JSON Import groups are first-class in Add mode and ignored in Update mode (§10).
- [ ] Shared import generalizations are named precisely.

### Photos, numbering, persistence
- [ ] The Cloudinary lifecycle is specified end to end (§11.3).
- [ ] The persistence representation is chosen with a justified comparison (§11.6).
- [ ] Exactly one Cloudinary preset is used.
- [ ] Prefix-engine requirements are settled and the uniqueness gap is named (§12).
- [ ] Manual identifiers never advance the cursor.
- [ ] An untouched auto-filled candidate remains automatic.
- [ ] Edit identity is immutable.
- [ ] One authoritative BOQ row store is selected (§13.2).
- [ ] Legacy read, write rules, and retirement are specified.

### RFQ, schema, standards
- [ ] RFQ isolation is explicit with a proof command (§14.4).
- [ ] Required migrations are enumerated but not implemented (§15).
- [ ] Migrations explicitly marked "not required" are justified.
- [ ] Required standards updates are enumerated but not implemented (§18).
- [ ] The standards applicability matrix covers all 15 files (§17).
