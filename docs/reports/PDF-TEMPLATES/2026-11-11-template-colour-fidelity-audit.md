# Heritage, Architectural & Executive Template Colour Fidelity Audit

This report was written by Buffy on 2026-11-11 via Freebuff.

**Task type:** Strict, read-only investigation. No application code, CSS, template, asset, test or configuration file was modified.
**Only file created:** this report (`docs/Reports/PDF-TEMPLATES/2026-11-11-template-colour-fidelity-audit.md`).

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Objective

Establish the source of the reported colour mismatch in three commercial PDF templates:

- Heritage (Heritage House)
- Architectural (Architectural Frame)
- Executive

The investigation answers three questions:

1. Do the thumbnails use amber colours that come from the application theme?
2. Do the generated PDFs use the same amber colours?
3. Do the two surfaces share one root cause?

The original HTML templates in `docs/templates/html-temps/invoice-templates/` are the visual design reference. Their colours are the intended design.

## 2. Scope

In scope:

- The three original HTML templates.
- The thumbnail source, generation, storage, mapping and rendering path.
- The PDF registration, resolution, routing, adaptation, token resolution and Forme rendering path.
- The regression status of Industry, Industrial, Landscape, Minimal and Evergreen.

Out of scope (per task constraints):

- No code, CSS, template or asset modification.
- No thumbnail or PDF regeneration.
- No dependency installation.
- No `bun run build`, `bun run typecheck`, `bun run lint` or test run (zero-code audit).

## 3. Method

Read-only inspection only:

1. Read `AGENTS.md` and `docs/PROJECTSKILLINDEX.md` before the investigation.
2. Read the three HTML templates and extract their CSS custom properties.
3. Read the thumbnail generator, the picker components and the Forme renderers.
4. Read the token resolver, the adapter and the preset resolver.
5. Measure the actual colours of the committed thumbnails and of the three supplied PDFs with a read-only `mupdf` raster histogram (script executed from the system temp directory; nothing written into the repository).

## 4. Executive summary

**Finding: the reported amber defect is not reproducible at the current commit (`b2a19985`).**

- The three thumbnails carry their intended palettes. Heritage renders burgundy `#5c1a25` and bronze; Architectural renders charcoal `#1e2327` and copper `#a4663f`; Executive renders forest `#16392c` and gold `#a9854f`. Amber-family pixel share is 0.00 %, 0.49 % and 0.05 %. The 0.49 % and 0.05 % are anti-aliased copper and gold, not application amber.
- The three supplied PDFs carry the same intended palettes. The literal application amber values (`#f59e0b`, `#d97706`, `#b45309`, `#fbbf24`) occur in **zero** pixels on both pages of all three documents.
- The colours that a reviewer can read as "amber" are the templates' own warm metallic accents: bronze `#9a7b45` (hue 37°), gold `#a9854f` (hue 37°) and copper `#a4663f` (hue 22°). These are the HTML-authored values, not theme inheritance.
- The amber-inheritance mechanism exists in the code, and it is already closed. `resolveCommercialDesignPreset()` suppresses `useCustomColors` for the three intrinsic-palette templates. Both PDF builders pass the normalized template identifier into that resolver. The PDF layer reads no CSS custom property at all (`grep "var(--" src/components/pdf` returns no match), so the PDF cannot inherit the application theme.
- Thumbnail and PDF do **not** share an active defect. They share one rendering pipeline (both are produced from the same Forme components), and both are amber-free.

Residual, non-colour issues found (unchanged by this audit): the `❖` separator renders as `?` in Executive and Heritage; the accent toggle remains enabled for intrinsic-palette templates but is a silent no-op; the light tone of each accent collapses to the same hex as the accent when a custom accent is applied.

## 5. Original HTML template identification

| Template | Original HTML file | Design identity |
|---|---|---|
| Heritage | `docs/templates/html-temps/invoice-templates/commercial-heritage-house.html` | Burgundy and bronze, ivory paper, serif |
| Architectural | `docs/templates/html-temps/invoice-templates/commercial-architectural-frame.html` | Charcoal and copper, ivory sheet, geometric sans |
| Executive | `docs/templates/html-temps/invoice-templates/commercial-executive.html` | Forest and gold, cream paper, serif |

All colours are **explicitly defined** in each file as CSS custom properties in a `:root` block. No colour is inherited from an external stylesheet. No file uses `@font-face`; fonts are system stacks.

## 6. Intended colour palette per template

