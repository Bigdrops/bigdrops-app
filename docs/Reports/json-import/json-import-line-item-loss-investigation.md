# JSON Import Line-Item Loss Investigation

> **Status:** READ-ONLY investigation complete  
> **Date:** 2026-06-28  
> **Scope:** Where imported JSON line items disappear between successful editor import and Preview/PDF rendering

---

## Executive Summary

Imported JSON line items survive the full import pipeline (parse → validate → resolve → apply) and appear in the editor, but are lost before Preview/PDF generation. The root cause is a **filter at save time** that silently drops standard items whose `description` is empty or whitespace-only after trim. This filter runs identically across `EditInvoice.tsx`, `NewInvoice.tsx`, and `QuotationForm.tsx`. A secondary risk exists in `buildApplyResult` where clustered groups are stripped, flattening all items and discarding group structure.

**Candidate causes ranked by probability:**

| Rank | Location | Risk | Severity |
|------|----------|------|----------|
| 1 | `EditInvoice.tsx:623-625` / `NewInvoice.tsx:648-650` / `QuotationForm.tsx:523-525` | Save filter drops items with empty/whitespace `description` | **HIGH** |
| 2 | `apply.ts:94-131` (`hasScatteredGroups` branch) | Clustered groups silently stripped, all items flattened | **HIGH** |
| 3 | `validate.ts:23-32` | Items with empty `description` skipped in Add mode (should prevent items reaching editor, but may not catch all edge cases) | **MEDIUM** |
| 4 | `importAdapter.ts:35-37` | `setGroups` never called when result has no groups — stale groups persist | **LOW** |

---

## 1. Complete Data Flow Trace

### Import Pipeline
```
JSON parse (parse.ts)
  → Zod schema validation (schema.ts)
  → Row normalization: group_id, temp_ref, extra fields (normalize.ts)
  → Validation: description-required filter for Add mode (validate.ts)
  → Column resolution: custom column creation (resolve.ts)
  → Apply: build final items+groups (apply.ts)
  → Adapter: setItems(), setGroups(), setColumns() (importAdapter.ts)
```

### Save Pipeline
```
Editor state (items[], groups[], columns[])
  → Validation: at least one item with description (EditInvoice:499-510)
  → Save filter: drop empty-description items (EditInvoice:623-625)
  → Map to DB shape: toDbItem() (factories.ts:91-110)
  → DELETE all existing items (EditInvoice:627)
  → INSERT filtered items (EditInvoice:628-650)
```

### Load Pipeline (Edit / View)
```
DB query: invoice_items WHERE invoice_id = ? ORDER BY sort_order
  → mapDbInvoiceItem() per row (normalize.ts:264-295)
  → syncGroupsFromItems() from group_header rows (normalize.ts:28-52)
  → State: setItems(), setGroups()
```

### Preview Pipeline
```
Items from editor state
  → buildInvoicePreviewModel() (previewModel.ts:66-126)
  → buildInvoicePreviewItems() (previewModel.ts:170-238)
  → adaptCommercialDocumentData() — group_header → isGroupHeader rows
  → PreviewItem[] for rendering
```

---

## 2. Candidate Cause #1: Save Filter (HIGH)

### Evidence

**`src/pages/EditInvoice.tsx:623-625`** (identical in `NewInvoice.tsx:648-650` and `QuotationForm.tsx:523-525`):

```typescript
const itemsToSave = items
  .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
  .map((item, index) => toDbItem(item, id, index))
```

**Filter logic:**
- `group_header` items: kept if `group_name?.trim()` is truthy
- Standard items: kept if `description?.trim()` is truthy

**Any standard item where `description` is `undefined`, `null`, empty string `""`, or whitespace-only (e.g., `"  "`) is silently dropped from the DB save.** No error message is shown. The item simply never reaches the database.

### Why This Is Probable

1. The validation at `EditInvoice.tsx:499-510` checks that at least one item has a description, but does NOT check that ALL items have descriptions — it only validates that `hasMeaningfulItem` is true and that no standard item lacks a description. If the validation passes but an item's description becomes empty between validation and save (or if the validation logic differs from the save filter), items can slip through.

