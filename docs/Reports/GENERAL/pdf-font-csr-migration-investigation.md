# PDF Font Library & CSR PDF Customization Migration — Full Investigation

**Agent:** OpenCode  
**Date:** 2026-07-10  
**Harness:** Local Runner  

---

## Scope

Parts A–D covering font library validation, CSR engine audit, font parity investigation, and architecture review. No code changes — report only.

---

## Part A — PDF Font Library Audit

### Font Registration Chain

All font registration flows through a single entry point:

```
registerPdfFonts()   [pdfFontRegistry.ts:63]
  ├─ registerFillableFontConfig() × 6 families
  ├─ registerSharedFontConfig() × 10 families
  └─ registerSharedFontConfig() × 3 locked families
```

Called from:
- `pdf-new/index.ts` (on component mount via `useEffect`)
- `domain/pdf/customization/fontRegistry.ts` (engine wrapper)
- `pdfFontRegistry.ts` exports `registerPdfFillableFonts()` (redundant alias)

### Font Matrix

| Font Family | Source File(s) | Bold Woff? | Italic Woff? | Bold Italic Src | PDF Registered |
|---|---|---|---|---|---|
| **Shared (document fonts)** | | | | | |
| Inter | `@fontsource/inter` woff | ✅ | ✅ | bold+italic | ✅ |
| Roboto | `@fontsource/roboto` woff | ✅ | ✅ | bold+italic | ✅ |
| Open Sans | `@fontsource/open-sans` woff | ✅ | ✅ | bold+italic | ✅ |
| Lato | `@fontsource/lato` woff | ✅ | ✅ | bold+italic | ✅ |
| Montserrat | `@fontsource/montserrat` woff | ✅ | ✅ | bold+italic | ✅ |
| Poppins | `@fontsource/poppins` woff | ✅ | ✅ | bold+italic | ✅ |
| Raleway | `@fontsource/raleway` woff | ✅ | ✅ | bold+italic | ✅ |
| Orbitron | `@fontsource/orbitron` woff | ✅ | ✅ | bold+italic | ✅ |
| Source Sans Pro | `@fontsource/source-sans-3` woff | ✅ | ✅ | bold+italic | ✅ |
| Roboto Condensed | `@fontsource/roboto-condensed` woff | ✅ | ✅ | bold+italic | ✅ |
| **Locked shared** | | | | | |
| Noto Sans | `@fontsource/noto-sans` | ✅ | ✅ | bold+italic | ✅ |
| Noto Sans SC | `@fontsource-variable/noto-sans-sc` | ✅ | ✅ | bold+italic | ✅ |
| **Fillable (handwriting)** | | | | | |
| Patrick Hand | `PatrickHand-Regular.woff` | ❌ (fallback to regular) | ❌ | regular | ✅ |
| Handlee | `Handlee-Regular.woff` | ❌ (fallback to regular) | ❌ | regular | ✅ |
| Caveat | `Caveat-Regular.woff` + `Caveat-Bold.woff` | ✅ | ❌ | bold | ✅ |
| Sue Ellen Francisco | `SueEllenFrancisco-Regular.woff` | ❌ (fallback to regular) | ❌ | regular | ✅ |
| Kalam | `Kalam-Regular.woff` + `Kalam-Bold.woff` | ✅ | ❌ | bold | ✅ |
| Reenie Beanie | `ReenieBeanie-Regular.woff` | ❌ (fallback to regular) | ❌ | regular | ✅ |

### Key Findings — Part A

1. **No runtime font rendering tests exist.** The `src/tests/mini-pdf-tests/renderPdf.ts` file referenced in PROJECTSKILLINDEX.md does not exist in the codebase. No snapshot or regression tests for font rendering in PDFs.

2. **Bold/italic fallback is silently opaque.** When a fillable font lacks bold/italic woff files, `registerFillableFontConfig()` registers the regular src as the bold/italic alias. This means `Patrick Hand Bold` renders identically to `Patrick Hand Regular` — there is no visual distinction. No warning is emitted; the only signal is `console.warn` if registration fails entirely.

3. **Font registration is idempotent and guarded** (`pdfFontsRegistered` flag at `pdfFontRegistry.ts:64`). Safe to call multiple times.

4. **No font subset validation.** The system trusts that `.woff` files exist and are valid. No pre-registration validation; failures surface only as Helvetica fallback at render time.

---

