-- ============================================================
-- ACCOUNTING FOUNDATION INCREMENT 6 — CONTROLLED REMEDIATION
--
-- One mutation boundary: public.remediate_accounting_gap.
-- Re-validates the operational fact under row-level lock, then runs
-- the existing accounting ingestion/posting lifecycle atomically.
--
-- SCOPE (v1): disposable/test fixtures only. No production backfill
-- of the ~300 real pre-cutover gaps on `main`. Those remain quarantined
-- reconciliation findings in Increment 5. A future increment defines the
-- approval workflow and production backfill authority.
--
-- ATOMICITY (locked by task): row-level lock on the authoritative
-- operational record (invoices or payments) with FOR UPDATE, then
-- ingest_source_transaction -> confirm_source_transaction ->
-- post_from_source_transaction -> post_accounting_entry inside the
-- same transaction scope. The existing RPCs are procedures that return
-- jsonb and do not issue commit/rollback, so they inherit the caller's
-- transaction scope.
--
-- DUPLICATE PROTECTION: the existing increment-3 (source_type, source_id)
-- uniqueness on source_transactions is the authoritative guard; the
-- idempotency keys and the journal posting idempotency are the remaining
-- guards.
--
-- NO quarantine table. NO poll endpoint. NO new posting path.
-- ============================================================

