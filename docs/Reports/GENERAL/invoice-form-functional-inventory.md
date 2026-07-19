# BIGDROPS Invoice Form — Complete Functional Inventory

This report was written by MiMoCode on 2026-07-19 via Local Runner.

---

## 1. Overall Architecture

### Component Hierarchy

```
InvoiceFormPage.tsx (Entry Point)
├── Layout (Page wrapper)
│   └── SharedDocumentForm.tsx (Core form component)
│       ├── FormHeader.tsx
│       │   ├── Client selector button
│       │   ├── Invoice/Quotation title input
│       │   ├── Invoice number input
│       │   ├── PO number input
│       │   ├── Issue date input
│       │   ├── Due date input
│       │   └── Custom header fields (dynamic)
│       │
│       ├── FormLineItems.tsx
│       │   ├── Toolbar (Import, Settings, Clear)
│       │   ├── DndContext (Drag and drop)
│       │   │   ├── SortableContext
│       │   │   │   ├── MobileGroupCard.tsx (Groups)
│       │   │   │   │   ├── Group header (name, collapse, delete)
│       │   │   │   │   ├── MobileItemCard.tsx (Items in group)
│       │   │   │   │   └── Add item to group button
│       │   │   │   │
│       │   │   │   └── SortableLineItem.tsx
│       │   │   │       └── MobileItemCard.tsx (Ungrouped items)
│       │   │   │
│       │   │   └── Clear all confirmation dialog
│       │   │
│       │   ├── Add item button
│       │   └── Add group button
│       │
│       ├── FormCommercialTerms.tsx
│       │   ├── Payment terms dropdown
│       │   ├── Custom payment terms input
│       │   ├── Discount section (collapsible)
│       │   │   ├── Value input
│       │   │   ├── Type toggle (NGN/%)
│       │   │   └── Timing toggle (Before/After VAT)
│       │   ├── VAT section (collapsible)
│       │   │   └── VAT rate input
│       │   ├── WHT section (collapsible)
│       │   │   ├── WHT rate input
│       │   │   └── Unit toggle (%/NGN)
│       │   ├── Additional charges section (collapsible)
│       │   │   ├── Charge rows (label + value + remove)
│       │   │   ├── Add charge (with tax) button
│       │   │   └── Add charge (no tax) button
│       │   └── Additional fields section (collapsible)
│       │       ├── Field rows (label + value + remove)
│       │       └── Add field button
│       │
│       ├── FormTotals.tsx
│       │   ├── Summary rows (Subtotal, Discount, VAT, etc.)
│       │   ├── VAT adjust button (collapsible)
│       │   ├── Amount in words display
│       │   └── Grand total display
│       │
│       ├── FormNotesTerms.tsx
│       │   ├── Notes & Terms section (collapsible)
│       │   │   ├── Invoice notes (RichTextEditor)
│       │   │   └── Terms & conditions (RichTextEditor)
│       │   ├── Signatory section (collapsible)
│       │   │   └── SignatoryPicker
│       │   └── Reference links section (collapsible)
│       │       ├── Link rows (label + URL + remove)
│       │       └── Add link button
│       │
│       ├── FormFooter.tsx (Sticky bottom bar)
│       │   ├── Cancel button
│       │   ├── Draft button
│       │   ├── Primary save button
│       │   └── Floating save button (FAB)
│       │
│       ├── ClientSelector (Sheet/dialog)
│       ├── ActionsSheet (Quick actions menu)
│       ├── JsonItemsImportSheet (Lazy loaded)
│       ├── ColumnManager (Lazy loaded)
│       └── IdentityLockDialog (Edit mode only)
│
├── PdfOutputSettings (PDF configuration)
└── IdentityLockDialog (Edit mode)
```

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useInvoiceEditableState` | `src/hooks/useInvoiceEditableState.ts` | Manages all editable state (invoice, items, groups, fields, charges) |
| `useInvoiceHydration` | `src/hooks/useInvoiceHydration.ts` | Loads existing invoice data in edit mode |
| `useInvoiceReferenceData` | `src/hooks/useInvoiceReferenceData.ts` | Fetches signatories, bank accounts, settings |
| `useInvoiceColumns` | `src/components/useInvoiceColumns.tsx` | Manages column visibility and configuration |
| `useInvoiceSave` | `src/hooks/useInvoiceSave.ts` | Handles save validation, payload building, persistence |
| `useDocumentSave` | `src/hooks/useDocumentSave.ts` | Generic document save orchestration |
| `useSettings` | `src/hooks/useSettings.js` | Global settings cache with listener pattern |
| `useLayoutMode` | `src/hooks/useLayoutMode.ts` | Mobile/desktop detection |

### Services & Utilities

| Module | File | Purpose |
|--------|------|---------|
| `computeDocument` | `src/lib/Calculations.ts` | Single source of truth for all financial calculations |
| `invoiceImportAdapter` | `src/domain/invoice` | JSON import transformation |
| `assertIdentityImmutable` | `src/domain/invoice/assertIdentityImmutable.ts` | Edit-mode identity lock enforcement |
| `validateProjectAssignment` | `src/domain/projects` | Project-client validation |
| `numberToWords` | `src/hooks/useInvoiceForm` | Amount in words conversion |
| `normalizeRichTextHtml` | `src/components/pdf-new/core/richText` | HTML sanitization for notes/terms |

### State Management

- **No Redux/Zustand** — pure React `useState` + `useCallback`
- **Module-level cache** in `useSettings.js` for settings
- **Ref-based snapshot** for edit-mode initial state comparison

---

## 2. User Journey

### Create Invoice Flow

1. User navigates to `/invoices/new` (or clicks "Create Invoice" from list)
2. `InvoiceFormPage` mounts with `mode='create'`
3. Initial state created from defaults or prefill data (from quotation conversion, project, etc.)
4. Invoice number auto-generated from Supabase (prefix + sequence)
5. User fills in:
   - Selects client (opens ClientSelector sheet)
   - Enters invoice title
   - Verifies/edits invoice number
   - Sets issue date (defaults to today)
   - Sets due date
   - Adds line items
   - Configures commercial terms (discount, VAT, WHT, charges)
   - Adds notes and terms
   - Selects signatory
   - Configures PDF output settings
6. User clicks "Create Invoice" (primary action)
7. Validation runs:
   - Client must be selected
   - At least one item with description required
   - No empty item rows allowed
   - Project assignment validated
8. Payload built with all computed totals
9. Supabase insert with unique number retry
10. Line items inserted separately
11. Audit log recorded
12. Navigation to invoice detail view

### Edit Invoice Flow

1. User navigates to `/invoices/edit/:id`
2. `InvoiceFormPage` mounts with `mode='edit'`
3. `useInvoiceHydration` loads invoice from Supabase
4. Custom fields parsed and hydrated into state
5. Line items loaded and mapped
6. Groups reconstructed from group headers
7. User edits fields
8. **Identity fields locked**: Client, Invoice Number, Document Type cannot be changed
9. Attempting to change locked fields shows `IdentityLockDialog`
10. Dialog offers "Duplicate Current Changes" as alternative
11. Save updates existing record (no number change allowed)
12. Old items deleted, new items inserted
13. Audit log recorded with before/after snapshot

---

## 3. Functional Areas

### Document Header
- Document type badge (Invoice/Quotation)
- Document title (editable)
- Invoice number (create: editable, edit: locked)
- PO number (optional)
- Issue date
- Due date
- Custom header fields (dynamic key-value pairs)

### Client Selection
- Client picker sheet/dialog
- Shows client name
- Edit mode: locked with lock icon
- Create mode: dashed border with chevron

### Line Items
- Item description (textarea, with autocomplete suggestions)
- Sub-description (optional, collapsible)
- Item image (optional, Cloudinary upload)
- Quantity
- Unit
- Unit price (rate)
- Make (optional)
- Part number (optional)
- Condition (optional)
- Install rate (optional, auto-calculated or manual override)
- VAT rate (optional, per-row override)
- Discount rate (optional, per-row override)
- Custom columns (user-defined)
- Computed subtotal per item

### Item Groups
- Group name (editable)
- Collapse/expand toggle
- Show subtotal toggle
- Delete group
- Add item to group
- Ungroup item
- Items within group rendered as `MobileItemCard`

### Commercial Terms
- Payment terms (dropdown: Custom, Net 7/14/30, Due on Receipt)
- Custom payment terms (text input)
- Discount (value + type NGN/% + timing before/after VAT)
- VAT rate (%)
- WHT (rate + unit %/NGN)
- Additional charges (dynamic list with tax/no-tax toggle)
- Additional fields (dynamic key-value pairs)

### Totals
- Subtotal
- Discount (conditional, before/after VAT)
- Taxable extra charges
- VAT amount
- Non-taxable charges (workmanship, transportation, shipping)
- Install rate total
- WHT amount
- Grand total
- Amount in words

### Notes & Terms
- Invoice notes (rich text editor)
- Terms & conditions (rich text editor)
- Customizable section titles

### Signatory
- Signatory picker (from database)
- Shows name and role

### Reference Links
- Dynamic list of label + URL pairs
- Add/remove links

### PDF Output Settings
- Show/hide bank details
- Bank account selection
- Show/hide footer
- Show/hide tagline
- Show/hide balance due
- Show/hide amount in words
- Show/hide VAT/WHT/discount percentages
- Compact mode
- Landscape layout option

---

## 4. User Actions

### Header Actions
| Action | Mode | Description |
|--------|------|-------------|
| Open actions sheet | Both | Opens quick actions menu |
| Edit title | Both | Inline editing of invoice title |
| Edit invoice number | Create only | Inline editing |
| Edit PO number | Both | Inline editing |
| Set issue date | Both | Date picker |
| Set due date | Both | Date picker |
| Add header field | Both | Adds custom key-value field |
| Edit header field | Both | Inline editing of label/value |
| Remove header field | Both | Deletes custom field |

### Client Actions
| Action | Mode | Description |
|--------|------|-------------|
| Select client | Create only | Opens ClientSelector sheet |
| View client (locked) | Edit only | Shows lock icon, opens IdentityLockDialog |

### Line Item Actions
| Action | Mode | Description |
|--------|------|-------------|
| Add item | Both | Adds new empty item at end |
| Add group | Both | Creates new group with header + empty item |
| Add item to group | Both | Adds item within group |
| Edit description | Both | Textarea with autocomplete |
| Edit sub-description | Both | Optional textarea |
| Upload image | Both | Cloudinary upload |
| Remove image | Both | Clears image |
| Edit quantity | Both | Numeric input |
| Edit unit | Both | Unit input with suggestions |
| Edit unit price | Both | Numeric input |
| Edit make | Both | Text input (if visible) |
| Edit part number | Both | Text input (if visible) |
| Edit condition | Both | Text input (if visible) |
| Edit install rate | Both | Numeric input (auto or manual) |
| Edit VAT rate | Both | Numeric input (per-row override) |
| Edit discount rate | Both | Numeric input (per-row override) |
| Edit custom columns | Both | Dynamic inputs based on column type |
| Move item up | Both | Reorder within list |
| Move item down | Both | Reorder within list |
| Insert item below | Both | Inserts empty item after current |
| Remove item | Both | Deletes item |
| Duplicate item | Both | (Via actions sheet) |
| Drag and drop | Both | Reorder ungrouped items |
| Clear all items | Both | Removes all items and groups |

### Group Actions
| Action | Mode | Description |
|--------|------|-------------|
| Edit group name | Both | Inline editing |
| Collapse/expand group | Both | Toggle visibility |
| Toggle group subtotal | Both | Show/hide group subtotal |
| Delete group | Both | Removes group, ungroups items |
| Add item to group | Both | Adds empty item within group |

### Commercial Terms Actions
| Action | Mode | Description |
|--------|------|-------------|
| Set payment terms | Both | Dropdown selection |
| Edit custom terms | Both | Text input |
| Set discount value | Both | Numeric input |
| Set discount type | Both | Toggle NGN/% |
| Set discount timing | Both | Toggle Before/After VAT |
| Set VAT rate | Both | Numeric input |
| Set WHT rate | Both | Numeric input |
| Set WHT unit | Both | Toggle %/NGN |
| Add extra charge (with tax) | Both | Adds charge row |
| Add extra charge (no tax) | Both | Adds charge row |
| Edit charge label | Both | Text input |
| Edit charge value | Both | Numeric input |
| Remove charge | Both | Deletes charge |
| Add additional field | Both | Adds key-value row |
| Edit field label | Both | Text input |
| Edit field value | Both | Text input |
| Remove field | Both | Deletes field |

### Notes & Terms Actions
| Action | Mode | Description |
|--------|------|-------------|
| Edit notes | Both | Rich text editor |
| Edit terms | Both | Rich text editor |
| Select signatory | Both | Signatory picker |
| Add reference link | Both | Adds label + URL row |
| Edit link label | Both | Text input |
| Edit link URL | Both | Text input |
| Remove link | Both | Deletes link |

### Footer Actions
| Action | Mode | Description |
|--------|------|-------------|
| Cancel | Both | Navigates away (with unsaved changes) |
| Save as draft | Both | Saves with 'unpaid' status |
| Primary save | Both | Saves with 'unpaid' status |
| Floating save (FAB) | Both | Same as primary save |

### Quick Actions Sheet
| Action | Mode | Description |
|--------|------|-------------|
| Save draft | Both | Saves document |
| Cancel | Both | Navigates away |
| Column manager | Both | Opens column settings |
| Import JSON | Both | Opens import sheet |
| Toggle qty/unit merge | Both | Switches display mode |
| Add group | Both | Creates new group |
| Scroll to additional info | Both | Scrolls to notes section |
| Scroll to links | Both | Scrolls to links section |

### PDF Settings Actions
| Action | Mode | Description |
|--------|------|-------------|
| Toggle bank details | Both | Show/hide in PDF |
| Select bank account | Both | Dropdown selection |
| Toggle footer | Both | Show/hide in PDF |
| Toggle tagline | Both | Show/hide in PDF |
| Toggle balance due | Both | Show/hide in PDF |
| Toggle amount in words | Both | Show/hide in PDF |
| Toggle VAT % | Both | Show/hide in PDF |
| Toggle WHT % | Both | Show/hide in PDF |
| Toggle discount % | Both | Show/hide in PDF |
| Toggle compact mode | Both | PDF layout option |
| Toggle landscape | Both | PDF orientation |

### Edit-Mode Only Actions
| Action | Mode | Description |
|--------|------|-------------|
| Identity lock dialog | Edit | Shows when locked field clicked |
| Duplicate current changes | Edit | Creates new invoice from current state |

---

## 5. Form Inputs

### Text Inputs
| Field | Location | Required | Placeholder |
|-------|----------|----------|-------------|
| Invoice title | Header | No | e.g. Monthly Maintenance |
| Invoice number | Header | Yes (auto) | Auto-generated |
| PO number | Header | No | Optional |
| Client name | Header (display) | Yes | Select a client |
| Custom header field label | Header | No | Label |
| Custom header field value | Header | No | Value |
| Group name | Line Items | No | e.g. Electrical Materials |
| Extra charge label | Commercial | No | Label (e.g. Transport) |
| Additional field label | Commercial | No | Label |
| Additional field value | Commercial | No | Value |
| Reference link label | Notes | No | Label |
| Reference link URL | Notes | No | https://... |

### Textarea Inputs
| Field | Location | Required | Placeholder |
|-------|----------|----------|-------------|
| Item description | Line Items | Yes (for save) | Item description... |
| Item sub-description | Line Items | No | Product sub-description, specs, or notes... |
| Custom payment terms | Commercial | No | e.g. Due in 14 days |

### Number Inputs
| Field | Location | Required | Min | Placeholder |
|-------|----------|----------|-----|-------------|
| Quantity | Line Items | No | 1 | 1 |
| Unit price (rate) | Line Items | No | 0 | 0 |
| Install rate | Line Items | No | 0 | Auto |
| VAT rate (per-row) | Line Items | No | 0 | 0 |
| Discount rate (per-row) | Line Items | No | 0 | 0 |
| Discount value | Commercial | No | 0 | 0 |
| VAT rate (global) | Commercial/Totals | No | 0 | 0 |
| WHT rate | Commercial | No | 0 | 0 |
| Extra charge value | Commercial | No | 0 | 0 |
| Custom column values | Line Items | Varies | Varies | Varies |

### Date Inputs
| Field | Location | Required |
|-------|----------|----------|
| Issue date | Header | Yes |
| Due date | Header | No |

### Dropdown/Select Inputs
| Field | Location | Options |
|-------|----------|---------|
| Payment terms | Commercial | Custom, Net 7, Net 14, Net 30, Due on Receipt |
| Unit | Line Items | Custom unit input with suggestions |
| Bank account | PDF Settings | From database |

### Toggle/Segmented Controls
| Field | Location | Options |
|-------|----------|---------|
| Discount type | Commercial | NGN, % |
| Discount timing | Commercial | After VAT, Before VAT |
| WHT unit | Commercial | %, NGN |
| Qty/unit merge | Actions | On/Off |

### Rich Text Editors
| Field | Location |
|-------|----------|
| Invoice notes | Notes & Terms |
| Terms & conditions | Notes & Terms |

### File Upload
| Field | Location | Accept |
|-------|----------|--------|
| Item image | Line Items | Image files only |

### Checkbox/Switch
| Field | Location |
|-------|----------|
| Group show subtotal | Groups |
| PDF: show bank details | PDF Settings |
| PDF: show footer | PDF Settings |
| PDF: show tagline | PDF Settings |
| PDF: show balance due | PDF Settings |
| PDF: show amount in words | PDF Settings |
| PDF: show VAT % | PDF Settings |
| PDF: show WHT % | PDF Settings |
| PDF: show discount % | PDF Settings |
| PDF: compact mode | PDF Settings |
| PDF: landscape layout | PDF Settings |

---

## 6. Dynamic Behaviour

### Auto Calculations
| Behavior | Trigger | Description |
|----------|---------|-------------|
| Item subtotal | qty × rate | Computed per row |
| Install rate auto | Column formula | If install_rate column has formula |
| Group subtotal | Sum of group items | Computed per group |
| Document subtotal | Sum of all item subtotals | Foundation for totals |
| Discount amount | discount value × type | Applied before/after VAT based on timing |
| VAT amount | taxable base × VAT rate | Row-level or global rate |
| WHT amount | (total - VAT) × WHT rate | Applied on total minus VAT |
| Extra charges total | Sum of all extra charges | With/without tax based on flag |
| Grand total | Subtotal - Discount + VAT + Charges - WHT | Final payable amount |
| Amount in words | numberToWords(totalPayable) | Nigerian Naira words |

### Currency Formatting
| Behavior | Description |
|----------|-------------|
| Naira format | All monetary values formatted with ₦ symbol |
| Decimal precision | 2 decimal places for display |
| Locale formatting | Thousands separator |

### Auto Numbering
| Behavior | Description |
|----------|-------------|
| Invoice number generation | Prefix + 6-digit sequential number |
| Unique retry | If number collision, auto-increment and retry |
| Prefix resolution | From settings document_prefixes |

### Due Date Calculation
| Behavior | Description |
|----------|-------------|
| Manual entry | User selects date |
| Payment terms | Displayed but not auto-calculated |

### Conditional Rendering
| Condition | Behavior |
|-----------|----------|
| Quotation mode | Labels change (Invoice → Quotation) |
| Edit mode | Identity fields locked, save updates existing |
| Create mode | Identity fields editable, save creates new |
| Group exists | Group header shows item count |
| Items exist | Clear button visible |
| Image uploaded | Preview shown with remove button |
| Sub-description exists | Details section expanded by default |
| Suggestions available | Autocomplete dropdown shown |
| Invalid row | Row highlighted and scrolled to |

### Column Visibility
| Behavior | Description |
|----------|-------------|
| Column manager | Toggle visibility of built-in columns |
| Custom columns | Add/remove user-defined columns |
| Reset columns | Restore default column configuration |

---

## 7. Validation Rules

### Required Fields
| Field | Validation | Error Message |
|-------|------------|---------------|
| Client | Must be selected | "Pick a client before saving" |
| At least one item | Must have item with description | "Add at least one item before saving" |

### Item Validation
| Rule | Description |
|------|-------------|
| Description required | Standard items must have non-empty description |
| Empty row detection | Counts rows without description |
| Invalid row highlighting | Scrolls to and highlights first invalid row |
| Row error timeout | Highlight removed after 2.5 seconds |

### Identity Lock (Edit Mode)
| Field | Rule |
|-------|------|
| client_id | Cannot be changed after save |
| client_name | Cannot be changed after save |
| invoice_number | Cannot be changed after save |
| document_type | Cannot be changed after save |

### Project Validation
| Rule | Description |
|------|-------------|
| Project-client match | If project selected, client must match project's client |
| Invalid project link | Shows error if project assignment invalid |

### Submission Blockers
| Condition | Result |
|-----------|--------|
| No client selected | Save blocked |
| No items with description | Save blocked |
| Empty item rows | Save blocked with count |
| Identity mutation in edit | Save blocked with duplicate offer |
| Invalid project link | Save blocked |

---

## 8. Keyboard Workflow

### Tab Order
1. Invoice title
2. Invoice number
3. PO number
4. Issue date
5. Due date
6. Custom header fields (label → value)
7. Item description
8. Item sub-description
9. Item quantity
10. Item unit
11. Item rate
12. (Additional item fields based on visibility)
13. Payment terms
14. Custom payment terms
15. Discount value
16. VAT rate
17. WHT rate
18. Extra charge fields
19. Additional field fields
20. Notes editor
21. Terms editor
22. Signatory picker
23. Reference link fields

### Enter Behaviour
| Context | Behaviour |
|---------|-----------|
| Item description | Inserts newline (textarea) |
| Inputs | No special handling |

### Escape Behaviour
| Context | Behaviour |
|---------|-----------|
| Client selector sheet | Closes sheet |
| Actions sheet | Closes sheet |
| Import sheet | Closes sheet |
| Column manager | Closes sheet |

### Focus Management
| Behaviour | Description |
|-----------|-------------|
| Invalid row scroll | Auto-scrolls to invalid row on save attempt |
| Description focus | Triggers item suggestion engine |
| Blur delay | 150ms delay before hiding suggestions |

---

## 9. Data Flow

### Input → State → Calculation → Save

```
User Input
    ↓
