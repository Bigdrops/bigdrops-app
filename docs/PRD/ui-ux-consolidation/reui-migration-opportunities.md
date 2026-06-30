# REUI Migration Opportunities

> Specific migration paths from BIGDROPS → REUI, what to adopt, what to keep, what to build new

---

## 1. Migration Strategy Overview

### 1.1 Guiding Principles

1. **Incremental adoption** — Replace one component family at a time, never big-bang
2. **Token-first** — Map REUI tokens to `--bd-*` prefix before component migration
3. **Keep what works** — BIGDROPS wins 4 families; don't migrate those
4. **Fill gaps** — 21 REUI components have no BIGDROPS equivalent; adopt those
5. **Hybrid where REUI wins marginally** — Use REUI API + BIGDROPS mobile strategy

### 1.2 Dependency Resolution

Before any component migration, resolve these conflicts:

| Conflict | Current State | Resolution |
|---|---|---|
| `motion` (framer-motion) | REUI uses `motion`; BIGDROPS bans framer-motion | Replace `motion` with CSS transitions or BIGDROPS-approved alternatives |
| Toast library | BIGDROPS uses goey-toast; REUI uses sonner | Migrate to sonner (REUI standard) |
| Base UI | REUI has dual Radix + Base UI; BIGDROPS uses Radix only | Ignore Base UI layer; use Radix variants only |
| Theme tokens | REUI uses `--lyra-*`; BIGDROPS uses `--bd-*` | Create CSS variable mapping layer |
| Icon system | REUI uses Lucide; BIGDROPS uses Hugeicons | Map Lucide icons to Hugeicons equivalents |

---

## 2. Phase 1: Token System Convergence (Days 1-2)

### 2.1 Current State

**BIGDROPS** (`index.css` — 567 lines):
```css
:root {
  --bd-primary: #1c4ed8;
  --bd-primary-foreground: #ffffff;
  --bd-secondary: #f1f5f9;
  --bd-secondary-foreground: #0f172a;
  --bd-accent: #f1f5f9;
  --bd-accent-foreground: #0f172a;
  --bd-muted: #f1f5f9;
  --bd-muted-foreground: #64748b;
  --bd-card: #ffffff;
  --bd-card-foreground: #0f172a;
  --bd-popover: #ffffff;
  --bd-popover-foreground: #0f172a;
  --bd-border: #e2e8f0;
  --bd-input: #e2e8f0;
  --bd-ring: #1c4ed8;
  --bd-destructive: #ef4444;
  --bd-destructive-foreground: #ffffff;
  --bd-radius: 0.5rem;
  /* ... 50+ more tokens */
}
```

**REUI** (lyra theme — `registry-reui/styles/lyra.css`):
```css
:root {
  --lyra-background: #ffffff;
  --lyra-foreground: #0f172a;
  --lyra-primary: #1c4ed8;
  --lyra-primary-foreground: #ffffff;
  --lyra-secondary: #f1f5f9;
  --lyra-secondary-foreground: #0f172a;
  --lyra-accent: #f1f5f9;
  --lyra-accent-foreground: #0f172a;
  --lyra-muted: #f1f5f9;
  --lyra-muted-foreground: #64748b;
  --lyra-card: #ffffff;
  --lyra-card-foreground: #0f172a;
  --lyra-popover: #ffffff;
  --lyra-popover-foreground: #0f172a;
  --lyra-border: #e2e8f0;
  --lyra-input: #e2e8f0;
  --lyra-ring: #1c4ed8;
  --lyra-destructive: #ef4444;
  --lyra-destructive-foreground: #ffffff;
  --lyra-radius: 0.5rem;
  /* ... 50+ more tokens */
}
```

### 2.2 Token Mapping Layer

Create `src/styles/reui-tokens.css`:

