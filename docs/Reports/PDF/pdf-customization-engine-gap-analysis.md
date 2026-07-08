# PDF Customization Engine — Implementation Gap Analysis

**Date:** 2026-07-07
**Source PRD:** `docs/PRD/pdf-customization-extension-system.md`
**Status:** Zero-code audit. No application code was modified.

---

## 1. Executive Summary

The frozen PRD defines a **4-layer customization architecture** (Template Defaults → Customization Policy → User-Saved Settings → Resolved Theme) with a central engine owning persistence, template switching, validation, font registration, UI, and preview across four document families (Invoice, Quotation, CSR, Waybill).

**Current state:** The codebase has **three independent customization subsystems** that partially overlap with the PRD vision. Invoice/Quotation share a unified entry point and most templates. Waybill and CSR are fully isolated pipelines with their own template dispatch, font registration, and persistence. No formal capability declaration, customization policy, resolver pipeline, or versioned settings exist.

**Gap severity:** The implementation is approximately **40% aligned** with the PRD. The missing 60% consists of architectural abstractions (capability declarations, policy layer, resolver, versioning) that the PRD treats as first-class concepts but the codebase handles ad-hoc or not at all.

---

## 2. PRD Responsibility Map

| PRD Responsibility | Current Implementation | Status |
|---|---|---|
| **Template Defaults** — Each template declares its own defaults | `DEFAULT_PRESETS` in `pdfDesignPreset.ts` provides per-document-type defaults. Templates do NOT declare their own defaults. | ⚠️ Partial |
| **Customization Policy** — Per-template rules for which fields are user-editable | No policy object exists. Editable fields are hardcoded in each view page's sheet UI. | ❌ Missing |
| **User-Saved Settings** — Persisted per-document customization | `PdfDesignPreset` saved to localStorage via `setPdfDesignPreset()`. Template ID saved to localStorage (CSR, Waybill) or `custom_fields` DB column (Waybill). | ⚠️ Inconsistent |
| **Resolved Theme** — Merged final theme passed to renderer | `PdfDesignPreset` object passed directly as `designPreset` prop. No formal resolver/merge step. | ⚠️ Partial |
| **Template Switching** — Runtime template selection | Switch statement in `pdf-new/index.ts:78-108` (Invoice/Quotation). If-else chain in `WaybillPDF.tsx:34-54`. `getCsrPdfDocument()` if-else in `preview-templates/index.tsx:33-36`. | ✅ Functional |
| **Font Registration** — Centralized font loading | `registerPdfFonts()` (shared + fillable) for Invoice/Quotation. `registerPdfFillableFonts()` (fillable only) for Waybill and CSR. Two separate registration paths. | ⚠️ Split |
| **Persistence Engine** — DB-backed settings storage | Invoice/Quotation: localStorage only (design preset) + `custom_fields` DB (template ID, output toggles). Waybill: localStorage + `custom_fields` DB. CSR: localStorage only, no DB save. | ⚠️ Inconsistent |
| **Customization UI** — Unified sheet/panel | `PdfOutputCustomizeSheet` for Invoice/Quotation (shared). Custom inline sheets in `ViewCSR.tsx:307-447` and `ViewWaybill.tsx:367-517`. Three different UI implementations. | ⚠️ Fragmented |
| **Preview** — Live preview of customization changes | Invoice/Quotation: CSS/HTML preview via `usePdfPreviewDocument` (no live PDF). Waybill: `WaybillDocumentPreview` renders React-PDF element. CSR: `CsrDocumentPreview` renders React-PDF element. | ⚠️ Inconsistent |
| **Validation** — Schema validation of settings | `sanitizePdfDesignPreset()` validates hex colors and font choices. No schema validation for output toggles or template-specific constraints. | ⚠️ Partial |
| **Capability Declaration** — Templates declare what they support | None. All templates receive the same `PdfDesignPreset` prop regardless of capability. | ❌ Missing |
| **Versioned Settings** — Migration support for schema changes | None. `PdfDesignPreset` has no version field. Legacy font names are handled via `normalizeFillableFontChoice()` but no formal migration. | ❌ Missing |

