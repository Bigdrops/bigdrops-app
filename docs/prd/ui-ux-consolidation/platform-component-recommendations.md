# Platform Component Recommendations

> Final winner classification per component family with justification, source paths, and migration notes

---

## 1. Classification System

| Classification | Meaning |
|---|---|
| **🏆 BIGDROPS** | Keep BIGDROPS implementation; superior for this context |
| **🏆 REUI** | Adopt REUI implementation; superior overall |
| **🏆 React-temps** | Use React-temps pattern; superior composition reference |
| **🔀 Hybrid** | Combine strengths from multiple sources |
| **🆕 Build New** | No existing implementation; must build from scratch |

---

## 2. Component Family Recommendations

### 2.1 Form Components

#### Button Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/button.tsx` | ~120 | ⚠️ Replace |
| REUI | `components/ui/button.tsx`, `components/ui/button-group.tsx` | ~183 | **🏆 Winner** |
| React-temps | `filter-button-reference.tsx` | ~65 | Pattern reference |

**Winner:** REUI Button + ButtonGroup

**Justification:**
- REUI has ButtonGroup compound pattern (BIGDROPS lacks)
- REUI has richer variant system (CVA + 200+ compositions)
- REUI has better documentation and examples
- BIGDROPS button is functional but less flexible

**Migration path:**
1. Copy REUI `button.tsx` + `button-group.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*` via `reui-tokens.css`
3. Replace all `@/components/ui/button` imports with `@/components/reui/button`
4. Delete `src/components/ui/button.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\button.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\button.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\filter-button-reference.tsx`

---

#### Input Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/input.tsx` | ~19 | ❌ Too basic |
| REUI | `components/ui/input.tsx`, `components/ui/input-group.tsx` | ~190 | **🏆 Winner** |
| React-temps | `quick-paste-base.tsx` | ~100 | Pattern reference |

**Winner:** REUI Input + InputGroup

**Justification:**
- REUI has InputGroup compound pattern (BIGDROPS lacks)
- REUI has icon slots (prefix/suffix)
- REUI has better TypeScript support
- BIGDROPS input is too minimal (19 lines)

**Migration path:**
1. Copy REUI `input.tsx` + `input-group.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace all `@/components/ui/input` imports with `@/components/reui/input`
4. Delete `src/components/ui/input.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\input.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\input.tsx`

---

#### Textarea Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/textarea.tsx` | ~18 | **🏆 Winner** (only source) |
| REUI | N/A | N/A | — |
| React-temps | N/A | N/A | — |

**Winner:** BIGDROPS Textarea (only source)

**Justification:**
- No competing implementation exists
- BIGDROPS textarea is functional
- `--bd-*` token alignment is perfect

**Migration path:** None (keep as-is)

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\textarea.tsx`

---

#### Select Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/select.tsx` | ~120 | ⚠️ Replace |
| REUI | `components/ui/select.tsx` | ~150 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Select

**Justification:**
- REUI has richer variant system
- REUI has better documentation
- BIGDROPS select is functional but less flexible

**Migration path:**
1. Copy REUI `select.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace all `@/components/ui/select` imports with `@/components/reui/select`
4. Delete `src/components/ui/select.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\select.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\select.tsx`

---

#### Combobox Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/combobox.tsx` | ~273 | 🔀 Hybrid |
| REUI | `components/ui/combobox.tsx` | ~310 | **🏆 Winner** (marginal) |
| React-temps | N/A | N/A | — |

**Winner:** Hybrid (REUI API + BIGDROPS mobile strategy)

**Justification:**
- REUI combobox has better API design (marginal win)
- BIGDROPS combobox has superior mobile UX (Sheet on mobile via `useLayoutMode` hook)
- Hybrid approach combines best of both

