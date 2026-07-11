# Mobile Keyboard Rendering Investigation

This report was written by MiMoCode on 2026-07-11 via Local Runner.

---

# Executive Summary

**The two issues are RELATED BUT INDEPENDENT.**

Both issues are triggered by the Android software keyboard opening, but they originate from different architectural layers:

- **Issue A** (white form background) is caused by **missing browser-level CSS directives** — specifically the absence of `color-scheme`, `appearance: none`, and `-webkit-autofill` overrides. Without these, Android WebView applies its own native styling to form elements when the keyboard appears and focus changes. This is a **CSS/styling gap**, not a layout or positioning problem.

- **Issue B** (dialog jumping) is caused by **viewport-relative positioning combined with keyboard-triggered viewport resizing**. Dialogs use `position: fixed` + `translate(-50%, -50%)` centering, which recalculates when the viewport shrinks. Bottom sheets use `vh`/`dvh` units that change with keyboard state. This is a **layout/positioning problem**, not a styling problem.

The shared infrastructure connection is minimal: both issues touch the same form Input component and the same keyboard detection system (`KeyboardAwareness.tsx`), but the root causes live in completely different layers (CSS browser defaults vs. dialog positioning math). Fixing one will not fix the other.

---

# Issue A Investigation — Form Background Turns White

## Root Cause Candidates

### 1. Missing `color-scheme` CSS property (PRIMARY — HIGH confidence)

The codebase contains **zero instances** of the `color-scheme` CSS property across all source files. This property tells the browser what color scheme native UI elements should use (input backgrounds, scrollbars, form controls, system dialogs).

Without `color-scheme: dark` being set when in dark mode, the browser defaults to `light` for all native-rendered form element chrome. On Android WebView specifically, when an input gains focus and the keyboard appears, the browser may repaint native form element layers using its default light color scheme, producing the observed white flash.

**Evidence:**
- `grep` for `color-scheme` across all `.css`, `.tsx`, `.ts` files: **zero matches**
- `src/index.css` — 566 lines, no `color-scheme` rule
- `src/styles/formTheme.css` — 518 lines, no `color-scheme` rule
- `src/components/document-view/shared/documentViewTheme.css` — 152 lines, no `color-scheme` rule
- `tailwind.config.js` — no `color-scheme` in utilities or theme

**Confidence: HIGH**

### 2. Missing `appearance: none` on form elements (HIGH confidence)

The codebase contains **zero instances** of `appearance: none` or `-webkit-appearance: none` on `input`, `textarea`, or `select` elements. Without this, the browser applies its full native UA styling to form controls. On Android WebView, this means Material Design-styled inputs with system colors, which may include white/light backgrounds that override CSS background properties during focus/keyboard events.

The `@tailwindcss/forms` plugin is NOT installed (`tailwind.config.js` has no forms plugin), so there is no base reset for form element appearance.

**Evidence:**
- `grep` for `appearance` across all CSS files: **zero matches**
- `grep` for `-webkit-appearance` across all files: **zero matches**
- `tailwind.config.js` plugins array: only `tailwindcss-animate` (line 2, 163)
- `src/components/ui/input.tsx` — uses `bg-bd-input-bg` (theme-aware) but no `appearance: none`
- `src/components/ui/textarea.tsx` — same pattern, no `appearance: none`
- `src/components/ui/select.tsx` — same pattern, no `appearance: none`

**Confidence: HIGH**

### 3. Missing `-webkit-autofill` handling (MEDIUM confidence)

When Android WebView autofills fields or when the keyboard triggers autofill-related behavior, the browser applies a yellow/gold or white background via the `:-webkit-autofill` pseudo-class. This cannot be overridden by normal `background` CSS without explicitly targeting this pseudo-class.

**Evidence:**
- `grep` for `-webkit-autofill` across all source files: **zero matches**
- `src/components/ui/input.tsx` — no autofill override
- `src/components/ui/textarea.tsx` — no autofill override
- `src/index.css` — no `:-webkit-autofill` rule in `@layer base`

**Confidence: MEDIUM** (autofill background is typically yellow, not white; the observed symptom is specifically white, which points more to `color-scheme`/`appearance` than autofill)

### 4. Missing `::placeholder` styling (LOW confidence — contributing)

