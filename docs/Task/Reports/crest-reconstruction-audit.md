# Crest Reconstruction Audit

**Date:** 2026-06-28  
**Status:** Complete  
**Scope:** Read-only engineering audit for recreating `docs/TEMPLATES/htmltemps/crest.html` as a first-class React-PDF presentation template.

## 1. Executive Summary

Crest is a strong candidate for a React-PDF template, but it is not a mechanical HTML-to-JSX conversion. The HTML prototype is structurally clean, visually distinct, and already aligned with a traditional invoice narrative: header, parties, grouped items, totals, notes, attachments, signature, and footer. Its main implementation risk is not data modeling, but rendering model mismatch. Crest relies on CSS Grid, hover states, print-only rules, box shadows, and browser-native layout behavior that React-PDF cannot reproduce exactly.

The good news is that the Commercial Rendering Engine already provides most of the data-shaping behavior Crest needs. Party lines, attachment normalization, column layout, alignment, totals, advance summary, and group metadata can be reused unchanged. Crest should remain presentation-only and should not invent new engine behavior unless the prototype exposes a truly missing contract.

Recommendation: build Crest as a new template presentation layer that reuses the shared engine behavior and shared adapter contracts, while preserving Crest’s own editorial identity. Do not force Crest into Industry’s spreadsheet language. Crest’s HTML design language is warmer, more branded, and more composed than Industry’s accounting-first treatment.

## 2. Overall Design Assessment

Crest is architected as an editorial invoice with a strong visual hierarchy:

- a dark header band with logo and document metadata
- a two-column party/address strip
- a light custom-fields strip
- a wide item table with grouped sections and thumbnails
- a centered totals block
- an advance summary area
- a notes/terms/attachments row
- a signature/footer finish

That structure maps well to React-PDF because it is already block-oriented. The challenge is that the HTML uses browser conveniences to create visual polish:

- CSS Grid for section layout
- `:hover` and transition behavior for link chips
- box shadows on the page shell
- rounded image thumbnails and cards
- print CSS to remove the outer frame
- CSS variables for palette control

React-PDF can approximate the hierarchy faithfully, but with some compromises:

- Grid becomes nested flex rows and fixed-width views
- hover states disappear in PDF output
- shadows must be reduced to borders or removed
- print media rules are irrelevant because PDF is already a fixed-page medium
- CSS variables become static theme tokens in the template stylesheet

Overall fit: good, but only if Crest is implemented as a dedicated presentation template, not as a copy of Industry or Ledger.

## 3. Section-by-Section Breakdown

### 3.1 Header

**Purpose:** Establish brand, document type, and top-level metadata.

HTML signals:

- dark ink header bar
- logo block
- company name and contact lines
- serif-styled document title
- invoice number and issue date on the right

React-PDF equivalent:

- top row `<View>` with left brand cluster and right metadata cluster
- solid ink background or very dark accent block
- logo image or monogram placeholder
- title rendered with serif family and italic treatment where appropriate

Reusable components:

- logo resolution via shared document media helpers
- company line construction via `buildPartyLines`

Reusable behaviour:

- `buildPartyLines`
- `resolveCanonicalLogoUrl`

New presentation work:

- Crest-specific header bar layout
- header metadata badge treatment
- serif title styling
- Crest palette and spacing tokens

### 3.2 Address Block

**Purpose:** Present company and client identities in a two-column block.

HTML signals:

- left and right columns
- label, name, and detail lines
- subtle border rules

React-PDF equivalent:

- flex two-column block with borders
- stacked text rows per party

Reusable components:

- `buildPartyLines`

Reusable behaviour:

- `buildPartyLines`

New presentation work:

- Crest-specific spacing and border rhythm
- mixed serif/sans hierarchy for party names versus labels

### 3.3 Custom Fields

**Purpose:** Show PO number and additional metadata chips.

HTML signals:

