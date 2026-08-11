Implement the confirmed root-cause fix for Invoice Edit persistence.

CONTEXT

The forensic investigation is complete.

Invoice creation and the previous missing-line-items problem are already fixed. Do NOT revisit them.

The active bug is:

Edit Invoice → Save appears successful → audit records the edited values → tenant database remains unchanged → View Invoice shows the old values.

Test invoice:

- Invoice: SASINV077
- Invoice ID: "1def13cc-18b5-4c01-b62d-18be0bffae85"
- Entity ID: "eca34515-0b30-482c-b12e-3963df164322"
- Tenant schema: "entity_bigdrops-main_main"

CONFIRMED ROOT CAUSE

"useInvoiceSave.ts" builds the edit payload without the invoice "id".

The save RPC is called with:

"save_invoice_with_items_transaction"

The RPC edit branch uses:

"WHERE id = (p_invoice_payload->>'id')::uuid"

Because the edit payload has no "id":

"p_invoice_payload->>'id' = NULL"

Therefore:

"WHERE id = NULL"

matches zero rows.

The RPC does not currently raise an error for this zero-row UPDATE.

The subsequent item replacement also receives a NULL invoice ID.

The frontend then treats the RPC as successful because edit mode does not require returned data to be non-null.

The audit log is generated independently from frontend state, which is why audit history shows the edited values even though the database was not changed.

REQUIRED FIX

Modify only the Invoice Edit save payload construction.

In "useInvoiceSave.ts", ensure that when editing an existing invoice, the payload sent to "save_invoice_with_items_transaction" contains the existing invoice ID:

"payload.id = id"

Use the actual existing variable/state containing the invoice ID. Do not invent a new ID.

The resulting edit payload must contain:

"id: "1def13cc-18b5-4c01-b62d-18be0bffae85""

for SASINV077.

IMPORTANT SAFETY REQUIREMENTS

Do NOT:

- modify the RPC
- modify invoice calculations
- modify audit logging
- modify quotation
- modify RLS
- modify permissions
- modify provisioning
- modify PDF rendering
- modify invoice creation
- perform a migration
- refactor unrelated save architecture

This is a one-line/root-cause payload fix unless source inspection proves that the existing variable cannot safely supply the ID.

Before editing, read:

- "AGENTS.md"
- "docs/PROJECTSKILLINDEX.md"
- ".agents/skills/supabase/SKILL.md"
- ".agents/skills/supabase-postgres-best-practices/SKILL.md"
- relevant audit/document-save skills

IMPORTANT: DO NOT CLEAN DATABASE ORPHANS YET

The forensic report identified a risk that failed edits may have attempted item insertion with "invoice_id = NULL".

Do NOT delete or modify any orphan "invoice_items" yet.

That is a separate cleanup task and must only happen after the edit fix is verified and the orphan rows are explicitly inventoried.

REQUIRED STATIC VERIFICATION

After the code change:

1. Inspect the final diff.
2. Confirm the edit payload contains the existing invoice ID before the RPC call.
3. Confirm create mode is unchanged.
4. Run "bun run typecheck".
5. Run "bun run audit:load" only if required by the project's existing audit/data-layer rules.
6. Run "git status".
7. Do NOT run "bun run build".

HANDOFF

Report:

- exact file changed
- exact logic changed
- why the fix resolves "WHERE id = NULL"
- verification results
- whether any unrelated files changed

Do not claim the live edit is fixed unless the user subsequently performs the controlled SASINV077 save test.