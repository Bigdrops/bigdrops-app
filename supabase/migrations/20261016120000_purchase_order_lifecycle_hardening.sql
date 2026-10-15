-- ============================================================
-- PHASE C1.1 — SUPPLIER PURCHASE ORDER LIFECYCLE HARDENING
-- ============================================================
-- Hardens the Phase C1 persistence authority without rewriting it:
--
--   1. Content becomes a draft-only operation. The save RPC rejects any
--      content rewrite once a PO leaves draft. Status-only movement moves
--      to the dedicated `transition_purchase_order_status` operation,
--      which updates the status column atomically and nothing else.
--   2. Stale writes are rejected. Both write paths accept the write stamp
--      the caller loaded and refuse when the stored row is newer.
--   3. Archived POs are read-only until restored, in both write paths.
--   4. `audit_logs` admits the `purchase_order` entity so the canonical
--      `recordAuditLog` field-diff authority records PO lifecycle events.
--      No new action name is introduced. No `activity_events` change:
--      PO events live in `audit_logs` and surface through the merged feed.
--
-- Forward-only and additive. The C1 migration file is not edited, so this
-- applies cleanly whether C1 is pending or already applied: file ordering
-- guarantees C1 runs first. No existing table, column, identifier,
-- constraint member, or numbering key is removed. The CHECK change only
-- widens allowed sets, so existing rows stay valid.
--
-- Tenancy: every write resolves the tenant schema from the entity id and
-- locks the PO row (`FOR UPDATE`), so concurrent saves serialise on the
-- row and a PO can never cross a tenant boundary. The audit CHECK loop
-- covers public, tenant_master_template, and every existing entity_*
-- schema; the template carries the definition future tenants inherit.
-- Schemas without an audit_logs table are skipped.
--
-- NO accounting side effects. NO inventory side effects. No function here
-- writes source_transactions, journal entries, expenses, payments, or
-- any stock table. No PDF, no UI.
-- ============================================================

-- ============================================================
-- 1. AUDIT VOCABULARY — admit `purchase_order` in audit_logs
-- ============================================================
-- Follows 20261005120000_cps_audit_entity_support.sql verbatim: the same
-- loop, the same action set, one added entity. Existing rows stay valid
-- because the new entity set is a superset of the old set.
-- Safe to run more than once.

DO $do$
DECLARE
  v_schema record;
  v_entity_check text := $chk$CHECK (entity_type = ANY (ARRAY[
    'invoice'::text,
    'quotation'::text,
    'project'::text,
    'receipt'::text,
    'waybill'::text,
    'csr'::text,
    'rfq'::text,
    'letter'::text,
    'cps_sheets'::text,
    'purchase_order'::text
  ]))$chk$;
  v_action_check text := $chk$CHECK (action = ANY (ARRAY[
    'CREATE'::text,
    'UPDATE'::text,
    'DELETE'::text,
    'STATUS_CHANGE'::text,
    'LINK'::text,
    'UNLINK'::text,
    'ARCHIVE'::text,
    'UNARCHIVE'::text,
    'CONVERT'::text,
    'DUPLICATE'::text
  ]))$chk$;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname = 'public'
       OR n.nspname = 'tenant_master_template'
       OR n.nspname LIKE 'entity\_%'
    ORDER BY n.nspname
  LOOP
    -- Skip schemas that have no audit_logs table.
    IF to_regclass(format('%I.audit_logs', v_schema.schemaname)) IS NULL THEN
      CONTINUE;
    END IF;

    -- 1. Entity type: add purchase_order. Every pre-existing member is
    -- preserved unchanged.
    IF EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND c.relname = 'audit_logs'
        AND con.conname = 'audit_logs_entity_type_check'
    ) THEN
      EXECUTE format('ALTER TABLE %I.audit_logs DROP CONSTRAINT audit_logs_entity_type_check', v_schema.schemaname);
    END IF;
    EXECUTE format('ALTER TABLE %I.audit_logs ADD CONSTRAINT audit_logs_entity_type_check %s', v_schema.schemaname, v_entity_check);

    -- 2. Action: reproduced unchanged. CREATE, UPDATE, STATUS_CHANGE,
    -- ARCHIVE and UNARCHIVE already cover every PO lifecycle event, so no
    -- new action name is introduced.
    IF EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema.schemaname
        AND c.relname = 'audit_logs'
        AND con.conname = 'audit_logs_action_check'
    ) THEN
      EXECUTE format('ALTER TABLE %I.audit_logs DROP CONSTRAINT audit_logs_action_check', v_schema.schemaname);
    END IF;
    EXECUTE format('ALTER TABLE %I.audit_logs ADD CONSTRAINT audit_logs_action_check %s', v_schema.schemaname, v_action_check);
  END LOOP;
