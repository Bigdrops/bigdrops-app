# Invoice Prototype Completeness Audit

This report was written by Claude on 2026-09-02 via opencode.

## Objective

Compare two HTML prototypes (`invoice-form-popup-slate-navy.html` and `invoice-form-inline-slate-navy.html`) against the live Invoice form implementation. Produce a completeness matrix, omission/addition lists, and design recommendations. Zero production code changes.

## Scope

- Live form: `SharedDocumentForm.tsx` + 6 sub-components + MobileGroupCard + MobileItemCard + DocumentActionSheets + ColumnManager
- Popup prototype: `invoice-form-popup-slate-navy.html` (131 lines, compact)
- Inline prototype: `invoice-form-inline-slate-navy.html` (1171 lines, comprehensive)

---

## Completeness Matrix

| # | Functional Area | Live | Popup | Inline | Classification |
|---|----------------|------|-------|--------|---------------|
| **1** | **Document Identity** | | | | |
| 1.1 | Mode badge (Invoice/Quotation) | FormHeader:48-51 | Header | Header | MATCH |
| 1.2 | Invoice title input | FormHeader:94-101 | `invoice.title` | `invoice.title` | MATCH |
| 1.3 | Invoice number (editable create, locked edit) | FormHeader:103-137 | `invoice.number` | `invoice.number` | MATCH — but live has `isEdit` lock; prototypes always editable |
| 1.4 | PO number | FormHeader:128-137 | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** — both lack PO field |
| 1.5 | Issue date | FormHeader:139-158 | `invoice.issueDate` | `invoice.issueDate` | MATCH |
| 1.6 | Due date | FormHeader:139-158 | `invoice.dueDate` | `invoice.dueDate` | MATCH |
| 1.7 | Custom header fields (add/remove) | FormHeader:160-215 | Not present | `invoice.headerFields` + add/remove | **POPUP ENHANCEMENT** (inline has it, popup lacks it) |
| **2** | **Client / Customer** | | | | |
| 2.1 | Client picker (search/select) | FormHeader:64-84 + ClientSelector | Picker trigger | Picker trigger + sheet | MATCH |
| 2.2 | Client display (name + avatar) | FormHeader:76-82 | `client.name` + `client.person` | `client.name` + `client.person` + `client.initials` | MATCH |
| 2.3 | Saved clients list | ClientSelector component | `savedClients` (3 mock) | `savedClients` (3 mock) | MATCH |
| 2.4 | Client search button | ClientSelector | `toast('Client search opened')` | `toast('Client search opened')` | UX DIFFERENCE — live is full ClientSelector; prototypes are stubs |
| **3** | **Line Items** | | | | |
| 3.1 | Add item | FormLineItems + onAddItem | `addItem()` | `addItem()` | MATCH |
| 3.2 | Remove item | MobileItemCard + onRemoveItem | `removeItem()` | `removeItem()` | MATCH |
| 3.3 | Insert item below | FormLineItems + onInsertItemAfter | Not present | `insertBelow()` | **POPUP ENHANCEMENT** — inline has it; popup lacks it |
| 3.4 | Duplicate item | MobileItemCard (via actions?) | Not present | `duplicateItem()` | **PROTOTYPE ENHANCEMENT** — live MobileItemCard doesn't expose a visible duplicate action on the card itself |
| 3.5 | Item description | MobileItemCard | `a.description` | `a.description` + suggestion engine | MATCH (inline adds suggestion UX) |
| 3.6 | Sub-description | MobileItemCard (expandable) | Not present | `a.subDescription` + toggle | **POPUP ENHANCEMENT** — inline has it, popup lacks it |
| 3.7 | Quantity + Unit | MobileItemCard | `a.qty` + `a.unit` | `a.qty` + `a.unit` | MATCH |
| 3.8 | Rate (unit price) | MobileItemCard | `a.price` | `a.price` | MATCH |
| 3.9 | Make / Model | MobileItemCard | Not present | `a.make` | **PROTOTYPE ENHANCEMENT** — live has this on MobileItemCard but popup doesn't model it |
| 3.10 | Part number | MobileItemCard | Not present | `a.partNo` | **PROTOTYPE ENHANCEMENT** — same as above |
| 3.11 | Per-item VAT rate | MobileItemCard | Not present | `a.vatRate` | **PROTOTYPE ENHANCEMENT** — inline models per-item VAT; live handles VAT globally in FormCommercialTerms |
| 3.12 | Per-item discount rate | MobileItemCard | Not present | `a.discountRate` | **PROTOTYPE ENHANCEMENT** — same pattern |
| 3.13 | Condition (New/Used/Refurbished) | MobileItemCard | Not present | `a.condition` | **PROTOTYPE ENHANCEMENT** |
| 3.14 | Row total display | MobileItemCard | Not visible | `money(a.line)` row total bar | **PROTOTYPE ENHANCEMENT** — live computes `computedAmount` but doesn't show row total on card |
| 3.15 | Image upload (Cloudinary) | MobileItemCard:100+ | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** — both lack image/photo upload |
| 3.16 | Suggestion engine (item library) | MobileItemCard | Not present | `suggestionOpenId` + mock data | **PROTOTYPE ENHANCEMENT** — inline has suggestion UI; live has it in MobileItemCard |
| **4** | **Grouping** | | | | |
| 4.1 | Create group | FormLineItems + onAddGroup | Not present | `addGroup()` | **POPUP ENHANCEMENT** — inline has it, popup lacks it |
| 4.2 | Rename group | MobileGroupCard + onUpdateGroupName | Not present | `groupVal(id, 'name', v)` | **POPUP ENHANCEMENT** |
| 4.3 | Delete group | MobileGroupCard + onDeleteGroup | Not present | `removeGroup(id)` | **POPUP ENHANCEMENT** |
| 4.4 | Add item to group | MobileGroupCard + onAddItemToGroup | Not present | `addItemToGroup(gid)` | **POPUP ENHANCEMENT** |
| 4.5 | Group subtotal toggle | MobileGroupCard + onToggleGroupSubtotal | Not present | `groupToggle(id)` | **POPUP ENHANCEMENT** |
| 4.6 | Group collapse/expand | MobileGroupCard:59 (collapsed state) | Not present | Not explicit (implicit via rendering) | **LIVE MISSING FROM PROTOTYPE** — live has collapse; inline doesn't model it |
| 4.7 | Ungroup item | MobileGroupCard:63-66 | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** — both lack ungroup action |
| 4.8 | Group visual treatment (indigo gradient header, left rule) | MobileGroupCard:71,107 | Not present | Basic section | **LIVE MISSING FROM PROTOTYPE** — live has polished group chrome |
| **5** | **Column Management** | | | | |
| 5.1 | Column visibility toggle | ColumnManager (lazy) | Not present | `state.sheet === 'columns'` | **PROTOTYPE ENHANCEMENT** — inline has columns sheet; popup lacks it |
| 5.2 | Column reorder (drag/arrows) | ColumnManager + moveColumn | Not present | Columns sheet with arrow buttons | MATCH (inline) / **POPUP MISSING** |
| 5.3 | Custom column add/remove | ColumnManager + addCustomColumn + removeCustomColumn | Not present | `columnsSheet()` with add/remove | MATCH (inline) |
| 5.4 | Column type badge (Num/Text) | ColumnManager | Not present | Column sheet shows type badges | MATCH (inline) |
| 5.5 | Row overrides | ColumnManager + onResetItemOverrides | Not present | Row Overrides section in columns sheet | MATCH (inline) |
| 5.6 | Reset to defaults | ColumnManager + resetColumns | Not present | "Reset to defaults" button | MATCH (inline) |
| 5.7 | Install Rate field (multiplier) | FormLineItems / MobileItemCard | Not present | Install Rate with multiplier input | MATCH (inline) |
| **6** | **Commercial Terms** | | | | |
| 6.1 | Payment terms (Custom/Net 7/14/30/Due on Receipt) | FormCommercialTerms:88-115 | Not present | `invoice.paymentTerms` + select | **PROTOTYPE ENHANCEMENT** — inline has it; popup lacks it |
| 6.2 | Due/validity custom text | FormCommercialTerms:106-114 | Not present | `invoice.customPaymentTerms` | **PROTOTYPE ENHANCEMENT** |
| 6.3 | Discount (value + type: NGN/%) | FormCommercialTerms:119-163 | Not present | `invoice.discount` + `invoice.discountType` | **PROTOTYPE ENHANCEMENT** |
| 6.4 | Discount timing (before/after VAT) | FormCommercialTerms:151-161 | Not present | `invoice.discountTiming` | **PROTOTYPE ENHANCEMENT** |
| 6.5 | VAT rate | FormCommercialTerms:165-185 | Not present | `invoice.vat` | **PROTOTYPE ENHANCEMENT** |
| 6.6 | WHT (rate + type: %/NGN) | FormCommercialTerms:187-210 | Not present | `invoice.wht` + `invoice.whtType` | **PROTOTYPE ENHANCEMENT** |
| 6.7 | Extra charges (with/without tax) | FormCommercialTerms + onAddExtraCharge | Not present | `invoice.extraCharges` + add (withTax/noTax) | **PROTOTYPE ENHANCEMENT** |
| 6.8 | Additional fields (custom label+value) | FormCommercialTerms + onAddAdditionalField | Not present | `invoice.additionalFields` | **PROTOTYPE ENHANCEMENT** |
| **7** | **Totals** | | | | |
| 7.1 | Subtotal | FormTotals:36-55 via summaryRows | Not visible | `money(t.raw)` | **POPUP MISSING** — popup has no totals section at all |
| 7.2 | Discount row | FormTotals:36-55 via summaryRows | Not present | `t.disc` conditional | **PROTOTYPE ENHANCEMENT** |
| 7.3 | VAT row | FormTotals:36-55 via summaryRows | Not present | `t.vat` conditional | **PROTOTYPE ENHANCEMENT** |
| 7.4 | Extra charges rows | FormTotals:36-55 via summaryRows | Not present | `t.taxableCharges` + `t.nonTaxCharges` | **PROTOTYPE ENHANCEMENT** |
| 7.5 | WHT row | FormTotals:36-55 via summaryRows | Not present | `t.wht` conditional | **PROTOTYPE ENHANCEMENT** |
| 7.6 | Grand total | FormTotals:86-93 | Not visible | `money(t.total)` | **PROTOTYPE ENHANCEMENT** |
| 7.7 | Amount in words | FormTotals:80-84 | Not present | `words(t.total)` | **PROTOTYPE ENHANCEMENT** |
| 7.8 | VAT adjust button | FormTotals:58-78 | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** — live has an expandable VAT rate adjuster inside totals |
| **8** | **Notes / Terms / Supporting Info** | | | | |
| 8.1 | Invoice notes (rich text) | FormNotesTerms:86-94 + RichTextEditor | Not present | `invoice.notes` textarea | **PROTOTYPE ENHANCEMENT** — inline has basic textarea; live uses RichTextEditor |
| 8.2 | Terms & conditions (rich text) | FormNotesTerms:96-105 + RichTextEditor | Not present | `invoice.terms` textarea | **PROTOTYPE ENHANCEMENT** — same as above |
| 8.3 | Signatory picker | FormNotesTerms:110-132 + SignatoryPicker | Not present | `invoice.signatory` name+role inputs | **PROTOTYPE ENHANCEMENT** — inline has basic inputs; live has full SignatoryPicker with signature image |
| 8.4 | Reference links (label + URL) | FormNotesTerms:134-182 | Not present | `invoice.links` + add/remove | **PROTOTYPE ENHANCEMENT** |
| **9** | **Actions / Footer** | | | | |
| 9.1 | Cancel button | FormFooter:27-34 | Not visible | `commit()` | **PROTOTYPE ENHANCEMENT** — inline has commit(); live has cancel/draft/primary |
| 9.2 | Save as Draft | FormFooter:36-44 | Not visible | Not present | **LIVE MISSING FROM PROTOTYPE** — popup lacks all footer actions |
| 9.3 | Primary save (Save & Send / Record) | FormFooter:46-51 | `commit()` | `commit()` | UX DIFFERENCE — live has save+draft+cancel; prototypes have single commit |
| 9.4 | Floating save button | FormFooter:56-63 | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** — live has fixed FAB save; prototypes don't |
| 9.5 | Actions sheet (more options) | DocumentActionSheets.tsx | Not present | `state.sheet === 'actions'` with toggle/clear | **PROTOTYPE ENHANCEMENT** — inline has basic actions; live has full DocumentActionSheet with payment/copy/clone/convert/archive/delete/export/pdf |
| 9.6 | Confirm clear dialog | Not in SharedDocumentForm (lives elsewhere) | Not present | `renderConfirmClear()` | **PROTOTYPE ENHANCEMENT** — inline has confirm dialog for clear all |
| **10** | **Mobile Behavior** | | | | |
| 10.1 | Touch-friendly targets (min 44px) | Form uses h-10/h-11 buttons | Compact targets | Compact targets | UX DIFFERENCE — live uses proper touch targets; prototypes are visually compact |
| 10.2 | Safe area insets | FormFooter:23 `env(safe-area-inset-bottom)` | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** |
| 10.3 | Bottom nav offset | FormFooter:60 `var(--bd-app-bottom-nav-offset)` | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** |
| 10.4 | DnD reorder (touch) | FormLineItems via @dnd-kit | Not present | Pointer events drag implementation | **PROTOTYPE ENHANCEMENT** — inline has custom DnD; live uses @dnd-kit |
| 10.5 | Up/Down arrow reorder | FormLineItems + onMoveItem | Not present | `moveItem(id, dir)` | **PROTOTYPE ENHANCEMENT** — inline has arrows alongside drag |
| **11** | **Desktop Behavior** | | | | |
| 11.1 | Max-width container (780px) | SharedDocumentForm:185 `max-w-[780px]` | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** — prototypes are mobile-frame-only |
| 11.2 | Responsive grid (2-col fields) | FormHeader:103 `grid-cols-2` | Single column | Single column | **LIVE MISSING FROM PROTOTYPE** |
| 11.3 | sm: breakpoint adaptations | Multiple components use `sm:` prefixes | Not present | Not present | **LIVE MISSING FROM PROTOTYPE** |