### 6.1 Heritage — `commercial-heritage-house.html` (`:root`, lines 9–18)

| Role | Value |
|---|---|
| Paper (page fill) | `#F8F2E3` |
| Ivory (group rows) | `#F2E9D4` |
| Primary (masthead, headings, totals) | `#5C1A26` (burgundy) |
| Deep primary (screen bar) | `#451119` |
| Accent (rules, ornaments, numerals) | `#9A7B45` (bronze) |
| Accent light | `#C6AA76` |
| Text | `#251E17` (ink), body copy `#3F362A` |
| Muted text | `#7B6E5C` |
| Border / rule | `#D9CBAC` |
| Card surface | `#FFFDF7` |
| Screen backdrop (not the page) | `#B9B0A0` |

### 6.2 Architectural — `commercial-architectural-frame.html` (`:root`, lines 9–14)

| Role | Value |
|---|---|
| Charcoal (header card, table header, total box) | `#1e2427` |
| Charcoal alt | `#2b3236` |
| Page fill | `#f6f0e4` (ivory); paper cards `#fdfaf3` |
| Accent (copper) | `#a4663f` |
| Accent light (copper) | `#c08a5f` |
| Sand (rules) | `#e3d7c3` |
| Ink | `#25292a`; body copy `#4f4c45` / `#4c4942` |
| Muted | `#6f6b61` |
| Panel fills | `#efe5d5`, `#f2e9da`, `#f4ecdd` |
| Secondary accent (red) | `#b3442e` |
| Screen backdrop (not the page) | `#d9d2c4` |

### 6.3 Executive — `commercial-executive.html` (`:root`, lines 9–18)

| Role | Value |
|---|---|
| Paper | `#FCF9F2` |
| Ivory panel | `#F6F0E2`; ivory deep `#EFE5D1` |
| Primary (wordmark, table header, total bar) | `#173A2C` (forest); deep `#0F281E` |
| Accent (gold) | `#A9854F` |
| Accent light | `#D8C39C` |
| Ink | `#1D2A22`; body copy `#3B433A` |
| Muted | `#76776A` |
| Rule | `#D9CFBA`; zebra row `#FAF5E9` |
| Screen backdrop (not the page) | `#C9C4B6` |

The Forme token sets match these values. `HERITAGE_TOKENS` matches all ten HTML values exactly. `ARCHITECTURAL_TOKENS` and `EXECUTIVE_TOKENS` match all primary, accent and surface values exactly; only some neutral text tokens differ (recorded in the 2026-11-09 audit, section 6.1).

## 7. Thumbnail pipeline and findings

### 7.1 Lifecycle

| Stage | Location | Detail |
|---|---|---|
| Source | `scripts/generate-commercial-template-previews.ts` | Renders the **production** Forme components with a deterministic fictional fixture (Sample Motors Ltd, `INV-PREVIEW-001`) |
| Fixture design preset | same file, `template.designPreset` | `useCustomColors: false`, `accentColor: '#14b8a6'` — the custom accent path is off |
| Generation | same file | `renderPdfcnToBytes` → `mupdf` `page.toPixmap(Matrix.scale(2,2), DeviceRGB)` → `pix.asPNG()` |
| Storage | `src/assets/template-previews/<id>.png` | Eight committed PNGs, 894×1263 (portrait) / 1263×894 (landscape) |
| Mapping | `src/components/document-view/shared/CommercialTemplatePicker.tsx` lines 3–10 | Static `import` per template id |
| Rendering | same file, `Preview` (lines 14–37); `TemplatePickerCarousel.tsx` | Plain `<img>` inside a card |
| Kind | — | **Independently rendered raster images.** Not theme-driven HTML or CSS |
| Theme-dependent styling | `TemplatePickerCarousel.tsx` lines 181, 206, 256 | Card chrome only: `border-primary`, `ring-primary`, `bg-primary/5`, badge `bg-primary`, legend dot `bg-primary` |

`--primary` is `225 75% 48%` (blue) by default (`src/index.css:28`). It becomes amber (`#d97706` / `#f59e0b`) only when the application theme is "amber-terracotta" or "amber-minimal" (`src/lib/themePresets.ts`). This is the **only** amber in the thumbnail surface. It affects the card border, ring, check badge and legend dot. It does not affect the thumbnail image.

### 7.2 Measured thumbnail colours

Raster histogram of the committed PNGs (top colours, share of page):

