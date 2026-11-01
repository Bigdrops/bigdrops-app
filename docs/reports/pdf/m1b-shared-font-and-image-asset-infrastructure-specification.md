# M1B — Shared Font and Image Asset Infrastructure Specification (Revised)

**Date:** 2026-11-01  
**Project:** BOUXRE (BIGDROPS App) — B2B Business Management Suite  
**Classification:** Infrastructure Implementation Specification  
**Status:** Revised Specification (Strictly Read-Only Investigation & Audit)  
**Deliverable File:** `docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md`  
**Writing Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Executive Summary

### 1.1 Objective and Scope
This document specifies the technical architecture for shared font and image asset infrastructure across all eight in-scope BOUXRE document types:
- **Commercial:** Invoice, Quotation, Purchase Order (PO), Cost Pricing Sheet (CPS), Receipt
- **Procurement:** Request for Quotation (RFQ)
- **Logistics:** Waybill
- **Technical / Service:** Customer Service Report (CSR)  
*(Bill of Quantities / BOQ is explicitly excluded).*

This work package forms **Milestone M1B** of the PDF rendering transition. It builds directly upon the contracts established in **Milestone M1A** (`docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`). The asset infrastructure provides shared font binaries, font registration, image loading mechanics, and diagnostic verification without imposing uniform visual designs or altering document business data.

### 1.2 Key Corrections to the Initial M1B Draft
This revised specification corrects several unverified claims, architectural oversteps, and invalid assumptions identified in the initial draft:

1. **Correction of CORS and Base64 Claims:**
   - *Previous claim:* Converting remote images to base64 data URIs solves CORS restrictions.
   - *Correction:* In a browser runtime, `fetch()` must successfully download the remote image before client-side JavaScript can encode it as base64. Base64 encoding does **not** bypass Cross-Origin Resource Sharing (CORS) or network boundaries. If the origin server lacks CORS headers, the initial `fetch()` fails.
2. **Rejection of Silent Unicode Sanitization:**
   - *Previous proposal:* A general-purpose `UnicodeSanitizerService` that automatically strips emojis, normalizes primes, and modifies document strings.
   - *Correction:* Silently altering commercial descriptions, quantities, or technical readings violates business data integrity. The proposal is removed and replaced by a **read-only Unicode and Glyph Diagnostic Service** that validates font coverage, preserves original document text, and exposes explicit warnings.
3. **Rejection of Silent Font Fallback to Inter:**
   - *Previous proposal:* The font registry silently maps any unknown font request to `Inter`.
   - *Correction:* Silent fallback hides configuration bugs, misassigned template fonts, and missing assets. The font loader must provide explicit, observable fallback behavior with diagnostic telemetry.
4. **Clarification of the Prime Corruption Root Cause ($2'' \to 23$):**
   - *Previous claim:* Unverified claim that missing `U+2033` caused low-byte modulo-256 truncation.
   - *Correction:* Traced through the legacy `@react-pdf/renderer` and `@react-pdf/pdfkit` codebases. Confirmed that in `pdfkit.js`, `encodeText` serializes unmapped characters as raw hex strings (`char.toString(16)`). For `0x2033`, this emits 4 hex digits (`2033`). In a 1-byte WinAnsi text chunk, the PDF viewer interprets `0x20` (space) and `0x33` (`'3'`), rendering $2''$ as `23`. This defect occurs when Latin-subset fonts (such as `Lato` or `Orbitron`) lack `U+2033` and bypass glyph protection in `safeText.ts`.
5. **Separation of Runtime and Offline Reality:**
   - *Previous claim:* 100% offline reliability guaranteed because Vite copies `public/` to `dist/`.
   - *Correction:* In `vite.config.js`, `base: './'` is configured. In Capacitor mobile WebViews, absolute URL fetches (`/fonts/*.ttf`) require explicit runtime verification against the local web server origin (`https://localhost/` on Android; `capacitor://localhost/` on iOS). Furthermore, SQLite caching in `src/lib/native/invoiceCache.ts` applies exclusively to invoice records; it does **not** cache company logos, signatures, or documents in other families.
6. **Narrowing Shared Media Responsibilities:**
   - *Previous proposal:* A centralized media service managing fallback vector logos and CSR-specific branding.
   - *Correction:* The shared media resolver resolves canonical URLs and loads supported image data. Document-specific branding (such as CSR Cummins references or vector fallbacks) remains owned by individual document adapters and templates.

---

## 2. Existing Font Asset Inventory & Repository Evidence

### 2.1 Physical Font Assets on Disk
A complete scan of the repository (excluding `node_modules` and `.git`) identified the following physical font files:

| Asset Path | Format | Size (Bytes) | Family & Style | Type | Current Usage & Registration Path | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public/fonts/ArchivoBlack-Regular.ttf` | TrueType (`.ttf`) | 90,988 | Archivo Black Regular | Static | `src/components/pdf/pdfcn/csr/csrPortraitFonts.ts` | **Active Production** (CSR Portrait Forme Template) |
| `public/fonts/ArchivoBlack-OFL.txt` | Text License | 4,395 | SIL OFL v1.1 | N/A | Accompanying license file | **Active Production** |
| `docs/reports/pdf/poc/assets/inter-var.ttf` | TrueType (`.ttf`) | 876,576 | Inter Variable | Variable (`fvar`, `gvar`, `HVAR`, `MVAR`) | POC test harness only | **Test Only (Not for Production)** |
| `src/assets/pdf-fonts/Caveat-Regular.woff` | WOFF (`.woff`) | 60,108 | Caveat Regular | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/Caveat-Bold.woff` | WOFF (`.woff`) | 62,180 | Caveat Bold | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/Handlee-Regular.woff` | WOFF (`.woff`) | 20,568 | Handlee Regular | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/Kalam-Regular.woff` | WOFF (`.woff`) | 17,668 | Kalam Regular | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/Kalam-Bold.woff` | WOFF (`.woff`) | 16,584 | Kalam Bold | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/PatrickHand-Regular.woff` | WOFF (`.woff`) | 17,652 | Patrick Hand Regular | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/ReenieBeanie-Regular.woff` | WOFF (`.woff`) | 21,444 | Reenie Beanie Regular | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |
| `src/assets/pdf-fonts/SueEllenFrancisco-Regular.woff` | WOFF (`.woff`) | 15,780 | Sue Ellen Francisco Regular | Static | `src/lib/pdfFillableFonts.ts` $\to$ `pdfFontRegistry.ts` | Active (React-PDF Waybill) |

*Evidence Summary:* Only **one** production TrueType font (`ArchivoBlack-Regular.ttf`) currently exists in the repository.

### 2.2 NPM Font Packages (`@fontsource/*`)
All primary commercial fonts used by the existing React-PDF pipeline are imported via `@fontsource/*` packages in [`src/lib/pdfSharedFonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/pdfSharedFonts.ts).
Inspection of `node_modules/@fontsource/*/files/` confirms that **zero** TrueType (`.ttf`) or OpenType (`.otf`) files exist in these packages. They distribute exclusively `.woff` and `.woff2` files:
- `@fontsource/inter` (252 files, `.woff` and `.woff2` only)
- `@fontsource-variable/inter` (42 files, `.woff2` only)
- `@fontsource/roboto` (`.woff` and `.woff2` only)
- `@fontsource/open-sans` (`.woff` and `.woff2` only)
- `@fontsource/lato` (`.woff` and `.woff2` only)
- `@fontsource/montserrat` (`.woff` and `.woff2` only)
- `@fontsource/poppins` (`.woff` and `.woff2` only)
- `@fontsource/raleway` (`.woff` and `.woff2` only)
- `@fontsource/orbitron` (`.woff` and `.woff2` only)
- `@fontsource/source-sans-pro` (`.woff` and `.woff2` only)
- `@fontsource/roboto-condensed` (`.woff` and `.woff2` only)
- `@fontsource/noto-sans` (288 files, `.woff` and `.woff2` only)
- `@fontsource/cormorant-garamond` (`.woff` and `.woff2` only)
- `@fontsource/dejavu-sans` (`.woff` and `.woff2` only)
- `@fontsource/caveat` (32 files, `.woff` and `.woff2` only)

### 2.3 Existing Font Registration Authority
The repository contains an existing Forme font loader in [`src/components/pdf/forme/fonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/fonts.ts):
```ts
const FALLBACK_FAMILY = 'Helvetica'
const FORME_SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf']

export async function ensureFormeFontFamily(choice: unknown): Promise<string> {
  const family = resolveFormeFontFamily(choice)
  if (family === FALLBACK_FAMILY || registeredFamilies.has(family)) {
    return family
  }
  try {
    const config = getRegisteredSharedFontConfig(family)
    if (!config) return FALLBACK_FAMILY
    if (!isFormeSupportedFontSource(config.regularSrc)) return FALLBACK_FAMILY
    const regular = toBytes(config.regularSrc) || await fetchBytes(config.regularSrc)
    ...
    Font.register({ family, src: regular, fontWeight: 400 })
    registeredFamilies.add(family)
    return family
  } catch {
    return FALLBACK_FAMILY
  }
}
```

### 2.4 The CPS Forme Font Fallback Defect (Confirmed Mechanism)
In the existing Cost Pricing Sheet (CPS) Forme implementation:
1. CPS templates request fonts registered in `src/lib/pdfSharedFonts.ts` (e.g. `Inter`).
2. `ensureFormeFontFamily()` inspects `config.regularSrc`.
3. Because `config.regularSrc` points to an imported `.woff` file, `isFormeSupportedFontSource()` returns `false`.
4. The loader immediately aborts registration and returns `Helvetica`.
5. **Result:** Every CPS Forme export silently renders in `Helvetica`.

---

## 3. Font Selection, Licensing, and Glyph Coverage Evidence