**Migration path:**
1. Copy REUI `combobox.tsx` to `src/components/reui/`
2. Add `useLayoutMode` hook integration for responsive behavior
3. On mobile: use Sheet; on desktop: use Popover
4. Map `--lyra-*` tokens to `--bd-*`
5. Replace `@/components/ui/combobox` imports with `@/components/reui/combobox`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\combobox.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\combobox.tsx`

---

#### Number Field Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/numeric-input.tsx` | ~108 | ❌ Basic |
| REUI | `components/ui/number-field.tsx` | ~300 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Number Field

**Justification:**
- REUI number-field is full implementation (300 lines)
- BIGDROPS numeric-input is basic wrapper around Input
- REUI has stepper buttons, min/max, step controls

**Migration path:**
1. Copy REUI `number-field.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/numeric-input` imports with `@/components/reui/number-field`
4. Delete `src/components/ui/numeric-input.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\numeric-input.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\number-field.tsx`

---

#### Phone Input Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/phone-input.tsx` | ~400 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Phone Input (new adoption)

**Justification:**
- BIGDROPS has no phone input component
- REUI has full implementation with country codes
- Valuable for Nigerian SME phone number collection

**Migration path:**
1. Copy REUI `phone-input.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to form libraries as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\phone-input.tsx`

---

#### Autocomplete Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/autocomplete.tsx` | ~300 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Autocomplete (new adoption)

**Justification:**
- BIGDROPS has no autocomplete component
- REUI has full implementation with async search
- Different from combobox (autocomplete adds suggestion list)

**Migration path:**
1. Copy REUI `autocomplete.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to form libraries as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\autocomplete.tsx`

---

### 2.2 Feedback & Overlay Components

#### Dialog Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/dialog.tsx` | ~120 | ⚠️ Replace |
| REUI | `components/ui/dialog.tsx` | ~120 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Dialog

**Justification:**
- REUI has fullscreen and sheet variants
- REUI has better documentation
- BIGDROPS dialog is functional but less flexible

**Migration path:**
1. Copy REUI `dialog.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/dialog` imports with `@/components/reui/dialog`
4. Delete `src/components/ui/dialog.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\dialog.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\dialog.tsx`

---

#### Sheet Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/sheet.tsx` | ~142 | **🏆 Winner** |
| REUI | `components/ui/sheet.tsx` | ~100 | ⚠️ Close |
| React-temps | N/A | N/A | — |

**Winner:** BIGDROPS Sheet

**Justification:**
- BIGDROPS sheet has superior z-index management (z-[250])
- BIGDROPS sheet has Hugeicons integration
- BIGDROPS sheet has `--bd-*` token alignment
- REUI sheet is close but uses different icon system

**Migration path:** None (keep as-is)

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\sheet.tsx`

---

#### Alert Dialog Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/alert-dialog.tsx` | ~209 | **🏆 Winner** |
| REUI | `components/ui/alert-dialog.tsx` | ~100 | ⚠️ Close |
| React-temps | `Export.tsx` | ~55 | Pattern reference |

**Winner:** BIGDROPS Alert Dialog

**Justification:**
- BIGDROPS alert-dialog is more complete (209 lines vs 100)
- BIGDROPS has size prop support
- BIGDROPS has `--bd-*` token alignment
- React-temps Export.tsx shows good AlertDialog + RadioGroup composition

**Migration path:** None (keep as-is)

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\alert-dialog.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\Export.tsx`

---

#### Dropdown Menu Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/dropdown-menu.tsx` | ~268 | **🏆 Winner** |
| REUI | `components/ui/dropdown-menu.tsx` | ~150 | ⚠️ Close |
| React-temps | `Ai-selector.tsx` | ~80 | Pattern reference |

**Winner:** BIGDROPS Dropdown Menu

**Justification:**
- BIGDROPS dropdown-menu is more complete (268 lines vs 150)
- BIGDROPS has Hugeicons integration
- BIGDROPS has `data-slot` pattern
- React-temps Ai-selector.tsx shows good AI provider icon composition

**Migration path:** None (keep as-is)

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\dropdown-menu.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\Ai-selector.tsx`

---

#### Popover Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/popover.tsx` | ~87 | ⚠️ Replace |
| REUI | `components/ui/popover.tsx` | ~80 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Popover

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS popover is functional but less flexible

