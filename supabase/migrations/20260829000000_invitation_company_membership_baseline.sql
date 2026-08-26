-- ============================================================
-- Invitation company membership baseline
--
-- Root cause (production err_1787718465611_nf7s7a):
--   create_workspace_invitation() never wrote rows into
--   workspace_invitation_entity_grants, so invitations created from
--   Team Management carried no entity grants. accept_workspace_invitation()
--   therefore created only a workspace_members row and zero
--   entity_permissions rows for the invitee.
--
--   assign_role_to_company_member() requires the target user to hold at
--   least one entity_permissions row on the target entity as the company
--   membership signal (comment in 20260819000000: creator seed and
--   invitation acceptance are the two intended grant sources). With no
--   grant row the RPC raises 'User is not a member of this company'.
--
-- Canonical fix: let invitation creation associate the invite with one
-- entity of the workspace and attach a single baseline grant
-- ('*', 'view') to it. Acceptance then copies that grant into
-- entity_permissions, which IS genuine company membership under the
-- existing model: the invited user can view the company they were
-- explicitly invited to, and role assignment can proceed through the
-- canonical SECURITY DEFINER path. No new permission model, no role
-- enum, no frontend writes to entity_permissions.
--
-- Preserved invariants:
--   - Caller authorization unchanged (owner OR invite_members toggle).
--   - Email lowercasing and default expiry unchanged.
--   - Cross-workspace protection doubled: explicit pre-check here plus
--     the existing trg_workspace_invitation_entity_grants_workspace_guard
--     trigger from 20260818000001.
--   - Idempotent grant insert (UNIQUE invite_id, entity_id, resource,
--     action; ON CONFLICT DO NOTHING).
--   - p_entity_id is OPTIONAL: NULL keeps the previous behavior exactly.
--
-- Operational note: pending invitations created BEFORE this migration
-- carry no entity grant. Revoke and re-send them from Team Management;
-- the new invitation will carry the baseline company grant.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
    p_workspace_id uuid,
    p_email text,
    p_role text DEFAULT 'member',
    p_permissions jsonb DEFAULT '{}'::jsonb,
    p_expires_at timestamptz DEFAULT NULL,
    p_entity_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_invite_id uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
          AND (role = 'owner' OR (permissions->>'invite_members')::boolean = true)
    ) THEN
        RAISE EXCEPTION 'Not authorized to invite members to this workspace';
    END IF;

    IF p_entity_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.entities
        WHERE id = p_entity_id
          AND workspace_id = p_workspace_id
    ) THEN
        RAISE EXCEPTION 'Entity does not belong to the workspace';
    END IF;

    INSERT INTO public.workspace_invitations (
        workspace_id,
        email,
        workspace_role,
        workspace_permissions,
        invited_by,
        expires_at
    )
    VALUES (
        p_workspace_id,
        lower(p_email),
        p_role,
        p_permissions,
        auth.uid(),
        COALESCE(p_expires_at, now() + interval '7 days')
    )
    RETURNING id INTO v_invite_id;

    -- Baseline company membership grant: read-only access to the invited
    -- company. This is the membership signal required by
    -- assign_role_to_company_member(). The cross-workspace guard trigger
    -- validates the pair again at the table boundary.
    IF p_entity_id IS NOT NULL THEN
        INSERT INTO public.workspace_invitation_entity_grants (
            invite_id,
            entity_id,
            resource,
            action
        )
        VALUES (
            v_invite_id,
            p_entity_id,
            '*',
            'view'
        )
        ON CONFLICT (invite_id, entity_id, resource, action) DO NOTHING;
    END IF;

    RETURN v_invite_id;
END;
$function$;
