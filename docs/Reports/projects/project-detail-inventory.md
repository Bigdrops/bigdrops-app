# ProjectDetail — Full Page Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/pages/ProjectDetail.tsx`
**Subcomponents:**
- `ProjectDetailHeader` — `src/components/project/detail/ProjectDetailHeader.tsx`
- `ProjectDetailStats` — `src/components/project/detail/ProjectDetailStats.tsx`
- `ProjectOperatingStream` — `src/components/project/detail/ProjectOperatingStream.tsx`
- `ProjectDocumentGroups` — `src/components/project/detail/ProjectDocumentGroups.tsx`
- `ProjectActionRail` — `src/components/project/detail/ProjectActionRail.tsx`
- `ProjectLinkDialog` — `src/components/project/detail/ProjectLinkDialog.tsx`
- `ProjectDocumentSheet` — `src/components/project/ProjectDocumentSheet.tsx`
- `ProjectDocumentCard` — `src/components/project/ProjectDocumentCard.tsx`
**Data hook:** `src/hooks/useProjectDocumentFetch.ts`
**Utilities:** `src/domain/projectDetailUtils.ts` / `src/domain/projects.ts`
**DB migration:** `supabase/migrations/20260520090001_projects.sql`

---

## 1. Page Structure Overview

The page is a scrollable content area inside `<Layout title={project.name}>` with a `max-w-6xl mx-auto` container. It loads data via the `useProjectDocumentFetch(id)` hook, displaying skeleton cards while loading. The page has two modes: **view mode** (default) and **edit mode** (toggled by the "Edit" button in the header).

**Route:** `/projects/:id` — registered in `AppShell.tsx` (line 194): `<Route path="/projects/:id" element={withBoundary(<ProjectDetail />)} />`

**Data flow:** `useProjectDocumentFetch(projectId)` hook fetches all data in parallel on mount and on `refresh()` calls.

---

## 2. Data Loading (useProjectDocumentFetch hook)

**File:** `src/hooks/useProjectDocumentFetch.ts`

### Queries executed in parallel on mount:

| Query | Table | Columns Selected | Filter |
|-------|-------|-----------------|--------|
| Project | `projects` | `*` | `.eq('id', projectId).single()` |
| Invoices | `invoices` | `id, invoice_number, invoice_title, status, total, issue_date, document_type, custom_fields` | `.eq('project_id', projectId).is('archived_at', null).order('issue_date', false)` |
| CSRs | `csrs` | `id, csr_number, title, status, created_at` | `.eq('project_id', projectId).order('created_at', false)` |
| Quotations | `quotations` | `id, quotation_number, status, total, issue_date` | `.eq('project_id', projectId).order('issue_date', false)` |
| Waybills | `waybills` | `id, waybill_number, status, date, created_at, type` | `.eq('project_id', projectId).order('created_at', false)` |
| Financials | `project_financials_v` | `*` | `.eq('project_id', projectId).single()` |
| Project Docs | `project_documents` | `*` | `.eq('project_id', projectId).order('created_at', false)` |

**Secondary query:** For invoices found, a second query fetches `invoice_financials_v` for all invoice IDs to enrich each invoice with `balance_due`, `computed_status`, and `cash_received`.

### Returned data structure:

| Field | Type | Description |
|-------|------|-------------|
| `project` | `Project \| null` | Single project row |
| `financials` | `Financials \| null` | Aggregated financial view |
| `invoices` | `Invoice[]` | Invoices with `invoiceFinancials` enrichment |
| `csrs` | `CSR[]` | Basic CSR metadata |
| `quotations` | `Quotation[]` | Basic quotation metadata |
| `waybills` | `Waybill[]` | Basic waybill metadata |
| `projectDocs` | `ProjectDoc[]` | External project documents |
| `timeline` | `TimelineItem[]` | Merged + sorted (newest first) across all doc types |
| `loading` | `boolean` | Initial load and refresh state |
| `error` | `string \| null` | Error message |
| `refresh` | `function` | Re-fetches everything |

