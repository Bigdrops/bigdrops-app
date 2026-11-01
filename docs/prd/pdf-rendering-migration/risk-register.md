# 05 — Risk Register & Mitigation Strategy (PDF Rendering Migration)

- **Status:** AUTHORITATIVE RISK REGISTER & MITIGATION STRATEGY
- **Architecture:** Forme Engine (`@formepdf/react` & `@formepdf/core` v0.20.1) + `pdfcn` Presentation Layer
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Eight In-Scope Document Types. BOQ Excluded.

---

## 1. Risk Matrix Overview

| Risk ID | Risk Description | Severity | Likelihood | Residual Risk | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Premature Compaction Masking | High | High | Low | Engineering Lead |
| **R-02** | Indivisible Closing Block Fragmentation | High | High | Low | Template Developer |
| **R-03** | Table Column Geometry & Oversized Row Inflation | Medium | High | Low | Template Developer |
| **R-04** | Font Subsetting & Glyph Corruption ($2'' \to 23$) | Critical | High | Low | Core Architect |
| **R-05** | Emoji Rendering Vector Syntax Failures | Medium | Medium | Low | Core Architect |
| **R-06** | Rich-Text / HTML Tag Ingestion | Medium | Medium | Medium | Template Developer |
| **R-07** | Company Logo Aspect-Ratio Distortion | Low | Medium | Low | Design Lead |
| **R-08** | Over-Compaction Legibility Degradation | High | Medium | Low | QA / Design Lead |
| **R-09** | Hyperlink Coordinate Drift | Medium | Low | Low | Engine Integrator |
| **R-10** | Offline Mobile Font Delivery Failure | High | Medium | Low | Engine Integrator |
| **R-11** | Host RAM Exhaustion via Build Execution | Critical | Low | Low | All Agents |
| **R-12** | Premature Legacy Dependency Retirement | Critical | Low | Low | Project Lead |
| **R-13** | CORS and Remote Storage Image Failure | High | High | Low | Core Architect |
| **R-14** | Incomplete PO Canonical Preparation Contract | High | High | Low | Domain Architect |
| **R-15** | Variable Font Layout and Weight Distortion | High | High | Low | Engine Integrator |
| **R-16** | Silent Font Fallback Masking Layout Bugs | Medium | High | Low | Core Architect |
| **R-17** | Capacitor Relative Base Path (`base: './'`) | High | Medium | Low | Mobile Integrator |
| **R-18** | Offline Media Gaps (Uncached Logos & Signatures) | Medium | High | Low | Core Architect |
| **R-19** | Forme Style Incompatibility (`objectFit`) | Medium | High | Low | Template Developer |
| **R-20** | Duplicate Global Font Registration | Low | Medium | Low | Engine Integrator |
| **R-21** | Existing Dirty-Worktree Collisions | Medium | High | Low | All Agents |
| **R-22** | Delivery Subsystem Fragmentation | Medium | Medium | Low | System Architect |

---

## 2. Detailed Risk Descriptions & Concrete Mitigations

