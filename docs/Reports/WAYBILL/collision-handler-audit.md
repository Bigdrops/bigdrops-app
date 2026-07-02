# Collision Handler Architecture Audit

**Date:** 2026-06-11  
**Status:** Read-only audit — zero code changes  
**Scope:** All 6 document types (Invoice, Waybill, Quotation, CSR, RFQ, Project)

---

## Executive Summary

Only **Project** has a proper collision retry loop. **Waybill** has a two-phase approach (pre-check + insert) but no post-insert retry. **Quotation** has a pre-save check that bumps the number once but uses a hardcoded prefix. **Invoice**, **RFQ**, and **CSR** have **no collision handling** — they rely entirely on database unique constraints to reject duplicates, with no application-level retry.

---

## Document Type Analysis

### 1. Invoice

**Save path:** `NewInvoice.tsx` → `handleSave()` → inline Supabase insert  
**Number generation:** `getNextInvoiceNumber(rows, prefix)` — scans all existing `invoice_number` values, finds max, increments  
**Collision handling:** ❌ None

**Flow:**
1. `getNextInvoiceNumber()` generates candidate number from existing rows
2. `supabase.from('invoices').insert()` — single attempt
3. If insert fails (unique constraint), error shown to user, no retry

**Also:** `handleFinalSaveWithRevalidation` re-queries invoice numbers before save (race window still exists between query and insert)

---

### 2. Waybill

**Save path:** `waybillMutations.ts` → `saveWaybill()`  
**Number generation:** `getNextWaybillNumber(rows, prefix)` — scans existing `waybill_number` values  
**Collision handling:** ⚠️ Partial — pre-check only, no post-insert retry

**Flow:**
1. Query existing waybill numbers from DB
2. Generate candidate number using `getNextWaybillNumber()`
3. Insert with the candidate number
4. If insert fails with code `23505` AND error mentions waybill number → return error to caller (no retry)
5. Caller (`EditWaybill.tsx`, `NewWaybill.tsx`) catches and shows error

**Key detail:** The function queries numbers first to minimize collision window, but if two users save simultaneously, the second will get a unique constraint error with no retry.

---

### 3. Quotation

**Save path:** `QuotationForm.tsx` → `handleSave()`  
**Number generation:** Two separate paths:
- **Initial load:** Hardcoded `SASQ-${String(next).padStart(4, '0')}` (line 283) — does NOT use `resolvePrefix`
- **Pre-save check:** Queries if number exists, bumps once

**Collision handling:** ⚠️ Partial — pre-save bump, hardcoded prefix

**Flow:**
1. On form mount (new quotation): Fetches all quotation numbers, generates `SASQ-XXXX` (hardcoded prefix)
2. On save (new quotation):
   - Queries `quotations` table for existing row with same `quotation_number`
   - If exists: bumps number once (`SASQ-${String(num + 1).padStart(4, '0')}`) — **hardcoded prefix, ignores custom prefix**
   - Inserts with bumped number
3. If the bumped number also collides → error shown to user, no retry

**Critical issue:** The prefix is hardcoded to `SASQ` in both the initial generation and the collision bump. Custom prefixes from `document_prefixes.quotation` are only used in `cloneQuotation` (duplicate action), not in new quotation creation.

---

### 4. CSR

**Save path:** `NewCSR.tsx` → `handleSave()` → `createCsr()` in `csrService.ts`  
**Number generation:** `getNextCsrNumber(rows, prefix)` — scans existing `csr_number` values  
**Collision handling:** ❌ None (retry is for network timeouts only)

**Flow:**
1. `getNextCsrNumber()` generates candidate number
2. `createCsr()` calls `withRetry()` — but `withRetry` only retries on `isNetworkTimeout()` (AbortError, TimeoutError, fetch failures)
3. Unique constraint errors are NOT retried — they throw immediately

**Key detail:** `withRetry` in `csrService.ts` is a network resilience wrapper, not a collision handler. It checks `isNetworkTimeout()` which returns `true` only for `AbortError`, `TimeoutError`, or messages matching `/failed to fetch|networkerror|network request failed|timed out|timeout/i`. A Postgres unique constraint error (`23505`) does NOT match these patterns.

---

### 5. RFQ

**Save path:** `NewRfq.tsx` → `handleSave()` → inline Supabase insert  
**Number generation:** `getNextRfqNumber(rows, prefix)` — scans existing `rfq_number` values  
**Collision handling:** ❌ None

**Flow:**
1. `getNextRfqNumber()` generates candidate number
2. `supabase.from('rfqs').insert()` — single attempt
3. If insert fails (unique constraint), error shown to user, no retry

---

### 6. Project ✅ (Only type with collision retry)

**Save path:** `projects.ts` → `createProjectWithGeneratedCode()`  
**Number generation:** `generateNextProjectCode(supabase, date, prefix)` — uses `ilike` prefix search  
**Collision handling:** ✅ Built-in retry loop

**Flow:**
1. `for (let attempt = 0; attempt <= maxRetries; attempt += 1)` (default `maxRetries = 2`)
2. Each iteration: generate new project code → insert
3. If insert returns error AND `isProjectCodeConflict(error)` (code `23505` + mentions `project_code`) → loop again
4. If error is NOT a project code conflict → return immediately (non-collision errors don't retry)
5. After exhausting retries → return `{ data: null, error: lastError }`

**Caller:** `NewProject.tsx` passes `maxRetries = 2` and `settings?.document_prefixes?.project` as prefix.

---

## Summary Table

| Document | Collision Detection | Retry Loop | Pre-save Check | Prefix Source | Risk |
|----------|-------------------|------------|----------------|---------------|------|
| **Invoice** | DB unique constraint | ❌ None | ❌ None | `resolvePrefix` ✅ | High — silent failure if collision |
| **Waybill** | DB unique constraint | ❌ None | ✅ Query existing numbers | `resolvePrefix` ✅ | Medium — pre-check reduces window |
| **Quotation** | DB unique constraint | ❌ None | ✅ Single bump | ❌ Hardcoded `SASQ` | High — prefix mismatch + single bump |
| **CSR** | DB unique constraint | ❌ None (network only) | ❌ None | `resolvePrefix` ✅ | High — no collision handling |
| **RFQ** | DB unique constraint | ❌ None | ❌ None | `resolvePrefix` ✅ | High — silent failure if collision |
| **Project** | DB unique constraint | ✅ `maxRetries=2` | ❌ None | `resolvePrefix` ✅ | Low — proper retry loop |

---

## Recommendations (for future work, not this audit)

1. **Quotation:** Fix hardcoded `SASQ` prefix in `QuotationForm.tsx` lines 283 and 552 — use `resolvePrefix` instead
2. **All types except Project:** Consider adding a retry loop similar to `createProjectWithGeneratedCode` for collision resilience
3. **Waybill:** The pre-check pattern is good but could be combined with a post-insert retry for full coverage
4. **CSR:** The `withRetry` wrapper should be extended to also handle unique constraint errors, not just network timeouts
