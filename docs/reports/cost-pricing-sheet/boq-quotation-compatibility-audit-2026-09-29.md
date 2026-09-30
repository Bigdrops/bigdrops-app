# BOQ Quotation Compatibility Architecture Audit

This report was written by Buffy on 2026-09-29 via Freebuff.

Skills used: writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive Summary

This audit investigated how the reconstructed BOQ must integrate with Quotation. BOQ →
Quotation conversion is a core workflow. Therefore Quotation is the compatibility
reference for BOQ.

The audit read the current Quotation implementation, the preserved BOQ domain, the shared
infrastructure, and every standard under `docs/standard/`. It did not change any file
except this report.

Four findings drive the plan.

1. **Quotation and BOQ use different table models.** Quotation uses the invoice column
   system (`useInvoiceColumns`, `BUILTIN_COLUMNS`, `custom_fields.columnConfig`). BOQ uses
   the `table-document` column model (`TableDocumentColumn`), which RFQ shares. The models
   are not compatible. BOQ must move to the invoice column system.

2. **Quotation and BOQ use different row models.** Quotation rows are
   `row_type: 'standard' | 'group_header'` with `group_id` and `group_name`. BOQ rows are
   `row_type: 'item' | 'section'` with `section_title`. Conversion between them is
   currently lossy.

3. **Quotation and BOQ use different calculation models.** Quotation routes all math
   through `computeDocument()` in `src/lib/Calculations.ts`. BOQ uses
   `computeBoqTotals()`, which is a separate calculator. Its own code states BOQ has "no
   VAT, discount, or WHT". BOQ also has two price fields (CP and SP). Quotation has one
   price field (`unit_price`).

4. **The database schemas do not match.** `quotation_items` has 25 columns. `boq_rows`
   has 13. `boq_rows` has no `image_url`, no `make`, no `unit_price`, no `amount`, no
   `group_id`, and no `group_name`. Also, `boqs.boq_number` has no unique constraint.
   The prefix-engine standard requires a unique constraint for its retry contract.

The reconstruction therefore needs a schema change. It also needs three standards
updates. The exact scope is in Sections 15, 16, and 18.

This report supersedes the group and column parts of
`docs/reports/boq/boq-reconstruction-transplant-plan-2026-09-29.md`.

---

## 2. Corrections to the Previous BOQ Reconstruction Plan

The previous plan made four assumptions. The user superseded all four.

### 2.1 Correction — Groups are supported

Previous assumption: BOQ JSON Import must be group-less, and BOQ has no group concept.

Correction: BOQ supports groups. BOQ must adopt the Quotation group model. The historical
group prohibition came from the immature BOQ stage. It is no longer valid.

### 2.2 Correction — JSON Import groups are in scope

Previous assumption: BOQ import must refuse groups.

Correction: BOQ import must support groups in Add mode, exactly like Quotation. Three
clauses in `docs/standard/json-import-standard.md` now conflict with this target
(Section 16.5).

### 2.3 Correction — Full Quotation Column Settings parity

Previous assumption: BOQ needs a reduced, BOQ-only Column Settings set.

Correction: BOQ Column Settings must mirror the current Quotation Column Settings,
including custom columns, three visibility modes, labels, ordering, the install
multiplier, and row overrides. BOQ adds its domain built-ins on top. It does not design a
smaller system.

### 2.4 Correction — Tax and commercial parity is in scope

Previous assumption: VAT, Discount, and Install Rate do not apply to BOQ, because
`computeBoqTotals()` does not use them.

Correction: these capabilities must be investigated for parity. This audit investigated
them. The finding is that BOQ's locked math **conflicts** with Quotation's commercial
model. Section 9 states each conflict. This audit does not invent formulas. A standards
decision is required before implementation.

---

## 3. Current Quotation Table Contract

This section records the actual production behaviour. It is derived from repository
evidence only.

### 3.1 Column Definition

| Item | Evidence |
| :--- | :--- |
| Canonical order | `DEFAULT_COLUMN_ORDER` in `src/domain/invoice/columns.ts` |
| Order value | `description`, `quantity`, `make`, `unit`, `unit_price`, `amount`, `install_rate`, `vat_rate`, `discount_rate` |
| Built-in columns | `BUILTIN_COLUMNS` in `src/domain/invoice/columns.ts` — 9 entries |
| Built-in removable | `false` for all 9 |
| Default visibility | `show` for `description`, `quantity`, `make`, `unit`, `unit_price`, `amount` |
| Default visibility | `hide_display` for `install_rate`, `vat_rate`, `discount_rate` |
| `description` | Always index 0. `ALWAYS_VISIBLE_COLUMN_KEYS` enforces this |
| Install Rate | Carries `includeInTotal: true` and a `formula` field (multiplier) |
| Custom columns | Key prefix `custom_`. Created by the user or the import pipeline |

### 3.2 Visibility Modes

`ColumnVisibilityMode` has three values: `show`, `hide_display`, `hide_full`.

| Mode | `resolveColumnBehavior` | Calculation effect | Evidence |
| :--- | :--- | :--- | :--- |
| `show` | Active in form, PDF, view | Rate applies | `src/domain/invoice/columns.ts` |
| `hide_display` | Excluded from PDF and view | Rate still applies | `normalizeDocumentInput` only zeroes on `hide_full` |
| `hide_full` | Excluded from every context | Rate is forced to 0 | `src/lib/Calculations.ts`, `shouldIncludeColumnInTotals` |

This is the hide-versus-disable distinction. `hide_display` is a display choice.
`hide_full` is a semantic removal from the calculation.

### 3.3 Column Manager Surface

`src/components/ColumnManager.tsx` renders a bottom sheet titled "Column Settings".

| Capability | Location |
| :--- | :--- |
| Description fixed row | `FixedColumnRow` — label editable, position locked |
| Column list | `BuiltInColumnRow` for each built-in |
| Drag reorder | `GripHandle` + `moveColumn` |
| Up / down reorder | `ReorderButtons` |
| Rename label | `Input` bound to `onUpdate(key, 'label', ...)` |
| Show / hide switch | `Switch` bound to `onToggle` — toggles `show` ↔ `hide_display` |
| Remove / restore from totals | Button bound to `onToggleFull` — toggles `hide_full` ↔ `show` |
| Install multiplier | `NumericInput` written to `install_rate.formula` |
| Total-affecting set | `TOTAL_AFFECTING_COLUMNS` = `quantity`, `unit_price`, `amount`, `install_rate`, `vat_rate`, `discount_rate` |
| Add custom column | `onAddCustom` → `addCustomColumn` |
| Reset to defaults | `onReset` behind `ResetConfirmDialog` |
| Row Overrides section | Lists `vat_rate`, `discount_rate`, `install_rate_override` rows with Reset and Reset All |

### 3.4 State and Persistence

| Concern | Evidence |
| :--- | :--- |
| Hook | `useInvoiceColumns` in `src/components/useInvoiceColumns.tsx` |
| Hook commands | `toggleVisible`, `toggleDisabled`, `updateColumn`, `addCustomColumn`, `removeCustomColumn`, `resetColumns`, `moveColumn` |
| Hydration | `resolveFinancialColumns` in `src/domain/financial/resolveFinancialColumns.ts` |
| Integrity | `ensureColumnOrderIntegrity` — description first, de-duplicate by key |
| Persistence location | `custom_fields.columnConfig` as `ColumnConfig[]` |
| Reset source | `getResetColumnConfigs()` |
| Calculation visibility input | `computeDocument` reads `columns` directly, or `cf.columnConfig` |

### 3.5 Item Field Contract

`InvoiceItem` in `src/domain/invoice/types.ts` carries the item fields. The Quotation
table uses this type.

Fields: `description`, `sub_description`, `make`, `quantity`, `unit`, `unit_price`,
`amount`, `install_rate`, `install_rate_override`, `vat_rate`, `discount_rate`,
`row_type`, `group_id`, `group_name`, `sort_order`, `image_url`, `custom_data`,
`item_id`.

### 3.6 Groups

| Concern | Evidence |
| :--- | :--- |
| Header row | `row_type: 'group_header'` with `group_id` and `group_name` |
| Standard row | `row_type: 'standard'` with `group_id` and `group_name` |
| Group metadata | `custom_fields.groupMeta` = `Record<id, { name, showSubtotal }>` |
| Build metadata | `toGroupMetaMap` in `src/components/quotation/quotationFormUtils.ts` |
| Normalize grouping | `normalizeQuotationGrouping` in the same file |
| Group operations | `useQuotationLineItems`: `addQuotationGroup`, `updateGroupName`, `toggleGroupSubtotal`, `deleteGroup`, `addItemToGroup`, `commitGrouping` |
| Persist | `buildCustomFields({ groups })` writes `groupMeta`; rows persist `group_id` and `group_name` |
| Clear all | `handleClearAll` → `commitGrouping([singleItem], [])` |

### 3.7 Calculation Flow

`QuotationFormPage.tsx` computes totals as follows.

```
computeDocument({
  items: normalizedItems,
  columns,
  document: { ...quotation, workmanship, transportation, shipping },
  cf: { extraCharges, calculationInputs },
})
```

Rates come from `custom_fields.calculationInputs`. Computed totals are never used as rate
inputs. This rule is stated at the top of `src/lib/Calculations.ts`.

### 3.8 Item Photo

