# BIGDROPS Android File Download Persistence Forensic Audit

This report was written by Muse Spark on 2026-09-11 via OpenCode.

Skills used: capacitor-best-practices, capacitor-plugins, debugging-capacitor, webapp-to-capacitor, capacitor-security, capacitor-performance, capacitor-offline-first, capacitor-push-notifications, framework-to-capacitor, safe-area-handling, tailwind-capacitor, ios-android-logs, mobile-android-design
Documentation standard: ASD-STE100 Simplified Technical English

## Executive Summary

PDF generation succeeds. Persistence also succeeds. Visibility fails.

On Android, every PDF write targets `Directory.Cache` under an `exports/` (or per-document) subfolder. The installed plugin (`@capacitor/filesystem` 8.1.2) maps `Cache` to `context.cacheDir`. That directory is app-private. It never appears in Downloads or file managers. The OS can clear it at any time.

The UI then reports success. Toasts state "Download ready" and "downloaded" or "exported as PDF". The success toast in the legacy path even shows the relative internal path (for example `exports/x.pdf`). The user searches Downloads. The file is not there. The file was never in a user-visible location.

CSV and other anchor-based exports are worse. They use browser `<a download>` semantics with no native branch. Inside the Capacitor WebView there is no download handler. Those exports likely produce no persistent file at all on Android.

No storage permission is missing. No permission is required for the current implementation. The defect is destination selection plus misleading feedback, not permission.

## User-Observed Behavior

- User taps Download on a PDF or generated file in the Android app.
- The operation appears to start and finish.
- No storage permission prompt appears.
- No save-location picker appears.
- No confirmation names a real location.
- The file does not appear in Downloads.
- The file does not appear in file browsing.
- The user cannot determine whether any file was created.

All points match the implementation. The app writes to private cache, reports "downloaded", and shows no real path.

## Download Architecture

Two PDF pipelines exist. They converge on the same destination.

Pipeline A (legacy, per-document pages):

- Entry: `downloadPdfFromElement` in `src/components/document-view/shared/downloadPdf.tsx`.
- Writer: `exportPdfToDevice` in `src/lib/native/pdfexport.ts`.
- Post step: `openExportedPdf`, fallback to `shareExportedPdf`.
- Feedback: `emitFeedback` (`download:start`, `download:success`, `download:fail`).
- Users: Waybill, RFQ, CSR, BOQ pages.

Pipeline B (new delivery pipeline):

- Generator: `DefaultPdfGenerator`.
- Delivery: `CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())`.
- Native writer: `NativePdfDelivery` in `src/lib/pdf/NativePdfDelivery.ts`.
- Feedback: `DefaultFeedbackBus` plus page-level toasts.
- Users: invoice (`generateInvoicePdf`), quotation (`generateQuotationPdf`), receipt (`ViewReceipt`).

CSV and miscellaneous exports form a third group:

- Mechanism: `URL.createObjectURL` plus `<a download>` click. No native branch.
- Users: invoice CSV, quotation CSV, RFQ CSV, blank CSR, blank waybill, project documents, item-library exports, `triggerFileDownload` in `src/utils/exportCompilers.ts`.

There is no centralized download service. PDF has two writers with identical destination logic. CSV has no native path at all.

## Document Generation Flow

PDF generation produces an in-memory `Blob`:

- Pipeline A builds the blob via `pdf(element).toBlob()` from `@react-pdf/renderer`.
- Pipeline B builds the blob inside `DefaultPdfGenerator.generate()`.
- CSV paths build `Blob` objects from strings.

Generation success does not equal download success. The code generally keeps them separate. The toasts blur the line. Invoice, quotation, waybill, CSR, BOQ, and RFQ handlers show "Download ready ... downloaded/exported" only after the delivery step returns. The wording still implies a Downloads-folder result.

Blob-to-storage conversion uses `FileReader.readAsDataURL` plus base64 slicing. Both PDF writers duplicate this helper (`toBase64FromBlob`, `toBase64`). Failure raises before any write. That part is sound.

Object URLs are revoked after 100 ms in web paths. No leak exists there. On native, `downloadBlobOnWeb` never runs.

## Android Download Flow

The Android path for every PDF is:

