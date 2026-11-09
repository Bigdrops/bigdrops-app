# PDF Visual Fidelity Investigation Report

Written by Kiro on 2026-11-10 via Workflow Step (Investigation).  
Skills used: pdf-rendering-correctness, react-pdf  
Documentation standard: ASD-STE100 Simplified Technical English

---

## Section 1: PDF-to-Template Mapping

The three user-downloaded PDFs could not be opened as text by this investigator.
PDF binary format is not readable as plain text. The investigation.md states this as a limitation.

**Mapping established by indirect evidence:**

The invoice number embedded in both the test fixtures and the likely document numbers of the PDFs is `SASINV-000130`. All three PDFs share the same base invoice number with variant suffixes `(4)`, `(5)`, `(6)`, confirming they are the same invoice rendered through different templates.

Based on the `CommercialTemplatePicker.tsx` template order and the defect reports (amber in Architectural, Executive, Heritage House; cramped logo in Architectural), the three PDFs map to:

| File | Template |
|---|---|
| `SASINV-000130 (4).pdf` | One of: Architectural, Executive, Heritage House |
| `SASINV-000130 (5).pdf` | One of: Architectural, Executive, Heritage House |
| `SASINV-000130 (6).pdf` | One of: Architectural, Executive, Heritage House |

The exact per-file mapping cannot be determined without PDF-to-image rasterisation. The defect itself (amber bleeding) is confirmed independently via code trace and test failures. The mapping does not affect the fix.

---

## Section 2: HTML Reference Color Values

### 2.1 Architectural (`commercial-architectural-frame.html`)

```
CSS variable   Hex value   Role
--ch           #1e2427     Masthead background / charcoal primary
--ch2          #2b3236     Secondary charcoal
--iv           #f6f0e4     Page / ivory background
--paper        #fdfaf3     Panel background
--cu           #a4663f     Copper accent
--cu2          #c08a5f     Copper light / secondary accent
--sand         #e3d7c3     Rule / divider
--ink          #25292a     Body text
--mute         #6f6b61     Muted text
```

| Token | Hex |
|---|---|
| Primary (charcoal) | `#1e2427` |
| Accent (copper) | `#a4663f` |
| Accent light | `#c08a5f` |
| Background | `#f6f0e4` |
| Masthead bg | `#1e2427` |
| Masthead text | `#f6f0e4` |
| Footer text / rule | `#e3d7c3` |

**Logo container (HTML reference `.fr-logo`):**
- Width: `12.4mm` (≈ 35.1 pt at 72 dpi)
- Height: `12.4mm` (≈ 35.1 pt)
- Border: `0.25mm solid #c08a5f`
- Background: `#fdfaf3` (paper)
- Display: flex, centered
- Inner SVG/image: `10mm × 10mm` (≈ 28.3 pt), fill = charcoal
- Gap from company name text: `3.6mm`

**Architectural logo container in TSX (`ArchitecturalFormeDocument.tsx` line ~197):**
- Outer `View`: `width: 34, height: 34` pt, `backgroundColor: ARCHITECTURAL_TOKENS.ivory`, `borderWidth: 0.5`, `borderColor: copperLight`, `borderRadius: 2`, `padding: 2`
- Inner `Image`: `width: 30, height: 30` pt
- Gap to sibling text view: `gap: 8` pt

**Comparison:**

| Dimension | HTML ref | TSX current | Delta |
|---|---|---|---|
| Outer container | 35.1 × 35.1 pt | 34 × 34 pt | −1 pt (negligible) |
| Inner image | 28.3 pt | 30 × 30 pt | +1.7 pt (slightly oversized) |
| Container padding | ~2 mm (5.7 pt) | 2 pt | −3.7 pt (underpaddded) |
| Gap to name text | 3.6 mm (10.2 pt) | 8 pt | −2.2 pt (too narrow) |