| Concern | Evidence |
| :--- | :--- |
| Picker policy | `src/lib/documentImageUploadPolicy.ts` |
| Uploader | `src/components/invoice/MobileItemCard.tsx` |
| Cloud name | `ddhqvv77g` |
| Upload preset | `ml_default` (unsigned) |
| Upload endpoint | `https://api.cloudinary.com/v1_1/ddhqvv77g/image/upload` |
| Stored value | `data.secure_url` written to `image_url` |
| Persistence | `quotation_items.image_url` |
| Canonicalization | `resolveCanonicalItemImageUrl` in `src/domain/documentMedia.ts` |
| Hydration | `mapDbQuotationItem` in `src/domain/quotation/normalize.ts` |
| Document flag | `custom_fields.showItemImages` |
| Remove | `onUpdate(index, 'image_url', null)` |

---

## 4. Current BOQ Domain Contract

### 4.1 Mandatory Built-Ins

BOQ uses `TableDocumentRow` from `src/domain/table-document/types.ts`.

| Field | Key | Role |
| :--- | :--- | :--- |
| Identity | `id`, `_uiKey` | Row identity |
| Row kind | `row_type` | `'item'` or `'section'` |
| Order | `sort_order` | Row order |
| Section name | `section_title` | Section heading text |
| Description | `description` | Item description |
| Specification | `specification` | Item specification |
| Quantity | `quantity` | Number |
| Unit | `unit` | UOM text |
| Notes | `notes` | Row note |
| Make / Brand | `make_brand` | Manufacturer text |
| Cost Price | `cp` | Number, stored as string |
| Selling Price | `sp` | Number, stored as string |

`cp` and `sp` are first-class BOQ concepts. They are not optional display fields.

### 4.2 Default Columns

`BOQ_COLUMNS` in `src/domain/table-document/templateRegistry.ts` defines 7 columns:
`description`, `specification`, `quantity`, `unit`, `make_brand`, `cp`, `sp`. All are
`visible: true` except `specification`.

### 4.3 Row Types

`TableRowType` is `'item' | 'section'`. This differs from Quotation's
`'standard' | 'group_header'`.

### 4.4 Locked Calculations

`src/domain/boq/calculateBoqTotals.ts` defines `computeBoqTotals` and `computeRowProfit`.

```
Total Cost         = Σ(cp × quantity)
Total Selling Price = Σ(sp × quantity)
Gross Profit       = Total Selling Price − Total Cost
```

The file comment states: "BOQ is a costing/pricing schedule — no VAT, discount, or WHT."

### 4.5 Persistence

BOQ persists data in two places at once.

| Location | Content |
| :--- | :--- |
| `boqs.custom_fields.table_rows` | Full `TableDocumentRow[]` array |
| `boqs.custom_fields.table_columns` | `TableDocumentColumn[]` array |
| `boqs.custom_fields.template_id` | Template id |
| `boq_rows` table | One row per item, with `cells jsonb` = `{ specification, make_brand, cp, sp }` |

`normalizeDbBoq` prefers `custom_fields.table_rows` when it is non-empty. It falls back to
`boq_rows`. This is a split-brain risk (Section 20).

### 4.6 What Phase 1 Removed

The Phase 1 demolition removed the BOQ form and view presentation. These files are gone:
`src/components/boq/BoqForm.tsx`, `BoqEditor.tsx`, `BoqCustomizationPanel.tsx`,
`BoqPreview.tsx`, `BoqPdfDocument.tsx`, and the whole `src/components/document-view/boq/`
folder.

`src/pages/NewBoq.tsx`, `EditBoq.tsx`, and `ViewBoq.tsx` are now transitional
placeholders. They do not reproduce the old UI.

### 4.7 What Survives

| Survivor | Path |
| :--- | :--- |
| BOQ domain | `src/domain/boq/types.ts`, `normalize.ts`, `factories.ts`, `calculateBoqTotals.ts` |
| BOQ list | `src/components/boq/BoqList.tsx`, `src/pages/Boqs.tsx` |
| BOQ actions | `src/pages/view-boq-actions.ts` |
| BOQ PDF metadata | `src/domain/pdf/customization/boq.ts` |
| Table-document shared layer | `src/domain/table-document/**`, `src/components/table-document/**` |
| BOQ test | `src/tests/critical/boqNormalize.test.js` |

### 4.8 Capabilities That Are Currently Absent

| Capability | Status |
| :--- | :--- |
| BOQ form page | Absent — placeholder only |
| BOQ view page | Absent — placeholder only |
| Column Settings | Absent — BOQ uses `TableColumnControls`, a visible checkbox list |
| JSON Import | Absent — no adapter, no import sheet |
| Item photo | Absent — no `image_url` field or column |
| Save orchestration | Absent — no create or save path |
| Prefix Engine create wiring | Absent — only duplicate and convert use it |
| FAB on form and view | Absent — only the list FAB exists |

---

## 5. BOQ ↔ Quotation Compatibility Matrix

| Capability | BOQ representation | Quotation representation | BOQ persistence | Import | Conversion mapping | Status | Required adaptation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Groups | `row_type: 'section'` + `section_title` | `row_type: 'group_header'` + `group_id` + `group_name` | `boq_rows.section_title` | none | Not mapped — groups are lost | Lossy | Adopt the Quotation group model |
| Group ordering | `sort_order` | `sort_order` + header position | `boq_rows.sort_order` | none | Preserved only by array order | Partial | Use array order as the source of truth |
| Group subtotal | none | `groupMeta.showSubtotal` | none | none | Not mapped | Missing | Add `groupMeta` |
| Description | `description` | `description` | `description` | yes | Direct | Compatible | None |
| Sub Description | `specification` | `sub_description` | `cells.specification` | none | Not mapped | Incompatible | Rename to `sub_description`, per-item field |
| Quantity | `quantity` | `quantity` | `quantity` | yes | Direct | Compatible | None |
| Unit | `unit` | `unit` | `unit` | yes | Direct | Compatible | None |
| Make / Brand | `make_brand` | `make` | `cells.make_brand` | none | Not mapped | Rename required | Rename to `make` |
| CP | `cp` | no counterpart | `cells.cp` | none | Discarded | Lossy | Keep as a BOQ built-in. Define the conversion rule |
| SP | `sp` | `unit_price` (converted) | `cells.sp` | none | `unit_price = sp` | Lossy | Define CP/SP to unit_price mapping |
| Unit Price | none | `unit_price` | — | yes | via SP | Missing | Add, or map from SP |
| Amount | none (derived) | `amount` | — | excluded | computed | Missing | Derive `qty × unit_price` |
| VAT Rate | none | `vat_rate` (per row, nullable) | — | excluded | Not mapped | Missing | Standards decision needed |
| Discount Rate | none | `discount_rate` (per row, nullable) | — | excluded | Not mapped | Missing | Standards decision needed |
| Install Rate | none | `install_rate` + `_override` + `_taxable` | — | excluded | Not mapped | Missing | Standards decision needed |
| WHT | none | `wht` document-level | — | excluded | Not mapped | Missing | Standards decision needed |
| Row overrides | none | `vat_rate`, `discount_rate`, `install_rate_override` | — | excluded | Not mapped | Missing | Add the three fields |
| Custom columns | none | `custom_*` in `columnConfig`, values in `custom_data` | none | supports creation | `custom_data` passed through | Missing | Add `columnConfig` and `custom_data` |
| Column ordering | `table_columns` order | `columnConfig` order | `custom_fields.table_columns` | n/a | Ignored | Incompatible | Move to `custom_fields.columnConfig` |
| Column visibility | `visible` boolean | three-mode `visibilityMode` | `table_columns` | n/a | Ignored | Incompatible | Move to three-mode model |
| Column labels | `label` | `label` | `table_columns` | n/a | Ignored | Compatible | Preserved by the shared model |
| Item photo | none | `image_url` | none | excluded | Not mapped | Missing | Add `image_url` |
| Totals | CP/SP/gross profit | subtotal, VAT, discount, install, WHT, grand total, payable | derived | n/a | recomputed by Quotation | Incompatible | Section 9 |
| Document number | `boq_number` | `quotation_number` | `boqs.boq_number` | n/a | New Quotation number | Compatible | Add a unique constraint |
| Numbering engine | `getNextBoqNumber` → shared `nextAutomaticNumber` | `getNextQuotationNumber` → shared | cursor in `settings.document_prefixes.__auto_seq` | n/a | Fresh cursor read | Compatible | Wire the create path |
| Document title | `title` | `quotation_title` | `boqs.title` | `title` | `quotation_title = boq.title` | Compatible | None |
| Client | `vendor_name` | `client_name` | `boqs.vendor_name` | none | `client_name = vendor_name` | Compatible | None |
| Issue date | `issue_date` | `issue_date` | `boqs.issue_date` | none | Set to today | Compatible | None |
| Notes | `notes` | `notes` | `boqs.notes` | `notes` | Not mapped | Lossy | Map to `notes` |
| Lineage | none | `conversionTrail.source` | — | n/a | Written on conversion | Partial | Verify the trail type value |
| Extra charges | none | `extraCharges` + `workmanship`/`transportation`/`shipping` | — | `extra_charges` | Not mapped | Missing | Standards decision needed |
| Balance / amounts in words | none | `amount_in_words` | — | n/a | Not mapped | Out of scope | None |

### 5.1 Lossy Conversions That Must Be Fixed

