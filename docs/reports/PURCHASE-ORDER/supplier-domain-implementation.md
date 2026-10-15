# Supplier Domain Foundation — Implementation Report

This report was written by Buffy on 2026-10-15 via Freebuff Desktop.

Skills used: supabase-postgres-best-practices, supabase, karpathy, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read. Four registered skills were loaded and applied.

- `supabase-postgres-best-practices` — schema design, RLS, indexing, migration safety.
- `supabase` — migration workflow, exposed-schema RLS rules, `SECURITY DEFINER` caution.
- `karpathy` — simplicity first, surgical changes, no speculative abstraction.
- `accessibility` — label/input association and accessible names on the new components.

No React-specific, TypeScript-specific, or mobile-UI skill was loaded. The only registered matches were `react-dev`, `typescript-advanced-types`, `mobile-app-ui-design`, and `tailwind-css-patterns`. They were not needed: the new components copy `ClientForm` and `ClientSelector`, which already define the project's React, TypeScript, mobile, and Tailwind conventions. No unavailable skill was invented.

---

## Objective

Implement the approved Commercial Party Foundation — **OPTION B, linked role directories**.

Create a first-class supplier authority beside the existing client authority. Let a client and a supplier record that belong to the same business be linked explicitly. Keep the change additive.

Supplier Purchase Orders are not implemented. No `commercial_parties` registry is introduced. No client id is migrated.

## Scope

In scope: the `suppliers` directory, the one-to-one client/supplier link, tenant provisioning, RLS, grants, permissions, the supplier domain types and service, the supplier picker, the Suppliers directory and detail views, the dual-role workflows, and tests.

Out of scope and not built: purchase orders, PO numbering, PO status, PO PDF, PO search, goods receiving, supplier payments, supplier banking, RFQ supplier migration, a unified Businesses directory, a commercial party registry, and client merge.

## Files changed

### New files

| File | Lines | Purpose |
|---|---|---|
| `supabase/migrations/20261015120000_supplier_domain_and_party_links.sql` | 392 | Tables, provisioning registry, RLS, grants, permissions, existing-tenant convergence |
| `src/domain/supplier/types.ts` | 180 | Supplier types, link type, pure validation and helpers |
| `src/modules/supplier/supplierService.ts` | 286 | Supplier CRUD, archive, restore, and raw link persistence |
| `src/modules/party/partyLinkService.ts` | 165 | Dual-role orchestration and compensating failure recovery |
| `src/components/supplier/SupplierForm.tsx` | 273 | Supplier create/edit form |
| `src/components/supplier/SupplierSelector.tsx` | 252 | Reusable supplier party picker |
| `src/components/client/workspace/ClientSupplierRoleCard.tsx` | 179 | Supplier role card for the client workspace |
| `src/pages/Suppliers.tsx` | 304 | Suppliers directory |
| `src/pages/SupplierDetail.tsx` | 457 | Supplier detail, link and lifecycle actions |
| `src/pages/AddSupplier.tsx` | 50 | Create-supplier page |
| `src/pages/EditSupplier.tsx` | 78 | Edit-supplier page |
| `src/tests/critical/supplierDomain.test.js` | 672 | 59 critical tests |

### Modified files

| File | Change |
|---|---|
| `src/lib/cache/listCache.ts` | Added `supplierListCacheKey`, mirroring `clientListCacheKey`. Additive export; no existing caller changed. |
| `src/lib/iconRegistry.ts` | Added `Building2` import and the `suppliers` icon key. |
| `src/components/layout/navData.ts` | Added the Suppliers entry to `desktopNav` and `mobileDrawerPrimaryNav`; `/suppliers` resolves to the existing `clients` tab. The five bottom tabs are unchanged. |
| `src/components/app/AppShell.tsx` | Added four lazy imports and four routes. |
| `src/pages/ClientDetail.tsx` | Added the supplier role card and its import (net +18 lines). |

## Changes made

