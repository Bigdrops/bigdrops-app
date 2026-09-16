-- ============================================================
-- TENANT MASTER TEMPLATE — CANONICAL DDL SEED
-- ============================================================
-- Seeds the tenant_master_template schema with the canonical
-- table definitions for all 37 template tables. Each table is
-- created with CREATE TABLE IF NOT EXISTS so this migration is
-- idempotent.
--
-- Source: Extracted from the original migration files that first
-- defined each table, then consolidated here.
--
-- This file:
--   - Creates the tenant_master_template schema if needed
--   - Defines all 37 tables with columns, types, constraints, DEFAULTs
--   - Includes PRIMARY KEY constraints inline
--   - Includes UNIQUE and CHECK constraints inline
--   - Includes FOREIGN KEY constraints inline
--   - Includes CREATE INDEX statements
--
-- This file does NOT include:
--   - RLS policies (installed per-entity during provisioning)
--   - GRANT statements (granted per-entity during provisioning)
--   - Function definitions
--   - Data inserts
--   - ENABLE ROW LEVEL SECURITY
-- ============================================================

CREATE SCHEMA IF NOT EXISTS tenant_master_template;

-- ============================================================
-- 1. clients
-- Source: 20260520090000_core_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.clients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text NOT NULL,
    phone text,
    email text,
    category text,
    notes text,
    city text,
    state text,
    contact_person text,
    archived_at timestamp with time zone,
    CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 2. settings
