# Dashboard KPI Cards Implementation Report

This report was written by ox-alpha on 2026-08-26 via OpenCode.

Skills used: writing-clearly-and-concisely, tailwind-css-patterns, accessibility
Documentation standard: ADS-STE100 Simplified Technical English
Reference: docs/TEMPLATES/htmltemps/wireframe-variants/batch-5/glass-mesh.html (current committed version)

---

## 1. Files Changed

| File | Change |
|---|---|
| `src/config/kpiCards.ts` | NEW — KPI metric registry (9 metrics), selection persistence, 4-card enforcement, view-model builder with real trend and bar calculations |
| `src/components/dashboard/KpiGrid.tsx` | REWRITTEN — Glass Mesh KPI card structure renderer; 2×2 grid; 14-segment barcode bar; non-clickable |
| `src/components/dashboard/DashboardOverview.tsx` | Removed Quick Actions tile section and its props/helpers; removed dead heroStats/summary props; renders 4-card KpiGrid at the old Quick Actions position; removed duplicate standalone KPI section |
| `src/pages/DashboardRedesign.tsx` | Wires `kpiStats` → `buildKpiCards(kpiStats, loadStoredKpiCards())`; drops quickTiles plumbing. FAB untouched |
| `src/hooks/useDashboardData.ts` | Removed dead Tasks code (PriorityItem type, both priority builders, priorityItems state/cache field); added `KpiStats` with real comparison aggregates; `openWork` now equals `pendingFollowUp` |
| `src/lib/cache/dashboardCache.ts` | Cache contract: dropped `priorityItems`, added optional `kpiStats`. Version stays 1 (additive change; old caches read safely) |
| `src/pages/settings/DashboardSettingsSection.tsx` | REWRITTEN — drives KPI selection through the new config; same Sheet-editor UX as before |
| `src/components/settings/DashboardKpiCardsSettings.tsx` | NEW — slot-swap/reorder picker adapted from the proven Quick Tiles selection UI pattern |
| `src/config/quickTiles.js` | Stripped dead tile-persistence exports; kept `QUICK_TILE_REGISTRY` (shared nav) and `getCreateActions` (FAB) |

Note on pre-existing state: `DashboardOverview.tsx` and `DashboardRedesign.tsx` carried uncommitted Tasks-section removal work from another session before this task began. That in-flight removal was completed and built upon, not reverted or duplicated.

## 2. Files Removed

| File | Reason |
|---|---|
| `src/components/settings/DashboardQuickTilesSettings.tsx` | Obsolete Quick Tiles Settings UI, fully replaced by `DashboardKpiCardsSettings.tsx` |
| `src/components/dashboard/DashboardDesktopView.tsx` | Orphaned desktop layout (zero importers since before this task); last file still carrying dead `quickTiles` prop references |

## 3. Files Inspected But Not Changed

`AGENTS.md`; `docs/PROJECTSKILLINDEX.md`; `docs/TEMPLATES/htmltemps/wireframe-variants/batch-5/glass-mesh.html` (KPI CSS lines ~250–331, KPI JS ~1390–1414); `src/hooks/useLayoutMode.ts`; `src/hooks/FoldAwareness.ts`; `src/lib/native/foldAwareness.ts`; `src/lib/formatters/money.ts`; `src/lib/tenantClient.ts`; `src/components/dashboard/AuditTrailSkeleton.tsx`, `PaymentReminderBanner.tsx`, `RecentAlertsCarousel.tsx` (retained sections, untouched).

## 4–5. Grep Sweeps (before / after)

**Tasks sweep** — patterns: `priorityItems`, `onPrioritySelect`, `handlePrioritySelect`, `buildOverviewPriorityItems`, `buildClassicPriorityItems`, `PriorityItem`.

- Before edit: matches confined to `useDashboardData.ts` + `dashboardCache.ts` (the builders, type, state, cache field) plus the in-flight working-tree removals in Overview/Redesign. No component consumed them anymore.
- After edit: **0 matches in `src/`**. All removed code was dashboard-Tasks-only; no shared task infrastructure referenced these identifiers.

