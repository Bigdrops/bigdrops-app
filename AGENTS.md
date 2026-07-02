# AGENTS.md — BIGDROPS Project Guide for AI Coding Agents

> Read this file before making any changes to the repository. It documents hard rules, architecture boundaries, and conventions that must not be violated.

---

## 1. Project Identity

- **Platform:** B2B business management suite for Nigerian SMEs
- **Stack:** React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase (Postgres), Vite 7, Bun, Vercel, Capacitor 8
- **Runtime:** Bun only — never npm or yarn
- **Package manager commands:** `bun install`, `bun run dev`, `bun run build`, `bun run typecheck`, `bun run lint`

---

## 2. Hard Architecture Rules (Non-Negotiable)

- `src/lib/Calculations.ts` is the single source of truth for all financial calculations. Never modify without explicit instruction.
- `calcTotals()` and `resolveRowVat()` inside it are core calculation pipelines — changing them affects every financial document.
- PDFs are dumb renderers — they receive shaped data via preview functions but never compute prices, taxes, or totals.
- Quotations must reuse the invoice domain layer — never duplicate financial logic between modules.
- No Tailwind v4 syntax — project is on Tailwind CSS v3.4.
- No framer-motion — the dependency exists but is not used in production components.
- External waybills must have a purpose; internal waybills must have purpose `NULL` — enforced by the `check_waybill_purpose_conditional` Postgres CHECK constraint.
- `items` JSONB arrays must pass structural validation — non-empty, each item must have `description` + `qty`, and `qty > 0` — enforced by `check_items_json_structure`.
- Waybill `type` field is restricted to `'external'` or `'internal'` — enforced by `check_waybill_type`.
- All document numbering (invoice, quotation, waybill, RFQ, CSR, BOQ, project) MUST follow `docs/STANDARD/prefix-engine-settings-standard.md`. Prefixes are resolved at runtime via `resolvePrefix()` — never hardcode a prefix string in generation logic.
- All document lifecycle operations (edit, duplicate, revert) MUST follow `docs/STANDARD/document-transformation-standard.md`. Prescriptive — defines state-aware edit locking, duplication rules, and invoice-only revert behavior across all document types.
- Lint excludes: `android/` and `dist/` must be excluded via `.eslintignore` or `eslint.config.js` `ignores`.
- New document modules that support JSON import MUST follow `docs/STANDARD/json-import-standard.md`. Prescriptive — all prompts, schemas, adapters, and UI integration must conform.
- New document modules with configurable columns MUST follow `docs/STANDARD/document-column-standard.md`. Prescriptive — all column ordering, persistence, drag, and initialization must conform.
- Extend existing standards in `docs/STANDARD/` before creating new ones — never duplicate a concept a standard already covers.

---

## 3. Project Workflow Rules (Permanent)

- **Audit first.** Before making any code change to a symbol, function, or file, read all relevant source files. Do not infer implementation details.
- **Load skills before coding.** Read `docs/PROJECTSKILLINDEX.md` before any task involving a new domain — see §8.
- **State assumptions explicitly.** If uncertain, ask. If multiple interpretations exist, present them — do not pick silently.
- **Minimum code that solves the problem.** No speculative features, no premature abstractions, no "flexibility" or "configurability" that was not requested.
- **Surgical changes.** Touch only what the task requires. Do not refactor adjacent code, fix formatting, or improve things unrelated to the task. Every changed line must trace directly to the user's request.
- **Verify with tests.** Define success criteria before implementing. Loop until verified.
- **Karpathy discipline applies throughout:** think before coding, simplicity first, goal-driven execution with verifiable success criteria.

---

## 4. Documentation Rules (Permanent)

