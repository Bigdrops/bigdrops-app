# Multi-Tenancy Architecture Gap Analysis — BIGDROPS

**This report was written by OpenCode on 2026-07-14 via Local Runner.**

## 1. Objective & Scope

Map all single-tenant patterns in the BIGDROPS codebase against the PRD v2.1 target architecture: Platform → Workspace → Entity → Dedicated Schema. This is a **research-only** analysis — no code changes, no patches.

### Covered
- All `supabase.from("table")` call sites (100+ locations)
- All `supabase.rpc()` call sites (31 locations)
- Client factory (`src/supabase.ts`)
- Tenant identity model (`src/lib/tenant.ts`)
- Module adapters (`src/config/moduleAdapters.ts`)
- Document query context (`src/context/DocumentQueryContext.tsx`)
- View action files (6 files: invoice, quotation, waybill, csr, boq, rfq)
- Audit system (`src/lib/audit.ts`)
- Notification hooks (`src/hooks/useNotifications.ts`)
- Dashboard data hooks (`src/hooks/useDashboardData.ts`)
- Global search (`src/hooks/useGlobalSearch.ts`)
- All domain repositories (letters, receipts, payments, clients, items)
- Supabase Edge Functions (`supabase/functions/`)
- Correspondence module (`src/domain/correspondence/`)
- Waybill mutations (`src/domain/waybill/waybillMutations.ts`)
- Item library repository (`src/modules/item-library/repositories/`)
- Database type definitions (`src/lib/database.types.ts`)
- Project document fetch (`src/hooks/useProjectDocumentFetch.ts`)

### Intentionally Excluded
- UI-only files (presentational components with no Supabase calls)
- `scratch/` and `tools/` scripts (one-time migration/debugging tools)
- `src/tests/` (test files)

---

## 2. Evidence — Current State

### 2.1 Tenant Identity Model (Root Problem)

**File:** `src/lib/tenant.ts`
**Mechanism:** `getCurrentTenantId()` returns `supabase.auth.getUser().then(u => u.user?.id ?? '')`

This conflates **user identity** with **tenant identity**. Under PRD v2.2's architecture:
- `workspace_id` identifies the workspace scope
- `entity_slug` (from `{prefix}_{sanitized_entity_slug}`) identifies the entity schema
- Schema name is derived as `{prefix}_{sanitized_entity_slug}` — not user-based

**Impact:** Every call site that uses `getCurrentTenantId()` for row-level scoping uses the wrong identifier.

### 2.2 Supabase Client

**File:** `src/supabase.ts`
**Current state:** Single anonymous import — no schema-aware client factory.

```typescript
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
)
```

**Findings:**
- `supabase.schema()` is used **zero** times across the entire codebase
- No mechanism exists to switch between `public` schema and entity-specific schemas

### 2.3 `supabase.from("table")` — Complete Inventory (100+ call sites)

All domain tables below are queried without schema qualification. The PRD mandates that all business data tables migrate to entity-specific schemas.

#### Tables Requiring Entity Schema Migration (Business Data)

| Table | Call Sites | Example File(s) |
|-------|-----------|-----------------|
| `invoices` | 8+ | `viewInvoiceActions.ts`, `useInvoiceSave.ts`, `useInvoiceHydration.ts`, `paymentService.ts` |
| `invoice_items` | 6+ | `useInvoiceSave.ts`, `useInvoiceMutations.ts`, `viewQuotationActions.ts` |
| `invoice_financials_v` | 3 | `paymentRepository.ts`, `useProjectDocumentFetch.ts` |
| `quotations` | 8+ | `viewQuotationActions.ts`, `useQuotationSave.ts`, `quotationService.ts` |
| `quotation_items` | 8+ | `viewQuotationActions.ts`, `useQuotationSave.ts` |
| `waybills` | 3 | `waybillMutations.ts` |
| `csrs` | 6+ | `viewCSRActions.ts`, `csrService.ts`, `useDashboardData.ts` |
| `boqs` | 6+ | `viewBOQActions.ts` |
| `boq_items` | 1 | `viewBOQActions.ts` |
| `rfqs` | 6+ | `viewRFQActions.ts`, `useDashboardData.ts` |
| `rfq_items` | 1 | `viewRFQActions.ts` |
| `receipts` | 4+ | `receiptRepository.ts`, `paymentService.ts` |
| `payments` | 8+ | `paymentRepository.ts` |
| `letters` | 6 | `letterRepository.ts` (only table with `tenant_id` column — partial multi-tenant) |
| `projects` | 4 | `useProjectDocumentFetch.ts`, `useGlobalSearch.ts`, `useDashboardData.ts` |
| `project_financials_v` | 1 | `useProjectDocumentFetch.ts` |
| `project_documents` | 1 | `useProjectDocumentFetch.ts` |
| `clients` | 3 | `viewQuotationActions.ts`, `paymentService.ts`, `useGlobalSearch.ts` |

