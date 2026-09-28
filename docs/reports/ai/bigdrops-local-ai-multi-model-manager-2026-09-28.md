# BIGDROPS Local AI Multi-Model Manager Report

This report was written by Muse Spark on 2026-09-28 via OpenCode.

## Objective

Correct the single-model legacy architecture into a true multi-model manager. Lite and Standard coexist. Selection persists. Jobs use the selected model. No verified installation is invalidated.

## Scope

In scope:

- Model catalog with Lite and Standard tiers.
- Selection persistence and resolution.
- Job engine selected-model threading.
- Workspace model picker.
- Settings models surface.
- Android allow-list for both models.
- Focused tests and compile checks.

Out of scope:

- A third Max model entry.
- Historical Review AI jobs.
- Standardization AI jobs.
- Benchmark system.
- Supabase changes.
- Remote AI services.

## Files Changed

- `src/lib/local-ai/modelManifest.ts`
- `src/lib/local-ai/modelSelection.ts`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/domain/cleanupLocalAI.ts`
- `src/modules/item-library/domain/cleanupLocalAIJob.ts`
- `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx`
- `src/modules/item-library/components/ItemLibraryLocalAIReviewPanel.tsx`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/pages/settings/LocalAISettingsSection.tsx`
- `src/tests/item-library/cleanupLocalAI.test.js`
- `src/tests/item-library/cleanupLocalAIJob.test.js`
- `src/tests/local-ai/modelManager.test.js`
- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `docs/reports/ai/bigdrops-local-ai-multi-model-manager-2026-09-28.md`

Pre-existing changes left untouched:

- `package.json`, `bun.lock`, `skills-lock.json` (user installs).
- PRD design files and form reports (other agents).

## Skills Used

Skills used: libraries-dev, systematic-debugging, debugging-capacitor, karpathy, react-dev, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### Model Catalog

`modelManifest.ts` now exports `LOCAL_AI_MODEL_CATALOG` with two enabled entries. Each entry carries tier, description, provenance, quantization, runtime, recommendation, benchmark status, and purpose. `getLocalAIModelManifest` returns undefined for unknown IDs. A future Max entry extends the array and the tier union. No fake entry exists.

### Selection

New file `modelSelection.ts` holds device-local selection in `localStorage` under `bigdrops.local-ai.selected-model-id`. It resolves install, select, and load states separately. A selected but missing model resolves to an explicit missing state. It never substitutes another model silently. Recommendation uses total device memory with a documented threshold and stays advisory.

### Job Engine

The plan builder takes a required `modelId`. Prompts carry that ID. The runner loads exactly that model once, stamps it on every group result, and unloads at the end. No Standard constant remains in the execution path.

### Workspace Picker

The workspace lists installed models in a compact select. Uninstalled models appear disabled with a Settings pointer. Switching writes the preference only. Starting a job unloads a different loaded model first, then runs. Generation disables the picker. Result details record the producing model ID.

### Settings Surface

Settings renders one card per catalog model with tier, size, state, progress, download, verify, use, and delete actions. Provenance sits behind a details disclosure. Deleting the selected model asks for confirmation and clears the preference. Deleting a loaded model is refused with guidance.

### Android Allow-List

Both model IDs pass status, download, verification, load, unload, deletion, and inference. Arbitrary IDs, URLs, and paths still fail closed. Byte and SHA verification runs per model. Runtime info adds total device memory for recommendation.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Model manager tests: 10 passed, 0 failed.
- Cleanup job tests: 9 passed, 0 failed.
- Cleanup contract tests: 14 passed, 0 failed.
- Cleanup exchange and interaction tests: 17 passed, 0 failed.
- Java compile (`:app:compileDebugJavaWithJavac`): passed.
- Native CMake compile (`:app:externalNativeBuildDebug`): passed.
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

- Dual-model Java allow-list and per-model verification.
- Total memory reporting in runtime info.
- ARM64 native target unchanged and linking.

Test-proven:

- Catalog shape, independent install states, selection round-trips, missing-selection handling, recommendation rule, digest fail-closed behavior, single-load invariant, selected-model threading, prompt model binding, and existing safety validation.

Device-proven:

- Nothing new in this task. Prior evidence covers 0.6B install, verification, and load only.

Still unproven:

- 1.7B download, verification, load, and inference on device.
- Bulk job timing and memory behavior on device.
- Multi-model switching on device.

## Device Validation Still Required

1. Install both models from Settings and confirm independent states.
2. Select Lite, run a 25-group job, confirm results record the Lite ID.
3. Select Standard without reinstalling anything else.
4. Delete Standard while selected and confirm the preference clears safely.
5. Attempt inference with the selected model uninstalled and confirm the safe failure message.
6. Confirm an app update preserves both verified models.

## Risks Or Limitations

- Recommendation uses a fixed memory threshold. It is advisory only.
- The workspace picker lists uninstalled models as disabled. Installation still starts in Settings.
- No revoke or benchmark UI exists. Diagnostics carry the needed identifiers.
- Exact 1.7B byte and hash values came from live response headers. The device re-verifies both on download.

## Deferred Work

- Max tier catalog entry after device evidence.
- Deep links from exception results into manual review.
- Measured per-device memory budgets.
- Historical Review and standardization job types.
