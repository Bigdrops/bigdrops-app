-- ============================================================
-- ACCOUNTING FOUNDATION INCREMENT 4A — INVOICE INTEGRATION
-- ============================================================
-- Scope:
--   1. Repair post_from_source_transaction(): Increment 3 assigned the
--      jsonb result of post_accounting_entry() INTO a uuid variable, which
--      raises 'invalid input syntax for type uuid' the first time the RPC
--      is called. This increment is the first caller. The repair keeps the
--      signature, permission gate, confirmation gate, and return shape
--      unchanged, and still delegates every posting decision to the
--      Increment 2 kernel (post_accounting_entry). No second posting path.
--
-- Non-scope (unchanged from Increment 3):
--   - Payment integration
--   - Expense capture
--   - Source transaction UI
--   - Reversal semantics on source transactions
--
-- Account treatment used by the invoice adapter (1200/4000) is NOT
-- altered here. Accounting accounts are seeded per entity schema by
-- Increment 2 provisioning; no new accounts are added.

-- ============================================================
-- 1. REPAIRED POSTING BOUNDARY RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.post_from_source_transaction(
    p_entity_id uuid,
    p_source_transaction_id uuid,
    p_entry jsonb,
    p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
    v_source_status text;
    v_post_result jsonb;
    v_entry_id uuid;
BEGIN
    -- Permission gate (unchanged)
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Source transaction must exist and be confirmed (unchanged)
    EXECUTE format(
        'SELECT lifecycle_status FROM %I.source_transactions WHERE id = $1',
        v_schema
    ) INTO v_source_status USING p_source_transaction_id;

    IF v_source_status IS NULL THEN
        RAISE EXCEPTION 'source transaction % not found', p_source_transaction_id
            USING ERRCODE = '23503';
    END IF;
    IF v_source_status <> 'confirmed' THEN
        RAISE EXCEPTION 'source transaction % is %; only confirmed transactions can be posted', p_source_transaction_id, v_source_status
            USING ERRCODE = '25001';
    END IF;

    -- Delegate to the existing Increment 2 posting kernel.
    -- Repair: capture the jsonb result, then extract the entry id.
    SELECT public.post_accounting_entry(p_entity_id, p_entry, p_lines)
    INTO v_post_result;

    v_entry_id := (v_post_result->>'id')::uuid;

    -- Mark source transaction as posted (trigger validates the transition)
    EXECUTE format(
        'UPDATE %I.source_transactions SET lifecycle_status = ''posted'', updated_at = now() WHERE id = $1',
        v_schema
    ) USING p_source_transaction_id;

    RETURN jsonb_build_object(
        'source_transaction_id', p_source_transaction_id,
        'journal_entry_id', v_entry_id,
        'status', 'posted',
        'message', 'source transaction posted to journal'
    );
END;
$function$;

-- ============================================================
-- 2. PostgREST schema cache reload
-- ============================================================
NOTIFY pgrst, 'reload schema';
