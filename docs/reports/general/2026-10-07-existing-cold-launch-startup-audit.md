# Existing Cold-Launch / Startup Architecture Audit

This report was written by Muse Spark on 2026-10-07 via OpenCode.

Objective: trace the current production cold-start path of the BIGDROPS application from cold start to usable application for a returning user. Zero code changes apply to this task.

Scope: active production startup implementation only. Design prototypes under `docs/templates/html-temps/onboarding-candidates/` are not production evidence. No redesign. No integration. No cleanup.

Files changed: `docs/reports/general/2026-10-07-existing-cold-launch-startup-audit.md` (this report only).

Skills used: karpathy, capacitor-splash-screen, vercel-react-best-practices, supabase
Documentation standard: ASD-STE100 Simplified Technical English

Report path note: the task brief named `docs/Reports/2026-10-07-existing-cold-launch-startup-audit.md`. AGENTS.md (`.claude/agent-instructions/documentation.md`) requires reports under `docs/reports/<domain>/`. The repository uses lowercase `docs/reports/` with a `general/` domain directory. This report follows the AGENTS.md convention.

## Executive Finding

The BIGDROPS cold-launch experience is a single full-viewport overlay component, `SplashOverlay` (`src/components/app/SplashOverlay.tsx`), rendered unconditionally by the root `App` component (`src/App.tsx`). It stays mounted permanently and toggles visibility with a 300 ms CSS opacity transition. A 600 ms minimum-visible timer (`src/App.tsx` lines 520-534) keeps the overlay on screen after real readiness completes. This is the only intentional post-readiness delay in the startup path. No Capacitor SplashScreen plugin exists in the project. No service worker exists. The native Android splash is the OS-controlled `Theme.SplashScreen` window background. It dismisses automatically. The existing tips engine (`src/domain/guidance/guidanceEngine.ts` plus `src/lib/tipContent.ts`) is a session-scoped singleton with deterministic rotation. The splash consumes it through `useLoadingTip`. The engine is safe to reuse. Readiness logic and visual presentation are separate already. The proposed seam (keep readiness authority, replace only the visual layer) is supported by repository evidence.

## Audit Scope

The audit covers cold start to usable application for a returning user:

- Application bootstrap entry and root component.
- Router initialization.
- Authentication and session restoration.
- Tenant (workspace plus entity) resolution.
- Permissions and role initialization.
- Settings and theme initialization.
- Supabase startup calls.
- Local-storage hydration relevant to startup.
- Capacitor and native startup behavior.
- Service worker and PWA startup behavior.
- Every loading UI reachable before the application becomes usable.
- Timing, delays, failure states, responsive behavior, theme authority.

Evidence labels used in this report:

- PROVEN: read directly from repository source.
- LIKELY: strong inference from direct evidence, flagged as inference.
- NOT FOUND: searched, no evidence exists.
- UNRESOLVED: evidence is ambiguous or missing.

## Skills Used

- `karpathy`: discipline for evidence-first reasoning. No assumptions stated as facts.
- `capacitor-splash-screen`: reference model for native splash behavior. Used to check the project against correct Capacitor splash patterns.
- `vercel-react-best-practices`: waterfall and render-gate awareness during startup tracing.
- `supabase`: session restoration and client initialization semantics.

## Git Status Baseline

`git status` ran BEFORE investigation. Result: pre-existing uncommitted changes exist. The auditor did not touch them.

Modified (pre-existing, untouched):

- `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`
- `android/app/src/main/res/drawable/ic_launcher_background.xml`
- `android/app/src/main/res/mipmap-*/ic_launcher*.png` (12 icon files)
- `android/app/src/main/res/values/ic_launcher_background.xml`
- `src/components/document/FormCommercialTerms.tsx`
- `src/components/document/document-cps-overrides.css`
- `src/components/invoice/MobileGroupCard.tsx`
- `src/components/invoice/MobileItemCard.test.js`
- `src/components/invoice/MobileItemCard.tsx`
- `src/tests/document/invoiceMobileFoldCorrections.test.js`

Untracked (pre-existing, untouched):

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/wireframes/proposed-icon.png`
- `docs/reports/android/android-launcher-icon-bxdrops-report-2026-10-06.md`

## 1. Startup Entry Path

PROVEN chain, traced from source:

1. `index.html` line 13 loads `/src/main.jsx` as a module script into `<div id="root">`.
2. `src/main.tsx` is the actual bootstrap module. It creates the React root on `#root` (lines 49-60) and renders `<OperationProvider>`, `<App />`, `<OperationOverlay />` inside `StrictMode`.
3. `src/App.tsx` is the root component. It owns all startup state: `authLoading`, `offlineAccessLoading`, `profileLoading`, `showSplash`, `session`, `profile` (lines 81-93).
4. `BrowserRouter` mounts inside `App` (line 577). No separate router file exists. No route-level code splitting gate exists before `App`.
5. Authentication initializes in the `init` function inside the mount effect (lines 462-505): offline-access check, then `supabase.auth.getSession()`, then profile load, then `runSyncBootstrap`.
6. `supabase.auth.onAuthStateChange` subscribes after `init` completes (lines 498-504). Events route through `handleAuthStateChange` (lines 365-460) via a zero-delay `setTimeout`.
7. The route tree (lines 590-631) selects: `UpdateGate` (blocked mandatory update) else `Login`, `PageLoader`, `OfflineAccessBlocked`, or `BiometricGate` wrapping `WorkspaceProvider` > `EntityProvider` > `TenantGate` > `AppShell`.
8. `TenantGate` (`src/components/app/TenantGate.tsx`) resolves workspace, then entity, then provisioning plus PostgREST exposure, through pure function `resolveGatePhase` (`src/domain/tenant/tenantGate.ts` lines 194-237).
9. `AppShell` (`src/components/app/AppShell.tsx`) mounts routes, theme manager, authorization provider, Android-only helpers.