**Migration path:**
1. Copy REUI `popover.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/popover` imports with `@/components/reui/popover`
4. Delete `src/components/ui/popover.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\popover.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\popover.tsx`

---

#### Tooltip Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/tooltip.tsx` | ~55 | ⚠️ Replace |
| REUI | `components/ui/tooltip.tsx` | ~60 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Tooltip

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS tooltip is functional but less flexible

**Migration path:**
1. Copy REUI `tooltip.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/tooltip` imports with `@/components/reui/tooltip`
4. Delete `src/components/ui/tooltip.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\tooltip.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\tooltip.tsx`

---

#### Toast Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/toaster.tsx`, `sonner.tsx`, `toast.tsx` | ~67 | ❌ Deprecated |
| REUI | `components/ui/toast.tsx`, `components/ui/toaster.tsx` | ~180 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Toast (sonner-based)

**Justification:**
- REUI uses sonner (industry standard)
- BIGDROPS uses goey-toast (non-standard)
- BIGDROPS toast.tsx is deprecated wrapper
- sonner has better documentation and community support

**Migration path:**
1. Copy REUI `toast.tsx` + `toaster.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/toaster` imports with `@/components/reui/toaster`
4. Delete `src/components/ui/toaster.tsx`, `sonner.tsx`, `toast.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\toaster.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\toast.tsx`

---

#### Drawer Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/drawer.tsx` | ~100 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Drawer (new adoption)

**Justification:**
- BIGDROPS has no drawer component
- REUI uses vaul (lightweight, accessible)
- Drawer is useful for mobile bottom sheets

**Migration path:**
1. Copy REUI `drawer.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to component library as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\drawer.tsx`

---

#### Hover Card Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/hover-card.tsx` | ~80 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Hover Card (new adoption)

**Justification:**
- BIGDROPS has no hover card component
- REUI has full implementation
- Useful for rich hover previews

**Migration path:**
1. Copy REUI `hover-card.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to component library as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\hover-card.tsx`

---

### 2.3 Data Display Components

#### Badge Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/badge.tsx` | ~40 | ⚠️ Replace |
| REUI | `components/ui/badge.tsx` | ~60 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Badge

**Justification:**
- REUI has richer variant system
- REUI has better documentation
- BIGDROPS badge is functional but less flexible

**Migration path:**
1. Copy REUI `badge.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/badge` imports with `@/components/reui/badge`
4. Delete `src/components/ui/badge.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\badge.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\badge.tsx`

---

#### Table/Data Grid Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/table.tsx` | ~114 | ❌ Too basic |
| REUI | `components/ui/table.tsx`, `components/ui/data-grid.tsx` | ~900 | **🏆 Winner** |
| React-temps | `multi-filter.tsx` | ~200 | Pattern reference |

**Winner:** REUI Data Grid

**Justification:**
- REUI has full @tanstack/react-table integration
- BIGDROPS table is too basic (114 lines, no sorting/filtering/pagination)
- React-temps multi-filter.tsx shows excellent TanStack Table + REUI filters composition

**Migration path:**
1. Copy REUI `data-grid.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/table` imports with `@/components/reui/data-grid`
4. Delete `src/components/ui/table.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\table.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\data-grid.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\multi-filter.tsx`

---

#### Avatar Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/avatar.tsx` | ~48 | ❌ Legacy forwardRef |
| REUI | `components/ui/avatar.tsx` | ~50 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Avatar

**Justification:**
- BIGDROPS avatar uses legacy `React.forwardRef` pattern
- REUI uses modern function component pattern
- REUI has better variant system

**Migration path:**
1. Copy REUI `avatar.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/avatar` imports with `@/components/reui/avatar`
4. Delete `src/components/ui/avatar.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\avatar.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\avatar.tsx`

---

#### Kanban Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/kanban.tsx` | ~600 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Kanban (new adoption)

