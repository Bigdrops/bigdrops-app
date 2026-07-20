# REUI Library Inspection Report

> Full inventory of the REUI component library at `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui`

---

## 1. Library Identity

| Property | Value |
|---|---|
| Package name | `reui` |
| Version | 2.0.2 |
| Location | `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui` |
| Registry path | `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\registry-reui` |
| Component count | 55 core UI primitives, 200+ variant compositions |
| In-house primitives | 17 (not from shadcn/ui) |
| Theme styles | 5 (lyra, maia, mira, nova, vega) |
| Hook count | 11 |
| Utility module count | 25 |
| Dual primitive support | Radix UI + Base UI (`@base-ui/react`) |

---

## 2. Core UI Component Inventory (55 components)

### 2.1 Layout & Structure (14 components)

| # | Component | File | Lines | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | accordion | `accordion.tsx` | ~200 | Radix Accordion | Multiple variants |
| 2 | aspect-ratio | `aspect-ratio.tsx` | ~15 | Radix Aspect Ratio | Thin wrapper |
| 3 | card | `card.tsx` | ~140 | Native HTML | Header/footer/sub-components |
| 4 | collapsible | `collapsible.tsx` | ~30 | Radix Collapsible | Thin wrapper |
| 5 | frame | `frame.tsx` | ~300 | Native HTML | **In-house** — layout framing |
| 6 | Resizable | `resizable.tsx` | ~120 | react-resizable-bars | Panel resizing |
| 7 | scroll-area | `scroll-area.tsx` | ~80 | Radix Scroll Area | Thin wrapper |
| 8 | separator | `separator.tsx` | ~25 | Radix Separator | Thin wrapper |
| 9 | sidebar | `sidebar.tsx` | ~730 | Radix Sheet/Sidebar | Full sidebar system |
| 10 | tabs | `tabs.tsx` | ~180 | Radix Tabs | Multiple variants |
| 11 | toolbar | `toolbar.tsx` | ~150 | Native HTML | **In-house** — toolbar layout |
| 12 | tree | `tree.tsx` | ~400 | @headless-tree/react | **In-house** — tree view |
| 13 | breadcrumb | `breadcrumb.tsx` | ~100 | Radix Navigation | Multiple variants |
| 14 | navigation-menu | `navigation-menu.tsx` | ~200 | Radix Navigation Menu | Multiple variants |

### 2.2 Forms & Input (16 components)

| # | Component | File | Lines | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | button | `button.tsx` | ~100 | Native HTML | CVA variants, icon slots |
| 2 | button-group | `button-group.tsx` | ~83 | Native HTML | Compound button groups |
| 3 | checkbox | `checkbox.tsx` | ~50 | Radix Checkbox | Multiple variants |
| 4 | combobox | `combobox.tsx` | ~310 | Radix Popover/Command | Search + select |
| 5 | date-picker | `date-picker.tsx` | ~200 | react-day-picker | Calendar popover |
| 6 | date-range-picker | `date-range-picker.tsx` | ~250 | react-day-picker | Range selection |
| 7 | field | `field.tsx` | ~244 | Native HTML | **In-house** — label + input + hint + error |
| 8 | form | `form.tsx` | ~167 | react-hook-form + @hookform/resolvers | Validation integration |
| 9 | input | `input.tsx` | ~40 | Native HTML | With icon slots |
| 10 | input-group | `input-group.tsx` | ~150 | Native HTML | Compound input + prefix/suffix |
| 11 | number-field | `number-field.tsx` | ~300 | Native HTML | **In-house** — numeric input |
| 12 | phone-input | `phone-input.tsx` | ~400 | libphonenumber-js | **In-house** — phone with country |
| 13 | radio-group | `radio-group.tsx` | ~80 | Radix Radio Group | Multiple variants |
| 14 | select | `select.tsx` | ~150 | Radix Select | Multiple variants |
| 15 | slider | `slider.tsx` | ~60 | Radix Slider | Multiple variants |
| 16 | switch | `switch.tsx` | ~40 | Radix Switch | Multiple variants |