- warm panel background
- compact multi-column chips
- uppercase labels and bold values

React-PDF equivalent:

- a wrapped row of small field cells or a light strip block

Reusable behaviour:

- custom header fields already flow through the commercial adapter

New presentation work:

- Crest chip sizing, wrap handling, and label/value hierarchy

### 3.4 Table

**Purpose:** Render the itemized commercial rows with strong readability.

HTML signals:

- table header row
- dashed row separators
- right-aligned monetary columns
- thumbnails inside description cells
- item descriptions with a bold primary line and muted subline

React-PDF equivalent:

- row-based flex table with fixed or proportional column widths
- explicit `wrap={false}` per row where needed

Reusable behaviour:

- `resolveColumnLayout`
- `resolveTextAlignment`
- `buildPartyLines` for any data extracted into display lines

New presentation work:

- Crest-specific table header styling
- description cell layout with thumbnail stacking
- row separators and column spacing tuned to the prototype

### 3.5 Group Rendering

**Purpose:** Visually cluster related line items under a section heading and subtotal.

HTML signals:

- pale accent group header row
- uppercase group label
- grouped item rows with left indent and decorative arrow marker
- subtotal row with top rule and heavy closing rule

React-PDF equivalent:

- group header `<View>` with background and border
- item rows with optional in-group marker or indentation
- subtotal row followed by a heavy closing rule

Reusable behaviour:

- `isGroupHeader`
- `isGroupFooter`
- `getGroupLabel`
- `getGroupSubtotal`
- `shouldShowGroupSubtotal`

New presentation work:

- Crest-specific group header/row/footer styles
- a decision on whether to keep the decorative arrow marker or simplify it

Recommendation:

Crest should preserve its own visual identity. It should not adopt Industry’s spreadsheet-style group treatment. Crest’s HTML language is editorial and branded, while Industry’s is accounting-led and utility-first. Crest should keep the warm header and section banding, but the exact implementation should still use the shared group metadata contract from the engine.

### 3.6 Totals

**Purpose:** Close the financial narrative with subtotal, adjustments, total due, amount in words, and advance information.

HTML signals:

- centered totals card
- accent border and tinted surface
- grand total divider
- italic amount-in-words line
- advance block with dashed separators

React-PDF equivalent:

- centered or right-aligned totals container
- border-based card treatment
- line items and emphasis row
- separate advance summary block

Reusable behaviour:

- `buildTotalsLines`
- `getMainTotal`
- `getBalanceDue`
- `getAmountInWords`
- `buildAdvanceSummary`

New presentation work:

- Crest totals container geometry
- amount-in-words typography
- advance block treatment

### 3.7 Notes, Terms, Attachments

**Purpose:** Present non-financial explanatory content and supporting links.

HTML signals:

- three-column notes/terms/attachments row
- small uppercase titles
- direct links for attachments

React-PDF equivalent:

- flex row or stacked blocks with clear section titles
- link elements rendered as text links or linked labels

Reusable behaviour:

- `buildAttachmentItems`

New presentation work:

- attachment list styling
- notes/terms column widths and wrapping

### 3.8 Signature

**Purpose:** Capture the sign-off block and identity confirmation.

HTML signals:

- handwritten signature scribble
- signer name and role beneath

React-PDF equivalent:

- signature image or fallback line
- signer text block below

Reusable behaviour:

- signature data already flows through the commercial adapter contract

New presentation work:

- signature block positioning
- fallback line treatment

### 3.9 Footer

**Purpose:** Provide document number, page count, and company identity.

HTML signals:

- light panel footer strip
- page count centered
- document number and company name at the edges

React-PDF equivalent:

- fixed footer `<View>` with three aligned text zones

Reusable behaviour:

- page number rendering is already supported by React-PDF

New presentation work:

- Crest footer palette and spacing

### 3.10 Component Inventory

Existing reusable pieces already cover the core Crest data flow:

