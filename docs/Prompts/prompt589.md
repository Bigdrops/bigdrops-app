You are working on the BIGDROPS business platform.

Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================

1. Read `docs/PROJECTSKILLINDEX.md` first.
2. Load the following skills:
   - Karpathy
   - using-superpowers
3. For each skill:
   - Attempt to load through the skill system.
   - If loading fails, read the skill directly from disk.
4. If any critical skill cannot be loaded, stop immediately and report the error.
5. Read `AGENTS.md` before making any code changes.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================

Continue updating the existing report:

`docs/Reports/item-library-phase-1-stabilization.md`

Add dedicated sections for:

- Catalog Integrity Audit
- Performance Audit
- Additional fixes (if any)
- Final Phase 1 Summary
- Phase 2 Readiness Assessment

==================================================
CONTEXT
==================================================

The Item Library Phase 1 stabilization is almost complete.

The following work has already been completed:

✓ Fixed suggestion normalization mismatch by mirroring the database normalization logic.

✓ Eliminated unnecessary rerenders by memoizing the suggestion engine return object.

✓ Removed duplicated logic from `useItemAliases`.

✓ Audited Cleanup Export / Import.

✓ Audited Duplicate Detection.

✓ Audited Merge Workflow.

Do not repeat these investigations unless required to verify a new finding.

==================================================
OBJECTIVE
==================================================

Complete the remaining Phase 1 stabilization work.

The goal is to prove that the Item Library is internally consistent, performant, and production-ready before beginning Phase 2.

This is primarily an audit with targeted low-risk fixes where justified.

==================================================
TASK 1
Catalog Integrity Audit
==================================================

Perform a complete integrity review of the Item Library.

Investigate whether the catalogue can ever become internally inconsistent.

Specifically inspect for:

- orphan aliases
- aliases referencing deleted items
- duplicate active aliases
- duplicate normalized aliases
- aliases pointing to multiple items
- inactive catalogue items returned in search
- retired aliases still influencing suggestions
- merge history pointing at invalid records
- cleanup batches referencing missing items
- import batches referencing invalid merge history
- repository assumptions that bypass database guarantees

Verify every relationship between:

- item_catalog
- item_aliases
- item_merge_log
- item_import_batches

Document every finding.

If no issues exist, explicitly state why the implementation is considered safe.

==================================================
TASK 2
Performance Audit
==================================================

Review the Item Library for obvious performance problems.

Inspect for:

- unnecessary repository queries
- duplicate fetches
- repeated normalization work
- repeated suggestion ranking
- unnecessary filtering
- avoidable rerenders
- unstable references
- expensive derived state
- N+1 query patterns
- repeated alias loading
- repeated merge history loading

Only implement low-risk optimizations.

Do not redesign architecture.

Do not prematurely optimize.

==================================================
TASK 3
Low-Risk Stability Improvements
==================================================

If additional issues are discovered during either audit:

Fix only issues that are:

- isolated
- low risk
- backward compatible
- clearly beneficial

Avoid feature work.

Avoid architectural redesign.

Avoid speculative refactoring.

==================================================
OUT OF SCOPE
==================================================

Do NOT work on:

- Bulk Export
- Bulk CSV Export
- Bulk JSON Export
- Shared Export Dropdown
- Document Export
- Document Import
- JSON Import
- Invoice forms
- Quotation forms
- Waybill forms
- Query Platform
- PDF generation
- CSR export

Those belong to later PRD phases.

==================================================
CONSTRAINTS
==================================================

Do not redesign the Item Library.

Do not change database schema.

Do not introduce breaking APIs.

Do not replace repository architecture.

Keep changes focused and minimal.

Preserve backward compatibility.

Touch only files required for Phase 1 completion.

==================================================
OUTPUT
==================================================

Provide:

1. Catalog integrity findings.
2. Performance findings.
3. Any additional bugs fixed.
4. Files modified.
5. Root causes.
6. Before/after behaviour.
7. Edge cases verified.
8. Remaining technical debt.
9. Recommendation on whether Phase 1 can be considered complete.
10. Explicit Phase 2 readiness assessment.

==================================================
STOP CONDITION
==================================================

Stop once:

- Catalog integrity has been fully verified.
- Performance audit has been completed.
- Any low-risk stability fixes have been implemented.
- The Phase 1 report has been finalized.
- A clear recommendation has been made on whether the Item Library is ready for Phase 2.

Do not begin Phase 2 implementation.