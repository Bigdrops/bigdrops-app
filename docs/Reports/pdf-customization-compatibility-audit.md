# PDF Customization Engine Compatibility Audit

**Date:** 2026-07-06
**Auditor:** OpenCode via Local Runner
**Scope:** Zero-code compatibility audit of `docs/PRD/pdf-customization-extension-system.md` against existing codebase and `docs/STANDARD/` standards.

---

## Executive Summary

The PRD describes a centralized PDF Customization Engine with Template Defaults, Customization Policy, User-Saved Settings, and Resolved Theme pipeline. The actual codebase has **three separate PDF systems** with no shared engine, inconsistent persistence (localStorage vs database), and no formalized customization policy or resolved theme concept. The PRD is architecturally sound but describes a state that does not exist yet — it is a forward-looking specification, not a documentation of current behavior.

---

## 1. PDF Engine Inventory

### 1.1 Three Distinct PDF Systems

| System | Path | Templates | Template IDs | Document Types |
|--------|------|-----------|--------------|----------------|
| **pdf-new** (Invoice/Quotation) | `src/components/pdf-new/` | Industry, Ledger, Crest, Minimal, Evergreen, Bolt, Ember | `'industry' \| 'ledger' \| 'crest' \| 'minimal' \| 'evergreen' \| 'bolt' \| 'ember'` | Invoice, Quotation |
| **Waybill** | `src/components/waybill/` | Thermal, Slate, Premium, Minimal, Evergreen, Classic | Numeric/string IDs via `custom_fields.pdfTemplateId` | Waybill |
| **CSR** | `src/components/csr/preview-templates/` | SignalBands, Zinc, Crimson, Minimal | `'2' \| '3' \| '4' \| '6'` (variant strings) | CSR |

**Finding:** No shared engine exists. Each system is independent with its own template rendering, style resolution, and font handling.

### 1.2 Engine Entry Points

| System | Entry Point | Generation Function |
|--------|-------------|---------------------|
| pdf-new | `src/components/pdf-new/index.ts` | `generateInvoicePdf()`, `generateQuotationPdf()` |
| Waybill | `src/components/waybill/blankWaybillTemplate.tsx` | Direct `pdf()` call from `@react-pdf/renderer` |
| CSR | `src/components/csr/preview-templates/index.tsx` | `getCsrPdfDocument()` |

**Conflict with PRD:** The PRD assumes a single "PDF Customization Engine" that owns all document types. The codebase has three disconnected systems.

---

## 2. Persistence Architecture

### 2.1 Storage Key Map

| What | Where | Key/Field | Scope |
|------|-------|-----------|-------|
| Invoice design preset | localStorage | `invoice_pdf_design_preset` | Per-browser |
| Quotation design preset | localStorage | `quotation_pdf_design_preset` | Per-browser |
| CSR design preset | localStorage | `csr_pdf_design_preset` | Per-browser |
| Waybill design preset | localStorage | `waybill_pdf_design_preset` | Per-browser |
| Invoice output toggles | database `custom_fields` | `pdfOutput` | Per-document |
| Quotation output toggles | database `custom_fields` | `pdfOutput` | Per-document |
| Invoice template ID | database `custom_fields` | `pdfTemplateId` | Per-document |
| Quotation template ID | database `custom_fields` | `pdfTemplateId` | Per-document |
| Waybill template ID | database `custom_fields` | `pdfTemplateId` | Per-document |

### 2.2 Critical Finding: Split Persistence

Design presets (colors, fonts) live in **localStorage** — per-browser, not per-user, not synced. Output toggles (bank details, footer, tagline) live in the **database** `custom_fields` column — per-document, synced.

**Conflict with PRD:** The PRD states "User-Saved Settings — stored in database." Design presets are NOT in the database. This is a gap.

**Risk:** If a user switches browsers or devices, their color/font customizations are lost. Output toggles survive because they're in the database.

---

## 3. Font Registration Architecture

### 3.1 Font Registry (`src/lib/pdfFontRegistry.ts`)

Singleton pattern with `let pdfFontsRegistered = false`. Registers three font categories:

1. **Fillable fonts** (6 families): Patrick Hand, Handlee, Caveat, Sue Ellen Francisco, Kalam, Reenie Beanie — from `src/assets/pdf-fonts/`
2. **Shared fonts** (10 families): Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Raleway, Orbitron, Source Sans Pro, Roboto Condensed — from `@fontsource/*`
3. **Locked shared fonts** (2 families): Noto Sans (currency), Cormorant Garamond (Crest template)

### 3.2 Font Resolution Chain (`src/lib/pdfDesignPreset.ts`)

```
resolvePdfFontFamily(choice, variant)
  → isRegisteredSharedFontChoice? → getRegisteredSharedFontConfig(choice).family
  → getRegisteredFillablePdfFontFamily(choice, variant)
  → fallback: Helvetica/Helvetica-Bold/Helvetica-Oblique
```

### 3.3 Builtin Font Fallback

When `useCustomFonts` is false, templates use hardcoded `'Helvetica'` and `'Helvetica-Bold'` strings directly in StyleSheet definitions. The `resolvePdfFontFamily()` function is only called when `useCustomFonts === true`.

**Conflict with PRD:** The PRD says "Engine owns font registration." Currently, font registration is a global singleton — it doesn't know about document types. The same fonts are registered for all document types. There's no per-document-type font policy.

---

## 4. Template System Architecture

### 4.1 Template Selection Flow (Invoice/Quotation)

```
customFields.pdfTemplateId
  → normalizeInvoicePdfTemplateId()
  → generatePdf() switch statement
  → Template component + adaptCommercialDocumentData()
```

Template IDs are validated against `INVOICE_PDF_TEMPLATE_IDS = ['industry', 'ledger', 'crest', 'minimal', 'evergreen', 'bolt', 'ember']`.

Legacy values `'naijabiz'` and `'apex'` are explicitly rejected (return `null`).

### 4.2 Design Preset Flow

```
getPdfDesignPreset(documentType)  // reads localStorage
  → sanitizePdfDesignPreset(raw, documentType)
  → PdfDesignPreset { useCustomColors, useCustomFonts, accentColor, ... }
```

The preset is passed into templates via `model.template.designPreset`.

### 4.3 Template Data Adaptation

`adaptCommercialDocumentData()` in `src/components/pdf-new/industryAdapter.ts` converts `PdfDocumentModel` → `CommercialDocumentData`. This is the single transformation layer between the domain model and template rendering.

**Conflict with PRD:** The PRD describes "Template Defaults — stored in database per document type." Template defaults don't exist as a concept. Each template has hardcoded default styles in its `*Styles.ts` file. The design preset overrides these at runtime.

---

## 5. Customization Policy Analysis

### 5.1 What Users Can Customize Today

| Feature | Invoice | Quotation | CSR | Waybill |
|---------|---------|-----------|-----|---------|
| Template selection | Yes | Yes | Yes | Yes |
| Accent color | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Text color | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Muted color | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Border color | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Surface color | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Header font | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Body font | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Fillable font | Yes (design preset) | Yes (design preset) | Yes (design preset) | Yes (design preset) |
| Bank account | Yes | Yes | N/A | N/A |
| Show footer | Yes | Yes | N/A | N/A |
| Show tagline | Yes | Yes | N/A | N/A |
| Show balance due | Yes | N/A | N/A | N/A |
| Show amount in words | Yes | Yes | N/A | N/A |
| Show VAT % | Yes | N/A | N/A | N/A |
| Show WHT % | Yes | N/A | N/A | N/A |
| Show discount % | Yes | N/A | N/A | N/A |
| Compact mode | Yes | Yes | N/A | N/A |
| Landscape layout | Yes | Yes | N/A | N/A |
| Page orientation | Yes | Yes | N/A | N/A |

### 5.2 What's Missing vs PRD

