-- Plan D — Final public-only backfill (root cause B closure)
-- Created: 2026-08-22
--
-- =====================================================================
-- IMPORTANT — PRODUCTION EXECUTION
-- =====================================================================
-- This migration performs the final reconciliation pass for the
-- confirmed production entity `entity_bigdrops-main_main`. It
-- backfills the remaining public-only rows (27 rows across 8 tables)
-- that were created after their earlier aggregate migrations ran, and
-- re-adds the cross-schema foreign keys that earlier migrations
-- deferred until all referenced aggregates were migrated.
--
-- Earlier migrations deferred FK re-add explicitly:
--   - 20260809030000 / 20260810010000 (quotation aggregate): dropped
--     quotations.client_id/project_id and quotation_items FKs
--   - 20260810060000 (CSR aggregate): dropped csrs client/project/
--     technician_signatory_id FKs
--   - 20260817000000 (Plan C): deferred rfq_items.rfq_id → rfqs
--     "until Plan D migrates rfqs"
--
-- This IS Plan D. All referenced aggregates are now migrated, so the
-- deferred FKs are re-added via the canonical provisioning helper
-- public._prov_readd_foreign_keys (source of truth: public FKs).
--
-- What it does (preserved-ID copy; public data is NEVER deleted):
--   1. Resolves the entity id from public.entities by schema name
--      (no hardcoded UUID).
--   2. Drops the BEFORE INSERT ownership-stamping trigger on tenant
--      quotations so preserved created_by/updated_by metadata on the
--      copied row is not overwritten.
--   3. Copies public-only rows from public → tenant preserving every
--      UUID, timestamp, ownership field, business field and
--      relationship, in dependency order, idempotently
--      (ON CONFLICT (id) DO NOTHING). Only 8 tables are backfilled;
--      `letters` is deliberately EXCLUDED — its single public row
--      (LTR-000001, id 6787502b) has tenant_id b676c7a8 which matches
--      no entity/workspace and is not the target entity (blocker).
--   4. Re-installs canonical triggers AFTER the copy (quotation
--      ownership stamping restored).
--   5. Re-adds the deferred cross-schema FKs once post-backfill orphan
--      checks pass.
--   6. Validates counts, IDs, orphan integrity and FK re-add; RAISES
--      on any mismatch (no silent partial state).
--
-- Post-run agent actions (NOT automated here):
--   - Grant permissions to the production user:
--       SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');
--   - Confirm `letters` public-only row remains unreconciled and is
--     reported in the migration report as the single blocker.
-- =====================================================================

DO $do$
DECLARE
    v_schema      text := 'entity_bigdrops-main_main';
    v_entity_id   uuid;
    v_tbl         text;
    v_conname     text;
    v_cnt_src     bigint;
    v_cnt_dst     bigint;
    v_mismatch    bigint;
    v_issues      text := '';
