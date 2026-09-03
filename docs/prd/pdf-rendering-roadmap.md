# PDF Rendering Roadmap
**Project:** BIGDROPS Business Platform
**Scope:** PDF output quality across all document types + Project Document import
**Status:** In Progress
**Last Updated:** 2026-06-16

---

## Deferred from JSON Import Roadmap

This roadmap was created to handle work that was out of scope for the JSON import improvement project.

---

## Prefix Engine Dependency

This roadmap depends on the Prefix Engine (`docs/prd/prefix-engine-settings.md`), which is now fully implemented. Key integrations:

- All document number prefixes are configurable via Settings → Document Prefixes
- Blank document numbers use the org prefix from `resolvePrefix()`
- `blank_waybill_logs` and `blank_csr_logs` tables are live and tracking all blank downloads
- The `withUniqueRetry` collision handler (3-attempt retry on Postgres error 23505) protects all document saves including blank number assignments
- See `docs/standard/prefix-engine-settings-standard.md` for the integration standard

---

## Phase 1 — Project Documents Import

**Goal:** Fix party identification. Enforce `po_number` identifier lock. Tighten prompt scope. Add Zod validation per sub-type.

### Critical Problems

1. **Party identification bug** — `from_party` / `to_party` extracted blindly. Company identity not injected. AI gets it wrong on documents issued to your company.
2. **Identifier collision bug (Tier 1)** — AI maps any document number to `po_number`. Generic "Document No: 88392" must never populate `po_number`.
3. **Financial field overlap** — prompts extract `subtotal` and `total` which the app recalculates.
4. **No Zod validation** — raw `JSON.parse()` + manual checks only.
5. **No discipline rules** — all 4 sub-type prompts lack Global Prompt Discipline Rules.

### Tasks

- [ ] Read all 4 current prompts in `src/domain/projectDocumentPrompts.ts`
- [ ] Inject company identity into all 4 prompts
- [ ] Add `po_number` identifier lock rule to all 4 prompts
- [ ] Remove `subtotal` and `total` from all 4 prompt schemas
- [ ] Add Global Prompt Discipline Rules to all 4 prompts
- [ ] Add Zod schema for each sub-type in `src/domain/projectDocuments.ts`
- [ ] Replace raw `JSON.parse()` in `ProjectDocumentSheet.tsx` with Zod validation
- [ ] Test all 4 sub-types with real documents

**Completion Signal:** PO received from client → correct party roles every time. Generic document number → `po_number` is `null` every time. All 4 sub-types pass Zod validation on first paste.

---

## Phase 2A — Project Document PDF Output

**Goal:** Bring Project Document PDF output quality to parity with Invoice/Quotation.

### Current Problems
- Layout weak
- Party label display poor (`from_party`, `to_party`)
- Financial field formatting poor

### Tasks

- [ ] Audit `src/components/project/ProjectDocumentStep3Review.tsx` and PDF rendering
- [ ] Audit layout, party display, financial formatting
- [ ] Compare output side-by-side with Invoice PDF and Quotation PDF
- [ ] Fix all identified issues

**Completion Signal:** Project Document PDF matches quality of Invoice/Quotation PDF output.

---

## Phase 2B — CSR PDF Pipeline Audit & Fixes

**Goal:** Complete field-to-template audit of all 4 CSR PDF variants. Fix field mismatches, hardcoded values, and layout issues.
**Audit Report:** `docs/reports/csr-pdf-audit.md`

### Audit Findings Summary

| Category | Issues Found |
|---|---|
| Missing field mismatches | 5 (resolution orphaned, service_rendered/defects_found never rendered, customer_feedback PulseFrame-only, acknowledgement_name Crimson-only) |
| Hardcoded values | 4 (status options duplicated, reading fields hardcoded, meta defaults not per-template) |
| Layout/structural | 4 (no page-break management, shared components across templates, readings grid vs strip inconsistency, Zinc lifecycle stages hardcoded) |
| Data flow | 3 (technicianRemarks alias, meta serialized into materials_used, parseCsrMaterials fallback) |

### Critical Issues

