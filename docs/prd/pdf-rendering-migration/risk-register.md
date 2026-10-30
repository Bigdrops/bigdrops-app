# 05 — Risk Register & Mitigation Strategy (PDF Rendering Migration)

- **Status:** APPROVED RISK REGISTER & FROZEN DOCUMENTATION BASELINE (Ready for M1 Planning)
- **Architecture:** Forme Engine + `pdfcn` Design System
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Last Updated:** 2026-10-30

---

## 1. Risk Matrix Overview

| Risk ID | Risk Description | Severity | Likelihood | Residual Risk | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Premature Compaction Masking | High | High | Low | Engineering Lead |
| **R-02** | Indivisible Closing Block Fragmentation | High | High | Low | Template Developer |
| **R-03** | Table Column Geometry & Oversized Row Inflation | Medium | High | Low | Template Developer |
| **R-04** | Font Subsetting & Glyph Corruption | Critical | High | Low | Core Architect |
| **R-05** | Emoji Rendering Vector Syntax Failures | Medium | Medium | Low | Core Architect |
| **R-06** | Rich-Text / HTML Tag Ingestion | Medium | Medium | Medium | Template Developer |
| **R-07** | Company Logo Aspect-Ratio Distortion | Low | Medium | Low | Design Lead |
| **R-08** | Over-Compaction Legibility Degradation | High | Medium | Low | QA / Design Lead |
| **R-09** | Hyperlink Coordinate Drift | Medium | Low | Low | Engine Integrator |
| **R-10** | Offline Mobile Font Delivery Failure | High | Medium | Low | Engine Integrator |
| **R-11** | Host RAM Exhaustion via Build Execution | Critical | Low | Low | All Agents |
| **R-12** | Premature Legacy Dependency Retirement | Critical | Low | Low | Project Lead |

---

## 2. Detailed Risk Descriptions & Mitigation Actions

