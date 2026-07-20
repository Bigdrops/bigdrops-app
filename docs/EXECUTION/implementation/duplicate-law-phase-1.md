# Duplicate Law (Law 2) — Phase 1 Enforcement

**Date:** 2026-07-02
**Author:** OpenCode via Local Runner
**Scope:** Law 2 enforcement across Invoice, Quotation, CSR, Waybill duplicate functions
**Standard:** `docs/standard/document-transformation-standard.md` v1.1

---

## Executive Summary

Four duplicate violations (DUP-INV-001, DUP-QTN-001, DUP-CSR-001, DUP-WAY-001) were identified in the baseline audit and fixed in this phase. All fixes are minimal surgical changes — no refactors, no new abstractions, no schema changes.

**Verification:** `bun run typecheck` passed (pre-existing errors in `native-feedback-renderer.tsx` only). `bun run audit:load` passed (all warnings pre-existing). `bun run build` skipped per hardware policy.

---

## Findings Fixed

### DUP-INV-001 — Invoice Duplicate Carries Lineage

**File:** `src/modules/invoices/services/invoiceLifecycleService.ts`
**Function:** `duplicateInvoice` (line 183)
**Violation:** `conversionTrail` from `custom_fields` was carried into the duplicated invoice via deep clone spread, leaving a trace of the source document.

**Fix:**
- Added `delete parsedCustomFields.conversionTrail` after parsing custom_fields (line 214)
- Added `custom_fields: JSON.stringify(parsedCustomFields)` to the returned prefill object (line 248)
- Ensures the duplicated invoice has no lineage pointer to the source document

**Impact:** 2 lines added. No downstream callers affected.

---

### DUP-QTN-001 — Quotation Duplicate Preserves Client

**File:** `src/pages/viewQuotationActions.ts`
**Function:** `duplicateQuotationRecord` (line 79)
**Violation:** `client_id: quotation.client_id || null` preserved the original client. `client_name` and `project_id` also carried over. `clientName` in `custom_fields` also preserved.

**Fix:**
- Changed `client_id: quotation.client_id || null` → `client_id: null` (line 99)
- Changed `client_name: quotation.client_name || ''` → `client_name: ''` (line 100)
- Changed `project_id: quotation.project_id || null` → `project_id: null` (line 101)
- Changed `clientName: quotation.client_name || ''` → `clientName: ''` in custom_fields (line 120)

**Impact:** 4 lines changed. Quotation items, pricing, notes, terms, and layout preserved.

---

### DUP-CSR-001 — CSR Duplicate Preserves Client and Uses Manual Numbering

**File:** `src/pages/viewCSRActions.ts`
**Function:** `duplicateCSRRecord` (line 18)
**Violation:** `...rest` spread included `client_id`, `client_name`, `project_id`, `linked_invoice_id`, `acknowledgement_name`. Manual prefix logic (`CSR-` hardcoded) instead of using the existing `getNextCsrNumber` utility.

**Fix:**
- Replaced manual prefix logic with dynamic import of `getNextCsrNumber` from `@/components/csr/csrUtils`
- Used proper lexicographic comparison to find latest CSR number (handles both numeric and letter suffixes)
- Destructured and discarded identity fields: `client_id`, `client_name`, `project_id`, `linked_invoice_id`, `acknowledgement_name`
- Explicitly set all identity fields to `null`/`''` in the insert payload
- Preserved all equipment details (make, model, serial_no, equipment_type, etc.)

**Impact:** 35 lines changed (net +17). All equipment/service fields preserved. No callers affected — function signature unchanged.

---

### DUP-WAY-001 — Waybill Duplicate Preserves Client

**File:** `src/pages/viewWaybillActions.ts`
**Function:** `duplicateWaybillRecord` (line 63)
**Violation:** `...rest` spread included `client_id`, `client_name`, `project_id`, `invoice_id` from the original waybill.

**Fix:**
- Added `client_id`, `client_name`, `project_id`, `invoice_id` to the destructure exclusion list (line 67-68)
- These fields are now omitted from the spread and not set in the insert, so they default to `null`
- Preserved items, routes, vehicle_plate, sender_name, notes, and all other equipment fields

**Impact:** 3 lines changed. No callers affected.

---

## What Was NOT Changed

- Law 1 (Edit) behavior — untouched
- Law 3 (Revert) behavior — untouched
- Audit system — untouched
- PDF generation — untouched
- Calculations — untouched
- Document numbering engine (`prefixConstants.ts`) — untouched
- Schema/types — untouched
- Routing — untouched
- Any duplicate entry points or UI components — untouched

---

## Verification Gate

| Check | Status | Notes |
|-------|--------|-------|
| `bun run typecheck` | ✅ PASS | Pre-existing errors in `native-feedback-renderer.tsx` only |
| `bun run audit:load` | ✅ PASS | All warnings pre-existing, none from our changes |
| `bun run build` | ⏭️ SKIPPED | Per hardware policy — reserved for project lead |
| `git status` | ✅ CLEAN | 4 files modified, no unintended changes |

---

## Deferred Work

1. **Quotation custom_fields lineage clearing** — `conversionTrail` is already cleared via destructuring (`const { conversionTrail: _ignoredTrail, ...restCustomFields } = cleanCustomFields`). No additional work needed.
2. **CSR audit trail** — `duplicateCSRRecord` does not currently emit audit logs. This is a pre-existing gap, not introduced by this fix. Should be addressed in a future phase.
3. **Waybill audit trail** — Already present (lines 88-101). No change needed.
