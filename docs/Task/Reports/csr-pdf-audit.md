# CSR PDF Pipeline Audit

**Date:** 2026-06-15
**Scope:** Complete field-to-template audit of all 4 CSR PDF variants
**Status:** Read-only audit — no code changes

---

## 1. Field Inventory

### 1.1 Form Fields (CsrFormScreen.tsx)

| Field | DB Column | Type | Default |
|---|---|---|---|
| client_name | `client_name` | text | `''` |
| date | `date` | date | today |
| equipment_type | `equipment_type` | text | `''` |
| make | `make` | text | `''` |
| model | `model` | text | `''` |
| serial_no | `serial_no` | text | `''` |
| capacity | `capacity` | text | `''` |
| equipment_location | `equipment_location` | text | `''` |
| address | `address` | text | `''` |
| po_number | `po_number` | text | `''` |
| problem_reported | `problem_reported` | text | `''` |
| status | `status` | text | `'Complete'` |
| start_date | `start_date` | date | today |
| start_time | `start_time` | time | `''` |
| end_date | `end_date` | date | today |
| end_time | `end_time` | time | `''` |
| resolution | `resolution` | text | `''` |
| customer_feedback | `customer_feedback` | text | `''` |
| call_type | `call_type` | text | `''` |
| system_down | `system_down` | text | `''` |
| service_rendered | `service_rendered` | text | `''` |
| defects_found | `defects_found` | text | `''` |
| engineer_remarks | `engineer_remarks` | text | `''` |
| voltage | `voltage` | text | `''` |
| frequency | `frequency` | text | `''` |
| battery | `battery` | text | `''` |
| temperature | `temperature` | text | `''` |
| pressure | `pressure` | text | `''` |
| hours | `hours` | text | `''` |
| materials_used | `materials_used` | text (JSON blob) | `''` |
| acknowledgement_name | `acknowledgement_name` | text | `''` |
| technician_signatory_id | `technician_signatory_id` | uuid | `null` |

**Meta fields** (serialized into `materials_used` via `__CSR_META_V1__` prefix):
- `showOperationalReadings` (bool, default true)
- `modelLabel` (string, default `'Model'`)
- `serialLabel` (string, default `'Serial No.'`)
- `showAcknowledgement` (bool, default true)
- `recipientTitle` (string, default `'Received By / Witness'`)
- `recipientRole` (string, default `''`)
- `technicianName` (string, default `''`)
- `showTechnicianSignLine` (bool, default false)
- `materialsOutputStyle` (`'list'` | `'comma'`, default `'list'`)

### 1.2 Signatories (dynamic rows)

| Sub-field | Key |
|---|---|
| name | `name` |
| role | `role` |
| signature | `signature_url` |

### 1.3 Operational Readings (dynamic rows via CSR_READING_FIELDS)

| Label | CSR field key |
|---|---|
| Voltage | `voltage` |
| Frequency | `frequency` |
| Battery | `battery` |
| Temperature | `temperature` |
| Pressure | `pressure` |
| Hours | `hours` |

---

## 2. Model Builder — `buildCsrPreviewData`

**Location:** `src/components/csr/csrUtils.ts:286-356`

### 2.1 Input → Output Mapping

| Input | Output property | Notes |
|---|---|---|
| `csr` (CsrObject) | spread via `...csr` | All CSR fields available on output |
| `options.client?.address/city/state` | `address` | Composed full address; falls back to `csr.address` |
| `parseCsrMaterials(csr.materials_used, csr)` | `materialsRows`, `materialsText`, `meta` | Parses JSON blob or falls back to raw text |
| `options.signatories` | passed through | Templates access directly |
| `options.technicianSignatory` | `technicianSignatory` | Normalized signatory object |
| `resolvedTechnicianSignatory?.name` | `technicianName` | Falls back to `parsed.meta.technicianName` |
| computed `totalNarrativeLength` | `layoutDensity` | `'tight'` / `'compact'` / `'comfortable'` |
| `parsed.meta.*` | various top-level aliases | `modelLabel`, `serialLabel`, `showOperationalReadings`, `showAcknowledgement`, `recipientTitle`, `recipientRole`, `showTechnicianSignLine` |
| `csr.engineer_remarks` | `technicianRemarks` | Aliased for template consumption |