BEGIN
    -- Dependency guard
    IF to_regproc('public._prov_install_triggers') IS NULL OR to_regproc('public._prov_readd_foreign_keys') IS NULL THEN
        RAISE EXCEPTION 'Dependency missing: provisioning helpers (_prov_install_triggers, _prov_readd_foreign_keys) must exist. Apply migrations 20260717000000 and 20260809010000 before this one.';
    END IF;

    RAISE NOTICE '=== Plan D — final public-only backfill for schema % ===', v_schema;

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
    -- 2. DROP QUOTATION OWNERSHIP-STAMPING TRIGGER (reinstalled in step 4)
    --    tenant quotations already carries the BEFORE INSERT
    --    trg_quotations_stamp_ownership trigger, which would stamp
    --    created_by/updated_by on the copied row. Drop it before the
    --    copy so preserved ownership is kept; reinstall after.
    -- ============================================================
    EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_quotations_stamp_ownership ON %I.quotations',
        v_schema
    );
    EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_quotations_set_updated_at ON %I.quotations',
        v_schema
    );
    RAISE NOTICE 'Quotation ownership/updated_at triggers dropped for preserved-ID copy';

    -- ============================================================
    -- 3. PRESERVED-ID DATA COPY (dependency order, idempotent)
    -- ============================================================
    -- Dependency order: signatories (referenced by csrs), clients
    -- (referenced by quotations/projects/receipts/waybills),
    -- bank_accounts, quotations (referenced by quotation_items),
    -- quotation_items, csrs, rfqs (referenced by tenant rfq_items),
    -- audit_logs.
    -- `letters` is EXCLUDED: its single public row is unattributable
    -- (tenant_id b676c7a8 matches no entity). It is reported as a
    -- blocker, never silently dropped or invented into tenant.
    -- INSERT ... SELECT * is safe because the tenant tables are exact
    -- column clones (verified). ON CONFLICT (id) DO NOTHING makes
    -- re-runs safe without hiding corruption (validation below).
    FOREACH v_tbl IN ARRAY ARRAY[
        'signatories',
        'clients',
        'bank_accounts',
        'quotations',
        'quotation_items',
        'csrs',
        'rfqs',
        'audit_logs'
    ]
    LOOP
        EXECUTE format(
            'INSERT INTO %I.%I SELECT * FROM public.%I ON CONFLICT (id) DO NOTHING',
            v_schema, v_tbl, v_tbl
        );
        EXECUTE format('SELECT count(*) FROM public.%I', v_tbl) INTO v_cnt_src;
        EXECUTE format('SELECT count(*) FROM %I.%I', v_schema, v_tbl) INTO v_cnt_dst;
        RAISE NOTICE 'Copied %: public=% tenant=%', v_tbl, v_cnt_src, v_cnt_dst;
    END LOOP;

    -- ============================================================
    -- 4. TRIGGER PARITY (installed AFTER copy so preserved ownership
    --    metadata created_by/updated_by is not overwritten)
    -- ============================================================
    FOREACH v_tbl IN ARRAY ARRAY[
        'signatories',
        'clients',
        'bank_accounts',
        'quotations',
        'quotation_items',
        'csrs',
        'rfqs',
        'audit_logs'
    ]
    LOOP
        PERFORM public._prov_install_triggers('public', v_schema, v_tbl);
    END LOOP;
    RAISE NOTICE 'Canonical triggers reinstalled on tenant backfilled tables';

    -- ============================================================
    -- 5. VALIDATION BEFORE FK RE-ADD (fail loudly on any mismatch)
    -- ============================================================

    -- 5.1 Every public id in the 8 backfill tables is now in tenant
    FOREACH v_tbl IN ARRAY ARRAY[
        'signatories',
        'clients',
        'bank_accounts',
        'quotations',
        'quotation_items',
        'csrs',
        'rfqs',
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

    -- 5.2 No orphan csrs.technician_signatory_id (7 tenant csrs reference
    --     the backfilled signatory d6c47e31)
    EXECUTE format(
        'SELECT count(*) FROM %I.csrs c
         LEFT JOIN %I.signatories s ON s.id = c.technician_signatory_id
         WHERE c.technician_signatory_id IS NOT NULL AND s.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan csrs.technician_signatory_id: %s; ', v_mismatch); END IF;

    -- 5.3 No orphan rfq_items.rfq_id (54 tenant rfq_items reference the
    --     backfilled rfqs 579f5f0c / 82d509b1)
    EXECUTE format(
        'SELECT count(*) FROM %I.rfq_items ri
         LEFT JOIN %I.rfqs r ON r.id = ri.rfq_id
         WHERE ri.rfq_id IS NOT NULL AND r.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('orphan rfq_items.rfq_id: %s; ', v_mismatch); END IF;

    IF v_issues <> '' THEN
        RAISE EXCEPTION 'Plan D FAILED validation before FK re-add: %', v_issues;
    END IF;

    -- ============================================================
    -- 6. RE-ADD DEFERRED CROSS-SCHEMA FKS
    -- ============================================================
    -- Every referenced aggregate is now migrated into tenant. Re-add
    -- the deferred FKs via the canonical helper (public = source of
    -- truth for FK definitions; helper adds <name>_clone constraints
    -- pointing at tenant tables). projects_client_id_fkey_clone already
    -- exists, so `projects` is skipped.
    -- Idempotent re-run: drop any existing _clone FK first.
    FOREACH v_tbl IN ARRAY ARRAY[
        'csrs',
        'invoice_items',
        'invoices',
        'payments',
        'quotation_items',
        'quotations',
        'receipts',
        'rfq_items',
        'waybills'
    ]
    LOOP
        -- Drop any previously-added _clone FK constraints on this table
        FOR v_conname IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = (v_schema || '.' || v_tbl)::regclass
              AND contype = 'f'
              AND right(conname, 6) = '_clone'
        LOOP
            EXECUTE format(
                'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
                v_schema, v_tbl, v_conname
            );
        END LOOP;
        PERFORM public._prov_readd_foreign_keys('public', v_schema, v_tbl);
        RAISE NOTICE 'Re-added deferred FKs on tenant %', v_tbl;
    END LOOP;

    -- ============================================================
    -- 7. FINAL VALIDATION (FK re-add is the strongest integrity check:
    --    ALTER TABLE ... ADD CONSTRAINT fails loudly on orphans)
    -- ============================================================

    -- 7.1 Confirm no orphan references remain on every re-added FK
    EXECUTE format(
        'SELECT count(*) FROM %I.csrs c
         LEFT JOIN %I.signatories s ON s.id = c.technician_signatory_id
         WHERE c.technician_signatory_id IS NOT NULL AND s.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('post-FK orphan csrs.technician_signatory_id: %s; ', v_mismatch); END IF;

    EXECUTE format(
        'SELECT count(*) FROM %I.rfq_items ri
         LEFT JOIN %I.rfqs r ON r.id = ri.rfq_id
         WHERE ri.rfq_id IS NOT NULL AND r.id IS NULL',
        v_schema, v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN v_issues := v_issues || format('post-FK orphan rfq_items.rfq_id: %s; ', v_mismatch); END IF;

    -- 7.2 `letters` remains the only unresolved public-only table
    EXECUTE format(
        'SELECT count(*) FROM (SELECT id FROM public.letters EXCEPT SELECT id FROM %I.letters) x',
        v_schema
    ) INTO v_mismatch;
    IF v_mismatch > 0 THEN
        RAISE NOTICE 'letters public-only rows remaining (expected blocker): %', v_mismatch;
    END IF;

    IF v_issues <> '' THEN
        RAISE EXCEPTION 'Plan D FAILED final validation: %', v_issues;
    END IF;

    RAISE NOTICE '=== VALIDATION PASSED — Plan D backfill complete with preserved IDs and restored FKs ===';
    RAISE NOTICE 'REMINDER: grant permissions to the production user via public._prov_seed_default_permissions(entity_id, user_id);';
    RAISE NOTICE 'REMINDER: report the letters public-only row (6787502b) as the single ownership blocker.';
END;
$do$;