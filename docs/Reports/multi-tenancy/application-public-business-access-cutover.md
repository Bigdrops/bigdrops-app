# Application Public Business-Access Cutover Report

This report was written by deepseek-v4-pro on 2026-08-25 via opencode.

## Objective

Remove the remaining application-level public-schema access to entity-scoped business data so the application reaches the public-schema purge gate.

## Scope

Entity `eca34515-0b30-482c-b12e-3963df164322`, tenant schema `entity_bigdrops-main_main`. Application code only. No database migrations were authored or applied in this task.

## Files inspected

- All files importing `supabase` (66 files), classified by access type.
- The nine files named in the prior reconciliation, re-checked against current line numbers.
- All callers of `fetchProjectSummary`, `fetchInvoiceSummary`, `fetchInvoiceChildDocuments`.

## Files modified (19)

`src/domain/documentRelationships.js`, `src/pages/ClientDetail.tsx`, `src/pages/InvoiceFormPage.tsx`, `src/pages/ViewReceipt.tsx`, `src/hooks/useInvoiceDetailData.js`, `src/components/waybill/WaybillSignatures.tsx`, `src/components/document/AttachExistingDocumentSheet.tsx`, `src/pages/CSR.tsx`, `src/pages/Invoices.tsx`, `src/pages/Waybills.tsx`, and dead-import removals in `src/pages/Clients.tsx`, `src/pages/viewBOQActions.ts`, `src/pages/viewCSRActions.ts`, `src/pages/viewRFQActions.ts`, `src/pages/ProjectDocumentView.tsx`, `src/hooks/useProjectDocumentFetch.ts`, `src/components/document-view/invoice/useInvoiceActions.ts`, `src/modules/invoices/services/invoiceLifecycleService.ts`, `src/hooks/useInvoiceHydration.ts`.

## Migrated public business access

| File | Migrated access |
| :--- | :--- |
| `ClientDetail.tsx` | `csrs`, `waybills`, `projects`, `quotations` (10 queries). Added readiness guards and `tenantClient` deps. |
| `InvoiceFormPage.tsx` | `invoices` next-number read. Added `useEntity`. |
| `ViewReceipt.tsx` | `receipts` single read. Added `useEntity`. |
| `documentRelationships.js` | `fetchProjectSummary`, `fetchInvoiceSummary` (`invoices`), `fetchInvoiceChildDocuments` (`csrs`/`waybills`) now require a `client` argument; removed the `supabase` default fallback. |
| `useInvoiceDetailData.js` | `signatories`, `bank_accounts`. |
| `WaybillSignatures.tsx` | `signatories`. |
| `AttachExistingDocumentSheet.tsx` | Dynamic `table` (invoices/csrs/waybills). Added `useEntity`. |
| `CSR.tsx`, `Invoices.tsx`, `Waybills.tsx` | Passed `tenantClient` to the migrated relationship helpers. |

Dead `supabase` imports removed from nine files that had already migrated to `tenantClient` (no business access remained).

## Intentionally retained raw Supabase access

| Category | Table / RPC | Reason allowed |
| :--- | :--- | :--- |
| GLOBAL / PLATFORM | `workspaces`, `workspace_members`, `workspace_invitations`, `entities`, `entity_permissions`, `permission_templates` | Platform tenancy + authz infra, public schema. |
| PLATFORM RPC | `provision_entity`, `accept_workspace_invitation`, `create_workspace_invitation`, `revoke_workspace_invitation`, `assign_role_to_company_member`, `remove_role_from_company_member`, `get_entity_provisioning_status`, `is_platform_operator` | Public SECURITY DEFINER platform RPCs. |
| USER | `profiles` | User identity, global. |
| DEVICE | `device_installations`, device RPCs (`ensure_android_device_assignment`, `get_device_code_counter_seeds`, `admin_update_device_assignment_code`) | Device scoping, global. |
| NOTIFICATION | `notifications`, `notification_preferences`, `push_device_tokens`, `push_delivery_logs` | Notification/device infra, public schema. |
| AUTH | `supabase.auth.*` | Authentication. |
| STORAGE | `supabase.storage.*` (signatures, compliance, settings buckets) | Object storage, not schema data. |
| OFFLINE SYNC (deferred) | `quotationSync.ts`, `csrSync.ts` (`quotations`, `quotation_items`, `csrs`) | Explicitly deferred by prior ticket; not changed here. |

## Repository-wide public-access classification

All 66 `supabase`-importing files were classified. After this change, no remaining `supabase.from(...)` or `supabase.rpc(...)` reads or writes entity-scoped business tables (`clients`, `invoices`, `invoice_items`, `quotations`, `quotation_items`, `csrs`, `waybills`, `projects`, `project_documents`, `receipts`, `boqs`, `boq_rows`, `rfqs`, `rfq_items`, `item_*`, `signatories`, `bank_accounts`, `tax_*`, `letters`, `blank_*`, `audit_logs`, `activity_events`, `settings`), except the deferred offline-sync files.

## Conversion / link-flow verification

- RFQ → quotation: `viewRFQActions.convertRFQToQuotation` writes via `tenantClient` (unchanged; dead import removed).
- BOQ → quotation: `viewBOQActions.convertBOQToQuotation` writes via `tenantClient` (unchanged).
- CSR linked documents: `CSR.tsx` now passes `tenantClient` to `fetchInvoiceSummary`/`fetchProjectSummary`.
- Project → project documents: `ProjectDocumentView`/`ProjectDocumentSheet`/`useProjectDocumentFetch` already use `tenantClient`.
- Invoice → receipt/payment: `ViewReceipt` now `tenantClient`; `paymentService` already `tenantClient`.
- Client-linked documents: `ClientDetail` now `tenantClient` for all child tabs.

Each resulting business write stays inside the active entity (tenant schema). No public fallback introduced.

## Verification result

- `bun run typecheck`: passed.
- `bun run audit:load`: completed. Same pre-existing bloat/query/heavy warnings as before (24 oversized, 6 broad selects, 1 component fetch, 3 heavy limits); none introduced by this task.
- `git status`: 19 files modified by this task; pre-existing staged/unstaged work from prior sessions remains separate.
- `git diff --stat`: 61 insertions, 66 deletions across 19 files — surgical, no unrelated refactors.
- `bun run build`: skipped per hardware policy.

## Remaining blockers before public purge

1. Offline quotation/CSR sync still reads/writes public business tables (`quotationSync.ts`, `csrSync.ts`). This is the already-deferred future ticket.
2. Creator-permission provisioning question (deferred; not changed here).

No other entity-scoped business access bypasses `tenantClient`.

## Exact recommended next step

The application is purge-gated on the offline-sync ticket only. The next task is the deferred offline quotation/CSR sync tenant-awareness work. After that is implemented and verified end-to-end, re-run this report's classification and proceed to the public-schema purge.

## Skills used

supabase

## Documentation standard

ADS-STE100 Simplified Technical English
