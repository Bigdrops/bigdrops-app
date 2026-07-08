# Invoice Edit Law — Runtime Root Cause Investigation

This report was written by OpenCode on 2026-07-08 via Local Runner.

## Scope

Investigate four runtime issues with the Document Edit Law enforcement:
- Part A: Invoice Client field not locked in edit mode
- Part B: Invoice Number field not locked in edit mode
- Part C: IdentityLockDialog never shown for Invoice locked fields
- Part D: Quotation Edit crash

## Findings

### Root Cause (Parts A, B, C): Missing `mode` prop in `InvoiceFormPage.tsx`

**Location:** `src/pages/InvoiceFormPage.tsx:431`

`InvoiceFormPage` receives `mode` as a prop (line 84) and it IS passed by `EditInvoice.tsx`. However, the prop is **never forwarded** to `<SharedDocumentForm>`.

**Impacted call chain:**

1. `InvoiceFormPage` renders `<SharedDocumentForm>` at line 431 **without** `mode` prop
2. `SharedDocumentForm` at line 196 computes: `isEdit={props.mode === 'edit'}` → always `false` (undefined === 'edit')
3. `FormHeader` receives `isEdit=false` (line 36 defaults to false), so:
   - Line 66: Client button calls `onOpenClientPicker` (editable) instead of `onLockedFieldClick?.('client')`
   - Line 68-71: Client field renders with dashed border (editable styling), not locked styling (opacity-70 + solid border)
   - Line 74: Shows `BriefcaseBusiness` icon, not `Lock` icon
   - Line 107-125: Invoice Number renders as editable `<Input>` instead of locked `<span>`
4. `SharedDocumentForm` lines 306-307: `open={props.mode === 'edit' ? false : showClientPicker}` → ClientSelector opens in edit mode
5. `IdentityLockDialog` mounted at InvoiceFormPage:538 is conditionally gated by `isEdit` — this part works correctly, but the dialog is **never triggered** from FormHeader because the locked field click handler is never reached

**Fix applied:** Added `mode={mode}` to `<SharedDocumentForm>` in `InvoiceFormPage.tsx:432`.

### Part D: Quotation Edit Crash — No crash found in Edit Law path

`QuotationFormPage` correctly passes `mode={mode}` (line 508) and `onLockedFieldClick={isEdit ? handleLockedFieldClick : undefined}` (line 608). The IdentityLockDialog is conditionally rendered at line 628-634. No render-time crash path was found in the quotation edit flow.

If a "Quotation Edit crash" exists, it is **not** caused by the same mode-prop issue. Possible separate causes:
- An unrelated React crash (render loop, undefined state access)
- A DB/save-time crash (not render time)
- The crash report may have been a symptom of the Invoice issue being tested on the wrong page

## Files Inspected

- `src/pages/InvoiceFormPage.tsx` — confirmed missing `mode` prop at line 431
- `src/pages/QuotationFormPage.tsx` — confirmed correct `mode` prop at line 508
- `src/components/document/SharedDocumentForm.tsx` — traced `props.mode` usage
- `src/components/document/FormHeader.tsx` — traced `isEdit` conditional rendering
- `src/components/document/IdentityLockDialog.tsx` — traced render and callback
- `src/domain/invoice/assertIdentityImmutable.ts` — save-time invariant check
- `src/domain/quotation/assertIdentityImmutable.ts` — save-time invariant check
- `src/hooks/useInvoiceSave.ts` — save flow
- `src/hooks/useQuotationSave.ts` — save flow
- `src/hooks/useDocumentSave.ts` — generic save orchestrator

## Verification

- `bun run typecheck` — 2 pre-existing errors in `native-feedback-renderer.tsx` (unrelated). Our change compiles cleanly.
- `bun run audit:load` — no new warnings from our change.
- `git status` — only `src/pages/InvoiceFormPage.tsx` modified (one-line change).

## One-Line Fix

```diff
<SharedDocumentForm
+ mode={mode}
  title={pageTitle}
```

## Risks & Limitations

- The Quotation Edit crash (Part D) was not reproducible from code inspection. It may require runtime testing to surface.
- Previous implementation reports (`invoice-edit-law-phase-1.md`, `phase-2.md`) claimed these issues were fixed. The mode-prop gap was the root cause for all of them — none of the previous reported fixes actually worked because they didn't fix this single source of truth issue.