### 2.2 Derived Fields

- **`layoutDensity`**: Computed from sum of narrative field lengths + materials row count
  - `>900 chars` or `>4 materials rows` → `'tight'`
  - `>520 chars` or `>2 materials rows` → `'compact'`
  - otherwise → `'comfortable'`
- **`fullAddress`**: Joins `client.address`, `client.city`, `client.state` with commas; falls back to `csr.address`

---

## 3. Template Field Consumption Audit

### 3.1 PulseFrame (`PulseFrame.tsx`)

| Section | Fields accessed | Source path |
|---|---|---|
| **Identity header** | `csr_number`, `date`, `client_name`, `status`, `po_number` | `csr.*` directly |
| **Equipment section** (SharedEquipmentSection) | `equipment_type`, `make`, `model`, `serial_no`, `capacity`, `equipment_location`, `address` | `csr.*` directly |
| **Problem section** (SharedProblemSection) | `problem_reported`, `call_type`, `system_down` | `csr.*` directly |
| **Service time** (ServiceTimeSection) | `start_date`, `start_time`, `end_date`, `end_time` | `csr.*` directly |
| **Operational readings** (ReadingsCardGrid) | `voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours` | `csr.*` directly, gated by `showOperationalReadings` |
| **Materials** (MaterialsSection) | `materialsRows`, `materialsText`, `meta.materialsOutputStyle` | From model builder |
| **Technician** | `technicianName`, `technicianSignatory` | From model builder |
| **Customer feedback** (CustomerFeedbackSection) | `customer_feedback` | `csr.*` directly |
| **Status checklist** (StatusListDots) | `status` | Compared against `CSR_STATUS_OPTIONS` |
| **Acknowledgement** | `acknowledgement_name`, `recipientTitle`, `recipientRole` | From model builder |
| **Remarks** | `technicianRemarks` (alias for `engineer_remarks`) | From model builder |

**Fields NOT consumed by PulseFrame:**
- `service_rendered` — not displayed
- `defects_found` — not displayed
- `resolution` — not displayed (note: form has `resolution` but CsrObject has no `resolution` field — likely aliased or unused)

### 3.2 SignalBands (`SignalBands.tsx`)

| Section | Fields accessed | Source path |
|---|---|---|
| **Identity header** | `csr_number`, `date`, `client_name`, `status`, `po_number` | `csr.*` directly |
| **Equipment section** (SharedEquipmentSection) | `equipment_type`, `make`, `model`, `serial_no`, `capacity`, `equipment_location`, `address` | `csr.*` directly |
| **Service time** (ServiceTimeSection) | `start_date`, `start_time`, `end_date`, `end_time` | `csr.*` directly |
| **Operational readings** (ReadingsStrip) | `voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours` | `csr.*` directly, gated by `showOperationalReadings` |
| **Problem** | `problem_reported`, `call_type`, `system_down` | `csr.*` directly |
| **Materials** (MaterialsSection) | `materialsRows`, `materialsText`, `meta.materialsOutputStyle` | From model builder |
| **Technician** | `technicianName`, `technicianSignatory` | From model builder |
| **Status checklist** (StatusListChecks) | `status` | Compared against `CSR_STATUS_OPTIONS` |
| **Acknowledgement** | `acknowledgement_name`, `recipientTitle`, `recipientRole` | From model builder |

**Fields NOT consumed by SignalBands:**
- `customer_feedback` — not displayed
- `service_rendered` — not displayed
- `defects_found` — not displayed
- `resolution` — not displayed
- `engineer_remarks` — not displayed