1. **`resolution` field orphaned** — form collects it, `CsrObject` doesn't define it, no template reads it
2. **No page-break control** — long content overflows pages without `break-inside: avoid`
3. **Status options duplicated** — `CSR_STATUS_OPTIONS` (web) vs `CSR_STATUS_OPTIONS_PDF` (Crimson) — drift risk

### Tasks

#### 2A — Fix Field Mismatches

- [ ] Wire `resolution` field: add to `CsrObject` interface and `createDefaultCsr`, or remove from form
- [ ] Add `service_rendered` and `defects_found` to at least one template, or remove from form
- [ ] Add `customer_feedback` section to SignalBands, Zinc, Crimson (or document PulseFrame-only intentionally)
- [ ] Add acknowledgement section to Crimson (or document omission intentionally)

#### 2B — Fix Hardcoded Values

- [ ] Consolidate `CSR_STATUS_OPTIONS` and `CSR_STATUS_OPTIONS_PDF` into a single shared constant
- [ ] Export `CSR_READING_FIELDS` from a shared location (currently hardcoded in `CSRPreviewContent.js`)
- [ ] Type `buildCsrPreviewData` return — currently returns `any`, should return a proper interface

#### 2C — Fix Layout Issues

- [ ] Add page-break control: wrap sections in `<div style={{ breakInside: 'avoid' }}>` in all 4 templates
- [ ] Implement page-break orchestration for long content (similar to invoice `splitItemsForPagination`)
- [ ] Verify `layoutDensity` thresholds produce correct results across all templates

#### 2D — Verify & Test

- [ ] Generate test PDFs for all 4 templates with maximum field population
- [ ] Generate test PDFs with minimal field population
- [ ] Verify all fields render correctly in each template
- [ ] Verify no page overflow occurs

**Completion Signal:** All 4 CSR templates render all relevant fields correctly. No orphaned fields. No page overflow. Audit report updated with fix status.

---

## Phase 3A — Invoice/Quotation Template Audit & Repair

**Goal:** Audit all 5 Invoice/Quotation PDF templates. Repair Editorial to match the Industry standard. Destroy broken templates for later rebuild.

### Audit Results (2026-06-16)

