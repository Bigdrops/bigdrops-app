# 🏗️ Waterfall Roadmap & Phased Execution Sequence

> **Status:** APPROVED LIVING COMMAND DOCUMENT & FROZEN DOCUMENTATION BASELINE (Ready for M1 Planning)  
> **Architecture:** Forme Engine + `pdfcn` Presentation Layer  
> **Writing Standard:** ASD-STE100 Simplified Technical English  
> **Last Updated:** 2026-10-30  

---

## 1. Master Progress Bar

`[██░░░░░░░░] 15%` | **Total Milestones:** 7 | **Current Phase:** Phase 1 (Engine Foundation)

*Note: Milestone M0 represents the Discovery and PRD Documentation deliverable, which is 100% complete and frozen. Milestones M1 through M6 represent software implementation phases that are pending execution.*

---

## 2. Status Legend

- ✅ **IMPLEMENTED** — Task executed, verified, and active.
- 🔄 **IMPROVED** — Task executed, then enhanced or optimized.
- 🛠️ **CORRECTED** — Task executed, but patched to fix defects.
- ⏭️ **SUPERSEDED** — Task replaced by a newer architectural decision.
- ⛔ **PENDING** — Awaiting execution; blocked until previous gates pass.

---

## 3. Milestone Tracker & Gating Table

| ID | Milestone / Phase | Scope Summary | Priority | Status | % Done | Target Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M0** | **Discovery & Problem Register** | Root cause analysis on `SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`. PRD documentation suite update and baseline freeze. | CRIT | ✅ IMPLEMENTED | 100% | Documentation Baseline Frozen. |
| **M1** | **Forme Foundation & Typography** | TrueType font evaluation (static TTF vs binary bundle for mobile/offline), Unicode normalizer, 5-step rich text pipeline, scoped emoji fallback. | HIGH | ⛔ PENDING | 0% | Typography, mobile font & rich-text tests pass. |
| **M2** | **Natural Pagination (Normal Mode)** | Calibrated table columns (candidate 72 pt make), adaptive closing layout, repeating headers, dynamic footer, selective keep-together, oversized row handling. | CRIT | ⛔ PENDING | 0% | **GATE 1: Representative Document Suite Sign-Off**. |
| **M3** | **Compact & Force 1 Page Modes** | Wire 32 candidate compact tokens, multi-pass measurement via `renderDocumentWithLayout`, legibility-first safeguards (candidate 7 pt floor), fallback. | HIGH | ⛔ PENDING | 0% | **GATE 2: Compaction Tests**. |
| **M4** | **Reference Template Certification** | Full Quotation & Invoice templates in Forme, Landscape mode, preview parity, visual regression. | CRIT | ⛔ PENDING | 0% | **GATE 3: Pre-Production Approval**. |
| **M5** | **Remaining Document Families** | Waybill, RFQ, BOQ, and CSR migration to Forme templates. | MED | ⛔ PENDING | 0% | All document types active. |
| **M6** | **Legacy Cleanup & Deprecation** | Verify zero React-PDF imports, remove obsolete adapters, uninstall `@react-pdf/renderer`. | LOW | ⛔ PENDING | 0% | Package removed. |

---

## 4. Detailed Execution Steps

### Phase 0: Discovery, Architecture Audit & Problem Register ✅
- [x] **Step 0.1:** Audit `IndustryTemplate.tsx`, `table.ts`, `compact.ts`, and `safeText.ts`.  
  *Status:* ✅ IMPLEMENTED (2026-10-30)
- [x] **Step 0.2:** Trace pagination failure on `SASQUO-000427 (1).pdf` (113.73 pt closing block breaking over 75.25 pt free space).  
  *Status:* ✅ IMPLEMENTED (2026-10-30)
- [x] **Step 0.3:** Trace character corruption on `SASQUO-000428.pdf` (double-prime `″` rendering into digits `23`, `33`, `43`).  
  *Status:* ✅ IMPLEMENTED (2026-10-30)
- [x] **Step 0.4:** Update and freeze PRD document suite in `docs/prd/pdf-rendering-migration/` to record problem register, Forme architecture, and testable gates.  
  *Status:* ✅ IMPLEMENTED (2026-10-30)

---

### Phase 1: Core Forme Foundation & Typography Pipeline ⛔
- [ ] **Step 1.1:** Confirm `@formepdf/react` and `@formepdf/core` registration and test minimal document generation.  
  *Status:* ⛔ PENDING
- [ ] **Step 1.2:** Evaluate font packaging strategy:
  - Test static TTF font assets from `public/fonts/` (Inter Regular, Medium, Bold).
  - Verify offline PDF generation in Capacitor mobile builds (Android/iOS).
  - Retain binary bundling as a verified fallback if static delivery fails.  
  *Status:* ⛔ PENDING
