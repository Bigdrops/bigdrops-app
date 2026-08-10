Dashboard Redesign — Context & Technical Debt Ticket

Created: 2026-08-10
Author: Boniface
Status: Open (pre-redesign)
Related: Phase 3 multi‑tenant migration (20260809* chain), tenant invoice aggregate cutover

---

1. Background

The BIGDROPS application has completed a large-scale multi‑tenant data migration for the invoice aggregate.
All invoice, payment, receipt, and WHT data now lives in the tenant schema entity_bigdrops‑main_main, with the public schema retained as a legacy/rollback copy.
The migration applied 7 new migrations (20260809010000–20260809070000) that:

· Provisioned missing tenant tables (invoice_items, wht_receipts)
· Seeded entity permissions for invoice/*, payment/*, receipt/*
· Installed tenant triggers, RLS policies, and a tenant‑aware financial view invoice_financials_v
· Created schema‑aware audit RPCs and cross‑schema revert logic
· Added atomic transactional RPCs for invoice save/delete/payment

The invoice aggregate is now fully tenant‑owned; the application is in the process of switching its read/write paths from the public schema to the tenant schema.

2. Current Dashboard State

The dashboard currently shows a toast error on load:

“Dashboard unavailable Registry ID: err_1786301744629_p6y13g”

Root cause: The frontend calls a non‑existent RPC get_dashboard_financial_metrics at src/hooks/useDashboardData.ts:481. This RPC was never created in any migration; it is likely a planned aggregation function that was never deployed.

What does work:

· Tenant schema is fully accessible (PostgREST exposure fixed)
· invoice_financials_v exists in entity_bigdrops‑main_main with 239 rows, one per invoice, and includes a persisted_status column that maps computed statuses (partial, overdue) to the valid invoice CHECK constraint vocabulary (unpaid, partially_paid, paid, archived).
· All invoice aggregate permissions are live for the production user.

What does NOT work:

· get_dashboard_financial_metrics returns HTTP 404 → the dashboard catches the error and shows a toast.
· The dashboard may still be reading from public.invoice_financials_v instead of the tenant schema view. If the tenant client has been applied to the dashboard data hooks is unknown; the last Phase 2 migration only switched Settings and Clients reads. Invoice reads (including dashboard) were planned for Phase 3 but not yet fully executed.

3. Technical Debt & Integration Gaps

3.1 Missing Dashboard RPC

· get_dashboard_financial_metrics – invoked with p_entity_id uuid (likely). No definition exists in migrations or live database.
· The frontend expects the RPC to return aggregated financial metrics (probably totals, counts, charts). The exact shape is not documented; it may need to be reverse‑engineered from the calling code.

3.2 Schema Awareness

· The dashboard data hook useDashboardData.ts currently reads invoice_financials_v via the public Supabase client (not tenantClient). It needs to be migrated to use the tenant client, or a new RPC must be created that resolves the correct schema.
· The tenant client (useEntity() → tenantClient) is already available in the provider tree.

3.3 Supabase Types Drift

· The generated types (src/lib/database.types.ts) are stale:
  · revert_invoice_to_quotation_transaction still shows the old 3‑parameter signature.
  · invoice_financials_v does not include persisted_status.
  · The new composite RPCs (save_invoice_with_items_transaction, etc.) are absent.
· Regenerating types after the redesign would be prudent.

3.4 Legacy Public Writes

· Many frontend write paths still use supabase.from('invoices').insert/update/delete directly on the public schema. The new transactional RPCs (070000) are available but not yet adopted by the frontend. The redesign should switch to these tenant‑aware RPCs where appropriate.

4. Relevant Artifacts

Artifact Location Notes
invoice_financials_v (tenant) entity_bigdrops‑main_main.invoice_financials_v 239 rows, correct persisted_status
get_dashboard_financial_metrics MISSING Frontend call at useDashboardData.ts:481
Transactional invoice RPCs public.save_invoice_with_items_transaction public.delete_invoice_with_items_transaction public.record_payment_transaction Created by 20260809070000
Schema‑aware audit RPCs public.record_invoice_created (overloaded) public.record_invoice_status_changed public.record_payment_recorded public.record_payment_voided public.record_payment_attachment_uploaded All accept optional p_entity_id
Permissions entity_permissions includes invoice/*, payment/*, receipt/* for the production user Fully seeded
Tenant client src/lib/tenantClient.ts Use useEntity().tenantClient

5. Recommendations for Dashboard Redesign

1. Create the missing get_dashboard_financial_metrics RPC
   · Define it as a SECURITY DEFINER function that accepts p_entity_id uuid and resolves the correct tenant schema to aggregate data from invoices, payments, receipts, and the financial view.
   · Or, eliminate the RPC entirely and have the dashboard hook query the tenant view directly via tenantClient.
2. Migrate dashboard data hooks to tenant client
   · Replace supabase.from('invoice_financials_v') with tenantClient.from('invoice_financials_v') inside useDashboardData.ts.
   · Ensure all read paths (cash received, pending invoices, charts) use the tenant schema.
3. Adopt the new transactional RPCs for any dashboard‑triggered actions (e.g., recording a payment, voiding). This will guarantee atomicity and proper tenant isolation.
4. Regenerate Supabase types after the redesign to remove drift and get accurate TypeScript definitions.
5. Remove the dashboard toast fallback once the data loading is reliable.

6. Immediate Action Items (optional)

· If the dashboard redesign is not immediate, the current toast error can be silenced by wrapping the RPC call in a feature flag or simply not showing the toast.
· If the dashboard is needed now, the fastest fix is to create a basic get_dashboard_financial_metrics(p_entity_id) that queries the tenant invoice_financials_v and returns the expected JSON shape.

7. Questions for the Redesign

· What exact metrics does the dashboard need? (Total revenue, outstanding, paid vs unpaid, recent activity, etc.)
· Should the dashboard be tenant‑only, or also show platform‑wide aggregates for operators?
· Will the redesign use the same useDashboardData hook or a new data‑fetching strategy?
· Should the dashboard become a server‑driven widget system or remain a fixed set of components?

---

This ticket provides context for the future dashboard redesign. It captures the current known issues, the state of the data layer, and a clear path to integrate the dashboard into the new multi‑tenant architecture.