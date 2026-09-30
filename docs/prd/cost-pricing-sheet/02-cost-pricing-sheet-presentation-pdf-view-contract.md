# Cost & Pricing Sheet PRD 02 — Presentation, PDF, and View Contract

Status: Authoritative. Planning only. This document authorizes no implementation.
Date: 2026-09-29
Repository path: `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`
Package: `docs/prd/cost-pricing-sheet/`. Sibling documents:
[01-cost-pricing-sheet-product-domain-architecture.md](01-cost-pricing-sheet-product-domain-architecture.md),
[03-cost-pricing-sheet-implementation-readiness-roadmap.md](03-cost-pricing-sheet-implementation-readiness-roadmap.md),
[waterfall-roadmap.html](waterfall-roadmap.html). Supersedes §25 and §34 of `docs/prd/boq-architecture-prd.md`.
Authoritative scope: V12 form contract, form/backend boundary, View Page architecture,
View candidate evaluation, Forme PDF contract, customization, view→PDF relationship,
FAB/action behavior, responsive expectations, presentation readiness gates.
Evidence basis: `docs/prd/boq-architecture-prd.md` (§§24–25, 34);
`docs/prd/pdf-rendering-migration/draft.md` (plus `functional-req.md`,
`Prerequisites.md`, `risk-register.md`, `test-plan.md`);
`docs/reports/pdf/forme-invoice-poc-report.md`;
`docs/reports/pdf/forme-industry-poc-report.md`;
`docs/reports/pdf/pdf-renderer-capability-replacement-and-template-preview-audit.md`;
`docs/reports/cost-pricing-sheet/boq-view-candidate-v1-2026-09-29.md`;
`boq-view-candidate-v2-2026-09-29.md`; `boq-view-candidate-v3-2026-09-29.md`;
`boq-view-candidate-v4-2026-09-29.md`.
Skills used: writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

> Evidence rule. Claims marked *(evidence)* were verified against the repository.
> The View Page candidate is not selected in this task. No candidate file was
> opened for pixel review and no candidate HTML was modified.

---

## 1. Presentation layering rule

Cost & Pricing Sheet presentation renders prepared state and wires existing commands. It invents
no domain behavior. Three layers stay separate:

```text
V12 / View / PDF presentation  →  renders prepared state, wires commands
Page orchestration (BoqFormPage) →  mode, loading, validation, save strategy
Domain + shared services        →  rows, groups, columns, math, numbering, audit
```

The transplant and view rules below enforce this order. File 03 gates the work.

---

## 2. V12 form contract

V12 (`.../Design-direction/form/boq/boq-form-candidate-v12.html`) is the accepted
presentation direction. It is not an architecture source of truth. Its JavaScript
(local `rows` array, `data:` URL photos, `localStorage`) is prototype-only and
MUST NOT be ported.

### 2.1 What survives the transplant

Responsive composition and breakpoints; field placement and item stack order;
interaction surfaces (sheets, dialogs, disclosure rows, drag handles); visual
states (empty, hover, error, saving, saved); per-item Sub Description disclosure;
V12 validation gate (becomes strategy `validate` per File 01 §14); Layer 2
totals display (`tCost`/`tSell`/`tProfit`/`tMargin`), extended with shared-engine
totals.

### 2.2 V12 assumptions now superseded

| V12 element | Evidence | Target |
| :--- | :--- | :--- |
| `BOQ_CANONICAL_ORDER` includes `specification` | V12 source | **Remove** from column settings (per-item capability) |
| `docColumns` is `{key,label,visible}` boolean | V12 source | Replace with `ColumnConfig` + `visibilityMode` |
| `resolveBoqColumns` hand-rolled | V12 source | Replace with `resolveFinancialColumns` |
| Column sheet omits Row Overrides and Add Custom Column | V12 source | **Both must appear** (Quotation parity) |
| `COMM_OPTIONAL = []`, `META_OPTIONAL = []` | V12 source | Populate with `install_rate`, `vat_rate`, `discount_rate` |
| `save()` prototype-only | V12 source | Replace with `useDocumentSave` |
| `doImport()` prototype parser | V12 source | Replace with `JsonImportLayout` |
| `doResetCols()` prototype | V12 source | Replace with `getResetColumnConfigs(BOQ_BUILTIN_COLUMNS)` |
| Photo uses local data URLs | V12 source | Replace with `uploadItemPhoto` + `image_url` |
| Local `rows`/`seq` state | V12 source | Replace with production state |
| VAT/discount/install display only | V12 source | Wire to the shared engine through the Cost & Pricing Sheet adapter (File 01 §4) |

