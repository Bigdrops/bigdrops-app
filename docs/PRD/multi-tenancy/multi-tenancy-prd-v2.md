BIGDROPS Multi-Tenancy — Architecture & Migration PRD (v2)

Type: Architecture Specification / Migration Plan
Status: Draft
Version: 2.0
Date: 2026-07-14
Supersedes: v1.0 (2026-07-12)
Repository path: docs/PRD/multi-tenancy-prd.md

---

## 0. What Changed From v1.0

v1.0 solved company-level isolation (schema-per-entity) but assumed a single implicit
workspace: "Mr C's staff, managing Mr C's companies." That was too weak for a real
multi-tenant platform. v2.0 adds a **Workspace layer** above Entities, so unrelated
teams can each manage their own set of companies without ever seeing each other,
while the Platform Owner retains exactly one narrow power: approving whether a
workspace is allowed to exist at all.

Nothing in v1.0's schema-per-entity isolation mechanism (Sections 2–3 of v1.0) changes.
This document adds a tenancy layer on top of it and rewrites the membership,
signup, and invite model (formerly Section 4) entirely.

---

## 1. Purpose & Problem Statement

BIGDROPS must support multiple independent organizations ("Workspaces"), each
privately managing one or more companies ("Entities"), with:

1. Zero data leakage between Entities (solved in v1.0 via schema-per-entity)
2. Zero visibility or membership leakage between Workspaces (new in v2.0)
3. A curated, invite-only growth model — no open self-serve sprawl
4. A single Platform Owner who gatekeeps workspace *existence* only, with no
   default authority over what happens inside an approved workspace
5. Internal, fully self-governed role structures per workspace (Telegram-model)

---

## 2. Tenancy Hierarchy

```
Platform (BIGDROPS)
│
├── Platform Owner                     — approves/suspends workspace existence only
│
├── Workspace: "Mr C's Agency"         (formerly the implicit whole system)
│     ├── workspace_members            — Owner / Admin / Member roles
│     ├── workspace_invitations        — email-bound, 7-day expiry
│     └── Entities (companies):
│           ├── entity_mrc_acme        — isolated Postgres schema
│           ├── entity_mrc_beta        — isolated Postgres schema
│           └── entity_mrc_gamma       — isolated Postgres schema
│
├── Workspace: "Some Other Agency"
│     ├── workspace_members            (entirely separate pool)
│     └── Entities:
│           └── entity_soa_delta
│
└── Workspace: ...
```

**Isolation guarantee:** Workspace A cannot query, list, or infer the existence of
Workspace B's entities, members, or invites — enforced at the RLS layer on
`workspaces`/`workspace_members`/`workspace_invitations`, and at the Postgres
schema level for all entity data (unchanged from v1.0).

---

## 3. Roles & Authority Model

### 3.1 Platform Owner (you)

Exactly one power: flip `workspaces.status` between `pending_approval`, `active`,
`suspended`. No default read or write access to any workspace's members, invites,
or entity data. If the Platform Owner is separately added as a `workspace_member`
of a specific workspace, they act under that workspace's normal role rules from
that point on — platform authority does not carry in.

`profiles.is_platform_admin` grants this one capability and nothing else. This
must be enforced narrowly in RLS (see 6.3) so it can't silently widen later.

### 3.2 Workspace Roles (Telegram model)

| Role | Powers |
|---|---|
| **Owner** | Everyone below, plus: transfer ownership, delete workspace, cannot be kicked |
| **Admin** | Invite/revoke members, assign roles up to Admin, manage billing view, create/archive entities |
| **Member** | No invite/role power. Access limited to entities they're explicitly granted |

Exactly **one Owner per workspace**, enforced by a partial unique index. An Owner
may promote anyone to Owner via an explicit **ownership transfer**, which
atomically demotes the outgoing Owner to Admin — never a two-owner state, never a
zero-owner state. Role assignment inside a workspace is entirely the Owner/Admin's
discretion; the platform imposes no ceiling.

### 3.3 Entity Roles (per-company, within a workspace)

| Role | Powers |
|---|---|
| **Manager** | Alter company settings (prefixes, branding, bank details) |
| **Engineer** | Create/edit invoices, waybills, quotations, projects |
| **Viewer** | Read-only |

A user can hold different Entity roles in different companies under the same
workspace (e.g. Manager on Acme, Engineer on Beta), independent of their
workspace-level role.

---

## 4. Signup & The Lobby

Replaces v1.0's auto-provision-as-staff model entirely.

### 4.1 Flow

