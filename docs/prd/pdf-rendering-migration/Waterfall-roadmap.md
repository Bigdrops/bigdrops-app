# 🏗️ Waterfall Roadmap & Phased Execution Sequence

- **Status:** AUTHORITATIVE LIVING ROADMAP & RECONCILED EXECUTION SEQUENCE
- **Revision:** 2026-11-01
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Presentation Layer
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Eight In-Scope Document Types. BOQ Excluded.

---

## 1. Master Progress Bar

`[████░░░░░░] 44%` | **Total Milestones:** 14 | **Current Phase:** Phase M7 pending. Phases M2, M3 and M4 have in-flight work; Phases M5–M11 pending.

- Milestones M0, M1A and M1B are complete.
- Milestones M2, M3 and M4 have in-flight implementation from the Industrial Forme commercial template pass. Gate 1, Gate 2 and Gate 3 are not signed off.
- Milestones M1C, M5, M6 and M7–M11 are pending.
- The percentage is the mean of the milestone percentages in Section 3. It does not represent gate approval.

---

## 2. Status Legend

- ✅ **COMPLETE** — Specification or phase executed, verified, and accepted.
- 🔄 **IN PROGRESS** — Active work package under development. The exit gate is open.
- 🛠️ **CORRECTED** — Phase executed, then patched to resolve defects.
- ⏭️ **SUPERSEDED** — Task or approach replaced by a newer architectural decision.
- ⛔ **PENDING** — Awaiting execution; blocked until preceding gates pass.
- `[~]` **PARTIAL** — Sub-step executed. The full exit condition is not met.

---

## 3. Milestone Tracker & Gating Table

