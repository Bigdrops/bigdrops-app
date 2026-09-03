# CSR System Integrity Audit

**Date:** 2026-06-22
**Scope:** Full field-to-template audit — form layer, data model, PDF prop contract, template rendering, signature trace
**Status:** Read-only audit — no code changes

---

## 1. Executive Summary

The CSR pipeline has **significant structural fragility** across all layers. The core problem: **zero compile-time enforcement** from model → props → templates. Every boundary uses `any` or `Record<string, any>`, meaning field mismatches are silent runtime bugs, not compile errors.

**Severity summary:** 3 CRITICAL, 5 HIGH, 4 MEDIUM, 6 LOW findings.

---

## 2. Form Layer (`CsrFormScreen.tsx`)

**Observed:** 27+ fields collected including: `client_name`, `date`, `equipment_type`, `make`, `model`, `serial_no`, `capacity`, `equipment_location`, `address`, `po_number`, `problem_reported`, `status`, `start_date`, `start_time`, `end_date`, `end_time`, `call_type`, `system_down`, `voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours`, `materials_used`, `service_rendered`, `defects_found`, `engineer_remarks`, `acknowledgement_name`, `technician_signatory_id`, `signature_image_url`, `design_preset`, `pdf_font_choice`, `show_po`.

**Key anomaly:** `call_type` and `system_down` are collected but the form stores `system_down` as a `boolean` while the DB column is also `boolean` — consistent. However, `call_type` is missing from Zinc and Crimson templates.

---

## 3. Model Layer (`csrUtils.ts`)

**Observed:** `CsrObject` is `Record<string, any>` — no typed interface. `buildCsrPreviewData` does:
- Spreads `...csr` (all fields pass through)
- Parses `materials_used` for meta flags via `__CSR_META_V1__` prefix
- Aliases `engineer_remarks` → `technicianRemarks`
- Resolves `technicianName` from signatories or meta
- Computes `layoutDensity` from content length

**Critical:** `DEFAULT_CSR_META` hardcodes `modelLabel: 'Model'`, `serialLabel: 'Serial No.'`, `showOperationalReadings: true`, `showAcknowledgement: true`, `recipientTitle: 'Received By / Witness'`, `technicianName: ''`.

---

## 4. PDF Prop Contract (`preview-templates/types.ts`)

**Observed:**
```typescript
export type CsrPdfProps = {
  csr: any;
  branding?: any;
  designPreset?: any;
}
```

**CRITICAL:** All three props are `any`. No enforced shape. Templates can access any property without type safety. `getCsrPdfDocument` in `index.tsx` also uses `any` for its parameter.

---

## 5. Template Layer (all 4 templates)

**Field consumption matrix** (from code + previous audit):

| Field | PulseFrame | SignalBands | Zinc | Crimson |
|---|---|---|---|---|
| `service_rendered` | ✗ | ✗ | ✗ | ✗ |
| `defects_found` | ✗ | ✗ | ✗ | ✗ |
| `customer_feedback` | ✓ | ✗ | ✗ | ✗ |
| `acknowledgement_name` | ✓ | ✓ | ✓ | ✗ |
| `call_type` | ✓ | ✓ | ✗ | ✗ |
| `engineer_remarks` | ✓ (as `technicianRemarks`) | ✗ | ✗ | ✗ |

**CRITICAL:** `service_rendered` and `defects_found` are collected by the form but **never rendered by any template**. These are orphaned fields.

---

## 6. Signature Trace

**Dual-path architecture:**

1. **Technician signature line:** `csr.technicianSignUrl` → rendered via `getTechnicianSignatureUrl(csr)` in utils.ts → displayed inline in PulseFrame/SignalBands (sign line) or via `PdfSignatureCard` in Zinc.

2. **Acknowledgement card:** `signatory.signature_url` → `PdfSignatureCard` component → rendered in Zinc only. PulseFrame and SignalBands have inline acknowledgement sections without signature image.

3. **Crimson:** No `PdfSignatureCard` import. Uses inline signature rendering only (technician sign line, no acknowledgement card).

**HIGH:** `technicianSignatoryId` → `technician_signatory_id` in DB → mapped to `technicianSignatory` in model → templates access `technicianSignatory?.signature_url`. But `getTechnicianSignatureUrl()` also checks `csr.signature_url` and `csr.technicianSignUrl` as fallbacks — three different property names for the same data.

---

## 7. Critical Anomalies

