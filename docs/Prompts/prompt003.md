You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Capacitor 8 + Bun + React Router DOM 7 + Android APK.

==================================================
TASK: Fix three Android native integration issues
==================================================

Three bugs exist in the Android APK. Do NOT assume causes.
Read existing implementations first. Only change code that is necessary.
Do NOT regress web behaviour.

**Already installed (do NOT install again):**
@capacitor/clipboard
@capacitor/app-launcher

==================================================
READ FIRST (mandatory, before any changes)
==================================================
- `AGENTS.md`
- `src/components/app/AndroidBackHandler.tsx`
- `src/components/ui/OpenInAIDropdown.tsx`
- `src/components/import/JsonImportLayout.tsx`
- `App.tsx`, `src/main.tsx`, any root layout/provider component
- `android/app/src/main/java/**/MainActivity.java`
- `capacitor.config.*`

Also locate every usage of:
`navigator.clipboard`, `window.open`, `Browser.open`, `AppLauncher`,
`Clipboard`, `navigate(...)`, `navigate(...,{ replace:true })`

==================================================
ISSUE 1 — Clipboard paste fails on Android
==================================================
Symptom: "Paste failed – Unable to read from clipboard."

Investigate: How does the Paste button currently access the clipboard?
On Android native, replace any web‑only `navigator.clipboard.readText()`
with `@capacitor/clipboard`.

Requirements:
- Desktop keeps using current behaviour.
- Android uses the Capacitor Clipboard plugin.
- Preserve existing error handling and UI.
- Do NOT rewrite unrelated import logic.

==================================================
ISSUE 2 — Open in AI does not launch installed AI apps
==================================================
Symptom: On Android, the "Open in AI" buttons either do nothing or
behave like a browser instead of opening the installed app.

Investigate: How does the current `handleProviderClick` / `openApp`
function decide where to navigate?

On Android native, use `@capacitor/app-launcher`:
- If the provider app is installed → launch the native app.
- If not installed → open the Play Store page.

Desktop behaviour MUST remain unchanged.
Do NOT break the existing provider list or UI.

==================================================
ISSUE 3 — Android hardware Back exits the app immediately
==================================================
Symptom: Pressing Android Back closes the app on every screen,
even when several pages deep.

Expected behaviour (priority order):
1. Close keyboard if open
2. Close dialog/sheet if open
3. Navigate back through React Router history
4. Navigate to logical parent route if needed
5. Only exit after double‑back on a true root screen

==================================================
INVESTIGATE THE BACK BUTTON (do NOT guess)
==================================================

1. Is `AndroidBackHandler` actually mounted?
   - Search for every usage of `AndroidBackHandler`.
   - If it is not mounted at the root of the application, mount it
     exactly once inside the Router so it is always active.

2. Add TEMPORARY debug logging inside the Capacitor `backButton`
   listener:
   - current pathname
   - `canGoBack`
   - `window.history.length`
   - `window.history.state?.idx`
   - logical target
   - whether an overlay was closed
   - whether `exitApp()` would be called

3. Determine why one of these is always happening:
   - `canGoBack` is always `false`
   - `history.state.idx` never increases
   - `history.length` remains 1
   - listener never fires
   - listener gets removed unexpectedly

4. Inspect `MainActivity.java`. Ensure there is no native override
   that consumes the Android back press or calls `finish()`.

5. After fixing, REMOVE the temporary logging and keep the handler clean.

Do NOT remove double‑back‑to‑exit behaviour.
Do NOT remove overlay closing or logical parent navigation.
Do NOT replace everything with `navigate(-1)`.
Do NOT break desktop or PWA behaviour.

==================================================
VALIDATION
==================================================
Run:
- `bun run typecheck`
- `npx cap sync android`

Do NOT run `bun run dev`.
Do NOT modify unrelated files.

==================================================
REPORT
==================================================
Write a report to `docs/Task/reports/fix-android-native-integration.md`
Include:
- Root causes
- Files read
- Files modified
- Exact code changes
- Why each fix was required
- Verification performed
- Remaining assumptions
- Risks