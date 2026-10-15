-- ============================================================
-- PHASE C1 — SUPPLIER PURCHASE ORDER DOMAIN AND PERSISTENCE
-- ============================================================
-- A Supplier Purchase Order is an OUTGOING procurement commitment:
-- BOURXE issues it TO a supplier to request goods or services at agreed
-- costs. It is not a sales invoice, not a quotation, not a customer
-- order, not an expense posting, not a goods receipt, and not a
-- supplier payment.
--
-- Design constraints honoured by this migration:
--   * Additive only. No existing table, column, id, foreign key,
--     snapshot, accounting row, or numbering key is modified.
--   * `clients` and the sales documents are untouched.
--   * The PO hangs off `suppliers`, never off `clients`. There is no
--     `client_id` column anywhere in this feature.
--   * `client_supplier_links` is never read during PO persistence. A
--     dual-role business stays a supplier in the PO context.
--   * `supplier_name` is a frozen document snapshot. A later supplier
--     rename never rewrites historical PO rows.
--   * NO accounting side effects. Nothing here writes `source_transactions`,
--     `journal_entries`, `journal_lines`, `expenses`, or `payments`.
--   * NO inventory side effects. No stock, reservation, or receiving table.
--   * No PDF, no UI. Those arrive in later phases.
--
-- FINANCIAL AUTHORITY
--   Financial rules are NOT defined here and are NOT invented here.
--   `src/lib/Calculations.ts` `computeDocument()` is the exclusive
--   financial authority (`.claude/agent-instructions/core-guardrails.md`).
--   The database stores prepared, already-computed totals. The RPC only
--   validates their range; it never derives them.
--
-- Tenancy: both tables live in `tenant_master_template` and are cloned
-- into every `entity_*` schema. Every foreign key is intra-schema, so a
-- PO can never cross a tenant boundary.
--
-- Provisioning: this migration redefines the canonical registry
-- functions, extends the prefix CHECK with the new `purchase_order` key,
-- and converges every eligible existing tenant schema. Structurally
-- incomplete schemas are skipped by name with a reason. Any other
-- failure aborts the migration.
-- ============================================================