### ⚠️ R-01: Premature Compaction Masking
- **Description:** Developers or AI agents might use Compact Mode or Force 1 Page Mode to shrink a document, hiding the fact that natural pagination (Normal Mode) is broken.
- **Root Cause:** Historical reliance on compaction to solve layout overflow rather than fixing root causes (column widths, closing blocks, defensive padding).
- **Mitigation Strategy:**
  1. Enforce strict sequential gating in [`Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Waterfall-roadmap.md).
  2. Phase 2 (Natural Pagination) must achieve sign-off across the complete **Gate 1 Representative Document Suite** (short documents, `SASQUO-000427`, wrapping descriptions, large totals, notes/terms, signatures, multi-page distributions) in **Normal Mode** before any code for Compact Mode or Force 1 Page Mode may be written.
  3. Acceptance tests must explicitly verify that `SASQUO-000427` fits onto 1 page naturally under Normal Mode without compact tokens.

---

### ⚠️ R-02: Indivisible Closing Block Fragmentation
- **Description:** Coupling Bank Details and Totals in an indivisible container (`wrap={false}`) forces large vertical blocks across page boundaries when space is tight (observed as 113.73 pt in `SASQUO-000427`).
- **Root Cause:** Inflexible flex-row layout in legacy `IndustryTemplate.tsx`.
- **Mitigation Strategy:**
  1. Decouple Bank Details and Totals into independent layout primitives.
  2. Implement an adaptive layout container:
     - Side-by-side when remaining vertical space $\ge H_{\text{closing}}$ and page width permits.
     - Stacked or split across pages when vertical space is restricted: Totals stay on the primary page with the line items; Bank Details adaptively stack or move to the next page.
  3. Avoid promising an absolute zero-break guarantee; eliminate avoidable premature breaks through adaptive layout rather than rigid row balancing.

---

### ⚠️ R-03: Table Column Geometry & Oversized Row Inflation
- **Description:** Hardcoded narrow column widths (observed as `make: { pdfWidth: 58 }`) force text wrapping across many rows, adding unnecessary vertical height (~131 pt in `SASQUO-000427`). Additionally, exceptionally long descriptions in a single row could overflow page height and trigger clipping.
- **Root Cause:** Inflexible column width definitions in `table.ts` and lack of an oversized row handling strategy.
- **Mitigation Strategy:**
  1. Test and apply candidate column widths based on realistic B2B dataset analysis (e.g. `make` column widened to candidate target of 72 pt).
  2. Implement a column budget calculator that distributes remaining table width proportionally to content-heavy columns.
  3. Ordinary rows stay intact across pages where possible; for oversized rows exceeding available page height, implement a safe fragmentation or controlled fallback strategy to prevent clipping or silent content loss.

---

### ⚠️ R-04: Font Subsetting & Glyph Corruption
- **Description:** Double-prime (`″`), Naira (`₦`), and engineering symbols (`²`, `×`, `±`, `°`) corrupt into digits (`23`, `33`, `43`) or missing squares.
- **Root Cause:** `safeText.ts` exempting Unicode ranges without font glyph verification, combined with standard PDF Helvetica fallback. WinAnsi modulo-256 truncation is a technically plausible suspected cause.
- **Mitigation Strategy:**
  1. Trace font fallback and encoding paths empirically during Phase 1 font setup.
  2. Embed complete TrueType (`.ttf`) binary fonts (Inter TTF) with full Latin-1 and currency glyph sets.
  3. Implement a deterministic typography preprocessor:
     - Map double-prime (`U+2033`) to ASCII quote (`"`, `U+0022`) or native Unicode glyph if font supports it.
     - Map Naira (`U+20A6`) with embedded font or inline SVG vector icon fallback.
     - Never allow 16-bit Unicode characters to truncate modulo 256.

---

### ⚠️ R-05: Emoji Rendering Vector Syntax Failures
- **Description:** OpenType COLR, CBDT, and sbix color emoji tables cannot be parsed by standard vector PDF generators, causing syntax crashes when user input contains emoji (e.g. `🛞`).
- **Root Cause:** User enters emoji in item descriptions or notes.
- **Mitigation Strategy:**
  1. Preserve surrounding text without corrupting the description or crashing the PDF.
  2. Implement a regex emoji detector in the document text normalization pipeline.
  3. Substitute a small, justified set of high-frequency commercial equipment symbols with bundled monochrome SVG vector icons.
  4. Provide a safe fallback (clean stripping or neutral placeholder) for unsupported emoji. Do not make a large emoji library a prerequisite for the first template.

---

### ⚠️ R-06: Rich-Text / HTML Tag Ingestion
- **Description:** Users paste formatted text containing HTML tags (`<b>`, `<i>`, `<ul>`, `<li>`, `<br>`) into line item descriptions or terms, causing broken rendering or XML parser errors.
- **Root Cause:** Quotation description inputs in Supabase contain rich-text HTML strings.
- **Mitigation Strategy:**
  1. Implement a structured 5-step conversion pipeline:
     - Sanitize incoming HTML via DOMPurify with strict allowlist (compatible with desktop and Capacitor mobile WebViews).
     - Parse sanitized HTML into an intermediate tree.
     - Convert permitted nodes into a controlled document AST.
     - Render AST via Forme components (`<Text>`, `<Strong>`, `<Em>`, `<UnorderedList>`, `<ListItem>`).
     - Apply predictable fallback (strip unsupported tags to plain text).
  2. Limit scope to essential commercial formatting (bold, italic, underline, lists, paragraphs).

---

### ⚠️ R-07: Company Logo Aspect-Ratio Distortion
- **Description:** User-uploaded company logos appear stretched, squashed, or clipped when placed into fixed-dimension header slots.
- **Root Cause:** Using fixed width and height on image containers without aspect-ratio preservation.
- **Mitigation Strategy:**
  1. Enforce `objectFit: 'contain'` semantics on all image wrappers in `pdfcn`.
  2. Calculate proportional bounding boxes using natural image dimensions.

---

### ⚠️ R-08: Over-Compaction Legibility Degradation
- **Description:** Force 1 Page mode could aggressively shrink text size or padding, making the document unreadable or legally non-compliant.
- **Root Cause:** Unconstrained optimization algorithms prioritizing single-page fit over document legibility.
- **Mitigation Strategy:**
  1. Establish that **commercial legibility takes precedence over single-page fitting**.
  2. Treat candidate floor limits (candidate minimum font size **7 pt**, candidate minimum table row padding **2 pt**) as **provisional candidate targets** requiring empirical readability testing before final sign-off.
  3. If the document exceeds 1 page after maximum allowable compaction, the engine must abort 1-page mode and output a clean, readable 2-page document with a user-facing notice.

---

### ⚠️ R-09: Hyperlink Coordinate Drift
- **Description:** Clickable `/Link` annotations drift away from visual images when documents scale, rotate, or reflow.
- **Root Cause:** Absolute coordinate calculations that fail to account for page margin offsets and aspect-ratio scaling.
- **Mitigation Strategy:**
  1. Use Forme's native `<Image href="...">` and relative bounding box overlays.
  2. Include coordinate-accuracy automated test assertions in the test suite (`TS-5`).

---

### ⚠️ R-10: Offline Mobile Font Delivery Failure
- **Description:** Loading static TrueType font files over HTTP (`fetch()`) fails in Capacitor mobile apps when the device is offline or in flight mode.
- **Root Cause:** WebView network boundary restrictions when generating PDFs client-side without an active internet connection.
- **Mitigation Strategy:**
  1. Test static TTF asset delivery in offline Capacitor Android/iOS builds during Phase 1.
  2. Retain binary font bundling (base64/arraybuffer import) as a proven fallback if static fetching proves unreliable.

---

### ⚠️ R-11: Host RAM Exhaustion via Build Execution
- **Description:** Running `bun run build` exhausts RAM on the development/host machine, causing crashes and session aborts.
- **Root Cause:** Vite full-app bundling requires more RAM than available on the development container.
- **Mitigation Strategy:**
  1. Document explicit warnings in `AGENTS.md`, `Prerequisites.md`, and this risk register.
  2. Agents and developers must verify changes using `bun run audit:load` and `bun run typecheck`.
  3. `bun run build` is permanently banned.

---

### ⚠️ R-12: Premature Legacy Dependency Retirement
- **Description:** Uninstalling `@react-pdf/renderer` before all document families (Waybill, BOQ, CSR) migrate breaks production PDF exports.
- **Root Cause:** Premature cleanup before verifying 100% dependency elimination across the repository.
- **Mitigation Strategy:**
  1. `@react-pdf/renderer` remains installed in `package.json` until Phase 6.
  2. Run static AST import analysis across `src/` to confirm zero remaining imports before initiating dependency removal.
