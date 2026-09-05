# PostgREST Tenancy Architecture Alignment Audit

This report was written by opencode (mimo-v2.5-free) on 2026-09-04 via Local Runner.

## Objective

Compare the current PostgREST schema-exposure design against the three-PRD tenancy architecture defined in `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`, identify alignment and gaps, and answer all specified architecture questions.

## Scope

- All SQL migrations in `supabase/migrations/`
- Edge Function `supabase/functions/postgrest-schema-exposure/index.ts`
- Client-side tenant routing (`src/lib/tenant/`, `src/lib/tenantClient.ts`)
- RLS policies across public and tenant schemas
- `live-public-schema.sql` (authoritative DB snapshot)
- PRD: `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`

---

## Architecture Alignment: PRD vs Implementation

### 1. Workspace Management

**PRD Definition:** Workspace = top-level grouping. One workspace per pending approval. Platform Office approves/suspends.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `workspaces` table | ✅ | `id`, `slug`, `name`, `status`, `created_by`, `created_at`, `updated_at`, `updated_by` | ✅ |
| Status enum | `pending_approval`, `active`, `suspended`, `archived` | Same | ✅ |
| Ownership | Creator becomes owner on approval | `approve_workspace()` inserts owner into `workspace_members` | ✅ |
| One pending per creator | Unique index on `created_by WHERE status='pending_approval'` | Implemented | ✅ |
| Platform approval | Platform Office approves | `approve_workspace()` — SECURITY DEFINER, owner-only | ✅ |

**File:** `supabase/migrations/20260714000000_multi_tenancy_core.sql:10-18`

### 2. Workspace Membership

**PRD Definition:** Membership = relationship between user and workspace. Not the same as entity permissions. Joining workspace does NOT automatically grant entity access.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `workspace_members` table | ✅ | `id`, `workspace_id`, `user_id`, `role` (`owner`/`member`), `permissions` (jsonb), `joined_at` | ✅ |
| Role semantics | Owner vs member | Same | ✅ |
| Membership ≠ entity access | Explicit, not automatic | Correct — `entity_permissions` is separate | ✅ |
| Owner can manage members | ✅ | INSERT/UPDATE/DELETE policies check `is_workspace_owner()` | ✅ |
| Invitations | ✅ | `workspace_invitations` + `workspace_invitation_entity_grants` tables | ✅ |

**File:** `supabase/migrations/20260714000000_multi_tenancy_core.sql:20-29`

### 3. Team Management

**PRD Definition:** Team = optional subgroup within workspace. Teams have their own permissions.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `teams` table | ❌ | NOT IMPLEMENTED | ❌ |
| `team_members` table | ❌ | NOT IMPLEMENTED | ❌ |
| `team_permissions` table | ❌ | NOT IMPLEMENTED | ❌ |
| Frontend "team" | ✅ | UI layer over `workspace_members` | ⚠️ |

**Gap:** The PRD defines teams as a distinct concept from workspace membership. The implementation collapses teams into workspace_members in the UI. No SQL tables exist for teams.

**File:** `src/domain/team/teamTypes.ts`, `src/hooks/useTeamMembers.ts`

### 4. Entity/Company Management

**PRD Definition:** Entity = company/workspace within the system. Each entity gets its own PostgREST schema. Provisioning creates schema + clones structure.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `entities` table | ✅ | `id`, `workspace_id`, `slug`, `display_name`, `entity_type`, `is_active`, timestamps | ✅ |
| Schema naming | `entity_{workspace}_{entity}` | Same convention | ✅ |
| Provisioning pipeline | ✅ | 16-step `provision_entity()` SECURITY DEFINER | ✅ |
| Provisioning status | ✅ | `entity_provisioning_status` with states: `pending`, `creating`, `ready`, `failed`, `purging`, `purged` | ✅ |
| Idempotency | ✅ | Advisory lock + status check | ✅ |
| Template source | `tenant_master_template` | Created from `entity_bigdrops-main_main` | ✅ |
| RLS installation | ✅ | `_prov_install_rls` dynamically generates per-entity policies using `has_entity_permission()` | ✅ |
| Tenant RPCs | ✅ | `_prov_install_tenant_rpcs` copies functions with schema-qualified bodies | ✅ |

**File:** `supabase/migrations/20260717000000_entity_provisioning_engine.sql`

### 5. Entity → Tenant Schema Mapping

**PRD Definition:** Schema name derived from workspace + entity slugs. No stored mapping column.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| Derivation | `entity_{workspace_slug}_{entity_slug}` | Same | ✅ |
| Stored mapping | Not stored (derived at runtime) | `_prov_get_schema_name()` derives it; no column in `entities` | ✅ |
| Client resolution | `useEntity()` computes `schemaName` from `workspace.slug` + `entity.slug` | Same | ✅ |

**File:** `src/lib/tenant/contexts.tsx`

### 6. Tenant Schema Isolation

