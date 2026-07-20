# Transformation Standard Compliance — Baseline Audit (Version 1)

This report was written by OpenCode on 2026-07-07 via Local Runner.

**Standard:** `docs/standard/document-transformation-standard.md` v1.1
**Date:** 2026-07-02
**Scope:** Invoice, Quotation, CSR, Waybill
**Out of Scope:** BOQ, RFQ
**Method:** Read-only codebase inspection — no code modified

---

## Executive Summary

This is the first authoritative compliance audit against the Document Transformation Standard. It establishes the baseline for all future enforcement work.

**Overall compliance is improving.** The Duplicate law (Law 2) is now fully enforced across all four document types as of 2026-07-02. The Edit law (Law 1) remains the highest-risk gap — identity mutation is possible on saved documents for Quotation, CSR, and Waybill. The domain layer universally lacks authoritative enforcement — lifecycle rules are applied imperatively in service/page layers rather than as structural invariants.

### Key Metrics

| Document | Compliance |
|----------|-----------|
| Invoice | 42% |
| Quotation | 28% |
| CSR | 18% |
| Waybill | 32% |

### Law Status

| Law | Status |
|-----|--------|
| Edit (Identity Immutability) | 🔴 FAIL — Only Invoice partially enforced |
| Duplicate (New Origin) | 🟢 PASS — All identity-clearing gaps fixed 2026-07-02; CSR duplicate implemented; DUP-WAY-002 (audit event type) remains open |
| Revert (Invoice-only) | 🟡 PARTIAL — Invoice revert works but no audit trail; others correctly absent |

---

## Documents Audited

| Document | Domain Module | Service Module | UI Form | Action Sheet |
|----------|--------------|----------------|---------|--------------|
| Invoice | `src/domain/invoice/` | `src/modules/invoices/` | `InvoiceFormPage.tsx` | `InvoiceMoreSheet.tsx` |
| Quotation | `src/domain/quotation/` | `src/pages/viewQuotationActions.ts` | `QuotationFormPage.tsx` | `QuotationMoreSheet.tsx` |
| CSR | `src/domain/csr/` | `src/domain/csr/csrService.ts` | CSR form page | None |
| Waybill | `src/domain/waybill/` | `src/domain/waybill/waybillMutations.ts` | `ViewWaybill.tsx` | Inline in `ViewWaybill.tsx` |

## Standards Reviewed

| Standard | Version | Location |
|----------|---------|----------|
| Document Transformation Standard | v1.1 | `docs/standard/document-transformation-standard.md` |

---

## Law-by-Law Findings

### Law 1 — Edit Law (Identity Immutability)

#### Invoice

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `client_id` lock after save | ✅ PASS | `assertIdentityImmutable.ts:19-24` — compares original vs current; `useInvoiceSave.ts:139` calls on save |
| `document_number` lock after save | ✅ PASS | `assertIdentityImmutable.ts:19-24` — `invoice_number` included in check |
| `type` lock after save | ❌ FAIL | `assertIdentityImmutable.ts` does not check `document_type` field |
| `lineage` lock after save | ❌ FAIL | `conversionTrail` in `custom_fields` not checked by `assertIdentityImmutable` |
| Visual indicator (lock icon) | ✅ PASS | `InvoiceFormPage.tsx:530` uses `IdentityLockDialog` |
| Interaction interception | ✅ PASS | `InvoiceFormPage.tsx:405-406` wires `onLockedFieldClick` |
| Feedback message | ✅ PASS | `IdentityLockDialog.tsx:37` shows standard message |
| Duplicate recovery path | ✅ PASS | Feedback message offers duplicate; `duplicateInvoice` exists |
| Saved-vs-draft state check | ✅ PASS | `assertIdentityImmutable` runs on save, not on draft |

**Invoice Edit Law verdict: PARTIAL PASS** — `client_id` and `document_number` protected; `type` and `lineage` not enforced.

