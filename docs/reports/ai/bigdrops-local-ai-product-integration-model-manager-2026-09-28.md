# BIGDROPS Local AI Product Integration And Model Manager Report

This report was written by Codex on 2026-09-28 via Codex Desktop.

## Objective

Implement the missing product integration layer for the BIGDROPS Local AI Phase 2 proof of concept.

The work adds a user-facing Local AI model manager and makes Cleanup Hub show three clear duplicate review methods:

- Review Manually in App.
- Review with Local AI.
- Export for External AI Review.

## Scope

This task changed only the Local AI product surface, the Android LocalAI plugin model lifecycle, the Cleanup Hub duplicate review entry points, and focused tests.

No database schema changed.

No Item Library mutation path was added.

No AI apply action was added.

## Files Changed

- `android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java`
- `src/lib/local-ai/modelManifest.ts`
- `src/lib/local-ai/modelStatus.ts`
- `src/lib/native/localAI.ts`
- `src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx`
- `src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx`
- `src/modules/item-library/components/ItemLibraryLocalAIReviewPanel.tsx`
- `src/modules/item-library/domain/cleanupLocalAI.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/modules/item-library/types/itemLibrary.ts`
- `src/pages/Settings.tsx`
- `src/pages/settings/LocalAISettingsSection.tsx`
- `src/pages/settings/settings-config.ts`
- `src/tests/item-library/itemLibraryCleanupInteraction.test.js`
- `src/tests/local-ai/modelManager.test.js`

## Skills Used

Skills used: frontend-design, react-dev, typescript-advanced-types, capacitor-best-practices, capacitor-plugins, capacitor-security, debugging-capacitor, capacitor-testing, capacitor-accessibility, mobile-android-design, webapp-testing, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

### Model Manager

Added a Local AI Settings section.

The section shows:

- runtime link status;
- pinned model name;
- install status;
- expected model size;
- source repository and revision;
- download progress;
- verification status;
- delete and re-download controls.

Unsupported platforms fail closed and show unavailable status. They do not expose a fake download path.

### Model Artifact Integrity

The POC model is pinned in a shared manifest:

- repository: `QuantFactory/Qwen3-0.6B-GGUF`;
- revision: `e7e05d713acaa2baccdfb52e967eaba8ba562ba8`;
- file: `Qwen3-0.6B.Q4_K_M.gguf`;
- size: `484,220,000` bytes;
- SHA-256: `7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d`.

The SHA-256 came from the Hugging Face model tree API `lfs.oid` field for the exact pinned revision and file. It is not assumed from the HTTP ETag.

### Android Native Model Lifecycle

The Android LocalAI plugin now supports:

- `getModelStatus`;
- `downloadModel`;
- `cancelModelDownload`;
- `verifyModel`;
- `deleteModel`.

The plugin enforces the allowed model ID and URL in native code.

Download uses HTTPS only. It streams to app-private temporary storage. It reports progress. It checks available app-private storage before starting. It verifies byte count and SHA-256 before promotion.

Only a verified model gets metadata. `loadModel` now requires the verified metadata and model file. A file with the correct name is not sufficient.

The model remains in app-private storage. No GGUF file is committed.

### Cleanup Hub Method Selection

Cleanup Hub duplicate review now has three distinct choices:

- manual in-app review;
- read-only Local AI review;
- external AI export/import review.

The old "Use AI for Duplicate Review" copy was removed from the method chooser.

The external path is now labelled as external review. This avoids confusion with on-device Local AI.

### Local AI Duplicate Review

The Local AI panel is now a dedicated duplicate review mode.

It can:

- check runtime and model status;
- download and verify the model when missing;
- cancel model download;
- load the verified model;
- run the existing Cleanup AI task;
- pass the native JSON through the existing TypeScript validator;
- show a read-only proposal.

It still cannot apply, merge, create aliases, or mutate Item Library data.

### Clean And Standardize Catalog

Clean and Standardize Catalog does not claim full-catalog Local AI support.

It now explains that Local AI is currently limited to flagged duplicate groups. It provides a button to open the duplicate Local AI workflow when duplicate groups exist.

Full-catalog cleanup remains the locked external export/import flow.

### Android Cleanup Navigation

The Android mobile "Cleanup" back control now handles cleanup sub-screens correctly.

For full-screen cleanup sub-screens, it returns to Cleanup Hub.

For list/detail duplicate review screens, it still closes the detail view.

## Safety Properties Preserved

- Local AI remains advisory.
- Local AI remains read-only.
- Cleanup snapshot validation remains in the TypeScript validator.
- Keep Separate conflicts remain validator constraints.
- Unknown groups, items, and evidence remain rejected.
- No merge or apply button was added to Local AI.
- No historical identity mutation was added.
- No database schema or RPC changed.

## Verification Result

- `bun test src/tests/item-library/cleanupLocalAI.test.js src/tests/local-ai/modelManager.test.js src/tests/item-library/itemLibraryCleanupInteraction.test.js`: passed, 22 tests.
- `bun run audit:load`: completed with existing repository warnings and exit code 0.
- `bun run typecheck`: passed.
- `android\gradlew.bat :app:compileDebugJavaWithJavac :app:externalNativeBuildDebug`: passed. This verified Java compilation and CMake arm64-v8a native build.
- `git diff --check`: passed.
- `git status`: shows the task files listed above plus unrelated pre-existing invoice and BOQ design artifacts.
- `bun run build`: skipped due to hardware policy.

## Supabase Push Status

Not applicable. No SQL, schema, RPC, or tenant provisioning change was made.

## Runtime Evidence

No Android device or emulator inference run was performed in this task.

The native compile path passed. Device validation is still required to prove:

- model download on a real device;
- SHA-256 verification on a real device;
- model load after verified install;
- real Cleanup candidate inference;
- cancellation during generation;
- unload after inference.

## Device Validation Steps

1. Install a debug build that contains this patch.
2. Open BIGDROPS on Android.
3. Go to Settings.
4. Open Local AI.
5. Confirm runtime shows `llama.cpp linked`.
6. Tap Download and verify model.
7. Wait for progress to reach 100%.
8. Confirm the status is Installed and verified.
9. Open Item Library.
10. Open Cleanup Hub.
11. Select Fix Duplicate Items.
12. Select Review with Local AI.
13. Select a real duplicate group.
14. Tap Analyze locally.
15. Confirm the result is Same, Different, or Unsure.
16. Confirm no apply, merge, alias, or mutation control appears in the Local AI panel.
17. Cancel a second run and confirm partial output is discarded.
18. Unload the model.
19. Return to manual Cleanup Hub and confirm manual review still works.

## Risks Or Limitations

- The model provider is a community GGUF quantization. It is suitable for the POC only.
- Model download is large. Users need enough app-private storage and a stable network.
- The Settings section uses the current POC manifest. A production Model Manager still needs its own architecture.
- Android device validation remains required before this can be called a passed on-device POC.

## Deferred Work

- Production model catalog and policy.
- Lite, Standard, and Max model tiers.
- Gateway AI provider integration.
- Background download recovery across process death.
- On-device inference performance measurement.
- User-facing production model release notes.
- Historical Review AI.
- Any AI-powered mutation workflow.