1. **CP is discarded.** `convertBOQToQuotation` maps `unit_price: item.sp || item.unit_price || 0`. CP is dropped.
2. **Groups are lost.** BOQ sections do not become Quotation groups.
3. **Specification is dropped.** No target field exists.
4. **Make / Brand is dropped.** The target field is named `make`.
5. **Photos are dropped.** BOQ has no photo field.
6. **Notes are dropped.**

---

## 6. Groups Architecture

### 6.1 Current Quotation Behaviour

Groups exist in three places at once:

1. **Item array** — header rows (`row_type: 'group_header'`) and standard rows carry `group_id` and `group_name`.
2. **Custom fields** — `groupMeta` maps `group_id` to `{ name, showSubtotal }`.
3. **Derivation** — `normalizeQuotationGrouping` rebuilds the group list from the header rows on every render.

`showSubtotal` lives only in `groupMeta`. It is not a row field.

### 6.2 JSON Import Group Behaviour (Add Mode)

`src/domain/import/apply.ts` handles groups as follows:

- It merges imported groups with existing groups.
- It remaps an imported group id only on a real collision (same id, different name). Same id plus same name merges.
- `items[].group_id` is the canonical relationship. `group.itemIds` only corroborates.
- It throws when an item names an unknown group.
- It throws when an item is not listed in its group's `itemIds`.
- It emits one group header row per group, before the group's items.
- It rebases `sort_order` across the whole array.

### 6.3 JSON Import Group Behaviour (Update Mode)

Update mode ignores groups. It returns the existing groups unchanged. This matches
`json-import-standard.md` §7.

### 6.4 Target BOQ Group Architecture

BOQ must adopt the Quotation model exactly. The mapping is:

| BOQ today | BOQ target |
| :--- | :--- |
| `row_type: 'section'` | `row_type: 'group_header'` |
| `row_type: 'item'` | `row_type: 'standard'` |
| `section_title` | `group_name` + `description` on the header row |
| none | `group_id` |
| none | `custom_fields.groupMeta` |

A direct adoption makes step 1 of BOQ → Quotation conversion a field-for-field copy. It
also lets BOQ reuse `useQuotationLineItems`-equivalent logic instead of new group code.

**Decision required:** whether to rename BOQ's `'section'` and `'item'` values in place,
or to add a normalization step that maps them at the boundary. Section 21 records this.

---

## 7. Column Settings Architecture

### 7.1 Target

BOQ Column Settings must use the shared invoice column system. It must not use
`TableDocumentColumn` or `TableColumnControls`.

The adoption contract is `document-column-standard.md` §11. BOQ must:

1. Use `useInvoiceColumns`. It must not create a column hook.
2. Use `resolveFinancialColumns` on hydration.
3. Persist `custom_fields.columnConfig` as `ColumnConfig[]`.
4. Use `getPdfColumns` and `getPdfCellValue` for PDF output.
5. Use `getActiveColumns` or `resolveColumnBehavior` for form rendering.

### 7.2 BOQ Built-Ins on Top of the Shared Set

BOQ needs CP and SP. Quotation has no equivalent. Therefore BOQ needs two extra built-in
keys.

| Key | Label | Type | Position | Hidden by default |
| :--- | :--- | :--- | :--- | :--- |
| `cp` | CP | `number` | after `unit_price` | no |
| `sp` | SP | `number` | after `cp` | no |

`document-column-standard.md` §11 says "Do NOT create a separate column type definition."
So BOQ must extend the shared registry. It must not fork `ColumnConfig` or `BUILTIN_COLUMNS`.

**Decision required:** the extension shape. Two options exist:

- **Option A** — add `cp` and `sp` to the shared `BUILTIN_COLUMNS` in `src/domain/invoice/columns.ts`. Other modules would need to filter them out.
- **Option B** — add a document-scoped built-in set parameter to `useInvoiceColumns` and `resolveFinancialColumns`.

Section 21 records this decision. Option B avoids new keys leaking into Invoice and Quotation.

### 7.3 Hide Versus Disable

BOQ must honour the three-mode model. The meanings are fixed:

| Mode | Meaning for BOQ |
| :--- | :--- |
| `show` | Column is visible in the form, PDF, and view. The value is used. |
| `hide_display` | Column is hidden from PDF and view. The value is still used. |
| `hide_full` | Column leaves every context. The value is removed from the calculation. |

### 7.4 Non-Disableable BOQ Fields

These fields must stay in the schema and must never become removable:

| Field | Reason |
| :--- | :--- |
| `description` | Always index 0. The shared rule enforces this. |
| `quantity` | `computeBoqTotals` requires it. |
| `cp` | Total Cost requires it. Locked BOQ math. |
| `sp` | Total Selling Price requires it. Locked BOQ math. |

`hide_display` may hide any of these from output. `hide_full` must not remove
`quantity`, `cp`, or `sp` from the BOQ calculation, because the locked math then breaks.
This is a deliberate divergence from the Quotation rule for `unit_price`. Section 21
records it as an open decision.

### 7.5 Sub Description Is Not a Column Setting

`specification` must leave Column Settings. Section 8 explains.

---

## 8. Sub Description Resolution

### 8.1 Current Quotation Semantics

The evidence is consistent:

| Question | Answer | Evidence |
| :--- | :--- | :--- |
| Is `sub_description` a Column Settings entry? | No | It is absent from `BUILTIN_COLUMNS` |
| Is it a per-item field? | Yes | `InvoiceItem.sub_description` |
| Is it a database column? | Yes | `quotation_items.sub_description` |
| Is it editable inline? | Yes | `MobileItemCard` `showDetails` toggle, line ~452 |
| Is it in the import prompt? | Yes | `promptGenerator` forces `sub_description` into the item schema |
| Is it in the export/PDF path? | Yes | via `InvoiceItem` |

Quotation also keeps a related inline toggle for the field itself. Quotation does **not**
expose a "Sub Description" switch inside Column Settings.

### 8.2 Required BOQ Parity

BOQ must follow the same architecture:

1. Remove Sub Description from the future BOQ Column Settings contract.
2. Keep it as a per-item capability.
3. Preserve it through persistence, import, duplicate, PDF/view rendering, and conversion.

### 8.3 Required Future V12 Interpretation

The V12 candidate currently shows a Sub Description switch inside its column-settings
concept. This audit did **not** change V12. The required future interpretation is:

- The switch must become a per-item disclosure control, not a column visibility option.
- The underlying field maps to `sub_description`.

**Decision required:** the BOQ domain field is named `specification`. The parity target
names it `sub_description`. Section 21 records the rename decision.

---

## 9. Tax / Commercial Calculation Compatibility

This section traces ownership and classifies each field. It invents no formula.

### 9.1 Authoritative Calculation Ownership

| Layer | Path | Role |
| :--- | :--- | :--- |
| Source of truth | `src/lib/Calculations.ts` | `calculateDocument` + `normalizeDocumentInput` + `computeDocument` |
| Deprecated | `src/domain/invoice/calculations.ts` | `calcTotals`, `resolveRowVat`. No production callers. Do not call. |
| BOQ locked model | `src/domain/boq/calculateBoqTotals.ts` | `computeBoqTotals`, `computeRowProfit` |
| Quotation consumer | `src/pages/QuotationFormPage.tsx` | Calls `computeDocument` |
| Persisted rates | `custom_fields.calculationInputs` | Never read computed totals as rates |

`AGENTS.md` states that `computeDocument()` is the only production entry point.

### 9.2 Quotation Commercial Model

`calculateDocument` computes, in order:

1. Per-row `line_subtotal = quantity × unit_price`.
2. Per-row `line_install` from `install_rate`.
3. Per-row VAT base. The base includes install when `install_rate_taxable` is true.
4. Discount. Type is `fixed` or `percent`. Timing is `before_tax` or `after_tax`. A fixed `before_tax` discount is distributed proportionally across eligible taxable rows.
5. Per-row VAT at the effective rate.
6. Extra charges. Each charge has `vatApplicable`.
7. WHT. Base is contract value minus VAT. WHT never applies to VAT.
8. `grandTotal` and `totalPayable`.

Row overrides use `null` for inherit, and `0` for an explicit zero. These are different
states.

### 9.3 Field-by-Field Classification

Category meanings:

1. **Directly compatible** — no change needed.
2. **Compatible through a shared primitive** — reuse an existing helper.
3. **Display/persistence compatible, but the calculation semantics need a standards decision.**
4. **Incompatible without changing the locked BOQ math.**

| Field | BOQ | Quotation | Category | Note |
| :--- | :--- | :--- | :--- | :--- |
| `quantity` | yes | yes | 1 | Same meaning |
| `unit` | yes | yes | 1 | Same meaning |
| Description | yes | yes | 1 | Same meaning |
| `make_brand` → `make` | yes | yes | 1 | Rename only |
| SP → `unit_price` | yes | yes | 2 | Existing conversion maps SP to `unit_price` |
| `amount` | derived | stored | 2 | Reuse `quantity × unit_price` |
| Install Rate | none | yes | 3 | BOQ has no install concept. Requires a decision |
| Install multiplier formula | none | `ColumnConfig.formula` | 3 | Shared primitive `resolveInstallRate` exists |
| VAT Rate | none | yes | 3 | BOQ's locked model states "no VAT" |
| VAT row override | none | `vat_rate` nullable | 3 | Needs a new item field |
| Discount Rate | none | yes | 3 | BOQ's locked model states "no discount" |
| Discount type and timing | none | yes | 3 | Needs new document-level inputs |
| WHT | none | yes | 3 | Not in BOQ at all |
| Extra charges | none | yes | 3 | Not in BOQ at all |
| CP | yes | none | 4 | `computeDocument` has no CP input |
| SP as a second price | yes | none | 4 | `computeDocument` has one price per row |
| Gross profit total | yes | none | 4 | No counterpart in the Quotation result |
| Row overrides | none | yes | 3 | Needs `install_rate_override`, `vat_rate`, `discount_rate` |

