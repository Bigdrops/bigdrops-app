# Cost & Pricing Sheet View Readiness and Instant Markup Audit

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## 1. Executive Summary

The accepted V4.1 mobile/fold and desktop candidates can be implemented
faithfully against the real BIGDROPS architecture, but only through the
adapters, migrations, and rewrites the Cost & Pricing Sheet PRD already
plans. No candidate feature contradicts the architecture. Several promised
actions have no live production backing yet.

A second finding matters more than any single matrix row. The V4.1 reports
describe a 5-item, 2-group sample (cost ₦6,158,090, selling ₦7,237,000,
profit ₦1,078,910, Group A ₦4,382,000, Group B ₦1,860,000). Both V4.1 files
contain an 8-item, 1-group sample that computes to cost ₦7,316,090, selling
₦8,597,500, profit ₦1,281,410, Group A ₦5,742,500. The reports do not describe
the files. The files are internally consistent. Audit the files, not the
reports.

A third finding concerns calculation scope. Every V4.1 figure uses the locked
costing formulas and matches them. The candidate shows no shared-engine
commercial figure (VAT, discount, install, extra charges, grand total,
payable). Once the PRD's commercial behavior ships, SUM(SP×qty) is only one
of two selling concepts. The view's "Selling Total" needs a disambiguated
definition, and group subtotals need their install and costing legs.

Instant Markup has no repository evidence. No code, commit, report,
prototype, standard, or migration implements or specifies it. All semantic
questions stay UNRESOLVED — HUMAN DECISION REQUIRED. The Form stays gated.

Verdict. Overall: NOT READY (PRD gates remain open). View: READY WITH
ADAPTERS. Form: NOT READY.

## 2. Evidence / Sources Inspected

Candidates: `.../Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.1.html`
(644 lines, 8 sample items), `.../Design-direction/view/boq/boq-view-candidate-desktop-v4.1.html`
(8 sample items). Reports: `boq-view-candidate-v4.1-2026-09-29.md`,
`boq-view-v4.1-refinement-2026-09-29.md`, `boq-view-candidate-v4-2026-09-29.md`.

PRD: `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`,
`02-cost-pricing-sheet-presentation-pdf-view-contract.md`,
`03-cost-pricing-sheet-implementation-readiness-roadmap.md`.

Production: `src/pages/view-boq-actions.ts` (127 lines, read in full);
`src/domain/boq/types.ts`; `src/domain/boq/normalize.ts`;
`src/domain/boq/calculateBoqTotals.ts`; `src/lib/audit.ts` (boq search);
`src/domain/pdf/customization/boq.ts`; `src/services/exportFetchers.ts:29,42,51`;
`src/pages/ViewQuotation.tsx` (BOQ-source handling, related docs, activity card);
shared view shell (`FloatingDownloadButton.tsx`, `MobileBottomNav.tsx`,
`shareDocument.ts`, `downloadPdf.tsx`, `DocumentRelatedDocsSection.tsx` —
existence verified).

Schema: `supabase/migrations/20260520090002_quotations.sql` (base `boqs` /
`boq_rows` definitions); `20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql`
(ADD COLUMN list); `20260707000000_receipt_snapshot_and_idempotency.sql`
(audit entity gqlready includes `'boq'`, per PRD).

History: `git log --all` for `src/components/boq/BoqForm.tsx`
(`767bb223` creation, `f20b3c4f` refactor, `fe961403` totals rewrite);
`git log -S` for markup, margin_pct, applyMarkup, markupPercent (no hits);
`docs/reports/boq-rfq/BOQ-TOTALS-REWRITE-REPORT.md`;
V12 form candidate (pricing-feature search, no hits);
all form prototypes (bulk-pricing search, no hits).

Skills used: gitnexus-exploring, writing-clearly-and-concisely.
GitNexus MCP resources are not exposed in this harness; investigation used
direct static inspection instead. No runtime command was executed.

## 3. V4.1 Mobile/Fold Readiness Matrix

Sample basis: 8 items, 1 group ("A — Civil Works", 5 members), 3 ungrouped.
All figures below recomputed from file content unless noted.