1. Build `Blob` in memory.
2. Convert to base64.
3. `Filesystem.mkdir({ path: '<sub>/…', directory: Directory.Cache, recursive: true })`. Errors are swallowed (folder may exist).
4. `Filesystem.writeFile({ path, directory: Directory.Cache, data, recursive: true })`.
5. `Filesystem.getUri({ path, directory: Directory.Cache })`.
6. Return `{ fileName, path, uri, sizeBytes }`.
7. Pipeline A opens the URI with File Opener, or shares it on failure. Pipeline B discards the URI and reports success.

The branch condition is `isNativePlatform()` (`Capacitor.isNativePlatform()`). Web uses anchor download. Android always takes the native cache-write path. No MIME-type branching exists. No platform-specific directory selection exists.

## Filesystem / Storage Destination

Exact destinations on Android:

| Pipeline | Directory | Subfolder | Example path | Visibility |
|---|---|---|---|---|
| Pipeline A (`exportPdfToDevice`) | `Directory.Cache` | `exports` default, or `waybill` | `waybill/WB-001.pdf` | App-private |
| Pipeline B (`NativePdfDelivery`) | `Directory.Cache` | `exports` | `exports/INV-001.pdf` | App-private |
| CSV / anchor exports | None (no write) | None | Memory only | No file |

CONFIRMED from installed plugin source (`node_modules/@capacitor/filesystem`, version 8.1.2, `LegacyFilesystemImplementation.kt:55`):

- `"CACHE"` returns `context.cacheDir`.

`cacheDir` is internal app-private storage. Other apps and file managers cannot see it. The system can delete it under storage pressure. Files generally survive app restart but without any guarantee.

No code path uses `Directory.Documents`, `Directory.ExternalStorage`, `Directory.Data`, or any public collection. The plugin default directory (`Environment.DIRECTORY_DOWNLOADS`) never applies because every call passes `Directory.Cache` explicitly.

## Android Storage Model

CONFIRMED from repository files:

- `minSdkVersion = 24`, `targetSdkVersion = 36`, `compileSdkVersion = 36` (`android/variables.gradle`).
- Manifest permissions: `INTERNET` and `USE_BIOMETRIC` only (`AndroidManifest.xml:62-63`). No `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, or `READ_MEDIA_*` entries.
- No `DownloadManager`, `MediaStore`, `RELATIVE_PATH`, or `DIRECTORY_DOWNLOADS` usage anywhere. `git grep` over `android/`, `capacitor.config.ts`, and `package.json` returns zero hits. `src` contains one unrelated comment in `exportCompilers.ts:220`.

Scoped storage applies at this target SDK. App-private directories need no permission. The implementation writes only to `cacheDir`. It therefore needs no storage permission. The absent permission prompt is correct behavior, not a defect.

A missing permission is NOT the root cause. Repository evidence rules it out.

## Downloads Visibility Analysis

The resulting files cannot appear in user-visible locations:

- Downloads app: no. Nothing registers with `DownloadManager` or `MediaStore`. Cache files are not indexed.
- Files / file manager: no. `cacheDir` is private to the app UID.
- Documents: no. The app never writes to a Documents collection.
- After app restart: usually present, but the OS may clear cache any time. Users must not rely on it.
- After device restart: usually present, same caveat.
- After cache cleanup (system or user): deleted.

The correct expectation: the user should NOT find these files through Downloads or file browsing. The current code gives the opposite impression.

## Share / File Opener Analysis

`@capacitor/share` (`^8.0.1` installed) and `@capacitor-community/file-opener` (`^8.0.0` installed) act as substitutes for persistence. They are not persistence.

Pipeline A behavior (`downloadPdf.tsx:30-40`):

- Tries `FileOpener.open({ filePath: uri, contentType: 'application/pdf', openWithDefault: true })`.
- On failure tries `Share.share({ files: [uri], ... })`.
- When both fail, the catch blocks swallow the errors with the comment "file is still saved".
- "Saved" means private cache. The user keeps no visible copy.

Pipeline B behavior:

- Invoice and quotation call `generateInvoicePdf` / `generateQuotationPdf`. These write to cache, discard the URI (only `filename` returns), and toast success.
- Receipt (`ViewReceipt.tsx:48-71`) writes to cache, emits to a fresh `DefaultFeedbackBus` with zero subscribers (no-op), and shows no success toast at all.

`exportAndPresentPdf` (`pdfexport.ts:139-157`) exposes `mode: 'share' | 'open' | 'save'`. Mode `'save'` performs no extra action beyond the cache write. A caller that selects `'save'` gets private-cache storage labeled as saved. No caller in `src` currently imports `exportAndPresentPdf` (CONFIRMED by grep; only `exportPdfToDevice`, `openExportedPdf`, `shareExportedPdf` are imported).

Opening or sharing a cache file proves nothing about Downloads persistence. A successful viewer launch can coexist with an invisible file.

## URI / Path Handling

For every native write:

- `Filesystem.getUri()` returns a `file://` URI under the app cache. The URI is returned to the caller.
- Pipeline A passes the URI to File Opener or Share. It never displays it. The success toast shows the relative internal `path` (for example `waybill/WB-001.pdf` via `native-feedback-reducer.ts:53`). That string resembles a user path but resolves to nothing outside the app.
- Pipeline B discards the URI entirely. `generatePdf` (`components/pdf/index.ts:112-123`) returns only `{ status: 'generated', filename }`. The URI dies in the delivery result.
- No path converts to a `content://` URI for the user. No path opens the system Downloads UI. No path copies the file to shared storage.