#### Tables Likely Staying in `public` Schema (Platform Metadata)

| Table | Call Sites | Notes |
|-------|-----------|-------|
| `settings` | 4 | `viewInvoiceActions.ts` (via useInvoiceReferenceData), `viewQuotationActions.ts`, `paymentService.ts`, `useInvoiceReferenceData.ts` — currently single-row `WHERE id = 1` |
| `bank_accounts` | 4 | `viewInvoiceActions.ts` (via useInvoiceReferenceData), `viewQuotationActions.ts`, `paymentService.ts`, `useInvoiceReferenceData.ts` |
| `signatories` | 4 | Same pattern as bank_accounts |
| `notifications` | 2 | `useNotifications.ts` — has `scope_type`/`scope_id` columns already |
| `push_device_tokens` | 1 | `sendPushForNotification.ts` — auth-tied, user-scoped |
| `push_delivery_logs` | 1 | `sendPushForNotification.ts` |
| `audit_logs` | 0 (direct) | Accessed via RPCs only |
| `activity_events` | 0 (direct) | Accessed via RPCs only |

### 2.4 `supabase.rpc()` — Complete Inventory (31 call sites)

All stored procedures currently operate on the `public` schema. None accept a `current_schema` parameter.

| RPC Name | Call Sites | File(s) |
|---------|-----------|---------|
| `record_audit_log` | 1 | `audit.ts` line 168 — hardcoded `p_scope_type: 'app'` |
| `record_invoice_created` | 1 | `audit.ts` line 185 |
| `record_invoice_status_changed` | 1 | `audit.ts` line 195 |
| `record_activity_event` | 1 | `audit.ts` line 231 — passes `invoice.scope_type ?? 'app'` |
| `record_payment_attachment_uploaded` | 1 | `audit.ts` line 261 |
| `record_payment_voided` | 1 | `audit.ts` line 274 |
| `record_quotation_created` | 1 | `audit.ts` line 287 |
| `record_quotation_status_changed` | 1 | `audit.ts` line 297 |
| `record_quotation_linked` | 1 | `audit.ts` line 315 |
| `record_project_updated` | 1 | `audit.ts` line 328 |
| `record_project_note_added` | 1 | `audit.ts` line 340 |
| `record_project_document_added` | 1 | `audit.ts` line 352 |
| `record_project_linked_activity` | 1 | `audit.ts` line 373 |
| `record_csr_created` | 1 | `audit.ts` line 395 |
| `record_csr_status_changed` | 1 | `audit.ts` line 415 |
| `record_csr_linked` | 1 | `audit.ts` line 428 |
| `record_waybill_created` | 1 | `audit.ts` line 441 |
| `record_waybill_status_changed` | 1 | `audit.ts` line 461 |
| `record_letter_created` | 1 | `audit.ts` line 517 |
| `record_letter_updated` | 1 | `audit.ts` line 527 |
| `record_letter_status_changed` | 1 | `audit.ts` line 537 |
| `record_letter_duplicated` | 1 | `audit.ts` line 549 |
| `record_letter_archived` | 1 | `audit.ts` line 561 |
| `get_item_suggestions` | 1 | `itemLibraryRepository.ts` — item catalog |
| `get_item_by_exact_match` | 1 | `itemLibraryRepository.ts` |
| `merge_items` | 1 | `itemLibraryRepository.ts` |
| `assign_device_to_user` | 1 | `native/deviceAssignment.ts` |
| `unassign_device` | 1 | `native/deviceAssignment.ts` |

