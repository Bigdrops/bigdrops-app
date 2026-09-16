-- =====================================================================
-- ROLE ASSIGNMENTS AND TEMPLATE MANAGEMENT
--
-- PRD multi-tenancy v2.1 §3.6, §3.11; ERP Frontend PRD v1.5 §12.8, §12.9.
--
-- Problem: roles are templates (conveniences). Applying a role expands its
-- items into entity_permissions rows. The database had no record of WHICH
-- member holds WHICH role on WHICH company. Team Hub used coversTemplate()
-- over effective permissions as a heuristic, which misreports when grants
-- overlap (shows "on" for members who were never assigned, "off" for
-- members granted through other sources).
--
-- This migration:
--   1. Creates public.entity_role_assignments: the explicit assignment
--      record (entity, user, template). UNIQUE per (entity, user, template).
--      This table carries NO authority. entity_permissions remains the
--      authorization engine. No tenant RLS policy changes.
--   2. Evolves assign_role_to_company_member() to write the assignment
--      row. All existing safety checks are preserved: workspace match,
--      company membership, delegation ceiling.
--   3. Evolves remove_role_from_company_member() to delete the assignment
--      row. Permission cleanup is now SOURCE-AWARE: a template item pair
--      is deleted from the member's effective rows only when no other
--      assignment of that member covers it. The company-membership
--      baseline row ('*', 'view') is never deleted.
--   4. Adds Role Builder RPCs: create_permission_template,
--      update_permission_template, delete_permission_template,
--      duplicate_permission_template. All owner-only, with canonical
--      resource/action validation (PRD §3.4.1).
--   5. Adds sync_permission_template_assignments(p_template_id, p_mode):
--      'additive' (default, safe) expands current items to every holder.
--      'enforce' (explicit, owner-invoked) also subtracts pairs no longer
--      supplied by any of the holder's assignments. Owners are never
--      subtracted (their baseline is authoritative).
--
-- Template edit semantics (ERP PRD §20 deferral honored): editing a template
-- immediately ADDS newly granted abilities to existing holders (safe,
-- additive). Removing abilities from holders requires the explicit
-- 'enforce' sync. The UI must not claim removal happened when it did not.
--
-- Suspension/banishment: NOT in this migration. Classified separately.
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. ASSIGNMENT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entity_role_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL,
    template_id uuid NOT NULL REFERENCES public.permission_templates(id) ON DELETE CASCADE,
    granted_by  uuid,
    granted_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (entity_id, user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_role_assignments_entity_user
    ON public.entity_role_assignments USING btree (entity_id, user_id);
CREATE INDEX IF NOT EXISTS idx_entity_role_assignments_template
    ON public.entity_role_assignments USING btree (template_id);

ALTER TABLE public.entity_role_assignments ENABLE ROW LEVEL SECURITY;

-- Read: workspace members (Team Hub display) — entity resolves to workspace.
CREATE POLICY entity_role_assignments_select_member ON public.entity_role_assignments
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1
            FROM public.entities e
            JOIN public.workspace_members wm ON wm.workspace_id = e.workspace_id
            WHERE e.id = entity_role_assignments.entity_id
              AND wm.user_id = auth.uid()
        )
    );

-- No INSERT/UPDATE/DELETE policies: writes go through the SECURITY DEFINER
-- RPCs only. Deny-by-default for direct client writes.

-- ============================================================
-- 2. CANONICAL RESOURCE/ACTION VALIDATION (PRD §3.4.1)
-- ============================================================

CREATE OR REPLACE FUNCTION public._perm_pair_is_canonical(p_resource text, p_action text)
RETURNS boolean
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_action NOT IN ('view', 'create', 'edit', 'delete') THEN
        RETURN FALSE;
    END IF;
    RETURN p_resource IN (
        '*', 'invoice', 'quotation', 'payment', 'receipt', 'setting', 'waybill',
        'boq', 'rfq', 'csr', 'item', 'project', 'project_document', 'client',
        'signatory', 'bank_account', 'letter', 'tax_setting', 'account',
        'period', 'journal', 'source_transaction', 'audit', 'device'
    );
END;
$function$;

-- Validate a jsonb items array: array of objects with canonical
-- resource/action text values. Raises on any invalid entry.
CREATE OR REPLACE FUNCTION public._assert_template_items_valid(p_items jsonb)
RETURNS void
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
DECLARE
    v_item jsonb;
    v_resource text;
    v_action text;
BEGIN
    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Items must be a JSON array';
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
            RAISE EXCEPTION 'Each item must be an object';
        END IF;
        v_resource := v_item ->> 'resource';
        v_action   := v_item ->> 'action';
        IF v_resource IS NULL OR v_action IS NULL THEN
            RAISE EXCEPTION 'Each item needs resource and action';
        END IF;
        IF NOT public._perm_pair_is_canonical(v_resource, v_action) THEN
            RAISE EXCEPTION 'Non-canonical permission pair: % / %', v_resource, v_action;
        END IF;
    END LOOP;
