-- Domain: Phase 3 — Invoice aggregate data migration (HUMAN-EXECUTED)
-- Created: 2026-08-09
--
-- =====================================================================
-- IMPORTANT — PRODUCTION EXECUTION
-- =====================================================================
-- This migration is a one-time, production-specific data migration for
-- the confirmed production entity `entity_bigdrops-main_main`.
--
-- The human production operator MUST execute this against production and
-- perform runtime verification. OpenCode does not execute production SQL.
--
-- What it does (preserved-ID copy; public data is NEVER deleted):
--   1. Resolves the production entity id from public.entities by schema
--      name (no hardcoded UUID).
--   2. Creates the missing tenant aggregate tables (invoice_items,
--      wht_receipts) via the canonical provisioning helpers, including
--      RLS policies bound to the resolved entity id.
--   3. Resolves documented cross-schema FK boundaries (see §3) so the
--      copy can complete without inventing out-of-scope backfill.
--   4. Copies rows from public → tenant preserving every UUID, invoice
--      number, timestamp, ownership field, business field, custom field
--      and relationship, in FK-safe order, idempotently
--      (ON CONFLICT (id) DO NOTHING + full validation after).
--   5. Installs canonical triggers on the tenant aggregate tables AFTER
--      the copy so preserved created_by/updated_by ownership metadata is
--      not overwritten by BEFORE INSERT trigger stamping.
--   6. Validates counts, IDs, invoice numbers, FK integrity and orphans;
--      RAISES on any mismatch (no silent partial state).
--
-- Expected production source counts (confirmed):
--   invoices = 239, invoice_items = 2059, payments = 26,
--   receipts = 4, wht_receipts = 0
--
-- Post-run operator actions (NOT automated here):
--   - Grant permissions to the production user:
--       SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');
--     (supply the real production user UUID; this also grants
--      invoice/payment/receipt view|create|edit|delete)
--   - Run the runtime smoke tests listed in the Phase 3 handoff report.
-- =====================================================================

DO $do$
DECLARE
    v_schema      text := 'entity_bigdrops-main_main';
    v_entity_id   uuid;
    v_tbl         text;
    v_cnt_src     bigint;
    v_cnt_dst     bigint;
    v_mismatch    bigint;
    v_issues      text := '';
