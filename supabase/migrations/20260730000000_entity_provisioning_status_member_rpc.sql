-- Domain: Entity Provisioning Status — Member Read
-- Round 7: Member-scoped RPC exposing provisioning state for the frontend
-- Source: ERP multi-tenancy frontend PRD v1.1 / docs/prd/multi-tenancy/erp-frontend-prd-v1.1.md
--
-- Goal:
--   entity_provisioning_status is SELECT-restricted to platform operators
--   (entity_provisioning_status_select_operator). A regular workspace member
--   who owns an entity has no way to read that entity's provisioning state,
--   which the Entity Provider needs.
--
-- This migration adds ONE SECURITY DEFINER RPC that lets a workspace member
-- read provisioning state for an entity of a workspace they belong to.
-- The existing operator-only RLS on entity_provisioning_status is NOT changed.
--
-- Authorization model (mirrors existing helpers):
--   Guard uses public.is_workspace_member() (SECURITY DEFINER, already exists)
--   joined through entities.workspace_id. Unauthorized callers get no row,
--   not an error.

CREATE OR REPLACE FUNCTION public.get_entity_provisioning_status(p_entity_id uuid)
RETURNS TABLE(
    status text,
    last_error text,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        eps.status,
        eps.last_error,
        eps.updated_at
    FROM public.entity_provisioning_status eps
    JOIN public.entities e ON e.id = eps.entity_id
    WHERE eps.entity_id = p_entity_id
      AND public.is_workspace_member(e.workspace_id, auth.uid());
$function$;

-- Revoke default PUBLIC execute, expose only to authenticated users.
-- Anon and other roles never see this RPC's output.
REVOKE ALL ON FUNCTION public.get_entity_provisioning_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_entity_provisioning_status(uuid) TO authenticated;