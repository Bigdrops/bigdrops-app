# ClientDetail — Full Page Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/pages/ClientDetail.tsx`
**Subcomponents:**
- `ClientActionHeader` — `src/components/client/workspace/ClientActionHeader.tsx`
- `ClientOverviewTab` — `src/components/client/workspace/ClientOverviewTab.tsx`
- `ClientProjectsTab` — `src/components/client/workspace/ClientProjectsTab.tsx`
- `ClientDocumentsTab` — `src/components/client/workspace/ClientDocumentsTab.tsx`
**Domain types:** `src/domain/clientWorkspace.ts`
**DB migration:** `supabase/migrations/20260520090000_core_tables.sql`

---

## 1. Page Structure Overview

The page is a tabbed workspace inside `<Layout title={client.name || 'Client Workspace'} hidePageHeader>`. A sticky `ClientActionHeader` sits at the top, followed by a horizontal tab bar and tab content. Data is lazy-loaded per tab using a `requestId` pattern to discard stale responses.

**Route:** `/clients/:id` (inferred, not confirmed — not found in `AppShell.tsx` scan)

**Data flow:** 
- Overview tab loads on mount via `loadOverview()` in a `useEffect`
- Projects, Quotations, CSRs, Waybills tabs load lazily when first selected

**Stale request protection:** Each `load*` function increments a `requestId` ref and checks it before applying state — if a new request has been started, the old response is discarded.

---

## 2. Tab System

| Tab | Value | Load Strategy | Component |
|-----|-------|---------------|-----------|
| Overview | `overview` | On mount (always loaded first) | `ClientOverviewTab` |
| Projects | `projects` | Lazy — loads on first tab switch | `ClientProjectsTab` |
| Invoices | `invoices` | Pre-loaded by overview (passed from data) | `ClientDocumentsTab` |
| Quotations | `quotations` | Lazy — loads on first tab switch | `ClientDocumentsTab` |
| CSRs | `csrs` | Lazy — loads on first tab switch | `ClientDocumentsTab` |
| Waybills | `waybills` | Lazy — loads on first tab switch | `ClientDocumentsTab` |

**Tab bar:** `TabsList` with `rounded-none border-b border-border bg-transparent` styling, overflowing horizontally (`overflow-x-auto`), each trigger has a bottom-border indicator (`border-b-2 border-transparent data-[state=active]:border-black`).

---

## 3. Data Loading

### loadOverview (mount + id change)

**10 parallel queries:**

| Query | Table | Select | Filter | Limit |
|-------|-------|--------|--------|-------|
| Client | `clients` | `*` | `.eq('id', id).single()` | 1 |
| Invoices | `invoices` | `id, invoice_number, invoice_title, status, total, issue_date, due_date, document_type, custom_fields` | `.eq('client_id', id).is('archived_at', null).order('issue_date', false)` | all |
| Quotation count | `quotations` | `id` (count only) | `.eq('client_id', id)` | exact |
| CSR count | `csrs` | `id` (count only) | `.eq('client_id', id)` | exact |
| Waybill count | `waybills` | `id` (count only) | `.eq('client_id', id)` | exact |
| Project count | `projects` | `id` (count only) | `.eq('client_id', id)` | exact |
| Recent quotations | `quotations` | `id, quotation_number, status, total, issue_date` | `.eq('client_id', id).order('issue_date', false)` | 10 |
| Recent CSRs | `csrs` | `id, csr_number, title, status, created_at, date` | `.eq('client_id', id).order('created_at', false)` | 10 |
| Recent Waybills | `waybills` | `id, waybill_number, status, date, created_at, type` | `.eq('client_id', id).order('created_at', false)` | 10 |
| Recent Projects | `projects` | `id, name, project_code, status, start_date` | `.eq('client_id', id).order('start_date', false)` | 10 |

**Secondary query:** For invoice IDs returned, a second query fetches `invoice_financials_v` (`.select('id, balance_due, computed_status, cash_received').in('id', invoiceIds)`) to enrich each invoice.

**Activity merging:** `mergeActivity()` in `clientWorkspace.ts` merges invoices, quotations, CSRs, waybills, and projects into a `UnifiedActivityEvent[]` sorted newest-first by date. Events without a date are filtered out.

**`padActivityCount()` function:** If total activity count > `activity.length`, pads with placeholder objects `{ type: 'invoice', number: null, title: null, date: '1900-01-01', status: null, total: null }` to match the total count (used for skeleton display). Placeholder `id = 'activity-placeholder-{index}'`.

