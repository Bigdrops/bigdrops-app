# Phase 2A — Data Contract Cleanup: Remove Labels from Address Lines

**Date:** 2026-06-26
**Scope:** Party projection layer only — `partyProjection.ts`
**Status:** ✅ Complete

---

## Problem

`buildCompanyPreviewLines()` and `buildClientPreviewLines()` in `partyProjection.ts` injected presentation labels into the `addressLines` string array:

- **Company:** `"VAT Number: {vat}"`, `"Phone: {phone}"`, `"Email: {email}"`
- **Client:** `"Attn: {contact_person}"`, `"{phone}"`, `"{email}"`

These labels leaked into downstream consumers:

1. **PDF rendering pipeline:** `addressLines` → `PdfParty.addressLines` → `splitAddressLines()` parsed `addressLines[0]` as address, then joined all remaining lines (including labels) as `cityState` — polluting the city/state display.
2. **Screen preview cards:** `InvoiceDocumentCard` and `QuotationDocumentPreview` rendered these lines directly, mixing address data with contact metadata.

Meanwhile, the callers (`invoicePdfActions.ts`, `pdfDownloadHandler.ts`) already mapped phone/email/VAT to **separate first-class fields** on `PdfParty` (`phone`, `email`, `taxId`). The addressLines labels were redundant — and harmful.

## Solution

### Changed files

**`src/domain/invoice/projections/partyProjection.ts`** — 2 functions modified:

| Function | Change |
|---|---|
| `buildCompanyPreviewLines()` | Removed `VAT Number:`, `Phone:`, `Email:` lines. Now returns `[company_address, cityState]` only. |
| `buildClientPreviewLines()` | Removed `Attn:`, phone, email lines. Now returns `[address, cityState]` only. |

### Files verified — no changes needed

| File | Why unchanged |
|---|---|
| `src/components/pdf-new/industryAdapter.ts` | Already reads `PdfParty.phone`, `PdfParty.email`, `PdfParty.taxId` directly from party objects. `splitAddressLines()` now receives clean input. |
| `src/components/pdf-new/types.ts` | `PdfParty` already has `phone`, `email`, `taxId`, `attention` fields. |
| `src/domain/invoice/renderTypes.ts` | `SettingsLike`/`ClientLike` already have phone/email/vat/contact_person fields. |
| `src/domain/invoice/previewModel.ts` | Pass-through only — no transformation of address lines. |
| `src/domain/quotation/previewModel.ts` | Same pattern — pass-through only. |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Already maps `settingsData.company_phone` → `PdfParty.phone`, `company_email` → `PdfParty.email`, `company_vat` → `PdfParty.taxId`. |
| `src/domain/quotation/pdfDownloadHandler.ts` | Same pattern as above. |
| All 5 PDF templates | Consume `CommercialDocumentData.seller.buyer.phone/email/customInfo` — never read phone/email from `addressLines`. |

## Verification

| Check | Result |
|---|---|
| `bun run audit:load` | ✅ Passed |
| `bun run typecheck` | ✅ Passed (0 errors) |
| `bun run build` | ✅ Passed (53.78s) |

## Data Flow (post-fix)

```
partyProjection.ts
  buildCompanyPreviewLines(company) → ["123 Main St", "Lagos, LA"]
  buildClientPreviewLines(client)    → ["456 Oak Ave", "Abuja, FC"]
        │
        ▼
  PDF actions map addressLines → PdfParty.addressLines
  PLUS map phone/email/vat → PdfParty.phone/email/taxId
        │
        ▼
  industryAdapter.ts::splitAddressLines(addressLines)
    → address = addressLines[0]  (clean address, no labels)
    → cityState = addressLines.slice(1).join(", ")  (clean city/state, no labels)
        │
        ▼
  Templates render:
    • address + cityState from PdfParty
    • phone from PdfParty.phone
    • email from PdfParty.email
    • customInfo from PdfParty.taxId (VAT)
```

## Notes

- Screen preview cards (`InvoiceDocumentCard`, `QuotationDocumentPreview`) consume `companyPreviewLines`/`clientPreviewLines` directly — they now show address + city/state only. Phone/email/VAT are available from `settings`/`settingsData` props if needed in a future enhancement.
- No changes to templates, typography, spacing, or visual layout were introduced — this was a data-layer-only cleanup.
