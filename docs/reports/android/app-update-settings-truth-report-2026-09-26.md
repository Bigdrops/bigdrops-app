# App Update Settings Truth Report

This report was written by Muse Spark on 2026-09-26 via OpenCode.

## Objective

Fix the Settings update defects. Keep the controlled-promotion architecture. Make the APK updater Android-only.

## Scope

- Manual check contract in the update hook.
- Settings update section rendering.
- Platform boundary for Banner, Gate, Sheet, and Settings.
- Focused tests for the mapping and the promotion semantics.
- No Supabase change. No migration. No workflow change. No release or tag creation.

## Files Changed

- `src/hooks/useAppUpdate.ts` — `checkForUpdate` returns `Promise<CheckResult | null>`.
- `src/domain/appUpdate/settingsUpdateDisplay.ts` — new pure status mapping.
- `src/pages/settings/AppUpdateSettingsSection.tsx` — awaited check, truthful states.
- `src/pages/settings/settings-config.ts` — `androidOnly` item flag and filter.
- `src/App.tsx` — Android gate on Banner and Gate mounts.
- `src/tests/critical/appUpdateStateMachine.test.js` — two promotion tests.
- `src/tests/critical/settingsUpdateDisplay.test.js` — new mapping tests.

## Skills Used

Skills used: karpathy, react-dev, capacitor-best-practices, capacitor-security
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- `runCheck` returns the exact `{ state, release }` of the completed check. Forced checks bypass the 6-hour throttle. Forced checks await the release detail. Automatic checks keep the prior fire-and-forget path.
- Settings awaits `checkForUpdate()`. No timeout remains. The sheet opens only for `available`, `grace`, or `blocked` with a policy.
- Only resolved `up_to_date` shows green "Up to date". `unavailable` shows "Could not check for updates" with Retry.
- The `app-update` Settings item hides on web. The section returns null on web. Banner and Gate mount only on Android.
- Grace persistence logic is unchanged. Manual checks do not reset grace.
- Installed 1009 against approved 1007 still resolves `up_to_date`. A future promotion to 1010 will offer the update with no code change.

## Verification Result

- `bun run typecheck`: one error in `src/pages/settings/AdminSettingsSection.tsx`. The file is committed and untouched by this task. The error is pre-existing and unrelated. No error exists in changed files.
- `bun run test` (update files only): 25 pass, 0 fail.
- `bun run test` (full suite): unrelated files fail (`paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`). These files do not import changed code. The failures are pre-existing.
- `git diff --check` on task files: clean. Whitespace hits exist only in another agent's BOQ HTML file.
- 20-point static checklist: all items pass. Manual check bypasses throttle, is awaitable, and returns the exact result. No fixed delay exists. Green state requires confirmed `up_to_date`. Failure states show failure copy. Policy presence alone never opens the sheet. Android auto-check, Banner, Gate, Sheet, and download/install paths are intact. Web cannot mount Gate, Banner, Sheet, or the Settings updater. Promotion semantics are unchanged.
- `bun run build`: skipped due to hardware policy.
- `supabase db push`: not applicable.

## Supabase Push Status

Not applicable. No schema change. No policy mutation.

## Risks or Limitations

- A manual press during an in-flight check returns null and shows "Could not check for updates". The button disables while checking, so this path is rare.
- The countdown in the grace row uses live grace data. It can lag one frame after a manual check. The UpdateSheet shows the authoritative countdown.

## Deferred Work

- Fix the pre-existing `AdminSettingsSection.tsx` type error in a separate task.
- Fix the pre-existing unrelated critical-test failures in a separate task.