### ⚠️ R-01: Premature Compaction Masking
- **Description:** Developers or AI agents might use Compact Mode or Force 1 Page Mode to shrink a document, hiding broken natural pagination.
- **Root Cause:** Historical reliance on compaction to solve layout overflow rather than fixing root causes (column widths, closing blocks, defensive padding).
- **Mitigation Strategy:**
  1. Enforce strict sequential gating in [`Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/pdf-rendering-migration/Waterfall-roadmap.md).
  2. Milestone M2 (Natural Pagination) must achieve sign-off across the complete **Gate 1 Representative Document Suite** in **Normal Mode** before any code for Compact Mode or Force 1 Page Mode may be written.
  3. Acceptance tests must explicitly verify that `SASQUO-000427` fits onto 1 page naturally under Normal Mode without compact tokens.

---

### ⚠️ R-02: Indivisible Closing Block Fragmentation
- **Description:** Coupling Bank Details and Totals in an indivisible container (`wrap={false}`) forces large vertical blocks across page boundaries (observed as 113.73 pt in `SASQUO-000427`).
- **Root Cause:** Inflexible flex-row layout in legacy `IndustryTemplate.tsx`.
- **Mitigation Strategy:**
  1. Decouple Bank Details and Totals into independent layout primitives.
  2. Implement adaptive layout: side-by-side when vertical space permits; adaptively stacked or moved to continuation pages when space is restricted. Totals remain prioritized with line items on the primary page.

---

### ⚠️ R-03: Table Column Geometry & Oversized Row Inflation
- **Description:** Hardcoded narrow column widths (observed as `make: { pdfWidth: 58 }`) force text wrapping across many rows, adding unnecessary vertical height (~131 pt in `SASQUO-000427`). Additionally, exceptionally long descriptions in a single row could overflow page height and trigger clipping.
- **Mitigation Strategy:**
  1. Apply candidate column widths based on realistic B2B dataset analysis (`make` column widened to at least 72 pt).
  2. Ordinary rows stay intact across pages where possible; for oversized rows exceeding available page height, implement safe internal fragmentation or virtual sub-row splitting to prevent clipping or content omission.

---

### ⚠️ R-04: Font Subsetting & Glyph Corruption ($2'' \to 23$)
- **Description:** Double-prime (`″`), Naira (`₦`), and engineering symbols (`²`, `×`, `±`, `°`) corrupt into digits (`23`, `33`, `43`) or missing squares.
- **Root Cause Confirmed:** In `@react-pdf/pdfkit/lib/pdfkit.js`, `encodeText` pushes `char.toString(16)` for unmapped characters. For `U+2033` (8243, `0x2033`), it outputs `'2033'`. In 1-byte WinAnsi text chunks, conforming viewers decode `0x32` (`'2'`), `0x20` (space), and `0x33` (`'3'`), rendering $2''$ as `23`. This defect occurs when Latin-subset fonts (such as `Lato` or `Orbitron`) lack `U+2033` and bypass glyph checks in `safeText.ts`.
- **Mitigation Strategy:**
  1. Procure and embed complete static TrueType (`.ttf`) binaries (Inter TTF, Caveat, Archivo Black, Noto Sans) with verified cmap coverage of `U+2032`, `U+2033`, and `U+20A6`.
  2. Forme embeds Identity-H 2-byte font streams, permanently eliminating WinAnsi 1-byte decoding corruption.
  3. Deploy read-only glyph diagnostic utilities to report unmapped characters during pre-render checks.

---

### ⚠️ R-05: Emoji Rendering Vector Syntax Failures
- **Description:** OpenType COLR, CBDT, and sbix color emoji tables cannot be parsed by standard vector PDF generators, causing syntax crashes when user input contains emoji (e.g. `🛞`).
- **Mitigation Strategy:**
  1. Preserve surrounding text 100%.
  2. Substitute a small, curated set of high-frequency commercial equipment symbols with bundled monochrome SVG vector icons.
  3. Provide a safe fallback (clean stripping or neutral placeholder) for unmapped emoji without interrupting document flow.

---

### ⚠️ R-06: Rich-Text / HTML Tag Ingestion
- **Description:** Users paste formatted text containing HTML tags into line item descriptions or terms, causing raw HTML tags to render literally or crash parsers.
- **Mitigation Strategy:**
  1. Implement structured 5-step conversion: Sanitize $\to$ Parse $\to$ Allowlisted AST $\to$ Forme Render $\to$ Plain Text Fallback.
  2. Limit scope to essential commercial formatting (bold, italic, underline, lists, paragraphs). Arbitrary CSS and scripts are stripped.

---

### ⚠️ R-07: Company Logo Aspect-Ratio Distortion
- **Description:** Logos appear stretched or squashed when rendered inside rigid square boxes.
- **Mitigation Strategy:**
  1. Preserves natural aspect ratios via explicit height or width constraints in `BrandLogo` and media components.
  2. Provide height-only or width-only sizing so wide lockups stay wide and tall marks stay tall.

---

### ⚠️ R-08: Over-Compaction Legibility Degradation
- **Description:** Aggressive compaction in Force 1 Page mode could shrink text or margins to unreadable sizes.
- **Mitigation Strategy:**
  1. Legibility-first safeguard: candidate floors (7 pt font, 2 pt padding) are provisional targets subject to readability testing.
  2. The system must never drop line items, totals, or signatures to satisfy a 1-page target.
  3. Graceful fallback: uncompressible documents automatically output a clean 2-page document with an in-app notice.

---

### ⚠️ R-09: Hyperlink Coordinate Drift
- **Description:** Clickable link annotations (`/Annots /Link`) drift from their visual elements during document scaling or orientation changes.
- **Mitigation Strategy:**
  1. Leverage Forme's native `/Annots /Link` generation.
  2. Test coordinate alignment via automated MuPDF extraction in both Portrait and Landscape orientations.

---

### ⚠️ R-10: Offline Mobile Font Delivery Failure
- **Description:** Capacitor mobile apps on Android or iOS cannot load static fonts when disconnected from the internet.
- **Mitigation Strategy:**
  1. Vite copies `public/fonts/` into `dist/fonts/` during bundling.
  2. Capacitor serves `dist/` as local origin (`https://localhost/fonts/...`).
  3. Perform physical device verification during Milestone M1B testing. Retain base64 binary bundling as a verified fallback.

---

### ⚠️ R-11: Host RAM Exhaustion via Build Execution
- **Description:** Running `bun run build` exhausts host memory on machines with 4GB RAM ceilings.
- **Mitigation Strategy:**
  1. `bun run build` is permanently prohibited by repository operational rules.
  2. Verification relies on `bun run audit:load`, `bun run typecheck`, and focused Bun CLI test executions.

---

### ⚠️ R-12: Premature Legacy Dependency Retirement
- **Description:** Uninstalling `@react-pdf/renderer` before all eight document families are migrated breaks production features.
- **Mitigation Strategy:**
  1. `@react-pdf/renderer` remains pinned until Milestone M6.
  2. Only when AST analysis confirms zero remaining imports of `@react-pdf/renderer` across `src/` may the package be uninstalled.

---

### ⚠️ R-13: CORS and Remote Storage Image Failure
- **Description:** Remote images hosted on Supabase Storage fail to load during client-side PDF export because of missing CORS headers or network errors. Client-side base64 conversion fails because `fetch()` is blocked.
- **Mitigation Strategy:**
  1. Implement non-throwing media loading in `mediaResolver.ts`.
  2. If `fetch()` fails due to CORS, timeout, or network unavailability, catch error, return `null` data URI, and emit a diagnostic warning.
  3. Document templates render clean text branding when logo is `null`, ensuring PDF generation never crashes.

---

### ⚠️ R-14: Incomplete PO Canonical Preparation Contract
- **Description:** PO domain logic exists in `src/domain/purchase-order/calculations.ts`, but the dedicated canonical PDF preparation contract `preparePurchaseOrderDocument.ts` is missing, blocking PO template integration into the Master Deterministic Resolver.
- **Mitigation Strategy:**
  1. Formally record Milestone M1C dedicated to authoring `preparePurchaseOrderDocument.ts` in `src/domain/pdf/resolver/commercial/`.
  2. Adapt PO fields (supplier snapshot, procurement terms, unit cost, purchasing authorizations) into the canonical envelope.
  3. Preserve existing PO template layouts without forcing an invoice layout.

---

### ⚠️ R-15: Variable Font Layout and Weight Distortion
- **Description:** Deploying variable fonts (such as `docs/reports/pdf/poc/assets/inter-var.ttf`) into Forme causes Wasm table parsing warnings and incorrect weight instantiation.
- **Mitigation Strategy:**
  1. Strictly prohibit variable font binaries in production.
  2. Deploy static, single-weight TrueType binaries (`Inter-Regular.ttf`, `Inter-Bold.ttf`) with explicit weights registered.

---

### ⚠️ R-16: Silent Font Fallback Masking Layout Bugs
- **Description:** Font loader silently substituting `Inter` for unknown font requests hides configuration errors and missing assets.
- **Mitigation Strategy:**
  1. Reject silent mapping to `Inter`.
  2. Emit explicit diagnostic telemetry on unregistered font requests.
  3. Fall back visibly to standard `Helvetica` so font configuration defects are immediately observable.

---

### ⚠️ R-17: Capacitor Relative Base Path (`base: './'`)
- **Description:** In `vite.config.js`, `base: './'` is configured. In Capacitor mobile WebViews, absolute URL fetches (`fetch('/fonts/Inter-Regular.ttf')`) may resolve differently across Android (`https://localhost/`) and iOS (`capacitor://localhost/`).
- **Mitigation Strategy:**
  1. Test URL resolution in Android and iOS emulator/device runtimes during Milestone M1B verification.
  2. If relative path resolution differs on iOS WKWebView, provide an environment-aware URL prefix helper or fall back to base64 binary font imports.

---

### ⚠️ R-18: Offline Media Gaps (Uncached Logos & Signatures)
- **Description:** `src/lib/native/invoiceCache.ts` only caches invoice line items and invoices. It does not cache company logos, signatures, or documents in other families. Offline mobile users will lose remote images.
- **Mitigation Strategy:**
  1. Acknowledge and document that offline mobile exports cannot fetch remote images unless previously stored in local cache.
  2. Ensure all document templates render gracefully with text branding when image data is `null`.

---

### ⚠️ R-19: Forme Style Incompatibility (`objectFit`)
- **Description:** React-PDF supports `objectFit: 'contain'`, but Forme's `Style` interface does not. Passing `objectFit` in Forme style objects causes TypeScript compilation errors.
- **Mitigation Strategy:**
  1. Enforce explicit numeric `width` and `height` props on `<Image>` primitives.
  2. Avoid passing `objectFit` in style definitions.

---

### ⚠️ R-20: Duplicate Global Font Registration
- **Description:** Calling `Font.register()` repeatedly during document export leaks memory in long-running browser sessions.
- **Mitigation Strategy:**
  1. Guard font registration in `src/components/pdf/forme/fonts.ts` with a module-level `Set<string>`.
  2. Only register a font family if it has not been registered previously.

---

### ⚠️ R-21: Existing Dirty-Worktree Collisions
- **Description:** Pre-existing uncommitted modifications and untracked files in the working directory risk being accidentally overwritten, staged, or deleted during PDF migration tasks.
- **Mitigation Strategy:**
  1. Always run `git status --short` before and after every task.
  2. Strictly avoid modifying files outside the authorized milestone scope.
  3. Never run `git clean`, `git reset --hard`, or indiscriminate git add commands.

---

### ⚠️ R-22: Delivery Subsystem Fragmentation
- **Description:** Individual document templates invoking raw Forme rendering functions directly rather than utilizing `CompositePdfDelivery`, causing divergent caching, analytics, and error handling.
- **Mitigation Strategy:**
  1. Route all document export actions through `CompositePdfDelivery`.
  2. Standardize PDF byte generation, local caching, download triggers, and error reporting across all eight document families.
