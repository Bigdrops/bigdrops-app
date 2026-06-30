# Item Library — Phase 1 Stabilization Report

> Stabilize the Item Library foundation (search/suggestion pipeline, merge workflow, cleanup workflow, UI stability)  
> Audited: 2026-06-30 — Scope: Phase 1 (no redesign, no breaking APIs, no Phase 2 features)

---

## Fixes Applied

### 1. `normalizeSuggestionQuery()` mismatch with DB

**File:** `src/modules/item-library/domain/suggestionRanking.ts`

- Added `normalizeItemText()` mirroring the DB function `normalize_item_text()` in the 20260520090005 migration
- Transformations: `mm²`/`mm2` → `sqmm`, `&` → `and`, lowercase, collapse whitespace, trim
- Updated `findExactItemSuggestionMatch()` to use `normalizeItemText()` instead of raw lowercase
- **Why:** The old code used a simple `toLowerCase()`, which caused false negatives for items with special characters (`mm²`, `&`) that the DB had already normalized. The fix is idempotent (safe to double-normalize).

### 2. `useItemSuggestionEngine` re-render storm

**File:** `src/modules/item-library/hooks/useItemSuggestionEngine.ts`

- Wrapped the returned `{ value, onChange, onReset, onOpen, onClose, onBlur }` object in `useMemo`
- **Why:** Each render created a new object reference, causing consumers and context subscribers to re-render even when no values changed.

### 3. `useItemAliases` duplicated code and unstable deps

**File:** `src/modules/item-library/hooks/useItemAliases.ts`

- Removed duplicate `if (!enabled || !itemIds.length)` block
- Simplified dependency array to `[itemIdsKey, enabled]` — `itemIdsKey` (derived from `stableItemIds.join('::')`) is sufficient for change detection

---

## Catalog Integrity Audit

### Foreign Key Analysis (from actual migration `20260520090005_items_catalog.sql`)

| FK | Behavior | Notes |
|---|---|---|
| `item_aliases.item_id → item_catalog(id)` | RESTRICT | No `ON DELETE` = `NO ACTION` (Postgres default) |
| `item_merge_log.batch_id → item_import_batches(id)` | RESTRICT | |
| `item_merge_log.from_item_id → item_catalog(id)` | RESTRICT | |
| `item_merge_log.to_item_id → item_catalog(id)` | RESTRICT | |
| `invoice_items.item_id → item_catalog(id)` | RESTRICT | Cross-domain |
| `quotation_items.item_id → item_catalog(id)` | RESTRICT | Cross-domain |

> **Correction:** The prior audit (`item-library-and-export-audit.md`) claimed `item_aliases` uses CASCADE and `item_merge_log` uses SET NULL. The actual migration uses RESTRICT for all FKs. This is _safer_ — it prevents accidental deletion of referenced records.

### Integrity Findings

| Concern | Status | Evidence |
|---|---|---|
| Orphan aliases after delete | ✅ **Not possible** | FK RESTRICT prevents deletion of catalog items with aliases |
| Orphan aliases after merge | ✅ **Not possible** | `merge_item_catalog_entries` RPC migrates aliases to winner within a transaction |
| Duplicate normalized aliases | ✅ **Prevented** | Unique index `idx_item_aliases_normalized_alias_text` (global) |
| Merge history integrity | ✅ **Safe** | FKs on `from_item_id`/`to_item_id` prevent referencing invalid items |
| Inactive items in suggestions | ✅ **Excluded** | DB function `get_item_suggestions()` filters `c.is_active = true` |
| Retired aliases in suggestions | ✅ **Excluded** | DB function filters `a.is_active = true AND a.is_retired = false` |
| Synthetic IDs in merge proposals | ✅ **Blocked** | `isValidCatalogItemId()` (UUID regex) + `getSyntheticCleanupItemIdFailure()` |
| Cleanup batch staleness | ✅ **Detected** | `isCleanupProposalStale()` checks if group exists in current snapshot |
| Retired aliases in cleanup export | ⚠️ **Minor** | `buildAliasMap()` doesn't filter retired aliases; display-only hints, not actionable |

### Risk: Global alias uniqueness

```sql
CREATE UNIQUE INDEX idx_item_aliases_normalized_alias_text ON item_aliases (normalized_alias_text);
```

This is **global** (not per-item). Two different catalog items cannot have aliases with the same normalized text. If the code tries to insert a duplicate, the DB rejects it. All callers use `try/catch` or `upsertItem()` patterns, so insertion failures are handled gracefully.

---

## Performance Audit

### Already Fixed

| Issue | File | Fix |
|---|---|---|
| Re-render storm in suggestion engine | `useItemSuggestionEngine.ts` | `useMemo` on return object |
| Duplicate code + unstable deps | `useItemAliases.ts` | Removed dup `if`, simplified deps |

### Hooks — Clean (no issues detected)

