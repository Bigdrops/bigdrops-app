# Visual Acceptance Failure — Architectural, Heritage, Executive

This report was written by Buffy on 2026-11-11 via Freebuff.

**Task type:** Read-only corrective investigation. No application code, CSS, asset, test or configuration file was modified. No thumbnail or PDF was regenerated.

Skills used: pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive summary

The three supplied PDFs are current production output. They render through the same Forme components as the previews, and they contain the previous implementation's changes. The previous implementation is therefore not stale. It is **incomplete and, in one case, regressive**.

| Template | Verdict | Cause in one line |
|---|---|---|
| **Architectural** | **Regression confirmed** | The company logo is a dark-navy lockup. The removed ivory plate was the light field that made it legible. On the charcoal card the logo is now dark-on-dark and reads black. |
| **Heritage** | **Not delivered** | The paper, card and table-row tokens are white, but the `ivory` group bands remain `#f2e9d4` and cover 12.99 % of page 1. The document still reads ivory. |
| **Executive** | **Not delivered** | No colour token was ever changed, because the previous brief said to preserve forest green and gold. The current brief refers to "requested colour changes" that exist nowhere in the repository or the task record. |

**Common root cause of the missed acceptance:** the preview fixture cannot fail the way production fails. It uses a saturated **green** 1×1 pixel as the logo and contains **no grouped line items**. A green square has maximum contrast on charcoal, and no group band can render. Both defects were therefore invisible in the regenerated thumbnails that were used as acceptance evidence.

All three PDFs are 2-page quotations, `SASQUO-000436`, issuer SUN & SHIELD POWER SOLUTIONS, producer `Forme 0.6`.

## 2. Evidence inventory and identification

Files supplied (all downloaded 2026-11-11 16:16–16:17, after the 16:06 code edits and preview regeneration):

| Supplied file | Template | Identification evidence |
|---|---|---|
| `SASQUO-000436.pdf` | **Architectural** | Charcoal `#1e2327` header card and table head 7.3–9.0 %, ivory rows `#f6efe3` 19.4–25.4 %, copper `#a3663e`. Asymmetric 56/42 header. |
| `SASQUO-000436 (1).pdf` | **Executive** | Forest `#16392c` 2.4–7.3 %, gold `#a9854f`, ivory panels `#f6efe1` 21.0–23.0 %. Centred masthead with the vector diamond. |
| `SASQUO-000436 (2).pdf` | **Heritage** | White page 74.0 %, burgundy `#5c1a25` 0.20 %, ivory `#f1e9d3` 12.99 %, bronze rules. Burgundy seal box. |

Rendered evidence (all pages, 2× A4):

- `docs/Reports/PDF-TEMPLATES/evidence/pdf1-p1.png`, `pdf1-p2.png` — Architectural
- `docs/Reports/PDF-TEMPLATES/evidence/pdf2-p1.png`, `pdf2-p2.png` — Executive
- `docs/Reports/PDF-TEMPLATES/evidence/pdf3-p1.png`, `pdf3-p2.png` — Heritage
- `docs/Reports/PDF-TEMPLATES/evidence/zoom-logo-architectural.png` — logo at 7×
- `docs/Reports/PDF-TEMPLATES/evidence/zoom-logo-heritage.png` — logo at 7×
- `docs/Reports/PDF-TEMPLATES/evidence/zoom-logo-executive.png` — masthead at 7×

These PNGs are new files created by this investigation. They are the only additions besides this report. They are not application assets.

### 2.1 Proof that the PDFs are current, not stale

| Check | Result |
|---|---|
| Executive text contains `EXECUTIVE DIRECT SETTLEMENT` or `Please remit` | **No** — the strings are absent, so the previous removal is present |
| Executive separator | Rendered as a **vector diamond**, not `?` — the glyph fix is present |
| Heritage contains `#f8f1e2` (old `paper`) or `#fffcf7` (old `white`) | **0.00 % and 0.00 %** — the previous token change is present |
| PDF producer | `Forme 0.6`, identical for all three |

Conclusion: the production PDF path uses the same renderer and the same tokens as the previews. No stale asset, no cached blob, no divergent route.

## 3. Architectural — logo regression

### 3.1 Actual appearance in the supplied PDF

Page 1, charcoal header card, logo slot. The logo renders as a dark mark that merges into the card. There is no cream badge.

