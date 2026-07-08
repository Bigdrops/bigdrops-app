# Quotation Edit Law Enforcement — Phase 1

**Scope:** Law 1 (Edit Law — Identity Immutability) enforcement for Quotation only.

You are working on the BIGDROPS business platform.

Stack:
React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.

Runtime Environment:
Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

OpenCode has full repository access.

Read immediately:

- AGENTS.md
- docs/STANDARD/document-transformation-standard.md
- docs/EXECUTION/audits/2026-07-02-transformation-standard-baseline.md
- docs/PROJECTSKILLINDEX.md

Load ONLY these skills:

- .claude/skills/Karpathy/SKILL.md
- .claude/skills/gitnexus/
- .agents/skills/typescript-advanced-types/SKILL.md
- .agents/skills/vercel-react-best-practices/SKILL.md
- .agents/skills/supabase-postgres-best-practices/SKILL.md

Do not load unrelated skills.

====================================================================


# REPORT

Create:

docs/EXECUTION/implementation/quotation-edit-law-phase-1.md

Include:

- Executive Summary
- Runtime Investigation
- Findings Addressed
- Root Cause
- Files Inspected
- Files Modified
- Behaviour Preserved
- Verification Results
- Remaining Findings

Do not overwrite previous reports.


# OBJECTIVE

Implement Law 1 — Edit Law from:

docs/STANDARD/document-transformation-standard.md

for:

Quotation only.

This task is an enforcement task.

It is NOT:

- an architectural refactor
- a lifecycle redesign
- a quotation service migration
- an audit expansion
- a duplicate workflow change
- a conversion change
- a numbering change
- a PDF change

Only enforce Quotation identity immutability.


# BASELINE CONTEXT

Invoice Edit Law Phase 1 is already complete.

Follow the same enforcement principles:

1. Interaction-time enforcement
2. Domain/service defense-in-depth

Do not copy Invoice-specific assumptions.

First identify the actual Quotation runtime path.


# FINDINGS TO RESOLVE

Resolve only:

- EDIT-QTN-001
- EDIT-QTN-002

Ignore unrelated findings.


# REQUIRED IDENTITY PROTECTION

For saved quotations only, these identity fields are immutable:

- client_id
- document_number
- document_type
- sourceDocumentId
- sourceDocumentType
- sourceDocumentNumber
- equivalent quotation lineage representation if stored elsewhere


Draft quotations remain fully editable.


# REQUIRED BEHAVIOUR

For saved quotations:

Users must not be able to enter edit mode for immutable identity fields.

The application must intercept the interaction before state mutation.

Required behaviour:

- Client selection cannot open/change.
- Quotation number cannot be edited.
- Document type cannot be changed.
- Lineage fields cannot be modified.

When a locked field is clicked:

- Open IdentityLockDialog.
- Explain the field is immutable after saving.
- Recommend using Duplicate if a new identity is required.

The form state must remain unchanged.

No dirty state.

No temporary invalid state.

No save-time discovery as the primary mechanism.


# PHASE 1 — RUNTIME INVESTIGATION

Before changing code:

Trace the active Quotation flow.

Identify:

- Quotation form entry component
- Actual edit state handling
- Current update functions
- Client selector implementation
- Number field implementation
- Existing identity lock components
- Save/update service path

Verify:

- Which components are actually rendered.
- Whether current lock UI exists but is disconnected.
- Whether state can mutate before validation.
- Whether updates bypass UI through generic setters.


Do not assume Invoice architecture applies.


# PHASE 2 — UI ENFORCEMENT

Implement interaction-level protection.

The UI must prevent illegal identity edits before mutation.

Use existing project patterns where possible.

Reuse IdentityLockDialog if compatible.

Do not create duplicate lock components.


# PHASE 3 — DOMAIN / SERVICE DEFENCE

Add or extend quotation identity validation.

Save/update operations must reject illegal identity mutations from:

- programmatic updates
- bypass paths
- future UI changes

Validation should remain a safety net.

It must not replace interaction enforcement.


# STRICT NON-REGRESSION

Do NOT modify:

Duplicate Law:

- duplicateQuotationRecord
- duplicate numbering
- duplicate behaviour

Conversion:

- convertQuotationToInvoice
- conversion trail behaviour

Invoice logic.

CSR logic.

Waybill logic.

Audit system:

- AuditAction
- audit formatters
- audit infrastructure

PDF generation.

Calculations.

Pricing.

Tax rules.

Prefix engine.

Database schema.

Routing.

Lifecycle ownership refactors.


# VERIFICATION

Run:

bun run audit:load

bun run typecheck


Do NOT run:

bun run build

Build execution is prohibited by project policy.


# REQUIRED MANUAL VERIFICATION

Verify a saved quotation.

Confirm:

- Client cannot be edited.
- Quotation number cannot be edited.
- Document type cannot be edited.
- Lineage cannot be edited.
- Clicking locked fields opens IdentityLockDialog.
- No form state changes occur.
- No dirty state is created.
- Save is not responsible for blocking user mistakes.
- Normal editable quotation fields still work.
- Draft quotations remain fully editable.


# ACCEPTANCE CRITERIA

Complete only when:

- EDIT-QTN-001 is resolved.
- EDIT-QTN-002 is resolved.
- Saved quotations enforce identity immutability.
- Draft quotations remain editable.
- Interaction is blocked before mutation.
- Domain/service validation remains defense-in-depth.
- Existing duplicate and conversion behaviour is unchanged.
- No unrelated files are modified.
- bun run audit:load passes.
- bun run typecheck passes.
- Report exists:

docs/EXECUTION/implementation/quotation-edit-law-phase-1.md