# Phase 2 Scope Extraction — Read-Only Migration Report (v2)

This report was written by OpenCode on 2026-08-09 via Local Runner.

## A. Objective, Scope, and Corrections

This report defines what a "read-only migration" means for the Settings and Clients modules in BIGDROPS multi-tenancy Phase 2.

It replaces `docs/Reports/multi-tenancy/phase-2-scope-extraction-report.md` (v1). V1 had three defects. This report corrects them:

1. **V1 claimed no public settings/clients table existed.** This is false. `public.settings` and `public.clients` exist in `20260520090000_core_tables.sql` and the app reads them today. Details in Section D.
2. **V1 cited `Calculations.ts` as the action taxonomy source.** This is false. The action strings come from the RLS policy installer in the provisioning engine (`view`, `create`, `edit`, `delete`). Details in Section E.
3. **V1 excluded the Clients module as out-of-scope.** This is false. PRD §15 places both Settings and Clients in Phase 2.
4. V1 referenced `useSettings.ts`. The real file is `src/hooks/useSettings.js`.

Scope of this investigation:

- Read-only analysis of repository code and migrations.
- No edits to code, migrations, or SQL.
- No SQL executed against any database.
- No permission rows seeded.
- No `bun run build` (per hardware policy).

## B. Evidence Basis

| Source | File:Line | Establishes |
| --- | --- | --- |
| PRD §15 | `docs/PRD/multi-tenancy/erp-frontend-prd-v1.1.md` | Module list; Phase 2 = Settings + Clients?R? read-only |
| Core tables | `supabase/migrations/20260520090000_core_tables.sql:87` | `public.clients` DDL |
| Core tables | `supabase/migrations/20260520090000_core_tables.sql:101` | `public.settings` DDL |
| Core tables | `supabase/migrations/20260520090000_core_tables.sql:168-169` | RLS enabled on both tables |
| Core tables | `supabase/migrations/20260520090000_core_tables.sql:175-187` | settings/clients policies |
| Multi-tenancy core | `supabase/migrations/20260714000000_multi_tenancy_core.sql:132-171` | `has_entity_permission()` |
| Multi-tenancy core | `supabase/migrations/20260714000000_multi_tenancy_core.sql:173-190` | `apply_permission_template()` |
| Provisioning engine | `supabase/migrations/20260717000000_entity_provisioning_engine.sql:309-360` | `_prov_install_rls()`; SELECT = `view` |
| Frontend tenant context | `src/lib/tenant/contexts.tsx:308-375` | `AuthorizationProvider`; `hasAuthorization` |
| Debug probe (only caller) | `src/pages/debug/TenantDebug.tsx:192` | `hasAuthorization('Invoice','read')` |
| Settings data layer | `src/hooks/useSettings.js:110,196` | Public `settings` upsert + singleton read |

## C. Confirmed Compliance Scope

PRD treats Phase 2 as "read-only migration" for Settings AND Clients. Read here means: legacy documents' reads (branding, client lists, client detail) that today hit `public.settings` and `public.clients` migrate to the tenant (`entity_*`) schema. Writes progress in a later phase.

## D. Current Data-Access Inventory

No module uses `tenantClient` for Settings or Clients reads today. All reads go through the unscoped `supabase` client.

**Settings reads (public.settings)**

| Site | File:Line | Kind |
| --- | --- | --- |
| `useSettings` data layer | `src/hooks/useSettings.js:196` | SELECT `*` id=1 `.single()` |
| `useSettings` data layer | `src/hooks/useSettings.js:110` | UPSERT (write) |
| Invoice reference | `src/hooks/useInvoiceReferenceData.ts:18` | SELECT company_tagline, footer_text id=1 |
| Invoice detail | `src/hooks/useInvoiceDetailData.js:188` | SELECT settings |
| Quotation actions | `src/pages/viewQuotationActions.ts:16` | SELECT settings id=1 |
| Quotation form | `src/pages/QuotationFormPage.tsx:206` | SELECT brand columns |
| Payment service | `src/modules/invoices/services/paymentService.ts:116,146` | SELECT settings + prefix |

**Clients reads and writes (public.clients)**

| Site | File:Line | Kind |
| --- | --- | --- |
| Client list page | `src/pages/Clients.tsx:74,133` | SELECT list; DELETE |
| Client detail | `src/pages/ClientDetail.tsx:150` | SELECT id |
| Add client | `src/pages/AddClient.tsx:16` | INSERT |
| Edit client | `src/pages/EditClient.tsx:20,48` | SELECT; UPDATE |
| Client selector | `src/components/ClientSelector.tsx:72,101` | SELECT; INSERT |
| Invoice detail | `src/hooks/useInvoiceDetailData.js:80` | SELECT id |
| Global search | `src/hooks/useGlobalSearch.ts:41` | SELECT id,name ilike |
| Waybill view | `src/pages/ViewWaybill.tsx:179` | SELECT client |
| CSR view | `src/pages/ViewCSR.tsx:182` | SELECT client |
| Quotation actions | `src/pages/viewQuotationActions.ts:51` | SELECT client |
| Payment service | `src/modules/invoices/services/paymentService.ts:115` | SELECT client |

