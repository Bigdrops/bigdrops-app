# Screenshots — Visual Reference

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Purpose:** Visual anchor points for the inspection reports — one screenshot per key screen, with UX annotations

---

## How to Use

Each entry below has:
- **Screen**: What to capture
- **Path**: Route or component location
- **Purpose**: What the screenshot documents
- **Annotations**: Key UX observations to mark on the image

To take screenshots, use any screen capture tool (e.g. Snipping Tool, ShareX, macOS Cmd+Shift+4).  
Drop the images into this directory (`docs/prd/ui-ux-consolidation/assets/`) named per the convention below.

---

## 1. Dashboard

- **File**: `dashboard-overview.png`
- **Route**: `/dashboard`
- **What**: Full-page dashboard showing stats cards, quick tiles, recent activity
- **Annotate**:
  - Quick tile grid (Invoice, Quotation, Waybill, CSR) — primary creation path
  - No FAB present (intentional)
  - Stats cards vs summary metrics
  - Recent invoices/projects list

---

## 2. Desktop Sidebar

- **File**: `desktop-sidebar.png`
- **Route**: Any page, desktop width (≥768px)
- **What**: Left sidebar with navigation items + business context at bottom
- **Annotate**:
  - Active nav item highlight
  - Scroll behavior for overflow items
  - Missing sign-out button
  - Business context section scrolls away (not sticky)
  - No collapse/expand groups

---

## 3. Mobile Sidebar with Sign-Out

- **File**: `mobile-sidebar-with-signout.png`
- **Route**: Any page, mobile width (<768px) → tap hamburger
- **What**: Mobile drawer open, show the Sign Out button
- **Annotate**:
  - Sign Out button — no confirmation dialog
  - Missing safe-area-inset at top/bottom

---

## 4. Invoice Form (New/Edit)

- **File**: `invoice-form-annotated.png`
- **Route**: `/invoices/new`
- **What**: Full invoice creation form — client selector, line items, notes/terms
- **Annotate**:
  - SharedDocumentForm layout
  - Rich text toolbar (fixed zoom issue)
  - Line items with drag handles (check touch target size)
  - Sections collapse/expand

---

## 5. CSR Form (The Outlier)

- **File**: `csr-form.png`
- **Route**: `/csr/new`
- **What**: Full CSR creation form
- **Annotate**:
  - Different layout vs invoice — no SharedDocumentForm
  - Density — note the inline Section/TextInput/SelectField usage
  - No tab navigation
  - 861-line component — marks sections that could be extracted

---

## 6. BOQ Form (Tabbed Editor)

- **File**: `boq-form-tabbed.png`
- **Route**: `/boqs/new`
- **What**: Tabbed editor with 3 tabs (Details / Rows / Output)
- **Annotate**:
  - Side-by-side editor + preview in Rows tab
  - Technical, spreadsheet-like feel
  - Contrast with invoice form layout

---

## 7. Waybill Form (Overlay)

- **File**: `waybill-form-overlay.png`
- **Route**: `/waybills/new`
- **What**: Waybill gateway overlay → form
- **Annotate**:
  - Gateway overlay (type selection)
  - Single-page form inside overlay
  - Unique overlay pattern vs other forms

---

## 8. List Page with Filters

- **File**: `invoice-list-filters.png`
- **Route**: `/invoices`
- **What**: Invoice list page with filter tray open
- **Annotate**:
  - FilterTray slide-down animation
  - Active filter indicators
  - Per-filter clear buttons
  - Column headers — note first column not frozen

---

## 9. Mobile List View

- **File**: `mobile-invoice-list.png`
- **Route**: `/invoices`, mobile width
- **What**: Invoice list in card layout on mobile
- **Annotate**:
  - Card layout replacement for table
  - Bottom tab bar
  - FAB for create

---

## 10. Document View

- **File**: `invoice-view.png`
- **Route**: `/invoices/:id`
- **What**: Invoice detail view
- **Annotate**:
  - Shared view layer components (DocumentPartyCard, DocumentTable, etc.)
  - Consistent layout with other document views

---

## 11. Settings

- **File**: `settings-sections.png`
- **Route**: `/settings`
- **What**: Settings page showing tabbed sections
- **Annotate**:
  - Most consistent module
  - SettingsField wrapper pattern
  - Branding/Banking/Documents tabs

---

## 12. Rich Text Toolbar

- **File**: `richtext-toolbar.png`
- **Route**: `/invoices/new`
- **What**: Rich text editor with toolbar visible
- **Annotate**:
  - Wrapping behavior at high zoom (should wrap, not clip)
  - Missing input-group module usage

---

## 13. Mobile Bottom Nav

- **File**: `mobile-bottom-nav.png`
- **Route**: Any page, mobile width
- **What**: Bottom tab bar + More sheet
- **Annotate**:
  - 5 tabs shown
  - More sheet overflow content
  - Touch target sizes

---

## Future Screenshots

These should be taken after each migration phase:

| After Phase | Screenshot | What to Look For |
|-------------|-----------|------------------|
| P1 | signout-confirmation.png | AlertDialog on sign-out |
| P1 | data-grid-sticky-column.png | First column frozen in DataGrid |
| P2 | token-system-merge.png | Single :root layer in index.css |
| P3 | csr-shared-form.png | CSR using SharedDocumentForm |
| P3 | mobile-boq-form.png | BOQ functional on mobile |
