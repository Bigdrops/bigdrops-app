[Sharon] Speaking:

I agree the report shouldn't be trusted as evidence of completion if it claims behavior that you directly observed wasn't implemented. Rather than asking another agent to "refine" it, I'd have a fresh agent treat the previous report as untrusted and perform its own audit before making changes.


---

Invoice Edit Law Phase 2 — Runtime UX Enforcement + Quotation Regression Recovery

You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.

Runtime: Bun only.


---

====================================================================

CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE

OpenCode has full repository access.

Read:

AGENTS.md

docs/STANDARD/document-transformation-standard.md

docs/EXECUTION/audits/2026-07-02-transformation-standard-baseline.md

docs/PROJECTSKILLINDEX.md


Load only these skills:

Karpathy

typescript-advanced-types

vercel-react-best-practices

shadcn


Do not load unrelated skills.

====================================================================

IMPORTANT

Do NOT trust previous implementation reports.

Previous reports claimed this work was already complete.

Runtime testing by the user proves those reports are inaccurate.

Treat every previous report as historical reference only.

You must independently audit the implementation from the codebase itself.

Do not assume any claimed fix actually exists.


---

REPORT

Create

docs/EXECUTION/implementation/invoice-edit-law-phase-2-runtime.md

Include:

Executive Summary

Runtime Audit

Root Cause Analysis

Invoice UX Changes

Quotation Crash Investigation

Invoice Duplicate Number Investigation

Files Modified

Behaviour Preserved

Verification


Do not overwrite previous reports.


---

PRIMARY OBJECTIVE

Law 1 already exists.

Save-time validation already exists.

This task is NOT about adding another save blocker.

The goal is to make Edit Law operate entirely at interaction time.

The user should never begin editing identity.

The save validator must remain only as defence-in-depth.


---

PART A — AUDIT FIRST (MANDATORY)

Before modifying anything, trace the complete runtime path.

For Invoice identify:

InvoiceFormPage

SharedDocumentForm

FormHeader

Client selector

Client button

Invoice number field

IdentityLockDialog

updateInvoice

setInvoice

useInvoiceEditableState

useInvoiceSave

assertIdentityImmutable


Document exactly:

where clicks originate

where focus occurs

where dropdown opens

where keyboard appears

where state mutates

where dialog currently opens


Do not begin coding until this audit is complete.


---

PART B — CLIENT FIELD

Current behaviour is WRONG.

Current runtime observed by user:

tapping Client still starts the normal interaction

dialog appears too late


Required behaviour:

The Client field should still LOOK identical.

However:

selector must never open

search must never start

dropdown must never render

ClientSelector must never mount

client state must never mutate

keyboard must never appear


The FIRST pointer interaction must immediately open IdentityLockDialog.

No intermediate behaviour is allowed.

Do not rely on save validation.

Do not rely on reverting state.

Prevent the interaction itself.


---

PART C — INVOICE NUMBER FIELD

Current runtime observed by user:

The field still behaves like an editable textbox.

Users can:

focus it

see a caret

begin typing

delete characters


Only afterwards is interception attempted.

This violates Edit Law.

Required behaviour:

Maintain the existing visual appearance.

However:

never receive focus

never display caret

never display keyboard

never allow selection

never allow deletion

never allow typing


The FIRST click/tap must immediately open IdentityLockDialog.

Zero temporary mutation.

Zero temporary focus.

Zero temporary editing.

If necessary, replace the interactive input with a visually identical non-editable component rather than trying to fight browser input behaviour.

Visual appearance must remain unchanged.

Behaviour must change.


---

PART D — UNIFIED IDENTITY DIALOG

The current implementation uses different wording depending on which field was clicked.

Remove that behaviour.

There must be ONE standard Edit Law message.

Title:

Identity Fields Locked

Body:

> Client and Invoice Number cannot be changed after an invoice has been saved.

To use a different client or invoice number, duplicate this invoice to create a new draft while keeping your current work.



Both Client and Invoice Number must open this exact dialog.

Do not generate different text for different fields.

Do not mention one field individually.


---

PART E — QUOTATION REGRESSION (HIGH PRIORITY)

The user reports:

Opening an existing quotation in Edit mode crashes.

The previous implementation report claimed this was fixed.

It was not verified.

Treat the previous report as unreliable.

Do not merely inspect callbacks.

Reproduce the runtime path.

Locate the real cause.

Fix the crash.

Do not stop after making speculative hook dependency changes.

The quotation edit screen must successfully open.

Document the actual root cause.

If multiple causes exist, resolve all of them.


---

PART F — INVOICE DUPLICATE NUMBER INVESTIGATION

This is documentation only.

Do NOT modify numbering behaviour unless an actual defect is proven.

Observed runtime:

Invoice INV59

↓

Duplicate

↓

Draft initially displays INV59

↓

Save

↓

Saved invoice becomes INV60

Determine the complete execution path.

Trace:

Duplicate action

↓

duplicateInvoice

↓

InvoiceFormPage

↓

Hydration

↓

Displayed invoice_number

↓

User edits

↓

Save

↓

useInvoiceSave

↓

Invoice creation

↓

Prefix engine

↓

Persist

Document:

where the displayed number comes from

whether it is copied

whether it is hydrated

whether it is cached

when a new number is requested

which component owns the displayed draft number

which component owns the persisted number

whether this behaviour is intentional

whether it violates Duplicate Law


Do not investigate Quotation numbering.

Only Invoice.


---

STRICT NON-REGRESSION

Do NOT modify:

Duplicate Law

Revert Law

Conversion

Audit Trail

Prefix engine

Number generation algorithm

Database schema

Calculations

Pricing

Taxes

Workflow

Routing

PDF generation


No architectural refactors.

No unrelated cleanup.

No redesign.

Only solve the runtime issues described above.


---

VERIFICATION

Run:

bun run audit:load

Run:

bun run typecheck

Do NOT run:

bun run build


---

REQUIRED MANUAL VERIFICATION

Using an existing saved Invoice:

Verify:

✓ Client looks normal

✓ Client never opens selector

✓ Client never opens dropdown

✓ Client never starts search

✓ First tap immediately opens IdentityLockDialog

✓ Invoice Number looks identical to before

✓ Invoice Number never receives focus

✓ No caret

✓ No text selection

✓ No keyboard

✓ First tap immediately opens IdentityLockDialog

✓ No React state changes before dialog

✓ Draft invoices remain fully editable

✓ Save validator is never relied upon for normal interaction

Using an existing saved Quotation:

Verify:

✓ Edit screen opens successfully

✓ No React crash

✓ Identity locking still functions

Using a duplicated Invoice:

Document:

✓ Initial displayed number

✓ Final persisted number

✓ Complete ownership chain for numbering


---

ACCEPTANCE CRITERIA

This task is complete only when:

A fresh audit has been performed instead of relying on previous reports.

Invoice Client interaction is intercepted before any selector logic executes.

Invoice Number is completely non-focusable while retaining its current visual design.

Both identity fields open the same unified Identity Fields Locked dialog.

No temporary editing, focus, keyboard, caret, dropdown, or state mutation occurs before interception.

Quotation Edit mode opens without crashing and the actual root cause is documented.

The Invoice duplicate numbering lifecycle is fully documented from duplicate action through persistence.

bun run audit:load passes.

bun run typecheck passes.

The implementation report is written to docs/EXECUTION/implementation/invoice-edit-law-phase-2-runtime.md.