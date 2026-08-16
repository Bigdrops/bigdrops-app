-- ============================================================
-- Multi-tenancy invitation correctness corrections
--
-- Reconciliation findings against multi-tenancy-prd-v2.1.md:
--   CON-01 (B): workspace_invitations_select_member compared
--     email with an exact, case-sensitive match against
--     auth.users.email. PRD §4 requires the invitee email to be
--     read from the validated JWT claim with a lower() comparison.
--   INV-01 (B): create_workspace_invitation() and
--     revoke_workspace_invitation() were missing. PRD §4.1
--     mandates them so the invite_members toggle is enforceable.
--   GRANTS UNIQUE (C): workspace_invitation_entity_grants lacked
--     UNIQUE (invite_id, entity_id, resource, action). PRD §5
--     line 286 requires it.
--   CROSS-WORKSPACE GUARD (B): an invite's entity grants pointing
--     to another workspace's entity were not rejected. PRD §12
--     requires rejection at invite-creation and at acceptance.
-- ============================================================

-- ------------------------------------------------------------
-- CON-01: invite visibility reads invitee email from JWT claim
-- ------------------------------------------------------------

DROP POLICY IF EXISTS workspace_invitations_select_member ON public.workspace_invitations;

CREATE POLICY workspace_invitations_select_member ON public.workspace_invitations FOR SELECT TO public
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM public.workspace_members wm2 WHERE wm2.user_id = auth.uid()
    )
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

-- ------------------------------------------------------------
-- INV-01: create_workspace_invitation() and
--         revoke_workspace_invitation() per PRD §4.1
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
    p_workspace_id uuid,
    p_email text,
    p_role text DEFAULT 'member',
    p_permissions jsonb DEFAULT '{}'::jsonb,
    p_expires_at timestamptz DEFAULT NULL
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

    RETURN v_invite_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_workspace_invitation(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
    v_status text;
BEGIN
    SELECT workspace_id, status INTO v_workspace_id, v_status
    FROM public.workspace_invitations
    WHERE id = p_invite_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    IF v_status != 'pending' THEN
        RAISE EXCEPTION 'Cannot revoke an invitation that is already %', v_status;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND (role = 'owner' OR (permissions->>'invite_members')::boolean = true)
    ) THEN
        RAISE EXCEPTION 'Not authorized to revoke invitations in this workspace';
    END IF;

    UPDATE public.workspace_invitations
    SET status = 'revoked'
    WHERE id = p_invite_id;
END;
$function$;

-- ------------------------------------------------------------
-- GRANTS UNIQUE: PRD §5 line 286
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitation_entity_grants_invite_entity_resource_action_key
  ON public.workspace_invitation_entity_grants (invite_id, entity_id, resource, action);

-- ------------------------------------------------------------
-- CROSS-WORKSPACE GUARD: reject entity grants that point to an
-- entity outside the invitation's workspace. Enforced at
-- invite-creation (trigger) and at acceptance (join filter).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_workspace_invitation_entity_workspace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM public.workspace_invitations
    WHERE id = NEW.invite_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Invitation does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.entities
        WHERE id = NEW.entity_id AND workspace_id = v_workspace_id
    ) THEN
        RAISE EXCEPTION 'Entity does not belong to the invitation workspace';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_workspace_invitation_entity_grants_workspace_guard ON public.workspace_invitation_entity_grants;

CREATE TRIGGER trg_workspace_invitation_entity_grants_workspace_guard
  BEFORE INSERT OR UPDATE OF entity_id ON public.workspace_invitation_entity_grants
  FOR EACH ROW EXECUTE FUNCTION public.guard_workspace_invitation_entity_workspace();

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

    IF lower(auth.jwt() ->> 'email') != lower(v_invite.email) THEN
        RAISE EXCEPTION 'Email does not match invitation';
    END IF;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
    VALUES (v_invite.workspace_id, auth.uid(), v_invite.workspace_role, v_invite.workspace_permissions);

    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT wieg.entity_id, auth.uid(), wieg.resource, wieg.action
    FROM public.workspace_invitation_entity_grants wieg
    JOIN public.entities e ON e.id = wieg.entity_id AND e.workspace_id = v_invite.workspace_id
    WHERE wieg.invite_id = p_invite_id
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    UPDATE public.workspace_invitations
    SET status = 'accepted'
    WHERE id = p_invite_id;
END;
$function$;