| Layer | Reusable Item | Status | Crest Use |
|---|---|---:|---|
| Engine | `buildPartyLines` | Reusable | Company/client line normalization |
| Engine | `buildAttachmentItems` | Reusable | Attachments and URL normalization |
| Engine | `resolveColumnLayout` | Reusable | Table column sizing |
| Engine | `resolveTextAlignment` | Reusable | Header/table/totals alignment |
| Engine | `buildTotalsLines` | Reusable | Totals line rendering |
| Engine | `getMainTotal` | Reusable | Grand total emphasis |
| Engine | `getBalanceDue` | Reusable | Balance line rendering |
| Engine | `getAmountInWords` | Reusable | Totals footnote text |
| Engine | `buildAdvanceSummary` | Reusable | Advance block rendering |
| Engine | `isGroupHeader` / `isGroupFooter` | Reusable | Group row detection |
| Engine | `getGroupLabel` / `getGroupSubtotal` / `shouldShowGroupSubtotal` | Reusable | Group label and subtotal presentation |
| Adapter | `adaptCommercialDocumentData` | Reusable | Crest should receive the same commercial payload |
| Media | `resolveCanonicalLogoUrl` / `resolveCanonicalItemImageUrl` | Reusable | Logos and item thumbnails |
| PDF | `PdfCurrencyText` | Reusable | Monetary text rendering |

Likely Crest-specific presentation components:

- Crest template root component
- Crest stylesheet
- optional Crest group header/footer row helpers if the template gets too large
- optional Crest header/party/totals subcomponents if the template needs cleanup

## 4. Typography Audit

### Required Font Families

HTML prototype uses:

- `Inter` for body copy and most utility text
- `Cormorant Garamond` for document title and selected serif emphasis

### Required Weights and Styles

- Inter 400, 500, 600, 700, 800
- Cormorant Garamond 500 and 600
- Cormorant Garamond italic 500

### Existing Support

Inter is already registered in the shared PDF font registry:

- `src/lib/pdfSharedFonts.ts`

The project already uses `@fontsource/inter`, and the PDF font registry exposes Inter as a shared font choice.

### Missing Assets

Cormorant Garamond is not currently registered in the shared font registry and is not present in the PDF shared font list. That means Crest would need a new font asset and registration step for React-PDF, likely through the same pattern used by the existing shared fonts.

### Licensing Considerations

The HTML imports Cormorant Garamond and Inter from Google Fonts. For production PDF output, the project should confirm the intended packaging source for the font files:

- bundled `@fontsource` package
- preloaded local asset files
- a shared font registration mechanism

Because the app already vendors fonts locally for PDF use, the safest route is to package Cormorant Garamond the same way rather than relying on remote loading.

### Registration Strategy

Recommended strategy:

1. add Cormorant Garamond to the shared font registry pattern already used by Inter and the other PDF fonts
2. expose it through the PDF design preset or a Crest-specific font mapping
3. keep body text on Inter to preserve the prototype’s serif/sans contrast

Do not register fonts inside the Crest template itself if the shared registry can be extended cleanly.

## 5. Colour Audit

### Crest Palette

From the HTML prototype:

- Ink: `#2d1f3a`
- Accent: `#b28b3d`
- Accent dim: `#f9f3e6`
- Paper: `#fdfbf7`
- Rule: `#c5bdaa`
- Light rule: `#e4ddd0`
- Panel: `#f7f3ed`
- Link: `#3d2b4f`
- Link background: `#f2eaf6`

### How the Palette Works

- `ink` is the primary text and structural anchor
- `accent` gives Crest its editorial gold identity
- `accent-dim` and `panel` support soft card and strip backgrounds
- `paper` creates a warm off-white page
- `rule` and `light-rule` define separators without harsh contrast
- link colors stay within the same plum/ink family

### Reusable Presentation Palette