### 2.3 Feedback & Overlay (12 components)

| # | Component | File | Lines | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | alert | `alert.tsx` | ~120 | Native HTML | **In-house** — alert banner |
| 2 | alert-dialog | `alert-dialog.tsx` | ~100 | Radix Alert Dialog | Multiple variants |
| 3 | dialog | `dialog.tsx` | ~120 | Radix Dialog | Multiple variants |
| 4 | drawer | `drawer.tsx` | ~100 | vaul | Bottom/side drawer |
| 5 | popover | `popover.tsx` | ~80 | Radix Popover | Multiple variants |
| 6 | sheet | `sheet.tsx` | ~100 | Radix Dialog | Side panel overlay |
| 7 | toast | `toast.tsx` | ~150 | sonner | Multiple variants |
| 8 | toaster | `toaster.tsx` | ~30 | sonner | Toast provider |
| 9 | tooltip | `tooltip.tsx` | ~60 | Radix Tooltip | Multiple variants |
| 10 | context-menu | `context-menu.tsx` | ~120 | Radix Context Menu | Right-click menu |
| 11 | dropdown-menu | `dropdown-menu.tsx` | ~150 | Radix Dropdown Menu | Multiple variants |
| 12 | hover-card | `hover-card.tsx` | ~80 | Radix Hover Card | Rich hover preview |

### 2.4 Data Display (8 components)

| # | Component | File | Lines | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | avatar | `avatar.tsx` | ~50 | Radix Avatar | Multiple variants |
| 2 | badge | `badge.tsx` | ~60 | Native HTML | **In-house** — status badges |
| 3 | data-grid | `data-grid.tsx` | ~800 | @tanstack/react-table | **In-house** — full data grid |
| 4 | empty | `empty.tsx` | ~80 | Native HTML | **In-house** — empty states |
| 5 | kanban | `kanban.tsx` | ~600 | @dnd-kit/core | **In-house** — kanban board |
| 6 | rating | `rating.tsx` | ~120 | Native HTML | **In-house** — star rating |
| 7 | table | `table.tsx` | ~100 | Native HTML | Multiple variants |
| 8 | timeline | `timeline.tsx` | ~200 | Native HTML | **In-house** — timeline view |

### 2.5 Navigation (5 components)

| # | Component | File | Lines | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | command | `command.tsx` | ~200 | cmdk | Command palette |
| 2 | pagination | `pagination.tsx` | ~80 | Native HTML | Multiple variants |
| 3 | steps | `steps.tsx` | ~150 | Native HTML | **In-house** — stepper |
| 4 | sortable | `sortable.tsx` | ~200 | @dnd-kit/sortable | **In-house** — drag-to-reorder |
| 5 | scrollspy | `scrollspy.tsx` | ~100 | Native HTML | **In-house** — scroll spy |

### 2.6 Specialized (4 components)

| # | Component | File | Lines | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | autocomplete | `autocomplete.tsx` | ~300 | cmdk + Popover | **In-house** — autocomplete |
| 2 | file-upload | `file-upload.tsx` | ~400 | Native HTML | **In-house** — file upload |
| 3 | filters | `filters.tsx` | ~300 | Native HTML | **In-house** — filter chips |
| 4 | progress | `progress.tsx` | ~40 | Radix Progress | Multiple variants |

---

## 3. In-House Primitives (17 components — not from shadcn/ui)

These are REUI's proprietary components that go beyond standard shadcn/ui:

| # | Component | Category | Key Capability |
|---|---|---|---|
| 1 | Alert | Feedback | Alert banners with variants |
| 2 | Autocomplete | Forms | Search + select with async support |
| 3 | Badge | Data Display | Status badges with dot/color variants |
| 4 | Data Grid | Data Display | Full-featured table with sorting/filtering/pagination |
| 5 | Date Selector | Forms | Calendar-based date selection |
| 6 | Filters | Specialized | Filter chip system |
| 7 | File Upload | Specialized | Drag-and-drop file upload |
| 8 | Frame | Layout | Layout framing container |
| 9 | Kanban | Data Display | Drag-and-drop kanban board |
| 10 | Number Field | Forms | Numeric input with stepper |
| 11 | Phone Input | Forms | Phone number with country code |
| 12 | Rating | Data Display | Star rating component |
| 13 | Scrollspy | Navigation | Scroll position tracking |
| 14 | Sortable | Navigation | Drag-to-reorder lists |
| 15 | Stepper | Navigation | Step-by-step wizard |
| 16 | Timeline | Data Display | Timeline visualization |
| 17 | Tree | Data Display | Hierarchical tree view |

---

## 4. Theme System (5 styles)

| Theme | Token Prefix | Color Scheme | Notes |
|---|---|---|---|
| lyra | `--lyra-*` | Light/Dark | Default theme |
| maia | `--maia-*` | Light/Dark | Warm tones |
| mira | `--mira-*` | Light/Dark | Cool tones |
| nova | `--nova-*` | Light/Dark | Vibrant |
| vega | `--vega-*` | Light/Dark | Muted |

Each theme provides:
- CSS custom properties for colors, spacing, typography
- Dark mode variant via `data-theme` attribute
- shadcn/ui compatible `--background`, `--foreground`, `--primary`, etc.
- Component-level overrides (e.g., `--button-radius`, `--card-padding`)

---

## 5. Hook Inventory (11 hooks)

| # | Hook | File | Purpose |
|---|---|---|---|
| 1 | `use-mobile` | `use-mobile.ts` | Detect mobile viewport |
| 2 | `use-media-query` | `use-media-query.ts` | Responsive breakpoint matching |
| 3 | `use-local-storage` | `use-local-storage.ts` | Persistent state |
| 4 | `use-debounce` | `use-debounce.ts` | Debounced values |
| 5 | `use-intersection` | `use-intersection.ts` | Intersection observer |
| 6 | `use-size` | `use-size.ts` | Element size tracking |
| 7 | `use-click-outside` | `use-click-outside.ts` | Outside click detection |
| 8 | `use-keyboard` | `use-keyboard.ts` | Keyboard shortcut binding |
| 9 | `use-clipboard` | `use-clipboard.ts` | Copy to clipboard |
| 10 | `use-timeout` | `use-timeout.ts` | Safe timeout |
| 11 | `use-interval` | `use-interval.ts` | Safe interval |

---

## 6. Utility Module Inventory (25 modules)

| # | Module | Purpose |
|---|---|---|
| 1 | `cn` | className merge (clsx + twMerge) |
| 2 | `sleep` | Promise-based delay |
| 3 | `generateId` | Unique ID generation |
| 4 | `groupBy` | Array grouping |
| 5 | `pick` | Object pick |
| 6 | `omit` | Object omit |
| 7 | `debounce` | Function debounce |
| 8 | `throttle` | Function throttle |
| 9 | `deepMerge` | Deep object merge |
| 10 | `getInitials` | Name → initials |
| 11 | `formatCurrency` | Currency formatting |
| 12 | `formatNumber` | Number formatting |
| 13 | `formatDate` | Date formatting |
| 14 | `formatRelative` | Relative time |
| 15 | `truncate` | String truncation |
| 16 | `slugify` | URL slug generation |
| 17 | `capitalize` | String capitalization |
| 18 | `pluralize` | Pluralization |
| 19 | `uniqueBy` | Array dedup by key |
| 20 | `sortBy` | Array sorting |
| 21 | `filterBy` | Array filtering |
| 22 | `search` | Fuzzy search |
| 23 | `validate` | Validation helpers |
| 24 | `transform` | Data transformation |
| 25 | `api` | API client helpers |

---

