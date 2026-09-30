# Cost & Pricing Sheet V13 / V4.1 Final Design Readiness Audit

This report was written by Codex on 2026-09-29 via Codex desktop.

## 1. Executive Summary

Objective: Audit the current Cost & Pricing Sheet V13 Form candidates and V4.1 View candidates for final design readiness.

Scope: This audit used static inspection only. It inspected candidate HTML, the active PRD package, prior audit reports, and related production architecture. It did not execute the candidates.

Files changed: `docs/reports/cost-pricing-sheet/cost-pricing-sheet-v13-v4.1-final-design-readiness-audit-2026-09-29.md`

Skills used: gitnexus-exploring, html-prototype, design-artifact, writing-clearly-and-concisely

Documentation standard: ASD-STE100 Simplified Technical English

Changes made: Created one audit report. No application source, PRD, standard, migration, candidate HTML, historical report, or configuration file was modified.

Final verdict: V13 Form and updated V4.1 View can now serve as design implementation contracts for the main Form and View direction. The previous stale finding that the Form was not ready due to missing Instant Markup evidence is superseded. V13 now gives enough Instant Markup semantics for deterministic implementation.

The View remains ready with adapters. The updated V4.1 candidates now include a customization affordance. That affordance is product evidence that exceeds the current BOQ/CPS customization policy. It needs policy and renderer work, but it is not a design blocker.

The overall implementation-readiness gate is still open. The blockers are implementation and missing surfaces, not the main Form or View design direction. The largest open design gap is that Audit Trail / Activity and lineage / related-document surfaces are still not represented in the latest V4.1 candidates.

Supabase push status: Not applicable. No SQL changed.

## 2. Evidence / Files Inspected

### Candidate Files

| Area | File |
|---|---|
| Form desktop | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-desktop.html` |
| Form mobile/fold | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-mobile-fold.html` |
| View desktop | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html` |
| View mobile/fold | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html` |

### PRD Files

| File |
|---|
| `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md` |
| `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md` |
| `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md` |
| `docs/prd/cost-pricing-sheet/waterfall-roadmap.html` |

### Historical Reports

| File | Use |
|---|---|
| `docs/reports/cost-pricing-sheet/cost-pricing-sheet-view-readiness-and-instant-markup-audit-2026-09-29.md` | Previous readiness and Instant Markup audit. Historical context only. |
| `docs/reports/cost-pricing-sheet/boq-form-candidate-v13-2026-09-29.md` | V13 Form candidate report. |
| `docs/reports/cost-pricing-sheet/boq-view-candidate-v4.1-2026-09-29.md` | Earlier V4.1 View candidate report. |
| `docs/reports/boq/boq-view-v4.1-pipe-and-customize-2026-09-29.md` | Updated V4.1 pipe and customize report. |

### Production Architecture

| Area | Files inspected |
|---|---|
| BOQ/CPS domain types and normalization | `src/domain/boq/types.ts`, `src/domain/boq/normalize.ts` |
| BOQ/CPS costing engine | `src/domain/boq/calculateBoqTotals.ts` |
| Shared commercial engine | `src/lib/Calculations.ts`, `src/domain/invoice/calculations.ts` |
| Column behavior | `src/domain/invoice/columns.ts` |
| Customization policy | `src/domain/pdf/customization/boq.ts`, `src/domain/pdf/customization/types.ts`, `src/domain/pdf/customization/commercial.ts` |
| Audit precedents | `src/lib/audit.ts`, `src/components/document-view/invoice/sections/ActivityCard.tsx`, `src/components/document-view/quotation/QuotationActivityCard.tsx` |
| Lineage / related-document precedents | `src/components/document-view/invoice/sections/RelatedDocsCard.tsx` |
| Conversion, duplication, export | `src/pages/view-boq-actions.ts`, `src/services/exportFetchers.ts`, `src/utils/exportCompilers.ts` |