### 9.4 Explicit Unresolved Conflicts

These conflicts must reach a standards decision before coding. This audit does not resolve
them, and it invents no formula.

**C1 — Two prices versus one price.** BOQ has CP and SP. Quotation has one `unit_price`.
VAT, discount, and install all apply to `unit_price`. The audit found no rule that states
which BOQ price is the VAT base.

**C2 — Locked BOQ math states "no VAT".** `computeBoqTotals` documents "no VAT, discount,
or WHT". Adding these fields contradicts that stated model. Either the model extends, or
BOQ keeps a separate calculator.

**C3 — Gross profit has no Quotation counterpart.** BOQ totals include gross profit.
`DocumentResult` has no such field. Conversion cannot carry it.

**C4 — Calculator ownership.** `AGENTS.md` names `computeDocument()` as the only
production entry point. BOQ currently uses a second calculator. The audit cannot decide
whether BOQ keeps `computeBoqTotals` as a presentation-costing layer, or routes through
`computeDocument`.

**C5 — `hide_full` on a locked BOQ field.** Section 7.4 states that `hide_full` on
`quantity`, `cp`, or `sp` would break the locked BOQ math. The Quotation rule would allow
it. A BOQ-specific rule is required.

**C6 — Extra charges.** Quotation supports `workmanship`, `transportation`, `shipping`,
and arbitrary `extraCharges`. BOQ has no equivalent table. Scope is undecided.

---

## 10. JSON Import Compatibility

### 10.1 Shared Infrastructure

All of these exist and are shared:

| File | Role |
| :--- | :--- |
| `src/domain/import/types.ts` | `ImportMode`, `ImportFieldKey`, group types, result types |
| `src/domain/import/parse.ts` | Raw JSON to parsed root |
| `src/domain/import/normalize.ts` | Unknown-key and candidate extraction |
| `src/domain/import/validate.ts` | Zod validation and row skipping |
| `src/domain/import/resolve.ts` | Candidate to `ColumnConfig`, deterministic keys, 10-column limit |
| `src/domain/import/overwrite.ts` | `detectOverwriteTargets` |
| `src/domain/import/apply.ts` | `buildApplyResult` — Add and Update |
| `src/domain/import/schema.ts` | Zod schemas |
| `src/domain/import/tableState.ts` | Table-state helpers |
| `src/domain/import/promptGenerator.ts` | `generateImportPrompt` |
| `src/components/import/JsonImportLayout.tsx` | Shared sheet wrapper |

### 10.2 The Adapter Contract

`json-import-standard.md` §2 requires `src/domain/<module>/importAdapter.ts` with
`prompts`, `schema`, and `applyResult`.

Quotation has one: `src/domain/quotation/importAdapter.ts`. The quotation form consumes it
at `QuotationFormPage.tsx` (`quotationImportAdapter.applyResult`, and
`importAdapter={quotationImportAdapter}`).

BOQ has no adapter. Evidence: no file named `boqImportAdapter`, and no import sheet for
BOQ.

### 10.3 Target BOQ Import Contract

| Element | Requirement |
| :--- | :--- |
| Adapter file | `src/domain/boq/importAdapter.ts` |
| Zod schema | Strict. Lives in the adapter or `src/domain/boq/schema.ts` |
| Fields | `description`, `sub_description`, `quantity`, `unit`, `make`, `cp`, `sp` |
| Custom columns | via a `custom_fields` sub-object, then the import pipeline creates them |
| Groups | Add mode: full group support. Update mode: ignored |
| `temp_ref` | Add mode only |
| `group_id` | Add mode only |
| `row_number` | Update mode. Range 1..N of standard rows |
| Overwrite detection | `detectOverwriteTargets` |
| UI | `JsonImportLayout` only. No ad-hoc sheet |
| Prompt | Pre-computed by the caller, passed as a prop |

### 10.4 Shared Infrastructure That Must Change

| Change | Reason | Evidence |
| :--- | :--- | :--- |
| Widen `documentType` to include `'boq'` | The third parameter is typed `'invoice' \| 'quotation'` | `src/domain/import/promptGenerator.ts` |
| Add `cp` and `sp` to `ImportFieldKey` | CP and SP are first-class. They are not custom columns | `src/domain/import/types.ts` |
| Add a group-less prompt mode | The generator always emits group rules in Add mode | `src/domain/import/promptGenerator.ts` |

The third change is defensive. It lets the shared generator serve a future module that
truly has no groups. It does not change BOQ behaviour.

### 10.5 Stale Standard Clauses

`docs/standard/json-import-standard.md` now conflicts with the BOQ target in three
places. This audit did not edit the standard.

| Clause | Current text | Conflict |
| :--- | :--- | :--- |
| §1 | "If the module supports groups (Invoice/Quotation only), explicit anti-inference group rules must be included." | BOQ now supports groups |
| §6 | "Groups are an Invoice and Quotation concern ONLY." | BOQ is now a third group module |
| §9 checklist | "Prompt does NOT include group rules (unless Invoice/Quotation)." | BOQ prompts must include group rules |

Required conceptual change: replace "Invoice/Quotation only" with a group-capable module
list that includes BOQ. Section 16.5 records this.

### 10.6 Update Mode Rules

These requirements come from the standard and from `apply.ts`:

- Require `row_number` for each item.
- Validate the range against the standard row count. Group headers are excluded.
- Reject duplicates and out-of-range values.
- Ignore group changes.
- Show the empty-field retention warning.
- Require overwrite confirmation.

---

## 11. Item Photo / Cloudinary Compatibility

### 11.1 Three Separate Responsibilities

| Responsibility | Owner | Evidence |
| :--- | :--- | :--- |
| Presentation | V12 candidate and the future React item card | V12 photo block |
| Picker and upload | Shared policy plus the shared uploader | `documentImageUploadPolicy.ts`, `MobileItemCard.tsx` |
| Cloudinary | Unsigned upload endpoint | `CLOUD_NAME`, `UPLOAD_PRESET` |
| Persistence | Item `image_url` field plus the row column | `quotation_items.image_url` |

V12's JavaScript uses local data URLs. That is presentation-only behaviour. It is **not**
the production architecture. The audit did not treat it as such.

### 11.2 The Production Upload Lifecycle

1. User taps the Photo action. A hidden `<input type="file" accept={IMAGE_ACCEPT_ATTRIBUTE}>` opens.
2. `isSupportedImageFile(file)` validates the file. An invalid file shows `getUnsupportedImageErrorMessage()` and stops.
3. The uploader builds `FormData` with `file` and `upload_preset`.
4. It POSTs to `https://api.cloudinary.com/v1_1/ddhqvv77g/image/upload`.
5. On success it stores `data.secure_url` in the item's `image_url`.
6. On failure it shows `feedback.error('Upload failed', ...)`.
7. The input value is cleared so the same file can be selected again.

### 11.3 Persistence and Hydration

| Step | Mechanism |
| :--- | :--- |
| Save | `toDbItem` writes `image_url: resolveCanonicalItemImageUrl(item)` |
| Canonicalization | `resolveCanonicalItemImageUrl` rejects temporary URLs: `blob:`, `file:`, `content:`, `capacitor://`, `filesystem:` |
| Hydration | `mapDbQuotationItem` and `mapDbInvoiceItem` both call `resolveCanonicalItemImageUrl` |
| Document flag | `showItemImages` in custom fields. Invoice derives it from `items.some(item => item.image_url)` |
| Replace | Select again. The new `secure_url` overwrites the old one |
| Remove | `onUpdate(index, 'image_url', null)` |
| Rendering gate | `MobileItemCard` renders the thumbnail only when `item.image_url` is set |

### 11.4 Cleanup

The audit found **no** Cloudinary delete call anywhere in `src/`. Removing a photo clears
the item reference. The Cloudinary asset remains. This is existing behaviour for Invoice
and Quotation. BOQ inherits it. It is recorded as a limitation, not a defect.

### 11.5 Duplicate and Conversion Behaviour

| Path | Current behaviour | Issue |
| :--- | :--- | :--- |
| BOQ duplicate | `duplicateBOQRecord` copies the `boqs` row only | It does **not** copy `boq_rows`. All items and photos are lost |
| BOQ → Quotation | Photos are not mapped | BOQ has no photo field today |

`duplicateBOQRecord` is in `src/pages/view-boq-actions.ts`. The audit confirmed the insert
payload spreads the `boqs` row only.

### 11.6 Required BOQ Persistence Representation

`boq_rows` has no `image_url` column. Evidence: the table definition has 13 columns and
none is a media field.

Two options exist:

- **Option A** — add `image_url text` to `boq_rows`. This mirrors `quotation_items` and lets BOQ reuse `resolveCanonicalItemImageUrl` unchanged.
- **Option B** — store the URL inside `cells jsonb`. This needs no migration, but it breaks the shared media helpers and the `showItemImages` derivation.