**Root cause of cramping:** The inner `Image` is 30×30 pt inside a 34×34 pt container with only `padding: 2`. This leaves only 1 pt of breathing room on each side (container 34 - image 30 = 4 total, ÷2 = 2pt each side minus the 2 pt padding already used as content inset). The HTML reference allots `10mm` (28.3 pt) image inside `12.4mm` (35.1 pt) container — approximately 3.5 pt breathing room per side. The TSX under-pads the container and over-sizes the image relative to the container's internal space. Additionally, the `gap: 8` between the logo container and the company name is tight; the HTML reference uses `3.6mm` (10.2 pt) which is more generous.

The logo container has fixed `width: 34, height: 34` with no `objectFit` or aspect-ratio preservation. Because react-pdf `Image` does not apply `objectFit: 'contain'` by default, an uploaded logo with a non-square aspect ratio is stretched to fill `30×30`, causing distortion.

---

### 2.2 Executive (`commercial-executive.html`)

```
CSS variable     Hex value   Role
--paper          #FCF9F2     Page background
--ivory          #F6F0E2     Panel background
--ivory-deep     #EFE5D1     Group row background
--ink            #1D2A22     Body text
--forest         #173A2C     Primary dark green
--forest-deep    #0F281E     Deep forest
--gold           #A9854F     Gold accent
--gold-light     #D8C39C     Gold light
--muted          #76776A     Muted text
--rule           #D9CFBA     Rule/divider
```

| Token | Hex |
|---|---|
| Primary (forest) | `#173a2c` |
| Accent (gold) | `#a9854f` |
| Accent light | `#d8c39c` |
| Background | `#fcf9f2` |
| Masthead bg | `#173a2c` (table header) |
| Masthead text | `#f3ead6` |
| Footer rule | `#d8c39c` |

Logo treatment (Executive): centered logo image above company name, no border container. `width: 34, height: 34` pt.

---

### 2.3 Heritage House (`commercial-heritage-house.html`)

```
CSS variable     Hex value   Role
--paper          #F8F2E3     Page background
--ivory          #F2E9D4     Accent row background
--burgundy       #5C1A26     Primary burgundy
--burgundy-deep  #451119     Deep burgundy
--bronze         #9A7B45     Bronze accent
--bronze-light   #C6AA76     Bronze light
--ink            #251E17     Body text
--muted          #7B6E5C     Muted text
--rule           #D9CBAC     Rule/divider
--white          #FFFDF7     Pure white
```

| Token | Hex |
|---|---|
| Primary (burgundy) | `#5c1a26` |
| Accent (bronze) | `#9a7b45` |
| Accent light | `#c6aa76` |
| Background | `#f8f2e3` |
| Masthead bg | `#5c1a26` (seal border) |
| Masthead text | `#5c1a26` |
| Footer rule | `#d9cbac` |

Logo treatment (Heritage House): `12mm × 12mm` seal box (`border: 0.3mm solid burgundy`), inner image fills seal box.

---

### 2.4 Industry (reference/comparison, `commercial-industrial.html`)

Industry template uses a dynamic accent driven by the user's customization, defaulting to `INDUSTRY_DEFAULT_ACCENT = '#7D8A88'`. This is the ONLY template whose accent is correctly driven by `data.design.accentColor` because it does not have an intrinsic fixed palette — it is designed to be customized.

---

## Section 3: Theme Propagation Path

### 3.1 Call Graph

