# BOQ View Page Candidates V4 Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Create BOQ View Page design direction V4 as two new files. V4 is a third
information architecture. It abandons the V3 ledger concept in full. It
treats V2 as the quality floor, not the template.

## Scope

Two new standalone HTML files plus this report. No production code
changed. No database change. V1, V2, V3, BOQ form candidates, and the
Invoice implementation stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.html` (new)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-desktop-v4.html` (new)
- `docs/reports/boq/boq-view-candidate-v4-2026-09-29.md` (new, this file)

## Skills used

html-prototype, design-artifact, mobile-app-ui-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Standards audited

- `AGENTS.md` — Bun only, no build as verification, concurrent-agent
  safety, financial source of truth, PDF-as-renderer, report rules.
- `docs/standard/fab-standard.md` v1.1 — 50x50 rounded-18 container,
  custom AB Download Manager SVG icon, ambient float on a wrapper
  (4s, disabled under reduced motion), clearance above bottom nav,
  mobile bottom calc(88px + safe-area), z-50, one primary FAB per view.
- `docs/standard/document-transformation-standard.md` — Convert to
  Quotation stays a sheet action, not an inline strip.
- `docs/standard/document-image-upload-policy.md` — upload validation
  only. It governs pickers, not read-only rendering.

## References studied

- V2 files: `boq-view-candidate-mobile-fold-v2.html`,
  `boq-view-candidate-desktop-v2.html`, and report
  `docs/reports/boq/boq-view-candidate-v2-2026-09-29.md`.
- V3 files: `boq-view-candidate-mobile-fold-v3.html`,
  `boq-view-candidate-desktop-v3.html`, and report
  `docs/reports/boq/boq-view-candidate-v3-2026-09-29.md`.
- `src/components/layout/MobileBottomNav.tsx` — fixed geometry:
  left/right 10px, bottom max(8px, safe-area), 62px tall, 5 tabs,
  Sales active (BOQ lives under Sales), z-40.
- `src/components/document-view/shared/FloatingDownloadButton.tsx` —
  exact AB download icon path, reused verbatim in the mobile candidate.
- `src/domain/boq/calculateBoqTotals.ts` — locked model: total cost =
  SUM(cp x qty), total selling = SUM(sp x qty), profit = selling −
  cost. No VAT, no WHT, no discount.
- Invoice view conventions (behavior only): brand fallback, read-only
  thumbnails, totals with words, sectioned More sheet, two-stage
  download feedback, Web Share with fallback.

## V3 ideas rejected

1. Ledger/spreadsheet visual metaphor.
2. Graph-paper / blueprint / technical-cell background.
3. Sticky commercial strip beneath the masthead.
4. Horizontally scrolling group jump chips.
5. Stacked horizontal navigation and information bands.
6. Persistent commercial chrome consuming viewport height.
7. Items as ledger rows.
8. Heavy mono/technical treatment of the full document.
9. Cold worksheet aesthetic.

No V3 idea was improved. The concept was removed in full.

## V2 qualities retained (structure not copied)

Hierarchy, separation between chrome and content, visual calm, clear
surfaces, strong document identity, easy scanning, polished
application feel, low interference with BOQ content. None of V2's
structure returns: no hero card, no metadata block grid, no
commercial band, no field-grid item cards, no action strip, no dark
group envelopes.

## V4 information architecture

V4 is a compact dossier with inline commercial disclosure. One merged
app bar carries back, number, status, share, and more. One dossier
row carries the company monogram, the title, the client line, and
Edit. One static context line carries date, validity, and item count,
with a disclosure for the rest. One collapsible capsule carries the
commercial outcome. Editorial chapter dividers carry groups.
Description-first specimen entries carry items. A signed completion
card closes the schedule. The reader meets the first item within one
short scroll. Nothing persists except the app bar, the bottom nav,
and the Download FAB.

## Difference from V2

V2 stacks hero card, metadata blocks, commercial band, item cards,
and an action strip. V4 has none of these. Identity is one dossier
row, not a hero plus brand block. Context is one line plus a
disclosure, not a block grid. Commercial is one collapsible capsule,
not a band. Items are description-first entries with cost behind a
disclosure, not field-grid cards. Actions have no strip; Edit is
inline and the rest live in the sheet.

## Difference from V3

V3 pins a black commercial strip under the masthead, adds a chip
rail, and renders ledger rows on a technical grid. V4 has no sticky
commercial element, no chip rail, no grid background, and no ledger
rows. Commercial lives in a collapsed one-line capsule. Groups are
editorial chapters, not navigational landmarks. Items lead with
description type, not mono figures.

## Mobile opening composition

Row 1 (sticky app bar, 56px): back, BOQ-2026-0142, Approved pill,
share, more. Row 2 (dossier): 44px AK monogram, title, client line,
Edit button. Row 3: one context line plus Document details
disclosure. Row 4: commercial capsule, collapsed to one line. The
first chapter divider and item 1 follow immediately.

## Item architecture

Specimen entry: marginal index (01–05), description in strong type,
specification second, make/quantity caption third, one right-aligned
selling line-total with a small profit delta. A "Cost & margin"
disclosure reveals CP math per item. Photo items place a full-bleed
16/9 figure above the text. No-photo items emit zero photo markup.

## Group architecture

