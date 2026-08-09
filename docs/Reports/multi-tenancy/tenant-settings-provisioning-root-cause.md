# Tenant Settings Provisioning Root-Cause Investigation — BIGDROPS vs Sun & Shield Power Solutions

This report was written by CommandCodeBot on 2026-08-09 via Command Code.

## Objective

Trace how `entity_bigdrops-main_main.settings.company_name` was seeded with "BIGDROPS" instead of the entity's display name "Sun & Shield Power Solutions".

## Provisioning Data-Flow Trace

```
Entity created in public.entities
  display_name = "Sun & Shield Power Solutions"
  workspace_id = eb30b64b-7f95-464f-be1a-805cf2c0fedc (workspace slug: bigdrops-main)
  entity slug: main
        ↓
provision_entity() called (20260717000000_entity_provisioning_engine.sql)
  Steps: validate → idempotency → lock → schema → clone tables → FKs → finalize
  NO settings row insertion step existed at this time
        ↓
Schema entity_bigdrops-main_main created
  settings table cloned (structure only, no data)
  entity_bigdrops-main_main.settings is EMPTY
        ↓
[TIME GAP] Entity was provisioned between 2026-07-17 and 2026-08-09
        ↓
Manual SQL: someone inserted settings row with company_name = 'BIGDROPS'
  (Likely copied from public.settings which had company_name = 'BIGDROPS')
        ↓
public.settings.company_name later updated to 'Sun & Shield Power Solutions'
  (But tenant schema settings was never updated)
        ↓
2026-08-09: _prov_seed_settings() migration added
  Reads from public.entities.display_name (correct source)
  Migration NOT executed against live database (per provisioning-settings-seed.md)
        ↓
Current state:
  tenant.settings.company_name = 'BIGDROPS' (wrong)
  public.settings.company_name = 'Sun & Shield Power Solutions ' (correct)
  public.entities.display_name = 'Sun & Shield Power Solutions' (correct, authoritative)
        ↓
Quotation reads via tenantClient → gets BIGDROPS → PDF shows BIGDROPS
```

## Root Cause

The entity was provisioned BEFORE the settings seed migration existed. The provisioning engine (`20260717000000_entity_provisioning_engine.sql`) clones table structure only — it does NOT insert a settings row. The settings table in `entity_bigdrops-main_main` was created empty.

At some point after provisioning, a settings row was manually inserted with `company_name = 'BIGDROPS'`. This was likely done by copying from `public.settings` (which originally had `company_name = 'BIGDROPS'` as the workspace/app name) or by running an ad-hoc INSERT. The seed migration `20260809000000_provisioning_settings_seed.sql` that reads from `public.entities.display_name` was added later but was NOT executed against the live database (confirmed by `provisioning-settings-seed.md`).

## Evidence Chain

| Step | File | Finding |
|------|------|---------|
| Original provisioning engine | `20260717000000_entity_provisioning_engine.sql` | No settings seed step (steps 1-9 end at finalize) |
| Settings seed migration | `20260809000000_provisioning_settings_seed.sql:43-46` | `_prov_seed_settings()` reads from `public.entities.display_name` — correct source |
| Seed migration not executed | `provisioning-settings-seed.md` ("Risks and Limitations") | "This migration was not executed against a live database" |
| Write path mismatch | `useSettings.js:92` | `persistSettings()` writes to `supabase.from('settings')` (public schema) |
| Read path | `useSettings.js:183` | `fetchSettings()` reads via `tenantClient.from('settings')` (tenant schema) |
| Comment confirming intentional split | `contexts.tsx:237` | "writes (persistSettings/saveSettings) intentionally stay on public supabase" |

## Where BIGDROPS Was First Introduced

BIGDROPS entered the tenant settings path through a **manual SQL operation** (not through application code). The manual INSERT most likely used `public.settings.company_name` as the source value, which was "BIGDROPS" at the time (the workspace/app name). When `public.settings.company_name` was later updated to "Sun & Shield Power Solutions", the tenant schema settings row was not updated.

