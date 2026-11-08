# Commercial Template Miniature — Source and Rendering Audit

**Date:** 2026-11-08
**Task type:** Strict investigation / audit only. Zero code modifications.
**Scope:** Compare `docs/templates/html-temps/invoice-templates/` HTML samples against the seven current commercial Forme renderers (Industrial, Industry, Minimal, Landscape, Evergreen, Architectural, Executive) and assess whether static image previews can replace the hand-built miniatures in `CommercialTemplateMiniature.tsx`.
**Note on scope drift:** the current picker exposes **eight** templates — the seven above plus `heritage` (`Heritage House`, Burgundy & Bronze). This audit covers all eight; the §4 matrix shows the seven requested plus heritage for completeness.
**Skills applied:** `pdf-rendering-correctness` (production renderer is source of truth; report distinguishes verified facts from recommendations).
**Report path note:** the task specified `docs/Reports/`. On this filesystem `docs/reports` (lowercase) is the existing directory; this report is saved as `docs/reports/Commercial_Template_Miniature_Source_And_Rendering_Audit.md` (same folder on case-insensitive filesystems).

---

## 1. Complete HTML template and asset inventory (verified)

Directory: `docs/templates/html-temps/invoice-templates/`

| # | File | `<title>` | Pages / mode | Standalone? | Assets / dependencies |
|---|---|---|---|---|---|
| H1 | `commercial-industrial.html` | BOUXRE — Commercial Documents / Industrial Technical | 3-page A4 portrait (`.page` 210×297 mm), Invoice + Purchase-order doc-sets, screen-bar toolbar | Yes (embedded CSS) except product thumbs | `assets/products/*.svg` item thumbnails |
| H2 | `commercial-document-portrait.html` | BOUXRE Commercial Document — A4 Portrait | A4 portrait, fixed screen-bar, `@page A4 portrait`, print rule | Yes (embedded CSS) | No product thumbs found; inline SVG logo |
| H3 | `commercial-landscape.html` | BOUXRE — Commercial Documents / Landscape (CSR drawing family) | A4 landscape (`.page` 297×210 mm), multi-sheet Invoice + PO | Yes (embedded CSS) | `assets/products/*.svg` |
| H4 | `commercial-executive.html` | BOUXRE — Commercial Documents / Executive Luxury | A4 portrait, centred masthead, print screen-bar | Yes (embedded CSS) | `assets/products/*.svg` |
| H5 | `commercial-architectural-frame.html` | BOUXRE — Commercial Documents / Architectural Frame | A4 portrait, 3 sheets Invoice + 3 sheets PO, `@page A4 portrait` | Yes (embedded CSS) | `assets/products/*.svg` (Comap, Legrand, …) |
| H6 | `commercial-heritage-house.html` | BOUXRE — Commercial Documents / Heritage House | A4 portrait, 4-sheet Invoice + PO | Yes (embedded CSS) | `assets/products/*.svg` (Grundfos, Comap, Honeywell, …) |
| H7 | `commercial-command-grid.html` | BOUXRE — Commercial Documents / Command Grid | A4 portrait, 3-page Invoice + PO, mono grid | Yes (embedded CSS) | `assets/products/*.svg` |
| H8 | `commercial-mosaic.html` | BOUXRE — Commercial Documents / Mosaic | A4 portrait, Invoice + PO | Yes (embedded CSS) | `assets/products/*.svg` |
| H9 | `commercial-japanese-minimal.html` | BOUXRE — Commercial Documents / Japanese Minimal | A4 portrait, Invoice + PO | Yes (embedded CSS) | `assets/products/*.svg` |
| H10 | `commercial-modern-minimal.html` | Kestrel Industrial — Commercial Modern Minimal Suite | Multi-section screen demo (not a pinned A4 sheet) | **No** — external | `https://fonts.googleapis.com` (Inter, Plus Jakarta Sans, JetBrains Mono) + `https://cdn.tailwindcss.com` |
| H11 | `inv102.html` | BOUXRE — Commercial Document (A4 Portrait) | A4 portrait sheet (`.sheet` 210 mm), fixed bar | Yes (embedded CSS) | Inline SVG logo only |
| S1 | `commercial-fixture.js` | (fixture data) | Shared sample data: Kestrel Industrial Supply issuer, Northgate client, `INV-2026-0147`, 26 line items / 5 groups, PO model | — | Data only; embedded verbatim rows in every H-file |
| A1 | `assets/products/` (10 SVGs) | — | `apc`, `comap`, `grundfos`, `havells`, `honeywell`, `kohler`, `legrand`, `leroy-somer`, `philips`, `schneider-electric` | — | Brand/product thumbnails referenced as `assets/products/*.svg` |
| A2 | `qa-renders/` (12 files) | — | `landscape-{invoice,po,quotation}.pdf` + 3 PNGs; `portrait-{invoice,po,quotation}.pdf` + 5 PNGs | — | QA proof renders for two designs only (portrait + landscape) |
| A3 | `ref-invquo/` (7 files) | — | `SASINV-000125.pdf`, `SASQUO-000427/428/430.pdf`, 3 Android screenshots | — | Legacy reference outputs/screenshots |

