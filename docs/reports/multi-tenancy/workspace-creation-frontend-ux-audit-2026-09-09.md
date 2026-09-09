# Workspace Creation Frontend UX Audit

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Audit Workspace Creation as its own lifecycle against implementation and PRDs.
- Scope: Creation UI, membership, approval, readiness, switching, restart, errors, mobile, accessibility, engagement.
- Files changed: NONE except this report. Zero implementation changes.
- Skills used: supabase, react-dev, vercel-react-best-practices.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: NONE.
- Verification result: All claims cite file + line. No runtime reproduction. No data touched.
- Risks or limitations: UI behavior verified by code read, not by running the app.
- Deferred work: Implementation belongs to a future coding task.

---

## EXECUTIVE FINDING

Workspace Creation is correctly represented and is NOT equivalent to Company Creation. Creation is a single synchronous row insert landing in `pending_approval`. The creator gets NO membership until external approval. The UI never claims usability early: auto-bootstrap shows a wait state, manual submit only refreshes, and the gate routes to a dedicated pending-approval screen with 5-second auto-refresh. No premature-release defect exists here. Remaining items are minor UX polish, not correctness defects.

## CONFIRMED FACTS

1. Entry point is `src/pages/WorkspaceCreation.tsx:15` (gate `create-workspace` phase, `TenantGate.tsx:95`).
2. Creation is a direct `workspaces` INSERT via `createWorkspace()` (`tenantCreation.ts:41-50`). No RPC. No provisioning. No queue. Synchronous.
3. New rows land in `pending_approval` by DB default. RLS insert policy is permissive (`20260714000001:16-17`), but `created_by` is trigger-stamped to `auth.uid()` (`20260714000000:91`, trigger body `20260520090000:49-50`).
4. Creator membership is NOT created at insert. The owner row appears only through external `approve_workspace()`. No in-app caller of `approve_workspace` exists (only type defs).
5. `ensureInitialWorkspace()` never writes membership and never activates (`tenantCreation.ts:484-488,557-571`).
6. After creation the UI only refreshes providers (`WorkspaceCreation.tsx:45,72`). No success toast exists on this path.
7. Pending state is DB-persisted (`created_by` + `status` query, `contexts.tsx:110-123`) and survives restart.
8. Approval flips automatically via 5-second poll (`WorkspacePendingApproval.tsx:24-27`).
9. The switcher lists active workspaces only (`WorkspaceSelectionSheet.tsx:88,124`); pending never appears there.
10. No workspace archive, delete, or suspend UI exists in the app. Only ownership transfer (`AdminSettingsSection.tsx:239`).
11. No workspace-specific PRD file exists in the repository.

## OBSERVED WORKSPACE CREATION LIFECYCLE

| Stage | Implementation | Sync/async | Blocks user | Persisted | Survives restart |
|---|---|---|---|---|---|
| Form validation | Empty-name check (`WorkspaceCreation.tsx:64-67`) | sync | yes | no | n/a |
| Creation request | `createWorkspace()` INSERT (`tenantCreation.ts:41-50`) | async, one round trip | yes (button disabled, `:168`) | DB row | yes |
| Workspace record | `status=pending_approval`, `created_by` stamped | sync in insert | — | yes | yes |
| Membership | NONE created; owner row only via external approval | n/a | — | on approval | yes |
| Creator state | Non-member requester; visible only via `created_by` read | — | — | row | yes |
| Approval | External Platform Office; no in-app action | human timescale | yes (gate holds) | membership row | yes |
| UI refresh | `workspaceCtx.refresh()` | async | no | no | re-runs |
| Gate routing | `pendingWorkspace` → `pending-approval` phase | reactive | yes | derived | re-derived |
| Usable screen | Only after active membership → `create-company` | reactive | yes | derived | re-derived |

Conceptual mapping: CREATING (button spinner/auto wait) → CREATED (row exists) → MEMBERSHIP: none → PENDING APPROVAL (dedicated screen) → APPROVED (membership row) → USABLE (company flow). No invented states.

## MEMBERSHIP & APPROVAL LIFECYCLE

