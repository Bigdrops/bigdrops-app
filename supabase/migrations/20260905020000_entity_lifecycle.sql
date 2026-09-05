-- ============================================================================
-- Migration: entity_lifecycle
-- Date: 2026-09-05
-- ============================================================================
-- Implements PRD v2.1 §8A: Entity Lifecycle — Soft Delete Only.
--
-- 1. Schema changes: entities.status, entities.archived_at, is_active sync trigger.
-- 2. RPCs: archive_entity(), restore_entity(), purge_entity().
-- 3. RLS: Replace entities_delete_member to prohibit hard-delete except for purged entities.
-- 4. Audit: entity_lifecycle_audit table + get_entity_lifecycle_audit() RPC.
--
-- Authoritative spec: docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md §8A
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. SCHEMA CHANGES
-- ──────────────────────────────────────────────────────────────────────────────

-- 1.1 Add status column (§8A.1)
ALTER TABLE public.entities
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','archived','purging','purged'));

-- 1.2 Add archived_at timestamp (§8A.1)
ALTER TABLE public.entities
    ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 1.3 Trigger function: sync is_active with status (§8A.1 backward compat)
CREATE OR REPLACE FUNCTION public._sync_entity_is_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.is_active := (NEW.status = 'active');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_entity_is_active ON public.entities;
CREATE TRIGGER trg_sync_entity_is_active
    BEFORE INSERT OR UPDATE OF status ON public.entities
    FOR EACH ROW EXECUTE FUNCTION public._sync_entity_is_active();

-- 1.4 Backfill: set status from existing is_active for any rows with default status
UPDATE public.entities
SET status = CASE WHEN is_active THEN 'active' ELSE 'archived' END
WHERE status IS DISTINCT FROM CASE WHEN is_active THEN 'active' ELSE 'archived' END;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1B. AUDIT TABLE (created before §2: the LANGUAGE sql getter in §2.4 is
-- validated at CREATE time, so its referenced table must already exist)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.entity_lifecycle_audit (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id     uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    action        text NOT NULL CHECK (action IN ('archived', 'restored', 'purging', 'purged')),
    performed_by  uuid NOT NULL,
    performed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_audit_entity_id
    ON public.entity_lifecycle_audit USING btree (entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_audit_performed_at
    ON public.entity_lifecycle_audit USING btree (performed_at);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. LIFECYCLE RPCs
-- ──────────────────────────────────────────────────────────────────────────────

-- 2.1 archive_entity() — §8A.2
CREATE OR REPLACE FUNCTION public.archive_entity(p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_workspace_id uuid;
    v_caller_id uuid := auth.uid();
    v_status text;
    v_is_owner boolean;
    v_has_permission boolean;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT workspace_id, status INTO v_workspace_id, v_status
    FROM public.entities WHERE id = p_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Entity not found: %', p_entity_id;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id AND user_id = v_caller_id AND role = 'owner'
    ) INTO v_is_owner;

    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = v_caller_id
          AND (permissions->>'archive_entity')::boolean = true
    ) INTO v_has_permission;

    IF NOT v_is_owner AND NOT v_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions: must be workspace owner or hold archive_entity permission'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF v_status != 'active' THEN
        RAISE EXCEPTION 'Cannot archive entity in status: % (must be active)', v_status;
    END IF;

    UPDATE public.entities
    SET status = 'archived', archived_at = now(), is_active = false
    WHERE id = p_entity_id;

    INSERT INTO public.entity_lifecycle_audit (entity_id, action, performed_by)
    VALUES (p_entity_id, 'archived', v_caller_id);
END;
$$;

COMMENT ON FUNCTION public.archive_entity IS
    'Archive an entity (§8A.2). Sets status=archived, archived_at=now(). '
    'Caller must be workspace owner or hold archive_entity permission.';

-- 2.2 restore_entity() — §8A.3
CREATE OR REPLACE FUNCTION public.restore_entity(p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_workspace_id uuid;
    v_caller_id uuid := auth.uid();
    v_status text;
    v_is_owner boolean;
    v_has_permission boolean;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT workspace_id, status INTO v_workspace_id, v_status
    FROM public.entities WHERE id = p_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Entity not found: %', p_entity_id;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id AND user_id = v_caller_id AND role = 'owner'
    ) INTO v_is_owner;

    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND user_id = v_caller_id
          AND (permissions->>'archive_entity')::boolean = true
    ) INTO v_has_permission;

    IF NOT v_is_owner AND NOT v_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions: must be workspace owner or hold archive_entity permission'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF v_status != 'archived' THEN
        RAISE EXCEPTION 'Cannot restore entity in status: % (must be archived)', v_status;
    END IF;

    UPDATE public.entities
    SET status = 'active', archived_at = NULL, is_active = true
    WHERE id = p_entity_id;

    INSERT INTO public.entity_lifecycle_audit (entity_id, action, performed_by)
    VALUES (p_entity_id, 'restored', v_caller_id);
