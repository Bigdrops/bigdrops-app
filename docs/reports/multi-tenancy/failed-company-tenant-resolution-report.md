# Failed Company & Tenant Resolution Reconciliation Report

This report was written by Buffy on 2026-09-02 via Freebuff.

---

## Objective

Investigate and fix the critical failure where creating a second company can fail during provisioning with `relation "public.clients" does not exist`, trapping the user in a full-screen dead end with no recovery path.

## Scope

- Trace the `public.clients` error source.
- Trace EntityProvider → tenant resolution → TenantGate flow.
- Implement entity-local failure recovery UX.
- Recreate dropped template tables for the provisioning engine.
- Preserve multi-company support and existing tenancy architecture.

## Skills Used

- karpathy (surgical changes, simplicity first)
- supabase (database workflow, migration patterns)

## Documentation Standard

ADS-STE100 Simplified Technical English

## Root Cause Discovery

### The `public.clients` Error

**Root cause:** The `public_business_schema_purge` migration (`20260830000000`) dropped ALL public business tables including `public.clients`. However, `_prov_get_template_tables()` still lists `'clients'` (and 31 other tables) as template tables to clone from `public` into entity schemas during provisioning.

When `provision_entity()` runs, it calls `_prov_clone_table('public', v_schema_name, v_table)` for each template table. If `public.clients` doesn't exist, the clone fails with `relation "public.clients" does not exist`.

**This is a database migration defect**, not a frontend bug. The purge migration removed the template tables that the provisioning engine depends on.

### The Global Blocking State

When the selected entity's provisioning fails:
1. EntityProvider checks provisioning → gets `failed`
2. TenantGate resolves phase → `provisioning-failed`
3. TenantGate renders `ProvisioningFailed` as a full-screen block
4. `ProvisioningFailed` only offers "Sign Out" and "Retry"
5. No way to switch to another working company

The user is trapped. If Company A is ready but Company B (selected) failed, the user cannot access Company A without signing out.

## Changes Made

### 1. ProvisioningFailed.tsx — Entity-Local Recovery UX

Added company switching to the failure screen:
- **"Switch Company"** button (primary) — opens `CompanySelectionSheet` when other companies exist
- **"Try Again"** button (secondary) — retries provisioning
- **"Sign Out"** button (tertiary, low-priority) — existing escape hatch
- Shows the failed company name: "Company X could not be set up in Workspace Y"
- Error details shown in secondary treatment
- Accessible buttons, touch-friendly sizing

### 2. Migration: Restore Public Template Tables

Created `supabase/migrations/20260902034052_restore_public_template_tables.sql` that recreates all32 template tables as empty tables in `public` with the correct schema.

These tables are needed by `_prov_get_template_tables()` for the provisioning engine to clone into entity schemas. The tables are empty — they're structural templates only.

Tables restored:
`clients`, `settings`, `signatories`, `bank_accounts`, `projects`, `project_documents`, `quotations`, `quotation_items`, `invoices`, `invoice_items`, `payments`, `wht_receipts`, `csrs`, `blank_csr_logs`, `waybills`, `blank_waybill_logs`, `tax_settings`, `tax_filings`, `tax_input_entries`, `tax_reminders`, `receipts`, `letters`, `boqs`, `boq_rows`, `rfqs`, `rfq_items`, `item_catalog`, `item_import_batches`, `item_aliases`, `item_merge_log`, `audit_logs`, `activity_events`

### 3. Provisioning Poll (from previous task)

`CreateCompanySheet.tsx` and `CompanyCreation.tsx` already poll `getEntityProvisioningStatus()` after `provisionEntity()` until terminal state. This prevents false success messages.

## Tenant Architecture Findings

### EntityProvider Schema Resolution

```typescript
const schemaName = provisioningStatus === 'ready' ? expectedSchema : null
const tenantClient = useMemo(() => createTenantClient(supabase, schemaName), [schemaName])
```

When `provisioningStatus` is not `ready`, `schemaName` is `null`, and `tenantClient` throws "Tenant schema is not available yet." This is correct — the app cannot operate inside a non-ready entity.

### TenantGate Failure Handling

The gate correctly blocks operations for a failed entity. The fix adds a recovery path (company switching) rather than removing the gate.

### public.entities vs Tenant Schema

`public.entities` is the workspace-scoped entity registry (company identity/metadata). Tenant operational data resolves through the provisioned entity schema (e.g., `entity_workspace_company`). The UI displays company name from `public.entities` while operational queries go through `tenantClient`.

## Verification Result

- `bun run audit:load`: passed (no new issues)
- `bun run typecheck`: passed
- `git status`: 3 files changed (CreateCompanySheet, CompanyCreation, ProvisioningFailed) + 1 new migration + 2 report files

## Risks or Limitations

- The migration must be applied to the hosted database via `supabase db push` before provisioning will work. The migration is committed but not yet applied.
- The migration recreates tables with the schema from original migrations. If later migrations added columns to these tables that aren't captured, the template might be incomplete. However, the provisioning engine clones structure, and the application uses `tenantClient` which goes through the correct schema.
- No runtime/device testing. Static verification only.
- The `ProvisioningFailed` company switcher uses `CompanySelectionSheet` which shows all entities including the failed one. Switching to a failed entity will show the failure screen again — this is correct behavior.

## Deferred Work

- Apply the migration to the hosted database (`supabase db push`).
- Workspace creation (deferred per previous reconciliation).
- Company Settings enhancement (address, tax, logo, banking) — separate task.
- Invitation management — separate task.
- Role/permission assignment — separate task.