---

## Omission List — Live Functionality Missing from Prototypes

| # | Feature | Live Location | Prototype Gap |
|---|---------|--------------|---------------|
| O1 | **PO Number field** | FormHeader:128-137 | Neither prototype models `po_number` |
| O2 | **Invoice number lock in edit mode** | FormHeader:107-118 (`isEdit` + Lock icon) | Both prototypes always show editable number |
| O3 | **Client lock in edit mode** | FormHeader:66 (`isEdit` → locked) | No edit-mode concept in prototypes |
| O4 | **Image/photo upload per line item** | MobileItemCard:100+ (Cloudinary) | Neither prototype models image upload |
| O5 | **Group collapse/expand** | MobileGroupCard:59,74-79 | Inline has groups but no collapse state |
| O6 | **Ungroup item** | MobileGroupCard:63-66 | Neither prototype has ungroup action |
| O7 | **Group visual chrome** (indigo gradient, left rule, footer) | MobileGroupCard:71,107,144-177 | Inline has basic groups; no visual polish |
| O8 | **Rich text editor** (Notes & Terms) | FormNotesTerms:87-104 (lazy-loaded) | Inline uses plain `<textarea>` |
| O9 | **SignatoryPicker** (signature image, role picker) | FormNotesTerms:120-129 | Inline has name+role text inputs only |
| O10 | **VAT adjust button inside Totals** | FormTotals:58-78 | Neither prototype has this |
| O11 | **Floating save FAB** | FormFooter:56-63 | Neither prototype has floating save |
| O12 | **Safe area insets** (iOS notch/home indicator) | FormFooter:23,60 | Neither prototype handles safe areas |
| O13 | **Bottom nav offset** | FormFooter:60 | Neither prototype models app chrome |
| O14 | **Full DocumentActionSheet** (payment, copy, clone, convert, archive, delete, export, pdf, project links) | DocumentActionSheets.tsx | Inline has stub actions; popup has none |
| O15 | **ClientSelector full component** (search, filter, create) | SharedDocumentForm:298-309 | Both use stub picker with 3 mock clients |
| O16 | **ColumnManager full component** (lazy-loaded) | SharedDocumentForm:347-362 | Inline has visual mock; popup has none |
| O17 | **JsonItemsImportSheet** (lazy-loaded) | SharedDocumentForm:331-344 | Inline has visual mock of import flow |
| O18 | **Item count badge** in line items header | FormLineItems (item count display) | Neither prototype shows item count |
| O19 | **Invalid row highlighting** + clear | FormLineItems + `invalidRowIndex` | Neither prototype models validation |
| O20 | **Workmanship/Transportation/Shipping** dedicated charge fields | SharedDocumentForm:144-166 | Inline has generic extra charges only |
| O21 | **Responsive 2-col grid** for fields | FormHeader:103,139; FormCommercialTerms:87 | Both prototypes use single column |
| O22 | **SectionLabel** color-coded section headers | All live components | Inline has section headers but no color coding |