Write-succeeds-then-URI-discarded occurs in pipeline B on every invoice, quotation, and receipt download. CONFIRMED.

## MIME Type Analysis

MIME handling is consistent but thin:

- Conversion strips the data-URL prefix, so stored bytes are raw PDF. Extension comes from `sanitizeFileName`, which forces `.pdf`.
- File Opener receives `contentType: 'application/pdf'`. Correct.
- Share receives files without an explicit MIME type. The OS infers from extension. Acceptable.
- CSV blobs use `text/csv`. Filenames carry `.csv`. Correct for web.
- No incorrect MIME metadata was found. MIME does not explain invisibility.

Filenames are sanitized in both writers. No collision handling exists (same number overwrites silently). Minor issue, not the reported defect.

## Error Handling Analysis

Failure paths are mostly explicit, with three gaps:

1. `Filesystem.mkdir(...).catch(() => {})` swallows mkdir errors in both writers. Benign in practice (folder exists), but a full-disk mkdir failure would surface only at `writeFile`.
2. Pipeline A swallows File Opener AND Share failures silently. The success toast still fires. If the viewer fails, the user sees "downloaded" with no way to open the file.
3. The per-page toasts conflate outcomes. "Download ready / Invoice PDF downloaded" fires after a private-cache write. The statement is technically a write success but reads as a Downloads success.

No evidence of write-failure-then-false-success beyond gap 2. `NativePdfDelivery.deliver` returns `{ success: false }` on write errors, and both pipeline-B callers throw and toast failure. `downloadPdfFromElement` rethrows after emitting `download:fail`. Generation failures propagate to "Download failed" toasts.

CSV anchor paths have no error handling and no completion signal beyond the page toast. If the WebView drops the click, the toast still claims success (STRONG INFERENCE on WebView behavior; CONFIRMED that no fallback or check exists).

## Document-Type Consistency

| Surface | PDF mechanism | Native destination | Success feedback | URI used |
|---|---|---|---|---|
| Invoice | Pipeline B (`generateInvoicePdf`) | Cache | "Download ready / Invoice PDF downloaded" | Discarded |
| Quotation | Pipeline B (`generateQuotationPdf`) | Cache | "Download ready / Quotation PDF downloaded" | Discarded |
| Receipt | Pipeline B inline | Cache | None (silent, bus has no subscribers) | Discarded |
| Waybill | Pipeline A (`downloadPdfFromElement`, subdir `waybill`) | Cache | "Download ready / exported as PDF" + bus toast | Open/Share |
| RFQ | Pipeline A | Cache | "Download ready / exported as PDF" | Open/Share |
| CSR | Pipeline A | Cache | "Download ready / exported as PDF" | Open/Share |
| BOQ | Pipeline A | Cache | "Download ready / exported as PDF" | Open/Share |
| All CSV exports | Anchor `<a download>`, no native branch | None | "CSV downloaded / exported" | N/A (object URL, revoked) |

All PDF surfaces share the invisible-cache outcome. Feedback varies: receipt is silent, others over-claim. CSV surfaces likely persist nothing on Android.

## Root Cause

The defect has two layers. Both are CONFIRMED by code.

