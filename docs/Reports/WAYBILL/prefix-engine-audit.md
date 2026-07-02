# Prefix Engine Audit Report

**Date:** 2026-06-15  
**Scope:** Read-only audit for prefix engine settings implementation  
**Status:** Implementation pending — design spec exists at `docs/PREFIX_ENGINE_SETTINGS.md`

---

## 1. Organization Context

**Result: Does NOT exist.**

No organization context provider, hook, or utility exists in the codebase. Searched for `useOrganization`, `useOrg`, `useWorkspace`, `currentOrg`, `organization_id`, `org_id` across all `src/` — zero matches.

- `src/context/` contains only `DocumentQueryContext.tsx` — unrelated to organizations.
- No `organizations` table exists in migrations (only `profiles`, `clients`, `settings`, `signatories`, `bank_accounts`).
- No `organizations` type in `src/lib/database.types.ts`.
- There is no mechanism for components to access a current organization's data.

**Implication:** The prefix engine spec assumes org context — but there is no org infrastructure yet. This must be built from scratch.

---

## 2. Existing Sequence Generators

| # | File | Function | Document Type | Prefix Source | Current Prefix |
|---|---|---|---|---|---|
| 1 | `src/components/waybill/waybillUtils.ts:453` | `generateWaybillSequenceNumber()` | Waybill | Hardcoded inside function | `AWB-I-` (internal), `AWB-E-` (external) |
| 2 | `src/components/waybill/waybillUtils.ts:463` | `getNextWaybillNumber()` | Waybill (blank) | Hardcoded inside function | `AWB-I-` (internal), `AWB-E-` (external) |
| 3 | `src/domain/documentConversion.ts:8` | `getNextInvoiceNumber()` | Invoice | Default parameter | `SASINV-B` |
| 4 | `src/domain/quotation/normalize.ts:29` | `getNextQuotationNumber()` | Quotation | Default parameter | `SASIQUO` |
| 5 | `src/domain/rfq/normalize.ts:131` | `getNextRfqNumber()` | RFQ | Default parameter | `RFQ` |
| 6 | `src/domain/projects.ts:66` | `getProjectCodePrefix()` + `generateNextProjectCode()` | Project | Hardcoded inside function | `PRJ-{year}-` |
| 7 | `src/components/csr/csrUtils.ts:165` | `getNextCsrNumber()` | CSR | Hardcoded fallback | `CSR-001` (no prefix param) |
| 8 | `src/lib/native/csrOffline.ts:74` | `formatCsrNumber()` | CSR (offline) | Hardcoded | `SASCSR-{deviceCode}{seq}` |
| 9 | `src/lib/native/quotationOffline.ts:64` | `formatQuotationNumber()` | Quotation (offline) | Hardcoded | `SASQUO-{deviceCode}{seq}` |

**Key observations:**
- Waybill, Invoice, Quotation, RFQ, CSR generators all use `MAX(numeric_suffix) + 1` pattern — consistent with spec.
- Only **Invoice** (3), **Quotation** (4), and **RFQ** (5) accept prefix as a *default parameter* — others hardcode it internally.
- **CSR** generator (7) has no prefix parameter at all; fallback is literal `CSR-001`.
- Offline generators (8, 9) use device-code-based prefixes — they are a separate concern.

### Waybill `viewWaybillActions.ts:24` (line 24):
Uses hardcoded `AWB-I-` / `AWB-E-` to query existing waybills when generating a new number on the view page — same hardcoded pattern.

---

## 3. Project Documents Numbering

**File:** `src/domain/projectDocuments.ts`  

**Result: Does NOT have a sequence generator or auto-numbering field.**

- The `ProjectDocumentRecord` type has `reference_number?: string | null` and `voucher_number?: string | null` — both manual entry fields.
- No `project_number` or `document_number` auto-generation function exists.
- No sequence number generator for project documents.

---

## 4. Blank Template Download

### Blank Waybill — ✅ Implemented

| File | Details |
|---|---|
| `src/components/waybill/blankWaybillTemplate.tsx` | `downloadBlankWaybillTemplate(type, waybillNumber)` — generates PDF via `@react-pdf/renderer`. Has `BlankExternalTemplate` and `BlankInternalTemplate` components. |
| `src/pages/NewWaybill.tsx:41` | `handleBlankDownload()` — orchestrates the flow: fetches existing numbers → generates next number → inserts into `blank_waybill_logs` → calls `downloadBlankWaybillTemplate` → shows success toast. |

### Blank CSR — ❌ Not Implemented

- No `blankCsrTemplate.tsx` file exists.
- No `downloadBlankCsrTemplate()` function exists.
- No blank CSR download UI in any CSR component.
- No blank CSR logging to any table.

---

## 5. `blank_waybill_logs` and `blank_csr_logs` Tables

### `blank_waybill_logs` — ✅ Exists (in migration + types)

| Source | Details |
|---|---|
| `supabase/migrations/20260611000000_waybill_schema_final.sql:128` | `CREATE TABLE IF NOT EXISTS public.blank_waybill_logs(...)` with columns: `id`, `assigned_waybill_number`, `type`, `downloaded_by`, `downloaded_at`, `linked_waybill_id`, `reconciled_at`. Has UNIQUE constraint on `assigned_waybill_number`, FK to `waybills(id)`, check constraint on type (`'external'`/`'internal'`), and reconciliation mapping check. |
| `src/lib/database.types.ts:162` | TypeScript type exists for `blank_waybill_logs`. |
| `src/pages/NewWaybill.tsx:51` | Actively used — inserts rows on blank waybill download. |

### `blank_csr_logs` — ❌ Missing (spec only)

| Source | Details |
|---|---|
| `docs/PREFIX_ENGINE_SETTINGS.md:271` | Complete DDL defined in spec — columns: `id`, `assigned_csr_number`, `downloaded_by`, `downloaded_at`, `linked_csr_id`, `reconciled_at`. Same UNIQUE/FK/check patterns as waybill. |
| **Migration files** | **Does not exist** in any migration. |
| `src/lib/database.types.ts` | **Not present** in TypeScript types. |
| **Code** | **Not referenced** anywhere in application code. |

---

## 6. `organizations` Table — `document_prefixes` Column

**Result: Neither the `organizations` table nor the `document_prefixes` column exists.**

| Source | Details |
|---|---|
| `docs/PREFIX_ENGINE_SETTINGS.md:31` | Full DDL defined: `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS document_prefixes jsonb DEFAULT {...}` with a CHECK constraint validating each prefix against `^[A-Z0-9]{2,6}$`. |
| **Migration files** | **No migration** creates the `organizations` table. |
| `src/lib/database.types.ts` | **No `organizations` type** exists. |
| `supabase/migrations/20260520090000_core_tables.sql` | Core tables include `profiles`, `clients`, `settings`, `signatories`, `bank_accounts` — **no `organizations`**. |

**Implication:** The entire `organizations` table needs to be created before `document_prefixes` can be added. This is a prerequisite for the entire prefix engine.

---

## Summary of Gaps (Implementation Order)

| Priority | Gap | Blocked By |
|---|---|---|
| 1 | `organizations` table does not exist in DB | Nothing — needs migration + type definition |
| 2 | `document_prefixes` column not on any table | #1 |
| 3 | No org context provider/hook exists | #1 |
| 4 | `blank_csr_logs` table does not exist in DB | Nothing — separate concern from org |
| 5 | No blank CSR template/download | #4 |
| 6 | All sequence generators use hardcoded/or-default prefixes | #2, #3 |
| 7 | Project documents have no sequence number generator | Separate concern |
