# Established-User Cold Launch Wireframe Report

This report was written by Buffy on 2026-09-12 via Freebuff.

## Objective

Trace the current live BIGDROPS established-user cold launch: app start with an existing session until dashboard access. Create one standalone forensic HTML wireframe. Do not change production code.

## Scope

Read-only source inspection. One new HTML artifact. Zero source, config, or package edits. No build, typecheck, or lint per the task hardware gate. Companion artifact: `BIGDROPS_Live-New-User-Pre-Dashboard-Wireframe.html` (new-user journey, same visual language and control scheme).

## Files changed

Created:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/wireframes/BIGDROPS_Live-Established-User-Cold-Launch-Wireframe.html`
- `docs/reports/ui-ux/established-user-cold-launch-wireframe-report.md` (this report)

Not changed: application source, PRD files, prototypes, package files, lockfiles.

## Skills used

Skills used: NONE

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Discovered flow

Primary cold-launch path (returning user, existing session), in order:

1. Splash overlay — `src/App.tsx` (`showSplash` true at mount) + `src/components/app/SplashOverlay.tsx` + `QuickTipCard.tsx`. Covers `init()`: offline-access check, session restore, profile load, sync bootstrap.
2. PageLoader (profile resolution) — `src/App.tsx` `waitingForProfileResolution` + `src/components/app/PageLoader.tsx`.
3. TenantGate loading — phase `loading` → `PageLoader` + `LoadingTips` (`src/components/app/TenantGate.tsx`, decision table `src/domain/tenant/tenantGate.ts`).
4. Dashboard accessible — `src/components/app/AppShell.tsx` route `/`.

Native lane (Android/Capacitor only):

- PageLoader during offline-access check — `src/App.tsx` `offlineAccessLoading`; decision in `src/lib/native/offlineAccess.ts` `getOfflineAccessState()`.
- Biometric verification at cold launch — `src/App.tsx` `BiometricGate enabled=biometricLockEnabled` → `src/components/app/BiometricGate.tsx`. Preference: `src/lib/native/biometric.ts`. One-shot per enablement; renders `PageLoader` while gated; failure or cancel signs out locally.
- Biometric re-lock on resume from background — same component, `appStateChange` listener.

Conditional states:

- Offline Access Paused — `src/components/app/OfflineAccessBlocked.tsx`. Native-only. Two verbatim message variants (`missing_window`, `expired_offline_window`); `missing_assignment` and `user_mismatch` render the same screen.
- Choose a workspace — phase `select-workspace` → `src/pages/WorkspaceSelection.tsx`. Reappears on every cold launch for multi-workspace users because the session choice resets on reload (comment in `tenantGate.ts`).
- Workspace Awaiting Approval — phase `pending-approval` → `src/pages/WorkspacePendingApproval.tsx`. Stale pending row with no active workspace.
- Gate error / blocked / unavailable — `TenantGate.tsx` `GateError` ("Something went wrong", "This workspace has been blocked.", "This workspace is no longer available.").

## Key findings

- The established-user journey has no onboarding gates on the primary path. Only loaders sit between launch and dashboard.
- Set Password does not appear for established email users: `loadProfile` self-heals `has_password` to true (`src/App.tsx`), and the modal shows only when `has_password` is false and provider is not `email`.
- The offline-access gate precedes the session/profile route gate. Blocked access replaces the whole app screen, not a modal.
- The biometric gate wraps the tenant gate. Its loader is a `PageLoader`; the actual prompt is native OS UI, not app DOM.
- The splash hides only when auth, profile, and offline-access loading all finish, with a 600 ms minimum visible time.

## Artifact behavior

- Prototype controls: Previous, Next, Restart, state selector with primary/native/branch groups, phone/tablet/desktop viewport, light/dark toggle.
- Flow map with three lanes: primary, native, conditional.
- Per-state notes: source, inclusion reason, next state, uncertainty.
- Forensic banner and notes stay outside the simulated UI.
- Native biometric sheets are schematic and marked as OS UI in the notes.

## Verification result

Verification:
- git status before: pre-existing untracked reports and the earlier wireframe. Not touched.
- git status after: only the two new files above added. No source, PRD, prototype, package, or lockfile changes.
- bun run build: skipped per task rule.
- bun run typecheck: skipped per task rule.
- bun run lint: skipped per task rule.

## Risks or limitations

- The biometric sheet is native UI; the artifact shows a generic schematic sheet, not any device-exact prompt.
- Dynamic values (workspace names, expiry timestamps, runtime error text) use marked sample substitutions. Static copy is verbatim.
- The dashboard frame is representative by scope.

## Deferred work

- Optional: capture device screenshots of the Android biometric prompt and offline-blocked screen to confirm schematic fidelity.
- Optional: pair the two artifacts into a single journey index page for the redesign review.
