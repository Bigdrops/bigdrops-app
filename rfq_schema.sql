-- RFQ Table
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT NOT NULL,
  title TEXT,
  vendor_name TEXT,
  vendor_contact TEXT,
  issue_date DATE,
  expiry_date DATE,
  show_brand_name BOOLEAN DEFAULT FALSE,
  brand_name_override TEXT,
  background_mode TEXT DEFAULT 'palette',
  background_primary TEXT,
  background_secondary TEXT,
  palette_name TEXT,
  text_color TEXT,
  accent_color TEXT,
  export_order_seed INTEGER,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RFQ Items Table
CREATE TABLE IF NOT EXISTS rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  specification TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rfqs_rfq_number ON rfqs(rfq_number);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);