Shared traits (verified): every `commercial-*.html` embeds its full CSS in `<style>`; every file embeds a sticky screen-bar with an Invoice/PO toggle (`data-mode`, `script` toggling `[data-doc]`) and a Print button; every file carries the same 26-row grouped fixture (`COMMERCIAL_DATA` in `commercial-fixture.js`); page geometry is pinned with `@page` A4. No file uses `@font-face` — fonts are system stacks (Bahnschrift/DIN, Inter/system, Georgia/Didot, Gill Sans/Optima, Century Gothic/Futura, Helvetica) except H10 (Google Fonts CDN).

---

## 2. Forme renderer inventory (verified, `src/components/pdf/forme/`)

| Forme file | Export | Tokens source (verified in file) |
|---|---|---|
| `IndustrialFormeDocument.tsx` | `INDUSTRIAL_TOKENS`, `IndustrialFormeDocument` | Comment: *"Industrial Color & Metric Tokens (sampled directly from commercial-industrial.html)"* — paper `#F6F6F2`, graphite `#1D2528`, orange `#DC5A21` |
| `IndustryFormeDocument.tsx` | `IndustryFormeDocument` | `INDUSTRY_DEFAULT_ACCENT = '#7D8A88'` from `../industryAdapter`; `INDUSTRY_GROUP_TOKENS.border = '#8299A8'` |
| `MinimalFormeDocument.tsx` | `MinimalFormeDocument`, `PALETTE` | Comment: *"Palette and metrics from the authoritative React Minimal template"* — ink `#1a1a1a`, paper `#ffffff`, rule `#d4d4d4` (no HTML source) |
| `LandscapeFormeDocument.tsx` | `LANDSCAPE_TOKENS`, `LandscapeFormeDocument` | Comment: *"Palette sampled from commercial-landscape.html (CSR drawing family)"* — navy `#07192b`, cobalt `#0f3156`, blue `#1d568a`, amber `#b84a14`, line `#9cb4c9`, tint `#edf3f8` |
| `EvergreenFormeDocument.tsx` | `EVERGREEN_TOKENS`, `EvergreenFormeDocument` | Accent `#1f6e5c`, dim `#2a8a73`, pale `#f0f6f2` (no HTML source exists) |
| `ArchitecturalFormeDocument.tsx` | `ARCHITECTURAL_TOKENS`, `ArchitecturalFormeDocument` | Charcoal `#1e2427`, copper `#a4663f`, copper-light `#c08a5f`, ivory `#f6f0e4` — matches H5 |
| `ExecutiveFormeDocument.tsx` | `EXECUTIVE_TOKENS`, `ExecutiveFormeDocument` | Forest `#173a2c`, gold `#a9854f`, gold-light `#d8c39c`, paper `#fcf9f2` — matches H4 |
| `HeritageHouseFormeDocument.tsx` | `HERITAGE_TOKENS`, `HeritageHouseFormeDocument` | Burgundy `#5c1a26`, bronze `#9a7b45` — matches H6 |

Route registry verified in `src/components/pdf/index.ts` (`resolveCommercialPdfRoute` → `*-forme`, 8 routes incl. `heritage-forme`). Template IDs verified in `src/domain/invoice/types.ts` (`INVOICE_PDF_TEMPLATE_IDS`).

---

## 3. Seven-template HTML-to-Forme correspondence matrix

| # | Forme template | Best HTML match | Correspondence | Reusable without modification? |
|---|---|---|---|---|
| 1 | **Industrial** | H1 `commercial-industrial.html` | **Strong.** Exact token match (`#F6F6F2`, `#1D2528`, `#DC5A21`); title grid 1.35fr:1fr, graphite table header, outer frame, grid background, 6-col table, group rows. Differences: HTML is 3 physical pages with continuation sheets + item brand thumbs; Forme is one auto-flowing Document with Fixed footer and data-driven columns. | **With adjustment** — hide screen-bar, capture first `.page` only. |
| 2 | **Industry** | H2 `commercial-document-portrait.html` (primary) | **Moderate–Strong.** Sage `#7D8A88` matches `INDUSTRY_DEFAULT_ACCENT`; panel `#F8FAFC`; header flex layout, parties grid, sage table header. Differences: H2 header is logo-left + navy title + terracotta screen-bar accent; Forme header is title-left + meta rows + logo-right with `Inter`. **H11 `inv102.html` is an alternative sage candidate** (sage `#7D8A88`, parties grid) but its header (large date badge + sage rule) diverges more from `IndustryFormeDocument`. | **With adjustment** — H2. Keep H11 as legacy alternative. |
| 3 | **Minimal** | *(none suitable)* H10 considered, rejected | **None.** `MinimalFormeDocument` is React-derived, not HTML-derived. H10 uses Google Fonts + Tailwind CDN (production Forme uses bundled Inter/Archivo Black), Kestrel corporate-slate identity, unpinned screen layout — not a faithful source. H9 Japanese Minimal is a different warm-minimal identity (paper `#FBFAF6`, vermillion `#B93A22`, seal mark) — not `MinimalFormeDocument` (paper `#ffffff`, ink `#1a1a1a`, strict hairlines). | **No.** Keep hand-built miniature or use Forme raster (see §6). |
| 4 | **Landscape** | H3 `commercial-landscape.html` | **Strong.** Comment-verified source; navy/cobalt/amber/line/tint exact; 297×210 landscape sheet, 12-col coord frame with ruler, navy identity block, cobalt section bands. Differences: HTML table is wide `sched` with mono zone heads; Forme uses `SectionBand` + ledger/summary split. | **With adjustment** — capture landscape first sheet. |
| 5 | **Evergreen** | *(none)* | **None.** No `commercial-evergreen.html` exists in the inventory. Forme Evergreen (green `#1f6e5c`, pale cards, accent total box) has no HTML counterpart. | **No.** Keep hand-built miniature or use Forme raster. |
| 6 | **Architectural** | H5 `commercial-architectural-frame.html` | **Strong.** Ivory/charcoal/copper exact; asymmetric 56/42 header, technical run strip, Bill To + Project Spec divided parties card, charcoal table header, ledger + charcoal total box. Differences: HTML is 3 sheets with group-continuation rows and item thumbs; Forme auto-flows. | **With adjustment** — first `.page` only. |
| 7 | **Executive** | H4 `commercial-executive.html` | **Strong (structure), Moderate (typography).** Forest/gold/paper exact; centred masthead + diamond rule, INVOICE display title, 4-cell meta bar, parties grid, forest table header, ledger + bank. Differences: HTML uses Georgia/Didot serifs + gold numerals; Forme renders `Inter` (+ `PT Serif` fallback attempt). An HTML screenshot would show serif typography production never renders — a fidelity caveat (see §6). | **With adjustment**, with typography caveat. |
| 8 | **Heritage House** (picker 8th) | H6 `commercial-heritage-house.html` | **Strong.** Burgundy/bronze/ivory exact; burgundy frame + bronze outline, `K` seal masthead, centred INVOICE, double-rule ledger. Same structural match as Executive. | **With adjustment** — first `.page` only (4-sheet doc). |