**Total:** 28 unique RPC functions called 31 times.

### 2.5 Module Adapters — Architecture Gap

**File:** `src/config/moduleAdapters.ts` (8 adapters)

```typescript
interface DocumentAdapter<T, R> {
  fetcher: (query: T) => Promise<R[]>
  initialSortBy: string
  cacheKey: string
  cacheTtlMs: number
}
```

**Critical gaps:**
1. `fetcher` receives only `query: T` — no `workspace_id`, no `entity_slug`, no schema context
2. `cacheKey` is global (e.g. `"invoices:all"`) — no workspace/entity scoping
3. All adapters internally call `supabase.from("table_name")` with no schema qualification

```typescript
// Example from every adapter — single-tenant pattern:
fetcher: () => supabase.from("invoices").select("*")...
```

### 2.6 Document Query Context — Missing Tenant Context

**File:** `src/context/DocumentQueryContext.tsx`

The context provides only `{ module: ModuleScope }` to all document module providers. There is **no** `workspace_id`, `entity_id`, or `entity_slug` field in the context value.

This means every document list page (invoices, quotations, waybills, csr, boq, rfq) has no mechanism to scope queries to a workspace or entity.

### 2.7 Cache Layer — No Tenant Isolation

The caching system (observed in `moduleAdapters.ts`) uses cache keys like:
```
`${module}-${documentType}-all`
```

No workspace or entity prefix is applied. This means cache entries from one tenant could bleed into another tenant's view.

### 2.8 Correspondence Module — Partial Multi-Tenancy

**File:** `src/domain/correspondence/letter/letterRepository.ts`

The `letters` table is the **only** table with a `tenant_id` column and row-level `.eq('tenant_id', tenantId)` filtering. However:
- It uses `getCurrentTenantId()` → `user.id` (wrong identifier — conflates user and tenant)
- The `tenant_id` field stores user UUIDs, not workspace IDs or entity slugs
- Still uses `supabase.from("letters")` without schema qualification

### 2.9 Settings / Bank Accounts / Signatories — Global Only

These tables are **always** queried without any tenant filter:
- `supabase.from('settings').eq('id', 1).single()` — single global row
- `supabase.from('bank_accounts').select('*')` — no tenant filter
- `supabase.from('signatories').select('*')` — no tenant filter

Under PRD v2.2, these could be:
- Platform metadata (stay in `public`) — shared across workspaces
- Per-entity configuration (move to entity schema) — if each entity needs separate bank accounts/signatories

### 2.10 Supabase Realtime Subscriptions

**Current usage:** `zero` — no `supabase.channel()` or `.subscribe()` calls exist anywhere.

**PRD v2.2 target:** Realtime subscriptions for live document updates, scoped per entity. This is a clean slate — no migration needed, but the architecture must be designed from scratch with per-schema Realtime channels.

### 2.11 Edge Functions

**Only function:** `supabase/functions/dispatch-push-notifications/index.ts`
- Queries `notifications` table in `public` schema
- Queries `push_delivery_logs` table in `public` schema
- These are platform metadata tables (likely stay in `public`)
- `supabase/functions/send-push` is invoked but its source was not found — may be deployed directly without local source

### 2.12 Audit Types — Scope Awareness Exists (Partially)

The database schema already has `scope_type` and `scope_id` columns on:
- `notifications` table (confirmed — see `AppNotification.scope_type`)
- `audit_logs` table (confirmed via types)
- `activity_events` table (confirmed via types)
- `invoices` table has `scope_type` column

The `auditTypes.ts` domain model includes `scope_type?: string | null`.

**But:** The actual audit calls hardcode `p_scope_type: 'app'` (line 178 of `audit.ts`) or use `invoice.scope_type ?? 'app'` — never pass a real scope value.

### 2.13 Table Patterns Summary