END;
$function$;

-- ============================================================
-- 3. EVOLVED ASSIGNMENT RPCs (all prior safety checks preserved)
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

    -- Authoritative assignment record (display state; no authority).
    INSERT INTO public.entity_role_assignments (entity_id, user_id, template_id, granted_by)
    VALUES (p_entity_id, p_user_id, p_template_id, auth.uid())
    ON CONFLICT (entity_id, user_id, template_id)
    DO UPDATE SET granted_by = EXCLUDED.granted_by, granted_at = now();
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

    -- Source-aware cleanup: delete an item pair from the member's effective
    -- rows only when NO OTHER assignment of that member on this entity
    -- covers the pair. Wildcards inside assignment items count as coverage.
    -- The company-membership baseline pair ('*', 'view') is never deleted:
    -- invitation acceptance grants it independently of any role.
    -- Workspace owners are never subtracted at all: their creator baseline
    -- is authoritative and has no assignment record to prove sourcing.
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_template_workspace_id
          AND user_id = p_user_id
          AND role = 'owner'
    ) THEN
        DELETE FROM public.entity_permissions ep
        USING public.permission_template_items pti
        WHERE ep.entity_id = p_entity_id
          AND ep.user_id = p_user_id
          AND pti.template_id = p_template_id
          AND ep.resource = pti.resource
          AND ep.action = pti.action
          AND NOT (ep.resource = '*' AND ep.action = 'view')
          AND NOT EXISTS (
              SELECT 1
              FROM public.entity_role_assignments ra
              JOIN public.permission_template_items cover
                ON cover.template_id = ra.template_id
              WHERE ra.entity_id = p_entity_id
                AND ra.user_id = p_user_id
                AND ra.template_id <> p_template_id
                AND (cover.resource = ep.resource OR cover.resource = '*')
                AND (cover.action = ep.action OR cover.action = '*')
          );
    END IF;

    -- Drop the authoritative assignment record.
    DELETE FROM public.entity_role_assignments
    WHERE entity_id = p_entity_id
      AND user_id = p_user_id
      AND template_id = p_template_id;
END;
$function$;

-- ============================================================
-- 4. ROLE BUILDER RPCs (owner-only, canonical validation)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_permission_template(
    p_workspace_id uuid,
    p_name text,
    p_description text,
    p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_template_id uuid;
    v_name text;
BEGIN
    -- Delegation ceiling: template management is workspace-owner authority.
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the workspace owner can manage roles';
    END IF;

    v_name := btrim(coalesce(p_name, ''));
    IF v_name = '' OR length(v_name) > 100 THEN
        RAISE EXCEPTION 'Role name must be 1-100 characters';
    END IF;

    PERFORM public._assert_template_items_valid(p_items);

    IF EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = p_workspace_id AND name = v_name
    ) THEN
        RAISE EXCEPTION 'A role named % already exists in this workspace', v_name;
    END IF;

    INSERT INTO public.permission_templates (workspace_id, name, description, created_by)
    VALUES (p_workspace_id, v_name, p_description, auth.uid())
    RETURNING id INTO v_template_id;

    INSERT INTO public.permission_template_items (template_id, resource, action)
    SELECT v_template_id,
           item ->> 'resource',
           item ->> 'action'
    FROM jsonb_array_elements(p_items) AS item
    ON CONFLICT (template_id, resource, action) DO NOTHING;

    RETURN v_template_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_permission_template(
    p_template_id uuid,
    p_name text,
    p_description text,
    p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
    v_name text;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM public.permission_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the workspace owner can manage roles';
    END IF;

    v_name := btrim(coalesce(p_name, ''));
    IF v_name = '' OR length(v_name) > 100 THEN
        RAISE EXCEPTION 'Role name must be 1-100 characters';
    END IF;

    PERFORM public._assert_template_items_valid(p_items);

    IF EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = v_workspace_id AND name = v_name AND id <> p_template_id
    ) THEN
        RAISE EXCEPTION 'A role named % already exists in this workspace', v_name;
    END IF;

    UPDATE public.permission_templates
    SET name = v_name, description = p_description
    WHERE id = p_template_id;

    -- Replace the item set. Existing effective permissions are NOT reduced
    -- here (PRD §3.6/§20: template edits never silently revoke); the new
    -- abilities are expanded to every holder additively below. Revocation
    -- requires the explicit enforce sync (§5).
    DELETE FROM public.permission_template_items WHERE template_id = p_template_id;

    INSERT INTO public.permission_template_items (template_id, resource, action)
    SELECT p_template_id,
           item ->> 'resource',
           item ->> 'action'
    FROM jsonb_array_elements(p_items) AS item
    ON CONFLICT (template_id, resource, action) DO NOTHING;

    -- Additive expansion to every holder of this template.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action, granted_by)
    SELECT ra.entity_id, ra.user_id, pti.resource, pti.action, ra.granted_by
    FROM public.entity_role_assignments ra
    JOIN public.permission_template_items pti ON pti.template_id = ra.template_id
    WHERE ra.template_id = p_template_id
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_permission_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM public.permission_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the workspace owner can manage roles';
    END IF;

    -- PRD §3.11: deleting a role never revokes permissions already expanded
    -- for users. entity_permissions rows are untouched; assignments and
    -- items cascade with the template.
    DELETE FROM public.permission_templates WHERE id = p_template_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.duplicate_permission_template(
    p_template_id uuid,
    p_new_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
    v_new_id uuid;
    v_name text;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM public.permission_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the workspace owner can manage roles';
    END IF;

    v_name := btrim(coalesce(p_new_name, ''));
    IF v_name = '' OR length(v_name) > 100 THEN
        RAISE EXCEPTION 'Role name must be 1-100 characters';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.permission_templates
        WHERE workspace_id = v_workspace_id AND name = v_name
    ) THEN
        RAISE EXCEPTION 'A role named % already exists in this workspace', v_name;
    END IF;

    INSERT INTO public.permission_templates (workspace_id, name, description, created_by)
    SELECT workspace_id, v_name, description, auth.uid()
    FROM public.permission_templates
    WHERE id = p_template_id
    RETURNING id INTO v_new_id;

    INSERT INTO public.permission_template_items (template_id, resource, action)
    SELECT v_new_id, resource, action
    FROM public.permission_template_items
    WHERE template_id = p_template_id
    ON CONFLICT (template_id, resource, action) DO NOTHING;

    RETURN v_new_id;
