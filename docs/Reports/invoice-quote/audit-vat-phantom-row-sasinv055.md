# Audit Log Phantom VAT Change — SASINV055

This report was written by DeepSeek on 2026-07-04.

## Objective

Investigate why `audit_logs` for invoice SASINV055 records a VAT change from ₦127,092,000 to ₦7.50 at 2026-07-01 14:36:45 UTC, while the current live `invoice.vat` value is ₦127,092,000. Determine whether actor attribution (`jaiyewisdom@gmail.com`) is reliable and whether any data corruption actually occurred.

## Scope

- Invoice SASINV055 only (id: `23ea9eb0-aaa6-4546-bcae-bd4067ac4168`).
- The single audit_logs row showing `vat: 127092000 → 7.5` (id: `f689c67f-574c-447c-b8bb-98c09f760c3b`).
- Read-only analysis; no code or data modified.

## Key Evidence

### 1. Audit Log Row (Raw)

| Column       | Value                                                                      |
|--------------|----------------------------------------------------------------------------|
| id           | f689c67f-574c-447c-b8bb-98c09f760c3b                                      |
| table_name   | invoices                                                                   |
| record_id    | 23ea9eb0-aaa6-4546-bcae-bd4067ac4168                                      |
| action       | UPDATE                                                                     |
| field        | vat                                                                        |
| old_data     | `{"vat": 127092000}`                                                       |
| new_data     | `{"vat": 7.5}`                                                             |
| actor_id     | b676c7a8-7834-40dd-bc45-655822c5c5e6                                      |
| actor_label  | jaiyewisdom@gmail.com                                                      |
| source       | web                                                                        |
| created_at   | 2026-07-01 14:36:45.54173+00:00                                            |

### 2. All Audit Rows for SASINV055 (Chronological)

1. **2026-06-29 07:05:04** — CREATE, audit_id_public → `public` (initial document creation)
2. **2026-06-29 07:05:04** — CREATE, vat → `127092000` (initial value written to DB)
3. **2026-07-01 14:36:45** — UPDATE, vat → `127092000 → 7.5` (THE PHANTOM ROW)

**No row reverting vat back to 127092000 exists.** If the DB value had actually changed to 7.5 and then back, there would be another UPDATE row.

### 3. Current Invoice Value

```json
{
  "vat": 127092000,
  "custom_fields": {
    "calculationInputs": {
      "vatRate": 7.5,
      "vatPercent": 7.5
    }
  },
  "created_by": "b676c7a8-7834-40dd-bc45-655822c5c5e6",
  "updated_by": "b676c7a8-7834-40dd-bc45-655822c5c5e6"
}
```

`invoice.vat` = **127092000** (the computed absolute VAT amount in kobo or smallest currency unit).
`custom_fields.calculationInputs.vatRate` = **7.5** (the VAT percentage rate).

## Root Cause

The phantom audit row is caused by a **rate-vs-amount mismatch** in the audit logging code path of `InvoiceFormPage.tsx`.

### Code Path

**When loading the invoice for editing** — `src/hooks/useInvoiceHydration.ts:118-123`:
```typescript
targetsRef.current.setInvoice({
  ...data,                                        // DB row: vat = 127092000
  vat: legacyCalculationState.editableInputs.vatRate,  // OVERRIDE with 7.5 (the rate!)
  discount: legacyCalculationState.editableInputs.discountValue,
  wht: legacyCalculationState.calculationInputs.whtValue,
})
```

The form field `invoice.vat` is deliberately set to **the VAT rate (7.5%)**, not the DB-stored computed amount (127092000). This is by design — `editableInputs.vatRate` is the rate input the user edits.

**When saving** — `src/pages/InvoiceFormPage.tsx:482-518`:

```typescript
// updatedInvoice (used as audit newData):
const updatedInvoice = {
  ...invoice,          // invoice.vat = 7.5 (the RATE)
  notes: normalizedNotes,
  terms: normalizedTerms,
  subtotal: documentTotals.subtotal,
  install_rate_total: documentTotals.installRateTotal,
  total: documentTotals.totalPayable,
  // *** BUG: vat NOT overridden with documentTotals.vat ***
}

// payload (what actually hits the database):
const payload = {
  ...
  vat: documentTotals.vat,       // = 127092000 (the computed total — CORRECT)
  ...
}
```

**The audit trail records:**
- `oldData.vat` = `initialInvoiceSnapshot.vat` = **127092000** (the value from DB when the form was loaded)
- `newData.vat` = `updatedInvoice.vat` = `invoice.vat` = **7.5** (the form-state RATE)

**Meanwhile, the DB is saved with `payload.vat = documentTotals.vat = 127092000`.** The audit diff `127092000 → 7.5` never happened in the database — it's purely an artifact of the audit log using the form's input value instead of the actual persisted value.

### Why 7.5 is the VAT Rate

`legacyCalculationState` (via `extractCalculationInputs` at `src/domain/invoice/calculations.ts:63-73`) reads:
```typescript
const saved = customFields?.calculationInputs || {}
const savedVatRate = Number(saved.vatPercent ?? saved.vatRate ?? invoice?.vat ?? 0)
```

For SASINV055, `custom_fields.calculationInputs.vatPercent` = 7.5, so `savedVatRate` = 7.5. This is the percentage rate.

The `inferLegacyCalculationInputs` function (line 94-155) confirms: for invoices with `calculationInputs` in custom_fields, the rate is extracted from `custom_fields.calculationInputs.vatPercent` (7.5), yielding `editableInputs.vatRate = 7.5`.

## Actor Attribution

**Actor attribution is correct.** The audit entry was triggered by the authentic save action in `InvoiceFormPage.tsx`, which runs in the context of the authenticated Supabase session:

1. `recordAuditLog()` in `src/lib/audit.ts` calls `getActor()` → `supabase.auth.getSession()` → session.user.id + session.user.email
2. The actor_id `b676c7a8-7834-40dd-bc45-655822c5c5e6` is also present in the invoice's `created_by` and `updated_by` columns
3. The label `jaiyewisdom@gmail.com` was extracted from the session by `getActor()` in `src/lib/audit.ts`

The user jaiyewisdom@gmail.com loaded the invoice, which triggered the hydration that set `invoice.vat = 7.5` (the rate), and then saved the form (possibly with changes to other fields). The audit correctly records that this user triggered the save — but the diff it captured was a **false positive** due to the rate-vs-amount coding bug.

## Conclusions

1. **No data corruption.** `invoices.vat` has always remained at `127092000` since creation. The phantom `7.5` existed only in the audit log's `new_data` column.
2. **Actor attribution is reliable.** jaiyewisdom@gmail.com (id `b676c7a8…`) was the authenticated user who triggered the save. Nothing anomalous about the identity — the anomaly is what got logged as "changed".
3. **Root cause confirmed:** `updatedInvoice.vat` in `InvoiceFormPage.tsx:484` is taken from form state (`invoice.vat` = rate = 7.5) instead of the computed total (`documentTotals.vat` = 127092000). The DB payload correctly uses `documentTotals.vat` (line 510), creating a discrepancy between what's saved and what's audited.
4. **Fix required:** `updatedInvoice` should use `documentTotals.vat` (or at minimum the same `vat` value that goes into the payload) to ensure the audit log reflects actual writes.

## Verification

- `bun run typecheck` — not applicable (no code changed).
- All evidence is traced to specific source files, line numbers, and database query results.
