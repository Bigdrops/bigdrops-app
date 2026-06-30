# PDF Template Stabilization — Audit Report

> Phase 1 + Phase 2: Architecture Audit + Design Contract Verification
> Date: 2026-06-30

---

## 1. Current PDF Rendering Architecture

### 1.1 Stack

- **Renderer:** `@react-pdf/renderer` (React-PDF v9)
- **Framework:** React 19 + TypeScript 5.9 + Vite 7
- **Runtime:** Bun
- **Templates:** 8 total — 1 reference implementation (Industry) + 7 legacy templates (Apex, Bolt, Crest, Ember, Evergreen, Ledger, Minimal)

### 1.2 File Structure

```
src/components/pdf-new/
├── index.ts                          # PDF generation orchestration, template lazy-loading
├── industryAdapter.ts                # Adapts PdfDocumentModel → CommercialDocumentData
├── types.ts                          # Core types: PdfDocumentModel, CommercialDocumentData
├── pdfDesignPreset.ts                # Design token sanitization and defaults
├── pdfSharedFonts.ts                 # Shared font imports and registration config
├── pdfFontRegistry.ts                # Font registration with React-PDF
├── pdfFillableFonts.ts               # Fillable/handwriting font configs
├── renderers/
│   └── PdfRenderer.tsx               # Wraps templates in <Document>, resolves layout
├── engine/                           # Shared rendering helpers (totals, alignment, etc.)
├── core/                             # Shared utilities (richText, description, safeText)
├── presentation/
│   └── industry/
│       ├── IndustryTemplate.tsx      # Reference implementation — full design support
│       ├── industryStyles.ts         # Industry base styles (hardcoded defaults, overridden)
│       ├── compact.ts                # Industry compact mode overrides
│       ├── PartyCard.tsx             # Industry party card sub-component
│       ├── OptionalList.tsx          # Industry attachment list
│       └── IndustryColumnOverrides.ts
├── templates/
│   ├── Industry.tsx                  # Re-exports from presentation layer
│   ├── Apex.tsx + ApexStyles.ts
│   ├── Bolt.tsx + BoltStyles.ts
│   ├── Crest.tsx + CrestStyles.ts
│   ├── Ember.tsx + EmberStyles.ts
│   ├── Evergreen.tsx + EvergreenStyles.ts
│   ├── Ledger.tsx + LedgerStyles.ts
│   └── Minimal.tsx + MinimalStyles.ts
└── pdfCurrency.tsx                   # Currency formatting component
```

---

## 2. Render Pipeline Diagram

```
User selects template + design preset
        │
        ▼
index.ts (orchestration)
        │
        ├─► pdfDesignPreset.ts ─► sanitizePdfDesignPreset(preset)
        │       Returns: { accentColor, textColor, mutedColor, borderColor,
        │                  surfaceColor, headerFont, bodyFont, useCustomFonts, useCustomColors }
        │
        ├─► PdfDocumentModel constructed with model.template.designPreset
        │
        ├─► industryAdapter.ts ─► adaptCommercialDocumentData(model)
        │       │
        │       ├─► Attaches model.template.designPreset → data.design
        │       │   (fields: accentColor, textColor, mutedColor, borderColor,
        │       │    surfaceColor, headerFont, bodyFont, useCustomFonts, useCustomColors)
        │       │
        │       └─► Returns CommercialDocumentData with .design populated
        │
        ├─► PdfRenderer.tsx
        │       │
        │       ├─► Resolves layout from data.layout (size, orientation)
        │       ├─► Resolves compact from data.template.pageLayout
        │       ├─► Wraps template in <Document>
        │       └─► Passes { data, compact } to template component
        │
        └─► Template Component (e.g., Apex.tsx, IndustryTemplate.tsx)
                │
                ├─► Reads data.design (or ignores it)
                ├─► Applies styles from Styles file
                └─► Renders <Page> with all sub-components
```

---

## 3. Where `data.design` Is Created

### 3.1 Design Preset Sanitization

**File:** `src/lib/pdfDesignPreset.ts`