1. User signs up → gets an `auth.users` row → belongs to zero workspaces.
2. Lands in the **Lobby** UI. Frontend runs:
   ```sql
   -- pending invites addressed to this verified email
   SELECT * FROM workspace_invitations
   WHERE lower(email) = lower(auth.jwt() ->> 'email') AND status = 'pending';

   -- workspaces this user has requested, awaiting Platform Owner approval
   SELECT * FROM workspaces WHERE owner_id = auth.uid();
   ```
3. From the Lobby, the user can:
   - **Accept an invite** → joins that workspace at the granted role + entity grants
   - **Request a new workspace** → inserts `workspaces` row, `status = pending_approval`
4. User cannot proceed past the Lobby until they hold at least one active
   workspace membership.

### 4.2 No magic links

Invites are bound to a verified, authenticated email address — not a bearer
token. A forwarded invite link is useless to anyone but the invited address.

---

## 5. Schema

### 5.1 Platform-level tables (public schema)

```sql
CREATE TABLE public.workspaces (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE,
    name        text NOT NULL,
    owner_id    uuid NOT NULL REFERENCES auth.users(id),
    status      text NOT NULL DEFAULT 'pending_approval'
                CHECK (status IN ('pending_approval', 'active', 'suspended')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- prevent duplicate pending requests from the same requester
CREATE UNIQUE INDEX one_pending_workspace_per_owner
    ON public.workspaces (owner_id) WHERE status = 'pending_approval';

CREATE TABLE public.workspace_members (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
    user_id      uuid NOT NULL REFERENCES auth.users(id),
    role         text NOT NULL DEFAULT 'member'
                 CHECK (role IN ('owner', 'admin', 'member')),
    joined_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

CREATE UNIQUE INDEX one_owner_per_workspace
    ON public.workspace_members (workspace_id) WHERE role = 'owner';

CREATE TABLE public.workspace_invitations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES public.workspaces(id),
    email         text NOT NULL,
    workspace_role text NOT NULL DEFAULT 'member'
                  CHECK (workspace_role IN ('owner', 'admin', 'member')),
    entity_grants jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{entity_id, role}, ...]
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by    uuid NOT NULL REFERENCES auth.users(id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- entities table (from v1.0) gains a workspace owner
ALTER TABLE public.entities
    ADD COLUMN workspace_id uuid NOT NULL REFERENCES public.workspaces(id);

CREATE TABLE public.entity_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   uuid NOT NULL REFERENCES public.entities(id),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    role        text NOT NULL DEFAULT 'engineer'
                CHECK (role IN ('manager', 'engineer', 'viewer')),
    joined_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_id, user_id)
);
```

### 5.2 Schema naming (team-namespaced, per decision)

```
entity_<workspace_slug>_<entity_slug>
e.g. entity_mrc_acme, entity_soa_delta
```

Enforce at creation time:
```sql
CREATE OR REPLACE FUNCTION public.generate_entity_schema_name(
    p_workspace_slug text, p_entity_slug text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT 'entity_' || p_workspace_slug || '_' || p_entity_slug;
$$;
```
`entities.schema_name` keeps its `UNIQUE` constraint from v1.0 as the actual
collision guard; the naming convention just makes collisions rare in practice
and schemas human-readable for support/debugging.

### 5.3 Invite expiry

A scheduled job (Supabase cron / pg_cron) auto-voids stale invites daily:
```sql
UPDATE public.workspace_invitations
SET status = 'expired'
WHERE status = 'pending' AND expires_at < now();
```

---

## 6. Key Functions

### 6.1 Accept invite (with entity-grant validation — fixes the gap found in review)

```sql
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_user_email text;
  v_grant jsonb;
BEGIN
  v_user_email := auth.jwt() ->> 'email';

  SELECT * INTO v_invite
  FROM public.workspace_invitations
  WHERE id = p_invite_id
    AND status = 'pending'
    AND expires_at > now()
    AND lower(email) = lower(v_user_email);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found, expired, or email mismatch';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, auth.uid(), v_invite.workspace_role);

  FOR v_grant IN SELECT * FROM jsonb_array_elements(v_invite.entity_grants)
  LOOP
    -- guard: entity must belong to THIS workspace, not another
    IF NOT EXISTS (
      SELECT 1 FROM public.entities
      WHERE id = (v_grant->>'entity_id')::uuid
        AND workspace_id = v_invite.workspace_id
    ) THEN
      RAISE EXCEPTION 'Entity % does not belong to this workspace', v_grant->>'entity_id';
    END IF;

    INSERT INTO public.entity_members (entity_id, user_id, role)
    VALUES ((v_grant->>'entity_id')::uuid, auth.uid(), v_grant->>'role');
  END LOOP;

  UPDATE public.workspace_invitations SET status = 'accepted' WHERE id = p_invite_id;
END;
$$;
```

