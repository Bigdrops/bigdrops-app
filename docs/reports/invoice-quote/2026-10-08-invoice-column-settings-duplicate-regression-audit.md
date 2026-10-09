# Invoice Column Settings Duplicate Regression Audit

**Date:** 2026-10-08  
**Author:** OpenAI Codex  
**Status:** Zero-code audit. No source, test, migration, CSS, hook, component, or database change was made.

## 1. Executive Finding

FACT: Invoice custom columns are real end-to-end features today. A JSON import key such as `custom_fields: { "Part no ": "DT04-2P" }` is flattened, normalized to candidate key `part_no`, converted to a `ColumnConfig`, applied through `setColumns(result.columns)`, rendered by the active form, written to `item.custom_data`, saved to `invoice_items.custom_data`, and reloaded by `mapDbInvoiceItem()`.

FACT: The duplicate-column invariant is incomplete. Current authoritative code deduplicates saved column config by internal `key` only, while the reported defects are user-facing label collisions. Therefore a built-in `unit` column and a custom `custom_unit` column labeled `Unit` can coexist, and two different custom keys can both be labeled `Part no`.

FACT: The current manual Add Custom Column path still protects the narrow default-name case. It scans active labels with `trim().toLowerCase().replace(/\s+/g, ' ')` and creates `New Column`, `New Column 2`, and so on.

FACT: Rename has no uniqueness guard. Column Settings inputs call `onUpdate(col.key, 'label', value)`, and `useInvoiceColumns.updateColumn()` writes the label directly.

FACT: Import no longer presents the historical "create / map / ignore" resolution UI for unknown columns. Commit `4685c902 form 1` removed `getUnknownColumnCandidates`, `validated`, `decisions`, and the unknown-column decision UI from `JsonItemsImportSheet.tsx`, replacing it with automatic create decisions for all unknown candidates. That is the earliest proven historical regression found for import-time duplicate protection.

INFERENCE: The user-observed duplicate `Part no` and `Unit` entries can be produced by rename and/or by persisted/hydrated invalid configuration. Import alone reuses matching existing custom labels by snake-case alias, but import ignores built-in aliases when resolving `custom_fields`, so `custom_fields.Unit` can create a custom `Unit` if no custom `Unit` already exists.

## 2. Scope

This audit inspected the active Invoice column and JSON import paths only. CPS was compared only for parity requirements that should be appended to the concurrent CPS task.

