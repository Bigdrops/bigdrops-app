# UI/UX Consolidation — Codebase Inspection Report

**Date:** 2026-06-30  
**Inspector:** AI Codebase Analysis  
**Scope:** Full UI/UX architecture, component patterns, styling system, module page structure

---

## 1. Executive Summary

The BIGDROPS codebase has a **multi-layer CSS architecture** (shadcn base → `bd-*` semantic tokens → Tailwind utilities) with a **shared form shell** (`SharedDocumentForm`), a **shared document view system** (`document-view/`), and a **module-based page structure**. While well-layered architecturally, there are **redundant styling layers**, significant **business logic duplication across New/Edit page pairs**, and **token sprawl** where ~30% of semantic tokens may be unused.

---

## 2. Styling & Theme Architecture

### 2.1 CSS Layer Cake

| Layer | File(s) | Role | Health |
|---|---|---|---|
| **Base** | `src/index.css` | Tailwind directives + shadcn CSS variables + `tone-*`/`shell-surface-*` utilities, dark mode, ambient animations | ✅ Core, actively maintained |
| **Stale** | `src/App.css` | Vite boilerplate (`App-logo-spin`, `.App-header`, `.card`) | ⚠️ Stale — no active usage found |
| **Form Tokens** | `src/components/invoice/mobile/formTheme.css` | 150+ `bd-*` semantic tokens bridging shadcn → app domain, overlay tokens, status tokens, spacing/sizing/typography/shadow tokens | ✅ Active, but ~30% of tokens may be unused |
| **Doc View Theme** | `src/components/document-view/shared/documentViewTheme.css` | View-specific CSS variables | ✅ Active |
| **CSS Modules** | 40+ `*.module.css` under `document-view/*/` | Module-specific micro-styles | ⚠️ Redundant pattern files per module (see §5) |
| **Tailwind Config** | `tailwind.config.js` | Maps 50+ `bd-*` CSS vars → Tailwind color classes | ✅ Active, comprehensive |

### 2.2 Token System Overview

The design token system is organized in 3 tiers:
- **Tier 1 (shadcn base):** `--background`, `--foreground`, `--primary`, `--card`, etc. — defined in `index.css`
- **Tier 2 (bd-* semantic):** `--bd-app-bg`, `--bd-surface`, `--bd-nav-*`, `--bd-status-*`, `--bd-overlay-*` — defined in `formTheme.css`
- **Tier 3 (bd-* palette helpers):** `--bd-amber`, `--bd-indigo`, `--bd-emerald` — plain hex values in `formTheme.css`

**Cohesion:** Tier 1 values feed into Tier 2. Both dark and light modes are defined for all tokens. Tailwind config completes the bridge.

---

## 3. Component Hierarchy

### 3.1 UI Primitives (`src/components/ui/`)
34 shadcn-style components built on Radix primitives + Tailwind. All standard: Button, Input, Select, Dialog, Sheet, DropdownMenu, Table, Tooltip, Popover, Command, Badge, Avatar, etc.

### 3.2 Unlumen Design System (`src/components/unlumen-ui/`)
Only 2 components:
- `glowing-badge.tsx` — branded badge with glow effect
- `sidebar-toggle-icon.tsx` — sidebar open/close toggle icon

### 3.3 Layout System (`src/components/layout/` + `Layout.tsx`)

```
Layout.tsx (orchestrator)
├── DesktopSidebar     — fixed left nav
├── MobileSidebar      — slide-over nav (mobile)
├── MobileMoreSheet    — additional mobile actions
├── MobileSalesSheet   — sales-specific mobile panel
├── MobileBottomNav    — bottom tab bar (mobile)
├── MobilePageHeader   — top bar with back + sidebar toggle
└── main               — <Outlet /> for route content
```

Also present but **not consumed by Layout**: `src/components/ui/sidebar.tsx` (a separate shadcn sidebar primitive). This is a **dead-code risk** — it exists as a reusable primitive but Layout.tsx bypasses it in favor of its dedicated layout components.

### 3.4 Page Structure

All pages are in `src/pages/` (49 entries). Each document type follows:

```
New{Type}.tsx      → Layout + ModuleShell(SharedDocumentForm, PdfOutputSettings)
Edit{Type}.tsx     → Layout + ModuleShell(SharedDocumentForm, PdfOutputSettings)
View{Type}.tsx     → Layout + document-view/DocumentPage + module workspace/overlays
{Type}s.tsx        → Layout + FilterBar + DataTable (list/grid)
```

### 3.5 Shared Document Form (`SharedDocumentForm.tsx`)