| ID | Milestone / Phase | Scope Summary | Priority | Status | % Done | Target Deliverables & Gating | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M0** | **Discovery & Problem Register** | Root cause analysis on `SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`. PRD suite update and baseline freeze. | CRIT | ✅ COMPLETE | 100% | Authoritative PRD suite in `docs/prd/pdf-rendering-migration/`. | None |
| **M1A** | **PDF Architecture Contracts** | Responsibility definition across Domain Preparation, Resolver, Customization, Presentation, Forme, and Delivery. | CRIT | ✅ COMPLETE | 100% | Specification: `docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`. | M0 |
| **M1B** | **Shared Font & Media Infrastructure** | TrueType SFNT requirement, font inventory, WOFF rejection, CORS reality, Text Preservation Rule, single font authority. | CRIT | ✅ COMPLETE | 100% | Specification: `docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md`. | M1A |
| **M1C** | **PO Canonical Preparation Contract** | Author `preparePurchaseOrderDocument.ts`, adapt PO supplier-facing fields and calculations, integrate into commercial group. | HIGH | ⛔ PENDING | 0% | Canonical PO prepared document contract and resolver adapter. | M1A |
| **M2** | **Natural Pagination (Normal Mode First)** | Calibrated table columns (candidate $\ge 72\text{ pt}$ make), adaptive closing layout, repeating headers, dynamic footers, selective keep-together, oversized rows. | CRIT | 🔄 IN PROGRESS | 35% | **GATE 1: Representative Document Suite Sign-Off**. Premature page breaks eliminated on `SASQUO-000427`. | M1B, M1C |
| **M3** | **Compact & Force 1 Page Modes** | Wire 32 candidate compact tokens, two-pass measurement via `renderDocumentWithLayout`, legibility-first safeguards (candidate 7 pt floor), fallback. | HIGH | 🔄 IN PROGRESS | 25% | **GATE 2: Compaction Tests**. Deterministic compaction without content loss. | M2 |
| **M4** | **Commercial Reference Certification** | Full Quotation, Invoice, and PO templates in Forme, Landscape mode, preview parity, visual regression against legacy output. | CRIT | 🔄 IN PROGRESS | 40% | **GATE 3: Pre-Production Approval**. Commercial family certified for live traffic switchover. | M3 |
| **M5** | **Remaining Document Families** | CPS font fix & resolver integration, CSR delivery integration, Waybill templates (Caveat font), Receipt, and RFQ migration. | HIGH | ⛔ PENDING | 0% | All 8 document types active on Forme; zero React-PDF traffic. | M4 |
| **M6** | **Legacy Cleanup & Deprecation** | Verify zero React-PDF imports via AST analysis, remove obsolete adapters, uninstall `@react-pdf/renderer` from `package.json`. | MED | ⛔ PENDING | 0% | Repository clean; `@react-pdf/renderer` removed; typecheck clean. | M5 |
| **M7** | **Evergreen Forme Migration and Legacy Retirement** | Migrate the existing Evergreen PDF template to the Forme architecture; preserve data, behaviour and pagination; verify against legacy output; retire obsolete implementation after verification. | CRIT | ✅ COMPLETE | 100% | Evergreen Forme Document live; legacy files retired; footer anchoring & logo fallbacks remediated. | M6 |
| **M8** | **Landscape Rebuild from Scratch** | Rebuild the A4 Landscape template cleanly from scratch on Forme; support invoice and quotation rendering, multipage documents, repeated headers, footer placement, tables and closing sections; verify against representative documents. | HIGH | ⛔ PENDING | 0% | Retirement of the current Landscape implementation gated by fresh-rebuild verification and a documented retirement decision. | M7 |
| **M9** | **Migrate Three Additional Commercial HTML Templates to Forme** | Migrate the three additional source commercial HTML designs individually to Forme (Architectural Frame, Executive, Heritage House); verify invoice and quotation output; retain independent design identities. | CRIT | ✅ COMPLETE | 100% | All 3 templates migrated to Forme; test suite passing; picker and resolver integrated. | M8 |
| **M10** | **Purchase Order (PO) Template Integration** | Extend the migrated commercial template system to support Purchase Orders; reuse the shared Forme rendering architecture; respect PO-specific data, terminology, supplier/vendor relationships and document semantics; verify supported PO templates and document-specific output. | HIGH | ⛔ PENDING | 0% | Must follow completion of the commercial template migrations. | M9 |
| **M11** | **Cost Pricing Sheet (CPS) Template Integration** | Extend the migrated template system to support Cost Pricing Sheets; reuse the shared Forme infrastructure without forcing CPS into an unsuitable commercial document layout; retain CPS-specific rendering requirements; verify representative CPS documents. | HIGH | ⛔ PENDING | 0% | Follows the commercial template migrations and must not compromise the existing CPS document architecture. | M9 |

> [!NOTE]
> **Recorded sequence deviation.** Industrial commercial template authoring (M2, M3, M4) started before M1C completed and before Gate 1 and Gate 2 passed. The gates stay closed. Gate 3 stays blocked until Gate 1 and Gate 2 pass.

---

## 4. Detailed Execution Steps

### Milestone M0: Discovery, Architecture Audit & PRD Baseline ✅
- [x] **Step 0.1:** Audit `IndustryTemplate.tsx`, `table.ts`, `compact.ts`, and `safeText.ts`.  
  *Status:* ✅ COMPLETE (2026-10-30)
- [x] **Step 0.2:** Trace pagination failure on `SASQUO-000427 (1).pdf` (113.73 pt closing block breaking over 75.25 pt free space).  
  *Status:* ✅ COMPLETE (2026-10-30)
- [x] **Step 0.3:** Trace character corruption on `SASQUO-000428.pdf` (double-prime `″` rendering into digits `23`, `33`, `43`).  
  *Status:* ✅ COMPLETE (2026-10-30)
- [x] **Step 0.4:** Update and consolidate PRD documentation suite in `docs/prd/pdf-rendering-migration/`.  
  *Status:* ✅ COMPLETE (2026-11-01)

---

### Milestone M1A: PDF Architecture Contracts & Responsibility Definition ✅
- [x] **Step 1A.1:** Define explicit ownership across Domain Preparation, Master Resolver, Customization, Presentation, Forme, and Delivery.  
  *Status:* ✅ COMPLETE (`docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`)