Crest should likely define a template-local palette object rather than reuse Industry or Ledger tokens directly. The structure of the palette can still mirror the shared presentation system:

- text base
- accent
- paper
- rule
- panel
- link

This will make future maintenance easier without forcing visual convergence with the other templates.

## 6. Spacing Audit

### Vertical Rhythm

Crest’s rhythm is more spacious than Ledger and more ornamental than Industry:

- large header band padding
- medium party/address padding
- light custom strip padding
- moderate table row padding
- a centered totals block with margin separation
- a footer band anchored to the page bottom

### Padding Patterns

Observed HTML patterns:

- header: `1rem 2rem`
- address columns: `1.2rem 2rem`
- custom strip: `0.6rem 2rem`
- table section: horizontal padding `2rem`, top margin `1rem`
- totals wrapper: `1.2rem 2rem`
- notes/terms row: `0.6rem 2rem`
- footer: `0.5rem 2rem`

### Reusable Spacing Patterns

For React-PDF, these can translate into a small set of reusable spacing tokens:

- outer page inset
- section vertical gap
- band padding
- card padding
- table cell padding

### Table and Totals Spacing

The table is deliberately airy:

- header rule is prominent
- row padding is generous
- group rows carry slightly more padding than item rows
- totals block is centered with a large margin gap from the table

This spacing can be recreated in React-PDF, but should be measured visually rather than copied mechanically.

## 7. React-PDF Compatibility Matrix

| HTML Feature | React-PDF Equivalent | Match Quality | Required Compromise |
|---|---|---:|---|
| CSS Grid | Nested flex `<View>` rows/columns | Medium | Rebuild grid areas as flex layouts |
| Flexbox | Flex `<View>` support | High | None for standard row/column layouts |
| Shadows | Borders or subtle backgrounds | Low | Drop the page shadow or simulate with light border treatments |
| Gradients | Solid color fills only | Low | Replace gradient header treatments with solid bands |
| Hover states | None | None | Remove hover-only affordances from the PDF version |
| Pseudo-elements | Manual extra `<Text>` or `<View>` nodes | Low | Recreate markers explicitly in JSX |
| Google Fonts | Local font registration | High | Package fonts and register them in the shared registry |
| Images | `<Image>` with URL or asset source | High | Ensure persistent URLs and fallback handling |
| Page breaks | `wrap`, `break`, and page structure | Medium | Manual page-breaking logic needed for tables and long sections |
| Tables | `<View>`-based row/cell layout | High | No native `<table>` semantics |
| Borders | Supported | High | Must be measured carefully for visual equivalence |
| Backgrounds | Supported | High | Use static fills, not CSS gradients |
| `position: fixed` footer | Supported in React-PDF | Medium | Must test page overlap and bottom inset spacing |
| Media queries | Not meaningful in PDF output | None | Remove print-only and responsive browser-only rules |
| `object-fit` on images | Supported in most cases | Medium | Validate thumbnails and signature images visually |

## 8. Unsupported Features

The Crest HTML includes a number of browser-only or browser-strong features that cannot be reproduced exactly in React-PDF:

- CSS Grid for the party strip and parts of the layout
- `:hover` affordances on attachment links
- box-shadow on the page shell
- `@media print` rules
- CSS custom properties as live runtime variables
- gradient or other paint effects if the prototype evolves beyond solid fills
- exact browser font rendering differences between the HTML and PDF engines
- automatic responsive reflow based on viewport width

Recommended replacement pattern:

- convert grid areas to flex layouts
- replace hover states with static link styling
- replace shadows with borders or background contrast
- resolve CSS variables into static theme tokens
- design for fixed PDF dimensions instead of viewport responsiveness

## 8. Engine Reuse Matrix

