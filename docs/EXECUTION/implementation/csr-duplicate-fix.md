# CSR Duplicate Fix (Post Edit Law)

This report was written by MiMoCode on 2026-07-13 via Local Runner.

---

## Executive Summary

The "Duplicate Current Changes" flow in the CSR module was inserting a new record with the **same `id` (uuid primary key)** as the original CSR, causing a Postgres `csrs_pkey` unique constraint violation. The root cause is a single missing field clearance in `handleDuplicateFromEditable`. The fix is a one-line addition.

---

## Runtime Trace

Complete execution path from user action to database error:

1. **User clicks "Duplicate Current Changes"** in the `IdentityLockDialog` (CsrFormPage.tsx:527).
2. **`handleDuplicateFromEditable`** fires (CsrFormPage.tsx:241-256):
   - Deep-clones the current `csr` state via `JSON.parse(JSON.stringify(csr))`
   - Clears `client_id`, `client_name`, `csr_number`
   - **Does NOT clear `id`** — the original CSR's database uuid remains in the object
   - Navigates to `/csr/new` with `duplicateState` in route state
3. **NewCSR page loads** (`CsrFormPage` with `mode='create'`):
   - Line 76-77: `useState(() => isCreate ? (duplicateState?.csr || createDefaultCsr(isField)) : ...)`
   - CSR state is initialized from `duplicateState.csr` — **still contains the original `id`**
4. **CSR number auto-generation** fires (line 91-135): generates a fresh `csr_number` — this part works correctly
5. **User saves** → `handleSave` fires (line 335):
   - Line 367-375: `sanitizeCsrInsertPayload({ ...csr, ... })` — spreads the entire `csr` state, **including `id`**
   - `sanitizeCsrInsertPayload` (csrService.ts:83-91) keeps `id` because `'id'` is in `CSR_TABLE_COLUMNS` (line 65)
   - `createCsr` calls `supabase.from('csrs').insert([safeData])` (line 101)
6. **Postgres rejects** the insert because the `id` already exists → `duplicate key value violates unique constraint "csrs_pkey"`

---

## Root Cause

`handleDuplicateFromEditable` (CsrFormPage.tsx:241) copies the entire `csr` state object but only clears identity fields (`client_id`, `client_name`, `csr_number`). The `id` field — the database primary key — is retained.

This contrasts with the working Invoice duplicate flow, where `buildPayload` (useInvoiceSave.ts:232-263) constructs the insert payload explicitly by selecting specific fields, never including `id`.

**Why this didn't surface earlier**: The CSR duplicate flow was recently implemented as part of the Edit Law. The `handleDuplicateFromEditable` function was written to clear the fields mandated by the Duplicate Law (§3.1: client, document number), but the `id` clearance was missed. The Duplicate Law §3.1 explicitly states: "Clear the id."

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CsrFormPage.tsx` | Added `id: null` to the duplicate state object spread in `handleDuplicateFromEditable` |

---

## Fix Applied

**Before** (CsrFormPage.tsx:241-256):
```tsx
const handleDuplicateFromEditable = useCallback(() => {
  navigate('/csr/new', {
    state: {
      duplicateState: {
        csr: {
          ...JSON.parse(JSON.stringify(csr)),
          client_id: '',
          client_name: '',
          csr_number: '',
        },
        // ...
      },
    },
  })
}, [csr, csrMeta, materialsRows, navigate])
```

**After**:
```tsx
const handleDuplicateFromEditable = useCallback(() => {
  navigate('/csr/new', {
    state: {
      duplicateState: {
        csr: {
          ...JSON.parse(JSON.stringify(csr)),
          id: null,
          client_id: '',
          client_name: '',
          csr_number: '',
        },
        // ...
      },
    },
  })
}, [csr, csrMeta, materialsRows, navigate])
```

Setting `id: null` ensures that when the duplicate is saved, `sanitizeCsrInsertPayload` passes `id: null` to the insert payload. Supabase/Postgres ignores `null` primary keys in inserts and generates a new uuid, as the `id` column is defined as `uuid NOT NULL DEFAULT gen_random_uuid()`.

---

## Verification

| Gate | Command | Status |
|------|---------|--------|
| Audit | `bun run audit:load` | ✅ PASS — no new warnings |
| Typecheck | `bun run typecheck` | ✅ PASS — zero errors |

---

## Behaviour Preserved

- Invoice duplicate flow: untouched
- Quotation duplicate flow: untouched
- CSR Edit Law: untouched (identity lock, guarded update, IdentityLockDialog)
- CSR create from blank: untouched
- CSR create from invoice prefill: untouched
- CSR edit save: untouched
- CSR list ordering: untouched
- Prefix engine / number generation: untouched
- Audit trail: untouched
- Database schema: untouched
- PDF generation: untouched

---

## Remaining Risks

1. **Other DB-managed fields**: `created_at` has `DEFAULT now()` in the schema, so it will auto-generate correctly even if the old value is spread. `archived_at` will be `null` (from the spread) which is correct for a new record. No risk identified.

2. **`sanitizeCsrInsertPayload` does not strip `id`**: The sanitizer keeps `id` because it's in `CSR_TABLE_COLUMNS`. This is correct behavior — the sanitizer's job is to prevent unknown columns, not to strip primary keys. The responsibility for clearing `id` lies with the caller (the duplicate flow), which is now fixed.

3. **Invoice comparison**: Invoice's `buildPayload` explicitly constructs the payload without `id`, making it immune to this class of bug. CSR's approach of spreading `...csr` is inherently riskier for future fields. A future improvement could align CSR with Invoice's explicit-payload pattern, but that is out of scope for this surgical fix.