MobileItemCard / FormHeader / FormCommercialTerms
    ↓
updateInvoice() / updateItem() / setExtraCharges() / etc.
    ↓
useInvoiceEditableState (useState setters)
    ↓
InvoiceFormPage re-renders
    ↓
buildCalculationInputs() → computeDocument()
    ↓
documentTotals (items, groups, subtotal, vat, discount, wht, grandTotal)
    ↓
SharedDocumentForm receives computed values
    ↓
User clicks Save
    ↓
useInvoiceSave → useDocumentSave
    ↓
invoiceStrategy.validate()
    ↓
invoiceStrategy.buildPayload()
    ↓
invoiceStrategy.persist() → Supabase
    ↓
invoiceStrategy.afterSave() → Items insert + Audit log
    ↓
navigate('/invoices/:id')
```

### Save Transformation

| Field | Source | Transform |
|-------|--------|-----------|
| invoice_number | State | Prefix + sequence (create only) |
| client_id | State | Direct |
| client_name | State | Direct |
| issue_date | State | Direct |
| due_date | State | Direct |
| payment_terms | State | Custom or preset value |
| notes | State | normalizeRichTextHtml() |
| terms | State | normalizeRichTextHtml() |
| subtotal | Computed | documentTotals.subtotal |
| total | Computed | documentTotals.totalPayable |
| vat | Computed | documentTotals.vat |
| discount | Computed | documentTotals.discount |
| wht | Computed | documentTotals.wht |
| install_rate_total | Computed | documentTotals.installRateTotal |
| amount_in_words | Computed | numberToWords(totalPayable) |
| custom_fields | State | JSON stringified bundle |

### Persistence

| Table | Operation | Description |
|-------|-----------|-------------|
| invoices | INSERT/UPDATE | Main invoice record |
| invoice_items | DELETE + INSERT | Replace all items |
| audit_logs | INSERT | CREATE or UPDATE action |

---

## 10. Visual Layout

### Page Structure
```
┌─────────────────────────────────────────────────┐
│ Layout (hidePageHeader, immersive)              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ SharedDocumentForm                      │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ FormHeader                      │    │    │
│  │  │ • Document type badge           │    │    │
│  │  │ • Client selector               │    │    │
│  │  │ • Title input                   │    │    │
│  │  │ • Number + PO inputs            │    │    │
│  │  │ • Date inputs                   │    │    │
│  │  │ • Custom header fields          │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ FormLineItems                   │    │    │
│  │  │ • Toolbar (Import/Settings/Clear)│   │    │
│  │  │ • Item cards (sortable)          │    │    │
│  │  │ • Group cards (collapsible)      │    │    │
│  │  │ • Add item / Add group buttons   │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ FormCommercialTerms             │    │    │
│  │  │ • Payment terms                 │    │    │
│  │  │ • Discount (collapsible)        │    │    │
│  │  │ • VAT (collapsible)             │    │    │
│  │  │ • WHT (collapsible)             │    │    │
│  │  │ • Extra charges (collapsible)   │    │    │
│  │  │ • Additional fields (collapsible)│   │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ FormTotals                      │    │    │
│  │  │ • Summary rows                  │    │    │
│  │  │ • Amount in words               │    │    │
│  │  │ • Grand total                   │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ FormNotesTerms                  │    │    │
│  │  │ • Notes (collapsible)           │    │    │
│  │  │ • Terms (collapsible)           │    │    │
│  │  │ • Signatory (collapsible)       │    │    │
│  │  │ • Reference links (collapsible) │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ FormFooter (sticky bottom)      │    │    │
│  │  │ • Cancel / Draft / Save buttons │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │ Floating Save Button (FAB)      │    │    │
│  │  │ • Fixed bottom-right            │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ PdfOutputSettings                       │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Sticky Elements
| Element | Position | Behavior |
|---------|----------|----------|
| FormFooter | Bottom | Sticks to bottom with backdrop blur |
| Floating save FAB | Bottom-right | Fixed position, above footer |

