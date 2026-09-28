# Invoice Form Candidate Design — Mobile/Fold + Desktop V1

> **Status**: Complete
> **Date**: 2026-09-27
> **Scope**: Design-direction HTML prototypes + audit of live Invoice form
> **Constraint**: No production code, SQL, Supabase, or dependency changes. Structural design language from accepted final BOQ V11. Field inventory from `invoice-form-inline.html`. Behavioral semantics from live Invoice React implementation (MobileItemCard, FormLineItems, useItemSuggestionEngine, useInvoiceColumns, domain/invoice).

---

## 1. Objective

Create two new Invoice form design-direction prototype files under `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/`:

1. `invoice-form-candidate-mobile-fold-v1.html` — phone/mobile (320/390/430px) + fold (600/800px) responsive prototype.
2. `invoice-form-candidate-desktop-v1.html` — independently composed wide-screen desktop prototype.

Both represent the same Invoice capabilities and semantics. Desktop is deliberately recomposed for wide-screen productivity, not the mobile candidate widened to a larger viewport.

---

## 2. Scope

- Create two new standalone HTML prototype files.
- Audit the live Invoice form implementation to understand Item Library integration, column configuration, calculations, validation, and save behavior.
- Reconcile the old `invoice-form-inline.html` field inventory against live behavior; document discrepancies.
- Report design decisions, preserved functionality, and deferred work for human visual review.

---

## 3. Files Audited (production Invoice)

| File | Role |
|---|---|
| `src/components/invoice/MobileItemCard.tsx` | Single line item card; suggestion engine, sub-description, image, row actions, custom columns |
| `src/modules/item-library/hooks/useItemSuggestionEngine.ts` | Consolidated suggestion fetch pipeline (suggestions, exact match, price context) |
| `src/modules/item-library/domain/invoiceSuggestionSelection.ts` | `InvoiceSuggestionSelection` type + `getInvoiceSuggestionSelection` |
| `src/modules/item-library/domain/invoiceSuggestionPriceContext.ts` | Price context text (client last / last used / standard) + history price action guard |
| `src/modules/item-library/services/itemLibraryService.ts` | `loadSuggestions`, `resolveExactItemMatch`, `loadItemPriceContext` |
| `src/domain/invoice/types.ts` | `InvoiceItem`, `InvoiceGroup`, `ExtraCharge`, `ColumnConfig`, `InvoiceCustomFields`, column kind/types |
| `src/domain/invoice/calculations.ts` | `calcTotals`, `resolveRowVat`, `buildSummaryRows`, `resolveExtraCharges`, legacy inference |
| `src/components/ColumnManager.tsx` | Column configuration UI (visibility, ordering, reset, custom columns, row overrides) |
| `src/components/useInvoiceColumns.tsx` | Column state/visibility/profile management |
| `src/pages/InvoiceFormPage.tsx` | Unified New/Edit orchestration, validation, save, PDF output |

---

## 4. Field Inventory — Old Prototype vs Live Behavior

`invoice-form-inline.html` provided the field/capability inventory. The live implementation governs current functionality.

### Fields present in old prototype and verified in live implementation

| Field | Old prototype | Live implementation | Notes |
|---|---|---|---|
| document title | ✅ | ✅ | |
| invoice number | ✅ | ✅ | |
| PO number | ✅ | ✅ | |
| issue / due dates | ✅ | ✅ | |
| client (bill to) | ✅ | ✅ | dashed-picker button |
| payment terms | ✅ | ✅ | |
| custom header fields | ✅ | ✅ | |
| line item description | ✅ | ✅ | with sub-description |
| sub-description | ✅ | ✅ | collapse/expand; populated state shows actual text |
| quantity / unit | ✅ | ✅ | |
| rate (unit_price) | ✅ | ✅ | |
| make / part no / condition | ✅ | ✅ | |
| VAT % / Disc % / WHT | ✅ | ✅ | |
| row total | ✅ | ✅ | |
| line actions (insert below, duplicate) | ✅ | ✅ | |
| extra charges | ✅ | ✅ | with/without tax toggle |
| additional fields | ✅ | ✅ | label + value pairs |
| notes / terms | ✅ | ✅ | |
| signatory | ✅ | ✅ | |
| links | ✅ | ✅ | |
| bank account | ✅ | ✅ | |
| PDF output settings | ✅ | ✅ | |

### Behavioural discrepancies identified (old prototype vs live)

