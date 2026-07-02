# CSR Duplicate Key Fix — `23505` on `idx_csrs_csr_number_unique`

## Date
2026-06-22

## Problem
CSR creation failed with `23505 duplicate key value violates unique constraint "idx_csrs_csr_number_unique"`. Supabase logs showed repeated POST retries, and changing the CSR number in the UI did not help.

## Root Cause (Two Bugs)

### Bug 1: Unordered query in `regenerateValue`
**File:** `src/pages/NewCSR.tsx:311-314`

```typescript
const { data: rows } = await supabase.from('csrs').select('csr_number')
return getNextCsrNumber(rows?.[rows.length - 1]?.csr_number || null, ...)
```

PostgREST returns rows with **no guaranteed ordering** unless `.order()` is specified. Taking `rows[rows.length - 1]` from an unordered set produced a non-deterministic "latest" number. Each retry could generate a different colliding number.

Compare with `waybillMutations.ts:89-93` which correctly uses `.order('created_at', { ascending: false }).limit(1000)`.

### Bug 2: `insertFn` overwrites user's CSR number
**File:** `src/pages/NewCSR.tsx:307-309`

```typescript
async (candidateNumber: string) => {
  csrData.csr_number = candidateNumber  // ← always overwrites
```

And `withUniqueRetry` calls `regenerateValue()` **before the first attempt** (line 13 in `withUniqueRetry.ts`), so even the initial insert ignored whatever number the user typed in the form.

## Changes Made

### 1. `src/lib/withUniqueRetry.ts`
Added optional `initialValue` parameter. When provided, the first insert attempt uses this value instead of calling `regenerateValue()`. Existing callers are unaffected.

### 2. `src/pages/NewCSR.tsx:311-319`
- Fixed `regenerateValue` to query with `.order('created_at', { ascending: false }).limit(1)` — deterministically gets the latest CSR number
- Passed `csr.csr_number` as `initialValue` — first attempt uses the user's current form value; only retries regenerate

## What to Check

1. **Create a new CSR online** — verify the number from the autofill is used on first save attempt
2. **Manually change the CSR number** in the form, then save — verify your custom number is respected
3. **Concurrent creation race** — open two tabs, get the same next number, save one, then save the other. The second should retry with the next sequential number and succeed
4. **Edit CSR** — still works (uses `updateCsr` directly, was not affected)
5. **Offline CSR drafts** — still works (separate path, was not affected)
6. **Blank CSR download** — still works (separate path, was not affected)
7. **Other modules still using `withUniqueRetry`** (Invoice, Quotation, Waybill, RFQ) — verify they still compile and work (the `initialValue` parameter is optional)