END $do$;

-- ============================================================
-- 2. HARDENED SAVE AUTHORITY
-- ============================================================
-- Replaces the C1 save function with a hardened revision:
--
--   * New optional `p_expected_updated_at`: when supplied, the write is
--     refused if the stored row is newer than the stamp the caller
--     loaded. NULL preserves the old behaviour for direct RPC callers.
--   * The update branch locks the PO row (`FOR UPDATE`), so the status,
--     archive state and write stamp read here are the authority for the
--     write below and concurrent saves serialise on the row.
--   * An archived PO rejects every update until restored.
--   * A non-draft PO rejects every content rewrite. Status-only movement
--     belongs to `transition_purchase_order_status` (§3).
--   * Identity (`po_number`, `supplier_id`, frozen `supplier_name`),
--     numbering, totals handling, item replacement, and the absence of
--     accounting or inventory writes are unchanged from C1.
--
-- The old 4-argument signature is dropped first so the new 5-argument
-- signature replaces it instead of coexisting as an overload (waybill
-- precedent, 20260821000000_waybill_csr_audit_schema_aware.sql).

DROP FUNCTION IF EXISTS public.save_purchase_order_with_items_transaction(uuid, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION public.save_purchase_order_with_items_transaction(
    p_entity_id uuid,
    p_purchase_order_payload jsonb,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_mode text DEFAULT 'create'::text,
    p_expected_updated_at timestamptz DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema            text;
    v_po_id             uuid;
    v_row               record;
    v_item              jsonb;
    v_count             integer := 0;
    v_previous_status   text;
    v_next_status       text;
    v_supplier_id       uuid;
    v_supplier_name     text;
    v_archived_at       timestamptz;
    v_updated_at        timestamptz;
    v_sort              integer := 0;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- ── Permission gate ──────────────────────────────────────────────
    IF p_mode = 'create' THEN
        IF NOT public.has_entity_permission(
            p_entity_id, auth.uid(), 'purchase_order', 'create'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: purchase_order/create required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        IF NOT public.has_entity_permission(
            p_entity_id, auth.uid(), 'purchase_order', 'edit'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: purchase_order/edit required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- ── Party must be a SUPPLIER in this tenant ───────────────────────
    -- `client_supplier_links` is deliberately never read here. A
    -- dual-role business remains a supplier in the PO context.
    v_supplier_id := NULLIF(p_purchase_order_payload->>'supplier_id', '')::uuid;

    IF v_supplier_id IS NULL THEN
        RAISE EXCEPTION 'A purchase order requires a supplier_id'
            USING ERRCODE = 'not_null_violation';
    END IF;

    IF to_regclass(format('%I.suppliers', v_schema)) IS NULL THEN
        RAISE EXCEPTION 'Schema % has no suppliers table', v_schema;
    END IF;

    EXECUTE format(
        'SELECT name FROM %I.suppliers WHERE id = %L',
        v_schema, v_supplier_id
    ) INTO v_supplier_name;

    IF v_supplier_name IS NULL THEN
        RAISE EXCEPTION 'Supplier % does not exist in this tenant', v_supplier_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- The snapshot is taken from the SUPPLIER ROW, never from the request.
    -- A caller therefore cannot claim a supplier name that does not belong
    -- to the supplier id it sent. The snapshot is written once, on create;
    -- the update path below deliberately never touches the column, so a
    -- later supplier rename cannot rewrite history.

    -- ── Amount / quantity range guard ────────────────────────────────
    -- The database validates range only. It never derives a total: the
    -- prepared totals come from `computeDocument()` on the client.
    IF COALESCE((p_purchase_order_payload->>'subtotal')::numeric, 0) < 0
       OR COALESCE((p_purchase_order_payload->>'discount')::numeric, 0) < 0
       OR COALESCE((p_purchase_order_payload->>'vat')::numeric, 0) < 0
       OR COALESCE((p_purchase_order_payload->>'total')::numeric, 0) < 0 THEN
        RAISE EXCEPTION 'Purchase order amounts must not be negative'
            USING ERRCODE = 'check_violation';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE((v_item->>'quantity')::numeric, 0) < 0 THEN
            RAISE EXCEPTION 'Purchase order item quantity must not be negative'
                USING ERRCODE = 'check_violation';
        END IF;
        IF COALESCE((v_item->>'unit_cost')::numeric, 0) < 0 THEN
            RAISE EXCEPTION 'Purchase order item unit_cost must not be negative'
                USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;

    IF p_mode = 'create' THEN

        v_next_status := COALESCE(NULLIF(p_purchase_order_payload->>'status', ''), 'draft');

        IF v_next_status NOT IN ('draft', 'issued', 'cancelled', 'closed') THEN
            RAISE EXCEPTION 'Unknown purchase order status %', v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        EXECUTE format(
            $q$
            INSERT INTO %I.purchase_orders (
                po_number,
                po_date,
                supplier_id,
                supplier_name,
                status,
                currency,
                subtotal,
                discount,
                vat,
                extra_charges,
                total,
                calculation_inputs,
                notes,
                terms
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14
            )
            RETURNING id
            $q$,
            v_schema
        )
        INTO v_po_id
        USING
            p_purchase_order_payload->>'po_number',
            NULLIF(p_purchase_order_payload->>'po_date', '')::date,
            v_supplier_id,
            v_supplier_name,
            v_next_status,
            COALESCE(NULLIF(p_purchase_order_payload->>'currency', ''), 'NGN'),
            COALESCE((p_purchase_order_payload->>'subtotal')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'discount')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'vat')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'extra_charges')::jsonb, '[]'::jsonb),
            COALESCE((p_purchase_order_payload->>'total')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'calculation_inputs')::jsonb, '{}'::jsonb),
            p_purchase_order_payload->>'notes',
            p_purchase_order_payload->>'terms';

    ELSE

        v_po_id := NULLIF(p_purchase_order_payload->>'id', '')::uuid;

        IF v_po_id IS NULL THEN
            RAISE EXCEPTION 'An update requires a purchase order id'
                USING ERRCODE = 'not_null_violation';
        END IF;

        -- Lock the row: the status, archive state and write stamp read here
        -- are the transition authority for the write below, so concurrent
        -- saves serialise on the row instead of acting on stale state.
        EXECUTE format(
            'SELECT status, archived_at, updated_at FROM %I.purchase_orders WHERE id = %L FOR UPDATE',
            v_schema, v_po_id
        ) INTO v_previous_status, v_archived_at, v_updated_at;

        IF v_previous_status IS NULL THEN
            RAISE EXCEPTION 'Purchase order % does not exist in this tenant', v_po_id;
        END IF;

        -- An archived PO is read-only until restored. Archiving never
        -- changes content, so the archived row is exactly the row a
        -- restore must bring back.
        IF v_archived_at IS NOT NULL THEN
            RAISE EXCEPTION 'Archived purchase order % cannot be updated; restore it first', v_po_id
                USING ERRCODE = 'check_violation';
        END IF;

        -- A stale client must not overwrite newer state.
        IF p_expected_updated_at IS NOT NULL AND v_updated_at > p_expected_updated_at THEN
            RAISE EXCEPTION 'Purchase order % changed since you loaded it; reload and retry', v_po_id
                USING ERRCODE = 'check_violation';
        END IF;

        v_next_status := COALESCE(
            NULLIF(p_purchase_order_payload->>'status', ''),
            v_previous_status
        );

        -- Content is a draft-only operation. A non-draft PO is historically
        -- frozen: this authority rejects the rewrite, including a
        -- same-status rewrite, and only
        -- `transition_purchase_order_status` may move the status.
        IF v_previous_status <> 'draft' THEN
            RAISE EXCEPTION 'Purchase order content is immutable once issued; use transition_purchase_order_status for status changes'
                USING ERRCODE = 'check_violation';
        END IF;

        -- Terminal states stay terminal. A cancelled PO cannot be silently
        -- reactivated and a closed PO cannot be edited back into an active
        -- draft. (Unreachable while the draft-only gate above stands;
        -- retained as defence in depth.)
        IF v_previous_status IN ('cancelled', 'closed') AND v_next_status <> v_previous_status THEN
            RAISE EXCEPTION
                'A % purchase order is terminal and cannot transition to %',
                v_previous_status, v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        -- draft -> draft | issued | cancelled
        -- issued -> issued | cancelled | closed
        IF v_previous_status = 'draft'
           AND v_next_status NOT IN ('draft', 'issued', 'cancelled') THEN
            RAISE EXCEPTION
                'Illegal purchase order transition: % -> %',
                v_previous_status, v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_previous_status = 'issued'
           AND v_next_status NOT IN ('issued', 'cancelled', 'closed') THEN
            RAISE EXCEPTION
                'Illegal purchase order transition: % -> %',
                v_previous_status, v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        -- Identity is immutable on update. `po_number` and `supplier_id` are
        -- deliberately absent from this SET list: a PO keeps the number it
        -- was allocated and is always issued to the supplier it was created
        -- for. `supplier_name` is absent too, so the frozen snapshot taken at
        -- create time survives every later supplier rename.
        EXECUTE format(
            $q$
            UPDATE %I.purchase_orders
            SET
                po_date = $2,
                status = $3,
                currency = $4,
                subtotal = $5,
                discount = $6,
                vat = $7,
                extra_charges = $8,
                total = $9,
                calculation_inputs = $10,
                notes = $11,
                terms = $12
            WHERE id = $1
            $q$,
            v_schema
        )
        USING
            v_po_id,
            NULLIF(p_purchase_order_payload->>'po_date', '')::date,
            v_next_status,
            COALESCE(NULLIF(p_purchase_order_payload->>'currency', ''), 'NGN'),
            COALESCE((p_purchase_order_payload->>'subtotal')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'discount')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'vat')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'extra_charges')::jsonb, '[]'::jsonb),
            COALESCE((p_purchase_order_payload->>'total')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'calculation_inputs')::jsonb, '{}'::jsonb),
            p_purchase_order_payload->>'notes',
            p_purchase_order_payload->>'terms';

        -- Replace the item set. Same transaction as the header update.
        EXECUTE format(
            'DELETE FROM %I.purchase_order_items WHERE purchase_order_id = %L',
            v_schema,
            v_po_id
        );

    END IF;

    -- ── Items ────────────────────────────────────────────────────────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        EXECUTE format(
            $q$
            INSERT INTO %I.purchase_order_items (
                purchase_order_id,
                description,
                quantity,
                unit,
                unit_cost,
                line_total,
                sort_order
            )
            VALUES (%L, $1, $2, $3, $4, $5, $6)
            $q$,
            v_schema,
            v_po_id
        )
        USING
            COALESCE(NULLIF(v_item->>'description', ''), 'Item'),
            COALESCE((v_item->>'quantity')::numeric, 0),
            v_item->>'unit',
            COALESCE((v_item->>'unit_cost')::numeric, 0),
            COALESCE((v_item->>'line_total')::numeric, 0),
            COALESCE((v_item->>'sort_order')::integer, v_sort);

        v_sort := v_sort + 1;
        v_count := v_count + 1;
    END LOOP;

    -- ── Return the saved document ────────────────────────────────────
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.purchase_orders t WHERE t.id = %L',
        v_schema,
        v_po_id
    )
    INTO v_row;

    RETURN jsonb_build_object(
        'id', v_po_id,
        'purchase_order', v_row,
        'items_saved', v_count
    );

