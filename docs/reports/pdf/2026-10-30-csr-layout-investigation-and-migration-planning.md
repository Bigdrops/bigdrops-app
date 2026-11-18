# CSR Layout Investigation and PDF Migration Planning

| Field | Value |
| :--- | :--- |
| Date | 2026-10-30 |
| Task type | Read-only investigation and planning |
| Status | Proposal. No implementation. |
| Repository | `bigdrops-app` |
| Inputs | `SASICSR-008.pdf`, `AGENTS.md`, PDF migration PRD suite, current source tree |
| Application source changes | None |
| Report path | `docs/reports/pdf-migration/2026-10-30-csr-layout-investigation-and-migration-planning.md` |

---

## 1. Executive summary

### 1.1 Logo enlargement

The 46pt logo height is not the cause of the small visible mark. The tenant logo file is 1536×1024 (3:2). The visible ink occupies only 1091×530 pixels. That is 71.0% of the width and 51.8% of the height. Only 13.4% of the pixels are opaque. At an image height of 46pt, the image box is 69×46pt, but the visible mark is about 49.0×23.8pt. The 4pt white plate adds only 8pt to each dimension. The file padding, not the plate, causes the small appearance.

The layout limits are:

- The masthead row is about 62pt high. The plate can grow to about 62pt. This sets a vertical image limit of about 54pt.
- The identity column has 258.28pt at the current 3:2 logo. The company name is 227pt wide. Each 1pt of image height removes 1.5pt from the identity column for a 3:2 logo.
- Wide logos lose identity width faster. A 2.4:1 logo already wraps the name at 46pt. A 3:1 logo wraps the name and the contact line, and the document becomes 2 pages.

The tested safe values are:

| Option | Result |
| :--- | :--- |
| Keep 46pt | No change. Current behavior is stable. |
| Raise to 50pt | Maximum value with no new wrap in the tested matrix. The 2:1 fixture has less than 1pt of name slack. This is fragile. |
| Raise to 54pt | Safe only for 3:2, square, and tall logos. The 2.4:1 logo wraps the contact line and risks a second page. The 2:1 logo wraps the name. |
| Trim the asset, then use 44pt | Verified. The visible mark becomes about 90.6×44pt. The name stays on one line. The masthead does not grow. |

**Recommendation:** Keep 46pt in the template. Do not raise all logos to 54pt. Trim the logo asset to its ink bounds in the branding pipeline and use a 44pt height. A tight trim has a theoretical name-safe limit near 48.7pt, but 44pt is the verified value. Test 46pt only after a new render.

### 1.2 Sparse CSR page

The supplied `SASICSR-008.pdf` has 1 page. The body ends at about 629.7pt from the top. The footer is at about 799–808pt. The blank region between them is about 169–178pt. The body uses about 77% of the content area. The page is not half full. The impression of an empty page comes from empty readings, short narratives, an empty materials section, and the footer that is anchored at the bottom.

All sections are content-driven. The only fixed section height is the 42pt signature stage. The materials cards have 30pt and 38pt minimum heights, but only when materials exist. No section stretches.

**Recommendation:** Keep natural flow now. Do not add global minimum heights or spacers. The PRD Gate 1 suite already requires "balanced spacing without artificial gaps or stretched margins" for a short single-page document (`test-plan.md`, `DOC-SHORT-01`). A global spacer also fails on the last page of a multi-page Forme document. If the product requires a fuller page, use a two-pass adaptive layout that adds a spacer only when the document has 1 page and only before the sign-off. Gate that change with the full matrix in section 4.

### 1.3 Migration state

The roadmap states 15% total progress, M0 100%, and M1–M6 0%. The verified state is different:

- M0 deliverables exist, but the baseline is not frozen. Seven PRD files are modified, the HTML roadmap is untracked, G-01 is marked PASSED while the tree is dirty, and G-06 is marked PASSED while the expected `SASQUO-430 (1).pdf` filename is absent.
- M1 is partial. Archivo Black is bundled as TTF and registered. Body fonts are not registered for Forme as TTF. The rich-text, Unicode, and emoji work for Forme is not present.
- M2 is partial. CSR natural pagination and footer behavior are proven. No Forme quotation or invoice template exists, so the Gate 1 suite cannot run and Gate 1 is not signed.
- M3, M4, and M6 are pending.
- M5 is partial. The CSR portrait and landscape PDFCN templates exist. CPS uses Forme but bypasses PDFCN. Waybill, RFQ, and BOQ are not migrated. The default CSR template remains legacy `'8'`. No M5 test suite exists in the PRD test plan.

No M1+ gate is signed. The 15% figure is arithmetically M0 only (1 of 7 milestones). Do not mark M1 or M5 complete on the basis of the CSR work.

### 1.4 Recommended sequence

Use the five-family order from `draft.md` section 13.1 and Phase 5 of the roadmap:

**Quotation → Invoice → Waybill → RFQ & BOQ → CSR**

Then certify the residual React-PDF families (Receipt and Project Documents), or add them to M5 scope. Remove React-PDF only after all families are certified.

The 4-family arrows in `draft.md:145` and `functional-req.md:181` omit RFQ & BOQ. They conflict with `draft.md:351-352`, `Waterfall-roadmap.md:161-165`, and `risk-register.md:149`. Correct the two arrows. Keep CSR last.

### 1.5 Roadmap maintenance

Both roadmap representations exist and currently agree:

- `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md` is the normative Markdown.
- `docs/prd/pdf-rendering-migration/Waterfall-roadmap.html` is a real designed HTML file (about 81.6 KB, untracked, `Last Updated 2026-10-30`). It is not a Markdown copy.

No generator or sync check exists. The HTML is maintained by hand. This investigation did **not** edit either roadmap. Reasons and exact proposed edits are in section 13.

### 1.6 Next implementation task

The next implementation task is **M1-A: Shared Forme foundation**. It covers the TTF body-font pipeline, the Forme rich-text AST adapter, the Unicode normalizer and emoji policy, shared header/footer/party/signature primitives, and the `renderDocumentWithLayout` measurement wrapper. This work unblocks M2 and M4. It also prevents CSR-local primitives from becoming the de facto shared layer.

Before M1-A, complete **P0 baseline hygiene**: commit or approve the PRD changes, fix G-01 and G-06, and decide the HTML sync method.

---

## 2. Scope, inputs, and method

### 2.1 Questions answered

1. What limits the logo size, and what is the correct enlargement?
2. Why does a sparse CSR leave unused space, and can that space be used safely?
3. How complete is the PDFCN/Forme migration in fact?
4. Which families remain?
5. Which sequence is authoritative?
6. How should the Markdown and HTML roadmaps stay in sync?

### 2.2 Evidence labels

| Label | Meaning |
| :--- | :--- |
| **[VERIFIED]** | Observed in the repository or measured in this investigation. |
| **[PRIOR]** | Reported by an earlier investigation report and not re-measured here. |
| **[RECOMMENDATION]** | Engineering proposal for approval. |
| **[UNRESOLVED]** | Requires a product or architecture decision. |

### 2.3 Inputs inspected

- `AGENTS.md` (project rules, commands, architecture map).
- Skill `pdf-rendering-correctness` (presentation-only rendering, data ownership, footer and single-page contracts).
- `C:\Users\DELL\Downloads\SASICSR-008.pdf`.
- `docs/prd/pdf-rendering-migration/`: `Readme.md`, `draft.md`, `functional-req.md`, `Prerequisites.md`, `risk-register.md`, `Waterfall-roadmap.md`, `Waterfall-roadmap.html`, `test-plan.md`.
- `src/components/pdf/pdfcn/csr/`: portrait and landscape templates, utilities, materials schedule, font registration.
- `src/domain/pdf/resolver/csr/`: prepared contract and pure preparation function.
- `src/pages/ViewCSR.tsx`, `src/components/pdf/index.ts`, `src/components/pdf/pdfcn/adapter.ts`.
- Prior reports:
  - `docs/reports/2026-10-30-industry-invoice-quotation-natural-pagination-investigation.md`
  - `docs/reports/2026-10-30-forme-invoice-quotation-industry-template-investigation.md`
  - `docs/reports/csr/2026-10-30-csr-portrait-logo-footer-reference-report.md`

### 2.4 Measurements performed