No `::placeholder` styles exist anywhere. While this doesn't directly cause the white background, it means placeholder text uses browser defaults, contributing to the overall "native feel" of unfocused inputs.

**Evidence:**
- `grep` for `::placeholder` across all CSS files: **zero matches**

**Confidence: LOW** (not a root cause, but a contributing factor to overall form appearance inconsistency)

### 5. Hardcoded `bg-white` on specific elements (LOW confidence — secondary)

Several components use hardcoded `bg-white` instead of theme tokens. While these are not the primary form inputs, they contribute to white-background artifacts when the keyboard triggers layout shifts.

**Evidence — files with hardcoded `bg-white`:**
- `src/components/UnitInput.tsx` line 104 — dropdown card: `bg-white`
- `src/components/invoice/MobileGroupCard.tsx` lines 152, 171 — chip buttons: `bg-white`
- `src/components/RichTextEditor.tsx` lines 36, 83, 144 — toolbar/editor: `bg-white`
- `src/components/document-view/shared/DocumentBrandBlock.tsx` line 31 — `bg-white dark:bg-slate-900`
- `src/components/project/ProjectDocumentSheet.tsx` line 232 — sheet header: `bg-white`
- `src/components/project/ProjectDocumentStep3Review.tsx` lines 53, 126 — buttons/containers: `bg-white`
- `src/components/ItemImageUpload.tsx` line 117 — upload area: `bg-white`
- `src/components/batch/BatchActionFooter.tsx` line 77 — button: `bg-white`
- `src/components/table-document/TableDocumentPreview.tsx` line 166 — preview: `bg-white`
- `src/components/rfq/RfqImagePreviewGrid.tsx` line 81 — button: `bg-white`
- `src/components/export/ExportDropdownRow.tsx` line 61 — `bg-white dark:bg-slate-900`
- `src/components/project/ProjectActionRail.tsx` line 100 — dropdown: `bg-white`

**Confidence: LOW** (these are secondary issues; the primary form inputs are correctly themed via `bg-bd-input-bg`)

### 6. What is NOT causing Issue A

The following have been ruled out by evidence:

- **Shared Input component** — `src/components/ui/input.tsx` uses `bg-bd-input-bg` which resolves to `hsl(var(--background))` via the CSS variable chain. Theme-aware. NOT the cause.
- **Shared Textarea component** — `src/components/ui/textarea.tsx` uses `bg-bd-input-bg`. Theme-aware. NOT the cause.
- **Shared Select component** — `src/components/ui/select.tsx` uses `bg-bd-surface` and `bg-bd-card-bg`. Theme-aware. NOT the cause.
- **Theme variables** — `--bd-input-bg` is correctly defined in `src/styles/formTheme.css` line 14 as `var(--background)`. Theme presets in `src/lib/themePresets.ts` provide per-theme values. NOT the cause.
- **Tailwind utilities** — `bd-input-bg` is correctly mapped in `tailwind.config.js` lines 59-61. NOT the cause.
- **Parent form containers** — `SharedDocumentForm.tsx` and `WaybillForm.tsx` both use `.bd-form-shell` which resolves to `var(--bd-bg)` → `hsl(var(--bd-app-bg))`. Theme-aware. NOT the cause.
- **Global form CSS** — There are NO global `input:focus`, `textarea:focus`, or `select:focus` rules that set backgrounds. NOT the cause.

## Evidence Summary — Issue A

| Candidate | File(s) | Evidence | Confidence |
|---|---|---|---|
| Missing `color-scheme` | `src/index.css`, `src/styles/formTheme.css` | Zero instances in codebase | **HIGH** |
| Missing `appearance: none` | `src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx` | No appearance reset on any form element | **HIGH** |
| Missing `-webkit-autofill` | All form component files | Zero handling anywhere | **MEDIUM** |
| Missing `::placeholder` | All CSS files | Zero placeholder styles | **LOW** |
| Hardcoded `bg-white` | 15+ component files | Theme-unaware backgrounds | **LOW** |

---

# Issue B Investigation — Popup / Dialog Keyboard Glitch

## Root Cause Candidates

### 1. Dialog centering via `position: fixed` + `translate(-50%, -50%)` (PRIMARY — HIGH confidence)

Both `DialogContent` and `AlertDialogContent` center themselves using:
```
fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
```

