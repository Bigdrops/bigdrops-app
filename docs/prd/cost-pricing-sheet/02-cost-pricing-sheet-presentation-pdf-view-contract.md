# Cost & Pricing Sheet PRD 02 — Presentation, PDF, and View Contract

**Status:** Current approved CPS presentation contract.

**Last reconciled:** 2026-10-05.

This document defines CPS form, View, and PDF presentation behavior. It does
not define calculations, numbering, persistence, or conversion ownership.

## 1. Presentation Layering Rule

CPS presentations render and collect interaction.

CPS presentations must not own:

- financial calculations;
- numbering;
- Supabase writes;
- persistence orchestration;
- conversion mapping;
- audit recording;
- PDF generation orchestration.

Business values must come from the CPS domain and shared financial authority.

## 2. Form Architecture

The current CPS form architecture is normative:

```text
CpsFormPage
-> CostPricingSheetEditor
-> responsive presentation selection
-> Desktop presentation OR Mobile/Fold presentation
```

`CostPricingSheetEditor` owns shared production state and orchestration.

The Desktop and Mobile/Fold presentations render state and collect interaction.

Local UI buffer state is allowed only when it commits through the shared editor
or domain authority.

Obsolete prototype-transplant wording is historical. It does not define the
current product architecture.

## 3. View Architecture

The current production CPS View architecture is normative.

It must:

- use the real application `Layout`;
- use the real Mobile Bottom Nav where applicable;
- avoid CPS-local fake navigation;
- separate document identity from document actions;
- present Convert to Quote, Edit, and Download as first-class actions;
- give Convert to Quote primary visual emphasis;
- keep palette/customization and More as separate action authorities;
- omit unsupported Approve behavior;
- use themed semantic FAB behavior through shared FAB standards;
- let the application layout own page scroll;
- render groups from actual group membership;
- avoid generated Group A or Group B names unless that is real source data;
- avoid fake END OF GROUP markers;
- derive company, client, title, and context from actual document data.

The PRD defines hierarchy and behavior. It does not lock obsolete HTML
prototype geometry.

## 4. View Actions

Convert to Quote is the primary commercial action.

Edit opens the CPS form through the established edit path.

Download uses the standard CPS PDF download authority.

Palette and PDF customization controls affect PDF presentation only.

More groups secondary actions. More must not expose unsupported Approve
behavior.

## 4.1 CPS Audit Trail Surface

CPS View must expose an Audit Trail or Activity History surface after the
audit foundation exists.

Users with appropriate permission must be able to inspect chronological CPS
provenance.

The surface must make events understandable without reading raw database JSON.

It must distinguish:

- CPS creation;
- direct CPS edits;
- CPS to Quotation conversion;
- Quotation item changes that feed back to CPS;
- Quotation to Invoice conversion and feedback authority handoff;
- Invoice item changes that feed back to CPS;
- skipped feedback events, such as a missing originating CPS row.

Examples of required history meaning:

- John Doe created `CPS-000123`.
- Amina Yusuf changed SP from `NGN 22,000` to `NGN 24,000`.
- John Doe converted `CPS-000123` to `QTN-000432`.
- Chidi Okafor changed `QTN-000432` item "Fuel Filter" selling price from
  `NGN 24,000` to `NGN 25,500`; CPS SP updated automatically from
  `NGN 24,000` to `NGN 25,500`.
- Amina Yusuf converted `QTN-000432` to `INV-000201`; Quotation feedback
  authority ended and Invoice became active feedback authority.
- Chidi Okafor changed the Invoice item image; CPS image updated
  automatically.

The surface must use real identities from the authentication and profile
authority. It must not fabricate names when identity data is unavailable.

The presentation design is deferred. The behavior is normative.

## 5. FAB Contract

CPS View and form document-action FABs follow:

```text
docs/standard/fab-standard.md
```

CPS must not introduce local FAB shapes, icons, or motion families for shared
document actions.

## 6. PDF Renderer Contract

The normative CPS PDF renderer is Forme/pdfcn architecture.

CPS must not use React-PDF for active CPS rendering.

Invoice and Quotation renderer choices are out of scope for this CPS PRD.

The CPS PDF template must:

- receive prepared data;
- not query Supabase;
- not own business calculations;
- consume canonical CPS financial values;
- preserve group and item structure;
- preserve CP and SP semantics;
- remain connected to the standard CPS download authority.

Forme is active production architecture for CPS. It is not an unresolved gate.

## 7. PDF Templates

CPS supports two production PDF templates:

| Template | Contract |
|---|---|
| `schedule` | Full commercial schedule. This is the primary production template. |
| `compact` | Condensed business document. It remains materially distinct from `schedule`. |

Template selection is a PDF preference.

Both templates consume the same authoritative CPS prepared data path.

## 8. PDF Customization

CPS PDF customization includes:

- document font;
- accent color;
- orientation;
- template selection.

Customization affects presentation only.

Customization must not alter:

- CP;
- SP;
- quantity;
- totals;
- profit;
- margin;
- tax;
- conversion mapping;
- persistence semantics.

The current stable font fallback is Helvetica when a selected font cannot be
used by Forme.

## 9. PDF Structure

CPS PDF output must read as an internal commercial document.

It must include:

- company identity;
- CPS document identity;
- client and approved document context;
- commercial schedule;
- groups and item membership;
- total cost;
- selling total;
- gross profit;
- margin;
- footer with document number and page numbering.

The schedule is the main visual structure.

PDF templates must not fabricate missing data.

## 10. View And PDF Parity

View and PDF must share canonical CPS business values.

The requirement is shared business authority, not a requirement for one
literal prepared object.

Both View and PDF must:

- derive values from canonical calculations;
- preserve group and row semantics;
- avoid independent business math;
- remain testable for parity.

## 11. Group Presentation

Presentations must render groups from real membership.

Group headers or section rows are structural. They are not item rows.

Deleting a group means the group container is removed and member rows become
ungrouped. This behavior is cross-presentation.

## 12. Responsive Expectations

CPS must work on mobile, fold, tablet, and desktop layouts.

The responsive contract is the current production architecture, not the old
candidate gate.

Shared app navigation and safe-area behavior remain outside CPS ownership.

## 13. Presentation Acceptance Criteria

- Current View architecture is normative.
- The unresolved View candidate gate is retired.
- Forme/pdfcn is the active CPS PDF renderer.
- React-PDF is not the active CPS renderer.
- `schedule` and `compact` are approved templates.
- PDF customization includes font, accent, orientation, and template.
- Customization is presentation-only.
- View and PDF parity is tied to shared domain/calculation authority.
- CPS presentations do not own persistence, numbering, or calculations.
- FAB behavior follows the shared FAB standard.
- CPS View exposes auditable activity history when the audit foundation exists.
- Legacy BOQ HTML candidates remain historical design evidence only.