- MuPDF page count, page bounds, structured text positions, and image draw transforms.
- PDF image XObject inspection with `pdf-lib`.
- Alpha-mask bounding-box scan of the embedded 1536×1024 logo.
- Repository counts and line-level checks for roadmap, PRD, template, and import facts.

### 2.5 Limits

- No application build, typecheck, lint, audit, or test suite was run. The task forbids these commands.
- No source, template, test, font, or asset file was modified.
- Visual inspection is limited to the supplied PDF, the embedded image data, and prior rendered fixtures.
- The Forme flex/layout probe results in section 4.5 are **[PRIOR]** measurements from the earlier natural-pagination investigation and the CSR logo/footer work.

---

## 3. Logo investigation

### 3.1 Current geometry [VERIFIED]

`SASICSR-008.pdf`, page 1, image draw operations:

```
q
1.000 1.000 1.000 rg
36.00 757.19 77.00 54.00 re
f
Q
/Figure <</MCID 4>> BDC
q
69.0000 0 0 46.0000 40.00 761.19 cm
/Im0 Do
```

| Item | Value |
| :--- | :--- |
| Page | A4 portrait, 595.28×841.89pt |
| Content width | 539.28pt (margins 28pt left and right) |
| Masthead row | Black background, about 62pt high (inferred from the measured 54pt plate limit) |
| White plate | 77×54pt at x=36, top edge about 30.7pt from the page top |
| Plate padding | 4pt on each side |
| Logo image box | 69×46pt at x=40 |
| Logo file | 1536×1024px, 3:2 |
| Identity column | 258.28pt (from x=123 to x=381.28) |
| Yellow panel | 186pt wide, fixed |
| Company name | 227pt wide at 14pt Archivo Black |
| Contact line | 199pt wide at 7.2pt |

The identity width formula is **[VERIFIED]** from the draw geometry:

```
identity = 539.28 - 8 (spacer) - (imageWidth + 8) (plate) - 10 (spacer) - 186 (yellow panel)
         = 327.28 - imageWidth
```

At the current 3:2 logo, `imageWidth = 69`, so `identity = 258.28`. This matches the measured text start at x=123 and the yellow panel start at x=381.28.

### 3.2 Why the visible mark is small [VERIFIED]

The logo file has large transparent margins:

| Measure | Value |
| :--- | :--- |
| File size | 1536×1024px |
| Ink bounding box | x 223–1313, y 215–744 |
| Ink size | 1091×530px |
| Ink width fraction | 71.03% |
| Ink height fraction | 51.76% |
| Ink aspect ratio | 2.058:1 |
| Opaque pixel fraction | 13.42% |

At a 46pt image height, the rendered image is 69pt wide. The visible ink is:

```
visible width  = 69 × 0.7103 = 49.0pt
visible height = 46 × 0.5176 = 23.8pt
```

The white plate is 77×54pt. The plate is only 8pt larger than the image. The apparent white tile is mostly the transparent padding inside the image file. A larger plate alone would not make the mark larger. A larger image height would enlarge the mark, but it also enlarges the transparent padding and consumes identity width.

### 3.3 Constraints

#### 3.3.1 Forme image rule [VERIFIED - prior probe]

Forme supports height-led image sizing:

```tsx
<Image src={logoUrl} height={46} style={{ height: 46 }} />
```

A height-only image preserves the intrinsic aspect ratio. Forme ignores `style.maxHeight` when `height` is absent. Forme does not support `objectFit`. The template cannot crop or contain the image. A trim must happen before the image enters the template.

#### 3.3.2 Vertical limit [VERIFIED - prior probe]

The masthead row is about 62pt high. The plate is `imageHeight + 8`. The plate can grow to about 62pt before the row grows. This sets the image limit at about 54pt. Prior probes measured the growth threshold at 54–55pt. At 54pt, the plate is 62pt and fits the row. At 55pt, the plate is 63pt and starts to grow the masthead.

#### 3.3.3 Horizontal limit [VERIFIED]

The identity column must hold the name and the contact line. At the current 3:2 logo:

| Requirement | Width |
| :--- | :--- |
| Identity column at 46pt | 258.28pt |
| Company name | 227pt |
| Contact line | 199pt |
| Name slack | 31.28pt |
| Contact slack | 59.28pt |

For a logo with aspect ratio `a`, each additional point of height removes `a` points from the identity column:

```
name-safe height    = (327.28 - 227) / a = 100.28 / a
contact-safe height = (327.28 - 199) / a = 128.28 / a
```

The contact-safe values are fixture-dependent because the contact string changes. The name-safe values use the real tenant name and are stable.

| Aspect | Example | Name-safe height | Practical limit |
| :--- | :--- | :--- | :--- |
| 1.5:1 | Tenant 3:2 | 66.9pt | 54pt (vertical limit) |
| 1:1 | Square 48×48 | 100.3pt | 54pt (vertical limit) |
| 0.5:1 | Tall 36×72 | 200.6pt | 54pt (vertical limit) |
| 2:1 | 2:1 lockup | 50.1pt | 50pt |
| 2.4:1 | Wide lockup | 41.8pt | 41.8pt for the name |
| 3:1 | Wide 120×40 | 33.4pt | 33.4pt for the name |

Wide logos hit the horizontal limit before the vertical limit. Tall and square logos hit the vertical limit.

### 3.4 Test matrix results [VERIFIED - prior renders]

The prior logo work rendered the portrait CSR with the real tenant logo and with square, tall, 2.4:1, and 3:1 fixtures.

| Aspect | At 46pt | At 50pt | At 54pt |
| :--- | :--- | :--- | :--- |
| 3:2 real | 1 page, name and contact on one line | 1 page, no new wrap | 1 page, safe |
| 1:1 square | 1 page, no wrap | 1 page, no wrap | 1 page, safe |
| 1:2 tall | 1 page, no wrap | 1 page, no wrap | 1 page, safe |
| 2:1 | 1 page, name fits with 8.3pt slack | 1 page, name fits with about 0.3pt slack | Name wraps |
| 2.4:1 | 1 page, name wraps; contact fits | Name stays wrapped; contact fits with a few points of slack | Contact wraps; 2-page risk |
| 3:1 | 2 pages; name and contact wrap | 2 pages; no new wrap | 2 pages |

Interpretation:

- **46pt** is stable for all fixtures. Wide logos wrap, but the page count stays at 1 except for 3:1.
- **50pt** adds 8.7% visible height. It does not add a new wrap to the tested matrix. It is not a robust global value because the 2:1 name has less than 1pt of slack and the 2.4:1 contact has only a few points.
- **54pt** is safe only for 3:2, square, and tall logos. It regresses 2:1 and 2.4:1.
- **3:1 at 46pt already produces 2 pages.** A larger logo does not cause this; the width limit causes it.

### 3.5 Effects of a larger logo

| Area | Effect |
| :--- | :--- |
| Company name | Wraps to 2 lines when identity width falls below 227pt. This reduces hierarchy and increases masthead height. |
| Contact line | Wraps earlier than the name for wide logos because the identity starts at the same x but the contact string is long. |
| Yellow panel | Fixed at 186pt. A larger logo shrinks the identity column, not the panel. At extreme widths, the identity column can become narrower than the panel, which breaks the visual balance. |
| Masthead | Grows only when the plate exceeds about 62pt, which is an image height of about 54pt. |
| Pagination | The masthead growth pushes all content down. For 2.4:1 and 3:1 logos, a 2-page result is possible at 54pt. |
| Landscape CSR | Uses a separate template and a different masthead. No change was tested or proposed here. |

### 3.6 Options

#### Option A - Keep 46pt [RECOMMENDATION]

- No template change.
- No new pagination risk.
- The logo remains visually small for this tenant because of file padding.
- This is the correct default until the asset is trimmed.

#### Option B - Raise to 50pt globally [RECOMMENDATION - only if a template-only change is mandatory]

- Visible height increases by 8.7%.
- No new wrap in the tested matrix.
- The 2:1 name has less than 1pt of slack. The 2.4:1 contact has only a few points. Any font, tracking, or tenant-name change can cause a wrap.
- This is a weak improvement for a real regression risk.

#### Option C - Adaptive height by aspect [RECOMMENDATION - not preferred]

