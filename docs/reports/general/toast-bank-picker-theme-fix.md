# Toast UX and Bank Picker Theme Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Fix weak toast presentation and dismissal. Fix hardcoded Bank Picker colors on Invoice View and Quotation View.

## Scope

- Toast styling: `src/styles/formTheme.css` only.
- Bank Picker: `src/components/document-view/shared/BankDetailsCard.tsx` only.
- No changes to toast APIs, call sites, bank logic, calculations, PDFs, schema, or Settings.

## Files changed

- `src/styles/formTheme.css`
- `src/components/document-view/shared/BankDetailsCard.tsx`
- `docs/reports/GENERAL/toast-bank-picker-theme-fix.md` (this report)

## Skills used: shadcn, tailwind-capacitor, mobile-android-design

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Toast audit result

Four toast-related implementations exist:

- goey-toast through `src/lib/feedback.ts` (86 call-site files) and one `GoeyToaster` in `App.tsx`. This is the canonical system. All major flows (Accounting, Invoice, Quotation) use it.
- `NativeFeedbackRenderer` portal with solid colors. It serves native bus events only (`AndroidBackHandler`, `OpenInAIDropdown`, PDF download). It stays.
- Radix `use-toast` and `toast.tsx`. No imports exist. Dead code. Left intact to avoid scope growth.
- `useToastStack` and `DocumentToastViewport`. Deprecated no-op shims over `feedback`. Left intact.

No new library was added. No call site was changed.

### Toast presentation

- Success toast now uses a solid fill from `--bd-status-success-text` with white text. The pale green fill is gone. Promise success toasts match.
- Error toast now uses a solid fill from `--bd-status-danger-text` with white text. The pale red fill is gone. Promise error toasts match.
- Colors resolve through existing theme tokens with light and dark variants. No arbitrary hex values were added.
- Warning, info, and loading tones are unchanged.

### Toast dismissal

- Root cause: the library close button is 20px, fully transparent, and pointer-events-disabled until hover. Hover never fires on touch screens, so mobile users could not tap it.
- Fix: the close button is now always visible, inherits toast text color, and carries a 44px hit area through an `::after` pseudo element. The visual size is unchanged.
- Stacking already works: `visibleToasts={3}`, gap 12, queue overflow drops oldest, timeouts unchanged (success 2400ms, error 5600ms).

### Bank Picker

- `BankDetailsCard` is the single shared component for Invoice View (`InvoiceWorkspace`) and Quotation View (`QuotationViewPage`). One fix covers both.
- All 9 hardcoded green values are gone:
  - Solid treatments (border, Active badge, check icon, shadow) now use `hsl(var(--bd-button-primary-bg))`. This token bridges the theme `--primary` color, so the picker shows solid blue, purple, or any active theme primary.
  - Pale fills now use `color-mix` derived from the same primary token. No pale substitute was used for the solid treatment.
- Selection logic, data, ordering, persistence, and semantics are unchanged.

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched)
- `bun run build`: skipped due to hardware policy
- Hardcoded color search in `BankDetailsCard.tsx`: zero matches
- `git status`: task changes limited to `formTheme.css` and `BankDetailsCard.tsx` (`NewJournalEntry.tsx`, `bun.lock`, `package.json` changes belong to other work and were left intact)
- Runtime or device test: not performed (no claim made)

## Risks or limitations

- White text on the solid success fill meets the existing app precedent (`NativeFeedbackRenderer` uses the same treatment) but was not contrast-metered.
- `color-mix` requires a modern WebView. The codebase already uses it in stylesheets.
- Dead Radix toast code and deprecated shims remain. Remove them in a separate cleanup task.

## Deferred work

- Delete dead `src/hooks/use-toast.ts`, `src/components/ui/toast.tsx`, and the document-view toast shims.
- Convert the Create Journal period `<select>` to the shared picker if required.
- On-device Android confirmation for toasts and the Bank Picker.