### Scrollable Regions
| Region | Description |
|--------|-------------|
| Main form area | Scrolls entire form |
| Item suggestions dropdown | Scrollable list within item card |
| Rich text editors | Scrollable text areas |

---

## 11. Reusable vs Invoice-Specific

| Component/Section | Shared? | Used By |
|-------------------|---------|---------|
| `SharedDocumentForm` | Yes | Invoice, Quotation, CSR, RFQ, BOQ, Waybill |
| `FormHeader` | Yes | All document forms |
| `FormLineItems` | Yes | All document forms |
| `FormCommercialTerms` | Yes | Invoice, Quotation |
| `FormTotals` | Yes | All document forms |
| `FormNotesTerms` | Yes | All document forms |
| `FormFooter` | Yes | All document forms |
| `MobileItemCard` | Yes | All document forms |
| `MobileGroupCard` | Yes | All document forms |
| `SortableLineItem` | Yes | All document forms |
| `ClientSelector` | Yes | Invoice, Quotation, CSR |
| `ColumnManager` | Yes | All document forms |
| `JsonItemsImportSheet` | Yes | All document forms |
| `ActionsSheet` | Yes | All document forms |
| `IdentityLockDialog` | Yes | All document forms (edit mode) |
| `PdfOutputSettings` | Yes | Invoice, Quotation |
| `SignatoryPicker` | Yes | Invoice, Quotation, CSR |
| `RichTextEditor` | Yes | Invoice, Quotation, CSR |
| `useInvoiceEditableState` | Partially | Invoice, Quotation (with adaptations) |
| `useInvoiceHydration` | Partially | Invoice, Quotation (with adaptations) |
| `useInvoiceSave` | Partially | Invoice, Quotation (with strategies) |
| `useInvoiceColumns` | Yes | All document forms |
| `computeDocument` | Yes | All financial documents |
| `numberToWords` | Yes | Invoice, Quotation |
| Invoice-specific field names | No | Invoice only |
| Invoice number generation | No | Invoice only |
| Invoice-specific validation | No | Invoice only |