**PRD Definition:** Business data lives only in entity schemas. Public schema holds only platform metadata. RLS enforces per-entity access.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| Business data in tenant schemas | ✅ | All 15+ tables cloned per entity | ✅ |
| Public schema purge | ✅ | 32 business tables purged in `20260830000000` | ✅ |
| Platform metadata in public | ✅ | `workspaces`, `workspace_members`, `entities`, `entity_permissions` | ✅ |
| Cross-entity isolation | ✅ | Schema-per-entity + RLS | ✅ |
| PostgREST exposure | ✅ | Queue + Edge Function + Management API | ✅ |

**File:** `supabase/migrations/20260830000000_public_business_schema_purge.sql`

### 7. EntityProvider and tenantClient

**PRD Definition:** Client routes queries to entity schema. No cross-schema reads.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `EntityProvider` context | ✅ | Resolves workspace, entity, schemaName, tenantClient | ✅ |
| `tenantClient` | ✅ | `supabase.schema(schemaName).from(table)` | ✅ |
| Schema switching | Per-entity-change (not per-request) | Memoized on `entity.id` | ✅ |
| No DB-level search_path | ✅ | No `SET search_path` or `set_config` | ✅ |
| Fallback safety | ✅ | Throws if `schemaName` is null | ✅ |

**File:** `src/lib/tenant/contexts.tsx`, `src/lib/tenantClient.ts`

### 8. RLS Policies

**PRD Definition:** RLS = final authorization layer. Always enforced. `has_entity_permission()` checks entity_permissions table.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| Public schema RLS | ✅ | `is_workspace_member()`, `is_workspace_owner()` SECURITY DEFINER helpers | ✅ |
| Tenant schema RLS | ✅ | `has_entity_permission(entity_id, user_id, resource, action)` | ✅ |
| Wildcard support | ✅ | `resource='*'` or `action='*'` matched in `has_entity_permission()` | ✅ |
| No self-table recursion | ✅ | `has_entity_permission()` queries `entity_permissions` directly (cross-schema) | ✅ |
| Dynamic installation | ✅ | `_prov_install_rls` generates per-entity policies at provisioning time | ✅ |

**File:** `supabase/migrations/20260714000000_multi_tenancy_core.sql:148-171`

### 9. Entity Permissions

**PRD Definition:** Permissions = `(entity_id, user_id, resource, action)` tuples. Deny-by-default. Expanded from role templates.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `entity_permissions` table | ✅ | `id`, `entity_id`, `user_id`, `resource`, `action`, `granted_by`, `granted_at` | ✅ |
| Unique constraint | ✅ | `(entity_id, user_id, resource, action)` | ✅ |
| Wildcard support | ✅ | `has_entity_permission()` matches `*` | ✅ |
| Default permissions | ✅ | `_prov_seed_default_permissions()` grants creator wildcard access | ✅ |
| Template expansion | ✅ | `apply_permission_template()` copies template items into entity_permissions | ✅ |

**File:** `supabase/migrations/20260714000000_multi_tenancy_core.sql:42-50`

### 10. Permission Templates

**PRD Definition:** Predefined role bundles (Company Admin, Viewer, Manager, Engineer) that expand into entity_permissions rows.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `permission_templates` table | ✅ | `id`, `workspace_id`, `name`, `description`, `created_by`, `created_at` | ✅ |
| `permission_template_items` table | ✅ | `id`, `template_id`, `resource`, `action` | ✅ |
| Preloaded templates | ✅ | Company Admin, Viewer, Manager, Engineer seeded on workspace activation | ✅ |
| `apply_permission_template()` | ✅ | Copies template items into entity_permissions | ✅ |
| Delegation ceiling | ✅ | `assign_role_to_company_member()` enforces PRD §12.8 | ✅ |

**File:** `supabase/migrations/20260819000000_preloaded_roles_and_assignment.sql`

### 11. Platform Operators

**PRD Definition:** Platform Office = top-level admin. Can approve/suspend workspaces. Cannot see entity data.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| `platform_operators` table | ✅ | `id`, `user_id`, `role` (`owner`/`support`/`auditor`/`operations`), `granted_by`, `granted_at`, `expires_at` | ✅ |
| RLS | ✅ | Only `owner` role can read/write | ✅ |
| `approve_workspace()` | ✅ | SECURITY DEFINER, owner-only | ✅ |
| Data isolation | ✅ | Platform operators cannot access entity schemas | ✅ |

**File:** `supabase/migrations/20260716000000_multi_tenancy_platform_operators.sql`

### 12. PostgREST Schema Exposure

**PRD Definition:** Entity schemas exposed to PostgREST via config. Queue-based processing.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| Queue table | ✅ | `_pending_postgrest_schemas` with `id`, `schema_name`, `processed`, `locked_at`, `created_at` | ✅ |
| Row-level locking | ✅ | `claim_pending_pgrst_schemas()` SELECT FOR UPDATE | ✅ |
| Edge Function | ✅ | 256-line Deno function with pg_namespace validation | ✅ |
| Management API PATCH | ✅ | `db_schema` field updated via REST API | ✅ |
| Required schemas preserved | ✅ | `public`, `graphql_public`, `auth`, `storage`, `extensions` never removed | ✅ |
| Fail-closed | ✅ | No PATCH if pg_namespace query fails | ✅ |
| Backfill | ✅ | Existing entity schemas preserved during PATCH | ✅ |