## 7. Dependencies (from package.json)

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@base-ui-components/react` | latest | Base UI primitives (dual support) |
| `@base-ui/react` | latest | Base UI primitives (dual support) |
| `@dnd-kit/core` | latest | Drag and drop (kanban, sortable) |
| `@dnd-kit/sortable` | latest | Sortable lists |
| `@headless-tree/react` | latest | Tree view |
| `@hookform/resolvers` | latest | Form validation resolvers |
| `@radix-ui/react-alert-dialog` | latest | Alert dialog primitive |
| `@radix-ui/react-avatar` | latest | Avatar primitive |
| `@radix-ui/react-checkbox` | latest | Checkbox primitive |
| `@radix-ui/react-collapsible` | latest | Collapsible primitive |
| `@radix-ui/react-context-menu` | latest | Context menu primitive |
| `@radix-ui/react-dialog` | latest | Dialog primitive |
| `@radix-ui/react-dropdown-menu` | latest | Dropdown menu primitive |
| `@radix-ui/react-hover-card` | latest | Hover card primitive |
| `@radix-ui/react-navigation-menu` | latest | Navigation menu primitive |
| `@radix-ui/react-popover` | latest | Popover primitive |
| `@radix-ui/react-progress` | latest | Progress primitive |
| `@radix-ui/react-radio-group` | latest | Radio group primitive |
| `@radix-ui/react-scroll-area` | latest | Scroll area primitive |
| `@radix-ui/react-select` | latest | Select primitive |
| `@radix-ui/react-separator` | latest | Separator primitive |
| `@radix-ui/react-slider` | latest | Slider primitive |
| `@radix-ui/react-slot` | latest | Slot composition |
| `@radix-ui/react-switch` | latest | Switch primitive |
| `@radix-ui/react-tabs` | latest | Tabs primitive |
| `@radix-ui/react-tooltip` | latest | Tooltip primitive |
| `@tanstack/react-table` | latest | Table/Data Grid |
| `cmdk` | latest | Command palette |
| `cva` | latest | Class variance authority |
| `libphonenumber-js` | latest | Phone number parsing |
| `motion` | latest | Animation (framer-motion successor) |
| `react-day-picker` | latest | Calendar/date picker |
| `react-hook-form` | latest | Form management |
| `react-resizable-bars` | latest | Resizable panels |
| `sonner` | latest | Toast notifications |
| `tailwind-merge` | latest | Tailwind class dedup |
| `vaul` | latest | Drawer primitive |

### Dev Dependencies (notable)

| Package | Purpose |
|---|---|
| `tailwindcss` | Styling |
| `typescript` | Type checking |
| `vitest` | Testing |

---

## 8. Variant Composition System

REUI uses a **variant composition** approach via `registry-reui/bases/components.json`. This file defines:

- **200+ named variants** — each is a pre-composed combination of primitives
- **Base variants** — minimal defaults
- **Extended variants** — additional props, styles, behaviors
- **Example variants** — documented usage patterns

Example variant categories:
- `button-variant-*` — primary, secondary, outline, ghost, destructive, link
- `button-size-*` — sm, default, lg, icon
- `dialog-variant-*` — default, fullscreen, sheet
- `sidebar-variant-*` — sidebar, floating, inset
- `tabs-variant-*` | `tabs-trigger-variant-*` — pill, underline, enclosed

---

## 9. Integration Points with BIGDROPS

### 9.1 Compatible Patterns

| Pattern | REUI | BIGDROPS | Compatibility |
|---|---|---|---|
| className merge | `cn()` (clsx + twMerge) | `cn()` (clsx + twMerge) | ✅ Identical |
| Radix primitives | Radix UI suite | Radix UI suite | ✅ Identical |
| CVA variants | `cva()` for variants | `cva()` for variants | ✅ Identical |
| Form integration | react-hook-form | react-hook-form | ✅ Identical |
| Theme tokens | CSS custom properties | CSS custom properties | ⚠️ Different prefix (`--lyra-*` vs `--bd-*`) |

### 9.2 Conflicting Patterns

| Pattern | REUI | BIGDROPS | Conflict |
|---|---|---|---|
| Animation library | `motion` (framer-motion) | **Ban on framer-motion** | ❌ Direct conflict |
| Base UI support | Dual Radix + Base UI | Radix only | ⚠️ Extra dependency |
| Toast library | sonner | goey-toast (GoeyToaster) | ⚠️ Different toast systems |
| Primitive style | `data-slot` attributes | Mixed (some `data-slot`, some not) | ⚠️ Inconsistent |
| Forward ref pattern | Modern function components | Mixed (avatar, tabs use legacy `React.forwardRef`) | ⚠️ Inconsistent |

### 9.3 Missing in BIGDROPS (REUI has, BIGDROPS doesn't)

| Component | REUI | BIGDROPS | Gap |
|---|---|---|---|
| Autocomplete | ✅ Full implementation | ❌ Only combobox with manual filtering | HIGH |
| Data Grid | ✅ Full @tanstack/react-table integration | ❌ Only basic table | HIGH |
| Kanban | ✅ Full @dnd-kit integration | ❌ Not present | HIGH |
| Timeline | ✅ Full implementation | ❌ Not present | MEDIUM |
| Tree | ✅ Full @headless-tree integration | ❌ Not present | MEDIUM |
| Stepper | ✅ Full implementation | ❌ Not present | MEDIUM |
| Sortable | ✅ Full @dnd-kit/sortable integration | ❌ Not present | MEDIUM |
| Filters | ✅ Filter chip system | ❌ Not present | MEDIUM |
| File Upload | ✅ Drag-and-drop upload | ❌ Not present | MEDIUM |
| Rating | ✅ Star rating | ❌ Not present | LOW |
| Scrollspy | ✅ Scroll tracking | ❌ Not present | LOW |
| Number Field | ✅ Numeric input with stepper | ⚠️ numeric-input.tsx (basic) | LOW |
| Phone Input | ✅ Full with country codes | ❌ Not present | LOW |
| Frame | ✅ Layout framing | ❌ Not present | LOW |
| Toolbar | ✅ Toolbar layout | ❌ Not present | LOW |

---

## 10. Assessment Summary

### Strengths
- **Comprehensive component library** — 55 primitives covering all common UI needs
- **Variant composition system** — 200+ pre-composed variants reduce development time
- **Dual primitive support** — Radix UI + Base UI provides flexibility
- **Rich in-house components** — 17 proprietary components beyond shadcn/ui
- **5 theme styles** — Multiple visual identities from one codebase
- **Utility module library** — 25 modules reduce custom utility code
- **Form integration** — Built-in react-hook-form + validation resolvers
- **Drag-and-drop** — @dnd-kit integration for kanban, sortable, filters

### Weaknesses
- **Animation dependency** — `motion` (framer-motion) conflicts with BIGDROPS ban
- **Extra dependencies** — Base UI, vaul, sonner, react-day-picker, @dnd-kit, @headless-tree
- **Theme token mismatch** — `--lyra-*` prefix vs BIGDROPS `--bd-*` prefix
- **Toast system mismatch** — sonner vs goey-toast
- **Mixed primitive style** — Some use `data-slot`, some don't

### Opportunities
- **Adopt 15 missing components** — Fill gaps in BIGDROPS UI coverage
- **Standardize token system** — Map REUI tokens to `--bd-*` prefix
- **Unify animation approach** — Replace `motion` with CSS transitions or BIGDROPS-approved alternatives
- **Leverage variant composition** — Use REUI's 200+ variants to reduce BIGDROPS custom styling

### Risks
- **Motion dependency** — Must resolve before adoption (BIGDROPS explicit ban)
- **Token migration** — Requires CSS variable remapping across all themes
- **Toast system** — Must choose one (sonner or goey-toast)
- **Bundle size** — Adding 15+ new components increases bundle
- **Maintenance** — Two component libraries increases maintenance burden

---

*Report generated: 2026-06-24*
*Source: REUI v2.0.2 at `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui`*
