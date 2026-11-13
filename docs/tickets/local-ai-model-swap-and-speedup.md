# Local AI Model Catalog Replacement and Inference Speedup

This ticket was written by MiniMax M3.1 Flash on 2026-11-13 via OpenCode.

---

## Status: OPEN

Area: Local AI (Item Library Cleanup Hub, Android)
Priority: High
Type: Performance / Model Selection

## Objective

The on-device Local AI review is slow and its output is not usable. This ticket records the measured cause, the model research, and the proposed work order.

The Local AI feature runs a GGUF model on the device through llama.cpp. The model produces a read-only duplicate review for the Cleanup Hub.

## Scope

In scope:

- The model catalog in `src/lib/local-ai/modelManifest.ts` and its native mirror in `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`.
- The Cleanup AI prompt in `src/modules/item-library/domain/cleanupLocalAI.ts`.
- The native generation loop in `android/app/src/main/cpp/local_ai_jni.cpp`.
- The native output grammar in `LocalAIPlugin.java`.
- The build configuration in `android/app/src/main/cpp/CMakeLists.txt`.

Out of scope:

- Item Library merge, alias, or history logic. Local AI stays read-only.
- Any Supabase schema change.
- The web build. Local AI is Android only.

---

## Confirmed Defect A - Lite Model Download Always Fails

Status: fixed in the working tree, not yet verified on a device.

### Root cause

`LocalAIPlugin.java` used one hardcoded download URL for every model id. The Lite card downloaded the 1.7B file and then failed the pinned manifest check.

```
URL url = new URL(POC_MODEL_DOWNLOAD_URL);   // always the 1.7B file
```

The native plugin had no Lite URL. It had the Lite byte count and digest only. The download therefore ended with:

```
Downloaded model size does not match the pinned manifest.
```

1,107,409,472 bytes did not match the Lite value of 484,220,000 bytes.

### History

| Commit | Change |
|---|---|
| `73b13939` | Model manager. One download URL, the QuantFactory 0.6B URL. |
| `488a7e3f` | Multi-model. The URL was replaced by the unsloth 1.7B URL. One constant remained. The 0.6B URL was removed. |

### Change applied

- Added `LEGACY_POC_MODEL_DOWNLOAD_URL`.
- Added `downloadUrlFor(modelId)`.
- The download site now calls `downloadUrlFor(modelId)`.
- Added a test in `src/tests/local-ai/modelManager.test.js`. It fails against the old code.

---

## Confirmed Defect B - No Fallback To An Installed Model

Status: fixed in the working tree, not yet verified on a device.

`resolveLocalAIModelForJob` in `src/lib/local-ai/modelSelection.ts` checked only the recommended model when no model was selected. A device with only the Lite model installed was told that no model was available, although one was installed.

The function now falls back to any installed model in catalog order.

---

## Measured Cause Of Slowness

### Prompt measurement

Measured on 2026-11-13 with the current prompt builder. The group had three items, two aliases, and one flag reason.

| Part | Characters | Approximate tokens |
|---|---|---|
| Rules and ChatML framing | 821 | 229 |
| Output shape example | 604 | 168 |
| Task JSON | 1,390 | 387 |
| Total | 2,871 | 798 |

The token count is an estimate at 3.6 characters per token.

### Cause 1 - The output shape example is not needed

The prompt carries a JSON example of the required output. The native GBNF grammar already enforces that exact shape. The example is 168 approximate tokens of prefill in every request.

### Cause 2 - A new llama context per group

`nativeGenerate` in `local_ai_jni.cpp` calls `llama_init_from_model` and `llama_free` for every call. The KV cache is destroyed after each group. The shared rules prefix is therefore prefilled again for every group. llama.cpp prefix reuse cannot work.

### Cause 3 - CPU backend only

`android/app/src/main/cpp/CMakeLists.txt` sets no `GGML_VULKAN`. The device GPU is not used. The `ggml-vulkan` backend is present in the pinned llama.cpp source.

### Reference speed

These values are quoted from the Liquid AI LFM2.5-1.2B-Instruct model card. They are not measured by this project.

