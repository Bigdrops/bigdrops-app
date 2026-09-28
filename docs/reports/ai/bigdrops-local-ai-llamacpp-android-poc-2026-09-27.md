# BIGDROPS Local AI Llama.cpp Android POC Report

This report was written by Codex on 2026-09-27 via Codex desktop.

## Objective

Implement the Phase 2 Local AI proof of concept for Item Library Cleanup Hub.

The target path was:

Cleanup Hub candidate -> TypeScript task -> Capacitor Android bridge -> llama.cpp -> GGUF model -> structured result -> TypeScript validation -> read-only proposal.

## Scope

In scope:

- One bounded Cleanup Hub AI task contract.
- One strict Cleanup AI result validator.
- A read-only Cleanup Hub Local AI proposal panel.
- A narrow Capacitor Android plugin named `LocalAI`.
- Android runtime diagnostics for model, ABI, and generation state.
- Focused tests for the TypeScript validation contract.
- Documentation of the llama.cpp and model integration state.

Out of scope:

- Item Library mutation.
- Catalog merge.
- Historical row linking.
- Alias creation.
- Keep Separate writes or revokes.
- Supabase schema changes.
- Model download UI.
- Production model manager.
- AI apply flow.

## Files Changed

- `android/app/src/main/java/com/bigdrops/app/MainActivity.java`
- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/domain/cleanupLocalAI.ts`
- `src/modules/item-library/components/ItemLibraryLocalAIReviewPanel.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/tests/item-library/cleanupLocalAI.test.js`
- `docs/reports/ai/bigdrops-local-ai-llamacpp-android-poc-2026-09-27.md`

## Skills Used

Skills used: capacitor-best-practices, capacitor-plugins, react-dev, typescript-advanced-types, webapp-testing, capacitor-security, debugging-capacitor, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### Cleanup AI Task Contract

Added `cleanupLocalAI.ts`.

The task is bounded to one real Cleanup Hub duplicate group. It includes:

- `task_type`
- `schema_version`
- `task_id`
- locked Cleanup `snapshot_id`
- group ID
- candidate item IDs
- names
- aliases
- usage counts
- last price
- evidence IDs
- active reviewed-separate constraints
- explicit identity safety rules

The task does not include full catalog data, document bodies, bank data, tax data, or unrelated customer data.

### Cleanup AI Result Validation

Added strict validation for local AI output.

The validator rejects:

- invalid JSON
- wrong response type
- wrong schema version
- wrong task ID
- wrong snapshot ID
- wrong provider ID
- missing model ID
- unknown group ID
- unknown item ID
- item IDs outside the group
- evidence IDs outside the task
- duplicate proposals
- self merge
- `SAME_ITEM` without a winner
- `SAME_ITEM` without merge candidates
- `DIFFERENT_ITEM` or `UNSURE` with merge IDs
- active reviewed-separate conflicts

Invalid output returns no parsed result. It cannot reach a mutation path.

### Native TypeScript Wrapper

Added `src/lib/native/localAI.ts`.

It exposes:

- `getLocalAIRuntimeInfo`
- `loadLocalAIModel`
- `analyzeCleanupTaskWithLocalAI`
- `cancelLocalAIGeneration`
- `unloadLocalAIModel`

The wrapper does not expose raw GGUF paths. It does not expose shell commands, JNI pointers, or database mutation methods.

### Android Plugin

Added `LocalAIPlugin.java` and registered it in `MainActivity`.

The plugin exposes:

- `getRuntimeInfo`
- `loadModel`
- `analyzeCleanupTask`
- `cancelGeneration`
- `unloadModel`

The plugin owns model/runtime state.

The plugin uses app-private model storage:

`files/local-ai/models/`

The plugin rejects arbitrary model IDs. It accepts only simple file-safe model IDs.

The plugin reports ABI information and whether the native llama.cpp runtime is linked.

### Important Runtime Finding

The repository has no current native llama.cpp source, AAR, CMake configuration, JNI wrapper, or Gradle native build path.

The plugin therefore reports:

`runtimeLinked: false`

It rejects `loadModel` and `analyzeCleanupTask` until a pinned llama.cpp Android runtime is linked.

This is intentional. The POC must not fake native inference.

### Cleanup Hub UI

Added `ItemLibraryLocalAIReviewPanel`.

The panel appears in manual duplicate review.

It can:

- build a locked local AI task from the current cleanup export
- show snapshot ID
- show model ID
- check native runtime state
- request local analysis
- cancel generation
- unload model memory
- show only validated read-only proposals

The panel does not render an Apply button.

It does not call:

- `mergeItems`
- cleanup apply handlers
- historical reconciliation RPCs
- Keep Separate mutation methods
- Supabase clients

### POC Model

Selected POC model:

- Source: `QuantFactory/Qwen3-0.6B-GGUF`
- Quantization: `Q4_K_M`
- File: `Qwen3-0.6B.Q4_K_M.gguf`
- Approximate file size: 484 MB
- License: Apache 2.0
- Base model family: Qwen3 dense 0.6B
- Context class: Qwen3 0.6B model card states 32K context
- Expected use: benchmark only

No model file was downloaded or committed.

Development placement for a future linked runtime:

1. Download only the selected GGUF file.
2. Verify the checksum from the selected source or a BIGDROPS manifest.
3. Place it in app-private storage as:
   `files/local-ai/models/qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf`
4. Do not use public Documents.
5. Do not move the file through base64.

The production model downloader is deferred.

## Source Evidence

External sources inspected:

- `https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md`
- `https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md`
- `https://huggingface.co/QuantFactory/Qwen3-0.6B-GGUF`
- `https://qwenlm.github.io/blog/qwen3/`
- `https://github.com/QwenLM/Qwen3`

