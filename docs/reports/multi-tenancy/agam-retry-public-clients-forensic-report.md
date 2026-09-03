# Agam Retry → Provisioning public.clients Forensic Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## 1. Executive Finding

**The exact `public.clients` dependency was NOT located in any live database object.** All 19 provisioning functions, all views, all policies, all triggers, all constraints, and all rules in the database were searched. Zero references to `public.clients` exist in any executable database object.

**The "Retry" button does NOT actually retry provisioning.** The `recheckProvisioning()` handler calls `get_entity_provisioning_status` — a READ-ONLY RPC that reads the stored status from `entity_provisioning_status`. It does NOT call `provision_entity()`. The error displayed ("relation public.clients does not exist") is the STORED `last_error` from the original failed attempt, re-displayed on every status read.

**There is no code path to retry provisioning for an existing failed entity.** The `provision_entity()` RPC is only called during initial company creation (in `CreateCompanySheet.tsx` and `CompanyCreation.tsx`), never from the Retry button or any auto-retry mechanism.

---

## 2. Agam Current State

| Field | Value |
|-------|-------|
| Entity ID | `f2cbeffe-7666-47e6-9caf-145d1e952867` |
| Workspace ID | `eb30b64b-7f95-464f-be1a-805cf2c0fedc` |
| Expected Schema | `entity_bigdrops-main_agam` |
| Provisioning Status | `failed` |
| Attempt Count | `1` |
| Retry Limit | `3` |
| Latest Error | `relation "public.clients" does not exist` |
| Tenant Schema Exists | **No** (cleaned up after original failure) |

---

## 3. Exact Retry Execution Chain

```
ProvisioningFailed.tsx
  └─ "Try Again" button onClick
       └─ handleRetry()
            └─ entityCtx.recheckProvisioning()
                 └─ contexts.tsx: recheckProvisioning()
                      └─ checkProvisioning(entity.id)
                           └─ readProvisioningStatus(entityId)
                                └─ tenantCreation.ts: getEntityProvisioningStatus()
                                     └─ supabase.rpc('get_entity_provisioning_status', { p_entity_id })
                                          └─ public.get_entity_provisioning_status()  ← READ-ONLY
                                               └─ SELECT FROM entity_provisioning_status
                                                    JOIN entities WHERE ...
```

**Critical observation:** The chain ends at a SELECT query. It does NOT reach `provision_entity()`. The Retry button only reads the stored status and error — it never triggers provisioning.

---

## 4. Live PostgreSQL Call Graph

| Function | Schema | Caller | Callee | References `public.clients`? |
|----------|--------|--------|--------|------------------------------|
| `provision_entity(uuid)` | public | RPC from frontend | `_prov_validate_permissions`, `_prov_check_idempotency`, `_prov_get_schema_name`, `_prov_update_status`, `_prov_create_schema`, `_prov_get_template_tables`, `_prov_clone_table`, `_prov_install_rls`, `_prov_readd_foreign_keys`, `_prov_install_tenant_rpcs`, `_prov_seed_settings`, `_prov_seed_default_permissions`, `_prov_cleanup_on_error` | **No** |
| `_prov_clone_table(text,text,text)` | public | `provision_entity` | None (DDL only) | **No** |
| `_prov_readd_foreign_keys(text,text,text)` | public | `provision_entity` | None (DDL only) | **No** |
| `_prov_install_rls(text,text,uuid,text)` | public | `provision_entity` | `has_entity_permission` | **No** |
| `_prov_install_tenant_rpcs(text)` | public | `provision_entity` | None (DDL only) | **No** |
| `_prov_seed_settings(text,uuid)` | public | `provision_entity` | None (INSERT only) | **No** |
| `_prov_seed_default_permissions(text,uuid)` | public | `provision_entity` | None (INSERT only) | **No** |
| `_prov_cleanup_on_error(text)` | public | `provision_entity` | None (DROP SCHEMA) | **No** |
| `_prov_check_idempotency(uuid)` | public | `provision_entity` | `_prov_get_retry_limit` | **No** |
| `_prov_validate_permissions(uuid)` | public | `provision_entity` | None (SELECT only) | **No** |
| `_prov_get_schema_name(uuid)` | public | `provision_entity` | None (SQL only) | **No** |
| `_prov_create_schema(text)` | public | `provision_entity` | None (DDL only) | **No** |
| `_prov_update_status(uuid,text,text)` | public | `provision_entity` | None (UPSERT only) | **No** |
| `_prov_get_template_tables()` | public | `provision_entity` | None (SQL only) | **No** |
| `_prov_table_to_resource(text)` | public | `provision_entity` | None (SQL only) | **No** |
| `_prov_get_retry_limit()` | public | `_prov_check_idempotency` | None (SQL only) | **No** |
| `get_entity_provisioning_status(uuid)` | public | Retry button | None (SELECT only) | **No** |
| `has_entity_permission(uuid,uuid,text,text)` | public | `_prov_install_rls` | None (SELECT only) | **No** |
| `entity_apply_schema(text,uuid)` | public | (not deployed) | N/A | N/A |

**All 19 live provisioning functions are clean.** None reference `public.clients`.

---

## 5. Exact `public.clients` Source

**No live executable reference exists.** The error `relation "public.clients" does not exist` is the STORED `last_error` value in `entity_provisioning_status` for Agam:

```sql
SELECT last_error FROM entity_provisioning_status
WHERE entity_id = 'f2cbeffe-7666-47e6-9caf-145d1e952867';
-- Result: 'relation "public.clients" does not exist'
```

