# Tenant Settings — Complete Document Identity Investigation

This report was written by CommandCodeBot on 2026-08-10 via Command Code.

## 1. LIVE SETTINGS COMPARISON

| Field | public.settings | entity_bigdrops-main_main.settings | Match? | Relevant to Documents? |
|-------|----------------|-----------------------------------|--------|----------------------|
| id | `1` | `1` | YES | — |
| company_name | `Sun & Shield Power Solutions ` (trailing space) | `Sun & Shield Power Solutions` | MISMATCH (trailing space) | YES — PDF "From" line |
| company_tagline | `""` (empty string) | `null` | MISMATCH | YES — PDF tagline |
| company_address | `43 oshola street , Ifako-ijaiye` | `null` | MISMATCH | YES — PDF address line |
| company_city | `Lagos State` | `null` | MISMATCH | YES — PDF city/state line |
| company_phone | `+2348066190685` | `null` | MISMATCH | YES — PDF phone |
| company_email | `Sunshieldpowersolutions@gmail.com` | `null` | MISMATCH | YES — PDF email |
| company_website | `null` | `null` | MATCH | YES — PDF website |
| bank_name | `U.B.A` | `null` | MISMATCH | YES — bank details |
| bank_account_name | `Sun and shield power solutions` | `null` | MISMATCH | YES — bank details |
| bank_account_number | `1024829598` | `null` | MISMATCH | YES — bank details |
| bank_sort_code | `null` | `null` | MATCH | — |
| footer_text | `""` (empty string) | `null` | MISMATCH | YES — PDF footer |
| company_logo_url | `https://...supabase.co/...png` | `null` | MISMATCH | YES — PDF logo |
| signature_url | `null` | `null` | MATCH | YES — PDF signature |
| custom_info | `[{label:"Tin",value:" 1063045858"}]` | `[]` | MISMATCH | YES — TIN field |
| app_background_color | `null` | `null` | MATCH | — |
| app_card_color | `null` | `null` | MATCH | — |
| app_theme_preset_id | `glassline` | `null` | MISMATCH | UI theming |
| app_theme_tokens | `null` | `null` | MATCH | — |
| document_prefixes | `{"boq":"SASBOQ","invoice":"SASINV",...}` | `{"boq":"BOQ","invoice":"INV",...}` | MISMATCH | Document numbering |

**Summary:** The tenant settings row has `company_name` populated (from the previous fix), but every other identity field is `null`. Only `company_name`, `document_prefixes`, and `custom_info` (empty array `[]`) have non-null values.

## 2. SETTINGS SCHEMA COMPARISON

The schemas are **structurally identical**. Both tables were created by cloning:

```
CREATE TABLE IF NOT EXISTS settings (
    id integer NOT NULL DEFAULT 1,
    company_name text,
    company_tagline text,
    company_city text,
    company_address text,
    company_phone text,
    company_email text,
    company_website text,
    bank_name text,
    bank_account_name text,
    bank_account_number text,
    bank_sort_code text,
    footer_text text,
    company_logo_url text,
    signature_url text,
    custom_info text DEFAULT '[]'::text,
    app_background_color text,
    app_card_color text,
    app_theme_preset_id text,
    app_theme_tokens jsonb
);
```

**Column defaults:** Only three columns have defaults:
- `id` → `DEFAULT 1`
- `custom_info` → `DEFAULT '[]'::text`
- All other columns → `DEFAULT NULL` (implicit)

**Columns existing in both:** All 20 columns exist in both schemas.
**Columns only in public:** None.
**Columns only in tenant:** None.
**Nullable differences:** None.

The cloning process (`CREATE TABLE ... LIKE ... INCLUDING ALL`) copies structure, defaults, and constraints — but NOT data.

## 3. PROVISIONING CONTRACT

**What `_prov_seed_settings()` creates:**

```sql
INSERT INTO {schema}.settings (id, company_name) VALUES (1, '{display_name}')
ON CONFLICT (id) DO NOTHING
```

**Only two fields are seeded:**
1. `id = 1` (the canonical row)
2. `company_name` = `public.entities.display_name`

**All other 18 columns are left at their defaults:**
- `custom_info` → `[]` (default value)
- All others → `null` (default value)

**Provisioning contract answer:** A. The provisioning system intentionally seeds **only company_name** (plus `id`).