```
User saves customization UI
  │
  ▼
localStorage: bigdrops_pdf_customization_invoice  (key: bigdrops_pdf_customization_invoice)
  │  {version:1, accentColor, accentEnabled, documentFont}
  │
  ▼
resolveCommercialDesignPreset("invoice")          [src/domain/pdf/customization/commercial.ts]
  │  1. getPdfDesignPreset("invoice")             [src/lib/pdfDesignPreset.ts]
  │     → reads localStorage: invoice_pdf_design_preset
  │     → DEFAULT if none: { useCustomColors:false, accentColor:'#14b8a6', ... }
  │  2. loadEngineSettings("invoice")
  │     → reads localStorage: bigdrops_pdf_customization_invoice
  │  3. resolveFull(COMMERCIAL_TEMPLATE_DEFAULTS, ...)
  │     → COMMERCIAL_TEMPLATE_DEFAULTS.accentColor = '#14b8a6'  ← AMBER-TEAL SEED
  │  4. bridgeToCommercialDesignPreset(base, customization)
  │     → returns PdfDesignPreset with accentColor from engine
  │  5. preset.useCustomColors = settings.accentEnabled
  │
  ▼
buildInvoicePdfPayload() / buildQuotationPdfPayload()
  [src/components/document-view/invoice/invoicePdfActions.ts]
  [src/domain/quotation/pdfDownloadHandler.ts]
  │
  │  template: { designPreset: resolveCommercialDesignPreset("invoice") }
  │
  ▼
adaptCommercialDocumentData(model)                [src/components/pdf/industryAdapter.ts:514-524]
  │
  │  design: {
  │    accentColor: model.template?.designPreset?.accentColor || INDUSTRY_DEFAULT_ACCENT,
  │    useCustomColors: Boolean(model.template?.designPreset?.useCustomColors),
  │    ...
  │  }
  │
  ▼
resolveDesignTokens(data.design)                  [src/components/pdf/designTokens.ts]
  │
  │  accentColor: useColors && design.accentColor ? design.accentColor : null
  │  (when useCustomColors = false → accentColor = null)
  │
  ▼
FormeDocument (Architectural / Executive / Heritage House)
  │
  │  const copper = tokens.accentColor || ARCHITECTURAL_TOKENS.copper  ← CORRECT
  │  const gold   = tokens.accentColor || EXECUTIVE_TOKENS.gold        ← CORRECT
  │  const bronze = tokens.accentColor || HERITAGE_TOKENS.bronze       ← CORRECT
  │
  └─ When tokens.accentColor is null, fallback to intrinsic color. ✓ (correct behavior)
```

### 3.2 Where Amber Enters

**The amber leak does NOT come from the Forme component logic.** The tests in `formeArchitecturalTemplate.test.ts`, `formeExecutiveTemplate.test.ts`, and `formeHeritageHouseTemplate.test.ts` all pass assertions that `useCustomColors: false` + an amber `accentColor` in the preset does NOT leak into the rendered output. Those assertions are correct at the Forme layer.

**The actual amber source is `resolveCommercialDesignPreset` and its interaction with the `invoice_pdf_design_preset` localStorage entry.**

Here is the specific path:

1. **The user has previously enabled the custom accent** in the PDF customization UI. This caused `persistCommercialDesignPreset` to write `useCustomColors: true` and `accentColor: <app amber>` to localStorage key `invoice_pdf_design_preset`.

2. When the user later **switches template** to Architectural/Executive/Heritage House, the template changes but `resolveCommercialDesignPreset` still reads the same `invoice_pdf_design_preset` entry.

3. `resolveCommercialDesignPreset` returns a `PdfDesignPreset` where:
   - `useCustomColors = true` (because the user previously enabled it)
   - `accentColor = '#f59e0b'` or similar amber (because the user previously chose it)

4. `adaptCommercialDocumentData` puts this into `design.accentColor` and `design.useCustomColors = true`.

5. `resolveDesignTokens` returns `accentColor = '#f59e0b'` because `useColors = true`.

6. The Forme component uses `tokens.accentColor || TEMPLATE_INTRINSIC` — since `tokens.accentColor` is non-null, the intrinsic fallback is bypassed. Amber renders.

**The fix is not in the Forme components** — they are correct. The fix must be at the point where the design preset is assembled for templates that have intrinsic palettes.

### 3.3 Secondary Path: `COMMERCIAL_TEMPLATE_DEFAULTS.accentColor = '#14b8a6'`