**Quick Actions sweep** — patterns: `quickTiles`, `QuickActions`, `DashboardQuickTilesSettings`, `quick_tiles`, `getQuickTiles`, `getVisibleQuickTiles`, `loadStoredQuickTiles`, `saveStoredQuickTiles`, `ALL_QUICK_TILE_IDS`, `DEFAULT_QUICK_TILES`, `onQuickAction`.

- Before edit: matches across Overview, Redesign, both Settings components, `quickTiles.js`, `DashboardDesktopView.tsx`.
- After edit: exactly two surviving references, both legitimate:
  - `src/components/layout/navData.ts` → `QUICK_TILE_REGISTRY` (shared navigation icon/tint source for Sales/More pickers)
  - `src/pages/DashboardRedesign.tsx` → `getCreateActions` (FAB create actions)
- No application code referencing the retired tile grid remains. Historical docs under `docs/` were not treated as application code.

## 6. Quick Actions Infrastructure Deleted

`QUICK_TILE_STORAGE_KEY` ('quick_tiles' localStorage), `QUICK_TILE_COUNT`, `DEFAULT_QUICK_TILES`, `LEGACY_ACTION_DEFAULTS`, `normalizeQuickTiles()`, `loadStoredQuickTiles()`, `saveStoredQuickTiles()`, `getQuickTiles()`, `ALL_QUICK_TILE_IDS`, the dashboard tile-grid JSX and its header/handlers (`onQuickAction`, `getQuickActionHint`, `QuickTile` type), `DashboardQuickTilesSettings.tsx`, and the orphaned `DashboardDesktopView.tsx`.

## 7. Quick Actions Infrastructure Reused for KPIs

The proven pattern — registry object → localStorage key → sanitize/dedupe/top-up/clamp normalization → `loadStored*`/`saveStored*` pair → Settings Sheet with per-slot swap and reorder → dashboard reads on render. Reimplemented under a dedicated namespace (`dashboard_kpi_cards`) rather than reusing the old key, avoiding persistence conflicts with stale `quick_tiles` data. The Settings Sheet editor UX was carried over essentially unchanged.

## 8. FAB / Quick Create Confirmation

Untouched. The FAB button, its anchored popup, Escape/scrim/re-toggle dismissal, width-class handling, and `getCreateActions()` (seven actions, icons, labels, routes) are byte-for-byte preserved; `DEFAULT_CREATE_ACTION_TILES` and `sanitizeQuickTileIds` survive inside `quickTiles.js` solely to serve it. Post-edit sweep confirms `DashboardRedesign.tsx` imports only `getCreateActions`.

## 9. Storage / Persistence Mechanism

Verified mechanism (not assumed): `localStorage` key **`dashboard_kpi_cards`**, value = JSON array of metric ids. Read path: `loadStoredKpiCards()` → parse → `resolveKpiSelection()`; any failure (missing key, non-array, corrupt JSON) deterministically returns `[...DEFAULT_KPI_METRIC_IDS]`. Write path: `saveStoredKpiCards()` normalizes through the same resolver before persisting, so an invalid array can never be stored. This mirrors the verified existing Quick Actions mechanism (which did use localStorage — confirmed against `quickTiles.js`, not assumed).

## 10. Four-Metric Enforcement Mechanism

Single choke point: `resolveKpiSelection()` — (a) drop unknown ids via registry check, (b) dedupe, (c) top up from `DEFAULT_KPI_METRIC_IDS` until length 4, (d) slice to 4. Both load and save route through it, and `buildKpiCards()` runs it again defensively before rendering. `KpiGrid` additionally clamps to `KPI_CARD_COUNT`. Fewer-than-4 and more-than-4 states are unreachable.

## 11. Default Four Metrics and Rationale

`['thisMonthCollections', 'overdue', 'awaitingPaymentCount', 'dueThisWeek']`