**Justification:**
- BIGDROPS has no kanban component
- REUI has full @dnd-kit integration
- Useful for project management workflows

**Migration path:**
1. Copy REUI `kanban.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to project management modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\kanban.tsx`

---

#### Timeline Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/timeline.tsx` | ~200 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Timeline (new adoption)

**Justification:**
- BIGDROPS has no timeline component
- REUI has full implementation
- Useful for audit trails, activity logs

**Migration path:**
1. Copy REUI `timeline.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to audit/activity modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\timeline.tsx`

---

#### Tree Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/tree.tsx` | ~400 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Tree (new adoption)

**Justification:**
- BIGDROPS has no tree component
- REUI has full @headless-tree integration
- Useful for hierarchical data display

**Migration path:**
1. Copy REUI `tree.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to hierarchical data modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\tree.tsx`

---

#### Empty State Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/empty.tsx` | ~80 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Empty State (new adoption)

**Justification:**
- BIGDROPS has no empty state component
- REUI has full implementation
- Useful for empty lists, no-data states

**Migration path:**
1. Copy REUI `empty.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to all list-based components

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\empty.tsx`

---

#### Rating Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/rating.tsx` | ~120 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Rating (new adoption)

**Justification:**
- BIGDROPS has no rating component
- REUI has full implementation
- Useful for feedback, reviews

**Migration path:**
1. Copy REUI `rating.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to feedback modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\rating.tsx`

---

### 2.4 Navigation Components

#### Tabs Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/tabs.tsx` | ~80 | ❌ Legacy forwardRef |
| REUI | `components/ui/tabs.tsx` | ~180 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Tabs

**Justification:**
- BIGDROPS tabs uses legacy `React.forwardRef` pattern
- REUI uses modern function component pattern
- REUI has richer variant system (pill, underline, enclosed)

**Migration path:**
1. Copy REUI `tabs.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/tabs` imports with `@/components/reui/tabs`
4. Delete `src/components/ui/tabs.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\tabs.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\tabs.tsx`

---

#### Accordion Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/accordion.tsx` | ~80 | ⚠️ Replace |
| REUI | `components/ui/accordion.tsx` | ~200 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Accordion

**Justification:**
- REUI has richer variant system
- REUI has better documentation
- BIGDROPS accordion is functional but less flexible

**Migration path:**
1. Copy REUI `accordion.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/accordion` imports with `@/components/reui/accordion`
4. Delete `src/components/ui/accordion.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\accordion.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\accordion.tsx`

---

#### Command Palette Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/command.tsx` | ~200 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Command (new adoption)

**Justification:**
- BIGDROPS has no command palette
- REUI has full cmdk integration
- Useful for power users, quick actions

**Migration path:**
1. Copy REUI `command.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to power user modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\command.tsx`

---

#### Navigation Menu Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/navigation-menu.tsx` | ~200 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Navigation Menu (new adoption)

**Justification:**
- BIGDROPS has no navigation menu
- REUI has full Radix Navigation Menu integration
- Useful for complex navigation structures

**Migration path:**
1. Copy REUI `navigation-menu.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to navigation modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\navigation-menu.tsx`

---

#### Context Menu Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/context-menu.tsx` | ~120 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Context Menu (new adoption)

**Justification:**
- BIGDROPS has no context menu
- REUI has full Radix Context Menu integration
- Useful for right-click actions

**Migration path:**
1. Copy REUI `context-menu.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to action modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\context-menu.tsx`

---

#### Pagination Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/pagination.tsx` | ~80 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Pagination (new adoption)

**Justification:**
- BIGDROPS has no pagination component
- REUI has full implementation
- Useful for list-based views

**Migration path:**
1. Copy REUI `pagination.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to all list-based components

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\pagination.tsx`

---

#### Sortable Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/sortable.tsx` | ~200 | **🏆 Winner** |
| React-temps | `sortable.tsx` | ~120 | Pattern reference |

**Winner:** REUI Sortable (new adoption)

