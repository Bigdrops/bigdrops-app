# Tech Debt and Architectural Drift Audit Report

This report was written by Buffy on 2026-09-08 via Freebuff.

- Skills used: supabase-postgres-best-practices, typescript-advanced-types
- Documentation standard: ASD-STE100 Simplified Technical English
- Subagent used: NONE (the prompt's `@code-reviewer`, `@software-architect`,
  `@devops-automator`, `@security-architect`, `@performance-benchmarker`
  personas do not exist in this harness. Their roles were mapped onto the
  repository's own audit tooling and static analysis.)

---

## Executive Summary

The application core is healthy and disciplined. The accounting foundation,
financial rules, multi-tenancy, and standards documentation are strong. The
main weakness is the repository shell around that core.

Eleven audit themes were examined. Six carry high severity:

| # | Finding | Severity |
| :--- | :--- | :--- |
| 1 | Repository debris and junk files tracked in git | High |
| 2 | Dead and duplicated dependencies in `package.json` | High |
| 3 | No pull-request CI for code quality gates | High |
| 4 | `tsconfig` runs with `strict: false` | High |
| 5 | Stale tracked database dump of the live schema | Medium-High |
| 6 | Test suite: 3 files fail at import; coverage is convention-only | Medium-High |
| 7 | Untracked build/debris directories on disk slow every tool | Medium |
| 8 | `eslint` scans 14k+ documentation files and times out | Medium |
| 9 | `.NET backend/` and `api/` drift leftovers | Medium |
| 10 | Branding inconsistency (`goey-toast` vs `sonner`) | Medium |
| 11 | Standards drift and documentation gaps | Low-Medium |

The remediation plan puts hygiene first (quick wins), then type safety and
tests, then architectural consolidation.

---

## Detailed Findings

### 1. Repository debris tracked in git — HIGH

Direct evidence (all tracked in the index):

| Path | Problem |
| :--- | :--- |
| `dev/null` | A file named after the POSIX null device. |
| `tsconfig.tsbuildinfo` | Build cache. Belongs in `.gitignore`. |
| `scratch.cjs.txt` | Scratch file. |
| `temp-investigation.sql` | Temporary investigation file. |
| `waybill_diff.txt` | Working diff text. |
| `live-db-recovery-2026-08-09.sql` | Tracked and **completely empty (0 lines)**. |
| `inspect-remediation-migration.mjs`, `measure_pdf.js`, `measure_pdf.py`, `query_audit.mjs`, `commit-docs.ps1` | One-off utilities at root instead of `scripts/` or `tools/`. |
| `scratch/` (tracked scripts) | Investigation scripts at root scope. |

`tmp-purge/` contains three SQL files (`q01_public_before.sql`,
`q02_tenant_before.sql`, `q03_pubfunc_classification.sql`) — tracked
investigation artifacts named "purge".

Root cause: ad-hoc debugging sessions committed from the repo root with no
pre-commit hygiene gate.

### 2. Dead and duplicated dependencies — HIGH

`package.json` has 89 dependencies and 20 devDependencies. Verified usage
counts are files under `src/` that import each package:

| Package (group) | Usage | Verdict |
| :--- | :--- | :--- |
| `sonner` (toast library) | 0 imports | Dead. The project's toast is `goey-toast` (3 files). |
| `cuelume` | 0 imports | Dead. Unknown/possibly nonexistent package. |
| `@dietrichgebert/ponytail` | 0 imports | Dead. |
| `takumi-pdf`, `@takumi-rs/helpers` | 0 imports | Dead despite deep POC work on Takumi in `docs/`. |
| `@formepdf/*` (2 packages) | 0 imports | Dead today; PDF POC vendor files reference it in docs only. |
| `motion` + `framer-motion` | `motion` 0; `framer-motion` 1 file | Duplicated animation stacks; keep one. |
| `shadcn` (the CLI package) | 3 files matched by name | Almost certainly a devDependency or removal candidate; it is a build-time CLI, not runtime. |
| `email` | 4 files | Suspicious: `email` on npm is an unrelated placeholder package. Verify the import shape. |
| `@fontsource/*` — 24 families declared | 13 families imported | 11+ font families dead (caveat, handlee, kalam, patrick-hand, reenie-beanie, sue-ellen-francisco, roboto variants partially used, etc.). |
| `@lobehub/icons` vs `react-icons` vs `lucide-react` vs `@hugeicons/*` | 1 / 2 / 194 / 5 files | Four icon systems in one app. `lucide-react` dominates. |
| `sonner` toast vs `goey-toast` | see above | Branding inconsistency: two toast libraries. |

Root cause: dependency additions without a removal pass; AI-assisted
experimental installs (PDF engines, font families) never cleaned up.

Note on `@formepdf/*` and `takumi-pdf`: the Gap 1 session confirmed the
`docs/Reports/pdf/poc/` POC references `@formepdf/react`. The packages are
unused in `src/` today. Keep them only if the PDF POC is active.

### 3. No pull-request CI for code — HIGH

`.github/workflows/` has two workflows:

- `build-android-debug.yml` — manual (`workflow_dispatch`) APK build only.
- `docs-commit.yml` — commit-message format + secret scan on `docs/**` paths.

No workflow runs `bun run typecheck`, `bun run lint`, or `bun run test` on
pull requests. Every quality gate relies on local discipline and AI-agent
verification steps.

Root cause: the project evolved with AI agents and a solo lead; CI was built
for docs governance, not code governance.

### 4. `tsconfig` runs with `strict: false` — HIGH

`tsconfig.json`: `"strict": false`, `skipLibCheck: true`.

AGENTS.md requires TypeScript 5.9 discipline, and `bun run typecheck` passes
precisely because the strict rules that catch real bugs (null checks,
`noImplicitAny`) are disabled. 788 non-test TS/TSX source files carry
implicit-any risk.

Root cause: strictness was never enabled as the codebase grew; enabling it
late requires a migration.

### 5. Stale tracked database dump — MEDIUM-HIGH

`live-public-schema.sql` (6,447 lines) is a `pg_dump --schema-only` snapshot
of the hosted database committed at the root. It duplicates `supabase/
migrations/` (58 migrations) and is already stale.

Security review: no credentials leaked. Matches are GRANT statements to
`service_role`/`anon`/`authenticated` role names and a `has_password` column
name. No `CREATE ROLE`, no `COPY` data, no secrets.

Risk: schema-authority confusion (dump vs migrations), and repo weight.

Root cause: incident recovery workflow (see `live-db-recovery-2026-08-09.sql`,
now empty) left its snapshot committed.

### 6. Test suite health — MEDIUM-HIGH

- `bun run test`: 28 test files; **3 fail** at import time with
  `TypeError: Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')`.
  Root cause: those tests transitively import `src/supabase.ts`, which reads
  `import.meta.env` (undefined under plain node). Verified pre-existing.
- Coverage is by-convention only: 29 critical tests for 788 source files.
- `bun run lint` exits with code 143 (SIGTERM — killed by timeout) and
  reports nothing. Lint is currently unusable as a gate.

Root cause: tests import service modules that instantiate the Supabase
client at module scope; the test loader does not provide Vite env
injection.

### 7. Untracked on-disk debris — MEDIUM

On-disk (untracked or ignored) directories that slow scans and endanger
agents:

- `docs/templates/` — contains a full cloned template repository including
  its own `.gitignore` (`docs/templates/react-temps/reui/.gitignore`
  exists on disk). Large tree, not tracked.
- `temp-build/` — 4 tracked woff files; more on disk. Build artifacts.
- `tmp-purge/`, `scratch/`, `attached_assets/`, `dist-test/`.
- `tsconfig.tsbuildinfo` tracked; `dist/` correctly ignored.

`git count-objects`: pack size 84.92 MiB. `git ls-files` ≈ 15,000 tracked
files, of which 14,279 are `docs/**` (mostly PRD/markdown).

Root cause: no policy for transient directories; `git clean` is forbidden
by AGENTS.md concurrent-agent rules, so debris persists.

### 8. `eslint` scope — MEDIUM

`eslint.config.js` ignores 13 dot-directories and `dist`/`android`, but not
`docs/`, `tmp-purge/`, `scratch/`, `attached_assets/`, `temp-build/`,
`dist-test/`. With 14k+ docs files (many containing JS/HTML code blocks and
HTML design files), `bun run lint` cannot finish within 170 seconds.

Root cause: the docs tree grew (PRD sets, NRS gazette, references, templates)
without a lint-scope adjustment.

### 9. `.NET backend/` and `api/` drift — MEDIUM

- `backend/` — 44 tracked files of a C#/.NET API (`BigDrops.Api.csproj`,
  MediatR-style handlers). The stack is React 19 + Supabase + Vercel.
  Zero references from `src/`. This is a former architecture, not part of
  the product. It is feature drift.
