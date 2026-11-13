# 🏗️ Waterfall Roadmap & Phased Execution Sequence

- **Status:** AUTHORITATIVE LIVING ROADMAP & RECONCILED EXECUTION SEQUENCE
- **Revision:** 2026-11-12
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Presentation Layer
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Eight In-Scope Document Types. BOQ Excluded.
- **Evidence labels used in this document:** **VERIFIED** = directly inspected in the repository on 2026-11-12 · **REPORTED** = supported by a supplied completion report, not revalidated · **PARTIAL** = implementation exists, acceptance criteria incomplete · **PENDING** = not implemented or not verified · **BLOCKED** = blocked by a known dependency · **SUPERSEDED** = replaced by a newer decision.

---

## 1. Master Progress Bar

**Milestone completion (by table in Section 3, not by gate approval):**

Completed milestone IDs: **M0, M1A, M1B, M5 (sub-tracks M5a–M5e), M7, M8, M9, M13, M14.**
In flight: **M2, M3, M4.**
Pending: **M1C, M6 (superseded by M12–M15), M10, M11, M12, M15.**

- **The `@react-pdf/renderer` dependency is retired as of 2026-11-12** — package removed from `package.json`, lockfile resolved clean by Bun, all four live import sites removed or reworked, `test-pdf.tsx` harness deleted. Engine-migration completeness does not certify families; Gate 4 criterion 4 (certification) and Gates 1–3 remain open.
- **Engine migration of all eight in-scope document families is complete as of 2026-11-12** — every family now renders production PDFs through Forme or Forme+PDFCN. This is an **engine-migration status, not a certification status** (see Sections 3, 4 and 6).
- Gate 1, Gate 2, Gate 3 remain **OPEN**. Gate 1/2/3 are preconditions to commercial certification (M4). Gate 4 (Retirement / Removal Gate) was newly defined on 2026-11-12; criteria 1–3, 5–8 are met as of the 2026-11-12 purge, criterion 4 (families certified per M12) remains OPEN.
- Milestones M1C, M2–M4 carry percentage values recorded as of 2026-11-01. This revision adds no new percentage estimates. No overall percentage is asserted.

---

## 2. Status Legend

- ✅ **COMPLETE** — Specification or phase executed, verified, and accepted.
- 🔄 **IN PROGRESS** — Active work package under development. The exit gate is open.
- 🛠️ **CORRECTED** — Phase executed, then patched to resolve defects.
- ⏭️ **SUPERSEDED** — Task or approach replaced by a newer architectural decision.
- ⛔ **PENDING** — Awaiting execution; blocked until preceding gates pass.
- ⛔ **OPEN** — Historical gate that is not signed off.
- `[~]` **PARTIAL** — Sub-step executed. The full exit condition is not met.
- Evidence: **VERIFIED / REPORTED / PARTIAL / PENDING / BLOCKED** (see header).

---

## 3. Milestone Tracker & Gating Table

