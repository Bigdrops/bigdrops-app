# Quotation Seller Identity Trace — BIGDROPS vs Sun & Shield Power Solutions

This report was written by CommandCodeBot on 2026-08-09 via Command Code.

## Objective

Trace why a quotation PDF for the entity Sun & Shield Power Solutions renders the seller/From field as BIGDROPS instead of the entity's display name.

## Data-Flow Trace

```
EntityProvider (src/lib/tenant/contexts.tsx:146)
  ↓ resolves entity from public.entities where workspace_id = current workspace
  ↓ entity.name = public.entities.display_name = "Sun & Shield Power Solutions"
  ↓ schemaName = provisioningStatus === 'ready' ? `entity_${workspace.slug}_${entity.slug}` : null
  ↓ schemaName = "entity_bigdrops-main_main"

createTenantClient (src/lib/tenantClient.ts:10)
  ↓ from: (table) => client.schema(schemaName).from(table)
  ↓ All tenantClient.from('X') queries run as supabase.schema('entity_bigdrops-main_main').from('X')

loadQuotationViewData (src/pages/viewQuotationActions.ts:13)
  ↓ Line 17: tenantClient.from('settings').select('*').eq('id', 1).single()
  ↓ Queries entity_bigdrops-main_main.settings where id = 1
  ↓ Line 60: settings: normalizeSettings(settingsRes.data)

normalizeSettings (src/hooks/useSettings.js:163)
  ↓ If settingsRes.data is null/undefined → returns {}
  ↓ If settingsRes.data exists → returns the row data with theme normalization

pdfDownloadHandler (src/domain/quotation/pdfDownloadHandler.ts:71)
  ↓ issuer.name = String(settings?.company_name || "")
  ↓ PDF renderer reads company_name from the settings object passed to it

QuotationDocumentPreview (src/components/document-view/quotation/QuotationDocumentPreview.tsx:48)
  ↓ companyName = settingsData?.company_name || ''
```

## Root Cause

The entity `entity_bigdrops-main_main` was provisioned BEFORE the settings seed migration (`20260809000000_provisioning_settings_seed.sql`) existed. The provisioning engine (`provision_entity()`) clones table structure but does NOT insert a settings row.

The settings table in `entity_bigdrops-main_main` has NO row with id=1.

When `tenantClient.from('settings').select('*').eq('id', 1).single()` returns no row:
- `settingsRes.data` is null
- `normalizeSettings(null)` returns `{}`
- `settings?.company_name` is `undefined`
- The PDF renderer receives `issuer.name = ""` (empty string)

The `public.settings` table (workspace-level) contains `company_name = 'BIGDROPS'`. However, all quotation settings access goes through `tenantClient.from('settings')` which targets the tenant schema — NOT the public schema. There is NO fallback path from tenant settings to public settings in the quotation code.

## Where BIGDROPS Appears

BIGDROPS as a company name appears in:
1. `public.settings.company_name` — the workspace-level settings row (id=1), set during initial app setup
2. `src/components/layout/navData.ts:5` — `export const APP_NAME = 'BIGDROPS'` (app chrome name, not document-related)
3. `src/components/table-document/TableDocumentPreview.tsx:65` — fallback `document.brand_name_override || 'BIGDROPS'` for RFQ/BOQ documents only (NOT quotations)
4. `src/components/table-document/TableDocumentPdfDocument.tsx:77` — same RFQ/BOQ fallback

BIGDROPS does NOT appear in:
- Any quotation module code
- Any quotation PDF renderer
- Any quotation settings fallback

## PDF Renderer Assessment

The PDF renderer is NOT introducing BIGDROPS. The quotation PDF download handler (`pdfDownloadHandler.ts:71`) reads `settings?.company_name || ""` directly from the settings object. If company_name is null/undefined, it renders an empty string — not BIGDROPS.

If the PDF actually shows "BIGDROPS", the value must be coming from the `settings.company_name` field at runtime. This could occur through:

1. **Cached settings**: `useSettings` maintains a module-level `cachedSettings` variable (line 6 of `useSettings.js`). If a previous session loaded settings from a different entity or the public schema, the cache may retain `company_name = 'BIGDROPS'`.
2. **Public schema settings row**: If `tenantClient.from('settings')` somehow resolves to the public schema instead of the tenant schema (e.g., if `schemaName` is null and the `.schema()` call is a no-op), the query would read from `public.settings` which contains `company_name = 'BIGDROPS'`.

## Tenant vs Public Schema Usage in Quotation Path

| Operation | Client | Schema | File:Line |
|-----------|--------|--------|-----------|
| Read quotation | `supabase` | Public | viewQuotationActions.ts:14 |
| Read quotation_items | `supabase` | Public | viewQuotationActions.ts:15 |
| Read settings | `tenantClient` | Tenant | viewQuotationActions.ts:17 |
| Read bank_accounts | `supabase` | Public | viewQuotationActions.ts:18 |
| Read signatories | `supabase` | Public | viewQuotationActions.ts:19 |
| Read clients | `tenantClient` | Tenant | viewQuotationActions.ts:52 |
| Write invoices (conversion) | `tenantClient` | Tenant | viewQuotationActions.ts:155 |

The quotation read/write uses the **public schema** (quotations are not in the aggregate). Only settings and clients use the tenant schema.

## Bank Account Name vs Company Name Discrepancy

The PDF shows:
- From: BIGDROPS (from `settings.company_name`)
- Payment Account Name: Sun and shield power solutions (from `bank_accounts.account_name`)

The bank_accounts table lives in the **public schema** and was populated with the entity's name. The settings table in the **tenant schema** is empty. This discrepancy confirms that public-schema data was populated with entity information while tenant-schema settings was not seeded.

## Public-Settings Writes from Tenant Context

`persistSettings()` in `useSettings.js` (line 92) writes to `supabase.from('settings')` on the **public schema**, not via `tenantClient`. This means any settings saved through the UI go to the public settings table, not the tenant schema's settings table. The READ path uses tenantClient (tenant schema), but the WRITE path uses public supabase (public schema). This is a **data inconsistency** — settings are written to public but read from tenant.

## Smallest Safe Fix

Two options exist:

**Option A (backfill tenant settings):** Insert a settings row (id=1, company_name='Sun & Shield Power Solutions') into `entity_bigdrops-main_main.settings`. This requires a one-time SQL script.

**Option B (fix the write path):** Ensure `persistSettings()` writes through `tenantClient` instead of `supabase` so settings are written to the correct tenant schema. The comment in `useSettings.js` (line 237) explicitly notes: "writes (persistSettings/saveSettings) intentionally stay on public supabase" — this is a known architectural decision that causes the data split.

**Option C (add fallback in read path):** If tenant settings return null, fall back to reading from public.settings. This would make documents show the workspace name instead of the entity name — not ideal for multi-entity workspaces.

**Recommended: Option A** for the immediate fix (backfill this entity's settings row), followed by **Option B** to prevent recurrence for future settings changes.

## Blockers from Incomplete Tenant Schema

- `invoice_items` table does not exist in the tenant schema — affects invoice item storage
- `get_dashboard_financial_metrics` RPC is missing — affects dashboard financial metrics
- These are separate issues not addressed in this investigation

## Files Inspected

| File | Purpose |
|------|---------|
| `src/lib/tenantClient.ts` | Tenant schema client creation |
| `src/lib/tenant/contexts.tsx` | EntityProvider, schema resolution |
| `src/hooks/useSettings.js` | Settings fetch/normalize/persist |
| `src/pages/viewQuotationActions.ts` | Quotation data loading |
| `src/hooks/useQuotationViewData.ts` | Quotation view data hook |
| `src/pages/ViewQuotation.tsx` | Quotation view page |
| `src/domain/quotation/pdfDownloadHandler.ts` | PDF generation |
| `src/domain/quotation/previewModel.ts` | Preview model building |
| `src/components/document-view/quotation/QuotationDocumentPreview.tsx` | PDF preview UI |
| `supabase/migrations/20260520090000_core_tables.sql` | Settings table schema |
| `supabase/migrations/20260809000000_provisioning_settings_seed.sql` | Settings seed for new entities |
