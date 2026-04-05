-- Phase 2A: Compliance Hub Persistent Storage

-- Tax Settings: Per-entity tax identification and operational rules
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id BIGINT UNIQUE NOT NULL, -- Links to 'settings' table id
    tin TEXT,
    vat_enabled BOOLEAN DEFAULT FALSE,
    vat_threshold NUMERIC(15, 2) DEFAULT 0,
    threshold_basis TEXT,
    cit_category TEXT,
    year_end_month INT,
    year_end_day INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WHT Receipts: Tracking for witholding tax certificates
CREATE TABLE IF NOT EXISTS wht_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id BIGINT NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    client_name TEXT,
    gross_base_amount NUMERIC(15, 2),
    wht_rate NUMERIC(15, 2),
    wht_amount NUMERIC(15, 2),
    receipt_status TEXT DEFAULT 'pending', -- pending, requested, received, verified
    receipt_number TEXT,
    receipt_file_url TEXT,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(payment_id) -- One receipt tracking record per payment
);

-- Basic RLS (Assuming existing app uses simple or no RLS, but adding skeletons)
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_receipts ENABLE ROW LEVEL SECURITY;

-- If there are specific policies in the app, they would go here.
-- For now, we assume authenticated access is handled broadly as per current app style.
CREATE POLICY "Allow all for authenticated users" ON tax_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON wht_receipts FOR ALL TO authenticated USING (true);
