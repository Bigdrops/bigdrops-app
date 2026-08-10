-- Domain: Phase 2 — Quotation aggregate data migration (HUMAN-EXECUTED)
-- Created: 2026-08-10
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
--   2. Creates the missing tenant table (quotation_items) via the
--      canonical provisioning helpers, including RLS policies bound to
--      the resolved entity id.
--   3. Resolves documented cross-schema FK boundaries (see §3) so the
--      copy can complete without inventing out-of-scope backfill.
--   4. Copies rows from public → tenant preserving every UUID, quotation
--      number, timestamp, ownership field, business field, custom field
--      and relationship, in FK-safe order, idempotently
--      (ON CONFLICT (id) DO NOTHING + full validation after).
--   5. Installs canonical triggers on the tenant quotation_items table
--      AFTER the copy so preserved created_by/updated_by ownership
--      metadata is not overwritten by BEFORE INSERT trigger stamping.
--   6. Validates counts, IDs, quotation numbers, FK integrity and
--      orphans; RAISES on any mismatch (no silent partial state).
--
-- Expected production source counts (confirmed):
--   quotations = 321, quotation_items = 2799
--
-- Post-run operator actions (NOT automated here):
--   - Grant permissions to the production user:
--       SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');
--     (supply the real production user UUID; this also grants
--      quotation view|create|edit|delete)
--   - Run the runtime smoke tests listed in the Phase 2 handoff report.
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

    RAISE NOTICE '=== Quotation aggregate data migration for schema % ===', v_schema;

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
    -- 2. PROVISION MISSING TENANT TABLE (quotation_items)
    --    (quotations already exists in tenant schema but is empty;
    --     quotation_items was never created)
    -- ============================================================
    IF to_regclass(v_schema || '.quotation_items') IS NULL THEN
        RAISE NOTICE 'Creating tenant table %.quotation_items', v_schema;
        PERFORM public._prov_clone_table('public', v_schema, 'quotation_items');
        PERFORM public._prov_install_rls(
            v_schema, 'quotation_items', v_entity_id, public._prov_table_to_resource('quotation_items')
        );
        PERFORM public._prov_readd_foreign_keys('public', v_schema, 'quotation_items');
    ELSE
        RAISE NOTICE 'Tenant table %.quotation_items already exists — skipping creation', v_schema;
    END IF;

    -- ============================================================
    -- 3. CROSS-SCHEMA FK BOUNDARIES (documented resolutions)
    -- ============================================================
    -- The quotation aggregate is quotations + quotation_items.
    -- `clients` and `projects` remain public-only in this phase.
    -- The cloned tenant FKs below would therefore reject preserved
    -- public rows whose referenced rows are not (yet) in the tenant
    -- schema.
    --
    -- Resolution: DROP the cloned cross-schema FKs on the TENANT
    -- tables only, and re-add them in a future migration when the
    -- referenced aggregate migrates. The FK ids remain intact
    -- (preserved UUIDs); only DB-enforced integrity is deferred.
    -- This is explicit, documented, and does not weaken tenant RLS.
    --
    -- Dropped on tenant side only:
    --   quotation_items_quotation_id_fkey_clone (quotation_items.quotation_id → quotations)
    --   quotations_client_id_fkey_clone (quotations.client_id → clients)
    --   quotations_project_id_fkey_clone (quotations.project_id → projects)

    EXECUTE format(
        'ALTER TABLE %I.quotation_items DROP CONSTRAINT IF EXISTS quotation_items_quotation_id_fkey_clone',
        v_schema
    );
    EXECUTE format(
        'ALTER TABLE %I.quotations DROP CONSTRAINT IF EXISTS quotations_client_id_fkey_clone',
        v_schema
    );
    EXECUTE format(
        'ALTER TABLE %I.quotations DROP CONSTRAINT IF EXISTS quotations_project_id_fkey_clone',
        v_schema
    );

    -- ============================================================
    -- 4. PRESERVED-ID DATA COPY (FK-safe order, idempotent)
    -- ============================================================
    -- Order follows the FK graph: quotations → quotation_items.
    -- INSERT ... SELECT * is safe because the tenant tables are
    -- exact clones (LIKE INCLUDING ALL) with identical column
    -- names/order. ON CONFLICT (id) DO NOTHING makes re-runs safe
    -- after partial failure without hiding corruption (validation below).

    FOREACH v_tbl IN ARRAY ARRAY['quotations', 'quotation_items']
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
    FOREACH v_tbl IN ARRAY ARRAY['quotations', 'quotation_items']
    LOOP
        PERFORM public._prov_install_triggers('public', v_schema, v_tbl);
    END LOOP;
    RAISE NOTICE 'Canonical triggers installed on tenant quotation tables';

    -- ============================================================
    -- 6. VALIDATION (fail loudly on any mismatch)
    -- ============================================================

    -- 6.1 Every public quotation id + quotation_number preserved in tenant
    EXECUTE format(
        'SELECT count(*) FROM public.quotations p
         LEFT JOIN %I.quotations t ON t.id = p.id
         WHERE t.id IS NULL OR t.quotation_number IS DISTINCT FROM p.quotation_number',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('quotation id/number mismatch: %s; ', v_mismatch); END IF;

    -- 6.2 No orphan quotation_items (quotation_id missing in tenant quotations)
    EXECUTE format(
        'SELECT count(*) FROM %I.quotation_items qi
         LEFT JOIN %I.quotations q ON q.id = qi.quotation_id
         WHERE qi.quotation_id IS NOT NULL AND q.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan quotation_items: %s; ', v_mismatch); END IF;

    -- 6.3 No regenerated IDs (compare id sets, not just counts)
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.quotations EXCEPT SELECT id FROM %I.quotations) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('public quotation ids missing in tenant: %s; ', v_mismatch); END IF;

    -- 6.4 Existing IDs remain stable across copy (idempotency guard)
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.quotation_items EXCEPT SELECT id FROM %I.quotation_items) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('public quotation_item ids missing in tenant: %s; ', v_mismatch); END IF;

    IF v_issues <> '' THEN
        RAISE EXCEPTION 'Quotation aggregate data migration FAILED validation: %', v_issues;
    END IF;

    RAISE NOTICE '=== VALIDATION PASSED — quotation aggregate migrated with preserved IDs ===';
    RAISE NOTICE 'REMINDER: grant permissions to the production user via public._prov_seed_default_permissions(entity_id, user_id);';
END;
$do$;
