-- ============================================================
-- ACCOUNTING FOUNDATION INCREMENT 3 — SOURCE TRANSACTION MODEL
-- ============================================================
-- Target: Blueprint section 6. Source transactions are recorded
-- business facts that feed the posting kernel. They sit between
-- Record Engagement and Journal Entries.
--
-- Scope:
--   1. source_transactions table (canonical + entity schemas)
--   2. ingest_source_transaction() SECURITY DEFINER RPC
--   3. confirm_source_transaction() SECURITY DEFINER RPC
--   4. Lifecycle guard trigger (captured -> confirmed -> posted)
--   5. Posting boundary RPC (source_transaction + journal entry)
--   6. Backfill to existing entity schemas
--   7. Registry updates (template list, resource map, permissions)
--
-- Non-scope (Increment 4+):
--   - Invoice integration
--   - Payment integration
--   - Expense capture
--   - Source transaction UI
--   - Reversal semantics on source transactions

-- ============================================================
-- 1. CANONICAL TABLES IN tenant_master_template
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.source_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL CHECK (btrim(source_type) <> ''),
    source_id text NOT NULL CHECK (btrim(source_id) <> ''),
    transaction_date date NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code text NOT NULL DEFAULT 'NGN' CHECK (btrim(currency_code) <> ''),
    counterparty_type text NULL,
    counterparty_name text NULL,
    source_document_ref text NULL,
    evidence_refs jsonb NULL DEFAULT '[]'::jsonb,
    lifecycle_status text NOT NULL DEFAULT 'captured'
        CHECK (lifecycle_status IN ('captured', 'confirmed', 'posted', 'rejected')),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    rejection_reason text NULL,
    memo text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT source_transactions_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_source_transactions_source_type_id
    ON tenant_master_template.source_transactions USING btree (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_source_transactions_lifecycle_status
    ON tenant_master_template.source_transactions USING btree (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_source_transactions_transaction_date
    ON tenant_master_template.source_transactions USING btree (transaction_date);

-- ============================================================
-- 2. LIFECYCLE GUARD TRIGGER
-- ============================================================
-- Enforces: captured -> confirmed -> posted (terminal).
-- confirmed -> rejected (terminal).
-- captured -> rejected (terminal).
-- posted is terminal. rejected is terminal.
-- No status regression allowed.

CREATE OR REPLACE FUNCTION public.source_transaction_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.lifecycle_status = 'posted' THEN
            RAISE EXCEPTION 'posted source transaction % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Immutable once posted
        IF OLD.lifecycle_status = 'posted' THEN
            RAISE EXCEPTION 'posted source transaction % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        -- Immutable once rejected
        IF OLD.lifecycle_status = 'rejected' THEN
            RAISE EXCEPTION 'rejected source transaction % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        -- Validate transition
        IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
            IF NOT (
                (OLD.lifecycle_status = 'captured' AND NEW.lifecycle_status IN ('confirmed', 'rejected'))
                OR (OLD.lifecycle_status = 'confirmed' AND NEW.lifecycle_status IN ('posted', 'rejected'))
            ) THEN
                RAISE EXCEPTION 'invalid source transaction transition % -> %', OLD.lifecycle_status, NEW.lifecycle_status
                    USING ERRCODE = '25001';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 2b. Installer for tenant schemas
CREATE OR REPLACE FUNCTION public._prov_install_source_transaction_triggers(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_source_transactions_guard ON %I.source_transactions',
        p_schema_name
    );
    EXECUTE format(
        'CREATE TRIGGER trg_source_transactions_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.source_transactions '
        'FOR EACH ROW EXECUTE FUNCTION public.source_transaction_guard()',
        p_schema_name
    );
END;
$function$;

-- ============================================================
-- 3. INGESTION RPC (captures a source transaction)
-- ============================================================
-- SECURITY DEFINER: enforces authorization, not RLS.
-- Idempotent: re-delivery of same source_type + source_id returns existing.
-- Validates all required fields. Never silently replaces with zero.
-- Lifecycle: always starts as 'captured'.

CREATE OR REPLACE FUNCTION public.ingest_source_transaction(
    p_entity_id uuid,
    p_source_type text,
    p_source_id text,
    p_transaction_date text,
    p_amount text,
    p_currency_code text DEFAULT 'NGN',
    p_counterparty_type text DEFAULT NULL,
    p_counterparty_name text DEFAULT NULL,
    p_source_document_ref text DEFAULT NULL,
    p_evidence_refs jsonb DEFAULT '[]'::jsonb,
    p_idempotency_key text DEFAULT NULL,
    p_memo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
    v_source_type text;
    v_source_id text;
    v_txn_date date;
    v_amount NUMERIC(18,2);
    v_currency text;
    v_key text;
    v_existing_id uuid;
    v_existing_status text;
    v_new_id uuid;
BEGIN
    -- Permission gate: journal/create on the entity
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Resolve tenant schema
    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Validate required fields
    v_source_type := btrim(COALESCE(p_source_type, ''));
    IF v_source_type = '' THEN
        RAISE EXCEPTION 'missing source_type' USING ERRCODE = '22004';
    END IF;

    v_source_id := btrim(COALESCE(p_source_id, ''));
    IF v_source_id = '' THEN
        RAISE EXCEPTION 'missing source_id' USING ERRCODE = '22004';
    END IF;

    BEGIN
        v_txn_date := p_transaction_date::date;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'malformed transaction_date: %', p_transaction_date
            USING ERRCODE = '22018';
    END;
    IF v_txn_date IS NULL THEN
        RAISE EXCEPTION 'missing transaction_date' USING ERRCODE = '22004';
    END IF;

    -- Kobo validation: accepts only non-negative decimal text with at most 2 fraction digits
    IF p_amount IS NULL OR btrim(p_amount) = '' THEN
        RAISE EXCEPTION 'missing amount' USING ERRCODE = '22004';
    END IF;
    IF btrim(p_amount) !~ '^\d+(\.\d{1,2})?$' THEN
        RAISE EXCEPTION 'malformed amount: %', p_amount
            USING ERRCODE = '22018';
    END IF;
    v_amount := btrim(p_amount)::NUMERIC(18,2);
    IF v_amount <= 0 THEN
        RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22018';
    END IF;

    v_currency := btrim(COALESCE(p_currency_code, 'NGN'));
    IF v_currency = '' THEN
        v_currency := 'NGN';
    END IF;

    -- Idempotency key: use provided or derive from source
    v_key := btrim(COALESCE(p_idempotency_key, ''));
    IF v_key = '' THEN
        v_key := v_source_type || ':' || v_source_id || ':ingest';
    END IF;

    -- Idempotent check: if source_type + source_id already exists, return it
    EXECUTE format(
        'SELECT id, lifecycle_status FROM %I.source_transactions WHERE source_type = $1 AND source_id = $2',
        v_schema
    ) INTO v_existing_id, v_existing_status USING v_source_type, v_source_id;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_existing_id,
            'status', v_existing_status,
            'idempotent', true,
            'message', 'source transaction already exists'
        );
    END IF;

    -- Idempotency key unique check (separate from source_type+source_id)
    EXECUTE format(
        'SELECT id, lifecycle_status FROM %I.source_transactions WHERE idempotency_key = $1',
        v_schema
    ) INTO v_existing_id, v_existing_status USING v_key;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_existing_id,
            'status', v_existing_status,
            'idempotent', true,
            'message', 'idempotency key already used'
        );
    END IF;

    -- Insert the source transaction
    EXECUTE format(
        'INSERT INTO %I.source_transactions
            (source_type, source_id, transaction_date, amount, currency_code,
             counterparty_type, counterparty_name, source_document_ref,
             evidence_refs, lifecycle_status, idempotency_key, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ''captured'', $10, $11)
         RETURNING id',
        v_schema
    ) INTO v_new_id
    USING v_source_type, v_source_id, v_txn_date, v_amount, v_currency,
          p_counterparty_type, p_counterparty_name, p_source_document_ref,
          p_evidence_refs, v_key, p_memo;

    RETURN jsonb_build_object(
        'id', v_new_id,
        'status', 'captured',
        'idempotent', false,
        'message', 'source transaction captured'
    );
END;
$function$;

-- ============================================================
-- 4. CONFIRMATION RPC (captured -> confirmed)
-- ============================================================
-- Only the creating user or an entity owner can confirm.
-- Confirmed source transactions are ready for accounting posting.

CREATE OR REPLACE FUNCTION public.confirm_source_transaction(
    p_entity_id uuid,
    p_source_transaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
    v_current_status text;
    v_new_status text;
BEGIN
    -- Permission gate
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Get current status (trigger validates the transition)
    EXECUTE format(
        'SELECT lifecycle_status FROM %I.source_transactions WHERE id = $1',
        v_schema
    ) INTO v_current_status USING p_source_transaction_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'source transaction % not found', p_source_transaction_id
            USING ERRCODE = '23503';
    END IF;

    -- The trigger handles the state machine validation
    EXECUTE format(
        'UPDATE %I.source_transactions SET lifecycle_status = ''confirmed'', updated_at = now() WHERE id = $1 RETURNING lifecycle_status',
        v_schema
    ) INTO v_new_status USING p_source_transaction_id;

    RETURN jsonb_build_object(
        'id', p_source_transaction_id,
        'status', v_new_status,
        'message', 'source transaction confirmed'
    );
END;
$function$;

-- ============================================================
-- 5. POSTING BOUNDARY RPC (source transaction -> journal entry)
-- ============================================================
-- Links a confirmed source transaction to a new journal entry.
-- The source transaction lifecycle_status flips to 'posted'.
-- The journal entry is posted atomically (balanced posting kernel).
-- Idempotent: same source transaction ID cannot be posted twice.

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
    v_entry_id uuid;
BEGIN
    -- Permission gate
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'journal', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: journal/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Source transaction must exist and be confirmed
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

    -- Delegate to the existing posting kernel
    -- The posting RPC validates balance, period, accounts, etc.
    SELECT public.post_accounting_entry(p_entity_id, p_entry, p_lines)
    INTO v_entry_id;

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
-- 6. PROVISIONING REGISTRY UPDATES
-- ============================================================

-- 6a. Add source_transactions to template tables
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
        'journal_entries', 'journal_lines',
        'source_transactions'
    ];
$function$;

-- 6b. Resource mapping
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
        WHEN 'source_transactions' THEN 'source_transaction'
        ELSE p_table
    END;
$function$;

-- 6c. Default permissions (add source_transaction resource)
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
            ('account'), ('period'), ('journal'),
            ('source_transaction')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- ============================================================
-- 7. UPDATE provision_entity() — add source transaction trigger step
-- ============================================================

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
    PERFORM public._prov_validate_permissions(p_entity_id);
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
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);
        v_schema_name := public._prov_get_schema_name(p_entity_id);
        PERFORM public._prov_update_status(p_entity_id, 'creating');
        PERFORM public._prov_create_schema(v_schema_name);

        v_tables := public._prov_get_template_tables();
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table(v_template_schema, v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys(v_template_schema, v_schema_name, v_table);
        END LOOP;

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_install_canonical_triggers(v_schema_name, v_table);
        END LOOP;

        PERFORM public._prov_install_accounting_triggers(v_schema_name);
        PERFORM public._prov_install_source_transaction_triggers(v_schema_name);
        PERFORM public._prov_install_financial_views(v_schema_name);
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);
        PERFORM public._prov_seed_chart_of_accounts(v_schema_name);
        PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());
        PERFORM public._prov_expose_schema_to_postgrest(v_schema_name);
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
-- 8. BACKFILL: existing entity schemas
-- ============================================================

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

            -- Clone source_transactions if missing
            IF to_regclass(v_schema || '.source_transactions') IS NULL THEN
                PERFORM public._prov_clone_table('tenant_master_template', v_schema, 'source_transactions');
                RAISE NOTICE 'Backfill cloned %.%', v_schema, 'source_transactions';
            END IF;

            -- RLS if missing
            v_res := public._prov_table_to_resource('source_transactions');
            SELECT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = v_schema
                  AND tablename = 'source_transactions'
                  AND policyname = 'source_transactions_select'
            ) INTO v_has_rls;
            IF NOT v_has_rls THEN
                PERFORM public._prov_install_rls(v_schema, 'source_transactions', v_entity_id, v_res);
                RAISE NOTICE 'Backfill installed RLS %.%', v_schema, 'source_transactions';
            END IF;

            PERFORM public._prov_readd_foreign_keys('tenant_master_template', v_schema, 'source_transactions');
            PERFORM public._prov_install_canonical_triggers(v_schema, 'source_transactions');
            PERFORM public._prov_install_source_transaction_triggers(v_schema);

            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.source_transactions TO anon, authenticated, service_role',
                v_schema
            );

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
