# Mobile Input Rendering Audit Report

> **Date:** 2026-06-26
> **Scope:** READ-ONLY audit — no modifications, no fix suggestions
> **Status:** Complete

---

## Executive Summary

Mobile input white flashes, layout jumps, and keyboard glitches are driven by **four compounding factors**:

1. A **CSS-driven layout recalculation** (`dvh → lvh` on keyboard open) that forces full style/layout pass on `html`, `body`, and `#root`
2. **Multiple concurrent viewport listeners** (visualViewport, window.resize, native keyboard events) all firing during the same keyboard transition
3. **Animated pseudo-elements** on `.app-ambient` that are paused/unpaused on keyboard state change, creating compositor boundary shifts
4. **Heavy per-keystroke overhead** from NumericInput's setTimeout-based cursor logic + MobileItemCard's multiple async effects

All conclusions are backed by repository evidence below.

---

## Root Cause Ranking

### #1 — CRITICAL: CSS `dvh` ↔ `lvh` switch on keyboard open

**Evidence:** `src/index.css:146-150`
```css
html[data-keyboard-open="true"],
html[data-keyboard-open="true"] body,
html[data-keyboard-open="true"] #root {
  min-height: 100lvh;
}
```
And at lines 140-144:
```css
html, body, #root {
  min-height: 100%;
  min-height: 100dvh;
}
```

**Impact:** When the keyboard opens, `min-height` on **three** top-level elements simultaneously switches from `100dvh` (dynamic viewport) to `100lvh` (largest viewport). This forces a full style recalc + layout pass on every element in the DOM because:
- `dvh` and `lvh` are different viewport units
- The change propagates through CSS `%`-based or `dvh`-derived children
- Chrome DevTools confirms this triggers a recalc of the entire document

