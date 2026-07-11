You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE DOING ANY WORK
====================================================================

OpenCode has full repository access.

Read AGENTS.md immediately and follow all repository standards.

This is a STRICTLY READ-ONLY GOVERNANCE AUDIT.

The ONLY permitted repository modification is writing the final markdown report specified below.

====================================================================
LOAD RELEVANT SKILLS
====================================================================

Load the appropriate audit/documentation skills from:

docs/PROJECTSKILLINDEX.md

====================================================================
A. CONTEXT & OBJECTIVE
====================================================================

Phase 2A and Phase 2B are complete.

Mechanical alias migration has finished.

Before any future cleanup of documentViewTheme.css, perform a repository-wide governance audit that classifies every remaining --dv-* token and determines whether any legacy definitions can safely be retired.

This is an audit only.

No source code changes are authorized.

====================================================================
B. PRE-AUDIT VERIFICATION
====================================================================

Immediately execute:

git status

Record the output internally.

This establishes the baseline before the audit begins.

====================================================================
C. AUDIT SCOPE
====================================================================

Search the repository for every occurrence of:

--dv-

Consumer search MUST exclude:

src/components/document-view/shared/documentViewTheme.css

when calculating active consumers.

The theme file itself must still be inspected separately when evaluating orphaned definitions.

====================================================================
D. CLASSIFICATION RULES
====================================================================

Every remaining token MUST belong to exactly one category.

Category 1
Mechanical Alias

Definition:
A remaining alias that should already have been migrated.

Action:
Flag as migration defect.

Category 2
Derived Semantic Token

Definition:
Opacity wrappers,
alpha-composed values,
HSL-composed helpers,
or other intentionally derived presentation tokens.

Action:
Retain.

Category 3
Design Primitive

Definition:
Intentional design-system primitives including:

• font tokens
• permanent accent/status colors
• other foundational visual primitives

Action:
Retain unless superseded by a future design-system expansion.

Category 4
Dead Definition

Definition:
Definition exists in documentViewTheme.css with zero consumers anywhere in the repository.

Action:
Candidate for future deletion only.

Do NOT delete.

====================================================================
E. REQUIRED CROSS-CHECKS
====================================================================

Answer BOTH questions with evidence.

1.

Leak Check

Are any remaining mechanical aliases located outside

src/components/document-view/

If yes:

list every file.

2.

Orphan Check

Which definitions inside

documentViewTheme.css

have zero consumers across the repository?

List every candidate.

Do NOT modify the file.

====================================================================
F. REQUIRED OUTPUT
====================================================================

Write ONE markdown report only.

Destination:

docs/Reports/GENERAL/phase-2c-token-governance-audit.md

Required structure:

# BIGDROPS Phase 2C Token Governance Audit Report

## Executive Summary

- Remaining active consumers
- Unique files
- Mechanical Alias count
- Derived Semantic count
- Design Primitive count
- Dead Definition count

## Token Ledger

| Token | File | Consumer Count | Classification | Recommended Action |

## Leak Check

## Orphan Check

## Final Governance Recommendation

State explicitly whether documentViewTheme.css can or cannot be reduced at this time, with supporting evidence.

====================================================================
G. POST-AUDIT VERIFICATION
====================================================================

Run:

git status

The ONLY repository modification permitted is:

docs/Reports/GENERAL/phase-2c-token-governance-audit.md

If any source code file appears modified:

STOP

Report the unexpected modification.

Do not continue.

====================================================================
H. HARD PROHIBITIONS
====================================================================

DO NOT:

- modify CSS
- modify TS/TSX
- modify JS
- modify routing
- modify layouts
- rename files
- delete files
- move files
- change documentViewTheme.css
- run bun run build
- run bun run typecheck
- run lint

This is an audit.

Nothing else.

====================================================================
ACCEPTANCE CRITERIA
====================================================================

✓ Governance report written successfully.

✓ Every remaining --dv-* token classified.

✓ Leak Check completed.

✓ Orphan Check completed.

✓ git status before and after recorded.

✓ Zero application source files modified.

====================================================================
END OF PHASE 2C GOVERNANCE AUDIT
====================================================================