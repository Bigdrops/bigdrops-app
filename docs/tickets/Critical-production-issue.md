CRITICAL PRODUCTION TICKET — Complete Data Migration to Tenant Schema
Priority: P0 — Production Blocker
Status: Urgent
Scope: Full application data migration and tenant cutover
Objective
The BIGDROPS application is currently not usable for normal business operations because the application has transitioned toward tenant-scoped data while existing business data remains in the public schema.
Live production verification has confirmed that critical existing data is present in public but missing from the active tenant schema.
The immediate requirement is to restore the complete existing dataset into the tenant architecture and make the tenant schema the sole authoritative data source.
This is now a production recovery and migration task.
Confirmed Production State
The active tenant is:
entity_bigdrops-main_main
The following has been confirmed in production:

public.clients contains 30 existing clients.
entity_bigdrops-main_main.clients contains 0 clients.
The client picker therefore has no tenant client data available.
The application is currently unable to reliably create normal quotations because critical business/client data is missing from the tenant context.
Existing invoice data remains in public:

public.invoices — 239 rows
public.invoice_items — 2,059 rows
public.payments — 26 rows
public.receipts — 4 rows
public.wht_receipts — 0 rows


The tenant invoice schema was provisioned without invoice_items and wht_receipts.
Tenant invoice/payment trigger parity was not present.
Entity permissions are incomplete.
Production database state has already diverged from repository migrations.

This confirms that the system is currently in an incomplete migration state.
Primary Requirement
Perform a complete one-time migration of existing business data from the public schema into the active tenant schema.
The migration must preserve:

UUIDs
relationships
existing document numbers
client references
invoice references
quotation references
payment references
receipt references
project references
linked-document references
historical data
audit integrity
financial values
document metadata

The tenant schema must become the single authoritative source after cutover.
There must be no dual-read or dual-write architecture after migration.
Data Migration Scope
Before modifying application reads/writes, inventory the repository and production database to identify every business table that currently contains production data and determine its tenant equivalent.
At minimum, migrate and reconcile:

clients
quotations
quotation_items
invoices
invoice_items
payments
receipts
wht_receipts
projects
boqs
csrs
rfqs
waybills
letters
bank_accounts
settings
signatories
tax_settings

Also identify any additional entity-owned business tables that exist in production but are not listed above.
Do not assume that the currently known provisioning template is complete.
Data Ownership Rule
Determine which tables are:

Tenant-owned business data.
Global/shared data.
System/configuration data.
Audit/history data.

Tenant-owned data must be migrated into:
entity_bigdrops-main_main
Global/shared resources should remain global only when that is explicitly supported by the existing architecture.
Do not duplicate global resources unnecessarily.
ID Preservation
Existing primary keys must be preserved wherever technically possible.
For example:
Century Mining Company Ltd
must retain its existing client UUID when moved into the tenant schema.
Do not create replacement UUIDs for existing records.
This is required to preserve existing relationships between:

clients
quotations
invoices
invoice items
payments
receipts
projects
linked documents
audit records

Referential Integrity
Before deleting any public data, verify all foreign-key relationships and application-level references.
Specifically verify relationships involving:

client_id
quotation_id
invoice_id
payment_id
project_id
linked document IDs
CSR invoice links
waybill invoice links
quotation/invoice conversion relationships

No orphaned records are acceptable.
Tenant Schema Provisioning
Fix the provisioning system so newly provisioned entities receive the complete required business schema.
At minimum:

Add invoice_items.
Add wht_receipts.
Add all other missing tenant-owned tables discovered during the inventory.
Recreate required updated_at triggers.
Recreate created_by / updated_by ownership triggers.
Recreate required RLS policies.
Ensure required foreign keys and indexes exist.
Ensure required constraints match the canonical application model.

Do not merely patch the currently active tenant manually.
The provisioning system itself must be corrected so future tenants receive the same complete schema.
Permissions
Ensure the active production user has the required entity permissions for all tenant-owned resources needed by the application.
At minimum verify permissions for:

client
quotation
invoice
payment
receipt
project
and every other migrated tenant-owned resource used by the application.

Do not grant permissions blindly. Follow the existing permission model and verify the resulting effective permissions.
Application Cutover
After successful data migration:

All client reads must use tenant data.
All quotation reads/writes must use tenant data.
All invoice reads/writes must use tenant data.
All payment reads/writes must use tenant data.
All receipt reads/writes must use tenant data.
All other tenant-owned business data must use the tenant schema.

The public schema must no longer be an active production write target for migrated tenant-owned business data.
Search the entire repository for:

supabase.from(
direct public-schema table references
invoice repositories
quotation repositories
client repositories
payment repositories
receipt repositories
document conversion flows
dashboard/report queries
search queries
export queries
PDF queries
notification queries
batch operations
server/API routes
RPCs

Every affected path must be reconciled with the tenant architecture.
Composite Operations
Where an operation spans multiple tenant tables, ensure it is atomic.
Examples:

quotation + quotation items
invoice + invoice items
payment + invoice status + receipt
payment + WHT
invoice → quotation revert
document conversion flows

No partial-write state should be possible.
Financial Logic
Preserve existing financial calculation formulas.
Do not modify locked calculation logic merely to facilitate migration.
However, financial views/RPCs must be made tenant-aware and must return statuses compatible with the canonical invoice status constraint:

unpaid
partially_paid
paid
archived

The existing live financial view returning partial / overdue must be reconciled without corrupting financial state.
Invoice Numbering
Existing invoice and quotation numbers must be preserved.
After migration, numbering must continue from the existing sequence without duplication or reset.
The numbering source must be tenant-aware.
Do not renumber historical documents.
Audit
Audit/activity history must remain complete.
Determine which audit tables are intentionally global and keep them global where required.
Any invoice/payment audit RPC currently hardcoded to public.invoices, public.payments, etc. must be made tenant-aware.
Do not silently lose historical activity during migration.
Public Data Removal
Do not delete public data until the migration has been fully verified.
The final architecture requires legacy public copies of tenant-owned business data to be removed after successful cutover.
Deletion must occur only after:

Tenant row counts match expected source counts.
Primary keys are preserved.
Foreign-key/application references are verified.
Client picker works.
Quotation creation works.
Invoice creation works.
Invoice editing works.
Invoice deletion works.
Payments work.
Receipts work.
WHT functionality works where applicable.
Dashboard/report data is correct.
PDF generation works.
CSV export works.
Search works.
Linked documents work.
Audit history remains accessible.
No production application path reads from the legacy public tables.

Only then may the legacy public copies be deleted.
The deletion must itself be performed through a controlled migration with a clear rollback/recovery strategy.
Critical Safety Rule
Do not delete public production data merely because tenant migration appears successful.
First establish a verifiable migration checkpoint.
The migration must produce a reconciliation report containing, at minimum:



Table
Public Before
Tenant After
Match




clients





quotations





quotation_items





invoices





invoice_items





payments





receipts





wht_receipts





projects





boqs





csrs





rfqs





waybills






Include every additional migrated tenant-owned table.
Skills
Read AGENTS.md before modifying anything.
Then load the relevant skills from:
docs/PROJECTSKILLINDEX.md
At minimum identify and use the applicable skills for:

Supabase/Postgres migrations
tenant/multi-tenancy architecture
database/RLS
audit integrity
TypeScript
frontend/data-layer migration
PDF correctness
CSV/export correctness

Constraints

Runtime: Bun only.
Never use npm, yarn, or pnpm.
Do not run bun run build.
Do not change locked financial calculation formulas.
Do not renumber existing documents.
Do not generate replacement IDs for existing records unless technically unavoidable and explicitly documented.
Do not perform unrelated refactors.
Preserve existing business behavior.
Do not create dual-read or dual-write as a permanent solution.
Do not delete public production data before migration verification.
Do not guess missing schema relationships; inspect the repository and database first.

Verification
For active code changes:

Run bun run typecheck.
Run bun run audit:load when database/schema/query/data-layer logic is touched.
Run git status.
Run git diff --stat.
Confirm only intended files changed.

Do not run:
bun run build
The build is explicitly excluded because of the host resource constraint.
Acceptance Criteria
The ticket is complete only when:

All existing tenant-owned business data has been migrated.
Existing IDs and relationships are preserved.
The client picker displays the existing 30 clients.
Century Mining Company Ltd is available in the client picker.
New quotations can be created normally through the application.
Quotation company identity/settings render correctly.
Existing quotations remain intact.
Existing invoices remain intact.
Invoice items remain intact.
Payments and receipts remain intact.
Dashboard/report calculations remain correct.
PDF exports remain correct.
CSV exports remain correct.
Audit history remains intact.
No migrated tenant-owned production data is still being read from public tables.
No migrated tenant-owned production data is still being written to public tables.
Tenant RLS and permissions work correctly.
Provisioning is corrected for future tenants.
Migration reconciliation shows no unexpected data loss.
Only after all of the above are verified are the legacy public copies deleted.

Priority
This is an emergency production-blocking migration.
The application is currently not reliably usable for normal business operations because critical existing business data is unavailable through the tenant architecture.
Restore the existing business data first.
Do not optimize for incremental feature development while the production data migration remains incomplete.
The desired end state is:
Existing production data → Complete tenant migration → Application fully tenant-backed → Verification → Delete legacy public copies
No permanent compatibility layer or duplicate production dataset should remain.
