-- Domain: Tenant Settings — Permanent Entity-Scoped Document Identity Fix
-- Created: 2026-08-10
--
-- =====================================================================
-- IMPORTANT — PRODUCTION EXECUTION
-- =====================================================================
-- This migration is a one-time, production-specific data migration for
-- the confirmed production entity schema `entity_bigdrops-main_main`.
--
-- Precondition: migration 20260810000000 must already be applied.
--
-- This migration:
--   1. Resolves the production entity/workspace from the schema name.
--   2. Verifies public.settings and tenant.settings exist.
--   3. Prints the before-state.
--   4. Performs a guarded, null-preserving backfill.
--   5. Sources company_name from public.entities.display_name.
--   6. Restores configured document_prefixes only when the tenant row
--      still contains the canonical cloned defaults.
--   7. Does NOT copy legacy bank_* settings columns.
--   8. Grants setting permissions to workspace owner(s).
--   9. Prints and validates the after-state.
--
-- This is ONE-TIME remediation.
-- It is NOT a public.settings -> tenant.settings synchronization mechanism.

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

    -- ============================================================
    -- DEPENDENCY GUARD
    -- ============================================================

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n
          ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = '_prov_seed_default_permissions'
    ) THEN
        RAISE EXCEPTION
            'Dependency missing: public._prov_seed_default_permissions(). Apply migration 20260810000000 first.';
    END IF;


    -- ============================================================
    -- 1. RESOLVE ENTITY + WORKSPACE FROM SCHEMA NAME
    -- ============================================================

    SELECT
        e.id,
        e.workspace_id,
        btrim(e.display_name)
    INTO
        v_entity_id,
        v_workspace_id,
        v_display_name
    FROM public.entities e
    JOIN public.workspaces w
      ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION
            'Cannot resolve entity id for schema % (entity/workspace rows missing)',
            v_schema;
    END IF;

    RAISE NOTICE
        'Resolved entity id: %, workspace id: %, display_name: %',
        v_entity_id,
        v_workspace_id,
        v_display_name;


    -- ============================================================
    -- 2. BEFORE-STATE VERIFICATION
    -- ============================================================

    IF NOT EXISTS (
        SELECT 1
        FROM public.settings
        WHERE id = 1
    ) THEN
        RAISE EXCEPTION
            'public.settings row id=1 is missing — nothing to backfill from';
    END IF;


    IF to_regclass(v_schema || '.settings') IS NULL THEN
        RAISE EXCEPTION
            'Tenant schema %.settings does not exist',
            v_schema;
    END IF;


    -- Dynamic-schema existence check.
    --
    -- IMPORTANT:
    -- format('%I.settings', v_schema) returns text and cannot be used
    -- directly as a FROM relation. Dynamic SQL is required here.

    EXECUTE format(
        'SELECT EXISTS (
            SELECT 1
            FROM %I.settings
            WHERE id = 1
        )',
        v_schema
    )
    INTO v_json;

    IF v_json::boolean IS NOT TRUE THEN
        RAISE EXCEPTION
            'Tenant %.settings row id=1 is missing — no row to backfill into',
            v_schema;
    END IF;


    -- ============================================================
    -- PRINT BEFORE STATE
    -- ============================================================

    RAISE NOTICE '--- BEFORE public.settings (id=1) ---';

    EXECUTE
        'SELECT row_to_json(s)::text
         FROM public.settings s
         WHERE id = 1'
    INTO v_json;

    RAISE NOTICE '%', v_json;


    RAISE NOTICE
        '--- BEFORE tenant %.settings (id=1) ---',
        v_schema;

    EXECUTE format(
        'SELECT row_to_json(s)::text
         FROM %I.settings s
         WHERE id = 1',
        v_schema
    )
    INTO v_json;

    RAISE NOTICE '%', v_json;


    -- ============================================================
    -- 3. GUARDED FIELD-BY-FIELD BACKFILL
    --
    -- Only fills NULL/empty/default tenant values.
    -- Existing intentional tenant values are preserved.
    --
    -- company_name comes from public.entities.display_name.
    -- Legacy public.settings.company_name is deliberately ignored.
    --
    -- Legacy bank_* settings fields are deliberately NOT copied.
    -- ============================================================

    EXECUTE format($sql$

        UPDATE %I.settings t
        SET

            -- ----------------------------------------------------
            -- Company identity
            -- ----------------------------------------------------

            company_name = CASE
                WHEN t.company_name IS NULL
                  OR btrim(t.company_name) = ''
                THEN %L::text
                ELSE t.company_name
            END,


            company_tagline = CASE
                WHEN t.company_tagline IS NULL
                  OR btrim(t.company_tagline) = ''
                THEN p.company_tagline
                ELSE t.company_tagline
            END,


            company_address = CASE
                WHEN t.company_address IS NULL
                  OR btrim(t.company_address) = ''
                THEN p.company_address
                ELSE t.company_address
            END,


            company_city = CASE
                WHEN t.company_city IS NULL
                  OR btrim(t.company_city) = ''
                THEN p.company_city
                ELSE t.company_city
            END,


            company_phone = CASE
                WHEN t.company_phone IS NULL
                  OR btrim(t.company_phone) = ''
                THEN p.company_phone
                ELSE t.company_phone
            END,


            company_email = CASE
                WHEN t.company_email IS NULL
                  OR btrim(t.company_email) = ''
                THEN p.company_email
                ELSE t.company_email
            END,


            company_website = CASE
                WHEN t.company_website IS NULL
                  OR btrim(t.company_website) = ''
                THEN p.company_website
                ELSE t.company_website
            END,


            footer_text = CASE
                WHEN t.footer_text IS NULL
                  OR btrim(t.footer_text) = ''
                THEN p.footer_text
                ELSE t.footer_text
            END,


            -- ----------------------------------------------------
            -- Branding
            -- ----------------------------------------------------

            company_logo_url = CASE
                WHEN t.company_logo_url IS NULL
                  OR btrim(t.company_logo_url) = ''
                THEN p.company_logo_url
                ELSE t.company_logo_url
            END,


            signature_url = CASE
                WHEN t.signature_url IS NULL
                  OR btrim(t.signature_url) = ''
                THEN p.signature_url
                ELSE t.signature_url
            END,


            -- ----------------------------------------------------
            -- Custom information / TIN
            --
            -- The tenant default '[]' counts as empty.
            -- ----------------------------------------------------

            custom_info = CASE
                WHEN t.custom_info IS NULL
                  OR btrim(t.custom_info) IN ('', '[]')
                THEN p.custom_info
                ELSE t.custom_info
            END,


            -- ----------------------------------------------------
            -- Theme
            -- ----------------------------------------------------

            app_background_color = CASE
                WHEN t.app_background_color IS NULL
                  OR btrim(t.app_background_color) = ''
                THEN p.app_background_color
                ELSE t.app_background_color
            END,


            app_card_color = CASE
                WHEN t.app_card_color IS NULL
                  OR btrim(t.app_card_color) = ''
                THEN p.app_card_color
                ELSE t.app_card_color
            END,


            app_theme_preset_id = CASE
                WHEN t.app_theme_preset_id IS NULL
                  OR btrim(t.app_theme_preset_id) = ''
                THEN p.app_theme_preset_id
                ELSE t.app_theme_preset_id
            END,


            app_theme_tokens = CASE
                WHEN t.app_theme_tokens IS NULL
                THEN p.app_theme_tokens
                ELSE t.app_theme_tokens
            END,


            -- ----------------------------------------------------
            -- Document prefixes
            --
            -- Restore the legacy configured prefixes ONLY when
            -- the tenant still has the canonical cloned defaults.
            --
            -- This is a one-time restoration for this existing
            -- entity, not an ongoing synchronization mechanism.
            -- ----------------------------------------------------

            document_prefixes = CASE
                WHEN t.document_prefixes IS NULL
                  OR (
                      t.document_prefixes - 'receipt'
                  ) = '{
                      "boq":"BOQ",
                      "csr":"CSR",
                      "rfq":"RFQ",
                      "invoice":"INV",
                      "project":"PRJ",
                      "waybill":"WBL",
                      "quotation":"QTN"
                  }'::jsonb
                THEN p.document_prefixes
                ELSE t.document_prefixes
            END

            -- ----------------------------------------------------
            -- IMPORTANT:
            --
            -- bank_name
            -- bank_account_name
            -- bank_account_number
            -- bank_sort_code
            --
            -- are intentionally NOT copied.
            --
            -- The authoritative bank-account source is:
            -- tenant schema.bank_accounts
            -- ----------------------------------------------------

        FROM public.settings p

        WHERE t.id = 1
          AND p.id = 1

    $sql$, v_schema, v_display_name);


    -- ============================================================
    -- 4. AFTER-STATE VERIFICATION
    -- ============================================================

    RAISE NOTICE
        '--- AFTER tenant %.settings (id=1) ---',
        v_schema;

    EXECUTE format(
        'SELECT row_to_json(s)::text
         FROM %I.settings s
         WHERE id = 1',
        v_schema
    )
    INTO v_json;

    RAISE NOTICE '%', v_json;


    -- ============================================================
    -- REPORT FIELDS STILL EMPTY
    -- ============================================================

    EXECUTE format($sql$

        SELECT string_agg(
            COALESCE(part, ''),
            ', '
        )
        FROM (

            SELECT CASE
                WHEN t.company_name IS NULL
                  OR btrim(t.company_name) = ''
                THEN 'company_name'
            END AS part
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_tagline IS NULL
                  OR btrim(t.company_tagline) = ''
                THEN 'company_tagline'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_address IS NULL
                  OR btrim(t.company_address) = ''
                THEN 'company_address'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_city IS NULL
                  OR btrim(t.company_city) = ''
                THEN 'company_city'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_phone IS NULL
                  OR btrim(t.company_phone) = ''
                THEN 'company_phone'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_email IS NULL
                  OR btrim(t.company_email) = ''
                THEN 'company_email'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_logo_url IS NULL
                  OR btrim(t.company_logo_url) = ''
                THEN 'company_logo_url'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.app_theme_preset_id IS NULL
                THEN 'app_theme_preset_id'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.document_prefixes IS NULL
                THEN 'document_prefixes'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.custom_info IS NULL
                  OR btrim(t.custom_info) IN ('', '[]')
                THEN 'custom_info'
            END
            FROM %I.settings t
            WHERE t.id = 1

        ) x

    $sql$,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema
    )
    INTO v_missing_after;

    RAISE NOTICE
        'Fields still NULL/empty after backfill (legitimate when public was also empty): %',
        COALESCE(v_missing_after, 'NONE');


    -- ============================================================
    -- CORE DOCUMENT IDENTITY VALIDATION
    --
    -- These fields are expected to be populated because the known
    -- production public.settings row contains real values for them.
    -- ============================================================

    EXECUTE format($sql$

        SELECT string_agg(
            COALESCE(part, ''),
            ', '
        )
        FROM (

            SELECT CASE
                WHEN t.company_name IS NULL
                  OR btrim(t.company_name) = ''
                THEN 'company_name'
            END AS part
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_address IS NULL
                  OR btrim(t.company_address) = ''
                THEN 'company_address'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_city IS NULL
                  OR btrim(t.company_city) = ''
                THEN 'company_city'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_phone IS NULL
                  OR btrim(t.company_phone) = ''
                THEN 'company_phone'
            END
            FROM %I.settings t
            WHERE t.id = 1

            UNION ALL

            SELECT CASE
                WHEN t.company_email IS NULL
                  OR btrim(t.company_email) = ''
                THEN 'company_email'
            END
            FROM %I.settings t
            WHERE t.id = 1

        ) x

    $sql$,
        v_schema,
        v_schema,
        v_schema,
        v_schema,
        v_schema
    )
    INTO v_empty_fields;


    IF v_empty_fields <> '' THEN
        RAISE NOTICE
            'WARNING — core identity fields still empty after backfill: %',
            v_empty_fields;
    ELSE
        RAISE NOTICE
            'OK — core document identity fields (name/address/city/phone/email) are populated in tenant settings';
    END IF;


    -- ============================================================
    -- LEGACY BANK COLUMN REPORT
    --
    -- These fields are NOT copied and are NOT authoritative.
    -- Include bank_sort_code in the diagnostic as well.
    -- ============================================================

    EXECUTE format(
        'SELECT count(*)
         FROM %I.settings s
         WHERE s.id = 1
           AND (
               s.bank_name IS NOT NULL
               OR s.bank_account_name IS NOT NULL
               OR s.bank_account_number IS NOT NULL
               OR s.bank_sort_code IS NOT NULL
           )',
        v_schema
    )
    INTO v_json;


    IF v_json <> '0' THEN
        RAISE NOTICE
            'INFO — legacy bank_* columns exist in tenant settings (pre-existing); they are NOT the bank authority. The tenant bank_accounts table is.';
    END IF;


    -- ============================================================
    -- 5. GRANT SETTING PERMISSIONS TO WORKSPACE OWNER(S)
    -- ============================================================

    FOR v_owner IN
        SELECT user_id
        FROM public.workspace_members
        WHERE workspace_id = v_workspace_id
          AND role = 'owner'
    LOOP

        PERFORM public._prov_seed_default_permissions(
            v_entity_id,
            v_owner.user_id
        );

        RAISE NOTICE
            'Granted default permissions (incl. setting view/create/edit/delete) to workspace owner %',
            v_owner.user_id;

    END LOOP;


    -- ============================================================
    -- OPERATOR REMINDER
    -- ============================================================

    RAISE NOTICE
        'REMINDER: grant settings permissions to any OTHER production users via SELECT public._prov_seed_default_permissions(''%'', ''<user_id>'');',
        v_entity_id;


    -- ============================================================
    -- COMPLETE
    -- ============================================================

    RAISE NOTICE
        '=== Tenant settings identity backfill COMPLETE ===';

    RAISE NOTICE
        'NOTE: this was a one-time migration. There is NO public→tenant settings synchronization.';

END;
$do$;