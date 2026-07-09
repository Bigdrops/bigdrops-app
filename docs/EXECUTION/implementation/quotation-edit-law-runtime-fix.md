# Quotation Edit Law + React #310 Runtime Fix

**Date:** 2026-07-09
**Author:** OpenCode
**Tool Harness:** Local Runner (opencode CLI)
**Prompt:** Manual debug session for `docs/Tickets/quote-edit-crash.md`

---

## Scope

1. **PART A — React #310 Hook Order Violation:** `QuotationFormPage` crashed on edit load because `if (loading) return` (line 449) caused hooks defined after the early return (lines 463-541) to be skipped on initial render, breaking React's Rules of Hooks.
2. **PART B — Quotation Edit Law:** Verify and ensure identity field locking (Law 1 per Document Transformation Standard) mirrors Invoice's complete implementation.

---

## Root Cause Analysis

### React #310 Mechanism

The `QuotationFormPage` component had:

```typescript
// ... 86 hooks (lines 55-446)

if (loading) {        // line 448 — early return
  return <Layout>Loading quotation...</Layout>
}

// Non-hook object
const invoiceLikeQuotation = { ... }

// 19 useCallback/useMemo hooks (lines 463-541)
const handleInvoiceLikeUpdate = useCallback(...)
const guardedUpdateQuotation = useCallback(...)
const handleLockedFieldClick = useCallback(...)
const handleSetInvoiceTitle = useCallback(...)
const handleUpdateItem = useCallback(...)
// ... etc
const handleDuplicateFromEditable = useCallback(...)
```

When `loading=true` (initial render), the component returned at line 535 (after move). Hooks at lines 455-533 were **not called**. When `loading=false` (data loaded), those same hooks **were called**. React detected hook index 87 transitioning from `undefined` → `useCallback` between renders, triggering error #310.

**Console evidence** from `docs/Tickets/quote-edit-crash.md`:

```
Hook index 87: [previous render: undefined] → [next render: useCallback]
  at QuotationFormPage (QuotationFormPage.tsx:~463)
```

### Quotation Edit Law Gap

Although `guardedUpdateQuotation` and `IdentityLockDialog` were already implemented, they were located *after* the early return and thus never executed on initial render. Once the hooks were moved before the early return, the Edit Law became functional and already matches Invoice's implementation.

---

## Fix Applied

### File Modified

`src/pages/QuotationFormPage.tsx`

### Change 1: Move all hooks before early return

The following were moved from *after* `if (loading) return` to *before* it:

| Variable | Type | Line (after fix) |
|---|---|---|
| `invoiceLikeQuotation` | Plain object (derived state) | 448 |
| `handleInvoiceLikeUpdate` | `useCallback` | 455 |
| `IDENTITY_FIELDS` | Const array | 462 |
| `guardedUpdateQuotation` | `useCallback` (Edit Law guard) | 463 |
| `handleLockedFieldClick` | `useCallback` | 471 |
| `handleSetInvoiceTitle` | `useCallback` | 475 |
| `handleUpdateItem` | `useCallback` | 477 |
| `handleAddHeaderField` | `useCallback` | 482 |
| `handleUpdateHeaderField` | `useCallback` | 484 |
| `handleRemoveHeaderField` | `useCallback` | 487 |
| `handleAddAdditionalField` | `useCallback` | 489 |
| `handleUpdateAdditionalField` | `useCallback` | 491 |
| `handleRemoveAdditionalField` | `useCallback` | 494 |
| `handleChargeLabelChange` | `useCallback` | 496 |
| `handleAddExtraCharge` | `useCallback` | 498 |
| `handleUpdateExtraCharge` | `useCallback` | 500 |
| `handleRemoveExtraCharge` | `useCallback` | 503 |
| `handleClearInvalidRow` | `useCallback` | 505 |
| `handleSave` | `useCallback` | 507 |
| `memoizedSignatories` | `useMemo` | 509 |
| `handleDuplicateFromEditable` | `useCallback` | 516 |

All these are stable handler/memo definitions — safe to create before loading completes. They are only *invoked* after loading finishes.

The `if (loading) return` block and `pageTitle` remain in their original positions after the hooks.

### Edit Law Comparison: Invoice vs Quotation

| Aspect | Invoice | Quotation |
|---|---|---|
| `IDENTITY_FIELDS` | `client_id, client_name, invoice_number, document_type` | `client_id, client_name, quotation_number` |
| `guardedUpdateX` wrapper | `guardedUpdateInvoice` at line 287 | `guardedUpdateQuotation` at line 463 |
| Identity field interception | Opens `IdentityLockDialog` | Opens `IdentityLockDialog` |
| `handleLockedFieldClick` | Sets dialog state with `field` param | Sets dialog state with `field` param |
| `updateInvoice` prop on `SharedDocumentForm` | `guardedUpdateInvoice` | `guardedUpdateQuotation` |
| `onLockedFieldClick` prop | `isEdit ? handleLockedFieldClick : undefined` | `isEdit ? handleLockedFieldClick : undefined` |
| `IdentityLockDialog` rendered | In edit mode with `handleDuplicateFromEditable` | In edit mode with `handleDuplicateFromEditable` |

Quotation correctly excludes `document_type` from `IDENTITY_FIELDS` — quotations don't have a `document_type` field. All other aspects match.

### No Changes to Edit Law Logic

The Quotation Edit Law code (`guardedUpdateQuotation`, `handleLockedFieldClick`, `IdentityLockDialog` rendering) was already correctly implemented in a previous phase. The only issue was its placement after the early return, making it unreachable on initial render. Moving these hooks before the early return resolved both the crash and activated the Edit Law.

---

## Verification Gate

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ PASS (only pre-existing errors in `MinimalTemplate.tsx`, `ThermalTemplate.tsx`) |
| `bun run audit:load` | ✅ PASS (no new issues from modified file) |

---

## Files Modified

| File | Change |
|---|---|
| `src/pages/QuotationFormPage.tsx` | Moved 21 hook definitions and 1 derived object from after `if (loading) return` to before it (lines 448-533). Removed duplicate copies left after the early return (previous lines 543-628). |

---

## Deferred Work

- **CSR/Waybill Edit Law enforcement** — Not in scope
- **`setQuotation` direct calls** — `setQuotation` is still exposed and could bypass `guardedUpdateQuotation`; defence-in-depth via `assertIdentityImmutable` on save covers this
- **`document_type` for quotation** — Quotations don't have this field, so N/A
