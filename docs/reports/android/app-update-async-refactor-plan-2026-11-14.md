# Android Update Flow: Audit and Asynchronous Refactor Plan

Date: 2026-11-14
Scope: Android APK download/install bridge, update orchestration hook, Settings App Version surface, update modal.
No database change. No financial logic change. No schema change.

## 1. Audit result

### 1.1 The reported crash

Reported: `Could not enqueue download: Invalid value for visibility: 2`.

Findings, in order of importance:

1. **The constant at value 2 is `VISIBILITY_HIDDEN`, not `VISIBILITY_VISIBLE_NOTIFY_ONLY_COMPLETION`.**
   `DownloadManager.Request` values are `VISIBILITY_VISIBLE` = 0,
   `VISIBILITY_VISIBLE_NOTIFY_COMPLETED` = 1, `VISIBILITY_HIDDEN` = 2.
   `DownloadManager` rejects value 2 when the caller lacks
   `android.permission.DOWNLOAD_WITHOUT_NOTIFICATION` and throws exactly
   `IllegalArgumentException("Invalid value for visibility: 2")`.
   The failure message therefore proves the installed build used
   `VISIBILITY_HIDDEN`, not the "notify only on completion" value.

2. **Current source no longer uses value 2.**
   `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java`
   line 195 sets `VISIBILITY_VISIBLE_NOTIFY_COMPLETED` (value 1). This was
   changed on 2026-11-09
   (`docs/reports/android/android-update-download-visibility-fix-and-design-lab-2026-11-09.md`).

3. **The screenshot is from the old binary.** The Settings card reports
   `1.0.27 (1027)`. The Java fix only exists in a newer APK, so the crash is
   reproducible on every device still on 1027. The defect is a release
   problem, not an open source defect.

4. **`DOWNLOAD_WITHOUT_NOTIFICATION` is absent from the manifest.**
   `android/app/src/main/AndroidManifest.xml` declares only `INTERNET`,
   `USE_BIOMETRIC`, `REQUEST_INSTALL_PACKAGES`. Declaring the permission is
   still worth doing, as defence against a regression back to value 2 and as
   an explicit statement of the download contract. It is not the fix that
   makes the current source work.

5. **Failure text still leaks into the UI from legacy builds.** The current
   screenshot shows the raw Java message inside the modal. The TypeScript
   sanitiser exists (`src/domain/appUpdate/downloadFailure.ts`) but the
   screenshot predates it or the classifier keyword list missed the message.
   The classifier does match `visibility`, so the sanitiser is present in the
   build under test; treat this as another symptom of the stale APK.

6. **Latent second failure, not yet observed.** The plugin downloads to
   `getExternalCacheDir()/updates/` through `DownloadManager.setDestinationUri`.
   The Downloads provider writes with its own UID, and app-scoped external
   cache is private to `com.bigdrops.app`. On Android 10+ this commonly
   enqueues and then fails at `STATUS_FAILED` with a destination write error.
   This must be verified on device before the flow is called working.
   Also note the documentation drift: `src/lib/native/apkUpdate.ts` states
   "Download runs natively (HttpURLConnection)", but the implementation uses
   `DownloadManager`.

7. **`release_notes` is one plain text field**
   (`supabase/migrations/20260914120000_app_release_policy.sql`). There is no
   structured changelog. The timeline must be derived from that text, or the
   policy contract must gain structure. Section 4 uses a pure parser so no
   schema change is required now.

### 1.2 Why the current flow cannot be "background-capable"

- Download state lives only in React memory: `downloadedFileRef` and
  `downloadPhase` in `src/hooks/useAppUpdate.ts`.
- The completion `BroadcastReceiver` in
  `ApkUpdatePlugin.registerCompletionReceiver()` is registered on a plugin
  instance. If Android kills the process during a long background download,
  the receiver is gone. The download finishes at OS level, but no code learns
  about it. On relaunch the file sits in cache, `downloadedFileRef` is null,
  and the user must download again.
- `downloadApkNative()` returns a promise that never settles in that case, so
  the UI can stay in `downloading` forever with no error.
- Install is manual: the completion receiver only resolves the call, and the
  UI sets `downloaded`. `installApk()` runs on a user tap.