Option A is the parity choice. Section 15 records it.

### 11.7 Security

The upload uses an **unsigned** preset. No server-side secret is exposed. The upload
bypasses the Supabase layer. Tenant isolation therefore depends on the stored URL only.
The audit found no per-tenant Cloudinary folder or signing. BOQ must not add item photos
beyond this established pattern.

---

## 12. Prefix Engine

### 12.1 Existing BOQ Numbering Infrastructure

BOQ numbering is **already largely integrated**. The evidence:

| Element | Location | Status |
| :--- | :--- | :--- |
| Default prefix `BOQ` | `src/domain/prefixConstants.ts` | Present |
| `getNextBoqNumber(rows, prefix = 'BOQ', cursor)` | `src/domain/boq/normalize.ts` | Present |
| Shared allocator | `nextAutomaticNumber` | Used |
| Automatic cursor read | `fetchAutoCursor` | Used in duplicate and convert |
| Automatic cursor write | `advanceAutoCursor` | Used in duplicate and convert |
| Cursor storage | `settings.document_prefixes.__auto_seq` | `src/domain/documentNumbering.ts` |
| `resolvePrefix(prefixes, 'boq')` | `view-boq-actions.ts` | Used |

### 12.2 What Is Missing

| Gap | Evidence |
| :--- | :--- |
| Create-path wiring | The BOQ form was demolished in Phase 1. No create path exists |
| Collision retry | `withUniqueRetry` is not applied on the BOQ create path |
| Unique database constraint | `boqs.boq_number` has **no** unique index |
| Edit immutability guard | No BOQ equivalent of `assertQuotationIdentityImmutable` |
| Settings UI entry | Not verified in this audit. Must be confirmed before implementation |

### 12.3 The Unique Constraint Gap

This is the most important schema finding of the audit.

`prefix-engine-settings-standard.md` §2 requires every insert path to use
`withUniqueRetry`. That utility retries only on PostgreSQL error `23505`, which is a
unique-constraint violation. §5.3 states that a manual number "MUST reserve exactly its
own identifier through the existing database uniqueness constraint", and that "Duplicate
identifiers are forbidden".

The evidence:

- `quotations` has `quotations_quotation_number_key` — a unique index. ✔
- `boqs` has only `idx_boqs_archived_active` and `idx_boqs_archived_at`. ✘
- `boq_rows` needs no number constraint.

Without a unique constraint on `boqs.boq_number`, BOQ cannot satisfy the standard.
Duplicate numbers become possible. `withUniqueRetry` has nothing to detect.

**A migration is required.** Section 15 records it.

### 12.4 Required Reconstruction Wiring

The target must preserve all of these, per §5:

| Rule | Requirement |
| :--- | :--- |
| Shared prefix resolution | `resolvePrefix(settings?.document_prefixes, 'boq')` |
| Automatic allocation | `getNextBoqNumber` + `nextAutomaticNumber` |
| Manual isolation | A typed number must not advance the cursor |
| Occupied skipping | Skip numbers already present at or above the cursor |
| Collision retry | `withUniqueRetry` around the insert |
| Cursor advancement | Advance only after a successful automatic allocation |
| Edit immutability | The number must not change after creation |
| Duplicate behaviour | Duplicate allocates a fresh automatic number |
| Pre-fill rule | §5.6 — an untouched pre-filled number is a system candidate, not a manual identifier |

### 12.5 Documented Standard Drift

`prefix-engine-settings-standard.md` §2.4 cites
`src/components/quotation/QuotationForm.tsx:580`. That file **does not exist**. The audit
verified its absence. The current Quotation form is `src/pages/QuotationFormPage.tsx`. The
standard's file map is stale. This is a documentation defect, not a code defect.

---

## 13. FAB

`fab-standard.md` defines one container shape and three roles. BOQ needs one FAB per view,
maximum.

| View | Required role | Icon | Shared source |
| :--- | :--- | :--- | :--- |
| BOQ list | Create | Lucide `Plus` | `src/components/layout/MobileFab.tsx` |
| BOQ create/edit form | Save | Lucide `SaveAll` | `src/components/document/FormFooter.tsx` |
| BOQ view | Download | Custom `DownloadIcon` SVG | `src/components/document-view/shared/FloatingDownloadButton.tsx` |

### 13.1 Current State

| View | Status |
| :--- | :--- |
| List | Already conformant. `BoqList.tsx` imports `MobileFab` and passes `onPrimaryAction` |
| Form | Absent. The form was demolished |
| View | Absent. The view was demolished |

### 13.2 Rules

- Use the shared components. Do not inline a new FAB.
- Do not introduce a new icon, shape, or size.
- Keep one primary FAB per view.
- Honour `prefers-reduced-motion`.
- Do not invent a BOQ-specific floating action.

**Decision required:** whether the BOQ save FAB is the shared `FormFooter` component or a
BOQ-local footer that copies the exact `SaveAll` class string. Section 21 records this.

---

## 14. BOQ → Quotation Conversion Contract

### 14.1 Current Implementation

The converter is `convertBOQToQuotation` in `src/pages/view-boq-actions.ts`.

| Step | Behaviour |
| :--- | :--- |
| Number | Reads the Quotation cursor, calls `getNextQuotationNumber`, advances the cursor |
| Quotation row | Sets `quotation_number`, `po_number`, `quotation_title`, `client_name`, `issue_date`, `status`, `subtotal: 0`, `total: 0` |
| Source link | Sets `source_boq_id` |
| Lineage | Writes `conversionTrail.source` via `withSourceTrail` + `buildTrailLink` |
| Items | Filters rows, maps each with `toQuotationItemRow` |
| Item price | `unit_price: item.sp \|\| item.unit_price \|\| 0` |
| Item amount | `quantity × that price` |

### 14.2 Field-by-Field Mapping

| BOQ field | Quotation field | Behaviour |
| :--- | :--- | :--- |
| `sp` | `unit_price` | Mapped |
| `quantity` | `quantity` | Mapped |
| `unit` | `unit` | Mapped |
| `description` | `description` | Mapped |
| `make_brand` | `make` | **Not mapped** |
| `specification` | `sub_description` | **Not mapped** |
| `cp` | — | **Discarded** |
| `notes` | — | **Discarded** |
| `section_title` | `group_name` | **Not mapped** |
| `row_type: 'section'` | `row_type: 'group_header'` | **Not mapped** |
| `image_url` | `image_url` | **Does not exist on BOQ** |

### 14.3 Defects Found

**D1 — Groups are lost.** The filter tests `item.row_type === 'group_header'`, but BOQ
rows use `'section'`. So section rows fall to the `description?.trim()` branch. Sections
with an empty description are dropped. No row receives `group_id` or `group_name`.

**D2 — CP is discarded.** No Quotation field receives it.

**D3 — Field-name drift.** `make_brand` and `specification` are not renamed.

**D4 — Possible unknown-column insert error.** `toQuotationItemRow` calls `toDbItem`,
which spreads the remaining item keys. BOQ rows carry `cp`, `sp`, `specification`, and
`make_brand` in `cells`, and `normalizeDbBoq` lifts them onto the row object. The
`quotation_items` table has no such columns. An insert with unknown columns fails. This
must be verified and fixed during reconstruction. The audit could not run the code.

**D5 — Lineage type.** `buildTrailLink({ type: 'quotation' })` is used for the **source**
document, which is a BOQ. `DocumentTrailLink.type` is typed `'invoice' | 'quotation'`. The
value for a BOQ source is misleading. This needs a decision.

**D6 — Totals are zeroed.** The converter writes `subtotal: 0` and `total: 0`. Quotation
recomputes on open. This is acceptable but must be stated.

### 14.4 Required Changes for Compatibility

| Change | Reason |
| :--- | :--- |
| Adopt `group_header` semantics in BOQ | Makes group mapping a copy |
| Rename `make_brand` to `make` | Field parity |
| Rename `specification` to `sub_description` | Field parity |
| Add `image_url` | Carries the photo |
| Define the CP rule | CP has no target |
| Stop passing unknown columns | Prevent the insert error |
| Map notes | Avoid silent loss |
| Add `conversionTrail` to BOQ | Symmetric lineage |

---

## 15. Persistence / Schema Impact

This section is evidence-based. It does not create a migration.

### 15.1 Uses Existing JSONB — No Migration

| Capability | Storage | Status |
| :--- | :--- | :--- |
| Column config | `boqs.custom_fields.columnConfig` | Existing `custom_fields jsonb` |
| Group metadata | `boqs.custom_fields.groupMeta` | Existing JSONB |
| Calculation inputs | `boqs.custom_fields.calculationInputs` | Existing JSONB |
| Item photo flag | `boqs.custom_fields.showItemImages` | Existing JSONB |
| Conversion lineage | `boqs.custom_fields.conversionTrail` | Existing JSONB |
| BOQ title, template, palette | `boqs.custom_fields` | Existing JSONB |

### 15.2 Requires a Migration

The audit found two changes that repository evidence proves are necessary.

**M1 — Unique constraint on `boqs.boq_number`.**
Evidence: no unique index exists. The prefix-engine standard §2 and §5.3 require one. Without
it, `withUniqueRetry` cannot work and duplicate numbers are possible.

Scope: `boqs` in the public template and in every tenant schema. Note that legacy rows may
already contain duplicates or nulls. The migration must account for that before adding the
constraint.

