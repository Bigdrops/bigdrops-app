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
- Quotations must reuse the invoice domain layer — never duplicate logic.
- PDFs are dumb renderers — they receive shaped data via preview functions but never compute prices, taxes, or totals.
- No Tailwind v4 syntax — project is on Tailwind CSS v3.4.
- No framer-motion — the dependency exists but is not used in production components.
- Waybill numbers follow the prefix engine: `[PREFIX]-[M?][E|I]-[000000]` (e.g., `AWB-E-000001`, `AWB-ME-000001`).
- `purpose` field is NULL for internal waybills — enforced by a Postgres CHECK constraint.
- `items` JSONB arrays must pass structural validation — non-empty, each item must have `description` + `qty`, and `qty > 0`.
- Invoice numbering format: extract from migration `20260520090003_invoices.sql`.
- Waybill type field: `'external'` or `'internal'` — validated by DB CHECK constraint.
- Lint excludes: `android/` and `dist/` must be in `.eslintignore` (or ESLint config ignores).
- New document modules that support JSON import MUST follow the standard defined in `docs/json-import-standard.md`. This standard is prescriptive — all prompts, schemas, adapters, and UI integration must conform.

---

## 3. File Structure Map

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
│   ├── dashboard/              Dashboard widgets
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
│   ├── quotation/              Quotation domain
│   ├── waybill/                Waybill domain
│   ├── csr/                    CSR domain
│   ├── boq/                    BOQ domain
│   ├── rfq/                    RFQ domain
│   ├── audit/                  Audit domain
│   ├── compliance/             Compliance domain
│   ├── document/               Document conversion, media, relationships
│   └── ...                     project, notifications, table-document, import
├── hooks/                      Custom React hooks (20 hooks)
├── lib/                        Core libraries
│   ├── Calculations.ts         SOURCE OF TRUTH for financial calculations
│   ├── formatters/             Number/date formatting
│   ├── json/                   JSON utilities
│   ├── cache/                  Caching layer
│   ├── native/                 Native bridge utilities
│   └── ...                     PDF fonts, themes, signatures, icons, audit, utils
├── modules/                    Module-specific logic (invoices, quotations, compliance, item-library)
├── pages/                      Route-level page components (48 files)
├── services/                   External service integrations
├── styles/                     Global CSS
├── supabase/                   Supabase client
├── tests/                      Critical path tests
├── types/                      Shared type definitions
└── utils/                      Utility functions (export compilers, number formatting)
```

---

## 4. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Components | PascalCase | `WaybillForm.tsx`, `ClientSelector.tsx` |
| Files (general) | kebab-case | `waybillUtils.ts`, `mobileFormPrimitives.tsx` |
| DB fields | snake_case | `waybill_number`, `client_id`, `po_number` |
| Invoice numbers | Extract from migration | Format defined in `20260520090003_invoices.sql` |
| Waybill numbers | `AWB-E-000001`, `AWB-ME-000001` | External: `[PREFIX]-E-[SERIAL]`, Manual: `[PREFIX]-ME-[SERIAL]` |

---

## 5. Skills Registry

### `.agents/skills/` — General Engineering & Frontend Skills

| # | Skill | Niche |
|---|---|---|
| 1 | `accessibility` | WCAG 2.2 compliance, a11y audits, screen reader support, keyboard navigation, color contrast, ARIA patterns |
| 2 | `deploy-to-vercel` | Deploying apps to Vercel — CLI auth, git push deploys, preview URLs, team selection, no-auth fallbacks |
| 3 | `frontend-design` | Distinctive, production-grade UI — anti-"AI slop" aesthetics, creative typography, color, motion, spatial composition |
| 4 | `pdf-rendering-correctness` | Invoice PDF pipeline — parent invoice as single source of truth, prevents data mutation in render layers, advance invoice rules |
| 5 | `seo` | Technical SEO — meta tags, structured data (JSON-LD), sitemaps, URL structure, mobile SEO, hreflang |
| 6 | `shadcn` | shadcn/ui — CLI usage, component composition, form patterns, icon handling, styling rules, registry management |
| 7 | `supabase-postgres-best-practices` | Postgres performance — indexing, connection pooling, RLS, schema design, locking, monitoring, query optimization |
| 8 | `tailwind-css-patterns` | Tailwind CSS utility-first styling — responsive design, flexbox/grid, dark mode, component extraction, performance, a11y |
| 9 | `tailwind-v4-shadcn` | Tailwind v4 + shadcn/ui — `@theme inline`, CSS variable architecture, dark mode with ThemeProvider, plugin directives, migration from v3 |
| 10 | `typescript-advanced-types` | Advanced TypeScript — generics, conditional types, mapped types, template literals, type-safe patterns |
| 11 | `vercel-composition-patterns` | React composition — compound components, avoiding boolean prop proliferation, context providers, React 19 APIs |
| 12 | `vercel-react-best-practices` | React/Next.js performance — eliminating waterfalls, bundle optimization, server-side perf, re-render optimization (70 rules, 8 categories) |
| 13 | `vite` | Vite build tool — config, plugin API, SSR, library mode, Vite 8 Rolldown migration, Environment API |
| 14 | `react-pdf` | Generate PDF documents using React-PDF library (@react-pdf/renderer) |
| 15 | `redesign-existing-projects` | Upgrades existing websites and apps to premium quality — audits current design, identifies generic AI patterns, applies high-end design standards |

### `.claude/skills/` — Higher-Order & Meta Skills

| # | Skill | Niche |
|---|---|---|
| 1 | `awesome-claude-skills` | Collection of 30+ sub-skills — artifacts-builder, brand-guidelines, canvas-design, changelog-generator, content-research-writer, domain-name-brainstormer, file-organizer, image-enhancer, invoice-organizer, lead-research-assistant, mcp-builder, meeting-insights-analyzer, skill-creator, slack-gif-creator, tailored-resume-generator, theme-factory, twitter-algorithm-optimizer, video-downloader, webapp-testing, and more |
| 2 | `Karpathy` | Coding discipline — think before coding, simplicity first, surgical changes only, goal-driven execution with verifiable success criteria |
| 3 | `skill-creator` | Meta-skill — SKILL.md structure, bundled resources (scripts/references/assets), progressive disclosure, packaging & validation |
| 4 | `ui-ux-pro-max` | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 13 tech stacks, searchable design system generator with Python CLI |
| 5 | `webapp-testing` | Web app testing with Playwright — browser automation, screenshot capture, server lifecycle management, element discovery, console logging |
| 6 | `using-superpowers` | Meta-skill: establishes how to find and use skills — requires Skill tool invocation before ANY response; skill priority, red flags, instruction hierarchy |
| 7 | `gitnexus` | 6-sub-skill collection — codebase impact analysis, debugging, refactoring, exploring (architecture), CLI commands, and reference guide for GitNexus code intelligence |

### `.mimocode/skills/` — Specialized Agent Skills

| # | Skill | Niche |
|---|---|---|
| 1 | `waybill-template-debug` | Debug waybill PDF template rendering issues — validates template structure, tests edge cases, ensures correctness |

---

## 6. Module Status

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

## 7. Workflow Rules

- **Bun only** — never use npm, yarn, or pnpm.
- **Run `bun run audit:load`** before typecheck or build.
- **Read relevant SKILL.md files** before writing any code for a domain the skill covers.
- **PowerShell PATH note:** `C:\Users\DELL\.bun\bin` must appear before Kiro's stub at `AppData\Local\Kiro-Cli\bun` for `bun` to resolve correctly.
- **Lint excludes:** `android/` and `dist/` are excluded from ESLint via `.eslintignore` (deprecated) or `eslint.config.js` `ignores` property.
- **Test command:** `bun run test` — runs `node --test "src/tests/critical/*.test.js"`.

---

## 8. No-Touch Zones

These files, functions, and constraints must never be modified without explicit written instruction:

| Asset | Reason |
|---|---|
| `src/lib/Calculations.ts` | Single source of truth for all financial calculations |
| `src/lib/Calculations.ts` — `calcTotals()`, `resolveRowVat()` | Core calculation pipelines — changing them affects every financial document |
| DB constraint `check_waybill_purpose_conditional` | Enforces business mutex — external waybills must have purpose, internal must be NULL |
| DB constraint `check_items_json_structure` | Structural JSONB validation — non-empty array, description + qty required, qty > 0 |
| DB constraint `check_waybill_type` | Restricts type to `'external'` or `'internal'` |
| `generateWaybillSequenceNumber()` in waybill domain | Prefix engine — changing format breaks existing waybill numbers |
| Invoice domain `items` to waybill spawn transform | Must strip all monetary values (`unit_price`, `rate`, `vat`, `discount`, `subtotal`, `grand_total`) |
| `blank_waybill_logs` number reuse protection | Once a blank token number is consumed, it is permanently locked and cannot be recycled |

---

## Open Questions

- Invoice number format: not determined from available sources — extract from `20260520090003_invoices.sql` migration if needed.

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

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
