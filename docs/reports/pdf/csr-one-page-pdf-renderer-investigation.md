# CSR One-Page PDF Renderer Investigation: Forme vs. Takumi

This report was written by Antigravity on 2026-10-26 via Local Runner.

## Objective

Perform a read-only architecture investigation to evaluate whether **Forme** or **Takumi** is the more appropriate PDF rendering engine for a new Customer Service Report (CSR) template that must produce a strictly one-page physical document. Establish authoritative requirements from existing project PRDs, migration plans, standards, and forensic reports. Formulate an evidence-based recommendation without modifying application source code, package configurations, or existing templates.

## Scope

- Read-only analysis of project PDF documentation under `docs/prd/`, `docs/standard/`, and `docs/reports/`.
- Inspection of package manifests (`package.json`, `bun.lock`) and existing PDF rendering implementations in `src/`.
- Evaluation of strictly one-page document requirements specific to the CSR domain.
- Comparative technical assessment of `@formepdf/react` / `@formepdf/core` versus `takumi-pdf` / `@takumi-rs/helpers`.
- Identification of coexistence and migration boundaries with existing React-PDF templates.
- Definition of acceptance criteria for a subsequent implementation task.
- Zero source-code, template, or dependency modifications.

## Files Changed

- `docs/reports/pdf/csr-one-page-pdf-renderer-investigation.md` (this report created).

Skills used: pdf-rendering-correctness, react-pdf, shadcn
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive Summary & Recommendation

### Core Findings
1. **The PRD does NOT mandate Forme, Takumi, or any single renderer for CSR.**
   The authoritative PDF migration PRD (`docs/prd/pdf-rendering-migration/draft.md`) specifies a presentation-layer component abstraction based on `pdfcn` and explicitly states in §3 that the application layer must not couple to `@react-pdf/renderer`, `pdfcn`, `Takumi`, or `Forme`. Furthermore, `docs/standard/pdf-migration-standard.md` confirms that renderer selection is document-family specific, not global across the application.
2. **Forme's primary technical advantages do not benefit a one-page CSR.**
   Forme excels at multi-page flowing tables with repeated `<thead>` rows and dynamic multi-page numbering (`{{pageNumber}} of {{totalPages}}`). A strictly one-page CSR document requires neither capability.
3. **Forme carries critical font and bundle penalties for CSR.**
   Forensic analysis of the CPS production implementation (`docs/reports/cost-pricing-sheet/2026-10-04-cps-forme-runtime-failure-forensic-report.md`) proved that Forme rejects WOFF and WOFF2 font bytes (`unknown magic`). BOUXRE's font registry uses `@fontsource` WOFF packages. Forme crashed in the browser when attempting to load Inter and had to fall back to `Helvetica`. In addition, Forme requires a ~20 MB WASM engine and produces ~75 KB files for single-page documents (~7.5x the size of equivalent React-PDF documents).
4. **Takumi provides a box model more natural for one-page CSR cards, but its browser delivery remains unverified.**
   Takumi's flexbox-based layout closely matches the compact box and strip structure of CSR. Takumi supports WOFF font bytes (verified in `takumi-invoice-poc-report.md`). However, Takumi's Vite browser WASM bundling has not been verified in production (CPS adopted Forme), and Takumi has a documented Windows path resolution bug under Bun that requires manual initialization.
5. **Neither renderer guarantees a strictly one-page document automatically.**
   Neither Forme nor Takumi provides an automatic content-compression engine that prevents page overflows. The one-page guarantee must be enforced by BOUXRE-owned density logic: dynamic padding/font reduction (`computeLayoutDensity`) and fallback from multi-column tables to inline paragraph text (`resolveMaterialColumnBlocks`).

### Executive Recommendation
**Do not mandate Forme for the new CSR template. Defer final renderer replacement and conduct a targeted, timeboxed prototype comparing Takumi and Forme on a single-page CSR fixture.**

