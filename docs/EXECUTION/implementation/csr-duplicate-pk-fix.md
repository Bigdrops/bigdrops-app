# CSR Duplicate Fix — Omit Primary Key Instead of Sending NULL

This report was written by MiMoCode on 2026-07-13 via Local Runner.

---

## Runtime Trace

Complete execution path from user action to database error:

```
IdentityLockDialog (CsrFormPage.tsx:528)
  └─ "Duplicate Current Changes" button
     └─ onDuplicate → handleDuplicateFromEditable (CsrFormPage.tsx:241)
        └─ navigate('/csr/new', { state: { duplicateState: { csr: {..., id: <uuid>}, ... } } })
           └─ NewCSR page loads (CsrFormPage mode='create')
              └─ useState(() => duplicateState.csr) → csr.id = <original uuid>
                 └─ User saves → handleSave (CsrFormPage.tsx:335)
                    └─ sanitizeCsrInsertPayload({ ...csr, ... })
                       └─ CSR_TABLE_COLUMNS.has('id') = true
                       └─ null !== undefined = true  (if id: null)
                       └─ sanitized.id = null (or original uuid)
                          └─ createCsr → supabase.from('csrs').insert([{ ...id: ... }])
                             └─ PostgreSQL: duplicate key / not-null constraint violation
```

---

## Root Cause

`handleDuplicateFromEditable` deep-cloned the entire `csr` state object and passed it via route state to the new CSR page. The clone included `id` — the database primary key uuid from the original CSR.

When the duplicate was saved, `handleCreate` spread `...csr` into `sanitizeCsrInsertPayload`. The sanitizer kept `id` because:
- `'id'` is in `CSR_TABLE_COLUMNS` (csrService.ts:65)
- `null !== undefined` evaluates to `true` (line 86)

So `id` was included in the INSERT payload. PostgreSQL either:
- Rejected with `duplicate key violates unique constraint "csrs_pkey"` (if uuid existed), or
- Rejected with `null value in column "id" violates not-null constraint` (if set to `null`)

---

## Why `id: null` Was Incorrect

PostgreSQL's `DEFAULT gen_random_uuid()` only fires when the column is **omitted** from the INSERT statement. When `id: null` is explicitly included, PostgreSQL treats it as an explicit `NULL` value — which violates the NOT NULL constraint on the column. The DEFAULT is never reached.

The correct approach is to ensure `id` is completely absent from the INSERT payload, not set to any value.

---

## Final Fix

Two surgical changes in `src/pages/CsrFormPage.tsx`:

### 1. `handleDuplicateFromEditable` — strip `id` before passing via route state

```tsx
// Before
const handleDuplicateFromEditable = useCallback(() => {
  navigate('/csr/new', {
    state: {
      duplicateState: {
        csr: {
          ...JSON.parse(JSON.stringify(csr)),
          id: null,  // ← WRONG: sends NULL to PostgreSQL
          client_id: '',
          client_name: '',
          csr_number: '',
        },
        ...
      },
    },
  })
}, [...])

// After
const handleDuplicateFromEditable = useCallback(() => {
  const { id: _origId, ...csrWithoutId } = JSON.parse(JSON.stringify(csr))
  navigate('/csr/new', {
    state: {
      duplicateState: {
        csr: {
          ...csrWithoutId,  // ← id is completely absent
          client_id: '',
          client_name: '',
          csr_number: '',
        },
        ...
      },
    },
  })
}, [...])
```

### 2. Create-path payload — strip `id` before sanitization

```tsx
// Before
const csrData = sanitizeCsrInsertPayload({
  ...csr,  // ← includes id from state
  project_id: validatedProject?.id || null,
  ...
})

// After
const { id: _id, ...csrFields } = csr
const csrData = sanitizeCsrInsertPayload({
  ...csrFields,  // ← id is completely absent
  project_id: validatedProject?.id || null,
  ...
})
```

This ensures `id` is never present in the object passed to `sanitizeCsrInsertPayload`, so it cannot appear in the INSERT payload. PostgreSQL's `DEFAULT gen_random_uuid()` generates a fresh uuid for the new record.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CsrFormPage.tsx` | Strip `id` from duplicate state (line 242) and create-path payload (line 368) |

---

## Verification

| Gate | Command | Status |
|------|---------|--------|
| Audit | `bun run audit:load` | PASS — no new warnings |
| Typecheck | `tsc --noEmit` | PASS — zero errors |

---

## Behaviour Preserved

- CSR Edit Law: untouched
- IdentityLockDialog: untouched
- Invoice / Quotation / Waybill: untouched
- Prefix engine / number generation: untouched
- Audit trail: untouched
- Database schema: untouched
- PDF generation: untouched
- CSR edit save: untouched
- CSR create from blank: untouched (id is always undefined from `createDefaultCsr`, so stripping it is a no-op)

---

## Remaining Risks

1. **Edit-path `id` in update payload**: The edit save path still spreads `...csr` which includes `id`. `updateCsr` uses `eq('id', id)` separately, so having `id` in the update payload is harmless (it updates the primary key to the same value). This is pre-existing and does not cause issues.

2. **`sanitizeCsrInsertPayload` allows `id`**: The sanitizer's `CSR_TABLE_COLUMNS` set includes `'id'`. For creates, this is now mitigated by stripping `id` before the call. A future improvement could remove `id` from the allowlist entirely, but that would require auditing all update paths first.