- [ ] **Step 1.3:** Build deterministic Unicode normalizer (`safeText` replacement):
  - Empirically trace font fallback and encoding paths for double-prime (`U+2033`).
  - Map double-prime (`U+2033`) and prime (`U+2032`) cleanly without modulo-256 corruption.
  - Support Nigerian Naira (`₦`, `U+20A6`) via font glyph or inline SVG vector icon.
  - Support engineering symbols (`²`, `×`, `±`, `°`).
  - Implement scoped emoji handling: preserve surrounding text, support small justified set of icons, safely strip unmapped emoji without crashing.  
  *Status:* ⛔ PENDING
- [ ] **Step 1.4:** Implement interactive hyperlink primitives (`<Image href="...">` and coordinate overlay views) and enforce logo aspect-ratio preservation (`objectFit: 'contain'`).  
  *Status:* ⛔ PENDING
- [ ] **Step 1.5:** Implement 5-step rich-text conversion pipeline:
  - Sanitize incoming HTML via DOMPurify with strict allowlist.
  - Parse sanitized HTML into intermediate tree.
  - Map permitted nodes into controlled document AST (`<b>`, `<i>`, `<u>`, `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`).
  - Render AST through Forme components.
  - Fallback unsupported nodes safely to plain text.  
  *Status:* ⛔ PENDING

---

### Phase 2: Natural Pagination Implementation (Normal Mode First) ⛔
> [!CRITICAL]
> **GATE 1 REQUIREMENT: NATURAL PAGINATION ON REPRESENTATIVE SUITE FIRST**  
> Natural pagination must be fully verified across the complete Representative Document Suite before Phase 3 begins:
> 1. Short documents with few line items.
> 2. The original 13-item `SASQUO-000427` quotation.
> 3. Documents with long and wrapping descriptions.
> 4. Documents with large totals and bank details.
> 5. Documents with notes and commercial terms.
> 6. Documents with attachments and signatures.
> 7. Multi-page documents with different content distributions.
> Compaction must never be used to mask broken natural pagination.

- [ ] **Step 2.1:** Implement Forme Table component with calibrated column widths & oversized row handling:
  - Test candidate target **72 pt** for `make` column (eliminating 2-line wraps for `"Atlas Copco"`).
  - Implement proportional column budgeting for description and item columns.
  - Ensure ordinary rows stay intact across pages where possible; define a safe fragmentation or controlled fallback strategy for rows exceeding available page height to prevent clipping or silent content loss.  
  *Status:* ⛔ PENDING
- [ ] **Step 2.2:** Enable native repeating table header (`<Row header>`) across continuation pages and verify runtime repetition in exported PDF.  
  *Status:* ⛔ PENDING
- [ ] **Step 2.3:** Implement adaptive closing layout for Bank Details and Totals:
  - Display side-by-side when space and content permit.
  - Provide deliberate readable fallback (adaptive stacking or continuation) when space is restricted.
  - Avoid rigid row-locking and do not prescribe custom row balancing without measured evidence.  
  *Status:* ⛔ PENDING
- [ ] **Step 2.4:** Replace defensive global page padding (`paddingBottom: 48`) with Forme native `<Fixed position="footer">` dynamic reservation.  
  *Status:* ⛔ PENDING
- [ ] **Step 2.5:** Apply selective keep-together behavior:
  - Protect small logical units (individual signature blocks, single table rows).
  - Allow long sections (commercial terms, notes, attachments) to fragment naturally.
  - Mitigate orphaned section headings where practical.  
  *Status:* ⛔ PENDING
- [ ] **Step 2.6:** Run Gate 1 Verification across the complete Representative Document Suite.  
  *Status:* ⛔ PENDING

---

### Phase 3: Compact Mode & Force 1 Page Mode ⛔
- [ ] **Step 3.1:** Implement Compact Mode:
  - Wire all 32 candidate styling token overrides from `compact.ts` into the Forme Industry template.
  - Verify deterministic spacing, margin, and typography reductions without content loss.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.2:** Implement Two-Pass Measurement Engine:
  - Use `renderDocumentWithLayout` from `@formepdf/core` to extract exact rendered heights and bounding boxes.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.3:** Implement Progressive Compaction Algorithm for Force 1 Page Mode:
  - Pass 1: Compact mode tokens.
  - Pass 2: Margin reduction (candidate floor 18 pt) and row padding reduction (candidate floor 2 pt).
  - Pass 3: Typography scale down to candidate floor 7 pt.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.4:** Implement Readability Safeguards and Fallback:
  - Prioritize commercial legibility over page count. Treat candidate floors (7 pt font, 2 pt padding) as provisional targets subject to readability testing.
  - Enforce zero content omission, no overlapping bounding boxes, and no unreadable text.
  - If document exceeds 1-page limits, fallback cleanly to readable 2-page document with user warning.  
  *Status:* ⛔ PENDING
