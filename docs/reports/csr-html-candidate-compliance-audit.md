# BOUXRE CSR — Candidate Design Compliance Audit

This report was written by Antigravity on 2026-10-28 via Antigravity Desktop.

Skills used: pdf-rendering-correctness, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive Verdict

| Candidate | Target Geometry | Compliance Status | Verdict |
| :--- | :--- | :--- | :--- |
| **Landscape — Blueprint / Technical Drawing**<br>`docs/templates/html-temps/CSR/csr-blueprint-technical-drawinglandscape.html` | A4 Landscape<br>(297 × 210 mm) | Non-compliant across 5 core standards | **NOT READY** |
| **Portrait — Final PDFCN Reference**<br>`docs/templates/html-temps/CSR/csr-final-pdfcn-reference.html` | A4 Portrait<br>(210 × 297 mm) | Compliant with materials and layout; missing readings | **CONDITIONALLY READY** |

### Summary Assessment

- **Landscape Blueprint is NOT READY.** The design fabricates multi-channel telemetry readings (three temperature channels and three pressure channels) that the application CSR form cannot collect. It violates the required vertical group enumeration for materials (using sequential columns 01–05 instead of the required interleaved pattern 01, 05, 09, 13, 17). It mislabels the equipment location, omits technician and client signatory identity fields, and enforces single-page constraints via CSS `overflow: hidden`, which silently clips overflow content.
- **Portrait Final PDFCN Reference is CONDITIONALLY READY.** The design demonstrates print discipline, single-page geometry verification (Chromium/mupdf), and exact adherence to the 18-item vertical materials schedule. However, it completely omits the measured operational readings strip, reclassifying electrical values as nameplate ratings and asserting that no measured readings were supplied. It also uses the label `Equipment Location` instead of the approved `Site / Equipment Location`. It can proceed to implementation only after re-incorporating the 6-parameter operational readings strip and updating the location label.

---

## 2. Sources Inspected

The following repository sources were inspected during this investigation:

### 1. Candidate HTML Files
- `docs/templates/html-temps/CSR/csr-blueprint-technical-drawinglandscape.html` (1,120 lines, A4 landscape technical drawing concept).
- `docs/templates/html-temps/CSR/csr-final-pdfcn-reference.html` (867 lines, A4 portrait consolidated reference concept).

### 2. Live CSR Template Reference
- `docs/reports/pdf/poc/csr/samples/Screenshot_2026-10-27-05-20-00-065_com.google.android.apps.nbu.files-edit.jpg` (Confirmed present and inspected: Sun & Shield Power Solutions, Cummins NT-855-G6, record SASCSR-000004, matching the default production Industry template layout).
- Companion references inspected for completeness:
  - `docs/reports/pdf/poc/csr/samples/Screenshot_2026-10-27-05-19-40-739_com.google.android.apps.docs-edit.jpg` (Minimal template).
  - `docs/reports/pdf/poc/csr/samples/Screenshot_2026-10-27-05-20-22-481_com.google.android.apps.nbu.files-edit.jpg` (Zinc template).

### 3. Application Implementation & Domain Models
- `src/components/csr/CsrFormScreen.tsx` (Form UI presentation, field inputs, validation, tabs, materials table, signature sheets).
- `src/pages/CsrFormPage.tsx` (Form controller, state lifecycle, prefill, offline draft handling).
- `src/components/csr/csrUtils.ts` (Data structures, serialization, default values, density calculation).
- `src/domain/csr/csrRenderModel.ts` (Render model transformation, call type formatting, system status resolution).
- `src/pages/ViewCSR.tsx` (Document viewer and PDF export orchestration).

### 4. Authoritative Historical Audit Reports
- `docs/templates/html-temps/CSR/Command.html` (Baseline visual source for the 18 materials and narrative text).
- `docs/reports/pdf/csr-final-pdfcn-reference-report.md` (Chromium and mupdf measurement audit).
- `docs/reports/pdf/csr-prototype-r3-evaluation-report.md` (Asset measurement and single-page constraints).
- `docs/reports/pdf/csr-production-template-compactness-audit.md` (Production template compactness audit).