Linear flow for a returning user with valid session:

```
index.html
→ src/main.tsx (root, OperationProvider)
→ src/App.tsx (startup state owner)
→ offline-access check (native only; web resolves allowed immediately)
→ supabase.auth.getSession() (session restore)
→ profiles fetch (loadProfile)
→ CSR/quotation one-shot sync bootstrap (native only; web no-op)
→ authLoading + profileLoading + offlineAccessLoading all false
→ 600 ms minimum-visible timer
→ showSplash = false
→ route: BiometricGate (native + lock enabled) or direct
→ WorkspaceProvider (workspace_members query)
→ EntityProvider (entities query + provisioning + exposure probe)
→ TenantGate phase = ready
→ AppShell (AuthorizationProvider permissions + theme preferences load in parallel)
→ usable application
```

UNRESOLVED observation: `index.html` line 13 references `/src/main.jsx`, but the repository contains only `src/main.tsx` (glob for `src/main.*` returns one file; glob for `src/*.jsx` returns none). `src/main.tsx` line 28 imports `./App.jsx`, but the file is `App.tsx`. Both references use a `.jsx` extension for `.tsx` files. The auditor did not test resolution behavior. This mismatch exists in source and is recorded here without a fix.

Supabase startup calls (PROVEN):

- `supabase.auth.getSession()` in `resolveSessionSafely` (`src/App.tsx` lines 150-170). Called at bootstrap and on lifecycle recovery.
- `supabase.auth.onAuthStateChange` subscription after bootstrap (`src/App.tsx` lines 498-504).
- `supabase.from('profiles').select('*').eq('id', userId).single()` in `loadProfile` (`src/App.tsx` lines 213-217).
- `supabase.auth.getUser()` after profile fetch for provider check (`src/App.tsx` line 225).
- Client config (`src/supabase.ts` lines 125-133): `persistSession: true`, `autoRefreshToken: true`, custom `fetchWithTimeout` with 20 s timeout and one retry for retryable GET/HEAD plus auth-refresh POST (lines 82-123).

Local-storage and session-storage hydration relevant to startup (PROVEN):

- Supabase session persistence uses the supabase-js default storage mechanism. `persistSession: true` is set in `src/supabase.ts` line 130. No custom storage key appears in source. LIKELY key: the standard `sb-<project-ref>-auth-token` localStorage entry. No code in the repository reads or writes that key directly.
- Theme cache: `bigdrops_user_theme_<userId>` read in `useUserThemePreferences` (`src/hooks/useUserThemePreferences.ts` lines 32-56). Loaded inside `AppShell`, after tenant readiness. Not a splash gate.
- Biometric lock flag: localStorage key read synchronously in `isBiometricLockEnabled` (`src/lib/native/biometric.ts` line 12), consumed as `useState` initializer in `src/App.tsx` line 90. Gated to native platform inside `BiometricGate`.
- Update grace state: `window.localStorage` key in `src/lib/appUpdate/graceState.ts` lines 26-65. Drives `UpdateGate`/`UpdateBanner`, not the splash.
- Dashboard and list caches (`src/lib/cache/dashboardCache.ts`, `src/lib/cache/listCache.ts`) and error registry use localStorage. They serve post-launch pages, not startup gates.

Service worker and PWA startup behavior: NOT FOUND. `public/` contains only `vite.svg`. `vite.config.js` has no PWA plugin. `index.html` has no manifest link and no `theme-color` meta. No service-worker registration call exists in `src/`.

## 2. Returning-User Startup Sequence

Concise text flow diagram. Each line names the owner file.

```
OS process start (Android: Theme.SplashScreen window background, white + splash drawable)
→ WebView draws first frame (native splash auto-dismisses; no app code runs)
→ index.html → src/main.tsx → <App />
→ SplashOverlay visible=true (initial useState, src/App.tsx line 89)
→ refreshOfflineAccessState()
     web → allowed=true immediately (src/App.tsx lines 172-181)
     native → getOfflineAccessState() from SQLite-backed module
→ supabase.auth.getSession() → session restored from stored session
→ loadProfile(userId) → profiles row → optional device hydration (native)
→ runSyncBootstrap() → pending CSR + quotation sync (native only)
→ setAuthLoading(false) + setOfflineAccessLoading(false)
→ minimum-visible 600 ms timer (src/App.tsx lines 520-534)
→ showSplash=false → SplashOverlay fades 300 ms (CSS), stays mounted, pointer-events off
→ route element resolves behind overlay:
     session? no → Login (or PageLoader / OfflineAccessBlocked)
     session? yes → BiometricGate (if native lock) → WorkspaceProvider
       → EntityProvider → TenantGate → AppShell → Dashboard (default route "/")
```

What renders first on cold start (PROVEN):

- Native Android: white `windowSplashScreenBackground` with `@drawable/splash` (`android/app/src/main/res/values/styles.xml` lines 16-20). No React code runs yet.
- Web/React: `SplashOverlay` at `z-[9999]` covering the viewport (`src/components/app/SplashOverlay.tsx` lines 37-48). Initial state `showSplash=true` means it is visible on first paint. The route tree mounts behind it at the same time.

## 3. Active Cold-Launch UI Inventory

### COLD-LAUNCH UI (blocks or covers the application before readiness)