---

## 3. Section-by-Section Inventory

### SECTION: Loading State

When `loading` is `true`:
```tsx
<SkeletonCard className="h-[120px]" />
<SkeletonRow />
<SkeletonRow />
<SkeletonRow />
<CenteredSpinner />
```

### SECTION: Not Found State

When `project` is null after loading:
```tsx
<div className="px-6 py-10 text-sm text-muted-foreground">Project not found.</div>
```

---

### SECTION: ProjectDetailHeader (view mode)

**Component:** `ProjectDetailHeader` — `src/components/project/detail/ProjectDetailHeader.tsx`

#### View mode layout:
- `border-l-4 border-l-emerald-500` accent
- Emerald icon (`FolderKanban`) in emerald-themed rounded container
- Project name heading (`text-2xl font-extrabold`)
- Status badge (using `PROJECT_STATUS_CONFIG` for label/className)

#### View mode fields displayed:

| Field | Display | Condition |
|-------|---------|-----------|
| Project name | `<h1>` heading | Always |
| Status | `span` with status config classes | Always |
| Project code | Mono-style badge with copy button | Only if `project.project_code` exists |
| Client | `Building2` icon + name | Only if `project.client_name` is truthy |
| Location | `MapPin` icon + location text | Only if `project.location` is truthy |
| PO Number | `Hash` icon + "PO: ..." | Only if `project.po_number` is truthy after trim |
| Start Date | `Calendar` icon + "Started {formatDate}" | Only if `project.start_date` is truthy |
| Project Value | `DollarSign` icon + currency format | Only if `project.project_value` is truthy |
| Notes | Italic paragraph | Only if `project.notes` is truthy |

#### Copy button (project code):
- **Action:** `navigator.clipboard.writeText(project.project_code)`
- **Success:** `feedback.success('Copied', { description: '{code} copied to clipboard.' })`
- **Error:** `feedback.error('Copy failed')`

#### Edit button:
- **Action:** `setEditing(true)` — switches the header to edit mode
- **Style:** Emerald-themed button with `Pencil` icon

---

### SECTION: ProjectDetailHeader (edit mode)

**Same container** but switches to a full edit form:

#### Edit fields (inside a 2-column grid):

| Field | Control | State Key | Notes |
|-------|---------|-----------|-------|
| Project Name | `<input>` (text) | `editForm.name` | `md:col-span-2` |
| Status | `<Select>` (shadcn) | `editForm.status` | Options: Active, Completed, On Hold, Cancelled |
| Start Date | `<input type="date">` | `editForm.start_date` | |
| Project Value (₦) | `<NumericInput>` | `editForm.project_value` | Placeholder: "Optional" |
| P.O. Number | `<input>` (text) | `editForm.po_number` | Placeholder: "Optional" |
| Site / Location | `<input>` (text) | `editForm.location` | `md:col-span-2`, Placeholder: "Optional" |
| Notes | `<textarea>` | `editForm.notes` | `md:col-span-2`, `min-h-[96px]`, `resize-y` |

#### Edit mode buttons:

| Button | Action |
|--------|--------|
| **Cancel** | `setEditing(false)` |
| **Save Changes** | `handleSaveEdit()` — disabled while `saving` is true, shows "Saving..." |

#### Save edit behavior (handleSaveEdit, lines ~80–115):
1. Calls `supabase.from('projects').update({...}).eq('id', id)`
2. Update payload: `name.trim()`, `status`, `project_value`, `po_number.trim() || null`, `start_date`, `notes.trim() || null`, `location.trim() || null`
3. On error: `feedback.error('Save failed')`
4. On success:
   - **Audit trail** (fire-and-forget):
     - `recordProjectUpdated(id!)` — activity_event with UPDATED type
     - If notes changed: `recordProjectNoteAdded(id!, ...)` — NOTE_ADDED event
     - `recordAuditLog(...)` with action UPDATE, oldData = previous project, newData = refreshed project
   - `setEditing(false)`
   - `fetchAll()` — refreshes all data

