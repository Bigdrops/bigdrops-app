# Invoice & Quotation PDF Fixes — Customization Persistence, Glyph Rendering, Money Precision

This report was written by Buffy on 2026-08-09 via Freebuff.

## 1. Objective & Scope

This report covers the fixes for the ticket in `docs/tickets/invoice&quote` (pdf-custom.md and pdf-rendering.md).

Three problems were investigated and fixed:

1. Invoice and Quotation PDF customization toggles (Custom Colors, Custom Fonts) did not persist an explicitly saved OFF state.
2. PDF text rendering corrupted certain characters (⅘, and in some fonts ¾ and `2"`).
3. The Quotation PDF rounded money totals to whole naira (₦166,313) instead of showing kobo (₦166,312.50).

In scope:

- Invoice and Quotation PDF customization persistence.
- PDF text glyph rendering for all commercial templates.
- Quotation monetary presentation in the PDF preview model.

Excluded intentionally:

- CSV export functionality.
- `src/lib/Calculations.ts` (LOCKED financial engine).
- Waybill and CSR customization behavior (working references; must stay unchanged).
- PDF template structure and layout.
- On-screen (web) preview design application.
- `bun run build` (per AGENTS.md hardware policy).

## 2. Evidence

Every finding below traces to inspected code or an execution trace.

| Finding | Source |
| --- | --- |
| `bridgeToCommercialDesignPreset` forced `useCustomColors: true` and `useCustomFonts: true` on every bridge | `src/domain/pdf/customization/commercial.ts` (pre-fix) |
| The old resolver used `getDefaultPdfDesignPreset` and the bridge, so engine-saved customizations always rendered with toggles ON | `src/domain/pdf/customization/commercial.ts` (pre-fix import) |
| `handleSaveCustomization` in the actions accepted `_nextPreset` and ignored it | `src/components/document-view/invoice/useInvoiceActions.ts:180`, `src/hooks/useQuotationActions.ts:80` |
| The sheet rebuilt the draft from the default preset plus the bridge on every open | `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` (pre-fix `useEffect`) |
| `getPdfDesignPreset` returns default presets with toggles false when nothing is saved | `src/lib/pdfDesignPreset.ts` (`DEFAULT_PRESETS`) |
| End-to-end render through the real `PdfRenderer` + Industry template: `¾ ² ½ 2" 1" 6" 3½ 5¾` rendered correctly; `⅘` rendered as `X` (byte 0x58) in descriptions and notes/terms | Scratch e2e PDF + content-stream dump (execution trace) |
| Font coverage scan (fontkit): every registered Latin-subset font lacks Number Forms (U+2150–U+218F); Orbitron also lacks ¾ ½ ² | `scratch` font-coverage scan (execution trace) |
| DejaVu Sans Latin covers all tested gap codepoints, including ⅘ U+2158 and ₦ U+20A6 | fontkit scan of `@fontsource/dejavu-sans` (execution trace) |
| Quotation totals used `formatNaira(row.amount || 0)` with no fraction option | `src/domain/quotation/previewModel.ts` (pre-fix) |
| Invoice totals used `formatNaira(v, { preserveFraction: true })` | `src/pages/ViewInvoice.tsx:92` |
| `PdfCurrencyText` renders the formatted string verbatim; it does not re-round | `src/components/pdf-new/pdfCurrency.tsx` |

## 3. Root Cause Analysis

### 3.1 Customization OFF state did not persist

Three defects worked together:

1. The bridge forced both toggles to true. Any preset merged through it lost its saved toggle state.
2. The modal never persisted the design preset. The save path wrote `pdfOutput` and `pdfTemplateId` to the database only. The `_nextPreset` argument was dropped by the action handlers.
3. The modal rebuilt its draft from the default preset on every open. Even a locally toggled OFF was reset to ON before the user could save it.

Conclusion: an explicitly saved `false` was never written to storage and was overwritten by the forced `true` on every reopen.

### 3.2 PDF character corruption

react-pdf renders a character missing from the active font by falling back to built-in Helvetica (WinAnsi). Characters outside WinAnsi are encoded as their low byte. `⅘` (U+2158) is not in WinAnsi, so it became `X` (byte 0x58).

The registered fonts are Latin-subset files. Templates default to Helvetica or Times. None of them contains Number Forms. Characters in WinAnsi (², ¾, ½, `"`) survived; characters outside WinAnsi corrupted.

Conclusion: the renderer needs a font that contains the missing glyphs. DejaVu Sans covers all tested gap codepoints.

### 3.3 Quotation money rounding

The Invoice PDF preserved kobo. The Quotation PDF did not. The difference came from the preview model: invoice passed `preserveFraction: true`; quotation did not. This was an inconsistency, not an intentional presentation rule. No financial calculation changed.

## 4. Changes