- **Every completed task requires a report**, saved under `docs/Reports/` in the subfolder that matches its domain. Existing subfolders: `invoice-quote`, `GENERAL`, `WAYBILL`, `boq-rfq`, `CSR`, `ANDROID`, `TOAST`, `item-library`, `json-import`. Check the directory before creating a new one — if a matching domain folder already exists, reuse it. Never place reports in the repository root.
- **Reusable platform standards go in `docs/STANDARD/`.** Module-specific documentation goes in the module's domain directory.
- **Extend existing standards before creating new ones.** If a standard at `docs/STANDARD/` already covers the concept, update it — do not duplicate.
- **Documentation-only tasks must never modify production code.** AGENTS.md and `docs/STANDARD/*` files are the only allowed write targets for doc-only tasks.

---

## 5. File Structure Map

```

src/
├── app/                        App bootstrap (useSyncBootstrap)
├── assets/                     Static assets
├── auth/                       Session error handling
├── components/
│   ├── actions/                Shared action buttons
│   ├── app/                    App-level components (ErrorBoundary, Layout)
│   ├── batch/                  Batch document operations
│   ├── boq/                    BOQ-specific components
│   ├── client/                 Client form/selector components
│   ├── compliance/             Compliance module components
│   ├── csr/                    CSR-specific components
│   ├── dashboard/               Dashboard widgets
│   ├── document/               Document-level reusable components
│   ├── document-view/          Document view components
│   ├── export/                 Export functionality
│   ├── import/                 Import functionality
│   ├── invoice/                Invoice-specific components (mobile, PDF, form primitives)
│   ├── items/                  Item/image components
│   ├── layout/                 Layout primitives
│   ├── list/                   List view components
│   ├── loading/                Loading states
│   ├── notifications/          Notification components
│   ├── pdf/                    PDF renderers (invoice, quotation)
│   ├── pdf-new/                New PDF system
│   ├── project/                Project-specific components
│   ├── query/                  Query components
│   ├── quotation/              Quotation-specific components
│   ├── reports/                Report components
│   ├── rfq/                    RFQ-specific components
│   ├── settings/               Settings panel components
│   ├── table-document/         Table-document shared logic
│   ├── ui/                     Generic UI primitives (Button, Input, Select, Dialog, etc.)
│   ├── unlumen-ui/             Unlumen design system components
│   └── waybill/                Waybill-specific components (form, PDF, gateway, utils)
├── config/                     Module adapters, filter configs, quick tiles
├── context/                    React contexts (DocumentQueryContext)
├── domain/                     Domain logic per module
│   ├── invoice/                Invoice domain (types, columns, calculations, normalize, factory, preview)
│   ├── quotation/               Quotation domain
│   ├── waybill/                 Waybill domain
│   ├── csr/                     CSR domain
│   ├── boq/                     BOQ domain
│   ├── rfq/                     RFQ domain
│   ├── audit/                   Audit domain
│   ├── compliance/              Compliance domain
│   ├── document/                Document conversion, media, relationships
│   └── ...                      project, notifications, table-document, import
├── hooks/                       Custom React hooks (20 hooks)
├── lib/                         Core libraries
│   ├── Calculations.ts          SOURCE OF TRUTH for financial calculations
│   ├── withUniqueRetry.ts       Collision retry utility for document number inserts
│   ├── formatters/              Number/date formatting
│   ├── json/                    JSON utilities
│   ├── cache/                   Caching layer
│   ├── native/                  Native bridge utilities
│   └── ...                      PDF fonts, themes, signatures, icons, audit, utils
├── modules/                     Module-specific logic (invoices, quotations, compliance, item-library)
├── pages/                       Route-level page components (48 files)
├── services/                    External service integrations
├── styles/                      Global CSS
├── supabase/                    Supabase client
├── tests/                       Critical path tests
├── types/                       Shared type definitions
└── utils/                       Utility functions (export compilers, number formatting)

```

---

## 6. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Components | PascalCase | `WaybillForm.tsx`, `ClientSelector.tsx` |
| Files (general) | kebab-case | `waybillUtils.ts`, `mobileFormPrimitives.tsx` |
| DB fields | snake_case | `waybill_number`, `client_id`, `po_number` |
| Document numbers (all types) | `{resolvedPrefix}-{routingToken?}-{6-digit serial}` | Prefix resolved at runtime via `resolvePrefix()`, default `WBL`/`INV`/`QTN`/etc — see `docs/STANDARD/prefix-engine-settings-standard.md`. Never hardcode a prefix. |

