# BIGDROPS Local AI Bulk Cleanup Job Report

This report was written by Muse Spark on 2026-09-28 via OpenCode.

## Objective

Take over the interrupted Local AI pass. Index the new skill. Diagnose the device generation failure. Select a verified 2B-class model. Replace single-group review with a bulk AI Cleanup Job workspace. Preserve deterministic safety.

## Scope

In scope:

- Skill index update for libraries-dev.
- thinking-orbs integration for AI job states.
- Native stage diagnostics for the generation failure.
- Model successor selection with verified provenance.
- Bulk job engine with chunked sequential orchestration.
- Workspace UI with progress, cancellation, and result review.
- Legacy 0.6B model migration UX.
- Focused tests and compile checks.

Out of scope:

- Item Library mutation.
- Supabase schema changes.
- Parallel inference.
- Historical Review AI support.
- Standardization review AI support.
- Remote AI services.

## Files Changed

- `docs/PROJECTSKILLINDEX.md`
- `src/lib/local-ai/modelManifest.ts`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/domain/cleanupLocalAI.ts`
- `src/modules/item-library/domain/cleanupLocalAIJob.ts`
- `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/pages/settings/LocalAISettingsSection.tsx`
- `src/tests/item-library/cleanupLocalAIJob.test.js`
- `android/app/src/main/cpp/local_ai_jni.cpp`
- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `docs/reports/ai/bigdrops-local-ai-bulk-cleanup-job-2026-09-28.md`

Pre-existing changes left untouched:

- `package.json`, `bun.lock`, `skills-lock.json` (user installs).
- PRD design files and form reports (other agents).
- Deleted invoice PRD file (other agent).

## Skills Used

Skills used: libraries-dev, systematic-debugging, debugging-capacitor, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

The harness skill tool does not resolve repo-local skills. The project index prescribes direct file reads as fallback. This session read `.agents/skills/libraries-dev/SKILL.md`, `references/02-thinking-orbs.md`, and the installed `thinking-orbs@0.3.2` type definitions before coding.

## Changes Made

### Skill Index

Indexed `libraries-dev` as skill 157 in `docs/PROJECTSKILLINDEX.md`. Updated counts and timestamp. The installer already recorded the lock entry and created the mirrors. No skill file was modified.

### Native Failure Diagnosis

Device evidence showed load success then `llama.cpp native generation failed.` That string comes only from the `catch (...)` block in `nativeGenerate`. A C++ exception escaped the generation path. Grammar failure, missing model, and empty prompt each have distinct messages, so none of them caused this.

The most probable cause is native memory exhaustion during context creation. The runtime allocates the full 4096-token KV cache on every generation. Model load succeeds because weights map lazily. The device cannot be inspected from here, so the cause stays a hypothesis.

The fix adds stage tracking to every generation phase:

- `start`, `context_init`, `vocab`, `tokenize`, `prompt_decode`, `sampler_init`, `grammar_init`, `generate`.
- `std::bad_alloc` reports `out_of_memory` with the failing stage.
- Other C++ exceptions report a truncated single-line cause with the stage.
- Unknown throws report the stage with an unknown class.
- Failure payloads carry prompt and output token counts plus elapsed time.
- No prompt text or model output enters any diagnostic.

The Java bridge logs full diagnostics to logcat and rejects with a human message plus a stable `[stage=...]` tag. The TypeScript bridge parses the tag into a typed error. The next device run names the failing stage.

### Model Successor

Codex pinned `QuantFactory/Qwen3-1.7B-GGUF`. Verification showed that artifact quantizes the Base model, not the Instruct model. A base model follows structured instructions poorly. Its hash was unverified.

This session selected `unsloth/Qwen3-1.7B-GGUF` instead:

- Base model: `Qwen/Qwen3-1.7B` Instruct.
- License: Apache-2.0.
- File: `Qwen3-1.7B-Q4_K_M.gguf`.
- Size: 1,107,409,472 bytes from response headers.
- SHA-256: `b139949c...81897` from response headers.
- Revision pin: `d7f544eead698dbd1f15126ef60b45a1e1933222`.
- Provenance: Unsloth publisher, imatrix quantization, Xet storage.
- Compatibility: GGUF architecture `qwen3`, ChatML template, llama.cpp ready.
- Memory: 1.1 GB weights plus KV cache. Fits 4 GB devices with the 4096 context.

The manifest records this artifact. Exact byte and hash values come from live response headers. The device re-verifies both on download and fails closed on mismatch.

The 0.6B constants remain as a legacy manifest. Settings shows a removal card when the old file is present. The Android allow-list accepts the legacy ID for status and deletion only. Legacy download is rejected with a superseded message.

### Prompt Format

Prompts now carry Qwen3 ChatML framing with a single user turn and an assistant generation prompt. They end with `/no_think` so the reasoning model spends its budget on the decision instead of hidden reasoning. The grammar still enforces JSON shape. Existing contract tests pass unchanged.

### Bulk Job Engine

New file `cleanupLocalAIJob.ts` holds the job engine. It contains no native calls and no mutation imports.

- `buildCleanupLocalAIJobPlan` converts duplicate groups into single-group tasks with the existing builder. Groups outside the locked export become skipped entries. A limit caps the batch.
- `runCleanupLocalAIJobPlan` loads the model once, then processes tasks sequentially. One inference runs at a time. It validates every result with the existing strict validator.
- Result categories: ready, unsure, conflict, failed. Keep Separate conflicts classify as conflicts. UNSURE stays a successful safe outcome.
- Cancellation stops the loop and keeps completed results. Three consecutive failures stop the job. Load failure fails every group without inference. Unload runs best-effort at the end.
- `parseCleanupLocalAICommand` maps only deterministic phrases to job starts and result filters. Anything else returns help. No general chatbot exists.

### Workspace UI

New file `ItemLibraryLocalAIJobPanel.tsx` replaces single-group review as the primary experience.

- READY shows eligible count, job size choices (25, 50, 100, All), model state, privacy line, and Start.
- RUNNING shows one ThinkingOrb beside explicit progress text, phase label, reviewed-over-total counts, chunk position, elapsed time, determinate progress bar, and Cancel. Orb states map to phases: preparing to weaving, loading to connecting, reviewing to breathing, validating to solving. The orb is hidden from screen readers because adjacent text carries a live status role.
- COMPLETED summarizes ready, unsure, conflict, and failed counts with filter tabs. Proposal cards show concise reasons and hide snapshot, model, and runtime internals behind a details element.
- A command input accepts review and filter phrases.
- The old single-group panel moved behind a diagnostics disclosure. No diagnostic functionality was deleted.
- The page mounts the workspace in the existing Local AI view with exclusion-filtered groups. Manual Cleanup is unchanged.

### Settings Migration

Settings checks the legacy model ID on refresh. An installed 0.6B file produces a warning card with its size, an explanation, and a delete action. The current model flow is unchanged.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Focused tests (contract, job engine, exchange, interaction): 39 passed, 0 failed.
- Native CMake compile (`:app:externalNativeBuildDebug`): passed.
- Java compile (`:app:compileDebugJavaWithJavac`): passed after fixing a checked-exception catch the compiler flagged.
- `git diff --check`: passed for task files.
- `git status`: task files plus pre-existing unrelated changes only.
- `bun run audit:load`: not applicable. No schema, query, or data-layer logic changed.
- `supabase db push`: not applicable. No migration exists.
- `bun run build`: skipped due to hardware policy and explicit task ban.

## Supabase Push Status

Supabase push status: not applicable.

No migration, schema change, RPC change, or database mutation was performed.

## Behavior Separation

Compile-proven:

- JNI stage diagnostics and typed failure payload.
- Java allow-list, legacy handling, and stage propagation.
- ARM64 native target links against pinned llama.cpp.

Test-proven:

- Job planning, batching, sequential execution, classification, cancellation, fatal stop, unload, command parsing, and prompt framing.
- Strict result validation including Keep Separate conflicts.
- No mutation surface in the job engine.

Device-proven:

- Nothing new. Prior device evidence covers 0.6B download, verification, load, and the generation failure only.

Still unproven:

- 1.7B download, verification, load, and inference on device.
- Bulk job timing, cancellation responsiveness, and memory behavior on device.
- ThinkingOrb rendering inside the production WebView.

## Device Validation Procedure

Run on a physical arm64 device with a debug build:

1. Open Settings, then Local AI. Confirm the current model reads Qwen3 1.7B Instruct.
2. If the legacy 0.6B card appears, delete the older model. Confirm space is reclaimed.
3. Download the 1.7B model. Confirm checksum verification passes.
4. Load the model. Record load time.
5. Open Item Library, then Cleanup Hub, then Review with Local AI.
6. Start a 25-group job. Confirm progress counts advance and the phase label changes.
7. Confirm one successful native inference produces a validated proposal.
8. Cancel mid-job. Confirm completed reviews stay visible.
9. Re-run and let it finish. Confirm the summary counts match the filter tabs.
10. Open logcat on failure. Record the stage tag and error class.
11. Unload the model. Confirm memory release message.
12. Confirm manual Cleanup review still works.
13. Confirm no Item Library mutation occurred.

## Risks Or Limitations

- The OOM diagnosis is evidence-backed but unproven without device logs. Stage diagnostics resolve this on the next run.
- A 100-group job may take a long time on device. Progress, cancellation, and kept partial results mitigate this. Timing is unmeasured.
- The Java compiler flagged one diagnostics catch during verification. It is fixed and recompiled.
- ThinkingOrb canvas was not rendered on device in this session.
- The exact byte and hash values were read from live headers, not from a local download. The device verifies both before use.

## Deferred Work

- Historical Review and standardization AI jobs on the same engine.
- Deep links from exception results into manual review.
- Revocation-free result dismissal or review notes.
- Model pre-warming and context reuse across inferences.
- Measured per-device memory and throughput budgets.
- Pro skill tuning for orb appearance.
