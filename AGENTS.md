# AGENTS.md — BIGDROPS AI Agent Guide

Read this file before you change the repository.

---

## 1. Project Fundamentals

- **Product:** B2B business management suite for Nigerian SMEs.
- **Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase/Postgres, Vite 7, Bun, Vercel, Capacitor 8.
- **Package manager:** Bun only.
- **Do not use:** npm, yarn, pnpm.

Commands:

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run test
bun run audit:load
```

Run bun run audit:load before bun run typecheck.

For database connection, follow supabase/database-workflow.md.

Naming conventions:

· Components: PascalCase (example: WaybillForm.tsx)
· Files/utilities: kebab-case (example: waybill-utils.ts)
· Database fields: snake_case (example: waybill_number)

---

2. Concurrent Agent Safety

Multiple AI agents may work on this repository at the same time.

· Treat any pre-existing uncommitted, staged, or untracked change as belonging to another agent.
· Do not destroy another agent's work.
· Do not run these commands without explicit user authorization:
  · git reset
  · git reset --hard
  · git checkout -- <file>
  · git restore <file>
  · git clean
  · git stash (on another agent's work)
  · Any equivalent command that discards or overwrites pre-existing work.
· Do not delete untracked files, revert modifications, or overwrite files that you did not change.
· Do not revert changes because they cause typecheck, lint, or build failures.
· Pre-existing changes are immutable. Do not clean the working tree.
· A file that seems unrelated or contains errors is still protected.
· Before you modify any file, run git status and identify pre-existing changes.
· Modify only files required by the current task.
· If pre-existing changes block verification, do not modify or revert them. Report the conflict.
· If another agent modifies the same file, stop and report the collision. Do not overwrite or merge.
· git status and git diff are for observation only. They do not permit cleanup.
· For every task:
  1. Capture git status before changes.
  2. Record pre-existing modified/staged/untracked files.
  3. Make only task-scoped changes.
  4. Capture git status after changes.
  5. Confirm no pre-existing files were reverted or overwritten.

---

3. Core Guardrails

These guardrails protect business correctness. Do not violate them unless the user explicitly instructs otherwise.

Financial calculations

src/lib/Calculations.ts is the financial source of truth.

· Use calcTotals() and resolveRowVat() for financial calculations.
· Do not duplicate financial calculation logic.
· Do not bypass Calculations.ts.
· Quotations must reuse the invoice/domain financial layer.

Domain boundaries

· PDFs are renderers. They receive prepared data only.
· PDFs must not calculate prices, taxes, totals, VAT, or discounts.
· Quotation logic must reuse the invoice domain layer.
· When you transform invoice items to waybills, remove monetary values:
  · unit_price
  · rate
  · vat
  · discount
  · subtotal
  · grand_total

Document lifecycle

Edit, duplicate, revert, and transformation operations must follow:

```md
docs/standard/document-transformation-standard.md
```

---

4. Execution Rules

Before you change code:

1. Understand the task.
2. Identify affected files.
3. Check callers and shared usage before editing utilities.
4. Load the matching skill if one exists.
5. Plan the change.
6. Make the smallest correct change.
7. Verify.

Rules:

· Make surgical changes only.
· Do not refactor unrelated code.
· Do not rename unrelated symbols.
· Do not change business behavior unless requested.
· Preserve audit trails, document lineage, and existing output behavior.
· Prefer simple, readable control flow over abstraction.

---

5. Verification Gate

Run these checks before you report completion:

```bash
bun run audit:load
bun run typecheck
git status
```

If relevant, also run:

```bash
bun run test
```

Hard rule:

```bash
bun run build
```

must not be used as a normal verification step. The local machine has limited RAM. Build testing is reserved for manual use by the project lead.

---

6. Standards

Standards live under:

```md
docs/standard/
```

docs/standard/ is normative.

Rules:

· Follow all active standards under docs/standard/.
· Do not silently diverge from a standard.
· If an implementation conflicts with a standard, fix the implementation or stop and ask.
· Extend an existing standard before creating a new one.
· Do not duplicate a concept already covered by an existing standard.
· If a standard is marked placeholder, coming soon, or excluded, do not treat it as authoritative unless the user says otherwise.

New document modules must conform to:

```md
docs/standard/json-import-standard.md
docs/standard/document-column-standard.md
```

Rule precedence:

1. Explicit user instruction.
2. docs/standard/
3. This file.
4. Module-specific documentation.

A loaded skill controls implementation approach, but it must not violate explicit user instructions, active standards, or locked business rules unless the user explicitly overrides them.

---

7. Skills

Skills are the primary instruction mechanism for how work is performed.

Skill index:

```md
docs/PROJECTSKILLINDEX.md
```

Load skills from one of these locations:

```md
.agents/skills/
.claude/skills/
.mimocode/skills/
.opencode/agents/
```

Skill rules:

· If a skill is loaded, record it in the task report.

A loaded skill may guide or override non-normative workflow behavior in this file.

A skill must not silently override:

· active standards under docs/standard/
· financial calculation integrity
· document transformation integrity
· audit trail integrity
· database safety rules
· security rules

If a skill appears to conflict with any of those, stop and ask.

---

8. Subagents

Subagents are optional.

Subagent index:

```md
docs/SUBAGENTS.md
```

Use a subagent only when:

· the user explicitly asks for one, or
· no suitable skill exists and a specialist persona is clearly useful.

Rules:

· Subagents do not override skills.
· Subagents do not require delegation logs.
· Subagents must not bypass standards or locked business rules.
· If a skill and a subagent conflict, follow the skill.
· If the user gives direct instruction, follow the user.

---

9. Reports

Every completed task must produce a report under:

```md
docs/reports/<domain>/
```

Examples:

```md
docs/reports/invoice-quote/
docs/reports/WAYBILL/
docs/reports/GENERAL/
docs/reports/boq-rfq/
docs/reports/CSR/
docs/reports/ANDROID/
docs/reports/json-import/
docs/reports/item-library/
```

Do not place reports in the repository root.

Reports must adhere to ASD-STE100 Simplified Technical English.

Each report must begin with a title and identity line.

Example:

```md
# Waybill PDF Adjustment Report