- [x] **Step 1A.2:** Enforce boundary rules: domain preparation owns business math; resolver does not own fonts, branding, or delivery.  
  *Status:* ✅ COMPLETE

---

### Milestone M1B: Shared Font & Image Asset Infrastructure Specification ✅
- [x] **Step 1B.1:** Audit physical font inventory and npm packages (revealed 0 TTF files in `@fontsource/*`; confirmed WOFF rejection by Forme).  
  *Status:* ✅ COMPLETE (`docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md`)
- [x] **Step 1B.2:** Confirm root cause of $2'' \to 23$ defect in `@react-pdf/pdfkit/lib/pdfkit.js` (4-digit hex serialization in 1-byte WinAnsi text chunks).  
  *Status:* ✅ COMPLETE
- [x] **Step 1B.3:** Demystify CORS: base64 conversion does not bypass CORS; client fetch must succeed first. Define 6-step media loading path.  
  *Status:* ✅ COMPLETE
- [x] **Step 1B.4:** Reconcile font fallback (no silent mapping to Inter) and establish Text Preservation Rule (sanitizer removed; read-only diagnostics).  
  *Status:* ✅ COMPLETE

---

### Milestone M1C: PO Canonical Preparation Contract & Commercial Alignment ⛔
- [ ] **Step 1C.1:** Implement `preparePurchaseOrderDocument.ts` in `src/domain/pdf/resolver/commercial/`.
  - Adapt PO domain entity (`src/domain/purchase-order/types.ts`) into canonical prepared contract.
  - Adapt supplier snapshot (`supplier_name`, contact, address) and procurement payment terms.
  - Map procurement unit cost (`unit_cost`) and item lines.
  - Preserve Buyer authorization signatures and hide receiving bank blocks.
- [ ] **Step 1C.2:** Connect PO prepared model to the Master Deterministic Resolver.
- [ ] **Step 1C.3:** Author unit tests in `src/tests/critical/preparePurchaseOrderDocument.test.js` verifying model output without data mutation.  
*Exit Gate:* PO data contract fully resolved and tested; ready for Forme commercial template integration.

---

### Milestone M2: Natural Pagination Implementation (Normal Mode First) 🔄
> [!CRITICAL]
> **GATE 1 REQUIREMENT: NATURAL PAGINATION ON REPRESENTATIVE SUITE FIRST**  
> Natural pagination must be verified across the complete Representative Document Suite before Phase M3 begins:
> 1. Short documents with few line items.
> 2. The original 13-item `SASQUO-000427` quotation (must fit on 1 page naturally).
> 3. Documents with long and wrapping descriptions.
> 4. Documents with large totals and bank details.
> 5. Documents with notes and commercial terms.
> 6. Documents with attachments and signatures.
> 7. Multi-page documents with different content distributions.  
> Compaction must never be used to mask broken natural pagination.

- [~] **Step 2.1:** Procure and deploy static TrueType font binaries in `public/fonts/`:
  - `Inter-Regular.ttf`, `Inter-Bold.ttf`, `Inter-Italic.ttf`, `Inter-BoldItalic.ttf`
  - `ArchivoBlack-Regular.ttf`
  - `Caveat-Regular.ttf`, `Caveat-Bold.ttf`
  - `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`
  - `NotoSansGreek-Regular.ttf` (internal Greek subset)
  - `₦` (`U+20A6`) routes to Noto Sans and is covered by a rendered-PDF test.  
  *Status:* 🔄 PARTIAL (2026-11-01). The binaries are deployed and `₦` coverage is tested. Prime (`U+2032`) and double-prime (`U+2033`) cmap coverage is not verified.
- [x] **Step 2.2:** Upgrade `src/components/pdf/forme/fonts.ts` to support dual-runtime path resolution and observable fallback.  
  *Status:* ✅ COMPLETE (2026-11-01). Server paths use `public/fonts/`, browser paths use `/fonts/`, fetch failure logs and throws, and an unsupported family logs a warning before the Helvetica fallback.