| Component | File | Rendered by | Appears when | Removed when | Full viewport | Returning user | New user | Shared | Form factor | Reachable in production |
|---|---|---|---|---|---|---|---|---|---|---|
| `SplashOverlay` | `src/components/app/SplashOverlay.tsx` | `App` lines 633-637, unconditional | `showSplash=true` (initial state) | `showSplash=false` after all loading flags false plus 600 ms minimum | Yes, `fixed inset-0 z-[9999]` | Yes | Yes (also on fresh sign-in, lines 437-440) | Yes | Responsive (sm/md variants) | Yes, always |
| `PageLoader` (auth branch) | `src/components/app/PageLoader.tsx` | `App` route `/*`, lines 603-607 | No session plus `offlineAccessLoading=true` | Offline check resolves | Yes, `min-h-screen` centered | Yes, transient | Yes | Yes | Responsive | Yes, brief |
| `PageLoader` (profile branch) | same | `App` route `/*`, lines 606-607 | Session exists but `waitingForProfileResolution=true` | Profile resolves for session user | Yes | Yes | No | Yes | Responsive | Yes |
| `PageLoader` (Suspense) | same | `App` line 589 `Suspense fallback`, `AppShell` line 273 `Suspense fallback` | Lazy route chunk not yet loaded | Chunk loads | Depends on route content behind overlay | Yes | Yes | Yes | Responsive | Yes, behind splash |
| `TenantGate` loading phase | `src/components/app/TenantGate.tsx` lines 87-92 (`PageLoader` + `LoadingTips`) | `TenantGate` when `resolveGatePhase` returns `loading` | `workspaceCtx.isLoading` or `entityCtx.isLoading` | Workspace and entity resolve | Yes | Yes | Yes (before onboarding screens) | Yes | Responsive | Yes |
| `BiometricGate` loader | `src/components/app/BiometricGate.tsx` lines 147-155 (`PageLoader` + `LoadingTips`) | `BiometricGate` when `gated=true` | Native platform plus lock enabled, until biometric success | Biometric verify success | Yes | Yes | LIKELY no (lock set post-setup) | Yes | Native only | Yes, when lock enabled |
| `UpdateGate` | `src/components/app/UpdateGate.tsx` | `App` lines 595-599 | Android native plus mandatory-update `blocked` status | Update installed | Yes | Yes | Yes | No, Android only | Mobile only | Yes, when update expired |
| `OfflineAccessBlocked` | `src/components/app/OfflineAccessBlocked.tsx` | `App` lines 601-602, 608-609 | Native plus offline window expired | Reconnect + recovery | Yes | Yes, offline-expired | LIKELY first-login-no-window | No | Mobile native | Yes, when expired |
| Android native splash | `android/.../res/values/styles.xml` + drawables | OS, `AppTheme.NoActionBarLaunch` | Process start | First WebView draw (automatic) | Yes | Yes | Yes | n/a | Mobile only | Yes |

### POST-LAUNCH / PAGE-LEVEL LOADERS (not cold-launch)

- `LoadingTips` (`src/components/loading/LoadingTips.tsx`): shared tip renderer. Used inside `TenantGate`, `BiometricGate`, `WorkspacePendingApproval`, `ProvisioningProgress`. Post-launch when used outside the tenant gate.
- `GuidanceTip` (`src/components/guidance/GuidanceTip.tsx`): single guidance renderer. Used in error and recovery surfaces (`TenantGate` `GateError`, `ProvisioningFailed`, `OfflineAccessBlocked`). Not a startup gate.
- `InactivityNudge` (`src/components/guidance/GuidanceTip.tsx` lines 186-250): mounted in `App` via `NudgeMount` but force-suspended at module load (`src/App.tsx` line 65 `suspendGuidanceSurface()`). PROVEN unreachable in production. Not startup UI.
- `AppLoadingStates` (`src/components/loading/AppLoadingStates.tsx`): `SkeletonRow`, `SkeletonCard`, `ButtonLoading`, `CenteredSpinner`. Page-level skeletons and spinners. Not on the cold-launch path.
- `OperationOverlay` (`src/components/ui/OperationOverlay.tsx`): bottom toast-style operation status. Mounted in `main.tsx` but driven by `OperationContext`, not by startup.
- `ProvisioningProgress` / `ProvisioningFailed` pages: tenant-provisioning states behind `TenantGate`. Reachable for new companies, not the returning-user cold path.
- `WorkspaceCreation`, `WorkspaceSelection`, `WorkspaceInvitation`, `WorkspacePendingApproval`, `CompanyCreation`: onboarding branches of `TenantGate`. New-user only.

## 4. True Readiness Gate

The splash readiness gate is PROVEN and singular. `src/App.tsx` lines 520-534:

```tsx
const loadingDone = !authLoading && !profileLoading && !offlineAccessLoading
if (!loadingDone) return
const elapsed = Date.now() - splashStartRef.current
const minimumVisible = 600
const remaining = Math.max(0, minimumVisible - elapsed)
const timer = setTimeout(() => { setShowSplash(false) }, remaining)
```

Exact condition that keeps the splash visible: `showSplash === true`. It becomes false only when `authLoading`, `profileLoading`, and `offlineAccessLoading` are all false, plus the 600 ms minimum from splash start.

Exact condition that removes it: the timer callback `setShowSplash(false)`.

Dependency chain (PROVEN):

- `authLoading`: true from bootstrap start (`src/App.tsx` line 464). False after `init` finally block (lines 491-496), after session restore, profile load, and sync bootstrap. Also cleared on `SIGNED_OUT`, `TOKEN_REFRESHED`, same-session `SIGNED_IN`.
- `profileLoading`: true during `loadProfile` (line 208). False in `onSettled` (line 270). On profile error, `resolvedProfileUserId` still marks the user resolved (line 266) so the route gate cannot hang forever.
- `offlineAccessLoading`: true initially (line 82). False in the same finally block. Web non-native resolves allowed immediately without storage reads (lines 172-181).

Readiness depends on:

- Supabase auth: YES. `getSession()` must resolve.
- User profile: YES. `profiles` row fetch must settle (success or handled error).
- Tenant: NO for splash removal. Workspace and entity resolution happen after, inside `TenantGate`, behind the fading overlay.
- Permissions: NO. `AuthorizationProvider` (`src/lib/tenant/contexts.tsx` lines 505-572) loads `entity_permissions` inside `AppShell`, after the tenant gate. Not a splash dependency.
- Settings: NO. Theme preferences load inside `AppShell` via `useUserThemePreferences`. Not a splash dependency.
- Route: NO. Router mounts immediately. Route content resolves independently.
- Data preload: PARTIAL. Only the profile row plus one-shot native sync. No dashboard or list preload blocks the splash.
- Native bridge: NO explicit wait. No `Capacitor.isReady`, no splash-hide call, no bridge-ready promise in the startup path.

