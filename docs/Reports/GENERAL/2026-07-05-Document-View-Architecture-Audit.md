# Document View Subsystem — Architecture Audit

**Report Identity:** This report was written by OpenCode on 2026-07-05 via Local Runner.

---

## 1. Objective & Scope

**Objective:** Audit the Document View subsystem (`src/components/document-view/`) for design inconsistencies, theme token issues, component duplication, and PRD implementation gaps. Investigation only — no code changes produced.

**Intentionally Excluded:**
- Form/Edit pages (New/Edit invoice, waybill form, etc.)
- Layout system (`Layout.tsx`, sidebar)
- PDF rendering pipeline
- Business logic in `src/lib/Calculations.ts`
- Supabase data layer

---

## 2. Evidence-Based Findings

### F1: Dual `--bd-brand` Definition with No Dark Mode

**Files inspected:** `src/index.css:13`, `src/styles/formTheme.css:182`

**Observation:** `--bd-brand` is defined in two locations with different values:

| Source | Value | Color |
|--------|-------|-------|
| `index.css:root` | `225 75% 48%` | Blue (matches `--primary`) |
| `formTheme.css:root` | `240 56% 18%` | Dark navy |

`formTheme.css` overrides `index.css` due to load order (it's imported later in the app entry). Neither definition has a `.dark` override.

**Impact:** The Floating Download Button uses `hsl(var(--bd-brand))` for its background. In dark mode, `--bd-brand` stays at `240 56% 18%` (dark navy on `--background: 222 25% 8%`), making the FAB nearly invisible.

**PRD blind spot:** The UI/UX Consolidation PRD's Finding 3 (token sprawl) identifies unused tokens but does NOT flag the dual definition or missing dark mode for `--bd-brand`.

---

### F2: `--dv-*` Token Layer Is Redundant

**File inspected:** `src/components/document-view/shared/documentViewTheme.css` (152 lines, 78 variable definitions)

**Observation:** The `documentViewTheme.css` file defines ~70 `--dv-*` CSS variables, every one of which is a one-to-one mapping from `--bd-*` tokens:

```css
--dv-primary: hsl(var(--bd-fab-bg));
--dv-brand: hsl(var(--bd-brand));
--dv-text: hsl(var(--bd-text));
--dv-border: hsl(var(--bd-border));
--dv-surface: hsl(var(--bd-card-bg));
--dv-radius: var(--bd-radius-md);
/* ... ~65 more */
```

**Consumption:** Grepping the codebase for `var(--dv-` shows usage almost exclusively within `documentViewTheme.css` itself and `DocumentPage.module.css` (the dotted grid background at line 18 uses `var(--dv-primary)`). The per-module CSS files (InvoiceWorkspace, ViewPage modules) use `--bd-*` tokens directly, not `--dv-*`.

**Impact:** The entire `--dv-*` layer is an unnecessary abstraction that adds maintenance surface with zero benefit. Components bypass it entirely and use `--bd-*` directly. Only the dotted grid global background depends on `--dv-primary`.

**Additional side effects in `documentViewTheme.css`:**
- Line 1: External Google Fonts import (Plus Jakarta Sans, DM Serif Display, JetBrains Mono) — font loading side effect outside the component scope
- Lines 85-90: Global `html` and `body` style overrides — pollutes global scope
- Lines 93-102: `body::before` dotted grid — applies globally to all pages, not just document views

---

### F3: Floating Button Color Mismatch

**Files inspected:**
- `FloatingDownloadButton.module.css:5` → `background: hsl(var(--bd-brand))`
- `InvoiceWorkspace.module.css:413` → `background: hsl(var(--bd-brand))`
- `documentViewTheme.css:24` → `--dv-primary: hsl(var(--bd-fab-bg))`
- `formTheme.css:81-82` → `--bd-fab-bg: var(--primary)`, `--bd-fab-text: var(--primary-foreground)`

**Observation:** The FAB uses `--bd-brand` (navy), while `--dv-primary` maps to `--bd-fab-bg` → `--primary` (blue). These are different tokens producing different colors. The `--dv-primary` token was apparently intended to hold the FAB color, but the FAB's CSS was written to use `--bd-brand` directly instead.

**Both FAB implementations are duplicated:**
| Component | CSS file | Token used |
|-----------|----------|------------|
| `FloatingDownloadButton` (used by Waybill, Quotation, CSR, BOQ, RFQ) | `FloatingDownloadButton.module.css` | `--bd-brand` |
| `InvoiceWorkspace` inline `FloatingDocumentButton` with `.fab` class | `InvoiceWorkspace.module.css` `.fab` | `--bd-brand` |

Both produce identical visual output but through separate CSS files — a maintenance duplication.

---

### F4: Custom ToggleRow vs. Radix ui/switch.tsx

**Files inspected:**
- `DocumentOptionsCard.tsx:31-46` — `ToggleRow` component
- `InvoiceWorkspace.module.css:462-493` — `.optToggle`, `.optToggleKnob`
- `src/components/ui/switch.tsx` — Radix `SwitchPrimitive.Root` + `SwitchPrimitive.Thumb`

**Observation:** `DocumentOptionsCard.tsx` contains a hand-rolled `ToggleRow` component built from `<span>` elements, styled via `InvoiceWorkspace.module.css`. The app has a proper `ui/switch.tsx` using Radix's `SwitchPrimitive` with Tailwind classes and `--bd-*` tokens.

**Deficiencies of the custom toggle:**
| Aspect | Custom ToggleRow | Radix Switch (ui/switch) |
|--------|-----------------|--------------------------|
| Keyboard nav | None (no `<button>`, no `role="switch"`) | Full (Space/Enter to toggle) |
| Focus ring | None | `focus-visible:ring-2` |
| ARIA | None | `data-state`, implicit role |
| Disabled state | No styling | `data-disabled:cursor-not-allowed` |
| Size variants | Fixed | `sm` / `default` |
| Theme tokens | `--bd-brand`, `--bd-border` | `bd-brand`, `bd-border`, `bd-surface-muted`, `bd-card-bg` |

**Import dependency issue:** `DocumentOptionsCard.tsx` imports `styles from "../invoice/InvoiceWorkspace.module.css"` — creating a cross-module dependency where the shared component depends on the Invoice module's CSS. This cross-contamination is noted in the PRD's Finding 9 (mobile form primitives) but the toggle import pattern is a separate instance of the same problem.

---

### F5: QuotationViewPage Uses Inline Styles

**File inspected:** `QuotationViewPage.tsx:78-118`

**Observation:** The Attachments section in `QuotationViewPage.tsx` uses inline `style={}` objects duplicating the card styling pattern:

```tsx
style={{
  background: "hsl(var(--bd-surface))",
  borderRadius: 8,
  border: "1px solid hsl(var(--bd-border))",
  overflow: "hidden",
  boxShadow: "var(--bd-shadow-md)",
}}
```

The same card pattern is defined in `InvoiceWorkspace.module.css` (`.card` class) and in each module's CSS module files (duplicated 6×). The inline styles bypass CSS module scoping and create a maintenance path that's invisible to grep-based CSS audits.

---

### F6: InvoiceWorkspace Architecture Is an Outlier

**Files inspected:**
- `InvoiceWorkspace.tsx` (162 lines, imports `FloatingDocumentButton` directly)
- `WaybillViewPage.tsx` (46 lines, simpler composition)
- `BoqViewPage.tsx`, `CsrViewPage.tsx`, `RfqViewPage.tsx` (all follow same pattern as Waybill)
- `QuotationViewPage.tsx` (123 lines, uses `DocumentOptionsCard` like Invoice but different layout)

**Observation:** `InvoiceWorkspace.tsx` is the only View component that:
1. Wraps everything in a `<DocumentPage>` wrapper (others are composed at the page level)
2. Uses `FloatingDocumentButton` directly with its own CSS class
3. Has a dedicated top nav (`InvoiceTopNav`), action row (`InvoiceActionRow`), document card (`InvoiceDocumentCard`), and operational sections
4. Is named `InvoiceWorkspace` instead of `InvoiceViewPage`

Other views (Waybill, BOQ, CSR, RFQ) follow a simpler pattern — a `<div className={styles.stack}>` with summary strip + actions + preview section. The Quotation view is in-between: it uses `DocumentOptionsCard` and `BankDetailsCard` but assembles them with inline `gap` style.

**Impact:** Adding a new feature to the View layer requires understanding two different composition patterns.

---

### F7: Per-Module CSS Module Duplication

**File inspection:** The PRD Finding 2 identifies 4 CSS Module pattern files duplicated across 6 modules:
- `{Type}ViewPage.module.css`
- `{Type}SummaryStrip.module.css`
- `{Type}HeroMeta.module.css`
- `{Type}DocumentPreview.module.css`

**Verification:** Grep confirms these files contain near-identical layout rules differentiated by module name prefixes. The `.workspace`, `.scrollBody`, `.sectionHeader` classes in each module's CSS are functionally identical.

**Impact:** A layout change to the dotted grid (`workspace::before`) or scroll body padding requires editing 5 CSS files (InvoiceWorkspace.module.css + 4 ViewPage modules). The Quotation view lacks a CSS module entirely — it uses inline styles plus imports from shared components.

---

### F8: PRD Implementation Status

**PRD file:** `docs/prd/ui-ux-consolidation/`

| Recommendation | Status | Notes |
|---------------|--------|-------|
| R1: Unify New/Edit pages (P0) | ❌ Not implemented | New/Edit pairs still exist for all 6 modules |
| R2: Consolidate CSS patterns (P1) | ❌ Not implemented | 6 copies of each pattern file still exist |
| R3: Audit/prune tokens (P1) | ❌ Not implemented | Dead `--bd-*` tokens remain, dual `--bd-brand` still present |
| R4: Remove App.css (P2) | ❌ Not implemented | `src/App.css` still exists and is imported |
| R5: Resolve sidebar (P1) | ❌ Not implemented | Two sidebar implementations coexist |
| R6: Create column hooks (P2) | ❌ Not implemented | Only `useInvoiceColumns` exists |
| R7: Extract form primitives (P2) | ❌ Not implemented | `formTheme.css` still under `invoice/mobile/` |
| R8: Standardize portals (P3) | ❌ Not implemented | `document.body.appendChild` still in use |
| R9: Audit SortableLineItem (P3) | ❌ Not implemented | Component still in shared location |

**Conclusion:** None of the 9 PRD recommendations have been implemented as of this audit date. The PRD remains in Draft status.

---

### F9: PRD Blind Spots (Issues Not Documented)

The following issues were discovered during this audit that are NOT covered by the existing PRD:

| Issue | Location | Severity | Recommendation |
|-------|----------|----------|---------------|
| Dual `--bd-brand` with no dark mode | `index.css:13` vs `formTheme.css:182` | **High** | Reconcile to single definition, add `.dark` override |
| Redundant `--dv-*` token layer | `documentViewTheme.css` | **Medium** | Remove or replace with direct `--bd-*` usage |
| Custom ToggleRow vs Radix `ui/switch` | `DocumentOptionsCard.tsx:31-46` | **Medium** | Replace with `ui/switch.tsx` for accessibility |
| FAB color mismatch (`--bd-brand` vs `--dv-primary`) | Multiple files | **Low** | Align FAB color token to a single source |
| InvoiceWorkspace architecture outlier | `InvoiceWorkspace.tsx` | **Low** | Align with ViewPage pattern or rename |
| QuotationViewPage inline styles | `QuotationViewPage.tsx:78-118` | **Low** | Extract to CSS module or shared component |
| Cross-module CSS import in shared component | `DocumentOptionsCard.tsx:3` | **Medium** | Import from shared CSS, not `invoice/` module |

---

### F10: Pre-Existing Workspace Changes

`git status` shows 12 modified files that are NOT related to this audit:

```
src/components/document-view/invoice/sections/AdvanceInvoicesCard.tsx
src/components/document-view/invoice/sections/PaymentHistoryCard.tsx
src/components/pdf-new/industryAdapter.ts
src/components/waybill/ClassicTemplate.tsx
src/components/waybill/EvergreenTemplate.tsx
src/components/waybill/MinimalTemplate.tsx
src/components/waybill/ThermalTemplate.tsx
src/domain/waybill/engine/assembly.ts
src/domain/waybill/engine/resolvers/branding.ts
src/domain/waybill/engine/resolvers/parties.ts
src/domain/waybill/engine/types.ts
src/pages/ViewWaybill.tsx
```

These appear to be waybill engine/PDF template changes that were in the working directory before this session began. They were not modified by this audit.

---

## 3. Theme Token Resolution Chain

```
index.css :root          ─── shadcn defaults (--primary, --background, etc.)
    │                        ┌── --bd-brand: 225 75% 48%
    │                        └── --bd-surface: var(--card)
    │
    ▼
formTheme.css :root       ─── BigDrops --bd-* bridge tokens
    │                        ┌── --bd-brand: 240 56% 18%  ← OVERRIDES index.css
    │                        ├── --bd-fab-bg: var(--primary)
    │                        ├── --bd-fab-text: var(--primary-foreground)
    │                        └── --bd-surface: var(--card)
    │
    ▼
documentViewTheme.css     ─── Legacy --dv-* mappings
    │                        ┌── --dv-primary: hsl(var(--bd-fab-bg))  ← --primary (blue)
    │                        ├── --dv-brand: hsl(var(--bd-brand))     ← navy
    │                        └── --dv-surface: hsl(var(--bd-card-bg))
    │
    ▼
Component CSS Modules     ─── Use --bd-* tokens directly
                             ┌── FloatingDownloadButton: hsl(var(--bd-brand))
                             ├── InvoiceWorkspace.fab: hsl(var(--bd-brand))
                             └── DocumentPage dotted grid: var(--dv-primary)
```

**Key insight:** The chain has 4 layers where 2 would suffice (`index.css` + component CSS). The `formTheme.css` bridge layer is necessary for theme switching, but the `documentViewTheme.css` layer is entirely redundant for current component usage.

---

## 4. Risks & Limitations

1. **Dark mode is untested.** The `--bd-brand` token has no dark mode value. Other `formTheme.css` tokens (`--bd-accent`, `--bd-feedback-*`, `--bd-status-*`) also lack dark mode definitions. If dark mode is enabled, many surfaces may have incorrect colors.

2. **The `--dv-*` layer creates a false dependency.** If a future engineer reads `documentViewTheme.css` and assumes `--dv-*` tokens are the canonical view layer, they might add new ones instead of using `--bd-*` directly — worsening the abstraction debt.

3. **CSR form is a separate codebase.** `CsrFormScreen.tsx` (861 lines) uses a completely different form pattern than `SharedDocumentForm`, as noted in the PRD's D1 finding. This means CSR-specific bugs don't benefit from fixes to the shared form pipeline.

4. **No verification of PRD recommendations attempted.** The `bun run build` command is excluded by policy (RAM constraint). The PRD's success criteria (code size reduction, no visual regressions) cannot be verified without a build.

---

## 5. Verification

- `git status` run before and after — confirmed no application source files were modified by this audit
- All findings are based on code reading and grep searches, not runtime behavior
- The 12 pre-existing dirty files in the workspace are unrelated (waybill engine changes)

---

## 6. Deferred Work

- **Runtime theme inspection:** Open the app in a browser, toggle dark mode, and visually verify FAB colors, toggle styles, and dotted grid contrast. This was not possible in a read-only investigation.
- **Dead token quantification:** A systematic grep of every `--bd-*` token across all source files to produce a precise count of unused tokens vs. the PRD's ~30% estimate.
- **PRD migration cost estimate:** Person-day estimates for each of the 9 PRD recommendations based on actual file dependencies.
