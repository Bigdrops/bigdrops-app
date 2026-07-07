# Receipt Readiness Audit

This report was written by OpenCode on 2026-07-07 via Local Runner.

---

## 1. Executive Summary

**Overall Verdict: BLOCKED**

The BIGDROPS platform **cannot** currently generate immutable, legally correct receipts from payments. The Receipt module does not exist — no table, no domain, no UI, no prefix key. Every dependency the Receipt module needs is either missing or live-referenced, meaning a receipt generated today would reflect the state of invoice/client/project/company data *at the time of viewing*, not at the time of payment. This violates the PRD's §7.4.6 requirement that "Payment receipt data is immutable and independent of invoice state changes."

The platform has strong foundational patterns (prefix engine, document transformation standard, audit infrastructure, WHT receipt scaffold) but zero receipt-specific implementation. Building the Receipt module requires: (1) a new `receipts` table with denormalized snapshot columns, (2) a new `receipt` key in the prefix engine, (3) snapshot population at payment recording time, and (4) immutability enforcement post-save.

**Verification gate:** `bun run audit:load` passed (711 files scanned). `git status` confirms zero application source modifications — only `docs/Reports/FinancialOperations/phase-2-6d-upload-error-surfacing.md` was pre-existing modified.

---

## 2. Payment Snapshot Completeness

### What the `payments` table stores

**Source:** `supabase/migrations/20260520090003_invoices.sql:75-95`

| Column | Type | Default | Snapshot? |
|--------|------|---------|-----------|
| `id` | uuid | `gen_random_uuid()` | Identity |
| `invoice_id` | uuid | — | FK reference only |
| `amount` | numeric | NOT NULL | Financial |
| `date` | date | NOT NULL | Temporal |
| `method` | text | — | Payment metadata |
| `reference` | text | — | Payment metadata |
| `notes` | text | — | Payment metadata |
| `cash_amount` | numeric | `0` | Financial |
| `wht_amount` | numeric | `0` | Financial |
| `currency_code` | text | `'NGN'` | Financial |
| `wht_rate` | numeric | — | Tax config |
| `wht_type` | text | — | Tax config |
| `wht_certificate_ref` | text | — | Compliance |
| `recorded_by` | uuid | — | Actor |
| `voided_at` | timestamptz | — | Lifecycle |
| `void_reason` | text | — | Lifecycle |
| `source` | text | `'live'` | Origin |
| `bank_account_id` | uuid | — | FK reference |

### What is missing for receipt generation

| Missing Field | Why It Matters | Evidence |
|---------------|----------------|----------|
| `tenant_id` | No multi-tenant isolation on payments. Receipts cannot prove which tenant recorded the payment. | `payments` DDL has no `tenant_id` column. Only `telegram_topics` table has `tenant_id` (`20260705100000_payment_attachments.sql:20`). |
| `exchange_rate` | All payments default to `currency_code='NGN'`. No mechanism to snapshot the exchange rate at payment time for cross-currency receipts. | `payments` DDL has no `exchange_rate` column. |
| `bank_name` | Bank name is fetched live via `fetchBankAccountName()` at render time, not persisted. | `src/modules/invoices/services/paymentService.ts` calls `fetchBankAccountName(payment.bank_account_id)` — live dependency. |
| `client_name` | Client name is not stored on the payment. Must join through `invoices.client_id → clients.name`. | `payments` table has no `client_name`. `invoice_id` is the only link. |
| `invoice_number` | Invoice number is not stored on the payment. Must join through `invoices.id → invoices.invoice_number`. | `payments` table has no `invoice_number`. |
| `company_name` | Company/tenant identity is read from `settings` table at render time. | `src/domain/quotation/pdfDownloadHandler.ts:71` reads `settings?.company_name`. `src/domain/invoice/projections/partyProjection.ts:43-54` reads live from `settings`. |

### TypeScript type mismatch

**Source:** `src/modules/invoices/types/paymentTypes.ts`

