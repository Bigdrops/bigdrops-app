# 03 — BOQ Presentation Contract

**Part of the BOQ PRD package.** Entry point: [README.md](README.md).

**Date:** 2026-09-29
**Documentation standard:** ASD-STE100 Simplified Technical English
**Skills used:** writing-clearly-and-concisely
**Status:** V12 form direction ACCEPTED, production transplant GATED. PDF renderer RESOLVED — pdfcn Forme. **View Page candidate: UNRESOLVED (hard gate).**

**Source.** Split from `docs/prd/boq-architecture-prd.md`. Every section keeps its old section number in the heading. Sections §6 and §9 are new in this package.

**Companion documents.**

- [01 — BOQ Domain Architecture](01-boq-domain-architecture.md)
- [02 — BOQ Document Lifecycle](02-boq-document-lifecycle.md)

**Authoritative renderer context.** `docs/prd/pdf-rendering-migration/`. This document defines only the BOQ adapter and composition responsibilities. It does not duplicate the renderer migration PRD.

---

## §1. FAB Contract (old §24)

Applied against `docs/standard/fab-standard.md` version 1.1 (2026-09-29).

### §1.1 Target

| View | Role | Icon | Component | Placement |
| :--- | :--- | :--- | :--- | :--- |
| BOQ list | Create | Lucide `Plus` | `MobileFab` | Mobile list: `bottom: 94px`, `right: 16px` |
| BOQ form | Save | Lucide `SaveAll` | `FormFooter` | Mobile form: `bottom: calc(var(--bd-app-bottom-nav-offset, 72px) + env(safe-area-inset-bottom) + 16px)`, `right: 16px` (32px `sm+`) |
| BOQ view | Download | Custom `DownloadIcon` SVG | `FloatingDownloadButton` | Bottom-right, clears the surface |

### §1.2 Conformance Rules

1. Container: 50×50, `rounded-[18px]`, `bg-bd-button-primary-bg`, `text-bd-button-primary-text`, `shadow-lg`, `hover:scale-105`, `active:scale-95`, icon `h-5 w-5 stroke-[2]`.
2. Ambient float (standard §2.1): translateY 0 → -3px → 0, 4s ease-in-out infinite, applied to a **wrapper**, disabled under `prefers-reduced-motion`.
3. `MobileFab` is role-agnostic and accepts an `icon` prop.
4. One primary FAB per view. Download is secondary.
5. `z-50` mobile. Do not copy `FormFooter`'s known `z-[60]` deviation as approval.
6. No BOQ-specific geometry, radius, or icon.

### §1.3 Current Status

| View | Status |
| :--- | :--- |
| List | Conforming — `MobileFab` already used *(evidence)* |
| Form | Absent — `FormFooter` after rebuild |
| View | Absent — `FloatingDownloadButton` after rebuild |

### §1.4 Standard Drift

No BOQ-specific drift found. The standard's Known Non-Conformances (CSR download icon, Settings `.su-fab`, `FormFooter` z-index, CSR icon size) are pre-existing and unrelated to BOQ. BOQ MUST NOT copy them.