- `sanitizePdfDesignPreset(preset)` — normalizes user input, validates hex colors, validates font choices against `FONT_CHOICES`, merges with defaults
- `getPdfDesignPreset(preset)` — returns full preset with defaults applied
- `getDefaultPdfDesignPreset()` — returns hardcoded defaults

**Guaranteed properties after sanitization:**

| Property | Type | Default | Source |
|---|---|---|---|
| `accentColor` | `string \| null` | `null` | User preset or null |
| `textColor` | `string \| null` | `null` | User preset or null |
| `mutedColor` | `string \| null` | `null` | User preset or null |
| `borderColor` | `string \| null` | `null` | User preset or null |
| `surfaceColor` | `string \| null` | `null` | User preset or null |
| `headerFont` | `PdfDesignFontChoice \| null` | `null` | User preset or null |
| `bodyFont` | `PdfDesignFontChoice \| null` | `null` | User preset or null |
| `useCustomFonts` | `boolean` | `false` | User preset |
| `useCustomColors` | `boolean` | `false` | User preset |

### 3.2 Adapter Attachment

**File:** `src/components/pdf-new/industryAdapter.ts`

- `adaptCommercialDocumentData(model)` constructs `CommercialDocumentData`
- Lines 447-457: Attaches `model.template.designPreset` → `data.design`
- All fields are nullable; `useCustomFonts` and `useCustomColors` are coerced to boolean

---

## 4. Where `data.design` Is Lost

**Critical finding:** `data.design` is populated correctly by the adapter but is **completely ignored** by 7 of 8 templates.

### 4.1 Grep Evidence

```
grep "data?.design" across all templates/
  → 0 matches

grep "\.design" across all templates/*.tsx
  → 0 matches

Only match: presentation/industry/IndustryTemplate.tsx:53
  → const design = data?.design || { ... }
```

### 4.2 Per-Template Analysis

| Template | Reads `data.design`? | Hardcoded Colors | Hardcoded Fonts | Compact Support | Landscape Support |
|---|---|---|---|---|---|
| **Industry** | YES | Overrides from `data.design` | Overrides from `data.design` | YES (`compactCommercialDocument`) | YES (via `data.layout`) |
| **Apex** | NO | `INK=#1a2f2f`, `ACCENT=#0d7c7c`, `PAPER=#fefefe` | `BODY_SERIF=Times-Roman`, `BODY_SANS=Helvetica` | NO | YES (via `data.layout`) |
| **Bolt** | NO | `INK=#1a1a2e`, `ACCENT=#52b788`, `GOLD=#d4a373`, `DEEP_PINE=#1b4332` | `BOLT_SERIF=Times-Roman`, `BOLT_SANS=Helvetica` | NO | YES (via `data.layout`) |
| **Crest** | NO | `INK=#2d1f3a`, `ACCENT=#b28b3d`, `WARM_BLACK=#1a1510` | `CREST_SERIF=Cormorant Garamond`, `CREST_SANS=Inter` | NO | YES (via `data.layout`) |
| **Ember** | NO | `NAVY=#2c3e50`, `BLUE=#4a90e2`, `AMBER=#e67e22`, `INK=#1e2a3a` | `DISPLAY=Helvetica-Bold`, `BODY=Helvetica` | NO | YES (via `data.layout`) |
| **Evergreen** | NO | `ACCENT=#1f6e5c`, `INK=#1a3a32`, `ACCENT_LIGHT=#e8f3ef` | `Helvetica` | NO | YES (via `data.layout`) |
| **Ledger** | NO | `colors.ink=#2b2b2b`, `colors.accent=#7b8b6f` | `Helvetica` | NO | YES (via `data.layout`) |
| **Minimal** | NO | `INK=#1a1a1a`, `PAPER=#ffffff`, `LINK=#2563eb` | `Helvetica` | NO | YES (via `data.layout`) |

---

## 5. Why Industry Works

### 5.1 Industry Reads and Applies `data.design`

**File:** `src/components/pdf-new/presentation/industry/IndustryTemplate.tsx`

