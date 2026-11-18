# BOURXE Web and Android Changelog Implementation Audit

## Executive Summary

This audit investigates the existing BOURXE changelog and release-notification implementation across the Web application and native Android application. The objective is to determine whether existing users are informed of new product releases, whether Android users on older APKs can detect newer versions, and whether acknowledgement persistence prevents duplicate notifications.

**Key finding: The release infrastructure is well-defined at the metadata level (Supabase `app_release_policy` table), but the user-facing notification mechanisms are underdeveloped. Web users receive no automatic "What's New" notifications when a new release is published. Android users discover updates only on app launch/resume via a throttled 6-hour check, and the `UpdateGate` blocks navigation when the 3-day grace period expires. There is no shared acknowledgement persistence between platforms, and no web-equivalent of the Android `UpdateGate`.

## Scope and Methodology

This was a **zero-code-edit static audit**. I inspected:

- Source files under `src/`, `android/`, `supabase/`, and `.github/`
- Release policy RPC, table schema, and publication workflow
- Update state machine, grace state persistence, and version comparison logic
- Web components: `useAppUpdate`, `UpdateModal`, `AppUpdateSettingsSection`, `UpdateGate`
- Android native plugin: `ApkUpdatePlugin.java`
- Test files: `releaseDiscovery.test.js`, `appUpdateStateMachine.test.js`
- GitHub Actions workflow for Android test-release builds
- Vite/Capacitor configuration and environment variable injection

No source files, configuration files, database records, version numbers, or release metadata were modified during this investigation.

## Actual Release Architecture and Authoritative Release Source

### Single Source of Truth: Supabase `app_release_policy`

The authoritative source of release information is the **Supabase `public.app_release_policy` table** (single row, `id = 1`). This table is the definitive policy source that both Web and Android clients consult.

**Table schema** (from migration `20260914120000_app_release_policy.sql`):

| Field | Type | Description |
|---|---|---|
| `id` | integer | PK, default 1, constrained to `id = 1` |
| `version_code` | integer | Required Android versionCode of the target release |
| `version_name` | text | Human-readable versionName (display only) |
| `mandatory` | boolean | `true` = 3-day grace applies, `false` = optional update |
| `effective_at` | timestamp with time zone | When the mandatory countdown starts (server time) |
| `apk_asset_prefix` | text | Required asset name prefix, e.g. `BIGDROPS-test-release-` |
| `web_release_url` | text | Approved external release/download destination (HTTPS only) |
| `release_notes` | text | Optional display text for changelog |
| `updated_at` | timestamp | Default `now()`, last update timestamp |

**Row Level Security**: `SELECT` granted to `anon, authenticated`; no INSERT/UPDATE/DELETE policies exist, so writes are service-role only.

**RPC: `public.get_active_android_release_policy()`**

Returns the active policy row plus `now()` from the database server. The client uses `server_now` as the trusted anchor for the 3-day deadline instead of the device clock. Exposed to anon because the update gate must work before login.

### Release Publication Workflow

The published GitHub Actions workflow (`.github/workflows/build-android-test-release.yml`) performs these steps:

1. **Build signed Test-Release APK** with versionCode = `1000 + GITHUB_RUN_NUMBER`, versionName = `1.0.<run_number>`
2. **Upload APK to Supabase Storage** at `app-releases/bigdrops-latest.apk`
3. **Update `app_release_policy` row** via PostgREST PATCH with:
   - `version_code`, `version_name`
   - `web_release_url` = public Supabase Storage URL `?v=<VERSION_CODE>`
   - `effective_at` = ISO timestamp of upload
   - `release_notes` = e.g. `"BOURXE v1.0.24 (build 1024) maintenance and performance update."`
   - `mandatory` = `true` (for test releases) or `false`
   - `apk_asset_prefix` = `BIGDROPS-test-release-`

