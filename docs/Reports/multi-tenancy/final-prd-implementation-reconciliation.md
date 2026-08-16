# Final PRD Implementation Reconciliation Report

This report was written by deepseek-v4-flash-free on 2026-08-16 via opencode.

## 1. Executive Summary

This report reconciles the multi-tenancy implementation against three PRDs. The PRDs are the backend PRD v2.1, the frontend PRD v1.5 content, and the Platform Office PRD v1.3.

The audit inspected 15 multi-tenancy areas. Each area received one classification.

| Classification | Count |
|---|---|
| A. Compliant | 8 |
| B. Contradiction | 1 |
| C. Weaker | 4 |
| D. Missing | 1 |
| E. Ambiguous | 1 |
| Total | 15 |

The implementation is largely conformant. The core boundaries hold: RLS enforces authorization, the Tenant Client only routes, approval does not provision, and admin authority never equals business permissions.

One contradiction exists in the invitation RLS email source. Four areas are weaker than the PRD. One required feature is missing: the Pass for now action. One area is deliberately deferred by the PRD itself.

The report recommends fixes. It does not implement them. The project lead decides the order and the timing.

## 2. Verification Method and Scope

This audit was read-only. No application code, migration, RPC, RLS policy, schema, or PRD was modified.

The verification used static source inspection only. It did not run a database, Docker, or a local Supabase instance. It did not run `bun run build`.

The audit compared source files against three baselines:

- Backend PRD v2.1: `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`
- Frontend PRD v1.5 content: `docs/prd/multi-tenancy/erp-frontend-prd-v1.4.md`
- Platform Office PRD v1.3: `docs/prd/Platform-god/platform-office-prd.md`
- Tenancy illustration: `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`

Items that require a running system were marked as not runtime-verifiable in this audit.

## 3. Classification Definitions

| Class | Definition |
|---|---|
| A. Compliant | The implementation matches the PRD requirement. |
| B. Contradiction | The implementation does the opposite of an explicit PRD rule. |
| C. Weaker | The requirement is met, but with a reduced or incomplete form. |
| D. Missing | A PRD-required capability is absent. |
| E. Ambiguous | The PRD deliberately leaves the design open, or the intent is unclear. |

## 4. Audit Area Results

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
| 11 | Public schema versus tenant boundary | B. Contradiction |
| 12 | Creator automatic permission grant | C. Weaker |
| 13 | Workspace lifecycle and provisioning | A. Compliant |
| 14 | Platform Office boundary | A. Compliant |
| 15 | Frontend tenancy state | C. Weaker |

## 5. Findings: Contradictions

### CON-01: Invitation RLS policy reads the email from `auth.users`, not from the JWT

- PRD requirement: Backend PRD v2.1 section 4 states that all RLS and RPC logic reads the invitee email from `auth.jwt() ->> 'email'`. It explicitly forbids `auth.email()`.
- Actual implementation: The RLS policy `workspace_invitations_select_member` uses `email = (SELECT email FROM auth.users WHERE id = auth.uid())`. This equals `auth.email()`.
- File: `supabase/migrations/20260714000001_multi_tenancy_rls.sql` line 179.
- Why it matters: The accept RPC reads the JWT email correctly. The select policy reads a different source. In normal sessions the two values match. The PRD explicitly requires one source.
- Severity: Low. The two sources agree in practice.
- Correction direction: Change the policy to use `email = auth.jwt() ->> 'email'`.

## 6. Findings: Weaker

### WEA-01: Multi-workspace membership is not selectable

- PRD requirement: Multi-workspace membership is allowed. Exactly one workspace is active per session.
- Actual implementation: The database allows multiple memberships. The frontend sets `workspace = null` when the member count is zero or greater than one. `TenantGateInput` has no `workspaceCount` field. `resolveGatePhase` routes a multi-workspace user to `create-workspace`.
- Files: `src/domain/tenant/tenantGate.ts` lines 43-94, `src/lib/tenant/contexts.tsx` lines 100-160.
- Why it matters: A user with two workspaces sees the create-workspace screen. The app does not select one workspace. It does not offer a selector.
- Severity: Medium.
- Correction direction: Add workspace selection. Treat the multi-workspace case separately from the no-workspace case.

### WEA-02: The Join a Workspace path is absent

- PRD requirement: A fresh user without membership or invite chooses Create or Join. Joining is invitation-based only. There are no codes.
- Actual implementation: `WorkspaceCreation.tsx` offers Create only. No Join branch exists. A search for the string Join in `src` found only the waybill line join and the text Joined.
- Files: `src/pages/WorkspaceCreation.tsx`, `src/domain/tenant/tenantGate.ts`.
- Why it matters: The create and pending-invite states work. The join state exists only as invitation auto-detection. The join screen, which guides the user to contact an admin, is absent.
- Severity: Medium.
- Correction direction: Add the Join branch to onboarding. It shows guidance only. It does not accept codes.

