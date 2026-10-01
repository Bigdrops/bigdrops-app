# Cost & Pricing Sheet — mobile/fold form template (React 19 TSX)

This report documents a fidelity conversion of the HTML prototype into React TSX.

Source prototype:

```text
docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/
cost-price-sheet-form-candidate-v1-mobile-fold.html
```

The conversion preserves layout, spacing, gutters, widths, heights, typography,
controls, field order, group presentation, row presentation, CP/SP, TCP/TSP/Profit,
sub-descriptions, toolbar, header, and responsive behavior. It does not redesign.

## Files

| File | Role |
| --- | --- |
| `CostPricingSheetForm.tsx` | Main form. Owns document, rows, columns, client, sheets, toast. |
| `CostPricingSheetOverlays.tsx` | Client, Import, Columns, Markup sheets, confirm dialogs, toast. |
| `CostPricingSheetIcons.tsx` | SVG icon set from the prototype markup. |
| `cost-pricing-sheet-shared.ts` | Types, column constants, formatters, row helpers, sample model. |
| `cost-pricing-sheet-form.css` | Prototype `<style>` block, verbatim. Verified identical by diff. |

## Usage

```tsx
import { CostPricingSheetForm } from './CostPricingSheetForm';

export function NewCpsPage() {
  return (
    <CostPricingSheetForm
      clients={clients}
      onBack={() => navigate(-1)}
      onSave={async (payload) => { await saveCps(payload); }}
      onClientChange={(client) => setDraftClient(client)}
      onAddNewClient={() => openClientDialog()}
      onImport={(raw) => parseCpsJson(raw)}
      onRequestPhoto={(rowId) => uploadToCloudinary()}
      onColumnsChange={(cols) => persistColumns(cols)}
    />
  );
}
```

The form imports its own CSS and loads Manrope + DM Mono through the CSS `@import`.

## Control → prop mapping

| Prototype control | TSX surface |
| --- | --- |
| Back button (`toast('Back to sheets')`) | `onBack()`; without it, the prototype demo toast runs |
| Save (top bar, section CTA, phone FAB) | Prototype validation runs first; on pass calls `onSave(payload)` |
| Draft badge (`#modeBadge`) | `modeLabel` prop; without it, internal `Draft` → `Saved` demo flip |
| Theme button | Internal theme state sets `data-theme` on `documentElement`; notifies `onToggleTheme(theme)`; preset via `theme` / `defaultTheme` |
| Layout chip (`Phone` / `Large phone` / `Fold`) | Internal, updates on window resize |
| Sheet Title / Number / Issue Date / Site / Notes | Internal `doc` state; delivered inside `onSave` payload |
| Client trigger, X clear, sheet search, row choose | Internal `client` state; options from `clients`; preset via `initialClient`; emits `onClientChange(client \| null)` |
| `+ Add new client` | `onAddNewClient()`; without it, the prototype demo toast runs |
| Columns button + sheet (visibility, labels, move, drag, reset) | Internal `columns`; preset via `initialColumns`; emits `onColumnsChange(columns)` |
| Column visibility on rows (`make`, `cp`, `sp`) | Derived from internal `columns` state |
| Import button + sheet | `onImport(jsonText)` returns `CpsImportResult`; inline error on `{ ok: false }`; rows applied on `{ ok: true }` |
| Markup button + sheet (mode, value, include/exclude, preview, apply) | Internal workflow; `onApply(changes, summary)` writes SP into rows; preset exclusions via `initialMarkupExcluded` (default `[6, 8]`, prototype sample) |
| Markup undo bar | Internal snapshot and restore |
| Clear all + confirm dialog | Internal row reset |
| Add line item / Add group / Add item to group / Insert below / move up / down / duplicate / remove / group remove | Internal row operations |
| Sub-description toggle, editor, collapse-if-empty | Internal per-row `subOpen` state |
| Photo button, thumbnail remove | `onRequestPhoto(rowId)` resolves an image URL; remove is internal |
| Row financials (TCP, TSP, Profit, margin) and totals block | Display math inside the component, prototype float math, 2dp |
| Escape key, backdrop click, focus return | Internal overlay management |

## Not implemented (by design)

- Supabase, persistence, database calls
- Routing
- CPS calculations (production Decimal path)
- JSON import parsing (host returns rows or an error)
- Client Picker backend (host supplies the client list)
- Cloudinary upload (host resolves image URLs)
- Save persistence (host receives the save payload)

## Notes for the transplant agent

1. Prototype math: row and total displays use float math rounded to 2dp, exactly
   like the source. Production must route money math through the authoritative
   Decimal path before ship.
2. CSS class names are unchanged from the prototype. Names such as `.item`,
   `.sec`, `.fld`, `.x` are generic. Import `cost-pricing-sheet-form.css` only
   where this form renders, or scope it later if the host app has collisions.
3. The CSS contains base rules for `html, body`. Remove those two declarations
   if the host page already owns page background and font color.
4. State is uncontrolled. Reset the form by remounting it with a new `key`.
5. `onImport` must return a result. It must not throw.
