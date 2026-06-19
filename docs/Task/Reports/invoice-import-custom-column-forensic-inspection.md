# Invoice Import Custom Column Auto-Creation — Forensic Inspection

**Date:** 2026-06-19
**Scope:** Trace exactly how custom columns are auto-created from imported JSON during Invoice import
**Status:** READ-ONLY — no code changes

---

## Executive Summary

When a user pastes JSON containing `custom_fields` with unknown keys into the Invoice Import sheet, custom columns are auto-created through a deterministic 6-stage pipeline. The mechanism is fully automatic — no user confirmation is required. The pipeline creates a `ColumnConfig` entry for each unknown key, adds it to the column state via `setColumns()`, and populates `item.custom_data` with the corresponding values.

---

## The 6-Stage Pipeline

```
User pastes JSON
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 1: PARSE                                           │
│ File: src/domain/import/parse.ts                         │
│ Function: parseImportText(pastedText, mode)              │
│ Output: ParsedImportRoot (raw JSON object)               │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 2: NORMALIZE                                       │
│ File: src/domain/import/normalize.ts                     │
│ Function: normalizeImportData(parsed.data, mode)         │
│                                                          │
│ Key logic (lines 127-144):                               │
│   - If key === 'custom_fields' && is object:             │
│       recursively processEntry(subKey, subValue)         │
│   - If key NOT in BASE_FIELDS:                           │
│       extraFields[key] = normalizedValue                 │
│       candidateMap.set(key, { labels, values })          │
│                                                          │
│ Output: NormalizedImportData {                            │
│   unknownCandidates: [{ key, sourceLabels, sampleValues, │
│                         inferredType }]                  │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 3: VALIDATE                                        │
│ File: src/domain/import/validate.ts                      │
│ Function: validateImportData(mode, normalized, items)    │
│ Output: ValidatedImportData (passes unknownCandidates    │
│         through + adds validation issues)                │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 4: DECIDE                                          │
│ File: src/components/items/JsonItemsImportSheet.tsx      │
│ Lines: 162-167                                           │
│                                                          │
│ decisions = Object.fromEntries(                          │
│   validated.data.unknownCandidates.map(candidate => [    │
│     candidate.key,                                       │
│     { action: 'create', label: candidate.sourceLabels   │
│       [0] || candidate.key }                             │
│   ])                                                     │
│ )                                                        │
│                                                          │
│ NOTE: Every unknown candidate gets action: 'create'.     │
│ There is NO user prompt or confirmation dialog.          │
│ The `makeDefaultDecision()` function (line 63-65)        │
│ always returns { action: 'create' }.                     │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 5: RESOLVE                                         │
│ File: src/domain/import/resolve.ts                       │
│ Function: resolveImportColumns({ validated,              │
│           existingColumns, decisions })                   │
│                                                          │
│ For each candidate with action === 'create':             │
│   1. makeCustomColumn(label, nextColumns, inferredType)  │
│      → Returns ColumnConfig { key: 'custom_part_no',    │
│        label: 'Part no', type: 'text', visible: true,   │
│        removable: true, includeInTotal: false }          │
│   2. nextColumns.push(column)                            │
│   3. createdColumns.push(column)                         │
│   4. For each item with this key in extraFields:         │
│      resolvedItems[index].customFields[columnKey] = val  │
│                                                          │
│ Output: ResolvedImportData {                             │
│   columns: [...existingColumns, ...newCustomColumns],    │
│   createdColumns: [newCustomColumns],                    │
│   items: [{ baseFields, customFields }]                  │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 6a: BUILD APPLY RESULT                             │
│ File: src/domain/import/apply.ts                         │
│ Function: buildApplyResult({ resolved, existingColumns })│
│                                                          │
│ Returns: ApplyImportResult {                             │
│   columns: resolved.columns.length                       │
│     ? resolved.columns     ← new columns go here         │
│     : existingColumns,                                   │
│   items: [...existingItems, ...importedItems],           │
│   createdColumns: resolved.createdColumns                │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 6b: APPLY TO STATE                                 │
│ File: src/components/items/JsonItemsImportSheet.tsx      │
│ Function: onApplyImport(result) → handleImportApply      │
│ File: src/pages/NewInvoice.tsx (line 452-464)            │
│                                                          │
│ invoiceImportAdapter.applyResult({                       │
│   result,                                                │
│   setColumns,  ← called with result.columns              │
│   setItems,    ← called with result.items                │
│   ...                                                     │
│ })                                                       │
│                                                          │
│ File: src/domain/invoice/importAdapter.ts (line 25)      │
│   setColumns(result.columns)  ← FINAL STATE UPDATE      │
│                                                          │
│ Form re-renders with new columns visible.                │
│ Items have custom_data populated with imported values.   │
└──────────────────────────────────────────────────────────┘
```

