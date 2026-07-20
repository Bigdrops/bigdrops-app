# Document Transformation Audit Report

This report was written by OpenCode on 2026-07-07 via Local Runner.

**Scope:** Service Layer, UI Layer, and Audit Trail implementation across Invoice, Quotation, CSR, and Waybill documents — evaluated against `docs/standard/document-transformation-standard.md` (v1.1, "The 3 Laws System").

**Out of scope:** BOQ, RFQ, and any module not named above. No code was modified.

---

## 1. Standard Summary

The standard defines three laws that govern all financial documents:

| Law | Rule | Applies to |
|-----|------|-----------|
| **Law 1 — Edit Law** | Identity fields (`client_id`, `document_number`, `type`, lineage) are immutable once saved. Drafts are fully editable. User feedback required on attempt to modify locked fields. | All documents |
| **Law 2 — Duplicate Law** | Duplicated documents are clean drafts: new identity, no client, no lineage, no payments. Opens in unsaved state. | All documents |
| **Law 3 — Revert Law** | Forward-only correction: Invoice→Quotation (delete invoice + create quotation). **No rollback, no undo.** Revert blocked for Quotation, Waybill, CSR, BOQ, RFQ. | Invoice only |

---

## 2. Service Layer Audit

### 2.1 Invoice

| Function | Location | Status |
|----------|----------|--------|
| `createInvoice` | `src/domain/invoice/invoiceMutations.ts` | ✅ Present |
| `updateInvoice` | `src/domain/invoice/invoiceMutations.ts` | ✅ Present |
| `deleteInvoice` | `src/modules/invoices/services/invoiceLifecycleService.ts` | ✅ Present |
| `archiveInvoice` | `src/modules/invoices/services/invoiceLifecycleService.ts` | ✅ Present |
| `duplicateInvoice` | `src/modules/invoices/services/invoiceLifecycleService.ts` | ✅ Present |
| `revertInvoiceToQuotationService` | `src/modules/invoices/services/invoiceConversionService.ts` | ✅ Present |
| Workflow guards | `src/modules/invoices/domain/invoiceWorkflowGuards.ts` | ✅ Present — blocks delete/revert if payments exist |
| Status transitions | `src/modules/invoices/domain/invoiceStatusTransitions.ts` | ✅ Present |
| Lineage trail | `src/modules/invoices/domain/invoiceConversionTrail.ts` | ✅ Present |

**Verdict:** Full lifecycle coverage. Law 1 (edit lock), Law 2 (duplicate), Law 3 (revert) all implemented at the service level. Guard functions prevent invalid state transitions.

### 2.2 Quotation

| Function | Location | Status |
|----------|----------|--------|
| `createQuotation` | `src/pages/viewQuotationActions.ts` (inline in `duplicateQuotationRecord`) | ⚠️ Implicit via insert |
| `updateQuotationStatus` | `src/pages/viewQuotationActions.ts:277` | ✅ Present |
| `deleteQuotationRecord` | `src/pages/viewQuotationActions.ts:265` | ✅ Present |
| `archiveQuotationRecord` | `src/pages/viewQuotationActions.ts:272` | ✅ Present |
| `duplicateQuotationRecord` | `src/pages/viewQuotationActions.ts:79` | ✅ Present — generates new number, resets status to `open` |
| `convertQuotationToInvoice` | `src/pages/viewQuotationActions.ts:154` | ✅ Present — writes `conversionTrail` to `custom_fields` |
| Dedicated service module | — | ❌ **Missing** — all logic lives in a pages file, not `src/domain/quotation/` |

**Verdict:** Functional but architecturally inconsistent. Quotation lifecycle operations are scattered in `viewQuotationActions.ts` (a pages-level file) rather than a dedicated `src/domain/quotation/` service module. Other documents (Invoice, Waybill, CSR) have proper domain modules. Duplicate and convert functions exist; revert is correctly absent.

