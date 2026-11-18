# Llama.cpp Grammar Generation Repair Report

This report was written by Codex on 2026-09-29 via Codex desktop.

## Objective

Repair the shared Android llama.cpp constrained generation path.

Prevent the grammar stack from collapsing after the first `{` token.

Repair the Cleanup Local AI job lifecycle so repeated native failures do not leave the job in a running state.

## Scope

This task changed the native Android generation loop.

This task changed Java error propagation for native generation failures.

This task changed TypeScript job error timing and failed-job state handling.

This task added focused Local AI contract and native-source regression tests.

This task did not change model files, model hashes, model URLs, Cleanup Hub information architecture, Supabase schema, or financial logic.

## Structured Output Contract

The native grammar expects the full Cleanup Local AI result envelope.

The required top-level fields are:

- `response_type`
- `schema_version`
- `task_id`
- `cleanup_snapshot_id`
- `provider_id`
- `model_id`
- `proposals`

The required `proposal` fields are:

- `group_id`
- `decision`
- `winner_item_id`
- `merged_item_ids`
- `reason_codes`
- `reason`
- `referenced_evidence_ids`
- `warnings`

Allowed decision values are:

- `SAME_ITEM`
- `DIFFERENT_ITEM`
- `UNSURE`

Strings can use JSON escapes for quote, backslash, slash, common control characters, and Unicode escape sequences.

Whitespace can appear around separators where the grammar defines `ws`.

The grammar allows trailing whitespace after the final object brace.

End of generation can occur after the final brace and optional trailing whitespace.

The TypeScript validator remains authoritative after native output.

## Root Cause Proven Statically

The root cause was duplicate sampler acceptance.

The pinned llama.cpp commit is:

`4da6337767f973e2b4d0797e5b323d77d8565e4a`

In this commit, `llama_sampler_sample` is documented as:

`Sample and accept a token`

The implementation also calls `llama_sampler_accept(smpl, token)` before it returns the token.

The BIGDROPS JNI loop then called:

`llama_sampler_accept(sampler, next_token)`

This advanced the grammar state a second time for the same sampled token.

When the first sampled token was `{`, the grammar accepted `{` inside `llama_sampler_sample`.

The extra explicit accept tried to consume `{` again.

That matches the device failure:

`Unexpected empty grammar stack after accepting piece: {`

No model-family change was required.

No structured-output safety removal was required.

## Changes Made

- Removed the extra `llama_sampler_accept(sampler, next_token)` call from the JNI generation loop.
- Added a native comment that records the pinned API ownership rule.
- Added `token_sample` and `token_decode` stages to native failure tracking.
- Added elapsed timing to Java native generation rejection messages.
- Added TypeScript parsing for native elapsed timing.
- Stored native failure elapsed time on failed Cleanup AI group results.
- Marked early repeated-failure job termination as `failed`, not `completed`.
- Added static tests that prove the local JNI loop does not double-accept sampled tokens.
- Added static tests that prove the pinned llama.cpp source accepts tokens inside `llama_sampler_sample`.
- Added contract tests for canonical `SAME_ITEM`, `DIFFERENT_ITEM`, and `UNSURE` envelopes.
- Added malformed JSON and illegal enum rejection coverage.

## Files Changed

- `android/app/src/main/cpp/local_ai_jni.cpp`
- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/domain/cleanupLocalAIJob.ts`
- `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx`
- `src/tests/item-library/cleanupLocalAIJob.test.js`
- `src/tests/item-library/cleanupLocalAINativeContract.test.js`
- `docs/reports/ai/llamacpp-grammar-generation-repair-2026-09-29.md`

## Skills Used

Skills used: systematic-debugging, debugging-capacitor, capacitor-plugins, capacitor-testing, karpathy, typescript-advanced-types

Documentation standard: ASD-STE100 Simplified Technical English

## Compile-Proven Behavior

The JNI code compiles against the pinned llama.cpp headers.

The Android Java bridge compiles after the error propagation change.

The native target remains `arm64-v8a`.

The compile checks do not prove real-device inference success.

## Test-Proven Behavior

Focused tests prove:

- Canonical `SAME_ITEM` output validates.
- Canonical `DIFFERENT_ITEM` output validates.
- Canonical `UNSURE` output validates.
- Malformed JSON is rejected.
- Illegal decision enums are rejected.
- The local JNI loop no longer double-accepts a sampled token.
- The pinned llama.cpp `llama_sampler_sample` implementation accepts the sampled token.
- Native failure elapsed time is preserved in failed group results.
- A failed group is recorded and job progress can advance.
- Repeated failures stop the job according to policy.
- The selected model path remains threaded through the job runner.
- Multi-model manager behavior remains intact.

## Verification Result

- `bun test src/tests/item-library/cleanupLocalAI.test.js src/tests/item-library/cleanupLocalAIJob.test.js src/tests/item-library/cleanupLocalAINativeContract.test.js src/tests/local-ai/modelManager.test.js`: passed, 39 tests.
- `bun run typecheck`: passed.
- `android/gradlew.bat :app:externalNativeBuildDebug --no-daemon`: passed.
- `android/gradlew.bat :app:compileDebugJavaWithJavac --no-daemon`: passed.
- `git diff --check`: passed. Git reported line-ending warnings only.
- `bun run audit:load`: skipped. This task did not change schema, query, RPC, or data-layer logic.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.
- `git status`: not clean. It includes task changes and pre-existing unrelated changes.

## Supabase Push Status

Not applicable.

No migration was added.

No Supabase schema change was made.

## Device Validation Still Required

Device validation is still required.

The host cannot prove GGUF inference on a physical Android device.

Run one Cleanup AI review with Lite and Standard models.

Expected device result:

- Generation reaches token sampling.
- The first `{` does not collapse grammar state.
- The model completes a valid JSON envelope or fails with a different specific stage.
- TypeScript validation accepts valid output.
- Failed groups do not leave the job stuck in running state.

## Risks Or Limitations

- The grammar is source-checked and compile-checked, not device-proven after this repair.
- The tests prove the API misuse and local correction. They do not run full Android inference.
- The native failure message still carries stage tags for diagnostics.
- The inference grammar remains strict and may reject malformed model output.
- Manual cleanup remains available when AI fails.

## Deferred Work

- Run real-device validation for both Lite and Standard models.
- Record generation time, output token count, and validation result on device.
- If device output still fails, inspect the new stage tag before changing the grammar.
