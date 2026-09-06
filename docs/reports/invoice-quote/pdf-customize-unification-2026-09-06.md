# PDF Customization Unification Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Recover the pre-scattered Invoice/Quotation popup behavior.
- Unify the customization system for CSR, Waybill, Quotation, Invoice.
- Keep popups compact with miniature visual template previews.
- Record the direction in the Facelift PRD.

## Scope

- Shared card, sheet, pickers, Invoice/Quotation popups, PRD section 21.
- No PDF pipeline, calculation, schema, or unrelated UI changes.

## Files changed

- `src/components/document-view/shared/TemplateMiniPreview.tsx` (new)
- `src/components/document-view/shared/CommercialTemplatePicker.tsx`
- `src/components/document-view/shared/DocumentCustomizeCard.tsx`
- `src/components/document-view/invoice/InvoiceOverlays.tsx`
- `src/components/csr/CsrTemplateCarousel.tsx`
- `src/components/waybill/WaybillTemplateSelector.tsx`
- `src/pages/ViewQuotation.tsx`
- `src/pages/ViewInvoice.tsx`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/21-surfaces-and-overlays.md`
- `docs/reports/invoice-quote/pdf-customize-unification-2026-09-06.md` (this report)

## Skills used

Skills used: pdf-rendering-correctness, vercel-composition-patterns
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Recovered

- Pre-scatter Invoice/Quotation popups used the `designOnly` gate. Bank and output controls stayed out. Inline cards owned those settings. This behavior is restored.
- Compact and landscape toggles rendered pre-scatter, even in `designOnly` mode. They disappeared without a requirement. They are restored for Invoice/Quotation as document-specific presentation controls.
- Draft resync on sheet open is restored (the deleted sheet had it). Popup drafts now refresh from page state on open. This prevents popup saves from overwriting newer inline edits.

### Removed

- `bankAccountSelector` slot and Bank Details section from `DocumentCustomizeCard`.
- `outputOptions` slot and Output Options section from `DocumentCustomizeCard`.
- Dead `companyTagline`, `footerText`, and `TemplateOption` declarations.
- `PdfBankControls` and `PdfDocumentOptionsCard` from Invoice/Quotation popups.
- Unused `previewBankAccounts` projection and import from `ViewInvoice`.
- Bank and output settings remain inline (`BankDetailsCard`, `DocumentOptionsCard`). No duplication remains.

### Unified

- All four families use `DocumentSheet` plus `DocumentCustomizeCard`.
- Same section order: Template, Accent (commercial only), Document Font, Ink (service only), Handwriting (service only), Layout toggles (commercial only), Save.
- All three template pickers use snap-carousel interaction with 150-160px cards.
- All thumbnails render through one shared `TemplateMiniPreview` (80px fixed footprint).
- Commercial minis show header, meta chips, table rows, totals block.
- Service minis show header, section title, content lines. Waybill keeps its accent rule.
- Commercial theme tokens come from each template's `*Styles.ts` defaults. No live data. No PDF generation.

### Template architecture reuse

- Full templates are `@react-pdf/renderer` components. They cannot render as DOM thumbnails.
- Thumbnails reuse theme tokens only, not layout definitions. This avoids duplication of full layouts and avoids runtime PDF cost.
- CSR variant themes (`CSR_TEMPLATE_VARIANTS`) feed the shared renderer unchanged. Exact CSR visuals preserved, including `sectionTitleBg` fallback.

### Document-specific controls

- Commercial only: accent color, compact layout, landscape layout.
- Service only: ink color, handwriting font.
- All families: template picker, document font, save.

### PRD section updated

- `21-surfaces-and-overlays.md`: stale `PdfOutputCustomizeSheet` inventory entry replaced with `DocumentCustomizeCard`. New `§5.1A Document Customization Sheets` records the shared model, compactness rule, no-duplication rule, and miniature-preview principles. No other sections changed.

## Verification result

- `bun run typecheck`: passed (clean, two consecutive runs).
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched).
- `bun run build`: skipped due to hardware policy.
- `git status`: only intended files changed. Pre-existing staged and deleted entries untouched.

## Risks or limitations

- Thumbnail fidelity is token-level, not layout-exact. Templates with distinct structures (Bolt certificate seal, Crest serif) share the commercial miniature structure and differ by theme only.
- Waybill mini body now matches the CSR service body plus accent rule. The old split-row detail is gone. Change is small and documented here.
- Engine accent and font setters persist to localStorage on every tap, before Save. Closing without saving still leaks those edits. The preset write-on-save path from the old sheet was not restored. Pipeline redesign is out of scope.
- No runtime or device check ran. Popup height improvement is structural (two large sections removed), not measured.

## Deferred work

- Measure popup footprint on a phone viewport.
- Decide whether accent and font edits should persist only on Save.
- Extend miniature structural variants if template identities need stronger distinction.
- Consider unifying CSR (160px) and Waybill/commercial (150px) card widths exactly.