- [~] **Step 2.3:** Implement the Forme Table component with calibrated column widths and oversized row handling.
  - The row budget is `contentWidth − 4 × 0.71 pt`. Columns always sum to the budget.
  - The description column keeps a 120 pt minimum when space allows.
  - Optional columns shrink toward legible minimums before the description loses space.  
  *Status:* 🔄 PARTIAL (2026-11-01). Column budgeting is done and tested at the widest combination and at a narrow 420 pt budget. Oversized-row handling is not implemented.
- [~] **Step 2.4:** Implement native repeating table headers (`<Row header>`) across continuation pages.  
  *Status:* 🔄 PARTIAL (2026-11-01). The template uses `<Row header>`. Repetition on a continuation page is not verified.
- [~] **Step 2.5:** Implement adaptive closing layout for Bank Details and Totals:
  - Display side-by-side when vertical space permits.
  - Totals prioritise with line items; Bank Details adaptively stack or move to the next page when space is restricted.  
  *Status:* 🔄 PARTIAL (2026-11-01). Totals and Bank Details render side-by-side. Measured adaptive stacking is not implemented.
- [x] **Step 2.6:** Replace defensive global page padding (`paddingBottom: 48`) with Forme native `<Fixed position="footer">` dynamic reservation.  
  *Status:* ✅ COMPLETE (2026-11-01). The footer is a fixed element and the page content uses an 8 pt bottom inset (6 pt in compact mode).
- [ ] **Step 2.7:** Apply selective keep-together behaviour (protect signatures and single rows; fragment long terms and notes).  
  *Status:* ⛔ PENDING
- [ ] **Step 2.8:** Run Gate 1 verification across the complete 7-profile Representative Document Suite.  
  *Status:* ⛔ PENDING  
*Exit Gate:* Gate 1 signed off; `SASQUO-000427` fits naturally on 1 page in Normal Mode.

---

### Milestone M3: Compact Mode & Force 1 Page Mode 🔄
- [~] **Step 3.1:** Implement Compact Mode:
  - Wire all 32 candidate styling token overrides from `compact.ts` into the Forme Industry template.
  - Verify deterministic spacing, margin, and typography reductions without content loss.  
  *Status:* 🔄 PARTIAL (2026-11-01). The `compact` flag scales padding by 0.72, gaps by 0.7, the top margin from 22.68 pt to 18 pt, the bottom inset from 8 pt to 6 pt, and the display type. The 32-token table is not wired.
- [ ] **Step 3.2:** Implement the two-pass measurement engine using `renderDocumentWithLayout` from `@formepdf/core`.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.3:** Implement the progressive compaction algorithm for Force 1 Page Mode:
  - Pass 1: Compact mode tokens.
  - Pass 2: Margin reduction (candidate floor 18 pt) and row padding reduction (candidate floor 2 pt).
  - Pass 3: Typography scale down to candidate floor 7 pt.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.4:** Implement readability safeguards and graceful fallback:
  - Prioritise commercial legibility over page count. Treat candidate floors (7 pt font, 2 pt padding) as provisional targets subject to testing.
  - Enforce zero content omission, no overlapping bounding boxes, and no unreadable text.
  - If the document exceeds 1-page limits, fall back cleanly to a readable 2-page document with an in-app notice.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.5:** Run Gate 2 verification on the 1-page and multi-page test corpus.  
  *Status:* ⛔ PENDING  
*Exit Gate:* Gate 2 signed off; compaction verified without content loss or legibility degradation.

---

### Milestone M4: Commercial Reference Certification (Quotation, Invoice, PO) 🔄
> [!IMPORTANT]
> **GATE 3 REQUIREMENT:** New Forme commercial templates must be certified before production traffic switchover.

- [~] **Step 4.1:** Verify the complete Quotation family against `SASQUO-000427`, `SASQUO-000428`, and `SASQUO-430`.  
  *Status:* 🔄 PARTIAL (2026-11-01). The Industrial Quotation template is implemented and covered by rendered-PDF tests. The named sample set is not re-certified.
