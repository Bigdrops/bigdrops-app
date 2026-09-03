# Legacy Signup Approval Gate Reconciliation Report

This report was written by opencode (ox-alpha) on 2026-08-26 via Local Runner.

## Objective

Reconcile the legacy global signup approval mechanism with the
workspace-based multitenancy authorization architecture so invited users
reach the WorkspaceInvitation flow instead of a dead approval screen.

## Skills Used

react-useeffect, react-dev, supabase, supabase-postgres-best-practices

## Documentation Standard

ADS-STE100 Simplified Technical English

## 1. Location of the Legacy Gate

Single gate, frontend only:

- `src/App.tsx`: the `approved` computation
  (`profile?.is_approved === true || (!profile && ... 'within_window')`)
  plus the route branch that rendered `PendingApproval`.
- `src/pages/PendingApproval.tsx`: the "Access Restricted" screen.

The branch ran BEFORE `WorkspaceProvider` mounted, so no workspace,
invitation, entity, or permission logic ever executed for an unapproved
profile.

## 2. Files and Functions Involved

- `src/App.tsx` — route gate.
- `src/pages/PendingApproval.tsx` — blocked screen (deleted).
- `supabase/migrations/20260520090000_core_tables.sql` —
  `handle_new_user()` trigger inserts every new profile with
  `is_approved = false`, except two hardcoded legacy owner emails.
- Legacy RLS policies referencing `is_approved` on public tables:
  profiles update policy (core_tables), invoices (20260520090003),
  csrs (20260520090004), devices (20260520090006), receipts function
  (20260706000000), letters function (20260710000000).

## 3. Every Usage of profiles.is_approved (After Fix)

Frontend:

- `src/components/app/AppShell.tsx` — unused optional type field only.
- `src/lib/database.types.ts` — generated row types only.
- No executable gate remains.

Backend:

- `handle_new_user()` still seeds the column (false by default).
- Legacy RLS policies listed above remain on legacy public tables.
  Current business reads/writes flow through tenant-schema clients
  (`TenantClient`) or tenant RPCs, which bypass these policies.
  `receiptRepository`, `audit.ts`, dashboards, compliance, and document
  hooks all use `tenantClient`. The devices table policy affects only
  native device registration, not web authorization.

## 4. Is profiles.is_approved Necessary Anywhere?

No. It is not the source of truth for workspace access. Nothing sets it
to true anymore, so as a gate it was a permanent dead end. The column
and its legacy policies remain untouched in the database (no migration),
consistent with the constraint against blind removal.

## 5. Behavior Before

An invited user signed up, received `is_approved = false` from
`handle_new_user()`, signed in, and App.tsx rendered PendingApproval
forever. The invitation could never be reached because workspace
resolution sat behind the gate.

## 6. Behavior After

Authenticated users proceed directly into
WorkspaceProvider > EntityProvider > TenantGate > AppShell. TenantGate's
existing `resolveGatePhase()` owns every access decision:

| Case | Path |
|------|------|
| 1. Pending invitation | `pending-invitation` phase renders WorkspaceInvitation |
| 2. Acceptance | membership created via accept_workspace_invitation, then workspace/entity/permission resolution |
| 3. Existing member | normal workspace/entity resolution |
| 4. No membership | `create-workspace` onboarding state |
| 5. Email confirmation | unchanged, handled by Supabase Auth before any routing |
| 6. Workspace lifecycle | existing provisioning/blocked/unavailable phases preserved |
| 7. Device | confirmed NOT part of the web authorization path |

## 7. Invited User Signup to Access Flow

Signup creates auth user and profile (`is_approved=false`, now
irrelevant) > sign-in passes profile resolution > TenantGate detects
pending invitation by JWT email match > WorkspaceInvitation accepts via
`accept_workspace_invitation` > membership row exists > active entity
resolves > entity permissions authorize features.

## 8. Did WorkspaceInvitation.tsx Change?

No. The acceptance flow required no change.

## 9. Was Device Assignment Part of the Blocking Path?

No. The removed gate never checked devices. The PendingApproval copy
mentioned device setup misleadingly. Device assignment remains a native
(legacy Admin Panel era) feature guarded by its own RLS on the devices
table; it does not gate workspace access.

## 10. Does Backend Still Enforce Legacy Approval?

Only in dormant legacy artifacts: `handle_new_user()` seeding and old
public-table RLS policies. None of them sit on the live
authentication-to-workspace path. Removing them requires migrations and
is deferred.

## 11. Migration Required?

No. The bug was fully caused by the frontend gate. Constraint 22 upheld.

## 12. Files Modified

- `src/App.tsx` — gate, lazy import, debug payload, Profile field removed (net −10 lines).
- `src/pages/PendingApproval.tsx` — deleted (dead code, −151 lines).

No other files changed by this task. Concurrent public-to-tenant cutover
workstream files appear in git status but were not touched here.

## Verification Result

- `bun run audit:load`: passed, exit code 0. Findings identical to the
  pre-existing baseline (24 oversized / 6 broad selects / 1 component
  fetch / 3 heavy limits). File count dropped 784 to 783 due to the page
  deletion. Nothing new introduced.
- `bun run typecheck`: passed, no errors.
- `bun run build`: skipped due to hardware policy.
- Guard searches: zero executable `is_approved` gates; zero
  `apply_permission_template` calls (one comment); zero ADMIN_EMAILS;
  no new profiles enumeration; Team authorization untouched.

Pre-existing versus new findings: none new.

## Remaining Blockers / Preserved Legacy Behavior

- `handle_new_user()` still writes `is_approved=false` and legacy RLS
  still references it on dormant public tables. Cleanup is a future DB
  task, deliberately not done here.
- Profiles UPDATE policy still requires `is_approved=true`, so
  unapproved users cannot self-update `has_password`. Metadata-only;
  does not affect access.
- `resolveGatePhase` does not consult `workspace.status`
  (suspended/archived) beyond provisioning states; pre-existing
  behavior, out of scope.
