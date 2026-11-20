# Production Promotion: Polished BOUXRE Update Dialog, Real App Logo, Faster Liquid Wave & Native APK Completion

**Date:** 2026-11-19
**Task type:** Authorized Production Implementation
**Status:** Completed

---

## 1. Scope

Promote the approved Design Lab "Android Update Experience" prototype into the
production update UI, apply the two operator-approved visual refinements (real
BOUXRE app logo, faster liquid corner wave), and audit/complete the native
Android APK download completion, install and cancellation pipeline.

Nothing was staged, committed, pushed, tagged, released, deployed or built.

---

## 2. Concurrent-workspace audit (mandatory step 1)

The workspace is shared and moved several times during this work.

- HEAD at task start: `97341863`. HEAD during verification: `f211f430` (a
  concurrent agent committed unrelated work).
- Task-scoped `git status --porcelain` at audit time showed `ApkUpdatePlugin.java`
  and `strings.xml` staged, `ChangelogTimeline.tsx` and `DownloadProgress.tsx`
  unstaged, and `useAppUpdate.ts`, `apkUpdate.ts`, `UpdateGate.tsx`,
  `UpdateModal.tsx` clean.
- The staged `ApkUpdatePlugin.java` and `strings.xml` diffs were **brand-spelling
  only**: `BOURXE` → `BOUXRE` in comments and the "Install unknown apps"
  rejection message. Those corrections were preserved, not regressed.
- No unrelated file was touched by this task. `.github/workflows/*`, Bolu
  assistant files, `WhatsNew.tsx`, `releaseDiscovery.ts` and Supabase files were
  left alone.

---

## 3. Files changed

### New

| File | Purpose |
| --- | --- |
| `src/components/app/update/UpdateDialogCard.tsx` | The approved Design Lab composition rebuilt against the real `useAppUpdate` result. Shared by the dialog and the gate. |
| `src/components/app/update/update-dialog-card.css` | Card styling, amber wave, viewport tiers. |
| `src/components/app/update/updateDialogModel.ts` | Pure helpers: countdown, speed sampling, percentage, labels, notes summary. |
| `src/domain/appUpdate/downloadSpeed.ts` | Pure byte-sample speed measurement, extracted from the hook to stay within the line-count ceiling. |
| `src/tests/critical/productionUpdateDialog.test.js` | 11 tests over the production card, model and surfaces. |

### Modified

| File | Change |
| --- | --- |
| `src/components/app/UpdateModal.tsx` | Now renders the shared card inside the dialog shell. Dismiss closes the dialog only; it never cancels the download. |
| `src/components/app/UpdateGate.tsx` | Now renders the shared card in `gate` variant, with no dismiss control. |
| `src/hooks/useAppUpdate.ts` | Listens for the native completion event, tracks real transfer speed, resets cleanly on cancel. |
| `src/lib/native/apkUpdate.ts` | Adds `ApkDownloadCompletedEvent` and `onApkDownloadCompleted`. |
| `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java` | Single idempotent terminal path shared by the broadcast receiver and the progress poller; clean cancel settlement. |
| `src/tests/critical/productionUpdateDialog.test.js` | Updated the responsive assertions after the tier fix (see §6). |

---

## 4. Visual refinements

**Real app logo.** The synthetic `BX` monogram is gone. The header tile renders
`/favicon.svg` — the repository's authentic BOUXRE ribbon, which per its own
header comment is derived from the 1254×1254 master icon and must not be
hand-drawn — at `clamp(48px, 6vw, 56px)` with `alt="BOUXRE"`, an opaque
theme-aware surface, a hairline border and a soft shadow.

**Faster liquid wave.** Two layered organic paths oscillate asynchronously on
GPU-composited transforms: body `4.4s`, crest `3.4s`, both `cubic-bezier`
`infinite alternate`. The 132px height cap is retained, the wave sits at
`z-index: 0` beneath the 44px dismiss control at `z-index: 2`, and
`@media (prefers-reduced-motion: reduce)` freezes both layers.

---

## 5. Production data only

The card renders only what the hook or the validated policy supplies. There is no
sample release, no invented deadline, no guessed transfer size and no fabricated
speed.

- **Countdown** ticks every second from the real `graceDeadlineMs` in
  `{d}d {h}h {m}m {s}s`. When it expires, or when `mandatory` is true, it shows
  "Grace period ended" / "Update required to keep using BOUXRE" and the dismiss
  control disappears.
- **Idle** shows "Android package" with no byte figure when `totalBytes` is
  unknown.
- **Downloading** shows a guarded percentage (only when `totalBytes > 0`),
  `"{downloaded} MB of {total} MB"`, and a speed sampled from two real byte
  readings at least 300ms apart, "Calculating…" until that pair exists.
- **Complete** shows "Download complete", "100%", "Ready to install BOUXRE
  v{versionName}" and the "Open & Install Update" primary action.
- **Release notes** collapse to the first parsed `ChangelogEntry.title` and expand
  to the real `<ChangelogTimeline variant="compact" />`.
