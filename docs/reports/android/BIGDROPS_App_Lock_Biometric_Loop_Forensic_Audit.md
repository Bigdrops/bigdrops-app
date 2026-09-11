# BIGDROPS App Lock Biometric Loop Forensic Audit

This report was written by Muse Spark on 2026-09-11 via OpenCode.

Skills used: capacitor-best-practices, capacitor-plugins, debugging-capacitor, webapp-to-capacitor, capacitor-security, capacitor-performance, capacitor-offline-first, capacitor-push-notifications, framework-to-capacitor, safe-area-handling, tailwind-capacitor, ios-android-logs, mobile-android-design
Documentation standard: ASD-STE100 Simplified Technical English

## Executive Summary

The biometric loop is a React lifecycle defect. It is not a plugin defect.

The success callback sets the unlock state. A parent re-render then discards that result. The cold-launch effect fires again. The app prompts for biometrics again.

The trigger chain is short:

- `App.tsx` passes an inline `onAuthFailure` closure to `BiometricGate`.
- Each `App` render creates a new closure identity.
- The new identity recreates `runVerification`.
- The recreated `runVerification` retriggers the cold-launch effect.
- The cold-launch effect calls `verifyIdentity` again.
- Successful unlock causes more `App` renders. The cycle repeats.

A second vector can compound the loop. The resume listener treats any background-to-foreground transition as a lock event. The native biometric sheet can background the WebView. The app then relocks itself after a successful scan.

## User-Observed Behavior

- User opens Settings → App Lock.
- User enables Biometric App Lock.
- UI states that protection applies on the next launch.
- User restarts the app.
- Biometric prompt appears.
- User authenticates with fingerprint.
- App does not stay unlocked.
- Biometric prompt appears again.
- Successful authentication repeats indefinitely.

The settings screen works. The defect occurs after successful authentication.

## Relevant Architecture

The flow uses four files:

- `src/lib/native/biometric.ts` stores the setting and wraps the plugin.
- `src/pages/settings/SecuritySettingsSection.tsx` toggles the setting.
- `src/App.tsx` reads the setting once and mounts the gate.
- `src/components/app/BiometricGate.tsx` prompts for biometrics and gates children.

The plugin is `@capgo/capacitor-native-biometric` version `8.6.7`. The app uses Capacitor 8 (`@capacitor/core` `8.3.0`, `@capacitor/app` `8.1.0`, `@capacitor/android` `8.3.0`). The web build output is `dist`.

There is one `BiometricGate` mount. It sits inside the `/*` route in `App.tsx`. It renders only when a session exists. `TenantGate` is a workspace gate. It does not invoke biometrics.

`MainActivity.java` contains no biometric code. It handles edge-to-edge display, swipe refresh, and the fold-awareness plugin only.

## App Lock State Flow

The table below lists each state element.

| State | Location | Type | Default | Set to locked | Set to unlocked |
|---|---|---|---|---|---|
| Enabled flag | `localStorage["bigdrops_biometric_lock"]` | Persisted string | Absent (disabled) | `SecuritySettingsSection` toggle writes `"true"` | Toggle removes the key |
| Session snapshot | `biometricLockEnabled` in `App.tsx:81` | React state, read once at mount | Value from `localStorage` | App restart only | App restart only |
| Gate prop | `enabled` on `BiometricGate` | Prop | From `App` state | App restart only | App restart only |
| Canonical runtime lock | `gated` in `BiometricGate.tsx:37` | React state, starts `true` | `true` | Resume listener sets `true` before re-verification | `runVerification` sets `false` on success |
| Background marker | `wasInBackground` ref | Ref, starts `false` | `false` | `appStateChange` with `isActive === false` | Next foreground event consumes it |
| In-flight guard | `verifying` ref | Ref, starts `false` | `false` | `runVerification` entry | `runVerification` `finally` block |
| Availability cache | `cachedAvailability` module variable | Module cache | `null` | First `checkBiometricAvailability` call | `resetBiometricCache` clears it |

Key facts:

- The enabled flag lives in `localStorage`. Web builds always read `false`.
- `App.tsx` never refreshes `biometricLockEnabled` after mount. The toggle applies on next launch. This matches the UI text.
- The canonical lock is the `gated` boolean. Success sets it to `false`. Nothing else writes it except the resume path, which sets it back to `true`.
- No second lock state exists. No other component holds lock state.