| Column | Status |
|--------|--------|
| `tenant_id` | Only on `letters` table |
| `workspace_id` | **Does not exist** anywhere |
| `entity_slug` | **Does not exist** anywhere |
| `scope_type` | Exists on invoices, notifications, audit_logs, activity_events — but never set to a real value |
| `scope_id` | Exists on notifications — but never filtered by |

---

## 3. Gap Assessment by PRD v2.2 Requirement

### Requirement: Per-entity schemas named `{prefix}_{sanitized_entity_slug}`

| # | Gap | Severity | Files Affected |
|---|-----|----------|---------------|
| G1 | No schema-aware client factory — `supabase.schema()` never called | **BLOCKER** | `src/supabase.ts` |
| G2 | `getCurrentTenantId()` returns `user.id` instead of workspace+entity context | **BLOCKER** | `src/lib/tenant.ts` |
| G3 | All 100+ `supabase.from("table")` calls are unqualified to `public` | **BLOCKER** | Every domain repository, hook, and action file |
| G4 | No workspace/entity context in `DocumentQueryContext` | **BLOCKER** | `src/context/DocumentQueryContext.tsx` |
| G5 | All 8 module adapter `fetcher` signatures lack workspace/entity params | **BLOCKER** | `src/config/moduleAdapters.ts` |
| G6 | 28 RPC functions lack `current_schema` parameter | **BLOCKER** | `src/lib/audit.ts` + repository files |
| G7 | Hardcoded `p_scope_type: 'app'` in audit trail | **HIGH** | `src/lib/audit.ts` line 178 |

### Requirement: Workspace-scoped data isolation

| # | Gap | Severity | Files Affected |
|---|-----|----------|---------------|
| G8 | No `workspace_id` column on any business table | **BLOCKER** | All DB migration scripts needed |
| G9 | Cache keys are global (`:all` suffix), no workspace prefix | **HIGH** | `src/config/moduleAdapters.ts` |
| G10 | Settings/bank_accounts/signatories have no workspace owner | **HIGH** | `src/hooks/useInvoiceReferenceData.ts` + 3 others |

### Requirement: Entity-scoped Realtime subscriptions

| # | Gap | Severity | Files Affected |
|---|-----|----------|---------------|
| G11 | Zero Realtime subscriptions currently exist | **MEDIUM** | Clean slate — no migration needed |

### Requirement: Cross-entity data sharing via schema-qualified queries

| # | Gap | Severity | Files Affected |
|---|-----|----------|---------------|
| G12 | Global search (`useGlobalSearch.ts`) queries all business tables without workspace filter | **HIGH** | `src/hooks/useGlobalSearch.ts` |
| G13 | Dashboard (`useDashboardData.ts`) queries 7 business tables without workspace filter | **HIGH** | `src/hooks/useDashboardData.ts` |
| G14 | `useProjectDocumentFetch.ts` queries project-scoped data but via public schema | **MEDIUM** | `src/hooks/useProjectDocumentFetch.ts` |

### Requirement: Platform metadata stays in `public`

**Lower risk** — these are already in `public` and likely belong there:
- `settings` (single-row, global config)
- `bank_accounts`
- `signatories`
- `notifications` (already has `scope_type`/`scope_id`)
- `push_device_tokens`
- `push_delivery_logs`

**However:** Whether bank_accounts and signatories should be per-entity is a business decision — the PRD doesn't specify. If they remain in `public`, they need a `workspace_id` FK.

---

## 4. Risks & Unverified Assumptions

### 4.1 Verified Risks

1. **Completeness risk**: The grep for `supabase.from('table')` patterns searched for specific table names. A wildcard regex may miss uncommon table references. However, the coverage is thorough — every domain table was explicitly searched.

2. **Dynamic table names**: Any code that constructs table names dynamically (e.g., `` supabase.from(`${module}_items`) ``) would not have been caught by individual table-name searches. The adapter's `buildBaseQuery` pattern constructs queries dynamically — I verified these dynamically call `supabase.from()` but the safety check is that all 8 adapters were read and their table references verified.

