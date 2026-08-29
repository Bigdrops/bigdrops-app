# Interaction Model — Platform-Idiomatic, Brand-Forward

> Status: Established — Locked
> Last updated: 2026-08-28
> Implements: `00-index.md:00` locked decisions (slate-navy palette, bottom nav on tablet, no glassmorphism)
> Stack: shadcn (Radix) + `vaul` for sheets. **NOT Material 3 / NOT Material You.**

---

## 0. Principle

BIGDROPS wears **its own slate-navy visual identity** while behaving like an Android-native app feels. Visuals come from `03-design-system.md` (Manrope/DM Mono, 18px cards, `var(--shadow)`); *behaviour* follows Android conventions. This is **not** a stock Material surface with BIGDROPS colour swapped in — it is BIGDROPS' brand rendered with platform-expected interaction.

Explicitly: **no Material 3, no Material You** framing, tokens, or terminology (no `md-sys-*`, no dynamic colour, no Material motion spec). The reference is "platform-idiomatic" on top of the project's existing shadcn foundation.

---

## 1. Ripple Feedback

| Property | Spec |
|----------|------|
| Trigger | Every tappable surface (buttons, rows, tabs, sheet actions, drawer rows) |
| Visual | Ink ripple emanating from tap point, confined to element `border-radius`, `color-mix(in srgb, var(--ink) 10%, transparent)` |
| Fallback | If ripple is not yet implemented, `active:scale(0.965)` + background `var(--surface-muted)` change is acceptable interim — see `05-navigation-shell.md:05` (already spec'd `button:active { transform: scale(.965) }`) |
| Duration | 300–400ms, respects `prefers-reduced-motion` → instant background change only |
| Implementation | CSS/CSS-in-JS ripple or `vaul`-adjacent utility; no new colour tokens |

Cross-ref: `03-design-system.md:03` does not yet define ripple — this section is the sole source until implemented.

---

## 2. Bottom Sheets as Default Overlay

| Property | Spec |
|----------|------|
| Library | `vaul` (`Drawer` primitive) — project already uses shadcn `sheet.tsx` on Radix Dialog; `vaul` replaces bottom-sheet cases for native swipe-to-dismiss |
| Default overlay | **Bottom sheet** (`05-navigation-shell.md:05` — `max-height 78%`, `24px 24px 0 0`, `translateY(106%)` ↔ `0`, `0.3s cubic-bezier(.2,.9,.24,1)`) |
| Behaviour | Drag handle (34×3px, `var(--surface-strong)`) — drag down to dismiss, velocity-aware snap, scrim `rgba(14,12,10,.38)` + `blur(2px)` behind |
| When sheet becomes panel | Foldable expanded / tablet side-by-side and desktop: sheet may render as inline panel or side panel (`02-mobile-first-model.md:02` tablet expanded behaviour) — same `vaul` content, different container |
| a11y | `vaul` handles focus trap, `aria-modal`, and body scroll lock |

All sheets listed in `05-navigation-shell.md:05` (Notification, AI, Theme, Actions, Sales, More) use this pattern. Do not introduce a second overlay library.

---

## 3. Predictive Back / Hardware Back Handling

| Platform | Behaviour |
|----------|-----------|
| Android 14+ predictive back | Sheet/drawer/search intercept `Back` — shows preview of underlying page (scale + dim) while finger drags, commits on release, cancels on return. Uses platform `predictiveBack` gesture if available via Capacitor. |
| Android hardware back (all) | Stack: `search > drawer > sheet > page` — each Back pops one layer, never exits app unless at root `Home` with no overlay. Must be tested on physical device with `Capacitor` back handler (`src/lib/native/capacitor.ts` pattern). |
| iOS swipe-back | Not required for this model — iOS uses drawer/sheet swipe; browser history swipe remains browser-native. |
| Fallback | `Escape` key closes same stack on desktop (already spec'd `mobile-dashboard-v6.html:347` `Escape` handler). |

State: deferred in AI section (`13-ai-integration.md` untouched per task) — this section does not change queue/gateway decisions.

---

## 4. Edge-to-Edge with System Bar Insets

| Property | Spec |
|----------|------|
| Mode | Edge-to-edge — content draws behind status bar and navigation bar; system bars are transparent/translucent, not solid |
| Top | `env(safe-area-inset-top)` on `Top Bar` (`03-design-system.md:03` — `58px + safe-area-inset-top`) and `padding-top: env(safe-area-inset-top)` on `Scroll Area` |
| Bottom | `env(safe-area-inset-bottom)` on `Bottom Nav` (`max(8px, env(...))`) and `FAB` (`calc(82px + env(...))`) and sheets (`16px + env(...)`) — already spec'd in `05-navigation-shell.md:05` |
| Left/Right | `env(safe-area-inset-left/right)` on foldable hinge gutter (`02-mobile-first-model.md:02` safe areas table) |
| Implementation | CSS `env()` only — never hardcode inset values. Capacitor status bar handled in `12-capacitor-native.md` (do not duplicate — cross-ref). |
| Dark mode | Status-bar `theme-color` follows `var(--primary)`; dark uses `var(--primary)` bright variant — already handled in mockup `setTheme()` meta update |

This section restates inset usage for interaction completeness; the normative inset spec remains `12-capacitor-native.md` + `02-mobile-first-model.md:02` safe-areas table.

---

## 5. Elevation via Shadow Layering (not blur)

| Token | Value | Usage | Reference |
|-------|-------|-------|-----------|
| `--shadow` | `0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)` | Cards, sheets | `03-design-system.md:03` |
| `--shadow-float` | `0 18px 40px color-mix(in srgb, var(--primary) 18%, transparent), 0 3px 9px rgba(15,23,42,.07)` | Bottom nav, FAB, drawer | `03-design-system.md:03` |
| Dark shadows | Pure black `rgba(0,0,0,.24)` with higher opacity | Dark mode override | `03-design-system.md:03` |

**Rule:** Elevation is communicated by `box-shadow` + solid/near-solid `var(--nav)` / `var(--surface)` backgrounds. `backdrop-filter: blur()` is **not** used for elevation (removed from bottom nav per `00-index.md:00` locked decision and `05-navigation-shell.md:05` rev). Overlap with `03-design-system.md:03` is intentional — that file owns the token values; this file owns the *behavioural* rule that blur is not the elevation mechanism.

Do not add Material elevation levels (0–5) — use the two tokens above only.

---

## 6. Snackbars (not toasts-as-snackbars)

| Property | Spec |
|----------|------|
| Component | Snackbar — distinct from `Toast` (`06-component-patterns.md:06` toast at top-center, `var(--ink)` bg) |
| Position | Bottom-center, **above** bottom nav + FAB, `bottom: calc(78px + env(safe-area-inset-bottom))`; desktop: bottom-left of content area |
| Duration | 4–6s with action, 2–3s without; swipe-to-dismiss on mobile |
| Content | 1 line text (14px) + optional 1 action (`Undo`, `View`, `Retry`) — no multiline |
| Behaviour | Queues: one snackbar at a time; new snackbar replaces current (no stacking). Does not block interaction beneath. `aria-live="polite"` |
| Visual | `var(--ink)` background, `var(--bg)` text, `14px` radius — same palette as toast but positioned as Android Snackbar, not iOS toast |

Existing toast (`mobile-dashboard-v6.html:347` 1.9s top toast) remains for ephemeral confirmations; snackbar is for actions requiring recovery. Do not conflate.

---

## 7. What This Is Not

- **Not Material 3:** No M3 colour roles, typography scale, or motion spec. Colours are `04-theme-system.md` slate-navy tokens only.
- **Not Material You:** No dynamic colour extraction, no user wallpaper theming, no tonal palettes.
- **Not iOS Human Interface:** Ripples and bottom sheets follow Android conventions; iOS still gets correct safe-area handling but not iOS-specific sheet detents.
- **Not a visual redesign:** All visuals remain `03`/`04`/`06` — this section only adds interaction behaviour.

---

## 8. Implementation Notes

- `vaul` is the only new library implied. `shadcn` `sheet.tsx` can coexist for drawer (left) vs `vaul` for bottom sheets — do not replace drawer with `vaul` unless needed.
- All motion respects `prefers-reduced-motion` (`11-accessibility.md`).
- Predictive back requires Android 14+ and Capacitor 6+; gracefully degrades to immediate dismiss on older OS — do not polyfill the preview.
- Edge-to-edge requires `capacitor.config.ts` `android.statusBarOverlaysWebView` / `ios.contentInset` coordination — see `12-capacitor-native.md` for native side.

---

## 9. Traceability to Prompt Objectives

| Prompt item | Covered here | Also in |
|-------------|--------------|---------|
| Ripple | §1 | — |
| Bottom sheets (`vaul`) | §2 | `05-navigation-shell.md` sheets table |
| Predictive/hardware back | §3 | — |
| Edge-to-edge insets | §4 | `02` safe areas, `12` native |
| Elevation (shadow) | §5 | `03-design-system.md` tokens |
| Snackbars | §6 | `06` toast (contrast) |
| NOT Material 3/You | §7 | This file header |

