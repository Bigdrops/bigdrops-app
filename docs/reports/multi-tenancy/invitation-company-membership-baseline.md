# Invitation Company Membership Baseline Report

This report was written by opencode (ox-alpha) on 2026-08-26 via Local Runner.

## Objective

Fix production error `User is not a member of this company`
(err_1787718465611_nf7s7a) when a workspace owner assigns a company role
to a freshly invited member, without weakening the existing role model.

## Skills Used

react-useeffect, react-dev, supabase, supabase-postgres-best-practices

## Documentation Standard

ADS-STE100 Simplified Technical English

## 1. Exact Root Cause — VERIFIED

`create_workspace_invitation()` (latest definition,
20260818000001_multi_tenancy_invitation_correctness.sql lines 39-83)
never writes to `workspace_invitation_entity_grants`. Invitations created
from Team Management therefore carry ZERO entity grants.

`accept_workspace_invitation()` (same file, lines 168-208) inserts
`workspace_members` and then copies grants from
`workspace_invitation_entity_grants`. With an empty set, the copy is a
no-op. The new member ends with a workspace_members row and zero
entity_permissions rows.

`assign_role_to_company_member()`
(20260819000000_preloaded_roles_and_assignment.sql lines 220-228)
requires the target to hold at least one `entity_permissions` row on the
entity as the company-membership signal and raises exactly
'User is not a member of this company'. The failure is therefore
structural: workspace membership was created, company membership was not.

## 2. Acceptance Behavior Before the Fix — VERIFIED

accept_workspace_invitation:
- locks the pending, unexpired invitation FOR UPDATE;
- verifies JWT email match (lowercased);
- INSERTs workspace_members (role + permissions payload from invite);
- INSERTs entity_permissions SELECT FROM workspace_invitation_entity_grants
  JOIN entities ON same workspace (empty for Team invites -> no rows);
- marks the invitation accepted.

Duplicate acceptance safe (status/expiry filter under lock). Entity
validation via JOIN filter plus creation-time guard trigger.

## 3. Why workspace_members Alone Was Insufficient — VERIFIED

The architecture distinguishes the two memberships deliberately:
- workspace_members = who belongs to the workspace;
- entity_permissions = who belongs to / can act inside a specific company.

The assignment RPC treats "at least one entity_permissions row" as proof
of genuine company membership. Its own comment names the two intended
grant sources: creator seed and invitation acceptance. Team invitations
silently used neither.

## 4. How Company Membership Is Represented — VERIFIED

Company membership IS entity_permissions rows for that entity. There is
no separate membership table and no role column. The canonical grant
sources are `_prov_seed_default_permissions()` (creator) and the grants
copy inside `accept_workspace_invitation()`.

## 5. Canonical Fix Selected — FIXED

Extend the existing SECURITY DEFINER invitation path rather than invent
a mechanism:

Migration `20260829000000_invitation_company_membership_baseline.sql`
re-creates `create_workspace_invitation` with one new optional parameter
`p_entity_id uuid DEFAULT NULL`:

- caller authorization unchanged (owner OR invite_members toggle);
- email lowercasing and default expiry unchanged;
- explicit pre-check that the entity belongs to p_workspace_id;
- after creating the invite, inserts ONE baseline grant
  (`('*', 'view')`) into workspace_invitation_entity_grants,
  idempotent via the existing UNIQUE index;
- the existing cross-workspace guard trigger validates the insert again
  at the table boundary;
- NULL p_entity_id preserves previous behavior byte-for-byte.

Baseline choice rationale: view-only access to the explicitly invited
company is the minimum genuine membership that satisfies the assignment
RPC's signal without granting write abilities or '*'-action powers. It
mirrors the seeded Viewer template's scope.

Frontend wiring:
- `src/domain/tenant/tenantCreation.ts`: createWorkspaceInvitation input
  gains optional entityId, passed as p_entity_id only when present.
- `src/pages/settings/AdminSettingsSection.tsx`: handleInvite passes the
  active entity id (`entityId ?? undefined`). No other UI change; no
  direct writes anywhere.

