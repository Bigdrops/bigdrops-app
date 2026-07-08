-- Receipt snapshot columns + prefix engine + audit constraint updates
-- Created: 2026-07-07
-- Spec: docs/STANDARD/receipt-standard.md

-- ============================================================
-- 1. ADD SNAPSHOT COLUMNS TO receipts TABLE
-- ============================================================

-- Payment snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_amount numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_notes text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cash_amount numeric DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS wht_amount numeric DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'NGN';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS wht_rate numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS wht_type text;

-- Invoice snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_total numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_subtotal numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_vat numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_wht numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_discount numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_notes text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_terms text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS invoice_po_number text;

-- Client snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_city text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_state text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS client_email text;

-- Project snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS project_code text;

-- Company snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_address text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_email text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_phone text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Bank snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_account_name text;

-- Signatory snapshot
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS signatory_name text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS signatory_role text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS signatory_signature_url text;

-- Lifecycle
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS void_reason text;

-- Add CHECK constraint for status
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check
  CHECK (status IN ('active', 'voided'));

-- ============================================================
-- 2. MIGRATE EXISTING DATA (map old columns to new snapshot columns)
-- ============================================================

UPDATE receipts SET
  payment_amount = amount,
  payment_date = payment_date,
  payment_reference = payment_ref,
  payment_notes = notes
WHERE payment_amount IS NULL;

-- ============================================================
-- 3. DROP OLD COLUMNS (now redundant with snapshot columns)
-- ============================================================

-- Keep 'amount' as alias view column or drop after confirming all consumers updated
-- For safety, keep old columns but mark as deprecated via comment
COMMENT ON COLUMN receipts.amount IS 'DEPRECATED: use payment_amount';
COMMENT ON COLUMN receipts.payment_ref IS 'DEPRECATED: use payment_reference';
COMMENT ON COLUMN receipts.updated_at IS 'DEPRECATED: receipts are immutable';
COMMENT ON COLUMN receipts.updated_by IS 'DEPRECATED: receipts are immutable';
COMMENT ON COLUMN receipts.archived_at IS 'DEPRECATED: receipts are not archivable';

-- ============================================================
-- 4. ADD 'receipt' KEY TO settings.document_prefixes CHECK
-- ============================================================

ALTER TABLE settings DROP CONSTRAINT IF EXISTS check_document_prefixes_format;
ALTER TABLE settings
ADD CONSTRAINT check_document_prefixes_format CHECK (
  document_prefixes IS NULL OR (
    jsonb_typeof(document_prefixes) = 'object' AND
    (document_prefixes->>'waybill')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'invoice')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'boq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'rfq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'quotation') ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'project')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'csr')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'receipt')   ~ '^[A-Z0-9]{2,6}$'
  )
);

-- ============================================================
-- 5. ADD 'receipt' TO activity_events.entity_type CHECK
-- ============================================================

DO $$ BEGIN
  ALTER TABLE activity_events
    DROP CONSTRAINT IF EXISTS activity_events_entity_type_check;
  ALTER TABLE activity_events
    ADD CONSTRAINT activity_events_entity_type_check
    CHECK (entity_type IN ('invoice', 'quotation', 'project', 'receipt', 'waybill', 'csr', 'rfq', 'boq'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- 6. ADD RECEIPT EVENT TYPES TO activity_events.event_type CHECK
-- ============================================================

DO $$ BEGIN
  ALTER TABLE activity_events
    DROP CONSTRAINT IF EXISTS activity_events_event_type_check;
  ALTER TABLE activity_events
    ADD CONSTRAINT activity_events_event_type_check
    CHECK (event_type IN (
      'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
      'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
      'ARCHIVED', 'UNARCHIVED', 'RECEIPT_GENERATED', 'RECEIPT_VOIDED'
    ));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- 7. BACKFILL: Add receipt key to existing settings rows
-- ============================================================

UPDATE settings
SET document_prefixes = document_prefixes || '{"receipt": "RCP"}'::jsonb
WHERE document_prefixes IS NOT NULL
  AND document_prefixes->>'receipt' IS NULL;