| Thumbnail | Dominant colours | Amber-family share (hue 20–48°, sat ≥ 0.40) | Exact app-amber pixels |
|---|---|---|---|
| `heritage.png` | `#ffffff` 78.23 %, `#fffcf7` 11.32 %, `#f8f1e2` 2.73 %, `#5c1a25` 0.10 % | 0.00 % | 0 |
| `architectural.png` | `#ffffff` 70.85 %, `#1e2327` 11.38 %, `#ece3d2` 6.48 %, `#f6efe3` 2.99 % | 0.49 % (anti-aliased copper) | 0 |
| `executive.png` | `#ffffff` 73.48 %, `#f6efe1` 11.61 %, `#16392c` 5.78 % | 0.05 % (anti-aliased gold) | 0 |

Note: `#81ff81` appears in the raw histogram at 0.65–0.89 %. This is the fixture's 1×1 green placeholder pixel, stretched into the logo and signature slots. It is a fixture artefact, not a palette colour.

### 7.3 Visual confirmation

The three thumbnails were viewed directly. Heritage shows a burgundy masthead, burgundy wordmark and bronze rules. Architectural shows a charcoal header card, charcoal table header and copper accents. Executive shows a forest table header, forest total bar and gold rules. No amber was observed.

## 8. PDF pipeline and findings

### 8.1 Path

| Stage | Location |
|---|---|
| Registration / routing | `src/components/pdf/index.ts` — `resolveCommercialPdfRoute()` (lines 93–106) → `architectural-forme`, `executive-forme`, `heritage-forme` |
| Invoice payload | `src/components/document-view/invoice/invoicePdfActions.ts:207` — `template: { designPreset: resolveCommercialDesignPreset("invoice", targetTemplateId) }`; `targetTemplateId` is normalized at line 44 |
| Quotation payload | `src/domain/quotation/pdfDownloadHandler.ts:40` — `resolveCommercialDesignPreset("quotation", templateId)` |
| Preset resolution | `src/domain/pdf/customization/commercial.ts:157–179` — `resolveCommercialDesignPreset()` |
| Intrinsic gate | `src/domain/invoice/types.ts:113–116` — `isIntrinsicPaletteTemplate()`; set = `{architectural, executive, heritage}` |
| Adaptation | `src/components/pdf/industryAdapter.ts:514–524` — copies `accentColor`, `useCustomColors` and fonts into `data.design` |
| Token resolution | `src/components/pdf/designTokens.ts:33` — returns `accentColor` only when `useCustomColors` is true |
| Forme rendering | `ArchitecturalFormeDocument.tsx:105–109`, `ExecutiveFormeDocument.tsx:107–111`, `HeritageHouseFormeDocument.tsx:103–107` |
| CSS variables | none — `grep "var(--" src/components/pdf` returns no match |

The PDF layer is React-PDF/Forme. It renders to PDF bytes. It cannot read the application theme, the Tailwind theme or any CSS custom property.

### 8.2 Measured PDF colours

Raster histogram of both pages of each supplied PDF (596×842 points per page):

| PDF | Pages | Dominant colours | Intended accent present | Amber-family share | Exact app-amber pixels |
|---|---|---|---|---|---|
| `exco.pdf` (Executive) | 2 | `#ffffff` 55.63 %, `#f6efe1` 20.88 %, `#eee6d4` 5.40 %, `#16392c` 2.39 % | `#a9854f` gold exact, 0.007–0.010 % | 0.00 % | 0 |
| `Heritage.pdf` (Heritage) | 2 | `#ffffff` 30.60 %, `#fffcf7` 22.66 %, `#f8f1e2` 20.69 %, `#f1e9d3` 12.99 %, `#5c1a25` 0.20 % | `#5c1a26` burgundy, 0.22–0.47 % within tolerance | 0.00 % | 0 |
| `arch.pdf` (Architectural) | 2 | `#ffffff` 46.73 %, `#f6efe3` 24.33 %, `#ece3d2` 8.55 %, `#1e2327` 7.93 % | copper family `#a3663e` 0.029 % | 0.42 % (anti-aliased copper) | 0 |

Document identity was confirmed by text extraction. All three PDFs are quotation `SASQUO-000436` for SUN & SHIELD POWER SOLUTIONS, and each one renders its template's own masthead structure.

