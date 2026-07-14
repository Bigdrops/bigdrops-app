# Round 2 — Multi-Tenancy Architecture Review & Migration Blueprint

This report was written by OpenCode on 2026-07-14 via Local Runner.

---

## 1. Objective & Scope

This document provides a comprehensive technical analysis of the BIGDROPS codebase
for migrating from a single-tenant to a schema-per-entity multi-tenant architecture,
as specified in `docs/PRD/multi-tenancy/multi-tenancy-prd-v2.1.md` (PRD v2.1).

**Covered:**
- Five analysis angles: Backend Architecture, Database Optimization, Security Architecture,
  Frontend Implementation, and Code Review/Cross-Cutting.
- Completed corrections from Round 1 (already applied to
  `docs/Reports/architecture/multi-tenancy-gap-analysis.md`).
- Line-level evidence from 20+ codebase files.

**Explicitly excluded:**
- UI design changes for entity/workspace switching (a separate UX concern).
- Performance benchmarking or load testing.
- Specific SQL migration scripts (to be written in Round 3).
- Build/CI pipeline changes.

---

## 2. Source Documents

| Document | Path | Status |
|----------|------|--------|
| PRD v2.1 (authoritative) | `docs/PRD/multi-tenancy/multi-tenancy-prd-v2.1.md` | Final |
| Round 1 report (corrected) | `docs/Reports/architecture/multi-tenancy-gap-analysis.md` | Corrected |
| PRD report (supplementary) | `docs/Reports/GENERAL/multi-tenancy-prd-report.md` | Supplementary |
| Frontend audit (supplementary) | `docs/Reports/GENERAL/multi-tenancy-frontend-audit.md` | Supplementary |

---

## 3. Codebase Evidence Summary

Files read for evidence (20+):

| File | Relevance | Key Finding |
|------|-----------|-------------|
| `src/supabase.ts` | DB client | Single supabase client. No schema routing. Timeout + retry wrapper. |
| `src/lib/tenant.ts` | Tenant identity | `user.id` as tenant ID. No workspace/entity concept. |
| `src/lib/Calculations.ts` | Domain math | Pure functions. No DB access. LOCKED - must not change. |
| `src/config/moduleAdapters.ts` | Data layer | 8 adapters, 769 lines. Hardcoded table names, global cache keys. |
| `src/context/DocumentQueryContext.tsx` | State mgmt | Centralized query store. No workspace/entity context. |
| `src/hooks/useDocumentSave.ts` | Persist pattern | Generic save strategy. Single injection point. |
| `src/hooks/useInvoiceSave.ts` | Persist impl | `supabase.from("invoices")` direct. No schema prefix. |
| `src/domain/invoice/*` | Domain layer | Clean domain - no DB access. Good separation. |
| `src/domain/prefixConstants.ts` | Prefixes | `DEFAULT_PREFIXES`, `resolvePrefix()` - global defaults. |
| `src/lib/cache/listCache.ts` | Caching | Global `bd:list:...` cache keys. No tenant isolation. |
| `src/lib/audit.ts` | Audit trail | `audit_activity` table, public schema, no workspace_id. |
| `src/modules/invoices/services/*` | Module services | Mix domain + direct DB. Service layer pattern present. |
| `src/modules/invoices/repositories/*` | Module repos | Encapsulated DB access. Template for entity-aware repos. |
| `src/pages/` | Routes | 60+ pages. No workspace parameter in routes. |
| Migrations: `*core_tables.sql`, `*invoices.sql` | DB schema | All in `public` schema. No workspace_id. RLS by role. |
| `src/lib/userFacingMutationErrors.ts` | Errors | Mutation error handling - needs entity context. |
| `src/lib/feedback.ts` | Feedback | Toast/notification feedback - no entity awareness. |

---

## 4. Backend Architecture Review

### 4.1 Current Architecture

```
src/
  lib/
    tenant.ts           → maps user.id as tenant (single)
    Calculations.ts     → pure math (LOCKED)
    audit.ts            → direct supabase calls
  supabase.ts           → single client, public schema only
  hooks/
    useDocumentSave.ts  → generic strategy pattern
    useInvoiceSave.ts   → concrete save with "invoices" hardcoded
  modules/
    invoices/services/  → service layer (mix domain + DB)
    invoices/repositories/ → DB read/write encapsulation
```

### 4.2 PRD v2.1 Requirements

- Schema-per-entity: `entity_{workspace_slug}_{entity_slug}`
- Business tables inside entity schemas have NO workspace_id column
- Public schema holds: auth, profiles (baseline), cross-entity lookups
- Each entity schema gets a complete copy of all business tables
- Cross-entity queries use fully-qualified `schema.table`

