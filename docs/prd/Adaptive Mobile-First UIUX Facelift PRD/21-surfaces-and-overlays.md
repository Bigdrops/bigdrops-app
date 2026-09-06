# Surfaces & Overlays

> Status: Draft
> Last updated: 2026-08-29
> Depends on: `03-design-system.md`, `04-theme-system.md`, `05-navigation-shell.md`, `06-component-patterns.md`, `12-capacitor-native.md`

---

## 1. Purpose

Define one canonical standard for every surface that appears above the page content in BIGDROPS. Every popup, dropdown, sheet, dialog, and popover MUST follow this document. No component MAY define its own overlay-presentation rules independently.

---

## 2. Overlay Inventory — Current State

This inventory documents every overlay-primitive usage found in the codebase as of August 2026. It is the evidence base for the standard.

### Counting methodology

Usage counts in this inventory use the following definitions:

- **Direct primitive consumer:** A file that imports directly from `@/components/ui/sheet`, `@/components/ui/dialog`, etc.
- **Wrapper component:** A component that wraps a primitive and is reused across the app (e.g., `DocumentSheet` wraps `Sheet`, `ConfirmActionDialog` wraps `AlertDialog`).
- **Wrapper consumer:** A file that imports and renders a wrapper component.
- **Total file-level rendering sites:** All files that ultimately render overlay UI, including direct consumers, wrapper components, and wrapper consumers.

Counts may represent any of these levels. The inventory notes which level each count uses. When in doubt, the total file-level count is the most operationally relevant.

### 2.1 Sheet (bottom/side)

**Primitive:** `@/components/ui/sheet.tsx` — wraps Radix `Dialog` as a sheet.

**Base component defaults:**
- Scrim: `bg-black/50 dark:bg-black/70`, fade 200ms
- Content: `z-[250]`, `shadow-2xl`, slide + fade, 300ms
- Bottom: `rounded-t-[var(--bd-overlay-radius)]`, `border-t border-bd-overlay-border`
- Right: `sm:max-w-md`, `ring-1 ring-black/5`

**Wrapper: `DocumentSheet`** — responsive (bottom on mobile, right on desktop). Custom close button. Used by most document-view sheets.

**Wrapper: `UnifiedActionSheet`** — bottom sheet with grab handle, action items, grouped layout. Used by list action sheets and mobile nav sheets.

**Usage sites:** ~39 total file-level rendering sites (~25 direct `@/components/ui/sheet` importers + ~14 wrapper-based consumers through `DocumentSheet`, `UnifiedActionSheet`, `CsrImportSheet`, `RfqImportSheet`, and others). The table below lists named representative sites; it is not exhaustive.

| Site | Side | Radius | Shadow | Max Height | Close Button | Back-Button Integrated |
|------|------|--------|--------|------------|--------------|----------------------|
| UnifiedActionSheet | bottom | `var(--bd-overlay-radius)` | `shadow-2xl` | `var(--bd-overlay-sheet-max-height)` | No (handle only) | ⚠️ No explicit |
| ColumnManager | bottom | 30px (hardcoded) | `shadow-[0_-12px_32px_...]` | `var(--bd-overlay-sheet-max-height)` | Yes (X button) | ⚠️ No explicit |
| DocumentSheet | bottom/right | `var(--bd-overlay-radius)` | `shadow-2xl` (via Sheet) | `var(--bd-overlay-sheet-max-height)` | Yes (X button) | ⚠️ No explicit |
| JsonItemsImportSheet | bottom | 26px (hardcoded) | `shadow-2xl` (via Sheet) | `var(--bd-overlay-sheet-max-height)` | Yes | ⚠️ No explicit |
| AttachExistingDocumentSheet | bottom | 26px (hardcoded) | `shadow-2xl` (via Sheet) | `var(--bd-overlay-sheet-max-height)` | Yes | ⚠️ No explicit |
| LinkedDocumentsSheet | bottom | 26px (hardcoded) | `shadow-2xl` (via Sheet) | `var(--bd-overlay-sheet-max-height)` | Yes | ⚠️ No explicit |
| MobileSidebar | left | None (Sheet default) | None explicit | Full height | Yes | ⚠️ No explicit |
| Combobox (mobile) | bottom | `var(--bd-radius-md)` | `shadow-sm` (dropdown) | Limited | Yes | ⚠️ No explicit |
| PdfOutputSettings | bottom | `var(--bd-overlay-radius)` | Via Sheet | — | Yes | ⚠️ No explicit |
| ProjectDocumentSheet | bottom | 28px (hardcoded) | Via Sheet | — | No (custom) | ⚠️ No explicit |
| InvoiceAdvanceSheet | bottom | `var(--bd-overlay-radius)` | Via Sheet | `var(--bd-overlay-sheet-max-height)` | Yes | ⚠️ No explicit |
| DashboardKpiCardsSettings | bottom | Via Sheet | Via Sheet | `var(--bd-overlay-sheet-max-height)` | Yes | ⚠️ No explicit |
| DocumentsSettingsSection | right | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |
| Layout (sign-out sheet) | bottom | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |
| ComplianceJsonImportSheet | bottom | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |
| SignatoryPicker | bottom | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |
| WaybillSignatures | bottom | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |
| DocumentActionSheets | bottom | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |
| JsonImportLayout | bottom | Via Sheet | Via Sheet | — | Yes | ⚠️ No explicit |

