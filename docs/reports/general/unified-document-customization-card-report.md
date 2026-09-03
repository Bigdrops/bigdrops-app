# Unified DocumentCustomizeCard Implementation Report

This report was written by Buffy on 2026-09-01 via Freebuff.

---

## Objective

Unify all BIGDROPS document customization into ONE shared `DocumentCustomizeCard` used by every applicable document View page. Establish capability-driven rendering so document families expose different controls through configuration, not separate card implementations.

## Scope

- Enhanced `DocumentCustomizeCard` with accent color, compact, and landscape capabilities
- Refactored `PdfOutputCustomizeSheet` to use `DocumentCustomizeCard` internally
- Migrated BOQ from inline customization to `DocumentCustomizeCard`
- Created BOQ domain metadata module
- Updated `pdf-customization-extension-standard.md` with new capabilities and architectural notes

## Files Changed

| File | Change |
|------|--------|
| `src/components/document-view/shared/DocumentCustomizeCard.tsx` | Enhanced with accent color, compact, landscape controls |
| `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` | Refactored to use DocumentCustomizeCard internally |
| `src/pages/ViewBoq.tsx` | Migrated from inline customization to DocumentCustomizeCard |
| `src/domain/pdf/customization/boq.ts` | New — BOQ domain metadata (capabilities, policy, defaults) |
| `docs/standard/pdf-customization-extension-standard.md` | Updated with new capabilities and PdfOutputCustomizeSheet section |

## Skills Used

NONE

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

### 1. DocumentCustomizeCard Enhancement

Added optional props for capabilities not previously supported:

- `showAccentColor` / `accentColor` / `onAccentColorChange` / `accentColorSwatches` — accent color swatches and picker
- `compact` / `onCompactChange` / `showCompact` — compact layout toggle
- `landscape` / `onLandscapeChange` / `showLandscape` — landscape layout toggle

All new props are optional with backward-compatible defaults. Existing CSR and Waybill consumers require zero changes.

New sub-components:
- `AccentColorSection` — renders accent color swatches and hex input
- `ToggleRow` — renders compact/landscape toggle rows

### 2. PdfOutputCustomizeSheet Refactor

Replaced inline template carousel, `DocumentTemplateDesignOverrides`, and manual compact/landscape toggles with `DocumentCustomizeCard`. The sheet now:

- Renders `PdfBankControls` and `PdfDocumentOptionsCard` as commercial-specific additions above the card
- Passes the invoice template carousel as `templatePicker` to `DocumentCustomizeCard`
- Wires accent color through `showAccentColor` + `accentColor` + `onAccentColorChange`
- Wires compact/landscape through `showCompact` / `showLandscape` props
- Delegates save to DocumentCustomizeCard's `onSave`

Removed imports: `CheckCircle2`, `Loader2`, `DocumentTemplateDesignOverrides`. Removed 120+ lines of duplicated UI.

### 3. BOQ Migration

Replaced BOQ's inline customization (bare `DocumentTemplateDesignOverrides` + manual save button) with `DocumentCustomizeCard`. BOQ receives only document font capability — no accent color, no handwriting, no compact/landscape. Created `src/domain/pdf/customization/boq.ts` with BOQ-specific capabilities, policy, and template defaults.

### 4. Standard Update

Updated `pdf-customization-extension-standard.md`:
- Section 15 (DocumentCustomizeCard) — added accent color, compact, landscape to props interface and rules
- Section 12 (Migration Order) — added capability matrix table for all document families
- New Section 16 (PdfOutputCustomizeSheet) — documented commercial wrapper pattern
- Section 17 (Lessons Learned) — renumbered from old Section 16

## Verification Result

- `bun run typecheck`: passed
- `git status`: clean scope — 4 modified + 1 new file, no unrelated changes
- `bun run build`: skipped per hardware policy

## Risks or Limitations

- **Invoice/Quotation preset bridging**: PdfOutputCustomizeSheet still manages its own `draftPreset` state for the commercial `useCustomColors`/`useCustomFonts` toggle pattern. This is necessary because commercial documents use a different persistence model (PdfDesignPreset in localStorage) compared to CSR/Waybill (usePdfCustomization engine). The card does not unify these two persistence models — it remains presentation-only.
- **BOQ has no template carousel**: BOQ uses a placeholder message in the template picker section. Future BOQ templates would need a carousel injected via the `templatePicker` prop.

## Deferred Work

- Creating a separate BOQ template carousel (BOQ currently has only one template)
- Letter and Receipt customization (not currently supported)
- RFQ PDF customization (uses separate RfqCustomizationPanel for domain controls)

## Architectural Summary

```
Document View Page
  → usePdfCustomization()  →  resolved: ResolvedPdfCustomization
  → DocumentSheet           →  presentation infrastructure
    → DocumentCustomizeCard →  canonical customization card
      → templatePicker      →  injected by document family
      → accent color        →  capability-gated
      → document font       →  capability-gated
      → ink color           →  capability-gated
      → handwriting font    →  capability-gated
      → compact/landscape   →  capability-gated
      → save button         →  delegates to page onSave
```

Different documents have different options. They share one card, one interaction model, one template-picker foundation.