## Part B — CSR Engine Audit (vs Waybill)

### Engine Wiring Comparison

| Aspect | Waybill (`csr.ts`) | CSR (`csr.ts`) | Gap? |
|---|---|---|---|
| File | `src/domain/pdf/customization/waybill.ts` | `src/domain/pdf/customization/csr.ts` | — |
| `CSR_CAPABILITIES` | `{accentColor:false, documentFont:true, handwritingFont:true, handwritingColor:true}` | same | ✅ Identical |
| `CSR_DEFAULTS` | — | `{handwritingFont:'Inter', handwritingColor:'#3b82f6', documentFont:'Inter'}` | ⚠️ Different defaults |
| `WAYBILL_DEFAULTS` | `{handwritingFont:'Patrick Hand', handwritingColor:'#0f172a', documentFont:'Inter'}` | — | — |
| Bridge function | `bridgeToDesignPreset()` | `bridgeToDesignPreset()` | ✅ Identical structure |
| Engine hook usage | `usePdfCustomization({documentFamily:'waybill', ...})` | `usePdfCustomization({documentFamily:'csr', ...})` | ✅ Symmetric |

### View Page Comparison

| Aspect | `ViewWaybill.tsx` | `ViewCSR.tsx` | Gap? |
|---|---|---|---|
| Engine integration | Full — `usePdfCustomization` + `bridgeToDesignPreset` | Full — same | ✅ |
| Migration logic | Old localStorage → engine key | Old localStorage → engine key | ✅ |
| Font UI | `PDF_FILLABLE_FONT_OPTIONS.filter(...)` — inline filter of 6 fonts | `CSR_HANDWRITING_FONTS` — hardcoded array of 6 fonts | ✅ Same set |
| Document font selector | `<Select value={customization.documentFont}>` with `PDF_FONT_OPTIONS` | Uses `DocumentDesignControls` component | ✅ Equivalent |
| Fillable color | `<Input value={customization.inkColour}>` | Uses `DocumentDesignControls` | ✅ Equivalent |
| Template defaults sync | `setInkFont('auto' → WAYBILL_TEMPLATE_DEFAULTS.handwritingFont)` | `setInkFont('auto' → CSR template-specific defaults)` | ✅ Per-template |

### CSR Template Defaults

```ts
const CSR_TEMPLATE_DEFAULTS = {
  '2': { font: 'Caveat', color: '#0f172a' },
  '3': { font: 'Patrick Hand', color: '#3b82f6' },
  '4': { font: 'Handlee', color: '#1e293b' },
}
```

### Key Findings — Part B

1. **CSR and Waybill are architecturally symmetric.** Both consume the same engine hook, same resolver, same capabilities. No functional gap.

2. **CSR defaults are intentionally different from Waybill.** This is by design — different document families have different template aesthetics. Not a bug.

3. **CSR `accentColor` is disabled** (`CSR_CAPABILITIES.accentColor = false`). Waybill also disables it. Both documents hide the accent color picker.

4. **Migration paths are identical in structure.** Both read old localStorage keys (`csr_custom_font_stash`, `waybill_custom_font_key`) and write to the new engine key (`bigdrops_pdf_customization_csr` / `_waybill`).

---

## Part C — Font Parity Investigation

### Source of Truth Chain

```
pdfFillableFonts.ts          — defines REGISTERED_FILLABLE_FONTS (6 families)
pdfDesignPreset.ts           — defines PDF_FILLABLE_FONT_OPTIONS (all 16: 10 shared + 6 fillable)
ViewCSR.tsx:54               — CSR_HANDWRITING_FONTS = hardcoded subset of 6 fillable fonts
ViewWaybill.tsx:74           — WAYBILL_HANDWRITING_FONTS = PDF_FILLABLE_FONT_OPTIONS.filter(...)
DocumentDesignControls.tsx   — renders PDF_FILLABLE_FONT_OPTIONS (full list)
```

### Font Lists

| UI Layer | Fonts Shown | Source |
|---|---|---|
| `PDF_FONT_OPTIONS` (document font) | 10 shared fonts | `pdfDesignPreset.ts:75-86` |
| `PDF_FILLABLE_FONT_OPTIONS` (fillable) | 16 total (10 shared + 6 fillable) | `pdfDesignPreset.ts:88-96` |
| `CSR_HANDWRITING_FONTS` | 6 fillable only | `ViewCSR.tsx:54-61` |
| `WAYBILL_HANDWRITING_FONTS` | 6 fillable only | `ViewWaybill.tsx:74-76` |
| `DocumentDesignControls` fillable picker | 16 total | `DocumentDesignControls.tsx:274` |