**Additional wrapper-based consumers** (render Sheet UI through `DocumentSheet`, `UnifiedActionSheet`, etc. — not listed individually): `WaybillMoreSheet`, `RfqMoreSheet`, `CsrMoreSheet`, `BoqMoreSheet`, `InvoiceMoreSheet`, `InvoiceRecordPaymentSheet`, `DocumentCustomizeCard`, `DocumentMoreSheet`, `DocumentActionSheet`, `DocumentPage`, `ListActionSheet`, `MobileMoreSheet`, `MobileSalesSheet`, `InvoiceListActionSheet`, `ActionsSheet`, `CsrImportSheet`, `RfqImportSheet`.

**Observation:** Radius values are inconsistent (26px, 28px, 30px, `var(--bd-overlay-radius)`). Shadow treatment varies (some use `shadow-2xl`, ColumnManager uses a custom shadow). No sheets explicitly integrate with the Android back-button handler — they rely on Radix's default `onOpenChange` behavior combined with `AndroidBackHandler.tsx`'s global Escape dispatch.

### 2.2 Dialog (centered modal)

**Primitive:** `@/components/ui/dialog.tsx` — wraps Radix `Dialog`.

**Base component defaults:**
- Scrim: `bg-black/50 dark:bg-black/70`, fade 200ms
- Content: `z-[250]`, centered, `rounded-[var(--bd-overlay-radius)]`, `shadow-2xl`
- Animation: `zoom-in-95` / `zoom-out-95`, 100ms

**Wrapper: `DocumentModal`** — dialog with header, footer, custom close button. Used for confirm dialogs in document views.

**Usage sites:** ~14+ file-level rendering sites across 7 major named patterns/components. The named patterns below represent unique architectural approaches; many are used in multiple files.

| Pattern / Component | Radius | Shadow | Back-Button Integrated | Consumer files |
|---------------------|--------|--------|----------------------|----------------|
| DocumentModal | `var(--bd-overlay-radius)` | `shadow-2xl` | ⚠️ No explicit | Used within document-view pages |
| VoidPaymentDialog | Via Dialog | Via Dialog | ⚠️ No explicit | `InvoiceOverlays.tsx` |
| ClientSelector | Via Dialog | Via Dialog | ⚠️ No explicit | Form pages |
| SetPasswordModal | Via Dialog | Via Dialog | ⚠️ No explicit | `AppShell.tsx` (lazy-loaded) |
| NotificationDrawer | Custom (Radix Dialog) | `shadow-2xl` | ⚠️ No explicit | `NotificationBell.tsx` |
| WaybillGatewayOverlay | Custom (Dialog) | `shadow-2xl` | ⚠️ No explicit | Waybill views |
| ProjectLinkDialog | Custom overlay (not Radix Dialog) | `shadow-2xl` | ⚠️ No explicit | 7 document list/view pages |
| ColumnManager (ResetConfirmDialog) | Via Dialog | Via Dialog | ⚠️ No explicit | `ColumnManager.tsx` (internal) |
| AdminSettingsSection | Via Dialog | Via Dialog | ⚠️ No explicit | Settings |

