# Design Review: HTML Commercial Document Templates (`inv101.html` vs `inv102.html`)

**Review Type:** Read-Only Visual Inspection, Typographic Audit & Comparative Architecture Assessment  
**Target Files:**  
- Candidate A (DeepSeek): [`docs/templates/html-temps/invoice-templates/inv101.html`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/templates/html-temps/invoice-templates/inv101.html)  
- Candidate B (Claude): [`docs/templates/html-temps/invoice-templates/inv102.html`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/templates/html-temps/invoice-templates/inv102.html)  
**Author:** AI Architecture & Design Systems Review  
**Date:** October 30, 2026  
**Status:** Complete & Approved for Implementation Guidance  

---

## 1. Executive Summary

A thorough, read-only design audit was conducted on two HTML invoice candidate templates created by different AI design runs. Both candidates attempt to implement an A4 portrait commercial document using the approved portrait primary theme colour (`#7D8A88`, Muted Sage / Slate Green).

### Primary Findings
1. **Both templates fail the colour mandate:** Both designs feel washed out, monochromatic, and grey-on-white. Candidate A (`inv101`) surrounds `#7D8A88` with cold Tailwind slates (`#1C2624`, `#64748B`, `#E2E8F0`). Candidate B (`inv102`) builds an all-sage monochromatic scale (`--sage`, `--sage-d`, `--sage-dd`, `--tint`, `--mute`) while defining a warm accent (`--clay: #A65A42`) in CSS but completely omitting it from active DOM components.
2. **Both templates critically fail product grouping:** Neither template achieves a clear visual distinction between grouped items and standalone items. `inv101` merely places an isolated 4px green border on the `#` cell of child rows without enclosing the row content or table right edge. `inv102` provides a group header with subtotal, but renders child rows with zero visual distinction or containment, making it impossible to see where a group ends and a standalone row begins.
3. **Typographic hierarchy is superior in `inv102`:** Candidate B establishes a disciplined three-tier hierarchy (`Product Name` $\to$ `Brand / Model / Make` $\to$ `Technical Specs & Notes`), whereas Candidate A clutters its description column by embedding artificial 10mm vector icons on every row.
4. **Candidate B's signature section is outstanding:** Claude's signature block in `inv102` is realistic, commercially authentic, and properly addresses Nigerian B2B delivery/acknowledgement practices (dual-actor symmetry, clear boundary box for handwritten client receiving signature, and a circular company seal stamp).
5. **Print-rendering trap in `inv102`:** Candidate B relies on CSS Paged Media `@page` margin boxes (`@top-left`, `@bottom-left`, etc.) for its running header and footer. **Blink and WebKit browsers (Google Chrome, Microsoft Edge, Safari) completely ignore CSS margin-box rules during `window.print()`**. As a result, when printed or viewed in standard browsers, `inv102` loses its running header, confidentiality notices, and page numbers entirely.

**Verdict:** **Candidate B (`inv102.html`) is significantly the stronger structural foundation.** However, it requires a deliberate three-colour palette injection, complete re-engineering of the group enclosure container, and a browser-compatible running header/footer fallback.

---

## 2. Deep-Dive on Specific Design Concerns

### A. Colour Palette & The Three-Colour Visual System

#### The Flaw in Existing Attempts
- **`inv101.html`:** Uses `#7D8A88` on table headers, buttons, and top border accents; uses `#5C6B68` for the document badge; and fills everything else with cold grey text (`#1C2624`, `#64748B`) on plain white. It lacks depth and warmth, resulting in a sterile, clinical document.
- **`inv102.html`:** Relies entirely on tints and shades of sage:
  ```css
  --sage: #7D8A88;    /* Base Sage */
  --sage-d: #4F5C5A;  /* Dark Sage */
  --sage-dd: #2F3A39; /* Deep Slate Sage */
  --tint: #EEF1F0;    /* Sage Wash */
  --tint2: #E2E7E6;   /* Table Header Tint */
  --mute: #5E6967;    /* Slate Mute */
  ```
  While harmonious, it creates a "sea of green-grey" with low visual energy. The designer defined `--clay: #A65A42;` in the stylesheet, but never applied it to any HTML elements.

#### Recommended Three-Colour Visual System
To maintain executive authority and ensure clear visual hierarchy without altering the approved portrait primary `#7D8A88`, the document must use a purposeful triadic colour distribution:

| Role | Colour Name | Hex Code | Visual Surface % | Applied Components |
| :--- | :--- | :--- | :---: | :--- |
| **Colour 1 (Approved Primary)** | **Muted Sage Green** | `#7D8A88` | **60%** (Framework) | Table column headers, group container borders, section dividing rules, table boundaries, bank card left border, stamp ring outline. |
| **Colour 2 (Deep Anchor / Authority)** | **Deep Slate Pine** | `#1C2624` or `#232B2A` | **30%** (Text & Weight) | Legal company name, document title (`INVOICE`), grand total callout block, document ID badge, table amounts, primary headings. |
| **Colour 3 (Recommended Warm Accent)** | **Warm Terracotta / Cognac** | `#A85A3B` *(or `#B45309`)* | **10%** (Signal & Highlights) | Group index badges (`GROUP 01`), "Due Date" / "Urgent" pill, subtotal discount callouts, client signature boundary accent, quotation acceptance tags. |

#### Why Warm Terracotta (`#A85A3B`) Works
`#7D8A88` sits in the cool, desaturated slate-green spectrum ($172^\circ$ hue). A cool sage combined with charcoal ink produces a low-contrast document where important signals blend into the background. Introducing a warm, earthy terracotta creates an architectural, high-end pairing (similar to aged copper and weathered brick, or sage upholstery with cognac leather). It immediately draws the eye to operational anchors—group parent headers, critical payment dates, and approval areas—without looking gaudy or decorative.

---

### B. Groups versus Standalone Items (The Grouping Failure)

The grouping presentation in both templates is their most severe functional failure.

#### How `inv101` Fails
1. **Unilateral Left Border:** Group children only receive a 4px green border on `td.col-num`:
   ```css
   .group-item td.col-num { border-left: 4px solid var(--primary) !important; }
   ```
2. **Missing Right Closure:** Columns 2 through 6 (Description, Qty, Unit, Price, Amount) have no border changes. When an accountant or procurement officer scans down the right side of the page, grouped items look indistinguishable from standalone items.
3. **No Group Total:** There is no group subtotal row. The group ends with an arbitrary `border-bottom: 2px solid var(--primary)` on the last item, which is visually lost.

#### How `inv102` Fails
1. **Orphan Header Bar:** `inv102` introduces a solid green header bar:
   ```html
   <tr class="grp">
     <td colspan="4"><span class="gt">Electrical — Power Cables & Distribution</span></td>
     <td colspan="2" class="gs">Group subtotal &nbsp;<b>₦ 57,108,000.00</b></td>
   </tr>
   ```
2. **Complete Abandonment of Child Rows:** The child rows following this header have **zero special styling**. They use the exact same white/subtle-tint backgrounds, borders, and column alignments as standalone rows.
3. **Boundary Ambiguity:** When a group ends and a standalone item appears immediately below it (e.g., Item 14 after Group 2), there is no closing line, no margin, and no visual barrier. The reader cannot tell if Item 14 is part of Group 2 or standalone.

#### The Required Solution: Excel-Style Logic with Premium Commercial Design
To achieve true group clarity, grouped items must form a **visible perimeter container**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [GROUP 01]  ELECTRICAL — POWER CABLES & DISTRIBUTION   Subtotal: ₦ 57,108,000│ ◄── Parent Header (Tint fill + Terracotta badge)
├──────┬──────────────────────────────────┬─────┬──────┬────────────┬──────────┤
│ 1.1  │ Armoured power cable 4-core 95mm²│1,500│  m   │  28,400.00 │42,600,000│ ◄── Enclosed Child Rows
│ 1.2  │ Main LV distribution board, 800A │   6 │ pcs  │1,850,000.00│11,100,000│     (Continuous left/right borders,
│ 1.3  │ MCCB 3-pole 250A, 36kA           │  24 │ pcs  │  142,000.00│ 3,408,000│      subtle tinted background)
└──────┴──────────────────────────────────┴─────┴──────┴────────────┴──────────┘ ◄── Bottom Closure Bar
                                                                                 ◄── Distinct 4mm Breathing Gap
