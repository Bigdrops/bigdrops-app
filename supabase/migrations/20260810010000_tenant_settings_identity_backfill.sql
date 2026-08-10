-- Domain: Tenant Settings — Permanent Entity-Scoped Document Identity Fix
-- Created: 2026-08-10
--
-- =====================================================================
-- IMPORTANT — PRODUCTION EXECUTION
-- =====================================================================
-- This migration is a one-time, production-specific data migration for
-- the confirmed production entity schema `entity_bigdrops-main_main`.
--
-- The human production operator MUST execute this against production and
-- perform runtime verification. OpenCode does not execute production SQL.
--
-- Precondition: migration 20260810000000 (default permission seeder
-- extended with the 'setting' resource) MUST be applied first.
--
-- What it does (guarded, null-preserving, one-time):
--   1. Resolves the production entity id + workspace from public.entities /
--      public.workspaces by schema name (no hardcoded UUID).
--   2. Verifies the before-state: BOTH the legacy public.settings row (id=1)
--      and the tenant settings row (id=1) must exist, and prints both.
--   3. Backfills the tenant settings row field-by-field from public.settings
--      ONLY where the tenant value is NULL/empty/default. Non-null tenant
--      values are preserved (intentional overrides).
--   4. company_name is sourced from public.entities.display_name (trimmed),
--      never from public.settings.company_name (which carries a trailing
--      space). It is only written when the tenant value is NULL/empty.
--   5. document_prefixes is restored from public.settings for THIS existing
--      entity only when the tenant value is still the cloned default (the
--      canonical DEFAULT_PREFIXES set). It is never re-copied afterwards.
--   6. Legacy bank_* columns (bank_name, bank_account_name,
--      bank_account_number, bank_sort_code) are NEVER copied — the tenant
--      bank_accounts table is the bank-account authority.
--   7. Grants ('setting', view/create/edit/delete) to the workspace
--      owner(s) of the entity's workspace via _prov_seed_default_permissions
--      so the Settings UI write path (tenantClient) is authorized. The
--      operator must additionally grant to any other production users who
--      should manage entity settings.
--   8. Prints the after-state and validates that the backfill actually
--      populated the expected identity fields.
--
-- This migration is ONE-TIME. It is NOT a synchronization mechanism. No
-- trigger, job, or function keeps public.settings in sync with tenant
-- settings. public.settings remains a deprecated legacy table.

DO $do$
DECLARE
    v_schema            text := 'entity_bigdrops-main_main';
    v_entity_id         uuid;
    v_workspace_id      uuid;
    v_display_name      text;
    v_owner             record;
    v_json              text;
    v_empty_fields      text := '';
    v_missing_after     text := '';