- Example: 54pt for aspect ≤2:1, 46pt for aspect >2:1.
- It protects wide logos and gives taller logos more size.
- It adds branching to the template and a larger test matrix.
- It does not fix the file padding. The tenant logo remains visually small.
- It makes the design less predictable across tenants.

#### Option D - Trim the asset, then use 44pt [RECOMMENDATION - preferred]

- Crop the logo to its ink bounds in the branding or upload pipeline.
- Keep the original file. Store a trimmed variant or a crop box.
- Set the template height to 44pt.
- Results from the verified trim test:

| Measure | Current | Trimmed at 44pt |
| :--- | :--- | :--- |
| Visible mark | 49.0×23.8pt | about 90.6×44pt |
| Visible width change | - | +85% |
| Visible height change | - | +85% |
| Plate | 77×54pt | about 98.6×52pt |
| Masthead height | about 62pt | about 62pt (no growth) |
| Name | 227pt, one line | 227pt, one line |
| Identity slack | 31.28pt | about 9.7pt |

- A tight trim has a theoretical name-safe height of about 48.7pt. The verified render used 44pt. Do not use 46pt or more without a new test, because the identity margin becomes small.
- If reference parity is more important than maximum prominence, a trimmed height of 36pt reproduces the reference lockup scale (about 74×36pt visible). The 44pt option is more prominent.

### 3.7 Recommendation

1. **Keep the template at 46pt now.** Do not adopt 54pt globally.
2. **Trim the logo to its ink bounds** in the branding pipeline. This is the only change that fixes the visible size without a layout regression.
3. **Use 44pt after trimming.** This was verified with the real tenant name.
4. **Do not use adaptive aspect sizing** unless tenants cannot change their files and the product accepts a larger test matrix.
5. **Do not raise the logo just because the engine permits it.** The measured limits show that wide logos regress first.

### 3.8 Additional work if the trim is approved

- Add an image preprocessing step at logo upload or at PDF preparation.
- Detect the alpha or non-white bounding box.
- Preserve transparency and color profile.
- Keep the original asset and a reversible crop record.
- Add tests for 3:2, square, tall, 2.4:1, and 3:1 assets.
- Add a test for a logo with no transparent padding.
- Add a test for a missing logo.
- Add a test for a logo that is already tight.
- Confirm the trimmed asset renders at 44pt with the name on one line.
- Confirm the masthead height does not grow.
- Confirm the footer and pagination do not change.
- Do not hardcode tenant dimensions.

---

## 4. Sparse CSR page investigation

### 4.1 Measurements [VERIFIED]

`SASICSR-008.pdf`:

| Measure | Value |
| :--- | :--- |
| Page count | 1 |
| Page size | 595.28×841.89pt |
| Top margin | 26pt |
| Bottom margin | 34pt |
| Content area | 539.28×781.89pt |
| Body end (sign-off box bottom) | about 629.7pt from the top |
| Footer text | about 799–808pt from the top |
| Blank from body end to footer top | about 169.3pt |
| Blank from body end to content bottom | about 178.2pt |
| Body use of content height | about 77.2% |
| Blank share of page height | about 21.2% |

The body does not use half the page. It uses about 77% of the content height. The empty appearance comes from four sources:

1. All six operational readings are `-`.
2. The problem, service, and remarks narratives are `-` or `None reported`.
3. The materials section shows a one-line empty state.
4. The footer is anchored at the bottom, so the remaining space is one visible block.

### 4.2 Section sizing audit [VERIFIED]

| Section | Sizing | Fixed height? | Notes |
| :--- | :--- | :--- | :--- |
| Masthead | Content-driven | No | Logo height 46pt; plate 54pt; identity text; yellow panel content-driven. |
| Section tables | Content-driven rows | No | Label column 70pt; value column flex. Empty values still occupy a row. |
| Operational readings | Content-driven | No | Six rows; each shows `-` when empty. |
| Narratives | Content-driven | No | Two columns; empty text uses a short fallback. |
| Materials, 0 items | Empty-state strip | No | 9pt padding around one italic line. |
| Materials, >0 items | Cards | Minimum 30/38pt per card | Only applies when items exist. |
| Sign-off | Fixed signature stage | Yes, 42pt | Two blocks; `wrap={false}`; three 14pt lines each. |
| Footer | Fixed position | No | 6.6pt text on a 0.6pt top rule. |
| Page | A4 | Yes | 595.28×841.89pt. |

The blank space is not caused by a large fixed section. The only fixed block is the 42pt signature stage. The sections do not stretch. The page is short because the content is short.

### 4.3 Forme layout behavior [PRIOR - probes]

The prior natural-pagination and CSR work tested Forme layout behavior:

- On a single page, a `flexGrow: 1` spacer expands. A test marker moved from y=80 to y=794. The footer stayed at y=798.
- On a 2-page document with 50 lines, the page-2 marker stayed at y=152. The spacer did not expand on the last page.
- A `Fixed position="footer"` element declared after a wrapping table was omitted on page 1. The current portrait template declares the footer before the materials table for this reason.

Implications:

- A single global spacer cannot fill the last page of a multi-page document.
- A spacer can fill a single-page document.
- The template must know the page count before it can decide to add a spacer. Forme does not expose `totalPages` during the first render. A two-pass approach is required.
- The footer order workaround is fragile. It must be encapsulated and tested.

### 4.4 Options

| Option | Description | Sparse result | Dense result | Multi-page result | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A. Natural flow | Keep content-driven sizing. | 77% used; blank above footer. | Correct. | Correct. | **Recommended now.** |
| B. Global vertical distribution | Add flex spacers between sections. | Fills the page. | Adds artificial gaps. | Fails or adds gaps on the last page. | Reject. |
| C. Minimum heights / flexible regions | Give sections minimum heights. | Fills the page. | Can overflow or push content. | Can create blank blocks. | Reject. |
| D. Two-pass adaptive layout | Render, measure pages and spare height, re-render with a single spacer before the sign-off only when the document has 1 page. | Fills the page in a controlled way. | No change when not triggered. | No change when not triggered. | **Recommended only if the product requires it.** |
| E. Adaptive density | Change font size or spacing by content volume. | Fills the page. | Risks hierarchy and legibility changes. | Risks inconsistent typography. | Reject for now. |

### 4.5 Why natural flow is the correct default

- The PRD Gate 1 suite requires "balanced spacing without artificial gaps or stretched margins on single page" for `DOC-SHORT-01` (`test-plan.md:25`). A global spacer violates this criterion.
- The page is already about 77% used. The remaining blank is a normal consequence of a short report.
- The sign-off is the correct visual end of the document. Moving it to the bottom would separate it from the content it certifies.
- Global minimum heights create artificial blank content. This is explicitly prohibited by the task constraints and by the PRD's spacing criterion.
- The current behavior is stable across dense and sparse documents. Any change must preserve that stability.

### 4.6 If a fuller page is required: two-pass adaptive layout

**Design [RECOMMENDATION]:**

1. Render the document with `renderDocumentWithLayout` (or an equivalent layout inspection).
2. Read the page count and the spare height on the last page.
3. If the page count is 1 and the spare height is above a threshold, re-render with an `anchorSignOff` flag.
4. In the flagged render, insert one `flexGrow: 1` spacer immediately before the sign-off block.
5. If the page count is greater than 1, keep natural flow.
6. Do not add spacers between content sections.

**Threshold:** a spare height above about 120pt is a reasonable first value. This is a design parameter, not a measured fact. Tune it with the matrix.

**Why one spacer before the sign-off:** it moves the sign-off and the footer area together, keeps the content block intact, and avoids artificial gaps inside the report body. It does not stretch tables or cards.

**Risks:**

- A second render doubles render time for single-page documents.
- The threshold must be tuned so that a short but dense document is not moved unnecessarily.
- The spacer changes the position of the sign-off, not the content. This must be reviewed as a design decision.
- The approach must not run when the document has 2 or more pages.

### 4.7 Risk matrix for any future change