### 3.3 Zinc (`Zinc.tsx`)

| Section | Fields accessed | Source path |
|---|---|---|
| **Identity header** | `csr_number`, `date`, `client_name`, `status`, `po_number` | `csr.*` directly |
| **Equipment section** | `equipment_type`, `make`, `model`, `serial_no`, `capacity`, `equipment_location`, `address` | `csr.*` directly |
| **Service time** (ServiceTimeSection) | `start_date`, `start_time`, `end_date`, `end_time` | `csr.*` directly |
| **Operational readings** (ReadingsStrip) | `voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours` | `csr.*` directly, gated by `showOperationalReadings` |
| **Problem** | `problem_reported`, `call_type`, `system_down` | `csr.*` directly |
| **Materials** (MaterialsSection) | `materialsRows`, `materialsText`, `meta.materialsOutputStyle` | From model builder |
| **Technician** | `technicianName`, `technicianSignatory` | From model builder |
| **Lifecycle stages** | Uses zinc lifecycle stages (arrival→handover) | Computed from fields |
| **Signature card** (PdfSignatureCard) | `technicianSignatory`, `acknowledgement_name`, `recipientTitle`, `recipientRole` | From model builder |

**Fields NOT consumed by Zinc:**
- `customer_feedback` — not displayed
- `service_rendered` — not displayed
- `defects_found` — not displayed
- `resolution` — not displayed
- `engineer_remarks` — not displayed
- `status` checklist not rendered as dots/checks — used only for header badge

### 3.4 Crimson (`Crimson.tsx`)

| Section | Fields accessed | Source path |
|---|---|---|
| **Identity header** | `csr_number`, `date`, `client_name`, `status`, `po_number` | `csr.*` directly |
| **Equipment section** | `equipment_type`, `make`, `model`, `serial_no`, `capacity`, `equipment_location`, `address` | `csr.*` directly |
| **Service time** (ServiceTimeSection) | `start_date`, `start_time`, `end_date`, `end_time` | `csr.*` directly |
| **Operational readings** (ReadingsStrip) | `voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours` | `csr.*` directly, gated by `showOperationalReadings` |
| **Problem** | `problem_reported`, `call_type`, `system_down` | `csr.*` directly |
| **Materials** (MaterialsSection) | `materialsRows`, `materialsText`, `meta.materialsOutputStyle` | From model builder |
| **Technician** | `technicianName`, `technicianSignatory` | From model builder |
| **Status checklist** (StatusListChecks) | `status` | Compared against `CSR_STATUS_OPTIONS_PDF` (imported from `CSRPreviewContent.js`) |

**Fields NOT consumed by Crimson:**
- `customer_feedback` — not displayed
- `service_rendered` — not displayed
- `defects_found` — not displayed
- `resolution` — not displayed
- `engineer_remarks` — not displayed
- `acknowledgement_name` — not displayed (no acknowledgement section)

---

## 4. Issues Found

### 4.1 Missing Field Mismatches

| Issue | Severity | Details |
|---|---|---|
| **`resolution` field orphaned** | HIGH | Form collects `resolution` but `CsrObject` has no `resolution` property. `createDefaultCsr` does not include it. Templates do not read it. Field is collected but never rendered. |
| **`service_rendered` collected but never rendered** | MEDIUM | Present in `CsrObject` but no template displays it. |
| **`defects_found` collected but never rendered** | MEDIUM | Present in `CsrObject` but no template displays it. |
| **`customer_feedback` only rendered in PulseFrame** | LOW | SignalBands, Zinc, and Crimson all skip this field. Users may expect it to appear. |
| **`acknowledgement_name` not rendered in Crimson** | LOW | Crimson template has no acknowledgement section — only Zinc has PdfSignatureCard. |

### 4.2 Hardcoded Values

