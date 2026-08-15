-- Plan C — Live entity backfill (root cause B)
-- Created: 2026-08-17
--
-- =====================================================================
-- IMPORTANT — PRODUCTION EXECUTION
-- =====================================================================
-- This migration backfills the confirmed production entity
-- `entity_bigdrops-main_main` with the 11 tables added to the
-- provisioning template by Plan B. The entity was provisioned before
-- those tables existed, so it is missing them.
--
-- This migration was executed by the agent against production via the
-- Supabase Management API query endpoint (project
-- xqlpekpkbszpdgtuwybh). It bypasses the `ready` idempotency
-- short-circuit of provision_entity() on purpose.
--
-- What it does (preserved-ID copy; public data is NEVER deleted):
--   1. Resolves the entity id from public.entities by schema name
--      (no hardcoded UUID).
--   2. Clones the 11 missing tables into `entity_bigdrops-main_main`
--      via the canonical provisioning helpers, installing RLS policies
--      bound to the resolved entity id.
--   3. Grants SELECT, INSERT, UPDATE, DELETE to anon, authenticated
--      and service_role on each cloned table (matches sibling tables).
--   4. Copies rows from public → tenant preserving every UUID,
--      timestamp, ownership field, business field, and relationship,
--      in FK-safe order, idempotently (ON CONFLICT (id) DO NOTHING +
--      full validation after).
--   5. Installs canonical triggers AFTER the copy so preserved
--      created_by/updated_by ownership metadata is not overwritten by
--      BEFORE INSERT trigger stamping.
--   6. Defers the rfq_items → rfqs FK: tenant rfqs has 0 rows while
--      public rfqs has 3, so the cloned FK is dropped before copy and
--      re-added when Plan D migrates rfqs (see waybill precedent,
--      section 3 of 20260810040000).
--   7. Validates counts, IDs, FK integrity and orphans; RAISES on any
--      mismatch (no silent partial state).
--
-- Post-run agent actions (NOT automated here):
--   - Grant permissions to the owner user:
--       SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');
--   - Run the runtime smoke tests listed in the report.
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

    RAISE NOTICE '=== Plan C — live entity backfill for schema % ===', v_schema;

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
    -- 2. CLONE MISSING TENANT TABLES + RLS + GRANTS
    -- ============================================================
    -- Order matters only for FK re-add (referenced table must exist in
    -- target schema); _prov_readd_foreign_keys checks existence.
    FOREACH v_tbl IN ARRAY ARRAY[
        'item_catalog',
        'item_import_batches',
        'item_aliases',
        'item_merge_log',
        'tax_filings',
        'rfq_items',
        'boq_rows',
        'tax_input_entries',
        'tax_reminders',
        'device_sequences',
        'audit_logs'
    ]
    LOOP
        IF to_regclass(v_schema || '.' || v_tbl) IS NULL THEN
            RAISE NOTICE 'Cloning tenant table %.%', v_schema, v_tbl;
            PERFORM public._prov_clone_table('public', v_schema, v_tbl);
            PERFORM public._prov_install_rls(
                v_schema, v_tbl, v_entity_id, public._prov_table_to_resource(v_tbl)
            );
            IF v_tbl = 'rfq_items' THEN
                -- tenant rfqs is empty (public has 3 rows) — see step 6.
                -- Do not re-add the FK yet; Plan D re-adds it after
                -- migrating rfqs.
                RAISE NOTICE 'Deferring FK rfq_items.rfq_id → rfqs until Plan D';
            ELSE
                PERFORM public._prov_readd_foreign_keys('public', v_schema, v_tbl);
            END IF;
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO anon, authenticated, service_role',
                v_schema, v_tbl
            );
        ELSE
            RAISE NOTICE 'Tenant table %.% already exists — skipping creation', v_schema, v_tbl;
        END IF;
    END LOOP;
    RAISE NOTICE 'All 11 tables cloned, RLS installed, grants applied';

    -- ============================================================
    -- 3. PRESERVED-ID DATA COPY (FK-safe order, idempotent)
    -- ============================================================
    FOREACH v_tbl IN ARRAY ARRAY[
        'item_catalog',
        'item_import_batches',
        'item_aliases',
        'item_merge_log',
        'tax_filings',
        'rfq_items',
        'boq_rows',
        'tax_input_entries',
        'tax_reminders',
        'device_sequences',
        'audit_logs'
    ]
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
    -- 4. TRIGGER PARITY (installed AFTER copy so preserved ownership
    --    metadata created_by/updated_by is not overwritten)
    -- ============================================================
    FOREACH v_tbl IN ARRAY ARRAY[
        'item_catalog',
        'item_import_batches',
        'item_aliases',
        'item_merge_log',
        'tax_filings',
        'rfq_items',
        'boq_rows',
        'tax_input_entries',
        'tax_reminders',
        'device_sequences',
        'audit_logs'
    ]
    LOOP
        PERFORM public._prov_install_triggers('public', v_schema, v_tbl);
    END LOOP;
    RAISE NOTICE 'Canonical triggers installed on tenant backfilled tables';

    -- ============================================================
    -- 5. VALIDATION (fail loudly on any mismatch)
    -- ============================================================

    -- 5.1 No regenerated IDs (compare id sets for every cloned table)
    FOREACH v_tbl IN ARRAY ARRAY[
        'item_catalog',
        'item_import_batches',
        'item_aliases',
        'item_merge_log',
        'tax_filings',
        'rfq_items',
        'boq_rows',
        'tax_input_entries',
        'tax_reminders',
        'device_sequences',
        'audit_logs'
    ]
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM (SELECT id FROM public.%I EXCEPT SELECT id FROM %I.%I) x',
            v_tbl, v_schema, v_tbl
        ) INTO v_mismatch;
        IF v_mismatch > 0 THEN
            v_issues := v_issues || format('public %s ids missing in tenant: %s; ', v_tbl, v_mismatch);
        END IF;
    END LOOP;

    -- 5.2 No orphan item_aliases (item_id missing in tenant item_catalog)
    EXECUTE format(
        'SELECT count(*) FROM %I.item_aliases ia
         LEFT JOIN %I.item_catalog ic ON ic.id = ia.item_id
         WHERE ia.item_id IS NOT NULL AND ic.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan item_aliases: %s; ', v_mismatch); END IF;

    -- 5.3 No orphan item_merge_log rows (from/to item or batch missing)
    EXECUTE format(
        'SELECT count(*) FROM %I.item_merge_log ml
         LEFT JOIN %I.item_catalog ic ON ic.id = ml.from_item_id
         WHERE ml.from_item_id IS NOT NULL AND ic.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan item_merge_log.from_item_id: %s; ', v_mismatch); END IF;

    EXECUTE format(
        'SELECT count(*) FROM %I.item_merge_log ml
         LEFT JOIN %I.item_catalog ic ON ic.id = ml.to_item_id
         WHERE ml.to_item_id IS NOT NULL AND ic.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan item_merge_log.to_item_id: %s; ', v_mismatch); END IF;

    -- 5.4 No orphan tax_reminders.linked_filing_id (FK to tenant tax_filings)
    EXECUTE format(
        'SELECT count(*) FROM %I.tax_reminders tr
         LEFT JOIN %I.tax_filings tf ON tf.id = tr.linked_filing_id
         WHERE tr.linked_filing_id IS NOT NULL AND tf.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan tax_reminders.linked_filing_id: %s; ', v_mismatch); END IF;

    -- 5.5 rfq_items FK deferred: every tenant rfq_items.rfq_id must
    --     exist in PUBLIC rfqs (tenant rfqs not migrated until Plan D).
    EXECUTE format(
        'SELECT count(*) FROM %I.rfq_items ri
         LEFT JOIN public.rfqs r ON r.id = ri.rfq_id
         WHERE ri.rfq_id IS NOT NULL AND r.id IS NULL',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan rfq_items (vs public rfqs): %s; ', v_mismatch); END IF;

    IF v_issues <> '' THEN
        RAISE EXCEPTION 'Plan C FAILED validation: %', v_issues;
    END IF;

    RAISE NOTICE '=== VALIDATION PASSED — 11 tables backfilled with preserved IDs ===';
    RAISE NOTICE 'REMINDER: grant permissions to the owner user via public._prov_seed_default_permissions(entity_id, user_id);';
    RAISE NOTICE 'REMINDER: re-add FK entity_bigdrops-main_main.rfq_items.rfq_id → rfqs after Plan D migrates rfqs.';
END;
$do$;
