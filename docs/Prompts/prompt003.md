[Jason] Speaking:

Invoice Edit Law UX Refinement — Phase 2 + Quotation Edit Regression Fix

You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.

Runtime Environment: Bun only. Never use npm, yarn, or pnpm.


---

====================================================================

CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE

====================================================================

OpenCode has full repository access.

Read immediately:

AGENTS.md

docs/STANDARD/document-transformation-standard.md

docs/EXECUTION/audits/2026-07-02-transformation-standard-baseline.md

docs/PROJECTSKILLINDEX.md


Load only the relevant skills from docs/PROJECTSKILLINDEX.md:

typescript-advanced-types

shadcn

Karpathy


Do not load unrelated skills.

====================================================================

REPORT

Create:

docs/EXECUTION/implementation/invoice-edit-law-phase-2.md

Include:

Executive Summary

Quotation Regression Investigation

Invoice Runtime Investigation

UX Improvements

Files Modified

Verification

Numbering Investigation

Behaviour Preserved


Do not overwrite previous reports.


---

OBJECTIVE

This task has two goals.

Goal 1

Fix the regression introduced during Quotation Edit Law Phase 1.

Goal 2

Refine the existing Invoice Edit Law implementation.

Law 1 is already implemented functionally.

This task improves the interaction experience, not the business rules.

The goal is to make identity fields behave like genuinely locked controls instead of editable controls that reject interaction later.


---

PART A — CRITICAL PRECONDITION

Fix Quotation Edit Regression

Before beginning any Invoice work, investigate and eliminate the Quotation Edit crash.

Observed Runtime Behaviour

Opening an existing quotation in Edit mode immediately crashes.

Runtime shows:

> Minified React error #310



This regression appeared after the Quotation Edit Law implementation.


---

Investigation

Trace the complete execution path.

QuotationFormPage
        ↓
SharedDocumentForm
        ↓
IdentityLockDialog state
        ↓
guardedUpdateQuotation
        ↓
React render cycle

Determine the actual root cause.

Inspect, where relevant:

hook ordering

conditional hook execution

invalid hook usage

state initialization

callback dependency loops

infinite render/update loops

SharedDocumentForm integration

IdentityLockDialog integration

React StrictMode compatibility


Do not guess.

Do not rewrite the implementation.

Identify the precise cause before making changes.


---

Constraints

Preserve all Quotation Edit Law behaviour.

Do not modify:

Duplicate Law

Identity immutability rules

Save validation

Domain enforcement

Number generation

Prefix engine

Calculations

PDF generation

Audit infrastructure


Only remove the runtime regression.


---

Required Verification

Confirm:

Existing quotations open normally in Edit mode.

Draft quotations still open normally.

Identity fields remain locked.

IdentityLockDialog still appears.

No React runtime errors occur.

No behaviour outside the crash changes.


Document:

root cause

fix

affected files



---

PART B — Invoice Identity Lock UX

Implement the following behaviour for saved invoices only.

Draft invoices must remain completely editable.


---

Client Field

The Client field should be visually identical to its editable appearance while behaving as a locked control.

The very first mouse click or touch must immediately open the IdentityLockDialog.

The following must never occur:

client selector opening

dropdown rendering

client search starting

focus entering selector

React form state mutation

dirty state creation

temporary value changes


The selector must not begin opening before interception.


---

Invoice Number Field

The Invoice Number field should retain the appearance of a normal input.

However it must behave as a locked display control.

The very first click/tap must immediately open IdentityLockDialog.

The following must never happen:

focus

keyboard

caret

text selection

typing

delete

paste

temporary mutation

dirty state


The field should never enter an editable state before interception.


---

PART C — Unified Identity Message

Replace field-specific messaging.

Use one standard Edit Law message for every locked identity field.

Title:

Identity Fields Locked

Body:

> Client and Invoice Number cannot be changed after an invoice has been saved.

To use a different client or invoice number, duplicate this invoice to create a new draft while keeping your current work.



Both locked fields must display this identical dialog.

Do not maintain separate wording for Client and Invoice Number.


---

PART D — Runtime Numbering Investigation (Documentation Only)

Investigate the observed duplicate numbering behaviour.

Observed runtime sequence:

Invoice INV59 duplicated

Duplicate initially displays INV59

After Save the new invoice becomes INV60


Determine the actual owner of invoice number generation.

Trace:

Duplicate action
        ↓
duplicateInvoice(...)
        ↓
InvoiceFormPage
        ↓
Displayed invoice_number
        ↓
useInvoiceSave
        ↓
Invoice creation
        ↓
Prefix Engine
        ↓
Persisted invoice_number

Document:

where the duplicate initially receives its invoice number

whether the displayed number is copied, generated, hydrated, or cached

where the persisted number is generated

whether the Prefix Engine intentionally replaces the displayed value

whether the observed behaviour is expected or an actual defect


Do not modify numbering behaviour unless a genuine defect is conclusively identified.

This section is investigation only.


---

STRICT NON-REGRESSION

Do not modify:

Duplicate Law

Revert Law

Conversion

Audit Trail

Prefix Engine

Number generation algorithm

Database schema

Financial calculations

Tax logic

Pricing

Workflow rules

Routing

PDF generation

Document layouts


Do not redesign forms.

Do not introduce architectural refactors.

Do not change any business behaviour outside the requested UX refinements and quotation crash fix.


---

TARGET COMPONENTS / FILES

Investigate and modify only where necessary.

Expected areas include:

src/pages/InvoiceFormPage.tsx

src/pages/QuotationFormPage.tsx

src/components/document/SharedDocumentForm.tsx

src/components/document/FormHeader.tsx

src/components/document/IdentityLockDialog.tsx


Avoid expanding the scope unless the investigation proves another file is directly responsible.


---

REQUIRED VERIFICATION

Run:

bun run audit:load

bun run typecheck

git status


Do NOT run:

bun run build


(Build execution is permanently prohibited by project policy.)


---

MANUAL VERIFICATION

Invoice

Verify:

Client appears normal but never opens the selector.

Invoice Number appears normal but never receives focus.

First tap immediately opens IdentityLockDialog.

No keyboard appears.

No dropdown appears.

No caret appears.

No text selection occurs.

No dirty state is created.

No React state mutation occurs.

Draft invoices remain fully editable.

Save-time validation remains defence-in-depth only.


Quotation

Verify:

Existing quotations open in Edit mode without crashing.

Draft quotations remain editable.

Locked identity fields still behave correctly.

IdentityLockDialog still works.

No React runtime errors occur.



---

ACCEPTANCE CRITERIA

This task is complete only when:

The Quotation Edit crash is fully resolved.

The root cause is documented.

Existing quotations open normally.

Invoice Client immediately opens IdentityLockDialog without opening the selector.

Invoice Number immediately opens IdentityLockDialog without receiving focus.

No keyboard, caret, dropdown, or temporary mutation occurs.

A single unified identity message is used for all locked invoice identity fields.

Save-time validation remains a safety net rather than the primary enforcement.

No business behaviour outside Edit Law changes.

The duplicate numbering flow is fully documented without altering Prefix Engine behaviour unless a verified defect exists.

bun run audit:load passes.

bun run typecheck passes.

git status confirms only the intended files changed.

An implementation report is written to:


docs/EXECUTION/implementation/invoice-edit-law-phase-2.md