| ID | Milestone / Phase | Scope Summary | Priority | Status | Evidence | Target Deliverables & Gating | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M0** | **Discovery & Problem Register** | Root cause analysis on `SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`. PRD suite update and baseline freeze. | CRIT | ✅ COMPLETE | VERIFIED | Authoritative PRD suite in `docs/prd/pdf-rendering-migration/`. | None |
| **M1A** | **PDF Architecture Contracts** | Responsibility definition across Domain Preparation, Resolver, Customization, Presentation, Forme, and Delivery. | CRIT | ✅ COMPLETE | VERIFIED | Specification: `docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`. | M0 |
| **M1B** | **Shared Font & Media Infrastructure** | TrueType SFNT requirement, font inventory, WOFF rejection, CORS reality, Text Preservation Rule, single font authority. | CRIT | ✅ COMPLETE | VERIFIED | Specification: `docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md`. | M1A |
| **M1C** | **PO Canonical Preparation Contract** | Author `preparePurchaseOrderDocument.ts`, adapt PO supplier-facing fields and calculations, integrate into commercial group. | HIGH | ⛔ PENDING | BLOCKED — not started | Canonical PO prepared document contract and resolver adapter. | M1A |
| **M2** | **Natural Pagination (Normal Mode First)** | Calibrated table columns (candidate ≥ 72 pt make), adaptive closing layout, repeating headers, dynamic footers, selective keep-together, oversized rows. | CRIT | 🔄 IN PROGRESS | PARTIAL (as of 2026-11-01); no new completion claim in this revision | **GATE 1: Representative Document Suite Sign-Off**. Premature page breaks eliminated on `SASQUO-000427`. | M1B, M1C |
| **M3** | **Compact & Force 1 Page Modes** | Wire 32 candidate compact tokens, two-pass measurement via `renderDocumentWithLayout`, legibility-first safeguards (candidate 7 pt floor), fallback. | HIGH | 🔄 IN PROGRESS | PARTIAL (as of 2026-11-01); no new completion claim in this revision | **GATE 2: Compaction Tests**. Deterministic compaction without content loss. | M2 |
| **M4** | **Commercial Reference Certification** | Full Quotation, Invoice, and PO templates in Forme, Landscape mode, preview parity, visual regression against legacy output. | CRIT | 🔄 IN PROGRESS | PARTIAL — commercial templates are Forme-only in code (VERIFIED); named-sample recertification is not done | **GATE 3: Pre-Production Approval**. Commercial family certified for live traffic switchover. | M3 |
| **M5** | **Document-Family Forme Migrations** | Split into sub-tracks M5a–M5e (see below). All five production migrations declared complete by their migration reports; code paths re-verified by this audit (VERIFIED). | HIGH | ✅ COMPLETE (migration only) | VERIFIED / REPORTED — see M5a–M5e | All 8 document families render on Forme or Forme+PDFCN. Certification is tracked in M4, M10, M11 and M12. | None (migration executed outside the gate order) |
| **M5a** | **Receipt Forme Migration** | Forme Receipt template (`src/components/pdf/forme/ReceiptFormeDocument.tsx`); React-PDF production renderer `src/components/pdf/ReceiptPdf.tsx` deleted; download/share via `renderReceiptPdfBlob`. | HIGH | ✅ COMPLETE (migration) | REPORTED (2026-11-12 report); VERIFIED (dead files absent, template registered) | Receipt family out of React-PDF. Certification pending under M12. | None (executed outside gate order) |
| **M5b** | **Waybill Forme Migration** | Six populated templates + blank template migrated (`src/components/pdf/forme/waybill/`); React-PDF waybill renderers deleted; download via `buildBlob`. | HIGH | ✅ COMPLETE (migration) | REPORTED (2026-11-12 report); VERIFIED (source tree) | Waybill family out of React-PDF. `downloadPdfFromElement` retained as delivery utility (see Section 5). Certification pending under M12. | None (executed outside gate order) |
| **M5c** | **Project Documents Forme Migration** | Forme implementation (`src/components/pdf/forme/ProjectDocumentFormeDocument.tsx`); `ProjectDocumentPDF.tsx` deleted; shared helper `renderProjectDocumentPdfBlob`. | MED | ✅ COMPLETE (migration) | REPORTED (2026-11-12 report); VERIFIED (dead files absent) | Project Documents family out of React-PDF. Certification pending under M12. | None (executed outside gate order) |
| **M5d** | **RFQ Forme Migration** | Two Forme templates (Mosaic, Executive) under `src/components/pdf/forme/rfq/`; legacy ids `modern→mosaic`, `bordered_schedule→executive`; React-PDF RFQ renderers deleted. | HIGH | ✅ COMPLETE (migration) | REPORTED (2026-11-12 report); VERIFIED (template registry & routes) | RFQ family out of React-PDF. Certification pending under M12. | None (executed outside gate order) |
| **M5e** | **CSR Forme+PDFCN Migration** | All five templates (Industry `8`, Zinc `3`, Minimal `6`, Blueprint Landscape, Portrait Reference) render via pdfcn/Forme; preview, download, share, blank and post-save download use Forme; React-PDF CSR renderers and HTML preview deleted; ink parity closed for handwriting fields. | HIGH | ✅ COMPLETE (migration) | REPORTED (2026-11-12 migration report); VERIFIED (registry `src/components/pdf/pdfcn/csr/index.ts`, migrated sources present) | CSR family out of React-PDF. Physical print verification and picker parity pending under M12. | None (executed outside gate order) |
| **M6** | **Legacy Deprecation & Cleanup** | Superseded by M12–M15 as of 2026-11-12. See Section 6. | MED | ⏭️ SUPERSEDED | SUPERSEDED | Superseded by Gate 4 & M13. | M5 |
| **M7** | **Evergreen Forme Migration and Legacy Retirement** | Migrate the existing Evergreen PDF template to the Forme architecture. | CRIT | ✅ COMPLETE | VERIFIED (report; tests) | Evergreen Forme Document live; legacy files retired. | M6 |
| **M8** | **Landscape Rebuild from Scratch** | Rebuild the A4 Landscape template cleanly on Forme. | HIGH | ✅ COMPLETE | VERIFIED (report; tests) | Landscape rebuild verified via MuPDF rasterization. | M7 |
| **M9** | **Migrate Three Additional Commercial HTML Templates to Forme** | Architectural Frame, Executive, Heritage House migrated to Forme. | CRIT | ✅ COMPLETE | VERIFIED (report; tests) | All 3 templates live; picker and resolver integrated. | M8 |
| **M10** | **Purchase Order (PO) Template Integration** | Extend the migrated commercial template system to support Purchase Orders. | HIGH | ⛔ PENDING | PARTIAL — POs render through the commercial Forme pipeline via `PurchaseOrderDetail.tsx` → `generatePurchaseOrderPdf` → `resolveCommercialPdfRoute` → `-forme` routes (VERIFIED). Missing: M1C canonical prep contract; Gate 3 certification. | PO-specific certification + `preparePurchaseOrderDocument.ts`. | M9 (partial), M1C |
| **M11** | **Cost Pricing Sheet (CPS) Template Integration** | Extend the migrated commercial template system to support CPS. | HIGH | ⛔ PENDING | PARTIAL — CPS exports through the commercial Forme pipeline via `domain/cps/pdfDownloadHandler.ts` (`generateCpsCommercialPdfBlob`) (VERIFIED); CPS-specific font defect (VER-02) and commercial-template fit remain open. | CPS font fix (VER-02), verified delivery path, representative CPS documents, Gate 3 alignment. | M9 (partial) |
| **M12** | **Document-Family Certification, Visual Parity & Delivery Closeout** | For every migrated family: (a) preview ↔ exported PDF parity, (b) visual parity vs the retired React-PDF output where it exists, (c) regression suite presence, (d) `CompositePdfDelivery` connectivity or documented equivalent, (e) CPS delivery, (f) CSR blank/field-mode and Waybill/RFQ delivery parity, (g) Letter family formally recorded as out of PDF scope. | CRIT | ⛔ PENDING | PENDING | Signed certification checklists per family; no family may claim certification without (a)–(d). | M2, M5, M4 |
| **M13** | **Final React-PDF Consumer Audit & Retirement Plan** | Repository-wide audit of remaining React-PDF references. Executed 2026-11-12; the audit evidence base is Section 4/5 and decisions DEC-37 (execution) and DEC-38 (rollback). | CRIT | ✅ COMPLETE | VERIFIED | Reviewed retirement matrix (Section 5). The purge executed under an authorized task. | M5, M9 |
| **M14** | **Shared-Infrastructure Retirement & Package Purge** | Executed 2026-11-12. Deleted: `src/lib/pdf/DefaultPdfGenerator.ts`, `src/lib/pdf/PdfGenerator.ts` (dead interface), `src/lib/pdfFontRegistry.ts`, `src/domain/pdf/customization/fontRegistry.ts`, `src/components/pdf/pdfCurrency.tsx`, root `test-pdf.tsx` (React-PDF harness at HEAD). Removed the `element` branch of `downloadPdf.tsx`; pruned `PdfGenerationRequest.engine`/`_engine` (dead parameter); uninstalled `@react-pdf/renderer`; `bun install` rebuilt `bun.lock` (zero `@react-pdf/*` entries); `pdfCurrency.test.js` rewritten for the Active Contract. | CRIT | ✅ COMPLETE | VERIFIED (this task) | Zero active production/test imports; zero package dependencies; lockfile consistent. Delivery contracts preserved; `downloadPdfFromElement` API retained (`buildBlob` required). | M13 (passed) |
| **M15** | **Post-Removal Stabilization, Regression & Rollback Gate** | Focused PDF regression suite re-run post-purge (184/192; the 8 failures are pre-existing at HEAD and untouched by the purge). Rollback strategy recorded (DEC-38). Full stabilization sign-off (smoke exports per family after any release, monitoring note) remains open — not claimed here. | MED | 🔄 IN PROGRESS | PARTIAL | Gate 4 criterion 4 closes when M12 closes. | M14 |

