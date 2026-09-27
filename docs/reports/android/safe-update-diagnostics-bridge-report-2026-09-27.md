# Safe Update Diagnostics Bridge Report

This report was written by Muse Spark on 2026-09-27 via OpenCode.

## Objective

Stop sensitive values from reaching release logcat. Remove unrestricted production console logging. Keep sanitized `[AppUpdate]` diagnostics visible through a narrow native path. Change no update behavior.

## Scope

- FCM token log source attribution (read-only search).
- One native diagnostic method on the existing update plugin.
- TypeScript routing with console fallback.
- Config revert to default release logging behavior.

## Files Changed

- `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java` — `logDiagnostic` method.
- `src/lib/native/apkUpdate.ts` — interface entry and guarded wrapper.
- `src/lib/appUpdate/updateDiagnostics.ts` — native-first routing.
- `capacitor.config.ts` — removed `loggingBehavior: 'production'` override.

## Skills Used

Skills used: capacitor-security
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- No application-controlled code logs the FCM token value. Exhaustive search of all console calls, push registration, permission handling, and token storage paths found no token-value logging. The observed `{"value":...}` lines originate below the application layer. No app logging required removal.
- The `loggingBehavior: 'production'` override is reverted. Release builds return to quiet logcat. No remote WebView debugging was added.
- `ApkUpdatePlugin.logDiagnostic` writes one bounded single line via `android.util.Log` under tag `BIGDROPS/Update`. This path ignores the Capacitor release logging gate.
- `logAppUpdateDiagnostic` tries the native bridge first and falls back to WebView console output where the plugin is absent. Payload format is unchanged.
- Update state machine, check coordination, policy classification, grace rules, discovery, installer, promotion model, and platform boundary are unchanged.

## Verification Result

- `bun run typecheck`: zero errors.
- Focused update tests: 38 pass, 0 fail.
- `git diff --check` on task files: clean.
- `bun run audit:load`: not applicable (no schema, query, or data-layer change).
- `bun run build`: skipped due to hardware policy.
- `supabase db push`: not applicable.

## Supabase Push Status

Not applicable. No schema change. No policy mutation.

## Risks or Limitations

- The native method ships with the next signed APK. Until then, release logcat stays quiet and diagnostics stay invisible there. This is the intended safe state.
- The exact below-application emitter of the token echo stays unidentified from repository evidence. The exposure is closed by silencing release console output.
- Out-of-scope observations from device evidence remain open: PostgREST schema-exposure CORS failure, `ExecuteSet: No value for values` sync errors, invalid SVG path `d="undefined"`. No action taken on these.

## Deferred Work

- Human runtime validation on the next signed APK: filter logcat for `BIGDROPS/Update` or `AppUpdate`, press Retry once, confirm one sanitized line.
- Push listener effect re-subscribes on every parent render because its callback identity changes. This causes repeated native registration work. It does not leak the token from application code. A future task may stabilize the callback.