-- ============================================================
-- 1. CANONICAL TABLE: purchase_orders
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.purchase_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    po_number text NOT NULL,
    po_date date,
    -- Procurement party. `supplier_name` is the frozen snapshot written at
    -- save time. It is deliberately NOT derived from `boqs.vendor_name`,
    -- `rfqs.vendor_name`, or `expenses.vendor_name`.
    supplier_id uuid NOT NULL,
    supplier_name text,
    status text NOT NULL DEFAULT 'draft',
    currency text NOT NULL DEFAULT 'NGN',
    subtotal numeric NOT NULL DEFAULT 0,
    discount numeric NOT NULL DEFAULT 0,
    vat numeric NOT NULL DEFAULT 0,
    -- Additional charges, as prepared by the calculation input. Shape:
    -- [{"label": text, "value": numeric, "withTax": boolean}].
    extra_charges jsonb NOT NULL DEFAULT '[]'::jsonb,
    total numeric NOT NULL DEFAULT 0,
    -- The rate inputs behind `subtotal`/`discount`/`vat`/`total`. Persisting
    -- the inputs alongside the computed totals is required for a PO to be
    -- reopened and reproduced: `computeDocument()` reads rates, never
    -- stored totals, and inverting totals back into rates is lossy.
    -- Shape: {"vatPercent": n, "discountType": text, "discountTiming": text,
    --         "discountValue": n}.
    calculation_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes text,
    terms text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    archived_at timestamp with time zone,
    CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
    -- Number uniqueness is database-enforced, so concurrent saves cannot
    -- produce a duplicate PO number. The client-side skip-scan plus this
    -- constraint together arbitrate every allocation.
    CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number),
    -- Independent procurement life cycle. `cancelled` and `closed` are
    -- terminal. Status is never derived from invoice payment rules and
    -- never from goods received.
    CONSTRAINT check_purchase_orders_status CHECK (
        status IN ('draft', 'issued', 'cancelled', 'closed')
    ),
    -- Plain (NO ACTION) foreign key. A supplier that appears on any PO
    -- cannot be destroyed, so a Purchase Order can never be orphaned.
    -- NOTE: `_prov_readd_foreign_keys` re-creates foreign keys without a
    -- delete action, so tenant clones receive the same protection.
    CONSTRAINT purchase_orders_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES tenant_master_template.suppliers(id),
    CONSTRAINT purchase_orders_amounts_non_negative CHECK (
        subtotal >= 0 AND discount >= 0 AND vat >= 0 AND total >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
    ON tenant_master_template.purchase_orders USING btree (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
    ON tenant_master_template.purchase_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date
    ON tenant_master_template.purchase_orders USING btree (po_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_archived_at
    ON tenant_master_template.purchase_orders USING btree (archived_at);

-- ============================================================
-- 2. CANONICAL TABLE: purchase_order_items
-- ============================================================
-- `unit_cost` is a procurement cost, never a sales price. It is a
-- distinct column from `invoice_items.unit_price` and the two are never
-- interchanged.
--
-- `sort_order` preserves line ordering; `id` is the stable item identity.
-- No Item Library foreign key is introduced: a PO line is free text plus
-- a cost, and it must survive Item Library changes.

CREATE TABLE IF NOT EXISTS tenant_master_template.purchase_order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    purchase_order_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    unit text,
    unit_cost numeric NOT NULL DEFAULT 0,
    line_total numeric NOT NULL DEFAULT 0,
    sort_order integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_order_items_quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT purchase_order_items_unit_cost_non_negative CHECK (unit_cost >= 0),
    CONSTRAINT purchase_order_items_line_total_non_negative CHECK (line_total >= 0),
    CONSTRAINT purchase_order_items_purchase_order_id_fkey
        FOREIGN KEY (purchase_order_id)
        REFERENCES tenant_master_template.purchase_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id
    ON tenant_master_template.purchase_order_items USING btree (purchase_order_id, sort_order);

-- ============================================================
-- 3. PROVISIONING REGISTRY
-- ============================================================
-- Reproduces the effective live baseline. The BOQ->CPS rename migration
-- (20261001081028) rewrote the live function bodies so the sheet tables
-- are named `cps_sheets` / `cps_rows`. That naming is preserved verbatim.

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
        'suppliers', 'client_supplier_links',
        'purchase_orders', 'purchase_order_items'
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
        -- Purchase order authority. The item table shares the header's
        -- resource: item rows are only ever reachable through a PO.
        WHEN 'purchase_orders' THEN 'purchase_order'
        WHEN 'purchase_order_items' THEN 'purchase_order'
        ELSE p_table
    END;
$function$;

-- `purchase_order` is a dedicated resource. It is independent of
-- `invoice`, `quotation`, and `supplier`, so procurement access can be
-- granted or withheld without touching any other directory.
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
            ('supplier'), ('purchase_order')
    ) AS r(resource)
    CROSS JOIN (
        VALUES
            ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;
END;
$function$;

-- The canonical resource allowlist is a closed set. `purchase_order` must
-- be added here or every attempt to assign a PO permission through a role
-- template raises 'Non-canonical permission pair'. All pre-existing
-- resources, including `supplier`, are preserved unchanged.
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
        'supplier', 'purchase_order'
    );
END;
$function$;

-- ============================================================
-- 4. TRANSACTIONAL SAVE AUTHORITY
-- ============================================================
-- A dedicated PO save authority. The invoice and quotation save RPCs are
-- NOT reused: a PO has no client, posts no revenue, and follows its own
-- life cycle.
--
-- Guarantees:
--   * Header and items are written in ONE transaction. A failure anywhere
--     rolls back the whole save, so a partial header/item write cannot
--     survive.
--   * The supplier must exist in the SAME tenant schema. The foreign key
--     plus the explicit existence probe both enforce this.
--   * The supplier snapshot is resolved from the supplier ROW inside the
--     same tenant schema, so a caller cannot claim a name that does not
--     belong to the supplier id it sent. It is written only on create and
--     never refreshed on update, so a rename cannot rewrite history.
--   * Illegal status transitions are rejected.
--   * Negative amounts and quantities are rejected.
--   * Item order is preserved by `sort_order`.
--   * An update replaces the item set atomically.
--   * No accounting or inventory row is written anywhere in this function.

CREATE OR REPLACE FUNCTION public.save_purchase_order_with_items_transaction(
    p_entity_id uuid,
    p_purchase_order_payload jsonb,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_mode text DEFAULT 'create'::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema            text;
    v_po_id             uuid;
    v_row               record;
    v_item              jsonb;
    v_count             integer := 0;
    v_previous_status   text;
    v_next_status       text;
    v_supplier_id       uuid;
    v_supplier_name     text;
    v_sort              integer := 0;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- ── Permission gate ──────────────────────────────────────────────
    IF p_mode = 'create' THEN
        IF NOT public.has_entity_permission(
            p_entity_id, auth.uid(), 'purchase_order', 'create'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: purchase_order/create required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        IF NOT public.has_entity_permission(
            p_entity_id, auth.uid(), 'purchase_order', 'edit'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: purchase_order/edit required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- ── Party must be a SUPPLIER in this tenant ───────────────────────
    -- `client_supplier_links` is deliberately never read here. A
    -- dual-role business remains a supplier in the PO context.
    v_supplier_id := NULLIF(p_purchase_order_payload->>'supplier_id', '')::uuid;

    IF v_supplier_id IS NULL THEN
        RAISE EXCEPTION 'A purchase order requires a supplier_id'
            USING ERRCODE = 'not_null_violation';
    END IF;

    IF to_regclass(format('%I.suppliers', v_schema)) IS NULL THEN
        RAISE EXCEPTION 'Schema % has no suppliers table', v_schema;
    END IF;

    EXECUTE format(
        'SELECT name FROM %I.suppliers WHERE id = %L',
        v_schema, v_supplier_id
    ) INTO v_supplier_name;

    IF v_supplier_name IS NULL THEN
        RAISE EXCEPTION 'Supplier % does not exist in this tenant', v_supplier_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- The snapshot is taken from the SUPPLIER ROW, never from the request.
    -- A caller therefore cannot claim a supplier name that does not belong
    -- to the supplier id it sent. The snapshot is written once, on create;
    -- the update path below deliberately never touches the column, so a
    -- later supplier rename cannot rewrite history.

    -- ── Amount / quantity range guard ────────────────────────────────
    -- The database validates range only. It never derives a total: the
    -- prepared totals come from `computeDocument()` on the client.
    IF COALESCE((p_purchase_order_payload->>'subtotal')::numeric, 0) < 0
       OR COALESCE((p_purchase_order_payload->>'discount')::numeric, 0) < 0
       OR COALESCE((p_purchase_order_payload->>'vat')::numeric, 0) < 0
       OR COALESCE((p_purchase_order_payload->>'total')::numeric, 0) < 0 THEN
        RAISE EXCEPTION 'Purchase order amounts must not be negative'
            USING ERRCODE = 'check_violation';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE((v_item->>'quantity')::numeric, 0) < 0 THEN
            RAISE EXCEPTION 'Purchase order item quantity must not be negative'
                USING ERRCODE = 'check_violation';
        END IF;
        IF COALESCE((v_item->>'unit_cost')::numeric, 0) < 0 THEN
            RAISE EXCEPTION 'Purchase order item unit_cost must not be negative'
                USING ERRCODE = 'check_violation';
        END IF;
    END LOOP;

    IF p_mode = 'create' THEN

        v_next_status := COALESCE(NULLIF(p_purchase_order_payload->>'status', ''), 'draft');

        IF v_next_status NOT IN ('draft', 'issued', 'cancelled', 'closed') THEN
            RAISE EXCEPTION 'Unknown purchase order status %', v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        EXECUTE format(
            $q$
            INSERT INTO %I.purchase_orders (
                po_number,
                po_date,
                supplier_id,
                supplier_name,
                status,
                currency,
                subtotal,
                discount,
                vat,
                extra_charges,
                total,
                calculation_inputs,
                notes,
                terms
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14
            )
            RETURNING id
            $q$,
            v_schema
        )
        INTO v_po_id
        USING
            p_purchase_order_payload->>'po_number',
            NULLIF(p_purchase_order_payload->>'po_date', '')::date,
            v_supplier_id,
            v_supplier_name,
            v_next_status,
            COALESCE(NULLIF(p_purchase_order_payload->>'currency', ''), 'NGN'),
            COALESCE((p_purchase_order_payload->>'subtotal')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'discount')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'vat')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'extra_charges')::jsonb, '[]'::jsonb),
            COALESCE((p_purchase_order_payload->>'total')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'calculation_inputs')::jsonb, '{}'::jsonb),
            p_purchase_order_payload->>'notes',
            p_purchase_order_payload->>'terms';

    ELSE

        v_po_id := NULLIF(p_purchase_order_payload->>'id', '')::uuid;

        IF v_po_id IS NULL THEN
            RAISE EXCEPTION 'An update requires a purchase order id'
                USING ERRCODE = 'not_null_violation';
        END IF;

        EXECUTE format(
            'SELECT status FROM %I.purchase_orders WHERE id = %L',
            v_schema, v_po_id
        ) INTO v_previous_status;

        IF v_previous_status IS NULL THEN
            RAISE EXCEPTION 'Purchase order % does not exist in this tenant', v_po_id;
        END IF;

        v_next_status := COALESCE(
            NULLIF(p_purchase_order_payload->>'status', ''),
            v_previous_status
        );

        -- Terminal states stay terminal. A cancelled PO cannot be silently
        -- reactivated and a closed PO cannot be edited back into an active
        -- draft.
        IF v_previous_status IN ('cancelled', 'closed') AND v_next_status <> v_previous_status THEN
            RAISE EXCEPTION
                'A % purchase order is terminal and cannot transition to %',
                v_previous_status, v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        -- draft -> draft | issued | cancelled
        -- issued -> issued | cancelled | closed
        IF v_previous_status = 'draft'
           AND v_next_status NOT IN ('draft', 'issued', 'cancelled') THEN
            RAISE EXCEPTION
                'Illegal purchase order transition: % -> %',
                v_previous_status, v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_previous_status = 'issued'
           AND v_next_status NOT IN ('issued', 'cancelled', 'closed') THEN
            RAISE EXCEPTION
                'Illegal purchase order transition: % -> %',
                v_previous_status, v_next_status
                USING ERRCODE = 'check_violation';
        END IF;

        -- Identity is immutable on update. `po_number` and `supplier_id` are
        -- deliberately absent from this SET list: a PO keeps the number it
        -- was allocated and is always issued to the supplier it was created
        -- for. `supplier_name` is absent too, so the frozen snapshot taken at
        -- create time survives every later supplier rename.
        EXECUTE format(
            $q$
            UPDATE %I.purchase_orders
            SET
                po_date = $2,
                status = $3,
                currency = $4,
                subtotal = $5,
                discount = $6,
                vat = $7,
                extra_charges = $8,
                total = $9,
                calculation_inputs = $10,
                notes = $11,
                terms = $12
            WHERE id = $1
            $q$,
            v_schema
        )
        USING
            v_po_id,
            NULLIF(p_purchase_order_payload->>'po_date', '')::date,
            v_next_status,
            COALESCE(NULLIF(p_purchase_order_payload->>'currency', ''), 'NGN'),
            COALESCE((p_purchase_order_payload->>'subtotal')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'discount')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'vat')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'extra_charges')::jsonb, '[]'::jsonb),
            COALESCE((p_purchase_order_payload->>'total')::numeric, 0),
            COALESCE((p_purchase_order_payload->>'calculation_inputs')::jsonb, '{}'::jsonb),
            p_purchase_order_payload->>'notes',
            p_purchase_order_payload->>'terms';

        -- Replace the item set. Same transaction as the header update.
        EXECUTE format(
            'DELETE FROM %I.purchase_order_items WHERE purchase_order_id = %L',
            v_schema,
            v_po_id
        );

    END IF;

    -- ── Items ────────────────────────────────────────────────────────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        EXECUTE format(
            $q$
            INSERT INTO %I.purchase_order_items (
                purchase_order_id,
                description,
                quantity,
                unit,
                unit_cost,
                line_total,
                sort_order
            )
            VALUES (%L, $1, $2, $3, $4, $5, $6)
            $q$,
            v_schema,
            v_po_id
        )
        USING
            COALESCE(NULLIF(v_item->>'description', ''), 'Item'),
            COALESCE((v_item->>'quantity')::numeric, 0),
            v_item->>'unit',
            COALESCE((v_item->>'unit_cost')::numeric, 0),
            COALESCE((v_item->>'line_total')::numeric, 0),
            COALESCE((v_item->>'sort_order')::integer, v_sort);

        v_sort := v_sort + 1;
        v_count := v_count + 1;
    END LOOP;

    -- ── Return the saved document ────────────────────────────────────
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.purchase_orders t WHERE t.id = %L',
        v_schema,
        v_po_id
    )
    INTO v_row;

    RETURN jsonb_build_object(
        'id', v_po_id,
        'purchase_order', v_row,
        'items_saved', v_count
    );