| File | Change |
| --- | --- |
| `src/domain/pdf/customization/commercial.ts` | Bridge no longer forces toggles. Resolver reads the persisted preset as the toggle source of truth and applies engine accent/font on top. Legacy default guard keeps engine-saved customizations ON until an explicit preset save exists. Exported `loadEngineSettings`. |
| `src/components/document-view/shared/PdfOutputCustomizeSheet.tsx` | Draft initialized from the persisted preset. `handleSave` persists the full preset via `setPdfDesignPreset` before `onSave`. Draft rebuilt only on open. Legacy default guard mirrors the resolver. |
| `src/lib/pdfDesignPreset.ts` | Added `hasSavedPdfDesignPreset` to distinguish an explicitly saved `false` from a never-configured default. |
| `src/lib/pdfSharedFonts.ts` | Registered `@fontsource/dejavu-sans` Latin regular and bold as `PDF_GLYPH_FONT_FAMILY` (DejaVu Sans). |
| `src/components/pdf-new/core/safeText.ts` | Added `needsGlyphFont` and `splitGlyphRuns`. Coverage rule: Latin, Latin-1, Latin Extended, General Punctuation, and WinAnsi symbols stay in the primary font; Number Forms, Letterlike, currency, math, and arrow ranges route to the glyph font. |
| `src/components/pdf-new/core/PdfGlyphText.tsx` | New component. Renders text with per-run fonts. Glyph runs use DejaVu Sans and preserve bold and italic. |
| `src/components/pdf-new/core/pdfRichText.ts` | Inline segments and the plain-text fallback now render through `PdfGlyphText`. |
| `src/components/pdf-new/templates/Minimal.tsx`, `Ledger.tsx`, `Evergreen.tsx`, `Ember.tsx`, `Crest.tsx`, `Bolt.tsx` | Description main and sub cells render through `PdfGlyphText`. Ember quantity/unit cells also. |
| `src/components/pdf-new/presentation/industry/IndustryTemplate.tsx` | Description, make, and quantity/unit cells render through `PdfGlyphText`. |
| `src/domain/quotation/previewModel.ts` | Totals use `formatNaira(v, { preserveFraction: true })` to match invoice. |
| `package.json`, `bun.lock` | Added `@fontsource/dejavu-sans`. |

Behavior matrix after the fix:

| User state | Modal shows | PDF rendering |
| --- | --- | --- |
| Never configured | OFF (default preset) | Template default, no custom accent/font |
| Engine settings only (pre-fix users) | ON (legacy guard) | Custom accent/font ON (preserved) |
| Explicitly saved OFF | OFF | No custom accent/font |
| Explicitly saved ON | ON | Custom accent/font ON |

## 5. Verification

| Gate | Result |
| --- | --- |
| `bun run typecheck` | Passed, clean (run twice, including after the legacy guard). |
| `bun run test` | Passed, 120/120 critical tests. |
| E2E PDF content-stream dump | `⅘` now embedded as glyph in `/F3 DejaVuSans-Bold` and `/F8 DejaVuSans` with ToUnicode mapping `<2158>`. Before: byte `0x58` (`X`). |
| `git status` | Only intended files modified. Scratch artifacts removed. |
| `bun run build` | Not run. AGENTS.md hardware policy (4GB RAM host). |
| `bun run audit:load` | Not run. No schema, query, or data-layer changes. |

Waybill and CSR files were not modified. Their customization behavior is unchanged.

## 6. Risks & Limitations

- DejaVu Sans Latin woff files are large (~700 KB per weight). Two weights are statically imported. This follows the existing convention of 30 bundled font files. It is a known cost, not a defect.
- The modal persistence round-trip (save OFF, reopen, generate PDF) was not exercised in a browser. It requires a live Supabase session and a seeded invoice. The logic was verified by code trace, the legacy guard, typecheck, and the test suite.
- The legacy guard depends on `hasSavedPdfDesignPreset`. It is correct today. A future cleanup that unifies the engine store and the preset store must remove it deliberately.
- Bold segments in notes and terms still force `Helvetica-Bold` (pre-existing rich-text behavior). Glyph runs inside them correctly use DejaVu Sans Bold.
- Emoji and rare scripts still corrupt if DejaVu Sans also lacks them. This is no worse than before the fix.

## 7. Deferred Work

- Browser E2E verification of the modal round-trip for Invoice and Quotation.
- Convert bundled PDF fonts to woff2, or lazy-load them, to reduce bundle size.
- Unify the engine settings store and the design preset store into one persistence layer. Then remove the legacy guard.
- Make bold notes/terms segments respect the chosen custom body font.

## Delegation

[DELEGATION] task="Invoice/Quotation PDF customization OFF-state persistence + glyph-safe rendering + quotation money precision" | domain="invoice-quotation-pdf" | subagent="NONE" | justification="No SUBAGENTS.md persona matches PDF customization/rendering bugfix work; executed in-house with code-reviewer-deepseek-flash review" | harness="Freebuff"