Unmatched HTML (no Forme counterpart — exploratory/legacy, do not mine for miniatures): H7 `commercial-command-grid.html` (mono grid design), H8 `commercial-mosaic.html` (forest + lime mosaic), H9 `commercial-japanese-minimal.html` (vermillion minimal), H10 `commercial-modern-minimal.html` (CDN demo), H11 `inv102.html` (secondary sage layout). A2 `qa-renders/` covers only portrait + landscape and is not a per-template source (do not reuse as picker assets without provenance of which design each renders).

### Structural comparison notes (verified facts)

- **Headers:** H1 title-grid ↔ Industrial title grid (match); H2 flex header ↔ Industry title-left/logo-right (close); H3 top-bar 4-cell grid ↔ Landscape company/document-identity table (close); H4 centred masthead ↔ Executive symmetrical masthead (close); H5 asymmetric charcoal card + doc card ↔ Architectural 56/42 split (close); H6 seal + "BOUXRE / INVOICE" right block ↔ Heritage `K` seal + right title (close); H9 seal + light INVOICE ↔ no Minimal equivalent (no match).
- **Tables:** all H-files share the same 6-col schema (`# / Description / Qty / Unit / Price / Amount`, `Unit Price` vs `Unit Cost` for PO) and grouped rows with subtotals — the same schema `CommercialDocumentData` feeds every Forme renderer (verified via `table.columns`/`table.rows` in each Forme file). Column proportions differ per design (fixed widths in Forme `*ColumnWidths` maps) but the schema is shared, so a single canonical sample document drives every preview.
- **Totals/notes/footers:** closing patterns match per design (Industrial closing panels, Executive full forest bar + italic words, Architectural ledger + charcoal box, Evergreen accent box, Landscape ledger + navy total, Heritage double-rule ledger). Footers differ (H4 gold rule grid vs Forme `Fixed` footer 3-part; H1 framed footer vs Forme `Fixed` footer) — miniatures must show the Forme footer, not the HTML footer, where they differ.
- **Missing/unsupported:** H-files contain product brand thumbs (`assets/products/*.svg`) that Forme never renders (Forme renders `imageUrl` from document data) — HTML screenshots would introduce logos absent from production. Screen-bars, Invoice/PO toggles and multi-sheet continuation are preview chrome, not production UI.

---

## 4. Visual rendering feasibility (verified tooling, no assets generated)

| Concern | Finding |
|---|---|
| Browser renderer | `playwright ^1.63.0` present in `devDependencies` (verified `package.json`). Element screenshot of first `.page` is the standard path. |
| HTML raster library | `html-to-image ^1.11.13` present; already used in production (`src/components/table-document/TableDocumentExportController.tsx` → `toPng`). In-page alternative to Playwright, but still needs a browser context. |
| PDF raster library | `mupdf` + `mupdf-js`, `pdfjs-dist 4.6.82`, `pdf-lib`, `takumi-pdf` all present. Existing proof in repo: `src/tests/pdf/formeEvergreenTemplate.test.ts` + `formeCommercialBatch1.test.ts` open Forme PDF bytes with `mupdf.Document.openDocument`; untracked `scratch/render-heritage-pixmaps.ts` already rasterizes Forme PDFs via `page.toPixmap(mupdf.Matrix.scale(1.5, 1.5), mupdf.ColorSpace.DeviceRGB, ...)` → `pix.asPNG()`; `scratch/verify-heritage-visual.ts` already builds a canonical `PdfDocumentModel` sample and renders real Forme bytes via `renderPdfcnToBytes`. (Read only — not executed in this audit.) |
| A4 viewport | H-files pin `.page` to 210×297 mm (portrait) / 297×210 mm (landscape) with `@page` rules. Enforce viewport ≈ 794×1123 px (96 dpi) portrait / 1123×794 landscape, `deviceScaleFactor` 2–3 for miniature sharpness, hide `.screen-bar` (or clip to `.page` bounding box), default `data-doc="invoice"` section visible, wait for fonts/images before capture. |
| Scale-down without distortion | Render at full A4, then display with `object-fit: contain` (portrait letterboxed; landscape near full-bleed) inside the existing 80 px footprint. Never `object-fit: fill`/`cover` — no clipping, no stretched aspect. |
| Asset storage | Generated PNG/WebP can be committed as static assets (e.g. `src/assets/template-previews/`). No live generation on picker open (zero runtime cost). WebP preferred (~30–50% smaller); PNG fallback. |
| Fonts/assets during render | 10/11 H-files depend only on system fonts + local `assets/products/*.svg` (no network). H10 requires Google Fonts + Tailwind CDN → exclude from any HTML pipeline. Forme PDF path requires `ensureFormeFontFamily` (Inter, Archivo Black, Caveat, Noto Sans) — already handled by `renderPdfcnToBytes`. |
| Prior QA renders | `qa-renders/` proves HTML→PDF/PNG outputs exist for 2 designs, but filenames alone do not prove which design each shows. Do not reuse without verification. |