**M2 — `boq_rows` Quotation-parity columns.**
Evidence: `quotation_items` has 25 columns; `boq_rows` has 13. These are absent from
`boq_rows`: `image_url`, `make`, `unit_price`, `amount`, `sub_description`, `group_id`,
`group_name`, `install_rate`, `install_rate_override`, `install_rate_taxable`,
`vat_rate`, `discount_rate`, `custom_data`, `item_id`.

The section also needs a row-type value decision. BOQ uses `'section'`; the target uses
`'group_header'`.

### 15.3 The Smaller Option for M2

An alternative exists. BOQ could keep its native shape and map fields only inside the
converter. That needs no new columns.

The trade-off:

| Approach | Cost |
| :--- | :--- |
| Add Quotation-parity columns | Migration. Gives lossless conversion and shared helpers. |
| Keep native `cells jsonb` | No migration. Conversion stays lossy. Photos need a JSONB workaround. |

This is an architectural decision. Section 21 records it.

### 15.4 Split-Brain Risk

BOQ currently persists items twice: in `boqs.custom_fields.table_rows` and in `boq_rows`.
`normalizeDbBoq` prefers the JSONB copy. Two stores can disagree silently.

The reconstruction should pick one store as authoritative. Section 20 records this risk.

---

## 16. Standards Applicability and Standards Conflicts

All 15 files under `docs/standard/` were read.

### 16.1 Standards Applicability Matrix

| Standard | Applicability | BOQ area affected | Concrete requirement | Conforming reference |
| :--- | :--- | :--- | :--- | :--- |
| `prefix-engine-settings-standard.md` | Applicable | Numbering | Resolve via `resolvePrefix`. Use `withUniqueRetry`. Honour §5 manual/automatic rules | Invoice, Quotation, RFQ |
| `fab-standard.md` | Applicable | List, form, view | Shared `Plus`, `SaveAll`, and custom SVG download FABs. One per view | `MobileFab`, `FormFooter`, `FloatingDownloadButton` |
| `json-import-standard.md` | Applicable (with conflicts) | Import | Adapter at `src/domain/boq/importAdapter.ts`. Zod. `JsonImportLayout`. Deterministic column creation | `src/domain/quotation/importAdapter.ts` |
| `document-column-standard.md` | Applicable | Column Settings | Use `useInvoiceColumns`, `resolveFinancialColumns`, `custom_fields.columnConfig` | Invoice, Quotation |
| `document-form-consolidation-standard.md` | Applicable | Form pages | One `BoqFormPage.tsx` with a `mode` prop. `NewBoq`/`EditBoq` become thin delegators | `InvoiceFormPage`, `CsrFormPage` |
| `document-save-orchestration.md` | Applicable | Save | Use `useDocumentSave`. The strategy must not call `computeDocument` | Invoice, Quotation |
| `document-transformation-standard.md` | Applicable | Edit, duplicate, convert | Identity immutability. Lineage. Duplicate rules | `assertQuotationIdentityImmutable` |
| `lifecycle-ownership-standard.md` | Applicable | All layers | Business rules in the domain. UI owns presentation. Pages coordinate | Quotation |
| `document-image-upload-policy.md` | Applicable | Item photo | Import from `documentImageUploadPolicy.ts`. Validate after selection | `MobileItemCard` |
| `pdf-customization-extension-standard.md` | Partially applicable | PDF | Declare capabilities and policy. Use `resolveFull` | `src/domain/pdf/customization/boq.ts` |
| `pdf-migration-standard.md` | Partially applicable | PDF | Mandatory pipeline. Renderers do not calculate | Invoice PDF templates |
| `audit-trail-standard.md` | Partially applicable | Activity | Add `activity_events` types for create, convert, duplicate | `activity_events` pattern |
| `receipt-standard.md` | Not applicable | — | Receipts are a separate document family | — |
| `docs-commit-workflow-standard.md` | Not applicable to BOQ code | — | Workflow only | — |
| `Commercial Party Architecture Standard.md` | Not authoritative | — | The file contains only "coming soon" | `AGENTS.md` §6 |

### 16.2 Form Consolidation Conflict

`document-form-consolidation-standard.md` puts BOQ in scope. It requires a single
`BoqFormPage.tsx` and thin delegators.

The Phase 1 demolition left `NewBoq.tsx`, `EditBoq.tsx`, and `ViewBoq.tsx` as
placeholders. Those placeholders are **not** delegators. The current repository state is
therefore deliberately non-conformant for BOQ. The reconstruction must restore
conformance. The audit did not change the placeholders.

### 16.3 Column Standard Conflict

`document-column-standard.md` §2 lists only Invoice and Quotation as covered modules. The
§11 adoption rules do cover new modules, so BOQ is handled. However, §4.3 states that nine
built-in columns exist. BOQ adds CP and SP. The standard's count and table become stale.

### 16.4 Prefix Standard Conflict

Two issues:

1. `boqs.boq_number` has no unique constraint, so §2 and §5.3 cannot be satisfied.
2. §2.4 and Appendix A cite `src/components/quotation/QuotationForm.tsx`, which does not exist.

### 16.5 JSON Import Standard Conflicts

| Clause | Current text | Required change |
| :--- | :--- | :--- |
| §1 | "If the module supports groups (Invoice/Quotation only)" | Add BOQ to the group-capable list |
| §6 | "Groups are an Invoice and Quotation concern ONLY." | Add BOQ |
| §6 | "No other module (Waybill, CSR, RFQ, Compliance Hub, Project Documents)" | The list omits BOQ. State the rule by capability, not by module name |
| §9 | "Prompt does NOT include group rules (unless Invoice/Quotation)." | Add BOQ |

The audit did not edit the standard. The conceptual change is: define group support as a
capability flag per module, and list Invoice, Quotation, and BOQ as group-capable.

### 16.6 Standards That Are Silent

No standard states which BOQ price is the tax base. No standard covers BOQ gross profit
in conversion. No standard states whether BOQ keeps `computeBoqTotals` or routes through
`computeDocument`. Section 9.4 records these gaps.

---

## 17. Shared Infrastructure Reuse Map

| Capability | Classification | Target |
| :--- | :--- | :--- |
| Prefix resolution | Direct reuse | `resolvePrefix`, `nextAutomaticNumber` |
| Automatic cursor | Direct reuse | `fetchAutoCursor`, `advanceAutoCursor` |
| Collision retry | Direct reuse, after M1 | `withUniqueRetry` |
| Column hook | Direct reuse | `useInvoiceColumns` |
| Column hydration | Direct reuse | `resolveFinancialColumns` |
| Column UI | Direct reuse | `ColumnManager` |
| Column persistence | Direct reuse | `custom_fields.columnConfig` |
| Column PDF helpers | Direct reuse | `getPdfColumns`, `getPdfCellValue` |
| CP and SP built-ins | Shared extension | Section 7.2 options A or B |
| Group model | Direct reuse | Quotation group contract |
| Group operations | Thin BOQ adapter | Port the `useQuotationLineItems` group operations |
| JSON import pipeline | Direct reuse | `src/domain/import/**` |
| Import prompt | Shared extension | Widen `documentType`, add `cp`/`sp` |
| Import adapter | BOQ adapter | `src/domain/boq/importAdapter.ts` |
| Import UI | Direct reuse | `JsonImportLayout` |
| Image picker policy | Direct reuse | `documentImageUploadPolicy.ts` |
| Image uploader | Direct reuse, or extract | `MobileItemCard` uploader |
| Image canonicalization | Direct reuse | `resolveCanonicalItemImageUrl` |
| Item photo persistence | BOQ-specific (migration M2) | `boq_rows.image_url` |
| Financial engine | Standards change required | Section 9.4 |
| BOQ costing math | BOQ-specific domain logic | `computeBoqTotals` |
| Save orchestration | Direct reuse | `useDocumentSave` |
| Form shell | Direct reuse | `SharedDocumentForm`, `FormFooter` |
| Identity immutability | Thin BOQ adapter | Port `assertQuotationIdentityImmutable` |
| FAB components | Direct reuse | `MobileFab`, `FloatingDownloadButton` |
| PDF customization | Preserve unchanged | `src/domain/pdf/customization/boq.ts` |
| Document view shell | Direct reuse | `src/components/document-view/**` |
| Table-document layer | Preserve, then retire for BOQ | `src/domain/table-document/**` still serves RFQ |
| List page | Preserve unchanged | `BoqList`, `Boqs`, `DocumentQueryContext` |
| Export fetchers | BOQ fix required | `src/services/exportFetchers.ts` maps `BOQS` to `boq_items` |

---

## 18. Future Implementation File Map

All paths in this section were verified to exist during this audit, unless marked
"to create".

### 18.1 Files Likely Created

| Path | Purpose |
| :--- | :--- |
| `src/pages/BoqFormPage.tsx` | Single BOQ form page with a `mode` prop |
| `src/components/boq/BoqFormScreen.tsx` | Shared BOQ form UI |
| `src/components/boq/useBoqLineItems.ts` | BOQ group and row operations |
| `src/components/boq/boqFormUtils.ts` | `buildCustomFields`-equivalent for BOQ |
| `src/components/boq/boqFormTypes.ts` | BOQ editor state types |
| `src/domain/boq/importAdapter.ts` | JSON Import adapter |
| `src/domain/boq/schema.ts` | Zod import schema |
| `src/domain/boq/assertIdentityImmutable.ts` | BOQ identity guard |
| `src/components/boq/BoqImportSheet.tsx` | Import sheet using `JsonImportLayout` |
| `src/hooks/useBoqSave.ts` | Save strategy for `useDocumentSave` |
| `supabase/migrations/<timestamp>_boq_compatibility.sql` | M1 and, if chosen, M2 |

