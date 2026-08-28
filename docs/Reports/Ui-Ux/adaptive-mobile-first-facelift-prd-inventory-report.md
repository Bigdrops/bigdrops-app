# Adaptive Mobile-First UIUX Facelift PRD — Inventory Report

This report was written by Buffy on 2026-08-28 via Freebuff.

---

## Objective

Produce a factual inventory of every file inside `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/`. Identify content map, duplication, design direction, theme model alignment, platform model, and recommended reorganization. No code was modified.

---

## 1. File Inventory

The facelift PRD contains **11 files** across **3 directories**.

### 1.1 Root

| Path | Filename | Purpose | Scope | Status |
|------|----------|---------|-------|--------|
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/` | `ai-integration.md` | AI backend specification | Gateway evaluation (free-llm-gateway vs LLM-Hub), client config, 9 use cases, model selection, error handling, cost, privacy, file structure, integration points, testing checklist | **Current** — complete, well-structured |

### 1.2 Design-direction/

| Path | Filename | Purpose | Scope | Status |
|------|----------|---------|-------|--------|
| `Design-direction/` | `loading-state.md` | Loading/refresh behavior spec | Flow sequence, component anatomy, tip pool, CSS classes, JS patterns, variant summary, design recommendations | **Current** — references batch-10 wireframes as source material |

### 1.3 Design-direction/dashboard/

| Path | Filename | Purpose | Scope | Status |
|------|----------|---------|-------|--------|
| `dashboard/` | `mobile-dashboard-v2.html` | Dashboard color variant — Amber Terracotta | Full dashboard: KPIs, activity, alerts, audit, AI sheet, search, drawer, theme customizer. 1700+ lines. Light/dark toggle. | **Current** — most feature-complete mockup |
| `dashboard/` | `mobile-dashboard-v3.html` | Dashboard color variant — Ocean Teal | Same structure as v6 (minified). Light/dark toggle. | **Draft/variant** — near-duplicate of v6 |
| `dashboard/` | `mobile-dashboard-v4.html` | Dashboard color variant — Rose Gold | Same structure as v6 (minified). Light/dark toggle. | **Draft/variant** — near-duplicate of v6 |
| `dashboard/` | `mobile-dashboard-v5.html` | Dashboard color variant — Forest Green | Same structure as v6 (minified). Light/dark toggle. | **Draft/variant** — near-duplicate of v6 |
| `dashboard/` | `mobile-dashboard-v6.html` | Dashboard color variant — Slate Navy | Same structure as v6 (minified). Light/dark toggle. Theme customizer. | **Current** — identified as the base template |
| `dashboard/` | `mobile-dashboard-v7.html` | Dashboard color variant — Warm Cocoa | Same structure as v6 (minified). Light/dark toggle. | **Draft/variant** — near-duplicate of v6 |
| `dashboard/` | `form-dashboard.html` | Dashboard using form's warm amber design language | Simplified dashboard (no drawer, search, AI, theme sheets). Exposed card pattern. | **Current** — different structural variant |
| `dashboard/` | `liquid-onyx.html` | Dark-only dashboard with extractable token system | Full dashboard + form elements (inputs, selects, textareas, toggles, badges, buttons). Dark-only. Silver-on-black palette. | **Current** — different structural variant + dark-only |

### 1.4 Design-direction/form/

| Path | Filename | Purpose | Scope | Status |
|------|----------|---------|-------|--------|
| `form/` | `invoice-form-2col.html` | Invoice form with 2-column field layout | Invoice editor: line items in 2-col grid, full-width row total, exposed section cards, warm amber palette. | **Current** — form design reference |

### Total: 11 files (2 markdown, 9 HTML mockups)

---

## 2. Content Map

### What the PRD Currently Contains

| Category | Files | Coverage |
|----------|-------|----------|
| **Product/design vision** | None | No vision document exists |
| **Mobile-first principles** | None | No mobile-first guidance document |
| **Dashboard design** | 8 HTML mockups | Color palette exploration only. No structural specification document. |
| **Responsive behavior** | None | No phone/foldable/tablet/desktop responsive model |
| **Navigation/app shell** | In HTML mockups | Bottom nav, drawer, search, AI sheets visible in mockups but not specified |
| **Components** | In HTML mockups | Activity cards, alerts, audit trail, KPI cards visible but not documented |
| **Forms** | 1 HTML mockup | Invoice form with 2-col layout |
| **Tables** | None | No table design specification |
| **Documents** | None | No document view design specification |
| **Themes/design system** | Color tokens in HTML | Token systems exist in liquid-onyx and v6 customizer, but no design system spec |
| **Accessibility** | None | No accessibility specification |
| **Capacitor/native-mobile** | None | No native mobile considerations |
| **AI integration** | 1 markdown file | Complete AI spec |
| **Loading states** | 1 markdown file | Complete loading state spec |
| **Implementation/roadmap** | None | No implementation plan |
| **Research/reference material** | In loading-state.md | References batch-10 wireframes |

### Summary

The PRD is **heavily weighted toward dashboard color exploration** (8 of 11 files). It lacks specification documents for most product areas. The AI integration and loading state documents are complete and well-structured.

---

## 3. Duplication / Overlap

### 3.1 Duplicate Dashboard Mockups

**v3, v4, v5, v6, v7** are near-identical HTML files. They share:
- Same structure (app wrapper, topbar, KPI grid, activity, alerts, audit, bottom nav, FAB)
- Same JavaScript (drawer, search, AI sheet, theme customizer, hex color picker)
- Same minified CSS with only color token values changed
- Same data-content (INV-0045, QTN-0109, WB-0028)

**v2** is more feature-complete (expanded CSS, full theme sheet with reset). It appears to be the source that v3-v7 were derived from.

**form-dashboard** is structurally different — no drawer, search, AI, or theme sheets. Uses exposed card pattern instead of shadow cards.

**liquid-onyx** is structurally different — dark-only, includes form elements section, uses a richer token system (--bg-void through --bg-hover, --text-primary through --text-disabled, --accent through --accent-softer).

**Recommendation:** v3-v7 should be reduced to **1 reference file** or moved to an archive. They demonstrate that the palette is swappable but add no structural value.

### 3.2 Overlap with docs/mockups/Dashboard/

The `docs/mockups/Dashboard/` directory contains:
- `mobile-dashboard.html` — the original indigo gradient dashboard (the source of all Design-direction variants)
- `mobile-dashboard.tsx` — a React component version
- `dark-knight/` — 12 dark-themed dashboard variants (6 color themes + 4 structural + 2 more)

**Overlap:** The Design-direction/dashboard files are derived from the original `mobile-dashboard.html`. The dark-knight files in `docs/mockups/Dashboard/dark-knight/` are also dashboard mockups but live outside the PRD.

**No contradiction** — the PRD folder holds the "current direction" candidates while `docs/mockups/` holds the broader exploration archive.

### 3.3 Overlap with docs/TEMPLATES/htmltemps/wireframe-variants/

The `batch-10/` subfolder contains 10 dashboard wireframes (amra-orbit, backlight-vellum, clyde-vault, etc.) that the loading-state.md references. These are wireframe-level prototypes, not design-direction candidates.

**No overlap** — different purpose (wireframe exploration vs. design direction).

### 3.4 Relationship to docs/prd/ui-ux-consolidation/

| Aspect | Facelift PRD | Consolidation PRD |
|--------|-------------|-------------------|
| **Focus** | Product experience, visual direction, mobile-first design | Code cleanup, token replacement, architecture |
| **Status** | Early exploration, no implementation | ~30% complete, blocked on design choice |
| **Content** | Mockups, AI spec, loading states | Findings, recommendations, progress tracker, roadmap |
| **Design choice** | Testing candidates (v2-v7, liquid-onyx, form-dashboard) | Waiting for design choice (D-017 superseded) |
| **Overlap** | None — different scopes | None — different scopes |

**The two PRDs should NOT be merged.** The consolidation PRD handles the technical cleanup that must happen regardless of which design direction is chosen. The facelift PRD owns the visual/experience decisions that determine what the cleaned-up code will look like.

### 3.5 Contradictory Decisions

| Issue | Detail |
|-------|--------|
| **v2 features vs. v3-v7 features** | v2 has drawer, search, AI, theme sheets. v3-v7 are stripped-down copies. This creates inconsistency about what the "standard" dashboard mockup should contain. |
| **Theme model** | liquid-onyx is dark-only. v2-v7 and form-dashboard have light/dark toggle. The PRD does not resolve whether themes should support both modes or be single-mode. |
| **Token naming** | v2-v7 use `--ink`, `--ink-2`, `--ink-3`, `--primary`, `--secondary`. liquid-onyx uses `--text-primary`, `--text-secondary`, `--accent`, `--bg-base`. Two different naming conventions coexist. |
| **Form elements** | Only liquid-onyx includes form elements (inputs, selects, toggles, badges). Other mockups have no form references. No shared form design specification exists. |

---

## 4. Current Design Direction

### What the Documentation Says

The PRD does **not** explicitly declare a "current favorite" design. However, structural evidence suggests:

**v6 (Slate Navy)** appears to be the active base template:
- The codebase has `AppThemeManager` that applies BMW tokens (dark) and modern-minimalist tokens (light) — but this is the production code, not the PRD.
- v3-v7 were all derived from v6's structure.
- v6 includes the theme customizer sheet (hex color picker) that v3-v5 lack in expanded form.

**v2 (Amber Terracotta)** is the most feature-complete mockup:
- Expanded CSS (not minified)
- Full drawer, search, notification, AI, and theme sheets
- Theme customizer with reset functionality
- Appears to be the "reference implementation" that others were cloned from.

**liquid-onyx** represents a different design philosophy:
- Dark-only, no light mode
- Richer token system (extractable for forms)
- Chrome silver metallic palette
- Includes form elements section

**form-dashboard** represents a different structural approach:
- Exposed card pattern (border + subtle shadow instead of deep shadows)
- Section headers as prominent labels
- Simpler, no overlays/sheets

### Candidate Designs in the PRD

| Candidate | Type | Light/Dark | Feature Completeness |
|-----------|------|------------|---------------------|
| v6 (Slate Navy) | Color variant | Both | Moderate — minified |
| v2 (Amber Terracotta) | Color variant | Both | High — full JS |
| form-dashboard | Structural variant | Both | Low — no sheets |
| liquid-onyx | Dark-only + form elements | Dark only | High — full tokens |

### Conflicting Visual Directions

The PRD contains **4 distinct visual approaches** without declaring which is preferred:
1. Slate Navy (professional blue-gray)
2. Amber Terracotta (warm amber/gold)
3. Form Language (exposed cards, section headers)
4. Liquid Onyx (chrome metallic, dark-only)

No document resolves this conflict.

---

## 5. Theme Model Assessment

### Intended Architecture

The intended model is:
- **Themes are COLOR-ONLY.** A theme changes: color palette, color tokens, background colors, surface colors, border colors, text colors, accent colors, semantic colors.
- **Themes must NOT change:** layout, responsive behavior, component structure, navigation, information architecture, spacing, typography, component sizing, interaction behavior, motion behavior.

### Does the PRD Support This Model?

**Partial support.**

| Aspect | Compliant? | Evidence |
|--------|-----------|----------|
| Color-only variation | ✅ Yes | v3-v7 are identical structure with different color tokens |
| Layout不变 | ❌ No | form-dashboard and liquid-onyx have different layouts from v2-v7 |
| Typography不变 | ❌ No | form-dashboard uses Syne display font; v2-v7 use Manrope only |
| Component structure不变 | ❌ No | form-dashboard uses exposed cards; v2-v7 use shadow cards |
| Navigation不变 | ✅ Yes | All phone mockups use the same 5-tab bottom nav |

### Conflicts

1. **form-dashboard introduces a different card pattern** (exposed vs. shadow). If themes are color-only, the card pattern should be standardized.
2. **form-dashboard introduces Syne as a display font.** If typography is theme-invariant, this font choice must be resolved before theming.
3. **liquid-onyx is dark-only.** If the theme model assumes light/dark toggle per theme, liquid-onyx violates this.
4. **The dark-knight folder** (outside the PRD) contains structural variants (Monolith, Bento, Paper, Glass) that deliberately change layout — these are NOT themes, they are different information architectures.

---

## 6. Mobile-First Platform Model

### What the PRD Says

**Nothing explicit.** There is no document addressing platform-specific behavior.

### What the Mockups Show

| Platform | Coverage | Evidence |
|----------|----------|----------|
| **Phone (430px)** | ✅ All mockups | `.app { max-width: 430px; height: 100dvh }` |
| **Tablet/Desktop (≥560px)** | ⚠️ Minimal | `@media (min-width: 560px) { .app { height: 880px; margin-top: 22px; border-radius: 40px } }` — phone frame on larger screens |
| **Foldable** | ❌ None | No foldable-specific considerations |
| **Capacitor** | ⚠️ Partial | `env(safe-area-inset-bottom)` used in bottom nav padding |
| **Touch** | ⚠️ Partial | `button:active { transform: scale(.965) }` — basic touch feedback |
| **Orientation** | ❌ None | No landscape or orientation change handling |
| **Responsive/Adaptive** | ❌ None | No breakpoint system beyond the 560px phone-frame wrapper |

### Key Gap

The mockups treat tablets and desktops as "big phones" (phone frame centered on screen). There is no tablet-specific layout, no sidebar navigation for desktop, no multi-column content area for larger screens.

The `dark-knight/desktop-*.html` files (outside the PRD) contain 3 desktop layouts (sidebar, bento, split-panel) but these are not referenced by the PRD and live in `docs/mockups/Dashboard/dark-knight/`.

---

## 7. Recommended Reorganization

### Documents to Keep (As-Is)

| File | Reason |
|------|--------|
| `ai-integration.md` | Complete, well-structured, unique scope |
| `Design-direction/loading-state.md` | Complete, references external source material |

### Documents to Consolidate

| Files | Action | Reason |
|-------|--------|--------|
| v3, v4, v5, v6, v7 | **Archive** 4 of 5. Keep v6 as the canonical "color palette swap" reference. | 5 identical files with only color changes. v6 is the base. |
| v2 | **Keep** as expanded reference or merge with v6 | Most feature-complete. Could become the single reference mockup. |

### Documents to Split or Rename

| File | Action | Reason |
|------|--------|--------|
| `form-dashboard.html` | Rename to `dashboard-exposed-cards.html` | "Form Language" is misleading — it's a dashboard, not a form |
| `liquid-onyx.html` | Move to `dark-only/liquid-onyx.html` subfolder | It's dark-only and belongs in a separate category |

### Missing Documents That Should Be Created

| Document | Priority | Purpose |
|----------|----------|---------|
| `design-vision.md` | **High** | Product design vision, target audience, brand feel, design principles |
| `mobile-first-model.md` | **High** | Phone/foldable/tablet/desktop responsive model, breakpoints, adaptive behavior |
| `design-system-tokens.md` | **High** | Canonical token naming, hierarchy, light/dark mapping |
| `navigation-shell.md` | **Medium** | Bottom nav, drawer, search, AI sheet — component specification |
| `components.md` | **Medium** | KPI cards, activity rows, alerts, audit trail, reminders — component spec |
| `forms.md` | **Medium** | Invoice form, line items, field layout, validation, error states |
| `tables.md` | **Low** | Document tables, column management, sorting, mobile vs. desktop |
| `documents.md` | **Low** | Document view design (invoice, quotation, waybill, etc.) |
| `accessibility.md` | **Low** | WCAG compliance, screen reader, keyboard nav, reduced motion |
| `capacitor-native.md` | **Low** | Native mobile considerations, safe areas, status bar, splash |
| `implementation-roadmap.md` | **Medium** | Phased plan, priorities, dependencies |
| `archive/` folder | **Low** | Move superseded mockups (v3-v5, old wireframes) here |

### Recommended Final Structure

```
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/
├── design-vision.md                    # NEW — product vision & principles
├── mobile-first-model.md               # NEW — responsive/platform model
├── design-system-tokens.md             # NEW — token naming & hierarchy
├── ai-integration.md                   # KEEP — existing
├── loading-state.md                    # KEEP — existing (move to Design-direction/)
├── implementation-roadmap.md           # NEW — phased plan
├── Design-direction/
│   ├── dashboard/
│   │   ├── mobile-dashboard.html       # KEEP — v6 as canonical reference
│   │   ├── dashboard-exposed-cards.html # KEEP — form-dashboard renamed
│   │   └── archive/                    # NEW — v2-v5, v7 moved here
│   ├── dark-only/
│   │   └── liquid-onyx.html            # MOVE from dashboard/
│   └── form/
│       └── invoice-form-2col.html      # KEEP
└── assets/                             # NEW — extracted token JSON, screenshots
```

---

## 8. Relationship to the Old PRD

### Clear Separation

| Responsibility | Owning PRD |
|---------------|-----------|
| Product experience and visual direction | **Facelift PRD** (this one) |
| Mobile-first responsive model | **Facelift PRD** (this one) |
| Theme/color system design | **Facelift PRD** (this one) |
| AI integration | **Facelift PRD** (this one) |
| Loading/refresh behavior | **Facelift PRD** (this one) |
| Code cleanup (dead CSS, token replacement) | **Consolidation PRD** |
| New/Edit page unification | **Consolidation PRD** |
| CSS Module consolidation | **Consolidation PRD** |
| Architecture cleanup (portals, hooks) | **Consolidation PRD** |
| Component primitives (button-group, input-group) | **Consolidation PRD** |
| Accessibility quick wins | **Consolidation PRD** |
| Sign-out confirmation | **Consolidation PRD** |
| Design system token replacement | **Consolidation PRD** (blocked on facelift PRD choosing a design) |

### Dependency

The consolidation PRD is **blocked** on the facelift PRD making a design direction choice. Tasks UX-020 through UX-024 (token replacement) cannot proceed until the facelift PRD declares which token naming convention and color palette to use.

The facelift PRD is **not blocked** — it can continue exploration and specification while the consolidation PRD completes its non-design-dependent tasks (page unification, dead code removal, etc.).

### Do Not Merge

The two PRDs serve different purposes:
- **Facelift** = "What should it look and feel like?"
- **Consolidation** = "How do we clean up the code to get there?"

Merging them would conflate design decisions with implementation tasks and make both harder to manage.

---

## 9. Design Decision Gaps

The following decisions must be made before implementation can begin. Listed in priority order.

### P0 — Blocking

| # | Decision | Current State | Why It Blocks |
|---|----------|--------------|---------------|
| 1 | **Choose the primary dashboard design** | 4 candidates (v6, v2, form-dashboard, liquid-onyx) with different layouts, card patterns, and token systems | Every downstream decision depends on this |
| 2 | **Define the theme model** | Some mockups are color-only, some change layout/typography. Dark-only themes exist alongside light/dark toggle themes. | Token replacement (consolidation PRD) is blocked |
| 3 | **Standardize token naming** | Two conventions: `--ink/--primary` (v2-v7) vs `--text-primary/--accent` (liquid-onyx). Must pick one. | All component code will use these tokens |
| 4 | **Decide light/dark mode scope** | BMW (dark) + modern-minimalist (light) are in production. PRD mockups show different color sets. | AppThemeManager logic depends on this |

### P1 — Required Before Implementation

| # | Decision | Current State | Why It Matters |
|---|----------|--------------|----------------|
| 5 | **Define responsive breakpoints** | Only 560px breakpoint exists (phone frame). No tablet/desktop/foldable model. | Layout code cannot be written |
| 6 | **Choose typography** | Manrope (v2-v7) vs Manrope+Syne (form-dashboard) vs Manrope+DM Mono (all). Must resolve. | Theme-invariant if typography is shared |
| 7 | **Define component patterns** | Shadow cards (v2-v7) vs exposed cards (form-dashboard). Must standardize. | Component library depends on this |
| 8 | **Specify navigation model** | Bottom nav in phone mockups. Sidebar in desktop mockups (outside PRD). Drawer exists but is not specified. | Navigation code depends on this |

### P2 — Required Before Polish

| # | Decision | Current State | Why It Matters |
|---|----------|--------------|----------------|
| 9 | **Define form design system** | Only liquid-onyx has form elements. No shared form spec. | Forms are the core interaction surface |
| 10 | **Specify loading/refresh for production** | loading-state.md references wireframes, not production components | Loading states must match final design |
| 11 | **Accessibility requirements** | No a11y spec exists. `prefers-reduced-motion` in mockups is basic. | WCAG compliance must be planned |
| 12 | **Capacitor/native-mobile plan** | No native mobile considerations documented | Safe areas, status bar, splash screen need spec |

---

## Verification

- `bun run audit:load`: N/A — no code changes
- `bun run typecheck`: N/A — no code changes
- `git status`: Report file is the only intentional change

**Files inspected:** 11 (2 markdown + 9 HTML)
**Duplicate/contradictory material found:** 5 issues (v3-v7 duplication, token naming conflict, card pattern conflict, dark-only vs light/dark conflict, no responsive model)
**Recommended reorganization:** 4 moves, 6 new documents, 1 archive folder
**Application code modified:** None