**Design intent confirmed:**
- The seed function reads from `public.entities.display_name` (entity identity source)
- `ON CONFLICT (id) DO NOTHING` means existing tenant settings are preserved on re-provisioning
- No company_address, city, phone, email, TIN, bank details, logo, theme, or prefix data is ever seeded by provisioning

## 4. APPLICATION WRITE PATH

### `persistSettings()` in `src/hooks/useSettings.js` (line 109):

```javascript
const { data, error } = await supabase
    .from('settings')
    .upsert(finalPayload, { onConflict: 'id' })
    .select()
```

**Client used:** `supabase` (the default Supabase client — NO schema override)
**Schema targeted:** `public` (default schema, not tenant schema)
**Fields written:** Whatever is passed to `saveSettings()` — typically company_name, address, phone, email, bank details, theme tokens, logo URL, custom_info, tagline, footer, etc.

### `fetchSettings()` in `src/hooks/useSettings.js` (line 183):

```javascript
const { data, error } = await tenantClient.from('settings').select('*').eq('id', 1).single()
```

**Client used:** `tenantClient` (schema-aware client)
**Schema targeted:** `entity_bigdrops-main_main` (tenant schema when provisioned)

### Architecture confirmed:
| Operation | Client | Schema | Fields |
|-----------|--------|--------|--------|
| **WRITE** | `supabase` | `public` | All fields user edits via Settings UI |
| **READ** | `tenantClient` | `entity_*` | All fields (but most are null) |

**No synchronization exists** between `public.settings` and tenant `settings`. The two are completely independent after provisioning.

**No application code writes to tenant settings.** The only mechanism that writes to tenant settings is `_prov_seed_settings()` at provisioning time.

## 5. DOCUMENT READ PATH

### Quotation PDF (`pdfDownloadHandler.ts`):

```typescript
issuer: {
    name: String(settings?.company_name || ""),              // line 71
    addressLines: companyPreviewLines,                        // line 72
    phone: String(settings?.company_phone || ""),             // line 73
    email: String(settings?.company_email || ""),             // line 74
    taxId: String(settings?.company_vat || ""),               // line 75
}
```

### `buildCompanyPreviewLines()` in `partyProjection.ts` (line 43):

```typescript
const addressLines = [
    settings?.company_address,
    [settings?.company_city, settings?.company_state].filter(Boolean).join(', '),
].filter(Boolean) as string[]
```

### Fields consumed by documents:

| Field | Source | Used By |
|-------|--------|---------|
| `company_name` | `settings.company_name` | PDF "From" line, logo alt text, meta footer |
| `company_address` | `settings.company_address` | PDF address line |
| `company_city` | `settings.company_city` | PDF city/state line |
| `company_state` | `settings.company_state` | PDF city/state line (column does NOT exist in settings table — bug) |
| `company_phone` | `settings.company_phone` | PDF phone |
| `company_email` | `settings.company_email` | PDF email |
| `company_website` | `settings.company_website` | PDF website |
| `company_vat` | `settings.company_vat` | PDF tax ID (column does NOT exist — bug) |
| `custom_info` | `settings.custom_info` | TIN/custom info lines |
| `company_logo_url` | `settings.company_logo_url` | PDF logo |
| `company_tagline` | `settings.company_tagline` | PDF tagline |
| `footer_text` | `settings.footer_text` | PDF footer |

**Note:** `company_state` and `company_vat` are referenced in code but do NOT exist as columns in the settings table schema. These will always resolve to `null`.

### Data flow:
```
tenantClient.from('settings') → normalizeSettings() → settings object
  → buildQuotationPreviewModel(settings)
    → buildCompanyPreviewLines(settings)
      → addressLines from company_address + company_city
      → customInfo from custom_info (TIN)
    → pdfDownloadHandler(issuer uses company_name, company_phone, company_email)
      → generateQuotationPdf()
        → renders all issuer fields
```

## 6. ROOT CAUSE

### PROVEN:
1. **Provisioning seeds only `company_name`.** The `_prov_seed_settings()` function inserts exactly `(id, company_name)` — nothing else.
2. **Table cloning copies structure only, not data.** `_prov_clone_table()` uses `CREATE TABLE ... LIKE ... INCLUDING ALL` which copies structure, defaults, constraints, and indexes — but NOT row data.
3. **Application writes go to `public.settings` only.** `persistSettings()` uses `supabase.from('settings')` (public schema), not `tenantClient`.
4. **Document reads come from tenant settings.** `fetchSettings()` uses `tenantClient.from('settings')` (tenant schema).
5. **The tenant settings row is mostly null.** Live data confirms all identity fields except `company_name` are `null`.
6. **`custom_info` defaults to `[]`**. The tenant settings has `custom_info = '[]'` (empty), while public has the TIN data.