Second, independent readiness gate (PROVEN): `TenantGate` phase `ready`. `resolveGatePhase` (`src/domain/tenant/tenantGate.ts` lines 194-237) returns `ready` only when workspace is selected, entity count is nonzero, provisioning status is `ready`, AND PostgREST exposure probe is confirmed (`schemaExposed === true`; `false` or `null` holds phase at `provisioning`, lines 219-224). The tenant gate renders its own `PageLoader` + `LoadingTips` while loading. This gate is separate from `showSplash`. Both layers can show loading UI in sequence.

Third conditional gate (PROVEN): `BiometricGate`. Blocks children until native biometric verification succeeds when the lock is enabled (`src/components/app/BiometricGate.tsx` lines 86-97). Shows `PageLoader` + `LoadingTips` while gated.

## 5. Startup Timing and Artificial Delays

Answer to the key question: YES. BIGDROPS intentionally keeps a returning user on the startup screen after the application is actually ready, in one place.

PROVEN artificial delay:

- File: `src/App.tsx`, lines 524-531.
- Duration: `minimumVisible = 600` ms from `splashStartRef` (set at bootstrap start, line 463, and reset on fresh sign-in, line 438).
- Mechanism: `remaining = Math.max(0, minimumVisible - elapsed)`, then `setTimeout(() => setShowSplash(false), remaining)`.
- Effect: if real initialization finishes in 100 ms, the splash stays 500 ms longer. If it takes longer than 600 ms, no added delay.
- Code comment states intent: "Keep splash brief — tips appear during sustained operations, not startup." (line 525).

Other timing in the startup path (PROVEN, not artificial):

- Splash exit transition: 300 ms CSS `transition-[opacity,visibility] duration-300 ease-out` (`src/components/app/SplashOverlay.tsx` line 43). The overlay fades; it does not unmount. Visibility change is immediate in state; pixels fade over 300 ms. A future layer must cover this fade window if it needs an instant cut.
- Auth listener deferral: `setTimeout(..., 0)` wrapping `handleAuthStateChange` (`src/App.tsx` lines 499-501). Zero-delay task deferral only. No visible effect.
- Recovery cooldown: `RECOVERY_COOLDOWN_MS = 1500` (`src/App.tsx` line 39). Throttles lifecycle recovery, not the initial cold path.
- Tip rotation: `GUIDANCE_ROTATION_INTERVAL_MS = 8_000` (`src/domain/guidance/guidanceEngine.ts` line 26). Slow-operation threshold 12 s (line 35). These do not gate splash removal. A sub-600 ms cold start never rotates tips.
- Supabase fetch timeout 20 s with one 750 ms delayed retry (`src/supabase.ts` lines 7-8, 120). Affects worst-case failure timing only.
- Entity exposure re-probe: 10 s one-shot retry (`src/lib/tenant/contexts.tsx` lines 415-419). Affects tenant gate, not splash.
- No `sleep`, no splash-timeout config, no animation-completion callback gating unmount. The `bd-halo` 3.2 s infinite CSS animation (`src/index.css` line 58, keyframes lines 537-548) is decorative and never blocks removal.

## 6. Android / Capacitor Splash Interaction

Capacitor SplashScreen plugin: NOT FOUND.

- `capacitor.config.ts` (24 lines) configures only `App.disableBackButtonHandler` and `SystemBars`. No `SplashScreen` plugin entry.
- `package.json` has no `@capacitor/splash-screen` dependency.
- Source grep for `SplashScreen`, `launchShowDuration`, `launchAutoHide`, `Splash.hide`, `navigator.splashscreen` across `src/` returns zero files.

Native splash mechanism (PROVEN): Android 12+ OS splash via theme.

- `MainActivity` (`android/app/src/main/java/com/bigdrops/app/MainActivity.java`, 155 lines) registers four plugins (APK update, download bridge, fold awareness, local AI). It contains no splash code, no hide call, no timing logic.
- `AndroidManifest.xml` line 25 assigns `MainActivity` the theme `AppTheme.NoActionBarLaunch`.
- `styles.xml` lines 16-20 define that theme: parent `Theme.SplashScreen`, `windowSplashScreenBackground` white, `postSplashScreenTheme` `AppTheme.NoActionBar`, `android:background` `@drawable/splash`.
- `splash.png` drawables exist in 11 density and orientation buckets (verified by glob).

Behavioral consequences:

- Automatic hiding is the only mode. The OS dismisses the splash when the WebView first draws. No manual hide call exists anywhere.
- Native splash and React startup UI overlap in sequence, not in time: native splash covers process start to first frame; `SplashOverlay` covers first frame to readiness plus 600 ms. PROVEN by architecture; exact pixel handoff was not measured.
- Visible gap or flash risk: LIKELY. Native background is hardcoded white (`@android:color/white` in `styles.xml` lines 7, 13, 17). The React splash uses theme token `bg-background` (light default `210 40% 98%`, near-white; dark mode `222 25% 8%`). A dark-mode user LIKELY sees a white native splash followed by a light React splash that later switches to dark when `AppThemeManager` applies preferences inside `AppShell`. No dark splash resource (`values-night`) was found. The auditor did not run the app, so the flash is LIKELY, not PROVEN.
- Cold-launch experience begins before any React code runs (native splash), then continues in React (`SplashOverlay`). No code bridges the two layers.
- No separate startup window background beyond the theme above. No `windowSplashScreenAnimatedIcon` or animation-duration attribute. The `android:background` `@drawable/splash` item on a `Theme.SplashScreen` parent is legacy-style configuration; its exact rendering on Android 12+ is UNRESOLVED without a device test.