- [~] **Step 4.2:** Certify the Invoice family (`SASINV`) on the Forme Industry template foundation.  
  *Status:* 🔄 PARTIAL (2026-11-01). The Industrial Invoice template shares the same component and test suite. `SASINV` certification is pending.
- [ ] **Step 4.3:** Implement and certify the supplier-facing Purchase Order Forme template:
  - Ensure supplier snapshot, procurement delivery terms, and unit costs render cleanly.
  - Verify receiving bank details are hidden and WHT is not deducted.  
  *Status:* ⛔ PENDING. Blocked by Step 1C.1. `PdfDocumentKind` accepts `invoice` and `quotation` only.
- [~] **Step 4.4:** Implement and verify A4 Landscape orientation ($297 \times 210\text{ mm}$) with recalculation from first principles.  
  *Status:* 🔄 PARTIAL (2026-11-01). `layout.orientation` swaps the page dimensions to 841.89 × 595.28 pt and rebuilds the column budget. Portrait and landscape right-edge tests pass. The remaining template tokens are not recalculated.
- [ ] **Step 4.5:** Verify web preview parity with exported PDF files across desktop and mobile.  
  *Status:* ⛔ PENDING
- [ ] **Step 4.6:** Connect commercial export actions to `CompositePdfDelivery`.  
  *Status:* ⛔ PENDING  
*Exit Gate:* Gate 3 Pre-Production Approval granted for the Commercial Group.

---

### Milestone M5: Progressive Rollout to Remaining Families ⛔
- [ ] **Step 5.1:** Cost Pricing Sheet (CPS):
  - Connect CPS templates to M1B static TTF fonts, eliminating the silent Helvetica fallback bug.
  - Connect CPS to Master Deterministic Resolver and `CompositePdfDelivery`.
- [ ] **Step 5.2:** Customer Service Report (CSR):
  - Finalize customization picker scrollbar discoverability fix.
  - Complete physical on-device print verification for Portrait Reference and Blueprint Landscape templates.
  - Connect CSR export path to `CompositePdfDelivery`.
- [ ] **Step 5.3:** Waybill:
  - Implement Forme Waybill templates using bundled `Caveat` script font.
  - Preserve logistics item conditions, transport details, and signature blocks.
  - Connect to Master Resolver and `CompositePdfDelivery`.
- [ ] **Step 5.4:** Receipt:
  - Implement Forme Receipt template.
  - Enforce strict financial immutability and simple, clean proof-of-payment layout.
- [ ] **Step 5.5:** Request for Quotation (RFQ):
  - Implement Forme RFQ template preserving procurement unpriced table semantics.  
*Exit Gate:* 100% of the 8 document families active on Forme; zero production exports running React-PDF.

---

### Milestone M6: Legacy Deprecation & Cleanup ⛔
- [ ] **Step 6.1:** Run AST import analysis across `src/` to confirm zero remaining imports of `@react-pdf/renderer`.
- [ ] **Step 6.2:** Delete obsolete React-PDF adapters, components, and workaround scripts.
- [ ] **Step 6.3:** Uninstall `@react-pdf/renderer` from `package.json`.
- [ ] **Step 6.4:** Execute `bun run audit:load` followed by `bun run typecheck` to confirm clean repository state.  
*Exit Gate:* Clean repository state; legacy dependency removed; migration complete.

---

### Milestone M7: Evergreen Forme Migration and Legacy Retirement ✅
- **Objective:** Migrate the existing Evergreen PDF template to the Forme PDF rendering architecture, retire obsolete legacy files, and remediate footer positioning and logo rendering.

*Status:* ✅ COMPLETE (2026-11-08)
*% Done:* 100%

**Delivered Outcomes:**

