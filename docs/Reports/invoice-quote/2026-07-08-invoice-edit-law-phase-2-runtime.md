# Invoice Edit Law — Phase 2: Runtime UX Enforcement

This report was written by OpenCode on 2026-07-08 via Local Runner.

## Objective

Implement runtime UX enforcement of the 1st Law of Document Transformation (Identity Immutability) for Invoice and Quotation forms, as specified in `docs/Prompts/prompt66.md`. Covers Parts B–F.

## Scope

**In scope:** FormHeader client button fix, invoice number field UX, IdentityLockDialog unification, Quotation Edit crash resilience, Quotation duplicate prefill.

**Excluded:** Receipt module changes (separate concurrent work), BEL (blanket enforcement layer), system-wide audit log (Phase 3).

## Changes

### Part B: Client field immediate interception

**File:** `src/components/document/FormHeader.tsx:67,69`

- Removed `disabled={isEdit}` from the client selection button in edit mode.
- Removed `cursor-not-allowed` from the edit-mode className.
- `onClick` now unconditionally fires → `onLockedFieldClick('client')` in edit mode → IdentityLockDialog opens immediately on any click attempt.

Previously `disabled={isEdit}` prevented the `onClick` handler from ever firing, making the dialog unreachable via the client field.

### Part C: Invoice number field — non-focusable display

**File:** `src/components/document/FormHeader.tsx:112-124`

- Replaced the `<Input readOnly={isEdit}>` pattern with a conditional render:
  - **Edit mode:** a `<span>` element that displays the invoice number. No focus, no caret, no keyboard invocation, no selection.
  - **Create mode:** unchanged `<Input>`.
- The `<span>` receives an `onClick` handler that shows the IdentityLockDialog, allowing users to learn why the field is locked.

### Part D: Unified Identity Fields Locked dialog

**Files:**
- `src/components/document/IdentityLockDialog.tsx` — removed `fieldLabel` prop; updated title to "Identity Fields Locked"; updated body to mention both "Client and document number" instead of a single field.
- `src/pages/InvoiceFormPage.tsx` — removed `fieldLabel` from IdentityLockDialog usage.
- `src/pages/QuotationFormPage.tsx` — removed `fieldLabel` from IdentityLockDialog usage.

The same dialog body now appears regardless of which field the user clicked. The per-field label distinction was unnecessary — both identity fields share the same immutability rule.

### Part E: Quotation Edit crash resilience

**File:** `src/pages/QuotationFormPage.tsx:179–300`

- Wrapped the entire `load()` async function body in a try-catch.
- On catch: logs the error, shows a user-facing toast ("Failed to load quotation" with error message), and navigates back to `/quotations`.
- This prevents an unhandled promise rejection (blank white page) if `buildQuotationFormState()`, `normalizeQuotationGrouping()`, or any Supabase query throws for a specific data state.

**Root cause not identified:** Static analysis could not locate a definitive crash path. The load effect guards with `if (loading) return` for the main render, all hooks run before mount with safe defaults, and no obvious React crash pattern was found. The wrap-in-try-catch provides defense-in-depth for any data-specific edge case.

### Part F: Quotation duplicate with prefill

**File:** `src/pages/QuotationFormPage.tsx:483-501`

- Added `handleDuplicateFromEditable` callback that clones current items, strips IDs, and navigates to `/quotations/new` with a prefill state containing `clientId`, `clientName`, `projectId`, and `sourceRfq.items`.
- This mirrors Invoice's `handleDuplicateFromEditable` behavior: preserves line item data and client selection while creating a fresh draft.
- Replaced the old `onDuplicate={() => navigate('/quotations/new')}` (no prefill) with the new function.

## Verification

- `bun run audit:load` — passed (no new audit warnings).
- `bun run typecheck` — 3 pre-existing errors in unrelated files (`native-feedback-renderer.tsx`, `paymentService.ts`). Zero errors in changed files.
- `git diff` — only the 4 intended files modified.

## Risks & Limitations

1. **PART E catch-all:** The try-catch hides the original error stack if the root cause is a data bug. Debugging such cases requires checking the console. This is preferable to a blank white page.
2. **Quotation duplicate prefill fidelity:** The `sourceRfq` path was designed for RFQ conversion, not intra-quotation duplication. Custom fields, extra charges, and group metadata are not transferred. Full fidelity duplication was out of scope.
3. **No Receipt changes:** Receipt identity fields follow a separate pattern (`assertReceiptImmutable.ts`) and were not modified.

## Deferred Work

- Enable Bel enforcement layer for identity fields (Phase 3).
- Audit trail for identity field interception events.
- Full quotation duplication including custom_fields, extra_charges, groups.