---

## 7. Workflow Commands

- **Bun only** — never use npm, yarn, or pnpm.
- **Run `bun run audit:load`** before typecheck or build.
- **PowerShell PATH note:** `C:\Users\DELL\.bun\bin` must appear before Kiro's stub at `AppData\Local\Kiro-Cli\bun` for `bun` to resolve correctly.
- **Test command:** `bun run test` — runs `node --test "src/tests/critical/*.test.js"`.

---

## 8. Skills Registry

Full skill index (locations, absolute paths, niches, ~25 skills + 232 subagents): **`docs/PROJECTSKILLINDEX.md`**. Read it before any task involving a new domain — do not re-derive the list from memory or from this file.

**Loading rules:**
- Load skills from the project directory only — `.agents/skills/`, `.claude/skills/`, `.mimocode/skills/`, `.opencode/agents/`.
- If a skill-loading tool fails or can't find a skill, do not stop — fall back to directly reading the `SKILL.md` at the path listed in the index.
- If a requested skill name doesn't match exactly (typo, truncation, shorthand), match to the closest related skill by name/keyword overlap rather than failing. Example: "superpower" → `using-superpowers`.

---

## 9. Module Status

| Built | In Progress | Pending |
|---|---|---|
| Invoices (pages, modules, domain, components, migration) | Payments (partial — RecordPaymentModal exists, payment flow in spec) | Expense tracking |
| Quotations (pages, modules, domain, components, migration) | Devices (migration exists, no pages) | Profit/loss reporting |
| CSR (pages, components, domain, migration) | Notifications (migration + hooks + components exist) | Attendance tracking |
| Projects (pages, domain, components, migration) | Compliance (pages, components, domain exist) | File uploads |
| Clients (pages, components, domain, migration) | Item catalog (migration + modules exist) | |
| Waybills (pages, components, domain, PDF, migration) | | |
| BOQ (pages, domain exist) | | |
| RFQ (pages, domain exist) | | |
| Waybill blank token audit log (migration, domain) | | |

---

## 10. No-Touch Zones

These files, functions, and constraints must never be modified without explicit written instruction:

| Asset | Reason |
|---|---|
| `src/lib/Calculations.ts` | Single source of truth for all financial calculations |
| `src/lib/Calculations.ts` — `calcTotals()`, `resolveRowVat()` | Core calculation pipelines — changing them affects every financial document |
| `src/domain/prefixConstants.ts` — `DEFAULT_PREFIXES`, `resolvePrefix()` | Canonical prefix engine — changing defaults or resolution logic breaks numbering across all document types |
| DB constraint `check_waybill_purpose_conditional` | Enforces business mutex — external waybills must have purpose, internal must be NULL |
| DB constraint `check_items_json_structure` | Structural JSONB validation — non-empty array, description + qty required, qty > 0 |
| DB constraint `check_waybill_type` | Restricts type to `'external'` or `'internal'` |
| `generateWaybillSequenceNumber()` in waybill domain | Prefix engine — changing format breaks existing waybill numbers |
| Invoice domain `items` to waybill spawn transform | Must strip all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`) |
| `blank_waybill_logs` number reuse protection | Once a blank token number is consumed, it is permanently locked and cannot be recycled |

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **bigdrops-app** (18701 symbols, 41567 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/bigdrops-app/context` | Codebase overview, check index freshness |
| `gitnexus://repo/bigdrops-app/clusters` | All functional areas |
| `gitnexus://repo/bigdrops-app/processes` | All execution flows |
| `gitnexus://repo/bigdrops-app/process/{name}` | Step-by-step execution trace |

## CLI

Sub-skills for GitNexus workflows live in `docs/PROJECTSKILLINDEX.md` under `.claude/skills/gitnexus/` (exploring, impact-analysis, debugging, refactoring, guide, cli). Consult the index rather than duplicating paths here.

<!-- gitnexus:end -->
```

