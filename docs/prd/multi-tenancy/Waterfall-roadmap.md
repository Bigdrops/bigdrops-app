# 🏗️ WATERFALL ROADMAP [EXECUTION SEQUENCE]

> ✅ **STATUS: IN EXECUTION**
>
> PRD v2.1 and ERP frontend PRD v1.5 are signed off. This document is the single source of truth for tenancy rollout order.
> Authority: `multi-tenancy-prd-v2.1.md` (tenancy decisions), `erp-frontend-prd-v1.5.md` (UI behavior).
>
> *Owner:* Platform engineering (multi-tenancy track)

---

## 📊 MASTER PROGRESS BAR
`[████████░░] 80%` | **Total Milestones:** 8 | **Current Phase:** M8

---

## ✅ STATUS LEGEND (The "Ticks")
- ✅ **IMPLEMENTED** – Plan executed & active.
- 🔄 **IMPROVED** – Plan executed, then enhanced/optimized.
- 🛠️ **CORRECTED** – Plan executed, but had to be patched/fixed.
- ⏭️ **SUPERSEDED** – Plan executed, then replaced by a newer approach (link the new doc/plan).
- ⛔ **PENDING** – Not started.

---

## 🎯 MILESTONE TRACKER

| ID | Milestone / Phase | Priority | Status | % Complete | Last Updated |
|----|-------------------|----------|--------|------------|--------------|
| M1 | PRD & architecture sign-off (v2.1 + frontend v1.5) | HIGH | ✅ IMPLEMENTED | 100% | 2026-08-17 |
| M2 | Core tenancy schema, RLS, provisioning engine (live) | CRIT | ✅ IMPLEMENTED | 100% | 2026-09-05 |
| M3 | Workspace lifecycle: approval, invitations, ownership | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-05 |
| M4 | Entity lifecycle §8A: archive / restore / purge (live) | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-05 |
| M5 | First-user bootstrap: auto workspace + auto company | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-05 |
| M6 | Manual creation + workspace/company switching intact | HIGH | ✅ IMPLEMENTED | 100% | 2026-09-05 |
| M7 | Production recovery: `entities.status` mismatch repaired | CRIT | 🛠️ CORRECTED | 100% | 2026-09-05 |
| M8 | Hardening & deferred verification | MED | ⛔ PENDING | 0% | N/A |

---

## 📝 EXECUTION STEPS (The Ordered Plan)
**Step order is binding. Each step depends on the previous one.**

### Phase 1: Spec (M1)
- [x] **Step 1:** Sign off multi-tenancy PRD v2.1 (permission model §3, roles §3.11, RLS §6, onboarding §7–§9, migration §10).
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** Sign off ERP frontend PRD v1.5 (workspace/company UI, entity switcher, invitation lifecycle; references v2.1 §8A).
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** Resolve roles model (editable ability bundles; Workspace Admin ceiling; Company Admin company-scoped).
  - *Status:* ✅ IMPLEMENTED

### Phase 2: Backend (M2–M4)
- [x] **Step 1:** Apply core tenancy migrations (workspaces, members, entities, permissions, invitations) with RLS.
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** Ship provisioning engine (`provision_entity`) with tenant-neutral schema clone and PostgREST exposure step.
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** Ship workspace management gaps (`transfer_workspace_ownership`, template uniqueness, operator hierarchy) — applied live as `20260905010000`.
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 4:** Ship entity lifecycle §8A (`status`, `archived_at`, archive/restore/purge RPCs, audit table, delete policy) — applied live as `20260905020000`.
  - *Status:* ✅ IMPLEMENTED

### Phase 3: Bootstrap & onboarding (M5–M6)
- [x] **Step 1:** Implement idempotent first-company bootstrap (`ensureInitialCompany`) reusing `createEntity`/`provisionEntity`.
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 2:** Implement approval-preserving first-workspace bootstrap (`ensureInitialWorkspace`) reusing the insert path; pending workspaces stay pending.
  - *Status:* ✅ IMPLEMENTED
- [x] **Step 3:** Keep manual workspace/company creation, switching, archive/restore, and invitation flows unchanged.
  - *Status:* ✅ IMPLEMENTED

### Phase 4: Recovery & hardening (M7–M8)
- [x] **Step 1:** Repair production `entities.status` mismatch (reorder + push `20260905020000`; verify 7/7 rows active).
  - *Status:* 🛠️ CORRECTED
- [ ] **Step 2:** Fix pre-existing `tenantGate` `multi-entity` test expectation.
  - *Status:* ⛔ PENDING
- [ ] **Step 3:** Run live provisioning test in a safe non-production environment.
  - *Status:* ⛔ PENDING

---

## 📌 CHANGELOG / LOG OF DECISIONS

| Date | Action Taken | Status Applied | Reason / Note |
|------|--------------|----------------|---------------|
| 2026-07-14 | v2.0 written (workspace layer, CRUD permissions) | ✅ IMPLEMENTED | Superseded by v2.1 |
| 2026-07-17 | v2.1 initial (owner model, roles/teams, deletion, open items) | ✅ IMPLEMENTED | Architecture baseline |
| 2026-08-16 | Invitation lifecycle + two-level admin formalized; approval stays with Platform Office | ✅ IMPLEMENTED | App never calls `approve_workspace` |
| 2026-08-17 | Roles resolved as editable ability bundles (§3.11) | ✅ IMPLEMENTED | No separate authority layer |
| 2026-09-05 | §8A entity lifecycle added (archive/restore/purge, 30-day retention) | ✅ IMPLEMENTED | PRD amendment |
| 2026-09-05 | Migrations `20260905010000` + `20260905020000` applied to Main; 7/7 entities active | ✅ IMPLEMENTED | Verified live via catalog probes |
| 2026-09-05 | First-company + first-workspace bootstrap implemented (idempotent, approval-preserving) | ✅ IMPLEMENTED | Reuses existing primitives only |
| 2026-09-05 | Production `entities.status` failure repaired (migration reorder + push) | 🛠️ CORRECTED | Ordering defect in unapplied file; rolled back cleanly, then fixed |
