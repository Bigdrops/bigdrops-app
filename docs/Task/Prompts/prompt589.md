You are working on the BIGDROPS business platform.
Runtime: Bun ONLY. Never use npm or yarn.

==================================================
MANDATORY BOOTSTRAP
==================================================
Before doing anything:
1. Read AGENTS.md
2. Read docs/PROJECTSKIILINDEX.md
3. Load all required skills from docs/ index

If ANY skill fails to load:
- Re-read docs/PROJECTSKIILINDEX.md
- Locate the skill via filesystem path
- Attempt direct SKILL.md read
- If still failing → STOP IMMEDIATELY and mark task FAILED

==================================================
TASK: Waybill PDF Template Audit (READ ONLY)
==================================================

REFERENCE:
- docs/PRD/pdf-rendering-roadmap.md → Phase 3B

==================================================
REQUIRED FILE DISCOVERY
==================================================

Locate and inspect ALL Waybill-related PDF files in:
- src/components/waybill/

Locate:
- Internal Waybill PDF template
- External Waybill PDF template
- Any shared/base PDF renderer used by Waybill
- blankWaybillTemplate.tsx
- New Waybill modal (type selector)

If files are split or dynamically resolved, trace the resolver logic.

==================================================
ANALYSIS TASKS (READ ONLY — NO CODE CHANGES)
==================================================

1. PDF TEMPLATE ARCHITECTURE
   - List exact file paths for all Waybill PDF templates
   - Confirm whether Internal/External share a template or are separate
   - Identify rendering pipeline (direct JSX vs PdfRenderer abstraction)

2. TABLE STRUCTURE ANALYSIS
   - Extract item row mapping logic
   - Identify fields used for:
     - description
     - quantity
     - unit
     - condition
   - Detect any fallback values (especially hardcoded 0)

3. COLUMN LAYOUT
   - Extract column width definitions (percentages or styles)
   - Identify layout collapse issues (if any)

4. SIGNATURE + FOOTER
   - Extract signature block code
   - Identify alignment, sizing, or flex issues

5. QUANTITY BUG ROOT CAUSE
   - Trace why quantity resolves to 0
   - Identify mapping mismatch between DB → domain → PDF

6. BLANK WAYBILL TEMPLATE
   - Fully analyze blankWaybillTemplate.tsx
   - Determine:
     - Whether number is passed via props or hardcoded
     - Why rendering fails (if applicable)
     - Whether Internal/External both supported correctly

7. TYPE SELECTOR MODAL
   - Identify file rendering "New Waybill" modal
   - Extract:
     - background styling (color/token/class)
     - typography system (font mismatch vs app system)
     - component system used (shadcn or custom)

==================================================
OUTPUT REQUIREMENTS
==================================================

Generate a report with:

- File map (all relevant paths)
- Key code excerpts (only critical sections)
- Root cause analysis per issue
- Dependency graph (if shared renderer exists)
- Risk notes for fixing Phase 3B

Save to:
Task/reports/waybill-pdf-template-audit.md

==================================================
CONSTRAINTS
==================================================

- READ ONLY MODE
- NO CODE MODIFICATIONS
- NO REFACTORING
- NO FIXES
- NO ASSUMPTIONS (if missing info → explicitly state UNKNOWN)
- Be precise, cite file paths and exact code locations where possible