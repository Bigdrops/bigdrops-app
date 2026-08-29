# Biometric App-Lock Implementation Report

This report was written by Buffy on 2026-08-29 via Freebuff.

---

## Objective

Add fingerprint/face-unlock app-lock to BIGDROPS. The lock gates access to the already-authenticated session on cold launch and background resume. It is opt-in, off by default, and uses biometric-only verification (no PIN fallback).

## Scope

- New biometric utility module
- New BiometricGate lifecycle component
- New Security settings section with toggle
- Android manifest permission
- Integration into App.tsx and settings navigation

## Files Changed

| File | Purpose |
|------|---------|
| `package.json` | Added `@capgo/capacitor-native-biometric@8.6.7` |
| `bun.lock` | Lockfile update |
| `android/app/src/main/AndroidManifest.xml` | Added `USE_BIOMETRIC` permission |
| `src/lib/native/biometric.ts` | **New.** Biometric utility: availability check, identity verification, preference persistence |
| `src/components/app/BiometricGate.tsx` | **New.** Lifecycle gate component — blocks rendering until biometric succeeds |
| `src/pages/settings/SecuritySettingsSection.tsx` | **New.** Settings toggle for app-lock opt-in |
| `src/pages/settings/settings-config.ts` | Added `security` section ID and entry |
| `src/pages/settings/index.ts` | Added `SecuritySettingsSection` export |
| `src/pages/Settings.tsx` | Added `SecuritySettingsSection` import and case |
| `src/App.tsx` | Mounted `BiometricGate` around authenticated content |

## Skills Used

NONE

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

### Plugin Selection

**Selected:** `@capgo/capacitor-native-biometric` v8.6.7

**Rationale:**
- Capgo-maintained — the same ecosystem behind `@capacitor/share`, `@capacitor/filesystem`, `@capacitor/push-notifications` already in this project.
- Latest version published 2 days before implementation. Actively maintained.
- Capacitor 8 compatible (v8.x line).
- Provides `isAvailable()`, `verifyIdentity()`, and `addListener('biometryChange', ...)` — exactly the three capabilities needed.
- No credential vault features used — only the biometric prompt and availability check.

### Biometric Gate Architecture

The gate sits in `App.tsx` between the session check and the `WorkspaceProvider`/`AppShell` stack:

```
Session valid → BiometricGate → WorkspaceProvider → EntityProvider → AppShell
```

- **Cold launch:** Gate renders `<PageLoader />` and prompts for biometric. On success, children render.
- **Background resume:** `@capacitor/app` `appStateChange` listener detects foreground transition, re-triggers biometric prompt.
- **Failure/cancel:** Calls `onAuthFailure` → `supabase.auth.signOut({ scope: 'local' })` → auth state listener shows Login screen.
- **Lock disabled (default):** Gate passes children through immediately with zero overhead.

### Lifecycle Hook Point

`CapacitorApp.addListener('appStateChange', ...)` — the same `@capacitor/app` plugin already used by `AndroidBackHandler.tsx` and `NativeAuthRedirect.tsx`. The listener tracks background/foreground transitions and triggers biometric verification on resume.

### Preference Persistence

Stored in `localStorage` under key `bigdrops_biometric_lock`. The same storage mechanism used for theme preferences, template selections, and other user-facing toggles throughout the app. The preference is read once on mount (`useState(() => isBiometricLockEnabled())`).

### Settings Toggle

New "App Lock" section under Preferences group in Settings. Shows:
- Toggle button (on/off) with visual state
- Unavailability notice when biometric hardware is absent or unenrolled
- Active status info when enabled
- "How It Works" summary card

The toggle is disabled/visually indicates unavailability when `checkBiometricAvailability()` returns `available: false`.

### Android Manifest

Added `<uses-permission android:name="android.permission.USE_BIOMETRIC" />` to `AndroidManifest.xml`.

## Verification Result

- `bun run audit:load`: passed (pre-existing warnings only)
- `bun run typecheck`: passed — zero errors
- `git status`: shows expected modified/untracked files only

## Risks or Limitations

- **Opt-in default is OFF.** Users must manually enable the lock in Settings. This was an explicit assumption — override if a different default is desired.
- **No per-screen re-lock.** The gate only triggers on cold launch and background resume. Navigating between screens within the app does not re-prompt. This matches the requested scope.
- **Preference survives sign-out.** If a user signs out and back in, the lock preference persists in localStorage. The gate reads it fresh on each mount.
- **No network dependency.** Biometric verification is a local device check. Works offline.
- **Plugin web fallback.** On web (non-native), the gate immediately passes children through. The settings toggle shows "only available on the installed Android or iOS app."

## Deferred Work

- **Per-screen re-lock for sensitive views** (e.g. payment recording, settings changes) — not requested, not built.
- **PIN fallback UI** — explicitly excluded per requirements.
- **Lock timeout configuration** (e.g. lock after 5 minutes vs immediately on background) — not requested.
- **Biometric enrollment change listener** — the plugin supports `addListener('biometryChange', ...)` for detecting enrollment changes while in background. This is wired into the gate's resume handler via `resetBiometricCache()`.
