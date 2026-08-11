# AGENTS.md — BIGDROPS AI Agent Guide

> Read this file before making changes to the repository.

---

## 1. Project Fundamentals

- **Product:** B2B business management suite for Nigerian SMEs.
- **Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase/Postgres, Vite 7, Bun, Vercel, Capacitor 8.
- **Package manager:** Bun only.
- **Never use:** npm, yarn, pnpm.

Commands:

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run test
bun run audit:load
```

Run `bun run audit:load` before `bun run typecheck`.

Naming conventions:

- Components: `PascalCase`, example: `WaybillForm.tsx`
- Files/utilities: `kebab-case`, example: `waybill-utils.ts`
- Database fields: `snake_case`, example: `waybill_number`

---

## 2. Core Guardrails

These guardrails protect business correctness. Do not violate them unless the user explicitly instructs otherwise.

### Financial calculations

`src/lib/Calculations.ts` is the financial source of truth.

- `calcTotals()` and `resolveRowVat()` are core financial pipelines.
- Do not duplicate financial calculation logic.
- Do not bypass `Calculations.ts`.
- Quotations must reuse the invoice/domain financial layer.

### Domain boundaries

- PDFs are renderers. They must receive prepared data.
- PDFs must not calculate prices, taxes, totals, VAT, or discounts.
- Quotation logic must reuse the invoice domain layer where applicable.
- When transforming invoice items to waybills, remove monetary values:
  - `unit_price`
  - `rate`
  - `vat`
  - `discount`
  - `subtotal`
  - `grand_total`

### Document lifecycle

Edit, duplicate, revert, and transformation operations must follow:

```md
docs/standard/document-transformation-standard.md
```

### UI constraint

- Do not use framer-motion components in production.

---

## 3. Execution Rules

Before changing code:

1. Understand the task.
2. Identify affected files.
3. Check callers and shared usage before editing utilities.
4. Load the matching skill if one exists.
5. Plan the change.
6. Make the smallest correct change.
7. Verify.

Rules:

- Make surgical changes only.
- Do not refactor unrelated code.
- Do not rename unrelated symbols.
- Do not change business behavior unless requested.
- Preserve audit trails, document lineage, and existing output behavior.
- Prefer simple, readable control flow over abstraction.

---

## 4. Verification Gate

Run these checks before reporting completion:

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

## 5. Standards

Standards live under:

```md
docs/standard/
```

`docs/standard/` is normative.

Rules:

- All active standards under `docs/standard/` must be followed where applicable.
- Do not silently diverge from a standard.
- If an implementation conflicts with a standard, either fix the implementation or stop and ask.
- Extend an existing standard before creating a new one.
- Do not duplicate a concept already covered by an existing standard.
- If a standard is marked placeholder, coming soon, or excluded, do not treat it as authoritative unless the user says otherwise.

New document modules must conform to:

```md
docs/standard/json-import-standard.md
docs/standard/document-column-standard.md
```

Rule precedence for repository/business rules:

1. Explicit user instruction.
2. `docs/standard/`
3. This file.
4. Module-specific documentation.

A loaded skill controls implementation approach, but it must not violate explicit user instructions, active standards, or locked business rules unless the user explicitly overrides them.

---

## 6. Skills

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

- Use exact skill names.
- If the user names a skill, use that skill.
- If a requested skill cannot be found, stop and ask.
- Do not guess a skill name.
- Do not silently replace a requested skill with another skill.
- Do not replace a requested skill with a subagent.
- If a skill is loaded, record it in the task report.

A loaded skill may guide or override non-normative workflow behavior in this file.

A skill must not silently override:

- active standards under `docs/standard/`
- financial calculation integrity
- document transformation integrity
- audit trail integrity
- database safety rules
- security rules

If a skill appears to conflict with any of those, stop and ask.

---

## 7. Subagents

Subagents are optional.

Subagent index:

```md
docs/SUBAGENTS.md
```

Use a subagent only when:

- the user explicitly asks for one, or
- no suitable skill exists and a specialist persona is clearly useful.

Rules:

- Subagents do not override skills.
- Subagents do not require delegation logs.
- Subagents must not bypass standards or locked business rules.
- If a skill and a subagent conflict, follow the skill.
- If the user gives direct instruction, follow the user.

---

## 8. Reports

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

Reports must adhere to ADS-STE100 Simplified Technical English.

Each report must begin with a title and identity line.

Example:

```md
# Waybill PDF Adjustment Report

This report was written by Qwen on 2026-07-04 via Local Runner.
```

Use the actual AI name, date, and harness. Do not use placeholder text.

Each report must include:

- Objective
- Scope
- Files changed
- Skills used
- Documentation standard
- Changes made
- Verification result
- Risks or limitations
- Deferred work

Required fields:

```md
Skills used: <exact-skill-name>, <exact-skill-name>
Documentation standard: ADS-STE100 Simplified Technical English
```

If no skill was used:

```md
Skills used: NONE
Documentation standard: ADS-STE100 Simplified Technical English
```

If a subagent was used, include it optionally:

```md
Subagent used: <subagent-name>
```

If no subagent was used, omit that line.

Verification section must state exact results.

Example:

```md
Verification:
- bun run audit:load: passed
- bun run typecheck: passed
- git status: clean
- bun run build: skipped due to hardware policy
```

---

## 9. Documentation Standard

All technical documentation must adhere to ADS-STE100 Simplified Technical English.

This applies to:

- architecture documents
- design documents
- pattern documents
- READMEs
- specifications
- API documentation
- developer guides
- contribution guides
- AI-generated documentation
- reports

Writing rules:

- Use short, direct sentences.
- Use active voice.
- Use consistent terminology.
- Define technical terms before using them.
- Explain concepts before implementation details.
- Use one idea per paragraph.
- Prefer bullet lists and tables over long prose.
- Remove unnecessary adjectives and filler.
- Do not use marketing language.
- Do not use conversational language.
- Do not use AI-style hedging.
- Avoid repetition.
- Make documents easy to scan.

Documentation workflow:

1. Inspect existing documentation first.
2. Identify the authoritative source document.
3. Extend existing documentation before creating a new document.
4. Cross-reference related documents instead of duplicating information.
5. Keep terminology consistent.
6. Update links when files move.

Duplicate documentation is a defect.

---

## 10. Architecture Map

High-level boundaries:

```md
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

- Keep business logic in `src/domain/` or `src/lib/`, not in UI components.
- Keep PDF components as renderers.
- Keep database access through the established Supabase layer.