- `api/` — two Vercel-style TS functions (`upload-payment-attachment.ts`,
  `edit-payment-caption.ts`) with their own tsconfig extending the root.
  Unclear whether deployed (Vercel routes `/api/(.*)` → `/api/$1` exists in
  `Vercel.json`). Keep if deployed; otherwise archive.

Root cause: architecture transitions left the predecessor in-tree.

### 10. Branding inconsistency — MEDIUM

`goey-toast` is the toast library used by `src/main.tsx`,
`src/components/ui/toaster.tsx`, and `src/lib/feedback.ts`. `sonner` is
installed but unused. There is also `ask-sonner` skill guidance in the
skills index. Pick one toast library and standardize.

Root cause: library swap was started (install new, remove old) but the
removal half never happened — or the naming is a deliberate fork/alias; if
`goey-toast` is a rebrand of `sonner`, document it.

### 11. Standards drift and documentation gaps — LOW-MEDIUM

- `Vercel.json` is capitalized; convention is lowercase `vercel.json`
  (cosmetic, Windows-insensitive).
- `Jsconfig.json` capitalized alongside `tsconfig.json` — same.
- Two worktrees of guidance exist: AGENTS.md + CLAUDE.md + README + 15
  standards docs. Some duplication risk (AGENTS.md duplicates the
  Calculation rules that `docs/standard/` also governs). Keep one normative
  chain.
