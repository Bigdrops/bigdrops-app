-- ============================================================
-- PHASE 2A TAX ARCHITECTURE — 7 CORE TABLES
-- ============================================================
-- Audit passes: Audit → Design Challenge → Adjudication → Integrity Gate.
-- Canonical source: docs/Reports/taxation-made-easy/phase-2a-architecture-*.md
--
-- Scope:
--   Layer 2 (Tax Facts): tax_adjustments, tax_qce, tax_loss_balances,
--                         entity_tax_config
--   Layer 3 (Computation): tax_computation_inputs, tax_computation_results,
--                           tax_rule_versions
--
-- Architectural rules enforced:
--   - accounting_periods is the canonical period entity — no separate period model
--   - No hardcoded statutory rates or thresholds (owned by Gate E)
--   - No auto journal entries from tax adjustments
--   - Finalized computations are immutable (supersession = new row)
--   - input_snapshot is immutable once finalized
--   - Provenance via typed refs (source_transaction_id, journal_line_id)
--   - Derived values in tax_loss_balances are rebuildable caches
--
-- Mechanism follows accounting_persistence.sql conventions:
--   1. Canonical tables in tenant_master_template
--   2. provision_entity() clones them via extended registry
--   3. Existing entity_% schemas are backfilled
--   4. Row-level triggers enforce immutability
--
-- Out of scope: Gate E rules, VAT/WHT computation, capital allowance
-- calculations, compliance filings, posting RPCs.

-- ============================================================
-- 1. CANONICAL TABLES IN tenant_master_template
-- ============================================================

-- Layer 2: Tax adjustment facts
CREATE TABLE IF NOT EXISTS tenant_master_template.tax_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    source_transaction_id uuid NULL,
    journal_line_id uuid NULL,
    adjustment_type text NOT NULL
        CHECK (adjustment_type IN ('permanent', 'temporary', 'taxable_income', 'deductible_expense')),
    category text NOT NULL
        CHECK (category IN ('income', 'expense', 'capital_allowance', 'loss', 'exemption', 'non_deductible')),
    description text NOT NULL CHECK (btrim(description) <> ''),
    accounting_amount NUMERIC(18,2) NOT NULL,
    tax_amount NUMERIC(18,2) NOT NULL,
    rule_snapshot jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Layer 2: Qualifying capital expenditure facts
