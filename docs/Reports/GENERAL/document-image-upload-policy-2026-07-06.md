# Standardize Document Image Upload Validation

This report was written by MiMoCode on 2026-07-06 via Local Runner.

## Objective

Create a single shared image upload validation policy so every document form rejects non-image files (PDFs, DOCs, etc.) and accepts only supported image formats. Previously, `accept="image/*"` was used everywhere without post-selection validation, allowing invalid files through.

## Scope

All image/photo pickers across: Invoice, Quotation, Waybill, CSR, BOQ, RFQ, Item Library, Branding Settings, Signatories Settings, and Payment Attachment Uploader.

**Excluded:** `WhtReceiptMatcherAction.tsx` (intentionally accepts PDFs for compliance receipts).

## Files Created

1. **`src/lib/documentImageUploadPolicy.ts`** — shared utility with:
   - `SUPPORTED_IMAGE_MIME_TYPES` — 9 allowed MIME types (JPEG, PNG, WebP, HEIC, HEIF, AVIF, GIF, BMP, TIFF)
   - `IMAGE_ACCEPT_ATTRIBUTE` — pre-built `accept` string for file inputs
   - `isSupportedImageFile(file)` — authoritative post-selection validation
   - `partitionImageFiles(files)` — batch filter with error messages
   - `getUnsupportedImageErrorMessage(fileName)` — consistent user-facing text

2. **`docs/STANDARD/document-image-upload-policy.md`** — normative standard documenting supported/rejected formats, rationale, and mandatory usage rules.

## Files Modified

| File | Change |
|------|--------|
| `src/components/invoice/MobileItemCard.tsx` | Import policy, validate after selection, use `IMAGE_ACCEPT_ATTRIBUTE` |
| `src/components/ui/PaymentAttachmentUploader.tsx` | Replace `DEFAULT_ACCEPT` (which included PDF) with `IMAGE_ACCEPT_ATTRIBUTE` |
| `src/components/csr/CsrFormScreen.tsx` | Import policy, validate signature uploads, use `IMAGE_ACCEPT_ATTRIBUTE` |
| `src/components/waybill/WaybillSignatures.tsx` | Import policy, validate signature uploads, use `IMAGE_ACCEPT_ATTRIBUTE` |
| `src/pages/settings/SignatoriesSettingsSection.tsx` | Replace `file.type.startsWith('image/')` with `isSupportedImageFile()`, use `IMAGE_ACCEPT_ATTRIBUTE` |
| `src/pages/settings/BrandingSettingsSection.tsx` | Replace `file.type.startsWith('image/')` with `isSupportedImageFile()`, use `IMAGE_ACCEPT_ATTRIBUTE` |
| `src/components/ItemImageUpload.tsx` | Replace `file.type.startsWith('image/')` with `isSupportedImageFile()`, use `IMAGE_ACCEPT_ATTRIBUTE` |

## Key Behavior Changes

- **Before:** `accept="image/*"` let users select any image MIME type. No post-selection validation. `PaymentAttachmentUploader` also accepted PDFs.
- **After:** Picker filters to exact extensions. Post-selection validation rejects any non-supported MIME type. Consistent error message shown. Only valid files are processed.

## Verification

- `bun run audit:load` — passed (no new warnings introduced)
- `bun run typecheck` — 2 pre-existing errors in `native-feedback-renderer.tsx` (unrelated), zero new errors
- `git status` — only intended 7 modified + 2 new files
- `bun run build` — skipped per 4GB RAM policy

## Risks

- HEIC/HEIF files may not have correct MIME types on all browsers (browser-dependent). The picker extension filter helps, but validation falls back to whatever the browser reports.
- `PaymentAttachmentUploader` change removes PDF support from its default. If any caller relied on PDF uploads through this component, they would need to pass `accept` explicitly. Based on codebase search, the only caller is `InvoiceRecordPaymentSheet.tsx` which handles attachments generically — this is acceptable since the component is specifically named "Payment **Attachment** Uploader" and the prompt scope focuses on image pickers.
