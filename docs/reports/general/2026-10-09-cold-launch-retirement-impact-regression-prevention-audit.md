# Cold Launch Retirement Impact & Regression Prevention Audit

This report was written by Muse Spark on 2026-10-09 via OpenCode.

Objective: determine how the existing cold-launch presentation can be retired safely, completely, and with regression prevention. Zero code changes apply.

Scope: verification of `docs/reports/general/2026-10-07-existing-cold-launch-startup-audit.md` against current source, full consumer mapping, repercussion analysis, duplicate-loader root cause, regression-guard design, phased retirement plan, rollback.

Files changed: `docs/reports/general/2026-10-09-cold-launch-retirement-impact-regression-prevention-audit.md` (this report only).

Skills used: karpathy, capacitor-splash-screen, vercel-react-best-practices, supabase, accessibility, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English

Evidence labels: PROVEN (read from source), LIKELY (strong inference, flagged), NOT FOUND, UNRESOLVED.

## 1. Executive finding

Complete retirement is NOT safe now. It is safe ONLY AFTER a replacement presentation ships behind the existing readiness seam.

The prior audit (2026-10-07) re-verified as correct against current source, with three corrections in §2.

Core facts:

- Presentation and readiness are already separate. `App.tsx` owns readiness state. `SplashOverlay.tsx` owns pixels. The seam is the `visible` prop plus three loading flags.
- The old presentation has exactly ONE cold-launch consumer: `App.tsx` lines 633-637. No other route renders it.
- Shared loaders (`PageLoader`, `LoadingTips`, `QuickTipCard`, `guidanceEngine`, `tipContent`) serve post-launch surfaces too. They must be retained. Only their startup styling may change.
- The highest regression risk is NOT the splash file. It is the two independent loading boundaries (`showSplash` in `App.tsx`, `resolveGatePhase` in `TenantGate.tsx`) plus late-arriving gates (`UpdateGate` blocked state, `BiometricGate` resume lock). A replacement that covers only the splash will show a second loader or a blocked screen with no visual continuity.
- Four dead style artifacts exist and are safe to remove later. Nothing else is dead.
- No Capacitor SplashScreen plugin, no service worker, no legacy splash component, and no dormant startup route tree exist. There is nothing else to resurrect the old UI except its own imports.

## 2. Current startup architecture

Verified chain (all paths re-read; line numbers are current):

```
Android OS splash (styles.xml:16-20, Theme.SplashScreen, white + @drawable/splash)
→ index.html:13 (/src/main.jsx) → src/main.tsx:49-60 (root, OperationProvider, App, OperationOverlay)
→ src/App.tsx:80-101 (authLoading, offlineAccessLoading, profileLoading, showSplash, session, profile)
→ init() (App.tsx:462-505): offline-access check → getSession → loadProfile → runSyncBootstrap
→ readiness effect (App.tsx:520-534): all flags false + 600 ms minimum → showSplash=false
→ route gate (App.tsx:592-631): UpdateGate | OfflineAccessBlocked | PageLoader | Login | BiometricGate → providers → TenantGate → AppShell
→ TenantGate phase ready (tenantGate.ts:194-237) → AppShell routes + theme + permissions
```

Ownership (presentation vs readiness):

| Layer | Presentation owner | Readiness owner | Sequential or concurrent |
|---|---|---|---|
| Native splash | Android OS (`styles.xml:16-20`) | OS first-frame draw | Sequential, before React |
| Bootstrap | None (blank `#root`) | `main.tsx:49-60` | Sequential |
| Auth + profile | `SplashOverlay` (overlay) | `App.tsx` flags + `supabase.ts` client | Sequential inside `init()`: offline check → session → profile → sync bootstrap (`App.tsx:467-486`) |
| Tenant + entity | `TenantGate` loading phase (`TenantGate.tsx:87-92`) | `WorkspaceProvider` + `EntityProvider` (`contexts.tsx`), `resolveGatePhase` | Workspace and entity resolve sequentially (entity waits for workspace); exposure probe runs after provisioning ready (`contexts.tsx:395-431`) |
| Permissions | None (silent) | `AuthorizationProvider` (`contexts.tsx:505-572`) | Concurrent with AppShell mount, after tenant ready; never blocks splash |
| Theme | Default light tokens until applied | `AppThemeManager` + `useUserThemePreferences` (`AppShell.tsx:104-241`, `useUserThemePreferences.ts:110-220`) | After AppShell mount; splash always renders pre-theme |
| Update gate | `UpdateGate` / `UpdateBanner` | `useAppUpdate` state machine (`updateStateMachine.ts:74-79`) | Discovery runs at launch; `blocked` can arrive AFTER splash hides (route reads `state.status` live) |
| Biometric | `PageLoader` + `LoadingTips` (`BiometricGate.tsx:147-155`) | `verifyBiometricIdentity` (`biometric.ts:97-122`) | After route gate, native only |

Corrections to the prior audit:

1. A design doc (`docs/reports/ui-ux/live-new-user-pre-dashboard-wireframe-report.md:36`) references `SPLASH_TIPS` in `App.tsx`. PROVEN stale: no `SPLASH_TIPS` symbol exists in current source (grep, zero matches). Treat that doc as outdated, not as evidence.
2. `useAppUpdate` returns a `ready` flag (`useAppUpdate.ts:74`, documented line 73 as splash-flicker prevention). PROVEN unconsumed at the route gate: `App.tsx` reads only `appUpdate.state.status` (lines 582, 595). Only consumer is `AppUpdateSettingsSection.tsx:57`. A replacement design may use it; current behavior does not.
3. Launcher icon assets under `android/app/src/main/res/` show uncommitted modifications at audit time (see §16). Native splash visuals are in flux. Any pixel-level claim about the native handoff is UNRESOLVED until that work lands.

## 3. Complete retirement inventory

| # | Artifact | Path : lines | Purpose | Classification |
|---|---|---|---|---|
| 1 | `showSplash` state + 600 ms timer + 300 ms fade contract | `App.tsx:89, 520-534`; `SplashOverlay.tsx:43-45` | Cold-launch visibility timing | REPLACE (logic seam stays, values change) |
| 2 | `SplashOverlay` component + `SplashCircuit` | `SplashOverlay.tsx:26-253` | Full-viewport cold-launch pixels | REPLACE |
| 3 | `CircuitBoard` usage by splash | `SplashOverlay.tsx:4, 103, 153, 203` | Decorative visual | REPLACE (usage only) |
| 4 | `CircuitBoard` + `CircuitPattern` component | `circuit-board.tsx:41-57, 377-453` | Shared UI primitive, sole splash importer is #3 | RETAIN |
| 5 | `QuickTipCard` usage by splash | `SplashOverlay.tsx:6, 80` | Tip card in splash | REPLACE (usage only) |
| 6 | `QuickTipCard` component | `QuickTipCard.tsx:15-30` | Shared by export controller (`TableDocumentExportController.tsx:9, 100`, post-launch) | RETAIN |
| 7 | `PageLoader` usages in `App.tsx:589, 604, 607` | `App.tsx` | Suspense + auth/profile fallback visuals | REPLACE (usage styling only) |
| 8 | `PageLoader` component | `PageLoader.tsx:3-9` | Shared by TenantGate, BiometricGate, AppShell Suspense, ComplianceHub (page-level) | RETAIN |
| 9 | `LoadingTips` in TenantGate/BiometricGate loading phases | `TenantGate.tsx:87-92`; `BiometricGate.tsx:147-155` | Tips on real gates | REPLACE (visuals only, keep slots) |
| 10 | `LoadingTips` component + `useLoadingTip` + `guidanceEngine` + `tipContent` | `LoadingTips.tsx:33-68`; `useLoadingTip.ts:83-190`; `guidanceEngine.ts:169-410`; `tipContent.ts` (`TIP_LIBRARY`) | Session tip selection, rotation, history | RETAIN |
| 11 | `GuidanceTip`, `GuidanceAvatar`, `familyForTip`, `InactivityNudge` | `GuidanceTip.tsx:1-250` | Shared renderer; nudge suspended at `App.tsx:65` | RETAIN (suspension stays) |
| 12 | `TenantGate` + `resolveGatePhase` + gate pages | `TenantGate.tsx:48-133`; `tenantGate.ts:194-237`; onboarding/provisioning pages | Tenant readiness + onboarding + retry | RETAIN |
| 13 | `BiometricGate` + `biometric.ts` | `BiometricGate.tsx:33-158`; `biometric.ts:1-122` | Native lock, cold-launch + resume | RETAIN |
| 14 | Auth/session/profile machinery | `App.tsx:126-275, 462-505`; `sessionErrors.ts:1-31`; `useSafeAsyncTask.ts:14-81`; `supabase.ts:1-133` | Session restore, bad-session clearing, safe async | RETAIN |
| 15 | `WorkspaceProvider`, `EntityProvider`, `AuthorizationProvider` | `contexts.tsx:64-578` | Workspace/entity/permissions resolution | RETAIN |
| 16 | Exposure probe + provisioning helpers | `contexts.tsx:392-435`; `tenantCreation.ts:99-182, 290-308` | PostgREST readiness | RETAIN |
| 17 | `useSyncBootstrap` + offline access stack | `useSyncBootstrap.ts:43-181`; `offlineAccess.ts:40-102`; `OfflineAccessBlocked.tsx:19-56` | Native sync, offline entitlement, blocked screen | RETAIN |
| 18 | Update stack | `useAppUpdate.ts:87-461`; `updateStateMachine.ts:1-352`; `UpdateGate.tsx`; `UpdateBanner.tsx`; `UpdateSheet`; `graceState.ts` | Mandatory-update discovery, grace, blocked gate | RETAIN |
| 19 | `AppShell` + `AppThemeManager` + theme prefs | `AppShell.tsx:104-344`; `useUserThemePreferences.ts:110-220` | Routes, theme, permissions mount | RETAIN |
| 20 | `ErrorBoundary` + `withBoundary` wrappers | `ErrorBoundary.tsx:13-60`; `App.tsx:60, 589-631`; `AppShell.tsx:97` | Crash recovery + retry per route | RETAIN |
| 21 | `AndroidBackHandler`, `NativeAuthRedirect`, `PushNotificationRuntime`, `AndroidFoldAwareness`, `AndroidSystemBars`, `KeyboardAwareness` | Components render `null`; listeners only | Native integration, no pixels | RETAIN, untouched |
| 22 | `OperationOverlay` + `OperationContext` | `OperationOverlay.tsx:7-31`; `OperationContext.tsx:25-80` | Post-action toasts; `operation` starts `null`, renders nothing at boot | RETAIN, not startup |
| 23 | `Toaster` | `toaster.tsx:6-42` | Toast host, no boot content | RETAIN, not startup |
| 24 | `SetPasswordModal` | `AppShell.tsx:268-272` | Post-gate password setup | RETAIN, not startup |
| 25 | `TenantDebug`, `ErrorsDashboard` | `AppShell.tsx:334-337` | Diagnostics (errors: localhost only) | INVESTIGATE then likely RETAIN |
| 26 | `brand-wordmark` class | `index.css:254-258` | Shared by splash (`SplashOverlay.tsx:67`) and Login (`Login.tsx:192, 262`) | RETAIN |
| 27 | `bd-halo` keyframes | `index.css:537-548` | Sole consumer: splash (`SplashOverlay.tsx:58`) | REMOVE LATER with splash |
| 28 | `bd-sheet-rear/front`, `bd-mark`, `bd-progress` keyframes | `index.css:474-564` | Zero consumers in source (verified §E) | REMOVE LATER |
| 29 | `runnerMove` style injection | `App.tsx:343-356` | Injected `<style>` block, zero appliers | REMOVE LATER |
| 30 | `variant` / `circuitPosition` props | `SplashOverlay.tsx:14-23` | Back-compat API, single caller uses defaults | REMOVE LATER with splash |
| 31 | Native splash theme | `styles.xml:16-20`; drawables; `MainActivity.java:21-155` (no splash calls) | OS launch surface | RETAIN as surface; visuals follow icon work |
| 32 | Readiness tests | `workspaceBootstrapDecision.test.js`, `workspaceAbandonment.test.js` (pin `resolveGatePhase`) | Guard gate behavior | RETAIN, extend later |

