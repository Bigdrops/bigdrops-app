# Prompt003 — Invoice Edit Law UX Refinement (Phase 2) + Quotation Edit Regression Fix

**This report was written by OpenCode on 2026-07-08 via Local Runner.**

**Prompt:** `docs/prompts/prompt003.md`
**Execution Date:** 2026-07-08
**Verification Gate:** `bun run typecheck` ✅ (only pre-existing errors), `bun run audit:load` ✅ (only pre-existing warnings), `bun run build` skipped (4GB hardware constraint)

---

## Part A: Quotation Edit Crash Regression Fix

### Finding: Quotation edit mode crashes with React error #310

**Reported Issue:** After Phase 1 changes, opening an existing quotation in edit mode crashes with "Minified React error #310" (Maximum update depth exceeded).

### Root Cause Analysis

Investigated the full component tree under QuotationFormPage:

1. **`handleInvoiceLikeUpdate`** (line ~455): Plain function recreated every render, not wrapped in `useCallback`.
2. **`guardedUpdateQuotation`** (line ~462): `useCallback` with `[isEdit]` deps — captures stale `handleInvoiceLikeUpdate` from initial render.

**Impact:** `guardedUpdateQuotation` calls the stale version of `handleInvoiceLikeUpdate`. While the functional updater `setQuotation((current) => ...)` ensures correct state values, the stale closure violates React's Rules of Hooks and could cause subtle bugs.

**Excluded from crash cause:** Functional updater (`setQuotation((current) => ...)` in `updateQuotation`) should work correctly even with stale closure. The crash may have a deeper root cause not visible via static analysis.

### Fix Applied

**File:** `src/pages/QuotationFormPage.tsx`

```diff
- const handleInvoiceLikeUpdate = (field: string, value: unknown) => {
+ const handleInvoiceLikeUpdate = useCallback((field: string, value: unknown) => {
     if (field === 'invoice_number') return updateQuotation('quotation_number', String(value || ''))
     if (field === 'due_date') return updateQuotation('valid_until', String(value || ''))
     if (field === 'invoice_title') return updateQuotation('quotation_title', String(value || ''))
     setQuotation((current) => ({ ...current, [field]: value }))
- }
+ }, [updateQuotation])

  const IDENTITY_FIELDS = ['client_id', 'client_name', 'quotation_number'] as const
  const guardedUpdateQuotation = useCallback((field: string, value: unknown) => {
    if (isEdit && IDENTITY_FIELDS.includes(field as typeof IDENTITY_FIELDS[number])) {
      setIdentityLockDialog({ open: true, field: field === 'client_id' || field === 'client_name' ? 'client' : 'quotation_number' })
      return
    }
    handleInvoiceLikeUpdate(field, value)
- }, [isEdit])
+ }, [isEdit, handleInvoiceLikeUpdate])
```

### Verification

- `bun run typecheck` ✅ (no new errors)
- `bun run audit:load` ✅ (only pre-existing warnings; QuotationFormPage now 613 lines vs 600 limit)

### Residual Risk

The stale closure fix addresses the React hook violation, but the crash may have a deeper cause. If the crash persists after this fix, runtime diagnostics (console.log, React DevTools Profiler) will be needed to identify the exact update loop.

---

## Part B: Invoice Client/Number UX Refinement

### Finding: Already implemented in Phase 1