---

## Concrete Example: "Part no" Auto-Creation

**Input JSON:**
```json
{
  "items": [{
    "description": "Filter Element",
    "quantity": 10,
    "custom_fields": {
      "Part no": "FLT-101"
    }
  }]
}
```

**Stage 2 — Normalize** (`normalize.ts:127-144`):
- `processEntry('custom_fields', { "Part no": "FLT-101" })` — detected as object, recurse
- `processEntry('Part no', 'FLT-101')` — not in `BASE_FIELDS`, goes to `extraFields`
- `candidateMap.set('part_no', { labels: Set{"Part no"}, values: ["FLT-101"] })`
- `unknownCandidates = [{ key: "part_no", sourceLabels: ["Part no"], sampleValues: ["FLT-101"], inferredType: "text" }]`

**Stage 4 — Decide** (`JsonItemsImportSheet.tsx:162-167`):
- `decisions = { "part_no": { action: "create", label: "Part no" } }`

**Stage 5 — Resolve** (`resolve.ts:87-97`):
- `makeCustomColumn("Part no", existingColumns, "text")` returns:
  ```ts
  {
    key: "custom_part_no",
    label: "Part no",
    type: "text",
    visible: true,
    removable: true,
    includeInTotal: false
  }
  ```
- `nextColumns = [...builtinColumns, newCustomColumn]`
- `resolvedItems[0].customFields["custom_part_no"] = "FLT-101"`

**Stage 6a — Build Apply Result** (`apply.ts:236`):
- `columns: resolved.columns` (contains the new custom column)
- `items[0].custom_data = { "custom_part_no": "FLT-101" }`

**Stage 6b — Apply to State** (`importAdapter.ts:25`):
- `setColumns(result.columns)` — React state updates
- Form re-renders — "Part no" column appears in the table header
- `items[0].custom_data.custom_part_no` = "FLT-101" — value appears in the cell

---

## Key Code Locations

| Question | File | Line(s) | Answer |
|---|---|---|---|
| Q1: Where is `custom_fields` recursively flattened? | `src/domain/import/normalize.ts` | 127-132 | `processEntry` detects `custom_fields` as object and recurses into sub-keys |
| Q2: Where are unknown keys collected as column candidates? | `src/domain/import/normalize.ts` | 134-144 | Keys not in `BASE_FIELDS` go to `candidateMap` → `unknownCandidates` |
| Q3: Where is the column creation decision made? | `src/components/items/JsonItemsImportSheet.tsx` | 63-65, 162-167 | `makeDefaultDecision()` always returns `{ action: 'create' }` |
| Q4: Where is the `ColumnConfig` object constructed? | `src/domain/import/utils.ts` | 131-155 | `makeCustomColumn()` builds `ColumnConfig` with `custom_` prefixed key |
| Q5: Where is the new column appended to the column list? | `src/domain/import/resolve.ts` | 92 | `nextColumns.push(column)` |
| Q6: Where is `setColumns()` called with the new list? | `src/domain/invoice/importAdapter.ts` | 25 | `setColumns(result.columns)` |
| Q7: Where is `item.custom_data` populated with the value? | `src/domain/import/apply.ts` | 65-72 | `assignResolvedFields()` writes `customFields[key]` into `item.custom_data` |
| Q8: Does `mergeColumnConfigs` get called during import? | `src/domain/invoice/columns.ts` | 88-111 | **NO** — import overwrites columns directly, `mergeColumnConfigs` is NOT used in the import pipeline |

---

## Critical Findings

### 1. No Merge — Direct Overwrite

The import pipeline does NOT call `mergeColumnConfigs()`. It constructs a new column array in `resolveImportColumns` (starting from `existingColumns.map(c => ({...c}))` at line 34) and returns it as `resolved.columns`. The `buildApplyResult` function returns `resolved.columns` directly (lines 123, 236, 263). The import adapter calls `setColumns(result.columns)` which **replaces** the entire column state.

