-- Remove SASQUO-324 duplicate quotations (user-directed)
-- Created: 2026-08-23
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- Resolves the SASQUO-324 business duplicate that blocked Plan D
-- (20260822000000_plan_d_final_backfill.sql). Two quotations share the
-- unique quotation_number SASQUO-324:
--
--   public.quotations.7776bd46-b466-4e0d-95b8-d5ad8701b4c5
--     created 2026-08-10, created_by b676c7a8 (NO-ENTITY owner)
--     client 49d5f6e8 (Century Mining Company Ltd)
--     7 quotation_items, subtotal 121000, status open
--
--   entity_bigdrops-main_main.quotations.09005d6f-01d2-4a47-8e8e-dbabfba40b47
--     created 2026-08-14, created_by b676c7a8
--     client 49d5f6e8 (Century Mining Company Ltd)
--     0 quotation_items, total 376250, status open
--
-- Both rows were created by the same unresolvable owner user b676c7a8
-- (no matching entity/workspace) for the same client four days apart,
-- with different contents. They are two different quotations sharing
-- one number. The project lead directed: DELETE BOTH.
--
-- This is an explicit user override of the usual "public data is never
-- deleted" guardrail, limited strictly to these two quotation rows and
-- the 7 public quotation_items owned by public 7776bd46 (they must be
-- deleted first to satisfy the public FK quotation_items -> quotations).
--
-- Audit log rows (CREATE events, id 65f20bd8 in both schemas) are
-- intentionally KEPT to preserve the audit trail / document lineage.
-- =====================================================================

DO $do$
DECLARE
    v_schema     text := 'entity_bigdrops-main_main';
    v_pub_quota  uuid := '7776bd46-b466-4e0d-95b8-d5ad8701b4c5';
    v_ten_quota  uuid := '09005d6f-01d2-4a47-8e8e-dbabfba40b47';
    v_items      bigint;
    v_before_pub bigint;
    v_before_ten bigint;
BEGIN
    -- Sanity: confirm the two rows exist and are exactly what we expect
    SELECT count(*) INTO v_before_pub FROM public.quotations WHERE id = v_pub_quota;
    SELECT count(*) INTO v_before_ten FROM "entity_bigdrops-main_main".quotations WHERE id = v_ten_quota;
    IF v_before_pub <> 1 OR v_before_ten <> 1 THEN
        RAISE EXCEPTION 'Expected exactly 1 public and 1 tenant row, got public=% tenant=%', v_before_pub, v_before_ten;
    END IF;

    -- 1. Delete the 7 public quotation_items owned by the public quotation
    --    (required before the parent delete due to the public FK
    --    quotation_items_quotation_id_fkey). All 7 are public-only
    --    (their parent is NOT in tenant), so none were backfilled.
    DELETE FROM public.quotation_items WHERE quotation_id = v_pub_quota;
    GET DIAGNOSTICS v_items = ROW_COUNT;
    RAISE NOTICE 'Deleted public quotation_items owned by %: %', v_pub_quota, v_items;

    -- 2. Delete the public quotation row
    DELETE FROM public.quotations WHERE id = v_pub_quota;
    RAISE NOTICE 'Deleted public quotation %', v_pub_quota;

    -- 3. Delete the tenant twin quotation row (0 items; verified no
    --    tenant FK points at quotations, and no invoices/payments/
    --    receipts reference either id)
    DELETE FROM "entity_bigdrops-main_main".quotations WHERE id = v_ten_quota;
    RAISE NOTICE 'Deleted tenant quotation %', v_ten_quota;

    RAISE NOTICE 'SASQUO-324 duplicate removed. Audit logs preserved.';
END;
$do$;