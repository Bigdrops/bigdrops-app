-- Domain: Workspace onboarding escape hatch
-- Allows the creator of a still-pending workspace request to abandon it,
-- returning the account to the Create/Join flow. Only the creator's own
-- row in pending_approval status can be removed:
--   - approved/active/suspended/archived rows are refused;
--   - other users' rows are refused (created_by must equal auth.uid());
--   - workspaces that grew business data (entities, memberships,
--     invitations) are refused rather than destroyed.
-- A pending workspace cannot own such data through the normal lifecycle
-- (entities, memberships, and invitations all require membership or
-- approval first), and every child table references workspaces with
-- ON DELETE CASCADE, so the delete removes a lone row. Tenant schemas
-- cannot exist pre-approval because provision_entity() requires
-- owner/create_entity membership. RLS exposes no DELETE path on
-- workspaces, so this SECURITY DEFINER RPC is the only path.
-- Absent rows succeed silently so retries and double-clicks are safe.

CREATE OR REPLACE FUNCTION public.abandon_pending_workspace(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_status text;
  v_created_by uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT status, created_by INTO v_status, v_created_by
  FROM public.workspaces
  WHERE id = p_workspace_id;

  -- Idempotent success: an already-gone row means the desired end state
  -- already holds (retry, double-click, or refresh race).
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_created_by IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'Not authorized to abandon this workspace request'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status != 'pending_approval' THEN
    RAISE EXCEPTION 'Only a pending workspace request can be abandoned'
      USING HINT = 'workspace_id=' || p_workspace_id;
  END IF;

  -- Defensive: never destroy business data through this path, even if a
  -- future lifecycle change allows rows to accumulate pre-approval.
  IF EXISTS (SELECT 1 FROM public.entities WHERE workspace_id = p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace has companies and cannot be abandoned through this path';
  END IF;

  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace has members and cannot be abandoned through this path';
  END IF;

  IF EXISTS (SELECT 1 FROM public.workspace_invitations WHERE workspace_id = p_workspace_id) THEN
    RAISE EXCEPTION 'Workspace has invitations and cannot be abandoned through this path';
  END IF;

  DELETE FROM public.workspaces WHERE id = p_workspace_id;
END;
$function$;

-- Revoke default PUBLIC execute, expose only to authenticated users.
-- Authorization is enforced inside the function body (creator + pending).
REVOKE ALL ON FUNCTION public.abandon_pending_workspace(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abandon_pending_workspace(uuid) TO authenticated;
