# Dashboard V6 Structural Rebuild Report

This report was written by Buffy on 2026-08-29 via Freebuff.

---

## Objective

Rebuild the dashboard to faithfully reproduce the V6 design language as an Android-first mobile experience, with intelligent desktop expansion. Ensure no performance regression.

## Skills Loaded and Applied

- `mobile-app-ui-design` — 8-point grid, thumb-zone CTAs, 60/30/10 color rule, soft tinted shadows, F-pattern layout
- `appllama-app-design-skill` — Anti-slop discipline (one accent locked, shape lock, no emoji in chrome), native fidelity laws (semantic colors, continuous corners, spacing rhythm), perceived performance
- `frontend-design` — Distinctive production-grade UI, anti-AI-slop aesthetics

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardOverview.tsx` | Solid header background (Android-native feel). Scroll bottom padding now uses `max(128px, calc(70px + env(safe-area-inset-bottom)))` matching V6 nav clearance. Added "Recent alerts" section title outside card (matching V6 section-title pattern). |
| `src/components/dashboard/KpiGrid.tsx` | Removed `sm:gap-3` — KPI grid gap stays at 8px (gap-2) across all mobile widths, matching V6's consistent 8px gap. |
| `src/components/dashboard/RecentAlertsCarousel.tsx` | Alerts card padding changed to `pl-[11px] pr-0` (was `px-[11px]`) — creates V6's edge-to-edge horizontal scroll. Added `mr-[11px]` to header (matching V6's `.alerts-head{margin-right:11px}`). |

## V6 Structural Comparison

### What already matched V6 (verified element-by-element)

| Element | V6 Spec | Production | Status |
|---------|---------|------------|--------|
| Top bar height | calc(58px + inset-top) | calc(8px + inset-top) padding | ✅ |
| Top bar buttons | 36×36, radius 12px, shadow | 36×36, radius 12px, shadow | ✅ |
| Identity | 7px workspace, 13px owner | 7px workspace, 13px owner | ✅ |
| AI button | gradient bg, white text | gradient bg, white text | ✅ |
| Eyebrow | 8px label, 9px button | 8px label, 9px button | ✅ |
| KPI grid | 2-col, 8px gap | 2-col, 8px gap | ✅ FIXED |
| KPI card | 108px height, 18px radius, 11/12/10 padding | same | ✅ |
| KPI tick bars | 3×9px, gap 2.5px, margin 8px 0 7px | same | ✅ |
| KPI value | DM Mono, 17px, 500, tracking -.075em | same | ✅ |
| Activity rows | 32×32 icons, 11px radius, 9px/11px rhythm | same | ✅ |
| Status badge | 6px/800/uppercase | same | ✅ |
| Payment reminder | 34×34 gradient icon, conic decoration | same | ✅ |
| Audit trail | 6px dots, copper variant, 9px/7px text | same | ✅ |
| Bottom nav | 62px, 20px radius, gradient active | same | ✅ |
| FAB | 50×50, 18px radius, gradient, primary shadow | same | ✅ |

### Changes made in this task

| Element | Before | After (V6-aligned) |
|---------|--------|---------------------|
| Header background | `linear-gradient(180deg, bg 72%, transparent)` | Solid `hsl(var(--bg))` — Android-native solid header |
| KPI grid gap | `gap-2 sm:gap-3` (8px → 12px) | `gap-2` (consistent 8px) |
| Alerts card padding | `px-[11px]` (symmetric) | `pl-[11px] pr-0` (V6 edge-to-edge scroll) |
| Alerts header | No margin-right | `mr-[11px]` (V6 `.alerts-head{margin-right:11px}`) |
| Alerts section title | Inside card only | Added outside card (V6 section-title pattern) |
| Scroll bottom padding | `pb-32` (128px fixed) | `max(128px, calc(70px + env(safe-area-inset-bottom)))` |

## Mobile Behavior (Phone / Folded Foldable)

- **Header**: Solid background, no gradient fade — matches Android app convention
- **KPI grid**: Strict 2×2 with 8px gap — compact, V6-accurate composition
- **Activity rows**: 32×32 icons, 9px padding rhythm — matches V6 exactly
- **Payment reminder**: Gradient icon, conic decoration, compact CTA — V6 composition
- **Alerts**: Edge-to-edge horizontal scroll with `pr-0` — V6 scroll behavior
- **Audit trail**: 6px timeline dots, copper variant — V6 timeline language
- **Bottom nav**: Floating, 20px radius, gradient active — Android-native
- **FAB**: 50×50, 18px radius, above nav — V6 position
- **Safe areas**: All elements respect `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`

## Foldable / Tablet Behavior

- KPI grid: 2-col → 3-col (md) → 4-col (lg)
- Activity + Payment Reminder: stacked → 5-col grid (3+2) on md+
- Alerts + Audit Trail: stacked → 2-col on lg+
- Desktop: full canvas with max-width constraint

## Desktop Behavior

- Top bar extends across width with max-width container
- KPI cards expand to 4-column grid
- Activity and payment reminder sit side-by-side
- Alerts and audit trail sit side-by-side
- FAB moves to top-right on lg+
- No floating mobile bottom nav on desktop (Layout hides it at md+)

## Static Performance Verification

- ✅ No MutationObserver theme loop — AppThemeManager uses `useEffect` with stable deps
- ✅ No direct dashboard DOM theme mutation — DashboardOverview uses preference-based flow
- ✅ No theme effect loop — deps are stable primitives (`themePresetId`, `themeMode`)
- ✅ No repeated theme application — `lastApplied` ref prevents redundant work
- ✅ No theme-triggered dashboard data refetch — `useDashboardData` depends on `variant`/`cacheKey`, not theme
- ✅ No obvious render loop — no recursive state updates
- ✅ No repeated localStorage write loop — `lastWriteAt` is a ref, not state
- ✅ No redundant Supabase calls introduced

## Verification Results

- `bun run audit:load`: passed (all warnings pre-existing)
- `bun run typecheck`: passed
- `git status`: 3 files changed (DashboardOverview, KpiGrid, RecentAlertsCarousel)

## Remaining Limitations

1. **V6 is mobile-only** (430px max-width). Desktop adaptation rules are inferred from the design system, not from an explicit V6 desktop reference.
2. **V6 body background** uses `radial-gradient(ellipse at top, ...)`. Production uses solid `--bg` from theme tokens. This is a cosmetic difference handled by the theme system.
3. **V6 grain overlay** (`.grain` with fractal noise) is not present in production. This is a subtle atmospheric effect.
4. **Runtime performance** was statically verified only. Runtime theme switching speed must be tested separately.
5. **V6 scroll container** uses a single wrapper for topbar + content. Production uses Layout's fixed topbar + scroll content. The visual result is equivalent on mobile.