**File:** `supabase/functions/postgrest-schema-exposure/index.ts`

### 13. Quotation/Invoice Tenant Access

**PRD Definition:** Business documents (quotations, invoices) live in entity schemas. No cross-entity access.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| Quotation CRUD | ✅ | All operations use `tenantClient.from('quotations')` | ✅ |
| Invoice CRUD | ✅ | All operations use `tenantClient.from('invoices')` | ✅ |
| Cross-entity access | ✅ | None found — all queries scoped to entity schema | ✅ |
| RLS enforcement | ✅ | `has_entity_permission()` on all tenant tables | ✅ |
| Financial calculations | ✅ | Client-side `computeDocument()` — no DB calls | ✅ |
| Quotation → Invoice | ✅ | Conversion works within entity schema | ✅ |
| Invoice → Quotation revert | ❌ | **BROKEN** — targets dropped `public.quotations` + missing tenant-schema RPC | ❌ |

**File:** `src/services/quotationService.ts`, `src/services/invoiceService.ts`

### 14. JWT Claims

**PRD Definition:** Custom claims in JWT for entity_id, workspace_id, team_id.

**Implementation:**

| Aspect | PRD | Implemented | Aligned? |
|--------|-----|-------------|----------|
| Custom JWT claims | ❌ | NOT IMPLEMENTED — no `entity_id`, `workspace_id`, `team_id` in JWT | ❌ |
| Authorization method | ✅ | `auth.uid()` + explicit parameters to `has_entity_permission()` | ⚠️ |

**Gap:** The PRD expects custom JWT claims. The implementation uses explicit parameter passing instead. This is a design divergence, not a bug — the current approach works but differs from the PRD model.

---

## Summary: Alignment Matrix

| Area | PRD | Implemented | Status |
|------|-----|-------------|--------|
| Workspace management | ✅ | ✅ | ✅ Aligned |
| Workspace membership | ✅ | ✅ | ✅ Aligned |
| Team management | ✅ | ❌ | ❌ Gap — no SQL tables |
| Entity/company management | ✅ | ✅ | ✅ Aligned |
| Entity → tenant schema mapping | ✅ | ✅ | ✅ Aligned |
| Tenant schema isolation | ✅ | ✅ | ✅ Aligned |
| EntityProvider / tenantClient | ✅ | ✅ | ✅ Aligned |
| RLS policies | ✅ | ✅ | ✅ Aligned |
| Entity permissions | ✅ | ✅ | ✅ Aligned |
| Permission templates | ✅ | ✅ | ✅ Aligned |
| Platform operators | ✅ | ✅ | ✅ Aligned |
| PostgREST schema exposure | ✅ | ✅ | ✅ Aligned |
| Quotation/invoice access | ✅ | ⚠️ | ⚠️ 1 bug (revert) |
| JWT claims | ✅ | ❌ | ❌ Design divergence |

---

## Identified Bugs

### 1. `revert_invoice_to_quotation_transaction` Broken

**Severity:** Functional defect

**Location:** `supabase/migrations/20260820000000_fix_revert_quotation_status_mapping.sql:42`

**Problem:** Function inserts into `public.quotations` (unqualified table name + `SET search_path TO 'public'`). But `public.quotations` was dropped in `20260830000000_public_business_schema_purge.sql:42`.

**Impact:** Reverting an invoice to a quotation is currently broken at runtime.

**Two defects:**
1. RPC name won't resolve in tenant schema (no tenant-schema function exists)
2. Even if resolved to public version, `INSERT INTO quotations` targets dropped table

### 2. Stale Comments

**Locations:**
- `src/pages/viewInvoiceActions.ts:24-25`
- `src/pages/viewQuotationActions.ts:158-159`

**Problem:** Both contain comments saying "quotations remain public" — outdated since the public schema purge.

---

## Identified Gaps

### 1. Teams Not Implemented as SQL Tables

The PRD defines teams as a distinct concept. The implementation collapses teams into `workspace_members` in the UI. No `teams`, `team_members`, or `team_permissions` SQL tables exist.

### 2. Custom JWT Claims Not Implemented

The PRD expects `entity_id`, `workspace_id`, `team_id` in JWT. The implementation uses explicit parameter passing. This works but differs from the PRD model.

### 3. `apply_permission_template()` Has No Internal Authz Check

SECURITY DEFINER function with no internal authorization — any authenticated user can call it. This is a security concern noted in the reports.

---

## Verification

- All file paths and line numbers verified against `live-public-schema.sql` and migration files
- No code modifications made
- Git status confirms pre-existing changes only (staged by another agent)

---

## Skills used

NONE

## Documentation standard

ASD-STE100 Simplified Technical English

## Deferred work

- Fix `revert_invoice_to_quotation_transaction` (separate task)
- Implement team management SQL tables (separate task if required by PRD)
- Add custom JWT claims (separate task if required by PRD)
- Fix `apply_permission_template()` authorization (separate task)
- Remove stale comments (separate task)