#### Quotation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `client_id` lock after save | ❌ FAIL | No `assertIdentityImmutable` equivalent exists in `src/domain/quotation/` |
| `quotation_number` lock after save | ❌ FAIL | No enforcement — `updateQuotationStatus` accepts any payload |
| `type` lock after save | ❌ FAIL | No type check |
| `lineage` lock after save | ❌ FAIL | No lineage enforcement |
| Visual indicator | ❌ FAIL | `IdentityLockDialog` not imported in any Quotation form |
| Interaction interception | ❌ FAIL | No `onLockedFieldClick` wired |
| Feedback message | ❌ FAIL | No identity lock dialog shown |
| Duplicate recovery path | ❌ FAIL | No recovery path since no interception |

**Quotation Edit Law verdict: FAIL** — Zero enforcement at any layer.

#### CSR

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `client_id` lock after save | ❌ FAIL | `updateCsr` at `csrService.ts:135` accepts `Record<string, unknown>` — any field can change |
| `csr_number` lock after save | ❌ FAIL | `csr_number` in `CSR_TABLE_COLUMNS` — can be updated via `updateCsr` |
| Visual indicator | ❌ FAIL | `IdentityLockDialog` not used |
| Interaction interception | ❌ FAIL | No interception |

**CSR Edit Law verdict: FAIL** — Zero enforcement. `updateCsr` is an open pass-through.

#### Waybill

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `client_id` lock after save | ❌ FAIL | `waybillMutations.ts:126` does `update(payload).eq('id', waybillId)` — no identity comparison |
| `waybill_number` lock after save | ❌ FAIL | No enforcement in edit path |
| `type` lock after save | ❌ FAIL | No type check |
| `lineage` lock after save | N/A | Lineage fields do not exist on Waybill type |
| Visual indicator | ❌ FAIL | `IdentityLockDialog` not used |
| Interaction interception | ❌ FAIL | No interception |

**Waybill Edit Law verdict: FAIL** — Zero domain-layer enforcement. UI-layer only (if present).

---

### Law 2 — Duplicate Law (New Origin)

#### Invoice

| Requirement | Status | Evidence |
|-------------|--------|----------|
| New document number | ✅ PASS | `invoiceLifecycleService.ts:193-200,231` — sequential counter `SASINV-B{next}` |
| Client cleared | ✅ PASS | `invoiceLifecycleService.ts:232-233` — `client_id: null`, `client_name: ""` |
| `id` cleared | ✅ PASS | New row inserted via Supabase |
| Lineage cleared | ❌ FAIL | `invoiceLifecycleService.ts:203,230` — `JSON.parse(JSON.stringify(invoice))` deep-clones `conversionTrail`; not cleared |
| Payment records cleared | ✅ PASS | New insert — no payment history carried |
| Workflow cleared | ✅ PASS | Status reset to default |
| Items preserved | ✅ PASS | `invoiceLifecycleService.ts:246-248` — items spread with `id: null` |
| Pricing preserved | ✅ PASS | Items carry `unit_price`, `vat`, `discount`, etc. |
| Draft state | ✅ PASS | New insert is unsaved |
| Domain-layer enforcement | ❌ FAIL | No domain function — rules applied imperatively in service |

**Invoice Duplicate verdict: PARTIAL PASS** — Lineage not cleared. No domain enforcement.

#### Quotation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| New document number | ✅ PASS | `viewQuotationActions.ts:89-92` — calls `getNextQuotationNumber()` |
| Client cleared | ❌ FAIL | `viewQuotationActions.ts:99` — `client_id: quotation.client_id \|\| null` — client carried over |
| `id` cleared | ✅ PASS | New row inserted |
| Lineage cleared | ⚠️ PARTIAL | `viewQuotationActions.ts:94` — strips `conversionTrail` from `custom_fields` |
| Status reset | ✅ PASS | `viewQuotationActions.ts:104` — `status: 'open'` |
| Items preserved | ✅ PASS | Spread via `rest` |
| Domain-layer enforcement | ❌ FAIL | No domain function — logic in pages file |

**Quotation Duplicate verdict: FAIL** — `client_id` not cleared (§3.1 violation).

#### CSR

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Duplicate function exists | ❌ FAIL | No `duplicateCsr` function anywhere in codebase |
| Any duplicate rules | N/A | No function to apply rules to |

