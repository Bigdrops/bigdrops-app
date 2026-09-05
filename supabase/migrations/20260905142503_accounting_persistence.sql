-- ============================================================
-- ACCOUNTING FOUNDATION INCREMENT 2 — PERSISTENCE KERNEL
-- ============================================================
-- Gate A (CLOSED): books are entity-scoped. Logical owner is
-- public.entities.id. Tenant schemas provide physical isolation.
-- Gate B (CLOSED): domain amounts are exact decimal strings
-- (Decimal.js, precision 20, ROUND_HALF_UP). New accounting money
-- columns use NUMERIC(18,2). FLOAT/REAL/DOUBLE are prohibited.
--
-- Scope: accounts, accounting periods, journal entries, journal
-- lines. Tenant isolation, RLS, idempotency, database-enforced
-- balanced posting, immutability, deterministic seed chart.
--
-- Out of scope: ingestion adapters, expenses, fixed assets, tax,
-- CIT, compliance, reporting, backfill of historical data.
--
-- Mechanism (follows existing conventions):
--   1. Canonical tables live in tenant_master_template (no RLS,
--      no data — same rule as all template tables).
--   2. provision_entity() clones them per entity via the extended
--      _prov_get_template_tables() list (RLS + triggers + FKs run
--      through the existing generic steps).
--   3. Existing entity_% schemas are backfilled by the DO block.
--   4. Posting runs through public.post_accounting_entry(), which
--      mirrors the record_payment_transaction() pattern
--      (SECURITY DEFINER, SET search_path TO 'public', dynamic
--      schema resolution, has_entity_permission gate, one atomic
--      transaction).
--   5. Row-level triggers enforce immutability, period lifecycle,
--      and the balance invariant for ANY writer, not just the RPC.
--
-- Design note — line representation: side + amount
-- (side IN ('debit','credit'), amount NUMERIC(18,2) >= 0).
-- This matches the domain JournalLine contract exactly
-- (src/domain/accounting/types.ts) and avoids the dual-column
-- invariant (both/neither positive) entirely.
--
-- Design note — ownership columns: tenant tables carry no
-- entity_id column (verified: invoices and all 32 template tables
-- use schema placement + baked RLS literal as the boundary).
-- Journal lines inherit ownership from their entry through the
-- entry_id FK; every line table shares the entry's schema and RLS.
-- The 'reversed' lifecycle state is derived (EXISTS a reversal
-- entry pointing at this entry), never stored — storing it would
-- require mutating the immutable original.

