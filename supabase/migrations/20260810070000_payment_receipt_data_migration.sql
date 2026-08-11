-- Payment + Receipt aggregate data migration
-- Created: 2026-08-10
--
-- Payments and receipts depend on invoices (already migrated).
-- receipts also depends on clients (stays public) → drop that FK.
-- wht_receipts are part of the payment aggregate.
--
-- Compatible with SQL editor (each DO block is self-contained).

BEGIN;

-- ============================================================
-- 1. Resolve tenant + create schema if missing
-- ============================================================

DO $$
DECLARE
  v_entity_id UUID;
BEGIN
  SELECT e.id INTO v_entity_id
  FROM public.entities e
  JOIN public.workspaces w ON w.id = e.workspace_id
  WHERE w.slug = 'bigdrops-main'
    AND e.slug = 'main'
  LIMIT 1;

  IF v_entity_id IS NULL THEN
    RAISE EXCEPTION 'Production entity not found';
  END IF;

  RAISE NOTICE 'Tenant entity: %', v_entity_id;

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_entity_id::text) THEN
    EXECUTE format('CREATE SCHEMA %I', v_entity_id::text);
    RAISE NOTICE 'Created schema: %', v_entity_id::text;
  END IF;
END $$;

-- ============================================================
-- 2. Drop cross-schema FKs on tenant side
-- ============================================================

DO $$
BEGIN
  -- payments: drop FK to public.invoices
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".payments
    DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".payments
    DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey_clone;

  -- receipts: drop FKs to public.payments, public.invoices, public.clients
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".receipts
    DROP CONSTRAINT IF EXISTS receipts_payment_id_fkey;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".receipts
    DROP CONSTRAINT IF EXISTS receipts_payment_id_fkey_clone;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".receipts
    DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".receipts
    DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey_clone;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".receipts
    DROP CONSTRAINT IF EXISTS receipts_client_id_fkey;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".receipts
    DROP CONSTRAINT IF EXISTS receipts_client_id_fkey_clone;

  -- wht_receipts: drop FKs to public.payments, public.invoices
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".wht_receipts
    DROP CONSTRAINT IF EXISTS wht_receipts_payment_id_fkey;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".wht_receipts
    DROP CONSTRAINT IF EXISTS wht_receipts_payment_id_fkey_clone;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".wht_receipts
    DROP CONSTRAINT IF EXISTS wht_receipts_invoice_id_fkey;
  ALTER TABLE IF EXISTS "entity_bigdrops-main_main".wht_receipts
    DROP CONSTRAINT IF EXISTS wht_receipts_invoice_id_fkey_clone;

  RAISE NOTICE 'Dropped cross-schema FKs on tenant side';
END $$;

-- ============================================================
-- 3. Copy data (preserved UUIDs)
-- ============================================================

-- Payments first (receipts depend on payments)
INSERT INTO "entity_bigdrops-main_main".payments
  (id, invoice_id, amount, date, method, reference, notes, created_at,
   cash_amount, wht_amount, currency_code, wht_rate, wht_type,
   wht_certificate_ref, recorded_by, voided_at, void_reason, source,
   bank_account_id, attachments)
SELECT
  id, invoice_id, amount, date, method, reference, notes, created_at,
  cash_amount, wht_amount, currency_code, wht_rate, wht_type,
  wht_certificate_ref, recorded_by, voided_at, void_reason, source,
  bank_account_id, attachments
FROM public.payments
ON CONFLICT (id) DO NOTHING;

-- WHT receipts
INSERT INTO "entity_bigdrops-main_main".wht_receipts
  (id, payment_id, invoice_id, client_name, gross_base_amount,
   wht_rate, wht_amount, receipt_status, receipt_number,
   receipt_file_url, received_at, notes, created_at, updated_at)
SELECT
  id, payment_id, invoice_id, client_name, gross_base_amount,
   wht_rate, wht_amount, receipt_status, receipt_number,
   receipt_file_url, received_at, notes, created_at, updated_at
FROM public.wht_receipts
ON CONFLICT (id) DO NOTHING;