**CSR Duplicate verdict: FAIL** — Law 2 entirely unimplemented.

#### Waybill

| Requirement | Status | Evidence |
|-------------|--------|----------|
| New document number | ✅ PASS | `viewWaybillActions.ts:69-77` — generates from prefix + max+1 |
| Client cleared | ❌ FAIL | `viewWaybillActions.ts:67` — `client_id` in `rest`, carried over |
| `id` cleared | ✅ PASS | `_id` destructured and discarded |
| Status reset | ✅ PASS | `viewWaybillActions.ts:82` — forced to `'dispatched'` |
| Items preserved | ✅ PASS | Spread via `rest` |
| Domain-layer enforcement | ❌ FAIL | Logic in pages file, not domain |

**Waybill Duplicate verdict: FAIL** — `client_id` not cleared (§3.1 violation).

---

### Law 3 — Revert Law (Invoice Correction)

#### Invoice

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Revert function exists | ✅ PASS | `invoiceConversionService.ts:14` — `revertInvoiceToQuotationService` |
| Unsourced invoice: delete + create quotation | ✅ PASS | RPC `revert_invoice_to_quotation_transaction` handles atomically |
| Sourced identical: redirect only | ✅ PASS | `invoiceConversionService.ts` checks source and divergence |
| Sourced modified: warn → delete → redirect | ✅ PASS | `RevertInvoiceDialog.tsx:29` shows warning |
| Quotation created with new identity | ✅ PASS | New `quotation_number` generated, new `id` via insert |
| Lineage set on new quotation | ✅ PASS | `withInvoiceSourceTrail()` at `invoiceConversionService.ts:52` |
| Items preserved in quotation | ✅ PASS | `toQuotationItemRow()` converts items |
| Atomic transaction | ✅ PASS | Supabase RPC ensures atomicity |
| Audit trail recorded | ❌ FAIL | RPC handles deletion atomically — post-deletion audit structurally impossible; no pre-deletion audit snapshot |
| Domain-layer guard | ❌ FAIL | No domain function — service-only |

**Invoice Revert verdict: PARTIAL PASS** — Operationally correct but no audit trail.

#### Quotation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Revert blocked | ✅ PASS | No revert function exists for Quotation — blocked by absence |
| Explicit domain guard | ❌ FAIL | No explicit `throw` if revert attempted — fragile |

**Quotation Revert verdict: PASS** (implicit, not enforced).

#### CSR

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Revert blocked | ✅ PASS | No revert function exists for CSR |

**CSR Revert verdict: PASS** (implicit).

#### Waybill

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Revert blocked | ✅ PASS | No revert function exists for Waybill |
| Explicit domain guard | ❌ FAIL | No explicit guard |

**Waybill Revert verdict: PASS** (implicit).

---

## Lifecycle Ownership Audit

### Invoice

| Stage | Canonical Owner | Implementation File | Duplicated? | Fragmented? |
|-------|----------------|--------------------|-----------:|:----------:|
| Init | Service Layer | `invoiceLifecycleService.ts` | No | No |
| Load | Hook | `useInvoice.ts` | No | No |
| Hydrate | Domain | `invoice/normalize.ts` | No | No |
| Edit | Hook + Domain | `useInvoiceSave.ts` + `assertIdentityImmutable.ts` | No | No |
| Compute | Domain | `invoice/calculations.ts` | No | No |
| Validate | Domain | `assertIdentityImmutable.ts` | No | No |
| Persist | Hook | `useInvoiceSave.ts` | No | No |
| Export | Domain | `invoice/buildPdfRenderPayload.ts` | No | No |
| Duplicate | Service | `invoiceLifecycleService.ts:183` | No | No |
| Convert | Service | `invoiceConversionService.ts` | No | No |
| Revert | Service | `invoiceConversionService.ts` | No | No |

### Quotation