---

## 12. Dependencies

### Components
| Component | Source |
|-----------|--------|
| `Layout` | `src/components/Layout.tsx` |
| `Input` | `src/components/ui/input` |
| `NumericInput` | `src/components/ui/numeric-input` |
| `Textarea` | `src/components/ui/textarea` |
| `Select` | `src/components/ui/select` |
| `Switch` | `src/components/ui/switch` |
| `Button` | `src/components/ui/button` |
| `Card` | `src/components/ui/card` |
| `Sheet` | `src/components/ui/sheet` |
| `AlertDialog` | `src/components/ui/alert-dialog` |
| `RichTextEditor` | `src/components/RichTextEditor` (lazy) |
| `UnitInput` | `src/components/UnitInput` |
| `SignatoryPicker` | `src/components/SignatoryPicker` |
| `ClientSelector` | `src/components/ClientSelector` |
| `ColumnManager` | `src/components/ColumnManager` (lazy) |
| `JsonItemsImportSheet` | `src/components/items/JsonItemsImportSheet` (lazy) |
| `UnifiedActionSheet` | `src/components/actions/UnifiedActionSheet` |

### Hooks
| Hook | Source |
|------|--------|
| `useParams` | `react-router-dom` |
| `useNavigate` | `react-router-dom` |
| `useLocation` | `react-router-dom` |
| `useState` | `react` |
| `useEffect` | `react` |
| `useCallback` | `react` |
| `useMemo` | `react` |
| `useRef` | `react` |