> [!NOTE]
> **Recorded sequence deviation (2026-10-30).** Industrial commercial template authoring (M2, M3, M4) started before M1C completed and before Gate 1 and Gate 2 passed. The gates stay closed. Gate 3 stays blocked until Gate 1 and Gate 2 pass.

---

## 4. Verified Document-Family Inventory (as of 2026-11-12)

**Reading the columns.** *Engine* = renderer of record for production PDFs. *Preview* = how the user previews the PDF in-app. *Delivery* = download/share path. *Migration* = engine migration task. *Certification* = acceptance criteria of Sections (a)–(d) in M12. **A Forme template existing does not certify a family.**

| Family | Engine | PDFCN | Templates | Preview path | Download / share path | React-PDF dependency | Migration | Certification | Evidence | Outstanding work |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice** (`invoice`) | Forme | Direct (`src/components/pdf/forme/`) | `IndustryFormeDocument`, `IndustrialFormeDocument`, `MinimalFormeDocument`, `EvergreenFormeDocument`, `LandscapeFormeDocument`, `ArchitecturalFormeDocument`, `ExecutiveFormeDocument`, `HeritageHouseFormeDocument`, `MosaicFormeDocument` | HTML/Document view + Forme blob; no React-PDF preview | `ViewInvoice` → `generateInvoicePdf`/`generateInvoicePdfBlob` → `resolveCommercialPdfRoute` → `-forme` route (VERIFIED) | None — `@react-pdf/renderer` removed 2026-11-12 | ✅ Forme (pre-existing, predates this audit) | ⛔ Not certified — Gate 3 open | VERIFIED (code, tests) | M4 (Gate 1/2/3), sample recertification, parity sign-off |
| **Quotation** (`quotation`) | Forme | Direct (`src/components/pdf/forme/`) | Same commercial templates as Invoice | Same as Invoice | `ViewQuotation` → `src/domain/quotation/pdfDownloadHandler.ts` → `generateQuotationPdfBlob` → `-forme` route (VERIFIED) | Same as Invoice — none, `@react-pdf/renderer` removed | ✅ Forme | ⛔ Not certified — Gate 3 open | VERIFIED (code, tests) | M4; `@formepdf` glyph verification (TS-2) |
| **Purchase Order** (`po`) | Forme | Direct (commercial pipeline) | Same commercial templates; PO identity & counterparties preserve supplier semantics | Same as Invoice (`PurchaseOrderDetail.tsx` preview) | `PurchaseOrderDetail.tsx` → `generatePurchaseOrderPdf` / `generatePurchaseOrderPdfBlob` → `resolveCommercialPdfRoute` → `-forme` route (VERIFIED) | None — `@react-pdf/renderer` removed | ✅ Forme (engine); PO-specific canonical contract missing | ⛔ Not certified | VERIFIED (code); M1C missing (BLOCKED) | **M1C (preparePurchaseOrderDocument.ts)**, M10, Gate 3, PO template preservation QA |
| **CPS** (`cps`) | Forme | Direct (commercial pipeline) | Same commercial templates routed for CPS (no dedicated CPS Forme template found in source — VERIFIED absent) | HTML presentation view (`ViewCps.tsx` renders `CostPricingSheetViewPresentations`); no in-app PDF preview iframe | `domain/cps/pdfDownloadHandler.ts` → `generateCpsCommercialPdfBlob` → `resolveCommercialPdfRoute` → `-forme` route (VERIFIED) | None (the 2026-11-12 purge removed it; CPS uses Forme fonts) | ✅ Forme via commercial pipeline (pre-existing); no dedicated CPS template | ⛔ Not certified | VERIFIED (code); defect VER-02 (`.woff` → Helvetica fallback) open | **VER-02 font fallback fix**, M11 (commercial-template fit vs dedicated design), M4/Gate 3 |
| **RFQ** (`rfq`) | Forme | Direct (Forme docs under `forme/rfq/`) | `RfqMosaicDocument`, `RfqExecutiveDocument` (2 templates; legacy `modern→mosaic`, `bordered_schedule→executive`) | `RfqPreview` (preview, Forme-based per Forme report) | `ViewRfq` → `renderRfqPdfBlob` → `downloadPdfFromElement({ buildBlob })` — Forme-only (VERIFIED) | `downloadPdfFromElement` retained (delivery only; `element` branch removed 2026-11-12) | ✅ Forme (2026-11-12) | ⛔ Not certified | REPORTED + VERIFIED (registry `forme/rfq/RfqFormeDocument.tsx`) | M12: delivery parity, unpriced-semantics regression suite |
| **Waybill** (`waybill`) | Forme | Direct (Forme docs under `forme/waybill/`) | 6 populated templates (`evergreen`, `minimal`, `thermal`, `classic`, `slate`, `premium`) + blank template | `ViewWaybill` page (HTML preview of Forme bytes) | `ViewWaybill` → `renderWaybillPdfBlob` → `downloadPdfFromElement({ buildBlob })` Forme-only (VERIFIED) | `downloadPdfFromElement` retained (delivery only; `element` branch removed 2026-11-12) | ✅ Forme (2026-11-12) | ⛔ Not certified | REPORTED + VERIFIED | M12: visual parity (blank/prefilled), regression tests green, delivery telemetry |
| **Receipt** (`receipt`) | Forme | Direct (`forme/ReceiptFormeDocument.tsx`) | `ReceiptFormeDocument` (1 template; legacy ids preserved) | `ViewReceipt` page (Forme-based) | `ViewReceipt` → `renderReceiptPdfBlob` (VERIFIED) | None | ✅ Forme (2026-11-12) | ⛔ Not certified | REPORTED + VERIFIED | M12: financial immutability checks, regression suite |
| **Project Documents** (`project_document` / `generated`) | Forme | Direct (`forme/ProjectDocumentFormeDocument.tsx`) | `ProjectDocumentFormeDocument` (1 template) | `ProjectDocumentView` (Forme-based) | `ProjectDocumentCard`/`ProjectDocumentView` → `renderProjectDocumentPdfBlob` (VERIFIED) | None | ✅ Forme (2026-11-12) | ⛔ Not certified | REPORTED + VERIFIED | M12: contracts parity, project metadata regression |
| **CSR** (`csr`) | Forme | PDFCN (`pdfcn/csr/`) | `CsrLandscapeBlueprintTemplate`, `CsrPortraitReferenceTemplate`, `CsrIndustryFormeDocument`, `CsrZincFormeDocument`, `CsrMinimalFormeDocument` (2 Forme + 3 migrated Forme + legacy aliases `3`/`6`/`8`) | `CsrFormePreview` — iframe of Forme bytes from the same render path (VERIFIED) | `ViewCSR` download/share and `CsrFormPage` blank/post-save downloads — all via `resolvePdfcnDocument` + `renderPdfcnToBlob` (VERIFIED) | None (blank download path preserves Zinc Light id `3`) | ✅ Forme (2026-11-12, 5/5 templates) | ⛔ Not certified | REPORTED + VERIFIED (10/10 tests; 1-page renders) | M12: blank + field-mode verification, ink parity device check, delivery parity |
| **Letters** (`letter`) | HTML only | None | None — no PDF renderer exists | HTML document view (`ViewLetter.tsx`) | None — no PDF export found in repository | **No PDF generation in any path** | Not applicable | Not applicable | VERIFIED (grep: zero `react-pdf`, `forme`, `downloadPdf` refs in letter pages) | None for purge. If Letters gains an export, scope it to PDFCN/Forme from birth. Formerly un-inventoried family — added by this audit |
| **BOQ** | — | — | — | — | — | — | Explicitly excluded per DEC-02 | Not applicable | VERIFIED (PRD scope) | None |