- The `bun run test` import-env failure is known but not recorded in a
  standard or README.

---

## What Is Healthy (do not treat as debt)

- Financial integrity chain: `Calculations.ts` as single source of truth,
  deprecated `calcTotals`/`resolveRowVat` documented, PDF renderers receive
  prepared data.
- Accounting foundation: balanced-posting kernel with trigger-enforced
  invariants, NUMERIC(18,2) money, entity-scoped RLS, reconciliation and
  remediation increments, and the new Gap 1 read-only reporting RPC with 25
  passing contract tests.
- Supabase workflow: 58 numbered migrations, template-clone provisioning,
  documented database workflow, pgrst reload convention.
- Secret hygiene: `.env` untracked, CI secret scan exists, no service-role
  keys in `src/`, no dangerouslySetInnerHTML in scanned hot paths, no
  credentials in tracked SQL dumps.
- Documentation culture: 15,000 tracked docs files, PRD discipline,
  per-task reports.

---

## Phased Remediation Roadmap

### Phase 1 — Quick wins (1–2 days total)

| # | Action | Effort | Validation metric |
| :--- | :--- | :--- | :--- |
| 1.1 | Remove tracked junk: `dev/null`, `tsconfig.tsbuildinfo`, `scratch.cjs.txt`, `temp-investigation.sql`, `waybill_diff.txt`, empty `live-db-recovery-2026-08-09.sql`; gitignore `*.tsbuildinfo` | 0.5 h | `git ls-files` no longer lists them; typecheck unaffected |
| 1.2 | Move `inspect-remediation-migration.mjs`, `query_audit.mjs`, `measure_pdf.*`, `commit-docs.ps1` into `scripts/` or `tools/`; move `scratch/` under `docs/` or delete | 1 h | Root contains only intentional top-level entries |
| 1.3 | Add `docs/`, `tmp-purge/`, `scratch/`, `attached_assets/`, `temp-build/`, `dist-test/` to `eslint.config.js` `globalIgnores` | 0.5 h | `bun run lint` completes with code 0/1 within 120 s |
| 1.4 | Remove dead deps: `sonner` (or `goey-toast`, pick one), `cuelume`, `@dietrichgebert/ponytail`, `takumi-pdf`, `@takumi-rs/helpers` | 0.5 h | `bun install` clean; typecheck+tests pass |
| 1.5 | Decide `@formepdf/*`: keep with a documented POC note, or remove until needed | 0.5 h | Decision recorded in `docs/reports/` |
| 1.6 | Prune unused `@fontsource/*` families (keep the 13 imported) | 1 h | `package.json` diff reviewed; build unaffected (memory policy: verify via typecheck) |

### Phase 2 — Refactors (1–2 weeks)

