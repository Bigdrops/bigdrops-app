# Bolu Chat Export Android Fix Report

This report was written by Saffron on 2026-11-22 via Perch Desktop.

## Objective

Fix Markdown and JSON chat transcript export inside the Android Capacitor WebView. Keep the web path working and keep the existing export menu unchanged.

## Scope

In scope: export delivery logic, canonical native file helper MIME support, workspace callbacks, and focused tests.

Out of scope: transcript formatting, menu component, database, and native plugin changes.

## Files changed

- `src/lib/ai-assistant/bolu-export.ts`
- `src/lib/native/fileDownload.ts`
- `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`
- `src/tests/ai-assistant/bolu-operational-remediation.test.ts`
- `docs/reports/ai-BOLU/2026-11-22-bolu-chat-export-android-fix.md`

## Skills used

Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

First-class repository guidance consulted: `modern-web-guidance`, `bigdrops-free`, `kinetics`, `water-melon`. No guide applied to this delivery-path change.

## Root cause

`bolu-export.ts` created a Blob URL and clicked a synthetic `<a download>` element. Browsers accept this pattern. The Android Capacitor WebView does not route it to the Android Downloads manager. The click produced no visible file and no error, so export failed silently on Android.

## Changes made

1. Both export functions now call `downloadTextFile` from `src/lib/native/fileDownload.ts`.
2. On web, `downloadTextFile` keeps the original Blob URL download.
3. On native Android, `downloadTextFile` persists the file to `Documents/BigDrops/chat-exports`. It uses the existing MediaStore bridge first and the Capacitor Filesystem path as fallback. It then offers an Open-with chooser.
4. Added the `text/markdown` MIME type to the native opener map. JSON already had `application/json`.
5. Workspace export callbacks now show a success or failure toast. Native save failures are no longer silent.
6. Updated the export test to verify both file names and content through the web download path.

## Verification result

Verification:
- `bun run audit:load`: passed with pre-existing warnings
- `bun run typecheck`: passed
- `bun test src/tests/ai-assistant/`: 701 pass, 0 fail
- `bun run test`: failed on 5 pre-existing critical tests outside this task (changelog SHA, experiment CSS scope, document share upload order)
- `bun run build`: skipped due to hardware policy
- `supabase db push`: not applicable

## Supabase push status

Not applicable. No SQL or database files changed.

## Risks or limitations

- Android device verification was not performed. Confirm that both files appear under `Documents/BigDrops/chat-exports` on a handset.
- The native path opens the system chooser after saving. A device with no viewer still keeps the saved file.
- Concurrent agents changed other files during this task. Those changes were not modified or reverted.

## Deferred work

- Device test for Markdown and JSON export.
- Optional Share sheet action for transcripts if product requires it.
