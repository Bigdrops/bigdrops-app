# Sidebar Toggle Render Investigation

## Problem
The sidebar toggle button renders as a solid square instead of the animated `SidebarToggleIcon` (bracket/panel icon with a visible inner cutout).

## Findings

### Render Chain (Confirmed)
The `SidebarToggleIcon` is rendered via two paths:

**Path A — `Layout.tsx` (26+ pages)**
```
Layout.tsx (state: sidebarOpen)
  → MobileChromeContext.Provider (lines 139-145, 205)
  → <div className="md:hidden">
      → MobilePageHeader (lines 170, 184)
          → SidebarToggleIcon isOpen={sidebarOpen}
```

**Path B — `ModuleShell.tsx` (7+ pages: Waybills, Invoices, CSR, etc.)**
```
ModuleShell.tsx
  → useContext(MobileChromeContext) (line 137)
  → MobilePageHeader (line 276)
      → SidebarToggleIcon isOpen={mobileChrome.sidebarOpen}
```

The icon is **not** coming from:
- `SidebarTrigger` in `sidebar.tsx` — uses lucide `<ChevronLeft />`, not `SidebarToggleIcon`, and is **never imported** anywhere in `src/`
- `PageIntro.tsx` — imports `SidebarToggleIcon` but the component has **zero imports** — dead code

### State Flow
- `sidebarOpen` starts `false` (default closed) in `Layout.tsx:80`
- `openSidebar` callback only sets to `true` (line 90)
- `MobileChromeContext` provides both `sidebarOpen` and `openSidebar`
- `MobileSidebar` receives `onOpenChange={setSidebarOpen}` (line 228) — this is what sets state back to `false`
- The icon always shows the closed state initially

### Component: `SidebarToggleIcon`
**File**: `src/components/unlumen-ui/sidebar-toggle-icon.tsx`

Structure:
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  {/* Outer border — always renders */}
  <path d={OUTER} fill="currentColor" stroke="currentColor" strokeWidth={2} />

  {/* Inner panel — motion.path for path morphing */}
  <motion.path
    d={isOpen ? PANEL_OPEN : PANEL_CLOSED}
    animate={{ d: isOpen ? PANEL_OPEN : PANEL_CLOSED }}
    style={{ fill: "var(--background)" }}
    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
  />
</svg>
```

**Key details**:
- Outer path: full filled rounded rectangle — always renders as a standard `<path>`
- Inner panel: `<motion.path>` — fills with `var(--background)` to create a visual "cutout"
- Both PANEL paths have compatible structure for morphing (same M/C/V/Z command count)
- SVG rendered at `w-4 h-4` (16×16px) within `h-9 w-9` (36×36px) button
- PNEL_CLOSED cutout is ~4px wide at this scale

### CSS Variable: `--background`
Defined in `src/index.css`:
- Light (`:root`): `--background: 210 40% 98%;` (line 15)
- Dark (`.dark`): `--background: 222 25% 8%;` (line 92)

Usage chain: `style={{ fill: "var(--background)" }}` on the motion.path — no fallback value.

### Animation Library
- Import: `import { motion } from "motion/react"`
- Package: `"motion": "^12.38.0"` (package.json line 61)
- Also installed: `"framer-motion": "^12.38.0"` (package.json line 57)
- Other users of motion: `circuit-board.tsx` (framer-motion), `glowing-badge.tsx` (motion/react) — neither does SVG path morphing

### Button Wrapper
```tsx
<button className="h-9 w-9 shrink-0 border border-bd-border bg-transparent hover:bg-bd-surface-muted rounded-lg flex items-center justify-center ...">
  <SidebarToggleIcon isOpen={isOpen} strokeWidth={2} className="w-4 h-4 text-bd-text" />
</button>
```
- `bg-transparent` — no background to interfere
- No `overflow: hidden` — SVG not clipped
- Centered flex layout

## Root Cause Analysis

The most likely cause of the "solid square" is that **`<motion.path>` from `"motion/react"` does not render the inner panel on the initial paint**. When the component mounts:

1. The outer `<path>` renders immediately — it's a standard SVG element, no animation library
2. `fill="currentColor"` fills the entire rounded rectangle shape (inheriting `text-bd-text` color)
3. `stroke="currentColor"` with `strokeWidth={2}` adds an additional border
4. The `<motion.path>` for the inner panel either:
   - **Delays rendering until the first animation tick** (motion library internal behavior — path morphing requires measuring the initial path)
   - **Doesn't apply `style={{ fill: "var(--background)" }}` correctly** on the initial render frame
   - **Needs an `initial` prop** to explicitly set the starting state for the path morph

Since only the outer shape renders, the user sees a fully filled rounded rectangle = solid square.

### Supporting Evidence
- `circuit-board.tsx` uses `motion.path` but with `initial={{ pathLength: 0 }}` and `animate={{ pathLength: 1 }}` — always starts invisible and animates in. It never relies on a static initial render.
- `glowing-badge.tsx` uses `motion.span` with `animate` for opacity/scale — these are CSS property animations, not SVG path morphing.
- No other component in the codebase does SVG path morphing with `motion.path` and `d` attribute animation.

## Recommendations for Fix
1. Add `initial={{ d: isOpen ? PANEL_OPEN : PANEL_CLOSED }}` to the `<motion.path>` to explicitly set the initial path value
2. Or replace `motion.path` with a regular `<path>` and use CSS transitions on `d` (if supported) or SVG `<animate>` element
3. Or use two `<path>` elements with opacity/visibility transitions instead of path morphing (avoids motion library SVG rendering issues entirely)
4. Consider increasing the SVG rendered size (larger than `w-4 h-4`) so the panel cutout is more visually distinguishable

## Files Referenced
- `src/components/unlumen-ui/sidebar-toggle-icon.tsx` — the component
- `src/components/layout/MobilePageHeader.tsx` — renders the icon in a button
- `src/components/Layout.tsx` — state owner, context provider, renders MobilePageHeader
- `src/components/layout/ModuleShell.tsx` — consumes context, renders MobilePageHeader
- `src/components/layout/PageIntro.tsx` — dead code (unused)
- `src/components/ui/sidebar.tsx` — SidebarTrigger uses ChevronLeft (not the issue)
- `src/components/ui/circuit-board.tsx` — other motion user (framer-motion, no path morph)
- `src/components/unlumen-ui/glowing-badge.tsx` — other motion user (motion/react, no path morph)
- `src/index.css` — defines `--background` CSS variable
- `docs/templates/React-temps/sidebaricon.tsx` — reference template (identical to production)