- `cancelDownload()` is the only cancel path, and it is explicit. Dismissing
  the sheet does not cancel. This part of the current design is already
  correct and must be preserved deliberately.

### 1.3 Redundant update surfaces in the current UI

| Surface | File | Behaviour |
| --- | --- | --- |
| Top banner | `src/components/app/UpdateBanner.tsx`, mounted in `src/App.tsx` lines 559-562 | Sticky, dismissible, opens `UpdateSheet` |
| Dashboard card | `src/components/dashboard/PaymentReminderBanner.tsx`, `android-update` branch | "Smart banner", navigates to `/settings?section=app-update` |
| Settings card | `src/pages/settings/AppUpdateSettingsSection.tsx` | Version + Status rows, outline "Check for updates" |
| Modal | `src/components/app/UpdateSheet.tsx` | Grey all-caps grace block, second "Download on Web" button |

Three of these say the same thing at the same time. `BoluProviderSettingsSection.tsx`
is unrelated (AI provider configuration); the App Version surface is
`AppUpdateSettingsSection.tsx`.

Two concrete display defects in that file:

- `targetLabel` is built from `policy.versionCode` only, so the UI reads
  `(v1028)` while the release is `1.0.28`. Use `formatVersionLabel()`.
- Grace wording duplicates the countdown in three places (banner, settings
  status, modal block).

## 2. Phase 1: Manifest and native download

### Step 1.1 Declare the download permission

File: `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />
```

Place it after `INTERNET`. This permission is normal-level, grants no runtime
prompt, and is not shown in the Play listing as sensitive.

### Step 1.2 Make the visibility choice explicit and self-defending

File: `ApkUpdatePlugin.java`, `downloadApk()`

- Keep `VISIBILITY_VISIBLE_NOTIFY_COMPLETED` (1). It needs no permission and
  gives the user a real notification, which the background flow wants.
- Remove the stale comment that calls value 2 `VISIBILITY_HIDDEN`.
  `VISIBILITY_HIDDEN` is deprecated and offers nothing here.
- Add a bounded diagnostic before `enqueue`:
  `Log.i(DIAGNOSTIC_TAG, "enqueue visibility=" + VISIBILITY_VISIBLE_NOTIFY_COMPLETED + " dest=" + destination.getName())`.
  Do not log the URL (it is a signed asset URL).

### Step 1.3 Verify the destination is writable by DownloadManager

Do this on device before any UI work is called complete.

1. Build and install the new APK.
2. Tap install, then watch
   `adb logcat -s BIGDROPS/Update DownloadManager`.
3. Success looks like `STATUS_RUNNING` and a growing
   `COLUMN_BYTES_DOWNLOADED_SO_FAR`.
4. If `STATUS_FAILED` with a destination or permission error, switch the
   transport to the plugin's own stream (which `apkUpdate.ts` already
   documents): `HttpURLConnection` into `getFilesDir()/updates/`, emitting
   real byte counts. That path removes `DOWNLOAD_WITHOUT_NOTIFICATION` and
   the download-notification question entirely, and keeps the app's own
   foreground service optional.

Decision point: do not change transport speculatively. The measured result
decides.

## 3. Phase 2: Durable, background-capable download state

### Step 2.1 Persist one download record natively

File: `ApkUpdatePlugin.java`

Add a small persisted record (`SharedPreferences`, name `bd_update_download`):

```
downloadId: long
versionCode: int
fileName: String
startedAtMs: long
expectedBytes: long
```

Write it in `downloadApk()` immediately after `enqueue` succeeds. Clear it in
`deleteDownload()`, `cancelDownload()`, and after a successful install.

### Step 2.2 Restore on plugin load

Add `@Override public void load()`:

1. Read the record. If none, stop.
2. Query `DownloadManager` by id.
3. `STATUS_SUCCESSFUL` → build the FileProvider URI, mark the record
   `completed`, and (see Step 4.3) fire or queue auto-install.
4. `STATUS_RUNNING` / `STATUS_PENDING` → restart progress polling and
   re-register the completion receiver.
5. `STATUS_FAILED` → delete the partial file and drop the record.

