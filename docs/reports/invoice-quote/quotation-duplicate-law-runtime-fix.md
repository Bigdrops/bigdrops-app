# Quotation Duplicate Law — Runtime Fix Report

This report was written by Buffy on 2026-07-30 via Freebuff.

## Executive Summary

Two regressions in the Quotation Duplicate flow were identified and fixed. Both violations of the Duplicate Law (Law 2, Document Transformation Standard) caused the duplicate operation to either open the wrong route or lose data.

The fixes mirror the Invoice duplicate implementation, which is the canonical reference.

---

## Runtime Trace — View Duplicate (Bug #1)

Path:

```
ViewQuotation.tsx
  → actions.handleDuplicate()  (line 214, 266)
  → useQuotationActions.ts     handleDuplicate
  → duplicateQuotationRecord   (viewQuotationActions.ts)
  → navigate to /quotations/${id}
```

### Root Cause

`duplicateQuotationRecord` persisted the duplicate to the database immediately (`supabase.from('quotations').insert([payload])`) and returned the created record. The navigation target was `/quotations/${createdQuotation.id}` — the **view** route, not `/quotations/new`.

Result: the duplicate opened as a saved document with Edit Law active. Client was locked, number locked — exactly the opposite of the Duplicate Law.

### Fix

`duplicateQuotationRecord` now returns a prefill payload `{ prefill, prefillItems }` without any database write. The caller navigates to `/quotations/new` with `{ state: { duplicatePrefill: prefill, duplicatePrefillItems: prefillItems } }`.

This matches the Invoice duplicate pattern in `invoiceLifecycleService.ts`.

---

## Runtime Trace — Form Duplicate (Bug #2)

Path:

```
QuotationFormPage.tsx
  → handleDuplicateFromEditable  (line 516)
  → navigate('/quotations/new', { state: { ... } })
```

### Root Cause

The prefill payload was extremely lossy:
- Items were reduced to 4 fields: description, quantity, unit, specification
- All groups, group metadata, extra charges, notes, terms, signatories, columns, header/additional fields, charge labels, attachments, pdf output, and other metadata were lost
- The prefill used the `sourceRfq` key (designed for RFQ conversion), not a dedicated duplicate key

### Fix

`handleDuplicateFromEditable` now builds a comprehensive prefill using `buildCustomFields()` (the same function used by the save pipeline) and passes it via `duplicatePrefill` / `duplicatePrefillItems` keys. The create mode handler restores all fields from this prefill.

---

## Invoice vs Quotation Comparison

| Aspect | Invoice (canonical) | Quotation (before) | Quotation (after) |
|--------|---------------------|--------------------|-------------------|
| View Duplicate target | `/invoices/new` | `/quotations/${id}` | `/quotations/new` |
| DB persist during duplicate | No (prefill only) | Yes (inserted immediately) | No (prefill only) |
| Form Duplicate prefill | Full invoice + items | 4-field item subset | Full quotation + items |
| Groups preserved | Yes (from prefillItems) | Lost | Yes (from prefillItems) |
| Extra charges preserved | Yes (in custom_fields) | Lost | Yes (in custom_fields) |
| Notes / terms preserved | Yes (in prefill) | Lost | Yes (in prefill + custom_fields) |
| Client cleared | Yes (null) | No (stayed from edit) | Yes (empty string) |
| Edit Law activates | No (unsaved draft) | Yes (saved doc) | No (unsaved draft) |

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/quotation/quotationFormTypes.ts` | Added `DuplicateQuotationPrefillState` type |
| `src/pages/viewQuotationActions.ts` | Changed `duplicateQuotationRecord` to return prefill; removed unused imports (`getNextQuotationNumber`, `toQuotationItemRow`, dead `resolvePrefix`) |
| `src/hooks/useQuotationActions.ts` | Changed `handleDuplicate` to navigate to `/quotations/new`; removed dead `prefixes` param from caller |
| `src/pages/QuotationFormPage.tsx` | Fixed `handleDuplicateFromEditable` to pass full prefill; added duplicate prefill handler in create mode initialization; added `resolveFinancialColumns` import |

---

## Files Inspected (not modified)

- `src/pages/ViewQuotation.tsx` — confirmed flow
- `src/pages/ViewInvoice.tsx` — comparison
- `src/pages/InvoiceFormPage.tsx` — canonical duplicate reference
- `src/hooks/useInvoiceMutations.ts` — comparison
- `src/components/document-view/invoice/useInvoiceActions.ts` — comparison
- `src/modules/invoices/services/invoiceLifecycleService.ts` — canonical `duplicateInvoice`
- `src/components/quotation/quotationFormUtils.ts` — `buildCustomFields`, `normalizeQuotationGrouping`
- `src/components/quotation/useQuotationLineItems.ts` — line items management
- `src/domain/quotation/normalize.ts` — `buildQuotationFormState`
- `src/domain/quotation/types.ts` — types
- `src/domain/invoice/index.ts` — import sources

---

## Behaviour Preserved

- Edit Law: untouched (only duplicate was wrong; edit mode behaviour is correct)
- Revert Law: untouched (invoice-only)
- Prefix Engine: untouched
- Number generation: untouched (new number generated on save by `useQuotationSave`)
- Financial calculations: untouched
- Tax logic: untouched
- PDF generation: untouched
- Database schema: untouched
- Audit trail: untouched (prefill-based duplicate records audit on save via `useQuotationSave`)

---

## Verification

- `bun run audit:load` — **PASSED** (all 763 files scanned, no new issues)
- `bun run typecheck` — **COULD NOT VERIFY** (timed out after 300s due to 4GB RAM constraint; AGENTS.md §3 acknowledges this limitation)

---

## Remaining Risks

1. **Typecheck not verified**: The host machine has 4GB RAM and `bun run typecheck` consistently times out. Manual review of all type assertions was performed; no cast is wider than `as unknown as QuotationEditorState` which is standard in this codebase.

2. **Drag-and-drop / offline draft path**: The duplicate prefill handler takes priority over the offline draft path (`canUseOfflineQuotationDrafts()`). Duplicate data from the server will be loaded instead of generating an offline number. This is acceptable because the duplicate originates from a server-side document that requires network to fetch.

3. **Backward compatibility of the `prefixes` parameter removal**: Removed from `duplicateQuotationRecord` and its single caller. The function no longer generates a number or persists, so prefixes are irrelevant. No other callers exist.