Lines 52-78 — Industry extracts design tokens and derives derived values:

```typescript
const design = data?.design || { /* null defaults */ }
const accentColor = design.useCustomColors && design.accentColor ? design.accentColor : null
const textColor = design.useCustomColors && design.textColor ? design.textColor : null
const mutedColor = design.useCustomColors && design.mutedColor ? design.mutedColor : null
const borderColor = design.useCustomColors && design.borderColor ? design.borderColor : null
const surfaceColor = design.useCustomColors && design.surfaceColor ? design.surfaceColor : null
const headerFontFamily = design.useCustomFonts && design.headerFont ? design.headerFont : undefined
const bodyFontFamily = design.useCustomFonts && design.bodyFont ? design.bodyFont : undefined
```

### 5.2 Industry Derives Secondary Tokens

Industry doesn't just use raw tokens — it derives additional values:

```typescript
const panelSurfaceColor = accentColor
  ? (surfaceColor && surfaceColor !== '#f8fafc' ? surfaceColor : lightenHex(accentColor, 45))
  : (surfaceColor || null)

const panelBorderColor = accentColor
  ? (borderColor && borderColor !== '#cbd5e1' ? borderColor : lightenHex(accentColor, 28))
  : (borderColor || null)

const subtleSurfaceColor = accentColor
  ? getAccentTint(accentColor, panelSurfaceColor || '#f5f7f6')
  : panelSurfaceColor
```

### 5.3 Industry Applies Tokens Inline

Every style application in Industry follows the pattern:

```typescript
<Text style={[
  styles.metaLabel,
  mutedColor ? { color: mutedColor } : null,
  bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
]}>
```

This means: use the stylesheet default, then override with the design token if present.

### 5.4 Industry Passes Tokens to Sub-Components

Industry passes tokens to `PartyCard`, table headers, group rows, totals, bank details, balance due, advance summary, notes, terms, additional fields, signature, and footer.

---

## 6. Why the Other 7 Templates Ignore It

### 6.1 Pattern: Import Constants, Never Read `data.design`

Every non-Industry template follows the same anti-pattern:

```typescript
// Apex.tsx
import { styles, INK, ACCENT, ... } from './ApexStyles'

// Bolt.tsx
import { styles, INK, ACCENT, GOLD, BOLT_SERIF, BOLT_SANS, ... } from './BoltStyles'

// Crest.tsx
import { styles, INK, ACCENT, CREST_SERIF, CREST_SANS, ... } from './CrestStyles'
```

These constants are then used **directly in JSX** without any reference to `data.design`:

```typescript
// Apex.tsx — hardcoded, no data.design reference
<Text style={styles.docTitle}>{data.title}</Text>

// Bolt.tsx — hardcoded, no data.design reference
<Text style={styles.sealDocumentType}>{data.customTitle || data.title}</Text>
```

### 6.2 No Conditional Override Logic

Non-Industry templates have **zero** instances of:
- `data.design` access
- Conditional color/font overrides
- `lightenHex()` or `getAccentTint()` calls
- Design token derivation

### 6.3 Styles Files Are Self-Contained

Each Styles file is a complete, self-contained `StyleSheet.create()` call with hardcoded values. There is no mechanism to inject external tokens.

---

## 7. Exact Files Involved

### 7.1 Shared Infrastructure (Read-Only — Do Not Modify)

| File | Purpose | Status |
|---|---|---|
| `src/lib/pdfDesignPreset.ts` | Design token sanitization, defaults, font validation | Complete — already supports all tokens |
| `src/lib/pdfSharedFonts.ts` | Shared font imports from `@fontsource/*` | Complete — 10 shared fonts registered |
| `src/lib/pdfFontRegistry.ts` | Font registration with React-PDF | Complete — all fonts registered |
| `src/lib/pdfFillableFonts.ts` | Fillable/handwriting font configs | Complete — not affected |
| `src/components/pdf-new/types.ts` | Core type definitions | Complete — `CommercialDocumentData.design` exists |
| `src/components/pdf-new/industryAdapter.ts` | Adapter — populates `data.design` | Complete — already attaches all tokens |