The `InvoicePayment` interface is missing columns that exist in the DDL:

| DDL Column | In `InvoicePayment`? |
|------------|---------------------|
| `currency_code` | No |
| `recorded_by` | No |
| `wht_certificate_ref` | No |
| `void_reason` | No |

This means the application layer does not currently read or write these fields, even though the database supports them.

---

## 3. Invoice Dependency Audit

### Direct dependencies (payment → invoice)

**Source:** `src/modules/invoices/services/paymentService.ts`

```
recordPayment()
  → fetchInvoiceWhtConfig(invoiceId)  // reads WHT rate/type FROM invoice at payment time
  → insertPayment(...)                // persists payment
  → fetchBankAccountName(...)         // reads bank name live
  → autoCreateWhtReceiptDraft(...)    // creates WHT receipt draft
```

The WHT configuration (`wht_rate`, `wht_type`) is **read from the invoice at the moment of payment recording** and stored on the payment. This is correct behavior for snapshot purposes — the WHT values are captured at payment time.

However, `bank_account_name` is fetched live and not persisted on the payment record. If the bank account is later renamed or deleted, historical payments lose their bank name context.

### Transitive dependencies (payment → invoice → client → project)

| Dependency | How Resolved | Snapshot Risk |
|------------|-------------|---------------|
| `client_name` | `invoices.client_id → clients.name` (live JOIN) | **HIGH**: If client is renamed, all historical payment receipts reflect the new name. |
| `client_address` | `clients.address`, `clients.city`, `clients.state` (live) | **HIGH**: Same as above. |
| `project_name` | `invoices.project_id → projects.name` (live JOIN) | **HIGH**: If project is renamed, receipts reflect new name. |
| `project_code` | `projects.project_code` (live) | **HIGH**: Same as above. |
| `invoice_number` | `invoices.invoice_number` (live) | **MEDIUM**: Invoice numbers are immutable per §document-transformation-standard, but the link is not denormalized. |
| `company_name` | `settings.company_name` (live read) | **HIGH**: If company rebrands, all historical receipts show new brand. |
| `company_address` | `settings.company_address` (live read) | **HIGH**: Same as above. |
| `signatory` | `signatories` table (live read) | **MEDIUM**: Signatory can be edited after payment. |

### Invoice identity immutability

**Source:** `src/domain/invoice/assertIdentityImmutable.ts`

The platform enforces that `client_id` and `invoice_number` cannot change after save. This means the invoice-level identity is stable. However, the **client record itself** (name, address) is NOT immutable — only the FK link is frozen.

---

## 4. Receipt Number Strategy

### Current prefix engine

**Source:** `src/domain/prefixConstants.ts`

```typescript
export const DEFAULT_PREFIXES: Record<DocumentPrefixKey, string> = {
  waybill: 'WYB',
  invoice: 'INV',
  boq: 'BOQ',
  rfq: 'RFQ',
  quotation: 'QT',
  project: 'PRJ',
  csr: 'CSR',
}
```

**No `receipt` key exists.** Adding one requires:

1. Add `receipt: 'RCP'` (or similar) to `DEFAULT_PREFIXES` — `src/domain/prefixConstants.ts`
2. Update `DocumentPrefixKey` type union — `src/domain/prefixConstants.ts`
3. Update DB CHECK constraint on `settings.document_prefixes` — new migration required
4. Update settings default JSONB — new migration required
5. Follow `docs/STANDARD/prefix-engine-settings-standard.md` format: `{resolvedPrefix}-{routingToken?}-{6-digit serial}`

### Existing receipt numbering (WHT only)

**Source:** `supabase/migrations/20260520090003_invoices.sql:97-112`

The `wht_receipts` table has a `receipt_number text` column, but this is for WHT certificate tracking only — not a general payment receipt. It does not use the prefix engine.

### `generateDocumentNumber` function

**Source:** Grep returned no results for `generateDocumentNumber` in any `.ts` file.