| Feature | Classification | Production source / note |
| :--- | :--- | :--- |
| Document identity (number, status pill, title) | READY | `boqs.boq_number`, `status`, `title` exist |
| Reference = number | READY | Same column |
| Status toggle Open/Approved | READY | `updateBOQStatus` accepts any string; no CHECK. Approved-locking stays a product rule (unresolved) |
| Date "12 Jun 2026" | READY | `boqs.issue_date` exists |
| "Valid 30 days" / Validity | PROTOTYPE-ONLY | No validity column exists |
| Currency "NGN (?)" | PROTOTYPE-ONLY | No currency column exists; "(?)" marks author uncertainty |
| Prepared by "A. Kontracts (QS)" | PROTOTYPE-ONLY | No attribution column exists |
| Client line (client + vendor merged) | ADAPTER REQUIRED | `client_name` (base) and `vendor_name` exist; merged display needs the Q3 mapping decision |
| Site (project name) | ADAPTER REQUIRED | `project_name` text and `project_id` uuid exist; resolve name at view-data build |
| Description, spec, make, qty, unit | ADAPTER REQUIRED | `description`, `cells.specification`, `cells.make_brand`, `quantity`, `unit` exist; M2 renames planned |
| CP / SP display | ADAPTER REQUIRED | `cells.cp`, `cells.sp` exist; parity columns planned |
| Line cost / sell / profit | ADAPTER REQUIRED | Locked formulas verified; Decimal computation via future `prepareBoqViewData`, not float |
| Per-item margin % | ADAPTER REQUIRED | Derived presentation value; 1-decimal precision unresolved; guard divide-by-zero (production headers carry sp=0) |
| Total Cost / Selling Total / Gross Profit | ADAPTER REQUIRED | `computeBoqTotals` verified Decimal; selling-total definition needs disambiguation (§6) |
| Margin overall | ADAPTER REQUIRED | Same guards and precision question |
| Amount in words | PROTOTYPE-ONLY | Hardcoded text matches the 8-item selling figure but is static; stage-1 scope excludes it |
| Notes | READY | `boqs.notes` added by migration `20260826000000` |
| Row notes | READY | `boq_rows.notes` exists |
| Group container + header + count | ADAPTER REQUIRED | Needs planned `group_header` vocabulary + `groupMeta`; count derivable |
| Group total (selling-only) | ADAPTER REQUIRED | `groupSell` matches costing semantics; install + cost/profit legs missing per PRD File 01 §9 |
| Ungrouped items + continuous 01–08 numbering | READY | Render-index numbering maps to `sort_order`; ungrouped shape is legal in the planned model (group_id nullable) |
| Photo thumbnail + lightbox | PRODUCTION GAP | SVG placeholder only; no `image_url` column, no upload path (M2 + shared uploader planned) |
| Zero-footprint no-photo items | READY | Conditional render; trivially preserved |
| Back | READY | Router navigation |
| Share | READY | Shared Web Share + clipboard precedent |
| Copy number | READY | Clipboard only; no production dependency |
| Edit | BLOCKED | No production form exists (placeholder routes); gated on V12 transplant |
| Download (FAB + close-out + menu) | PRODUCTION GAP | Toasts only; BOQ PDF renderer demolished, Forme template unbuilt |
| Convert to Quotation | ADAPTER REQUIRED | `convertBOQToQuotation` exists but lossy (no notes/groups/config, vendor preference, mislabeled trail); rewrite planned |
| Export CSV | PRODUCTION GAP | `exportFetchers.ts:51` still maps `BOQS → 'boq_items'` (nonexistent); fix planned |
| Duplicate | PRODUCTION GAP | `duplicateBOQRecord` copies parent only; rewrite planned |
| Archive | READY | `archiveBOQRecord` exists |
| Delete (two-tap confirm) | READY | `deleteBOQRecord` deletes rows + parent; no audit emitted (gap §10) |
| Status row in More sheet | READY | Same as status toggle |
| More sheet + danger zone | READY | Shared sheet pattern exists |
| FAB (container, icon, placement, float) | READY | `FloatingDownloadButton` exists; geometry matches fab-standard v1.1 |
| Bottom nav simulation + clearance | READY | `MobileBottomNav` geometry exists |
| Dark mode (CSS vars, no toggle on mobile) | ADAPTER REQUIRED | App theme infra exists; wire toggle state to production theme |
| Fold recomposition | READY | Pure presentation over the same prepared model |
| Lightbox accessibility (label, caption, focus) | ADAPTER REQUIRED | Pattern must follow the shared sheet/dialog focus conventions |

## 4. V4.1 Desktop Readiness Matrix

Desktop shares the mobile sample, math, and actions. Differences only:

| Feature | Classification | Note |
| :--- | :--- | :--- |
| Top bar (back, Edit, Download, Share, theme, More) | Same as mobile | Edit BLOCKED, Download PRODUCTION GAP, rest READY/ADAPTER |
| No FAB, no bottom nav | READY | Correct per standard (desktop has no FAB/nav) |
| Theme toggle | ADAPTER REQUIRED | Present on desktop, absent on mobile; wire both to one production theme source |
| Jump chips (#grp-A + selling subtotal) | READY | Anchor navigation over prepared groups; presentation only |
| Sticky context rail + commercial position card | READY | Repeats prepared summary; presentation only (human already asked to confirm non-clutter) |
| Dense purpose-built columns | READY | Presentation over prepared rows |
| Context dl (Currency, Prepared by, Reference, Site, Validity) | Mixed | Reference READY; Site ADAPTER; Currency/Prepared/Validity PROTOTYPE-ONLY |
| Close-out totals + words + endrule | Same as mobile | Words PROTOTYPE-ONLY; endrule presentation READY |
| More menu row set | Same as mobile | Same classifications |

## 5. Shared Candidate Findings

1. Report↔artifact drift. The V4.1 reports verify a 5-item sample that is not
   in the files. Trust the files. Future verification must recompute from file
   content, not from report prose.
2. Hardcoded "5 items" label is overwritten by JS to the true count. Cosmetic
   in the prototype; production must render the count from data.
3. Hardcoded words text matches the current sample by accident of authorship.
   Any sample change silently breaks it. Production must compute words from the
   authoritative figure or omit the block until scoped.
4. Float math (`toFixed`, `toLocaleString`) is safe at these magnitudes but is
   not the production path. Production uses Decimal through the adapter.
5. No Audit Trail surface and no lineage surface exist in either candidate,
   although precedents (`QuotationActivityCard`, `DocumentRelatedDocsSection`,
   BOQ-source handling in `ViewQuotation.tsx`) exist for both.
6. No customization palette exists in either candidate. This is correct: BOQ
   policy is document-font-only (`BOQ_CAPABILITIES`, `BOQ_POLICY` verified).
7. The merged client line hides the unresolved Q3 client-mapping decision.
8. Desktop-only theme toggle is an inconsistency, not a blocker.

## 6. Calculation Contract Audit

Authoritative stack (all verified in repository):

- Shared commercial engine: `computeDocument()` in `src/lib/Calculations.ts`
  (Decimal, precision 20, HALF_UP). Serves Invoice/Quotation forms, both
  Invoice/Quotation view-data loaders, invoice PDF download, CSV summary.
- Costing engine: `computeBoqTotals()` / `computeRowProfit()` in
  `src/domain/boq/calculateBoqTotals.ts` (Decimal; only `row_type === 'item'`
  rows; docstring states no VAT, discount, or WHT).
- Dead code: `calcTotals()` / `resolveRowVat()` have zero invocations.
- Future adapter: `src/domain/boq/calculations.ts` maps SP→`unit_price`,
  delegates costing to the locked helpers, duplicates no formula.

Figure mapping for the view:

1. Directly from the costing engine: Total Cost, Total Selling Price (schedule
   concept), Gross Profit, per-row line cost/sell/profit, group cost/selling/
   profit subtotals.
2. From `computeDocument()`: nothing the candidate currently displays. The
   candidate has no commercial-total block.
3. Derived presentation values: margin %, continuous numbering, group counts,
   words text (when scoped).
4. Formula consistency: lineCost = CP×qty, lineSell = SP×qty,
   lineProfit = (SP−CP)×qty all match the locked formulas. Totals match
   aggregation semantics (profit from aggregate difference, per the rewrite
   report). No displayed figure contradicts production.
5. Group totals need three concepts, not one: install subtotal (shared
   engine), cost/selling/profit subtotal (costing engine). The candidate shows
   selling only.
6. Shared features (VAT, discount, install, extra charges, WHT, custom
   columns, hide_display/hide_full) affect `DocumentResult` (grand total,
   payable, visible line values) but must never redefine the locked costing
   totals. The candidate's prototype total equals the schedule concept only.
7. Gross Profit stays `total_selling_price − total_cost`. Commercial
   adjustments may produce a separate commercial margin figure later; that is
   a new metric, not a redefinition.
8. Authoritative definitions:
   - Total Cost = Σ(CP × quantity) over standard rows, Decimal.
   - Selling Total (schedule) = Σ(SP × quantity) over standard rows, Decimal
     (= `total_selling_price`). The view must label this distinctly from any
     future commercial grand total.
   - Gross Profit = Total Selling − Total Cost, Decimal, from aggregates.
   - Margin = Gross Profit / Selling Total × 100 for display; decimal
     precision unresolved (candidate shows 1dp).

## 7. Candidate-vs-Production Calculation Drift

- Safe: all six displayed formula shapes; aggregation order; header rows carry
  no commercial values (matches `computeRowProfit` returning 0 for sections).
- Incomplete: no commercial-total block; group subtotals lack install and
  costing legs; words not computed.
- Stale: V4.1 report figures describe a sample that is not in the files.
- Misleading if read as spec: float `toFixed` math; static words text;
  "5 items" label; single selling concept presented as the only selling truth.

## 8. Action / Capability Mapping

Promised by the candidate with no live backing: Edit (no form), Download PDF
(no renderer), item photos (no storage/upload), Export CSV (broken table map),
Duplicate with items (parent-only), Convert with fidelity (lossy path).
Backed today: back, share, copy number, archive, delete, status write,
FAB/nav/sheet chrome, notes read, identity fields. Backed after planned work:
convert, duplicate, CSV, photos, words, grouped schedule, prepared commercial
display. Toast handlers prove nothing; all classifications above rest on the
existence or absence of the underlying function, not the toast.

## 9. Data / Persistence Mapping

| Candidate field | Production column | Status |
| :--- | :--- | :--- |
| Number, title, status, issue_date | `boqs.boq_number`, `title`, `status`, `issue_date` | READY |
| client_name, vendor_name | `boqs.client_name` (base), `vendor_name` (later) | READY, display mapping unresolved (Q3) |
| Site | `project_name` / `project_id` | ADAPTER REQUIRED |
| Notes, row notes | `boqs.notes` (later migration), `boq_rows.notes` | READY |
| description, quantity, unit | `boq_rows` columns | READY |
| spec, make, cp, sp | `cells.specification`, `cells.make_brand`, `cells.cp`, `cells.sp` | ADAPTER REQUIRED (M2 renames) |
| Groups | `row_type 'section'` + `section_title` | ADAPTER REQUIRED (vocabulary migration M3) |
| Photos | none | PRODUCTION GAP (M2) |
| VAT/discount/install columns | none | PRODUCTION GAP (M2) |
| Validity, currency, prepared-by | none | No planned column; PROTOTYPE-ONLY unless product scopes them |
| Lineage content | `source_boq_id` on quotations; `conversionTrail` planned | ADAPTER REQUIRED (no BOQ-side trail content yet) |
| Audit content | none for BOQ | PRODUCTION GAP (emitters planned, no migration needed) |

## 10. Audit Trail + Customization Capability Check

Audit: `src/lib/audit.ts` contains zero BOQ references (verified by search).
No `recordBoq*` emitter exists. Schema needs no change (`'boq'` already
permitted; generic RPCs accept it). The candidate shows no activity surface,
so it promises nothing it lacks — but a production view needs one
(precedent: `QuotationActivityCard`), and the PRD does not yet specify the
BOQ view's audit display. PRODUCTION GAP for content, PRD GAP for display.

Customization: `BOQ_CAPABILITIES` / `BOQ_POLICY` declare document-font-only;
`BOQ_TEMPLATE_DEFAULTS` pins Inter on `#0f172a`. The candidate's lack of a
palette action is correct and READY. Any future paint-icon affordance on a
Cost & Pricing Sheet surface must expose font choice only.

## 11. Instant Markup Historical Recovery

Method: full-text search of `src/` and `docs/` for markup, mark-up, bulk
pricing, blanket pricing, instant pricing, apply-percentage, and margin/percent
pricing semantics; `git log --all` over BOQ form history (`767bb223`
creation, `f20b3c4f` refactor, `fe961403` totals rewrite); `-S` pickaxe
searches for markup, margin_pct, applyMarkup, markupPercent; V12 and all form
prototypes searched for bulk/blanket/apply-all pricing controls; the
BOQ-TOTALS-REWRITE report read in full.

Result: no evidence exists. Every "markup" hit in the repository means HTML
markup. No commit, function, report, prototype, standard, or migration
implements, specifies, or discusses a cost-to-price derivation feature under
any name. V12 has no such control. No historical form version has one.

## 12. Verified Instant Markup Contract

Verified facts (closed questions):

- Q18: the feature was never production code. Verified absent from all
  searched surfaces.
- Q17: no interaction with VAT, discount, extra charges, custom columns, or
  install rate exists, because the feature does not exist.
- Q19: no historical behavior conflicts with current architecture, because no
  historical behavior exists. Constraints that any future design must respect:
  locked costing formulas stay unchanged; the shared engine takes no `cp`
  input; SP materialization must pass through the adapter and recompute;
  `hide_full` deny list (`quantity`, `cp`, `sp`) stays enforced; conversion
  must still strip CP; every application emits an audit UPDATE event.

## 13. Unresolved Instant Markup Questions

Q1–Q16 except Q17–Q19: UNRESOLVED — HUMAN DECISION REQUIRED. Percentage could
mean cost-plus (SP = CP × (1 + p/100)) or margin-on-sell (SP = CP / (1 − m));
both are live options, neither evidenced. Value could mean fixed per-item
addition, total distribution, or direct SP set; unevidenced. Include/Exclude
scope (item, group, document), defaults, overwrite policy, CP sourcing,
preview, undo, persistence shape, group handling, zero-CP handling,
manual-SP handling, and rounding are all unevidenced. The task's three intent
statements (derive SP from CP; percentage OR value; Include/Exclude
participation) are the entire verified requirement.

## 14. Proposed PRD Delta

HISTORICALLY VERIFIED BEHAVIOR: none. The feature is new. Only the three
intent statements above carry human authority, plus the §12 constraints.

RECOMMENDED NEW BEHAVIOR (all marked, none factual):

- Purpose: bulk-derive SP from CP without hand-editing every row.
- Terminology: Instant Markup; percentage mode; value mode; Included /
  Excluded scope.
- Trigger: form-level command surface (exact placement decided with the V12
  transplant; view has no markup action).
- Percentage mode: UNRESOLVED option A (cost-plus) or B (margin-on-sell).
- Value mode: UNRESOLVED fixed-addition, distribution, or direct-set.
- Include/Exclude: UNRESOLVED scope level and default selection.
- Preview: recommended — show resulting SP/profit/margin deltas before apply.
- Application: recommended — overwrite SP on included rows only; manual SP on
  excluded rows untouched.
- Persistence: recommended — materialize into SP values only; persist no
  markup metadata (keeps lineage, conversion, and audit simple).
- CP/SP: operates from CP, writes SP, never stores a derived CP.
- Groups: recommended — group headers carry no values; membership follows rows.
- Shared calculations: recommended — recompute through the adapter after
  apply; commercial configuration untouched.
- Edge cases: zero/missing CP, zero quantity, negative inputs, divide-by-zero
  margin — all UNRESOLVED handling.
- Safety: locked formulas unchanged; deny list enforced; audit UPDATE with
  before/after SP sets; no CP leakage into Quotation paths.
- Acceptance: recommended — preview matches applied values exactly; excluded
  rows byte-identical; audit explains the change; conversion after markup
  still strips CP.

## 15. Implementation Blockers

View display: M2/M3 (parity columns, vocabulary), adapter + `prepareBoqViewData`,
conversion/duplicate rewrites, export fix, photo pipeline, audit emitters,
words scoping, commercial-layer view spec, margin precision, Q3 mapping.
View actions: form target (edit), renderer (download), photo backend.
Form: all of the above plus the entire Instant Markup contract (Q1–Q16) and
the V12 readiness gate.

## 16. Implementation Risks

Report↔artifact drift shows verification must recompute from files. The single
selling concept in the candidate will mislead once commercial totals ship
unless the label split lands first. Float prototype math must not be ported.
The merged client line bakes in an undecided mapping. Photo and words blocks
are the most likely schedule slips (new storage, new scoping). Instant Markup
designed without the §12 constraints would breach locked math or leak CP.

## 17. Final Readiness Gate

Overall: NOT READY. The PRD's own gates (V12 transplant, view decision
recording, Forme readiness) remain open, and §15 blockers stand.

View: READY WITH ADAPTERS. Shell, identity, schedule, groups, costing
display, FAB, nav, sheets, dark mode, and responsive behavior map to real
shared infrastructure or planned adapters. No design element requires
inventing unsupported behavior. Download, edit, photos, CSV fidelity,
conversion fidelity, duplicate fidelity, audit content, and lineage content
arrive with their backing work, not before.

Form: NOT READY. The V12 gate is unmet and Instant Markup semantics are
materially unresolved (Q1–Q16). The form must remain gated even though the
view design is sound.