Primary (PDF): the app persists generated files only to app-private cache (`Directory.Cache` → `context.cacheDir`). No path writes to shared storage. No path registers with `DownloadManager` or `MediaStore`. The file exists but lives where the user can never browse. Success messaging then labels a cache write as a download.

Secondary (CSV and miscellaneous exports): browser anchor-download code runs unchanged inside the Capacitor WebView with no native persistence branch. Those taps likely create no file at all on Android.

Contributing defects:

- Pipeline B discards the returned URI, so even in-app open/share is impossible from those screens.
- `exportAndPresentPdf` mode `'save'` is a no-op label over a cache write.
- The success toast displays the internal relative path, which misleads the user into searching for it.
- Receipt downloads give zero feedback, so the user cannot tell success from failure.

"Missing storage permission" is explicitly excluded as a cause. The implementation requires none.

## Evidence

- `src/lib/native/pdfexport.ts:84-102`: `mkdir`, `writeFile`, `getUri` all use `Directory.Cache`.
- `src/lib/pdf/NativePdfDelivery.ts:24-26`: same `Directory.Cache` write and `getUri`.
- `node_modules/@capacitor/filesystem` 8.1.2, `LegacyFilesystemImplementation.kt:55`: `"CACHE" -> return c.cacheDir`.
- `src/components/document-view/shared/downloadPdf.tsx:30-45`: open-then-share fallback, swallowed errors, success toast with internal path.
- `src/components/pdf/index.ts:112-123`: URI discarded, only filename returned, bus emit without subscribers.
- `src/pages/ViewReceipt.tsx:48-71`: no success toast, bus emit is a no-op.
- `src/lib/native-feedback-reducer.ts:52-53`: success toast shows `fileName` plus internal `path`.
- `src/components/invoice/exportInvoiceCsv.ts:102-114`, `src/components/quotation/exportQuotationCsv.ts:86-94`, `src/utils/exportCompilers.ts:226-251`: anchor-only downloads, no `isNativePlatform` branch.
- `android/variables.gradle`: `targetSdkVersion = 36`, `minSdkVersion = 24`.
- `AndroidManifest.xml:62-63`: only `INTERNET`, `USE_BIOMETRIC`.
- Repo-wide grep: zero `DownloadManager`, `MediaStore`, `RELATIVE_PATH`, `DIRECTORY_DOWNLOADS`, or storage-permission references in code or native config.

## Why the User Cannot Find the File

Direct answer to the audit question:

- PDF taps: the file goes to `/data/data/com.bigdrops.app/cache/exports/...` (or the per-document subfolder). That area is invisible to Downloads and file managers. The OS may delete it. The user did nothing wrong. The toast text is wrong, not the user.
- CSV taps: most likely nowhere. The blob lives in WebView memory for ~100 ms, the anchor click has no native download handler, the object URL is revoked, and no fallback exists.

## Minimal Recommended Fix

Do not implement during this audit. The downstream agent should:

1. Centralize all native persistence in one utility. Remove the duplicated writer in `NativePdfDelivery` or route it through `exportPdfToDevice`.
2. Write user-facing downloads to a shared, indexed location appropriate for target SDK 36 and Filesystem 8.1.2 (for example `Directory.Documents` or the MediaStore-backed path the installed plugin version supports). Verify the exact public visibility of the chosen directory on a real device before shipping.
3. Keep cache writes only for temporary open/share previews. Never label them "downloaded".
4. Return and use the resulting URI everywhere. Wire invoice, quotation, and receipt screens to open/share from the URI.
5. Give CSV exports a native branch with the same utility. Stop relying on anchor clicks in the WebView.
6. Fix feedback: success toasts must name the real destination ("Saved to Documents") or offer Open and Share actions. Failure toasts must state what failed (generate, write, open).
7. Remove or implement `exportAndPresentPdf` mode `'save'`. A no-op save label must not ship.
8. Add filename collision handling (timestamp or counter) for repeated exports of the same document number.

## Recommended User Experience

After the fix, one tap should produce:

- Generate file → persist to a user-visible location → confirm with the real location → offer Open and Share.
- Success message example: "Invoice INV-001 saved to Documents." Actions: Open, Share.
- Failure message example: "Download failed: storage unavailable." No false success.
- Receipt downloads must give the same confirmation as every other surface.

## Regression Risks

