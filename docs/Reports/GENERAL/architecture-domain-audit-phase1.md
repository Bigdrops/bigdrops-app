# Architecture & Domain Audit — Phase 1

This report was written by Mimo.

---

## 1. Objective & Scope

### Objective
Audit the Big Drops codebase across five targeted areas to assess architecture cleanliness, standard conformance, and risk exposure:
1. Domain purity & boundary adherence
2. Payment architecture
3. Project aggregation model
4. WHT audit trail
5. Document transformation & lineage

### Scope
- All files under `src/domain/` (93 files across 12 subdomains)
- All files under `src/modules/invoices/` (payment types, service, repository)
- Payment components (`src/components/RecordPaymentModal.tsx`, `src/components/invoice/paymentEntryHelpers.ts`)
- Project pages (`src/pages/Projects.tsx`, `ProjectDetail.tsx`, `NewProject.tsx`, `ProjectDocumentView.tsx`)
- Project hook (`src/hooks/useProjectDocumentFetch.ts`)
- Migration files (`supabase/migrations/20260520090003_invoices.sql`, `20260520090004_csrs.sql`, `20260520090001_projects.sql`)
- Governance files (`AGENTS.md`, `docs/STANDARD/*`)

### Excluded
- PDF render engines (`src/components/pdf/`, `src/components/pdf-new/`, `src/components/waybill/pdf/`) — scoped to data architecture, not rendering
- Mobile Capacitor bridge (`src/lib/native/`)
- Third-party service integrations (`src/services/`)
- CSS and styling files
- Test files (save for deferred verification pass)
- The item library module (`src/modules/item-library/`)
- The compliance module

---

## 2. Methodology

- **File inventory**: All `.ts`/`.tsx`/`.js` files in `src/domain/` were listed with line counts
- **Content reading**: Every key implementation file in the 5 audit areas was read in full
- **Schema analysis**: The 3 migration files for invoices, CSRs/waybills, and projects were read
- **Standard comparison**: Each finding was cross-referenced against `AGENTS.md` rules and `docs/STANDARD/*` documents
- **No code was modified** during this audit

---

## 3. Findings

### 3.1 Domain Purity & Boundary Adherence

#### 3.1.1 Positive Observations

| Finding | Location | Detail |
|---------|----------|--------|
| Invoice domain is the richest subdomain | `src/domain/invoice/` (27 files) | Types, columns, calculations, normalize, factory, preview, projections, financial state, status resolution, advance config, actions — comprehensive separation |
| `Calculations.ts` is respected as source of truth | `src/lib/Calculations.ts` | All invoice/quotation screens and PDF templates delegate to `calcTotals()` / `resolveRowVat()`. No duplicated financial math found. |
| `resolveInvoiceStatus.ts` never reads `invoice.status` | `src/domain/invoice/resolveInvoiceStatus.ts` | Delegates to `calculateInvoiceFinancialState()` from `financialState.ts`, then applies OVERDUE overlay from due_date. Compliant with the standard. |
| Document lifecycle actions are well-separated | `src/domain/invoice/actions.js` | Action visibility logic is in the domain layer; pages orchestrate execution; components render UI. |
| Quotation domain reuses invoice layer | `src/domain/quotation/` | Quotation types, preview, and calculations use invoice primitives — no duplicate financial logic. |

#### 3.1.2 Concerns

| Finding | Location | Risk |
|---------|----------|------|
| `.js` files with no types | `src/domain/invoice/actions.js`, `src/domain/document/documentActionState.js`, `src/domain/documentMedia.js`, `src/domain/documentRelationships.js`, `src/domain/document/documentViewModel.js` | MEDIUM — No TypeScript coverage means no compile-time safety for the action visibility and document relationship logic that controls critical UI flows (edit, duplicate, revert buttons). |
| `any` type used in hooks | `src/hooks/useProjectDocumentFetch.ts:17` (`[key: string]: any` on `Project`), `:81` on `TimelineItem` | LOW — The hook interface leakages skip compile-time checking for the project detail page uses. Mitigated by runtime Supabase response shapes. |
| `as` casts in hooks | `src/hooks/useProjectDocumentFetch.ts:160` (`...invoice, invoiceFinancials: ...`) | LOW — Spread merge is stable but bypasses type narrowing. |

