# Waybill Upgrade — Gap Audit & Upgrade Plan

## Source Files Audited

| Layer | Files |
|-------|-------|
| DDL / Migration | `20260520090004_csrs.sql` (waybills table, RLS, indexes) |
| Types & Utils | `waybillUtils.ts` — interfaces, normalizers, mappers, defaults |
| Form (Main) | `WaybillForm.tsx` — full form UI, validation, custom columns, signatures |
| Mutations | `waybillMutations.ts` — insert/update/offline payloads |
| Offline Sequence | `waybillOffline.ts` — `peekNextOfflineWaybillNumber()`, draft persistence, sync queue |
| Sync | `waybillSync.ts` — `processNextPendingWaybillCreate()`, `processWaybillCreateQueueItem()`, `listPendingOrFailedWaybillCreateQueueItems()` |
| List | `Waybills.tsx` — three-state segmented control, sync queue processing, offline detection |
| View Page | `WaybillViewPage.tsx` — hero meta, summary strip, preview, actions |
| View Sub-components | `WaybillHeroMeta.tsx`, `WaybillSummaryStrip.tsx`, `WaybillPrimaryActions.tsx`, `WaybillSecondaryActions.tsx`, `WaybillMoreSheet.tsx`, `WaybillDocumentPreview.tsx` |
| PDF Generator | `WaybillPDF.tsx` — `@react-pdf/renderer` layout, design presets |
| Import Sheet | `WaybillImportSheet.tsx` — JSON import flow |
| Invoice Child Docs | `invoiceChildDocService.ts` (prefill/spawn), `invoiceChildDocRepository.ts` (DB links) |
| Invoice Form (ref) | `SharedDocumentForm.tsx`, `mobileFormPrimitives.tsx` — layout patterns |
| Routes | `AppShell.tsx` — 4 waybill routes (list, new, edit, view) |
| Mock Data | `waybillViewMockData.ts` — mock metrics, preview data |

---

## Gap Analysis

### 1. DDL Constraints — CRITICAL

Architecture specifies 5 check constraints; **zero are implemented**.

| Constraint | Status | Impact |
|------------|--------|--------|
| `check_waybill_type` ('delivery', 'collection', 'return', 'transfer') | **MISSING** | Any string can be inserted; no domain enforcement |
| `check_waybill_status` ('draft', 'dispatched', 'delivered', 'returned', 'cancelled', 'archived') | **MISSING** | Status values unvalidated |
| `check_waybill_transport_mode` ('road', 'air', 'sea', 'rail') | **MISSING** | Column doesn't exist |
| `check_waybill_purpose_conditional` | **MISSING** | Column + constraint don't exist |
| `check_items_json_structure` | **MISSING** | Items array unvalidated |

**Action**: Add all 5 CHECK constraints to migration. The status check is most urgent since sync/offline code depends on valid status transitions.

### 2. Missing Columns — HIGH

| Column | Architecture Spec | DDL | TypeScript Types | Used In |
|--------|-------------------|-----|------------------|---------|
| `custom_fields` | Yes | **MISSING** | Yes (`WaybillForm`, `waybillUtils`, `waybillMutations`) | Form UI, save, sync |
| `transport_mode` | Yes | **MISSING** | Yes (`waybillUtils.ts`) | Form UI |
| `purpose` | Yes | **MISSING** | Yes (`waybillUtils.ts`) | Form UI |
| `property_of` | Yes | **MISSING** | Yes (`waybillUtils.ts`) | Form UI |
| `dispatched_by` | Yes | **MISSING** | Yes (`waybillUtils.ts`) | Form UI |
| `received_by` | Yes | **MISSING** | Yes (`waybillUtils.ts`) | Form UI |
| `received_date` | Yes | **MISSING** | Yes (`waybillUtils.ts`) | Form UI |
| `weight` | Yes | **MISSING** | No | Not in current code |

The `custom_fields` column is especially critical — the form, mutations, and sync all reference it but the column doesn't exist in the database. Inserts will silently drop the data.

**Action**: Add all missing columns in a new migration. Prioritize `custom_fields`.

### 3. Missing `blank_waybill_logs` Table — HIGH

Architecture specifies a dedicated table for sequence number reconciliation and audit. **Not implemented at all.**

```
blank_waybill_logs (
  id, waybill_number, printed_by, printed_at,
  notes, created_at
)
```

**Action**: Create the `blank_waybill_logs` table with FK to auth.users, RLS, and a unique index on `waybill_number` for reconciliation.

