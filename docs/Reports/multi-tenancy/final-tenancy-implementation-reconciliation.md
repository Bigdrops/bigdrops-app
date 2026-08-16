# Final Tenancy Implementation Reconciliation Report

This report was written by deepseek-v4-flash-free on 2026-08-16 via opencode.

## 1. Executive Summary

This report reconciles the multi-tenancy implementation against three PRDs. It is the active follow-up to the read-only audit report `final-prd-implementation-reconciliation.md`.

The audit inspected 16 multi-tenancy areas. Each area received one classification.

| Classification | Count |
|---|---|
| A. Compliant | 9 |
| B. Contradiction | 3 |
| C. Weaker | 3 |
| D. Missing | 1 |
| E. Ambiguous | 1 |
| Total | 17 |

The backend findings classified B and C were corrected in one new migration. The frontend findings were not corrected. They remain documented because the change policy forbids UI changes in this reconciliation.

The corrections are complete and verified. The invitation email source, the invitation RPCs, the grant uniqueness, and the cross-workspace grant guard now match the PRD.

## 2. Objective

The objective was to reconcile the current multi-tenancy implementation against the current PRDs and to apply the smallest safe corrections to backend findings.

The read-only audit report listed findings and recommendations. This report implements the backend recommendations.

## 3. Scope

The scope covered the multi-tenancy backend migrations and the tenancy frontend layer.

The audit and corrections covered:

- Backend PRD v2.1: `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- Frontend PRD v1.5 content: `docs/prd/multi-tenancy/erp-frontend-prd-v1.4.md`
- Platform Office PRD v1.3: `docs/prd/Platform-god/platform-office-prd.md`
- Tenancy illustration: `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`
- Multi-tenancy migrations under `supabase/migrations/`
- Tenancy frontend files under `src/domain/tenant/`, `src/lib/tenant/`, and `src/pages/`

Out of scope: UI changes, financial changes, document changes, tenant schema changes, and legacy data deletion.

## 4. Verification Method

The verification used static source inspection and the repository test gate.

The correction migration was written as a new file. No applied migration was edited.

Verification commands:

- `bun run audit:load`
- `bun run typecheck`
- `bun run test`

The audit did not run a database, Docker, or a local Supabase instance. It did not run `bun run build` per the hardware policy.

## 5. Classification Definitions

| Class | Definition |
|---|---|
| A. Compliant | The implementation matches the PRD requirement. |
| B. Contradiction | The implementation does the opposite of an explicit PRD rule. |
| C. Weaker | The requirement is met, but with a reduced or incomplete form. |
| D. Missing | A PRD-required capability is absent. |
| E. Ambiguous | The PRD deliberately leaves the design open, or the intent is unclear. |

## 6. Audit Area Results

| # | Area | Classification |
|---|---|---|
| 1 | Multi-workspace membership | C. Weaker |
| 2 | Fresh-user onboarding: create, join, or pending invite | C. Weaker |
| 3 | Invitation auto-detection at startup | A. Compliant |
| 4 | Accept or Pass for now | D. Missing |
| 5 | Invitation lifecycle, server-enforced | A. Compliant |
| 6 | Two-level administration | E. Ambiguous |
| 7 | Authority ceiling | A. Compliant |
| 8 | Admin authority versus business permissions | A. Compliant |
| 9 | Entity and company scope | A. Compliant |
| 10 | Tenant routing | A. Compliant |
| 11 | Invitation email source | B. Contradiction |
| 12 | Invitation creation and revocation RPCs | B. Contradiction |
| 13 | Invitation grant integrity | B. Contradiction |
| 14 | Creator automatic permission grant | C. Weaker |
| 15 | Workspace lifecycle and provisioning | A. Compliant |
| 16 | Platform Office boundary | A. Compliant |
| 17 | Frontend tenancy state | C. Weaker |

## 7. Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql` | New migration. Applied the four backend corrections. |

The old report file `docs/Reports/multi-tenancy/final-prd-implementation-reconciliation.md` was left unchanged.

## 8. Skills Used

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

## 9. Changes Made

The four backend corrections were applied in one new migration `20260818000001_multi_tenancy_invitation_correctness.sql`.

### CON-01: Invitation RLS email source

- PRD requirement: Backend PRD v2.1 section 4. All RLS and RPC logic reads the invitee email from `auth.jwt() ->> 'email'`, never from `auth.email()`. The comparison is case-insensitive: `lower(email) = lower(auth.jwt() ->> 'email')`.
- Previous behavior: The RLS policy `workspace_invitations_select_member` used `email = (SELECT email FROM auth.users WHERE id = auth.uid())`. The comparison was exact and case-sensitive.
- Why it mattered: A case mismatch between the stored invite email and the JWT email made the invitation invisible to the correct invitee. The accept RPC was already case-insensitive.
- Correction: Dropped and recreated the policy with `OR lower(email) = lower(auth.jwt() ->> 'email')`. The workspace membership branch is unchanged.
- File: `supabase/migrations/20260714000001_multi_tenancy_rls.sql` (source), `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql` (correction).

