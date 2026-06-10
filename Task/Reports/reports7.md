# Diagnostic Report 7: Waybill Schema Error & Invoice Module Blueprint

---

## TASK 1: Waybill Save Failure — Root Cause & Diagnostics

### 1.1 The Exact Cause

The application throws a severe schema execution error when committing a waybill record because **two compounding database-level failures** exist:

**Failure 1 (PRIMARY): Missing `custom_fields` column in the remote Supabase `waybills` table**

- The remote `waybills` table is defined in `supabase/migrations/20260520090004_csrs.sql` (lines 52–75) and does **not** include a `custom_fields` column.
- The local offline SQLite table (`waybills_local` in `src/lib/native/waybillOffline.ts`, lines 119–146) **does** have `custom_fields TEXT`, creating a schema mismatch between local and remote.
- The save function at `src/domain/waybill/waybillMutations.ts:27` sends `custom_fields` (a `WaybillCustomFields` JavaScript object) in the insert/update payload. PostgREST rejects this because the column does not exist in the remote table.

**Failure 2 (SECONDARY): Missing RLS INSERT policy**

- The `waybills` table has RLS enabled (line 117 of the migration file) but only defines SELECT, DELETE, and UPDATE policies (lines 128–131). There is no `FOR INSERT` policy, meaning even a correctly-structured payload would be rejected by Supabase's RLS engine.

### 1.2 File Locations and Line Numbers

| Item | File | Lines |
|------|------|-------|
| Remote Supabase table schema (no `custom_fields`) | `supabase/migrations/20260520090004_csrs.sql` | 52–75 |
| Local SQLite table schema (has `custom_fields TEXT`) | `src/lib/native/waybillOffline.ts` | 119–146 |
| Save function sending `custom_fields` payload | `src/domain/waybill/waybillMutations.ts` | 5–41 (payload on line 27, insert on line 32, update on line 36) |
| `onSave` handler constructing the payload | `src/components/waybill/WaybillForm.tsx` | 239–275 (finalFields built on line 247) |
| `Waybill` type allowing `custom_fields` as object | `src/components/waybill/waybillUtils.ts` | 34–79 (interface on line 78) |
| RLS policies (missing INSERT) | `supabase/migrations/20260520090004_csrs.sql` | 128–131 |
| Offline sync passing raw `custom_fields` | `src/lib/native/waybillSync.ts` | 165–192 (line 188) |
| Architecture doc confirming same schema | `docs/architecture/Supabase Snippet Generate CREATE TABLE Statements.csv` | 628–651 |

### 1.3 Data Payload Layout Before Execution

In `src/domain/waybill/waybillMutations.ts`, lines 23–29, the payload is constructed as:

```typescript
const payload = {
  ...waybill,              // spreads ALL waybill fields (custom_fields is a WaybillCustomFields OBJECT here)
  items,                   // WaybillItem[] array
  custom_fields,           // WaybillCustomFields OBJECT — NOT JSON-stringified
  status: normalizeWaybillStatus(waybill.status)
}
```

The `custom_fields` value is a `WaybillCustomFields` JavaScript object (containing `customColumns`, `signatures`, `partyNotes`, `references`, `importMeta` sub-objects). It is never serialized via `JSON.stringify()` before being sent to Supabase.

### 1.4 Critical Comparison — Other Modules Serialize Correctly

Every other module in the codebase calls `JSON.stringify()` on `custom_fields` before sending to Supabase:

| Module | File | Serialization |
|--------|------|---------------|
| Invoices | `useInvoiceActions.ts:159` | `JSON.stringify(nextCustomFields)` |
| Invoices | `viewInvoiceActions.ts:167,186` | `JSON.stringify(...)` |
| Invoices | `invoiceConversionService.ts:47` | `JSON.stringify(...)` |
| Invoices | `invoiceAdvanceService.ts:64` | `JSON.stringify(customFields)` |
| Quotations | `QuotationForm.tsx:389` | `JSON.stringify(existingCustomFields)` |
| Quotations | `viewQuotationActions.ts:111,194,220` | `JSON.stringify(...)` |
| RFQs | `viewRFQActions.ts:73` | `JSON.stringify(...)` |
| BOQs | `viewBOQActions.ts:73` | `JSON.stringify(...)` |
| **Waybills** | **`waybillMutations.ts:27`** | **No serialization — raw JS object** |

