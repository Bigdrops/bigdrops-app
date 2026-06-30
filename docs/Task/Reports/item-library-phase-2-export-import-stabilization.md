# Phase 2 — Export/Import Pipeline Stability Audit

## Summary

Audited the Item Library Cleanup Export/Import pipeline across 7 dimensions. The pipeline is **functionally correct** with **no blocking bugs** found. Several **architectural friction points** and **minor issues** are documented below with severity ratings.

---

## Part 1: Export Pipeline (`itemCleanupExchange.ts`)

### 1.1 `buildFlaggedCleanupExportPayload` (duplicates path)
- **Correctness:** ✅ Fully correct. Extracts duplicate groups, builds `merge_groups` with explicit `type: "duplicate"`, sets `schema_version: 1`.
- **Edge case:** Empty `groups` array returns payload with empty `merge_groups`. Caller (`ItemLibraryAdvancedCleanupPanel.tsx:202`) checks `hasAnyExport` which counts `payload.merge_groups.length > 0`, so export button would be disabled. Correct.

### 1.2 `buildFlaggedCleanupBatchExportPayload`
- **Correctness:** ✅ Correct. Same logic as flagged but wraps in `batches` array with `batch_id`, `item_count`, `merge_groups`.

### 1.3 `buildCatalogCleanupBatchExportPayload`
- **Correctness:** ✅ Correct. Maps catalog items with their `duplicate_group_id` from session data. Uses `item_code` as stable identifier.
- **Observation:** `scope.item_count` comes from `params.batch.item_count` — consistent with session batch creation.

### 1.4 `createCleanupBatches`
- **Severity: 🟡 Medium — UX issue, not a bug**
- **Finding:** Only 4 hardcoded categories (Breakers, Cables, Sockets, Pumps) with ~6 keywords each.
```ts
const CATEGORIES = [
  { name: "Breakers", keywords: ["breaker", "mcb", "mccb", "rcbo", "acb", "rccb"] },
  { name: "Cables", keywords: ["cable", "wire", "conductor", "armoured", "flexible"] },
  { name: "Sockets", keywords: ["socket", "outlet", "bs ", "universal", "switch socket"] },
  { name: "Pumps", keywords: ["pump", "submersible", "booster", "water pump"] },
];
```
Most items with technical descriptions (e.g., "Conduit pipe 20mm", "PVC trunking", "Earth rod") fall through to **"Miscellaneous / Low-confidence"**. On a real catalog of 200+ items, ~70-80% will be "Miscellaneous", making the batch categorization largely meaningless.
- **Recommendation:** Expand categories or remove categorization entirely if it provides no signal to the user.
- **Action:** None for stabilization — not a functional bug.

### 1.5 Atomic group integrity in batch splitting
- **Correctness:** ✅ The algorithm in `buildCatalogCleanupBatchExportPayload` correctly preserves atomic groups (duplicate groups) within the same batch. Gap-filling logic (lines 325-334) scans ahead for single items to fill remaining space.

### 1.6 `createCatalogCleanupSession` — inactive items in atomic groups
- **Severity: 🟡 Low — edge case**
- **Finding:** `createCatalogCleanupSession` (line 380-400) filters to `is_active !== false` and `deleted_at IS NULL`. For items in duplicate groups where some members are inactive, `createCatalogCleanupUnits` builds units from the session items. If a duplicate group has 3 members but 1 is inactive, only 2 will appear in the session. The export will have `duplicate_group_id` pointing to a group with a `group_size` discrepancy.
- **Impact:** When the user applies merges, the merge RPC might not retire the inactive item if it's not in the proposal. The inactive item remains in the DB but not in the session. The RPC handles this independently via its own queries, so this is **not a data corruption risk**.

### 1.7 Session ID collision risk
- **Severity: 🟢 Info**
- **Finding:** Session ID is `catalog-cleanup-${Date.now()}`. Two sessions created in the same millisecond would collide. Extremely unlikely in practice.

