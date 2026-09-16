-- =====================================================================
-- Engineer template: restore invoice and quotation operational grants.
--
-- PRD multi-tenancy v2.0 §3.3 (entity roles) defines Engineer as
-- "Create/edit invoices, waybills, quotations, projects". The seed in
-- 20260819000000_preloaded_roles_and_assignment.sql grants the Engineer
-- template (*) view plus create/edit on project, waybill, boq, rfq, csr
-- and item, but omits invoice and quotation. The omission breaks the
-- operational chain (BOQ/RFQ/CSR/Waybill → Quotation → Invoice) for
-- every member assigned the Engineer template: quotation and invoice
-- saves fail at the tenant RLS gate (has_entity_permission), surfacing
-- as single-object coercion errors on the ...select().single() paths
-- instead of clean authorization results.
--
-- boq/rfq/csr/item create/edit are later coherent extensions of the
-- operational template and are preserved unchanged. Viewer, Manager and
-- Company Admin definitions are untouched.
--
-- This migration:
--   1. Redefines seed_preloaded_role_templates() with invoice and
--      quotation added to the Engineer operational resource list.
--      All other blocks are byte-identical to 20260819000000.
--   2. Backfills the 4 missing items into every existing 'Engineer'
--      template. Additive only; removes nothing. Idempotent via
--      ON CONFLICT DO NOTHING on
--      permission_template_items_template_id_resource_action_key.
--
-- Note: applying a template is a one-time copy (PRD v2.1 §3.6). Members
-- who already received the Engineer template gain the new abilities the
-- next time a workspace owner (re)assigns the role via
-- assign_role_to_company_member(). No entity_permissions rows are
-- written here; no user receives a direct grant from this migration.
-- =====================================================================

-- ============================================================
-- 1. SEED FUNCTION (Engineer block extended; rest unchanged)
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
    -- operational resources, including invoices and quotations
    -- (PRD v2.0 §3.3).
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
        FROM (VALUES ('project'), ('waybill'), ('boq'), ('rfq'), ('csr'), ('item'), ('invoice'), ('quotation')) AS r(resource)
        CROSS JOIN (VALUES ('create'), ('edit')) AS a(action);
    END IF;
END;
$function$;

-- ============================================================
-- 2. BACKFILL existing Engineer templates (additive, idempotent)
-- ============================================================

INSERT INTO public.permission_template_items (template_id, resource, action)
SELECT pt.id, r.resource, a.action
FROM public.permission_templates pt
CROSS JOIN (VALUES ('invoice'), ('quotation')) AS r(resource)
CROSS JOIN (VALUES ('create'), ('edit')) AS a(action)
WHERE pt.name = 'Engineer'
ON CONFLICT (template_id, resource, action) DO NOTHING;
