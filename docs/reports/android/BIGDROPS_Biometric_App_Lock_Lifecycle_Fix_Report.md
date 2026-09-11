# Biometric App Lock Lifecycle Fix Report

This report was written by Muse Spark on 2026-09-11 via OpenCode.

Skills used: capacitor-best-practices, debugging-capacitor, framework-to-capacitor, capacitor-plugins, capacitor-security, ios-android-logs, mobile-android-design
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Break the repeat-prompt loop. One cold launch produces one prompt. Success unlocks and stays unlocked. Genuine background resume still locks.

## Scope

Two files only: `src/App.tsx` and `src/components/app/BiometricGate.tsx`. No changes to generation, storage, schema, permissions, dependencies, or UI.

## Files Changed

- `src/App.tsx` — inline `onAuthFailure` replaced with a stable `useCallback`.
- `src/components/app/BiometricGate.tsx` — one-shot launch guard, identity-free effects, resume hardening.

## Root Cause Addressed

Success called `setGated(false)`. The resulting `App` render created a new inline `onAuthFailure`. The new identity recreated `runVerification`. The cold-launch effect depended on it, so it fired again. Each unlock scheduled the next prompt.

## Exact Lifecycle Changes Made

- `App.tsx` defines `handleBiometricAuthFailure` with `useCallback` and an empty dependency array. Behavior is identical: local sign-out on failure. Identity is stable across renders.
- `BiometricGate` holds `runVerification` in a latest-ref. Both effects call the ref. Neither effect depends on callback identity.
- `BiometricGate` holds a `didLaunchVerification` ref. The cold effect runs launch verification once per enablement, then never again for that mount. Disabling resets the guard.
- The resume listener ignores `appStateChange` events while `verifying.current` is true. The native biometric sheet's own pause and resume can no longer set the background flag or relock the gate.
- Cleanup, `verifying` overlap guard, cancel and failure sign-out, and the disabled fast path are unchanged.

## Why the Loop Cannot Retrigger

The cold effect now depends only on `enabled`. Post-success renders change no input the effect reads. The one-shot guard blocks every later execution. Callback identity churn has no path to verification.

## Genuine Resume Versus Cold Launch

- Cold launch: one-shot guard, reason `"launch"`, once per mount.
- Resume: only when the app went inactive while no verification was in flight, then returned. Reason `"resume"`, exactly one verification per genuine transition.

## Verification Performed

- `bun run typecheck`: passed.
- `bun run audit:load`: not run. No schema, query, or data-layer code changed.
- `bun run build`: NOT run, per the permanent hardware exclusion.
- `git diff HEAD`: 2 files, 36 insertions, 12 deletions. No unrelated changes. No permission, manifest, dependency, or UI changes.

## Hardware Validation

Pending. A real Android device must confirm: one prompt on cold launch, unlock holds, one prompt after genuine background resume, cancel still signs out, disabled lock stays silent.

## Residual Risks

- If a future caller passes an unstable prop again, the ref pattern absorbs it. The one-shot guard is the structural backstop.
- The resume hardening assumes prompt-lifecycle events occur while `verifying` is true. Device logs should confirm the event ordering on the target handset.
- A remount of the gate (full sign-out and login) verifies once more. This preserves the security contract.
