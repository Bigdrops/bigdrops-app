# Invoice Toolbar Restoration & Group Behaviour Investigation

**Date:** 2026-06-28
**Status:** Complete
**Scope:** Invoice form, Edit invoice form, Quotation form (shared FormLineItems)
**Baseline commit:** `33628b19b2d8485584010dfcc8b0827b31dfabd9`
**Previous fix commit:** `470d1f3` (introduced DnD, removed Add/Group from toolbar, but kept `ml-auto` on wrong button)

---

## Part 1 — Toolbar Restoration

### Current State (after this fix)

```
┌──────────────────────────────────────────┐
│ Line Items                      3 items  │
├──────────────────────────────────────────┤
│ [📥 Import] [⚙ Settings]     [🗑 Clear] │
└──────────────────────────────────────────┘
```

### Changes Made

| Change | File | Line |
|--------|------|------|
| Removed duplicate "3 rows" counter | `FormLineItems.tsx` | Removed `lineItemsCount > 0` row-count div from toolbar |
| Moved Clear All after Settings | `FormLineItems.tsx` | Reordered: Import → Settings → Clear All |
| Moved `ml-auto` from Settings to Clear All | `FormLineItems.tsx` | Clear All now sits on the far right |

### Button Order

**Before regression** (at `82594d8^`):
```
Import Items | Table Settings | ml-auto Rows
```

**After `82594d8`** (Clear All introduced, ml-auto on Clear All):
```
Add | Group | Import | Clear All (ml-auto) | Settings
```

**After `470d1f3`** (previous "fix" — broken state):
```
Import | Clear All | Settings (ml-auto)
```
🔴 Clear All between Import and Settings violated adjacency.

**After this fix:**
```
Import | Settings | Clear All (ml-auto)
```
✅ Import and Settings adjacent. Clear All on far right.

### Verification

| Check | Status |
|-------|--------|
| Duplicate "3 rows" counter removed | ✅ Only SectionLabel trailing counter remains |
| Import → Settings adjacent | ✅ No controls between them |
| Clear All on far right | ✅ `ml-auto` on Clear All, last in DOM |
| Clear All only visible when items > 0 | ✅ `{onClearAll && lineItemsCount > 0 && ...}` |
| Clear All hidden when 0 items | ✅ Empty state preserved |
| Redundant Add/Group not in toolbar | ✅ Already removed in `470d1f3` |
| Large dotted Add/Group buttons remain | ✅ Unchanged below items |
| Import icon/label unchanged | ✅ `h-3.5 w-3.5` + `text-[12px]` |
| Settings icon/label unchanged | ✅ Same as Import |
| Clear All confirmation dialog works | ✅ AlertDialog preserved |

---

## Part 2 — Drag-and-Drop Investigation

### Current Implementation (already in place)

| Component | Role |
|-----------|------|
| `DndContext` (FormLineItems.tsx:286) | dnd-kit root context |
| `SortableContext` (FormLineItems.tsx:287) | Groups ungrouped item IDs |
| `SortableLineItem` (new file) | Wraps `MobileItemCard` with `useSortable` |
| `PointerSensor` (8px activation distance) | Prevents accidental drags on tap |
| `handleDragEnd` | Translates drag to `onMoveItem` steps |
| `dragHandleProps` on `GripVertical` | Only grip icon initiates drag |

### Packages Installed

- `@dnd-kit/core` 6.3.1
- `@dnd-kit/sortable` 10.0.0
- `@dnd-kit/utilities` 3.2.2

### Limitations

- Only **ungrouped items** are draggable
- Grouped items use existing Up/Down buttons
- `MobileItemCard` memo check does not compare `dragHandleProps` (dnd-kit manages own re-render)

### Comparison with Template

The reference template at `docs/TEMPLATES/React-temps/sortable.tsx` uses `@/components/reui/sortable` which does not exist in this project. The current implementation correctly uses the `@dnd-kit` stack instead — this is the correct architectural choice given the template doesn't apply.