| Scenario | Natural flow | Global spacer | Minimum heights | Two-pass adaptive |
| :--- | :--- | :--- | :--- | :--- |
| 0 materials | Safe | Fills page | Blank card area | Safe if flagged |
| 1–4 materials | Safe | Fills page | Blank card area | Safe if flagged |
| 13–24 materials | Safe | Not applicable | Overflow risk | Safe; flag is false |
| Short narratives | Safe | Fills page | Blank narrative area | Safe if flagged |
| Long narratives | Safe | Not applicable | Overflow risk | Safe; flag is false |
| 1 page | Gap above footer | Fills | Fills | Fills |
| 2+ pages | Safe | Last-page gap | Overflow risk | Safe; flag is false |
| Footer on every page | Yes | Yes | Yes | Yes |
| Exactly two sign-offs | Yes | Yes | Yes | Yes |
| Materials order | Preserved | Preserved | Preserved | Preserved |
| Clipping or overlap | None | None | Risk | None if gated |
| Artificial blank content | No | Yes | Yes | No |

### 4.8 Recommendation

1. **Keep natural flow now.** Do not add global spacers or minimum heights.
2. **Accept the 169–178pt blank region** as normal for a sparse report. The page is about 77% used.
3. **If the product requires a fuller page, approve the two-pass adaptive layout** with the matrix above.
4. **Gate the change with these criteria:**
   - 0, 1, 4, 13, and 24 materials.
   - Short and long narratives.
   - 1-page and multi-page documents.
   - Real, square, wide, tall, and missing logos.
   - Footer on every page.
   - Exactly two sign-offs.
   - No clipping, overlap, or distortion.
   - No change to page count for dense documents.
   - No artificial blank content.
5. **Do not combine this change with the logo change.** Test them separately.

### 4.9 Optional content-purposeful change

If the signed page looks too compressed, increase the signature stage from 42pt to 60pt. This is a content-purposeful change: it gives a real handwriting area. It is not artificial blank space. Test it on the dense and multi-page matrix before adoption. Do not combine it with the adaptive spacer.

---

## 5. Current CSR architecture assessment

### 5.1 Verified pipeline [VERIFIED]

```
ViewCSR.handleDownload
  -> isPdfcnCsrTemplate(template)
  -> generateCsrPdfcnPdf({ rawDocument, templateId, options })
  -> resolvePdfcnDocument(...)
  -> prepareCsrDocument(raw, options)
  -> validateCsrDocument(...)
  -> PdfcnDocumentEnvelope<CanonicalPreparedCsr>
  -> CsrPortraitReferenceTemplate | CsrLandscapeBlueprintTemplate
  -> generatePdfcnPdf(...)
  -> renderPdfcnToBytes(...)
  -> Forme renderer
```

Key files:

| File | Role |
| :--- | :--- |
| `src/pages/ViewCSR.tsx` | Selects the PDFCN or legacy path; builds `previewData`; injects branding. |
| `src/components/pdf/index.ts` | `generateCsrPdfcnPdf` wrapper. |
| `src/domain/pdf/resolver/csr/prepareCsrDocument.ts` | Pure mapping from raw CSR data to `CanonicalPreparedCsr`. |
| `src/domain/pdf/resolver/csr/csrPreparedContract.ts` | Canonical contract. |
| `src/components/pdf/pdfcn/csr/index.ts` | Template definitions, IDs, aliases, registration. |
| `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx` | Portrait template. |
| `src/components/pdf/pdfcn/csr/CsrLandscapeBlueprintTemplate.tsx` | Landscape template. |
| `src/components/pdf/pdfcn/adapter.ts` | Forme render and PDF delivery. |

### 5.2 What conforms

- The resolver and preparation function are pure. `prepareCsrDocument` does not mutate the raw document. It maps fields and filters blank material rows. **[VERIFIED]**
- The canonical contract separates client, location, equipment, service window, readings, narratives, materials, signatories, and service provider. **[VERIFIED]**
- Branding is injected through `options.serviceProvider`, not hardcoded. Missing branding fields stay empty. **[VERIFIED]**
- The portrait template uses height-led logo sizing and preserves the intrinsic aspect ratio. **[VERIFIED]**
- The footer uses dynamic page numbers, the CSR number, and the provider name. It is placed before the materials table to avoid the Forme footer omission. **[VERIFIED]**
- The materials schedule is a real Forme table for 1 or more items. It has an explicit empty state for 0 items. **[VERIFIED]**
- The CSR portrait and landscape templates are registered with stable IDs. **[VERIFIED]**

### 5.3 Deviations and risks

| ID | Finding | Impact | Severity |
| :--- | :--- | :--- | :--- |
| C-01 | `ViewCSR` passes `{ ...csr, ...previewData }` to the resolver. | The preview model is merged into the resolver input. Field precedence is implicit. A presentation-only field can change PDF data. This conflicts with the data-blind renderer principle. | High |
| C-02 | `designPreset`, ink color, and custom font are collected by the UI but ignored on the PDFCN path. | The UI promises customization that does not apply. Users can select a template and see no effect. | Medium |
| C-03 | The default CSR template is legacy `'8'`. PDFCN templates are opt-in. | Most users still use React-PDF. M5 certification does not cover the default path. | High |
| C-04 | CSR has two render paths: legacy templates `'3'`, `'6'`, `'8'`, and PDFCN portrait/landscape. | Visual drift and double maintenance. A fix in one path does not fix the other. | High |
| C-05 | Template aliases (`csr-blueprint-technical-drawinglandscape.html`, `csr-final-pdfcn-reference.html`) are registered at import time. | Aliases are implicit. Import order can register templates before the registry is ready. | Medium |
| C-06 | Header, footer, signature, and party blocks are local to the CSR module. | The same primitives must be rebuilt for quotation, invoice, and waybill. This blocks M1-A reuse. | High |
| C-07 | The footer must be declared before the materials table. | A future reorder can drop the footer on page 1. The rule is not encapsulated or tested. | Medium |
| C-08 | No golden-file or visual regression test for CSR PDFCN was found. | Unit tests do not prove visual parity. Certification cannot rely on them alone. | High |
| C-09 | The portrait template uses local font registration for Archivo Black only. | Body text falls back to a default font. Quotation and invoice will not share the typography. | High |
| C-10 | The materials card uses 30pt and 38pt minimum heights. | This is safe for the current fixtures, but it is a local fixed dimension. It must be included in the dense matrix. | Low |

### 5.4 Reusable CSR work

These assets are valuable for M2 and M4:

- The canonical CSR contract and the pure preparation function.
- The PDFCN adapter and template definition pattern.
- Archivo Black TTF bundling and registration.
- The portrait materials distribution algorithm and its tests.
- The footer-before-table rule and the footer test fixtures.
- The layout probes that established the Forme image, flex, and footer behavior.
- The 0/4/13/24 materials fixtures and the logo aspect fixtures.

### 5.5 What must change before CSR certification

1. Remove the preview-model merge from the resolver input, or make the precedence explicit and tested.
2. Wire or remove the ignored customization controls on the PDFCN path.
3. Decide the default template and retire templates `'3'`, `'6'`, and `'8'`.
4. Move the header, footer, signature, and party primitives into the shared Forme layer.
5. Encapsulate the footer-before-content rule.
6. Add a golden-file or visual regression test for portrait and landscape.
7. Define the visual tolerance for certification.
8. Add the dense, sparse, and logo matrix to the CSR test suite.
9. Confirm the footer appears on every page.
10. Confirm exactly two sign-offs.

---

## 6. Milestone status

### 6.1 Roadmap claim vs verified state

The roadmap claims:

- Total: 15%.
- M0: 100%, IMPLEMENTED.
- M1–M6: 0%, PENDING.

The verified state:

| ID | Roadmap claim | Verified state | Assessment | Gate |
| :--- | :--- | :--- | :--- | :--- |
| M0 | 100%, IMPLEMENTED | Documentation suite exists. Seven PRD files are modified. The HTML roadmap is untracked. G-01 is marked PASSED but the tree is dirty. G-06 is marked PASSED but `SASQUO-430 (1).pdf` is absent; the file is `SASQUO-430_261028_074031.pdf`. | Deliverables present. Baseline not frozen. | Gate not clean |
| M1 | 0%, PENDING | Archivo Black TTF is bundled and registered. Body fonts are not registered for Forme. No Forme rich-text AST adapter, Unicode normalizer, or emoji policy was found. | Partial | Not signed |
| M2 | 0%, PENDING | CSR natural pagination, footer, and table continuation are proven. No Forme quotation or invoice template exists. Gate 1 suite cannot run. | Partial | Gate 1 not signed |
| M3 | 0%, PENDING | No Forme compaction implementation. | Pending | Not started |
| M4 | 0%, PENDING | No Forme quotation or invoice template. The quotation/invoice work is a design investigation only. | Pending | Not started |
| M5 | 0%, PENDING | CSR portrait and landscape PDFCN templates exist. CPS uses Forme but bypasses PDFCN. Waybill, RFQ, and BOQ are not migrated. The default CSR template is legacy. No M5 certification suite exists in the test plan. | Partial | Not certified |
| M6 | 0%, PENDING | 45 source files reference `@react-pdf/renderer`; 41 import it directly. Receipt and Project Documents are not in M5 scope. | Pending | Blocked |