```css
/* REUI → BIGDROPS token mapping */
:root {
  /* Map REUI tokens to --bd-* prefix */
  --bd-background: var(--lyra-background);
  --bd-foreground: var(--lyra-foreground);
  --bd-primary: var(--lyra-primary);
  --bd-primary-foreground: var(--lyra-primary-foreground);
  --bd-secondary: var(--lyra-secondary);
  --bd-secondary-foreground: var(--lyra-secondary-foreground);
  --bd-accent: var(--lyra-accent);
  --bd-accent-foreground: var(--lyra-accent-foreground);
  --bd-muted: var(--lyra-muted);
  --bd-muted-foreground: var(--lyra-muted-foreground);
  --bd-card: var(--lyra-card);
  --bd-card-foreground: var(--lyra-card-foreground);
  --bd-popover: var(--lyra-popover);
  --bd-popover-foreground: var(--lyra-popover-foreground);
  --bd-border: var(--lyra-border);
  --bd-input: var(--lyra-input);
  --bd-ring: var(--lyra-ring);
  --bd-destructive: var(--lyra-destructive);
  --bd-destructive-foreground: var(--lyra-destructive-foreground);
  --bd-radius: var(--lyra-radius);
}
```

### 2.3 Migration Steps

1. **Audit** — Document all `--bd-*` tokens in use across BIGDROPS
2. **Map** — Create mapping layer for REUI → BIGDROPS tokens
3. **Test** — Verify all BIGDROPS components still work with mapped tokens
4. **Extend** — Add REUI-specific tokens (e.g., `--lyra-button-radius`, `--lyra-card-padding`)
5. **Cleanup** — Remove redundant `--bd-*` tokens that are now provided by REUI

### 2.4 Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/styles/reui-tokens.css` | CREATE | Token mapping layer |
| `src/styles/index.css` | MODIFY | Import reui-tokens.css, remove redundant tokens |
| `src/styles/formTheme.css` | DELETE | Phase 1 goal: eliminate 100% |

---

## 3. Phase 2: Component Migration (Days 3-5)

### 3.1 Migration Priority Matrix

| Priority | Component | Action | Effort | Risk |
|---|---|---|---|---|
| P0 | Button | Replace | 1 day | Low |
| P0 | Input | Replace | 0.5 day | Low |
| P0 | Select | Replace | 0.5 day | Low |
| P1 | Dialog | Replace | 0.5 day | Low |
| P1 | Popover | Replace | 0.5 day | Low |
| P1 | Tooltip | Replace | 0.25 day | Low |
| P1 | Switch | Replace | 0.25 day | Low |
| P1 | Checkbox | Replace | 0.25 day | Low |
| P1 | Radio Group | Replace | 0.25 day | Low |
| P1 | Slider | Replace | 0.25 day | Low |
| P1 | Avatar | Replace | 0.25 day | Low |
| P1 | Badge | Replace | 0.25 day | Low |
| P1 | Table/Data Grid | Replace | 1 day | Medium |
| P1 | Tabs | Replace | 0.5 day | Low |
| P1 | Accordion | Replace | 0.25 day | Low |
| P1 | Separator | Replace | 0.1 day | Low |
| P1 | Collapsible | Replace | 0.1 day | Low |
| P1 | Scroll Area | Replace | 0.25 day | Low |
| P1 | Progress | Replace | 0.1 day | Low |
| P1 | Toast | Replace | 0.5 day | Medium |
| P1 | Number Field | Replace | 0.5 day | Low |
| P2 | Command | Adopt | 0.5 day | Low |
| P2 | Navigation Menu | Adopt | 0.5 day | Low |
| P2 | Context Menu | Adopt | 0.25 day | Low |
| P2 | Hover Card | Adopt | 0.25 day | Low |
| P2 | Drawer | Adopt | 0.5 day | Low |
| P2 | Resizable | Adopt | 0.5 day | Low |
| P2 | Pagination | Adopt | 0.25 day | Low |
| P2 | Alert | Adopt | 0.25 day | Low |
| P2 | Empty State | Adopt | 0.25 day | Low |
| P3 | Sortable | Adopt | 1 day | Medium |
| P3 | Filters | Adopt | 1 day | Medium |
| P3 | Data Grid | Adopt | 2 days | High |
| P3 | Kanban | Adopt | 2 days | High |
| P3 | Timeline | Adopt | 1 day | Medium |
| P3 | Tree | Adopt | 1 day | Medium |
| P3 | Stepper | Adopt | 0.5 day | Low |
| P3 | File Upload | Adopt | 1 day | Medium |
| P3 | Autocomplete | Adopt | 1 day | Medium |
| P3 | Phone Input | Adopt | 1 day | Low |
| P3 | Rating | Adopt | 0.25 day | Low |
| P3 | Scrollspy | Adopt | 0.25 day | Low |

