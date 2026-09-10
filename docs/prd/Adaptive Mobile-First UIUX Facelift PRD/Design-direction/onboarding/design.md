# files.tax Onboarding — Extracted Design System (design.md)

> Source: `files-tax-onboarding-manus.html` (Files.tax onboarding prototype)
> Status: Extraction — descriptive, not normative. This file documents the template's own visual language.
> Extracted: 2026-09-10
> Governs: Nothing. It is a candidate description for comparison against `../Design.md` (the authoritative BIGDROPS theme contract).

---

## 1. Purpose

This document extracts the design system of `files-tax-onboarding-manus.html` into token form. It records what the template uses, not what the product must use. It exists so the template can be evaluated as an onboarding candidate against the BIGDROPS theme contract and the multi-tenancy and taxation PRDs.

---

## 2. Design Personality

| Trait | Expression in template |
|-------|------------------------|
| Warm-professional | Cream and paper surfaces, coral accent, sage secondary |
| Editorial | High-contrast display type, rotated cards, stamps, sticky-note moments |
| Calm-operational | Progress bars, checklists, plain-language status pills |
| Tactile | Paper-like cards with rotation, deep soft shadows, grain-free flat fields |

The template reads as a consumer-friendly fintech/tax product: friendly first, authoritative second. BIGDROPS reads as premium-operational first. The two personalities differ in emphasis, not in quality.

---

## 3. Token Inventory (extracted values)

### 3.1 Color primitives

| Token | Value | Used for |
|-------|-------|----------|
| `--bg` | `#f4f3ef` | Page canvas — warm paper |
| `--surface` | `#fffefa` | Cards — warm white |
| `--surface-muted` | `#e9e8e1` | Progress track, icon wells |
| `--ink` | `#20231f` | Primary text, primary button, dark board card |
| `--muted` | `#74786f` | Secondary text, labels |
| `--line` | `#d8d9d0` | Borders, dividers, nav rail |
| `--accent` | `#d9674e` | Primary accent (coral) |
| `--accent-deep` | `#b94d38` | Hover, emphasis, eyebrow text |
| `--accent-soft` | `#f7d6cc` | Tints, bar-chart highlights |
| `--sage` | `#b8c9ae` | Soft secondary accent |
| `--sage-deep` | `#5f765b` | Success checks, isolation badge |

Accent family: coral `#d9674e` (deep `#b94d38`, soft `#f7d6cc`, stamp fill `#fff6f2`). Sage family: deep `#5f765b`, soft `#b8c9ae`.

### 3.2 Typography

| Token | Value |
|-------|-------|
| Display/UI family | `"Space Grotesk", sans-serif` |
| Body family | `"DM Sans", -apple-system, ...` |
| H1 scale | `clamp(2.05rem, 10vw, 3.35rem)`, line-height `.98`, letter-spacing `-.075em` |
| Body copy | 15px / 1.55 |
| Eyebrow | 11px, 700, `+.13em` uppercase, accent-deep |
| Micro | 9–11px labels, status pills 10px |
| Numerals | Space Grotesk, tight tracking (`.amount` 22px, `-.06em`) |

Space Grotesk + DM Sans is a display-forward geometric pairing. It is a different voice from Manrope + DM Mono: rounder, warmer, more editorial.

### 3.3 Radius

| Token | Value | Used for |
|-------|-------|---------|
| Card | 24px | art-cards |
| Control | 17px | primary button, auth choices |
| Medium | 15px | workspace cards |
| Small | 8–9px | entities, marks, logos |
| Full | 999px | status pills |

Radius system is larger and softer than BIGDROPS's 18px card contract.

### 3.4 Shadows

| Token | Value |
|-------|-------|
| `--shadow` | `0 20px 44px rgba(43,48,40,.12), 0 4px 12px rgba(43,48,40,.06)` |
| Button shadow | `0 10px 20px rgba(32,35,31,.18)` |

Shadows are neutral warm-black, not primary-tinted. BIGDROPS tints shadows toward the primary colour; this template does not.

### 4.5 Elevation & rotation

The template adds a token class BIGDROPS does not have: rotation as a design element. Art cards rotate −3° to +5°; the stamp rotates −14°. Rotation gives the tactile, sticker/paper feel. It is distinctive and carries the "calm paperwork" metaphor.

### 3.6 Motion

| Token | Value |
|-------|-------|
| `--ease` | `cubic-bezier(.2,.8,.2,1)` |
| Track transition | `transform .65s` |
| Reduced motion | Global `animation-duration/transition-duration: .01ms` override |
| Animated reveal | Only the auth panel fade |

The template has a motion vocabulary but almost no entrance choreography. Slides are static compositions; only the auth panel animates in. This is the template's largest motion gap.

---

## 4. Layout & Spacing