| Template | Status | Issues |
|----------|--------|--------|
| **Industry** | ✅ Functional | Minor currency formatting inconsistency (mixes blank spaces and # symbol). |
| **Editorial** | ❌ Broken | Raw HTML tags in Terms & Conditions. Pagination failure — blank page 2. Random "HS" text block near logo. |
| **Apex** | ❌ Placeholder | Displays hardcoded placeholder message only. Never connected to data model. |
| **Bolt** | ❌ Broken | Raw HTML tags in Terms. Pagination failure — subtotal/VAT/total orphaned to page 2. Header injects "OUR REFERENCE" text. Missing spaces in company name. |
| **Obsidian** | ❌ Broken | Raw HTML tags in Terms. Duplicated company header (name, phone, email printed twice). Rigid row heights — text wrap breaks table alignment. |

### Root Cause

Editorial, Bolt, and Obsidian do not use the shared `industryAdapter` and HTML parsing pipeline that Industry uses correctly. Each template has its own inline, broken implementation. Apex was never built.

### Strategy (LOCKED)

1. **Repair Editorial** — Wire it to the Industry adapter pattern (`industryAdapter` + `PdfRenderer`). Fix HTML parsing, pagination, and the stray "HS" text block. Keep the Editorial visual design, but rebuild the data layer.
2. **Destroy Apex, Bolt, and Obsidian** — Delete their current template implementations entirely. They will be replaced by new templates built AFTER a template standard is established (Phase 3C).
3. **Standardise** — Before building replacement templates, establish an Invoice/Quotation Template Standard defining: adapter contract, HTML parsing utility, currency formatter, pagination rules, page layout props. The Industry template is the reference implementation.

### Tasks

#### 3A-1 — Repair Editorial Template
- [ ] Read `src/components/pdf-new/templates/Industry.tsx` — understand the adapter + HTML parser integration
- [ ] Read `src/components/pdf-new/templates/Editorial.tsx` — identify all broken inline logic
- [ ] Rewire Editorial to consume `industryAdapter.adaptIndustryData()` output (same data contract as Industry)
- [ ] Replace Editorial's broken HTML parser with the shared parser used by Industry
- [ ] Fix pagination: ensure Terms & Conditions flow correctly across pages
- [ ] Remove the stray "HS" text block
- [ ] Fix currency formatting
- [ ] Verify Editorial renders identically to Industry in structure, preserving its unique visual styling

#### 3A-2 — Destroy Broken Templates
- [ ] Delete `src/components/pdf-new/templates/Apex.tsx` — replace with a placeholder that renders nothing and logs a warning
- [ ] Delete `src/components/pdf-new/templates/Bolt.tsx` — same
- [ ] Delete `src/components/pdf-new/templates/Obsidian.tsx` — same
- [ ] Remove any Apex/Bolt/Obsidian references from the template dispatcher/index file
- [ ] Keep the template names reserved in config only — no UI change for template selector

#### 3A-3 — Establish Template Standard
- [ ] Create `docs/standard/invoice-quotation-template-standard.md`
- [ ] Document: adapter contract (`adaptIndustryData` input/output), HTML parsing utility location, currency formatter signature, pagination rules (page-break, keepTogether, fixed headers), page layout props (`PdfPageLayout`)
- [ ] Use Industry.tsx as the reference implementation
- [ ] Define the minimum requirements any new template must meet before being wired into the dispatcher

### Completion Signal
- Editorial renders correctly with no HTML bleed, correct pagination, and clean layout
- Apex, Bolt, and Obsidian are removed from the codebase
- Template standard document exists and is referenced by the roadmap

---

## Phase 3B — Waybill PDF & UI Fixes (Internal & External)

**Goal:** Fix broken PDF table layout, quantity data bug, signature layout, blank PDF rendering, and type selector modal theme mismatch.

### Confirmed Issues

#### PDF Issues (Both Internal and External variants)

| Issue | Severity | Details |
|---|---|---|
| Missing table headers | HIGH | No column labels rendered for #, Item Description, Qty, Unit, Condition |
| Description column width unconstrained | HIGH | Description expands to ~90% of table, crushes all other columns to right margin |
| Quantity defaults to 0 | HIGH | Item quantity values return hardcoded 0 — actual data not mapped |
| Column proportions broken | HIGH | Qty, Unit, Condition unreadable — no width allocation |
| Signature/footer layout unstable | MEDIUM | Signature blocks lack sizing constraints — misaligned and compressed |
| Blank PDF non-functional | HIGH | Blank template download fails for both Internal and External |

#### UI Issue

| Issue | Severity | Details |
|---|---|---|
| Type selector modal theme mismatch | MEDIUM | "New Waybill" modal uses bespoke cream background, display font, and custom card borders. Does not match app design token system. Affects modal only — form, list, and view pages are fine. |

### Strategy

1. **Fix PDF table geometry** — add explicit column headers, enforce proportional widths: `#` (5%), `Description` (55%), `Qty` (10%), `Unit` (15%), `Condition` (15%)
2. **Fix quantity mapping** — trace the item array mapping and fix the data binding returning 0
3. **Fix signature layout** — add explicit sizing and vertical rhythm to signature blocks
4. **Fix blank PDF** — restore blank template rendering for both Internal and External
5. **Fix type selector modal** — replace bespoke styling with app design tokens (shadcn card system, correct background tokens, correct typography)

### Tasks

#### 3B-1 — Fix PDF Table Layout
- [ ] Read waybill PDF template files for Internal and External
- [ ] Add explicit table header row with column labels: #, Item Description, Qty, Unit, Condition
- [ ] Apply proportional column widths: # (5%), Description (55%), Qty (10%), Unit (15%), Condition (15%)
- [ ] Fix row mapping to read actual quantity values — remove hardcoded 0 fallback
- [ ] Add sizing constraints to signature/footer blocks — fix vertical alignment

#### 3B-2 — Fix Blank PDF
- [ ] Read blank waybill template files (`src/components/waybill/blankWaybillTemplate.tsx`)
- [ ] Identify why blank rendering fails for Internal and External
- [ ] Fix blank template to render clean empty grid for both variants
- [ ] Verify blank PDF downloads correctly from the New Waybill modal

#### 3B-3 — Fix Type Selector Modal Theme
- [ ] Find the New Waybill type selector modal component
- [ ] Replace cream background with app design token (`bg-bd-overlay-bg` or equivalent)
- [ ] Replace display/serif font with app font system
- [ ] Replace custom card borders with shadcn card component
- [ ] Verify modal matches the app's visual design system

### Completion Signal
- Both Internal and External PDFs show correct table headers and proportional column widths
- Quantity values display actual data, not 0
- Signature blocks are cleanly aligned
- Blank PDF downloads work for both variants
- New Waybill modal uses app design tokens and matches the visual design system

---

## Phase 3C — PDF Quality Audit (Remaining Types)

**Goal:** Audit PDF output quality across all remaining document types. Identify gaps.

### Document types to audit
- RFQ
- CSR
- Blank CSR PDF
- Compliance Hub exports (if applicable)
- Project Documents (covered in Phase 2)

### Tasks

- [ ] For each document type: generate a real PDF and review output
- [ ] Document all quality issues found (layout, typography, field display, financial formatting, signatures, branding)
- [ ] Prioritize fixes by impact
- [ ] Create Phase 6+ tasks based on audit findings

**Completion Signal:** All document types audited. Issues documented. Phase 6+ tasks defined.

---

## Phase 3D — BOQ & RFQ Overhaul

**Goal:** Fix the BOQ storage split bug, align both forms visually with the Invoice design system, replace both broken templates, fix image output readability, add missing JSON import to whichever module is missing it, and overhaul the palette/color system.

**Audit Report:** `docs/reports/boq-rfq-audit.md`

---

### Critical Bug — BOQ Storage Split (BLOCKING)

BOQ creation saves to `localStorage` (`domain/boq/storage.ts`) but the view page, list page, and all actions read from Supabase. BOQs created via the New flow are invisible on the view page and list.

**Fix required before any other BOQ work:**
- Migrate `NewBoq.tsx` save flow to Supabase (insert into `boqs` + `boq_items` tables)
- Migrate `EditBoq.tsx` to read from and write to Supabase
- Remove or deprecate `domain/boq/storage.ts`
- Wire prefix engine: replace hardcoded `BOQ-001` with `resolvePrefix(prefixes, 'boq')` + proper 6-digit sequence generator matching the RFQ pattern

---

### Confirmed Issues

| Issue | Module | Severity | Details |
|---|---|---|---|
| Storage split — save to localStorage, view reads Supabase | BOQ | CRITICAL | BOQs disappear after creation |
| Hardcoded `BOQ-001` prefix — no prefix engine | BOQ | HIGH | Not using `resolvePrefix()` like RFQ does |
| Both templates too small — must zoom to read | BOQ + RFQ | HIGH | `modern` and `bordered_schedule` unreadable on mobile and in PDF |
| No page breaks — long tables overflow single page | BOQ + RFQ | HIGH | Single hardcoded `<Page>` — no multi-page support |
| Image output unreadable on mobile — requires zoom | BOQ + RFQ | HIGH | Picture output not optimized for mobile viewport |
| Palette/color system produces bad outputs | BOQ + RFQ | HIGH | Color picker allows combinations that result in unreadable documents |
| Form visual disconnect from Invoice design system | BOQ + RFQ | MEDIUM | Forms use different visual styling — inputs, cards, spacing not aligned |
| JSON import missing from one module | BOQ or RFQ | MEDIUM | Confirm which module is missing JSON import and add it |
| No totals/subtotals row in PDF | BOQ + RFQ | LOW | No footer row for cost or quantity sums |
| No logo/branding in PDF | BOQ + RFQ | LOW | Brand name is text-only, no company logo support |

---

### Strategy (LOCKED)

1. **Fix BOQ storage split first** — nothing else in BOQ can be tested until save works
2. **Wire BOQ prefix engine** — match RFQ pattern exactly
3. **Scrap both templates** — `modern` and `bordered_schedule` are both too small and produce unreadable output. Replace with new templates designed for table-heavy documents with readable typography and proper A4 proportions
4. **Fix image output** — mobile picture output must be readable without zooming. Content must be sized for mobile viewport
5. **Replace palette system** — remove or constrain the free color picker. Replace with a curated set of preset themes that are guaranteed to produce readable output. No more freeform color combinations
6. **Align forms to Invoice design system** — visual parity only, not structural rewrite. Same tokens, card style, input components, spacing
7. **Add missing JSON import** — identify which module is missing it and add it following the JSON Import Standard (`docs/json-import-standard.md`)

---

### Tasks

#### 3D-1 — Fix BOQ Storage Split (BLOCKING — do first)
- [ ] Read `src/pages/NewBoq.tsx` and `src/domain/boq/storage.ts` fully
- [ ] Migrate `NewBoq.tsx` to insert into Supabase `boqs` + `boq_items` tables — match `NewRfq.tsx` pattern exactly
- [ ] Migrate `EditBoq.tsx` to read from and write to Supabase
- [ ] Replace `saveBoq()` with a Supabase mutation — follow `rfqService.ts` as the reference
- [ ] Wire `withUniqueRetry` collision handler on BOQ save
- [ ] Replace hardcoded `BOQ-001` number format with `resolvePrefix(prefixes, 'boq')` + 6-digit sequence generator
- [ ] Deprecate `domain/boq/storage.ts` — mark as unused or delete
- [ ] Verify: create a BOQ → navigate to list → BOQ appears → click view → loads correctly

#### 3D-2 — Add Missing JSON Import
- [ ] Confirm which module (BOQ or RFQ) is missing JSON import
- [ ] Follow `docs/json-import-standard.md` to add JSON import following the platform standard
- [ ] Wire to `JsonImportLayout.tsx` shared UI component
- [ ] Add prompt, Zod schema, and adapter per the standard

#### 3D-3 — Align Forms to Invoice Design System
- [ ] Read `src/components/boq/BoqForm.tsx` and `src/components/rfq/RfqForm.tsx`
- [ ] Read `src/pages/NewInvoice.tsx` and relevant Invoice form components as the reference
- [ ] Identify all visual differences: background tokens, input component variants, card borders, label styles, section spacing
- [ ] Update BOQ and RFQ forms to use the same design tokens, input components, and card structure as Invoice
- [ ] No structural changes to the form fields — visual alignment only

#### 3D-4 — Replace Both Templates
- [ ] Scrap `modern` and `bordered_schedule` templates in `src/components/table-document/TableDocumentPdfDocument.tsx`
- [ ] Design two new templates optimized for table-heavy documents:
  - Readable typography — minimum 10pt body text in PDF
  - Proper A4 proportions — no content that requires zooming
  - Multi-page support — chunk rows across pages with repeated header row on each page
  - Clear column headers on every page
  - Totals row at bottom of last page
- [ ] New templates must use the same adapter pattern as Invoice (`industryAdapter` + `PdfRenderer`) — not a standalone `<Document>`

#### 3D-5 — Fix Image/Picture Output
- [ ] Identify the component responsible for image/picture output for BOQ and RFQ
- [ ] Current output requires zooming to read on mobile — fix sizing and typography
- [ ] Content must be readable at native mobile viewport width without zoom
- [ ] Test on mobile viewport (375px width)

#### 3D-6 — Replace Palette System
- [ ] Remove or disable the free color picker for BOQ and RFQ
- [ ] Replace with a curated set of preset themes — each preset must be guaranteed to produce readable output
- [ ] Minimum 4 presets, each with a name and preview
- [ ] No freeform hex input — presets only
- [ ] Apply to both BOQ and RFQ template customization

---

### Completion Signal
- BOQ save works — created BOQs appear in list and view page
- BOQ uses prefix engine — numbers follow `[PREFIX]-000001` format
- Both modules have JSON import wired
- BOQ and RFQ forms are visually aligned with Invoice
- Both templates are replaced — readable at A4 size without zooming
- Image output is readable on mobile without zooming
- Palette system replaced with curated presets — no bad color combinations possible

---

## Phase 4 — Blank Template PDF Rendering

**Goal:** Build or update blank/manual PDF templates for Waybill and CSR so downloaded blanks use the correct org prefix from the Prefix Engine.

### Current State (Post-Prefix-Engine)

| Template | Number Assignment | PDF Template | Logging |
|----------|------------------|--------------|---------|
| Blank External Waybill | ✅ Wired to org prefix via `resolvePrefix('waybill', ...)` | ✅ Exists in `src/components/waybill/blankWaybillTemplate.tsx` | ✅ Inserts into `blank_waybill_logs` |
| Blank Internal Waybill | ✅ Wired to org prefix | ✅ Exists (same file, Internal variant) | ✅ Inserts into `blank_waybill_logs` |
| Blank CSR | ✅ Wired to org prefix via `resolvePrefix('csr', ...)` | ❌ Does NOT exist — needs to be built | ✅ Inserts into `blank_csr_logs` |

### Number Format Reference

Blank document numbers follow these formats (from `docs/prd/prefix-engine-settings.md` Section 4):

| Document | Blank Format |
|----------|-------------|
| Waybill (External) | `[PREFIX]-ME-[SERIAL]` |
| Waybill (Internal) | `[PREFIX]-MI-[SERIAL]` |
| CSR | `[PREFIX]-M-[SERIAL]` |

Serial is always 6-digit zero-padded: `000001`.

### Log Table Reference

Both tables already exist in production with reconciliation support:

- `blank_waybill_logs` — columns: `id`, `assigned_waybill_number`, `type`, `downloaded_by`, `downloaded_at`, `linked_waybill_id`, `reconciled_at`
- `blank_csr_logs` — columns: `id`, `assigned_csr_number`, `downloaded_by`, `downloaded_at`, `linked_csr_id`, `reconciled_at`

The `reconciled_at` and `linked_*_id` columns are set when a blank is later claimed by a real document. This reconciliation logic is NOT yet built — it belongs in this phase.

### Tasks

#### 4A — Verify Existing Blank Waybill Templates Use Org Prefix

- [ ] Read `src/components/waybill/blankWaybillTemplate.tsx`
- [ ] Confirm the rendered PDF displays the correct org prefix (not a hardcoded `AWB-`)
- [ ] Confirm External template shows `[PREFIX]-ME-[SERIAL]` format
- [ ] Confirm Internal template shows `[PREFIX]-MI-[SERIAL]` format
- [ ] If hardcoded: update to use the prefix passed from `NewWaybill.tsx`

#### 4B — Build Blank CSR PDF Template

- [ ] Create a blank CSR PDF template (mirroring the waybill pattern in `blankWaybillTemplate.tsx`)
- [ ] The template must render:
  - Company branding (logo, name, tagline from settings)
  - The assigned blank CSR number in `[PREFIX]-M-[SERIAL]` format
  - Empty fields for: customer name, report type, description, amount due, amount paid, product serial number
  - A status placeholder ("pending" / "resolved")
  - Signature line for receiver
- [ ] Wire the download button in `NewCSR.tsx` → `handleDownloadBlankCsr` to generate and download the PDF
- [ ] Use `@react-pdf/renderer` (already in the project — same as waybill blanks)

#### 4C — Build Reconciliation Logic

- [ ] When a real Waybill is saved with a `waybill_number` that matches a `blank_waybill_logs.assigned_waybill_number`, update the log row: set `linked_waybill_id` and `reconciled_at`
- [ ] Same for CSR: when a real CSR is saved, check `blank_csr_logs` and reconcile if matched
- [ ] Reconciliation is a background operation — no user feedback needed

### Completion Signal

- Blank External and Internal Waybill PDFs display the org prefix from settings
- Blank CSR PDF downloads and displays the org prefix
- Blank log tables reconcile correctly when a blank number is claimed by a real document

---

## Phase 5 — CSR Landscape Integration & Critical Fixes

**Goal:** Port Invoice landscape rendering capability to CSR. Fix confirmed critical issues from memo verification and audit.
**Depends on:** Phase 2 (CSR PDF Pipeline Audit & Fixes) completion
**Audit Report:** `docs/reports/csr-pdf-audit.md` (Sections 8–9)

### Critical Problems

1. **CSR templates are architecturally isolated** — standalone `<Document>` in `preview-templates/index.tsx` does NOT use `PdfRenderer.tsx` or `industryAdapter.ts`. No orientation/layout support.
2. **No elastic layout** — CSR templates use fixed vertical stacking with no `flex: 1`, `flexGrow`, or `keepTogether`. Invoice templates have these.
3. **Styling bugs confirmed** — Zinc Light accent color only partially applies (body text stays hardcoded `#09090b`). Crimson Materials has fixed dimensions that cause overflow.
4. **Missing fields** — `call_type` missing from Zinc/Crimson. `linked_invoice_id` not in PDF interface. "Battery" not renamed to "Charging Alternator Condition".
5. **No page-break control** — long content overflows pages in all 4 templates.

### Tasks

#### 5A — Landscape Integration (Invoice Pattern Port)

- [ ] Create `adaptCsrData()` adapter in `src/components/pdf-new/industryAdapter.ts` (or new file)
  - Transform `CsrObject` + `CsrMeta` → `CsrTemplateData` with `pageLayout`, `designPreset`, `branding`
  - Include `pageLayout.orientation` based on `layoutDensity` or explicit user toggle
- [ ] Update `CsrPdfProps` to accept typed `data: CsrTemplateData` instead of `csr: any`
- [ ] Change `preview-templates/index.tsx` to use `PdfRenderer` wrapper instead of standalone `<Document>`
- [ ] Update all 4 templates to read `layout.orientation` from props and apply to `<Page>`
- [ ] Add `<View fixed>` for repeating headers/footers on every page
- [ ] Add `flex: 1` on main containers, `flexGrow`/`flexShrink` on columns (match Ledger.tsx pattern)

#### 5B — Fix Confirmed Styling Bugs

- [ ] Zinc Light: apply accent color to body text, header text, and status badge — not just section titles
- [ ] Crimson Materials: replace fixed `minHeight: 34` with elastic layout; remove `flexShrink: 0` on `materialsCol2`
- [ ] All templates: add `break-inside: avoid` wrapping for sections

#### 5C — Fix Missing Fields

- [ ] Add `call_type` rendering to Zinc and Crimson templates (already in PulseFrame/SignalBands)
- [ ] Add `linked_invoice_id` to `CsrObject` interface and templates (or remove from DB if vestigial)
- [ ] Rename "Battery" label to "Charging Alternator Condition" in `CSR_READING_FIELDS` and all templates
- [ ] Add `resolution` field to `CsrObject` and templates (or remove from form)

#### 5D — Page-Break Orchestration

- [ ] Implement page-break logic for long content (similar to Invoice `splitItemsForPagination`)
- [ ] Add `keepTogether` for multi-line sections (materials rows, problem/resolution blocks)
- [ ] Test with maximum field population across all 4 templates
- [ ] Verify no page overflow in landscape orientation

### Completion Signal

- CSR PDFs support both portrait and landscape orientation (auto-selected or user-toggled)
- All 4 templates render all fields correctly, including previously missing ones
- Zinc Light accent color applies to all text elements
- Crimson Materials section is elastic and handles long lists without overflow
- No page overflow in any template at maximum field population

---

## Execution Order

```
Phase 1 (Project Document Import) → Phase 2A (Project Document PDF) → Phase 2B (CSR Audit & Fixes) → Phase 3A (Invoice/Quotation Templates) → Phase 3B (Waybill PDF & UI) → Phase 3C (PDF Audit — Remaining Types) → Phase 3D (BOQ & RFQ) → Phase 4 (Blank Templates) → Phase 5 (CSR Landscape) → Phase 6+ (Per findings)
```

---

*Last updated: 2026-06-16*
