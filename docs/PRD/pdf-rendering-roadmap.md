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

This roadmap depends on the Prefix Engine (`docs/PRD/PREFIX_ENGINE_SETTINGS.md`), which is now fully implemented. Key integrations:

- All document number prefixes are configurable via Settings → Document Prefixes
- Blank document numbers use the org prefix from `resolvePrefix()`
- `blank_waybill_logs` and `blank_csr_logs` tables are live and tracking all blank downloads
- The `withUniqueRetry` collision handler (3-attempt retry on Postgres error 23505) protects all document saves including blank number assignments
- See `docs/STANDARD/prefix-engine-settings-standard.md` for the integration standard

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
**Audit Report:** `docs/Task/reports/csr-pdf-audit.md`

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

## Phase 3 — PDF Quality Audit (All Document Types)

**Goal:** Audit PDF output quality across all document types. Identify gaps.

### Document types to audit
- Invoice
- Quotation
- Waybill (External and Internal)
- Blank Waybill PDF (External and Internal)
- RFQ
- CSR
- Blank CSR PDF
- Compliance Hub exports (if applicable)
- Project Documents (covered in Phase 2)

### Tasks

- [ ] For each document type: generate a real PDF and review output
- [ ] Document all quality issues found (layout, typography, field display, financial formatting, signatures, branding)
- [ ] Prioritize fixes by impact
- [ ] Create Phase 5+ tasks based on audit findings

**Completion Signal:** All document types audited. Issues documented. Phase 5+ tasks defined.

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

Blank document numbers follow these formats (from `docs/PRD/PREFIX_ENGINE_SETTINGS.md` Section 4):

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
**Audit Report:** `docs/Task/reports/csr-pdf-audit.md` (Sections 8–9)

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
Phase 1 (Project Document Import) → Phase 2A (Project Document PDF) → Phase 2B (CSR Audit & Fixes) → Phase 3 (PDF Audit) → Phase 4 (Blank Template PDFs) → Phase 5 (CSR Landscape & Critical Fixes) → Phase 6+ (Per findings)
```

---

*Last updated: 2026-06-16*