| Model | Device and backend | Prefill | Decode | Memory |
|---|---|---|---|---|
| LFM2.5-1.2B | Snapdragon Gen 4, Galaxy S25 Ultra, llama.cpp Q4_0 | 335 tok/s | 70 tok/s | 719 MB |
| Qwen3-1.7B | Snapdragon Gen 4, Galaxy S25 Ultra, llama.cpp Q4_0 | 181 tok/s | 40 tok/s | 1306 MB |

At 181 tok/s, the 798 token prompt costs about 4.4 seconds of prefill before the first output token. A 25 group job repeats that cost 25 times.

---

## Confirmed Cause Of Unusable Output

### Cause 1 - The Lite model is a base model

The Hugging Face API reports `QuantFactory/Qwen3-0.6B-GGUF` with `base_model:Qwen/Qwen3-0.6B-Base`. The model is not instruction tuned.

The app prompts it with ChatML. A base model does not answer an instruction. It continues the text. The previous device evidence covers install, verification, and load only. Output quality was never proven.

### Cause 2 - The output contract asks for UUID transcription

The grammar requires `group_id`, `winner_item_id`, `merged_item_ids`, and `referenced_evidence_ids`. The validator in `cleanupLocalAI.ts` rejects any value that is not exactly inside the group.

Item ids and group ids are database UUIDs. A model of 1.7B parameters or less garbles them. The proposal is then rejected and the group is reported as failed. The model is graded on transcription, not on judgement.

---

## Model Research

All rows were verified on 2026-11-13. The revision, byte count, and digest come from the Hugging Face API and the resolve endpoint response headers. The architecture string was read from the GGUF metadata.

| Model | Repository | Revision | Bytes | SHA-256 |
|---|---|---|---|---|
| LFM2.5-350M-Instruct | `LiquidAI/LFM2.5-350M-GGUF` | `657e078c94084481950a2d555a941481f715536b` | 229,312,224 | `7e6f72643caafc9a68256686638c4d7916f2cec76d1df478d4c3ddcd95a6aed4` |
| LFM2.5-1.2B-Instruct | `LiquidAI/LFM2.5-1.2B-Instruct-GGUF` | `8ed288026e23958ad9dfa92d53ed773a8eee7125` | 730,895,168 | `b1b3de114215d9507409a662a501a631095a479a419584e8a2ded6304b19b4f5` |
| Qwen3.5-0.8B | `unsloth/Qwen3.5-0.8B-GGUF` | `6ab461498e2023f6e3c1baea90a8f0fe38ab64d0` | 532,517,120 | `bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517` |
| Qwen3.5-2B | `unsloth/Qwen3.5-2B-GGUF` | `f6d5376be1edb4d416d56da11e5397a961aca8ae` | 1,280,835,840 | `aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223` |

### Licensing

| Model | License | Commercial use |
|---|---|---|
| LFM2.5-350M-Instruct | LFM1.0 | Allowed below 10 million US dollars annual revenue. |
| LFM2.5-1.2B-Instruct | LFM1.0 | Allowed below 10 million US dollars annual revenue. |
| Qwen3.5-0.8B | Apache-2.0 | Allowed. |
| Qwen3.5-2B | Apache-2.0 | Allowed. |

Use the Qwen3.5 pair if the revenue threshold becomes a problem.

### Compatibility with the pinned llama.cpp

The pinned llama.cpp commit is `4da6337767f973e2b4d0797e5b323d77d8565e4a`.

| Architecture | In the pinned commit | Result |
|---|---|---|
| `lfm2` | Yes | LFM2.5 loads. |
| `qwen35` | Yes | Qwen3.5 loads. |
| `smollm3` | Yes | SmolLM3 loads. |
| `gemma3` | Yes | Gemma 3 loads. |
| LFM3 | No | LFM3-1.7B installs but fails to load. Do not use it. |

### Chat template

The LFM2.5 tokenizer sets `eos_token` to `<|im_end|>` and the model card documents a ChatML format. The existing ChatML framing in `buildCleanupLocalAIPrompt` therefore works for LFM2.5 without a change.

`llama_tokenize` in `local_ai_jni.cpp` is called with `add_special = true`. The model start of text token is added automatically. This is correct for LFM2.5.

---

