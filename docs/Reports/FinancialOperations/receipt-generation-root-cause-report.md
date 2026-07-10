# Receipt Generation Root Cause Investigation Report

This report was written by OpenCode on 2026-07-10 via Local Runner.

## Objective

Diagnose why `recordInvoicePayment` successfully creates payment rows but produces zero receipt rows, despite the receipt creation pipeline being wired end-to-end.

## Scope

- **Covered:** Full trace of `recordInvoicePayment` receipt block (lines 118–187), `buildReceiptSnapshot()`, `withUniqueRetry`, Supabase insert, DB schema reconciliation, prefix engine, audit logging.
- **Excluded:** UI rendering, PDF generation, navigation, void lifecycle (already verified working), other document types.

## Phase 1 — Pipeline Trace

### Call chain

```
recordInvoicePayment(paymentInput)
  └─ supabase.from('payments').insert(...)        ← payment succeeds
  └─ try {
       └─ 5 parallel queries (invoice, client, company, bank, signatory)
       └─ buildReceiptSnapshot({payment, invoice, client, project, company, bank, signatory})
       └─ withUniqueRetry(
            insertFn:  supabase.from('receipts').insert([receiptPayload]),
            regenerateValue: getNextReceiptNumber(allReceipts, prefixSettings)
          )
       └─ if (!receiptError && receiptRow) → recordReceiptGenerated(...)
     } catch (receiptErr) {
       console.error('Auto receipt creation failed:', receiptErr)
     }
```

### Critical observation

`withUniqueRetry` **returns** errors instead of throwing them. The guard at line 173 only checks `!receiptError` to decide whether to audit-log — it does **not** log the error when receipt creation fails. The `catch` block at line 185 only fires if a promise **throws**, but Supabase `.insert()` returns `{ error }` — it doesn't throw unless `.throwOnError()` is chained (which it is not).

**Result:** Any insert error (missing column, NOT NULL violation, RLS rejection, unique violation exhausted) is silently swallowed. The payment succeeds, the receipt silently disappears.

---

## Phase 2 — Snapshot Builder Verification

### `buildReceiptSnapshot()` output fields

Source: `src/domain/receipt/snapshotBuilder.ts:77-136`

| # | Snapshot Field | Payload Value Source | Nullable in Output |
|---|----------------|---------------------|-------------------|
| 1 | `payment_id` | Hardcoded `''` — overwritten by caller with `paymentRow.id` | No |
| 2 | `invoice_id` | Hardcoded `''` — overwritten by caller with `input.invoiceId` | No |
| 3 | `client_id` | `client.id` from clients query | No |
| 4 | `payment_amount` | `payment.amount` = `payload.amount` | No |
| 5 | `payment_date` | `payment.date` = `input.date` | No |
| 6 | `payment_method` | `payment.method` = `input.method` | **Yes** |
| 7 | `payment_reference` | `payment.reference` = `input.reference \|\| null` | **Yes** |
| 8 | `payment_notes` | `payment.notes` = `input.notes \|\| null` | **Yes** |
| 9 | `cash_amount` | `payment.cash_amount ?? 0` | No (defaults 0) |
| 10 | `wht_amount` | `payment.wht_amount ?? 0` | No (defaults 0) |
| 11 | `currency_code` | Hardcoded `'NGN'` | No |
| 12 | `wht_rate` | `payment.wht_rate` = `payload.wht_rate ?? null` | **Yes** |
| 13 | `wht_type` | `payment.wht_type` = `payload.wht_type ?? null` | **Yes** |
| 14 | `invoice_number` | `invoice.invoice_number` from DB query | No |
| 15 | `invoice_total` | `invoice.total` from DB query | **Yes** |
| 16 | `invoice_subtotal` | `invoice.subtotal` from DB query | **Yes** |
| 17 | `invoice_vat` | `invoice.vat` from DB query | **Yes** |
| 18 | `invoice_wht` | `invoice.wht` from DB query | **Yes** |
| 19 | `invoice_discount` | `invoice.discount` from DB query | **Yes** |
| 20 | `invoice_notes` | `invoice.notes` from DB query | **Yes** |
| 21 | `invoice_terms` | `invoice.terms` from DB query | **Yes** |
| 22 | `invoice_po_number` | `invoice.po_number` from DB query | **Yes** |
| 23 | `client_name` | `client.name` from clients query | No |
| 24 | `client_address` | `client.address` from DB query | **Yes** |
| 25 | `client_city` | `client.city` from DB query | **Yes** |
| 26 | `client_state` | `client.state` from DB query | **Yes** |
| 27 | `client_phone` | `client.phone` from DB query | **Yes** |
| 28 | `client_email` | `client.email` from DB query | **Yes** |
| 29 | `project_name` | `project?.name ?? null` (always null — caller passes `null`) | **Yes** |
| 30 | `project_code` | `project?.project_code ?? null` (always null — caller passes `null`) | **Yes** |
| 31 | `company_name` | `company.company_name ?? ''` | No (defaults `''`) |
| 32 | `company_address` | `company.company_address` from settings query | **Yes** |
| 33 | `company_email` | `company.company_email` from settings query | **Yes** |
| 34 | `company_phone` | `company.company_phone` from settings query | **Yes** |
| 35 | `company_logo_url` | `company.company_logo_url` from settings query | **Yes** |
| 36 | `bank_name` | `bank?.bank_name ?? null` (null if no bank_account_id) | **Yes** |
| 37 | `bank_account_number` | `bank?.account_number ?? null` | **Yes** |
| 38 | `bank_account_name` | `bank?.account_name ?? null` | **Yes** |
| 39 | `signatory_name` | `signatory?.name ?? null` from signatories query | **Yes** |
| 40 | `signatory_role` | `signatory?.role ?? null` | **Yes** |
| 41 | `signatory_signature_url` | `signatory?.signature_url ?? null` | **Yes** |