### 6.2 Why the 15% figure is misleading

The 15% is M0 only: 1 of 7 milestones, rounded. M1, M2, and M5 contain verified partial work. The roadmap cannot express partial work because its status legend has no `PARTIAL` token. Do not publish a new percentage without an agreed scoring rule.

**Recommended scoring rule [RECOMMENDATION]:** milestone weight × gate completion. Give partial credit only when the evidence is linked and the remaining criteria are listed. A milestone is 100% only when its target gate is signed. Do not use line counts or file counts as progress.

### 6.3 Gate status

| Gate | Requirement | Status | Evidence |
| :--- | :--- | :--- | :--- |
| Gate 1 | Natural pagination across the representative suite, including `SASQUO-000427`, `SASQUO-000428`, and `SASQUO-430`. | Not signed | No Forme quotation/invoice templates. No signed Gate 1 record. |
| Gate 2 | Compaction tests on 1-page and multi-page corpora. | Not started | No compaction implementation. |
| Gate 3 | Pre-production approval for Forme quotation and invoice. | Not started | No Forme quotation/invoice templates. |
| M5 certification | Waybill, RFQ, BOQ, CSR. | Not defined | The test plan ends at TS-11. No M5 suite. |
| M6 pre-removal | Zero React-PDF imports and full regression. | Not started | 45 references remain. |

### 6.4 What must happen before React-PDF removal

1. Certify Quotation and Invoice at Gate 3.
2. Certify Waybill, RFQ, BOQ, and CSR.
3. Certify Receipt and Project Documents, or confirm they do not use React-PDF.
4. Complete a static import analysis for `@react-pdf/renderer`, including dynamic imports and string references.
5. Remove all obsolete adapters and template IDs.
6. Run the full PDF regression suite.
7. Uninstall the package.
8. Keep a rollback plan for one release.

A Forme template is not certification. Certification requires functional parity, visual parity, preview parity, and a signed gate record.

---

## 7. Remaining family inventory

### 7.1 Family status [VERIFIED]

| Family | Current renderer | PDFCN/Forme status | Certification | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Quotation | React-PDF | None | None | Reference PDFs exist: `SASQUO-000427 (1).pdf`, `SASQUO-000428.pdf`, and a renamed 430 file. |
| Invoice | React-PDF | None | None | No Forme template. |
| Waybill | React-PDF | None | None | The PRD has a strict single-page contract for blank waybills. |
| RFQ | React-PDF | None | None | No Forme template. |
| BOQ / CPS | React-PDF plus a CPS Forme path | A CPS Forme template exists and bypasses PDFCN | Not certified | `generateCpsFormePdf` receives a React element and calls `renderDocument` directly. Confirm whether BOQ and CPS are one family or two templates. |
| CSR | Dual path | Portrait and landscape PDFCN templates | Partial | Legacy `'3'`, `'6'`, `'8'` remain. Default is `'8'`. |
| Receipt | React-PDF | None | Not in M5 | Blocks M6. |
| Project Documents | React-PDF | None | Not in M5 | Blocks M6. |
| Statement | No generator found | None | Unknown | Confirm whether a statement generator exists outside the PDF modules. |

### 7.2 Shared infrastructure gaps

| Capability | Current state | Needed for |
| :--- | :--- | :--- |
| Body font TTF | Missing for Forme. Inter is referenced by name, but no TTF is registered. | M1, M2, M4, M5 |
| Display font TTF | Archivo Black only. | CSR |
| Rich-text AST adapter | React-PDF implementation exists; no Forme adapter. | M1, M4, M5 |
| Unicode normalizer | Not found for Forme. | M1, M2 |
| Emoji policy | Not found for Forme. | M1 |
| Header primitive | Local to CSR. | Quotation, Invoice, Waybill |
| Footer primitive | Local to CSR; order-sensitive. | All families |
| Party block | Local to CSR. | Quotation, Invoice, Waybill |
| Totals block | React-PDF implementations. | Quotation, Invoice |
| Table builder | Forme tables exist in CSR and CPS. No shared builder. | Quotation, Invoice, RFQ, BOQ |
| Signature block | Local to CSR. | Quotation, Invoice, CSR |
| Barcode | Not found in the Forme path. | Waybill, Invoice if required |
| Link annotations | Not verified in Forme. The test plan assumes image links. | M1 verification |
| `objectFit` | Not supported by Forme. The test plan assumes it. | Test plan correction |
| Layout measurement wrapper | `renderDocumentWithLayout` exists but is not shared. | M2, M3 |

### 7.3 Test coverage gaps

- The test plan has TS-1 to TS-11. It has no M5 suite.
- Gate 1 has 9 documents. Three are real quotations; the rest are synthetic.
- The quotation references use `SASQUO-000427`, `SASQUO-000428`, and `SASQUO-430`. The 430 file is renamed in the repository, so the test path is broken.
- TC-5.4 requires `objectFit: 'contain'`. Forme does not support `objectFit`. The test must verify intrinsic aspect preservation by height-led sizing instead.
- There is no CSR visual regression or golden-file test.
- There is no cross-family footer test.
- There is no test for the default legacy CSR template.

---

## 8. Recommended migration sequence

### 8.1 Authoritative order

**Quotation → Invoice → Waybill → RFQ & BOQ → CSR**

This is the order in `draft.md:348-352` (In-Scope Document Families) and `Waterfall-roadmap.md:161-165` (Phase 5). It is also the order implied by `risk-register.md:149`, which lists Waybill, BOQ, and CSR as remaining families.

### 8.2 Rationale

1. **Quotation first.** It is the primary reference implementation. The Gate 1 suite uses real quotation PDFs. It exercises the table, totals, closing, and pagination logic that the other families reuse.
2. **Invoice second.** It shares the party, line-item, tax, totals, and bank-detail model with Quotation. Build the shared primitives once.
3. **Waybill third.** It reuses the party and table blocks. It has a strict single-page contract and a simple footer. It is a good test of the shared layout without financial complexity.
4. **RFQ & BOQ fourth.** They are table- and pricing-heavy. They need the shared table builder and the calibrated column logic. BOQ also exposes the current CPS Forme bypass, which must be routed through PDFCN before certification.
5. **CSR last.** CSR is already partially migrated. Closing it last lets it consume the shared header, footer, signature, and party primitives instead of freezing its local versions. Its current work can continue in parallel, but its certification gate closes last.
6. **Residual families after CSR.** Receipt and Project Documents use React-PDF and are not in M5. Certify them before M6, or add them to M5 scope.

### 8.3 Why CSR should not be first

CSR has the most evidence, but it is a service report with a different layout. It does not prove quotation pagination, totals, tax, or the closing block. If CSR is certified first, its local primitives become the de facto shared layer. That would create rework when Quotation and Invoice need different primitives.

CSR can be a **pilot** for the shared foundation. It should not be the **certification gate** before Quotation and Invoice.

### 8.4 Sequence conflicts

| Document | Line | Statement | Problem | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| `draft.md` | 145 | "Quotation → Invoice → Waybill → CSR" | Omits RFQ & BOQ. | Correct to the 5-family order. |
| `functional-req.md` | 181 | "Quotation → Invoice → Waybill → CSR" | Omits RFQ & BOQ. | Correct to the 5-family order. |
| `draft.md` | 351-352 | Family 4 = RFQ & BOQ; Family 5 = CSR | Correct. | Keep. |
| `Waterfall-roadmap.md` | 161-165 | Waybill → RFQ and BOQ → CSR | Correct. | Keep. |
| `risk-register.md` | 149 | Remaining families: Waybill, BOQ, CSR | Omits RFQ. | Add RFQ. |