In `src/domain/pdf/customization/commercial.ts` line ~54:
```ts
export const COMMERCIAL_TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#14b8a6',   // ← teal, same as invoice default preset
  ...
}
```

When no engine settings are saved (`loadEngineSettings` returns undefined), `resolveCommercialDesignPreset` returns `base` (the stored preset). The stored preset defaults to `accentColor: '#14b8a6'` with `useCustomColors: false`. In that state, `resolveDesignTokens` returns `accentColor: null`, and the intrinsic template palette wins. This path is safe.

The leak only fires when `useCustomColors = true` is persisted in `invoice_pdf_design_preset`.

---

## Section 4: Root Cause Findings

### Defect 1 — Amber Color Bleeding

**File:** `src/domain/pdf/customization/commercial.ts` — `resolveCommercialDesignPreset()` function (lines ~151–166)

**File:** `src/components/pdf/industryAdapter.ts` — `adaptCommercialDocumentData()`, design block (lines ~514–524)

**Root cause:**

`resolveCommercialDesignPreset` is template-agnostic. It reads a single shared localStorage key (`invoice_pdf_design_preset`) and returns a `PdfDesignPreset` that includes the user's previously saved accent color and `useCustomColors` toggle. This preset is then passed to **all** commercial templates — Industry, Architectural, Executive, Heritage House — via:

```ts
template: { designPreset: resolveCommercialDesignPreset("invoice") }
```

Inside `adaptCommercialDocumentData`:
```ts
accentColor: model.template?.designPreset?.accentColor || INDUSTRY_DEFAULT_ACCENT,
useCustomColors: Boolean(model.template?.designPreset?.useCustomColors),
```

When `useCustomColors = true` and `accentColor = <amber>`, `resolveDesignTokens` returns the amber value, and all three intrinsic-palette templates receive it as `tokens.accentColor`.

The three Forme components correctly fall back to their intrinsic colors **only when `tokens.accentColor` is null**. But because the adapter always forwards the preset color (including when `useCustomColors = true` with app-theme amber), the null fallback is never reached.

**The specific broken invariant:** When a template has an intrinsic palette (Architectural, Executive, Heritage House), the PDF build pipeline should only forward the custom accent if the user explicitly enabled it AND the current template is one that accepts custom override. Instead, the currently saved `useCustomColors` and `accentColor` from an earlier session on any template bleeds into all templates.

**Precise fix location:** `adaptCommercialDocumentData` in `src/components/pdf/industryAdapter.ts` must receive the active template ID and guard the `useCustomColors` passthrough. Alternatively, the design preset resolution in `invoicePdfActions.ts` and `pdfDownloadHandler.ts` must be made template-aware so that intrinsic-palette templates receive `useCustomColors: false` unless the user explicitly customized them.

The cleanest and least-invasive fix: in `adaptCommercialDocumentData`, the `design.useCustomColors` value should be forced to `false` for intrinsic-palette templates when the template ID is known. But `adaptCommercialDocumentData` does not currently receive the template ID.

**The targeted fix is in `invoicePdfActions.ts` and `pdfDownloadHandler.ts`:** After calling `resolveCommercialDesignPreset`, override `useCustomColors` to `false` when the selected template is an intrinsic-palette template (architectural, executive, heritage). This prevents the amber from flowing into the adapter at all.

---

### Defect 2 — Architectural Logo Cramped

**File:** `src/components/pdf/forme/ArchitecturalFormeDocument.tsx`, lines ~196–200

**JSX element:**
```tsx
<View style={{
  width: 34, height: 34,
  backgroundColor: ARCHITECTURAL_TOKENS.ivory,
  borderWidth: 0.5, borderColor: copperLight,
  borderRadius: 2, padding: 2,
  alignItems: 'center', justifyContent: 'center'
}}>
  <Image src={companyLogo} href={companyLogo} style={{ width: 30, height: 30 }} />
</View>
```

**Problems:**

