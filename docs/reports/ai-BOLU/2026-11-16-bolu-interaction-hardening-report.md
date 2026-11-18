# Bolu Interaction Hardening Report

This report was written by Buffy on 2026-11-16 via Freebuff.

## Objective

Complete and harden the Bolu 2.0 message interaction work: reliable Android narration, correct browser fallback, restrained haptics, branch integrity across history reloads, and accurate documentation.

## Scope

In scope: narration implementation and native bridge, haptic scope, edit and regeneration persistence order, supersession filtering review, settings support detection, focused tests, PRD and roadmap updates.

Out of scope: database schema changes, model-picker or header changes, new messaging features, commits and pushes.

## Files changed

New:

- `android/app/src/main/java/com/bigdrops/app/plugins/BoluSpeechPlugin.java`
- `src/lib/native/boluSpeech.ts`
- `src/hooks/useBoluNarrationSupport.ts`
- `src/tests/ai-assistant/bolu-interaction-hardening.test.ts`
- `docs/reports/ai/2026-11-16-bolu-interaction-hardening-report.md`

Changed:

- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/bigdrops/app/MainActivity.java`
- `src/lib/ai-assistant/bolu-narration.ts`
- `src/lib/ai-assistant/bolu-haptics.ts`
- `src/lib/ai-assistant/hooks/useBoluNarration.ts`
- `src/lib/ai-assistant/bolu-thread-actions.ts`
- `src/lib/ai-assistant/hooks/useBoluThread.ts`
- `src/hooks/useBoluChatInteractions.ts`
- `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`
- `src/pages/settings/bolu-provider/BoluInteractionPreferencesCard.tsx`
- `docs/prd/conversational-document-assistant/functional-req.md`
- `docs/prd/conversational-document-assistant/Waterfall-roadmap.md`

Skills used: react-dev, typescript-advanced-types, capacitor-plugins
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Native narration

- Added a local Capacitor plugin that wraps the Android `TextToSpeech` engine. It speaks only prepared text, applies the speech rate, emits state events and releases the engine on destroy.
- Registered the plugin in `MainActivity` and declared the `android.intent.action.TTS_SERVICE` query that Android 11 and later require. No permission was added.
- Added a guarded TypeScript wrapper with capability probing and safe fallbacks.
- The narration hook now selects the engine from capability: native first, browser second, none last. It sends sentence-sized chunks to the native engine, which makes pause and resume possible. A stop stops both engines. A session token discards late callbacks. Unmount, conversation change and Bolu close stop speech.
- The settings card now reports engine-aware availability. The speaker action stays disabled when no engine exists, and the chat keeps working.

### Haptics

- Removed vibration from copy, edit, regenerate, send, narration start and save.
- Removed the `impact-medium` pattern. Two patterns remain: the 12ms start pulse and the short completion double tap.
- `useBoluResponseHaptics` is the only haptic caller. Its guards keep one start pulse and one completion pulse per response identifier.
- Preferences stay independent: master haptics switch and completion switch.

### Editing and regeneration

- The edited request is now stored before dependent turns are superseded. If the branch write fails, the original text is restored and the operation stops with an error.
- Regeneration still replaces the assistant row in place, keeps the original request and leaves the two approval gates closed.

### Supersession review

- Initial load, conversation change and realtime refresh all use `fetchMessages`, which filters `metadata.superseded`.
- No other display path selects `bolu_messages`.
- Superseded rows stay in the table. No migration was added.
- Export uses the active message array, so superseded turns do not appear in an export.

## Verification result

Verification:

- `bun run audit:load`: passed, no new oversized file
- `bun run typecheck`: passed
- `bun test src/tests/ai-assistant/`: 304 pass, 0 fail across 32 files
- `bun test src/tests/ai-assistant/bolu-interaction-hardening.test.ts`: 17 pass
- `git status`: reviewed, only intended files added or changed by this pass
- `bun run build`: skipped due to hardware policy

Android compilation and device behaviour were not verified. Gradle was not run on this host.

## Supabase push status

Not applicable. This pass made no schema change.

## Risks or limitations

- Native narration is implemented but NOT VERIFIED on a physical Android device.
- Pause repeats at most one sentence on Android because the engine has no in-utterance pause.
- The engine voice follows device language and settings. There is no voice picker.
- Visual checks at five viewport presets and both themes are PENDING.
- Branch restoration is not possible without a schema change.

## Deferred work

- PROPOSED: branch tree with restore.
- PROPOSED: official Capacitor Haptics plugin.
- PROPOSED: voice selection.
- PROPOSED: account-scoped interaction preferences.

## Classification

- IMPLEMENTED: native Android narration, browser fallback, engine selection, chunked pause and resume, lifecycle cleanup, haptic scope reduction, edit write order.
- AUTOMATED-VERIFIED: engine precedence, chunking, hidden-envelope exclusion, haptic scope, plugin registration and manifest wiring, bridge guards, hook guards, edit write order, supersession reload paths.
- DEVICE-VERIFIED: none in this pass.
- NOT VERIFIED: Android speech output, Android haptic timing, system vibration interaction, five viewport presets, both themes.
- PROPOSED: branch restore, native haptics plugin, voice picker, account-scoped preferences.
