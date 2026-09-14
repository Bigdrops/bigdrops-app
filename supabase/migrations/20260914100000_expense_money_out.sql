-- ============================================================
-- EXPENSE / MONEY-OUT MODULE
-- ============================================================
-- Adds the expenses table to the accounting foundation.
-- Follows entity-scoped schema pattern (tenant_master_template).
--
-- Scope: expense entry capture, categorisation, posting lifecycle.
-- Out of scope: accounts payable workflow, fixed assets, tax engine.

-- ============================================================
-- 1. CANONICAL TABLE IN tenant_master_template
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_code text NOT NULL,
    transaction_date date NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    category text NOT NULL CHECK (category IN ('operational', 'capital', 'personal', 'non_deductible')),
    description text NOT NULL CHECK (btrim(description) <> ''),
    vendor_name text NULL,
    receipt_url text NULL,
    account_code text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
    source_transaction_id uuid NULL,
    journal_entry_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_expenses_status
    ON tenant_master_template.expenses USING btree (status);
CREATE INDEX IF NOT EXISTS idx_expenses_category
    ON tenant_master_template.expenses USING btree (category);
CREATE INDEX IF NOT EXISTS idx_expenses_period_code
    ON tenant_master_template.expenses USING btree (period_code);
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_date
    ON tenant_master_template.expenses USING btree (transaction_date);

-- ============================================================
-- 2. ROW-LEVEL ENFORCEMENT TRIGGER (ANY writer)
-- ============================================================

CREATE OR REPLACE FUNCTION public.expense_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_status text;
    v_period_state text;
    v_period_start date;
    v_period_end date;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'posted' THEN
            RAISE EXCEPTION 'posted expense % is immutable', OLD.id
                USING ERRCODE = '25001';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
        RAISE EXCEPTION 'posted expense % is immutable', OLD.id
            USING ERRCODE = '25001';
    END IF;

    IF NEW.status = 'posted' THEN
        -- Period must exist and be open; transaction date in bounds.
        EXECUTE format(
            'SELECT state, start_date, end_date FROM %I.accounting_periods WHERE code = $1',
            TG_TABLE_SCHEMA
        ) INTO v_period_state, v_period_start, v_period_end USING NEW.period_code;
        IF v_period_state IS NULL THEN
            RAISE EXCEPTION 'unknown accounting period %', NEW.period_code
                USING ERRCODE = '23503';
        END IF;
        IF v_period_state <> 'open' THEN
            RAISE EXCEPTION 'period % is %; expenses enter open periods only', NEW.period_code, v_period_state
                USING ERRCODE = '25001';
        END IF;
        IF NEW.transaction_date < v_period_start OR NEW.transaction_date > v_period_end THEN
            RAISE EXCEPTION 'transaction date % is outside period boundaries', NEW.transaction_date
                USING ERRCODE = '25001';
        END IF;

        -- Amount must be positive.
        IF NEW.amount <= 0 THEN
            RAISE EXCEPTION 'expense amount must be greater than zero'
                USING ERRCODE = '25001';
        END IF;

        -- Journal entry must exist for posted expense.
        IF NEW.journal_entry_id IS NULL THEN
            RAISE EXCEPTION 'posted expense must have a journal entry'
                USING ERRCODE = '25001';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. INSTALL TRIGGER IN TENANT SCHEMA
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_install_expense_trigger(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_expenses_guard ON %I.expenses', p_schema_name);
    EXECUTE format(
        'CREATE TRIGGER trg_expenses_guard BEFORE INSERT OR UPDATE OR DELETE ON %I.expenses '
        'FOR EACH ROW EXECUTE FUNCTION public.expense_guard()',
        p_schema_name
    );
END;
$function$;

-- ============================================================
-- 4. REGISTER IN PROVISIONING
-- ============================================================

-- Add expenses to template table list
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
        'expenses'
    ];
$function$;

-- Add expenses to resource mapping
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
        WHEN 'expenses' THEN 'expense'
        ELSE p_table
    END;
$function$;

-- Add expense to default permissions
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
            ('account'), ('period'), ('journal'), ('expense')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- ============================================================
-- 5. BACKFILL: existing entity schemas
-- ============================================================

DO $$
DECLARE
    v_schema text;
    v_entity_id uuid;
    v_workspace_id uuid;
    v_has_rls boolean;
    v_owner record;
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
                RAISE WARNING 'Expenses backfill skipped %: no entity row resolves the schema name', v_schema;
                CONTINUE;
            END IF;

            -- Clone expenses table if missing
            IF to_regclass(v_schema || '.expenses') IS NULL THEN
                PERFORM public._prov_clone_table('tenant_master_template', v_schema, 'expenses');
                RAISE NOTICE 'Backfill cloned %.expenses', v_schema;
            END IF;

            -- Install RLS if missing
            SELECT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = v_schema
                  AND tablename = 'expenses'
                  AND policyname = 'expenses_select'
            ) INTO v_has_rls;
            IF NOT v_has_rls THEN
                PERFORM public._prov_install_rls(v_schema, 'expenses', v_entity_id, 'expense');
                RAISE NOTICE 'Backfill installed RLS %.expenses', v_schema;
            END IF;

            -- Install expense trigger
            PERFORM public._prov_install_expense_trigger(v_schema);

            -- Grant permissions
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.expenses TO anon, authenticated, service_role',
                v_schema
            );

            -- Seed default permissions for expense resource
            FOR v_owner IN
                SELECT user_id FROM public.workspace_members
                WHERE workspace_id = v_workspace_id AND role = 'owner'
            LOOP
                PERFORM public._prov_seed_default_permissions(v_entity_id, v_owner.user_id);
            END LOOP;

            RAISE NOTICE 'Expenses backfill complete for %', v_schema;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Expenses backfill failed for %: %', v_schema, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ============================================================
-- FINAL — Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