### WEA-03: A service-role provisioning path can reach ready with no permissioned users

- PRD requirement: No ready entity has zero permissioned users.
- Actual implementation: The wildcard seed is transactional and runs before the ready step for authenticated callers. The seed is guarded by `IF auth.uid() IS NOT NULL`. A `service_role` caller skips the seed and can reach ready with zero grants.
- Files: `supabase/migrations/20260809020000_invoice_aggregate_permissions.sql`, `supabase/migrations/20260809060000_invoice_financials_tenant_view.sql`.
- Why it matters: The Platform Office never provisions. The normal path is authenticated. The service-role path is a residual risk.
- Severity: Low.
- Correction direction: Guard the ready transition on the presence of at least one permission grant.

### WEA-04: Frontend authorization checks are not used in production pages

- PRD requirement: The frontend uses `hasAuthorization` at the page or action level.
- Actual implementation: `hasAuthorization` exists and is wired through the AuthorizationProvider. It is consumed only in `src/pages/debug/TenantDebug.tsx`. Production pages do not call it.
- Files: `src/lib/tenant/contexts.tsx` lines 366-398, `src/pages/debug/TenantDebug.tsx`.
- Why it matters: The RLS layer remains the final authority. The frontend does not hide or disable actions that the user cannot perform.
- Severity: Low. RLS is authoritative.
- Correction direction: Apply `hasAuthorization` to production actions as later work.

## 7. Findings: Missing

### MIS-01: Pass for now

- PRD requirement: The invitation screen offers Accept and Pass for now. Pass is a session action. It is not a state. It does not reject or revoke. The invite may be re-offered.
- Actual implementation: `src/pages/WorkspaceInvitation.tsx` offers Accept and Sign Out only.
- Why it matters: The user cannot defer an invitation within a session.
- Severity: Medium.
- Correction direction: Add a Pass for now button. Keep the invitation pending. Do not persist the pass. No RPC is required. The action is frontend-only.

## 8. Findings: Ambiguous

### AMB-01: Two-level administration

- PRD requirement: Backend PRD v2.1 section 3.11 states the final representation of two-level administration is not settled. It is a reconciliation-phase question.
- Actual implementation: The implementation has workspace owner and member roles, a permissions jsonb field, and entity permissions. There is no separate Company or Entity Admin representation.
- Why it matters: The implementation matches the owner-versus-member model. It does not match a two-level admin model because the PRD does not require one yet.
- Severity: None. The PRD defers this area.
- Correction direction: Decide the representation in the reconciliation phase. Do not implement a new tier before the decision.

## 9. Already-Compliant Work

The following areas match the PRD. No change is required.

- A-03 Invitation auto-detection: The workspace provider queries pending invitations only when the member count is zero. It filters on status and expiration. RLS restricts the query to the caller email.
- A-05 Invitation lifecycle: The accept RPC requires status pending and a valid expiration. It locks the row. It raises on mismatch. The owner can set revoked and expiration. The status check constraint is server-enforced.
- A-07 Authority ceiling: Invitation, member, and template actions require the owner role. Business permissions never imply admin authority.
- A-08 Admin versus business permissions: Permissions are deny-by-default, entity-scoped, action-based, and RLS-enforced. Direct writes go through SECURITY DEFINER functions. No business access uses roles.
- A-09 Entity and company scope: Entities belong to workspaces. Each entity has an active flag and a permission table. Each entity owns a tenant schema.
- A-10 Tenant routing: TenantGate, the workspace provider, the entity provider, and the tenant client resolve the active context and schema.
- A-13 Workspace lifecycle: `approve_workspace` only activates the workspace and inserts the owner member. It never provisions. This matches the PRD lines 75 and 161.
- A-14 Platform Office boundary: `approve_workspace` requires the platform operator owner role. The console reads provisioning status only. It never touches entity data.

## 10. Cross-Cutting Verification

The audit checked the following cross-cutting invariants:

- Approval does not provision. Verified in `20260716000000_multi_tenancy_platform_operators.sql`.
- The Platform Office never provisions. Verified in the same file.
- RLS is the final authorization authority. Verified in the RLS migration and the permission templates.
- The Tenant Client routes only. Verified in `src/lib/tenant/tenantClient.ts`.
- Admin authority never equals business permissions. Verified in the permission templates and the entity permission policy.
- The creator wildcard grant is part of provisioning. Verified in the provisioning functions.

## 11. PRD Conformance Gaps Summary