### 18.2 Files Likely Modified

| Path | Change |
| :--- | :--- |
| `src/pages/NewBoq.tsx` | Replace the placeholder with a thin delegator |
| `src/pages/EditBoq.tsx` | Replace the placeholder with a thin delegator |
| `src/pages/ViewBoq.tsx` | Replace the placeholder with the real view |
| `src/domain/boq/types.ts` | Add parity fields |
| `src/domain/boq/normalize.ts` | Map new fields and row types |
| `src/domain/boq/factories.ts` | Align defaults with the column set |
| `src/domain/boq/calculateBoqTotals.ts` | Extend only after the standards decision |
| `src/domain/table-document/templateRegistry.ts` | Retire the BOQ column preset |
| `src/pages/view-boq-actions.ts` | Fix conversion defects D1 to D6 |
| `src/domain/import/types.ts` | Add `cp` and `sp` to `ImportFieldKey` |
| `src/domain/import/promptGenerator.ts` | Widen `documentType` |
| `src/domain/invoice/columns.ts` | Add CP and SP built-ins, or parameterize the registry |
| `src/domain/financial/resolveFinancialColumns.ts` | Accept a document-scoped built-in set |
| `src/services/exportFetchers.ts` | Fix the `boq_items` table name |
| `src/utils/exportCompilers.ts` | Fix the `boq_items` reference |
| `src/components/boq/BoqList.tsx` | Verify links and export still resolve |

### 18.3 Shared Files That Should Remain Untouched

| Path | Reason |
| :--- | :--- |
| `src/lib/Calculations.ts` | Financial source of truth. No BOQ-specific change |
| `src/domain/invoice/calculations.ts` | Deprecated. Do not touch without a separate task |
| `src/components/invoice/MobileItemCard.tsx` | Shared by Invoice, Quotation, and Waybill. Prefer extraction over editing |
| `src/lib/documentImageUploadPolicy.ts` | Shared policy. No change |
| `src/domain/documentMedia.ts` | Shared media helpers. No change |
| `src/components/import/JsonImportLayout.tsx` | Shared wrapper. No change |
| `src/components/layout/MobileFab.tsx` | Shared FAB. No change |
| `src/components/document-view/shared/FloatingDownloadButton.tsx` | Shared FAB. No change |
| `src/domain/pdf/customization/boq.ts` | Existing and correct |
| `src/domain/prefixConstants.ts` | BOQ prefix already present |
| `src/components/boq/BoqList.tsx` | Only touch if a link breaks |
| All RFQ files | RFQ shares `table-document`. Do not break it |

### 18.4 Files Requiring a Decision First

| Path | Decision |
| :--- | :--- |
| `src/domain/invoice/columns.ts` | Option A or Option B for CP and SP |
| `src/domain/boq/types.ts` | Rename `specification`, `make_brand`, and row types, or map at the boundary |
| `src/domain/boq/calculateBoqTotals.ts` | Keep as a costing layer, or route through `computeDocument` |
| `supabase/migrations/**` | M2 scope: in place, or convert-only mapping |
| `src/components/document/FormFooter.tsx` | Reuse, or a BOQ-local footer |

---

## 19. Ordered Reconstruction Sequence

This sequence minimises regression risk. Each step ends in a verifiable state.

**Phase A — Contracts and schema (no UI).**
1. Decide the open items in Section 21.
2. Write migration M1, the unique constraint on `boqs.boq_number`. Include duplicate cleanup.
3. Write migration M2 if chosen.
4. Update the stale standards clauses (Section 16.5 and 16.3). This is a separate, explicit task.
5. Extend the shared column registry with CP and SP, or parameterize it.
6. Extend `ImportFieldKey` with `cp` and `sp`. Widen `generateImportPrompt`.

**Phase B — Domain and persistence.**
7. Align `src/domain/boq/types.ts` with the parity field names.
8. Update `normalize.ts` for the new fields, row types, and `groupMeta`.
9. Update `factories.ts` defaults.
10. Add `src/domain/boq/assertIdentityImmutable.ts`.
11. Resolve the calculation decision, then adjust `calculateBoqTotals.ts`.

**Phase C — Form shell and columns (V12 parity).**
12. Create `BoqFormPage.tsx` and make `NewBoq`/`EditBoq` delegators.
13. Wire `useInvoiceColumns`, `ColumnManager`, and `custom_fields.columnConfig`.
14. Wire the Save FAB.
15. Wire `useDocumentSave` and the create path, with `withUniqueRetry`.

**Phase D — Groups.**
16. Add BOQ group operations on the Quotation model.
17. Wire group persistence to `groupMeta` and header rows.

**Phase E — JSON Import.**
18. Add `src/domain/boq/importAdapter.ts` and the schema.
19. Add `BoqImportSheet.tsx` using `JsonImportLayout`.
20. Verify group import in Add mode and group rejection in Update mode.

**Phase F — Item photos.**
21. Write the migration for `boq_rows.image_url` if M2 is chosen.
22. Wire the shared uploader in the BOQ item card.
23. Verify hydration, replace, and remove.

**Phase G — View, PDF, and conversion.**
24. Rebuild `ViewBoq.tsx` with the shared view shell and the download FAB.
25. Verify the PDF pipeline uses prepared data only.
26. Fix the conversion defects D1 to D6.
27. Add the BOQ `conversionTrail`.

**Phase H — Export and list.**
28. Fix the `boq_items` table-name defect.
29. Verify list links to `/boqs/new` and `/boqs/edit/:id`.

Only after Phase A completes should any UI work start. Every later phase depends on the
field names and the schema.

---

## 20. Risk Register

| ID | Risk | Impact | Evidence | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R1 | No unique constraint on `boqs.boq_number` | Duplicate numbers. Prefix standard violated | No unique index exists | Migration M1 |
| R2 | Split-brain item storage | `table_rows` JSONB and `boq_rows` can disagree | `normalizeDbBoq` prefers JSONB | Choose one authoritative store |
| R3 | Conversion drops CP and groups | Financial data loss on conversion | `convertBOQToQuotation` maps SP only | Fix D1 and D2 before release |
| R4 | Conversion may insert unknown columns | Insert error on convert | `toDbItem` spreads row keys into `quotation_items` | Strip BOQ-only keys |
| R5 | Locked BOQ math conflicts with Quotation parity | Wrong totals, or a broken locked model | `computeBoqTotals` states "no VAT, discount, or WHT" | Standards decision C1 to C6 |
| R6 | `hide_full` on a locked BOQ field | Breaks the BOQ total | Locked math needs `quantity`, `cp`, `sp` | BOQ-specific rule, decision C5 |
| R7 | Photo persistence needs a column | Photo cannot persist | `boq_rows` has no `image_url` | Migration M2, or JSONB |
| R8 | Duplicate loses all rows | Data loss | `duplicateBOQRecord` copies the `boqs` row only | Copy `boq_rows` |
| R9 | Column registry extension leaks keys | Invoice and Quotation may show CP and SP | Shared `BUILTIN_COLUMNS` | Prefer Option B |
| R10 | RFQ shares the table-document layer | BOQ changes can break RFQ | `TableDocumentType = 'rfq' \| 'boq'` | Do not change shared table-document behaviour |
| R11 | Stale standard clauses | Agents may follow the wrong rule | Section 16.5 | Explicit standards update task |
| R12 | `exportFetchers` maps `BOQS` to `boq_items` | BOQ export fails | `src/services/exportFetchers.ts:51` | Fix the table name |
| R13 | Unsigned Cloudinary preset | No per-tenant isolation on uploads | `UPLOAD_PRESET = 'ml_default'` | Do not extend beyond the existing pattern |
| R14 | No Cloudinary delete path | Orphaned assets | No delete call in `src/` | Accept as existing behaviour |
| R15 | V12 is a prototype, not production | Wrong assumptions | V12 uses local data URLs | Treat V12 as presentation only |
| R16 | Phase 1 placeholders are non-conformant | Form consolidation standard violated | `NewBoq.tsx` is a placeholder | Restore in Phase C |

---

## 21. Remaining Unresolved Decisions

These questions cannot be settled by repository evidence or by the current user
direction. They require a decision before implementation.

**Q1 — Which BOQ price is the tax base?** BOQ has CP and SP. Quotation taxes
`unit_price`. No standard or code states the rule. (Conflict C1)

**Q2 — Does BOQ keep `computeBoqTotals`?** `AGENTS.md` names `computeDocument()` as the
only production entry point. BOQ uses a second calculator. (Conflict C4)

**Q3 — How does gross profit survive conversion?** Quotation has no such field.
(Conflict C3)

**Q4 — What does `hide_full` mean for a locked BOQ field?** Quotation permits it.
BOQ's locked math needs `quantity`, `cp`, and `sp`. (Conflict C5)

**Q5 — Are extra charges in BOQ scope?** Quotation supports four charge kinds.
(Conflict C6)