2. The `validate.ts:23-32` Add-mode filter also skips items with empty `description`. However, this runs during import, not at save time. If items are added via other means (manual entry, duplication, or a bug in the import adapter), they could have empty descriptions.

3. The `toDbItem()` function in `factories.ts:91-110` does NOT validate description — it passes whatever value exists. The DB column `invoice_items.description text NOT NULL` would reject the INSERT entirely (not silently drop one item), causing a total save failure.

### Risk Scenario

If a user imports JSON where the AI returns items with whitespace-only descriptions (e.g., `"description": "  "`), those items:
1. Pass `validate.ts` (non-empty after raw check, before trim)
2. Appear in editor (description is `"  "`)
3. Are dropped by save filter (`.trim()` → `""` → falsy)
4. Never reach DB
5. On next load/preview, they're gone

---

## 3. Candidate Cause #2: Clustered Groups Stripped (HIGH)

### Evidence

**`src/domain/import/apply.ts:94-131`:**

```typescript
const scattered = hasScatteredGroups(resolved.items, groups)
if (!scattered && groups.length > 0) {
  // ALL groups stripped, ALL items become ungrouped
  resolved.items.forEach((item) => {
    importedItems.push({
      ...assignResolvedFields({ ...createItem(), row_type: 'standard', group_id: null, group_name: '' }, item, exemptSet),
      row_type: 'standard' as const,
      group_id: null,
      group_name: '',
    })
  })
  return {
    items: [...existingItems, ...importedItems],
    groups: [],  // <-- groups silently dropped
  }
}
```

**`hasScatteredGroups` function** (defined in `apply.ts`): Returns `false` when all `group_header` items appear at the start of the items array (clustered), rather than interleaved with standard items (scattered).

### Why This Is Probable

1. If the AI generates JSON with groups listed first, followed by items (a natural data structure), `hasScatteredGroups` returns `false`.
2. All groups are stripped: `group_id` becomes `null`, `group_name` becomes `""`.
3. Group headers are removed from the items array entirely.
4. The returned `groups: []` means `setGroups([])` is called.
5. Items still exist in the editor, but WITHOUT group assignments.
6. If the user's workflow depends on groups (e.g., group headers appear in preview), the groups vanish silently.

### Note

This does NOT cause item loss — items are still present, just ungrouped. However, if the user interprets "groups disappeared" as "items disappeared", this could be the reported issue.

---

## 4. Candidate Cause #3: Validation Gap (MEDIUM)

### Evidence

**`src/domain/import/validate.ts:23-32`** (Add mode):

```typescript
for (const item of normalized.items) {
  const description = String(item.baseFields.description || '').trim()
  if (!description) {
    skippedRows.push({ sourceIndex: item.sourceIndex, message: 'Description is required.' })
    continue
  }
  validItems.push(item)
}
```

**`src/pages/EditInvoice.tsx:507`:**

```typescript
if (standardItems.some((item) => !item.description?.trim())) {
  feedback.error('Validation Error', { description: 'Each item needs a description' })
  return
}
```

### Analysis

Both the import validation and the save validation check for empty descriptions. The import validation skips items silently (adds to `skippedRows`). The save validation shows an error and blocks the save.

**Gap:** If an item passes import validation but its description is later cleared (e.g., by a UI bug, React state mutation, or concurrent edit), the save filter drops it without feedback.

---

## 5. Candidate Cause #4: Group Stale State (LOW)

### Evidence

**`src/domain/invoice/importAdapter.ts:35-37`:**

```typescript
if (result.groups && result.groups.length > 0) {
  setGroups(result.groups.map((g) => ({ ...makeEmptyGroup(g.name), id: g.id, showSubtotal: g.showSubtotal ?? false })))
}
```

`setGroups()` is only called when `result.groups` is non-empty. If a previous import set groups and a new import returns `groups: []`, the old groups persist in state but become orphaned (no items reference them). This is a state inconsistency, not an item-loss vector.