**Lesson:** the client data surface is not one page. It is the list, detail, edit, a picker, and ad-hoc lookups from invoices, waybills, CSR documents, and global search.

## E. Permission and Authorization Analysis

**RLS actions (DB, authoritative)**

`_prov_install_rls()` generates, for every cloned table:

- SELECT → `has_entity_permission(p_entity_id, auth.uid(), p_resource, 'view')`
- INSERT → `'create'`
- UPDATE → `'edit'`
- DELETE → `'delete'`

`has_entity_permission()` does exact match or wildcard on both resource and action. The resource string for tenancy tables is `settings → 'setting'`, `clients → 'client'`.

**Frontend authorization (client-side, not RLS)**

`AuthorizationProvider` loads `entity_permissions` rows for the current entity+user (`src/lib/tenant/contexts.tsx:333-337`) and exposes `hasAuthorization(resource, action)` which mirrors the wildcard match. The only caller is `TenantDebug.tsx` with `hasAuthorization('invoice','read')`.

**Action-string mismatch**

The DB uses `view`; the one frontend probe uses `read`. They do not match. Because no product module calls `hasAuthorization`, this mismatch has zero runtime impact today, but it is a drift risk.

**Required permission tuples for entity-schema SELECT**

`('setting','view')` and `('client','view')`, or wildcard `('*','view')`.

## F. RLS Reality Check — Public vs Entity Schema

**Public tables (today, live)**

- `public.settings` and `public.clients` both select any authenticated role (`clients_authenticated_select`, `settings_authenticated_select`). Reads work.
- No INSERT policy exists on `public.settings` in the repository. The app's `.upsert` in `useSettings.js` therefore hits a blocked INSERT path (write-side gap, flagged as a Phase 3 item; live DB may differ — not verified).

**Entity schema**

- Clone tables exist: empty. The engine uses `CREATE TABLE ... LIKE`-style clone (structure only, no data).
- RLS FORCE. Select requires `has_entity_permission(...,'view')`. Zero rows → SELECT returns empty.

**Breakage if reads migrate without data or permissions**

- `useSettings.js` does `.single()`; empty result raises "JSON object requested, multiple (or no) rows returned"; the hook falls back to default/local state. Settings UI goes blank.
- Client list returns empty; UI shows no clients.

**Conclusion**

This is the definition of "read-only migration":

1. Either carry the canonical singleton row (public `settings` id=1 then entity) into the tenant table first (data movement, not read-only), or
2. Route reads to `tenantClient` with a deliberate empty-data state (accept blank settings/client lists), or
3. Keep reads on public for Phase 2 and ship only the authorization wiring as the "read-only migration" (interpretation to confirm with the lead).

## G. Preconditions and Blockers

- G1. Entity `settings`/`clients` tables are data-empty. Any migration that switches reads without first backfilling produces blank UI (blocker for option 1/2).
- G1a. The provisioning engine is idempotent but re-provisioning clones structure again; it does not backfill. Re-provisioning would not repair data.
- G2. The canonical settings singleton uses id=1 in public. The entity row id is undefined. This "canonical tenant-settings key" remains unresolved (v1 raised it; still open).
- G3. `hasAuthorization` does not gate RLS. Seeding `('setting','view')` / `('client','view')` is required for entity reads to return rows. Seeding is a data action (out of read-only scope).
- G4. The action string mismatch (`view` vs `read`) needs one shared constant if authorization is to be enforced.
- G5. Repo-vs-live: only the repository was inspected. Production RLS/provisioned schemas were not verified.

## H. Recommendations (read-only path)

1. Decide interpretation C.3 vs C.2 (public-read-first vs tenant-read-with-fallback) with the project lead before any code change. This decision is the "definition of read-only migration" the report must close.
2. Backfill should be a provisioning step (`SELECT ... INTO entity_*.settings FROM public.settings` guarded for id=1), added to the engine or a dedicated migration script — Phase 3, but the engine must be updated to not drop data on re-provision.
3. Wire `tenantClient` (`tenantClient.from('settings')`, `tenantClient.from('clients')`) behind a single seam (e.g., the existing `src/hooks/useSettings.js` and a new clients data hook), so call sites in Section D do not each change directly.
4. Standardize `view` as both the DB and the frontend action token; drop the `'read'` in `TenantDebug`.
5. Phase 3 will add the missing `settings` INSERT policy and migrate writes.

Deferred work (intentionally not done): no code, no migration, no SQL, no seeding.