### 6.2 Ownership transfer (atomic, never two owners / zero owners)

```sql
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  p_workspace_id uuid,
  p_new_owner_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this workspace';
  END IF;

  UPDATE public.workspace_members SET role = 'admin'
    WHERE workspace_id = p_workspace_id AND role = 'owner';

  UPDATE public.workspace_members SET role = 'owner'
    WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_user_id;
END;
$$;
```

### 6.3 Platform Owner approval (narrow, single-purpose)

```sql
CREATE OR REPLACE FUNCTION public.approve_workspace(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_platform_admin = true
  ) THEN
    RAISE EXCEPTION 'Only the platform owner can approve workspaces';
  END IF;

  UPDATE public.workspaces SET status = 'active' WHERE id = p_workspace_id;

  -- creator becomes owner at the moment of approval
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT id, owner_id, 'owner' FROM public.workspaces WHERE id = p_workspace_id
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
END;
$$;
```
This is the **only** function `is_platform_admin` unlocks. It must never be
extended to touch `workspace_members`, `workspace_invitations`, or any
`entity_*` table — that authority belongs to the workspace Owner alone.

---

## 7. RLS Summary

| Table | Policy shape |
|---|---|
| `workspaces` | SELECT: `owner_id = auth.uid()` OR member OR `is_platform_admin`. UPDATE status: `is_platform_admin` only. |
| `workspace_members` | SELECT/INSERT/UPDATE: caller must be `owner`/`admin` of the same `workspace_id`. No platform bypass. |
| `workspace_invitations` | INSERT: caller is `owner`/`admin` of `workspace_id`, and every `entity_grants` entity belongs to that workspace. SELECT: invitee by email, or workspace owner/admin. |
| `entities` | SELECT: `workspace_id` in caller's workspaces. |
| `entity_members` | Scoped to entity's `workspace_id` membership + explicit entity grant. |
| Entity-schema tables (invoices, waybills, etc.) | Unchanged from v1.0 — flat `authenticated` policy, isolation enforced by schema/connection routing, not row filters. |

---

## 8. Migration: Phase 0 (Grandfathering)

1. Create one workspace: `slug = 'mrc'`, `status = 'active'`, `owner_id` = Mr C's user id.
2. Every user who currently exists in the system is inserted into
   `workspace_members` for the `mrc` workspace at their pre-migration effective
   role (best-effort mapping; Mr C reviews and adjusts post-migration — access is
   never *reduced* by the automated migration, per the non-negotiable rule
   carried over from v1.0 §5.1).
3. Mr C's 3 existing companies become `entities` with `workspace_id = mrc`,
   schema names `entity_mrc_<slug>` (rename from v1.0's bare `entity_<slug>` if
   already provisioned).
4. No other workspace exists yet. New workspaces only originate from the Lobby
   → Platform Owner approval flow from this point forward.

Everything else — schema-per-entity isolation, the Tenant View Wrapper, per-entity
data migration (formerly v1.0 §5.2–5.5) — is unchanged and layered underneath this.

---

## 9. Open Items Carried Forward From v1.0 Review

- Supavisor transaction-mode pooling: use `supabase.schema()` per-query, not
  session-level `search_path`, for the same reasons noted in v1.0 review.
- PostgREST exposed-schema registration for lazily created entity schemas needs
  a confirmed admin-API or dashboard step — verify current Supabase behavior
  before building "instant" entity provisioning UI around it.
- `dblink`-based federated views (v1.0 §3.4) remain a do-not-ship stopgap.

---

## 10. Success Criteria (v2 additions to v1.0 §8)

1. Two unrelated workspaces can each be named "Acme" without schema collision.
2. A user with a pending invite to Workspace B cannot see Workspace A exists,
   even if they're already a member of Workspace A.
3. Platform Owner can approve/suspend a workspace but a `SELECT` as platform
   admin against `workspace_members` or any entity-schema table for a workspace
   they don't belong to returns zero rows.
4. Ownership transfer never results in zero or two Owners, verified by
   attempting concurrent transfer calls.
5. An invite with an `entity_grants` entry pointing to another workspace's
   entity is rejected at both invite-creation and invite-acceptance time.
