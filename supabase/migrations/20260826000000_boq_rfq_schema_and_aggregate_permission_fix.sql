-- Domain: CSR / RFQ / BOQ / Project / Client — Permission Backfill,
--          Tenant Grants, and BOQ/RFQ Schema Alignment
-- Created: 2026-08-26
--
-- =====================================================================
-- PURPOSE
-- =====================================================================
-- The production entity entity_bigdrops-main_main has NO permission
-- rows for the 'csr', 'rfq', 'boq', 'project', or 'client' resources.
-- The default permission seeder _prov_seed_default_permissions()
-- grants only invoice/payment/receipt/setting/quotation/rfq/boq/item/
-- tax_setting/audit/device. As a result:
--
--   - Creating a CSR/RFQ/Project/Client fails with "new row violates
--     row-level security policy" — the tenant RLS policy (resource
--     '<res>', action 'create') rejects every insert for the workspace
--     members.
--   - The RFQ list and BOQ list return 0 rows or fail: rfqsAdapter and
--     boqsAdapter select columns (client_name/status/project_id/total/
--     boq_number/issue_date) that do not exist on the tenant or public
--     tables, and the 'rfq'/'boq' permission rows are missing anyway.
--   - BOQ save is localStorage-only (split-brain with the DB list).
--
-- This migration:
--   1. Backfills 'csr'/'rfq'/'boq'/'project'/'client' view/create/
--      edit/delete permission rows for every user who already holds a
--      permission on the live entity (covers owner and invited
--      members), mirroring the waybill fix 20260819000001.
--   2. Grants SELECT/INSERT/UPDATE/DELETE on the tenant csrs,
--      blank_csr_logs, rfqs, rfq_items, boqs, boq_rows, projects,
--      project_documents and clients tables to anon, authenticated,
--      service_role, mirroring plan-c (20260817000000).
--   3. Adds the columns the list adapters, views and actions expect to
--      BOTH the public template tables and the live tenant schema
--      tables (boqs, rfqs). The tenant tables are LIKE-clones of the
--      public templates, so both must be altered together or the
--      tenant SELECT still fails. Existing rows keep their values;
--      new columns default safely.
--
-- Idempotent (ON CONFLICT DO NOTHING; GRANT and ADD COLUMN IF NOT
-- EXISTS are idempotent). Safe to re-run.
-- =====================================================================

-- ============================================================
-- 1. BACKFILL PERMISSION ROWS (csr, rfq, boq, project, client)
-- ============================================================

DO $do$
DECLARE
    v_schema    text := 'entity_bigdrops-main_main';
    v_entity_id uuid;
BEGIN

    -- Resolve the production entity from the schema name (no hardcoded UUIDs).
    SELECT
        e.id
    INTO
        v_entity_id
    FROM public.entities e
    JOIN public.workspaces w
      ON w.id = e.workspace_id
    WHERE 'entity_' || w.slug || '_' || e.slug = v_schema
    LIMIT 1;

    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve entity id for schema %', v_schema;
    END IF;

    -- Grant the five resources to every user that already holds a
    -- permission on this entity. Membership is signalled by holding at
    -- least one entity permission, so this covers the owner and all
    -- invited members without inventing a new membership model.
    INSERT INTO public.entity_permissions (entity_id, user_id, resource, action)
    SELECT
        v_entity_id,
        m.user_id,
        r.resource,
        a.action
    FROM (
        SELECT DISTINCT user_id
        FROM public.entity_permissions
        WHERE entity_id = v_entity_id
    ) AS m
    CROSS JOIN (
        VALUES ('csr'), ('rfq'), ('boq'), ('project'), ('client')
    ) AS r(resource)
    CROSS JOIN (
        VALUES ('view'), ('create'), ('edit'), ('delete')
    ) AS a(action)
    ON CONFLICT (entity_id, user_id, resource, action) DO NOTHING;

    RAISE NOTICE
        'Backfilled csr/rfq/boq/project/client permissions for entity % (schema %)',
        v_entity_id, v_schema;

END;
$do$;

-- ============================================================
-- 2. TENANT TABLE GRANTS (mirror plan-c 20260817000000)
-- ============================================================

DO $do$
DECLARE
    v_schema text := 'entity_bigdrops-main_main';
    v_tbl    text;