This report was written by Qwen on 2026-07-04 via Local Runner.
```

Use the actual AI name, date, and harness. Do not use placeholder text.

Each report must include:

· Objective
· Scope
· Files changed
· Skills used
· Documentation standard
· Changes made
· Verification result
· Risks or limitations
· Deferred work

Required fields:

```md
Skills used: <exact-skill-name>, <exact-skill-name>
Documentation standard: ASD-STE100 Simplified Technical English
```

If no skill was used:

```md
Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English
```

If a subagent was used, include it optionally:

```md
Subagent used: <subagent-name>
```

If no subagent was used, omit that line.

Verification section must state exact results.

Example:

``
Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: clean
- bun run build: skipped due to hardware policy
```

---

10. Documentation Standard

All technical documentation must adhere to ASD-STE100 Simplified Technical English.

This applies to:

· architecture documents
· design documents
· pattern documents
· READMEs
· specifications
· API documentation
· developer guides
· contribution guides
· AI-generated documentation
· reports

Writing rules:

· Use short, direct sentences.
· Use active voice.
· Use consistent terminology.
· Define technical terms before using them.
· Explain concepts before implementation details.
· Use one idea per paragraph.
· Prefer bullet lists and tables over long prose.
· Remove unnecessary adjectives and filler.
· Do not use marketing language.
· Do not use conversational language.
· Do not use AI-style hedging.
· Avoid repetition.
· Make documents easy to scan.

Documentation workflow:

1. Inspect existing documentation first.
2. Identify the authoritative source document.
3. Extend existing documentation before creating a new document.
4. Cross-reference related documents instead of duplicating information.
5. Keep terminology consistent.
6. Update links when files move.

Duplicate documentation is a defect.

---

11. Architecture Map

High-level boundaries:


src/app/          App bootstrap
src/components/   UI components and reusable UI modules
src/domain/       Business logic, module rules, types, factories
src/lib/          Core utilities, formatters, Calculations.ts
src/modules/      Module integrations and adapters
src/pages/        Route-level pages
src/supabase/     Database client
src/tests/        Critical tests
```

Rules:

· Keep business logic in src/domain/ or src/lib/, not in UI components.
· Keep PDF components as renderers.
· Keep database access through the established Supabase layer.

```