Relevant evidence:

- llama.cpp Android guidance describes loading GGUF metadata from a `Uri` or app-private `File`, and loading a model through an app-private file path.
- llama.cpp grammar documentation supports GBNF and JSON schema constrained output.
- Qwen3 0.6B is listed in the Qwen3 dense model family under Apache 2.0.
- QuantFactory publishes a Qwen3 0.6B GGUF Q4_K_M file of about 484 MB under Apache 2.0.

## Read-Only Safety

Stage 2 POC remains read-only.

No code path added by this task can:

- merge Item Library catalog items
- create catalog items
- create aliases
- write historical `item_id`
- write Keep Separate
- revoke Keep Separate
- call merge RPCs
- call historical reconciliation RPCs
- call Supabase
- alter financial values

The validator produces a read-only result only.

Existing Cleanup Hub manual merge remains the only merge path in this screen.

## Current Limitation

The full vertical slice is not runtime-proven through llama.cpp yet.

Reason:

The current repository does not contain a pinned llama.cpp Android runtime or a native build path for it.

This task added the bridge and the safe TypeScript contract. It did not vendor llama.cpp source or add a third-party native runtime because that would be a large dependency and versioning decision. It must be made deliberately.

The plugin fails closed instead of returning synthetic output.

## Verification Result

Verification:

- `git status` before changes: completed. Pre-existing unrelated changes were present.
- Focused Local AI contract test: passed.
  - Command: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/item-library/cleanupLocalAI.test.js`
  - Result: 13 passed, 0 failed.
- Cleanup exchange regression test: passed.
  - Command: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/item-library/itemCleanupExchangeFlagged.test.js`
  - Result: 13 passed, 0 failed.