**Additional AlertDialog-as-Dialog consumers** (using `AlertDialog` for non-confirmation purposes — see §2.3): `Layout.tsx` (sign-out dialog).

**Observation:** Dialogs are generally consistent in radius and shadow. The `NotificationDrawer` and `WaybillGatewayOverlay` are custom overlays built on Dialog primitives with non-standard positioning.

### 2.3 AlertDialog (confirmation)

**Primitive:** `@/components/ui/alert-dialog.tsx` — wraps Radix `AlertDialog`.

**Base component defaults:**
- Scrim: `bg-black/50 dark:bg-black/70`, fade 200ms
- Content: `z-50`, centered, `rounded-xl`, `ring-1 ring-foreground/10`
- Animation: `zoom-in-95` / `zoom-out-95`, 100ms

**Wrapper: `ConfirmActionDialog`** — styled with `rounded-3xl`, `shadow-2xl`, `border-bd-border`. Used across list views for delete/archive/confirm actions.

**Usage sites:** 6 major AlertDialog-based patterns/components identified, expanding to ~18 consumer files when wrapper consumers are counted.

| Pattern / Component | Consumer files |
|---------------------|----------------|
| ConfirmActionDialog | `Waybills.tsx`, `Invoices.tsx`, `CSR.tsx`, `Clients.tsx`, `Projects.tsx`, `ProjectDetail.tsx`, `BoqList.tsx`, `RfqList.tsx`, `QuotationList.tsx`, `ProjectLinkDialog.tsx`, `AttachExistingDocumentSheet.tsx` (11 files) |
| DocumentConfirmDialog | `ViewWaybill.tsx`, `ViewRfq.tsx`, `ViewQuotation.tsx`, `ViewCSR.tsx`, `ViewBoq.tsx`, `InvoiceAdvanceSheet.tsx`, `InvoiceOverlays.tsx` (7 files) |
| Direct AlertDialog | `Layout.tsx` (sign-out confirmation) |

**Observation:** AlertDialog uses `z-50` while Sheet and Dialog use `z-[250]`. AlertDialog's base component uses `rounded-xl` while ConfirmActionDialog overrides to `rounded-3xl`. This is an inconsistency to resolve.

### 2.4 Popover (floating, anchored)

**Primitive:** `@/components/ui/popover.tsx` — wraps Radix `Popover`.

**Default:** `z-50`, `rounded-lg`, `shadow-md`, `ring-1 ring-foreground/10`, slide + zoom, 100ms.

**Usage sites:** 3 total.

| Site | Notes |
|------|-------|
| `OpenInAIDropdown` | Contextual export actions |
| `Combobox` (desktop) | Inline dropdown for item selection |
| `DocumentPrefixesSettingsSection` | Settings page document prefix picker |

**Observation:** Consistent. No issues.

### 2.5 Select (dropdown)

**Primitive:** `@/components/ui/select.tsx` — wraps Radix `Select`.

**Default:** Radix Select content styling. On mobile, the `Combobox` component uses a Sheet instead of a floating Select.

**Usage sites:** 12+ total consumer files across the application.

| Usage type | Sites |
|------------|-------|
| **Floating/dropdown Select** (anchored, overlays content) | Desktop `Combobox` — 1 pattern |
| **Form-input Select** (inline within forms) | `NewProject.tsx`, `TableRowsEditor.tsx`, `FormCommercialTerms.tsx`, `CsrFormScreen.tsx`, `DocumentDesignControls.tsx`, `ClientForm.tsx`, `InvoiceRecordPaymentSheet.tsx`, `AttachmentsPanel.tsx`, `ProjectDetailHeader.tsx`, `CommercialTermsSection.tsx`, `mobileFormPrimitives.tsx`, `ModuleShell.tsx` (12+ files) |

The distinction matters for the overlay standard: floating Selects qualify as overlays (§4.5 Popover equivalent); inline form-input Selects do not.

**Observation:** Consistent. The mobile fallback to Sheet is a deliberate pattern.

### 2.6 DropdownMenu (action menu)