| Location | Value | Issue |
|---|---|---|
| `CSR_STATUS_OPTIONS` (CSRPreviewContent.js) | 6 hardcoded statuses | New statuses added via UI won't appear in PDF checklists unless manually updated |
| `CSR_STATUS_OPTIONS_PDF` (CSRPreviewContent.js) | Separate hardcoded list for Crimson | Duplicated status definitions — drift risk |
| `DEFAULT_CSR_META` (csrUtils.ts) | `modelLabel: 'Model'`, `serialLabel: 'Serial No.'` | Acceptable defaults, but cannot be customized per-template |
| `CSR_READING_FIELDS` (CSRPreviewContent.js) | 6 reading field definitions | Hardcoded — adding new reading types requires code change |

### 4.3 Layout / Structural Issues

| Issue | Severity | Details |
|---|---|---|
| **No page-break management** | HIGH | Long problem descriptions, materials lists, or reading sets can overflow pages. No `break-inside: avoid` or page-wrap logic in any template. |
| **SharedEquipmentSection shared across 3 templates** | LOW | PulseFrame, SignalBands, Zinc all use the same component — any layout change affects all three |
| **ReadingsGrid vs ReadingsStrip** | INFO | PulseFrame uses `ReadingsCardGrid` (card layout); SignalBands, Zinc, Crimson use `ReadingsStrip` (horizontal strip). Visual inconsistency is intentional per template design. |
| **Zinc lifecycle stages hardcoded** | LOW | The arrival→handover lifecycle is specific to Zinc template — not configurable |

### 4.4 Data Flow Issues

| Issue | Severity | Details |
|---|---|---|
| **`technicianRemarks` vs `engineer_remarks`** | INFO | Model builder aliases `engineer_remarks` → `technicianRemarks`. Templates access `technicianRemarks`. Works correctly but naming is confusing. |
| **Meta serialization into `materials_used`** | INFO | Meta flags (`showOperationalReadings`, `modelLabel`, etc.) are serialized inside the `materials_used` column with a `__CSR_META_V1__` prefix. This is a workaround for lacking a dedicated meta column. Works but makes the column impure. |
| **`parseCsrMaterials` fallback** | INFO | When `materials_used` doesn't start with `__CSR_META_V1__`, it falls back to treating the entire value as a single materials item. Graceful degradation. |

---

## 5. Template Comparison Matrix

| Feature | PulseFrame | SignalBands | Zinc | Crimson |
|---|---|---|---|---|
| Equipment section | ✓ (Shared) | ✓ (Shared) | ✓ (standalone) | ✓ (standalone) |
| Problem section | ✓ (Shared) | ✓ (inline) | ✓ (inline) | ✓ (inline) |
| Service time | ✓ | ✓ | ✓ | ✓ |
| Operational readings | CardGrid | Strip | Strip | Strip |
| Materials | ✓ | ✓ | ✓ | ✓ |
| Customer feedback | ✓ | ✗ | ✗ | ✗ |
| Status checklist | Dots | Checks | ✗ (badge only) | Checks |
| Acknowledgement | ✓ | ✓ | ✓ (PdfSignatureCard) | ✗ |
| Technician signature | ✓ (sign line) | ✓ (sign line) | ✓ (PdfSignatureCard) | ✓ (sign line) |
| `service_rendered` | ✗ | ✗ | ✗ | ✗ |
| `defects_found` | ✗ | ✗ | ✗ | ✗ |
| `resolution` | ✗ | ✗ | ✗ | ✗ |

---

## 6. Recommendations

### 6.1 Immediate (Phase 2.8 completion)

1. **Wire `resolution` field** — either add it to `CsrObject`, or remove it from the form if it's vestigial
2. **Add `service_rendered` and `defects_found` to at least one template** — or remove from form if not needed for CSR output
3. **Add page-break control** — wrap sections in `<div style={{ breakInside: 'avoid' }}>` to prevent mid-section overflow
4. **Unify status option sources** — consolidate `CSR_STATUS_OPTIONS` and `CSR_STATUS_OPTIONS_PDF` into a single source

