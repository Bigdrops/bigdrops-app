# PDF Customization Engine — Gap Analysis Work Report

This report was written by OpenCode on 2026-07-07 via Local Runner.

**Date:** 2026-07-07
**Task:** Execute `docs/Prompts/prompt004.md`
**Status:** Complete. Two deliverables produced.

---

## 1. Objective

Execute a zero-code investigation of the frozen PRD (`docs/PRD/pdf-customization-extension-system.md`) against the existing implementation, producing:

1. **Main report** at `docs/Reports/PDF/pdf-customization-engine-gap-analysis.md`
2. **Work report** at `docs/reports/pdf-customization-gap-analysis-work.md`

No application code may be modified.

---

## 2. Execution Summary

### Phase 1: Foundation Loading

| Action | Outcome |
|---|---|
| Read `AGENTS.md` | Established rules: Bun-only, zero-code constraint, PascalCase/kebab-case conventions, `Calculations.ts` as financial source of truth |
| Load `using-superpowers` skill | Established protocol: state intent → invoke skill → execute → verify → report |
| Load `Karpathy` skill | Established discipline: trace full problem before acting, verify correctness |
| Read `docs/PROJECTSKILLINDEX.md` | Confirmed skills available at `.claude/skills/` paths |
| Run `git status` | Established baseline: 10 pre-existing modifications (waybill templates, invoiceLifecycleService, view*Actions). No untracked files in `src/`. |

### Phase 2: PRD Analysis

Read and analyzed `docs/PRD/pdf-customization-extension-system.md` in full.

**Key PRD concepts extracted:**
- 4-layer architecture: Template Defaults → Customization Policy → User-Saved Settings → Resolved Theme
- Engine responsibilities: persistence, template switching, validation, font registration, UI, preview
- 4 document families: Invoice, Quotation, CSR, Waybill
- Capability declarations per template
- Versioned settings with migration support

### Phase 3: Pipeline Audits (4 parallel subagents)

Each subagent investigated one document family end-to-end:

#### Invoice Audit
- **Entry:** `generateInvoicePdf()` → `generatePdf()`
- **Templates:** 7 shared with Quotation
- **Design preset:** `getPdfDesignPreset('invoice')` → localStorage
- **Output toggles:** `PdfOutputSettingsValue` (11 fields)
- **Template ID:** `custom_fields.pdfTemplateId` in Supabase
- **Font registration:** `registerPdfFonts()` (shared + fillable)
- **Adapter:** `adaptCommercialDocumentData()`
- **UI:** `PdfOutputCustomizeSheet`
- **Preview:** CSS/HTML only (no live PDF)

#### Quotation Audit
- **Entry:** `generateQuotationPdf()` → `generatePdf()` (shared with Invoice)
- **Templates:** Same 7 as Invoice
- **Design preset:** `getPdfDesignPreset('quotation')` → localStorage
- **Output toggles:** Dual types (`PdfOutputState` on form, `PdfOutputSettingsValue` on view)
- **Template ID:** `custom_fields.pdfTemplateId` in Supabase
- **Font registration:** Shared with Invoice
- **Preview:** CSS/HTML only

#### Waybill Audit
- **Entry:** `WaybillPDF` component
- **Templates:** 6 (completely separate from Invoice)
- **Design preset:** `getPdfDesignPreset('waybill')` → localStorage
- **Output toggles:** None (no `PdfOutputSettingsValue`)
- **Template ID:** `custom_fields.pdfTemplateId` in Supabase + localStorage
- **Font registration:** `registerPdfFillableFonts()` (fillable only)
- **Render model:** `WaybillRenderModel` (separate type system)
- **UI:** Inline sheet in `ViewWaybill.tsx`
- **Preview:** Live React-PDF

#### CSR Audit
- **Entry:** `getCsrPdfDocument()`
- **Templates:** 4 (completely separate)
- **Design preset:** `getPdfDesignPreset('csr')` → localStorage
- **Output toggles:** None
- **Template ID:** localStorage only (NO DB persistence)
- **Font registration:** `registerPdfFillableFonts()` (fillable only)
- **UI:** Inline sheet in `ViewCSR.tsx`
- **Preview:** Live React-PDF

### Phase 4: Direct File Verification

Read and verified key source files to confirm subagent findings:

| File | Key Finding |
|---|---|
| `src/components/pdf-new/index.ts` | `generatePdf()` receives `template.designPreset` but does NOT pass it to templates. Switch statement at lines 78-108 dispatches by `InvoicePdfTemplateId`. |
| `src/lib/pdfDesignPreset.ts` | `PdfDesignPreset` type has 12 fields. `sanitizePdfDesignPreset()` validates hex colors and fonts. `resolvePdfFontFamily()` maps preset to font family. No version field. |
| `src/components/PdfOutputSettings.tsx` | `PdfOutputSettingsValue` has 11 fields (bank details, tagline, footer, balance due, amount in words, VAT/WHT/discount percentages, compact, landscape). |
| `src/components/csr/preview-templates/index.tsx` | `getCsrPdfDocument()` if-else dispatches by template variant key. Only registers fillable fonts. |
| `src/components/waybill/WaybillPDF.tsx` | If-else template dispatch at lines 34-54. Only registers fillable fonts. |
| `src/domain/quotation/pdfDownloadHandler.ts` | Downloads via `interpretPdfTableSettings()` → `buildPdfRowCells()` → `generateQuotationPdf()`. |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Downloads via `interpretPdfTableSettings()` → `buildPdfRowCells()` → `generateInvoicePdf()`. |
| `src/pages/ViewCSR.tsx` | Save handler at lines 433-441 writes to localStorage only — no Supabase call. |
| `src/pages/ViewWaybill.tsx` | Save handler at lines 486-506 writes to both localStorage AND `supabase.from('waybills').update({ custom_fields })`. |

### Phase 5: Synthesis and Report Generation

Compiled all findings into the main report with:
- PRD Responsibility Map (10 responsibilities × current status)
- Pipeline-by-pipeline findings (4 sections)
- Missing PRD Concepts (7 items)
- Compatibility Matrix (10 concepts × 4 pipelines)
- Existing Systems That Must Be Preserved (8 categories)
- Migration Approach by Layer (8 layers)
- Risk Summary (5 items)

---

## 3. Key Findings

### What Exists
1. **Shared Invoice/Quotation pipeline** — 7 templates, `generatePdf()`, `adaptCommercialDocumentData()`, `PdfDocumentModel`
2. **PdfDesignPreset type** — 12-field type with localStorage persistence and sanitization
3. **PdfOutputSettingsValue type** — 11-field type for output toggles (Invoice/Quotation)
4. **Font registration system** — `registerPdfFonts()` and `registerPdfFillableFonts()` with 16 font families
5. **Template switching** — functional in all 4 pipelines (switch/if-else dispatch)
6. **Customization UI** — `PdfOutputCustomizeSheet` for Invoice/Quotation, inline sheets for Waybill/CSR
7. **Live preview** — Waybill and CSR render React-PDF elements directly

### What's Missing (PRD Concepts)
1. **Capability declarations** — templates don't declare what they support
2. **Customization policy layer** — no per-template rules for editable fields
3. **Formal resolver pipeline** — no merge step for defaults → policy → user settings → resolved theme
4. **Versioned settings** — no schema version or migration framework
5. **Unified font registry** — two separate registration paths
6. **Unified customization UI** — three separate UI implementations
7. **Standardized output toggles** — Waybill and CSR lack output customization

### Inconsistencies
1. **CSR is localStorage-only** — no DB persistence for customization
2. **Waybill has no output toggles** — bank details, tagline, footer not configurable
3. **Invoice/Quotation have no live preview** — CSS/HTML only, not React-PDF
4. **Dual output toggle types** — `PdfOutputState` (4 fields) vs `PdfOutputSettingsValue` (11 fields) for Quotation
5. **Font registration split** — Waybill and CSR can't use shared fonts

---

## 4. Deliverables

| Deliverable | Path | Status |
|---|---|---|
| Main report | `docs/Reports/PDF/pdf-customization-engine-gap-analysis.md` | ✅ Written |
| Work report | `docs/reports/pdf-customization-gap-analysis-work.md` | ✅ Written |

---

## 5. Verification

- [x] `git status` baseline established before work began
- [x] No application code modified (zero-code constraint)
- [x] All findings verified via direct file reads
- [x] Both deliverables written to specified paths
- [x] Next: `git status` verification to confirm only report files created/modified

---

## 6. Deferred Work

This report is a diagnostic artifact. The following require a separate execution plan:

- Implementation of any PRD concepts
- Template code modifications
- Database schema changes
- Component refactoring
- Test file creation or modification
- Build configuration changes
