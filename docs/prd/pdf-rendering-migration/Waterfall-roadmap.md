# 🏗️ Waterfall Roadmap & Phased Execution Sequence

- **Status:** AUTHORITATIVE LIVING ROADMAP & RECONCILED EXECUTION SEQUENCE
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Presentation Layer
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Eight In-Scope Document Types. BOQ Excluded.

---

## 1. Master Progress Bar

`[████░░░░░░] 35%` | **Total Milestones:** 9 | **Current Phase:** Phase M1C (PO Canonical Preparation) & Pre-Implementation Setup

*Note: Milestones M0, M1A, and M1B represent completed investigation and specification deliverables. Milestones M1C through M6 represent software implementation and rollout phases pending execution.*

---

## 2. Status Legend

- ✅ **COMPLETE** — Specification or phase executed, verified, and accepted.
- 🔄 **IN PROGRESS** — Active work package currently under development.
- 🛠️ **CORRECTED** — Phase executed, then patched to resolve defects.
- ⏭️ **SUPERSEDED** — Task or approach replaced by a newer architectural decision.
- ⛔ **PENDING** — Awaiting execution; blocked until preceding gates pass.

---

## 3. Milestone Tracker & Gating Table

| ID | Milestone / Phase | Scope Summary | Priority | Status | Target Deliverables & Gating | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M0** | **Discovery & Problem Register** | Root cause analysis on `SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`. PRD suite update and baseline freeze. | CRIT | ✅ COMPLETE | Authoritative PRD suite in `docs/prd/pdf-rendering-migration/`. | None |
| **M1A** | **PDF Architecture Contracts** | Responsibility definition across Domain Preparation, Resolver, Customization, Presentation, Forme, and Delivery. | CRIT | ✅ COMPLETE | Specification: `docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`. | M0 |
| **M1B** | **Shared Font & Media Infrastructure** | TrueType SFNT requirement, font inventory, WOFF rejection, CORS reality, Text Preservation Rule, single font authority. | CRIT | ✅ COMPLETE | Specification: `docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md`. | M1A |
| **M1C** | **PO Canonical Preparation Contract** | Author `preparePurchaseOrderDocument.ts`, adapt PO supplier-facing fields and calculations, integrate into commercial group. | HIGH | ⛔ PENDING | Canonical PO prepared document contract and resolver adapter. | M1A |
| **M2** | **Natural Pagination (Normal Mode First)** | Calibrated table columns (candidate $\ge 72\text{ pt}$ make), adaptive closing layout, repeating headers, dynamic footers, selective keep-together, oversized rows. | CRIT | ⛔ PENDING | **GATE 1: Representative Document Suite Sign-Off**. Premature page breaks eliminated on `SASQUO-000427`. | M1B, M1C |
| **M3** | **Compact & Force 1 Page Modes** | Wire 32 candidate compact tokens, two-pass measurement via `renderDocumentWithLayout`, legibility-first safeguards (candidate 7 pt floor), fallback. | HIGH | ⛔ PENDING | **GATE 2: Compaction Tests**. Deterministic compaction without content loss. | M2 |
| **M4** | **Commercial Reference Certification** | Full Quotation, Invoice, and PO templates in Forme, Landscape mode, preview parity, visual regression against legacy output. | CRIT | ⛔ PENDING | **GATE 3: Pre-Production Approval**. Commercial family certified for live traffic switchover. | M3 |
| **M5** | **Remaining Document Families** | CPS font fix & resolver integration, CSR delivery integration, Waybill templates (Caveat font), Receipt, and RFQ migration. | HIGH | ⛔ PENDING | All 8 document types active on Forme; zero React-PDF traffic. | M4 |
| **M6** | **Legacy Cleanup & Deprecation** | Verify zero React-PDF imports via AST analysis, remove obsolete adapters, uninstall `@react-pdf/renderer` from `package.json`. | MED | ⛔ PENDING | Repository clean; `@react-pdf/renderer` removed; typecheck clean. | M5 |

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

### Milestone M2: Natural Pagination Implementation (Normal Mode First) ⛔
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

