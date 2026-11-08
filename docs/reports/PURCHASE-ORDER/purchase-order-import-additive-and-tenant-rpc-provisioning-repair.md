# Purchase Order Additive Import & Tenant RPC Provisioning Repair

This report was written by Antigravity on 2026-11-06.

Skills used: react-dev, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English

---

## Objective

Fix two independent issues in the Purchase Order module:
1. Make Purchase Order JSON import strictly additive (append-only) to preserve existing populated line items and reuse trailing placeholder rows correctly.
2. Resolve the database persistence failure where PostgREST cannot find `entity_bigdrops-main_main.save_purchase_order_with_items_transaction` when saving a Purchase Order.

---

## Scope

In scope:
- Purchase Order line item state management and JSON import handler in `PurchaseOrderFormPage.tsx`.
- Purchase Order import helper and item classification logic in `src/domain/purchase-order/formAdapter.ts`.
- Generic import pipeline result carrier in `src/domain/import/types.ts` and `src/domain/import/apply.ts`.
- Tenant schema routine provisioning via `public._prov_install_tenant_rpcs(p_schema_name text)`.
- Database migration `supabase/migrations/20261106230000_tenant_rpc_purchase_order_transaction.sql` and remote Supabase push.
- Comprehensive critical unit tests in `src/tests/critical/purchaseOrderJsonImport.test.js`.

Out of scope:
- Invoice or Quotation import changes.
- Purchase Order calculation engine or numbering rules.
- PDF generation or template rendering.
- Modifying host or unrelated concurrent agent files.

---

## Exact Root Causes

### 1. JSON Import Row Mishandling
`PurchaseOrderFormPage.handleImportApply` previously replaced the entire `po.items` array with the imported rows via:
```tsx
const items = (result.items ?? []).map((row, index) =>
  purchaseOrderItemFromImport(row as unknown as Record<string, unknown>, index)
)
setPo((current) => ({ ...current, items, ... }))
```
This behavior:
- Wiped all existing populated line items when the user applied an import.
- Failed to distinguish between populated commercial items and draft placeholder rows.
- Dropped existing item metadata such as `item_id`, `sub_description`, `image_url`, and custom data.

### 2. Tenant RPC PostgREST Resolution Failure
PostgREST failed with error:
`Could not find the function entity_bigdrops-main_main.save_purchase_order_with_items_transaction in the schema cache`

Root cause:
- `save_purchase_order_with_items_transaction` and `transition_purchase_order_status` were defined in `public` in migration `20261016120000_purchase_order_lifecycle_hardening.sql`.
- In BOURXE multi-tenancy, the frontend `tenantClient` is schema-scoped (`client.schema(tenantSchema)`), which sends the PostgREST header `Accept-Profile: entity_bigdrops-main_main`.
- PostgREST evaluates calls in the selected schema.
- Tenant routines are installed into each tenant schema by `public._prov_install_tenant_rpcs(p_schema_name text)`.
- The installer previously contained routines 1 through 30 (ending with `save_quotation_with_items_transaction`), but omitted the Purchase Order routines.
- Consequently, zero tenant schemas had `save_purchase_order_with_items_transaction` installed.

---

## Changes Made

### 1. Purchase Order JSON Import Additive Semantics
- In `src/domain/purchase-order/formAdapter.ts`:
  - Enhanced `purchaseOrderItemFromImport` to preserve `sub_description`, `image_url`, `item_id`, `custom_data`, and calculate `line_total`.
  - Added `isPurchaseOrderItemPopulated` and `isPurchaseOrderItemEmpty`: classifies rows with non-empty descriptions, sub-descriptions, item IDs, or image URLs as populated (including rows with 0 quantity or 0 rate).
  - Added `applyPurchaseOrderImport(existingItems, importedRows)`:
    - Retains all existing populated items without in-place mutation.
    - If the final row is an empty placeholder, reuses that row for the first imported item, preserving its `_uiKey` and `id`.
    - If the final row is populated, appends all valid imported items as new rows.
    - Eliminates intermediate empty placeholder rows.
    - Preserves item ordering and metadata.
    - Returns existing items unchanged if import rows are empty.
- In `src/domain/import/types.ts`:
  - Added optional `resolved?: ResolvedImportData` to `ApplyImportResult`.
- In `src/domain/import/apply.ts`:
  - Forwarded `resolved` in `buildApplyResult` return payloads for both Add and Update modes.
