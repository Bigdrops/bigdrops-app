# PDF Rendering Roadmap
**Project:** BIGDROPS Business Platform
**Scope:** PDF output quality across all document types + Project Document import
**Status:** Planning
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

## Phase 2 — Project Document PDF Output

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

## Execution Order

```
Phase 1 (Project Document Import) → Phase 2 (Project Document PDF) → Phase 3 (PDF Audit) → Phase 4 (Blank Template PDFs) → Phase 5+ (PDF Fixes per findings)
```

---

*Last updated: 2026-06-16*