## 3. V13 Form Readiness

V13 is V12 plus Instant Markup. The V13 mobile candidate states this directly in the file header. The desktop candidate states that it uses the same product model, calculation policy, and Instant Markup behavior as the mobile/fold candidate. The candidates differ in composition, not in contract.

V13 now covers the missing semantic area from the stale audit. It specifies:

| Topic | V13 evidence |
|---|---|
| Entry point | The toolbar contains a `Markup` action. Desktop also has a right-rail Instant Markup card. |
| Workspace | Mobile opens a sheet. Desktop opens a right-dock panel. |
| Modes | `Percentage` and `Value`. |
| Basis | Markup derives from CP, not from current SP. |
| Output | Apply materializes SP values. |
| Preview | The candidate shows a preview before mutation. |
| Undo | Immediate undo restores prior SP values. |
| Scope | Eligible priced item rows only. Group headers do not participate. |
| Safety | CP, quantities, and groups are not changed. Negative inputs are blocked. |

The Form design gate is closeable. Implementation remains required for persistence, audit logging, Decimal-backed calculation, permissions, and tests.

## 4. Instant Markup Candidate Contract

### Candidate Behavior

The candidate contract is a cost-plus SP derivation command.

| Contract point | Verified candidate behavior |
|---|---|
| Invocation | The `Markup` toolbar action opens the Instant Markup workspace. Desktop also exposes `Instant Markup` in the right rail. |
| Percentage mode | `SP = CP x (1 + percentage / 100)`. |
| Value mode | `SP = CP + value`. The value is per item unit. It is not a document total, not a distribution, and not a direct SP set. |
| Basis | The basis is CP. Re-apply derives again from CP. It does not add to current SP. |
| Participation | Each eligible item row can be Included or Excluded. Include All and Exclude All controls exist. |
| Default participation | The file header states that the default is Included. The sample state excludes two manual rows by default. This sample exception is visible in prototype state, but the contract text says default Included. |
| Group rows | Group headers are never priced rows. They do not participate. |
| Ineligible rows | CP equal to zero or missing CP is shown as `Excluded - No cost price`. |
| Mutation | Apply overwrites SP for included rows with the derived SP. Excluded rows keep current SP. |
| Preview | The preview shows the affected item count, selling total before and after, gross profit before and after, aggregate change, and per-row current/proposed figures. |
| Cancel | Cancel closes without mutation. |
| Undo | Undo restores the previous SP values from a transient snapshot. |
| Rounding | The candidate states that demo JavaScript uses floating-point arithmetic and rounds display/prototype values to two decimal places. |
| Durable data | Resulting SP values are the durable output in the candidate. Markup configuration is not persisted in the candidate. |
| Audit | The header names audit intent, but no production audit event exists in the prototype. |

## 5. Instant Markup Semantic Matrix