**Primitive:** `@/components/ui/dropdown-menu.tsx` — wraps Radix `DropdownMenu`.

**Usage:** 1 wrapper component (`ContextualExportDropdown` at `src/components/export/ContextualExportDropdown.tsx`), consumed in 7 files: `Waybills.tsx`, `RfqList.tsx`, `QuotationList.tsx`, `Invoices.tsx`, `Projects.tsx`, `CSR.tsx`, `Clients.tsx`, `BoqList.tsx`.

**Observation:** Minimal usage. Consistent with Popover styling.

### 2.7 Tooltip

**Primitive:** `@/components/ui/tooltip.tsx` — wraps Radix `Tooltip`.

**Usage:** Minimal. Consistent.

---

## 3. Inconsistencies Found

| # | Inconsistency | Where | Correct Standard |
|---|--------------|-------|-----------------|
| 1 | Radius varies: 26px, 28px, 30px, `var(--bd-overlay-radius)` | Sheets across components | §5.2 |
| 2 | Shadow varies: `shadow-2xl`, `shadow-[0_-12px_32px_...]`, `shadow-sm` | ColumnManager, UnifiedActionSheet, Combobox | §5.3 |
| 3 | z-index varies: `z-50` (AlertDialog, Popover) vs `z-[250]` (Sheet, Dialog) | AlertDialog, Popover | §5.4 |
| 4 | No sheet has its own Android back-button listener; behavior is mediated globally via `AndroidBackHandler.tsx` + Radix `onOpenChange` | All sheets | §6 |
| 5 | Animation timing varies: 100ms (Dialog), 200ms (scrim), 300ms (Sheet slide) | Dialog vs Sheet | §5.5 |
| 6 | AlertDialog uses `rounded-xl`, ConfirmActionDialog overrides to `rounded-3xl` | AlertDialog base vs wrapper | §5.2 |

---

## 4. Canonical Overlay Types

BIGDROPS defines six canonical overlay types. Every overlay in the app MUST be one of these types.

### 4.1 Bottom Sheet

**When to use:** Primary action menus, settings panels, import flows, form options, list actions. Bottom sheets are the **default overlay type for mobile** — use this unless another type clearly fits better.

**Characteristics:**
- Anchored to bottom edge
- Swipe-to-dismiss supported
- Grab handle at top
- Scrollable content area
- Max height: `var(--bd-overlay-sheet-max-height)`

### 4.2 Side Sheet

**When to use:** Desktop-only detailed content (column manager, PDF customization, document preview settings). On mobile, side sheets MUST fall back to bottom sheets.

**Characteristics:**
- Anchored to right edge (or left for sidebar)
- No swipe-to-dismiss (desktop only)
- Close button in header
- Full height

### 4.3 Centered Dialog

**When to use:** Focused tasks that require user attention before proceeding (set password, link project, void payment). NOT for action menus — use bottom sheet for those.

**Characteristics:**
- Centered on screen
- Scrim behind
- Close button
- No swipe-to-dismiss

### 4.4 Confirmation Dialog

**When to use:** Destructive or irreversible actions that require explicit confirmation (delete, archive, void). MUST use AlertDialog, not Dialog, for proper accessibility semantics.

**Characteristics:**
- Centered on screen
- Scrim behind (non-dismissible by scrim tap)
- Title, description, confirm + cancel buttons
- Destructive variant uses danger styling

### 4.5 Floating Popover

**When to use:** Contextual actions anchored to a trigger element (export dropdown, combobox options). NOT for action menus with more than 5 items — use bottom sheet.

**Characteristics:**
- Anchored to trigger element
- No scrim
- Dismiss on outside tap
- Auto-positions to stay on screen

### 4.6 Inline Overlay (peek card, tooltip)

**When to use:** Lightweight previews that appear near the trigger (document peek card, tooltip). NOT for actionable content — use bottom sheet.

**Characteristics:**
- Anchored near trigger
- No scrim
- Dismiss on outside tap or scroll
- No close button needed

---

## 5. Standard Properties

### 5.1 Decision Rules