Expose it to TypeScript as `getDownloadState()` returning
`{ state: 'none' | 'downloading' | 'downloaded' | 'failed', fileName?, uri?, downloadedBytes?, totalBytes?, versionCode? }`,
plus a `getDownloadState` entry in `src/lib/native/apkUpdate.ts`.

### Step 2.3 Add a status query the UI can trust

Add `getDownloadStatus()` to the plugin and a matching TypeScript wrapper.
The hook uses it for two things:

- Poll after `onResume` when `downloadPhase` is `downloading`, so a lost
  bridge promise becomes `downloaded` or `failed` instead of hanging.
- Retry budget: if three consecutive queries return no row, set
  `failed` with the safe copy and clear the native record.

### Step 2.4 Rehydrate the hook on mount

File: `src/hooks/useAppUpdate.ts`

- After the initial check settles, call `getDownloadState()` once on Android.
- Map `downloading` to `{ kind: 'downloading', downloadedBytes, totalBytes }`,
  `downloaded` to `{ kind: 'downloaded', fileName, uri }`.
- `installDownloadedApk()` should read from the persisted record via the
  plugin instead of `downloadedFileRef` only. Keep the ref as a fast path.

### Step 2.5 Keep cancellation explicit and single

- `cancelDownload()` continues to be the only cancel path, and it must now
  also clear the persisted record and delete the partial file.
- `UpdateSheet.onOpenChange` / `UpdateModal` dismissal must never call
  `cancelInAppDownload`. Add a comment at that call site so a later pass does
  not "helpfully" add it.
- Known limitation to leave alone: one download slot at a time. The TS layer
  already guards duplicates.

## 4. Phase 3: Settings surface cleanup

File: `src/pages/settings/AppUpdateSettingsSection.tsx`

### Step 3.1 Replace the card body with one two-column data row

Remove the two stacked `SettingsSummaryRow` entries (`Version`, `Status`).
The card header stays (`SettingsSummaryCard` title "App Version").

```tsx
<SettingsSummaryCard title="App Version" description="Current installation and update status">
  <div className="grid grid-cols-2 divide-x divide-[hsl(var(--bd-border)/0.3)]">
    <div className="px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Current</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums text-bd-text">
        {version?.versionName ?? '—'}
        <span className="ml-1.5 text-xs font-medium text-bd-text-muted">({version?.versionCode ?? '—'})</span>
      </p>
    </div>
    <div className="px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Available</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums text-bd-text">
        {target ? formatVersionLabel(target.versionName, target.versionCode) : '—'}
      </p>
    </div>
  </div>
</SettingsSummaryCard>
```

Rules for the Available cell:

- `up_to_date` → "None", muted.
- `unavailable` → "Not checked", muted, plus the existing "Retry" affordance.
- `available` / `grace` / `blocked` → the target label, foreground text.
- No warning icon, no amber text, no secondary countdown sentence. The
  deadline moves into the modal as one quiet meta line.

### Step 3.2 One primary action, one quiet secondary

| State | Action |
| --- | --- |
| Update pending | Solid `Button` (default variant) full width: `Install v1.0.28` with `Download` icon. Opens the modal. |
| Downloading | Solid button replaced by the shared `DownloadProgress` row plus a text-link `Cancel` |
| Downloaded / installing | Solid `Install update` (or disabled `Installing…`) |
| Up to date | Quiet ghost/text button inside the card header `action` slot: `Check again` |
| Unavailable | Outline `Retry` |

The outline "Check for updates" button below the card is removed. Manual
check moves to the card header action, and only shows when nothing is pending.

### Step 3.3 Fix the label bug and drop the grace sentence

- Replace `const targetLabel = policy && (...) ? \`v${policy.versionCode}\` : null`
  with `formatVersionLabel(policy?.versionName, policy?.versionCode)`.
- `graceRemaining` is no longer rendered here. The modal owns the deadline.

### Step 3.4 Remove the redundant surfaces

1. `src/App.tsx` lines 559-562: delete the `<UpdateBanner />` mount and the
   import. Keep `<UpdateGate />`; the expired gate is not redundant.
