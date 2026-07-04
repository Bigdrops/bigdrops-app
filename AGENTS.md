# AGENTS.md — BIGDROPS Project Guide for AI Coding Agents

> Read this file before making any changes to the repository. It documents hard rules, architecture boundaries, and conventions that must not be violated.

---

## 1. Project Fundamentals & Tooling

* **Platform:** B2B business management suite for Nigerian SMEs.
* **Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase (Postgres), Vite 7, Bun, Vercel, Capacitor 8.
* **Runtime constraint:** Bun ONLY. Never use npm, yarn, or pnpm.
* **Commands:** Use `bun install`, `bun run dev`, `bun run build`, `bun run typecheck`, `bun run lint`.
* **Audit Command:** Run `bun run audit:load` before typecheck.
* **Test Command:** `bun run test` (executes `node --test "src/tests/critical/*.test.js"`).
* **Naming Conventions:**
    * Components: PascalCase (e.g., `WaybillForm.tsx`).
    * Files: kebab-case (e.g., `waybill-utils.ts`).
    * Database fields: snake_case (e.g., `waybill_number`).

---

## 2. Hard Architecture Rules (Non-Negotiable)

The following rules and codebase boundaries are strictly enforced. Rules marked **[LOCKED]** represent single sources of truth or critical constraints that must never be modified without explicit, written user instruction.

