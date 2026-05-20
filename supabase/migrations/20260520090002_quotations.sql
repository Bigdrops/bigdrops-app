-- Domain: Quotations
-- Tables: quotations, quotation_items, boqs, boq_rows, rfqs, rfq_items
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS quotations (
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
    scope_type text DEFAULT 'app'::text
);

CREATE TABLE IF NOT EXISTS quotation_items (
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
    item_id uuid
);

CREATE TABLE IF NOT EXISTS boqs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    title text,
    client_name text,
    project_name text,
    template_id text DEFAULT 'bordered_schedule'::text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    archived_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS boq_rows (
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
    notes text
);

CREATE TABLE IF NOT EXISTS rfqs (
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
    archived_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rfq_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    rfq_id uuid,
    sort_order integer DEFAULT 0,
    description text,
    quantity numeric DEFAULT 0,
    unit text,
    specification text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE quotations ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);
ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);
ALTER TABLE boqs ADD CONSTRAINT boqs_pkey PRIMARY KEY (id);
ALTER TABLE boq_rows ADD CONSTRAINT boq_rows_pkey PRIMARY KEY (id);
ALTER TABLE rfqs ADD CONSTRAINT rfqs_pkey PRIMARY KEY (id);
ALTER TABLE rfq_items ADD CONSTRAINT rfq_items_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS quotations_quotation_number_key ON public.quotations USING btree (quotation_number);
CREATE INDEX IF NOT EXISTS quotations_client_id_idx ON public.quotations USING btree (client_id);
CREATE INDEX IF NOT EXISTS quotations_project_id_idx ON public.quotations USING btree (project_id);
CREATE INDEX IF NOT EXISTS quotations_status_idx ON public.quotations USING btree (status);
CREATE INDEX IF NOT EXISTS quotations_issue_date_idx ON public.quotations USING btree (issue_date DESC);
CREATE INDEX IF NOT EXISTS quotations_archived_at_idx ON public.quotations USING btree (archived_at);
CREATE INDEX IF NOT EXISTS quotations_po_number_idx ON public.quotations USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON public.quotations USING btree (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_quotation_number_unique ON public.quotations USING btree (quotation_number) WHERE (quotation_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON public.quotations USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_updated_by ON public.quotations USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_quotations_status_updated_at ON public.quotations USING btree (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS quotation_items_quotation_id_idx ON public.quotation_items USING btree (quotation_id);
CREATE INDEX IF NOT EXISTS quotation_items_sort_order_idx ON public.quotation_items USING btree (quotation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_id ON public.quotation_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_description ON public.quotation_items USING btree (description);

CREATE INDEX IF NOT EXISTS idx_boqs_archived_active ON public.boqs USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_boqs_archived_at ON public.boqs USING btree (archived_at) WHERE (archived_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_boq_rows_boq_sort ON public.boq_rows USING btree (boq_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_rfqs_archived_active ON public.rfqs USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_rfqs_archived_at ON public.rfqs USING btree (archived_at) WHERE (archived_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_rfqs_rfq_number ON public.rfqs USING btree (rfq_number);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON public.rfq_items USING btree (rfq_id);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE quotations ADD CONSTRAINT quotations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);
ALTER TABLE quotations ADD CONSTRAINT quotations_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE quotation_items ADD CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id);
ALTER TABLE boq_rows ADD CONSTRAINT boq_rows_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES boqs(id);
ALTER TABLE rfq_items ADD CONSTRAINT rfq_items_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES rfqs(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

-- quotations
CREATE POLICY authenticated_quotations_read ON quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY authenticated_quotations_write ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY quotations_authenticated_select ON quotations FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY quotations_authenticated_delete ON quotations FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY quotations_authenticated_update ON quotations FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- quotation_items
CREATE POLICY authenticated_quotation_items_read ON quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY authenticated_quotation_items_write ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY quotation_items_authenticated_select ON quotation_items FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY quotation_items_authenticated_delete ON quotation_items FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY quotation_items_authenticated_update ON quotation_items FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- boqs
CREATE POLICY boqs_select_own ON boqs FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY boqs_delete_own ON boqs FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY boqs_update_own ON boqs FOR UPDATE TO public USING ((auth.uid() = user_id));

-- boq_rows
CREATE POLICY boq_rows_select_own ON boq_rows FOR SELECT TO public
  USING ((EXISTS ( SELECT 1 FROM boqs WHERE ((boqs.id = boq_rows.boq_id) AND (boqs.user_id = auth.uid())))));
CREATE POLICY boq_rows_delete_own ON boq_rows FOR DELETE TO public
  USING ((EXISTS ( SELECT 1 FROM boqs WHERE ((boqs.id = boq_rows.boq_id) AND (boqs.user_id = auth.uid())))));
CREATE POLICY boq_rows_update_own ON boq_rows FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1 FROM boqs WHERE ((boqs.id = boq_rows.boq_id) AND (boqs.user_id = auth.uid())))));

-- rfqs
CREATE POLICY rfqs_authenticated_select ON rfqs FOR SELECT TO authenticated USING (true);
CREATE POLICY rfqs_authenticated_delete ON rfqs FOR DELETE TO authenticated USING (true);
CREATE POLICY rfqs_authenticated_update ON rfqs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- rfq_items
CREATE POLICY rfq_items_authenticated_select ON rfq_items FOR SELECT TO authenticated USING (true);
CREATE POLICY rfq_items_authenticated_delete ON rfq_items FOR DELETE TO authenticated USING (true);
CREATE POLICY rfq_items_authenticated_update ON rfq_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER quotations_set_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER quotation_items_set_updated_at BEFORE UPDATE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quotations_set_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();
CREATE TRIGGER trg_quotations_stamp_ownership BEFORE INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION stamp_row_ownership();

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_quotation_created(p_quotation_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'CREATED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'status', v_quotation.status,
      'project_id', v_quotation.project_id,
      'client_id', v_quotation.client_id,
      'total', v_quotation.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_quotation_status_changed(p_quotation_id uuid, p_old_status text DEFAULT NULL::text, p_new_status text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_quotation.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_quotation_linked(p_quotation_id uuid, p_invoice_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'LINKED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'invoice_id', p_invoice_id,
      'project_id', p_project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;