**Justification:**
- BIGDROPS has no sortable component
- REUI has full @dnd-kit/sortable integration
- React-temps sortable.tsx shows good REUI sortable + badge + toast composition

**Migration path:**
1. Copy REUI `sortable.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to drag-and-drop modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\sortable.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\sortable.tsx`

---

#### Filters Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/filters.tsx` | ~300 | **🏆 Winner** |
| React-temps | `multi-filter.tsx` | ~200 | Pattern reference |

**Winner:** REUI Filters (new adoption)

**Justification:**
- BIGDROPS has no filters component
- REUI has full filter chip system
- React-temps multi-filter.tsx shows excellent TanStack Table + REUI filters composition

**Migration path:**
1. Copy REUI `filters.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to filterable list modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\filters.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\multi-filter.tsx`

---

#### Scrollspy Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/scrollspy.tsx` | ~100 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Scrollspy (new adoption)

**Justification:**
- BIGDROPS has no scrollspy component
- REUI has full implementation
- Useful for scroll-based navigation

**Migration path:**
1. Copy REUI `scrollspy.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to scroll-based navigation modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\scrollspy.tsx`

---

### 2.5 Form Control Components

#### Switch Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/switch.tsx` | ~31 | ⚠️ Replace |
| REUI | `components/ui/switch.tsx` | ~40 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Switch

**Justification:**
- REUI has better size options (sm, default)
- REUI has better variant system
- BIGDROPS switch is functional but less flexible

**Migration path:**
1. Copy REUI `switch.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/switch` imports with `@/components/reui/switch`
4. Delete `src/components/ui/switch.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\switch.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\switch.tsx`

---

#### Checkbox Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/checkbox.tsx` | ~40 | ⚠️ Replace |
| REUI | `components/ui/checkbox.tsx` | ~50 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Checkbox

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS checkbox is functional but less flexible

**Migration path:**
1. Copy REUI `checkbox.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/checkbox` imports with `@/components/reui/checkbox`
4. Delete `src/components/ui/checkbox.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\checkbox.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\checkbox.tsx`

---

#### Radio Group Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/radio-group.tsx` | ~60 | ⚠️ Replace |
| REUI | `components/ui/radio-group.tsx` | ~80 | **🏆 Winner** |
| React-temps | `Export.tsx` | ~55 | Pattern reference |

**Winner:** REUI Radio Group

**Justification:**
- REUI has better variant system
- REUI has better documentation
- React-temps Export.tsx shows good AlertDialog + RadioGroup composition

**Migration path:**
1. Copy REUI `radio-group.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/radio-group` imports with `@/components/reui/radio-group`
4. Delete `src/components/ui/radio-group.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\radio-group.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\radio-group.tsx`
- React-temps: `C:\Users\DELL\Desktop\bigdrops-app\docs\TEMPLATES\React-temps\Export.tsx`

---

#### Slider Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/slider.tsx` | ~50 | ⚠️ Replace |
| REUI | `components/ui/slider.tsx` | ~60 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Slider

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS slider is functional but less flexible

**Migration path:**
1. Copy REUI `slider.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/slider` imports with `@/components/reui/slider`
4. Delete `src/components/ui/slider.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\slider.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\slider.tsx`

---

### 2.6 Layout Components

#### Separator Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/separator.tsx` | ~26 | ⚠️ Replace |
| REUI | `components/ui/separator.tsx` | ~25 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Separator

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS separator is functional but less flexible

**Migration path:**
1. Copy REUI `separator.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/separator` imports with `@/components/reui/separator`
4. Delete `src/components/ui/separator.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\separator.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\separator.tsx`

---

#### Collapsible Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/collapsible.tsx` | ~33 | ⚠️ Replace |
| REUI | `components/ui/collapsible.tsx` | ~30 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Collapsible

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS collapsible is functional but less flexible

**Migration path:**
1. Copy REUI `collapsible.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/collapsible` imports with `@/components/reui/collapsible`
4. Delete `src/components/ui/collapsible.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\collapsible.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\collapsible.tsx`

