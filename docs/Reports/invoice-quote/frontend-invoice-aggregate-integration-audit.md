# Frontend Invoice Aggregate Integration Audit

**Date:** 2026-08-10
**Scope:** Static audit of all frontend invoice write/read paths against the 7 applied tenant invoice aggregate migrations. No code changes. READ-ONLY.

---

## Executive Summary

**Verdict: NOT READY for public-schema cutover.**

The 7 tenant invoice aggregate migrations are correctly applied and the database layer is sound. However, the frontend has two critical integration gaps that would cause silent data divergence if the public schema were deprecated today:

1. **Batch operations bypass tenant writes entirely** — `BatchActionFooter.tsx` writes all batch mark-paid, mark-unpaid, archive, and delete operations exclusively to `public.invoices` via the global `supabase` client, never touching `tenantClient` or any transactional RPC.
2. **Payment recording is not integrated with the transactional RPC** — `record_payment_transaction` exists in the database but has zero frontend callers. The legacy multi-step non-atomic payment flow is still in use.

Additional non-blocking technical debt exists across 8 files (redundant fallback paths, stale generated types, audit RPCs missing `p_entity_id`).

---

## Section 1 — Transactional RPC Usage

### save_invoice_with_items_transaction (4 params: p_entity_id, p_invoice_payload, p_items, p_mode)

| File | Line | Context | Status |
|------|------|---------|--------|
| `src/hooks/useInvoiceSave.ts` | 280 | `persist()` create path — when `entityId` is present | ✅ Correct params, production use |
| `src/hooks/useInvoiceSave.ts` | 303 | `persist()` update path — when `entityId` is present | ✅ Correct params, production use |
| `src/pages/viewQuotationActions.ts` | 207 | Quotation→invoice conversion — when `entityId` is present | ✅ Correct params, production use |
| `src/pages/viewQuotationActions.ts` | 218-228 | Fallback — when `entityId` absent | ⚠️ Legacy fallback: sequential `tenantClient` inserts |

**Evidence (useInvoiceSave.ts:276-310):**
```
if (entityId && isCreate) {
  const { data, error } = await supabase.rpc('save_invoice_with_items_transaction', {
    p_entity_id: entityId,
    p_invoice_payload: payload,
    p_items: itemsToSave,
    p_mode: 'create',
  })
}
if (entityId && !isCreate) {
  const { error } = await supabase.rpc('save_invoice_with_items_transaction', {
    p_entity_id: entityId,
    p_invoice_payload: payload,
    p_items: itemsToSave,
    p_mode: 'update',
  })
}
```

**Evidence (viewQuotationActions.ts:206-228):**
```
if (entityId) {
  const { data, error } = await supabase.rpc('save_invoice_with_items_transaction', {
    p_entity_id: entityId,
    p_invoice_payload: invoicePayload,
    p_items: items.filter(...).map((item, index) => toDbItem(item, null, index)),
    p_mode: 'create',
  })
} else {
  const { data, error } = await tenantClient.from('invoices').insert([invoicePayload]).select().single()
  // ...sequential item insert
}
```

### delete_invoice_with_items_transaction (2 params: p_entity_id, p_invoice_id)

| File | Line | Context | Status |
|------|------|---------|--------|
| `src/pages/Invoices.tsx` | 160 | `handleDelete()` — when `entityId` present | ✅ Correct params, production use |
| `src/modules/invoices/services/invoiceLifecycleService.ts` | 74 | `deleteInvoice()` — when `entityId` present | ✅ Correct params, production use |

**Evidence (Invoices.tsx:159-168):**
```
if (entityId) {
  const { error } = await supabase.rpc("delete_invoice_with_items_transaction", {
    p_entity_id: entityId,
    p_invoice_id: inv.id,
  })
  if (error) throw error
} else {
  await tenantClient.from("invoice_items").delete().eq("invoice_id", inv.id)
  const { error } = await tenantClient.from("invoices").delete().eq("id", inv.id)
  if (error) throw error
}
```

### record_payment_transaction

| File | Line | Callers |
|------|------|---------|
| Entire `src/` | — | **ZERO callers. Not integrated.** |

The RPC exists in the database but no frontend code calls it. Payment recording uses the legacy multi-step flow in `paymentService.ts`.

---

## Section 2 — Legacy Write Inventory

All direct `tenantClient.from('invoices')` and `tenantClient.from('invoice_items')` writes, categorized by operation type.

### invoices table direct writes

