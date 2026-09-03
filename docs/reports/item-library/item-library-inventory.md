# ItemLibraryPage — Full Page Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/modules/item-library/pages/ItemLibraryPage.tsx`
**Subcomponents:**
- `ItemLibraryListPanel` — `src/modules/item-library/components/ItemLibraryListPanel.tsx`
- `ItemLibraryRow` — `src/modules/item-library/components/ItemLibraryRow.tsx`
- `ItemLibraryDetailPanel` — `src/modules/item-library/components/ItemLibraryDetailPanel.tsx`
- `ItemLibraryDuplicateGroupCard` — `src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx`
- `ItemLibraryDuplicateReviewPanel` — `src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx`
- `ItemLibraryAdvancedCleanupPanel` — `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `ItemLibraryMergeHistoryPanel` — `src/modules/item-library/components/ItemLibraryMergeHistoryPanel.tsx`
- `ItemLibraryStatusStrip` — `src/modules/item-library/components/ItemLibraryStatusStrip.tsx`
- `ItemHistoryRow` — `src/modules/item-library/components/ItemHistoryRow.tsx`
- `ItemSearchBar` — `src/modules/item-library/components/ItemSearchBar.tsx`
**Types:** `src/modules/item-library/types/itemLibrary.ts`
**Services:** `src/modules/item-library/services/itemLibraryService.ts`
**DB migration:** `supabase/migrations/20260520090005_items_catalog.sql`

---

## 1. Page Structure Overview

The page is a dual-panel layout inside `<Layout hidePageHeader>`: a list panel (left) and a detail/action panel (right). The header has a mode toggle between "Library" and "Cleanup Hub". Mobile view collapses to single-panel with back navigation.

**Route:** `/items` or `/item-library` (inferred from filename — not found in AppShell scan)

**Modes:**
- `workflowMode: 'library'` — normal catalog browsing with search + filters
- `workflowMode: 'cleanup'` — duplicate detection and catalog cleanup tools

**View modes:** `'catalog' | 'duplicates' | 'duplicates_choice' | 'duplicates_outsourced' | 'advanced_cleanup' | 'merge_history'`

---

## 2. Header (mode toggle)

```
[Back arrow]  [Library | Cleanup Hub (N)]  [spacer]
```

- Back arrow: `window.history.back()` — hidden on mobile
- Mode toggle: Two buttons inside a segmented control
- Cleanup Hub shows unresolved issue count badge on button
- Mobile: no spacer (third column)

---

## 3. Cleanup Hub Status Strip

**Component:** `ItemLibraryStatusStrip` — shown only when `workflowMode === 'cleanup' && viewMode === 'catalog'`

| Stat | Source | Color |
|------|--------|-------|
| Active Items | `serverFilterCounts.all` or `summaryItems.length` | Default |
| Duplicate Groups | `duplicateGroups.length` | Warning if > 0 |
| Cleanup Proposals | `flaggedCleanupExport.scope.group_count` | Warning if > 0 |
| Merge History | `mergeHistoryCount` | Default |

---

## 4. Data Loading

### Primary data hook: `useItemHistoryList(200, options)`
- **Source:** Generic hook from `../hooks`
- Loads `ItemCatalogItem[]` with limit 200
- Options: `includeHeavyFallbacks` when in cleanup mode
- States: `data: ItemCatalogItem[]`, `loading`, `error`, `setData`, `reload`

### Merge history: `useItemMergeHistory()`
- Enabled when `workflowMode === 'cleanup'`
- States: `data`, `count`, `loading`, `reload`

### Server filter counts: `useItemFilterCounts()`
- States: `counts: {all, invoice, quotation}`, `loading`

### Item history detail: `useItemHistoryDetail(itemId, 50, options)`
- Enabled when selected item exists and applicable mode
- Options: `includeHeavyFallbacks` in cleanup mode

### Item aliases: `useItemAliases(itemIds, options)`
- Enabled when `workflowMode === 'cleanup'`
- Fetches aliases for duplicate item IDs

### Item merge: `useItemMerge()`
- Returns `{ mergeItems, loading }`

---

## 5. Data Flow & Filtering

### Search filtering:
```ts
const filteredItems = summaryItems.filter(item => {
  // Search text match on item.name (case-insensitive)
  // Filter by activeFilter: 'all', 'invoice', 'quotation', 'needs_cleanup'
})
```

**Duplicate detection:**
```ts
const allDuplicateGroups = useMemo(() => detectDuplicateGroups(summaryItems), [summaryItems])
const allDuplicateItemIdsSet = new Set(allDuplicateGroups.flatMap(g => g.members.map(m => m.item_id)))
```

### Auto-selection effects:

**Effect 1:** When `filteredItems` changes, auto-selects first item:
```ts
if (!filteredItems.length) → deselect
if no current selection → select first
if current selection no longer in list → select first
```

**Effect 2:** In cleanup mode with duplicates/advanced_cleanup view → auto-selects first duplicate group

**Effect 3:** In cleanup mode + duplicate view + group change → updates selected item to first member of current group

### Merge history cleanup:
```ts
if (viewMode === 'merge_history' && mergeHistoryCount === 0) → setViewMode('catalog')
```

---

## 6. Section-by-Section Inventory

### SECTION: ItemLibraryListPanel (left panel)

**Component:** `ItemLibraryListPanel` — `src/modules/item-library/components/ItemLibraryListPanel.tsx`

**Props:** `items, duplicateGroups, workflowMode, viewMode, selectedItemId, selectedDuplicateGroupId, loading, searchText, activeFilter, serverFilterCounts, onViewModeChange, onSearchTextChange, onFilterChange, onSelectItem, onSelectDuplicateGroup, onInspectDuplicateItem, onNeedsCleanup, flaggedItemIds, totalUnresolvedIssues`

**Layout:** Column with header section, then scrollable list

#### Header:
- Label: "Library" or "Cleanup Hub"
- Counts: "X shown · Y total" + "X issues" (if cleanup mode and issues > 0)
- Search bar (library mode only)

#### Filter chips (library mode only):
| Chip | Filter | Color When Active |
|------|--------|-------------------|
| All (N) | `'all'` | Primary |
| Flagged | `'needs_cleanup'` | Primary |
| Invoice (N) | `'invoice'` | Primary |
| Quotation (N) | `'quotation'` | Primary |

#### List content:

**Library mode:** Rows of `ItemLibraryRow` components

| State | Display |
|-------|---------|
| Loading | 6 skeleton rows |
| Empty + search | "No matching items" |
| Empty + no search | "No items yet. Items appear here as invoices and quotations are created." |
| Has items | `ItemLibraryRow` per item |

**Cleanup mode (duplicates view):** Cards of `ItemLibraryDuplicateGroupCard` components

| State | Display |
|-------|---------|
| Loading | 6 skeleton rows |
| No duplicates | "No duplicate candidates found" |
| Has groups | `ItemLibraryDuplicateGroupCard` per group |

---

### SECTION: ItemLibraryRow

**Component:** `ItemLibraryRow` — `src/modules/item-library/components/ItemLibraryRow.tsx`

**Props:** `item: ItemCatalogItem, isSelected: boolean, isFlagged?: boolean, onSelect, onNeedsCleanup?`

Each row displays:
- Flag dot (warning color if flagged, muted otherwise)
- Item name (13px bold)
- Last sold price + price movement direction (↑/↓ + %) if different from standard
- Usage count (compact format)
- Last used date
- Standard price (right-aligned, 13px bold mono)
- "Review" button (flag mode only, warning styled, only if flagged)

**Selected state:** Blue left border (3px), info background, shadow

**Row type:** `<button>` with `aria-pressed={isSelected}`

---

### SECTION: ItemLibraryDetailPanel (right panel)

**Component:** `ItemLibraryDetailPanel` — `src/modules/item-library/components/ItemLibraryDetailPanel.tsx`

**Props:** `item: ItemCatalogItem | null, historyRows: ItemHistoryRow[], loading: boolean, error: Error | null`

#### States:

| State | Display |
|-------|---------|
| No item selected | Empty state with search icon + "Select an item" |
| Loading | `DetailSkeleton` — 3 skeleton cards |
| Has item | Full detail panel |

#### Item identity section:
- Item name (16px extrabold)
- Price grid (3 columns, bordered):
  - Standard price
  - Last sold price (green if exists)
  - Movement (▲/▼ with amount + percentage, or "—")
- Stats: "Appears in X" + "Last used {date}"

#### Price intelligence section:
- Latest document price (with source doc number + date)
- Average recorded price (with usage count)
- Price range (all time, with usage count)
- Fallback: "No recorded history" if no data

#### Usage history section:
- Count: "X occurrences"
- Error state: Red error box
- Empty state: "No history yet" with dashed border
- Has data: `ItemHistoryRow` for each occurrence

---

### SECTION: Cleanup Hub (catalog mode — launcher)

**Condition:** `workflowMode === 'cleanup' && viewMode === 'catalog'`

Three workflow cards:

| Card | Action | View Mode |
|------|--------|-----------|
| Fix Duplicate Items | `setViewMode('duplicates_choice')` | Shows group count badge |
| Clean & Standardize Catalog | `setViewMode('advanced_cleanup')` | Full catalog cleanup |
| Review Past Changes | `setViewMode('merge_history')` | Only if `mergeHistoryCount > 0` |

---

### SECTION: Duplicate Review Flow

**Step 1:** `duplicates_choice` — User chooses review method:
- "Review Manually in App" → `viewMode = 'duplicates'`
- "Use AI for Duplicate Review" → `viewMode = 'duplicates_outsourced'`

**Step 2 (Manual):** `ItemLibraryDuplicateReviewPanel`
- **Props:** `aliases, aliasesError, aliasesLoading, group, item, historyRows, loading, error, mergeLoading, onInspectItem, onMerge`
- Side-by-side comparison with full history audit (not fully inspected)

**Step 2 (AI Outsource):** `ItemLibraryAdvancedCleanupPanel` with `workflow="duplicates"`

### SECTION: Advanced Cleanup

**Component:** `ItemLibraryAdvancedCleanupPanel` — with `workflow="full_catalog"`
- Batch export, AI review, safe merge apply

### SECTION: Merge History

**Component:** `ItemLibraryMergeHistoryPanel` — `src/modules/item-library/components/ItemLibraryMergeHistoryPanel.tsx`
- **Props:** `data, loading, error`

---

## 7. Buttons / Actions

| Button | Location | Action |
|--------|----------|--------|
| Back arrow | Header | `window.history.back()` |
| Library mode toggle | Header | `setWorkflowMode('library'), setViewMode('catalog')` |
| Cleanup Hub mode toggle | Header | `setWorkflowMode('cleanup'), setViewMode('catalog')` |
| Filter chip (All) | ListPanel | `setActiveFilter('all')` |
| Filter chip (Flagged) | ListPanel | `setActiveFilter('needs_cleanup')` |
| Filter chip (Invoice) | ListPanel | `setActiveFilter('invoice')` |
| Filter chip (Quotation) | ListPanel | `setActiveFilter('quotation')` |
| Item row click | ListPanel row | `onSelectItem(itemId)` — on mobile also opens detail |
| Duplicate group card click | ListPanel card | `onSelectDuplicateGroup(groupId)` |
| Review button | Item row (flagged) | `onNeedsCleanup(itemId)` → deep links into cleanup flow |
| Mobile back | Detail panel mobile header | `setMobileDetailOpen(false)` |
| Back from cleanup sub-mode | Detail panel header | `setViewMode('catalog')` |

---

## 8. State Summary

| State Variable | Type | Initial | Purpose |
|---------------|------|---------|---------|
| `searchText` | `string` | `''` | Search query |
| `workflowMode` | `'library' \| 'cleanup'` | `'library'` | Top-level mode |
| `viewMode` | `ItemLibraryViewMode` | `'catalog'` | Sub-mode within a workflow |
| `activeFilter` | `ItemLibraryFilterType` | `'all'` | List filter chip |
| `selectedItemId` | `string \| null` | `null` | Selected item in list |
| `selectedDuplicateGroupId` | `string \| null` | `null` | Selected duplicate group |
| `mobileDetailOpen` | `boolean` | `false` | Mobile detail panel visibility |
| `pendingHistoryRefreshItemId` | `string \| null` | `null` | Triggers history refresh after merge |

**Derived/memoized:**
- `allDuplicateGroups`, `allDuplicateItemIdsSet`
- `filteredItems` (search + filter applied)
- `cleanupDuplicateGroups` (depends on workflow mode)
- `selectedItem`, `selectedDuplicateGroup`
- `selectedGroupAliases`
- `flaggedCleanupExport`, `duplicateItemIdsArray`

---

## 9. Merge Action (handleMerge)

When user merges items from `ItemLibraryDuplicateReviewPanel`:
1. `mergeItems(request)` — calls repository layer
2. Switches to library mode: `setWorkflowMode('library')`, `setViewMode('catalog')`
3. Cleans up selection states
4. Sets `pendingHistoryRefreshItemId` → triggers `reloadHistoryRows()`
5. Optimistic patch: removes retired items from `summaryItems` + writes cache
6. Reloads merge history
7. Shows success feedback with relinked row count

**Cleanup apply** (`handleApplyCleanupProposals`):
- Iterates proposals, checks staleness and synthetic failures
- Calls `mergeItems()` per proposal
- Tracks applied/stale/failed counts
- Optimistic cache update
- Shows summary feedback

---

## 10. DB Schema

### item_catalog
| Column | Type | Required | Default |
|--------|------|----------|---------|
| `id` | `uuid` | Yes | `gen_random_uuid()` |
| `name` | `text` | Yes | — |
| `normalized_name` | `text` | Yes | — |
| `standard_price` | `numeric` | Yes | `0` |
| `is_active` | `boolean` | Yes | `true` |
| `notes` | `text` | No | — |
| `metadata` | `jsonb` | Yes | `'{}'` |
| `created_at` | `timestamptz` | Yes | `timezone('utc', now())` |
| `updated_at` | `timestamptz` | Yes | `timezone('utc', now())` |

**Unique index on `normalized_name`**

### item_aliases
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `item_id` | `uuid` | FK → item_catalog |
| `alias_text` | `text` | Required |
| `normalized_alias_text` | `text` | Required, unique index |
| `is_active` | `boolean` | Default true |
| `is_retired` | `boolean` | Default false |
| `source` | `text` | Optional |
| `metadata` | `jsonb` | Default `'{}'` |

### item_merge_log
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `batch_id` | `uuid` | FK → item_import_batches |
| `from_item_id` | `uuid` | FK → item_catalog |
| `to_item_id` | `uuid` | FK → item_catalog |
| `action` | `text` | Required |
| `details` | `jsonb` | Default `'{}'` |

### item_import_batches
Tracking table for import sessions.

**Cross-domain FKs:** `invoice_items.item_id` and `quotation_items.item_id` reference `item_catalog.id`

### DB Functions:
- `normalize_item_text(input text)` — lowercase, replace mm²→sqmm, mm2→sqmm, &→and, collapse whitespace
- `get_item_suggestions(search_text, result_limit)` — ranked full-text search with alias matching

---

## 11. Known Issues

| Issue | Description | File:Line |
|-------|-------------|-----------|
| Route not confirmed | The page path `/items` or `/item-library` was not found in AppShell routes | `AppShell.tsx` |
| Hard limit of 200 items | `useItemHistoryList(200, ...)` limits the catalog to 200 items — no pagination | `ItemLibraryPage.tsx` |
| No create/delete item UI | Items can only be merged/cleaned. No way to manually create or delete a catalog item from this page | `ItemLibraryPage.tsx` (inferred) |
| `handleNeedsCleanupDeepLink` fallback | When deep link item is not found in any group, it still switches to cleanup mode but shows only a warning — no location feedback on why the deep link failed | `ItemLibraryPage.tsx` lines ~230–237 |
