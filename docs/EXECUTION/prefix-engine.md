# Prefix Engine — Execution Plan

**Document:** `docs/execution/prefix-engine.md`
**Status:** Execution Ready (Spec Defined)
**PRD Source:** `docs/prd/prefix-engine-settings.md`

---

## Overview

Implement a configurable document prefix engine. Store prefix configuration in the existing `settings` table (singleton row `id = 1`) as a `document_prefixes` JSONB column. All sequence generators read their prefix from settings at runtime.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage table | `settings` (not `organizations`) | No `organizations` table exists. `settings` is the existing singleton workspace config store. |
| Access pattern | `useSettings()` hook | All document creation screens already use this hook. No new context needed. |
| Prefix fallback | `DEFAULT_PREFIXES` constants | Hardcoded defaults when `settings.document_prefixes` is null/undefined. |
| Offline modules | Out of scope | Both `csrOffline.ts` and `quotationOffline.ts` are live in production. Deferred. |

---

## Database Changes

### Migration 1 — Add `document_prefixes` to `settings`

```sql
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS document_prefixes jsonb DEFAULT '{
  "waybill": "WBL",
  "invoice": "INV",
  "boq": "BOQ",
  "rfq": "RFQ",
  "quotation": "QTN",
  "project": "PRJ",
  "csr": "CSR"
}'::jsonb;

CONSTRAINT check_document_prefixes_format CHECK (
  document_prefixes IS NULL OR (
    jsonb_typeof(document_prefixes) = 'object' AND
    (document_prefixes->>'waybill')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'invoice')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'boq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'rfq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'quotation') ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'project')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'csr')       ~ '^[A-Z0-9]{2,6}$'
  )
)
```

### Migration 2 — Create `blank_csr_logs`

```sql
CREATE TABLE IF NOT EXISTS public.blank_csr_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_csr_number text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_csr_id uuid,
    reconciled_at timestamp with time zone,
    CONSTRAINT blank_csr_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_csr_logs_number_key UNIQUE (assigned_csr_number),
    CONSTRAINT blank_csr_logs_linked_csr_id_fkey FOREIGN KEY (linked_csr_id)
        REFERENCES public.csrs(id) ON DELETE SET NULL,
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_csr_id IS NULL AND reconciled_at IS NULL) OR
        (linked_csr_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_blank_csr_logs_linked_id
    ON public.blank_csr_logs(linked_csr_id);
```

Note: `blank_waybill_logs` already exists in production — no migration needed.

---

## Generator Status

| Generator | File | Prefix Source | Dynamic? | Action |
|---|---|---|---|---|
| `getNextInvoiceNumber` | `documentConversion.ts` | Default param `'SASINV-B'` | Yes | Pass prefix from settings; consolidate inline duplicates |
| `getNextQuotationNumber` | `quotation/normalize.ts` | Default param `'SASIQUO'` | Yes | Pass prefix from settings at all 5 call sites |
| `getNextRfqNumber` | `rfq/normalize.ts` | Default param `'RFQ'` | Yes | Pass prefix from settings at 1 call site |
| `getNextCsrNumber` | `csrUtils.ts` | Hardcoded `'CSR-001'` | No | Add prefix parameter, update call site |
| `generateWaybillSequenceNumber` | `waybillUtils.ts` | Hardcoded `'AWB-E-'`/`'AWB-I-'` | No | DELETE — duplicate of `getNextWaybillNumber` |
| `getNextWaybillNumber` | `waybillUtils.ts` | Hardcoded `'AWB-E-'`/`'AWB-I-'` | No | Add prefix parameter, update 2 call sites |
| `generateNextProjectCode` | `projects.ts` | `PRJ-{year}-` | Partial | Accept prefix param |
| Offline generators (CSR/Quotation) | `csrOffline.ts`, `quotationOffline.ts` | Hardcoded | No | OUT OF SCOPE |

---

## Implementation Order (13 Steps)

| # | Step | Details |
|---|---|---|
| 1 | Migration — `document_prefixes` column | Add JSONB column to `settings` with defaults + CHECK constraint |
| 2 | Migration — `blank_csr_logs` table | Create table for blank CSR tracking |
| 3 | Constants + resolution pattern | Create `DEFAULT_PREFIXES` constants; wire `useSettings()` → `document_prefixes` accessor |
| 4 | Settings UI | Document Prefixes card: live preview, dirty state, solo reset, full reset, cross-type conflict detection |
| 5 | Consolidate invoice inline logic | Replace inline `'SASINV-B'` duplicates in `NewInvoice.tsx` and `Invoices.tsx` with shared `getNextInvoiceNumber()` |
| 6 | Delete duplicate waybill function | Remove `generateWaybillSequenceNumber`; consolidate to `getNextWaybillNumber` |
| 7 | Add prefix params | Add prefix parameter to `getNextWaybillNumber()` and `getNextCsrNumber()` |
| 8 | Wire generators to settings | Waybill, Invoice, Quotation, RFQ, CSR — pass `settings.document_prefixes.xxx` |
| 9 | Project sequence generation | Build project document sequence generation from scratch |
| 10 | Wire Project generator | Connect project generator to settings prefix |
| 11 | Collision handler | Silent auto-retry (max 3 attempts) across all document types |
| 12 | Blank waybill number assignment | Wire blank download to use org prefix + log to `blank_waybill_logs` |
| 13 | Blank CSR number assignment | Build blank CSR download, log to `blank_csr_logs` (number engine only, no PDF) |

---

## Out of Scope (This Build)

- Offline CSR module (`csrOffline.ts`) — live in production, deferred
- Offline Quotation module (`quotationOffline.ts`) — live in production, deferred
- Blank waybill template PDF rendering — moved to `docs/pdf-rendering-roadmap.md`
- Blank CSR template PDF rendering — moved to `docs/pdf-rendering-roadmap.md` (number engine IS in scope as step 13)