The function referenced in `docs/STANDARD/prefix-engine-settings-standard.md` does not exist in the codebase as a named export. The prefix engine standard describes the pattern but the implementation may be inline or named differently. This needs investigation during implementation.

---

## 5. Receipt Lifecycle Verification

### What exists

| Component | Status | Evidence |
|-----------|--------|----------|
| `wht_receipts` table | ✅ Exists | `20260520090003_invoices.sql:97-112` |
| `WhtReceipt` type | ✅ Exists | `src/domain/compliance/types.ts:22-37` |
| `complianceService` | ✅ Exists | `src/modules/compliance/services/complianceService.ts` |
| `autoCreateWhtReceiptDraft` | ✅ Exists | Called from `paymentService.ts` on WHT payments |
| `receipt_number` on `wht_receipts` | ✅ Exists | `wht_receipts.receipt_number text` |
| `receipt_status` on `wht_receipts` | ✅ Exists | `'pending' \| 'requested' \| 'received' \| 'verified'` |

### What does NOT exist

| Component | Status | Impact |
|-----------|--------|--------|
| `receipts` table | ❌ Missing | No storage for payment receipts |
| `Receipt` domain type | ❌ Missing | No type system for receipts |
| `receipt` prefix key | ❌ Missing | No numbering engine for receipts |
| Receipt pages/routes | ❌ Missing | No UI for viewing/generating receipts |
| Receipt PDF template | ❌ Missing | No visual receipt output |
| Receipt snapshot mechanism | ❌ Missing | No data freezing at payment time |
| Receipt audit events | ❌ Missing | `activity_events` only supports `invoice`, `quotation`, `project` entity types |
| Receipt tracking fields | ❌ Missing | `src/lib/audit.ts` has no `RECEIPT_TRACKED_FIELDS` |

### PRD target (§7.4)

**Source:** `docs/PRD/financial-operations-prd.md` (referenced in summary)

- §7.4.3: "Payment receipt snapshots are generated at the point of payment recording" — **NOT IMPLEMENTED**
- §7.4.6: "Payment receipt data is immutable and independent of invoice state changes" — **NOT IMPLEMENTED**

---

## 6. Snapshot Boundary

### What must be frozen at payment time

For a receipt to be immutable and legally correct, the following data must be captured (denormalized) at the moment `recordPayment()` is called:

| Data Point | Current Source | Freeze Method Required |
|------------|---------------|----------------------|
| Invoice number | `invoices.invoice_number` (live JOIN) | Denormalize onto receipt |
| Client name | `clients.name` (live JOIN via invoice) | Denormalize onto receipt |
| Client address | `clients.address`, `city`, `state` (live) | Denormalize onto receipt |
| Project name | `projects.name` (live JOIN via invoice) | Denormalize onto receipt |
| Project code | `projects.project_code` (live) | Denormalize onto receipt |
| Company name | `settings.company_name` (live read) | Denormalize onto receipt |
| Company address | `settings.company_address` (live read) | Denormalize onto receipt |
| Company email | `settings.company_email` (live read) | Denormalize onto receipt |
| Company phone | `settings.company_phone` (live read) | Denormalize onto receipt |
| Bank name | `bank_accounts.bank_name` (live read) | Denormalize onto receipt |
| Bank account number | `bank_accounts.account_number` (live read) | Denormalize onto receipt |
| Bank account name | `bank_accounts.account_name` (live read) | Denormalize onto receipt |
| Signatory name | `signatories.name` (live read) | Denormalize onto receipt |
| Signatory role | `signatories.role` (live read) | Denormalize onto receipt |
| WHT rate/type | `payments.wht_rate`, `wht_type` (already on payment) | Already captured ✅ |
| Payment amount | `payments.amount` (already on payment) | Already captured ✅ |
| Payment date | `payments.date` (already on payment) | Already captured ✅ |
| Payment method | `payments.method` (already on payment) | Already captured ✅ |
| Payment reference | `payments.reference` (already on payment) | Already captured ✅ |

### What `invoice_financials_v` does (and why it's a risk)