### 3.2 Migration Pattern: Button Example

**Before** (`src/components/ui/button.tsx`):
```tsx
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

**After** (REUI button with `--bd-*` token mapping):
```tsx
// REUI button uses --lyra-* tokens, mapped to --bd-* via reui-tokens.css
// No code changes needed — tokens are mapped at CSS level
import { Button } from '@/components/reui/button';

// Usage stays the same:
<Button variant="default" size="default">Click me</Button>
<Button variant="destructive" size="sm">Delete</Button>
```

### 3.3 Migration Pattern: Toast Example

**Before** (`src/components/ui/toaster.tsx`):
```tsx
import { GoeyToaster } from 'goey-toast';
import { useTheme } from 'next-themes';

export function Toaster() {
  const { theme } = useTheme();
  return <GoeyToaster theme={theme as 'light' | 'dark'} />;
}
```

**After** (REUI toast with sonner):
```tsx
import { Toaster } from '@/components/reui/toaster';

// Usage stays the same:
import { toast } from 'sonner';

toast.success('Saved successfully');
toast.error('Something went wrong');
toast.info('Processing...');
```

### 3.4 Migration Pattern: Tabs Example (Legacy → Modern)

**Before** (`src/components/ui/tabs.tsx` — legacy forwardRef):
```tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

const Tabs = React.forwardRef<...>(...);
const TabsList = React.forwardRef<...>(...);
const TabsTrigger = React.forwardRef<...>(...);
const TabsContent = React.forwardRef<...>(...);
```

**After** (REUI tabs — modern function component):
```tsx
// REUI uses modern function component pattern
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/reui/tabs';

// Usage stays the same:
<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">...</TabsContent>
  <TabsContent value="password">...</TabsContent>
</Tabs>
```

---

## 4. Phase 3: Mobile Strategy (Day 6)

### 4.1 Current BIGDROPS Mobile Strategy

BIGDROPS has a superior mobile strategy via `useLayoutMode` hook:

```tsx
// src/hooks/useLayoutMode.ts
export function useLayoutMode() {
  const { isMobile, isTablet } = useMediaQuery();
  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    mode: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
}
```

Used in `combobox.tsx`:
```tsx
const { isMobile } = useLayoutMode();

if (isMobile) {
  return <Sheet>...</Sheet>; // Full-screen on mobile
}
return <Popover>...</Popover>; // Dropdown on desktop
```

### 4.2 REUI Mobile Strategy

REUI uses `use-mobile.ts` hook:
```tsx
// REUI hook
export function useMobile() {
  return useMediaQuery('(max-width: 768px)');
}
```

### 4.3 Hybrid Approach

**Adopt REUI components** but **keep BIGDROPS mobile strategy**:

```tsx
// Hybrid pattern: REUI component + BIGDROPS mobile strategy
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { Dialog } from '@/components/reui/dialog';
import { Sheet } from '@/components/ui/sheet'; // BIGDROPS sheet wins

export function ResponsiveDialog({ children, ...props }) {
  const { isMobile } = useLayoutMode();
  
  if (isMobile) {
    return <Sheet {...props}>{children}</Sheet>;
  }
  return <Dialog {...props}>{children}</Dialog>;
}
```

### 4.4 Files to Create

| File | Action | Purpose |
|---|---|---|
| `src/components/reui/responsive-dialog.tsx` | CREATE | Dialog + Sheet responsive wrapper |
| `src/components/reui/responsive-popover.tsx` | CREATE | Popover + Sheet responsive wrapper |
| `src/components/reui/responsive-select.tsx` | CREATE | Select + Sheet responsive wrapper |

---

## 5. Phase 4: Animation Resolution (Day 7)

### 5.1 REUI Animation Dependencies

REUI uses `motion` (framer-motion successor) in:
- `circuit-board.tsx` — SVG visualization animations
- `OpenInAIDropdown.tsx` — Portal-based dropdown animations
- `draw-signature-base.tsx` — Canvas drawing animations
- `floating-disclosure-base.tsx` — FAB animations
- `contextual-ai-bar.tsx` — Pill switcher animations
- `dropdown-disclosure-base.tsx` — Model selector animations
- `quick-paste-base.tsx` — Paste input animations
- `select-ai-agent.tsx` — AI agent selector animations

### 5.2 BIGDROPS Animation Ban

BIGDROPS explicitly bans framer-motion in production components. However, two BIGDROPS components already use it:
- `circuit-board.tsx` (673 lines) — SVG visualization
- `OpenInAIDropdown.tsx` (204 lines) — AI provider dropdown

### 5.3 Resolution Strategy

**Option A: CSS Transitions (Recommended)**
Replace `motion` with CSS transitions for all REUI components:

```tsx
// Before (motion)
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 10 }}
>
  Content