### 2.3 Form/backend boundary

The transplant MUST NOT define a row model, persistence, CP/SP semantics,
calculation ownership, any VAT/discount/install formula, a column framework or
resolver, group logic, an import parser or schema, an upload path, document
numbering, save persistence, conversion, duplicate, or totals-inside-render.
It wires existing domain commands and state into the approved design.

### 2.4 Form FAB behavior

Form Save uses `FormFooter` with Lucide `SaveAll`, per `fab-standard.md` v1.1:
mobile `bottom: calc(var(--bd-app-bottom-nav-offset, 72px) +
env(safe-area-inset-bottom) + 16px)`, `right: 16px` (32px `sm+`). Container
50×50, `rounded-[18px]`, primary background, `shadow-lg`, `hover:scale-105`,
`active:scale-95`, icon `h-5 w-5 stroke-[2]`. Ambient float on a wrapper (4s,
disabled under `prefers-reduced-motion`). One primary FAB per view. Do not copy
the known `FormFooter` `z-[60]` deviation as approval.

---

## 3. View Page architecture

The Phase 1 demolition removed `src/components/document-view/boq/**` and the
Cost & Pricing Sheet React PDF renderer. Route `src/pages/ViewBoq.tsx` is a transitional
placeholder. The rebuild uses the shared document-view shell
(`src/components/document-view/`), not the deleted files.

Target composition:

| Element | Source |
| :--- | :--- |
| Shell | shared `document-view` shell (top nav, page, sheets, dialogs) |
| Download FAB | shared `FloatingDownloadButton` (custom AB download icon) |
| Actions | archive, status, duplicate, convert, share, export (shared patterns) |
| Totals strip | prepared values from the Cost & Pricing Sheet adapter (shared + costing) |
| Groups | header band + per-group subtotal, from prepared data |
| Photo | read-only render from `image_url` when present |
| Mobile | sticky action access, More sheet with danger zone, bottom-nav clearance |
| Desktop | schedule-first column with sticky commercial rail, no FAB |

View FAB equals Download, matching the Invoice reference
(`ViewInvoice.tsx`, `InvoiceWorkspace.tsx`, `FloatingDownloadButton.tsx`).
Company identity uses the brand block with logo-or-initials fallback. Item
photos render read-only inside the item body, only when present. Secondary
actions live in a sectioned More sheet with a danger zone.

### 3.1 View FAB behavior

Standard v1.1 geometry: 50×50 container, 18px radius, primary background, 22px
AB download icon, screen-reader label, fixed right 16px, bottom
`calc(88px + safe-area)` on mobile above the bottom nav, `z-50`, one primary
FAB per view, ambient float on the wrapper (disabled under reduced motion).
Document-end padding keeps the close-out readable above nav and FAB. Two-stage
download feedback mirrors `downloadPdf.tsx` (`download:start`, then
`download:success`). Share uses the generic Web Share with clipboard fallback.

---

## 4. View candidate evaluation — UNRESOLVED

Four standalone design-direction candidates exist under
`.../Design-direction/view/boq/`. This task does not select one. No explicit
repository evidence of human or product acceptance exists for any candidate:
every candidate report defers visual browser review and user acceptance to a
human, and none records approval.

