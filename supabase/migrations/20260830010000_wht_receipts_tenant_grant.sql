-- Grant tenant-schema access for wht_receipts
-- Created: 2026-08-30
--
-- Root cause: the tenant table "entity_bigdrops-main_main".wht_receipts has
-- FORCE ROW LEVEL SECURITY and RLS policies, but lacks the table GRANT that
-- every sibling tenant table (payments, receipts, tax_filings, ...) received.
-- PostgREST executes queries as the `authenticated` role, which had no
-- SELECT/INSERT/UPDATE/DELETE privilege on this table, producing
-- "permission denied for table wht_receipts" in the Compliance Hub.
--
-- This matches the grant pattern used by other tenant tables.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON "entity_bigdrops-main_main".wht_receipts
  TO anon, authenticated, service_role;
