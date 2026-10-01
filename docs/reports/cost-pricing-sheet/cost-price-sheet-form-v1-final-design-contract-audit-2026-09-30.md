# Cost & Pricing Sheet Form V1 Final Design Contract Audit

This report was written by Codex on 2026-09-30 via Codex Desktop.

## Objective

Audit the active Cost & Pricing Sheet Form V1 candidates.

The audit checks whether the candidates can become the visual and interaction contract for the next production transplant.

## Scope

This was a static design audit only.

No production code was changed.

No candidate HTML was changed.

## Files changed

- `docs/reports/cost-pricing-sheet/cost-price-sheet-form-v1-final-design-contract-audit-2026-09-30.md`

## Skills used

Skills used: html-prototype, frontend-design, mobile-app-ui-design, accessibility

Documentation standard: ASD-STE100 Simplified Technical English

## Files inspected

Active CPS candidates:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-desktop.html`
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`

Reference candidate:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v7.html`

Reference calculation files:

- `src/domain/boq/calculateBoqTotals.ts`
- `src/domain/boq/calculations.ts`

The older `form/boq/` Form candidates are superseded for this audit.

## Candidate inventory

| File | Role | Finding |
|---|---|---|
| `cost-price-sheet-form-candidate-v1-desktop.html` | Desktop Form candidate | Active desktop contract. |
| `cost-price-sheet-form-candidate-v1-mobile-fold.html` | Phone and fold Form candidate | Active phone and fold contract. |

No other active CPS Form candidate file was found in the active `form/cps/` directory.

## Matrix 1 - Desktop contract

| Candidate region | Intended purpose | Fields and actions | Structural composition | Calculation semantics | Status | Evidence |
|---|---|---|---|---|---|---|
| Shell and top bar | Desktop CPS workspace | Back, title, theme, Save CPS | Sticky top bar, `1360px` room, schedule column plus `350px` rail | None | PASS | Desktop comments lines 40-45. CSS lines 108-115. Save lines 407-409. |
| Document details | Document identity and client | Title, sheet number, issue date, client picker, site/project, notes | Four-column grid. Client picker spans full width. | None | PASS | Desktop lines 430-455. |
| Client Picker | Select bill-to client | Select, search, option list, clear, Add New Client affordance | Dashed trigger with selected face. Dialog with search and list. | Save requires client. | PARTIAL | Desktop lines 440-444 and 577-583. Add New only shows a live-app toast, unlike Invoice V7 full Add Client sheet. |
| Line-item toolbar | Schedule tools | Columns, Import, Markup, Clear all | Compact toolbar before rows | None | PASS | Desktop lines 470-478. |
| Ungrouped item rows | Price standalone items | Description, sub description, make, photo, qty, unit, CP, SP, TCP, TSP, Profit, margin | Two-column item row. Financial close-out trio below unit inputs. | TCP = CP x qty. TSP = SP x qty. Profit = TSP - TCP. Margin = Profit / TSP. | PASS | Desktop row summary lines 850-854. |
| Groups | Organize item rows | Group title, count, add item, remove group | Group header is structural. Items render in group body. | Group headers have no priced values. | PASS | Desktop comments lines 16-20 and Instant Markup group text lines 1109-1113. |
| Row controls | Edit row order and placement | Move up/down, delete, insert below, duplicate support in JS | Number rail and row-edge insert control | None | PASS | Desktop CSS/JS evidence lines 181-203 and row functions near 1260-1360. |
| Photos | Item photo affordance | Attach photo, remove photo | Compact camera control and thumbnail | No financial effect | PASS | Desktop lines 800-813. |
| Totals | Document close-out | Total cost, selling total, gross profit, margin | Commercial close-out panel plus sticky rail summary | Uses sum of row TCP/TSP and gross profit difference | PASS | Desktop lines 516-538 and totals JS lines 1002-1012. |
| Instant Markup | Derive SP from CP | Percentage, fixed value, Include all, Exclude all, preview, apply, cancel, undo | Right-dock dialog on desktop | SP derives from CP. CP and groups stay unchanged. | PASS | Desktop lines 589-621 and JS lines 1051-1177. |
| Import | JSON entry | Import JSON and replace rows | Dialog from toolbar | Import maps CP and SP fields | PASS | Desktop lines 563-572 and JS lines 1419-1474. |
| Columns | Visibility management | Columns dialog, reset defaults | Dialog with ordered column rows | Does not define costing formulas | PASS | Desktop lines 552-558 and JS lines 1195-1256. |
| Save | Persist document | Top-bar Save CPS, end-of-form Save CPS, rail Save CPS | Multiple save entry points, same save function | Validation checks number, client, desc, qty, SP | PASS | Desktop lines 407-409, 524-526, 546-547, 1478-1491. |

## Matrix 2 - Phone contract

| Region | Audit result | Status | Evidence |
|---|---|---|---|
| Header geometry | Compact sticky top bar with back, title, layout chip, and fold-only save button. | PASS | Mobile lines 448-453 and CSS lines 409-419. |
| Document identity | Title, sheet number, issue date, Client Picker, Site / Project, Notes. | PASS | Mobile lines 470-495. |
| Client Picker | Uses role-button trigger, placeholder, selected state, clear X, search dialog, Add New affordance. | PARTIAL | Mobile lines 481-485 and 606-613. Add New is a placeholder toast. |
| Metadata stacking | Phone uses two-column grid and full-width client/site/notes rows. | PASS | Mobile CSS lines 133-142 and markup lines 470-495. |
| Section headers | Numbered technical headers with rule and meta text. | PASS | Mobile CSS lines 123-128. |
| Action toolbar | Columns, Import, Markup, Clear all remain visible. | PASS | Mobile lines 511-519. |
| Groups | Edge-to-edge group treatment with header controls and item body. | PASS | Mobile CSS lines 245-259. |
| Item row geometry | Phone uses stacked row body, number rail, description, sub description, controls, and financial fields. | PASS | Mobile CSS lines 170-220. |
| Description | Main textarea with compact minimum height. | PASS | Mobile CSS lines 139 and 186. |
| Secondary description/specification | Toggleable subrow and subfield. | PASS | Mobile CSS lines 187-198 and JS lines 1290-1320. |
| Make/brand | Present in row model and optional field stack. | PASS | Mobile sample rows lines 751-755 and field render logic. |
| Photos | Compact photo attach and thumbnail. | PASS | Mobile lines 838-851. |
| Quantity/unit | Row fields remain part of visible field grid. | PASS | Mobile CSS lines 203-205 and row render logic. |
| CP/SP | Cost and selling fields are locked CPS commercial fields. | PASS | Mobile lines 730-736. |
| TCP/TSP/Profit | Financial trio is one close-out below row inputs. | PASS | Mobile lines 884-894. |
| Row controls | Move, remove, insert below, group add controls exist. | PASS | Mobile row functions and CSS lines 170-184. |
| Insert behavior | Insert below exists and scrolls to new row. | PASS | Mobile JS lines 1360-1370. |
| Instant Markup | Entry and sheet are present. | PASS | Mobile lines 517-526 and 619-656. |
| Import | Toolbar entry and dialog are present. | PASS | Mobile lines 515 and 591-601. |
| Columns | Toolbar entry and dialog are present. | PASS | Mobile lines 511 and 579-586. |
| Save FAB/footer | Phone FAB exists. End-of-form Save exists. Fold hides FAB. | PASS | Mobile lines 566-575 and CSS lines 300, 415-419. |
| Bottom-nav clearance | Candidate uses end padding with safe area and FAB clearance. | PASS | Mobile CSS line 110 and comments lines 57-58. |
| Keyboard-sensitive areas | Fixed FAB and bottom sheets need production-safe keyboard handling. | PARTIAL | Mobile CSS lines 300, 303, 371, 390. |

## Matrix 3 - Fold contract

| Fold requirement | Candidate behavior | Status | Evidence |
|---|---|---|---|
| Fold breakpoint | Fold begins at `min-width:600px`. Large phone begins at `430px`. | PASS | Mobile CSS lines 409-419 and JS line 769. |
| Fold width | Wrapper expands to `820px` with `24px` gutter. | PASS | Mobile CSS lines 415-417. |
| Metadata recomposition | Document grid changes from two columns to four columns. Wide fields can compress to one-column spans where intended. | PASS | Mobile CSS lines 419-421. |
| Toolbar recomposition | Toolbar remains compact and wraps without a desktop rail. | PASS | Mobile CSS lines 160-169. |
| Item-row recomposition | Fold changes item rows into two columns: identity column and data column. | PASS | Mobile CSS lines 421-424. |
| Financial fields | CP/SP remain in the data column with hints visible on fold. | PASS | Mobile CSS lines 425 and CP/SP field lines 730-736. |
| TCP/TSP/Profit summary | The financial trio remains below item inputs and keeps three columns. | PASS | Mobile CSS lines 221-237 and JS lines 884-894. |
| Group behavior | Group remains edge-to-edge with group body padding adjusted by gutter. | PASS | Mobile CSS lines 245-259. |
| Save behavior | Top-bar Save is shown and FAB hidden at fold width. | PASS | Mobile CSS lines 417-419. |
| Sheets/dialogs | Sheet max width increases to `560px`, with fold-friendly bottom sheet layout. | PASS | Mobile CSS lines 430-432. |
| Keyboard implications | Candidate still uses bottom sheets and fixed surfaces. Production must adapt for keyboard. | PARTIAL | Mobile CSS lines 300, 303, 390, 430-432. |

## Matrix 4 - Desktop to phone to fold semantic parity

| Product concept | Desktop | Phone | Fold | Parity |
|---|---|---|---|---|
| Client Picker | Full-width picker in document details. | Full-width picker in document details. | Same semantics in four-column fold grid. | PASS |
| Document title | Present. | Present. | Present. | PASS |
| Sheet number | Present and required. | Present and required. | Present and required. | PASS |
| Issue date | Present. | Present. | Present. | PASS |
| Site / Project | Present. | Present. | Present. | PASS |
| Groups | Structural headers. | Structural headers. | Structural headers. | PASS |
| Items | Priced rows. | Priced rows. | Priced rows. | PASS |
| Numbering | Continuous item numbering. | Continuous item numbering. | Continuous item numbering. | PASS |
| CP | Unit cost input. | Unit cost input. | Unit cost input. | PASS |
| SP | Unit selling input. | Unit selling input. | Unit selling input. | PASS |
| TCP | Shown as total cost per row. | Shown as total cost per row. | Shown as total cost per row. | PASS |
| TSP | Shown as total selling per row. | Shown as total selling per row. | Shown as total selling per row. | PASS |
| Profit | Shown as TSP minus TCP. | Shown as TSP minus TCP. | Shown as TSP minus TCP. | PASS |
| Margin | Secondary row and total metric, based on profit over TSP/selling total. | Same. | Same. | PASS |
| Photos | Attach/remove. | Attach/remove. | Attach/remove with fold thumbnail behavior. | PASS |
| Import | Toolbar and dialog. | Toolbar and dialog. | Toolbar and dialog. | PASS |
| Columns | Toolbar and dialog. | Toolbar and dialog. | Toolbar and dialog. | PASS |
| Instant Markup | Right dock. | Sheet. | Sheet. | PASS |
| Totals | Close-out block and rail. | Close-out block. | Close-out block. | PASS |
| Save | Top, rail, footer. | FAB and footer. | Top and footer, no FAB. | PASS |
| Add New Client | Placeholder affordance only. | Placeholder affordance only. | Placeholder affordance only. | PARTIAL |

## Client Picker audit

| Question | Answer | Status |
|---|---|---|
| Does CPS use real client selection instead of a plain text field? | Yes. It uses `.clientpick`, a searchable client dialog, `chooseClient()`, and `clearClient()`. | PASS |
| Does it follow the Invoice V7 pattern? | Mostly. It follows trigger, selected face, search, option rows, and clear/change semantics. It does not include Invoice V7's full Add Client sheet. | PARTIAL |
| What is shown when no client is selected? | `Select a client` and `Bill to · Client`. | PASS |
| What is shown when selected? | Client name and contact/address details. The clear X becomes visible. | PASS |
| Can the user change or clear the selected client? | Yes. The picker reopens for change, and `clearClient(event)` clears the selection. | PASS |
| Is selected identity visually distinct from free text? | Yes. It is a dashed/solid picker face, not an editable input. | PASS |
| Does phone remain compact? | Yes. It remains a full-width picker row inside the identity stack. | PASS |
| Does fold adapt intentionally? | Yes. It recomposes inside the wider four-column metadata grid. | PASS |
| Does desktop use equivalent semantics? | Yes. Desktop uses the same role-button picker and client dialog. | PASS |
| Are Vendor / Contractor and Reference / Contact gone? | Yes. No occurrence was found in active CPS files. | PASS |

Invoice reference:

- Invoice V7 uses a `.clientpick` trigger at lines 684-692.
- Invoice V7 opens a `Select client` sheet at lines 856-866.
- Invoice V7 includes an Add New Client sheet at lines 881-892.

CPS delta:

- CPS has an Add New Client affordance, but it only shows a live-app placeholder toast.
- If new-client creation must be part of the visual contract, correct this before production transplant.

## Financial row summary audit

Definitions verified:

- TCP = CP x quantity.
- TSP = SP x quantity.
- Profit = TSP - TCP.
- Margin = Profit / TSP where TSP is greater than zero.

Evidence:

- Candidate comments define row economics in desktop lines 18-21 and mobile lines 20-23.
- Row summary renders TCP, TSP, Profit, and Margin in desktop lines 850-854.
- Row summary renders the same in mobile lines 884-894.
- Production domain uses Decimal for total cost, selling price, gross profit, and margin in `computeBoqTotals()`.

Sample arithmetic:

| Row | Qty | CP | SP | TCP | TSP | Profit | Margin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Preliminaries | 1 | 150,000 | 185,000 | 150,000 | 185,000 | 35,000 | 18.9% |
| Portland cement | 400 | 5,200 | 6,100 | 2,080,000 | 2,440,000 | 360,000 | 14.8% |
| Reinforcement steel | 120 | 9,800.75 | 11,500 | 1,176,090 | 1,380,000 | 203,910 | 14.8% |
| Sharp sand | 30 | 28,000 | 0 | 840,000 | 0 | -840,000 | Not applicable |
| Emulsion paint | 18 | 41,000 | 48,500 | 738,000 | 873,000 | 135,000 | 15.5% |
| Provisional sum | 1 | 0 | 0 | 0 | 0 | 0 | Not applicable |

Document totals from sample:

- Total cost: 4,984,090.
- Total selling: 4,878,000.
- Gross profit: -106,090.
- Margin: -2.17%, shown as about -2%.

Finding:

- Arithmetic is internally correct.
- The row summary is coherent on desktop, phone, and fold.
- The `Sharp sand` row has SP = 0, which intentionally demonstrates an invalid save state and negative totals.

## Instant Markup audit

| Requirement | Candidate evidence | Status |
|---|---|---|
| Percentage mode | `mkModePct` and label `Markup percentage (%)`. | PASS |
| Value mode | `mkModeVal`, fixed value, and per-unit hint. | PASS |
| Derives from CP | `mkProposed()` uses CP. Percentage is `CP x (1 + value / 100)`. Value is `CP + value`. | PASS |
| Writes SP only | `mkApply()` snapshots SP and writes `a.r.sp = a.prop`. | PASS |
| Per-row Include/Exclude | `mkToggle()` and row buttons. | PASS |
| Include All / Exclude All | `mkAll(true)` and `mkAll(false)`. | PASS |
| Preview | `mkPreview()` shows affected items, selling total, gross profit, aggregate change, row SP, TSP, profit, margin. | PASS |
| Apply | `mkApply()` is explicit. | PASS |
| Cancel | `closeMarkup()` button exists. | PASS |
| Undo | `mkUndoSnap` and `undoMarkup()`. | PASS |
| Zero/missing CP exclusion | `mkEligible()` requires finite CP greater than zero. | PASS |
| No negative markup | `mkReadVal()` rejects values below zero. | PASS |

Verdict: Instant Markup survived the redesign intact.

## JSON Import audit

Desktop:

- Toolbar has Import.
- Dialog has `Import JSON`.
- `doImport()` validates `items` and `groups`.

Phone and fold:

- Toolbar has Import.
- Dialog has `Import JSON`.
- Same mapping appears in mobile/fold candidate.

Verdict: JSON Import entry contract is ready.

## Photo presentation audit

Desktop:

- `addPhoto()`, `removePhoto()`, camera button, and thumbnail are present.

Phone:

- Camera action is compact.
- Thumbnail appears in phone row close-out.

Fold:

- Fold thumbnail is explicitly separate from phone thumbnail through `.foldthumb`.

Verdict: Photo presentation contract is ready.

## Terminology audit

Search terms:

- `BOQ`
- `Bill of Quantities`
- `Vendor`
- `Vendor / Contractor`
- `Reference / Contact`

Result:

- No occurrence was found in the active CPS candidate directory.

Related note:

- Comments use phrases such as "old supplier field". This is explanatory history, not visible UI text.
- Visible UI uses `Cost & Pricing Sheet`, `Sheet Number`, `Client`, `Site / Project`, and `Notes`.

Verdict: Terminology migration is clean.

## Static keyboard-risk audit

Visual behavior to reproduce:

- Sticky top bar.
- Phone Save FAB when keyboard is closed.
- Fold top-bar Save.
- Bottom sheets for Client, Import, Columns, and Instant Markup.
- Safe-area padding at the bottom of the form.
- Compact row editing.

Prototype mechanics not to copy literally:

- `.fab` is fixed at the bottom. It can overlap the software keyboard if production does not hide or offset it.
- `.ov` is `position: fixed; inset: 0`.
- Sheets use viewport-height constraints such as `max-height: 30vh`, `32vh`, `34vh`, and `36vh`.
- Client, Import, and Markup sheets contain focused inputs near the top but scrollable content below.
- The prototype listens to `window.resize` and rerenders items when `bp()` changes. It uses width, not height, but production must not let visual viewport changes from the keyboard change presentation mode.

Assessment:

- The visual design is safe to transplant.
- Production must adapt sheet sizing, focus handling, and FAB visibility for mobile keyboard safety.

## Explicit required answers

| Question | Answer |
|---|---|
| Exact active CPS filenames discovered | `cost-price-sheet-form-candidate-v1-desktop.html`; `cost-price-sheet-form-candidate-v1-mobile-fold.html`. |
| Are old `form/boq` candidates superseded? | Yes, for this Form audit and next transplant contract. |
| Is Vendor / Contractor gone? | Yes. |
| Is Reference / Contact gone? | Yes. |
| Does Client Picker follow Invoice precedent? | Mostly. Selection, search, selected face, and clear match. Add New Client is only an affordance placeholder. |
| Does desktop have equivalent client semantics? | Yes. |
| Is TCP present and correctly defined? | Yes. TCP = CP x quantity. |
| Is TSP present and correctly defined? | Yes. TSP = SP x quantity. |
| Is Profit present and correctly defined? | Yes. Profit = TSP - TCP. |
| Is sample TCP/TSP/Profit arithmetic correct? | Yes. |
| Does row-summary composition work on desktop? | Yes. |
| Does row-summary composition work on phone? | Yes. |
| Does row-summary composition work on fold? | Yes. |
| Did Instant Markup survive intact? | Yes. |
| Is Import clearly accessible? | Yes. |
| Are Photos represented? | Yes. |
| Remaining visible legacy BOQ/Vendor/Reference terms | None found. |
| Material desktop/phone/fold semantic mismatch | Add New Client remains placeholder in both candidates. Otherwise no material mismatch found. |
| Static keyboard-risk issues | Fixed FAB, fixed overlays, viewport-height sheet limits, and resize-driven rerender need production-safe adaptation. |
| Safe to freeze as authoritative source? | Yes for visual and core interaction semantics, with one correction decision: replace or explicitly accept the Add New Client placeholder. |

## Readiness verdict

| Contract area | Verdict | Reason |
|---|---|---|
| Desktop design contract | READY | Desktop has coherent CPS identity, client selection, groups, rows, row economics, totals, Import, Columns, Markup, and Save. |
| Phone design contract | READY | Phone is intentional and not a desktop collapse. |
| Fold design contract | READY | Fold has explicit breakpoints and row recomposition. |
| Client Picker contract | NEEDS CORRECTION | The Add New Client path is only a placeholder. Selection/change/clear are ready. |
| TCP/TSP/Profit row-summary contract | READY | Row summary is complete and arithmetic is correct. |
| Instant Markup contract | READY | Accepted semantics remain represented. |
| JSON Import entry contract | READY | Entry and dialog remain present. |
| Photo presentation contract | READY | Photo attach, thumbnail, and removal remain represented. |
| Terminology migration | CLEAN | No active visible legacy terms were found. |
| Keyboard-safe transplantability | SAFE WITH PRODUCTION ADAPTATION | Visual design can be transplanted, but fixed FAB/sheet mechanics must be implemented with keyboard-safe production behavior. |

## Final candidate-readiness verdict

The CPS V1 candidates are ready to serve as the authoritative visual and interaction contract after one product/design decision:

- Either add the full Add New Client sheet semantics from Invoice V7 to CPS, or explicitly mark the CPS Add New Client control as a navigation boundary owned by the live app.

Do not start production transplant until that Client Picker decision is recorded.

## Verification result

Verification:

- `git status --short`: captured before report creation.
- Static inspection: completed.
- `git status --short`: captured after report creation. Pre-existing changes remain. This task added only this report.
- `git diff --check -- docs/reports/cost-pricing-sheet/cost-price-sheet-form-v1-final-design-contract-audit-2026-09-30.md`: passed.
- `bun run build`: skipped due to hardware policy.
- `bun run typecheck`: skipped because this is a zero-code audit.
- `bun run lint`: skipped because this is a zero-code audit.
- `bun run audit:load`: skipped because no query, schema, or data-layer logic changed.
- Tests: skipped because this is a zero-code audit.
- Supabase operations: not applicable.

## Supabase push status

Not applicable. No SQL or database change was made.

## Risks or limitations

- No browser interaction was executed.
- No screenshot comparison was performed.
- Candidate JavaScript was not executed as runtime validation.
- The active CPS candidate directory is currently untracked in Git status. This report treats it as the active source because the user identified it as active.

## Deferred work

- Correct or approve the CPS Add New Client placeholder.
- During production transplant, implement keyboard-safe sheet and FAB behavior.
- Do not copy prototype floating-point math into production.