</motion.div>

// After (CSS transitions)
<div className="animate-in fade-in slide-in-from-y-2">
  Content
</div>
```

**Option B: Accept Motion (If Ban is Relaxed)**
If the framer-motion ban is relaxed for specific use cases, keep `motion` in:
- `circuit-board.tsx` — Complex SVG animations
- `OpenInAIDropdown.tsx` — Portal-based animations

**Option C: Replace with @radix-ui/react-presence**
Use Radix's presence utility for enter/exit animations:

```tsx
import { Presence } from '@radix-ui/react-presence';

<Presence>
  {isOpen && (
    <div className="animate-in fade-in">
      Content
    </div>
  )}
</Presence>
```

### 5.4 Recommendation

**Option A (CSS Transitions)** is recommended because:
- Eliminates `motion` dependency entirely
- Aligns with BIGDROPS framer-motion ban
- Better performance (no JS animation library)
- Tailwind CSS already provides `animate-*` utilities

---

## 6. Phase 5: Icon System Mapping (Day 8)

### 6.1 Current Icon Systems

**BIGDROPS** uses Hugeicons:
```tsx
import { Cancel01Icon } from 'hugeicons-react';
import { ArrowRight01Icon } from 'hugeicons-react';
```

**REUI** uses Lucide:
```tsx
import { X } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
```

### 6.2 Icon Mapping Table

| Lucide Icon | Hugeicons Equivalent | Usage |
|---|---|---|
| `X` | `Cancel01Icon` | Close/dismiss |
| `ChevronRight` | `ArrowRight01Icon` | Navigation |
| `ChevronLeft` | `ArrowLeft01Icon` | Navigation |
| `ChevronDown` | `ArrowDown01Icon` | Dropdown |
| `ChevronUp` | `ArrowUp01Icon` | Collapse |
| `Plus` | `Add01Icon` | Add/create |
| `Minus` | `Subtract01Icon` | Remove |
| `Search` | `Search01Icon` | Search |
| `Settings` | `Settings02Icon` | Settings |
| `User` | `UserIcon` | User |
| `Trash` | `Delete01Icon` | Delete |
| `Edit` | `Edit01Icon` | Edit |
| `Check` | `Checkmark01Icon` | Success/confirm |
| `AlertTriangle` | `WarningIcon` | Warning |
| `Info` | `InformationCircleIcon` | Information |
| `Eye` | `ViewIcon` | Show |
| `EyeOff` | `ViewOffIcon` | Hide |
| `Download` | `Download01Icon` | Download |
| `Upload` | `Upload01Icon` | Upload |
| `Copy` | `Copy01Icon` | Copy |
| `ExternalLink` | `ExternalLinkIcon` | External link |

### 6.3 Icon Mapping Strategy

**Option A: Create Icon Adapter (Recommended)**
Create `src/components/reui/icons.tsx` that maps Lucide icons to Hugeicons:

```tsx
// src/components/reui/icons.tsx
import { Cancel01Icon } from 'hugeicons-react';
import { ArrowRight01Icon } from 'hugeicons-react';
// ... other Hugeicons

