You are working on the BIGDROPS business platform.

Stack:
- React 19
- Vite 7
- TypeScript 5.9
- Tailwind CSS 3.4
- Supabase
- Vercel

Runtime Environment:
Bun only.
Never use npm, yarn or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

OpenCode has full repository access.

Read AGENTS.md before modifying anything.

Follow all repository standards, audit workflow, skills registry and architectural rules.

====================================================================

OBJECTIVE

Execute Phase 3 of the Correspondence module.

This phase ONLY integrates the Letter document family into the existing BIGDROPS audit infrastructure.

Do NOT implement repositories.
Do NOT implement save orchestration.
Do NOT build UI.
Do NOT build renderers.

The goal is that once Phase 4 begins, every create/update/status transition automatically has audit support available.

====================================================================
SCOPE

Implement ONLY:

1.
Audit entity registration

Register

letter

as a first-class audited entity everywhere required.

This includes every whitelist, enum, union or validator used by the audit system.

Follow the existing Invoice, CSR and Receipt implementations exactly.

--------------------------------------------------

2.
Tracked Fields

Create

LETTER_TRACKED_FIELDS

following existing document families.

Track at minimum:

letter_number

recipient_id

recipient_name

subject

status

attachments

custom_fields

Do NOT track timestamps.

--------------------------------------------------

3.
Letter Audit Helpers

Create helper functions similar to the existing document helpers.

Examples:

recordLetterCreated()

recordLetterUpdated()

recordLetterStatusChanged()

recordLetterDuplicated()

recordLetterArchived()

These helpers must wrap the existing audit infrastructure.

No duplicated audit logic.

--------------------------------------------------

4.
Status Transition Support

Audit entries must correctly identify transitions:

Draft

Approved

Issued

Archived

Cancelled

Include both previous and next state.

--------------------------------------------------

5.
SQL

Update any SQL whitelist or CHECK constraint required for:

entity_type='letter'

Do NOT alter unrelated audit behaviour.

====================================================================
CONSTRAINTS

No UI.

No React.

No repository.

No save hook.

No rendering.

No business logic changes.

No refactoring existing audit architecture.

Reuse existing audit helper patterns exactly.

Letter audit must behave identically to Invoice/CSR audit.

====================================================================
SKILLS

Load relevant skills from:

docs/PROJECTSKILLINDEX.md

Especially:

audit-first-workflow

typescript-advanced-types

database-schema

====================================================================
VERIFICATION

Do NOT run:

bun run build

Required:

bun run typecheck

Run git status before finishing.

Confirm only intended audit-related files changed.

====================================================================
ACCEPTANCE CRITERIA

✓ Letter is a valid audit entity everywhere.

✓ Audit helpers exist.

✓ Letter tracked fields defined.

✓ Status transition auditing supports:

Draft
Approved
Issued
Archived
Cancelled

✓ SQL accepts entity_type='letter'.

✓ Existing audit functionality remains unchanged.

✓ Typecheck passes.

✓ git status shows only intended audit-related modifications.

====================================================================
OUT OF SCOPE

Repository

CRUD

Save orchestration

Pages

Forms

Editors

PDF

React Email

Notifications

====================================================================
NEXT PHASE

Phase 4

Save Orchestration

- useLetterSave()
- withUniqueRetry()
- Repository layer
- Prefix allocation
- Edit Law enforcement
- Duplicate Law support
- Audit helper invocation