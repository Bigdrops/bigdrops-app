# Release Logging Observability Report

This report was written by Muse Spark on 2026-09-27 via OpenCode.

## Objective

Make sanitized `[AppUpdate]` diagnostics reach ADB logcat on signed test-release builds. Change configuration only. Fix no update-check behavior.

## Scope

- `capacitor.config.ts` gains `android.loggingBehavior: 'production'`.
- No product code change. No Supabase change. No workflow change.

## Files Changed

- `capacitor.config.ts` — Android logging behavior override with reason comment.

## Skills Used

Skills used: capacitor-best-practices, debugging-capacitor
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Release logging stays enabled. Default `debug` behavior silences all Capacitor and WebView console output in signed non-debuggable builds. `production` keeps logs always on.
- Remote WebView debugging stays off. No `webContentsDebuggingEnabled` key exists.
- The `[AppUpdate]` payload is unchanged: reason codes, booleans, and one sanitized RPC code. No secrets, tokens, URLs, or raw messages.

## Verification Result

- Installed Capacitor is 8.4.0. Its `CapacitorConfig` type declares `android.loggingBehavior?: 'none' | 'debug' | 'production'`. Type docs state `production` means logs are always produced, including JavaScript-redirected console statements.
- Native semantics match: `production` forces `loggingEnabled = true` regardless of debuggable state.
- `bun run typecheck`: zero errors.
- `git diff --check` on the task file: clean.
- `bun run audit:load`: not applicable (no schema, query, or data-layer change).
- `bun run build`: skipped due to hardware policy.
- `supabase db push`: not applicable.

## Supabase Push Status

Not applicable. No schema change. No policy mutation.

## Risks or Limitations

- Logs now emit on release builds. Volume stays low (fresh update checks only). Payload carries no secrets.
- Runtime validation needs the next signed APK: clear logcat, filter `AppUpdate|Capacitor/Console`, press Retry once, read the `[AppUpdate]` line. Static inspection cannot replace that step.

## Deferred Work

- The underlying update-check failure stays open. Use the newly visible diagnostic line to name it on the next device test.