| Hook | Lines | Assessment |
|---|---|---|
| `useItemSuggestions.ts` | 44 | Clean cancellation pattern, correct deps |
| `useItemMergeHistory.ts` | 36 | `useCallback` for loader, standard |
| `useItemMerge.ts` | 33 | Simple wrapper, no re-render issue |
| `useItemHistoryList.ts` | 57 | Cache layer, `reloadKey` pattern |
| `useItemHistoryDetail.ts` | 45 | Clean cancellation, stable deps |
| `useItemFilterCounts.ts` | 32 | Simple, no issues |

### Page Component (`ItemLibraryPage.tsx` — 630 lines)

| Pattern | Assessment |
|---|---|
| `selectedItem` via `useMemo` | ✅ Correct — depends on `[filteredItems, selectedItemId]` |
| `selectedDuplicateGroup` via `useMemo` | ✅ Correct |
| `allDuplicateGroups` via `useMemo` | ✅ Correct |
| `filteredItems` via `useMemo` | ✅ Correct |
| `handleMerge` (inline) | ⚠️ Not `useCallback`-wrapped; passed as `onMerge` prop — acceptable (async event handler, called once per user action) |
| `handleApplyCleanupProposals` (inline) | Same pattern — acceptable |
| `handleNeedsCleanupDeepLink` (inline) | Same pattern — acceptable |
| `useEffect` for `selectedItemId` sync with `filteredItems` | ✅ Correct — handles empty list and missing selection |
| `useEffect` for duplicate group selection sync | ✅ Correct |
| Optimistic cache update on merge | ✅ Uses `writeListCache` after patching |

### Repository Layer

| Function | Lines | Findings |
|---|---|---|
| `getItemSuggestions()` | ~70 | Triple fallback (RPC → RPC alt param → ILIKE). First call usually succeeds; fallbacks are effectively dead code post-migration. **Low risk** |
| `getItemSummaryList()` | ~50 | Extra queries for `invoice_items`/`quotation_items` after view fetch. Bounded (2 queries). **Low risk** |
| `getItemHistoryDetail()` | ~58 | 2 parallel item queries, then 2 parent doc queries. Reasonable N+1 avoidance. **Low risk** |
| `getItemMergeHistory()` | ~32 | Fetches 50 merge log rows + item names. Clean. **No issues** |
| `normalizeMergeResult()` | ~20 | Defensive fallback to request params. **Good** |

---

## Additional Discoveries

- **No test coverage:** `src/tests/` only contains a README.md placeholder. Phase 2 should add critical path tests for merge, cleanup export, and suggestion ranking.
- **Build command:** `bun run build` confirmed working.
- **Lint/typecheck:** `bun run lint` and `bun run typecheck` available; no issues introduced by Phase 1 changes.

---

## Final Phase 1 Summary

### Deliverables Met

| Requirement | Status | Notes |
|---|---|---|
| Search/suggestion normalization mismatch | ✅ Fixed | `normalizeItemText()` mirrors DB |
| Suggestion engine re-render issue | ✅ Fixed | `useMemo` on return object |
| Alias load performance | ✅ Fixed | Duplicate code removed, deps simplified |
| Catalog integrity verified | ✅ Passed | All FK constraints are RESTRICT, no orphan risk |
| Performance audit completed | ✅ Passed | No blocking perf issues |
| Cleanup export validated | ✅ Correct | `isStale`, `isValidCatalogItemId`, synthetic ID guards all correct |
| Merge workflow validated | ✅ Correct | RPC handles alias migration, FK protection, `buildMergePreview()` filters retired aliases |
| Duplicate detection validated | ✅ Correct | Partition-based clustering, Jaccard-like overlap scoring via `Math.max` |

### Out of Scope (Phase 2)

- Bulk Export enhancements (shared dropdown, CSV/JSON export)
- Invoice/Quotation export improvements
- Document Import pipeline
- PDF generation
- Query Platform integration
- CSR export

---

## Phase 2 Readiness Assessment

The Item Library is **ready for Phase 2**. The foundation is stable:

1. **FK constraints** are RESTRICT-only, which is safer than assumed
2. **All perf issues** in Phase 1 scope are resolved
3. **Cleanup export format** (`CatalogCleanupBatchExportPayload`, `FlaggedCleanupBatchExportPayload`) is validated and correct
4. **Merge pipeline** handles alias migration, transaction safety, and optimistic cache updates
5. **Catalog integrity** is enforced at both DB (FKs, unique indexes, CHECK) and application (`isValidCatalogItemId`, `getSyntheticCleanupItemIdFailure`, `isCleanupProposalStale`) layers

### Recommended Phase 2 Priorities

1. Add critical path tests (merge, cleanup export, suggestion ranking)
2. Consolidate the triple-fallback in `getItemSuggestions()` to a single RPC call
3. Update `buildAliasMap()` to filter retired aliases
4. Investigate global alias uniqueness constraint for per-item relaxation