---

## Part 3 — Group "Escanor" Behaviour (Root Cause)

### Definition

The "Escanor effect" is a bug where groups visually appear in a different order than their position in the items array. After regrouping, moving, saving, importing, or editing, the group moves itself to the beginning or bottom of the list, bringing its children with it. The group behaves as if it owns the list instead of behaving like a normal row.

### Root Cause

**Source:** `FormLineItems.tsx` renders groups via two different ordering mechanisms:

1. **`lineItemRows`** (line 124): Scans `items` array sequentially — **preserves canonical order**
2. **`groupEntries`** (line 171): Iterates the `groups` React state array — **uses metadata order, NOT canonical order**

The divergence happens when the `groups` array order doesn't match the order groups appear in the `items` array. The `groupEntries` render function is the only consumer that uses `groups` array order rather than `items` array order.

### How Divergence Occurs

| Operation | `items` state | `groups` state | Risk |
|-----------|--------------|----------------|------|
| `moveItem` (NewInvoice.tsx) | Reorders correctly | **Not reordered** | 🔴 High |
| Import | Ordered by import source | Ordered by import result | 🔴 High |
| `addGroup` | Appended | Appended | ✅ Low |
| `deleteGroup` | Removed/refiltered | Filtered | ⚠️ Medium |
| EditInvoice load | By `sort_order` | Discovery order | ⚠️ Medium |

### Invoice vs Quotation

| Aspect | Invoice | Quotation |
|--------|---------|-----------|
| Normalization | **None** — no sync of groups order | `normalizeQuotationGrouping()` rebuilds `groups` from `items` order |
| Risk | **Higher** | Lower (normalization keeps in sync) |

### Where Order is Correct

- **Viewer** (`InvoiceDocumentCard` → `buildInvoicePreviewItems`): Uses `items` array → always correct
- **PDF** (`industryAdapter.createIndustryRows`): Reads `items` sequentially → always correct
- **Database**: Items ordered by `sort_order` → correct

### Root Cause Summary

| Question | Answer |
|----------|--------|
| What causes it? | `groupEntries` in `FormLineItems.tsx` iterates `groups` array instead of deriving order from `items` array |
| Which function? | `groupEntries` useMemo and its consumer in the JSX render |
| What layer? | **UI state** — the `groups` metadata array is not kept in sync with `items` canonical order |
| Both Invoice and Quotation? | Both affected, but Quotation is partially mitigated by `normalizeQuotationGrouping()` |
| Smallest fix? | Either (a) make `groupEntries` derive group order from `items` array position, or (b) re-sort `groups` array to match `items` after every mutation |

### Files Involved

| File | Role |
|------|------|
| `src/components/document/FormLineItems.tsx` | **Bug location** — `groupEntries` uses `groups` order |
| `src/pages/NewInvoice.tsx` | Invoice mutations — no groups sync |
| `src/pages/EditInvoice.tsx` | Invoice editing — no groups sync |
| `src/domain/invoice/normalize.ts` | Invoice normalization — doesn't handle group reordering |
| `src/domain/invoice/importAdapter.ts` | Import — builds groups from import result |
| `src/domain/import/apply.ts` | Import logic — passes groups through |
| `src/components/quotation/QuotationForm.tsx` | Quotation form with `normalizeQuotationGrouping` |
| `src/domain/quotation/quotationFormUtils.ts` | `normalizeQuotationGrouping` — rebuilds groups from items |
| `src/hooks/useQuotationLineItems.ts` | Quotation mutations wrapped in `commitGrouping` |

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/document/FormLineItems.tsx` | Removed "3 rows" counter, reordered buttons to Import → Settings → Clear All, moved `ml-auto` from Settings to Clear All |

## Verification

```bash
bun run audit:load
bun run typecheck
bun run build
```
