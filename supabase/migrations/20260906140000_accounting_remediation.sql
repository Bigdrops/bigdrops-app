-- ============================================================
-- ACCOUNTING FOUNDATION INCREMENT 6 — CONTROLLED REMEDIATION
-- Read-only poll endpoint + controlled remitter for explicitly
-- identified accounting gaps. Re-validates the operational fact
-- and re-checks the accounting gap before any posting.
--
-- SCOPE (v1): disposable/test fixtures only. No bulk repair of the
-- ~300 real pre-cutover gaps on `main`. Those remain quarantined
-- reconciliation findings. A future increment defines the approval
-- workflow and production backfill authority.
--
-- REMEDIATION BOUNDARY (reuses existing):
--   ingest_source_transaction
--   -> confirm_source_transaction
--   -> post_from_source_transaction
--   -> post_accounting_entry
--
-- NO direct journal writes. No operational record mutation.
-- Exact decimal amounts only. Entity-schema-qualified.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reconciliation_remediation_status(p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema  text;
    v_periods jsonb;
    v_invoices_missing jsonb;
    v_payments_missing jsonb;
    v_blocked_periods int;
BEGIN
    IF p_entity_id IS NULL THEN
        RAISE EXCEPTION 'missing entity id' USING ERRCODE = '22004';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'view') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/view required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Read-only status: does not post anything.

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'code', p.code,
        'start_date', p.start_date,
        'end_date', p.end_date
    )), '[]'::jsonb)
    INTO v_periods
    FROM %I.accounting_periods p
    WHERE p.state = 'open'
    ORDER BY p.start_date;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'source_type', 'invoice',
        'source_id', i.id::text,
        'qualified', true,
        'has_missing_st', NOT EXISTS (
            SELECT 1 FROM %I.source_transactions st
            WHERE st.source_type = 'invoice' AND st.source_id = i.id::text)
    )), '[]'::jsonb)
    INTO v_invoices_missing
    FROM %I.invoices i
    WHERE i.status NOT IN ('cancelled', 'voided', 'archived')
      AND NOT EXISTS (
            SELECT 1 FROM %I.source_transactions st
            WHERE st.source_type = 'invoice' AND st.source_id = i.id::text)
    ORDER BY i.id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'source_type', 'payment',
        'source_id', pmt.id::text,
        'qualified', pmt.voided_at IS NULL AND pmt.cash_amount > 0,
        'has_missing_st', NOT EXISTS (
            SELECT 1 FROM %I.source_transactions st
            WHERE st.source_type = 'payment' AND st.source_id = pmt.id::text)
    )), '[]'::jsonb)
    INTO v_payments_missing
    FROM %I.payments pmt
    WHERE pmt.voided_at IS NULL
      AND pmt.cash_amount > 0
      AND NOT EXISTS (
            SELECT 1 FROM %I.source_transactions st
            WHERE st.source_type = 'payment' AND st.source_id = pmt.id::text)
    ORDER BY pmt.id;

    RETURN jsonb_build_object(
        'entity_id', p_entity_id,
        'generated_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'open_periods', v_periods,
        'qualified_missing_invoices', v_invoices_missing,
        'qualified_missing_payments', v_payments_missing,
        'note', 'This status endpoint is read-only. Remediation performs its own re-validation.'
    );
END;
$function$
;