**Gap:** No dedicated `src/modules/quotation/` or `src/domain/quotation/service.ts`. The `conversionTrail` lineage write is the only Law 3 implementation for Quotation (as the "source" side of a convert).

### 2.3 CSR (Service Report)

| Function | Location | Status |
|----------|----------|--------|
| `createCsr` | `src/domain/csr/csrService.ts` | ✅ Present |
| `updateCsr` | `src/domain/csr/csrService.ts` | ✅ Present |
| `deleteCsr` | — | ❌ **Missing** |
| `archiveCsr` | — | ❌ **Missing** |
| `duplicateCsr` | — | ❌ **Missing** |
| `convertCsr` | — | ❌ **Missing** (standard does not require convert for CSR) |
| Workflow guards | — | ❌ **Missing** |

**Verdict:** Minimal CRUD only. CSR has no duplicate, delete, or archive operations at the service level. Law 2 (duplicate) is entirely unimplemented. Law 1 edit-lock enforcement relies solely on UI (which itself is absent — see §3.3). No workflow guards prevent invalid state transitions.

### 2.4 Waybill

| Function | Location | Status |
|----------|----------|--------|
| `saveWaybill` | `src/domain/waybill/waybillMutations.ts` | ✅ Present — handles both insert and update |
| `deleteWaybillRecord` | `src/pages/viewWaybillActions.ts:14` | ✅ Present — deletes items then waybill |
| `archiveWaybillRecord` | `src/pages/viewWaybillActions.ts:41` | ✅ Present |
| `duplicateWaybillRecord` | `src/pages/viewWaybillActions.ts:63` | ✅ Present — generates new number, resets status to `dispatched` |
| `updateWaybillStatus` | `src/pages/viewWaybillActions.ts:20` | ✅ Present |
| Dedicated service module | `src/domain/waybill/waybillMutations.ts` | ✅ Present (mutations) |
| Workflow guards | — | ❌ **Missing** |

**Verdict:** Good coverage for core lifecycle. Duplicate, archive, and delete are implemented. Status transitions exist but have no guard functions preventing illegal transitions (e.g., reversing from `delivered` to `dispatched` should arguably be blocked). Delete and archive live in `viewWaybillActions.ts` rather than the domain module — same architectural inconsistency as Quotation.

---

## 3. UI Layer Audit

### 3.1 Identity Lock Dialog (Law 1 — Visual Contract)

The standard requires: locked fields MUST show a visual indicator, and user attempts to modify identity fields on saved documents MUST be intercepted with a feedback message.

| Document | `IdentityLockDialog` used? | `onLockedFieldClick` wired? | Fields locked | Status |
|----------|---------------------------|----------------------------|---------------|--------|
| **Invoice** | ✅ `InvoiceFormPage.tsx:530` | ✅ `InvoiceFormPage.tsx:405-406` | `client`, `invoice_number` | ✅ Compliant |
| **Quotation** | ❌ Not imported | ❌ Not wired | — | ❌ **Non-compliant** |
| **CSR** | ❌ Not imported | ❌ Not wired | — | ❌ **Non-compliant** |
| **Waybill** | ❌ Not imported | ❌ Not wired | — | ❌ **Non-compliant** |

**Gap:** The `IdentityLockDialog` component exists (`src/components/document/IdentityLockDialog.tsx`) and is fully functional, but is only used in `InvoiceFormPage.tsx`. Quotation, CSR, and Waybill forms have zero identity lock UI — no lock icon, no interception, no feedback message. A user can freely change `client_id` or document number on saved Quotation/CSR/Waybill documents.

### 3.2 Document Action Menus (Duplicate, Convert, Revert)

