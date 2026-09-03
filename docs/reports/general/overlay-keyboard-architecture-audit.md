# Overlay Keyboard Architecture Audit

This report was written by MiMoCode on 2026-07-11 via Local Runner.

---

# 1. Executive Summary

BIGDROPS has a complete keyboard detection pipeline (`KeyboardAwareness.tsx` + `appKeyboard.js`) that correctly computes keyboard inset and writes it to `--app-keyboard-inset` on `<html>`. However, **no overlay component in the entire codebase consumes this value**. The variable is infrastructure that was built but never wired to any consumer.

Every overlay — Dialog, AlertDialog, Sheet, and 10+ custom implementations — uses `position: fixed` with either translate-centering or `vh`-based max-heights. When the Android keyboard opens and the viewport resizes, these fixed-position overlays recalculate against the new viewport dimensions, causing the observed jumping instability.

The architecture does NOT need new abstractions. The existing primitives (`dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`) and the existing keyboard infrastructure (`--app-keyboard-inset`, `data-keyboard-open`) provide everything needed. The fix is to wire existing CSS variables into existing overlay CSS via targeted, component-level changes.

---

# 2. Viewport Pattern Inventory

## 2.1 Viewport Unit Usage

| Unit | Count | Files |
|------|-------|-------|
| `100vh` | 6 | InvoiceWorkspace.module.css, DocumentPage.module.css, formTheme.css, combobox.tsx, RfqEditor.tsx, BoqEditor.tsx |
| `100dvh` | 6 | index.css (x3), formTheme.css, ItemLibraryPage.tsx, SettingsShell.tsx |
| `100svh` | 0 | (none) |
| `vh` in max-height | 14 unique | Various sheets, overlays, panels |
| `dvh` in max-height | 2 | ColumnManager.tsx (x2) |

**Inconsistency:** Only `ColumnManager.tsx` uses `dvh` (dynamic viewport height). All other 14 max-height instances use `vh`, which does not shrink when the keyboard opens on Android.

## 2.2 Centering Pattern Usage

| Strategy | Components | Files |
|----------|-----------|-------|
| `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` | DialogContent, AlertDialogContent | dialog.tsx:65, alert-dialog.tsx:61 |
| `fixed inset-0` + flex center | WaybillGatewayOverlay, SplashOverlay, ProjectLinkDialog, UserSettingsSection, AdminSettingsSection, TableDocumentExportController, BusinessSwitcher | 7 custom overlays |
| `fixed inset-0` + flex end | WaybillFormOverlay, BusinessSwitcher (mobile), AdminSettingsSection (mobile) | 3 custom overlays |
| Radix floating-ui | Popover, DropdownMenu, Select, Tooltip | popover.tsx, dropdown-menu.tsx, select.tsx, tooltip.tsx |
| Side-aware fixed | SheetContent (top/right/bottom/left) | sheet.tsx:64 |

## 2.3 visualViewport API Usage

The `visualViewport` API is used in exactly 2 production files:
- `src/components/app/KeyboardAwareness.tsx` — listens for `resize` events
- `src/lib/appKeyboard.js` — reads `visualViewport.height` and `visualViewport.offsetTop`

**No overlay component uses `visualViewport` directly.**

---

# 3. Overlay Integration Matrix