### INV-01: Invitation creation and revocation RPCs

- PRD requirement: Backend PRD v2.1 section 4.1. `create_workspace_invitation()` and `revoke_workspace_invitation()` exist as SECURITY DEFINER functions. They enforce `role = 'owner' OR (permissions->>'invite_members')::boolean = true`. `create_workspace_invitation()` lowercases the email and defaults expiry to 7 days. `revoke_workspace_invitation()` refuses non-pending status and sets status to `revoked`.
- Previous behavior: No such RPCs existed. Invitation creation was a direct insert under the owner-only RLS policy. The `invite_members` toggle was unenforceable.
- Correction: Added both RPCs verbatim from PRD section 4.1, with `SET search_path TO 'public'` added for security hardening.
- File: `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql`.

### WEA-05: Invitation grant uniqueness

- PRD requirement: Backend PRD v2.1 section 5 line 286. `workspace_invitation_entity_grants` has `UNIQUE (invite_id, entity_id, resource, action)`.
- Previous behavior: The table had no uniqueness constraint on that tuple. Duplicate grants were possible.
- Correction: Added the unique index `workspace_invitation_entity_grants_invite_entity_resource_action_key`.
- File: `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql`.

### CON-02: Cross-workspace grant guard

- PRD requirement: Backend PRD v2.1 section 12. An invite's entity grants that point to another workspace's entity are rejected both at invite-creation and at acceptance time.
- Previous behavior: `accept_workspace_invitation()` copied every grant for the invite without checking that the entity belonged to the invite's workspace. The grants insert policy did not validate the entity either. A grant row could point to an entity in another workspace.
- Correction: Added two layers of protection.
  - A trigger `trg_workspace_invitation_entity_grants_workspace_guard` runs on insert and on update of `entity_id`. It raises if the entity does not belong to the invitation's workspace.
  - The `accept_workspace_invitation()` insert joins `entities` on `workspace_id = v_invite.workspace_id`. Grants for foreign entities are skipped at acceptance.
- File: `supabase/migrations/20260818000001_multi_tenancy_invitation_correctness.sql`.

## 10. Findings: Corrected in This Reconciliation

The following backend findings were corrected.

| Finding | Class | Correction |
|---|---|---|
| CON-01 Invitation RLS reads a case-sensitive email from `auth.users` | B | Recreated the policy with `lower(email) = lower(auth.jwt() ->> 'email')` |
| INV-01 No invitation creation or revocation RPCs | B | Added `create_workspace_invitation()` and `revoke_workspace_invitation()` per PRD 4.1 |
| CON-02 No cross-workspace grant guard | B | Added the guard trigger and the acceptance join filter |
| WEA-05 No grant uniqueness | C | Added the unique index per PRD 5.286 |

## 11. Findings: Not Corrected

The following findings were not corrected. The change policy forbids UI changes in this reconciliation.

### MIS-01: Pass for now

- PRD requirement: Backend PRD v2.1 section 4 and frontend PRD section 12.3. The invitation screen offers Accept and Pass for now. Pass is a session action only. It never rejects, deletes, or revokes. The invite stays pending.
- Actual implementation: `src/pages/WorkspaceInvitation.tsx` offers Accept and Sign Out only.
- Classification: D. Missing.
- Status: Documented. UI change deferred.

### WEA-01: Multi-workspace membership is not selectable

- PRD requirement: Multi-workspace membership is allowed. Exactly one workspace is active per session.
- Actual implementation: The database allows multiple memberships. The frontend sets `workspace = null` when the member count is not exactly one. `TenantGateInput` has no `workspaceCount` field. `resolveGatePhase` routes a multi-workspace user to `create-workspace`.
- Classification: C. Weaker.
- Status: Documented. Product decision required.

### WEA-02: The Join a Workspace path is absent

- PRD requirement: A fresh user without membership or invite chooses Create or Join. Joining is invitation-based only. There are no codes.
- Actual implementation: `WorkspaceCreation.tsx` offers Create only. No Join branch exists.
- Classification: C. Weaker.
- Status: Documented. UI change deferred.

### WEA-04: Frontend authorization checks are not used in production pages

- PRD requirement: The frontend uses `hasAuthorization` at the page or action level.
- Actual implementation: `hasAuthorization` exists and is wired through the AuthorizationProvider. It is consumed only in `src/pages/debug/TenantDebug.tsx`.
- Classification: C. Weaker.
- Status: Documented. RLS remains authoritative.