Nothing is classified REMOVE NOW. Items 27-30 are safe only after the replacement ships and the splash import is gone.

## 4. Dependency and consumer map

- `SplashOverlay`: imported once (`App.tsx:13`), rendered once (`App.tsx:633-637`). Consumers of its internals: none. Removal blast radius after replacement: one import + one JSX block.
- `showSplash`: written at `App.tsx:89, 438-440, 529-531`; read at `App.tsx:99, 634`. No other readers (grep §E). Safe to rewire once a successor reads the same flags.
- `QuickTipCard`: consumers are SplashOverlay + TableDocumentExportController (post-launch export flow). Deleting the component breaks exports. Only the splash usage retires.
- `PageLoader`: consumers are App (3 sites), TenantGate, BiometricGate, AppShell Suspense, ComplianceHub (page-level, `ComplianceHub.tsx:181-191`). Deleting it breaks six surfaces. Only App's three call sites change meaning at retirement.
- `LoadingTips`/`useLoadingTip`/engine/library: consumers are App (splash slot), TenantGate, BiometricGate, ProvisioningProgress (`ProvisioningProgress.tsx:82-86`), WorkspacePendingApproval (`:128`), TableDocumentExportController (`:81-84`), GateError recovery (`TenantGate.tsx:24-27` via `selectTip`/`recordExposure`), OfflineAccessBlocked (`:49-53` via `TIP_LIBRARY` + `OFFLINE_TIP_ID`). The engine singleton (`guidanceEngine.ts:374-377`) carries cross-surface history. Any replacement must keep calling it or tip history resets mid-launch.
- `CircuitBoard`: sole importer is SplashOverlay (grep §E). The component stays for other/future use; its splash import retires.
- `brand-wordmark`: shared with Login. Keep the class.
- `index.css` keyframes: `bd-halo` dies with splash; `bd-avatar-*` + `bd-guidance-enter` stay (GuidanceTip); `bd-sheet-*`/`bd-mark`/`bd-progress` are already orphaned.
- Docs referencing the old UI (`Product-Guidance-Engagement-System.md:18`, wireframe reports, `product-inspection.md:164`) are documentation, not code paths. `SPLASH_TIPS` mention in one report is stale (§2). Docs cannot resurrect the UI but can mislead future agents — update them in Phase 7.

## 5. Repercussion matrix

Severity: Critical (broken launch / security hole), High (dead-end or data risk), Medium (visual glitch / degraded recovery), Low (cosmetic).