---

## 3. Actual CSR Form Compatibility Matrix

The application CSR form collects data through `CsrFormScreen.tsx` into the `CsrObject` data model (`csrUtils.ts`). Equipment type is a free-text input and does not dynamically modify the form fields or readings.

| Material Field | Form Source / State | Blueprint Candidate | Portrait PDFCN Candidate | Compatibility Classification |
| :--- | :--- | :--- | :--- | :--- |
| **CSR / Report Number** | `csr.csr_number` | Displayed as `CSR-QSV91G-25381944` | Displayed as `CSR-PROTO-01` | **Supported** |
| **Report Date** | `csr.date` | Displayed in header window stamp | Displayed in masthead reference | **Supported** |
| **P.O. Number** | `csr.po_number`, `csr.show_po` | Omitted | Omitted | **Supported** (Optional field) |
| **Call Type** | `csr.call_type` | Omitted | Omitted | **Supported** in form; omitted by candidates |
| **Service Basis** | `csr.service_basis` | Omitted | Omitted | **Supported** in form; omitted by candidates |
| **System Down Status** | `csr.system_down` | Replaced by `BASELOAD (11kV SYNC)` | Displayed as `Initial state: Down` | **Supported** (Partially mapped) |
| **Client Name** | `csr.client_name` | `11PLC (formerly Mobil Oil Nig. Plc)` | `11PLC (formerly Mobil Oil Nig. Plc)` | **Supported** |
| **Client Corporate Address** | `csr.address` | `1 Mobil Rd, Apapa, Lagos...` | `1 Mobil Rd, Apapa, Lagos...` | **Supported** |
| **Equipment Type** | `csr.equipment_type` | `Lean Burn Natural Gas Generator Set` | `Lean Burn Natural Gas Generator Set` | **Supported** (Plain text in form) |
| **Make** | `csr.make` | `Cummins` | `Cummins` (in Manufacturer & model) | **Supported** |
| **Model** | `csr.model` | `QSV91G` | `QSV91G` | **Supported** |
| **Serial Number** | `csr.serial_no` | `25381944` | `25381944` | **Supported** |
| **Engine Number** | `csr.engine_no` | `91G-ENG-08421` | `91G-ENG-08421` | **Supported** |
| **Capacity** | `csr.capacity` | `2000 kW (2.0 MW)` | `2000 kW (2.0 MW)` | **Supported** |
| **Site / Equipment Location** | `csr.equipment_location` | Mislabeled: `Physical Equipment Location` | Mislabeled: `Equipment Location` | **Supported** in form; mislabeled by both |
| **Operating Hours** | `csr.hours` | `30142.6 hrs` (Header & Nameplate) | `30,142.6 h` (Service window block) | **Supported** |
| **Voltage (Measured)** | `csr.voltage` | Mislabeled: `11000 V` on nameplate | Converted to Rated Spec (`11,000 V`) | **Missing from form** (as rated) / Misapplied |
| **Frequency (Measured)** | `csr.frequency` | `50 Hz` on nameplate | Converted to Rated Spec (`50 Hz`) | **Supported** in form; placed on nameplate |
| **Charging Alternator / Battery**| `csr.battery` | `24 VDC (4x 12V 200Ah AGM...)` | Converted to Rated Spec (`24 VDC...`) | **Supported** (Form supports text input) |
| **Temperature (Measured)** | `csr.temperature` (1 field) | Fabricated 3 channels (88°C, 52°C, 510°C) | Completely omitted | **Missing from form** (Multi-channel telemetry) |
| **Pressure (Measured)** | `csr.pressure` (1 field) | Fabricated 3 channels (4.8 bar, 1.6 bar, 2.2 bar) | Completely omitted | **Missing from form** (Multi-channel telemetry) |
| **Problem Reported** | `csr.problem_reported` | Verbatim text quote | Verbatim text paragraph | **Supported** |
| **Service Rendered** | `csr.service_rendered` | Verbatim text narrative | Verbatim text paragraph | **Supported** |
| **Defects Found** | `csr.defects_found` | Formatted into 6-item coded schedule | Formatted into 6-item bulleted list | **Supported** (Form text parsed into items) |
| **Engineer's Remarks** | `csr.engineer_remarks` | Verbatim text narrative | Verbatim text box | **Supported** |
| **Materials Used** | `materialsRows` (18 items) | 18 rows (Sequential column order) | 18 rows (Interleaved group order) | **Supported** |
| **Service Window Dates** | `start_date`, `end_date` | `2026-10-12` to `2026-10-24` | `2026-10-12` to `2026-10-24` | **Supported** |
| **Service Window Times** | `start_time`, `end_time` | Omitted | Omitted | **Supported** in form; omitted by candidates |
| **Service Completion Status** | `csr.status` | Dropped; shows `BASELOAD` | Replaced by `Returned to baseload` | **Supported** in form; mislabeled by candidates |
| **Technician Signatory Name** | `csrMeta.technicianName` | Missing; shows `Authorized Signatory` | Shows placeholder `Not supplied` | **Conditionally supported** |
| **Technician Designation** | Signatory `role` | Missing; hardcodes `Service Engineering Record`| Hardcodes `Service Engineer` | **Conditionally supported** |
| **Technician Signature** | `technician_signatory_id` | Embedded SVG (`dal-sign.txt`) | Embedded SVG (`dal-sign.txt`) | **Supported** (via signatory URL) |
| **Client Signatory Name** | `csr.acknowledgement_name`| Missing; shows `Authorized Signatory` | Shows placeholder `Not supplied` | **Supported** in form; missing from candidates |
| **Client Designation** | `csrMeta.recipientRole` | Missing; shows `Commissioning & Client Acceptance`| Hardcodes `Client Representative` | **Supported** in form; hardcoded in candidate |
| **Client Signature** | `recipient_signature_url` | Embedded SVG (`elvis-sign.txt`)| Embedded SVG (`elvis-sign.txt`)| **Supported** |
| **Signing Dates** | Derived from submission | Hardcoded `2026-10-24` | Shows placeholder `Not supplied` | **Supported** |