Rendered values differ from the token values by one least-significant bit: `#f8f2e3` → `#f8f1e2`, `#fffdf7` → `#fffcf7`, `#f6f0e4` → `#f6efe3`, `#ede4d3` → `#ece3d2`, `#f2e9d4` → `#f1e9d3`, `#173a2c` → `#16392c`, `#1e2427` → `#1e2327`. This is DeviceRGB conversion in the raster step. The difference is not visible.

## 9. Exact source of amber inheritance

### 9.1 The mechanism (present in code, closed at HEAD)

1. `getPdfDesignPreset()` (`src/lib/pdfDesignPreset.ts:251`) reads `invoice_pdf_design_preset` / `quotation_pdf_design_preset` from `localStorage`. A saved preset can carry `useCustomColors: true` with an amber `accentColor`. Amber is a member of `PDF_ACCENT_SWATCHES` (`src/lib/pdfDesignPreset.ts:92`: `#f59e0b`).
2. `resolveCommercialDesignPreset()` (`src/domain/pdf/customization/commercial.ts:157`) layers saved engine settings on top.
3. `isIntrinsicPaletteTemplate(templateId)` (`src/domain/invoice/types.ts:115`) detects the three intrinsic templates. When true, the resolver forces `useCustomColors: false` (line 168 and line 163).
4. `adaptCommercialDocumentData()` (`industryAdapter.ts:514–524`) copies `useCustomColors` into `data.design`.
5. `resolveDesignTokens()` (`designTokens.ts:33`) returns `accentColor: null` when `useCustomColors` is false.
6. The Forme fallback `tokens.accentColor || TEMPLATE_TOKEN` then selects the template's own accent.

Step 3 breaks the chain. This is why no amber is present in the outputs.

### 9.2 Application amber values (for reference)

| Location | Value |
|---|---|
| `src/styles/formTheme.css:154` | `--bd-amber: #d97706` |
| `src/styles/formTheme.css:307` | `--bd-amber: #f59e0b` |
| `src/lib/themePresets.ts:487–510` | `primary #b45309 / #d97706`, dark `#f59e0b / #fbbf24` |
| `src/lib/pdfDesignPreset.ts:92` | `PDF_ACCENT_SWATCHES` includes `#f59e0b` |

None of these values appears in any of the three thumbnails or in any page of the three PDFs.

### 9.3 Why the output can look amber without being amber

| Template | Template accent | Hue | Saturation | Relationship to amber |
|---|---|---|---|---|
| Heritage | bronze `#9a7b45` | 37° | 0.38 | Same hue family as amber; lower saturation |
| Executive | gold `#a9854f` | 37° | 0.36 | Same hue family as amber; lower saturation |
| Architectural | copper `#a4663f` | 22° | 0.45 | Warm, adjacent to amber |

These are the values authored in the HTML files. A reviewer can reasonably describe them as amber. They are not theme inheritance.

## 10. Do thumbnail and PDF share a root cause?

| Question | Answer | Evidence |
|---|---|---|
| Do both outputs inherit the same incorrect colour source? | **No.** Neither output contains the application amber. | Section 7.2, section 8.2 |
| Is the thumbnail correct but the PDF wrong? | No. Both are correct. | Same |
| Is the PDF correct but the thumbnail wrong? | No. Both are correct. | Same |
| Do both reproduce the same incorrect palette? | No. | Same |
| Is there a shared template definition or separate paths? | **Shared renderers, separate outputs.** The thumbnails are rasters of the same Forme components that produce the PDFs. | `scripts/generate-commercial-template-previews.ts` imports all three Forme components |

Both surfaces therefore share one defect *risk* — if the intrinsic gate is bypassed, both degrade in the same way, because both read `tokens.accentColor || TEMPLATE_TOKEN`. Today the gate holds for both.

## 11. Impact assessment on other commercial templates

| Template | Renderer | Custom accent accepted? | Thumbnail accent observed | Intended palette preserved? |
|---|---|---|---|---|
| Industrial | `IndustrialFormeDocument.tsx:77` | Yes (`useCustomColors` gate) | graphite `#1d2428`, paper `#f6f6f1` | Yes |
| Industry | `IndustryFormeDocument.tsx:70` | Yes | sage `#7c8987` = `INDUSTRY_DEFAULT_ACCENT #7D8A88` | Yes |
| Landscape | `LandscapeFormeDocument.tsx:79` | Yes | navy `#06182b`, cobalt `#0f3055` | Yes |
| Minimal | `MinimalFormeDocument.tsx:98` | Yes (text colour only) | `#1a1a1a` on white | Yes |
| Evergreen | `EvergreenFormeDocument.tsx:135` | Yes | green `#1f6d5c` | Yes |

