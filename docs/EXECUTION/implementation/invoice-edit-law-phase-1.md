# Invoice Edit Law Enforcement — Phase 1

**Date:** 2026-07-08
**Author:** OpenCode
**Tool Harness:** Local Runner (opencode CLI)
**Prompt:** `docs/Prompts/prompt705.md`

---

## Scope

Implement Law 1 (Edit Law — Identity Immutability) enforcement for **Invoice only**, per the Document Transformation Standard §2.1.

---

## Baseline Findings Addressed

| ID | Severity | Description | Status |
|---|---|---|---|
| EDIT-INV-000 | Critical | Interaction-time enforcement missing: `updateInvoice` has no mode guard | ✅ FIXED |
| EDIT-INV-001 | Major | `conversionTrail` (lineage) not checked by `assertIdentityImmutable` | ✅ FIXED |
| EDIT-INV-002 | Major | `document_type` not checked by `assertIdentityImmutable` | ✅ FIXED |

---

## Phase 1: Runtime Investigation

### Trace Path

```
InvoiceFormPage.tsx
  → useInvoiceEditableState (provides updateInvoice, state)
  → useInvoiceHydration (provides initialInvoiceSnapshot)
  → SharedDocumentForm
    → FormHeader
      → Client button (isEdit: disabled + Lock icon + onLockedFieldClick)
      → Invoice number input (isEdit: readOnly + Lock icon + onLockedFieldClick)
    → ClientSelector (isEdit: forced closed)
  → IdentityLockDialog (wired, renders AlertDialog)
  → useInvoiceSave → assertIdentityImmutable (save-time check)
```

### What Was Already Done

- `FormHeader.tsx:66-67` — Client button locked (disabled + Lock icon + `onLockedFieldClick`)
- `FormHeader.tsx:108-118` — Invoice number `readOnly` + Lock icon + `onLockedFieldClick`
- `SharedDocumentForm.tsx:125` — `handleClientChange` returns early in edit mode
- `SharedDocumentForm.tsx:306-307` — `ClientSelector` forced closed in edit mode
- `IdentityLockDialog.tsx` — Fully wired with duplicate-from-editable flow
- `useInvoiceSave.ts:137-148` — `assertIdentityImmutable` called on save (defence-in-depth)

### Gaps Found

1. `updateInvoice` in `useInvoiceEditableState.ts:139` is a generic setter with no mode awareness — programmatic calls can mutate identity fields even in edit mode
2. `assertIdentityImmutable` only checked `client_id` and `invoice_number` — `document_type` and `conversionTrail` (lineage) were not guarded

---

## Phase 2: UI Enforcement

### EDIT-INV-000 Fix — Guard `updateInvoice`

**File:** `src/pages/InvoiceFormPage.tsx`

Added `guardedUpdateInvoice` wrapper that intercepts identity field mutations in edit mode:

```typescript
const IDENTITY_FIELDS = ['client_id', 'client_name', 'invoice_number', 'document_type'] as const
const guardedUpdateInvoice = useCallback((field: string, value: any) => {
  if (isEdit && IDENTITY_FIELDS.includes(field as typeof IDENTITY_FIELDS[number])) {
    setIdentityLockDialog({ open: true, field: field === 'client_id' ? 'client' : 'invoice_number' })
    return
  }
  updateInvoice(field, value)
}, [isEdit, updateInvoice])
```

The guarded version is passed to `SharedDocumentForm` as `updateInvoice={guardedUpdateInvoice}`, replacing the raw `updateInvoice`.

**Effect:** Any programmatic attempt to mutate `client_id`, `client_name`, `invoice_number`, or `document_type` in edit mode now opens the `IdentityLockDialog` instead of applying the change. This closes the interaction-time enforcement gap.

---

## Phase 3: Domain Enforcement

### EDIT-INV-001 + EDIT-INV-002 Fix — Extend `assertIdentityImmutable`

**File:** `src/domain/invoice/assertIdentityImmutable.ts`

Extended the function signature and check set:

- **`document_type`** — Added to `scalarFields` array alongside `client_id` and `invoice_number`
- **`conversionTrail`** — Parsed from `custom_fields` JSON and compared between original and current snapshots

Updated type signature to accept `document_type` and `custom_fields` properties.

**Effect:** Save-time defence-in-depth now catches mutations to all four identity dimensions: `client_id`, `invoice_number`, `document_type`, and lineage (`conversionTrail`).

### Error Message Update

**File:** `src/hooks/useInvoiceSave.ts`

Updated the catch block to produce human-readable labels for the new identity fields (`Document Type`, `Document Lineage`) instead of raw field names.

---

## Verification Gate

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ PASS (only pre-existing errors in `native-feedback-renderer.tsx`) |
| `bun run audit:load` | ✅ PASS (no new issues from modified files) |
| `bun run build` | ⏭️ Skipped (hardware policy) |

---

## Files Modified

| File | Change |
|---|---|
| `src/pages/InvoiceFormPage.tsx` | Added `guardedUpdateInvoice` wrapper; passed to `SharedDocumentForm` |
| `src/domain/invoice/assertIdentityImmutable.ts` | Extended to check `document_type` and `conversionTrail` |
| `src/hooks/useInvoiceSave.ts` | Updated error labels for new identity fields |

---

## Deferred Work

- **Quotation Edit Law enforcement** — Not in scope (prompt705 specifies Invoice only)
- **CSR/Waybill Edit Law enforcement** — Not in scope
- **`setInvoice` direct calls** — `setInvoice` is still exposed and could bypass the guard; defence-in-depth via `assertIdentityImmutable` on save covers this
- **`document_type` dropdown UI** — No dropdown exists in the current form for `document_type`, so UI lock is N/A; the programmatic guard covers any future exposure