2. `src/components/app/UpdateBanner.tsx`: delete the file.
3. `src/components/dashboard/PaymentReminderBanner.tsx`: remove the
   `android-update` branch, `hasAndroidUpdate`, `targetVersionName`,
   `isMandatory`, the `navigate('/settings?section=app-update')` path, and the
   Android update icon/badge copy. Keep the payment reminder and the web APK
   promo exactly as they are.
4. `src/hooks/useNotifications.ts` line 146 pushes to
   `/settings?section=app-update`. Change the copy to name the settings
   section, not "update now", so the notification does not duplicate the
   modal.

Net result: one prompt (modal), one persistent surface (Settings card), one
enforcement surface (gate).

## 5. Phase 4: The asynchronous Update Modal

New file: `src/components/app/UpdateModal.tsx`.
Delete or reduce `src/components/app/UpdateSheet.tsx` to avoid two modal
implementations; the 2026-11-09 report already lists "adopt a Design Lab
variant" as deferred.

### Step 4.1 Structure

Use the shadcn `Dialog` (not `Sheet`) for a centred reading room on tablet and
desktop, and a `bottom` sheet look on phones by class only, not by a second
component.

```
<Dialog>
  <DialogContent
    className="flex max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-[480px] flex-col gap-0 overflow-hidden
               rounded-t-[20px] p-0 sm:rounded-[16px]"
  >
    {/* Zone 1: header, fixed */}
    <header className="border-b border-border px-5 pb-4 pt-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Update required
      </p>
      <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">
        v1.0.28
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        28.4 MB · Released 14 Nov 2026
      </p>
    </header>

    {/* Zone 2: action, fixed, swaps in place */}
    <div className="px-5 py-4">
      <UpdateAction />           {/* idle | downloading | ready | failed */}
    </div>

    {/* Zone 3: changelog, the only scroll region */}
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border px-5 py-4">
      <ChangelogTimeline items={changelog.items} version={...} releasedAt={...} />
    </div>

    {/* Zone 4: quiet footer */}
    <footer className="flex items-center justify-between px-5 py-3">
      <a ...>Download on web</a>
      <p className="text-[11px] text-muted-foreground">You can keep working. The download continues.</p>
    </footer>
  </DialogContent>
</Dialog>
```

Hard rules:

- Only one scroll container. Header and action must not scroll away while the
  progress bar fills.
- No grey all-caps block. No second alert panel. The grace deadline is one
  meta line: `2 days 23 hours left · BOUXRE pauses after that`.
- Dismiss (X, overlay, Escape) closes the dialog only. It never cancels.

### Step 4.2 Real progress binding

File: `src/domain/appUpdate/updateStateMachine.ts` or a new
`src/domain/appUpdate/downloadDisplay.ts`. Pure functions only:

```ts
export interface ProgressMetrics { percent: number | null; label: string }

export function describeProgress(downloaded: number | null, total: number | null): ProgressMetrics
```

- `percent` = `Math.min(100, Math.floor((downloaded / total) * 100))` when both
  are known and `total > 0`, else `null` (indeterminate).
- `label` = `"14.2 MB / 45.0 MB (32%)"` when total is known, and
  `"14.2 MB downloaded"` when it is not. Use one decimal and ASCII slash.
  Percent comes from bytes, never from elapsed time.
- No `setInterval`, no `Math.random()`, no CSS animation to imply progress.
  The transition on the bar's `width` is 120ms linear; it is a render
  smoothing of a real value, and must not overshoot.

Component: `src/components/app/update/DownloadProgress.tsx`

```tsx
<div role="progressbar" aria-valuemin={0} aria-valuemax={100}
     aria-valuenow={percent ?? undefined} aria-valuetext={label}>
  <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
    <div className="h-full bg-primary transition-[width] duration-150 ease-linear"
         style={{ width: percent === null ? '0%' : `${percent}%` }} />
  </div>
  <div className="mt-2 flex items-baseline justify-between">
    <span className="font-mono text-[12px] tabular-nums text-foreground">{label}</span>
    <span className="text-[11px] text-muted-foreground">{etaLabel}</span>
  </div>
</div>
```

