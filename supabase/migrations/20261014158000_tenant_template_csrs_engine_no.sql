-- Domain: Tenant template repair — csrs.engine_no
-- Purpose: repair schema drift between public.csrs and
--          tenant_master_template.csrs so that the tenant-search
--          installer (public._prov_install_search) and later migrations
--          handle the template without error.
-- Root cause: 20260620000001_add_csr_engine_no.sql added engine_no
--             (text) to public.csrs, but tenant_master_template.csrs —
--             created from a curated snapshot — never received it.
-- Additive only; same definition as the public schema.
-- No tenant rows exist in the template (structural template), no backfill.

ALTER TABLE tenant_master_template.csrs
    ADD COLUMN IF NOT EXISTS engine_no text;