These five templates are **customisable by design**. They are not in the intrinsic-palette set. A user-saved amber accent will recolour them. That is expected product behaviour, not a defect. No unintended amber was found in their thumbnails.

Note: the Landscape renderer names its intrinsic accent token `amber` (`LANDSCAPE_TOKENS.amber = #b84a14`). This is a template token name, not an application theme colour, and it did not appear in the Landscape thumbnail.

## 12. Evidence table

| Template | Original HTML colours | Thumbnail colours | PDF colours | Root cause |
|---|---|---|---|---|
| Heritage | `#F8F2E3` paper, `#F2E9D4` ivory, `#5C1A26` burgundy, `#9A7B45` bronze, `#C6AA76` bronze light, `#251E17` ink, `#7B6E5C` muted, `#D9CBAC` rule, `#FFFDF7` card | `#fffcf7` 11.32 %, `#f8f1e2` 2.73 %, `#5c1a25` 0.10 %; amber 0.00 %, exact amber 0 px | `#fffcf7` 22.66 %, `#f8f1e2` 20.69 %, `#f1e9d3` 12.99 %, `#5c1a25` 0.20 %; exact amber 0 px | No amber. Intended palette renders. Gate `isIntrinsicPaletteTemplate('heritage')` holds |
| Architectural | `#1e2427` charcoal, `#a4663f` copper, `#c08a5f` copper light, `#f6f0e4` ivory, `#e3d7c3` sand, `#25292a` ink, `#6f6b61` muted | `#1e2327` 11.38 %, `#ece3d2` 6.48 %, `#f6efe3` 2.99 %; amber 0.49 % (copper), exact amber 0 px | `#1e2327` 7.93 %, `#ece3d2` 8.55 %, `#f6efe3` 24.33 %; copper `#a3663e` 0.029 %; exact amber 0 px | No amber. Intended palette renders. Gate `isIntrinsicPaletteTemplate('architectural')` holds |
| Executive | `#FCF9F2` paper, `#F6F0E2` ivory, `#173A2C` forest, `#A9854F` gold, `#D8C39C` gold light, `#1D2A22` ink, `#76776A` muted, `#D9CFBA` rule | `#f6efe1` 11.61 %, `#16392c` 5.78 %; amber 0.05 % (gold), exact amber 0 px | `#f6efe1` 20.88 %, `#eee6d4` 5.40 %, `#16392c` 2.39 %; gold `#a9854f` 0.007–0.010 %; exact amber 0 px | No amber. Intended palette renders. Gate `isIntrinsicPaletteTemplate('executive')` holds |

Method: `mupdf` DeviceRGB raster at scale 1 (PDF) or the committed PNG (thumbnail), then a full pixel histogram. "Exact amber" counts pixels equal to `#f59e0b`, `#d97706`, `#b45309` or `#fbbf24`. "Amber-family" counts pixels with hue 20–48°, saturation ≥ 0.40 and lightness 0.30–0.80.

## 13. Proposed minimal remediation plan

No colour fix is required for the reported defect, because the defect is not present. The items below are ordered by dependency. Each is optional and separate. Do not implement without approval.

| # | Priority | Change | Rationale | Depends on |
|---|---|---|---|---|
| R-1 | Low (hardening) | Normalize the template identifier inside `isIntrinsicPaletteTemplate()` (`src/domain/invoice/types.ts:115`) | The helper compares raw strings. A direct caller that passes `heritage-house` or `architectural-frame` gets `false` and re-opens the bleed. Both current call sites normalize first, so this is latent | None |
| R-2 | Low (hardening) | Make the intrinsic restriction a renderer invariant instead of a resolver convention | The three Forme components still accept `tokens.accentColor`. A future builder that omits the resolver re-introduces amber. Move the decision into the three renderers, or pass an `intrinsicPalette` flag into `resolveDesignTokens()` | R-1 |
| R-3 | Low | Derive the light tone from the accent instead of reusing the same hex (`ArchitecturalFormeDocument.tsx:109`, `ExecutiveFormeDocument.tsx:111`, `HeritageHouseFormeDocument.tsx:107`) | Under a custom accent the two-tone hierarchy collapses to one colour. Latent while the gate holds | R-2 |
| R-4 | Medium (real visible defect, non-colour) | Replace the `❖` separator (U+2756) with a glyph that the registered Forme families cover, or draw it with Views | Executive and Heritage render `?` in both the thumbnails and the PDFs. No registered family covers U+2756 | None |
| R-5 | Low (UX) | Disable or hide the accent toggle for intrinsic-palette templates, or document the silent no-op | The customise panel offers a control that cannot take effect on these three templates | None |

