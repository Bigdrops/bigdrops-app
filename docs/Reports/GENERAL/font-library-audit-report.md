# PDF Font Library — Complete Audit Report

This report was written by **Backend Architect** on 2026-07-09 via OpenCode.

## Objective & Scope

**Covered**: Full forensic audit of the PDF font pipeline across all document domains (Invoice, Quotation, Waybill, CSR). Traced font registration, resolution, file integrity, and timing for every registered font family.

**Excluded**: Screen/web font loading (FontFace API via `ensureFillableWebFontsLoaded` is out of scope — only @react-pdf/renderer Font.register path is audited), build-time bundler issues (assumes Vite resolves .woff imports correctly).

---

## Evidence Base

Every finding is anchored to source files, byte-level inspection, or registry state. No speculation.

### 1. woff File Integrity

All 8 `.woff` asset files under `src/assets/pdf-fonts/` were byte-inspected for magic-bytes and header structure:

| File | Size | Magic (wOFF) | SFNT Tables | Status |
|------|------|-------------|-------------|--------|
| PatrickHand-Regular.woff | 17,652 | 77 4F 46 46 ✓ | 11 | Valid |
| Handlee-Regular.woff | 20,568 | 77 4F 46 46 ✓ | — | Valid |
| Caveat-Regular.woff | 60,108 | 77 4F 46 46 ✓ | — | Valid |
| Caveat-Bold.woff | 62,180 | 77 4F 46 46 ✓ | — | Valid |
| SueEllenFrancisco-Regular.woff | 15,780 | 77 4F 46 46 ✓ | — | Valid |
| Kalam-Regular.woff | 17,668 | 77 4F 46 46 ✓ | — | Valid |
| Kalam-Bold.woff | 16,584 | 77 4F 46 46 ✓ | — | Valid |
| **ReenieBeanie-Regular.woff** | **21,444** | **77 4F 46 46 ✓** | **11** | **Valid** |

**Conclusion**: All woff files are structurally valid. The Reenie Beanie file is a legitimate TrueType-flavored OpenType font in wOFF wrapper (sfVersion = 0x00010000, 11 font directory tables).

### 2. Registered Font Registry

**File**: `src/lib/pdfFillableFonts.ts` (lines 46-97)
**Registry key**: `REGISTERED_FILLABLE_FONTS: Record<string, RegisteredFillableFontConfig>`

| Font Name | regularSrc | boldSrc | italicSrc | Registered Aliases |
|-----------|-----------|---------|-----------|-------------------|
| Patrick Hand | PatrickHand-Regular.woff | → regularSrc | → regularSrc | 4 (reg/bold/italic/boldItalic) |
| Handlee | Handlee-Regular.woff | → regularSrc | → regularSrc | 4 |
| Caveat | Caveat-Regular.woff | Caveat-Bold.woff | → regularSrc | 4 |
| Sue Ellen Francisco | SueEllenFrancisco-Regular.woff | → regularSrc | → regularSrc | 4 |
| Kalam | Kalam-Regular.woff | Kalam-Bold.woff | → regularSrc | 4 |
| Reenie Beanie | ReenieBeanie-Regular.woff | → regularSrc | → regularSrc | 4 |

Only Caveat and Kalam have dedicated boldSrc. All other fonts reuse regularSrc for bold/italic/boldItalic aliases.

**File**: `src/lib/pdfSharedFonts.ts` (lines 50-150)
**Registry keys**: `REGISTERED_SHARED_FONTS` (10 document fonts) + `REGISTERED_LOCKED_SHARED_FONTS` (2 internal-only: Noto Sans, Cormorant Garamond)

All 12 shared fonts have separate regularSrc/boldSrc/italicSrc via `@fontsource/*` packages.

**File**: `src/lib/pdfDesignPreset.ts` (lines 276-302)
**Resolution chain in `resolvePdfFontFamily()`**:
1. Legacy aliases: `'Biro Script'` → `'Patrick Hand'`
2. Check `isRegisteredSharedFontChoice()` → returns `REGISTERED_SHARED_FONTS[choice].family`
3. Check `getRegisteredFillablePdfFontFamily()` → returns `REGISTERED_FILLABLE_FONTS[choice][variant]` (e.g., `'Reenie Beanie Bold'`)
4. Fallback: built-in Helvetica/Courier variants

### 3. Registration Engine

**File**: `src/lib/pdfFontRegistry.ts`

```typescript
function registerFillableFontConfig(config) {
  // Old API: Font.register({ family, src })
  // Each variant (regular/bold/italic/boldItalic) registered as SEPARATE family
  registerPdfAlias(config.regular, regularSrc)        // Font.register({ family: 'Reenie Beanie', src })
  registerPdfAlias(config.bold, boldSrc)              // Font.register({ family: 'Reenie Beanie Bold', src })
  registerPdfAlias(config.italic, italicSrc)          // Font.register({ family: 'Reenie Beanie Italic', src })
  registerPdfAlias(config.boldItalic, boldSrc)        // Font.register({ family: 'Reenie Beanie Bold Italic', src })
}

function registerSharedFontConfig(config) {
  // New API: Font.register({ family, fonts: [{ src, fontWeight }, ...] })
}
```

**Guard mechanism**: `pdfFontsRegistered` boolean flag. Set to `true` only after all registrations complete. No try/catch — if any single `Font.register()` throws, `pdfFontsRegistered` stays `false` and subsequent calls retry all registrations.

### 4. Registration Timing (Critical Finding)

Three distinct registration points exist, with different timing characteristics:

| Call Site | File | Timing | Fonts Registered |
|-----------|------|--------|-----------------|
| **WaybillPDF.tsx:23** | `src/components/waybill/WaybillPDF.tsx` | **Module scope (import time)** | All: 6 fillable × 4 + 10 shared + 2 locked = **~66 registrations** |
| **CSR index.tsx:12** | `src/components/csr/preview-templates/index.tsx` | **Module scope (import time)** | All: same set |
| **pdf-new/index.ts:71** | `src/components/pdf-new/index.ts` | **Inside async `generatePdf()`** | All: same set |

**Finding A**: Waybill and CSR register ALL fonts eagerly at module-import time. If any single font's `Font.register()` throws (e.g., from a corrupt file, network issue, or react-pdf bug), the entire component import fails. The `pdfFontsRegistered` guard never flips to `true`, so retry attempts also fail.

**Finding B**: Invoice/Quote (pdf-new) register lazily inside the async `generatePdf()` function, after dynamic imports resolve. A registration failure here is isolated to the PDF generation call, not the component import.

### 5. Default Preset Mapping

| Document Type | Default fillableFont | fillableFontMode | Source of Choice |
|--------------|---------------------|-----------------|-----------------|
| Invoice | Inter | auto | bodyFont (Inter) |
| Quotation | Inter | auto | bodyFont (Inter) |
| CSR | **Patrick Hand** | **custom** | fillableFont field |
| Waybill | **Patrick Hand** | **custom** | fillableFont field |
| BOQ | Inter | auto | bodyFont (Inter) |

Each template then calls `resolvePdfFontFamily(fillableChoice, 'bold')` to get the font family string for PDF elements.

### 6. Missing File: `pdfFontData.ts`

**The file `src/lib/pdfFontData.ts` does not exist in the codebase.** The Reenie Beanie binary data referenced in the audit task header is embedded as a Vite-resolved import in `pdfFillableFonts.ts`:

```typescript
// pdfFillableFonts.ts line 8
import reenieBeanieRegular from '@/assets/pdf-fonts/ReenieBeanie-Regular.woff'
```

The import resolves to a URL string at build time (e.g., `/assets/ReenieBeanie-Regular-abc123.woff`). There is no `pdfFontData.ts` file — the font data lives at `src/assets/pdf-fonts/` as static .woff files.

---

## Risks & Findings

### Risk 1: No Error Boundary Around Font Registration (HIGH)

`registerPdfFonts()` has zero error handling. A single failure:
- Prevents `pdfFontsRegistered` from being set
- Blocks all subsequent PDF generation (including for fonts that would have worked)
- For Waybill/CSR: crashes the entire component import chain

**Upgrade path**: Add `try/catch` around each `Font.register()` call, log the specific font that failed, and still set `pdfFontsRegistered = true` to allow the working fonts to proceed.

### Risk 2: Module-Scope Registration in Waybill/CSR (MEDIUM)

WaybillPDF.tsx and CSR index.tsx execute font registration at module scope (when the file is first imported). This means:
- Importing the component = registering all 66+ font variants
- A React.lazy/Suspense boundary around these components doesn't protect against registration failures within the chunk
- Code splitting doesn't help because all fonts are registered regardless of which font the user actually selected

**Upgrade path**: Move registration calls inside the component render or a lazy initialization, or gate the registration of the ~60 unselected fonts.

### Risk 3: Handwriting Fonts Missing Bold/Italic Variants (LOW Practical Impact)

For Patrick Hand, Handlee, Sue Ellen Francisco, and Reenie Beanie: the `bold`, `italic`, and `boldItalic` aliases all point to the same regularSrc woff file (which only contains Regular weight glyphs). React-pdf loads the same regular glyphs under the bold family name — no synthetic bolding occurs. This is cosmetic only; text renders, just not visually bold.

**Upgrade path**: Find bold/italic variants for these fonts on Google Fonts and add dedicated woff files + boldSrc entries.

### Risk 4: Registration Cost (LOW)

~66 Font.register() calls on every PDF generation. React-pdf only resolves and fetches fonts when rendering text elements that reference them, so the registration step itself is schema-only (no network/binary parsing). Negligible performance cost.

### Risk 5: Reenie Beanie Non-Standard Licensing (NONE)

Reenie Beanie is a Google Font under the SIL Open Font License 1.1. No commercial restrictions. Same license class as Patrick Hand, Caveat, Kalam, and other Google Fonts in the registry.

---

## Verification

- `bun run typecheck` — Not run (report-only investigation, no code changes)
- `bun run audit:load` — Not run (no query-pattern changes)
- `git status` — No files modified

## Deferred Work

1. **Wrap `registerPdfFonts()` in try/catch** — Highest-impact fix. Prevents single-font failure from blocking the entire pipeline. Approx 10 lines.
2. **Move Waybill/CSR registration from module-scope to lazy initialization** — Ensures PDF generation can proceed even if a specific font's registration is broken. Requires refactoring `WaybillPDF.tsx` and `CSR index.tsx`.
3. **Add dedicated bold/italic woff files** for Patrick Hand, Handlee, Sue Ellen Francisco, and Reenie Beanie — If visual bold rendering is needed for these handwriting fonts.
4. **Create `pdfFontData.ts` if desired** — Consolidate `REGISTERED_FILLABLE_FONTS` + `REGISTERED_SHARED_FONTS` + `REGISTERED_LOCKED_SHARED_FONTS` into a single font data registry if the split is causing confusion. Current separation (fillable vs shared vs locked) is functional but the missing `pdfFontData.ts` file from the audit scope suggests a documentation/expectation gap.
