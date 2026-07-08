Runtime Root-Cause Investigation — Invoice Edit Law UX + Quotation Edit Crash (NO FIXES UNTIL ROOT CAUSE IS PROVEN)
You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime: Bun only. Never use npm, yarn or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
Read in order:

AGENTS.md
docs/STANDARD/document-transformation-standard.md
docs/PROJECTSKILLINDEX.md

Load only the relevant skills:

Karpathy
typescript-advanced-types
shadcn

Do not load unrelated skills.

REPORT
Create a new report:
docs/EXECUTION/investigation/invoice-edit-law-runtime-root-cause.md
Do not overwrite any previous report.
Include:

Executive Summary
Runtime Trace
Evidence
Root Cause
Why Previous Attempt Failed
Files Inspected
Files Modified
Verification


VERY IMPORTANT
The previous implementation report claimed the issue was fixed.
Runtime testing proved NONE of the reported fixes actually worked.
Observed behaviour after the previous implementation:

Client field still behaves exactly as before.
Invoice Number still behaves exactly as before.
Identity dialog behaviour is unchanged.
Quotation Edit still crashes.
The runtime behaviour does not match the implementation report.

Therefore:
Do NOT assume the previous report is correct.
Treat the previous implementation as untrusted until verified from the running execution path.

OBJECTIVE
This task is primarily a runtime investigation.
Do NOT start coding immediately.
First prove exactly which code executes.
No guessing.
No assumptions.
No "this should be the component."
Everything must be demonstrated from the runtime execution path.

PART A — Invoice Client Runtime Trace
Trace the COMPLETE execution path when opening an existing saved invoice and tapping the Client field.
Document every step.
Example format:
InvoiceFormPage
↓
...
↓
...
↓
Component actually rendering the Client field
↓
Actual click handler
↓
Actual function called
↓
Actual dialog/dropdown behaviour
Answer all of the following:

Which component actually renders the Client field?
Is it the expected component?
Does FormHeader render?
If yes, prove it.
If no, explain why.
Which click handler actually executes?
Is IdentityLockDialog even involved?
What actually opens the Client selector?
Why does the selector still appear?


PART B — Invoice Number Runtime Trace
Repeat the same investigation for Invoice Number.
Determine:

Which component actually renders it?
Is it an Input?
Is it wrapped?
Does another component replace it?
Which handler receives the first click?
Why does the keyboard still appear?
Why can the user begin editing before interception?

Do not guess.
Prove the execution path.

PART C — IdentityLockDialog Investigation
Determine:

Where is IdentityLockDialog mounted?
Is it mounted in Invoice Edit?
Is it mounted more than once?
Is the dialog state ever changing?
Is the click handler actually firing?
If not, explain why.


PART D — Quotation Edit Crash Investigation
This is the highest priority bug.
The previous agent did NOT identify the root cause.
It only wrapped async code in try/catch.
That is NOT an acceptable fix.
Investigate the crash properly.
Determine:

Exact component causing the crash.
Exact hook involved.
Exact render cycle.
Exact state update.
Exact recursion (if present).
Exact dependency chain.

Produce the complete execution path.
Do not stop at "Maximum update depth."
Identify WHAT is updating WHAT.

PART E — Previous Report Audit
Review the previous implementation.
For every claimed fix, determine whether it actually affects runtime.
For each item answer:

Correct
Incorrect
Dead code
Wrong component
Never executed
Partially correct

If a change was made in a component that never participates in runtime, explicitly state that.

PART F — Root Cause
Only after completing Parts A–E determine:

The real root cause.
The smallest possible fix.
Which files actually need modification.
Which previously modified files should NOT have been touched.


CODING RULES
Do NOT perform broad refactoring.
Do NOT redesign the forms.
Do NOT change business logic.
Do NOT change:

Duplicate Law
Revert
Conversion
Prefix Engine
Number generation
Database schema
Audit Trail
PDF generation
Calculations
Pricing
Tax logic
Routing

If a fix is required, it must be:

minimal
surgical
directly supported by the runtime investigation


VERIFICATION
Run:

bun run typecheck
bun run audit:load

Do NOT run:

bun run build


ACCEPTANCE CRITERIA
This task is NOT complete until all of the following are true:

The runtime execution path for the Invoice Client field is fully documented.
The runtime execution path for the Invoice Number field is fully documented.
The runtime execution path for IdentityLockDialog is fully documented.
The exact root cause of the Quotation Edit crash is identified.
Every claim in the previous implementation report is verified or disproven with evidence.
Any proposed code changes are justified by the proven runtime trace, not assumptions.
bun run typecheck passes (excluding documented pre-existing errors).
bun run audit:load passes.
A new investigation report is written to docs/EXECUTION/investigation/invoice-edit-law-runtime-root-cause.md.