- Membership lifecycle: none → (external approval) → `owner` row. No invite path creates workspace membership except `accept_workspace_invitation` for invited users.
- Approval lifecycle: `pending_approval` → `active` (external only) → entities become creatable. No rejection/suspension UI in-app.
- Pending approval is intentional product state per PRD §9 and frontend v1.4 decisions, not an error. UI treats it as waiting (amber, clock icon), never red.
- Stale pending rows are impossible by construction: partial unique index `one_pending_workspace_per_creator` (`20260714000000:129`) plus race-converge re-read (`tenantCreation.ts:613-637`).

## READINESS ANALYSIS

Workspace "ready" = active membership row on an `active` workspace. All four conditions (record exists, membership exists, membership active, context available) derive from one provider resolve (`contexts.tsx:106-200`). The UI cannot release the user early: gate phases order pending → approval-page → membership → company flow, and the switcher only lists active memberships. No readiness gate is missing. Permission toggles are irrelevant pre-membership (no member row exists to hold them).

## LOADING UX AUDIT

Classification: **Level 1 for the manual form, transitional hold for auto-bootstrap. NOT Level 5.** Evidence: the operation is one synchronous INSERT completing in ~1 round trip; no schema cloning, no queue, no polling for completion. Level 5 (which names company provisioning explicitly) does not apply.

- Manual form: `ButtonLoading` spinner + `disabled={loading}` (`:166-176`) — Level 1 compliant. Duplicate-submit protected twice (disabled + auto `autoAttemptedRef` guard `:33`).
- Auto-bootstrap wait card: spinner + "Setting up your workspace… / This usually takes a few seconds." (`:133-143`). Honest, no fake progress, no tips (correct — tips prohibited below Level 4).
- Pending-approval screen: waiting surface (not an operation surface), 5s auto-refresh stated on screen (`:78-80`), sign-out escape with background-continues dialog. Reduced-motion respected (`:52-54`).
- Gaps (minor): no `role="status"`/`aria-live` on wait states; copy says "few seconds" for auto step that can last through approval polling (slight understatement, though the pending screen corrects it).

## PENDING APPROVAL UX AUDIT

- Communicated as waiting, visually distinct from failure (amber clock vs red error). States what happens next (admin approval → company creation) and cadence ("usually takes a few minutes", "refreshes automatically").
- User is blocked from the new workspace but NOT blocked from others: gate routes by membership, so existing active workspaces remain selectable.
- Creator sees the pending state on every sign-in (DB query, not cache). Status updates automatically via poll.
- Gaps (minor): screen does not show the pending workspace NAME (it is available as `pendingWorkspace.name`); no approval notification exists (requires email/push infrastructure — none in scope); sign-out dialog copy mentions unsaved work where none can exist.

## WORKSPACE SWITCHING AUDIT

- New workspace does NOT auto-activate: no membership exists, so it cannot appear in the switcher. Correct.
- In-app sheet lists `activeWorkspaces` only and hides itself for ≤1 (`:88`). Gate-level page handles multi-workspace choice with explicit session-only copy (`WorkspaceSelection.tsx:32-35`).
- Selection is a session ref (`contexts.tsx` provider), never localStorage. No stale cache possible across restart. Navigation preserves selection within session; refresh re-derives.

## RESTART/RECOVERY AUDIT

- Creator closes before approval → reopen → pending query restores → pending screen. Verified path (`contexts.tsx:110-123` + gate).
- Creator closes after approval → membership row exists → normal company flow.
- Restart cannot show pending as active: activation derives solely from the membership join (`:138-156`).
- No recovery operation is needed (nothing async is outstanding — creation was synchronous). The 5s poll resumes automatically.

## ERROR HANDLING AUDIT

- Failure surfaces: inline red box with raw `String(e.message)` (`:160-164`); auto-path failure falls back to the manual form (`:48-49`).
- No stuck states: `finally` resets loading (`:75-77`); unmount guarded (`:40-47`).
- No success-after-partial-failure: manual path shows no success at all; auto path shows no success state either.
- Gap (minor): raw Supabase errors surface verbatim (e.g. duplicate-slug unique violation, RLS denial). No user-friendly mapping. No `role="alert"` on the error box.

## MOBILE-FIRST UX AUDIT

