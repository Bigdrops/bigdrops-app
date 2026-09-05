-- ============================================================================
-- Migration: workspace_management_gaps
-- Date: 2026-09-05
-- ============================================================================
-- Closes three gaps identified in the workspace/team audit:
--
-- 1. transfer_workspace_ownership() — SECURITY DEFINER RPC for atomic
--    owner demotion + new-owner promotion. Uses the unique-owner index
--    for consistency. Caller must be current workspace owner.
--
-- 2. UNIQUE constraints on permission_templates and permission_template_items
--    to prevent duplicate template names per workspace and duplicate
--    (resource, action) pairs within a template.
--
-- 3. is_platform_operator() role hierarchy fix — owner role now implicitly
--    satisfies support, auditor, and operations checks.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. transfer_workspace_ownership
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
    p_workspace_id uuid,
    p_new_owner_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_current_owner_id uuid;
BEGIN
    -- Validate caller is authenticated
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Resolve current owner
    SELECT user_id INTO v_current_owner_id
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND role = 'owner';

    IF v_current_owner_id IS NULL THEN
        RAISE EXCEPTION 'No owner found for workspace %', p_workspace_id;
    END IF;

    -- Only the current owner can transfer
    IF v_current_owner_id IS NOT DISTINCT FROM v_caller_id THEN
        -- Caller is owner, proceed
    ELSIF public.is_platform_operator(v_caller_id, 'owner') THEN
        -- Platform operators can also transfer
    ELSE
        RAISE EXCEPTION 'Only the workspace owner or a platform operator can transfer ownership';
    END IF;

    -- New owner must be a workspace member
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_new_owner_id
    ) THEN
        RAISE EXCEPTION 'New owner must be a workspace member';
    END IF;

    -- New owner must not already be the owner
    IF v_current_owner_id IS DISTINCT FROM p_new_owner_id THEN
        -- Demote current owner to member
        UPDATE public.workspace_members
        SET role = 'member'
        WHERE workspace_id = p_workspace_id
          AND user_id = v_current_owner_id;

        -- Promote new owner
        UPDATE public.workspace_members
        SET role = 'owner'
        WHERE workspace_id = p_workspace_id
          AND user_id = p_new_owner_id;
    END IF;
    -- If new_owner == current_owner, no-op (idempotent)
END;
$$;

COMMENT ON FUNCTION public.transfer_workspace_ownership IS
    'Atomic ownership transfer: demotes current owner to member, promotes new owner. '
    'Caller must be current owner or a platform operator.';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. UNIQUE constraints on permission templates
-- ──────────────────────────────────────────────────────────────────────────────

-- Prevent duplicate template names per workspace
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'permission_templates_workspace_id_name_key'
    ) THEN
        ALTER TABLE public.permission_templates
            ADD CONSTRAINT permission_templates_workspace_id_name_key
            UNIQUE (workspace_id, name);
    END IF;
END
$$;

-- Prevent duplicate (resource, action) pairs within a template
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'permission_template_items_template_id_resource_action_key'
    ) THEN
        ALTER TABLE public.permission_template_items
            ADD CONSTRAINT permission_template_items_template_id_resource_action_key
            UNIQUE (template_id, resource, action);
    END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Fix is_platform_operator role hierarchy
-- ──────────────────────────────────────────────────────────────────────────────
-- Owner implicitly satisfies all lower roles (support, auditor, operations).
-- Role hierarchy: owner > support > auditor > operations.

CREATE OR REPLACE FUNCTION public.is_platform_operator(
    p_user_id uuid,
    p_required_role text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role
    FROM public.platform_operators
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- No role filter = any operator role satisfies
    IF p_required_role IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Exact match
    IF v_role = p_required_role THEN
        RETURN TRUE;
    END IF;

    -- Role hierarchy: owner satisfies all lower roles
    IF v_role = 'owner' AND p_required_role IN ('support', 'auditor', 'operations') THEN
        RETURN TRUE;
    END IF;

    -- support satisfies auditor and operations
    IF v_role = 'support' AND p_required_role IN ('auditor', 'operations') THEN
        RETURN TRUE;
    END IF;

    -- auditor satisfies operations
    IF v_role = 'auditor' AND p_required_role = 'operations' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_platform_operator IS
    'Check if a user has a platform operator role. Owner implicitly satisfies '
    'all lower roles (support, auditor, operations).';