### CRITICAL
1. **Zero type safety across entire pipeline.** `CsrObject = Record<string, any>`, `CsrPdfProps.csr: any`, `getCsrPdfDocument` param `any`. A field rename in the form silently breaks template rendering.

2. **Orphaned fields.** `service_rendered` and `defects_found` are collected in the form, stored in DB (`service_rendered text`, `defects_found text`), but no template renders them. Data is saved but invisible on output.

3. **Meta serialization hack.** Operational display flags (`showOperationalReadings`, `modelLabel`, `serialLabel`, `showAcknowledgement`, `recipientTitle`, `recipientRole`, `technicianName`, `showTechnicianSignLine`, `materialsOutputStyle`) are serialized into `materials_used` column with `__CSR_META_V1__` prefix. This column mixes materials data with UI control flags.

### HIGH
4. **Signature triple-naming.** The same signature URL can be at `signature_url`, `signatureUrl`, `technicianSignUrl`, or `technicianSignatory.signature_url`. Templates use different access paths.

5. **No page-break control.** All 4 templates render on single A4 page with no `break-inside: avoid` or overflow handling. Dense content overflows silently.

6. **Status options duplicated.** `CSR_STATUS_OPTIONS` (web preview) and `CSR_STATUS_OPTIONS_PDF` (Crimson template) are separate hardcoded lists — drift risk.

### MEDIUM
7. **`resolution` field phantom.** Previous audit flagged `resolution` as orphaned. Current code confirms `CsrObject` has no `resolution` property and no template reads it.

8. **DB schema mismatch.** `technician_signatory_id` exists in DB but `CsrObject` in `csrUtils.ts` doesn't explicitly declare it — it passes through via `Record<string, any>` spread.

---

## 8. Risks

| Risk | Impact | Likelihood |
|---|---|---|
| Field rename in form breaks template silently | HIGH | HIGH (no type safety) |
| New status option added but not in PDF checklist | MEDIUM | MEDIUM |
| Long content overflows single-page PDF | HIGH | HIGH (no page-break logic) |
| Meta flags lost if `materials_used` column is sanitized | HIGH | LOW |
| Signature URL access fails due to wrong property name | MEDIUM | MEDIUM (3 naming conventions) |
| Crimson has no acknowledgement section — client can't sign | MEDIUM | BY DESIGN (but undocumented) |

---

## 9. DB Schema Verification (`20260520090004_csrs.sql`)

Confirmed columns:
- `service_rendered text` — exists, collected, never rendered
- `defects_found text` — exists, collected, never rendered
- `technician_signatory_id uuid` — FK to `signatories(id)`
- `materials_used text` — stores both materials JSON and meta flags
- `system_down boolean DEFAULT false` — consistent with form
- `call_type text` — exists, missing from Zinc/Crimson templates

---

## 10. Files Referenced

| File | Role |
|---|---|
| `src/components/csr/CsrFormScreen.tsx` | Form UI — all field definitions |
| `src/components/csr/csrUtils.ts` | Model builder, meta serialization, defaults |
| `src/components/csr/CSRPreviewContent.js` | Reading fields, status options, template variants |
| `src/components/csr/CSRPreviewPanel.tsx` | Web preview panel |
| `src/components/csr/preview-templates/types.ts` | `CsrPdfProps` contract (all `any`) |
| `src/components/csr/preview-templates/utils.ts` | Shared PDF utilities |
| `src/components/csr/preview-templates/layoutModel.ts` | Materials layout, lifecycle stages |
| `src/components/csr/preview-templates/components.tsx` | Shared PDF components |
| `src/components/csr/preview-templates/index.tsx` | Template dispatcher |
| `src/components/csr/preview-templates/PulseFrame.tsx` | Template 1 |
| `src/components/csr/preview-templates/SignalBands.tsx` | Template 2 |
| `src/components/csr/preview-templates/Zinc.tsx` | Template 3 |
| `src/components/csr/preview-templates/Crimson.tsx` | Template 4 |
| `src/pages/NewCSR.tsx` | Page wiring |
| `src/pages/EditCSR.tsx` | Edit orchestration |
| `src/pages/ViewCSR.tsx` | View page with PDF generation |
| `src/components/document-view/csr/CsrDocumentPreview.tsx` | Embedded document preview |
| `src/domain/csr/csrService.ts` | DB operations |
| `supabase/migrations/20260520090004_csrs.sql` | CSR table migration |

---

*Audit complete. All code paths observed, no assumptions made.*
