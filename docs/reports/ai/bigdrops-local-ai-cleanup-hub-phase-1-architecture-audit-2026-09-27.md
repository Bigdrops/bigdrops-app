# BIGDROPS Local AI Cleanup Hub Phase 1 Architecture Audit

This report was written by Codex on 2026-09-27 via Codex desktop.

## Objective

Audit the safest architecture for on-device Android LLM inference in BIGDROPS.

The first AI workload is Item Library Cleanup Hub review.

The AI must be advisory. BIGDROPS deterministic rules, snapshot validation, Keep Separate decisions, and human approval remain authoritative.

## Scope

In scope:

- Current Capacitor and Android architecture.
- Current AI PRD.
- Current Item Library Cleanup Hub safety architecture.
- Current durable Keep Separate architecture.
- Native Android LLM runtime options.
- Local model candidates for benchmarking.
- Device tier and model manager architecture.
- Cleanup Hub input and output contracts.
- Privacy, lifecycle, fallback, and benchmark requirements.

Out of scope:

- AI implementation.
- Android dependency changes.
- Model download.
- Cleanup Hub source changes.
- Database changes.
- Tests.
- PRD edits.

## Files Changed

- `docs/reports/ai/bigdrops-local-ai-cleanup-hub-phase-1-architecture-audit-2026-09-27.md`

No application, Android, Gradle, migration, test, package, PRD, or existing report file was changed.

## Skills Used

Skills used: capacitor-best-practices, capacitor-plugins, typescript-advanced-types, writing-clearly-and-concisely

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Created this audit report.
- Created the `docs/reports/ai/` report directory because no AI report directory existed.
- Performed repository inspection only.
- Performed read-only external research for runtime and model facts.

## Evidence Inspected

Repository evidence:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/13-ai-integration.md`
- `package.json`
- `capacitor.config.ts`
- `android/variables.gradle`
- `android/build.gradle`
- `android/app/build.gradle`
- `android/gradle.properties`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/bigdrops/app/MainActivity.java`
- `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java`
- `android/app/src/main/java/com/bigdrops/app/plugins/DownloadBridgePlugin.java`
- `android/app/src/main/java/com/bigdrops/app/plugins/FoldAwarenessPlugin.java`
- `src/lib/native/apkUpdate.ts`
- `src/lib/native/fileDownload.ts`
- `src/lib/native/foldAwareness.ts`
- `src/modules/item-library/domain/itemCleanupExchange.ts`
- `src/modules/item-library/domain/duplicateDetection.ts`
- `src/modules/item-library/repositories/itemLibraryRepository.ts`
- `src/modules/item-library/repositories/historicalReviewRepository.ts`
- `src/modules/item-library/services/itemLibraryService.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `supabase/migrations/20260927162405_item_library_tier_c_stage2b_reconciliation.sql`
- `supabase/migrations/20260927173840_item_library_tier_c_stage2b_audit_trail_correction.sql`
- Item Library reports under `docs/reports/item-library/`

External sources inspected on 2026-09-27:

- `https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md`
- `https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md`
- `https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/android`
- `https://github.com/google-ai-edge/gallery`
- `https://github.com/mlc-ai/mlc-llm/blob/main/docs/deploy/android.rst`
- `https://onnxruntime.ai/docs/tutorials/mobile/`
- `https://github.com/pytorch/executorch/blob/main/docs/source/llm/run-on-android.md`
- `https://ai.google.dev/gemma/docs/core/model_card_3`
- `https://huggingface.co/Qwen/Qwen3-4B`
- `https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md`
- `https://www.llm-hub.app/terms`

## Pre-Existing Worktree State

Initial task status showed these pre-existing changes:

- Modified: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-inline.html`
- Untracked: `docs/reports/invoice-quote/invoice-form-candidate-design-mobile-fold-desktop-v1-audit-2026-09-27.md`

This task did not edit those files.

## 1. Current Capacitor And Android Architecture

BIGDROPS uses React 19, Vite 7, TypeScript 5.9, Capacitor 8, and Android native code.

Current Capacitor dependencies:

- `@capacitor/core` `^8.3.0`
- `@capacitor/android` `^8.3.0`
- `@capacitor/cli` `^8.3.0`
- `@capacitor/app` `^8.1.0`
- `@capacitor/filesystem` `^8.1.2`
- `@capacitor/browser`
- `@capacitor/clipboard`
- `@capacitor/push-notifications`
- `@capacitor/share`
- `@capacitor/app-launcher`

The project does not currently include:

- `@capacitor/device`
- `@capacitor/file-transfer`

Android configuration:

- App ID: `com.bigdrops.app`
- Android namespace: `com.bigdrops.app`
- `minSdkVersion`: 24
- `targetSdkVersion`: 36
- `compileSdkVersion`: 36
- Java target: 21
- Android Gradle plugin: 8.13.0
- Native language in repository: Java
- Current plugins are manually registered in `MainActivity`.

Current custom plugins:

- `ApkUpdatePlugin`
- `DownloadBridgePlugin`
- `FoldAwarenessPlugin`

Current permissions:

- `INTERNET`
- `USE_BIOMETRIC`

There is no broad storage permission. This is good for model storage because app-private storage does not need external storage permission.

The current APK update plugin is the closest native pattern for model download. It uses:

- HTTPS enforcement.
- Android `DownloadManager`.
- App-private cache.
- Cancel and delete methods.
- FileProvider only for APK install.
- Sanitized diagnostic logging.

The current `DownloadBridgePlugin` is not suitable for model files. It writes base64 data to public Documents through MediaStore. Multi-GB model files must not move through base64 or public user-visible storage.

The cleanest integration point is a new Android Capacitor plugin. It should follow the same registration style as the existing Java plugins. It can be implemented in Java first. Kotlin can be introduced later only if the selected runtime strongly prefers Kotlin examples.

## 2. Native Inference Runtime Audit

### llama.cpp

Evidence:

- Official Android documentation exists.
- The Android guide uses `arm64-v8a` with the Android NDK and CMake.
- The Android example can read GGUF metadata from a `Uri` or app-private file.
- It exposes generated tokens through a Kotlin `Flow` in the sample design.
- The grammar docs support GBNF grammars and JSON-schema-to-grammar conversion for constrained output.

Strengths:

- Strong GGUF ecosystem.
- Many small open models have GGUF quantizations.
- Good control over prompt, context, sampling, and constrained JSON output.
- Offline by design.
- Good fit for app-private model files.
- Good fit for a custom Capacitor bridge.
- Strong fit for Cleanup Hub because structured output matters more than chat UI.

Costs:

- Highest native integration burden.
- Requires NDK/CMake packaging.
- Android GPU acceleration needs device-specific validation.
- App binary size and ABI packaging need careful management.
- Java bridge must wrap a native library or a local service layer.

Verdict:

Recommended first proof-of-concept runtime.

Reason:

The Cleanup Hub needs strict structured output, model portability, and full local control. `llama.cpp` gives BIGDROPS the best control surface. It also avoids locking Cleanup Hub to one model vendor.

### Google AI Edge / MediaPipe LLM Inference

Evidence:

- Google documents Android LLM inference through `com.google.mediapipe:tasks-genai`.
- Google states that the API runs LLMs on-device.
- Google says it is optimized for high-end devices such as Pixel 8 and Samsung S23 or later.
- The docs show Gemma 3 1B 4-bit as a quickstart model.
- Google AI Edge Gallery supports local model discovery, download, benchmarks, and `.litertlm` or `.task` import.

Strengths:

- Android-first API.
- Strong Gemma path.
- Good sample app and benchmark UX.
- Lower native integration burden than `llama.cpp`.
- Good candidate for the Lite tier.

Costs:

- Model format is `.task` / LiteRT / `.litertlm`, not GGUF.
- Structured output control is less general than `llama.cpp` grammar control.
- Model choice is narrower.
- Google source calls the Gallery experimental/beta in current docs.

Verdict:

Runner-up and parallel POC candidate.

Reason:

It may be faster to ship if Gemma-family models pass BIGDROPS structured-output tests. It should not be the only path until JSON reliability and model portability are proven.

### MLC LLM

Evidence:

- MLC Android docs package GPU execution logic in `libtvm4j_runtime_packed.so`.
- The Java binding is provided through `mlc4j`.
- Android integration uses a Gradle subproject.

Strengths:

- Strong mobile GPU direction.
- Mature research and deployment path.
- Good candidate when specific compiled models are selected.

Costs:

- Model packaging is more specialized.
- Adds TVM runtime complexity.
- Less direct fit for a simple Capacitor plugin POC.

Verdict:

Viable but not first.

Use it only if benchmark evidence shows a large speed or memory advantage for the selected models.

### ONNX Runtime / ONNX Runtime GenAI

Evidence:

- ONNX Runtime Mobile supports Android Java and C/C++.
- Models must be in ONNX format.
- Android supports CPU, NNAPI, and XNNPACK execution providers.
- Docs recommend starting with CPU for quantized models and XNNPACK for non-quantized models.

Strengths:

- Production-grade runtime.
- Strong Microsoft ecosystem.
- Good path for Phi-family ONNX models.
- Clear mobile packaging story.

Costs:

- Not GGUF.
- Model conversion and validation add work.
- Structured text generation requires the GenAI layer and model-specific testing.

Verdict:

Good second-wave candidate if Phi or another ONNX-first model wins the benchmark.

### ExecuTorch

Evidence:

- ExecuTorch Android docs expose `org.pytorch.executorch.extension.llm`.
- Docs include an Android Llama demo app with `LlmModule`, callbacks, and a handler thread.

Strengths:

- Official PyTorch edge path.
- Good long-term fit if BIGDROPS later uses PyTorch-optimized models.
- Android runner API exists.

Costs:

- Model export pipeline is heavier than GGUF use.
- Higher implementation uncertainty for this narrow Cleanup Hub feature.

Verdict:

Not first for Phase 1.

Keep as a later option if PyTorch ecosystem models become clearly superior.

### LLM-Hub

Evidence:

- LLM-Hub is an Android local LLM chat application.
- Its terms state that it is licensed under PolyForm Noncommercial 1.0.0.
- It processes conversations locally.

Strengths:

- Useful reference for product concepts and privacy posture.

Costs:

- Noncommercial license conflicts with BIGDROPS as a B2B product.
- It is a standalone app, not an API layer.
- It must not be integrated directly.

Verdict:

Reference only.

## 3. Model Audit

Model choice is benchmark-dependent.

The first Cleanup Hub workload is narrow:

- Compare candidate item identities.
- Preserve specification differences.
- Return `SAME_ITEM`, `DIFFERENT_ITEM`, or `UNSURE`.
- Provide reason codes.
- Follow a strict structured schema.

The workload does not need open-ended chat.

### Qwen3 Small Dense Models

Evidence:

- Qwen3-4B is Apache 2.0 on Hugging Face.
- The model card states 4.0B parameters.
- The model card states 32,768 native context and 131,072 with YaRN.
- Search evidence shows the Qwen3 family includes 0.6B, 1.7B, 4B, and larger dense sizes under Apache 2.0.

Strengths:

- Commercially simple license.
- Strong small-model family.
- Good structured reasoning candidate.
- Same family can support Lite, Standard, and Max through size and quantization changes.

Risks:

- Android GGUF or LiteRT availability must be verified for the exact chosen quantization.
- Thinking/reasoning modes may add latency. Cleanup prompts should request concise non-chat output.

Recommendation:

Primary benchmark family.

### Gemma 3 / Gemma Edge Models

Evidence:

- Google describes Gemma 3 as lightweight open models with instruction-tuned variants.
- Google documents mobile deployment with MediaPipe LLM Inference.
- The MediaPipe Android guide uses Gemma 3 1B 4-bit in its quickstart.
- Gemma 3 model card states 1B, 4B, 12B, and 27B sizes and a large context window.

Strengths:

- Strong Android path through Google AI Edge.
- Good Lite candidate.
- Good official examples.

Risks:

- License terms must be reviewed for the exact artifact before commercial release.
- Runtime may prefer LiteRT model formats rather than GGUF.
- Structured output constraints must pass BIGDROPS tests.

Recommendation:

Benchmark as Lite and Standard candidate, especially with Google AI Edge.

### Llama 3.2 1B / 3B

Evidence:

- Meta documents 1B and 3B Llama 3.2 text models.
- The model card uses the Llama 3.2 Community License.

Strengths:

- Large ecosystem.
- Many GGUF quantizations exist.
- Good compatibility with `llama.cpp`.

Risks:

- Custom license needs product/legal review.
- Not as commercially simple as Apache 2.0 or MIT.
- Smaller variants may underperform on identity-sensitive reasoning.

Recommendation:

Benchmark only if license review approves it.

### Phi-4 Mini ONNX

Evidence:

- Hugging Face lists `Phi-4-mini-instruct-onnx` with MIT license.
- Microsoft material describes Phi-4 weights under MIT.

Strengths:

- Commercially simple.
- Strong small-model reasoning reputation.
- Natural fit for ONNX Runtime GenAI.

Risks:

- Not a first-class GGUF path.
- ONNX Runtime GenAI integration adds a second runtime path.

Recommendation:

Benchmark if BIGDROPS explores ONNX Runtime as a second-wave runtime.

## 4. Three Device And Model Tiers

These tiers are provisional. Final tiers must pass the benchmark gate.

| Tier | Minimum total RAM | Preferred available headroom | Storage reserve | Provisional model class | Quantization | Context budget | Cleanup batch |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: |
| Lite | 6 GB | 2 GB | 2 GB | 1B to 1.7B instruct | Q4 | 2K to 4K tokens | 1 to 2 pairs |
| Standard | 8 GB | 3 GB | 4 GB | 3B to 4B instruct | Q4 or Q5 | 4K to 8K tokens | 3 to 6 pairs |
| Max | 12 GB | 5 GB | 6 GB | 4B to 7B instruct | Q4 or Q5 | 8K to 12K tokens | 6 to 12 pairs |

The user's current 12 GB RAM Android phone is a good Max test device. It must not be the only design target.

Preferred maintenance strategy:

- Use one model family where possible.
- Vary parameter size and quantization by tier.
- Keep prompt, output schema, and benchmark suite stable.

Reason:

Different model families increase testing cost. They also increase prompt drift and output-shape variance.

## 5. Device Capability Detection

RAM alone is not enough.

Future native capability detection should produce a `DeviceAIProfile`.

Recommended fields:

- `compatible`
- `recommendedTier`
- `hardBlocks`
- `warnings`
- `androidSdk`
- `abis`
- `isArm64`
- `totalMemoryBytes`
- `availableMemoryBytes`
- `isLowMemory`
- `freeStorageBytes`
- `batteryLevel`
- `isCharging`
- `thermalStatus`
- `gpuSummary`
- `accelerationSupport`
- `runtimeSupport`

Hard gates:

- Android API compatible with selected runtime.
- `arm64-v8a` support.
- Enough free storage for model plus temporary file plus checksum pass.
- Minimum total RAM for tier.
- Runtime native library available for ABI.

Recommendation signals:

- Available memory.
- Low-memory state.
- GPU/Vulkan/LiteRT support.
- Battery and charging state.
- Thermal status.
- Recent model load failure.

Runtime health signals:

- Android low-memory callback.
- App backgrounding.
- Thermal throttling.
- Generation cancellation.
- Native inference error.

Implementation source:

- Use Android `ActivityManager.MemoryInfo` for total and available memory.
- Use `StatFs` for free storage.
- Use `Build.SUPPORTED_ABIS` and SDK fields for ABI and OS.
- Use `BatteryManager` and `PowerManager` for battery and thermal state.
- Use runtime-specific probing for GPU or acceleration support.

`@capacitor/device` can provide basic device info later, but it is insufficient alone. A custom plugin method is needed for memory, storage, thermal, and runtime capability.

## 6. Model Download And Storage Architecture

Models must not be bundled into the base APK.

Reasons:

- Model files are large.
- Users may not need AI.
- APK/AAB size would grow sharply.
- Model updates should not require an app release when the runtime is unchanged.

Recommended storage:

- App-private files directory for persistent models.
- A separate app-private temporary directory for in-progress downloads.
- Optional `noBackup` storage if model backup must be prevented.

Recommended download path:

- Native model manager plugin.
- HTTPS only.
- Download to temporary file.
- Verify size and SHA-256.
- Move atomically into the model store.
- Keep a JSON metadata record.
- Emit progress events to TypeScript.

Downloader choice:

- Use Android `DownloadManager` or a native streaming HTTP downloader with `WorkManager`.
- Prefer `DownloadManager` for first POC because the project already uses it for APK updates.
- Move to `WorkManager` if pause/resume, foreground notifications, or stricter retry policy is required.

Do not use:

- `DownloadBridgePlugin`.
- Base64 transfer.
- Public Documents storage.
- Arbitrary user-supplied model packages.

Security expectations:

- Trusted BIGDROPS model manifest.
- HTTPS model URL.
- SHA-256 checksum.
- Optional manifest signature before production.
- Runtime allow-list for model IDs.
- Model file treated as data, not executable code.
- Native library shipped by BIGDROPS, not downloaded as a model.

Model updates:

- BIGDROPS can update the model manifest without an APK update.
- The APK must still include a runtime that can load the model format.
- A model can be marked deprecated and replaced.
- Old model deletion must be user-visible and reversible only by re-download.

## 7. Model Manager Contract

The future TypeScript contract should stay small.

Recommended high-level shape:

```ts
type LocalAIModelTier = 'lite' | 'standard' | 'max'