**Total: 41 fields** from `buildReceiptSnapshot()` plus `receipt_number: ''` added by caller = **42 fields in `receiptPayload`**.

### Flags

| Flag | Field(s) | Issue |
|------|----------|-------|
| **Missing from payload** | `amount`, `payment_ref`, `notes`, `updated_by`, `updated_at`, `archived_at` | Old columns from migration 1 — intentionally excluded (snapshot columns replace them). But `amount` is `NOT NULL` with no default. |
| **Different name than DB column** | `amount` vs `payment_amount` | Snapshot uses `payment_amount`. Migration 1 created `amount`. Migration 2 adds `payment_amount` but does NOT drop `amount`. |
| **Always undefined** | (none) | All 41 fields have a value assigned |
| **Optional JOIN risk** | `bank_*`, `signatory_*` | `bank_account_id` can be null → bank query skipped → all bank fields null. Signatory query uses `.limit(1).single()` — if no signatory exists, throws. |
| **NOT NULL violation risk** | (none in snapshot) | But the old `amount` column is NOT NULL with no default and is NOT in the payload |

---

## Phase 3 — Payload vs Database Verification

### Reconciliation Matrix

#### After Migration 1 only (17 columns)
| DB Column | Payload Property | Match? | Notes |
|-----------|-----------------|--------|-------|
| `id` | — | Not in payload | Auto-generated by `gen_random_uuid()` — OK |
| `receipt_number` | `receipt_number` | ✅ | Set by `withUniqueRetry` |
| `payment_id` | `payment_id` | ✅ | Set by caller |
| `invoice_id` | `invoice_id` | ✅ | Set by caller |
| `client_id` | `client_id` | ✅ | From snapshot |
| `client_name` | `client_name` | ✅ | From snapshot |
| `amount` | **MISSING** | ❌ | **NOT NULL, no default → insert will FAIL** |
| `currency_code` | `currency_code` | ✅ | From snapshot |
| `payment_date` | `payment_date` | ✅ | From snapshot |
| `payment_method` | `payment_method` | ✅ | From snapshot |
| `payment_ref` | **MISSING** (payload has `payment_reference`) | ❌ | Old column, deprecated by M2 |
| `notes` | **MISSING** (payload has `payment_notes`) | ❌ | Old column, deprecated by M2 |
| `created_by` | — | Not in payload | Set by trigger `stamp_row_ownership` — OK |
| `updated_by` | — | Not in payload | Set by trigger — OK |
| `created_at` | — | Not in payload | Auto `now()` — OK |
| `updated_at` | — | Not in payload | Auto `now()` — OK |
| `archived_at` | — | Not in payload | Nullable — OK |
| **Extra payload fields** | `payment_amount`, `payment_reference`, `payment_notes`, `cash_amount`, `wht_amount`, `wht_rate`, `wht_type`, `invoice_number`, `invoice_total`, `invoice_subtotal`, `invoice_vat`, `invoice_wht`, `invoice_discount`, `invoice_notes`, `invoice_terms`, `invoice_po_number`, `client_address`, `client_city`, `client_state`, `client_phone`, `client_email`, `project_name`, `project_code`, `company_name`, `company_address`, `company_email`, `company_phone`, `company_logo_url`, `bank_name`, `bank_account_number`, `bank_account_name`, `signatory_name`, `signatory_role`, `signatory_signature_url`, `status`, `voided_at`, `void_reason` | ❌ | **These columns do NOT exist in M1 schema → error 42703** |