-- Remitter for one explicitly identified accounting gap.
-- Caller supplies entity id, source type, operational source id.
-- Server re-validates everything from authoritative tables.
CREATE OR REPLACE FUNCTION public.remediate_accounting_gap(
    p_entity_id uuid,
    p_source_type text,
    p_source_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema        text;
    v_op_id         uuid;   -- invoice or payment id
    v_amount        numeric;
    v_amount_text   text;
    v_txn_date      date;
    v_currency      text;

    v_existing_st   uuid;
    v_existing_je   uuid;
    v_result        jsonb;

    v_invoice_id    uuid;
    v_payment_id    uuid;

    v_st_id         uuid;
    v_je_id         uuid;
    v_final_st_id   uuid;
    v_final_je_id   uuid;
    v_st_result     jsonb;
    v_confirm_result jsonb;
    v_post_result   jsonb;

    v_period_code   text;
    v_period_exists boolean;
BEGIN
    -- ---------------------------------------------------------------
    -- 1. Input validation
    -- ---------------------------------------------------------------
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
            'explanation', 'Only invoice or payment accounting facts are repairable in this increment.'
        );
    END IF;

    v_source_id := btrim(COALESCE(p_source_id, ''));
    IF v_source_id = '' THEN
        RETURN jsonb_build_object(
            'result', 'NOT_FOUND',
            'explanation', 'Operational source id is required.'
        );
    END IF;

    -- ---------------------------------------------------------------
    -- 2. Permission gate: journal/create is the established accounting-fact
    --    creation permission.
    -- ---------------------------------------------------------------
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RETURN jsonb_build_object(
            'result', 'NOT_REPAIRABLE',
            'explanation', 'Remediation requires the journal/create permission on this entity.'
        );
    END IF;

    -- ---------------------------------------------------------------
    -- 3. Payload preparation (no row lock yet; no point locking a row
    --    we cannot find).
    -- ---------------------------------------------------------------
    IF p_source_type = 'invoice' THEN
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

        -- Existing Source Transaction check.
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

        -- Existing journal check.
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

        v_invoice_id := v_op_id;

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

        v_payment_id := v_op_id;
    END IF;

    -- ---------------------------------------------------------------
    -- 4. Row-level lock on the authoritative operational record.
    --    This serializes concurrent remediation attempts for the same
    --    business fact before any accounting mutation begins.
    -- ---------------------------------------------------------------
    IF p_source_type = 'invoice' THEN
        EXECUTE format(
            'SELECT id FROM %I.invoices WHERE id = $1 FOR UPDATE',
            v_schema
        ) USING v_invoice_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'result', 'NOT_FOUND',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'explanation', 'Invoice vanished between validation and remediation lock.'
            );
        END IF;
    ELSE
        EXECUTE format(
            'SELECT id FROM %I.payments WHERE id = $1 FOR UPDATE',
            v_schema
        ) USING v_payment_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'result', 'NOT_FOUND',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'explanation', 'Payment vanished between validation and remediation lock.'
            );
        END IF;
    END IF;

    -- ---------------------------------------------------------------
    -- 5. Re-validate qualification under lock.
    -- ---------------------------------------------------------------
    IF p_source_type = 'invoice' THEN
        EXECUTE format(
            'SELECT id, total, issue_date, currency_code FROM %I.invoices WHERE id = $1 LIMIT 1',
            v_schema
        ) INTO v_op_id, v_amount, v_txn_date, v_currency;

        IF v_op_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'explanation', 'Invoice no longer qualifies under remediation lock.'
            );
        END IF;

        v_amount_text := v_amount::text;

        -- Re-check ST and journal under lock.
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
                'explanation', 'Another process resolved this invoice fact while remediation was in progress.'
            );
        END IF;

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
                'explanation', 'Another process resolved this invoice fact while remediation was in progress.'
            );
        END IF;

    ELSE
        EXECUTE format(
            'SELECT id, cash_amount, date, currency_code FROM %I.payments WHERE id = $1 LIMIT 1',
            v_schema
        ) INTO v_op_id, v_amount, v_txn_date, v_currency;

        IF v_op_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'explanation', 'Payment no longer qualifies under remediation lock.'
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
                'explanation', 'Another process resolved this payment fact while remediation was in progress.'
            );
        END IF;

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
                'explanation', 'Another process resolved this payment fact while remediation was in progress.'
            );
        END IF;
    END IF;

    -- ---------------------------------------------------------------
    -- 6. Period check (no period is created or reopened).
    -- ---------------------------------------------------------------
    v_period_exists := false;
    FOR v_period_exists IN
        SELECT true
        FROM %I.accounting_periods
        WHERE state = 'open'
          AND start_date <= v_txn_date
          AND v_txn_date <= end_date
        LIMIT 1
    LOOP
        EXIT;
    END LOOP;

    IF NOT v_period_exists THEN
        RETURN jsonb_build_object(
            'result', 'BLOCKED_NO_OPEN_PERIOD',
            'entity_id', p_entity_id,
            'source_type', p_source_type,
            'source_id', v_source_id,
            'transaction_date', v_txn_date::text,
            'amount', v_amount_text,
            'explanation', 'No open accounting period covers the transaction date; remediation is blocked.'
        );
    END IF;

    SELECT code INTO v_period_code
    FROM %I.accounting_periods
    WHERE state = 'open'
      AND start_date <= v_txn_date
      AND v_txn_date <= end_date
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'result', 'BLOCKED_NO_OPEN_PERIOD',
            'entity_id', p_entity_id,
            'source_type', p_source_type,
            'source_id', v_source_id,
            'transaction_date', v_txn_date::text,
            'amount', v_amount_text,
            'explanation', 'No open accounting period covers the transaction date; remediation is blocked.'
        );
    END IF;

    -- ---------------------------------------------------------------
    -- 7. Run the remediation path.
    --    7a. Ingest.
    --    7b. Confirm.
    --    7c. Post via the existing boundary.
    -- ---------------------------------------------------------------
    IF p_source_type = 'invoice' THEN
        -- 4A invoice claim: Dr 1200 A/R, Cr 4000 Revenue, exact amount.
        v_st_result := public.ingest_source_transaction(
            p_entity_id,
            'invoice',
            v_source_id,
            v_txn_date::text,
            v_amount_text,
            COALESCE(v_currency, 'NGN'),
            'customer',
            NULL,
            NULL
        );

        v_st_id := (COALESCE(v_st_result, '{}'::jsonb)->>'id')::uuid;

        IF v_st_id IS NULL THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'invoice',
                'source_id', v_source_id,
                'explanation', 'Ingestion did not return a source transaction id.'
            );
        END IF;

        v_confirm_result := public.confirm_source_transaction(p_entity_id, v_st_id);

        v_post_result := public.post_from_source_transaction(
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
            jsonb_build_array(
                jsonb_build_object('account_code','1200','side','debit','amount', v_amount_text, 'memo','Remediation of invoice claim receivable'),
                jsonb_build_object('account_code','4000','side','credit','amount', v_amount_text, 'memo','Remediation of invoice claim revenue')
            )
        );

        v_je_id := (COALESCE(v_post_result, '{}'::jsonb)->>'journal_entry_id')::uuid;

    ELSE
        -- 4B payment settlement: Dr 1100 Bank, Cr 1200 A/R, cash only.
        v_st_result := public.ingest_source_transaction(
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

        v_st_id := (COALESCE(v_st_result, '{}'::jsonb)->>'id')::uuid;

        IF v_st_id IS NULL THEN
            RETURN jsonb_build_object(
                'result', 'NOT_REPAIRABLE',
                'entity_id', p_entity_id,
                'source_type', 'payment',
                'source_id', v_source_id,
                'explanation', 'Ingestion did not return a source transaction id.'
            );
        END IF;

        v_confirm_result := public.confirm_source_transaction(p_entity_id, v_st_id);

        v_post_result := public.post_from_source_transaction(
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
            jsonb_build_array(
                jsonb_build_object('account_code','1100','side','debit','amount', v_amount_text, 'memo','Remediation of payment received'),
                jsonb_build_object('account_code','1200','side','credit','amount', v_amount_text, 'memo','Remediation of amount settled')
            )
        );

        v_je_id := (COALESCE(v_post_result, '{}'::jsonb)->>'journal_entry_id')::uuid;
    END IF;

    -- ---------------------------------------------------------------
    -- 8. Final re-query under lock to guarantee consistency.
    -- ---------------------------------------------------------------
    IF p_source_type = 'invoice' THEN
        SELECT id INTO v_final_st_id
        FROM %I.source_transactions
        WHERE source_type = 'invoice' AND source_id = v_source_id
        LIMIT 1;

        SELECT id INTO v_final_je_id
        FROM %I.journal_entries
        WHERE source_type = 'invoice' AND source_id = v_source_id
        LIMIT 1;
    ELSE
        SELECT id INTO v_final_st_id
        FROM %I.source_transactions
        WHERE source_type = 'payment' AND source_id = v_source_id
        LIMIT 1;

        SELECT id INTO v_final_je_id
        FROM %I.journal_entries
        WHERE source_type = 'payment' AND source_id = v_source_id
        LIMIT 1;
    END IF;

    IF v_final_je_id IS NULL THEN
        RETURN jsonb_build_object(
            'result', 'NOT_REPAIRABLE',
            'entity_id', p_entity_id,
            'source_type', p_source_type,
            'source_id', v_source_id,
            'explanation', 'Remediation did not result in a journal entry for the requested fact.'
        );
    END IF;

    RETURN jsonb_build_object(
        'result', 'REPAIRED',
        'entity_id', p_entity_id,
        'source_type', p_source_type,
        'source_id', v_source_id,
        'source_transaction_id', v_final_st_id::text,
        'journal_entry_id', v_final_je_id::text,
        'transaction_date', v_txn_date::text,
        'amount', v_amount_text,
        'remediator_id', NULL::uuid,
        'remediator_label', NULL::text,
        'explanation', 'Qualified missing accounting fact was remediated through the existing boundary.'
    );
END;
$function$
;

NOTIFY pgrst, 'reload schema';