### WEA-03: Service-role provisioning can reach ready with no permissioned users

- PRD requirement: No ready entity has zero permissioned users.
- Actual implementation: The wildcard seed is transactional and runs before the ready step for authenticated callers. The seed is guarded by `IF auth.uid() IS NOT NULL`. A `service_role` caller skips the seed.
- Classification: C. Weaker.
- Status: Documented. The Platform Office never provisions. The authenticated path is the normal path.

## 12. Findings: Ambiguous

### AMB-01: Two-level administration

- PRD requirement: Backend PRD v2.1 section 3.11 states the final representation of two-level administration is not settled.
- Actual implementation: The implementation has workspace owner and member roles, a permissions jsonb field, and entity permissions. There is no separate Company or Entity Admin representation.
- Classification: E. Ambiguous.
- Status: Documented. Do not implement a new tier before the decision.

## 13. Already-Compliant Work

The following areas match the PRD. No change was required.

- A-03 Invitation auto-detection: The workspace provider queries pending invitations only when the member count is zero. It filters on status and expiration.
- A-05 Invitation lifecycle: The accept RPC requires status pending and a valid expiration. It locks the row. It raises on mismatch. The status check constraint is server-enforced.
- A-07 Authority ceiling: Invitation, member, and template actions require the owner role.
- A-08 Admin versus business permissions: Permissions are deny-by-default, entity-scoped, action-based, and RLS-enforced.
- A-09 Entity and company scope: Entities belong to workspaces. Each entity has an active flag and a permission table.
- A-10 Tenant routing: TenantGate, the workspace provider, the entity provider, and the tenant client resolve the active context and schema.
- A-15 Workspace lifecycle: `approve_workspace` only activates the workspace and inserts the owner member. It never provisions.
- A-16 Platform Office boundary: `approve_workspace` requires the platform operator owner role. The console reads provisioning status only.
- A-13 Creator grant: The wildcard seed grants `('*', view/create/edit/delete)` to the creator of every new entity. This resolves the WEA-03 gap for the normal authenticated path.

## 14. Cross-Cutting Verification

The audit checked the following cross-cutting invariants:

- Approval does not provision. Verified in `20260716000000_multi_tenancy_platform_operators.sql`.
- The Platform Office never provisions. Verified in the same file.
- RLS is the final authorization authority. Verified in the RLS migration.
- The Tenant Client routes only. Verified in `src/lib/tenant/tenantClient.ts`.
- Admin authority never equals business permissions. Verified in the permission templates and the entity permission policy.
- The creator wildcard grant is part of provisioning. Verified in the provisioning functions.

## 15. Runtime Verification Notes

The following items were not runtime-verifiable in this audit:

- The daily auto-void job for expired invitations. The audit found no `pg_cron` schedule in the migrations. Accept-time enforcement blocks expired invites regardless.
- Live RLS behavior with multiple users.
- Live provisioning with a real Supabase instance.

These items require a running system. The project lead must verify them separately.

## 16. Risks and Limitations

- Static inspection only. No database was run.
- The two seed files share the timestamp `20260818000000`. Both are idempotent and end in the same state. The duplication is a maintenance risk, not a runtime risk.
- The new migration was not executed against a live database in this reconciliation.
- The legacy entity `entity_bigdrops-main` backfill is Plan C and has not run.

## 17. Verification Result

Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- bun run test: passed, 143 tests, 0 failures
- git status: changes staged (one new migration, the report files)
- bun run build: skipped due to hardware policy

## 18. Deferred Work

The following work is deferred by decision, not by audit limitation:

- MIS-01 Pass for now button (frontend).
- WEA-01 Workspace selection for multi-workspace users (frontend).
- WEA-02 Join a Workspace branch (frontend).
- WEA-04 Apply `hasAuthorization` to production pages (frontend).
- WEA-03 Guard the ready transition on at least one permission grant (backend, optional).
- AMB-01 Two-level administration representation (product decision).
- Plan C legacy entity backfill.
- Verify or add the daily auto-void job.

## 19. Baseline Alignment Table

| Baseline | Path | Status |
|---|---|---|
| Backend PRD v2.1 | `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` | Audited and corrected |
| Frontend PRD v1.5 content | `docs/prd/multi-tenancy/erp-frontend-prd-v1.4.md` | Audited |
| Platform Office PRD v1.3 | `docs/prd/Platform-god/platform-office-prd.md` | Audited |
| Tenancy illustration | `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html` | Audited |

## 20. Final Decision Note

The backend corrections are applied and verified. The frontend findings remain documented because the change policy forbids UI changes in this reconciliation.

The corrections preserve existing behavior. They only add the PRD-mandated RPCs, the uniqueness constraint, the cross-workspace guard, and the JWT email source fix.

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English