BEGIN
    -- Dependency guard: the extended seeder must exist before the grant below.
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = '_prov_seed_default_permissions'
    ) THEN
        RAISE EXCEPTION 'Dependency missing: public._prov_seed_default_permissions(). Apply migration 20260810000000 first.';
    END IF;

    -- ============================================================
    -- 1. RESOLVE ENTITY + WORKSPACE FROM SCHEMA NAME
    -- ============================================================
    SELECT e.id, e.workspace_id, btrim(e.display_name)
    INTO v_entity_id, v_workspace_id, v_display_name
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema % (entity/workspace rows missing)', v_schema;
    END IF;
    RAISE NOTICE 'Resolved entity id: %, workspace id: %, display_name: %', v_entity_id, v_workspace_id, v_display_name;

    -- ============================================================
    -- 2. BEFORE-STATE VERIFICATION (both rows must exist)
    -- ============================================================
    IF NOT EXISTS (SELECT 1 FROM public.settings WHERE id = 1) THEN
        RAISE EXCEPTION 'public.settings row id=1 is missing — nothing to backfill from';
    END IF;
    IF to_regclass(v_schema || '.settings') IS NULL THEN
        RAISE EXCEPTION 'Tenant schema %.settings does not exist', v_schema;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM format('%I.settings', v_schema) s WHERE s.id = 1) THEN
        RAISE EXCEPTION 'Tenant %.settings row id=1 is missing — no row to backfill into', v_schema;
    END IF;

    RAISE NOTICE '--- BEFORE public.settings (id=1) ---';
    EXECUTE 'SELECT row_to_json(s)::text FROM public.settings s WHERE id = 1' INTO v_json;
    RAISE NOTICE '%', v_json;
    RAISE NOTICE '--- BEFORE tenant %.settings (id=1) ---', v_schema;
    EXECUTE format('SELECT row_to_json(s)::text FROM %I.settings s WHERE id = 1', v_schema) INTO v_json;
    RAISE NOTICE '%', v_json;

    -- ============================================================
    -- 3. GUARDED FIELD-BY-FIELD BACKFILL
    --    Fills only NULL/empty/default tenant fields from public.settings.
    --    Preserves non-null tenant values. Skips legacy bank_* columns.
    --    company_name comes from entities.display_name (trimmed).
    -- ============================================================
    EXECUTE format($sql$
        UPDATE %I.settings t
        SET
            -- Company identity: from entities.display_name (authoritative),
            -- never from public.settings.company_name (trailing-space legacy).
            company_name = CASE
                WHEN t.company_name IS NULL OR btrim(t.company_name) = ''
                THEN %L::text
                ELSE t.company_name
            END,
            company_tagline = CASE
                WHEN t.company_tagline IS NULL OR btrim(t.company_tagline) = '' THEN p.company_tagline
                ELSE t.company_tagline
            END,
            company_address = CASE
                WHEN t.company_address IS NULL OR btrim(t.company_address) = '' THEN p.company_address
                ELSE t.company_address
            END,
            company_city = CASE
                WHEN t.company_city IS NULL OR btrim(t.company_city) = '' THEN p.company_city
                ELSE t.company_city
            END,
            company_phone = CASE
                WHEN t.company_phone IS NULL OR btrim(t.company_phone) = '' THEN p.company_phone
                ELSE t.company_phone
            END,
            company_email = CASE
                WHEN t.company_email IS NULL OR btrim(t.company_email) = '' THEN p.company_email
                ELSE t.company_email
            END,
            company_website = CASE
                WHEN t.company_website IS NULL OR btrim(t.company_website) = '' THEN p.company_website
                ELSE t.company_website
            END,
            footer_text = CASE
                WHEN t.footer_text IS NULL OR btrim(t.footer_text) = '' THEN p.footer_text
                ELSE t.footer_text
            END,
            company_logo_url = CASE
                WHEN t.company_logo_url IS NULL OR btrim(t.company_logo_url) = '' THEN p.company_logo_url
                ELSE t.company_logo_url
            END,
            signature_url = CASE
                WHEN t.signature_url IS NULL OR btrim(t.signature_url) = '' THEN p.signature_url
                ELSE t.signature_url
            END,
            -- custom_info (TIN etc.): default '[]' counts as empty
            custom_info = CASE
                WHEN t.custom_info IS NULL OR btrim(t.custom_info) IN ('', '[]') THEN p.custom_info
                ELSE t.custom_info
            END,
            -- Theme fields
            app_background_color = CASE
                WHEN t.app_background_color IS NULL OR btrim(t.app_background_color) = '' THEN p.app_background_color
                ELSE t.app_background_color
            END,
            app_card_color = CASE
                WHEN t.app_card_color IS NULL OR btrim(t.app_card_color) = '' THEN p.app_card_color
                ELSE t.app_card_color
            END,
            app_theme_preset_id = CASE
                WHEN t.app_theme_preset_id IS NULL OR btrim(t.app_theme_preset_id) = '' THEN p.app_theme_preset_id
                ELSE t.app_theme_preset_id
            END,
            app_theme_tokens = CASE
                WHEN t.app_theme_tokens IS NULL THEN p.app_theme_tokens
                ELSE t.app_theme_tokens
            END,
            -- document_prefixes: restore the user's configured prefixes ONLY
            -- when the tenant still holds the cloned canonical default set.
            document_prefixes = CASE
                WHEN t.document_prefixes IS NULL
                  OR (t.document_prefixes - 'receipt') = '{"boq":"BOQ","csr":"CSR","rfq":"RFQ","invoice":"INV","project":"PRJ","waybill":"WBL","quotation":"QTN"}'::jsonb
                THEN p.document_prefixes
                ELSE t.document_prefixes
            END
            -- NOTE: bank_name, bank_account_name, bank_account_number,
            --       bank_sort_code are intentionally NOT backfilled.
        FROM public.settings p
        WHERE t.id = 1 AND p.id = 1
    $sql$, v_schema, v_display_name);

    -- ============================================================
    -- 4. AFTER-STATE VERIFICATION
    -- ============================================================
    RAISE NOTICE '--- AFTER tenant %.settings (id=1) ---', v_schema;
    EXECUTE format('SELECT row_to_json(s)::text FROM %I.settings s WHERE id = 1', v_schema) INTO v_json;
    RAISE NOTICE '%', v_json;

    -- Detect identity fields that are still empty after the backfill
    -- (legitimate when the legacy public.settings value was also NULL/empty).
    EXECUTE format($sql$
        SELECT string_agg(COALESCE(part, ''), ', ') FROM (
            SELECT CASE WHEN t.company_name IS NULL OR btrim(t.company_name) = '' THEN 'company_name' END AS part FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_tagline IS NULL OR btrim(t.company_tagline) = '' THEN 'company_tagline' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_address IS NULL OR btrim(t.company_address) = '' THEN 'company_address' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_city IS NULL OR btrim(t.company_city) = '' THEN 'company_city' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_phone IS NULL OR btrim(t.company_phone) = '' THEN 'company_phone' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_email IS NULL OR btrim(t.company_email) = '' THEN 'company_email' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_logo_url IS NULL OR btrim(t.company_logo_url) = '' THEN 'company_logo_url' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.app_theme_preset_id IS NULL THEN 'app_theme_preset_id' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.document_prefixes IS NULL THEN 'document_prefixes' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.custom_info IS NULL OR btrim(t.custom_info) IN ('', '[]') THEN 'custom_info' END FROM %I.settings t WHERE t.id = 1
        ) x
    $sql$, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema)
    INTO v_missing_after;
    RAISE NOTICE 'Fields still NULL/empty after backfill (legit when public was also empty): %', COALESCE(v_missing_after, 'NONE');

    -- The five core document-identity fields MUST be present after backfill
    -- because the legacy public row held real values for all of them.
    EXECUTE format($sql$
        SELECT string_agg(COALESCE(part, ''), ', ') FROM (
            SELECT CASE WHEN t.company_name IS NULL OR btrim(t.company_name) = '' THEN 'company_name' END AS part FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_address IS NULL OR btrim(t.company_address) = '' THEN 'company_address' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_city IS NULL OR btrim(t.company_city) = '' THEN 'company_city' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_phone IS NULL OR btrim(t.company_phone) = '' THEN 'company_phone' END FROM %I.settings t WHERE t.id = 1
            UNION ALL SELECT CASE WHEN t.company_email IS NULL OR btrim(t.company_email) = '' THEN 'company_email' END FROM %I.settings t WHERE t.id = 1
        ) x
    $sql$, v_schema, v_schema, v_schema, v_schema, v_schema) INTO v_empty_fields;
    IF v_empty_fields <> '' THEN
        RAISE NOTICE 'WARNING — core identity fields still empty after backfill: %', v_empty_fields;
    ELSE
        RAISE NOTICE 'OK — core document identity fields (name/address/city/phone/email) are populated in tenant settings';
    END IF;

    -- Report (not fail) if legacy bank_* values exist in the tenant row.
    EXECUTE format('SELECT count(*) FROM %I.settings s WHERE s.id = 1 AND (s.bank_name IS NOT NULL OR s.bank_account_name IS NOT NULL OR s.bank_account_number IS NOT NULL)', v_schema)
    INTO v_json;
    IF v_json <> '0' THEN
        RAISE NOTICE 'INFO — legacy bank_* columns exist in tenant settings (pre-existing); they are NOT the bank authority. The tenant bank_accounts table is.';
    END IF;

    -- ============================================================
    -- 5. GRANT SETTING PERMISSIONS TO THE WORKSPACE OWNER(S)
    -- ============================================================
    FOR v_owner IN
        SELECT user_id FROM public.workspace_members
        WHERE workspace_id = v_workspace_id AND role = 'owner'
    LOOP
        PERFORM public._prov_seed_default_permissions(v_entity_id, v_owner.user_id);
        RAISE NOTICE 'Granted default permissions (incl. setting view/create/edit/delete) to workspace owner %', v_owner.user_id;
    END LOOP;

    RAISE NOTICE 'REMINDER: grant settings permissions to any OTHER production users via SELECT public._prov_seed_default_permissions(''%'', ''<user_id>'');', v_entity_id;
    RAISE NOTICE '=== Tenant settings identity backfill COMPLETE ===';
    RAISE NOTICE 'NOTE: this was a one-time migration. There is NO public→tenant settings synchronization.';
END;
$do$;
