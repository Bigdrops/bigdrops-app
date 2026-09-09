-- ============================================================
-- ACCOUNTING FOUNDATION — GAP 1: JOURNAL-DERIVED REPORTING FOUNDATION
-- Canonical spec: docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/
--                 Gap-1-journal-derived-reporting-foundation-spec-v1.md (v1.1)
--
-- ONE read-only derivation boundary:
--   journal_entries + journal_lines  →  account balances, period totals
--   (bounded opening/closing chains),  trial balance (equality assertion).
--
-- INVARIANT: reporting never mutates accounting state. This file
-- contains no data-mutation statement. Reporting is as-of-read.
--
-- DERIVATION RULES (spec section 9):
--   9.1  Posted only. Draft entries contribute nothing. Active entries
--        only: a posted entry is active only if it has not been
--        reversed by a posted reversal entry. A reversed original is
--        excluded; the reversal stays active unless itself reversed;
--        both rows remain in journal history for audit.
--   9.2  Sign convention: side + non-negative amount. Debit total =
--        SUM(amount WHERE side = debit); credit total likewise;
--        net = debit - credit. No signed amounts exist or are invented.
--   9.3  Inactive accounts still report (they reject new postings;
--        history stays visible).
--   9.4  Period net per account from active posted lines of that
--        period. Opening net = cumulative net over strictly earlier
--        periods in period order (start_date, then code — codes are
--        UNIQUE, so the pair is a deterministic total order).
--        Closing net = opening net + period net. The optional
--        p_period_id bound is inclusive and caps every chain.
--   9.5  Trial balance asserts grand debit = grand credit. A mismatch
--        is surfaced as data (is_equal flag). It is never repaired,
--        never absorbed, and never blocks the report.
--   9.7  Exactness: sums computed in Postgres NUMERIC; amounts cross
--        the boundary as exact text.
--
-- REVERSAL SEMANTICS ARE FIXED BY SPEC SECTION 9.6 — DO NOT ALTER:
--   the active derivation of a reversed pair reflects the reversal
--   entry alone; the pair nets to zero as journal facts. Today no
--   posted reversal can exist (Gap 2 is not implemented), so this
--   rule is forward-looking. No partial-reversal support is invented.
--
-- SURFACE DECISION (spec section 18, item 3): one SECURITY DEFINER
-- RPC per entity call, following the Increment 5
-- reconcile_accounting_integrity pattern: schema resolution through
-- the entity id, has_entity_permission gate on journal/view, %I
-- schema qualification for every table, jsonb result, exact-text
-- amounts, NOTIFY pgrst at the end.
--
-- VERIFIED (spec section 18, items 1-2):
--   1. Draft residue: the only status writer in any migration is the
--      single-transaction draft-to-posted flip inside
--      post_accounting_entry. No supported path leaves a
--      posted-eligible entry in draft. The posted-only rule stays
--      literal regardless; the residue count is surfaced as data.
--   2. Period ordering: (start_date, code) — chronological and
--      deterministic; period codes are UNIQUE, so the pair is a
--      total order with no tie.
--
-- EXCLUSIONS (spec section 7): no posting-kernel change, no reversal
-- flow (Gap 2), no tax/VAT/WHT/CIT logic, no P&L, no UI, no cache,
-- no new tables, no new columns, no operational-aggregate switch.
-- ============================================================