- **Suggestion vs manual entry**: old prototype used a static mock suggestion array; live uses `useItemSuggestionEngine` with server-backed suggestions, exact-match recognition, and price context. The candidate represents the live interaction faithfully.
- **Sub-description interaction**: old prototype's populated "show more" mode was rejected in favour of the live contract (actual text 2-line clamp + tap-to-edit).
- **Row-level overrides**: live supports per-item VAT/discount/install overrides nested under row-level vs global; old prototype implied only global. Candidate represents the live column/override architecture.
- **Custom columns**: live supports `custom_data` field-on-item injection for TEXT/NUM columns and `includeInTotal`; old prototype listed custom columns but with no behavior. Candidate shows the real wiring (description-locked row, TEXT/NUM badges, visibility switch, reorder, reset).

No live-only fields were silently dropped from the old inventory: every capability listed in the old prototype has a live counterpart (either identical or surfaced differently), and where the old prototype was silent, the audit recorded the live equivalent.

---

## 5. Item Library Behaviour (from live code)

### How line-item entry works

1. User focuses the Description textarea (or holds the row grip). `enableItemSuggestions` defaults `false`; it activates on focus for standard rows with ≥2 characters.
2. `useItemSuggestionEngine` runs a single fetch pipeline:
   - `loadSuggestions(trimmed, 10, clientId, tenantClient)` → ranked suggestions.
   - `resolveExactItemMatch(trimmed, clientId, tenantClient)` → exact match (offline-first, fallback to suggestions).
3. Exact match auto-fills `item_id` via `recognizeExactMatch` without selecting from the dropdown.
4. Dropdown renders with `role=listbox`, `aria-autocomplete=list`, `aria-expanded`, `aria-controls`, `aria-activedescendant`.
5. Selecting a suggestion calls `handleSuggestionSelect`:
   - `description` = alias text if `match_source === 'alias'`, else item name.
   - `item_id` written at root level (allowed for invoice context).
   - `unit_price` written to `unit_price` unless context is `waybill` (waybill has no commercial pricing).
6. Price history context appears below the textarea: "Last sold to this client ₦X · doc · date" plus "Use ₦..." button. The `Use` button is only enabled when the price is from a *recognized* history entry and the current `unit_price` is `0`.

### What gets populated

- description, item_id, unit_price.
- Make/Brand, partNo, condition from the manual row fields (not auto-filled from library beyond what the suggestion writes).
- Sub-description and image from manual entry.

### Manual item entry

- Plain text typed into the Description textarea clears the existing `item_id` and triggers the sync/recognition drop. This is the "manual entry" path.
- A manual entry does not write to the catalog unless the user adds the item to the Item Library separately; the prototype represents this as out of scope for the form candidate.

### Groups and items

- Groups remain strong, edge-to-edge at phone width; collapsed groups are compact cards. Groups recompute totals.
- Inline drag/reorder, up/down nudge, delete, and duplicate operate per-item within a group.

### Column configuration

- `ColumnManager` (with `useInvoiceColumns`) drives per-column visibility, TEXT/NUM badges, locked Description row, reorder, and reset.
- Row-level overrides: VAT %, discount %, install rate per item, nested under a Row Overrides panel.
- Custom columns write to `custom_data` and can `includeInTotal`.

---

## 6. Mobile/Fold Candidate (v1)

File: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-mobile-fold-v1.html`

### Structural language

- Document shell mirroring BOQ V11: sticky full-width topbar (title, meta, theme, overflow menu), numbered sections, inline Columns/Import/Clear All toolbar, groups as edge-to-edge workbenches.
- Line items as the dominant working area; the item row recomposes around its own control rail (number + grip + nudge + remove + insert-below) with no artificial grid tracks and no detached Make/Brand.

### Mobile composition (~320/390/430px)

- Sticky nav bar with single-line document identity.
- Section 1: Document identity (title, no/PO, dates, header fields).
- Section 2: Bill-to client picker (dashed border, matching live form).
- Section 3: Line items — compact row with:
  - Description textarea (suggestion dropdown on focus, ≥2 chars) with live price-context line and "Use ₦..." history action.
  - Sub-description collapse (empty → "+ Add sub description" row; populated → 2-line clamp preview, tap to edit).
  - Qty/Unit pair; Rate (CP/SP distinction via accent + border-left).
  - Make/Part No/Condition in an extra compact row.
  - Row total bar (subtotal, with VAT memo).
- Floating FAB for thumb-zone save; end-of-form labelled Save button; fold topbar gets a persistent labelled Save.

### Fold composition (~600/800px)

- Recomposed, not enlarged: the item row expands from a single compact card into an identity column (description + sub-description) plus a data column (Qty/Unit, Rate, Make/PartNo/Condition). The control rail stays focused on the identity zone; metadata/commercial fields claim full item width below it.
- No giant blank/reclaimed-space hacks; no negative margins.

### Representative populated states

- Item Library-derived item (circuit breaker, with suggestion dropdown open, price context active, "Use ₦" button available).
- Manual item (free text, item_id cleared, no suggestion).
- Populated sub-description (2-line clamp, not dead space).
- Empty sub-description (compact "Add" row, no reserved textarea space).
- Two groups with items and subtotals.
- Total summary with subtotal, VAT, discount, WHT, extra charges, and amount in words.

### Save affordances

- Floating FAB (phone).
- End-of-form labelled Save (mobile).
- Fold topbar persistent labelled Save.
- Single `save()` flow (commit/save-and-send/discard) in the footer sheet.

---

## 7. Desktop Candidate (v1)

File: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/invoice/invoice-form-candidate-desktop-v1.html`

