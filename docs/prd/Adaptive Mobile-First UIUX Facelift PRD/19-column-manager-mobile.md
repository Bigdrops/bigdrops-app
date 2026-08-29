# Column Manager — Mobile Redesign

> Status: Draft
> Last updated: 2026-08-29
> Depends on: `06-component-patterns.md`, `07-forms.md`, `15-interaction-model.md`, `21-surfaces-and-overlays.md`

---

## 1. Purpose

Redesign the Column Manager (`src/components/ColumnManager.tsx`) for Android. The current implementation has desktop-sized touch targets and HTML5 drag-and-drop that fails on touch screens.

---

## 2. Current State Audit

The Column Manager is a bottom sheet (721 lines) that controls column visibility, labels, ordering, and custom columns for invoice/quotation line-item tables.

### Touch Target Audit

| Element | Current Size | Android Minimum | Status |
|---------|-------------|-----------------|--------|
| Drag grip handle | 14×20px | 44×44px | ❌ Fail |
| Reorder up chevron | 18×14px | 44×44px | ❌ Fail |
| Reorder down chevron | 18×14px | 44×44px | ❌ Fail |
| Visibility toggle (Eye icon) | 30×28px | 44×44px | ❌ Fail |
| Totals toggle (Check/X) | 30×28px | 44×44px | ❌ Fail |
| Delete button (X) | 30×28px | 44×44px | ❌ Fail |
| Close button | ~40×40px | 44×44px | ⚠️ Borderline |
| Add Custom Column button | Full-width, 38px height | 44px | ⚠️ Borderline |
| Done button | Full-width, 54px height | 44px | ✅ Pass |

### Reorder Mechanism Audit

| Aspect | Current State | Problem |
|--------|--------------|---------|
| Mechanism | HTML5 `draggable` + `onDragStart`/`onDragOver`/`onDrop` | Does not work on Android touch screens |
| Visual affordance | 6-dot grip handle, 14×20px | Too small to see or touch |
| Alternative | Up/down chevron buttons, 18×14px each | Too small to tap |

---

## 3. Target State

### Design Principles

1. Every interactive element meets or exceeds 44×44px touch target
2. Reordering uses a touch-native pattern (not HTML5 drag events)
3. Same information density — no features removed
4. Same bottom-sheet container — no layout restructure needed

### Touch-Native Reordering

Replace HTML5 drag-and-drop with a **long-press-to-grab, drag-to-reorder** pattern. This is the standard Android reordering pattern (used in Settings, Gmail labels, etc.).

**How it works:**

1. User long-presses a column row (500ms)
2. Row "lifts" — gains elevation shadow and slightly scales up
3. Haptic feedback fires (25ms pulse)
4. User drags the row up or down
5. Other rows animate to make space
6. User releases — row drops into position, shadow reduces
7. Reorder callback fires

**Implementation approach:** Use `@dnd-kit/core` with `useSortable` and `SortableContext` — already installed in the project (`@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2` in `package.json`). The `@dnd-kit` library supports touch sensors via `useSensor(TouchSensor)` with configurable activation constraints (distance, delay). This is a mature, well-maintained library that already handles the touch-to-drag pattern correctly on mobile.

### Updated Layout

#### Column Row (Built-in)

```
┌──────────────────────────────────────────────────┐
│  ☰ (44×44)  Column Label Input     [👁 44×44]  │
│             Num/Text badge          [✓/✗ 44×44] │
└──────────────────────────────────────────────────┘
```

| Element | New Size | Notes |
|---------|----------|-------|
| Reorder handle (☰) | 44×44px | Replaces grip dots. Horizontal lines icon. Long-press activates drag. |
| Label input | Flex-1 (remaining width) | Height 40px, unchanged |
| Type badge | Shrink-0, inline | "Num" or "Text" pill |
| Visibility toggle | 44×44px | Eye icon button |
| Totals toggle | 44×44px | Check/X icon button (numeric columns only) |

#### Column Row (Custom)

```
┌──────────────────────────────────────────────────┐
│  ☰ (44×44)  Column Label Input     [👁 44×44]  │
│             Text badge              [🗑 44×44]  │
└──────────────────────────────────────────────────┘
```

| Element | New Size | Notes |
|---------|----------|-------|
| Reorder handle | 44×44px | Same as built-in |
| Label input | Flex-1 | Height 40px |
| Visibility toggle | 44×44px | Same as built-in |
| Delete button | 44×44px | Trash icon, replaces X |

#### Removed Elements

| Element | Removal Reason |
|---------|---------------|
| Up/down chevron buttons | Replaced by drag-to-reorder |
| Grip handle (6-dot grid) | Replaced by drag handle (☰ icon) |

The up/down chevrons and grip handle were both redundant reorder affordances that were too small. The single drag handle (☰) is sufficient and meets touch targets.

### Information Density Preserved

All current features remain:

| Feature | Status |
|---------|--------|
| Column label editing | ✅ Kept |
| Visibility toggle (Eye/EyeOff) | ✅ Kept |
| Totals toggle (Check/X for numeric columns) | ✅ Kept |
| Custom column add/delete | ✅ Kept |
| Row overrides section (VAT/discount/install) | ✅ Kept |
| Reset to defaults | ✅ Kept |
| Install rate formula editor | ✅ Kept |
| "Standard PDF" description section | ✅ Kept |

