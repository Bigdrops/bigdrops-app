# Tenant Settings Provisioning — Final Root-Cause Verification

This report was written by CommandCodeBot on 2026-08-10 via Command Code.

## 1. FINAL PROVISIONING STATE

### Final Repository Definition of `provision_entity()`

The final definition is in `supabase/migrations/20260809060000_invoice_financials_tenant_view.sql` (line 129, function body at lines 134–237).

This is the LAST `CREATE OR REPLACE FUNCTION public.provision_entity(...)` in the migration chain. Five migrations redefine it in order:

| Migration | Date | Settings Seed? | Key Addition |
|-----------|------|----------------|--------------|
| `20260717000000_entity_provisioning_engine.sql` | 2026-07-17 | NO | Original provisioning (steps 1-9) |
| `20260809000000_provisioning_settings_seed.sql` | 2026-08-09 00:00 | YES (step 8.5) | Adds `_prov_seed_settings()` |
| `20260809010000_invoice_aggregate_provisioning.sql` | 2026-08-09 01:00 | YES (step 8.5) | Adds trigger install (step 8.6) |
| `20260809020000_invoice_aggregate_permissions.sql` | 2026-08-09 02:00 | YES (step 8.5) | Adds permission seed (step 8.7) |
| `20260809060000_invoice_financials_tenant_view.sql` | 2026-08-09 06:00 | YES (step 8.5) | Adds financial views (step 8.8) |

### Does the final `provision_entity()` seed settings?

**YES.** Step 8.5 at line 198:
```sql
PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);
```

### Where does that happen?

`_prov_seed_settings()` is defined in `20260809000000_provisioning_settings_seed.sql` (line 29). It reads `display_name` from `public.entities` (line 43) and inserts it into `{schema}.settings`:
```sql
EXECUTE format(
    'INSERT INTO %I.settings (id, company_name) VALUES (1, %L) ON CONFLICT (id) DO NOTHING',
    p_schema_name,
    v_display_name
);
```

### Does it use `public.entities.display_name`?

**YES.** Line 43: `SELECT display_name INTO v_display_name FROM public.entities WHERE id = p_entity_id;`

### Is it idempotent?

**YES.** The INSERT uses `ON CONFLICT (id) DO NOTHING`. If a settings row already exists, it is preserved without modification.

### Does it preserve legitimate tenant-specific settings on repeated provisioning?

**YES.** If the entity is already `ready`, step 2 (idempotency check) returns early without executing any provisioning steps. If provisioning is retried after a `failed` status, the seed uses `ON CONFLICT (id) DO NOTHING` — any existing settings row is left untouched.

### Is `20260809000000_provisioning_settings_seed.sql` still independently required?

**NO.** Its behavior (creating `_prov_seed_settings()` and adding step 8.5 to `provision_entity()`) has been incorporated into every subsequent migration. The function `_prov_seed_settings()` is never redefined after this file — only `provision_entity()` is redefined, each time preserving step 8.5.

However, the file must still be applied to production IF it hasn't been applied yet, because it is the first definition of `_prov_seed_settings()`. Subsequent migrations call it but do not redefine it.

### Which migration should be applied to production?

**All 8 migrations from the 20260809 chain** (`000000` through `070000`) must be applied in sequence. Each migration builds on the previous one:
- `000000` defines `_prov_seed_settings()` (no other file does)
- `010000` through `070000` each redefine `provision_entity()` with additional steps
- The final state after `060000` includes: settings seed + trigger install + permission seed + financial views
- `070000` adds composite transaction RPCs but does not redefine `provision_entity()`

## 2. ORIGIN OF BIGDROPS

### Classification: **UNKNOWN / MANUAL-AD-HOC HYPOTHESIS**

**Repository search found no application/migration mechanism capable of explaining the original BIGDROPS tenant-settings insertion.** Manual/ad-hoc SQL remains a hypothesis, not a proven fact.

Evidence:

