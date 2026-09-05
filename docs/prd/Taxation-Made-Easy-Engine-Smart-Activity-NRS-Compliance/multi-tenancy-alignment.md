# Multi-Tenancy Alignment & Tracking

> Purpose: Keep this PRD folder conscious of the multi-tenancy PRD and
> ensure the documents in this folder neither violate nor contradict it.
> Status: Active
> Last updated: 2026-09-05

---

## 1. Authority

| Item | Value |
|---|---|
| Authority document | `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` |
| Status | Active — single source of truth for tenancy architecture |
| Supporting | `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` (frontend/UI behavior) |
| Folder index | `docs/prd/multi-tenancy/Readme.md` |

## 2. Tenancy constraints this folder must respect

| Constraint | Source |
|---|---|
| Three boundaries stay distinct: Workspace = security, Entity = business, Schema = storage | v2.1 §2 |
| Authorization has two layers: workspace-level toggles and entity-level action-based permissions | v2.1 §3.1 |
| Entity permissions are (resource, action) pairs; non-CRUD actions (email, export, approve) are first-class | v2.1 §3.3 |
| Entity lifecycle: active → archived → purging → purged; archived entities are not active | v2.1 §8A |
| All document data is entity-scoped; cross-entity access is forbidden | v2.1 §2, §5 |
| Frontend behavior defers to erp-frontend-prd-v1.5.md where it implements v2.1 | multi-tenancy/Readme.md |

## 3. Alignment status of documents in this folder

| Document | Status | Notes |
|---|---|---|
| Technical-plan-v1.1.md | Aligned | WHT rate selection driven by the tenant/entity's type — consistent with entity-scoped permissions. |
| Files-tax-monthly-v1.md | Aligned | One document per tenant; all figures drawn from tenant-scoped records. |
| Record-capture-v1.md | Aligned | Extends `tax_input_entries`, an entity-scoped table. |
| Record-engagement-plan-v1.md | Aligned | Engagement data scoped to workspace and entity; AI features permission-gated per v2.1 §3. |
| ai-integration.md | Aligned — verify at implementation | Gateway keys per workspace; edge-function proxy must enforce scope server-side. |
| NRS-docs/ | N/A | Statutory reference material, not tenancy-scoped. |
| Refrences/ | N/A | External reference material. |

## 4. Contradiction rules

1. If a document in this folder would require cross-entity data access,
   the tenancy PRD wins; the requirement must be re-scoped.
2. If a document implies a user can perform an action they do not hold
   permission for, the tenancy permission model wins.
3. Statutory rules in NRS-docs/ remain authority for tax content; the
   tenancy PRD governs who can access what.

## 5. Tracking log

| Date | Change | Checked by |
|---|---|---|
| 2026-09-05 | Created. Initial alignment pass over the folder. | Buffy |

## 6. Change log

| Date | Change |
|---|---|
| 2026-09-05 | Created. |