---

## 4. Visual Specification

### Sheet Container

The Column Manager sheet follows the canonical overlay standard defined in `21-surfaces-and-overlays.md`. All sheet presentation rules (radius, shadow, z-index, animation, dismiss behavior, back-button integration) are defined there. This document does not own any overlay-presentation decisions.

The Column Manager uses a bottom sheet with `side="bottom"` and `max-h-[var(--bd-overlay-sheet-max-height)]`. Its specific customizations are:
- Header with title and close button
- Scrollable body with column rows
- Footer with Done button

### Column Row Properties

| Property | Current | Target |
|----------|---------|--------|
| Min height | 46px | 56px |
| Padding | 10px 7px | 12px 8px |
| Gap between elements | 8px | 8px |
| Border | 1px bottom, soft | 1px bottom, soft (unchanged) |

### Drag Handle

| Property | Value |
|----------|-------|
| Size | 44×44px |
| Icon | `GripVertical` from Lucide (3 horizontal lines) |
| Icon size | 18×18px |
| Color | `var(--bd-text3)` |
| Active state | `var(--bd-text)` |
| Cursor | `grab` → `grabbing` when dragging |

### Visibility Toggle

| Property | Value |
|----------|-------|
| Size | 44×44px |
| Border radius | 10px |
| Border | 1px solid `var(--bd-border)` |
| Background | `var(--bd-surface)` when shown, `var(--bd-bg2)` when hidden |
| Icon | `Eye` / `EyeOff`, 16×16px |

### Totals Toggle

| Property | Value |
|----------|-------|
| Size | 44×44px |
| Border radius | 10px |
| Border | 1px solid `var(--bd-border-soft)` |
| Background (shown) | `green-50`, icon `green-700` |
| Background (hidden) | `red-50`, icon `red-600` |
| Icon | `Check` / `X`, 16×16px |

### Delete Button (Custom Columns)

| Property | Value |
|----------|-------|
| Size | 44×44px |
| Border radius | 10px |
| Border | 1px solid `var(--bd-rose-border)` |
| Background | `var(--bd-rose-bg)` |
| Icon | `Trash2`, 16×16px |

### Drag State

| Property | Value |
|----------|-------|
| Dragged row shadow | `0 8px 24px rgba(15,23,42,0.15)` |
| Dragged row scale | `1.02` |
| Dragged row opacity | `0.95` |
| Placeholder | Dashed border, `var(--primary-soft)` background, same height as row |

---

## 5. Interaction Rules

| Action | Behavior |
|--------|----------|
| Long-press on drag handle | Activate drag mode, haptic feedback |
| Drag up/down | Row follows finger, other rows animate |
| Release | Row drops into new position, reorder callback fires |
| Tap on visibility toggle | Toggle column display (unchanged) |
| Tap on totals toggle | Toggle column from totals calculation (unchanged) |
| Tap on label input | Focus input for editing (unchanged) |
| Tap on delete (custom) | Delete custom column with animation (unchanged) |
| Tap "Add Custom Column" | Add new custom column (unchanged) |
| Tap "Reset to defaults" | Show confirmation dialog (unchanged) |
| Tap "Done" | Close sheet (per `21-surfaces-and-overlays.md` dismiss rules) |
| Back button while sheet is open | Close sheet (per `21-surfaces-and-overlays.md` §6) |

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Touch targets | All interactive elements ≥ 44×44px |
| Screen reader | Reorder handle: `aria-label="Drag to reorder"`, `role="button"` |
| Screen reader | Visibility toggle: `aria-label="Toggle column visibility"`, `aria-pressed` |
| Screen reader | Totals toggle: `aria-label="Toggle column in totals"`, `aria-pressed` |
| Screen reader | Delete: `aria-label="Delete custom column"` |
| Reduced motion | Drag animation reduced to instant position change |
| Focus management | Focus returns to drag handle after reorder completes |

---

## 7. Implementation Notes

### @dnd-kit Configuration

```typescript
import { useSensor, useSensors, TouchSensor, MouseSensor } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 500,   // 500ms long-press to activate
      tolerance: 8, // 8px movement tolerance before cancel
    },
  }),
  useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,  // 8px drag distance to activate (desktop)
    },
  })
);
```

### Replacing the Current Drag System

The current implementation uses raw HTML5 drag events (`onDragStart`, `onDragOver`, `onDrop`) in `GripHandle` and `BuiltInColumnRow`/`CustomColumnRow`. The `@dnd-kit` approach replaces this with:

1. Wrap column list in `SortableContext`
2. Each column row becomes a `useSortable` item
3. Remove all `draggable`, `onDragStart`, `onDragOver`, `onDrop` props
4. Remove `GripHandle` component entirely
5. Remove `ReorderButtons` component entirely
6. Add `DragOverlay` for the dragged row visual

### Bundle Impact

`@dnd-kit/core` and `@dnd-kit/sortable` are already installed. No new dependencies needed.