| File | Line | Operation | Fallback? | Severity |
|------|------|-----------|-----------|----------|
| `src/hooks/useInvoiceSave.ts` | 317 | `insert` (create) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/hooks/useInvoiceSave.ts` | 325 | `update` (edit) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/pages/Invoices.tsx` | 138 | `update` (archive) | No — always direct | ⚠️ WARNING |
| `src/pages/Invoices.tsx` | 167 | `delete` (cascade) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/pages/viewQuotationActions.ts` | 218 | `insert` (create) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/modules/invoices/services/invoiceLifecycleService.ts` | 29 | `update` (archive) | No — always direct | ⚠️ WARNING |
| `src/modules/invoices/services/invoiceLifecycleService.ts` | 94 | `delete` (cascade) | No — pre-RPC path | ⚠️ WARNING |
| `src/modules/invoices/services/invoiceStatusService.ts` | 19-21 | `update` (status) | No — always direct | ⚠️ WARNING |
| `src/modules/invoices/repositories/paymentRepository.ts` | 158-160 | `update` (status) | No — always direct | ⚠️ WARNING |
| `src/components/document-view/invoice/useInvoiceActions.ts` | 174,189 | `update` (custom_fields) | No — always direct | ✅ OK (custom_fields only) |

### invoice_items table direct writes

| File | Line | Operation | Fallback? | Severity |
|------|------|-----------|-----------|----------|
| `src/hooks/useInvoiceSave.ts` | 337 | `delete` (edit) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/hooks/useInvoiceSave.ts` | 347 | `insert` (edit) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/pages/Invoices.tsx` | 166 | `delete` (cascade) | Yes — redundant after RPC | ⚠️ WARNING |
| `src/pages/viewQuotationActions.ts` | 226 | `insert` (create) | Yes — when no `entityId` | ⚠️ WARNING |
| `src/modules/invoices/services/invoiceLifecycleService.ts` | 90 | `delete` (cascade) | No — pre-RPC path | ⚠️ WARNING |

### payments table direct writes (all legacy, none use record_payment_transaction)

| File | Line | Operation | Client | Severity |
|------|------|-----------|--------|----------|
| `src/modules/invoices/repositories/paymentRepository.ts` | 36-38 | `insert` | TenantClient | ❌ CRITICAL |
| `src/modules/invoices/repositories/paymentRepository.ts` | 86-90 | `update` (void) | TenantClient | ⚠️ WARNING |

### receipts table direct writes

| File | Line | Operation | Client | Severity |
|------|------|-----------|--------|----------|
| `src/modules/invoices/services/paymentService.ts` | 161 | `insert` | tenantClient | ⚠️ WARNING (should be inside RPC) |

---

## Section 3 — Audit RPC Entity Propagation

All audit RPC calls use the global `supabase` client (public schema). None pass `p_entity_id`.

| RPC | File:Line | `p_entity_id` passed? | Client | Classification |
|-----|-----------|----------------------|--------|---------------|
| `record_invoice_created` | `audit.ts:185` | ❌ No | `supabase` (public) | ⚠️ Transitional |
| `record_invoice_status_changed` | `audit.ts:195` | ❌ No | `supabase` (public) | ⚠️ Transitional |
| `record_payment_recorded` | **Not called from frontend** | N/A | N/A | ❌ Dead code |
| `record_payment_voided` | `audit.ts:274` | ❌ No | `supabase` (public) | ⚠️ Transitional |
| `record_payment_attachment_uploaded` | `audit.ts:261` | ❌ No | `supabase` (public) | ⚠️ Transitional |

Additionally, `recordPaymentRecorded` at `audit.ts:221-225` reads `supabase.from('invoices')` (public) to get invoice details for audit context — another public-schema dependency.

**Impact:** When public tables are deprecated, audit RPCs will fail to resolve invoice data for new tenant invoices. Currently harmless because legacy public rows still exist.

---

## Section 4 — Financial View Reads

All 7 files that read `invoice_financials_v` use `tenantClient` — this is correct.

| File | Line | Client | Columns Selected | `persisted_status`? | Status |
|------|------|--------|-----------------|---------------------|--------|
| `src/hooks/useDashboardData.ts` | 366 | `tenantClient` | `balance_due, cash_received, issue_date, due_date, computed_status` | ❌ Not selected | ✅ OK |
| `src/modules/reports/repositories/reportRepository.ts` | 21 | `tenantClient` | `*` | ✅ Indirectly | ✅ OK |
| `src/modules/invoices/repositories/paymentRepository.ts` | 65-66 | `TenantClient` | `computed_status, persisted_status` | ✅ Yes | ✅ OK |
| `src/modules/invoices/repositories/paymentRepository.ts` | 144-145 | `TenantClient` | `computed_status, persisted_status` | ✅ Yes | ✅ OK |
| `src/hooks/useProjectDocumentFetch.ts` | 151-152 | `tenantClient` | `id, balance_due, computed_status, cash_received` | ❌ Not selected | ✅ OK |
| `src/hooks/useInvoiceDetailData.js` | 131-133 | `tenantClient` | `*` | ✅ Indirectly | ✅ OK |
| `src/pages/ClientDetail.tsx` | 218-221 | `tenantClient` | `id, balance_due, computed_status, cash_received` | ❌ Not selected | ✅ OK |

