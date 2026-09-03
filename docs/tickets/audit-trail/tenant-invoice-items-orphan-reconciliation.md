# Tenant Invoice Items Orphan Reconciliation

This report was written by GLM on 2026-08-26 via OpenCode.

## Summary

72 of 2095 rows in `entity_bigdrops-main_main.invoice_items` have no matching parent invoice:
63 reference invoice ids that no longer exist, and 9 have NULL `invoice_id`.

## Evidence

- Discovered during the post-purge integrity sweep (`docs/Reports/multi-tenancy/public-business-schema-purge-report.md` §12/§21).
- Proof this predates the purge: the pre-purge backup dump contains the identical distribution (2095 items / 9 NULL / 63 broken) before any destructive step ran.
- Structural enabler: the tenant clone of `invoice_items` carries no FOREIGN KEY on `invoice_id` (only `item_id → item_catalog` exists), so nothing prevents parentless items.

## Classification

Pre-existing data-quality defect in the tenant schema. Not caused by the purge; not an active write-path failure (invoice save paths create items only alongside their parents).

## Suggested remediation (for a dedicated task)

1. Decide per-row: repair the reference (if a correct target can be derived from snapshot columns such as `quotation_id`/audit trails) or archive-delete.
2. Add `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE` to the tenant table AND to the provisioning template's `_prov_readd_foreign_keys()` so future entities inherit it.
3. Backfill the fix for existing entities.

Verification for that task must include zero orphan counts on both the live tenant schema and a freshly provisioned test entity.

Skills used: NONE

Documentation standard: ADS-STE100 Simplified Technical English
