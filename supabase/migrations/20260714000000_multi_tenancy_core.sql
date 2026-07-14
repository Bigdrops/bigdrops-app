-- Domain: Multi-Tenancy Core
-- Phase 1: Public schema authorization tables, indexes, and RPC functions
-- Created: 2026-07-14
-- Source: docs/Reports/architecture/multi-tenancy-round-2-analysis.md

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE,
    name        text NOT NULL,
    status      text NOT NULL DEFAULT 'pending_approval'
                CHECK (status IN ('pending_approval','active','suspended','archived')),
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL,
    role          text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner','member')),
    permissions   jsonb NOT NULL DEFAULT '[]'::jsonb,
    joined_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.entity_permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   uuid NOT NULL,
    user_id     uuid NOT NULL,
    resource    text NOT NULL,
    action      text NOT NULL,
    granted_by  uuid,
    granted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permission_templates (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name          text NOT NULL,
    description   text,
    created_by    uuid,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permission_template_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES public.permission_templates(id) ON DELETE CASCADE,
    resource    text NOT NULL,
    action      text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email                 text NOT NULL,
    workspace_role        text NOT NULL DEFAULT 'member'
                          CHECK (workspace_role IN ('owner','member')),
    workspace_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
    status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','accepted','expired','revoked')),
    invited_by            uuid,
    created_at            timestamptz NOT NULL DEFAULT now(),
    expires_at            timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE TABLE IF NOT EXISTS public.workspace_invitation_entity_grants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id   uuid NOT NULL REFERENCES public.workspace_invitations(id) ON DELETE CASCADE,
    entity_id   uuid NOT NULL,
    resource    text NOT NULL,
    action      text NOT NULL
);

-- ============================================================
-- TRIGGERS (workspaces uses stamp_row_ownership for created_by)
-- ============================================================

CREATE TRIGGER trg_workspaces_stamp_ownership
    BEFORE INSERT OR UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION stamp_row_ownership();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
    ON public.workspace_members USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
    ON public.workspace_members USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_permissions_unique
    ON public.entity_permissions USING btree (entity_id, user_id, resource, action);
CREATE INDEX IF NOT EXISTS idx_entity_permissions_entity_id
    ON public.entity_permissions USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_permissions_user_id
    ON public.entity_permissions USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_permission_templates_workspace_id
    ON public.permission_templates USING btree (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id
    ON public.workspace_invitations USING btree (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email
    ON public.workspace_invitations USING btree (email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_owner_per_workspace
    ON public.workspace_members (workspace_id) WHERE role = 'owner';

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_workspace_per_creator
    ON public.workspaces (created_by) WHERE status = 'pending_approval';

-- ============================================================
-- RLS (Phase 1: enable RLS; Phase 2 adds granular policies)
-- ============================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitation_entity_grants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_entity_permission(
    p_entity_id uuid,
    p_user_id uuid,
    p_resource text,
    p_action text
) RETURNS boolean
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.entity_permissions ep
        WHERE ep.entity_id = p_entity_id
          AND ep.user_id = p_user_id
          AND (
              (ep.resource = p_resource AND ep.action = p_action)
              OR (ep.resource = '*' AND ep.action = p_action)
              OR (ep.resource = p_resource AND ep.action = '*')
              OR (ep.resource = '*' AND ep.action = '*')
          )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_permission_template(
    p_template_id uuid,
    p_entity_id uuid,
    p_user_id uuid,
    p_granted_by uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action, granted_by)
    SELECT p_entity_id, p_user_id, pti.resource, pti.action, p_granted_by
    FROM public.permission_template_items pti
    WHERE pti.template_id = p_template_id
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(
    p_invite_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_invite record;
BEGIN
    SELECT * INTO v_invite
    FROM public.workspace_invitations
    WHERE id = p_invite_id
      AND status = 'pending'
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found, expired, or already accepted'
            USING HINT = 'invite_id=' || p_invite_id;
    END IF;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
    VALUES (v_invite.workspace_id, auth.uid(), v_invite.workspace_role, v_invite.workspace_permissions);

    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT wieg.entity_id, auth.uid(), wieg.resource, wieg.action
    FROM public.workspace_invitation_entity_grants wieg
    WHERE wieg.invite_id = p_invite_id
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    UPDATE public.workspace_invitations
    SET status = 'accepted'
    WHERE id = p_invite_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_workspace(
    p_workspace_id uuid,
    p_creator_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.workspaces
    SET status = 'active'
    WHERE id = p_workspace_id AND status = 'pending_approval';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found or not in pending_approval status'
            USING HINT = 'workspace_id=' || p_workspace_id;
    END IF;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
    VALUES (p_workspace_id, p_creator_user_id, 'owner', '["*"]'::jsonb)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
END;
$function$;