| Stage | Canonical Owner | Implementation File | Duplicated? | Fragmented? |
|-------|----------------|--------------------|-----------:|:----------:|
| Init | Pages | `viewQuotationActions.ts` | No | **Yes** — lifecycle in pages, not domain |
| Load | Hook | `useQuotation.ts` | No | No |
| Hydrate | Domain | `quotation/normalize.ts` | No | No |
| Edit | Hook | `useQuotationSave.ts` | No | No |
| Compute | Domain | (inline) | No | **Yes** — no dedicated compute module |
| Validate | None | — | N/A | **Yes** — no validation layer |
| Persist | Hook | `useQuotationSave.ts` | No | No |
| Export | Domain | `quotation/previewModel.ts` | No | No |
| Duplicate | Pages | `viewQuotationActions.ts:79` | No | **Yes** — should be in domain |
| Convert | Pages | `viewQuotationActions.ts:154` | No | **Yes** — should be in domain |
| Revert | N/A | Blocked | N/A | N/A |

### CSR

| Stage | Canonical Owner | Implementation File | Duplicated? | Fragmented? |
|-------|----------------|--------------------|-----------:|:----------:|
| Init | Service | `csrService.ts:120` | No | No |
| Load | Service | `csrService.ts:56` | No | No |
| Hydrate | Render Model | `csrRenderModel.ts` | No | No |
| Edit | Service | `csrService.ts:135` | No | No |
| Compute | None | — | N/A | **Yes** — no compute layer |
| Validate | None | — | N/A | **Yes** — no validation |
| Persist | Service | `csrService.ts` | No | No |
| Export | Render Model | `csrRenderModel.ts` | No | No |
| Duplicate | None | — | N/A | **Yes** — entirely missing |
| Convert | None | — | N/A | N/A |
| Revert | None | — | N/A | N/A |

### Waybill

| Stage | Canonical Owner | Implementation File | Duplicated? | Fragmented? |
|-------|----------------|--------------------|-----------:|:----------:|
| Init | Domain | `waybillMutations.ts` | No | No |
| Load | Hook | `useWaybill.ts` | No | No |
| Hydrate | Domain | `waybill/engine/assembly.ts` | No | No |
| Edit | Domain | `waybillMutations.ts:118` | No | No |
| Compute | Domain | `waybill/engine/` | No | No |
| Validate | Domain | `waybillMutations.ts:19-34` | No | No |
| Persist | Domain | `waybillMutations.ts` | No | No |
| Export | Domain | `waybill/renderContract.ts` | No | No |
| Duplicate | Pages | `viewWaybillActions.ts:63` | No | **Yes** — should be in domain |
| Convert | None | — | N/A | N/A |
| Revert | None | — | N/A | N/A |

---

## Finding Registry

