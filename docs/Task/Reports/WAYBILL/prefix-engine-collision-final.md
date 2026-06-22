# Prefix Engine: Steps 11-13 — Collision Retry Utility + Quotation Prefix Fix + Blank CSR Downloads

## Status: ✅ COMPLETE

**Date:** 2026-06-16
**Prompt:** prompt604 (Steps 11-13)

---

## Changes Made

### CHANGE 1: `src/lib/withUniqueRetry.ts` (NEW)
Shared collision retry utility for all document types. Takes an `insertFn` (called with a candidate number) and a `regenerateValue` function. On Postgres error `23505` (unique constraint), regenerates the number and retries up to `maxRetries` times. On any other error, returns immediately without retry.

### CHANGE 2a: `src/components/quotation/QuotationForm.tsx` — Fix hardcoded SASQ
- Added `useSettings` import and `resolvePrefix` import
- Replaced hardcoded `SASQ` at line 283 (initial number generation) with `resolvePrefix(settings?.document_prefixes, 'quotation')`
- Replaced hardcoded `SASQ` at line 552 (collision bump) with `resolvePrefix(settings?.document_prefixes, 'quotation')`
- Added `settings?.document_prefixes` to the useEffect dependency array

### CHANGE 2b: `src/components/quotation/QuotationForm.tsx` — Wrap insert with withUniqueRetry
- Replaced the inline `quoteQuery` / `await quoteQuery` with `withUniqueRetry` wrapper
- On retry, regenerates the quotation number by querying existing rows and calling prefix-aware generation
- Edit mode (update) is not wrapped — collision only applies to inserts

### CHANGE 3a: `src/pages/NewInvoice.tsx` — Wrap insert with withUniqueRetry
- Added `withUniqueRetry` import
- Wrapped the insert at lines 595-599 with `withUniqueRetry`
- On retry, regenerates the invoice number via `getNextInvoiceNumber()` with org prefix
- Added explicit `as Promise<{ data: any; error: any }>` type cast to fix TS2339

### CHANGE 3b: `src/pages/NewRfq.tsx` — Wrap insert with withUniqueRetry
- Added `withUniqueRetry` import
- Wrapped the insert at lines 26-30 with `withUniqueRetry`
- On retry, regenerates the RFQ number via `getNextRfqNumber()` with org prefix

### CHANGE 3c: `src/pages/NewCSR.tsx` — Wrap CSR save with withUniqueRetry
- Added `withUniqueRetry` import
- Removed the pre-save duplicate check (manual `select` + early return)
- Replaced `createCsr(csrData)` with direct `supabase.from('csrs').insert(...)` wrapped in `withUniqueRetry`
- On retry, regenerates the CSR number via `getNextCsrNumber()` with org prefix
- Added `handleDownloadBlankCsr` function (CHANGE 4b)

### CHANGE 3d: `src/domain/waybill/waybillMutations.ts` — Wrap insert with withUniqueRetry
- Added `withUniqueRetry` import
- Wrapped the `mode === 'new'` insert at line 75 with `withUniqueRetry`
- On retry, regenerates the waybill number via `getNextWaybillNumber()` with org prefix

### CHANGE 4a: `src/pages/NewWaybill.tsx` — Blank waybill download
- Already wired correctly — line 52 uses `resolvePrefix(settings?.document_prefixes, 'waybill')`
- No changes needed

### CHANGE 4b: `src/pages/NewCSR.tsx` — Blank CSR download handler + UI
- Added `handleDownloadBlankCsr` function: generates number, inserts into `blank_csr_logs`, triggers PDF download
- Added `onDownloadBlank` prop to `CsrFormScreen` component
- Added Download icon button next to the floating Save button (desktop only)
- Wired `onDownloadBlank={handleDownloadBlankCsr}` in NewCSR.tsx

---

## Verification

| Check | Status | Notes |
|---|---|---|
| `bun run audit:load` | ✅ PASS | No new warnings from changes |
| `bun run typecheck` | ✅ PASS | Clean — zero errors |
| `bun run lint` | ✅ PASS | All errors pre-existing (1306 total, 0 new) |

---

## Files Modified

| File | Action |
|---|---|
| `src/lib/withUniqueRetry.ts` | Created |
| `src/components/quotation/QuotationForm.tsx` | Fixed SASQ hardcoded prefix, wrapped insert |
| `src/pages/NewInvoice.tsx` | Wrapped insert with retry |
| `src/pages/NewRfq.tsx` | Wrapped insert with retry |
| `src/pages/NewCSR.tsx` | Wrapped insert with retry, added blank download handler |
| `src/domain/waybill/waybillMutations.ts` | Wrapped insert with retry |
| `src/components/csr/CsrFormScreen.tsx` | Added `onDownloadBlank` prop + Download button |

---

## Architecture Summary

```
withUniqueRetry(insertFn, regenerateValue, maxRetries=3)
  ├── Query existing rows
  ├── Regenerate candidate number (org prefix-aware)
  ├── Call insertFn(candidateNumber)
  ├── If error.code === '23505' → regenerate + retry
  ├── If other error → return immediately
  └── If success → return { data, error: null }
```

**Doc types now covered:**
- ✅ Project: built-in retry in `createProjectWithGeneratedCode()` (unchanged)
- ✅ Waybill: `withUniqueRetry` in `waybillMutations.ts`
- ✅ Quotation: `withUniqueRetry` in `QuotationForm.tsx`
- ✅ Invoice: `withUniqueRetry` in `NewInvoice.tsx`
- ✅ RFQ: `withUniqueRetry` in `NewRfq.tsx`
- ✅ CSR: `withUniqueRetry` in `NewCSR.tsx`
