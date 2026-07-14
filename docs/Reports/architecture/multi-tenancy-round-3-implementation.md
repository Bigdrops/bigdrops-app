# Round 3 — Multi-Tenancy Core SQL Implementation (Phases 1 & 2)

This report was written by OpenCode on 2026-07-14 via Local Runner.

---

## 1. Objective & Scope

This report documents the Phase 1 and Phase 2 SQL migrations executed for the multi-tenancy authorization model, as specified in PRD v2.1 §3 and the Round 2 analysis report.

**Covered:**
- Phase 1 infrastructure: 7 public schema tables, 4 functions, indexes, RLS enablement.
- Phase 2 policies: per-action RLS policies for all 7 tables.
- Verification gate results (audit:load, typecheck, git status).
- Deferred work: Phase 3 (audit trail), Phase 4 (entity schema routing), Phase 5 (data migration).

**Explicitly excluded:**
- Frontend work: schema routing wrapper, EntityWorkspaceProvider, prefix config changes (Round 2 report §9).
- UI design for workspace switching.
- Build/CI pipeline changes.

---

## 2. Deliverables

| File | Phase | Lines | Description |
|------|-------|-------|-------------|
| `supabase/migrations/20260714000000_multi_tenancy_core.sql` | 1 | ~350 | 7 tables + 4 functions + indexes + RLS ENABLE + trigger |
| `supabase/migrations/20260714000001_multi_tenancy_rls.sql` | 2 | ~180 | Per-action RLS policies for all 7 tables |

---

## 3. Phase 1 — Infrastructure Tables

### 3.1 Tables Created

| Table | PK | Purpose |
|-------|----|---------|
| `workspaces` | `uuid` (gen_random_uuid) | Root tenant container — name, slug, status (pending/active/disabled), created_by, timestamps |
| `workspace_members` | `(workspace_id, user_id)` | Member roster — role (owner/admin/member/viewer), permissions[] via `has_entity_permission()` |
| `entity_permissions` | `(entity_id, user_id, resource, action)` | Explicit permission grants — wildcard support (`*`, `entity:*`, `resource:*`) |
| `permission_templates` | `uuid` | Named permission bundles — name, workspace_id, description |
| `permission_template_items` | `uuid` | Template rows — template_id, resource, action |
| `workspace_invitations` | `uuid` | Pending invitations — email, workspace_id, role, permissions, expires_at, token |
| `workspace_invitation_entity_grants` | `uuid` | Entity-scoped permissions bundled with invitations |

### 3.2 Indexes

- `idx_one_owner_per_workspace` — UNIQUE partial `WHERE role = 'owner'` on workspace_members. Prevents >1 owner per workspace.
- `idx_one_pending_workspace_per_creator` — UNIQUE partial `WHERE status = 'pending'` on workspaces. Prevents >1 pending workspace per creator.

### 3.3 Functions

| Function | SECURITY DEFINER | Purpose |
|----------|-----------------|---------|
| `has_entity_permission(user_id, entity_id, resource, action)` | No | Single EXISTS with 4 wildcard OR patterns — O(1) per call |
| `apply_permission_template(template_id, target_user_id, granted_by_user_id)` | Yes | Bulk-inserts permission_template_items as entity_permissions rows |
| `accept_workspace_invitation(token)` | Yes | Validates invitation, applies entity grants, inserts membership, marks accepted — uses `SELECT ... FOR UPDATE` to prevent double-accept |
| `approve_workspace(workspace_id)` | Yes | Sets workspace active, inserts creator as first `owner` with `["*"]` permissions in workspace_members — uses `ON CONFLICT DO NOTHING` for idempotency |

### 3.4 Design Decisions

- **`workspaces.created_by`** — Not in PRD v2.1 table DDL, but required by `idx_one_pending_workspace_per_creator`. Populated via existing `stamp_row_ownership()` trigger.
- **`entity_permissions.entity_id`** — No FK constraint. References rows in dynamic entity schemas (`entity_{workspace_slug}_{entity_slug}`), not a fixed table.
- **`entity_permissions` PK** — UNIQUE composite index `(entity_id, user_id, resource, action)` as surrogate. No separate unique constraint.
- **`permissions` column** — Uses `'[]'::jsonb` (array) per PRD v2.1, not `'{}'::jsonb` (object) from the Round 2 report draft.
- **`idx_one_owner_per_workspace`** — Table-level `UNIQUE(workspace_id, user_id)` handles the general constraint. Partial index adds the "one owner" business rule.
- **`approve_workspace()` idempotency** — Uses `ON CONFLICT DO NOTHING` on workspace_members insert. Prevents errors from retry during the approval callback.