| # | Action | Effort | Prerequisite | Validation metric |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | Fix the 3 failing test files: mock `@/supabase` (or lazy-init) so tests do not hit `import.meta.env`; unblock CI | 0.5–1 d | — | `bun run test` 28/28 files pass |
| 2.2 | Add PR CI: typecheck + lint + test on `pull_request` (Bun setup, node 22) | 0.5 d | 2.1 (tests green) | Workflow green on a sample PR |
| 2.3 | Consolidate animation stack: keep `framer-motion` (1 usage) or `motion`; remove the other | 0.5 d | — | Typecheck passes; no dual imports |
| 2.4 | Consolidate icon systems: standardize on `lucide-react` (194 files); migrate 2 `react-icons` + 5 `@hugeicons` files; drop `@lobehub/icons` | 2–3 d | — | One icon dep remains |
| 2.5 | Standardize toast: pick `goey-toast` or `sonner`; delete the other + fix 3 import sites | 0.5 d | — | Single toast import path |
| 2.6 | Verify `shadcn` and `email` deps: confirm real import shape or remove; move CLI packages to devDependencies | 0.5 d | — | `package.json` reviewed and documented |
| 2.7 | Remove or archive `backend/` (.NET) after lead sign-off; keep under `docs/reference/` if wanted as historical | 0.5 d | Lead decision | `git ls-files backend/` = 0 |
| 2.8 | Decide `api/` (deployed or not): document in README or remove + drop the Vercel rewrite | 0.5 d | Lead decision | README or removal recorded |
| 2.9 | Relocate `live-public-schema.sql` out of git (host or `docs/reference/` note); add dump-refresh procedure doc | 0.5 d | — | Root no longer carries a DB dump |
| 2.10 | Enlarge the critical test layer beyond 29 files: target financial, PDF, and waybill contract surfaces first | 1–2 wk | 2.1 | Test count documented in reports |

### Phase 3 — Architectural upgrades (1–3 months)

| # | Action | Effort | Validation metric |
| :--- | :--- | :--- | :--- |
| 3.1 | Strictness migration: enable `strict` incrementally per directory (start `src/domain/`, `src/lib/`, `src/modules/`), finish with `strict: true` | 2–6 wk | `tsc --noEmit` with `strict: true` exits 0 |
| 3.2 | Split oversized pages (25 files over the 600-line limit; e.g. `QuotationFormPage.tsx` 775 lines; `WaybillFormPage.tsx` limit 1000) | 2 wk | `audit:load` reports 0 oversized files |
| 3.3 | Bundle budget: add `manualChunks` for pdf/react-pdf/radix vendors; evaluate build output once (manual, per memory policy) | 1 wk | Chunk report documented |
| 3.4 | Dependency governance: monthly `bun outdated` review + removal pass; document in `docs/standard/` | 0.5 d setup | Standard file exists |
| 3.5 | Clean up `docs/templates/` on disk and the untracked template clones; add a transient-dirs policy to AGENTS.md | 0.5 d | No template clones under `docs/` |
| 3.6 | Reconcile `goey-toast` naming with the skills index (`ask-sonner`) so guidance matches the stack | 0.5 d | Skill index note updated |

### Prevention Guidelines

1. **Hygiene gate:** add a tiny CI step that fails on new root-level
   scratch files (`*.txt`, `*.sql` dumps, `dev/null`, `.tsbuildinfo`).
2. **Dependency rule:** no dependency lands without a same-PR usage; the
   monthly review removes what lost its consumer.
3. **CI rule:** code PRs run typecheck + lint + test; docs PRs keep the
   existing message/secret checks.
4. **Transient-dirs policy:** name transient directories `tmp-*`, list them
   in `.gitignore` and eslint `globalIgnores` at creation; never commit
   database dumps.
5. **Strictness ratchet:** new directories opt into `strict` before their
   first merge; never lower the ratchet.
6. **Standards single-source:** extend `docs/standard/` before adding
   guidance to AGENTS.md or README (AGENTS.md rule 10 already requires
   this; enforce it).

---

## Verification of This Audit's Own Steps

- `git status` captured before and after; no pre-existing change touched.
- Evidence commands were read-only (grep, ls, git ls-files, du).
- `bun run audit:load` run: 791 files scanned; 25 oversized; findings
  quoted verbatim in this report.
- `bun run typecheck` not re-run as part of the audit (no code changed by
  the audit; last run in this session: passed).
- `bun run lint` executed: killed by timeout (code 143) — recorded as a
  finding, not fixed (out of audit scope).
- `bun run build` not run, per the hardware policy.