| Document | Duplicate action? | Convert action? | Revert action? | Location |
|----------|-------------------|-----------------|----------------|----------|
| **Invoice** | ✅ | — | ✅ "Revert to Quotation" | `InvoiceMoreSheet.tsx` |
| **Quotation** | ✅ | ✅ "Convert to Invoice" | — (correct per standard) | `QuotationMoreSheet.tsx` |
| **CSR** | ❌ **Missing** | — (N/A) | — (N/A) | No sheet exists |
| **Waybill** | ✅ `ViewWaybill.tsx:248` | — (N/A) | — (N/A) | Inline in `ViewWaybill.tsx` |

**Gap:** CSR has no action menu at all — no duplicate, no archive, no delete actions exposed in the UI. Waybill has duplicate via `ViewWaybill.tsx` but no dedicated action sheet component like Invoice/Quotation have.

### 3.3 Revert Implementation (Law 3)

The revert function `revertInvoiceToQuotationService` (at `src/modules/invoices/services/invoiceConversionService.ts:14`) is present and functional. It:

- Calls `revert_invoice_to_quotation_transaction` (RPC) — atomic delete invoice + create quotation
- Writes lineage trail into the new quotation's `custom_fields` via `withInvoiceSourceTrail`
- Workflow guard (`guardCanRevertInvoice`) blocks revert if payments exist

**Observation:** The revert function does NOT record a `REVERT` audit event. It records `CREATE` for the new quotation and does not explicitly log the revert action on the deleted invoice side (the RPC handles deletion atomically, so post-deletion audit is structurally impossible). This is an audit trail gap — see §4.

### 3.4 Lineage Display

| Document | Lineage displayed? | Location |
|----------|-------------------|----------|
| **Invoice** | ✅ `sourceDocument` shown via `RelatedDocsCard.tsx` | `src/components/document-view/invoice/` |
| **Quotation** | ⚠️ `conversionTrail` stored in `custom_fields` but not displayed as lineage card | `viewQuotationActions.ts:224` |
| **CSR** | ❌ No lineage display | — |
| **Waybill** | ⚠️ `sourceDocumentNumber` tracked in `waybillUtils.ts` but not displayed as a dedicated lineage card | `src/lib/native/waybillUtils.ts:61,248,299,376,646` |

---

## 4. Audit Trail Audit

### 4.1 Audit Action Types

| Action | Defined in `AuditAction` union? | Formatter label exists? | Used in codebase? |
|--------|--------------------------------|------------------------|-------------------|
| `CREATE` | ✅ | ✅ All 5 entity types | ✅ |
| `UPDATE` | ✅ | ✅ All 5 entity types | ✅ |
| `DELETE` | ✅ | ✅ All 5 entity types | ✅ |
| `STATUS_CHANGE` | ✅ | ✅ All 5 entity types | ✅ |
| `LINK` | ✅ | ✅ All 5 entity types | ✅ |
| `UNLINK` | ✅ | ✅ All 5 entity types | ✅ |
| `PAYMENT_RECORDED` | ✅ | ✅ Invoice only | ✅ |
| `PAYMENT_VOIDED` | ✅ | ✅ Invoice only | ✅ |
| **`DUPLICATE`** | ❌ Not in union (allowed by `\| string`) | ❌ **Missing** | ❌ Not recorded |
| **`CONVERT`** | ❌ Not in union (allowed by `\| string`) | ❌ **Missing** | ❌ Not recorded (LINK used instead) |
| **`REVERT`** | ❌ Not in union (allowed by `\| string`) | ❌ **Missing** | ❌ Not recorded |
| **`ARCHIVE`** | ❌ Not in union (allowed by `\| string`) | ❌ **Missing** | ❌ Not recorded |

**Locations:**
- `AuditAction` union: `src/domain/audit/auditTypes.ts`
- Formatter labels: `src/domain/audit/auditFormatters.ts:30-73` (`ACTION_LABELS`)

**Gap:** The `AuditAction` type uses `| string` so `DUPLICATE`, `CONVERT`, `REVERT`, `ARCHIVE` are technically allowed at the type level, but they have no dedicated union members and no formatter labels. When these actions occur, `getAuditActionLabel` falls through to the default: `'updated this record'` — which is misleading. For example, a duplicated quotation would display as "updated this quotation" in the audit trail.