- Layout: centered `max-w-md` card, `p-6` — adapts to phone and desktop. No bottom-sheet pattern (page, not modal — appropriate).
- Touch: `h-12` buttons/inputs (48px, meets 44px rule). Segmented Create/Join buttons are `py-2` (~36px) — below the 44px minimum (minor).
- Keyboard: `text-base` inputs (no iOS zoom). No autofocus (good). No keyboard-avoidance handling beyond native scroll (acceptable for a 3-field card).
- Safe areas: no `env(safe-area-inset-*)` on these screens (minor; content is centered, low risk).
- Back button: no modal to trap; browser back is safe (form state is local, nothing to lose except typed name).
- Foldable/tablet/desktop: centered card scales; no panel variant needed at this simplicity.

## ACCESSIBILITY AUDIT

- Labels associated (`htmlFor`, `:147-156`). Heading hierarchy present. Visible text accompanies spinners.
- Gaps (minor): spinner `aria-hidden` with no `role="status"` parent; error box lacks `role="alert"`/`aria-live`; segmented control lacks `role="tablist"` semantics; pending screen has no live region for the approval transition (a screen-reader user waits in silence until the route changes).

## ENGAGEMENT SYSTEM AUDIT

- No guidance surfaces appear on creation/pending screens. Correct: active form editing suppresses intrusive guidance; pending is a blocking-status case where status must dominate.
- Session-scoped guidance state is unaffected (nothing resets it here). No second loading system proposed or needed.
- If future tip content targets first-run onboarding, the pending screen is eligible real estate (waiting surface, no status competition once copy stabilises) — flagged as opportunity, not gap.

## PRD CROSS-CHECK

| Requirement | Verdict | Evidence |
|---|---|---|
| Tenancy §9: approve → route to create-first-company | Compliant | Gate `pending-approval` → membership → `create-company` |
| Frontend v1.4: Create\|Join choice; invite-only join; auto-detect invites | Compliant | `WorkspaceCreation:104-132`; no join-code path; `contexts:161-188` |
| Approval by Platform Office only | Compliant | Zero in-app approve callers |
| Ownership via members table | Compliant | Owner row only from approval |
| Loading L1 rules (disabled control, no tips, no overlay) | Compliant | `:166-176`; no tips; no overlay |
| Loading L5 for provisioning | Not applicable | Workspace creation has no provisioning |
| Engagement: status over guidance | Compliant | Pure status screens |
| Company success snackbar (Loading Ex.8) | N/A to workspace | No success state exists here at all |

No contradictions between PRD sources on workspace creation. One documentation gap: no PRD text describes the workspace creation/pending screens (tenancy PRD covers data + approval; loading PRD covers levels). The behavior is compliant but underspecified.

## GAPS & SEVERITY

| # | Gap | Severity | Evidence |
|---|---|---|---|
| 1 | Pending screen omits workspace name | P3 polish | `WorkspacePendingApproval:69-81` vs `pendingWorkspace.name` available |
| 2 | Raw Supabase error strings on creation failure | P3 | `WorkspaceCreation:48,74,161` |
| 3 | No `role="status"`/`aria-live` on wait + error states | P3 a11y | Both pages |
| 4 | Segmented Create/Join below 44px touch target | P3 | `:111`, `py-2` |
| 5 | No safe-area insets | P3 | All three screens |
| 6 | No approval notification path | P2 (needs infra) | Poll-only updates |
| 7 | PRD has no workspace-creation UX section | P3 docs | No workspace PRD file; §9 silent on screens |

No P0. No P1. Nothing correctness-blocking.

## RECOMMENDED PRD/BACKLOG ADDITIONS

1. Tenancy PRD (new §9.x or §8A.10-style block): workspace creation UX expectations — auto-bootstrap, pending screen copy, 5s refresh, name display, failure fallback. P3 docs.
2. Backlog P2: approval notification (email/push) design + infra dependency.
3. Backlog P3: pending-screen name display; friendly creation-error mapping; `role="status"`/`aria-live` additions; segmented control touch target; safe-area insets.
4. No loading-level change. No architecture change. No new system.

## IMPLEMENTATION DEFERRED

All items above. No code, migration, config, or data change in this task.

## UNRESOLVED QUESTIONS/BLOCKERS

1. Who sends approval notifications (Platform Office manual vs automated) — product + infra decision.
2. Whether duplicate-name slug collisions should get friendly copy (unique-violation path untested live).
3. Whether a rejected/suspended workspace state needs UI (PRD lists `suspended`/`archived` statuses; no in-app surface observed).
4. None block current usability. No blockers to shipping workspace creation as-is.
