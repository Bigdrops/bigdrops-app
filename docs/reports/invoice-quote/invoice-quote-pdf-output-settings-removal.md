# Invoice and Quote PDF Output Settings Removal Report

This report was written by Buffy on 2026-09-04 via Freebuff.

---

## Objective

Remove the PDF Output Settings section from the Invoice and Quote create/edit
forms. Remove the three percentage-display preferences from the application.
Keep the four remaining PDF output switches as View-page-only controls.

The three percentage preferences are:

- showVatPercentage
- showWhtPercentage
- showDiscountPercentage

The four remaining switches are:

- showFooter
- showTagline
- showBalanceDue
- showAmountInWords

## Scope

- Strip the three percentage fields from all types and defaults.
- Remove the document option switches from the create/edit forms.
- Keep the Bank Details picker on the forms.
- Re-add the Show Balance Due and Show Amount in Words toggles on the View pages.
- Keep the Show Footer and Show Tagline toggles on the View pages.
- Confirm percentage labels always render in PDF output.
- Confirm the PDF layer consumes discountPercentEquivalent and does not
  calculate it.

## Files Changed

| File | Change |
|------|--------|
| src/components/PdfOutputSettings.tsx | Removed the three percentage fields from PdfOutputSettingsValue. Removed the three defaults from mergeOutputState. PdfOutputSettings now renders only the Bank Details picker. The Document Options card no longer renders inside the create/edit form section. |
| src/domain/invoice/types.ts | Removed the three percentage fields from InvoicePdfOutput. |
| src/domain/invoice/renderTypes.ts | Removed the three percentage fields from PdfOutputLike. |
| src/domain/invoice/normalize.ts | Removed the three percentage fields from DEFAULT_INVOICE_PDF_OUTPUT. Removed the three field mappings from getInvoicePdfOutput. |
| src/hooks/useQuotationViewData.ts | Removed the three percentage fields from defaultPdfOutput. |
| src/components/document-view/shared/DocumentOptionsCard.tsx | Removed the three percentage defaults. Re-added the Show Balance Due and Show Amount in Words toggles. Added the hideBalanceDue prop. |
| src/components/document-view/quotation/QuotationViewPage.tsx | Passes hideBalanceDue to DocumentOptionsCard. Quotation PDFs have no balance-due concept. |

No changes were made to InvoiceFormPage.tsx or QuotationFormPage.tsx.
These pages render PdfOutputSettings. The removal happened inside
PdfOutputSettings, so the form pages need no change.

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Percentage preference removal

The three percentage fields no longer exist in any active application type.
There are no remaining references to them in src/.

The removal points are:

- PdfOutputSettingsValue in PdfOutputSettings.tsx
- InvoicePdfOutput in src/domain/invoice/types.ts
- PdfOutputLike in src/domain/invoice/renderTypes.ts
- DEFAULT_INVOICE_PDF_OUTPUT and getInvoicePdfOutput in normalize.ts
- defaultPdfOutput in useQuotationViewData.ts
- The defaults function in DocumentOptionsCard.tsx

PDF templates cannot gate on these fields because the fields do not exist.

### Form changes

The create/edit forms for Invoice and Quote render PdfOutputSettings.
This component now renders only the Bank Details picker.
The Document Options switches no longer render on the forms.

The Bank Details subsection is unchanged. Its showBankDetails switch,
selected-account display, and Switch Account picker still work.

### View-page controls

DocumentOptionsCard is the shared PDF options card on the View pages.
Its rows are:

- Show Bank Details (existing)
- Show Tagline (existing)
- Show Footer (existing)
- Show Balance Due (re-added, Invoice View only)
- Show Amount in Words (re-added)
- Merge Qty and Unit in PDF Table (Invoice View only, existing)
- Customize Template and Colors button (existing)

The quotation view does not render the Show Balance Due row.
Quotation PDFs have no balance-due line. The quotation implementation does
not support this control, so the task did not invent new behavior for it.
The quotation download path does not read showBalanceDue.

The toggles write through the existing onOutputChange flow on both View
pages. This flow persists through the existing save customization handlers.
Removing the form controls did not reset persisted values.

### Percentage display path

PDF percentage labels are built in src/domain/document/pdfSummaryLabels.ts.
This file already renders VAT, WHT, and discount percentages without any
preference gate. This behavior is now mandatory.

For a fixed discount, the label reads discountPercentEquivalent from the
financial calculation result. The PDF layer performs no percentage
arithmetic of its own.

## Verification Result

- bun run audit:load: passed. All warnings are pre-existing. My changes
  added no new warnings.
- bun run typecheck: passed (exit code 0).
- git status: my changes appear in the staged set together with
  pre-existing changes from other agents. No pre-existing files were
  reverted or overwritten.
- Static search for showVatPercentage, showWhtPercentage, and
  showDiscountPercentage across src/: zero references remain.

Static search results for the acceptance criteria:

- Invoice create/edit form renders no document option switches: confirmed.
- Quote create/edit form renders no document option switches: confirmed.
- No UI switch exists for the three percentage fields: confirmed.
- PDF rendering does not use the three percentage fields: confirmed.
- VAT percentage always displays: confirmed.
- WHT percentage always displays: confirmed.
- Discount percentage always displays: confirmed.
- Fixed-discount percentage uses discountPercentEquivalent: confirmed.
- No PDF or label code calculates the percentage: confirmed.
- The four remaining switches are available on View pages: confirmed.
- The four remaining switches are not exposed on create/edit forms: confirmed.
- No financial calculation formulas changed: confirmed.

## Risks or Limitations

- The quotation view loses the ability to configure balance due. This was
  already true. The quotation PDF renderer never read showBalanceDue.
- The quotation view gained the Show Amount in Words toggle. The quotation
  download path reads showAmountInWords, so the toggle has effect.
- Values for showFooter, showTagline, showBalanceDue, and showAmountInWords
  stored on existing documents are preserved. The forms no longer write
  them, and the View pages read and write them through the existing save
  flow.
- Obsolete persisted percentage values remain as inert historical data in
  saved custom fields. No data migration was performed. This matches the
  task instruction to avoid destructive migration.

## Deferred Work

1. ViewQuotation.tsx passes a previewControls prop that renders
   PdfDocumentOptionsCard. QuotationViewPage declares this prop in its
   type but never renders it. The prop is dead. This is a separate
   pre-existing issue and was not fixed in this task.
2. DocumentOptionsCard still shows a Show Bank Details toggle on the View
   pages. A separate BankDetailsCard also renders bank details there.
   The task did not change this. A future decision can unify the two.
3. Pre-existing concurrent changes were left untouched:
   - NRS-docs conversion files and the obligation lookup index (staged)
   - The folder Readme update (staged)
   - src/App.tsx and tenant-related files (other agent work)
   - Supabase function and migration files (other agent work)
   - Earlier discount-percent reports under docs/reports/