- Reimplemented Evergreen as `src/components/pdf/forme/EvergreenFormeDocument.tsx` (592 lines, strictly complying with the 600-line audit threshold).
- Permanently removed legacy React-PDF files `src/components/pdf/templates/Evergreen.tsx` and `EvergreenStyles.ts` from disk and pruned obsolete dynamic imports.
- Fixed floating footer defect: adjusted `Page margin.bottom` from 42pt to 20pt (compact 16pt), anchoring the footer 18-20pt from the physical bottom edge and eliminating blank margin gap.
- Added company logo thumbnail (13x13) to fixed footer next to company name, harmonizing with Industry and Landscape Forme templates.
- Added robust fallback logo resolution in `src/components/pdf/industryAdapter.ts` supporting `model.logo`, `model.issuer.logoUrl`, `model.issuer.companyLogoUrl`, and root `companyLogoUrl`.
- Verified natural pagination, dynamic page numbering, repeated top accent bar, and zero text/footer collisions across single-page, quotation, and multi-page documents via MuPDF rasterization.
- Suite of 9 unit tests passing in `src/tests/pdf/formeEvergreenTemplate.test.ts`.

---

### Milestone M8: Landscape Rebuild from Scratch ✅
- **Objective:** Create a fresh Commercial Landscape template implementation using Forme, grounded in the CSR Blueprint technical drawing visual aura.

*Status:* ✅ COMPLETE (2026-11-08)
*% Done:* 100%

**Delivered Outcomes:**

- **Visual Reference Authority:** Grounded in CSR Blueprint Technical Drawing (`csr-blueprint-technical-drawinglandscape.html` / `src/components/pdf/pdfcn/csr/CsrLandscapeBlueprintTemplate.tsx`). Preserved the authentic technical drawing identity: 12-cell coordinate rulers (`1..12`) at top and bottom, partitioned title block, BOM schedule styling, technical financial ledger, and dynamic sheet numbering.
- **Strict Bloat Elimination & Modular Architecture ($\le 600$ Lines):** Monolithic 1416-line `LandscapeFormeDocument.tsx` refactored down to 412 lines, resolving the `[BLOAT]` audit warning and reducing repository oversized file count from 47 to 46. Split cleanly into cohesive modules:
  - `src/components/pdf/forme/landscape/landscapeTokens.ts` (93 lines): Color tokens, landscape A4 dimensions (841.89 x 595.28 pt), scaling engine.
  - `src/components/pdf/forme/landscape/landscapeHeader.tsx` (406 lines): 12-cell coordinate rulers, 4-cell partitioned title block, section bands.
  - `src/components/pdf/forme/landscape/landscapeTable.tsx` (365 lines): Bill-of-Materials table with repeat headers (`<Row header>`), alternating tints, and group subtotals.
  - `src/components/pdf/forme/landscape/landscapeClosing.tsx` (470 lines): Technical financial ledger, prominent Total Amount Due block with amount in words, bank settlement panel, notes, terms, and 3-column verification block.
  - `src/components/pdf/forme/LandscapeFormeDocument.tsx` (412 lines): Master document orchestrator.
- **Data & Commercial Domain Integrity:** Uses authoritative BOURXE data contracts (`CommercialDocumentData`) without inventing non-existent engineering metadata. Respects currency code, deductions in restrained `#B42318` with leading minus, and format-presentation quantities (`"1 set"`).
- **Template Routing & Normalization:** Added `'landscape-blueprint'` and `'blueprint'` aliases mapping to `'landscape'` in `src/domain/invoice/types.ts`.
- **Visual & Pixmap Verification:** Verified clean rasterization via MuPDF (`scratch/verify-landscape-rebuild.ts`) across single-page invoice, quotation, and 3-page multi-page documents. Confirmed 14x14 white footer logo badge and natural multi-page flow.
- **Automated Test Coverage:** Authored `src/tests/pdf/formeLandscapeRebuildTemplate.test.ts` (5 tests passing). Full commercial Forme test suite (66 tests across 9 files) passing. Both `bun run audit:load` and `bun run typecheck` cleanly pass with code 0.

---

### Milestone M9: Migrate Three Additional Commercial HTML Templates to Forme ✅
- **Objective:** Migrate the three additional source commercial HTML designs individually to the Forme PDF rendering architecture.