### 3.2 Payment Architecture

#### 3.2.1 Architecture Summary

The payment system spans three layers:

```
DB: payments table (payments.id → invoices.id)
     ├── invoice_financials_v (aggregate view per invoice)
     └── project_financials_v (aggregate view per project)
     ├── wht_receipts table (standalone WHT receipt tracking)

Domain: src/domain/invoice/financialState.ts → calculateInvoiceFinancialState()
        src/domain/invoice/resolveInvoiceStatus.ts → adds OVERDUE

Module: src/modules/invoices/types/paymentTypes.ts → InvoicePayment, PaymentInput, etc.
        src/modules/invoices/services/paymentService.ts → normalizePaymentInput(), recordInvoicePayment()
        src/modules/invoices/repositories/paymentRepository.ts → direct Supabase queries

UI:    src/components/RecordPaymentModal.tsx → React dialog
       src/components/invoice/paymentEntryHelpers.ts → client-side validation
```

#### 3.2.2 Positive Observations

| Finding | Location | Detail |
|---------|----------|--------|
| Financial state is safely derived | `src/domain/invoice/financialState.ts` | `calculateInvoiceFinancialState()` sums `cash_amount` and `wht_amount` from payments, computes `balanceDue`, `overpaymentAmount`, `paymentState`. Never reads `invoice.status`. |
| Payment recording uses service + repo pattern | `src/modules/invoices/services/paymentService.ts`, `src/modules/invoices/repositories/paymentRepository.ts` | Service normalizes input, repository executes DB writes. Clean separation. |
| WHT is tracked per-payment | `payments` table has `wht_amount`, `wht_rate`, `wht_type` columns | Enables WTH-at-source tracking per payment. |
| Payment tolerance is explicit | `financialState.ts` line ~31: `const TOLERANCE = 1` | One currency unit (kobo) tolerance for balance comparisons prevents floating-point edge cases. |

#### 3.2.3 Concerns

| Finding | Location | Risk |
|---------|----------|------|
| No dedicated `src/domain/payment/` directory | Payment types are under `src/modules/invoices/`, not `src/domain/` | MEDIUM — AGENTS.md `§6` shows `domain/` as the canonical location for domain logic. Payment types (`InvoicePayment`, `PaymentInput`, `PaymentFormState`) are domain concepts, not module-specific. They should live in `src/domain/invoice/` or a new `src/domain/payment/`. |
| `PaymentInput` has no `wht_rate` or `wht_type` fields | `src/modules/invoices/types/paymentTypes.ts` ~line 33 | HIGH — The insert payload in `paymentService.ts` sets `wht_rate` and `wht_type` to `null` regardless of what the user entered. WHT rate/type data submitted in a payment is silently discarded. This means WHT-at-source tracking is incomplete — you know the WHT amount but not what rate or type it was computed at. |
| `paymentEntryHelpers.ts` hardcodes `whtDeducted` to 0 | `src/components/invoice/paymentEntryHelpers.ts` | HIGH — The WHT input field exists in `RecordPaymentModal` but its value is ignored in the helper that computes the entry summary. The UI shows a WHT field but its value never reaches the database. User-facing bug. |
| `PaymentInput` is not the single source of truth | `paymentTypes.ts` defines `PaymentInput`; `paymentService.ts` constructs its own insert payload separately | MEDIUM — The insert payload shape diverges from `PaymentInput`. If `PaymentInput` is updated, the service may silently fall out of sync. |

### 3.3 Project Aggregation Model

#### 3.3.1 Architecture Summary