Note: The `invoices` table has `custom_fields text` (migration `20260520090003_invoices.sql`, line 30), so `JSON.stringify()` is mandatory. The `waybills` table has **no `custom_fields` column at all**.

### 1.5 Additional Issues in the Waybill Save Pipeline

| Issue | File | Lines | Severity |
|-------|------|-------|----------|
| `getNextWaybillNumber()` receives empty array — always generates `SASWB-I001`/`SASWB-E001`, violating UNIQUE on second insert | `WaybillForm.tsx:158`, `waybillUtils.ts:387–394` | P0 |
| Save button clickable before async `waybill_number` is assigned (race condition — `waybill_number` could be `''`) | `WaybillForm.tsx:295` | P0 |
| FK columns set to `''` instead of `null`, violating FK constraints | `WaybillForm.tsx:144–150` | P1 |
| `duplicateWaybillRecord()` queries wrong prefix `WB-%` instead of `SASWB-%` | `viewWaybillActions.ts:25` | P1 |

### 1.6 Recommended Fixes

**Fix for Failure 1** — Add the missing column via a migration:
```sql
ALTER TABLE waybills ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;
```

**Fix for Failure 2** — Add the missing INSERT RLS policy:
```sql
CREATE POLICY waybills_authenticated_insert ON waybills FOR INSERT TO authenticated WITH CHECK (true);
```

**Fix for serialization** — Add `JSON.stringify()` to `waybillMutations.ts:27`:
```typescript
custom_fields: JSON.stringify(custom_fields),
```

---

## TASK 2: Invoice Module UI/UX Blueprint

### 2.1 Table Settings Architecture

#### The `[Table Settings]` Button Component

**File:** `src/components/document/FormLineItems.tsx` (lines 32, 169–178)

The button is a `ToolbarButton` rendered in a toolbar bar above the line-items grid:

```tsx
<div className="mb-3 flex items-center gap-2 border-b border-[var(--bd-border-soft)] py-2">
  <ToolbarButton onClick={onOpenImport} className="border-[var(--bd-border)] hover:bg-[var(--bd-bg)]">
    <FileInput className="h-3.5 w-3.5" />
    <span className="text-[12px]">Import Items</span>
  </ToolbarButton>
  <ToolbarButton onClick={onOpenTableSettings} className="border-[var(--bd-border)] hover:bg-[var(--bd-bg)]">
    <Settings2 className="h-3.5 w-3.5" />
    <span className="text-[12px]">Table Settings</span>
  </ToolbarButton>
  <div className="ml-auto text-[11px] font-mono text-[var(--bd-text3)]">Rows</div>
</div>
```

Uses the `Settings2` icon from `lucide-react`. Triggers `onOpenTableSettings` which propagates up to `SharedDocumentForm`.

#### Column Visibility State Management

**File:** `src/components/useInvoiceColumns.tsx` (lines 49–162)

Column visibility is managed via **React local state** inside the `useInvoiceColumns` custom hook. No database persistence at edit time — config is only saved when the invoice is committed.

**Three-mode visibility enum:**
```typescript
type ColumnVisibilityMode = 'show' | 'hide_display' | 'hide_full'
```

**`isVisible` check (lines 56–59):**
```typescript
const isVisible = (key: string) => {
  const column = getColumn(key)
  return column ? (column.visibilityMode || 'show') === 'show' : false
}
```

**`toggleVisible` — toggles `show` ↔ `hide_display` (lines 61–71):**
```typescript
const toggleVisible = (key: string) =>
  setColumns((cols) =>
    cols.map((column) =>
      column.key === key
        ? normalizeColumnConfig({
            ...column,
            visibilityMode: column.visibilityMode === 'show' ? 'hide_display' : 'show',
          }) as InvoiceColumn
        : column,
    ),
  )
```

**`toggleDisabled` — toggles `show` ↔ `hide_full` (lines 73–87):**
```typescript
const toggleDisabled = (key: string) =>
  setColumns((cols) => {
    const col = cols.find((c) => c.key === key)
    if (col?.key.startsWith('custom_')) {
      return cols.filter((c) => c.key !== key) // removes custom columns entirely
    }
    return cols.map((column) =>
      column.key === key
        ? (normalizeColumnConfig({
            ...column,
            visibilityMode: column.visibilityMode === 'hide_full' ? 'show' : 'hide_full',
          }) as InvoiceColumn)
        : column,
    )
  })
```

#### How Column Config Is Persisted