END;
$function$;

-- ============================================================
-- 5. SYNC PRIMITIVE
-- ============================================================

-- p_mode = 'additive' (default): expand current items to every holder.
-- p_mode = 'enforce': additive plus subtractive pass — for every holder,
-- delete effective rows not covered by ANY of that holder's assignments.
-- Protected in enforce mode: the ('*', 'view') company-membership baseline,
-- and workspace owners (their baseline is authoritative).
CREATE OR REPLACE FUNCTION public.sync_permission_template_assignments(
    p_template_id uuid,
    p_mode text DEFAULT 'additive'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_workspace_id uuid;
    v_removed integer := 0;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM public.permission_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = auth.uid()
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only the workspace owner can manage roles';
    END IF;

    IF p_mode NOT IN ('additive', 'enforce') THEN
        RAISE EXCEPTION 'Mode must be additive or enforce';
    END IF;

    -- Additive: every holder receives every current item pair.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action, granted_by)
    SELECT ra.entity_id, ra.user_id, pti.resource, pti.action, ra.granted_by
    FROM public.entity_role_assignments ra
    JOIN public.permission_template_items pti ON pti.template_id = ra.template_id
    WHERE ra.template_id = p_template_id
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    IF p_mode = 'enforce' THEN
        -- Subtract effective rows of holders that no assignment supplies.
        WITH holders AS (
            SELECT DISTINCT ra.entity_id, ra.user_id
            FROM public.entity_role_assignments ra
            WHERE ra.template_id = p_template_id
        ),
        desired AS (
            SELECT ra.entity_id, ra.user_id, cover.resource, cover.action
            FROM public.entity_role_assignments ra
            JOIN public.permission_template_items cover
              ON cover.template_id = ra.template_id
            WHERE (ra.entity_id, ra.user_id) IN (
                SELECT entity_id, user_id FROM holders
            )
        ),
        deletable AS (
            SELECT ep.id
            FROM public.entity_permissions ep
            JOIN holders h ON h.entity_id = ep.entity_id AND h.user_id = ep.user_id
            WHERE NOT EXISTS (
                SELECT 1 FROM desired d
                WHERE d.entity_id = ep.entity_id
                  AND d.user_id = ep.user_id
                  AND (d.resource = ep.resource OR d.resource = '*')
                  AND (d.action = ep.action OR d.action = '*')
            )
              AND NOT (ep.resource = '*' AND ep.action = 'view')
              AND NOT EXISTS (
                  SELECT 1 FROM public.workspace_members wm
                  JOIN public.entities e ON e.workspace_id = wm.workspace_id
                  WHERE e.id = ep.entity_id
                    AND wm.user_id = ep.user_id
                    AND wm.role = 'owner'
              )
        )
        DELETE FROM public.entity_permissions ep
        USING deletable d
        WHERE ep.id = d.id;
        GET DIAGNOSTICS v_removed = ROW_COUNT;
    END IF;

    RETURN v_removed;
END;
$function$;
