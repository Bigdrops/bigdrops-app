# Invoice-to-Quotation Revert Blocker Report

This report was written by opencode (mimo-v2.5-free) on 2026-09-04 via Local Runner.

## Objective

Trace the full Invoice → Quotation revert call chain, identify the root cause of the broken revert, and determine the minimal fix path.

## Scope

- `src/pages/viewInvoiceActions.ts` — UI trigger
- `src/modules/invoices/services/invoiceConversionService.ts` — service layer
- `src/lib/tenantClient.ts` — tenant client factory
- `src/lib/tenant/contexts.tsx` — EntityProvider / schema resolution
- `live-public-schema.sql` — authoritative DB snapshot
- `supabase/migrations/20260820000000_fix_revert_quotation_status_mapping.sql`
- `supabase/migrations/20260830000000_public_business_schema_purge.sql`
- `supabase/migrations/20260902120000_provisioning_engine_repair.sql`

---

## Call Chain

1. **UI trigger** — `useInvoiceActions.ts:126-138` calls `revertInvoiceToQuotationService({ invoice, items, customFields, prefixes }, tenantClient, entityId)`
2. **Service** — `invoiceConversionService.ts:81-86` calls `tenantClient.rpc('revert_invoice_to_quotation_transaction', { p_invoice_id, p_quotation_payload, p_quotation_items_payload, p_entity_id })`
3. **Client** — `tenantClient.ts:31-32` routes via `client.schema(schemaName).rpc(fn, params)` — PostgREST resolves function in tenant schema first, then fallback schemas

## Root Cause: Two Defects

### Defect 1: Signature Mismatch (Active Blocker)

The live DB function at `public.revert_invoice_to_quotation_transaction` has a **3-parameter signature** (no `p_entity_id`):

```sql
-- live-public-schema.sql:2040
CREATE OR REPLACE FUNCTION public.revert_invoice_to_quotation_transaction(
    p_invoice_id uuid,
    p_quotation_payload jsonb,
    p_quotation_items_payload jsonb
) RETURNS jsonb
```

The client passes **4 parameters** including `p_entity_id`:

```typescript
// invoiceConversionService.ts:81-86
tenantClient.rpc('revert_invoice_to_quotation_transaction', {
  p_invoice_id: invoice.id,
  p_quotation_payload: quotationPayload,
  p_quotation_items_payload: itemRows,
  p_entity_id: entityId ?? null,  // ← not in live function signature
})
```

**Result:** PostgreSQL throws `function revert_invoice_to_quotation_transaction(uuid, jsonb, jsonb, uuid) does not exist`.

### Defect 2: Unqualified Table References (Latent, Post-Purge)

The live function body uses unqualified table names:

```sql
-- live-public-schema.sql:2046
v_row quotations;  -- resolves to public.quotations via SET search_path TO 'public'
INSERT INTO quotations (...)  -- targets public.quotations
```

Currently `public.quotations` still exists (purge migration not applied). After purge, these references resolve to dropped tables.

## Why This Works Today

The purge migration (`20260830000000_public_business_schema_purge.sql`) has **not been applied** to the live DB:
- `public.quotations` still exists (line 3126 of dump)
- `public.invoices` still exists (line 2666 of dump)
- `public.invoice_items` still exists (line 2635 of dump)

But the signature mismatch means the revert is already broken — the 4-param call fails against the 3-param function.

## Fix Requirements

### Client Side: No Changes Needed

The client already uses `tenantClient.rpc()` which routes to the tenant schema. The call chain is architecturally correct.

### Server Side: DB Migration Required

A new migration must:

1. **Update the function in all existing tenant schemas** to accept `p_entity_id` and use schema-qualified table references (`__SCHEMA__.quotations` etc.)
2. **Update or drop the public version** to match

The correct function body already exists in `20260902120000_provisioning_engine_repair.sql:1511-1608` — it uses `__SCHEMA__`-qualified references and accepts `p_entity_id`. But this only applies to entities provisioned AFTER that migration. Existing entities need retroactive fix.

### Migration Strategy

```sql
-- For each existing tenant schema:
DO $$
DECLARE
  v_schema text;
BEGIN
  FOR v_schema IN
    SELECT schemaname FROM pg_tables
    WHERE schemaname LIKE 'entity_%'
    GROUP BY schemaname
  LOOP
    EXECUTE format('
      CREATE OR REPLACE FUNCTION %I.revert_invoice_to_quotation_transaction(
        p_invoice_id uuid,
        p_quotation_payload jsonb,
        p_quotation_items_payload jsonb,
        p_entity_id uuid DEFAULT NULL
      ) RETURNS jsonb ...
    ', v_schema);
    -- (full function body from 20260902120000 migration)
  END LOOP;
END $$;

-- Drop the stale public version
DROP FUNCTION IF EXISTS public.revert_invoice_to_quotation_transaction(
  p_invoice_id uuid, p_quotation_payload jsonb, p_quotation_items_payload jsonb
);
```

## Stale Comment Fixed

`viewQuotationActions.ts:158-159` — updated from "remains public" to "routes through the tenant schema".

## Verification

- `bun run typecheck`: passed
- `bun run audit:load`: passed (pre-existing warnings only)
- `git status`: only `viewQuotationActions.ts` modified

## Blocker Summary

| Item | Status |
|------|--------|
| Client call chain | ✅ Correct — uses `tenantClient.rpc()` |
| Function signature | ❌ Live: 3 params. Client: 4 params. Mismatch. |
| Function body | ⚠️ Unqualified refs — works now (purge not applied), breaks after purge |
| Fix scope | DB migration only — no client changes needed |
| Tenant-schema version | Exists in provisioning template (`20260902120000`), but not retroactively applied to existing tenants |

## Recommendation

Apply a new migration that retroactively updates `revert_invoice_to_quotation_transaction` in all existing tenant schemas, using the correct body from `20260902120000_provisioning_engine_repair.sql`. Then drop the stale public version.

## Skills used

NONE

## Documentation standard

ASD-STE100 Simplified Technical English
