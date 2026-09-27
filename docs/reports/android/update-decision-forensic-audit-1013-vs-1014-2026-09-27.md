# Update Decision Forensic Audit: 1013 vs 1014

This report was written by Muse Spark on 2026-09-27 via OpenCode.

## Objective

Trace the exact causal chain from policy RPC to diagnostic output. Explain `policy=valid discovery=not-attempted` under installed 1013 and approved 1014. Change nothing.

## Scope

Read-only code inspection. No source, test, Supabase, workflow, release, tag, commit, or build activity.

## Files Inspected

- `src/hooks/useAppUpdate.ts` (orchestration, lines 131, 180, 208-222, 281-284, 435)
- `src/domain/appUpdate/updateStateMachine.ts` (lines 34, 52, 119-125, 222, 234-261, 272)
- `src/domain/appUpdate/policyFetchResult.ts` (line 22, classifier)
- `src/lib/appUpdate/releasePolicyClient.ts` (delegation to classifier)
- `src/lib/appUpdate/appVersion.ts` (lines 44-46)
- `src/lib/appUpdate/releaseDiscovery.ts` (unchanged, prior verified reads stand)
- `src/pages/settings/AppUpdateSettingsSection.tsx` (lines 37-38, 57-58)
- `src/tests/critical/appUpdateStateMachine.test.js` (raw snake_case inputs)

## Skills Used

Skills used: debugging-capacitor
Documentation standard: ASD-STE100 Simplified Technical English

## Root Cause

The hook feeds the already-validated policy object where the state machine requires the raw row. The machine re-validates it against the row schema, rejects it, and resolves `unavailable` with a null policy. Discovery never runs.

Exact chain with runtime values:

1. Fetch succeeds. `policyResult.policy` is the validated camelCase object `{ versionCode: 1014, versionName: '1.0.14', mandatory: true, effectiveAtMs, apkAssetPrefix, webReleaseUrl, releaseNotes }`. Diagnosis is `valid`.
2. `useAppUpdate.ts:180` passes `rawPolicy: policyResult.policy`. The input contract (`updateStateMachine.ts:83`) requires the raw row pre-validation.
3. `updateStateMachine.ts:222` re-validates. `validateReleasePolicy` reads snake_case `row.version_code` (line 124). The camelCase object has no such field, so parsing yields null and validation returns null (lines 124-125).
4. State policy is null. Installed version is number 1013. No persisted anchor can exist, because anchors persist only from resolved mandatory targets, which this path never reaches.
5. Line 234 branch: persisted is null, and `rawPolicy == null` is false (it is a non-null object), so line 243 returns `unavailable`.
6. `useAppUpdate.ts:208-209`: discovery initializes `not-attempted`; the `if (nextState.policy)` gate fails, so the forced fetch never runs.
7. Diagnostics keep fetch-level `policy=valid` with state-level null policy. Reason stays `ok` (no transport error, no malformed row, version known). The emitted line matches the device log verbatim.
8. Settings renders the exact returned object as "Could not check for updates". Presentation is correct. The decision is wrong.

## Boundary Results

| Boundary | Result | Evidence |
|---|---|---|
| 1. Installed version acquisition | PASS | `Number(info.build)`, integer-checked; device UI proves number 1013 |
| 2. Policy fetch | PASS | Diagnosis `valid`; live row verified |
| 3. Policy validation/classification | PASS | Row validates; camelCase policy produced |
| 4. State-machine input construction | FAIL | Validated object passed as raw row (`useAppUpdate.ts:180`) |
| 5. Version comparison | EXCLUDED | Numeric and correct (`compareVersionCodes`), but never reached with a policy |
| 6. Grace/persistence handling | EXCLUDED | Anchors key by target VersionCode; none can exist on this path |
| 7. Resolved state | FAIL | `unavailable` instead of expected `grace` |
| 8. Discovery decision | FAIL | Gate `if (nextState.policy)` fails; fetch never attempted |
| 9. Release selection | NOT RUNTIME-OBSERVABLE | run14 asset satisfies every validator by static inspection |
| 10. Settings presentation | PASS | Renders the exact returned result truthfully |
| 11. Diagnostic generation | PASS | Line built from current-check values; matches device output exactly |

## Answers to the Twenty Questions

1. The validated camelCase policy object reaches `resolveUpdateState`, not the raw row.
2. It is passed directly as `rawPolicy`. No copy, cache, or memo. Only grace anchors persist, and none can exist here.
3. Installed VersionCode comes from `@capacitor/app getInfo().build`.
4. Runtime type is number (integer above zero) or null. The device proves 1013 as number.
5. With a correct raw row the machine must return `grace`. With the actual hook input it returns `unavailable`.
6. Mandatory with fresh `effective_at` produces `grace` (deadline 2026-09-30T17:36:39Z, still future).
7. Discovery executes if and only if the resolved state policy is non-null.
8. `not-attempted` is the initializer, overwritten only in the forced-check branch when a policy exists.
9. Discovery runs after state resolution and depends on policy presence, not on status.
10. Yes. Fetch-level `valid` coexists with state-level null policy through the double-validation path above.
11. No. Diagnostics derive synchronously from the same check. Joined calls carry an explicit flag.
12. `checkForUpdate` returns the exact result object. Settings stores and renders that same object.
13. Presentation could diverge in theory. Here it does not. The failure sits in the decision layer.
14. Comparison is numeric. 1013 versus 1014 yields -1. The branch is unreachable while policy stays null.
15. Anchors key by target VersionCode, so a new target supersedes any old anchor. No interference is possible here.
16. No persisted `up_to_date` mechanism exists. That state clears persistence and stores nothing.
17. Throttle has no effect on forced checks. The `!force` guard and forced routing prove this.
18. Discovery needs policy VersionCode, asset prefix, and repository identity. The web release URL serves only the fallback button.
19. First update UI needs state plus policy. Download metadata needs discovery success.
20. The observed line is inevitable under current code: valid fetch diagnosis, null state policy, skipped gate, `unavailable` status.

## Why Tests Pass While Production Fails

Tests feed raw snake_case rows directly into `resolveUpdateState`. They never compose classifier output into machine input. The production composition path has no test. This gap is structural, not incidental.

## Minimum Correction (Not Implemented)

Thread the raw row through the client result and pass it as `rawPolicy`, keeping the documented contract. Add one regression test composing classifier output into `resolveUpdateState` for installed 1013 against approved 1014, asserting `grace` state, non-null policy, and discovery eligibility. No state-machine change is required.

## Verification

- Git status before and after: only pre-existing unrelated entries plus this report file. Zero application, test, workflow, migration, or Supabase modifications.
- No build, typecheck, lint, audit, tests, or database push executed.
- No Supabase mutation. No release or tag activity.
- Live policy was not re-read; the supplied verified values suffice and the defect is input-shape deterministic.

## Risks or Limitations

- None introduced. This task changed no behavior.

## Deferred Work

- Implement the correction above in a separate code task with the regression test.
- After the fix, the 1013 device should resolve `grace` against 1014 and offer the verified run14 APK.
