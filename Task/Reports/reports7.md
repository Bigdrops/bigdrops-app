# Task 7 Report — Waybill Schema Debug & Invoice UX Blueprint Extraction

---

## Task 1: Waybill Save Failure — Root Cause Analysis

### The Exact Cause

The Supabase `waybills` table definition **does not include a `custom_fields` column**, but the application sends `custom_fields` in every insert/update payload. This causes a PostgreSQL schema execution error when Supabase attempts to write the data.

**Migration file:** `supabase/migrations/20260520090004_csrs.sql` (lines 52–75)

The `CREATE TABLE IF NOT EXISTS waybills` statement defines these columns:
- `id`, `waybill_number`, `type`, `date`, `time`, `sender_name`, `receiver_name`, `receiver_signature_url`, `receiver_description`, `client_id`, `client_name`, `project_id`, `invoice_id`, `po_number`, `vehicle_plate`, `delivery_location`, `items`, `notes`, `status`, `created_by`, `created_at`, `archived_at`

**`custom_fields` is missing from this schema.** The same omission exists in the CSV architecture doc at `docs/architecture/Supabase Snippet Generate CREATE TABLE Statements.csv` (lines 628–651).

Meanwhile, the **local SQLite** table `waybills_local` (defined in `src/lib/native/waybillOffline.ts:120–146`) **does** include a `custom_fields TEXT` column. So offline saves work fine, but online sync to Supabase fails.

### Data Payload Mismatch Location

**File:** `src/domain/waybill/waybillMutations.ts`

```typescript
// Lines 24-29 — The payload assembled for online save:
const payload = {
  ...waybill,        // spreads all Waybill fields
  items,             // jsonb column — exists in schema ✓
  custom_fields,     // DOES NOT EXIST in schema ✗
  status
}

// Line 32 — Insert (new mode):
const { error } = await supabase.from('waybills').insert([payload])

// Line 36 — Update (edit mode):
const { error } = await supabase.from('waybills').update(payload).eq('id', waybillId)
```

**`custom_fields` is included in the payload at line 27 but has no corresponding column in the `waybills` table.** Supabase returns a schema execution error because it cannot map the `custom_fields` key to any database column.

### Downstream Code That Depends on `custom_fields`

| File | Line(s) | Usage |
|---|---|---|
| `src/components/waybill/waybillUtils.ts` | 34–54 | `WaybillCustomFields` interface definition |
| `src/components/waybill/waybillUtils.ts` | 78 | `custom_fields?: string \| WaybillCustomFields \| null` on `Waybill` type |
| `src/components/waybill/waybillUtils.ts` | 176–209 | `parseWaybillCustomFields()` — parses from DB row |
| `src/components/waybill/waybillUtils.ts` | 234–257 | `buildWaybillCustomFields()` — assembles before save |
| `src/components/waybill/WaybillForm.tsx` | 110 | State initialization: `const [customFields, setCustomFields] = useState<WaybillCustomFields>({})` |
| `src/components/waybill/WaybillForm.tsx` | 247 | `buildWaybillCustomFields(customFields, { customColumns })` — final assembly |
| `src/components/waybill/WaybillForm.tsx` | 254 | `custom_fields: finalFields` passed to `saveWaybill()` |
| `src/domain/waybill/waybillMutations.ts` | 8, 13, 19, 27 | Destructured and included in both offline/online payloads |
| `src/lib/native/waybillOffline.ts` | 141 | SQLite column: `custom_fields TEXT` |
| `src/lib/native/waybillSync.ts` | 188 | Sync to Supabase: `custom_fields: localWaybill.custom_fields` |
| `src/pages/ViewWaybill.tsx` | 175 | `parseWaybillCustomFields(waybill.custom_fields)` on read |

### Fix Required

Add `custom_fields jsonb` to the `waybills` table in Supabase via a new migration:
```sql
ALTER TABLE waybills ADD COLUMN custom_fields jsonb;
```
Or alternatively, stop sending `custom_fields` in the online payload and only persist it locally.

---

## Task 2: Invoice Module UI/UX Blueprint

### 2.1 Table Settings Architecture

**Component:** `src/components/ColumnManager.tsx` (lines 408–724)

The "Table Settings" button is rendered in `src/components/document/FormLineItems.tsx:174–177` using the `Settings2` icon. It calls `onOpenTableSettings` which toggles the `ColumnManager` sheet.

**How column visibility is controlled:**

The `ColumnManager` component receives these props from `SharedDocumentForm.tsx`:
```typescript
columns         // current column definitions array
onToggle(key)   // toggles a column's visible flag on/off
onToggleFull(key) // sets visibilityMode to 'hide_full' (complete hide)
onUpdate(key, field, val) // updates label or other column properties
onAddCustom()   // adds a new custom_* column
onRemoveCustom(key) // deletes a custom column
onReset()       // restores CONFIGURABLE_DEFAULT_COLUMNS
onMove(key, targetIdx) // reorders columns
```

**State storage:** Column preferences are stored **in component state** (React `useState`) within `SharedDocumentForm.tsx`, persisted to the invoice document's `custom_fields.columnConfig` JSON array on save. The `useInvoiceColumns` hook (`src/components/useInvoiceColumns.tsx`) manages the column config array, toggle logic, and visibility modes.

**Visibility modes per column:**
- `'show'` — column is visible in form and PDF
- `'hide_display'` — column data is computed but not shown on screen (hidden from form grid, still in PDF if configured)
- `'hide_full'` — column is completely hidden everywhere