If an immediate renderer choice is required without further prototyping:
- **Choose Takumi** if visual typography (Inter + custom handwriting fonts like Caveat, Patrick Hand, Kalam), output file size, and compact flexbox cards are the priority, provided the Vite browser-bundle WASM path is validated first.
- **Choose Forme** only if reuse of the existing CPS browser WASM delivery pipeline (`@formepdf/core/browser`) is prioritized over custom font support and output file size, accepting that font rendering will be constrained to system Helvetica or pre-converted standalone TTF files.

The safest architectural path is to keep existing React-PDF CSR templates (`Industry`, `Zinc`, `Minimal`) operational while introducing the new template through an isolated adapter.

---

## 2. Authoritative PRD & Documentation Requirements

### 2.1 PRD Analysis: `docs/prd/pdf-rendering-migration/draft.md`
- **Status:** Proposed.
- **Section 1 ("Core Objective"):** Gradually retire `@react-pdf/renderer` in favor of a `pdfcn`-based architecture without big-bang disruption. Existing React-PDF documents remain operational while individual document families migrate.
- **Section 2.4 & Section 11 ("1 Page" Mode):** Defines the "1 page" requirement:
  > "The complete document should be compressed/reflowed to fit onto one physical PDF page where possible, regardless of how many logical content sections or normal-flow pages the document would otherwise require."
  Priority order: preserve all content, preserve document structure, preserve essential readability, reduce non-essential spacing, adjust typography within defined limits, apply controlled scaling. The system must never silently remove required fields or line items.
- **Section 3 ("Strategic Direction"):**
  > "BIGDROPS will treat PDF rendering as a dedicated presentation layer. The business/application layer must not become coupled to either: '@react-pdf/renderer', 'pdfcn', 'Takumi', 'Forme', or another future renderer. The document model remains renderer-independent. The renderer becomes an implementation detail."
- **Section 4.2 ("Renderer Abstraction"):** Mandates coexistence:
  ```text
  PDF Renderer Interface
          │
          ├── ReactPdfRenderer [LEGACY]
          │
          └── PdfcnRenderer [TARGET]
  ```
- **Section 6 ("New Template Requirement"):** New templates created after PRD adoption should use the target `pdfcn` architecture without adding dependencies on `@react-pdf/renderer`.
- **Section 13 ("Document Families"):** Enumerates CSR among distinct supported families alongside Invoice, Quotation, Waybill, RFQ, and BOQ.

### 2.2 Standard Analysis: `docs/standard/pdf-migration-standard.md`
- **Purpose (§1):** The standard is renderer-neutral. It does not force all document families to use the same engine.
- **Renderer Selection Authority (§2):**
  > "Each document family must have one approved renderer authority... The shared PDF standard controls the architecture around the renderer. It does not override a document family's approved renderer. Different document families may use different rendering engines at the same time."
  Approved precedent: CPS uses Forme/pdfcn, whereas Invoice and Quotation retain React-PDF until their contracts change.
- **Required Pipeline Shape (§3):**
  ```text
  Canonical document or domain model
    → prepared PDF data
    → document-specific template
    → approved renderer adapter
    → PDF bytes or Blob
    → approved delivery authority
  ```
- **Prepared Data Rules (§5):** Prepared data must be explicit. Templates must not fetch data, query Supabase, or compute business logic.

### 2.3 PRD Architecture Analysis: `docs/prd/Pdf-print-prd/PDF-Architecture-v1.md`
- **Section 5 ("Design Principles"):**
  - Principle 1: Business logic must never know how PDFs are delivered.
  - Principle 2: Delivery must never know how PDFs were generated.
  - Principle 3: Templates remain independent.

---

## 3. Actual CSR Domain Requirements

A Customer Service Report (CSR) is an on-site technical field service document signed by technicians and customer representatives. Unlike multi-page Invoices or multi-page BOQ/CPS schedules, a CSR has strict spatial constraints:

| Requirement | Specification | Enforcement Mechanism in BOUXRE |
|---|---|---|
| **Page Budget** | Strictly 1 physical A4 page (595.28 × 841.89 pt) | Vertical space budget ≤ 820 pt total content height |
| **Page Orientation** | Portrait (210 × 297 mm) | Fixed dimensions, zero landscape toggle required |
| **Header Identity** | Company name, logo, contact, CSR number, date, call type, service basis, system status (Down/Operational) | Compact horizontal banner (48pt logo slot, 2-line title) |
| **Equipment Details** | Make, model, serial number, engine number, capacity, site location, customer address | 2-column or 3-column metadata grid |
| **Narrative Blocks** | Problem Reported, Service Rendered, Defects Found, Engineer Remarks, Customer Feedback | Multi-section boxed cards with dynamic line-height |
| **Operational Readings** | 6 readings: Voltage (V), Frequency (Hz), Battery, Temperature (°C), Pressure (bar), Hours | Single horizontal strip with 6 fixed metric cells |
| **Materials Used** | 1 to 20+ spare parts (Item name, quantity, unit) | `resolveMaterialColumnBlocks` (1–3 column grid; falls back to comma-separated inline paragraph when count > ceiling) |
| **Sign-off / Acknowledgement** | Customer/Recipient witness signature & name; Technician signature image & name/role | Side-by-side dual signature card (max height 50 pt for image) |
| **Fixed Footer** | Client notes, legal/disclaimer text, company tagline | Single-line fixed footer at bottom margin |
| **Dynamic Density** | Automatic adjustment for heavy narrative text | `computeLayoutDensity` (`comfortable` → `compact` → `tight` when text length > 520 or > 900 chars) |
| **Fillable / Custom Font** | Hand-drawn/script font for filled fields (Caveat, Patrick Hand, Kalam, Handlee) | `CSR_TEMPLATE_DEFAULTS` and `usePdfCustomization` |

---

## 4. Evidence-Based Renderer Comparison: Forme vs. Takumi

### 4.1 Package Identities and Versions
Evidence from `package.json` and `bun.lock`:
- **Forme packages:**
  - `@formepdf/core`: `0.20.1`
  - `@formepdf/react`: `0.20.1`
  - `@formepdf/shared`: `0.20.1`
- **Takumi packages:**
  - `takumi-pdf`: `0.14.3`
  - `@takumi-rs/helpers`: `2.13.7`
- **Current Baseline:**
  - `@react-pdf/renderer`: `4.3.2`

Both Forme and Takumi are already declared in `package.json` and resolved in `bun.lock`. Introducing either does not require adding a new package to the dependency manifest.

### 4.2 Comprehensive Capabilities Matrix

| Evaluation Dimension | React-PDF (Current Baseline) | Forme (`@formepdf/*`) | Takumi (`takumi-pdf`) | Impact on One-Page CSR |
|---|---|---|---|---|
| **A4 Portrait Geometry** | PASS (`595.28 × 841.89 pt`) | PASS (`595.28 × 841.89 pt`, exact) | PASS (`595.28 × 841.89 pt`, exact) | Neutral. Both produce exact physical A4 dimensions. |
| **Layout Model** | Flexbox (Yoga engine) | Block/Flow HTML-like table model | Flexbox (CSS-like) | **Takumi advantage.** CSR is composed of cards, badges, and horizontal strips, fitting flexbox better than table flow. |
| **Strict 1-Page Constraint** | Enforced via application density logic | Spills to page 2 if content exceeds budget | Spills to page 2 if content exceeds budget | **Neutral.** Neither engine has an automatic 1-page compressor. Application density logic is mandatory for both. |
| **Table Header Repetition** | PASS (via fixed bands) | PASS (`<Row header>` repeats on every page) | FAIL in pdfcn Table; PASS in native table | **Neutral.** CSR is strictly one page. Multi-page header repetition is irrelevant. |
| **Dynamic Page Numbers** | PASS (`render={({pageNumber})}`) | PASS (`{{pageNumber}} of {{totalPages}}`) | PASS (primitives) | **Neutral.** CSR is strictly one page ("Page 1 of 1"). |
| **Font Format Support** | Local WOFF / TTF via registry | **FAIL on WOFF/WOFF2 bytes** (`unknown magic`); TTF bytes only | **PASS on WOFF bytes** (tested in POC) | **Critical Takumi advantage.** BOUXRE `@fontsource` packages are WOFF. Forme crashes and forces Helvetica. |
| **Naira Symbol (`₦` U+20A6)** | PASS (via DejaVu/Noto fallback) | PASS (Inter TTF contains glyph) | PASS (with DejaVu fallback) | Both can render `₦`, but Forme requires local TTF files. |
| **Fillable / Custom Script Fonts** | PASS (Caveat, Patrick Hand, Kalam, Handlee) | **FAIL with repo fonts** (WOFF); requires bundling TTF files | **PASS with repo fonts** (WOFF bytes accepted) | **Takumi advantage.** CSR requires fillable script fonts for signatures. |
| **Image & Signature Embedding** | PASS (Data URI & URL) | PASS (Data URI PNG) | PASS (Data URI & prefetched bytes) | Neutral. Both embed technician signature images. |
| **Output File Size** | ~10 KB per 1-page document | ~75 KB per document (~7.5x overhead) | ~20–30 KB per document | **Takumi advantage.** Forme embeds large font subsets, wasting storage and bandwidth. |
| **Engine Footprint** | ~5 MB | ~20 MB WASM engine | ~15 MB WASM engine | Minor Takumi advantage. |
| **Browser Runtime (Vite/Client)** | Proven in production | **Proven in CPS** (`@formepdf/core/browser`) | **UNVERIFIED in browser bundle** (POC ran in Bun only) | **Forme advantage.** Forme browser WASM is already proven in CPS. Takumi browser WASM is unproven. |
| **Windows / Bun Developer Path** | Clean | Clean | **Buggy default entry** on Windows (requires manual `no-init`) | **Forme advantage.** Takumi requires a workaround on Windows developer machines. |