When the Android keyboard opens:
1. `visualViewport.height` shrinks (e.g., 800px → 480px)
2. The browser recalculates `top: 50%` against the new viewport height
3. The `-translate-y-50%` is also recalculated
4. The dialog shifts position because 50% of the new viewport ≠ 50% of the old viewport
5. During the keyboard animation, multiple resize events fire, causing repeated jumps

For **small dialogs**: the shift happens once and stabilizes (dialog fits above keyboard).
For **larger dialogs**: continuous reflow occurs because the dialog content exceeds the visible area, causing repeated scroll-into-view attempts and viewport recalculations.

**Evidence:**
- `src/components/ui/dialog.tsx` line 65: `className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[250] ..."`
- `src/components/ui/alert-dialog.tsx` line 61: same pattern
- No `visualViewport` API usage in either component
- No keyboard-aware positioning logic
- Radix UI DialogPrimitive handles scroll-lock but NOT viewport-relative repositioning

**Confidence: HIGH**

### 2. Bottom sheets using `vh`/`dvh` height constraints (HIGH confidence)

Multiple bottom sheets use viewport-relative height constraints that change when the keyboard opens:

| Component | File | Line | Constraint |
|---|---|---|---|
| Import dialog | `src/components/import/JsonImportLayout.tsx` | 351 | `max-h-[94vh]` |
| Table Settings | `src/components/ColumnManager.tsx` | 509 | `max-h-[90dvh]` |
| Document Sheet | `src/components/document-view/shared/DocumentSheet.tsx` | 60 | `max-h-[88vh]` |
| Action Sheet | `src/components/actions/UnifiedActionSheet.tsx` | — | `max-h-[75vh]` |

When the keyboard opens on Android:
- `100vh` = full layout viewport (may or may not shrink depending on `interactive-widget` setting)
- `100dvh` = dynamic viewport height (definitely shrinks with keyboard)
- The sheet height constraint changes, content reflows, and the sheet visually shifts/jumps

**Evidence:**
- `src/index.html` line 9: viewport meta includes `interactive-widget=resizes-content` — this means the content area IS resized by the keyboard, so `dvh` units will shrink
- `src/components/ColumnManager.tsx` line 509: `max-h-[90dvh]` — uses `dvh` which shrinks with keyboard
- `src/components/import/JsonImportLayout.tsx` line 351: `max-h-[94vh]` — uses `vh` which on Android with `resizes-content` may also shrink
- `src/components/document-view/shared/DocumentSheet.tsx` line 60: `max-h-[88vh]`

**Confidence: HIGH**

### 3. `KeyboardAwareness` detects keyboard but provides no positioning hooks (MEDIUM confidence)

The existing keyboard detection system correctly identifies keyboard state but provides zero actionable hooks for dialogs/sheets to respond to.

**Evidence:**
- `src/components/app/KeyboardAwareness.tsx` (33 lines):
  - Sets `document.documentElement.dataset.keyboardOpen` (line 8)
  - Sets `--app-keyboard-inset` CSS variable (line 9)
  - Listens to `window.visualViewport` resize events (line 24)
- `src/lib/appKeyboard.js` (61 lines):
  - `getKeyboardViewportState()` calculates keyboard inset from `visualViewport.height` vs `innerHeight` (line 53)
  - `isOpen` determined by `isEditableElement(activeElement) && keyboardInset > 120` (line 54)
- `src/index.css` lines 546-549: The ONLY CSS rule using keyboard state pauses ambient animations — **zero rules adjust dialog/sheet positioning**
- No dialog or sheet component reads `--app-keyboard-inset` or `data-keyboard-open`

**Confidence: MEDIUM** (the detection works; the gap is that nothing consumes the data for positioning)

### 4. Radix UI scroll-lock interaction (LOW confidence)

Radix UI Dialog/Sheet primitives add `overflow: hidden` on `<body>` when open. On Android WebView, this can interact with the keyboard resize behavior, potentially causing layout recalculations.

**Evidence:**
- Radix UI `DialogPrimitive.Root` manages body scroll-lock internally
- `src/components/ui/dialog.tsx` line 43: overlay has `fixed inset-0` — covers full viewport
- `src/components/ui/sheet.tsx` line 39: overlay has `fixed inset-0`
- No custom scroll-lock logic in the codebase — all delegated to Radix

