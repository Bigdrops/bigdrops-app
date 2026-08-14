

**Task title**  
Implement the confirmed root-cause fix for Invoice Edit persistence.  
Investigate the confirmed Invoice View/PDF financial-rendering defect.  
Do both tasks in order. Do not mix them.

**Common context**  
You work on the BIGDROPS business platform.  
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.  
Runtime: Bun only. Never use npm, yarn or pnpm.

**Critical first step**  
Read AGENTS.md before you change any code.  
OpenCode has full repository access.  
AGENTS.md enforces project fundamentals, locked math/rules, audit-first workflow, skills registry and standards. Follow it completely.

**Skills load (required before any work)**  
Read:  
- docs/PROJECTSKILLINDEX.md  
- .agents/skills/supabase/SKILL.md  
- .agents/skills/supabase-postgres-best-practices/SKILL.md  
- relevant audit/document-save skills  
- invoice/document architecture skills  
- frontend investigation skills  
- PDF rendering correctness skills  
- TypeScript/React tracing skills  
- financial/calculation logic skills  

Use only the registered skills. Do not invent new procedures.

---

### Part 1 – Invoice Edit persistence fix (code change allowed)

**Context**  
The forensic investigation is complete.  
Invoice creation and the previous missing-line-items problem are already fixed. Do not revisit them.

**Active bug**  
Edit Invoice → Save appears successful → audit records the edited values → tenant database stays unchanged → View Invoice shows the old values.

**Test invoice**  
- Invoice: SASINV077  
- Invoice ID: "1def13cc-18b5-4c01-b62d-18be0bffae85"  
- Entity ID: "eca34515-0b30-482c-b12e-3963df164322"  
- Tenant schema: "entity_bigdrops-main_main"

**Confirmed root cause**  
useInvoiceSave.ts builds the edit payload without the invoice "id".  
The save RPC is called with "save_invoice_with_items_transaction".  
The RPC edit branch uses:  
WHERE id = (p_invoice_payload->>'id')::uuid  

Because the edit payload has no "id":  
p_invoice_payload->>'id' = NULL  
Therefore WHERE id = NULL matches zero rows.  

The RPC does not raise an error for this zero-row UPDATE.  
The later item replacement also receives a NULL invoice ID.  
The frontend treats the RPC as successful because edit mode does not require returned data to be non-null.  
The audit log is generated from frontend state, so audit history shows the edited values even though the database did not change.

**Required fix**  
Modify only the Invoice Edit save payload construction.  
In useInvoiceSave.ts, when you edit an existing invoice, put the existing invoice ID into the payload that goes to save_invoice_with_items_transaction:  
payload.id = id  

Use the actual existing variable or state that holds the invoice ID. Do not invent a new ID.  
The resulting edit payload must contain:  
id: "1def13cc-18b5-4c01-b62d-18be0bffae85"  
for SASINV077.

**Safety requirements – do not**  
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

This is a one-line / root-cause payload fix unless source inspection proves that the existing variable cannot safely supply the ID.

**Before you edit, read**  
- AGENTS.md  
- docs/PROJECTSKILLINDEX.md  
- .agents/skills/supabase/SKILL.md  
- .agents/skills/supabase-postgres-best-practices/SKILL.md  
- relevant audit/document-save skills  

**Important**  
Do not clean database orphans yet.  
The forensic report identified a risk that failed edits may have tried to insert items with invoice_id = NULL.  
Do not delete or modify any orphan invoice_items.  
That is a separate cleanup task. Do it only after the edit fix is verified and the orphan rows are explicitly inventoried.

**Required static verification (after the code change)**  
1. Inspect the final diff.  
2. Confirm the edit payload contains the existing invoice ID before the RPC call.  
3. Confirm create mode is unchanged.  
4. Run bun run typecheck.  
5. Run bun run audit:load only if required by the project’s existing audit/data-layer rules.  
6. Run git status.  
7. Do not run bun run build.

**Handoff report for Part 1**  
Report:  
- exact file changed  
- exact logic changed  
- why the fix resolves WHERE id = NULL  
- verification results  
- whether any unrelated files changed  

Do not claim the live edit is fixed unless the user later performs the controlled SASINV077 save test.

---

### Part 2 – Invoice View/PDF financial-rendering forensic investigation (no code change)

**Context & objective**  
Investigate a confirmed Invoice View/PDF financial-rendering defect.  
Do not investigate Invoice creation persistence, the previous missing-item problem, or the SASINV077 edit-save problem. Those are separate issues.

**Current problem**  
The tenant database holds the correct persisted discount and financial values, but the Invoice View/PDF renders stale or recalculated values that ignore the persisted discount.

Treat this as a forensic code-tracing task first.  
No code changes are authorised during the investigation unless the user explicitly requests them after the root cause is proven.