---

## 5. One-Page CSR Layout and Overflow Risks

### 5.1 The Fit-to-One-Page Fallacy
Neither Forme nor Takumi provides automatic text scaling or dynamic layout compression. If a technician enters a 1,500-character description of a generator engine overhaul with 15 spare parts:
- In Forme, the table or narrative block will push the signature block onto Page 2.
- In Takumi, the flex container will break into a second page.

Therefore, guaranteeing a strictly one-page CSR requires BOUXRE-owned rules regardless of the renderer:
1. **Character Budget Thresholds:** `computeLayoutDensity` must downgrade layout density from `comfortable` (7.8pt text, 8pt padding) to `compact` (7.5pt text, 6pt padding) or `tight` (7.2pt text, 4pt padding).
2. **Materials Section Overflow Strategy:** `resolveMaterialColumnBlocks` in `src/components/csr/preview-templates/layoutModel.ts` must detect when spare parts exceed vertical capacity (max items per column × column count) and fall back to `formatCommaMaterialsText` (inline comma-separated paragraph).
3. **Hard Vertical Clamps:** Fixed max-height on narrative containers with CSS/style text-overflow safeguards.

### 5.2 Forme-Specific Hazards for CSR
1. **Font Incompatibility:** Forme cannot use BOUXRE's existing `@fontsource/caveat`, `@fontsource/patrick-hand`, or `@fontsource/kalam` packages because they provide WOFF/WOFF2 formats. If Forme is used, either:
   - Standalone `.ttf` font files must be committed to the repository and bundled into Vite assets; or
   - The CSR template must forfeit custom handwriting fonts and use unstyled Helvetica.
2. **Column Math Sensitivity:** As recorded in `docs/reports/pdf/forme-invoice-poc-report.md` §2.3, Forme's native table layout squeezes or clips text if fractional and fixed column widths slightly exceed the content bounding box. In a dense CSR technical grid, this causes silent text wrapping or numeric clipping.

### 5.3 Takumi-Specific Hazards for CSR
1. **Unverified Browser WASM Integration:** While Takumi proved capable in Bun tests, the repository has not built a Vite browser bundle with `takumi-pdf`. In contrast, Forme's browser integration was completed during the CPS rollout. An unverified browser boundary carries deployment risk.
2. **Windows Developer Environment Bug:** Takumi's Bun entry point fails on Windows without manual initialization (`no-init`). Because the project's primary development environment is Windows with Bun, this creates developer friction.