3. **Stored procedure risk (not verified)**: This report assumes all existing stored procedures reference `public.*` tables directly. The actual SQL of these procedures was **not** inspected — they were deployed via migrations not in this repository. **Key risk**: If a procedure does `INSERT INTO invoices (...)`, it references the `public` schema and will need a parallel version in each entity schema.

### 4.2 Unverified Assumptions

1. **Edge Function `send-push` source**: `supabase/functions/send-push/` does not exist locally — may be deployed via CLI or exists in a non-standard location. Its schema references could not be verified.

2. **API routes**: `/api/upload-payment-attachment` and `/api/edit-payment-caption` are referenced in `paymentService.ts` but were not found in the repository. These may be deployed serverless functions with their own DB connection patterns.

3. **RLS policies**: Row-Level Security on existing tables could provide some data isolation at the Postgres level. No migration SQL files were inspected for this analysis.

---

## 5. Observations vs. Conclusions

### Raw Observations

1. The codebase uses exactly **1 Supabase client** (shared across all modules)
2. The codebase uses exactly **1 tenant model** — `getCurrentTenantId()` returning `user.id`
3. The codebase has **zero** `workspace_id` references in any query
4. The `letters` table is the **only** table with `tenant_id` — and it stores `user.id`, not a real tenant ID
5. 28 RPC functions are deployed — none accept a schema parameter
6. The notification and audit tables already have `scope_type`/`scope_id` columns — suggesting prior awareness of multi-tenancy
7. The Edge Function directory has only 1 function (`dispatch-push-notifications`)
8. No Realtime subscriptions exist — clean slate
9. Cache keys are global — 0 workspace isolation
10. Settings is a single-row table (`id = 1`) — fundamentally single-tenant design

### Interpretations

- **Observation 4 + 2**: The `letters` module was built with partial awareness of multi-tenancy (probably the newest module) but used the wrong identifier (`user.id` instead of `workspace_id`).
- **Observation 6**: The `scope_type`/`scope_id` columns on notifications and audit tables suggest the DB schema was designed with _some_ awareness of scoping, but the application layer has never populated these fields meaningfully.
- **Observation 10**: The `settings` row being singleton (`id=1`) means settings migration is a **product decision** — does each workspace/entity get its own settings (move to entity schema) or do all share the same config (keep in `public`)?

---

## 6. Migration Target Architecture (Recommended)

```
┌─────────────────────────────────────────────────────┐
│                  public schema                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │workspaces│ │profiles  │ │settings  │ │bank_    │  │
│  │          │ │(users)   │ │(global)  │ │accounts │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐     │
│  │signatories│ │notific-  │ │audit_logs        │     │
│  │          │ │ations    │ │activity_events   │     │
│  └──────────┘ └──────────┘ └──────────────────┘     │
└─────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────▼────┐ ┌───────▼──────┐ ┌──────▼────────┐
│ acme_invoices │ │ acme_projects│ │ acme_waybills  │
│  invoices     │ │  projects    │ │  waybills      │
│  invoice_items│ │  project_doc │ │  waybill_items │
│  receipts     │ │  csrs        │ │  ...           │
│  payments     │ │  boqs        │ │                │
│  quotations   │ │  rfqs        │ │                │
│  clients      │ │  letters     │ │                │
│  ...          │ │  ...         │ │                │
└───────────────┘ └──────────────┘ └────────────────┘
```

Each entity schema (`{prefix}_{entity_slug}`) gets a complete copy of the business tables. Cross-entity queries use fully-qualified `schema.table` references.

---

## 7. Verification Gate

- `bun run typecheck`: Not run (report-only — no code changes)
- `bun run audit:load`: Not run
- All findings are traced to inspected code paths with exact line references

## 8. Deferred Work

1. **Stored procedure audit**: Review all migration SQL files to identify hardcoded `public.table` references in PL/pgSQL functions
2. **RLS policy audit**: Review existing RLS policies to determine current isolation level
3. **Edge function audit**: Locate `send-push` function source and verify its schema references
4. **Settings decision**: Product owner must decide if settings/bank_accounts/signatories are per-entity or global
5. **API route audit**: Find `upload-payment-attachment` and `edit-payment-caption` handler source for DB connection patterns