1. Added an additive migration that creates `suppliers` and `client_supplier_links` in `tenant_master_template`, registers both in the provisioning registry, seeds the `supplier` permission resource, extends the canonical resource allowlist, and converges every eligible existing tenant schema.
2. Added the supplier domain types and pure validation in `src/domain/supplier/types.ts`.
3. Added supplier persistence in `src/modules/supplier/supplierService.ts`.
4. Added dual-role orchestration with compensating failure recovery in `src/modules/party/partyLinkService.ts`.
5. Added the reusable `SupplierForm` and `SupplierSelector` components.
6. Added the Suppliers directory, supplier detail, and create/edit pages.
7. Added the supplier role card to the client workspace.
8. Registered supplier routes and navigation. The five bottom tabs are unchanged.
9. Added the `supplierListCacheKey` helper to the shared list cache.
10. Added 59 critical tests covering the schema contract, provisioning, scope exclusions, the domain helpers, the service behaviour, and existing client regression.

No existing table, column, identifier, foreign key, snapshot, or accounting row was modified.

### Architecture note — where supplier logic lives

The brief named `src/domain/supplier/*` for the supplier operations. `docs/standard/lifecycle-ownership-standard.md` §2.2 and §5 forbid database access in the Domain layer. Rule precedence puts `docs/standard/` above the task file.

The work is therefore split:

- `src/domain/supplier/types.ts` — types, validation, and pure helpers. No database access.
- `src/modules/supplier/supplierService.ts` — persistence.
- `src/modules/party/partyLinkService.ts` — dual-role orchestration.

## Schema and provisioning changes

### New tables

`tenant_master_template.suppliers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, `gen_random_uuid()`. Stable identity. |
| `name` | text | Not null. **Not unique.** |
| `contact_person` | text | Nullable. |
| `phone` | text | Nullable. |
| `email` | text | Nullable. |
| `address` | text | Nullable. |
| `city` | text | Nullable. |
| `state` | text | Nullable. |
| `notes` | text | Nullable. |
| `created_at` | timestamptz | Not null, `now()`. |
| `updated_at` | timestamptz | Not null, `now()`. |
| `archived_at` | timestamptz | Nullable. |

`tenant_master_template.client_supplier_links`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key. |
| `client_id` | uuid | **Unique.** Foreign key to `clients(id)`. |
| `supplier_id` | uuid | **Unique.** Foreign key to `suppliers(id)`. |
| `created_at`, `updated_at` | timestamptz | For the canonical `updated_at` trigger. |
| `created_by`, `updated_by` | uuid | For the canonical ownership trigger. |

The link table stores no name, contact, or accounting column. It is identity metadata only.

### Registry changes

| Function | Change |
|---|---|
| `_prov_get_template_tables()` | Added `suppliers` and `client_supplier_links`. The effective 51-table baseline is reproduced, including the BOQ→CPS rename (`cps_sheets`, `cps_rows`). |
| `_prov_table_to_resource()` | Both tables map to the **`supplier`** resource. |
| `_prov_seed_default_permissions()` | Added `('supplier')` to the canonical resource list. |
| `_perm_pair_is_canonical()` | Added `'supplier'` to the closed resource allowlist, preserving `'client'`. |

Reproducing the pre-rename names (`boqs`, `boq_rows`) in the registry would have broken new-tenant provisioning, because the live function bodies were rewritten by `20261001081028_rename_boq_to_cps.sql`. The renamed names are used. Test 14 guards this.

### Convergence result (live database)

The migration converged every eligible existing tenant schema.

| Probe | Result |
|---|---|
| Total `entity_*` schemas | 14 |
| Schemas that received `suppliers` | **11** |
| Schemas that received `client_supplier_links` | **11** |
| Schemas without `suppliers` | 3 |
| Schemas without `clients` (the documented exclusion) | **3** |

The three excluded schemas are exactly the three that lack `clients`. They were skipped **by name with a warning**, following the document-search convergence precedent. They are not failures. No unknown error was swallowed; any other error aborts the migration.

## RLS and permission behaviour

- Access control comes from the shared installer, `_prov_install_rls`, with the resource string `supplier`. No bespoke policy was written.
- Four policies are created per table: `_select`, `_insert`, `_update`, `_delete`, all keyed on `has_entity_permission(entity_id, auth.uid(), resource, action)`.
- Verified live: **88** RLS policies across the two new tables (11 schemas × 2 tables × 4 policies).
- `supplier` is an independent resource. It is not `client`, so supplier access can be granted or withheld without changing client access.
- Grants follow the established additive-table pattern: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO anon, authenticated, service_role` per schema.
- Canonical triggers are installed by `_prov_install_canonical_triggers`, which introspects columns and applies `set_row_updated_at` (both tables) and `stamp_row_ownership` (the link table).
- Verified live: **44** `entity_permissions` rows with `resource = 'supplier'` (11 schemas × 4 actions × 1 workspace owner).