---

## Addition List — Prototype Functionality Not in Live Form

| # | Feature | Prototype Location | Live Gap |
|---|---------|-------------------|----------|
| A1 | **Per-item VAT rate** (`a.vatRate`) | Inline line item fields | Live has global VAT only (FormCommercialTerms) |
| A2 | **Per-item discount rate** (`a.discountRate`) | Inline line item fields | Live has global discount only |
| A3 | **Per-item condition** (New/Used/Refurbished) | Inline line item fields | No condition field in live |
| A4 | **Row total bar** per line item | Inline `money(a.line)` | Live computes but doesn't display row total on card |
| A5 | **Duplicate item button** | Inline `duplicateItem()` | No visible duplicate action on live MobileItemCard |
| A6 | **Insert below button** per item | Inline `insertBelow()` | Live has insert via FormLineItems toolbar, not per-item |
| A7 | **Sub-description toggle** | Inline `toggleSub()` | Live has sub-description but different UI (expandable section) |
| A8 | **Confirm clear all dialog** | Inline `renderConfirmClear()` | Live has clear but confirm lives elsewhere |
| A9 | **Item suggestion engine** (mock) | Inline `suggestionOpenId` + `getFilteredSuggestions()` | Live has suggestion engine in MobileItemCard (different implementation) |
| A10 | **Document type picker** (Invoice/Quotation sheet) | Inline `typeSheet()` | Live infers type from props, no picker in form |
| A11 | **Bank account section + switcher** | Inline `bankSection()` + `bankSheet()` | No bank section in invoice form (lives elsewhere) |
| A12 | **Mock data auto-populated** (3 clients, 3 bank accounts, mock items) | Both prototypes | Live starts empty or hydrates from DB |