**Source:** `supabase/migrations/20260520090010_views.sql`

```sql
-- invoice_financials_v derives:
--   cash_received, wht_received, settled_total, balance_due, computed_status
-- from LIVE JOIN of invoices + payments (filters voided_at IS NULL)
```

This view recalculates on every query. If a payment is voided, the view's `settled_total` changes retroactively. A receipt must NOT reference this view — it must store the settled state at the time of recording.

---

## 7. Snapshot vs Live Reference Matrix

| Data Point | Where Used Today | Live or Frozen | Receipt Needs |
|------------|-----------------|----------------|---------------|
| `payments.amount` | Payment record | ✅ Frozen | Use directly |
| `payments.date` | Payment record | ✅ Frozen | Use directly |
| `payments.method` | Payment record | ✅ Frozen | Use directly |
| `payments.reference` | Payment record | ✅ Frozen | Use directly |
| `payments.cash_amount` | Payment record | ✅ Frozen | Use directly |
| `payments.wht_amount` | Payment record | ✅ Frozen | Use directly |
| `payments.wht_rate` | Payment record | ✅ Frozen | Use directly |
| `payments.wht_type` | Payment record | ✅ Frozen | Use directly |
| `invoices.invoice_number` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.total` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.subtotal` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.vat` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.wht` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.discount` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.status` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.notes` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.terms` | Via JOIN | 🔴 Live | Must snapshot |
| `invoices.po_number` | Via JOIN | 🔴 Live | Must snapshot |
| `clients.name` | Via invoice → client JOIN | 🔴 Live | Must snapshot |
| `clients.address` | Via invoice → client JOIN | 🔴 Live | Must snapshot |
| `clients.city` | Via invoice → client JOIN | 🔴 Live | Must snapshot |
| `clients.state` | Via invoice → client JOIN | 🔴 Live | Must snapshot |
| `clients.phone` | Via invoice → client JOIN | 🔴 Live | Must snapshot |
| `clients.email` | Via invoice → client JOIN | 🔴 Live | Must snapshot |
| `projects.name` | Via invoice → project JOIN | 🔴 Live | Must snapshot |
| `projects.project_code` | Via invoice → project JOIN | 🔴 Live | Must snapshot |
| `settings.company_name` | Live read | 🔴 Live | Must snapshot |
| `settings.company_address` | Live read | 🔴 Live | Must snapshot |
| `settings.company_email` | Live read | 🔴 Live | Must snapshot |
| `settings.company_phone` | Live read | 🔴 Live | Must snapshot |
| `settings.company_logo_url` | Live read | 🔴 Live | Must snapshot (URL) |
| `bank_accounts.bank_name` | Live read via `fetchBankAccountName` | 🔴 Live | Must snapshot |
| `bank_accounts.account_number` | Live read | 🔴 Live | Must snapshot |
| `bank_accounts.account_name` | Live read | 🔴 Live | Must snapshot |
| `signatories.name` | Live read | 🔴 Live | Must snapshot |
| `signatories.role` | Live read | 🔴 Live | Must snapshot |
| `signatories.signature_url` | Live read | 🔴 Live | Must snapshot (URL) |

**Summary:** 8 payment fields are frozen. 26+ fields referenced across joins are live and must be denormalized onto the receipt snapshot.

---

## 8. Immutability Audit

### Document transformation standard (§Law 1)

**Source:** `docs/STANDARD/document-transformation-standard.md`

> Law 1: Identity Immutability — `client_id`, `document_number`, `type`, `lineage` are locked after save.

This applies to invoices, quotations, and other documents. The Receipt module must follow the same pattern: once a receipt is saved, its snapshot data must be immutable.

### Current immutability controls

