# View & Detail Wireframe Audit Report

> **Written by:** mimo-v2.5-free via Local Runner
> **Date:** 2026-09-02
> **Domain:** UI/UX Wireframes
> **Scope:** 5 view/detail surfaces — Invoice, CSR, Waybill, Client Detail, Project Detail
> **Documentation standard:** ASD-STE100 Simplified Technical English

---

## Objective

Create wireframe documentation for the 5 live view/detail screens in the BIGDROPS platform. Each surface gets an interaction-complete HTML wireframe and a Markdown specification with a full Interaction Inventory table.

## Scope

| Surface | Source File | Wireframe Files | Prefix |
|---------|-----------|----------------|--------|
| Invoice View | `src/pages/ViewInvoice.tsx` | `invoice-view-wireframe.html` + `.md` | INV-V |
| CSR View | `src/pages/ViewCSR.tsx` | `csr-view-wireframe.html` + `.md` | CSR-V |
| Waybill View | `src/pages/ViewWaybill.tsx` | `waybill-view-wireframe.html` + `.md` | WB-V |
| Client Detail | `src/pages/ClientDetail.tsx` | `client-detail-wireframe.html` + `.md` | CLI-V |
| Project Detail | `src/pages/ProjectDetail.tsx` | `project-detail-wireframe.html` + `.md` | PROJ-V |

**Output directory:** `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/wireframes/`

## Files Changed

All 10 wireframe files were created in this session:

| File | Status |
|------|--------|
| `invoice-view-wireframe.html` | Created |
| `invoice-view-wireframe.md` | Created |
| `csr-view-wireframe.html` | Created |
| `csr-view-wireframe.md` | Created |
| `waybill-view-wireframe.html` | Created |
| `waybill-view-wireframe.md` | Created |
| `client-detail-wireframe.html` | Created |
| `client-detail-wireframe.md` | Created |
| `project-detail-wireframe.html` | Created |
| `project-detail-wireframe.md` | Created |

## Skills Used

- `redesign-existing-projects` — Established wireframe format, structure, and audit conventions
- `mobile-app-ui-design` — Mobile-first layout patterns, bottom sheets, action rails
- `appllama-app-design-skill` — Apple HIG-inspired detail views, card layouts, safe area handling

## Interaction Inventory Summary

| Surface | Prefix | Interaction IDs | Coverage |
|---------|--------|----------------|----------|
| Invoice View | INV-V | 60+ | All controls, overlays, states, transitions |
| CSR View | CSR-V | 40+ | Status-dependent UI, review actions |
| Waybill View | WB-V | 30+ | Read-only view, conversion action |
| Client Detail | CLI-V | 40+ | Tabbed layout, action sheet, document list |
| Project Detail | PROJ-V | 40+ | Operating stream, link dialog, document groups |

**Total interaction IDs documented:** 210+

## Wireframe Format Consistency

All 5 HTML wireframes share:

- Self-contained HTML with embedded CSS (no external dependencies)
- Section labels with colored dot indicators
- Card-based layouts with `border-radius: 16px`
- Interactive `onclick` handlers for all controls
- Overlay sheets (bottom sheet pattern)
- Toast notifications for feedback
- Alert dialogs for destructive actions
- Mobile-first responsive design with 900px desktop breakpoint
- Sticky top navigation and bottom action bars
- Consistent color scheme matching BIGDROPS design tokens

## Design System Alignment

Per `Design.md`, the wireframes follow:

- **Slate-navy palette** — `#6366f1` primary accent (close to `--primary`)
- **Compact density** — Type sizes 11–20px, tight spacing
- **18px card radius** — Consistent across all surfaces
- **Bottom sheet overlays** — Slides from bottom, not modal dialogs
- **Progressive disclosure** — Summary → detail on demand
- **Status colors** — Green for success/active, amber for pending, red for danger

## Gaps Identified

1. **`ProjectDocumentSheet.tsx`** — Referenced in project detail but not found at expected path. Document linking may be inlined or located elsewhere.
2. **Dark mode** — Wireframes show light theme only. Dark theme wireframes not in scope.
3. **Loading/empty states** — Documented in MD specs but not rendered in HTML wireframes.
4. **Permission states** — Documented in MD specs but not rendered in HTML wireframes.
5. **Form wireframe overlap** — Invoice, CSR, and waybill form wireframes already exist (form versions). View wireframes are separate surfaces.

## Verification

- `bun run audit:load`: Not run (documentation-only task)
- `bun run typecheck`: Not run (documentation-only task)
- `git status`: Pre-existing uncommitted changes from another agent confirmed intact

## Risks

- `ProjectDocumentSheet.tsx` may need re-tracing if project linking is more complex than documented
- Permission states vary by role — wireframes assume full-access user
- Wireframes use placeholder data — real data may reveal layout edge cases

## Deferred Work

- Loading skeleton wireframes (documented in MD, not rendered)
- Error state wireframes
- Permission-restricted state wireframes
- Dark mode wireframes
- Project document linking deep-dive (pending `ProjectDocumentSheet.tsx` location)