| Removal | Consequence | Severity | Evidence |
|---|---|---|---|
| Delete `SplashOverlay` import + JSX, no successor | Blank `#root` with mounted app behind nothing until tenant gate resolves; on fast devices a flash of unfinished UI; on slow auth, Login renders with no cover | High | `App.tsx:633-637` unconditional render; route mounts simultaneously (prior audit §10) |
| Set `showSplash=false` initially | Same as above from first paint; 600 ms timer (`App.tsx:520-534`) becomes dead code but flags still gate routes | High | `App.tsx:89, 521` |
| Remove 600 ms timer only | Splash hides the moment flags clear; TenantGate loader may appear immediately after (two-loader flash) | Medium | `App.tsx:520-534`; `TenantGate.tsx:87-92` |
| Remove `PageLoader` component | Six surfaces break: App Suspense/auth/profile fallbacks, both gates, AppShell Suspense, ComplianceHub section | Critical | §4 consumer list |
| Remove `TenantGate` or `resolveGatePhase` | No workspace/entity/provisioning gating; app mounts without tenant client; data paths fail-close (`contexts.tsx:387-435`) → blank or erroring app; onboarding unreachable | Critical | `TenantGate.tsx:86-132`; `tenantGate.ts:194-237` |
| Remove `WorkspaceProvider`/`EntityProvider` | `useWorkspace`/`useEntity` throw (`contexts.tsx:232-236, 484-488`); whole tree crashes into ErrorBoundary | Critical | Same |
| Remove `AuthorizationProvider` | `useAuthorization` throws wherever consumed; permission checks fail open/closed depending on caller; security bypass risk | Critical | `contexts.tsx:574-578` |
| Remove `BiometricGate` or its lock check | Biometric-enrolled devices skip unlock; authenticated session exposed without verification | Critical | `BiometricGate.tsx:86-97`; `biometric.ts:9-16` |
| Remove `onAuthFailure` sign-out | Failed/cancelled biometric leaves a signed-in session behind a stuck loader | High | `BiometricGate.tsx:66-72`; `App.tsx:544-546` |
| Remove `UpdateGate`/`blocked` branch | Expired-grace devices enter the app against policy; update actions unreachable | High | `App.tsx:595-599`; `updateStateMachine.ts:12-19`, statuses `:74-79` |
| Remove offline-access check | `missing_assignment`/`user_mismatch` devices enter online-gated flows offline; 48 h window unenforced | High | `offlineAccess.ts:57-96`; `App.tsx:467-468` |
| Remove `OfflineAccessBlocked` | Blocked users fall through to Login or PageLoader with no explanation and no recovery path | Medium | `App.tsx:601-609` |
| Remove `GateError` retry | Workspace/entity/provisioning failures become dead ends | Medium | `TenantGate.tsx:21-46, 94-101` |
| Remove `ErrorBoundary` wrappers | Any route crash whitescreens instead of offering retry | Medium | `ErrorBoundary.tsx:39-59` |
| Remove `resolveSessionSafely`/`clearBadSession` | Invalid refresh tokens leave the app in a zombie session; splash never clears | High | `App.tsx:150-170`; `sessionErrors.ts:1-31` |
| Remove `useSafeAsyncTask` cancellation | StrictMode double-mount fires duplicate profile fetches; stale responses overwrite current user | Medium | `useSafeAsyncTask.ts:36-81`; `main.tsx:53` StrictMode |
| Remove `useSyncBootstrap` recovery | Foreground/online resume skips state recovery; native offline queues stall | Medium | `useSyncBootstrap.ts:142-178` (visibility/online handlers) |
| Remove `AppThemeManager` | No dark class, no token bundles; app stuck in default light with broken preset expectations | Medium | `AppShell.tsx:104-243` |
| Remove `useUserThemePreferences` | Theme never loads; DashboardOverview loses shared preference source | Medium | `AppShell.tsx:253-254` |
| Remove `AndroidBackHandler` | Hardware back exits app instead of navigating/dismissing | Medium | `capacitor.config.ts:10-15` comment; `AndroidBackHandler.tsx` |
| Remove `NativeAuthRedirect` | Native OAuth callback URLs unhandled; Google sign-in dead on Android | High | `NativeAuthRedirect.tsx:47-91` |
| Remove `TenantDebug` | Lose startup-resolution diagnostics; no user impact | Low | `AppShell.tsx:334` |
| Remove `bd-halo` keyframes early | Splash loses halo; no other consumer | Low | Grep §E |
| Remove `runnerMove` injection | No visual change (zero appliers) | Low | `App.tsx:343-356`, grep §E |
| Remove `variant`/`circuitPosition` props | Single caller uses defaults; type-only cleanup | Low | `SplashOverlay.tsx:14-23`; `App.tsx:633-637` |
| Web refresh / process restore | State rebuilds from stored session; `selectedWorkspaceId` ref resets (session-only pick) → multi-workspace users re-select | Medium (by design) | `contexts.tsx:80-81`; `tenantGate.ts` comment on session picks |
| Foldable layouts | Splash has no fold handling; fold dataset applies post-shell (`AndroidFoldAwareness.tsx:8-38`, native-gated line 9) | Low | Prior audit §8 |
| Reduced motion | Splash has no `prefers-reduced-motion` rule; halo/circuit animate regardless; guidance avatars do (`index.css` avatar section) | Medium (a11y debt, not a blocker) | `SplashOverlay.tsx:58`; `GuidanceTip.tsx` motion note |