-- Source: 20260520090000_core_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.settings (
    id integer NOT NULL DEFAULT 1,
    company_name text,
    company_tagline text,
    company_address text,
    company_city text,
    company_phone text,
    company_email text,
    company_website text,
    bank_name text,
    bank_account_name text,
    bank_account_number text,
    bank_sort_code text,
    footer_text text,
    company_logo_url text,
    signature_url text,
    custom_info text DEFAULT '[]'::text,
    app_background_color text,
    app_card_color text,
    app_theme_preset_id text,
    app_theme_tokens jsonb,
    document_prefixes jsonb DEFAULT '{"waybill":"WB","invoice":"INV","boq":"BOQ","rfq":"RFQ","quotation":"QUO","project":"PRJ","csr":"CSR","receipt":"RCP"}'::jsonb,
    CONSTRAINT settings_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 3. signatories
-- Source: 20260520090000_core_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.signatories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    role text,
    signature_url text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT signatories_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 4. bank_accounts
-- Source: 20260520090000_core_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.bank_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bank_name text,
    account_name text,
    account_number text,
    sort_code text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bank_accounts_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 5. projects
-- Source: 20260520090001_projects.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    client_id uuid,
    client_name character varying,
    status character varying DEFAULT 'active'::character varying,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    project_value numeric,
    po_number character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    location character varying,
    archived_at timestamp with time zone,
    project_code text NOT NULL,
    created_by uuid,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    scope_type text DEFAULT 'app'::text,
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 6. project_documents
-- Source: 20260520090001_projects.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.project_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid,
    type text NOT NULL DEFAULT 'other'::text,
    title text,
    reference_number text,
    date date,
    from_party text,
    to_party text,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    raw_input text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    vat numeric DEFAULT 0,
    wht numeric DEFAULT 0,
    total numeric DEFAULT 0,
    voucher_number text,
    CONSTRAINT project_documents_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 7. quotations
-- Source: 20260520090002_quotations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.quotations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quotation_number text NOT NULL,
    quotation_title text,
    client_id uuid,
    client_name text,
    project_id uuid,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    valid_until date,
    status text NOT NULL DEFAULT 'open'::text,
    notes text,
    terms text,
    workmanship numeric NOT NULL DEFAULT 0,
    transportation numeric NOT NULL DEFAULT 0,
    shipping numeric NOT NULL DEFAULT 0,
    discount numeric NOT NULL DEFAULT 0,
    vat numeric NOT NULL DEFAULT 0,
    wht numeric NOT NULL DEFAULT 0,
    subtotal numeric NOT NULL DEFAULT 0,
    install_rate_total numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    amount_in_words text,
    custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
    archived_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    po_number text,
    created_by uuid,
    updated_by uuid,
    scope_type text DEFAULT 'app'::text,
    CONSTRAINT quotations_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 8. quotation_items
-- Source: 20260520090002_quotations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.quotation_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quotation_id uuid NOT NULL,
    description text,
    sub_description text,
    make text,
    quantity numeric NOT NULL DEFAULT 1,
    unit text,
    unit_price numeric NOT NULL DEFAULT 0,
    amount numeric NOT NULL DEFAULT 0,
    install_rate numeric,
    vat_rate numeric,
    discount_rate numeric,
    row_type text NOT NULL DEFAULT 'standard'::text,
    group_id text,
    group_name text,
    sort_order integer NOT NULL DEFAULT 0,
    image_url text,
    custom_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    formula text,
    install_rate_override boolean DEFAULT false,
    install_rate_taxable boolean,
    show_install_rate boolean,
    item_id uuid,
    CONSTRAINT quotation_items_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 9. invoices
-- Source: 20260520090003_invoices.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.invoices (
    invoice_number text NOT NULL,
    client_id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_name text,
    issue_date date,
    due_date text,
    status text DEFAULT 'unpaid'::text,
    subtotal numeric,
    vat numeric,
    wht numeric,
    discount numeric,
    workmanship numeric,
    transportation numeric,
    shipping numeric,
    install_rate_total numeric,
    total numeric,
    notes text,
    terms text,
    payment_terms text,
    document_type text,
    custom_fields text,
    linked_quote_id uuid DEFAULT gen_random_uuid(),
    linked_csr_id uuid DEFAULT gen_random_uuid(),
    work_duration text,
    amount_in_words text,
    created_at timestamp with time zone DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_title text,
    attachments jsonb DEFAULT '[]'::jsonb,
    archived_at timestamp with time zone,
    project_id uuid,
    po_number text,
    created_by uuid,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    scope_type text DEFAULT 'app'::text,
    CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 10. invoice_items
-- Source: 20260520090003_invoices.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.invoice_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    description text NOT NULL,
    sub_description text,
    make text,
    quantity numeric,
    unit text,
    unit_price numeric,
    amount numeric,
    vat_rate numeric,
    install_rate numeric,
    install_rate_taxable boolean,
    show_install_rate boolean,
    sort_order integer,
    formula text,
    row_type text,
    group_name text,
    invoice_id uuid DEFAULT gen_random_uuid(),
    image_url text,
    custom_data jsonb DEFAULT '{}'::jsonb,
    discount_rate numeric DEFAULT 0,
    install_rate_override boolean DEFAULT false,
    group_id text,
    updated_at timestamp with time zone DEFAULT now(),
    item_id uuid,
    CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 11. payments
-- Source: 20260520090003_invoices.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid,
    amount numeric NOT NULL,
    date date NOT NULL,
    method text,
    reference text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    cash_amount numeric NOT NULL DEFAULT 0,
    wht_amount numeric NOT NULL DEFAULT 0,
    currency_code text NOT NULL DEFAULT 'NGN'::text,
    wht_rate numeric,
    wht_type text,
    wht_certificate_ref text,
    recorded_by uuid,
    voided_at timestamp with time zone,
    void_reason text,
    source text DEFAULT 'live'::text,
    bank_account_id uuid,
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 12. wht_receipts
-- Source: 20260520090003_invoices.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.wht_receipts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    invoice_id uuid,
    client_name text,
    gross_base_amount numeric,
    wht_rate numeric,
    wht_amount numeric,
    receipt_status text NOT NULL DEFAULT 'pending'::text,
    receipt_number text,
    receipt_file_url text,
    received_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wht_receipts_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 13. csrs
-- Source: 20260520090004_csrs.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.csrs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    csr_number text NOT NULL,
    date date,
    client_id uuid DEFAULT gen_random_uuid(),
    client_name text,
    address text,
    problem_reported text,
    equipment_type text,
    equipment_location text,
    make text,
    model text,
    serial_no text,
    capacity text,
    voltage text,
    frequency text,
    battery text,
    temperature text,
    pressure text,
    hours text,
    materials_used text,
    service_rendered text,
    engineer_remarks text,
    status text,
    start_date date,
    end_date date,
    customer_feedback text,
    acknowledgement_name text,
    linked_invoice_id uuid DEFAULT gen_random_uuid(),
    created_at timestamp with time zone,
    start_time text,
    end_time text,
    po_number text,
    show_po boolean DEFAULT false,
    archived_at timestamp with time zone,
    project_id uuid,
    defects_found text,
    system_down boolean DEFAULT false,
    technician_signatory_id uuid,
    call_type text,
    service_basis text,
    CONSTRAINT csrs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 14. blank_csr_logs
-- Source: 20260611000002_blank_csr_logs.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.blank_csr_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_csr_number text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_csr_id uuid,
    reconciled_at timestamp with time zone,
    CONSTRAINT blank_csr_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_csr_logs_number_key UNIQUE (assigned_csr_number),
    CONSTRAINT blank_csr_logs_linked_csr_id_fkey FOREIGN KEY (linked_csr_id)
        REFERENCES tenant_master_template.csrs(id) ON DELETE SET NULL,
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_csr_id IS NULL AND reconciled_at IS NULL) OR
        (linked_csr_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);

-- ============================================================
-- 15. waybills (final state after 20260611000000_waybill_schema_final.sql)
-- Source: 20260520090004_csrs.sql + 20260611000000_waybill_schema_final.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.waybills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    waybill_number text NOT NULL,
    type text NOT NULL,
    date date NOT NULL,
    time time without time zone,
    sender_name text NOT NULL,
    receiver_name text NOT NULL,
    receiver_signature_url text,
    receiver_description text,
    client_id uuid,
    client_name text,
    project_id uuid,
    invoice_id uuid,
    po_number text,
    vehicle_plate text,
    delivery_location text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    notes text,
    status text DEFAULT 'dispatched'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    archived_at timestamp with time zone,
    purpose text,
    transport_mode text,
    driver_name text,
    custom_fields jsonb,
    CONSTRAINT waybills_pkey PRIMARY KEY (id),
    CONSTRAINT waybills_waybill_number_key UNIQUE (waybill_number),
    CONSTRAINT check_waybill_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_waybill_status CHECK (status IN ('dispatched', 'pending_confirmation', 'delivered', 'returned')),
    CONSTRAINT check_waybill_transport_mode CHECK (
        transport_mode IS NULL OR transport_mode IN ('By Vehicle', 'By Hand', 'Courier', 'Self Pick-Up')
    ),
    CONSTRAINT check_waybill_purpose_conditional CHECK (
        (type = 'external' AND purpose IN ('Supply', 'Return', 'Third-Party Custody')) OR
        (type = 'internal' AND purpose IS NULL)
    )
);