Measured inside the logo region (`zoom-logo-architectural.png`):

| Colour | Share | Meaning |
|---|---|---|
| `#1e2327` | 81.0 % | Architectural charcoal card |
| `#242b2f`, `#2b3337`, `#1d2226`, `#1c2125` | 1.7 + 1.7 + 1.0 + 0.9 % | The logo's own dark navy ink |
| `#ffffff` | 1.1 % | The "SUN" wordmark letters only |

The logo ink and the card share nearly the same luminance. Contrast is about 1.2:1. To the eye the mark disappears and reads black.

### 3.2 What the logo actually is

The asset is a **dark-ink lockup**: a navy shield mark, a navy "SUN & SHIELD" wordmark, and a thin amber accent bar. It is designed to sit on a light surface. There is only one logo source in the pipeline — `resolveCanonicalLogoUrl()` (`src/domain/documentMedia.ts:31`) reads `company_logo_url` / `companyLogoUrl` / `logo_url` / `imageUrl`. **No light or inverse variant exists**, so the treatment must supply the light field.

The same asset renders correctly — dark on white — in:

- Heritage page 1: inside the white seal box (`#ffffff` 69.8 % of the region), fully legible.
- Executive page 1: on white paper (`#ffffff` 94.3 % of the region), fully legible.

### 3.3 Requested appearance

Preserve the original logo appearance and colours. No copper tint. Preserve proportions and transparency.

### 3.4 Difference

The previous version wrapped the logo in a 40×40 box with `backgroundColor: ARCHITECTURAL_TOKENS.ivory` (`#f6f0e4`) and a `copperLight` border, and forced the image to 30×30. The user remembers a **cream square with a dark mark** — that cream square was the plate, not the asset. Removing the plate removed the light field, and the dark ink became invisible on charcoal.

The removal also changed the lockup's scale and ratio: the asset is a wide lockup, so `width={34}` with derived height renders it short and small, where the old square stretched it larger.

### 3.5 Exact source responsible

`src/components/pdf/forme/ArchitecturalFormeDocument.tsx`, header card, lines 194–200:

```tsx
{companyLogo ? (
  /* The logo keeps its own colours, transparency and aspect ratio. ... */
  <Image src={companyLogo} href={companyLogo} width={34} />
) : null}
```

Previous implementation (now removed): a 40×40 `View` with `backgroundColor: ARCHITECTURAL_TOKENS.ivory`, `borderColor: copperLight`, `padding: 5`, containing `<Image style={{ width: 30, height: 30 }} />`.

### 3.6 Why the previous implementation failed

1. It treated the ivory plate as a colour defect. The plate is actually the **contrast substrate** for a dark-ink logo.
2. It removed the plate without inspecting the real asset. Only the fixture was used.
3. The fixture logo is a saturated green 1×1 pixel (`scripts/generate-commercial-template-previews.ts`, `FIXTURE_PIXEL_PNG`), stretched into the slot. Green on charcoal has high contrast, so the preview could never reproduce the failure.

The earlier "logo colours preserved" check was also invalid as acceptance evidence: it proved that a bright test image survives (no tint), not that a dark brand logo stays legible.

### 3.7 Minimal corrective plan

1. Reinstate a light **neutral** substrate for the logo, derived from the template's own neutral surface, not from the copper accent. Recommended: a `36×36` box with `backgroundColor: '#ffffff'`, no border, no copper, `padding: 3`, containing `<Image width={30} />` (width only, so ratio is preserved).
2. Do not apply any tint, opacity, filter or fill to the image itself. The logo's own colours remain untouched; the white box is behind it, not on it.
3. Do not restore the copper border. That was the original complaint and is not needed for legibility.
4. Verify with a **dark-ink** logo, measuring contrast between the logo ink and its backing (target ≥ 3:1), and confirm that no copper hex appears inside the logo box.

Alternative, if a branded frame is wanted: keep a white plate and draw a hairline in `lightRule` (`#e8ded0`) instead of copper. Same contrast result, no copper association.

## 4. Heritage — white paper not achieved

### 4.1 Actual appearance in the supplied PDF

Page 1 is largely white, but the table carries wide cream bands at every group boundary. Page 1 and page 2 both show them.

Measured, page 1:

| Colour | Share | Source token |
|---|---|---|
| `#ffffff` | 74.03 % | `page` / `paper` / `white` — all now `#ffffff` |
| `#f1e9d3` (rendered) | **12.99 %** | **`ivory` `#f2e9d4` — unchanged** |
| `#5c1a25` | 0.20 % | burgundy, intact |
| `#f8f1e2` (old paper) | **0.00 %** | previous change landed |
| `#fffcf7` (old white) | **0.00 %** | previous change landed |

Page 2 shows the same pattern (`#f1e9d3` 9.6 %).

### 4.2 Where the remaining cream is

`src/components/pdf/forme/HeritageHouseFormeDocument.tsx`:

| Line | Surface | Fill |
|---|---|---|
| 350 | `group_header` row (band with group title) | `HERITAGE_TOKENS.ivory` |
| 362 | `group_footer` row ("End of Group" + subtotal) | `HERITAGE_TOKENS.ivory` |
| 456 | Advance payment summary card | `HERITAGE_TOKENS.ivory` |

The supplied quotation has four item groups on page 1, so eight full-width cream bands render. That is the 12.99 %.

### 4.3 Requested appearance

Clean white document paper, burgundy identity and bronze accents preserved, no redesign.

### 4.4 Difference

The **paper stock** is white. The **group bands** are still ivory. A reader sees a white sheet crossed by large cream stripes, and reports "still ivory". The paper change alone cannot satisfy the request while the largest coloured surfaces in the table remain warm cream.

### 4.5 Why the previous implementation failed

The preview fixture (`buildSampleInvoice()` in `scripts/generate-commercial-template-previews.ts`) contains **only `rowType: 'line'` items**. It never emits `group_header` or `group_footer`. The regenerated Heritage preview therefore measured 98.4 % white and 0 % ivory, and was accepted. Production documents with grouped items render eight cream bands.

This is a verification-coverage failure, not a token mistake.

### 4.6 Minimal corrective plan

1. Set the group band fill to white (broadcast decision needed between `#ffffff` and a neutral `#f7f7f7`).
2. Keep the existing group separators for structure: `borderTopColor: bronze` on the header band and `borderBottomColor: burgundy` (1.5 pt) on the footer band. Grouping stays visible without a fill.
3. Same for the advance summary card, or keep `ivory` there only if a subtle callout is wanted.
4. Re-measure both pages: `#f1e9d3` and `#f2e9d4` must be 0.00 %, burgundy and bronze must persist.

Open item, unchanged: Heritage still renders its own `❖` divider as `?` (page 1 shows it between the masthead rules). The previous brief scoped the glyph fix to Executive only; it remains unfixed by instruction.

## 5. Executive — colour change not delivered

### 5.1 Actual appearance

Forest green and gold, unchanged from the HTML reference:

| Surface | Colour | Share (page 1) |
|---|---|---|
| Table header / total bar | `#16392c` | 2.4 % |
| Panel surfaces | `#f6efe1` | 20.99 % |
| Accent rules, numerals | `#a9854f` | ~0.2 % |

The previous corrections are present and correct: the settlement panel is gone, the separator is a clean gold vector diamond, optional fields render blank.

### 5.2 Requested appearance

The current brief states that "the user explicitly requested a revised Executive colour identity" and that preserving forest green and gold does not satisfy it.

### 5.3 Difference

There is **no colour change in the code**, so none can appear in the PDF. This is not a rendering fault. No colour token was touched.

### 5.4 Why it was not delivered

The immediately preceding brief said:

> "Preserve the rest of the Executive design, including its forest-green identity and gold accents."

No target palette, hex value or reference image exists in the repository, in `docs/`, or in any commit message for `ExecutiveFormeDocument.tsx` (`859d50e0`, `9865c358`, `cded8282`). The requirement is therefore undefined. Implementing one now would be invention.

### 5.5 Minimal corrective plan

Blocked on one decision. Supply one of:

- **(a)** the target hex values (primary / accent / paper), or
- **(b)** a reference image or HTML, or
- **(c)** confirm the intent is "white paper like Heritage, keep forest green + gold" — that is a two-token change (`paper`, `ivoryPanel`).

Once the target is known, `EXECUTIVE_TOKENS` (`ExecutiveFormeDocument.tsx:18–33`) is the single choke point: all visible surfaces derive from it.

## 6. Thumbnail / PDF consistency