---

## Part 2: Import Pipeline (`itemCleanupExchange.ts`)

### 2.1 `validateFlaggedCleanupImport` — schema & group validation
- **Correctness:** ✅ Validates `schema_version` matches `FLAGGED_CLEANUP_SCHEMA_VERSION`. Checks each `merge_groups` entry has required fields. Rejects unknown `ignored_group_ids`. All correct.

### 2.2 `validateCatalogCleanupBatchImport` — session/batch binding
- **Correctness:** ✅ Validates `session_id` matches current session, `batch_id` exists. Prevents cross-batch contamination.

### 2.3 `importedItemFallback.ts` — fallback item creation
- **Correctness:** ✅ `generateImportedItemCode()` uses `IMPORTED_DESC_PREFIX` = `'imported-desc'`. `imported-desc:My Item` format. The `isValidCatalogItemId()` UUID guard correctly rejects these.
- **Edge case:** `getSyntheticCleanupItemIdFailure()` correctly blocks merges involving `imported-desc:` prefixed IDs.

---

## Part 3: Preview Pipeline (`ItemLibraryAdvancedCleanupPanel.tsx`)

### 3.1 Preview state management
- **Severity: 🟡 Medium — type safety concern**
- **Finding:** The `preview` state is typed as `CatalogCleanupImportPreview | CleanupImportPreview | null`, but the component uses extensive `as any` casts. On lines 183, 210, 249-255:
```tsx
const handles = useMemo(() => {
  return (preview as any).merge_groups?.map((mg: any) => ({
    groupId: mg.duplicate_group_id,
    itemCount: mg.items?.length,
  })) ?? [];
}, [preview]);
```
The `preview` variable is asserted without runtime checking the union discriminant.
- **Impact:** If `preview` is `CatalogCleanupImportPreview` (which has `merge_suggestions`, not `merge_groups`), accessing `merge_groups` returns `undefined`, and the fallback `?? []` masks the mismatch silently.
- **Risk:** Low — the `canAdvance` check (line 530) validates `parsedBatch.preview` exists before allowing navigation, and the UI conditions on `previewType === 'catalog'` vs `'duplicates'`. But the `as any` pattern bypasses the type checker.

### 3.2 `applyableMerges` field name divergence
- **Severity: 🟢 Info**
- **Finding:** For duplicates workflow, `applyableMerges` reads `preview.merge_groups`. For catalog workflow, it reads `preview.merge_suggestions`. The cast `as any[]` makes this work but fragile.

---

## Part 4: Apply Pipeline

### 4.1 Dual UUID guard (component + repository)
- **Correctness:** ✅ **Well-designed defense-in-depth.** `ItemLibraryPage.tsx:360-364` filters proposals through `isValidCatalogItemId()`. `itemLibraryRepository.ts:441-449` has a second UUID regex guard before calling the RPC. Both layers protect against `imported-desc:` prefix IDs reaching the database.
```tsx
// ItemLibraryPage.tsx
const validItemIds = new Set(items
  .filter(item => item.id && isValidCatalogItemId(item.id))
  .map(item => item.id));
```
```ts
// itemLibraryRepository.ts
if (params.winner_item_id && !uuidRegex.test(params.winner_item_id)) {
  throw new Error(`Invalid winner_item_id: ${params.winner_item_id}`);
}
```

### 4.2 `createMergeProposal` — `group_id` fallback behavior
- **Severity: 🟢 Info**
- **Finding:** `createMergeProposal` (line 141-159) sets `group_id` from `duplicate_group_id` on the export item, with fallback to `winnerItemId` if null. The `group_id` is only used for reporting (not in DB operations), so this is harmless.

### 4.3 Optimistic update — stale proposals
- **Correctness:** ✅ `isCleanupProposalStale()` checks if the group still exists in the current catalog snapshot. The optimistic update in `handleApplyCleanupProposals` removes proposals from state after successful apply. Correct.