**File:** `src/pages/NewInvoice.tsx` (lines 528–547)

When saving, the local `columns` state is serialized into `custom_fields.columnConfig`:

```typescript
const customFieldsData: InvoiceCustomFields = {
  ...sanitizedInitialCustomFields,
  header: customFields.filter((field) => field.label && field.value),
  additionalFields: filterPopulatedAdditionalFields(additionalFields),
  extraCharges: extraCharges.filter((charge) => charge.label),
  chargeLabels,
  columnConfig: columns,  // ← COLUMN CONFIG SAVED HERE
  notesTitle,
  termsTitle,
  attachments,
  mergeQtyUnit,
  showItemImages: items.some((item) => item.row_type === 'standard' && item.image_url),
  discountType,
  discountTiming,
  whtType,
  calculationInputs,
  groupMeta,
  signatoryId,
  pdfOutput,
}
const customFieldsJson = JSON.stringify(customFieldsData)
```

Then on line 583: `custom_fields: customFieldsJson` is sent to Supabase.

#### ColumnManager Sheet UI

**File:** `src/components/ColumnManager.tsx` (lines 408–724)

A bottom sheet (`Sheet` component, `side="bottom"`) titled "Table Settings" with sections:
1. **"Standard PDF"** — `description` column is always shown, non-toggleable
2. **"Form Fields"** — Built-in columns (`quantity`, `make`, `unit`, `unit_price`, `amount`, `install_rate`, `vat_rate`, `discount_rate`) and custom columns. Each row has:
   - Eye/EyeOff toggle (toggles `show` ↔ `hide_display`)
   - Check/X toggle (for totals-affecting columns, toggles `hide_full`)
   - Drag handle and reorder buttons
   - Label editing input
3. **"Add Custom Column"** button
4. **"Reset to defaults"** link
5. **"Row Overrides"** — per-item VAT/discount/install overrides

Lazy-loaded from `SharedDocumentForm.tsx` (line 12):
```typescript
const ColumnManager = lazy(() => import('@/components/ColumnManager'))
```

#### Three Visibility Modes and Their Effects

**File:** `src/domain/invoice/columns.ts` (lines 147–164)

```typescript
export function resolveColumnBehavior(
  columns: ColumnConfig[] = [],
  items: InvoiceItem[] = [],
  context: 'form' | 'pdf' | 'view',
): ColumnConfig[] {
  return columns
    .map(normalizeColumnConfig)
    .filter((column) => {
      if (ALWAYS_VISIBLE_COLUMN_KEYS.has(column.key)) return true  // 'description' always shown
      const visibilityMode = column.visibilityMode || 'show'
      if (visibilityMode === 'hide_full') return false     // Removed from everything incl. totals
      if (visibilityMode === 'hide_display') return false  // Hidden from UI but still in totals
      if (context === 'form') return true
      if (NEVER_AUTO_HIDE_COLUMN_KEYS.has(column.key)) return true // 'description', 'quantity', 'unit_price'
      return items.some((item) => itemHasVisibleValue(item, column))  // Auto-hide empty columns
    })
}
```

**Key distinction:**
- `hide_display` — Column hidden from form UI and PDF, but **still included in totals calculation**
- `hide_full` — Column completely removed from UI **and** totals calculation (zeroed out)

---

### 2.2 Form Structure & Element Positioning

#### Page-Level Layout

**File:** `src/pages/NewInvoice.tsx` (lines 691–806)

```tsx
<Layout title="Create Invoice" hidePageHeader>
  <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
    <SharedDocumentForm ... />
    <PdfOutputSettings ... />
  </div>
</Layout>
```

#### Form Shell

**File:** `src/components/document/SharedDocumentForm.tsx` (lines 163–265)

```tsx
<div className="bd-form-shell bd-custom-scrollbar overflow-x-hidden px-0 pt-1 sm:pt-2">
  <div className="mx-auto w-full max-w-[780px] px-3 sm:px-4">
    <div className="space-y-4 pb-6">
      {/* Form sections in order: */}
      <FormHeader />       {/* Client selector, document details */}
      <FormLineItems />    {/* Line items grid + Table Settings */}
      <FormCommercialTerms /> {/* Discount, VAT, WHT, extra charges */}
      <FormTotals />       {/* Summary rows and grand total */}
      <FormNotesTerms />   {/* Notes, terms, signatory */}
    </div>
  </div>
</div>
```