| No. | Question | Classification | Answer |
|---:|---|---|---|
| 1 | Where is Instant Markup invoked? | VERIFIED FROM V13 | From the `Markup` toolbar action on mobile and desktop. Desktop also has a right-rail `Instant Markup` entry. |
| 2 | Is its behavior identical on desktop and mobile/fold? | VERIFIED FROM V13 | Yes. The desktop header states that the same semantics are used. The layout differs only by composition. |
| 3 | What modes exist? | VERIFIED FROM V13 | Percentage and Value. |
| 4 | What exactly does Percentage mean mathematically? | VERIFIED FROM V13 | `SP = CP x (1 + percentage / 100)`. |
| 5 | What exactly does Value mean mathematically? | VERIFIED FROM V13 | `SP = CP + value`. |
| 6 | Is Value per unit, per row, per document, or something else? | VERIFIED FROM V13 | Value is per item unit. The candidate states that it is not a document total, not a distribution, and not a direct SP set. |
| 7 | How are Include and Exclude represented? | VERIFIED FROM V13 | Eligible item rows have include/exclude controls. Include All and Exclude All controls exist. |
| 8 | What is included by default? | VERIFIED FROM V13 | The contract header says item rows are included by default. The sample data initializes two manual rows as excluded. |
| 9 | Can participation be controlled per row? | VERIFIED FROM V13 | Yes. The row toggle changes participation per eligible item row. |
| 10 | Can participation be controlled per group? | VERIFIED FROM V13 | No group-level participation control is represented. Only item rows can participate. |
| 11 | Are group headers ever treated as priced rows? | VERIFIED FROM V13 | No. The candidate states that group headers never participate. |
| 12 | What happens to existing/manual SP values? | VERIFIED FROM V13 | Included row SP values are replaced on Apply. Excluded row SP values remain unchanged. |
| 13 | Does markup overwrite SP, increment existing SP, or derive from CP? | VERIFIED FROM V13 | It derives from CP and overwrites SP for included rows. It does not increment current SP. |
| 14 | Is there a preview before mutation? | VERIFIED FROM V13 | Yes. Preview runs before Apply. |
| 15 | What figures are shown in preview? | VERIFIED FROM V13 | Affected count, selling total before and after, gross profit before and after, aggregate change, and per-row CP, current SP, proposed SP, delta, profit, and margin. |
| 16 | Is Apply explicit? | VERIFIED FROM V13 | Yes. Apply is an explicit button. |
| 17 | Is Cancel explicit? | VERIFIED FROM V13 | Yes. Cancel or close leaves values unchanged. The preview also has a back path. |
| 18 | Is Undo represented? | VERIFIED FROM V13 | Yes. Immediate undo restores previous SP values. |
| 19 | What happens for CP = 0? | VERIFIED FROM V13 | The row is ineligible and is shown as excluded for no cost price. |
| 20 | What happens for missing CP? | VERIFIED FROM V13 | Missing CP is treated as no cost price and is ineligible. |
| 21 | What happens for quantity = 0? | IMPLIED BUT NOT ENFORCED | The markup computation can still derive SP when CP is eligible. Totals and margin guards prevent divide-by-zero output. The broader form validation blocks non-positive quantity before save. |
| 22 | Are negative markup inputs possible? | VERIFIED FROM V13 | No. Validation rejects negative inputs. |
| 23 | What rounding/display precision is used? | VERIFIED FROM V13 | The candidate states two-decimal prototype rounding for SP values. Margin preview uses display rounding. Production precision is not specified by V13. |
| 24 | Does markup touch CP? | VERIFIED FROM V13 | No. The apply message states that CP is untouched. The mutation changes SP only. |
| 25 | Does markup touch VAT, discount, WHT, install rate, extra charges, custom columns, or shared commercial input? | VERIFIED FROM V13 | No such mutation is represented. The prototype only changes SP for included rows. Production must enforce this boundary. |
| 26 | Does markup metadata appear intended for persistence, or are resulting SP values the durable output? | IMPLIED BUT NOT ENFORCED | The candidate materializes SP and keeps undo state only in memory. The header mentions audit intent, but it does not persist markup metadata. |
| 27 | Does the candidate recompute cost, selling, profit and margin after application? | VERIFIED FROM V13 | Yes. Apply renders the document again and the totals are recomputed from row values. |
| 28 | Are there desktop/mobile semantic differences? | VERIFIED FROM V13 | No semantic difference was found. Layout differs. |
| 29 | Are there accessibility or destructive-action concerns? | IMPLIED BUT NOT ENFORCED | Dialog labels and modal state exist. A full production focus trap, keyboard path, permission check, and audit-backed destructive-change record are not specified. Apply overwrites SP, though undo is represented. |
| 30 | Does the candidate behavior conflict with locked costing formulas or shared commercial calculation architecture? | VERIFIED FROM V13 | No direct conflict exists if production treats Instant Markup as SP derivation before the Cost & Pricing Sheet adapter recalculates totals. Prototype float math must not become authoritative. |