| Mechanism | Found? | Details |
|-----------|--------|---------|
| Migration INSERT INTO settings | ONLY in `20260809000000` | Reads from `public.entities.display_name` (correct source). NOT applied to live database per prior investigation. |
| Application code INSERT | NONE | No TypeScript/JavaScript code inserts into settings tables. |
| Trigger on settings | NONE | No trigger exists on any settings table. |
| Seed script | NONE | No seed scripts found in `scripts/` or `tools/`. |
| Test fixture | NONE | No test fixtures insert settings data. |
| `provision_entity()` before `20260809000000` | NO seed step | Original `20260717000000` only clones table structure, no data insertion. |

The `live-db-recovery-2026-08-09.sql` file exists in the repository but is empty (0 lines).

Repository BIGDROPS occurrences are all display/UI constants — none are INSERT or UPDATE mechanisms:
- `src/components/layout/navData.ts:5` — `export const APP_NAME = 'BIGDROPS'`
- `src/components/table-document/TableDocumentPreview.tsx:65` — fallback `brand_name_override \|\| 'BIGDROPS'` (RFQ/BOQ only)
- `src/components/settings/SettingsShell.tsx:155` — "BIGDROPS ERP" UI label
- `src/pages/settings/AdminSettingsSection.tsx:79,117` — admin UI text

**Production-proven source:** The current database state confirms `entity_bigdrops-main_main.settings.company_name = 'BIGDROPS'`. How it got there is not recorded in the repository.

## 3. IMMEDIATE REMEDIATION

The confirmed affected entity:
- Entity ID: `eca34515-0b30-482c-b12e-3963df164322`
- Entity display name: `Sun & Shield Power Solutions`
- Tenant schema: `entity_bigdrops-main_main`
- Settings row: `id = 1`

Proposed SQL:
```sql
UPDATE "entity_bigdrops-main_main".settings
SET company_name = (
  SELECT display_name
  FROM public.entities
  WHERE id = 'eca34515-0b30-482c-b12e-3963df164322'
)
WHERE id = 1;
```

**NOT EXECUTED.** This SQL has not been run by this investigation.

**Why this UPDATE is safe:**
- The settings row is confirmed to exist (production evidence).
- `id = 1` targets the canonical settings row (the only row that should exist).
- The source value comes from `public.entities.display_name` — the authoritative source.
- No other columns are modified (bank details, theme tokens, document prefixes, etc. remain untouched).
- `WHERE id = 1` prevents accidental multi-row updates.

**Additional verification before human execution:**
- Confirm the row exists: `SELECT id, company_name FROM "entity_bigdrops-main_main".settings WHERE id = 1;`
- Confirm the expected value: `SELECT display_name FROM public.entities WHERE id = 'eca34515-0b30-482c-b12e-3963df164322';`

## 4. PERMANENT PROVISIONING FIX

### Is the fix already present in the final repository definition?

**YES.** The final `provision_entity()` in `20260809060000` includes step 8.5 (settings seed) which reads from `public.entities.display_name`.

### Is it already represented in the applied migration chain?

**Unknown.** Whether `20260809000000` through `20260809060000` have been applied to production is a database-level question, not a repository-level question. The prior investigation (`provisioning-settings-seed.md`) confirmed `000000` was NOT executed at that time.

### Does another migration still need to be applied?

**YES.** All migrations `20260809000000` through `20260809070000` must be applied to production in sequence.

### Would applying `20260809000000` create duplicate/competing provisioning behavior?

**NO.** Each migration uses `CREATE OR REPLACE FUNCTION`, which replaces the previous definition. There is no duplication — each redefinition supersedes the last. The final state after applying all 8 migrations is the `provision_entity()` defined in `20260809060000`.

The seed INSERT uses `ON CONFLICT (id) DO NOTHING`, so if a settings row already exists for a newly provisioned entity, it is preserved (not overwritten).

## 5. OTHER ENTITY RISK

Read-only SQL strategy for mismatch inventory (DO NOT EXECUTE):

