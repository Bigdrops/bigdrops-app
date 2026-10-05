# Cost & Pricing Sheet PRD — Master Index

**Canonical product name:** Cost & Pricing Sheet.

**Short name:** CPS.

**Status:** Current approved product contract as of 2026-10-05.

This package is the authoritative CPS product contract. Legacy BOQ files in
this directory remain for migration history and compatibility notes only. They
do not define the current product identity.

## 1. Package Structure

| File | Authority |
|---|---|
| [01-cost-pricing-sheet-product-domain-architecture.md](01-cost-pricing-sheet-product-domain-architecture.md) | Product identity, CP/SP rules, groups, import, conversion, duplicate, numbering, row-store direction, audit requirements |
| [02-cost-pricing-sheet-presentation-pdf-view-contract.md](02-cost-pricing-sheet-presentation-pdf-view-contract.md) | Form, View, PDF, customization, FAB, and View/PDF parity contract |
| [03-cost-pricing-sheet-implementation-readiness-roadmap.md](03-cost-pricing-sheet-implementation-readiness-roadmap.md) | Current implementation status, completed milestones, remaining implementation debt, and future work order |
| `01-boq-domain-architecture.md` | Historical BOQ-era domain reference only |
| `02-boq-document-lifecycle.md` | Historical BOQ-era lifecycle reference only |
| `03-boq-presentation-contract.md` | Historical BOQ-era presentation reference only |
| `waterfall-roadmap.html` | Historical visual roadmap only |

## 2. Current Product Intent

CPS is an internal commercial schedule for costing, selling-price review,
margin review, approval, and quotation preparation.

CPS is not a Quotation. It can convert to a Quotation through the approved
conversion contract.

CPS is not a tax hub, invoice, receipt, or compliance source document.

## 3. Ratified Decisions

| Area | Current contract |
|---|---|
| Product identity | Cost & Pricing Sheet, CPS |
| Default prefix | `CPS` |
| Reset sequence | `CPS-000001` |
| Historical numbers | Persisted `BOQ-*` and `SASBOQ-*` values remain valid and must not be rewritten |
| Groups | Membership derives from `row.group_id`; adjacency does not define membership |
| Group deletion | Delete the group container, keep member rows, clear their group membership, preserve item order and row data |
| Instant Markup | Current-SP stacking workspace |
| Reset | Destructive workspace action that sets working item SP values to zero |
| Undo Reset | Separate immediate restore of the pre-reset markup workspace snapshot |
| View | Current production View architecture is normative |
| Conversion options | VAT, Discount, Additional Charges only |
| Conversion pricing | SP maps to Quotation `unit_price`; CP never transfers |
| Downstream item feedback | Approved target for CPS-origin rows only; audit and row lineage are hard prerequisites |
| Duplicate | Full Duplicate Law remains required |
| CPS PDF renderer | Forme/pdfcn architecture |
| CPS PDF templates | `schedule` and `compact` |
| PDF customization | Font, accent color, orientation, template selection |
| Row vocabulary | CPS uses `item` and `section` |

## 4. Approved Product Evolution

The following items supersede older PRD wording:

- CPS replaces BOQ as the active product identity.
- The old unresolved View candidate gate is retired.
- The old CP-based one-shot Instant Markup contract is retired.
- The old document-font-only PDF customization contract is retired.
- The old Forme readiness gate is retired for CPS PDF work.
- The two CPS PDF templates are approved production choices.
- The commercial-options step before conversion is approved.

## 5. Still-Valid Implementation Debt

The PRD must not ratify current production defects as product behavior.

| Debt | Required product contract |
|---|---|
| Conversion lineage defect | Converted Quotations must identify the CPS document as the source |
| Row-level lineage gap | CPS row ancestry must survive CPS -> Quotation -> Invoice before feedback can run |
| Downstream feedback gap | Quotation/Invoice item feedback to CPS is approved but not implemented |
| Feedback audit gap | Automatic downstream feedback must not run until causal field-level audit exists and is visible from CPS View |
| Parent-only duplicate defect | Duplicate must preserve permitted CPS document work, including rows, groups, CP, SP, photos, columns, and order |
| Split row storage | Target is one authoritative CPS row store |
| Lifecycle audit gaps | Material lifecycle operations remain auditable |
| Row-store migration state | Current dual compatibility storage is debt, not final architecture |

## 6. Legacy BOQ Material

BOQ terminology may remain only for:

- historical migration context;
- legacy document numbers;
- historical reports;
- backward compatibility notes.

BOQ is not the current product identity.

## 7. Shared Standards

The CPS PRD follows these shared standards where they apply:

- `docs/standard/document-transformation-standard.md`
- `docs/standard/prefix-engine-settings-standard.md`
- `docs/standard/fab-standard.md`
- `docs/standard/pdf-customization-extension-standard.md`
- `docs/standard/pdf-migration-standard.md`

The shared PDF migration standard is renderer-neutral. CPS uses Forme/pdfcn
through this PRD. Invoice and Quotation renderer choices remain under their own
contracts.

## 8. Implementation Rule

Future CPS implementation must distinguish four categories:

1. Normative product contract.
2. Current implementation status.
3. Historical or migration notes.
4. Open implementation debt.

Implementation debt is not product uncertainty.
