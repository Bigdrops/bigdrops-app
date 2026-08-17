-- =====================================================================
-- Preloaded role templates and company role assignment.
--
-- PRD multi-tenancy-v2.1 §3.6, §3.11:
--   - Every workspace receives preloaded role templates when it becomes
--     active. The PRD-set starter roles are:
--       Company Admin  comprehensive company-scoped template
--       Engineer       operational template
--       Manager        operational template
--       Viewer         read-only template
--   - Workspace Admin is NOT a template. It is the owner role plus
--     governance toggles on workspace_members.permissions.
--   - Roles are assignable only to existing members of the company
--     (entity). Roles never cross companies.
--   - Delegation ceiling (§12.8): a user cannot assign a role whose
--     abilities exceed the abilities available to that user. Enforced
--     by requiring the assigner to hold every ability in the template
--     on the target entity, unless the assigner is the workspace owner.
--
-- This migration:
--   1. Defines seed_preloaded_role_templates(p_workspace_id). It is
--      idempotent: a template is inserted only when no template with
--      the same name exists for the workspace.
--   2. Adds an AFTER INSERT OR UPDATE trigger on workspaces so the
--      templates are seeded when a workspace becomes 'active'. This
--      covers approve_workspace(), which is SECURITY DEFINER and is
--      NOT edited here.
--   3. Backfills every currently active workspace.
--   4. Defines assign_role_to_company_member() and
--      remove_role_from_company_member() with workspace-owner or
--      delegation-ceiling authorization, a cross-company guard, and a
--      company-membership requirement for the target user.
--
-- The starter templates are editable defaults. They are not part of
-- any locked business rule and may be changed by workspace owners.
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. SEED FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_preloaded_role_templates(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_template_id uuid;
    v_created_by uuid;
    v_active boolean;
BEGIN
    SELECT created_by, status = 'active'
    INTO v_created_by, v_active
    FROM public.workspaces
    WHERE id = p_workspace_id;

    IF NOT FOUND OR NOT v_active THEN
        RETURN;
    END IF;

    -- Company Admin: comprehensive company-scoped template.
    IF NOT EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = p_workspace_id AND name = 'Company Admin'
    ) THEN
        INSERT INTO public.permission_templates (workspace_id, name, description, created_by)
        VALUES (p_workspace_id, 'Company Admin',
                'Full access to every resource and action within this company.',
                v_created_by)
        RETURNING id INTO v_template_id;

        INSERT INTO public.permission_template_items (template_id, resource, action)
        SELECT v_template_id, r.resource, a.action
        FROM (VALUES ('*')) AS r(resource)
        CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('delete')) AS a(action);
    END IF;

    -- Viewer: read-only across the company.
    IF NOT EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = p_workspace_id AND name = 'Viewer'
    ) THEN
        INSERT INTO public.permission_templates (workspace_id, name, description, created_by)
        VALUES (p_workspace_id, 'Viewer',
                'Read-only access across this company.',
                v_created_by)
        RETURNING id INTO v_template_id;

        INSERT INTO public.permission_template_items (template_id, resource, action)
        SELECT v_template_id, r.resource, a.action
        FROM (VALUES ('*')) AS r(resource)
        CROSS JOIN (VALUES ('view')) AS a(action);
    END IF;

    -- Manager: view, create, edit across the company.
    IF NOT EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = p_workspace_id AND name = 'Manager'
    ) THEN
        INSERT INTO public.permission_templates (workspace_id, name, description, created_by)
        VALUES (p_workspace_id, 'Manager',
                'Create and edit operational records across this company.',
                v_created_by)
        RETURNING id INTO v_template_id;

        INSERT INTO public.permission_template_items (template_id, resource, action)
        SELECT v_template_id, r.resource, a.action
        FROM (VALUES ('*')) AS r(resource)
        CROSS JOIN (VALUES ('view'), ('create'), ('edit')) AS a(action);
    END IF;

    -- Engineer: view across the company plus create and edit on the
    -- operational resources.
    IF NOT EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = p_workspace_id AND name = 'Engineer'
    ) THEN
        INSERT INTO public.permission_templates (workspace_id, name, description, created_by)
        VALUES (p_workspace_id, 'Engineer',
                'View across the company; create and edit operational records.',
                v_created_by)
        RETURNING id INTO v_template_id;

        INSERT INTO public.permission_template_items (template_id, resource, action)
        SELECT v_template_id, r.resource, a.action
        FROM (VALUES ('*')) AS r(resource)
        CROSS JOIN (VALUES ('view')) AS a(action)
        UNION ALL
        SELECT v_template_id, r.resource, a.action
        FROM (VALUES ('project'), ('waybill'), ('boq'), ('rfq'), ('csr'), ('item')) AS r(resource)
        CROSS JOIN (VALUES ('create'), ('edit')) AS a(action);
    END IF;
