# Export & Lifetime Data Hub — Stage 1 Foundation Implementation

## 🎯 Objective
Implement the core type-safe contracts, touch-optimized accordion row rendering elements, and the responsive dashboard layout shell for the centralized Export & Lifetime Data Hub, integrating full parametric filter context inheritance.

## ✅ Deliverables

### 1. **Architectural Types** (`src/types/exportHub.ts`)
- ✓ `ExportFormat` — 4 exhaustive export format types (PDF_LEDGER, CSV_SUMMARY, CSV_FLATTENED_LINE_ITEMS, JSON_RAW)
- ✓ `ExportModuleDomain` — 9 operational document domains (INVOICES, QUOTATIONS, WAYBILLS, PROJECTS, RFQS, BOQS, PRICE_HISTORY, CLIENTS, CSR)
- ✓ `InheritedExportContext` — Filter context with no pagination offsets, preserving search tokens, date/amount ranges, sort state
- ✓ `ExportCardRegistryItem` — Registry entry metadata with permission requirements
- ✓ `ExportProcessingState` — Per-operation async lifecycle tracking
- ✓ `ExportOperationRequest` — Backend pipeline request payload
- ✓ `ExportOperationResponse` — Download response with signed URLs and metadata

**Type Safety:** No `any` fallbacks. All types are exhaustive and discriminated unions where applicable.

---

### 2. **Interactive Dropdown Component** (`src/components/export/ExportDropdownRow.tsx`)
- ✓ Touch-optimized 44px minimum hitbox for all interactive elements
- ✓ Pure SVG vector icons (FileText, Table, FileJson, ChevronDown, Download from lucide-react)
- ✓ Zero text emojis — semantic color coding instead
- ✓ Native Tailwind hardware-accelerated animations (transform, opacity, max-height)
- ✓ Responsive dark mode support (slate color palette)
- ✓ Per-format icon mapping with semantic colors:
  - PDF_LEDGER → FileText (red-500)
  - CSV_* → Table (emerald-500)
  - JSON_RAW → FileJson (amber-500)
- ✓ Accordion toggle with smooth ChevronDown rotation
- ✓ Disabled state management during processing

**Accessibility:** All buttons meet WCAG 2.2 minimum touch target size (44x44px).

---

### 3. **Main Dashboard Hub View** (`src/pages/LifetimeDataHub.tsx`)
- ✓ Central viewport interface with sticky header navigation
- ✓ Parametric filter context inheritance from active module views
- ✓ Per-card localized processing states (non-blocking)
- ✓ All 9 system domains with exhaustive format support
- ✓ Filter synchronization meta banner showing:
  - Active criteria indicator
  - Matched population count
  - Query scope isolation notice
- ✓ Responsive layout (max-w-xl centered, mobile-first)
- ✓ Dark mode support with gradient backgrounds
- ✓ Back navigation with touch-safe button

**Features:**
- Accordion grid of all 9 export domains
- Per-domain permission requirements
- Format-specific subtitles and descriptions
- Inherited context passed through to export pipeline

---

## 📋 Export Registry (9 Domains)

| Domain | Title | Formats | Permission |
|--------|-------|---------|-----------|
| INVOICES | Invoices Ledger | PDF, CSV Summary, CSV Flattened, JSON | read:sales |
| QUOTATIONS | Quotations & Estimates | PDF, CSV Summary, CSV Flattened, JSON | read:sales |
| WAYBILLS | Waybills / Delivery Notes | CSV Summary, JSON | read:logistics |
| PROJECTS | Projects Matrix | CSV Summary, JSON | read:projects |
| RFQS | Requests for Quotation | CSV Summary, JSON | read:procurement |
| BOQS | Bills of Quantities | CSV Summary, CSV Flattened, JSON | read:engineering |
| PRICE_HISTORY | Price History Ledger | CSV Summary, JSON | read:analytics |
| CLIENTS | Clients Directory | CSV Summary, JSON | read:clients |
| CSR | Client Service Records | CSV Summary, JSON | read:support |

---

## 🔧 Technical Specifications

### Type Safety
- ✓ No `any` types
- ✓ Exhaustive discriminated unions
- ✓ Strict null checks enabled
- ✓ Full TypeScript compilation validation

### Component Architecture
- ✓ React 18+ functional components with hooks
- ✓ Composition-based (ExportDropdownRow as reusable unit)
- ✓ Localized state management (useState for processing flags)
- ✓ Prop-based configuration (no global state coupling)