---

## 4. Live Template Comparison

Comparison against the verified live template (`Screenshot_2026-10-27-05-20-00-065...` / Sun & Shield Industry Production Template):

```
Live Template Readings Architecture (Single Horizontal Strip):
┌───────────┬───────────┬──────────────────────┬─────────────┬────────────┬───────────┐
│   392 V   │   50 Hz   │        27.3 V        │    74 °C    │  704 kPa   │  9329.4   │
│VOLTAGE (V)│ FREQ (HZ) │CHG ALT COND / BATTERY│TEMP (CELSIUS│PRESS (BAR) │   HOURS   │
└───────────┴───────────┴──────────────────────┴─────────────┴────────────┴───────────┘
```

### 1. Preserved Operational Information
- **Client & Equipment Identification:** Both candidates preserve the relationship between client identity, client corporate address, equipment make, model, capacity, engine number, and serial number.
- **Service Narratives:** Both candidates preserve the four standard operational narratives: Problem Reported, Service Rendered, Defects Found, and Engineer's Remarks.
- **Service Dates:** Both candidates capture the start and completion dates.

### 2. Operational Readings Fidelity
- **Landscape Blueprint Failure:** Blueprint replaces the single-row 6-cell readings strip with a complex mechanical engineering dossier:
  - It moves Voltage (`11000 V`), Frequency (`50 Hz`), and Operating Hours (`30142.6 hrs`) into the nameplate table.
  - It drops the charging alternator condition entirely, replacing it with battery specification details (`4x 12V 200Ah AGM`).
  - It expands temperature into 3 discrete channels: *Jacket Water Outlet (88°C)*, *Aftercooler (52°C)*, and *Avg Exhaust Temp (510°C)*.
  - It expands pressure into 3 discrete channels: *Lube Oil (4.8 bar)*, *Diff. Oil Filter (1.6 bar)*, and *Crankcase Vacuum (2.2 bar)*.
  - **Verdict:** Blueprint invents data structure and violates the agreed design rule: *do not add routine multi-channel fields merely because they can be measured*.
