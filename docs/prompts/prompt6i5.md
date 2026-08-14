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

You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.
====================================================================

## A. CONTEXT & OBJECTIVE

Investigate a confirmed Invoice View/PDF financial-rendering defect.

DO NOT investigate Invoice creation persistence, the previous missing-item problem, or the SASINV077 edit-save problem. Those are separate issues.

The current problem is:

The tenant database contains the correct persisted discount and financial values, but the Invoice View/PDF renders stale/recalculated values that ignore the persisted discount.

This must be investigated as a forensic code-tracing task first.

NO CODE CHANGES are authorized during the investigation unless explicitly requested after the root cause is proven.

### Confirmed test invoice

Invoice:
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

Persisted tenant DB values were explicitly verified as:

- subtotal = 1271360
- discount = 25427.20
- vat = 93444.96
- wht = 25427.20
- total = 1314459.32
- notes = NULL

Persisted custom_fields.calculationInputs contains:

{
  "vatRate": 7.5,
  "whtType": "percent",
  "whtValue": 2,
  "vatPercent": 7.5,
  "discountType": "percent",
  "discountValue": 2,
  "discountTiming": "before"
}

The tenant invoice_financials_v was also independently verified:

- total_gross = 1314459.32
- balance_due = 1314459.32

Therefore the database financial state is correct.

### Actual rendered View/PDF result

The Invoice View/PDF for SASINV080 renders:

- Subtotal = ₦1,271,360
- VAT (7.5%) = ₦95,352
- WHT (2%) = ₦25,427.20
- Total = ₦1,341,284.80

It does NOT display the ₦25,427.20 discount line.

The rendered VAT of ₦95,352 equals 7.5% of the original subtotal ₦1,271,360, proving the discount is not being applied before VAT in the rendered calculation.

The rendered total ₦1,341,284.80 is also the pre-discount calculation.

The amount-in-words shown by the PDF is:

"ONE MILLION THREE HUNDRED FOURTEEN THOUSAND FOUR HUNDRED FIFTY NAIRA AND FIFTY-SIX KOBO ONLY"

That corresponds to ₦1,314,450.56, which came from an earlier direct SQL test value and is NOT the current persisted total of ₦1,314,459.32.

This proves the rendering path is mixing different financial sources rather than simply displaying the current persisted invoice totals.

## B. TARGET COMPONENTS / FILES

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

Relevant known architecture:
- Invoice/Quotation use a Financial Column System.
- resolveFinancialColumns.ts exists for Invoice + Quotation column ordering.
- useInvoiceColumns and ColumnManager are part of the document system.
- Invoice PDF uses @react-pdf/renderer.

Do not assume the exact paths above are current. Search the repository and establish the real call chain.

## C. CONSTRAINTS (EXECUTION-SAFE ONLY)

1. This is a FORENSIC INVESTIGATION.
2. Do not modify application code.
3. Do not modify migrations.
4. Do not modify database objects.
5. Do not modify SASINV080.
6. Do not modify SASINV079.
7. Do not modify the Invoice RPC.
8. Do not modify calculation logic.
9. Do not "fix" the problem by changing SQL.
10. Do not introduce a frontend workaround.
11. Do not investigate SASINV077 edit persistence in this task.
12. Do not investigate quotation in this task.
13. Preserve the distinction between:
    - persisted invoice financial fields,
    - custom_fields.calculationInputs,
    - invoice_items,
    - derived frontend financial calculations,
    - PDF rendering data.

### Skills Injection Rule

Before investigation, read docs/PROJECTSKILLINDEX.md and load the relevant skills.

At minimum, load the relevant skills for:
- invoice/document architecture
- frontend investigation
- PDF rendering correctness
- TypeScript/React tracing
- financial/calculation logic
- Supabase/database data-flow investigation where applicable

Use the repository's registered skills rather than inventing new procedures.

## D. REQUIRED VERIFICATION (HARD HARDWARE GATE)

This is a strict audit/investigation with ZERO code edits.