Editorial chapter divider: oversized ghost letter, chapter title,
item count, right-aligned chapter subtotal with a "chapter total"
caption. Static and in-flow. Chapter subtotals derive from the same
locked formulas (A: ₦5,377,000 on 3 items; B: ₦1,860,000 on 2 items).

## Commercial-summary architecture

One compact capsule in flow. Collapsed: "Selling total ₦7,237,000"
plus a "14.9% margin" pill. Expanded: total cost and gross profit
rows plus the model hint. Never sticky. Desktop moves the same
content into a "Commercial position" rail card; the close-out card
carries the formal totals in both files.

## Photo behavior

Item 1 carries a deliberate simulated site photo (inline SVG duotone
study: rebar lattice over hardcore bed, captioned "Site reference
photo"). Tap opens a read-only lightbox with caption. Items 2–5
carry no image markup and reserve zero space. Production renders the
stored imageUrl in the same slot.

## Action hierarchy

Edit is inline in the dossier head (mobile) and top bar (desktop).
Download is the FAB (mobile, standard v1.1) and a primary button
(desktop). Share sits in the bar. Convert to Quotation, Duplicate,
Export CSV, status toggle, Archive, and Delete live in a sectioned
More sheet with a danger zone and two-tap confirm on destructive
actions. No action appears on two surfaces at once.

## Bottom-nav simulation

Mobile candidate renders a fixed bottom nav with MobileBottomNav
geometry: left/right 10px, bottom max(8px, safe-area), 62px tall,
5 tabs with 17px icons, Sales active, z-40. Tabs show demo toasts.
Document-end padding (200px + safe-area) keeps the close-out above
the nav and FAB.

## Download FAB compliance

Wrapper carries the 4s ambient float (disabled under reduced
motion). Button is 50x50, radius 18px, primary background, exact AB
DownloadIcon path at 22px (matches FloatingDownloadButton
size={22}), fixed right 16px, bottom calc(88px + safe-area), z-50,
accessible name "Download PDF". Two-stage toast mirrors
download:start/success. Desktop uses a top-bar Download button and
no FAB, per the task allowance.

## Desktop architecture

Reading room: sticky slim top bar with back, number, status, Edit,
Download, share, theme, and more. Main column holds the dossier
block, chapter dividers, specimen entries (photo docks right at a
fixed 260px column instead of full-bleed), and the signed close-out.
Sticky context rail holds the commercial position card, document
facts, chapter index with anchor links, and quick actions. No FAB,
no bottom nav. Below 960px the rail stacks under the main column.

## Locked-math verification

Sample model (verified with bun): cost ₦6,158,090, selling
₦7,237,000, profit ₦1,078,910, margin 14.91% (shown as 14.9%).
Line math: item 1 (140 m³ × 17,500/20,500) = 2,450,000/2,870,000;
item 2 (8 ton × 160,000/189,000) = 1,280,000/1,512,000; item 3
(50 m³ × 17,200/19,900) = 860,000/995,000; item 4 (200 m² ×
4,700/5,500) = 940,000/1,100,000; item 5 (10 set × 62,809/76,000) =
628,090/760,000. All figures render from these formulas in script
from a single item array, so display cannot drift from the model.
Amount in words covers the ₦7,237,000 selling total.

## Verification

- `git status` before work: captured. Pre-existing modifications and
  untracked files recorded as belonging to other agents. Untouched.
- `git diff --check`: passed (exit 0, whitespace clean).
- New files: only the two V4 HTML files plus this report.
- V2 files: no diff. Untouched.
- V3 files: no diff. Untouched.
- Production source (`src/`, `supabase/`): no diff. Untouched.
- BOQ form candidates: untouched.
- No grid/graph-paper/ledger background in V4: confirmed by search
  (only comment text mentions the rejected pattern).
- No sticky commercial element in V4: confirmed (sticky appears only
  on the app bar / desktop top bar and the desktop context rail).
- No horizontal group-chip navigation in V4: confirmed.
- Mobile bottom nav present with true geometry: confirmed.
- FAB conforms to fab-standard v1.1: confirmed.
- End clearance accounts for FAB + nav + safe area: confirmed
  (200px + safe-area end padding).
- One photo-present item: confirmed (item 1, both files).
- Photo-absent items reserve zero footprint: confirmed (no markup).
- Commercial math matches locked model: confirmed (bun check above).
- `bun run build`, typecheck, lint, Playwright, screenshots,
  Supabase commands: not run. Excluded by the task. Human visual
  review is authoritative.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- No browser render was run. A human must review pixels: capsule
  density, chapter divider weight, specimen entry rhythm, photo
  simulation tone, FAB clearance at 360–430px widths, fold split,
  desktop rail balance, dark-mode surfaces.
- Action toasts name real actions without persistence. Export CSV
  builds a real client-side extract.
- Sample company, client, and item data is fictional. The photo is a
  simulation, not a real site photograph.
- Desktop keeps a sticky context rail with a commercial position
  card. This is document context beside the schedule, not a pinned
  strip under the header, but the human should confirm it does not
  read as persistent commercial chrome.
- Margin shows 14.9% (truncated to one decimal from 14.91%).
  Confirm the project rule for margin display precision.

## Deferred work

- Human visual acceptance of V4 against V2 and V3 side by side.
- Production React implementation after design acceptance.
- Real item photography replacing the simulated photo.
- Decision on margin display precision and on CP visibility by role.
- Decision on whether Approved locks Edit and Convert.