**Confirmed test invoice**  
- Number: SASINV080  
- ID: 21596666-a6ec-40aa-b512-36ef55972999  
- Tenant schema: entity_bigdrops-main_main  
- Entity ID: eca34515-0b30-482c-b12e-3963df164322  
- Client: Century Mining Company Ltd  
- PO: 2600957  
- Item: POWER SUPPLY V8(10AMPERES) 070436058 RESEMIN  
- Quantity: 2  
- Unit price: 635680  
- Item amount: 1271360  

**Persisted tenant DB values (verified)**  
- subtotal = 1271360  
- discount = 25427.20  
- vat = 93444.96  
- wht = 25427.20  
- total = 1314459.32  
- notes = NULL  

**Persisted custom_fields.calculationInputs**  
{  
  "vatRate": 7.5,  
  "whtType": "percent",  
  "whtValue": 2,  
  "vatPercent": 7.5,  
  "discountType": "percent",  
  "discountValue": 2,  
  "discountTiming": "before"  
}  

**invoice_financials_v (verified)**  
- total_gross = 1314459.32  
- balance_due = 1314459.32  

Therefore the database financial state is correct.

**Actual rendered View/PDF result**  
- Subtotal = ₦1,271,360  
- VAT (7.5%) = ₦95,352  
- WHT (2%) = ₦25,427.20  
- Total = ₦1,341,284.80  

It does not display the ₦25,427.20 discount line.  
The rendered VAT of ₦95,352 equals 7.5% of the original subtotal ₦1,271,360. This proves the discount is not applied before VAT in the rendered calculation.  
The rendered total ₦1,341,284.80 is also the pre-discount calculation.  

Amount-in-words on the PDF:  
"ONE MILLION THREE HUNDRED FOURTEEN THOUSAND FOUR HUNDRED FIFTY NAIRA AND FIFTY-SIX KOBO ONLY"  
This corresponds to ₦1,314,450.56 (an earlier direct SQL test value). It is not the current persisted total of ₦1,314,459.32.  
This proves the rendering path mixes different financial sources rather than simply displaying the current persisted invoice totals.

**Target components / files**  
Trace the complete Invoice View/PDF financial rendering path.  
Start by locating:  
- Invoice View page/component  
- Invoice PDF/document component(s)  
- financial summary components  
- invoice financial calculation utilities  
- invoice data adapters/mappers  
- hooks used by View Invoice  
- PDF data transformation/build functions  
- any useInvoiceColumns / financial-column logic  
- any calculation engine shared by Invoice View and PDF  
- discount/VAT/WHT/total calculation functions  
- any code that reconstructs invoice financials from invoice_items  
- any code that reads custom_fields.calculationInputs  
- any code that reads invoice.discount / invoice.vat / invoice.wht / invoice.total  

Known architecture notes:  
- Invoice/Quotation use a Financial Column System.  
- resolveFinancialColumns.ts exists for Invoice + Quotation column ordering.  
- useInvoiceColumns and ColumnManager are part of the document system.  
- Invoice PDF uses @react-pdf/renderer.  

Do not assume the exact paths above are current. Search the repository and establish the real call chain.

**Constraints (execution-safe only)**  
1. This is a forensic investigation.  
2. Do not modify application code.  
3. Do not modify migrations.  
4. Do not modify database objects.  
5. Do not modify SASINV080.  
6. Do not modify SASINV079.  
7. Do not modify the Invoice RPC.  
8. Do not modify calculation logic.  
9. Do not “fix” the problem by changing SQL.  
10. Do not introduce a frontend workaround.  
11. Do not investigate SASINV077 edit persistence in this part.  
12. Do not investigate quotation in this part.  
13. Keep the distinction clear between:  
    - persisted invoice financial fields  
    - custom_fields.calculationInputs  
    - invoice_items  
    - derived frontend financial calculations  
    - PDF rendering data  

**Required verification (hard gate)**  
This is a strict audit/investigation with zero code edits.  

Do not run:  
- bun run build  
- bun run typecheck  
- bun run lint  

These are forbidden for this investigation to save resources.  

Run git status immediately before investigation.  
Run git status immediately after investigation.  

The final git status must prove:  
- zero application source files modified  
- zero migrations modified  
- zero configuration changes  
- zero unrelated files changed  

Only the requested markdown forensic report may be created under docs/Reports/.  
Do not create temporary files inside the repository unless absolutely required, and remove them before completion.

**Required behaviour – establish these facts**  

1. View data source  
Identify exactly how SASINV080 data enters the Invoice View.  
Prove whether the View receives:  
- persisted subtotal  
- persisted discount  
- persisted VAT  
- persisted WHT  
- persisted total  
- custom_fields.calculationInputs  
- invoice_items  

2. Financial transformation  
Identify every transformation between the database response and the rendered financial summary.  
For each transformation state:  
- source fields  
- calculation performed  
- output fields  
- whether persisted values are replaced by derived values  