### 7.2 Pipeline Entry Points (Read-Only — Do Not Modify)

| File | Purpose | Status |
|---|---|---|
| `src/components/pdf-new/index.ts` | Orchestration, template lazy-loading | Complete |
| `src/components/pdf-new/renderers/PdfRenderer.tsx` | Wraps templates in `<Document>` | Complete — passes `data` and `compact` |
| `src/components/pdf-new/core/pdfCompact.ts` | Compact mode overrides | Has `compactLedger` and `compactObsidian` |

### 7.3 Reference Implementation (Template for Changes)

| File | Purpose | Status |
|---|---|---|
| `src/components/pdf-new/presentation/industry/IndustryTemplate.tsx` | Reference — full design support | Complete — canonical implementation |
| `src/components/pdf-new/presentation/industry/industryStyles.ts` | Industry base styles | Hardcoded defaults, overridden by template |
| `src/components/pdf-new/presentation/industry/compact.ts` | Industry compact overrides | Complete |

### 7.4 Templates Requiring Changes

| Template | TSX File | Styles File | Hardcoded Constants |
|---|---|---|---|
| Apex | `templates/Apex.tsx` | `templates/ApexStyles.ts` | `INK`, `ACCENT`, `PAPER`, `BODY_SERIF`, `BODY_SANS` |
| Bolt | `templates/Bolt.tsx` | `templates/BoltStyles.ts` | `INK`, `ACCENT`, `GOLD`, `DEEP_PINE`, `BOLT_SERIF`, `BOLT_SANS` |
| Crest | `templates/Crest.tsx` | `templates/CrestStyles.ts` | `INK`, `ACCENT`, `WARM_BLACK`, `CREST_SERIF`, `CREST_SANS` |
| Ember | `templates/Ember.tsx` | `templates/EmberStyles.ts` | `NAVY`, `BLUE`, `AMBER`, `INK`, `DISPLAY`, `BODY` |
| Evergreen | `templates/Evergreen.tsx` | `templates/EvergreenStyles.ts` | `ACCENT`, `INK`, `ACCENT_LIGHT`, `ACCENT_PALE` |
| Ledger | `templates/Ledger.tsx` | `templates/LedgerStyles.ts` | `colors.ink`, `colors.accent` |
| Minimal | `templates/Minimal.tsx` | `templates/MinimalStyles.ts` | `INK`, `PAPER`, `LINK` |

---

## 8. Risks

### 8.1 High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Breaking template identity** | Templates lose their unique visual character if tokens are applied too aggressively | Apply tokens only to color/font properties, never to layout/spacing |
| **Inconsistent application** | Some elements styled, others not — jarring visual | Apply tokens to ALL relevant elements in each template |
| **Font fallback failures** | Custom fonts not available in React-PDF | Only apply fonts when `useCustomFonts` is true; validate against `FONT_CHOICES` |

### 8.2 Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **StyleSheet immutability** | React-PDF `StyleSheet.create()` produces frozen objects — cannot mutate at render time | Override via inline `style` arrays, not by modifying stylesheet objects |
| **Derived token calculation** | `lightenHex()` and `getAccentTint()` may produce unexpected results for extreme colors | Test with edge cases (very dark, very light, saturated colors) |
| **Compact mode conflicts** | Existing compact overrides may conflict with design tokens | Verify compact mode after token application |

### 8.3 Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Backwards compatibility** | Documents without custom presets must render identically | `useCustomColors=false` → no token overrides applied; `null` tokens → no override |
| **Performance** | Additional inline style computations | Negligible — tokens are resolved once per render |

---

## 9. Verification Plan

### 9.1 Pre-Implementation Baseline

1. Generate a PDF for each template with **no design preset** (defaults)
2. Save screenshots/PDFs as baseline for comparison
3. Run `bun run audit:load`, `bun run typecheck`, `bun run build` to confirm clean state

### 9.2 Per-Template Verification

For each template (Apex, Bolt, Crest, Ember, Evergreen, Ledger, Minimal):