## 7. Existing Tips Engine

Single engine. No duplicates. PROVEN.

Files:

- Content: `src/lib/tipContent.ts` (463 lines). `TIP_LIBRARY` export (line 455).
- Logic: `src/domain/guidance/guidanceEngine.ts` (410 lines). `GuidanceEngine` class, session singleton via `getGuidanceEngine()` (lines 374-377).
- Hook: `src/hooks/useLoadingTip.ts` (190 lines). Slot-based subscription with `useSyncExternalStore`.
- Renderers: `QuickTipCard` (`src/components/app/QuickTipCard.tsx`), `LoadingTips` (`src/components/loading/LoadingTips.tsx`), `GuidanceTip` plus avatars (`src/components/guidance/GuidanceTip.tsx`).

Source of tip content: hardcoded `TIP_LIBRARY` array. 7 categories: Feature (7 tips), Workflow (5), Productivity (5), Document (5), Business Operations (7), Navigation (4), Contextual (2). Total 35 tips. Each tip: `id`, `category`, `message`, `context` (module name or null), `priority`, `audience: 'all'`, `repeatPolicy: 'session:3'`, `active: true`. All 35 are active (line 463 filters by `active`, and every entry sets `active: true`).

Data structure: plain TypeScript objects (`LoadingTip` type, `src/lib/tipContent.ts` lines 22-31). No database table. No network fetch. No localization.

Selection logic (PROVEN, `guidanceEngine.ts` lines 209-242): deterministic. Context match first (tip context equals requested context or null), then priority ascending, then least-recently-shown, then lowest session view count, then stable id order. The header comment states "No pure random" (line 10-12).

Rotation (PROVEN): each mounted loader owns a slot id (`useId`). `activateSlot` pins a tip and records exposure (lines 271-285). A hook interval advances the slot every `rotationInterval` (default 8 s, `useLoadingTip.ts` lines 167-172). History (`recent` list of 5, per-tip counts capped at 3 per session) survives remounts. Repeated mounts continue rotation instead of restarting.

Timing: rotation interval 8 s; slow-operation threshold 12 s; reconnecting window 8 s (`guidanceEngine.ts` lines 26-38). During a fast cold start none of these fire.

Persistence: session-only in-memory maps (`exposures`, `recent`, slots). No localStorage. No cross-session history. Dismiss locks an item for the session (`dismiss`, line 258). Test seam `resetGuidanceEngine` discards the singleton.

Randomization: none. Explicitly deterministic.

Context-awareness: route-prefix map in `useLoadingTip.ts` lines 32-46 (`/invoices`, `/quotations`, `/waybills`, `/clients`, `/csr`, `/projects`, `/compliance`). Cold start uses `window.location.pathname`, which for a returning user is usually `/`, resolving to null context, so the splash draws from the global pool. Offline forces the offline-drafts tip (`guidanceEngine.ts` lines 273-275).

Mobile versus desktop behavior: no branching in the engine or hook. Presentation differs only through the renderer (`QuickTipCard` max-width 280 px in splash; `LoadingTips` max-width 320 px with avatar elsewhere).

Tied to startup: NO. The engine is generic. Startup is one consumer among many: splash (`App` lines 97-101), tenant gate, biometric gate, provisioning pages, PDF export (`TableDocumentExportController` line 81), error recovery surfaces. Tips are reused across all loading and recovery surfaces.

Reuse safety for a future startup presentation: YES, PROVEN safe. `useLoadingTip({ pathname, active, stage })` with `active` bound to overlay visibility already isolates lifecycle per mount. Deactivation never clears history (`deactivateSlot`, lines 288-291). A new visual layer can call the same hook with its own slot and get continued rotation for free. No competing implementation exists: grep for `TIP_LIBRARY`, `useLoadingTip`, `LoadingTips`, `QuickTipCard`, `GuidanceTip`, `selectTip`, `getGuidanceEngine` shows all consumers routing through the one engine. The "underused" characterization matches the code: the library holds 35 tips but the splash typically shows for ~600 ms, so most sessions expose at most one tip and never rotate.

## 8. Responsive Behavior: Phone / Fold / Tablet / Desktop

Cold-launch path (`SplashOverlay`) responsive behavior (PROVEN, `src/components/app/SplashOverlay.tsx`):

- Container: `max-w-3xl`, centered, `px-6`.
- Wordmark: 34 px base, `sm:` 40 px, `md:` 44 px (lines 67-70).
- Circuit visual: three discrete variants selected by Tailwind breakpoints only: `block sm:hidden` (320x150), `hidden sm:block md:hidden` (420x180), `hidden md:block` (560x220), lines 102-202.
- Halo glow: 280 px base, `sm:` 360 px, `md:` 460 px (lines 54-56).
- Breakpoints are Tailwind defaults (`sm` 640 px, `md` 768 px). `tailwind.config.js` defines no custom `screens` key (verified, 164-line file). PROVEN.

Fold support in the cold-launch path: NOT FOUND. `SplashOverlay` contains no fold logic, no `useFoldAwareness`, no `env(fold-*)`, no `screen-spanning` media query, no `display-mode` check.

Fold infrastructure exists but runs post-splash (PROVEN):

- `AndroidFoldAwareness` (`src/components/app/AndroidFoldAwareness.tsx`) writes fold state to `document.documentElement.dataset` (`layoutMode`, `widthClass`, `heightClass`, `foldable`, `separatingFold`, `tabletop`, `bookPosture`, orientation, state) plus `--fold-*` CSS variables. It mounts inside `AppShell` (lines 260-267), which mounts after `TenantGate` readiness. It never affects the splash.
- `useFoldAwareness` (`src/hooks/FoldAwareness.ts`) wraps `getFoldInfo`/`onFoldInfoChanged` from `src/lib/native/foldAwareness.ts`, plus a window-resize fallback.
- Layout modes: `mobile` below 600 px, `tablet` 600-1200 px, `desktop` at or above 1200 px (`src/lib/native/foldAwareness.ts` line 51). Width classes `compact/medium/expanded/large/extra_large` (line 48).
- Global CSS consumes the dataset only for shell max-width and fold flag (`src/index.css` lines 566-577). No splash rule references fold state.

