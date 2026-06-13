# Prompt 0 of 3 — Waybill Form Fixes

**Commit:** `f56eb74`
**Date:** 2026-06-13

## Changes Made

### FIX 1: Table Settings stuck open with row override
- **Removed** the always-visible inline `ColumnManager` section (was lines 480–518) from `WaybillForm.tsx`
- This section was permanently rendered on the page regardless of `showTableSettings` state, causing the "stuck open" appearance
- The custom modal at the bottom of the file (controlled by `showTableSettings` state) remains — it has its own column visibility/titles UI without using `ColumnManager`
- Row override section is eliminated because `ColumnManager` is no longer rendered inline

### FIX 2: Replace custom FAB with Invoice's exact save buttons
- **Deleted** the custom sticky bottom bar FAB (was lines 703–722) with `Loader2`/`Save` icons
- **Imported** `FormFooter` from `@/components/document/FormFooter`
- **Added** `<FormFooter onCancel={onClose} onSaveDraft={handleSave} onSaveSent={handleSave} onFloatingSave={handleSave} saving={saving} primaryLabel="Save Waybill" />`
- This matches the Invoice form's save button pattern exactly (floating circle button + bottom bar with Cancel/Draft/Save + keyboard shortcut)
- Removed unused `Loader2` and `Save` icon imports from lucide-react

## Files Changed
- `src/components/waybill/WaybillForm.tsx` — 9 insertions, 63 deletions

## Verification
- `bun run typecheck` — passed cleanly (0 errors)
- Pushed to origin: `main -> main` (`f56eb74`)
