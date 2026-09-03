# Sortable Mobile Drag Fix — Implementation Report

**Task:** Fix mobile drag-and-drop across ALL business tables
**Date:** 2026-06-30
**Risk:** Very Low
**Scope:** Platform-level component fix (single file)

---

## 1. Sortable Template System Role

The canonical sortable pattern is defined in `docs/templates/React-temps/sortable.tsx`. It demonstrates the intended API using REUI components (`Sortable`, `SortableItem`, `SortableItemHandle` from `@/components/reui/sortable`).

**Reality:** The REUI sortable abstraction does NOT exist in the codebase (`src/components/reui/sortable*` — no files found). Production code uses `@dnd-kit/core` and `@dnd-kit/sortable` directly.

---

## 2. Consumer Locations

All sortable tables share a single `DndContext` provider:

| Consumer | File | Line |
|----------|------|------|
| **SharedDocumentForm** (Invoice + Quotation) | `src/components/document/SharedDocumentForm.tsx:202` | `<FormLineItems ...>` |
| **WaybillForm** | `src/components/waybill/WaybillForm.tsx:573` | `<FormLineItems ...>` |

**No other `DndContext` exists in the codebase.** `FormLineItems.tsx` is the single source of truth for all drag behavior.

---

## 3. Root Cause Analysis

### Bug Location
`src/components/document/FormLineItems.tsx:94-98`

### Root Cause
The `useSensors` configuration only registered `PointerSensor`:

```tsx
// BEFORE (broken)
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
)
```

**`TouchSensor` was entirely missing.**

`PointerSensor` relies on pointer events which don't reliably fire on mobile touch devices. Without `TouchSensor`, mobile users cannot initiate drag on any sortable table — Invoice, Quotation, or Waybill.

### Why This Is System-Wide
Because `FormLineItems` is the shared DndContext provider used by ALL document forms, the missing `TouchSensor` affected every business table in the platform simultaneously.

---

## 4. Fix Strategy

### Approach: Shared System Fix (lowest safe layer)

Added `TouchSensor` to the existing sensor configuration in `FormLineItems.tsx`.

```tsx
// AFTER (fixed)
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,        // ← added
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(TouchSensor, {           // ← added
    activationConstraint: { delay: 250, tolerance: 5 },
  }),
)
```

### Configuration Details
- **`delay: 250`** — Long-press (250ms) initiates drag, preventing conflict with scroll gestures
- **`tolerance: 5`** — Allows 5px finger movement during the long-press without canceling drag
- **`distance: 8`** (PointerSensor) — Unchanged; prevents accidental drags on desktop click

---

## 5. Risk Assessment

| Risk | Level | Reason |
|------|-------|--------|
| Desktop regression | Very Low | PointerSensor unchanged; TouchSensor only activates on touch devices |
| Business logic impact | None | No logic changes; only sensor configuration |
| Type safety | None | TouchSensor is a typed export from `@dnd-kit/core` |
| Lint | None | 0 new lint errors (18 pre-existing `any` type warnings) |
| Scope creep | None | Single file, 4 lines added |

---

## 6. Verification

- [x] `bun run typecheck` — passes (zero errors)
- [x] `bun run lint` on modified file — 0 new errors (18 pre-existing)
- [x] Desktop PointerSensor unchanged
- [x] No duplicated drag logic introduced
- [x] Template remains single source of truth (unchanged)
- [x] Invoice, Quotation, Waybill all inherit the fix automatically
- [ ] Manual mobile testing required (cannot verify in CI)

---

## 7. What Was NOT Changed

- `SortableLineItem.tsx` — untouched (correctly passes `attributes` and `listeners` to drag handle)
- `MobileItemCard.tsx` — untouched (correctly applies `dragHandleProps`)
- `SharedDocumentForm.tsx` — untouched (correctly renders `<FormLineItems>`)
- `WaybillForm.tsx` — untouched (correctly renders `<FormLineItems>`)
- No CSS changes — `@dnd-kit`'s `TouchSensor` handles `touch-action` automatically
- No new dependencies — `TouchSensor` is already bundled with `@dnd-kit/core`

---

## 8. Manual Testing Checklist

After deployment, verify on a physical mobile device:

1. **Invoice form** — Long-press grip handle → drag item up/down → release
2. **Quotation form** — Same as above
3. **Waybill form** — Same as above
4. **Desktop** — Click and drag grip handle → works as before (no regression)
5. **Scrolling** — Regular touch scroll still works (not intercepted by drag)
