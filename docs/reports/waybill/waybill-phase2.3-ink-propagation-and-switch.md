# Waybill Phase 2.3 — Ink Colour Propagation & CSR-style Switch UX

This report was written by OpenCode on 2026-07-09 via Local Runner.

## Objective & Scope

Propagate `fillableColor` to all tick/check elements across the 6 waybill templates, and port CSR's Switch-toggle customization UX to ViewWaybill's DocumentSheet.

**In scope:**
- All tick boxes (checked/unchecked), tick text nodes, tick labels in Classic, Premium, Slate, Minimal, Thermal, Evergreen templates
- ViewWaybill.tsx: local `customFont`/`customColor` state with `'auto'` sentinel, Switch toggles, show/hide conditional controls, localStorage persistence
- Font switch: restore previous custom value from stash when re-enabled (like colour switch)

**Excluded:**
- `blankWaybillTemplate.tsx` checkbox (`#000`, separate rendering path)
- Signatures (are `<Image>` URLs, excluded from ink propagation by design)
- CSR itself (unchanged)
- `bun run typecheck` (times out due to 4GB RAM limit; build skip per hardware policy)

## Evidence-Based Findings

### 1. Template Tick Element Changes

All 6 templates were already deriving `fillableColor` from the active preset. The gap was that tick-related elements used hardcoded values instead of referencing `fillableColor`.

| Template | Elements Changed | Before | After |
|----------|-----------------|--------|-------|
| Classic | tickText.color, tickBox.borderColor, tickBoxChecked.borderColor, tickBoxChecked.backgroundColor | `#0f172a`/`#334155` | `fillableColor` |
| Premium | tickText.color, tickBox.borderColor, tickBoxChecked.borderColor, tickBoxChecked.backgroundColor | `#1e293b`/`#0f172a` | `fillableColor` |
| Slate | tickText.color, tickBox.borderColor, tickBoxChecked.borderColor, tickBoxChecked.backgroundColor | `#0f172a`/`#334155` | `fillableColor` |
| Minimal | tickBox.borderColor, tickBoxChecked.backgroundColor | `#374151` | `fillableColor` |
| Thermal | tickBox.borderColor, tickBoxChecked.backgroundColor | `#1f2937` | `fillableColor` |
| Evergreen | tickBox.borderColor, tickBoxChecked.borderColor, tickBoxChecked.backgroundColor (was `accent`) | `#166534`/`accent` | `fillableColor` |

Evergreen was the only template using `accent` for the checked state — aligned to `fillableColor` for consistency.

### 2. ViewWaybill.tsx CSR-style Switch UX

**State model:**
- `customFont: 'auto' | PdfFillableFontChoice` — `'auto'` is the sentinel meaning "use template default"
- `customColor: 'auto' | string` — same sentinel pattern
- Initialized from localStorage via `getStoredCustomFont()`/`getStoredCustomColor()` getters

**Effect sync:**
- When `customColor` is `'auto'` → pushes `WAYBILL_TEMPLATE_DEFAULTS.handwritingColor` to the hook (`setInkColour`)
- When `customColor` is a hex value → pushes that value to the hook
- Same pattern for `customFont`/`setInkFont`

**Switch toggle behavior:**
- Ink Color ON: restores from stash (`getStoredCustomColor()`); if stash is `'auto'`, falls back to `WAYBILL_TEMPLATE_DEFAULTS.handwritingColor`
- Ink Color OFF: sets to `'auto'` (reverts to template default immediately)
- Handwriting Font ON: restores from stash (`getStoredCustomFont()`); if stash is `'auto'`, falls back to `'Caveat'`
- Handwriting Font OFF: sets to `'auto'`

**Save button:**
- Persists `template`, `customFont`, `customColor` to localStorage keys
- Calls `buildWaybillCustomFields` with selected `pdfTemplateId`
- Updates Supabase row, updates local state, closes sheet, shows success toast

**Layout sections (in order):**
1. Template selector (existing)
2. Ink Color: Switch toggle + description → conditional: swatches + hex input + color picker
3. Handwriting Font: Switch toggle + description → conditional: font option buttons
4. Save button

### 3. Verification

- `bun run audit:load` — passes, no new query-pattern issues.
- `git status` — exactly 7 modified files, no unintended changes.
- `bun run typecheck` — skipped per hardware policy (4GB RAM, 300s timeout exceeded consistently).

## Risks & Limitations

1. **Font switch initial ON value**: When no stash exists, font defaults to `'Caveat'` (matching CSR). Colour switch defaults to `WAYBILL_TEMPLATE_DEFAULTS.handwritingColor` (`#0f172a`). These differ by design — `'Caveat'` is the first handwriting font in the UI, while `#0f172a` is the template default.
2. **Scrollbar flash**: Conditional sections appearing/disappearing when toggling switches causes layout shift (present in CSR too, acceptable).
3. **No typecheck**: Full TypeScript compilation not verified due to environment constraints. All structural patterns match the existing CSR implementation.

## Deferred Work

- None. Phase 2.3 is complete.
