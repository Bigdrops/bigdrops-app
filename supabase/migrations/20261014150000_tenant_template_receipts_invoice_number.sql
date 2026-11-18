-- Domain: Tenant template repair — receipts.invoice_number
-- Purpose: repair schema drift between public.receipts and
--          tenant_master_template.receipts so that the tenant-search
--          installer (public._prov_install_search) and affected
--          migrations handle the template without error.
-- Root cause: 20260707000000_receipt_snapshot_and_idempotency.sql added
--             receipts.invoice_number to public.receipts, but
--             tenant_master_template.receipts (curated snapshot) was never
--             updated to include it.
-- Additive only; same column definition as the public schema
-- (ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS invoice_number text;)
-- No tenant rows exist in the template (it is a structural template), so
-- no backfill is required.

ALTER TABLE tenant_master_template.receipts
    ADD COLUMN IF NOT EXISTS invoice_number text;