| Situation | Use | Why |
|-----------|-----|-----|
| Action menu (list items, FAB actions, nav sheets) | Bottom Sheet | Primary mobile pattern, swipe-dismissable |
| Settings or configuration panel | Bottom Sheet (mobile) / Side Sheet (desktop) | Responsive via `DocumentSheet` pattern |
| Import flow (JSON, CSV) | Bottom Sheet | Scrollable, multi-step |
| Form options (template picker, font picker) | Bottom Sheet | Fits existing pattern |
| Focused task (set password, link project) | Centered Dialog | Requires attention, blocks interaction |
| Destructive confirmation (delete, archive, void) | Confirmation Dialog | Accessibility semantics, non-dismissible scrim |
| Contextual action (export, combobox) | Floating Popover | Anchored to trigger, lightweight |
| Document preview (peek card) | Inline Overlay | Lightweight, non-blocking |
| Sidebar navigation (drawer) | Bottom Sheet (mobile) / Side Sheet (desktop) | Drawer is a special case — see §7 |

### 5.1A Document Customization Sheets

CSR, Waybill, Quotation, and Invoice share one customization interaction model: the same sheet type, responsive behavior, spacing, section hierarchy, typography, control treatment, template-selection interaction, and save interaction. The shared system covers presentation customization. Document-specific controls are allowed where genuinely applicable. Documents do not expose identical controls for symmetry.

Rules:

- The customization surface stays compact and mobile-first.
- Document customization sheets use a compact mobile-first density. Additional document-specific controls may increase height, but shared controls use the same spacing and hierarchy.
- Shared controls use the same visual hierarchy and component patterns.
- Bank account selection and document or output configuration do not automatically belong in the presentation customization popup.
- Existing inline settings stay inline. Do not duplicate them inside the customization popup.
- Template selectors use miniature visual representations of the actual templates, not abstract color-only indicators.
- Template preview cards keep the compact footprint of the established CSR/Waybill customization UI.
- Template previews stay lightweight. Do not generate full PDFs for every picker option.
- Previews use deterministic sample styling, not live customer data, and stay faithful to the actual templates.

### 5.2 Corner Radius

| Surface | Radius | Token |
|---------|--------|-------|
| Bottom sheet | 24px | `var(--bd-overlay-radius)` |
| Side sheet | 0 (sharp corners) | — |
| Centered dialog | 20px | `var(--bd-overlay-radius)` |
| Confirmation dialog | 20px | `var(--bd-overlay-radius)` |
| Floating popover | 12px | `var(--bd-radius-md)` |
| Inline overlay (peek card) | 16px | `var(--bd-radius-lg)` |

**Rule:** ALL overlay surfaces use `var(--bd-overlay-radius)` or a defined radius token. No hardcoded pixel values (no 26px, 28px, 30px). The `bd-overlay-radius` token is the single source of truth for overlay corners.

### 5.3 Elevation (Shadow)

| Surface | Shadow | Source |
|---------|--------|--------|
| Bottom sheet | `0 -16px 40px rgba(0,0,0,0.24)` | `05-navigation-shell.md` Bottom Sheets |
| Side sheet | `var(--shadow-float)` | `03-design-system.md` elevation tokens |
| Centered dialog | `0 8px 32px rgba(15,23,42,0.12)` | `03-design-system.md` elevation tokens |
| Confirmation dialog | `0 8px 32px rgba(15,23,42,0.12)` | Same as centered dialog |
| Floating popover | `0 4px 16px rgba(15,23,42,0.08)` | `03-design-system.md` elevation tokens |
| Inline overlay | `0 8px 24px rgba(15,23,42,0.12)` | Between popover and dialog |
| Scrim (behind overlay) | `rgba(14,12,10,0.38)` + `blur(2px)` | `05-navigation-shell.md` Drawer Scrim |

**Rule:** Use the defined shadow values. No custom shadow strings (no `shadow-[0_-12px_32px_...]`). The `shadow-2xl` Tailwind class is an acceptable shorthand for the bottom-sheet shadow when it matches the defined value.

### 5.4 z-index Scale

