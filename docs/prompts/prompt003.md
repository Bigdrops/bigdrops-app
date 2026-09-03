
---

TASK: Audit the BIGDROPS Invoice Compliance Engine PRD set against the actual codebase. Read-only. Produce a report only — make no code changes.

STEP 0 — FOLLOW AGENTS.md
Read AGENTS.md before anything else.

· Run git status first. Record any pre-existing uncommitted, staged, or untracked changes. Do not touch them.

STEP 1 — READ THE PRD SET, IN THIS ORDER
docs/prd/Taxation Made Easy Engine  Smart Activity & NRS Compliance

1. Technical-plan.md (v1.0, superseded by v1.1 — context only)
2. Technical-plan-v1.1.md (current engineering baseline — this is the spec to audit)
3. Openai-ux-contribution.md (product-vision draft from an external review — read for context, not as spec)
4. bigdrops-tax-ux-vision-v1.md (companion discovery doc — contains the audit questions this task answers)

STEP 2 — ANSWER EVERY OPEN QUESTION IN Technical-plan-v1.1.md §11
For 11.1, 11.3, 11.4, 11.5, 11.6: state the current answer with file path and line reference, or state plainly that the thing does not exist in code. Do not infer or guess.

STEP 3 — ANSWER EVERY AUDIT QUESTION IN bigdrops-tax-ux-vision-v1.md §6
Same rule — cite file and line, or state "does not exist." Specifically confirm or deny, with evidence:

· Does a Payments table/module exist today, in any form? Is payment status only a flag on Invoice (unpaid/paid), or a separate table?
· Does any Expense or Supplier Payment module exist today, in any form?

STEP 4 — VALIDATE EVERY DATA MODEL CHANGE IN Technical-plan-v1.1.md §4
For every field ID (SP-1 to SP-12, CL-1 to CL-11, IH-1 to IH-5, LI-1 to LI-4, the NRS metadata sub-object, the WHT receipt ledger):

· State whether it already exists under a different name.
· State whether the proposed type matches existing conventions (snake_case field names per AGENTS.md §1; check how coded values and money fields are typed elsewhere).
· Flag any collision with an existing column.

STEP 5 — VALIDATE THE CALCULATION ENGINE CLAIMS IN §5

· Confirm the exact current location and content of the financial source of truth. AGENTS.md §3 names src/lib/Calculations.ts with calcTotals() and resolveRowVat() as the required entry points — confirm the PRD's calcDocument() references are consistent with these actual function names, or flag the mismatch.
· Confirm whether this file does fixed-point, decimal, or floating-point arithmetic today. Quote the actual operations.
· Confirm whether a tenant-level legal-form field (corporate vs individual) exists anywhere already, before SP-12 is added.

STEP 6 — SCOPE EXPENSES AND PAYMENTS
Scope only what correct WHT and VAT outcomes on the existing Invoice module require. Do not scope a general accounting system.
a. What exists today for Payments (tables, fields, UI, or nothing)?
b. Smallest schema addition needed to know: net amount actually received against an invoice; whether invoice-total-minus-received matches the expected WHT deduction from §5.7's rate table; whether a WHT credit note has been evidenced.
c. Smallest schema addition, if any, on the expense side to support the CIT/turnover estimate in v1.1 §8.2/8.3 — no more than that estimate needs.
d. State explicitly what is out of scope: general expense categorization, receipt OCR, bank feed import, supplier ledgers, or anything else from bigdrops-tax-ux-vision-v1.md §4 not covered here.

STEP 7 — VERIFY AND REPORT
Run git status. Confirm no pre-existing changes from another agent were reverted or overwritten.
Write the report to docs/reports/invoice-quote/. Follow the exact required format: title, identity line with real agent name/date/harness, Objective, Scope, Files changed (none — read-only), Skills used, Documentation standard (ASD-STE100), Changes made (none), Verification result, Risks or limitations, Deferred work. List each finding from Steps 2-6 as a distinct, evidenced item inside the report body.