- [ ] **Step 3.5:** Run Gate 2 Verification on 1-page and multi-page test corpus.  
  *Status:* ⛔ PENDING

---

### Phase 4: Reference Template Certification (Quotation & Invoice) ⛔
> [!IMPORTANT]
> **GATE 3 REQUIREMENT:** New Forme templates must be built, tested, and certified before production traffic switchover.

- [ ] **Step 4.1:** Verify complete Quotation family against `SASQUO-000427`, `SASQUO-000428`, and `SASQUO-430`.  
  *Status:* ⛔ PENDING
- [ ] **Step 4.2:** Certify Invoice family (`SASINV`) sharing the Forme Industry template foundation.  
  *Status:* ⛔ PENDING
- [ ] **Step 4.3:** Implement and verify A4 Landscape orientation ($297 \times 210\text{ mm}$) with recalculation from first principles.  
  *Status:* ⛔ PENDING
- [ ] **Step 4.4:** Verify web preview parity with exported PDF files.  
  *Status:* ⛔ PENDING
- [ ] **Step 4.5:** Obtain Gate 3 Pre-Production Approval.  
  *Status:* ⛔ PENDING

---

### Phase 5: Progressive Rollout to Remaining Families ⛔
- [ ] **Step 5.1:** Migrate Waybill template to Forme.  
  *Status:* ⛔ PENDING
- [ ] **Step 5.2:** Migrate RFQ and BOQ templates to Forme.  
  *Status:* ⛔ PENDING
- [ ] **Step 5.3:** Migrate Contractor Service Report (CSR) templates to Forme.  
  *Status:* ⛔ PENDING

---

### Phase 6: Legacy Deprecation & Cleanup ⛔
- [ ] **Step 6.1:** Run AST import analysis across `src/` to confirm zero remaining imports of `@react-pdf/renderer`.  
  *Status:* ⛔ PENDING
- [ ] **Step 6.2:** Delete obsolete React-PDF adapters, components, and workaround scripts.  
  *Status:* ⛔ PENDING
- [ ] **Step 6.3:** Uninstall `@react-pdf/renderer` from `package.json`.  
  *Status:* ⛔ PENDING
- [ ] **Step 6.4:** Run `bun run audit:load` and `bun run typecheck` to confirm clean repository state.  
  *Status:* ⛔ PENDING

---

## 5. Decision Log

| Date | Phase Affected | Status Applied | Decision & Justification |
| :--- | :--- | :--- | :--- |
| **2026-10-30** | Architecture Baseline | ✅ IMPLEMENTED | Selected Forme (`@formepdf/react` and `@formepdf/core` v0.20.1) as target PDF engine, wrapped by `pdfcn`. Superseded Takumi and Typst spikes. |
| **2026-10-30** | Execution Sequence | ✅ IMPLEMENTED | Enforced Gate 1: Natural pagination must be solved and verified across the complete Representative Document Suite before Compact or Force 1 Page mode implementation. |
| **2026-10-30** | Closing Sections | ✅ IMPLEMENTED | Decoupled Bank Details and Totals with adaptive fallback. Rejected premature row-balancing algorithm without measured evidence. |
| **2026-10-30** | Keep-Together & Rows | ✅ IMPLEMENTED | Selective keep-together: protect small logical units (signatures, ordinary rows); long content fragments naturally; oversized rows handled safely to prevent clipping. |
| **2026-10-30** | Rich-Text Pipeline | ✅ IMPLEMENTED | Established 5-step conversion pipeline (Sanitize $\to$ Parse $\to$ Allowlisted AST $\to$ Forme Render $\to$ Fallback). Limited initial scope to commercial basics. |
| **2026-10-30** | Emoji Fallback | ✅ IMPLEMENTED | Scoped emoji fallback: preserve surrounding text, small justified icon set where needed, safe stripping fallback; not a blocker for template 1. |
| **2026-10-30** | Font Packaging | ✅ IMPLEMENTED | Evidence-driven strategy: evaluate static TTF assets first; check offline mobile export reliability; retain binary bundle as fallback. |
| **2026-10-30** | Production Cutover | ✅ IMPLEMENTED | Enforced Gate 3: New Forme Invoice and Quotation templates must be built and approved before production migration begins. |
| **2026-10-30** | Documentation Freeze | ✅ IMPLEMENTED | Formally froze PRD documentation suite in `docs/prd/pdf-rendering-migration/` as approved baseline for M1 implementation planning. |
