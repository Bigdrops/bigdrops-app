# Quotation Edit Law Enforcement — Phase 1

This report was written by OpenCode on 2026-07-08 via Local Runner.

---

## 1. Executive Summary

Implemented Law 1 (Edit Law — Identity Immutability) enforcement for Quotation, completing prompt5124 scope. Two findings fixed: EDIT-QTN-001 (domain enforcement) and EDIT-QTN-002 (UI enforcement).

The result:
- `QuotationFormPage` now passes `mode` and `onLockedFieldClick` to `SharedDocumentForm`
- Identity fields (`client_id`, `client_name`, `quotation_number`) are guarded in edit mode via `guardedUpdateQuotation`
- `IdentityLockDialog` is wired and opens on locked field interaction
- `assertQuotationIdentityImmutable` added to `useQuotationSave` validate path as defence-in-depth
- Draft (create) mode remains fully editable

---

## 2. Scope

**Covered:**
- EDIT-QTN-001: Domain/service identity immutability enforcement for Quotation
- EDIT-QTN-002: UI IdentityLockDialog enforcement for Quotation

**Intentionally excluded:**
- EDIT-CSR-001, EDIT-CSR-002 (CSR Edit Law) — different prompt scope
- EDIT-WAY-001, EDIT-WAY-002 (Waybill Edit Law) — different prompt scope
- No refactoring, redesign, or audit beyond prompt5124 requirements

---

## 3. Runtime Trace (Before Fix)

```
QuotationFormPage.tsx (mode='edit')
  → SharedDocumentForm (no mode prop passed, no onLockedFieldClick)
    → FormHeader (isEdit=false → client button not locked, number not readonly)
    → ClientSelector (no edit-mode guard on client change)
  → handleInvoiceLikeUpdate (no mode guard → identity fields mutable)
  → useQuotationSave → quotationStrategy.validate (no identity check)
```

**Observation:** `SharedDocumentForm` already supports edit-mode locking via `mode` and `onLockedFieldClick` props. `FormHeader` already renders lock UI when `isEdit=true`. `IdentityLockDialog` already exists. None were wired.

---

## 4. Root Cause

`QuotationFormPage` never passed `mode` to `SharedDocumentForm`, so `props.mode === 'edit'` evaluated to `false` and all identity field protections were inactive. Additionally, no domain-level identity comparison existed in the quotation save path.

---

## 5. Files Modified

| File | Layer | Change |
|---|---|---|
| `src/pages/QuotationFormPage.tsx` | UI | Added `IdentityLockDialog` import, `identityLockDialog` state, `IDENTITY_FIELDS` constant, `guardedUpdateQuotation` callback, `handleLockedFieldClick` callback, passed `mode` and `onLockedFieldClick` to `SharedDocumentForm`, rendered `IdentityLockDialog` |
| `src/hooks/useQuotationSave.ts` | Domain | Added `assertQuotationIdentityImmutable` import and call in `validate` for edit mode |
| `src/domain/quotation/assertIdentityImmutable.ts` | Domain | **New file** — `assertQuotationIdentityImmutable` checks `client_id`, `quotation_number`, and `conversionTrail` in `custom_fields` |

---

## 6. Evidence

### EDIT-QTN-002 (UI) — `src/pages/QuotationFormPage.tsx`

```typescript
// Line 66 — dialog state
const [identityLockDialog, setIdentityLockDialog] = useState<{ open: boolean; field: 'client' | 'quotation_number' | null }>({ open: false, field: null })

// Line 462-468 — guarded update blocks identity fields in edit mode
const IDENTITY_FIELDS = ['client_id', 'client_name', 'quotation_number'] as const
const guardedUpdateQuotation = useCallback((field: string, value: unknown) => {
  if (isEdit && IDENTITY_FIELDS.includes(field as typeof IDENTITY_FIELDS[number])) {
    setIdentityLockDialog({ open: true, field: field === 'client_id' || field === 'client_name' ? 'client' : 'quotation_number' })
    return
  }
  handleInvoiceLikeUpdate(field, value)
}, [isEdit, handleInvoiceLikeUpdate])

// Line 481, 581 — passed to SharedDocumentForm
mode={mode}
onLockedFieldClick={isEdit ? handleLockedFieldClick : undefined}
```

### EDIT-QTN-001 (Domain) — `src/domain/quotation/assertIdentityImmutable.ts`

```typescript
export function assertQuotationIdentityImmutable(initial, current) {
  // Checks: client_id, quotation_number, conversionTrail (JSON parse + deep comparison)
  // Throws with field name on mismatch
}
```

### EDIT-QTN-001 (Domain) — `src/hooks/useQuotationSave.ts`

```typescript
// In validate method, before client validation:
if (isEdit) {
  try {
    assertQuotationIdentityImmutable(initialQuotationSnapshot as any, quotation as any)
  } catch (err: any) {
    const field = err.message?.replace('IDENTITY_MUTATION_DETECTED: ', '') || 'identity field'
    return {
      valid: false,
      error: 'Identity Error',
      errorDescription: `Cannot change ${field} after creation. Use Duplicate to create a new quotation.`,
    }
  }
}
```

---

## 7. Behaviour Preserved

- Draft quotations remain fully editable (all guards are `isEdit`-gated)
- `handleInvoiceLikeUpdate` field mapping (`invoice_number` → `quotation_number`, `due_date` → `valid_until`) unchanged
- Save flow unchanged for create mode
- No modifications to duplicate, conversion, PDF, calculation, or audit logic

---

## 8. Verification Gate

| Check | Result |
|---|---|
| `bun run typecheck` | ✅ PASS — only pre-existing errors (`native-feedback-renderer.tsx`, `ReceiptPdf.tsx`, `DocumentPrefixesSettingsSection.tsx`) |
| `bun run audit:load` | ✅ PASS — no new issues. `QuotationFormPage.tsx` now 613 lines (over 600-line bloat warning, acceptable for enforcement additions) |
| `bun run build` | ⏭️ Skipped — hardware policy (4GB RAM limit) |
| `git status` | Confirms only intended files modified |

---

## 9. Deferred Work

- EDIT-CSR-001, EDIT-CSR-002 (CSR Edit Law) — requires separate prompt/task
- EDIT-WAY-001, EDIT-WAY-002 (Waybill Edit Law) — requires separate prompt/task