Do not apply R-2 or R-3 to Industry, Industrial, Landscape, Minimal or Evergreen. Those templates are customisable by design.

## 14. Regression risks and verification requirements

### 14.1 Regression risks

| Risk | Detail |
|---|---|
| Shared resolver | `resolveDesignTokens()` and `industryAdapter.ts` serve all eight commercial templates. A change there can affect Industry, Industrial, Landscape, Minimal and Evergreen |
| Asset churn | Any Forme change requires regeneration of eight committed PNGs in `src/assets/template-previews/` |
| Over-broad restriction | Applying the intrinsic gate to all templates would remove the accent override from the five templates that are supposed to keep it |
| Saved user presets | `useCustomColors: true` remains in `localStorage` for the shared keys. It is inert for intrinsic templates, but it still recolours the other five |

### 14.2 Verification requirements for any future change

1. Re-run `bun scripts/generate-commercial-template-previews.ts` after any Forme change, and commit the regenerated PNGs.
2. Re-extract palettes from the regenerated PNGs and from freshly generated PDFs with the same histogram method used in section 12.
3. Confirm zero pixels equal to `#f59e0b`, `#d97706`, `#b45309` or `#fbbf24` in Heritage, Architectural and Executive.
4. Confirm the intended accent is present: bronze in Heritage, copper in Architectural, gold in Executive.
5. Confirm the five customisable templates still honour a saved accent when the toggle is on.
6. Compare the PDF footer, masthead and glyph output against the HTML reference (open item from the 2026-11-09 audit).

## 15. Limitations

- The three supplied PDFs were **accessible** and were verified **numerically** (full pixel histogram plus text extraction). They were **not viewed as rendered images** in this session. No claim of visual verification of the PDFs is made.
- The three thumbnails **were** viewed directly, in addition to numeric measurement.
- The HTML references were compared at source level (their CSS custom properties) against measured raster output. No HTML renderer was used, so no pixel-for-pixel HTML-to-PDF comparison exists. This matches the limitation recorded in the 2026-11-09 audit.
- The measurements cover page 1 and page 2 of each PDF, which is the full document (each PDF has two pages).
- The 0.49 % and 0.05 % amber-family shares in Architectural and Executive are anti-aliased edges of the copper and gold accents. They are not application amber. The measurement cannot distinguish "designed warm accent" from "theme amber" by hue alone, which is exactly why the exact-hex check was added.
- No build, typecheck, lint or test run was performed, per the task constraints for a zero-code audit.

## 16. Git status and modification-scope confirmation

**Git status before the investigation** (`git status --porcelain`, branch `main`, HEAD `b2a19985`):

```
 D src/components/pdf/core/pdfCompact.ts
 D src/components/pdf/presentation/industry/GroupFooterRow.tsx
 D src/components/pdf/presentation/industry/GroupHeaderRow.tsx
 D src/components/pdf/presentation/industry/OptionalList.tsx
 D src/components/pdf/presentation/industry/PartyCard.tsx
 D src/components/pdf/presentation/industry/compact.ts
 D src/components/pdf/presentation/industry/industryStyles.ts
 D src/components/pdf/templates/industryStyles.ts
 M src/tests/invoice/pdfRegressionCleanup.test.js
 M src/tests/pdf/formeIndustryTemplate.test.ts
?? scratch/ (12 untracked files and directories)
```

All of the above entries pre-date this audit. They are the work of other agents or the project lead. This audit did not touch them.

**Files created by this audit:** one Markdown report under `docs/Reports/PDF-TEMPLATES/`.

**Files modified by this audit:** none.

The three HTML templates, the eight preview PNGs, all Forme renderers, the resolver, the adapter, the picker components and the three supplied PDFs were read only. Their contents are unchanged.

## 17. Deferred work

1. Confirm with the reporter which artefact showed amber, and under which application theme. The evidence excludes the committed thumbnails and the three supplied PDFs.
2. Decide the product behaviour for the accent toggle on intrinsic-palette templates (R-5).
3. Fix the `❖` glyph defect (R-4).
4. Close the HTML-reference visual acceptance item from the 2026-11-09 audit.
5. Decide whether to purge the stale `useCustomColors: true` value from the shared preset keys.