-- Receipts last (depends on payments)
INSERT INTO "entity_bigdrops-main_main".receipts
  (id, receipt_number, payment_id, invoice_id, client_id, client_name,
   amount, currency_code, payment_date, payment_method, payment_ref,
   notes, created_by, updated_by, created_at, updated_at, archived_at,
   payment_amount, payment_method, payment_reference,
   payment_notes, cash_amount, wht_amount, wht_rate, wht_type,
   invoice_number, invoice_total, invoice_subtotal, invoice_vat,
   invoice_wht, invoice_discount, invoice_notes, invoice_terms,
   invoice_po_number, client_address, client_city, client_state,
   client_phone, client_email, project_name, project_code,
   company_name, company_address, company_email, company_phone,
   company_logo_url, bank_name, bank_account_number, bank_account_name,
   signatory_name, signatory_role, signatory_signature_url,
   status, voided_at, void_reason)
SELECT
  id, receipt_number, payment_id, invoice_id, client_id, client_name,
   amount, currency_code, payment_date, payment_method, payment_ref,
   notes, created_by, updated_by, created_at, updated_at, archived_at,
   payment_amount, payment_method, payment_reference,
   payment_notes, cash_amount, wht_amount, wht_rate, wht_type,
   invoice_number, invoice_total, invoice_subtotal, invoice_vat,
   invoice_wht, invoice_discount, invoice_notes, invoice_terms,
   invoice_po_number, client_address, client_city, client_state,
   client_phone, client_email, project_name, project_code,
   company_name, company_address, company_email, company_phone,
   company_logo_url, bank_name, bank_account_number, bank_account_name,
   signatory_name, signatory_role, signatory_signature_url,
   status, voided_at, void_reason
FROM public.receipts
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Re-enable triggers on tenant side
-- ============================================================

ALTER TABLE "entity_bigdrops-main_main".payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entity_bigdrops-main_main".payments
  FORCE ROW LEVEL SECURITY;

ALTER TABLE "entity_bigdrops-main_main".wht_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entity_bigdrops-main_main".wht_receipts
  FORCE ROW LEVEL SECURITY;

ALTER TABLE "entity_bigdrops-main_main".receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entity_bigdrops-main_main".receipts
  FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  PERFORM _prov_install_triggers('"entity_bigdrops-main_main"'::regclass, 'payments');
  PERFORM _prov_install_triggers('"entity_bigdrops-main_main"'::regclass, 'wht_receipts');
  PERFORM _prov_install_triggers('"entity_bigdrops-main_main"'::regclass, 'receipts');
END $$;

-- ============================================================
-- 5. Re-add FK constraints on tenant side
-- ============================================================

DO $$
BEGIN
  -- payments → tenant invoices
  ALTER TABLE "entity_bigdrops-main_main".payments
    ADD CONSTRAINT payments_invoice_id_fkey
    FOREIGN KEY (invoice_id)
    REFERENCES "entity_bigdrops-main_main".invoices(id);

  -- wht_receipts → tenant payments
  ALTER TABLE "entity_bigdrops-main_main".wht_receipts
    ADD CONSTRAINT wht_receipts_payment_id_fkey
    FOREIGN KEY (payment_id)
    REFERENCES "entity_bigdrops-main_main".payments(id);

  -- wht_receipts → tenant invoices
  ALTER TABLE "entity_bigdrops-main_main".wht_receipts
    ADD CONSTRAINT wht_receipts_invoice_id_fkey
    FOREIGN KEY (invoice_id)
    REFERENCES "entity_bigdrops-main_main".invoices(id);

  -- receipts → tenant payments
  ALTER TABLE "entity_bigdrops-main_main".receipts
    ADD CONSTRAINT receipts_payment_id_fkey
    FOREIGN KEY (payment_id)
    REFERENCES "entity_bigdrops-main_main".payments(id);

  -- receipts → tenant invoices
  ALTER TABLE "entity_bigdrops-main_main".receipts
    ADD CONSTRAINT receipts_invoice_id_fkey
    FOREIGN KEY (invoice_id)
    REFERENCES "entity_bigdrops-main_main".invoices(id);

  -- NOTE: receipts.client_id FK intentionally omitted — clients stay in public schema.

  RAISE NOTICE 'Re-added FK constraints on tenant side';
