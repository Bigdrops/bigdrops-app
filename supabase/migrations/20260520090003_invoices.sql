-- Domain: Invoices
-- Tables: invoices, invoice_items, payments, wht_receipts
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
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
    scope_type text DEFAULT 'app'::text
);

CREATE TABLE IF NOT EXISTS invoice_items (
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
    item_id uuid
);

CREATE TABLE IF NOT EXISTS payments (
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
    bank_account_id uuid
);

CREATE TABLE IF NOT EXISTS wht_receipts (
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
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);
ALTER TABLE payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE wht_receipts ADD CONSTRAINT wht_receipts_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_status_created_at ON public.invoices USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_archived_at ON public.invoices USING btree (archived_at);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices USING btree (project_id);
CREATE INDEX IF NOT EXISTS invoices_po_number_idx ON public.invoices USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON public.invoices USING btree (document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_by ON public.invoices USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON public.invoices USING btree (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON public.invoice_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_description ON public.invoice_items USING btree (description);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments USING btree (invoice_id);

CREATE UNIQUE INDEX IF NOT EXISTS wht_receipts_payment_id_key ON public.wht_receipts USING btree (payment_id);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE invoices ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);
ALTER TABLE wht_receipts ADD CONSTRAINT wht_receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id);
ALTER TABLE wht_receipts ADD CONSTRAINT wht_receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_receipts ENABLE ROW LEVEL SECURITY;

-- invoices
CREATE POLICY allow_authenticated_read_invoices ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY approved_users_only_invoices ON invoices FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))));
CREATE POLICY invoices_authenticated_select ON invoices FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY invoices_authenticated_delete ON invoices FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY invoices_authenticated_update ON invoices FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- invoice_items
CREATE POLICY approved_users_only_invoice_items ON invoice_items FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))));
CREATE POLICY invoice_items_authenticated_select ON invoice_items FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY invoice_items_authenticated_delete ON invoice_items FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY invoice_items_authenticated_update ON invoice_items FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- payments
CREATE POLICY payments_authenticated_select ON payments FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY payments_authenticated_delete ON payments FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY payments_authenticated_update ON payments FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- wht_receipts
CREATE POLICY wht_receipts_authenticated_select ON wht_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY wht_receipts_authenticated_delete ON wht_receipts FOR DELETE TO authenticated USING (true);
CREATE POLICY wht_receipts_authenticated_update ON wht_receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_invoices_set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();
CREATE TRIGGER trg_invoices_stamp_ownership BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION stamp_row_ownership();

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_invoice_created(p_invoice_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'CREATED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'status', v_invoice.status,
      'project_id', v_invoice.project_id,
      'client_id', v_invoice.client_id,
      'total', v_invoice.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_invoice_status_changed(p_invoice_id uuid, p_old_status text DEFAULT NULL::text, p_new_status text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_invoice.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_payment_recorded(p_invoice_id uuid, p_amount numeric DEFAULT NULL::numeric, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'PAYMENT_RECORDED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'amount', p_amount,
      'status', v_invoice.status,
      'total', v_invoice.total
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;
