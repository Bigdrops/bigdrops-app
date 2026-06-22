# Waybill PDF UI Fixes — Work Report

**Date:** 2026-06-22
**Scope:** 4 UI/rendering fixes across 9 files (7 templates + 2 page callers)

---

## Task 1: Template Picker → Card Style

**Files:** `src/pages/ViewWaybill.tsx`

**Change:** Replaced inline `<button>` list (lines 293–318) with a horizontal scrollable card-style picker matching the CSR `DocumentTemplatePicker` pattern from `DocumentDesignControls.tsx`.

- Each card is `w-[150px]` with a thumbnail preview area (80px white bar with 3 animated bars), template name label, and a `CheckCircle2` icon badge on the selected card
- Selected card gets `ring-2 ring-bd-button-primary-bg ring-offset-2` highlighting
- Added imports: `CheckCircle2` from `lucide-react`, `cn` from `@/lib/utils`
- Uses `no-scrollbar` and `overflow-x-auto` for horizontal scroll

---

## Task 2: Qty/Unit → qtyLabel

**Files:** `src/pages/ViewWaybill.tsx`, `src/pages/NewWaybill.tsx`

**Change:** Both callers now:
1. Filter out `quantity` and `unit` from `STANDARD_ITEM_COLUMNS` before passing to `buildWaybillRenderModel`
2. Add a single `{ key: 'qtyLabel', label: 'Qty/Unit' }` column entry
3. Respect existing column visibility: if either `quantity` or `unit` was hidden, `qtyLabel` is also hidden

The engine (`buildRows()` in `engine/resolvers/table.ts`) already produces `cells.qtyLabel` as the merged string (e.g., `"2 pcs"`, `"4"`). Templates dynamically render whatever columns the engine produces — no template changes needed.

---

## Task 3: Page Breaks (wrap + fixed)

**Files:** All 7 templates (`GreenTemplate.tsx`, `MinimalTemplate.tsx`, `ThermalTemplate.tsx`, `ClassicTemplate.tsx`, `SplitTemplate.tsx`, `PremiumTemplate.tsx`, `IndustryTemplate.tsx`)

**Changes per template:**

| Template | `fixed` on table header | `wrap={false}` on signature |
|---|---|---|
| Green | `S.tableHeaderRow` | `S.sigRow` |
| Minimal | `S.tableHeaderRow` | `S.sigRow` |
| Thermal | `S.tableHeaderRow` | `S.block` (outer ack wrapper) |
| Classic | `S.tableHeaderRow` | `S.sigRow` |
| Split | `S.tableHeaderRow` | `S.sigRow` |
| Premium | `S.tableHeaderRow` | `S.sigRow` |
| Industry | `S.tableHeaderRow` | `S.sigBlock` |

- `fixed` on table header rows ensures column headers repeat on every page when tables span multiple pages
- `wrap={false}` on signature sections prevents signatures from splitting across page breaks

---

## Task 4: SplitTemplate Header Compact

**File:** `src/components/waybill/SplitTemplate.tsx`

**Changes:**
- `banner` style `padding`: 12 → 8 (reduces vertical space)
- `bannerLogo` style: added `overflow: 'hidden'` to prevent logo distortion

---

## Verification

- `bun run typecheck`: ✅ Passed with zero errors
- `bun run lint`: ✅ No new lint errors (6 pre-existing `any`/unused-vars issues in ViewWaybill.tsx)
- `bun run audit:load`: ✅ No new audit warnings

## Files Modified

| File | Lines Changed | Change |
|---|---|---|
| `src/pages/ViewWaybill.tsx` | ~45 | Template picker + Qty/Unit columns |
| `src/pages/NewWaybill.tsx` | 1 | Qty/Unit columns |
| `src/components/waybill/GreenTemplate.tsx` | 2 | `fixed` + `wrap={false}` |
| `src/components/waybill/MinimalTemplate.tsx` | 2 | `fixed` + `wrap={false}` |
| `src/components/waybill/ThermalTemplate.tsx` | 2 | `fixed` + `wrap={false}` |
| `src/components/waybill/ClassicTemplate.tsx` | 2 | `fixed` + `wrap={false}` |
| `src/components/waybill/SplitTemplate.tsx` | 4 | `fixed` + `wrap={false}` + compact header |
| `src/components/waybill/PremiumTemplate.tsx` | 2 | `fixed` + `wrap={false}` |
| `src/components/waybill/IndustryTemplate.tsx` | 2 | `fixed` + `wrap={false}` |

## Constraints Honored

- ✅ `src/lib/Calculations.ts` — not touched
- ✅ Engine (`src/domain/waybill/engine/`) — not touched
- ✅ Template rendering rules — all 10 engine contract rules still obeyed
- ✅ Green, Minimal, Thermal correctness preserved
- ✅ No templates removed
- ✅ No new libraries introduced
- ✅ CSR system not touched
- ✅ `STANDARD_ITEM_COLUMNS` in `waybillContract.ts` not modified
- ✅ `blankWaybillTemplate.tsx` not modified