**Q6 — Do we rename BOQ field names, or map at the boundary?** Affects
`specification`, `make_brand`, `'section'`, and `'item'`. A rename is cleaner for
conversion but touches preserved domain files.

**Q7 — CP and SP column registry: Option A or Option B?** Option A edits the shared
registry. Option B parameterizes it. Section 7.2.

**Q8 — Is migration M2 in scope, or does BOQ keep its native row shape?** Section 15.3.

**Q9 — Does the save FAB reuse `FormFooter`, or a BOQ-local footer?** Section 13.2.

**Q10 — Should `DocumentTrailLink.type` gain a `'boq'` value?** The current code labels a
BOQ source as `'quotation'`. (Defect D5)

**Q11 — What is the authoritative BOQ item store?** `custom_fields.table_rows`,
`boq_rows`, or both. Risk R2.

**Q12 — Must BOQ export ship with the reconstruction, or later?** Risk R12.

---

## 22. Implementation Acceptance Checklist

These items become the acceptance criteria for the later coding work.

### Standards
- [ ] All four standards conflicts in Section 16 are resolved by a separate standards task.
- [ ] `json-import-standard.md` §1, §6, and §9 list BOQ as group-capable.
- [ ] `document-column-standard.md` §2 and §4.3 account for the BOQ built-ins.
- [ ] `prefix-engine-settings-standard.md` §2.4 and Appendix A are corrected.
- [ ] No standard is silently violated.
- [ ] `Commercial Party Architecture Standard.md` is not treated as authoritative.

### Schema
- [ ] A migration adds a unique constraint on `boqs.boq_number` (M1).
- [ ] The migration handles pre-existing duplicate or null numbers.
- [ ] The BOQ item store decision is applied consistently (M2 or JSONB).
- [ ] The migration is pushed with `supabase db push`, and the push succeeds.

### Column Settings
- [ ] BOQ uses `useInvoiceColumns`. It has no custom column hook.
- [ ] BOQ hydrates with `resolveFinancialColumns` on create and edit.
- [ ] BOQ persists `custom_fields.columnConfig` as `ColumnConfig[]`.
- [ ] `ColumnManager` provides rename, reorder, show/hide, totals removal, install multiplier, custom columns, reset, and row overrides for BOQ.
- [ ] CP and SP are first-class built-ins, not custom columns.
- [ ] `hide_display` keeps the value in the calculation.
- [ ] `hide_full` removes the value from the calculation.
- [ ] `hide_full` cannot break `quantity`, `cp`, or `sp` totals.
- [ ] Sub Description is not a Column Settings row.

### Sub Description
- [ ] The field exists per item.
- [ ] It persists.
- [ ] It survives import, duplicate, PDF/view, and conversion.
- [ ] The V12 switch is interpreted as a per-item disclosure.

### Groups
- [ ] BOQ uses `row_type: 'group_header'` and `'standard'`.
- [ ] Header rows carry `group_id` and `group_name`.
- [ ] `custom_fields.groupMeta` stores `name` and `showSubtotal`.
- [ ] Group subtotals render.
- [ ] Group ordering follows array order.
- [ ] JSON Import Add mode creates groups.
- [ ] JSON Import Update mode ignores groups.
- [ ] An unknown group reference fails the import with a clear message.

### JSON Import
- [ ] `src/domain/boq/importAdapter.ts` exists with `prompts`, `schema`, and `applyResult`.
- [ ] The prompt includes the discipline block verbatim.
- [ ] The prompt includes group rules.
- [ ] The schema is strict Zod.
- [ ] `cp` and `sp` are importable.
- [ ] Custom columns are created by the pipeline only. The limit of 10 holds.
- [ ] The UI uses `JsonImportLayout`. The prompt is pre-computed.
- [ ] Update mode checks the row range and shows the retention warning.
- [ ] Overwrite confirmation uses `detectOverwriteTargets`.

### Item Photo
- [ ] The picker uses `IMAGE_ACCEPT_ATTRIBUTE`.
- [ ] The picker calls `isSupportedImageFile` after selection.
- [ ] The upload posts to the established Cloudinary endpoint with the established preset.
- [ ] The stored value is `secure_url`.
- [ ] `resolveCanonicalItemImageUrl` is used on save and hydrate.
- [ ] Temporary URLs never persist.
- [ ] Replace works.
- [ ] Remove works.
- [ ] Each item holds independent photo state.
- [ ] No new Cloudinary account, preset, or folder is introduced.

### Tax and Commercial
- [ ] No new financial formula is invented.
- [ ] Every Section 9.4 conflict has a recorded decision.
- [ ] If BOQ adopts VAT, Discount, or Install, it routes through `computeDocument`.
- [ ] `src/lib/Calculations.ts` is not bypassed or duplicated.
- [ ] `calcTotals` and `resolveRowVat` remain unused.

### Prefix Engine
- [ ] The prefix resolves through `resolvePrefix(prefixes, 'boq')`.
- [ ] The create path uses `withUniqueRetry`.
- [ ] A manual number does not advance the cursor.
- [ ] Occupied numbers are skipped.
- [ ] The cursor advances only after a successful automatic allocation.
- [ ] The number cannot change after creation.
- [ ] Duplicate allocates a fresh automatic number.
- [ ] An untouched pre-filled number is not treated as manual.
- [ ] No BOQ-only numbering logic is created.

### FAB
- [ ] The list uses `MobileFab`.
- [ ] The form uses `SaveAll`.
- [ ] The view uses the custom `DownloadIcon` SVG.
- [ ] Every FAB uses the 50×50 rounded-[18px] container.
- [ ] One primary FAB per view.
- [ ] No new icon or shape is introduced.

### Conversion
- [ ] Groups convert to groups.
- [ ] CP has a defined target or is explicitly documented as dropped.
- [ ] `make_brand` maps to `make`.
- [ ] `specification` maps to `sub_description`.
- [ ] Photos convert.
- [ ] Notes convert.
- [ ] No unknown column is sent to `quotation_items`.
- [ ] `conversionTrail.source` is written with a correct type.
- [ ] The Quotation number is allocated through the shared cursor.

### Form and Lifecycle
- [ ] One `BoqFormPage.tsx` exists with a `mode` prop.
- [ ] `NewBoq.tsx` and `EditBoq.tsx` are thin delegators.
- [ ] `useDocumentSave` handles the save.
- [ ] Identity is immutable after save.
- [ ] Edit, duplicate, and convert follow the transformation standard.
- [ ] Business logic stays in `src/domain/`.
- [ ] PDF components remain renderers.

### Regression
- [ ] Invoice behaviour is unchanged.
- [ ] Quotation behaviour is unchanged.
- [ ] RFQ behaviour is unchanged.
- [ ] Waybill behaviour is unchanged.

### Verification
- [ ] `bun run audit:load` passes.
- [ ] `bun run typecheck` passes.
- [ ] `bun run test` passes.
- [ ] `supabase db push` passes.
- [ ] `git diff --check` is clean.

---

## Verification

- `git status` before the audit: recorded. Pre-existing changes were present and were not touched.
- Pre-existing changes at baseline: the Phase 1 BOQ demolition (18 deletions, 5 modifications), the V12 photo transplant (`boq-form-candidate-v12.html`), and prior untracked reports plus the untracked `claude-version.html`.
- Static inspection only. No build, typecheck, lint, test, `audit:load`, database, or Supabase command was run.
- `git diff --check`: passed. Exit code 0. No whitespace errors.
- `git status` after the audit: this report is the only file added by this task.
- Files changed by this task: `docs/reports/boq/boq-quotation-compatibility-audit-2026-09-29.md` only.
- Application source files changed: none. The 18 deletions and 5 modifications in the working tree pre-date this task.
- HTML candidate files changed: none. `boq-form-candidate-v12.html` was already modified before this task.
- Standards changed: none.
- Migrations changed: none.
- Configuration changed: none.

### Concurrent Agent Observation

`AGENTS.md` §2 warns that other agents may work in this repository at the same time. Two
untracked items appeared between the pre-audit baseline and the post-audit check:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/`
- `docs/reports/boq/boq-view-candidate-v1-2026-09-29.md`

This task did not create, modify, or read these items. They belong to another agent. They
were left untouched. A file collision did not occur, because this task touched only its
own report file.

| Check | Result |
| :--- | :--- |
| `bun run build` | Not run. Permanently banned by the hardware policy. |
| `bun run typecheck` | Not run. Excluded by the task. |
| `bun run lint` | Not run. Excluded by the task. |
| `bun run test` | Not run. Excluded by the task. |
| `bun run audit:load` | Not run. Excluded by the task. |
| Database commands | Not run. Excluded by the task. |
| Supabase push | Not applicable. No SQL changed. |
| `frontend-design` skill | Not loaded. Prohibited by the task. |

## Risks or Limitations

- This audit is static. It could not execute the conversion path. Defect D4 is a
  predicted insert error based on schema inspection, not an observed failure.
- The `boq_rows` column list is taken from the migrations. If the hosted database
  diverged, the list could differ. A schema diff would confirm it.
- V12's JavaScript was not treated as production architecture.
- This audit did not verify the settings UI entry for the BOQ prefix.

## Deferred Work

- The four standards updates in Section 16. These are separate tasks.
- Migration M1 and migration M2. Separately authorised tasks with a push.
- The `boq_items` export defect (Risk R12).
- The duplicate row-copy defect (Risk R8).
- Any Cloudinary orphan cleanup.