### 6.2 Phase 3 (Polish)

5. **Extract status options to a shared constant** — both web preview and PDF templates should reference the same list
6. **Consider adding `customer_feedback` to SignalBands/Zinc/Crimson** — or document that it's PulseFrame-only
7. **Add `acknowledgement` section to Crimson** — or document the intentional omission
8. **Type `buildCsrPreviewData` return** — currently returns `any`; should return a proper interface

### 6.3 Phase 4 (Advanced)

9. **Page-break orchestration** — implement automatic page-break logic for long content (similar to invoice `splitItemsForPagination`)
10. **Template-aware field visibility** — allow templates to declare which optional fields they support, enabling dynamic form UI

---

## 7. Files Referenced

| File | Role |
|---|---|
| `src/components/csr/CsrFormScreen.tsx` | Form UI — all field definitions |
| `src/components/csr/csrUtils.ts` | Model builder (`buildCsrPreviewData`), meta serialization, defaults |
| `src/components/csr/CSRPreviewContent.js` | Reading fields, status options, template variants |
| `src/components/csr/CSRPreviewPanel.tsx` | Web preview panel, `mapCsrToPreviewData` |
| `src/components/csr/preview-templates/types.ts` | `CsrPdfProps`, `CsrPdfBranding` interfaces |
| `src/components/csr/preview-templates/utils.ts` | Shared PDF utilities |
| `src/components/csr/preview-templates/layoutModel.ts` | Materials layout, lifecycle stages |
| `src/components/csr/preview-templates/components.tsx` | Shared PDF components |
| `src/components/csr/preview-templates/index.tsx` | Template dispatcher |
| `src/components/csr/preview-templates/PulseFrame.tsx` | Template 1 — card-style readings, customer feedback, status dots |
| `src/components/csr/preview-templates/SignalBands.tsx` | Template 2 — strip readings, status checks, no feedback |
| `src/components/csr/preview-templates/Zinc.tsx` | Template 3 — lifecycle stages, PdfSignatureCard, no status checklist |
| `src/components/csr/preview-templates/Crimson.tsx` | Template 4 — strip readings, status checks, no acknowledgement |
| `src/pages/NewCSR.tsx` | Page wiring — calls `buildCsrPreviewData` and `getCsrPdfDocument` |
| `src/components/document-view/csr/CsrDocumentPreview.tsx` | Embedded document preview |
| `docs/PRD/pdf-rendering-roadmap.md` | Roadmap — Phase 2.8 CSR entry |

---

## 8. Invoice Landscape PDF Architecture — Porting Analysis

### 8.1 Invoice PDF Infrastructure

The Invoice PDF system uses a layered architecture that is **architecturally isolated** from the CSR PDF system:

**Layer 1: Generic Wrapper — `PdfRenderer.tsx`**
- Wraps all templates in `<Document>` and `<Page>` tags
- Reads `data.template.pageLayout` (`{ size: 'A4', orientation: 'portrait' | 'landscape' }`) from `IndustryTemplateData.layout`
- Passes `layout` prop to templates via `PdfTemplateRendererProps`
- Handles font loading, hydration, page numbering

**Layer 2: Data Adapter — `industryAdapter.ts`**
- `adaptIndustryData()` transforms raw Invoice/Quotation data into `IndustryTemplateData`
- Handles design preset resolution (`PdfDesignPreset`)
- Transforms financial items into `PdfTableColumn` format
- Separates data transformation from template rendering

**Layer 3: Templates — `Industry.tsx`, `Ledger.tsx`**
- Receive `PdfTemplateRendererProps` with `layout`, `data`, `designPreset`
- Apply `layout.orientation` to `<Page size={layout.size} orientation={layout.orientation}>`
- Use `<View fixed>` for headers/footers that repeat on every page
- Use `flex: 1` / `flexGrow` / `flexShrink` for elastic layouts
- Use `keepTogether` for row grouping (Ledger)