## 6. Candidate Behavior vs Recommended Production Contract

### Candidate Behavior

| Area | Candidate behavior |
|---|---|
| User action | User opens Instant Markup, selects a mode, enters a non-negative value, controls row participation, previews, and applies. |
| Math basis | CP is the only basis. |
| Percentage | Calculates proposed SP from CP and percentage. |
| Value | Adds a per-unit value to CP. |
| Existing SP | Included rows are replaced. Excluded rows remain unchanged. |
| Group rows | Group headers do not participate. |
| Persistence | Resulting SP values survive. Markup settings do not. |
| Undo | Immediate in-session undo only. |
| Audit | Intent only. No real audit persistence exists in the prototype. |
| Engine | Prototype JavaScript uses floating-point arithmetic. |

### Recommended Production Contract

| Area | Production requirement |
|---|---|
| Command | Implement Instant Markup as a Cost & Pricing Sheet command, not as shared commercial calculation logic. |
| Math | Use Decimal-backed arithmetic through the Cost & Pricing Sheet adapter and domain costing layer. |
| Durable output | Persist resulting SP values as row selling-rate inputs. |
| Metadata | Record an audit event with mode, input value, affected row ids, excluded row ids, before SP, after SP, and totals before and after. |
| CP boundary | Never mutate CP. |
| Commercial boundary | Never mutate VAT, discount, WHT, install rate, extra charges, or shared commercial inputs. |
| Conversion boundary | Never allow CP to enter Quotation or Invoice conversion output. |
| Validation | Block negative and non-finite inputs. Treat zero or missing CP as ineligible. Define the production rule for zero quantity. |
| Rounding | Use the established financial precision policy. Do not copy prototype floating-point arithmetic. |
| Accessibility | Add keyboard, focus, and announcement behavior for the dialog, preview, apply, cancel, and undo controls. |

## 7. Calculation Safety / Engine Mapping

The V13 Instant Markup behavior can coexist with the locked calculation architecture.

| Locked rule | Audit result |
|---|---|
| CP remains internal costing input. | Compatible. V13 reads CP but does not expose CP as a customer price. |
| SP remains customer-facing selling-rate source. | Compatible. V13 materializes SP values. |
| Locked costing formulas remain authoritative. | Compatible if production recalculates with the CPS adapter after SP changes. |
| `computeDocument()` must not become a second costing engine. | Compatible. V13 does not require `computeDocument()` for CP/SP costing. |
| CP must never leak into Quotation/Invoice conversion output. | Compatible by design, but current conversion code still needs enforcement. |
| Instant Markup must not redefine Total Cost, Total Selling Price, Gross Profit, or Margin. | Compatible. V13 derives SP and then recomputes from existing formulas. |
| Prototype floating-point arithmetic must not become authoritative production math. | Required. Production must use Decimal-backed domain logic. |
| Production recalculation must route through the CPS adapter and costing engine. | Required. V13 does not remove this requirement. |

Production evidence:

| File | Finding |
|---|---|
| `src/domain/boq/calculateBoqTotals.ts` | Current BOQ/CPS costing uses Decimal and item rows only. It calculates total cost, total selling price, gross profit, and profit percentage from CP, SP, and quantity. |
| `src/lib/Calculations.ts` | Shared commercial `computeDocument()` uses unit price and commercial document inputs. It is not a CP/SP costing engine. |
| `src/domain/invoice/calculations.ts` | Deprecated helpers still exist. New CPS work must not add callers to deprecated `calcTotals()` or `resolveRowVat()`. |
| `src/domain/boq/normalize.ts` | Current adapters still map CP and SP through legacy row cells. This is compatible with V13 but needs the planned stronger adapter. |

No candidate contradiction was found. The risk is implementation drift.

## 8. V4.1 View Readiness

