# Document Transformation Standard — Edit Law UX Update Report

**Date:** 2026-07-03  
**Scope:** Update `docs/standard/document-transformation-standard.md` to strengthen Edit Law with required UX behaviour for immutable identity fields  
**Status:** ✅ Complete

---

## Executive Summary

Updated the Document Transformation Standard to strengthen the Edit Law with normative UX requirements for immutable identity fields, guided recovery workflows, and approved duplicate-from-editable-state patterns. All changes are documentation-only; no application code was modified.

---

## Changes Made

### 1. §2.4 — User Experience for Immutable Identity Fields (NEW)

Added normative UX requirements under the Edit Law section:

- **§2.4.1 Visual Indicators:** Identity fields on saved documents must present visible lock indication before any user interaction
- **§2.4.2 Interaction Behaviour:** Two approved options: non-interactive display or interception with guidance
- **§2.4.3 Duplicate-from-Editable-State:** When user selects duplicate path, system must use current in-memory state and open new draft

### 2. §3.3 — Editable State as Source (NEW)

Added requirement that duplication may originate from current in-memory editable state:

- System must use current form state as source for items, pricing, structure, metadata
- System must not re-fetch persisted version from database
- Identity clearing rules still apply
- Ensures user captures their intended state, not stale persisted version

### 3. §5 — Guided Recovery Workflow (NEW)

Added normative recovery workflow section with 5 subsections:

- **§5.1 Interception:** System must intercept before any document state mutation
- **§5.2 Identity Preservation:** Original document must remain unchanged
- **§5.3 Editable State:** Workflow must operate on current in-memory state
- **§5.4 New Identity:** Duplicated document must receive new id, document_number, cleared client/lineage/payments
- **§5.5 Runtime Cleanup:** System must clear transient UI state after recovery

### 4. §8 — Audit Trail Event Types (NEW)

Added audit trail event type table with:

- Standard lifecycle events: CREATE, UPDATE, DUPLICATE, CONVERT, REVERT, DELETE
- Payment-specific events: PAYMENT_RECORDED, PAYMENT_VOIDED
- §8.1 Payment-Specific Events subsection with descriptions

### 5. §14 — Rationale (NEW)

Added non-normative rationale section explaining:

- Why identity fields are immutable (business invariant, financial record integrity)
- Why duplication is the recovery path (clean copy with fresh identity)
- Why recovery uses editable state (respects user intent, preserves in-progress work)

---

## Section Numbering (Final)

The document now has 14 sections with consistent numbering:

1. Core Principle
2. Law 1 — Edit Law (State-Aware Edit Rule)
   - 2.1 Domain Rule
   - 2.2 Unsaved Documents
   - 2.3 Required User Feedback
   - 2.4 User Experience for Immutable Identity Fields
3. Law 2 — Duplicate Law (New Entry State Rule)
   - 3.3 Editable State as Source
4. Law 3 — Revert Law (Invoice Correction & Navigation Rule)
5. Guided Recovery Workflow
6. Required Identity Contract
7. Transformation Matrix
8. Audit Trail Event Types
9. Distinction Between Convert, Duplicate, and Revert
10. System Behavior Rules
11. Cross-Document Scope
12. Enforcement Layer
13. Final Principle
14. Rationale

---

## Verification

- ✅ Typecheck passed (`bun run typecheck`)
- ✅ Section numbering verified consistent (§1–§14)
- ✅ Subsection numbering verified (§2.4, §3.3, §5.x, §8.1, §14.x)
- ✅ No application code modified
- ✅ Documentation-only changes

---

## Codebase Analysis

### Current Implementation Status

- **ClientSelector:** Already forces `open={false}` and `onOpenChange={() => {}}` in edit mode
- **SharedDocumentForm:** Already blocks client change in edit mode via early return
- **assertIdentityImmutable:** Already checks `client_id` and `invoice_number` at save time
- **Missing:** Visual lock indicators and formal "Duplicate from editable state" path in UI

### Files Analyzed

- `src/hooks/useInvoiceEditableState.ts` — Form state management
- `src/domain/invoice/assertIdentityImmutable.ts` — Domain invariant validation
- `src/pages/InvoiceFormPage.tsx` — Edit-mode flow
- `src/components/document/SharedDocumentForm.tsx` — Client field locking
- `src/components/ClientSelector.tsx` — Forced closed state in edit mode

---

## No-Touch Zones Respected

- ✅ Did not modify `src/lib/Calculations.ts`
- ✅ Did not modify `src/domain/prefixConstants.ts`
- ✅ Did not modify any database constraints
- ✅ Did not modify invoice domain logic

---

## Deliverables

- [x] Updated `docs/standard/document-transformation-standard.md` (431 lines, 14 sections)
- [x] This report

---

## Recommendations for Future Implementation

If implementing the UX requirements in application code:

1. Add lock icon component for identity fields on saved documents
2. Implement interception behaviour in ClientSelector for edit mode
3. Add "Duplicate from editable state" button in Edit Law feedback message
4. Ensure SharedDocumentForm preserves unsaved changes during recovery duplicate
5. Add audit trail entries for PAYMENT_RECORDED and PAYMENT_VOIDED events

---

## Conclusion

The Document Transformation Standard now includes normative UX requirements for immutable identity fields, a guided recovery workflow, and approved duplicate-from-editable-state patterns. The standard is ready for implementation in application code.