**No field-level validation on edit save.** Empty name is silently saved.

---

### SECTION: ProjectDetailStats

**Component:** `ProjectDetailStats` — `src/components/project/detail/ProjectDetailStats.tsx`

5 summary cards in a responsive grid (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-5`):

| Card | Value Source | Value Class | Accent Class |
|------|-------------|-------------|--------------|
| Total Invoiced | `formatCurrency(financials?.total_invoiced)` | `text-slate-900` | `border-blue-200` |
| Cash Collected | `formatCurrency(financials?.cash_collected)` | `text-emerald-600` | `border-emerald-200` |
| WHT Collected | `formatCurrency(financials?.wht_collected)` | `text-emerald-600` | `border-emerald-200` |
| Outstanding | `formatCurrency(financials?.outstanding)` | Red if > 0, else slate-900 | Red if > 0, else slate-200 |
| Invoice Count | `Number(financials?.invoice_count \|\| 0).toLocaleString()` | `text-slate-900` | `border-violet-200` |

Each card has:
- Left accent border (4px, color per card)
- Uppercase label (`text-[11px] font-semibold`)
- Value (`text-2xl font-extrabold`)

---

### SECTION: Operating Stream

**Component:** `ProjectOperatingStream` — `src/components/project/detail/ProjectOperatingStream.tsx`

- **Container:** `border-t-4 border-t-slate-800` with header "Operating Stream / Latest activity"
- **Empty state:** "No activity recorded yet for this project."
- **Data:** `timeline.slice(0, 10)` — shows up to 10 most recent events
- **Each timeline row shows:**
  - Document type icon (colored per `DOC_TYPE` config)
  - Document label + number + total (in k format if present)
  - Date (formatted)
  - Status label (if present)
  - ChevronRight button → navigates to document's detail page

**Document types mapped:** invoice, quotation, csr, waybill with paths:
- invoice → `/invoices/${event.id}`
- quotation → `/quotations/${event.id}`
- csr → `/csr/${event.id}`
- waybill → `/waybills/${event.id}`

---

### SECTION: ProjectDocumentGroups

**Component:** `ProjectDocumentGroups` — `src/components/project/detail/ProjectDocumentGroups.tsx`

#### Sub-section: Commercial documents (invoices + quotations)
- **Header:** "Commercial" with count badge
- **Empty state:** "No quotations or invoices yet" with hint text
- **Each card shows:**
  - Document type icon + label badge (Invoice/Quotation)
  - Document number (bold)
  - Status badges: payment status for invoices (`getPaymentStatusConfig`), quotation status for quotations
  - Invoice title (if present)
  - Date (formatted)
  - Invoice financials: balance due or "Paid", cash collected
  - Total amount (right side, red if outstanding > 0)
  - Chevron icon → navigates to document detail

#### Sub-section: Field documents (CSRs + waybills)
- **Header:** "Field" with count badge
- **Empty state:** "No CSRs or waybills yet" with hint text
- **Each card shows:**
  - Document type icon + label badge
  - Document number
  - Status badge
  - Title (if present)
  - Date (formatted)
  - Chevron icon → navigates to document detail

**Sorting:** Both groups sorted newest-first by date.

---

### SECTION: External Documents

**Rendered inline** in `ProjectDetail.tsx` (not a separate component).

- **Container:** `border-l-4 border-l-amber-500` accent
- **Header:** "External Documents" with count badge + "+ Add File" button
- **Empty state:** Dashed border box with "No external files yet" + hint
- **Each document card** (`ProjectDocumentCard` from `src/components/project/ProjectDocumentCard.tsx`):
  - Type badge (PO = `bg-blue-500`, Receipt = `bg-emerald-500`, Waybill = `bg-orange-500`, Other = `bg-slate-500`)
  - Main label
  - Summary parts (from `getProjectDocumentSummaryParts()`)
  - Delete button (red trash icon)
  - Key fields grid (up to 4 fields from `getProjectDocumentKeyFields()`)
  - Preview image (if available, from `getProjectDocumentImages()`)
  - VAT/WHT display
  - Action buttons: "View Document", "Copy JSON", "Export PDF"
- **Delete:** Opens `ConfirmActionDialog`, then calls `supabase.from('project_documents').delete().eq('id', docId)`

---

### SECTION: ProjectActionRail (desktop sidebar)

**Component:** `ProjectActionRail` — `src/components/project/detail/ProjectActionRail.tsx`

**Desktop** (`sticky top-6 hidden md:block`):

#### Card: "Record Control"
- **Quick Action buttons** (4 items):

| Button | Path | Style |
|--------|------|-------|
| Create Invoice | `/invoices/new` | `bg-emerald-600 text-white hover:bg-emerald-700` |
| Create Quotation | `/quotations/new` | `bg-blue-600 text-white hover:bg-blue-700` |
| Create CSR | `/csr/new` | `border border-emerald-200 bg-emerald-50 text-emerald-700` |
| Create Waybill | `/waybills/new` | `border border-orange-200 bg-orange-50 text-orange-700` |

  Each passes `state: projectState` —  `{ projectId, projectCode, projectName, clientId, clientName }` — for prefill on the creation pages.

- **Link Existing button:** Blue themed, opens `ProjectLinkDialog`

#### Card: "Project Stats"
- **Health indicator:** Colored dot (emerald animate-pulse for active, slate for others) + status label
- **Financial Burn bar:**
  - Progress bar: `(cash_collected / total_invoiced) * 100` width, emerald fill
  - Percentage label: Round to integer, shows "COLLECTED X%"

**Mobile** (`fixed bottom-6 right-6 md:hidden`):
- FAB button (FileText icon or X icon to close)
- Popup menu with same quick actions + Link Existing button

---

### SECTION: ProjectLinkDialog

**Component:** `ProjectLinkDialog` — `src/components/project/detail/ProjectLinkDialog.tsx`

**Overlay modal** (fixed, z-[999], full backdrop):

| Field | Control | Notes |
|-------|---------|-------|
| Document Type | 2x2 grid of buttons | Invoice, Quotation, CSR, Waybill — `linkType` state |
| Document Number | Text input with context-aware placeholder | `linkDocId` state, Enter key triggers link |
| Error display | Alert icon + message | Only shown if `linkError` is non-empty |

**Buttons:** Cancel (closes dialog), Link Document (triggers `handleLink`)

#### Link logic (handleLink in ProjectDetail.tsx, lines ~120–160):

1. **Validate:** `linkDocId.trim()` must be non-empty
2. **Query:** Supabase for matching document by number (`ILKE` fuzzy match)
3. **If document belongs to another project:** Opens `confirmingReassign` dialog
4. **On link execution (`executeLink`, lines ~161–220):**
   - Checks for client mismatch via `isClientMismatch()` — shows error if mismatch
   - For invoices/quotations: fetches old data before update for audit diff
   - Updates document's `project_id` to current project
   - **Audit trail:**
     - `recordProjectLinkedActivity(...)` — LINKED event on project
     - `recordAuditLog(...)` with action LINK for the linked document
   - Clears dialog, shows success toast, refreshes data

**Validation:** Client mismatch blocks the link and shows error message.

---

### SECTION: ProjectDocumentSheet

**Component:** `ProjectDocumentSheet` — `src/components/project/ProjectDocumentSheet.tsx`

**Bottom sheet** (shadcn `Sheet` with `side="bottom"`) for adding external documents to a project. Multi-step wizard:

#### Step 1: Select Type
- Shows `ProjectDocumentTypeSelector` with types: Purchase Order, Receipt, Receiving Waybill, Other
- Selecting a type advances to Step 2

#### Step 2: Import Data
- Shows `JsonImportUI` component — paste JSON extraction
- Has AI prompt text specific to document type (from `getProjectDocumentPrompt()`)
- "Preview" button parses JSON and advances to Step 3
- Error handling for invalid JSON

#### Step 3: Review & Save
- Shows `ProjectDocumentStep3Review` with type-specific form
- For Purchase Orders: items table (description, quantity, unit, unit price, amount) + VAT/WHT + total
- For Receipts: amount, VAT, WHT, payment method
- For Receiving Waybills: items (description, quantity, unit, condition) + received_by
- For Other: title, description, notes

**Save behavior:**
1. Builds data from form via `buildDataFromForm(type, form)`
2. Inserts into `project_documents` table
3. Calls `recordProjectDocumentAdded(projectId, docId, docType)` — DOCUMENT_ADDED audit event
4. On success: closes sheet, refreshes project data

---

## 4. State Summary (ProjectDetail.tsx local state)

| State Variable | Type | Initial | Purpose |
|---------------|------|---------|---------|
| `editing` | `boolean` | `false` | Toggle edit mode in header |
| `saving` | `boolean` | `false` | Save in progress |
| `showLink` | `boolean` | `false` | Show Link Existing dialog |
| `showProjectDocumentSheet` | `boolean` | `false` | Show Add External File sheet |
| `projectDocumentToDelete` | `string \| null` | `null` | External document pending deletion |
| `linkDocId` | `string` | `''` | Document number for linking |
| `linkType` | `'invoice' \| 'csr' \| 'quotation' \| 'waybill'` | `'invoice'` | Type of document to link |
| `linking` | `boolean` | `false` | Link operation in progress |
| `linkError` | `string` | `''` | Error message for link dialog |
| `confirmingReassign` | `boolean` | `false` | Confirm reassign dialog open |
| `pendingReassignData` | `any` | `null` | Document data for pending reassign |
| `editForm` | `any` | `{}` | Edit form field values |
| `actionsOpen` | `boolean` | `false` | Mobile FAB popup state |

---

## 5. Effects

| Effect | Trigger | Behavior |
|--------|---------|----------|
| Initialize editForm | `project` changes | Copies project fields into `editForm` state (lines ~77–89) |

**No beforeunload dirty tracking** — editing changes are local and not tracked for accidental navigation.

---

## 6. Validation

| Action | Validation | Error Handling |
|--------|-----------|---------------|
| Link document | `linkDocId.trim()` non-empty | `setLinkError('Enter a document number')` |
| Link document | Client mismatch check | `setLinkError(...)` with mismatch message |
| Delete external doc | None | Opens ConfirmActionDialog first |
| Edit save | None | No field validation — empty name allowed |
| Add document (project doc) | Title required for "Other" type | `feedback.error('Title required', ...)` |

---

## 7. Known Issues / Inconsistencies

| Issue | Description | File:Line |
|-------|-------------|-----------|
| `editForm` typed as `any` | The `editForm` state is typed as `any` — no type safety for edit field access | `ProjectDetail.tsx` line ~53 |
| No dirty tracking on edit | Editing fields in the header and navigating away loses unsaved changes with no warning | `ProjectDetail.tsx` |
| Edit form has no validation | Project name can be saved as empty string — no guard against blank name | `ProjectDetailHeader.tsx` ~handleSaveEdit in parent |
| Client cannot be edited after creation | There is no client field in the edit form — client is set at creation time and never changeable | `ProjectDetailHeader.tsx` |
| Financial burn bar divides by zero risk | Uses `Math.max(1, ...)` for total_invoiced to avoid division by zero, but shows 0% collected if no invoices exist | `ProjectActionRail.tsx` |
| `projectState` for quick actions uses hardcoded fields | The nav state passed to creation pages includes `projectId, projectCode, projectName, clientId, clientName` — duplicates the `ProjectPrefillState` type from `projects.ts` | `ProjectDetail.tsx` lines ~232–240 |