NOT done, deliberately: no backfill for invitations already pending at
migration time — they carry no entity grant and their owners should
revoke and re-send them from Team Management. A generic backfill would
have to guess the target entity per workspace.

## 6. Files Modified

- `supabase/migrations/20260829000000_invitation_company_membership_baseline.sql` — NEW.
- `src/domain/tenant/tenantCreation.ts` — optional entityId param (+7/-1).
- `src/pages/settings/AdminSettingsSection.tsx` — pass active entity on invite (1 line).

No unrelated files touched. No legacy profiles.is_approved behavior
modified.

## 7. Why Authorization Is Not Weakened

- The membership check inside assign_role_to_company_member is untouched;
  it still demands a real entity_permissions row.
- The new grant flows exclusively through the canonical SECURITY DEFINER
  chain (create -> guarded grants table -> accept). The frontend cannot
  manufacture it: only authorized inviters reach the INSERT, the guard
  trigger rejects cross-workspace entities, and RLS on
  workspace_invitation_entity_grants/entity_permissions remains
  write-free for clients.
- Baseline is ('*', 'view') only: read-only. No '*' action, no delete,
  no automatic Company Admin.
- Delegation ceiling, owner check, duplicate-acceptance lock, and
  revocation rules are all unchanged.

## 8. Flow After the Fix

INVITE MEMBER (active entity attached)
> workspace_invitations row + one baseline entity grant
> user signs up > accepts via accept_workspace_invitation
> workspace_members row AND entity_permissions ('*','view') row
> owner opens Team > assigns Company Admin or any template
> assign_role_to_company_member passes the membership check and applies
> effective access reflects real granted abilities.

## Verification Results

Static verification performed; runtime verification requires deploying
the migration (see limitations).

- `bun run audit:load`: passed, exit 0; findings identical to baseline
  (24 oversized / 6 broad selects / 1 component fetch / 3 heavy limits);
  nothing new introduced.
- `bun run typecheck`: passed, no errors (also caught and fixed a stray
  brace during editing).
- `git status` / `git diff --stat`: my delta is exactly the three files
  above.
- Repository searches: zero executable apply_permission_template calls
  (one doc comment); zero frontend INSERT/UPDATE/DELETE on
  entity_permissions; invitation RPC called only through the domain
  wrapper.

Case matrix by SQL inspection:

| Case | Result |
|------|--------|
| 1 Existing member | assign succeeds (unchanged) — VERIFIED |
| 2 Newly invited member | membership grant seeded at acceptance; assignment proceeds — FIXED (code), runtime PENDING deploy |
| 3 Member without company row | still rejected — VERIFIED unchanged |
| 4 Cross-workspace entity | rejected by pre-check + trigger + acceptance JOIN — VERIFIED preserved |
| 5 Non-owner/delegation | ceiling untouched — VERIFIED |
| 6 Self-management | UI block untouched — VERIFIED |

Per the honesty rule, successful end-to-end runtime behavior is NOT
claimed because the migration has not been applied yet.

## Remaining Limitations

- DEPLOYED 2026-08-26: both migrations applied to the hosted database via
  `supabase db push`. Live verification via `to_regprocedure`: the
  superseded 5-arg overload returned NULL and only the new 6-arg form
  remains; PostgREST schema cache reloaded with `NOTIFY pgrst`.
  Deployment catch: CREATE OR REPLACE with an added parameter had created
  a second overload instead of replacing, so migration 20260829000001
  drops the stale 5-arg form that would have silently kept the bug alive.
  The full human flow (signup > accept > assign) is exercised in the
  product, not by this session.
- PRE-EXISTING: pending invitations created before this migration lack
  entity grants; revoke and re-invite them (for example the existing
  jaiyewizzy@gmail.com invitation).
- PRE-EXISTING: remove_role_from_company_member blind-deletes overlapping
  pairs; removing a Viewer-assigned member can strip the baseline
  ('*','view') row too. Grant-source tracking remains deferred.