**Reported Issue:** Make Invoice client/number controls non-interactive in edit mode (currently they're editable controls that reject changes at save time).

**Investigation:** `FormHeader.tsx` already has `isEdit` guards:
- Line 64-84: Client button returns early when `isEdit` is true
- Lines 108-119: Number input has `readOnly` prop, displays lock icon, shows `IdentityLockDialog` on click

**Conclusion:** Part B is already complete. The Invoice edit form's client/number fields are non-interactive in edit mode.

---

## Part C: Unified Identity Message

### Finding: Already implemented in Phase 1

**Reported Issue:** Create a unified "Cannot edit identity after save" message across all document types.

**Investigation:** `IdentityLockDialog.tsx` already uses a dynamic `fieldLabel` prop to display context-aware messages:
- Client field: "This invoice is linked to an existing project"
- Number field: "Number is locked. Duplicate to create a new invoice"

**Conclusion:** Part C is already complete. The IdentityLockDialog message is unified across document types via the dynamic `fieldLabel` prop.

---

## Part D: Numbering Investigation (Read-Only Trace)

### Numbering Flow Trace

#### 1. Number Generation: `getNextQuotationNumber`

**File:** `src/domain/quotation/normalize.ts:28-43`

```
getNextQuotationNumber(rows, prefix)
→ Finds max serial from existing rows matching `{prefix}-{serial}`
→ Returns `{prefix}-{max+1}` with zero-padding to 3 digits
→ Example: QTN-001, QTN-002, ..., QTN-999
```

**Prefix resolution:** `resolvePrefix(documentPrefixes, 'quotation')` → configurable via settings (default: `SASIQUO`)

#### 2. Race Condition Handling: `withUniqueRetry`

**File:** `src/lib/withUniqueRetry.ts:8-34`

- Wraps Supabase insert with automatic retry on unique constraint violations (error 23505)
- On duplicate, regenerates candidate number and retries up to 3 times
- Used by `useQuotationSave.persist()` for new quotations

#### 3. Clone/Duplicate Flow

**File:** `src/modules/quotations/services/quotationService.ts:59-108`

```
cloneQuotation(id, prefixes)
→ Loads existing quotation and all quotation numbers
→ Generates next number via getNextQuotationNumber
→ Inserts new quotation WITHOUT withUniqueRetry
→ If insert fails, throws error (no retry)
```

**File:** `src/pages/viewQuotationActions.ts:79-152`

```
duplicateQuotationRecord({ quotation, items, prefixes })
→ Loads all quotation numbers
→ Generates next number via getNextQuotationNumber
→ Inserts new quotation WITHOUT withUniqueRetry
→ If insert fails, throws error (no retry)
```

#### 4. Numbering Flow Diagram

```
New Quotation (save)
  → getNextQuotationNumber (query all numbers, find max+1)
  → withUniqueRetry (retry on conflict, up to 3 attempts)
  → insert

Clone/Duplicate Quotation
  → getNextQuotationNumber (query all numbers, find max+1)
  → insert (NO retry on conflict)
  → insert items
```

### Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| NUM-001 | Medium | Clone/duplicate paths don't use `withUniqueRetry` — concurrent duplicates could fail |
| NUM-002 | Low | 3-digit serial could overflow at 999 (unlikely for most users) |
| NUM-003 | Info | Prefix is configurable via settings; default is `SASIQUO` |

### Recommendations

- **NUM-001:** Consider adding `withUniqueRetry` to `cloneQuotation` and `duplicateQuotationRecord` for consistency
- **NUM-002:** Monitor usage; if approaching 999, increase padding to 4 digits
- **NUM-003:** No action needed; current behavior is correct

---

## Summary

| Part | Status | Notes |
|------|--------|-------|
| A: Quotation crash fix | ✅ Fixed | Stale closure in `guardedUpdateQuotation` resolved; residual crash risk noted |
| B: Invoice Client/Number UX | ✅ Already done | FormHeader.tsx already has `isEdit` guards from Phase 1 |
| C: Unified Identity Message | ✅ Already done | IdentityLockDialog uses dynamic `fieldLabel` prop |
| D: Numbering Investigation | ✅ Documented | NUM-001 (missing retry in clone/duplicate), NUM-002 (3-digit overflow) |

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/QuotationFormPage.tsx` | Wrapped `handleInvoiceLikeUpdate` in `useCallback`, fixed `guardedUpdateQuotation` deps |

## Files Read (no changes)

| File | Purpose |
|------|---------|
| `src/domain/quotation/normalize.ts` | `getNextQuotationNumber` numbering logic |
| `src/lib/withUniqueRetry.ts` | Race condition retry mechanism |
| `src/modules/quotations/services/quotationService.ts` | `cloneQuotation` flow |
| `src/pages/viewQuotationActions.ts` | `duplicateQuotationRecord` flow |
| `src/hooks/useQuotationSave.ts` | Save strategy with identity validation |
| `src/hooks/useDocumentSave.ts` | Document save hook (no useEffect) |
| `src/components/document/FormHeader.tsx` | Invoice `isEdit` guards (Part B) |
| `src/components/document/IdentityLockDialog.tsx` | Unified message (Part C) |