┌──────┬──────────────────────────────────┬─────┬──────┬────────────┬──────────┐
│  4   │ Standalone Item (e.g. Centrifugal│   4 │ sets │1,420,000.00│ 5,680,000│ ◄── Standalone Row (Independent,
│      │ end-suction pump set)            │     │      │            │          │     no group container, white bg)
└──────┴──────────────────────────────────┴─────┴──────┴────────────┴──────────┘
```

1. **Continuous Perimeter Enclosure:** The group header, all child rows, and the group closing border must share a continuous outer bounding border (`1.5px solid #7D8A88`).
2. **Distinct Parent Header:**
   - Background fill: 15% tint of Sage (`#F0F4F2`).
   - Category badge: `#A85A3B` (Terracotta) uppercase chip (`GROUP 01`).
   - Group subtotal right-aligned in bold deep ink (`#1C2624`).
3. **Hierarchical Child Numbering & Inset:**
   - Child numbers formatted as `1.1`, `1.2`, `1.3` (or nested under the parent group index).
   - Entire child block given a subtle background tint (`#FAFBFA`) and indented left description padding.
4. **Standalone Visual Independence:**
   - Standalone rows have standard integer numbers (`1`, `2`, `3`).
   - Sit directly on the document surface with neutral borders and no group containers.
   - Separated from preceding/following group containers by a deliberate vertical margin ($3\text{--}4\text{ mm}$).

---

### C. Main Descriptions versus Sub-Descriptions

#### Evaluation of `inv101`
- **Strengths:** Explicit font size difference (`.main-desc` at 9pt bold vs `.sub-desc` at 7.5pt muted).
- **Weaknesses:** Includes an arbitrary 10mm inline SVG icon (`.thumb-wrap`) beneath every item's sub-description. In a 26-item engineering invoice, placing generic drawings of bricks, fans, and pipes on every line wastes vertical space, inflates document length, and makes the document look like a software prototype rather than a real B2B document.

#### Evaluation of `inv102`
- **Strengths:** Implements a sophisticated three-level typography stack:
  1. **Primary Item Title (`.nm`):** Bold 8.6pt/1.3 in `--ink` (`#23292A`), clear and prominent.
  2. **Make / Standard (`.mk`):** 7.6pt in `--sage-d` (`#4F5C5A`), establishing manufacturer and standard compliance (e.g. `S275JR — EN 10025`, `0.6/1 kV — BS 5467`).
  3. **Technical Specs & Tolerances (`.sp`):** 7.4pt in `--mute` (`#5E6967`), supporting formatted delivery terms, tolerances, and sub-bullets.
  4. **Side-Aligned Thumbnails (`.dw`):** Thumbnails are optional and aligned to the left of the text in a flex container (`.dw`), preserving baseline alignment without vertical distortion.

**Verdict:** `inv102` provides the correct hierarchy. It accommodates complex industrial specifications without cluttering the page.

---

### D. Signature Section: Why Claude's `inv102` Excels

The user noted a preference for Claude's signature section in `inv102.html`. A forensic examination reveals why this component is so effective:

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ ISSUER AUTHORISED SIGNATORY                   │ CLIENT RECEIVING / CONFIRMATION ACKNOWLEDGEMENT│
│ ┌───────────────────────────────────────────┐ │ ┌ - - - - - - - - - - - - - - - - - - - - - ┐ │
│ │  [Realistic Vector Signature]             │ │ │ Handwritten signature —                   │ │
│ │                                  ╭─────╮  │ │ │ sign inside this area                     │ │
│ │                                  │STAMP│  │ │ │                                           │ │
│ └──────────────────────────────────╰─────╯──┘ │ └ - - - - - - - - - - - - - - - - - - - - - ┘ │
│ Mr. Chukwuemeka Daniels                       │ Received by (name): __________________________│
│ Authorised Signatory — Kestrel Industrial     │ Designation: _________________ Date: _________│
│ Date: ____________________                    │                                               │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