DO NOT run:
- bun run build
- bun run typecheck
- bun run lint

These are explicitly forbidden for this investigation to conserve resources.

Run git status immediately BEFORE investigation.

Run git status immediately AFTER investigation.

The final git status must prove:
- zero application source files modified
- zero migrations modified
- zero configuration changes
- zero unrelated files changed

Only the requested markdown forensic report may be created under:

docs/Reports/

Do not create temporary files inside the repository unless absolutely required, and remove them before completion.

## E. REQUIRED BEHAVIOR

Trace the actual runtime/data path, not merely filenames.

The investigation must establish:

### 1. View data source

Identify exactly how SASINV080 data enters the Invoice View.

Prove whether the View receives:
- persisted subtotal
- persisted discount
- persisted VAT
- persisted WHT
- persisted total
- custom_fields.calculationInputs
- invoice_items

### 2. Financial transformation

Identify every transformation between the database response and the rendered financial summary.

For each transformation, state:
- source fields
- calculation performed
- output fields
- whether persisted values are replaced by derived values

### 3. Discount handling

Find exactly where the 2% discount is lost.

Determine whether the bug is caused by:
- discount omitted from a mapper,
- discount omitted from a calculation input,
- wrong discount field name,
- discount type mismatch,
- discount timing ignored,
- recalculation from invoice_items,
- financial summary adapter,
- PDF-specific transformation,
- View-specific transformation,
- shared calculation utility,
- stale state,
- or another concrete mechanism.

Do not stop at "PDF recalculates values."

Identify the exact function/component and explain the data transformation.

### 4. VAT calculation

Prove why the renderer produces:

95,352

instead of the persisted:

93,444.96

Show the exact source values used by the renderer and the exact formula/path that produces 95,352.

### 5. Total calculation

Prove why the renderer produces:

1,341,284.80

instead of:

1,314,459.32

Identify every component entering that total.

### 6. Discount rendering

Determine why the PDF does not display:

Discount = ₦25,427.20

despite:
- invoice.discount = 25427.20
- calculationInputs.discountValue = 2
- calculationInputs.discountType = "percent"
- pdfOutput.showDiscountPercentage = true

Determine whether showDiscountPercentage controls visibility only while another condition prevents the discount row from being generated.

### 7. Amount-in-words

Trace the source of amount-in-words.

Explain why the rendered document currently shows:

₦1,314,450.56

while the current invoice.total is:

₦1,314,459.32

Determine whether amount_in_words is:
- persisted and read directly,
- regenerated,
- stale,
- transformed from another total,
- or otherwise sourced differently.

### 8. Compare SASINV079

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

Use it only to determine whether the renderer mishandles both:
- percent discounts
- fixed discounts

If the code path differs between the two, document that.

### 9. Root cause

The final report MUST state one precise root cause if the evidence supports one.

Do not give generic conclusions such as:
"the PDF calculation is wrong."

Instead identify:
- exact file
- exact function/component/hook
- relevant line or code region
- input it receives
- incorrect transformation
- resulting incorrect output

If multiple defects exist, separate them clearly.

### 10. Minimal fix proposal

Do NOT implement the fix.

Provide the smallest safe code change that would correct the proven defect while preserving:
- existing invoice calculations
- discount timing behavior
- VAT behavior
- WHT behavior
- PDF customization
- amount-in-words behavior
- existing invoice creation
- existing invoice view behavior
- quotation behavior

If the correct fix requires a shared calculation utility, explain why.
If it should remain PDF/View-specific, explain why.

## F. ACCEPTANCE CRITERIA

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

## REPORT OUTPUT

Create ONLY a markdown forensic report under:

docs/Reports/

Use a descriptive filename such as:

docs/Reports/invoice-view-pdf-financial-rendering-forensic-2026-08-13.md

The report must contain:

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

Be explicit that the investigation made NO application code changes.

Do not run build, typecheck, or lint.

The purpose of this task is to produce a defensible forensic finding that another agent can use to implement the fix later.