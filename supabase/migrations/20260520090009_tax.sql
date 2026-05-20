-- Domain: Tax
-- Tables: tax_settings, tax_input_entries, tax_filings, tax_reminders
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_settings (
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
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_input_entries (
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
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_filings (
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
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_reminders (
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
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE tax_settings ADD CONSTRAINT tax_settings_pkey PRIMARY KEY (id);
ALTER TABLE tax_input_entries ADD CONSTRAINT tax_input_entries_pkey PRIMARY KEY (id);
ALTER TABLE tax_filings ADD CONSTRAINT tax_filings_pkey PRIMARY KEY (id);
ALTER TABLE tax_reminders ADD CONSTRAINT tax_reminders_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS tax_settings_settings_id_key ON public.tax_settings USING btree (settings_id);
CREATE INDEX IF NOT EXISTS idx_tax_reminders_due_date ON public.tax_reminders USING btree (due_date);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE tax_settings ADD CONSTRAINT tax_settings_settings_id_fkey FOREIGN KEY (settings_id) REFERENCES settings(id);
ALTER TABLE tax_input_entries ADD CONSTRAINT tax_input_entries_settings_id_fkey FOREIGN KEY (settings_id) REFERENCES settings(id);
ALTER TABLE tax_filings ADD CONSTRAINT tax_filings_settings_id_fkey FOREIGN KEY (settings_id) REFERENCES settings(id);
ALTER TABLE tax_reminders ADD CONSTRAINT tax_reminders_settings_id_fkey FOREIGN KEY (settings_id) REFERENCES settings(id);
ALTER TABLE tax_reminders ADD CONSTRAINT tax_reminders_linked_filing_id_fkey FOREIGN KEY (linked_filing_id) REFERENCES tax_filings(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_input_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_reminders ENABLE ROW LEVEL SECURITY;

-- tax_settings
CREATE POLICY tax_settings_authenticated_select ON tax_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY tax_settings_authenticated_update ON tax_settings FOR UPDATE TO authenticated USING ((settings_id = 1)) WITH CHECK ((settings_id = 1));
CREATE POLICY tax_settings_authenticated_delete ON tax_settings FOR DELETE TO authenticated USING ((settings_id = 1));

-- tax_input_entries
CREATE POLICY enable_read_access_for_authenticated_users_on_tax_input_entries ON tax_input_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY enable_update_access_for_authenticated_users_on_tax_input_entries ON tax_input_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY enable_delete_access_for_authenticated_users_on_tax_input_entries ON tax_input_entries FOR DELETE TO authenticated USING (true);

-- tax_filings
CREATE POLICY auth_read_tax_filings ON tax_filings FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_update_tax_filings ON tax_filings FOR UPDATE TO authenticated USING (true);
CREATE POLICY auth_delete_tax_filings ON tax_filings FOR DELETE TO authenticated USING (true);

-- tax_reminders
CREATE POLICY auth_read_tax_reminders ON tax_reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_update_tax_reminders ON tax_reminders FOR UPDATE TO authenticated USING (true);
CREATE POLICY auth_delete_tax_reminders ON tax_reminders FOR DELETE TO authenticated USING (true);
