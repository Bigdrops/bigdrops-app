# Final Application Tenancy Cutover Report

This report was written by deepseek-v4-flash-free on 2026-08-18 via Local Runner.

## Objective

Complete the final application tenancy cutover for entity `eca34515-0b30-482c-b12e-3963df164322` (schema `"entity_bigdrops-main_main"`, ref `xqlpekpkbszpdgtuwybh`).

Every entity-scoped business read and write must use `tenantClient`.

Public business access, fallback paths, and business RPCs must be removed.

## Scope

- Application source code only.
- No database schema changes.
- No data migrations.
- No public table removal.

## Files Changed

This session converted:

- `src/pages/Invoices.tsx`
- `src/hooks/useInvoiceReferenceData.ts`
- `src/components/csr/CsrFormScreen.tsx`
- `src/pages/settings/SignatoriesSettingsSection.tsx`
- `src/pages/settings/BankingSettingsSection.tsx`
- `src/pages/settings/ArchivesSettingsSection.tsx`
- `src/pages/QuotationFormPage.tsx`
- `src/hooks/useDashboardData.ts`
- `src/hooks/useGlobalSearch.ts`
- `src/hooks/useInvoiceSave.ts`
- `src/modules/invoices/services/invoiceConversionService.ts`
- `docs/Reports/multi-tenancy/final-public-business-purge-inventory.md` (deferral note appended)

Earlier sessions converted all remaining modules listed under Changes Made.

## Skills Used

- supabase
- supabase-postgres-best-practices

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

### 1. Invoices.tsx

- `supabase.rpc("delete_invoice_with_items_transaction", ...)` became `tenantClient.rpc(...)`.
- `csrs` and `waybills` linked-document updates became `tenantClient.from(...)`.
- The unused `supabase` import was removed.

### 2. useInvoiceReferenceData.ts

- `signatories` and `bank_accounts` reads became `tenantClient.from(...)`.
- The unused `supabase` import was removed.

### 3. CsrFormScreen.tsx

- Added `useEntity()` to obtain `tenantClient`.
- The `signatories` read became `tenantClient.from(...)`.
- The unused `supabase` import was removed.

### 4. SignatoriesSettingsSection.tsx

- Added `useEntity()` to obtain `tenantClient`.
- Read, insert, update, and delete became `tenantClient.from(...)`.
- The load effect waits for `tenantClient.isReady`.
- The unused `supabase` import was removed.

### 5. BankingSettingsSection.tsx

- Added `useEntity()` to obtain `tenantClient`.
- Read, insert, update, delete, and default-toggle became `tenantClient.from(...)`.
- The load effect waits for `tenantClient.isReady`.
- The unused `supabase` import was removed.

### 6. ArchivesSettingsSection.tsx

- `rfqs`, `csrs`, `waybills`, and `boqs` archive reads became `tenantClient.from(...)`.
- The restore update became `tenantClient.from(...)` for all document types.
- The unused `supabase` import was removed.

### 7. QuotationFormPage.tsx

- `signatories` and `bank_accounts` reads became `tenantClient.from(...)`.
- The `quotations` custom-fields update became `tenantClient.from(...)`.
- The unused `supabase` import was removed.

### 8. useDashboardData.ts

- `csrs` and `rfqs` reads in both dashboard variants became `tenantClient.from(...)`.
- The unused `supabase` import was removed.

### 9. useGlobalSearch.ts

- The `csrs` search read became `tenantClient.from(...)`.
- The unused `supabase` import was removed.

### 10. useInvoiceSave.ts

- Both `save_invoice_with_items_transaction` RPC calls became `tenantClient.rpc(...)`.
- `validateProjectAssignment` now receives `input.tenantClient`.
- The unused `supabase` import was removed.

### 11. invoiceConversionService.ts

- `revert_invoice_to_quotation_transaction` RPC became `tenantClient.rpc(...)`.
- The unused `supabase` import was removed.

### 12. Audit Sweep

A repository-wide search for `supabase.from` and `supabase.rpc` was run.

Remaining uses are restricted to whitelist tables and platform RPCs:

- `profiles`, `notification_preferences`, `push_delivery_logs`, `device_installations`.
- `is_platform_operator`, `provision_entity`, `accept_workspace_invitation`, `get_entity_provisioning_status`, and device assignment RPCs.
- `src/lib/native/quotationSync.ts` (deferred, see Deferred Work).

## Deferred Work

Two native offline sync modules remain on public access:

- `src/lib/native/quotationSync.ts`
- `src/lib/native/csrSync.ts`

The App-level bootstrap flush runs before the `EntityProvider` mounts. `tenantClient` is not reachable at that point.

Page-level callers (`CSR.tsx` L204, `QuotationList.tsx` L153) have `tenantClient`. They are ready to pass it once the project lead decides the bootstrap approach.

A deferral note was appended to `final-public-business-purge-inventory.md`.

## Verification Result

- `bun run audit:load`: passed (pre-existing BLOAT, ARCH, and QUERY warnings only)
- `bun run typecheck`: passed
- `git status`: 68 modified source files, 4 untracked documents
- `git diff --stat`: 579 insertions, 530 deletions
- `bun run build`: skipped due to hardware policy

## Risks and Limitations

- The deferred sync modules still read and write the public `quotations` and `csrs` tables.
- Public business tables remain in the database. Their removal is a separate database task.
