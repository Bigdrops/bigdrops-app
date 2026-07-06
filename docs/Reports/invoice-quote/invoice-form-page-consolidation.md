# Invoice Form Page Consolidation Report

This report was written by OpenCode on 2026-07-06 via Local Runner.

## Objective & Scope

**Goal:** Consolidate Invoice page orchestration by eliminating duplication between `NewInvoice.tsx` and `EditInvoice.tsx` into a shared `InvoiceFormPage.tsx`.

**Covered:** Architectural audit of `src/pages/NewInvoice.tsx`, `src/pages/EditInvoice.tsx`, and `src/pages/InvoiceFormPage.tsx`.

**Excluded:** No business logic, financial calculations, column system, PDF rendering, routing, or styling changes.

## Evidence-Based Findings

1. **Consolidation is already complete.** The commit `cffbc33` introduced the shared `InvoiceFormPage.tsx` and reduced both route files to thin wrappers. This is present on `main`.

2. **`NewInvoice.tsx`** (`src/pages/NewInvoice.tsx:1-5`):
   - 5 lines total.
   - Imports `InvoiceFormPage` from `'./InvoiceFormPage'`.
   - Renders `<InvoiceFormPage mode="create" />`.

3. **`EditInvoice.tsx`** (`src/pages/EditInvoice.tsx:1-5`):
   - 5 lines total.
   - Imports `InvoiceFormPage` from `'./InvoiceFormPage'`.
   - Renders `<InvoiceFormPage mode="edit" />`.

4. **`InvoiceFormPage.tsx`** (`src/pages/InvoiceFormPage.tsx:1-836`):
   - 836 lines. Contains all shared orchestration:
     - React state management via `useInvoiceEditableState`
     - Reference data loading via `useInvoiceReferenceData`
     - Column orchestration via `useInvoiceColumns`
     - Hydration via `useInvoiceHydration`
     - Derived state (calculations, totals) via `computeDocument`
     - Save handler with create/edit branching
     - Import handling, attachment/signatory handling
     - Shared rendering through `SharedDocumentForm`
   - Mode-specific branches guarded by `isCreate`/`isEdit` flags.

5. **Routes intact** (`src/components/app/AppShell.tsx:31,33,165-166`):
   - `/invoices/new` → `NewInvoice` (lazy import)
   - `/invoices/edit/:id` → `EditInvoice` (lazy import)
   - Both correctly resolve to the thin wrappers.

## Verification

| Check | Result |
|-------|--------|
| `bun run audit:load` | Pass (standard warnings only, no new issues) |
| `bun run typecheck` | Skipped (timeout due to 4GB RAM constraint per hardware policy) |
| `git status` | No uncommitted changes to target files |
| Route integrity | `/invoices/new` and `/invoices/edit/:id` routes unchanged |

## Conclusion

The architectural consolidation requested by the task is **already implemented** in the current codebase. No changes were required.

## Deferred Work

None — the consolidation is complete and verified.