This means:
- Existing custom columns are preserved (they're in `existingColumns` which is passed through)
- New custom columns are appended
- But column order/visibility of existing columns is taken from whatever was in `existingColumns` at import time

### 2. No User Confirmation for Column Creation

The `makeDefaultDecision` function (`JsonItemsImportSheet.tsx:63-65`) always returns `{ action: 'create' }` for every unknown candidate. There is no dialog, no review step, no confirmation. The user sees the result only after "Apply to Document" is clicked.

### 3. `custom_fields` Is Transparently Flattened

The `custom_fields` wrapper in the JSON is purely a prompt convention — it's flattened during normalize. Whether the AI returns `{ "custom_fields": { "Part no": "FLT-101" } }` or `{ "Part no": "FLT-101" }` at item root, the result is identical: both become an unknown candidate with key `part_no`.

### 4. Column Key Derivation

`makeCustomColumn` (`utils.ts:131-155`):
- `key = 'custom_' + toSnakeCase(label)` → e.g., `custom_part_no`
- If key collides with existing, appends `_2`, `_3`, etc.
- `MAX_NEW_COLUMNS = 10` per import (line 5, enforced at `resolve.ts:80-84`)

### 5. Visibility Mode of Created Columns

Created columns get `visible: true` in `makeCustomColumn`. They are NOT passed through `normalizeColumnConfig()` in the resolve step — the `normalizeColumnConfig` call in `resolve.ts:103` only runs on the final column if it's already in `nextColumns`. For newly created columns, the `normalizeColumnConfig` call at the hook level (`useInvoiceColumns.tsx:51`) happens on initialization only, not on each `setColumns` call.

However, `buildApplyResult` doesn't call `normalizeColumnConfig` on the returned columns. This means newly created columns from import may lack `visibilityMode` — they'll have `visible: true` but `visibilityMode` undefined. The `isVisible()` function in `useInvoiceColumns.tsx:56-59` falls back to `'show'` when `visibilityMode` is undefined, so they appear visible.

### 6. Prompt Instructs AI to Use `custom_fields` Sub-Object

`generateImportPrompt` (`promptGenerator.ts:29-38`):
```ts
visibleColumns.forEach(col => {
  if (col.key.startsWith('custom_')) {
    customSchema[col.label || col.key] = "Value"  // → goes into custom_fields
  } else {
    itemSchema[col.key] = col.label || col.key     // → goes into item root
  }
})
```

Line 102: `- Use these keys inside "custom_fields": ${Object.keys(customSchema).join(', ')}`

This means the AI is instructed to place custom column values inside `custom_fields`, but the normalizer handles both locations (root and nested) identically.

---

## Data Flow Summary

```
JSON { items: [{ custom_fields: { "Part no": "FLT-101" } }] }
  │
  ▼ parseImportText()
ParsedImportRoot { items: [{ custom_fields: { "Part no": "FLT-101" } }] }
  │
  ▼ normalizeImportData()
NormalizedImportData {
  unknownCandidates: [{ key: "part_no", sourceLabels: ["Part no"] }],
  items: [{ extraFields: { "part_no": "FLT-101" } }]
}
  │
  ▼ validateImportData()
ValidatedImportData { unknownCandidates: [...], items: [...] }
  │
  ▼ makeDefaultDecision() × N
decisions: { "part_no": { action: "create", label: "Part no" } }
  │
  ▼ resolveImportColumns()
ResolvedImportData {
  columns: [...builtins, { key: "custom_part_no", label: "Part no", visible: true }],
  createdColumns: [{ key: "custom_part_no", label: "Part no" }],
  items: [{ customFields: { "custom_part_no": "FLT-101" } }]
}
  │
  ▼ buildApplyResult()
ApplyImportResult {
  columns: [...builtins, { key: "custom_part_no", ... }],
  items: [{ custom_data: { "custom_part_no": "FLT-101" } }]
}
  │
  ▼ invoiceImportAdapter.applyResult()
setColumns(result.columns)  →  React state update  →  Form re-render
setItems(result.items)      →  React state update  →  Form re-render
```

---

## Implications

1. **Column creation is automatic and irreversible within the session** — once applied, the user would need to manually hide/remove the column
2. **No column merging** — import replaces the entire column array, but existing columns are carried forward from `existingColumns`
3. **`custom_fields` JSON key is a prompt convention only** — the normalizer flattens it transparently
4. **Created columns have `visibilityMode` undefined** — they rely on the fallback `=== 'show'` check in `isVisible()`
5. **MAX_NEW_COLUMNS = 10** per import — enforced in `resolveImportColumns`
6. **Duplicate detection** — `buildColumnAliases` checks if a column with matching snake_case key or label already exists; if so, the candidate is filtered out in `getUnknownColumnCandidates` (`resolve.ts:16-22`)