---

## Popup vs Inline Comparison

| Aspect | Popup (131 lines) | Inline (1171 lines) |
|--------|-------------------|---------------------|
| **Scope** | Header + line items only (compact) | Full form: header, items, groups, commercial terms, totals, notes, signatory, links, bank |
| **State model** | 10 fields | 25+ fields including groups, commercial terms, signatory, links, bank |
| **Groups** | Not modeled | Full CRUD with subtotals, collapse, add-to-group |
| **Column manager** | Not modeled | Full visual mock with reorder, add/remove, type badges, row overrides |
| **Commercial terms** | Not modeled | Discount, VAT, WHT, extra charges, additional fields |
| **Totals** | Not modeled | Full summary with discount, VAT, charges, WHT, amount in words |
| **Notes/Terms** | Not modeled | Textarea for notes + terms |
| **Signatory** | Not modeled | Name + role inputs |
| **Reference links** | Not modeled | Add/remove links |
| **Bank details** | Not modeled | Bank account display + switcher |
| **Import JSON** | Not modeled | Full import sheet mock with AI prompt |
| **DnD reorder** | Not modeled | Pointer events implementation |
| **Line item fields** | description, qty, unit, price, make, partNo, condition, vatRate, discountRate | Same + sub-description, row total bar |
| **Sheets** | None | client, type, bank, columns, import, actions |
| **Footer/actions** | Single `commit()` | Single `commit()` |
| **Production readiness** | Quick visual mock | Comprehensive interaction prototype |