- **Portrait Final PDFCN Failure:** Portrait PDFCN completely removes the operational readings strip:
  - It relegates electrical parameters to a static *Rated Specifications (Nameplate / project data — not measured)* block.
  - It prints an explicit micro-caption: *"Measured output voltage, current, temperature and pressure were not supplied. No measured electrical values are asserted."*
  - **Verdict:** While technically honest regarding its synthetic test fixture, it fails live template fidelity by removing the operational mechanism required to report measured operating readings.

### 3. Operational Status Pills
- The live template displays 5 explicit lifecycle status pills: `COMPLETE`, `INCOMPLETE`, `PENDING FOR SPARES`, `UNDER OBSERVATION`, and `WORKING SOLUTION PROVIDED`.
- Blueprint drops these pills entirely and substitutes drawing state text (`BASELOAD (11kV SYNC)`).
- Portrait PDFCN replaces them with a custom 2-cell block (`Initial state: Down`, `Post-service: Returned to baseload`).

---

## 5. Standards Compliance Matrix

| Criterion | Standard Requirement | Blueprint Candidate | Portrait PDFCN Candidate |
| :--- | :--- | :--- | :--- |
| **Equipment Location Label** | Must use exact text:<br>`Site / Equipment Location` | **FAIL**<br>Uses `Zone A10–A11 · Physical Equipment Location` | **FAIL**<br>Uses `Equipment Location` (omits `Site / `) |
| **Separation of Addresses** | Actual service site distinct from corporate address | **PASS**<br>Separate top cells for client address and equipment location | **PASS**<br>Distinct blocks: Section A (Corporate) vs Section C (Location) |
| **Field Title/Value Hierarchy** | Labels and values distinct by weight, size (>1.15x), and contrast | **PASS**<br>Monospace bold values (7.1–7.4pt) clearly contrast with 4.9pt uppercase labels | **PASS**<br>Values are 7.6pt bold black, labels are 5.85pt muted grey (1.30x ratio) |
| **Materials Item Count** | Exactly 18 items with matching descriptions, quantities, and units | **PASS**<br>All 18 items present with verbatim descriptions and units | **PASS**<br>All 18 items present with verbatim descriptions and units |
| **Materials Group Enumeration** | Vertical reading down each column:<br>Col 1: 01, 05, 09, 13, 17<br>Col 2: 02, 06, 10, 14, 18<br>Col 3: 03, 07, 11, 15<br>Col 4: 04, 08, 12, 16 | **FAIL**<br>Uses contiguous column numbering:<br>Col 1: 01–05<br>Col 2: 06–10<br>Col 3: 11–14<br>Col 4: 15–18 | **PASS**<br>Strictly follows the required vertical group enumeration down each column |
| **Materials Visual Boundaries** | Visible vertical column separators and row dividers | **PASS**<br>0.3mm solid vertical lines between columns; zebra striping on rows | **PASS**<br>0.5mm solid vertical lines between groups; 0.2mm row dividers |
| **Sign-off Structure** | Exactly 2 sign-off areas: Service Engineer & Client Representative | **FAIL**<br>Provides 4 bottom blocks (Projection, Sig 1, Sig 2, Master ID) | **PASS**<br>Provides exactly 2 distinct sign-off cards |
| **Signatory Identity Fields** | Must accommodate Signature, Full Name, Designation, and Date | **FAIL**<br>Accommodates signature and date only; omits full name and designation | **PASS**<br>Accommodates all 4 items; explicitly flags missing values |
| **Print Discipline & Pagination** | Strict 1-page fit on target orientation without content clipping | **FAIL**<br>Declared `overflow: hidden` on 210mm sheet; clips if content overflows | **PASS**<br>Verified 1-page A4 flow without `overflow: hidden` clipping |

---

## 6. Candidate-by-Candidate Findings

### Candidate 1: Landscape — Blueprint / Technical Drawing
**File:** `docs/templates/html-temps/CSR/csr-blueprint-technical-drawinglandscape.html`