**Recommendation:** Correct `draft.md:145` and `functional-req.md:181`. Add RFQ to `risk-register.md:149`. Record the correction in the roadmap decision log.

### 8.5 Unresolved sequence decisions

- **[UNRESOLVED]** Should Receipt and Project Documents be added to M5, or should M6 have an explicit prerequisite for them? Recommendation: add them to M5 as "M5b: residual families" so M6 has a single entry condition.
- **[UNRESOLVED]** Should CSR be certified before or after RFQ & BOQ? Recommendation: after. If the product needs CSR earlier, move it before RFQ & BOQ and record the trade-off.
- **[UNRESOLVED]** Is BOQ the same family as CPS, or a separate template? Recommendation: treat BOQ/CPS as one family for infrastructure and certify both templates separately.
- **[UNRESOLVED]** Does a Statement generator exist? If yes, add it to the inventory before M6.

---

## 9. Dependencies and phases

### 9.1 Phase plan

| Phase | Work | Depends on | Exit |
| :--- | :--- | :--- | :--- |
| P0 | Baseline hygiene: commit or approve PRD changes; fix G-01 and G-06; decide the HTML sync method. | None | Clean baseline; gates re-verified. |
| P1 | M1-A: Shared Forme foundation. | P0 | Fonts, rich text, Unicode, shared primitives, layout wrapper. |
| P2 | M2: Natural pagination for Quotation and Invoice; run Gate 1. | P1 | Gate 1 signed. |
| P3 | M3: Compact and Force 1 Page modes. | Gate 1 | Gate 2 signed. |
| P4 | M4: Quotation and Invoice certification; landscape; preview parity. | M3 | Gate 3 signed. |
| P5 | M5: Waybill, RFQ, BOQ/CPS, CSR. | M4 | Per-family certification. |
| P6 | M5b: Receipt and Project Documents, if in scope. | M5 | Residual certification. |
| P7 | M6: Static import analysis, adapter removal, package removal. | All certifications | Zero imports; regression passes. |

### 9.2 Dependency graph

```
P0 baseline
  -> M1-A foundation
      -> M2 natural pagination -> Gate 1
          -> M3 compaction -> Gate 2
              -> M4 quotation + invoice -> Gate 3
                  -> M5 waybill -> RFQ & BOQ -> CSR
                      -> M5b receipt + project documents
                          -> M6 React-PDF removal
```

### 9.3 Dependency notes

- M2 needs M1-A fonts and rich text. Without them, quotation templates will use fallback fonts and plain text.
- M3 needs Gate 1. Do not use compaction to hide broken natural pagination.
- M4 needs M3 only for the compact/force-1-page modes. The normal-mode template can be built in M2, but certification waits for Gate 3.
- M5 needs the shared table builder and signature block from M4.
- M6 needs every family, including the residual families.

---

## 10. Acceptance criteria and verification gates

### 10.1 M0 acceptance

- All PRD files are committed or explicitly approved as the baseline.
- The Markdown and HTML roadmaps agree.
- G-01 passes: the tree is clean or contains only documented CSR/report files.
- G-06 passes: the reference corpus filenames match the test plan, or the test plan is updated.
- The baseline commit or approval is recorded in the decision log.

### 10.2 M1 acceptance

- Body fonts are bundled as TTF and registered for Forme in Node and the browser.
- Fonts work offline and in the mobile WebView.
- PDF font subsets are embedded. No Helvetica fallback appears for the body text.
- Rich text supports bold, italic, underline, paragraphs, lists, and line breaks.
- Raw HTML is not displayed. Unsafe tags are stripped.
- Double-prime, non-breaking space, and common Unicode characters render correctly.
- Emoji policy is defined and tested.
- Shared header, footer, party, and signature primitives exist and are used by at least two templates.
- `renderDocumentWithLayout` is wrapped and tested.

### 10.3 M2 / Gate 1 acceptance

- The representative suite renders with natural pagination.
- No text is clipped, overlapped, or outside the margins.
- Table headers repeat on continuation pages.
- The footer appears on every page.
- The closing block is not stranded or split.
- The short single-page document has balanced spacing without artificial gaps.
- The 2-page and 4-page documents do not have blank pages or stranded headings.
- Page counts match or improve on the legacy output, or the difference is documented.
- Gate 1 is signed with page-count and visual evidence.

### 10.4 M3 / Gate 2 acceptance

- Compact mode reduces spacing without clipping or overlap.
- Force 1 Page succeeds only when the content fits safely.
- If the content cannot fit, the fallback is a clean 2-page document.
- Minimum font size and line-height limits are enforced.
- Gate 2 is signed.

### 10.5 M4 / Gate 3 acceptance

- Quotation and Invoice templates exist in Forme.
- Functional parity: fields, line items, quantities, units, prices, discounts, tax, totals, currency, dates, bank details, terms, and signatories.
- Visual parity: page count, margins, header, footer, table columns, totals block, and typography.
- Preview parity: the on-screen PDF preview matches the downloaded PDF.
- Landscape mode is correct.
- Gate 3 is signed.

### 10.6 M5 acceptance

- Waybill: single page for blank templates; footer with company left and waybill number right; signatures and footer do not spill.
- RFQ: table columns, multi-line descriptions, and totals are correct.
- BOQ/CPS: routed through PDFCN; template and data are certified.
- CSR: portrait and landscape certified; footer on every page; exactly two sign-offs; materials order preserved; legacy templates retired.
- Each family has fixtures and tests.
- No family is marked complete because a template exists. Functional and visual parity are required.

### 10.7 M6 acceptance

- Static import analysis shows zero `@react-pdf/renderer` imports and references.
- No dynamic import or string reference remains.
- All adapters and legacy template IDs are removed.
- The full PDF regression suite passes.
- The package is uninstalled.
- A rollback plan exists for one release.

### 10.8 Proposed visual tolerance [RECOMMENDATION]

The PRD does not define a numeric visual tolerance. Propose:

- Render both legacy and Forme output at 150 DPI.
- Structural elements (margins, table edges, footer rule) must not shift by more than 2pt.
- Pixel difference must be below 1% of the page area after anti-aliasing normalization.
- No glyph clipping, overlap, or missing text is allowed at any tolerance.
- A human review signs the final page pair.

This tolerance is a proposal. It needs product and design approval before Gate 3.

---

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R-01 | A global logo height increase wraps wide-logo names and contacts. | High | Medium | Keep 46pt; trim the asset; test the aspect matrix. |
| R-02 | A global spacer stretches sparse pages and breaks dense pagination. | High | High | Keep natural flow; use a two-pass single-page gate only. |
| R-03 | A flex spacer does not expand on the last page of a multi-page document. | Verified | High | Do not use a global spacer; use page-aware logic. |
| R-04 | The footer is omitted when `Fixed` is declared after a wrapping table. | Verified | High | Keep the footer before content; add a regression test. |
| R-05 | The default CSR template stays legacy and bypasses PDFCN certification. | High | High | Change the default after certification; retire legacy templates. |
| R-06 | CPS/BOQ bypass PDFCN and do not share the canonical envelope. | High | High | Route CPS/BOQ through PDFCN before certification. |
| R-07 | Body fonts fall back to Helvetica because only WOFF or no TTF is registered. | High | High | M1-A TTF pipeline; embedding test. |
| R-08 | Rich text, emoji, or Unicode fails in Forme. | High | Medium | M1-A adapter and tests; fallback policy. |
| R-09 | The PRD baseline is dirty and the gates are marked PASSED incorrectly. | Verified | High | P0 baseline hygiene; re-run G-01 and G-06. |
| R-10 | The family order is inconsistent across PRD files. | Verified | Medium | Correct the two 4-family arrows; record the decision. |
| R-11 | Receipt and Project Documents block M6. | High | High | Add them to M5 or define an M6 prerequisite. |
| R-12 | M5 has no test suite, so certification is subjective. | High | High | Add a Gate 4 / M5 suite with fixtures. |
| R-13 | TC-5.4 assumes `objectFit`, which Forme does not support. | Verified | Medium | Rewrite the test for height-led intrinsic sizing. |
| R-14 | No visual tolerance is defined, so "parity" is undefined. | High | High | Approve the tolerance in section 10.8. |
| R-15 | Unknown dynamic imports or external consumers keep React-PDF alive. | Medium | High | Static and dynamic import analysis before M6. |
| R-16 | The trimmed logo loses brand detail or is cropped incorrectly. | Medium | Medium | Preserve the original; review the crop; test all aspect fixtures. |
| R-17 | The adaptive sparse-page layout changes the sign-off position in a way design does not approve. | Medium | Medium | Treat it as a design decision; gate with the matrix. |