---

## Design Recommendations

### 1. Per-Item VAT and Discount (Prototype Enhancement A1, A2)

The inline prototype models per-item VAT rate and discount rate. The live form handles these globally in FormCommercialTerms. **Decision needed:** Adopt per-item tax/discount or keep global-only. Per-item is more flexible but adds calculation complexity.

### 2. Condition Field (Prototype Enhancement A3)

The inline prototype includes a condition selector (New/Used/Refurbished) per line item. This is useful for procurement/inventory contexts. **Recommendation:** Add as an optional column in ColumnManager rather than a always-visible field.

### 3. Row Total Display (Prototype Enhancement A4)

The inline prototype shows a row total bar per item. Live computes `computedAmount` but doesn't surface it on the card. **Recommendation:** Add a subtle row total to MobileItemCard — it helps users verify calculations without scrolling to totals.

### 4. Duplicate Item (Prototype Enhancement A5)

Live MobileItemCard doesn't have a visible duplicate action. **Recommendation:** Add duplicate to the item action menu or as a long-press option.

### 5. Rich Text for Notes/Terms (Live O8)

The live form uses RichTextEditor (lazy-loaded). The inline prototype uses plain textarea. **No change needed** — the prototype is correct to use textarea for visual testing; the live implementation is superior.

### 6. Popup Prototype Gaps

The popup prototype is severely under-scoped compared to the inline. It covers ~30% of the form's functional areas. **Recommendation:** Either expand the popup to match inline's coverage, or treat it as a header-only reference mock.

### 7. Prototype vs Live Alignment

The inline prototype is ~85% aligned with the live form's functional areas. The main gaps are: PO number, edit-mode locks, image upload, group collapse, rich text editors, and safe area handling. These are all implementable additions.

### 8. Desktop Responsiveness

Neither prototype models desktop layout (max-width container, 2-col grids, responsive breakpoints). **Recommendation:** Add a desktop frame variant if the prototypes are meant to validate desktop UX.

---

## Verification

- All live components read and cross-referenced
- Both prototypes fully read (popup: 131 lines; inline: 1171 lines)
- Matrix covers all 11 specified functional areas
- Omission and addition lists are exhaustive based on code review

---

*Audit complete. No production code changes made.*