*Status:* ✅ COMPLETE (2026-11-08)
*% Done:* 100% (All 3 templates migrated)

**Source Designs & Migrated Implementations:**

1. **Commercial Architectural Frame (`architectural`)** — `docs/templates/html-temps/invoice-templates/commercial-architectural-frame.html`
   - *Identity:* High-precision engineering and architectural drafting visual language.
   - *Palette:* Charcoal (`#1E2427`), warm ivory paper (`#F6F0E4`), copper and sand accents (`#A4663F`, `#C08A5F`, `#E3D7C3`).
   - *Key Structural Elements:* Asymmetric header with charcoal company badge, copper technical divider rule, two-column party/project block, clean table with group badge/subtotals, two-column closing with financial ledger and prominent charcoal Total Due box, bank settlement block, notes, terms, and 3-column signature block with document control stamp.
   - *Implementation:* `src/components/pdf/forme/ArchitecturalFormeDocument.tsx` (583 lines, strictly $\le 600$ lines).

2. **Commercial Executive Luxury (`executive`)** — `docs/templates/html-temps/invoice-templates/commercial-executive.html`
   - *Identity:* Prestigious corporate executive and advisory visual language.
   - *Palette:* Deep forest green (`#173A2C`, `#0F281E`), gold accents (`#A9854F`, `#D8C39C`, `#EFE6D5`), warm cream paper (`#FCF9F2`, `#F6F0E2`).
   - *Key Structural Elements:* Symmetrical centered masthead, diamond ornament rule (`❖`), serif document title, 4-cell horizontal metadata bar, gold-ruled party block, forest green table headers, alternating row tints, full-width forest green Total Due banner, financial ledger, bank settlement card, and dual executive signatures.
   - *Implementation:* `src/components/pdf/forme/ExecutiveFormeDocument.tsx` (558 lines, strictly $\le 600$ lines).

3. **Commercial Heritage House (`heritage`)** — `docs/templates/html-temps/invoice-templates/commercial-heritage-house.html`
   - *Identity:* Formal heritage stationery visual language with traditional double border framing.
   - *Palette:* Deep burgundy (`#5C1A26`, `#451119`), bronze accents (`#9A7B45`, `#C6AA76`), warm ivory paper (`#F8F2E3`, `#F2E9D4`), ink (`#251E17`), muted (`#7B6E5C`), rule (`#D9CBAC`), white (`#FFFDF7`).
   - *Key Structural Elements:* Masthead with square company seal initial, burgundy serif brand title, bronze RC/TIN, right-aligned BOUXRE wordmark, large serif DOCTYPE, diamond ornament rule (`❖`), dot-leader particulars block, burgundy table header with bronze top rule, group header bands with italic group letters, group subtotal with double burgundy rules, financial ledger, prominent burgundy Total Amount Due callout with amount in words, boxed bank payment details, notes with bronze dashes, terms & conditions, and 3-column signature block with document control stamp.
   - *Implementation:* `src/components/pdf/forme/HeritageHouseFormeDocument.tsx` (570 lines, strictly $\le 600$ lines).

**Delivered Outcomes:**

- Implemented `ArchitecturalFormeDocument.tsx`, `ExecutiveFormeDocument.tsx`, and `HeritageHouseFormeDocument.tsx` with native Forme primitives, responsive column budgeting, and glyph fallback for currency (`₦`).
- Registered `'architectural'`, `'executive'`, and `'heritage'` template identifiers in `src/domain/invoice/types.ts` (`INVOICE_PDF_TEMPLATE_IDS`, `normalizeInvoicePdfTemplateId` with aliases).
- Updated Master Commercial Resolver in `src/components/pdf/index.ts` to route `'architectural-forme'`, `'executive-forme'`, and `'heritage-forme'`, with dynamic module loading and `PT Serif` font resolution.
- Updated `CommercialTemplatePicker.tsx` carousel and `CommercialTemplateMiniature.tsx` with authentic theme tokens and zone miniatures for all 3 templates.
- Added comprehensive unit tests in `src/tests/pdf/formeArchitecturalTemplate.test.ts`, `src/tests/pdf/formeExecutiveTemplate.test.ts`, and `src/tests/pdf/formeHeritageHouseTemplate.test.ts`.
- Verified 100% passing test suite (30/30 PDF tests pass), clean `bun run typecheck`, clean `bun run audit:load`, and clean `git diff --check`.
- Visual inspection confirmed natural multi-page flow, correct margins, and zero collisions across invoices and quotations via MuPDF rasterization.