**Key finding:** `persisted_status` is correctly prioritized in `paymentRepository.ts` (explicitly selected), and falls back to `computed_status` where not explicitly selected. No files read `persisted_status` from the old `invoices.status` column.

---

## Section 5 — Generated Types vs. Database

| Object | Generated (database.types.ts) | Actual DB Signature | Gap |
|--------|------------------------------|-------------------|-----|
| `invoice_financials_v` | 14 columns (L2520) | 15 columns | Missing `persisted_status` |
| `revert_invoice_to_quotation_transaction` | 3 params (L3165) | 4 params | Missing `p_entity_id` |
| `save_invoice_with_items_transaction` | **Not present** | 4 params | Entirely missing |
| `delete_invoice_with_items_transaction` | **Not present** | 2 params | Entirely missing |
| `record_payment_transaction` | **Not present** | 7 params | Entirely missing |
| `record_invoice_created` | Present (L2844) | 4 params (incl. `p_entity_id`) | Missing `p_entity_id` |
| `record_invoice_status_changed` | Present (L2872) | 7 params (incl. `p_entity_id`) | Missing `p_entity_id` |
| `record_payment_recorded` | Present (L2903) | 8 params (incl. `p_entity_id`) | Missing `p_entity_id` |
| `record_payment_voided` | Not verified | Unknown | Needs check |
| `record_payment_attachment_uploaded` | Not verified | Unknown | Needs check |

**Impact:** TypeScript won't recognize new parameters or return types. Currently bypassed via `any` casts or `select('*')`. Type safety debt — functional but fragile.

---

## Section 6 — Public-Schema Write Leaks (BatchActionFooter)

**All 4 batch invoice operations write exclusively to `public.invoices` via the global `supabase` client.** The function `createInvoiceBatchActions` at `BatchActionFooter.tsx:99-149` has no `tenantClient` parameter and no transactional RPC usage.

| Batch Operation | Client | Table Written | Also Writes to Tenant? | Divergent State? | Severity |
|----------------|--------|--------------|----------------------|-----------------|----------|
| Mark Paid | `supabase` (public) | `public.invoices` | ❌ No | ✅ Yes | ❌ CRITICAL |
| Mark Unpaid | `supabase` (public) | `public.invoices` | ❌ No | ✅ Yes | ❌ CRITICAL |
| Archive | `supabase` (public) | `public.invoices` | ❌ No | ✅ Yes | ❌ CRITICAL |
| Delete | `supabase` (public) | `public.invoices` | ❌ No | ✅ Yes | ❌ CRITICAL |

**Evidence (BatchActionFooter.tsx:4,107-147):**
```
import { supabase } from "@/supabase";  // L4 — global public client

// L107-110: Mark Paid
const { error } = await supabase
  .from("invoices")
  .update({ status: "paid" })
  .in("id", ids);

// L118-121: Mark Unpaid
const { error } = await supabase
  .from("invoices")
  .update({ status: "unpaid" })
  .in("id", ids);

// L130-133: Archive
const { error } = await supabase
  .from("invoices")
  .update({ archived_at: new Date().toISOString() })
  .in("id", ids);

// L142-144: Delete
const { error } = await supabase
  .from("invoices")
  .delete()
  .in("id", ids);
```

Called from `Invoices.tsx:73`:
```
const batchActions = useMemo(() => createInvoiceBatchActions(() => {
  patchUpdate({ search: state.search } as any)
}), [patchUpdate, state.search])
```

**Consequences:**
- Users batch-marking invoices as paid/unpaid see the public copy updated but the tenant copy unchanged
- Batch archive: public invoice archived, tenant invoice remains active
- Batch delete: public invoice deleted, **tenant invoice survives** — false sense of deletion
- Once public schema is deprecated, these batch operations will fail entirely or silently succeed against a non-existent table

---

## Section 7 — Integration Gaps & Severity