1. **Font override:** Set `headerFont` and `bodyFont` → verify heading/body text changes
2. **Accent color:** Set `accentColor` → verify accent bars, headers, buttons change
3. **Text color:** Set `textColor` → verify primary text changes
4. **Muted color:** Set `mutedColor` → verify secondary/meta text changes
5. **Border color:** Set `borderColor` → verify borders/rules change
6. **Surface color:** Set `surfaceColor` → verify panel backgrounds change
7. **No preset:** Verify identical rendering to baseline when no preset is set

### 9.3 Regression Checks

1. Run `bun run audit:load` — must pass
2. Run `bun run typecheck` — must pass with zero errors
3. Run `bun run build` — must succeed
4. Generate PDFs for all 8 templates — compare with baseline
5. Verify compact mode still works for templates that support it
6. Verify landscape orientation works for all templates

### 9.4 Final Report

Update this document with:
- Files modified
- Before/after behavior per template
- Remaining limitations
- Follow-up work items

---

## 10. Phase 2 — Design Contract Verification

### 10.1 Full `PdfDesignPreset` Type

**File:** `src/lib/pdfDesignPreset.ts:27-41`

```typescript
export type PdfDesignPreset = {
  useCustomColors: boolean        // Gate for color overrides
  useCustomFonts: boolean         // Gate for font overrides
  accentColor: string             // Primary accent (hex, normalized)
  textColor: string               // Primary text (hex, normalized)
  mutedColor: string              // Secondary/muted text (hex, normalized)
  borderColor: string             // Border rules (hex, normalized)
  surfaceColor: string            // Panel backgrounds (hex, normalized)
  headerFont: PdfFontChoice       // Heading font (validated against FONT_CHOICES)
  bodyFont: PdfFontChoice         // Body font (validated against FONT_CHOICES)
  fillableFont: PdfFillableFontChoice   // Fillable field font (not for templates)
  fillableFontMode: PdfFillableFontMode // Fillable field mode (not for templates)
  fillableColor: string           // Fillable field color (not for templates)
  templateAccentColor?: string    // Optional template-specific accent
}
```

### 10.2 `CommercialDocumentDesign` (What Templates Receive)

**File:** `src/components/pdf-new/industryAdapter.ts:8-27`

```typescript
type CommercialDocumentDesign = Pick<
  PdfDesignPreset,
  | 'accentColor' | 'textColor' | 'mutedColor' | 'borderColor' | 'surfaceColor'
  | 'headerFont' | 'bodyFont' | 'useCustomFonts' | 'useCustomColors'
> & {
  accentColor: string | null     // Nullable at adapter level
  textColor: string | null
  mutedColor: string | null
  borderColor: string | null
  surfaceColor: string | null
  headerFont: string | null      // NOTE: string, not PdfFontChoice
  bodyFont: string | null        // NOTE: string, not PdfFontChoice
}
```

**Key difference:** `PdfDesignPreset` guarantees non-null strings via `sanitizePdfDesignPreset()`. `CommercialDocumentDesign` uses nullable types because the adapter handles the case where `model.template.designPreset` is null/undefined (returns all nulls).

### 10.3 Properties Available to Templates

| Property | Type in `data.design` | Guaranteed Non-Null? | Gate | Purpose |
|---|---|---|---|---|
| `accentColor` | `string \| null` | Only if `useCustomColors=true` AND user set it | `useCustomColors` | Primary accent color (headers, buttons, bars) |
| `textColor` | `string \| null` | Only if `useCustomColors=true` AND user set it | `useCustomColors` | Primary text color |
| `mutedColor` | `string \| null` | Only if `useCustomColors=true` AND user set it | `useCustomColors` | Secondary/meta text color |
| `borderColor` | `string \| null` | Only if `useCustomColors=true` AND user set it | `useCustomColors` | Border and rule color |
| `surfaceColor` | `string \| null` | Only if `useCustomColors=true` AND user set it | `useCustomColors` | Panel/card background color |
| `headerFont` | `string \| null` | Only if `useCustomFonts=true` AND user set it | `useCustomFonts` | Heading/title font family |
| `bodyFont` | `string \| null` | Only if `useCustomFonts=true` AND user set it | `useCustomFonts` | Body/meta font family |
| `useCustomColors` | `boolean` | Always (default: `false`) | — | Enables color overrides |
| `useCustomFonts` | `boolean` | Always (default: `false`) | — | Enables font overrides |

