You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY — DO NOT SKIP)
==================================================
Before writing any code, you MUST:

1. Read the project skills index: `docs/PROJECTSKILLINDEX.md`
2. Load the skills relevant to this task:
   - `Karpathy` — coding discipline, surgical changes, no scope creep
   - `using-superpowers` — skill invocation protocol, instruction hierarchy, red flags
3. If a skill fails to load via your tool, FALL BACK to reading the SKILL.md file directly using the path from the index.
4. If a SKILL.md file cannot be read by any means, STOP IMMEDIATELY. The task is a FAILED TASK.
5. Read `AGENTS.md` at the project root before modifying any file.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save a brief work report to `docs/reports/pdf-customization-compatibility-audit.md`
Include: date, agent name, files touched, what was done, any issues, and a confirmation that no application source files were modified.

==================================================
TASK: PDF Customization Engine Compatibility Audit (REPORT ONLY)
==================================================

This is a **zero-code investigation**. Your only deliverables are two
Markdown files. No application code may be modified, created, refactored,
moved, or renamed.

**Do NOT:**
- Modify application code
- Create application code
- Refactor application code
- Move or rename files
- Update the PRD
- Create standards or scaffolding
- Implement recommendations
- Stage or commit changes (except the allowed report files)

If you believe code changes are necessary, document them in the report
instead of making them.

==================================================
REQUIRED OUTPUT
==================================================

1. **Main audit report:** `docs/Reports/PDF/pdf-customization-engine-compatibility-audit.md`
2. **Work report:** `docs/reports/pdf-customization-compatibility-audit.md`

No other repository files may be modified.

==================================================
OBJECTIVE
==================================================

Audit the proposed **Shared PDF Customization Extension System** against
the current BIGDROPS repository. Determine whether the proposed
architecture can be integrated safely without conflicting with existing
PDF engines, rendering pipelines, standards, or shared infrastructure.

Your goal is to discover conflicts — not solve them in code.

==================================================
REVIEW THE PRD
==================================================

Read in full: `docs/PRD/pdf-customization-extension-system.md`
Treat it as the proposed future architecture.

==================================================
REVIEW EXISTING STANDARDS
==================================================

Inspect every document inside `docs/STANDARD/`. Determine:
- Standards already satisfied by the PRD
- Standards duplicated
- Standards contradicted
- Standards affected
- Standards requiring future amendments

Document every finding.

==================================================
AUDIT EVERY PDF ENGINE
==================================================

Review every existing PDF implementation including:
- Waybill
- CSR
- Invoice
- Quotation
- Shared PDF renderer
- Shared PDF utilities
- Font registration
- Pagination
- HTML/RichText processing
- Preview infrastructure
- Existing customization systems
- Existing persistence
- Existing hooks

Identify what each engine currently owns.

==================================================
RESPONSIBILITY MAPPING
==================================================

For every document determine ownership of:
- Rendering
- Pagination
- Layout
- HTML processing
- Render model generation
- Font registration
- Customization
- Persistence
- Preview
- Template defaults
- Fillable rendering

Clearly identify what:
- Must remain in the document engine
- Should migrate into the shared customization engine
- Should remain as shared infrastructure

==================================================
INTEGRATION ANALYSIS
==================================================

Determine how the proposed customization engine should integrate with
existing systems. Prefer adapters over rewrites. Document existing
integration points including:
- Design presets
- Render models
- Template props
- Preview models
- Shared utilities
- Rendering contracts

Recommend adapter layers where appropriate.

==================================================
FONT REGISTRATION AUDIT
==================================================

Audit every existing font registration path. Identify:
- Registration location
- Ownership
- Duplication
- Missing registration
- Migration path

Determine whether the proposed shared Font Registry cleanly replaces
current behaviour.

==================================================
PERSISTENCE AUDIT
==================================================

Audit every existing customization storage key. For each key document:
- Owner
- Structure
- Purpose
- Migration target
- Backward compatibility considerations

==================================================
COMPATIBILITY MATRIX
==================================================

Produce a compatibility matrix for every supported PDF document showing:
- Current architecture
- Current customization
- Existing owner
- Future owner
- Migration approach
- Regression risk
- Complexity

==================================================
ARCHITECTURAL CONFLICT REPORT
==================================================

Identify every conflict involving:
- Rendering
- Customization
- Resolver
- Persistence
- Font registration
- Hooks
- Preview
- Template defaults
- Document family storage
- Existing APIs

Classify each conflict as: No conflict, Low, Medium, or High. Explain why.

==================================================
PRD REVIEW
==================================================

Critically review the PRD. Identify:
- Weaknesses
- Missing considerations
- Hidden assumptions
- Missing migration steps
- Missing extension points
- Simplification opportunities

Do NOT modify the PRD. Only document findings.

==================================================
FINAL REPORT STRUCTURE
==================================================

The main audit report must follow this structure:
1. Executive Summary
2. Standards Review
3. Existing Engine Analysis
4. Responsibility Map
5. Integration Points
6. Adapter Recommendations
7. Font Registration Audit
8. Persistence Audit
9. Compatibility Matrix
10. Architectural Conflicts
11. PRD Review
12. Implementation Readiness
13. Recommendations

==================================================
VERIFICATION
==================================================

Immediately before beginning:
- Run `git status` and record the output

Immediately after completing:
- Run `git status` again. The only modified or created files must be:
  `docs/Reports/PDF/pdf-customization-engine-compatibility-audit.md`
  `docs/reports/pdf-customization-compatibility-audit.md`
- If any application source file is modified, treat the task as failed.

==================================================
DO NOT
==================================================
- Do NOT modify application code
- Do NOT run `bun run dev`
- Do NOT stage or commit changes beyond the two allowed report files
- Do NOT implement any recommendations