// Map Lucide API to Hugeicons
export const X = Cancel01Icon;
export const ChevronRight = ArrowRight01Icon;
// ... other mappings
```

**Option B: Replace Lucide with Hugeicons in REUI Components**
Modify REUI components to use Hugeicons directly.

**Option C: Use Lucide (If Hugeicons Ban is Relaxed)**
Keep Lucide icons in REUI components; accept dual icon system.

### 6.4 Recommendation

**Option A (Icon Adapter)** is recommended because:
- REUI components stay unchanged (upstream compatible)
- BIGDROPS gets consistent icon system
- Easy to swap later if needed

---

## 7. Component-Specific Migration Guides

### 7.1 Button Migration

**Files to modify:**
- `src/components/ui/button.tsx` → DELETE (replace with REUI)
- `src/components/reui/button.tsx` → CREATE (copy from REUI)
- All files importing `@/components/ui/button` → UPDATE to `@/components/reui/button`

**Breaking changes:**
- None (REUI button has same API as BIGDROPS button)

**Testing:**
- Verify all button variants render correctly
- Verify all button sizes work
- Verify icon slots work
- Verify disabled states work

### 7.2 Input Migration

**Files to modify:**
- `src/components/ui/input.tsx` → DELETE (replace with REUI)
- `src/components/reui/input.tsx` → CREATE (copy from REUI)
- `src/components/reui/input-group.tsx` → CREATE (new compound pattern)
- All files importing `@/components/ui/input` → UPDATE to `@/components/reui/input`

**Breaking changes:**
- None (REUI input has same API as BIGDROPS input)

**New features:**
- `InputPrefix` — Prefix slot
- `InputSuffix` — Suffix slot
- `InputGroup` — Compound input group

**Testing:**
- Verify all input types work
- Verify icon slots work
- Verify prefix/suffix slots work
- Verify disabled states work

### 7.3 Toast Migration

**Files to modify:**
- `src/components/ui/toaster.tsx` → DELETE (replace with REUI)
- `src/components/ui/sonner.tsx` → DELETE (replace with REUI)
- `src/components/ui/toast.tsx` → DELETE (deprecated wrapper)
- `src/components/reui/toaster.tsx` → CREATE (copy from REUI)
- All files importing `@/components/ui/toaster` → UPDATE to `@/components/reui/toaster`

**Breaking changes:**
- `goey-toast` API → `sonner` API
- `toast.success()` → `toast.success()` (same)
- `toast.error()` → `toast.error()` (same)
- `toast.info()` → `toast.info()` (same)
- `toast.warning()` → `toast.warning()` (same)
- `toast.dismiss()` → `toast.dismiss()` (same)

**Testing:**
- Verify all toast types render correctly
- Verify toast dismiss works
- Verify toast position works
- Verify toast theme works

### 7.4 Tabs Migration

**Files to modify:**
- `src/components/ui/tabs.tsx` → DELETE (replace with REUI)
- `src/components/reui/tabs.tsx` → CREATE (copy from REUI)
- All files importing `@/components/ui/tabs` → UPDATE to `@/components/reui/tabs`

**Breaking changes:**
- None (REUI tabs has same API as BIGDROPS tabs)

**New features:**
- `tabs-variant-*` — pill, underline, enclosed variants
- `tabs-trigger-variant-*` — trigger variants

**Testing:**
- Verify all tab variants render correctly
- Verify tab switching works
- Verify keyboard navigation works
- Verify disabled states work

---

## 8. New Component Adoption Guides

### 8.1 Command Palette Adoption

**New files:**
- `src/components/reui/command.tsx` — Copy from REUI
- `src/components/ui/command-dialog.tsx` — Create wrapper

**Usage pattern:**
```tsx
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from '@/components/reui/command';

export function CommandDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandGroup heading="Suggestions">
              <CommandItem>Calendar</CommandItem>
              <CommandItem>Search Emoji</CommandItem>
              <CommandItem>Calculator</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

### 8.2 Drawer Adoption

**New files:**
- `src/components/reui/drawer.tsx` — Copy from REUI
- `src/components/ui/drawer.tsx` — Create wrapper

**Usage pattern:**
```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/reui/drawer';

export function DrawerDemo() {
  const [open, setOpen] = React.useState(false);
  
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you sure?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">...</div>
      </DrawerContent>
    </Drawer>
  );
}
```

### 8.3 Data Grid Adoption

**New files:**
- `src/components/reui/data-grid.tsx` — Copy from REUI
- `src/components/ui/data-grid.tsx` — Create wrapper

**Usage pattern:**
```tsx
import { DataGrid, DataGridColumn } from '@/components/reui/data-grid';

const columns: DataGridColumn[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'status', header: 'Status', filterable: true },
];

const data = [
  { name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
];

export function DataGridDemo() {
  return <DataGrid columns={columns} data={data} pagination sorting filtering />;
}
```

### 8.4 Sortable Adoption