Chosen after inspecting the live data layer and the reference intent (Balance / Overdue / Invoices / Payments):

- **Collected This Month** ≈ reference "Payments": money-in momentum; one of only two metrics with a legitimately derivable prior-period baseline.
- **Overdue Balance**: direct match to reference "Overdue"; primary risk signal.
- **Awaiting Payment** ≈ reference "Invoices pending review": collection workload count.
- **Due This Week**: forward-looking receivables; second trend-capable metric (like-for-like weekly windows).

All four compute from the full-table `invoice_financials_v` result set, not limit-truncated lists.

## 12. All Nine Available Metrics

`collections`, `openWork`, `awaitingPaymentCount`, `inTransitWaybills`, `overdue`, `pastDue`, `dueThisWeek`, `thisMonthCollections`, `pendingFollowUp` — verified identical to the fields currently produced by `useDashboardData()` (`heroStats` ∪ `summary`). Note: `collections`≡`thisMonthCollections` and `pastDue`≡`overdue` by construction (pre-existing aliases), retained as separately selectable ids per requirement.

## 13. Primary-Value Calculations (selected defaults)

- **Collected This Month**: Σ `cash_received` over rows where `issue_date ≥ startOfMonth` (existing reduction, unchanged).
- **Overdue Balance**: Σ `balance_due` where due date < today and balance > 0 (existing `isPastDue` logic, unchanged).
- **Awaiting Payment**: count of financial rows with `balance_due > 0` (unchanged).
- **Due This Week**: Σ `balance_due` with `now ≤ due_date ≤ now+7d`, balance > 0 (unchanged).

## 14. Trend Calculations and Comparison Periods