| Control | Exists? | Evidence |
|---------|---------|----------|
| `assertIdentityImmutable` for invoices | ✅ | `src/domain/invoice/assertIdentityImmutable.ts` |
| `payments.voided_at` soft-delete | ✅ | Payments can be voided but not deleted |
| `wht_receipts.receipt_status` lifecycle | ✅ | `pending → requested → received → verified` |
| Receipt snapshot immutability | ❌ | No receipt table exists |
| Receipt audit trail | ❌ | `activity_events` has no `receipt` entity type |
| `RECEIPT_TRACKED_FIELDS` | ❌ | Not defined in `src/lib/audit.ts` |

### What the audit infrastructure supports

**Source:** `supabase/migrations/20260520090008_audit_activity.sql:92-102`

```sql
-- record_activity_event supports:
entity_type: 'invoice' | 'quotation' | 'project'  -- NO 'receipt'
event_type: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'PAYMENT_RECORDED'
            | 'LINKED' | 'UNLINKED' | 'NOTE_ADDED' | 'DOCUMENT_ADDED'
            | 'ARCHIVED' | 'UNARCHIVED'  -- NO 'RECEIPT_GENERATED'
```

Adding receipt support requires:
1. Adding `'receipt'` to the `entity_type` CHECK constraint
2. Adding `'RECEIPT_GENERATED'` to the `event_type` CHECK constraint
3. Adding `RECEIPT_TRACKED_FIELDS` to `src/lib/audit.ts`

---

## 9. Gap Analysis

| # | Gap | Severity | Category | Blocking Impact | Repository Evidence |
|---|-----|----------|----------|-----------------|-------------------|
| G1 | No `receipts` table exists | **CRITICAL** | Storage | No place to persist receipt snapshots. Receipt module cannot function. | No migration contains `CREATE TABLE receipts`. Grep for `receipt` in migrations only finds `wht_receipts` and `payment_receipt` enum value. |
| G2 | No `receipt` key in prefix engine | **CRITICAL** | Numbering | Receipts cannot be uniquely numbered. No `RCP-xxxxxx` sequence. | `src/domain/prefixConstants.ts` — `DEFAULT_PREFIXES` has 7 keys, no `receipt`. `DocumentPrefixKey` type union has no `receipt`. |
| G3 | No receipt snapshot mechanism | **CRITICAL** | Immutability | Receipts would reflect live data, not payment-time data. Violates PRD §7.4.6. | `src/modules/invoices/services/paymentService.ts` — `recordPayment()` does not snapshot client/company/project data. |
| G4 | Company data not denormalized on payments | **HIGH** | Snapshot | Receipts cannot show the company identity that received the payment. | `settings` table (`20260520090000_core_tables.sql:101-122`) is a singleton. Read live in `partyProjection.ts:43-54`. |
| G5 | Client data not denormalized on payments | **HIGH** | Snapshot | Receipts cannot show the client that made the payment if client is renamed. | `clients` table read via `invoices.client_id → clients.name` JOIN. No `client_name` on `payments`. |
| G6 | Project data not denormalized on payments | **HIGH** | Snapshot | Receipts cannot show project context if project is renamed. | `projects` table read via `invoices.project_id → projects.name` JOIN. No `project_name` on `payments`. |
| G7 | Bank name not persisted on payments | **MEDIUM** | Snapshot | Receipts lose bank context if bank account is renamed/deleted. | `paymentService.ts` calls `fetchBankAccountName()` live. `payments` has `bank_account_id` but no `bank_name`. |
| G8 | `activity_events` has no `receipt` entity type | **MEDIUM** | Audit | Cannot audit receipt generation events. | `20260520090008_audit_activity.sql:92` — CHECK constraint only allows `invoice`, `quotation`, `project`. |
| G9 | No `RECEIPT_TRACKED_FIELDS` in audit lib | **MEDIUM** | Audit | Cannot track which receipt fields changed. | `src/lib/audit.ts` defines `INVOICE_TRACKED_FIELDS`, `QUOTATION_TRACKED_FIELDS` but no receipt equivalent. |
| G10 | No receipt PDF template | **MEDIUM** | Output | Receipts can be stored but not rendered as PDF. | No files found in `src/components/pdf-new/` for receipt templates. Invoice/quotation templates exist. |
| G11 | No receipt pages/routes | **LOW** | UI | No UI to view, list, or download receipts. | `src/pages/` has no receipt-related files. `src/domain/receipt/` does not exist. |
| G12 | TypeScript `InvoicePayment` type missing DDL fields | **LOW** | Type Safety | `currency_code`, `recorded_by`, `wht_certificate_ref`, `void_reason` not in TS type. | `src/modules/invoices/types/paymentTypes.ts` — interface missing 4 columns present in `20260520090003_invoices.sql:75-95`. |
| G13 | `invoices.client_id` defaults to `gen_random_uuid()` | **LOW** | Data Integrity | Orphaned client links possible. Not directly blocking receipts but indicates data quality risk. | `20260520090003_invoices.sql:12` — `client_id uuid NOT NULL DEFAULT gen_random_uuid()`. |
| G14 | DB CHECK constraint update needed for prefix engine | **LOW** | Migration | Adding `receipt` key requires updating `settings.document_prefixes` CHECK constraint. | `20260611000001_document_prefixes.sql` — CHECK constraint covers 7 types. New migration needed. |
| G15 | `generateDocumentNumber` function not found in codebase | **INFO** | Implementation | Function referenced in prefix standard but not found via grep. May be inline or named differently. | Grep for `generateDocumentNumber` across all `.ts` files returned zero results. |