- All user-facing copy spells **BOUXRE**.

---

## 6. Defects found and fixed during verification

1. **Duplicate helper definitions in `useAppUpdate.ts`.** An interrupted edit left
   both the new import and the old local `ByteSample` / `SPEED_SAMPLE_MIN_MS` /
   `sampleDownloadSpeed` definitions. Removed the locals; the hook now imports
   from `src/domain/appUpdate/downloadSpeed.ts` and re-exports for compatibility.
   A follow-on off-by-one in the line removal clipped the opening `/**` of the
   next doc comment, which was restored.
2. **`useAppUpdate.ts` over the 600-line audit ceiling** (623 lines). Extracting
   the pure speed helpers to the domain module and tightening comments brought it
   to 599. `audit:load` is now clean for every file in this task.
3. **Responsive tiers were dead code.** The card's tiers were container queries
   starting at 600px, but the dialog was capped at `sm:max-w-[480px]` — so the
   container never reached 600px and Fold Open, Tablet and Desktop all rendered
   the phone composition. The 768px and 1024px tiers could never fire. Fixed by
   widening the dialog (`sm:max-w-[34rem] lg:max-w-[40rem]`) and converting the
   tiers to viewport media queries, which is what the four-class standard
   actually describes. Verified by measurement at each width (§7).
4. **Test asserted the old container-query form.** Updated the responsive
   assertions to the media-query form so the test tracks the real mechanism.

The dark-mode rendering initially appeared broken in the verification harness.
That was a harness artifact, not a product defect: the dialog portals outside the
React tree, and the app toggles `.dark` on the document root
(`AppShell.tsx:194`). Once the harness matched that, dark mode rendered correctly.

---

## 7. Verification

**Typecheck.** `bun run typecheck` exit 0 (run 3×, including a final run after all
edits).

**Targeted tests.** 81/81 via
`node --experimental-loader ./src/tests/resolve-alias.js --test` over
`androidUpdatePreview.test.js`, `productionUpdateDialog.test.js`,
`designLab.test.js`, `designLabViewports.test.js`,
`appUpdateDownloadFailure.test.js`, `appUpdateStateMachine.test.js`.
`bun run test` still crashes this 4GB host with `Internal CLR error
(0x80131506)`; suites were run individually instead.

**Audit.** `bun run audit:load` reports no flag on any file in this task.

**Four viewport classes.** Measured in the running app with fixed-width frames,
which give each frame a genuine viewport for media-query evaluation:

| Class | Width | Card | Radius | Title | Countdown | Overflow | Button |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile / Fold closed | 390 | 358px | 26px | 22px | 24px | none | 50px |
| Fold open | 717 | 544px | 28px | 22px | 24px | none | 50px |
| Tablet | 820 | 544px | 28px | 24px | 28px | none | 50px |
| Desktop | 1280 | 496px | 30px | 26px | 30px | none | 50px |

All four tiers now produce distinct composition rather than one stretched layout,
with no horizontal overflow and 50px touch targets throughout.

**States inspected.** Idle, downloading, download complete, installing, failed,
expired, gate variant, release notes expanded and collapsed, in both light and
dark. Expired correctly drops the dismiss control. Expanded notes scroll inside
their panel (176px, scrollable) with the primary action still visible.

**Native pipeline.** `ApkUpdatePlugin.java` now has one idempotent terminal path
(`handleTerminalStatus`) shared by the `ACTION_DOWNLOAD_COMPLETE` receiver and the
progress poller, guarded by `terminalHandledId` so a finished transfer is settled
exactly once. `STATUS_SUCCESSFUL` builds the `FileProvider` content URI, emits
`apkDownloadCompleted`, resolves the pending `PluginCall` and calls
`autoInstall` (idempotent per URI via `lastLaunchedInstallUri`). `STATUS_FAILED`
deletes the partial file, clears the record and rejects with the
`COLUMN_REASON` detail when present. `cancelDownload()` unregisters the receiver,
rejects the pending call so the JS `await` cannot hang, and clears all terminal
state. `Context.RECEIVER_EXPORTED` is guarded by
`Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU`.

**Not verified.** The native pipeline was verified by source inspection only. No
Android build, device or emulator run was performed here — `bun run build` is
prohibited on this host and no device was attached. The Java changes compile
under the project's existing toolchain assumptions but were not compiled in this
session.

---

## 8. Boundaries respected

- Production updater and native files were edited only where this task required
  it; no unrelated file was touched.
- Legacy identifiers preserved: `com.bigdrops.app`, `BIGDROPS-test-release-`,
  `bigdrops-latest.apk`, `bigdrops.*` storage keys.
- Claude's `frontend-design` skill was not loaded, invoked or referenced.
- `bun run build` and `bun run lint` were not run.
- Nothing was staged, committed, pushed, reset or cleaned.
- The temporary verification harness (`update-card-verify.html`,
  `src/__verify/`) was deleted and the dev server stopped.
