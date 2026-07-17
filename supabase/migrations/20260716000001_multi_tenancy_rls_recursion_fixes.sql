-- Domain: Multi-Tenancy RLS Recursion Fixes
-- Round 5: Fix confirmed RLS recursion bugs + additional instances found via sweep
-- Created: 2026-07-16
-- Source: docs/Prompts/prompt6i5.md
--
-- Confirmed bugs (not re-verified per prompt instruction):
--   BUG #1: workspace_members_select_self self-queries workspace_members → infinite recursion
--   BUG #2: is_platform_operator() lacks SECURITY DEFINER; platform_operators policies
--           call it, it queries platform_operators, triggering those same policies → stack overflow
--
-- Additional instances found via sweep (Part C):
--   Instances 2-4: workspace_members INSERT/UPDATE/DELETE policies also self-query
--   Instances 5-8: platform_operators INSERT/UPDATE/DELETE policies also call non-SD is_platform_operator()
--   Instances 9-12: entity_provisioning_status policies call is_platform_operator() → transitive recursion
--
-- Fix strategy:
--   A. is_workspace_member() SECURITY DEFINER → breaks recursion chain for workspace_members policies
--   B. is_workspace_owner() SECURITY DEFINER → preserves owner-check semantics for INSERT/UPDATE/DELETE
--   C. is_platform_operator() CREATE OR REPLACE with SECURITY DEFINER → breaks recursion for all
--      platform_operators + entity_provisioning_status policies
--   D. Rewrite workspace_members_* policies to use new SECURITY DEFINER helpers
--   E. platform_operators_* and entity_provisioning_status_* policies unchanged (fixed by SD function)

-- ============================================================
-- A. SECURITY DEFINER helper: is_workspace_member()
-- Prevents recursion by bypassing RLS when querying workspace_members.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(
    p_workspace_id uuid,
    p_user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_user_id
    );
$function$;

-- ============================================================
-- B. SECURITY DEFINER helper: is_workspace_owner()
-- Used by INSERT/UPDATE/DELETE policies on workspace_members
-- to check owner status without self-querying.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_workspace_owner(
    p_workspace_id uuid,
    p_user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_user_id
          AND role = 'owner'
    );
$function$;

-- ============================================================
-- C. is_platform_operator() — add SECURITY DEFINER
-- CREATE OR REPLACE in new migration (no modification to original file).
-- This fixes the transitive recursion for all policies that call it:
--   platform_operators_select_owner (bug #2)
--   platform_operators_insert_owner, _update_owner, _delete_owner (instances 5-8)
--   entity_provisioning_status_* (instances 9-12)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_operator(
    p_user_id uuid,
    p_required_role text DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
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
-- D. Rewrite workspace_members RLS policies
-- DROP originals (self-querying), CREATE fixed versions using SD helpers.
-- ============================================================

-- D.1 SELECT (bug #1): self-query → is_workspace_member()
DROP POLICY IF EXISTS workspace_members_select_self ON public.workspace_members;
CREATE POLICY workspace_members_select_self ON public.workspace_members FOR SELECT TO public
    USING (
        user_id = auth.uid()
        OR public.is_workspace_member(workspace_id, auth.uid())
    );

-- D.2 INSERT (instance #2): self-query → is_workspace_owner()
DROP POLICY IF EXISTS workspace_members_insert_owner ON public.workspace_members;
CREATE POLICY workspace_members_insert_owner ON public.workspace_members FOR INSERT TO authenticated
    WITH CHECK (
        public.is_workspace_owner(workspace_id, auth.uid())
    );

-- D.3 UPDATE (instance #3): self-query → is_workspace_owner()
DROP POLICY IF EXISTS workspace_members_update_owner ON public.workspace_members;
CREATE POLICY workspace_members_update_owner ON public.workspace_members FOR UPDATE TO authenticated
    USING (
        public.is_workspace_owner(workspace_id, auth.uid())
    );

-- D.4 DELETE (instance #4): self-query → is_workspace_owner()
DROP POLICY IF EXISTS workspace_members_delete_owner ON public.workspace_members;
CREATE POLICY workspace_members_delete_owner ON public.workspace_members FOR DELETE TO authenticated
    USING (
        public.is_workspace_owner(workspace_id, auth.uid())
    );

-- ============================================================
-- E. Fix workspaces RLS policies — column name ambiguity bug
-- The original policies use `WHERE workspace_id = id` in a subquery
-- from workspace_members. Unqualified `id` resolves to
-- workspace_members.id (the subquery's own PK) instead of
-- workspaces.id (the outer table). Fix: use is_workspace_member()
-- helper instead of the ambiguous subquery.
-- ============================================================

-- E.1 SELECT: ambiguous `id` → is_workspace_member()
DROP POLICY IF EXISTS workspaces_select_member ON public.workspaces;
CREATE POLICY workspaces_select_member ON public.workspaces FOR SELECT TO public
    USING (
        public.is_workspace_member(id, auth.uid())
        OR created_by = auth.uid()
    );

-- E.2 UPDATE: ambiguous `id` → is_workspace_owner()
DROP POLICY IF EXISTS workspaces_update_owner ON public.workspaces;
CREATE POLICY workspaces_update_owner ON public.workspaces FOR UPDATE TO public
    USING (
        public.is_workspace_owner(id, auth.uid())
    );
