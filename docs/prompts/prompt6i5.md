You are taking over the BIGDROPS Invoice/Quotation investigation.

IMPORTANT: The previous recovery work has ALREADY fixed the earlier Invoice problems. Do NOT reopen or re-investigate those unless evidence from the current edit investigation directly requires it.

REQUIRED SKILLS

Before investigating, read and actively use:

- ".agents/skills/supabase/SKILL.md"
- ".agents/skills/supabase-postgres-best-practices/SKILL.md"
- Relevant references from those skills.

Also read "AGENTS.md" and "docs/PROJECTSKILLINDEX.md".

Use the Supabase skills for all live database/RPC/schema/RLS investigation.

---

CURRENT SITUATION

The BIGDROPS Invoice system previously had two major problems:

1. Existing invoices displayed without their line items.
2. Invoice creation/save failed with:
   "column "p_schema_name" does not exist"

Those issues have ALREADY been investigated and fixed.

Confirmed recovered

- Existing invoice data and line items are present in the tenant schema.
- Invoice line items now display correctly.
- Invoice images/data have returned.
- The broken "save_invoice_with_items_transaction()" schema-variable defect was corrected.
- New invoice creation now works.
- Invoice saving is no longer failing with the original "p_schema_name" error.

DO NOT spend time trying to fix those problems again.

---

THE ONLY ACTIVE PROBLEM

EDIT INVOICE DOES NOT PERSIST

The controlled test invoice is:

"SASINV077"

Invoice ID:

"1def13cc-18b5-4c01-b62d-18be0bffae85"

Current persisted tenant state is:

Invoice

- subtotal: "110000"
- vat: "8250"
- total: "128250"

Item

- description: "12V 75Ah Battery"
- quantity: "1"
- unit: "nos"
- unit price: "110000"
- amount: "110000"

The live tenant database currently still contains exactly those original values.

Tenant schema:

"entity_bigdrops-main_main"

---

WHAT THE USER DID

The user opened Edit Invoice for SASINV077 and made changes.

The UI/audit system recorded multiple UPDATE events.

One recorded:

- subtotal: "110000 → 190000"
- VAT: "8250 → 14250"
- total: "128250 → 214250"

Another recorded:

- subtotal: "110000 → 110001"
- VAT: "8250 → 8250.075"
- total: "128250 → 128251.075"

So the application clearly believes an invoice update occurred.

However, when we inspect the actual tenant database afterward:

"invoices" still says:

"110000 / 8250 / 128250"

and "invoice_items" still says:

"12V 75Ah Battery / 1 / 110000 / 110000"

The View Invoice page therefore correctly continues showing the original saved invoice.

---

IMPORTANT AUDIT EVIDENCE

The relevant "public.audit_logs" records exist.

Columns are:

- id
- entity_type
- entity_id
- entity_label
- action
- actor_id
- actor_label
- source
- scope_type
- created_at
- changes
- reason

For SASINV077 the audit trail contains UPDATE records such as:

"entity_type = invoice"

"entity_id = 1def13cc-18b5-4c01-b62d-18be0bffae85"

"entity_label = SASINV077"

"actor_label = jaiyewisdom@gmail.com"

"source = web"

"scope_type = app"

The audit records are NOT the source of truth for whether the invoice actually persisted.

The tenant database is the source of truth.

---

WHAT WE NEED TO FIND

We need to trace ONLY this path:

"Edit Invoice"
→ "Save"
→ actual frontend mutation
→ actual RPC/service/query
→ tenant invoice UPDATE
→ tenant invoice_items replacement
→ returned result
→ audit generation

We need to identify exactly where the edited values disappear.

---

FIRST INVESTIGATION

Inspect the repository and identify the exact Edit Invoice save path.

Find:

- Edit Invoice component
- save handler
- save hook/service
- Supabase call/RPC
- payload construction
- item payload construction
- audit call

Do NOT assume the save path is correct merely because "save_invoice_with_items_transaction()" was fixed previously.

Prove the actual call chain from source code.

---

CRITICAL QUESTIONS

Answer these in order.

1. What exact function is called when the user presses Save?

Identify the source file and function.

2. What exact Supabase client is used?

Determine whether the save operation uses:

- "supabase"
- "tenantClient"
- another database abstraction
- RPC

Show the chain.

3. What exact invoice ID is sent?

Verify whether Edit Invoice sends:

"1def13cc-18b5-4c01-b62d-18be0bffae85"

Do not assume.

4. What exact values are sent?

Determine whether the values:

"190000 subtotal"
"14250 VAT"
"214250 total"

actually reach the mutation.

Also inspect the edited line items.

5. Does the actual UPDATE affect a row?

The current RPC's UPDATE uses:

"WHERE id = (p_invoice_payload->>'id')::uuid"

Determine whether the update can silently affect zero rows.

6. Are invoice items replaced?

The RPC deletes existing tenant invoice items and reinserts "p_items".

Determine whether this happens during the edit.

7. Is another operation overwriting the update?

Look for:

- duplicate saves
- stale state
- automatic recalculation
- post-save writes
- effects triggered after Save
- multiple RPC calls
- refetch/synchronization logic
- another invoice update immediately after the successful edit

This is especially important because the audit trail records multiple updates while the final database state remains unchanged.

8. Why does the audit trail record the edited values?

Find exactly where the audit record is generated.

Determine whether audit logging happens:

- before mutation
- after mutation
- independently from mutation
- from frontend state
- from a database trigger
- through another RPC

---

VERY IMPORTANT

Do NOT conclude:

"the RPC is broken"

just because the database remains unchanged.

The RPC was already fixed for the previous "p_schema_name" issue, and CREATE now works.

We now need to establish whether the EDIT path:

- calls the RPC incorrectly,
- sends the wrong ID,
- sends stale payload,
- calls another mutation,
- updates the wrong schema,
- performs a zero-row UPDATE,
- gets overwritten afterward,
- or has a frontend state problem.

---

LIVE DATABASE FACTS

Entity:

"eca34515-0b30-482c-b12e-3963df164322"

Resolved schema:

"entity_bigdrops-main_main"

Resolver:

"public._prov_get_schema_name(p_entity_id)"

Current resolver correctly returns:

"entity_bigdrops-main_main"

Do not modify provisioning or schema resolution unless the current evidence proves it is involved.

---

DO NOT TOUCH

Until the edit root cause is proven, do NOT:

- modify quotation
- rewrite invoice architecture
- rerun provisioning
- recreate tenant schema
- delete SASINV077
- delete invoice data
- rewrite RLS
- rewrite permissions
- change calculation logic
- change PDF rendering
- modify payment systems
- perform broad migrations
- alter public invoice template tables
- refactor unrelated code

---

REQUIRED RESULT

Return a forensic finding with exactly:

1. Actual Edit Save Chain

"Edit Invoice → ... → ... → database"

2. Actual Payload

Show the invoice ID, header totals, and item values reaching the mutation.

3. Actual Database Mutation

Identify the exact RPC/query and whether it affects the tenant row.

4. Audit Mechanism

Explain exactly how the UPDATE audit record is generated.

5. Root Cause

Explain why the UI/audit says the invoice changed while:

"entity_bigdrops-main_main.invoices"

and

"entity_bigdrops-main_main.invoice_items"

remain unchanged.

6. Minimal Fix

Only after the root cause is proven, propose the smallest targeted fix.

7. Verification

Define a controlled edit test using SASINV077 that proves:

Edit → Save → database → View

all contain the same new values.

This is NOT an investigation into Invoice creation or the previous missing-items problem.

Those are recovered.

The sole active incident is: existing Invoice Edit changes do not persist.