### 4. Missing INSERT RLS Policy — CRITICAL BUG

Current migration has RLS policies for SELECT, DELETE, and UPDATE — but **no INSERT policy**.

```sql
-- Only these exist:
CREATE POLICY waybills_authenticated_select ON waybills FOR SELECT TO authenticated USING (true);
CREATE POLICY waybills_authenticated_delete ON waybills FOR DELETE TO authenticated USING (true);
CREATE POLICY waybills_authenticated_update ON waybills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

This means **all INSERT attempts via the API will fail** with a 401/403 when RLS is enforced.

**Action**: Add `CREATE POLICY waybills_authenticated_insert ON waybills FOR INSERT TO authenticated WITH CHECK (true);` or a more restrictive policy matching the csrs pattern.

### 5. Missing Indexes — MEDIUM

CSR table has indexes on `client_id`, `project_id`, `status`, `created_at DESC`, `po_number`. Waybills only has:

- `idx_waybills_archived_active` (partial)
- `idx_waybills_archived_at`
- `idx_waybills_waybill_number_unique` (unique partial)

Missing indexes that matter:
- `idx_waybills_client_id ON waybills(client_id)` — for listing by client
- `idx_waybills_invoice_id ON waybills(invoice_id)` — for invoice-child-doc queries (`fetchChildDocsForInvoice`)
- `idx_waybills_project_id ON waybills(project_id)` — for project-linked views
- `idx_waybills_status ON waybills(status)` — for filtered list queries
- `idx_waybills_created_at ON waybills(created_at DESC)` — for sort-order listing

**Action**: Add all 5 indexes to migration.

### 6. Missing `created_by` Foreign Key — MEDIUM

`created_by uuid` column exists but **no FK constraint** to `auth.users` or `profiles`. The CSR table has the same issue. This means `created_by` is an orphan column that can reference nonexistent users.

**Action**: Either add `REFERENCES auth.users(id)` or `REFERENCES profiles(id)` to the `created_by` column.

### 7. Sequence Engine Not Formalized — MEDIUM

Offline sequence numbering is entirely SQLite-local (`waybillOffline.ts`). There is no server-side sequence table for:
- Online-only environments (mobile web with no native SQLite)
- Multi-device sequence coordination
- Number gap detection / reconciliation

The architecture doc implies a `sequence_numbers` or `blank_waybill_logs` approach server-side.

**Action**: Implement a server-side sequence mechanism (either via a `sequences` table or using the `blank_waybill_logs` pattern for allocated numbers). The offline SQLite path works for native mobile but shouldn't be the only path.

### 8. View Page Uses Mock Data — HIGH

`WaybillViewPage.tsx` receives mock `WaybillMetric[]` data from `waybillViewMockData.ts`. The view page is not wired to real data:

- `WaybillSummaryStrip` displays mock metrics (total packages, dispatch date, delivery status)
- `WaybillDocumentPreview` renders from mock `WaybillPreviewData`
- Status transitions (`onMarkAsDelivered`, `onEdit`, `onDuplicate`, `onCopyNumber`) are passed as props but never connected to actual API calls

The `ViewWaybill.tsx` page needs to be inspected for how it fetches real data (it was referenced in audits but the current view components are purely presentational with mock interfaces).

**Action**: Wire `WaybillViewPage` to real data via `react-query` + `supabase` fetch. Connect status transition handlers to `waybillMutations.ts` update functions.

### 9. No Status Transition Guard — HIGH

The architecture specifies a lifecycle state machine with valid transitions:

```
draft → dispatched (out for delivery)
dispatched → delivered (successful)
dispatched → returned (failed/rejected)
{delivered, returned, draft} → cancelled
any → archived
```

Currently:
- RLS UPDATE allows any status change without validation
- `WaybillMoreSheet.tsx` exposes all lifecycle actions (Mark as Dispatched, Confirm Delivery, Mark as Returned) regardless of current status
- No frontend or backend guard prevents invalid transitions (e.g., delivered → dispatched)

**Action**: Add a status transition validation layer. Options:
- Server-side trigger/function that validates transitions
- Frontend disable logic in `WaybillMoreSheet.tsx` / `WaybillPrimaryActions.tsx` based on current status
- Business logic in `waybillMutations.ts` update handler

### 10. TypeScript / DDL Drift — MEDIUM

The `waybillUtils.ts` interfaces define fields not present in the DDL (`transportMode`, `purpose`, `propertyOf`, `dispatchedBy`, `receivedBy`, `receivedDate`, `customFields`). Conversely, some DDL fields aren't clearly typed in utils (`receiver_signature_url`, `receiver_description`, `vehicle_plate`, `delivery_location`).

This drift means the form can populate fields that get silently dropped at insert time.

**Action**: Align the DDL and TypeScript interfaces. Either add columns to the DB or remove unused fields from the frontend types.

### 11. Invoice Spawning Not Implemented — MEDIUM

Architecture specifies a waybill → invoice **spawning** flow (complete a delivery → optionally generate an invoice for it). Current code only supports the reverse:
- `invoiceChildDocService.buildWaybillPrefill()` — creates a waybill pre-filled from invoice data
- `invoiceChildDocRepository.linkWaybillToInvoice()` — links existing waybill to invoice

There is no "spawn invoice from this waybill" flow in the waybill view page or actions sheet.

**Action**: Implement the spawning flow in `WaybillMoreSheet.tsx` (add "Create Invoice" action) and `invoiceChildDocService.ts` (add `spawnInvoiceFromWaybill()` function).

### 12. WaybillForm Architecture Gap — LOW/MEDIUM

The invoice form uses a modular architecture (`SharedDocumentForm.tsx` composed of `FormHeader`, `FormLineItems`, `FormCommercialTerms`, `FormTotals`, `FormNotesTerms`, `FormFooter`). The waybill form (`WaybillForm.tsx`) is monolithic with all sections in one file.

While not urgent, this makes the waybill form harder to maintain and extend. Consider refactoring to the `SharedDocumentForm` pattern if feature complexity grows.

### 13. No `transport_mode`, `purpose`, or `property_of` in Form UI — MEDIUM

The architecture spec defines transport mode (road/air/sea/rail), purpose (transport/goods/equipment/materials), and property_of fields as core to the waybill domain. The current `WaybillForm.tsx` does not render any of these fields — only shipper, receiver, vehicle, items, signatures etc.

This means these fields (present in types but not in UI) are dead code in the TypeScript interfaces.

**Action**: Either implement the UI fields or remove the unused type definitions.

---

## Upgrade Plan (Priority Order)

### Phase 1 — Fix Critical & Blocking (1-2 days)

| # | Task | Area |
|---|------|------|
| 1.1 | Add `waybills_authenticated_insert` RLS policy to migration | DDL |
| 1.2 | Add missing `custom_fields` column to waybills DDL | DDL |
| 1.3 | Add CHECK constraints for `type` and `status` | DDL |
| 1.4 | Add INSERT policy SQL migration, run `supabase db push` | DDL |

### Phase 2 — Data Integrity (2-3 days)

| # | Task | Area |
|---|------|------|
| 2.1 | Add remaining missing columns (`transport_mode`, `purpose`, `property_of`, `dispatched_by`, `received_by`, `received_date`) | DDL |
| 2.2 | Add `blank_waybill_logs` table with RLS | DDL |
| 2.3 | Add missing indexes (`client_id`, `invoice_id`, `project_id`, `status`, `created_at DESC`) | DDL |
| 2.4 | Add `created_by` FK constraint | DDL |
| 2.5 | Add remaining CHECK constraints | DDL |
| 2.6 | Align TypeScript interfaces with DDL | Types |

### Phase 3 — View & Lifecycle (2-3 days)

| # | Task | Area |
|---|------|------|
| 3.1 | Wire `WaybillViewPage` to real data (fetch from Supabase, replace mock data) | View |
| 3.2 | Connect status transition handlers (`onMarkAsDelivered`, etc.) to `waybillMutations.ts` | View |
| 3.3 | Add status transition validation (frontend disable + server-side trigger) | Lifecycle |
| 3.4 | Add `transport_mode`, `purpose`, `property_of` fields to `WaybillForm.tsx` | Form |

### Phase 4 — Offline & Invoice (2-3 days)

| # | Task | Area |
|---|------|------|
| 4.1 | Implement server-side sequence number allocation (via `blank_waybill_logs` or `sequences` table) | Offline |
| 4.2 | Add waybill → invoice spawning (UI in `WaybillMoreSheet` + service function) | Invoice |
| 4.3 | Refactor `WaybillForm.tsx` into modular sections following `SharedDocumentForm` pattern | Form |

---

## Verification Commands

```sh
# Run after DDL changes
bun run supabase db push

# Waybill-specific tests (adjust to actual test paths)
bun run test -- --testPathPattern=waybill

# Lint
bun run lint

# Type-check
bun run typecheck
```