## Biometric Invocation Flow

Two effects can invoke verification. Both live in `BiometricGate.tsx`.

Cold-launch effect (`lines 77-84`):

- Runs when `enabled` or `runVerification` changes.
- Skips only when disabled or non-native. Then it sets `gated` to `false`.
- Otherwise it calls `runVerification("launch")`.
- It does not check `gated`. It does not check `verifying`. It has no mount-only guard.

Resume listener effect (`lines 87-121`):

- Registers one `appStateChange` listener when `enabled` and native.
- Cleans up on unmount or dependency change. Cleanup sets `cancelled` and removes the listener.
- On `isActive === false`, it marks `wasInBackground` as `true`.
- On foreground with the marker set, it clears the marker, sets `gated` to `true`, and calls `runVerification("resume")`.

`runVerification` (`lines 41-74`):

- Returns early when `verifying.current` is `true`. This blocks overlap only.
- Resets the availability cache.
- Checks availability. Unavailable devices trigger `onAuthFailure` (sign-out).
- Calls `verifyBiometricIdentity`.
- Success sets `gated` to `false`.
- Cancel or failure calls `onAuthFailure`.
- The `finally` block resets `verifying` to `false`. The guard does not persist across sequential calls.

## Successful Authentication Flow

The success path is:

1. `verifyBiometricIdentity` resolves. The plugin promise resolves without a value.
2. The wrapper returns `{ success: true }`.
3. `runVerification` calls `setGated(false)`.
4. `BiometricGate` renders children.
5. Children mount: `WorkspaceProvider`, `EntityProvider`, `TenantGate`, `AppShell`.
6. Mounting and startup updates re-render `App`. Sources include session, profile, offline access, splash timer, and tips.
7. Each `App` render creates a new inline `onAuthFailure` closure.
8. The new closure recreates `runVerification` (its sole dependency).
9. The cold-launch effect sees a changed dependency. It fires again.
10. `verifying.current` is already `false` again. Verification starts again.
11. The prompt appears again.

Step 7 is the break. The unlock state changes correctly. The trigger condition ignores it.

## Cold Launch Flow

The sequence is:

1. App starts. `App.tsx:81` reads `localStorage`. Enabled is `true`.
2. Session restores. Route renders `BiometricGate` with `enabled={true}`.
3. `gated` starts as `true`. The gate shows `PageLoader`.
4. Cold-launch effect fires. It calls `runVerification("launch")`.
5. Availability check passes. Native prompt appears.
6. User authenticates. `setGated(false)` runs. Children render.
7. Post-unlock renders recreate `onAuthFailure` and `runVerification`.
8. Cold-launch effect fires again. Native prompt appears again.
9. Each further success causes further renders. The loop has no exit.

`StrictMode` (`main.tsx:53`) double-invokes effects in development. This adds duplicate prompts in dev builds. It is not the production root cause. The unstable-callback chain loops in production without `StrictMode`.

## Background Resume Flow

The intended sequence is:

1. App is unlocked. `gated` is `false`.
2. User backgrounds the app. `appStateChange` fires with `isActive === false`. Marker becomes `true`.
3. User foregrounds the app. Listener clears the marker, sets `gated` to `true`, and verifies.
4. Success sets `gated` to `false`.

The hazard is step 2. The native biometric sheet itself can pause the WebView activity. Then:

1. Cold-launch verification starts. Native prompt shows.
2. The OS pauses the WebView. `appStateChange` fires `isActive === false`. Marker becomes `true`.
3. User completes the scan. The app foregrounds. Listener fires.
4. Listener sets `gated` to `true` and verifies again.
5. The prompt appears again after a success.

This vector is a strong inference. It needs device-log confirmation. It is independent of the confirmed cold-launch loop. Both vectors set `gated` to `true` after a success. Both call verification again.

## Duplicate Trigger / Listener Analysis