**Families checked but not found as PDFs:** statements, reminder letters, delivery notes, quotations-designed-by-name (only the commercial set), and all other correspondence — none have a PDF route in `src/` on 2026-11-12.

**Reading the migration column carefully.** Migration and certification are deliberately separated in this table. All families are on Forme today. None are certified.

---

## 5. React-PDF Retirement Matrix — EXECUTED 2026-11-12

**Classification key.** **A** = Active production dependency · **B** = Active test/dev dependency · **C** = Shared helper with a real remaining consumer · **D** = Unused executable code · **E** = Comment-only / documentation reference · **F** = Historical fixture / compatibility reference · **G** = Package or transitive dependency reference.

| # | Candidate | Class | Disposition after purge (2026-11-12) |
| :--- | :--- | :--- | :--- |
| 1 | `@react-pdf/renderer` (`package.json`) | **G** | **REMOVED.** `bun install` rebuilt `bun.lock`; zero `@react-pdf/*` entries remain (fns, font, image, layout, pdfkit, primitives, reconciler, render, renderer, stylesheet, svg, textkit, types). Direct dependency removed; no transitive copy is required by any remaining consumer. |
| 2 | `src/lib/pdfFontRegistry.ts` | **D** | **DELETED** 2026-11-12 (sole consumer, `customization/fontRegistry.ts`, also deleted). |
| 3 | `src/lib/pdf/DefaultPdfGenerator.ts` | **D** | **DELETED** 2026-11-12. The dead `src/lib/pdf/PdfGenerator.ts` interface, which implemented nothing after this, was **DELETED** in the same change. `@/lib/pdf` exports remain intact (delivery classes, feedback bus). |
| 4 | `src/components/pdf/pdfCurrency.tsx` | **B/D** | **DELETED** 2026-11-12 after `pdfCurrency.test.js` was rewritten to drop the static pin and keep the active `industryAdapter`/`formatters`/`pdfSharedFonts` assertions. Test passes (2/2). |
| 5 | `src/components/document-view/shared/downloadPdf.tsx` | **C** | **RETAINED** unchanged as a delivery utility. The dead `element` branch and `element` prop were **removed**; `buildBlob` is now the required contract. `ViewWaybill` and `ViewRfq` consumers unchanged (both already passed `buildBlob`). Verified by typecheck. |
| 6 | `src/domain/pdf/customization/fontRegistry.ts` | **D** | **DELETED** 2026-11-12 with row 2. |
| 7 | `src/components/pdf/industryAdapter.ts` — `industry-react-pdf` string | **F** | **RETAINED** 2026-11-12. Backward-compat normalization; zero runtime dependency. CSR localStorage legacy ids likewise retained. |
| 8 | Test fixtures naming `industry-react-pdf` (`templateIds.test.js`, `formeIndustryTemplate.test.ts`, `dualIndustryRendererRouting.test.ts`) | **F** | **RETAINED** and field-adjusted 2026-11-12: the dead second-argument `_engine` calls were removed (`resolveCommercialPdfRoute` now takes 1 argument). Assertions unchanged in meaning; suite green (part of 184/192 run, 8 failures pre-existing). |
| 9 | `src/components/csr/preview-templates/` | — | **Purged** (2026-11-12 CSR migration). No action. |
| 10 | `docs/` & historical reports mentioning react-pdf | **E** | **RETAINED.** Oct 30 investigations and archive docs describe the pre-migration baseline; updated by this revision without erasing history. |
| 11 | `tools/`, `scripts/` | — | **None** found (zero matches before and after purge). |
| 12 | `test-pdf.tsx` (repo root) | **D** | **DELETED** 2026-11-12 — a committed React-PDF-only canary harness importing `@react-pdf/renderer` and long-deleted CSR React-PDF templates. Tracked at HEAD; no replacement; no runtime consumers. |