-- ============================================================
-- 16. blank_waybill_logs
-- Source: 20260611000000_waybill_schema_final.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.blank_waybill_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_waybill_number text NOT NULL,
    type text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_waybill_id uuid,
    reconciled_at timestamp with time zone,
    CONSTRAINT blank_waybill_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_waybill_logs_number_key UNIQUE (assigned_waybill_number),
    CONSTRAINT blank_waybill_logs_linked_waybill_id_fkey FOREIGN KEY (linked_waybill_id)
        REFERENCES tenant_master_template.waybills(id) ON DELETE SET NULL,
    CONSTRAINT check_blank_log_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_waybill_id IS NULL AND reconciled_at IS NULL) OR
        (linked_waybill_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);

-- ============================================================
-- 17. tax_settings
-- Source: 20260520090009_tax.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    settings_id integer NOT NULL,
    tin text,
    vat_enabled boolean NOT NULL DEFAULT false,
    vat_threshold numeric NOT NULL DEFAULT 0,
    threshold_basis text,
    cit_category text,
    year_end_month integer,
    year_end_day integer,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tax_settings_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 18. tax_filings
-- Source: 20260520090009_tax.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_filings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    settings_id integer NOT NULL,
    tax_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    amount_due numeric NOT NULL DEFAULT 0,
    amount_paid numeric NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft'::text,
    submitted_at date,
    receipt_reference text,
    portal_reference text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tax_filings_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 19. tax_input_entries
-- Source: 20260520090009_tax.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_input_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    settings_id integer NOT NULL,
    date date NOT NULL,
    vendor_name text,
    category text,
    reference text,
    net_amount numeric NOT NULL DEFAULT 0,
    vat_amount numeric NOT NULL DEFAULT 0,
    is_recoverable boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tax_input_entries_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 20. tax_reminders
-- Source: 20260520090009_tax.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_reminders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    settings_id integer NOT NULL,
    tax_type text NOT NULL,
    period_start date,
    period_end date,
    due_date date NOT NULL,
    status text NOT NULL DEFAULT 'upcoming'::text,
    linked_filing_id uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tax_reminders_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 21. receipts
-- Source: 20260706000000_create_receipts.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.receipts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    receipt_number text NOT NULL,
    payment_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    client_id uuid NOT NULL,
    client_name text NOT NULL,
    amount numeric NOT NULL,
    currency_code text NOT NULL DEFAULT 'NGN',
    payment_date date NOT NULL,
    payment_method text,
    payment_ref text,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    archived_at timestamp with time zone,
    CONSTRAINT receipts_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 22. letters
-- Source: 20260710000000_create_letters.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.letters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    letter_number text NOT NULL,
    recipient_id uuid,
    recipient_name text NOT NULL,
    recipient_address text,
    subject text NOT NULL,
    body jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','approved','issued','archived','cancelled')),
    custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
    attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT letters_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 23. boqs
-- Source: 20260520090002_quotations.sql + 20260826000000 alignment
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.boqs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    title text,
    client_name text,
    project_name text,
    template_id text DEFAULT 'bordered_schedule'::text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    archived_at timestamp with time zone,
    boq_number text,
    status text DEFAULT 'open',
    project_id uuid,
    total numeric,
    issue_date date,
    vendor_name text,
    vendor_contact text,
    show_brand_name boolean DEFAULT false,
    brand_name_override text,
    background_primary text,
    background_secondary text,
    palette_name text,
    text_color text,
    accent_color text,
    notes text,
    CONSTRAINT boqs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 24. boq_rows