- [ ] **Step 2.1:** Procure and deploy static TrueType font binaries in `public/fonts/`:
  - `Inter-Regular.ttf`, `Inter-Bold.ttf`
  - `Caveat-Regular.ttf`, `Caveat-Bold.ttf`
  - `NotoSans-Regular.ttf`
  - Verify cmap coverage of `₦` (`U+20A6`), `′` (`U+2032`), and `″` (`U+2033`).
- [ ] **Step 2.2:** Upgrade `src/components/pdf/forme/fonts.ts` to support dual-runtime path resolution and observable fallback.
- [ ] **Step 2.3:** Implement Forme Table component with calibrated column widths (candidate $\ge 72\text{ pt}$ for `make`) and oversized row handling.
- [ ] **Step 2.4:** Implement native repeating table headers (`<Row header>`) across continuation pages.
- [ ] **Step 2.5:** Implement adaptive closing layout for Bank Details and Totals:
  - Display side-by-side when vertical space permits.
  - Totals prioritize with line items; Bank Details adaptively stack or move to next page when space is restricted.
- [ ] **Step 2.6:** Replace defensive global page padding (`paddingBottom: 48`) with Forme native `<Fixed position="footer">` dynamic reservation.
- [ ] **Step 2.7:** Apply selective keep-together behavior (protect signatures and single rows; fragment long terms and notes).
- [ ] **Step 2.8:** Run Gate 1 Verification across the complete 7-profile Representative Document Suite.  
*Exit Gate:* Gate 1 signed off; `SASQUO-000427` fits naturally on 1 page in Normal Mode.

---

### Milestone M3: Compact Mode & Force 1 Page Mode ⛔
- [ ] **Step 3.1:** Implement Compact Mode:
  - Wire all 32 candidate styling token overrides from `compact.ts` into the Forme Industry template.
  - Verify deterministic spacing, margin, and typography reductions without content loss.
- [ ] **Step 3.2:** Implement Two-Pass Measurement Engine using `renderDocumentWithLayout` from `@formepdf/core`.
- [ ] **Step 3.3:** Implement Progressive Compaction Algorithm for Force 1 Page Mode:
  - Pass 1: Compact mode tokens.
  - Pass 2: Margin reduction (candidate floor 18 pt) and row padding reduction (candidate floor 2 pt).
  - Pass 3: Typography scale down to candidate floor 7 pt.
- [ ] **Step 3.4:** Implement Readability Safeguards and Graceful Fallback:
  - Prioritize commercial legibility over page count. Treat candidate floors (7 pt font, 2 pt padding) as provisional targets subject to testing.
  - Enforce zero content omission, no overlapping bounding boxes, and no unreadable text.
  - If document exceeds 1-page limits, fallback cleanly to readable 2-page document with an in-app notice.
- [ ] **Step 3.5:** Run Gate 2 Verification on 1-page and multi-page test corpus.  
*Exit Gate:* Gate 2 signed off; compaction verified without content loss or legibility degradation.

---

### Milestone M4: Commercial Reference Certification (Quotation, Invoice, PO) ⛔
> [!IMPORTANT]
> **GATE 3 REQUIREMENT:** New Forme commercial templates must be certified before production traffic switchover.

- [ ] **Step 4.1:** Verify complete Quotation family against `SASQUO-000427`, `SASQUO-000428`, and `SASQUO-430`.
- [ ] **Step 4.2:** Certify Invoice family (`SASINV`) sharing the Forme Industry template foundation.
- [ ] **Step 4.3:** Implement and certify supplier-facing Purchase Order Forme template:
  - Ensure supplier snapshot, procurement delivery terms, and unit costs render cleanly.
  - Verify receiving bank details are hidden and WHT is not deducted.
- [ ] **Step 4.4:** Implement and verify A4 Landscape orientation ($297 \times 210\text{ mm}$) with recalculation from first principles.
- [ ] **Step 4.5:** Verify web preview parity with exported PDF files across desktop and mobile.
- [ ] **Step 4.6:** Connect commercial export actions to `CompositePdfDelivery`.  
*Exit Gate:* Gate 3 Pre-Production Approval granted for Commercial Group.

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