| Question | Finding |
|---|---|
| Do the regenerated thumbnails contain the intended corrections? | **Yes, for the code that exists.** Heritage preview is 98.4 % white with the paper tints gone; Executive preview has the diamond and no settlement panel; Architectural preview shows the logo without a plate. |
| Does the production PDF use the same renderer and tokens? | **Yes.** Both call `renderPdfcnToBytes` with the same Forme components. Measured palettes match the previews. |
| Is the production PDF stale or cached? | **No.** Executive carries the new code; Heritage shows 0.00 % of both old cream tints. |
| Does the production rendering path differ from the preview path? | **No.** Only the fixture differs: production supplies a real logo and grouped items; preview supplies a green pixel and no groups. |
| Does the preview fixture represent production reality? | **No.** This is the defect behind the acceptance failure. |

So the pipeline is consistent; the **acceptance evidence** was not representative.

## 7. Root cause of the three findings, in one line each

1. **Architectural** — plate removed from a dark-ink logo, leaving dark-on-dark; the fixture's green pixel hid the contrast failure.
2. **Heritage** — `ivory` group bands were never in scope of the token change, and the fixture has no groups, so 12.99 % cream survived unnoticed.
3. **Executive** — no palette was ever specified; the earlier brief said to preserve the current one.

## 8. Corrective plan, ordered by dependency

| # | Step | Depends on | Verification |
|---|---|---|---|
| 1 | Decide the Heritage group-band fill (white or neutral `#f7f7f7`) | Approval | — |
| 2 | Decide the Executive target palette | **User input required** | — |
| 3 | Architectural: white neutral logo substrate, no copper, width-only image | Approval | Dark-logo contrast ≥ 3:1; no copper hex in the logo box; ratio preserved |
| 4 | Heritage: group bands + advance card to the approved fill, keep bronze/burgundy rules | Step 1 | `#f1e9d3` / `#f2e9d4` = 0.00 % on both pages |
| 5 | Executive: apply approved palette through `EXECUTIVE_TOKENS` | Step 2 | Measured palette equals the approved values |
| 6 | **Upgrade the fixture**: dark-ink logo, plus one grouped item set with header and footer | None (can start now) | Previews must show the real logo contrast and the group bands |
| 7 | Regenerate previews, re-render the three PDFs, re-measure | Steps 3–6 | Palettes and contrast per the tables above |

Step 6 is the highest-value change. Without it, the next regression of this class will pass acceptance again.

## 9. Regression risks

- Changing the fixture affects all eight thumbnails; expect all eight PNGs to change.
- A white logo plate on Architectural alters the header rhythm; the plate must be sized so the company name still aligns with the card top.
- Whitening Heritage group bands removes the only large warm surface; confirm that grouping is still legible from the bronze and burgundy rules alone.
- Any Executive palette change is user-visible in every quotation and invoice; no automated test covers per-template palettes.

## 10. Uncertainties

1. The Executive target palette is unknown. **This blocks that template.**
2. The real logo asset was inspected only as embedded in the PDF. Its source file (PNG or SVG) and its exact original colours were not read; the values above are measured from the rendered pages.
3. Whether a second, light-variant logo exists in company settings cannot be verified from the repository; `resolveCanonicalLogoUrl()` exposes a single field.
4. Heritage group-band treatment (pure white vs neutral grey) is a design choice for the user.

## 11. Git status and scope

**Before this investigation:** 3 modified Forme documents, 3 modified preview PNGs, 8 pre-existing deletions, 2 modified test files, `src/lib/designLabPreviews.ts` and `src/pages/PoThemeExperiment.tsx` modified by other agents, plus untracked `scratch/` and purchase-order-theme files.

**After:** identical, plus two new untracked entries:

- `docs/reports/PDF-TEMPLATES/2026-11-11-template-visual-acceptance-failure.md` (this report)
- `docs/reports/PDF-TEMPLATES/evidence/` (9 rendered PNGs used as evidence)

No existing project file was modified. No code, CSS, token, thumbnail or PDF was changed or regenerated. `bun run build`, `typecheck` and `lint` were not run, per the read-only rule.

## 12. Bottom line

The previous work is not "done". Two of the three requested outcomes are absent from the production PDF, and one is a regression. The code is current and the pipeline is sound; the acceptance criterion failed because verification used a fixture that cannot express a dark logo on charcoal or a grouped-item band. Correct the logo substrate and the Heritage group bands, define the Executive palette, and make the fixture represent those surfaces before the next acceptance run.