| Component | File | Positioning Strategy | Uses Keyboard Metadata? | Viewport Dependent? | Primary Risk |
|-----------|------|---------------------|------------------------|--------------------|----|
| **DialogContent** | `ui/dialog.tsx:65` | fixed + translate center | **NO** | fixed positioning, translate centering | Dialog jumps when viewport shrinks |
| **AlertDialogContent** | `ui/alert-dialog.tsx:61` | fixed + translate center | **NO** | fixed positioning, translate centering | Same as Dialog |
| **SheetContent** | `ui/sheet.tsx:64` | fixed + side-aligned | **NO** | fixed positioning | Bottom sheet height doesn't adjust |
| **PopoverContent** | `ui/popover.tsx` | Radix floating-ui | **NO** | floating-ui auto-position | May reposition on viewport change |
| **DropdownMenuContent** | `ui/dropdown-menu.tsx` | Radix floating-ui | **NO** | floating-ui auto-position | Uses `--radix-*-available-height` |
| **SelectContent** | `ui/select.tsx` | Radix floating-ui | **NO** | floating-ui auto-position | Uses `--radix-select-content-available-height` |
| **DocumentSheet** | `document-view/shared/DocumentSheet.tsx:60` | Sheet (bottom/right) | **NO** | `max-h-[88vh]` | Height doesn't adjust with keyboard |
| **UnifiedActionSheet** | `actions/UnifiedActionSheet.tsx:193` | Sheet bottom | **NO** | `max-h-[75vh]` | Height doesn't adjust with keyboard |
| **ProjectDocumentSheet** | `project/ProjectDocumentSheet.tsx:231` | Sheet bottom | **NO** | `max-h-[94vh]` | Height doesn't adjust with keyboard |
| **ColumnManager** | `ColumnManager.tsx:509` | Sheet bottom | **NO** | `max-h-[90dvh]` | Only overlay using `dvh` — may partially work |
| **InvoiceAdvanceSheet** | `invoice/view/InvoiceAdvanceSheet.tsx:124` | Sheet (bottom/right) | **NO** | `max-h-[88vh]` | Height doesn't adjust with keyboard |
| **JsonImportLayout** | `import/JsonImportLayout.tsx:351` | Sheet (bottom/right) | **NO** | `max-h-[94vh]` | Height doesn't adjust with keyboard |
| **WaybillFormOverlay** | `waybill/WaybillFormOverlay.tsx:41` | Manual fixed + flex end | **NO** | `max-h-[92vh]` | Height doesn't adjust with keyboard |
| **WaybillGatewayOverlay** | `waybill/WaybillGatewayOverlay.tsx:35` | Manual fixed + flex center | **NO** | fixed positioning | Dialog jumps when viewport shrinks |
| **ClientSelector** | `ClientSelector.tsx:167` | Dialog | **NO** | `max-h-[85vh]` | Height doesn't adjust with keyboard |
| **DocumentActionSheets** | `document/DocumentActionSheets.tsx:145,233` | Sheet bottom | **NO** | `h-[50vh] max-h-[50vh]` | Height doesn't adjust with keyboard |
| **LinkedDocumentsSheet** | `document/LinkedDocumentsSheet.tsx:59` | Sheet bottom | **NO** | `max-h-[min(76vh,680px)]` | Height doesn't adjust with keyboard |
| **AttachExistingDocumentSheet** | `document/AttachExistingDocumentSheet.tsx:221` | Sheet bottom | **NO** | `max-h-[min(78vh,700px)]` | Height doesn't adjust with keyboard |
| **GlobalSearch** | `layout/GlobalSearch.tsx:117` | Fixed (mobile) | **NO** | `w-[calc(100vw-32px)]` | Width viewport-dependent |
| **BusinessSwitcher** | `layout/BusinessSwitcher.tsx:26` | Manual fixed + flex end | **NO** | fixed positioning | May shift with keyboard |
| **ProjectLinkDialog** | `project/detail/ProjectLinkDialog.tsx:21` | Manual fixed + flex center | **NO** | fixed positioning | Dialog jumps when viewport shrinks |
| **UserSettingsSection (password)** | `pages/settings/UserSettingsSection.tsx:195` | Manual fixed + flex center | **NO** | fixed positioning | Dialog jumps when viewport shrinks |
| **AdminSettingsSection (confirm)** | `pages/settings/AdminSettingsSection.tsx:173` | Manual fixed + flex end | **NO** | fixed positioning | May shift with keyboard |

**Critical finding: ZERO overlay components consume keyboard metadata.** Not one reads `--app-keyboard-inset`, `data-keyboard-open`, or imports `KeyboardAwareness`/`appKeyboard`.