END $$;

-- ============================================================
-- 6. Validate
-- ============================================================

DO $$
DECLARE
  v_public_payments    INT;
  v_tenant_payments    INT;
  v_public_wht         INT;
  v_tenant_wht         INT;
  v_public_receipts    INT;
  v_tenant_receipts    INT;
  v_orphaned_payments  INT;
  v_orphaned_wht       INT;
  v_orphaned_receipts  INT;
BEGIN
  SELECT count(*) INTO v_public_payments FROM public.payments;
  SELECT count(*) INTO v_tenant_payments FROM "entity_bigdrops-main_main".payments;
  SELECT count(*) INTO v_public_wht FROM public.wht_receipts;
  SELECT count(*) INTO v_tenant_wht FROM "entity_bigdrops-main_main".wht_receipts;
  SELECT count(*) INTO v_public_receipts FROM public.receipts;
  SELECT count(*) INTO v_tenant_receipts FROM "entity_bigdrops-main_main".receipts;

  -- Check for payments referencing non-existent tenant invoices
  SELECT count(*) INTO v_orphaned_payments
  FROM "entity_bigdrops-main_main".payments p
  LEFT JOIN "entity_bigdrops-main_main".invoices i ON i.id = p.invoice_id
  WHERE i.id IS NULL;

  -- Check for wht_receipts referencing non-existent tenant payments
  SELECT count(*) INTO v_orphaned_wht
  FROM "entity_bigdrops-main_main".wht_receipts w
  LEFT JOIN "entity_bigdrops-main_main".payments p ON p.id = w.payment_id
  WHERE p.id IS NULL;

  -- Check for receipts referencing non-existent tenant payments or invoices
  SELECT count(*) INTO v_orphaned_receipts
  FROM "entity_bigdrops-main_main".receipts r
  LEFT JOIN "entity_bigdrops-main_main".payments p ON p.id = r.payment_id
  LEFT JOIN "entity_bigdrops-main_main".invoices i ON i.id = r.invoice_id
  WHERE p.id IS NULL OR i.id IS NULL;

  RAISE NOTICE ' payments: public=% tenant=%', v_public_payments, v_tenant_payments;
  RAISE NOTICE ' wht_receipts: public=% tenant=%', v_public_wht, v_tenant_wht;
  RAISE NOTICE ' receipts: public=% tenant=%', v_public_receipts, v_tenant_receipts;
  RAISE NOTICE ' orphaned payments (no tenant invoice): %', v_orphaned_payments;
  RAISE NOTICE ' orphaned wht_receipts (no tenant payment): %', v_orphaned_wht;
  RAISE NOTICE ' orphaned receipts (no tenant payment/invoice): %', v_orphaned_receipts;

  IF v_orphaned_payments > 0 THEN
    RAISE EXCEPTION 'Aborting: % payments reference non-existent tenant invoices', v_orphaned_payments;
  END IF;
  IF v_orphaned_wht > 0 THEN
    RAISE EXCEPTION 'Aborting: % wht_receipts reference non-existent tenant payments', v_orphaned_wht;
  END IF;
  IF v_orphaned_receipts > 0 THEN
    RAISE EXCEPTION 'Aborting: % receipts reference non-existent tenant payments/invoices', v_orphaned_receipts;
  END IF;

  IF v_tenant_payments < v_public_payments THEN
    RAISE EXCEPTION 'Aborting: tenant has fewer payments than public (%)', v_public_payments;
  END IF;
  IF v_tenant_wht < v_public_wht THEN
    RAISE EXCEPTION 'Aborting: tenant has fewer wht_receipts than public (%)', v_public_wht;
  END IF;
  IF v_tenant_receipts < v_public_receipts THEN
    RAISE EXCEPTION 'Aborting: tenant has fewer receipts than public (%)', v_public_receipts;
  END IF;

  RAISE NOTICE 'Payment+Receipt data migration validated successfully';
END $$;

COMMIT;
