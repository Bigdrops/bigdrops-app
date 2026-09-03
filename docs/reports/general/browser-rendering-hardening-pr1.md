# PR-1: Browser/WebView Form Rendering Hardening

This report was written by MiMoCode on 2026-07-11 via Local Runner.

---

## 1. Files Modified

| # | File | Changes |
|---|---|---|
| 1 | `src/index.css` | Added `color-scheme` to `:root` and `.dark`; added form element hardening rules |
| 2 | `src/components/UnitInput.tsx` | `bg-white` → `bg-bd-card-bg` on dropdown card |
| 3 | `src/components/invoice/MobileGroupCard.tsx` | `bg-white` → `bg-bd-surface` on toggle/add buttons |
| 4 | `src/components/RichTextEditor.tsx` | `bg-white` → `bg-bd-surface`/`bg-bd-input-bg` on toolbar, editor container, content area |
| 5 | `src/components/ItemImageUpload.tsx` | `bg-white` → `bg-bd-surface` on upload button |
| 6 | `src/components/project/ProjectDocumentSheet.tsx` | `bg-white` → `bg-bd-surface` on sheet header |
| 7 | `src/components/project/ProjectDocumentStep3Review.tsx` | `bg-white` → `bg-bd-surface`/`bg-bd-card-bg` on button and form container |
| 8 | `src/components/batch/BatchActionFooter.tsx` | `bg-white` → `bg-bd-surface` on non-destructive action button |
| 9 | `src/components/settings/DashboardQuickTilesSettings.tsx` | `bg-white` → `bg-bd-surface` on all settings buttons/options (6 instances) |
| 10 | `src/pages/settings/UserSettingsSection.tsx` | `bg-white` → `bg-bd-surface` on buttons/inputs (4 instances) |
| 11 | `src/pages/settings/BrandingSettingsSection.tsx` | `bg-white` → `bg-bd-card-bg` on image preview containers |
| 12 | `src/pages/settings/SignatoriesSettingsSection.tsx` | `bg-white` → `bg-bd-card-bg` on signature preview containers |
| 13 | `src/components/rfq/RfqImagePreviewGrid.tsx` | `bg-white` → `bg-bd-surface` on share button |
| 14 | `src/components/project/ProjectDocumentTypeSelector.tsx` | `bg-white` → `bg-bd-surface` on document type option |
| 15 | `src/components/compliance/import/ComplianceJsonPreviewCard.tsx` | `bg-white` → `bg-bd-surface` on badge |
| 16 | `src/components/client/workspace/ClientOverviewTab.tsx` | `bg-white` → `bg-bd-card-bg` on overdue invoice card |
| 17 | `src/pages/NewProject.tsx` | `bg-white` → `bg-bd-surface` on form inputs/selects/buttons (4 instances) |
| 18 | `src/components/reports/ReportsNav.tsx` | `bg-white` → `bg-bd-surface` on active nav icon container |
| 19 | `src/components/project/detail/ProjectActionRail.tsx` | `bg-white` → `bg-bd-card-bg` on actions dropdown |
| 20 | `src/components/quotation/QuotationList.tsx` | `bg-white dark:bg-amber-950` → `bg-bd-surface` on sync queue items (3 instances) |

---

## 2. Color-Scheme Integration

**Approach:** Added `color-scheme` CSS property to the existing `:root` and `.dark` selector blocks in `src/index.css`.

- `:root { color-scheme: light; }` — tells the browser the default color scheme is light
- `.dark { color-scheme: dark; }` — tells the browser to use dark-native rendering when the `.dark` class is present

**Alignment with existing architecture:**
- The `.dark` class on `<html>` is already the dark mode indicator (confirmed in `tailwind.config.js` line 5: `darkMode: ["class"]`)
- Theme presets apply token bundles via `applyThemeTokenBundle()` on `document.documentElement` (CSS custom properties)
- The `color-scheme` property works alongside this — it controls browser-native UI (input backgrounds, scrollbars, form controls) while the BD token system controls application-level styling
- No runtime JavaScript changes were needed — the existing `.dark` class toggle handles `color-scheme` automatically

---

## 3. Browser Compatibility Rules Added

Added to `src/index.css` `@layer base`:

```css
input,
textarea,
select {
  -webkit-appearance: none;
  appearance: none;
}
```

**Purpose:** Strips native browser/WebView styling from form elements so BD theme tokens fully control their appearance. Without this, Android WebView applies Material Design-styled inputs with system colors that can override CSS backgrounds during focus/keyboard events.

---

## 4. Autofill Handling Added

Added to `src/index.css` `@layer base`:

```css
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px hsl(var(--bd-input-bg)) inset !important;
  -webkit-text-fill-color: hsl(var(--foreground)) !important;
  caret-color: hsl(var(--foreground));
  transition: background-color 5000s ease-in-out 0s;
}
```

**Purpose:** When Chrome/WebView autofills fields, it applies a yellow/white background via `:-webkit-autofill` that cannot be overridden by normal `background` CSS. The `box-shadow` inset trick overrides the autofill background with the theme's input background color. The `transition` hack prevents the browser from reverting to its autofill color after the override is applied.

---

## 5. Placeholder Handling Added

Added to `src/index.css` `@layer base`:

```css
input::placeholder,
textarea::placeholder {
  color: hsl(var(--muted-foreground));
  opacity: 1;
}
```

**Purpose:** Ensures placeholder text uses the BD `muted-foreground` token instead of browser defaults. The `opacity: 1` overrides the browser's default placeholder opacity (typically 0.5), giving consistent placeholder appearance across all themes.

---

## 6. BG-White Audit

