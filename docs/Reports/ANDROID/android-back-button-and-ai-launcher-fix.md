# Android Back Button & AI Launcher Fix

This report was written by MiMoCode on July 4, 2026 via Local Runner.

---

## Scope

Two Android-native issues: hardware back button producing no action, and "Open in AI" always falling back to Play Store. Investigation, root cause identification, and surgical fixes.

---

## ISSUE 1 — Hardware Back Button

### Symptom

Pressing Back inside the app does nothing. No navigation, no overlay dismissal, no "press again to exit" toast. The app minimizes immediately, and reopening resumes exactly where it was.

### ADB Log Evidence

`docs/Tickets/Try.txt` contains a full `adb logcat Capacitor/Console:I` capture. The filter `findstr "[BACK]"` returned zero matches (line 5). The `[BACK]` log prefix is emitted by `AndroidBackHandler.tsx` lines 177-183 whenever the Capacitor `backButton` event fires. Zero matches proves the event never reaches JavaScript.

### Pipeline Trace

```
Hardware Button
  → Android Activity (MainActivity.java)         ← no onBackPressed override
    → OnBackPressedDispatcher                      ← callback registered but DISABLED
      → AppPlugin.handleOnBackPressed()            ← never called
        → notifyListeners("backButton")            ← never executed
          → AndroidBackHandler listener            ← never receives event
```

### Root Cause

`capacitor.config.ts` line 13 sets `disableBackButtonHandler: true`.

In `@capacitor/app` v8.1.0, `AppPlugin.java` line 50:

```java
this.onBackPressedCallback = new OnBackPressedCallback(!disableBackButtonHandler) {
```

When `disableBackButtonHandler = true`, the callback is constructed with `enabled = false`. Android's `OnBackPressedDispatcher` only dispatches to enabled callbacks. A disabled callback is invisible to the dispatcher — it never receives `handleOnBackPressed()`, so the `backButton` JS event is never emitted.

The config comment ("Keep Capacitor's default back handler disabled because the app already uses a custom AndroidBackHandler in the web layer") is incorrect in its reasoning. Setting this to `true` does not merely suppress the default handler — it disables the entire callback including event emission.

### Fix

Changed `disableBackButtonHandler` from `true` to `false` in `capacitor.config.ts`.

With `false`:
- `OnBackPressedCallback` is created with `enabled = true`
- `handleOnBackPressed()` fires on every back press
- The method checks `hasListeners("backButton")` — since `AndroidBackHandler` registers a listener, this is true
- The event is emitted with `canGoBack` reflecting WebView history
- JavaScript handler receives the event and executes its full pipeline: keyboard dismiss → overlay close → history navigation → logical parent → root-route double-back exit

---

## ISSUE 2 — Open in AI Always Falls Back to Play Store

### Symptom

Every AI provider (ChatGPT, Gemini, Claude, DeepSeek, Qwen, Kimi) opens the Play Store instead of the installed app. Qwen shows "page not found" on Play Store.

### Code Analysis

`OpenInAIDropdown.tsx` line 71:

```typescript
const { value } = await AppLauncher.canOpenUrl({ url: provider.packageId })
```

This calls `canOpenUrl` with raw Android package IDs like `com.openai.chatgpt`.

### Root Cause

Android 11 (API 30) introduced [package visibility restrictions](https://developer.android.com/training/package-visibility). Apps cannot query the presence of other installed apps unless they declare `<queries>` entries in their `AndroidManifest.xml`. The current manifest (`android/app/src/main/AndroidManifest.xml`) contains zero `<queries>` elements.

Without `<queries>`, `PackageManager.queryIntentActivities()` returns an empty set for package name queries. The Capacitor `AppLauncher.canOpenUrl()` implementation relies on this API. Result: every `canOpenUrl()` call returns `false`, and the code always opens the Play Store fallback.

The secondary issue: `openUrl()` was called with `provider.androidUrl` (e.g., `https://chatgpt.com`) which is a web URL. Even if detection succeeded, opening a web URL could resolve to the browser rather than the native app.

### Fix (two parts)

**Part A — AndroidManifest.xml:** Added `<queries>` entries for all six AI app package IDs. This restores Android's package visibility for these specific apps.

**Part B — OpenInAIDropdown.tsx:** Changed `canOpenUrl()` to use `provider.url` (the `https://` web URL) instead of `provider.packageId`. On Android 11+, `https://` and `http://` URLs are automatically visible to intent resolution without `<queries>` declarations. This makes detection work even without the manifest entries, and `openUrl()` with the same `https://` URL resolves to the native app through Android's standard intent mechanism.

---

## Files Modified

| File | Change |
|------|--------|
| `capacitor.config.ts` | `disableBackButtonHandler: true` → `false` |
| `android/app/src/main/AndroidManifest.xml` | Added `<queries>` block for 6 AI packages |
| `src/components/ui/OpenInAIDropdown.tsx` | `canOpenUrl` uses `provider.url` instead of `provider.packageId` |

### Why Previous Implementation Failed

**Back button:** The `disableBackButtonHandler: true` setting was documented as suppressing only the default handler. It actually disables the entire `OnBackPressedCallback`, preventing event emission. The web-layer custom handler never receives events.

**AI launcher:** Package name queries require `<queries>` declarations on Android 11+. Without them, `canOpenUrl()` always returns false. The Play Store fallback runs unconditionally.

### Why New Implementation Works

**Back button:** `false` enables the callback. Capacitor emits `backButton` to JS. `AndroidBackHandler` processes it through its full pipeline.

**AI launcher:** `https://` URLs bypass package visibility restrictions entirely. Combined with `<queries>` as a belt-and-suspenders measure, `canOpenUrl()` correctly detects installed apps. `openUrl()` with the same `https://` URL resolves to the native app via Android's intent system.

---

## Verification

- `bun run typecheck` — passed (0 errors)
- `git status` — only 3 intended files modified, no unrelated changes
- `bun run build` — skipped per AGENTS.md hardware constraint
- `bun run audit:load` — not required (no schema or query changes)

---

## Risks & Limitations

1. The `disableBackButtonHandler: false` change means Capacitor's default handler is now active alongside the custom one. If `AndroidBackHandler` fails to mount or its listener registration errors silently, the default behavior (app close) would execute. The component's `isAndroidNative()` guard and async setup make this unlikely but not impossible.

2. The `<queries>` entries are static. If a provider changes their Android package ID, the manifest must be updated manually.

3. Qwen's Play Store listing may use a different store URL structure or may not be available in the test device's region, explaining the "page not found" in the original report. This is an external dependency beyond our control.
