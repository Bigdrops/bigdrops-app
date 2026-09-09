# UI/UX PRD Comparison Report

This report was written by Buffy on 2026-09-09 via Freebuff.

---

## Objective

Compare the two UI/UX PRDs in `docs/prd/`. State how they relate, where they differ, and what needs reconciliation.

## Scope

Two documents:

- `docs/prd/ui-ux-consolidation/README.md` — UI/UX Consolidation PRD
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/00-index.md` — Adaptive Mobile-First UIUX Facelift PRD

Supporting context came from the Facelift PRD's `01-design-vision.md` and `14-implementation-roadmap.md`. No source code was read. No code changes were made.

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

Files changed: ONE new file.

- `docs/reports/ui-ux/ui-ux-prd-comparison-report.md` (this file)

## Comparison

### Summary Table

| Dimension | UI/UX Consolidation PRD | Adaptive Mobile-First Facelift PRD |
|-----------|------------------------|-------------------------------------|
| Core question | How do we clean up the code to get there? | What should BIGDROPS look and feel like? |
| Nature | Audit + cleanup roadmap (current state) | Design specification (target state) |
| Status | Active — Design System Selection Pending | Active — Foundation Established |
| Date | August 2026 (revised 2026-08-28) | 2026-08-28 |
| Size | 9 documents (README + 8) | 25+ documents (00-22, Design.md, Waterfall roadmap, tickets, Design-direction HTML) |
| Content style | Findings-based: 4 form architectures, 3 column systems, 25 oversized files, dead code list, 11 user issues verified | Decision-based: locked decisions table, theme contract, locked palette, canonical HTML mockups |
| Design system | `--bd-*` tokens + shadcn HSL = current; source of truth TBD | Slate-navy locked (light `#f0f4f8`/`#1e3a5f`, dark `#0f172a`/`#60a5fa`), Manrope + DM Mono |
| Mobile view | Describes current responsive state: `md:` breakpoint, dual sidebar, MobileBottomNav, mobile variants only for invoice/waybill | Prescribes target: phone-first, bottom nav 5-tab on phone and tablet, desktop as adaptive tier |
| Key artifacts | issue-tracker, migration-plan, priority-matrix, component-inventory | `mobile-dashboard-v6.html` (canonical), Design.md (theme contract), phased roadmap |
| Motion/accessibility | Diagnoses gaps: 3 Framer Motion components, 1 `prefers-reduced-motion` use, no aria-live | Specifies the bar: 44px touch targets, functional motion only, WCAG through a dedicated doc and skills |
| Blocking direction | Blocked on Facelift token/theme choices (Phase 0 gate 0.1-0.7) | Not blocked — can keep specifying independently |

### Relationship Between the Two PRDs

The Facelift PRD names the Consolidation PRD as its companion. The dependency flow (Facelift `14-implementation-roadmap.md`):

```text
Facelift PRD (design direction)  ──blocks──▶  Consolidation PRD (code cleanup)
Phase 0: design decisions locked            Phase 0-1: token cleanup
Phase 1: tokens defined                     Phase 1.4-1.5: replace HSL + --bd-*
```

Both PRDs say: do NOT merge them. The Consolidation PRD documents the current mess (690 files, 4 form architectures, dead `ui/sidebar.tsx` at 715 lines). The Facelift PRD defines what replaces it.

### Discrepancies Found

1. Design-system status conflict. The Consolidation README says "No design system selected yet — stakeholder must choose". The Facelift PRD has locked slate-navy, Manrope + DM Mono, and the v6 dashboard. Both documents carry the date 2026-08-28. The Consolidation README needs an update to reflect the Facelift's locked decisions. Alternatively, "design language" in the Consolidation README may mean a broader choice (shadcn vs custom components) than the Facelift's palette and typography.
2. Broken cross-reference. The Facelift PRD links to `../ui-ux-consolidation/00-index.md`. That file does not exist. The Consolidation PRD entry point is `README.md`. The same broken link appears in `01-design-vision.md` context and `14-implementation-roadmap.md`.
3. Structural inconsistency. The Facelift PRD uses the numbered `00-index.md` convention. The Consolidation PRD uses `README.md`. This breaks clean cross-linking between the two.

### Conclusion

The Facelift PRD is the "what" (design law, mostly locked). The Consolidation PRD is the "how" (audit of current defects + migration plan, waiting on design tokens). They stay separate by design. The main follow-up action is to reconcile the Consolidation README's "design system TBD" status with the Facelift's locked slate-navy decision.