**Confidence: LOW** (Radix scroll-lock is well-tested; unlikely to be the primary cause)

### 5. What is NOT causing Issue B

- **CSS transforms for positioning** — The `translate(-50%, -50%)` is the centering mechanism, not a separate animation. The issue is that this transform recalculates on viewport change, not that transforms themselves are buggy.
- **`overflow: hidden` on body** — This is Radix's scroll-lock, which is correct behavior. It doesn't cause jumping.
- **`env(safe-area-inset-*)`** — Used only in footer padding, not in dialog positioning. NOT the cause.
- **`100dvh` in global CSS** — Used for `min-height` on `html`/`body`/`#root` (index.css lines 142, 164, 173). These set the page minimum height, not dialog height. NOT the direct cause (though they contribute to the overall viewport behavior).

## Evidence Summary — Issue B

| Candidate | File(s) | Evidence | Confidence |
|---|---|---|---|
| Dialog fixed+translate centering | `dialog.tsx:65`, `alert-dialog.tsx:61` | Recalculates on viewport resize | **HIGH** |
| Bottom sheet `vh`/`dvh` constraints | `JsonImportLayout.tsx:351`, `ColumnManager.tsx:509`, `DocumentSheet.tsx:60` | Height changes with keyboard | **HIGH** |
| Keyboard detection without positioning hooks | `KeyboardAwareness.tsx`, `appKeyboard.js` | Data set but never consumed | **MEDIUM** |
| Radix scroll-lock interaction | All dialog/sheet components | Body overflow:hidden on open | **LOW** |

---

# Shared Component Inventory

| Component | File | Role | Issue A | Issue B |
|---|---|---|---|---|
| **Input** | `src/components/ui/input.tsx` (19 lines) | Shared text input primitive. Uses `bg-bd-input-bg` (theme-aware). Focus ring via `focus-visible:ring-2`. | Properly themed; missing `appearance: none` and `color-scheme` | N/A |
| **Textarea** | `src/components/ui/textarea.tsx` (18 lines) | Shared textarea primitive. Identical styling pattern to Input. | Properly themed; same CSS gaps as Input | N/A |
| **Select** | `src/components/ui/select.tsx` (194 lines) | Radix Select wrapper with Trigger, Content, Item, ScrollButton subcomponents. All use BD tokens. | Properly themed | N/A |
| **Dialog** | `src/components/ui/dialog.tsx` (165 lines) | Radix Dialog wrapper. Content uses `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`. Portal-based. | N/A | Primary cause of jumping — centering recalculates on viewport resize |
| **AlertDialog** | `src/components/ui/alert-dialog.tsx` (209 lines) | Radix AlertDialog wrapper. Same centering pattern as Dialog. | N/A | Same centering vulnerability |
| **Sheet** | `src/components/ui/sheet.tsx` (142 lines) | Radix Sheet wrapper (side drawer). Bottom sheets use `vh`/`dvh` constraints. | N/A | Height constraints change with keyboard |
| **Popover** | `src/components/ui/popover.tsx` (87 lines) | Radix Popover wrapper. Floating positioning relative to trigger. | N/A | May reposition when trigger moves |
| **KeyboardAwareness** | `src/components/app/KeyboardAwareness.tsx` (33 lines) | Detects keyboard via `visualViewport` API. Sets `data-keyboard-open` and `--app-keyboard-inset`. | Does not adjust form styling | Does not adjust dialog positioning |
| **appKeyboard** | `src/lib/appKeyboard.js` (61 lines) | Keyboard state calculation. `getKeyboardViewportState()` returns inset, isOpen, activeElement info. | Utility only | Detection works; no positioning hooks provided |
| **Layout** | `src/components/Layout.tsx` (298 lines) | App shell with sidebar, bottom nav, content area. | Body background is theme-aware | No keyboard-aware viewport handling |
| **AppShell** | `src/components/app/AppShell.tsx` (220 lines) | Top-level route renderer. Lazy-loads KeyboardAwareness, AndroidSystemBars, AndroidFoldAwareness. | Theme applied via `applyThemeTokenBundle()` | No dialog/keyboard coordination |
| **Theme tokens** | `src/lib/themeTokens.ts` (268 lines) | Runtime CSS variable application via `applyThemeTokenBundle()`. | Input bg correctly themed | N/A |
| **Theme presets** | `src/lib/themePresets.ts` (1435 lines) | 26 theme presets defining all BD tokens including `bd-input-bg`. | Per-theme input backgrounds correctly defined | N/A |
| **formTheme.css** | `src/styles/formTheme.css` (518 lines) | BD semantic token bridge, layout rules, `.bd-form-shell`. `--bd-input-bg: var(--background)`. | Theme-aware; no `color-scheme` or `appearance` rules | N/A |
| **index.css** | `src/index.css` (566 lines) | Tailwind directives, CSS variables, base layer, ambient animations. | No form element base styles; no `color-scheme` | Keyboard state only pauses animations |