The updated V4.1 View candidates remain suitable as the View design direction with adapters. They present a continuous Cost & Pricing Sheet view, with totals, row groups, row details, action surfaces, a black pipe export/download affordance, and the new PDF customization affordance.

V4.1 can serve as the View implementation contract for layout, responsive behavior, main actions, and presentation intent.

V4.1 still cannot close these areas:

| Area | Status |
|---|---|
| Audit Trail / Activity surface | Still missing from the latest candidates. |
| Lineage / related documents surface | Still missing from the latest candidates. |
| Real export/download/Forme integration | Implementation gap. |
| Real customization persistence and renderer mapping | Implementation gap and policy gap. |
| Conversion lineage correctness | Implementation gap. |

The earlier stale finding that V4.1 had no customization affordance is superseded.

## 9. 🎨 Customization Contract Audit

### Candidate Placement

| Question | Desktop | Mobile/fold |
|---|---|---|
| Exact placement | Top toolbar, directly after `Share` and before the theme and `More` controls. | Top app bar action row, directly beside `Share` and before `More`. |
| Direct or through More | Direct. | Direct. |
| What opens | A `Customize PDF` sheet/dialog. | A `Customize PDF` bottom sheet. |

### Options Exposed

| Option group | Values |
|---|---|
| Template | Classic Ledger, Modern Minimal, Bold Commercial, Compact Schedule |
| Font | System Sans, Georgia Serif, Mono, Humanist |
| Text colour | Ink, Navy, Slate, Forest, Maroon, and a custom color input |

### Interactivity and State

| Area | Finding |
|---|---|
| Interactive controls | Template buttons, font buttons, swatches, and custom color input are interactive. |
| Decorative controls | The miniature previews are visual previews. They are not real PDF output. |
| Visible effect | Changes affect the miniature preview state and selected controls. They do not alter the main document view. |
| PDF effect | The candidate text says choices apply to generated PDF only. The prototype does not generate a real PDF. |
| App chrome effect | The candidate states that app chrome never changes. |
| State scope | Ambiguous. Prototype state is in-memory only. It is not document-specific, global, or persisted in code. |
| Reset/default behavior | No reset control exists. Defaults are initial state only: Modern Minimal, System Sans, Ink. |
| Desktop/mobile parity | Equivalent capability exists on both. |

### Existing Policy Delta

Current BOQ/CPS customization policy permits document font only. It blocks accent color and handwriting color. It has no template selection field.

| Candidate intent | Current production support |
|---|---|
| PDF template selection | Not supported. |
| Document font selection | Partly supported. |
| Text colour selection | Not supported by BOQ/CPS policy. |
| Persistence | Not implemented for this candidate contract. |
| Forme/PDF renderer mapping | Not implemented for template and text colour. |

Required production changes:

| Area | Required change |
|---|---|
| Capability policy | Add allowed capabilities for PDF template and text colour if product accepts V4.1 intent. |
| Settings model | Extend `PdfCustomizationSettings` or add a CPS-specific extension for template id and document text colour. |
| Defaults | Define default template, font, and text colour. |
| Persistence | Decide whether customization is document-specific, account-wide, or temporary. Candidate evidence does not decide this. |
| Renderer | Map template, font, and text colour into the Forme/PDF renderer. |
| UI | Add reset/default behavior if required by product policy. |
| Audit | Decide whether customization changes need activity/audit records. |

The customization feature appears presentation-only. It must not alter totals, row values, CP, SP, profit, margin, or any financial semantics.

## 10. Audit Trail + Lineage Check

Audit Trail / Activity remains unresolved in the latest V4.1 candidates.

Static search and inspection found no View candidate surface for:

| Missing surface |
|---|
| Audit Trail |
| Activity |
| Change history |
| Related documents |
| Source document |
| Derived document lineage |

Production precedents exist for Invoice and Quotation activity cards and related documents. The current audit infrastructure does not yet include BOQ/CPS as an audit entity type. The active PRD says BOQ/CPS audit emitters and tracked fields are needed.