## 6. Duplicate-loader root cause

Why the splash can disappear before TenantGate completes: two independent readiness authorities with no shared signal.

- Authority 1: `showSplash`, driven by auth/profile/offline flags (`App.tsx:520-534`). Knows nothing about workspace, entity, provisioning, or exposure.
- Authority 2: `resolveGatePhase`, driven by workspace/entity contexts (`tenantGate.ts:194-237`). Mounts only after Authority 1's route branch renders (`App.tsx:615-626`).

Sequence on a slow tenant fetch: flags clear → 600 ms → splash fades → TenantGate `loading` renders `PageLoader` + tips. Two visuals, one gap. A third late boundary (`UpdateGate` blocked, `App.tsx:595-599`) and a fourth (`BiometricGate` resume, `BiometricGate.tsx:124-129`) can each appear with no continuity.

Narrowest safe integration boundary: the route-gate layer in `App.tsx` lines 592-631, because every boundary already funnels through it and it already owns session, profile resolution, offline state, and update status.

Alternative comparison:

- A. Shared visual presentation used by both loading boundaries. SplashOverlay-style component rendered by App AND TenantGate/BiometricGate loading phases, reading one shared "startup phase" value. Coupling: low (presentational). Lifecycle: safe (each owner mounts/unmounts its own instance; engine slots already isolate tips per mount, `useLoadingTip.ts:95-102, 152-172`). Providers: TenantGate instance sits inside providers (fine, it already does). Duplicate tips: impossible — one visible instance at a time if phases are mutually exclusive. Failure transitions: each gate keeps its own error UI. Cleanup: remove per-gate instances last.
- B. Single parent presentation with readiness signaling. One overlay in App driven by a combined signal (flags + gate phase lifted up). Coupling: high — requires lifting TenantGate phase state above providers, restructuring context boundaries, and re-pinning two existing tests (`workspaceBootstrapDecision`, `workspaceAbandonment`). Lifecycle risk: StrictMode double effects across the new boundary. Benefit: single mount, zero overlap by construction.
- C. Keep two boundaries, bridge the visual gap. Leave structure untouched; make the TenantGate loader visually identical to the splash tail (same background, no second spinner). Coupling: near zero. Weakness: still two mounts; a slow second phase restarts perceived loading.

Recommendation: A, on evidence. It reuses the proven slot isolation (`guidanceEngine.ts:267-336`), requires no provider restructuring, keeps every error/retry path exactly where it is, and lets each old visual retire independently. B is cleaner in theory but touches the security-sensitive gate order (`tenantGate.ts:189-197` "order matters") and both pinning tests for no functional gain. C papers over the seam without fixing tip continuity.

## 7. Android versus web differences

- Native splash: OS-owned `Theme.SplashScreen` (`styles.xml:16-20`), no plugin, no JS hide call, `MainActivity.java` contains zero splash code. Web has no equivalent; first paint is the React splash. Retirement touches only the React layer on both platforms, but Android keeps an unthemed white OS splash regardless — coordinate with the in-flight icon work (§2), not with this retirement.
- `OfflineAccessBlocked`, `UpdateGate`/`UpdateBanner`, `BiometricGate` verification, back handler, auth redirect, fold awareness, system bars: Android-only branches (`isAndroidNative`/`isNativePlatform` guards). Web cold start can never reach them (PROVEN by guards at `App.tsx:582-599`, `BiometricGate.tsx:87, 101`, `AndroidFoldAwareness.tsx:9`). A web-only regression test would miss Android-only resurrection vectors; guards must cover both (see §9).
- Offline authorization (`offlineAccess.ts`, SQLite-backed, device assignment + 48 h window) is distinct from browser `navigator.onLine` connectivity (`useLoadingTip.ts:48-51`, engine `offline`/`reconnecting` states). A replacement must not conflate them: one gates access, the other only changes status copy and tip selection.
- Process restoration on Android re-runs the full React bootstrap (no retained provider state; session pick refs reset). Any replacement must be mount-safe under full remount and StrictMode double-invocation (`main.tsx:53`).

## 8. Connectivity and tip-engine findings

Authoritative mechanisms (verified):