---

# Architectural Findings

## How keyboard appearance changes the rendering pipeline

On Android with `interactive-widget=resizes-content` (set in `index.html` line 9):

1. User taps an input inside a dialog/sheet
2. Android WebView fires `visualViewport.resize` event
3. `KeyboardAwareness.tsx` debounce-fires at 30ms, calls `getKeyboardViewportState()`
4. `appKeyboard.js` calculates keyboard inset from `visualViewport.height - innerHeight - viewportOffsetTop`
5. `data-keyboard-open="true"` and `--app-keyboard-inset` are set on `<html>`
6. The only CSS response is pausing ambient animations (`index.css` lines 546-549)
7. **Meanwhile**, the browser simultaneously:
   - Resizes the content area (because `interactive-widget=resizes-content`)
   - Recalculates all `vh`/`dvh` units
   - Recalculates `position: fixed` + percentage-based positioning
   - May trigger Radix UI's scroll-lock (body `overflow: hidden`)
   - May attempt to scroll the focused element into view
8. Dialogs using `top: 50%; transform: translateY(-50%)` jump because 50% of the new (smaller) viewport is a different pixel value
9. Bottom sheets using `max-h-[90dvh]` shrink because `dvh` is now smaller
10. Multiple resize events during keyboard animation cause repeated recalculations → continuous jumping for large dialogs

## Whether Android WebView behaves differently from Chrome

**Yes, in several critical ways:**

1. **`interactive-widget=resizes-content`** — This viewport meta directive (index.html line 9) is Android-specific. It tells the WebView to resize the content area when the keyboard opens, rather than overlaying the keyboard. Desktop Chrome does not have a software keyboard, so this behavior is never triggered there.

2. **`visualViewport` behavior** — On Android WebView, `window.visualViewport.height` shrinks when the keyboard opens. `window.innerHeight` may or may not change depending on the `interactive-widget` setting. The `appKeyboard.js` calculation relies on both values (line 53: `layoutViewportHeight - viewportHeight - viewportOffsetTop`).

3. **Native form element rendering** — Android WebView uses Chromium but applies Android-specific UA styles to form elements. Without `color-scheme` and `appearance: none`, the WebView may paint native Material Design-styled inputs with system colors, which differ from desktop Chrome's rendering.

4. **`overflow: hidden` on body** — Radix UI's scroll-lock sets `overflow: hidden` on `<body>`. On Android WebView, this interacts with the keyboard resize behavior differently than on desktop Chrome, potentially causing layout recalculations.

## Whether Capacitor changes behaviour

**Minimally, but with one significant contribution:**

1. **`capacitor.config.ts`** sets `SystemBars.insetsHandling: 'css'` — this delivers safe area insets via CSS `env()` variables. It does not affect keyboard behavior.

2. **`android/app/src/main/res/values/styles.xml`** sets `android:windowBackground` to `@android:color/white` (line 5). This means any pre-WebView flash or splash screen shows white regardless of the app theme. This could be perceived as the "white background" issue during initial load, though the reported symptom is specifically during keyboard appearance.

3. **Capacitor's WebView** is based on Android System WebView (Chromium). The keyboard behavior is determined by the WebView's `interactive-widget` handling and the Android OS, not by Capacitor itself. Capacitor does not inject any keyboard-specific behavior.

## Whether viewport resizing contributes

**Yes — this is the primary mechanism for Issue B:**