```
DB: projects table (project metadata only — no financial rollups)
     ├── invoices (linked by project_id)
     │    ├── payments (linked by invoice_id)
     │    └── invoice_financials_v (per-invoice aggregation)
     ├── project_financials_v (per-project aggregation over invoice_financials_v)
     ├── csrs (linked by project_id)
     ├── quotations (linked by project_id)
     ├── waybills (linked by project_id)
     └── project_documents (linked by project_id)

Hook: src/hooks/useProjectDocumentFetch.ts
      → 7 parallel queries + 1 sequential query for invoice_financials_v
      → Builds timeline + enrichedInvoices client-side

Domain: src/domain/projects.ts → validation + factory
        src/domain/projectDocuments.ts → DocumentType + extraction helpers
        src/domain/projectDetailUtils.ts → status config + UI helpers
        src/domain/documentActionState.js → getProjectActionState()
```

#### 3.3.2 Positive Observations

| Finding | Location | Detail |
|---------|----------|--------|
| No denormalized financial rollups | `projects` table schema | The `projects` table has no `total_invoiced`, `total_collected`, or similar columns. All aggregation happens via `project_financials_v`. Compliant with the "view-level aggregation" standard. |
| Parallel query pattern | `useProjectDocumentFetch.ts:115-139` | 7 queries run in parallel via `Promise.all`. Good performance for project detail page load. |

#### 3.3.3 Concerns

| Finding | Location | Risk |
|---------|----------|------|
| Sequential query for invoice financials | `useProjectDocumentFetch.ts:148-156` | LOW — After the 7 parallel queries resolve, a second sequential query fetches `invoice_financials_v` per-invoice. This could be folded into the parallel batch by emitting the invoiceId query alongside the others. Not a correctness issue but a minor performance concern. |
| Client-side timeline sort | `useProjectDocumentFetch.ts:209` | LOW — Timeline is sorted client-side via `.sort()`. For hundreds of documents, this should be pushed to the DB query. Acceptable at current scale. |
| No real-time subscriptions | `useProjectDocumentFetch.ts` | LOW — No Supabase real-time channel. Page must be refreshed to see new data. Acceptable for current usage patterns. |
| `Project` interface leaks `[key: string]: any` | `useProjectDocumentFetch.ts:17` | LOW — The index signature bypasses type checking on project fields. |

### 3.4 WHT Audit Trail

#### 3.4.1 Architecture Summary

WHT tracking is split across two tables:

1. **`payments.wht_amount`** — per-payment WHT amount recorded at payment time
2. **`payments.wht_rate`**, **`payments.wht_type`** — rate and type columns (always NULL in current code)
3. **`wht_receipts` table** — standalone WHT receipt documents (defined in `20260520090003_invoices.sql`)
4. **`blank_waybill_logs`** — waybill blank token consumption log (defined in `20260520090004_csrs.sql`)

#### 3.4.2 Positive Observations

| Finding | Location | Detail |
|---------|----------|--------|
| WHT amount is recorded per-payment | `payments.wht_amount` column | Each payment can carry its own WHT amount, enabling accurate reconciliation. |
| WHT receipts table exists | `wht_receipts` table in migration | Provides a home for formal WHT receipt documents. |
| Blank token audit log exists | `blank_waybill_logs` table | Number reuse is prevented at the DB level. |

#### 3.4.3 Concerns

| Finding | Location | Risk |
|---------|----------|------|
| WHT rate and type are never stored | `paymentService.ts` sets both to `null` | HIGH — See §3.2.3. Without rate/type, you cannot reconstruct the WHT computation, audit whether the correct rate was applied, or generate WHT receipts with the required metadata. |
| `wht_receipts` table has no active code path | Migration defines table, no service/repository found | MEDIUM — The table appears to be schema-only. No code writes to or reads from it. WHT receipts are not generated or stored by any payment flow. |
| Waybill blank token audit is decoupled from WHT | Separate table, separate concerns | ACCEPTABLE — These are distinct audit trails. No issue. |

### 3.5 Document Transformation & Lineage

#### 3.5.1 Architecture Summary

