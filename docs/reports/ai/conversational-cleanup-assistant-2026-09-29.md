# Conversational Cleanup Assistant Report

This report was written by Codex on 2026-09-29 via Codex desktop.

## Objective

Redesign Local AI cleanup as a conversational assistant.

Fix the selected-model installed-state refresh problem after navigation, remount, or app resume.

Preserve deterministic cleanup safety. Preserve the llama.cpp grammar repair.

## Scope

This work changed the Local AI cleanup user interface, assistant command mapping, model-state refresh logic, manual duplicate decision order, and focused tests.

No database schema changed.

No native Java or C++ code changed.

## Files changed

- `src/lib/local-ai/modelSelection.ts`
- `src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx`
- `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx`
- `src/modules/item-library/domain/cleanupLocalAIAssistant.ts`
- `src/modules/item-library/pages/ItemLibraryPage.tsx`
- `src/tests/item-library/cleanupLocalAIAssistant.test.js`
- `src/tests/item-library/itemLibraryCleanupInteraction.test.js`
- `src/tests/local-ai/modelManager.test.js`
- `docs/reports/ai/conversational-cleanup-assistant-2026-09-29.md`

## Skills used

Skills used: libraries-dev, frontend-design, redesign-existing-projects, react-dev, accessibility, mobile-android-design, capacitor-best-practices, capacitor-testing, webapp-testing, karpathy, systematic-debugging, typescript-advanced-types

Documentation standard: ASD-STE100 Simplified Technical English

## Before interaction model

The old Local AI surface looked like a batch control panel.

The primary controls were model selection, review count, start review, cancel, progress, and diagnostics.

The user had to infer what the AI could do. The UI treated native inference completion as the main outcome.

The manual duplicate resolver also put primary item selection before the identity decision. This made similar items feel biased toward merge.

## After interaction model

The Local AI surface is now a Cleanup AI Assistant.

The assistant opens with deterministic context:

- duplicate group count;
- selected model readiness;
- notable specification differences;
- safe next actions.

The assistant does not start inference on open.

The user can type instructions. The assistant maps supported messages to bounded cleanup intents. It acknowledges work before it starts, invokes the existing job engine, shows progress as conversation, and summarizes outcomes after analysis.

The assistant states that nothing was changed.

AI result cards now appear inside the conversation. They show recommendations as analysis only. They offer review actions that route back to the normal deterministic resolver.

## Supported conversational intents

The assistant supports these intents:

- review all duplicate groups;
- review the next N duplicate groups;
- show all results;
- show ready results;
- show unsure results;
- show conflict results;
- show failed results;
- show groups;
- explain a duplicate group;
- choose Lite model;
- choose Standard model;
- retry failed review;
- report current status.

Unsupported messages fail closed with a short capability response.

## Libraries.dev use

The libraries-dev skill was loaded before implementation.

`thinking-orbs` is used for the assistant identity and active inference state.

The orb appears only where it has semantic value:

- assistant presence;
- active model work;
- progress while inference runs.

The effect uses supported preset sizes from the installed package API.

Border Beam and Bot Avatar were not used. They were inspected through the skill guidance, but the installed dependencies did not include those packages. Adding new animation dependencies was not necessary for this task.

Liquid Gooey and Voice Glow were not used. They did not match the cleanup workflow. Voice input does not exist in this app.

## Model-state rehydration root cause

The Cleanup AI panel kept selected-model and native model-status values in component state.

It refreshed those values on initial mount only.

When the user left the Cleanup surface and returned, React state could be stale while native app-private storage still had the installed model. This could show "selected model is not installed" until a full app restart forced a fresh status read.

The fix adds a model selection snapshot refresh path.

The assistant now refreshes:

- selected model ID;
- status for each enabled model;
- runtime information;
- resolved ready or missing state.

The refresh runs on:

- component mount;
- window focus;
- document visibility return;
- Capacitor app resume.

This avoids continuous polling.

## Manual resolver decision-order change

The duplicate resolver now asks:

Are these actually the same item?

The available decisions are:

- Merge;
- Keep separate;
- Leave unresolved.

Primary item selection appears only after Merge is selected.

Keep Separate uses the existing safe action path. Merge still uses the existing confirmation and deterministic preflight path.

## Specification-aware evidence

A new assistant helper detects specification-significant numeric units in item names.

It can detect differences such as:

- wattage;
- voltage;
- amperage;
- dimensions;
- gauge;
- capacity;
- power rating.

The test case verifies that `6 Watts pot lights` and `18 watts pot lights` are treated as different wattage evidence without hard-coding that exact pair.

The AI result validator remains authoritative for model output.

## Safety

AI remains read-only.

The assistant can inspect, explain, propose, organize, and prioritize.

It cannot silently:

- merge items;
- save Keep Separate;
- create aliases;
- link historical rows;
- change prices;
- mutate financial history.

Existing snapshot binding, strict validation, Keep Separate checks, tenant isolation, model allow-list, and deterministic approval paths remain in use.

## Verification result

Verification:

- `bun test src/tests/item-library/cleanupLocalAIAssistant.test.js src/tests/item-library/cleanupLocalAIJob.test.js src/tests/item-library/cleanupLocalAI.test.js src/tests/item-library/cleanupLocalAINativeContract.test.js src/tests/item-library/itemLibraryCleanupInteraction.test.js src/tests/local-ai/modelManager.test.js`: passed, 52 tests.
- `bun run typecheck`: passed.
- `git diff --check`: passed. Git reported line-ending normalization warnings only.
- `git status`: not clean. The status includes this task's changed files and the pre-existing protected `docs/PROJECTSKILLINDEX.md` change.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.
- `bun run audit:load`: skipped. This task did not change schema, query, or data-layer logic.

Native Android compile:

- Not run. No native Java or C++ files changed in this task.

## Compile, test, and device-unproven separation

Compile-proven:

- TypeScript compiles.

Test-proven:

- assistant intent parsing;
- specification-difference detection;
- AI result summary categories;
- selected model status snapshot refresh;
- remount and resume model-state behavior at helper level;
- no native select workflow in model or job-size controls;
- grammar repair regression tests still pass;
- manual resolver requires identity decision before primary selection.

Device-unproven:

- Real Android keyboard behavior;
- real Android route remount behavior;
- real Capacitor resume event delivery;
- live llama.cpp inference success after the prior grammar repair.

## Supabase push status

Supabase push status: not applicable.

No SQL changed.

## Risks or limitations

The assistant uses deterministic command parsing. It is intentionally not a general chatbot.

Retry failed review currently reuses the bounded job engine. It does not yet build a separate failed-only job plan.

The real-device native inference result still needs validation on Android hardware.

## Deferred work

- Add full component interaction tests if the project adds a React DOM test harness.
- Add failed-only retry planning if users need precise retry of only failed groups.
- Validate the assistant on the target Android device with installed Lite and Standard models.
