# Waybill Template Replacement Inspection Report

**Date:** Sun Jun 21 2026
**Scope:** Read-only analysis of 13 HTML template mockups in `docs/TEMPLATES/htmltemps/waybill/` + CSR fillable-writing-font audit
**Status:** FACTS ONLY — no recommendations

---

## Part A: HTML Template Mockup Analysis

### Contract Reference

All field mapping is against the locked `WaybillRenderModel` contract (`src/domain/waybill/engine/types.ts`):

| Block | Fields |
|---|---|
| `branding` | `name`, `tagline`, `logo`, `address`, `phone`, `email` |
| `header` | `type` (internal/external), `waybillNumber`, `date`, `time`, `poNumber` |
| `parties` | `clientName`, `senderName`, `receiverName` |
| `logistics` | `vehiclePlate`, `driverName`, `deliveryMode`, `deliveryLocation`, `purpose` |
| `notes` | `string` |
| `signatures` | `sender` (NormalizedSignature \| null), `receiver` (NormalizedSignature \| null) |
| `footer` | `waybillNumber`, `companyName` |
| `pagination` | `repeatTableHeader`, `keepSignatureTogether`, `keepNotesTogether` |
| `table` | `columns: PrintColumn[]`, `rows: PrintRow[]` |

---

### A1. Classic-final.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`)
- **Typography:** Arial 9px body, uppercase bold 9px titles
- **Sections:**
  - `title-zone` → renders `branding.name` + `branding.tagline`
  - `header` → two-column: left = logo + name + address + phone + email (`branding.*`); right = doc-number pill (`header.waybillNumber`)
  - `meta-grid` (4-column) → `header.type` (badge), `header.date`, `header.time`, `header.poNumber`
  - `parties` (3-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `logistics` (3-column) → `logistics.vehiclePlate`, `logistics.driverName`, `logistics.deliveryMode`
  - `items` → table with header row + item rows + qty + condition
  - `notes` → `notes` string
  - `sigs` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `logistics.deliveryLocation` — NOT rendered
  - `logistics.purpose` — NOT rendered
  - No pagination controls (single-page design)
  - Signature names from `parties.senderName`/`parties.receiverName` — matches contract

---

### A2. Minimal-final.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`)
- **Typography:** Arial 9px body, uppercase bold 9px titles
- **Sections:**
  - `title-zone` → `branding.name` + `branding.tagline`
  - `header-grid` (two-cell) → left = `branding.logo` + `branding.name` + `branding.tagline`; right = doc-type pill (`header.type`) + `header.waybillNumber` + `header.date`
  - `parties` (3-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `meta-row` (4-column) → `header.time`, `header.poNumber`, `logistics.vehiclePlate`, `logistics.driverName`
  - `items` → table with header row + item rows + qty + condition
  - `notes` → `notes` string
  - `sigs-row` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `logistics.deliveryMode` — NOT rendered
  - `logistics.deliveryLocation` — NOT rendered
  - `logistics.purpose` — NOT rendered
  - `branding.phone`, `branding.email` — NOT rendered
  - No pagination controls

---

### A3. Thermal.html

- **Layout:** A4 portrait centered on 104mm receipt-width column (`max-width: 104mm`)
- **Typography:** Courier New 8px monospace throughout
- **Sections:**
  - `brand` → `branding.name` + `branding.tagline`
  - `title` → static "WAYBILL / RECEIPT"
  - `meta` → `header.waybillNumber` (prominent), `header.date`, `header.time`, `header.poNumber`
  - `client` (two-cell) → `parties.clientName`, `parties.senderName`
  - `items` → table with header + rows + qty + condition
  - `total-box` → static "Total Items: [count]" (derived, not from contract)
  - `notes` → `notes` string
  - `sigs` (2-column) → blank signature lines + "Sender's Name" / "Receiver's Name"
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `parties.receiverName` — NOT rendered in parties section
  - `logistics.*` — ALL logistics fields NOT rendered
  - `branding.logo`, `branding.address`, `branding.phone`, `branding.email` — NOT rendered
  - `header.type` — NOT rendered
  - `signatures.sender`/`receiver` images — NOT rendered (blank lines only)
  - `total-box` — static count, not from contract

---

### A4. Green.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 10mm`)
- **Typography:** Inter body font, 8.5px text, uppercase bold 9.5px labels
- **Sections:**
  - `header` (two-cell) → left = `branding.logo` + `branding.name` + `branding.address` + `branding.phone` + `branding.email`; right = doc-type pill (`header.type`) + `header.waybillNumber` + `header.date`
  - `meta-pills` (4-pill row) → `header.time`, `header.poNumber`, `logistics.vehiclePlate`, `logistics.driverName`
  - `parties` (2-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `logistics` (2-column) → `logistics.deliveryMode`, `logistics.deliveryLocation`, `logistics.purpose`
  - `items` → table with header + rows + qty + condition
  - `notes` → `notes` string
  - `sigs` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName` + accent bar
- **Contract gaps:**
  - `branding.tagline` — NOT rendered
  - No pagination controls
  - ALL contract fields present except `branding.tagline`

---

### A5. Industry.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`)
- **Typography:** Arial 9px body, bold 9px labels, dark header band
- **Sections:**
  - `dark-header` (full-width colored background) → `branding.logo` + `branding.name` + doc-type pill (`header.type`) + `header.waybillNumber`
  - `meta-grid` (4-column) → `header.date`, `header.time`, `header.poNumber`, `logistics.vehiclePlate`
  - `parties` (2-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `logistics` (2-column) → `logistics.driverName`, `logistics.deliveryMode`, `logistics.deliveryLocation`, `logistics.purpose`
  - `items` → table with header + rows + qty + condition
  - `notes` → `notes` string
  - `sigs` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `branding.tagline` — NOT rendered
  - `branding.address`, `branding.phone`, `branding.email` — NOT rendered in header (only in body contact block if present)
  - No pagination controls
  - ALL contract fields present except `branding.*` contact details and `tagline`

---

### A6. Premium.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`)
- **Typography:** Arial 9px body, bold 9px labels, topbar with colored background
- **Sections:**
  - `topbar` (3-column grid) → left = `branding.logo` + `branding.name`; center = `branding.tagline`; right = doc-type pill + `header.waybillNumber` + `header.date`
  - `titleband` → "WAYBILL / RECEIPT" + `header.time`
  - `parties` (2-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `meta-grid` (4-column) → `header.poNumber`, `logistics.vehiclePlate`, `logistics.driverName`, `logistics.deliveryMode`
  - `items` → table with header + rows + qty + condition
  - `notes` → `notes` string
  - `sigs` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `logistics.deliveryLocation` — NOT rendered
  - `logistics.purpose` — NOT rendered
  - `branding.address`, `branding.phone`, `branding.email` — NOT rendered
  - No pagination controls

---

### A7. Split.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`)
- **Typography:** Arial 9px body, bold 9px labels, banner with colored background
- **Sections:**
  - `banner` (full-width colored) → `branding.logo` + `branding.name` + `branding.tagline` + doc-type pill + `header.waybillNumber`
  - `meta-pills` (4-pill row) → `header.date`, `header.time`, `header.poNumber`, `logistics.vehiclePlate`
  - `parties` (3-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `logistics` (3-column) → `logistics.driverName`, `logistics.deliveryMode`, `logistics.deliveryLocation`, `logistics.purpose`
  - `items` → table with header + rows + qty + condition
  - `notes` → `notes` string
  - `sigs-row` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `branding.address`, `branding.phone`, `branding.email` — NOT rendered
  - No pagination controls
  - ALL contract fields present except `branding.*` contact details

---

### A8. classic-mockup.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`) with `page-break-after: always` on footer (multi-page support)
- **Typography:** Arial 9px body, bold 9px labels
- **Sections:** Identical structure to Classic-final.html
  - `title-zone`, `header` (2-col), `meta-grid` (4-col), `parties` (3-col), `logistics` (3-col), `items`, `notes`, `sigs`, `footer`
- **Key difference from Classic-final:** Has `page-break-after: always` on footer div — earlier prototype with multi-page support via CSS page breaks
- **Contract gaps:** Same as Classic-final (A1)

---

### A9. minimal-mockup.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `margin: 12mm`) with `page-break-after: always` on footer
- **Typography:** Arial 9px body, bold 9px labels
- **Sections:** Identical structure to Minimal-final.html
  - `title-zone`, `header-grid`, `parties`, `meta-row`, `items`, `notes`, `sigs-row`, `footer`
- **Key difference from Minimal-final:** Has `page-break-after: always` on footer — earlier prototype
- **Contract gaps:** Same as Minimal-final (A2)

---

### A10. wblbarebones.html

- **Layout:** A4 portrait with 10mm margin, basic black-and-white styling
- **Typography:** Arial 9px body, bold 9px labels
- **Sections:**
  - `header` (3-cell grid) → `branding.logo` + `branding.name` + `branding.address` + `branding.phone` + `branding.email`; center = `branding.tagline`; right = doc-type pill + `header.waybillNumber` + `header.date`
  - `client-row` (2-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `meta-row` (4-column) → `header.time`, `header.poNumber`, `logistics.vehiclePlate`, `logistics.driverName`
  - `items` → table with header + rows + qty + condition
  - `sigs` (2-column grid) → blank signature lines + "Sender's Name" / "Receiver's Name"
  - `notes` → `notes` string
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `logistics.deliveryMode`, `logistics.deliveryLocation`, `logistics.purpose` — NOT rendered
  - `signatures.sender`/`receiver` images — NOT rendered (blank lines only)
  - No pagination controls

---

### A11. waybill-portrait.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `padding: 24px`)
- **Typography:** Arial 9px body, bold 9px labels
- **Branding:** "Sun & Shield" sample
- **Sections:**
  - `header` (2-cell grid) → left = `branding.logo` + `branding.name` + `branding.tagline` + `branding.address` + `branding.phone` + `branding.email`; right = doc-type pill + `header.waybillNumber` + `header.date`
  - `top-grid` (2-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `meta-grid` (4-column) → `header.time`, `header.poNumber`, `logistics.vehiclePlate`, `logistics.driverName`
  - `items` → table with header + rows + qty + condition
  - `notes` → `notes` string
  - `sigs` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `logistics.deliveryMode`, `logistics.deliveryLocation`, `logistics.purpose` — NOT rendered
  - No pagination controls

---

### A12. waybill-portrait-corrected.html

- **Layout:** A4 portrait (flex column, `min-height: 100vh`, `padding: 24px`)
- **Typography:** Arial 9px body, bold 9px labels, simplified black/white styling
- **Sections:** Identical structure to waybill-portrait.html (A11)
  - `header`, `top-grid`, `meta-grid`, `items`, `notes`, `sigs`, `footer`
- **Key difference:** Simplified colors (black text, white backgrounds, no accent colors)
- **Contract gaps:** Same as waybill-portrait (A11)

---

### A13. waybill-landscape.html

- **Layout:** A4 **landscape** (297mm wide × 210mm tall, flex column)
- **Typography:** Arial 9px body, bold 9px labels
- **Branding:** "Sun & Shield" sample
- **Sections:**
  - `header` (4-column grid) → `branding.logo` + `branding.name` + `branding.tagline` + `branding.address` + `branding.phone` + `branding.email`; center = doc-type pill + `header.waybillNumber` + `header.date`; right = `header.time` + `header.poNumber`
  - `parties` (3-column) → `parties.clientName`, `parties.senderName`, `parties.receiverName`
  - `logistics` (4-column) → `logistics.vehiclePlate`, `logistics.driverName`, `logistics.deliveryMode`, `logistics.deliveryLocation`
  - `items` → table with header + rows + qty + condition (wider due to landscape)
  - `notes` → `notes` string
  - `sigs` (2-column) → `signatures.sender` (image + blank line + "Sender's Name"), `signatures.receiver` (image + blank line + "Receiver's Name")
  - `footer` → `footer.waybillNumber` + `footer.companyName`
- **Contract gaps:**
  - `logistics.purpose` — NOT rendered
  - No pagination controls
  - **Only landscape layout** — all others are portrait

---

### Part A Summary Table

| # | File | Layout | Typography | Contract Fields Covered | Contract Fields Missing | Signatures | Multi-page |
|---|---|---|---|---|---|---|---|
| 1 | Classic-final.html | Portrait A4 | Arial 9px | branding.* + header.* + parties.* + logistics.vehiclePlate/driverName/deliveryMode + notes + signatures + footer.* | deliveryLocation, purpose | Image + name | No |
| 2 | Minimal-final.html | Portrait A4 | Arial 9px | branding.name/tagline/logo + header.* + parties.* + logistics.vehiclePlate/driverName + notes + signatures + footer.* | deliveryMode, deliveryLocation, purpose, phone, email | Image + name | No |
| 3 | Thermal.html | Receipt 104mm | Courier New 8px | branding.name/tagline + header.waybillNumber/date/time/poNumber + parties.clientName/senderName + notes + footer.* | receiverName, ALL logistics, logo, address, phone, email, type, sig images | Blank lines only | No |
| 4 | Green.html | Portrait A4 | Inter 8.5px | branding.logo/name/address/phone/email + header.* + parties.* + logistics.* + notes + signatures + footer.* | tagline | Image + name | No |
| 5 | Industry.html | Portrait A4 | Arial 9px | branding.logo/name + header.* + parties.* + logistics.* + notes + signatures + footer.* | tagline, address, phone, email | Image + name | No |
| 6 | Premium.html | Portrait A4 | Arial 9px | branding.logo/name/tagline + header.* + parties.* + logistics.vehiclePlate/driverName/deliveryMode + notes + signatures + footer.* | deliveryLocation, purpose, address, phone, email | Image + name | No |
| 7 | Split.html | Portrait A4 | Arial 9px | branding.logo/name/tagline + header.* + parties.* + logistics.* + notes + signatures + footer.* | address, phone, email | Image + name | No |
| 8 | classic-mockup.html | Portrait A4 | Arial 9px | Same as Classic-final | Same as Classic-final | Image + name | Yes (CSS) |
| 9 | minimal-mockup.html | Portrait A4 | Arial 9px | Same as Minimal-final | Same as Minimal-final | Image + name | Yes (CSS) |
| 10 | wblbarebones.html | Portrait A4 | Arial 9px | branding.logo/name/address/phone/email/tagline + header.* + parties.* + logistics.vehiclePlate/driverName + notes + footer.* | deliveryMode, deliveryLocation, purpose, sig images | Blank lines only | No |
| 11 | waybill-portrait.html | Portrait A4 | Arial 9px | branding.logo/name/tagline/address/phone/email + header.* + parties.* + logistics.vehiclePlate/driverName + notes + signatures + footer.* | deliveryMode, deliveryLocation, purpose | Image + name | No |
| 12 | waybill-portrait-corrected.html | Portrait A4 | Arial 9px | Same as waybill-portrait | Same as waybill-portrait | Image + name | No |
| 13 | waybill-landscape.html | Landscape A4 | Arial 9px | branding.logo/name/tagline/address/phone/email + header.* + parties.* + logistics.vehiclePlate/driverName/deliveryMode/deliveryLocation + notes + signatures + footer.* | purpose | Image + name | No |

---

## Part B: CSR Fillable-Writing-Font Investigation

### B1. Feature Definition

The "fillable writing font" feature allows a handwriting-style font to be applied to text fields in PDF document renders (fillable blanks like party names, logistics values, notes, etc.). It is distinct from the body/title font used for labels and headings.

**Three fields in `PdfDesignPreset`** (`src/lib/pdfDesignPreset.ts:27-41`):

| Field | Type | Purpose |
|---|---|---|
| `fillableFont` | `PdfFillableFontChoice` | Selected font name (e.g., `'Patrick Hand'`, `'Caveat'`) |
| `fillableFontMode` | `'auto' \| 'custom'` | `'auto'` = use bodyFont; `'custom'` = use explicit fillableFont |
| `fillableColor` | `string` (hex) | Color for fillable text |

**Valid font choices** (`src/lib/pdfDesignPreset.ts:64-72`):
`'Patrick Hand'`, `'Handlee'`, `'Caveat'`, `'Sue Ellen Francisco'`, `'Kalam'`, `'Reenie Beanie'`

**Resolution logic** (`src/lib/pdfDesignPreset.ts:253-255`):
`getEffectiveFillableFont()` returns `preset.fillableFont` if mode is `'custom'`, else falls back to `preset.bodyFont`.

### B2. CSR Implementation

**UI location:** `src/pages/ViewCSR.tsx` lines 469-511

The CSR page has a **dedicated inline handwriting font toggle** (not via the shared `DocumentDesignControls`):
- A `Switch` component toggles between auto and custom mode
- Font chip buttons: Reenie Beanie, Caveat, Kalam, Patrick Hand
- Color hex input for `fillableColor`
- Per-template defaults defined at `ViewCSR.tsx:61-66` (all default to `Inter` for body)

**Save path:** `ViewCSR.tsx:519-527` → persists to localStorage + calls `setPdfDesignPreset('csr', designPreset)`.

**localStorage keys** (`ViewCSR.tsx:39-42`):
- `csr_view_template` — selected template ID (`'1'`-`'4'`)
- `csr_custom_font` — font choice or `'auto'`
- `csr_custom_color` — hex color or `'auto'`
- `csr_template_accent_color` — accent hex or `'auto'`

### B3. Waybill Fillable Font Status

**PDF rendering:** The Waybill PDF **fully uses the fillable font**:
- `src/components/waybill/WaybillPDF.tsx:34` — calls `registerPdfFillableFonts()`
- `src/components/waybill/WaybillPDF.tsx:36-85` — `createStyles()` resolves fillable font and applies `fillableBold`/`fillableRegular`/`fillableColor` to 15+ style properties (companyName, docNumber, metaValue, partyValue, cell, signatureText, etc.)

**UI controls:** The Waybill customize sheet uses `DocumentTemplateDesignOverrides` which **hides fillable controls**:
- `src/components/document/DocumentTemplateDesignOverrides.tsx:63` — `showFillableControls={false}`
- `src/components/document/DocumentTemplateDesignOverrides.tsx:86` — `showFillableControls={false}`

**Shared component:** `FillableWritingControls` at `src/components/document/DocumentDesignControls.tsx:208-301` exists (Auto/Custom toggle, font dropdown, hex color input) but is **never rendered** for Waybill through the `DocumentTemplateDesignOverrides` path.

**Default preset:** Waybill defaults to `fillableFont: 'Patrick Hand'`, `fillableFontMode: 'custom'` (`pdfDesignPreset.ts:152-153`) — meaning the Waybill PDF defaults to handwriting-style text for fillable fields, but users cannot change it via UI.

### B4. Git History

- **Commit `bb9dcb4`** (Sat Apr 4 2026): *"feat(docs/pdf,invoice): add fillable-writing settings for CSR/Waybill"* — Waybill was included from day one, modifying `WaybillPDF.tsx`, `ViewWaybill.tsx`, and `pdfDesignPreset.ts` in the same commit.
- **Commit `93cfd5a`** (Sat Apr 4 2026): *"feat(pdf): register handwriting fonts and wire fillable font presets for CSR & Waybill (preview + export parity)"* — registered `.woff` font files and added `registerPdfFillableFonts()` to `WaybillPDF.tsx`.

Waybill fillable font support has been present since the feature was introduced. The UI was never exposed for Waybill (hidden by `showFillableControls={false}` from the start).

### B5. Persistence Layer

| Layer | Storage | Keys/Columns | Scope |
|---|---|---|---|
| PDF Design Preset | localStorage | `waybill_pdf_design_preset` | Per document type, browser-local |
| Document Fillable Settings | Supabase `settings` table, column `document_fillable_settings` | JSON with per-type `enabled` booleans | Global toggle (default: `waybill: true`) |
| CSR extras | localStorage | `csr_custom_font`, `csr_custom_color`, `csr_template_accent_color`, `csr_view_template` | CSR page only |

The actual font choice (`fillableFont`) is stored **only in localStorage**, not in the database. The Supabase `document_fillable_settings` column is a feature-gate toggle only (enabled/disabled per document type), not a font-choice store.

`isDocumentFillableEnabled()` from `src/lib/documentFillableSettings.ts:44` is defined but **never called anywhere** in the codebase — dead infrastructure.

### B6. Summary: CSR vs Waybill Fillable Font

| Aspect | CSR | Waybill |
|---|---|---|
| PDF uses fillable font? | Yes (4 templates) | Yes (default template) |
| UI controls visible? | Yes — inline in ViewCSR.tsx (lines 469-511) | **No** — hidden by `showFillableControls={false}` in DocumentTemplateDesignOverrides |
| Has dedicated settings page? | Part of "Fillable Writing" toggle in Documents Settings | Part of same toggle, enabled by default |
| Persistence | localStorage (`csr_pdf_design_preset` + 4 extra keys) | localStorage (`waybill_pdf_design_preset`) |
| Default font | `'Patrick Hand'` (custom mode) | `'Patrick Hand'` (custom mode) |
| Database column? | No — `document_fillable_settings` is a feature-gate toggle only | Same |
| Added in commit | `bb9dcb4` (Apr 4 2026) | Same commit — from day one |

---

*Report generated: Sun Jun 21 2026. Facts only — no recommendations.*