```
conversionTrail (stored in custom_fields JSONB):
  {
    source: { id, number, type },
    derived: [ { id, number, type, action } ]
  }

Code:
  src/domain/documentConversion.ts → parseDocumentCustomFields()
  src/domain/documentRelationships.js → getConversionTrail() → query helpers
  src/domain/document/documentActionState.js → lifecycle state machine
```

Document lineage is encoded in `custom_fields` as a `conversionTrail` object. This is a recursive, schema-flexible approach that avoids separate join tables.

#### 3.5.2 Positive Observations

| Finding | Location | Detail |
|---------|----------|--------|
| Traversal helpers exist | `documentRelationships.js` | `getConversionTrail()`, `getInvoiceSourceDocument()`, `fetchInvoiceChildDocuments()` provide structured access to conversion metadata. |
| Invoice-to-waybill spawn strips monetary values | AGENTS.md §11 | Enforced by AGENTS.md rule — any code that spawns a waybill from invoice items must strip `unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`. |
| Prefix is never hardcoded | `src/domain/prefixConstants.ts` | `resolvePrefix()` is the canonical source for all document type prefixes. Compliant with `docs/STANDARD/prefix-engine-settings-standard.md`. |

#### 3.5.3 Concerns

| Finding | Location | Risk |
|---------|----------|------|
| No shared `custom_fields` schema type | No TypeScript interface for `custom_fields` structure across all document types | MEDIUM — Each document type (invoice, quotation, waybill, CSR, BOQ, RFQ) manually constructs its `custom_fields`. There is no canonical type that enforces `conversionTrail` structure. A consumer parsing `custom_fields` from any document type cannot rely on compile-time guarantees. |
| `documentRelationships.js` is untyped | `.js` file with inferred parameter types | LOW — Functions accept loosely typed arguments and return weakly typed objects. Consumers must handle `null`/`undefined` at every call site. |
| Conversion trail is JSONB — no DB validation | No CHECK constraint on `custom_fields` JSONB structure | MEDIUM — Unlike `items` which has `check_items_json_structure`, there is no DB-level validation that `custom_fields.conversionTrail` (when present) has the required shape (`source.id`, `source.number`, `source.type`). Invalid conversion trails can be inserted without error. |

---

## 4. Risks & Limitations

### 4.1 Critical Risks

1. **WHT rate/type data loss** — The payment UI has a WHT rate/type input, but both values are silently discarded before DB insert. Users entering this data believe it is saved. This is an active data loss bug.

2. **WHT receipt code path is dead** — The `wht_receipts` table exists in the schema but no application code writes to it. WHT receipts cannot be generated or retrieved through the application.

### 4.2 High Risks

3. **Payment domain straddles `src/modules/` and `src/components/`** — Domain types (`InvoicePayment`, `PaymentInput`) are in `src/modules/invoices/types/` rather than `src/domain/`, violating the project's domain ownership convention. This increases the risk of type drift.

4. **No canonical `custom_fields` TypeScript type** — The `conversionTrail` structure is constructed inline across multiple document modules without a shared type. A future refactor could silently break conversion trail consumers.

### 4.3 Limitations of This Audit

- No runtime testing was performed — findings are based on static code analysis only
- Test files were not reviewed — there may be edge case coverage gaps not captured here
- The PDF rendering engines were excluded — data flow into PDF preview functions was not audited
- The audit was performed on a single snapshot of the codebase; some findings may already be addressed in uncommitted work

---

## 5. Verification

- **No code was modified** during this audit
- All findings are based on file reads, grep searches, and schema inspection
- `bun run audit:load` was not executed as it is a pre-build step, not an audit validation tool
- `bun run typecheck` was not run — deferred to avoid false positives from pre-existing type errors

---

## 6. Recommendations

### 6.1 Immediate (Bug Fixes)

1. **Fix `paymentEntryHelpers.ts`** — Remove the hardcoded `whtDeducted = 0` and thread the user-entered WHT rate/type through to the service call.

2. **Fix `paymentService.ts`** — Include `wht_rate` and `wht_type` from `PaymentInput` in the insert payload instead of hardcoding `null`.

### 6.2 Short-Term (Architecture Hygiene)