**Upcoming Migration Identifications:**
- **Commercial Landscape Rebuild:** Milestone M8 (`commercial-landscape.html`) — ✅ **COMPLETE (100%)**.
- **Second Landscape Template:** Customer Service Report (CSR) Blueprint Landscape — defined in **Milestone M5, Step 5.2** (Reference: `docs/templates/html-temps/CSR/csr-blueprint-technical-drawinglandscape.html`). Unaffected and preserved.

**Next Active Milestone:** **Milestone M10 — Purchase Order (PO) Template Integration**.

---

### Milestone M10: Purchase Order (PO) Template Integration ⛔
- **Objective:** Extend the migrated commercial template system to support Purchase Orders.

*Status:* ⛔ PENDING
*% Done:* 0%

**Planned Outcomes:**

- Allow PO documents to use the migrated commercial template designs.
- Reuse the shared Forme rendering architecture where appropriate.
- Respect PO-specific data, terminology, supplier/vendor relationships, and document semantics.
- Do not incorrectly treat a supplier-facing PO as a customer-facing invoice or quotation.
- Preserve PO-specific business rules and data contracts.
- Verify all supported PO templates and their document-specific output.

**Dependency:** Must follow completion of the commercial template migrations.

---

### Milestone M11: Cost Pricing Sheet (CPS) Template Integration ⛔
- **Objective:** Extend the migrated template system to support Cost Pricing Sheets (CPS).

*Status:* ⛔ PENDING
*% Done:* 0%

**Planned Outcomes:**

- Allow CPS documents to use the planned migrated template system where compatible.
- Preserve CPS-specific data structures, calculations, and business rules.
- Reuse shared Forme infrastructure without forcing CPS into an unsuitable commercial document layout.
- Retain CPS-specific rendering requirements where necessary.
- Verify representative CPS documents and their output.

**Dependency:** Follows the commercial template migrations and must not compromise the existing CPS document architecture.

---

## 5. Work Log

### 2026-10-30 — Discovery and problem register (M0)
- Audited `IndustryTemplate.tsx`, `table.ts`, `compact.ts`, and `safeText.ts`.
- Traced the `SASQUO-000427` page break: a 113.73 pt closing block overflowed 75.25 pt of free space.
- Traced the `SASQUO-000428` character corruption: a double-prime serialized into digits through a 1-byte WinAnsi path.

### 2026-11-01 — Architecture contracts and media specification (M1A, M1B)
- Published the responsibility contract across Domain Preparation, Resolver, Customization, Presentation, Forme, and Delivery.
- Published the font and media infrastructure specification: TrueType SFNT only, WOFF rejected, no silent font mapping, Text Preservation Rule, single font authority.

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

---

## 6. Gate Readiness Snapshot

| Gate | State | Blocking Items |
| :--- | :--- | :--- |
| **Gate 1 — Natural Pagination** | ⛔ OPEN | Prime and double-prime cmap verification. Oversized-row handling. Continuation-page header repetition. Measured adaptive closing layout. Selective keep-together. 7-profile suite run. |
| **Gate 2 — Compaction** | ⛔ OPEN | 32-token compact map. Two-pass measurement. Progressive compaction. Readability safeguards and fallback. 1-page and multi-page corpus run. |
| **Gate 3 — Pre-Production** | ⛔ OPEN | Gate 1 and Gate 2 sign-off. Named sample recertification. Purchase Order template and contract. Preview parity. `CompositePdfDelivery` connection. |