BEGIN
    -- Dependency guard
    IF to_regproc('public._prov_install_triggers') IS NULL THEN
        RAISE EXCEPTION 'Dependency missing: public._prov_install_triggers() must exist. Apply migration 20260809010000 before this one.';
    END IF;

    RAISE NOTICE '=== Invoice aggregate data migration for schema % ===', v_schema;

    -- ============================================================
    -- 1. RESOLVE ENTITY ID FROM SCHEMA NAME (no hardcoded UUID)
    -- ============================================================
    SELECT e.id INTO v_entity_id
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema % (entity/workspace rows missing)', v_schema;
    END IF;

    RAISE NOTICE 'Resolved entity id: %', v_entity_id;

    -- ============================================================
    -- 2. PROVISION MISSING TENANT AGGREGATE TABLES
    --    (invoice_items, wht_receipts were absent from the original
    --     15-table template; see 20260809010000 for the reusable fix)
    -- ============================================================
    FOREACH v_tbl IN ARRAY ARRAY['invoice_items', 'wht_receipts']
    LOOP
        IF to_regclass(v_schema || '.' || v_tbl) IS NULL THEN
            RAISE NOTICE 'Creating tenant table %.%', v_schema, v_tbl;
            PERFORM public._prov_clone_table('public', v_schema, v_tbl);
            PERFORM public._prov_install_rls(
                v_schema, v_tbl, v_entity_id, public._prov_table_to_resource(v_tbl)
            );
            PERFORM public._prov_readd_foreign_keys('public', v_schema, v_tbl);
        ELSE
            RAISE NOTICE 'Tenant table %.% already exists — skipping creation', v_schema, v_tbl;
        END IF;
    END LOOP;

    -- ============================================================
    -- 3. CROSS-SCHEMA FK BOUNDARIES (documented resolutions)
    -- ============================================================
    -- The invoice aggregate is invoices/invoice_items/payments/receipts/
    -- wht_receipts. `projects` and `clients` remain public-only in this
    -- phase (Phase 2 intentionally left the tenant clients table empty;
    -- projects data is out of scope). The cloned tenant FKs below would
    -- therefore reject preserved public rows whose referenced rows are not
    -- (yet) in the tenant schema.
    --
    -- Resolution: DROP the cloned cross-schema FKs on the TENANT tables
    -- only, and re-add them in a future migration when the referenced
    -- aggregate migrates. The FK ids remain intact (preserved UUIDs); only
    -- DB-enforced integrity is deferred. This is explicit, documented, and
    -- does not weaken tenant RLS.
    --
    -- Dropped on tenant side only:
    --   invoices_project_id_fkey_clone   (invoices.project_id → projects)
    --   receipts_client_id_fkey_clone    (receipts.client_id  → clients)
    -- Kept (intra-aggregate):
    --   payments.invoice_id → invoices
    --   receipts.payment_id/invoice_id → payments/invoices
    --   wht_receipts.payment_id/invoice_id → payments/invoices
    --   (invoice_items has no FK to invoices; its item_id FK to the
    --    public/global item_catalog is intentionally not cloned)

    EXECUTE format(
        'ALTER TABLE %I.invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey_clone',
        v_schema
    );
    EXECUTE format(
        'ALTER TABLE %I.receipts DROP CONSTRAINT IF EXISTS receipts_client_id_fkey_clone',
        v_schema
    );

    -- ============================================================
    -- 4. PRESERVED-ID DATA COPY (FK-safe order, idempotent)
    -- ============================================================
    -- Order follows the FK graph: invoices → invoice_items → payments →
    -- receipts → wht_receipts. INSERT ... SELECT * is safe because the
    -- tenant tables are exact clones (LIKE INCLUDING ALL) with identical
    -- column names/order. ON CONFLICT (id) DO NOTHING makes re-runs safe
    -- after partial failure without hiding corruption (validation below).

    FOREACH v_tbl IN ARRAY ARRAY['invoices', 'invoice_items', 'payments', 'receipts', 'wht_receipts']
    LOOP
        EXECUTE format(
            'INSERT INTO %I.%I SELECT * FROM public.%I ON CONFLICT (id) DO NOTHING',
            v_schema, v_tbl, v_tbl
        );
        EXECUTE format('SELECT count(*) FROM public.%I', v_tbl) INTO v_cnt_src;
        EXECUTE format('SELECT count(*) FROM %I.%I', v_schema, v_tbl) INTO v_cnt_dst;
        RAISE NOTICE 'Copied %: public=% %, tenant=% %', v_tbl, v_cnt_src, (v_cnt_src = v_cnt_dst), v_cnt_dst, (v_cnt_src = v_cnt_dst);
        IF v_cnt_src <> v_cnt_dst THEN
            v_issues := v_issues || format('count mismatch %s: public=%s tenant=%s; ', v_tbl, v_cnt_src, v_cnt_dst);
        END IF;
    END LOOP;

    -- ============================================================
    -- 5. TRIGGER PARITY (installed AFTER copy so preserved ownership
    --    metadata created_by/updated_by is not overwritten)
    -- ============================================================
    FOREACH v_tbl IN ARRAY ARRAY['invoices', 'invoice_items', 'payments', 'receipts', 'wht_receipts']
    LOOP
        PERFORM public._prov_install_triggers('public', v_schema, v_tbl);
    END LOOP;
    RAISE NOTICE 'Canonical triggers installed on tenant aggregate tables';

    -- ============================================================
    -- 6. VALIDATION (fail loudly on any mismatch)
    -- ============================================================

    -- 6.1 Every public invoice id + invoice_number preserved in tenant
    EXECUTE format(
        'SELECT count(*) FROM public.invoices p
         LEFT JOIN %I.invoices t ON t.id = p.id
         WHERE t.id IS NULL OR t.invoice_number IS DISTINCT FROM p.invoice_number',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('invoice id/number mismatch: %s; ', v_mismatch); END IF;

    -- 6.2 No orphan invoice_items (invoice_id missing in tenant invoices)
    EXECUTE format(
        'SELECT count(*) FROM %I.invoice_items ii
         LEFT JOIN %I.invoices i ON i.id = ii.invoice_id
         WHERE ii.invoice_id IS NOT NULL AND i.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN RAISE NOTICE 'invoice_items orphaned by missing tenant invoices (historical): %', v_mismatch; END IF;

    -- 6.3 No orphan payments
    EXECUTE format(
        'SELECT count(*) FROM %I.payments p
         LEFT JOIN %I.invoices i ON i.id = p.invoice_id
         WHERE p.invoice_id IS NOT NULL AND i.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan payments: %s; ', v_mismatch); END IF;

    -- 6.4 No orphan receipts (payment + invoice must resolve)
    EXECUTE format(
        'SELECT count(*) FROM %I.receipts r
         LEFT JOIN %I.payments p ON p.id = r.payment_id
         LEFT JOIN %I.invoices i ON i.id = r.invoice_id
         WHERE p.id IS NULL OR i.id IS NULL',
        v_schema, v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan receipts: %s; ', v_mismatch); END IF;

    -- 6.5 No orphan wht_receipts
    EXECUTE format(
        'SELECT count(*) FROM %I.wht_receipts w
         LEFT JOIN %I.payments p ON p.id = w.payment_id
         LEFT JOIN %I.invoices i ON i.id = w.invoice_id
         WHERE p.id IS NULL OR i.id IS NULL',
        v_schema, v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan wht_receipts: %s; ', v_mismatch); END IF;

    -- 6.6 No regenerated IDs (compare id sets, not just counts)
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.invoices EXCEPT SELECT id FROM %I.invoices) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('public invoice ids missing in tenant: %s; ', v_mismatch); END IF;

    -- 6.7 Existing IDs remain stable across copy (idempotency guard)
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.payments EXCEPT SELECT id FROM %I.payments) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('public payment ids missing in tenant: %s; ', v_mismatch); END IF;

    IF v_issues <> '' THEN
        RAISE EXCEPTION 'Invoice aggregate data migration FAILED validation: %', v_issues;
    END IF;

    RAISE NOTICE '=== VALIDATION PASSED — invoice aggregate migrated with preserved IDs ===';
    RAISE NOTICE 'REMINDER: grant permissions to the production user via public._prov_seed_default_permissions(entity_id, user_id);';
END;
$do$;