**Self-check results after the purge (2026-11-12).**
- Zero active production imports of `@react-pdf/renderer` in `src/` (repository-wide grep).
- Zero test/development imports of the package in `src/` (remaining matches are retirement-contract string fixtures and prohibition assertions).
- Zero package dependencies on `@react-pdf/*` in `package.json`/`bun.lock`.
- `pdfSharedFonts.ts`, `pdfFillableFonts.ts`, `pdfDesignPreset.ts` — **retained**; live Forme-adjacent consumers verified.
- Delivery contracts preserved: `downloadPdfFromElement({ buildBlob, ... })`, `exportPdfToDevice`, `openExportedPdf`/`shareExportedPdf` fallback, `CompositePdfDelivery`, `DefaultFeedbackBus`, `emitFeedback`.
- Android signed-build assets (`android/app/src/main/assets/public/assets/`) still embed a pre-purge bundle containing react-pdf; they are build outputs, not source, and will be refreshed by the next authorized Capacitor build.

**Self-check failure modes (per retirement requirements).**
- Zero marks on `pdfSharedFonts.ts` / `pdfFillableFonts.ts` are not claimed — they remain consumed by `pdfDesignPreset.ts` in production code paths (VERIFIED 2026-11-12). They are **not** purge candidates in M14.
- Row 4's static test is the only test pinning a react-pdf-touching file. If a task attempts removal without the test update, `pdfCurrency.tsx` cannot go.
- No retirement recommendation exists for a helper that has a real consumer (rows 4 vs 5 and 7 illustrate the split).

---

## 6. Waterfall Execution Order & Gate 4

Dependency-driven order. **Migrating ≠ Certifying ≠ Purging** are three separate activities.

```
M1C ──► M2 ──Gate 1──► M3 ──Gate 2──► M4 ──Gate 3──► [CERTIFIED COMMERCIAL]
 │                                                   │
 │       M5a–M5e ✅ (migration done 2026-11-12)      ▼
 │                └─────► M12 (per-family certification & parity)
 │                                                      │
 ├─────► M10, M11 (PO/CPS formal integration) ─────────┤
 ▼                                                      ▼
M13 ✅ ──► M14 ✅ ──Gate 4 (Retirement/Removal) — CRITERION 4 OPEN
                       (criteria 1–3, 5–8 met 2026-11-12)
                       │
                       ▼
              M15 (post-removal stabilization — in progress)
```

**Gate 4 (Retirement / Removal) — status as of 2026-11-12.**