**Key Type: `PdfPageLayout`** (`src/components/pdf-new/types.ts`)
```typescript
interface PdfPageLayout {
  size: 'A4';
  orientation: 'portrait' | 'landscape';
}
```

### 8.2 CSR PDF Architecture — Current State

CSR templates are **standalone** and do NOT use the Invoice infrastructure:

- `preview-templates/index.tsx` builds a standalone `<Document>` with hardcoded `<Page size="A4">`
- No `PdfRenderer` wrapper — each template handles its own `<Document>` and `<Page>`
- No `pageLayout` prop — orientation is not configurable
- No `IndustryTemplateData`-style adapter — `buildCsrPreviewData` mixes data transformation with field aliasing
- All templates access `csr.*` directly (raw object, not adapted data)
- `CsrPdfProps.csr` is typed as `any` — no interface enforcement

### 8.3 Porting Plan: Landscape Orientation

To port Invoice landscape capability to CSR, the following steps are required:

#### Option A: Migrate CSR to use `PdfRenderer` + Adapter Pattern (recommended)

1. **Create `adaptCsrData()` adapter** — similar to `industryAdapter.ts`
   - Transform `CsrObject` + `CsrMeta` into a standard `CsrTemplateData` interface
   - Include `pageLayout: { size: 'A4', orientation: portrait | landscape }` in output
   - Include design preset, branding, company info

2. **Update `CsrPdfProps`** — replace `csr: any` with typed `data: CsrTemplateData`

3. **Wrap templates in `PdfRenderer`** — change `preview-templates/index.tsx` to use `PdfRenderer` instead of standalone `<Document>`

4. **Update templates** — read `layout.orientation` from props, apply to `<Page>`

5. **Add `<View fixed>`** for headers/footers that must repeat on every page

#### Option B: Add `pageLayout` prop threading (minimal change)

1. Add `pageLayout?: PdfPageLayout` to `CsrPdfProps`
2. Thread `pageLayout` through to templates
3. Templates apply `orientation` to `<Page>` and use `fixed` for repeating elements
4. No adapter pattern — templates still access `csr.*` directly

**Recommendation:** Option A is architecturally cleaner and aligns with the Invoice pattern. Option B is faster but perpetuates the current architecture drift.

### 8.4 Landscape Use Cases for CSR

| Use Case | When to Apply |
|---|---|
| Long materials lists | More than 4-5 materials rows |
| Multiple readings | All 6 reading fields populated with long values |
| Dense problem/resolution | Long `problem_reported` + `resolution` + `engineer_remarks` |
| Combined sections | All narrative fields populated + materials + acknowledgements |

**Trigger logic:** `layoutDensity === 'tight'` OR `materialsRows.length > 4` → auto-landscape

---

## 9. Memo Issue Verification

Verified the 10 issues listed in the task prompt (`docs/Task/Prompts/prompt6i5.md`) against actual code:

### 9.1 Geometry & Elasticity

| Issue | Verdict | Evidence |
|---|---|---|
| **Geometry is rigid** — layouts are designed for portrait A4 with hardcoded vertical stacking | **CONFIRMED** | All 4 templates use fixed vertical stacking. No `<Page orientation>` support. No `flex: 1` on main containers. Invoice templates use `flex: 1` on `invoiceContainer` (LedgerStyles.ts:8) — CSR has no equivalent. |
| **Elastic layout is absent** — Invoice system has elastic columns with `flex: 1`, `flexGrow`, `flexShrink`, and `keepTogether` | **CONFIRMED** | Ledger.tsx uses `keepTogether` for row grouping. Industry.tsx uses elastic column widths. CSR templates use fixed dimensions: `CrimsonMaterialsStyles.materialsRow: { minHeight: 34 }`, `materialsCol2: { flexShrink: 0, width: 60 }`. |