### 4.3 Gap Analysis

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Schema routing | None. All `supabase.from("table_name")` | Need client wrapper or connection string per schema |
| Entity-aware tenant.ts | `user.id` only, no workspace | Need workspace resolution + membership check |
| Domain layer isolation | Clean domain per doc type | Good — domain doesn't need entity awareness |
| Repositories with schema | Some exist (invoices) but no schema param | Repos need `schema` parameter |
| Service layer | Mix of pure domain + DB calls | Services need schema routing for DB access |
| Audit trail scoping | No workspace/entity scope | Need workspace_id in audit_activity |
| Prefix engine per entity | `resolvePrefix()` is global | Need entity-scoped prefix config |
| Calculations.ts | Locked pure math | No change needed |
| Startup schema creation | Not implemented | Need migration scripts for CREATE SCHEMA IF NOT EXISTS |

### 4.4 Migration Strategy

**Phase 1 — Schema + Client Layer:**
1. Add `workspaces` and `entity_workspace_members` tables to public schema
2. Create a `schemaRouter.ts` utility that resolves `entity_workspace_slug` + `entity_slug` to schema name
3. Wrap `supabase` client with a schema-aware proxy: `getEntityClient(schemaName)` or `supabase.from("schema.table")`

**Phase 2 — Repositories:**
1. Update all repositories (modules/*/repositories/) to accept optional `schema: string` parameter
2. Repositories generate `from(\`${schema}.table\`)` when schema is provided

**Phase 3 — Services + Hooks:**
1. Wire entity context through `DocumentQueryContext` (or equivalent)
2. Update all useDocSave strategies to pass schema to persist()
3. Update module adapters to accept workspace context

**Phase 4 — Data Migration:**
1. Create entity schemas via migration
2. COPY data from public into each entity schema
3. Verify data integrity
4. Switch traffic to entity-schema paths

### 4.5 Key Files to Change

| File | Change Required | Complexity |
|------|----------------|------------|
| `src/supabase.ts` | Add schema routing wrapper | Medium |
| `src/lib/tenant.ts` | Add workspace resolution | High |
| `src/lib/audit.ts` | Add workspace_id / schema scope | Medium |
| `src/config/moduleAdapters.ts` | 8 adapters need schema param | High (769 lines) |
| `src/hooks/useDocumentSave.ts` | Pass schema to persist | Low |
| `src/hooks/useInvoiceSave.ts` | Use schema in FROM clause | Low |
| All other `use*Save.ts` files (7+) | Same as invoice | Low each |
| `src/context/DocumentQueryContext.tsx` | Add entity/workspace context | Medium |
| `src/domain/prefixConstants.ts` | Add entity-specific prefix config | Medium |

---

## 5. Database Optimization Review

### 5.1 Current Schema Layout

All 12 migrations create tables in `public` schema. Key tables:

```
public.profiles          → user profiles, role, is_approved
public.clients           → business clients
public.invoices          → scope_type DEFAULT 'app', no workspace_id
public.invoice_items     → FK to invoices
public.payments          → FK to invoices
public.quotations        → separate table, no workspace_id
public.quotation_items   → FK to quotations
public.waybills          → separate table
public.boqs, rfqs, csrs  → separate tables each
public.receipts          → payment receipts
public.letters           → document letters
public.items_catalog     → shared catalog
public.devices           → ??? (legacy?)
public.audit_activity    → audit trail, no workspace_id
public.signatories       → digital signatures
public.bank_accounts     → payment details
public.settings          → global settings (single row)
```

### 5.2 PRD v2.1 Schema Requirements

```
public.* → auth + profiles + membership + cross-entity refs (clients, shared catalog)
entity_{workspace}_{entity_slug}.* → invoices, invoice_items, quotes, items, settings, etc.
```

Business tables inside entity schemas: **NO workspace_id** column.
Schema isolation replaces row-level tenant ID.

### 5.3 Gap Analysis

| Aspect | Current | Required | Gap Severity |
|--------|---------|----------|-------------|
| Schema location | All public | Per-entity schemas | CRITICAL |
| workspace_id | None on any table | Not needed (schema isolated) | ACCEPTABLE |
| RLS | role-based (`auth.role() = 'authenticated'`) | Per-schema RLS checking workspace membership | HIGH |
| Foreign keys | Within public only | Within entity schema only | MEDIUM |
| Indexes | Primary keys only | Add entity-scoped indexes | LOW |
| settings | Single row (id=1) | Per-entity settings | MEDIUM |
| audit_activity | No workspace_id | Add workspace_id column | MEDIUM |
| signatories | Public | Entity-scoped signatories | MEDIUM |

### 5.4 Key Finding: `scope_type` on invoices

`invoices` has `scope_type text DEFAULT 'app'::text`. This suggests the schema
already anticipated scoping but never implemented it. The `scope_type` column
could be repurposed or its usage pattern verified before removal.

### 5.5 Migration SQL Patterns Needed

1. `CREATE SCHEMA IF NOT EXISTS entity_{slug}`
2. `CREATE TABLE entity_{slug}.invoices (LIKE public.invoices INCLUDING ALL)`
3. `INSERT INTO entity_{slug}.invoices SELECT * FROM public.invoices WHERE ...`
4. Per-schema RLS: `ALTER SCHEMA entity_{slug} OWNER TO ...`
5. Foreign key re-creation within schema

### 5.6 Recommendations

- Keep one migration file per schema creation batch
- Use `LIKE public.tablename INCLUDING ALL` for structural copy
- Use `INSERT ... SELECT` for data migration (batch if large)
- After migration, drop public tables that moved to entity schemas
- Keep `public.clients` as cross-entity reference (shared address book)
- Keep `public.items_catalog` as shared product catalog (PRD v2.1 specifies shared catalog)

---

## 6. Security Architecture Review

### 6.1 Current Security Model

| Protection | Implementation | Status |
|-----------|---------------|--------|
| Authentication | Supabase Auth + anon key guard | Working |
| Row-level security | `auth.role() = 'authenticated'` (most tables) | Weak |
| Admin check | `auth.jwt() ->> 'role' = 'admin'` (profiles only) | Partial |
| Ownership stamping | `stamp_row_ownership()` in migrations | Good |
| API access | Supabase anon key validated (not service_role) | Good |
| Audit trail | `audit_activity` table, per-document operations | Present |
| Tenant isolation | **NONE** | **CRITICAL GAP** |

### 6.2 PRD v2.1 Security Requirements

- Schema-per-entity = schema-level isolation at Postgres level
- RLS per-schema: user must be member of workspace to access schema
- Cross-entity access denied even at connection level
- Audit trail must include workspace/entity context

### 6.3 Gap Analysis

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Schema-level isolation | None. All tables in public | Need CREATE SCHEMA + grant per user |
| Workspace membership | No membership concept | Need entity_workspace_members table |
| Per-schema RLS | None | Need trigger/function per schema |
| Cross-entity access control | No mechanism | Schema routing prevents cross-entity reads |
| Audit scoping | No workspace_id | Add workspace_id column + populate |
| Document number security | Global prefix/sequence | Per-entity prefix + sequence |
| Data export isolation | None | Schema dump per entity |

### 6.4 Security Migration Path

**Phase 1 — Membership Infrastructure:**
```sql
CREATE TABLE public.entity_workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ewm_user ON public.entity_workspace_members(user_id);
```

**Phase 2 — Per-Schema RLS:**
```sql
-- Applied to each entity schema
CREATE OR REPLACE FUNCTION entity_{slug}.check_member()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entity_workspace_members
    WHERE user_id = auth.uid()
    AND workspace_id = <workspace_id_for_schema>
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE entity_{slug}.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_access ON entity_{slug}.invoices
  FOR ALL USING (entity_{slug}.check_member());
```

**Phase 3 — Audit Trail Enhancement:**
```sql
ALTER TABLE public.audit_activity ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
ALTER TABLE public.audit_activity ADD COLUMN entity_schema TEXT;
```

### 6.5 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data leak during migration | HIGH | Use COPY, verify row counts before switching traffic |
| Schema creation failure | MEDIUM | Wrapping in transaction with rollback |
| Incomplete RLS on new tables | HIGH | CI check: verify RLS enabled on all entity tables |
| Auditing gap during switch | MEDIUM | Dual-write audit before/after switch |
| Lost cross-entity FKs | MEDIUM | Document cross-entity queries explicitly |

---

## 7. Frontend Implementation Review

### 7.1 Current Frontend Architecture

```
src/
  context/DocumentQueryContext.tsx  → query store, no entity context
  config/moduleAdapters.ts         → 8 adapters, global keys
  pages/                           → 60+ pages, no workspace param
  hooks/
    useDocumentSave.ts             → generic, no schema
    useInvoiceSave.ts              → "invoices" hardcoded
    use*Save.ts (6+ others)        → same pattern
  components/
    invoice/                       → assume public schema
    waybill/                       → assume public schema
    etc.
  lib/
    cache/listCache.ts             → "bd:list:invoices:v1:all" keys
    feedback.ts                    → global toast, no entity tag
```

### 7.2 Hot Paths Identified

**Read Path (list + detail):**
1. `DocumentQueryContext` loads query config
2. `moduleAdapters.ts` runs fetcher: `supabase.from("invoices").select(...)`
3. Result cached via `listCache.ts` with global key
4. UI components render from cache/store

**Write Path (create + edit):**
1. Form collects data → validators in `useInvoiceSave.ts`
2. `persist()` calls `supabase.from("invoices").insert(payload)`
3. `afterSave()` writes `invoice_items` + audit trail
4. `listCache.ts` invalidates global key

**Both paths require entity schema routing at every DB touch point.**

### 7.3 Gap Analysis

| Layer | Current | Required | Touch Points |
|-------|---------|----------|-------------|
| Query context | No entity scope | Add workspace + entity to context | 1 context |
| Module adapters | "invoices" hardcoded | Schema prefix in FROM | 8 adapters |
| Cache keys | `"bd:list:invoices:v1:all"` | `"bd:{workspace}:list:invoices:v1"` | 5-10 cache calls |
| Save hooks | `from("invoices")` | `from("entity_schema.invoices")` | 8 save hooks |
| Pages | No workspace param | `/workspace/:slug/invoices/...` | 60+ route refs |
| Route files | No entity nesting | Add workspace layout route | 3-5 route config files |
| Login flow | No workspace selection | Entity/workspace picker | 1 page |
| Settings page | Single global row | Per-entity settings | ~10 setting components |
| Component lib | No entity awareness | Pass entity context via props | 50+ components |

### 7.4 Migration Strategy

**Phase 1 — Context (lowest risk, highest leverage):**
1. Add `EntityWorkspaceProvider` wrapping the app
2. Store current workspace + entity in React Context
3. Provide `getSchema()` function in context

**Phase 2 — Cache + Data Layer:**
1. Update `listCache.ts` to accept optional workspace prefix
2. Update `moduleAdapters.ts` adapters to read workspace from a closure/import
3. Verify: list queries produce entity-isolated results

**Phase 3 — Persistence:**
1. Update `useDocumentSave.ts` to accept schema parameter
2. Update all concrete save hooks to pass schema
3. Verify: creates go to correct entity schema

**Phase 4 — Routes:**
1. Add workspace param to route definitions
2. Update all page navigation to include workspace slug
3. Verify: URL reflects workspace context

### 7.5 Component Impact Inventory

| Component Group | Count | Change Required | Risk |
|----------------|-------|----------------|------|
| Invoice: Form, List, Preview, PDF, Actions | ~15 components | Pass entity context | MEDIUM |
| Waybill: Form, List, Print | ~8 components | Pass entity context | MEDIUM |
| Quotation: Form, List, View | ~10 components | Pass entity context | MEDIUM |
| Library components (ui/) | ~20 components | None (no direct DB access) | LOW |
| PDF renderers | ~5 components | None (receive data) | LOW |
| Layout/Nav | ~3 components | Add workspace picker | MEDIUM |
| Settings | ~10 components | Load per entity | MEDIUM |
| Auth/Login | ~2 components | Add workspace selection | MEDIUM |

Total rough estimate: **~55-65 components** need entity context propagation.

---

## 8. Cross-Cutting Code Review

### 8.1 Pattern Analysis

**Strong Patterns (preserve):**
- Domain layer (`src/domain/`) is clean of DB access across all modules
- `useDocumentSave` generic strategy pattern is a good injection point
- Module repositories encapsulate table-specific queries
- Audit trail is modular (`src/lib/audit.ts`)

**Weak Patterns (need change):**
- `moduleAdapters.ts` has hardcoded everything (769 lines, 8 adapters)
- `listCache.ts` uses global keys
- All persistence hooks call `supabase.from("tablename")` directly
- No existing workspace/entity types
- No existing workspace context provider

### 8.2 GR-2 Summary (from Round 1, verified correct)

| GR-2 Requirement | Status | Verdict |
|-----------------|--------|---------|
| tenant.ts maps user.id | Confirmed (line 15-18) | **CORRECT** |
| MODULE_SLUG assignment | Confirmed (= alias) | **CORRECT** |
| moduleAdapters.ts fetch | Confirmed (hardcoded tables) | **CORRECT** |
| DocumentQueryContext initialStates | Confirmed (no entity) | **CORRECT** |
| listCache.ts key | Confirmed ("v1:all" suffix) | **CORRECT** |
| App.tsx moduleAdapters import | Confirmed | **CORRECT** |

### 8.3 New Findings

**F1: MySQL migration file present**
`supabase/migrations/20260520090003_invoices.sql` also creates waybill_stops table
and has MySQL-compatible DDL that wouldn't run cleanly on Postgres. Verify this file
is actually applied (it may be vestigial).

**F2: `scope_type` on invoices**
Column `scope_type text DEFAULT 'app'::text` suggests previously planned scoping.
Investigate if any code reads this column before removing.

**F3: `useDocumentSave` is the ideal injection point**
The generic strategy pattern with `persist(input, payload, {isCreate, id})` is well-designed
for adding a schema parameter — it's the single place to intercept.

**F4: No cross-entity queries currently exist**
All joins are within the same table family (invoice ↔ invoice_items). Cross-entity queries
(same query across multiple entity schemas) have no current precedent. PRD v2.1 will
require aggregate dashboards that UNION from multiple entity schemas.

### 8.4 Recommendations

1. **Don't change domain layer** — it's pure computation and shouldn't know about entities
2. **Don't change PDF renderers** — they receive already-shaped data
3. **Don't change `Calculations.ts`** — it's LOCKED and entity-agnostic
4. **Do wrap `supabase`** — single proxy for schema routing is the highest-leverage change
5. **Do update `moduleAdapters.ts` first** — it's the most centralized data access point
6. **Do make `useDocumentSave` entity-aware** — 8 save hooks inherit for free
7. **Do add workspace/entity context early** — all frontend code depends on it

### 8.5 Deferred Work

Items intentionally deferred to future rounds:
- React Query migration (optional, not required for multi-tenancy)
- Dashboard cross-entity UNION queries (Phase 5)
- Dynamic schema creation via admin API (Phase 4)
- Entity-level prefix UI in settings (Phase 4)

---

## 9. Implementation Plan Summary

### Phase 1 — Infrastructure (1-2 weeks)
1. Create workspace/entity membership tables in public schema
2. Add schema routing wrapper to Supabase client
3. Create EntityWorkspaceProvider React context
4. Implement entity-scoped prefix config

### Phase 2 — Data Layer (2-3 weeks)
1. Update repositories to accept schema parameter
2. Update moduleAdapters with schema-aware fetchers
3. Update listCache with workspace-prefixed keys
4. Wire entity context into DocumentQueryContext

### Phase 3 — Persistence (1-2 weeks)
1. Update useDocumentSave to pass schema to persist
2. Update all concrete save hooks (invoice, quotation, waybill, etc.)
3. Update audit trail with workspace_id
4. Verify: all CRUD operations write to correct entity schema

### Phase 4 — Route + UI (2-3 weeks)
1. Add workspace/:slug prefix to route definitions
2. Update all navigation to include workspace context
3. Add workspace picker to login/post-login flow
4. Update settings and misc pages

### Phase 5 — Data Migration (3-4 weeks)
1. Write CREATE SCHEMA per entity
2. Write COPY scripts for each business table
3. Verify row counts match
4. Drop public business tables (keep shared tables)
5. Implement cross-entity dashboard queries

**Total estimate: 9-14 weeks engineering effort**

---

## 10. Verification Gate

- `bun run typecheck` — must pass with zero errors
- `bun run audit:load` — must pass (query pattern check)
- `git status` — confirm no unintended files modified
- `bun run build` — SKIPPED per AGENTS.md (4GB RAM constraint)

---

## 11. Risks & Limitations

1. **Sub-agent dispatch non-functional.** Round 2 analysis was self-completed.
   Task dispatch returns "no such column: replacement_seq" error — likely a tool
   framework bug. No sub-agent reviews were possible.

2. **4GB RAM constraint** prevents full build testing. CI/build pass must be
   validated by project lead.

3. **Estimated ~55-65 components** need entity context propagation. This is the
   highest-risk area for regressions (form components that silently lose context).

4. **No existing multi-tenant test infrastructure.** No test utilities for
   tenant switching, mock schema setup, or entity context injection.

5. **`scope_type` column usage unknown.** Column exists on invoices but no code
   was found that reads it. Verify before removal or repurpose.

6. **Postgres schema permissions** need careful management. `CREATE SCHEMA`
   requires elevated privileges that may not be available in Supabase managed
   Postgres. Verify schema creation approach with Supabase admin.

---

## 12. Deferred Work

- React Query migration (optional optimization)
- Dynamic schema creation UI (admin panel feature)
- Entity-level prefix configuration page
- Cross-entity dashboard UNION queries
- Performance benchmarking of schema-routed vs public queries
- Audit trail indexing for cross-entity search