#### After Both Migrations Applied (54 columns)
| DB Column | Payload Property | Match? | Notes |
|-----------|-----------------|--------|-------|
| All 54 M1+M2 columns | `payment_amount`, `payment_date`, `payment_method`, `payment_reference`, `payment_notes`, `cash_amount`, `wht_amount`, `currency_code`, `wht_rate`, `wht_type`, `invoice_number`, `invoice_total`, `invoice_subtotal`, `invoice_vat`, `invoice_wht`, `invoice_discount`, `invoice_notes`, `invoice_terms`, `invoice_po_number`, `client_name`, `client_address`, `client_city`, `client_state`, `client_phone`, `client_email`, `project_name`, `project_code`, `company_name`, `company_address`, `company_email`, `company_phone`, `company_logo_url`, `bank_name`, `bank_account_number`, `bank_account_name`, `signatory_name`, `signatory_role`, `signatory_signature_url`, `status`, `voided_at`, `void_reason` | ✅ | All snapshot columns exist |
| `amount` | **MISSING** (payload has `payment_amount`) | ❌ | **NOT NULL, no default, still exists in table → NOT NULL violation (23502)** |
| `payment_ref` | **MISSING** (payload has `payment_reference`) | ⚠️ | Nullable, deprecated — safe to not include |
| `notes` | **MISSING** (payload has `payment_notes`) | ⚠️ | Nullable, deprecated — safe to not include |
| `updated_by` | — | ⚠️ | Deprecated, set by trigger |
| `updated_at` | — | ⚠️ | Deprecated, set by trigger |
| `archived_at` | — | ⚠️ | Deprecated, nullable |

### Exact Insert Payload (what `receiptPayload` looks like at insert time)

```json
{
  "payment_id": "<uuid>",
  "invoice_id": "<uuid>",
  "client_id": "<uuid>",
  "payment_amount": 50000,
  "payment_date": "2026-07-10",
  "payment_method": "bank_transfer",
  "payment_reference": "TXN123",
  "payment_notes": null,
  "cash_amount": 0,
  "wht_amount": 0,
  "currency_code": "NGN",
  "wht_rate": null,
  "wht_type": null,
  "invoice_number": "INV-000001",
  "invoice_total": 50000,
  "invoice_subtotal": 50000,
  "invoice_vat": 0,
  "invoice_wht": 0,
  "invoice_discount": 0,
  "invoice_notes": null,
  "invoice_terms": null,
  "invoice_po_number": null,
  "client_name": "Acme Corp",
  "client_address": null,
  "client_city": null,
  "client_state": null,
  "client_phone": null,
  "client_email": null,
  "project_name": null,
  "project_code": null,
  "company_name": "BigDrops Ltd",
  "company_address": null,
  "company_email": null,
  "company_phone": null,
  "company_logo_url": null,
  "bank_name": null,
  "bank_account_number": null,
  "bank_account_name": null,
  "signatory_name": null,
  "signatory_role": null,
  "signatory_signature_url": null,
  "receipt_number": "RCP-000001"
}
```

---

## Phase 4 — Error Visibility Analysis

### Error handling flow

