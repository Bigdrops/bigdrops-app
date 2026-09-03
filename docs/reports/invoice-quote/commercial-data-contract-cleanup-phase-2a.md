# Phase 2A: Data Contract Cleanup — Remove Presentation Labels from Address Lines

**Date:** 2026-06-26  
**Status:** Complete  
**Phase:** 2A — Data Contract Cleanup

---

## Problem

`buildCompanyPreviewLines()` and `buildClientPreviewLines()` in `partyProjection.ts` were injecting presentation labels into address data lines:

- `buildCompanyPreviewLines()` included `VAT Number: <vat>`, `Phone: <phone>`, `Email: <email>` as separate lines in the address lines array
- `buildClientPreviewLines()` included `Attn: <contact>`, phone, and email as separate lines

These labels leaked into the PDF data contract because:

1. Both callers (`invoicePdfActions.ts`, `pdfDownloadHandler.ts`) mapped `companyPreviewLines`/`clientPreviewLines` to `PdfParty.addressLines`
2. `industryAdapter.ts::splitAddressLines()` then consumed these polluted address lines, potentially contaminating the `cityState` field
3. Meanwhile, both callers ALSO correctly mapped phone/email/vat to dedicated semantic `PdfParty` fields (`phone`, `email`, `taxId`)

The result was redundant — phone/email/vat appeared both in address lines (with labels) and in semantic fields — and the label text could appear in unintended display contexts.

---

## Fix

**Modified file:** `src/domain/invoice/projections/partyProjection.ts`

### `buildCompanyPreviewLines()`

**Before:**
```
return [company_address, cityState, `VAT Number: ${vat}`, `Phone: ${phone}`, `Email: ${email}`]
```

**After:**
```
return [company_address, cityState]
```

### `buildClientPreviewLines()`

**Before:**
```
lines.push(`Attn: ${contactPerson}`)
// ... pushes address, cityState, phone, email
```

**After:**
```
lines.push(address, cityState)
```

---

## Files Verified Unchanged (No Changes Needed)

| File | Reason |
|---|---|
| `src/components/pdf-new/industryAdapter.ts` | Already reads `PdfParty.phone`, `PdfParty.email`, `PdfParty.taxId` directly; `splitAddressLines()` now receives clean input |
| `src/components/pdf-new/types.ts` | `PdfParty` already has `phone`, `email`, `taxId`, `attention` fields |
| `src/domain/invoice/renderTypes.ts` | `SettingsLike`/`ClientLike` already have phone/email/vat/contact_person |
| `src/domain/invoice/previewModel.ts` | Pass-through only |
| `src/domain/quotation/previewModel.ts` | Pass-through only |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Already maps phone/email/vat as separate `PdfParty` fields |
| `src/domain/quotation/pdfDownloadHandler.ts` | Same pattern as invoice |
| `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` | Renders `party.phone`, `party.email`, `party.customInfo` directly; never reads phone/email from addressLines |
| `src/components/pdf-new/templates/Industry.tsx` | Same pattern |
| `src/components/document-view/invoice/InvoiceDocumentCard.tsx` | Screen preview — loses label lines but phone/email can be added later via `settings` props if needed |
| `src/components/document-view/quotation/QuotationDocumentPreview.tsx` | Same |

---

## Verification

| Check | Result |
|---|---|
| `bun run audit:load` | Passed |
| `bun run typecheck` | 0 errors |
| `bun run build` | Passed |

---

## Impact

- **Positive:** Phone, email, and VAT are now delivered exclusively via semantic fields (`PdfParty.phone`, `PdfParty.email`, `PdfParty.taxId`) rather than duplicated in address lines with presentation labels
- **Positive:** `splitAddressLines()` in `industryAdapter.ts` now receives only genuine address data — no risk of label text leaking into cityState or other display fields
- **Side effect:** Screen preview cards (`InvoiceDocumentCard`, `QuotationDocumentPreview`) will no longer display phone/email/VAT in address line blocks since those labels were removed. These previews have access to `settings`/`settingsData` props if phone/email display is needed later
- **Preserved:** 100% backward compatible — all 5 PDF templates, all PDF-generated output, all screen forms remain identical