- **Collected This Month**: current period = month-to-date Σ `cash_received` (issue-date basis, matching the existing metric's semantics). Comparison = same measure over the previous calendar month (`computeKpiAggregates`). Display: signed whole-percent vs last month; up = green, down = red (good polarity). New aggregation; reuses the same unbounded result set — no extra query.
- **Due This Week**: current window = balance due within the next 7 days. Comparison = balance whose due date fell in the prior 7-day window (`dueLastWeekWindow`, new aggregate). Direction shown with neutral polarity (no good/bad coloring) because "more due soon" is informational, not positive/negative.
- **Overdue Balance / Awaiting Payment**: point-in-time metrics. No snapshot history exists anywhere in the data model (`invoice_financials_v` exposes current state only), so no honest baseline is derivable. They render the neutral trend state: minus glyph + "No comparison period". Nothing fabricated.

## 15. Ten/Fourteen-Segment Bar Calculations

Discrepancy reported: this prompt specifies a 10-segment bar, but the current committed Glass Mesh file (commit `b57cf47e`, "dashboard IA") uses a barcode-style bar of **14 fixed 3px segments** with unfilled segments dimmed to 50% opacity. Per your instruction that the current version is preferred, the implementation follows the file. Segment count lives in one constant, `KPI_BAR_SEGMENTS = 14`, trivially changeable if the older count is ever wanted back.

Bar fill per metric (`filled = round(ratio × 14)`, ratio clamped [0,1]):

| Metric | Ratio (real inputs) |
|---|---|
| Collected This Month / Collections | MTD collections ÷ (MTD + previous-month collections) — momentum share of trailing two months |
| Overdue / Past Due | overdue balance ÷ total outstanding balance |
| Due This Week | due-this-week ÷ total outstanding balance |
| Awaiting Payment | unpaid invoices ÷ all invoice-financial rows |
| Open Work / Pending Follow-up | pendingFollowUp ÷ awaitingPaymentCount |
| Waybills In Transit | dispatched ÷ total waybills (exact head-counts — see below) |

Every denominator comes from real data. Waybill ratios use two new exact head-count queries (`count: 'exact', head: true`) because the recent-waybills query is limit-truncated and would yield misleading proportions. Each card exposes its bar meaning as an accessible label (`role="img"` aria-label) instead of presenting a decorative strip.

## 16. Zero-Baseline / Unavailable Data Behavior

- Trend with missing or ≤0 baseline → `percentChange` returns null → neutral row ("No comparison period"). Never Infinity/NaN.
- Bar with zero/negative denominator → `safeRatio` returns 0 → empty bar (all segments dimmed). Honest "nothing yet" state, never random or static fills.
- Loading state → four skeleton cards with the same composition.

## 17. No Demo Values Copied

Confirmed. No `+12%`, `-2`, `56,000`, `10,000`, segment counts like 9/14, or any Glass Mesh JS literal appears in production code. All rendered numbers derive from `useDashboardData()` outputs.

## 18. Layout Confirmation

Exactly 4 cards, CSS grid `grid-cols-2 gap-3` (= reference 1fr 1fr, 12px gap). Card = flex column, gap 8px, 16px padding, border, radius, shadow; label 11px bold uppercase tracked muted; value 24px extrabold tight; barcode bar (gap 2px, height 12px, 3px segments, filled tone / dim unfilled); trend row 11px with colored direction span then context text. Responsive: 2×2 holds at all widths; fold behavior unchanged (viewport-driven classes only, no new abstraction).

## 19. Non-Interactive Confirmation

Cards are `<article>` elements. No onClick, no role="button", no tabIndex, no href, no cursor affordance, no hover lift (reference hover was decorative for its demo interactivity). The bar carries `role="img"` + aria-label describing its business meaning.

## 20. Old 9-Card Implementation Gone

Confirmed. `KpiGrid.tsx` fully rewritten; the 4-hero + 5-summary stacked grids, gradient tones, and hint texts no longer exist. Only the selected definitions reach the renderer (`buildKpiCards` output length 4); there is no hidden-by-CSS rendering of the other five.

## 21. Data-Layer Change Rationale

`useDashboardData.ts` changed because the requirement (real trends + meaningful bars) is impossible from the nine raw values alone:

1. Added aggregates (`prevMonthCollections`, `outstandingTotal`, `dueLastWeekWindow`, `totalFinancialRows`) computed from the already-fetched unbounded `invoice_financials_v` rows — zero additional queries for these.
2. Added two exact waybill head-count queries — necessary because truncated lists cannot produce honest ratios.
3. Removed dead Tasks builders/state/cache field (mandated cleanup; `openWork` now = `pendingFollowUp`, which equals its previous effective value whenever no synthetic reminders existed — the common case; documented semantic simplification).
4. `dashboardCache.ts`: additive optional `kpiStats`, removed `priorityItems`. Old cached payloads remain readable.

No competing data system, no duplicated queries, no unrelated aggregation rewritten. Existing metrics and consumers (`heroStats`, `summary`, `recentDocs`, `recentProjects`) preserved.

## 22–23. Verification Results

- `bun run typecheck`: **passed** (clean `tsc --noEmit`; run twice — after main edits and after final deletion)
- `bun run build`: **NOT run**, per instruction
- Final git status scope: exactly the 9 modified/deleted files listed above + 2 new files (`kpiCards.ts`, `DashboardKpiCardsSettings.tsx`). Nothing else touched.

## 24. Remaining Risks / Product Decisions

1. **Segment-count discrepancy resolved by instruction** ("current one is preferred" = 14). If the 10-segment variant is ever wanted, change `KPI_BAR_SEGMENTS` in `kpiCards.ts`.
2. **Alias metrics**: `collections`/`thisMonthCollections` and `pastDue`/`overdue` are selectable duplicates by value. Kept per spec; product may want to collapse them later.
3. **Neutral-trend wording**: "No comparison period" is honest but plain; copy can be tuned later without logic changes.
4. **`collections` momentum-bar semantics** (share of trailing-two-month volume) is a defensible derived meaning, not a business-declared target. If BIGDROPS later defines collection targets, the bar function should switch to target progress.
5. Point-in-time metrics show no trend by design; adding historical snapshots would be required to change this.
