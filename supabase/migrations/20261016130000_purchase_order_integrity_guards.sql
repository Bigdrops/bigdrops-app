-- ============================================================
-- PHASE C1.2 — SUPPLIER PURCHASE ORDER DATABASE INTEGRITY GUARDS
-- ============================================================
-- Closes the direct-table-write lifecycle bypass identified in C1.1.
-- The C1.1 save RPC enforces document immutability, but a table write
-- that does not go through the RPC could rewrite issued costs,
-- re-point supplier identity, or reactivate a terminal document.
--
-- This migration adds row-level guards that apply to EVERY writer,
-- RPC or direct, with no bypass flag and no session-variable escape
-- hatch:
--
--   * `purchase_orders`: identity (number, supplier id, frozen supplier
--     name) is immutable from creation on every status. Content is a
--     draft-only operation. Status movement must follow the C1
--     transition graph. Archived rows accept only the archive / restore
--     flag change, alone. Deletes are rejected: archiving is the only
--     removal path.
--   * `purchase_order_items`: insert, update and delete are allowed only
--     while the parent PO is a draft in the same transaction it was
--     created in, or a live (unarchived) draft. The parent row is locked
--     (`FOR UPDATE`), so item writes serialise with issuance and cannot
--     race it.
--
-- The authorized RPCs already obey every rule below, so their behaviour
-- is unchanged:
--   * save (create): header INSERT passes through; item INSERTs land in
--     the same transaction that created the parent.
--   * save (update, draft only): content edits and draft transitions pass.
--   * transition: status-only movement on a legal edge passes.
--   * archive / restore: the lone archive-flag change passes.
--
-- Guard functions live once in `public` and read the firing schema from
-- `TG_TABLE_SCHEMA`, so one definition protects every tenant. They run
-- with the invoker's privileges (no SECURITY DEFINER): the header guard
-- touches only OLD/NEW, and the item guard's parent read fails closed
-- under the writer's own RLS. Refusal messages reuse the exact C1.1
-- wording so the service error mapping applies to direct writes too.
--
-- Forward-only and additive. No existing function, table, column,
-- constraint, trigger, policy, or permission is removed or weakened.
-- No business data is touched. No accounting, inventory, PDF, or UI
-- change. Future tenants inherit the guards two ways: table clones
-- carry triggers (`LIKE ... INCLUDING ALL`), and the extended
-- `_prov_install_canonical_triggers()` reinstalls them on every
-- provisioned table.
-- ============================================================

-- ============================================================
-- 1. TRANSITION GRAPH — single shared predicate
-- ============================================================
-- The C1 lifecycle, expressed once for triggers. The save and
-- transition RPCs keep their own copies; this predicate governs
-- direct writes.