| Engine Behaviour | Reusable Unchanged? | Notes |
|---|---:|---|
| `buildPartyLines` | Yes | Crest can reuse it for company and client line ordering. |
| `buildAttachmentItems` | Yes | Useful for normalizing attachment labels and URLs. |
| `resolveColumnLayout` | Yes | Crest can use existing column width/flex resolution. |
| `resolveTextAlignment` | Yes | Works for table and totals alignment. |
| `buildTotalsLines` | Yes | Crest totals rows already fit this shape. |
| `getMainTotal` | Yes | Presentation-only access to the emphasized total line. |
| `getBalanceDue` | Yes | Supports the final due line. |
| `getAmountInWords` | Yes | No new logic required. |
| `buildAdvanceSummary` | Yes | Crest already has an advance block in HTML. |
| `isGroupHeader` / `isGroupFooter` | Yes | Existing row model already supports them. |
| `getGroupLabel` | Yes | Should be used for consistent display labels. |
| `getGroupSubtotal` | Yes | Gives presentation a single subtotal source. |
| `shouldShowGroupSubtotal` | Yes | Encodes the render gate for the subtotal row. |
| `getAccentTint` | Maybe | Only if Crest needs accent-derived background tinting. |

### Reuse Conclusion

The existing engine is sufficient for Crest’s behavior needs. The main work is presentation, not data logic. No new engine behavior appears necessary from the HTML audit.

## 9. Presentation Layer Plan

### Recommended Architecture

Create a dedicated Crest presentation template that mirrors the existing Industry/Ledger split:

- a template component responsible for assembling sections
- a Crest-specific stylesheet
- optional small presentation subcomponents only if they reduce duplication inside the Crest template

### Recommended Boundaries

- shared engine behaviour: reused directly
- shared data adapter: reused directly
- Crest layout and visual language: template-local
- Crest fonts and palette: template-local or template-specific shared palette

### What Not to Do

- do not copy Industry’s spreadsheet group language
- do not clone Ledger’s inline styling as a starting point
- do not rewrite engine behavior to serve Crest

## 10. Asset Requirements

### Required Assets

- Cormorant Garamond font files for React-PDF
- Crest logo asset or logo URL conventions
- sample company image and item thumbnail images for visual QA
- optional fallback placeholder image for missing thumbnails

### Existing Assets Already Available

- Inter font family
- shared PDF font registration system
- document media helpers for canonical image URLs
- React-PDF image rendering support

### Asset Gaps

- Cormorant Garamond is not registered yet
- Crest-specific PDF page artwork or iconography does not currently exist

## 11. Image Strategy

### Thumbnail Strategy

Use the existing canonical image flow:

- resolve persisted image URLs
- avoid blob/file/content URLs in final output
- render thumbnails inline within description cells

### Missing Image Behaviour

If a thumbnail is missing, the description cell should still render cleanly without reserving visual noise. The text description must remain readable and the row must not collapse.

### Failed Image Behaviour

The HTML prototype assumes valid URLs. React-PDF should be more defensive:

- if the image fails to load, render the row without the image and preserve row spacing
- do not block PDF generation on thumbnail failure

### Placeholder Strategy

Prefer a lightweight placeholder only if the design depends on consistent image height. Otherwise, it is better to omit the image and keep the row text stable.

### Supabase Integration

Use persisted URLs only. The existing document media helpers already normalize and filter temporary URLs, which is the right architecture for Crest too.

### Multi-Page Behaviour

Thumbnails must not force row splits that create orphaned content. Keep image and description content together where possible with `wrap={false}` on the row or image container if needed.

### Performance Considerations

- avoid loading more image data than needed
- keep thumbnails small
- prefer canonical persisted URLs over ephemeral upload links

## 12. Group Rendering Recommendation

Crest should **preserve its own visual identity** rather than inherit Industry’s spreadsheet treatment.

Why:

- Crest’s HTML is editorial, warm, and branded
- Industry is accounting-oriented and intentionally spreadsheet-like
- Ledger is utilitarian and minimalist
- Crest’s accent palette and serif title treatment are part of its identity

