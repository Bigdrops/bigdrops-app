-- Domain: Multi-Tenancy Platform Operators & Provisioning Status
-- Round 4: Platform operator authorization table, observability status table,
--          supporting RPC and RLS policies
-- Created: 2026-07-16
-- Source: PRD v2.1 §§6.1, 6.2, 6.3, 9.1

-- ============================================================
-- TABLES
-- ============================================================

-- 6.1 Platform Operators Table
CREATE TABLE IF NOT EXISTS public.platform_operators (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
    role        text NOT NULL CHECK (role IN ('owner', 'support', 'auditor', 'operations')),
    granted_by  uuid NOT NULL REFERENCES auth.users(id),
    granted_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz
);
-- Bootstrap: first operator(s) must be inserted via service_role / superuser
-- SQL (bypasses RLS) because no operator exists yet to authorize the INSERT.

CREATE INDEX IF NOT EXISTS idx_platform_operators_user_id
    ON public.platform_operators USING btree (user_id);

-- 9.1 Entity Provisioning Status (external observability contract)
CREATE TABLE IF NOT EXISTS public.entity_provisioning_status (
    entity_id     uuid PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','creating','ready','failed','purging','purged')),
    last_error    text,
    attempt_count integer NOT NULL DEFAULT 0,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_provisioning_status_status
    ON public.entity_provisioning_status USING btree (status);

-- ============================================================
-- FUNCTIONS (defined before RLS policies that reference them)
-- ============================================================

-- 6.2 Platform Operator Check — exact role matching, no hierarchy
CREATE OR REPLACE FUNCTION public.is_platform_operator(
    p_user_id uuid,
    p_required_role text DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.platform_operators
        WHERE user_id = p_user_id
          AND (p_required_role IS NULL OR role = p_required_role)
          AND (expires_at IS NULL OR expires_at > now())
    );
$function$;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.platform_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_provisioning_status ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — platform_operators
-- Only platform_owner ('owner') can read/write.
-- ============================================================

CREATE POLICY platform_operators_select_owner ON platform_operators FOR SELECT TO public
    USING (public.is_platform_operator(auth.uid(), 'owner'));

CREATE POLICY platform_operators_insert_owner ON platform_operators FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_operator(auth.uid(), 'owner'));

CREATE POLICY platform_operators_update_owner ON platform_operators FOR UPDATE TO authenticated
    USING (public.is_platform_operator(auth.uid(), 'owner'));

CREATE POLICY platform_operators_delete_owner ON platform_operators FOR DELETE TO authenticated
    USING (public.is_platform_operator(auth.uid(), 'owner'));

-- ============================================================
-- RLS POLICIES — entity_provisioning_status
-- SELECT: any platform operator can read (observability contract, §9.2)
-- INSERT/UPDATE/DELETE: platform_owner only (defense-in-depth; normal writes
--   go through SECURITY DEFINER functions such as create_entity_schema())
-- ============================================================

CREATE POLICY entity_provisioning_status_select_operator ON entity_provisioning_status FOR SELECT TO public
    USING (public.is_platform_operator(auth.uid()));

CREATE POLICY entity_provisioning_status_insert_owner ON entity_provisioning_status FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_operator(auth.uid(), 'owner'));

CREATE POLICY entity_provisioning_status_update_owner ON entity_provisioning_status FOR UPDATE TO authenticated
    USING (public.is_platform_operator(auth.uid(), 'owner'));

CREATE POLICY entity_provisioning_status_delete_owner ON entity_provisioning_status FOR DELETE TO authenticated
    USING (public.is_platform_operator(auth.uid(), 'owner'));

-- ============================================================
-- FUNCTION UPDATES
-- ============================================================

-- 6.3 approve_workspace() — authorization now validates against platform_operators
--     instead of the removed profiles.is_platform_admin path.
--     Round 3 behavior (status guard, NOT FOUND check, owner payload) preserved.
CREATE OR REPLACE FUNCTION public.approve_workspace(
    p_workspace_id uuid,
    p_creator_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.platform_operators
        WHERE user_id = auth.uid() AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the platform owner can approve workspaces';
    END IF;

    UPDATE public.workspaces
    SET status = 'active'
    WHERE id = p_workspace_id AND status = 'pending_approval';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found or not in pending_approval status'
            USING HINT = 'workspace_id=' || p_workspace_id;
    END IF;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
    VALUES (p_workspace_id, p_creator_user_id, 'owner', '{}'::jsonb)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
END;
$function$;