Current conversion code also needs work. It uses existing BOQ action paths, but the source trail and row mapping are not yet aligned with the PRD contract. The View candidate does not solve this because it does not expose lineage.

Conclusion: the previous Audit Trail gap remains open.

## 11. Form ↔ View Parity Matrix

| Concept | V13 Form | V4.1 View | Parity result |
|---|---|---|---|
| Document identity | Present as document context and save target. | Present in document header. | Compatible. |
| Title | Present. | Present. | Compatible. |
| Client / project / site | Present in form header. | Present in view header and metadata. | Compatible with adapter mapping. |
| Groups | Present. | Present. | Compatible. |
| Ungrouped rows | Present. | Present. | Compatible. |
| Row numbering | Present. | Present. | Compatible. |
| Description | Present. | Present. | Compatible. |
| Sub-description / specification / make | Form supports extra descriptive fields. | View displays specification and make-like detail. | Compatible, but field terminology needs one adapter contract. |
| Quantity / unit | Present. | Present. | Compatible. |
| CP | Present as internal costing input. | Visible in the CPS View candidate. | Compatible for internal business view. Must not leak to commercial conversions. |
| SP | Present and editable. | Present. | Compatible. |
| Cost | Calculated. | Displayed. | Compatible through CPS engine. |
| Selling | Calculated. | Displayed. | Compatible through CPS engine. |
| Profit | Calculated. | Displayed. | Compatible through CPS engine. |
| Margin | Calculated. | Displayed. | Compatible through CPS engine. |
| Notes | Not clearly authored in V13. | View includes notes-style close-out content. | Partial gap. Domain and PRD can support notes, but the Form candidate does not specify a clear notes authoring surface. |
| Photos | Present. | Present. | Compatible. |
| Commercial configuration | Not represented as VAT/discount/WHT/install controls. | Not represented as shared commercial controls. | Compatible with current CPS scope, but PRD must keep shared commercial config separate from CP/SP costing. |
| Customization | Column/workspace controls exist. PDF customization is not in the Form. | PDF customization exists. | Compatible if customization is View/PDF-only. |
| Status | Form has save/draft-style behavior. | View exposes status/action context. | Compatible with implementation work. |
| Audit/activity | Not represented as a user surface. | Not represented. | Gap remains. |
| Lineage/related documents | Not represented. | Not represented. | Gap remains. |
| Download/export | Not primary Form behavior. | Present. | View implementation required. |
| Conversion | Not primary Form behavior. | Present as action intent. | Implementation required. |
| Duplicate | Not primary Form behavior. | Present as action intent. | Implementation required. |
| Archive/delete | Not primary Form behavior. | Present as action intent. | Implementation required. |
| Responsive behavior | Mobile/fold and desktop candidates exist. | Mobile/fold and desktop candidates exist. | Compatible. |

No case was found where V13 creates financial data that V4.1 cannot display. The main parity gaps are notes authoring, activity/audit, and lineage.

## 12. Persistence / Schema Implications

No SQL changed in this task.

V13 and V4.1 imply these persistence checks for implementation:

| Area | Implication |
|---|---|
| Instant Markup | No new schema is required if only SP values persist. Audit metadata may need existing audit infrastructure support. |
| Undo | Candidate undo is session-only. Durable undo is not specified. |
| Row participation | Participation is command state, not persisted document state in the candidate. |
| Customization | Persistence is unresolved. If document-specific customization is required, schema or custom field storage must be defined. |
| Template id | Current PDF customization settings do not include a template id. |
| Text colour | Current BOQ policy blocks this option. |
| Audit | BOQ/CPS audit entity support is not complete in current code. |
| Lineage | Conversion lineage and related-document rendering require implementation. |
| Export | Current export fetchers still reference `boq_items` in places and need the planned adapter correction. |

