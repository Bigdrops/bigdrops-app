# Commercial Party Information Contract Completion

**Date:** 2026-06-26
**Status:** ✅ Complete

---

## Summary

Architecturally routed `company_website` and `settings.custom_info` from the database through every layer of the Commercial PDF pipeline to render in the `CommercialPartyCard` template component.

---

## Data Flow

```
DB (settings.company_website, settings.custom_info)
  → SettingsLike (src/domain/invoice/renderTypes.ts)
  → buildCompanyPreviewLines (src/domain/invoice/projections/partyProjection.ts)
  → Preview Model (src/domain/invoice/previewModel.ts / quotation/previewModel.ts)
  → PdfParty.issuer (src/components/pdf-new/types.ts)
  → industryAdapter (src/components/pdf-new/industryAdapter.ts)
  → CommercialDocumentData.company
  → CommercialPartyCard (src/components/pdf-new/templates/commercialDocumentBlocks.tsx)
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/domain/invoice/renderTypes.ts` | Added `company_website?: string \| null` and `custom_info?: string \| null` to `SettingsLike` |
| `src/domain/invoice/projections/partyProjection.ts` | Changed return type from `string[]` to `CompanyPreviewResult { addressLines, website, customInfo }` |
| `src/domain/invoice/previewModel.ts` | Destructures `companyPreviewResult`, returns `companyWebsite` and `companyCustomInfo` |
| `src/domain/quotation/previewModel.ts` | Same pattern as invoice preview model |
| `src/components/pdf-new/types.ts` | Added `website?: string \| null` and `customInfo?: Array<{label, value}>` to `PdfParty` |
| `src/components/pdf-new/industryAdapter.ts` | Added `website` to `CommercialDocumentData.company` type; merges `customInfo` items |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Issuer object includes `website` and `customInfo` from preview model |
| `src/domain/quotation/pdfDownloadHandler.ts` | Issuer object includes `website` and `customInfo` from preview model |
| `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` | `CommercialPartyCard` renders `website` between email and customInfo |

---

## Key Decisions

1. **`company_website` added to `SettingsLike`** — architectural insertion point for DB field
2. **`buildCompanyPreviewLines` return type changed** — `string[]` → `CompanyPreviewResult` object for cleaner separation
3. **`website` flows as `string` field** — through party projection → preview model → PdfParty → adapter → CommercialDocumentData
4. **`custom_info` parsed in projection layer** — JSON string → `Array<{label, value}>` at point of extraction
5. **Existing `company.customInfo` merged** — settings `custom_info` items additive with VAT-derived item, no replacement
6. **Website rendered with guard** — `'website' in party` because `CommercialDocumentData.client` doesn't have `website` field

---

## Verification

| Command | Result |
|---------|--------|
| `bun run audit:load` | ✅ Passed |
| `bun run typecheck` | ✅ Zero errors |
| `bun run build` | ✅ Build succeeded |

---

## Remaining Work

- Visual verification: generate Invoice + Quotation PDFs to confirm rendering
- Test with real settings data in production