- Moving from cache to shared storage changes cleanup semantics. Old cache files remain orphaned. Migrate or purge them once.
- Public-directory writes on new Android versions need MediaStore-compatible flows. Test on Android 10 through 16 behaviors, not just one device.
- `FileOpener` and `Share` need `content://` URIs via `FileProvider` for shared locations. Test open-after-save on a real device.
- Centralizing writers touches every document surface. Keep per-document filenames and subfolders stable to avoid user confusion.
- Large PDFs held as base64 strings use roughly 4/3 memory. Very large documents can pressure low-end devices. Stream or chunk if the plugin version supports it.

## Verification Plan

No build, typecheck, or lint ran in this audit. The downstream agent should verify on hardware:

1. Install the release build on a real Android device (target SDK 36).
2. Download one PDF per surface: invoice, quotation, receipt, waybill, CSR, BOQ, RFQ.
3. Confirm each file appears in the system Downloads or Files app under the documented location.
4. Confirm each file opens from the file manager after app restart and after device restart.
5. Export one CSV per surface. Confirm persistence and visibility.
6. Revoke nothing (no permission should be needed). Confirm no permission prompt appears and downloads still land visibly.
7. Force failure modes: full storage, removed directory, viewer app absent. Confirm honest failure toasts and no false success.
8. Confirm old cache-only behavior is gone: no new files under app cache after a "download".

## Files Inspected

- `src/lib/native/pdfexport.ts` (full file, 157 lines)
- `src/lib/pdf/NativePdfDelivery.ts` (full file, 32 lines)
- `src/lib/pdf/WebPdfDelivery.ts` (full file, 17 lines)
- `src/lib/pdf/CompositePdfDelivery.ts` (full file, 12 lines)
- `src/lib/pdf/DefaultFeedbackBus.ts`, `FeedbackBus.ts`, `PdfDelivery.ts`, `types.ts`
- `src/components/document-view/shared/downloadPdf.tsx` (full file, 53 lines)
- `src/components/pdf/index.ts` (generation plus delivery, lines 33-124)
- `src/components/document-view/invoice/invoicePdfActions.ts` (invoice path into pipeline B)
- `src/components/document-view/invoice/useInvoiceActions.ts` (toasts at lines 80-96, 153-157, 281-287)
- `src/domain/quotation/pdfDownloadHandler.ts` (quotation path into pipeline B)
- `src/pages/ViewReceipt.tsx` (silent receipt path, lines 48-71)
- `src/pages/ViewWaybill.tsx` (pipeline A call plus toast, lines 253-299)
- `src/pages/ViewRfq.tsx`, `src/pages/ViewCSR.tsx`, `src/pages/ViewBoq.tsx` (pipeline A call sites)
- `src/components/invoice/exportInvoiceCsv.ts`, `src/components/quotation/exportQuotationCsv.ts` (anchor-only CSV)
- `src/utils/exportCompilers.ts` (`triggerFileDownload`, lines 215-251)
- `src/lib/native-feedback-reducer.ts`, `src/lib/native-feedback-event-bus.ts` (toast content)
- `src/lib/native/capacitor.ts` (platform branch helper)
- `capacitor.config.ts`, `package.json`, `android/variables.gradle`, `android/app/src/main/AndroidManifest.xml`
- `node_modules/@capacitor/filesystem` 8.1.2 plugin source (directory mapping confirmation)

## Task Compliance

- Objective: Trace Android download behavior end to end and name the root cause. Complete.
- Scope: Entry points, generation, filesystem writes, storage model, visibility, share/open, URIs, MIME, errors, per-type consistency. No code changes.
- Files changed: One new report. Zero source files changed.
- Changes made: None to application code, schema, config, dependencies, or Android files.
- Verification result: Baseline `git status` showed only the prior audit report as untracked. Post-report status check is pending in the closing step. No build, typecheck, or lint ran per the audit gate.
- Risks or limitations: WebView anchor-click behavior is classified as strong inference. It needs device confirmation. Exact public-directory semantics must be re-verified on hardware for target SDK 36.
- Deferred work: Minimal fix is documented only. Implementation belongs to a downstream task.

## Conclusion

The file goes to app-private cache, or nowhere at all.

PDFs land in `cacheDir` under `exports/`. The user cannot browse there. CSVs likely never leave memory. Toasts claim downloads either way.

Write user-facing files to user-visible storage through one shared utility. Show the real location. Offer Open and Share. Then confirm on a real device that Downloads shows what the app promises.
