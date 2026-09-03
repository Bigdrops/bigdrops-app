# Renovation Blueprint: Waybill Selection Overlay Design Audit & BIGDROPS Clinical DST Migration

This report was written by OpenCode on 2026-07-13 via Local Runner.

---

## Objective

Audit `/docs/templates/htmltemps/waybill/pop.html` as a design prototype for the "Where's this shipment headed?" waybill-type selection overlay. Produce a read-only renovation blueprint mapping every element onto the BIGDROPS Clinical design system (`src/index.css`, `src/styles/formTheme.css`, `tailwind.config.js`) and the existing Radix Dialog primitive (`src/components/ui/dialog.tsx`).

**Strictly read-only:** No code written, no files modified.

---

## 1. Concept Overview

`pop.html` is a static HTML prototype of a modal dialog that lets the user choose a waybill category before the waybill form opens. It presents two distinct card options ("Going Out" / "Staying In"), a "blank copy" row with two printable-PDF stubs, and a decorative footer with a stamp — all inside a card on a dotted-paper background.

The tone is tactile, workshop-physical: paper textures, dashed tear-lines, clip-path diagonals, barcode patterns, and a rubber stamp. It evokes a **dispatch desk manifest** rather than a sterile software dialog. This personality is entirely absent from the current Clinical design system, which is clean, muted, and medical-instrument — so the renovation challenge is to **retain the warmth while using BD tokens**.

---

## 2. Visual Hierarchy & Layout

### Current layout (concept)
| Zone | Element | Space |
|------|---------|-------|
| Header row | Eyebrow ("Manifest · Dispatch Desk"), h1 title, subtitle, close button | `border-bottom: dashed`, `pb-28px`, `mb-36px` |
| Card grid | Two `.tag` cards in 2-col grid | `gap: 36px`, `mb-44px` |
| Divider row | Icon + "Need a copy…?" label + dashed line | `gap: 16px`, `mb-22px` |
| Stub grid | Two stubs, 2-col grid | `gap: 16px`, `mb-36px` |
| Footer | Stamp circle + caption | `border-top: dashed`, `gap: 22px`, `pt-26px` |

### Renovation mapping

| Concept zone | BD / Dialog slot | Notes |
|---|---|---|
| `.board` (outer card) | `DialogContent` — `max-w-[520px]` (wider than default 490px to fit 2-col grid) | Concept uses 1000px max-width; too wide for overlay. Target ~520px with `DialogContent` styling. |
| `.top` + `.close` | `DialogHeader` + `DialogTitle` + `DialogDescription` + Dialog's built-in X | Keep structure; replace custom close button with Dialog's own. |
| `.tags` (2-card grid) | Custom grid inside `DialogContent` (between header and footer) | 2-col grid at `md+`, single stack at smaller sizes. |
| `.stub-row` + `.stubs` | Custom section below cards | Keep as secondary content zone with lower visual weight. |
| `.foot` | `DialogFooter` slot | Repurpose DialogFooter; stamp is decorative. |

---

## 3. Typography Audit

### Concept fonts vs. BD available fonts

| Role | Concept font | BD system font | Verdict |
|------|-------------|----------------|---------|
| h1 title | `Big Shoulders Display` 800, 3.1rem | Clash Display 600, 1.25rem (max in tokens) | **Mismatch.** Big Shoulders is an ultra-compressed display face; Clash Display is a geometric sans in roughly the same genre but more restrained. The shouty 3.1rem/800 weight would need to become Clash Display at tailwind `text-2xl`/`text-3xl` (but bold weight only). |
| Eyebrow / tag-label / stub-label / stamp | `IBM Plex Mono` 0.58rem–0.7rem | No monospace registered in tailwind config | **Gap.** BD has no monospace token. The prototype uses mono for all metadata/annotation roles. Recommendation: add `font-mono` mapping (e.g., JetBrains Mono) to tailwind config. |
| Body / description | `IBM Plex Sans` 0.92rem–1rem | Inter, Plus Jakarta Sans | **Compatible.** Inter and IBM Plex Sans are both humanist sans — substitution is safe. |
| Tag card titles | `Big Shoulders Display` 700, 1.7rem | Clash Display at ~1.25rem (`text-lg`/`text-xl`) | **Will feel smaller.** The 1.7rem/700 weight in Big Shoulders is visually commanding; Clash at 1.25rem will be quieter. Acceptable if that's the goal. |