### Styling
- ✓ Tailwind CSS utility-first (v3/v4 compatible)
- ✓ Dark mode support via `dark:` prefix
- ✓ Hardware-accelerated animations (transform, opacity)
- ✓ Responsive breakpoints (mobile-first)
- ✓ Semantic color palette (slate, red, emerald, amber, sky)

### Accessibility
- ✓ WCAG 2.2 compliant touch targets (44x44px minimum)
- ✓ Semantic HTML (button, header, div with roles)
- ✓ Keyboard navigation support
- ✓ Color contrast ratios meet AA standards
- ✓ Icon + text labels (no icon-only buttons)

---

## 🚀 Stage 2 Integration Points

The following are placeholders for Stage 2 backend pipeline integration:

1. **Export Service Integration** (LifetimeDataHub.tsx:145-155)
   ```typescript
   // Replace placeholder with:
   const response = await exportService.executeExport({
     domain,
     format,
     context: inheritedContext,
   });
   window.location.href = response.downloadUrl;
   ```

2. **Error Handling & Notifications**
   - Add toast notifications for export success/failure
   - Implement retry logic with exponential backoff
   - Track export history and analytics

3. **Batch Operations**
   - Multi-domain export selection
   - Scheduled exports
   - Export templates

4. **Real-time Progress**
   - WebSocket updates for large exports
   - Progress bar UI component
   - Estimated time remaining

---

## 📁 File Structure

```
src/
├── types/
│   └── exportHub.ts                    (NEW - 130 lines)
├── components/
│   └── export/
│       └── ExportDropdownRow.tsx       (NEW - 110 lines)
└── pages/
    └── LifetimeDataHub.tsx             (NEW - 220 lines)
```

---

## ✨ Compilation Status

```bash
✓ src/types/exportHub.ts — No diagnostics
✓ src/components/export/ExportDropdownRow.tsx — No diagnostics
✓ src/pages/LifetimeDataHub.tsx — No diagnostics
```

All files pass TypeScript strict mode compilation with zero errors.

---

## 🎨 Design Tokens

### Colors
- **Primary Slate:** slate-50, slate-100, slate-200, slate-300, slate-400, slate-500, slate-700, slate-800, slate-900, slate-950
- **Semantic:** red-500 (PDF), emerald-500 (CSV), amber-500 (JSON), sky-400 (accent)
- **Dark Mode:** Automatic via `dark:` prefix

### Spacing
- Header height: 56px (h-14)
- Row height: 48px (h-12)
- Minimum touch target: 44px
- Card margin: 12px (mb-3)
- Padding: 16px (px-4)

### Typography
- Header: text-sm font-bold
- Title: text-sm font-semibold
- Subtitle: text-xs text-slate-500
- Label: text-xs font-medium

### Animations
- Duration: 200ms (duration-200)
- Easing: ease-in-out
- Properties: transform, opacity, max-height, colors

---

## 🔐 Permission Model

Each export domain requires a specific permission:
- `read:sales` — Invoices, Quotations
- `read:logistics` — Waybills
- `read:projects` — Projects
- `read:procurement` — RFQs
- `read:engineering` — BOQs
- `read:analytics` — Price History
- `read:clients` — Clients Directory
- `read:support` — Client Service Records

**Stage 2:** Implement permission checks in backend export pipeline.

---

## 📝 Usage Example

```typescript
import { LifetimeDataHub } from './pages/LifetimeDataHub';
import { InheritedExportContext } from './types/exportHub';

const context: InheritedExportContext = {
  clientId: 'client-123',
  statuses: ['PAID', 'PENDING'],
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  amountRange: { min: 1000, max: 50000 },
  searchTokens: ['invoice', 'urgent'],
  sortBy: 'date',
  sortDirection: 'desc',
};

<LifetimeDataHub
  inheritedContext={context}
  onNavigateBack={() => navigate(-1)}
  matchingRecordsCount={1247}
/>
```

---

## 🎓 Skills Applied

- **typescript-advanced-types** — Discriminated unions, exhaustive type checking
- **vercel-react-best-practices** — Component composition, state management
- **tailwind-css-patterns** — Responsive design, dark mode, animations
- **accessibility** — WCAG 2.2 compliance, touch targets, semantic HTML
- **frontend-design** — Color palette, typography, spacing, motion
- **nodejs-backend-patterns** — Type-safe API contracts (Stage 2)

---

**Status:** ✅ Stage 1 Foundation Complete — Ready for Stage 2 Backend Integration