END;
$function$;

-- ============================================================
-- 2. TRIGGER: seed when a workspace becomes active
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_preloaded_roles_on_workspace_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'active' THEN
        PERFORM public.seed_preloaded_role_templates(NEW.id);
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_workspaces_seed_preloaded_roles ON public.workspaces;

CREATE TRIGGER trg_workspaces_seed_preloaded_roles
    AFTER INSERT OR UPDATE OF status ON public.workspaces
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION public.seed_preloaded_roles_on_workspace_activation();

-- ============================================================
-- 3. BACKFILL existing active workspaces
-- ============================================================

DO $block$
DECLARE
    v_workspace record;
BEGIN
    FOR v_workspace IN
        SELECT id FROM public.workspaces WHERE status = 'active'
    LOOP
        PERFORM public.seed_preloaded_role_templates(v_workspace.id);
    END LOOP;
END;
$block$;

-- ============================================================
-- 4. COMPANY ROLE ASSIGNMENT RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_role_to_company_member(
    p_template_id uuid,
    p_entity_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_template_workspace_id uuid;
    v_entity_workspace_id uuid;
    v_is_owner boolean;
    v_item record;
BEGIN
    SELECT workspace_id INTO v_template_workspace_id
    FROM public.permission_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    SELECT workspace_id INTO v_entity_workspace_id
    FROM public.entities
    WHERE id = p_entity_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entity does not exist';
    END IF;

    IF v_template_workspace_id != v_entity_workspace_id THEN
        RAISE EXCEPTION 'Template and entity belong to different workspaces';
    END IF;

    -- Target must already be a member of the company. Company membership
    -- is signalled by holding at least one entity permission on the
    -- entity (creator seed and invitation acceptance both create grants).
    IF NOT EXISTS (
        SELECT 1 FROM public.entity_permissions
        WHERE entity_id = p_entity_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this company';
    END IF;

    -- Assigner authorization: workspace owner, or holds every ability in
    -- the template on the target entity (delegation ceiling, PRD §12.8).
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_template_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        FOR v_item IN
            SELECT resource, action
            FROM public.permission_template_items
            WHERE template_id = p_template_id
        LOOP
            IF NOT public.has_entity_permission(p_entity_id, auth.uid(), v_item.resource, v_item.action) THEN
                RAISE EXCEPTION 'Not authorized to assign this role';
            END IF;
        END LOOP;
    END IF;

    PERFORM public.apply_permission_template(p_template_id, p_entity_id, p_user_id, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_role_from_company_member(
    p_template_id uuid,
    p_entity_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_template_workspace_id uuid;
    v_entity_workspace_id uuid;
    v_is_owner boolean;
BEGIN
    SELECT workspace_id INTO v_template_workspace_id
    FROM public.permission_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    SELECT workspace_id INTO v_entity_workspace_id
    FROM public.entities
    WHERE id = p_entity_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entity does not exist';
    END IF;

    IF v_template_workspace_id != v_entity_workspace_id THEN
        RAISE EXCEPTION 'Template and entity belong to different workspaces';
    END IF;

    -- Assigner authorization: workspace owner, or holds every ability in
    -- the template on the target entity (delegation ceiling, PRD §12.8).
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_template_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        FOR v_item IN
            SELECT resource, action
            FROM public.permission_template_items
            WHERE template_id = p_template_id
        LOOP
            IF NOT public.has_entity_permission(p_entity_id, auth.uid(), v_item.resource, v_item.action) THEN
                RAISE EXCEPTION 'Not authorized to remove this role';
            END IF;
        END LOOP;
    END IF;

    -- ponytail: entity_permissions has no grant-source column, so removal
    -- deletes every matching (resource, action) pair for the entity and
    -- user regardless of which grant produced it. If a pair also came from
    -- the creator seed or an invitation grant, it is removed too.
    DELETE FROM public.entity_permissions ep
    USING public.permission_template_items pti
    WHERE ep.entity_id = p_entity_id
      AND ep.user_id = p_user_id
      AND pti.template_id = p_template_id
      AND ep.resource = pti.resource
      AND ep.action = pti.action;
END;
$function$;