### 9.2 Field Requirements

| Issue | Verdict | Evidence |
|---|---|---|
| **"Battery" should be "Charging Alternator Condition"** | **CONFIRMED** | `csrUtils.ts:73-77` — `parseCsrMaterials` maps `battery` field as-is. `CSR_READING_FIELDS` (CSRPreviewContent.js) defines `{ key: 'battery', label: 'Battery' }`. All 4 templates render `csr.battery` under "Battery" label. No rename to "Charging Alternator Condition" anywhere. |
| **Call Type field missing from all 4 templates** | **CONFIRMED** | `CsrFormScreen.tsx` collects `call_type`. `CsrObject` has `call_type: string`. PulseFrame and SignalBands access `csr.call_type` for the Problem section. **However**, Zinc and Crimson do NOT render `call_type` — they only render `problem_reported` and `system_down`. |

### 9.3 Styling Bugs

| Issue | Verdict | Evidence |
|---|---|---|
| **Zinc Light rendering bug — accent color not applied properly** | **PARTIALLY CONFIRMED** | `Zinc.tsx:18-20` calls `getFillablePdfTheme(designPreset)` which returns custom colors when `useCustomColors && accentColor` is truthy. However, base page colors are hardcoded: `color: '#09090b'` (line 27), `companyName: { color: '#09090b' }` (line 43). The `getFillablePdfTheme` only overrides `readingsSection` and `sectionTitle` colors — NOT the main body text. So toggling Zinc Light ON with custom accent color does apply to some elements but not the header/body text. |
| **Crimson Materials section overflow** | **CONFIRMED** | `CrimsonMaterialsStyles.ts` defines `materialsRow: { minHeight: 34 }` and `materialsCol2: { flexShrink: 0, width: 60 }`. Fixed dimensions with no page-break logic. Long materials list flows outside boundaries. |

### 9.4 Additional Findings

| Issue | Verdict | Evidence |
|---|---|---|
| **PulseFrame page overflow** | **CONFIRMED** | `PulseFrame.tsx` creates density-based styles (line 47-49) but has no `break-inside: avoid` or page-break logic. Long content overflows the single A4 page. |
| **Technician signature label** | **PARTIALLY CONFIRMED** | Templates use `technicianRole` for label text (e.g., "Technician Signature (role)"). The label is role-dependent, not a fixed "Signature/Name" title. This is a design choice, not a bug — but may not match user expectations. |
| **Linked Invoice field** | **CONFIRMED** | `CsrObject` in `csrUtils.ts` has no `linked_invoice_id` field. `csrService.ts` CsrRow has it, but the PDF interface doesn't pass it through. Not rendered in any template. |

---

## 10. Audit Methodology

1. Read `CsrFormScreen.tsx` — enumerated every form field and its binding
2. Read `csrUtils.ts` — traced `buildCsrPreviewData` input/output, `CsrObject` interface, `parseCsrMaterials` logic
3. Read `preview-templates/types.ts` — confirmed `CsrPdfProps` interface (uses `csr: any`)
4. Read `preview-templates/utils.ts` — catalogued helper functions available to templates
5. Read `preview-templates/layoutModel.ts` — confirmed materials layout logic
6. Read `preview-templates/components.tsx` — confirmed all shared components and their field access
7. Read `preview-templates/index.tsx` — confirmed template dispatcher routing
8. Read all 4 templates (PulseFrame, SignalBands, Zinc, Crimson) — field-by-field audit
9. Read `CSRPreviewContent.js` — confirmed `CSR_READING_FIELDS`, `CSR_STATUS_OPTIONS`, `CSR_STATUS_OPTIONS_PDF`
10. Read `CSRPreviewPanel.tsx` — confirmed `mapCsrToPreviewData` web preview path
11. Cross-referenced form fields against template consumption to identify mismatches