## Similarities

This section uses a deeper read: `issue-tracker.md`, `priority-matrix.md`, `migration-plan.md` (Consolidation), plus the full `14-implementation-roadmap.md` and `Waterfall-roadmap.md` (Facelift).

| Shared element | Consolidation (older) | Facelift (newer) |
|---|---|---|
| Phased roadmap with gates | 3 phases: Clean, Consolidate, Componentize; exit criteria per phase | 10 phases (0-9) over 20 weeks; gate per phase |
| Token migration | Audits `--bd-*` (196 definitions) + shadcn HSL; plans one CSS variable layer | Replaces both with tokens extracted from v6 |
| Accessibility targets | Diagnoses: 1 reduced-motion use, no aria-live, sub-44px drag handles | Prescribes: WCAG 2.2 AA, 44px targets, reduced-motion compliance (Phase 8) |
| Mobile navigation | Documents current: MobileBottomNav, dual sidebar | Specifies target: 5-tab bottom nav, locked |
| Component build list | input-group, button-group, sortable wrapper, FAB | KPI cards, activity rows, sheets, FAB, drawer, search |
| Canonical reference artifacts | 9 templates in `docs/templates/React-temps/` with gap table | `mobile-dashboard-v6.html` plus theme variants |
| Capacitor/native | Safe-area CSS variables in Phase 1 | Dedicated doc (12-capacitor-native.md) + safe-area testing |
| Scope firewall | Excludes design direction | Excludes code cleanup, PDF, calculations, schema |
| Same defect themes | Sign-out confirmation, column locking, drag handles, touch targets | Covered implicitly by shell/forms/accessibility phases |

## Strengths to Add to the Facelift PRD

The Facelift PRD is the newer PRD. It lacks these proven strengths of the older Consolidation PRD:

1. Evidence-based audit ground. The Consolidation ran `audit:load` over 690 files, used 5 parallel inspection agents, and verified all 11 user issues against source. The Facelift specifies the target with no current-state audit behind it.
2. Issue tracker with reproduction, severity, and status taxonomy. The Facelift has a Locked Decisions table for choices but nothing for defects. The Consolidation taxonomy (Fixed, Implemented, Partial, Valid, Unimplemented, Needs UI, Intentional) prevents re-litigating fixed issues.
3. Priority matrix (impact over effort quadrants). The Facelift roadmap is purely sequential. The Consolidation quadrants (Quick Wins, Major Projects, Fill-Ins, Strategic) let the team reorder or descope.
4. Risk-adjusted priorities. Safety, legal (WCAG), and maintenance multipliers reorder the backlog. The Facelift risk table lists risks but no risk changes the plan.
5. Effort estimates per task. The Consolidation prices tasks in developer-days. The Facelift states 20 weeks with no per-task cost.
6. Measurable exit criteria. Facelift gates are vague ("All dashboard components render correctly"). Consolidation gates are quantified ("formTheme.css reduced by 30%+, no duplicate @keyframes").
7. Quantified baseline metrics. 48 pages, ~690 files, 25 oversized files, 3 Framer Motion uses. The Facelift has no before numbers, so completion cannot be measured.
8. Migration safety principles. No big-bang rewrite, side-by-side compatibility, CSS-first, delete-first. The Facelift implies a 20-week rebuild with no stated compatibility guarantee.
9. Dead-code cross-reference. The Facelift excludes cleanup, but without referencing the Consolidation deletion list, new components risk being built beside code scheduled for deletion.

## Verification result

Verification:
- Read-only documentation task. No code changed.
- bun run audit:load: not applicable (no code change)
- bun run typecheck: not applicable (no code change)
- git status: not run before write; this report is the only new file from this task

## Risks or limitations

- The comparison reads the Consolidation README only, not its 8 sub-documents. Deeper conflicts may exist between sub-documents of both PRDs.
- The Facelift PRD has 25+ documents; this comparison read 3 of them. The remaining documents may add detail that changes minor points.
- Dates on both PRDs match (2026-08-28), so the status conflict is likely an update gap, not a version conflict.

## Deferred work

- Fix the broken cross-reference links from the Facelift PRD to `ui-ux-consolidation/00-index.md`.
- Update the Consolidation PRD README design-system section to reflect the Facelift's locked decisions.
- Decide whether the Consolidation PRD should adopt the numbered `00-index.md` convention for consistent cross-linking.