BEGIN
    FOREACH v_tbl IN ARRAY ARRAY[
        'csrs',
        'blank_csr_logs',
        'rfqs',
        'rfq_items',
        'boqs',
        'boq_rows',
        'projects',
        'project_documents',
        'clients'
    ]
    LOOP
        IF to_regclass(v_schema || '.' || v_tbl) IS NOT NULL THEN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO anon, authenticated, service_role',
                v_schema, v_tbl
            );
            RAISE NOTICE 'Granted access on tenant %.%', v_schema, v_tbl;
        ELSE
            RAISE NOTICE 'Skipping grants: tenant table %.% does not exist', v_schema, v_tbl;
        END IF;
    END LOOP;
END;
$do$;

-- ============================================================
-- 3. BOQ SCHEMA ALIGNMENT (public template + live tenant)
-- ============================================================
-- boqsAdapter selects id, boq_number, client_name, created_at, status,
-- project_id, title, total. viewBOQActions reads/writes boq_number,
-- status, issue_date. ArchivesSettingsSection selects issue_date.
-- useDashboardData reads vendor_name. The Boq domain type carries
-- vendor_name, vendor_contact, design palette and notes, all of which
-- are persisted as columns (mirroring the rfqs template) or in
-- custom_fields. These columns are added here.

ALTER TABLE public.boqs
    ADD COLUMN IF NOT EXISTS boq_number text,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS project_id uuid,
    ADD COLUMN IF NOT EXISTS total numeric,
    ADD COLUMN IF NOT EXISTS issue_date date,
    ADD COLUMN IF NOT EXISTS vendor_name text,
    ADD COLUMN IF NOT EXISTS vendor_contact text,
    ADD COLUMN IF NOT EXISTS show_brand_name boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS brand_name_override text,
    ADD COLUMN IF NOT EXISTS background_primary text,
    ADD COLUMN IF NOT EXISTS background_secondary text,
    ADD COLUMN IF NOT EXISTS palette_name text,
    ADD COLUMN IF NOT EXISTS text_color text,
    ADD COLUMN IF NOT EXISTS accent_color text,
    ADD COLUMN IF NOT EXISTS notes text;

DO $do$
DECLARE
    v_schema text := 'entity_bigdrops-main_main';
BEGIN
    IF to_regclass(v_schema || '.boqs') IS NOT NULL THEN
        EXECUTE format($f$
            ALTER TABLE %I.boqs
                ADD COLUMN IF NOT EXISTS boq_number text,
                ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
                ADD COLUMN IF NOT EXISTS project_id uuid,
                ADD COLUMN IF NOT EXISTS total numeric,
                ADD COLUMN IF NOT EXISTS issue_date date,
                ADD COLUMN IF NOT EXISTS vendor_name text,
                ADD COLUMN IF NOT EXISTS vendor_contact text,
                ADD COLUMN IF NOT EXISTS show_brand_name boolean DEFAULT false,
                ADD COLUMN IF NOT EXISTS brand_name_override text,
                ADD COLUMN IF NOT EXISTS background_primary text,
                ADD COLUMN IF NOT EXISTS background_secondary text,
                ADD COLUMN IF NOT EXISTS palette_name text,
                ADD COLUMN IF NOT EXISTS text_color text,
                ADD COLUMN IF NOT EXISTS accent_color text,
                ADD COLUMN IF NOT EXISTS notes text
        $f$, v_schema);
        RAISE NOTICE 'Aligned tenant %.boqs columns', v_schema;
    ELSE
        RAISE NOTICE 'Skipping: tenant table %.boqs does not exist', v_schema;
    END IF;
END;
$do$;

-- ============================================================
-- 4. RFQ SCHEMA ALIGNMENT (public template + live tenant)
-- ============================================================
-- rfqsAdapter selects id, rfq_number, client_name, created_at, status,
-- project_id, title. exportSchemas and RfqList display client_name and
-- status. None of these three columns exist on the template.

ALTER TABLE public.rfqs
    ADD COLUMN IF NOT EXISTS client_name text,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS project_id uuid;

DO $do$
DECLARE
    v_schema text := 'entity_bigdrops-main_main';
BEGIN
    IF to_regclass(v_schema || '.rfqs') IS NOT NULL THEN
        EXECUTE format($f$
            ALTER TABLE %I.rfqs
                ADD COLUMN IF NOT EXISTS client_name text,
                ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
                ADD COLUMN IF NOT EXISTS project_id uuid
        $f$, v_schema);
        RAISE NOTICE 'Aligned tenant %.rfqs columns', v_schema;
    ELSE
        RAISE NOTICE 'Skipping: tenant table %.rfqs does not exist', v_schema;
    END IF;
END;
$do$;