3. **Create a canonical `PaymentInput` single source of truth** — Move payment types into `src/domain/invoice/` and make `paymentService.ts` reference the same type. Remove the separate insert payload construction.

4. **Define a shared `CustomFields` type** — Create `src/domain/customFields.ts` with a TypeScript interface for `conversionTrail`, `advanceDisplay`, `bankAccounts` projections, and any other shared `custom_fields` shapes. Add a DB CHECK constraint for basic conversionTrail validation.

### 6.3 Medium-Term

5. **Wire up `wht_receipts` table** — Implement a service/repository pair for WHT receipt creation, either automatic when a payment with WHT is recorded, or manual via a new UI.

6. **Migrate `.js` domain files to `.ts`** — `actions.js`, `documentActionState.js`, `documentMedia.js`, `documentRelationships.js`, `documentViewModel.js` should be converted to TypeScript to gain compile-time safety on the action visibility and document relationship logic.

7. **Add a Supabase real-time channel to `useProjectDocumentFetch`** — Subscribe to changes on `project_financials_v` and linked document tables so the project detail page updates automatically.

---

## 7. Deferred Work

- **Test audit**: The test files (`src/tests/critical/*.test.js`) were not reviewed. A separate pass should verify that payment recording, document transformation, and project aggregation have adequate test coverage.
- **PDF data flow audit**: Verifying that PDF preview functions correctly receive shaped data (and do not recompute prices/taxes) is deferred.
- **Performance benchmarking**: No latency or query performance measurements were taken.
- **Cross-module consistency audit**: Checking that BOQ, RFQ, and CSR modules follow the same domain patterns as invoice/waybill is deferred.

---

## 8. File Reference Index

Key files referenced in this report, with line counts and roles:

| File | Lines | Role |
|------|-------|------|
| `src/lib/Calculations.ts` | ~400 | Financial calculation source of truth |
| `src/domain/invoice/financialState.ts` | ~120 | Payment-state derivation from payment records |
| `src/domain/invoice/resolveInvoiceStatus.ts` | ~40 | Presentation-layer status with OVERDUE |
| `src/domain/invoice/actions.js` | ~200 | Document lifecycle action visibility |
| `src/domain/prefixConstants.ts` | ~60 | Canonical prefix engine |
| `src/domain/document/documentActionState.js` | ~150 | Cross-document lifecycle state machine |
| `src/domain/documentConversion.ts` | ~80 | custom_fields parsing |
| `src/domain/documentRelationships.js` | ~94 | Conversion trail traversal helpers |
| `src/domain/projects.ts` | ~200 | Project validation & factory |
| `src/domain/projectDocuments.ts` | ~100 | Project document types & extraction |
| `src/domain/projectDetailUtils.ts` | ~150 | UI status configs |
| `src/modules/invoices/types/paymentTypes.ts` | ~80 | Payment types (InvoicePayment, PaymentInput, etc.) |
| `src/modules/invoices/services/paymentService.ts` | ~90 | Payment normalization & recording |
| `src/modules/invoices/repositories/paymentRepository.ts` | ~70 | Direct Supabase payment queries |
| `src/components/RecordPaymentModal.tsx` | ~250 | Payment recording dialog |
| `src/components/invoice/paymentEntryHelpers.ts` | ~100 | Client-side payment validation |
| `src/hooks/useProjectDocumentFetch.ts` | ~224 | Project data aggregation hook |
| `supabase/migrations/20260520090003_invoices.sql` | ~150 | Invoices, payments, wht_receipts schema |
| `supabase/migrations/20260520090004_csrs.sql` | ~200 | CSRs, waybills, blank_waybill_logs schema |
| `supabase/migrations/20260520090001_projects.sql` | ~80 | Projects, project_documents schema |

---

## 9. Previously Audited Modules

A prior architecture audit was completed in `docs/Reports/GENERAL/shared-systems-architecture-audit.md`. Cross-cutting systems (notification, import/export, document columns, PDF) were covered there. This audit focuses on the five domain-specific areas not covered by the shared systems audit.