### Libraries
| Library | Purpose |
|---------|---------|
| `@dnd-kit/core` | Drag and drop |
| `@dnd-kit/sortable` | Sortable list |
| `@dnd-kit/utilities` | DnD utilities |
| `decimal.js` | Precise decimal calculations |
| `lucide-react` | Icons |

### Domain Modules
| Module | Source |
|--------|--------|
| `domain/invoice` | Types, factories, normalization |
| `domain/invoice/types` | TypeScript interfaces |
| `domain/documentConversion` | Number generation |
| `domain/prefixConstants` | Prefix resolution |
| `domain/financial/resolveFinancialColumns` | Column resolution |
| `domain/projects` | Project validation |
| `lib/Calculations` | Financial computations |
| `lib/formatters/money` | Currency formatting |
| `lib/feedback` | Toast notifications |
| `lib/audit` | Audit trail logging |
| `lib/saveTiming` | Performance timing |
| `lib/userFacingMutationErrors` | Error messages |
| `lib/documentImageUploadPolicy` | Image validation |
| `supabase` | Database client |

---

## 13. UX Pain Points

### Identified Issues

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| 1 | No unsaved changes warning | High | Navigating away loses all changes without confirmation |
| 2 | No auto-save | High | Long forms risk data loss on crash/navigation |
| 3 | Scroll fatigue | Medium | Long form requires extensive scrolling |
| 4 | Hidden actions | Medium | Key actions buried in actions sheet |
| 5 | No keyboard shortcuts | Medium | Power users cannot快速操作 |
| 6 | Collapsible sections default closed | Medium | Users may miss important settings |
| 7 | No inline validation feedback | Medium | Validation only shown on save attempt |
| 8 | No preview before save | Medium | Users cannot see PDF output before saving |
| 9 | Floating FAB overlaps content | Low | May obscure bottom items on mobile |
| 10 | No item duplication shortcut | Low | Must use actions sheet |
| 11 | No bulk item operations | Low | Cannot select multiple items for delete/move |
| 12 | Rich text editor loading delay | Low | Lazy loaded, shows loading state |
| 13 | No undo/redo | Low | Mistakes require manual correction |
| 14 | No item search/filter | Low | Long lists require scrolling |
| 15 | No keyboard navigation in items | Low | Tab order may skip items |