### 4.2 Per-Document Audit Coverage

| Document | CREATE | UPDATE | DELETE | DUPLICATE | CONVERT | REVERT | ARCHIVE | STATUS_CHANGE |
|----------|--------|--------|--------|-----------|---------|--------|---------|---------------|
| Invoice | ✅ | ✅ | ✅ | ✅ logged | — | ⚠️ not logged | ✅ logged | ✅ |
| Quotation | ✅ | ✅ | ✅ | ✅ logged | ⚠️ logged as `LINK` | — | ✅ logged | ✅ |
| CSR | ✅ | ✅ | ❌ not logged | — | — | — | — | ✅ |
| Waybill | ✅ | ✅ | ✅ | ✅ logged | — | — | ⚠️ not logged | ✅ |

**Detail on gaps:**
- `duplicateQuotationRecord` (`viewQuotationActions.ts:130-141`) logs `CREATE` for the new copy but does not log `DUPLICATE` on the source
- `duplicateWaybillRecord` (`viewWaybillActions.ts:88-101`) logs `CREATE` for the new copy but does not log `DUPLICATE` on the source
- `convertQuotationToInvoice` (`viewQuotationActions.ts:236-258`) logs `LINK` on both sides — no `CONVERT` event
- `revertInvoiceToQuotationService` (`invoiceConversionService.ts`) logs nothing — the RPC handles it atomically
- `archiveWaybillRecord` (`viewWaybillActions.ts:41-59`) logs `STATUS_CHANGE` but not `ARCHIVE`

---

## 5. Summary of Gaps

### Critical (violates standard)

1. **Quotation, CSR, Waybill have no identity lock UI** — Law 1 §2.4 requires visual indicators and interception for all document types. Only Invoice implements `IdentityLockDialog`. Users can silently change `client_id` and document numbers on saved Quotation/CSR/Waybill documents.

2. **CSR has no duplicate function** — Law 2 §3 requires duplication capability for all documents. CSR has no duplicate at the service or UI level.

### Significant (audit trail completeness)

3. **`DUPLICATE`, `CONVERT`, `REVERT`, `ARCHIVE` missing from `AuditAction` union and `ACTION_LABELS`** — these actions either fall through to `'updated this record'` (misleading) or are not logged at all.

4. **Revert does not record an audit event** — the RPC `revert_invoice_to_quotation_transaction` handles deletion atomically, so post-deletion audit is structurally impossible. A pre-deletion audit snapshot or metadata event should be recorded before the RPC call.

5. **Archive not consistently logged as `ARCHIVE`** — `archiveWaybillRecord` logs `STATUS_CHANGE`; `archiveQuotationRecord` logs nothing; `archiveInvoice` logs `ARCHIVE` via `recordInvoiceArchived`.

### Minor (architectural inconsistency)

6. **Quotation lifecycle logic lives in `viewQuotationActions.ts`** (pages layer) rather than a dedicated `src/modules/quotation/` or `src/domain/quotation/` service module. This is inconsistent with Invoice (`src/modules/invoices/`) and Waybill (`src/domain/waybill/`).

7. **Waybill delete/archive/status-update live in `viewWaybillActions.ts`** rather than the domain module — same pattern as Quotation.

8. **CSR has no workflow guards** — no validation prevents illegal state transitions or operations on CSR documents in inappropriate states.

9. **Quotation lineage (`conversionTrail`) is stored but not displayed** as a dedicated lineage card the way Invoice's `sourceDocument` is rendered via `RelatedDocsCard.tsx`.

---

## 6. Verification Gate

- `bun run typecheck`: Not run (read-only audit, no changes made)
- `bun run build`: Not run (hardware policy — see AGENTS.md §3)
- `git status`: No files modified — read-only audit confirmed