| # | Severity | File:Line | Current Behavior | Expected Behavior | Blocks Cutover? |
|---|----------|-----------|-----------------|-------------------|----------------|
| 1 | ❌ CRITICAL | `BatchActionFooter.tsx:107-148` | All 4 batch ops (mark-paid, mark-unpaid, archive, delete) write to `public.invoices` via `supabase` | Should use `tenantClient` + appropriate RPCs or direct tenant writes | **YES** |
| 2 | ❌ CRITICAL | `paymentService.ts:73-261` + `paymentRepository.ts:36-38` | Payment recording uses 4-step legacy path: insert payment → update status → insert receipt → sync financials | Should use `record_payment_transaction` RPC | **YES** |
| 3 | ⚠️ WARNING | `useInvoiceSave.ts:312-326` | Fallback: direct `tenantClient.from('invoices').insert/update` when `entityId` absent | Remove fallback once `entityId` is mandatory | No (transitional) |
| 4 | ⚠️ WARNING | `Invoices.tsx:166` | `tenantClient.from("invoice_items").delete()` after `delete_invoice_with_items_transaction` RPC | Redundant — RPC already deletes items | No |
| 5 | ⚠️ WARNING | `viewQuotationActions.ts:218-228` | Direct `tenantClient.from('invoices').insert` + `invoice_items.insert` after RPC call | These inserts happen after the transactional RPC for additional data setup | No |
| 6 | ⚠️ WARNING | `audit.ts:185,195,261,274` | All audit RPCs use `supabase` (public) and omit `p_entity_id` | Should use `tenantClient` and pass `p_entity_id` | No (transitional) |
| 7 | ⚠️ WARNING | `audit.ts:221-225` | `recordPaymentRecorded` reads `supabase.from('invoices')` (public) | Should read from `tenantClient` | No (transitional) |
| 8 | ⚠️ WARNING | `invoiceLifecycleService.ts:29` | Direct `tenantClient.from("invoices").update` for archive | Archive not covered by any transactional RPC | No |
| 9 | ⚠️ WARNING | `invoiceLifecycleService.ts:90` | Direct `tenantClient.from("invoice_items").delete` for cascade | Delete RPC covers this | No |
| 10 | ⚠️ WARNING | `paymentRepository.ts:86-90` | Payment void uses direct `tenantClient.from("payments").update` | Should use a void RPC | No |
| 11 | ⚠️ WARNING | `invoiceStatusService.ts:19-21` | Status update via direct `tenantClient.from("invoices").update` | Status sync not in any RPC | No |
| 12 | ⚠️ WARNING | `paymentRepository.ts:158-160` | Status sync via direct `tenantClient.from("invoices").update` | Status sync not in any RPC | No |
| 13 | ⚠️ WARNING | `database.types.ts` | Stale for all new/changed objects (6 objects missing or incorrect) | Regenerate types | No (type safety debt) |

---

## Section 8 — Cutover Readiness

### Blockers (must fix before public-schema deprecation)

1. **BatchActionFooter.tsx** — All 4 batch invoice operations write exclusively to `public.invoices`. Users performing batch operations will believe they've modified/deleted tenant invoices when only the legacy public copy was affected. This is a silent data-integrity disaster.

2. **paymentService.ts / paymentRepository.ts** — Payment recording uses the legacy 4-step non-atomic path. `record_payment_transaction` exists in the database but has zero frontend callers. Payments can partially insert (payment created, invoice status not updated, receipt not created).

### Non-blocking technical debt

- `useInvoiceSave.ts` fallback direct writes when `entityId` is absent
- `Invoices.tsx:166` redundant `invoice_items` delete after transactional delete RPC
- `viewQuotationActions.ts:218-228` direct inserts after RPC call
- `audit.ts` all 4 audit RPCs omit `p_entity_id` and use public client
- `audit.ts:221-225` `recordPaymentRecorded` reads public invoices
- `paymentRepository.ts:86-90` payment void not atomic
- `invoiceLifecycleService.ts:29,90` archive/cascade direct writes
- `invoiceStatusService.ts` + `paymentRepository.ts:158` status sync not in RPC
- `database.types.ts` stale for 6 objects

### Recommended implementation order for next coding task

1. **Fix `BatchActionFooter.tsx`** — Route batch operations through `tenantClient` + appropriate RPCs or direct tenant writes. This is the highest-impact fix.
2. **Integrate `record_payment_transaction`** — Replace legacy `paymentService.ts` multi-step flow with the transactional RPC for both recording and voiding.
3. **Constrain legacy fallback writes** — Make `entityId` mandatory in `useInvoiceSave.ts` and `Invoices.tsx` delete, remove fallback paths.
4. **Update audit RPC callers** — Pass `p_entity_id` and use `tenantClient` in `audit.ts`.
5. **Regenerate Supabase types** — Separate task to update `database.types.ts`.
6. **Remove redundant `invoice_items` delete** — `Invoices.tsx:166`.
7. **Re-audit all write paths** — Final verification before declaring cutover complete.
