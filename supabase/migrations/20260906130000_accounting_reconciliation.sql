-- ============================================================
-- ACCOUNTING FOUNDATION INCREMENT 5 — RECONCILIATION & INTEGRITY
-- Read-only detection of mismatches between operational facts,
-- source transactions, and journal entries.
--
-- INVARIANT: this function NEVER mutates accounting state.
-- It contains no INSERT, UPDATE, or DELETE statements. Findings
-- accumulate in jsonb only. Repair is deferred to a controlled
-- future increment.
--
-- Provable relationships (no invented expectations):
--   journal_entries (source_type, source_id)  <- kernel-persisted
--   source_transactions (source_type, source_id)
--   idempotency_key is UNIQUE; (source_type, source_id) is not,
--   so duplicate accounting facts are detectable.
--   Kernel journal entries are inserted with status 'draft' and
--   never transitioned, so health never gates on entry status.
--
-- Qualification rules (operational records that expect accounting):
--   invoice: status NOT IN ('cancelled','voided','archived')
--   payment: voided_at IS NULL AND cash_amount > 0
-- Cancellation/void accounting is deferred, so records in those
-- states produce no finding even when a source transaction exists.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reconcile_accounting_integrity(p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema  text;
    v_batch   jsonb;
    v_findings jsonb := '[]'::jsonb;
BEGIN
    IF p_entity_id IS NULL THEN
        RAISE EXCEPTION 'missing entity id' USING ERRCODE = '22004';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Read gate: reconciliation observes accounting, it does not post.
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'view') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/view required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- ── 1. MISSING_SOURCE_TRANSACTION: qualified invoices with no ST ──
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'MISSING_SOURCE_TRANSACTION:invoice:' || i.id::text,
                'entity_id', %L::uuid,
                'category', 'invoice',
                'source_type', 'invoice',
                'source_id', i.id::text,
                'source_transaction_id', NULL,
                'journal_entry_id', NULL,
                'finding_type', 'MISSING_SOURCE_TRANSACTION',
                'severity', 'warning',
                'explanation', 'Invoice ' || COALESCE(i.invoice_number, i.id::text) ||
                    ' qualifies for accounting (status ' || i.status ||
                    ') but has no source transaction.',
                'transaction_date', i.issue_date,
                'amount', i.total::text,
                'actionable', true
            ) AS f
            FROM %I.invoices i
            WHERE i.status NOT IN ('cancelled', 'voided', 'archived')
              AND NOT EXISTS (
                    SELECT 1 FROM %I.source_transactions st
                    WHERE st.source_type = 'invoice' AND st.source_id = i.id::text)
        ) t
    $q$, p_entity_id::text, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 2. MISSING_SOURCE_TRANSACTION: qualified payments with no ST ──
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'MISSING_SOURCE_TRANSACTION:payment:' || p.id::text,
                'entity_id', %L::uuid,
                'category', 'payment',
                'source_type', 'payment',
                'source_id', p.id::text,
                'source_transaction_id', NULL,
                'journal_entry_id', NULL,
                'finding_type', 'MISSING_SOURCE_TRANSACTION',
                'severity', 'warning',
                'explanation', 'Payment ' || p.id::text ||
                    ' qualifies for accounting (voided_at is null, cash received) but has no source transaction.',
                'transaction_date', p.date,
                'amount', p.cash_amount::text,
                'actionable', true
            ) AS f
            FROM %I.payments p
            WHERE p.voided_at IS NULL
              AND p.cash_amount > 0
              AND NOT EXISTS (
                    SELECT 1 FROM %I.source_transactions st
                    WHERE st.source_type = 'payment' AND st.source_id = p.id::text)
        ) t
    $q$, p_entity_id::text, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 3. SOURCE_TRANSACTION_CAPTURED / SOURCE_TRANSACTION_CONFIRMED ──
    -- ST exists, its operational source exists (orphans handled in 6),
    -- but the lifecycle stalled before posting.
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', CASE st.lifecycle_status
                    WHEN 'captured' THEN 'SOURCE_TRANSACTION_CAPTURED'
                    ELSE 'SOURCE_TRANSACTION_CONFIRMED'
                END || ':' || st.source_type || ':' || st.source_id || ':' || st.id::text,
                'entity_id', %L::uuid,
                'category', st.source_type,
                'source_type', st.source_type,
                'source_id', st.source_id,
                'source_transaction_id', st.id::text,
                'journal_entry_id', NULL,
                'finding_type', CASE st.lifecycle_status
                    WHEN 'captured' THEN 'SOURCE_TRANSACTION_CAPTURED'
                    ELSE 'SOURCE_TRANSACTION_CONFIRMED'
                END,
                'severity', 'warning',
                'explanation', 'Source transaction ' || st.id::text || ' ('
                    || st.source_type || ' ' || st.source_id || ') is '
                    || st.lifecycle_status || ' but has never been posted.',
                'transaction_date', st.transaction_date,
                'amount', st.amount::text,
                'actionable', true
            ) AS f
            FROM %I.source_transactions st
            WHERE st.lifecycle_status IN ('captured', 'confirmed')
              AND st.source_type IN ('invoice', 'payment')
              AND CASE st.source_type
                    WHEN 'invoice' THEN EXISTS (
                        SELECT 1 FROM %I.invoices i WHERE i.id::text = st.source_id)
                    ELSE EXISTS (
                        SELECT 1 FROM %I.payments p WHERE p.id::text = st.source_id)
                  END
        ) t
    $q$, p_entity_id::text, v_schema, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 4. MISSING_JOURNAL: posted ST with no journal entry ──
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'MISSING_JOURNAL:' || st.source_type || ':' || st.source_id || ':' || st.id::text,
                'entity_id', %L::uuid,
                'category', st.source_type,
                'source_type', st.source_type,
                'source_id', st.source_id,
                'source_transaction_id', st.id::text,
                'journal_entry_id', NULL,
                'finding_type', 'MISSING_JOURNAL',
                'severity', 'error',
                'explanation', 'Source transaction ' || st.id::text || ' is posted but no journal entry exists for '
                    || st.source_type || ' ' || st.source_id || '.',
                'transaction_date', st.transaction_date,
                'amount', st.amount::text,
                'actionable', true
            ) AS f
            FROM %I.source_transactions st
            WHERE st.lifecycle_status = 'posted'
              AND st.source_type IN ('invoice', 'payment')
              AND NOT EXISTS (
                    SELECT 1 FROM %I.journal_entries je
                    WHERE je.source_type = st.source_type AND je.source_id = st.source_id)
        ) t
    $q$, p_entity_id::text, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 5. JOURNAL_MISMATCH: journal entry for a posted ST is unbalanced ──
    -- NUMERIC comparison in Postgres. Entry status is NOT gated: the
    -- kernel inserts entries as 'draft' and never transitions them.
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'JOURNAL_MISMATCH:' || je.source_type || ':' || je.source_id || ':' || je.id::text,
                'entity_id', %L::uuid,
                'category', je.source_type,
                'source_type', je.source_type,
                'source_id', je.source_id,
                'source_transaction_id', st.id::text,
                'journal_entry_id', je.id::text,
                'finding_type', 'JOURNAL_MISMATCH',
                'severity', 'error',
                'explanation', 'Journal entry ' || je.id::text || ' for posted source transaction '
                    || st.id::text || ' is unbalanced: debits ' || COALESCE(b.debits, 0)::text
                    || ' vs credits ' || COALESCE(b.credits, 0)::text || '.',
                'transaction_date', je.transaction_date,
                'amount', COALESCE(b.debits, 0)::text,
                'actionable', true
            ) AS f
            FROM %I.source_transactions st
            JOIN %I.journal_entries je
              ON je.source_type = st.source_type AND je.source_id = st.source_id
            LEFT JOIN (
                SELECT jl.entry_id,
                       SUM(jl.amount) FILTER (WHERE jl.side = 'debit') AS debits,
                       SUM(jl.amount) FILTER (WHERE jl.side = 'credit') AS credits
                FROM %I.journal_lines jl
                GROUP BY jl.entry_id
            ) b ON b.entry_id = je.id
            WHERE st.lifecycle_status = 'posted'
              AND st.source_type IN ('invoice', 'payment')
              AND COALESCE(b.debits, 0) <> COALESCE(b.credits, 0)
        ) t
    $q$, p_entity_id::text, v_schema, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 6. ORPHANED_SOURCE_TRANSACTION: ST whose operational row is gone ──
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'ORPHANED_SOURCE_TRANSACTION:' || st.source_type || ':' || st.source_id || ':' || st.id::text,
                'entity_id', %L::uuid,
                'category', st.source_type,
                'source_type', st.source_type,
                'source_id', st.source_id,
                'source_transaction_id', st.id::text,
                'journal_entry_id', NULL,
                'finding_type', 'ORPHANED_SOURCE_TRANSACTION',
                'severity', 'error',
                'explanation', 'Source transaction ' || st.id::text || ' references a missing '
                    || st.source_type || ' record ' || st.source_id || '.',
                'transaction_date', st.transaction_date,
                'amount', st.amount::text,
                'actionable', false
            ) AS f
            FROM %I.source_transactions st
            WHERE st.source_type IN ('invoice', 'payment')
              AND CASE st.source_type
                    WHEN 'invoice' THEN NOT EXISTS (
                        SELECT 1 FROM %I.invoices i WHERE i.id::text = st.source_id)
                    ELSE NOT EXISTS (
                        SELECT 1 FROM %I.payments p WHERE p.id::text = st.source_id)
                  END
        ) t
    $q$, p_entity_id::text, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 7. DUPLICATE_ACCOUNTING_FACT: multiple STs or multiple JEs per source ──
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'DUPLICATE_ACCOUNTING_FACT:source_transaction:' || d.source_type || ':' || d.source_id,
                'entity_id', %L::uuid,
                'category', d.source_type,
                'source_type', d.source_type,
                'source_id', d.source_id,
                'source_transaction_id', NULL,
                'journal_entry_id', NULL,
                'finding_type', 'DUPLICATE_ACCOUNTING_FACT',
                'severity', 'error',
                'explanation', d.cnt::text || ' source transactions exist for the same '
                    || d.source_type || ' ' || d.source_id || '.',
                'transaction_date', NULL,
                'amount', NULL,
                'actionable', false
            ) AS f
            FROM (
                SELECT st.source_type, st.source_id, count(*) AS cnt
                FROM %I.source_transactions st
                WHERE st.source_type IN ('invoice', 'payment')
                GROUP BY st.source_type, st.source_id
                HAVING count(*) > 1
            ) d
        ) t
    $q$, p_entity_id::text, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'DUPLICATE_ACCOUNTING_FACT:journal_entry:' || d.source_type || ':' || d.source_id,
                'entity_id', %L::uuid,
                'category', d.source_type,
                'source_type', d.source_type,
                'source_id', d.source_id,
                'source_transaction_id', NULL,
                'journal_entry_id', NULL,
                'finding_type', 'DUPLICATE_ACCOUNTING_FACT',
                'severity', 'error',
                'explanation', d.cnt::text || ' journal entries exist for the same '
                    || d.source_type || ' ' || d.source_id || '; accounting was posted more than once.',
                'transaction_date', NULL,
                'amount', NULL,
                'actionable', false
            ) AS f
            FROM (
                SELECT je.source_type, je.source_id, count(*) AS cnt
                FROM %I.journal_entries je
                WHERE je.source_type IN ('invoice', 'payment')
                GROUP BY je.source_type, je.source_id
                HAVING count(*) > 1
            ) d
        ) t
    $q$, p_entity_id::text, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    -- ── 8. MISSING_SOURCE_TRANSACTION (journal category): boundary bypass ──
    -- A journal entry for an invoice/payment fact with no source
    -- transaction means accounting was written outside the boundary.
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'finding_id', 'MISSING_SOURCE_TRANSACTION:journal:' || je.source_type || ':' || je.source_id || ':' || je.id::text,
                'entity_id', %L::uuid,
                'category', 'journal',
                'source_type', je.source_type,
                'source_id', je.source_id,
                'source_transaction_id', NULL,
                'journal_entry_id', je.id::text,
                'finding_type', 'MISSING_SOURCE_TRANSACTION',
                'severity', 'warning',
                'explanation', 'Journal entry ' || je.id::text || ' for '
                    || je.source_type || ' ' || je.source_id ||
                    ' has no source transaction; accounting was created outside the controlled boundary.',
                'transaction_date', je.transaction_date,
                'amount', NULL,
                'actionable', false
            ) AS f
            FROM %I.journal_entries je
            WHERE je.source_type IN ('invoice', 'payment')
              AND NOT EXISTS (
                    SELECT 1 FROM %I.source_transactions st
                    WHERE st.source_type = je.source_type AND st.source_id = je.source_id)
        ) t
    $q$, p_entity_id::text, v_schema, v_schema)
    INTO v_batch;
    v_findings := v_findings || v_batch;

    RETURN jsonb_build_object(
        'entity_id', p_entity_id,
        'generated_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'finding_count', jsonb_array_length(v_findings),
        'findings', v_findings
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
