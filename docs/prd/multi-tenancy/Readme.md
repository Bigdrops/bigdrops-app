# Multi-Tenancy PRD Directory

> **Status:** Active
>
> This directory contains the product requirements documents (PRDs) for the BIGDROPS multi-tenancy architecture.

---

## Files

| File | Purpose | Status |
|---|---|---|
| `multi-tenancy-prd-v2.1.md` | **Authoritative.** Current multi-tenancy architecture spec: workspace lifecycle, entity lifecycle (§8A), permission model (§3), roles/teams (§3.11), RLS policies (§6), onboarding (§7–§9), migration (§10), success criteria (§13), open items (§12). | Active — single source of truth |
| `erp-frontend-prd-v1.5.md` | ERP frontend PRD v1.6. Workspace/company UI expectations, entity switcher, onboarding flows, role editor, permission matrix, invitation lifecycle. References v2.1 §8A for entity lifecycle. | Active |
| `multi-tenancy-prd-v2.md` | Previous version (v2.0). Superseded by v2.1 for all normative content. Retained for historical reference only. | Superseded |
| `multi-tenancy-prd.md` | Original v1 PRD. Superseded. | Superseded |
| `Waterfall-roadmap.md` | Phase-level waterfall roadmap for tenancy rollout. | Reference |
| `three-prd-tenancy-illustration.html` | Visual illustration of registry/permissions model across the three PRDs. | Reference |

---

## Document Hierarchy

```
multi-tenancy-prd-v2.1.md          ← Authority (all tenancy decisions flow from here)
  ├─ erp-frontend-prd-v1.5.md      ← Frontend implementation spec (references v2.1 §8A, §3, §5)
  ├─ Waterfall-roadmap.md           ← Rollout schedule
  └─ three-prd-tenancy-illustration.html  ← Visual aid
```

Rules:
- `multi-tenancy-prd-v2.1.md` is the single source of truth for tenancy architecture.
- `erp-frontend-prd-v1.5.md` is authoritative for frontend/UI behavior. Where it conflicts with v2.1, v2.1 wins.
- Superseded documents (`multi-tenancy-prd-v2.md`, `multi-tenancy-prd.md`) are retained for historical context only.

---

## Key Sections in v2.1

| Section | Topic |
|---|---|
| §3 | Permission model (action-based, not CRUD) |
| §3.11 | Roles & administration model |
| §5 | Workspace and entity table definitions |
| §6 | RLS policies |
| §7–§9 | Onboarding, workspace deletion, entity provisioning |
| **§8A** | **Entity lifecycle (active → archived → purging → purged)** |
| §10 | Phase 0 migration (grandfathering) |
| §12 | Open items |
| §13 | Success criteria |

---

## Update Log

| Date | Change | Author |
|---|---|---|
| 2026-09-05 | Added §8A (Entity Lifecycle) — active/archived/purging/purged states, archive/restore/purge workflows, 30-day retention, hard-delete policy, permissions, workspace interaction, provisioning interaction, PostgREST interaction, audit requirements, UI expectations, open questions. Updated §13 success criteria, §14 amendments table. | Internal |
| 2026-08-17 | Roles & administration model resolved: roles are editable ability bundles; Workspace Admin and Company Admin preloaded; no separate authority layer. §3.11, §12, §13 updated. | Product decision |
| 2026-08-09 | Invitation lifecycle formalized (§4, §12.5). Pass-for-now clarified (§12.3). | Frontend PRD v1.5 |
| 2026-08-04 | Two-level admin model added (§12.6, §3.11). | Frontend PRD v1.5 |
| 2026-07-17 | v2.1 initial. Owner model, roles/teams, workspace deletion, open items. | Internal |
| 2026-07-14 | v2.0 written. Permission model, RLS, entity provisioning. | Internal |
