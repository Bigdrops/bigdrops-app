# Loading and Refresh

> Status: Established
> Last updated: 2026-08-28
> Source reference: `docs/TEMPLATES/htmltemps/wireframe-variants/batch-10/`

---

## Purpose

Define loading states and refresh behavior for BIGDROPS dashboards. This specification is derived from the batch-10 wireframe variants and must be implemented against the canonical design system defined in [03-design-system.md](./03-design-system.md).

---

## Overview

Every variant in batch-10 implements the same refresh flow:

---

## Overview

Every variant in batch-10 implements the same refresh flow:

1. User taps the **refresh icon** (circular arrow) in the top bar.
2. A **full-screen loading overlay** covers the dashboard.
3. A **"Did you know" tip** is displayed to fill the wait.
4. A **progress indicator** shows advancement (indeterminate or percentage-based).
5. After completion (~2.2s), the overlay fades out.
6. A **toast notification** confirms "Dashboard refreshed".

---

## Flow Sequence

```
User taps refresh
       │
       ▼
┌─────────────────────────────┐
│  Close all overlays first   │  sidebar, notifications, AI, FAB
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Show loading overlay       │  opacity: 0 → 1, pointer-events: auto
│  ┌───────────────────────┐  │
│  │  Brand mark / orb      │  │  pulsing gradient or spinner
│  │  "Did you know" tip    │  │  random from TIPS array
│  │  Progress bar          │  │  indeterminate or 0% → 100%
│  │  (optional % counter)  │  │
│  └───────────────────────┘  │
└──────────────┬──────────────┘
               │
               ▼  ~2.2 seconds
┌─────────────────────────────┐
│  Hide loading overlay       │  opacity: 1 → 0, pointer-events: none
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Show toast                 │  "Dashboard refreshed"
│  Auto-dismiss after 2.2s    │
└─────────────────────────────┘
```

---

## Component Anatomy

### Loading Overlay

| Property | Value |
|----------|-------|
| Position | `fixed` or `absolute`, `inset: 0` |
| z-index | 80–100 (above all other overlays) |
| Background | Matches theme canvas (`var(--paper-white)` or `var(--canvas)`) |
| Display | `flex`, centered column |
| Initial state | `opacity: 0`, `pointer-events: none` |
| Active state | `opacity: 1`, `pointer-events: auto` |
| Transition | `opacity 0.25s–0.3s` |

### Brand Mark / Orb (top element)

Three visual variants exist across the batch:

| Variant | Element | Visual |
|---------|---------|--------|
| **Amra** | `.ls-mark` | 84px rounded square, periwinkle→teal gradient, refresh icon SVG |
| **Clyde** | `.ls-orb` | 74px circle, radial gradient orb, `pulse` animation (scale 1→1.08) |
| **Blueprint** | `.ls-pulse` | 70px circle, accent radial gradient, `pulse` animation (scale 1→1.1) |
| **Others** | `.ls-mark` | 64px rounded square, accent color fill, "BD" text |

### Spinner (Amra only)

| Property | Value |
|----------|-------|
| Size | 32×32px |
| Style | `border: 2px solid var(--border)`, `border-top-color: var(--accent)` |
| Animation | `spin 0.9s linear infinite` (360° rotation) |

### Progress Bar

Two modes exist:

**Indeterminate (Amra):**
- Width: 200px, height: 5px
- Inner bar: 40% width, slides left→right continuously
- Animation: `load 1.4s ease-in-out infinite`, `translateX(-100%) → translateX(350%)`

**Deterministic (all others):**
- Width: `min(280px, 80%)`, height: 5px
- Inner fill: starts at 0%, grows to 100%
- Update interval: ~140ms
- Increment: random 6–24% per tick
- Total duration: ~1.8–2.4s (varies by random increments)

### "Did you Know" Tip

| Property | Value |
|----------|-------|
| Label | "DID YOU KNOW" — mono font, 9–10px, uppercase, accent color |
| Text | 14px, muted color, max-width 290–300px, centered |
| Content | Random selection from a `TIPS[]` array |

### Progress Counter (optional)

- Mono font, 11px, muted color
- Displays `0%` → `100%` during deterministic progress
- Only present in variants with deterministic progress bars

---

## Tip Content Pool

Each variant carries its own tip array. Examples from the batch:

| Variant | Sample Tips |
|---------|-------------|
| **Amra** | "You can convert an invoice to a waybill directly from the document view." / "Keyboard shortcuts exist for saving: Ctrl+S drafts, Ctrl+Enter finalizes." |
| **Backlight** | "Reconciled payments update the audit trail automatically." / "Waybills strip monetary values by design — rates live on invoices." |
| **Clyde** | "Overdue flags are recalculated every time the dashboard loads." / "Group headers in line items can collapse to keep forms short." |

Tips rotate on each refresh. Selection method:
- **Amra**: Sequential (`tipIdx++`, wraps around)
- **Others**: Random (`Math.floor(Math.random() * tips.length)`)

---

## Toast Notification

| Property | Value |
|----------|-------|
| Position | Top center, fixed |
| z-index | 200 (above loading overlay) |
| Style | Pill shape, dark background, light text |
| Message | `"Dashboard refreshed"` |
| Duration | 2.2s auto-dismiss |
| Animation | Fade in + slide down from -10px |

---

## CSS Classes

### Loading Overlay

```css
.loading-screen {
  position: fixed;        /* or absolute in amra-orbit */
  inset: 0;
  z-index: 80-100;
  background: var(--paper-white);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  padding: 32px;
}
.loading-screen.show,    /* amra-orbit */
.loading-screen.open {   /* all others */
  opacity: 1;
  pointer-events: auto;
}
```

### Pulse Animation

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.08); opacity: 0.9; }
}
```

### Spinner Animation

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Indeterminate Bar Animation

```css
@keyframes load {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
```

---

## JavaScript Pattern

### Amra (simple)

```javascript
document.getElementById('refreshBtn').addEventListener('click', function() {
  var ls = document.getElementById('loadingScreen');
  var tip = document.getElementById('lsTip');
  tip.textContent = TIPS[tipIdx % TIPS.length];
  tipIdx++;
  ls.classList.add('show');
  setTimeout(function() {
    ls.classList.remove('show');
    showToast('Dashboard refreshed');
  }, 2200);
});
```

### Others (deterministic progress)

```javascript
document.getElementById('refreshBtn').addEventListener('click', function() {
  closeOverlays();
  var ls = document.getElementById('loadingScreen');
  var fill = document.getElementById('lsFill');
  var tip = document.getElementById('lsTip');
  var prog = document.getElementById('lsProgress');
  tip.textContent = tips[Math.floor(Math.random() * tips.length)];
  ls.classList.add('open');
  var p = 0;
  var iv = setInterval(function() {
    p += Math.floor(Math.random() * 18) + 6;
    if (p >= 100) {
      p = 100;
      clearInterval(iv);
      setTimeout(function() { ls.classList.remove('open'); }, 350);
    }
    fill.style.width = p + '%';
    prog.textContent = p + '%';
  }, 140);
});
```

---

## Variant Summary

| File | Mark Style | Progress Mode | Grid BG | Pulse |
|------|-----------|---------------|---------|-------|
| amra-orbit | Gradient square + refresh SVG | Indeterminate | No | No |
| backlight-vellum | "BD" text square | Deterministic % | No | No |
| clyde-vault | Gradient orb circle | Deterministic % | No | Yes (2.2s) |
| getanchor-cream | "BD" text square | Deterministic % | No | No |
| operate-herbarium | "BD" text square | Deterministic % | No | No |
| ready-linen | "BD" text square | Deterministic % | No | No |
| sequence-blueprint | Accent radial circle | Deterministic % | Yes (grid lines) | Yes (2s) |
| slash-vault | "BD" text square | Deterministic % | No | No |
| together-glacier | "BD" text square | Deterministic % | No | No |
| trunk-controlroom | "BD" text square | Deterministic % | No | No |

---

## Design Recommendations for New Loading States

1. **Always show a tip** — fills the wait time with useful product knowledge.
2. **Use deterministic progress** over indeterminate — users perceive it as faster.
3. **Keep duration under 2.5s** — longer feels broken, shorter feels fake.
4. **Fade transition** — never hard-cut; use `opacity 0.25–0.3s`.
5. **Close overlays first** — prevent z-index conflicts with sidebar/AI/FAB.
6. **Toast confirmation** — user needs feedback that refresh completed.
7. **Respect reduced motion** — disable `pulse` and `spin` animations when `prefers-reduced-motion: reduce`.
