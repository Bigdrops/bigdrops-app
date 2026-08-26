CREATE TEMP TABLE _tenant_counts(name text, kind text, n bigint);
DO $$
DECLARE
  t text;
  c bigint;
  s constant text := 'entity_bigdrops-main_main';
  biz text[] := ARRAY['activity_events','audit_logs','bank_accounts','blank_csr_logs','blank_waybill_logs','boq_rows','boqs','clients','csrs','invoice_items','invoices','item_aliases','item_catalog','item_import_batches','item_merge_log','letters','payments','project_documents','projects','quotation_items','quotations','receipts','rfq_items','rfqs','settings','signatories','tax_filings','tax_input_entries','tax_reminders','tax_settings','waybills','wht_receipts'];
BEGIN
  FOREACH t IN ARRAY biz LOOP
    IF to_regclass(format('%I.%I', s, t)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %I.%I', s, t) INTO c;
      INSERT INTO _tenant_counts VALUES (t, 'table', c);
    ELSE
      INSERT INTO _tenant_counts VALUES (t, 'table', NULL);
    END IF;
  END LOOP;
  INSERT INTO _tenant_counts
  SELECT viewname, 'view', 0 FROM pg_views WHERE schemaname = s AND viewname IN ('invoice_financials_v','project_financials_v','item_price_summary_v');
END $$;
SELECT name, kind, n FROM _tenant_counts ORDER BY kind DESC, name;
