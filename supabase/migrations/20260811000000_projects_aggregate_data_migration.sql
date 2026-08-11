-- Domain: Projects aggregate data migration (HUMAN-EXECUTED)
-- Created: 2026-08-11
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
--   2. Creates the missing tenant table `project_documents` via the
--      canonical provisioning helpers, including RLS policies bound to
--      the resolved entity id.
--   3. Copies rows from public → tenant preserving every UUID, timestamp,
--      ownership field, business field, and relationship, in FK-safe
--      order, idempotently (ON CONFLICT (id) DO NOTHING + full
--      validation after).
--   4. Recreates the `project_financials_v` view in the tenant schema.
--   5. Installs canonical triggers on the tenant tables AFTER the copy
--      so preserved created_by/updated_by ownership metadata is not
--      overwritten by BEFORE INSERT trigger stamping.
--   6. Validates counts, IDs, FK integrity and orphans; RAISES on any
--      mismatch (no silent partial state).
--
-- Post-run operator actions (NOT automated here):
--   - Grant permissions to the production user:
--       SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');
--   - Run the runtime smoke tests listed below.
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

    RAISE NOTICE '=== Projects aggregate data migration for schema % ===', v_schema;

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
    -- 2. CREATE MISSING TENANT TABLE: project_documents
    --    (NOT in the 15-table template; created via provisioning helpers)
    -- ============================================================
    IF to_regclass(v_schema || '.project_documents') IS NULL THEN
        RAISE NOTICE 'Creating tenant table %.project_documents', v_schema;
        PERFORM public._prov_clone_table('public', v_schema, 'project_documents');
        PERFORM public._prov_install_rls(
            v_schema, 'project_documents', v_entity_id, public._prov_table_to_resource('project_documents')
        );
        PERFORM public._prov_readd_foreign_keys('public', v_schema, 'project_documents');
    ELSE
        RAISE NOTICE 'Tenant table %.project_documents already exists — skipping creation', v_schema;
    END IF;

    -- ============================================================
    -- 3. PRESERVED-ID DATA COPY (FK-safe order, idempotent)
    -- ============================================================
    -- Order: projects first (clients already in tenant), then
    -- project_documents (FK to projects).

    FOREACH v_tbl IN ARRAY ARRAY['projects', 'project_documents']
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
    -- 4. RECREATE project_financials_v VIEW IN TENANT SCHEMA
    --    (joins projects, invoices, payments — all now in tenant)
    -- ============================================================
    EXECUTE format(
        'CREATE OR REPLACE VIEW %I.project_financials_v AS
         SELECT
             pr.id AS project_id,
             pr.name AS project_name,
             pr.client_id,
             pr.client_name,
             pr.status,
             count(DISTINCT i.id) AS invoice_count,
             coalesce(sum(i.total), 0) AS total_invoiced,
             coalesce(sum(p_agg.cash_total), 0) AS cash_collected,
             coalesce(sum(p_agg.wht_total), 0) AS wht_collected,
             coalesce(sum(p_agg.cash_total + p_agg.wht_total), 0) AS total_collected,
             coalesce(sum(i.total), 0) - coalesce(sum(p_agg.cash_total + p_agg.wht_total), 0) AS outstanding
         FROM %I.projects pr
         LEFT JOIN %I.invoices i ON i.project_id = pr.id
         LEFT JOIN LATERAL (
             SELECT
                 coalesce(sum(p.cash_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS cash_total,
                 coalesce(sum(p.wht_amount) FILTER (WHERE p.voided_at IS NULL), 0) AS wht_total
             FROM %I.payments p
             WHERE p.invoice_id = i.id
         ) p_agg ON true
         GROUP BY pr.id, pr.name, pr.client_id, pr.client_name, pr.status',
        v_schema, v_schema, v_schema, v_schema
    );
    RAISE NOTICE 'Recreated project_financials_v view in tenant schema';

    -- ============================================================
    -- 5. TRIGGER PARITY (installed AFTER copy so preserved ownership
    --    metadata created_by/updated_by is not overwritten)
    -- ============================================================
    FOREACH v_tbl IN ARRAY ARRAY['projects', 'project_documents']
    LOOP
        PERFORM public._prov_install_triggers('public', v_schema, v_tbl);
    END LOOP;
    RAISE NOTICE 'Canonical triggers installed on tenant project tables';

    -- ============================================================
    -- 6. VALIDATION (fail loudly on any mismatch)
    -- ============================================================

    -- 6.1 Every public project id + project_code preserved in tenant
    EXECUTE format(
        'SELECT count(*) FROM public.projects p
         LEFT JOIN %I.projects t ON t.id = p.id
         WHERE t.id IS NULL OR t.project_code IS DISTINCT FROM p.project_code',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('project id/code mismatch: %s; ', v_mismatch); END IF;

    -- 6.2 No orphan project_documents (project_id missing in tenant projects)
    EXECUTE format(
        'SELECT count(*) FROM %I.project_documents pd
         LEFT JOIN %I.projects p ON p.id = pd.project_id
         WHERE pd.project_id IS NOT NULL AND p.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan project_documents: %s; ', v_mismatch); END IF;

    -- 6.3 No regenerated IDs (compare id sets, not just counts)
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.projects EXCEPT SELECT id FROM %I.projects) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('public project ids missing in tenant: %s; ', v_mismatch); END IF;

    -- 6.4 Existing IDs remain stable across copy (idempotency guard)
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.project_documents EXCEPT SELECT id FROM %I.project_documents) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('public project_document ids missing in tenant: %s; ', v_mismatch); END IF;

    -- 6.5 View exists in tenant schema
    IF to_regclass(v_schema || '.project_financials_v') IS NULL THEN
        v_issues := v_issues || 'project_financials_v view missing in tenant schema; ';
    END IF;

    IF v_issues <> '' THEN
        RAISE EXCEPTION 'Projects aggregate data migration FAILED validation: %', v_issues;
    END IF;

    RAISE NOTICE '=== VALIDATION PASSED — projects aggregate migrated with preserved IDs ===';
    RAISE NOTICE 'REMINDER: grant permissions to the production user via public._prov_seed_default_permissions(entity_id, user_id);';
END;
$do$;