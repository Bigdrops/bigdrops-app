# UI/UX Consolidation PRD — Summary

> **Read this first.** One-page synthesis of `docs/prd/ui-ux-consolidation/` (22 files). Use it to decide: **modify this PRD or create a new one**.

**Status:** Active, **Design System Selection Pending** · **Progress:** ~30% complete · **Blocker:** D-017/D-018 superseded 2026-08-28 — no design language chosen.

---

## 1. What this PRD is

BIGDROPS (React 19 / TS 5.9 / Tailwind 3.4 / Vite 7 / Supabase) has 10+ document modules, 48 pages, ~690 files. The PRD audits **fragmented UI**:

- 4 form architectures (SharedDocumentForm, custom CSR 861 lines, BOQ/RFQ tabbed, waybill overlay)
- 3 column systems (ColumnConfig, TableDocumentColumn, waybill-specific)
- 25 files >600 lines (worst: ItemLibraryAdvancedCleanupPanel 1038, NewInvoice 872)
- Hybrid tokens: 196 `--bd-*` (formTheme.css) + 30 shadcn HSL + Tailwind config
- No design system selected — Divine Blood was D-017 then superseded.

Goal: single token system, unified forms, dead code removal, polished UX. **No changes to `Calculations.ts` or PDFs.**

---

## 2. Document inventory — what each file does

| File | Role | Freshness |
|---|---|---|
| `README.md` | Executive summary + template gap table (9 templates vs code) | Revised 2026-08-28 — current |
| `00-index.md` | PRD index, success criteria, non-goals, superseded D-017/D-018 | Revised 2026-08-28 |
| `01-findings.md` | 9 findings: New/Edit duplication (~4000 wasted lines), 6× CSS duplication, token sprawl 30% unused, dead code | June 2026 |
| `02-recommendations.md` | 9 recommendations R1-R9 (unify pages, consolidate CSS, prune tokens, remove App.css, sidebar choice) | June 2026 |
| `03-roadmap.md` | 5-phase roadmap (Ph1 token migration BLOCKED, Ph2 visual BLOCKED, Ph3 quick wins, Ph4 arch, Ph5 polish) 8-10 days | Revised 2026-08-28 |
| `04-architecture.md` | Target architecture after R1-R9 (single FormPage per module, shared CSS, shadcn sidebar) | — |
| `08-decisions.md` | Decision log D-001 to D-018 (16 accepted, 2 superseded Divine Blood) | 2026-08-28 |
| `09-progress.md` | **Ground truth:** verified against codebase — 30% done, table of done/not-started | **2026-08-28 — most reliable** |
| `11-implementation-roadmap.md` | Master 34-task plan with dependency graph + 10 prompt templates | June 2026 |
| `architecture-inspection.md` | 185-line deep inspection (form divergence, column divergence, domain deps, dead code, oversized list, PDF diversity) | June 2026 |
| `component-inventory.md` | Catalog: 400+ components, 30 UI primitives, 33 view components, 49 pages, module breakdown + dead list | June 2026 |
| `design-system-roadmap.md` | Token migration plan (pending stakeholder pick) — still references Divine Blood `--db-*` in Phase 1/2 despite superseded | Needs update |
| `migration-plan.md` | 6-month Clean→Consolidate→Componentize plan (dead code → CSR → primitives) | June 2026 |
| `priority-matrix.md` | 16 issues ranked into Quick Wins / Major / Fill-ins / Strategic, effort in dev-days (~54 total) | June 2026 |
| `issue-tracker.md` | 16 issues (K1-K11 + D1-D5) with status: 3 fixed, 2 partial, 2 valid bugs (sign-out, column lock) | June 2026 |
| `07-testing-checklist.md` etc. | Testing, product-inspection, platform-recommendations, reui matrices | Supporting |

**Duplicates / drift you should know:**

- **3 roadmaps** overlap: `03-roadmap.md` (5 phases, 8-10d), `11-implementation-roadmap.md` (34 tasks, 11d), `migration-plan.md` (6 months). They use different phase numbers and task IDs (Q-01 vs K4).
- `design-system-roadmap.md` + `11-implementation-roadmap.md` Phase 0 still hardcode Divine Blood (`--db-*`, ink/gold/crimson) even though `00-index.md:12` says stakeholder TBD and D-017 superseded.
- `09-progress.md` contradicts older roadmaps — it is the only file verified against live code (use it as source of truth).

---

## 3. Findings in one table

