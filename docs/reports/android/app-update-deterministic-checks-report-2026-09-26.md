# App Update Deterministic Checks Report

This report was written by Muse Spark on 2026-09-26 via OpenCode.

## Objective

Make concurrent update checks deterministic. Let manual Retry join an in-flight fresh check. Expose safe internal diagnostics. Keep truthful Settings copy and the controlled-promotion architecture.

## Scope

- In-flight check coordination in the update hook.
- Policy fetch classification (transport, no-row, malformed, valid).
- Safe diagnostic reason codes and sanitized logging.
- Focused tests for concurrency and diagnostics.
- No state-machine change. No Supabase change. No workflow change. No release or tag creation.

## Files Changed

- `src/hooks/useAppUpdate.ts` — shared in-flight coordinator, awaitable forced checks, diagnostic result, unexpected-exception fallback.
- `src/lib/appUpdate/releasePolicyClient.ts` — delegates to the pure domain classifier.
- `src/domain/appUpdate/policyFetchResult.ts` — new pure classifier and safe error-code extractor.
- `src/lib/appUpdate/checkCoordinator.ts` — new single-flight coordinator with fresh/stale join rules.
- `src/lib/appUpdate/updateDiagnostics.ts` — new reason codes, sanitized log builder, `[AppUpdate]` logger.
- `src/tests/critical/policyFetchOutcome.test.js` — new classifier tests.
- `src/tests/critical/checkCoordinator.test.js` — new concurrency tests.
- `src/tests/critical/updateDiagnostics.test.js` — new log-format and secret-safety tests.

## Skills Used

Skills used: karpathy, react-dev, capacitor-security, debugging-capacitor, supabase
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- A manual Retry joins an already-running fresh check and receives its result. It never returns null only because a check is active.
- A manual request during a stale local-only operation chains exactly one forced fresh check after settlement. No duplicate simultaneous fetches occur.
- Policy outcomes classify as valid, transport-error, no-row, or malformed. Only a safe RPC code is kept. Messages, URLs, and secrets never enter diagnostics.
- Each completed fresh check logs one sanitized `[AppUpdate]` line for adb logcat capture.
- Discovery failure records `discovery-failed` but never changes product state.
- Unexpected exceptions resolve to a safe fallback. Persisted expired grace keeps blocking. Grace rules are unchanged.

## Verification Result

- `bun run typecheck`: zero errors.
- Focused update tests: 38 pass, 0 fail.
- `git diff --check` on task files: clean.
- State machine, Settings copy, App shell, Supabase, and workflow files are untouched.
- `bun run audit:load`: not applicable (no schema, query, or data-layer change).
- `bun run build`: skipped due to hardware policy.
- `supabase db push`: not applicable.

## Supabase Push Status

Not applicable. No schema change. No policy mutation.

## Risks or Limitations

- A manual press while checks are disabled (web) or before any check still yields null and falls back to live state. This path is unchanged.
- The chained fresh check waits for the stale operation to settle first. Delay is bounded by one in-flight operation, with no polling.
- Console logging is always on but low volume (fresh full checks only). It carries reason codes alone.

## Deferred Work

- None for this task. The next physical-device test should capture the `[AppUpdate]` line to name the exact failure.
