# Waybill PDF Regression Investigation Report

**Date:** 2026-07-06  
**Baseline commit:** `a0eff887` ("Update AGENTS.md")  
**Current HEAD:** `a9baffd2` ("chore: waybill templates update, receipt standard, transformation audit")  
**Branch:** `main`  
**Verification gate:** `git status` clean (only untracked `waybill_diff.txt` reference file)

---

## Executive Summary

Comparing current HEAD against baseline `a0eff887`, the waybill PDF domain underwent structural changes across 14 files. This investigation traces every regression vector across 5 audit areas without modifying any source files.

**Root cause of visual regressions is NOT a single breaking change.** It is a combination of:

1. **Vertical company field rendering** — All 6 templates changed from horizontal `Company | Address | City` to stacked vertical rendering, consuming more header space.
2. **Header spacing adjustments** — Multiple `minHeight`, `paddingVertical`, `marginBottom` changes shifted layout proportions.
3. **Dead customization pipeline** — 10 of 12 `PdfDesignPreset` fields are never read by any waybill template, meaning user-selected accent colors, custom fonts, ink color, and handwriting font have no effect on 5 of 6 templates.

The regressions are **behavioral** (layout shift, lost customization effect) rather than **data** (missing fields, broken resolution). The render model and resolver chain are intact.

---

## Area 1: Logo Rendering

**Verdict: NOT the regression source.** All logo dimensions, positioning, and container styles are identical between baseline and HEAD.

| Template | Logo size (baseline) | Logo size (current) | Changed? |
|----------|---------------------|---------------------|----------|
| Evergreen | 36×36 | 36×36 | No |
| Classic | 40×40 | 40×40 | No |
| Premium | 40×40 | 40×40 | No |
| Minimal | 38×38 | 38×38 | No |
| Slate | 36×36 | 36×36 | No |
| Thermal | 30×30 | 30×30 | No |

No `objectFit`, `maxHeight`, or `maxWidth` properties exist on any logo `<Image>`. The logo container styles (`brandLogo`, `logoBox`) are unchanged.

**Minor difference:** EvergreenTemplate uses an accent-colored fallback icon with a lightning bolt emoji when no logo is present. All other templates use a dashed-border "LOGO" text placeholder. This is a pre-existing cosmetic difference, not a regression.

---

## Area 2: Header Layout

**Verdict: CONTRIBUTING FACTOR.** Multiple spacing and structure changes shifted how headers consume vertical space.

### ClassicTemplate — Most Changes
| Property | Baseline | Current | Impact |
|----------|----------|---------|--------|
| `marginBottom` (brand block) | 8 | 10 | +2pt spacing below brand block |
| `marginBottom` (doc number area) | 8 | 6 | -2pt spacing below doc number |
| `marginBottom` (meta grid) | 6 | 4 | -2pt spacing below meta grid |
| `paddingVertical` (meta row) | 5 | 4 | -1pt vertical padding per meta row |
| `minHeight` (meta card) | 52 | 50 | -2pt minimum height |

**Net effect:** Brand block pushed down slightly, meta grid compressed. Total header height shift ≈ -1pt (mixed directional changes).

### PremiumTemplate
| Property | Baseline | Current | Impact |
|----------|----------|---------|--------|
| `minHeight` (brand box) | 34 | 44 | +10pt — brand box taller |

### MinimalTemplate
| Property | Baseline | Current | Impact |
|----------|----------|---------|--------|
| `minHeight` (header) | 56 | 68 | +12pt — header significantly taller |

### All Templates — Company Field Vertical Rendering
Every template changed from horizontal concatenated rendering:
```
Company | Address | City, State | Phone: 080... | Email | Web: ...
```
To vertical stacked rendering:
```
Company
Address
City, State
Phone: 080...
Email
Web: ...
```

**This is the largest layout impact.** Vertical stacking multiplies the height consumed by branding fields by approximately 3-6×, depending on how many fields are populated.

---

## Area 3: Fill Appearance (Customization Pipeline)

**Verdict: MAJOR FINDING — 10 of 12 preset fields are dead code in waybill context.**

### What Works
| Setting | Saved? | Consumed by templates? | Templates |
|---------|--------|----------------------|-----------|
| `textColor` | ✅ | ✅ | All 6 |
| `templateAccentColor` | ✅ (but no UI writes it) | ✅ | Evergreen only |
| `fillableFont` | ✅ | ✅ | Evergreen only |

### What's Broken
| Setting | Saved? | Consumed? | Status |
|---------|--------|-----------|--------|
| `accentColor` | ✅ | ❌ | **DEAD** — "Custom colors" swatches write here, no template reads it |
| `headerFont` | ✅ | ❌ | **DEAD** — "Custom fonts" writes here, no template reads it |
| `bodyFont` | ✅ | ❌ | **DEAD** — "Custom fonts" writes here, no template reads it |
| `fillableColor` | ✅ | ❌ | **DEAD** — "Ink Color" writes here, no template reads it |
| `useCustomColors` | ✅ | ❌ | **DEAD** — flag never checked |
| `useCustomFonts` | ✅ | ❌ | **DEAD** — flag never checked |
| `mutedColor` | ✅ | ❌ | **DEAD** |
| `borderColor` | ✅ | ❌ | **DEAD** |
| `surfaceColor` | ✅ | ❌ | **DEAD** |

