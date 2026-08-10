Dashboard Redesign — Financial Data Architecture Context
Status: Future Work / Intentionally Deferred
Created: 2026-08-09
Scope: Dashboard redesign and financial metrics integration
Context
The 20260809* invoice aggregate migration series was completed successfully.
The tenant invoice aggregate is now fully provisioned and verified:

invoices: 239
invoice_items: 2,059
payments: 26
receipts: 4
wht_receipts: 0
Tenant invoice_financials_v: 239 rows

The tenant financial view is:
entity_bigdrops-main_main.invoice_financials_v

It provides:
id
invoice_number
client_id
client_name
project_id
issue_date
due_date
total_gross
status
cash_received
wht_received
settled_total
balance_due
computed_status
persisted_status

persisted_status was added specifically to map computed financial states into the valid persisted invoice-status vocabulary.
Example verified row:
computed_status: unpaid
persisted_status: unpaid
balance_due: 424625

Important Dashboard Finding
A check for:
SELECT to_regprocedure(
  'public.get_dashboard_financial_metrics(uuid)'
);

returned:
null

Therefore, there is currently no PostgreSQL function with that signature.
The frontend has previously referenced get_dashboard_financial_metrics, but this was deliberately NOT addressed during the 20260809 migration work.
Do not treat this as a migration failure
The absence of get_dashboard_financial_metrics is intentionally deferred.
The dashboard is being redesigned separately, so the future redesign should determine whether:

the existing RPC is still required;
dashboard metrics should instead query invoice_financials_v;
a new dashboard-specific RPC should be created;
multiple aggregate queries should be consolidated into a new reporting layer; or
the existing frontend call is obsolete and should be removed.

Do not create get_dashboard_financial_metrics merely to make the current dashboard call stop returning 404.
The dashboard redesign should make that architectural decision deliberately.
Relevant Database Architecture After 20260809 Migrations
The invoice aggregate now has tenant-aware infrastructure:
Financial view
<tenant_schema>.invoice_financials_v

This is the primary tenant-aware financial projection for invoice state.
Transaction RPCs
save_invoice_with_items_transaction(
    p_entity_id uuid,
    p_invoice_payload jsonb,
    p_items jsonb,
    p_mode text
)

delete_invoice_with_items_transaction(
    p_entity_id uuid,
    p_invoice_id uuid
)

record_payment_transaction(
    p_entity_id uuid,
    p_payment_payload jsonb
)

Schema-aware audit RPCs
The invoice/payment audit functions now support an optional:
p_entity_id uuid

allowing them to resolve invoice data from the appropriate tenant schema while retaining compatibility with existing callers.
Invoice → quotation revert
revert_invoice_to_quotation_transaction now supports:
p_entity_id uuid DEFAULT NULL

and resolves the invoice from the appropriate tenant schema while continuing to create the quotation in public.
Dashboard Redesign Requirements
When redesign begins:
1. Inspect before changing
Read the current dashboard implementation and determine:

every financial metric currently displayed;
every Supabase query/RPC used;
which metrics come from invoices;
which metrics come from payments;
which metrics come from receipts/WHT;
whether any metrics are calculated client-side;
whether any metrics still assume invoice data lives in public.

2. Treat invoice_financials_v as an architectural input
Do not automatically recreate financial calculations in the dashboard.
Evaluate whether the tenant financial view already provides the required source data.
Particularly investigate:
total_gross
cash_received
wht_received
settled_total
balance_due
computed_status
persisted_status

3. Preserve tenant isolation
The redesigned dashboard must remain entity/tenant-aware.
Do not introduce queries that blindly read:
public.invoices
public.invoice_items
public.payments

when equivalent tenant-scoped data is available.
4. Decide the reporting boundary deliberately
The redesign should establish whether dashboard reporting belongs in:

tenant financial views;
dedicated reporting views;
database RPCs;
frontend aggregation; or
a combination of these.

Prefer database-side aggregation for expensive or cross-record financial calculations rather than repeatedly loading large datasets into the frontend.
5. Do not resurrect obsolete APIs
Before creating or restoring:
get_dashboard_financial_metrics

determine whether the redesigned dashboard actually needs it.
If a replacement is appropriate, create the replacement around the new tenant-aware architecture rather than reproducing the old public-schema assumptions.
Known Migration State
The complete 20260809* migration sequence is applied:
20260809010000  ✅
20260809020000  ✅
20260809030000  ✅
20260809040000  ✅
20260809050000  ✅
20260809060000  ✅
20260809070000  ✅

The invoice aggregate migration was verified against the public source data and matched exactly for the core migrated tables.
The historical orphan invoice_items discovered during migration were not deleted. The migration was adjusted so those historical orphan relationships did not cause the migration to fail validation.
Acceptance Criteria for Future Dashboard Work
The redesigned dashboard should:

use the current tenant-aware invoice architecture;
correctly represent invoice/payment/settlement state;
distinguish cash received from WHT received;
correctly calculate outstanding balances;
avoid public-schema assumptions for tenant-owned invoice data;
avoid unnecessary client-side financial aggregation;
establish a deliberate replacement or retirement decision for get_dashboard_financial_metrics;
preserve existing business semantics unless explicitly changed by the redesign;
avoid introducing unrelated changes to invoice, payment, or provisioning infrastructure.

Historical Note
The missing get_dashboard_financial_metrics RPC was observed after the 20260809* migration series was completed.
It was intentionally left alone because a dashboard redesign is planned.
Future agents should therefore understand:

The migration work is complete. The missing dashboard RPC is deferred dashboard redesign context, not an incomplete migration.