- **Finding BP-01 (Severity: CRITICAL — Data Model Incompatibility):**
  Blueprint introduces fictitious multi-channel telemetry in Section 02 (lines 855–893). It defines 3 temperature channels (Jacket Water Outlet, Aftercooler, Avg Exhaust Temp) and 3 pressure channels (Lube Oil, Diff. Oil Filter, Crankcase Vacuum). The application CSR data model (`CsrObject` in `csrUtils.ts`) provides only single scalar fields: `temperature` and `pressure`. The application cannot supply this data.
- **Finding BP-02 (Severity: CRITICAL — Standard Violation in Materials Enumeration):**
  The bill of materials (lines 985–1055) arranges 18 items sequentially down four columns: Column 1 holds 01–05, Column 2 holds 06–10, Column 3 holds 11–14, and Column 4 holds 15–18. This directly violates the required standard specification where items are enumerated down columns in interleaved order (01, 05, 09, 13, 17 in Column 1; 02, 06, 10, 14, 18 in Column 2; etc.). Furthermore, it introduces synthetic sub-schedule headers (*"IGNITION & AIR HANDLING SUB-SCHEDULE"*, *"SEALS, FLUIDS & FILTRATION SUB-SCHEDULE"*) that do not exist in the domain data.
- **Finding BP-03 (Severity: MAJOR — Signatory Fields Deficient):**
  The title-block signature band (lines 1074–1100) lacks input slots for the technician's full name, the technician's designation, the client representative's full name, and the client representative's designation. It hardcodes generic text (`Authorized Signatory`) and a static date (`2026-10-24`), failing to support the data captured in `csrMeta.technicianName`, `csr.acknowledgement_name`, and tenant signatory records.
- **Finding BP-04 (Severity: MAJOR — Layout and Print Fragility):**
  In `.drawing-sheet` (line 52 and line 60), the CSS sets `height: 210mm; overflow: hidden;`. Under CSS printing standards, setting fixed sheet heights combined with `overflow: hidden` prevents overflow pagination and silently truncates content if font rendering or text expansion exceeds 210 mm.
- **Finding BP-05 (Severity: MINOR — Approved Location Label Not Used):**
  Line 785 renders `<span class="meta-tag">Zone A10–A11 · Physical Equipment Location</span>`. The approved label is exactly `Site / Equipment Location`.
- **Finding BP-06 (Severity: MINOR — Decorative Overhead):**
  Perimeter coordinate rulers (1–12, A–H), CAD projection blocks, and zone tags (`Z: B1–D3`) consume roughly 18% of the printable page area, constraining vertical space for narrative and service documentation.

---

### Candidate 2: Portrait — Final PDFCN Reference
**File:** `docs/templates/html-temps/CSR/csr-final-pdfcn-reference.html`

- **Finding PF-01 (Severity: CRITICAL — Operational Readings Omitted):**
  The template completely omits the operational readings section. While the live template and application form capture operating voltage, operating frequency, charging alternator condition, operating temperature, operating pressure, and running hours, this candidate converts electrical data into static nameplate ratings (lines 665–686) and disclaims operational readings entirely (line 687). It cannot represent live generator test runs without layout modification.
- **Finding PF-02 (Severity: MINOR — Approved Location Label Not Used):**
  Line 660 renders `<span class="label">Equipment Location</span>`. It omits the prefix `Site / `, failing the exact approved label requirement `Site / Equipment Location`.
- **Finding PF-03 (Severity: MINOR — Unwired Signatory Placeholders):**
  The two sign-off cards (lines 788–855) correctly provide dedicated display lines for Full Name, Designation, and Date, but hardcode `Not supplied` and display an `INCOMPLETE` warning badge. While appropriate for synthetic reference vetting, these fields must be wired to `csrMeta.technicianName`, `signatories.role`, and `csr.acknowledgement_name` before production deployment.
- **Finding PF-04 (Severity: POSITIVE — Verified Geometry and Schedule Integrity):**
  The candidate strictly implements the required 4-column vertical interleaved materials order (lines 741–777), maintains an excellent label-to-value hierarchy ratio (1.30x), provides high visual contrast, and is empirically verified to fit within single-page A4 portrait bounds without clipping or overflow.

---

## 7. Comparison Summary