type LocalAIModelStatus =
  | { state: 'not_installed' }
  | { state: 'downloading'; progress: number }
  | { state: 'installed'; modelId: string; verified: boolean }
  | { state: 'loaded'; modelId: string }
  | { state: 'failed'; reason: string }

interface LocalAIModelManager {
  getDeviceProfile(): Promise<DeviceAIProfile>
  listAvailableModels(): Promise<LocalAIModelManifest[]>
  getModelStatus(modelId: string): Promise<LocalAIModelStatus>
  downloadModel(modelId: string): Promise<void>
  cancelDownload(modelId: string): Promise<void>
  deleteModel(modelId: string): Promise<void>
  loadModel(modelId: string): Promise<void>
  unloadModel(): Promise<void>
  generate(request: LocalAIGenerationRequest): Promise<LocalAIGenerationResult>
  cancelGeneration(taskId: string): Promise<void>
}
```

Events:

- `modelDownloadProgress`
- `modelDownloadCompleted`
- `modelDownloadFailed`
- `modelLoadProgress`
- `modelLoaded`
- `modelUnloaded`
- `generationToken`
- `generationCompleted`
- `generationFailed`
- `generationCancelled`
- `memoryPressure`

Phase 1 can start without token streaming if structured results are small. It still needs cancellation and progress.

## 8. Provider Abstraction

Cleanup Hub must not depend on one inference location.

Recommended boundary:

```ts
interface CleanupAIProvider {
  readonly providerId: 'local_android' | 'gateway'
  getAvailability(): Promise<CleanupAIAvailability>
  analyzeCleanupTask(task: CleanupAITask): Promise<CleanupAIResult>
  cancel(taskId: string): Promise<void>
}
```

Provider responsibilities:

- Local provider:
  - Checks device profile.
  - Checks installed model.
  - Loads model.
  - Runs native inference.
  - Returns structured result.

- Gateway provider:
  - Uses the existing future `free-llm-gateway` / OpenAI-compatible path.
  - Sends the same `CleanupAITask` contract.
  - Returns the same `CleanupAIResult` contract.

Cleanup Hub responsibilities:

- Build deterministic bounded task input.
- Include snapshot ID.
- Include Keep Separate constraints.
- Validate structured output.
- Show proposal to the user.
- Run existing deterministic preflight before apply.

The old AI PRD remains valid as the remote provider path. It needs an amendment so `free-llm-gateway` becomes one provider behind a shared AI interface, not the whole AI architecture.

## 9. Cleanup Hub AI Input Contract

Reuse current Cleanup export concepts.

The model does not need the full Item Library. It needs a bounded review task.

Recommended `CleanupAITask`:

- `task_type`: `item_cleanup_review`
- `schema_version`
- `task_id`
- `cleanup_snapshot_id`
- `source_export_type`
- `groups`
- `reviewed_separate_pairs`
- `normalization_notes`
- `business_rules_version`
- `max_output_schema_version`

Each group should include:

- `group_id`
- `group_label`
- `flag_reason`
- `candidates`
- `specification_evidence`
- `similarity_evidence`
- `history_summary`
- `price_context_summary`
- `keep_separate_constraints`

Each candidate should include:

- `item_id`
- `name`
- `normalized_name`
- `aliases`
- `usage_count`
- `last_used_at`
- `last_price_summary`
- `source_flags`
- `spec_tokens`

Do not include:

- Full tenant catalog.
- Full historical documents.
- Bank data.
- Tax IDs.
- Unrelated financial records.
- Private notes not required for identity review.

Local batch size:

- Lite: 1 to 2 candidate pairs.
- Standard: 3 to 6 candidate pairs.
- Max: 6 to 12 candidate pairs.

The app should reduce batch size if output schema failures, OOM, or timeouts occur.

## 10. Cleanup AI Output Contract

The model output must be strict JSON.

Recommended top-level shape:

```json
{
  "response_type": "cleanup_ai_review_result",
  "schema_version": 1,
  "task_id": "same-as-input",
  "cleanup_snapshot_id": "same-as-input",
  "provider_id": "local_android",
  "model_id": "model-used",
  "proposals": [
    {
      "group_id": "export-group-id",
      "decision": "SAME_ITEM",
      "winner_item_id": "existing-item-id",
      "merged_item_ids": ["existing-item-id"],
      "reason_codes": ["same_normalized_name"],
      "reason": "Concise human-readable reason.",
      "referenced_evidence_ids": ["evidence-id"],
      "warnings": []
    }
  ]
}
```

Decision enum:

- `SAME_ITEM`
- `DIFFERENT_ITEM`
- `UNSURE`

Validation must reject:

- Invalid JSON.
- Missing schema version.
- Wrong task ID.
- Wrong snapshot ID.
- Unknown group ID.
- Unknown item ID.
- Duplicate proposal for one group.
- Self merge.
- `SAME_ITEM` with no winner.
- `SAME_ITEM` that violates active Keep Separate.
- Proposal that references items outside the group.
- Contradictory decisions.
- Free-form response instead of JSON.

Invalid model output must cause zero mutations.

Do not treat numeric confidence as calibrated probability. Prefer reason codes and evidence classes.

## 11. BIGDROPS Cleanup Intelligence Contract

Rules by layer:

### Deterministic Preprocessing

- Build the candidate set.
- Extract known specification tokens.
- Add active Keep Separate constraints.
- Add exact canonical and alias evidence.
- Bind the task to a snapshot.
- Limit context size.

### Model Instruction

- Similarity is not identity.
- Preserve specification differences.
- Primary and Secondary can be different roles.
- Voltage can change identity.
- Amperage can change identity.
- Wattage can change identity.
- Gauge and SWG can change identity.
- Dimensions can change identity.
- Capacity can change identity.
- Rating and grade can change identity.
- Model and part number can change identity.
- Material can change identity.
- Equipment or application can change identity.
- Never invent missing specifications.
- Return `UNSURE` when evidence is insufficient.

### Output Validation

- Enforce the JSON schema.
- Enforce IDs and enums.
- Enforce snapshot ID.
- Enforce Keep Separate.
- Enforce no invented entities.

### Mutation Preflight

- Reuse existing Cleanup preflight.
- Reuse existing merge RPC.
- Re-check active Keep Separate.
- Re-check stale state.
- Require user confirmation.

The LLM must not enforce rules that the application can enforce deterministically.

## 12. Keep Separate Integration

Human Keep Separate decisions are authoritative.

Current repository support:

- `item_reviewed_separate_pairs` stores active canonical item-to-item exclusions.
- `historical_review_candidate_rejections` stores active case-to-candidate exclusions.
- `merge_item_catalog_entries` blocks direct merges that contradict active reviewed-separate pairs.
- Cleanup validation rejects proposals that include active reviewed-separate pairs.

Recommended AI behavior:

- Do not send simple fully reviewed-separate pairs to the model.
- For mixed groups, send constraints as explicit locked exclusions.
- If the model returns `SAME_ITEM` for an excluded pair, reject the result in validation.
- Surface the conflict as a model-output error, not as a user decision.

The model can explain ambiguity. It cannot override a human negative-identity decision.

## 13. Snapshot And Stale Safety

Current Cleanup payloads include deterministic `snapshot_id`.

Snapshot input includes:

- Export type.
- Schema version.
- Mode.
- Batch ID where applicable.
- Canonicalized group IDs.
- Item IDs.
- Item names.
- Aliases.
- Active state.
- Usage and price fields in the exported review set.

Current import validation rejects missing or mismatched snapshot IDs before apply.

Local AI must preserve this rule.

Recommended additions:

- AI task ID must include current cleanup snapshot ID.
- AI result must return the same cleanup snapshot ID.
- AI result should include model ID and task schema version.
- Active Keep Separate suppression must affect the visible group set and therefore the snapshot.
- If state changes during local inference, validation must reject stale output.

Long local inference must not create a side path around stale checks.

## 14. Human Review And Automation Boundary

Phase 1 interaction model:

1. BIGDROPS builds a deterministic cleanup task.
2. Local AI analyzes the task.
3. Local AI returns a structured proposal.
4. BIGDROPS validates the result.
5. The user reviews the proposal.
6. BIGDROPS deterministic preflight runs.
7. The existing safe mutation path applies only approved changes.

Phase 1 must not include:

- Silent merge.
- Automatic catalog mutation.
- Autonomous alias creation.
- Background cleanup.
- AI-only approval.

High-confidence automation is deferred. It should not be considered until the benchmark suite proves a very low unsafe false-merge rate and the product owner explicitly approves the risk.

## 15. Failure And Fallback Architecture

Manual Cleanup Hub must keep working when AI fails.

Failure behavior:

- Unsupported device: show Local AI unavailable and keep manual cleanup enabled.
- No model installed: show download setup.
- Insufficient storage: show required and available storage.
- Insufficient memory: recommend a lower tier or manual cleanup.
- Model load failure: unload and allow retry.
- Native crash or process kill: return to manual cleanup; do not apply stale result.
- App backgrounding: cancel or pause generation for Phase 1.
- Thermal pressure: pause or cancel and show reason.
- Generation cancellation: discard partial output.
- Malformed JSON: reject with zero mutations.
- Partial output: reject with zero mutations.
- Timeout: cancel and let user retry with smaller batch.
- User deletes model: provider becomes unavailable.
- Model update available: keep old verified model until user installs the new one.

No error path may create merge proposals without validation.

## 16. Privacy And Data Boundary

Local inference keeps Cleanup Hub data on the device after the model is installed.

Data that stays local:

- Cleanup task payload.
- Candidate names.
- Aliases.
- Specification evidence.
- Usage summaries.
- Price summaries included for identity review.
- Keep Separate constraints.
- AI result.

Logging rules:

- Do not log full prompts.
- Do not log full model outputs.
- Use reason codes and task IDs in diagnostics.
- Redact item names from crash reports unless the user explicitly exports diagnostics.
- Do not persist prompts by default.
- Persist only user-approved cleanup decisions through existing Item Library paths.

Remote provider consent:

- The old gateway path sends data off-device.
- It requires explicit user consent.
- It must use the same bounded Cleanup task contract.
- It must strip unrelated financial data.

## 17. Performance And Lifecycle

Phase 1 should use a simple lifecycle:

- Only one local inference task at a time.
- Cleanup batches run sequentially.
- Load model on demand.
- Keep model loaded only while the Cleanup Hub AI sheet/session is active.
- Unload after inactivity, navigation away, memory pressure, or app background.
- Cancel generation when the user closes the AI task.
- Do not run background inference through a foreground service in Phase 1.

Reason:

Foreground services and background inference add product, battery, and Android policy complexity. Cleanup review is a foreground workflow.

Memory policy:

- A loaded model must be treated as expensive.
- WebView memory and native model memory share the same device budget.
- Max tier must still unload on memory pressure.

## 18. Benchmark And Evaluation Dataset

BIGDROPS must use its own benchmark before final model selection.

Dataset size:

- 50 to 100 Cleanup relationships.

Include:

- Obvious same item.
- Obvious different item.
- Ambiguous item.
- Alias cases.
- Formatting differences.
- Primary versus Secondary.
- 12 V versus 24 V.
- Amperage differences.
- 6 W versus 18 W.
- SWG 17 versus SWG 17.5.
- `mm2` and `mm²` conductor sizes.
- Dimensions.
- Capacities.
- Grades.
- Materials.
- Models.
- Part numbers.
- Equipment and application qualifiers.
- Services and workmanship.
- Correct `UNSURE` cases.
- Existing Keep Separate examples.

Scoring:

- Unsafe false merge: highest penalty.
- Invented evidence: high penalty.
- Schema failure: high penalty.
- Correct `UNSURE`: positive.
- Correct same item: positive.
- Correct different item: positive.
- False separation: lower penalty than unsafe merge.
- Latency.
- Peak memory.
- Crash or OOM.
- Battery and thermal observations.

Unsafe false merge must carry much more weight than conservative `UNSURE`.

## 19. Model Selection Gate

Do not lock final models until this gate passes.

Required evidence:

- License is suitable for BIGDROPS commercial use.
- Runtime can load the selected format.
- Model download size is acceptable for its tier.
- Model fits memory with WebView active.
- Structured output passes schema validation.
- Cleanup benchmark has low unsafe false-merge rate.
- Latency is acceptable for review workflow.
- Device does not OOM or crash.
- Model can be cancelled.
- Model can be unloaded.
- Model produces `UNSURE` when evidence is insufficient.

Benchmark candidates:

- Qwen3 small dense family for `llama.cpp`.
- Gemma 3 / Gemma Edge family for Google AI Edge.
- Phi-4 mini ONNX if ONNX Runtime is explored.
- Llama 3.2 1B or 3B only after license review.

## 20. Existing AI PRD Amendment Plan

The existing PRD selected `free-llm-gateway` as the AI backend. That decision remains useful for remote/VPS AI.

The PRD must evolve.

Recommended documentation change later:

- Add a Local AI sub-PRD referenced by `13-ai-integration.md`.
- Keep `free-llm-gateway` as the remote provider path.
- Add a provider layer that supports Local and Gateway providers.
- Add Cleanup Hub as the first AI workload.
- Define that AI never calculates prices, taxes, totals, or PDFs.
- Define that Cleanup AI is advisory and mutation-safe.

Do not create competing AI architecture documents.

## 21. Phased Implementation Plan

Phase A: Native Runtime Proof Of Concept

- Create a local experimental branch later.
- Add a minimal Android plugin.
- Load one small local model from app-private storage.
- Run one prompt.
- Return one structured JSON result.
- Do not connect to Cleanup Hub yet.

Phase B: Device Profile And Model Manager

- Add `DeviceAIProfile`.
- Add model manifest.
- Add download, verify, delete, load, unload, and cancel.
- Use app-private storage.

Phase C: Provider Abstraction

- Add shared `CleanupAIProvider`.
- Add `LocalAndroidAIProvider`.
- Keep future `GatewayAIProvider` compatible.

Phase D: Cleanup Task And Output Contract

- Build `CleanupAITask` from current Cleanup export/snapshot structures.
- Add strict result validation.
- Add structured output schema.

Phase E: Cleanup Hub AI Review UX

- Add an AI proposal surface.
- Show `SAME_ITEM`, `DIFFERENT_ITEM`, and `UNSURE`.
- Require human review.
- Apply only through existing preflight and merge path.

Phase F: Benchmark And Tier Selection

- Run the BIGDROPS dataset on candidate models.
- Record accuracy, unsafe merge rate, memory, latency, and stability.
- Lock Lite, Standard, and Max models only after evidence.

Phase G: Hardening

- Add Android lifecycle handling.
- Add cancellation.
- Add stale result rejection.
- Add download recovery.
- Add redacted diagnostics.

Smallest useful vertical slice:

- One real Cleanup candidate.
- One local model.
- One structured proposal.
- Visible proposal in Cleanup Hub.
- Zero automatic mutation.

## 22. Final Recommendation

### Locked Architectural Decisions

- Cleanup Hub is the first local-AI workload.
- AI is advisory only.
- AI must never mutate Item Library directly.
- AI must use a strict structured output contract.
- Existing Cleanup snapshot validation remains authoritative.
- Existing preflight validation remains authoritative.
- Existing merge RPC remains the mutation path.
- Durable Keep Separate decisions remain authoritative.
- Manual Cleanup Hub must work without AI.
- Models are downloaded after install, not bundled into the APK.
- Model files live in app-private storage.
- The Cleanup domain uses a provider abstraction.
- Local Android and future Gateway providers share one task/result contract.
- Prompts and results are not logged by default.

### Recommended Runtime Architecture

Use `llama.cpp` as the first POC runtime.

Reason:

- It supports GGUF.
- It has Android build guidance.
- It can read app-private model files.
- It supports grammar-constrained output.
- It gives BIGDROPS strong control over structured Cleanup output.

Runner-up:

- Google AI Edge / MediaPipe LLM Inference.

Reason:

- It is Android-first and has strong Gemma support.
- It may be faster to integrate if Gemma models pass structured-output tests.

### Benchmark-Dependent Decisions

Do not hard-lock exact models yet.

Benchmark these first:

- Qwen3 1.7B or similar small dense model for Lite.
- Qwen3 4B for Standard and Max.
- Gemma 3 1B for Lite through Google AI Edge.
- Gemma 3 4B or Gemma Edge model for Standard or Max if memory permits.
- Phi-4 mini ONNX only if ONNX Runtime is explored.

Provisional tiers:

- Lite: 1B to 1.7B Q4.
- Standard: 3B to 4B Q4 or Q5.
- Max: 4B to 7B Q4 or Q5.

### Native Bridge Architecture

Add a future custom Capacitor plugin:

- `LocalAI`
- Java first, unless selected runtime requires Kotlin.
- Native model manager inside Android.
- TypeScript wrapper under `src/lib/native/`.
- Provider wrapper under future `src/services/ai/`.

Do not expose runtime-specific paths or GGUF details to Cleanup Hub.

### Download And Storage

Use a trusted model manifest.

Use HTTPS download into app-private temporary storage.

Verify SHA-256 before install.

Move verified model files into app-private model storage.

Support delete and re-download.

Do not use public Documents or base64 download paths.

### Cleanup Contracts

Input:

- Bounded Cleanup task.
- Snapshot ID.
- Candidate groups.
- Candidate item evidence.
- Specification evidence.
- Keep Separate constraints.

Output:

- Strict JSON.
- `SAME_ITEM`, `DIFFERENT_ITEM`, or `UNSURE`.
- Reason codes.
- Referenced evidence IDs.
- Same task ID and snapshot ID.

Validation:

- Reject stale, malformed, invented, duplicate, or contradictory output.
- Reject Keep Separate violations.
- Apply zero mutations on invalid output.

### PRD Strategy

Do not replace the existing AI PRD.

Create a Local AI appendix or sub-PRD later. Link it from `13-ai-integration.md`.

The PRD should distinguish:

- Provider layer: Local Android and Gateway.
- Product workloads: Cleanup Hub first, other workloads later.

## Verification Result

Verification:

- `git status` before investigation: completed. Pre-existing unrelated changes were present and left untouched.
- Repository inspection: completed.
- External runtime/model research: completed through authoritative upstream documentation where available.
- `git diff --check` on this report: passed.
- `git status` after completion: completed. The only task-created repository path is `docs/reports/ai/`.
- `bun run build`: skipped due to hardware policy and explicit task ban.
- `bun run typecheck`: not run. This is an audit-only task and explicitly forbids it.
- Lint: not run. This is an audit-only task and explicitly forbids it.
- Test suites: not run. This is an audit-only task and explicitly forbids them.
- Model download: not run.
- Dependency installation: not run.
- `supabase db push`: not run. No schema change was made.

## Supabase Push Status

Supabase push status: not applicable.

No migration, schema change, RPC change, or database mutation was performed.

## Risks Or Limitations

- The runtime recommendation is based on repository inspection and upstream documentation. It is not a device benchmark result.
- Android GPU acceleration must be proven on target devices.
- Exact model choices remain benchmark-dependent.
- Model license review is required before production release.
- Current BIGDROPS Android Gradle memory settings are conservative. Native LLM builds may need CI-specific tuning later.
- Local AI can still hallucinate. Deterministic validation and human approval must stay in the path.

## Deferred Work

- Native `llama.cpp` POC.
- Google AI Edge comparison POC.
- Device profile plugin.
- Model manifest service.
- Model download and checksum verification.
- Shared AI provider interface.
- Cleanup AI task/result schema.
- BIGDROPS Cleanup benchmark dataset.
- PRD Local AI appendix.
- Android lifecycle and memory stress testing.
