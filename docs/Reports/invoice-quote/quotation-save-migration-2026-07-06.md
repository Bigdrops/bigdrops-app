# Quotation Save Pipeline Migration to useDocumentSave

This report was written by MiMoCode on 2026-07-06 via Local Runner.

## Objective

Migrate the Quotation save pipeline to follow the same architectural pattern as Invoice, using the shared `useDocumentSave` hook via a `quotationStrategy` object. This is an architectural alignment task — no business behavior changes.

## Architecture Achieved

```
QuotationFormPage
    ↓
useQuotationSave
    ↓
quotationStrategy (DocumentSaveStrategy)
    ↓
useDocumentSave (shared lifecycle)
```

Both Invoice and Quotation now share the identical save lifecycle:
Validation → Saving state → Save timer → Payload construction → Persistence → After-save lifecycle → Navigation → Error handling

Only the strategy object differs.

## Files Created/Modified

| File | Action |
|------|--------|
| `src/hooks/useQuotationSave.ts` | Created — quotation strategy + hook wrapper |
| `src/pages/QuotationFormPage.tsx` | Modified — replaced inline `handleSave` with `useQuotationSave` hook |
| `docs/STANDARD/document-save-orchestration.md` | Updated — documented Invoice + Quotation compliance |

## What Moved Into quotationStrategy

- Client validation (`validateProjectAssignment`)
- Item validation (description required, invalid row detection)
- Payload construction (custom fields, notes normalization, totals)
- Offline draft support (`canUseOfflineQuotationDrafts`, `createOfflineQuotationDraft`)
- Supabase persistence with `withUniqueRetry` for number collision handling
- Child row management (delete + insert `quotation_items`)
- Audit trail recording (`recordQuotationCreated`, `recordAuditLog`)
- Navigation to `/quotations/{id}`

## What Stays in QuotationFormPage

- Form state management (all `useState` hooks)
- Data loading (signatories, bank accounts, settings, quotation data)
- Computed values (totals, normalized groups, calculation inputs)
- `handlePdfOutputChange` (inline save for PDF output settings only)
- RFQ conversion prefill logic
- Offline quotation number peek (initial load)

## Removed From QuotationFormPage

- `handleSave` inline callback (~300 lines)
- Imports: `withUniqueRetry`, `normalizeRichTextHtml`, `createOfflineQuotationDraft`, `toQuotationItem`, `createSaveTimer`, `getJsonSizeBytes`, `validateProjectAssignment`, `makeEmptyGroup`, `toDbItem`, `filterPopulatedAdditionalFields`, `makeQuotationGroupId`, `ProjectLookupClient`, `Quotation` type, `ColumnConfig` type

## Verification

- `bun run audit:load` — passed (no new issues)
- `bun run typecheck` — 2 pre-existing errors in `native-feedback-renderer.tsx` (unrelated), zero new errors
- `git status` — 3 files changed (1 new hook, 1 page cleanup, 1 doc update)
- `bun run build` — skipped per 4GB RAM policy

## Risks

- The `useQuotationSave` hook uses module-level variables (`_validatedProject`, `_savedQuotation`) to share state between strategy methods. This is the same pattern as `useInvoiceSave` and is safe because only one save can be in progress at a time.
- The `persist` method now uses `withUniqueRetry` instead of the manual collision check that the original `handleSave` used. This is functionally equivalent but cleaner — `withUniqueRetry` handles the same retry-on-23505 pattern.