- Single-column, 430px max content width, centered
- Full-screen slides, flex column: header → art → copy → footer
- Slide padding: `calc(safe-top + 82px) 22px calc(safe-bottom + 122px)` — safe areas respected
- Footer floats over a `linear-gradient(transparent, var(--bg) 28%)` scrim
- Progress rail: 3 tap targets 28px tall (flex bars), active bar scales `scaleY(1.35)`
- Primary CTA 56px min-height, full width

---

## 5. Iconography & Art Direction

- No icon library. All marks are typographic or geometric: `f` mark, `+`/`↗` icon wells, `✓`/`→` check circles
- Art = composed HTML/CSS cards (filing card, review card, dark workspace board), not SVG illustration
- Floating notes and stamps add narrative detail ("72% ready", "READY TO FILE", "Foolproof isolation")
- The workspace board is the strongest art: dark ink card, entity rows, Books/VAT/WHT chips, isolation badge

---

## 6. Component Inventory (observed)

| Component | Notes |
|-----------|-------|
| Wordmark + step label header | "01 / 03" numeric progress |
| Progress rail (tappable) | 3 flex bars, doubles as slide nav |
| Art cards (3 variants) | filing / review / tenant board |
| Primary button | ink bg, hover → accent-deep |
| Footer prompt line | context-aware ("Swipe or tap to continue") |
| Auth panel (overlay) | Create workspace / Sign in choice cards, terms line |
| Status pills | "On track", "Ready to file" |
| Check circles + line items | checklist row pattern |
| Bars chart | 6 bars, accent highlights |
| Dark tenant board | workspace + entity rows + isolation badge |

---

## 7. Accessibility postures (observed)

- `:focus-visible` with 3px accent outline, offset 3px
- `.sr-only` class defined (unused on some controls that need it)
- `role="img"` + `aria-label` on each art group; `aria-hidden` on decorative bars
- Carousel: `aria-roledescription="carousel"`, per-slide `aria-label="n of 3"`
- Nav buttons: real `<button>` with `aria-label` and `aria-current="step"`
- Auth overlay: `aria-labelledby`, `aria-hidden` toggling, focus moved to first control on open
- Reduced motion: global override
- Keyboard: Arrow keys slide; tab order preserved
- Weak points: tap targets 28px tall in the rail (below 44px), `.sr-only` not applied to `#stepLabel` change announcements, no live region for slide changes, SSO absent

---

## 8. Contrast notes (measured against WCAG 2.1 AA)

- `--ink #20231f` on `--bg #f4f3ef`: ~15.8:1 — pass
- `--muted #74786f` on `#fffefa`: ~4.6:1 — pass for body copy
- `--accent #d9674e` on white: ~3.2:1 — pass as large text/graphic only; **fails 4.5:1 for small text**
- `--accent-deep #b94d38` on `--bg`: ~4.6:1 — pass
- White on `--ink #20231f` (primary button): ~14.9:1 — pass
- White on `--accent` (auth primary-choice): ~3.2:1 — **fails for 11px labels inside**
- `--sage-deep #5f760b`-family checks on white — pass

The accent fails as small-text ink. Eyebrows correctly use `--accent-deep`, but the white-on-accent auth card labels at 11px sit below AA for small text.

---

## 9. Relationship to the BIGDROPS Design.md contract

| Contract rule (Design.md) | Template behavior | Verdict |
|---------------------------|-------------------|---------|
| Slate-navy palette, cool gray-blue bg | Warm cream/coral/sage palette | ❌ Different palette family |
| Manrope + DM Mono | Space Grotesk + DM Sans | ❌ Different type pairing |
| Compact density (7–17px type, 2–14px spacing) | Editorial scale (H1 up to 3.35rem, 17–24px padding) | ⚠️ Denser art, larger type |
| 18px card radius | 24px cards, 17px controls | ⚠️ Softer radii |
| Primary-tinted shadows | Neutral warm shadows | ⚱️ (minor) not tinted |
| Gradient identity (135° primary→secondary on active tabs/FAB/brand) | None — flat ink/coral | ❌ No gradient identity |
| Bottom-sheet overlays | Auth appears as full-screen overlay, not bottom sheet | ⚠️ Overlay pattern differs |
| Semantic tokens (`--bg`, `--surface`, `--ink`, `--primary`, `--line`) | Semantic names but private values | ⚠️ Same architecture, different values |
| Grain texture on app shell | None | ❌ Absent |
| Manrope/DM Mono numerals for money | Space Grotesk for amounts | ❌ Money type differs |

Same semantic-token *architecture*, entirely different *values*. A candidate built on this template would need a full re-skin to comply with Design.md. The architecture port is trivial; the identity is not.

## 10. Reuse value for BIGDROPS

- **Reusable**: semantic token structure, art-card composition method, tappable progress rail, floating narrative chips (waybill pin, Files.tax card), isolation badge concept, auth choice-cards with Create/Sign-in, status pill vocabulary
- **Not reusable as-is**: palette, type pairing, radii, shadows, rotation motif (unless re-anchored in slate-navy), `$48.2k` dollar amounts