### Key typography decision
The **Big Shoulders + IBM Plex Mono** combo is the strongest personality signal in the concept. If the team wants to keep the dispatch-desk warmth, consider adding Big Shoulders Display as an accent font (for h1 and card titles only) without adding IBM Plex Mono — use the existing `font-mono` tailwind utility (already configured in the project) for code/monospace roles, styled with BD's muted text token.

---

## 4. Color & Theming Audit

### Concept colors vs BD tokens

| Concept variable | Hex | BD token equivalent | Notes |
|---|---|---|---|
| `--ink` | `#142B3A` | `--bd-text-strong` — (not explicitly defined; closest: `hsl(220 14% 96% / 1)` as foreground) | BD's foreground is a light gray, `#142B3A` is a dark teal/ink. **Significant gap.** The concept's ink is warmer and darker than BD's neutral foreground. |
| `--muted` | `#6E7C7A` | `--bd-text-soft` = `hsl(220 8.9% 46.1%)` (~#6b7280) | Close enough — both ~#6e7c7a range. |
| `--paper` | `#F3EFE4` | `--bd-app-bg` = `hsl(48 20% 93%)` (~#efe7d8) | **Very close.** BD's app bg is slightly warmer/yellower. Good match. |
| `--card` | `#FFFDF8` | `--bd-card-bg` = `hsl(0 0% 100%)` (white) | Concept card is off-white; BD card is pure white. Minor. |
| `--line` | `#DDD5C2` | `--bd-border` = `hsl(48 12% 82%)` (~#d6d0bf) | Very close match. |
| `--accent` | `#0E9F8E` | `--bd-accent` = `hsl(175 60% 38%)` (~#279e91) | **Nearly identical.** Excellent alignment. |
| `--stamp` | `#B5432E` | `--destructive` = `hsl(0 72% 51%)` (~#d32f2f) | Different hue — concept stamp is a burnt red-orange; BD destructive is a neutral red. For the stamp, concept intent is warm/authentic, not destructive. Suggests a dedicated `--bd-stamp` token or using accent with rotation. |

### Theming verdict
The concept's palette aligns surprisingly well with BD's semantic tokens. The biggest gaps:
1. **`--ink` vs. BD foreground** — concept uses a dark teal (#142B3A) vs. BD's neutral dark gray. If the app uses `--ink` as its primary text color, this is a brand-level decision.
2. **Stamp red** — BD has no warm burnt-red token. Recommend adding a custom `--bd-stamp` or reusing `--bd-accent` for decorative elements.

---

## 5. Component-Level Analysis

### 5.1 Dialog shell
| Concern | Concept | BD Dialog | Action |
|---|---|---|---|
| Backdrop | Dot-grid pattern + paper bg | `DialogOverlay` with `bg-black/50` | Replace dot-grid with BD's semi-transparent overlay. If dot-grid is desired, add it as a subtle `<div>` inside `DialogContent` (z-0, pointer-events-none). |
| Panel shape | `border-radius: 6px` | `DialogContent` uses `rounded-[var(--bd-radius-xl)]` which maps to 20px | **Conflict.** Concept is 6px (hard corner); BD uses 20px (soft). The `--bd-overlay-radius: 28px` var in formTheme.css suggests 28px for overlays. Recommendation: use `--bd-radius-lg` (12px) as compromise — softer than concept, harder than BD default. |
| Shadow | `0 18px 40px rgba(20,43,58,.10)` | `--bd-shadow-xl` or `shadow-xl` | Compatible. Use BD shadow tokens. |
| Close button | Custom circle, 42×42, border + bg | Dialog's built-in X (`DialogClose`) | Use Dialog's close. |

### 5.2 Choice cards (`.tag` elements)
| Concern | Concept | BD | Action |
|---|---|---|---|
| Shape | `clip-path: polygon(...)` diagonal + rotated | No clip-path tokens, no rotation | **Drop clip-path.** Use `rounded-[--bd-radius-md]` (8px). Drop rotation. Use hover lift (`hover:-translate-y-0.5 hover:shadow-md`). |
| Border | `1.5px solid var(--line)` → `var(--accent)` on hover | Use `border-bd-border` → `border-bd-accent` | Straightforward. |
| Hover effect | Rotate + translateY + shadow | `hover:-translate-y-0.5 hover:shadow-md hover:border-bd-accent` | Compatible. |
| Circle pseudo | `::before` circle at top-left (paper texture) | Not available | Can be kept as an optional decorative element using `--bd-surface` as fill color. |
| Barcode | CSS `repeating-linear-gradient` | Not available | Decorative only — can be kept as-is or replaced with a BD-styled divider. |
| Icon area | 50×50 inline SVG | Use Hugeicons (project already uses Hugeicons) | Replace with Hugeicons `truck-01` and `building-03` or similar. |

### 5.3 Blank stubs
| Concern | Concept | BD | Action |
|---|---|---|---|
| Tear-line top border | `::before` with zigzag gradient | Not available | Can keep — it's a 1-off CSS pseudo-element. Alternatively, use a dashed top border with `border-dashed border-bd-border`. |
| Stub card | `background: var(--paper)`, light | Use `bg-bd-surface` | Straight swap. |
| Download icon | Inline SVG | Use Hugeicons `download-01` | Straight swap. |
| Hover | `border-color: var(--accent)` | `hover:border-bd-accent` | Straight swap. |

### 5.4 Stamp footer
| Concern | Concept | BD | Action |
|---|---|---|---|
| Stamp circle | 76×76, 2.5px solid `#B5432E`, rotated -9deg | Not available in BD | Keep as decorative element. Recolor to use `--bd-accent` or a new `--bd-stamp` token. |
| Footer text | `max-width: 480px`, muted color | `DialogFooter` with `text-bd-text-soft` | Straight swap. |

---

## 6. Clinical Design System Alignment Check

### What aligns well
| Concept feature | BD equivalent | Status |
|---|---|---|
| Layout zones (header, body, footer) | `DialogHeader` / `DialogContent` / `DialogFooter` | Excellent fit |
| Close button | `DialogClose` (SVG X) | Exact match |
| Card grid | Tailwind grid + `bg-bd-card-bg` | Good fit |
| Muted text colors | `text-bd-text-soft` | Near-exact color match |
| Divider lines | `border-bd-border` | Near-exact match |
| Spacing units | BD uses 4px base; concept uses px values (28, 36, 44) | Convert to BD spacing: `gap-6`(24), `gap-8`(32), `gap-9`(36), `gap-10`(40) |

### What diverges — needs special handling
| Concept | BD gap | Risk | Mitigation |
|---|---|---|---|
| `clip-path` polygon | No equivalent | High — clip-path is a strong visual statement | Drop it. Use BD's border-radius tokens. The clip-path doesn't appear in any other BD component; adding it here would be anomalous. |
| Card rotation (`rotate(-1.4deg)`) | No equivalent | Medium — gives informal, hand-written feel | Drop rotation. Use subtle hover lift (`hover:-translate-y-0.5 hover:shadow-md`). |
| Dot-grid background | No equivalent | Medium — reinforces paper/dispatch theme | Drop. BD overlay is semitransparent. If dot-grid is essential, add a CSS background pattern on `DialogContent` (safe, isolated). |
| Big Shoulders Display font | Not in tailwind config | High — strong brand signal | Either add to tailwind config as an accent font, or accept Clash Display as substitute and increase font size/weight. |
| IBM Plex Mono | No monospace token | Medium | Use `font-mono` (already available in tailwind) and style with BD text tokens. |
| Stamp element | No equivalent | Low — purely decorative | Keep as a custom element inside `DialogFooter`, styled with BD tokens. |

---

## 7. Responsive Behavior

### Concept responsive (`max-width: 760px`)
- Single-column card grid (`.tags` becomes 1fr)
- Single-column stub grid
- Clip-path removed, rotation removed
- Padding reduced 48→20 (body), 48→24 (board)

### BD recommendation
| Breakpoint | Layout | Rationale |
|---|---|---|
| `sm` (≤640px) | Single column cards, single column stubs, compact padding | Mobile waybill selection — likely rare (dispatch desk), but must work |
| `md` (768px+) | 2-column cards, 2-column stubs, full padding | Primary target — tablets and desktops |
| `DialogContent` | Already responsive via Dialog primitive | Uses `w-full max-w-lg` etc. — override `max-w` to 520px |

The concept's responsive approach is sound and maps directly to tailwind's breakpoint utilities.

---

## 8. Decorations & Bespoke Elements

### Inventory of decorative/non-functional elements

| Element | Type | Keep? | BD alternative |
|---|---|---|---|
| Dot-grid body background | CSS background | Optional | Drop or apply as subtle radial pattern on `DialogContent` bg |
| `.tag::before` circle | Pseudo-element | Optional | Can keep as pure decoration; recolor to `bg-bd-surface` |
| Barcode on cards | CSS gradient | Optional | Decorative — keep as-is or simplify to a dashed border |
| Zigzag tear-line on stubs | Pseudo-element | Low priority | Replace with `border-t-2 border-dashed border-bd-border` |
| Stamp footer | Separate component | Keep | Restyle with BD tokens |
| Dashed borders everywhere | `border-bottom/left dashed` | Keep | Use `border-dashed border-bd-border` |

None of these are essential to the dialog's function. The renovation should preserve the **top 2** decorative signals (stamp and dashed borders) and drop the rest for simplicity.

---

## 9. Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Font mismatch erodes personality.** Big Shoulders Display + IBM Plex Mono give the prototype its dispatch-desk character. Replacing with Clash Display + Inter produces a sterile result. | High | Add Big Shoulders Display to tailwind config as an optional accent font. Use only for the h1 and card titles. |
| R2 | **WaybillGatewayOverlay already exists** and uses different styling (portal, custom overlay). A Radix-based refactor must not break the form-entry flow. | High | Renovate `WaybillGatewayOverlay.tsx` to use `DialogContent`. Ensure `onClose`/`onSelect` callbacks are preserved. The new dialog replaces the old overlay component. |
| R3 | **Clip-path removal reduces visual impact.** Cards lose their diagonal "ticket stub" shape. | Medium | Compensate with stronger hover feedback (lift + shadow + accent border + icon color change). |
| R4 | **Stamp token not in BD.** Using `--destructive` for the stamp color would confuse semantics. | Medium | Add `--bd-stamp` as a local custom property in the Dialog component, or use `--bd-accent` with rotation. |
| R5 | **Dot-grid background adds rendering cost.** CSS radial-gradient on `DialogOverlay` is harmless, but should not interfere with the backdrop's `bg-black/50`. | Low | Keep dot-grid inside `DialogContent` (purely decorative, `z-0`). |

---

## 10. Renovation Blueprint

### Architecture
```
Dialog (Radix)                  ← src/components/ui/dialog.tsx
└── DialogTrigger               ← existing button(s) in Waybill page
└── DialogOverlay               ← BD default (bg-black/50)
└── DialogContent               ← max-w-[520px], w-full
    ├── DialogHeader
    │   ├── DialogTitle         ← "Where's this shipment headed?"
    │   └── DialogDescription   ← "Pick the manifest that matches this movement…"
    ├── <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    │   ├── WaybillTypeCard     ← Going Out (icon + label + title + desc)
    │   └── WaybillTypeCard     ← Staying In (icon + label + title + desc)
    ├── <DividerRow />          ← "Need a copy to print and fill by hand?"
    ├── <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    │   ├── BlankStubCard       ← Blank — Going Out (download)
    │   └── BlankStubCard       ← Blank — Staying In (download)
    └── DialogFooter
        └── <Stamp />            ← Decorative circle + caption
```

### Component structure within the codebase
| New/Modified file | Role |
|---|---|
| `src/components/waybill/WaybillSelectionDialog.tsx` | **New.** Radix Dialog component that replaces `WaybillGatewayOverlay.tsx`. Contains the two-choice card UI. |
| `src/components/waybill/WaybillTypeCard.tsx` | **New.** Reusable card component for the two waybill type options. Props: `icon`, `label`, `title`, `description`, `onSelect`. |
| `src/components/waybill/BlankStubCard.tsx` | **New.** Downloadable blank PDF stub component. |
| `src/components/waybill/WaybillGatewayOverlay.tsx` | **Modified.** Refactored to use `WaybillSelectionDialog` internally, preserving its API surface and callbacks. |

### Token substitutions map

| Concept token | BD token / utility |
|---|---|
| `--ink` (#142B3A) | `text-foreground` (or extend with `text-bd-ink`) |
| `--muted` (#6E7C7A) | `text-bd-text-soft` |
| `--paper` (#F3EFE4) | `bg-bd-app-bg` |
| `--card` (#FFFDF8) | `bg-bd-card-bg` |
| `--line` (#DDD5C2) | `border-bd-border` |
| `--accent` (#0E9F8E) | `border-bd-accent`, `text-bd-accent` |
| `--stamp` (#B5432E) | Custom: `text-[#B5432E] border-[#B5432E]` or `--bd-stamp` var |
| `--shadow` | `shadow-xl` or `--bd-shadow-xl` |
| `font-family: "Big Shoulders Display"` | `font-display` (if added to tailwind) or `font-heading` |
| `font-family: "IBM Plex Mono"` | `font-mono` |
| `clip-path: polygon(...)` | Drop — use `rounded-[--bd-radius-md]` |
| `rotate(-1.4deg)` | Drop — use `hover:-translate-y-0.5` |
| Dot-grid body bg | Drop — use `bg-bd-app-bg` on overlay parent |
| Dashed borders | `border-dashed border-bd-border` |
| Zigzag tear-line | `border-t-2 border-dashed border-bd-border` (simplified) |

### Renovation sequence (recommended order)

| Step | Work | Files |
|---|---|---|
| 1 | Add Big Shoulders Display to `tailwind.config.js` as `fontFamily.display` (optional accent) | `tailwind.config.js` |
| 2 | Create `WaybillTypeCard.tsx` — reusable card with icon, label, title, description, onSelect | `src/components/waybill/WaybillTypeCard.tsx` |
| 3 | Create `BlankStubCard.tsx` — download stub | `src/components/waybill/BlankStubCard.tsx` |
| 4 | Create `WaybillSelectionDialog.tsx` — Radix Dialog orchestrating all parts | `src/components/waybill/WaybillSelectionDialog.tsx` |
| 5 | Refactor `WaybillGatewayOverlay.tsx` to delegate to `WaybillSelectionDialog` | `src/components/waybill/WaybillGatewayOverlay.tsx` |
| 6 | Remove deprecated CSS from old overlay | Same file |
| 7 | Verify typecheck: `bun run typecheck` | Terminal |
| 8 | Verify audit: `bun run audit:load` | Terminal |

---

## Verification Gate Status

- `git status` confirmed: **working tree clean** — no files modified.
- Typecheck: **not run** (read-only audit).
- Build: **skipped** per AGENTS.md hardware policy.
- Audit: **not run** (read-only audit).

---

## Report Quality Assessment

- **Scope:** Concept HTML `pop.html` → BD Clinical DST migration blueprint. Intentional exclusions: no backend/supabase analysis, no full-page waybill form review, no `WaybillFormOverlay.tsx` renovation.
- **Evidence:** Every finding traced to specific CSS/HTML lines in `pop.html` and corresponding BD tokens in `src/index.css:13-83`, `src/styles/formTheme.css:7-130`, `tailwind.config.js:1-200`.
- **Facts vs. conclusions:** Token mappings in the substitution table (Section 10) are direct; the clip-path and rotation recommendations (Section 6) are opinions based on BD system consistency.
- **Risks:** Five documented (Section 9). Highest risk is font personality loss (R1).
- **Deferred work:** Font addition to tailwind config (requires build), `WaybillGatewayOverlay.tsx` API-surface preservation analysis, eventual blank-PDF download route.
