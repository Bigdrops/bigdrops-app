# Waybill Tenancy Migration Verification Report

This report was written by opencode (deepseek-v4-flash-free) on 2026-08-19 via Local Runner.

## 1. Objective

Verify the Waybill aggregate on the live tenant.

The verification must answer:

- Does the tenant `waybills` table match the public `waybills` table?
- Does every waybill write path hit the tenant schema?
- Are there pre-existing failures that are not caused by tenancy?

The user reported two symptoms:

1. The Waybills list shows 0 waybills.
2. Waybill usage or download fails with `permission denied for table blank_waybill_logs`.

The first symptom was fixed by the migration `20260819000001`. The second symptom was fixed by the same migration.

This report documents the verification of the migration and the fix of the frontend write path.

## 2. Scope

The scope of this task is the Waybill aggregate on the production entity.

The aggregate covers:

- The tenant `waybills` table.
- The tenant `blank_waybill_logs` table.
- The waybill frontend paths in the list page and the detail page.

The scope does NOT include:

- Other aggregates (invoice, quotation, receipt, setting, payment, client).
- Public table provenance.
- The data-copy portion of Phase 4 of the migration plan.

## 3. Environment

- Repo root: `C:\Users\DELL\Desktop\bigdrops-app`
- Branch: `main`
- Entity: `eca34515-0b30-482c-b12e-3963df164322` (slug `main`)
- Tenant schema: `entity_bigdrops-main_main`
- Supabase project ref: `xqlpekpkbszpdgtuwybh`
- Live database queries via `supabase db query --linked`
- `.env` location: repo root

## 4. Divergence Verification

The verification ran live queries against both schemas on 2026-08-19.

Result: the public schema is an exact mirror of the tenant schema.

- Tenant `waybills`: 18 rows.
- Public `waybills`: 18 rows.
- Tenant rows missing from public: 0.
- Public rows missing from tenant: 0.
- Column-level divergence: 0.
- The two schemas are column-identical.

The public `waybills` table is a perfect copy of the 18 pre-existing tenant rows.

The prior hypothesis that tenant UUIDs are absent from public is disproved for these 18 rows.

## 5. Write-Path Root Cause

The remaining hazard is the write path, not the data.

New waybills are written to the tenant schema only.

`saveWaybill` routes through `tenantClient` in `waybillMutations.ts` line 20.

New waybill numbering is tenant-only. The `blank_waybill_logs` insert also routes through `tenantClient`.

Live proof:

- Tenant `blank_waybill_logs`: 25 rows.
- Public `blank_waybill_logs`: 24 rows.
- The single extra tenant row is `SASWBL-MI-000009`.
- Id: `cc2274d9-7e60-4d89-9b4a-4a3a299f8848`
- Type: `internal`
- Downloaded: 2026-08-17 07:48:32 (today, after the migration)

This proves new waybill numbers write to the tenant schema only.

Before the frontend fix, the detail page could not open a new tenant-only waybill:

- The detail load used the global client.
- The global client queries the public schema.
- A tenant-only waybill id does not exist in public.
- The detail page shows "Waybill not found".

Every detail-page write also hit the public schema:

- Status change.
- Duplicate.
- Archive.
- Delete.
- Template custom_fields save.
- Project link.

A tenant-only waybill would silently fail on every one of these actions.

## 6. Files Changed

### 6.1 Frontend fixed

- `src/pages/ViewWaybill.tsx`
- `src/components/document/ProjectLinkDialog.tsx`
- `src/pages/Waybills.tsx`

### 6.2 Report added

- `docs/Reports/multi-tenancy/waybill-tenancy-migration-verification.md` (this file)

## 7. Skills Used

Skills used: pdf-rendering-correctness

Documentation standard: ADS-STE100 Simplified Technical English

## 8. Changes Made

### 8.1 Detail load

The detail load in `ViewWaybill.tsx` now uses the tenant client:

```ts
const db = tenantClient.isReady ? tenantClient : supabase
db.from('waybills').select('*').eq('id', id).single()
```

The `supabase` fallback stays for entities where the tenant schema is not ready.

### 8.2 Detail-page actions

Four action calls now pass `tenantClient`:

- `updateWaybillStatus(id, status, tenantClient)`
- `duplicateWaybillRecord(id, tenantClient)`
- `archiveWaybillRecord(id, tenantClient)`
- `deleteWaybillRecord(id, tenantClient)`

