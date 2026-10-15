-- ============================================================
-- COMMERCIAL PARTY FOUNDATION — Supplier directory + explicit party links
-- Architecture: OPTION B (linked role directories)
-- ============================================================
-- Adds the first-class supplier authority and an explicit one-to-one
-- link between a client record and a supplier record that belong to the
-- same business.
--
-- Design constraints honoured by this migration:
--   * Additive only. No existing table, column, id, foreign key, snapshot
--     or accounting row is touched.
--   * `clients` remains authoritative for the client role.
--   * No `commercial_parties` registry. No client id migration.
--   * Supplier identity is a new independent uuid. It is never derived
--     from `rfqs.vendor_name`, `expenses.vendor_name`, `tax_input_entries`
--     .vendor_name, or the legacy repurposed `cps_sheets.vendor_name`.
--   * No auto-linking by name. A link is always a user decision.
--   * No supplier banking or payment details.
--   * No uniqueness on supplier name, phone or email.
--
-- Tenancy: both tables live in `tenant_master_template` and are cloned
-- into every `entity_*` schema. An intra-schema foreign key is physically
-- tenant-scoped, so a link can never cross a tenant boundary.
--
-- Provisioning: this migration redefines the three canonical registry
-- functions and converges every eligible existing tenant schema.
-- Structurally incomplete schemas are skipped by name with a reason.
-- Any other failure aborts the migration.
-- ============================================================

-- ============================================================
-- 1. CANONICAL TABLE: suppliers
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.suppliers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    city text,
    state text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    archived_at timestamp with time zone,
    CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

-- Mirrors `clients`: a plain lookup index, deliberately NOT unique.
-- Two businesses may share a name. Identity is the id, never the name.
CREATE INDEX IF NOT EXISTS idx_suppliers_name
    ON tenant_master_template.suppliers USING btree (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_archived_at
    ON tenant_master_template.suppliers USING btree (archived_at);

-- ============================================================
-- 2. CANONICAL TABLE: client_supplier_links
-- ============================================================
-- One client links to at most one supplier, and one supplier to at most
-- one client. Both uniques are database-enforced, so duplicate link
-- attempts are rejected under concurrency rather than by application
-- pre-checks alone.
--
-- The link is identity metadata only. It is never read by accounting
-- and never used to resolve a document party.
--
-- Delete protection: both foreign keys are plain (NO ACTION). A linked
-- record cannot be destroyed until the link is explicitly removed. This
-- also guarantees historical documents cannot lose their party.
-- NOTE: `_prov_readd_foreign_keys` re-creates foreign keys without a
-- delete action, so tenant clones receive the same NO ACTION behaviour.

CREATE TABLE IF NOT EXISTS tenant_master_template.client_supplier_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT client_supplier_links_pkey PRIMARY KEY (id),
    CONSTRAINT client_supplier_links_client_id_key UNIQUE (client_id),
    CONSTRAINT client_supplier_links_supplier_id_key UNIQUE (supplier_id),
    CONSTRAINT client_supplier_links_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES tenant_master_template.clients(id),
    CONSTRAINT client_supplier_links_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES tenant_master_template.suppliers(id)
);

CREATE INDEX IF NOT EXISTS idx_client_supplier_links_supplier_id
    ON tenant_master_template.client_supplier_links USING btree (supplier_id);

