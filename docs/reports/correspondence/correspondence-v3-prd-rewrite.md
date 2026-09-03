# Correspondence V3 PRD Rewrite Report

This report was written by OpenCode on 2026-07-13 via Local Runner.

## Objective & Scope

Complete rewrite of the Correspondence Module V2 PRD to produce V3, incorporating findings from four specialized subagents (Software Architect, Product Manager, Technical Writer, UI Designer) and 9 resolved architectural decisions. The V3 PRD is designed as a standalone, from-scratch product document — no implementation history or V2 vestiges remain.

**In scope:** PRD restructuring, terminology standardization, 9 decision incorporation, standards referencing, user stories, UX wireframe descriptions, implementation phases.

**Out of scope:** Code implementation, database migrations, UI component building, PDF template creation.

## Evidence-Based Findings

### Source Documents
- V3 PRD: `docs/prd/Correspondence-module/Correspondence-module-V3.md` (839 lines, 18 sections)
- V2 PRD: `docs/prd/Correspondence-module/Correspondence-module-V2.md` (superseded)
- V1 PRD: `docs/prd/Correspondence-module/Correspondence-modulev1.md` (historical context)
- All analyses: `docs/Reports/correspondence/`

### Subagent Analyses Used

| Subagent | Key Findings Incorporated |
|---|---|
| Software Architect | Block type alignment (7 types), PdfDocumentType gap, withUniqueRetry gap, DocumentSaveStrategy gap, audit registration gap, JSON import adapter gap |
| Product Manager | Lifecycle simplification (draft→issued→archived), recipient linking, onboarding/empty states, JSON import use case |
| Technical Writer | 14 content issues fixed, terminology standardized to "Correspondence", 12-section restructure, user stories, executive summary added |
| UI Designer | WYSIWYG toolbar corrected, attachment section added, issue/send action added, duplicate action added, preview toggle, draft watermark, status filter tabs |

### 9 Architectural Decisions Incorporated
1. Company Profile + Sender Snapshot (both present, snapshot immutable post-issue)
2. clientId removed — recipient always embedded
3. Lifecycle: draft→issued→archived (no approved/cancelled)
4. Templates deferred to Phase 2 (data model anticipates, no UI)
5. Letterhead in V2 scope
6. LetterTextSegment kept (bold/italic/underline/link/code)
7. Block types exactly match implementation: heading, paragraph, list, quote, divider, signature, image
8. JSON import scope: subject/recipient/representative/body only
9. PRD references standards, never restates them

## Fact vs. Conclusion

**Facts:**
- TypeScript typecheck passes with zero errors (V3 PRD is document-only, no code changed)
- Audit check passes (no new regressions introduced)
- V3 PRD is 839 lines across 18 sections
- All 9 resolved decisions are explicitly stated at the top of the PRD

**Conclusions:**
- V3 PRD is architecturally faithful to the implementation (block types, lifecycle, data model all match code)
- Standards references are canonical — no duplication of standard content within the PRD
- Terminology is consistent ("Correspondence", "Letter", "Letter Number") throughout

## Risks & Limitations

1. **V3 PRD is a design document, not code.** Implementation will surface edge cases not captured in the PRD (e.g., exact error message strings, button placement in responsive layouts).
2. **Letterhead in V2 scope** is a stretch goal — if scope pressure hits, letterhead can defer to Phase 1.1 without architectural impact.
3. **JSON import is defined by use case only** — the exact UI flow (modal vs dedicated page) is left to implementation.
4. **PdfDocumentType 'letter' registration** is flagged as a code gap — the PRD assumes it exists but the implementation doesn't have it yet.
5. **withUniqueRetry for letter numbering** is a dependency gap — the PRD references numbering by prefix engine but the retry-with-unique-suffix mechanism needs building.

## Verification

- `bun run typecheck` — PASS (no errors)
- `bun run audit:load` — PASS (pre-existing issues only, no new correspondence-related violations)
- `git status` — only document files modified (PRD, reports, delegation log); no code files touched

## Deferred Work

1. **Code implementation planning** — a separate task to bridge V3 PRD into actionable implementation tickets covering: PdfDocumentType registration, withUniqueRetry, DocumentSaveStrategy integration, audit SQL whitelist, importAdapter creation, letter UI components
2. **Code review of existing letter implementation** — the domain/ directory code (types, numbering, validation, persistence, normalization, repository) should be reviewed against V3 PRD for any discrepancies
3. **Letterhead UI design** — deferred within V2 scope, but wireframes would benefit from letterhead placement exploration
4. **Template system design** — Phase 2 work, but a separate technical design doc would help de-risk the template slot architecture