---

## 12. Unresolved decisions

| ID | Decision | Recommended default | Owner |
| :--- | :--- | :--- | :--- |
| U-01 | Logo: keep 46pt, raise to 50pt, or trim and use 44pt? | Trim and use 44pt. Keep 46pt until the trim is ready. | Product + Design |
| U-02 | Sparse page: natural flow or two-pass adaptive? | Natural flow. Revisit only if the product requires a fuller page. | Product + Design |
| U-03 | Correct the 4-family arrows to 5 families? | Yes. Keep CSR last. | Project Lead |
| U-04 | Receipt and Project Documents: M5 or M6 prerequisite? | Add to M5b. | Project Lead |
| U-05 | Retire legacy CSR templates `'3'`, `'6'`, `'8'`? | Yes, after portrait/landscape certification. | Product + Engineering |
| U-06 | Route CPS/BOQ through PDFCN? | Yes, before M5 certification. | Engineering |
| U-07 | Visual tolerance for certification? | Adopt section 10.8 as a starting point. | Product + Design |
| U-08 | HTML roadmap: generated or hand-maintained? | Generate from Markdown; add a sync check. | Project Lead |
| U-09 | Commit or approve the dirty PRD baseline? | Commit after review. | Project Lead |
| U-10 | Does a Statement generator exist? | Confirm and add to the inventory if yes. | Engineering |
| U-11 | Who signs M5 per-family certification? | Project Lead + Design. | Project Lead |
| U-12 | Switch the default CSR template to PDFCN? | Yes, after certification. | Product |

---

## 13. Roadmap maintenance proposal

### 13.1 Current artifacts [VERIFIED]

| Artifact | Path | State |
| :--- | :--- | :--- |
| Markdown roadmap | `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md` | Tracked and modified in the working tree. Normative. 15%, M0 100%, M1–M6 0%. |
| HTML roadmap | `docs/prd/pdf-rendering-migration/Waterfall-roadmap.html` | Untracked. Real designed HTML, about 81.6 KB. `Last Updated 2026-10-30`. Mirrors the Markdown status. |

The HTML is not a Markdown copy. It has its own design, navigation, milestone nodes, execution steps, and decision log. It does not link to the Markdown source.

Other roadmaps exist in the repository:

- `docs/prd/cost-pricing-sheet/waterfall-roadmap.html`
- `docs/prd/multi-tenancy/Waterfall-roadmap.html` (this one links to its Markdown source)

These are separate projects. Do not merge them.

### 13.2 Sync conventions

- No generator, script, or CI check references the PDF migration roadmap.
- The Markdown and HTML agree on the current status by hand.
- Both have a decision log. The Markdown has a status legend. The HTML mirrors the milestones and steps.
- The HTML has a `Last Updated` field. The Markdown does not.
- The Markdown uses `IMPLEMENTED`, `IMPROVED`, `CORRECTED`, `SUPERSEDED`, and `PENDING`. It has no `PARTIAL` token.
- The milestone table has no evidence column. The decision log records decisions, not acceptance evidence.

### 13.3 Proposed workflow [RECOMMENDATION]

1. **Markdown is the single source of truth.** All status changes start in the Markdown.
2. **Add a `PARTIAL` token** to the status legend:
   `🟡 PARTIAL — Work verified in part; the target gate is not signed.`
3. **Add an `Evidence` column** to the milestone tracker. Each entry links to a report, test, PDF fixture, or commit.
4. **Add an `Acceptance` column or a sub-line** for the target gate criteria.
5. **Add a task record format** for each implementation task:
   - Task ID (for example, `M1-A`).
   - Milestone.
   - Status (`DONE`, `PARTIAL`, `BLOCKED`, `PENDING`).
   - Acceptance criteria.
   - Evidence link.
   - Remaining work.
   - Blocker.
   - Next action.
6. **Update the Markdown first.** Then update the HTML in the same change.
7. **Add a sync check.** Until a generator exists, add a checklist item to the PR review: "Markdown and HTML agree on status, percentages, gates, and decision log."
8. **Do not mark a milestone complete until its target gate is signed.** A partial implementation is `PARTIAL`, not `IMPLEMENTED`.
9. **Preserve history.** Append to the decision log. Do not delete completed items. If a decision changes, mark the old entry `SUPERSEDED` and add the new entry.
10. **Record the next actionable task** at the top of the roadmap so a new reader can start without reading the full history.

### 13.4 Proposed HTML generation

If a generator is approved:

- Read the Markdown.
- Write the HTML with the current design.
- Add a `Source: Waterfall-roadmap.md` link and a content hash.
- Fail the check if the HTML is stale.
- Do not hand-edit generated HTML.

If a generator is not approved:

- Keep the HTML hand-maintained.
- Add a `Source` link and a `Last Updated` field.
- Add a manual checklist to the PR template.
- Compare the milestone table and decision log before each commit.

### 13.5 Proposed edits (not applied)

The following edits are accurate from verified evidence, but this investigation did not apply them. Reasons are in section 13.6.

**Edit 1 - Progress note after `Waterfall-roadmap.md:12`:**

```
> Verified status (2026-10-30): M0 deliverables are present, but the baseline is not frozen.
> M1, M2, and M5 have verified partial work and no signed gate. M3, M4, and M6 are pending.
> The 15% figure represents M0 only.
```

**Edit 2 - Status legend after line 23:**

```
- 🟡 **PARTIAL** — Work verified in part; the target gate is not signed.
```

**Edit 3 - Milestone table (lines 32-38):**

- M0: keep `✅ IMPLEMENTED`, add "Baseline drift: G-01 and G-06 need re-verification."
- M1: `🟡 PARTIAL`, evidence: Archivo Black TTF; missing body TTF, rich text, Unicode, emoji.
- M2: `🟡 PARTIAL`, evidence: CSR natural pagination and footer; Gate 1 suite not run.
- M3: keep `⛔ PENDING`.
- M4: keep `⛔ PENDING`.
- M5: `🟡 PARTIAL`, evidence: CSR portrait/landscape; CPS bypass; Waybill/RFQ/BOQ pending; no M5 suite.
- M6: keep `⛔ PENDING`, add "45 files reference React-PDF; Receipt and Project Documents are unscheduled."

Do not assign new percentages to M1, M2, or M5 without an agreed scoring rule.

**Edit 4 - Decision log:**

Add these entries:

| Date | Phase Affected | Status Applied | Decision & Justification |
| :--- | :--- | :--- | :--- |
| 2026-10-30 | Execution Sequence | 🟡 PARTIAL | Five-family order is authoritative: Quotation → Invoice → Waybill → RFQ & BOQ → CSR. Correct the 4-family arrows in `draft.md` and `functional-req.md`. CSR is last so it can adopt shared primitives. |
| 2026-10-30 | Search / Residual Families | ⛔ PENDING | Receipt and Project Documents remain on React-PDF and are not in M5. Add them to M5b or define an M6 prerequisite. |
| 2026-10-30 | CSR Logo | ⛔ PENDING | Keep 46pt. Prefer an ink-bounds trim at 44pt. Do not raise all logos to 54pt. Await approval. |
| 2026-10-30 | Sparse CSR | ⛔ PENDING | Keep natural flow. A two-pass adaptive spacer is an option only with a full pagination matrix. Await approval. |
| 2026-10-30 | Baseline Freeze | 🛠️ CORRECTED | G-01 and G-06 are marked PASSED but the tree is dirty and the 430 filename differs. Re-verify before M1. |

**Edit 5 - Phase 5 note after line 165:**

```
Order: Waybill → RFQ & BOQ → CSR. This matches the five-family list in draft.md §13.1.
CSR is last so it can use the shared header, footer, signature, and party primitives.
```

**Edit 6 - HTML roadmap:**

Mirror edits 1–5. Add `Source: Waterfall-roadmap.md` and keep `Last Updated`.

### 13.6 Why the roadmaps were not updated