**View Page note.** The candidate designs propose different Download placements (v2 action strip; v3 FAB-only). The FAB standard governs until a View Page candidate is explicitly accepted ([§9](#9-view-page-candidate-audit--unresolved-new)).

---

## §2. V12 Form Direction and Plug-and-Play Readiness Gate (old §34)

### §2.1 V12 Status

**V12 is ACCEPTED AS PRESENTATION DIRECTION. Production transplant is GATED.**

The approved design file is `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v12.html`. It is read-only for this package. The transplant consumes prepared behavior. It must not invent backend or domain behavior (D15).

### §2.2 The Gate (old §34.1)

This is a hard gate. **The V12 transplant MUST NOT begin until every row below is green.**

The gate exists to prove that the form does not need to invent backend or domain behavior while being transplanted.

| # | Readiness item | Proof required | Phase |
| :-: | :--- | :--- | :-: |
| 1 | Authoritative row model settled | `row_type: 'group_header' \| 'standard'`, `group_id`, `group_name` live; M3 pushed | A, C |
| 2 | Persistence settled | `boq_rows` written; `custom_fields.table_rows` not written; legacy read works | A, C |
| 3 | CP/SP semantics settled | `BOQ_BUILTIN_COLUMNS` live; `hideFullDenyList` enforced; Layer 2 outputs defined | B, C |
| 4 | Commercial calculation ownership settled | Layer 1 + Layer 2 both produce values in the form state; `src/lib/Calculations.ts` untouched | C, D |
| 5 | Quotation-compatible tax/discount/install settled | Columns render; `hide_display` default; row overrides work | E |
| 6 | Columns settled | `ColumnManager` opens with all [01 §6.1](01-boq-domain-architecture.md) capabilities; labels, order, reset, custom columns, row overrides | E |
| 7 | Groups settled | Create, rename, subtotal toggle, delete, item membership, ordering, persistence | E |
| 8 | JSON Import contract settled | Add-mode groups, Update-mode `row_number`, overwrite confirmation, custom columns | F |
| 9 | Photo persistence/upload settled | Cloudinary upload → `secure_url` → `boq_rows.image_url` → reload → replace → remove | G |
| 10 | Prefix numbering settled | M1 pushed; create path wrapped in `withUniqueRetry`; cursor advances only on automatic allocation | A, D |
| 11 | Create/edit save orchestration settled | `BoqFormPage` + `useDocumentSave`; validation per [02 §1.5](02-boq-document-lifecycle.md) | D |
| 12 | Conversion mapping settled | [02 §3](02-boq-document-lifecycle.md) table implemented; no unknown columns; groups and photos transfer | G |
| 13 | Lineage settled | `conversionTrail.source.type = 'boq'`; `source_boq_id` written; no observer added | G |
| 14 | Duplicate behavior settled | Child rows, columns, groups, photos copied; lineage and client shed; new number | G |
| 15 | Audit requirements settled | `recordBoqCreated`, `Updated`, `StatusChanged`, `Linked` emit successfully | G |
| 16 | PDF/view prepared-data contracts settled | `prepareBoqViewData` returns all totals; renderer makes no calculation | G |
| 17 | Schema migrations identified | M1–M3 pushed. M4 scheduled and authorized separately | A |
| 18 | Standards updates identified | [01 §18](01-boq-domain-architecture.md) list written and scheduled | A |
| 19 | RFQ isolation proven | [01 §14.4](01-boq-domain-architecture.md) grep outputs recorded; RFQ tests pass | C |
| 20 | **View Page candidate accepted** | Written product acceptance of one candidate ([§9](#9-view-page-candidate-audit--unresolved-new)) | — |

Items 1–19 are the original gate. Item 20 is added by this package because the View Page decision is UNRESOLVED.

### §2.3 What the Transplant May Then Concern (old §34.2)

Once the gate is green, the V12 transplant is limited to:

1. Responsive composition and breakpoints.
2. Field placement and the item stack order.
3. Interaction surfaces — sheets, dialogs, disclosure rows, drag handles.
4. Visual states — empty, hover, error, saving, saved.
5. Wiring **existing** domain commands and state into the approved design.

### §2.4 What the Transplant MUST NOT Do (old §34.3)

1. Define a row model.
2. Define persistence.
3. Define CP/SP semantics.
4. Decide calculation ownership.
5. Write a VAT, discount, or install formula.
6. Implement a column framework or column resolver.
7. Implement group logic.
8. Implement an import parser or schema.
9. Implement an upload or store a data URL as production state.
10. Allocate a document number.
11. Implement save persistence.
12. Implement conversion.
13. Implement duplicate.
14. Calculate totals inside a render component.

### §2.5 V12-Specific Reinterpretations (old §34.4)

These are recorded so the transplant does not carry V12's prototype assumptions forward.

| V12 element | Evidence | Target |
| :--- | :--- | :--- |
| `BOQ_CANONICAL_ORDER` includes `specification` | V12 source | **Remove** from column settings (D13) |
| `docColumns` is `{key,label,visible}` boolean | V12 source | Replace with `ColumnConfig` + `visibilityMode` |
| `resolveBoqColumns` hand-rolled | V12 source | Replace with `resolveFinancialColumns` |
| Column sheet comment: "Row Overrides and Add Custom Column stay absent" | V12 source | **Superseded by D3.** Both must appear |
| `COMM_OPTIONAL = []`, `META_OPTIONAL = []` | V12 source | Populate with `install_rate`, `vat_rate`, `discount_rate` |
| `save()` is prototype-only | V12 source | Replace with `useDocumentSave` |
| `doImport()` prototype parser | V12 source | Replace with `JsonImportLayout` |
| `doResetCols()` prototype | V12 source | Replace with `getResetColumnConfigs(BOQ_BUILTIN_COLUMNS)` |
| Photo uses local data URLs | V12 source | Replace with `uploadItemPhoto` + `image_url` |
| Local `rows`/`seq` state | V12 source | Replace with production state |
| Totals `tCost`/`tSell`/`tProfit`/`tMargin` | V12 source | **Kept** — Layer 2 outputs, plus Layer 1 totals |
| Per-item Sub Description disclosure | V12 source | **Kept** — correct per D13 |
| Validation gate in `save()` | V12 source | **Kept** — becomes `validate` in [02 §1.5](02-boq-document-lifecycle.md) |

---

## §3. Phase H — Production Presentation Transplant (old §33, Phase H)

**Phases A–G ([01 §20](01-boq-domain-architecture.md)) complete before Phase H begins.**

41. Confirm every gate in §2.2 is green. This includes View Page acceptance (item 20).
42. Transplant the approved V12 design into `BoqFormScreen.tsx` and the accepted View Page design into `BoqViewScreen.tsx`.
43. Replace prototype local state with the production state and commands.
44. Verify responsive composition and photo placement.
45. M4 only after production verification.

### §3.1 Production FormPage / Orchestration Requirements

- `BoqFormPage` owns orchestration with `mode: 'create' | 'edit'`. `NewBoq.tsx` and `EditBoq.tsx` are thin delegators ([02 §1.2](02-boq-document-lifecycle.md)).
- Totals are memoized in `BoqFormPage` from Layer 1 + Layer 2 and passed down as prepared values. Render components never compute.
- `BoqFormScreen` receives state and commands as props. It contains no persistence logic.
- The save strategy is `useBoqSave` implementing `DocumentSaveStrategy` ([02 §1.4](02-boq-document-lifecycle.md)).
- Form FAB is `FormFooter` with `SaveAll` (§1).
- The view screen uses the shared document-view shell (`src/components/document/document-view/`), not a resurrection of the demolished `src/components/document-view/boq/**` files *(evidence: Phase 1 demolition)*.

---

## §4. View Page Architecture

### §4.1 Shell and Composition (target)

| Element | Source |
| :--- | :--- |
| Shell | `src/components/document/document-view/` shared shell |
| Screen component | `src/components/boq/BoqViewScreen.tsx` (to create) |
| Download FAB | `FloatingDownloadButton` |
| Actions | Archive, status, duplicate, convert (shared patterns) |
| Totals strip | Prepared values from Layers 1 and 2 |
| CP/SP/profit presentation | §8.1 |
| Group presentation | §8.2 |
| Photo | Rendered when `showItemImages` is true and `image_url` is present |

### §4.2 Rules

1. The view screen renders prepared data only. It calls `prepareBoqViewData` (§5.1) or its equivalent and never computes totals.
2. Converting from the view screen delegates to `convertBOQToQuotation` ([02 §3](02-boq-document-lifecycle.md)).
3. Rendering a Quotation derived from a BOQ must not re-read the BOQ.
4. The Download FAB follows §1. The concrete layout follows the accepted View Page candidate once one exists (§9).

---

## §5. PDF Rendering Architecture (old §25)

### §5.1 Pipeline

```text
BoqViewScreen / PDF request
        │
        ▼
prepareBoqViewData(boq, rows, columns, groups)   ← ALL totals computed here
        │
        ▼
BOQ PDF composition (BOQ-owned template)          ← receives prepared data
        │
        ▼
pdfcn Forme renderer (shared, [§6](#6-pdf-renderer-decision--pdfcn-forme))
        │
        ▼
PDF file → delivery (Web/Native per pdf-migration-standard delivery layer)
```

Column resolution: `getPdfColumns(columns, items)` + `getPdfCellValue` with the BOQ built-in set.

### §5.2 Rules

| Rule | Requirement |
| :--- | :--- |
| Renderer ownership | Renderers receive prepared data. They MUST NOT calculate |
| No independent totals | A PDF component MUST NOT call `computeBoqTotals` or `computeDocument` |
| Column resolution | `getPdfColumns(columns, items)` + `getPdfCellValue` with the BOQ built-in set |
| Description | Always index 0 |
| `hide_display` | Excluded from PDF and view |
| `hide_full` | Excluded from every context |
| Auto-hide in PDF | Non-essential columns with no values may auto-hide; `description`, `quantity`, `sp` are `NEVER_AUTO_HIDE` for BOQ |
| Groups | Header band + per-group subtotal (Layer 1 install + Layer 2 cost/selling/profit) |
| Photos | Rendered from `image_url` when present and `showItemImages` is true |
| CP / SP | Both rendered when visible. CP shown only in BOQ output |
| Commercial totals | Layer 1 totals. BOQ costing totals shown separately |
| Filename | `<boq_number> <title>.pdf`, sanitized. Fits the `{prefix}-{documentNumber}.pdf` family pattern in `pdf-migration-standard.md` while the standard is renderer-neutral-rewritten ([01 §18.5](01-boq-domain-architecture.md)) |
| Conversion-safe | Rendering a Quotation derived from a BOQ must not re-read the BOQ |
| Orientation | Portrait and landscape A4 are first-class per the renderer PRD |

### §5.3 PDF Customization

`src/domain/pdf/customization/boq.ts` already declares *(evidence)*:

```ts
BOQ_CAPABILITIES = { accentColor: false, documentFont: true, handwritingFont: false, handwritingColor: false }
BOQ_POLICY       = { accentColor: false, documentFont: true, handwritingFont: false, handwritingColor: false }
BOQ_TEMPLATE_DEFAULTS = { accentColor: '#0f172a', documentFont: 'Inter', handwritingFont: 'Inter', handwritingColor: '#0f172a' }
```

**Unchanged.** BOQ keeps document-font-only customization. No new capability is added by this package.

Customization is expressed as document presentation configuration, never as renderer primitives (renderer PRD requirement: the customization engine must be renderer-independent). The BOQ customization layer maps `documentFont` onto the shared Forme theme/font registration; it does not touch Forme internals.

---

## §6. PDF Renderer Decision — pdfcn Forme (NEW)

### §6.1 Decision

**BOQ PDF RENDERER = pdfcn Forme.** Recorded as decision **D16** in [README §3](README.md).

- The BOQ PDF renders through **pdfcn components on the Forme backend** (`@formepdf/react`, `@formepdf/core`).
- Takumi is **not** the BOQ renderer. This package contains no open Takumi-vs-Forme question.
- There is no second, BOQ-only rendering engine. The renderer is shared infrastructure owned by the PDF rendering migration workstream.
- The authoritative renderer context is `docs/prd/pdf-rendering-migration/`. This package consumes it; it does not restate it.

### §6.2 Renderer Architecture (consumed, not duplicated)

From `docs/prd/pdf-rendering-migration/draft.md`:

```text
Application / Supabase
        ↓
Business Document Data
        ↓
Canonical Document Model
        ↓
BIGDROPS PDF Presentation Layer
        ↓
pdfcn Components / BIGDROPS Components
        ↓
Renderer Backend        ← Forme for BOQ (D16)
        ↓
PDF
```

Renderer abstraction:

```text
PDF Renderer Interface
        ├── ReactPdfRenderer [LEGACY]
        └── PdfcnRenderer [TARGET]      ← BOQ targets this, Forme backend
```

The business layer must not couple to `@react-pdf/renderer`, pdfcn, Takumi, Forme, or any future renderer. The document model stays renderer-independent. The renderer is an implementation detail.

### §6.3 Evidence Basis (repository)

| Evidence | Finding |
| :--- | :--- |
| `docs/reports/pdf/forme-invoice-poc-report.md` | Forme POC: A4 portrait/landscape exact, native Table header repeat PASS, dynamic page numbering PASS, ₦ PASS, totals exact |
| `docs/reports/pdf/forme-industry-poc-report.md` | "Forme can realistically carry a BIGDROPS-owned Industry Invoice template without compromising existing commercial grammar." Long document: 64 rows / 8 groups, headers repeat, group headers/footers intact, all money strings exact |
| `docs/prd/pdf-rendering-migration/draft.md` | BOQ listed as a document family (§13). New templates default to the target pdfcn architecture (§6) |
| `docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md` | Standards mapped to the pdfcn architecture; which standards stay authoritative and which need a renderer-neutral rewrite |

### §6.4 Concern Ownership — four layers

| Layer | Owner | BOQ responsibility |
| :--- | :--- | :--- |
| **1. Shared Forme renderer** | PDF rendering migration workstream (`docs/prd/pdf-rendering-migration/`) | None. BOQ consumes `renderDocument()` and shared primitives. BOQ does not fork or wrap the engine |
| **2. BOQ document composition** | BOQ package | A BOQ-owned template composed from Forme **native** components: `Table`/`Row`/`Cell` for the item schedule, group header rows, group subtotal rows, totals block, notes/terms, signature, `Fixed` footer with `boq_number` and `Page N of M` |
| **3. BOQ PDF customization** | BOQ package + shared customization engine | Map `BOQ_CAPABILITIES`/`BOQ_POLICY`/`BOQ_TEMPLATE_DEFAULTS` (§5.3) onto renderer-independent presentation config. Document-font selection resolves to registered fonts in the shared theme |
| **4. BOQ domain data preparation** | BOQ domain ([01](01-boq-domain-architecture.md)) | `prepareBoqViewData` produces every value the template displays: Layer 1 commercial totals, Layer 2 costing totals, per-group subtotals, column visibility, photo URLs, formatted strings |

### §6.5 Composition Rules for the BOQ Template

1. **Use the native Forme `Table`.** The pdfcn `Table` abstraction renders flexbox Views and does not repeat headers across pages *(evidence: both POC reports)*. The native Forme Table repeats `<Row header>` on every content page. The POC measured native `colSpan` group rows and repeat behavior directly.
2. **Author columns to fit exactly.** Overspecified column widths (fixed sum + fraction > content width) clip cell text *(POC caution)*.
3. **No calculation in the template.** Values arrive as prepared strings/numbers from layer 4. This matches the renderer PRD's rule that templates do not query Supabase and do not compute.
4. **Fonts are TTF.** The Forme byte path accepts TTF only; woff/woff2 bytes fail *(POC)*. The shared theme must register Inter from a TTF source with ₦ (U+20A6) coverage.
5. **Keep-together for totals.** Use Forme's `wrap={false}` / `PageBreak` for the totals and signature blocks so totals are never stranded (renderer PRD pagination requirement).
6. **Group semantics mirror production:** one header row per group, footer with prepared subtotal, S/N enumeration across data rows only *(POC evidence: same structure as `IndustryTemplate`)*.

### §6.6 Readiness Conditions — before BOQ PDF implementation may begin

BOQ PDF work is downstream of shared renderer readiness. All conditions must hold:

| # | Condition | Source |
| :-: | :--- | :--- |
| 1 | Renderer migration Phase 1 (pdfcn foundation) validated | `draft.md` migration strategy |
| 2 | One production template has proven the pdfcn path (Phase 2) | `draft.md` migration strategy |
| 3 | Prerequisites gates cleared: dependency audit, standards factoring (standards mapped, not deleted), baseline verification | `pdf-rendering-migration/Prerequisites.md` |
| 4 | `pdf-migration-standard.md` renderer-neutral rewrite or a documented exception exists ([01 §18.5](01-boq-domain-architecture.md)) | Standards delta |
| 5 | Theme/font retarget proven: Inter TTF registered, ₦ renders | POC limitation |
| 6 | Browser/Vite and Vercel serverless rendering proven for Forme (POC was Bun-only) | POC limitation |
| 7 | Rich-text port exists **if** BOQ notes/terms require rich text (plain strings otherwise) | POC limitation |
| 8 | File-size budget accepted (~7.5× React-PDF output measured in POC) | POC evidence |
| 9 | BOQ view/form prepared-data contracts settled (gate item 16) | §2.2 |
| 10 | `@react-pdf/renderer` still installed — the renderer PRD forbids removal until its Phase 4 | `Prerequisites.md` |

If any condition is unmet, BOQ PDF implementation stays blocked even when the rest of the gate is green. The React-PDF path remains the production renderer until the migration workstream replaces it.

---

## §7. PDF / View / Form Parity

| Concern | Rule |
| :--- | :--- |
| Single source of values | Form, view, and PDF consume the same prepared Layer 1 + Layer 2 outputs |
| Column visibility | `show` / `hide_display` / `hide_full` behave identically in form, view, and PDF ([01 §6.1](01-boq-domain-architecture.md)) |
| Groups | Same group vocabulary, same subtotals (Layer 1 install + Layer 2 cost/selling/profit) |
| Sub Description | Rendered per item in form, view, and PDF ([01 §8](01-boq-domain-architecture.md)) |
| Photos | Same `image_url` and `showItemImages` flag in all three contexts |
| CP/SP | Same visibility rules; CP never appears on Quotation-derived output |
| Totals bar | Identical values everywhere; view/PDF never recompute |
| Customization | One customization config (§5.3) applied consistently |

---

## §8. BOQ-Specific Presentation Rules

### §8.1 CP / SP / Profit Presentation

1. CP and SP render as first-class columns when visible. CP appears only in BOQ contexts (form, view, PDF). CP never appears on a Quotation or any Quotation-derived output.
2. The totals bar shows Layer 2 costing values — total cost, total selling price, gross profit, margin — from `BoqTotals`. Layer 1 commercial totals (subtotal, VAT, discount, install, extra charges, grand total, payable) render separately when enabled.
3. V12's `tCost` / `tSell` / `tProfit` / `tMargin` presentation survives (§2.5).
4. The presentation layer never derives profit itself. It displays `BoqTotals` fields.

### §8.2 Group Presentation

1. Group header rows render as a distinct band with the group name.
2. Per-group subtotal rows show Layer 1 install subtotal plus Layer 2 group cost/selling/profit (`BoqGroupTotals`), controlled by `groupMeta[id].showSubtotal`.
3. Group vocabulary in the UI is `group_header` / `standard` — never `section` / `item`.
4. The accepted form design (V12) and the accepted view design govern the visual treatment.

### §8.3 Sub Description Presentation

1. Sub Description renders as a per-item disclosure row inside the item stack, matching V12 (`subHTML` / `editSub` evidence).
2. It is never a column-settings toggle.
3. In view and PDF it renders under the description from `sub_description`.

### §8.4 Item Photos

1. Photos render from `boq_rows.image_url` when `showItemImages` is true.
2. The editor uses `uploadItemPhoto` ([01 §11.4](01-boq-domain-architecture.md)). V12's local data-URL uploader is presentation-only and must be replaced.
3. In PDF, photos render from prepared data (§5.2). One Cloudinary preset only.

### §8.5 Responsive / Mobile / Fold / Desktop Behavior (established evidence)

| Surface | Evidence | Contract |
| :--- | :--- | :--- |
| Form | `boq-form-candidate-v12.html` — accepted responsive direction | V12 breakpoints and composition survive the transplant (§2.3) |
| View, candidate v1 | Single all-breakpoint file: hero card, commercial band, group envelopes | Design evidence only — superseded by its own author's report (§9) |
| View, candidate v2 | Split files: `boq-view-candidate-mobile-fold-v2.html` + `boq-view-candidate-desktop-v2.html`; hero card, commercial band, item cards, action strip, dark group envelopes | Design evidence only; acceptance pending |
| View, candidate v3 | Split files: `boq-view-candidate-mobile-fold-v3.html` + `boq-view-candidate-desktop-v3.html`; masthead, sticky commercial bar, ledger rows, light group landmarks with anchor jump chips, FAB-only download, simulated 62px bottom nav matching `MobileBottomNav.tsx` | Design evidence only; acceptance pending |
| View, candidate v4 | Split files: `boq-view-candidate-mobile-fold-v4.html` + `boq-view-candidate-desktop-v4.html`; compact dossier, inline commercial disclosure capsule, editorial chapter dividers, description-first items, FAB per standard v1.1 | Design evidence only; acceptance pending |
| Bottom navigation | `MobileBottomNav.tsx` is the production constraint | Any accepted view design must clear the production bottom nav |

No view-page responsive contract is final until one candidate is accepted (§9).

---

## §9. View Page Candidate Audit — UNRESOLVED (NEW)

### §9.1 Candidates Present

Directory: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/`

| File | Modified | Shape |
| :--- | :--- | :--- |
| `boq-view-candidate-v1.html` | Sep 29 15:48 | Single file, all breakpoints |
| `boq-view-candidate-mobile-fold-v2.html` | Sep 29 16:03 | Mobile/fold half of V2 |
| `boq-view-candidate-desktop-v2.html` | Sep 29 16:05 | Desktop half of V2 |
| `boq-view-candidate-mobile-fold-v3.html` | Sep 29 16:26 | Mobile/fold half of V3 |
| `boq-view-candidate-desktop-v3.html` | Sep 29 16:27 | Desktop half of V3 |
| `boq-view-candidate-mobile-fold-v4.html` | Sep 29 17:27 | Mobile/fold half of V4 |
| `boq-view-candidate-desktop-v4.html` | Sep 29 17:28 | Desktop half of V4 |

### §9.2 Reports Present

| Report | Lines | Written by |
| :--- | :-: | :--- |
| `docs/reports/boq/boq-view-candidate-v1-2026-09-29.md` | 65 | Longcat via OpenCode Local Runner |
| `docs/reports/boq/boq-view-candidate-v2-2026-09-29.md` | 92 | Longcat via OpenCode Local Runner |
| `docs/reports/boq/boq-view-candidate-v3-2026-09-29.md` | 132 | Longcat via OpenCode Local Runner |
| `docs/reports/boq/boq-view-candidate-v4-2026-09-29.md` | 260 | Muse Spark via OpenCode |

### §9.3 Acceptance Evidence Audit

Checked for: an explicit statement that one candidate is accepted; a product-owner sign-off; a report marking a candidate final/authoritative.

**Result: no explicit acceptance exists.**

- All three reports list visual review and "User acceptance against the BOQ V12 baseline" as **deferred work**.
- The V1 report states V1 was incomplete and was redone as V2.
- The V3 report describes a clean-sheet structure that is explicitly distinct from V2 and lists open human-judgment items.
- The V4 report (created 2026-09-29 while this package was being written) lists "Human visual acceptance of V4 against V2 and V3 side by side" as deferred work.
- No other repository file records acceptance of a view candidate.

Filename order, modification time, and recency are **not** acceptance evidence.

### §9.4 Factual Structural Comparison

| Aspect | V1 | V2 | V3 | V4 |
| :--- | :--- | :--- | :--- | :--- |
| File shape | One file, all breakpoints | Mobile/fold + desktop pair | Mobile/fold + desktop pair | Mobile/fold + desktop pair |
| Top structure | Hero card + commercial band | Hero card + commercial band | Masthead + persistent sticky commercial bar/rail | Merged app bar + dossier row + one context line; no hero card, no band |
| Commercial display | Commercial band | Commercial band | Sticky commercial bar/rail | Collapsible capsule in flow (never sticky) |
| Item rendering | Item cards | Item cards | Ledger rows | Description-first specimen entries; CP behind disclosure |
| Group treatment | Dark envelopes | Dark envelopes | Light group dividers with anchor jump chips | Editorial chapter dividers with chapter subtotal |
| Download | Action strip | Action strip | FAB only | FAB mobile (standard v1.1) / top-bar button desktop |
| Mobile bottom nav | — | — | Simulated 62px bar matching `MobileBottomNav.tsx` | Fixed nav with true `MobileBottomNav` geometry |
| Status in its own report | Incomplete; superseded by V2 work | Acceptance deferred | Acceptance deferred; human-judgment items open | Acceptance deferred (human review vs V2/V3) |

**Open questions carried from the reports:**

- V2: CP/SP visibility permission on desktop; whether Approved locks Edit/Convert; More sheet vs dropdown on desktop.
- V3: sticky bar crowding; ledger rows vs cards; divider weight; CP/SP permission; Approved locking.
- V4: margin display precision (14.9% truncated from 14.91%); CP visibility by role; whether Approved locks Edit and Convert.

### §9.5 Status

> **VIEW PAGE CANDIDATE: UNRESOLVED**

This is a **hard PRD completion gate**. The package cannot be marked implementation-ready for presentation work while it stands. The choice belongs to the product owner. This package does not select a candidate.

**Gate release condition:** written acceptance of one candidate (or a new candidate) in the repository. At that point the accepted candidate's structural contract replaces §4/§8.5 details, the candidate file is preserved as design evidence, and §2.2 item 20 turns green.

---

## §10. Presentation Risks (old §35, presentation share)

| ID | Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R13 | V12 transplant begins before the gate | Architecture invented in presentation | High | §2.2 is a hard gate with 20 items |
| R18 | Concurrent agent edits conflict | File collision | Ongoing | Single-file scope; record baseline |
| P1 | View Page candidate chosen implicitly (newest = accepted) | Wrong direction transplanted | High | §9.5 — UNRESOLVED stays hard |
| P2 | BOQ PDF built before shared Forme readiness | Rework; divergence from target architecture | Medium | §6.6 readiness conditions |
| P3 | BOQ template uses pdfcn `Table` abstraction | No repeating headers; density loss | Medium | §6.5 rule 1 — native Forme `Table` |
| P4 | Renderer coupling leaks into BOQ code | Violates renderer PRD §3 | Medium | §6.4 ownership split; prepared-data rule |
| P5 | Forme fonts (woff) fail at runtime | Missing glyphs / render failure | Medium | §6.5 rule 4 — TTF registration |

---

## §11. Presentation Acceptance Criteria (old §38 + new, presentation share)

### Readiness and sequence
- [ ] A hard V12 readiness gate exists with 20 proof items (§2.2).
- [ ] The gate lists 14 things the transplant MUST NOT do (§2.4).
- [ ] The V12 reinterpretation table records which prototype assumptions do not survive (§2.5).
- [ ] The implementation sequence prepares domain/backend/shared infrastructure **before** Phase H ([01 §20](01-boq-domain-architecture.md)).
- [ ] V12 transplant is Phase H, last.

### FAB and views
- [ ] FAB behavior matches `fab-standard.md` v1.1 for list, form, and view (§1).
- [ ] The View Page shell reuses the shared document-view shell (§4.1).
- [ ] The View Page candidate is explicitly accepted, or remains UNRESOLVED as a blocking gate (§9.5).

### PDF
- [ ] pdfcn Forme is recorded as the BOQ PDF renderer (§6.1, D16).
- [ ] Takumi is not presented as the BOQ renderer anywhere in the package.
- [ ] The four-layer concern split (shared renderer / BOQ composition / BOQ customization / BOQ data preparation) is explicit (§6.4).
- [ ] Readiness conditions before BOQ PDF implementation are listed (§6.6).
- [ ] Renderers receive prepared data and never calculate (§5.2).
- [ ] PDF customization stays document-font-only and renderer-independent (§5.3).
- [ ] PDF, view, and form consume one set of prepared values (§7).

### Presentation of domain features
- [ ] CP/SP/profit presentation follows §8.1 with no computation in components.
- [ ] Group presentation uses the new vocabulary and Layer 1 + Layer 2 subtotals (§8.2).
- [ ] Sub Description renders per item, never as a column (§8.3).
- [ ] Photos render from `image_url` behind `showItemImages` (§8.4).
- [ ] Responsive behavior cites established evidence only (§8.5).