## Dual-role workflow

### Client detail → supplier role

`ClientSupplierRoleCard` sits in the client workspace. It shows one of two states:

- **No supplier role** — an "Add Supplier Role" action opens the supplier form, pre-filled from the client's details after review.
- **Linked** — the linked supplier name plus "View Supplier" and "Unlink".

### Supplier detail → client role

`SupplierDetail` offers:

- **Link Existing Client** — reuses `ClientSelector` inside a dialog, then creates the link.
- **Add Client Role** — reuses the existing `ClientForm` component and the existing direct `clients` insert convention, then links.
- **View Client** — shown when linked.
- **Unlink** — behind a confirmation dialog.

### Safety rules enforced

| Rule | Implementation |
|---|---|
| Explicit confirmation required | Every create-and-link action runs through a form or dialog. No silent linking. |
| Never link by name | No name comparison exists in the service or the orchestration layer. Test 43 guards this. |
| One link per party | Database `UNIQUE` constraints on both `client_id` and `supplier_id`. Verified live: 24 unique constraints. |
| Duplicate attempts rejected safely | SQLSTATE `23505` is detected and reported as a friendly message. |
| Tenant-safe | Both foreign keys are intra-schema. Verified live: 24 foreign keys. |
| Unlink preserves both records | The unlink path deletes only the link row. |
| No partial party | The role record is created first, then linked. A failed link deletes the new record. If that also fails, the residue is a valid single-role record. |
| Contact synchronization | None. Values are copied once, on creation, after review. |

## Verification result

```
Verification:
- git status before work: 7 modified, 5 untracked (Phase 3 search work + prior PURCHASE-ORDER audit)
- git status after work: those files unchanged, plus this task's scoped changes
- bun run audit:load: passed (exit 0) — no new ❌ or 🚨; oversized-file count fell 43 → 42
- bun run typecheck: passed (exit 0, 0 errors)
- bun run test: 1215 tests, 1200 pass, 15 fail — all 15 pre-existing and unrelated (see below)
- supplier domain tests: 59 tests, 59 pass, 0 fail (exit 0)
- supabase db push: passed (exit 0)
- supabase db query --linked (read-only probes): passed
- git diff --check: clean (exit 0)
- bun run build: skipped due to hardware policy
```

### Cloud verification (executed, not assumed)

`supabase migration list --linked` showed remote current through `20261014160000` with `20261015120000` pending. `supabase db push --yes` applied it:

```
Applying migration 20261015120000_supplier_domain_and_party_links.sql...
Finished supabase db push.
```

Read-only probes against the linked project (`supabase db query --linked`, which replaces the stale `supabase db shell` from `supabase/database-workflow.md`):

| Probe | Value |
|---|---|
| `tenant_master_template.suppliers` | exists |
| `tenant_master_template.client_supplier_links` | exists |
| Tenant schemas with `suppliers` | 11 |
| Tenant schemas with `client_supplier_links` | 11 |
| RLS policies on the two new tables | 88 |
| Foreign keys on the link table | 24 |
| Unique constraints on the link table | 24 |
| Canonical allowlist includes `supplier` | 1 |
| Template list supplier entries | 2 |
| `clients` columns still intact | 11 |
| `clients` tables across all schemas | 12 |
| `entity_permissions` rows with `resource='supplier'` | 44 |
| `purchase_order*` tables | **0** |
| `commercial_part*` tables | **0** |

## Supabase push status

