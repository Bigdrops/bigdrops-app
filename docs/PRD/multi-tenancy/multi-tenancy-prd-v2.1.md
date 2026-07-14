BIGDROPS Multi-Tenancy — Architecture & Migration PRD (v2.1)

Type: Architecture Specification / Migration Plan
Status: Draft
Version: 2.1
Date: 2026-07-14
Supersedes: v2.0
Repository path: docs/PRD/multi-tenancy-prd.md

---

## 0. What Changed From v2.0

v2.0 introduced the Workspace layer and a first-pass CRUD permission model
(`can_view/can_create/can_edit/can_delete`). v2.1 replaces that with an
action-based authorization model that scales past CRUD (approve, post, email,
export, reverse, archive...), formalizes permission templates as pure UI
convenience with zero footprint in the authorization engine, removes a
source-of-truth duplication (`workspaces.owner_id`), fixes an RLS correctness
issue in the Lobby, and converts workspace deletion to soft-delete with an
explicit purge workflow.

Design principle, stated explicitly for the first time and binding on all
future features:

> **Permissions are explicit. Templates are conveniences. Roles are labels.**
> The authorization engine evaluates only explicit permission records.
> Templates exist solely to accelerate permission assignment and are expanded
> into concrete permission rows when applied. Role names are user-defined
> labels for collections of permissions and carry no intrinsic meaning within
> the authorization engine.

---

## 1. Purpose & Problem Statement

Unchanged from v2.0 — see Section 1 of the prior version. This document's scope
is the tenancy hierarchy (Platform → Workspace → Entity → Schema) and the
authorization model layered on top of it. Company-level data isolation via
schema-per-entity (Postgres schemas, `search_path` avoidance in favor of
`supabase.schema()`, Tenant View Wrapper migration) is defined in v1.0 and
unaffected by this revision.

---

## 2. Tenancy Hierarchy

```
Platform (BIGDROPS)
│
├── Platform Owner            — approves/suspends workspace existence only
│
├── Workspace: "Mr C's Agency"
│     ├── workspace_members          — owner | member (+ permission toggles)
│     ├── workspace_invitations
│     ├── permission_templates       — workspace-owned, no reserved names
│     └── Entities (companies), each an isolated Postgres schema
│
├── Workspace: "Some Other Agency"
│     └── ... entirely separate pool, zero visibility into the above
```

Three boundaries, kept conceptually distinct (do not let future features blur
these):

- **Workspace** determines *who* can access data (the security boundary)
- **Entity** determines *which company* data belongs to (the business boundary)
- **Schema** determines *where* data is physically isolated (the storage boundary)

---

## 3. Authorization Model

This chapter is the single canonical reference for "who can do what." It
consolidates workspace membership, entity permissions, templates, invite
grants, and the resolution algorithm — previously scattered across v2.0.

### 3.1 Two independent layers

1. **Workspace-level permissions** — govern the workspace itself (inviting,
   revoking, assigning permissions, creating/archiving entities, billing,
   deleting the workspace). Toggle-based, held on `workspace_members`.
2. **Entity-level permissions** — govern access to a specific company's
   documents (invoices, waybills, quotations, etc.). Action-based, held on
   `entity_permissions`. A user's entity permissions are independent per
   entity — Jane can have full invoice control in Acme and read-only in Beta.

### 3.2 Workspace roles

Exactly two hard-coded `role` values — everything else is a toggle:

| Role | Meaning |
|---|---|
| **owner** | All workspace powers, always, including `delete_workspace`. Exactly one per workspace (enforced by unique index). Non-revocable except via explicit ownership transfer. |
| **member** | Powers entirely determined by `workspace_members.permissions` jsonb toggles (`invite_members`, `revoke_members`, `assign_permissions`, `create_entity`, `archive_entity`, `manage_billing`, ...). A member can be granted every toggle except `delete_workspace` — this is how a "P.A. with near-total power" is expressed, with no new fixed role required. |

### 3.3 Entity permissions — action-based, not CRUD

```sql
CREATE TABLE public.entity_permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   uuid NOT NULL REFERENCES public.entities(id),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    resource    text NOT NULL,      -- 'invoice','waybill','quotation','payment','project','*', ...
    action      text NOT NULL,      -- 'view','create','edit','delete','approve','post','email','export','reverse','archive', ...
    granted_by  uuid NOT NULL REFERENCES auth.users(id),
    granted_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_id, user_id, resource, action)
);
```

