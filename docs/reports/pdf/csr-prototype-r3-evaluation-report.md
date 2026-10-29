# CSR Prototype Round 3 Evaluation Report

This report was written by Qoder on 2026-10-28 via Qoder Desktop.

Skills used: design-artifact, pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Objective

Create three new Customer Service Report (CSR) prototypes from scratch. Each prototype must fit on exactly one A4 page and must correct four defects of the rejected round:

1. The document used two pages.
2. The signatures were too small to read.
3. The Cummins logo changed from black to red.
4. The logo was used in a signature slot.

The three prototypes must have different layouts, information hierarchies, and compositions. They must not be repairs or extensions of the rejected layouts.

---

## 2. Scope

- **Prototype scope only.** The work adds three standalone HTML/CSS files and this report.
- **No production change.** No file in `src/`, no database schema, no migration, no route, and no runtime behaviour was changed.
- **Previous work preserved.** All earlier prototypes in `docs/reports/pdf/poc/csr/` remain unmodified, including `csr-concept-01.html` to `csr-concept-03.html`, the `round-2/` directory, and the rejected two-page files.
- **Hardware gate.** `bun run build`, `bun run typecheck`, `bun run lint`, and `bun run audit:load` were not executed.
- **Asset scope.** The five files in `samples/` were inspected. Two of them are not usable as signatures, and one of them is not the Cummins logo. Section 4 gives the evidence.

---

## 3. Files changed

| File | Status | Size |
| :--- | :--- | ---: |
| `docs/reports/pdf/poc/csr/csr-r3-branded-corporate.html` | Added | 34,219 bytes |
| `docs/reports/pdf/poc/csr/csr-r3-engineering-dossier.html` | Added | 38,160 bytes |
| `docs/reports/pdf/poc/csr/csr-r3-industrial-maintenance.html` | Added | 37,249 bytes |
| `docs/reports/pdf/csr-prototype-r3-evaluation-report.md` | Added | This file |

`git status` before and after the work has the same 17 modified or deleted tracked files and the same untracked paths. Those entries were present before this task started. This task added only the four files above.

---

## 4. Source asset inspection

All five assets were rendered to a contact sheet and measured before assignment. File names were not used as evidence.

| File | Bytes | Format | Visual identification | Colour and geometry evidence | Decision |
| :--- | ---: | :--- | :--- | :--- | :--- |
| `john.txt` | 4,095 | SVG, `viewBox="0 0 2500 480.8"`, aspect 5.200 | John Deere deer mark and "JOHN DEERE" wordmark | Three paths with explicit fills: `#2D7D2F` (2 paths) and `#FFDD00` (1 path). No black path. | **Excluded.** This is a John Deere logo, not a Cummins logo. |
| `Cummins.txt` | 1,861 | SVG, `viewBox="0 0 26.927 27"`, aspect 0.997 | Cummins "C" emblem with the white "Cummins" wordmark | One path. No `fill` attribute. Computed fill is `rgb(0, 0, 0)`. | **Logo.** This is the only logo asset. |
| `sel-sign.txt` | 1,861 | SVG, same `viewBox` as `Cummins.txt` | Same Cummins "C" emblem | MD5 `6a7b9e87bb7e29eab76e46ec348cf4fa`, identical to `Cummins.txt`. | **Excluded.** Byte-identical duplicate of the logo. It is not a signature. |
| `dal-sign.txt` | 6,685 | SVG, `viewBox="0 0 192.756 192.756"` | Handwritten signature | White canvas rectangle plus black paths. Ink bbox `x=8.503 y=76.109 w=175.749 h=40.538`. Ink aspect 4.335. | **Signature 1.** |
| `elvis-sign.txt` | 4,881 | SVG, `viewBox="0 0 192.756 192.756"` | Handwritten signature | White canvas rectangle plus black paths. Ink bbox `x=8.503 y=54.024 w=175.748 h=84.711`. Ink aspect 2.075. | **Signature 2.** |

Two genuine and distinct signatures are available. Therefore no prototype uses a logo in a signature slot, and no prototype shows an empty signature slot.

---

## 5. Asset mapping

| Slot | Asset | Label in the prototypes | Reason |
| :--- | :--- | :--- | :--- |
| Branding area | `Cummins.txt` | `Cummins logo` | Only logo asset in the set. |
| Signature 1 | `dal-sign.txt` | `Signature 1 · Client acceptance · illustrative` | Genuine signature. Ink aspect 4.335 suits a wide signature stage. |
| Signature 2 | `elvis-sign.txt` | `Signature 2 · Service release · illustrative` | Genuine signature. Ink aspect 2.075 suits a taller signature stage. |

The slots use neutral labels. The prototypes do not state a real name, a real approval, or a real sign-off. Each signature block has a caption that says it is an illustrative prototype asset.