-- ============================================================
-- 3. PROVISIONING REGISTRY
-- ============================================================
-- Reproduces the effective live baseline. The BOQ->CPS rename migration
-- (20261001081028) rewrote the live function bodies so the sheet tables
-- are named `cps_sheets` / `cps_rows`. That naming is preserved here.

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
        'cps_sheets', 'cps_rows',
        'rfqs', 'rfq_items',
        'item_catalog', 'item_import_batches', 'item_aliases', 'item_merge_log',
        'item_reviewed_separate_pairs', 'historical_review_candidate_rejections',
        'item_historical_reconciliation_decisions', 'item_historical_reconciliation_rows',
        'audit_logs', 'activity_events',
        'accounting_accounts', 'accounting_periods',
        'journal_entries', 'journal_lines',
        'expenses', 'source_transactions',
        'tax_adjustments', 'tax_qce', 'tax_loss_balances',
        'entity_tax_config', 'tax_computation_inputs',
        'tax_computation_results', 'tax_rule_versions',
        'suppliers', 'client_supplier_links'
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
        WHEN 'cps_sheets' THEN 'cps_sheets'
        WHEN 'cps_rows' THEN 'cps_sheets'
        WHEN 'rfqs' THEN 'rfq'
        WHEN 'rfq_items' THEN 'rfq'
        WHEN 'item_catalog' THEN 'item'
        WHEN 'item_aliases' THEN 'item'
        WHEN 'item_import_batches' THEN 'item'
        WHEN 'item_merge_log' THEN 'item'
        WHEN 'item_reviewed_separate_pairs' THEN 'item'
        WHEN 'historical_review_candidate_rejections' THEN 'item'
        WHEN 'item_historical_reconciliation_decisions' THEN 'item'
        WHEN 'item_historical_reconciliation_rows' THEN 'item'
        WHEN 'audit_logs' THEN 'audit'
        WHEN 'activity_events' THEN 'audit'
        WHEN 'accounting_accounts' THEN 'account'
        WHEN 'accounting_periods' THEN 'period'
        WHEN 'journal_entries' THEN 'journal'
        WHEN 'journal_lines' THEN 'journal'
        WHEN 'expenses' THEN 'expense'
        WHEN 'source_transactions' THEN 'source_transaction'
        WHEN 'tax_adjustments' THEN 'tax_setting'
        WHEN 'tax_qce' THEN 'tax_setting'
        WHEN 'tax_loss_balances' THEN 'tax_setting'
        WHEN 'entity_tax_config' THEN 'tax_setting'
        WHEN 'tax_computation_inputs' THEN 'tax_setting'
        WHEN 'tax_computation_results' THEN 'tax_setting'
        WHEN 'tax_rule_versions' THEN 'tax_setting'
        -- Supplier role authority. The link table shares the same permission
        -- resource: linking and unlinking is supplier-directory work.
        WHEN 'suppliers' THEN 'supplier'
        WHEN 'client_supplier_links' THEN 'supplier'
        ELSE p_table
    END;
$function$;

-- `supplier` is a dedicated resource. It is independent of `client`, so
-- supplier access can be granted or withheld without touching the client
-- directory's permissions.
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
            ('account'), ('period'), ('journal'), ('expense'),
            ('supplier')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- The canonical resource allowlist is a closed set. `supplier` must be
-- added here or every attempt to assign a supplier permission through a
-- role template raises 'Non-canonical permission pair'.
CREATE OR REPLACE FUNCTION public._perm_pair_is_canonical(p_resource text, p_action text)
RETURNS boolean
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
BEGIN
    IF p_action NOT IN ('view', 'create', 'edit', 'delete') THEN
        RETURN FALSE;
    END IF;
    RETURN p_resource IN (
        '*', 'invoice', 'quotation', 'payment', 'receipt', 'setting', 'waybill',
        'cps_sheets', 'rfq', 'csr', 'item', 'project', 'project_document', 'client',
        'signatory', 'bank_account', 'letter', 'tax_setting', 'account',
        'period', 'journal', 'source_transaction', 'audit', 'device',
        'supplier'
    );
END;
$function$;

-- ============================================================
-- 4. EXISTING-TENANT CONVERGENCE
-- ============================================================
-- Eligible schema: let any error propagate and fail the migration.
-- Structurally incomplete schema (no `clients`): skip by name with a
-- reason, following the document search convergence precedent.