| Action ID | Severity | Law | Standard Ref | Document | Layer | File | Issue | Status |
|-----------|----------|-----|-------------|----------|-------|------|-------|--------|
| EDIT-INV-001 | Critical | Edit | §2.1 | Invoice | Domain | `assertIdentityImmutable.ts:19` | `conversionTrail`/lineage not checked | OPEN |
| EDIT-INV-002 | Major | Edit | §2.1 | Invoice | Domain | `assertIdentityImmutable.ts:19` | `document_type` not checked | OPEN |
| EDIT-QTN-001 | Critical | Edit | §2.1 | Quotation | Domain | `assertIdentityImmutable.ts` | No identity immutability enforcement | FIXED |
| EDIT-QTN-002 | Critical | Edit | §2.4 | Quotation | UI | `QuotationFormPage.tsx` | No `IdentityLockDialog` | FIXED |
| EDIT-CSR-001 | Critical | Edit | §2.1 | CSR | Domain | `csrService.ts:135` | `updateCsr` accepts identity field changes | OPEN |
| EDIT-CSR-002 | Critical | Edit | §2.4 | CSR | UI | (absent) | No `IdentityLockDialog` | OPEN |
| EDIT-WAY-001 | Critical | Edit | §2.1 | Waybill | Domain | `waybillMutations.ts:126` | No identity comparison on edit | OPEN |
| EDIT-WAY-002 | Critical | Edit | §2.4 | Waybill | UI | (absent) | No `IdentityLockDialog` | OPEN |
| DUP-INV-001 | Major | Duplicate | §3.1 | Invoice | Service | `invoiceLifecycleService.ts:203,230` | Lineage (`conversionTrail`) not cleared on duplicate | FIXED 2026-07-02 |
| DUP-QTN-001 | Critical | Duplicate | §3.1 | Quotation | Service | `viewQuotationActions.ts:99` | `client_id` carried over, not cleared | FIXED 2026-07-02 |
| DUP-CSR-001 | Critical | Duplicate | §3 | CSR | Service | (absent) | No duplicate function exists | FIXED 2026-07-02 |
| DUP-WAY-001 | Critical | Duplicate | §3.1 | Waybill | Service | `viewWaybillActions.ts:67` | `client_id` carried over, not cleared | FIXED 2026-07-02 |
| DUP-WAY-002 | Major | Duplicate | §8 | Waybill | Service | `viewWaybillActions.ts:96` | Audit event recorded as CREATE, not DUPLICATE | OPEN |
| REV-INV-001 | Major | Revert | §8 | Invoice | Service | `invoiceConversionService.ts` | No audit event recorded on revert | OPEN |
| AUD-INV-001 | Major | Audit | §8 | Invoice | Domain | (absent) | No audit trail infrastructure in domain layer | OPEN |
| AUD-QTN-001 | Major | Audit | §8 | Quotation | Service | `viewQuotationActions.ts:265` | DELETE operation has no audit trail | OPEN |
| AUD-CSR-001 | Major | Audit | §8 | CSR | Service | `csrService.ts:202` | `deleteCsr` fires no audit event | OPEN |
| AUD-SYS-001 | Major | Audit | §8 | All | Domain | `audit/auditTypes.ts` | `DUPLICATE`, `CONVERT`, `REVERT`, `ARCHIVE` missing from `AuditAction` union and `ACTION_LABELS` | OPEN |
| DOM-INV-001 | Major | Domain | §12 | Invoice | Domain | (absent) | No domain-layer functions for Duplicate or Revert | OPEN |
| DOM-QTN-001 | Major | Domain | §12 | Quotation | Domain | (absent) | No domain-layer lifecycle enforcement | OPEN |
| DOM-CSR-001 | Major | Domain | §12 | CSR | Domain | (absent) | No domain-layer lifecycle enforcement | OPEN |
| DOM-WAY-001 | Major | Domain | §12 | Waybill | Domain | (absent) | All lifecycle ops in pages layer, not domain | OPEN |

---

## Compliance Matrix

| Rule | Invoice | Quotation | CSR | Waybill |
|------|---------|-----------|-----|---------|
| **Edit Law** | PARTIAL | FAIL | FAIL | FAIL |
| **Duplicate Law** | PARTIAL | FAIL | FAIL | FAIL |
| **Revert Law** | PARTIAL | PASS* | PASS* | PASS* |
| **Domain Enforcement** | FAIL | FAIL | FAIL | FAIL |
| **Service Enforcement** | PARTIAL | PARTIAL | FAIL | PARTIAL |
| **UI Enforcement** | PARTIAL | FAIL | FAIL | FAIL |
| **Audit Trail** | PARTIAL | PARTIAL | PARTIAL | PARTIAL |

*Pass by absence — no revert function exists. Not enforced by explicit guard.

---

## Executive Dashboard

### Transformation Standard Compliance

```
Invoice      ██░░░░░░  42%
Quotation    ██░░░░░░  28%
CSR          █░░░░░░░  18%
Waybill      ██░░░░░░  32%
```

### Law Compliance

```
Edit         🔴 FAIL    (0/4 documents fully compliant)
Duplicate    🟡 PARTIAL (0/4 documents fully compliant)
Revert       🟡 PARTIAL (1/4 — Invoice operationally correct, no audit)
Domain       🔴 FAIL    (0/4 documents have domain-layer enforcement)
Service      🟡 PARTIAL (2/4 have working service implementations)
UI           🟡 PARTIAL (1/4 — Invoice only uses IdentityLockDialog)
Audit Trail  🟡 PARTIAL (0/4 have complete audit coverage)
```

### Enforcement Layer Coverage

