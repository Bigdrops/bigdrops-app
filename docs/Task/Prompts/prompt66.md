)

BIGDROPS — Invoice + Quotation Parity Audit (READ-ONLY)

You are working on the BIGDROPS business platform. Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel. Runtime: Bun. Never use npm or yarn.


---

CONTEXT

An audit already exists for Invoice @docs/Task/Reports/invoice-form-architecture-audit.md:

NewInvoice.tsx

EditInvoice.tsx

SharedDocumentForm.tsx

Invoice domain + financial + column systems


That audit established Invoice architecture and orchestration patterns.

Invoice and Quotation are known to share parts of the system:

View page structure (shared across multiple document types)

Form system (Invoice, Quotation, Waybill)

PDF/template system (Invoice-heavy, Quotation also uses it)


This audit does NOT redesign anything.

It only extends existing Invoice findings to Quotation.


---

OBJECTIVE

Perform a strict architectural parity audit between Invoice and Quotation.

Determine:

> Are Invoice and Quotation actually structurally identical at the orchestration level?



No redesign. No abstraction proposals. No system design.


---

SCOPE (READ ONLY)

Inspect Quotation system:

NewQuotation.tsx

EditQuotation.tsx

Quotation view page

Quotation domain layer usage

Quotation save/load flow

Quotation validation logic

Quotation column system usage

Quotation PDF/template pipeline

SharedDocumentForm usage in Quotation


Compare against Invoice:

orchestration flow

state ownership

save/load pipeline

validation logic

column system behavior

form composition usage

lifecycle behavior as implemented in code



---

TASK 1 — QUOTATION INVENTORY

Document Quotation as implemented:

entry points

state structure

orchestration flow

domain usage

persistence logic

validation

column handling

PDF/template usage

navigation behavior



---

TASK 2 — STRUCTURAL BREAKDOWN

Break down:

NewQuotation.tsx

EditQuotation.tsx


Classify each section as:

Same as Invoice

Similar to Invoice (describe difference)

Quotation-specific logic


Do not abstract. Do not generalize.


---

TASK 3 — INVOICE VS QUOTATION COMPARISON

Compare directly:

form orchestration

state ownership

save logic

validation logic

column system usage

domain function usage


For each, state:

Identical

Similar (describe exact difference)

Different (describe exact difference)



---

TASK 4 — VIEW + PDF PIPELINE

Inspect:

view page structure

PDF generation flow

template usage


Compare Invoice vs Quotation usage only.

No deep rendering analysis.


---

TASK 5 — END-TO-END FLOW COMPARISON

Describe actual implemented flow:

load/init

edit

validate

compute

save

navigate


Compare differences between Invoice and Quotation.


---

TASK 6 — SHARED SYSTEM VALIDATION

Answer strictly:

1. Are Invoice and Quotation orchestration systems structurally the same?


2. If not, what exactly differs?



No suggestions. No refactor planning.


---

OUTPUT FORMAT

1. Executive Summary


2. Quotation Architecture Inventory


3. Breakdown (New vs Edit)


4. Invoice vs Quotation Comparison


5. View + PDF Comparison


6. Divergences (explicit list)


7. Parity Conclusion (Yes / No / Partial)


8. Evidence Summary


9. Files Inspected




---

STOP CONDITION

Stop immediately after comparison.

Do not propose refactors. Do not design systems. Do not suggest abstraction layers.


---

SUCCESS CRITERIA

Done when:

Quotation is fully mapped

Invoice vs Quotation parity is clearly established

All divergences are explicitly evidence-based

No architectural invention was introduced



