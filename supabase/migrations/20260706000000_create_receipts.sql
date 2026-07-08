-- Domain: Receipts (Payment Acknowledgement)
-- Created: 2026-07-06
-- Spec: docs/STANDARD/receipt-standard.md

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number  text NOT NULL,
  payment_id      uuid NOT NULL,
  invoice_id      uuid NOT NULL,
  client_id       uuid NOT NULL,
  client_name     text NOT NULL,
  amount          numeric NOT NULL,
  currency_code   text NOT NULL DEFAULT 'NGN',
  payment_date    date NOT NULL,
  payment_method  text,
  payment_ref     text,
  notes           text,
  created_by      uuid,
  updated_by      uuid,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),
  archived_at     timestamp with time zone
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_number        ON receipts (receipt_number);
CREATE INDEX        IF NOT EXISTS idx_receipts_payment_id    ON receipts (payment_id);
CREATE INDEX        IF NOT EXISTS idx_receipts_invoice_id    ON receipts (invoice_id);
CREATE INDEX        IF NOT EXISTS idx_receipts_client_id     ON receipts (client_id);
CREATE INDEX        IF NOT EXISTS idx_receipts_created_at    ON receipts (created_at DESC);
CREATE INDEX        IF NOT EXISTS idx_receipts_archived_at   ON receipts (archived_at);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE receipts
  ADD CONSTRAINT receipts_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE RESTRICT;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE RESTRICT;

-- ============================================================
-- PREFIX FORMAT: {prefix}-{routingToken?}-{serial}
-- Receipt prefix is validated in TypeScript; DB stores raw text.
-- ============================================================

-- ============================================================
-- IMMUTABILITY: amount, currency, payment_date, payment_method,
-- payment_ref, client_* are frozen at creation time.
-- Only notes, archived_at, updated_by may change.
-- ============================================================

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY receipts_authenticated_select ON receipts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY receipts_authenticated_insert ON receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_approved = true
    )
  );

CREATE POLICY receipts_authenticated_update ON receipts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY receipts_authenticated_delete ON receipts
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_receipts_set_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();

CREATE TRIGGER trg_receipts_stamp_ownership
  BEFORE INSERT OR UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION stamp_row_ownership();
