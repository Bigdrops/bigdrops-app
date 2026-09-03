# Column Manager — Custom Column Reordering Investigation

This report was written by Buffy on 2026-08-29 via Freebuff.

---

## 1. Root Cause

**Custom columns cannot be reordered because the rendering code splits columns into two separate groups and renders them sequentially, ignoring the actual order in the state array.**

The `moveColumn` function correctly reorders the `columns` state array for both built-in and custom columns. But `ColumnManager.tsx` renders built-in columns first, then custom columns, in two separate `.map()` calls. The visual position of a custom column never changes regardless of its position in the state.

---

## 2. Evidence

### The Rendering Split (ColumnManager.tsx, lines ~425-430)

```typescript
const descriptionCol = columns.find((c) => c.key === 'description')
const builtinCols = columns.filter(
  (c) => !c.key.startsWith('custom_') && c.key !== 'description',
)
const customCols = columns.filter((c) => c.key.startsWith('custom_'))
```

### The Two Separate .map() Calls (ColumnManager.tsx, lines ~556-598)

```tsx
<div className="rounded-[12px] border border-[var(--bd-border-soft)] overflow-hidden">
  {/* FIRST: All built-in columns */}
  {builtinCols.map((col) => {
    const absIdx = columns.findIndex((c) => c.key === col.key)
    return (
      <BuiltInColumnRow
        key={col.key}
        col={col}
        onMoveUp={() => {
          if (!onMove || absIdx <= 1) return
          onMove(col.key, absIdx - 1)
        }}
        onMoveDown={() => {
          if (!onMove || absIdx >= columns.length - 1) return
          onMove(col.key, absIdx + 1)
        }}
        disableMoveUp={absIdx <= 1}
        disableMoveDown={absIdx >= columns.length - 1}
        affectsTotals={TOTAL_AFFECTING_COLUMNS.has(col.key)}
        {...dragHandlers}
      />
    )
  })}

  {/* SECOND: All custom columns — ALWAYS at the bottom */}
  {customCols.map((col) => {
    const idx = columns.findIndex((c) => c.key === col.key)
    return (
      <CustomColumnRow
        key={col.key}
        col={col}
        onMoveUp={() => {
          if (!onMove || idx <= 0) return
          onMove(col.key, idx - 1)
        }}
        onMoveDown={() => {
          if (!onMove || idx >= columns.length - 1) return
          onMove(col.key, idx + 1)
        }}
        disableMoveUp={idx <= 0}
        disableMoveDown={idx >= columns.length - 1}
        deleting={deletingKey === col.key}
        {...dragHandlers}
      />
    )
  })}
</div>
```

The `builtinCols` and `customCols` arrays are rendered in fixed order: built-ins first, customs last. The `columns` state order is only used for index calculation (for `onMove` callbacks), not for rendering order.

---

## 3. Built-In vs Custom Comparison

### What Happens When a Built-In Column Moves

1. User clicks "down" on `unit_price` (state index 4)
2. `onMove('unit_price', 5)` is called
3. `moveColumn` splices `unit_price` from index 4, inserts at index 5
4. State becomes: `[description, qty, make, unit, amount, unit_price, ...]`
5. Rendering: `builtinCols` now has `amount` before `unit_price`
6. **Visual: column moved correctly** ✅

### What Happens When a Custom Column Moves

1. User clicks "up" on `custom_1724900000000` (state index 5)
2. `onMove('custom_1724900000000', 4)` is called
3. `moveColumn` splices custom column from index 5, inserts at index 4
4. State becomes: `[description, qty, make, unit, custom_1724900000000, unit_price, amount, ...]`
5. Rendering: `builtinCols` = `[qty, make, unit, unit_price, amount, ...]` (custom filtered out)
6. Rendering: `customCols` = `[custom_1724900000000]` (always last)
7. **Visual: custom column stays at the bottom** ❌

### The Divergence Point

The state mutation (`moveColumn`) is correct. The divergence happens at the rendering layer (ColumnManager.tsx lines 556-598), where `.filter()` splits the array into two groups that are rendered sequentially.

---

## 4. Data Flow

### Complete Lifecycle

```
1. addCustomColumn()
   → key: 'custom_<Date.now()>'
   → appended to end of columns array
   → ✅ Correct

2. User clicks reorder (arrow or drag)
   → ColumnManager calls onMove(key, targetIdx)
   → useInvoiceColumns.moveColumn() splices and reorders
   → columns state updated correctly
   → ✅ Correct

3. ColumnManager re-renders
   → builtinCols = columns.filter(not custom AND not description)
   → customCols = columns.filter(custom)
   → builtinCols.map(...) rendered first
   → customCols.map(...) rendered second
   → ❌ Visual order ignores state order

4. Save (useInvoiceSave.ts:200)
   → columnConfig: columns (full array in state order)
   → ✅ Correct — custom column position is saved

5. Hydration (useInvoiceHydration.ts:91)
   → resolveFinancialColumns(parsed.columnConfig)
   → ensureColumnOrderIntegrity: dedupes, ensures description first
   → Iterates saved columns in order, merges with built-in defaults
   → Appends missing built-in columns at end
   → ✅ Correct — custom column position is preserved

6. PDF generation (getPdfColumns in columns.ts)
   → Iterates resolveColumnBehavior(columns, items, 'pdf') in order
   → Custom columns appear at their position in the array
   → ✅ Correct — PDF respects state order
```

