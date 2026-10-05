# Cost & Pricing Sheet PRD 03 — Implementation Status and Roadmap

**Status:** Current CPS roadmap and implementation-debt register.

**Last reconciled:** 2026-10-05.

This file separates completed product decisions from remaining implementation
debt. Older waterfall gates remain historical only.

## 1. Current Status

CPS is an active product family.

The following areas are no longer open product decisions:

- CPS product identity;
- CPS default prefix;
- current View architecture;
- Forme/pdfcn CPS PDF architecture;
- schedule and compact PDF templates;
- PDF customization scope;
- current-SP stackable Instant Markup;
- Reset-to-zero and Undo Reset;
- group deletion behavior;
- conversion commercial-options step;
- downstream item feedback target for CPS-origin rows.

## 2. Completed Or Ratified Milestones

| Area | Status |
|---|---|
| CPS identity | Ratified as Cost & Pricing Sheet |
| Prefix default | Ratified as `CPS` |
| View architecture | Active production direction |
| Form architecture | Active controller/presentation split |
| Instant Markup | Current-SP stacking contract ratified |
| Conversion options | VAT, Discount, Additional Charges ratified |
| Downstream feedback | One-way CPS-origin item feedback approved as a gated target |
| PDF renderer | Forme/pdfcn active for CPS |
| PDF templates | `schedule` and `compact` approved |
| PDF customization | Font, accent, orientation, template approved |

## 3. Remaining Implementation Debt

| Debt | Product requirement that remains valid |
|---|---|
| Conversion lineage | Converted Quotations must identify the CPS document as source |
| Row-level lineage | CPS row ancestry must survive CPS -> Quotation -> Invoice |
| Downstream feedback | Quotation/Invoice to CPS feedback is approved but not implemented |
| Feedback audit | Causal field-level audit must exist before feedback is enabled |
| CPS View audit history | CPS View must expose readable audit/activity history |
| Duplicate fidelity | Duplicate must preserve approved CPS rows, groups, CP, SP, photos, columns, and order |
| Row storage | One authoritative CPS row store remains the target |
| Lifecycle audit | Material CPS lifecycle operations remain auditable |
| Row-store migration | Dual compatibility data is not the final architecture |
| Shared View/PDF model strategy | Parity must be testable through shared business authority |

## 4. Current Architecture Summary

Form:

```text
CpsFormPage
-> CostPricingSheetEditor
-> Desktop presentation OR Mobile/Fold presentation
```

View:

```text
Application Layout
-> CPS View data/business authority
-> CPS View presentation
-> shared actions and FAB behavior
```

PDF:

```text
CPS domain/prepared data
-> CPS Forme template
-> Forme/pdfcn renderer
-> standard CPS download authority
```

Conversion:

```text
CPS source
-> commercial options step
-> normal Quotation numbering authority
-> Quotation with CPS lineage
```

Approved future feedback:

```text
CPS row
-> Quotation item with CPS row ancestry
-> Invoice item with CPS row ancestry

active Quotation item unit_price/description/image_url
  OR active Invoice item unit_price/description/image_url
-> originating CPS row sp/description/image_url
```

This feedback is not currently implemented.

## 4.1 Current Implementation Status

Currently implemented:

- CPS to Quotation snapshot conversion;
- CPS SP to Quotation `unit_price` during conversion;
- document-level `source_cps_id`;
- Quotation to Invoice conversion;
- Quotation converted lifecycle state.

Not currently implemented:

- downstream to CPS feedback;
- stable CPS row to Quotation row lineage;
- stable CPS row ancestry through Invoice item;
- feedback authority handoff;
- feedback audit trail;
- CPS View downstream-feedback history.

## 5. Future Implementation Order

Future implementation passes should address debt in this order unless a
production incident changes priority.

1. Correct CPS document-level conversion lineage.
2. Repair Duplicate so it follows the full Duplicate Law.
3. Complete lifecycle audit coverage for current CPS operations.
4. Reduce row-store split-brain behavior toward one authoritative CPS row
   store.
5. Strengthen View/PDF parity tests over shared business authority.
6. Implement the downstream feedback prerequisites in the phases below.

### 5.1 Downstream Feedback Implementation Gate

Automatic downstream feedback must not be enabled until Phase 1 and Phase 2
are complete and verified.

Phase 1: Audit foundation.

Before feedback is enabled, establish:

- required audit event model;
- actor attribution;
- correlation or root causal tracking;
- parent or causal event linkage;
- CPS View audit/history access;
- direct CPS change attribution;
- downstream document edit attribution;
- conversion event attribution.

Phase 2: Row lineage.

Establish stable CPS-row ancestry through:

```text
CPS -> Quotation -> Invoice
```

The lineage must resolve the originating CPS row without heuristic matching.

Phase 3: Controlled feedback.

Only after Phase 1 and Phase 2 are validated may automatic feedback be enabled
for:

- SP;
- description;
- image URL/reference.

No code task may implement synchronization before provenance and row lineage
are reliable.

This roadmap does not prescribe a database migration.

## 6. Historical Gates

The following old gates are closed or retired for current CPS planning:

| Historical gate | Current status |
|---|---|
| BOQ product naming | Retired. CPS is canonical. |
| View candidate selection | Retired. Current production View is normative. |
| V12 transplant gate | Historical. Current controller/presentation split is normative. |
| Forme readiness gate | Retired for CPS. Forme is active CPS PDF architecture. |
| Document-font-only customization | Retired. Expanded customization is approved. |

Historical roadmap files and legacy BOQ PRD files must not be read as current
blocking gates.

## 7. Standards Notes

The document transformation standard remains authoritative for identity,
duplicate, conversion, and lineage principles.

The prefix standard remains authoritative for tenant-aware number generation.

The FAB standard remains authoritative for document-action FABs.

The shared PDF migration standard is renderer-neutral. CPS uses Forme/pdfcn
through the CPS PRD. Invoice and Quotation renderer choices remain under their
own contracts.

## 8. Verification Requirements For Future Code Tasks

Future code tasks must run the verification required by their scope and by
`AGENTS.md`, unless the user gives a stricter command for that task.

This documentation-only reconciliation did not run build, typecheck, lint,
tests, audit load, migrations, or Supabase commands.

## 9. Acceptance Criteria For Future CPS Work

Future CPS work must preserve:

- CPS identity;
- CP/SP semantics;
- current-SP Instant Markup;
- Reset-to-zero and Undo Reset;
- group delete equals ungroup members;
- conversion options exactly VAT, Discount, and Additional Charges;
- no CP transfer to Quotation;
- correct CPS lineage;
- no generic live synchronization from lineage alone;
- downstream feedback only for CPS-origin rows;
- Quotation feedback authority ends after Invoice handoff;
- Invoice becomes the active feedback authority after handoff;
- row-level CPS ancestry before feedback;
- causal field-level audit before feedback;
- CPS View audit/history exposure;
- no upstream CP, quantity, unit, group, tax, discount, charge, total, new-row,
  or deletion synchronization;
- full Duplicate Law;
- Forme/pdfcn CPS PDF rendering;
- schedule and compact PDF templates;
- expanded PDF customization;
- one-authoritative-row-store target;
- lifecycle audit requirements;
- historical BOQ/SASBOQ number validity.

Production defects must be fixed in code tasks. They must not be normalized as
approved product behavior.