```sql
-- Step 1: List all provisioned entities with their expected identity
SELECT
    e.id AS entity_id,
    e.display_name AS expected_company_name,
    e.slug AS entity_slug,
    w.slug AS workspace_slug,
    'entity_' || w.slug || '_' || e.slug AS tenant_schema,
    eps.status AS provisioning_status
FROM public.entities e
JOIN public.workspaces w ON w.id = e.workspace_id
JOIN public.entity_provisioning_status eps ON eps.entity_id = e.id
WHERE eps.status = 'ready'
ORDER BY e.id;

-- Step 2: For each provisioned entity, check tenant settings row
-- Run this dynamically for each tenant schema from Step 1:
SELECT
    'entity_X' AS tenant_schema,
    s.id,
    s.company_name AS actual_company_name,
    'Sun & Shield Power Solutions' AS expected_company_name, -- replace per entity
    CASE WHEN s.company_name IS DISTINCT FROM 'expected' THEN 'MISMATCH' ELSE 'OK' END AS status
FROM "entity_X".settings s
WHERE s.id = 1;

-- Step 3: Detect missing settings rows
-- For each tenant schema, check if id=1 exists:
SELECT COUNT(*) AS settings_row_exists
FROM "entity_X".settings
WHERE id = 1;
-- Result = 0 means missing row, = 1 means row exists.
```

A human operator can execute these queries to produce a mismatch inventory across all provisioned entities.

## 6. ARCHITECTURAL DEBT

### persistSettings() → public.settings (WRITE)
`src/hooks/useSettings.js`, line 109:
```javascript
const { data: upsertData, error } = await supabase
    .from('settings')
    .upsert(finalPayload, { onConflict: 'id' })
    .select()
```

### document reads → tenant.settings (READ)
`src/hooks/useSettings.js`, line 183:
```javascript
const { data, error } = await tenantClient.from('settings').select('*').eq('id', 1).single()
```

This creates a split:
- Settings saved via the UI go to `public.settings` (workspace-level)
- Documents (quotations, invoices) read from tenant schema settings (entity-level)
- The two can diverge, as demonstrated by the current BIGDROPS mismatch

The comment in `src/lib/tenant/contexts.tsx` (around line 237 in useSettings documentation) notes the split is intentional — writes stay on public supabase. The original investigation report noted: "writes (persistSettings/saveSettings) intentionally stay on public supabase."

This is a **future architectural decision**. No change is made during this investigation.

## 7. GIT STATUS

**Before investigation:**
```
M docs/Reports/GENERAL/delegation-log.md
A docs/tickets/Dashboard/deepseek.md
A docs/tickets/Dashboard/milad.md
M supabase/migrations/20260809030000_invoice_aggregate_data_migration.sql
?? docs/Reports/invoice-quote/frontend-invoice-aggregate-integration-audit.md
```

**After investigation:**
Same as before — zero additional modifications from this investigation.

- Application files modified: **NONE**
- Migration files modified: **NONE**
- Documentation files modified: **NONE** (this report is a new file, not a modification)

## FINAL CONCLUSION

| Category | Finding |
|----------|---------|
| **PROVEN** | The final `provision_entity()` includes settings seeding from `public.entities.display_name` (step 8.5). `_prov_seed_settings()` is idempotent (`ON CONFLICT DO NOTHING`). The seed migration `20260809000000` was NOT applied to the live database. |
| **INFERRED** | The `BIGDROPS` value in tenant settings was inserted via ad-hoc SQL (likely copied from `public.settings` which originally had the workspace name). No repository mechanism explains this insertion. |
| **REQUIRES PRODUCTION SQL** | One-time UPDATE for the confirmed entity: `UPDATE "entity_bigdrops-main_main".settings SET company_name = (SELECT display_name FROM public.entities WHERE id = 'eca34515-0b30-482c-b12e-3963df164322') WHERE id = 1;` Apply migrations `20260809000000` through `20260809070000` to production. Run mismatch inventory query across all provisioned entities. |
| **FUTURE ARCHITECTURAL DECISION** | The `persistSettings()` → `public.settings` / document reads → `tenant.settings` split causes data divergence. Aligning the write path to use `tenantClient` should be evaluated as a separate architectural change. |