---

## 6. DB Schema Findings

### `invoice_items` Table (`20260520090003_invoices.sql:48-73`)

| Column | Type | NOT NULL | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | YES | `gen_random_uuid()` | Primary key |
| `description` | text | **YES** | — | **Only hard constraint that can reject items** |
| `row_type` | text | no | — | No CHECK constraint, no default |
| `group_id` | text | no | — | No FK, free-text |
| `custom_data` | jsonb | no | `'{}'::jsonb` | Nullable (unlike quotation_items) |
| `invoice_id` | uuid | no | `gen_random_uuid()` | **NO foreign key to invoices table** |
| `item_id` | uuid | no | — | FK to `item_catalog(id)` |

### `quotation_items` Table (`20260520090002_quotations.sql:42-68`)

| Column | Type | NOT NULL | Default | Notes |
|--------|------|----------|---------|-------|
| `description` | text | **no** | — | Nullable (unlike invoice_items!) |
| `row_type` | text | **YES** | `'standard'` | No CHECK constraint |
| `custom_data` | jsonb | **YES** | `'{}'::jsonb` | NOT NULL |
| `created_at` | timestamptz | **YES** | `now()` | Present (unlike invoice_items) |
| `updated_at` | timestamptz | **YES** | `now()` | Has trigger |

### Schema Asymmetry Issues

1. `invoice_items.description` is `NOT NULL` → INSERT with empty description fails entirely (not silently dropped)
2. `invoice_items` has **no `created_at` column** → `mapDbInvoiceItem` always gets `null` for `created_at`
3. `invoice_items.invoice_id` has **no foreign key** → orphaned items possible
4. Neither table has CHECK constraints on `row_type` or `group_id`
5. No ON DELETE CASCADE on any FK → deleting parent doesn't clean up children

---

## 7. `toDbItem()` Transform (`factories.ts:91-110`)

```typescript
export function toDbItem(item: InvoiceItem, invoiceId: string | null | undefined, sortOrder: number) {
  const { install_rate_override, _uiKey, id: _id, created_at: _ca, updated_at: _ua, ...rest } = item
  return {
    ...rest,
    invoice_id: invoiceId,
    item_id: item.item_id ?? null,
    sort_order: sortOrder,
    amount: Number(item.quantity || 1) * Number(item.unit_price || 0),
    custom_data: JSON.stringify(item.custom_data || {}),
    install_rate: item.install_rate ?? null,
    install_rate_override: item.install_rate_override === true,
    vat_rate: item.vat_rate ?? null,
    discount_rate: item.discount_rate ?? null,
    image_url: resolveCanonicalItemImageUrl(item),
  }
}
```

**Fields stripped:** `_uiKey`, `id`, `created_at`, `updated_at`, `install_rate_override` (re-set as boolean)  
**Fields recomputed:** `amount` (qty × unit_price), `custom_data` (JSON-stringified)  
**Fields passed through:** `description`, `row_type`, `group_id`, `group_name`, all numeric rates

---

## 8. `mapDbInvoiceItem()` Transform (`normalize.ts:264-295`)

```typescript
export function mapDbInvoiceItem(row: DbInvoiceItem): InvoiceItem {
  return {
    ...row,
    id: row.id ?? null,
    description: row.description || '',
    row_type: row.row_type === 'group_header' ? 'group_header' : 'standard',
    group_id: row.group_id ?? null,
    group_name: row.group_name || '',
    custom_data: parseCustomData(row.custom_data),
    install_rate_override: installRate !== null && installRate !== 0,
    // ... other fields
  }
}
```

**Key:** `row_type` is preserved exactly — `'group_header'` stays `'group_header'`, everything else becomes `'standard'`. `custom_data` is parsed from JSON string.

---

## 9. Preview Pipeline Analysis

### `buildInvoicePreviewItems` (`previewModel.ts:170-238`)