### Responsiveness Issues

| Issue | Description |
|-------|-------------|
| Mobile keyboard overlap | Virtual keyboard may overlap footer |
| Touch targets | Some buttons may be too small for touch |
| Horizontal scrolling | Item cards may overflow on small screens |

---

## 14. Candidate Building Blocks

### For Universal Business Document Workspace

| Block | Components | Purpose |
|-------|------------|---------|
| **Document Header** | FormHeader, ClientSelector, Custom fields | Document metadata and party selection |
| **Party Section** | ClientSelector, IdentityLockDialog | Customer/vendor selection with edit lock |
| **Metadata Section** | Date inputs, Number inputs, Custom fields | Document dates, numbers, custom data |
| **Item Grid** | FormLineItems, MobileItemCard, MobileGroupCard, SortableLineItem | Line item editing with drag-drop |
| **Item Card** | MobileItemCard | Individual item editing with all fields |
| **Group Card** | MobileGroupCard | Grouped items with subtotal |
| **Commercial Terms** | FormCommercialTerms | Discount, tax, charges configuration |
| **Totals Panel** | FormTotals | Financial summary and grand total |
| **Notes Section** | FormNotesTerms (notes portion) | Rich text notes and terms |
| **Signatory Section** | FormNotesTerms (signatory portion) | Signatory selection |
| **Attachments Section** | FormNotesTerms (links portion) | Reference links management |
| **PDF Settings** | PdfOutputSettings | PDF output configuration |
| **Action Bar** | FormFooter | Save, cancel, draft actions |
| **Quick Actions** | ActionsSheet | Common actions menu |
| **Column Manager** | ColumnManager | Table column visibility |
| **Import Tools** | JsonItemsImportSheet | JSON data import |
| **Validation Display** | Invalid row highlighting, error toasts | Error feedback |
| **Status Banner** | (Future) | Document status display |
| **Timeline** | (Future) | Document history |
| **Preview Panel** | (Future) | PDF preview before save |

