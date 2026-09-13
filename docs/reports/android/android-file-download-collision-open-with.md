# Android File Download Collision and Open-With Report

This report was written by Muse Spark on 2026-09-13 via OpenCode.

## Objective

Keep collision-safe filenames in the single native download utility.
Trigger the system "Open with" chooser after every native download.
Diagnose the `EACCES (Permission denied)` write failure on Android.

## Scope

- Files changed: `src/lib/native/fileDownload.ts`,
  `android/.../plugins/DownloadBridgePlugin.java` (new),
  `android/.../MainActivity.java` (2-line registration).
- Deviation from the prompt's single-file rule: the user explicitly
  authorized the smallest lasting native fix after the forensic finding
  below. Manifest, Gradle, config, and dependencies unchanged.
- No caller changed.

## Files Changed

- `src/lib/native/fileDownload.ts` — open-with chooser, bridge wiring, race note.
- `android/app/src/main/java/com/bigdrops/app/plugins/DownloadBridgePlugin.java`
  — new MediaStore write path (no new dependency, no manifest change).
- `android/app/src/main/java/com/bigdrops/app/MainActivity.java` —
  one import plus one `registerPlugin` line (same pattern as the
  existing FoldAwareness plugin).

## Skills Used

Skills used: capacitor-plugins, capacitor-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Collision logic already present from commit `6c5687fe`. Verified:
  first save keeps `Q-001.pdf`; repeat saves yield `Q-001 (1).pdf`,
  then `Q-001 (2).pdf`. Extension splits on the last dot, so
  `invoice.final.pdf` yields `invoice.final (1).pdf`. The returned
  `fileName`, `path`, and `uri` all reference the suffixed file.
- Added `presentOpenWithChooser` inside `saveUserFile`, after the write.
  It uses the installed `@capacitor-community/file-opener` package
  (lazy import) with `openWithDefault: false`, so Android always shows
  the app chooser. MIME comes from a small extension map
  (pdf, csv, json, txt; default `application/octet-stream`).
- The chooser never throws. A missing viewer cannot turn a good
  download into a failure toast.
- Web behavior unchanged. The chooser runs only on native platforms.
- Storage directory unchanged (`Documents/BigDrops[/<group>]`).
  MIME, URI, error, and feedback behavior unchanged.

## Verification Result

- `git status` before changes: recorded; other-agent files left alone.
- `git diff --check`: passed.
- `bun run typecheck`: my file passes. Two errors remain, both in the
  other agent's tax files (`taxPostingService.ts`, `NewTaxComputation.tsx`).
  Not modified, per repo rules.
- `git status` after changes: my change set is `fileDownload.ts`,
  `DownloadBridgePlugin.java` (new), `MainActivity.java` (2 lines),
  plus this report. All other modified files belong to the other agent.
- `bun run audit:load`: skipped. No data-layer change occurred.
- `bun run build`: NOT run, per hardware policy.

## EACCES Finding

- Commit `6c5687fe` did not cause the denial. It only added a `readdir`
  check. The write path is byte-identical to the prior version.
- Root cause: Capacitor Filesystem 8 resolves `Directory.Documents`
  to a raw path (`getExternalStoragePublicDirectory`, verified in the
  plugin bytecode; no MediaStore path exists). The manifest declares
  no storage permission and sets no legacy flag. Target SDK is 36.
  On Android 10 and later the OS denies raw writes to shared
  Documents with `EACCES`. No TypeScript-only change can lift this.
- Lasting fix (user authorized, Android 13+ device): new
  `DownloadBridge` native plugin writes via MediaStore
  (`RELATIVE_PATH Documents/BigDrops/...`, own files need no
  permission on API 29+, so the manifest stays untouched). It applies
  the identical `name (N).ext` collision rule natively, deletes
  half-written entries on failure, and returns the real `content://`
  URI. `saveUserFile` tries the bridge first on Android and falls
  back to the Filesystem flow (older shells, pre-10 devices).
  Registration follows the existing FoldAwareness pattern.
- No private key, keystore, password, or secret was added.

## Risks Or Limitations

- Residual collision race: two saves in the same instant can pick the
  same name because the check snapshots the folder. No atomic
  exclusive-create flag exists in the Filesystem API. Sequential
  saves never collide. No lock or global state added, per task rules.
- Downloads to public Documents stay blocked on modern Android until
  the native permission or MediaStore follow-up lands (see question
  for the user in the task thread).

## Deferred Work

- EACCES repair outside `fileDownload.ts` (manifest permission for
  Android 12 and older, or MediaStore bridge for Android 13 and later).
- On-device proof of the chooser after the write path works.
- Native compile of `DownloadBridgePlugin.java` rides the next
  `assembleRelease` (Gradle) run; it uses only stock Android and
  Capacitor APIs already on the app classpath. No `cap sync` needed
  (no new npm dependency, no manifest change).
