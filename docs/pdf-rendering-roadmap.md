# PDF Rendering Roadmap
**Project:** BIGDROPS Business Platform
**Scope:** PDF output quality across all document types + Project Document import
**Status:** Planning
**Last Updated:** 2026-06-15

---

## Deferred from JSON Import Roadmap

This roadmap was created to handle work that was out of scope for the JSON import improvement project.

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
- RFQ
- CSR
- Compliance Hub exports (if applicable)
- Project Documents (covered in Phase 2)

### Tasks

- [ ] For each document type: generate a real PDF and review output
- [ ] Document all quality issues found (layout, typography, field display, financial formatting, signatures, branding)
- [ ] Prioritize fixes by impact
- [ ] Create Phase 4+ tasks based on audit findings

**Completion Signal:** All document types audited. Issues documented. Phase 4+ tasks defined.

---

## Execution Order

```
Phase 1 (Project Document Import) → Phase 2 (Project Document PDF) → Phase 3 (PDF Audit) → Phase 4+ (PDF Fixes per findings)
```

---

*Last updated: 2026-06-15*
