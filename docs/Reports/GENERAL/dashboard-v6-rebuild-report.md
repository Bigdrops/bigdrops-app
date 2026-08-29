# Dashboard V6 Structural Rebuild Report

This report was written by Buffy on 2026-08-30 via Freebuff.

## Objective

Rebuild the production BIGDROPS dashboard to structurally and visually match the approved mobile-first V6 design reference (`mobile-dashboard-v6.html`) while preserving existing business functionality and using the established theme-token architecture.

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/KpiGrid.tsx` | Rebuilt: V6 gradient "collect" card, tick bar segments, decorative circle elements, V6 color coding per metric |
| `src/components/dashboard/DashboardOverview.tsx` | Rebuilt: V6 top bar with workspace label, eyebrow section, V6 activity rows with typed icons and status badges, V6 section spacing |
| `src/components/dashboard/PaymentReminderBanner.tsx` | Rebuilt: V6 gradient icon, decorative corner ring, V6 typography and spacing |
| `src/components/dashboard/RecentAlertsCarousel.tsx` | Rebuilt: V6 horizontal scroll cards, V6 alert card structure, V6 typography |
| `src/components/dashboard/AuditTrailSkeleton.tsx` | Rebuilt from skeleton into actual V6 audit trail with timeline dots and real content |

## V6 Structure Mapping

| V6 Section | Production Component | Status |
|---|---|---|
| Top bar (hamburger, workspace, owner, theme toggle, bell, search, avatar) | `DashboardOverview.tsx` header | Rebuilt |
| Eyebrow ("Finance pulse · Month Year") | `DashboardOverview.tsx` eyebrow | Added |
| Metric grid (2x2, gradient collect card, tick bars, decorative circles) | `KpiGrid.tsx` | Rebuilt |
| Recent activity (typed icons, status badges, amount + date) | `DashboardOverview.tsx` activity section | Rebuilt |
| Payment reminder (gradient icon, corner ring, CTA) | `PaymentReminderBanner.tsx` | Rebuilt |
| Recent alerts (horizontal scroll cards) | `RecentAlertsCarousel.tsx` | Rebuilt |
| Audit trail (timeline dots, descriptions) | `AuditTrailSkeleton.tsx` | Built |
| Bottom nav (5 tabs) | `Layout.tsx` (existing) | Untouched |
| FAB (create button) | `DashboardRedesign.tsx` (existing) | Untouched |
| Drawer (navigation) | `Layout.tsx` MobileSidebar (existing) | Untouched |

## Key V6 Design Elements Implemented

### Top Bar
- Workspace label ("BIGDROPS WORKSPACE") in 7px uppercase above owner name
- 36×36px touch targets with V6 shadow treatment
- Gradient fade background on scroll

### KPI Metric Grid
- "Collect" gradient card (collected this month) with white text
- Tick bar segments (9px tall, 3px wide, rounded) replacing bar chart
- Decorative circle elements (84px + 34px) per V6
- V6 shadow treatment: `0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent)`

### Activity Rows
- Typed icon backgrounds (Invoice=primary-soft, Quotation=secondary-soft, Waybill=sage-soft)
- V6 status badges (Pending=secondary, Draft=primary, Delivered=muted)
- DM Mono font for amounts
- 7px date text below amount

### Payment Reminder
- Gradient icon (34×34px, 12px radius)
- Decorative conic-gradient corner ring
- "Smart banner" kicker, "Evergreen" indicator
- V6 CTA button with gradient

### Recent Alerts
- Horizontal scroll cards (200px wide, 16px radius)
- V6 alert icon (29×29px, 10px radius)
- "Alert" overline, 10px bold title, 8px body
- 7px time + read/unread status

### Audit Trail
- Timeline dots (6×6px) with box-shadow rings
- Primary (blue) and copper (secondary) dot variants
- 9px bold text, 7px meta text

## Theme Compatibility

All colors use semantic CSS custom properties (`hsl(var(--primary))`, `hsl(var(--surface))`, etc.) rather than hardcoded hex values. The dashboard automatically adapts to:
- Slate Navy Light (default)
- Slate Navy Dark / Liquid Onyx
- All additional theme families (Amber Terracotta, Ocean Teal, Rose Gold, Forest Green, Warm Cocoa)

## Preserved Functionality

- KPI data loading and calculation (`useDashboardData`, `buildKpiCards`)
- Recent document loading and navigation
- Payment reminder dismiss state (sessionStorage)
- Alert notification loading and mark-read
- Dark mode toggle with user-scoped persistence
- Mobile sidebar/drawer integration
- FAB create actions
- All existing routing and navigation

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: passed (0 errors)
- `git status`: 5 dashboard files modified, all intended
- No `bun run build` executed (hardware policy)