-- ---------------------------------------------------------------------------
-- CONTROLLED REMEDIATION FUNCTION
--
-- Receives an explicit request for ONE operational fact (invoice or payment).
-- Re-validates the fact and gap atomically, derives the appropriate adapter
-- payload from authoritative source-table columns, and runs the existing
-- ingestion/posting lifecycle.
--
-- If the fact is now resolved (Source Transaction exists, or idempotency key
-- already posted), returns ALREADY_RESOLVED. If the fact is not repairable,
-- returns NOT_REPAIRABLE. If an open period is missing, returns
-- BLOCKED_NO_OPEN_PERIOD.
--
-- Idempotency/concurrency:
--   - Ingest runs under the Source Transaction uniqueness constraint
--     (source_type + source_id), which is the authoritative duplicate guard.
--   - If two processes attempt to remediate the same fact concurrently, only
--     one succeeds at ingest and both return the same disposition.
--   - The function re-queries the final state at the end rather than trusting
--     the intermediate RPC results blindly.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remediate_accounting_gap(
    p_entity_id uuid,
    p_source_type text,
    p_source_id text,
    p_remediator_id uuid DEFAULT NULL::uuid,
    p_remediator_label text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema         text;
    v_status         text;
    v_op_entity_ref  text; -- operational entity reference for audit trail

    v_op_id          uuid;   -- invoice or payment id
    v_amount         numeric;
    v_amount_text    text;
    v_txn_date       date;
    v_currency       text;

    v_open_period    %I.accounting_periods%ROWTYPE; -- placeholder, replaced below
    v_period_found   boolean;
    v_period_code    text;
    v_blocked        boolean;

    v_ingest         jsonb;
    v_confirm        jsonb;
    v_post           jsonb;
    v_st_id          uuid;
    v_je_id          uuid;

    v_existing_st    uuid;
    v_existing_je    uuid;
    v_resolved       boolean;

    v_result        jsonb;

    v_remediator_id_final uuid;
    v_remediator_label_final text;

BEGIN
    -- ------------------------------------------------------------------
    -- Input validation
    -- ------------------------------------------------------------------
    IF p_entity_id IS NULL THEN
        RETURN jsonb_build_object(
            'result', 'NOT_FOUND',
            'explanation', 'Entity id is required.'
        );
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RETURN jsonb_build_object(
            'result', 'NOT_FOUND',
            'explanation', 'Entity schema not found for the supplied entity id.'
        );
    END IF;

    IF btrim(COALESCE(p_source_type, '')) NOT IN ('invoice', 'payment') THEN
        RETURN jsonb_build_object(
            'result', 'NOT_REPAIRABLE',
            'explanation', 'Only invoice or payment facts are repairable in this increment.'
        );
    END IF;

    v_source_id := btrim(COALESCE(p_source_id, ''));
    IF v_source_id = '' THEN
        RETURN jsonb_build_object(
            'result', 'NOT_FOUND',
            'explanation', 'Operational source id is required.'
        );
    END IF;

    -- Permission gate: creating accounting facts requires journal/create.
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RETURN jsonb_build_object(
            'result', 'NOT_REPAIRABLE',
            'explanation', 'Remediation requires the journal/create permission on this entity.'
        );
    END IF;

    -- ------------------------------------------------------------------
    -- Operational fact lookup is deferred until after permission check,
    -- to reduce information leakage in the unauthorized case.
    -- ------------------------------------------------------------------

    v_remediator_id_final := p_remediator_id;
    v_remediator_label_final := btrim(COALESCE(p_remediator_label, ''));

    IF p_source_type = 'invoice' THEN
        -- Resolve the invoice by id within the entity schema.
        EXECUTE format(
            'SELECT id, total, issue_date, currency_code FROM %I.invoices WHERE id::text = %L LIMIT 1',
            v_schema, v_source_id
        ) INTO v_op_id, v_amount, v_txn_date, v_currency;

        IF v_op_id IS NULL THEN
            RETURN jsonb_build_object(
                'result', 'NOT_FOUND',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'explanation', 'Invoice not found in the current entity.'
            );
        END IF;

        -- Invoice qualification mirrors Increment 5.
        IF v_amount IS NULL OR v_amount <= 0 THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'explanation', 'Invoice does not have an authoritative recoverable total for remediation.'
            );
        END IF;

        v_amount_text := v_amount::text;

        -- No valid Source Transaction yet (checked here so the remitter
        -- does not trust the client-supplied "missing ST" claim).
        SELECT id INTO v_existing_st
        FROM %I.source_transactions
        WHERE source_type = 'invoice' AND source_id = v_source_id
        LIMIT 1;

        IF v_existing_st IS NOT NULL THEN
            RETURN jsonb_build_object(
                'result', 'ALREADY_RESOLVED',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'source_transaction_id', v_existing_st::text,
                'explanation', 'An invoice Source Transaction already exists; the accounting fact is resolved.'
            );
        END IF;

        -- Check whether a journal already represents this invoice fact.
        SELECT id INTO v_existing_je
        FROM %I.journal_entries
        WHERE source_type = 'invoice' AND source_id = v_source_id
        LIMIT 1;

        IF v_existing_je IS NOT NULL THEN
            RETURN jsonb_build_object(
                'result', 'ALREADY_RESOLVED',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'journal_entry_id', v_existing_je::text,
                'explanation', 'A journal entry already represents this invoice accounting fact.'
            );
        END IF;

        -- Invoice remediation uses the 4A policy: claim recognition at
        -- the first accounting event. Only the operational amounts and
        -- the existing chart accounts are used.
        v_status := 'invoice';

        -- Determine whether an open period covers the invoice date.
        v_period_found := false;
        v_blocked := false;
        FOR v_period_found IN
            SELECT true
            FROM %I.accounting_periods
            WHERE state = 'open'
              AND start_date <= v_txn_date
              AND v_txn_date <= end_date
            LIMIT 1
        LOOP
            EXIT;
        END LOOP;

        IF NOT v_period_found THEN
            v_blocked := true;
        END IF;

    ELSE
        -- Payment remediation.
        EXECUTE format(
            'SELECT id, cash_amount, date, currency_code FROM %I.payments WHERE id::text = %L LIMIT 1',
            v_schema, v_source_id
        ) INTO v_op_id, v_amount, v_txn_date, v_currency;

        IF v_op_id IS NULL THEN
            RETURN jsonb_build_object(
                'result', 'NOT_FOUND',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'explanation', 'Payment not found in the current entity.'
            );
        END IF;

        -- Payment qualification mirrors Increment 5.
        IF v_amount IS NULL OR v_amount <= 0 THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'explanation', 'Payment has no positive recoverable cash amount for remediation.'
            );
        END IF;

        IF v_txn_date IS NULL THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'explanation', 'Payment transaction date is missing; remediation requires an authoritative date.'
            );
        END IF;

        v_amount_text := v_amount::text;

        -- No valid Source Transaction yet.
        SELECT id INTO v_existing_st
        FROM %I.source_transactions
        WHERE source_type = 'payment' AND source_id = v_source_id
        LIMIT 1;

        IF v_existing_st IS NOT NULL THEN
            RETURN jsonb_build_object(
                'result', 'ALREADY_RESOLVED',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'source_transaction_id', v_existing_st::text,
                'explanation', 'A payment Source Transaction already exists; the accounting fact is resolved.'
            );
        END IF;

        -- No existing journal for this payment fact.
        SELECT id INTO v_existing_je
        FROM %I.journal_entries
        WHERE source_type = 'payment' AND source_id = v_source_id
        LIMIT 1;

        IF v_existing_je IS NOT NULL THEN
            RETURN jsonb_build_object(
                'result', 'ALREADY_RESOLVED',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'journal_entry_id', v_existing_je::text,
                'explanation', 'A journal entry already represents this payment accounting fact.'
            );
        END IF;

        -- Payment remediation uses the 4B policy: settlement of the
        -- receivable with the cash amount only. WHT is not posted.
        v_status := 'payment';

        v_period_found := false;
        v_blocked := false;
        FOR v_period_found IN
            SELECT true
            FROM %I.accounting_periods
            WHERE state = 'open'
              AND start_date <= v_txn_date
              AND v_txn_date <= end_date
            LIMIT 1
        LOOP
            EXIT;
        END LOOP;

        IF NOT v_period_found THEN
            v_blocked := true;
        END IF;
    END IF;

    -- ------------------------------------------------------------------
    -- Blocked without an open period.
    -- ------------------------------------------------------------------
    IF v_blocked THEN
        RETURN jsonb_build_object(
            'result', 'BLOCKED_NO_OPEN_PERIOD',
            'entity_id', p_entity_id,
            'source_type', v_status,
            'source_id', v_source_id,
            'transaction_date', v_txn_date::text,
            'amount', v_amount_text,
            'explanation', 'No open accounting period covers the transaction date; remediation is blocked.'
        );
    END IF;

    -- Obtain the open period that covers the transaction date.
    SELECT * INTO v_open_period
    FROM %I.accounting_periods
    WHERE state = 'open'
      AND start_date <= v_txn_date
      AND v_txn_date <= end_date
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'result', 'BLOCKED_NO_OPEN_PERIOD',
            'entity_id', p_entity_id,
            'source_type', v_status,
            'source_id', v_source_id,
            'transaction_date', v_txn_date::text,
            'amount', v_amount_text,
            'explanation', 'No open accounting period covers the transaction date; remediation is blocked.'
        );
    END IF;

    v_period_code := v_open_period.code;

    -- ------------------------------------------------------------------
    -- Build and run the remediation path.
    -- ------------------------------------------------------------------
    IF v_status = 'invoice' THEN
        -- 4A invoice claim: debit 1200 A/R, credit 4000 Revenue, exact amount.
        v_ingest := public.ingest_source_transaction(
            p_entity_id,
            'invoice',
            v_source_id,
            v_txn_date::text,
            v_amount_text,
            COALESCE(v_currency, 'NGN'),
            'customer',
            NULL,
            '';
        );

        v_st_id := (v_ingest->>'id')::uuid;
        IF NOT v_st_id IS NOT NULL THEN
            RAISE LOG '[remediation] invoice ingest returned no id for %', v_source_id;
        END IF;

        v_confirm := public.confirm_source_transaction(p_entity_id, v_st_id);

        v_post := public.post_from_source_transaction(
            p_entity_id,
            v_st_id,
            jsonb_build_object(
                'period_code', v_period_code,
                'transaction_date', v_txn_date::text,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'idempotency_key', 'invoice:' || v_source_id || ':remediation:post',
                'memo', 'Remediation of missing invoice accounting fact'
            ),
            '[{"account_code":"1200","side":"debit","amount":"%s","memo":"Remediation of invoice claim receivable"},{"account_code":"4000","side":"credit","amount":"%s","memo":"Remediation of invoice claim revenue"}]'::jsonb,
            v_amount_text,
            v_amount_text
        );

        v_je_id := (v_post->>'journal_entry_id')::uuid;

    ELSE
        -- 4B payment settlement: debit 1100 Bank, credit 1200 A/R, cash only.
        v_ingest := public.ingest_source_transaction(
            p_entity_id,
            'payment',
            v_source_id,
            v_txn_date::text,
            v_amount_text,
            COALESCE(v_currency, 'NGN'),
            'customer',
            NULL,
            NULL
        );

        v_st_id := (v_ingest->>'id')::uuid;

        v_confirm := public.confirm_source_transaction(p_entity_id, v_st_id);

        v_post := public.post_from_source_transaction(
            p_entity_id,
            v_st_id,
            jsonb_build_object(
                'period_code', v_period_code,
                'transaction_date', v_txn_date::text,
                'source_type', 'payment',
                'source_id', v_source_id,
                'idempotency_key', 'payment:' || v_source_id || ':remediation:post',
                'memo', 'Remediation of missing payment settlement'
            ),
            '[{"account_code":"1100","side":"debit","amount":"%s","memo":"Remediation of payment received"},{"account_code":"1200","side":"credit","amount":"%s","memo":"Remediation of amount settled"}]'::jsonb,
            v_amount_text,
            v_amount_text
        );

        v_je_id := (v_post->>'journal_entry_id')::uuid;
    END IF;

    -- ------------------------------------------------------------------
    -- Final verification: the function trusts the re-query, not the
    -- intermediate transient state.
    -- ------------------------------------------------------------------
    SELECT id INTO v_existing_st
    FROM %I.source_transactions
    WHERE source_type = v_status AND source_id = v_source_id
    LIMIT 1;

    SELECT id INTO v_existing_je
    FROM %I.journal_entries
    WHERE source_type = v_status AND source_id = v_source_id
    LIMIT 1;

    IF v_existing_je IS NULL THEN
        RETURN jsonb_build_object(
            'result', 'NOT_REPAIRABLE',
            'entity_id', p_entity_id,
            'source_type', v_status,
            'source_id', v_source_id,
            'explanation', 'Remediation did not result in a journal entry for the requested fact.'
        );
    END IF;

    RETURN jsonb_build_object(
        'result', 'REPAIRED',
        'entity_id', p_entity_id,
        'source_type', v_status,
        'source_id', v_source_id,
        'source_transaction_id', v_existing_st::text,
        'journal_entry_id', v_existing_je::text,
        'transaction_date', v_txn_date::text,
        'amount', v_amount_text,
        'remediator_id', v_remediator_id_final,
        'remediator_label', v_remediator_label_final,
        'explanation', 'Qualified missing accounting fact was remediated through the existing boundary.'
    );
END;
$function$
;
