# Live New-User Pre-Dashboard Wireframe Report

This report was written by Buffy on 2026-09-12 via Freebuff.

## Objective

Trace the current live BIGDROPS new-user journey from signup to dashboard access. Create one standalone forensic HTML wireframe. Do not change production code.

## Scope

Read-only source inspection. One new HTML artifact. Zero source, config, or package edits. No build, no typecheck, no lint per the task's hardware gate.

## Files changed

Created:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/wireframes/BIGDROPS_Live-New-User-Pre-Dashboard-Wireframe.html`
- `docs/reports/ui-ux/live-new-user-pre-dashboard-wireframe-report.md` (this report)

Not changed: all application source, PRD files, onboarding prototypes, package files, lockfiles.

## Skills used

Skills used: NONE

## Documentation standard

Documentation standard: ASD-STE100 Simplified Technical English

## Discovered flow

Primary path (new user, email signup), in order:

1. Check your email — `src/pages/Login.tsx`, `signupCompleteEmail` branch, route `/`.
2. Sign in to continue — `src/pages/Login.tsx`, signin mode.
3. Splash overlay — `src/App.tsx` (`showSplash`, `SPLASH_TIPS`) + `src/components/app/SplashOverlay.tsx` + `QuickTipCard.tsx`. Re-shown on `SIGNED_IN`.
4. PageLoader (profile resolution) — `src/App.tsx` `waitingForProfileResolution` + `src/components/app/PageLoader.tsx`.
5. Create your workspace — `TenantGate` phase `create-workspace` → `src/pages/WorkspaceCreation.tsx`. Decision table: `src/domain/tenant/tenantGate.ts` `resolveGatePhase()`.
6. Workspace Awaiting Approval — phase `pending-approval` → `src/pages/WorkspacePendingApproval.tsx`. Polls every 5 s.
7. Create your company (auto-bootstrap) — phase `create-company` → `src/pages/CompanyCreation.tsx`. `ensureInitialCompany()` runs on mount. Shows "Creating company…" then "Setting up schema…".
8. Company created — same component, phase `success`.
9. Set System Password (final gate) — `src/components/app/SetPasswordModal.tsx`, mounted by `AppShell.tsx` when `profile.has_password` is false and provider ≠ `email`.
10. Dashboard accessible — `AppShell` route `/` → `Dashboard`.

Conditional states (evidence-backed, in the wireframe as branches):

- Join a workspace tab — `WorkspaceCreation.tsx` mode `join`.
- You have been invited — phase `pending-invitation` → `WorkspaceInvitation.tsx`.
- Choose a workspace — phase `select-workspace` → `WorkspaceSelection.tsx` (more than one active workspace).
- Company setup error — `CompanyCreation.tsx` phase `error`.
- Setting Up Your Company — phase `provisioning` → `ProvisioningProgress.tsx` (exposure probe holds here).
- Company Setup Failed — phase `provisioning-failed` → `ProvisioningFailed.tsx`.
- Gate error / blocked / unavailable — `TenantGate.tsx` `GateError`.

## Key findings

- The product-confirmed "Create Password" popup exists in code as `SetPasswordModal` with title "Set System Password". No close button. Fields: New password, Confirm password. Validation: "Password must be at least 6 characters", "Passwords do not match". Success: "Password set successfully." then `onComplete()` after 1.5 s.
- For email signups, `Login.tsx` `handleSignUp` sets `profiles.has_password = true`. The modal therefore gates Google-OAuth signups in practice. The wireframe note records this.
- The `Blocked` and `Unavailable` phases map to `GateError` with copy "This workspace has been blocked." and "This workspace is no longer available." These are included in the Gate error state note.

## Artifact behavior

- Prototype controls: Previous, Next, Restart, state selector, phone/tablet/desktop viewport, light/dark toggle.
- Forensic banner "CURRENT LIVE FLOW — DESIGN CAPTURE" and notes panel sit outside the simulated UI.
- Flow map with primary lane and branch lane. Chips navigate to states.
- Notes per state: discovered name, source component, inclusion reason, next state, uncertainty.
- Dark mode uses CSS variables. Hardcoded Tailwind colors in the live app (stone-100, #f6f6f4) do not flip; the note records this fidelity limit.

## Verification result

Verification:
- git status before: pre-existing untracked reports only (other agents' work). Not touched.
- git status after: only the two new files above added. No source, PRD, prototype, package, or lockfile changes.
- bun run build: skipped per task rule.
- bun run typecheck: skipped per task rule.
- bun run lint: skipped per task rule.

## Risks or limitations

- Dynamic values (email, workspace and company names, runtime error text) use marked sample substitutions. Static copy is verbatim from source.
- The SplashCircuit visual is reproduced schematically, not pixel-exact.
- The dashboard frame is representative by scope.

## Deferred work

- Optional: review the artifact in a browser and adjust circuit fidelity.
- Optional: capture runtime screenshots against a staging tenant to confirm the sample substitutions.
