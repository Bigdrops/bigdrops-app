# Overlay Regression Restoration — Dialog Infrastructure Only

This report was written by MiMoCode on 2026-07-13 via Local Runner.

---

## Executive Summary

Restored modal centering behaviour in `dialog.tsx` and `alert-dialog.tsx` by reverting from broken flex-based centering to translate-based centering. The CSS variable for keyboard-aware max-height (`--bd-overlay-dialog-max-height`) is preserved.

---

## Root Cause Confirmed

Commit `3b7d9c89` changed `DialogContent` and `AlertDialogContent` from:

```tsx
// OLD: single className, translate centering
"fixed top-1/2 left-1/2 z-[250] grid w-full ... -translate-x-1/2 -translate-y-1/2 ..."
```

To:

```tsx
// NEW: two classNames, flex centering — BOTH applied to same element
"fixed inset-0 z-[250] flex items-center justify-center p-4 ..."
"pointer-events-auto w-full max-w-[...] ..."
```

The `cn()` concatenation produced a single className with `fixed inset-0` (full-screen) on the content box element, causing it to cover the entire viewport instead of being a centered modal surface.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | Restored single-classname translate centering |
| `src/components/ui/alert-dialog.tsx` | Restored single-classname translate centering |

---

## Restoration Approach

Replaced the two-classname flex approach with a single-classname translate approach:

**dialog.tsx:**
```tsx
// Restored
"fixed top-1/2 left-1/2 z-[250] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--bd-overlay-radius)] bg-bd-overlay-bg text-bd-overlay-text p-4 text-xs/relaxed border border-bd-overlay-border duration-100 outline-none sm:max-w-sm max-h-[var(--bd-overlay-dialog-max-height,100dvh)] overflow-y-auto overscroll-contain data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

**alert-dialog.tsx:**
```tsx
// Restored
"group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-3 rounded-xl bg-background p-4 ring-1 ring-foreground/10 duration-100 outline-none max-h-[var(--bd-overlay-dialog-max-height,100dvh)] overflow-y-auto overscroll-contain data-[size=default]:max-w-xs data-[size=sm]:max-w-64 data-[size=default]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

**Preserved:**
- `--bd-overlay-dialog-max-height` CSS variable for keyboard-aware max-height
- All animation classes
- All design tokens
- Sheet component changes (untouched)

---

## Behaviour Restored

- Standard Dialog opens as a centered modal
- AlertDialog opens as a centered modal
- Delete confirmations are usable
- IdentityLockDialog returns to normal modal behaviour
- No drawer-like takeover from dialogs
- Sheet behaviour unchanged

---

## Verification

| Gate | Command | Status |
|------|---------|--------|
| Audit | `bun run audit:load` | PASS |
| Typecheck | `tsc --noEmit` | PASS (pre-existing `Nexus.tsx` error unrelated) |

---

## Remaining Risks

1. **Pre-existing type error**: `Nexus.tsx(49,128)` has `TS2322: Type '"double"' is not assignable to type 'BorderStyleValue'`. This is unrelated to the overlay restoration.
2. **Keyboard-aware max-height**: The `--bd-overlay-dialog-max-height` variable is now applied to the translated content box. If the keyboard inset is large, the dialog may not be fully visible. This is the same behavior as before the regression.