**Competing sources**: GitHub Releases carries the APK asset distribution only; it does **not** decide what is mandatory or when the grace period starts. The Supabase policy row is the sole determinant. Releases without an approved APK asset (name starting with the policy's prefix, ending in `.apk`, HTTPS URL) are ignored by `releaseDiscovery.selectApprovedApkAssets()`.

**Accessibility to existing installations**: Yes — the RPC is exposed to `anon, authenticated`, so any app instance (including pre-login states) can learn a mandatory update exists. Old APK versions can retrieve current release information by fetching the policy RPC, since the policy is not version-gated (only the `installedVersionCode` comparison matters).

## Web Implementation Findings

### Changelog/What's New Notification Status: **NOT IMPLEMENTED**

The Web application has no automatic "What's New" notification that presents when a new release is published. The relevant components exist but are not wired to auto-present:

- `src/hooks/useAppUpdate.ts`: Core hook coordinating discovery, grace state, and download. Launches on appStateChange + visibilityChange, throttled at 6-hour intervals. Does **not** auto-present a banner or dialog on new release detection.
- `src/components/app/UpdateModal.tsx`: Dialog component that displays update required/available status, version label, download progress, and a `ChangelogTimeline` rendering parsed release notes. **Only rendered inside `AppUpdateSettingsSection`** (opt-in manual check), not as a system-wide notification.
- `src/components/app/update/ChangelogTimeline.tsx`: Renders "What's new" section from parsed changelog entries. Used by `UpdateModal` but never auto-presented on the web.
- `src/pages/settings/AppUpdateSettingsSection.tsx`: Manual "Check for updates" button. On web (non-Android), renders `WebAndroidDownloadSection` showing APK download link only — no release notes or auto-notification.
- `src/contexts/AppUpdateContext.tsx`: Not directly read but `useAppUpdateContext()` is consumed by `AppUpdateSettingsSection`. Provides the `update` state to descendant components.

**Trigger mechanism**: The web hook does check for updates on launch/resume, but the result is stored in React state (`appUpdate.state`) and is only consumed by `AppUpdateSettingsSection` and `UpdateGate`. There is **no component that subscribes to state changes and presents a banner/dialog** when `state.status` becomes `'available'` or `'grace'`.

**Version identification**: The web app uses `useWebAndroidApk()` which fetches policy via `fetchReleasePolicy()` and resolves the direct APK URL. VersionCode/Name come from the policy row, not from a separate web app version field. `VITE_GIT_REPO` is injected at build time for GitHub repo resolution.

**Dismissal/acknowledgement persistence**: **No persistence mechanism** exists for web dismissal. There is no localStorage key, no cookie, and no session store that tracks "user has acknowledged this release." Each app start re-checks the policy from scratch.

**Authenticated vs unauthenticated**: The RPC `get_active_android_release_policy()` is exposed to `anon, authenticated`, so the policy is readable without a session. However, without a persistence mechanism, an unauthenticated user who dismisses a notification would have no way to re-trigger it on return (since there's no dismissal tracking).

**Duplicate announcement risk**: Without any dismissal persistence, **every app start could trigger a new check**, but the 6-hour throttling in `useAppUpdate` (`MIN_POLICY_FETCH_INTERVAL_MS`) prevents excessive fetches. However, the throttled resume path (when only a stale local-only operation runs) does **not** fetch fresh metadata — it re-evaluates against persisted state only. If the policy has genuinely changed since the last fetch, the user would not see the new release because no fresh fetch occurs within the throttle window.

### Web Release Notification Lifecycle

```
App start
    ↓
useAppUpdate checkCoordinator.submit(force=false)
    ↓
Throttled: if within 6h of last check → re-evaluate state machine against persisted grace anchor only (no fetch)
    ↓
If force check or 6h elapsed:
    → fetchReleasePolicy() from Supabase RPC
    → resolveUpdateState() → status: 'up_to_date' | 'available' | 'grace' | 'blocked' | 'unavailable'
    → setState() — but NO automatic presentation to user
    ↓
User must navigate to Settings → App Update to see status
```

## Android Implementation Findings

### Changelog/Update Notification Status: **PARTIALLY IMPLEMENTED**

The Android application independently discovers newer releases, but the mechanism is limited to launch/resume checks with a 6-hour throttle, and the user-facing update surface is gated behind the `UpdateGate`.

### Version Discovery and Comparison

- **Version code/name**: From `build.gradle` environment variables `BIGDROPS_VERSION_CODE` and `BIGDROPS_VERSION_NAME`, injected during GitHub Actions build. Version code is numeric; versionName format is `1.0.<run_number>`.
- **Version comparison**: Numeric Android-compatible comparison (`compareVersionCodes`). Never lexicographic.
- **Update discovery**: On launch + resume (AppStateListener) + visibilityChange. Throttled by `MIN_POLICY_FETCH_INTERVAL_MS` = 6 hours. A fresh `fetchReleasePolicy()` + `getAppVersionInfo()` is performed only when the throttle has elapsed or `force` is true.

### Update Discovery Mechanism

```
App launch/resume
    ↓
useAppUpdate (Capacitor/React) — runCheck(false)
    ↓
coordinator.submit(desiresFresh)
    ↓
If fresh: fetchReleasePolicy() + getAppVersionInfo() in parallel
    ↓
resolveUpdateState() → UpdateState
    ↓
setState() → UI reflects status
```

**Status flow**:
- `up_to_date`: installedVersionCode >= policy.versionCode → gate clears
- `available`: newer release but `mandatory = false` → optional update
- `grace`: mandatory target, within 3-day grace period from effective_at
- `blocked`: mandatory target, past 3-day grace deadline → navigation blocked by `UpdateGate`
- `unavailable`: policy fetch failed / metadata malformed / installed version unknown (fail-safe)

### Post-Update Release-Note Detection

- **Before update**: `UpdateModal` (inside `AppUpdateSettingsSection`) can display release notes via `parseReleaseNotes(policy.releaseNotes)` when the user initiates a manual check.
- **After update**: On restart with the new version, `installedVersionCode >= policy.versionCode` → state resolves to `'up_to_date'` → `clearPersistedState: true` → grace anchor cleared. The user no longer sees an update gate.
- **Release notes persistence**: The `release_notes` field in the policy row is the single source. The `ChangelogTimeline` component parses it via `parseReleaseNotes()`. There is **no mechanism to display release notes "exactly once" after update** — this depends on the developer manually showing the modal before or after install.

### Android Notification/Banner/Dialog Implementation

- **`UpdateGate`** (Android-only): Wraps route rendering. When `appUpdate.state.status === 'blocked'`, the gate blocks navigation and presents a mandatory-update screen. The user must either install the update or dismiss to proceed (but the app remains blocked past the deadline).
- **`UpdateModal`**: Same dialog component as web, but rendered on Android when the user taps "Details" or the update CTA in `AppUpdateSettingsSection`. Displays version, size, release date, and changelog timeline.
- **In-app download/install**: `ApkUpdatePlugin.java` handles DownloadManager enqueue, progress polling, completion broadcast, and package installer launch. The app never installs silently — Android always shows its own install confirmation screen.
- **Download state persistence**: SharedPreferences (`bd_update_download`) stores the last download record (downloadId, versionCode, expectedBytes, fileName, URL). On cold start, `ApkPlugin.load()` reattaches to any completed download.

### Android Acknowledgement Persistence

- **Grace anchor**: Persisted in `localStorage` (key: `bigdrops.app_update.grace_anchor`) via `graceState.ts`. Contains `versionCode`, `anchoredAtMs`, `deviceClockSkewMs`, `carriedOver`.
- **Survives app restarts**: Yes — the anchor is localStorage-backed, so a restart never resets the 3-day countdown.
- **Cleared on successful install**: When `installedVersionCode >= policy.versionCode` → `resolveUpdateState` returns `clearPersistedState: true` → the hook calls `clearPersistedGraceState()`.
- **Carried over across releases**: If a newer mandatory release is published while the user is still on an older version, the original anchor is preserved (never reset for the same target on repeated checks). However, a **later re-anchored `effective_at` can only extend, never shorten**, the existing countdown.
- **No cross-device sharing**: localStorage is per-browser/per-app-instance. No Roaming profile or Supabase sync.

### Android First-Install Scenario

The tests in `appUpdateStateMachine.test.js` confirm:
- `installedVersionCode: null` → `status: 'unavailable'` (fail-safe, never block)
- First install with no prior grace anchor → if policy is available, status depends on `installedVersionCode` vs `policy.versionCode`
- If `installedVersionCode` is null/unknown, the gate cannot prove obsolete → `unavailable`
- If a policy exists and installed version is known, the comparison determines the state

However, there is **no mechanism to show historical release notes on first install** — the user would see either "up_to_date" or the update gate, but not the "What's New" content from a previous release.

## Cross-Platform Consistency Findings

### Release Metadata Consumption

| Aspect | Web | Android |
|---|---|---|
| **Policy source** | `fetchReleasePolicy()` → Supabase RPC | Same RPC, same table |
| **Version comparison** | Numeric `versionCode` | Numeric `versionCode` (Android-native) |
| **Release notes parsing** | `parseReleaseNotes()` (domain layer) | Same `parseReleaseNotes()` |
| **APK URL resolution** | `useWebAndroidApk()` → `fetchReleasePolicy()` + `isDirectApKUrl()` | `useAppUpdate()` → `buildDirectPolicyRelease()` or `fetchApprovedRelease()` |
| **Changelog display** | `ChangelogTimeline` in `UpdateModal` (manual only) | Same `ChangelogTimeline` in `UpdateModal` (manual only) |
| **Grace period** | State machine resolves grace using `effective_at + GRACE_PERIOD_MS` | Same state machine, same `GRACE_PERIOD_MS = 3 days` |
| **Acknowledgement persistence** | **None** | `localStorage` grace anchor (per-instance) |

### Key Inconsistencies

1. **Web has no auto-present notification**: The `UpdateModal` is only accessible via Settings → App Update. There is no system-wide banner or dialog that auto-presents when a new release is detected.

2. **Android has UpdateGate blocking**: The `UpdateGate` blocks route navigation when status is `'blocked'` (past grace deadline). The web has no equivalent — web navigation is never blocked by update status.

3. **Different discovery triggers**: Android checks on launch/resume + visibilityChange (mobile-appropriate). Web checks on `appStateChange` + `visibilityChange` (less relevant for browser tabs). The web check is further constrained by the fact that browser tabs don't have a meaningful "foreground/background" lifecycle in the same way.

4. **Acknowledgement independence**: Dismissal on one platform does not affect the other. A user who dismisses the Android update gate and installs the APK will, on next web session, have no record of having already acknowledged the release. Conversely, a web user who never sees a notification (because none exists) will not have their state carry over to Android.

5. **Release notes duplication**: The `release_notes` field in Supabase is the single source, but neither platform has a mechanism to ensure release notes are displayed "exactly once" after an update. The `UpdateModal` can be opened multiple times.

### What Happens When a User Switches Devices

- **Android → Web**: The web app has no knowledge of the Android update acknowledgment. The user starts fresh — no record of having already installed the update.
- **Web → Android**: Similarly, the Android app has no record of web-side release acknowledgment. The grace anchor is localStorage-only.
- **No shared release acknowledgment mechanism**: Both platforms read the same `app_release_policy` metadata, but each maintains its own independent state. There is no roaming user profile field, no Supabase user-linked preference, and no cross-platform persistence.

## Release Notification LifeCycle Diagrams

### Web Lifecycle (Current)

```
App starts
  ├── Throttled check (within 6h): re-evaluate state machine against persisted grace anchor only
  │     └── No fetch → state unchanged → no user-visible change
  └── Fresh check (after 6h or force):
        ├── fetchReleasePolicy() from Supabase
        ├── resolveUpdateState() → status
        ├── setState(appUpdate.state) — stored in React context
        └── ❌ NO automatic presentation
              User must navigate to Settings → App Update to see status
```

### Android Lifecycle (Current)

```
App launch/resume
  ├── AppStateListener + visibilityChange triggers runCheck(false)
  │     └── coordinator.submit() → fresh fetch if throttle elapsed
  │           ├── fetchReleasePolicy() + getAppVersionInfo()
  │           ├── resolveUpdateState() → status + graceDeadlineMs
  │           ├── setState() → UI updates
  │           └── ⛔ UpdateGate: if status === 'blocked', block route navigation
  │              └── User must tap "Install update" or dismiss (remains blocked past deadline)
  └── Download + install flow (if available):
        ├── startInAppDownload() → downloadApkNative() → DownloadManager
        ├── apkDownloadCompleted → UI shows "Install update" CTA
        ├── installDownloadedApk() → FileProvider → Android installer
        └── On restart: installedVersionCode >= target → state → 'up_to_date' + clearGraceAnchor
```

### Cross-Platform Unified Lifecycle (Proposed)

```
New release published
  ├── Supabase app_release_policy row updated (version_code, effective_at, release_notes)
  │     └── RPC get_active_android_release_policy() returns new policy
  └──────────────────────────────────────────────────────────────────
  │
  ├─ Web client (on next check, within throttle)
  │    ├── fetchReleasePolicy() → new policy received
  │    ├── resolveUpdateState() → status = 'available' or 'grace'
  │    ├── ⚡ Present "What's New" banner/dialog auto‑matically
  │    ├── User acknowledges → persist dismissal in user.profile release_acknowledgement field
  │    └── ✅ Dismissal roams with user profile (cross‑device)
  │
  └─ Android client (on next launch/resume)
       ├── fetchReleasePolicy() → new policy received
       ├── resolveUpdateState() → status = 'available' or 'grace' or 'blocked'
       ├── ⚡ Present "What's New" banner/dialog auto‑matically
       ├── User acknowledges → dismiss → grace anchor updated / cleared
       └── ✅ Dismissal roams with user profile (cross‑device)
       └─ On install + restart: installedVersionCode >= target → state → 'up_to_date' + clearGraceAnchor
```

## File Inventory with Actual Repository Paths

| File Path | Role |
|---|---|
| `src/lib/appUpdate/releaseDiscovery.ts` | GitHub Releases discovery, policy‑filtered APK asset selection |
| `src/lib/appUpdate/releasePolicyClient.ts` | Supabase RPC `get_active_android_release_policy()` client |
| `src/lib/appUpdate/updateDiagnostics.ts` | Structured diagnostics (reason codes, error codes only) |
| `src/lib/appUpdate/graceState.ts` | localStorage persistence for grace anchor (`bigdrops.app_update.grace_anchor`) |
| `src/lib/appUpdate/checkCoordinator.ts` | Coordinates concurrent checks, prevents fetch loops |
| `src/domain/appUpdate/changelog.ts` | `parseReleaseNotes()` → `ChangelogEntry[]` |
| `src/domain/appUpdate/updateStateMachine.ts` | Core state machine: `resolveUpdateState()`, version comparison, grace helpers |
| `src/domain/appUpdate/downloadFailure.ts` | Safe failure copy classification |
| `src/domain/appUpdate/settingsUpdateDisplay.ts` | Settings display mapping from `AppUpdateStatus` |
| `src/hooks/useAppUpdate.ts` | Main hook: discovery, grace persistence, download/install orchestration |
| `src/hooks/useWebAndroidApk.ts` | Fetches policy + direct APK URL for Settings section |
| `src/hooks/useNotifications.ts` | General notification preferences (not release‑specific) |
| `src/components/app/UpdateModal.tsx` | Modal dialog: version, size, date, changelog timeline |
| `src/components/app/update/ChangelogTimeline.tsx` | "What's new" section rendering |
| `src/components/app/UpdateGate.tsx` | Android‑only route gate: blocks when status === 'blocked' |
| `src/pages/settings/AppUpdateSettingsSection.tsx` | Manual "Check for updates" UI |
| `android/app/build.gradle` | `versionCode` from `BIGDROPS_VERSION_CODE`, `versionName` from `BIGDROPS_VERSION_NAME` |
| `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java` | DownloadManager bridge, install via FileProvider, SharedPreferences persistence |
| `supabase/migrations/20260914120000_app_release_policy.sql` | Table schema + seed row (inactive policy by default) |
| `supabase/functions/public.get_active_android_release_policy()` | RPC returning policy + server_now |
| `.github/workflows/build-android-test-release.yml` | Build + upload APK → update policy row |

## Function-Level Findings and Relevant Line References

| Function / Component | Line Reference | Finding | Confidence |
|---|---|---|---|
| `fetchReleasePolicy()` | `src/lib/appUpdate/releasePolicyClient.ts:28-53` | Fetches policy via Supabase RPC. Returns `available: false` on transport error, `available: true, policy: null` when no row configured. **Critical**: RPC is the sole metadata source for both platforms. | IMPLEMENTED |
| `resolveUpdateState()` | `src/domain/appUpdate/updateStateMachine.ts:221-327` | Core state machine. Resolves `up_to_date / available / grace / blocked / unavailable`. Handles grace anchor persistence, re‑anchoring rules, and fail-safe behavior. **All logic is pure domain** — no Capacitor/Supabase dependencies. | IMPLEMENTED |
| `parseReleaseNotes()` | `src/domain/appUpdate/changelog.ts:46-78` | Parses `release_notes` text into `ChangelogEntry[]`. Bullet‑pattern (`-`, `*`, `•`). Falls back to single‑entry when no bullets found. **Single source** for both web and Android changelog display. | IMPLEMENTED |
| `useAppUpdate()` | `src/hooks/useAppUpdate.ts:145-280` (checkForUpdate flow) | Coordinates check discovery, grace state, download/install. **Does not auto-present** any UI on new release detection. State is stored in React context but no component subscribes for auto‑presentation. | PARTIALLY IMPLEMENTED |
| `useWebAndroidApk()` | `src/hooks/useWebAndroidApk.ts:45-79` | Fetches policy, resolves direct APK URL. **Only used in Settings section** (`AppUpdateSettingsSection` → `WebAndroidDownloadSection`). No auto‑present banner. | PARTIALLY IMPLEMENTED |
| `ApkUpdatePlugin.downloadApk()` | `android/App/src/main/java/.../ApkUpdatePlugin.java:228-318` | Enqueues DownloadManager request, persists record to SharedPreferences, starts progress polling. **Robust** — handles process death reattachment. | IMPLEMENTED |
| `ApkUpdatePlugin.load()` | `android/App/src/main/java/.../ApkUpdatePlugin.java:378-479` | On plugin load, reattaches to any completed download from previous session. Restores download state from SharedPreferences. | IMPLEMENTED |
| `UpdateGate` | `src/App.tsx` (inline, renders conditionally) | Android‑only: when `appUpdate.state.status === 'blocked'`, blocks route navigation. **Web has no equivalent** — web navigation never blocked by update status. | PARTIALLY IMPLEMENTED |
| `fetchApprovedRelease()` | `src/lib/appUpdate/releaseDiscovery.ts:213-287` | Fetches GitHub releases, filters by approved asset prefix. **Only triggered on `force` check**, not on routine launch checks. Runs GitHub API fetch with 12s timeout. Returns `null` on network failure (fail-safe). | IMPLEMENTED |

## Capability Status Matrix

| Capability | Status | Evidence |
|---|---|---|
| **Authoritative release source (Supabase policy)** | IMPLEMENTED | `app_release_policy` table + RPC `get_active_android_release_policy()` exposed to anon/authenticated |
| **Web detects newer release** | NOT IMPLEMENTED | No auto-present banner/dialog; `UpdateModal` only accessible via Settings manual check |
| **Android detects newer APK** | PARTIALLY IMPLEMENTED | Checks on launch/resume (6h throttle); `UpdateGate` blocks when `'blocked'` |
| **Release notes displayed** | PARTIALLY IMPLEMENTED | `parseReleaseNotes()` exists; `ChangelogTimeline` renders entries; but only inside `UpdateModal` which is manually triggered |
| **User acknowledgement persistence** | PARTIALLY IMPLEMENTED | Android: `localStorage` grace anchor (per-instance, survives restart). Web: **No persistence** |
| **Cross-device acknowledgement sync** | NOT IMPLEMENTED | No shared mechanism; each platform maintains independent state |
| **Web UpdateGate equivalent** | NOT IMPLEMENTED | Web navigation never blocked by update status; no blocking gate |
| **Post-update release-note display** | NOT IMPLEMENTED | No mechanism to display release notes exactly once after user installs an update |
| **GitHub Release asset discovery** | PARTIALLY IMPLEMENTED | `fetchApprovedRelease()` exists; only triggered on `force` check, not routine checks |
| **Throttled check to prevent duplicate fetches** | IMPLEMENTED | `MIN_POLICY_FETCH_INTERVAL_MS = 6 hours` in both web and Android hooks |
| **Fail-safe: never block on missing metadata** | IMPLEMENTED | When policy fetch fails, status → `'unavailable'`; when installed version unknown → `'unavailable'` (never `'blocked'`) |

## Confirmed Defects and Missing Integration

1. **No web auto-present notification** (CRITICAL): The Web application has no component that auto-presents a "What's New" banner or dialog when a new release is detected. Users must navigate to Settings → App Update to see any release information. The `UpdateModal` component exists but is never auto-shown.

2. **No web acknowledgement persistence** (CRITICAL): There is no mechanism to track whether a web user has acknowledged a release. Each app start re-checks the policy, and without dismissal tracking, the same release information could (theoretically) re-appear on every check — though the 6-hour throttle prevents rapid repetition.

3. **No cross-device acknowledgement sync** (HIGH): Dismissal or acknowledgement on one platform (Web or Android) does not sync to the other. A user who updates on Android has no record of this on Web, and vice versa.

4. **No post-update release-note display** (MODERATE): There is no mechanism to ensure release notes are displayed exactly once after a user installs a newer APK. The `UpdateModal` can be opened multiple times, and there's no "shown" flag that persists across sessions.

5. **Android UpdateGate blocks indefinitely past deadline** (MODERATE): When the 3-day grace period expires, `UpdateGate` blocks route navigation. The user must either install the update or dismiss, but the app remains in `'blocked'` state past the deadline, potentially stranding the user.

6. **GitHub Release discovery only on `force` check** (MODERATE): `fetchApprovedRelease()` is only triggered when `force=true` (manual check or throttle expired). It is **not** part of the routine launch/resume check, meaning new GitHub releases may not be discovered until the user manually checks or the 6-hour throttle expires.

7. **Web has no versionCode/Name tracking independent of policy** (LOW): The web app's `useWebAndroidApk()` hook fetches version info from the policy row, but there is no separate web-app version tracking. If the policy row is reset or corrupted, the web app has no fallback.

8. **Android `localStorage` grace anchor not roaming** (MODERATE): The grace anchor persists in localStorage but is per-browser/per-app-instance. No mechanism exists to sync it across devices or link it to a user account.

## Security and Reliability Observations

1. **RPC exposed to anon**: `get_active_android_release_policy()` is granted to `anon, authenticated`. This is intentional — the update gate must work before login. However, it means any client (including old/unupdated APKs) can learn what version is mandatory and when the grace period starts.

2. **HTTPS-only web URLs**: The policy validation (`validateReleasePolicy`) enforces `web_release_url ~* '^https://'`. The `isDirectApkUrl` check enforces `^https://`. This prevents downgrade to HTTP.

3. **Policy malformed → unavailable**: `validateReleasePolicy` rejects malformed rows (null version_code, non-boolean mandatory, non-https URL, etc.). The caller treats null policy as "no valid policy" and never blocks on it (fail-safe).

4. **Download safety**: `ApkUpdatePlugin` enforces HTTPS URLs only. DownloadManager uses `VISIBILITY_VISIBLE_NOTIFY_COMPLETED` (no invasive notification). FileProvider-based install requires `FLAG_GRANT_READ_URI_PERMISSION` — Android's standard confirmation flow.

5. **No secrets in client code**: All RPC transport credentials (SUPABASE_SERVICE_ROLE_KEY) are server-side. Client sees only the policy row data, which is public by design.

6. **Network failure fail-safe**: Both `fetchReleasePolicy()` and `fetchApprovedRelease()` resolve to `null` on network errors. The state machine never blocks on missing metadata (`status: 'unavailable'`).

7. **Aborted fetch timeouts**: `fetchApprovedRelease()` uses `AbortController` with 12s timeout. Prevents hanging on slow/unresponsive GitHub API.

8. **Download record survives process death**: SharedPreferences (`bd_update_download`) + `ApkPlugin.load()` reattachment ensures the download record persists even if Android kills the app before the transfer completes.

## Recommended Architecture for a Unified Release-Notification System

The recommended architecture evaluates a **shared remote release manifest with platform-specific notification clients**:

### Core Principles

1. **Single source of truth**: Supabase `app_release_policy` remains the authoritative policy source. No duplication of policy logic.

2. **Remote manifest endpoint**: In addition to the per-row policy, a `/api/release-manifest` endpoint (or Supabase view) could serve the current release metadata in a flat, versioned format. This enables cache-friendly fetches and version-delta detection.

3. **Platform-specific notification clients**:
   - **Web**: Use React's `useEffect` + `useState` to subscribe to `appUpdate.state` changes. When status transitions to `'available'` or `'grace'`, present a toast/banner with release notes summary. On dismiss, persist `releaseAcknowledgedAt` in the user's Supabase profile (or a lightweight local store).
   - **Android**: Existing `useAppUpdate` flow enhanced to, on status transition, show a system notification (via Capacitor Push Notifications) or in-app banner. Acknowledgment updates the grace anchor and persists a `releaseAcknowledgedAt` flag in the user profile.

4. **Cross-device acknowledgement**: When a user acknowledges a release on one platform, write `releaseAcknowledgedAt` to their Supabase profile (linked by `user.sub`). On every check on any platform, read this flag and skip presentation if the user has already acknowledged this `versionCode` or a newer one.

5. **First-install protection**: On first install (no prior `installedVersionCode`, no persisted grace anchor), check whether the current version is **older** than the policy target. If so, show the "What's New" release notes **once** (marked as shown in profile), then transition to the normal update gate. This prevents historical release notifications from incorrectly triggering on first install.

6. **Grace anchor roaming**: The grace anchor could be stored in the user's Supabase profile (as `effective_at + 3 days`) rather than purely in localStorage. This would survive device switches while retaining the 3-day countdown semantics. The localStorage anchor would remain as a fallback/optimization.

### Minimal Implementation Roadmap

| Priority | Task | Dependencies |
|---|---|---|
| **P0** | Add `releaseAcknowledgedAt` field to Supabase `profiles` table (migration + RLS policy). Read/write from both web and Android hooks. | Supabase schema access, profile table exists |
| **P0** | Web: Subscribe to `appUpdate.state` changes; on `'available'`/`'grace'` transition, present toast banner with release notes summary; on dismiss, write `releaseAcknowledgedAt` to profile. | `useAppUpdate`, `useNotifications` pattern, Supabase client |
| **P0** | Android: On `'available'`/`'grace'`/`'blocked'` status transition, show in-app banner or system notification (Capacitor Push Notifications). On acknowledgment, update grace anchor + write `releaseAcknowledgedAt` to profile. | `useAppUpdate`, Capacitor push, `ApkUpdatePlugin` |
| **P1** | Android + Web: On check, read `releaseAcknowledgedAt` from profile. If present and `acknowledgedVersionCode >= policy.versionCode`, skip presentation. | P0 completed |
| **P1** | First-install flow: On first check (no installedVersionCode, no grace anchor), if `policy.versionCode > 0`, show release notes once (profile flag), then resolve to `'available'` or `'grace'` as appropriate. | P0, profile table |
| **P2** | Grace anchor in profile (optional): Migrate grace anchor from localStorage to Supabase profile (`graceDeadlineMs`). Survives device switches. | P0, Supabase profile update flow |
| **P2** | Graceful deprecation of duplicate notification mechanisms: After P0-P1 are verified, the existing `UpdateModal` + `UpdateGate` can remain for backward compatibility. | All above |

**Important**: This recommended architecture must not assume the shared manifest is the correct solution until existing infrastructure is fully understood. The audit has confirmed the current infrastructure's capabilities and gaps; the roadmap proposes minimal remediation ordered by dependency.

## Final Git Status and Zero-Code-Modification Confirmation

**Git status immediately before audit:**
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
      modified:   android/app/src/main/AndroidManifest.xml
      modified:   android/app/src/main/java/com/bigdrops/app/MainActivity.java
      modified:   api/bolu-chat.ts
      modified:   docs/prd/conversational-document-assistant/Waterfall-roadmap.md
      modified:   docs/prd/conversational-document-assistant/functional-req.md
      modified:   src/components/ai-assistant/chat/BoluChatWorkspace.tsx
      modified:   src/components/ai-assistant/chat/assistant-chat-composer.tsx
      modified:   src/components/ai-assistant/chat/assistant-chat-model-pill.tsx
      modified:   src/components/ai-assistant/chat/assistant-chat-thread.tsx
      modified:   src/components/ai-assistant/chat/index.ts
      modified:   src/components/ai-assistant/chat/types.ts
      modified:   src/lib/ai-assistant/bolu-usage-ledger.ts
      modified:   src/lib/ai-assistant/hooks/types.ts
      . . . (additional pre-existing modifications)
```

**Git status immediately after audit (this report only):**
- The only new file created is `docs/Reports/BOURXE_WEB_ANDROID_CHANGELOG_IMPLEMENTATION_AUDIT.md`.
- No application source files, Android source files, configuration files, database files, or release metadata files were modified.
- No git commits, pushes, or deployments were performed.

**Verification**: The single permitted change is the creation of the audit report Markdown file under `docs/Reports/`. All other pre-existing modifications remain untouched.

---