---

## 6. Logo colour control

**Cause of the red logo in the rejected round.** The rejected file `csr-branded-corporate-report.html` has this rule at line 79:

```css
.logo-container svg { ... fill: var(--cummins-red); }
```

The Cummins path has no `fill` attribute. The CSS `fill` value therefore inherited into the path and changed the black emblem to red.

**Control in the new prototypes.**

- No `fill` or `stroke` CSS declaration exists in any new file (checked: 0 matches per file).
- The prototypes contain no `filter`, `opacity`, or `mix-blend-mode` rule.
- All SVG colour comes from the source attributes. The logo path has no `fill` attribute, so it renders in the SVG default black.
- Measured computed fill of the logo path: `rgb(0, 0, 0)` in all three files.
- Raster audit of every rendered page: 0 red-like pixels and 0 strong-red pixels (sample interval 2 px at 2x zoom).

**Build defect found and corrected during verification.** The first build removed the logo `viewBox` attribute and did not add it back. The logo then rendered at 1 SVG unit = 1 CSS pixel, so the mark was clipped. The builder now keeps `viewBox="0 0 26.927 27"`. All PDFs in this report come from the corrected build.

---

## 7. Single-page layout results

Each `.sheet` declares `width: 210mm; min-height: 297mm`, and each file declares `@page { size: A4; margin: 0 }`. No file uses `overflow: hidden` or fixed element heights. Content length, not clipping, controls the page.

| Template | Declared sheet | Content extent (top to bottom) | Overlap pairs | Horizontal overflow | Red fills |
| :--- | :--- | :--- | ---: | ---: | ---: |
| Branded Corporate | 210.00 × 297.00 mm | 9.0 mm to 290.5 mm | 0 | 0 px | 0 |
| Engineering Dossier | 210.00 × 297.00 mm | 4.5 mm to 292.5 mm | 0 | 0 px | 0 |
| Industrial Maintenance | 210.00 × 297.00 mm | 0.0 mm to 288.5 mm | 0 | 0 px | 0 |

The overlap test compared every major block pair and ignored parent/child pairs. The horizontal overflow test compared `scrollWidth` with `clientWidth`.

---

## 8. Rendering method and PDF measurements

**Method.** The files were served from a local static server at `http://127.0.0.1:8799/`. Each page was printed with Playwright 1.63.0 (Chromium) and these options: print media emulation, `preferCSSPageSize: true`, `printBackground: true`, margin 0. Each page was rasterized with mupdf 1.28.1 (wasm). Page count and media box came from mupdf `page.getBounds()`. Text came from mupdf `toStructuredText()`.

| Template | Pages | Media box | Millimetres |
| :--- | ---: | :--- | :--- |
| Branded Corporate | 1 | 594.96 × 841.92 pt | 209.89 × 297.01 mm |
| Engineering Dossier | 1 | 594.96 × 841.92 pt | 209.89 × 297.01 mm |
| Industrial Maintenance | 1 | 594.96 × 841.92 pt | 209.89 × 297.01 mm |

**Note on the width.** Chromium converts 210 mm to 793.28 CSS px at 96 dpi. The PDF media box is therefore 0.11 mm narrower than nominal A4. The trim removes only sheet background. The smallest margin between content and a sheet edge is 7.6 mm, at the dossier logo. The industrial logo ends 13.8 mm from the right edge. All inspection images show complete borders and complete background bands.

---

## 9. Content verification at PDF level

Text was extracted from the PDF, not from the HTML. Whitespace was normalized. Hyphenated line breaks were joined, because the dossier wraps `auto-synchronization` as `auto-` plus `synchronization`.

| Check | Branded Corporate | Engineering Dossier | Industrial Maintenance |
| :--- | :---: | :---: | :---: |
| 18 material lines present | 18/18 | 18/18 | 18/18 |
| Quantity and unit adjacent to each line | 18/18 | 18/18 | 18/18 |
| Line numbering in ascending order | 01 to 18 | 01 to 18, read down each column | 01 to 18 |
| Problem reported, verbatim | Pass | Pass | Pass |
| Service rendered, verbatim (823 characters) | Pass | Pass | Pass |
| Defects found, verbatim (412 characters) | Pass | Pass | Pass |
| Engineer remarks, verbatim (528 characters) | Pass | Pass | Pass |
| Six telemetry readings | 6/6 | 6/6 | 6/6 |
| Client name and address | Pass | Pass | Pass |
| Service dates 2026-10-12 to 2026-10-24 | Pass | Pass | Pass |
| Equipment fields (make, model, serial, engine, capacity, class) | 6/6 | 6/6 | 6/6 |

The dossier materials schedule uses three columns of six lines: 01 to 06, 07 to 12, and 13 to 18. The column numbers make the order explicit.

---

## 10. Visual inspection