### 10.4 Sanitization Path

```
User localStorage (or null)
        │
        ▼
sanitizePdfDesignPreset(raw, documentType)
        │
        ├─► normalizeHexColor(value, fallback)  → validates #RRGGBB format
        ├─► normalizeFontChoice(value, fallback) → validates against PDF_FONT_VALUES
        └─► Returns PdfDesignPreset (all fields guaranteed non-null)
        │
        ▼
model.template.designPreset = sanitized preset
        │
        ▼
adaptCommercialDocumentData(model)
        │
        ├─► Picks 9 fields from designPreset
        ├─► Coerces to nullable types (accentColor || null, etc.)
        └─► Attaches as data.design
        │
        ▼
Template receives data.design (nullable fields)
```

### 10.5 Default Values

When no preset is saved, `sanitizePdfDesignPreset()` uses document-type-specific defaults:

| Document Type | Accent | Text | Muted | Border | Surface | Header Font | Body Font |
|---|---|---|---|---|---|---|---|
| invoice | `#14b8a6` | `#0f172a` | `#475569` | `#cbd5e1` | `#f8fafc` | Inter | Inter |
| quotation | `#0f172a` | `#0f172a` | `#475569` | `#cbd5e1` | `#f8fafc` | Inter | Inter |
| csr | `#0f172a` | `#0f172a` | `#475569` | `#cbd5e1` | `#f8fafc` | Inter | Inter |
| waybill | `#0f172a` | `#0f172a` | `#475569` | `#cbd5e1` | `#f8fafc` | Inter | Inter |
| boq | `#0f172a` | `#0f172a` | `#475569` | `#cbd5e1` | `#f8fafc` | Inter | Inter |

**Critical:** When `useCustomColors=false` (the default), all color tokens are still present in `data.design` but templates must NOT apply them. Industry enforces this with:

```typescript
const accentColor = design.useCustomColors && design.accentColor ? design.accentColor : null
```

### 10.6 Available Font Choices

Valid values for `headerFont` and `bodyFont`:

`Inter`, `Roboto`, `Open Sans`, `Lato`, `Montserrat`, `Poppins`, `Raleway`, `Orbitron`, `Source Sans Pro`, `Roboto Condensed`

Font resolution: `resolvePdfFontFamily(choice, variant)` in `pdfDesignPreset.ts:276-302` maps choices to React-PDF registered font families.

### 10.7 Derived Tokens (Industry-Specific)

Industry derives secondary tokens from raw design tokens. These are NOT part of the contract — they are Industry's internal logic:

| Derived Token | Source | Purpose |
|---|---|---|
| `panelSurfaceColor` | `surfaceColor` or `lightenHex(accentColor, 45)` | Panel card backgrounds |
| `panelBorderColor` | `borderColor` or `lightenHex(accentColor, 28)` | Panel borders |
| `subtleSurfaceColor` | `getAccentTint(accentColor, panelSurfaceColor)` | Subtle alternating backgrounds |
| `groupRuleColor` | `panelBorderColor` or `#e5e7eb` | Group header/footer rules |

### 10.8 Contract Summary

1. **Single normalization point:** `sanitizePdfDesignPreset()` in `pdfDesignPreset.ts`
2. **Templates consume only `data.design`** — never raw `model.template.designPreset`
3. **Gates are mandatory:** `useCustomColors` must be `true` for color overrides; `useCustomFonts` must be `true` for font overrides
4. **Null means "use template default":** When a token is `null`, the template falls back to its hardcoded stylesheet value
5. **No template should modify `data.design`** — it is read-only
6. **Fonts must be resolved** via `resolvePdfFontFamily(choice)` before use in React-PDF `fontFamily`
7. **Backwards compatible:** Documents without presets get `useCustomColors=false` and `useCustomFonts=false`, so no overrides are applied