* **[LOCKED] Financial Source of Truth:** `src/lib/Calculations.ts` handles all financial calculations. The `calcTotals()` and `resolveRowVat()` functions are core pipelines; changing them affects every financial document.
* **[LOCKED] Document Numbering Engine:** `src/domain/prefixConstants.ts` (`DEFAULT_PREFIXES`, `resolvePrefix()`) is the canonical prefix engine. All document numbering MUST follow `docs/STANDARD/prefix-engine-settings-standard.md`. Format: `{resolvedPrefix}-{routingToken?}-{6-digit serial}`. Never hardcode a prefix string.
* **[LOCKED] Waybill Number Generation:** `generateWaybillSequenceNumber()` format must not be changed, and consumed `blank_waybill_logs` tokens are permanently locked and cannot be recycled.
* **Domain Segregation:** PDFs are dumb renderers that receive shaped data via preview functions; they never compute prices, taxes, or totals. Quotations must reuse the invoice domain layer; never duplicate financial logic. When transforming invoice items to waybills, all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`) must be stripped.
* **Document Lifecycle Operations:** Edit, duplicate, and revert operations MUST follow `docs/STANDARD/document-transformation-standard.md`. 
* **UI Constraints:** No framer-motion components in production.
* **Linting:** `android/` and `dist/` must be excluded via `.eslintignore` or `eslint.config.js` `ignores`.

---

## 3. Workflow & Execution Methodology

All coding agents must follow this strict execution methodology to prevent regressions and scope creep.

* **Audit & Skill Load First:** Before changing any implementation, you MUST identify the file's ownership, callers, and downstream effects. Search the codebase for usage before modifying shared utilities. **If the task involves a new or unfamiliar domain, you MUST read `docs/PROJECTSKILLINDEX.md` and load the corresponding skill before writing code.**
* **Plan Before Execution:** Think step-by-step in a `<plan>` block before writing code. Prioritize simple control flow, goal-driven execution, and verifiable success criteria over complex abstractions.
* **Surgical Changes Only:** Touch only what the task requires. Do not refactor adjacent code, fix formatting, or rename symbols outside the immediate scope of the user's request.
* **Preserve Business Behavior:** Unless the task explicitly changes business rules, you must preserve user-visible behavior, audit trails, document lineage, numbering, and transformation semantics. Structural refactoring must not alter existing output.
* **Verify via Verification Gate (HARD HARDWARE GATE):** Define success criteria before implementing. You MUST run the fast verification commands below to verify your changes do not break downstream modules. Loop until checks pass:
    * `bun run typecheck` (Catches all type errors in seconds).
    * `bun run audit:load` (Catches query-pattern issues).
    * `git status` (Confirms no unintended files were modified).
    * **CRITICAL:** NEVER run `bun run build` as a standard verification step. Due to local host RAM limitations (4GB), full bundler building will timeout and choke the execution workspace. Build testing is strictly reserved for the project lead to run manually.

---

## 4. Standards Hierarchy & Conformity

When multiple standards apply, the following precedence order is enforced:

1. `AGENTS.md` (This file)
2. `docs/STANDARD/*`
3. Module-specific documentation
4. Task instructions

* **Strict Conformity:** Standards under `docs/STANDARD/` are normative. Both existing code modifications and new modules must strictly conform to them. If an implementation conflicts with a standard, you must either update the implementation to match the standard, or explicitly halt and ask to revise the standard. **Never silently diverge.**
* **New Module Requirements:** New document modules MUST fully conform to `docs/STANDARD/json-import-standard.md` (for JSON imports) and `docs/STANDARD/document-column-standard.md` (for configurable columns).
* **No Duplication:** Extend existing standards in `docs/STANDARD/` before creating new ones—never duplicate a concept an existing standard already covers.

---

## 5. Skills Registry & Loading Protocol

The full skill index containing ~25 skills and 232 subagents is located at: **`docs/PROJECTSKILLINDEX.md`**. Do not re-derive this index from memory.

* **Load Location:** Load skills from `.agents/skills/`, `.claude/skills/`, `.mimocode/skills/`, or `.opencode/agents/`.
* **Strict Matching:** You must use exact skill names. If a requested skill name does not match exactly or cannot be found, you MUST HALT and request clarification. Never guess, hallucinate, or fallback to a similarly named skill.
* **Fallback:** If a skill-loading tool fails but the exact path is known, read the `SKILL.md` directly at the path listed in the index.

---

## 6. Documentation & Reporting Rules

Every completed task requires a rigorous report saved under `docs/Reports/` in the matching domain folder (e.g., `invoice-quote`, `GENERAL`, `WAYBILL`, `boq-rfq`, `CSR`, `ANDROID`, `TOAST`, `item-library`, `json-import`). Never place reports in the repository root.

**Report Identity Standard:**
Every report MUST begin with an identity line immediately after the title stating the real name of the AI, the date, and the tool harness.
* *Example format:* `This report was written by OpenCode on 2026-07-04 via Local Runner.`
* You must generate your actual name (e.g., OpenCode). Do not use placeholder brackets or generic variables.

**Report Quality Principles:**
1. **Objective & Scope:** State what is covered and what is intentionally excluded.
2. **Evidence-Based:** Trace every finding to inspected code, paths, or execution traces. Never use vague qualifiers like "seems" or "probably".
3. **Fact vs. Conclusion:** Keep raw observations separate from interpretations.
4. **Risks & Limitations:** Record known risks, unverified assumptions, or limitations.
5. **Verification:** State exact verification gate pass status (e.g., `bun run typecheck` passed, build skipped due to hardware policy).
6. **Deferred Work:** Explicitly list what was intentionally left for future phases.

---

## 7. Core Architecture Map

Refer to this high-level map to understand system boundaries. Do not assume exhaustive mapping of UI directories.

* `src/app/` — App bootstrap
* `src/components/` — UI layer. Contains reusable domain modules (e.g., `invoice/`, `waybill/`, `pdf/`) and generic primitives (`ui/`). Do not place business logic here.
* `src/domain/` — Business logic per module (e.g., `invoice/`, `quotation/`, `waybill/`). Owns types, calculations, factories, and rules.
* `src/lib/` — Core libraries, utilities, formatters, and the canonical `Calculations.ts`.
* `src/modules/` — Module-specific integrations and adapters.
* `src/pages/` — Route-level orchestration components.
* `src/supabase/` — Database client.
* `src/tests/` — Critical path test suite.
