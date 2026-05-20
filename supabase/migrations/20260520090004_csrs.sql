-- Domain: CSRs & Waybills
-- Tables: csrs, waybills
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS csrs (
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
    call_type text
);

CREATE TABLE IF NOT EXISTS waybills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    waybill_number text NOT NULL,
    type text NOT NULL,
    date date NOT NULL,
    time time without time zone,
    sender_name text,
    receiver_name text,
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
    status text DEFAULT 'draft'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    archived_at timestamp with time zone
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE csrs ADD CONSTRAINT csrs_pkey PRIMARY KEY (id);
ALTER TABLE waybills ADD CONSTRAINT waybills_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_csrs_archived_active ON public.csrs USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_csrs_created_at ON public.csrs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csrs_client_id ON public.csrs USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_csrs_archived_at ON public.csrs USING btree (archived_at);
CREATE INDEX IF NOT EXISTS idx_csrs_project_id ON public.csrs USING btree (project_id);
CREATE INDEX IF NOT EXISTS csrs_po_number_idx ON public.csrs USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_csrs_status ON public.csrs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_csrs_technician_signatory_id ON public.csrs USING btree (technician_signatory_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_csrs_csr_number_unique ON public.csrs USING btree (csr_number) WHERE (csr_number IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_waybills_archived_active ON public.waybills USING btree (archived_at) WHERE (archived_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_waybills_archived_at ON public.waybills USING btree (archived_at) WHERE (archived_at IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_waybills_waybill_number_unique ON public.waybills USING btree (waybill_number) WHERE (waybill_number IS NOT NULL);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE csrs ADD CONSTRAINT csrs_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE csrs ADD CONSTRAINT csrs_technician_signatory_id_fkey FOREIGN KEY (technician_signatory_id) REFERENCES signatories(id);
ALTER TABLE waybills ADD CONSTRAINT waybills_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);
ALTER TABLE waybills ADD CONSTRAINT waybills_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE waybills ADD CONSTRAINT waybills_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE csrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waybills ENABLE ROW LEVEL SECURITY;

-- csrs
CREATE POLICY allow_authenticated_read_csrs ON csrs FOR SELECT TO authenticated USING (true);
CREATE POLICY approved_users_only_csrs ON csrs FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))));
CREATE POLICY csrs_authenticated_select ON csrs FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY csrs_authenticated_delete ON csrs FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY csrs_authenticated_update ON csrs FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- waybills
CREATE POLICY waybills_authenticated_select ON waybills FOR SELECT TO authenticated USING (true);
CREATE POLICY waybills_authenticated_delete ON waybills FOR DELETE TO authenticated USING (true);
CREATE POLICY waybills_authenticated_update ON waybills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