No application code path writes to tenant schema settings — all writes go to public settings.

## Intended Authoritative Identity Source

Based on the architecture established by `20260809000000_provisioning_settings_seed.sql`:

| Field | Authoritative Source | Location |
|-------|---------------------|----------|
| `tenant.settings.company_name` | `public.entities.display_name` | `_prov_seed_settings()` line 43 |
| `public.settings.company_name` | User input via Settings UI | `useSettings.js:saveSettings()` |
| Entity display name | User input via entity creation | `public.entities` |

The intended design is: **`public.entities.display_name` is the authoritative source for tenant settings seeding.** Each entity gets its own settings row seeded from its own `display_name`.

## Architectural Inconsistency: persistSettings()

`persistSettings()` in `useSettings.js` (line 92) writes to `supabase.from('settings')` on the **public schema**. However, all document views (quotations, invoices) read settings via `tenantClient.from('settings')` from the **tenant schema**.

This means:
- Settings saved via the UI → `public.settings`
- Settings read by documents → tenant schema settings
- The two can diverge (and have)

The comment in `contexts.tsx:237` states this is intentional ("intentionally stay on public supabase"), but this architectural decision causes the data split observed here.

## Smallest Safe Permanent Fix

**Immediate fix (one-time backfill for this entity):**
```sql
UPDATE "entity_bigdrops-main_main".settings
SET company_name = (SELECT display_name FROM public.entities WHERE id = 'eca34515-0b30-482c-b12e-3963df164322')
WHERE id = 1;
```

**Permanent fix (ensure future provisioning is correct):**
1. Execute the `20260809000000_provisioning_settings_seed.sql` migration against the live database so future entities get correct seeding.
2. Backfill settings for any other already-provisioned entities that may have empty or incorrect settings rows.

**Long-term architectural fix (optional, out of scope):**
Align the write path in `persistSettings()` to use `tenantClient` instead of `supabase`, so settings saves go to the tenant schema and match the document read path. This requires careful consideration of multi-entity workspace scenarios.

## Risks to Other Entities

Any other entities provisioned before 2026-08-09 may have the same issue — empty or incorrect settings rows. A query against all provisioned entity schemas would identify affected entities:

```sql
-- Find all provisioned schemas with incorrect or missing settings
SELECT eps.entity_id, eps.status, e.display_name
FROM public.entity_provisioning_status eps
JOIN public.entities e ON e.id = eps.entity_id
WHERE eps.status = 'ready';
```

Each provisioned schema should be checked for `settings` row with `id = 1` and correct `company_name`.

## PDF Renderer Assessment

The PDF renderer is **confirmed not responsible**. It correctly mirrors the value passed to it. The data flow is:

```
tenantClient.from('settings') → { company_name: 'BIGDROPS' }
→ normalizeSettings() → { company_name: 'BIGDROPS' }
→ pdfDownloadHandler.ts:71 → issuer.name = String(settings?.company_name || "") = "BIGDROPS"
→ PDF renders: "BIGDROPS"
```

## Files Inspected

| File | Purpose |
|------|---------|
| `supabase/migrations/20260717000000_entity_provisioning_engine.sql` | Original provisioning engine (no seed step) |
| `supabase/migrations/20260809000000_provisioning_settings_seed.sql` | Settings seed migration (not executed live) |
| `docs/Reports/multi-tenancy/provisioning-settings-seed.md` | Migration report confirming not executed |
| `src/hooks/useSettings.js` | Settings read/write architecture |
| `src/lib/tenant/contexts.tsx` | EntityProvider, schema resolution |
| `src/lib/tenantClient.ts` | Tenant schema client |
| `src/pages/viewQuotationActions.ts` | Quotation settings load path |
| `src/domain/quotation/pdfDownloadHandler.ts` | PDF generation |

## Git Status