That said, Crest should still use the shared group metadata contract from the engine so the implementation stays consistent:

- group headers from `isGroupHeader`
- group footers from `isGroupFooter`
- group labels from `getGroupLabel`
- subtotal visibility from `shouldShowGroupSubtotal`
- subtotal value from `getGroupSubtotal`

Recommended styling direction:

- keep the warm accent band
- keep the light group header surface
- keep the existing arrow/decorative grouping language if it fits in PDF
- keep subtotal emphasis as a formal closing row

## 13. Totals Rendering Recommendation

Crest totals should stay closer to the HTML prototype than to Industry or Ledger:

- centered totals card
- gold accent border
- tinted background
- strong grand total divider
- italic amount-in-words line
- dashed advance summary block

Mapping into React-PDF:

- use a dedicated totals container `<View>`
- render each totals line as a row with aligned labels and values
- render grand total with stronger type weight and a top divider
- render amount-in-words as an italic secondary line
- render advance summary as a separate block below or inside the totals container based on page flow

This can be recreated faithfully enough in React-PDF because it is fundamentally a block-and-border layout, not a grid-heavy layout.

## 14. Integration Plan

### Phase 1 - Assets

**Work:**

- add/register Cormorant Garamond for PDF output
- confirm logo and thumbnail URL handling
- establish Crest palette tokens

**Effort:** Low to medium  
**Risk:** Low

### Phase 2 - Presentation Components

**Work:**

- create Crest template component
- decide whether a small subcomponent set is justified
- map the HTML sections to React-PDF blocks

**Effort:** Medium  
**Risk:** Medium

### Phase 3 - Styles

**Work:**

- define Crest stylesheet
- translate HTML spacing, border, and typography
- replace unsupported shadows/gradients with PDF-safe equivalents

**Effort:** Medium to high  
**Risk:** Medium to high

### Phase 4 - Integration

**Work:**

- wire Crest into the template registry
- connect it to the existing commercial adapter
- ensure the preview and PDF export paths can select it

**Effort:** Low to medium  
**Risk:** Low

### Phase 5 - Verification

**Work:**

- compare output against the HTML prototype
- verify fonts, page breaks, images, and totals
- run load audit and targeted PDF checks

**Effort:** Medium  
**Risk:** Medium

## 15. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---:|---|
| CSS Grid to flex translation drifts from HTML | High | Medium | Prototype the layout early and compare against HTML screenshots |
| Cormorant Garamond registration is incomplete | Medium | Medium | Add it to the shared font registry before template work starts |
| Thumbnails overflow or clip in PDF | Medium | Medium | Keep image containers fixed and wrap-safe |
| Group sections visually lose Crest identity | High | Medium | Preserve Crest’s editorial palette and section language |
| Totals block pushes content to a second page | Medium | Medium | Validate spacing and allow page-break-aware layout decisions |
| Unsupported hover/shadow effects are overreplaced | Low | High | Accept them as HTML-only affordances and use border-based equivalents |

## 16. Open Questions

1. Should Crest keep the decorative group arrow marker from HTML, or should it be simplified for the PDF version?
2. Should the totals block remain centered exactly as in HTML, or be right-aligned to match the other commercial templates more closely?
3. Should Crest use the existing shared `PdfAdvanceSummary` layout, or receive a Crest-specific advance presentation?
4. Do we want Cormorant Garamond added as a shared PDF font choice, or only used by Crest?
5. Is the HTML prototype the final brand reference, or should it be refreshed before implementation begins?

## 17. Final Recommendation

Proceed with Crest as a new React-PDF presentation template built on the existing Commercial Rendering Engine. Reuse all available behavior helpers unchanged, keep Crest presentation-only, and preserve the prototype’s editorial identity rather than adopting Industry’s spreadsheet language.

The implementation is feasible, but it should be approached as a faithful print-layout translation with PDF-safe substitutions, not as a direct HTML clone.
