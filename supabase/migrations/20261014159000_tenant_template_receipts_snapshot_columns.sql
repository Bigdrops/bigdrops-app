-- Domain: Tenant template repair — receipts snapshot columns
-- Purpose: repair schema drift between public.receipts and
--          tenant_master_template.receipts so the tenant-search installer
--          and later migrations handle the template without error.
-- Root cause: 20260707000000_receipt_snapshot_and_idempotency.sql added
--             these columns to public.receipts, but
--             tenant_master_template.receipts (curated snapshot) never
--             received them.
-- Additive only; identical definitions to the public schema (including
-- the DEFAULT 0 on cash_amount / wht_amount).
-- No tenant rows exist in the template (structural template), no backfill.

ALTER TABLE tenant_master_template.receipts
    ADD COLUMN IF NOT EXISTS payment_amount numeric,
    ADD COLUMN IF NOT EXISTS payment_reference text,
    ADD COLUMN IF NOT EXISTS payment_notes text,
    ADD COLUMN IF NOT EXISTS cash_amount numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wht_amount numeric DEFAULT 0;