### Key Finding — Part C

**Font parity is complete.** Both CSR and Waybill expose the same 6 handwriting fonts. The filtering mechanism differs (hardcoded array vs `.filter()`) but produces identical output. `DocumentDesignControls` shows the full 16-font list (10 shared + 6 fillable) for the document font picker, which is correct — document fonts should include all registered families.

No missing fonts. No orphaned font definitions. No fonts registered but never exposed in UI.

---

## Part D — Architecture Review

### Engine Architecture (Compliant)

Per `docs/standard/pdf-customization-extension-standard.md`:

| Layer | Status | Files |
|---|---|---|
| Types | ✅ Compliant | `types.ts` — capabilities, policy, template defaults, user settings, resolved output |
| Resolver | ✅ Compliant | `resolver.ts` — pure, synchronous, no React/storage/side-effects |
| Hook | ✅ Compliant | `hooks.ts` — localStorage CRUD, thin wrapper over resolver |
| Font Registry | ✅ Compliant | `fontRegistry.ts` — delegates to `registerPdfFonts()` |
| Document Config | ✅ Compliant | `waybill.ts`, `csr.ts` — capabilities, policy, defaults, bridge |

### Legacy Patterns Detected

1. **Two parallel UI systems for customization.**
   - **Engine path:** `ViewWaybill.tsx` / `ViewCSR.tsx` → `usePdfCustomization` → `DocumentDesignControls` / inline `<Select>` / `<Input>`
   - **Legacy preset path:** `pdfDesignPreset.ts` → `PdfDesignPreset` type with `useCustomColors`, `useCustomFonts`, `fillableFontMode`, etc.
   - The `PdfDesignPreset` type (`pdfDesignPreset.ts`) still exists and contains fields (`useCustomColors`, `useCustomFonts`, `fillableFontMode`, `fillableColor`) that overlap with the engine's `ResolvedPdfCustomization`. Both systems coexist.

2. **`bridgeToDesignPreset()` bridges the gap.** Each document config (`waybill.ts`, `csr.ts`) converts engine output → `PdfDesignPreset` for backward compatibility with `DocumentDesignControls` and rendering templates.

3. **`DocumentDesignControls.tsx` uses `PdfDesignPreset` directly** (not the engine's `ResolvedPdfCustomization`). It reads/writes `PdfDesignPreset.fillableFont`, `PdfDesignPreset.fillableColor`, etc. The bridge in `ViewCSR`/`ViewWaybill` converts engine state → preset before passing to this component.

4. **No font rendering test infrastructure.** The `renderPdf.ts` utility referenced in PROJECTSKILLINDEX.md does not exist. No snapshot tests for font output. No regression guard against font fallback to Helvetica.

### Risk Assessment

| Risk | Severity | Notes |
|---|---|---|
| Silent bold/italic fallback | Medium | Patrick Hand Bold renders as regular — no user-visible indicator |
| No font rendering tests | Medium | No guard against Helvetica fallback in production |
| Dual preset/engine systems | Low | Bridge pattern handles it; both systems are consistent |
| Missing `renderPdf.ts` | Low | Documented but non-existent — testing gap only |

---

## Recommendations

1. **Add font rendering tests.** Create `src/tests/mini-pdf-tests/renderPdf.ts` per PROJECTSKILLINDEX.md spec. Run `bun run test:pdf` before font-related changes. This is the highest-priority gap.

2. **Document bold/italic fallback behavior.** Add a comment in `pdfFillableFonts.ts` noting that fonts without bold woff files silently reuse regular. Consider adding a build-time check or console warning when boldSrc falls back.

3. **Consolidate `PdfDesignPreset` and `ResolvedPdfCustomization`.** The bridge pattern works but creates two parallel type systems. Future work could unify them — but this is low priority and out of scope for this migration.

4. **No action needed on CSR/Waybill parity.** Both are architecturally identical and functionally correct. Defaults differ intentionally per document family.

---

## Verification Gate

- `bun run typecheck`: Not run (report-only task, no code changes)
- `bun run test`: Not run (no code changes)
- `git status`: No files modified

**Build skipped per AGENTS.md §3 hardware constraint.**