---

## 3. Pipeline-by-Pipeline Findings

### 3.1 Invoice Pipeline

**Entry:** `generateInvoicePdf()` → `generatePdf()` at `src/components/pdf-new/index.ts:119-121`
**Templates:** 7 (Industry, Ledger, Crest, Minimal, Evergreen, Bolt, Ember) — shared with Quotation
**Design preset:** `getPdfDesignPreset('invoice')` → localStorage `invoice_pdf_design_preset`
**Output toggles:** `PdfOutputSettingsValue` (11 fields) in `src/components/PdfOutputSettings.tsx:24-36`
**Template ID storage:** `custom_fields.pdfTemplateId` in Supabase `invoices` table
**Font registration:** `registerPdfFonts()` (shared + fillable) at `pdf-new/index.ts:71`
**Adapter:** `adaptCommercialDocumentData()` at `src/components/pdf-new/industryAdapter.ts`
**Persistence:** Design preset → localStorage. Template ID + output toggles → `custom_fields` DB column.
**UI:** `PdfOutputCustomizeSheet` at `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx`
**Preview:** CSS/HTML preview via `usePdfPreviewDocument` (no live PDF render)

**Key observations:**
- `generatePdf()` receives `template.designPreset` in the model but does NOT pass it to templates. The preset is embedded in the model object but templates access it via their own prop drilling.
- All 7 templates receive identical `adaptCommercialDocumentData()` output — no template-specific data shaping.
- The `PdfDocumentModel.template` field exists but is only used for `designPreset` passthrough; no capability metadata.

### 3.2 Quotation Pipeline

**Entry:** `generateQuotationPdf()` → `generatePdf()` at `src/components/pdf-new/index.ts:123-125` (shared with Invoice)
**Templates:** Same 7 as Invoice
**Design preset:** `getPdfDesignPreset('quotation')` → localStorage `quotation_pdf_design_preset`
**Output toggles:** Dual types:
- `PdfOutputState` (4 fields: `showBankDetails`, `showTagline`, `showFooter`, `compact`) on form page
- `PdfOutputSettingsValue` (11 fields) on view page via `PdfOutputCustomizeSheet`
**Template ID storage:** `custom_fields.pdfTemplateId` in Supabase `quotations` table
**Font registration:** Shared with Invoice via `registerPdfFonts()`
**Persistence:** Design preset → localStorage. Template ID + output toggles → `custom_fields` DB column.
**Preview:** CSS/HTML preview only (no live PDF)

**Key observations:**
- Quotation reuses the entire Invoice PDF pipeline — same `generatePdf()`, same templates, same adapter.
- The `PdfOutputState` type on the form page is a strict subset of `PdfOutputSettingsValue` — potential confusion.
- No `landscapeLayout` field in `PdfOutputState` (only in `PdfOutputSettingsValue`).

### 3.3 Waybill Pipeline

**Entry:** `WaybillPDF` component at `src/components/waybill/WaybillPDF.tsx:25`
**Templates:** 6 (Evergreen, Minimal, Thermal, Classic, Premium, Slate) — completely separate from Invoice
**Design preset:** `getPdfDesignPreset('waybill')` → localStorage `waybill_pdf_design_preset`
**Output toggles:** No `PdfOutputSettingsValue`. Custom fields parsed from `custom_fields` JSON.
**Template ID storage:** `custom_fields.pdfTemplateId` in Supabase `waybills` table + localStorage `waybill_view_template`
**Font registration:** `registerPdfFillableFonts()` (fillable only) at `WaybillPDF.tsx:23`
**Render model:** `WaybillRenderModel` assembled by `buildWaybillRenderModel()` at `src/domain/waybill/engine/assembly.ts`
**Persistence:** Design preset → localStorage. Template ID → `custom_fields` DB + localStorage. Custom font/color → localStorage only.
**UI:** Inline sheet in `ViewWaybill.tsx:367-517` with `WaybillTemplateSelector` + `DocumentTemplateDesignOverrides` + custom font/color toggles
**Preview:** `WaybillDocumentPreview` renders `<WaybillPDF>` as React-PDF element (live preview)