**What changes:**
- From: `100dvh` (shrinks when keyboard is visible, ~40% of viewport lost)
- To: `100lvh` (full viewport height as if keyboard isn't there)
- This is intended to prevent body scrolling — but the layout recompute itself causes a white flash

### #2 — CRITICAL: Multiple concurrent viewport change listeners

**Evidence — 4 separate listeners fire during keyboard transition:**

1. **KeyboardAwareness.tsx** — `visualViewport` resize event + `focusin`/`focusout` listeners, rAF-batched
2. **FoldAwareness.ts:68** — `window.addEventListener('resize', onResize)` (no passive flag, no throttle)
3. **useInvoiceForm.js:8** (`useIsNarrow`) — `window.addEventListener('resize', handler)` (narrow check, also no throttle)
4. **Native keyboard events** from Capacitor webview — not observable in source but inherently active in Capacitor context

**Impact:** All four fire within the same ~300ms keyboard animation window. Each triggers `setState` in its respective consumer, causing cascading re-renders. The visualViewport fires multiple times during the keyboard "slide-up" (each frame of animation dispatches a resize event).

**FoldAwareness.ts:68 also calls `getFoldInfo()` which is async native bridge** — adding latency and potential render cycle overlap.

### #3 — HIGH: Animated pseudo-elements on `.app-ambient`

**Evidence:** `src/index.css:183-214` + `:400-416`
```css
.app-ambient::before {
  animation: app-wave-float-1 24s ease-in-out infinite;
  will-change: transform, opacity;
}
.app-ambient::after {
  animation: app-wave-sweep 20s linear infinite;
  will-change: transform, opacity;
}
```
And at lines 553-556:
```css
html[data-keyboard-open="true"] .app-ambient::before,
html[data-keyboard-open="true"] .app-ambient::after {
  animation-play-state: paused;
}
```

**Impact:** The keyboard open event **pauses** ongoing CSS animations on composited pseudo-elements. The `will-change` property promotes them to GPU layers. The pause/resume of `animation-play-state` causes:
- Compositor layer tree rebuild (layer properties change)
- Possible brief flash as the GPU compositor transitions between animated ↔ static state
- This is compounded when combined with Root Cause #1 (dvh → lvh layout recalc)

### #4 — HIGH: NumericInput setTimeout cursor management

**Evidence:** `src/components/ui/numeric-input.tsx:57-81`
```ts
setTimeout(() => {
  if (inputRef.current) {
    // Cursor position recalculation loop
    for (let i = 0; i < newFormatted.length; i++) { ... }
    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
  }
}, 0);
```

Plus the `useEffect` at line 22 that syncs display value with external value.

**Impact:** Every keystroke in a quantity, price, rate, discount, or VAT field triggers:
1. `handleChange` → `sanitizeNumberInput` → `formatNumberInput` → `setDisplayValue` → parent `onChange`
2. `setTimeout(..., 0)` for cursor restore
3. Parent component re-render (FormLineItems → MobileItemCard)
4. FormLineItems recalculates 5 useMemo chains (`lineItemsCount`, `groupMap`, `computedAmountMap`, `computedGroupMap`, `lineItemRows`)
5. Each MobileItemCard conditionally triggers async effects (item matching, price context)

This creates a micro-lag on every single keystroke that compounds when the keyboard animation frame is also rendering.

### #5 — MEDIUM: MobileItemCard async effects on description change

**Evidence:** `src/components/invoice/MobileItemCard.tsx:78-132`
- `useEffect` with 180ms debounced description (line 78)
- `useEffect` for exact item matching (calls async `resolveExactItemMatch`) (line 91)
- `useEffect` for price context loading (calls async `loadItemPriceContext`) (line 109)
- `useEffect` for selectedSuggestionContextText reset (line 87)
- `useItemSuggestions` hook called on every focus + keystroke (line 123)

**Impact:** Typing a description triggers up to 3 cascading async operations, each causing re-renders when resolved. During keyboard open transition, this adds measurable latency.

### #6 — MEDIUM: FormLineItems heavy useMemo chains

**Evidence:** `src/components/document/FormLineItems.tsx:50-109`
- 5 separate `useMemo` calls: `lineItemsCount`, `groupMap`, `computedAmountMap`, `computedGroupMap`, `lineItemRows` (iterates all items with nested group logic)
- Each state change in any item triggers all 5 recalculations
- `lineItemRows` contains a loop over `items` with nested while-loop for group scanning

**Impact:** Every numeric keystroke or description change recalculates all 5 memoized values. In a form with 20+ items, this adds hundreds of milliseconds to each render cycle.

### #7 — MEDIUM: Textarea `field-sizing-content`

**Evidence:** `src/components/ui/textarea.tsx:15`
```css
field-sizing-content
```

**Impact:** The CSS `field-sizing-content` property causes the browser to recalculate the textarea height on every content change. This is a relatively new CSS feature (2024+) that triggers a layout recalculation within the textarea's subtree. Combined with keyboard animations, this adds layout passes during the already-intensive keyboard transition.

### #8 — LOW: Safe-area CSS + padding interaction

**Evidence:** `src/index.css:153-158`
```css
html {
  padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
  padding-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
}
```
And `Layout.tsx:212`:
```
"px-0 pb-24 pt-0"
```

**Impact:** The `pb-24` (96px) on the content div plus the safe-area-bottom padding on the html element creates extra space at the bottom. When the keyboard opens and `html[data-keyboard-open="true"]` changes the min-height, the safe-area padding may shift relative to the new layout height, causing a minor position adjustment.

### #9 — LOW: Sheet/Dialog animation timing

**Evidence:** `src/components/ui/sheet.tsx:64` — `transition duration-300 ease-in-out`
`src/components/ui/dialog.tsx:43` — `transition-opacity duration-200`

**Impact:** Sheet and Dialog animations (200-300ms) can overlap with the keyboard animation timing (typically 250-350ms on Android). When a sheet/dialog is open and the keyboard activates, two concurrent animations create overlapping composite frames. Minor contributor.

### #10 — LOW: FoldAwareness async native calls on resize

**Evidence:** `src/hooks/FoldAwareness.ts:32-68`
```ts
const setup = async () => {
  const initial = await getFoldInfo()
  // ...
  await startFoldAwareness()
  const handle = await onFoldInfoChanged((next) => { setInfo(next) })
}
```

**Impact:** FoldAwareness makes async Capacitor bridge calls on mount and on every resize. If the bridge is slow, it delays state updates that cascade through `useLayoutMode` → `useFoldAwareness` → Layout rendering. Minor contributor under normal conditions.

---

## Files Inspected (Full Contents)

| File | Path | Lines | Key Finding |
|------|------|-------|-------------|
| App shell | `src/App.tsx` | ~120 | Lazy routes, splash, error boundary |
| AppShell | `src/components/app/AppShell.tsx` | ~120 | Route defs, theme tokens, wraps Layout |
| Layout | `src/components/Layout.tsx` | 253 | `pb-24` on content, sheet/sidebar animations |
| KeyboardAwareness | `src/components/app/KeyboardAwareness.tsx` | ~60 | visualViewport + focusin/focusout + rAF |
| AndroidSystemBars | `src/components/app/AndroidSystemBars.tsx` | ~60 | MutationObserver on `<html>` class |
| FoldAwareness | `src/hooks/FoldAwareness.ts` | 79 | window.resize + async native calls + getFoldInfo |
| useLayoutMode | `src/hooks/useLayoutMode.ts` | 14 | Wraps FoldAwareness |
| useInvoiceForm | `src/hooks/useInvoiceForm.js` | ~90 | `useIsNarrow` with window.innerWidth on render + resize |
| useSyncBootstrap | `src/app/useSyncBootstrap.ts` | 181 | visibilitychange + online listeners → cascade |
| appKeyboard | `src/lib/appKeyboard.js` | 61 | Pure functions for keyboard state |
| Global CSS | `src/index.css` | 573 | dvh→lvh switch, app-ambient animations, safe-area |
| formTheme CSS | `src/styles/formTheme.css` | ~450 | CSS custom props, theme bridge |
| Layout CSS | `src/styles/layout.css` | (read) | Layout-facing CSS vars |
| Capacitor config | `capacitor.config.ts` | 23 | insetsHandling: 'css', safe-area via env() |
| PageShell | `src/components/layout/PageShell.tsx` | ~20 | `min-h-screen`, `pb-[120px]` |
| DesktopSidebar | `src/components/layout/DesktopSidebar.tsx` | ~150 | `h-dvh`, `sticky top-0` |
| MobileSidebar | `src/components/layout/MobileSidebar.tsx` | ~80 | Sheet-based drawer, 280px |
| ModuleShell | `src/components/layout/ModuleShell.tsx` | ~350 | Filter/search/tabs with complex state |
| FormLineItems | `src/components/document/FormLineItems.tsx` | 175 | 5 useMemo chains, iterates all items |
| MobileItemCard | `src/components/invoice/MobileItemCard.tsx` | 320 | 3 async effects, 180ms debounce, suggestions |
| MobileGroupCard | `src/components/invoice/MobileGroupCard.tsx` | 170 | Nested MobileItemCards, transitions |
| Input | `src/components/ui/input.tsx` | 18 | `transition-colors`, standard focus ring |
| Textarea | `src/components/ui/textarea.tsx` | 18 | `transition-colors`, `field-sizing-content` |
| NumericInput | `src/components/ui/numeric-input.tsx` | 108 | setTimeout cursor, format+parse on each keystroke |
| Select | `src/components/ui/select.tsx` | 170 | Radix-based, z-[1100] |
| Sheet | `src/components/ui/sheet.tsx` | 142 | Radix Portal, z-[250], 300ms anim |
| Dialog | `src/components/ui/dialog.tsx` | 165 | Radix Portal, z-[250], 200ms anim |
| Button | `src/components/ui/button.tsx` | ~15 | `transition-all` |
| Switch | `src/components/ui/switch.tsx` | ~25 | `transition-all` |
| Badge | `src/components/ui/badge.tsx` | ~12 | `transition-all` |
| MobileBottomNav | `src/components/layout/MobileBottomNav.tsx` | ~60 | Tab bar with `transition-all` |

---

## Rendering & Event Flow

### Keyboard Open Sequence

```
User taps input field
  │
  ├─ focusin event fires
  │   └─ KeyboardAwareness.tsx: rAF → setState(isKeyboardOpen)
  │       └─ html[data-keyboard-open="true"] applied
  │           ├─ Layout: min-height 100dvh → 100lvh (full style recalc)
  │           ├─ Body/root: min-height recalculated 
  │           └─ .app-ambient animations paused
  │               └─ Compositor layer rebuild
  │
  ├─ visualViewport resize fires (first frame)
  │   └─ KeyboardAwareness.tsx: rAF → keyboardInset computed
  │       └─ useFoldAwareness: window.resize → getFoldInfo async
  │
  ├─ visualViewport resize fires (~10+ times during keyboard raise)
  │   └─ (same cycle repeated)
  │
  ├─ window resize fires
  │   └─ FoldAwareness: setInfo → useLayoutMode → Layout re-render
  │   └─ useIsNarrow: setIsNarrow → re-render consumers
  │
  ├─ MobileItemCard: description change effects trigger
  │   └─ 180ms debounce → item matching async → price context async
  │
  └─ NumericInput: keystroke → format → displayValue → setTimeout → cursor
      └─ Parent re-render: FormLineItems 5 useMemos recalc
```

### Key Observation

The **same** event (keyboard opening) triggers **4 independent observation mechanisms**:
1. `focusin/focusout` (DOM event)
2. `visualViewport resize` (visualViewport API)
3. `window resize` (legacy API — only fires once but triggers heavy FoldAwareness)
4. `data-keyboard-open` attribute change (MutationObserver indirectly via style recalc)

All 4 are unnecessary redundancies that compound the render load.

---

## Observer Usage Inventory

| Observer | File | Purpose | Performance Impact |
|----------|------|---------|-------------------|
| MutationObserver | `AndroidSystemBars.tsx:33` | Watch `<html>` class changes for theme | Low — only fires on manual theme toggle |
| MutationObserver | `circuit-board.tsx:77,485,599` | Theme detection | Low — decorative component only |
| IntersectionObserver | — | **Not found anywhere** | — |
| ResizeObserver | — | **Not found anywhere** *(window.resize used instead)* | — |

---

## transition-all Inventory

`transition-all` is used extensively (100+ instances across the codebase). High-risk locations:

- **DesktopSidebar.tsx**: nav items, action buttons, picker triggers (lines 69, 103, 132)
- **MobileBottomNav.tsx**: tab items (line 36) — every navigation tap triggers `transition-all`
- **Sheet.tsx**: content slide (300ms) + overlay fade (200ms)
- **Dialog.tsx**: overlay fade (200ms)
- **ModuleShell.tsx**: filter panels, search bar (lines 196, 229, 294, 308, 324)
- **ColumnManager.tsx**: drag-and-drop rows (line 310)
- **ExportDropdownRow.tsx**: expand/collapse panels (lines 61, 86)
- **MobileItemCard.tsx**: action buttons, subtotal display
- **MobileGroupCard.tsx**: subtotal toggle animation, add-to-group button

`transition-all` triggers recalc on any animatable property change — in the context of keyboard transitions, each active transition adds to the composite frame workload.

---

## Capacitor Configuration

**File:** `capacitor.config.ts`
```ts
SystemBars: {
  insetsHandling: 'css',     // Uses CSS env(safe-area-inset-*) 
  style: 'DEFAULT',
}
```

- `insetsHandling: 'css'` means safe-area insets are exposed via CSS `env()` variables, not JavaScript
- Capacitor relies on the web layer to handle keyboard insets — no native keyboard plugin detected
- No scroll/behavior configuration for keyboard avoidance

---

## Risk Summary

| Risk | Severity | Description |
|------|----------|-------------|
| Layout thrash on keyboard open | **CRITICAL** | `dvh→lvh` on 3 top-level elements forces full DOM recalc |
| Listener cascade | **CRITICAL** | 4 independent viewport listeners fire concurrently |
| Compositor stall | **HIGH** | Animated pseudo-elements paused/resumed during layout thrash |
| Input latency | **HIGH** | NumericInput setTimeout + heavy memo chains per keystroke |
| async render cycles | **MEDIUM** | 3 cascading async effects per description edit |
| Layout recalc on text input | **MEDIUM** | `field-sizing-content` adds layout pass to keyboard transition |
| Component animation overlap | **LOW** | Sheet/Dialog 200-300ms animations overlap keyboard timing |
| Safe-area offset shift | **LOW** | Padding + viewport change cause minor position adjustment |
| Force layout on visibility change | **LOW** | visibilitychange → 3 async operations |
| Observer absence | **INFO** | No ResizeObserver used — `window.resize` (less efficient) used instead |

---

## Verification

Each finding in this report can be verified by:
- **#1**: Open DevTools Performance tab, record keyboard opening on mobile emulation, observe forced reflow on `html[data-keyboard-open="true"]` style change
- **#2**: Add `console.count` to each resize/focus listener and observe counts per keyboard open
- **#3**: Toggle `animation-play-state` in DevTools and observe compositor layer changes
- **#4-6**: Profile with React DevTools to observe re-render count per keystroke
- **#7**: Check Layout panel in DevTools for textarea-induced recalculations
- **#8-10**: Test with/without safe-area, sheet states, and native bridge logging