-- ============================================================
-- 1. CANONICAL TABLES IN tenant_master_template
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.accounting_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    parent_code text NULL REFERENCES tenant_master_template.accounting_accounts(code) ON DELETE RESTRICT,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT accounting_accounts_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS tenant_master_template.accounting_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    state text NOT NULL DEFAULT 'planned'
        CHECK (state IN ('planned', 'open', 'closed', 'locked')),
    start_date date NOT NULL,
    end_date date NOT NULL CHECK (end_date >= start_date),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT accounting_periods_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS tenant_master_template.journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    transaction_date date NOT NULL,
    posting_date date NOT NULL,
    source_type text NOT NULL CHECK (btrim(source_type) <> ''),
    source_id text NOT NULL CHECK (btrim(source_id) <> ''),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
    reversal_of_entry_id uuid NULL
        REFERENCES tenant_master_template.journal_entries(id) ON DELETE RESTRICT,
    memo text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT journal_entries_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS tenant_master_template.journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL
        REFERENCES tenant_master_template.journal_entries(id) ON DELETE CASCADE,
    account_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_accounts(id) ON DELETE RESTRICT,
    side text NOT NULL CHECK (side IN ('debit', 'credit')),
    amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
    line_no integer NOT NULL CHECK (line_no >= 1),
    memo text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_lines_entry_line_key UNIQUE (entry_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_period_id
    ON tenant_master_template.journal_entries USING btree (period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status
    ON tenant_master_template.journal_entries USING btree (status);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id
    ON tenant_master_template.journal_lines USING btree (account_id);

-- ============================================================
-- 2. KOBO AMOUNT VALIDATOR
-- ============================================================
-- Accepts only non-negative decimal text with at most 2 fraction
-- digits. Rejects negatives, exponents, blanks, and anything the
-- Decimal domain contract would reject. Never substitutes zero.

CREATE OR REPLACE FUNCTION public.accounting_kobo_amount(p_text text)
RETURNS NUMERIC(18,2)
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_text IS NULL OR btrim(p_text) = '' THEN
        RAISE EXCEPTION 'malformed amount: value is empty'
            USING ERRCODE = '22018';
    END IF;
    IF p_text !~ '^\d+(\.\d{1,2})?$' THEN
        RAISE EXCEPTION 'malformed amount: %', p_text
            USING ERRCODE = '22018';
    END IF;
    RETURN p_text::NUMERIC(18,2);
END;
$function$;

-- ============================================================
-- 3. ROW-LEVEL ENFORCEMENT TRIGGERS (ANY writer, not just RPC)
-- ============================================================

-- 3a. Journal entry guard: immutability of posted entries plus
-- full posting validation whenever a row becomes posted
-- (direct INSERT ... status='posted' or draft -> posted UPDATE).
CREATE OR REPLACE FUNCTION public.accounting_entry_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_state text;
    v_start date;
    v_end date;
    v_ref_status text;
    v_debit_n integer;
    v_credit_n integer;
    v_debits numeric;
    v_credits numeric;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'posted' THEN
            RAISE EXCEPTION 'posted journal entry % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
        RAISE EXCEPTION 'posted journal entry % is immutable', OLD.id
            USING ERRCODE = '25001';
    END IF;

    IF NEW.status = 'posted' THEN
        -- Reversal target must exist and be posted. The original is
        -- never mutated; the reversal is a new linked entry.
        IF NEW.reversal_of_entry_id IS NOT NULL THEN
            EXECUTE format(
                'SELECT status FROM %I.journal_entries WHERE id = $1',
                TG_TABLE_SCHEMA
            ) INTO v_ref_status USING NEW.reversal_of_entry_id;
            IF v_ref_status IS NULL THEN
                RAISE EXCEPTION 'reversal target % does not exist', NEW.reversal_of_entry_id
                    USING ERRCODE = '23503';
            END IF;
            IF v_ref_status <> 'posted' THEN
                RAISE EXCEPTION 'reversal target % is not posted', NEW.reversal_of_entry_id
                    USING ERRCODE = '25001';
            END IF;
        END IF;

        -- Period must exist and be open; transaction date in bounds.
        EXECUTE format(
            'SELECT state, start_date, end_date FROM %I.accounting_periods WHERE id = $1',
            TG_TABLE_SCHEMA
        ) INTO v_state, v_start, v_end USING NEW.period_id;
        IF v_state IS NULL THEN
            RAISE EXCEPTION 'unknown accounting period %', NEW.period_id
                USING ERRCODE = '23503';
        END IF;
        IF v_state <> 'open' THEN
            RAISE EXCEPTION 'period % is %; ordinary postings enter open periods only', NEW.period_id, v_state
                USING ERRCODE = '25001';
        END IF;
        IF NEW.transaction_date < v_start OR NEW.transaction_date > v_end THEN
            RAISE EXCEPTION 'transaction date % is outside period boundaries', NEW.transaction_date
                USING ERRCODE = '25001';
        END IF;

        -- Balance invariant: at least one debit and one credit line,
        -- exact NUMERIC equality (no float semantics involved).
        EXECUTE format(
            'SELECT count(*) FILTER (WHERE side = ''debit''),
                    count(*) FILTER (WHERE side = ''credit''),
                    COALESCE(SUM(amount) FILTER (WHERE side = ''debit''), 0),
                    COALESCE(SUM(amount) FILTER (WHERE side = ''credit''), 0)
             FROM %I.journal_lines WHERE entry_id = $1',
            TG_TABLE_SCHEMA
        ) INTO v_debit_n, v_credit_n, v_debits, v_credits USING NEW.id;
        IF v_debit_n < 1 OR v_credit_n < 1 THEN
            RAISE EXCEPTION 'posted entry % needs at least one debit and one credit line', NEW.id
                USING ERRCODE = '25001';
        END IF;
        IF v_debits <> v_credits THEN
            RAISE EXCEPTION 'unbalanced posting: debits % <> credits %', v_debits, v_credits
                USING ERRCODE = '25001';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 3b. Journal line guard: lines of a posted entry are immutable.
-- Lines are always written while the parent is a draft (the RPC
-- inserts the draft header first), then the header flip validates.
CREATE OR REPLACE FUNCTION public.accounting_line_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_entry_id uuid;
    v_status text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_entry_id := OLD.entry_id;
    ELSE
        v_entry_id := NEW.entry_id;
    END IF;

    EXECUTE format(
        'SELECT status FROM %I.journal_entries WHERE id = $1',
        TG_TABLE_SCHEMA
    ) INTO v_status USING v_entry_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'unknown journal entry %', v_entry_id
            USING ERRCODE = '23503';
    END IF;
    IF v_status = 'posted' THEN
        RAISE EXCEPTION 'lines of posted journal entry % are immutable', v_entry_id
            USING ERRCODE = '25001';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

-- 3c. Period lifecycle guard: planned -> open -> closed -> locked.
-- Locked is terminal. Closed never reopens (corrections use
-- reverse-and-repost). Identity and bounds freeze after planned.
CREATE OR REPLACE FUNCTION public.accounting_period_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.state = 'locked' THEN
            RAISE EXCEPTION 'locked period % cannot change', OLD.code
                USING ERRCODE = '25001';
        END IF;
        IF OLD.state <> 'planned'
           AND (NEW.code IS DISTINCT FROM OLD.code
                OR NEW.start_date IS DISTINCT FROM OLD.start_date
                OR NEW.end_date IS DISTINCT FROM OLD.end_date) THEN
            RAISE EXCEPTION 'period % identity and bounds freeze after planned state', OLD.code
                USING ERRCODE = '25001';
        END IF;
        IF NEW.state IS DISTINCT FROM OLD.state THEN
            IF NOT ((OLD.state = 'planned' AND NEW.state = 'open')
                    OR (OLD.state = 'open' AND NEW.state = 'closed')
                    OR (OLD.state = 'closed' AND NEW.state = 'locked')) THEN
                RAISE EXCEPTION 'invalid period transition % -> %', OLD.state, NEW.state
                    USING ERRCODE = '25001';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 3d. Installer: binds the three guards inside one tenant schema.
-- Called by provisioning for new entities and by the backfill
-- below for existing ones.
CREATE OR REPLACE FUNCTION public._prov_install_accounting_triggers(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_journal_entries_guard ON %I.journal_entries', p_schema_name);
    EXECUTE format(
        'CREATE TRIGGER trg_journal_entries_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.journal_entries '
        'FOR EACH ROW EXECUTE FUNCTION public.accounting_entry_guard()',
        p_schema_name
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_journal_lines_guard ON %I.journal_lines', p_schema_name);
    EXECUTE format(
        'CREATE TRIGGER trg_journal_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.journal_lines '
        'FOR EACH ROW EXECUTE FUNCTION public.accounting_line_guard()',
        p_schema_name
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_accounting_periods_guard ON %I.accounting_periods', p_schema_name);
    EXECUTE format(
        'CREATE TRIGGER trg_accounting_periods_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.accounting_periods '
        'FOR EACH ROW EXECUTE FUNCTION public.accounting_period_guard()',
        p_schema_name
    );
END;
$function$;

-- ============================================================
-- 4. POSTING RPC (atomic; mirrors record_payment_transaction)
-- ============================================================
-- p_entry: {period_code, transaction_date, posting_date?,
--           source_type, source_id, idempotency_key, memo?,
--           reversal_of_entry_id?}
-- p_lines: [{account_code, side, amount (kobo text), memo?}]

CREATE OR REPLACE FUNCTION public.post_accounting_entry(
    p_entity_id uuid,
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
    v_period_code text;
    v_period_id uuid;
    v_txn_date date;
    v_posting_date date;
    v_source_type text;
    v_source_id text;
    v_key text;
    v_memo text;
    v_reversal_of uuid;
    v_entry_id uuid;
    v_line jsonb;
    v_line_no integer := 0;
    v_account_id uuid;
    v_account_active boolean;
    v_side text;
    v_amount NUMERIC(18,2);
    v_debits NUMERIC(18,2) := 0;
    v_credits NUMERIC(18,2) := 0;
    v_debit_n integer := 0;
    v_credit_n integer := 0;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Permission gate (mirrors tenant RLS): journal/create.
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Required header fields. Malformed input is rejected here;
    -- nothing is silently replaced with zero or defaults.
    v_period_code := btrim(COALESCE(p_entry->>'period_code', ''));
    IF v_period_code = '' THEN
        RAISE EXCEPTION 'missing period_code' USING ERRCODE = '22004';
    END IF;
    BEGIN
        v_txn_date := (p_entry->>'transaction_date')::date;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'malformed transaction_date: %', p_entry->>'transaction_date'
            USING ERRCODE = '22018';
    END;
    IF v_txn_date IS NULL THEN
        RAISE EXCEPTION 'missing transaction_date' USING ERRCODE = '22004';
    END IF;
    BEGIN
        v_posting_date := COALESCE(p_entry->>'posting_date', p_entry->>'transaction_date')::date;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'malformed posting_date: %', p_entry->>'posting_date'
            USING ERRCODE = '22018';
    END;
    v_source_type := btrim(COALESCE(p_entry->>'source_type', ''));
    v_source_id := btrim(COALESCE(p_entry->>'source_id', ''));
    IF v_source_type = '' OR v_source_id = '' THEN
        RAISE EXCEPTION 'missing source transaction reference' USING ERRCODE = '22004';
    END IF;
    v_key := btrim(COALESCE(p_entry->>'idempotency_key', ''));
    IF v_key = '' THEN
        RAISE EXCEPTION 'missing idempotency key' USING ERRCODE = '22004';
    END IF;
    v_memo := NULLIF(p_entry->>'memo', '');
    IF p_entry->>'reversal_of_entry_id' IS NOT NULL AND btrim(p_entry->>'reversal_of_entry_id') <> '' THEN
        BEGIN
            v_reversal_of := (p_entry->>'reversal_of_entry_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'malformed reversal_of_entry_id: %', p_entry->>'reversal_of_entry_id'
                USING ERRCODE = '22018';
        END;
    END IF;

    IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 1 THEN
        RAISE EXCEPTION 'posting needs at least one journal line' USING ERRCODE = '22004';
    END IF;

    -- Period lookup. State and date bounds are re-checked by the
    -- row trigger at flip time; this early check gives a clear error.
    EXECUTE format(
        'SELECT id FROM %I.accounting_periods WHERE code = $1',
        v_schema
    ) INTO v_period_id USING v_period_code;
    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'unknown accounting period %', v_period_code
            USING ERRCODE = '23503';
    END IF;

    -- Idempotency pre-check (UNIQUE constraint is the backstop).
    EXECUTE format(
        'SELECT id FROM %I.journal_entries WHERE idempotency_key = $1',
        v_schema
    ) INTO v_entry_id USING v_key;
    IF v_entry_id IS NOT NULL THEN
        RAISE EXCEPTION 'duplicate idempotency key: %', v_key
            USING ERRCODE = '23505';
    END IF;

    -- Insert the draft header first; lines attach to a draft parent.
    EXECUTE format(
        'INSERT INTO %I.journal_entries
            (period_id, transaction_date, posting_date, source_type, source_id,
             idempotency_key, status, reversal_of_entry_id, memo)
         VALUES ($1, $2, $3, $4, $5, $6, ''draft'', $7, $8) RETURNING id',
        v_schema
    ) INTO v_entry_id
    USING v_period_id, v_txn_date, v_posting_date, v_source_type,
          v_source_id, v_key, v_reversal_of, v_memo;

    -- Validate and insert every line.
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_line_no := v_line_no + 1;

        EXECUTE format(
            'SELECT id, active FROM %I.accounting_accounts WHERE code = $1',
            v_schema
        ) INTO v_account_id, v_account_active USING btrim(COALESCE(v_line->>'account_code', ''));
        IF v_account_id IS NULL THEN
            RAISE EXCEPTION 'unknown account %', v_line->>'account_code'
                USING ERRCODE = '23503';
        END IF;
        IF NOT v_account_active THEN
            RAISE EXCEPTION 'account % is inactive', v_line->>'account_code'
                USING ERRCODE = '25001';
        END IF;

        v_side := v_line->>'side';
        IF v_side IS NULL OR v_side NOT IN ('debit', 'credit') THEN
            RAISE EXCEPTION 'line %: side must be debit or credit', v_line_no
                USING ERRCODE = '22018';
        END IF;

        -- Kobo validation: rejects negatives, >2 decimals, garbage.
        v_amount := public.accounting_kobo_amount(v_line->>'amount');

        IF v_side = 'debit' THEN
            v_debits := v_debits + v_amount;
            v_debit_n := v_debit_n + 1;
        ELSE
            v_credits := v_credits + v_amount;
            v_credit_n := v_credit_n + 1;
        END IF;

        EXECUTE format(
            'INSERT INTO %I.journal_lines (entry_id, account_id, side, amount, line_no, memo)
             VALUES ($1, $2, $3, $4, $5, $6)',
            v_schema
        ) USING v_entry_id, v_account_id, v_side, v_amount, v_line_no,
              NULLIF(v_line->>'memo', '');
    END LOOP;

    -- Application-level balance check (exact NUMERIC). The row
    -- trigger re-validates at flip time for non-RPC writers.
    IF v_debit_n < 1 OR v_credit_n < 1 THEN
        RAISE EXCEPTION 'posted entry needs at least one debit and one credit line'
            USING ERRCODE = '25001';
    END IF;
    IF v_debits <> v_credits THEN
        RAISE EXCEPTION 'unbalanced posting: debits % <> credits %', v_debits, v_credits
            USING ERRCODE = '25001';
    END IF;

    -- Flip to posted. The entry guard trigger re-validates period
    -- state, date bounds, reversal target, and balance atomically.
    -- Any failure aborts the whole transaction: no partial posting.
    EXECUTE format(
        'UPDATE %I.journal_entries SET status = ''posted'' WHERE id = $1',
        v_schema
    ) USING v_entry_id;

    RETURN jsonb_build_object(
        'id', v_entry_id,
        'status', 'posted',
        'total_debits', v_debits,
        'total_credits', v_credits,
        'line_count', v_line_no
    );
END;
$function$;

-- ============================================================
-- 5. PROVISIONING REGISTRY: template list + resource mapping
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_get_template_tables()
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT ARRAY[
        'clients', 'settings', 'signatories', 'bank_accounts',
        'projects', 'project_documents',
        'quotations', 'quotation_items',
        'invoices', 'invoice_items', 'payments',
        'wht_receipts',
        'csrs', 'blank_csr_logs',
        'waybills', 'blank_waybill_logs',
        'tax_settings', 'tax_filings', 'tax_input_entries', 'tax_reminders',
        'receipts', 'letters',
        'boqs', 'boq_rows',
        'rfqs', 'rfq_items',
        'item_catalog', 'item_import_batches', 'item_aliases', 'item_merge_log',
        'audit_logs', 'activity_events',
        'accounting_accounts', 'accounting_periods',
        'journal_entries', 'journal_lines'
    ];
$function$;

CREATE OR REPLACE FUNCTION public._prov_table_to_resource(p_table text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT CASE p_table
        WHEN 'invoices' THEN 'invoice'
        WHEN 'invoice_items' THEN 'invoice'
        WHEN 'waybills' THEN 'waybill'
        WHEN 'blank_waybill_logs' THEN 'waybill'
        WHEN 'quotations' THEN 'quotation'
        WHEN 'quotation_items' THEN 'quotation'
        WHEN 'payments' THEN 'payment'
        WHEN 'wht_receipts' THEN 'payment'
        WHEN 'projects' THEN 'project'
        WHEN 'project_documents' THEN 'project_document'
        WHEN 'clients' THEN 'client'
        WHEN 'settings' THEN 'setting'
        WHEN 'signatories' THEN 'signatory'
        WHEN 'bank_accounts' THEN 'bank_account'
        WHEN 'csrs' THEN 'csr'
        WHEN 'blank_csr_logs' THEN 'csr'
        WHEN 'tax_settings' THEN 'tax_setting'
        WHEN 'tax_filings' THEN 'tax_setting'
        WHEN 'tax_input_entries' THEN 'tax_setting'
        WHEN 'tax_reminders' THEN 'tax_setting'
        WHEN 'receipts' THEN 'receipt'
        WHEN 'letters' THEN 'letter'
        WHEN 'boqs' THEN 'boq'
        WHEN 'boq_rows' THEN 'boq'
        WHEN 'rfqs' THEN 'rfq'
        WHEN 'rfq_items' THEN 'rfq'
        WHEN 'item_catalog' THEN 'item'
        WHEN 'item_aliases' THEN 'item'
        WHEN 'item_import_batches' THEN 'item'
        WHEN 'item_merge_log' THEN 'item'
        WHEN 'audit_logs' THEN 'audit'
        WHEN 'activity_events' THEN 'audit'
        WHEN 'accounting_accounts' THEN 'account'
        WHEN 'accounting_periods' THEN 'period'
        WHEN 'journal_entries' THEN 'journal'
        WHEN 'journal_lines' THEN 'journal'
        ELSE p_table
    END;
$function$;

-- ============================================================
-- 6. DEFAULT PERMISSIONS: account / period / journal
-- ============================================================
-- Follows the settings precedent (20260810000000): new resources
-- join the canonical default set with all four actions. Posted
-- facts stay immutable through row triggers regardless of the
-- coarse grant; RLS still gates every row by entity permission.

CREATE OR REPLACE FUNCTION public._prov_seed_default_permissions(
    p_entity_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT p_entity_id, p_user_id, r.resource, a.action
    FROM (
        VALUES
            ('invoice'), ('payment'), ('receipt'), ('setting'),
            ('account'), ('period'), ('journal')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- ============================================================
-- 7. DETERMINISTIC SEED CHART (11 accounts, idempotent)
-- ============================================================
-- Mirrors SEED_ACCOUNT_GROUPS in
-- src/domain/accounting/chartOfAccounts.ts. Runs per entity
-- schema at provisioning and in the backfill below. Re-runs
-- never duplicate: ON CONFLICT (code) DO NOTHING.

CREATE OR REPLACE FUNCTION public._prov_seed_chart_of_accounts(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    EXECUTE format(
        'INSERT INTO %I.accounting_accounts (code, name, type, normal_balance, active) VALUES
            (''1000'', ''Cash'', ''asset'', ''debit'', true),
            (''1100'', ''Bank'', ''asset'', ''debit'', true),
            (''1200'', ''Accounts Receivable'', ''asset'', ''debit'', true),
            (''1500'', ''Fixed Assets'', ''asset'', ''debit'', true),
            (''1510'', ''Accumulated Depreciation'', ''asset'', ''credit'', true),
            (''2000'', ''Accounts Payable'', ''liability'', ''credit'', true),
            (''2100'', ''VAT Control'', ''liability'', ''credit'', true),
            (''2200'', ''WHT Control'', ''liability'', ''credit'', true),
            (''3000'', ''Equity'', ''equity'', ''credit'', true),
            (''4000'', ''Revenue'', ''revenue'', ''credit'', true),
            (''5000'', ''Operating Expenses'', ''expense'', ''debit'', true)
         ON CONFLICT (code) DO NOTHING',
        p_schema_name
    );
END;
$function$;

-- ============================================================
-- 8. provision_entity() — adds chart-seed step 13b
-- ============================================================
-- Body is the tenant-neutral version (20260902160000) plus one
-- additive step. Accounting tables flow through the generic
-- clone + RLS + FK + trigger steps via the extended registry.

CREATE OR REPLACE FUNCTION public.provision_entity(p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_idempotency text;
    v_schema_name text;
    v_table text;
    v_resource text;
    v_tables text[];
    v_lock_key bigint;
    v_template_schema text := 'tenant_master_template';
BEGIN
    -- 1. Validate permissions
    PERFORM public._prov_validate_permissions(p_entity_id);

    -- 2. Idempotency check
    v_idempotency := public._prov_check_idempotency(p_entity_id);

    IF v_idempotency = 'ready' THEN
        v_schema_name := public._prov_get_schema_name(p_entity_id);
        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity already provisioned'
        );
    END IF;

    IF v_idempotency = 'creating' THEN
        RETURN jsonb_build_object(
            'status', 'creating',
            'message', 'Provisioning already in progress'
        );
    END IF;

    BEGIN
        -- 3. Acquire advisory lock (transaction-scoped, per-entity)
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        -- 4. Get schema name
        v_schema_name := public._prov_get_schema_name(p_entity_id);

        -- 5. Update status to 'creating'
        PERFORM public._prov_update_status(p_entity_id, 'creating');

        -- 6. Create schema (includes scoped GRANT USAGE + DML + EXECUTE)
        PERFORM public._prov_create_schema(v_schema_name);

        -- 7. Clone template tables from master template
        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table(v_template_schema, v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        -- 8. Re-add foreign keys (re-pointing from template to target schema)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys(v_template_schema, v_schema_name, v_table);
        END LOOP;

        -- 9. Install tenant-local triggers (set_row_updated_at, stamp_row_ownership)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_canonical_triggers(v_schema_name, v_table);
        END LOOP;

        -- 9b. Install accounting enforcement triggers
        PERFORM public._prov_install_accounting_triggers(v_schema_name);

        -- 10. Build tenant-local financial views
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 11. Setup item library
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);

        -- 12. Install tenant-local RPCs (audit, lifecycle, activity)
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        -- 13. Seed settings
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 13b. Seed accounting chart of accounts (deterministic, idempotent)
        PERFORM public._prov_seed_chart_of_accounts(v_schema_name);

        -- 14. Seed default permissions (now includes account/period/journal)
        PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());

        -- 15. Expose schema to PostgREST (Gate 2: pgrst.schemas config)
        PERFORM public._prov_expose_schema_to_postgrest(v_schema_name);

        -- 16. Finalize
        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        PERFORM public._prov_cleanup_on_error(v_schema_name);
        PERFORM public._prov_update_status(p_entity_id, 'failed', SQLERRM);

        RETURN jsonb_build_object(
            'status', 'failed',
            'error', SQLERRM,
            'schema_name', v_schema_name
        );
    END;
END;
$function$;

-- ============================================================
-- 9. BACKFILL: existing entity schemas
-- ============================================================
-- Per schema: clone missing accounting tables, install RLS where
-- absent, re-add FKs, install canonical + accounting triggers,
-- fix grants, seed the chart, grant new resources to owners.
-- Each schema is isolated in its own sub-block; one failure
-- warns without stopping the rest.

DO $$
DECLARE
    v_schema text;
    v_entity_id uuid;
    v_workspace_id uuid;
    v_tbl text;
    v_res text;
    v_owner record;
    v_has_rls boolean;
BEGIN
    FOR v_schema IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'entity\_%'
          AND nspname <> 'tenant_master_template'
        ORDER BY nspname
    LOOP
        BEGIN
            SELECT e.id, e.workspace_id INTO v_entity_id, v_workspace_id
            FROM public.entities e
            JOIN public.workspaces w ON w.id = e.workspace_id
            WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
            LIMIT 1;

            IF v_entity_id IS NULL THEN
                RAISE WARNING 'Backfill skipped %: no entity row resolves the schema name', v_schema;
                CONTINUE;
            END IF;

            FOREACH v_tbl IN ARRAY ARRAY[
                'accounting_accounts', 'accounting_periods',
                'journal_entries', 'journal_lines'
            ]
            LOOP
                IF to_regclass(v_schema || '.' || v_tbl) IS NULL THEN
                    PERFORM public._prov_clone_table('tenant_master_template', v_schema, v_tbl);
                    RAISE NOTICE 'Backfill cloned %.%', v_schema, v_tbl;
                END IF;

                v_res := public._prov_table_to_resource(v_tbl);
                SELECT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = v_schema
                      AND tablename = v_tbl
                      AND policyname = v_tbl || '_select'
                ) INTO v_has_rls;
                IF NOT v_has_rls THEN
                    PERFORM public._prov_install_rls(v_schema, v_tbl, v_entity_id, v_res);
                    RAISE NOTICE 'Backfill installed RLS %.%', v_schema, v_tbl;
                END IF;

                PERFORM public._prov_readd_foreign_keys('tenant_master_template', v_schema, v_tbl);
                PERFORM public._prov_install_canonical_triggers(v_schema, v_tbl);
            END LOOP;

            PERFORM public._prov_install_accounting_triggers(v_schema);

            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.accounting_accounts, %I.accounting_periods, %I.journal_entries, %I.journal_lines TO anon, authenticated, service_role',
                v_schema, v_schema, v_schema, v_schema
            );

            PERFORM public._prov_seed_chart_of_accounts(v_schema);

            FOR v_owner IN
                SELECT user_id FROM public.workspace_members
                WHERE workspace_id = v_workspace_id AND role = 'owner'
            LOOP
                PERFORM public._prov_seed_default_permissions(v_entity_id, v_owner.user_id);
            END LOOP;

            RAISE NOTICE 'Backfill complete for %', v_schema;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Backfill failed for %: %', v_schema, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ============================================================
-- FINAL — Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