A single unified form component with **props-driven customization**. Composed of seven sub-components:

```
FormHeader → FormLineItems → FormCommercialTerms → FormTotals → FormNotesTerms → FormFooter
                                                                  └── RichTextEditor (TipTap)
```

Lazy-loaded: `ColumnManager`, `JsonItemsImportSheet`.

### 3.6 Document View System (`src/components/document-view/`)

```
shared/ (33 files)
├── DocumentPage.tsx           — top-level page shell
├── DocumentTopNav.tsx         — back nav + actions
├── DocumentHero.tsx           — header with key info
├── DocumentPreviewShell.tsx   — preview container
├── DocumentSection.tsx        — generic section wrapper
├── DocumentActionButtons.tsx  — shared action buttons
├── DocumentStatusBadge.tsx    — status label
├── DocumentItemsTable.tsx     — items table
├── DocumentSummary.tsx        — totals section
└── ...overlays, headers, etc.

{type}/ (invoice, quotation, waybill, csr, boq, rfq)
├── {Type}Workspace.tsx        — module-specific layout
├── {Type}HeroMeta.tsx         — module-specific metadata
├── {Type}SummaryStrip.tsx     — module-specific summary
├── {Type}DocumentPreview.tsx  — module-specific preview
├── {Type}OverlayContent.tsx   — module-specific overlays
└── {Type}ViewPage.module.css
```

---

## 4. Critical Redundancies

### 4.1 Page-Level Business Logic Duplication

**`NewInvoice.tsx`** (871 lines) vs **`EditInvoice.tsx`** (848 lines) share:

- Same item/group management functions
- Same save/validation logic with minor variations
- Same `PdfOutputSettings` integration
- Same `useInvoiceColumns` hook usage

The difference is ~50 lines of loading/initialization logic. These should be unified via a `useInvoiceForm` hook or a unified `InvoiceFormPage` component.

**This pattern likely repeats across Waybill, Quotation, CSR, BOQ, and RFQ modules** — each has a New/Edit pair.

### 4.2 CSS Module Pattern File Duplication

Each document type in `document-view/` has copies of the same CSS Module file patterns:
```
{Type}ViewPage.module.css       — identical layout rules
{Type}SummaryStrip.module.css   — identical summary styling
{Type}HeroMeta.module.css       — identical meta field styling
{Type}DocumentPreview.module.css — identical preview styling
```

These should be consolidated into shared CSS Modules or re-exported from a single source.

### 4.3 RichTextEditor — Only One, Good

The single `RichTextEditor.tsx` at `src/components/RichTextEditor.tsx` is used across all modules via prop-driven customization. **No duplication found.**

---

## 5. Design Inconsistencies & Risks

| Issue | Severity | Notes |
|---|---|---|
| `App.css` contains unused Vite boilerplate | Low | ~40 lines of dead CSS |
| `ui/sidebar.tsx` exists but Layout bypasses it | Medium | 235-line primitive not used by the app's actual sidebar |
| FormToken CSS (~450 lines in `formTheme.css`) has tokens never referenced in code | Medium | `--bd-shadow-*`, `--bd-spacing-*`, `--bd-opacity-*` may be unused |
| Modals mounted outside form scope with `document.body.appendChild` | Low | Less React-idiomatic |
| `FormLineItems.tsx` has `SortableLineItem.tsx` that appears invoice-specific despite living in shared document form | Medium | Need to verify if other document types use SortableLineItem |
| `useInvoiceColumns` exists — no equivalent `useWaybillColumns`, `useQuotationColumns`, etc. | Low | Column management is only implemented for invoices |

---

## 6. Strengths & What to Preserve

- **Design token system** is well-layered and dark-mode ready — this is a solid foundation
- **SharedDocumentForm** is a good architectural decision that keeps form UI unified
- **Document view system** (`document-view/shared/`) is comprehensive and well-abstracted
- **Lazy loading** for ColumnManager and JsonItemsImportSheet
- **TipTap** consistency — single editor across all modules
- **Mobile-first** layout with separate mobile navigation components
- **Calculations.ts** single source of truth — no financial logic in view layer
- **PDFs are dumb renderers** — shaped data in, display out

---

## 7. Quick Stats

| Metric | Count |
|---|---|
| Pages (`src/pages/`) | 49 |
| UI primitives (`src/components/ui/`) | 34 |
| CSS Modules (`*.module.css`) | 40+ |
| Document-view (`shared/`) | 33 files |
| CSS token layers | 3 (shadcn → bd-* → tailwind) |
| RichTextEditor instances | 1 |
| Layout components | 7 (Layout.tsx + 6 sub-components) |