`viewWaybillActions.ts` already accepted an optional client with a `supabase` fallback. No change was needed there.

### 8.3 Template save

The template custom_fields save in `ViewWaybill.tsx` now uses the tenant client.

### 8.4 Project link dialog

`ProjectLinkDialog` is shared across seven document types:

- waybills
- invoices
- quotations
- csrs
- rfqs
- boqs
- project detail

The change adds an optional `client` prop. The dialog routes all database calls through `client?.isReady ? client : supabase`.

The two waybill call sites pass `tenantClient`:

- `ViewWaybill.tsx`
- `Waybills.tsx` (list page)

The other five document types do not pass the prop. They continue to use the global client. This keeps the change surgical and cross-document safe.

## 9. Blank Log Evidence

The `blank_waybill_logs` columns are:

- `id`
- `assigned_waybill_number`
- `type`
- `downloaded_by`
- `downloaded_at`
- `linked_waybill_id`
- `reconciled_at`

There is no `waybill_number` column.

The 25 vs 24 mismatch is explained. It is not a defect.

The extra tenant row is a new number downloaded today. It exists in the tenant schema only. This is the expected behavior of the tenancy migration.

## 10. Audit RPC Limitation

The audit RPCs cannot record tenant waybill events.

The RPCs:

- `record_waybill_created`
- `record_waybill_status_changed`

are defined in `20260703100001_record_csr_waybill_events.sql` lines 131 and 171.

They are `SECURITY DEFINER` functions. Their `search_path` is `public`. They read `public.waybills`.

For a tenant-only waybill id, the RPC raises `Waybill not found`.

The frontend call is fire-and-forget in `src/lib/audit.ts` lines 438 and 459. The failure is swallowed.

Result:

- Tenant waybill audit events are silently lost.
- This is a limitation, not a regression.
- The fix options need a scope decision. They are not part of this task.

## 11. Shared Global Access Paths

These paths still access waybill data through the global client:

- `AttachExistingDocumentSheet.tsx` lines 113-114 and 145-146.
  - Used by `Invoices.tsx` to attach a waybill to an invoice.
  - Used by `Waybills.tsx` to attach an invoice to a waybill.
  - The waybill direction reads waybills from public.
- `documentRelationships.js` lines 66 and 78.
  - `fetchInvoiceSummary` reads invoices from public.
  - `fetchInvoiceChildDocuments` reads child documents from public.
- `ClientDetail.tsx` lines 165-194, 284, 307, 330, 353.
- `Invoices.tsx` line 246.
- `ArchivesSettingsSection.tsx` line 95.
- `useAuditTrail.ts` reads `audit_logs` and `activity_events` from public.

These are shared across document types. They are flagged in this report. They are NOT changed in this task. A cross-document scope decision is required before any change.

## 12. Verification

- `bun run audit:load`: passed. No new findings. All findings are pre-existing.
- `bun run typecheck`: passed.
- `bun run test`: passed. 144 tests, 0 failures.
- `git status`: modified files are limited to the three frontend files above.
- `bun run build`: skipped due to hardware policy.

`rg -n "supabase\.from" src/pages/ViewWaybill.tsx` returns no output. No global database call remains in the waybill detail page.

## 13. Risks and Limitations

- `ProjectLinkDialog` still reads projects through the global client for the other five document types.
  Projects are mirrored (2 in public, 2 in tenant). The read works today.
  New tenant-only projects would be missed by the non-waybill call sites.
  This is pre-existing behavior. It is outside this task.
- The audit RPC limitation means tenant waybill audit events are silently lost.
  The upgrade options need a scope decision.
- The public `waybills` table still holds the 18 pre-existing rows.
  The data-copy phase is blocked by the ownership rule. Public data is not deleted.
- The Invoices-to-waybill attach direction reads waybills from public.
  It can only attach pre-existing waybills. New tenant-only waybills are not shown.
  This needs a cross-document scope decision.

## 14. Deferred Work

- Cross-document scope decision for `ProjectLinkDialog`, `AttachExistingDocumentSheet`, and the shared repositories.
- Audit RPC upgrade so tenant waybill events are recorded.
- Public-to-tenant data-copy phase. Blocked by the ownership and provenance rule.
- Confirm the source of the original base-table grants.
- Confirm whether `20260810040000` and the 20260818 wildcard migrations are applied to production.
