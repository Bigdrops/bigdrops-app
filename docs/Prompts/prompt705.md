[Ubong] Speaking:

# Invoice Edit Law Enforcement — Phase 1

You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

OpenCode has full repository access.

Read, in this order:

1. AGENTS.md
2. docs/STANDARD/document-transformation-standard.md
3. docs/EXECUTION/audits/2026-07-02-transformation-standard-baseline.md
4. docs/PROJECTSKILLINDEX.md

Load ONLY the skills required for this task:

- Karpathy
- typescript-advanced-types
- shadcn

Do not load unrelated skills.

====================================================================
REPORT
====================================================================

Create:

docs/EXECUTION/implementation/invoice-edit-law-phase-1.md

Include:

- Executive Summary
- Root Cause Analysis
- Runtime Path Analysis
- Findings Addressed
- Files Inspected
- Files Modified
- Behaviour Preserved
- Verification Results
- Remaining Findings

Do not overwrite previous reports.

====================================================================
OBJECTIVE
====================================================================

Implement **Law 1 — Edit Law** for **Invoice only**.

This is an enforcement task.

It is NOT:

- a lifecycle redesign
- an architectural refactor
- a UI redesign
- a duplicate workflow task
- a revert task
- an audit overhaul
- a numbering change
- a domain normalization exercise

Only enforce Invoice Edit Law.

====================================================================
FINDINGS TO RESOLVE
====================================================================

Resolve only:

- EDIT-INV-000 — Interaction-time enforcement missing. Identity mutation is currently prevented primarily during Save instead of before interaction.
- EDIT-INV-001 — Lineage immutability not fully enforced.
- EDIT-INV-002 — Document type immutability not fully enforced.

Ignore every other finding.

====================================================================
IMPLEMENTATION PRINCIPLE
====================================================================

The Transformation Standard requires interaction-time enforcement.

The baseline audit and runtime behaviour indicate that Invoice currently behaves primarily as a save-time validator rather than an interaction-time identity lock.

Do NOT assume the existing implementation is inactive.

Trace the active runtime path first.

If interception logic already exists but is bypassed, repair the runtime wiring instead of introducing duplicate enforcement.

Save-time validation must remain only as defence-in-depth.

====================================================================
PHASE 1 — RUNTIME INVESTIGATION
====================================================================

Trace the complete runtime path from:

InvoiceFormPage

↓

SharedDocumentForm

↓

Header components

↓

Identity field components

↓

Actual rendered controls

Determine:

- which components are actually rendered
- where Client is rendered
- where Invoice Number is rendered
- where Document Type is rendered
- where lineage is surfaced
- whether IdentityLockDialog is connected
- whether onLockedFieldClick is invoked
- whether another component bypasses interception
- whether disabled/readOnly flags are effective
- whether React state changes before interception
- where dirty state originates

Document the actual runtime ownership before making changes.

====================================================================
PHASE 2 — UI ENFORCEMENT
====================================================================

For saved invoices:

The following identity fields are immutable:

- Client
- Invoice Number
- Document Type
- Source document identity
- Lineage

Clicking any locked identity field must immediately display IdentityLockDialog.

The dialog must recommend using Duplicate when identity changes are required.

The illegal interaction must be intercepted before any state mutation occurs.

====================================================================
STATE INTEGRITY REQUIREMENT
====================================================================

Interaction with locked identity fields must NOT:

- mutate React state
- mark the form dirty
- invoke change handlers
- trigger validation
- enqueue state updates
- create temporary invalid values

The first observable behaviour after clicking a locked field must be IdentityLockDialog.

The Save pipeline should never become aware of normal identity edit attempts.

====================================================================
OWNERSHIP REQUIREMENT
====================================================================

There must be exactly one canonical runtime owner responsible for identity interaction interception.

Avoid duplicate enforcement across:

- InvoiceFormPage
- SharedDocumentForm
- Header components
- Individual field components

If multiple interception paths exist, consolidate them into a single interaction owner while preserving behaviour.

====================================================================
PHASE 3 — DOMAIN ENFORCEMENT
====================================================================

Retain existing identity validation.

It must remain the final defence against:

- corrupted state
- imported data
- API misuse
- developer mistakes
- future regressions

Do NOT strengthen Save-time validation.

Do NOT introduce new Save warning dialogs.

Do NOT rely on Save as the primary enforcement mechanism.

====================================================================
STRICT NON-REGRESSION
====================================================================

Do NOT modify:

Duplicate Law

- duplicate workflow
- duplicate numbering
- duplicate behaviour

Revert Law

- revert
- conversion
- workflow guards

Audit

- AuditAction
- formatter labels
- audit infrastructure

Business Logic

- Prefix engine
- numbering engine
- calculations
- taxation
- pricing
- routing
- database schema
- PDF generation
- lifecycle ownership

====================================================================
VERIFICATION
====================================================================

Run only:

1. bun run audit:load
2. bun run typecheck

Do NOT run:

bun run build

====================================================================
MANUAL VERIFICATION
====================================================================

Verify using an existing saved invoice.

Confirm:

✓ Client cannot enter edit mode

✓ Invoice Number cannot enter edit mode

✓ Document Type cannot enter edit mode

✓ Lineage cannot be modified

✓ Clicking Client immediately opens IdentityLockDialog

✓ Clicking Invoice Number immediately opens IdentityLockDialog

✓ React state never changes

✓ Dirty state is never created

✓ No temporary illegal values exist

✓ Save never becomes responsible for rejecting a normal identity edit

✓ Draft invoices remain fully editable

✓ All legitimate editable fields continue functioning normally

====================================================================
ACCEPTANCE CRITERIA
====================================================================

This task is complete only when:

- EDIT-INV-000 is resolved.
- EDIT-INV-001 is resolved.
- EDIT-INV-002 is resolved.
- Invoice Edit Law is enforced before any state mutation occurs.
- IdentityLockDialog is consistently displayed for locked identity fields.
- React state remains unchanged after attempted identity interaction.
- Dirty state is never created from identity edit attempts.
- Save-time validation remains only as defence-in-depth.
- Existing business behaviour outside identity editing is unchanged.
- Duplicate, Revert, Conversion and Audit behaviour remain unchanged.
- bun run audit:load passes.
- bun run typecheck passes.
- An implementation report is written to:

docs/EXECUTION/implementation/invoice-edit-law-phase-1.md