| Gap | Area | Class |
|---|---|---|
| Invitation RLS reads `auth.email()` instead of the JWT email | 11 | B |
| Multi-workspace users routed to create-workspace | 1 | C |
| No Join a Workspace branch | 2 | C |
| Service-role provisioning can skip the creator grant | 12 | C |
| Frontend authorization not used in production pages | 15 | C |
| Pass for now absent | 4 | D |
| Two-level admin representation open | 6 | E |

## 12. Runtime Verification Notes

The following items were not runtime-verifiable in this audit:

- The daily auto-void job for expired invitations. The audit found no `pg_cron` schedule in the migrations. Accept-time enforcement blocks expired invites regardless.
- Live RLS behavior with multiple users.
- Live provisioning with a real Supabase instance.

These items require a running system. The project lead must verify them separately.

## 13. Risks and Limitations

- Static inspection only. No database or build was run.
- The two seed files share the timestamp `20260818000000`. Both are idempotent and end in the same state. The duplication is a maintenance risk, not a runtime risk.
- The legacy entity `entity_bigdrops-main` backfill is Plan C and has not run.
- The audit cannot prove runtime behavior. It can only prove static conformance.

## 14. Required Next Steps

The report orders the fixes by priority. It does not implement them.

### P1

- CON-01: Align the invitation RLS select policy with the JWT email source.
- MIS-01: Add Pass for now to the invitation screen.
- WEA-01: Route multi-workspace users to a workspace selection state.
- WEA-02: Add the Join a Workspace branch.

### P2

- WEA-03: Guard the ready transition on at least one permission grant.
- WEA-04: Apply `hasAuthorization` to production actions.
- Clean up the duplicate seed timestamp.

### P3

- AMB-01: Decide two-level administration in the reconciliation phase.
- Verify or add the daily auto-void job.

## 15. Deferred Work

The following work is deferred by decision, not by audit limitation:

- Plan C legacy entity backfill.
- Two-level administration representation.
- Workspace switching across sessions.
- Multi-entity selection.

## 16. Baseline Alignment Table

| Baseline | Path | Status |
|---|---|---|
| Backend PRD v2.1 | `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` | Audited |
| Frontend PRD v1.5 content | `docs/prd/multi-tenancy/erp-frontend-prd-v1.4.md` | Audited |
| Platform Office PRD v1.3 | `docs/prd/Platform-god/platform-office-prd.md` | Audited |
| Tenancy illustration | `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html` | Audited |

## 17. File and Line Reference Index

| File | Reference |
|---|---|
| `src/domain/tenant/tenantGate.ts` | `TenantGatePhase` lines 29-41, `TenantGateInput` lines 43-53, `resolveGatePhase` lines 62-94 |
| `src/components/app/TenantGate.tsx` | Phase to page mapping lines 67-121 |
| `src/lib/tenant/contexts.tsx` | WorkspaceProvider lines 100-160, pending invitation query, AuthorizationProvider lines 366-398 |
| `src/pages/WorkspaceCreation.tsx` | Create-only onboarding |
| `src/pages/WorkspaceInvitation.tsx` | Accept and Sign Out only |
| `src/pages/debug/TenantDebug.tsx` | Only `hasAuthorization` consumer |
| `supabase/migrations/20260714000000_multi_tenancy_core.sql` | `has_entity_permission` lines 158-171, `accept_workspace_invitation` lines 192-231, JWT email check line 214 |
| `supabase/migrations/20260714000001_multi_tenancy_rls.sql` | Invitation select policy line 179, entity permission policy line 101, template policies lines 108-132 and 160-168 |
| `supabase/migrations/20260716000000_multi_tenancy_platform_operators.sql` | `approve_workspace` lines 110-139 |
| `supabase/migrations/20260809020000_invoice_aggregate_permissions.sql` | Provisioning step 8.7, creator seed guard |
| `supabase/migrations/20260809060000_invoice_financials_tenant_view.sql` | Provisioning and ready transition |
| `supabase/migrations/20260818000000_creator_wildcard_permission_seed.sql` | Wildcard seed |
| `supabase/migrations/20260818000000_seed_wildcard_creator_permission.sql` | Duplicate timestamp seed |
| `supabase/migrations/20260817000000_plan_c_live_entity_backfill.sql` | Plan C backfill, not run |
| `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` | Section 3.11 lines 368-430, section 4 lines 426-429 and 435, section 9.3 lines 689-702 |

## 18. Skills Used and Documentation Standard

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

## 19. Final Decision Note

This report is read-only. The audit made no changes to the repository.

The findings are recommendations. The project lead decides which fixes to apply and when. The staged `prd-implementation-reconciliation.md` belongs to another workstream. This report does not modify it.

Verification:
- bun run audit:load: skipped, not part of the read-only audit
- bun run typecheck: skipped, no code changes
- git status: not run, no repository changes made
- bun run build: skipped due to hardware policy and read-only scope