---

## 6. Coexistence and Migration Safety

### 6.1 Architectural Decoupling
Per `docs/standard/pdf-migration-standard.md`, introducing a new renderer for CSR does not require migrating Invoice, Quotation, Waybill, or existing CSR templates.

The architecture enforces clean separation:
```text
Canonical Data (CsrObject / CsrRow)
        ↓
Domain Transformation (buildCsrRenderModel)
        ↓
Prepared Model (CsrRenderModel)
        ├── Existing Templates (Industry, Zinc, Minimal) → @react-pdf/renderer
        └── New Template (e.g. ModernOnePage) → Target Renderer (Takumi or Forme)
                    ↓
            PDF Bytes / Blob
                    ↓
        CompositePdfDelivery (Native / Web download)
```

### 6.2 Preserving Existing Templates
- The existing React-PDF templates (`IndustryCsr.tsx`, `Zinc.tsx`, `Minimal.tsx`) in `src/components/csr/preview-templates/` remain untouched.
- `getCsrPdfDocument` in `src/components/csr/preview-templates/index.tsx` routes template keys `'8'`, `'3'`, and `'6'` to React-PDF.
- The new template can be assigned a dedicated key (e.g., `'9'`) and invoked via a renderer-specific adapter without affecting existing templates.

---

## 7. Safest Next Implementation Step & Acceptance Criteria

### 7.1 Safest Next Step
Do not commit immediately to Forme or Takumi for production implementation. Execute a **timeboxed, single-file prototype spike** under `docs/reports/pdf/poc/` using a standardized CSR fixture (exercising maximum narrative length, 6 operational readings, 8 spare parts, and technician signature image).

The spike must test:
1. **Takumi Browser Vite Bundle Test:** Verify whether `takumi-pdf` renders inside a Vite client-side browser bundle without WASM loading failures.
2. **Font Resolution Test:** Verify whether Takumi or Forme renders the fillable handwriting font (`Caveat` or `Patrick Hand`) without converting font assets to `.ttf`.
3. **1-Page Boundary Verification:** Verify whether the rendered PDF page count strictly equals 1 under maximum stress-test data.

### 7.2 Measurable Acceptance Criteria for Future CSR Template Task
When the new CSR template implementation is authorized, it must satisfy:
1. **Strict Page Count:** Exactly 1 page (`pageCount === 1`) verified via `pdf-lib` for comfortable, compact, and tight test fixtures.
2. **Physical Dimensions:** Page dimensions strictly equal `595.28 × 841.89 pt` (A4 portrait).
3. **No Content Loss:** All 6 operational readings, narrative sections, and materials items are present in extracted text (`pdf-parse`).
4. **Font Compliance:** Document text renders in project font (Inter) and signatures render in approved handwriting font without falling back to generic courier/helvetica.
5. **No Regression on Existing Templates:** `Industry`, `Zinc`, and `Minimal` continue to render identically through `@react-pdf/renderer`.
6. **Delivery Compatibility:** Produces a standard `Blob` compatible with `downloadPdfFromElement` and `CompositePdfDelivery`.
7. **Bundle Safety:** No server-only dependencies leak into the client bundle; `bun run typecheck` passes with zero errors.

---

## 8. Verification & Git Status Summary

This task is a strict read-only documentation investigation.

### Prohibited Commands Check
- `bun run build`: NOT RUN (permanent hardware constraint).
- `bun run typecheck`: NOT RUN (prohibited for read-only report task).
- `bun run audit:load`: NOT RUN (prohibited for read-only report task).
- `bun run test`: NOT RUN (prohibited for read-only report task).

### Git Status Check
- **Initial working directory state:** Working tree contained uncommitted edits from previous tasks across 17 files.
- **Actions performed:** Inspected project documentation and package manifests. Created exactly one report file: `docs/reports/pdf/csr-one-page-pdf-renderer-investigation.md`.
- **Pre-existing changes:** No pre-existing changes were overwritten, reverted, or staged. No application source code or dependencies were modified.