| PRD Requirement | Status | Gap |
|-----------------|--------|-----|
| Template Defaults (database) | Not implemented | Defaults are hardcoded in template styles |
| Customization Policy (per document type) | Not implemented | No policy object exists |
| Resolved Theme (runtime merge) | Partial | `resolveDesignTokens()` does color/font merge, but no formal "theme" object |
| Engine owns UI | Partial | UI is scattered across `PdfOutputSettings.tsx`, `PdfOutputCustomizeSheet.tsx`, view pages |
| Engine owns preview | No | Preview is inline in each view page |
| Documents declare capabilities | No | No capability declaration per document type |
| Documents declare policy | No | No policy declaration per document type |

---

## 6. Standards Compatibility Matrix

### 6.1 Receipt Standard (`receipt-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| §2: PDF constraints | ✅ | Templates are dumb renderers |
| §3: Numbering | ✅ | Numbering via `prefixConstants.ts`, not PDF engine |
| §4: Template structure | ⚠️ | No formal template capability declaration |

### 6.2 Prefix Engine Standard (`prefix-engine-settings-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| §3: Document numbering | ✅ | PDF engine doesn't touch numbering |
| §5: Template IDs | ⚠️ | `INVOICE_PDF_TEMPLATE_IDS` is hardcoded, not from prefix engine |

### 6.3 Lifecycle Ownership Standard (`lifecycle-ownership-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| §7: PDF generation | ✅ | PDF generation is a terminal lifecycle event |
| §7: Dumb renderer rule | ✅ | Templates receive shaped data, don't compute |

### 6.4 Document Transformation Standard (`document-transformation-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| §5: PDF output | ✅ | PDF output follows transformation rules |
| Edit/Versioning/Deletion | ✅ | PDF generation is stateless |

### 6.5 Document Save Orchestration (`document-save-orchestration.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| Save flow | ✅ | `pdfOutput` is part of save payload |
| Template ID persistence | ✅ | `pdfTemplateId` saved in `custom_fields` |

### 6.6 Document Image Upload Policy (`document-image-upload-policy.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| Image validation | ✅ | PDF templates use validated image URLs |
| Logo handling | ✅ | `resolveCanonicalLogoUrl()` in adapter |

### 6.7 Document Column Standard (`document-column-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| Column ordering | ✅ | PDF respects `pdfWidth`/`pdfFlex` from column config |
| Custom columns | ✅ | `PdfColumnDefinition` supports custom columns |

### 6.8 Audit Trail Standard (`audit-trail-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| Activity tracking | ⚠️ | PDF customization changes not tracked in audit trail |
| Document actions | ⚠️ | No audit event for template switch or design preset change |

### 6.9 Commercial Party Architecture Standard

| Rule | Compatible? | Notes |
|------|-------------|-------|
| Placeholder | N/A | Standard is "coming soon" |

### 6.10 JSON Import Standard (`json-import-standard.md`)

| Rule | Compatible? | Notes |
|------|-------------|-------|
| Import discipline | ✅ | PDF templates don't use JSON imports |

---

## 7. Architectural Conflicts & Risks

### 7.1 Three Separate Systems (HIGH)

The PRD assumes one engine. The codebase has three. Merging them is a significant architectural undertaking.

**Recommendation:** The PRD should acknowledge the three-system reality and specify whether:
- (a) All three systems should be unified into one engine, or
- (b) Each system gets its own customization policy, or
- (c) Only Invoice/Quotation gets the engine (waybill/CSR stay separate)

### 7.2 localStorage vs Database (MEDIUM)

Design presets in localStorage means:
- Not synced across devices
- Lost on browser clear
- Not accessible from mobile app (Capacitor)
- Not visible in admin/database queries

**Recommendation:** Move design presets to database `custom_fields` alongside `pdfOutput`.

### 7.3 No Template Capability Declaration (MEDIUM)

The PRD says "Documents declare capabilities." Currently, no template declares what it supports. The UI hardcodes which toggles to show per document type.

**Recommendation:** Add a `PdfTemplateCapabilities` type that each template exports.

### 7.4 No Customization Policy Object (MEDIUM)

The PRD says "Customization Policy — per document type." No such object exists. The rules are implicit in UI components.

**Recommendation:** Create a `PdfCustomizationPolicy` type per document type.

### 7.5 Audit Trail Gap (LOW)

PDF customization changes (template switch, color change) are not tracked in the audit trail. Only document saves are tracked.