- Only one `BiometricGate` instance exists. Grep finds one mount in `App.tsx`.
- Only one `appStateChange` registration exists in `src`. It is the resume listener.
- The resume listener cleans up correctly on paper. It nulls the listener and sets `cancelled`.
- Re-registration still occurs. Each `runVerification` recreation tears down and rebuilds the listener. Rapid cycles can interleave events across listener generations.
- No `visibilitychange` handler touches biometrics. `useSyncBootstrap` uses one for sync only.
- No second gate exists. `TenantGate` handles workspace states. `NativeAuthRedirect` handles `appUrlOpen`. `AndroidBackHandler` handles the back button.
- `StrictMode` duplicates effect execution in development. Production builds do not double-invoke. The reported loop matches production behavior.
- The `verifying` ref blocks concurrent calls. It does not block sequential re-invocation after `finally` resets it.
- The `wasInBackground` ref has no timestamp. Any background event, however brief, triggers a full relock on next foreground.

## Native Capacitor Integration Analysis

API use is correct:

- `NativeBiometric.isAvailable()` checks hardware and enrollment.
- `NativeBiometric.verifyIdentity()` prompts with title, subtitle, reason, and cancel text.
- Dynamic `import()` loads the plugin only on native paths. Web paths return early.
- Cancel codes `11`, `15`, `16`, `17` map to cancel. Other errors map to failure. Both call `onAuthFailure`, which signs out locally.
- The plugin is not invoked twice by one call site. Duplicate prompts come from repeated effect execution, not from one call emitting twice.
- Availability caching is safe. `runVerification` resets the cache before each check.
- No Android-specific biometric options are missing for this symptom. The loop occurs after the plugin already succeeded.
- `MainActivity.java` registers no biometric plugin and overrides no auth lifecycle. Native custom code does not cause the loop.

## Root Cause

The cold-launch effect retriggers after every successful unlock.

The mechanism is exact:

- `App.tsx:586-588` defines `onAuthFailure` inline. Its identity changes on each `App` render.
- `BiometricGate.tsx:73` depends on `onAuthFailure`. `runVerification` gets a new identity on each `App` render.
- `BiometricGate.tsx:84` depends on `runVerification`. The cold-launch effect re-executes on each `App` render.
- The effect body has no `gated` check. It calls verification even when the gate already unlocked.
- `setGated(false)` on success causes child mounting and startup updates. These re-render `App`. Each render schedules another prompt.

The success callback works. The trigger ignores the success. That mismatch is the loop.

The resume listener is a secondary contributor. It relocks on any foreground transition after any background flag. A biometric-induced pause can self-trigger it. This needs log confirmation. Fix the primary chain first. Then verify whether the secondary chain still fires.

## Evidence

Confirmed facts from repository code:

- `BiometricGate.tsx:37`: `gated` starts `true` on every mount.
- `BiometricGate.tsx:41-44`: `runVerification` early-returns only while `verifying.current` is `true`.
- `BiometricGate.tsx:60-61`: success calls `setGated(false)` and nothing else.
- `BiometricGate.tsx:69-70`: `finally` resets `verifying.current` to `false`.
- `BiometricGate.tsx:73`: dependency array is `[onAuthFailure]`.
- `BiometricGate.tsx:77-84`: cold effect depends on `[enabled, runVerification]` and never reads `gated`.
- `BiometricGate.tsx:106-110`: foreground path sets `gated` to `true` before verification.
- `App.tsx:81`: `biometricLockEnabled` initializes once. Its setter has no other caller.
- `App.tsx:584-588`: `onAuthFailure` is an inline arrow. No `useCallback` stabilizes it.
- `biometric.ts:104-110`: plugin resolves on success. Wrapper returns `{ success: true }`.
- `biometric.ts:111-121`: cancel and failure return `{ success: false }`. Both lead to sign-out.
- `main.tsx:53`: `StrictMode` is present.
- `MainActivity.java`: no biometric or auth-lifecycle code.
- Grep over `src` finds one `BiometricGate` mount and one `appStateChange` listener.

Strong inference (needs device logs):

- The native biometric sheet pauses the WebView and emits `appStateChange` inactive/active around the prompt. This would make the resume listener self-trigger.

## Why Successful Authentication Does Not Stop the Prompt

Success updates `gated`. Nothing in the trigger path reads `gated`.

The cold-launch effect fires on dependency identity, not on lock state. Its inputs are `enabled` and `runVerification`. Success changes neither input. Post-success renders change `runVerification` identity through the unstable parent callback. The effect therefore fires precisely because the app unlocked and re-rendered.

The `verifying` guard cannot stop this. It resets in `finally` before the next scheduled invocation. It prevents overlap. It does not prevent repetition.