### 3.5 Chicken-and-Egg Resolution

The `approve_workspace()` function is `SECURITY DEFINER`, bypassing RLS. This is necessary because:
1. User creates a `workspace` (INSERT policy allows authenticated users).
2. Workspace starts as `status = 'pending'` — no workspace_members exist yet.
3. Admin calls `approve_workspace()` via SECURITY DEFINER — inserts the creator as first `owner` in workspace_members.
4. After approval, workspace has an owner, and all subsequent RLS checks (Phase 2) resolve correctly via `workspace_members` membership.

The `accept_workspace_invitation()` function is similarly SECURITY DEFINER, because the invitee isn't yet a workspace member.

---

## 4. Phase 2 — RLS Policies

### 4.1 Design Principle

All policies follow the Round 2 report pattern: one policy per action per table. Naming convention: `{table}_select|insert|update|delete_{role_or_scope}`.

### 4.2 Policy Matrix

| Table | Read | Write |
|-------|------|-------|
| `workspaces` | Member OR creator (for pending) | Owner (UPDATE). INSERT: any authenticated user. |
| `workspace_members` | Self OR any member of same workspace | Owner (INSERT, UPDATE, DELETE) |
| `entity_permissions` | Self (user_id = auth.uid() OR granted_by = auth.uid()) | Direct INSERT/DELETE restricted — via SECURITY DEFINER functions only |
| `permission_templates` | Any workspace member | Owner |
| `permission_template_items` | Cascade: member of template's workspace | Owner |
| `workspace_invitations` | Member OR invitee (by email) | Owner |
| `workspace_invitation_entity_grants` | Cascade: member of invite's workspace | Owner |

### 4.3 Notable Detail

**`entity_permissions`** has no INSERT/UPDATE/DELETE policies. Direct table writes to entity_permissions by authenticated users are prohibited. All mutations go through SECURITY DEFINER functions (`apply_permission_template`, `accept_workspace_invitation`). This is intentional — `entity_id` references rows in dynamic entity schemas, so RLS cannot validate "this entity belongs to a workspace I own" without schema-aware joins.

---

## 5. Verification Gate

| Check | Result | Notes |
|-------|--------|-------|
| `bun run audit:load` | Pass | All pre-existing warnings (bloat, broad selects, component fetches) unchanged — no new issues introduced |
| `bun run typecheck` | Timeout (60s) | TypeScript check did not complete within timeout — pure SQL migration, no TS files modified |
| `git status` | Clean | Only 2 untracked migration files — no unintended modifications to existing files |

---

## 6. Deferred Work

### Phase 3 — Audit Trail Workspace Awareness
Depends on entity schema creation (Phase 5). The two-tier model (entity-local `entity_{xxx}.activity_events` + cross-entity `public.activity_events`) cannot be implemented until the entity schema creation system exists. The existing `public.activity_events` table with `scope_type` filtering continues to serve until then.

### Phase 4 — Entity Schema Component
The `entities` registry table (entity_id → workspace_id lookup) is planned but not yet created. This table will enable:
- Entity-scoped RLS on `entity_permissions` (currently the FK gap blocks this)
- Workspace-level entity management UI
- Permission grant validation at the workspace boundary

### Phase 5 — Data Migration
Entity schema creation, `INSERT INTO entity_{xxx} SELECT * FROM public.{table}` COPY scripts, and plumbing for existing documents (invoices, waybills, receipts, etc.) into their entity schemas.

### Frontend Work (Round 2 §9)
Schema routing wrapper in `src/supabase.ts`, `EntityWorkspaceProvider` React context, and prefix config changes — these are separate implementation tracks tracked in the Round 2 report but not executed in Round 3.

---

## 7. Risks & Limitations

1. **entity_permissions FK gap**: Without a foreign key from `entity_id` to a registry table, database-level referential integrity cannot be enforced. Application-layer validation must verify entity_id references a valid entity the user has access to.
2. **Self-referential workspace_members RLS**: The workspace_members INSERT check uses a self-join (`SELECT FROM workspace_members WHERE ...`). This works because the owner is already inserted by `approve_workspace()`, but the migration must ensure `approve_workspace()` is called before any member management.
3. **idx_one_owner_per_workspace fragility**: If a workspace needs zero owners (e.g., all owners leave), the partial index doesn't prevent it at the DB level. Application logic must prevent owner removal without replacement.
4. **No backward-compatibility layer**: Existing code that queries `public.invoices` directly without schema routing will continue working (those tables remain unchanged). However, new workspace-aware code must use the schema routing wrapper — there is no migration shim for old code paths.
