# Overlay Regression Investigation

This report was written by MiMoCode on 2026-07-13 via Local Runner.

---

## Executive Summary

A global UI regression was introduced in commit `3b7d9c89` (2026-07-12). This commit changed the centering mechanism in `dialog.tsx` and `alert-dialog.tsx` from translate-based to flex-based centering. The new implementation incorrectly applies TWO className strings to the same `DialogPrimitive.Content` element — one for a full-screen overlay and one for the content box — causing the content box to cover the entire screen instead of being a centered modal.

**Root cause**: The `cn()` concatenation in `DialogContent` and `AlertDialogContent` now produces a single className that includes both `fixed inset-0` (full-screen) and `pointer-events-auto w-full max-w-[...]` (content box) on the same element. The old code used a single className string with translate centering.

---

## Regression Timeline

| Commit | Date | Change |
|--------|------|--------|
| `fefa9c41` | Last known good | Dialog uses translate-based centering |
| `3b7d9c89` | 2026-07-12 | **Regression introduced** — changed dialog centering mechanism |

**Single responsible commit**: `3b7d9c89`

Commit message: "docs(reports): add overlay keyboard stability PR-2 report"
Actual changes: Modified 21 files including `dialog.tsx`, `alert-dialog.tsx`, and 16 Sheet/overlay components.

---

## Commit Analysis

### What `3b7d9c89` Changed

**Intended changes** (per commit message):
- Replace 19 hardcoded `vh` values with `--bd-overlay-sheet-max-height` CSS variable
- Replace translate centering with flex centering in dialog/alert-dialog
- Add keyboard-aware overlay max-height CSS variables

**Actual code changes to dialog infrastructure**:

#### `dialog.tsx` — DialogContent

**Before** (single className, translate centering):
```tsx
<DialogPrimitive.Content
  className={cn(
    "fixed top-1/2 left-1/2 z-[250] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--bd-overlay-radius)] bg-bd-overlay-bg text-bd-overlay-text p-4 text-xs/relaxed border border-bd-overlay-border duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
    className
  )}
/>
```

**After** (broken):
```tsx
<DialogPrimitive.Content
  className={cn(
    "fixed inset-0 z-[250] flex items-center justify-center p-4 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
    "pointer-events-auto w-full max-w-[calc(100%-2rem)] sm:max-w-sm max-h-[var(--bd-overlay-dialog-max-height,100dvh)] overflow-y-auto overscroll-contain rounded-[var(--bd-overlay-radius)] bg-bd-overlay-bg text-bd-overlay-text p-4 text-xs/relaxed border border-bd-overlay-border data-open:zoom-in-95 data-closed:zoom-out-95",
    className
  )}
/>
```

**Same pattern applied to `alert-dialog.tsx`** — identical regression.

---

## Root Cause

The `cn()` function concatenates the two className strings into a single className applied to `DialogPrimitive.Content`. The resulting element has:

```
fixed inset-0 z-[250] flex items-center justify-center p-4
pointer-events-auto w-full max-w-[calc(100%-2rem)] sm:max-w-sm
max-h-[var(--bd-overlay-dialog-max-height,100dvh)]
overflow-y-auto overscroll-contain rounded-[...]
bg-bd-overlay-bg ...
```

**Problems:**

1. **`fixed inset-0`** — makes the content box full-screen, covering the entire viewport
2. **Two `p-4` declarations** — duplicated padding (once from overlay class, once from content class)
3. **`pointer-events-auto`** — the content box captures all click events across the full screen
4. **No separation between overlay and content** — the old code had `DialogOverlay` as a separate element AND the content box was centered via translate. Now the content box IS the full-screen element

**Why this causes "side drawer" behavior**: When the content box covers the entire screen (`fixed inset-0`), any Sheet/Drawer that opens behind it is visually occluded. The user sees only the centered content box, but the full-screen capture prevents interaction with elements behind it. If a Sheet is triggered simultaneously (e.g., delete confirmation behind identity lock dialog), the Sheet appears to be "behind" the dialog because the dialog's content box is full-screen.

---

## Affected Components

| Component | File | Impact |
|-----------|------|--------|
| IdentityLockDialog | `src/components/document/IdentityLockDialog.tsx` | Uses `AlertDialog` — affected by `alert-dialog.tsx` regression |
| CSR delete confirmation | `src/pages/ViewCSR.tsx` | Uses `AlertDialog` — affected |
| All Dialog-based modals | Any file using `DialogContent` | Affected |
| All AlertDialog-based confirmations | Any file using `AlertDialogContent` | Affected |

**NOT affected** (Sheet components are independent):
- Sheet/Drawer overlays (`sheet.tsx`) — unchanged centering mechanism
- Action sheets, document sheets, etc. — only received CSS variable updates

---

## Files Responsible

| File | Role |
|------|------|
| `src/components/ui/dialog.tsx` | **Primary culprit** — broken centering on `DialogContent` |
| `src/components/ui/alert-dialog.tsx` | **Primary culprit** — broken centering on `AlertDialogContent` |

---

## Recommended Restoration Strategy

### Option A: Revert dialog centering only (RECOMMENDED)

Revert `dialog.tsx` and `alert-dialog.tsx` to the translate-based centering from `fefa9c41`. Keep the CSS variable changes (`--bd-overlay-dialog-max-height`) but apply them differently — as a max-height on the content box without making it full-screen.

**Scope**: 2 files, ~10 lines changed
**Risk**: Low — restores known-good behavior
**Preserves**: CSS variable system, Sheet component changes

### Option B: Full commit revert

Revert entire commit `3b7d9c89`. This restores all 21 files to the `fefa9c41` state.

**Scope**: 21 files, ~150 lines changed
**Risk**: Medium — loses CSS variable improvements for Sheet components
**Preserves**: Nothing from the commit

### Recommendation

**Option A** is safer. The Sheet component CSS variable changes are valuable and correct. Only the dialog centering mechanism needs to be reverted.

The fix is straightforward:
1. Restore the single-classname approach in `DialogContent` and `AlertDialogContent`
2. Use `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` for centering
3. Optionally apply `max-h-[var(--bd-overlay-dialog-max-height)]` to the content box for keyboard awareness

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Reverting dialog centering breaks keyboard awareness | Low | CSS variable can still be applied to content box max-height |
| Other components depend on the flex-centering approach | None | No other components import or depend on dialog's centering |
| CSS variables become orphaned | None | Variables are still used by Sheet components |
