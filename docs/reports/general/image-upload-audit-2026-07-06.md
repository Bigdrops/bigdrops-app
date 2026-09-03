# Image Upload Audit & Payment Attachment Restoration

This report was written by MiMoCode on 2026-07-06 via Local Runner.

## Objective

Comprehensive audit of every image upload workflow to ensure:
- Image pickers display only images (no PDFs, Word docs, etc.)
- Runtime validation is a safety fallback, not the only filter
- Signature uploads preserve transparent PNG/WebP
- Payment attachments accept business documents (images, PDF, DOC, XLS, CSV, TXT)

## Audit Findings

### Image Upload Entry Points (7 total)

| Component | File | accept | Validation | Status |
|-----------|------|--------|------------|--------|
| MobileItemCard | `src/components/invoice/MobileItemCard.tsx:305` | `IMAGE_ACCEPT_ATTRIBUTE` | `isSupportedImageFile` | OK |
| ItemImageUpload | `src/components/ItemImageUpload.tsx:100,130` | `IMAGE_ACCEPT_ATTRIBUTE` | `isSupportedImageFile` | OK |
| BrandingSettingsSection | `src/pages/settings/BrandingSettingsSection.tsx:231` | `IMAGE_ACCEPT_ATTRIBUTE` | `isSupportedImageFile` | OK |
| SignatoriesSettingsSection | `src/pages/settings/SignatoriesSettingsSection.tsx:288` | `IMAGE_ACCEPT_ATTRIBUTE` | `isSupportedImageFile` | OK |
| WaybillSignatures | `src/components/waybill/WaybillSignatures.tsx:408` | `IMAGE_ACCEPT_ATTRIBUTE` | `isSupportedImageFile` | OK |
| CsrFormScreen | `src/components/csr/CsrFormScreen.tsx:738` | `IMAGE_ACCEPT_ATTRIBUTE` | `isSupportedImageFile` | OK |
| WhtReceiptMatcherAction | `src/components/compliance/WhtReceiptMatcherAction.tsx:152` | `.pdf,.jpg,.jpeg,.png` | None (intentional) | OK |

All image pickers use `IMAGE_ACCEPT_ATTRIBUTE` which filters to: `.jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.gif,.bmp,.tiff,.tif`. No image picker exposes `*/*` or unrestricted browsing.

### Signature Upload Analysis

| Component | Uses processSignature? | Transparency Preserved? |
|-----------|----------------------|------------------------|
| WaybillSignatures | Yes (line 332) | Yes — canvas draws original, sets near-white to alpha=0, outputs PNG |
| SignatoriesSettingsSection | Yes (line 114) | Yes — same processSignature pipeline |
| CsrFormScreen | No (line 749) | Yes — raw FileReader.readAsDataURL, no processing |

`processSignature()` (`src/lib/processSignature.ts`):
- Draws image to canvas at original dimensions (line 10)
- Reads pixel data via `getImageData` (line 12)
- Sets near-white pixels (brightness > 220, RGB deltas < 30) to `data[i+3] = 0` (transparent)
- Outputs via `canvas.toDataURL('image/png')` (line 29)
- No JPEG conversion, no recompression, no alpha-channel loss

**Conclusion:** Transparent signatures are preserved correctly through all paths.

### Payment Attachment Issue (FIXED)

**Before fix:** `PaymentAttachmentUploader` imported `IMAGE_ACCEPT_ATTRIBUTE` and `isSupportedImageFile` from `documentImageUploadPolicy`. This rejected PDFs, Word docs, Excel files — breaking the intended business use case.

**After fix:** Created `documentAttachmentPolicy.ts` with:
- `DOCUMENT_ATTACHMENT_ACCEPT_ATTRIBUTE`: `.jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt`
- `isAcceptedAttachmentFile()`: validates MIME types for images + business documents
- `PaymentAttachmentUploader` now imports from `documentAttachmentPolicy` instead of `documentImageUploadPolicy`

### Error Messages (SIMPLIFIED)

| Before | After |
|--------|-------|
| `"filename.pdf" is not a supported image format. Please select a JPG, PNG, WebP, HEIC, HEIF, AVIF, GIF, BMP, or TIFF file.` | `Please select an image file.` |

All 6 image upload consumers use `getUnsupportedImageErrorMessage()` which now returns the concise message.

## Files Created

1. **`src/lib/documentAttachmentPolicy.ts`** — business document upload policy (images + PDF + DOC + XLS + CSV + TXT)

## Files Modified

1. **`src/lib/documentImageUploadPolicy.ts`** — simplified error messages
2. **`src/components/ui/PaymentAttachmentUploader.tsx`** — switched from image policy to attachment policy

## Architecture Summary

```
src/lib/
├── documentImageUploadPolicy.ts    # Image-only pickers (9 MIME types)
│   ├── IMAGE_ACCEPT_ATTRIBUTE
│   ├── isSupportedImageFile()
│   ├── partitionImageFiles()
│   └── getUnsupportedImageErrorMessage()
│
└── documentAttachmentPolicy.ts     # Business attachments (images + docs)
    ├── DOCUMENT_ATTACHMENT_ACCEPT_ATTRIBUTE
    ├── isAcceptedAttachmentFile()
    └── getAttachmentRejectedMessage()
```

## Verification

- `bun run audit:load` — passed (no new issues)
- `bun run typecheck` — 2 pre-existing errors in `native-feedback-renderer.tsx` (unrelated), zero new errors
- `git status` — only intended files changed (already committed in `872a2cc`)
- `bun run build` — skipped per 4GB RAM policy

## Deferred Work

- `recordPaymentAttachmentUploaded` audit function in `src/lib/audit.ts` is defined but unused (dead code). Not in scope for this audit.
- `updatePaymentAttachments` in `paymentRepository.ts` is defined but unused (DB writes go through API route). Not in scope.
- Server-side MIME validation in `api/upload-payment-attachment.ts` relies entirely on client-side checks. Could be hardened in a future phase.
