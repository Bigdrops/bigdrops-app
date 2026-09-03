# Invoice & Quotation PDF Output Settings Removal Report

This report was written by OpenCode (hy3) on 2026-08-19 via Local Runner.

## Objective

Remove the Document Options switches for `showBalanceDue`, `showAmountInWords`, `showVatPercentage`, `showWhtPercentage`, and `showDiscountPercentage` from the invoice/quotation PDF Output Settings UI, hardcode the three percentage-in-brackets labels to always show, and keep the `showFooter` and `showTagline` switches (per user decision). Close the ticket `docs/tickets/invoice&quote/invoice-pdf-output-settings-removal.md`.

## Scope

- Invoice create/edit form (`InvoiceFormPage` → `PdfOutputSettings`) and its customize sheet.
- Invoice view (`InvoiceWorkspace` → `DocumentOptionsCard`) and Quotation view (`QuotationViewPage`, `ViewQuotation`).
- Quotation is included because the affected components are shared (user decision: Invoice + Quotation).
- `showFooter` and `showTagline` switches are retained and remain user-editable.

## Files changed

- `src/components/PdfOutputSettings.tsx` — Removed `showBalanceDue`, `showAmountInWords`, `showVatPercentage`, `showWhtPercentage`, `showDiscountPercentage` switches from `PdfDocumentOptionsCard`. Removed the now-dead `showBalanceDueOption` prop from `PdfOutputSettingsProps`, `PdfDocumentOptionsCardProps`, `PdfSupportingOptions`, and `PdfOutputSettings`.
- `src/components/document-view/shared/DocumentOptionsCard.tsx` — Removed `Show Amount in Words`, `Show VAT % in Brackets`, `Show WHT % in Brackets`, `Show Discount % in Brackets` toggle rows. Retained `Show Bank Details`, `Show Tagline`, `Show Footer`, and merge-qty.
- `src/domain/document/pdfSummaryLabels.ts` — `getPdfSummaryLabels` now always renders the percentage in brackets for VAT, WHT, and Discount (removed the `options`/label-toggle path).
- `src/domain/invoice/projections/financialProjection.ts` — Updated `getPdfSummaryLabels` call (dropped second argument).
- `src/domain/quotation/previewModel.ts` — Updated `getPdfSummaryLabels` call (dropped second argument).
- `src/pages/InvoiceFormPage.tsx` — Removed `showBalanceDueOption` prop from `PdfOutputSettings`.
- `src/components/document-view/invoice/InvoiceOverlays.tsx` — Removed `showBalanceDueOption={true}` from `PdfOutputCustomizeSheet`.
- `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` — Removed `showBalanceDueOption` prop, default, and passthrough.

## Skills used

NONE

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

1. FORM-1 (partial): The five Document Options switches were removed from the shared PDF Output Settings UI. `showFooter` and `showTagline` were retained per user instruction ("footer and tagline switch stays").
2. VIEW-1: The VAT %, WHT %, and Discount % switches were removed from `DocumentOptionsCard` and hardened to always render in `getPdfSummaryLabels`.
3. X-1 / X-2: Changes applied to shared components, so the invoice and quotation UIs resolve to one model and one default set.
4. FORM-2 (resolved): `showBalanceDue` and `showAmountInWords` are no longer UI-editable but still read from saved `pdfOutput` (default `true`). This avoids silently flipping existing documents (FORM-3). The three percentage fields are hardcoded `true` at the label layer.

## Verification result

- `bun run audit:load`: passed (only pre-existing unrelated warnings).
- `bun run typecheck`: passed (no errors).
- `bun run lint`: targeted lint on changed files shows only pre-existing errors (`any` types, pre-existing unused vars, pre-existing `setState-in-effect` in `PdfOutputCustomizeSheet` with its own disable comment). No errors introduced by these changes.
- `git status`: 8 source files modified; no new migrations or unrelated files touched.

## Risks or limitations

- Existing invoices/quotations that previously saved `showVatPercentage`, `showWhtPercentage`, or `showDiscountPercentage` as `false` will now render the percentage in brackets (VIEW-1 intent: "correct in all cases"). This is a deliberate behavior change for pre-existing documents.
- `showBalanceDue` and `showAmountInWords` retain their last-saved value for pre-existing documents (no silent flip), defaulting to `true` for new documents.
- The `InvoicePdfOutput` type and `DEFAULT_INVOICE_PDF_OUTPUT` still carry the removed fields; they are now non-editable via UI but preserved in stored data.

## Deferred work

- None. FORM-3 verification (generate a PDF from a pre-existing non-default document) is recommended as a manual smoke test before release.