- Critical cleanup export/import test: failed in one pre-existing legacy expectation.
  - Command: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/itemCleanupExportImport.test.js`
  - Result: 13 passed, 1 failed.
  - Failure: `validateFlaggedCleanupImport validates merge groups against export groups`.
  - Cause: the test omits `snapshot_id` but still expects validation success. Current Cleanup hardening correctly rejects missing snapshot IDs.
  - This task did not modify that test or the Cleanup exchange validator.
- `bun run typecheck`: passed.
- Android Java compile check: not completed.
  - Root wrapper check: `gradlew.bat not found`.
  - Android wrapper check: `android gradle wrapper not found`.
  - No Gradle wrapper is present for a safe repo-local Java compile command.
- `git diff --check`: passed for tracked task files.
- `git diff --check --no-index`: passed for new task files. Git reported line-ending notices only.
- `bun run audit:load`: not run. This task did not change schema, query, RPC, or data-layer logic.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy and explicit task ban.

## Supabase Push Status

Supabase push status: not applicable.

No migration, schema change, RPC change, or database mutation was performed.

## Pre-Existing Worktree State

Initial task status showed:

- Modified: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-inline.html`
- Untracked: `docs/reports/ai/`
- Untracked: `docs/reports/invoice-quote/invoice-form-candidate-design-mobile-fold-desktop-v1-audit-2026-09-27.md`

During this task, another untracked report also appeared:

- `docs/reports/invoice-quote/invoice-form-inline-correction-2026-09-27.md`

This task did not modify the invoice PRD file or invoice report files.

## Risks Or Limitations

- Real llama.cpp inference is not proven because the native runtime is not linked.
- The Android plugin compile could not be verified because no Gradle wrapper exists in the repository.
- The selected model remains a benchmark candidate, not a production model.
- No latency, memory, cancellation, or unload behavior has been measured on Android with a real GGUF model.
- The UI can only show a validated proposal after a real native runtime returns a real JSON result.

## Deferred Work

- Pin llama.cpp to a commit or release.
- Add the smallest Android native build path for arm64-v8a.
- Add JNI bindings or an AAR wrapper for llama.cpp inference.
- Add grammar or JSON-schema constrained generation in native runtime.
- Add checksum-based development model placement.
- Measure model load latency, generation latency, memory, and unload behavior on Android.
- Add native tests after the runtime is linked.
- Add a production Model Manager later.
- Keep all mutation paths behind existing deterministic Cleanup Hub preflight and human approval.

## Native Runtime Completion

This section was added by Codex on 2026-09-28 via Codex desktop.

### Inherited State

The inherited TypeScript contract, strict validator, Local AI review panel, and Android plugin shell were sound.

The blocker was native linkage.

The prior Android plugin always returned:

`runtimeLinked: false`

The plugin did not load a GGUF model. It did not call JNI. It did not call llama.cpp.

### Files Added Or Changed

Added:

- `android/app/src/main/cpp/CMakeLists.txt`
- `android/app/src/main/cpp/local_ai_jni.cpp`

Changed:

- `android/app/build.gradle`
- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/domain/cleanupLocalAI.ts`
- `src/tests/item-library/cleanupLocalAI.test.js`
- `docs/reports/ai/bigdrops-local-ai-llamacpp-android-poc-2026-09-27.md`

### Llama.cpp Pin

Pinned runtime:

- Repository: `https://github.com/ggml-org/llama.cpp`
- Commit: `4da6337767f973e2b4d0797e5b323d77d8565e4a`
- Commit date: 2026-09-27
- Commit title: `server : allow RANK pooling batch splitting for causal LLM rerankers (ie. Qwen3 and Qwen3-VL) (#28876)`
- License: MIT

The Android CMake build uses `FetchContent` with this exact commit.

The build disables examples, server, tests, curl, OpenMP, and native CPU tuning for this POC.

Only `arm64-v8a` is enabled.

### Native Build Architecture

The Android app now has an app-scoped native build path.

The path is:

`android/app/src/main/cpp/`

The native library is:

`bigdrops_local_ai`

The Gradle app module uses CMake 3.22.1 and the Android NDK side-by-side toolchain.

The native target links:

- `llama`
- `android`
- `log`

No GGUF file is committed.

No native executable is downloaded at runtime.

### JNI Boundary

`LocalAIPlugin.java` now calls real native methods.

