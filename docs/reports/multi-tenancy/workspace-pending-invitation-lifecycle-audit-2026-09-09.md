# Workspace Pending–Invitation Lifecycle Audit

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Determine whether a pending workspace can trap an invited user off the invitation flow.
- Scope: Auto-bootstrap, gate order, invitation lifecycle, acceptance paths, escape routes, data safety.
- Files changed: NONE except this report. Zero implementation changes.
- Skills used: supabase, react-dev.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: NONE. Read-only inspection only.
- Verification result: Every claim cites file plus line. No runtime reproduction. No data touched.
- Risks or limitations: Reachability traced from code, not from a live trapped session.
- Deferred work: Implementation belongs to a future coding task.

---

## EXECUTIVE SUMMARY

The reported trap is real and reproduced from code. Gate order in `src/domain/tenant/tenantGate.ts:184-188` checks `pendingWorkspace` before `pendingInvitation`, so any user holding both lands on `Workspace Awaiting Approval` forever. That screen offers only Sign Out (`WorkspacePendingApproval.tsx:91-100`). Sign-in restores the same state because pending status is database-persisted. The provider loads the invitation (`contexts.tsx:161-188`) but the gate never consults it. This contradicts the frontend PRD, which requires invitation precedence (`erp-frontend-prd-v1.5.md:275-277,592-593,607-608`). A second defect surfaced: users who already hold an active membership never load invitations at all (`contexts.tsx:161,186-188`) and no invitee inbox exists anywhere, so their invites are undiscoverable in-app. Recommended correction is reorder plus invitation-aware bootstrap. No deletion mechanism is needed.

## EXACT REPOSITORY EVIDENCE

| Fact | Evidence |
|---|---|
| Gate checks pending before invitation | `tenantGate.ts:184-188` (`pendingWorkspace` line 185 precedes `pendingInvitation` line 188) |
| Auto-bootstrap ignores invitations | `ensureInitialWorkspace` reads only pending rows plus memberships (`tenantCreation.ts:519-554`); no invitation query exists in the function |
| Auto effect runs unconditionally on the create screen | `WorkspaceCreation.tsx:57-80` |
| Provider loads invite even with pending present | `contexts.tsx:161-188` (runs when `active.length === 0`, pending not consulted) |
| Provider nulls invite when active membership exists | `contexts.tsx:186-188` (`else setPendingInvitation(null)`) |
| Pending screen has no invitation UI or navigation | `WorkspacePendingApproval.tsx:35-122` (only Sign Out plus polling) |
| Invitation screen exists with accept plus pass | `WorkspaceInvitation.tsx:25-37,73-101` |
| Accept RPC needs only pending, unexpired, email match | `20260818000001:168-207` (no workspace prerequisite) |
| No invitation route exists | `App.tsx:568-606` (only `/reset-password` plus `/*`); `AppShell.tsx:274-330` (all routes behind ready gate) |
| No leave, abandon, decline, or workspace-delete operation | Grep finds only admin member-removal (`AdminSettingsSection.tsx:224`), unreachable pre-membership |
| Switcher lists active memberships only | `WorkspaceSelectionSheet.tsx:88,124` |
| Multi-membership allowed in schema | No `UNIQUE(user_id)` on `workspace_members`; only `idx_one_owner_per_workspace` and `idx_one_pending_workspace_per_creator` (`20260714000000:125-128`) |
| Cascades are clean | members, entities, invitations, grants all `ON DELETE CASCADE` from workspaces (`20260714000000:22,33,54,70`; `entities` at `:33`) |
| PRD requires invitation precedence | `erp-frontend-prd-v1.5.md:275-277,592-593,607-608`; re-offer on later startup at `:616-619` |

## AUTOMATIC WORKSPACE CREATION LIFECYCLE

`ensureInitialWorkspace()` runs from the create-workspace screen when the user has no active membership and no visible invitation. It reuses the direct insert path, so the row lands in `pending_approval`. The name pattern (`<email-prefix>'s Workspace`) matches the reported `Wisdom.jaiyeola180551044's Workspace`. This is intentional product behavior (idempotent first-run bootstrap), not a bug. The defect is not the auto-creation; it is that bootstrap never consults pending invitations and the gate ranks pending above invitation. The application does not ask first and does not know about invitations at bootstrap time.

Coexistence allowed by schema: one pending workspace (per-creator unique index) plus any number of memberships plus any number of invitations. All three states can hold simultaneously.