`etaLabel` is optional. If included, compute from a rolling average of real
byte deltas over the last 5 seconds, and show nothing until 2 samples exist.
Do not show an ETA from a single sample.

Button swap in Zone 2, one state machine, no layout jump:

| `downloadPhase` | Zone 2 |
| --- | --- |
| `idle` | Solid `Download & Install` (full width, 48px) |
| `downloading` | `<DownloadProgress />` + text button `Cancel download` |
| `installing` | Disabled `Installing…` |
| `downloaded` with native auto-install | Disabled `Opening installer…` |
| `failed` | `<DownloadProgress />` absent, safe copy, solid `Retry download` |

Initial `totalBytes` comes from `release.assets[0].sizeBytes` until the native
poll reports a real total, so the first frame already shows
`0.0 MB / 45.0 MB (0%)` instead of an indeterminate bar.

### Step 4.3 Auto-install on completion

File: `ApkUpdatePlugin.java`

1. In the completion receiver, after `STATUS_SUCCESSFUL` and after building
   the FileProvider URI, call a private `autoInstall(uri)`.
2. `autoInstall`:
   - If `canRequestPackageInstalls()` is false: store `pendingInstallUri`
     and emit `apkInstallBlocked` so the modal can show
     `Allow installs for BOUXRE to finish` with a button that re-runs
     `installApk()` (which already opens `ACTION_MANAGE_UNKNOWN_APP_SOURCES`).
   - If the app is not in the foreground: store `pendingInstallUri`. Do not
     call `startActivity` from a receiver; Android 10+ blocks background
     activity launches. Fire it from `handleOnResume`, which already exists.
   - Otherwise start `ACTION_VIEW` with
     `application/vnd.android.package-archive` and
     `FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK`.
3. Reuse the same path from `load()` when a restored record is already
   `STATUS_SUCCESSFUL`.
4. Emit `apkDownloadCompleted` with `{ fileName, uri, sizeBytes }` before
   installing, so the web layer reaches `downloaded`/`installing` without
   needing the old promise.

Verification for auto-install (device only, cannot be checked in CI):
download while the app is foregrounded, backgrounded, and while the process is
killed mid-download. All three must end at the Android installer screen, or at
the "allow unknown apps" screen with a clear in-app reason.

Trust note: auto-install still requires the Android confirmation sheet. The
app never installs silently, which keeps `REQUEST_INSTALL_PACKAGES` honest.
Before firing, compare `destination.length()` with the policy asset size and
the persisted `versionCode` with the policy target; reject on mismatch.

### Step 4.4 Changelog timeline

New file: `src/domain/appUpdate/changelog.ts`, pure, testable:

```ts
export interface ChangelogEntry { title: string; detail: string | null }
export interface Changelog { entries: ChangelogEntry[] }

export function parseReleaseNotes(notes: string | null | undefined): Changelog
```

Rules:

- Split on newlines. Trim. Drop empty lines.
- Lines starting with `-`, `*`, or `•` become entries. Strip the marker.
- `Title — detail` / `Title: detail` splits on the first separator into
  title and detail. Separators are `—` (U+2014), ` - `, and the first `:` when
  the left side is 60 characters or fewer.
- A single paragraph becomes one entry with `detail: null`.
- Empty or null notes produce `entries: []`, and the section renders a short
  `No release notes for this build.` line rather than an empty rail.

Component: `src/components/app/update/ChangelogTimeline.tsx`

- Left rail: 1px `border` line, one 7px dot per entry, first dot `bg-primary`,
  rest `bg-border`.
- Row: `text-[13px] font-medium` title, `text-[12px] leading-5 text-muted-foreground`
  detail.
- Version group label above the rail: `v1.0.28 · 14 Nov 2026`.
- No accordions, no icons per entry, no card inside card. This is a reading
  surface, so it stays flat and gets the vertical space that the old grey
  block wasted.
- When `release_notes` is later extended to structured JSON, only the parser
  changes.

### Step 4.5 Trigger: 1.5 seconds after the dashboard settles

New file: `src/components/app/UpdateModalHost.tsx`