- The status model has no `PARTIAL` token. Adding one is a format decision that needs approval.
- The M0 gate evidence is contradictory. G-01 and G-06 are marked PASSED, but the tree is dirty and the 430 filename differs. Marking M0 "verified" would be inaccurate.
- The seven PRD files are already modified in the working tree. Editing them now would mix this investigation with user work and make the diff harder to review.
- The task says to update the roadmaps only if the changes are accurate from verified evidence. The partial status is verified, but the representation is not defined. The proposed edits are precise, so they can be applied after approval without further investigation.

---

## 14. Recommended next implementation task

### 14.1 Prerequisite: P0 baseline hygiene

1. Review and commit the seven modified PRD files.
2. Re-verify G-01: the tree must be clean or contain only documented CSR/report files.
3. Fix G-06: align the 430 filename with the test plan, or update the test plan.
4. Decide whether the HTML roadmap is generated or hand-maintained.
5. Add the `PARTIAL` token and evidence column, or approve the proposed format.

### 14.2 M1-A: Shared Forme foundation

**Goal:** Create the shared Forme layer that M2, M4, and M5 need. Do not build templates in this task.

**Deliverables:**

1. **Body-font TTF pipeline**
   - Bundle the approved body face (Inter Regular and Bold, or the approved alternative) as TTF.
   - Register the fonts in Node and the browser.
   - Confirm offline and mobile WebView availability.
   - Confirm the PDF embeds subsets and does not fall back to Helvetica.
   - Add a font-embedding test.

2. **Rich-text AST adapter**
   - Convert sanitized HTML or Tiptap JSON to Forme `Text` and `View` nodes.
   - Support bold, italic, underline, paragraphs, ordered and unordered lists, and line breaks.
   - Strip unsafe HTML.
   - Fall back to plain text for unmapped structures.
   - Test with the five-step pipeline inputs from the PRD.

3. **Unicode and emoji policy**
   - Normalize double-prime, non-breaking space, and common symbols.
   - Define the emoji set or the strip policy.
   - Test the `SASQUO-000428` double-prime case.

4. **Shared primitives**
   - Header with logo, identity, and document meta.
   - Footer with page numbers, document number, and company name.
   - Party block for client and provider.
   - Signature block with two sign-offs.
   - Totals block.
   - Table builder with repeatable headers and calibrated columns.
   - Extract only what M2 and M4 need. Do not build a general framework.

5. **Layout measurement wrapper**
   - Wrap `renderDocumentWithLayout`.
   - Return page count and spare height.
   - Use it for the M3 compaction work and the optional CSR adaptive layout.

6. **Tests**
   - Font embedding.
   - Rich text.
   - Unicode.
   - Footer on every page.
   - Header and footer on page 1 and continuation pages.
   - Single-page and multi-page fixtures.
   - CSR portrait and landscape regression.

**Exit criteria:**

- The CSR portrait and landscape output does not regress.
- A quotation fixture renders with the shared primitives and the body font.
- No Helvetica fallback appears for the body text.
- The footer appears on every page.
- The tests pass.
- No build command is run.

**Out of scope:**

- Quotation and Invoice templates (M2/M4).
- Compaction (M3).
- React-PDF removal (M6).
- Logo template changes.
- Sparse-page layout changes.

### 14.3 Parallel CSR task (after approval)

**Logo asset trim** in the branding pipeline.

- Crop to ink bounds.
- Keep the original.
- Use 44pt in the portrait template.
- Test the aspect matrix.
- Do not change the layout in the same task.

This is a data and pipeline task. It does not block M1-A.

---

## 15. Verification statement

- `AGENTS.md` was read at the start of the session.
- The `pdf-rendering-correctness` skill was loaded before the report was written.
- `git status` was run before the investigation.
- No application source file, PDF template, component, test, font, asset, canonical model, or business-logic file was modified.
- No existing dirty or untracked file was overwritten.
- The only file created by this task is this report.
- The roadmaps were not edited.
- The following commands were not run: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run audit:load`, and the full test suites.
- Measurements were made with MuPDF, `pdf-lib`, and a byte scan of the embedded alpha mask.
- Prior render results are labeled **[PRIOR]** and were not re-rendered in this task.
- No visual correctness claim is made beyond the measurements and the prior rendered fixtures.

---

## Appendix A - Measured data

### A.1 Sparse CSR text positions

| Top (pt) | Bottom (pt) | Text |
| :--- | :--- | :--- |
| 35.0 | 45.0 | CUSTOMER SERVICE REPORT |
| 38.0 | 53.0 | Sun & Shield Power Solutions |
| 51.0 | 70.0 | SASICSR-008 |
| 73.0 | 83.0 | 2026-07-04 / COMPLETE |
| 110.0 | 241.0 | Client and equipment information |
| 262.0 | 312.0 | Operational readings (six rows, all `-`) |
| 329.0 | 415.0 | Problem, service, observations, remarks |
| 435.0 | 473.0 | Parts and materials schedule (empty state) |
| 500.0 | 626.0 | Sign-off (two blocks) |
| 799.0 | 808.0 | Footer: `Page 1 of 1` |

### A.2 Logo geometry

| Measure | Value |
| :--- | :--- |
| File | 1536×1024 |
| Ink box | 223,215 to 1313,744 |
| Ink box size | 1091×530 |
| Ink width | 71.03% |
| Ink height | 51.76% |
| Ink aspect | 2.058 |
| Opaque pixels | 13.42% |
| Image box at 46pt | 69×46pt |
| Visible mark at 46pt | 49.0×23.8pt |
| Plate | 77×54pt |
| Identity | 258.28pt |
| Name | 227pt |
| Contact | 199pt |
| Yellow panel | 186pt |

### A.3 Safe-height calculations

```
identity(a, h) = 327.28 - a × h
name-safe h    = (327.28 - 227) / a = 100.28 / a
```

| Aspect a | Name-safe h | At 50pt | At 54pt |
| :--- | :--- | :--- | :--- |
| 1.5 | 66.9pt | Safe | Safe |
| 1.0 | 100.3pt | Safe | Safe |
| 0.5 | 200.6pt | Safe | Safe |
| 2.0 | 50.1pt | 0.3pt slack | Name wraps |
| 2.4 | 41.8pt | Name already wrapped at 46pt | Contact wraps; 2-page risk |
| 3.0 | 33.4pt | Already 2 pages at 46pt | Already 2 pages |

---

## Appendix B - Source references

| Reference | Location |
| :--- | :--- |
| Roadmap status and milestones | `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md:12`, `:32-38` |
| Roadmap Phase 5 | `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md:161-165` |
| Roadmap decision log | `docs/prd/pdf-rendering-migration/Waterfall-roadmap.md:182-192` |
| 4-family arrow | `docs/prd/pdf-rendering-migration/draft.md:145` |
| 5-family list | `docs/prd/pdf-rendering-migration/draft.md:348-352` |
| 4-family arrow | `docs/prd/pdf-rendering-migration/functional-req.md:181` |
| Risk R-12 omission | `docs/prd/pdf-rendering-migration/risk-register.md:149` |
| Gate 1 short-document criterion | `docs/prd/pdf-rendering-migration/test-plan.md:25` |
| Gate 1 suite | `docs/prd/pdf-rendering-migration/test-plan.md:21-35` |
| Logo aspect test | `docs/prd/pdf-rendering-migration/test-plan.md:88-96` |
| Test plan end | `docs/prd/pdf-rendering-migration/test-plan.md:143` (TS-11) |
| M0 gates | `docs/prd/pdf-rendering-migration/Prerequisites.md:29`, `:34` |
| Masthead | `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx:156-209` |
| Footer | `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx:440-455` |
| Signature stage | `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx:408` |
| Logo component | `src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx:147` |
| Materials schedule | `src/components/pdf/pdfcn/csr/csrPortraitMaterials.tsx` |
| CSR download handler | `src/pages/ViewCSR.tsx:246-273` |
| CSR PDFCN wrapper | `src/components/pdf/index.ts:198` |
| CSR template registry | `src/components/pdf/pdfcn/csr/index.ts:21-84` |
| CPS Forme bypass | `src/components/pdf/index.ts:160-193` |
| Canonical preparation | `src/domain/pdf/resolver/csr/prepareCsrDocument.ts:54` |

---

**End of report. No implementation has started. Approval is required for the logo, sparse-page, sequence, and roadmap decisions.**
