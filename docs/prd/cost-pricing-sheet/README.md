# BOQ PRD — Master Index

**The Reconstructed BOQ Document Family**

**Date:** 2026-09-29
**Documentation standard:** ASD-STE100 Simplified Technical English
**Skills used:** writing-clearly-and-concisely, animate, design-artifact
**Status line:** Approved product direction. Planning authorization only. **Overall BOQ implementation readiness: NOT READY** — one hard gate remains open (View Page candidate).

> **Relocation notice.** This package replaces the monolithic `docs/prd/boq-architecture-prd.md`. The old file is now a short relocation/index document. This package is the single authoritative BOQ specification.

---

## Status Board

| Decision area | Status |
| :--- | :--- |
| BOQ domain/backend architecture | **RESOLVED** — [01](01-boq-domain-architecture.md) |
| CP/SP ownership and commercial calculation architecture | **RESOLVED** — [01 §4–§5](01-boq-domain-architecture.md) |
| BOQ → Quotation snapshot conversion | **RESOLVED** — [02 §3](02-boq-document-lifecycle.md) |
| Quotation → Invoice snapshot boundary | **RESOLVED** — [02 §4](02-boq-document-lifecycle.md) |
| Form design direction | **V12 ACCEPTED AS PRESENTATION DIRECTION, PRODUCTION TRANSPLANT GATED** — [03 §2](03-boq-presentation-contract.md) |
| PDF renderer | **RESOLVED — pdfcn Forme** (D16) — [03 §6](03-boq-presentation-contract.md) |
| View Page candidate | **UNRESOLVED** (no explicit acceptance evidence) — [03 §9](03-boq-presentation-contract.md) |
| Overall BOQ implementation readiness | **NOT READY** while any hard gate remains unresolved |

---

## 1. Product Intent (old §1–§2)

BOQ is being rebuilt as a mature document family. It was demolished in Phase 1. Its form and view pages are placeholders. This package settles the architecture before the approved V12 form design is transplanted into React. The transplant must consume prepared behavior. It must not invent backend or domain behavior.

BOQ serves a builder who needs a priced schedule of works. The builder estimates cost, sets a selling price, and sees margin, then converts the schedule into a customer-facing Quotation.

```
Estimate → BOQ → convert → Quotation → convert → Invoice
```

Three tensions shape the design.

**Tension 1 — BOQ must remain a BOQ.** Cost Price (CP), Selling Price (SP), total cost, total selling price, and gross profit are BOQ identity. They are not optional.

**Tension 2 — BOQ must convert cleanly to Quotation.** Conversion must be a defined field mapping. It must not be a translation between unrelated table systems.

**Tension 3 — BOQ must not damage shared systems.** Invoice, Quotation, RFQ, and Waybill must not regress. RFQ shares the `table-document` layer with BOQ today. That sharing must be unwound safely.

| Requirement | Consequence |
| :--- | :--- |
| The builder must see profit | CP, SP, cost, selling price, gross profit stay first-class |
| The schedule must become a quote | Conversion must be lossless for shared fields |
| The quote must look like a normal Quotation | BOQ needs Quotation-compatible commercial columns |
| The schedule must group work | Groups are first-class in BOQ and in BOQ import |
| The schedule must be importable | BOQ is a first-class JSON Import document |
| The schedule must show photos | BOQ uses the established Cloudinary architecture |
| The schedule must number correctly | BOQ fully conforms to the Prefix Engine standard |
| The design must land on solid ground | Domain and persistence prepare before V12 transplant |

---

## 2. BOQ Domain Identity (old §3, summary)

BOQ is a **costing and pricing schedule**. This is the identity test for every future decision.

- Nine identity invariants (I1–I9): every item carries CP and SP; total cost = Σ(cp × qty); total selling = Σ(sp × qty); gross profit = difference; row profit = (sp − cp) × qty; CP is never a tax base and never appears on a Quotation; SP is the commercial price; BOQ totals ≠ Quotation totals; BOQ never becomes Quotation with a CP field added.
- BOQ is not a Tax Hub or Compliance Hub source document, not an Invoice, not a receipt.
- Locked formulas live in `src/domain/boq/calculateBoqTotals.ts` and `src/lib/Calculations.ts`. No task may change them without separate explicit authorization.

