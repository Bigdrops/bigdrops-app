# Cost & Pricing Sheet Import Contract Restoration Report

This report was written by Buffy on 2026-09-30 via Freebuff.

## Objective

Restore the authoritative Cost & Pricing Sheet (CPS) JSON extraction contract.

Correct the earlier regression at the CPS JSON import boundary only.

Preserve all valid post-Longcat CPS work.

## Scope

This task changed one domain adapter and one focused test file.

This task did not create a migration. This task did not change the database.

This task did not change the Client Picker, Add Client, Cloudinary, calculations, Instant Markup, persistence, or the Form and View presentations.

This task did not edit accepted candidate HTML files.

This task did not perform a repository-wide BOQ to CPS rename.

Skills used: karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Forensic audit performed before editing

- Current CPS import adapter: `src/domain/boq/importAdapter.ts`
- Current CPS import tests: `src/tests/critical/boqImportView.test.js` and `boqNormalize.test.js`
- Shared import prompt/schema generation: `src/domain/import/promptGenerator.ts` and `src/domain/import/types.ts`
- Invoice importer structural protocol: `src/domain/invoice/importAdapter.ts` and `src/domain/quotation/importAdapter.ts`
- CPS active column logic: `BOQ_COLUMNS`, `BOQ_BUILTIN_COLUMNS`, and the live Columns manager state
- CPS Client Picker integration: `src/components/ClientSelector.tsx` and `src/components/cps/CostPricingSheetEditor.tsx`
- Cloudinary photo path: `src/lib/itemPhotoUpload.ts` and `src/components/cps/CostPricingSheetFormPresentations.tsx`
- CPS persistence: `src/domain/boq/normalize.ts` and `src/hooks/useBoqSave.ts`

Regression identified: the previous session had restored an older committed adapter. That adapter used `unit_price` for SP, accepted `cp`/`sp`/`id`/`gid`, imported `site`, `client_name`, `vendor_name`, `vendor_contact`, `image_url`, and `custom_fields`, created columns through `ensureBoqCustomColumns`, generated group ids as `group_<sourceId>`, and reassembled rows group-by-group, which reordered items.

## 1. Exact final canonical CPS extraction schema

```json
{
  "title": "string | null",
  "groups": [
    { "id": "string", "name": "string", "itemIds": ["string"] }
  ],
  "items": [
    {
      "temp_ref": "string | null",
      "group_id": "string | null",
      "description": "string | null",
      "sub_description": "string | null",
      "make": "string | null",
      "quantity": "number | null",
      "unit": "string | null",
      "cost_price": "number | null",
      "selling_price": "number | null",
      "notes": "string | null"
    }
  ]
}
```

`groups` is optional. `items` is required. The schema is strict.

## 2. Fields removed from the previous contract

Top-level fields removed: `site`, `client_name`, `vendor_name`, `vendor_contact`.

Item fields removed: `id`, `gid`, `specification`, `make_brand`, `qty`, `cp`, `sp`, `unit_price`, `image_url`, `custom_fields`.

Removed behaviors: the `custom_fields` to `custom_data` import path; the `ensureBoqCustomColumns` side effect; client import and client overwrite; Site / Project import; photo import; `group_<sourceId>` identity generation; grouped row reassembly that reordered items.

## 3. Exact price mapping

| JSON key | CPS field | Meaning |
|---|---|---|
| `cost_price` | `row.cp` | CP, money out |
| `selling_price` | `row.sp` | SP, money in |

The two keys are disjoint. No key maps to both sides. `unit_price` is not accepted. The prompt states the rule and states that neither price may be copied into the other.

## 4. Exact grp_N / item_N behavior

- A group at source index `i` receives the import identity `grp_{i+1}`. The first group is `grp_1`.
- The group row stores this identity in `group_id` and `_uiKey`.
- Membership is resolved by `items[].group_id` against the group reference, or by `groups[].itemIds` against the item `temp_ref`.
- No source or database identifier becomes a CPS relationship identity. A group with a source id such as `S1` still becomes `grp_1`.
- `group_<sourceId>` is not generated.