A permission is simply a `(resource, action)` pair a user holds for a given
entity. This is not limited to CRUD — `('invoice','approve')`,
`('payment','reverse')`, `('project','archive')`, `('invoice','email')` are all
first-class, equally-weighted rows. No boolean columns, no schema change
required when a new action type is needed later.

### 3.4 Wildcard resource

`resource = '*'` grants the action across every document type. Example: a
Viewer-equivalent user might hold `('*','view')` plus `('invoice','edit')` to
express "read everything, but can also edit invoices specifically."

### 3.5 Permission resolution algorithm

For a check of `(entity_id, user_id, resource, action)`:

1. Look for an exact row: `resource = <resource> AND action = <action>`. If found → **allow**.
2. Else look for the wildcard row: `resource = '*' AND action = <action>`. If found → **allow**.
3. Else → **deny**.

Default is deny in all cases — there is no implicit access from workspace
membership alone. Entity access always requires at least one explicit
`entity_permissions` row.

```sql
CREATE OR REPLACE FUNCTION public.has_entity_permission(
    p_entity_id uuid, p_user_id uuid, p_resource text, p_action text
) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.entity_permissions
        WHERE entity_id = p_entity_id AND user_id = p_user_id
          AND action = p_action
          AND resource IN (p_resource, '*')
    );
$$;
```
Used directly inside entity-schema RLS policies:
```sql
-- inside entity_mrc_acme, on invoices
CREATE POLICY invoice_view ON invoices FOR SELECT TO authenticated
    USING (public.has_entity_permission('<entity_id>', auth.uid(), 'invoice', 'view'));
CREATE POLICY invoice_create ON invoices FOR INSERT TO authenticated
    WITH CHECK (public.has_entity_permission('<entity_id>', auth.uid(), 'invoice', 'create'));
-- etc. per action
```

### 3.6 Permission templates — convenience only, zero authority

```sql
CREATE TABLE public.permission_templates (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
    name         text NOT NULL,        -- "Engineer", "Accountant", "Site Supervisor" — not reserved words
    description  text,
    created_by   uuid NOT NULL REFERENCES auth.users(id),
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

CREATE TABLE public.permission_template_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES public.permission_templates(id) ON DELETE CASCADE,
    resource    text NOT NULL,
    action      text NOT NULL,
    UNIQUE (template_id, resource, action)
);
```

A workspace may seed itself with starter templates (Engineer, Manager, Viewer)
at creation time, but these are ordinary rows — no reserved IDs, no reserved
names, no system flag. Deleting the "Engineer" template is valid and has zero
effect on any user who was previously assigned permissions via it, because:

**No `template_id` is ever stored on `entity_permissions`.** Applying a
template is a one-time copy:

```sql
CREATE OR REPLACE FUNCTION public.apply_permission_template(
    p_template_id uuid, p_entity_id uuid, p_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action, granted_by)
    SELECT p_entity_id, p_user_id, ti.resource, ti.action, auth.uid()
    FROM public.permission_template_items ti
    WHERE ti.template_id = p_template_id
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$$;
```

Editing a template later never retroactively changes anyone's permissions.
"Reapply template to selected users" is a distinct, explicit, opt-in action —
calling this function again — never an automatic side effect of editing the
template itself.

### 3.7 Invite grants mirror entity_permissions exactly

```sql
CREATE TABLE public.workspace_invitation_entity_grants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id   uuid NOT NULL REFERENCES public.workspace_invitations(id) ON DELETE CASCADE,
    entity_id   uuid NOT NULL REFERENCES public.entities(id),
    resource    text NOT NULL,
    action      text NOT NULL,
    UNIQUE (invite_id, entity_id, resource, action)
);
```

Same shape as `entity_permissions` minus `granted_by`/`granted_at` (populated
at acceptance time). Accepting an invite becomes a straight row copy with no
format translation — see 3.9.

### 3.8 Auditing (design reserved, not built in v2.1)

Not required for launch, but the schema should not preclude it. When needed:

```sql
-- Phase 2+
CREATE TABLE public.entity_permission_audit (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   uuid NOT NULL,
    user_id     uuid NOT NULL,
    resource    text NOT NULL,
    action      text NOT NULL,
    change_type text NOT NULL CHECK (change_type IN ('granted','revoked')),
    changed_by  uuid NOT NULL REFERENCES auth.users(id),
    changed_at  timestamptz NOT NULL DEFAULT now()
);
```
A trigger on `entity_permissions` INSERT/DELETE can populate this
automatically once built; no schema changes to `entity_permissions` itself
are needed to add it later.

### 3.9 Accept invite — with cross-workspace guard (unchanged logic, updated shape)

```sql
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_grant  record;
BEGIN
  SELECT * INTO v_invite
  FROM public.workspace_invitations
  WHERE id = p_invite_id
    AND status = 'pending'
    AND expires_at > now()
    AND lower(email) = lower(auth.jwt() ->> 'email');   -- from validated JWT, not auth.email()

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found, expired, or email mismatch';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
  VALUES (v_invite.workspace_id, auth.uid(), v_invite.workspace_role, v_invite.workspace_permissions);

  FOR v_grant IN
    SELECT * FROM public.workspace_invitation_entity_grants WHERE invite_id = p_invite_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.entities
      WHERE id = v_grant.entity_id AND workspace_id = v_invite.workspace_id
    ) THEN
      RAISE EXCEPTION 'Entity % does not belong to this workspace', v_grant.entity_id;
    END IF;

    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action, granted_by)
    VALUES (v_grant.entity_id, auth.uid(), v_grant.resource, v_grant.action, v_invite.invited_by)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = p_invite_id;
END;
$$;
```

---

## 4. Signup, Lobby & Invites

Unchanged from v2.0 §4, with one correctness fix: **all RLS and RPC logic
reads the invitee's email from `auth.jwt() ->> 'email'`**, never from
`auth.email()`, since the latter is a convenience wrapper and not the
validated claim itself.

```sql
CREATE POLICY invite_visibility ON public.workspace_invitations
    FOR SELECT TO authenticated
    USING (
        lower(email) = lower(auth.jwt() ->> 'email')
        OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_invitations.workspace_id
              AND user_id = auth.uid()
              AND (role = 'owner' OR (permissions->>'invite_members')::boolean = true)
        )
    );
```

`workspace_invitations` also gains `workspace_permissions jsonb` (the toggle
set to grant on acceptance, mirroring `workspace_members.permissions`) —
carried over from the invite into the new member row in 3.9.

Invite expiry: 7 days, auto-voided by a daily scheduled job (unchanged from v2.0).

---

## 5. Core Tables (consolidated)

```sql
CREATE TABLE public.workspaces (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE,
    name        text NOT NULL,
    status      text NOT NULL DEFAULT 'pending_approval'
                CHECK (status IN ('pending_approval','active','suspended','archived')),
    created_at  timestamptz NOT NULL DEFAULT now()
);
-- NOTE: owner_id intentionally removed (v2.0 had it). Single source of truth
-- for ownership is workspace_members.role = 'owner', guaranteed unique below.

CREATE UNIQUE INDEX one_pending_workspace_per_creator
    ON public.workspaces (created_by) WHERE status = 'pending_approval';
    -- created_by tracked separately for the pending-approval request itself;
    -- becomes the first workspace_members owner row only upon approval.

CREATE TABLE public.workspace_members (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
    user_id      uuid NOT NULL REFERENCES auth.users(id),
    role         text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
    permissions  jsonb NOT NULL DEFAULT '{}'::jsonb,
    joined_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

CREATE UNIQUE INDEX one_owner_per_workspace
    ON public.workspace_members (workspace_id) WHERE role = 'owner';

CREATE TABLE public.workspace_invitations (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          uuid NOT NULL REFERENCES public.workspaces(id),
    email                 text NOT NULL,
    workspace_role        text NOT NULL DEFAULT 'member' CHECK (workspace_role IN ('owner','member')),
    workspace_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
    status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','revoked','expired')),
    invited_by            uuid NOT NULL REFERENCES auth.users(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    expires_at            timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.entities
    ADD COLUMN workspace_id uuid NOT NULL REFERENCES public.workspaces(id);
    -- schema_name convention: entity_<workspace_slug>_<entity_slug>, UNIQUE constraint is the real guard
```
(`entity_permissions`, `permission_templates`, `permission_template_items`,
`workspace_invitation_entity_grants` as defined in Section 3.)

---

## 6. Ownership Transfer

Unchanged from v2.0 §6.2 — atomic demote-old/promote-new in one transaction,
guaranteed by the unique-owner index. No changes needed for v2.1.