This error was produced by the ORIGINAL provisioning attempt (before the master template fix). The provisioning function at that time cloned from `public` (not `tenant_master_template`). When `public.clients` was not found, the error was stored and the schema was cleaned up.

**The error is historical, not current.** Every Retry click re-reads this stored error and displays it.

---

## 6. Repository vs Live Database Comparison

| Function | Repository Migration | Live Deployed | Match? |
|----------|---------------------|---------------|--------|
| `provision_entity` | Uses `tenant_master_template` | Uses `tenant_master_template` | ✅ |
| `_prov_clone_table` | Takes `p_source_schema` param | Takes `p_source_schema` param | ✅ |
| `_prov_readd_foreign_keys` | Takes `p_source_schema` param | Takes `p_source_schema` param | ✅ |
| `_prov_get_template_tables` | Returns 32 tables | Returns 32 tables | ✅ |

**No discrepancy found.** Repository and live definitions match.

---

## 7. Master Template Verification

| Check | Result |
|-------|--------|
| `tenant_master_template` exists | ✅ Yes |
| Table count | 32 |
| Tables with business data | 0 |
| Views | 3 |
| Latest migration applied | `20260902055836_tenant_master_template` (latest in schema_migrations) |

---

## 8. Other `public.clients` References

| Location | Type | Reachable from Agam Retry? | Status |
|----------|------|---------------------------|--------|
| `20260520090000_core_tables.sql` | Historical migration | No | Dead (already applied) |
| `20260810070000_payment_receipt_data_migration.sql` | Historical migration comment | No | Dead (already applied) |
| `20260830000000_public_business_schema_purge.sql` | DROP TABLE | No | Dead (already applied) |
| Frontend `.from('clients')` calls | Application data access | No | Uses `tenantClient` (tenant schema), not `public` |

**All references are historical or tenant-scoped.** None are reachable from the Retry execution path.

---

## 9. Retry/Provisioning State Machine

```
Failed Entity State:
  entity_provisioning_status: { status: 'failed', attempt_count: 1 }

Retry Button Action:
  recheckProvisioning()
    → checkProvisioning(entityId)
      → readProvisioningStatus(entityId)
        → get_entity_provisioning_status(entityId)  ← READ-ONLY
          → SELECT FROM entity_provisioning_status  ← returns stored status
  Result: status = 'failed', last_error = 'relation "public.clients" does not exist'
  Display: shows stored error

What Retry DOES NOT do:
  ✗ Does NOT call provision_entity()
  ✗ Does NOT create schema
  ✗ Does NOT clone tables
  ✗ Does NOT trigger any provisioning logic

Provisioning is ONLY triggered by:
  1. CreateCompanySheet.tsx → provisionEntity(entity.id)  [new company creation]
  2. CompanyCreation.tsx → provisionEntity(entity.id)     [onboarding creation]
  
There is NO retry path that calls provision_entity() for an existing failed entity.
```

---

## 10. Root Cause Classification

**Category: Stale frontend retry path**

The "Try Again" button was implemented as a status re-check, not a provisioning retry. The original provisioning was triggered during company creation (in `CreateCompanySheet` or `CompanyCreation`). After failure, the ProvisioningFailed screen was shown. The "Try Again" button was wired to `recheckProvisioning()` which only reads status — it was never wired to actually re-invoke `provision_entity()`.

**This is NOT a database issue.** The provisioning functions are clean. The master template is deployed. The error is stored from the original pre-template failure.

**This IS a frontend issue.** The Retry button needs to actually call `provision_entity()` for the existing failed entity.

---

## 11. Safety Conclusion

| Question | Answer |
|----------|--------|
| Is Agam safe to retry AFTER the fix? | **Yes** — the provisioning functions are clean, template is deployed, attempt count is 1/3 |
| Should another retry currently be attempted? | **No** — the current Retry button does not trigger provisioning; clicking it again just re-reads the same stored error |
| Must public operational tables remain absent? | **Yes** — the provisioning path no longer depends on them |
| Could data have been created/lost during failed attempts? | **No** — the schema was created and cleaned up; no business data was involved |

---

## 12. Recommended Next Fix

**Make the "Try Again" button actually call `provision_entity()`.**

In `ProvisioningFailed.tsx`, change `handleRetry` from:

```typescript
const handleRetry = () => {
    entityCtx.recheckProvisioning()
}
```

to:

```typescript
const handleRetry = async () => {
    if (!entityCtx.entity) return
    const result = await provisionEntity(entityCtx.entity.id)
    if (result.status === 'ready') {
        entityCtx.refresh()
        entityCtx.recheckProvisioning()
    } else {
        entityCtx.recheckProvisioning()
    }
}
```

This will:
1. Call `provision_entity()` via RPC
2. The function will detect `status = 'failed'`, `attempt_count = 1 < 3`
3. Allow retry
4. Create schema from `tenant_master_template`
5. Install RLS, RPCs, settings, permissions
6. Mark as `ready`

---

## 13. Verification Performed

- `git status --short` before: 3 modified/untracked files (pre-existing)
- `git status --short` after: same (no changes made)
- Files inspected: `ProvisioningFailed.tsx`, `ProvisioningProgress.tsx`, `contexts.tsx`, `tenantCreation.ts`, `TenantGate.tsx`, `tenantGate.ts`, `CreateCompanySheet.tsx`, `CompanyCreation.tsx`
- Database objects inspected: 19 provisioning functions, all views, policies, triggers, constraints, defaults, indexes, rules
- No writes performed
- No retries performed
- No companies created
- No code modified