Every PDF page was rasterized at 2x (1190 × 1684 px) and at 1.2x (714 × 1011 px). The 1.2x image is approximately normal viewer size. Each page was inspected.

**Branded Corporate.**

- The logo is black and sits at the top left of the masthead. It has no other position.
- Signature 1 is 84.0 × 21.5 mm. Signature 2 is 54.0 × 26.9 mm. Both are legible at normal size and on print.
- Two narrative columns, a six-cell reading band, and a two-column materials table are complete. No text touches a border.
- The header band states that the document is a prototype with synthetic demonstration data and illustrative signature artwork.

**Engineering Dossier.**

- The logo is black and sits in the title-block cell at the top left.
- Signature 1 is 78.0 × 20.0 mm. Signature 2 is 55.0 × 27.4 mm.
- The six readings are in a bordered measurement table. The four clauses are numbered §01 to §04. The materials schedule is 3 × 6.
- The left rail has intentional empty space below the provenance block. This is a design choice, not a rendering fault.

**Industrial Maintenance.**

- The logo is black and sits in a white plate at the top right of the placard.
- Signature 1 is 80.0 × 20.5 mm. Signature 2 is 54.0 × 26.9 mm.
- Four field notes, six instrument readings, a machine card, a two-column ledger with 18 ticked lines, and a completion band are complete.
- The location line in the dispatch strip breaks after `Central Utility Plant`, so the second line reads `Powerhouse Bay 2`.

No page shows missing text, overlapping text, or a clipped border.

---

## 11. Synthetic values and source values

The heavy-load generator fixture supplies the equipment data, the six readings, the four narratives, the service dates, the 18 materials, and the company branding. The fixture leaves the client identity, the address, the document number, the PO number, and the acknowledgement fields empty.

The prototypes add these demonstration values, and each file labels them as synthetic:

| Field | Value in the prototypes | Status |
| :--- | :--- | :--- |
| Client | `11PLC (formerly Mobil Oil Nig. Plc)` | Synthetic demonstration value |
| Address | `1 Mobil Rd, Apapa, Lagos 102272, Lagos` | Synthetic demonstration value |
| Document numbers | `CSR-PROTO-01`, `CSR-PROTO-02`, `CSR-PROTO-03` | Prototype identifiers |
| Service scope, client side | `Major scheduled generator overhaul` | Derived from the fixture narratives |
| Signatures | `dal-sign.txt`, `elvis-sign.txt` | Illustrative artwork |

Branding, equipment, readings, narratives, dates, and materials are fixture values. Each template carries an explicit prototype and synthetic-data statement.

---

## 12. Verification result

```
Verification:
- bun run audit:load: skipped (prototype-only task)
- bun run typecheck: skipped (prototype-only task)
- bun run lint: skipped (prototype-only task)
- bun run build: skipped due to hardware policy
- PDF render: passed (3 of 3 files, one A4 page each)
- PDF media box: passed (594.96 x 841.92 pt for all pages)
- PDF text audit: passed (18 of 18 materials, 4 of 4 narratives, 6 of 6 readings, client, dates, equipment)
- DOM geometry audit: passed (0 overlaps, 0 horizontal overflow, 0 red fills)
- Raster colour audit: passed (0 red-like pixels per page)
- Visual page inspection: passed (3 pages at 2x and 1.2x)
- git status: same pre-existing tracked changes; 3 new HTML files and 1 new report
- supabase db push: not applicable
```

---

## 13. Supabase push status

Not applicable. This task did not change SQL, a migration, or a database schema.

---

## 14. Risks and limitations

1. **Illustrative signatures.** The two signatures are supplied artwork. They do not represent a real person, a real approval, or a real sign-off. The captions state this.
2. **Synthetic client data.** The client name, address, and document numbers are demonstration values. Do not use them as a service record.
3. **Page width.** The PDF media box is 209.89 mm wide, 0.11 mm below nominal A4, because of Chromium pixel quantization. The height is 297.01 mm. All content stays inside the visible area.
4. **Physical print not tested.** Legibility was checked on raster images at normal viewing size, not on paper.
5. **System fonts.** The prototypes use Arial Narrow, Arial, Georgia, and Courier New. A host without these fonts will substitute them, and text metrics can change.
6. **One rasterizer.** All PDFs come from Chromium. Firefox and WebKit were not tested.
7. **Working artifacts.** The PDFs, PNG files, and build scripts are in `%TEMP%\csr-r3\`. They are not committed to the repository.
8. **Dossier rail.** The left rail has approximately 35 mm of empty space below the provenance block.

---

## 15. Deferred work

- Production integration of any template is not started. These files are standalone prototypes.
- No automated regression test covers the prototype layouts.
- Font embedding is not implemented.
- Physical A4 print calibration is not performed.
- A design review decision on the preferred template is pending.
