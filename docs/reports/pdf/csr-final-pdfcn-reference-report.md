# CSR Final HTML Consolidation Report

This report was written by Qoder on 2026-10-28 via Qoder Desktop.

Skills used: design-artifact, pdf-rendering-correctness
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Objective

Produce one final, self-contained HTML Customer Service Report (CSR). The file is the reference input for a separate pdfcn rendering investigation. The visual direction of `Command.html` is preserved. No new design concept is introduced.

---

## 2. Deliverable

| File | Status | Size |
| :--- | :--- | ---: |
| `docs/templates/html-temps/CSR/csr-final-pdfcn-reference.html` | Added | 39,066 bytes |
| `docs/reports/pdf/csr-final-pdfcn-reference-report.md` | Added | This file |

The HTML contains all CSS in one `<style>` element. It has no scripts, no external fonts, no external images and no network requests. The only URI is the SVG namespace (`http://www.w3.org/2000/svg`), which is not fetched.

---

## 3. Assets

| Asset | Source | Use |
| :--- | :--- | :--- |
| Cummins logo | `docs/reports/pdf/poc/csr/samples/Cummins.txt` | Branding tile in the masthead only. Fill is `#000`; no fill override is applied. |
| Signature 1 | `docs/reports/pdf/poc/csr/samples/dal-sign.txt` | Service Engineer card. Labelled as illustrative artwork. |
| Signature 2 | `docs/reports/pdf/poc/csr/samples/elvis-sign.txt` | Client Representative card. Labelled as illustrative artwork. |
| `sel-sign.txt` | Not used | MD5 is `6a7b9e87bb7e29eab76e46ec348cf4fa`, identical to `Cummins.txt`. It is the logo, not a signature. |
| `john.txt` | Not used | John Deere logo, not a signature. |

All three assets are inlined as SVG. The source files are not modified.

---

## 4. Verification performed

The file was rendered with Playwright Chromium in print emulation (`preferCSSPageSize`, `printBackground`, zero margins). The resulting PDF was measured with mupdf 1.28.1 and rasterized.

| Check | Result |
| :--- | :--- |
| Page count | 1 |
| PDF page size | 594.96 × 841.92 pt = 209.89 × 297.01 mm (A4) |
| Sheet box | 210 × 297 mm |
| Content box | 190 × 279 mm (9 mm top/bottom, 10 mm left/right padding) |
| Horizontal overflow | None (scroll width equals client width) |
| Element overflow | 0 elements |
| Section overlap | 0 pairs |
| Raster margins (2× raster, 1190 × 1684) | about 9.9 mm left/right, 9.0 mm top, 9.5 mm bottom |
| Red pixels in raster | 0 |
| Logo | 1 instance, 9 × 9 mm, fill `rgb(0,0,0)`, parent is the brand mark only |
| Materials | 18 rows, 18 unique item numbers, 0 item errors |
| Group order | 01/05/09/13/17 · 02/06/10/14/18 · 03/07/11/15 · 04/08/12/16 |
| Defects | 6 of 6 |
| Label/value pairs | 22 of 22 pass the hierarchy check (value at least 1.15× label size and darker) |
| Signature stages | 17.5 mm high; sig-a 60 × 15.4 mm, sig-b 34.5 × 17.2 mm; no stage overflow |
| Text extraction | 5,185 characters; narratives, defects and remarks match `Command.html` |
| Required strings | All present |

These results apply to Chromium and mupdf only. The pdfcn renderer was not available and was not tested.

---

## 5. Requirements not fulfilled

1. **Signatory names and signing dates.** They were not supplied. Both cards show "Not supplied" and an `INCOMPLETE` flag. No approval or completed sign-off is asserted.
2. **Measured electrical values.** Output voltage, current, temperature and pressure were not supplied. The report asserts none. The rated block is labelled as nameplate/project data.
3. **pdfcn rendering.** Not tested. No claim is made about pdfcn pagination or fidelity.
4. **Physical print test.** Not performed.
5. **Screenshot record.** The screenshot shows a different record (SASCSR-000004, TATA International, NT-855-G6, 4 materials). It was not merged into the 18-item record.

---

## 6. Constraints respected

- No application code, application data or production PDF pipeline was modified.
- `bun run build` was skipped due to the hardware policy. No typecheck, lint or `audit:load` was run.
- No alternative design was produced.
- `git status` shows unrelated pre-existing changes. They were not touched.