### Replaced (20+ instances across 20 files)

| File | Line(s) | Old | New | Justification |
|---|---|---|---|---|
| `UnitInput.tsx` | 104 | `bg-white` | `bg-bd-card-bg` | Dropdown should respect theme |
| `MobileGroupCard.tsx` | 152, 171 | `bg-white` | `bg-bd-surface` | Toggle/add buttons should respect theme |
| `RichTextEditor.tsx` | 36 | `bg-white` | `bg-bd-surface` | Toolbar button should respect theme |
| `RichTextEditor.tsx` | 83, 144 | `bg-white` | `bg-bd-input-bg` | Editor container/content should match input bg |
| `ItemImageUpload.tsx` | 117 | `bg-white` | `bg-bd-surface` | Upload button should respect theme |
| `ProjectDocumentSheet.tsx` | 232 | `bg-white` | `bg-bd-surface` | Sheet header should respect theme |
| `ProjectDocumentStep3Review.tsx` | 53, 126 | `bg-white` | `bg-bd-surface`/`bg-bd-card-bg` | Button/container should respect theme |
| `BatchActionFooter.tsx` | 77 | `bg-white` | `bg-bd-surface` | Action button should respect theme |
| `DashboardQuickTilesSettings.tsx` | 115,128,139,178,200,227 | `bg-white` | `bg-bd-surface` | Settings UI should respect theme |
| `UserSettingsSection.tsx` | 165,186,200,315 | `bg-white` | `bg-bd-surface` | Settings UI should respect theme |
| `BrandingSettingsSection.tsx` | 240, 278 | `bg-white` | `bg-bd-card-bg` | Image preview should use card bg |
| `SignatoriesSettingsSection.tsx` | 229,297,333 | `bg-white` | `bg-bd-card-bg` | Signature preview should use card bg |
| `RfqImagePreviewGrid.tsx` | 81 | `bg-white` | `bg-bd-surface` | Share button should respect theme |
| `ProjectDocumentTypeSelector.tsx` | 62 | `bg-white` | `bg-bd-surface` | Type option should respect theme |
| `ComplianceJsonPreviewCard.tsx` | 39 | `bg-white` | `bg-bd-surface` | Badge should respect theme |
| `ClientOverviewTab.tsx` | 104 | `bg-white` | `bg-bd-card-bg` | Invoice card should use card bg |
| `NewProject.tsx` | 145,180,195,208 | `bg-white` | `bg-bd-surface` | Form inputs should respect theme |
| `ReportsNav.tsx` | 84 | `bg-white` | `bg-bd-surface` | Active nav icon should respect theme |
| `ProjectActionRail.tsx` | 100 | `bg-white` | `bg-bd-card-bg` | Dropdown should use card bg |
| `QuotationList.tsx` | 318,337,373 | `bg-white dark:bg-amber-950` | `bg-bd-surface` | Sync queue uses theme system instead of `.dark` check |

### Intentionally Retained

| File | Line(s) | Value | Justification |
|---|---|---|---|
| `PdfOutputCustomizeSheet.tsx` | 29,31,38,39,45,53,55,61,71,79 | `bg-white` | PDF template preview shells — intentionally white to represent paper documents |
| `DocumentDesignControls.tsx` | 27,31,36,47,48,51 | `bg-white` | PDF template preview nodes — intentionally white for document preview |
| `TableDocumentPreview.tsx` | 166 | `bg-white` | Document preview surface — intentionally white for print preview |
| `DocumentBrandBlock.tsx` | 31 | `bg-white dark:bg-slate-900` | Already has dark mode handling via `.dark` class |
| `ExportDropdownRow.tsx` | 61 | `bg-white dark:bg-slate-900` | Already has dark mode handling |
| `LifetimeDataHub.tsx` | 248 | `bg-white dark:bg-slate-900` | Already has dark mode handling |
| `Login.tsx` | 181,183,185,192,205,220,389 | `bg-white`/`bg-white/70`/`bg-white/80`/`bg-white/50` | Auth page decorative elements — intentionally glass-like with opacity |
| `ResetPassword.tsx` | 9, 66 | `bg-white` | Auth page — intentionally light for onboarding |
| `ErrorsDashboard.tsx` | 66 | `bg-white` | Debug page — intentionally white for readability |
| `CsrFormScreen.tsx` | 831, 841 | `bg-white` | Pulse dot (decorative) and FAB button (intentionally high-contrast) |
| `WaybillTemplateSelector.tsx` | 106 | `bg-white/20` | Transparent overlay on template thumbnail — intentional transparency |
| `DocumentTemplateDesignOverrides.tsx` | 25 | `bg-white` | Toggle switch knob — traditionally white regardless of theme |

---

## 7. Typecheck Result

```
$ tsc --noEmit
src/components/document-view/shared/PdfOutputCustomizeSheet.tsx(125,53): error TS2345:
  Argument of type 'PdfDesignPresetDocument' is not assignable to parameter of type 'PdfCustomizationDocumentFamily'.
  Type '"receipt"' is not assignable to type 'PdfCustomizationDocumentFamily'.
```

**This is a pre-existing error** — `PdfOutputCustomizeSheet.tsx` is NOT in the modified files list. The type mismatch existed before this PR and is unrelated to browser rendering hardening.

---

## 8. Final Git Status

```
20 files changed, 70 insertions(+), 39 deletions(-)
```

Modified files:
- `src/index.css` (core CSS hardening)
- 19 component files (`bg-white` → BD token replacements)

No application source files were modified beyond the scoped changes. No dialog, sheet, viewport, or keyboard positioning logic was touched. No new components or abstractions were introduced.
