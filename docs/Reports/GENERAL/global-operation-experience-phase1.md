# Global Operation Experience — Phase 1 Implementation Report

This report was written by OpenCode on 2026-07-19 via Local Runner.

## Scope

Replaced fragmented loading UX (spinners, "Loading...", button loaders) with a unified global operation overlay for high-visibility quotation operations. Phase 1 focused on the infrastructure and quotation module migration.

## Deliverables

### 1. OperationOverlay (`src/components/ui/OperationOverlay.tsx`)

Premium bottom-center overlay replacing the previous bare-bones implementation.

- **Smooth enter/exit:** CSS transitions with `requestAnimationFrame` gating for reliable animation firing on mount
- **Reduced motion:** Respects `prefers-reduced-motion: reduce` — disables spin and transition animations
- **Three visual states:** Active (spinner), Success (checkmark), Error (X icon) — each using Clinical Design System tokens (`bd-status-success-*`, `bd-status-danger-*`)
- **Auto-dismiss:** 1.8s on success, 3s on error (handled by `OperationContext`)
- **ARIA:** `role="status"`, `aria-live="polite"`, `aria-atomic="true"` for screen reader announcements

### 2. OperationContext (`src/context/OperationContext.tsx`)

Already existed with `start/update/finish` API. No changes needed — the existing single-operation model fits current requirements.

### 3. Quotation Actions Migration (`src/hooks/useQuotationActions.ts`)

5 operations wired to the global operation system:

| Operation | Overlay Title | Overlay Description |
|---|---|---|
| Convert to Invoice | Creating Invoice | Transferring quotation information... |
| Archive | Archiving Document | Updating company records... |
| Delete | Deleting Document | Removing from records... |
| Duplicate | Duplicating Quotation | Creating copy... |
| Update Status | Updating Status | Updating quotation status... |

Local `useState` booleans (`converting`, `archiving`, etc.) retained for button disabling — they serve a separate purpose from visual feedback.

### 4. App Root Wiring (`src/main.tsx`)

`OperationProvider` wraps `<App />` and `<OperationOverlay />` sits as a sibling, both inside `ThemeProvider`.

## What Was Not Changed

- Business logic, backend, permissions, routing, numbering, audit
- Clipboard copy, share sheet, CSV download (instant operations — toasts remain appropriate)
- Page skeleton loading (untouched per spec)
- `AppLoadingStates.tsx` (skeleton components unchanged)

## Files Modified

| File | Change |
|---|---|
| `src/components/ui/OperationOverlay.tsx` | New file — premium overlay |
| `src/context/OperationContext.tsx` | New file — operation state (existed uncommitted) |
| `src/hooks/useQuotationActions.ts` | Added `useOperation` import + 5 operation start/finish calls |
| `src/main.tsx` | Added `OperationProvider` + `OperationOverlay` to root |

## Verification

- `bun run typecheck` — passed
- `git status` — 2 modified, 2 untracked (all intended)
- `bun run audit:load` — skipped (no data-layer/schema/query changes)

## Deferred Work

- Migrate invoice actions, waybill actions, import/export, PDF generation, uploads
- Consider stacked/queued operations if concurrent ops become a real use case
- Consider replacing `ButtonLoading` pattern with operation context for consistency across all modules