"Mobile x Fold" explicit architectural support: NOT FOUND as a distinct concept. Foldable devices flow through the generic width-based modes. A half-opened foldable reports `tablet` or `mobile` by pixel width. No separating-fold layout branch exists in startup UI. The `data-separating-fold` attribute is written but no startup selector reads it.

JS viewport and device checks in startup (PROVEN):

- `isAndroidNative()` gates `AndroidBackHandler`, `NativeAuthRedirect`, `UpdateBanner`, offline SQLite paths (`src/App.tsx` lines 582-588, 594-599).
- `isNativePlatform()` gates `BiometricGate` verification (lines 87, 101).
- `canUseAndroidNativeSqlite()` gates offline-access state, device hydration, CSR/quotation sync.
- `navigator.onLine` checked in offline paths and `useLoadingTip` connectivity tracking.
- No user-agent parsing in the startup path. No `matchMedia` breakpoint hook in the splash. `matchMedia('(prefers-color-scheme: dark)')` used only for theme mode resolution inside `AppThemeManager` (post-splash) and reduced-motion checks.

## 9. Theme and Style Authority

Authority during startup, in application order (PROVEN):

1. `src/index.css` `:root` tokens apply first: `--background: 210 40% 98%` (near-white), `--foreground: 222 47% 11%`, `--card`, `--muted`, `--primary: 225 75% 48%` (lines 18-49). `color-scheme: light` (line 5). `html` background binds to `hsl(var(--background))` (line 156). `body` binds `bg-background text-foreground` plus a faint radial primary tint (lines 198-208).
2. `src/styles/formTheme.css` loads after `index.css` (`src/main.tsx` lines 26-27). Its contents were not inspected line by line; it is a documented override layer per the `index.css` comment on line 6. UNRESOLVED which splash-relevant tokens it changes.
3. Tailwind utilities (`tailwind.config.js` maps `background`, `foreground`, `card`, `muted`, `border` to the CSS variables, lines 14-50). The splash uses `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border` exclusively. No hardcoded hex colors in `SplashOverlay` except via tokens. `QuickTipCard` likewise token-only.
4. `AppThemeManager` (`src/components/app/AppShell.tsx` lines 104-244) is the single owner of `documentElement.classList` dark toggling and theme token bundles. It mounts inside `AppShell`, which mounts after tenant readiness. During splash, user theme preferences are NOT yet applied. Startup UI always renders with default (light) tokens first.

Consequences for a future implementation:

- A future cold-launch layer that uses the same tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) inherits current behavior automatically, including the light-first flash for dark-mode users.
- Global styles that can override a future layer: `index.css` base layer (`html`/`body`/`#root` backgrounds, safe-area padding lines 155-160, `min-height: 100dvh`), the `.dark` variable block (lines 94-145), theme preset bundles applied by `AppThemeManager`, `formTheme.css`, and the `prefers-reduced-motion` global collapse (lines 598-613) which forces all animations and transitions near-instant. Any future animation must respect that rule.
- The `brand-wordmark` class (Broken Planet font, `src/index.css` lines 255-258) is the splash wordmark style. Webfont loading comes from Google Fonts and cdnfonts links in `index.html` lines 4-8. Font-display behavior on slow networks is UNRESOLVED.

Background, surfaces, slate/navy values: the current splash has no navy background. It is a light surface (`bg-background`) with a primary-tinted radial halo (`bg-[radial-gradient(...hsl(var(--primary)...))]`, line 57). Slate-navy is the default theme *preset* name (`useUserThemePreferences.ts` line 21), applied post-splash. A future navy launch screen would be a new visual, not a continuation of the current one.

## 10. Transition From Startup to Application

Unmount behavior: the splash NEVER unmounts. `SplashOverlay` renders on every `App` render (`src/App.tsx` lines 633-637). `showSplash=false` flips classes from `visible opacity-100` to `invisible opacity-0` with `pointer-events-none` (`src/components/app/SplashOverlay.tsx` lines 42-47). The node stays in the DOM at `z-[9999]`.

Replacement transition: 300 ms opacity-plus-visibility fade only. No slide, no scale, no route transition at handoff. Reduced-motion users get a near-instant change via the global rule (`src/index.css` lines 598-606).

Application-shell mount timing: the application mounts BEFORE and UNDER the splash, not after it. The route tree (including `TenantGate` > `AppShell` for a ready tenant) renders while `showSplash` is still true. The splash is an overlay over an already-mounted app, not a placeholder replaced by the app.

Layout shift: none caused by splash removal. The overlay is `position: fixed` and removed from flow. Content underneath does not reflow when it fades. Layout shift can still occur underneath from lazy chunk arrival (`Suspense` fallbacks) and from `AppThemeManager` applying theme tokens after preferences load, but those are independent of the overlay.

White or black flash on removal: the overlay fades over 300 ms, so the outgoing light surface blends into whatever is behind it. If the app behind has already applied a dark theme, the crossfade passes through a mid-tone blend. No hard cut exists. Exact pixel behavior UNRESOLVED without a render test.

Theme and background change at handoff: YES, possible. `AppThemeManager` applies user theme (including dark mode and preset bundles) only after `AppShell` mounts. A dark-mode user goes: white native splash → light React splash → (fade) → app that switches to dark tokens when preferences load. The handoff background change comes from theme application, not from splash removal.

Interruptibility consequence: because the app is already mounted behind the overlay and readiness state (`showSplash`) is a plain boolean with a CSS fade, a future animation layer can be interrupted at any frame by setting its own visibility off. Nothing in the current architecture requires animation completion before interaction. The only obstacle is the 600 ms minimum timer, which delays the readiness signal itself rather than the animation.