### loadProjects (lazy)

**Query:** `supabase.from('projects').select('id, name, project_code, status, project_value, start_date').eq('client_id', id).order('start_date', false)`

### loadQuotations (lazy)

**Query:** `supabase.from('quotations').select('id, quotation_number, status, total, issue_date').eq('client_id', id).order('issue_date', false)`

### loadCsrs (lazy)

**Query:** `supabase.from('csrs').select('id, csr_number, title, status, created_at, date').eq('client_id', id).order('created_at', false)`

### loadWaybills (lazy)

**Query:** `supabase.from('waybills').select('id, waybill_number, status, date, created_at, type').eq('client_id', id).order('created_at', false)`

---

## 4. Section-by-Section Inventory

### SECTION: ClientActionHeader (sticky top bar)

**Component:** `ClientActionHeader` — `src/components/client/workspace/ClientActionHeader.tsx`

**Props:** `client: ClientRecord`, `onEdit: () => void`

**Layout:** `sticky top-0 z-20 border-b border-border bg-background`

#### Row 1: Navigation and Edit
| Element | Action |
|---------|--------|
| Back arrow (ArrowLeft icon) | `navigate('/clients')` |
| Title: "Client Workspace" | Static |
| Edit button (Pencil icon) | `onEdit()` — navigates to `/clients/edit/{id}` |

#### Row 2: Quick Create Buttons (horizontal scroll)
All pass `state: { clientId: client.id, clientName: client.name }` for prefill:

| Button | Path | Icon | Style |
|--------|------|------|-------|
| Invoice | `/invoices/new` | `FileText` | `rounded-full border-border bg-muted/30` |
| Quotation | `/quotations/new` | `ClipboardList` | Same |
| CSR | `/csr/new` | `Wrench` | Same |
| Waybill | `/waybills/new` | `Truck` | Same |
| Project | `/projects/new` | `FolderPlus` | Same |

Each button: `shrink-0 gap-1.5 rounded-full border-border bg-muted/30 px-3 font-bold text-foreground hover:bg-muted/50`

---

### SECTION: Overview Tab

**Component:** `ClientOverviewTab` — `src/components/client/workspace/ClientOverviewTab.tsx`

**Props:** `client: ClientRecord`, `invoices: InvoiceRecord[]`, `activity: UnifiedActivityEvent[]`

#### Sub-section: Client Info Header
| Element | Condition |
|---------|-----------|
| Category badge | Only if `client.category` is truthy |
| Client name | Always |
| Contact person | Always (shows "No contact person" fallback) |

#### Sub-section: Summary Metric Cards (4-column grid)

| Card | Value Source | Tone Class |
|------|-------------|-----------|
| Total Invoiced | `formatCurrency(summary.total)` | `default` |
| Collected | `formatCurrency(summary.collected)` | `success` (emerald) |
| Outstanding | `formatCurrency(summary.outstanding)` | `danger` (red) if > 0, else `default` |
| Activity Count | `activity.length` | `default` |

Summary computed via reducer:
```ts
{ total: sum(inv.total), collected: sum(inv.cash_received), outstanding: sum(inv.balance_due) }
```

#### Sub-section: Needs Attention (overdue invoices)
**Conditionally rendered:** Only when `overdue.length > 0`

| Element | Display |
|---------|---------|
| Header | "Needs Attention ({count})" — red themed with AlertCircle icon |
| Items | Up to 3 most recent overdue invoices |

Each overdue item shows:
- Invoice number (mono, red)
- "Past Due {amount}" (red)
- "View" button → navigates to `/invoices/{id}`

**Overdue logic** (`isPastDue` callback):
```
if balance_due <= 0 → false
if computed_status === 'overdue' → true
if no due_date → false
if due_date < today → true
else → false
```

#### Sub-section: Recent Streams (activity timeline)
| Element | Display |
|---------|---------|
| Header | "Recent Streams / All Records" |
| Items | `activity.slice(0, 10)` — up to 10 items |
| Empty state | "No recent activity" |

Each stream item shows:
- Document type icon (colored per `DOC_STYLES` config — blue=invoice, violet=quotation, emerald=csr, orange=waybill, slate=project)
- Number or title
- Date (formatted short)
- Type badge + status + total
- ChevronRight → navigates to entity detail page

