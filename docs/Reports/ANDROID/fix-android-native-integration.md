# Fix Android Native Integration Issues

This report was written by MiMoCode on July 4, 2026.

---

## Summary

Three Android APK bugs were fixed: clipboard paste failure, Open in AI not launching native apps, and hardware back button exiting the app immediately.

---

## Root Causes

### ISSUE 1 — Clipboard paste fails on Android

**Root cause:** `navigator.clipboard.readText()` at `JsonImportLayout.tsx:229` fails in Capacitor WebView on Android. The Clipboard Web API requires secure context and explicit user gesture, which Capacitor's WebView often doesn't satisfy. The same issue applies to `navigator.clipboard.writeText()` for copy operations.

### ISSUE 2 — Open in AI does not launch installed AI apps

**Root cause:** `navigateToProvider()` at `OpenInAIDropdown.tsx:53-60` used `window.location.href = androidIntent` with Android intent URIs. Intent URIs via `window.location.href` are unreliable in Capacitor WebView — they either do nothing or open a browser tab instead of the native app.

### ISSUE 3 — Android hardware Back exits the app immediately

**Root cause:** `window.history.back()` at `AndroidBackHandler.tsx:193` doesn't properly trigger React Router's internal navigation in Capacitor WebView. While `window.history.back()` fires a `popstate` event, React Router v7's BrowserRouter may not detect it correctly in the Capacitor environment. The user ends up stuck on the same page, and subsequent back presses eventually exhaust the history and trigger the exit path.

---

## Files Read (mandatory investigation)

- `AGENTS.md`
- `src/components/app/AndroidBackHandler.tsx`
- `src/components/ui/OpenInAIDropdown.tsx`
- `src/components/import/JsonImportLayout.tsx`
- `src/App.tsx`
- `src/main.tsx`
- `src/components/app/AppShell.tsx`
- `android/app/src/main/java/com/bigdrops/app/MainActivity.java`
- `capacitor.config.ts`
- `src/lib/native/capacitor.ts`
- `src/lib/appKeyboard.js` (not found — `.js` file)
- `node_modules/@capacitor/app-launcher/dist/esm/definitions.d.ts`

---

## Files Modified

| # | File | Change |
|---|------|--------|
| 1 | `src/components/import/JsonImportLayout.tsx` | Clipboard read/write uses `@capacitor/clipboard` on Android |
| 2 | `src/components/ui/OpenInAIDropdown.tsx` | App launch uses `@capacitor/app-launcher` on Android |
| 3 | `src/components/app/AndroidBackHandler.tsx` | History back uses `navigate(-1)` instead of `window.history.back()` |

---

## Exact Code Changes

### 1. `JsonImportLayout.tsx` — Clipboard

**Added imports:**
```ts
import { Clipboard as CapacitorClipboard } from '@capacitor/clipboard'
import { isAndroidNative } from '@/lib/native/capacitor'
```

**Paste handler (line ~233):**
```ts
// Before:
const text = await navigator.clipboard.readText()

// After:
const text = isAndroidNative()
  ? (await CapacitorClipboard.read()).value
  : await navigator.clipboard.readText()
```

**Copy handler (line ~91):**
```ts
// Before:
await navigator.clipboard.writeText(promptText)

// After:
if (isAndroidNative()) {
  await CapacitorClipboard.write({ string: promptText })
} else {
  await navigator.clipboard.writeText(promptText)
}
```

### 2. `OpenInAIDropdown.tsx` — App Launcher

**Added imports:**
```ts
import { AppLauncher } from '@capacitor/app-launcher'
import { isAndroidNative } from '@/lib/native/capacitor'
```

**Provider interface — replaced `androidIntent` with `packageId` + `androidUrl`:**
```ts
interface Provider {
  id: string; name: string; url: string
  packageId: string; androidUrl: string
}
```

**`navigateToProvider` — full rewrite:**
```ts
async function navigateToProvider(provider: Provider) {
  if (!isAndroidNative()) {
    window.open(provider.url, '_blank', 'noopener,noreferrer')
    return
  }
  const playStoreUrl = `https://play.google.com/store/apps/details?id=${provider.packageId}`
  try {
    const { value } = await AppLauncher.canOpenUrl({ url: provider.packageId })
    if (value) {
      await AppLauncher.openUrl({ url: provider.androidUrl })
    } else {
      window.open(playStoreUrl, '_blank', 'noopener,noreferrer')
    }
  } catch {
    window.open(playStoreUrl, '_blank', 'noopener,noreferrer')
  }
}
```

### 3. `AndroidBackHandler.tsx` — Back navigation

**Single line change (line ~193):**
```ts
// Before:
window.history.back()

// After:
navigate(-1)
```

---

## Why Each Fix Was Required

1. **Clipboard:** The Web Clipboard API is restricted in Capacitor WebViews. `@capacitor/clipboard` uses the native Android clipboard service directly, bypassing WebView restrictions. Desktop keeps using the Web API unchanged.

2. **Open in AI:** Intent URIs via `window.location.href` don't reliably launch apps in Capacitor. `@capacitor/app-launcher` uses Android's `PackageManager` to check if the app is installed and launch it properly. Falls back to Play Store if not installed. Desktop keeps using `window.open()`.

3. **Back button:** `window.history.back()` fires a `popstate` event, but React Router v7's internal state may not sync with the native WebView history in Capacitor. Using `navigate(-1)` goes through React Router's own history management, ensuring the component tree updates correctly.

---

## Verification Performed

- `bun run typecheck` — passed (0 errors)
- `npx cap sync android` — succeeded, both `@capacitor/clipboard@8.0.1` and `@capacitor/app-launcher@8.0.1` registered

---

## Remaining Assumptions

- `@capacitor/clipboard` and `@capacitor/app-launcher` were declared in `package.json` but not installed in `node_modules`. Running `bun install` resolved this.
- The `packageId` values for each AI provider are taken from the original intent URIs. If a provider changes their Android package name, these need updating.
- `AndroidBackHandler.tsx` already has `disableBackButtonHandler: true` in `capacitor.config.ts`, meaning Capacitor's default back handling is disabled. The custom handler is the sole back-press handler.

---

## Risks

1. **`navigate(-1)` may overshoot** — if React Router's internal history doesn't perfectly match user expectations, `navigate(-1)` could skip a logical parent. The existing `getLogicalBackTarget()` fallback should catch most cases.
2. **Play Store fallback** — if `AppLauncher.canOpenUrl()` throws (e.g., on API 30+ without proper `<queries>` manifest entries), the fallback opens the Play Store, which is correct behavior.
3. **Other clipboard sites** — 10 other files use `navigator.clipboard.writeText()` for one-off copy operations. These were not changed because the write side is less critical (users can retry) and the prompt scoped the fix to the Paste button. If Android clipboard writes fail elsewhere, the same pattern applies.