## 11. Returning User vs New User

Divergence point (PROVEN): the `/*` route element in `src/App.tsx` lines 592-629.

RETURNING USER (session restores, profile resolves):

```
cold start → getSession returns session → loadProfile succeeds
→ showSplash=false (after 600 ms min) → route: session exists
→ waitingForProfileResolution=false → BiometricGate → providers
→ TenantGate: workspace selected, entity ready, exposure confirmed → ready
→ AppShell → Dashboard
```

The returning user sees: native splash → `SplashOverlay` (wordmark, stage status line, one quick tip) → brief `TenantGate` loader only if workspace/entity queries are slow → application.

NEW USER (no session, or session without tenant):

```
cold start → getSession returns null → authLoading=false → showSplash=false
→ route: !session → offlineAccessLoading ? PageLoader : Login
→ Login (signin/signup, src/pages/Login.tsx, lazy)
→ SIGNED_IN event → fresh-sign-in splash re-arm (splashStartRef reset + setShowSplash(true), src/App.tsx lines 436-440)
→ loadProfile → TenantGate phases: create-workspace → WorkspaceCreation;
   or pending-invitation → WorkspaceInvitation; or pending-approval → WorkspacePendingApproval;
   or create-company → CompanyCreation; or provisioning → ProvisioningProgress
→ ready → AppShell
```

Exact divergence: `!session` ternary at line 600. Everything above it (bootstrap, splash, offline check, session restore) is shared. Everything below splits. Onboarding screens are `TenantGate` phases (`create-workspace`, `select-workspace`, `pending-invitation`, `pending-approval`, `create-company`, `provisioning`, `provisioning-failed`), defined in `src/domain/tenant/tenantGate.ts` lines 137-149 and rendered in `src/components/app/TenantGate.tsx` lines 103-122. They are not cold-launch architecture; they are post-auth onboarding behind the same gate component.

Fresh sign-in reuses the splash: `isRealNewSignIn && hasBootedRef.current` resets the timer and shows the splash again (lines 436-440). A new user therefore sees the splash twice (cold start plus post-login), each time governed by the same 600 ms rule.

## 12. Slow Start and Failure Behavior

Slow initialization (PROVEN per path):

- Splash stays visible indefinitely while any of `authLoading`, `profileLoading`, `offlineAccessLoading` remains true. No timeout dismisses the splash on slowness. The status line changes honestly: after 12 s of slot-active waiting, connectivity reads `slow` and the line becomes "Still working. This is taking longer than expected." (`guidanceEngine.ts` lines 108, 35). Tips rotate every 8 s during long waits.
- Tenant gate loading (`PageLoader` + `LoadingTips`) persists while workspace or entity queries pend. Same rotation behavior through its own hook slot.
- PostgREST exposure probe: one automatic retry after `triggerPostgrestExposure`, then a single 10 s re-probe (`src/lib/tenant/contexts.tsx` lines 409-419). If exposure still fails, the gate holds at `provisioning` with `ProvisioningProgress` UI. No infinite retry loop.

Network loss:

- Browser offline during splash: `useLoadingTip` reports `offline`, status line becomes "Connect to the internet to continue." (`guidanceEngine.ts` line 105), tip pins to the offline-drafts tip. The splash itself does not navigate or error.
- Supabase request timeout is 20 s with one retry for safe methods (`src/supabase.ts`). Transient profile failures keep the last-known profile for the same user and still mark resolution so the gate does not hang (`src/App.tsx` lines 260-266).
- Invalid session (expired refresh token and variants in `src/auth/sessionErrors.ts` lines 1-7): session cleared via local sign-out, auth state reset, user lands on `Login`. Applied at bootstrap restore, profile load, and token-refresh-failed events.

Supabase auth restoration failure: `resolveSessionSafely` returns the last-known-good session on transient errors (line 168) and clears state only on invalid-session errors (lines 160-163). The splash does not show an error surface for auth failure; the route falls through to `Login` when no session exists.

Tenant or profile fetch failure: `TenantGate` `error` phase renders `GateError` ("Something went wrong" plus retry button that calls `workspaceCtx.refresh()` and `entityCtx.refresh()`) with a subordinate recovery tip (`src/components/app/TenantGate.tsx` lines 21-46, 94-101). Profile fetch errors log to console and mark resolution; the app proceeds with a null or stale profile rather than blocking forever.

Permission initialization failure: `AuthorizationProvider` stores an error string but has no error UI and no gate; `hasAuthorization` returns false for everything on failure (`src/lib/tenant/contexts.tsx` lines 517-552, 556-564). Net effect LIKELY: post-launch features hide rather than startup blocking. No startup retry exists for permissions.

Retry availability: `GateError` retry (tenant), `recoverAppState` on visibility-regain and online events (`src/app/useSyncBootstrap.ts` lines 142-178), `recheckProvisioning` callback (unused by any startup UI directly). No retry button on the splash itself.

Partial render: YES. The route tree renders whatever its current state selects (Login, PageLoader, TenantGate phases) behind the fading overlay. The application is structurally mounted before readiness completes.

## 13. Production vs Prototype Separation

The 14 HTML files under `docs/templates/html-temps/onboarding-candidates/` (including `navy-launch.html`, three `cold-launch-desktop-*`, three `cold-launch-mobile-fold-*`, and six `cold-launch-team-*` variants plus `BIGDROPS cold launch v3.html`) are design explorations. PROVEN by location and content type: standalone HTML files with no import from `src/`, no route registration, no reference from `App.tsx` or any production component. Nothing in the production startup path reads, imports, or iframes them. They are not evidence of runtime behavior. The audit findings above derive exclusively from `src/`, `index.html`, `capacitor.config.ts`, `android/`, and configuration files.

## 14. Safest Future Replacement Boundary

CURRENT (proven):