-- Source: 20260520090002_quotations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.boq_rows (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    boq_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    row_type text NOT NULL,
    description text,
    unit text,
    quantity numeric,
    section_title text,
    cells jsonb DEFAULT '{}'::jsonb,
    notes text,
    CONSTRAINT boq_rows_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 25. rfqs
-- Source: 20260520090002_quotations.sql + 20260826000000 alignment
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.rfqs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rfq_number text NOT NULL,
    title text,
    vendor_name text,
    vendor_contact text,
    issue_date date,
    expiry_date date,
    show_brand_name boolean DEFAULT false,
    brand_name_override text,
    background_mode text DEFAULT 'palette'::text,
    background_primary text,
    background_secondary text,
    palette_name text,
    text_color text,
    accent_color text,
    export_order_seed integer,
    notes text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    archived_at timestamp with time zone,
    client_name text,
    status text DEFAULT 'open',
    project_id uuid,
    CONSTRAINT rfqs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 26. rfq_items
-- Source: 20260520090002_quotations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.rfq_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rfq_id uuid,
    sort_order integer DEFAULT 0,
    description text,
    quantity numeric DEFAULT 0,
    unit text,
    specification text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT rfq_items_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 27. item_catalog
-- Source: 20260520090005_items_catalog.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.item_catalog (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    normalized_name text NOT NULL,
    standard_price numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_catalog_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 28. item_import_batches
-- Source: 20260520090005_items_catalog.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.item_import_batches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    import_name text,
    source_type text,
    status text NOT NULL DEFAULT 'pending'::text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_import_batches_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 29. item_aliases
-- Source: 20260520090005_items_catalog.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.item_aliases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    alias_text text NOT NULL,
    normalized_alias_text text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    is_retired boolean NOT NULL DEFAULT false,
    source text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_aliases_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 30. item_merge_log
-- Source: 20260520090005_items_catalog.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.item_merge_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    batch_id uuid,
    from_item_id uuid,
    to_item_id uuid,
    action text NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_merge_log_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 31. audit_logs
-- Source: 20260520090008_audit_activity.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_label text,
    action text NOT NULL,
    actor_id uuid,
    actor_label text,
    source text NOT NULL DEFAULT 'web'::text,
    scope_type text NOT NULL DEFAULT 'app'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    changes jsonb NOT NULL DEFAULT '[]'::jsonb,
    reason text,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 32. activity_events
-- Source: 20260520090008_audit_activity.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.activity_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_label text,
    event_type text NOT NULL,
    actor_id uuid,
    actor_label text,
    source text NOT NULL DEFAULT 'web'::text,
    scope_type text NOT NULL DEFAULT 'app'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    reason text,
    CONSTRAINT activity_events_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 33. expenses
-- Source: 20260914100000_expense_money_out.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    period_code text NOT NULL,
    transaction_date date NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    category text NOT NULL CHECK (category IN ('operational', 'capital', 'personal', 'non_deductible')),
    description text NOT NULL CHECK (btrim(description) <> ''),
    vendor_name text,
    receipt_url text,
    account_code text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
    source_transaction_id uuid,
    journal_entry_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 34. source_transactions
-- Source: 20260906103000_source_transactions.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.source_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    source_type text NOT NULL CHECK (btrim(source_type) <> ''),
    source_id text NOT NULL CHECK (btrim(source_id) <> ''),
    transaction_date date NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency_code text NOT NULL DEFAULT 'NGN' CHECK (btrim(currency_code) <> ''),
    counterparty_type text,
    counterparty_name text,
    source_document_ref text,
    evidence_refs jsonb DEFAULT '[]'::jsonb,
    lifecycle_status text NOT NULL DEFAULT 'captured'
        CHECK (lifecycle_status IN ('captured', 'confirmed', 'posted', 'rejected')),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    rejection_reason text,
    memo text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT source_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT source_transactions_idempotency_key_key UNIQUE (idempotency_key)
);

-- ============================================================
-- 34a. accounting_accounts
-- Source: 20260905142503_accounting_persistence.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.accounting_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    parent_code text NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT accounting_accounts_code_key UNIQUE (code)
);

-- ============================================================
-- 34b. accounting_periods
-- Source: 20260905142503_accounting_persistence.sql
-- ============================================================

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

-- ============================================================
-- 34c. journal_entries
-- Source: 20260905142503_accounting_persistence.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id uuid NOT NULL,
    transaction_date date NOT NULL,
    posting_date date NOT NULL,
    source_type text NOT NULL CHECK (btrim(source_type) <> ''),
    source_id text NOT NULL CHECK (btrim(source_id) <> ''),
    idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
    reversal_of_entry_id uuid NULL,
    memo text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT journal_entries_idempotency_key_key UNIQUE (idempotency_key)
);

-- ============================================================
-- 34d. journal_lines
-- Source: 20260905142503_accounting_persistence.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    side text NOT NULL CHECK (side IN ('debit', 'credit')),
    amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
    line_no integer NOT NULL CHECK (line_no >= 1),
    memo text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_lines_entry_line_key UNIQUE (entry_id, line_no)
);