No screenshots were generated in this audit (per constraints).

---

## 5. HTML-to-image vs PDF-to-image

| Dimension | A. HTML → browser → PNG/WebP | B. Forme PDF → raster → PNG/WebP (recommendation: B) |
|---|---|---|
| Visual fidelity | Highest for the 6 HTML-sourced designs (H1–H6) — but shows **HTML typography production never renders** (Executive Georgia serif vs Forme Inter; Industrial Bahnschrift vs Forme Inter/Archivo Black) and **brand thumbs Forme never renders**. | Highest for **production truth**: renders the shipped Forme bytes with bundled fonts, real column budgets, compact/landscape logic and Forme footers. |
| Coverage | 6 of 8 (Minimal + Evergreen have no HTML; H10 rejected). | All 8 (one pipeline, one canonical sample). |
| Maintenance | Two design systems to keep in sync (HTML + Forme); every Forme tweak needs HTML reconciliation or miniatures drift. | Single source of truth (Forme). Add a template → add one raster config. Drift impossible by construction. |
| Dependencies | Playwright + system-font parity + screen-bar hiding + multi-page clipping. | In-repo only: existing Forme byte pipeline + `mupdf.toPixmap` (already used in tests/scratch). No browser, no network. |
| Font/asset accuracy | System-font dependent; CDN file (H10) unusable offline. | Bundled static TTFs (`@formepdf/*` + `public/fonts/`), deterministic. |
| Complexity | Medium (viewport, wait, clip, mode force). | Low–Medium (one sample model → 8 bytes → 8 pixmaps). Reuse `scratch/verify-heritage-visual.ts` sample-builder pattern. |
| Vite/React compatibility | None at runtime (static assets). | None at runtime (static assets). Generation script runs outside Vite (Bun/Node). |
| Long-term reliability | Fragile to HTML edits; typography caveats permanent. | Stable; regression-checkable by re-rasterizing and diffing. |

**Verdict: adopt B (Forme PDF → mupdf raster → committed WebP/PNG).** A is useful only as a one-time golden cross-check for the 6 HTML-sourced designs, not as the asset pipeline.

---

## 6. Current miniature implementation assessment

| Aspect | Verified fact |
|---|---|
| Construction | `CommercialTemplateMiniature.tsx` is a pure presentational React component: shared `Bar`/`MiniTable`/`FooterBand` primitives + one layout function per ID (`IndustrialMini`, `IndustryMini`, `MinimalMini`, `LandscapeMini`, `EvergreenMini`, `ArchitecturalMini`, `ExecutiveMini`, `HeritageMini`). Fixed sample content (`INVOICE / INV-001 / TOTAL ₦125,000`), fixed 80 px footprint, no live data, no PDF, no SVG images. |
| Mapping | Picker options in `CommercialTemplatePicker.tsx` (`id` → `CommercialPdfRoute` via `normalizeInvoicePdfTemplateId`) supply `customPreview: <CommercialTemplateMiniature templateId="…" />` per option (8 entries incl. `heritage` + `A4 Landscape` badge). IDs, labels, themes and `customPreview` flow through the unchanged `TemplatePickerCarousel` shell (selection, selected state, chevrons, snap, keyboard). |
| Replaceability | **Yes, cleanly.** `TemplatePickerOption.customPreview` already exists as the override slot. Static images drop into the same slot (`<img src>` inside the slot) without touching carousel, selection, persistence (`custom_fields.pdfTemplateId` / `pdfOutput`), or Forme routing. No accent/compact/landscape logic is inside the miniatures. |
| Obsolete code on adoption | The nine layout functions + `Bar`/`MiniTable`/`FooterBand` inside `CommercialTemplateMiniature.tsx` (keeping the component as an `<img>` mapper + fallback). `TemplateMiniPreview.tsx` stays (Waybill/CSR still use it). Picker `theme`/`layout` may stay (fallback/border) or be simplified later — no change required. |
| Current accuracy | The miniatures approximate zones/colours from Forme tokens (correct per §2) but cannot reproduce production typography, column budgets, or footer rules — the exact limitation static Forme rasters remove. |