### 3.1 Four Proposed Typographic Families
To support all eight document types without font bloat, four core typographic families are designated:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE TYPOGRAPHIC FAMILIES                       │
├───────────────────────────────┬────────────────────────────────────────┤
│ 1. Primary Commercial Body     │ Inter (Regular 400, Bold 700)          │
│    • Invoices, Quotations, PO,│ Clean, neutral sans-serif; high legi-  │
│      CPS, Waybill, RFQ, Receipt│ bility at 7pt–9pt in dense schedules.  │
├───────────────────────────────┼────────────────────────────────────────┤
│ 2. Technical Display Headings │ Archivo Black (Regular 400)            │
│    • CSR Blueprint & Reference│ Heavy, industrial sans-serif; high-    │
│      major section titles      │ impact visual hierarchy.               │
├───────────────────────────────┼────────────────────────────────────────┤
│ 3. Fillable Script / Hand     │ Caveat (Regular 400, Bold 700)         │
│    • Waybill sign-off, CSR    │ Natural cursive script simulating real │
│      handwritten field entries │ pen completion on printed forms.       │
├───────────────────────────────┼────────────────────────────────────────┤
│ 4. Multi-Script Currency      │ Noto Sans (Regular 400)                │
│    • Established fallback for  │ Global currency and symbol fallback    │
│      currency & math symbols   │ when primary font subsets lack glyphs. │
└───────────────────────────────┴────────────────────────────────────────┘
```

### 3.2 License Verification & Source Audit Table

| Font Family | Author / Foundry | License | Verifiable License Source | Repository Asset Status | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Archivo Black** | Omnibus-Type | SIL Open Font License 1.1 | `public/fonts/ArchivoBlack-OFL.txt` | Present on disk (`90,988` bytes) | **In Production** (CSR) |
| **Inter** | Rasmus Andersson | SIL Open Font License 1.1 | Official release (rsms/inter) | **Missing static TTF** (Only `.woff` in npm & variable `.ttf` in POC) | Not yet deployed to production Forme |
| **Caveat** | Pablo Impallari | SIL Open Font License 1.1 | Google Fonts / Impallari Type | **Missing static TTF** (Only `.woff` in `src/assets/pdf-fonts/`) | In production React-PDF only |
| **Noto Sans** | Google Fonts | SIL Open Font License 1.1 | Google Fonts OFL repository | **Missing static TTF** (Only `.woff` in npm) | In production React-PDF only |

### 3.3 Detailed Family Analysis & Status

#### Inter
- **Source & Version:** Official desktop static build from Rasmus Andersson (Inter v4.0 or v3.19).
- **Format:** Static TrueType (`.ttf`). Variable fonts must **not** be deployed to production Forme.
- **Required Weights & Styles:** Regular (400), Bold (700).
- **Italic Style Assessment:** While Inter supports italics, commercial invoices and technical tables in BOUXRE use upright regular and bold weights. Italic static binaries are optional and should only be bundled if an approved design explicitly requires them.
- **Forme Compatibility:** Confirmed compatible with static TTF binaries.
- **Repository Status:** Missing static TTF assets in `public/fonts/`.

#### Caveat
- **Source & Version:** Google Fonts / Impallari Type static TrueType release.
- **Format:** Static TrueType (`.ttf`).
- **Required Weights & Styles:** Regular (400) and Bold (700).
- **Forme Compatibility:** Confirmed compatible with static TTF binaries.
- **Repository Status:** Only `.woff` files currently exist in `src/assets/pdf-fonts/`.

#### Archivo Black
- **Source & Version:** Omnibus-Type.
- **Format:** Static TrueType (`.ttf`). Single weight (Regular 400).
- **License Location:** `public/fonts/ArchivoBlack-OFL.txt` (verified on disk).
- **Forme Compatibility:** Confirmed working in production CSR Portrait template.
- **Repository Status:** Fully verified on disk (`public/fonts/ArchivoBlack-Regular.ttf`).

#### Noto Sans
- **Source & Version:** Google Fonts Noto project.
- **Format:** Static TrueType (`.ttf`). Regular (400).
- **Reassessment of Requirement:**
  - Fontkit inspection of complete Inter v4.0 confirms that full Inter covers both `₦` (`U+20A6`) and primes (`U+2032`, `U+2033`).
  - However, if an Inter binary with a restricted character map is deployed, `₦` rendering will fail.
  - `Noto Sans` has served as the production currency fallback in React-PDF (`src/components/pdf/pdfCurrency.tsx`). Retaining `Noto Sans Regular` provides defense-in-depth for currency symbols across global locales.

### 3.4 Glyph Coverage & Technical Analysis
Fontkit character-map inspection was performed across installed font packages with the following results:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GLYPH COVERAGE SCAN (fontkit)                   │
├──────────────────────────────┬───────────┬──────────────┬──────────────┤
│ Font Binary                  │ Prime (′) │ Dbl Prime (″)│ Naira (₦)    │
│                              │ U+2032    │ U+2033       │ U+20A6       │
├──────────────────────────────┼───────────┼──────────────┼──────────────┤
│ inter-var.ttf (Full v4.0)    │ TRUE      │ TRUE         │ TRUE         │
│ inter-latin-400-normal.woff  │ TRUE      │ TRUE         │ FALSE        │
│ roboto-latin-400-normal.woff │ TRUE      │ TRUE         │ FALSE        │
│ open-sans-latin-400.woff     │ TRUE      │ TRUE         │ FALSE        │
│ lato-latin-400-normal.woff   │ FALSE     │ FALSE        │ FALSE        │
│ orbitron-latin-400.woff      │ FALSE     │ FALSE        │ FALSE        │
│ ArchivoBlack-Regular.ttf     │ TRUE      │ TRUE         │ FALSE        │
└──────────────────────────────┴───────────┴──────────────┴──────────────┘
```

1. **Naira Symbol (`₦`, U+20A6):**
   - `@fontsource/inter` Latin subset omits `U+20A6` (Currency Symbols block).
   - The full static Inter desktop binary **includes** `U+20A6`.
2. **Double Prime (`″`, U+2033) and Prime (`′`, U+2032):**
   - Included in full Inter and Archivo Black.
   - **Missing** in `@fontsource/lato` and `@fontsource/orbitron`.
3. **Engineering Units in CSR:**
   - Degree Celsius (`°C`, `U+00B0`), Micro (`µ`, `U+00B5`), Ohm (`Ω`, `U+03A9`), Diameter (`Ø`, `U+00D8`). Must be verified in the target static Inter cmap.

---

## 4. Investigation: The Prime Corruption Defect ($2'' \to 23$)

### 4.1 The Observed Defect
In production quotation and invoice documents (e.g. `SASQUO-000428.pdf`), pipe specifications such as `2″`, `3″`, `4″` were observed rendering as `23`, `33`, `43`.

### 4.2 Technical Trace Through React-PDF and PDFKit
A trace of the text layout and font encoding pipeline revealed the mechanism:

1. **Glyph Fallback Bypass in `safeText.ts`:**
   In [`src/components/pdf/core/safeText.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/core/safeText.ts) (lines 72–73):
   ```ts
   // General Punctuation (curly quotes, dashes, bullets, ellipsis, primes).
   if (code >= 0x2000 && code <= 0x206f) return true
   ```
   The helper assumed that all registered primary fonts cover General Punctuation (`U+2000`–`U+206F`). As proven by fontkit inspection, Latin-subset fonts like `Lato` and `Orbitron` lack `U+2033`. Consequently, `splitGlyphRuns()` did **not** route `″` to `DejaVu Sans`.

2. **Delegation to Built-in Helvetica Fallback:**
   Because the active font lacked `U+2033`, `@react-pdf/renderer` delegated the character to PDFKit's default `Helvetica` Type 1 font.

3. **Hex Serialization in `pdfkit.js`:**
   In `node_modules/@react-pdf/pdfkit/lib/pdfkit.js` (lines 3110–3116):
   ```js
   encodeText(text) {
     const res = [];
     for (let i = 0; i < text.length; i++) {
       let char = text.charCodeAt(i);
       char = WIN_ANSI_MAP[char] || char;
       res.push(char.toString(16));
     }
     return res;
   }
   ```
   - For `″` (`U+2033`, decimal 8243), `WIN_ANSI_MAP[8243]` is `undefined`.
   - `char.toString(16)` evaluated to the 4-character hex string `'2033'`.
   - In lines 38665–38675, PDFKit assembled the text command: `[<322033>] TJ`.

4. **PDF Viewer 1-Byte Decoding:**
   Under PDF ISO 32000-1 §9.6.2.2, Type 1 fonts with `WinAnsiEncoding` parse content streams as 1-byte character codes. A conforming PDF viewer reads:
   - Byte 1: `0x32` $\to$ ASCII `'2'`
   - Byte 2: `0x20` $\to$ ASCII `' '` (space, often with zero or minimal advance in unmapped fonts)
   - Byte 3: `0x33` $\to$ ASCII `'3'`
   - **Result:** The viewer visually displays `'2'` followed by `'3'`, producing `23`.

### 4.3 Classification of Findings
- **Classification:** **Confirmed Root Cause** for the legacy React-PDF pipeline when using fonts that omit `U+2033`.
- **Forme Relevance:** Forme does not use PDFKit or WinAnsi Type 1 encoding. Forme embeds OpenType CFF/TrueType streams with 2-byte Identity-H encoding. However, if a font binary lacks `U+2033`, Forme's HarfBuzz/Rust layout engine will render a `.notdef` box (blank rectangle) or fall back to Helvetica. Embedding static fonts with verified cmap coverage is mandatory.

---

## 5. Forme Font & Text Rendering Constraints

### 5.1 Supported Font Formats (TrueType/OpenType SFNT Only)
Inspection of `@formepdf/core` and `@formepdf/shared` confirms:
- **SFNT Stream Requirement:** Forme accepts only raw TrueType (`.ttf`) or OpenType (`.otf`) SFNT streams.
- **WOFF/WOFF2 Rejection:** Forme's WebAssembly layout engine contains no zlib or brotli decompression routines. Supplying a `.woff` or `.woff2` file triggers a parse error or silent fallback.

### 5.2 Variable Font Incompatibility
- Variable fonts (such as `docs/reports/pdf/poc/assets/inter-var.ttf`) contain dynamic variation tables (`fvar`, `gvar`, `HVAR`, `MVAR`).
- Forme's underlying Rust Wasm parser parses static tables (`glyf`, `loca`, `CFF `). Passing variable font binaries triggers layout warnings and fails to instantiate non-default weights reliably.
- **Rule:** Only static, single-weight font binaries are permitted in production.

### 5.3 Runtime Source Path Resolution
Inspection of `@formepdf/core/dist/index.js` (Node/Bun) and `@formepdf/core/dist/shared/browserHelpers.js` (Browser) reveals how Forme loads `font.src`:

```ts
// Browser / WebView (@formepdf/core/dist/shared/browserHelpers.js):
if (typeof font.src === 'string' && !font.src.startsWith('data:')) {
    const res = await fetch(font.src);
    if (!res.ok) throw new Error(`Failed to fetch font: ${font.src} (${res.status})`);
    const buf = new Uint8Array(await res.arrayBuffer());
    font.src = uint8ArrayToBase64(buf);
}

// Node / Bun Tests (@formepdf/core/dist/index.js):
else if (typeof font.src === 'string' && !font.src.startsWith('data:')) {
    const bytes = await readFile(resolve(font.src));
    font.src = uint8ArrayToBase64(new Uint8Array(bytes));
}
```

- **In Node / Bun CLI tests:** `font.src` must be a relative filesystem path resolvable via `resolve(font.src)` (e.g. `'public/fonts/Inter-Regular.ttf'`).
- **In Browser / WebView:** `font.src` must be a URL resolvable via `fetch()` (e.g. `'/fonts/Inter-Regular.ttf'`).
- **Data URIs / Uint8Array:** Pass directly into Wasm without network or filesystem calls.

### 5.4 Font Fallback Policy: Preventing Silent Fallback to Inter
The font loader must provide explicit, observable fallback behavior rather than silently substituting `Inter` for unknown font requests:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FONT LOADER BEHAVIOR MATRIX                     │
├───────────────────────┬────────────────────────────────────────────────┤
│ Condition             │ Action & Telemetry                             │
├───────────────────────┼────────────────────────────────────────────────┤
│ 1. Registered Font    │ Registers requested font family in Forme.      │
│    (Asset valid)      │ Status: SUCCESS.                               │
├───────────────────────┼────────────────────────────────────────────────┤
│ 2. Unregistered Font  │ Rejects request. Emits diagnostic warning.     │
│    (Unknown name)     │ Falls back to Helvetica (PDF standard 14 font).│
│                       │ Status: WARN_UNREGISTERED_FAMILY.              │
├───────────────────────┼────────────────────────────────────────────────┤
│ 3. Missing Asset File │ Emits error diagnostic.                        │
│    (404 or ENOENT)    │ Falls back to Helvetica.                       │
│                       │ Status: ERROR_FONT_FILE_NOT_FOUND.             │
├───────────────────────┼────────────────────────────────────────────────┤
│ 4. Unsupported Format │ Rejects non-TTF/OTF source (e.g. .woff).       │
│    (WOFF / WOFF2)     │ Status: ERROR_UNSUPPORTED_FONT_FORMAT.         │
├───────────────────────┼────────────────────────────────────────────────┤
│ 5. Failed Font Fetch  │ Catches network/stream failure.                │
│    (CORS or network)  │ Falls back to Helvetica.                       │
│                       │ Status: ERROR_FONT_FETCH_FAILED.               │
├───────────────────────┼────────────────────────────────────────────────┤
│ 6. Missing Glyph      │ Forme HarfBuzz renders .notdef box.            │
│    (Character omitted)│ Glyph diagnostic service reports missing code. │
│                       │ Status: WARN_MISSING_GLYPH.                    │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

## 6. Text Integrity & Glyph Diagnostics (Replacing Silent Unicode Sanitizer)

### 6.1 Rejection of Silent Content Sanitization
The previous proposal for a `UnicodeSanitizerService` authorized automated string rewriting: stripping emojis, converting prime characters to straight quotes, and removing unsupported characters.

**Architecural Decision:** Silent text mutation is strictly prohibited.
- Modifying descriptions, serial numbers, or dimension strings in commercial or technical documents alters legal and contractual records.
- If an engineer enters `2″ Schedule 40 Pipe`, the system must not rewrite it to `2 in Schedule 40 Pipe` without explicit business logic rules.
- If a client name contains non-Latin glyphs, stripping them silently produces an invalid document.

### 6.2 Text Preservation Rule
Original business and technical input text must pass through the rendering pipeline unmodified.

### 6.3 Read-Only Glyph Validation and Diagnostic Responsibility
In place of a mutator, a read-only **Glyph Diagnostic Utility** is defined. Its responsibilities are:
1. Scan text strings during pre-render checks against target font character maps.
2. Identify characters outside the font's unicode coverage.
3. Emit structured diagnostic warnings (`missingGlyphs: string[]`).
4. Support automated CI tests to ensure that approved document fixtures contain no unrenderable characters.
5. Never mutate, truncate, or alter the rendered string.

---

## 7. Image, Media, and Branding Infrastructure

### 7.1 Canonical Branding Path
The single source of truth for resolving document branding URLs is [`src/domain/documentMedia.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/documentMedia.ts) (`resolveCanonicalLogoUrl`).
```ts
export function resolveCanonicalLogoUrl(value: any): string | null {
  if (value && typeof value === 'object') {
    return resolvePersistedMediaUrl(
      value.company_logo_url,
      value.companyLogoUrl,
      value.logo_url,
      value.imageUrl,
    )
  }
  return resolvePersistedMediaUrl(value)
}
```