The `ColumnManager` renders these sections:
1. **Standard PDF** — description column label editing
2. **Form Fields** — built-in columns (quantity, make, unit, unit_price, amount, install_rate, vat_rate, discount_rate) with individual toggle switches + drag-to-reorder
3. **Custom Columns** — any `custom_*` prefixed columns with toggle, label edit, delete, and reorder
4. **Add Custom Column** button
5. **Reset to defaults** link
6. **Row Overrides** — collapsible section showing per-item VAT/discount/install overrides

The resolved column definitions flow through `interpretPdfTableSettings()` in `src/components/pdf-new/table.ts:123–186`, which converts the saved `columnConfig` array into `PdfColumnDefinition[]` for the PDF renderer.

### 2.2 Form Structure & Element Positioning (Create Invoice Header)

**Primary file:** `src/components/document/SharedDocumentForm.tsx`

The "Create Invoice" form header is composed via these structural layers:

```
<div className="mx-auto max-w-4xl space-y-6 pb-24">          // outer container
  <div className="sticky top-0 z-10 ... backdrop-blur ...">   // sticky header
    <FormHeader                                                // component
      client={...}
      documentNumber={...}
      issueDate={...}
      dueDate={...}
      poNumber={...}                                          // PO Number field
    />
  </div>
  <FormLineItems ... />                                       // line items grid
  <FormCommercialTerms ... />
  <FormTotals ... />
  <FormNotesTerms ... />
  <FormFooter ... />
</div>
```

**Key UI tokens used:**
- Container: `mx-auto max-w-4xl space-y-6 pb-24`
- Sticky header bar: `sticky top-0 z-10 border-b border-bd-border bg-bd-surface/80 backdrop-blur shadow-sm rounded-b-3xl -mx-4 px-4 py-4`
- Title: `text-lg font-black tracking-tight text-foreground`
- Input fields use Radix UI `Label` + custom styled `Input` components with `bg-bd-surface border-bd-border` tokens
- Client selector: dropdown/popover with search, positioned at top of form
- Document number, issue date, due date, PO number: arranged in a responsive grid layout within the header section
- All fields use `var(--bd-*)` CSS custom properties for theming

### 2.3 Conditional Fields & Print View Mechanics

**On-screen (InvoiceDocumentCard) — `src/components/document-view/invoice/InvoiceDocumentCard.tsx`:**

PO Number handling (lines 36, 70, 85–89):
```typescript
const poRow = detailRows.find((row: any) => row?.label === 'PO Number');

// PO Number only rendered as a meta chip if it has a value:
...(poRow?.value ? [{ icon: FileText, label: "PO Number", value: `PO: ${poRow.value}` }] : [])

// PO Number is filtered out of the generic "Details" section
// and given its own dedicated chip in the meta chips row
detailRows.filter((row: any) => row?.label !== 'PO Number')
```

**If PO Number is blank:** The component simply omits it from the meta chips array (using spread with conditional) and excludes it from the detail rows loop. No structural space characters or placeholder elements are rendered — the element is effectively **not rendered at all** on screen.

**In PDF templates — `src/components/pdf-new/templates/Industry.tsx:68–77`:**
```typescript
const metaRows = [
  data.documentNumber ? { label: data.documentNumberLabel, value: data.documentNumber } : null,
  data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
  data.dueDateOrValidityDate ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate } : null,
  data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
].filter(Boolean)
```

Each meta row is conditionally included — if the value is falsy, `null` is returned and `.filter(Boolean)` removes it. Same pattern in Bolt (`Bolt.tsx:27`), Ledger (`Ledger.tsx:111–114`), and ObsidianReceipt (`ObsidianReceipt.tsx:60–61`).

**Other conditional sections in the Industry PDF template:**
- Bank details: `data.showBankDetails && Boolean(data.paymentDetails)`
- Balance due: `!isAdvanceDocument && model.totals.balanceDue !== null`
- Notes: `data.notes?.content` present
- Terms: `data.terms?.content` present
- Attachments: `data.attachments.length > 0`
- Additional fields: rendered only if sections exist
- Signature: rendered only if present
- Footer: rendered only if any footer content exists

**Empty group hiding (PDF):**
- `hideEmptyGroups` defaults to `true` (`previewModel.ts:161`, `table.ts:179`)
- In `industryAdapter.ts:278–304`, empty groups (group header immediately followed by group footer with no data rows) are stripped from the PDF output entirely

---

## Summary

| Finding | File(s) | Line(s) |
|---|---|---|
| **Waybill schema missing `custom_fields`** | `supabase/migrations/20260520090004_csrs.sql` | 52–75 |
| **Payload sends `custom_fields`** | `src/domain/waybill/waybillMutations.ts` | 27 |
| **Offline table has `custom_fields`** | `src/lib/native/waybillOffline.ts` | 141 |
| **Sync pushes `custom_fields` to Supabase** | `src/lib/native/waybillSync.ts` | 188 |
| **Table Settings component** | `src/components/ColumnManager.tsx` | 408–724 |
| **Column config state management** | `src/components/useInvoiceColumns.tsx` | entire file |
| **PDF column resolution** | `src/components/pdf-new/table.ts` | 123–186 |
| **Invoice document card (on-screen)** | `src/components/document-view/invoice/InvoiceDocumentCard.tsx` | 36, 70, 85–89 |
| **PDF meta rows conditional** | `src/components/pdf-new/templates/Industry.tsx` | 68–77 |
| **Empty group stripping** | `src/components/pdf-new/industryAdapter.ts` | 278–304 |
| **Form header structure** | `src/components/document/SharedDocumentForm.tsx` | entire file |