3. Discount handling  
Find exactly where the 2% discount is lost.  
Determine whether the bug is caused by:  
- discount omitted from a mapper  
- discount omitted from a calculation input  
- wrong discount field name  
- discount type mismatch  
- discount timing ignored  
- recalculation from invoice_items  
- financial summary adapter  
- PDF-specific transformation  
- View-specific transformation  
- shared calculation utility  
- stale state  
- or another concrete mechanism  

Do not stop at “PDF recalculates values.”  
Identify the exact function/component and explain the data transformation.

4. VAT calculation  
Prove why the renderer produces 95,352 instead of the persisted 93,444.96.  
Show the exact source values used by the renderer and the exact formula/path that produces 95,352.

5. Total calculation  
Prove why the renderer produces 1,341,284.80 instead of 1,314,459.32.  
Identify every component that enters that total.

6. Discount rendering  
Determine why the PDF does not display Discount = ₦25,427.20 even though:  
- invoice.discount = 25427.20  
- calculationInputs.discountValue = 2  
- calculationInputs.discountType = "percent"  
- pdfOutput.showDiscountPercentage = true  

Determine whether showDiscountPercentage controls visibility only while another condition prevents the discount row from being generated.

7. Amount-in-words  
Trace the source of amount-in-words.  
Explain why the rendered document currently shows ₦1,314,450.56 while the current invoice.total is ₦1,314,459.32.  
Determine whether amount_in_words is:  
- persisted and read directly  
- regenerated  
- stale  
- transformed from another total  
- or otherwise sourced differently  

8. Compare SASINV079  
Use SASINV079 as a comparison case where useful.  
Known original/custom-field state:  
- subtotal = 1271360  
- discount_value = 24918.66  
- discount_type = fixed  
- discount_timing = before  
- original persisted discount was later repaired to 24918.66  
- persisted VAT was repaired to 93483.1005  
- persisted WHT was repaired to 24928.8268  
- persisted total was repaired to 1314995.6137  

Do not modify it.  
Use it only to determine whether the renderer mishandles both percent discounts and fixed discounts.  
If the code path differs between the two, document that.

9. Root cause  
The final report must state one precise root cause if the evidence supports one.  
Do not give generic conclusions such as “the PDF calculation is wrong.”  
Instead identify:  
- exact file  
- exact function/component/hook  
- relevant line or code region  
- input it receives  
- incorrect transformation  
- resulting incorrect output  

If multiple defects exist, separate them clearly.

10. Minimal fix proposal  
Do not implement the fix.  
Provide the smallest safe code change that would correct the proven defect while preserving:  
- existing invoice calculations  
- discount timing behaviour  
- VAT behaviour  
- WHT behaviour  
- PDF customisation  
- amount-in-words behaviour  
- existing invoice creation  
- existing invoice view behaviour  
- quotation behaviour  

If the correct fix requires a shared calculation utility, explain why.  
If it should stay PDF/View-specific, explain why.

**Acceptance criteria**  
The investigation is complete only when the report establishes:  
1. Exact Invoice View data-loading path.  
2. Exact PDF data-loading/rendering path.  
3. Exact source of subtotal.  
4. Exact source of discount.  
5. Exact source of VAT.  
6. Exact source of WHT.  
7. Exact source of total.  
8. Exact source of amount-in-words.  
9. Exact point where discount is lost.  
10. Exact reason VAT becomes ₦95,352.  
11. Exact reason total becomes ₦1,341,284.80.  
12. Exact reason discount row is absent.  
13. Exact reason amount-in-words is stale.  
14. Whether View and PDF share the same faulty transformation.  
15. Whether SASINV079 and SASINV080 expose the same underlying defect.  
16. Minimal proposed fix, without implementing it.  

The report must distinguish PROVEN FACTS from HYPOTHESES.

**Report output**  
Create only a markdown forensic report under docs/Reports/.  
Use a descriptive filename such as:  
docs/Reports/invoice-view-pdf-financial-rendering-forensic-2026-08-13.md  

The report must contain these sections:  
# Objective  
# Scope  
# Skills Used  
# Test Evidence  
# Database Evidence  
# Invoice View Data Path  
# PDF Data Path  
# Financial Transformation Trace  
# Discount Failure  
# VAT Failure  
# WHT Trace  
# Total Failure  
# Amount-in-Words Failure  
# SASINV079 Comparison  
# Root Cause  
# Minimal Fix Proposal  
# Verification Plan  
# Changes Made  
# Verification Result  
# Risks / Limitations  

Be explicit that the investigation made no application code changes.  
Do not run build, typecheck or lint.  

The purpose of this task is to produce a defensible forensic finding that another agent can use to implement the fix later.

---

**Order of work**  
1. Load all required skills and AGENTS.md.  
2. Run git status (baseline).  
3. Complete Part 1 (edit-persistence fix + static verification).  
4. Complete Part 2 (forensic investigation + report only).  
5. Run final git status.  
6. Deliver both handoff reports.