---

## 10. Overall Readiness Verdict

### Verdict: **BLOCKED**

The Receipt module cannot be implemented without resolving the CRITICAL gaps (G1, G2, G3). The platform lacks:

1. **Storage** — No `receipts` table to persist snapshot data
2. **Numbering** — No `receipt` key in the prefix engine
3. **Snapshot mechanism** — No code to denormalize client/company/project/bank data at payment time

### What IS ready (foundation)

| Foundation | Status | Reuse Potential |
|------------|--------|-----------------|
| Prefix engine pattern | ✅ Established | Add `receipt` key, follow existing pattern |
| Document transformation standard | ✅ Established | Apply Law 1 (Identity Immutability) to receipts |
| Payment recording flow | ✅ Established | Extend `recordPayment()` to trigger receipt snapshot |
| WHT receipt scaffold | ✅ Exists | Pattern for receipt status lifecycle |
| Audit infrastructure | ✅ Exists | Extend with `receipt` entity type |
| PDF generation pipeline | ✅ Exists (invoice/quotation) | Create receipt-specific template |
| `invoice_financials_v` | ✅ Exists | Do NOT use for receipts — it's live |

### Implementation prerequisites (must complete before Receipt module)

1. **Migration:** Create `receipts` table with denormalized snapshot columns
2. **Migration:** Add `receipt` key to `DEFAULT_PREFIXES` and DB CHECK constraint
3. **Migration:** Add `receipt` entity type and `RECEIPT_GENERATED` event type to `activity_events`
4. **Domain:** Create `src/domain/receipt/` with types, snapshot builder, and preview model
5. **Service:** Extend `recordPayment()` to call receipt snapshot builder after insert
6. **Type:** Update `InvoicePayment` to include missing DDL fields (`currency_code`, `recorded_by`)

### Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Client renamed after payment → receipt shows wrong name | **Certain** without snapshot | Legal/compliance | Denormalize `client_name` at payment time |
| Company rebranded → receipts show new brand | **Certain** without snapshot | Brand consistency | Denormalize `company_name` at payment time |
| Bank account deleted → receipts lose bank context | **Likely** | Audit trail gap | Denormalize `bank_name` at payment time |
| Payment voided → receipt still shows as valid | **Possible** | Legal risk | Receipt must store `payment_voided_at` and handle voided state |
| Invoice total changed → receipt shows old vs new total | **Unlikely** (identity immutable) | Low | Snapshot `invoices.total` at payment time for defense-in-depth |

---

*End of audit. Report written by OpenCode on 2026-07-07 via Local Runner.*
