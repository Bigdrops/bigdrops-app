# Document Image Upload Policy Standard

> This is a normative standard. All document image pickers MUST conform.

## Supported Formats

The following MIME types are accepted for document image uploads:

| MIME Type      | Extensions         |
|----------------|---------------------|
| `image/jpeg`   | `.jpg`, `.jpeg`     |
| `image/png`    | `.png`              |
| `image/webp`   | `.webp`             |
| `image/heic`   | `.heic`             |
| `image/heif`   | `.heif`             |
| `image/avif`   | `.avif`             |
| `image/gif`    | `.gif`              |
| `image/bmp`    | `.bmp`              |
| `image/tiff`   | `.tiff`, `.tif`     |

## Rejected Formats

Every other MIME type is rejected, including but not limited to:

- `application/pdf`
- `application/msword` and `application/vnd.*`
- `application/zip`
- `text/*`, `audio/*`, `video/*`
- `application/octet-stream`
- RAW camera formats (`.dng`, `.cr2`, `.cr3`, `.nef`, `.arw`, `.orf`, `.rw2`, `.raf`)

RAW formats are intentionally excluded because they are extremely large, inconsistently supported by browsers, and unnecessary for business document attachments.

## Rationale

A single source of truth for image validation prevents:
- Users selecting PDFs or other non-image files through the picker
- Inconsistent MIME checks across document modules
- Invalid uploads that fail silently or cause rendering issues

## Architecture

### Shared Utility

All validation lives in one file:

```
src/lib/documentImageUploadPolicy.ts
```

Exports:
- `SUPPORTED_IMAGE_MIME_TYPES` — readonly array of allowed MIME strings
- `IMAGE_ACCEPT_ATTRIBUTE` — pre-built `accept` string for `<input type="file">`
- `isSupportedImageFile(file)` — returns `true` if the file's MIME type is allowed
- `partitionImageFiles(files)` — separates valid images from rejected files with error messages
- `getUnsupportedImageErrorMessage(fileName)` — consistent user-facing error text

### Mandatory Usage

Every document image picker MUST:

1. Set `accept={IMAGE_ACCEPT_ATTRIBUTE}` on the `<input type="file">` element
2. Call `isSupportedImageFile(file)` after file selection as the authoritative check
3. Show the error from `getUnsupportedImageErrorMessage()` on rejection
4. Reject only invalid files — keep valid selections intact

### Picker Filtering vs. Validation

The `accept` attribute is a **convenience filter** only. It pre-filters the native file picker but:
- Does not prevent drag-and-drop of arbitrary files
- May be bypassed by some operating systems or browsers
- Is never the source of truth

**Validation after selection is always mandatory.**

## Non-Goals

This standard does not cover:
- `WhtReceiptMatcherAction.tsx` — intentionally accepts PDFs for compliance receipts
- `PaymentAttachmentUploader.tsx` when used for general file attachments (not image-only pickers)
- Signature draw pads (no file selection involved)