- `interactive-widget=resizes-content` in `index.html` causes the WebView content area to shrink when the keyboard opens
- All `vh`/`dvh` units recalculate against the new viewport dimensions
- `position: fixed` elements with percentage-based positioning (like `top: 50%`) recalculate
- `translate(-50%, -50%)` recalculates against the new element/viewport dimensions
- Multiple resize events during the keyboard slide-in animation cause repeated recalculations

**For Issue A**, viewport resizing is NOT the primary mechanism. The white background appears because the browser repaints native form element layers during the focus/keyboard event, not because of viewport dimension changes.

## Whether browser-native styling contributes

**Yes — this is the primary mechanism for Issue A:**

Without `color-scheme`, `appearance: none`, and `-webkit-autofill` overrides:
- The browser retains full control over form element rendering
- On Android WebView, native form elements may use Material Design styling with white/light backgrounds
- When the keyboard opens and focus changes, the browser may repaint these native layers
- The CSS `background-color` set via `bg-bd-input-bg` may be overridden by the browser's native layer during this repaint
- This is especially visible during the keyboard animation when the browser is actively reflowing and repainting

---

# Recommended Fix Strategy

## Issue A — Fix separately, first

Issue A is a CSS-level fix with no layout implications. It should be addressed first because:
1. It affects all form elements everywhere, not just dialogs
2. The fix is additive (adding CSS rules, not changing existing ones)
3. It has zero risk of introducing layout regressions

**Recommended approach:**

1. **Add `color-scheme` to `:root` and `.dark` in `src/index.css`:**
   - `:root { color-scheme: light; }` in the light variable block
   - `.dark { color-scheme: dark; }` in the dark variable block
   - Also handle custom theme presets by setting `color-scheme` dynamically in `themeTokens.ts`

2. **Add form element resets to `src/index.css` `@layer base`:**
   - `input, textarea, select { appearance: none; -webkit-appearance: none; }`
   - `:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px hsl(var(--bd-input-bg)) inset; -webkit-text-fill-color: hsl(var(--bd-foreground)); }`

3. **Replace hardcoded `bg-white` instances** with theme-aware tokens (`bg-bd-surface`, `bg-bd-card-bg`, etc.) in the 15+ files identified.

## Issue B — Fix separately, after Issue A

Issue B requires structural changes to dialog/sheet positioning logic. It should be fixed after Issue A because:
1. It involves changing positioning behavior, which carries higher regression risk
2. The fix may need to coordinate across Dialog, AlertDialog, and Sheet components
3. Testing requires actual Android device interaction

**Recommended approach:**

1. **Replace translate-based centering with flexbox centering in `dialog.tsx` and `alert-dialog.tsx`:**
   - Instead of `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, use:
     ```
     fixed inset-0 flex items-center justify-center
     ```
   - This positions the dialog relative to the visible viewport without percentage-based translate that recalculates on resize

2. **Replace `vh`/`dvh` height constraints on bottom sheets with `calc()` using `--app-keyboard-inset`:**
   - `max-h-[94vh]` → `max-h-[calc(100dvh-var(--app-keyboard-inset,0px)-2rem)]`
   - This uses the already-detected keyboard inset from `KeyboardAwareness.tsx`

3. **Add `will-change: transform` to dialog content** to promote it to a compositor layer and reduce repaint during viewport changes.

4. **Consider using `visualViewport` directly** in dialog/sheet components for positioning, rather than relying on CSS viewport units. The `KeyboardAwareness` system already exposes this data.

## Shared infrastructure coordination

If fixing both issues, the `KeyboardAwareness` system (`src/components/app/KeyboardAwareness.tsx`) should be enhanced to:
1. Set `color-scheme` on `<html>` when keyboard state changes (for Issue A)
2. Expose keyboard inset as a CSS variable that dialog/sheet positioning can consume (for Issue B — already partially done via `--app-keyboard-inset`)

The `--app-keyboard-inset` variable is already set but never consumed by any dialog or sheet component. Making sheet height constraints use this variable would close the gap for Issue B without modifying the keyboard detection logic itself.

---

# Verification

- **Before investigation:** `git status` showed only `.mimocode/.cron-lock` modified (clean working tree).
- **After investigation:** `git status` shows the same state plus the new report file at `docs/Reports/GENERAL/mobile-keyboard-rendering-investigation.md`.
- **No application source files were modified.**
- **No `bun run build` or `bun run typecheck` was executed** (read-only investigation per prompt instructions).