Full statement: [01 §1](01-boq-domain-architecture.md).

---

## 3. Authoritative Product Decisions (old §4 + new)

Where an older standard or prior report conflicts with these decisions, the conflict is recorded in [§12](#12-standards-applicability-summary-old-30-31) and the decision governs.

| ID | Decision |
| :--- | :--- |
| D1 | BOQ supports groups. |
| D2 | BOQ JSON Import supports groups. |
| D3 | BOQ Column Settings must reach Quotation-level capability. |
| D4 | BOQ includes Quotation-compatible VAT, discount, and install behavior. |
| D5 | D4 does not make BOQ a Tax Hub or Compliance Hub source document. |
| D6 | CP remains BOQ-specific. |
| D7 | SP maps to Quotation `unit_price` at conversion. |
| D8 | Conversion is snapshot-based. |
| D9 | Later BOQ changes do not mutate an existing Quotation. |
| D10 | Later Quotation changes do not mutate an existing Invoice. |
| D11 | Invoice changes never propagate upward. |
| D12 | Lineage is ancestry and audit history. It is not synchronization. |
| D13 | Sub Description is a per-item capability, not a Column Settings option. |
| D14 | Production photos use the established Cloudinary architecture. |
| D15 | The V12 transplant consumes prepared architecture. It does not invent it. |
| **D16** | **BOQ PDF renderer = pdfcn Forme** (decided 2026-09-29). Takumi is not the BOQ renderer. The renderer is shared infrastructure owned by `docs/prd/pdf-rendering-migration/`; BOQ only defines adapter/composition responsibilities ([03 §6](03-boq-presentation-contract.md)). |

---

## 4. High-Level Architecture (old §6, summary)

```text
V12 PRESENTATION        BoqFormScreen · BoqViewScreen        (LAST — gated)
        ▲
PAGE ORCHESTRATION      BoqFormPage · New/EditBoq · useBoqSave
        ▲
SHARED SERVICES         columns · import · photo · numbering · save · FAB
        ▲
DOMAIN                  Layer 1 computeDocument()  ·  Layer 2 computeBoqTotals()
        ▲
PERSISTENCE             boqs (header)  ·  boq_rows (AUTHORITATIVE rows)
```

- One authoritative row store: `boq_rows` ([01 §13](01-boq-domain-architecture.md)).
- Two-layer calculation over one row set ([01 §5](01-boq-domain-architecture.md)).
- PDF: prepared data → BOQ-owned template → shared pdfcn Forme renderer ([03 §5–§6](03-boq-presentation-contract.md)).

Full layer diagram with ownership table: [01 §2](01-boq-domain-architecture.md).

---

## 5. PRD Package Map (old → new traceability)

| File | Contents |
| :--- | :--- |
| [01-boq-domain-architecture.md](01-boq-domain-architecture.md) | Domain identity, target architecture, compatibility contract, CP/SP, calculations, columns, fields, sub description, groups, JSON import, photos, prefix engine, persistence, RFQ isolation, migrations, shared infra map, standards matrix + deltas, file map, ordered domain sequence, domain risks, domain acceptance |
| [02-boq-document-lifecycle.md](02-boq-document-lifecycle.md) | Save/form lifecycle, snapshot lineage model, BOQ → Quotation mapping, Quotation → Invoice boundary, duplicate, lineage/audit, export, lifecycle risks, lifecycle acceptance |
| [03-boq-presentation-contract.md](03-boq-presentation-contract.md) | FAB contract, V12 direction + readiness gate, Phase H, View Page architecture, PDF architecture, pdfcn Forme decision and integration, parity, presentation rules, View Page candidate audit (UNRESOLVED), presentation risks, presentation acceptance |
| [waterfall-roadmap.html](waterfall-roadmap.html) | Standalone animated dependency waterfall derived from §10 |
| [../../prd/boq-architecture-prd.md](../boq-architecture-prd.md) | Relocation/index stub only — not authoritative |

**Old monolithic section mapping (traceability):**

| Old § | New home |
| :--- | :--- |
| §1 Executive Summary | README §1 |
| §2 Product Intent | README §1 |
| §3 Domain Identity | README §2 + 01 §1 |
| §4 Authoritative Product Decisions | README §3 |
| §5 Current-State Architecture | README §7 |
| §6 Target-State Architecture | README §4 (summary) + 01 §2 (full) |
| §7 Compatibility Contract | 01 §3 |
| §8 Snapshot Lineage Model | 02 §2 |
| §9 Price Ownership | 01 §4 |
| §10 Commercial Calculation | 01 §5 |
| §11 Column Settings | 01 §6 |
| §12 Mandatory Field Semantics | 01 §7 |
| §13 Sub Description | 01 §8 |
| §14 Groups | 01 §9 |
| §15 JSON Import | 01 §10 |
| §16 Photos / Cloudinary | 01 §11 |
| §17 Prefix Engine | 01 §12 |
| §18 Persistence | 01 §13 |
| §19 Save / Form Lifecycle | 02 §1 |
| §20 BOQ → Quotation Mapping | 02 §3 |
| §21 Quotation → Invoice Boundary | 02 §4 |
| §22 Duplicate | 02 §5 |
| §23 Lineage & Audit | 02 §6 |
| §24 FAB | 03 §1 |
| §25 PDF / View / Customization | 03 §4, §5 |
| §26 Export | 02 §7 |
| §27 RFQ Isolation | 01 §14 |
| §28 Schema / Migrations | 01 §15 |
| §29 Shared Infra Map | 01 §16 |
| §30 Standards Matrix | README §12 (summary) + 01 §17 (full) |
| §31 Standards Delta | README §12 (summary) + 01 §18 (full) |
| §32 Future File Map | 01 §19 |
| §33 Ordered Sequence | README §10 (waterfall) + 01 §20 (Phases A–G) + 03 §3 (Phase H) |
| §34 V12 Readiness Gate | README §11 (summary) + 03 §2 (full) |
| §35 Risk Register | README §13 (summary) + 01 §21 / 02 §8 / 03 §10 (split) |
| §36 Non-Goals | README §14 |
| §37 Remaining Questions | README §9 |
| §38 Final Acceptance | README §15 (package level) + 01 §22 / 02 §9 / 03 §11 (topical) |
| — (new) | 03 §6 pdfcn Forme decision; 03 §9 View Page audit |

---

## 6. Architecture Dependency Map

```text
Standards deltas (01 §18) ─┐
Migrations M1–M3 (01 §15) ─┼─► FOUNDATION ─► COMMERCIAL ENGINE ─► DOCUMENT CAPABILITIES
                           │        │                │                    │
Shared infra extensions ───┘        └────────────────┴────────────────────┤
                                                                          ▼
                                             LIFECYCLE ─► PRESENTATION INFRASTRUCTURE
                                                                    │
External dependency: docs/prd/pdf-rendering-migration (Forme) ──────┤
                                                                    ▼
                                             FINAL PRESENTATION TRANSPLANT  [GATED]
                                                                        ▲
View Page candidate acceptance (03 §9) ────────────────────────────────┘ (open)
```

**Shared-system dependencies BOQ consumes but does not own:**

| Dependency | Owner | Effect on BOQ |
| :--- | :--- | :--- |
| pdfcn Forme renderer readiness | `docs/prd/pdf-rendering-migration/` | Blocks BOQ PDF implementation ([03 §6.6](03-boq-presentation-contract.md)) |
| V12 form candidate | Design-direction folder (accepted) | Blocks nothing; transplant runs after the gate |
| View Page candidates | Design-direction/view/boq | **UNRESOLVED** — blocks presentation phase |
| Shared column/import/photo/numbering/save infra | Invoice/Quotation modules | Requires behavior-preserving extensions ([01 §16.1](01-boq-domain-architecture.md)) |
| `table-document` layer | RFQ | BOQ must migrate off it without touching RFQ ([01 §14](01-boq-domain-architecture.md)) |

---

## 7. Current Implementation Status (old §5, re-verified)

### 7.1 What exists today

| Area | Current state | Evidence |
| :--- | :--- | :--- |
| Form page | Placeholder. No form. | `src/pages/NewBoq.tsx`, `src/pages/EditBoq.tsx` |
| View page | Placeholder. No view. | `src/pages/ViewBoq.tsx` |
| List page | Working, shared infra | `src/components/boq/BoqList.tsx`, `src/pages/Boqs.tsx` |
| Domain types | `TableDocumentRow` based | `src/domain/boq/types.ts` |
| Row model | `row_type: 'item' \| 'section'` | `src/domain/table-document/types.ts` |
| Columns | `TableDocumentColumn`, boolean `visible` | `src/domain/table-document/templateRegistry.ts` |
| Column settings UI | Checkbox list, 7 entries | `src/components/table-document/TableColumnControls.tsx` |
| Calculation | `computeBoqTotals` only | `src/domain/boq/calculateBoqTotals.ts` |
| Numbering | Shared prefix engine, create path missing | `src/domain/boq/normalize.ts` |
| JSON Import | Absent | No `src/domain/boq/importAdapter.ts` |
| Item photo | Absent. No `image_url`. | `boq_rows` schema |
| Groups | Sections only | `row_type: 'section'` |
| Save | Absent | No create/save path |
| Conversion | Present, lossy, defective | `src/pages/view-boq-actions.ts` |
| Duplicate | Copies parent row only | `src/pages/view-boq-actions.ts` |
| Export | Wrong table name | `src/services/exportFetchers.ts:51` |
| PDF | Phase 1 removed `BoqPdfDocument.tsx`; rebuild targets pdfcn Forme | `src/components/boq/` (deleted, git status) |
| View UI | Phase 1 removed `src/components/document-view/boq/**` | git status |
| Audit | None emitted | No `recordBoq*` in `src/lib/audit.ts` |
| FAB | List only | `src/components/boq/BoqList.tsx` |

### 7.2 Persistence today

BOQ writes rows to two places *(evidence)*:

1. `boqs.custom_fields.table_rows` — a full `TableDocumentRow[]` array.
2. `boq_rows` — one row per item, with `cells jsonb` holding `{ specification, make_brand, cp, sp }`.

`normalizeDbBoq` prefers `custom_fields.table_rows` when it is non-empty *(evidence)*. Two writable stores exist for the same canonical state. This is split-brain ownership. [01 §13](01-boq-domain-architecture.md) resolves it.

### 7.3 Prior-report corrections

This package corrects three items from earlier reports.

| Item | Prior report said | This package records |
| :--- | :--- | :--- |
| BOQ audit migration needed | Implied | **No migration needed.** `activity_events.entity_type` already allows `'boq'` and `audit_logs.entity_type` is unconstrained *(evidence)*. Only application code is missing ([02 §6.2](02-boq-document-lifecycle.md)). |
| BOQ prefix settings entry | Not verified | **Already complete.** `boq` is in the prefix CHECK constraint and in the settings UI *(evidence)* ([01 §12.1](01-boq-domain-architecture.md)). |
| Column registry extension | Two options open | **Resolved to one design.** Document-scoped built-ins via optional parameter ([01 §6.3](01-boq-domain-architecture.md)). |

Evidence basis: `docs/reports/boq/boq-presentation-demolition-phase1-report-2026-09-29.md`, `docs/reports/boq/boq-reconstruction-transplant-plan-2026-09-29.md`, `docs/reports/boq/boq-quotation-compatibility-audit-2026-09-29.md`, plus repository code, migrations, standards, and critical tests re-verified for this package. Prior reports are inputs, not authority.

---

## 8. Resolved Decisions

| Area | Resolution | Reference |
| :--- | :--- | :--- |
| Domain identity and locked formulas | Resolved | 01 §1 |
| Target architecture and ownership | Resolved | 01 §2 |
| BOQ ↔ Quotation compatibility (field-by-field) | Resolved | 01 §3 |
| CP/SP ownership; SP as tax base | Resolved (D6, D7) | 01 §4 |
| Two-layer calculation architecture | Resolved | 01 §5 |
| Column Settings design (document-scoped built-ins + hide-full deny list) | Resolved (D3) | 01 §6 |
| Sub Description as per-item capability | Resolved (D13) | 01 §8 |
| Groups = Quotation row vocabulary | Resolved (D1, D2) | 01 §9 |
| JSON Import on the shared pipeline | Resolved | 01 §10 |
| Photos on `boq_rows.image_url`, one Cloudinary preset | Resolved (D14) | 01 §11 |
| Prefix engine conformance; M1 uniqueness requirement | Resolved | 01 §12 |
| `boq_rows` = single authoritative row store | Resolved | 01 §13 |
| RFQ isolation strategy | Resolved | 01 §14 |
| Migrations required (M1–M4) and not required | Resolved (requirements only) | 01 §15 |
| Save/form lifecycle contract | Resolved | 02 §1 |
| Snapshot lineage model; no live sync | Resolved (D8–D12) | 02 §2 |
| BOQ → Quotation conversion mapping | Resolved | 02 §3 |
| Quotation → Invoice boundary (already snapshot-based) | Resolved | 02 §4 |
| Duplicate semantics (new origin) | Resolved | 02 §5 |
| Audit: no migration; app emitters only | Resolved | 02 §6 |
| Export defect fix | Resolved | 02 §7 |
| FAB contract (standard v1.1) | Resolved | 03 §1 |
| V12 as accepted form direction + 20-item gate | Resolved (transplant gated) | 03 §2 |
| **PDF renderer** | **Resolved — pdfcn Forme (D16)** | 03 §6 |
| PDF/view/form parity rules | Resolved | 03 §7 |

---

## 9. Unresolved Decisions (old §37 + View Page)

> **Hard gate: VIEW PAGE CANDIDATE — UNRESOLVED.** No repository evidence records an explicit product acceptance of any candidate (V1–V4; seven HTML files, four reports). All four reports defer acceptance. The package is NOT implementation-ready for presentation work until this resolves. See [03 §9](03-boq-presentation-contract.md).

Remaining questions that evidence and authoritative decisions cannot settle:

**Q1 — Is WHT deferred beyond stage 1, or excluded permanently?**
Evidence: WHT exists on Quotation (`wht`, `whtType`, `whtValue`) and in `calculateDocument`. BOQ has no WHT field or column.
Default if unanswered: **defer beyond stage 1** ([01 §5.6](01-boq-domain-architecture.md)).

**Q2 — Should BOQ expose an `amount` column in stage 1?**
Evidence: Quotation has `amount` as a non-removable built-in. V12 shows cost, selling, profit, margin — no per-row `amount`.
Default if unanswered: **include `amount`** for parity, defined as `quantity × sp`.

**Q3 — Is `boqs.client_name` the conversion client, or is `vendor_name`?**
Evidence: `boqs` has both. Current code prefers `vendor_name`. [02 §3.5](02-boq-document-lifecycle.md) argues `client_name`.
Default if unanswered: **`client_name`, falling back to `vendor_name`**.

**Q4 — Does BOQ keep `cells jsonb` after M4, as a permanent safety net?**
Evidence: M4 proposes dropping it after a release cycle.
Default if unanswered: **drop after one clean release cycle** ([01 §15](01-boq-domain-architecture.md)).

**Q5 — Which V12 proof points must a reviewer sign off on before Phase H opens?**
Evidence: the gate defines 20 items but does not assign an approver.
Default if unanswered: **the project lead approves [03 §2.2](03-boq-presentation-contract.md) in writing.**

Open items inherited from the View Page reports: CP/SP visibility permission on desktop; whether Approved locks Edit/Convert; More sheet vs dropdown on desktop; sticky-bar crowding; ledger rows vs cards; divider weight; margin display precision; CP visibility by role ([03 §9.4](03-boq-presentation-contract.md)).

---

## 10. Implementation Phase Overview (old §33, waterfall form)

The authoritative waterfall view is `waterfall-roadmap.html`. The phases below derive directly from [01 §20](01-boq-domain-architecture.md) and [03 §2–§3](03-boq-presentation-contract.md).

| # | Phase | Scope (derived from) | Gate state |
| :-: | :--- | :--- | :--- |
| 1 | **FOUNDATION** | Domain contracts (01 §1–§3), schema/persistence preparation, authoritative `boq_rows` model (01 §13), migration requirements M1–M3 (01 §15) | Resolved — implementation pending |
| 2 | **COMMERCIAL ENGINE** | CP/SP ownership (01 §4), two-layer calculations (01 §5), VAT/discount/install parity (01 §5.6), Column Settings (01 §6) | Resolved — implementation pending |
| 3 | **DOCUMENT CAPABILITIES** | Groups (01 §9), Sub Description (01 §8), JSON import (01 §10), photos (01 §11), prefix/numbering (01 §12) | Resolved — implementation pending |
| 4 | **LIFECYCLE** | Save/duplicate (02 §1, §5), BOQ → Quotation (02 §3), Quotation → Invoice boundary (02 §4), lineage/audit (02 §6), export (02 §7) | Resolved — implementation pending |
| 5 | **PRESENTATION INFRASTRUCTURE** | pdfcn Forme readiness (03 §6.6), BOQ PDF composition (03 §6.5), PDF customization (03 §5.3), View Page readiness (03 §9) | Forme RESOLVED; **View Page UNRESOLVED** |
| 6 | **FINAL PRESENTATION TRANSPLANT** | V12 production integration (03 §2), View Page integration (03 §4), PDF/view/form parity (03 §7), final static verification gate | **GATED** by 03 §2.2 (20 items) |

Old §33 mapping: Phases A+B → waterfall phase 1; Phase C+D+E → phase 2; Phase F + parts of G → phase 3; Phase D/G remainder → phase 4; new Forme/View work → phase 5; old Phase H → phase 6.

---

## 11. Hard Readiness Gates (old §34, summary)

| Gate | Definition | State |
| :--- | :--- | :--- |
| **G1 — V12 Plug-and-Play Readiness Gate** | 20 proof items spanning row model, persistence, CP/SP, calculations, columns, groups, import, photos, numbering, save, conversion, lineage, duplicate, audit, prepared-data contracts, migrations, standards, RFQ isolation, View Page acceptance | Not started; item 20 cannot turn green yet |
| **G2 — Transplant prohibition list** | 14 things the V12/View transplant MUST NOT do | Defined ([03 §2.4](03-boq-presentation-contract.md)) |
| **G3 — View Page candidate acceptance** | Written product acceptance of one candidate | **OPEN — UNRESOLVED** ([03 §9.5](03-boq-presentation-contract.md)) |
| **G4 — Forme BOQ PDF readiness** | 10 conditions before BOQ PDF implementation ([03 §6.6](03-boq-presentation-contract.md)) | Open; depends on the renderer migration workstream |
| **G5 — M4 authorization** | Legacy cleanup only after production verification | Separate explicit authorization required |

**V12 reinterpretations** (which prototype assumptions do not survive) are recorded in [03 §2.5](03-boq-presentation-contract.md).

---

## 12. Standards Applicability Summary (old §30–§31)

Full matrix: [01 §17](01-boq-domain-architecture.md). Full deltas: [01 §18](01-boq-domain-architecture.md).

| Class | Count | Notes |
| :--- | :-: | :--- |
| C — conforming as-is | 1 | `pdf-customization-extension-standard.md` |
| M — applicable, implementation missing | 9 | prefix, FAB, form consolidation, save orchestration, transformation, lifecycle, image upload, PDF migration, audit |
| S — stale, needs documentation update | 3 (+1) | json-import (§1/§6/§9), document-column (§2/§4.3), audit-trail (§6); **plus `pdf-migration-standard.md`, which needs a renderer-neutral rewrite for D16** |
| X — conflicts with BOQ direction | 1 | json-import group clauses contradict D1/D2 |
| N — not applicable | 3 | receipt, docs-commit-workflow, Commercial Party (placeholder) |

**No standard is modified by this package.** Every delta is a separately authorized task.

---

## 13. Risk Summary (old §35)

| Domain (01 §21) | Lifecycle (02 §8) | Presentation (03 §10) |
| :--- | :--- | :--- |
| R1 no unique `boq_number` constraint | R7 conversion writes unknown columns | R13 transplant before the gate |
| R2 M3 backfill corrupts rows | R8 conversion loses groups | R18 concurrent agent edits |
| R3 split-brain row stores | R9 duplicate copies parent row only (certain today) | P1 view candidate chosen implicitly |
| R4 shared column extension regressions | R12 export queries nonexistent table (certain today) | P2 BOQ PDF built before Forme readiness |
| R5 contradictory totals | R15 CP leaks into a Quotation | P3 pdfcn Table abstraction has no header repeat |
| R6 `hide_full` breaks Layer 2 | R16 lineage misread as sync | P4 renderer coupling leaks into BOQ |
| R10 RFQ regression | R17 vendor/client mapping wrong | P5 Forme font format failures |
| R11 stale standards mislead agents | | |
| R14 Tax/Compliance Hub leakage | | |
| R19–R22 photo/backfill hygiene | | |

---

## 14. Explicit Non-Goals (old §36)

This package does **not** authorize or describe:

1. Implementing any application code.
2. Writing, pushing, or modifying any migration.
3. Modifying `docs/standard/**`.
4. Modifying the approved V12 HTML candidate.
5. Modifying `claude-version.html`.
6. Running `bun run build`, `typecheck`, `lint`, `test`, `audit:load`, or any database command.
7. Reconstructing RFQ.
8. Redesigning Quotation or Invoice.
9. Adding WHT or amount-in-words to BOQ in stage 1.
10. Making BOQ a Tax Hub or Compliance Hub source document.
11. Adding live synchronization anywhere in the BOQ → Quotation → Invoice chain.
12. Inventing a new financial formula.
13. Creating a BOQ-only column framework, import engine, group engine, photo uploader, numbering engine, or PDF rendering engine.
14. Deleting `table-document` or forcing RFQ onto the new architecture.
15. Adding a second Cloudinary account or upload preset.
16. A BOQ revert workflow in stage 1.
17. Modifying View Page candidate HTML files or selecting a View Page candidate.
18. Duplicating the pdfcn renderer migration specification inside this package.

---

## 15. Final Package-Level Acceptance Criteria (old §38 + package level)

The package is accepted when a future agent can answer **yes** to every item.

### Package coherence
- [ ] The old monolithic PRD is a relocation stub only; this package is the single authoritative BOQ specification.
- [ ] README is the clear master/index document; the three specifications are navigable from it.
- [ ] Every old §1–§38 section maps to a new location ([§5](#5-prd-package-map-old--new-traceability)); no normative contract exists in two contradictory copies.
- [ ] Repository evidence and target-state requirements are visibly distinguished (*(evidence)* markers).
- [ ] Unresolved decisions stay unresolved ([§9](#9-unresolved-decisions-old-37--view-page)).

### Status accuracy
- [ ] The status board matches the detailed documents.
- [ ] pdfcn Forme is recorded as the BOQ PDF renderer (D16); Takumi is not.
- [ ] The View Page candidate is UNRESOLVED because no explicit acceptance evidence exists.
- [ ] Overall readiness is NOT READY while a hard gate is open.
- [ ] V12 remains gated behind backend/domain readiness (G1).

### Technical completeness
- [ ] Domain acceptance passes ([01 §22](01-boq-domain-architecture.md)).
- [ ] Lifecycle acceptance passes ([02 §9](02-boq-document-lifecycle.md)).
- [ ] Presentation acceptance passes ([03 §11](03-boq-presentation-contract.md)).

### Execution hygiene (this documentation task)
- [ ] Zero application source files changed.
- [ ] Zero migration files changed.
- [ ] Zero standards files changed.
- [ ] Zero existing V12/view-candidate HTML files changed.
- [ ] `waterfall-roadmap.html` is the only newly authored HTML artifact.
- [ ] `frontend-design` was not loaded.
- [ ] Every skill used is registered in `docs/PROJECTSKILLINDEX.md`.
- [ ] Every path cited exists, or is marked "to create".
- [ ] `git diff --check` passes.
- [ ] No build, typecheck, lint, test, `audit:load`, or database command was run.