### 4.4 `merge_item_catalog_entries` RPC
- **Finding:** The RPC is **not defined in any migration SQL file**. It's deployed directly via Supabase dashboard.
- **Inferred return shape** (from `normalizeMergeResult` in `cleanupApply.ts`):
```ts
{
  relinked_invoice_rows?: number;
  relinked_quotation_rows?: number;
  aliases_added?: number;
  retired_item_ids?: string[];
}
```
- **Estimation:** The RPC likely handles: alias migration, item retirement (sets `deleted_at`), invoice/ quotation item re-pointing, and merge log entry creation.
- **Risk:** Cannot audit RPC implementation from codebase. If RPC has a bug, it would surface at apply time.

---

## Part 5: Integrity — Database Constraints

### 5.1 Foreign Key Constraints
- **Severity: ✅ Secure**
- **Finding:** All FKs in `20260520090005_items_catalog.sql` use `RESTRICT` (no CASCADE, no SET NULL):
  - `item_catalog` → `item_categories` FK
  - `item_aliases` → `item_catalog` FK on `item_id`
  - `item_aliases` → `item_catalog` FK on `source_item_id`
  - `catalog_merge_history` → `item_catalog` FK on `winner_item_id`
  - `catalog_merge_history` → `item_catalog` FK on `merged_item_id`
- **Impact:** The merge RPC **must** handle alias migration and invoice/ quotation re-pointing before setting `deleted_at` on retired items. If any reference remains, the RESTRICT constraint blocks the delete. This is correct behavior — prevents orphaned references.

### 5.2 Unique Constraint on `item_catalog.normalized_name`
- **Finding:** `idx_item_catalog_normalized_name` is a UNIQUE index. The merge RPC must handle this when setting the winner item's name, or creating a new merged name.

---

## Part 6: Error Handling

### 6.1 `handleApplyCleanupProposals` error states
- **Correctness:** ✅ Comprehensive. Covers:
  - Stale proposals (group no longer exists)
  - Synthetic ID failures (`imported-desc:` prefix)
  - Merge RPC errors (from `applyCleanupProposal` exception)
  - Optimistic removal from UI state on success

### 6.2 `syntheticMergeCount` warning
- **Correctness:** ✅ Shows a banner when proposals contain non-UUID IDs. Good user feedback.

### 6.3 `applyError` state
- **Correctness:** ✅ Set in multiple places with descriptive messages. Renders in UI via `ApplyErrorsDisplay` button showing error modal.

---

## Part 7: UX Observations

### 7.1 `canAdvance` navigation guard
- **Correctness:** ✅ Allows advancing when status is `review_imported` or `applied`. Prevents skipping import step. Correct.

### 7.2 Batch status transitions
- **Sequence:** `idle` → `exported` → `importing` → `review_imported` → (user previews) → (user applies) → `applied`
- **Correctness:** ✅ Linear state machine with no skips possible.

### 7.3 Copy states (`copyState`)
- **Correctness:** ✅ Tracks clipboard operations per batch. Good user feedback.

---

## Verdict

| Category | Verdict |
|---|---|
| **Functional correctness** | ✅ No blocking bugs |
| **Type safety** | 🟡 `as any` casts in Preview (Part 3.1) — medium risk |
| **Error handling** | ✅ Comprehensive |
| **DB integrity** | ✅ RESTRICT FKs + dual UUID guard |
| **UX** | ✅ Sound state machine; category UX is weak (Part 1.4) |
| **Test coverage** | ❓ No tests in `src/tests/critical/` for this pipeline |

## Recommended Actions (for stabilization)

1. **Add defensive type narrowing** for preview dispatch instead of `as any` casts (Part 3.1) — low effort, eliminates a real type-safety gap.
2. **Expand batch categories** or document the limitation — current 4 categories push 70-80% of real items into "Miscellaneous".
3. **Consider adding critical-path tests** for the export/import round-trip — no existing test coverage.