## Minimal Recommended Fix

Do not implement during this audit. The downstream agent should apply the smallest correction that preserves the security model:

1. Stabilize the parent callback. Wrap `onAuthFailure` in `useCallback` in `App.tsx`, or move sign-out into a stable ref callback.
2. Make the cold-launch effect mount-only. Add a `didLaunchRef` guard so it runs once per mount while `enabled` and native. Do not depend on `runVerification` identity.
3. Check state before prompting. Skip verification in the cold path when `gated` is already `false` or `verifying` is already `true`.
4. Scope the resume listener to genuine backgrounding. Ignore foreground transitions while a verification is in flight. Consider a short background-duration threshold so a biometric-induced pause does not relock.
5. Keep failure behavior unchanged. Cancel and failure still sign out.

Expected invariant after the fix:

- Biometric success → `gated` becomes `false` → no trigger condition remains `true` → no further prompt until the next genuine launch or background resume.

## Regression Risks

- Over-suppressing prompts weakens security. A mount-only guard must not skip the first prompt.
- Ignoring short background gaps can skip a legitimate lock. Tune any threshold with care.
- Stabilizing callbacks changes sign-out closure capture. Confirm sign-out still uses fresh Supabase state.
- `StrictMode` double effects can mask or mimic the fix in dev. Verify on a production build and a real device.
- Disabling the lock must still prevent all prompts. Confirm the `!enabled` early path still sets `gated` to `false`.
- Unavailable biometrics must still fail to sign-out. Do not change the availability branch.

## Verification Plan

No build, typecheck, or lint ran in this audit. The downstream agent should verify with logs, not speculation:

1. Reproduce on a real Android device with the lock enabled.
2. Capture `adb logcat` filtered to the app package during: launch → prompt → success → second prompt.
3. Log effect executions with launch versus resume reasons and timestamps.
4. Log `appStateChange` events with `isActive` values around the native prompt window.
5. Confirm one `verifyIdentity` call per genuine launch after the fix.
6. Confirm background for several seconds still relocks and prompts once.
7. Confirm cancel and failure still sign out to login.
8. Confirm disabling the lock removes all prompts after restart.
9. Repeat on iOS hardware if the app ships there.

## Files Inspected

- `src/components/app/BiometricGate.tsx` (full file, 130 lines)
- `src/lib/native/biometric.ts` (full file, 122 lines)
- `src/pages/settings/SecuritySettingsSection.tsx` (full file, 150 lines)
- `src/App.tsx` (gate mount at `584-602`, state init at `81`, shell at `555-617`, bootstrap at `130-199`)
- `src/main.tsx` (full file, `StrictMode` at `53`)
- `src/lib/native/capacitor.ts` (full file, platform helpers)
- `capacitor.config.ts` (`webDir: dist`, back-button and SystemBars settings)
- `package.json` (Capacitor 8 set, `@capgo/capacitor-native-biometric` `8.6.7`)
- `android/app/src/main/java/com/bigdrops/app/MainActivity.java` (no biometric code)
- `src/components/app/NativeAuthRedirect.tsx` (`appUrlOpen` listener only)
- `src/components/app/AndroidBackHandler.tsx` (back-button listener only)
- `src/app/useSyncBootstrap.ts` (`visibilitychange` for sync only)

## Task Compliance

- Objective: Trace the App Lock biometric loop and name the root cause. Complete.
- Scope: State, lifecycle, listeners, closures, native integration, app gate. No code changes.
- Files changed: One new report. Zero source files changed.
- Changes made: None to application code, schema, config, or dependencies.
- Verification result: `git status` before audit showed a clean tree. Post-report status check is pending in the closing step. No build, typecheck, or lint ran per the audit gate.
- Risks or limitations: The secondary resume self-trigger needs device-log proof. Web builds cannot reproduce native prompts.
- Deferred work: Minimal fix is documented only. Implementation belongs to a downstream task.

## Conclusion

The plugin succeeds. The app unlocks. The app then asks again.

The cold-launch effect depends on callback identity instead of lock state. Each unlock re-renders the parent. Each render creates a new callback. Each new callback refires the effect. The loop ends only when renders stop.

Stabilize the callback. Guard the launch effect. Scope the resume listener. Then confirm with device logs that one genuine launch produces exactly one prompt.