**Key observations:**
- Only Evergreen template supports fillable fonts (verified in `EvergreenTemplate.tsx`). Other templates ignore `designPreset.fillableFont`.
- No `PdfOutputSettingsValue` type — waybill output is entirely driven by `WaybillRenderModel` + `custom_fields`.
- Save handler writes to both localStorage AND `custom_fields` DB (`ViewWaybill.tsx:486-506`).
- Template selector is `WaybillTemplateSelector` (separate component from `PdfOutputCustomizeSheet`'s template carousel).

### 3.4 CSR Pipeline

**Entry:** `getCsrPdfDocument()` at `src/components/csr/preview-templates/index.tsx:30-37`
**Templates:** 4 (SignalBands/Template2, Zinc/Template3, Crimson/Template4, Minimal/Template6) — completely separate
**Design preset:** `getPdfDesignPreset('csr')` → localStorage `csr_pdf_design_preset`
**Output toggles:** No `PdfOutputSettingsValue`. Custom font/color via localStorage keys `csr_custom_font`, `csr_custom_color`.
**Template ID storage:** localStorage `csr_view_template` only — **NO DB persistence** for template selection.
**Font registration:** `registerPdfFillableFonts()` (fillable only) at `preview-templates/index.tsx:12`
**Persistence:** ALL settings localStorage-only. Template, font, color, design preset — none saved to Supabase.
**UI:** Inline sheet in `ViewCSR.tsx:307-447` with `CsrTemplateCarousel` + custom font/color toggles + `DocumentTemplateDesignOverrides`
**Preview:** `CsrDocumentPreview` renders `getCsrPdfDocument()` as React-PDF element (live preview)

**Key observations:**
- CSR is the ONLY pipeline with zero DB persistence for customization settings.
- Template variant keys are non-sequential: `2`, `3`, `4`, `6` (no `1` or `5`).
- `getCsrPdfDocument()` receives `designPreset` prop and passes it to each template.
- CSR templates use `getBranding()` utility at `preview-templates/utils.ts` to shape branding data.
- The save handler (`ViewCSR.tsx:433-441`) only writes to localStorage — no Supabase call.

---

## 4. Missing PRD Concepts

### 4.1 Capability Declaration (❌ Missing)

**PRD expects:** Each template declares what customization fields it supports (e.g., "supports fillable fonts: yes", "supports accent color: no").

**Current state:** No capability metadata exists on any template. All templates receive the full `PdfDesignPreset` regardless of whether they use it. For example, only Evergreen waybill template uses `fillableFont`, but all 6 templates receive it.

**Impact:** The engine cannot enforce per-template constraints. Users may customize fields that have no visual effect.

### 4.2 Customization Policy Layer (❌ Missing)

**PRD expects:** A policy object per template that maps capability declarations to user-facing control visibility.

**Current state:** Control visibility is hardcoded in each view page's sheet UI. `ViewCSR.tsx` shows 4 handwriting fonts. `ViewWaybill.tsx` shows 6. `PdfOutputCustomizeSheet` shows the full design preset editor. No centralized policy.

**Impact:** Adding a new template or changing which controls appear requires modifying the view page code directly.

### 4.3 Resolver Pipeline (⚠️ Partial)

**PRD expects:** A formal resolver that merges Template Defaults → Policy → User Settings → Resolved Theme.

**Current state:** `sanitizePdfDesignPreset()` in `pdfDesignPreset.ts:208-229` performs normalization (hex colors, font choices) but does NOT merge layers. The "merge" is implicit: `getPdfDesignPreset()` returns the last-saved user settings (or defaults if none saved). No template defaults are consulted.

**Impact:** Template-specific defaults (e.g., Evergreen's green accent) are lost when user settings override them.

### 4.4 Versioned Settings (❌ Missing)

**PRD expects:** Settings schema versioning with migration support.

**Current state:** `PdfDesignPreset` has no version field. Legacy font names (`Biro Script`, `Ballpoint Handwriting`, `Ballpoint Rush`) are handled via `normalizeFillableFontChoice()` at `pdfDesignPreset.ts:192-194` but this is ad-hoc, not a migration framework.

**Impact:** Schema changes require manual normalization in code. No automated migration path for existing user settings.

### 4.5 Font Registry Unification (⚠️ Split)

**PRD expects:** A single font registration entry point.

**Current state:** Two separate functions:
- `registerPdfFonts()` at `src/lib/pdfFontRegistry.ts` — registers shared + fillable fonts. Used by Invoice/Quotation.
- `registerPdfFillableFonts()` — registers fillable fonts only. Used by Waybill and CSR.

**Impact:** Waybill and CSR templates cannot use shared fonts (Inter, Roboto, etc.) in their PDFs because only fillable fonts are registered.

### 4.6 Unified Customization UI (⚠️ Fragmented)

**PRD expects:** A single customization sheet/panel component.

**Current state:** Three separate UI implementations:
1. `PdfOutputCustomizeSheet` — used by Invoice/Quotation. Full-featured: template carousel + design overrides + output toggles + compact/landscape.
2. `ViewCSR.tsx:307-447` — inline sheet with `CsrTemplateCarousel` + custom font/color + `DocumentTemplateDesignOverrides`.
3. `ViewWaybill.tsx:367-517` — inline sheet with `WaybillTemplateSelector` + `DocumentTemplateDesignOverrides` + custom font/color.

**Impact:** Duplicated UI code. Inconsistent user experience across document types. Maintenance burden.

### 4.7 Per-Document Output Toggles (⚠️ Inconsistent)

**PRD expects:** Standardized output toggles per document family.

**Current state:**
- Invoice/Quotation: `PdfOutputSettingsValue` (11 fields) with bank account selection, tagline, footer, balance due, amount in words, VAT/WHT/discount percentages, compact, landscape.
- Waybill: No output toggle type. Bank details, tagline, footer are NOT configurable.
- CSR: No output toggle type. Only template, font, and color are configurable.

**Impact:** Waybill and CSR lack output customization that the PRD treats as universal.

---

## 5. Compatibility Matrix

| Concept | Invoice | Quotation | Waybill | CSR | Migration Risk |
|---|---|---|---|---|---|
| **Template IDs** | 7 values via `InvoicePdfTemplateId` | Same 7 (shared) | 6 values via `WaybillPdfTemplateId` | 4 values via variant keys `2`/`3`/`4`/`6` | Low — extend union types |
| **Design Preset Type** | `PdfDesignPreset` (12 fields) | Same | Same | Same | Low — single type exists |
| **Design Preset Storage** | localStorage | localStorage | localStorage | localStorage | Low — standardize to DB |
| **Template ID Storage** | `custom_fields.pdfTemplateId` (DB) | `custom_fields.pdfTemplateId` (DB) | `custom_fields.pdfTemplateId` (DB) + localStorage | localStorage only | Medium — CSR needs DB migration |
| **Output Toggles** | `PdfOutputSettingsValue` (11 fields) | `PdfOutputState` (4 fields) or `PdfOutputSettingsValue` (11 fields) | None | None | Medium — define per-family types |
| **Font Registration** | `registerPdfFonts()` (shared+fillable) | Same | `registerPdfFillableFonts()` (fillable only) | `registerPdfFillableFonts()` (fillable only) | Low — unify to single call |
| **Preview Mechanism** | CSS/HTML (no live PDF) | CSS/HTML (no live PDF) | Live React-PDF | Live React-PDF | High — Invoice/Quotation need live preview |
| **Customization UI** | `PdfOutputCustomizeSheet` | `PdfOutputCustomizeSheet` | Inline sheet | Inline sheet | Medium — unify to single component |
| **Render Model** | `PdfDocumentModel` (shared) | `PdfDocumentModel` (shared) | `WaybillRenderModel` (separate) | `CsrPdfProps` (separate) | High — three different model types |
| **Adapter** | `adaptCommercialDocumentData()` | Same | `buildWaybillRenderModel()` | `buildCsrPreviewData()` | High — three different data shaping paths |

---

## 6. Existing Systems That Must Be Preserved

### 6.1 Invoice/Quotation Shared Pipeline
- `generatePdf()` at `pdf-new/index.ts:40-117` — the core PDF generation function
- `adaptCommercialDocumentData()` at `industryAdapter.ts` — transforms `PdfDocumentModel` to template-ready data
- 7 shared templates — all render from the same data shape
- `PdfDocumentModel` type system — `identity`, `issuer`, `recipient`, `headerFields`, `columns`, `items`, `totals`, `bankDetails`, `notes`, `terms`, `signature`, `logo`, `template`

### 6.2 Waybill Render Model
- `WaybillRenderModel` at `domain/waybill/engine/types.ts` — separate type system for waybill-specific data
- `buildWaybillRenderModel()` at `domain/waybill/engine/assembly.ts` — assembles render model from raw waybill data
- `safeValidateRenderModel()` at `domain/waybill/renderContract.ts` — Zod validation of render model
- `WaybillPDF.tsx` — component-based rendering (not `pdf()` blob generation)

### 6.3 CSR Preview System
- `getCsrPdfDocument()` at `preview-templates/index.tsx:30-37` — returns JSX element for live preview
- `buildCsrPreviewData()` + `getCsrBranding()` at `csr/csrUtils.ts` — shapes CSR data for templates
- `CsrPdfProps` type — `{ csr, comments, branding, designPreset, template }`
- `getBranding()` at `preview-templates/utils.ts` — extracts branding from company settings

### 6.4 Font System
- `pdfDesignPreset.ts` — `PdfDesignPreset` type, `sanitizePdfDesignPreset()`, `resolvePdfFontFamily()`, `resolvePdfWebFontFamily()`
- `pdfFontRegistry.ts` — singleton font registration (`registerPdfFonts()`, `registerPdfFillableFonts()`)
- `pdfFillableFonts.ts` — 6 handwriting font families with PDF + web font data
- `pdfSharedFonts.ts` — 10 typography font families with PDF + web font data

### 6.5 Output Settings
- `PdfOutputSettingsValue` at `PdfOutputSettings.tsx:24-36` — 11-field type used by Invoice/Quotation
- `PdfBankControls` + `PdfDocumentOptionsCard` at `PdfOutputSettings.tsx` — reusable bank + document option UI components
- `DocumentTemplateDesignOverrides` at `DocumentTemplateDesignOverrides.tsx` — reusable custom colors/fonts toggle UI

### 6.6 Persistence Layer
- `getPdfDesignPreset()` / `setPdfDesignPreset()` at `pdfDesignPreset.ts:231-251` — localStorage read/write with sanitization
- `custom_fields` JSON column on `invoices`, `quotations`, `waybills` tables — stores template ID, column config, output toggles
- `parseCustomFields()` at `domain/invoice/` — parses and types the JSON blob

### 6.7 Template Selection UI
- `PdfOutputCustomizeSheet` template carousel at `PdfOutputCustomizeSheet.tsx:168-227` — 7 invoice template cards with visual previews
- `WaybillTemplateSelector` — separate component for waybill template selection
- `CsrTemplateCarousel` — separate component for CSR template selection

### 6.8 PDF Download Infrastructure
- `downloadPdfFromElement()` at `document-view/shared/downloadPdf.ts` — converts React element to PDF blob and downloads
- `downloadBlob()` at `pdf-new/index.ts:20-29` — low-level blob download utility

---

## 7. Migration Approach by Layer

### Layer 1: Template Defaults
- **Action:** Add `defaults` field to each template's export. Templates declare their own accent color, font preferences, and layout defaults.
- **Risk:** Low — additive change. Existing `DEFAULT_PRESETS` become fallback.
- **Files:** All 17 template files across 3 pipelines.

### Layer 2: Capability Declaration
- **Action:** Add `capabilities` metadata to each template export (e.g., `{ fillableFonts: true, accentColor: true, landscape: false }`).
- **Risk:** Low — additive. Templates that don't declare capabilities default to "all enabled".
- **Files:** All 17 template files + new `capabilities.ts` type definition.

### Layer 3: Customization Policy
- **Action:** Create `CustomizationPolicy` type that maps template capabilities to UI control visibility. One policy per document family.
- **Risk:** Medium — replaces hardcoded control visibility in 3 view pages.
- **Files:** New `customizationPolicy.ts`, modifications to `ViewCSR.tsx`, `ViewWaybill.tsx`, `PdfOutputCustomizeSheet.tsx`.

### Layer 4: Resolver Pipeline
- **Action:** Create `resolvePdfCustomization(templateDefaults, policy, userSettings, templateCapabilities)` function that produces `ResolvedPdfCustomization`.
- **Risk:** Medium — replaces implicit merge in `getPdfDesignPreset()`.
- **Files:** New `pdfCustomizationResolver.ts`, modifications to `pdfDesignPreset.ts`.

### Layer 5: Unified Persistence
- **Action:** Standardize all customization settings to DB storage via `custom_fields` column. Migrate CSR from localStorage-only to DB-backed.
- **Risk:** Medium — CSR needs Supabase migration to persist template/font/color in `custom_fields`.
- **Files:** `ViewCSR.tsx` save handler, `ViewWaybill.tsx` save handler, CSR Supabase migration.

### Layer 6: Unified UI
- **Action:** Extend `PdfOutputCustomizeSheet` to accept a `documentType` prop that controls which sections appear (template carousel, design overrides, output toggles, font/color pickers).
- **Risk:** Medium — replaces 2 inline sheet implementations.
- **Files:** `PdfOutputCustomizeSheet.tsx` (extend), `ViewCSR.tsx` (remove inline sheet), `ViewWaybill.tsx` (remove inline sheet).

### Layer 7: Font Registry Unification
- **Action:** Make `registerPdfFonts()` the single entry point. Remove `registerPdfFillableFonts()` calls from Waybill and CSR.
- **Risk:** Low — Waybill and CSR templates gain access to shared fonts (no breaking change).
- **Files:** `WaybillPDF.tsx`, `preview-templates/index.tsx`, `pdfFontRegistry.ts`.

### Layer 8: Versioned Settings
- **Action:** Add `version: number` field to `PdfDesignPreset`. Create migration functions for schema changes.
- **Risk:** Low — additive. Existing settings without version field treated as version 0.
- **Files:** `pdfDesignPreset.ts` (add version field + migration logic).

---

## 8. Risk Summary

| Risk | Severity | Mitigation |
|---|---|---|
| Invoice/Quotation shared pipeline breakage | **High** | Any change to `generatePdf()` or `PdfDocumentModel` affects both. Test both pipelines after every change. |
| Waybill render model divergence | **High** | `WaybillRenderModel` is a separate type system. Do not merge with `PdfDocumentModel` — bridge instead. |
| CSR localStorage-only settings loss | **Medium** | CSR customization is lost on browser clear. Priority: migrate to DB persistence. |
| Font registration split | **Medium** | Unifying to `registerPdfFonts()` is safe but must verify Waybill/CSR templates handle shared fonts gracefully. |
| Template capability enforcement | **Low** | Without capability declarations, users may customize fields that have no effect. Cosmetic issue, not functional. |

---

## 9. Deferred Work

The following are explicitly out of scope for this gap analysis:

- Actual implementation of any PRD concepts
- Template code modifications
- Database schema changes
- Component refactoring
- Test file creation or modification
- Build configuration changes

This report is a diagnostic artifact. Implementation requires a separate execution plan with phased rollout.