---

#### Scroll Area Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/scroll-area.tsx` | ~40 | ⚠️ Replace |
| REUI | `components/ui/scroll-area.tsx` | ~80 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Scroll Area

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS scroll-area is functional but less flexible

**Migration path:**
1. Copy REUI `scroll-area.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/scroll-area` imports with `@/components/reui/scroll-area`
4. Delete `src/components/ui/scroll-area.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\scroll-area.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\scroll-area.tsx`

---

#### Progress Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | `src/components/ui/progress.tsx` | ~30 | ⚠️ Replace |
| REUI | `components/ui/progress.tsx` | ~40 | **🏆 Winner** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Progress

**Justification:**
- REUI has better variant system
- REUI has better documentation
- BIGDROPS progress is functional but less flexible

**Migration path:**
1. Copy REUI `progress.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Replace `@/components/ui/progress` imports with `@/components/reui/progress`
4. Delete `src/components/ui/progress.tsx`

**Source paths:**
- BIGDROPS: `C:\Users\DELL\Desktop\bigdrops-app\src\components\ui\progress.tsx`
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\progress.tsx`

---

#### Alert Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/alert.tsx` | ~120 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Alert (new adoption)

**Justification:**
- BIGDROPS has no alert component (only alert-dialog)
- REUI has full implementation
- Useful for inline alerts, notifications

**Migration path:**
1. Copy REUI `alert.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to notification modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\alert.tsx`

---

#### Resizable Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/resizable.tsx` | ~120 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Resizable (new adoption)

**Justification:**
- BIGDROPS has no resizable panel component
- REUI has full implementation
- Useful for split views, adjustable layouts

**Migration path:**
1. Copy REUI `resizable.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to layout modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\resizable.tsx`

---

#### Stepper Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/steps.tsx` | ~150 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI Stepper (new adoption)

**Justification:**
- BIGDROPS has no stepper component
- REUI has full implementation
- Useful for multi-step forms, wizards

**Migration path:**
1. Copy REUI `steps.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to wizard modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\steps.tsx`

---

#### File Upload Family

| Source | File | Lines | Classification |
|---|---|---|---|
| BIGDROPS | N/A | N/A | — |
| REUI | `components/ui/file-upload.tsx` | ~400 | **🏆 New adoption** |
| React-temps | N/A | N/A | — |

**Winner:** REUI File Upload (new adoption)

**Justification:**
- BIGDROPS has no file upload component
- REUI has full drag-and-drop implementation
- Useful for document management, attachments

**Migration path:**
1. Copy REUI `file-upload.tsx` to `src/components/reui/`
2. Map `--lyra-*` tokens to `--bd-*`
3. Add to document management modules as needed

**Source paths:**
- REUI: `C:\Users\DELL\Desktop\bgd-soft\prototypes\reui\components\ui\file-upload.tsx`

---

## 3. React-temps Pattern Recommendations

React-temps files are NOT standalone components but composition patterns. Here are the best patterns to adopt:

### 3.1 Best Composition Patterns