---

## 7. Platform Owner Scope

Unchanged from v2.0 §3.1/§6.3 — approve/suspend `workspaces.status` only,
nothing else. `approve_workspace()` now inserts the `workspace_members` owner
row directly from the approval context rather than reading `workspaces.owner_id`
(removed in this revision):

```sql
CREATE OR REPLACE FUNCTION public.approve_workspace(p_workspace_id uuid, p_creator_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_platform_admin = true) THEN
    RAISE EXCEPTION 'Only the platform owner can approve workspaces';
  END IF;

  UPDATE public.workspaces SET status = 'active' WHERE id = p_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, p_creator_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
END;
$$;
```

---

## 8. Workspace Deletion — Soft Delete Only

Owner-initiated "delete workspace" sets `status = 'archived'`. It never
triggers `DROP SCHEMA` synchronously. Physical teardown is a separate,
explicit purge workflow:

1. `status = 'archived'` — workspace and all entities become inaccessible to
   members immediately (RLS denies on non-active status), data untouched.
2. After a retention period (e.g. 30 days), a privileged background job may
   execute `DROP SCHEMA entity_<ws>_<entity> CASCADE` per entity, then remove
   the `workspaces`/`entities` rows.
3. Until that purge runs, an Owner-equivalent action (or Platform Owner, for
   this specific recovery case only — the one exception to the no-data-access
   principle, since it's schema-existence, not data access) can restore
   `status = 'active'`.

---

## 9. Zero-Entity Onboarding UX

Upon `approve_workspace()`, the new Owner has a workspace with no companies
yet. The application must route them directly into a "Create your first
Company" flow — there is no meaningful dashboard state with zero entities.
Entity creation itself runs through a `SECURITY DEFINER` RPC (not raw client
DDL) that checks the caller holds `create_entity` in `workspace_members.permissions`
(or is `owner`) before executing `CREATE SCHEMA`.

---

## 10. Migration: Phase 0 (Grandfathering)

Unchanged in spirit from v2.0 §8:

1. Create workspace `slug = 'mrc'`, `status = 'active'`.
2. Insert a `workspace_members` row for every existing user, `role='owner'`
   for Mr C, `role='member'` with full permission toggles for existing staff
   (best-effort mapping; access is never *reduced* by automated migration —
   Mr C reviews and adjusts post-migration).
3. Existing 3 companies become `entities` with `workspace_id = mrc`, renamed
   to the `entity_mrc_<slug>` schema convention.
4. Grant existing staff `entity_permissions` rows matching their pre-migration
   effective access (broad `('*','view')` + `('*','create')` + `('*','edit')`
   as a safe default, tightened manually afterward).

---

## 11. Open Items Carried Forward

- Supavisor transaction-mode pooling: `supabase.schema()` per-query, not
  session-level `search_path`.
- PostgREST exposed-schema registration for dynamically created entity
  schemas — confirm current admin-API behavior before building "instant"
  entity creation UI.
- `dblink`-based federated cross-entity views remain a do-not-ship stopgap;
  replace with FDW if/when cross-entity reporting within a workspace is built.
- Permission audit trail (§3.8) — reserved, not built in v2.1.
- Service accounts (API integrations, devices, scheduled automation, AI
  agents) — not modeled in v2.1; keep `entity_permissions.user_id` pointed at
  `auth.users` for now, revisit as a separate principal type later rather than
  overloading human users.

---

## 12. Success Criteria (v2.1 additions)

1. Granting `('invoice','approve')` to a user has no effect on their ability
   to `view`/`create`/`edit`/`delete` invoices unless those are separately granted.
2. A user with `('*','view')` and `('invoice','edit')` can view every document
   type in that entity but only edit invoices.
3. Deleting a permission template does not alter any existing user's
   `entity_permissions` rows.
4. Editing a template's items does not alter any existing user's permissions
   until "reapply" is explicitly invoked for specific users.
5. `workspaces.owner_id` does not exist as a column; ownership is derived
   solely from `workspace_members` and remains exactly one row per workspace
   under concurrent transfer attempts.
6. Archiving a workspace immediately revokes member access via RLS without
   any `DROP SCHEMA` executing in the same transaction.
7. An invite's entity grants pointing to another workspace's entity are
   rejected both at invite-creation and at acceptance time.