---

## 11. Phase 3 — Architecture Validation

### 11.1 Per-Template Color Slot Mapping

Every template uses a consistent set of 5 semantic color slots, though they name them differently:

| Slot | Apex | Bolt | Crest | Ember | Evergreen | Ledger | Minimal |
|---|---|---|---|---|---|---|---|
| **Primary text** | `INK` #1a2f2f | `INK` #1a1a2e | `INK` #2d1f3a | `INK` #1e2a3a | `INK` #1a3a32 | `colors.ink` #2b2b2b | `INK` #1a1a1a |
| **Accent** | `ACCENT` #0d7c7c | `ACCENT` #52b788 | `ACCENT` #b28b3d | `AMBER` #e67e22 | `ACCENT` #1f6e5c | `colors.accent` #7b8b6f | (none — uses LINK #2563eb) |
| **Border/Rule** | `RULE` #b8c4c4 | `LIGHT_RULE` #d1d5db | `LIGHT_RULE` #e4ddd0 | `BORDER_LIGHT` #e9edf2 | `RULE` #d4dfd8 | `colors.lightRule` #e7e3da | `RULE` #d4d4d4 |
| **Surface** | `PANEL` #f5f8f8 | `WHITE` #ffffff | `PANEL` #f7f3ed | `LIGHT_BG` #f4f6f8 | `ACCENT_PALE` #f0f6f2 | `colors.bgPanel` #f4f2ed | `PANEL_BG` #f5f5f5 |
| **Muted text** | `RULE` #b8c4c4 | `MUTED_TEXT` #6b7280 | `MUTED_TEXT` #7d6f5f | `MUTED` #7a8a9a | `MUTED_TEXT` #7f9a8e | `colors.grayText` #6b6560 | `MUTED_TEXT` #8a8a8a |

### 11.2 Per-Template Font Slot Mapping

| Slot | Apex | Bolt | Crest | Ember | Evergreen | Ledger | Minimal |
|---|---|---|---|---|---|---|---|
| **Display/Header** | `BODY_SERIF` Times-Roman | `BOLT_SERIF` Times-Roman | `CREST_SERIF` Cormorant Garamond | `DISPLAY` Helvetica-Bold | Helvetica-Bold (inline) | Times-Roman (inline) | Helvetica-Bold (inline) |
| **Body** | `BODY_SANS` Helvetica | `BOLT_SANS` Helvetica | `CREST_SANS` Inter | `BODY` Helvetica | Helvetica (inline) | Helvetica (inline) | Helvetica (inline) |

### 11.3 How Colors Are Used in Each Template

Colors appear in two contexts:
1. **StyleSheet creation** — baked into `StyleSheet.create()` as static values
2. **Inline references** — some templates reference exported constants directly in JSX

All 7 templates primarily use **StyleSheet creation** — colors are baked in at module load time. This means:
- Colors CANNOT be overridden by mutating the StyleSheet
- Color overrides MUST be applied via inline `style` arrays on individual elements

### 11.4 Shared Helper Design

A new helper function `resolveDesignTokens(data.design)` will be created in a new file:

**File:** `src/components/pdf-new/designTokens.ts`

```typescript
import type { CommercialDocumentData } from './industryAdapter'
import { resolvePdfFontFamily } from '../../lib/pdfDesignPreset'

type DesignInput = CommercialDocumentData['design']

type DesignTokens = {
  accentColor: string | null    // null = use template default
  textColor: string | null      // null = use template default
  mutedColor: string | null     // null = use template default
  borderColor: string | null    // null = use template default
  surfaceColor: string | null   // null = use template default
  headerFont: string | null     // null = use template default
  bodyFont: string | null       // null = use template default
}

export function resolveDesignTokens(design: DesignInput | undefined): DesignTokens {
  if (!design) {
    return { accentColor: null, textColor: null, mutedColor: null,
             borderColor: null, surfaceColor: null, headerFont: null, bodyFont: null }
  }

  const useColors = design.useCustomColors
  const useFonts = design.useCustomFonts

  return {
    accentColor: useColors && design.accentColor ? design.accentColor : null,
    textColor: useColors && design.textColor ? design.textColor : null,
    mutedColor: useColors && design.mutedColor ? design.mutedColor : null,
    borderColor: useColors && design.borderColor ? design.borderColor : null,
    surfaceColor: useColors && design.surfaceColor ? design.surfaceColor : null,
    headerFont: useFonts && design.headerFont
      ? resolvePdfFontFamily(design.headerFont) : null,
    bodyFont: useFonts && design.bodyFont
      ? resolvePdfFontFamily(design.bodyFont) : null,
  }
}
```