END;
$$;

COMMENT ON FUNCTION public.restore_entity IS
    'Restore an archived entity (§8A.3). Sets status=active, archived_at=NULL. '
    'Caller must be workspace owner or hold archive_entity permission.';

-- 2.3 purge_entity() — §8A.4 (physical teardown)
CREATE OR REPLACE FUNCTION public.purge_entity(p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_workspace_id uuid;
    v_caller_id uuid := auth.uid();
    v_status text;
    v_entity_slug text;
    v_ws_slug text;
    v_schema_name text;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT e.workspace_id, e.status, e.slug, w.slug
    INTO v_workspace_id, v_status, v_entity_slug, v_ws_slug
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE e.id = p_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Entity not found: %', p_entity_id;
    END IF;

    -- Only workspace owner or platform operator may purge
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id AND user_id = v_caller_id AND role = 'owner'
    ) AND NOT public.is_platform_operator(v_caller_id, 'owner') THEN
        RAISE EXCEPTION 'Only workspace owner or platform operator may purge entities';
    END IF;

    IF v_status NOT IN ('archived', 'purged') THEN
        RAISE EXCEPTION 'Cannot purge entity in status: % (must be archived)', v_status;
    END IF;

    -- 30-day retention gate (§8A.4): reject purge before retention elapses
    IF v_status = 'archived' THEN
        IF (SELECT archived_at FROM public.entities WHERE id = p_entity_id)
           > now() - interval '30 days' THEN
            RAISE EXCEPTION 'Entity must be archived for at least 30 days before purge. Retry after %',
                (SELECT archived_at + interval '30 days' FROM public.entities WHERE id = p_entity_id)
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- Advisory lock: prevent concurrent purge on same entity
    PERFORM pg_advisory_xact_lock(hashtext(p_entity_id::text));

    -- Step 1: status = purging
    UPDATE public.entities SET status = 'purging' WHERE id = p_entity_id;

    -- Audit: purge initiation
    INSERT INTO public.entity_lifecycle_audit (entity_id, action, performed_by)
    VALUES (p_entity_id, 'purging', v_caller_id);

    -- Step 2: provisioning status = purging
    UPDATE public.entity_provisioning_status
    SET status = 'purging', updated_at = now()
    WHERE entity_id = p_entity_id;

    -- Step 3: DROP SCHEMA CASCADE
    v_schema_name := 'entity_' || v_ws_slug || '_' || v_entity_slug;
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_schema_name) THEN
        EXECUTE format('DROP SCHEMA %I CASCADE', v_schema_name);
    END IF;

    -- Step 4: Delete entity_permissions
    DELETE FROM public.entity_permissions WHERE entity_id = p_entity_id;

    -- Step 5: Delete entity_provisioning_status
    DELETE FROM public.entity_provisioning_status WHERE entity_id = p_entity_id;

    -- Step 6: status = purged
    UPDATE public.entities SET status = 'purged' WHERE id = p_entity_id;

    -- Audit
    INSERT INTO public.entity_lifecycle_audit (entity_id, action, performed_by)
    VALUES (p_entity_id, 'purged', v_caller_id);
END;
$$;

COMMENT ON FUNCTION public.purge_entity IS
    'Purge an entity: enforces 30-day retention, DROP SCHEMA CASCADE, delete permissions and provisioning. '
    'Irreversible. Caller must be workspace owner or platform operator.';

-- 2.4 get_entity_lifecycle_audit() — §8A.9
CREATE OR REPLACE FUNCTION public.get_entity_lifecycle_audit(p_entity_id uuid)
RETURNS TABLE(
    id uuid,
    entity_id uuid,
    action text,
    performed_by uuid,
    performed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT ela.id, ela.entity_id, ela.action, ela.performed_by, ela.performed_at
    FROM public.entity_lifecycle_audit ela
    JOIN public.entities e ON e.id = ela.entity_id
    WHERE ela.entity_id = p_entity_id
      AND public.is_workspace_member(e.workspace_id, auth.uid());
$function$;

REVOKE ALL ON FUNCTION public.get_entity_lifecycle_audit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_entity_lifecycle_audit(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. RLS: REPLACE entities_delete_member (§8A.5)
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS entities_delete_member ON public.entities;

CREATE POLICY entities_delete_purged ON public.entities FOR DELETE TO authenticated
    USING (
        status = 'purged'
        AND (
            workspace_id IN (
                SELECT wm2.workspace_id FROM workspace_members wm2
                WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
            )
            OR public.is_platform_operator(auth.uid(), 'owner')
        )
    );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. AUDIT TABLE — moved to §1B above (LANGUAGE sql validation order).
-- Table definition lives there; nothing remains to create here.
-- ──────────────────────────────────────────────────────────────────────────────