## Proposed Work Order

### Step 1 - Reduce the output contract

No model change is needed for this step.

- The model returns only `decision`, `reason_code`, and a short `reason`.
- The app derives `group_id`, `winner_item_id`, `merged_item_ids`, and `referenced_evidence_ids` in code.
- The native grammar in `LocalAIPlugin.java` is reduced to match.
- The validator in `cleanupLocalAI.ts` is updated to match.

This removes the UUID transcription failure class. It also shortens the decode step.

### Step 2 - Reduce the prompt

- Delete the output shape example. The grammar enforces the shape.
- Remove `evidence_ids`, `usage_count`, and `last_price` from the task JSON that goes to the model.
- Keep the decision rules short.

Target: 798 approximate tokens down to about 250.

### Step 3 - Keep the llama context alive for a job

- Create the context once when a job starts.
- Keep the shared rules prefix in the KV cache.
- Destroy the context when the job ends.

llama.cpp then prefills only the group specific part for each group.

### Step 4 - Replace the model catalog

- Lite: LFM2.5-350M-Instruct, 229 MB.
- Standard: LFM2.5-1.2B-Instruct, 731 MB.
- Update `src/lib/local-ai/modelManifest.ts`.
- Update the model constants in `LocalAIPlugin.java`.
- Keep one download URL constant per model. The test from Defect A must cover every catalog entry.

### Step 5 - Optional, separate ticket

- `GGML_VULKAN=ON` in `CMakeLists.txt` for GPU offload. The backend is in the pinned source. The build needs `glslc` from the Vulkan SDK, so the build pipeline can fail. Treat it as a separate task.
- The Qualcomm Hexagon NPU backend is also in the pinned source. It is a large task.
- Parallel group decoding with `n_seq_max` greater than one. It adds complexity to the job runner.

---

## Acceptance Criteria

- The Lite model installs and reaches the installed and verified state on a device.
- The Standard model installs and reaches the installed and verified state on a device.
- A bulk job of 25 groups completes on a mid range device without a network connection.
- The model output does not contain item ids or group ids.
- The proposal validator no longer rejects a proposal because of an identifier mismatch.
- The prompt for one group is under 300 tokens.
- The llama context is created once per job and not once per group.
- Every catalog entry has its own download URL constant in the native plugin.
- A test fails if a catalog entry is missing from the native plugin.
- A device test records the elapsed time per group before and after the change.
- Item Library data is not changed by any Local AI run.

## Verification Status

Verified on 2026-11-13:

- The Hugging Face base model tags for both current models.
- The revision, byte count, and SHA-256 of all four candidate models.
- The GGUF architecture string of both LFM2.5 files.
- The architecture list in the pinned llama.cpp checkout.
- The LFM1.0 revenue threshold text.
- The prompt measurement.
- `:app:compileDebugJavaWithJavac` passed for Defect A.
- The local AI test file passed with 14 tests.

Not verified:

- Any device download, install, load, or generation.
- Any elapsed time on a device.
- Output quality for any candidate model.

## Risks And Limitations

- Step 1 changes `src/modules/item-library/domain/cleanupLocalAI.ts`. The repository guardrails mark that path as protected. It needs explicit approval before the change.
- Step 1 changes the native grammar and the TypeScript validator together. A mismatch between them fails every proposal.
- The time estimate of 2 to 3 seconds per group is a projection. It is not measured.
- The Vulkan backend needs a Vulkan SDK in the build environment.
- The native plugin still holds a copy of the catalog. A new catalog entry needs a new native constant. A catalog file that the native side reads would remove this duplication. That is a separate task.

## References

- `src/lib/local-ai/modelManifest.ts`
- `src/lib/local-ai/modelSelection.ts`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/domain/cleanupLocalAI.ts`
- `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx`
- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `android/app/src/main/cpp/local_ai_jni.cpp`
- `android/app/src/main/cpp/CMakeLists.txt`
- `src/tests/local-ai/modelManager.test.js`
- `docs/reports/ai/bigdrops-local-ai-multi-model-manager-2026-09-28.md`
- `docs/reports/ai/bigdrops-local-ai-product-integration-model-manager-2026-09-28.md`