---

# 4. Runtime Keyboard Flow Diagram

```
Android keyboard opens
        │
        ▼
visualViewport fires "resize" event
        │
        ▼
KeyboardAwareness.tsx: onViewportChange()
  [30ms debounce]
        │
        ▼
syncKeyboardState()
  calls getKeyboardViewportState()  (appKeyboard.js)
    ├─ layoutViewportHeight = max(innerHeight, clientHeight)
    ├─ viewportHeight = visualViewport.height
    ├─ keyboardInset = round(layoutViewportHeight - viewportHeight - offsetTop)
    └─ isOpen = isEditableElement(activeElement) && keyboardInset > 120
        │
        ▼
Writes to <html>:
  1. data-keyboard-open = "true" | "false"
  2. --app-keyboard-inset = "<N>px"
        │
        ├─ CSS consumer: index.css:577-580
        │   └─ Pauses .app-ambient animations (GPU savings)
        │
        └─ NO OTHER CONSUMERS
            ├─ --app-keyboard-inset: SET BUT NEVER READ
            ├─ data-keyboard-open: ONLY consumed by animation pause
            └─ No overlay, dialog, sheet, or popover reads either value

Meanwhile, independently:
  AndroidBackHandler.tsx → getKeyboardViewportState() → dismiss keyboard on back press
  sidebar.tsx → shouldIgnoreGlobalHotkeys() → skip Ctrl+B while typing
```

**Where the flow stops being useful:** After `KeyboardAwareness.tsx` writes `--app-keyboard-inset` to `<html>`, the value is never consumed by any CSS rule or React component. This is the exact point where keyboard metadata becomes dead infrastructure.

---

# 5. Viewport Compatibility Matrix

