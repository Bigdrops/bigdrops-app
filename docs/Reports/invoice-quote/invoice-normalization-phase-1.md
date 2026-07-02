# Invoice Normalization — Phase 1: Shared Form Page

**Date:** 2026-07-02

## Summary

Consolidated `NewInvoice.tsx` (878 lines) and `EditInvoice.tsx` (848 lines) into a single shared `InvoiceFormPage.tsx` orchestration component with a `mode: 'create' | 'edit'` prop. Both pages are now thin wrappers (~3 lines each).

## Files Changed

| File | Lines Before | Lines After | Change |
|------|-------------|-------------|--------|
| `src/pages/NewInvoice.tsx` | 878 | 3 | Rewrote as wrapper calling `<InvoiceFormPage mode="create" />` |
| `src/pages/EditInvoice.tsx` | 848 | 3 | Rewrote as wrapper calling `<InvoiceFormPage mode="edit" />` |
| `src/pages/InvoiceFormPage.tsx` | — | 1127 | New file: shared orchestration component |

## What Was Done

1. **Created `InvoiceFormPage.tsx`** containing:
   - All shared interfaces (`InvoiceFormFields`, `InvoiceGroup`, `LocationState`)
   - All shared state variables (items, groups, custom fields, extra charges, PDF output, etc.)
   - All shared item/group handlers (`updateItem`, `addItem`, `removeItem`, `moveItem`, `addGroup`, `updateGroupName`, `toggleGroupSubtotal`, `deleteGroup`, `addItemToGroup`, `insertItemAfter`, `addUngroupedItem`, `resetItemOverrides`)
   - All shared custom field/extra charge handlers
   - All shared effects (create-mode init, edit-mode load, shared signatories/bank accounts load)
   - Shared `handleSave` with `isCreate`/`isEdit` branches for: validation, payload building, Supabase insert vs update, items delete+insert vs insert-only, audit trail (CREATE vs UPDATE events)
   - Shared render method with mode-specific loading guard and title/labels
   - `useCallback` wrapping on all handlers (matching NewInvoice's explicit style)

2. **Fixed import** — Added `ensureUiKey` to the import from `useInvoiceColumns` (was being used on line 180 for prefill items but not imported)

3. **Key mode-specific code paths** separated by `if (isCreate)` / `if (isEdit)` guards with no conditional hook violations

## Mode Differences Preserved

| Aspect | Create Mode | Edit Mode |
|--------|------------|-----------|
| State init | Prefill or defaults | `null` (loaded async) |
| Invoice number | Generated via `getNextInvoiceNumber` | From DB (never updated) |
| Loading state | `false` | `true` until load completes |
| Save operation | `supabase.insert()` with `withUniqueRetry` | `supabase.update()` by `id` |
| Items save | Insert only | Delete-all + re-insert |
| Audit events | `recordInvoiceCreated` + CREATE audit log | UPDATE audit log |
| Notes/terms | Always normalized | Only if changed vs snapshot |

## Behavioral Verification

Verified against `docs/STANDARD/document-transformation-standard.md`:
- **Edit Law**: Identity immutability unchanged (domain/service layer, not page)
- **Duplicate Law**: Unchanged (handled in document-view layer)
- **Revert Law**: Unchanged (handled in document-view layer)
- **Audit trail**: Identical timing, payloads, event types
- **Document numbering**: Same `getNextInvoiceNumber` + `resolvePrefix` call
- **Lineage**: Not modified (no identity field changes in edit mode)

## Verification

- `bun run audit:load` — only pre-existing warnings
- `bun run typecheck` — passes with no errors

## Next Steps (Phase 2)

Extract shared state + handlers from `InvoiceFormPage.tsx` into a dedicated `useInvoiceForm` hook (distinct from the existing `useInvoiceForm.js` utility file).