#### Semantic UI Tokens

**File:** `src/components/invoice/mobile/mobileFormPrimitives.tsx` (lines 19–23)

```typescript
export const pageCardCls =
  'rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg shadow-none'

export const fieldCls =
  'h-11 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface px-3 text-[14px] text-bd-text shadow-none transition placeholder:text-bd-text-muted focus-visible:border-bd-button-primary-bg focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg/15'

export const labelCls =
  'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-bd-text-muted'
```

#### FormHeader Field Positioning

**File:** `src/components/document/FormHeader.tsx` (lines 25–194)

**Outer wrapper (line 41):**
```tsx
<div className="border-b border-[var(--bd-border-soft)] pb-4">
  <div className="space-y-4">
```

**Client Selector container (lines 59–76):**
```tsx
<button
  type="button"
  onClick={onOpenClientPicker}
  className="flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-3 text-left transition hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)]"
>
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bd-bg2)] text-[var(--bd-text3)]">
    <BriefcaseBusiness className="h-4.5 w-4.5" />
  </div>
  <div className="min-w-0 flex-1">
    <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Client</div>
    <div className="mt-0.5 truncate text-[14px] font-bold text-[var(--bd-text)]">
      {invoice.client_name || 'Select a client'}
    </div>
  </div>
  <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />
</button>
```

**Invoice No + PO Number — 2-column grid (lines 95–116):**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className={labelCls}>Invoice No.</label>
    <div className="relative">
      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bd-text4)]" />
      <Input
        value={invoice.invoice_number || ''}
        className={`${fieldCls} pl-9 font-mono text-[13px] font-bold tracking-tight text-[var(--bd-text)]`}
      />
    </div>
  </div>
  <div>
    <label className={labelCls}>PO Number</label>
    <Input
      value={invoice.po_number || ''}
      placeholder="Optional"
      className={fieldCls}
    />
  </div>
</div>
```

**Issue Date + Due Date — 2-column grid (lines 118–137):**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className={labelCls}>Issue Date</label>
    <Input type="date" value={invoice.issue_date || ''} className={fieldCls} />
  </div>
  <div>
    <label className={labelCls}>Due Date</label>
    <Input type="date" value={invoice.due_date || ''} className={fieldCls} />
  </div>
</div>
```

**Header Fields section (lines 139–188):** Dynamically addable label/value pairs, separated by a `border-t border-[var(--bd-border-soft)] pt-4` divider.

---

### 2.3 Conditional Fields & Print View Mechanics

#### How Optional Fields Are Hidden When Blank

**File:** `src/domain/invoice/projections/contentProjection.ts` (lines 16–31)

The `buildDetailRowsProjection` function constructs detail rows and **filters out empty rows completely**:

```typescript
export function buildDetailRowsProjection(
  input: DetailRowsProjectionInput,
): PreviewDetailRow[] {
  const { customFieldObject, poNumber, invoice } = input
  const topHeaderFields = Array.isArray(customFieldObject?.header)
    ? customFieldObject.header.filter((field) => field?.label && field?.value)
    : []

  return [
    { label: 'PO Number', value: poNumber || '' },
    { label: 'Payment Terms', value: invoice.payment_terms || '' },
    { label: 'Work Duration', value: invoice.work_duration || '' },
    ...topHeaderFields.map((field) => ({ label: field.label || '', value: field.value || '' })),
  ].filter((row) => String(row.value || '').trim().length > 0)  // ← REMOVES EMPTY ROWS
}
```

**Line 30 is the key:** `.filter((row) => String(row.value || '').trim().length > 0)` — this **unmounts the row entirely** when the value is blank. No structural space characters or empty DOM elements are left behind.

#### View Page Rendering

**File:** `src/components/document-view/invoice/InvoiceDocumentCard.tsx` (lines 36, 63–72, 85–97)

PO Number is rendered in two places:

1. **As a meta chip** (line 36, 70) — only rendered if `poRow?.value` is truthy:
```tsx
const poRow = detailRows.find((row: any) => row?.label === 'PO Number');
...(poRow?.value ? [{ icon: FileText, label: "PO Number", value: `PO: ${poRow.value}` }] : []),
```

2. **In the Details section** (lines 85–97) — PO Number is excluded from the detail block (it gets its own chip above):
```tsx
{detailRows.filter((row: any) => row?.label !== 'PO Number').length > 0 && (
  <div className={styles.infoCell}>
    <div className={styles.infoLabel}>Details</div>
    {detailRows
      .filter((row: any) => row?.label !== 'PO Number')
      .map((row, index) => ( /* ... */ ))}
  </div>
)}
```

