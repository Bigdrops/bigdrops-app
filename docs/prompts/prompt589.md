You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.
====================================================================

A. CONTEXT & OBJECTIVE

Conduct a comprehensive architectural audit of the existing Reports & Compliance Hub within BIGDROPS.

Determine what reusable reporting infrastructure already exists, identify architectural gaps, and design the minimum additional Report Generation Engine and Export Framework required to support Statement of Account and future reports.

Statement of Account must be treated as the first consumer of the reporting framework—not as a standalone module or independent implementation.

Produce a rigorous, evidence-based architectural audit without modifying any application source code.

====================================================================

B. TARGET COMPONENTS / FILES

Mandatory Deliverable:
- docs/reports/GENERAL/reports-compliance-hub-audit.md

Optional Deliverable (only if justified by audit findings):
- docs/reports/GENERAL/report-generation-engine-proposal.md

Audit all existing report-related files including but not limited to:

- Report pages
- Report components
- Report hooks
- Report services
- Report utilities
- Report routing
- Report filters
- Data querying layer
- Rendering layer
- Existing export utilities
- Permission model
- Shared UI components

Do not assume directory names.
Discover the architecture from the repository.

====================================================================

C. CONSTRAINTS (EXECUTION-SAFE ONLY)

ZERO APPLICATION CODE MODIFICATIONS.

Do not modify:

- src/
- database/
- supabase/
- packages/
- configuration
- tests

Do not create:

- Statement of Account implementation
- Statement of Account PRD
- Report implementation
- Export implementation

Only documentation under:

docs/reports/GENERAL/

may be created or modified.

No build execution responsibilities assigned to OpenCode.

Skills Injection Rule:

Read docs/PROJECTSKILLINDEX.md and load every relevant skill required for:

- architecture review
- technical writing
- frontend architecture
- reporting systems
- TypeScript architecture
- code auditing

====================================================================

D. AUDIT SCOPE

The audit must investigate and document:

1. REPORT INVENTORY

Catalogue every existing report.

For each report document:

- Purpose
- Route
- Entry point
- Data source
- Filters
- Rendering method
- Shared components
- Current limitations

2. CURRENT ARCHITECTURE

Document the complete report architecture including:

- navigation
- routing
- registration
- rendering
- querying
- permissions
- filtering
- lifecycle

3. REPORT PIPELINE

Determine how reports currently flow from:

User Request

↓

Filters

↓

Data Retrieval

↓

Transformation

↓

Rendering

Identify missing stages.

4. FILTER FRAMEWORK

Audit:

- date filters
- workspace filters
- client filters
- project filters
- custom filters

Determine whether they are reusable.

5. DATA LAYER

Audit:

- hooks
- services
- domain layer
- Supabase queries
- RPC usage

Identify duplicated querying logic.

6. RENDERING LAYER

Determine:

- generic rendering
- report-specific rendering
- reusable tables
- summary cards
- charts
- print layouts

7. EXPORT READINESS

Audit support for:

- PDF
- CSV
- HTML
- Markdown
- Excel

Determine:

- existing capabilities
- reusable infrastructure
- missing infrastructure
- ideal extension point

Do NOT implement exports.

8. PERMISSIONS

Audit:

- report access
- workspace restrictions
- role enforcement

9. DUPLICATION ANALYSIS

Identify:

- duplicated report logic
- duplicated filtering
- duplicated rendering
- duplicated querying

Recommend consolidation opportunities.

10. GAP ANALYSIS

Compare the current reporting architecture against the requirements of Statement of Account.

Identify the minimum architectural additions required.

11. REPORT GENERATION ENGINE

Design (without implementation) a reusable engine supporting:

- report registration
- report metadata
- filters
- querying
- transformations
- calculations
- rendering
- exports
- audit logging

The engine must support future reports, not only Statement of Account.

====================================================================

E. DESIGN PRINCIPLES

Do NOT assume missing infrastructure should be created.

First determine whether equivalent functionality already exists elsewhere in the repository.

Prefer extending existing abstractions over introducing new ones.

Preserve existing architecture wherever practical.

Every recommendation must include:

- supporting evidence
- affected files/components
- rationale
- expected benefit
- migration impact
- implementation risk

Avoid speculative architecture.

Base every conclusion on repository evidence.

====================================================================

F. REQUIRED VERIFICATION (HARD HARDWARE GATE)

DO NOT RUN:

- bun run build
- bun run typecheck
- lint

This is a documentation-only audit.

Immediately before beginning:

Run:

git status

Immediately before completion:

Run:

git status

Verify:

- only documentation under docs/reports/GENERAL/ changed
- zero application source files modified

====================================================================

G. REQUIRED BEHAVIOUR

Produce a comprehensive architectural audit.

The report must include:

1. Executive Summary

2. Current Architecture Overview

3. Report Inventory

4. Report Lifecycle

5. Data Flow

6. Current Strengths

7. Current Weaknesses

8. Existing Reusable Infrastructure

9. Export Readiness Assessment

10. Duplication Analysis

11. Gap Analysis

12. Report Generation Engine Proposal

13. Statement of Account Integration Strategy

14. Migration Roadmap

15. Risks

16. Recommendations

====================================================================

H. ACCEPTANCE CRITERIA

✓ Zero application source files modified.

✓ git status confirms only documentation files changed.

✓ Every existing report inventoried.

✓ Current report lifecycle documented.

✓ Existing reusable infrastructure identified.

✓ Export readiness thoroughly assessed.

✓ Evidence-based recommendations throughout.

✓ Generic Report Generation Engine proposed.

✓ Generic Export Framework proposed.

✓ Statement of Account integrated as a report within the Reports & Compliance Hub rather than a standalone module.

✓ Clear phased migration roadmap provided.

✓ Documentation is sufficiently detailed to serve as the architectural foundation for the subsequent Reports Enhancement PRD and Statement of Account PRD.