-- ============================================================
-- 35. tax_adjustments
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_adjustments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    source_transaction_id uuid,
    journal_line_id uuid,
    adjustment_type text NOT NULL
        CHECK (adjustment_type IN ('permanent', 'temporary', 'taxable_income', 'deductible_expense')),
    category text NOT NULL
        CHECK (category IN ('income', 'expense', 'capital_allowance', 'loss', 'exemption', 'non_deductible')),
    description text NOT NULL CHECK (btrim(description) <> ''),
    accounting_amount NUMERIC(18,2) NOT NULL,
    tax_amount NUMERIC(18,2) NOT NULL,
    rule_snapshot jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT tax_adjustments_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 36. tax_qce
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_qce (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    source_transaction_id uuid,
    journal_line_id uuid,
    qce_type text NOT NULL
        CHECK (qce_type IN ('qualifying', 'non_qualifying', 'restricted')),
    category text NOT NULL
        CHECK (category IN ('rent', 'repair', 'depreciation', 'fuel', 'maintenance', 'other')),
    description text NOT NULL CHECK (btrim(description) <> ''),
    amount NUMERIC(18,2) NOT NULL,
    rule_snapshot jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT tax_qce_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 37. tax_loss_balances
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_loss_balances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_arising NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_used NUMERIC(18,2) NOT NULL DEFAULT 0,
    loss_expired NUMERIC(18,2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT tax_loss_balances_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 38. entity_tax_config
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.entity_tax_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_type text NOT NULL DEFAULT 'small_company'
        CHECK (company_type IN ('small_company', 'medium_company', 'large_company')),
    is_vat_registered boolean NOT NULL DEFAULT false,
    remittance_schedule text NOT NULL DEFAULT 'monthly'
        CHECK (remittance_schedule IN ('monthly', 'quarterly', 'annually')),
    sector text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT entity_tax_config_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 39. tax_computation_inputs
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_computation_inputs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    accounting_period_id uuid NOT NULL
        REFERENCES tenant_master_template.accounting_periods(id) ON DELETE RESTRICT,
    input_snapshot jsonb NOT NULL,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'finalized')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT tax_computation_inputs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 40. tax_computation_results
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_computation_results (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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
    finalized_at timestamp with time zone,
    finalized_by uuid,
    superseded_by uuid
        REFERENCES tenant_master_template.tax_computation_results(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT tax_computation_results_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 41. tax_rule_versions
-- Source: 20260912100000_tax_architecture_phase2a.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_master_template.tax_rule_versions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rule_type text NOT NULL
        CHECK (rule_type IN ('cit_rules', 'qce_rules', 'loss_rules', 'capital_allowance', 'exemption')),
    rule_version text NOT NULL CHECK (btrim(rule_version) <> ''),
    effective_date date NOT NULL,
    expiry_date date,
    rule_snapshot jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    CONSTRAINT tax_rule_versions_pkey PRIMARY KEY (id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_name ON tenant_master_template.clients USING btree (name);
CREATE INDEX IF NOT EXISTS idx_clients_archived_at ON tenant_master_template.clients USING btree (archived_at);

-- projects
CREATE UNIQUE INDEX IF NOT EXISTS projects_project_code_key ON tenant_master_template.projects USING btree (project_code);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON tenant_master_template.projects USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON tenant_master_template.projects USING btree (archived_at);
CREATE INDEX IF NOT EXISTS projects_po_number_idx ON tenant_master_template.projects USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_projects_status ON tenant_master_template.projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated_at ON tenant_master_template.projects USING btree (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON tenant_master_template.projects USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_projects_updated_by ON tenant_master_template.projects USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON tenant_master_template.projects USING btree (updated_at DESC);

-- project_documents
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON tenant_master_template.project_documents USING btree (project_id);

-- quotations
CREATE UNIQUE INDEX IF NOT EXISTS quotations_quotation_number_key ON tenant_master_template.quotations USING btree (quotation_number);
CREATE INDEX IF NOT EXISTS quotations_client_id_idx ON tenant_master_template.quotations USING btree (client_id);
CREATE INDEX IF NOT EXISTS quotations_project_id_idx ON tenant_master_template.quotations USING btree (project_id);
CREATE INDEX IF NOT EXISTS quotations_status_idx ON tenant_master_template.quotations USING btree (status);
CREATE INDEX IF NOT EXISTS quotations_issue_date_idx ON tenant_master_template.quotations USING btree (issue_date DESC);
CREATE INDEX IF NOT EXISTS quotations_archived_at_idx ON tenant_master_template.quotations USING btree (archived_at);
CREATE INDEX IF NOT EXISTS quotations_po_number_idx ON tenant_master_template.quotations USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON tenant_master_template.quotations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON tenant_master_template.quotations USING btree (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_quotation_number_unique ON tenant_master_template.quotations USING btree (quotation_number) WHERE (quotation_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON tenant_master_template.quotations USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_updated_by ON tenant_master_template.quotations USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_quotations_status_updated_at ON tenant_master_template.quotations USING btree (status, updated_at DESC);

-- quotation_items
CREATE INDEX IF NOT EXISTS quotation_items_quotation_id_idx ON tenant_master_template.quotation_items USING btree (quotation_id);
CREATE INDEX IF NOT EXISTS quotation_items_sort_order_idx ON tenant_master_template.quotation_items USING btree (quotation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_id ON tenant_master_template.quotation_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_description ON tenant_master_template.quotation_items USING btree (description);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_status_created_at ON tenant_master_template.invoices USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON tenant_master_template.invoices USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_archived_at ON tenant_master_template.invoices USING btree (archived_at);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON tenant_master_template.invoices USING btree (project_id);
CREATE INDEX IF NOT EXISTS invoices_po_number_idx ON tenant_master_template.invoices USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON tenant_master_template.invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON tenant_master_template.invoices USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON tenant_master_template.invoices USING btree (document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON tenant_master_template.invoices USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_by ON tenant_master_template.invoices USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON tenant_master_template.invoices USING btree (updated_at DESC);

-- invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON tenant_master_template.invoice_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_description ON tenant_master_template.invoice_items USING btree (description);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON tenant_master_template.invoice_items USING btree (invoice_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON tenant_master_template.payments USING btree (invoice_id);

-- wht_receipts
CREATE UNIQUE INDEX IF NOT EXISTS wht_receipts_payment_id_key ON tenant_master_template.wht_receipts USING btree (payment_id);

-- csrs
CREATE INDEX IF NOT EXISTS idx_csrs_archived_active ON tenant_master_template.csrs USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_csrs_created_at ON tenant_master_template.csrs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csrs_client_id ON tenant_master_template.csrs USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_csrs_archived_at ON tenant_master_template.csrs USING btree (archived_at);
CREATE INDEX IF NOT EXISTS idx_csrs_project_id ON tenant_master_template.csrs USING btree (project_id);
CREATE INDEX IF NOT EXISTS csrs_po_number_idx ON tenant_master_template.csrs USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_csrs_status ON tenant_master_template.csrs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_csrs_technician_signatory_id ON tenant_master_template.csrs USING btree (technician_signatory_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_csrs_csr_number_unique ON tenant_master_template.csrs USING btree (csr_number) WHERE (csr_number IS NOT NULL);

-- blank_csr_logs
CREATE INDEX IF NOT EXISTS idx_blank_csr_logs_linked_id ON tenant_master_template.blank_csr_logs(linked_csr_id);

-- waybills
CREATE INDEX IF NOT EXISTS idx_waybills_number ON tenant_master_template.waybills(waybill_number);
CREATE INDEX IF NOT EXISTS idx_waybills_type ON tenant_master_template.waybills(type);
CREATE INDEX IF NOT EXISTS idx_waybills_status ON tenant_master_template.waybills(status);
CREATE INDEX IF NOT EXISTS idx_waybills_archived_active ON tenant_master_template.waybills USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_waybills_archived_at ON tenant_master_template.waybills USING btree (archived_at) WHERE (archived_at IS NOT NULL);

-- blank_waybill_logs
CREATE INDEX IF NOT EXISTS idx_blank_waybills_number ON tenant_master_template.blank_waybill_logs(assigned_waybill_number);
CREATE INDEX IF NOT EXISTS idx_blank_waybill_logs_linked_id ON tenant_master_template.blank_waybill_logs(linked_waybill_id);

-- tax_settings
CREATE UNIQUE INDEX IF NOT EXISTS tax_settings_settings_id_key ON tenant_master_template.tax_settings USING btree (settings_id);

-- tax_reminders
CREATE INDEX IF NOT EXISTS idx_tax_reminders_due_date ON tenant_master_template.tax_reminders USING btree (due_date);

-- tax_filings
CREATE INDEX IF NOT EXISTS idx_tax_filings_settings_id ON tenant_master_template.tax_filings USING btree (settings_id);

-- tax_input_entries
CREATE INDEX IF NOT EXISTS idx_tax_input_entries_settings_id ON tenant_master_template.tax_input_entries USING btree (settings_id);

-- receipts
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_number ON tenant_master_template.receipts (receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON tenant_master_template.receipts (payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON tenant_master_template.receipts (invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client_id ON tenant_master_template.receipts (client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON tenant_master_template.receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_archived_at ON tenant_master_template.receipts (archived_at);

-- letters
CREATE UNIQUE INDEX IF NOT EXISTS idx_letters_number ON tenant_master_template.letters (letter_number);
CREATE INDEX IF NOT EXISTS idx_letters_tenant ON tenant_master_template.letters (tenant_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON tenant_master_template.letters (status);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON tenant_master_template.letters (created_at DESC);

-- boqs
CREATE INDEX IF NOT EXISTS idx_boqs_archived_active ON tenant_master_template.boqs USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_boqs_archived_at ON tenant_master_template.boqs USING btree (archived_at) WHERE (archived_at IS NOT NULL);

-- boq_rows
CREATE INDEX IF NOT EXISTS idx_boq_rows_boq_sort ON tenant_master_template.boq_rows USING btree (boq_id, sort_order);

-- rfqs
CREATE INDEX IF NOT EXISTS idx_rfqs_archived_active ON tenant_master_template.rfqs USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_rfqs_archived_at ON tenant_master_template.rfqs USING btree (archived_at) WHERE (archived_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_rfqs_rfq_number ON tenant_master_template.rfqs USING btree (rfq_number);

-- rfq_items
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON tenant_master_template.rfq_items USING btree (rfq_id);

-- item_catalog
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_catalog_normalized_name ON tenant_master_template.item_catalog USING btree (normalized_name);
CREATE INDEX IF NOT EXISTS idx_item_catalog_is_active ON tenant_master_template.item_catalog USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_item_catalog_created_at ON tenant_master_template.item_catalog USING btree (created_at DESC);

-- item_aliases
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_aliases_normalized_alias_text ON tenant_master_template.item_aliases USING btree (normalized_alias_text);
CREATE INDEX IF NOT EXISTS idx_item_aliases_item_id ON tenant_master_template.item_aliases USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_item_aliases_is_active ON tenant_master_template.item_aliases USING btree (is_active);

-- item_merge_log
CREATE INDEX IF NOT EXISTS idx_item_merge_log_batch_id ON tenant_master_template.item_merge_log USING btree (batch_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON tenant_master_template.audit_logs USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON tenant_master_template.audit_logs USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON tenant_master_template.audit_logs USING btree (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_scope ON tenant_master_template.audit_logs USING btree (scope_type, created_at DESC);

-- activity_events
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON tenant_master_template.activity_events USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON tenant_master_template.activity_events USING btree (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON tenant_master_template.activity_events USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_scope ON tenant_master_template.activity_events USING btree (scope_type, created_at DESC);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_status ON tenant_master_template.expenses USING btree (status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON tenant_master_template.expenses USING btree (category);
CREATE INDEX IF NOT EXISTS idx_expenses_period_code ON tenant_master_template.expenses USING btree (period_code);
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_date ON tenant_master_template.expenses USING btree (transaction_date);

-- source_transactions
CREATE INDEX IF NOT EXISTS idx_source_transactions_source_type_id ON tenant_master_template.source_transactions USING btree (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_source_transactions_lifecycle_status ON tenant_master_template.source_transactions USING btree (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_source_transactions_transaction_date ON tenant_master_template.source_transactions USING btree (transaction_date);

-- tax_adjustments
CREATE INDEX IF NOT EXISTS idx_tax_adjustments_period ON tenant_master_template.tax_adjustments USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_adjustments_source_txn ON tenant_master_template.tax_adjustments USING btree (source_transaction_id) WHERE (source_transaction_id IS NOT NULL);

-- tax_qce
CREATE INDEX IF NOT EXISTS idx_tax_qce_period ON tenant_master_template.tax_qce USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_qce_source_txn ON tenant_master_template.tax_qce USING btree (source_transaction_id) WHERE (source_transaction_id IS NOT NULL);

-- tax_loss_balances
CREATE INDEX IF NOT EXISTS idx_tax_loss_balances_period ON tenant_master_template.tax_loss_balances USING btree (accounting_period_id);

-- tax_computation_inputs
CREATE INDEX IF NOT EXISTS idx_tax_computation_inputs_period ON tenant_master_template.tax_computation_inputs USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_computation_inputs_status ON tenant_master_template.tax_computation_inputs USING btree (status);

-- tax_computation_results
CREATE INDEX IF NOT EXISTS idx_tax_computation_results_period ON tenant_master_template.tax_computation_results USING btree (accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_computation_results_status ON tenant_master_template.tax_computation_results USING btree (status);
CREATE INDEX IF NOT EXISTS idx_tax_computation_results_input ON tenant_master_template.tax_computation_results USING btree (computation_input_id);

-- tax_rule_versions
CREATE INDEX IF NOT EXISTS idx_tax_rule_versions_type ON tenant_master_template.tax_rule_versions USING btree (rule_type);
CREATE INDEX IF NOT EXISTS idx_tax_rule_versions_effective ON tenant_master_template.tax_rule_versions USING btree (effective_date);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- projects FKs
ALTER TABLE tenant_master_template.projects ADD CONSTRAINT projects_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES tenant_master_template.clients(id);

-- project_documents FKs
ALTER TABLE tenant_master_template.project_documents ADD CONSTRAINT project_documents_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES tenant_master_template.projects(id);

-- quotations FKs
ALTER TABLE tenant_master_template.quotations ADD CONSTRAINT quotations_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES tenant_master_template.clients(id);
ALTER TABLE tenant_master_template.quotations ADD CONSTRAINT quotations_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES tenant_master_template.projects(id);

-- quotation_items FKs
ALTER TABLE tenant_master_template.quotation_items ADD CONSTRAINT quotation_items_quotation_id_fkey
    FOREIGN KEY (quotation_id) REFERENCES tenant_master_template.quotations(id);

-- invoices FKs
ALTER TABLE tenant_master_template.invoices ADD CONSTRAINT invoices_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES tenant_master_template.projects(id);

-- payments FKs
ALTER TABLE tenant_master_template.payments ADD CONSTRAINT payments_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES tenant_master_template.invoices(id);

-- wht_receipts FKs
ALTER TABLE tenant_master_template.wht_receipts ADD CONSTRAINT wht_receipts_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES tenant_master_template.payments(id);
ALTER TABLE tenant_master_template.wht_receipts ADD CONSTRAINT wht_receipts_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES tenant_master_template.invoices(id);

-- csrs FKs
ALTER TABLE tenant_master_template.csrs ADD CONSTRAINT csrs_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES tenant_master_template.projects(id);
ALTER TABLE tenant_master_template.csrs ADD CONSTRAINT csrs_technician_signatory_id_fkey
    FOREIGN KEY (technician_signatory_id) REFERENCES tenant_master_template.signatories(id);

-- waybills FKs
ALTER TABLE tenant_master_template.waybills ADD CONSTRAINT waybills_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES tenant_master_template.clients(id);
ALTER TABLE tenant_master_template.waybills ADD CONSTRAINT waybills_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES tenant_master_template.projects(id);
ALTER TABLE tenant_master_template.waybills ADD CONSTRAINT waybills_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES tenant_master_template.invoices(id);

-- tax_settings FKs
ALTER TABLE tenant_master_template.tax_settings ADD CONSTRAINT tax_settings_settings_id_fkey
    FOREIGN KEY (settings_id) REFERENCES tenant_master_template.settings(id);

-- tax_input_entries FKs
ALTER TABLE tenant_master_template.tax_input_entries ADD CONSTRAINT tax_input_entries_settings_id_fkey
    FOREIGN KEY (settings_id) REFERENCES tenant_master_template.settings(id);

-- tax_filings FKs
ALTER TABLE tenant_master_template.tax_filings ADD CONSTRAINT tax_filings_settings_id_fkey
    FOREIGN KEY (settings_id) REFERENCES tenant_master_template.settings(id);

-- tax_reminders FKs
ALTER TABLE tenant_master_template.tax_reminders ADD CONSTRAINT tax_reminders_settings_id_fkey
    FOREIGN KEY (settings_id) REFERENCES tenant_master_template.settings(id);
ALTER TABLE tenant_master_template.tax_reminders ADD CONSTRAINT tax_reminders_linked_filing_id_fkey
    FOREIGN KEY (linked_filing_id) REFERENCES tenant_master_template.tax_filings(id);

-- receipts FKs
ALTER TABLE tenant_master_template.receipts ADD CONSTRAINT receipts_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES tenant_master_template.payments(id) ON DELETE RESTRICT;
ALTER TABLE tenant_master_template.receipts ADD CONSTRAINT receipts_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES tenant_master_template.invoices(id) ON DELETE RESTRICT;
ALTER TABLE tenant_master_template.receipts ADD CONSTRAINT receipts_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES tenant_master_template.clients(id) ON DELETE RESTRICT;

-- boq_rows FKs
ALTER TABLE tenant_master_template.boq_rows ADD CONSTRAINT boq_rows_boq_id_fkey
    FOREIGN KEY (boq_id) REFERENCES tenant_master_template.boqs(id);

-- rfq_items FKs
ALTER TABLE tenant_master_template.rfq_items ADD CONSTRAINT rfq_items_rfq_id_fkey
    FOREIGN KEY (rfq_id) REFERENCES tenant_master_template.rfqs(id);

-- item_aliases FKs
ALTER TABLE tenant_master_template.item_aliases ADD CONSTRAINT item_aliases_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES tenant_master_template.item_catalog(id);

-- item_merge_log FKs
ALTER TABLE tenant_master_template.item_merge_log ADD CONSTRAINT item_merge_log_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES tenant_master_template.item_import_batches(id);
ALTER TABLE tenant_master_template.item_merge_log ADD CONSTRAINT item_merge_log_from_item_id_fkey
    FOREIGN KEY (from_item_id) REFERENCES tenant_master_template.item_catalog(id);
ALTER TABLE tenant_master_template.item_merge_log ADD CONSTRAINT item_merge_log_to_item_id_fkey
    FOREIGN KEY (to_item_id) REFERENCES tenant_master_template.item_catalog(id);

-- ============================================================
-- TRIGGERS (recreated so LIKE INCLUDING ALL picks them up)
-- ============================================================
-- Trigger functions (set_row_updated_at, stamp_row_ownership) live in
-- public and are accessible from any schema.  LIKE INCLUDING ALL copies
-- constraints, defaults, indexes, but NOT triggers — so we create them
-- explicitly on the template tables.

DO $trigger_block$
DECLARE
    t text;
    _schema text := 'tenant_master_template';
BEGIN
    -- updated_at + ownership triggers for document tables
    FOREACH t IN ARRAY ARRAY[
        'quotations', 'quotation_items',
        'projects',
        'invoices',
        'receipts',
        'letters'
    ] LOOP
        BEGIN
            EXECUTE format(
                'CREATE TRIGGER trg_%s_set_updated_at BEFORE UPDATE ON %I.%I '
                'FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at()',
                t, _schema, t
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            EXECUTE format(
                'CREATE TRIGGER trg_%s_stamp_ownership BEFORE INSERT OR UPDATE ON %I.%I '
                'FOR EACH ROW EXECUTE FUNCTION public.stamp_row_ownership()',
                t, _schema, t
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;

    -- updated_at-only triggers for item tables
    FOREACH t IN ARRAY ARRAY[
        'item_catalog', 'item_aliases', 'item_import_batches'
    ] LOOP
        BEGIN
            EXECUTE format(
                'CREATE TRIGGER trg_%s_set_row_updated_at BEFORE UPDATE ON %I.%I '
                'FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at()',
                t, _schema, t
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END
$trigger_block$;

-- ============================================================
-- Sync _prov_get_template_tables() with all seed tables
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
        'expenses', 'source_transactions',
        'tax_adjustments', 'tax_qce', 'tax_loss_balances',
        'entity_tax_config', 'tax_computation_inputs',
        'tax_computation_results', 'tax_rule_versions'
    ];
$function$;

-- Sync _prov_table_to_resource() with all seed tables
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
        WHEN 'source_transactions' THEN 'source_transaction'
        WHEN 'tax_adjustments' THEN 'tax_setting'
        WHEN 'tax_qce' THEN 'tax_setting'
        WHEN 'tax_loss_balances' THEN 'tax_setting'
        WHEN 'entity_tax_config' THEN 'tax_setting'
        WHEN 'tax_computation_inputs' THEN 'tax_setting'
        WHEN 'tax_computation_results' THEN 'tax_setting'
        WHEN 'tax_rule_versions' THEN 'tax_setting'
        ELSE p_table
    END;
$function$;

-- ============================================================
-- DONE
-- ============================================================