**New files:**
- `src/components/reui/sortable.tsx` — Copy from REUI
- `src/components/ui/sortable.tsx` — Create wrapper

**Usage pattern:**
```tsx
import { Sortable, SortableItem, SortableOverlay } from '@/components/reui/sortable';

export function SortableDemo() {
  const [items, setItems] = React.useState(['Item 1', 'Item 2', 'Item 3']);
  
  return (
    <Sortable items={items} onReorder={setItems}>
      {items.map((item) => (
        <SortableItem key={item} id={item}>
          {item}
        </SortableItem>
      ))}
      <SortableOverlay>
        <div className="bg-background shadow-lg rounded-md border p-2">
          Dragging...
        </div>
      </SortableOverlay>
    </Sortable>
  );
}
```

---

## 9. Migration Checklist

### 9.1 Pre-Migration

- [ ] Audit all `--bd-*` tokens in use
- [ ] Create token mapping layer (`reui-tokens.css`)
- [ ] Verify token mapping works with all BIGDROPS components
- [ ] Create REUI component directory (`src/components/reui/`)
- [ ] Install REUI dependencies (motion, vaul, sonner, @dnd-kit, @headless-tree)
- [ ] Create icon adapter (`icons.tsx`)

### 9.2 Component Migration

- [ ] Migrate Button family (button, button-group)
- [ ] Migrate Input family (input, input-group)
- [ ] Migrate Select family (select)
- [ ] Migrate Dialog family (dialog)
- [ ] Migrate Popover family (popover)
- [ ] Migrate Tooltip family (tooltip)
- [ ] Migrate Switch family (switch)
- [ ] Migrate Checkbox family (checkbox)
- [ ] Migrate Radio Group family (radio-group)
- [ ] Migrate Slider family (slider)
- [ ] Migrate Avatar family (avatar)
- [ ] Migrate Badge family (badge)
- [ ] Migrate Table/Data Grid family (table, data-grid)
- [ ] Migrate Tabs family (tabs)
- [ ] Migrate Accordion family (accordion)
- [ ] Migrate Separator family (separator)
- [ ] Migrate Collapsible family (collapsible)
- [ ] Migrate Scroll Area family (scroll-area)
- [ ] Migrate Progress family (progress)
- [ ] Migrate Toast family (toast, toaster)
- [ ] Migrate Number Field family (number-field)

### 9.3 New Component Adoption

- [ ] Adopt Command palette
- [ ] Adopt Navigation Menu
- [ ] Adopt Context Menu
- [ ] Adopt Hover Card
- [ ] Adopt Drawer
- [ ] Adopt Resizable panels
- [ ] Adopt Pagination
- [ ] Adopt Alert banner
- [ ] Adopt Empty State
- [ ] Adopt Sortable
- [ ] Adopt Filters
- [ ] Adopt Data Grid
- [ ] Adopt Kanban
- [ ] Adopt Timeline
- [ ] Adopt Tree view
- [ ] Adopt Stepper
- [ ] Adopt File Upload
- [ ] Adopt Autocomplete
- [ ] Adopt Phone Input
- [ ] Adopt Rating
- [ ] Adopt Scrollspy

### 9.4 Post-Migration

- [ ] Remove dead BIGDROPS components
- [ ] Update all imports across codebase
- [ ] Run `bun run audit:load`
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint`
- [ ] Run `bun run test`
- [ ] Update component documentation
- [ ] Update STORYBOOK.md
- [ ] Update AGENTS.md

---

## 10. Risk Assessment

### 10.1 High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Motion dependency | Violates BIGDROPS ban | Use CSS transitions |
| Bundle size increase | Performance degradation | Tree-shake REUI components |
| Token system mismatch | Visual inconsistency | Create mapping layer |

### 10.2 Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Toast API change | Breaking changes in toast usage | Adapter pattern |
| Icon system mismatch | Visual inconsistency | Icon adapter |
| Mobile strategy difference | Inconsistent mobile UX | Hybrid approach |

### 10.3 Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Component API differences | Minor refactoring | Update imports |
| Theme token differences | Visual inconsistency | CSS variable mapping |
| Dependency conflicts | Build failures | Audit dependencies |

---

*Report generated: 2026-06-24*
*Sources: BIGDROPS (31 UI primitives), REUI (55 core + 200+ variants), React-temps (16 pattern files)*