### Shared Infrastructure

| Block | Purpose |
|-------|---------|
| `useDocumentSave` | Generic save orchestration |
| `computeDocument` | Financial calculations |
| `ColumnManager` | Column configuration |
| `IdentityLock` | Edit-mode field protection |
| `RichTextEditor` | Rich text editing |
| `SignatoryPicker` | Signatory selection |
| `ClientSelector` | Client/vendor selection |

---

## Appendix A: File Inventory

### Entry Points
| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/InvoiceFormPage.tsx` | 549 | Main form page |
| `src/pages/NewInvoice.tsx` | (lazy) | Create mode wrapper |
| `src/pages/EditInvoice.tsx` | (lazy) | Edit mode wrapper |

### Core Form Components
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/document/SharedDocumentForm.tsx` | 368 | Core form orchestrator |
| `src/components/document/FormHeader.tsx` | 215 | Document header section |
| `src/components/document/FormLineItems.tsx` | 368 | Line items section |
| `src/components/document/FormCommercialTerms.tsx` | 326 | Commercial terms section |
| `src/components/document/FormTotals.tsx` | 97 | Totals section |
| `src/components/document/FormNotesTerms.tsx` | 185 | Notes, terms, signatory, links |
| `src/components/document/FormFooter.tsx` | 66 | Footer action bar |
| `src/components/document/SortableLineItem.tsx` | 88 | Sortable item wrapper |
| `src/components/document/IdentityLockDialog.tsx` | 47 | Identity lock dialog |

### Item Components
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/invoice/MobileItemCard.tsx` | 517 | Item card with all fields |
| `src/components/invoice/MobileGroupCard.tsx` | 214 | Group card with items |
| `src/components/invoice/ActionsSheet.tsx` | 70 | Quick actions sheet |
| `src/components/invoice/mobile/mobileFormPrimitives.tsx` | 319 | Shared form primitives |

### Hooks
| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useInvoiceEditableState.ts` | 452 | Editable state management |
| `src/hooks/useInvoiceHydration.ts` | 152 | Edit mode data loading |
| `src/hooks/useInvoiceReferenceData.ts` | 35 | Reference data fetching |
| `src/hooks/useInvoiceSave.ts` | 352 | Save orchestration |
| `src/hooks/useDocumentSave.ts` | 101 | Generic save hook |
| `src/components/useInvoiceColumns.tsx` | 178 | Column management |

### Domain
| File | Lines | Purpose |
|------|-------|---------|
| `src/domain/invoice/index.ts` | ( barrel ) | Invoice domain exports |
| `src/domain/invoice/types.ts` | ( types ) | TypeScript interfaces |
| `src/lib/Calculations.ts` | 720 | Financial calculations |

---

*End of inventory.*