| ID | Problem | Impact |
|---|---|---|
| F1 | New/Edit pairs duplicate ~800 lines ×6 modules | High — 4000 lines waste |
| F2 | 6× identical CSS modules (`{Type}ViewPage.module.css`) | Medium |
| F3 | `formTheme.css` 196 vars, ~30% unused (`--bd-shadow-*`) | Medium |
| F4 | `App.css` stale Vite boilerplate | Low |
| F5 | Two sidebars — `ui/sidebar.tsx` 715 lines unused | Medium |
| F6–F9 | No column hooks for Waybill/Quotation/CSR, SortableLineItem invoice-only, `appendChild` not `createPortal`, mobile primitives under `invoice/` | Low |

---

## 4. Decisions D-001 → D-018

Accepted (16): CSR Switch standard, RichText toolbar, Sidebar001, FilterButton001, FloatingDisclosure FAB, CSR picker universal, SharedDocumentForm for CSR, two-step sign-out, sticky column, reduced-motion, 3-phase CSS, single token source, dead-component candidates, InputGroup/ButtonGroup, column locking, safe areas.

Superseded (2): **D-017 Divine Blood, D-018 Delete themes → Light/Dark** — replaced with “TBD — stakeholder picks” on 2026-08-28.

---

## 5. Progress — what is actually done (09-progress.md:15 verified)

**Done (30%):**
- Dead code: `App.css`, `Dashboard.tsx` (0 lines), `ui/sidebar.tsx`, `FormNavigation*` — deleted
- Primitives: `button-group.tsx`, `input-group.tsx` — created
- New/Edit unified: Invoice, Waybill, Quotation, CSR → `*FormPage.tsx` stubs (BOQ/RFQ still separate)
- Reduced-motion added in 4 files, sign-out confirmation in 4/6 places

**Not started / blocked:**
- Design tokens: 5 tasks blocked on stakeholder pick (UX-020 → UX-024)
- Quick wins: sign-out in MobileSidebar, sticky business context, drag handle 44×44, sortable UI
- Architecture: column hooks, portal standard, CSS 6→1, BOQ/RFQ unification
- Polish: route transitions, safe-area, aria-live

Overall: `09-progress.md:113` — 30% done, critical blocker is design choice.

---

## 6. Roadmaps — which to trust

Use `09-progress.md` as current truth + `03-roadmap.md` dependency graph:

```
Ph1 tokens BLOCKED → Ph2 visual BLOCKED
Ph3 quick wins (no deps) → CAN PROCEED NOW
Ph4 architecture (no deps) → CAN PROCEED NOW
Ph5 polish → depends on Ph3+4
```

Ignore the “Divine Blood” steps in `design-system-roadmap.md:61` and `11-implementation-roadmap.md` Phase 0 until a system is chosen — they will create rework.

Total effort estimates conflict: 8-10d (`03`) vs 54d (`priority-matrix`) vs 6 months (`migration-plan`) — because scope differs (token-only vs full consolidation).

---

## 7. Issue tracker snapshot (16 issues)

Fixed: K1 rich-text wrap, K2 filter redesign, K3 part-no inference. Partial: K8 sidebar scroll, K9 mobile drag. Valid bugs to fix now: **K4 sign-out confirmation (`MobileSidebar.tsx`)**, **K5 column lock (`data-grid/`)**. Needs UI: K6 sortable columns. Intentional: K10 dashboard tiles not FAB.

5 discovered: D1 CSR outlier, D2 reduced-motion, D3 25 oversized files, D4 dead components, D5 no page transitions.

---

## 8. Recommendation — modify vs new PRD

**Do not create a new PRD.** The audit is still valid; creating a new one duplicates ~600 lines of inspection.

**Modify this PRD — 3 small edits:**

1. **Fix the 3 roadmaps:** Merge `03-roadmap.md` + `11-implementation-roadmap.md` + `migration-plan.md` into one canonical roadmap (use `03-roadmap.md` structure, keep `11` prompt templates as appendix). Delete Divine Blood specifics until pick is made.
2. **Update `design-system-roadmap.md`:** Replace `--db-*` / Divine Blood references with “Chosen system — TBD” placeholder, keep Phase 1 tasks generic (token mapping → replace → delete `formTheme.css`).
3. **Make `09-progress.md` the index:** Add it to `README.md` document inventory and link `00-index.md` success criteria to its status table so future updates have one place to change.

If you prefer a fresh start, fork `09-progress.md` + `README.md` + `08-decisions.md` into a **“PRD v2 — Colour-Only”** with only colour-token scope (your current ask) and archive the Divine Blood docs under `prd/archive/`.

---

*Generated 2026-08-28 for decision review. Full evidence in `docs/prd/ui-ux-consolidation/` cited above.*