```typescript
sourceItems.map((item, index) => ({
  rowType: item.row_type === 'group_header' ? 'group_header' : 'line',
  groupLabel: item.group_name || null,
  cells: item.row_type === 'group_header' ? undefined : buildPdfRowCells(...),
  // ...
}))
```

**`group_header` items are NOT filtered out.** They are mapped with `rowType: 'group_header'` and `cells: undefined`, then passed to `adaptCommercialDocumentData` which renders them as group divider rows. This is correct behavior.

### `buildPdfRenderPayload` (`buildPdfRenderPayload.ts:3-29`)

```typescript
items: Object.freeze(invoice.items ?? []),
```

**No filtering at all** — items are frozen as-is and passed through.

---

## 10. Recommendations for Next Steps

To confirm the root cause, the following verification is needed:

1. **Reproduce the save filter issue:** Import JSON with an item that has whitespace-only `description`. Verify it appears in editor. Save. Reload. Confirm it's gone.

2. **Check `hasScatteredGroups` behavior:** Import JSON with groups listed first, then items. Verify groups are stripped. Check editor state.

3. **Add logging before save filter:** Temporarily log the items array before and after the filter at `EditInvoice.tsx:623` to see exactly which items are dropped and why.

4. **Check if `validate.ts` truly catches all edge cases:** The `String(item.baseFields.description || '').trim()` check in validate.ts uses a different trim path than the save filter — verify they produce identical results for edge cases like `"undefined"`, `"null"`, `"\t\n"`, etc.

5. **Verify DB INSERT behavior:** If the save filter is not the cause, check whether the Supabase `.insert()` call returns an error that is silently swallowed.

---

## Files Examined

| File | Lines | Relevance |
|------|-------|-----------|
| `src/pages/EditInvoice.tsx` | 135-227, 493-700 | Save/load pipeline, filter logic |
| `src/pages/NewInvoice.tsx` | 173-216, 510-719 | Save pipeline, initial state |
| `src/pages/ViewInvoice.tsx` | via `useInvoiceDetailData.js:140-155` | Preview data loading |
| `src/components/quotation/QuotationForm.tsx` | 218-277, 412-617 | Quotation save/load |
| `src/domain/import/apply.ts` | 77-272 | `buildApplyResult` — item construction |
| `src/domain/import/validate.ts` | 7-87 | Description-required filter |
| `src/domain/import/normalize.ts` | 86-177 | Row normalization, group_id assignment |
| `src/domain/import/resolve.ts` | 24-119 | Column resolution |
| `src/domain/import/types.ts` | 1-150 | Type definitions |
| `src/domain/import/utils.ts` | 157-165 | `getStandardRowEntries` |
| `src/domain/invoice/importAdapter.ts` | 10-38 | `applyResult` — state setter calls |
| `src/domain/invoice/normalize.ts` | 28-52, 264-295 | `syncGroupsFromItems`, `mapDbInvoiceItem` |
| `src/domain/invoice/factories.ts` | 91-110 | `toDbItem` — DB transform |
| `src/domain/invoice/previewModel.ts` | 66-126, 170-238 | Preview model construction |
| `src/domain/invoice/buildPdfRenderPayload.ts` | 3-29 | PDF payload passthrough |
| `src/domain/invoice/types.ts` | 191-217 | `InvoiceItem` interface |
| `src/domain/quotation/importAdapter.ts` | full | Quotation adapter |
| `src/domain/quotation/normalize.ts` | 80-122 | `mapDbQuotationItem` |
| `src/domain/quotation/previewModel.ts` | 143-209 | Quotation preview |
| `src/domain/quotation/quotationFormUtils.ts` | 45-117, 190-194 | `normalizeQuotationGrouping`, `toQuotationItem` |
| `src/hooks/useInvoiceDetailData.js` | 140-155 | View page data fetch |
| `docs/standard/json-import-standard.md` | 1-201 | Import contract |
| `supabase/migrations/20260520090003_invoices.sql` | 48-73 | `invoice_items` schema |
| `supabase/migrations/20260520090002_quotations.sql` | 42-68 | `quotation_items` schema |
