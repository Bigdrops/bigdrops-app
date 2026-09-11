# Android Download Persistence Fix Report

This report was written by Muse Spark on 2026-09-11 via OpenCode.

Skills used: capacitor-best-practices, capacitor-plugins, debugging-capacitor, webapp-to-capacitor, capacitor-security, capacitor-performance, capacitor-offline-first, capacitor-push-notifications, framework-to-capacitor, safe-area-handling, tailwind-capacitor, ios-android-logs, mobile-android-design
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Fix the confirmed defect: Android downloads persisted to app-private cache or nowhere. A Download tap must now produce a durable file in user-visible storage. Success feedback must reflect real persistence.

## Scope

Download and export persistence paths only. PDF generation, rendering, business logic, data layer, permissions, and manifest remain unchanged.

## Storage Decision

The canonical destination is `Directory.Documents` under a `BigDrops/` root folder. Evidence from the installed plugin:

- README (`@capacitor/filesystem` 8.1.2): `Documents` on Android is the public Documents folder, accessible from other apps. On Android 11 and newer the app accesses files it created. No permission is required on Android 10 and older excluded; permissions apply only there.
- Plugin source (`FilesystemPlugin.kt:404-411`): no runtime storage permission is requested on SDK 33 and newer. Target SDK is 36.
- Plugin source (`LegacyFilesystemImplementation.kt:46-58`): `DOCUMENTS` is classified public and maps to the shared Documents directory.
- `writeFile` media-scans external writes (`FilesystemPlugin.kt:115-120`), so saved files get indexed for file managers.

No `Directory.Documents` hard-coding was done blindly. Cache, Data, External, and ExternalStorage were all ruled out against the same sources. No MediaStore or DownloadManager code was needed. No permission was added.

## Files Changed

New file:

- `src/lib/native/fileDownload.ts` — canonical persistence utility.

Modified files (26):

- `src/lib/native/pdfexport.ts` — native PDF branch uses the canonical utility.
- `src/lib/pdf/NativePdfDelivery.ts` — duplicate Cache writer removed, uses the canonical utility.
- `src/components/pdf/index.ts` — generation result now carries the persisted URI.
- `src/components/document-view/shared/downloadPdf.tsx` — success event reports the real location.
- `src/lib/native-feedback-event-bus.ts` — success payload gains optional `location`.
- `src/lib/native-feedback-reducer.ts` — toast shows "Saved to Documents" instead of an internal path.
- `src/components/document-view/invoice/useInvoiceActions.ts` — truthful toasts, awaited CSV with failure path.
- `src/pages/view-invoice-actions.ts` — CSV entry is async and awaited.
- `src/components/invoice/exportInvoiceCsv.ts` — native branch added.
- `src/domain/quotation/pdfDownloadHandler.ts` — truthful toast.
- `src/pages/view-quotation-actions.ts` — CSV entry is async and awaited.
- `src/components/quotation/exportQuotationCsv.ts` — native branch added.
- `src/hooks/useQuotationActions.ts` — awaited CSV with failure path.
- `src/pages/ViewWaybill.tsx`, `src/pages/ViewRfq.tsx`, `src/pages/ViewCSR.tsx`, `src/pages/ViewBoq.tsx` — truthful toasts.
- `src/pages/ViewRfq.tsx` — RFQ CSV uses the canonical utility with failure feedback.
- `src/pages/CsrFormPage.tsx` — blank CSR and post-save export persist natively.
- `src/pages/ProjectDocumentView.tsx`, `src/components/project/ProjectDocumentCard.tsx` — native persistence with truthful feedback.
- `src/components/waybill/blankWaybillTemplate.tsx` — native persistence.
- `src/pages/WaybillFormPage.tsx` — truthful toast.
- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx` — JSON export persists natively.
- `src/utils/exportCompilers.ts` — `triggerFileDownload` is async with a native branch.
- `src/components/export/ContextualExportDropdown.tsx` — awaits exports.
- `src/pages/ViewReceipt.tsx` — success and failure feedback added (was silent).

Unchanged by design: `AndroidManifest.xml`, `capacitor.config.ts`, `package.json`, PDF renderers, Supabase code.

## Changes Made

- Created one canonical utility with three functions: `saveUserFile`, `downloadTextFile`, `downloadBlobFile`. Web behavior is unchanged (browser anchor download).
- Routed both PDF writers through `saveUserFile`. No `Directory.Cache` remains in any user-download path (verified by grep).
- Propagated the persisted URI: `ExportedPdfFile` keeps it for Open/Share; `PdfGenerationResult` now carries it.
- `exportAndPresentPdf` mode `'save'` is now honest with no code change: it flows through the fixed writer.
- Gave every CSV, JSON, and blob export site a native branch. Callers await persistence before reporting success.
- Made failure paths honest: write failure throws, callers show failure toasts, Open/Share failures stay separate from persistence success.
- Fixed the silent receipt download: it now confirms or reports failure like other surfaces.

## Verification Result

- `bun run typecheck`: passed.
- `bun run audit:load`: not required. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy.
- `git status`: 26 modified files, all inside download/export scope, plus 1 new utility file. No manifest, config, dependency, or schema changes.
- Grep confirms zero `Directory.Cache` references remain in `src`.
- Hardware validation on a real device remains a separate human step.

## Risks or Limitations

- Devices on Android 10 and older may need a storage permission the app does not declare. Writes there fail with an honest error toast. Modern devices need no permission.
- Old cache files stay orphaned. Migration was out of scope.
- Same-number re-exports overwrite silently. Collision handling was out of scope.
- Base64 conversion holds large files in memory. Streaming was out of scope.
- WebView anchor-click behavior on old devices still needs hardware confirmation.

## Deferred Work

- Old-cache purge or migration.
- Filename collision handling.
- Large-file streaming.
- Hardware validation per the audit verification plan.
