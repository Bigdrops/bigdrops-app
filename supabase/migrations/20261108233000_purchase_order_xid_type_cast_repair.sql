-- ============================================================
-- PURCHASE ORDER INTEGRITY GUARD REPAIR: xid = xid8 TYPE CAST
-- ============================================================
-- Fixes PostgreSQL error:
--   operator does not exist: xid = xid8
--   Registry ID: err_1794175758680_2op6p3
--
-- Root Cause:
--   In PostgreSQL 13+, the system column `xmin` has type `xid` (32-bit transaction ID),
--   whereas the built-in function `pg_current_xact_id()` returns type `xid8` (64-bit transaction ID).
--   PostgreSQL defines no implicit comparison operator `=(xid, xid8)`.
--   When `public._po_guard_purchase_order_items()` executes during item insertion in
--   `save_purchase_order_with_items_transaction`:
--     SELECT status, archived_at, (xmin = pg_current_xact_id())
--   PostgreSQL raises `operator does not exist: xid = xid8`.
--
-- Solution:
--   Cast `(pg_current_xact_id())::xid` to downcast `xid8` to `xid` modulo 2^32,
--   enabling the standard native `xid = xid` equality comparison.
--   Row locking (`FOR UPDATE`) and concurrency semantics remain intact.
-- ============================================================

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
            'SELECT status, archived_at, (xmin = (pg_current_xact_id())::xid) FROM %I.purchase_orders WHERE id = $1 FOR UPDATE',
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