END;
$function$;

-- ============================================================
-- 3. STATUS-ONLY TRANSITION AUTHORITY
-- ============================================================
-- The single path for status movement on a non-draft PO. It updates the
-- status column only, atomically: no item, amount, note, term, supplier
-- or number column appears in the write, so a transition can never
-- replace content. A same-status call is a proven no-op by
-- construction: the only writable column already holds the value, so
-- the write is skipped and the write stamp stays untouched.
--
-- Guards, in order: tenant resolution, purchase_order/edit permission,
-- existence, archive state, staleness, then the C1 transition table.
-- The row is locked (`FOR UPDATE`) so concurrent transitions serialise.
-- Audit rows are NOT written here: audit stays a best-effort post-write
-- service call (invoice convention), never part of the mutation.

CREATE OR REPLACE FUNCTION public.transition_purchase_order_status(
    p_entity_id uuid,
    p_purchase_order_id uuid,
    p_to_status text,
    p_expected_updated_at timestamptz DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema          text;
    v_previous_status text;
    v_next_status     text;
    v_archived_at     timestamptz;
    v_updated_at      timestamptz;
    v_po_number       text;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    IF NOT public.has_entity_permission(
        p_entity_id, auth.uid(), 'purchase_order', 'edit'
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions: purchase_order/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_purchase_order_id IS NULL THEN
        RAISE EXCEPTION 'A status change requires a purchase order id'
            USING ERRCODE = 'not_null_violation';
    END IF;

    EXECUTE format(
        'SELECT status, archived_at, updated_at, po_number FROM %I.purchase_orders WHERE id = %L FOR UPDATE',
        v_schema, p_purchase_order_id
    ) INTO v_previous_status, v_archived_at, v_updated_at, v_po_number;

    IF v_previous_status IS NULL THEN
        RAISE EXCEPTION 'Purchase order % does not exist in this tenant', p_purchase_order_id;
    END IF;

    IF v_archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'Archived purchase order % cannot transition; restore it first', p_purchase_order_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF p_expected_updated_at IS NOT NULL AND v_updated_at > p_expected_updated_at THEN
        RAISE EXCEPTION 'Purchase order % changed since you loaded it; reload and retry', p_purchase_order_id
            USING ERRCODE = 'check_violation';
    END IF;

    v_next_status := COALESCE(NULLIF(p_to_status, ''), v_previous_status);

    IF v_next_status NOT IN ('draft', 'issued', 'cancelled', 'closed') THEN
        RAISE EXCEPTION 'Unknown purchase order status %', v_next_status
            USING ERRCODE = 'check_violation';
    END IF;

    -- Proven no-op: nothing is written, so content, history and the write
    -- stamp are untouched.
    IF v_next_status = v_previous_status THEN
        RETURN jsonb_build_object(
            'id', p_purchase_order_id,
            'po_number', v_po_number,
            'old_status', v_previous_status,
            'new_status', v_previous_status,
            'noop', true
        );
    END IF;

    IF v_previous_status IN ('cancelled', 'closed') THEN
        RAISE EXCEPTION
            'A % purchase order is terminal and cannot transition to %',
            v_previous_status, v_next_status
            USING ERRCODE = 'check_violation';
    END IF;

    -- draft -> draft | issued | cancelled
    -- issued -> issued | cancelled | closed
    IF v_previous_status = 'draft'
       AND v_next_status NOT IN ('draft', 'issued', 'cancelled') THEN
        RAISE EXCEPTION
            'Illegal purchase order transition: % -> %',
            v_previous_status, v_next_status
            USING ERRCODE = 'check_violation';
    END IF;

    IF v_previous_status = 'issued'
       AND v_next_status NOT IN ('issued', 'cancelled', 'closed') THEN
        RAISE EXCEPTION
            'Illegal purchase order transition: % -> %',
            v_previous_status, v_next_status
            USING ERRCODE = 'check_violation';
    END IF;

    EXECUTE format(
        'UPDATE %I.purchase_orders SET status = %L WHERE id = %L',
        v_schema, v_next_status, p_purchase_order_id
    );

    EXECUTE format(
        'SELECT updated_at FROM %I.purchase_orders WHERE id = %L',
        v_schema, p_purchase_order_id
    ) INTO v_updated_at;

    RETURN jsonb_build_object(
        'id', p_purchase_order_id,
        'po_number', v_po_number,
        'old_status', v_previous_status,
        'new_status', v_next_status,
        'updated_at', v_updated_at
    );
END;
$function$;

-- ============================================================
-- FINAL — Reload the PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