1. ✅ **Zero active production consumers** — repository-wide import analysis shows no `src/` runtime import of the package; the four live sites from the pre-purge audit were removed/reworked.
2. ✅ **Zero test/development consumers** — no test imports the package; remaining mentions are retirement-contract string fixtures and prohibition assertions.
3. ✅ **Delivery contracts preserved** — `downloadPdfFromElement` keeps `fileName`/`subdirectory`/`buildBlob`, `exportPdfToDevice`, native open/share fallback, `CompositePdfDelivery`, `DefaultFeedbackBus`, `emitFeedback`.
4. ⛔ **All eight families certified** — OPEN. Families are migrated (engine-only). Certification lives in M12 and is explicitly not claimed.
5. ✅ **Packages purged in M14** — `@react-pdf/renderer` removed from `package.json`; `bun.lock` rebuilt, zero `@react-pdf/*` entries.
6. ✅ **Focused regression suite outcome recorded** — 184/192 in `src/tests/pdf` pass; the 8 failures are pre-existing at HEAD (untouched files; verified via git) and unchanged by the purge. 37/37 Forme family suites and 73/73 commercial/CSR/font/routing checks pass pre- and post-purge.
7. ✅ **Rollback strategy** — see DEC-38. Revert list: this purge's diff (package.json, bun.lock, `src/components/document-view/shared/downloadPdf.tsx`, `src/components/pdf/index.ts`, `src/components/pdf/core/safeText.ts`, `src/components/pdf/pdfCurrency.tsx` (deleted), `src/lib/pdfFontRegistry.ts` (deleted), `src/lib/pdf/DefaultPdfGenerator.ts` and `src/lib/pdf/PdfGenerator.ts` (deleted), `src/domain/pdf/customization/fontRegistry.ts` (deleted), `src/tests/pdf/pdfCurrency.test.js`, `src/tests/pdf/dualIndustryRendererRouting.test.ts`, `src/tests/critical/cpsCommercialReplacement.test.ts`, `test-pdf.tsx` (deleted), `src/components/design-lab/DocumentEmailPreview.tsx`. Rollback = `git show HEAD:<path>` restore of deleted files + `bun add @react-pdf/renderer@4.3.2` + `bun install`.
8. ✅ **No `bun run build`** — not run (permanent prohibition). `bun run audit:load` not run (no schema/data-layer change).

**Consumers of the retired package have no path back.** Residual risk is confined to the signed Android build bundle and pre-purge native builds — both build outputs, refreshed by the next authorized Capacitor build.

**Next actionable task.** M12 — *Document-Family Certification* (parity, regression, delivery closeout) — with M1C and the CPS VER-02 defect as dependencies for PO/CPS certification readiness. M15 stabilization runs in parallel.

---

## 7. Document Family ↔ Milestone Traceability

- Invoice / Quotation → M4 (certification), M13/M14 (retirement pairing)
- PO → M1C → M10 → M4/Gate 3 → M13/M14
- CPS → M11 → M4/Gate 3 → M13/M14 (also blocked by open defect VER-02)
- RFQ / Waybill / Receipt / Project Documents / CSR → M12 → M13/M14
- Letters → out of PDF scope (recorded; revisit at M12)
- BOQ → excluded permanently (DEC-02)

---

## 8. Work Log

### 2026-10-30 — Discovery and problem register (M0)
- Audited `IndustryTemplate.tsx`, `table.ts`, `compact.ts`, and `safeText.ts`.
- Traced the `SASQUO-000427` page break: a 113.73 pt closing block overflowed 75.25 pt of free space.
- Traced the `SASQUO-000428` character corruption: a double-prime serialized into digits through a 1-byte WinAnsi path.

### 2026-11-01 — Architecture contracts and media specification (M1A, M1B)
- Published the responsibility contract across Domain Preparation, Resolver, Customization, Presentation, Forme, and Delivery.
- Published the font and media infrastructure specification: TrueType SFNT only, WOFF rejected, no silent font mapping, Text Preservation Rule, single font authority.
- Migration of the first two CSR templates to Forme/pdfcn (Blueprint Landscape, Portrait Reference) and the commercial template pipeline.

### 2026-11-01 — Industrial Forme commercial template correction (M2, M3, M4 in flight)
**Implementation**
- `src/components/pdf/forme/IndustrialFormeDocument.tsx` — template corrections.
- `src/components/pdf/forme/industrialLayout.ts` — column allocation and group-label parsing.
- `src/components/pdf/forme/glyphs.tsx` — per-glyph font runs.
- `src/components/pdf/forme/fonts.ts` — dual-runtime source resolution and Greek subset registration.
- `public/fonts/NotoSansGreek-Regular.ttf` — internal OFL glyph subset.
- `src/components/pdf/index.ts` — route resolver returns `industrial-forme` for the `industrial` template.
- `src/components/pdf/industryAdapter.ts` — adds the `currency` field from the document identity.
- `src/components/pdf/engine/group.ts` — prefers the supplied `groupLabel`.
- `src/domain/quotation/amountInWords.ts` — new resolver for the amount in words.
- `src/domain/quotation/previewModel.ts` and `src/domain/quotation/pdfDownloadHandler.ts` — use the authoritative amount in words; remove the fixed currency code.

