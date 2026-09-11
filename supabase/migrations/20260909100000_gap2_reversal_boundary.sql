-- ============================================================
-- GAP 2 — POSTED-ENTRY REVERSAL BOUNDARY
-- ============================================================
-- Adds reverse_accounting_entry(): a safe, controlled boundary for
-- reversing already-posted journal entries. The original is never
-- mutated; a new equal-and-opposite posted entry is created and
-- linked via reversal_of_entry_id. The reporting SQL (Gap 1)
-- excludes reversed effects via NOT EXISTS on this column.
--
-- Design constraints:
--   - Immutable journal history: no UPDATE of original entry.
--   - No partial reversals: the entire entry is reversed atomically.
--   - Atomic: single transaction, single RPC.
--   - Permission-gated: journal/create required.
--   - Entity-scoped: resolves tenant schema from entity_id.
--   - Idempotent: unique constraint on idempotency_key is the backstop.
--   - No tax logic: pure accounting kernel.
--   - No invoice cancellation redesign.
--
-- Pattern: post_accounting_entry (SECURITY DEFINER, SET search_path).
-- ============================================================

CREATE OR REPLACE FUNCTION public.reverse_accounting_entry(
    p_entity_id uuid,
    p_source_entry_id uuid,
    p_reversal_period_code text,
    p_idempotency_key text,
    p_memo text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
    v_source_entry record;
    v_source_line record;
    v_period_id uuid;
    v_line_no integer := 0;
    v_debits NUMERIC(18,2) := 0;
    v_credits NUMERIC(18,2) := 0;
    v_entry_id uuid;
    v_reversal_entry_id uuid;
    v_account_id uuid;
    v_account_active boolean;
    v_new_side text;
BEGIN
    -- Resolve tenant schema from entity_id.
    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Permission gate: journal/create (same gate as post_accounting_entry).
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Read the source entry.
    EXECUTE format(
        'SELECT id, period_id, status, reversal_of_entry_id, source_type, source_id, transaction_date
         FROM %I.journal_entries WHERE id = $1',
        v_schema
    ) INTO v_source_entry USING p_source_entry_id;

    IF v_source_entry IS NULL THEN
        RAISE EXCEPTION 'Journal entry % not found', p_source_entry_id
            USING ERRCODE = '23503';
    END IF;

    -- Must be posted.
    IF v_source_entry.status <> 'posted' THEN
        RAISE EXCEPTION 'Journal entry % is not posted (status: %)', p_source_entry_id, v_source_entry.status
            USING ERRCODE = '25001';
    END IF;

    -- Must not already be reversed (double-reversal prevention).
    IF v_source_entry.reversal_of_entry_id IS NOT NULL THEN
        RAISE EXCEPTION 'Journal entry % is already reversed', p_source_entry_id
            USING ERRCODE = '25001';
    END IF;

    -- Idempotency pre-check (UNIQUE constraint is the backstop).
    EXECUTE format(
        'SELECT id FROM %I.journal_entries WHERE idempotency_key = $1',
        v_schema
    ) INTO v_entry_id USING p_idempotency_key;
    IF v_entry_id IS NOT NULL THEN
        RAISE EXCEPTION 'duplicate idempotency key: %', p_idempotency_key
            USING ERRCODE = '23505';
    END IF;

    -- Resolve reversal period.
    EXECUTE format(
        'SELECT id FROM %I.accounting_periods WHERE code = $1',
        v_schema
    ) INTO v_period_id USING p_reversal_period_code;
    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'unknown accounting period %', p_reversal_period_code
            USING ERRCODE = '23503';
    END IF;

    -- Read all source lines (must have at least one).
    -- Build compensating lines: flip debit <-> credit, same amount.

    -- Insert the draft reversal header first.
    EXECUTE format(
        'INSERT INTO %I.journal_entries
            (period_id, transaction_date, posting_date, source_type, source_id,
             idempotency_key, status, reversal_of_entry_id, memo)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, ''draft'', $6, $7) RETURNING id',
        v_schema
    ) INTO v_reversal_entry_id
    USING v_period_id, v_source_entry.transaction_date,
          'reversal', p_source_entry_id::text, p_idempotency_key,
          p_source_entry_id, p_memo;

    -- Insert compensating lines (flipped sides).
    FOR v_source_line IN
        EXECUTE format(
            'SELECT jl.account_id, jl.side, jl.amount
             FROM %I.journal_lines jl
             WHERE jl.entry_id = $1
             ORDER BY jl.line_no',
            v_schema
        ) USING p_source_entry_id
    LOOP
        v_line_no := v_line_no + 1;
        v_new_side := CASE WHEN v_source_line.side = 'debit' THEN 'credit' ELSE 'debit' END;

        EXECUTE format(
            'INSERT INTO %I.journal_lines (entry_id, account_id, side, amount, line_no, memo)
             VALUES ($1, $2, $3, $4, $5, NULL)',
            v_schema
        ) USING v_reversal_entry_id, v_source_line.account_id, v_new_side, v_source_line.amount, v_line_no;

        IF v_new_side = 'debit' THEN
            v_debits := v_debits + v_source_line.amount;
        ELSE
            v_credits := v_credits + v_source_line.amount;
        END IF;
    END LOOP;

    IF v_line_no = 0 THEN
        RAISE EXCEPTION 'Journal entry % has no lines to reverse', p_source_entry_id
            USING ERRCODE = '25001';
    END IF;

    -- Application-level balance check (exact NUMERIC).
    IF v_debits <> v_credits THEN
        RAISE EXCEPTION 'reversal unbalanced: debits % <> credits %', v_debits, v_credits
            USING ERRCODE = '25001';
    END IF;

    -- Flip to posted. The entry guard trigger re-validates period
    -- state, date bounds, reversal target, and balance atomically.
    EXECUTE format(
        'UPDATE %I.journal_entries SET status = ''posted'' WHERE id = $1',
        v_schema
    ) USING v_reversal_entry_id;

    RETURN jsonb_build_object(
        'reversal_entry_id', v_reversal_entry_id,
        'reversal_entry_status', 'posted',
        'original_entry_id', p_source_entry_id,
        'original_entry_status', 'posted',
        'total_debits', v_debits::text,
        'total_credits', v_credits::text,
        'line_count', v_line_no
    );
END;
$function$;

-- ============================================================
-- FINAL — Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