| Pattern | File | Key Technique | Adoption Recommendation |
|---|---|---|---|
| Responsive Dialog | `sidebar.tsx` (770 lines) | motion/react + hover context | **Adopt** — motion animations for sidebar |
| AI Provider Selector | `Ai-selector.tsx` | DropdownMenu + provider icons | **Adopt** — AI provider switching pattern |
| Multi-Filter Table | `multi-filter.tsx` | TanStack Table + REUI filters | **Adopt** — advanced filtering pattern |
| Signature Drawing | `draw-signature-base.tsx` | Canvas + motion/react | **Adopt** — signature capture pattern |
| Export Dialog | `Export.tsx` | AlertDialog + RadioGroup | **Adopt** — export format selection pattern |
| Sortable List | `sortable.tsx` | REUI sortable + badge + toast | **Adopt** — reorderable list pattern |
| Filter Button | `filter-button-reference.tsx` | ButtonGroup + DropdownMenu | **Adopt** — filter action pattern |
| Quick Paste | `quick-paste-base.tsx` | motion/react paste input | **Adopt** — clipboard paste pattern |
| Contextual AI Bar | `contextual-ai-bar.tsx` | motion/react pill switcher | **Adopt** — AI context switching pattern |
| Run Action | `run-action.tsx` | Step action | **Adopt** — step execution pattern |
| Select AI Agent | `select-ai-agent.tsx` | motion/react AI selector | **Adopt** — AI agent selection pattern |
| Dropdown Disclosure | `dropdown-disclosure-base.tsx` | motion/react model selector | **Adopt** — model selection pattern |
| Floating Disclosure | `floating-disclosure-base.tsx` | motion/react FAB | **Adopt** — floating action button pattern |
| Rich Text Form | `richtextform.tsx` | REUI input-group composition | **Adopt** — rich text input pattern |
| Sidebar Icon | `sidebaricon.tsx` | SVG morph | **Adopt** — icon morphing pattern |

### 3.2 Patterns NOT to Adopt

| Pattern | File | Reason |
|---|---|---|
| Sidebar System | `sidebar.tsx` | BIGDROPS sidebar.tsx is dead code (715 lines); REUI sidebar is better |
| Next.js Integration | `draw-signature-base.tsx` | Uses `next-themes` — incompatible with Vite-based BIGDROPS |
| Unknown Dependency | `run-action.tsx` | Imports from `./original` — unknown/unread dependency |

---

## 4. Summary Scorecard

### 4.1 Final Tally

| Classification | Count | Components |
|---|---|---|
| **🏆 BIGDROPS wins** | 4 | Sheet, Alert Dialog, Dropdown Menu, Textarea |
| **🏆 REUI wins** | 22 | Button, Input, Select, Combobox, Dialog, Popover, Tooltip, Switch, Checkbox, Radio Group, Slider, Avatar, Badge, Table/Data Grid, Tabs, Accordion, Separator, Collapsible, Scroll Area, Progress, Toast, Number Field |
| **🆕 New from REUI** | 21 | Command, Navigation Menu, Context Menu, Hover Card, Drawer, Resizable, Pagination, Alert, Data Grid, Kanban, Timeline, Tree, Stepper, Sortable, Filters, File Upload, Autocomplete, Phone Input, Rating, Scrollspy, Empty State |
| **🔀 Hybrid** | 1 | Combobox (REUI API + BIGDROPS mobile strategy) |
| **🏆 React-temps patterns** | 15 | All 15 pattern files recommended for adoption |

### 4.2 Migration Effort Estimate

| Phase | Effort | Components |
|---|---|---|
| Phase 1: Token Convergence | 2 days | Token mapping layer |
| Phase 2: Component Migration | 3 days | 22 REUI replacements |
| Phase 3: Mobile Strategy | 1 day | Responsive wrappers |
| Phase 4: Animation Resolution | 1 day | motion → CSS transitions |
| Phase 5: Icon System Mapping | 1 day | Lucide → Hugeicons adapter |
| **Total** | **8 days** | Full consolidation |

### 4.3 Expected Outcomes

| Metric | Before | After | Improvement |
|---|---|---|---|
| Component count | 31 primitives | 52 primitives | +21 new components |
| CSS token lines | 1083 (index.css + formTheme.css) | ~200 (reui-tokens.css) | -80% reduction |
| Variant count | ~10 (manual CVA) | 200+ (REUI system) | +20x variants |
| Legacy patterns | 2 (avatar, tabs forwardRef) | 0 | 100% modern |
| Animation library | framer-motion (banned) | CSS transitions | Ban enforced |
| Toast library | goey-toast (non-standard) | sonner (industry standard) | Standardized |
| Documentation | Partial | Comprehensive | Full coverage |

---

*Report generated: 2026-06-24*
*Sources: BIGDROPS (31 UI primitives), REUI (55 core + 200+ variants), React-temps (16 pattern files)*