| Candidate | Files | Structural concept | Notable properties |
| :--- | :--- | :--- | :--- |
| V1 | `boq-view-candidate-v1.html` | Hero card + commercial band + read-only item cards | Single file all breakpoints; dark commercial band; group envelopes read-only; status toggle; no Download action (PDF renderer was removed); locked-model totals |
| V2 | `boq-view-candidate-mobile-fold-v2.html`, `boq-view-candidate-desktop-v2.html` | Invoice-mirrored split (mobile/fold + desktop) | Closest to production Invoice behavior; standard FAB; action-row Edit + Download; brand block; photo lightbox; dense desktop table; open questions on CP visibility and Approved locking |
| V3 | `boq-view-candidate-mobile-fold-v3.html`, `boq-view-candidate-desktop-v3.html` | Ledger schedule with persistent commercial chrome | Clean-sheet; no hero; sticky commercial bar/rail; light group dividers with jump chips; ledger rows; FAB-only Download; open questions on narrow-phone crowding and divider weight |
| V4 | `boq-view-candidate-mobile-fold-v4.html`, `boq-view-candidate-desktop-v4.html` | Third information architecture; V2 as quality floor, V3 ledger abandoned | Newest; report present; content not pixel-reviewed in this task |

Factual comparison (from candidate reports, not from new visual review):

- V1 is the only candidate without a Download action. It predates the Forme decision.
- V2 adheres most closely to proven Invoice production behavior and the FAB standard.
- V3 departs furthest (persistent commercial chrome, jump navigation, ledger rows) and carries the most open ergonomic questions.
- V4 exists alongside V1–V3 with no recorded acceptance. Its report positions V2 as the quality floor.
- All four use the locked costing model and fictional sample data. None renders VAT/discount/install commercial behavior, which File 01 now requires.

### 4.1 View decision gate (normative)

The View Page direction stays UNRESOLVED. It resolves only through explicit
human acceptance recorded against one candidate (or a documented synthesis).
The gate requires:

1. Human visual review of the contending candidate at phone, fold, and desktop widths, in light and dark modes.
2. A recorded selection naming the winner. Newest file, highest version number, and modification time are not selection criteria.
3. Resolution of that candidate's open questions (CP/SP visibility and permission, Approved-state locking, More-sheet versus menu on desktop, commercial-band versus persistent-chrome treatment).
4. Extraction of the winner's structural contract into this file (shell, sections, commercial presentation, group treatment, photo treatment, action model, FAB geometry).
5. Confirmation that the winner can carry File 01 commercial behavior (VAT/discount/install display, `hide_display`/`hide_full` semantics) and the File 01 §7.5 field matrix.

Until the gate closes, overall Cost & Pricing Sheet implementation readiness is NOT READY (File 03).
No production View implementation may begin. No candidate HTML may be edited to
ease this decision.

---

## 5. PDF architecture — pdfcn Forme

Decision (D18): the Cost & Pricing Sheet renderer is **pdfcn Forme**. This closes the renderer
question. It does not start PDF implementation. Gates in §8 apply.

### 5.1 Migration architecture consumed (evidence)

`docs/prd/pdf-rendering-migration/draft.md` (status: Proposed) defines the
target pipeline:

```text
Business Data → Canonical Document Model → BIGDROPS PDF Design System
→ pdfcn → Supported PDF Renderer → PDF
```

Binding rules adopted for Cost & Pricing Sheet: the document model stays renderer-independent;
the application layer MUST NOT couple to `@react-pdf/renderer`, pdfcn, Takumi,
Forme, or any future renderer; new templates default to the pdfcn architecture;
legacy React-PDF documents stay operational until their family migrates;
`@react-pdf/renderer` is removed only after repository-wide proof of zero
consumers. Migration runs per document family with independent verification.
This is a rendering migration, not a business-logic rewrite: tax, totals,
discounts, numbering, parties, payments, status, audit, permissions, and
Supabase behavior do not change unless explicitly in scope.

Renderer terminology used here is the migration PRD's own: **pdfcn** is the
component/design-system layer; **Forme** (`@formepdf/react`, `@formepdf/core`,
`renderDocument()`) is the rendering backend carrying the Cost & Pricing Sheet template.
**Takumi** is not the Cost & Pricing Sheet renderer. No Cost & Pricing Sheet-only rendering engine is permitted.
The migration specification is not duplicated in this file; Cost & Pricing Sheet defines only
its adapter and composition duties.