**Review corrections**
- Removed the `pt` and `Mt` unit suffixes and the `COMMERCIAL DOCUMENT` eyebrow.
- Removed the internal codes `N-01`, `T-01`, `SCH-01`, and `PAY`, and the `PARTY` and `ISSUER` chips.
- Removed the currency chip from the total summary. The template renders no currency code. The value comes only from `data.totals`.
- Added an amount-in-words panel: 8.5 pt bold text (7.5 pt compact), an orange left rule, and a label. The value comes from the stored field or `computeDocument().totalPayable`. The quotation save workflow still stores an empty string; the domain layer resolves the value and the save workflow is unchanged.
- Removed the `ISSUED BY` panel, the TIN, and all `customInfo` entries. The tagline moved to the masthead and still obeys `showTagline`.
- Missing data omits the field and its label. The template renders no `-`, `—`, `–`, `N/A`, `null`, `undefined`, or `NaN`. Zero remains valid data.

**Verification**

| Command | Result |
| :--- | :--- |
| `bun run typecheck` | Pass. |
| `bunx eslint` on the changed component, helpers, and new test | Pass. Pre-existing `no-explicit-any` and unused declarations remain in `previewModel.ts` and `pdfDownloadHandler.ts`. |
| `bun test src/tests/pdf/formeIndustrialTemplate.test.ts` | 19 pass, 0 fail. |
| `bun test src/tests/pdf/dualIndustryRendererRouting.test.ts` | 5 pass, 0 fail. |
| `bun test src/tests/quotation/quotationAmountInWords.test.ts` | 5 pass, 0 fail. |
| `bun run build` | Not run. Permanently banned on this host (4 GB RAM). |
| `bun run audit:load` | Not run. No schema, query, or data-layer change. |

The tests inspect the page count, page size, link annotations, font resources, text baselines, drawn rectangles, and the serialized element tree. The host has no PDF rasterizer. No page screenshot inspection took place.

### Known pre-existing failures (not caused by this pass)
- `src/tests/pdf/index.test.js` — 2 failures at HEAD. The test expects `150,000` and `text`; the committed adapter returns `₦ 150,000` and `rich-text`.
- `src/tests/pdf/totalsTruthPreview.test.js` — 3 failures at HEAD. The test expects the older `ViewInvoice` and `ViewQuotation` source strings. Those pages were not changed.

### 2026-11-08 — Commercial template migration wave Forme-only (M7, M8, M9 complete)
- M7: Evergreen reimplemented as `src/components/pdf/forme/EvergreenFormeDocument.tsx`; legacy React-PDF files deleted; footer anchoring and logo fallback remediated. Status 100% complete.
- M8: Landscape template rebuilt from scratch (`forme/landscape/`) with coordinate rulers; verified via MuPDF rasterization. Status 100% complete.
- M9: Architectural Frame, Executive Luxury, Heritage House migrated; routed, picker-integrated, tested. Status 100% complete.
- Commercial stack now resolves every route to `-forme` (`src/components/pdf/index.ts`); `resolveCommercialPdfRoute` ignores the historical `engine` argument.

### 2026-11-12 (second entry) — React-PDF retirement (M13, M14)

**Deleted:** `src/lib/pdfFontRegistry.ts` · `src/domain/pdf/customization/fontRegistry.ts` (dead chain) · `src/lib/pdf/DefaultPdfGenerator.ts` · `src/lib/pdf/PdfGenerator.ts` (dead interface, deleted in the same pass) · `src/components/pdf/pdfCurrency.tsx` · root `test-pdf.tsx` (tracked at HEAD; a committed React-PDF-only canary importing `@react-pdf/renderer` and long-retired CSR React-PDF templates).

**Reworked:** `downloadPdf.tsx` — `element` prop and its React-PDF branch removed; `buildBlob` now required; all callers unchanged. `components/pdf/index.ts` — `PdfGenerationRequest.engine` and `_engine` parameter removed (dead dual-renderer switch; callers and resolver unchanged in behaviour). `pdfCurrency.test.js` — static React-PDF assertions dropped, active-contract assertions retained and passing. `dualIndustryRendererRouting.test.ts`, `cpsCommercialReplacement.test.ts` — vestigial second-argument calls removed. `safeText.ts` — comment reworded to the Forme glyph-routing contract.

**Dependency:** `@react-pdf/renderer` removed from `package.json`; `bun install` rebuilt `bun.lock` — zero `@react-pdf/*` entries. The pre-existing concurrent font-audit edits in `package.json`/`bun.lock` were preserved by using Bun's install, not by overwriting them.

**Verification (this task):** `bun run typecheck` — only the three pre-existing HEAD errors (`forme*Template.test.ts` TS2698). `bun test src/tests/pdf` — 184/192 pass; 8 failures, all in files untouched by the purge and verified pre-existing (git status of those paths clean). Critical commercial/CSR/font/routing suites — 73/73 pass. Forme family suites — 37/37 + 3/3 pass. Repository-wide search — zero runtime/test imports of the package; zero manifest entries; residual mentions are retirement-contract string fixtures, prohibition assertions, historical docs and build artifacts.

**Not verified / not done:** No browser or device runtime validation. `bun run build` not run (permanent prohibition). Families are migrated, not certified — Gates 1–3 open; Gate 4 criterion 4 open. Android signed assets still embed a pre-purge bundle; next authorized Capacitor build refreshes them.

### 2026-11-12 — Family-wide Forme migration completion & React-PDF retirement audit (M5a–M5e)
**Completed engine migrations (uncommitted working tree at the time of this entry).**

