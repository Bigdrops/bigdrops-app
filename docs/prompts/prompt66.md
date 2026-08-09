You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It strictly enforces project fundamentals, locked math/rules, audit-first workflow,
skills registry, and standards conformity. Follow it completely.

====================================================================
CONTEXT
====================================================================
Phase 1 multi‑tenant frontend infrastructure is COMPLETE and verified live
in production:
- WorkspaceProvider → EntityProvider → AuthorizationProvider → Tenant Client
- /debug/tenant diagnostic page
- Tenant schema: entity_bigdrops-main_main
- Provisioning status: ready
- Entity permissions seeded: ('setting','view') and ('client','view')
- Entity settings row: id=1, company_name='BIGDROPS', default prefixes

This is Phase 2: read‑only migration for Settings and Clients.
The objective is to route all existing read paths for these two modules
through the Tenant Client, so they read from the entity schema instead
of the public schema. Writes remain on the public schema for now.
No new permission checks are added in this phase; authorization is
enforced by the tenant schema's RLS (requires 'view' on resource).

====================================================================
TARGET FILES & CURRENT STATE
====================================================================
All reads currently use the unscoped `supabase` client (public schema).

Settings reads:
- src/hooks/useSettings.js:196  – SELECT * FROM settings WHERE id=1 .single()
- src/hooks/useInvoiceReferenceData.ts:18 – SELECT company_tagline, footer_text FROM settings id=1
- src/hooks/useInvoiceDetailData.js:188 – SELECT settings
- src/pages/viewQuotationActions.ts:16 – SELECT settings id=1
- src/pages/QuotationFormPage.tsx:206 – SELECT brand columns from settings
- src/modules/invoices/services/paymentService.ts:116,146 – SELECT settings + prefix

Clients reads:
- src/pages/Clients.tsx:74,133 – SELECT list; DELETE (only reads are in scope)
- src/pages/ClientDetail.tsx:150 – SELECT client by id
- src/components/ClientSelector.tsx:72 – SELECT list
- src/hooks/useInvoiceDetailData.js:80 – SELECT client by id
- src/hooks/useGlobalSearch.ts:41 – SELECT clients ilike
- src/pages/ViewWaybill.tsx:179 – SELECT client
- src/pages/ViewCSR.tsx:182 – SELECT client
- src/pages/viewQuotationActions.ts:51 – SELECT client
- src/modules/invoices/services/paymentService.ts:115 – SELECT client

The Tenant Client is already implemented and ready:
- src/lib/tenantClient.ts exports createTenantClient(supabase, schemaName)
- EntityProvider exposes the resolved schema and tenantClient via context
- The useTenantClient() hook is available

====================================================================
REQUIRED CHANGES
====================================================================
Before modifying any call site, inspect the existing Tenant Client and
EntityProvider APIs and the calling chain for that file. Reuse the
existing Phase-1 access pattern wherever one exists. Do not invent a
second tenant resolution mechanism.

For each read site listed above, route the read through the existing
Tenant Client architecture:

1. From React components and custom hooks, use useTenantClient() (or the
   equivalent Phase-1 hook) to obtain the resolved tenant client.
2. From non-React services, utility modules, or action/data-layer functions
   where React hooks cannot be called, use the existing project's supported
   tenant-client injection/access pattern (e.g., receiving the tenant client
   as a parameter from the calling component). Do NOT call a React hook from
   a service or utility function, and do NOT invent a new global Supabase
   client, singleton, or alternate tenant-resolution mechanism. The resolved
   tenant client must ultimately come from the Phase-1 EntityProvider/Tenant
   Client architecture.
3. Replace supabase.from('settings') with tenantClient.from('settings') for
   read queries only.
4. Replace supabase.from('clients') with tenantClient.from('clients') for
   read queries only.
5. Do NOT change the query structure (filters, .single(), .select(), etc.)
   except the client instance.
6. Do NOT change any write operations (INSERT, UPDATE, DELETE, upsert) –
   they must continue using the public-schema supabase client.
7. Do NOT add hasAuthorization() checks or any other permission gating
   beyond what RLS already provides.
8. Do NOT modify src/supabase.ts.
9. Do NOT introduce dual‑source fallback (e.g., "try tenant, fall back to public").
   The tenant client is the sole data source for these reads after migration.

SCOPE GUARD: Some Settings/Clients reads are embedded inside Invoice,
Quotation, Waybill, CSR, search, and payment flows. Migrate ONLY the
specific settings/clients READ query identified in the inventory above.
Do NOT migrate any other table, query, write operation, or module data
access merely because it appears in the same file.

Keep changes minimal and localized to the existing data-access path.
Small parameter/signature plumbing changes are permitted when required
to pass the existing Phase-1 Tenant Client into non-React services or
utilities. Do not restructure modules or introduce new architecture.

Special handling for useSettings.js:
- Line 196 performs a SELECT (read) – migrate to tenantClient.
- Line 110 performs an upsert (write) – must remain on the public-schema
  supabase client.
- If the hook's read and write paths share the same client reference
  internally, split them so the read uses tenantClient and the write
  continues using the public supabase client. Do not let the read
  migration accidentally move the write path.

Special handling for Clients.tsx:
- Line 74 performs a SELECT (read) – migrate to tenantClient.
- Line 133 performs a DELETE (write) – must remain on the public-schema
  supabase client.
- Ensure the two operations use different client instances after migration.

Clients empty-state expectation:
- The entity‑schema clients table is empty. The UI must handle an empty
  list gracefully (no rows, no error). Do NOT add backfill logic; empty is
  the correct Phase 2 starting state.

====================================================================
CONSTRAINTS
====================================================================
- Read‑only migration ONLY. Do NOT migrate writes, deletes, or upserts.
- No dual‑source fallback (no public schema read as backup).
- No new permission checks or authorization UI.
- Do NOT run bun run build.
- Do NOT start Docker or Supabase local development.

====================================================================
VERIFICATION (HARD GATES)
====================================================================
After all changes, run:
bun run typecheck
bun run audit:load

Both must pass with zero new errors.

Manual verification (if a production browser session is available):
- Load the Settings page and confirm company_name and document prefixes
  are displayed (reading from tenant schema).
- Load the Clients list and confirm it loads without error (empty list
  is acceptable).
- Reload /debug/tenant and confirm Tenant Client Ready is 'yes' and
  Schema Name is entity_bigdrops-main_main.

If manual verification cannot be performed, state this explicitly in
the report.

====================================================================
OUTPUT
====================================================================
Report exactly:
- Files modified and the nature of each change.
- Typecheck result.
- Audit result.
- Whether manual verification was performed and the result.
- Any remaining blockers.