## WORKSPACE PENDING-APPROVAL LIFECYCLE

Pending screen polls `workspaceCtx.refresh()` every 5 seconds and routes onward only when an active membership appears. It is a terminal wait with one exit (Sign Out). Sign-out plus sign-in restores the identical state. No error exists here in isolation; the screen correctly represents a pure pending state. It becomes a trap only in combination with an unreachable invitation.

## INVITATION LIFECYCLE

Created by workspace admins (`create_workspace_invitation`, used at `AdminSettingsSection.tsx:196`). Discovered at startup by email-scoped query, but only when the user holds zero active memberships. Rendered only on the invitation screen. Accepted by one RPC that inserts membership plus entity grants and flips status. Pass-for-now dismisses for the session only; the invitation stays pending and the screen promises re-offer on later sign-in (`WorkspaceInvitation.tsx:98-100`) — a promise the gate order breaks whenever a pending workspace exists.

## INVITATION ACCEPTANCE PATH

Only path: gate `pending-invitation` phase → `WorkspaceInvitation` → `acceptWorkspaceInvitation(id)` → provider refresh → membership resolves → normal flow. No URL, no inbox, no settings entry, no notification surface reaches it. The RPC itself would succeed from any state, including alongside a pending workspace.

## EXACT GATE CAUSING THE TRAP

`resolveGatePhase`, `tenantGate.ts:184-191`: inside `!workspace`, `pendingWorkspace` returns `pending-approval` before `pendingInvitation` is evaluated. The provider has already loaded the invitation by then. Result: the invitation screen is dead code for every user who also holds a pending workspace.

## AVAILABLE ESCAPE / NAVIGATION PATHS

None, except Sign Out, which does not escape: the pending row persists, so the next sign-in renders the same screen. There is no leave, abandon, decline, switch, or deep-link path. Finding: Sign Out is the only control, and it is not an escape. It merely ends the session.

## WHETHER SIGN OUT IS THE ONLY ESCAPE

Yes. Verified by exhaustive surface search: pending screen (one button), no routes to gate phases, switcher gated behind ready state, no abandon operation in code or migrations.

## LIFECYCLE SCENARIO RESULTS A–G

- A (new account, no invitation): COMPLIANT. Auto workspace plus pending screen is the intended design.
- B (invitation exists at signup): COMPLIANT until Pass-for-now is pressed. Gate routes to the invitation screen while no pending workspace exists. After pass plus auto-create, the user converts to trapped scenario C.
- C (pending first, invitation later — reported case): CONFIRMED CURRENT DEFECT. Invitation loaded but unreachable; screen offers no path.
- D (active membership exists, new invitation arrives): CONFIRMED CURRENT DEFECT (second). Provider skips the invite query; no inbox surface exists anywhere; acceptance unreachable in-app.
- E (pending plus invitation to an approved workspace): CONFIRMED CURRENT DEFECT. Same gate order; target workspace state is irrelevant because membership does not exist yet.
- F (memberships plus pending): CONDITIONAL. With a session pick or single membership, the app opens normally and pending is invisible. With multiple memberships and no pick yet, `workspace` is null and the pending branch traps the user despite usable memberships.
- G (decline): NOT SUPPORTED BY DESIGN. No decline operation exists; PRD reserves revocation to admins. Pass-for-now is session-only and unreachable when pending exists. Not classified as defect alone, but it removes the last non-destructive outlet for trapped users.

## WHETHER THE REPORTED SCENARIO IS REPRODUCIBLE FROM CODE

Yes. Account signs up → auto-bootstrap creates pending workspace → invitation arrives → provider loads both → gate returns `pending-approval` → screen shows Sign Out only → repeat forever. Every step cites implementation above. No inference required.

## DATA / MEMBERSHIP SAFETY FINDINGS

- Accepting alongside a pending workspace is safe: RPC writes one membership row plus grants; schema permits multi-membership; trigger guards invite-entity scope.
- Abandoning (deleting) a fresh pending workspace would cascade cleanly (no memberships, no entities, invites cascade). But no mechanism exists, deletion destroys the approval request, and it is unnecessary: reorder achieves the scenario with zero data risk. Do not build deletion as the fix.
- Invitation data is never at risk from the recommended reorder: accept and pass paths are unchanged, and dismissal stays session-only.

## ACCESSIBILITY / UX FINDINGS