---

## 7. Recommended replacement architecture

**Pipeline (build-time only; zero runtime PDF generation):**

1. **Canonical sample model** — one fixed invoice (`INV-2026-0147`, Kestrel → Northgate, from `commercial-fixture.js`), shared across all previews. No customer data, no network, no logo fetch (1×1 placeholder or omit).
2. **Render** — for each `templateId` (`industrial`, `industry`, `minimal`, `landscape`, `evergreen`, `architectural`, `executive`, `heritage`): `generateInvoicePdfBlob({ templateId, … })` (or `renderPdfcnToBytes` directly) → Forme bytes.
3. **Rasterize** — `mupdf` `page.toPixmap(scale 2–3, DeviceRGB)` on page 1 → PNG → encode to WebP (`sharp` already transitive via ecosystem or the repo's image tooling — verify before adding).
4. **Store** — e.g. `src/assets/template-previews/{id}.webp` (portrait `794×1123`-equivalent crops; landscape `1123×794`). Commit as static assets.
5. **Display** — picker option `customPreview` becomes `<img src alt="" class="h-[80px] w-full object-contain" />` inside the existing 80 px miniature container. `object-fit: contain` preserves aspect: portrait letterboxes on white; landscape fills width. Landscape keeps its `A4 Landscape` badge.
6. **Fallback** — keep the current `CommercialTemplateMiniature` as the failure fallback (rename internally e.g. `CommercialTemplateMiniatureFallback`) if an image fails to load.

**Adding a template later:** add one entry to the generation script's ID list + one `customPreview` option. No carousel or persistence change.

**What not to do:** no live HTML/PDF rendering when the picker opens; no per-card full-PDF generation; no HTML screenshots as the primary pipeline (typography + brand-thumb drift); do not reuse `qa-renders/` without provenance.

---

## 8. Gap and risk report

| # | Gap / risk | Impact |
|---|---|---|
| R1 | **Minimal + Evergreen have no HTML source** (verified §3). HTML-to-image cannot cover them. | Eliminates a pure-HTML pipeline. PDF raster covers both. |
| R2 | **HTML typography ≠ production typography** (serifs in H4/H6 vs Inter in Forme; Bahnschrift vs Inter/Archivo). HTML screenshots would misrepresent shipped PDFs, most visibly for Executive/Heritage. | Decisive for recommending B over A. |
| R3 | **Brand thumbs** (`assets/products/*.svg`) appear in H-files but never in Forme PDFs. | HTML shots show logos production never emits. PDF raster avoids this. |
| R4 | **Screen chrome** (sticky bar, Invoice/PO toggle, 3–4 sheets) must be hidden/clipped; H10 needs network (Google Fonts + Tailwind CDN) — unusable in CI/offline. | Confirms H10 exclusion; mandates bar-hiding + first-page clip for any A-path cross-check. |
| R5 | **Drift risk (HTML path):** H-files and Forme files evolve independently; without a sync test, a Forme tweak silently invalidates HTML-derived miniatures. | PDF raster removes the class of risk entirely. |
| R6 | **Font licensing / embedding:** Forme path uses bundled `@fontsource` + `public/fonts` static TTFs (OFL stack; no runtime webfont). HTML path relies on system fonts (unlicensed/undistributable choice varies per OS) — another reason to prefer B. No licensing blockers were found for the PDF path. |
| R7 | **Screenshot limits (shared):** 80 px render is ~10% of A4 width; fine text is illegible by design (composition-only acceptance). Pre-render at 2–3× and downscale for retina crispness; keep each WebP < ~200 KB. |
| R8 | **Workflow decisions pending:** (a) sample-model owner (fixture vs new minimal model), (b) generation script location (`scripts/` vs `scratch/` graduation), (c) WebP encoder availability, (d) CI vs manual regeneration policy + golden-diff check on template change. |
| R9 | **No second design system:** the hybrid HTML+hand-built status quo is the drift this audit was asked to eliminate. Either adopt B (one pipeline) or keep the current hand-built miniatures — do not ship half HTML-shots + half miniatures as the permanent state. |

---

## 9. Explicit implementation recommendations and prerequisites

**Recommendation:** Generate all eight miniature assets from **real Forme PDF bytes** (Approach B) with the canonical sample model; display as committed static WebP (PNG fallback) in the existing `customPreview` slot; retain the current hand-built miniature component only as a load-failure fallback.

**Prerequisites before implementation (approval required):**

1. Approve the canonical sample document (fixture reuse vs minimal hand model) and page-1-only rule.
2. Approve asset location, format (WebP with PNG fallback), target pixel size (2–3× A4 width) and size budget.
3. Add a CI golden check: re-rasterize on Forme-template change and fail if the committed preview drifts (this is the drift protection that neither the hand-built miniatures nor HTML shots provide).
4. Confirm WebP encoding path in-repo (no unreviewed new dependency).
5. Keep `heritage` in scope (picker already exposes it; H6 + Forme both strong — do not drop it).

---

## 10. Exact files inspected

`AGENTS.md`, `docs/PROJECTSKILLINDEX.md`, `docs/prd/pdf-rendering-migration/functional-req.md` (§§4–12, prior enrichment), `docs/prd/pdf-rendering-migration/Readme.md`, `docs/templates/html-temps/invoice-templates/` (H1–H11 titles + `<style>`/page geometry + table samples: `commercial-industrial.html`, `commercial-landscape.html`, `commercial-executive.html`, `commercial-document-portrait.html`, `commercial-japanese-minimal.html`, `commercial-mosaic.html`, `commercial-architectural-frame.html`, `commercial-heritage-house.html`, `commercial-modern-minimal.html`, `inv102.html`, plus `commercial-command-grid.html` title/table via grep; `commercial-fixture.js`; `assets/products/` listing; `qa-renders/` listing; `ref-invquo/` listing), `src/components/document-view/shared/CommercialTemplateMiniature.tsx`, `src/components/document-view/shared/CommercialTemplatePicker.tsx`, `src/components/document-view/shared/TemplatePickerCarousel.tsx`, `src/components/pdf/forme/IndustrialFormeDocument.tsx`, `src/components/pdf/forme/IndustryFormeDocument.tsx`, `src/components/pdf/forme/MinimalFormeDocument.tsx`, `src/components/pdf/forme/LandscapeFormeDocument.tsx`, `src/components/pdf/forme/EvergreenFormeDocument.tsx`, `src/components/pdf/forme/ArchitecturalFormeDocument.tsx`, `src/components/pdf/forme/ExecutiveFormeDocument.tsx`, `src/components/pdf/forme/HeritageHouseFormeDocument.tsx`, `src/components/pdf/index.ts`, `src/components/pdf/industryAdapter.ts`, `src/domain/invoice/types.ts`, `package.json`, `src/components/table-document/TableDocumentExportController.tsx`, `src/tests/pdf/formeEvergreenTemplate.test.ts`, `src/tests/pdf/formeCommercialBatch1.test.ts`, `scratch/render-heritage-pixmaps.ts`, `scratch/verify-heritage-visual.ts`, `docs/` directory listing.

---

## 11. Git evidence

### Before (recorded at audit start)
```
 M README.md
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Waterfall-roadmap.html
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/site-features-prd.md
 M docs/prd/pdf-rendering-migration/Readme.md
 M docs/prd/pdf-rendering-migration/Waterfall-roadmap.md
 M public/apple-touch-icon.png
 M public/favicon.svg
 M src/App.tsx
 M src/components/app/AppShell.tsx
 M src/components/app/PageLoader.tsx
 M src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx
 M src/components/cps/CostPricingSheetFormPresentations.tsx
 M src/components/cps/CostPricingSheetViewPresentations.tsx
 M src/components/document-view/invoice/InvoiceOverlays.tsx
 M src/components/document-view/shared/CommercialTemplatePicker.tsx
 M src/components/document-view/shared/DocumentShareSheet.tsx
 M src/components/layout/bx-logo.tsx
 M src/components/loading/AppLoadingStates.tsx
 M src/components/onboarding/PhotoHeroV2Preview.tsx
 M src/components/pdf/index.ts
 M src/domain/documentShare/documentEmailHtml.ts
 M src/domain/documentShare/documentShareService.ts
 M src/domain/documentShare/types.ts
 M src/domain/invoice/types.ts
 M src/lib/designLabPreviews.ts
 M src/pages/NotFound.tsx
 M src/pages/ProvisioningProgress.tsx
 M src/pages/ViewCSR.tsx
 M src/pages/ViewCps.tsx
 M src/pages/ViewQuotation.tsx
 M src/pages/ViewReceipt.tsx
 M src/pages/ViewRfq.tsx
 M src/pages/ViewWaybill.tsx
 M src/tests/pdf/formeIndustryTemplate.test.ts
 M supabase/functions/send-document-email/index.ts
?? docs/reports/BOURXE_Document_Sharing_and_Email_Experience_Audit_and_Plan.md
?? scratch/output-heritage/
?? scratch/render-heritage-pixmaps.ts
?? scratch/verify-heritage-visual.ts
?? src/components/design-lab/DocumentEmailPreview.tsx
?? src/components/document-view/shared/CommercialTemplateMiniature.tsx
?? src/components/pdf/forme/HeritageHouseFormeDocument.tsx
?? src/lib/clipboard.ts
?? src/pages/DocumentEmailExperiment.tsx
?? src/tests/critical/documentShareClipboardAndPrefill.test.js
?? src/tests/pdf/formeHeritageHouseTemplate.test.ts
```

### After
Observed at audit end (concurrent drift occurred between the two snapshots; this audit's own change is exactly one new file — the third `??` below):

```
 M README.md
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Waterfall-roadmap.html
 M docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/site-features-prd.md
 M index.html
 M public/apple-touch-icon.png
 M public/favicon.svg
 M src/App.tsx
 M src/components/app/AppShell.tsx
 M src/components/app/PageLoader.tsx
 M src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx
 M src/components/cps/CostPricingSheetFormPresentations.tsx
 M src/components/cps/CostPricingSheetViewPresentations.tsx
 M src/components/document-view/invoice/InvoiceOverlays.tsx
 M src/components/document-view/shared/DocumentShareSheet.tsx
 M src/components/layout/CompanySelectionSheet.tsx
 M src/components/layout/DesktopSidebar.tsx
 M src/components/layout/MobileSidebar.tsx
 M src/components/layout/bx-logo.tsx
 M src/components/loading/AppLoadingStates.tsx
 M src/components/onboarding/PhotoHeroV2Preview.tsx
 M src/domain/documentShare/documentEmailHtml.ts
 M src/domain/documentShare/documentShareService.ts
 M src/domain/documentShare/types.ts
 M src/lib/designLabPreviews.ts
 M src/lib/tenant/contexts.tsx
 M src/lib/tenant/entityContext.ts
 M src/pages/NotFound.tsx
 M src/pages/ProvisioningProgress.tsx
 M src/pages/Settings.tsx
 M src/pages/ViewCSR.tsx
 M src/pages/ViewCps.tsx
 M src/pages/ViewQuotation.tsx
 M src/pages/ViewReceipt.tsx
 M src/pages/ViewRfq.tsx
 M src/pages/ViewWaybill.tsx
 M src/pages/settings/CompanySettingsSection.tsx
 M src/tests/critical/companyIdentitySync.test.js
 M supabase/functions/send-document-email/index.ts
?? docs/reports/BOURXE_Document_Sharing_and_Email_Experience_Audit_and_Plan.md
?? docs/reports/Commercial_Template_Miniature_Source_And_Rendering_Audit.md
?? scratch/output-heritage/
?? scratch/render-heritage-pixmaps.ts
?? scratch/verify-heritage-visual.ts
?? src/components/design-lab/DocumentEmailPreview.tsx
?? src/lib/clipboard.ts
?? src/pages/DocumentEmailExperiment.tsx
?? src/tests/critical/documentShareClipboardAndPrefill.test.js
```

Differences vs "Before" (index.html, layout/tenant/Settings/companyIdentitySync entries appearing; `CommercialTemplatePicker.tsx`, `pdf/index.ts`, `invoice/types.ts`, `formeIndustryTemplate.test.ts`, `HeritageHouseFormeDocument.tsx`, `CommercialTemplateMiniature.tsx` no longer listed) occurred **between** the two snapshots from concurrent work outside this audit — none was created, edited, staged or removed by this audit.

Zero application source files, HTML templates, CSS files, image assets, `package.json`, or `bun.lock` modifications were made by this audit. No build, typecheck, lint, or audit command was run; no dependencies installed; no screenshots generated; no rendering experiments executed.

---

## 12. Implementation report (approved implementation, 2026-11-08)

### Authoritative inventory (resolved count: 8)
Verified against `INVOICE_PDF_TEMPLATE_IDS` in `src/domain/invoice/types.ts` (9 entries; `industry-forme` is an alias normalizing to `industry`), `resolveCommercialPdfRoute` in `src/components/pdf/index.ts` (8 `*-forme` routes), and `CommercialTemplatePicker.tsx` (8 options). Quotation reuses the same IDs via `normalizeInvoicePdfTemplateId` in `src/domain/quotation/pdfDownloadHandler.ts`. **Heritage House is genuinely selectable and backed by `HeritageHouseFormeDocument.tsx` — included.** Exact IDs: `industrial`, `industry`, `minimal`, `landscape`, `evergreen`, `architectural`, `executive`, `heritage`.

### Renderer → image mapping
| ID | Forme renderer | Asset (committed PNG) |
|---|---|---|
| industrial | `src/components/pdf/forme/IndustrialFormeDocument.tsx` | `src/assets/template-previews/industrial.png` |
| industry | `src/components/pdf/forme/IndustryFormeDocument.tsx` | `src/assets/template-previews/industry.png` |
| minimal | `src/components/pdf/forme/MinimalFormeDocument.tsx` | `src/assets/template-previews/minimal.png` |
| landscape | `src/components/pdf/forme/LandscapeFormeDocument.tsx` | `src/assets/template-previews/landscape.png` |
| evergreen | `src/components/pdf/forme/EvergreenFormeDocument.tsx` | `src/assets/template-previews/evergreen.png` |
| architectural | `src/components/pdf/forme/ArchitecturalFormeDocument.tsx` | `src/assets/template-previews/architectural.png` |
| executive | `src/components/pdf/forme/ExecutiveFormeDocument.tsx` | `src/assets/template-previews/executive.png` |
| heritage | `src/components/pdf/forme/HeritageHouseFormeDocument.tsx` | `src/assets/template-previews/heritage.png` |

Formats: PNG (106–157 KB, 1191×1684 portrait / 1684×1191 landscape at scale 2 ≈ 144 dpi). PNG chosen over WebP — guaranteed by `pix.asPNG()`, no new dependency. First page only (all 8 PDFs render single-page with the fixture).

### Fixture
`scripts/generate-commercial-template-previews.ts` → `buildSampleInvoice()` — fictional `Sample Motors Ltd` → `Sample Client Ltd`, `INV-PREVIEW-001`, 3 items (12×₦5,000 + 4×₦25,000 + 2×₦45,500 = ₦251,000; VAT 7.5% ₦18,825; total ₦269,825 + amount-in-words), notes/terms labelled "illustrative content for preview only", footer `Sample Motors Ltd`. No TIN, bank details, signatures, logos, or real customer data. Layout hint per template (`portrait` except `landscape`). Fixture is generation-time only; never enters production document data.

### Generation
`bun scripts/generate-commercial-template-previews.ts` → for each ID: `adaptCommercialDocumentData(model)` → `renderPdfcnToBytes(React.createElement(Component, { data }))` → `mupdf.Document.openDocument(bytes)` → `page.toPixmap(scale 2, DeviceRGB)` → `pix.asPNG()` → `src/assets/template-previews/{id}.png`. Fonts pre-registered (`Inter`, `Archivo Black`, `PT Serif`, `Noto Sans`, `Caveat`). Script is build-time only — the picker never generates PDFs.

### Integration
`CommercialTemplatePicker.tsx` `customPreview` slots now render `<img class="h-[80px] w-full rounded-[12px] bg-white object-contain">` from the committed PNGs (same 80 px footprint, same carousel/selection/persistence; `A4 Landscape` badge retained for `landscape`). `CommercialTemplateMiniature.tsx` removed after all 8 assets verified (typecheck + 60 focused tests + per-ID file/size checks + visual read of industrial/landscape PNGs). `TemplateMiniPreview` and Waybill/CSR paths untouched. No picker-time PDF generation or rasterisation.

### Regeneration
After any Forme design change affecting a template, run `bun scripts/generate-commercial-template-previews.ts` and commit the refreshed PNGs. Verify each PNG by reading it (header/parties/table/totals/footer match the renderer) and by re-running typecheck + focused picker/renderer tests. CI golden-diff check deferred (R8-§9) — re-raster + visual spot-check is the current gate.

### Known limitations
- Previews are page-1 composites at 80 px (~10% of A4 width) — fine text is decorative; composition/identity is the acceptance bar.
- `landscape` PNG was rendered from the pre-existing Landscape renderer state; an in-flight Landscape refactor (concurrent `src/components/pdf/forme/landscape/`, failing typecheck unrelated to previews) requires regeneration once that refactor lands. No other template affected.

---

## 13. Visual QA (2026-11-08, all eight assets individually inspected)

Method: each committed PNG at `src/assets/template-previews/` read and compared against its production Forme renderer (Forme bytes via `scripts/generate-commercial-template-previews.ts` fixture). Headers, identity, numbering, parties, table columns/amounts, subtotal/VAT/total + amount-in-words, notes/terms, footer, orientation, typography, clipping assessed per asset.

| ID | Verdict | Evidence |
|---|---|---|
| industrial (`src/components/pdf/forme/IndustrialFormeDocument.tsx`) | **PASS** | Graphite masthead + PO chip, Bill To panel, graphite table + cost build-up + orange-sheet total bar, words panel, Notes/Terms, 3-part footer. Faithful. |
| industry (`IndustryFormeDocument.tsx`) | **PASS** | Sage title + meta, From/To cards, sage table header, right totals panel + words box, Notes/Terms, hairline footer. Faithful. |
| minimal (`MinimalFormeDocument.tsx`) | **PASS** | Spare top block, ruled parties, PO strip, hairline table, boxed totals + italic words, Notes/Terms, light footer. Faithful restraint. |
| landscape (`LandscapeFormeDocument.tsx` + `forme/landscape/`) | **PASS (regenerated)** | New render matches the *refactored* renderer: ruler strips, navy INVOICE identity cell, client + details split, summary/notes bands, navy footer. Dimensions 1684×1191, `SHEET 1 OF 1`. Old amber styling gone — regeneration kept. Regenerated 2026-11-08 after stability check (see below). |
| evergreen (`EvergreenFormeDocument.tsx`) | **PASS** | Green rule + INVOICE, pale From/Bill To cards, PO chip, green table header, pale totals panel + green total, Notes/Terms cards, pale footer. Faithful. |
| architectural (`ArchitecturalFormeDocument.tsx`) | **PASS** | Charcoal company block + meta panel, divided parties, charcoal zebra table, ledger + charcoal total box, beige Notes/Terms, signatory + doc-control stamp, hairline footer. Faithful. |
| executive (`ExecutiveFormeDocument.tsx`) | **PASS** | Centred serif masthead + PO strip, doc-number/issue/due/PO bar, parties, forest table, full-width forest total bar, ledger + settlement box, beige Notes/Terms, executive signatories. Faithful. |
| heritage (`HeritageHouseFormeDocument.tsx`) | **PASS** | S seal + burgundy company, BOURXE INVOICE, verified stamp, Bill To / Particulars, burgundy table header, right totals, Notes/Terms, dual signatories, Verified control stamp. Faithful. |

Regenerated assets: only `src/assets/template-previews/landscape.png` (all other seven byte-identical on re-run → `git status --short` shows `M` for landscape only). Landscape refactor stability: `src/components/pdf/forme/landscape/` (4 split files) present; focused Landscape tests 11/11 pass; `bun run typecheck` shows **no Landscape errors** (earlier split errors resolved). **Typecheck is BLOCKED by unrelated concurrent `src/domain/pdf/resolver/commercial/preparePurchaseOrderDocument.ts` errors (TS2322/TS2353, from concurrent `resolver/types.ts` + `types.ts` drift) — reported, not repaired here.** Picker mapping re-verified (8 IDs → 8 PNGs, `object-contain`, no generation at runtime). Waybill/CSR paths untouched. Focused suite: **71 pass, 0 fail** across 10 PDF/template test files. `git diff --check` passes; `bun run build` never run. Remaining work before full sign-off: (1) typecheck clean once concurrent PO-resolver drift is fixed by its owners; (2) regenerate previews on any future Forme design change per §12; (3) optional CI golden-diff (deferred R8).