- Browser/device offline: `navigator.onLine` read at hook init + `online`/`offline` listeners (`useLoadingTip.ts:48-51, 107-126`). No polling.
- Request failure: 20 s timeout + one retry for safe methods and auth refresh (`supabase.ts:7-9, 82-123` per prior audit; file re-verified present at 133 lines).
- Slow startup: engine `slotConnectivity` derives `slow` from slot-active elapsed ≥ 12 s (`guidanceEngine.ts:141-162, :35`); status copy switches without claiming progress (`:100-110`).
- Reconnection: `reconnectedAtMs` latch + 8 s window (`useLoadingTip.ts:94, 140-146`; engine `:150-160`); lifecycle recovery via visibility/online handlers (`useSyncBootstrap.ts:142-178`, 1.5 s cooldown).
- Offline-access entitlement: SQLite-backed window + assignment + user match (`offlineAccess.ts:40-102`). Independent of connectivity state.
- Retry: per-gate refresh (`TenantGate.tsx:96-99`), provisioning re-poll (`ProvisioningProgress.tsx:25-31`, 3 s), exposure re-probe once + 10 s (`contexts.tsx:409-419`), auth recovery (`App.tsx:277-335` per prior audit lines).

Tip rotation across presentation transitions: the singleton engine (`guidanceEngine.ts:374-377`) owns slots per mounted loader (`useId`, `useLoadingTip.ts:96`). `activateSlot` pins a tip and records exposure (`guidanceEngine.ts:271-285`); `deactivateSlot` releases the slot but keeps history (`:288-291`); rotation continues across remounts (`useLoadingTip.ts:164-172`). PROVEN: tips survive presentation transitions today (splash → TenantGate loader continues rotation, never restarts).

Coexistence guidance for slow/offline notices: render notices as a separate status line bound to `connectivity` (as `resolveLaunchStatus` already does), never as a replacement tip card; keep the tip slot mounted and `active` across the transition so rotation continues; never synthesize connectivity (engine reads are pure functions of `online` + timestamps). No animation restart is needed because rotation is interval-driven on a persistent singleton, not on mount effects.

## 9. Five-month regression prevention strategy

Resurrection vectors, each with a guard:

1. Remaining imports. Guard: forbid `SplashOverlay` import outside an allowlist (initially empty). Test location: extend `src/tests/critical/` with a static source-scan test in the style of existing `assert.match(read(...))` tests (e.g. `cpsViewHooksOrder.test.js:26-47` reads source and asserts). Test asserts no `from '@/components/app/SplashOverlay'` (and `showSplash`, `SplashCircuit`) in `src/` except an explicit `retirement-allowlist` comment file. False-positive shield: scope the scan to `src/` only, never `docs/` (prototypes and this audit mention the names legitimately).
2. Dormant components. `CircuitBoard`, `PageLoader`, `QuickTipCard`, `LoadingTips` stay intentionally (shared). Guard: assert their *startup call sites* stay gone — scan `App.tsx`, `TenantGate.tsx`, `BiometricGate.tsx` for the exact retired JSX (`<SplashOverlay`, `<PageLoader>` in App's three branches, `LoadingTips` in gate loading phases) only when a successor exists; until then, scan asserts the successor's presence (mirror assertion: new component imported in `App.tsx`).
3. Alternative route trees. Guard: assert `BrowserRouter` + `Routes` structure in `App.tsx` still contains the `/*` catch-all with the gate chain in order (update → session → profile → biometric → providers → TenantGate → AppShell). A structural snapshot test on `App.tsx` source (route order regex) catches reordering or bypass.
4. Fallback rendering. Guard: assert `TenantGate` `loading` phase still renders a tips-carrying loader (not `null`, not a bare spinner without status role); assert `GateError` retry still calls both refreshes.
5. Platform resources. Guard: a test asserting `capacitor.config.ts` contains no `SplashScreen` plugin block (so no silent native-splash behavior change), and `styles.xml` launch theme still points at `postSplashScreenTheme`. If the icon rework changes drawables, update the test's asset expectations rather than deleting it.
6. Duplicate styles. Guard: assert `bd-halo` keyframes absent once retired; assert `bd-avatar-*` and `bd-guidance-enter` still present (shared). Assert `runnerMove` injection block absent from `App.tsx` (already dead; removal is safe anytime).
7. Legacy templates. Prototypes under `docs/` and `docs/templates/html-temps/` are excluded from all scans by path. Document the exclusion in the test file header so a future agent does not "fix" it into scope.
8. Feature flags. No startup feature flag exists today (verified: no flag-gated splash path in `App.tsx`). Guard: if one is ever introduced, require it to default to the new presentation with the old path behind an explicitly expiring flag (date in the flag name).
9. Branch merges. Guard lives in the test suite, not in process: the static scans run under `bun run test` (existing command, `package.json`), so any merge resurrecting the symbols fails CI the same day.
10. Future reuse. AGENTS.md guardrail (proposed wording, §11): "Startup presentation lives in exactly one component, mounted in exactly one place (`App.tsx` route-gate layer). Do not add a second loading boundary with its own visuals; extend the shared presentation and the guidance engine slots."

Tests that protect readiness behavior (already exist, must keep green): `workspaceBootstrapDecision.test.js` and `workspaceAbandonment.test.js` pin `resolveGatePhase` ordering, including pending-approval and invitation precedence. Add: a test pinning `TenantGateInput → phase` for the exposure hold (`schemaExposed: false/null → 'provisioning'`), since that is the subtlest gate and the easiest to regress.

Deliberate reintroduction cannot be prevented by tests — only made loud. State that in the guard file: guards detect accidents, not intent.

## 10. Recommended future integration boundary

Adopt alternative A (§6): one shared visual presentation component, instantiated at each live loading boundary (App splash slot, TenantGate loading phase, BiometricGate gated phase), all reading the same inputs (`visible`, tip slot, status line) and the same engine.

Why this boundary and not the others: it is the only option that (a) needs no provider restructuring, (b) preserves the tested gate order, (c) preserves every retry path, (d) makes tip continuity automatic via existing slots, and (e) lets App's three `PageLoader` call sites, the two gate loaders, and the splash retire as five small, independently reviewable deletions instead of one architectural rewrite.

Concretely, the boundary is: `App.tsx:592-637` (route-gate layer) for mounting, `useLoadingTip` slots for content, `resolveGatePhase` + the three `App.tsx` flags for truth. Nothing above `App.tsx` (main.tsx, index.html, native theme) changes. Nothing below the gate order changes.

## 11. Safe retirement sequence

Phase 1 — Finalize design + responsive behavior. Evidence required: approved Amber Terracotta Dark prototype covering phone, fold, tablet, desktop; reduced-motion static frames; offline/slow states. (Prototype exists; approval is product input, not code.)
Phase 2 — Implement replacement presentation as a new component beside the old one, mounted nowhere. Evidence: component renders in isolation (storybook-style preview or test render), uses only theme tokens, honors `prefers-reduced-motion`, announces via `role="status"`.
Phase 3 — Connect real readiness + persistent tips. Mount the replacement at the App splash slot reading the existing flags; keep TenantGate/BiometricGate loaders visually bridged (alternative A instances). Evidence: cold start shows ONE continuous visual; tip history continues across the splash→gate handoff (assert via engine `getVersion` monotonicity in a test); 600 ms timer value explicitly re-decided (keep, shorten, or remove with reason).
Phase 4 — Preserve exceptional gates. Evidence: manual matrix — expired grace → UpdateGate; offline-expired → OfflineAccessBlocked; biometric cancel → local sign-out → Login; tenant error → GateError retry; invalid session → Login. Each must render with the new visuals and unchanged logic.
Phase 5 — Retire obsolete presentation imports/styles. Delete in this order: `SplashOverlay` JSX + import (App.tsx), `CircuitBoard` splash import, `QuickTipCard` splash usage, App's three `PageLoader` usages (replace with successor), gate loader visuals, `bd-halo` keyframes, `runnerMove` block, legacy props. Evidence after each deletion: `bun run test` green + targeted grep showing zero remaining references.
Phase 6 — Remove proven dead artifacts (`bd-sheet-*`, `bd-mark`, `bd-progress`, `runnerMove`). Evidence: pre-deletion grep proves zero consumers (this report §3 #28-29 is the baseline; re-run at execution time).
Phase 7 — Guards + ownership contract. Add the §9 static tests; update the three stale docs (§4); append the AGENTS.md guardrail; record new ownership (one component, one mount layer, engine authority) in `docs/reports/general/`.

## 12. Rollback strategy

Use only repository-supported mechanisms:

- Version control: each phase lands as its own commit (per repo convention of staged, reviewed changes). Rollback is `git revert` of the phase commit — never a forward-fix that re-adds the old loader alongside the new one.
- Deployment: Vercel preview/production pipeline (`Vercel.json` present; `deploy-to-vercel` skill exists). Roll back by redeploying the last known-good build, not by shipping a hybrid.
- No undocumented permanent fallback: if the replacement faults in production, the recovery is revert + redeploy, after which the old presentation exists only in git history. Reintroducing it as a "just in case" parallel path is prohibited by the §9 import guard (it would fail CI).
- Data safety: retirement touches no database objects, no migrations, no RLS, no Supabase config — there is nothing to roll back in the data layer by construction.
- Grace-state caution: `UpdateGate` blocked state derives from locally persisted grace anchors (`graceState.ts`). A rollback does not clear them, which is correct — enforcement continuity is preserved across versions.

## 13. Unresolved questions and evidence gaps

1. `index.html:13` references `/src/main.jsx`; the file on disk is `src/main.tsx`, and `main.tsx:28` imports `./App.jsx` while the file is `App.tsx`. Build tooling evidently resolves this, but the mechanism was not verified (no builds permitted). Any retirement touching entry paths must first resolve this discrepancy. UNRESOLVED.
2. Native splash pixel handoff (white OS splash → React splash, dark-mode flash) unmeasured; icon assets concurrently in flux (§2). UNRESOLVED, needs a device run post-icon-work.
3. `ProvisioningProgress.tsx:56` uses hardcoded `bg-stone-100` and sky accents outside theme tokens. Cosmetic inconsistency in an onboarding (not cold-launch) surface; flagged, not blocking.
4. `TenantDebug` (`AppShell.tsx:334`) and `ErrorsDashboard` (localhost-only, `:335-337`) were read for existence only; their diagnostic value during a future migration is INVESTIGATE.
5. Slow-network behavior of the 600 ms timer + 300 ms fade was reasoned statically, not measured. Timing claims about perceived flicker are LIKELY, not PROVEN.
6. The v4 concept review (`2026-10-08-cold-launch-concepts-v4-review.md:130`) already recommends the same seam as §10. No conflict found; that report remains the design-side companion to this audit.

## 14. Final go/no-go assessment

NO-GO for complete retirement now. There is no production successor, and deleting the splash today produces a blank-or-flashing launch with no cover over auth, tenant, update, biometric, and offline gates.

GO for retirement ONLY AFTER Phases 1-4 (§11) complete with their evidence in hand. At that point the deletion list is exactly §3 items 1-3 (usages), 7 (usages), 9 (visuals), 27-30, executed in Phase 5 order with tests green after each step.

The architecture supports this outcome without restructuring: the readiness seam is real, the tip engine survives transitions by design, and every exceptional gate already owns its retry path. The risk is sequencing and coverage, not architecture.

## 15. Files inspected

`index.html`; `src/main.tsx`; `src/App.tsx` (1-643, all); `src/components/app/SplashOverlay.tsx`, `QuickTipCard.tsx`, `PageLoader.tsx`, `TenantGate.tsx`, `BiometricGate.tsx`, `AppShell.tsx` (1-120, 246-344), `OfflineAccessBlocked.tsx`, `UpdateGate.tsx`, `UpdateBanner.tsx`, `AndroidBackHandler.tsx` (1-60), `NativeAuthRedirect.tsx`, `AndroidFoldAwareness.tsx`, `ErrorBoundary.tsx`, `src/components/loading/LoadingTips.tsx`, `src/components/guidance/GuidanceTip.tsx` (1-100), `src/components/table-document/TableDocumentExportController.tsx` (1-115), `src/components/ui/toaster.tsx`, `src/components/ui/OperationOverlay.tsx` (1-40), `src/components/ui/circuit-board.tsx` (exports only), `src/hooks/useLoadingTip.ts`, `useSafeAsyncTask.ts`, `useUserThemePreferences.ts`, `useAppUpdate.ts` (1-130), `FoldAwareness.ts`, `src/domain/guidance/guidanceEngine.ts` (exports map), `src/domain/tenant/tenantGate.ts` (137-266), `src/domain/tenant/tenantCreation.ts` (exports map), `src/domain/appUpdate/updateStateMachine.ts` (1-80), `src/lib/tenant/contexts.tsx` (1-120, 380-578), `src/lib/tipContent.ts` (exports), `src/lib/native/offlineAccess.ts`, `biometric.ts`, `capacitor.ts` (via prior audit), `src/auth/sessionErrors.ts`, `src/app/useSyncBootstrap.ts` (1-60), `src/supabase.ts` (1-60), `src/index.css` (keyframe/token regions), `src/styles/formTheme.css` (overlay-token regions), `src/pages/Login.tsx` (1-60), `src/pages/ProvisioningProgress.tsx`, `src/pages/ComplianceHub.tsx` (170-199), `capacitor.config.ts`, `android/.../MainActivity.java`, `android/.../styles.xml`, `android/.../AndroidManifest.xml` (via prior audit, re-verified unchanged sizes), `src/context/OperationContext.tsx` (1-80), prior audit report, related docs under `docs/reports/` and `docs/prd/` (cited inline).

## 16. Git status before and after

Before (HEAD `main...origin/main`, selected entries; full output captured at session start):

- Modified (pre-existing, untouched): `android/app/src/main/res/` launcher icon set (`drawable/ic_launcher_background.xml`, `drawable-v24/ic_launcher_foreground.xml`, `mipmap-*/ic_launcher*.png`, `values/ic_launcher_background.xml`); `src/components/cps/`, `src/components/useInvoiceColumns.tsx`, `src/domain/cps/`, `src/domain/import/utils.ts`, `src/tests/critical/cps*.test.js`; one deleted prototype HTML (`filter-icon-comparison.html`); one deleted tenant-tree prototype variant.
- Untracked (pre-existing, untouched): icon export folders under `docs/prd/.../icons/`; `cold-launch-tenant-tree/variations/` additions including `the final.html`; `docs/reports/android/android-launcher-icon-official-export-2026-10-08.md`.

After: one addition — this report. No modified-file delta attributable to this task. Verification of the after-state follows in §17.

## 17. Verification statement

- `git status` ran immediately before investigation and after report creation. Only this report was added by this task.
- Zero application source files modified. Zero configuration files modified. Zero dependencies modified. Zero tests modified or executed. Zero database changes.
- Not run, per constraints: `bun run build`, `bun run typecheck`, `lint`, `bun run audit:load`. No application code executed. No browser or Android builds.
- All behavioral claims cite file paths with line ranges; gaps are labeled UNRESOLVED, not filled by inference.