### Key Mismatch
The "Custom colors" UI section writes to `accentColor`, but the only template that uses accent colors (Evergreen) reads `templateAccentColor`. These are different fields. The accent swatches in the customize UI have zero effect on any rendered waybill PDF.

### Impact
Users who customize accent colors, header/body fonts, or ink color see no change in 5 of 6 templates. Only `textColor` works universally. Only Evergreen reads `fillableFont` (handwriting font). The entire "Custom fonts" section of the customize UI is cosmetic for waybills.

---

## Area 4: Template Consistency

**Verdict: SEVERAL STRUCTURAL INCONSISTENCIES between templates.**

### Data Coverage Gaps
| Issue | Affected templates |
|-------|-------------------|
| `branding.tagline` rendered only by Minimal — other 5 silently drop it | Classic, Evergreen, Premium, Slate, Thermal |
| `poNumber` not rendered by Minimal | Minimal |

### Signature Rendering
| Issue | Affected templates |
|-------|-------------------|
| Slate uses unified block with 2-column grid instead of 2 side-by-side cards | Slate |
| Thermal stacks signatures vertically (receipt format) | Thermal |
| Minimal has no dashed border on signature image area | Minimal |
| 4 different label wordings for sender across templates | All |
| 3 templates use separate Date+Time blanks, 2 use combined "Date / Time" | Mixed |

### Items Table
| Issue | Affected templates |
|-------|-------------------|
| Minimal has no section title for items table | Minimal |
| Minimal and Thermal have no alternating row backgrounds | Minimal, Thermal |
| Premium triple-renders `waybillNumber` (header + meta + reference) | Premium |
| Row # column width varies 4-7% | Thermal wider at 7% |

### Company Branding
| Issue | Affected templates |
|-------|-------------------|
| All templates now render city/state as separate vertical lines (was horizontal) | All 6 |
| All templates now render phone/email/website as separate lines with labels | All 6 |
| `customInfo` array rendered in all templates | All 6 |

---

## Area 5: Shared Rendering Utilities

**Verdict: MINIMAL SHARED INFRASTRUCTURE — rendering is mostly inline per template.**

### What's Shared
| Utility | Used by all 6 templates? |
|---------|------------------------|
| `WaybillRenderModel` type | Yes |
| `buildWaybillRenderModel()` | Yes |
| `safeValidateRenderModel()` | Yes |
| `registerPdfFillableFonts()` | Yes (called once in WaybillPDF.tsx) |
| `getDefaultPdfDesignPreset()` | Yes |
| `BrandingBlock` / `PartiesBlock` resolvers | Yes |

### What's Duplicated Per Template
- Logo rendering (inline `<Image>` with identical pattern, copy-pasted)
- Company field rendering (inline `<Text>` elements, now vertical)
- Party/client field rendering (inline `<Text>` elements)
- Color resolution (each template hardcodes fallback hex values)
- Fill handling (each template reads preset fields independently)

### No Shared Components
There is no shared `PartyCard`, `BrandBlock`, or `SignatureBlock` component for waybill templates. Each template implements its own rendering inline. This means layout changes (like vertical company fields) must be applied independently to each template — a maintenance risk.

---

## Root Cause Analysis

The visual regressions stem from three converging changes:

1. **Vertical company field rendering** (all 6 templates) — The largest single layout impact. Horizontal concatenation to vertical stacking multiplies header height. Users with long company names, addresses, or multiple `customInfo` entries will see the most dramatic shift.

2. **Header spacing adjustments** (Classic, Premium, Minimal) — Specific `minHeight` and `marginBottom` changes in these templates compound the vertical rendering change.

3. **Dead customization pipeline** — Users who had previously set accent colors, custom fonts, or ink colors will see those settings silently ignored on all templates except Evergreen (for accent) and Evergreen (for handwriting font only). This creates a perceived regression where "my settings stopped working."

The render model, resolver chain, Zod validation, and data pipeline are all intact. No fields were dropped, no resolution logic was broken, and no template is missing data it previously had.

---

## Confidence Levels

| Finding | Confidence |
|---------|-----------|
| Logo dimensions unchanged | **High** — direct diff comparison |
| Vertical company fields = layout regression | **High** — diff shows the exact change |
| 10/12 preset fields dead in waybill context | **High** — traced through full code path |
| `templateAccentColor` vs `accentColor` mismatch | **High** — verified in preset type and template imports |
| `poNumber` missing from Minimal | **High** — confirmed in template source |
| `tagline` dropped by 5 templates | **High** — confirmed in template source |
| Signature label inconsistencies are intentional | **Medium** — could be per-template design choices |
| Premium triple-renders waybill number | **Medium** — could be intentional meta card design |

---

## Deferred Work

This investigation was zero-code by design. The following are NOT addressed:

1. **Fix vertical company field rendering** — Would require reverting to horizontal concatenation or adding responsive wrapping logic per template
2. **Fix dead preset pipeline** — Would require wiring `accentColor`, `headerFont`, `bodyFont`, `fillableColor` into template `createStyles()` functions
3. **Fix `templateAccentColor` / `accentColor` mismatch** — Either rename the UI field or update Evergreen to read the correct field
4. **Standardize signature rendering** — Would require choosing one layout pattern across all templates
5. **Add `poNumber` to Minimal** — Minor data gap
6. **Add `tagline` rendering to non-Minimal templates** — Minor data gap

All of these require code changes and should be scoped as separate tasks.