### 5.2 Repository evidence for Forme (evidence)

- The capability audit (`pdf-renderer-capability-replacement-and-template-preview-audit.md`) finds pdfcn a source of renderer-facing components, not a drop-in runtime: Takumi and Forme integration examples, theme tokens, tables, page breaks, keep-together primitives. Template picker and miniature preview MUST NOT import Takumi or Forme internals. pdfcn sample blocks calculate inline; BIGDROPS renderers MUST NOT.
- The Forme invoice POC proves under Bun: exact A4 geometry portrait and landscape, long-table flow with intact rows, exact totals, Inter ₦ rendering, data-URI logo embedding, dynamic page numbering through `Fixed` footers, native-Table repeating headers. Partial: one-page density, long descriptions, font weights 500/600. Untested: browser/Vite bundling, Vercel, raster visual parity, rich text, attachments, file-size budget (~7.5× React-PDF in the industry POC).
- The Forme industry POC reproduces the full production Industry section set (header, parties, grouped table with subtotals, bank, totals, words, balance, notes, terms, attachments, fields, signature, fixed footer) with exact values. Verdict: Forme engine CAPABLE, native components CAPABLE for commercial grammar, pdfcn abstractions/blocks NOT USED by design, BIGDROPS-owned template PROVEN FEASIBLE. No migration authorized; React-PDF remains production.
- Standing POC gaps: rich-text notes/terms port, browser/Vite and Vercel proof, 500/600 weight visuals, density tuning, group header + subtotal rows surviving page breaks, attachment paths.

### 5.3 Concern split (normative)

| Concern | Owner | Cost & Pricing Sheet duties |
| :--- | :--- | :--- |
| Shared Forme renderer | Migration track (`@formepdf/core`, pdfcn primitives, design system, orientation, pagination, one-page mode) | None. Cost & Pricing Sheet consumes it. |
| Cost & Pricing Sheet document composition | Cost & Pricing Sheet track | BIGDROPS-owned Cost & Pricing Sheet Forme template: header, parties, grouped schedule table, closing totals, notes, signature, footer. Native Forme Table/Row/Cell (not the pdfcn table abstraction, per the repeat-header evidence). Whether Cost & Pricing Sheet needs a dedicated template or can share a financial-document primitive is decided at PDF implementation time against the Industry reference; default is a dedicated Cost & Pricing Sheet template. |
| Cost & Pricing Sheet PDF customization | Cost & Pricing Sheet track | Keep `BOQ_CAPABILITIES` / `BOQ_POLICY` / `BOQ_TEMPLATE_DEFAULTS` unchanged (document-font-only). No new capability in this PRD. Map the existing customization contract onto Forme theme tokens. |
| Cost & Pricing Sheet domain data preparation | Cost & Pricing Sheet track | `prepareBoqViewData(boq, rows, columns, groups)` computes ALL values through the Cost & Pricing Sheet adapter (File 01 §4). The template receives prepared strings and numbers. |

### 5.4 Rendering rules (normative)