**Pushed and verified.** `supabase db push` exited 0. The live schema was then probed and confirms both tables, the link constraints, RLS, permissions, and the registry change. No client row, column, or foreign key changed. No purchase-order or party-registry table exists.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | `suppliers` table exists in the tenant template | Passed |
| 2 | Link authority exists with one-to-one uniqueness | Passed |
| 3 | Both tables included in new-tenant provisioning | Passed |
| 4 | Eligible existing tenants receive both tables | Passed (11 of 11 eligible) |
| 5 | RLS and permissions follow established standards | Passed |
| 6 | Supplier CRUD implemented | Passed |
| 7 | Supplier archive implemented | Passed (plus restore) |
| 8 | `SupplierSelector` is reusable | Passed |
| 9 | Suppliers directory and detail views available | Passed |
| 10 | Existing clients can gain a supplier role | Passed |
| 11 | Existing suppliers can gain a client role | Passed |
| 12 | Existing links can be viewed and removed | Passed |
| 13 | Duplicate link attempts rejected safely | Passed |
| 14 | Identical business names do not trigger automatic links | Passed |
| 15 | Contact edits do not propagate automatically | Passed |
| 16 | No existing `client_id` modified | Passed |
| 17 | No historical document snapshot modified | Passed |
| 18 | No accounting source transaction modified | Passed |
| 19 | No PO implementation introduced | Passed |
| 20 | Type safety passes | Passed |
| 21 | Data-layer audit passes | Passed |
| 22 | Final git status confirms scoped changes | Passed |

## Pre-existing issues left untouched

These were present before this task. They were not fixed, in line with `concurrent-agent-safety.md` and the task's scope limits.

| Issue | Detail |
|---|---|
| 15 pre-existing test failures | Environmental and unrelated. `sourceTransactionContract` fails with `TypeError: Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')`. `themeToggleExposure` fails on `CsrFormScreen.tsx` and the RFQ header. CPS and accounting contract tests fail on their own files. None of them reference any file this task changed. |
| `invoices.client_id` and `csrs.client_id` have no foreign key | A client delete can orphan those references. Reported separately, as instructed. |
| Client archive and merge are stubs | `Clients.tsx` shows "not available in this version". |
| `supabase/database-workflow.md` names `supabase db shell` | That subcommand does not exist in CLI 2.120.0. `supabase db query` works. |
| `_temp_debug.sql` in `supabase/migrations` | Not a valid migration name; `supabase db push` skips it with a warning. |
| Prefix key drift (`cps_sheets` vs `boq`) | Pre-existing; untouched. |
| Audit `event_type` drift | Pre-existing; untouched. |

### Behaviour note on linked-client deletion

Both link foreign keys are plain (NO ACTION), so a linked record cannot be destroyed until the link is removed. In tenant schemas, `_prov_readd_foreign_keys` re-creates foreign keys without a delete action, so this protection is uniform. A client that has a supplier link can therefore not be hard-deleted until it is unlinked. A client **without** a link deletes exactly as before. This was chosen over `ON DELETE CASCADE` because it protects historical integrity, and because the task forbids redesigning existing client deletion.

## Risks or limitations

- The link protection above is a deliberate behaviour addition for linked clients only. It is not a regression for unlinked clients.
- `docs/standard/Commercial Party Architecture Standard.md` is still a placeholder. This task did not extend it, because modifying normative standards was forbidden.
- No end-to-end UI test ran. Verification is static analysis and pure-function tests plus live schema probes. A browser walkthrough was not performed.
- `bun run build` was not run, by hardware policy. TypeScript is checked by `tsc --noEmit` only.
- Three tenant schemas remain without the supplier tables. This is the documented incomplete-tenant policy, not a defect. They can be converged after their missing base tables are restored.
- The supplier picker is deliberately not wired into RFQ or the future Supplier PO form, as instructed.

## Deferred work

- Implement Supplier Purchase Orders (Phase C onward in the architecture audit).
- Extend `docs/standard/Commercial Party Architecture Standard.md` from placeholder to normative, and record that `counterparty_type` is the accounting role and is independent of any party directory.
- Grant supplier access to non-owner roles through the existing role-template settings UI. The resource is now canonical, so the UI accepts it.
- Decide whether to promote distinct RFQ `vendor_name` values into `suppliers`. Still forbidden until approved.
- Converge the three incomplete tenant schemas after their base tables are restored.
- Fix the 15 pre-existing test failures.
- Add the delete guard for `invoices.client_id` and `csrs.client_id`.