### Summary

| Stage | Custom Column Order Preserved? |
|-------|-------------------------------|
| State mutation (moveColumn) | ✅ Yes |
| Rendering (ColumnManager) | ❌ **No — this is the bug** |
| Persistence (save) | ✅ Yes |
| Hydration (load) | ✅ Yes |
| PDF generation | ✅ Yes |

The state, persistence, hydration, and PDF all correctly handle custom column ordering. Only the visual rendering in ColumnManager ignores it.

---

## 5. Minimal Fix

### Option A: Single Loop Rendering (Recommended)

Replace the two separate `.map()` calls with a single loop over `columns` (excluding `description`, which is rendered separately as `FixedColumnRow`):

```tsx
{/* Current: two separate maps */}
{builtinCols.map((col) => <BuiltInColumnRow ... />)}
{customCols.map((col) => <CustomColumnRow ... />)}

{/* Fixed: single loop respecting columns order */}
{columns
  .filter((c) => c.key !== 'description')
  .map((col) => {
    const absIdx = columns.findIndex((c) => c.key === col.key)
    const isCustom = col.key.startsWith('custom_')

    if (isCustom) {
      return (
        <CustomColumnRow
          key={col.key}
          col={col}
          onMoveUp={() => {
            if (!onMove || absIdx <= 1) return
            onMove(col.key, absIdx - 1)
          }}
          onMoveDown={() => {
            if (!onMove || absIdx >= columns.length - 1) return
            onMove(col.key, absIdx + 1)
          }}
          disableMoveUp={absIdx <= 1}
          disableMoveDown={absIdx >= columns.length - 1}
          deleting={deletingKey === col.key}
          {...dragHandlers}
        />
      )
    }

    return (
      <BuiltInColumnRow
        key={col.key}
        col={col}
        onToggle={onToggle}
        onToggleFull={onToggleFull}
        onUpdate={onUpdate}
        onMoveUp={() => {
          if (!onMove || absIdx <= 1) return
          onMove(col.key, absIdx - 1)
        }}
        onMoveDown={() => {
          if (!onMove || absIdx >= columns.length - 1) return
          onMove(col.key, absIdx + 1)
        }}
        disableMoveUp={absIdx <= 1}
        disableMoveDown={absIdx >= columns.length - 1}
        affectsTotals={TOTAL_AFFECTING_COLUMNS.has(col.key)}
        {...dragHandlers}
      />
    )
  })}
```

### Scope of Change

- **File:** `src/components/ColumnManager.tsx` only
- **Lines affected:** ~40 lines (the two `.map()` blocks and the filter logic above them)
- **Props unchanged:** All callback signatures remain identical
- **State unchanged:** No changes to `useInvoiceColumns` or any domain logic
- **Behavioral change:** Custom columns now render at their correct position in the state array

### Why Option A is Preferred

- Smallest possible change (one file, ~40 lines)
- No new props, no new state, no new abstractions
- Preserves all existing behavior for built-in columns
- Custom columns gain correct visual ordering
- The `builtinCols` and `customCols` filter variables can be removed (they become unused)

---

## 6. Regression Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Built-in column rendering changes | Low | Medium | The `BuiltInColumnRow` props remain identical; only the loop structure changes |
| Custom column rendering changes | Low | Low | Custom columns already render correctly via `CustomColumnRow`; only their position changes |
| Drag-and-drop between built-in and custom | Low | Medium | Drag handlers already work across types (they use key-based lookup via `columns.findIndex`) |
| Waybill behavior changes | Low | Low | Waybill uses the same `ColumnManager` component; the fix applies equally |
| Persistence order changes | None | None | Persistence already saves the full `columns` array in state order |
| Hydration order changes | None | None | Hydration already preserves custom column order via `resolveFinancialColumns` |
| PDF column order changes | None | None | PDF generation already respects state order via `getPdfColumns` |
| Description position lock | None | None | Description is rendered separately as `FixedColumnRow` and excluded from the loop |
| Financial column behavior | None | None | `TOTAL_AFFECTING_COLUMNS` set is unchanged; `affectsTotals` prop is unchanged |
| Existing saved documents | None | None | Custom column positions in existing documents are already correct in the database; the rendering fix just makes them visible |

### Key Safety Property

The `description` column is excluded from the loop (rendered separately as `FixedColumnRow`). This preserves the position-0 lock without any additional logic.

The `disableMoveUp` for all columns (both built-in and custom) uses `absIdx <= 1`, which prevents any column from moving above position 1 (where `description` sits at position 0). This is correct and unchanged.

---

## 7. Final Determination

**Classification: Confirmed Bug**

The rendering code in `ColumnManager.tsx` splits columns into two groups and renders them sequentially, ignoring the state order. This is a rendering-layer defect — the state management, persistence, hydration, and PDF generation all correctly handle custom column ordering.

**Risk assessment: Low-risk**

The proposed fix changes only the rendering loop structure in `ColumnManager.tsx`. No props, state, callbacks, domain logic, persistence, hydration, or PDF behavior is affected. The change is approximately 40 lines in a single file.

STOP — Custom column reordering fix is not authorized in this pass.