### Structural language

- Desktop-side navigation shell with section nav (Invoices, Quotations, Documents, Item Library, Reports, Settings) and main panel.
- The same Invoice sections as mobile (document, client, line items, commercial terms, totals, notes/terms, signatory, links, bank) plus a footer save bar.

### Independent desktop composition

- Per-row inline editing grid rows instead of vertical mobile cards; CP×Qty and SP×Qty displayed as computed cells with CP/SP profit.
- Multi-field editing: description, sub-description, qty, unit, rate, make, partNo, condition, install, VAT, discount, and custom columns in a single scrollable row.
- Item Library integration surfaced in the Columns sheet (column registry) plus a live suggestion dropdown on the description row.
- Row Overrides panel (per-item VAT/discount/install) surfaced via the Row Overrides view of the Columns sheet.
- Group navigation in a sidebar/rail; groups remain strong and easy to scan.
- Persistent actions (Save, Draft, Discard, Close) in the footer bar.
- Totals section prominent with all subtotals and charges listed.

### Desirable desktop uses

- Line-item scanning: compact rows with fixed numeric alignment.
- Multi-field editing: horizontal rows for all fields.
- Document context: full header, client, commercial terms visible simultaneously.
- Item Library: column registry + live suggestion dropdown.
- Column management: full Column Manager with description-locked row, TEXT/NUM badges, visibility switches, reorder, and reset.
- Totals/commercial awareness: permanent totals section.

### Design guardrail

- No spreadsheet regression: the desktop layout keeps hierarchy, control rail, and populated row states, not a wide undifferentiated table.

---

## 8. Column Settings — Representative of Live Capabilities

Both candidates reflect the live column contract:

- **Fixed Description**: locked row (cannot be hidden, always at top of the item row).
- **Ordering**: drag/reorder of columns; visibility switch per column.
- **TEXT / NUM badges**: labels distinguish text inputs from numeric inputs.
- **Custom columns**: rendered from `custom_data` keyed by column key, with `includeInTotal` support.
- **Row Overrides**: per-item VAT, discount, install override panel.
- **Reset**: reset to defaults with a confirmation dialog.
- **Labels**: column label comes from the registry; no invented simplified settings.

---

## 9. Functionality Intentionally Preserved

- Item Library suggestion/autocomplete interaction, exact-match recognition, price context, and "Use ₦" history action.
- Sub-description: empty compact row, populated 2-line clamp, tap-to-edit.
- Groups as strong edge-to-edge workbenches with subtotal toggle.
- Inline drag/reorder, up/down nudge, insert-below, duplicate, delete.
- CP/SP visual distinction.
- Thousands-separated numeric display with raw numeric semantics preserved.
- Inline Columns/Import/Clear All toolbar (no separate settings sheet gating them).
- Floating FAB + end-of-form Save + fold topbar Save.
- Totals and commercial terms (payment terms, discount type/timing, VAT, WHT, extra charges with/without tax, additional fields, signatory, links, bank).
- Single save flow.

---

## 10. Risks and Limitations

- **Human visual review only**: this is a design-direction prototype. No automated screenshot/browser verification was run (per task constraints).
- **Mock Item Library**: the candidate uses a representative suggestion dataset + price context; the live warehouse path is `loadSuggestions` → `resolveExactItemMatch` → `loadItemPriceContext`. Prototype cannot execute live Supabase.
- **No live save**: `save()` lives in the footer sheet and commits to the form state; the prototype does not persist to Supabase.
- **Report files intentionally left untouched**: `invoice-form-inline.html`, `boq-form-candidate-v11.html`, and all React source/SQL were not modified.

---

## 11. Deferred Work

- Human visual acceptance of both candidates.
- Automation of saved-candidate preview (browser screenshots) once the human review gate is passed.
- Extraction of a shared document-form shell for Invoice/Quotation/Waybill/RFQ (deferred per task: no generalized React abstraction yet).

---

Skills used: prototype, mobile-app-ui-design, html-prototype, design-artifact, frontend-design, mobile-android-design

Documentation standard: ASD-STE100 Simplified Technical English