**Navigation paths:**
- project → `/projects/${event.id}`
- invoice → `/invoices/${event.id}`
- quotation → `/quotations/${event.id}`
- csr → `/csr/${event.id}`
- waybill → `/waybills/${event.id}`

#### Sub-section: Contact & Account (sidebar)

| Field | Icon | Fallback |
|-------|------|----------|
| Contact Person | `User` | "None listed" |
| Phone | `Phone` | "None listed" |
| Email | `Mail` | "None listed" |
| Address | `MapPin` | "No address listed" (constructed from `[address, city, state].filter(Boolean).join(', ')`) |

**Each contact field:**
- Icon in rounded square with shadow
- Label (uppercase, 10px)
- Value (13px bold)

---

### SECTION: Projects Tab

**Component:** `ClientProjectsTab` — `src/components/client/workspace/ClientProjectsTab.tsx`

**Props:** `projects: ProjectRecord[]`

**Empty state:** Centered FolderKanban icon + "No active projects" + hint text

**Project cards:** Grid of cards, each with:
- Project code (mono, uppercase, 10px) — fallback "PROJ-XXX"
- Project name (18px, black weight) — blue hover underline
- Status badge — color-coded per `PROJECT_STATUS_STYLES`:
  - active → emerald
  - completed → slate
  - on_hold → amber
  - cancelled → red
- Value display (small icon + formatted currency)
- Start date (small icon + formatted date)
- ChevronRight arrow (animated on hover)
- Click → navigates to `/projects/${project.id}`

**Status fallback:** `PROJECT_STATUS_STYLES[project.status] || PROJECT_STATUS_STYLES.active`

---

### SECTION: Invoices Tab

**Component:** `ClientDocumentsTab` with `type="invoice"`

Data: `invoices` from overview load, mapped: `{ ...inv, number: inv.invoice_number, title: inv.invoice_title }`

---

### SECTION: Quotations Tab

**Component:** `ClientDocumentsTab` with `type="quotation"`

Data: Lazy-loaded, mapped: `{ ...q, number: q.quotation_number }`

---

### SECTION: CSRs Tab

**Component:** `ClientDocumentsTab` with `type="csr"`

Data: Lazy-loaded, mapped: `{ ...c, number: c.csr_number }`

---

### SECTION: Waybills Tab

**Component:** `ClientDocumentsTab` with `type="waybill"`

Data: Lazy-loaded, mapped: `{ ...w, number: w.waybill_number }`

---

## 5. ClientDocumentsTab (shared document list)

**Component:** `ClientDocumentsTab` — `src/components/client/workspace/ClientDocumentsTab.tsx`

**Props:** `type: 'invoice' | 'quotation' | 'csr' | 'waybill'`, `documents: Document[]`

### Per-type configuration:

| Type | Icon | Label | Path | Icon Color |
|------|------|-------|------|------------|
| invoice | `FileText` | Invoices | `/invoices` | `bg-blue-600` |
| quotation | `ClipboardList` | Quotations | `/quotations` | `bg-violet-600` |
| csr | `Wrench` | CSRs | `/csr` | `bg-emerald-600` |
| waybill | `Truck` | Waybills | `/waybills` | `bg-orange-600` |

### Empty state:
- Large icon in rounded bg-muted container
- "No {label.toLowerCase()} yet"
- "Any {label.toLowerCase()} linked to this client will appear here."

### Document rows (table-like layout):
- **Icon** (colored per type, rounded-xl with shadow)
- **Number/title** (13px black weight uppercase) — hover turns blue
- **Date** (formatted short, right-aligned, 10px)
- **Status badge** — color-coded per `STATUS_VARIANTS`:
  - paid → emerald
  - unpaid → blue
  - partially_paid → amber
  - overdue → red
  - cancelled → muted
  - open → blue
  - confirmed → emerald
  - archived → zinc
  - unknown → `STATUS_VARIANTS.archived`
- **Total** (if present, 12px bold, after status)
- **ChevronRight** (animated on hover)
- Click → navigates to `${cfg.path}/${doc.id}`

---

## 6. Loading States

| State | Duration | Display |
|-------|----------|---------|
| Initial load (overview) | Until `loading.overview` is false | SkeletonCard (h-[116px]) + 2 x SkeletonRow + CenteredSpinner |
| Lazy tab load (projects/quotes/csrs/waybills) | Until tab's `loading` is false | 2 x SkeletonRow + CenteredSpinner |