| Surface | z-index | Notes |
|---------|---------|-------|
| Page content | 0 | Default |
| FAB | 31 | `05-navigation-shell.md` |
| Drawer scrim | 40 | `05-navigation-shell.md` |
| Drawer | 42 | `05-navigation-shell.md` |
| Bottom sheet | 43 | `05-navigation-shell.md` |
| Search overlay | 50 | `05-navigation-shell.md` |
| All overlay surfaces (Sheet, Dialog, AlertDialog) | 50 | Unified. Replace `z-[250]` with `z-50`. |
| Popover / Tooltip | 60 | Above all overlays |
| Peek card / Inline overlay | 55 | Between overlays and popovers |
| Loading surface (Level 4/5) | 80–100 | `10-loading-and-refresh.md` |

**Rule:** The existing `z-[250]` in Sheet and Dialog base components is too high. All overlay surfaces use `z-50`. Popovers and tooltips sit above at `z-60`. Loading surfaces at `z-80+`. This consolidates the scale defined in `05-navigation-shell.md` without introducing a parallel system.

### 5.5 Animation Timing

| Surface | Open | Close | Source |
|---------|------|-------|--------|
| Bottom sheet | slide-in-from-bottom + fade, 300ms `cubic-bezier(.2,.9,.24,1)` | slide-out-to-bottom + fade, 200ms | `05-navigation-shell.md` |
| Side sheet | slide-in-from-right + fade, 300ms `cubic-bezier(.2,.9,.24,1)` | slide-out-to-right + fade, 200ms | Same easing |
| Centered dialog | zoom-in-95 + fade, 200ms | zoom-out-95 + fade, 150ms | Faster for focused tasks |
| Confirmation dialog | zoom-in-95 + fade, 200ms | zoom-out-95 + fade, 150ms | Same as dialog |
| Floating popover | slide-in + zoom-in-95 + fade, 150ms | slide-out + zoom-out-95 + fade, 100ms | Lightest, fastest |
| Inline overlay | fade + scale, 200ms `cubic-bezier(.2,.9,.24,1)` | fade, 150ms | Per peek-card spec |
| Scrim | fade, 200ms | fade, 200ms | Consistent across all |

**Rule:** All animations respect `prefers-reduced-motion: reduce`. When reduced motion is active, all overlays appear/disappear instantly (no animation).

---

## 6. Dismiss Behavior — Android Back Button Integration

### The Existing Pattern

`AndroidBackHandler.tsx` already handles back-button events. It checks for open overlays (dialogs, sheets) via DOM inspection and dispatches Escape to close them:

```typescript
// AndroidBackHandler.tsx — existing pattern
function countOpenDialogs() {
  return Array.from(document.querySelectorAll(
    '[role="dialog"], [data-slot="dialog-overlay"], [data-slot="sheet-overlay"]'
  )).filter(isVisible).length
}
```

The back button:
1. Closes the keyboard (if open)
2. Closes the topmost overlay (via Escape dispatch)
3. Navigates back
4. On root route, double-tap exits

### Standard Dismiss Rules

| Surface | Scrim tap | Swipe | Escape / Back button | Close button |
|---------|-----------|-------|---------------------|--------------|
| Bottom sheet | ✅ Closes | ✅ Closes | ✅ Closes | ✅ Closes |
| Side sheet | ✅ Closes | ❌ Not applicable | ✅ Closes | ✅ Closes |
| Centered dialog | ✅ Closes | ❌ Not applicable | ✅ Closes | ✅ Closes |
| Confirmation dialog | ❌ Non-dismissible | ❌ Not applicable | ✅ Closes (via cancel) | ❌ No close button |
| Floating popover | ✅ Closes | ❌ Not applicable | ✅ Closes | ❌ No close button |
| Inline overlay | ✅ Closes | ❌ Not applicable | ✅ Closes | ❌ No close button |
| Loading surface (blocking) | ❌ Non-blocking only | ❌ Not applicable | ❌ Non-dismissible | Optional cancel |

### Implementation Requirement

All overlay surfaces MUST:

1. Use `onOpenChange` callback (Radix pattern) so the Escape key and back button close the overlay
2. Set `data-slot="sheet-overlay"` or `data-slot="dialog-overlay"` on the scrim element so `AndroidBackHandler` can detect and close it
3. NOT prevent event propagation that would block the back-button handler