END;
$function$;

-- ============================================================
-- 5. PREFIX ENGINE — add the `purchase_order` key
-- ============================================================
-- The existing eight keys are reproduced exactly. `letter` is absent from
-- the live constraint and stays absent: this migration does not repair
-- unrelated prefix drift.
--
-- The constraint lives on `settings` in the template and in every entity
-- schema, so each one is dropped and re-added, then backfilled.

DO $do$
DECLARE
    v_schema    record;
    v_exists    boolean;
BEGIN
    FOR v_schema IN
        SELECT nspname FROM pg_namespace
        WHERE (nspname = 'tenant_master_template' OR nspname LIKE 'entity\_%')
        ORDER BY nspname
    LOOP
        -- Does this schema even have a settings table with the constraint?
        SELECT EXISTS (
            SELECT 1 FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = v_schema.nspname
              AND c.relname = 'settings'
              AND con.conname = 'check_document_prefixes_format'
        ) INTO v_exists;

        IF NOT v_exists THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.settings DROP CONSTRAINT check_document_prefixes_format',
            v_schema.nspname
        );

        EXECUTE format($fmt$
          ALTER TABLE %I.settings ADD CONSTRAINT check_document_prefixes_format CHECK (
            document_prefixes IS NULL OR (
              jsonb_typeof(document_prefixes) = 'object'
              AND (document_prefixes ->> 'waybill') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'invoice') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'cps_sheets') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'rfq') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'quotation') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'project') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'csr') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'receipt') ~ '^[A-Z0-9]{2,6}$'
              AND (document_prefixes ->> 'purchase_order') ~ '^[A-Z0-9]{2,6}$'
            )
          )
        $fmt$, v_schema.nspname);

        -- Backfill the key only where it is missing. An existing value is
        -- never overwritten.
        EXECUTE format($fmt$
          UPDATE %I.settings
          SET document_prefixes = document_prefixes || jsonb_build_object('purchase_order', 'PO')
          WHERE document_prefixes IS NOT NULL
            AND document_prefixes ->> 'purchase_order' IS NULL
        $fmt$, v_schema.nspname);
    END LOOP;