**Loading condition for lazy tabs:**
```
const isLoading = loading[tab] || (tab === tabName && !loaded[tabName])
```

---

## 7. Error States

| State | Display |
|-------|---------|
| Client not found (overview error) | Red bordered box: `{overviewError || 'Client not found.'}` |
| Tab load error | Red bordered box: `{error[t]}` |
| Generic overview error | `feedback.error('Error', { description: 'Could not load client details' })` |

---

## 8. State Summary

| State Variable | Type | Initial | Purpose |
|---------------|------|---------|---------|
| `tab` | `ClientWorkspaceTab` | `'overview'` | Active tab |
| `client` | `ClientRecord \| null` | `null` | Loaded client record |
| `invoices` | `InvoiceRecord[]` | `[]` | All invoices for client |
| `quotations` | `QuotationRecord[]` | `[]` | All quotations (lazy loaded) |
| `csrs` | `CsrRecord[]` | `[]` | All CSRs (lazy loaded) |
| `waybills` | `WaybillRecord[]` | `[]` | All waybills (lazy loaded) |
| `projects` | `ProjectRecord[]` | `[]` | All projects (lazy loaded) |
| `overviewActivity` | `UnifiedActivityEvent[]` | `[]` | Merged activity timeline |
| `loading` | `{ overview, projects, invoices, quotations, csrs, waybills }` | All `true` except overview (true), rest false | Per-tab loading flags |
| `loaded` | `{ overview, projects, invoices, quotations, csrs, waybills }` | All `false` | Per-tab loaded flags (prevents re-fetch) |
| `error` | `{ overview, projects, invoices, quotations, csrs, waybills }` | All `''` | Per-tab error messages |
| `requestIds` | `Ref<{ overview, projects, invoices, quotations, csrs, waybills }>` | All `0` | Stale request detection |

---

## 9. Effects

| Effect | Trigger | Behavior |
|--------|---------|----------|
| Reset all state | `id` param changes | Clears all data, resets all loading/loaded/error flags, resets tab to 'overview' |
| Load overview | `loadOverview` (via `id`) | Fires immediately on mount/id change |
| Lazy load tab | `tab` changes + not loaded + not already loading | Calls `loadProjects()` / `loadQuotations()` / `loadCsrs()` / `loadWaybills()` |

---

## 10. DB Schema (clients table)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | Yes | `gen_random_uuid()` | PK |
| `name` | `text` | Yes | — | Display name, NOT NULL |
| `address` | `text` | Yes | — | NOT NULL |
| `phone` | `text` | No | — | Optional |
| `email` | `text` | No | — | Optional |
| `category` | `text` | No | — | Client category label |
| `notes` | `text` | No | — | Internal notes |
| `city` | `text` | No | — | For address construction |
| `state` | `text` | No | — | For address construction |
| `contact_person` | `text` | No | — | Named contact |
| `archived_at` | `timestamptz` | No | — | Soft delete |

**Note:** `name` and `address` are `NOT NULL` in the DB schema. The `ClientRecord` interface marks all fields as optional — this is a type mismatch (defined but relaxed for flexibility).

---

## 11. Known Issues / Inconsistencies

| Issue | Description | File:Line |
|-------|-------------|-----------|
| `ClientRecord` all-optional | DB has `name NOT NULL` and `address NOT NULL` but the TypeScript interface marks every field as optional (`name?: string \| null`) | `clientWorkspace.ts` lines 2–11 |
| Invoices tab doesn't have lazy loading guard | Invoices are pre-loaded by `loadOverview()` but the tab shows no loading state. It uses `ClientDocumentsTab` directly with immediate data — no error/loading guards. | `ClientDetail.tsx` line ~182 |
| `padActivityCount` placeholder data | Placeholder items with type `'invoice'` and null dates (1900-01-01) are pushed into activity list to match total count. These get rendered in the Recent Streams UI which may show garbled entries. | `ClientDetail.tsx` lines ~19–30 |
| No edit form on this page | Edit is handled by a separate page (`/clients/edit/{id}`) rather than inline editing like ProjectDetail. The pencil icon navigates away. | `ClientDetail.tsx` |
| Route not confirmed | The route for `/clients/:id` was not found in the `AppShell.tsx` routes scan — may be registered elsewhere or the page is unreachable. | `AppShell.tsx` |