1. Forme renders. The Cost & Pricing Sheet/shared calculation architecture calculates. No PDF template is a financial source of truth.
2. The template MUST NOT call `computeDocument`, the Cost & Pricing Sheet adapter, or `computeBoqTotals`. It MUST NOT query Supabase.
3. Financial values arrive prepared: line values, VAT, discount, install, extra charges, WHT (when enabled), grand total, payable, cost, selling, profit, margin, group subtotals, amount in words (when enabled).
4. Column visibility arrives resolved: `getPdfColumns` + `getPdfCellValue` with the Cost & Pricing Sheet built-in set. Description stays index 0. `hide_display` excluded from PDF and view. `hide_full` excluded everywhere. Non-essential empty columns may auto-hide; `description`, `quantity`, `sp` are `NEVER_AUTO_HIDE`.
5. Groups render as a header band plus a per-group subtotal row (shared-engine install subtotal + costing subtotal). Deterministic output: identical data and configuration produce equivalent output.
6. Sub Description renders from the prepared item, never from a column.
7. Photos render from `image_url` when present and `showItemImages` is true.
8. CP and SP render when visible. CP appears only in Cost & Pricing Sheet output. Converted Quotations never show CP.
9. Filename: `<boq_number> <title>.pdf`, sanitized.
10. Rendering a Quotation derived from a Cost & Pricing Sheet MUST NOT re-read the Cost & Pricing Sheet.
11. Orientation: portrait A4 and landscape A4 are first-class layout modes. Orientation change recalculates page dimensions, content and table widths, margins, headers, footers, and pagination. No CSS/transform hack simulates landscape.
12. Pagination: avoid unnecessary breaks; keep related sections together where practical; never strand totals; long tables flow with repeating headers; keep-together for totals and signature blocks where the renderer supports it.
13. One-page mode follows the migration semantics: compress/reflow to fit one physical page while preserving all content; produce multiple pages rather than drop content or violate readability minimums.
14. Preview/download relationship: preview models and PDF generation consume the same prepared data. PDF download regenerates from prepared data; it never invents values the preview lacks.
15. Failure/fallback: the migration PRD defines no Cost & Pricing Sheet-specific fallback. Until the migration track defines one, Cost & Pricing Sheet PDF failure surfaces an error. Silent fallback to React-PDF is prohibited (the Cost & Pricing Sheet React-PDF renderer was demolished; no legacy Cost & Pricing Sheet path exists).

---

## 6. View → PDF relationship

View and PDF are two renderers over one prepared model. Both consume
`prepareBoqViewData` output. Parity requirement: every value visible in the
view has the same source as the PDF value. Column visibility, group subtotals,
commercial totals, costing totals, photos, notes, and footer identity match.
The view never shows a value the PDF cannot reproduce from the same prepared
model, and the PDF never calculates a value the view lacks.

---

## 7. Responsive expectations

Phone, fold, and desktop compositions follow the selected View candidate's
contract (§4.1 gate item 4) and V12's form breakpoints. Fold splits body and
commercial zones. Desktop uses the schedule-first column with a sticky rail.
Bottom-nav geometry (62px tall, 10px sides, Sales tab active for Cost & Pricing Sheet) and FAB
clearance (§3.1) are fixed inputs, not candidate variables. Dark mode, safe
areas, and reduced-motion behavior from the FAB standard apply to all
presentation surfaces.

---

## 8. Presentation readiness gates

No presentation implementation begins until its gate is green (File 03 owns
the full phase plan):

- V12 transplant gate: File 01 backend/domain readiness (row model, persistence,
  CP/SP, commercial ownership, columns, groups, import, photos, numbering, save,
  conversion, lineage, duplicate, audit) plus the §2.2 reinterpretations.
- View implementation gate: §4.1 decision gate closed AND the winner's structural
  contract extracted into this file.
- Forme PDF gate: migration-track readiness (pdfcn foundation, reference
  commercial template path proven, rich-text port, browser/Vite proof) AND Cost & Pricing Sheet
  data-preparation contract (`prepareBoqViewData`) implemented AND §5.4 rules
  acknowledged in the implementation plan.

---

## 9. Presentation acceptance criteria

- [ ] V12 reinterpretations (§2.2) are implemented; no prototype assumption survives.
- [ ] Form renders prepared state only; §2.3 prohibitions hold.
- [ ] View uses the shared shell; Download FAB geometry matches §3.1.
- [ ] One View candidate carries explicit human acceptance; its contract is extracted here.
- [ ] Forme template receives prepared data only; §5.4 rules hold; no Takumi path; no second engine.
- [ ] View↔PDF parity holds over one prepared model.
- [ ] Customization stays document-font-only.
- [ ] Responsive, dark-mode, safe-area, and reduced-motion behavior verified by human review.
- [ ] Zero candidate HTML files modified by any implementation task.