**Recommendation:** Add audit events for template/design changes if audit trail standard requires it.

---

## 8. PRD Critical Review

### 8.1 Strengths
- Clear separation of concerns (Defaults vs Policy vs Settings vs Theme)
- Documents declare capabilities (future-proof)
- Engine owns persistence (centralized)

### 8.2 Weaknesses
- Describes a state that doesn't exist — no mapping to current code
- Assumes single engine — codebase has three
- Assumes database persistence for settings — codebase uses localStorage
- No mention of waybill or CSR in PRD scope
- No migration path from current state to PRD state

### 8.3 Recommendations
1. Add a "Current State" section to the PRD documenting the three-system reality
2. Specify whether waybill/CSR are in scope
3. Add a migration strategy for localStorage → database
4. Define the `PdfTemplateCapabilities` and `PdfCustomizationPolicy` types
5. Specify the "Resolved Theme" merge order explicitly

---

## 9. File Inventory

### Core PDF Engine Files
- `src/components/pdf-new/index.ts` — Engine entry point
- `src/components/pdf-new/types.ts` — Data model types
- `src/components/pdf-new/designTokens.ts` — Design token resolution
- `src/components/pdf-new/industryAdapter.ts` — Model → template data adapter
- `src/components/pdf-new/renderers/PdfRenderer.tsx` — Document wrapper
- `src/components/pdf-new/templates/*.tsx` — 7 template components
- `src/components/pdf-new/templates/*Styles.ts` — 7 style modules
- `src/components/pdf-new/engine/*.ts` — Pure behavior functions
- `src/components/pdf-new/core/*.ts` — Shared rendering utilities
- `src/components/pdf-new/presentation/industry/*.tsx` — Industry template components

### Font System Files
- `src/lib/pdfFontRegistry.ts` — Singleton font registration
- `src/lib/pdfFillableFonts.ts` — 6 handwriting font configs
- `src/lib/pdfSharedFonts.ts` — 10 shared + 2 locked font configs
- `src/lib/pdfDesignPreset.ts` — Design preset types, defaults, normalization

### Waybill PDF Files
- `src/components/waybill/*.tsx` — 6 template components
- `src/components/waybill/blankWaybillTemplate.tsx` — Blank waybill generation
- `src/components/waybill/waybillUtils.ts` — Waybill utilities

### CSR PDF Files
- `src/components/csr/preview-templates/*.tsx` — 4 template components
- `src/components/csr/preview-templates/index.tsx` — Template registry

### UI Components
- `src/components/PdfOutputSettings.tsx` — Output toggle UI
- `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` — Full customization sheet
- `src/components/document-view/shared/DocumentOptionsCard.tsx` — Document options card

### Domain Files
- `src/domain/invoice/types.ts` — `InvoicePdfOutput`, `InvoicePdfTemplateId`
- `src/domain/invoice/previewModel.ts` — Invoice preview model
- `src/domain/invoice/pdfRender.contract.ts` — PDF render contract
- `src/domain/quotation/pdfDownloadHandler.ts` — Quotation PDF download
- `src/domain/quotation/previewModel.ts` — Quotation preview model
- `src/domain/document/pdfSummaryLabels.ts` — PDF summary labels

### Hook Files
- `src/hooks/useInvoiceSave.ts` — Invoice save with pdfOutput
- `src/hooks/useInvoiceEditableState.ts` — Invoice editable state with pdfOutput
- `src/hooks/useQuotationViewData.ts` — Quotation view data with pdfOutput
- `src/hooks/useQuotationActions.ts` — Quotation actions with template switching
- `src/hooks/useQuotationSave.ts` — Quotation save with pdfOutput

### Test Files
- `src/tests/pdf-new/pdfCurrency.test.js`
- `src/tests/invoice/pdfRegressionCleanup.test.js`
- `src/tests/csr/pdfTemplateLayout.test.js`

---

## 10. Verification

- **bun run typecheck:** Not run (zero-code audit)
- **bun run lint:** Not run (zero-code audit)
- **bun run build:** Not run (zero-code audit)
- **git status:** Pending verification