| Component | Depends on | Android Chrome | Android WebView (Capacitor) | Desktop Chrome | Risk |
|-----------|-----------|---------------|---------------------------|---------------|------|
| DialogContent | fixed + translate | Jumps on keyboard | **Jumps on keyboard** | Stable (no keyboard) | HIGH on mobile |
| AlertDialogContent | fixed + translate | Jumps on keyboard | **Jumps on keyboard** | Stable | HIGH on mobile |
| SheetContent (bottom) | fixed + side-aligned | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| DocumentSheet (mobile) | `max-h-[88vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| UnifiedActionSheet | `max-h-[75vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| ProjectDocumentSheet | `max-h-[94vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| ColumnManager | `max-h-[90dvh]` | **Partially adapts** (dvh shrinks) | **Partially adapts** | Stable | MEDIUM |
| InvoiceAdvanceSheet | `max-h-[88vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| JsonImportLayout | `max-h-[94vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| WaybillFormOverlay | `max-h-[92vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| ClientSelector | `max-h-[85vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| DocumentActionSheets | `h-[50vh]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| LinkedDocumentsSheet | `max-h-[min(76vh,680px)]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| AttachExistingDocumentSheet | `max-h-[min(78vh,700px)]` | Overflows keyboard | **Overflows keyboard** | Stable | HIGH on mobile |
| Popover/Dropdown/Select | Radix floating-ui | Auto-repositions | **Auto-repositions** | Stable | LOW (Radix handles) |
| WaybillGatewayOverlay | fixed + flex center | Jumps on keyboard | **Jumps on keyboard** | Stable | HIGH on mobile |
| ProjectLinkDialog | fixed + flex center | Jumps on keyboard | **Jumps on keyboard** | Stable | HIGH on mobile |

**Key insight:** Radix Popover, DropdownMenu, and Select use `@floating-ui` which auto-repositions relative to the trigger element. These are inherently more stable because they don't use viewport-relative centering. The problem is concentrated in `fixed` + `translate` centering (Dialog/AlertDialog) and `vh`-based max-heights (Sheet-based bottom sheets).

---

# 6. Duplication Analysis

## 6.1 Centering Logic Duplication

**Identical implementations (2 files):**
- `dialog.tsx:65` — `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[250]`
- `alert-dialog.tsx:61` — `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50`

These are structurally identical except for z-index (`z-[250]` vs `z-50`). Both center content using the same CSS transform pattern.

**Slightly divergent implementations (7 files):**
- 7 custom overlays use `fixed inset-0` + `flex items-center justify-center` for centering
- Each has different z-index values (z-50, z-[60], z-[70], z-[999], z-[9999])
- Each handles backdrop/scrim differently (different bg-black opacities, different blur values)

## 6.2 Max-Height Viewport Duplication

**17 instances** across 14 files use `max-h-[...vh]` or `max-h-[...dvh]`. All follow the same pattern: a Sheet bottom sheet with a viewport-relative max-height. The values differ (50vh to 94vh) but the mechanism is identical.

**Substantially different:** Only `ColumnManager.tsx` uses `dvh` instead of `vh`. All others use `vh`.

## 6.3 Keyboard Handling Duplication

**No duplication exists** — there is only ONE keyboard detection implementation (`KeyboardAwareness.tsx` + `appKeyboard.js`). The problem is not duplication but rather the absence of consumption.

## 6.4 Overlay Sizing Logic Duplication

Two custom overlays (`WaybillGatewayOverlay.tsx` and `WaybillFormOverlay.tsx`) duplicate the same mount/animation lifecycle pattern:
- Both use `createPortal(..., document.body)`
- Both implement `mounted`/`visible` state with double `requestAnimationFrame`
- Both have manual 200ms unmount timeout
- Both handle scrim click and Escape key manually

This is a clear duplication that could be consolidated, but it is NOT related to the keyboard issue.

---

# 7. Migration Impact Assessment

## Classification

| Component | Classification | Migration Complexity |
|-----------|---------------|---------------------|
| `ui/dialog.tsx` | **C** — Existing component enhancement | Low (CSS variable in max-height/position) |
| `ui/alert-dialog.tsx` | **C** — Existing component enhancement | Low (same pattern as dialog) |
| `ui/sheet.tsx` | **C** — Existing component enhancement | Low (CSS variable in side-aligned positioning) |
| `DocumentSheet.tsx` | **B** — CSS-only changes | Low (replace `88vh` with calc using `--app-keyboard-inset`) |
| `UnifiedActionSheet.tsx` | **B** — CSS-only changes | Low (replace `75vh` with calc) |
| `ProjectDocumentSheet.tsx` | **B** — CSS-only changes | Low (replace `94vh` with calc) |
| `InvoiceAdvanceSheet.tsx` | **B** — CSS-only changes | Low (replace `88vh` with calc) |
| `JsonImportLayout.tsx` | **B** — CSS-only changes | Low (replace `94vh` with calc) |
| `ColumnManager.tsx` | **B** — CSS-only changes | Low (already uses `dvh`, minor adjustment) |
| `ClientSelector.tsx` | **B** — CSS-only changes | Low (replace `85vh` with calc) |
| `DocumentActionSheets.tsx` | **B** — CSS-only changes | Low (replace `50vh` with calc) |
| `LinkedDocumentsSheet.tsx` | **B** — CSS-only changes | Low (replace `min(76vh,680px)` with calc) |
| `AttachExistingDocumentSheet.tsx` | **B** — CSS-only changes | Low (replace `min(78vh,700px)` with calc) |
| `WaybillFormOverlay.tsx` | **B** — CSS-only changes | Low (replace `92vh` with calc) |
| `WaybillGatewayOverlay.tsx` | **B** — CSS-only changes | Low (replace centering with flex) |
| `ProjectLinkDialog.tsx` | **B** — CSS-only changes | Low (replace centering with flex) |
| `UserSettingsSection.tsx` | **B** — CSS-only changes | Low (replace centering with flex) |
| `AdminSettingsSection.tsx` | **B** — CSS-only changes | Low (replace centering with flex) |
| `BusinessSwitcher.tsx` | **B** — CSS-only changes | Low (replace centering with flex) |
| `GlobalSearch.tsx` | **A** — No changes required | N/A (not affected by keyboard) |
| `ui/popover.tsx` | **A** — No changes required | N/A (Radix auto-repositions) |
| `ui/dropdown-menu.tsx` | **A** — No changes required | N/A (Radix auto-repositions) |
| `ui/select.tsx` | **A** — No changes required | N/A (Radix auto-repositions) |
| `ui/tooltip.tsx` | **A** — No changes required | N/A (Radix auto-repositions) |
| `DashboardQuickTilesSettings.tsx` | **B** — CSS-only changes | Low (replace `60vh` with calc) |
| `WaybillSignatures.tsx` | **B** — CSS-only changes | Low (replace `55vh` with calc) |
| `WaybillForm.tsx` (settings modal) | **B** — CSS-only changes | Low (replace `60vh` with calc) |
| `Combobox.tsx` (list) | **B** — CSS-only changes | Low (replace `100vh` calc with `dvh` calc) |

## Summary

- **A (No changes):** 5 components (Popover, Dropdown, Select, Tooltip, GlobalSearch)
- **B (CSS-only):** 17 components (all Sheet-based and custom overlays with vh/fixed positioning)
- **C (Component enhancement):** 3 components (Dialog, AlertDialog, Sheet primitives)
- **D (TS/React logic):** 0 components

**Total estimated effort:** Low. All changes are CSS-level substitutions using the existing `--app-keyboard-inset` variable.

---

# 8. Architectural Conclusion

The evidence clearly shows:

1. **The keyboard detection infrastructure is complete and correct.** `KeyboardAwareness.tsx` + `appKeyboard.js` properly compute keyboard inset and write it to CSS variables and DOM attributes.

2. **The infrastructure was never wired to consumers.** `--app-keyboard-inset` is set but never read. `data-keyboard-open` is only consumed by one animation-pause rule.

3. **The overlay primitives are well-structured.** Dialog, AlertDialog, and Sheet are clean Radix wrappers. The positioning is CSS-only (Tailwind classes), making it straightforward to modify.

4. **The problem is mechanical, not architectural.** Overlays use `fixed` positioning and `vh` units that don't account for keyboard state. The fix is to substitute these with values that incorporate `--app-keyboard-inset`.

5. **No new abstractions are warranted.** The existing primitives, CSS variables, and keyboard infrastructure provide everything needed. A wrapper component or new context provider would add complexity without solving anything that CSS `calc()` cannot handle.

6. **The fix scope is narrow.** Only 3 primitive components (Dialog, AlertDialog, Sheet) and ~17 consumer components need CSS changes. Radix Popover, Dropdown, Select, and Tooltip are inherently stable.

---

## Recommendation

**Option A: Enhance existing primitives using the existing keyboard infrastructure.**

The evidence overwhelmingly supports this approach:

- `--app-keyboard-inset` already exists and is already computed on every keyboard event
- Dialog/AlertDialog/Sheet are clean CSS-positioned primitives that can be modified with minimal risk
- The fix for translate-centering is: replace `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` with `fixed inset-0 flex items-center justify-center` (flex centering is keyboard-stable because it uses the visible viewport, not percentage-based translate)
- The fix for vh-based max-heights is: replace `max-h-[88vh]` with `max-h-[calc(100dvh-var(--app-keyboard-inset,0px))]` (uses the existing CSS variable)
- Radix Popover/Dropdown/Select/Tooltip need no changes (floating-ui auto-repositions)
- No new components, contexts, hooks, or providers are needed
- Total scope: 3 primitive files + ~17 consumer files, all CSS-only changes

Option B (new abstraction) is not warranted because the existing primitives already support the required behavior through CSS alone. Option C (targeted fixes only) would leave the primitives inconsistent and require per-component workarounds instead of fixing the root cause in the 3 shared primitives.