CREATE OR REPLACE FUNCTION public._po_transition_is_legal(p_from text, p_to text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT CASE p_from
        WHEN 'draft' THEN p_to IN ('draft', 'issued', 'cancelled')
        WHEN 'issued' THEN p_to IN ('issued', 'cancelled', 'closed')
        WHEN 'cancelled' THEN p_to = 'cancelled'
        WHEN 'closed' THEN p_to = 'closed'
        ELSE FALSE
    END;
$function$;

-- ============================================================
-- 2. HEADER GUARD — purchase_orders
-- ============================================================

CREATE OR REPLACE FUNCTION public._po_guard_purchase_orders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_old_content jsonb;
    v_new_content jsonb;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Purchase orders cannot be deleted; archive them instead'
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- The status CHECK, the supplier foreign key, and the number
        -- uniqueness constraint enforce the rest. Creating with any of
        -- the four statuses preserves the authorized create path.
        RETURN NEW;
    END IF;

    -- ── UPDATE from here on ──────────────────────────────────────

    -- Identity is immutable from creation, on every status.
    IF NEW.po_number IS DISTINCT FROM OLD.po_number
       OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
       OR NEW.supplier_name IS DISTINCT FROM OLD.supplier_name THEN
        RAISE EXCEPTION 'Purchase order identity (number, supplier) is immutable'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Content snapshots. System columns, the status, and the archive
    -- flag are excluded; everything else (dates, currency, amounts,
    -- extra charges, calculation inputs, notes, terms) is content.
    -- A column added by a later migration is guarded by default.
    v_old_content := to_jsonb(OLD) - ARRAY['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'status', 'archived_at'];
    v_new_content := to_jsonb(NEW) - ARRAY['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'status', 'archived_at'];

    -- An archived row is read-only. Restoring clears the flag alone;
    -- archiving sets it alone. Either direction with any other change
    -- is rejected, so archive / restore preserve history exactly.
    IF OLD.archived_at IS NOT NULL THEN
        IF NEW.archived_at IS NOT NULL THEN
            RAISE EXCEPTION 'Archived purchase order is read-only; restore it first'
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status
           OR v_new_content IS DISTINCT FROM v_old_content THEN
            RAISE EXCEPTION 'Restore preserves the purchase order unchanged; only the archive flag is cleared'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.archived_at IS NOT NULL THEN
        IF NEW.status IS DISTINCT FROM OLD.status
           OR v_new_content IS DISTINCT FROM v_old_content THEN
            RAISE EXCEPTION 'Archiving preserves the purchase order unchanged; only the archive flag is set'
                USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
    END IF;

    -- Status movement must follow the transition graph. Terminal
    -- documents name their own refusal, matching the RPC wording.
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status IN ('cancelled', 'closed') THEN
            RAISE EXCEPTION
                'A % purchase order is terminal and cannot transition to %',
                OLD.status, NEW.status
                USING ERRCODE = 'check_violation';
        END IF;
        IF NOT public._po_transition_is_legal(OLD.status, NEW.status) THEN
            RAISE EXCEPTION
                'Illegal purchase order transition: % -> %',
                OLD.status, NEW.status
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- Content movement is a draft-only operation. A same-status rewrite
    -- on a non-draft row is rejected here, including the case the
    -- transition graph would otherwise permit.
    IF v_new_content IS DISTINCT FROM v_old_content AND OLD.status <> 'draft' THEN
        RAISE EXCEPTION 'Purchase order content is immutable once issued; use transition_purchase_order_status for status changes'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. ITEM GUARD — purchase_order_items
-- ============================================================
-- Every item write qualifies its parent: the parent must be a live
-- draft, or the parent must have been created in the same transaction
-- (the atomic create path, where header and items commit together and
-- the header INSERT already vetted the initial status). The parent row
-- is locked, so item writes serialise with issuance and cannot race it.
-- Re-pointing an item qualifies both the old and the new parent.

CREATE OR REPLACE FUNCTION public._po_guard_purchase_order_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_parent_ids uuid[];
    v_parent_id uuid;
    v_parent_status text;
    v_parent_archived timestamptz;
    v_parent_same_txn boolean;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_parent_ids := ARRAY[OLD.purchase_order_id];
    ELSIF TG_OP = 'UPDATE' AND NEW.purchase_order_id IS DISTINCT FROM OLD.purchase_order_id THEN
        v_parent_ids := ARRAY[OLD.purchase_order_id, NEW.purchase_order_id];
    ELSE
        v_parent_ids := ARRAY[NEW.purchase_order_id];
    END IF;

    FOREACH v_parent_id IN ARRAY v_parent_ids
    LOOP
        EXECUTE format(
            'SELECT status, archived_at, (xmin = pg_current_xact_id()) FROM %I.purchase_orders WHERE id = $1 FOR UPDATE',
            TG_TABLE_SCHEMA
        ) INTO v_parent_status, v_parent_archived, v_parent_same_txn
        USING v_parent_id;

        IF v_parent_status IS NULL THEN
            RAISE EXCEPTION 'Purchase order item references a purchase order that does not exist in this tenant'
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        -- The atomic create path: the parent was born in this
        -- transaction and its header INSERT already vetted the initial
        -- status. Every later transaction must see a live draft.
        IF v_parent_same_txn THEN
            CONTINUE;
        END IF;

        IF v_parent_archived IS NOT NULL THEN
            RAISE EXCEPTION 'Archived purchase order items are read-only; restore the purchase order first'
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_parent_status <> 'draft' THEN
            RAISE EXCEPTION 'Purchase order items are immutable once the order is issued'
                USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

-- ============================================================
-- 4. PROVISIONING — extend the canonical trigger installer
-- ============================================================
-- Reproduces 20260902140000_provisioning_tenant_neutral.sql verbatim,
-- adding only the PO guard branch. Every existing caller
-- (provision_entity for new tenants, and each convergence loop below)
-- installs the guards without any further change.

CREATE OR REPLACE FUNCTION public._prov_install_canonical_triggers(
    p_target_schema text,
    p_table_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_has_updated_at boolean;
    v_has_created_by boolean;
BEGIN
    -- Check if table has updated_at column (for set_row_updated_at)
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_target_schema
          AND table_name = p_table_name
          AND column_name = 'updated_at'
    ) INTO v_has_updated_at;

    -- Check if table has created_by column (for stamp_row_ownership)
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_target_schema
          AND table_name = p_table_name
          AND column_name = 'created_by'
    ) INTO v_has_created_by;

    -- Install set_row_updated_at trigger if updated_at exists
    IF v_has_updated_at THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_set_updated_at ON %I.%I',
            p_table_name, p_target_schema, p_table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%s_set_updated_at BEFORE UPDATE ON %I.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at()',
            p_table_name, p_target_schema, p_table_name
        );
    END IF;

    -- Install stamp_row_ownership trigger if created_by exists
    IF v_has_created_by THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_stamp_ownership ON %I.%I',
            p_table_name, p_target_schema, p_table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%s_stamp_ownership BEFORE INSERT ON %I.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.stamp_row_ownership()',
            p_table_name, p_target_schema, p_table_name
        );
    END IF;

    -- Install the PO lifecycle guards on the PO tables only. The guard
    -- functions live once in public; each schema's triggers reference
    -- them and resolve the firing schema from TG_TABLE_SCHEMA.
    IF p_table_name = 'purchase_orders' THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_lifecycle_guard ON %I.%I',
            p_table_name, p_target_schema, p_table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%s_lifecycle_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.%I '
            'FOR EACH ROW EXECUTE FUNCTION public._po_guard_purchase_orders()',
            p_table_name, p_target_schema, p_table_name
        );
    END IF;

    IF p_table_name = 'purchase_order_items' THEN
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_parent_guard ON %I.%I',
            p_table_name, p_target_schema, p_table_name
        );
        EXECUTE format(
            'CREATE TRIGGER trg_%s_parent_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.%I '
            'FOR EACH ROW EXECUTE FUNCTION public._po_guard_purchase_order_items()',
            p_table_name, p_target_schema, p_table_name
        );
    END IF;