Files inspected include:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/standard/document-column-standard.md`
- `docs/standard/json-import-standard.md`
- `src/components/useInvoiceColumns.tsx`
- `src/components/ColumnManager.tsx`
- `src/components/items/JsonItemsImportSheet.tsx`
- `src/components/document/SharedDocumentForm.tsx`
- `src/components/document/FormLineItems.tsx`
- `src/components/invoice/MobileItemCard.tsx`
- `src/domain/financial/resolveFinancialColumns.ts`
- `src/domain/import/normalize.ts`
- `src/domain/import/resolve.ts`
- `src/domain/import/utils.ts`
- `src/domain/import/apply.ts`
- `src/domain/import/promptGenerator.ts`
- `src/domain/invoice/importAdapter.ts`
- `src/domain/invoice/columns.ts`
- `src/domain/invoice/factories.ts`
- `src/domain/invoice/normalize.ts`
- `src/domain/invoice/types.ts`
- `src/hooks/useInvoiceEditableState.ts`
- `src/hooks/useInvoiceHydration.ts`
- `src/hooks/useInvoiceSave.ts`
- historical git commits `d32e465f`, `4685c902`, `64ba6c8a`, and current history for the same paths

## 3. Current Column Architecture

FACT: The active Invoice form creates column state with `useInvoiceColumns()` in `src/pages/InvoiceFormPage.tsx:174-187`, then passes `columns`, `setColumns`, mutation helpers, and `customColumns` into `SharedDocumentForm` at `src/pages/InvoiceFormPage.tsx:475-485`.

FACT: `SharedDocumentForm` passes `customColumns` into `FormLineItems` at `src/components/document/SharedDocumentForm.tsx:321-327`, opens JSON import with current `columns` at `src/components/document/SharedDocumentForm.tsx:499-507`, and opens `ColumnManager` with the same mutation helpers at `src/components/document/SharedDocumentForm.tsx:515-528`.

FACT: `FormLineItems` passes `customColumns` into `SortableLineItem` and grouped `MobileGroupCard` at `src/components/document/FormLineItems.tsx:269-300`. `MobileItemCard` renders custom fields from `customColumns` and writes values into `item.custom_data[col.key]` at `src/components/invoice/MobileItemCard.tsx:417-435`.

FACT: There is no separate desktop table editor for Invoice line items in this path. The shared form uses the same mobile item card chain in desktop and mobile layouts.

## 4. Column Identity And Normalization

FACT: `ColumnConfig` has `key`, `label`, optional `type`, visibility, removability, and calculation metadata. Row extension values live in `InvoiceItem.custom_data`, a string/number/null map keyed by column key. See `src/domain/invoice/types.ts:10-12`, `src/domain/invoice/types.ts:201-245`, and `src/domain/invoice/types.ts:385`.

FACT: Manual default-name normalization is local to `useInvoiceColumns.normalizeTitle()`: trim, lowercase, collapse whitespace. See `src/components/useInvoiceColumns.tsx:63-64`.

FACT: Import identity uses `toSnakeCase()`: trim, split camel case, replace non-alphanumeric runs with underscores, trim underscores, lowercase. See `src/domain/import/utils.ts:40-47`.

FACT: Import aliases include both `toSnakeCase(column.key)` and `toSnakeCase(column.label)` in `buildColumnAliases()`, but only for columns passed to it. See `src/domain/import/utils.ts:118-128`.

FACT: Saved-column hydration identity is internal key only. `ensureColumnOrderIntegrity()` tracks `seen` keys and keeps the first occurrence of each key. See `src/domain/financial/resolveFinancialColumns.ts:13-39` and `src/domain/financial/resolveFinancialColumns.ts:48-61`.

INFERENCE: The product currently has at least three identity notions: internal key for saved config integrity, normalized display title for manual default-name generation, and snake-case key/label alias for import custom-field reuse. No single authoritative label-collision guard exists.

## 5. Manual Creation Trace

FACT: `ColumnManager` renders the Add Custom Column button and calls `onAddCustom` at `src/components/ColumnManager.tsx:611-619`.

FACT: `useInvoiceColumns.addCustomColumn()` builds `activeTitles` from non-`hide_full` column labels, applies `normalizeTitle()`, then increments from `New Column` to `New Column 2`, `New Column 3`, etc. until no active normalized label matches. It creates a custom key with `custom_` + `Date.now()`. See `src/components/useInvoiceColumns.tsx:114-138`.

FACT: This guard checks all active labels, including built-ins, for the generated default label only. It does not validate a user-supplied label because no user-supplied label enters this function.

Result by class:

- F. Existing `New Column`, Manual Add again: prevented as a duplicate label; the next label becomes `New Column 2`.

## 6. Rename Trace

FACT: Built-in and custom rows expose label inputs. `FixedColumnRow` calls `onUpdate(col.key, 'label', value)` at `src/components/ColumnManager.tsx:153-155`; `CustomColumnRow` does the same at `src/components/ColumnManager.tsx:333-335`.

FACT: `useInvoiceColumns.updateColumn()` maps by matching key and writes `{ ...c, [field]: value }` through `normalizeColumnConfig()`. It does not inspect other column labels, normalized labels, built-in labels, custom labels, or import aliases. See `src/components/useInvoiceColumns.tsx:111-112`.

Confirmed divergence:

- Intended invariant: duplicate/colliding user-facing columns must be prevented across the column lifecycle.
- Actual behavior: rename can make any column label collide with any other label while keeping distinct keys.
- Downstream consequence: Column Settings and form rendering can show two visible columns named `Part no`, or built-in `Unit` and custom `Unit`, because render paths key by `col.key` and display `col.label`.

Result by class:

- C. Existing custom `Part no`, incoming rename `PART NO`: duplicated/ambiguous. Current rename does not compare normalized labels.
- D. Built-in `Unit`, incoming custom rename `Unit`: duplicated/ambiguous. Current rename does not protect built-in labels.

## 7. JSON custom_fields Import Trace

FACT: `JsonItemsImportSheet` generates default decisions for every unknown candidate: `makeDefaultDecision()` returns `{ action: 'create' }`, and `handleApply()` builds decisions from all `validated.data.unknownCandidates`. See `src/components/items/JsonItemsImportSheet.tsx:63-65` and `src/components/items/JsonItemsImportSheet.tsx:162-173`.

FACT: `normalizeImportData()` detects root key collisions but only on the current object passed to `detectCollisions()`. It processes each item with `detectCollisions(item, ...)`, then recursively flattens `custom_fields` entries without running `detectCollisions()` on the nested custom object. See `src/domain/import/normalize.ts:44-67`, `src/domain/import/normalize.ts:86-88`, and `src/domain/import/normalize.ts:131-135`.

FACT: Known base fields include `unit`, so a root-level `"Unit"` maps to base field `unit`. Inside `custom_fields`, `"Unit"` is recursively processed the same way, so it also maps to base field `unit`, not a custom column. See `src/domain/import/normalize.ts:20`, `src/domain/import/normalize.ts:105-110`, and `src/domain/import/normalize.ts:131-135`.

Correction to the risk model:

- `custom_fields.Unit` does not create a custom `Unit` in current code. It is flattened and consumed as the built-in `unit` base field.
- A custom `Unit` can still exist through rename or invalid saved/hydrated config.

FACT: Unknown keys are stored in `extraFields` under `toSnakeCase(rawKey)`, and candidates are keyed the same way. See `src/domain/import/normalize.ts:138-147`.

FACT: `resolveImportColumns()` builds aliases from existing custom columns only, not built-ins. It reuses a custom alias when present; otherwise it creates a new custom column, appends it to `nextColumns`, and updates the alias map for later candidates in the same import. See `src/domain/import/resolve.ts:33-58` and `src/domain/import/resolve.ts:87-97`.

FACT: `makeCustomColumn()` trims the label, derives `custom_<snake_case_label>`, and only suffixes the key when that key already exists. See `src/domain/import/utils.ts:131-155`.

FACT: `buildApplyResult()` writes resolved custom fields into `nextItem.custom_data[key]`. See `src/domain/import/apply.ts:19-35`.

FACT: `invoiceImportAdapter.applyResult()` calls `setColumns(result.columns)` and `setItems(result.items)`. See `src/domain/invoice/importAdapter.ts:17-35`.

Example trace for supplied JSON:

1. `"Part no "` inside `custom_fields` is flattened by `processEntry()`.
2. `toSnakeCase("Part no ")` becomes `part_no`.
3. If no existing custom alias matches `part_no`, `makeCustomColumn("Part no ", ...)` trims the label to `Part no` and creates `key: "custom_part_no"`.
4. The imported value is written as `item.custom_data.custom_part_no = "DT04-2P"`.
5. `setColumns(result.columns)` makes the column visible in the active form.

Result by class:

- A. Existing custom `Part no`, import `Part no`: reused/mapped. Existing custom aliases include label `part_no`.
- B. Existing custom `Part no`, import `Part no `: reused/mapped. `toSnakeCase()` trims whitespace.
- E. Built-in `Unit`, import `custom_fields.Unit`: mapped to built-in `unit`, not custom, because `custom_fields` is flattened before base-field handling.
- G. Two imported items contain the same new `custom_fields` key: reused in one candidate because `candidateMap` is keyed by normalized key.
- H. Imported items contain superficial variants of the same logical field: reused if `toSnakeCase()` produces the same key. Example `Part no`, `Part no `, and `PART NO` collapse to `part_no`. Not determinable for variants that normalize differently.

## 8. Built-In Collision Trace

FACT: Built-in columns are defined with keys and labels in `src/domain/invoice/columns.ts:11-33`. `unit` is built-in and labeled `Unit`.

FACT: Hydration merges built-ins by key only. A saved custom `{ key: "custom_unit", label: "Unit" }` is not considered the same as built-in `{ key: "unit", label: "Unit" }`; it passes as an unknown/custom column. See `src/domain/financial/resolveFinancialColumns.ts:48-61`.

FACT: Manual Add does not create `Unit` directly, but rename can. See the rename trace.

Confirmed defect:

- Observed symptom: custom `Unit` can coexist with built-in `Unit`.
- Authoritative path: `ColumnManager` label input -> `useInvoiceColumns.updateColumn()` -> key-only render/persist.
- Exact divergence: built-in/custom label collision is not enforced.
- Consequence: visible form and prompt generation can expose duplicate `Unit` semantics.

## 9. Custom-to-Custom Collision Trace

FACT: Two custom columns with different keys can have the same label because `updateColumn()` does not compare labels. `resolveFinancialColumns()` also permits this because it deduplicates by key only.

FACT: Import reuses matching existing custom aliases, so import is not the first failure point for `Part no` when an existing custom `Part no` is already present and labels normalize to the same snake key.

Confirmed defect:

- Observed symptom: two `Part no` custom columns can exist.
- First proven failure point: `useInvoiceColumns.updateColumn()` accepts a colliding label.
- Additional persistence failure: `useInvoiceSave` persists `columnConfig: columns` as-is at `src/hooks/useInvoiceSave.ts:246-267`, and hydration only deduplicates by key.

## 10. Why New Column Protection Still Works

FACT: Repeated manual default creation goes through `addCustomColumn()` and only that path contains the active-title loop. It prevents `New Column` duplicates by normalized label before appending. See `src/components/useInvoiceColumns.tsx:114-138`.

INFERENCE: The user sees duplicate protection "still work" for rapid/repeated `New Column` creation because that path is guarded. The rest of the lifecycle is not guarded: rename, saved hydration, and import's automatic create path do not share this label-invariant authority.

## 11. Historical Regression Evidence

FACT: Commit `64ba6c8a feat: implement ColumnManager component and hook for configuring invoice column visibility and ordering` introduced the manual default-name guard. The version at `9609e10f` always appended label `New Column`; the version at `64ba6c8a` introduced `normalizeTitle()` and the `New Column 2` loop.

FACT: Commit `4685c902 form 1` removed the unknown-column review/mapping flow from `JsonItemsImportSheet.tsx`. The diff removes:

- `getUnknownColumnCandidates` import;
- `validated` state;
- `decisions` state;
- `existingCustomColumns`;
- `unresolvedCandidates`;
- the "Handle new JSON keys" UI;
- `handleFinalizeColumnChoices()`;
- create/map/drop selection controls.

It replaces that flow with automatic decisions:

```ts
validated.data.unknownCandidates.map(candidate => [
  candidate.key,
  makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key),
])
```

FACT: The older import UI let the user choose "Create new column", "Map to existing column", or "Ignore column" for each unresolved key. The current UI no longer lets the user map ambiguous unknown keys during import.

Not proven:

- I did not find a historical rename guard that prevented a custom column label from being changed to an existing built-in/custom label.
- I did not find a historical test that enforced built-in/custom label collision rejection.

INFERENCE: The proven regression is import-time loss of user-controlled unknown-column resolution. The rename/built-in collision defect is an existing architectural gap or an unproven historical regression, not a recovered prior guard in the inspected history.

## 12. Copy JSON Prompt Trace

FACT: The Invoice import adapter delegates prompt generation to `generateImportPrompt(columns, mode, 'invoice', currentItemCount)`. See `src/domain/invoice/importAdapter.ts:1-8`.

FACT: `JsonItemsImportSheet` recomputes the active prompt from current `columns`, `mode`, and row count. See `src/components/items/JsonItemsImportSheet.tsx:103-109`.

FACT: `generateImportPrompt()` filters shown columns, excludes calculated fields, emits built-ins at item root, and emits custom columns under `custom_fields` with the label as the JSON key. See `src/domain/import/promptGenerator.ts:19-38` and `src/domain/import/promptGenerator.ts:98-101`.

Consequence:

- The prompt dynamically reflects visible configured custom columns.
- If duplicate custom labels exist, `customSchema[col.label] = "Value"` overwrites earlier same-label entries in the prompt object. The prompt cannot represent two separate `Part no` columns with the same JSON key.

## 13. Persistence And Reload

FACT: Save persists the current column array as `custom_fields.columnConfig` at `src/hooks/useInvoiceSave.ts:246-267`.

FACT: Save converts each invoice item to DB format with `toDbItem()`, which stringifies `item.custom_data || {}`. See `src/domain/invoice/factories.ts:100-128`.

FACT: Persistence sends item payloads through the invoice save RPC path as `p_items`. See `src/hooks/useInvoiceSave.ts:322-352`.

FACT: Reload parses `custom_fields` with `parseCustomFields()` and calls `setColumns(resolveFinancialColumns(parsed.columnConfig as any[]))`. See `src/hooks/useInvoiceHydration.ts:80-92`.

FACT: Reload parses item `custom_data` into `InvoiceItem.custom_data`. See `src/domain/invoice/normalize.ts:291-322`.

Confirmed behavior:

- Row custom values are preserved end to end when keyed by a surviving column key.
- Duplicate labels are also preserved because `columnConfig` is saved as-is and reload deduplicates only by key.

## 14. Root Cause

FACT: Current uniqueness authority is fragmented:

- Manual Add Custom Column has a local default-label guard.
- Rename has no guard.
- Import has snake-case custom-column alias reuse, but no review UI and no shared authority with manual mutations.
- Hydration deduplicates by key only.
- Save persists whatever active state contains.

Root cause:

The system lacks an authoritative column identity/invariant helper that all mutation paths must use. The only authoritative resolver, `resolveFinancialColumns()`, protects key order and duplicate keys, not user-facing normalized labels or built-in/custom label collisions.

## 15. Restoration Plan

Smallest safe restoration boundary:

1. Add shared financial-column normalization/validation helpers in the column domain, not inside `ColumnManager` presentation.
2. Define a canonical label identity function from repository evidence. Recommended starting point: use import `toSnakeCase(label)` for cross-path parity, or explicitly document why `normalizeTitle()` is used instead. Do not silently mix both.
3. Enforce label collision checks for:
   - built-in label versus custom label;
   - custom label versus custom label;
   - case/whitespace/punctuation variants per the selected canonical function.
4. Route `addCustomColumn()`, `updateColumn()`, import-created columns, and hydration through the same helper.
5. Restore import unknown-column review or equivalent non-bypassable mapping behavior in the current `JsonImportLayout` architecture. Do not blindly revert old UI.
6. Add focused tests for rename, built-in collision, import reuse, import built-in field handling, hydration repair, and prompt behavior with duplicate labels.

Keep document-specific behavior separate:

- Shared machinery should own column identity, collision checks, and mutation helpers.
- Invoice-specific code should own invoice prompt shape, item fields, custom_data save/load, and invoice adapter application.

## 16. CPS Concurrent-Task Additions

Append these requirements to the pending CPS repair:

- CPS manual custom-column creation must use the same duplicate/collision authority selected for Invoice.
- CPS Mobile/Fold must render and edit visible custom columns from dynamic config.
- CPS import must support parser-approved `custom_fields` only if it can reuse matching existing custom columns and reject/protect built-in/custom collisions.
- CPS row custom values must live in a durable dynamic structure, not ad hoc built-in properties.
- CPS save/reload must preserve both custom column definitions and row custom values.
- CPS Copy JSON Prompt should dynamically include current visible custom columns under `custom_fields`, matching Invoice's useful behavior.
- CPS must not inherit Invoice's current regression: no automatic duplicate label creation, no rename bypass, no key-only hydration that leaves label duplicates active.

## 17. Explicit Non-Goals

- No source fix was implemented.
- No UI redesign was proposed.
- No database schema change was proposed.
- No browser or production database experiment was run.
- No build, typecheck, lint, audit load, test suite, migration, Docker, or Supabase write was run.
- Do not touch CPS Instant Markup math in this restoration pass.

## 18. Verification

Required pre-report status was run immediately before creating this report:

```text
 D "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/filter-icon-comparison.html"
 D "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/BIGDROPS Cold Launch - Mobile Fold2 - Linear Dark.html"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/AppIcon.icon/"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/README.md"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/appstore.png"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/playstore.png"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/BIGDROPS Cold Launch - Desktop - Linear Dark - Copy.html"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/the final.html"
?? docs/reports/cost-pricing-sheet/2026-10-08-cps-instant-markup-custom-columns-zero-code-audit.md
```

Post-report status after creating this report:

```text
 D "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/filter-icon-comparison.html"
 D "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/BIGDROPS Cold Launch - Mobile Fold2 - Linear Dark.html"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/AppIcon.icon/"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/README.md"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/appstore.png"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/playstore.png"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/BIGDROPS Cold Launch - Desktop - Linear Dark - Copy.html"
?? "docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/the final.html"
?? docs/reports/cost-pricing-sheet/2026-10-08-cps-instant-markup-custom-columns-zero-code-audit.md
?? docs/reports/invoice-quote/2026-10-08-invoice-column-settings-duplicate-regression-audit.md
```

Scoped whitespace check passed:

```bash
git diff --check -- docs/reports/invoice-quote/2026-10-08-invoice-column-settings-duplicate-regression-audit.md
```

Result: no output, exit code 0.

## 19. Exact Files Changed

Created one report:

- `docs/reports/invoice-quote/2026-10-08-invoice-column-settings-duplicate-regression-audit.md`

No application source files were intentionally modified. No tests were intentionally modified. No migrations were intentionally modified.
