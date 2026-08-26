CREATE TEMP TABLE _public_counts(name text, kind text, rows bigint);
DO $$
DECLARE
  t text;
  n bigint;
  biz text[] := ARRAY['activity_events','audit_logs','bank_accounts','blank_csr_logs','blank_waybill_logs','boq_rows','boqs','clients','csrs','invoice_items','invoices','item_aliases','item_catalog','item_import_batches','item_merge_log','letters','payments','project_documents','projects','quotation_items','quotations','receipts','rfq_items','rfqs','settings','signatories','tax_filings','tax_input_entries','tax_reminders','tax_settings','waybills','wht_receipts'];
  vw text[] := ARRAY['invoice_financials_v','project_financials_v','item_price_summary_v','v_last_invoice_activity','v_last_project_activity','v_last_quotation_activity'];
BEGIN
  FOREACH t IN ARRAY biz LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      INSERT INTO _public_counts VALUES (t, 'table', n);
    ELSE
      INSERT INTO _public_counts VALUES (t, 'table', NULL);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY vw LOOP
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = t) THEN
      INSERT INTO _public_counts VALUES (t, 'view', 0);
    ELSE
      INSERT INTO _public_counts VALUES (t, 'view', NULL);
    END IF;
  END LOOP;
END $$;
SELECT name, kind, rows FROM _public_counts ORDER BY kind DESC, name;