The JNI boundary supports:

- runtime version
- native runtime creation
- model load
- Cleanup task generation
- cancellation
- unload
- native runtime destroy

The native handle is private to the Android plugin.

TypeScript does not receive a JNI pointer.

The web layer cannot submit arbitrary file paths.

The POC permits one loaded model and one active generation.

The plugin rejects:

- unsupported model IDs
- load while another model is loaded
- generation without a loaded model
- concurrent generation
- unload during active generation

### Model Load

The plugin still uses app-private storage:

`files/local-ai/models/`

The only allowed POC model ID is:

`qwen3-0.6b-instruct-q4-k-m-gguf-poc`

The expected app-private filename is:

`qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf`

`loadModel` now calls:

`llama_model_load_from_file`

It records:

- load time
- model description
- model tensor size
- parameter count
- memory before load
- memory after load

Errors are sanitized before they reach TypeScript.

### Constrained Generation

`analyzeCleanupTask` now calls real llama.cpp generation.

The native code:

- creates a fresh context for each Cleanup analysis
- tokenizes the existing Cleanup prompt
- decodes the prompt
- applies a GBNF JSON grammar sampler
- uses greedy sampling
- returns only structured JSON text
- frees the context after generation

The native grammar constrains the result shape to the existing TypeScript contract:

- `response_type`
- `schema_version`
- `task_id`
- `cleanup_snapshot_id`
- `provider_id`
- `model_id`
- `proposals`
- allowed decisions: `SAME_ITEM`, `DIFFERENT_ITEM`, `UNSURE`

The native grammar does not replace TypeScript validation.

The existing TypeScript validator remains authoritative for:

- task ID
- snapshot ID
- group IDs
- item IDs
- evidence IDs
- duplicate proposals
- self merge
- Keep Separate conflicts

### Cancellation

`cancelGeneration` now signals the native runtime.

The native runtime checks the cancellation flag during prompt decode and token generation.

If cancellation occurs, partial output is discarded.

No partial proposal is returned.

Known limitation:

- Cancellation can still wait for the active llama.cpp decode call to return.

### Unload

`unloadModel` now calls native unload.

Native unload releases the llama.cpp model.

After unload:

- `runtimeLinked` remains true
- `loadedModelId` is null
- inference fails safely until a model is loaded again
- the plugin can load the model again

### Runtime Diagnostics

`getRuntimeInfo` now reports:

- `runtimeLinked`
- pinned llama.cpp commit
- native runtime version string
- supported Android ABIs
- selected ABI
- model directory status
- loaded model ID
- loaded model description
- generation active status
- last load time
- last generation time
- last prompt token count
- last output token count
- last tokens per second
- memory before load
- memory after load
- memory after unload

The plugin does not log full prompts or model output.

### Model Artifact Provenance

The selected POC artifact remains:

- Repository: `QuantFactory/Qwen3-0.6B-GGUF`
- Repository revision: `e7e05d713acaa2baccdfb52e967eaba8ba562ba8`
- File: `Qwen3-0.6B.Q4_K_M.gguf`
- Reported size: 484,220,000 bytes
- LFS ETag: `7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d`
- License metadata: Apache 2.0
- License link: `https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/LICENSE`
- Base model metadata: `Qwen/Qwen3-0.6B-Base`

This is a third-party community quantization.

It is acceptable for this POC only.

It is not a production model selection.

### Development Model Placement

Use a debug build.

Do not commit the GGUF.

Suggested Windows procedure:

1. Download `Qwen3-0.6B.Q4_K_M.gguf` from the pinned repository revision.
2. Verify the SHA-256 digest locally.
3. Compare it with the recorded LFS ETag:
   `7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d`
4. Install or run the debug BIGDROPS Android app.
5. Confirm the package name:
   `com.bigdrops.app`
6. Place the model with `adb exec-out`:

```powershell
adb shell run-as com.bigdrops.app mkdir -p files/local-ai/models
cmd /c "adb exec-out run-as com.bigdrops.app sh -c 'cat > files/local-ai/models/qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf' < Qwen3-0.6B.Q4_K_M.gguf"
```

If `run-as` is not available, the installed app is not debuggable.

Use a debug build for this POC.

### Device Validation Procedure

Device validation is still required.

Use this procedure:

1. Obtain `Qwen3-0.6B.Q4_K_M.gguf`.
2. Verify the checksum.
3. Place it into app-private storage as documented above.
4. Launch BIGDROPS.
5. Open Item Library.
6. Open Cleanup Hub duplicate review.
7. Open Local AI POC.
8. Confirm `runtimeLinked=true`.
9. Load the POC model.
10. Record load time and memory change.
11. Select one real Cleanup candidate.
12. Run analysis.
13. Confirm the output passes TypeScript validation.
14. Record decision, reason, duration, token counts, and tokens per second.
15. Start another analysis.
16. Cancel it.
17. Confirm no partial output appears.
18. Run another analysis after cancellation.
19. Unload the model.
20. Confirm model state reports unloaded.
21. Confirm manual Cleanup Hub review still works.
22. Confirm no Item Library mutation occurred.

### Verification Update

Verification:

- `git status` before continuation: completed.
- Focused Local AI contract test: passed.
  - Command: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/item-library/cleanupLocalAI.test.js`
  - Result: 14 passed, 0 failed.
- Cleanup exchange regression test: passed.
  - Command: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/item-library/itemCleanupExchangeFlagged.test.js`
  - Result: 13 passed, 0 failed.
- Critical cleanup export/import test: failed in the same known legacy expectation.
  - Command: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/itemCleanupExportImport.test.js`
  - Result: 13 passed, 1 failed.
  - Failure: `validateFlaggedCleanupImport validates merge groups against export groups`.
  - Cause: the test expects a missing-snapshot import to validate. Current Cleanup hardening rejects it.
  - This continuation did not change that validator.
- `bun run typecheck`: passed.
- Native CMake/JNI compile: passed.
  - Command: `android/gradlew.bat :app:externalNativeBuildDebug --no-daemon`
  - Result: `BUILD SUCCESSFUL`.
  - Gradle installed Android NDK `27.0.12077973` and CMake `3.22.1`.
- Java plugin compile check: not completed.
  - Command: `android/gradlew.bat :app:compileDebugJavaWithJavac --no-daemon`
  - Result: interrupted after a long quiet wait while compiling Android dependency Kotlin tasks.
  - No Java source error was emitted before interruption.
- `bun run audit:load`: not run. No schema, query, RPC, or data-layer logic changed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy and explicit task ban.

### Runtime Evidence

No Android device or emulator inference run was available in this OpenCode session.

Therefore, the full path is not yet proven on device:

Cleanup Hub candidate -> TypeScript task -> Capacitor plugin -> JNI -> llama.cpp -> GGUF -> constrained JSON -> TypeScript validator -> read-only proposal.

Native compile is proven.

On-device GGUF inference is not yet proven.

### Safety Confirmation

The POC remains:

- local
- advisory
- read-only
- snapshot-bound
- Keep-Separate-aware
- TypeScript-validated
- cancellable
- unloadable
- mutation-free

No code path added here can apply Cleanup proposals.

No database path was changed.

No Item Library mutation path was added.

### Gate Classification

B. IMPLEMENTATION/COMPILE COMPLETE - DEVICE VALIDATION REQUIRED

Evidence:

- The llama.cpp dependency is pinned.
- The Android CMake/JNI native target compiles for `arm64-v8a`.
- The Java plugin now calls real native methods.
- The model load, generation, cancellation, unload, and diagnostics paths are implemented.
- Focused TypeScript contract tests pass.
- `bun run typecheck` passes.
- No Android device or emulator GGUF inference was available in this session.

Remaining blocker:

- A human must run the device validation procedure with the GGUF model in app-private storage.
