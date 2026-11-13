# Decision Governance Register — PDF Rendering Migration

- **Status:** AUTHORITATIVE DECISION LOG & ARCHITECTURAL RECORD
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Document Authority:** This register records approved decisions, accepted proposals, rejected alternatives, verified technical facts, and unresolved founder questions across the BOUXRE PDF migration.

---

## 1. Decision Status Classification Framework

All architectural choices, technical recommendations, and governance items are classified under the following explicit statuses:

- 🟢 **APPROVED** — Formally approved by project leadership / architecture. Binding on implementation.
- 🟡 **ACCEPTED WITH QUALIFICATIONS** — Approved subject to specific constraints, conditions, or testing gates.
- 🔵 **PROPOSED** — Technical proposal under active review; not yet authorized for implementation.
- 🔴 **REJECTED** — Formally evaluated and rejected. Must not be reintroduced.
- ⚪ **UNRESOLVED** — Known question or trade-off requiring founder / lead decision before proceeding.
- 🔬 **VERIFIED** — Empirically verified fact or capability confirmed through source code or test execution.
- ❓ **NOT VERIFIED** — Claim from historical reports or vendor documentation that has not been independently verified.

---

## 2. Approved Architecture & Core Decisions

| Decision ID | Topic | Status | Approved Decision & Architecture Rationale |
| :--- | :--- | :--- | :--- |
| **DEC-01** | **Target Rendering Engine** | 🟢 **APPROVED** | Adopt **Forme** (`@formepdf/react` and `@formepdf/core` v0.20.1) as the PDF layout and generation engine, wrapped by the **pdfcn** design system. Replaces `@react-pdf/renderer` across all document types. |
| **DEC-02** | **8-Document Scope** | 🟢 **APPROVED** | In-scope documents: **Invoice, Quotation, Purchase Order (PO), Cost Pricing Sheet (CPS), Request for Quotation (RFQ), Waybill, Receipt, Customer Service Report (CSR)**. Bill of Quantities (**BOQ**) is **explicitly excluded**. |
| **DEC-03** | **Critical Commercial Group Alignment** | 🟢 **APPROVED** | **Invoice, Quotation, and Purchase Order (PO)** share common commercial infrastructure (fonts, media resolution, glyph diagnostics, low-level Forme primitives, delivery). However, each retains independent document structures and templates. Existing PO templates are strictly preserved; PO is an outgoing supplier-facing document (AP), not a client invoice. |
| **DEC-04** | **Subsystem Responsibility Boundaries** | 🟢 **APPROVED** | Formally establish boundaries defined in Milestone M1A: Domain Preparation owns business calculations and canonical models; Master Resolver owns deterministic template selection and envelope construction; Customization Engine owns preferences; `pdfcn` owns tokens and primitives; Forme owns layout and PDF compilation; Composite Delivery owns persistence and dispatch. |
| **DEC-05** | **No Universal Table Abstraction** | 🟢 **APPROVED** | Shared infrastructure must not force all document families into identical table structures or layout abstractions. Each document family maintains its own table semantics and column budgeting. |
| **DEC-06** | **Natural Pagination Precedence (Gate 1)** | 🟢 **APPROVED** | Natural pagination (Normal Mode) across the complete Representative Document Suite (`SASQUO-000427`, `SASQUO-000428`, `SASQUO-430`, etc.) must pass before any code for Compact Mode or Force 1 Page Mode is written. Compaction must never mask broken pagination. |
| **DEC-07** | **Adaptive Closing Sections** | 🟢 **APPROVED** | Bank Details and Totals are decoupled into independent layout containers. They display side-by-side when space permits, and adaptively stack or continue onto the next page when space is restricted. Blanket `<View wrap={false}>` on closing sections is permanently prohibited. |
| **DEC-08** | **Dynamic Footer Space Reservation** | 🟢 **APPROVED** | Replace hardcoded defensive page padding (`paddingBottom: 48`) with Forme native `<Fixed position="footer">` dynamic reservation. |
| **DEC-09** | **Text Preservation Rule** | 🟢 **APPROVED** | User input text is immutable in the rendering layer. General-purpose Unicode sanitizers that strip emojis, rewrite primes, or alter commercial descriptions are rejected. System uses read-only glyph diagnostics that report missing characters without mutating document text. |
| **DEC-10** | **Single Font Registration Authority** | 🟢 **APPROVED** | Preserve [`src/components/pdf/forme/fonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/fonts.ts) as the sole font registration module. It must manage dual-runtime path resolution (fs path in Bun; URL in web/Capacitor) and emit observable fallback telemetry. |
| **DEC-11** | **Static TrueType Requirement** | 🟢 **APPROVED** | Forme strictly requires uncompressed TrueType (`.ttf`) or OpenType (`.otf`) SFNT streams. WOFF/WOFF2 and variable fonts are prohibited in production Forme templates. |
| **DEC-12** | **Hardware Gate Enforcement** | 🟢 **APPROVED** | `bun run build` is permanently prohibited due to the host's 4GB RAM ceiling. Verification relies on `bun run audit:load`, `bun run typecheck`, and focused Bun CLI tests. |

---

## 3. Accepted Decisions with Qualifications

| Decision ID | Topic | Status | Decision & Required Qualifications |
| :--- | :--- | :--- | :--- |
| **DEC-13** | **Provisional Compaction Candidate Targets** | 🟡 **ACCEPTED WITH QUALIFICATIONS** | The candidate 32 styling tokens in `compact.ts` (margin $= 24\text{ pt}$, row padding $= 3\text{ pt}$, body font $= 8\text{ pt}$), the candidate **72 pt** `make` column width, and the candidate **7 pt** typography floor are accepted as **provisional targets**, subject to empirical legibility testing during Phase 2 and 3. |
| **DEC-14** | **Force 1 Page Mode Legibility Floor** | 🟡 **ACCEPTED WITH QUALIFICATIONS** | Force 1 Page mode is accepted subject to the strict rule: **Commercial Legibility Over Page Count**. The system must never drop line items, totals, or signatures to fit on one page. If uncompressible, it must gracefully fall back to a clean 2-page document with an in-app notice. |
| **DEC-15** | **Scoped Emoji Handling** | 🟡 **ACCEPTED WITH QUALIFICATIONS** | Scoped emoji handling is accepted: surrounding text must be preserved 100%; high-frequency commercial equipment symbols may map to bundled monochrome SVG vector icons; unmapped emojis strip cleanly from text runs without crashing. Building a large emoji library is explicitly not a blocker for initial template delivery. |
| **DEC-16** | **Secondary Currency Font (Noto Sans)** | 🟡 **ACCEPTED WITH QUALIFICATIONS** | Full static Inter v4.0 contains `₦` (`U+20A6`). However, retaining static `NotoSans-Regular.ttf` is accepted as a qualified defense-in-depth currency fallback across global locales. |
| **DEC-25** | **Consolidation to Four Supported Font Families** | 🟢 **APPROVED** | Consolidate the PDF typography system to exactly four supported families: **Inter** (primary document typography), **Archivo Black** (display headings), **Caveat** (sole handwriting font), and **Noto Sans** (currency and symbol fallback). Retire Patrick Hand, Handlee, Kalam, Reenie Beanie, and Sue Ellen Francisco from production. CSR and Waybill defaults set to Caveat. Redundant single-choice handwriting font selectors removed from customization interfaces. |
| **DEC-26** | **Commercial Template Retention & Deletion** | ⏭️ **SUPERSEDED (2026-11-12)** | *Original:* Consolidate commercial templates to four: **Industry** (migrated to Forme; React-PDF `IndustryTemplate` retained for comparison), **Minimal** (retained React-PDF), **Evergreen** (retained React-PDF), and **Crest** (retained React-PDF). *Superseded by:* M7/M8/M9 and M5 Forme migrations (2026-11-08/2026-11-12) — Evergreen was migrated and its React-PDF files retired anyway; Minimal/Evergreen/Crest Forme-only since 2026-11-08. The `industry-react-pdf` compat alias remains only as a stored-template data safety net. | DEC-30 (2026-11-12) |
| **DEC-27** | **Dual-Renderer Comparison in Commercial Template Picker** | ⏭️ **SUPERSEDED (2026-11-12)** | *Original:* Expose both Industry renderers (`Industry — Forme` vs `Industry — React-PDF`) as selectable picker options. *Superseded by:* Industry React-PDF was retired during the migration wave; every commercial route resolves to `-forme` (`src/components/pdf/index.ts`, `_engine` parameter ignored); the compare option no longer exists. | DEC-30 (2026-11-12) |

---

## 4. Formally Rejected Approaches

| Decision ID | Topic | Status | Rejected Approach & Disqualification Rationale |
| :--- | :--- | :--- | :--- |
| **DEC-17** | **Takumi PDF Engine Spike** | 🔴 **REJECTED** | Exploratory spike abandoned. Replaced by Forme (`@formepdf/react` and `@formepdf/core`). |
| **DEC-18** | **Typst / CLI Binary Spikes** | 🔴 **REJECTED** | Disqualified due to browser bundle limitations and inability to run native CLI binaries in mobile WebViews. |
| **DEC-19** | **Puppeteer / Headless Chrome HTML-to-PDF** | 🔴 **REJECTED** | Disqualified due to server memory consumption, high latency, and incompatibility with client-side mobile offline export. |
| **DEC-20** | **Universal Table / Template Abstraction** | 🔴 **REJECTED** | Disqualified because forcing Invoice, PO, Waybill, Receipt, and CSR into a single table component broke document-specific semantics and layout requirements. |
| **DEC-21** | **Silent Font Fallback to Inter** | 🔴 **REJECTED** | Disqualified because silently mapping unknown font requests to `Inter` masked missing assets, configuration defects, and broken template setups. Succeeded by explicit fallback to `Helvetica` with diagnostic warnings. |
| **DEC-22** | **General-Purpose Silent Unicode Sanitizer** | 🔴 **REJECTED** | Disqualified because automated rewriting of descriptions, primes, and emojis corrupted legal contracts and technical measurements. Succeeded by the Text Preservation Rule. |
| **DEC-23** | **Server-Side Image Proxy in M1B** | 🔴 **REJECTED** | Excluded from Milestone M1B pending security review regarding SSRF, bandwidth amplification, and authentication. |
| **DEC-24** | **Variable Font Deployment (`inter-var.ttf`)** | 🔴 **REJECTED** | Variable fonts are rejected for production Forme templates because Forme's underlying Rust Wasm parser parses static tables (`glyf`, `loca`, `CFF `) and triggers warnings or weight distortion with variation tables. |

---

## 5. Verified Repository Realities

| Finding ID | Scope | Status | Empirical Codebase Reality |
| :--- | :--- | :--- | :--- |
| **VER-01** | **TrueType Font Scarcity** | 🔬 **VERIFIED** | The repository contains only **one** production TrueType font: [`public/fonts/ArchivoBlack-Regular.ttf`](file:///c:/Users/DELL/Desktop/bigdrops-app/public/fonts/ArchivoBlack-Regular.ttf) (90,988 bytes). All `@fontsource/*` packages in `node_modules` ship exclusively `.woff` and `.woff2` files. |
| **VER-02** | **CPS Silent Helvetica Bug** | 🔬 **VERIFIED** | In `src/components/pdf/forme/fonts.ts`, `FORME_SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf']`. Because all registered shared commercial fonts are `.woff`, CPS Forme exports evaluate font source as false and silently fall back to `Helvetica`. |
| **VER-03** | **PDFKit Hex Serialization Root Cause** | 🔬 **VERIFIED** | In `node_modules/@react-pdf/pdfkit/lib/pdfkit.js` (lines 3110–3116 and 38670), `encodeText` serializes unmapped characters as `char.toString(16)`. For `U+2033` (8243, `0x2033`), it outputs `'2033'`. In 1-byte WinAnsi text chunks, conforming viewers decode `0x32` (`'2'`), `0x20` (space), and `0x33` (`'3'`), rendering $2''$ as `23`. This defect occurs when Latin-subset fonts like `Lato` or `Orbitron` lack `U+2033` and bypass glyph checks in `safeText.ts`. |
| **VER-04** | **CORS & Base64 Boundary** | 🔬 **VERIFIED** | In browser runtimes, client-side base64 conversion does **not** bypass CORS. `fetch(url)` must succeed before JavaScript can read binary bytes. If the remote server lacks CORS headers, `fetch()` throws an error and no base64 URI can be created. |
| **VER-05** | **Scope of `invoiceCache.ts`** | 🔬 **VERIFIED** | `src/lib/native/invoiceCache.ts` stores only `invoice_items` and `invoices`. It does not store company logos, signatures, or documents in Waybill, CSR, CPS, RFQ, Receipt, or PO families. |
| **VER-06** | **Vite Relative Base Path** | 🔬 **VERIFIED** | In `vite.config.js`, `base: './'` is configured. In Capacitor mobile WebViews, absolute URL fetches (`/fonts/*.ttf`) require physical device runtime verification. |
| **VER-07** | **CSR BrandLogo Implementation** | 🔬 **VERIFIED** | In [`src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx), `BrandLogo` renders `<Image>` or returns `null`. It does **not** render a fallback SVG vector mark in production code. |
| **VER-08** | **Forme `objectFit` Incompatibility** | 🔬 **VERIFIED** | In `@formepdf/react`, the `Style` interface does not include `objectFit`. Passing `objectFit: 'contain'` causes TypeScript compilation errors. Image primitives require explicit numeric `width` and `height` props. |
| **VER-09** | **CSR & Waybill Caveat Standardization** | 🔬 **VERIFIED** | In `src/pages/ViewCSR.tsx` and `src/pages/ViewWaybill.tsx`, all template defaults have been updated from retired Patrick Hand/Handlee to `Caveat`. Unused handwriting font assets in `src/assets/pdf-fonts/` have been removed. |

---

## 7. 2026-11-12 Entries — Migration Completion & Retirement Sequencing

| Decision ID | Topic | Status | Decision & Audit Findings |
| :--- | :--- | :--- | :--- |
| **DEC-28** | **Family Forme Migration Recorded Complete** | 🟢 **APPROVED** | Engine migration (not certification) of all eight in-scope document families is recorded complete as of 2026-11-12: Invoice, Quotation, PO, CPS (commercial pipeline), Receipt, Waybill, Project Documents, RFQ, CSR (all five templates). CSR preview (`CsrFormePreview`) is an iframe of the identical Forme bytes used for download and share — preview and export cannot drift. Letters are HTML-only and **formally out of PDF scope**. BOQ remains excluded (DEC-02). |
| **DEC-29** | **Migration ≠ Certification** | 🟢 **APPROVED** | No family is certified until its M12 checklist passes (preview/export parity, visual parity where a React-PDF baseline exists, regression suite presence, delivery connectivity). The word "complete" applied to families means *engine migration* only. CSR physical print verification, PO canonical prep (M1C), CPS font defect VER-02, Gate 1/2/3 and Gate 4 remain open. |
| **DEC-30** | **Commercial Stack Is Forme-Only** | 🟢 **APPROVED** | Supersedes DEC-26 and DEC-27. Former React-PDF commercial templates are deleted. `resolveCommercialPdfRoute` always returns `-forme` routes and ignores its historical `engine` argument. `'industry-react-pdf'` survives only as a backward-compat normalization fixture for stored templates. |
| **DEC-31** | **M6 Superseded; Gate 4 Defined** | 🟢 **APPROVED** | M6 (Legacy Deprecation & Cleanup) is superseded by M12–M15. Gate 4 (Retirement / Removal) acceptance criteria: zero active production consumers confirmed by import analysis; zero active test/dev consumers or an explicit retention decision; delivery contracts preserved (`downloadPdfFromElement`, `CompositePdfDelivery`, `DefaultFeedbackBus`); all families certified; packages purged only in M14; focused regression suite green; rollback strategy documented before removal. |
| **DEC-32** | **React-PDF Purge Candidates Retained Until M14** | ⏭️ **SUPERSEDED (executed 2026-11-12, see DEC-37)** | Retirement matrix published in `Waterfall-roadmap.md` §5. All former M14 candidates (`pdfFontRegistry.ts`, `customization/fontRegistry.ts`, `DefaultPdfGenerator.ts`, `PdfGenerator.ts` dead interface, `pdfCurrency.tsx`) were DELETED under the authorized purge task. `downloadPdf.tsx` was RETAINED as a delivery utility with its React-PDF branch removed (`buildBlob` required). `pdfSharedFonts.ts`/`pdfFillableFonts.ts` remain live via `pdfDesignPreset.ts`. `@react-pdf/renderer` uninstalled; lockfile clean of all `@react-pdf/*` entries. `pdfCurrency.test.js` updated to remove the pin and keep the active-contract assertions. |
| **DEC-37** | **React-PDF Retirement Executed** | 🟢 **APPROVED** | M13 (audit) and M14 (purge) executed under an authorized task on 2026-11-12. Removed: `@react-pdf/renderer` (package, lockfile), `pdfFontRegistry.ts`, `customization/fontRegistry.ts`, `DefaultPdfGenerator.ts`, `PdfGenerator.ts` (dead interface), `pdfCurrency.tsx`, root `test-pdf.tsx` (React-PDF canary at HEAD — dead, long broken). Pruned: `downloadPdf.tsx` element branch (`buildBlob` now required), `PdfGenerationRequest.engine`/`_engine` (dead dual-renderer switch). Rewritten: `pdfCurrency.test.js` (active-contract assertions only); two `.ts` tests' second-argument calls removed. Verification: typecheck clean except three pre-existing HEAD errors; PDF suite 184/192 (8 failures pre-existing at HEAD, files untouched); 73/73 critical suites; 37/37 + 3/3 Forme family suites. Android signed bundle unchanged (build output; next Capacitor build refreshes). No browser/device validation claimed. |
| **DEC-38** | **Rollback Strategy for the Purge** | 🟢 **APPROVED** | Rollback = revert list (see Waterfall-roadmap.md §6 Gate 4 · criteria 7) plus `bun add @react-pdf/renderer@4.3.2` + `bun install`. Restoring from this working tree is trivial — the purge is a single contained diff; HEAD retains the last React-PDF-era source, not the package. After any rollback + reinstall, re-run: typecheck, `bun test src/tests/pdf`, and one Forme PDF raster per family is optional. |
| **DEC-39** | **No Browser Validation Claimed; Native Bundle Noted** | 🟡 **ACCEPTED WITH QUALIFICATIONS** | The purge was verified statically and by Bun tests. No browser, WebView or device smoke test was performed. `android/app/src/main/assets/public/assets/` still embeds a pre-purge bundle containing react-pdf; it is a build output, not source, and will be refreshed by the next authorized Capacitor build (never by `bun run build`). |

| **DEC-33** | **No Derived Percentages; History Retained** | 🟢 **APPROVED** | This revision introduces no computed completion percentages. Milestone percentages for M2 (35%), M3 (25%) and M4 (40%) are retained from 2026-11-01 marked as-of-date with no new measurement. The 2026-10-30 investigations remain binding historical evidence; their findings describe the pre-migration baseline and were not rewritten. All documentation changes are strictly confined to `docs/prd/pdf-rendering-migration/`. |

---

## 8. Unresolved Decisions Requiring Founder / Lead Alignment

| Question ID | Topic | Status | Open Trade-Off / Decision Required | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **UNRES-01** | **Inter Static TTF Binary Sourcing** | ⚪ **UNRESOLVED** | Sourcing from Rasmus Andersson's official desktop static release (v4.0) vs Google Fonts static export. | **Recommendation:** Use official Rasmus Andersson v4.0 static TTF release. Verified to contain full currency and punctuation glyph sets including `₦`, `′`, and `″`. |
| **UNRES-02** | **Offline Logo Degradation Policy** | ⚪ **UNRESOLVED** | When a mobile user generates a PDF while offline (or if remote storage lacks CORS), should the document render with text-only company branding or fail export? | **Recommendation:** Render with clean text branding. Generating an invoice or quotation with company name in bold text is preferable to failing client-side export during critical field operations. |
| **UNRES-03** | **Image Dimension Clamping** | ⚪ **UNRESOLVED** | Should the media loader reject or clamp oversized company logos (e.g. $> 2000 \times 2000\text{ px}$) to protect low-RAM mobile devices from out-of-memory crashes? | **Recommendation:** Yes. Clamp or reject images exceeding $2000 \times 2000\text{ px}$ in `mediaResolver.ts`. |
| **UNRES-04** | **PO Canonical Preparation Priority** | ⚪ **UNRESOLVED** | Priority and scheduling for implementing Milestone M1C (`preparePurchaseOrderDocument.ts`). | **Recommendation:** Execute Milestone M1C in parallel with Milestone M2 so that all three commercial documents (Invoice, Quotation, PO) enter Gate 1/2 verification together. |
| **DEC-34** | **Primary Document Typography Standardization (Inter)** | ⏭️ **SUPERSEDED** | Standardize primary document typography on **Inter** (Regular, Bold). Legacy commercial font choices safely normalize to Inter. Succeeded historical 10-family commercial font selector. (Formerly duplicated as DEC-26 at the end of the unresolved-items section; renumbered 2026-11-12 to resolve the ID collision with the superseded commercial-retention decision.) Succeeded by DEC-25. |