## 5. Exact grouped ordering behavior

The import preserves global source item order. A group header is emitted immediately before the first item that belongs to it. A group with no members is emitted after the items.

Example. Source order A to grp_1, B to grp_2, C to grp_1, D to grp_2 produces items A, B, C, D. The import never produces A, C, B, D. Group membership lives in `group_id` and is not a reason to reorder items.

## 6. Exact ungrouped behavior

When the source has no explicit groups, the import emits no group row. The import does not manufacture a default group and does not create an "Items" group. Items keep source order and their `group_id` is null. The extraction prompt states "Do not create a default group".

## 7. How active table-column configuration gates import

`getVisibleColumnKeys(current)` builds the active key set. The baseline is `current.table_columns`. The live Columns manager configuration (`custom_fields.columnConfig`) can only deactivate a key.

- `description` gates `row.description` and `row.specification` (Sub Description follows Description).
- `make_brand` gates `row.make_brand`.
- `quantity` gates `row.quantity`.
- `unit` gates `row.unit`.
- `cp` gates `row.cp`.
- `sp` gates `row.sp`.
- `notes` is always imported because it is not a column.

## 8. No custom_fields catch-all

Confirmed. The schema has no `custom_fields` key. The adapter has no `custom_fields` to `custom_data` path. The adapter does not import or call `ensureBoqCustomColumns`. Unknown fields are rejected by the strict schema. The adapter returns `{ ...current, title, table_rows }`, so `custom_fields.columnConfig` is never modified.

## 9. Import cannot modify client selection

Confirmed. The schema has no `client_name` and no `vendor_name`. The adapter does not read or write `vendor_name`, `custom_fields.client_id`, or `custom_fields.client_snapshot`. An import on a document with a selected client leaves the client relationship unchanged. An import on a document with no client leaves the Client Picker empty.

## 10. Import cannot modify Site / Project

Confirmed. The schema has no `site`. The adapter does not read or write `vendor_contact`. Site / Project remains a live CPS Form field and is unchanged by import.

## 11. Import cannot assign photos

Confirmed. The schema has no `image_url`. The adapter does not read or write `row.image_url`. Imported rows carry no photo. The manual Cloudinary upload, replace, and remove workflow is untouched.

## 12. Legacy aliases retained

None.

No legacy alias remained. Repository evidence shows no supported historical CPS JSON import compatibility contract:

- The shared import pipeline (`src/domain/import/types.ts`) uses `unit_price` and has no CPS `selling_price`.
- `src/utils/exportSchemas.ts` and `exportCompilers.ts` emit tabular exports (`boq_number`, `client_name`, `total_amount`) and are not parsed by `boqImportSchema`.
- No persisted or exported CPS JSON payload is re-imported by the CPS adapter.

Because no concrete compatibility requirement exists, all aliases were removed. The strict schema now rejects them. The extraction prompt does not advertise them.

## 13. Tests added and changed

`src/tests/critical/boqImportView.test.js` was rewritten to encode the authoritative contract. Useful unrelated CPS tests were kept: photo metadata round trip, View totals and numbering, and row economics.

Proofs added:

1. `cost_price` maps only to CPS `cp`.
2. `selling_price` maps only to CPS `sp`.
3. `cost_price` and `selling_price` never copy into each other.
4. The canonical schema rejects non-canonical extraction fields (`unit_price`, `cp`, `sp`, `id`, `gid`, `image_url`, `custom_fields`, `specification`, `qty`, `make_brand`, `site`, `client_name`, `vendor_name`, `vendor_contact`, and an arbitrary key).
5. Client fields cannot assign or overwrite the selected CPS client.
6. Importing before a client is selected leaves the Client Picker empty.
7. `site` is not imported into Site / Project.
8. `image_url` does not create or replace an item photo.
9. `custom_fields` are not ingested into CPS row custom data.
10. Explicit source groups produce deterministic `grp_1`, `grp_2` and `item_N` references.
11. Source or database identifiers do not determine synthetic relationship ids.
12. An ungrouped source does not infer or manufacture a group.
13. Global item order survives grouped import unchanged.
14. Inactive CPS columns are not populated through import.
15. The live column configuration also gates import.
16. Unknown fields do not create CPS custom columns.
17. Calculated values are not accepted as imported financial truth.
18. Photo metadata still round-trips through persistence.
19. View data uses authoritative totals and continuous numbering.
20. Row TCP, TSP, Profit, and Margin stay authoritative.

## 14. Exact files changed

- `src/domain/boq/importAdapter.ts`
- `src/tests/critical/boqImportView.test.js`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-cps-import-contract-restoration-report-2026-09-30.md`

No other file was modified by this task. Pre-existing working-tree changes were left untouched.

## 15. No regression confirmation

Confirmed not regressed by this task:

- `src/components/cps/` production naming is unchanged. No candidate revision name returned.
- `CostPricingSheetEditor`, `CostPricingSheetFormPresentations`, and `CostPricingSheetViewPresentations` are unchanged.
- The CPS Client Picker and Add New Client reuse `ClientSelector` and `ClientForm`. They are unchanged.
- CPS client persistence (`custom_fields.client_id`, `custom_fields.client_snapshot`, `vendor_name`) is unchanged. The adapter no longer touches it.
- Site / Project live-form behavior is unchanged.
- Keyboard-safety CSS and the phone Save FAB behavior are unchanged.
- Instant Markup is unchanged. All nine Instant Markup tests pass.
- TCP, TSP, Profit, and Margin row economics are unchanged. `computeBoqTotals`, `computeBoqRowEconomics`, `computeRowProfit` delegation, and `computeBoqCommercialView` are unchanged.
- Cloudinary manual photo upload is unchanged.
- The CPS Form and View presentations are unchanged.
- The create, edit, save, view lifecycle is unchanged.
- `useDocumentSave` integration and normalization are unchanged.

## Verification result

```
Verification:
- bun run audit:load: not run (no query, schema, or data-layer change)
- bun run typecheck: passed
- focused CPS tests: passed (34/34)
  - boqImportView.test.js: 20 tests
  - boqNormalize.test.js: 5 tests
  - boqInstantMarkup.test.js: 9 tests
- full test suite: 520/525 passed, 5 pre-existing environment failures
- git diff --check: passed
- git status: captured
- supabase db push: not applicable
- bun run build: skipped due to hardware policy
```

The 5 failures are pre-existing and unrelated. They fail before this task because `src/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL`, which is undefined in the node test runner:

- `invoiceAccountingIntegration.test.js`
- `paymentAccountingIntegration.test.js`
- `remediationContract.test.js`
- `sourceTransactionContract.test.js`
- `itemCleanupExportImport.test.js` (one assertion)

## Supabase push status

Supabase push status: not applicable.

No migration was created. No SQL changed.

## Risks or limitations

- The extraction prompt is a static string in the adapter. It lists the canonical fields and states that the app applies the active column configuration. It does not enumerate the currently active columns dynamically. The apply step is the authoritative gate.
- The CPS presentation groups rows by adjacency. An import that preserves global item order can therefore place a non-contiguous group member under a different group header. The task defines grouped visual assembly as downstream UI behavior.
- The strict schema rejects payloads that contain removed keys. The prompt does not request those keys, so a compliant extractor does not produce them.

## Deferred work

- Human test of the full loop: New, select or add client, JSON Import, inspect CP and SP, edit, photo, Instant Markup, Save, View, Edit, Save, View.
- A future task can move the CPS adapter onto the shared import pipeline by adding `cp` and `sp` to `ImportFieldKey`.
- A future task can migrate the CPS presentation from adjacency grouping to `group_id` membership.