```tsx
export default function UpdateModalHost({ ready }: { ready: boolean }) {
  const update = useAppUpdateContext()
  const [open, setOpen] = useState(false)
  const shownForRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isAndroidNative() || !ready || !update.ready) return
    if (update.state.status !== 'available' && update.state.status !== 'grace') return
    if (update.downloadPhase.kind === 'downloading') return
    const version = update.state.policy?.versionCode ?? null
    if (version === null || shownForRef.current === version) return

    const timer = window.setTimeout(() => {
      shownForRef.current = version
      setOpen(true)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [ready, update.ready, update.state.status, update.state.policy?.versionCode, update.downloadPhase.kind])
  ...
}
```

Mount point: `src/pages/Dashboard.tsx`, inside `<Layout>`, after
`<DashboardOverview />`, passing `ready={!loading}` from
`useDashboardData()`. This gives "after initial data fetch completes, 1 to 2
seconds".

Rules:

- Never on the splash screen: `ready` is false during cold launch, and the
  host is inside the dashboard route, so the splash cannot show it.
- Once per version per app session (the ref). A dismiss does not nag again
  this session; the Settings card remains the entry point.
- Never auto-open over an active download, and never auto-open in `blocked`
  state (the gate owns that).
- `UpdateGate` keeps its own layout and does not use this modal, to avoid a
  dialog over a blocking screen.
- Do not add a second banner. Progress while the modal is closed is visible in
  the Settings card row (`Downloading · 32%`) and in the Android notification.

## 6. Phase 5: Tests and verification

### Tests to add (pure logic only, no device)

1. `src/tests/critical/appUpdateChangelog.test.js`
   - bullet markers `-`, `*`, `•`
   - `Title — detail` and `Title: detail`
   - single paragraph, empty notes, trailing blank lines
   - a colon inside a URL must not split (left side longer than 60 chars)
2. `src/tests/critical/appUpdateProgressDisplay.test.js`
   - 14.2/45.0 style formatting, unknown total, zero total, downloaded > total
     clamps to 100, integer percent from bytes
3. Extend `appUpdateStateMachine.test.js` only if step 2.4 changes persisted
   input handling. Do not rewrite existing assertions.

### Commands

```bash
bun run audit:load
bun run test -- src/tests/critical/appUpdateChangelog.test.js src/tests/critical/appUpdateProgressDisplay.test.js
```

`bun run typecheck` is reserved for the project lead per `AGENTS.md`. Request
it before merge rather than running it here.

### Device checks (owner, not CI)

1. Fresh install of the new signed APK on Android 13+ and Android 10.
2. `adb logcat -s BIGDROPS/Update` shows `enqueue visibility=1` and no
   `Invalid value for visibility`.
3. Progress numbers match `adb shell dumpsys download` byte counts.
4. Dismiss the modal mid-download: transfer continues, notification present,
   Settings card shows live percent.
5. Kill the app process mid-download, reopen: state restores, install fires.
6. Airplane mode mid-download: `STATUS_FAILED`, partial file deleted, safe
   copy, retry works.
7. Unknown-sources denied: modal shows the allow-installs action, and
   returning from Settings continues the install.
8. Grace expiry: gate appears, modal does not stack over it.

## 7. Risks and open decisions

- **Transport (Step 1.3) is the only unproven assumption.** If
  `DownloadManager` cannot write to app external cache on the test devices,
  the HttpURLConnection path changes the permission story and the progress
  source, but not the UI contract, because the `apkDownloadProgress` event
  shape stays the same.
- **Auto-install trust.** Users will see an installer sheet appear without a
  tap. Keep the size/version check and the explicit "allow unknown apps" copy.
  If product prefers a tap, keep auto-install but gate it behind a
  `bd:update:auto-install` preference already enabled for mandatory releases.
- **`release_notes` structure.** The parser handles today's one-line notes.
  If marketing wants rich "What's New", add a `changelog jsonb` column and
  keep the parser as the fallback for old policy rows.
- **Single download slot.** Parallel downloads are out of scope. Document it
  in the plugin header so nobody assumes queueing.
- **Old binaries.** Devices on 1027 keep the crash and the raw message until
  they take this release. The web fallback remains the escape hatch, and the
  new manifest permission only takes effect after they update. This is a
  one-release-overlap problem, not something code can close.