CREATE OR REPLACE FUNCTION public.derive_accounting_reporting(
    p_entity_id uuid,
    p_period_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema        text;
    v_bound_start   date;
    v_bound_code    text;
    v_bound_filter  text;
    v_core          jsonb;
    v_periods       jsonb;
    v_trace         jsonb;
    v_draft_count   integer;
    v_entry_count   integer;
    v_first_code    text;
    v_last_code     text;
BEGIN
    IF p_entity_id IS NULL THEN
        RAISE EXCEPTION 'missing entity id' USING ERRCODE = '22004';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Read gate: reporting observes accounting, it does not post.
    -- Mirrors the Increment 5 journal/view gate exactly.
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'view') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/view required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Optional inclusive period bound. Must exist when supplied.
    -- Codes are UNIQUE, so (start_date, code) is a total order and the
    -- inclusive bound is unambiguous. The bound caps the active line
    -- set and every opening/closing chain (spec 9.4).
    IF p_period_id IS NOT NULL THEN
        EXECUTE format(
            'SELECT start_date, code FROM %I.accounting_periods WHERE id = $1',
            v_schema
        ) INTO v_bound_start, v_bound_code USING p_period_id;
        IF v_bound_start IS NULL THEN
            RAISE EXCEPTION 'unknown accounting period %', p_period_id
                USING ERRCODE = '23503';
        END IF;
        v_bound_filter := format(
            ' (p.start_date, p.code) <= (%L::date, %L) ',
            v_bound_start::text, v_bound_code
        );
    ELSE
        v_bound_filter := ' TRUE ';
    END IF;

    -- ========================================================
    -- 1. BALANCES + TRIAL BALANCE (spec 9.3, 9.5)
    -- ========================================================
    -- One active-line definition (posted, not reversed, bound applied),
    -- reused verbatim by every block below. Every account reports,
    -- active or not. Net = debit - credit. Per-account debit ≠ credit
    -- is normal accounting state, never an error; the only equality
    -- assertion is the trial-balance grand total.
    EXECUTE format($q$
        WITH active AS (
            SELECT je.period_id, jl.account_id, jl.side, jl.amount
            FROM %I.journal_lines jl
            JOIN %I.journal_entries je ON je.id = jl.entry_id
            JOIN %I.accounting_periods p ON p.id = je.period_id
            WHERE je.status = 'posted'
              AND NOT EXISTS (
                    SELECT 1
                    FROM %I.journal_entries r
                    WHERE r.status = 'posted'
                      AND r.reversal_of_entry_id = je.id
              )
              AND %s
        ),
        tb AS (
            SELECT
                a.id::text AS account_id,
                a.code,
                a.name,
                a.type,
                a.normal_balance,
                a.active,
                COALESCE(SUM(l.amount) FILTER (WHERE l.side = 'debit'), 0)  AS debits,
                COALESCE(SUM(l.amount) FILTER (WHERE l.side = 'credit'), 0) AS credits
            FROM %I.accounting_accounts a
            LEFT JOIN active l ON l.account_id = a.id
            GROUP BY a.id, a.code, a.name, a.type, a.normal_balance, a.active
        ),
        grand AS (
            SELECT
                SUM(debits)  AS grand_debits,
                SUM(credits) AS grand_credits,
                (SUM(debits) = SUM(credits)) AS is_equal
            FROM tb
        )
        SELECT jsonb_build_object(
            'balances', (
                SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.code), '[]'::jsonb)
                FROM (
                    SELECT account_id, code, name, type, normal_balance, active,
                           debits::text           AS debit_total,
                           credits::text          AS credit_total,
                           (debits - credits)::text AS net
                    FROM tb
                ) b
            ),
            'trial_balance', (
                SELECT jsonb_build_object(
                    'rows', COALESCE((
                        SELECT jsonb_agg(to_jsonb(r) ORDER BY r.code)
                        FROM (
                            SELECT account_id, code, name, type, normal_balance, active,
                                   debits::text             AS debit_total,
                                   credits::text            AS credit_total,
                                   (debits - credits)::text AS net
                            FROM tb
                        ) r
                    ), '[]'::jsonb),
                    'grand_debits',  g.grand_debits::text,
                    'grand_credits', g.grand_credits::text,
                    'is_equal',      g.is_equal
                )
                FROM grand g
            )
        )
    $q$,
        v_schema, v_schema, v_schema, v_schema,  -- active: lines, entries, periods, reversal probe
        v_bound_filter,                          -- active: period bound
        v_schema                                 -- tb: accounts
    )
    INTO v_core;

    -- ========================================================
    -- 2. PERIOD TOTALS WITH OPENING / CLOSING (spec 9.4)
    -- ========================================================
    -- One row per account per period inside the bound. Opening net is
    -- the deterministic running sum over strictly earlier periods in
    -- (start_date, code) order; closing = opening + period net. The
    -- running sum runs over the FULL period x account grid, so a
    -- period with no activity for an account still carries the
    -- cumulative chain into its opening and closing figures.
    EXECUTE format($q$
        WITH active AS (
            SELECT je.period_id, jl.account_id, jl.side, jl.amount
            FROM %I.journal_lines jl
            JOIN %I.journal_entries je ON je.id = jl.entry_id
            JOIN %I.accounting_periods p ON p.id = je.period_id
            WHERE je.status = 'posted'
              AND NOT EXISTS (
                    SELECT 1
                    FROM %I.journal_entries r
                    WHERE r.status = 'posted'
                      AND r.reversal_of_entry_id = je.id
              )
              AND %s
        ),
        ap AS (
            SELECT
                p.id::text  AS period_id,
                p.code      AS period_code,
                p.state     AS period_state,
                p.start_date,
                a.id::text  AS account_id,
                a.code      AS account_code,
                a.name      AS account_name,
                COALESCE(SUM(l.amount) FILTER (WHERE l.side = 'debit'), 0)  AS debits,
                COALESCE(SUM(l.amount) FILTER (WHERE l.side = 'credit'), 0) AS credits
            FROM %I.accounting_periods p
            CROSS JOIN %I.accounting_accounts a
            LEFT JOIN active l ON l.period_id = p.id AND l.account_id = a.id
            WHERE %s
            GROUP BY p.id, p.code, p.state, p.start_date, a.id, a.code, a.name
        ),
        apx AS (
            SELECT
                ap.*,
                COALESCE(SUM(ap.debits - ap.credits) OVER (
                    PARTITION BY ap.account_id
                    ORDER BY ap.start_date, ap.period_code
                    ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                ), 0) AS opening_net
            FROM ap
        )
        SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.start_date, t.period_code, t.account_code), '[]'::jsonb)
        FROM (
            SELECT
                period_id, period_code, period_state, start_date,
                account_id, account_code, account_name,
                debits::text             AS debit_total,
                credits::text            AS credit_total,
                (debits - credits)::text AS net,
                opening_net::text        AS opening_net,
                (opening_net + debits - credits)::text AS closing_net
            FROM apx
        ) t
    $q$,
        v_schema, v_schema, v_schema, v_schema,  -- active: lines, entries, periods, reversal probe
        v_bound_filter,                          -- active: period bound
        v_schema, v_schema,                      -- ap: periods, accounts
        v_bound_filter                           -- ap: period bound
    )
    INTO v_periods;

    -- ========================================================
    -- 3. TRACEABILITY (spec 11)
    -- ========================================================
    -- Every derived figure walks: balance → account → journal lines →
    -- entries → period + source. The boundary returns the full active
    -- entry chain (entry, period, source linkage, reversal link).
    -- No derived fact exists without journal provenance.
    EXECUTE format($q$
        SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.start_date, e.period_code, e.entry_id), '[]'::jsonb)
        FROM (
            SELECT
                je.id::text    AS entry_id,
                p.id::text     AS period_id,
                p.code         AS period_code,
                p.start_date,
                je.transaction_date::text AS transaction_date,
                je.source_type,
                je.source_id,
                je.reversal_of_entry_id::text AS reversal_of_entry_id
            FROM %I.journal_entries je
            JOIN %I.accounting_periods p ON p.id = je.period_id
            WHERE je.status = 'posted'
              AND NOT EXISTS (
                    SELECT 1
                    FROM %I.journal_entries r
                    WHERE r.status = 'posted'
                      AND r.reversal_of_entry_id = je.id
              )
              AND %s
        ) e
    $q$, v_schema, v_schema, v_schema, v_bound_filter)
    INTO v_trace;

    -- ========================================================
    -- 4. DISCREPANCY CHECK: DRAFT RESIDUE (spec 9.6)
    -- ========================================================
    -- Verified: no supported path leaves a posted-eligible entry in
    -- draft. The count is surfaced as data; reporting never repairs.
    EXECUTE format($q$
        SELECT count(*)
        FROM %I.journal_entries je
        JOIN %I.accounting_periods p ON p.id = je.period_id
        WHERE je.status = 'draft'
          AND %s
    $q$, v_schema, v_schema, v_bound_filter)
    INTO v_draft_count;

    -- ========================================================
    -- 5. SCOPE METADATA
    -- ========================================================
    -- Active entry count plus chronological first/last period codes
    -- under the (start_date, code) order.
    EXECUTE format($q$
        SELECT
            (SELECT count(*)
             FROM %I.journal_entries je
             JOIN %I.accounting_periods p ON p.id = je.period_id
             WHERE je.status = 'posted'
               AND NOT EXISTS (
                     SELECT 1
                     FROM %I.journal_entries r
                     WHERE r.status = 'posted'
                       AND r.reversal_of_entry_id = je.id
               )
               AND %s),
            (SELECT p.code
             FROM %I.journal_entries je
             JOIN %I.accounting_periods p ON p.id = je.period_id
             WHERE je.status = 'posted'
               AND NOT EXISTS (
                     SELECT 1
                     FROM %I.journal_entries r
                     WHERE r.status = 'posted'
                       AND r.reversal_of_entry_id = je.id
               )
               AND %s
             ORDER BY p.start_date, p.code
             LIMIT 1),
            (SELECT p.code
             FROM %I.journal_entries je
             JOIN %I.accounting_periods p ON p.id = je.period_id
             WHERE je.status = 'posted'
               AND NOT EXISTS (
                     SELECT 1
                     FROM %I.journal_entries r
                     WHERE r.status = 'posted'
                       AND r.reversal_of_entry_id = je.id
               )
               AND %s
             ORDER BY p.start_date DESC, p.code DESC
             LIMIT 1)
    $q$,
        v_schema, v_schema, v_schema, v_bound_filter,
        v_schema, v_schema, v_bound_filter,
        v_schema, v_schema, v_bound_filter
    )
    INTO v_entry_count, v_first_code, v_last_code;

    RETURN jsonb_build_object(
        'entity_id',    p_entity_id,
        'generated_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'period_bound', CASE WHEN p_period_id IS NULL THEN NULL ELSE p_period_id::text END,
        'scope', jsonb_build_object(
            'posted_only',         true,
            'active_entries_only', true,
            'reversal_rule',       'v1.1: a posted entry is active only if not reversed by a posted reversal; reversed originals are excluded; the reversal stays active unless itself reversed; no partial reversal',
            'period_ordering',     'start_date, code (codes are UNIQUE; deterministic total order)',
            'entry_count',         v_entry_count,
            'first_period_code',   v_first_code,
            'last_period_code',    v_last_code
        ),
        'balances',      v_core->'balances',
        'periods',       v_periods,
        'trial_balance', v_core->'trial_balance',
        'source_trace',  v_trace,
        'draft_residue', jsonb_build_object(
            'count',       v_draft_count,
            'contributes', false,
            'note',        'Draft entries contribute nothing to any derived figure. Verified: no supported path leaves a posted-eligible entry in draft; the count is surfaced, never repaired.'
        )
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