### INFERRED:
1. When the entity was provisioned on 2026-08-06, the `_prov_seed_settings()` function did not exist yet. The settings table was created empty.
2. A settings row was later inserted with only `company_name = 'BIGDROPS'` (likely via ad-hoc SQL copying from public settings at the time).
3. The previous fix updated only `company_name` to `'Sun & Shield Power Solutions'`, leaving all other fields at `null`.

### UNKNOWN:
1. Who originally inserted the tenant settings row.
2. Whether there is an audit trail for the original insertion.

**Root cause:** The provisioning architecture intentionally seeds only `company_name`. All other identity fields (address, phone, email, TIN, bank details, logo, theme) are written to `public.settings` via the Settings UI but documents read from tenant `settings`. The two systems are independent — there is no synchronization.

## 7. PREVIOUS FIX ASSESSEMENT

**Changing only `company_name` was insufficient.** It fixed the PDF "From" line but exposed the underlying architectural gap: the tenant settings row lacks address, phone, email, TIN, bank details, logo, theme, and prefix data.

The previous fix treated the symptom (wrong company name) but did not address the architectural mismatch: documents read from tenant settings while the Settings UI writes to public settings.

## 8. CORRECT REMEDIATION STRATEGY

Based on the existing architecture and document requirements, the correct strategy is:

**D. Provision tenant settings from `public.entities` (identity) plus appropriate company settings (operational data).**

**Rationale:**
- `company_name` should come from `public.entities.display_name` (entity identity — this is already the provisioning intent)
- All operational company data (address, phone, email, bank details, TIN, logo, theme, prefixes) belongs in `public.settings` and should be synchronized into tenant settings for document rendering
- Each entity could legitimately have different operational data, so the synchronization must be entity-aware, not a blind copy

**The safest implementation would be:**
1. A read-only comparison query to identify missing/null fields in tenant settings
2. A targeted backfill that copies only the fields that are null/empty in tenant settings from `public.settings`
3. Future provisioning that seeds the complete settings row, not just `company_name`

**DO NOT blindly copy `public.settings` into tenant settings** — this would overwrite any entity-specific overrides that may have been set directly in tenant settings.

## 9. MULTI-TENANT RISK

**Blindly copying `public.settings` into every tenant would be UNSAFE.**

Reasons:
1. **Multiple entities may have different identities.** Each entity (business) could legitimately have its own address, phone, email, bank account, TIN. The workspace-level `public.settings` may not be appropriate for all entities.
2. **`document_prefixes` differ between public and tenant.** Public has `SASBOQ`/`SASINV`/`SASQUO` prefixes; tenant has `BOQ`/`INV`/`QTN`. These are intentional entity-level prefix configurations that should NOT be overwritten.
3. **`app_theme_preset_id` = `glassline`** is a workspace-level theme that may not be appropriate for all entities.

**Current state:** Only one entity exists (`eca34515...`), so the risk is theoretical for now. But the architecture must be designed for multi-entity workspaces.

**Safe approach:** Synchronize from `public.settings` → tenant settings on a field-by-field basis, skipping fields that have non-null tenant values and skipping fields that are legitimately entity-specific (like `document_prefixes`).

## 10. GIT STATUS

**Before investigation:**
```
M  .commandcode/taste/taste.md
M  docs/Reports/GENERAL/delegation-log.md
A  docs/Reports/invoice-quote/frontend-invoice-aggregate-integration-audit.md
A  docs/Reports/multi-tenancy/tenant-settings-final-provisioning-verification.md
A  docs/tickets/Dashboard/deepseek.md
A  docs/tickets/Dashboard/milad.md
M  supabase/migrations/20260809030000_invoice_aggregate_data_migration.sql
A  temp-investigation.sql
?? docs/Reports/multi-tenancy/tenant-settings-live-db-investigation.md
```

**After investigation:**
Same as before — zero modifications from this investigation.

- Application files modified: **NO**
- Migration files modified: **NO**
- SQL files modified: **NO**
- Configuration modified: **NO**
