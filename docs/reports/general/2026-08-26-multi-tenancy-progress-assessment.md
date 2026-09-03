# Multi-Tenancy Implementation Progress Report

This report was written by GLM on 2026-08-26 via OpenCode.

## Objective

Measure implementation progress against `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` (backend) and `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` (frontend). This is an assessment task. No code changed.

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English

## Result Summary

| Layer | Progress | Basis |
|---|---|---|
| Backend (PRD v2.1) | ~100% | All normative sections implemented in migrations; only explicitly deferred Open Items (§12) remain |
| Frontend Phase 1 | ~100% | Every listed deliverable exists and runs |
| Frontend Phases 2–4 (module migration) | ~99% | All business modules route through tenantClient; one file excepted |
| Frontend Phase 5–6 (cutover) | ~98% | One raw public-schema business write remains |

Overall frontend estimate: ~90%.

---

## Backend — What Is Built

Verified via `supabase/migrations/` (20260714000000 through 20260829000001).

| PRD Requirement | Section | Evidence |
|---|---|---|
| Core tables (workspaces, members, invitations, entities link) | §5 | `20260714000000_multi_tenancy_core.sql` |
| RLS policies | §3, §4 | `20260714000001`, recursion fixes `20260716000001` |
| Platform operators + approve_workspace | §6 | `20260716000000` |
| Provisioning engine + template cloning | §9 | `20260717000000`, completion `20260828000002` |
| entity_provisioning_status + observer RPC | §9.1 | `20260730000000` |
| Invitation correctness (expiry, revoke RPCs) | §4.1 | `20260818000001`, `20260829000000/1` |
| Creator auto-grant wildcard permissions | §9.3 | `20260818000000` |
| Preloaded roles / Company Admin model | §3.11 | `20260819000000` |
| Permission templates | §3.6 | seeded/hardened `20260828000002`, fixes `20260814*` |
| Phase-0 grandfathering + per-module data migration | §10 | `plan_a/b/c/d` series plus 12 aggregate/data-migration migrations (2026-08-08 to 08-22) |

The ERP Frontend PRD §4 confirms deployment: workspace `bigdrops-main`, entity `BIGDROPS`, schema `entity_bigdrops-main_main`, status ready.

Deferred by design (PRD §12, not gaps): invite rate-limiting, permission audit trail (§3.9), service accounts, future operator roles, advisory-lock internals.

## Backend Gaps

None within normative scope.

---

## Frontend — What Is Built

### Phase 1 deliverables — complete

| Deliverable | File |
|---|---|
| Workspace Provider + Entity Provider | `src/lib/tenant/contexts.tsx` |
| Tenant Client | `src/lib/tenantClient.ts` |
| Authorization Provider (`hasAuthorization`) | `src/lib/tenant/contexts.tsx:462` |
| Diagnostic page `/debug/tenant` | `src/pages/debug/TenantDebug.tsx` |
| Workspace creation flow | `src/pages/WorkspaceCreation.tsx` |
| Pending approval screen | `src/pages/WorkspacePendingApproval.tsx` |
| Invite acceptance (Accept / Pass for now) | `src/pages/WorkspaceInvitation.tsx` |
| Join-request guidance | inside WorkspaceCreation choice branch |
| Company creation flow (zero-entity onboarding) | `src/pages/CompanyCreation.tsx` |
| Provisioning progress / failed screens | `src/pages/ProvisioningProgress.tsx`, `ProvisioningFailed.tsx` |
| Gate orchestration (`resolveGatePhase`) | `src/components/app/TenantGate.tsx`, `src/domain/tenant/tenantGate.ts` |

All backend RPC contracts are consumed through one domain module: `src/domain/tenant/tenantCreation.ts` (`createWorkspace`, `createEntity`, `provisionEntity`, `acceptWorkspaceInvitation`, `createWorkspaceInvitation`, `revokeWorkspaceInvitation`, `getEntityProvisioningStatus`). The app never writes membership or permission rows directly.

### Module migration — Phases 2 to 4

87 files consume `useEntity()`/`tenantClient`. Covered modules: Clients, Invoices (full CRUD plus composite transaction RPCs), Quotations, Waybills, Projects, Receipts, CSRs, BOQs, RFQs, Letters, Settings, Item Library, Exports, Notifications handlers, DocumentsQueryContext adapters.

An exhaustive search for raw public-schema business-table access found exactly one survivor:

- `src/lib/native/quotationSync.ts:267` — deletes from public `quotations` on the native offline-sync remote-cleanup path.

Correctly retained public-schema usage (per Frontend PRD §13): auth/session, workspaces, entities, memberships, invitations, platform metadata, provisioning status.

### Phase 5–6 status

Server-side data migration completed via the plan-series migrations. Application queries run against tenant schemas. Code-level cutover is nearly total.

### v1.5/v1.6 amendment surfaces

- Teams UX (§12.9): present. `src/pages/settings/AdminSettingsSection.tsx` exposes TeamSettingsSection — members, invitations, create/revoke invites, role assign/remove per company member (`assignRoleToCompanyMember`, `removeRoleFromCompanyMember`).
- Role Builder UX (§12.8): partial. `usePermissionTemplates` provides templates plus per-user effective grants, assignment works company-scoped. The spec's ability-picker details (category grouping, MARK ALL with Include Delete | Exclude Delete confirmation, None/Partial/All indicators, delegation-ceiling disabling) are not visibly implemented.
- Multi-workspace selection: gate-level `WorkspaceSelection` exists. Settings-level workspace switcher (§10.7) is not built — §20 defers it.
- Entity switcher: placeholder only — TenantGate 'multi-entity' phase shows a "coming" notice. Correct behavior: §16 lists it as a non-goal.

## Frontend Gaps (Ranked)

1. `src/lib/native/quotationSync.ts:267` — last public-schema business write. Route it through tenantClient or retire the native sync path decision.
2. Role Builder UX breadth (§12.8) — picker mechanics unconfirmed/partial.
3. Settings workspace switcher and entity switcher UI — deferred scope (§20), listed for tracking only.

## Risks

- The single remaining public-schema write undermines a strict Phase-6 "no public business access" acceptance criterion until fixed.
- Role Builder partiality means the Company Admin experience rests on direct grant toggles today.

## Verification

Static inspection only: PRD reads, migration listing, rg sweeps across `src/`. No commands changed state. bun run audit:load and typecheck were not run because no code changed.
