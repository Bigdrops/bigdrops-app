# Invoice Edit Does Not Persist - Forensic Report

This report was written by opencode on 2026-08-11 via Local Runner.

## Objective

Find why edited values for invoice SASINV077 do not persist in the tenant database.

## Scope

- Trace the Edit Invoice save path from the UI to the database.
- Identify the exact payload and mutation.
- Identify the audit mechanism.
- Prove the root cause.
- Propose a minimal fix.
- Define a verification test.

This report does NOT cover invoice creation or the previous missing-items problem.

## Skills used

supabase, supabase-postgres-best-practices, audit-trail-investigation

## Documentation standard

ADS-STE100 Simplified Technical English

## Changes made

No code changes were made.

This report is a forensic finding only.

## Test invoice

- Invoice number: SASINV077
- Invoice id: 1def13cc-18b5-4c01-b62d-18be0bffae85
- Tenant schema: entity_bigdrops-main_main
- Entity id: eca34515-0b30-482c-b12e-3963df164322
- Original persisted values:
  - subtotal: 110000
  - vat: 8250
  - total: 128250
- Original item: "12V 75Ah Battery", quantity 1, unit "nos", unit price 110000, amount 110000

## Actual Edit Save Chain

1. EditInvoice.tsx renders the edit route.
2. InvoiceFormPage.tsx loads with mode="edit".
3. useInvoiceSave builds the save strategy.
4. useDocumentSave.save() runs on Save press.
5. save() calls strategy.buildPayload().
6. save() calls strategy.persist().
7. persist() calls the Supabase RPC save_invoice_with_items_transaction.
8. The RPC runs UPDATE and item replacement in the tenant schema.
9. save() calls strategy.afterSave() for audit logging.

## Actual Payload

buildPayload() in useInvoiceSave.ts constructs the payload.

The payload contains:

- po_number
- invoice_title
- project_id
- client_id
- client_name
- issue_date
- due_date
- status
- document_type
- payment_terms
- notes
- terms
- workmanship
- transportation
- shipping
- discount
- vat
- wht
- custom_fields
- work_duration
- subtotal
- install_rate_total
- total
- amount_in_words

The payload does NOT contain the invoice id.

The edited values (subtotal 190000, vat 14250, total 214250) reach the RPC inside the payload.

## Actual Database Mutation

persist() in useInvoiceSave.ts (lines 302 to 310) calls:

supabase.rpc('save_invoice_with_items_transaction', {
  p_entity_id: entityId,
  p_invoice_payload: payload,
  p_items: itemsToSave,
  p_mode: 'update',
})

The RPC UPDATE statement (migration 20260809070000) uses:

WHERE id = (p_invoice_payload->>'id')::uuid

Because the payload has no id field:

- (p_invoice_payload->>'id') is NULL.
- WHERE id = NULL matches zero rows.
- The UPDATE affects zero rows.

The migration file DECLARE block declares v_schema, not p_schema_name. The file references p_schema_name in format() calls. This would fail if the file were the deployed version. The prompt confirms CREATE works. Therefore the deployed RPC differs from this migration file.

The missing id bug affects both versions.

The RPC then runs item replacement:

- v_invoice_id := (p_invoice_payload->>'id')::uuid = NULL.
- DELETE FROM invoice_items WHERE invoice_id = NULL deletes zero rows.
- INSERT item statements insert rows with invoice_id = NULL.
- The invoice_items.invoice_id column is nullable, so the insert succeeds.
- Orphan items with NULL invoice_id accumulate in the tenant schema.

The RPC returns:

- id = NULL
- invoice = NULL
- items_saved = number of items

No error is returned.

useDocumentSave.ts line 74 checks:

if (error || (isCreate && !data))

For edit mode:

- error is null.
- isCreate is false.
- data is not required.

Therefore the hook treats the save as success.

## Audit Mechanism

afterSave() in useInvoiceSave.ts runs after the mutation.

For edit mode it calls recordAuditLog with:

- action: 'UPDATE'
- oldData: initialInvoiceSnapshot
- newData: _updatedInvoice

_updatedInvoice is built from the frontend invoice state, not from the database. It contains the edited values.

Audit logging is independent of the database mutation. It reads frontend state only. This is why audit_logs shows the edited values while the tenant tables remain unchanged.

## Root Cause

The edit payload does not include the invoice id.

The RPC targets the UPDATE at WHERE id = NULL. The UPDATE affects zero rows. The RPC returns success without error. The frontend treats the save as success and logs the audit from its own state.

The tenant database rows remain unchanged.

## Minimal Fix

Add the invoice id to the payload for edit mode.

In useInvoiceSave.ts persist(), edit branch:

if (entityId && !isCreate) {
  payload.id = id
}

Place this line before the RPC call.

## Verification

Run a controlled test on SASINV077.

1. Open Edit Invoice for SASINV077.
2. Change subtotal to 190000. Let VAT and total recalculate.
3. Press Save.
4. Query the tenant database:

SELECT subtotal, vat, total
FROM entity_bigdrops-main_main.invoices
WHERE id = '1def13cc-18b5-4c01-b62d-18be0bffae85';

The row must show the new values.

5. Query the tenant items:

SELECT description, quantity, unit, unit_price, amount
FROM entity_bigdrops-main_main.invoice_items
WHERE invoice_id = '1def13cc-18b5-4c01-b62d-18be0bffae85';

The items must show the new values. No item may have invoice_id = NULL.

6. Open View Invoice for SASINV077.
7. Confirm the view shows the same new values.

Edit, Save, database, and View must all contain the same values.

## Verification result

- bun run audit:load: not run (no code changes)
- bun run typecheck: not run (no code changes)
- git status: no changes
- bun run build: skipped due to hardware policy

## Risks or limitations

- The migration file on disk may differ from the deployed RPC. The deployed RPC was confirmed working for CREATE. The missing id bug is independent of that difference.
- The item insert with invoice_id = NULL may leave orphan rows from previous failed edits.

## Deferred work

- Apply the one-line payload fix.
- Clean orphan invoice_items rows with invoice_id = NULL.
- Run the verification test.