### 7.2 Existing Document Implementations and Bypasses
Inspection of existing document renderers identifies several bypasses of `resolveCanonicalLogoUrl`:

1. **Invoice & Quotation:** Calls `resolveCanonicalLogoUrl(settings)` in `ViewInvoice.tsx` and `pdfDownloadHandler.ts`. Conforms to canonical branding.
2. **Waybill:** Reads `company.logo` or `settings.company_logo_url` directly in `src/components/waybill/waybillUtils.ts` (line 368). Bypasses `resolveCanonicalLogoUrl`.
3. **Receipt:** Reads `model.issuer.logo` in `src/components/pdf/ReceiptPdf.tsx` (line 15). Bypasses `resolveCanonicalLogoUrl`.
4. **RFQ:** Completely omits company logo rendering.
5. **CSR Forme:** Uses `BrandLogo` in [`src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx):
   - Renders `<Image src={logoUrl} />` if `logoUrl` is provided.
   - If `logoUrl` is empty, renders `null` (renders no logo). It does **not** fall back to an SVG vector mark. (The Cummins vector logo exists exclusively in the HTML template mockups, not in production Forme code).

### 7.3 Demystifying CORS and Base64 Encoding
- **The Browser Security Model:** In a browser or WebView environment, client-side JavaScript cannot read raw binary data from an external origin unless that origin responds with valid CORS headers (`Access-Control-Allow-Origin`).
- **Base64 Is Not a CORS Bypass:** To convert a remote URL into a base64 data URI, client code must first execute `fetch(url)`. If the remote server rejects the cross-origin request, `fetch()` throws a `TypeError: Failed to fetch`. No base64 data URI can be generated.
- **Remote Fetch Failure Modes:** Remote image fetches can fail due to:
  1. Missing or restrictive CORS headers on the remote storage bucket.
  2. Expired authentication tokens or missing authorization headers on private storage buckets.
  3. Network unavailability or offline status.
  4. Remote server outages (HTTP 5xx) or deleted files (HTTP 404).
- **Server-Side Proxy Policy:** A server-side image proxy (e.g. Vercel Serverless Function or Supabase Edge Function) could fetch remote images on behalf of the client. However, introducing an image proxy requires security reviews regarding Server-Side Request Forgery (SSRF), bandwidth amplification, and rate limiting. **No server proxy is authorized in Milestone M1B.**

### 7.4 The Media Loading Decision Path
The media loading architecture must follow a deterministic, six-stage decision path:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MEDIA LOADING DECISION PATH                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Local Bundled Asset                                                 │
│    • Asset path starts with '/images/' or is imported via Vite.        │
│    • Resolved locally from bundle. Zero network request.               │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Existing Cached Data                                                │
│    • Data already exists as a 'data:image/...' URI in state or memory. │
│    • Passed directly to Forme without fetching.                        │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Remote URL with Valid Access & CORS                                 │
│    • Client executes fetch(url) with timeout (e.g. 3000ms).            │
│    • HTTP 200 OK received $\to$ converted to base64 data URI.          │
│    • Passed to Forme. Status: LOADED.                                  │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Remote URL That Fails (CORS / Network / HTTP Error)                 │
│    • Client catches fetch error. Emits diagnostic warning.             │
│    • Image resolves to null. PDF renders cleanly without broken icon.  │
│    • Status: FAILED (Reason documented in diagnostics).                │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Offline Operation                                                   │
│    • Network unavailable. Non-cached remote URLs immediately fail      │
│      to null. PDF renders with text branding only.                     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Missing or Invalid Image Data                                       │
│    • URL is null, empty, or unparseable. Resolves immediately to null. │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Supabase Storage Configuration Limitations in the Repository
- Inspection of `supabase/config.toml` confirms that storage buckets are enabled, but CORS origins and S3 access policies are not defined in local repository files.
- In production, Supabase Storage CORS headers are configured via the hosted dashboard or cloud infrastructure.
- **Limitation:** Whether remote Supabase public URLs permit cross-origin canvas/Wasm reads cannot be verified from repository source code alone. This remains a required runtime verification gate.

### 7.6 Forme Image Constraints (Explicit Dimensions vs Invalid `objectFit`)
- In React-PDF, `<Image>` supports CSS-like properties including `objectFit: 'contain'`.
- In Forme (`@formepdf/react`), the `Image` primitive accepts numeric `width` and `height` props. The `Style` object does **not** recognize `objectFit`.
- Passing `objectFit: 'contain'` in Forme styles causes TypeScript compilation errors.
- **Rule:** Forme image wrappers must use explicit numeric dimensions:
  ```tsx
  <Image src={logoDataUri} width={120} height={40} />
  ```

### 7.7 Scope Boundaries of the Shared Media Service
To preserve Milestone M1A domain boundaries, the responsibilities of the shared media service are strictly partitioned:

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ SHARED MEDIA SERVICE OWNS:           │ SHARED MEDIA SERVICE DOES NOT OWN:   │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • Canonical logo URL resolution      │ • Document-specific fallback logos   │
│   (via resolveCanonicalLogoUrl).     │   (e.g. CSR Cummins branding).       │
│ • Fetching remote image bytes with   │ • Document layout, positioning, or   │
│   timeout & CORS error handling.     │   template styling.                  │
│ • Base64 conversion of successfully  │ • Signature approval logic or        │
│   downloaded images.                 │   business authorization rules.      │
│ • Media loading telemetry and        │ • Automatic server proxying or       │
│   diagnostic error reporting.        │   network route bypassing.           │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 8. Runtime Environment & Offline Analysis

### 8.1 Detailed Environment Evaluation

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RUNTIME ENVIRONMENT MATRIX                           │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Vite Development Server (Web)                                       │
│    • Source: Browser fetch() against Vite dev server localhost:5000.   │
│    • Packaging: Serves files directly from public/ directory.          │
│    • Evidence: Confirmed working for Archivo Black in CSR preview.     │
│    • Assumptions: None.                                                │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Vercel Production Deployment (Web)                                  │
│    • Source: Browser fetch() against Vercel CDN edge origin.           │
│    • Packaging: public/ copied to build output root.                   │
│    • Evidence: Static assets at /fonts/*.ttf serve with 200 OK.        │
│    • Assumptions: Remote Supabase images require valid CORS headers.   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Bun Test Runner (CLI / Tests)                                       │
│    • Source: Forme Node loader uses readFile(resolve(font.src)).       │
│    • Packaging: Local filesystem access.                               │
│    • Evidence: Confirmed in src/tests/critical/pdfcnMasterResolver.    │
│    • Assumptions: Process must execute from repository root.           │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Capacitor Mobile (Android & iOS)                                    │
│    • Source: Native WebView (https://localhost/ on Android).           │
│    • Packaging: capacitor.config.ts webDir: 'dist'.                    │
│    • Evidence: Dist directory is bundled inside native APK/IPA.        │
│    • Assumptions & Risks: vite.config.js defines base: './'. Relative  │
│      vs absolute path resolution (/fonts/ vs ./fonts/) requires      │
│      explicit runtime verification on physical devices.                │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Evaluation of `invoiceCache.ts` Scope and Offline Reality
- `src/lib/native/invoiceCache.ts` provides SQLite storage using `@capacitor-community/sqlite`.
- Inspection of the schema confirms that it only caches `invoice_items` and `invoices`. The table includes an `image_url` column for item line-art, but **no** table stores company logos, signatures, or documents outside the Invoice domain.
- **Offline Reality:** Waybill, CSR, CPS, RFQ, Receipt, and Purchase Order do not possess offline SQLite image caches. If a mobile user generates a PDF offline, remote company logos will fail to load and must gracefully fall back to text-only headers.

### 8.3 Capacitor Asset Resolution & Base Path (`base: './'`)
- In `vite.config.js`:
  ```js
  export default defineConfig({
    base: './',
    build: { outDir: 'dist' },
    ...
  })
  ```
- Because `base: './'` generates relative asset paths in HTML, hardcoded absolute fetches (`fetch('/fonts/Inter-Regular.ttf')`) may behave differently across Android WebView (`https://localhost/`) and iOS WKWebView (`capacitor://localhost/`).
- **Action Required:** Dedicated mobile runtime verification of font URL fetches must be completed during Milestone M1B testing.

---

## 9. Illustrative TypeScript Architectural Contracts

The following TypeScript interfaces define the corrected boundaries for Milestone M1B:

```ts
// ============================================================================
// 1. FONT ASSET & REGISTRATION CONTRACTS
// ============================================================================

export type StandardPdfFontFamily =
  | 'Inter'
  | 'Archivo Black'
  | 'Caveat'
  | 'Noto Sans'

export interface StaticFontDefinition {
  readonly family: StandardPdfFontFamily
  readonly weight: 400 | 700
  readonly style: 'normal' | 'italic'
  readonly relativeFsPath: string      // e.g. 'public/fonts/Inter-Regular.ttf'
  readonly publicUrlPath: string        // e.g. '/fonts/Inter-Regular.ttf'
  readonly license: 'SIL OFL 1.1'
  readonly licenseFile: string          // e.g. 'public/fonts/Inter-OFL.txt'
}

export type FontRegistrationStatus =
  | 'SUCCESS'
  | 'ALREADY_REGISTERED'
  | 'WARN_UNREGISTERED_FAMILY'
  | 'ERROR_FONT_FILE_NOT_FOUND'
  | 'ERROR_UNSUPPORTED_FONT_FORMAT'
  | 'ERROR_FONT_FETCH_FAILED'

export interface FontRegistrationResult {
  readonly requestedFamily: string
  readonly resolvedFamily: string
  readonly status: FontRegistrationStatus
  readonly errorMessage?: string
}

// ============================================================================
// 2. READ-ONLY GLYPH VALIDATION & DIAGNOSTIC CONTRACTS
// ============================================================================

export interface GlyphCoverageDiagnostic {
  readonly documentId: string
  readonly fieldPath: string
  readonly textContent: string
  readonly missingCodePoints: number[]
  readonly missingCharacters: string[]
  readonly fontTarget: StandardPdfFontFamily
}

export interface DocumentTextValidationReport {
  readonly documentId: string
  readonly isFullyCovered: boolean
  readonly diagnostics: readonly GlyphCoverageDiagnostic[]
}

// ============================================================================
// 3. MEDIA RESOLUTION & PRELOAD CONTRACTS
// ============================================================================

export type MediaLoadingStatus =
  | 'LOADED'
  | 'FAILED_CORS'
  | 'FAILED_NETWORK'
  | 'FAILED_NOT_FOUND'
  | 'FAILED_INVALID_SOURCE'
  | 'EMPTY'

export interface ResolvedMediaAsset {
  readonly originalSource: string | null
  readonly resolvedDataUri: string | null  // Base64 data: URI when successfully loaded
  readonly status: MediaLoadingStatus
  readonly contentType?: string
  readonly errorMessage?: string
}

export interface DocumentMediaResolutionRequest {
  readonly logoSource?: unknown
  readonly signatureSource?: unknown
  readonly itemImageSources?: readonly (string | null | undefined)[]
  readonly fetchTimeoutMs?: number         // Default: 3000ms
}

export interface DocumentMediaResolutionResult {
  readonly logo: ResolvedMediaAsset
  readonly signature?: ResolvedMediaAsset
  readonly itemImages: readonly ResolvedMediaAsset[]
}
```

---

## 10. Migration and Implementation Plan

Milestone M1B is executed in four focused, reviewable stages:

### Stage M1B.1: Static Font Asset Sourcing and Bundling
- **Objective:** Procure, verify, and bundle static TrueType fonts with confirmed OFL licenses in `public/fonts/`.
- **Files to Add:**
  - `public/fonts/Inter-Regular.ttf` & `public/fonts/Inter-Bold.ttf` (Sourced from Rasmus Andersson official static release).
  - `public/fonts/Caveat-Regular.ttf` & `public/fonts/Caveat-Bold.ttf` (Sourced from Google Fonts OFL static release).
  - `public/fonts/NotoSans-Regular.ttf` (Sourced from Google Fonts OFL static release).
  - Corresponding license files: `Inter-OFL.txt`, `Caveat-OFL.txt`, `NotoSans-OFL.txt`.
- **Prohibited:** No variable fonts. No `.woff` or `.woff2` files.
- **Verification:** fontkit cmap scan verifying coverage of `U+20A6` (₦), `U+2032` (′), `U+2033` (″).

### Stage M1B.2: Forme Font Registration Authority Refinement
- **Objective:** Upgrade [`src/components/pdf/forme/fonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/fonts.ts) to manage dual-runtime path resolution and explicit fallback behavior.
- **Files to Modify:** `src/components/pdf/forme/fonts.ts`.
- **Architecture Rules:**
  - Do not create a second competing font authority. Preserve `fonts.ts` as the sole registration module.
  - Implement dual-runtime path resolution (fs path in Node/Bun tests; public URL in browser/Capacitor).
  - Implement explicit fallback telemetry (no silent mapping to Inter).
  - Prevent duplicate registration via internal `Set<string>`.

### Stage M1B.3: Shared Media Resolution & Preloading Service
- **Objective:** Implement a CORS-aware, non-throwing media resolution service.
- **Files to Create:** `src/domain/pdf/assets/mediaResolver.ts`.
- **Files to Modify:** Integrate into `src/domain/pdf/resolver/csr/prepareCsrDocument.ts` and commercial document resolvers.
- **Architecture Rules:**
  - Call `resolveCanonicalLogoUrl()` from `src/domain/documentMedia.ts`.
  - Handle client fetch failures gracefully (timeout, CORS, offline) by returning `status: 'FAILED'` and `resolvedDataUri: null`.
  - Never throw errors that break document generation.
  - Do not implement server proxies or document-specific branding overrides.

### Stage M1B.4: Focused Verification Gate
- **Objective:** Comprehensive automated test verification without running `bun run build`.
- **Files to Create:** `src/tests/critical/formeAssetInfrastructure.test.js`.
- **Test Matrix:**
  1. Font registration success for Inter, Caveat, Archivo Black, Noto Sans in Bun.
  2. Fallback to Helvetica on unregistered font requests with observable status.
  3. Cmap verification for `₦`, `′`, `″`, and CSR engineering symbols (`°C`, `µ`, `Ω`, `Ø`).
  4. Media resolution success on valid base64 data URIs.
  5. Media resolution graceful fallback on failed network/CORS fetches.

---

## 11. Risk Register

| Risk ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Forme WOFF Rejection:** Supplying WOFF assets triggers Wasm errors. | **High** | **Certain** | Commit raw `.ttf` binaries only. Never register `.woff` paths in Forme. |
| **R-02** | **CORS Remote Image Failure:** Remote storage images fail cross-origin browser fetches. | **High** | **High** | Catch fetch errors cleanly; return `null` data URI; render text branding without crashing. |
| **R-03** | **Variable Font Artifacts:** Deploying variable Inter causes weight distortion in Forme. | **High** | **High** | Enforce static, single-weight TrueType binaries only. Reject variable fonts. |
| **R-04** | **Silent Font Fallback Masking:** Unregistered fonts silently resolving to Inter hides layout bugs. | **Medium** | **High** | Emit explicit telemetry warnings; fallback to standard Helvetica visibly. |
| **R-05** | **Silent Text Corruption:** Sanitizers altering text corrupt contractual documents. | **High** | **High** | Prohibit content-altering sanitizers. Original input text is immutable. |
| **R-06** | **Capacitor Relative Base Path Mismatch:** `base: './'` breaks `/fonts/*.ttf` fetches in WebView. | **High** | **Medium** | Perform physical device/emulator runtime verification in Stage M1B.4. |
| **R-07** | **Uncached Offline Image Failure:** Offline exports on mobile drop remote logos. | **Medium** | **High** | Accept text-only header fallback offline. Do not assume `invoiceCache.ts` covers all documents. |
| **R-08** | **Font Asset Payload Bloat:** Excessive font files inflate mobile bundle. | **Medium** | **Low** | Restrict bundle to 4 core families. Total font weight < 1.5 MB. |
| **R-09** | **Forme Invalid Style Properties:** Passing `objectFit` breaks compilation. | **Medium** | **High** | Enforce explicit numeric `width` and `height` props on `<Image>` primitives. |
| **R-10** | **Duplicate Global Font Registration:** Repeated calls to `Font.register()` leak memory. | **Low** | **Medium** | Guard registration with module-level `Set<string>`. |

---

## 12. Open Decisions Requiring Lead Alignment

1. **Inter Font Sourcing (Rasmus Andersson v4.0 vs Google Fonts):**
   - *Recommendation:* Source official static desktop TrueType binaries from Rasmus Andersson's GitHub release (Inter v4.0). Verified to contain full currency and punctuation glyph coverage.
2. **Capacitor WebView Font Delivery:**
   - *Recommendation:* Serve fonts from `public/fonts/*.ttf` via the packaged local web server. If relative base path resolution issues occur on iOS, fall back to inline base64 font registration.
3. **Maximum Image Dimension Enclosure:**
   - *Recommendation:* In `mediaResolver.ts`, reject or clamp images exceeding $2000 \times 2000\text{ px}$ to protect low-RAM mobile devices from out-of-memory crashes during PDF generation.

---

## 13. Evidence and Code References

| Evidence Topic | Source File | Line / Code Reference | Confirmed Reality |
| :--- | :--- | :--- | :--- |
| **Existing Forme Loader** | [`src/components/pdf/forme/fonts.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/forme/fonts.ts) | Lines 5, 24, 46 | Filters for `.ttf`/`.otf`; rejects `.woff`; returns `Helvetica`. |
| **Forme Browser Fetch** | `node_modules/@formepdf/core/dist/shared/browserHelpers.js` | Lines 28–35 | Browser uses `fetch()` to load font URLs and converts to base64. |
| **Forme Node File Read** | `node_modules/@formepdf/core/dist/index.js` | Lines 20–23 | Node/Bun reads font path from disk via `readFile(resolve(font.src))`. |
| **PDFKit WinAnsi Hex Encoding** | `node_modules/@react-pdf/pdfkit/lib/pdfkit.js` | Lines 3110–3116, 38670 | Unmapped `char` serialized as `char.toString(16)` into `<...>` hex stream. |
| **Glyph Fallback Bypass** | [`src/components/pdf/core/safeText.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/core/safeText.ts) | Lines 72–73 | Bypasses glyph routing for `U+2000`–`U+206F`, exposing `″` to Helvetica fallback. |
| **Active TrueType Asset** | [`public/fonts/ArchivoBlack-Regular.ttf`](file:///c:/Users/DELL/Desktop/bigdrops-app/public/fonts/ArchivoBlack-Regular.ttf) | Physical file | 90,988 bytes; active in CSR Portrait template. |
| **Variable Font Asset** | `docs/reports/pdf/poc/assets/inter-var.ttf` | Physical file | 876,576 bytes; contains `fvar`, `gvar`; variable font. |
| **Canonical Branding Resolver** | [`src/domain/documentMedia.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/documentMedia.ts) | Lines 31–42 | Resolves first valid, non-temporary URL. |
| **CSR BrandLogo Implementation** | [`src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/pdf/pdfcn/csr/csrPdfcnUtils.tsx) | Lines 147–170 | Renders `<Image>` or `null`. Does not render vector SVG fallback. |
| **Vite Relative Base Path** | [`vite.config.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/vite.config.js) | Line 10 | `base: './'`. Relative base path requires mobile WebView verification. |
| **Invoice Cache Scope** | [`src/lib/native/invoiceCache.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/native/invoiceCache.ts) | Lines 4–59, 367 | Caches invoices and item line images only. No logo or multi-document cache. |

---

## 14. Review Summary: Revisions, Accepted Findings, and Unverified Claims

### 14.1 Accepted Findings from Initial Audit
- Forme strictly requires uncompressed TrueType (`.ttf`) or OpenType (`.otf`) SFNT streams.
- The repository currently contains only one production TrueType font (`ArchivoBlack-Regular.ttf`).
- CPS Forme exports currently degrade to Helvetica because `@fontsource/*` provides only `.woff` files.
- `resolveCanonicalLogoUrl()` remains the canonical branding source resolver across the domain.

### 14.2 Corrected Claims
- **CORS & Base64:** Corrected the claim that base64 conversion bypasses CORS. Browser `fetch()` must succeed before client-side base64 conversion is possible.
- **Unicode Sanitization:** Removed the proposed automated text sanitizer. Established the Text Preservation Rule and introduced a read-only glyph diagnostic utility.
- **Font Fallback:** Removed silent fallback to `Inter`. Established explicit, observable fallback behavior.
- **Prime Corruption ($2'' \to 23$):** Traced through `@react-pdf/pdfkit/lib/pdfkit.js` and confirmed that 4-digit hex serialization (`2033`) in 1-byte WinAnsi text chunks causes the viewer to render `0x20` (space) and `0x33` (`'3'`), displaying `23`.
- **Offline & Cache Claims:** Corrected claims regarding `invoiceCache.ts` scope (invoices only, no logo caching) and qualified Capacitor offline availability with `base: './'` path analysis.
- **CSR BrandLogo:** Corrected claim that `BrandLogo` falls back to an embedded SVG Cummins mark; verified it renders `null` when no logo is present.

### 14.3 Unverified Claims (Marked for Runtime Verification)
- **Supabase Storage CORS Headers:** Whether remote Supabase storage buckets allow cross-origin canvas/Wasm reads cannot be verified from repository files.
- **Capacitor WebView Relative Asset Fetching:** Whether `/fonts/*.ttf` resolves without issue under `base: './'` in Android and iOS WebViews requires physical device runtime verification.

### 14.4 Decisions Requiring Lead Alignment Before Implementation
- Approval of Rasmus Andersson Inter v4.0 static TrueType binaries.
- Confirmation of text-only branding fallback when offline or when remote logo fetches fail.
- Confirmation of image dimension clamping ($2000 \times 2000\text{ px}$) in the media resolver.