```
real initialization (App bootstrap → session → profile → providers)
→ SplashOverlay presentation (always-mounted overlay, 600 ms minimum + 300 ms fade)
→ readiness (showSplash=false; TenantGate ready; BiometricGate open)
→ application (already mounted underneath)
```

PROPOSED SEAM (supported by evidence):

```
real initialization (UNCHANGED: App state, getSession, loadProfile, providers)
→ unchanged readiness authority (showSplash boolean + TenantGate phase + BiometricGate)
→ replaceable visual cold-launch presentation (swap overlay contents only)
→ immediate exit on readiness (remove 600 ms minimum; keep or shorten fade)
→ application (already mounted; no remount needed)
```

Confirmation against repository evidence:

- Visual layer replaceable without changing readiness logic: YES. `SplashOverlay` receives only `visible`, `tip`, `quickTip` props (`src/components/app/SplashOverlay.tsx` lines 8-24). No initialization code lives inside it. `CircuitBoard` and `QuickTipCard` are pure presentational children.
- Existing readiness signal remains authoritative: YES. `showSplash` plus the three loading flags is a clean boolean seam. A future layer can subscribe to the same values.
- Tips engine remains authoritative: YES. `useLoadingTip` is consumer-agnostic; a new layer calls the same hook and inherits deterministic rotation and history.
- Animation independent from readiness: YES, with one required change. The animation can run independently today, but readiness itself is delayed 600 ms by the minimum-visible timer. Removing or zeroing `minimumVisible` (`src/App.tsx` line 526) is the single logic change needed for immediate exit. The 300 ms CSS fade does not block interaction state; it only affects pixels.
- No fake progress exists to remove: CONFIRMED. No progress bar, no percentage, no staged fake steps. The status lines are stage-honest ("Preparing your workspace...", "Still working..."). The circuit visual is decorative, not progress-mapped.

## 15. Files a Future Implementation Would Likely Touch

Do not edit them under this task. Listed for planning only.

- `src/components/app/SplashOverlay.tsx`: the visual layer. Primary replacement target.
- `src/components/app/QuickTipCard.tsx`: splash tip card, if the new presentation restyles tips.
- `src/App.tsx` lines 520-534: the 600 ms minimum-visible timer. Only logic change required for immediate exit.
- `src/components/ui/circuit-board.tsx`: decorative circuit visual, if the new design drops or replaces it. (Read for props only; not modified in this audit.)
- `src/index.css` launch keyframes (`bd-halo`, `bd-sheet-*`, `bd-mark`, `bd-progress`, lines 473-564): replace or extend for new motion. Global reduced-motion rule must stay.
- `android/app/src/main/res/values/styles.xml`: only if the native white splash must change color to match a new design. Native change, separate risk.
- `index.html`: only if font strategy or `theme-color` meta must change for the handoff blend.

## 16. Files That Must Remain Untouched

- `src/App.tsx` except the minimum-visible timer: bootstrap, session restore, auth listener, route gates, recovery logic.
- `src/main.tsx`: root render, providers.
- `src/supabase.ts`: client, timeout, retry, session persistence.
- `src/auth/sessionErrors.ts`: invalid-session classification.
- `src/app/useSyncBootstrap.ts`: lifecycle recovery and one-shot sync.
- `src/lib/tenant/contexts.tsx`: workspace, entity, exposure probe, authorization providers.
- `src/domain/tenant/tenantGate.ts`: pure gate decision table.
- `src/domain/tenant/tenantCreation.ts`: provisioning and exposure trigger.
- `src/domain/guidance/guidanceEngine.ts`: selection, rotation, history, constants.
- `src/lib/tipContent.ts`: tip library content.
- `src/hooks/useLoadingTip.ts`: slot lifecycle hook.
- `src/components/app/TenantGate.tsx`, `BiometricGate.tsx`, `OfflineAccessBlocked.tsx`, `UpdateGate.tsx`, `PageLoader.tsx`, `AppShell.tsx`: gates and shell.
- `src/hooks/useUserThemePreferences.ts`, `src/lib/themePresets.ts`, `src/lib/themeTokens.ts`: theme authority.
- `capacitor.config.ts`, `android/app/src/main/AndroidManifest.xml`, `MainActivity.java`: native shell.
- All files under `docs/templates/html-temps/onboarding-candidates/`: prototypes, not production.

## 17. Unresolved Questions

1. `index.html` references `/src/main.jsx` and `src/main.tsx` imports `./App.jsx`, but no `.jsx` files exist in `src/`. Resolution behavior was not tested. No action taken.
2. Exact pixel handoff between the OS splash and the React splash (gap, white flash duration) was not measured. No device or emulator run performed.
3. `src/styles/formTheme.css` loads after `index.css` and may override splash-relevant tokens. Its rules were not audited line by line.
4. Webfont (`Broken Planet` wordmark) fallback behavior on slow networks was not verified.
5. Whether `dist/` (the Capacitor `webDir`) matches current `src/` was not checked. The audit covers source only.
6. Supabase session storage key was not observed at runtime. The standard `sb-<ref>-auth-token` key is inferred from supabase-js defaults plus `persistSession: true`, not read from code.

## Final Git Status Verification

`git status` ran AFTER report creation. Result:

- New file created by this task: `docs/reports/general/2026-10-07-existing-cold-launch-startup-audit.md` (this report; untracked until committed, as expected).
- Zero application source files changed by this task.
- Zero configuration files changed by this task.
- Zero prototype HTML files changed by this task.
- All pre-existing modifications listed in the baseline section remain exactly as recorded. The auditor did not stage, amend, or discard any of them.

Verification:

- `bun run build`: skipped (explicitly excluded for this audit task).
- `bun run typecheck`: skipped (explicitly excluded for this audit task).
- `lint`: skipped (explicitly excluded for this audit task).
- `bun run audit:load`: skipped (explicitly excluded for this audit task).
- `git status`: ran before and after; only this report added.
- `supabase db push`: not applicable (no database changes).