1. **Dual-Party Legal Symmetry:** Real Nigerian SME transactions require two signatures on an invoice or delivery note: the issuing company's sign-off and the client's receiving acknowledgment upon site offloading. `inv102` structures these into balanced, equal-width columns.
2. **Explicit Client Bounding Box (`.area.blank`):** Rather than a fragile floating line, the client signature area is enclosed in a dashed box with subtle instructional text: *"Handwritten signature — sign inside this area"*. This prevents receiving officers from scribbling over totals or metadata.
3. **Official Seal / Stamp Anchor (`.stamp`):** The circular dashed stamp area ($22\text{ mm} \times 22\text{ mm}$) accommodates physical company seals, which are legally required for contract validation across Nigerian enterprise clients.
4. **Complete Metadata Baseline:** Includes clear sign-off labels (`Received by (name)`, `Designation`, `Date`) formatted with clean baseline rules (`.ln`), providing a balanced finish to the document.

**Verdict:** Retain this exact signature architecture. For the three-colour palette, render the client signing boundary in Terracotta (`#A85A3B` dashed) and the issuer stamp ring in Sage (`#7D8A88`).

---

## 3. Comprehensive Comparison Matrix

| Design Area | Candidate A (`inv101.html` - DeepSeek) | Candidate B (`inv102.html` - Claude) | Better Approach & Recommendations |
| :--- | :--- | :--- | :--- |
| **Colour System** | Monochromatic green-grey with generic Tailwind slates (`#1C2624`, `#64748B`, `#E2E8F0`). Flat and cold. | Monochromatic sage palette (`--sage`, `--sage-d`, `--sage-dd`). Declares `--clay: #A65A42` but omits it from markup. | **Adopt a 3-Colour Palette:** Retain `#7D8A88` (Primary Framework), `#1C2624` (Authority / Dark Ink), and activate `#A85A3B` (Terracotta Accent). |
| **Header Layout** | Heavy dark green badge on right; logo and text on left. Boxy and disconnected. | Refined typographic layout; logo left, uppercase tracked title right; elegant double rule below. | **`inv102` is vastly superior.** Modern, clean, and well-balanced. |
| **Document Identity** | Uses solid dark badge with white text. Takes excessive vertical space. | Clean 20pt tracked title (`INVOICE`) with dark monospace ID badge (`INV-2026-0147`). | **`inv102` is cleaner.** Gives the document an executive, authoritative appearance. |
| **Item Table Layout** | Heavy solid green table headers with white text. High visual weight. | Muted tint header (`--tint2`) with thin double rule. Light, legible, and airy. | **`inv102` is more refined.** Keeps focus on the line items rather than a heavy header banner. |
| **Group Presentation** | 4px green left border on `#` column only. No right border, no enclosure, no group subtotal. | Solid green header bar with group subtotal, but zero child row containment or separation. | **Neither succeeds.** Must build an enclosed perimeter container with parent badge and distinct child styling. |
| **Standalone Rows** | Alternate zebra striping (`#F8FAFC`). Indistinguishable from grouped rows. | Flat rows with alternate `#FAFBFA` tint. Blends into grouped rows due to lack of group borders. | **`inv102` row styling is cleaner**, but standalone rows must sit outside group containers with clear separation. |
| **Description Hierarchy** | Two levels (title + desc), but cluttered by artificial 10mm inline vector icons on every row. | Three levels: Product Name (bold) $\to$ Make/Standard $\to$ Technical Specs. Flex-aligned thumbnails. | **`inv102` is vastly superior.** Perfectly structured for complex engineering and procurement items. |
| **Signature Section** | Generic floating line with underline placeholders. Looks like a web form. | Structured dual-actor block: vector issuer signature, circular stamp placeholder, and dashed client receiving box. | **`inv102` is outstanding.** Retain this exact structural design. |
| **Financial Summary** | Left bank card, right totals block. Amount in words is small italic text below totals. | Left boxed bank details, right totals table with high-contrast grand total bar and highlighted words card. | **`inv102` is stronger.** The dedicated left-bordered "Total in Words" card is legally clear and prominent. |
| **Footer & Pagination** | Fixed position footer with page counter. Visible in screen preview. | Advanced `@page` margin boxes (`@top-left`, `@bottom-left`). Broken in browser print! | **Hybrid Required:** Use `inv102` footer content, but implement browser-compatible fixed layout for HTML preview. |
| **Document Modes** | Only supports Invoice and PO (Quotation is missing!). | Supports all three: Invoice, Quotation, and Purchase Order with rich data sets. | **`inv102` is complete.** Directly reflects the unified document descriptor architecture. |
| **Overall Visual Quality** | Functional but amateurish; feels like a software mockup with excessive icons. | High-end executive engineering aesthetic; feels like an authoritative enterprise transaction. | **`inv102` is the clear winner.** |