## 13. PRD Delta Required

Do not edit the PRD in this task. The next PRD update should make these targeted amendments.

| PRD file | Section | Required amendment |
|---|---|---|
| `01-cost-pricing-sheet-product-domain-architecture.md` | CP/SP and calculation sections | Add the V13 Instant Markup command contract. State that it derives SP from CP, never from current SP, and never changes CP. |
| `01-cost-pricing-sheet-product-domain-architecture.md` | Audit section | Add an audit event requirement for Instant Markup application and undo if undo is persisted or logged. |
| `01-cost-pricing-sheet-product-domain-architecture.md` | Conversion sections | Re-state that Instant Markup output is SP only and CP must not enter Quotation or Invoice output. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` | Form candidate section | Update V12 references to V13 and record V13 as the closeable Form contract. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` | Instant Markup section | Add mode, basis, per-row participation, preview, apply, cancel, undo, zero/missing CP, negative input, and rounding requirements. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` | View candidate section | Update V4/V4.1 status to reflect the updated V4.1 candidate with direct customization affordance. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` | Customization section | Replace the font-only BOQ policy assumption if product accepts V4.1. Add template, font, and text colour as candidate intent. |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` | Activity and lineage section | Add a required View surface for Audit Trail / Activity and related documents, because V4.1 still omits it. |
| `03-cost-pricing-sheet-implementation-readiness-roadmap.md` | Gate table | Mark Form design, Instant Markup design, View design, and View customization as closeable. Keep audit/activity and lineage open. |
| `03-cost-pricing-sheet-implementation-readiness-roadmap.md` | Implementation phases | Add CPS customization capability and Forme renderer work before final PDF readiness. |
| `waterfall-roadmap.html` | Gate register | Mirror the updated gate state after the markdown PRD files are amended. |

## 14. Gate Closure Matrix

| Gate | Status | Evidence |
|---|---|---|
| 1. Form candidate/design gate | CLOSEABLE | V13 provides desktop and mobile/fold candidates with the prior Form direction plus Instant Markup. |
| 2. Instant Markup semantic gate | CLOSEABLE | V13 specifies modes, math, basis, row participation, preview, apply, cancel, undo, and ineligible CP behavior. |
| 3. View candidate-selection/design gate | CLOSEABLE | Updated V4.1 remains the View direction and now includes the new customization affordance. |
| 4. View customization gate | CLOSEABLE | V4.1 specifies template, font, and text colour controls. Implementation policy changes remain. |
| 5. Audit Trail/view activity gate | STILL OPEN | V4.1 still has no Audit Trail, Activity, or related-document surface. |
| 6. Calculation architecture gate | BLOCKED BY IMPLEMENTATION ONLY | No V13 conflict was found. Production must use the CPS adapter and Decimal-backed costing engine. |
| 7. Forme/PDF renderer gate | STILL OPEN | V4.1 shows PDF customization intent, but renderer, template, font, and text colour mapping are not implemented. |
| 8. Persistence/schema gate | BLOCKED BY IMPLEMENTATION ONLY | SP persistence fits current model. Customization persistence and audit support still need a chosen implementation path. |
| 9. Conversion/lineage gate | STILL OPEN | Conversion actions exist as intent, but lineage surfaces are absent and current production mapping still needs correction. |
| 10. Overall implementation-readiness gate | STILL OPEN | The main design contracts are closeable, but audit, lineage, PDF customization, persistence decisions, and implementation remain. |

## 15. Remaining Human Decisions

| Decision | Why it remains human-owned |
|---|---|
| Customization persistence scope | V4.1 does not decide whether PDF customization is document-specific, account-wide, or temporary. |
| PDF template taxonomy | V4.1 names four templates, but production must decide final ids and renderer templates. |
| Text colour policy | Current BOQ policy blocks colour. Product must accept or reject the new V4.1 intent. |
| Audit Trail placement | V4.1 still omits activity. Product must decide where the surface appears in the View. |
| Lineage placement | V4.1 still omits related documents. Product must decide placement and prominence. |
| Quantity zero rule for Instant Markup | The Form save path blocks non-positive quantity, but the Instant Markup command does not separately define this as a domain rule. |
| Durable undo | V13 represents immediate undo only. Product must decide whether undo is transient or audit-backed. |
| Notes authoring | V13 does not clearly show a notes authoring surface. Product must decide whether to add it or rely on existing domain fields elsewhere. |

## 16. Implementation Blockers

| Blocker | Type |
|---|---|
| Implement CPS adapter path for V13 row values and Decimal-backed recalculation. | Implementation |
| Implement Instant Markup command with audit logging and permission checks. | Implementation |
| Add or extend BOQ/CPS customization capabilities for template and text colour if accepted. | Policy and implementation |
| Map PDF template, font, and text colour to Forme/PDF rendering. | Implementation |
| Add BOQ/CPS audit entity support and view activity surface. | Implementation and design surface |
| Add lineage / related-document surface to the View. | Design surface and implementation |
| Correct conversion mapping so CP never leaks and lineage is preserved. | Implementation |
| Correct export/data fetch adapter paths that still refer to legacy or mismatched BOQ item sources. | Implementation |
| Decide customization persistence storage. | Product and implementation |

## 17. Final Readiness Verdict

V13 Form is design-ready as the Cost & Pricing Sheet Form implementation contract.

V13 Instant Markup is design-ready as a semantic contract. It is not an authoritative financial engine. Production must implement it as a CP-to-SP derivation command and recalculate through the Cost & Pricing Sheet calculation adapter.

Updated V4.1 View is design-ready with adapters. Its customization affordance is real product evidence. It requires policy, settings, persistence, and Forme/PDF renderer work.

The previous audit is superseded in two areas:

| Stale finding | Current finding |
|---|---|
| Form was not ready because Instant Markup was missing. | Superseded. V13 now specifies Instant Markup. |
| V4.1 had no customization affordance and font-only policy was enough. | Superseded. Updated V4.1 now specifies template, font, and text colour customization. |

The previous audit remains valid in one major area:

| Finding | Current status |
|---|---|
| Audit Trail / Activity and lineage were missing. | Still open. The latest V4.1 candidates still do not represent these surfaces. |

Verification:

| Check | Result |
|---|---|
| Pre-change `git status` | Captured before report creation. Repository already had many pre-existing modified, staged, deleted, and untracked files. |
| Static inspection only | Passed. No candidate JavaScript was executed. |
| `bun run audit:load` | Skipped by explicit task instruction. |
| `bun run typecheck` | Skipped by explicit task instruction. |
| `bun run lint` | Skipped by explicit task instruction. |
| `bun run test` | Skipped by explicit task instruction. |
| `bun run build` | Skipped by explicit hardware gate. |
| Supabase operations | Skipped by explicit task instruction. |
| Post-change `git status` | Captured after report creation. Only this task's new report was added by this task. All other listed changes were pre-existing. |
| `git diff --check` | Passed for whitespace on the new report. The final command used `git -c core.autocrlf=false diff --check --no-index -- NUL <report>` and returned no whitespace output. |

Risks or limitations:

| Risk | Limitation |
|---|---|
| Static-only audit | Candidate behavior was inspected from source. It was not validated in a browser. |
| Dirty worktree | Many pre-existing changes existed before this task. They were not modified or cleaned. |
| Prototype evidence | Prototype JavaScript is product evidence, not production architecture. |

Deferred work:

| Work |
|---|
| Update PRD files with the deltas listed in this report. |
| Implement V13 Form and V4.1 View against the adapter architecture. |
| Add Audit Trail / Activity and lineage surfaces. |
| Implement customization policy, persistence, and Forme/PDF renderer mapping. |