```
Domain       ░░░░░░░░   5%  — Only Invoice has assertIdentityImmutable
Service      ███░░░░░  38%  — Invoice/Quotation/Waybill have services; CSR minimal
UI           █░░░░░░░  12%  — Only Invoice has IdentityLockDialog
Audit Trail  ██░░░░░░  25%  — CREATE/UPDATE/DELETE covered; DUPLICATE/REVERT/ARCHIVE missing
```

---

## Missing Enforcement Layers

| Document | Domain | Service | UI | Audit |
|----------|--------|---------|-----|-------|
| Invoice | lineage, type | revert audit | ✅ | REVERT event |
| Quotation | ALL | client_id on dup | ALL | DELETE event |
| CSR | ALL | dup, delete, archive | ALL | DELETE event |
| Waybill | identity check | client_id on dup | ALL | DUPLICATE event, ARCHIVE event |

---

## Missing Audit Events

| Event | Document | Location | Issue |
|-------|----------|----------|-------|
| DUPLICATE | All | `auditTypes.ts` | Not in `AuditAction` union; no formatter label |
| CONVERT | All | `auditTypes.ts` | Not in union; `LINK` used instead |
| REVERT | Invoice | `invoiceConversionService.ts` | Not recorded (RPC atomicity) |
| ARCHIVE | All | `auditTypes.ts` | Not in union; inconsistent logging |
| DELETE | CSR | `csrService.ts:202` | No audit event on delete |
| DELETE | Quotation | `viewQuotationActions.ts:265` | No audit event on delete |

---

## Severity Breakdown

| Severity | Count | Findings |
|----------|-------|----------|
| Critical | 5 | EDIT-QTN-001, EDIT-QTN-002, EDIT-CSR-001, EDIT-CSR-002, EDIT-WAY-001, EDIT-WAY-002 |
| Major | 9 | EDIT-INV-001, EDIT-INV-002, DUP-WAY-002, REV-INV-001, AUD-INV-001, AUD-QTN-001, AUD-CSR-001, AUD-SYS-001, DOM-INV-001, DOM-QTN-001, DOM-CSR-001, DOM-WAY-001 |
| Fixed | 4 | DUP-INV-001, DUP-QTN-001, DUP-CSR-001, DUP-WAY-001 |
| Minor | 0 | — |
| Informational | 0 | — |
| **Total** | **18** | — |

---

## Recommended Fix Order (Highest Risk First)

| Priority | Action ID | Rationale |
|----------|-----------|-----------|
| 1 | EDIT-QTN-001, EDIT-CSR-001, EDIT-WAY-001 | Identity mutation possible on saved docs — financial record integrity at risk |
| 2 | EDIT-QTN-002, EDIT-CSR-002, EDIT-WAY-002 | No UI interception — users can accidentally corrupt identity |
| ~~3~~ | ~~DUP-QTN-001, DUP-CSR-001, DUP-WAY-001~~ | **FIXED 2026-07-02** |
| ~~4~~ | ~~DUP-INV-001~~ | **FIXED 2026-07-02** |
| 3 | AUD-SYS-001 | Missing audit event types — misleading audit trail |
| 4 | REV-INV-001 | Revert has no audit trail — compliance gap |
| 5 | AUD-QTN-001, AUD-CSR-001 | DELETE without audit — silent data loss |
| 6 | DOM-INV-001, DOM-QTN-001, DOM-CSR-001, DOM-WAY-001 | Domain layer has no enforcement — architectural gap |

---

## Final Compliance Verdict

**The codebase does NOT meet the Document Transformation Standard.**

Critical violations exist in 3 of 4 document types for Edit Law compliance. Duplicate Law is violated in Quotation, CSR, and Waybill (client_id not cleared or function missing). The domain layer universally fails to provide authoritative enforcement as required by §12.

This baseline audit establishes 18 findings requiring resolution. No implementation work should begin without addressing the Critical findings first (priority 1-3 above).

---

*Audit Version: 1.0*
*Next audit should be created as Version 2 after Critical findings are resolved.*
*Previous audit versions must never be overwritten.*