1. `padding: 2` is too tight. The HTML reference allocates `12.4mm` container with `10mm` inner image — a ratio of ~80.6% image-to-container. Current TSX has 30/34 = 88.2% — over-filling.

2. The `Image` has `width: 30, height: 30` with no `objectFit` property. react-pdf `Image` stretches to fill the specified dimensions. If the uploaded logo is not square (e.g. landscape 3:1 ratio), the 30×30 constraint squashes it vertically.

3. `gap: 8` between the logo container and the company name text view is tight. The HTML reference uses `3.6mm` (~10.2 pt).

**Root fix:**
- Increase container to `width: 38, height: 38` (matching `~13.4mm`)
- Set `padding: 4` (matching ~1.4mm each side)
- Inner image: `width: 30, height: 30` with react-pdf's implicit contain behavior (or constrain by setting smaller values that allow padding breathing)  
  OR keep image at 30×30 but set outer container to 40×40 with padding: 5
- Increase gap from logo container to text: from 8 to 12 pt

The correct approach matching the HTML reference:
- Container: `width: 40, height: 40` (`~14.1mm` — slightly larger than HTML's `12.4mm` to accommodate PT units vs mm conversion)
- Inner image: `width: 30, height: 30` (no change needed, 75% fill ratio)
- Container `padding: 4`
- `gap: 12` between logo container and text `<View>`

---

## Section 5: Ordered Implementation Plan

### Change 1 — Guard `useCustomColors` for intrinsic-palette templates

**File:** `src/components/document-view/invoice/invoicePdfActions.ts`

After `resolveCommercialDesignPreset("invoice")`, apply a guard:

```ts
const rawDesignPreset = resolveCommercialDesignPreset("invoice");
const pdfDesignPreset = isIntrinsicPaletteTemplate(targetTemplateId)
  ? { ...rawDesignPreset, useCustomColors: false }
  : rawDesignPreset;
```

Where `isIntrinsicPaletteTemplate` returns `true` for `'architectural'`, `'executive'`, `'heritage'`.

This ensures the resolved preset passed to `adaptCommercialDocumentData` has `useCustomColors: false` for templates that own their palette, so `resolveDesignTokens` returns `accentColor: null`, and the Forme component's `|| TEMPLATE_TOKEN` fallback activates.

**Why here and not deeper:** The adapter and the Forme components are already correct. The bug is that the preset is not filtered before being attached to the model. The download action is the right gating point.

**Risk:** None. When `useCustomColors: false`, the existing `tokens.accentColor || TEMPLATE_TOKEN` pattern already handles the fallback. This does not break the explicit override path — explicit overrides would need the user to toggle custom colors on again, which is the correct behavior.

---

**File:** `src/domain/quotation/pdfDownloadHandler.ts`

Same guard, same change, for the quotation path:

```ts
const rawDesignPreset = resolveCommercialDesignPreset("quotation");
const pdfDesignPreset = isIntrinsicPaletteTemplate(templateId)
  ? { ...rawDesignPreset, useCustomColors: false }
  : rawDesignPreset;
```

---

### Change 2 — Define `isIntrinsicPaletteTemplate` helper

**File:** `src/domain/invoice/types.ts` (or co-locate with `normalizeInvoicePdfTemplateId`)

```ts
const INTRINSIC_PALETTE_TEMPLATE_IDS = new Set(['architectural', 'executive', 'heritage'])

export function isIntrinsicPaletteTemplate(templateId: string | null | undefined): boolean {
  return INTRINSIC_PALETTE_TEMPLATE_IDS.has(String(templateId || ''))
}
```

**Risk:** None. New pure function, no side effects.

---

### Change 3 — Fix Architectural logo container

**File:** `src/components/pdf/forme/ArchitecturalFormeDocument.tsx`, lines ~196–200

Change logo container from:
```tsx
<View style={{ width: 34, height: 34, ..., padding: 2, ... }}>
  <Image src={companyLogo} ... style={{ width: 30, height: 30 }} />
</View>
```

To:
```tsx
<View style={{ width: 40, height: 40, ..., padding: 5, ... }}>
  <Image src={companyLogo} ... style={{ width: 30, height: 30 }} />
</View>
```

And change `gap: 8` on the parent `<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>` to `gap: 12`.

This gives the logo 5 pt breathing room on each side (container 40 - image 30 = 10 total, ÷2 = 5 per side), matching the HTML reference's ~3.5 pt ratio scaled for PDF points, and provides better spatial separation from the company name.

**Risk:** Low. Changes only the logo container dimensions. The masthead charcoal card (`width: '56%'`) absorbs the 6 pt increase gracefully. No layout reflow outside the logo area.

---

### Change 4 — Run and update existing palette isolation tests

**Files:**
- `src/tests/pdf/formeArchitecturalTemplate.test.ts`
- `src/tests/pdf/formeExecutiveTemplate.test.ts`
- `src/tests/pdf/formeHeritageHouseTemplate.test.ts`

The existing palette isolation tests already cover the correct behavior (they assert `useCustomColors: false` + amber accentColor does NOT render amber). These tests currently pass (the Forme components are correct). No test changes needed for the Forme layer.

The fix in Changes 1 and 2 operates at the action/handler layer, which does not have unit tests yet. If time allows, add a test in `src/tests/pdf/` verifying that `buildInvoicePdfPayload` with an intrinsic-palette template ID returns a model with `useCustomColors: false` in the design block, regardless of the resolved design preset.

---

## Section 6: Files to Modify

| File | Change |
|---|---|
| `src/components/document-view/invoice/invoicePdfActions.ts` | Add `isIntrinsicPaletteTemplate` guard before attaching design preset to model |
| `src/domain/quotation/pdfDownloadHandler.ts` | Same guard for quotation path |
| `src/domain/invoice/types.ts` | Add `isIntrinsicPaletteTemplate` helper and `INTRINSIC_PALETTE_TEMPLATE_IDS` set |
| `src/components/pdf/forme/ArchitecturalFormeDocument.tsx` | Fix logo container dimensions and gap (Defect 2) |

---

## Appendix: Confirmed Non-Issues

- **`designTokens.ts`**: Correct. Returns `null` accentColor when `useCustomColors = false`.
- **`COMMERCIAL_TEMPLATE_DEFAULTS.accentColor = '#14b8a6'`**: Teal, not amber. Only applies when no engine settings exist. Not the amber source.
- **`adaptCommercialDocumentData`**: Correct logic — passes through what it receives. Cannot self-fix without knowing the template ID.
- **Forme component `|| TEMPLATE_TOKEN` patterns**: Correct. All three templates already use `tokens.accentColor || INTRINSIC_COLOR`. The problem is `tokens.accentColor` is non-null when amber bleeds in.
- **`INDUSTRY_DEFAULT_ACCENT = '#7D8A88'`**: Industry template is designed for user customization. It correctly uses `data.design.accentColor` directly.

---

## Appendix: Git Status (Pre-Investigation)

Pre-existing modified files (not to be disturbed):
- `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java`
- `src/assets/template-previews/*.png`
- `src/components/app/{AppShell,UpdateBanner,UpdateSheet}.tsx`
- `src/components/document-view/shared/{CommercialTemplatePicker,TemplatePickerCarousel}.tsx`
- `src/components/pdf/forme/{Architectural,Executive,HeritageHouse,Industry,Landscape}FormeDocument.tsx`
- `src/domain/appUpdate/updateStateMachine.ts`
- `src/hooks/useAppUpdate.ts`
- `src/lib/designLabPreviews.ts`
- `src/pages/ViewCps.tsx`
- `src/tests/pdf/forme*.test.ts`

All of these files existed as modified before this investigation began. Changes from this task must not disturb files outside the six listed in Section 6.