- Pending screen carries `role="status"`, reduced-motion guards, and the workspace name (prior polish). It correctly represents a pure pending state.
- It fails agency, not accessibility mechanics: a legitimate invited user has no control leading toward the invited workspace. Against the loading PRD, a waiting surface that blocks a known-available action without naming it is a guidance failure.
- Sign-Out-only escape is not acceptable where the PRD guarantees invitation precedence. The defect is architectural (gate order), not visual.

## CLASSIFICATION OF EACH FINDING

| Finding | Classification |
|---|---|
| Pending gate shadows loaded invitation (scenarios C, E, B-after-pass, F-unpicked) | CONFIRMED CURRENT DEFECT |
| Active members never load invitations; no invitee inbox exists (scenario D) | CONFIRMED CURRENT DEFECT |
| Auto-bootstrap ignores pending invitations | CONFIRMED CURRENT DEFECT (contributing cause) |
| PRD invitation-precedence clauses violated (three citations) | DOCUMENTATION GAP in code, not in PRD — code contradicts spec |
| No abandon/decline operation | COMPLIANT (matches PRD revoke-only model); becomes relevant only if reorder is rejected |
| Pending screen in isolation | COMPLIANT |
| Sign-out dialog copy | MINOR UX GAP (unchanged, out of scope) |
| Re-offer promise broken by trap | Consequence of the primary defect, not separate |

## SMALLEST SAFE ARCHITECTURAL / PRODUCT CORRECTION

Recommended, in order, no implementation in this task:

1. Gate reorder: evaluate non-dismissed pending invitation before pending workspace (`tenantGate.ts:184-188`). Accept creates membership and normal flow resumes; the pending auto-workspace stays pending, harmless under the one-per-creator index. Pass falls through to the existing pending branch. This satisfies PRD §8 precedence with zero schema, RPC, RLS, or deletion changes.
2. Invitation-aware bootstrap: skip auto-create while a valid pending invitation is loaded, so new invitees land on the invitation screen instead of manufacturing the coexistence state. Provider already loads the invite under the same zero-active condition; ordering care is the only subtlety — flagged for the coding task, not solved here.
3. Invitee visibility for active members (scenario D): backlog a lightweight invitation indicator or inbox surface. Do not piggyback on this fix; it needs product design.
4. Explicitly rejected: a Leave/Abandon/Delete workspace button (destructive, needs design and audit surface, unnecessary for the reported scenario); deleting pending rows by job or console; weakening gate holds; new loading architecture.

## ALTERNATIVES CONSIDERED AND REJECTED

- Option 1 alone (invitation UI on pending screen): viable but larger surface change than reorder; keep as fallback if reorder interacts badly with dismissal semantics.
- Option 2 (abandon pending workspace): rejected — destructive, no mechanism exists, unnecessary.
- Option 4 alone (approved-membership bypass): insufficient — the reported user holds zero memberships, so bypass helps nobody here. Useful only as companion for scenario F.
- Option 5 (new selection state): rejected — over-architecture; existing phases already express the needed states.
- Doing nothing: rejected — contradicts three PRD clauses and strands legitimate invitees with no self-service path.

## EXACT FILES INSPECTED

`src/pages/WorkspaceCreation.tsx`, `src/pages/WorkspacePendingApproval.tsx`, `src/pages/WorkspaceInvitation.tsx`, `src/pages/WorkspaceSelection.tsx`, `src/components/app/TenantGate.tsx`, `src/components/layout/WorkspaceSelectionSheet.tsx`, `src/lib/tenant/contexts.tsx`, `src/domain/tenant/tenantGate.ts`, `src/domain/tenant/tenantCreation.ts`, `src/hooks/useTeamInvitations.ts`, `src/pages/settings/AdminSettingsSection.tsx` (invitation surfaces only), `src/App.tsx` (routes only), `supabase/migrations/20260714000000_multi_tenancy_core.sql` (schema, indexes, cascades), `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql` (accept RPC), `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` (§8, §12.3–12.5), `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` (invitation lifecycle), `AGENTS.md`, `docs/PROJECTSKILLINDEX.md` (index only).

## EXACT FILES CHANGED

Report only: `docs/reports/multi-tenancy/workspace-pending-invitation-lifecycle-audit-2026-09-09.md` (this file).

## GIT STATUS BEFORE / AFTER

- Before: 1 modified onboarding HTML plus 2 untracked files from other agents; 2 untracked prior audit reports. All pre-existing, untouched.
- After: identical plus this one new report file. `git diff --stat` shows no source changes.

## FINAL VERDICT

CURRENT CORRECTNESS DEFECT FOUND