- In `src/pages/PurchaseOrderFormPage.tsx`:
  - Updated `handleImportApply` to resolve raw imported items from `result.resolved?.items` or `result.items` and invoke `applyPurchaseOrderImport(current.items ?? [], rawImportedRows)`.

### 2. Database Migration & Tenant Routine Provisioning
- Created migration `supabase/migrations/20261106230000_tenant_rpc_purchase_order_transaction.sql`:
  - Preserved installer blocks 1 through 30 verbatim from Phase 3.6 hotfix.
  - Added Block 31: `__SCHEMA__.save_purchase_order_with_items_transaction(p_entity_id uuid, p_purchase_order_payload jsonb, p_items jsonb, p_mode text, p_expected_updated_at timestamptz)` with tenant schema verification (`public._prov_get_schema_name(p_entity_id) IS DISTINCT FROM '__SCHEMA_TEXT__'`).
  - Added Block 32: `__SCHEMA__.transition_purchase_order_status(p_entity_id uuid, p_purchase_order_id uuid, p_to_status text, p_expected_updated_at timestamptz)` with identical tenant verification.
  - Added routine execute permissions: `GRANT EXECUTE ON ALL ROUTINES IN SCHEMA %I TO anon, authenticated, service_role`.
  - Added backfill `DO` block to run `public._prov_install_tenant_rpcs(v_schema.schemaname)` on all existing `entity_%` schemas containing `purchase_orders`, `purchase_order_items`, and `suppliers`.
  - Emitted `NOTIFY pgrst, 'reload schema';`.
- Deployed migration via `supabase db push`.

### 3. Unit Tests
- Added `src/tests/critical/purchaseOrderJsonImport.test.js` covering:
  - Correct item classification for draft placeholders vs populated rows (including zero-quantity/rate items).
  - Trailing empty placeholder reuse.
  - Appending after populated trailing rows.
  - Intermediate empty row filtering.
  - Immutability of existing item objects.
  - Preservation of metadata (`item_id`, `sub_description`, `image_url`, `custom_data`).
  - Safe no-op on empty import arrays.

---

## Files Changed

- `src/domain/purchase-order/formAdapter.ts`
- `src/domain/import/types.ts`
- `src/domain/import/apply.ts`
- `src/pages/PurchaseOrderFormPage.tsx`
- `src/tests/critical/purchaseOrderJsonImport.test.js`
- `supabase/migrations/20261106230000_tenant_rpc_purchase_order_transaction.sql`
- `docs/reports/PURCHASE-ORDER/purchase-order-import-additive-and-tenant-rpc-provisioning-repair.md`

---

## Verification Result

```
Verification:
- bun run audit:load: passed
- bun run typecheck: passed (tsc --noEmit with 0 errors)
- test suite: passed (123/123 purchaseOrder tests passed in 1.76s)
- supabase db push: passed (applied 20261106230000_tenant_rpc_purchase_order_transaction.sql)
- remote db verification: passed (save_purchase_order_with_items_transaction and transition_purchase_order_status confirmed present in all 11 tenant schemas in pg_proc)
- bun run build: skipped due to hardware policy
```

### Remote Database Query Evidence
Query on hosted project `xqlpekpkbszpdgtuwybh`:
```sql
SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'save_purchase_order_with_items_transaction'
ORDER BY n.nspname;
```
Result:
- `entity_bigdrops-main_adel`
- `entity_bigdrops-main_agbado`
- `entity_bigdrops-main_alarm`
- `entity_bigdrops-main_allan`
- `entity_bigdrops-main_anthropology`
- `entity_bigdrops-main_azerbaijan`
- `entity_bigdrops-main_jig`
- `entity_bigdrops-main_lomo`
- `entity_bigdrops-main_main`
- `entity_bigdrops-main_ogombo`
- `entity_bigdrops-main_opaque`
- `public`

All 11 tenant schemas now contain the required tenant-scoped RPCs.

---

## Supabase Push Status

- Command: `supabase db push`
- Status: Completed successfully.
- Migration applied: `20261106230000_tenant_rpc_purchase_order_transaction.sql`

---

## Risks or Limitations

- Future tenant provisioning steps must continue to invoke `public._prov_install_tenant_rpcs(v_schema_name)` as part of tenant creation.
- The repair retains the function in `public` for backward compatibility with potential direct callers, while ensuring tenant schemas have their own authoritative copies.

---

## Deferred Work

None. Both objectives are complete and verified.