### 11.5 How Templates Consume Design Tokens

Since `StyleSheet.create()` produces static objects, color overrides must be applied via **inline style arrays** on elements. The pattern:

```tsx
// Before (no customization)
<Text style={styles.docTitle}>{data.title}</Text>

// After (with design token overrides)
<Text style={[styles.docTitle, tokens.textColor && { color: tokens.textColor }]}>
  {data.title}
</Text>
```

For font overrides, each template maps its font constants to the resolved token:

```tsx
// Before
<Text style={{ fontFamily: BODY_SERIF }}>...</Text>

// After
<Text style={{ fontFamily: tokens.headerFont || BODY_SERIF }}>...</Text>
```

### 11.6 Element-Level Override Strategy

Each template needs to apply overrides to specific semantic elements. The mapping (elements per color slot):

| Color Slot | Elements to Override | Count per Template |
|---|---|---|
| `textColor` | page (via style inheritance), docTitle, partyName, metaValue, totalFinal, groupHeaderText | ~6-10 elements |
| `accentColor` | docLabel, accentBar, infoTitle, advanceRow background, groupHeaderRow background | ~3-5 elements |
| `borderColor` | tableCard border, sigLine, footerRule, partyBox border | ~3-5 elements |
| `surfaceColor` | tableHeader background, groupSubtotalRow background, footerZone background | ~3-5 elements |
| `mutedColor` | metaLabel, partyLabel, descriptionSub, sigRole, footerText, totalLabel | ~5-8 elements |
| `headerFont` | docTitle, groupHeaderText, totalFinal, infoTitle | ~3-5 elements |
| `bodyFont` | page (base font), partyName, metaValue, tableCell | ~3-5 elements |

**Total elements to modify per template:** ~25-40 (across all 7 color/font slots)

### 11.7 Architecture Decision

**Chosen approach:** Inline style arrays with a shared `resolveDesignTokens()` helper.

**Rejected alternatives:**
- Dynamic `StyleSheet.create()` per render — wasteful, defeats React-PDF's StyleSheet optimization
- Wholesale style object replacement — too risky, templates have complex nested styles
- CSS variables — React-PDF doesn't support them

**Trade-offs:**
- Each template must explicitly add inline overrides to ~25-40 elements
- The pattern is repetitive but deterministic and safe
- When `useCustomColors=false`, all token values are `null`, so inline overrides are no-ops (empty arrays)
- Font overrides require element-level `fontFamily` overrides, not style sheet swaps

### 11.8 Files to Create/Modify

**Create:**
- `src/components/pdf-new/designTokens.ts` — shared `resolveDesignTokens()` helper

**Modify (add inline overrides):**
- `src/components/pdf-new/templates/Apex.tsx`
- `src/components/pdf-new/templates/Bolt.tsx`
- `src/components/pdf-new/templates/Crest.tsx`
- `src/components/pdf-new/templates/Ember.tsx`
- `src/components/pdf-new/templates/Evergreen.tsx`
- `src/components/pdf-new/templates/Ledger.tsx`
- `src/components/pdf-new/templates/Minimal.tsx`

**Do NOT modify:**
- Any `*Styles.ts` files — keep static styles as-is
- `IndustryTemplate.tsx` — already fully customized
- `pdfDesignPreset.ts` — already complete
- `industryAdapter.ts` — already populates `data.design`