END;
$do$;

-- ============================================================
-- 6. EXISTING-TENANT CONVERGENCE
-- ============================================================
-- Eligible schema: let any error propagate and fail the migration.
-- Structurally incomplete schema (no `suppliers`): skip by name with a
-- reason, following the documented incomplete-tenant skip policy.

DO $do$
DECLARE
    v_schema        text;
    v_entity_id     uuid;
    v_workspace_id  uuid;
    v_has_rls       boolean;
    v_owner         record;
    v_template      text := 'tenant_master_template';
    v_tables        text[] := ARRAY['purchase_orders', 'purchase_order_items'];
    v_table         text;
    v_installed     text[] := ARRAY[]::text[];
    v_skipped       text[] := ARRAY[]::text[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_template) THEN
        RAISE WARNING
            'purchase order domain skipped: tenant_master_template schema is missing';
        RETURN;
    END IF;

    -- The template itself must already carry the supplier authority.
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = v_template AND tablename = 'suppliers'
    ) THEN
        RAISE EXCEPTION
            'purchase order domain requires %.suppliers — run the supplier domain migration first',
            v_template;
    END IF;

    -- Install triggers on the template so it carries the same shape as
    -- every tenant schema.
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
        -- A schema without `suppliers` cannot carry a purchase order. Skip
        -- it by name instead of failing the migration.
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = v_schema AND tablename = 'suppliers'
        ) THEN
            RAISE WARNING
                'purchase order domain skipped: schema % is missing table(s) suppliers',
                v_schema;
            v_skipped := array_append(v_skipped, v_schema);
            CONTINUE;
        END IF;

        SELECT e.id, e.workspace_id INTO v_entity_id, v_workspace_id
        FROM public.entities e
        JOIN public.workspaces w ON w.id = e.workspace_id
        WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
        LIMIT 1;

        IF v_entity_id IS NULL THEN
            RAISE WARNING
                'purchase order domain skipped: schema % does not resolve to an entity row',
                v_schema;
            v_skipped := array_append(v_skipped, v_schema);
            CONTINUE;
        END IF;

        -- 6a. Clone any missing table, then install RLS, grants, triggers.
        -- The header is created before the item table so the item table's
        -- foreign key can be restored afterwards.
        FOR v_table IN SELECT unnest(v_tables)
        LOOP
            IF to_regclass(v_schema || '.' || v_table) IS NULL THEN
                PERFORM public._prov_clone_table(v_template, v_schema, v_table);
                RAISE NOTICE 'purchase order domain cloned %.%', v_schema, v_table;
            END IF;

            SELECT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = v_schema
                  AND tablename = v_table
                  AND policyname = v_table || '_select'
            ) INTO v_has_rls;

            IF NOT v_has_rls THEN
                PERFORM public._prov_install_rls(
                    v_schema, v_table, v_entity_id, 'purchase_order'
                );
                RAISE NOTICE 'purchase order domain installed RLS %.%', v_schema, v_table;
            END IF;

            PERFORM public._prov_install_canonical_triggers(v_schema, v_table);

            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO anon, authenticated, service_role',
                v_schema, v_table
            );
        END LOOP;

        -- 6b. Restore the intra-schema foreign keys. `_prov_clone_table`
        -- drops them, so a freshly cloned table has no referential
        -- integrity until they are restored here.
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'purchase_orders_supplier_id_fkey'
              AND conrelid = format('%I.purchase_orders', v_schema)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey '
                'FOREIGN KEY (supplier_id) REFERENCES %I.suppliers(id)',
                v_schema, v_schema
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'purchase_order_items_purchase_order_id_fkey'
              AND conrelid = format('%I.purchase_order_items', v_schema)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I.purchase_order_items ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey '
                'FOREIGN KEY (purchase_order_id) REFERENCES %I.purchase_orders(id)',
                v_schema, v_schema
            );
        END IF;

        -- 6c. Seed the PO permission for every workspace owner. The
        -- seeder is idempotent.
        FOR v_owner IN
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id = v_workspace_id AND role = 'owner'
        LOOP
            PERFORM public._prov_seed_default_permissions(v_entity_id, v_owner.user_id);
        END LOOP;

        v_installed := array_append(v_installed, v_schema);
    END LOOP;

    RAISE NOTICE 'purchase order domain installed in % schema(s): %',
        coalesce(array_length(v_installed, 1), 0), array_to_string(v_installed, ', ');

    IF array_length(v_skipped, 1) IS NOT NULL THEN
        RAISE NOTICE 'purchase order domain skipped in % structurally incomplete schema(s): %',
            array_length(v_skipped, 1), array_to_string(v_skipped, ', ');
    END IF;
END;
$do$;

-- ============================================================
-- FINAL — Reload the PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