- Receipt: Forme implementation; `src/components/pdf/ReceiptPdf.tsx` deleted; `ViewReceipt` download/share via `renderReceiptPdfBlob`.
- Waybill: 6 populated + blank template migrated (`forme/waybill/`); `WaybillPDF.tsx` and template-specific React-PDF files deleted; `ViewWaybill`/`WaybillFormPage` downloads via `buildBlob`.
- Project Documents: Forme implementation; `ProjectDocumentPDF.tsx` deleted; `ProjectDocumentCard`/`ProjectDocumentView` rewired.
- RFQ: `forme/rfq/RfqMosaicDocument.tsx`, `RfqExecutiveDocument.tsx` (+ shared `kit.tsx`); legacy mapping `modern→mosaic`, `bordered_schedule→executive`; `RfqPdfDocument.tsx`/`TableDocumentPdfDocument.tsx` deleted; 2 template picker.
- CSR: all five templates (Industry `8`, Zinc Light `3`, Minimal `6`, Blueprint Landscape, Portrait Reference) on Forme/PDFCN; `preview-templates/` and HTML preview deleted; `CsrDocumentPreview.tsx/.css` deleted; `CsrFormePreview` (iframe of Forme bytes) in place; `CsrFormPage` blank and field-mode downloads preserved on template id `3`; ink parity closed (portrait reference + blueprint landscape + the three migrated templates honour `metadata.designPreset`); 10/10 CSR tests pass; TypeScript clean (only three pre-existing HEAD errors).
- Letters family audited: no PDF generation path exists; formally out of PDF scope.

**Verification results vs this audit (read for the retirement matrix, Section 5).**
- `src/` imports of `@react-pdf/renderer`: exactly four files (`pdfFontRegistry.ts`, `DefaultPdfGenerator.ts`, `pdfCurrency.tsx`, `downloadPdf.tsx`). No tests import the package. `tools/` and `scripts/` have no matches.
- `downloadPdfFromElement` consumers: exactly two (`ViewWaybill`, `ViewRfq`); both use `buildBlob`, so the `element` branch is dead.
- `pdfFontRegistry.ts` sole consumer is the already-unused `customization/fontRegistry.ts`.
- `DefaultPdfGenerator` has no direct importers; `@/lib/pdf` consumers import delivery classes and types only.
- `pdfCurrency.test.js` statically requires `pdfCurrency.tsx`; this is the one test pinning a purge candidate.
- `bun run` commands were **not** run for this documentation revision.
- Working-tree note: the migration is **uncommitted** on branch `main` (`08d45ed0`). The purge step (M14) must account for the uncommitted baseline.
- `package.json` and `bun.lock` were already modified by a concurrent font-audit task (removal of 17 unused `@fontsource/*` packages); this audit did not touch them.

---

## 9. Gate Readiness Snapshot

| Gate | State | Blocking Items |
| :--- | :--- | :--- |
| **Gate 1 — Natural Pagination** | ⛔ OPEN | Prime and double-prime cmap verification. Oversized-row handling. Continuation-page header repetition. Measured adaptive closing layout. Selective keep-together. 7-profile suite run. |
| **Gate 2 — Compaction** | ⛔ OPEN | 32-token compact map. Two-pass measurement. Progressive compaction. Readability safeguards and fallback. 1-page and multi-page corpus run. |
| **Gate 3 — Pre-Production** | ⛔ OPEN | Gate 1 and Gate 2 sign-off. Named sample recertification. Purchase Order contract (M1C). CPS font defect (VER-02). `CompositePdfDelivery` / preview parity sign-off. |
| **Gate 4 — Retirement / Removal** | ⛔ OPEN (criteria 1–3, 5–8 met as of 2026-11-12; only criterion 4 open) | Criterion 4: eight-family certification (M12) per `Waterfall-roadmap.md` §6. |

---

## 10. Decision Log (summary — authoritative source: `decision-log.md`)

- **2026-10-30** — Forme + pdfcn selected as the target engine (DEC-01). BOQ excluded (DEC-02). Gate 1 ordering enforced (DEC-06).
- **2026-11-01** — Industrial template corrections logged; dual-renderer Industry picker approved (DEC-26/DEC-27) — **SUPERSEDED 2026-11-12**: commercial stack is Forme-only; the `industry-react-pdf` picker option was retired during the migration wave.
- **2026-11-08** — M7/M8/M9 completed; RECORDED: commercial templates all Forme; Evergreen retired.
- **2026-11-12** — M5a–M5e engine migrations complete (Receipt, Waybill, Project Documents, RFQ, CSR). Bidirectional preview=export path established (CSR iframe). RECORDED: letters are not a PDF family. RECORDED: `M6` superseded by M12–M15; Gate 4 defined. RECORDED: DEC-26/DEC-27 SUPERSEDED. Packages pinned pending purge.
- **2026-11-12 (second)** — M13 (consumer audit) and M14 (purge) executed under an authorized task: package removed, five files deleted, delivery contract pruned to `buildBlob`, TypeScript clean (3 pre-existing HEAD errors only), 184/192 PDF suite pass (8 failures pre-existing at HEAD), 73/73 critical suites and 37/37 + 3/3 Forme family suites pass, lockfile clean of `@react-pdf/*`. RECORDED: `test-pdf.tsx` (React-PDF canary) deleted; rollback recorded under DEC-38. Families remain uncertified; Gate 4 criterion 4 open.

*Historical note: the 2026-10-30 investigation remains binding evidence. Its conclusions are not rewritten in this revision; they describe the pre-migration baseline the migration eliminated.*