END;
$function$;

-- ============================================================
-- 5. CONVERGENCE — template and eligible existing tenants
-- ============================================================
-- Installs the guards where the PO tables exist. Schemas without the
-- PO tables (structurally incomplete tenants, or tenants converged
-- before C1) are skipped by name with a reason, following the
-- documented incomplete-tenant skip policy. Any other error aborts
-- the migration. No rows are read or written.

DO $do$
DECLARE
    v_schema        text;
    v_template      text := 'tenant_master_template';
    v_installed     text[] := ARRAY[]::text[];
    v_skipped       text[] := ARRAY[]::text[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_template) THEN
        RAISE WARNING
            'purchase order integrity guards skipped: tenant_master_template schema is missing';
        RETURN;
    END IF;

    FOR v_schema IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname = v_template
           OR nspname LIKE 'entity\_%'
        ORDER BY nspname
    LOOP
        IF to_regclass(format('%I.purchase_orders', v_schema)) IS NULL
           OR to_regclass(format('%I.purchase_order_items', v_schema)) IS NULL THEN
            RAISE WARNING
                'purchase order integrity guards skipped: schema % has no purchase order tables',
                v_schema;
            v_skipped := array_append(v_skipped, v_schema);
            CONTINUE;
        END IF;

        PERFORM public._prov_install_canonical_triggers(v_schema, 'purchase_orders');
        PERFORM public._prov_install_canonical_triggers(v_schema, 'purchase_order_items');
        RAISE NOTICE 'purchase order integrity guards installed in %', v_schema;

        IF v_schema <> v_template THEN
            v_installed := array_append(v_installed, v_schema);
        END IF;
    END LOOP;

    RAISE NOTICE 'purchase order integrity guards installed in % tenant schema(s): %',
        coalesce(array_length(v_installed, 1), 0), array_to_string(v_installed, ', ');

    IF array_length(v_skipped, 1) IS NOT NULL THEN
        RAISE NOTICE 'purchase order integrity guards skipped in % schema(s) without purchase order tables: %',
            array_length(v_skipped, 1), array_to_string(v_skipped, ', ');
    END IF;
END;
$do$;

-- ============================================================
-- FINAL — Reload the PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