DO $do$
DECLARE
    v_schema        text;
    v_entity_id     uuid;
    v_workspace_id  uuid;
    v_has_rls       boolean;
    v_owner         record;
    v_template      text := 'tenant_master_template';
    v_tables        text[] := ARRAY['suppliers', 'client_supplier_links'];
    v_table         text;
    v_installed     text[] := ARRAY[]::text[];
    v_skipped       text[] := ARRAY[]::text[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_template) THEN
        RAISE WARNING
            'tenant_master_template schema is missing — future tenants will not receive the supplier directory';
        RETURN;
    END IF;

    -- Install RLS + triggers on the template itself so the template carries
    -- the same access shape as every tenant schema.
    FOR v_table IN SELECT unnest(v_tables)
    LOOP
        PERFORM public._prov_install_canonical_triggers(v_template, v_table);
    END LOOP;

    FOR v_schema IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'entity\_%'
          AND nspname <> v_template
        ORDER BY nspname
    LOOP
        -- A schema without `clients` cannot carry a party link. Skip it by
        -- name instead of failing the migration.
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = v_schema AND tablename = 'clients'
        ) THEN
            RAISE WARNING 'supplier domain skipped: schema % is missing table(s) clients', v_schema;
            v_skipped := array_append(v_skipped, v_schema);
            CONTINUE;
        END IF;

        SELECT e.id, e.workspace_id INTO v_entity_id, v_workspace_id
        FROM public.entities e
        JOIN public.workspaces w ON w.id = e.workspace_id
        WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
        LIMIT 1;

        IF v_entity_id IS NULL THEN
            RAISE WARNING 'supplier domain skipped: schema % does not resolve to an entity row', v_schema;
            v_skipped := array_append(v_skipped, v_schema);
            CONTINUE;
        END IF;

        -- 4a. Clone any missing table, then install RLS, grants and triggers.
        FOR v_table IN SELECT unnest(v_tables)
        LOOP
            IF to_regclass(v_schema || '.' || v_table) IS NULL THEN
                PERFORM public._prov_clone_table(v_template, v_schema, v_table);
                RAISE NOTICE 'supplier domain cloned %.%', v_schema, v_table;
            END IF;

            SELECT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = v_schema
                  AND tablename = v_table
                  AND policyname = v_table || '_select'
            ) INTO v_has_rls;

            IF NOT v_has_rls THEN
                PERFORM public._prov_install_rls(v_schema, v_table, v_entity_id, 'supplier');
                RAISE NOTICE 'supplier domain installed RLS %.%', v_schema, v_table;
            END IF;

            PERFORM public._prov_install_canonical_triggers(v_schema, v_table);

            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO anon, authenticated, service_role',
                v_schema, v_table
            );
        END LOOP;

        -- 4b. Re-add the party-link foreign keys. `_prov_clone_table` drops
        -- them, so a freshly cloned link table has no referential integrity
        -- until they are restored here.
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'client_supplier_links_client_id_fkey'
              AND conrelid = format('%I.client_supplier_links', v_schema)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.client_supplier_links ADD CONSTRAINT client_supplier_links_client_id_fkey '
                'FOREIGN KEY (client_id) REFERENCES %I.clients(id)',
                v_schema, v_schema
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'client_supplier_links_supplier_id_fkey'
              AND conrelid = format('%I.client_supplier_links', v_schema)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.client_supplier_links ADD CONSTRAINT client_supplier_links_supplier_id_fkey '
                'FOREIGN KEY (supplier_id) REFERENCES %I.suppliers(id)',
                v_schema, v_schema
            );
        END IF;

        -- 4c. Seed the supplier permission for every workspace owner.
        -- `_prov_seed_default_permissions` is idempotent.
        FOR v_owner IN
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id = v_workspace_id AND role = 'owner'
        LOOP
            PERFORM public._prov_seed_default_permissions(v_entity_id, v_owner.user_id);
        END LOOP;

        v_installed := array_append(v_installed, v_schema);
    END LOOP;

    RAISE NOTICE 'supplier domain installed in % schema(s): %',
        coalesce(array_length(v_installed, 1), 0), array_to_string(v_installed, ', ');

    IF array_length(v_skipped, 1) IS NOT NULL THEN
        RAISE NOTICE 'supplier domain skipped in % structurally incomplete schema(s): %',
            array_length(v_skipped, 1), array_to_string(v_skipped, ', ');
    END IF;
END;
$do$;

-- ============================================================
-- FINAL — Reload the PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