**Back-button handling is global, not per-overlay.** `AndroidBackHandler.tsx` inspects the DOM for open overlays (via `data-slot` attributes) and dispatches `Escape` to close the topmost one. Individual overlays do not need their own back-button listeners — they close via Radix's `onOpenChange` when Escape is dispatched. This means:

- Any overlay that sets `data-slot="sheet-overlay"` or `data-slot="dialog-overlay"` and uses `onOpenChange` will automatically close on Android back-button press.
- Overlays that do not set these attributes or prevent event propagation will NOT close on back-button.
- No new back-button integration code is needed per overlay — the existing handler is sufficient if the standard is followed.

---

## 7. Drawer Exception

The navigation drawer (`05-navigation-shell.md`) is a special case with its own specification. It uses:

- `z-index: 42` (below bottom sheet at 43)
- Custom scrim: `rgba(14,12,10,0.38)` + `blur(2px)`
- Transition: `0.3s cubic-bezier(.2,.9,.24,1)`
- Border radius: `0 24px 24px 0` (right edge only)

The drawer is NOT covered by this standard's generic rules. Its specification in `05-navigation-shell.md` takes precedence.

---

## 8. Backward Compatibility

### What Changes

| Current | Standard | Action Required |
|---------|----------|----------------|
| ColumnManager `rounded-t-[30px]` | `var(--bd-overlay-radius)` | Update ColumnManager radius |
| ColumnManager custom shadow | Bottom-sheet standard shadow | Update ColumnManager shadow |
| JsonItemsImportSheet `rounded-t-[26px]` | `var(--bd-overlay-radius)` | Update radius |
| AttachExistingDocumentSheet `rounded-t-[26px]` | `var(--bd-overlay-radius)` | Update radius |
| LinkedDocumentsSheet `rounded-t-[26px]` | `var(--bd-overlay-radius)` | Update radius |
| Sheet/Dialog `z-[250]` | `z-50` | Update base components |
| AlertDialog `z-50` | `z-50` | Already correct |
| ConfirmActionDialog `rounded-3xl` | `var(--bd-overlay-radius)` | Update wrapper |
| `Layout.tsx` uses AlertDialog for sign-out (non-confirmation dialog) | Use Dialog instead | Migrate sign-out to Dialog (§4.3) |

### What Stays the Same

- `DocumentSheet` responsive behavior (bottom on mobile, right on desktop) — correct
- `UnifiedActionSheet` structure — correct
- `DocumentModal` wrapper — correct
- All Radix primitive usage — correct
- `AndroidBackHandler` integration — already works if `data-slot` attributes are set

---

## 9. Cross-References

| Topic | Document |
|-------|----------|
| Elevation tokens (shadow scale) | `03-design-system.md` §03 |
| Theme tokens (overlay colors, radius) | `04-theme-system.md` |
| Navigation shell (drawer, bottom sheet, scrim) | `05-navigation-shell.md` |
| Component patterns (toast, status indicator) | `06-component-patterns.md` |
| Capacitor native (safe areas, back button) | `12-capacitor-native.md` |
| Loading surfaces (Level 4/5 z-index) | `10-loading-and-refresh.md` |
| Peek card (inline overlay spec) | `18-document-peek-card.md` |
| Column manager (deferred to this standard) | `19-column-manager-mobile.md` |

---

## 10. Anti-Patterns

| # | Prohibition | Reason |
|---|-------------|--------|
| 1 | Do not hardcode radius values (26px, 28px, 30px) on overlays | Use `var(--bd-overlay-radius)` — single source of truth |
| 2 | Do not use custom shadow strings on overlays | Use the defined shadow scale from §5.3 |
| 3 | Do not use `z-[250]` on overlay surfaces | Use `z-50` — unified scale from §5.4 |
| 4 | Do not create overlay types outside the six canonical types | If it doesn't fit, it probably should be a bottom sheet |
| 5 | Do not bypass `AndroidBackHandler` with a separate back-button mechanism | The existing handler works if `data-slot` attributes are set |
| 6 | Do not make confirmation dialogs dismissable by scrim tap | Confirmation requires explicit user action |
| 7 | Do not use framer-motion for overlay animations | Per AGENTS.md UI constraint |
| 8 | Do not add animation delays or artificial timing | Animations are functional, not decorative |