| Feature / Dimension | Landscape Blueprint Candidate | Portrait Final PDFCN Reference Candidate |
| :--- | :--- | :--- |
| **Orientation & Fit** | A4 Landscape (297 × 210 mm); relies on `overflow: hidden` to guarantee 1 page. | A4 Portrait (210 × 297 mm); measured content fits cleanly within 279 mm printable height. |
| **Visual Character** | Technical blueprint / CAD drafting aesthetic with coordinate grid. | Industrial service report / high-density work docket. |
| **Operational Readings** | Distorts readings into multi-channel engineering telemetry not in the form. | Omits measured readings strip entirely; reclassifies data as nameplate specs. |
| **Materials Table** | 18 rows; sequential column order (01–05, 06–10...); contains invented sub-schedule tags. | 18 rows; exact vertical interleaved group order (01, 05, 09, 13, 17...); clean alignment. |
| **Sign-off Completeness** | Missing signatory names and designations; hardcodes dates and generic titles. | Complete 4-element structure (Signature, Name, Designation, Date); disclaims placeholders. |
| **Location Label** | Non-compliant: `Physical Equipment Location`. | Non-compliant: `Equipment Location` (missing `Site / `). |
| **Readability & Hierarchy** | Good font contrast, but heavy grid lines and coordinate frames introduce visual noise. | Outstanding typography, crisp borders, strong section headers, high data density. |
| **Form Implementation Gap** | Extreme: requires schema overhaul for 6 new telemetry channels and CAD metadata. | Moderate: requires restoring the 6-cell readings strip and updating two labels. |

---

## 8. Implementation Recommendation

### Primary Recommendation
**Neither candidate is ready for immediate production deployment as-is.**

However, **Portrait Final PDFCN Reference (`csr-final-pdfcn-reference.html`) is strongly recommended as the sole base candidate for implementation**, subject to resolving three specific blockers.

The Landscape Blueprint candidate should be formally retired from production consideration. It suffers from fundamental data-architecture divergence (demanding data structures the application cannot supply), breaks the agreed materials enumeration standard, and exhibits brittle print overflow characteristics.

### Minimum Blockers to Resolve on Portrait Candidate Before Implementation

1. **Re-integrate the 6-Cell Operational Readings Strip:**
   Replace or supplement the current *Rated Specifications* block with the standard 6-cell readings strip proven in the live template and supported by the application form:
   - Voltage (`csr.voltage`)
   - Frequency (`csr.frequency`)
   - Charging Alternator Condition / Battery (`csr.battery`)
   - Operating Temperature (`csr.temperature`)
   - Operating Pressure (`csr.pressure`)
   - Engine Running Hours (`csr.hours`)
2. **Correct the Location Label:**
   Update line 660 from `Equipment Location` to the exact approved string:
   `Site / Equipment Location`.
3. **Bind Signatory Fields to Application State:**
   Replace the hardcoded `Not supplied` strings and `INCOMPLETE` badges with dynamic bindings to:
   - Technician: `csrMeta.technicianName`, signatory role, and submission date.
   - Client: `csr.acknowledgement_name`, `csrMeta.recipientRole`, and customer feedback.

---

## 9. Unverified Items

1. **Native `pdfcn` CLI Rendering:**
   The `pdfcn` executable was not installed in the local execution runtime. Candidate measurements and page boundary verifications for the portrait candidate were established via Playwright Chromium print media emulation and mupdf 1.28.1 rasterization (as documented in prior verification records). Final layout behavior under native `pdfcn` binaries remains unverified.
2. **Physical Print Margins on Office Printers:**
   Neither candidate has been tested on physical hardware printers. While the portrait candidate maintains safe 9 mm top/bottom and 10 mm left/right margins, unprintable hardware margins on specific legacy desktop printers were not physically verified.

---

## 10. Execution Constraints & Verification

```
Verification:
- bun run audit:load: skipped (audit-only task per user instruction)
- bun run typecheck: skipped (audit-only task per user instruction)
- bun run lint: skipped (audit-only task per user instruction)
- bun run build: skipped due to hardware policy
- application source code: 0 modifications
- candidate template files: 0 modifications
- git status check: verified pre-existing changes preserved; only audit report added
```