#### PDF Print Engine

**File:** `src/components/pdf-new/table.ts` (lines 123–186)

The `interpretPdfTableSettings` function bridges saved column config to the PDF render engine:

```typescript
export function interpretPdfTableSettings(
  savedColumns: SavedColumnConfig[] = [],
  options: InterpretPdfTableSettingsOptions = {},
): PdfResolvedTableSettings {
  const resolvedColumns = resolveColumnBehavior(
    configuredColumns.map(toColumnConfig),
    options.items || [],
    'pdf',  // ← context='pdf' triggers auto-hide of empty columns
  )
  const resolvedKeys = new Set(resolvedColumns.map((column) => column.key))
  // Skip columns not in resolvedKeys
}
```

Both the view page and PDF engine use the same `resolveColumnBehavior` function with different context strings (`'view'` vs `'pdf'`), producing identical filtering behavior for non-form contexts.

#### View Page vs PDF Engine — Behavioral Comparison

| Aspect | View Page (`InvoiceDocumentCard`) | PDF Engine (`invoicePdfActions.ts`) |
|---|---|---|
| Detail rows | Filtered by `buildDetailRowsProjection` — empty rows fully removed | Same projection function used, passed as `headerFields` |
| Column visibility | `resolveColumnBehavior(columns, items, 'view')` | `resolveColumnBehavior(columns, items, 'pdf')` |
| Empty column behavior | `itemHasVisibleValue` check — if no item has data, column is removed | Identical logic via `'pdf'` context |
| PO Number display | Rendered as meta chip only if truthy | Included in `headerFields` only if non-empty |
| Row unmounting | Full DOM unmount — no residual space | Full array exclusion — column definition never enters PDF column array |

---

## Key File Reference Table

| Concern | File | Key Lines |
|---------|------|-----------|
| Remote waybills schema (no `custom_fields`) | `supabase/migrations/20260520090004_csrs.sql` | 52–75 |
| Local SQLite waybills schema (has `custom_fields`) | `src/lib/native/waybillOffline.ts` | 119–146 |
| Waybill save function | `src/domain/waybill/waybillMutations.ts` | 5–41 |
| Waybill form onSave handler | `src/components/waybill/WaybillForm.tsx` | 239–275 |
| Waybill type definitions | `src/components/waybill/waybillUtils.ts` | 34–79 |
| Waybill offline sync | `src/lib/native/waybillSync.ts` | 165–192 |
| Table Settings button | `src/components/document/FormLineItems.tsx` | 32, 169–178 |
| ColumnManager sheet | `src/components/ColumnManager.tsx` | 408–724 |
| Column visibility hook | `src/components/useInvoiceColumns.tsx` | 49–162 |
| Column config domain logic | `src/domain/invoice/columns.ts` | 65–251 |
| ColumnConfig type | `src/domain/invoice/types.ts` | 266–275 |
| Visibility mode type | `src/domain/invoice/types.ts` | 3 |
| Form shell | `src/components/document/SharedDocumentForm.tsx` | 163–265 |
| Form header fields | `src/components/document/FormHeader.tsx` | 25–194 |
| Styling tokens | `src/components/invoice/mobile/mobileFormPrimitives.tsx` | 19–23 |
| Create Invoice page | `src/pages/NewInvoice.tsx` | 691–807 |
| View Invoice page | `src/pages/ViewInvoice.tsx` | 30–182 |
| Invoice Document Card | `src/components/document-view/invoice/InvoiceDocumentCard.tsx` | 36–187 |
| Detail row filtering | `src/domain/invoice/projections/contentProjection.ts` | 16–31 |
| Preview model | `src/domain/invoice/previewModel.ts` | 66–235 |
| PDF table interpreter | `src/components/pdf-new/table.ts` | 123–186 |
| PDF generation action | `src/components/document-view/invoice/invoicePdfActions.ts` | 15–190 |
| Invoice actions hook | `src/components/document-view/invoice/useInvoiceActions.ts` | 27–334 |
| Visibility mode test | `src/tests/invoice/columnVisibilityMode.test.js` | 1–88 |
| Auto-hide empty columns test | `src/tests/pdf-new/table.test.js` | 147–161 |