CREATE TABLE IF NOT EXISTS tenant_master_template.tax_qce (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    source_transaction_id uuid NULL,
    journal_line_id uuid NULL,
    qce_type text NOT NULL
        CHECK (qce_type IN ('qualifying', 'non_qualifying', 'restricted')),
    category text NOT NULL
        CHECK (category IN ('rent', 'repair', 'depreciation', 'fuel', 'maintenance', 'other')),
    description text NOT NULL CHECK (btrim(description) <> ''),
    amount NUMERIC(18,2) NOT NULL,
    rule_snapshot jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Layer 2: Tax loss balances (opening/loss_arising are facts;
--          loss_used/loss_expired/closing are derived rebuildable values)
CREATE TABLE IF NOT EXISTS tenant_master_template.tax_loss_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_arising NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_used NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_expired NUMERIC(18,2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Layer 2: Entity-level tax config (operational only, no statutory values)
CREATE TABLE IF NOT EXISTS tenant_master_template.entity_tax_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_type text NOT NULL DEFAULT 'small_company'
        CHECK (company_type IN ('small_company', 'medium_company', 'large_company')),
    is_vat_registered boolean NOT NULL DEFAULT false,
    remittance_schedule text NOT NULL DEFAULT 'monthly'
        CHECK (remittance_schedule IN ('monthly', 'quarterly', 'annually')),
    sector text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Layer 3: Computation inputs (immutable snapshot)
CREATE TABLE IF NOT EXISTS tenant_master_template.tax_computation_inputs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    input_snapshot jsonb NOT NULL,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'finalized')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Layer 3: Computation results (draft → finalized, immutable after finalization)
CREATE TABLE IF NOT EXISTS tenant_master_template.tax_computation_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    computation_input_id uuid NOT NULL
        REFERENCES tenant_master_template.tax_computation_inputs(id) ON DELETE RESTRICT,
    assessment_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
    chargeable_income NUMERIC(18,2) NOT NULL DEFAULT 0,
    tax_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
    tax_credits NUMERIC(18,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'finalized')),
    finalized_at timestamptz NULL,
    finalized_by uuid NULL,
    superseded_by uuid NULL
        REFERENCES tenant_master_template.tax_computation_results(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- Layer 3: Frozen tax rule snapshots (owned by Gate E)
CREATE TABLE IF NOT EXISTS tenant_master_template.tax_rule_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type text NOT NULL
        CHECK (rule_type IN ('cit_rules', 'qce_rules', 'loss_rules', 'capital_allowance', 'exemption')),
    rule_version text NOT NULL CHECK (btrim(rule_version) <> ''),
    effective_date date NOT NULL,
    expiry_date date NULL,
    rule_snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tax_adjustments_period
    ON tenant_master_template.tax_adjustments USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_adjustments_source_txn
    ON tenant_master_template.tax_adjustments USING btree (source_transaction_id)
    WHERE source_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tax_qce_period
    ON tenant_master_template.tax_qce USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_qce_source_txn
    ON tenant_master_template.tax_qce USING btree (source_transaction_id)
    WHERE source_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tax_loss_balances_period
    ON tenant_master_template.tax_loss_balances USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_computation_inputs_period
    ON tenant_master_template.tax_computation_inputs USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_computation_inputs_status
    ON tenant_master_template.tax_computation_inputs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tax_computation_results_period
    ON tenant_master_template.tax_computation_results USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_computation_results_status
    ON tenant_master_template.tax_computation_results USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tax_computation_results_input
    ON tenant_master_template.tax_computation_results USING btree (computation_input_id);
CREATE INDEX IF NOT EXISTS idx_tax_rule_versions_type
    ON tenant_master_template.tax_rule_versions USING btree (rule_type);
CREATE INDEX IF NOT EXISTS idx_tax_rule_versions_effective
    ON tenant_master_template.tax_rule_versions USING btree (effective_date);

-- ============================================================
-- 3. IMMUTABILITY TRIGGERS
-- ============================================================

-- 3a. Computation result guard: finalized results are immutable;
--     supersession creates a new row, never UPDATE.
CREATE OR REPLACE FUNCTION public.tax_computation_result_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'finalized' THEN
            RAISE EXCEPTION 'finalized tax computation result % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'finalized' THEN
        RAISE EXCEPTION 'finalized tax computation result % is immutable', OLD.id
            USING ERRCODE = '25001';
    END IF;

    -- Status transition: only draft → finalized allowed
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (OLD.status = 'draft' AND NEW.status = 'finalized') THEN
            RAISE EXCEPTION 'invalid status transition % → %', OLD.status, NEW.status
                USING ERRCODE = '25001';
        END IF;
        NEW.finalized_at := now();
        NEW.finalized_by := auth.uid();
    END IF;

    RETURN NEW;
END;
$function$;

-- 3b. Computation input guard: finalized inputs are immutable;
--     input_snapshot cannot be changed after finalization.
CREATE OR REPLACE FUNCTION public.tax_computation_input_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'finalized' THEN
            RAISE EXCEPTION 'finalized tax computation input % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'finalized' THEN
        RAISE EXCEPTION 'finalized tax computation input % is immutable', OLD.id
            USING ERRCODE = '25001';
    END IF;

    -- Status transition: only draft → finalized allowed
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (OLD.status = 'draft' AND NEW.status = 'finalized') THEN
            RAISE EXCEPTION 'invalid status transition % → %', OLD.status, NEW.status
                USING ERRCODE = '25001';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 3c. Installer: binds immutability triggers inside one tenant schema.
CREATE OR REPLACE FUNCTION public._prov_install_tax_triggers(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_tax_computation_results_guard ON %I.tax_computation_results', p_schema_name);
    EXECUTE format(
        'CREATE TRIGGER trg_tax_computation_results_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.tax_computation_results '
        'FOR EACH ROW EXECUTE FUNCTION public.tax_computation_result_guard()',
        p_schema_name
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_tax_computation_inputs_guard ON %I.tax_computation_inputs', p_schema_name);
    EXECUTE format(
        'CREATE TRIGGER trg_tax_computation_inputs_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.tax_computation_inputs '
        'FOR EACH ROW EXECUTE FUNCTION public.tax_computation_input_guard()',
        p_schema_name
    );
END;
$function$;

-- ============================================================
-- 4. PROVISIONING REGISTRY: extend template list + resource map
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
        'journal_entries', 'journal_lines',
        'tax_adjustments', 'tax_qce', 'tax_loss_balances', 'entity_tax_config',
        'tax_computation_inputs', 'tax_computation_results', 'tax_rule_versions'
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
        WHEN 'tax_adjustments' THEN 'tax'
        WHEN 'tax_qce' THEN 'tax'
        WHEN 'tax_loss_balances' THEN 'tax'
        WHEN 'entity_tax_config' THEN 'tax'
        WHEN 'tax_computation_inputs' THEN 'tax'
        WHEN 'tax_computation_results' THEN 'tax'
        WHEN 'tax_rule_versions' THEN 'tax'
        ELSE p_table
    END;
$function$;

-- ============================================================
-- 5. DEFAULT PERMISSIONS: add tax resource
-- ============================================================

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
            ('tax')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- ============================================================
-- 6. provision_entity() — adds tax trigger installation
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

        -- 9c. Install tax immutability triggers
        PERFORM public._prov_install_tax_triggers(v_schema_name);

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

        -- 14. Seed default permissions (now includes tax resource)
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
-- 7. BACKFILL: existing entity schemas
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

            -- Clone and RLS for each new tax table
            FOREACH v_tbl IN ARRAY ARRAY[
                'tax_adjustments', 'tax_qce', 'tax_loss_balances', 'entity_tax_config',
                'tax_computation_inputs', 'tax_computation_results', 'tax_rule_versions'
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

            -- Install tax immutability triggers
            PERFORM public._prov_install_tax_triggers(v_schema);

            -- Grant permissions on new tax tables
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE '
                '%I.tax_adjustments, %I.tax_qce, %I.tax_loss_balances, %I.entity_tax_config, '
                '%I.tax_computation_inputs, %I.tax_computation_results, %I.tax_rule_versions '
                'TO anon, authenticated, service_role',
                v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema
            );

            -- Seed default permissions for existing owners
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