```
1. supabase.from('receipts').insert([receiptPayload]) hits DB
2. DB rejects insert (column missing / NOT NULL / RLS)
3. Supabase JS client returns: { data: null, error: PostgrestError }
4. withUniqueRetry checks error.code:
     - '23505' (unique violation) → retry (up to 3 times)
     - Any other code → returns { data: null, error } immediately (line 30)
5. recordInvoicePayment receives { data: null, error: receiptError }
6. if (!receiptError && receiptRow) → false (receiptError is truthy) → audit SKIPPED
7. No console.error logged
8. catch block never fires (no thrown exception)
9. Payment succeeds, user sees nothing wrong
10. Receipts page shows 0 rows
```

### The error object (what Supabase returns, never logged)

The error object has these properties:
- `error.code`: e.g., `42703` (undefined_column), `23502` (not_null_violation), `42501` (RLS)
- `error.message`: Human-readable description
- `error.details`: Additional details from Postgres
- `error.hint`: Postgres hint if available

**None of these are currently logged.**

### What error code to expect

| Condition | Expected Error Code | Expected Message (approx) |
|-----------|-------------------|--------------------------|
| M1 only (no snapshot columns) | `42703` | `column "payment_amount" of relation "receipts" does not exist` |
| Both M1+M2 (amount still NOT NULL) | `23502` | `null value in column "amount" of relation "receipts" violates not-null constraint` |
| Neither migration | `42P01` | `relation "receipts" does not exist` |
| RLS blocks insert | `42501` | `new row violates row-level security policy for "receipts"` |

---

## Phase 5 — Prefix Engine Verification

| Check | Result |
|-------|--------|
| `DEFAULT_PREFIXES['receipt']` | ✅ `'RCP'` at `src/domain/prefixConstants.ts:9` |
| `resolvePrefix(null, 'receipt')` fallback | ✅ Returns `'RCP'` |
| `settings.document_prefixes->>'receipt'` | ✅ Backfilled by M2 step 7 |
| `getNextReceiptNumber([])` with no rows | ✅ Returns `'RCP-000001'` |
| `withUniqueRetry` retry on 23505 | ✅ Up to 3 retries, regenerates each time |

**Prefix engine is not the root cause.**

---

## Phase 6 — Additional Findings

### Dead code: `insertReceipt()` imported but unused in payment path

`src/domain/receipt/receiptRepository.ts:6-15` provides `insertReceipt(input)` which throws on error. It is imported in `paymentService.ts` (line 14) but never called — the payment path uses the inline insert inside `withUniqueRetry`. Both have the same `amount` bug.

### Client double-query anti-pattern

`paymentService.ts:122` nests an invoice query inside `Promise.all` to get `client_id`, then queries clients. This is a sequential bottleneck inside a parallel block. If the nested query fails, `clientResult.data` is null and the receipt block is skipped entirely. In practice, if the invoice exists (which it must since payment references it), this should work.

### Signatory `.single()` risks throwing

Line 125: `supabase.from('signatories').select(...).limit(1).single()` — if no signatory exists, `.single()` returns an error (not data), which would be caught by the outer catch block. This would prevent an entire receipt from being created.

---

## Root Cause Ranking

| Rank | Cause | Probability | Evidence |
|------|-------|------------|----------|
| **1** | **Migration 2 not applied — 37+ columns missing** | **HIGH** | `database.types.ts` has NO `receipts` table entry; `document_prefixes` has no `receipt` key; user confirmed migrations applied manually. Error code `42703`. |
| **2** | **`amount` NOT NULL violation** | **MEDIUM** | Even with both migrations, `amount` column retains `NOT NULL` with no default. Payload never includes `amount`. Error code `23502`. |
| **3** | **Error silently swallowed** | **CERTAIN** | Occurs in ALL scenarios above. No logging at line 173 when `receiptError` is truthy. |
| **4** | **RLS policy rejection** | **LOW** | Would require `profiles.is_approved = false` for the inserting user. Error code `42501`. |

---

## Deferred Work

1. **`insertReceipt()` in `receiptRepository.ts`** — unused by payment path, candidate for removal or refactor
2. **Client query nesting** — minor perf improvement, not a correctness issue
3. **Signatory `.single()` hardening** — edge case when zero signatories exist
4. **Full build test** — skipped per hardware policy (4GB RAM limit)

## Verification

- `bun run typecheck`: passes (pre-existing waybill errors only)
- `bun run audit:load`: passes
- `git status`: no unintended changes