---

## 4. Key Strategic Questions Answered

### 1. Which template is the stronger foundation, and why?
**`inv102.html` (Candidate B) is decisively the stronger foundation.**
- **Architecture:** It provides a unified data structure supporting all three commercial documents (`inv`, `quo`, `po`) with realistic commercial terminology and calculations (WHT deductions, VAT, CAC registrations, multi-account banking).
- **Typography:** Its three-tier description hierarchy (`Name` $\to$ `Make/Standard` $\to$ `Specifications`) handles real-world B2B engineering specifications with complete clarity.
- **Header & Signatures:** Both the executive header and the authorization signature sections represent finished, production-grade commercial design.

### 2. Which specific elements should be retained from each?
- **From `inv102.html` (Retain):**
  - The entire header structure (company identity, tracked title, monospace ID pill, double rule).
  - The 4-column key-value metadata strip (`.kv.c4`) and optional 3-column project strip (`.kv.c3.cust`).
  - The three-tier line item typographic hierarchy (`.nm`, `.mk`, `.sp`).
  - The financial summary layout and the bordered "Total in words" card.
  - The complete signature and authorization section (dual actors, stamp circle, dashed receiving box).
- **From `inv101.html` (Retain):**
  - The concept of a continuous vertical rail on child line items (refined into a full perimeter box).
  - The robust browser-compatible print footer fallback structure.

### 3. What should be discarded from both?
- **Discard from `inv101`:**
  - The heavy dark green document badge block.
  - The 10mm inline SVG product icons under every single line item.
  - The floating, uncontained signature lines.
  - The incomplete two-mode codebase (missing Quotation).
- **Discard from `inv102`:**
  - The monochromatic grey-sage color scheme (activate the 3-colour palette).
  - The uncontained child row presentation in groups.
  - The sole reliance on CSS Paged Media `@page` margin boxes for headers/footers in browser preview.

### 4. What exact design changes would produce the required result?
1. **Apply the Three-Colour Palette:**
   - Framework / Borders / Headers: `#7D8A88` (Sage).
   - High Authority / Headings / Total Bar: `#1C2624` (Deep Charcoal Pine).
   - Signal Accents / Badges / Alerts: `#A85A3B` (Warm Terracotta).
2. **Re-engineer the Group Container:**
   - Wrap every group in an enclosed perimeter container (`border: 1.5px solid #7D8A88; border-radius: 4px; overflow: hidden;`).
   - Group header gets a subtle sage tint background (`#F0F4F2`), a terracotta category chip (`GROUP 01`), and bold group subtotal.
   - Child rows get indented descriptions and a continuous left border rail.
   - Insert $3\text{--}4\text{ mm}$ spacing between closed groups and standalone rows.
3. **Make Browser Printing Compatible:**
   - Retain `@page { size: A4 portrait; margin: 15mm; }` but implement an in-flow or fixed-position running footer so headers and footers appear when printed via standard browsers.

### 5. Are there any structural or print-rendering problems that make either design unsuitable?
- **Yes, a major print flaw exists in `inv102.html`:** It places all running headers and footers inside `@page { @top-left { ... } @bottom-left { ... } }`. **Chromium (Chrome, Edge) does not support CSS margin-box rules**. Printing `inv102.html` from a browser results in blank header/footer margins.
- **How to resolve:** When migrating to Forme (`@formepdf/react`), Forme handles headers and footers natively via page components. For the HTML reference template, standard fixed/in-flow HTML footers must be provided as fallbacks.

---

## 5. Architectural Recommendation & Action Plan

To establish the definitive reference template before Milestone M1/M2 implementation in Forme:

1. **Use `inv102.html` as the Base Architecture.**
2. **Refactor the Color System:** Inject the 3-colour triad (`#7D8A88` Sage, `#1C2624` Charcoal, `#A85A3B` Terracotta).
3. **Rebuild the Table Engine:** Implement distinct enclosed perimeter containers for product groups while keeping standalone rows independent.
4. **Preserve Claude's Signature Section:** Maintain the exact layout, updating accents to the three-colour palette.
5. **Fix Print Layout:** Ensure the template prints cleanly to A4 in both native browser print and headless PDF generators.
