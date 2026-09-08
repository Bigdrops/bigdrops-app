# Client Detail Structural Renovation Proposal

This report was written by Muse Spark on 2026-09-08 via OpenCode.

Status: Proposal only. No source code changed. Implementation needs approval.

Skills used: mobile-app-ui-design, mobile-android-design, shadcn,
tailwind-capacitor, material-3.

Documentation standard: ASD-STE100 Simplified Technical English.

---

## Current Architecture

- Route: `/clients/:id`. Entry points: Clients list rows and overflow
  actions, GlobalSearch client results, client entity notifications.
- `src/pages/ClientDetail.tsx` owns all data loading (overview bundle plus
  lazy per-tab loaders with request guards). Logic stays. Only the
  composition changes.
- Composition today: `Layout` shell, sticky `ClientActionHeader` (back,
  title, edit, plus 5 quick-create pills), 6-tab bar (Overview, Projects,
  Invoices, Quotations, CSRs, Waybills), tab panels.
- `ClientOverviewTab`: identity block, 4 metric cards, 2-column grid
  (Recent Streams list plus Contact and Account aside), overdue callout.
- `ClientDocumentsTab` and `ClientProjectsTab`: per-type record lists with
  empty states. Loading uses skeletons plus spinner. Errors use token
  danger boxes.

## Current UX Problems

- The quick-create pill row duplicates what the tab bar already implies
  (Invoices, Quotations, CSRs, Waybills appear as both pills and tabs).
  Two competing navigations sit stacked at the top.
- Overview repeats tab content. Recent Streams duplicates the per-type tabs.
  The user meets the same records twice with no added value.
- Four metric cards give equal weight to four numbers of unequal
  importance. Activity Count is metadata, not a decision input.
- Contact and Account sits in a sidebar aside. On phones it drops to the
  bottom, below all streams, although contact actions are high frequency.
- No delete action exists on the page. Lifecycle management hides
  elsewhere, so the page cannot answer "remove this client".
- Row chevrons were 16px targets before the last pass. Fixed then, but the
  fix proves the rows were built desktop-first.

## Structural Problems

- Tabs hide primary content. Overdue invoices, the highest-value signal,
  live only on Overview. A user opening the Invoices tab never sees the
  overdue callout or the financial position.
- The header answers navigation (back, edit, create) but not identity.
  The client name sits far below the sticky bar, so scrolling loses
  context of whose page this is.
- Metric cards are implementation primitives, not hierarchy. The grid
  shape drives the design instead of user tasks.
- Streams mix five record types in one chronology with no grouping. Scan
  speed for "find the unpaid invoice" is poor.
- The aside pattern is a desktop convention stretched onto phones. The
  responsive strategy is stacking, not recomposition.

## Information Architecture Diagnosis

Content splits into 4 real groups: identity plus contact, money position,
work needing attention, and record history. The current page spreads these
across 6 tabs plus an overview that re-summarizes them. The correct shape
is one prioritized page with drill-down, not 6 parallel pages.

## User Jobs and Primary Tasks

Primary: grasp financial position (invoiced, collected, outstanding).
Primary: find and open the overdue or unpaid invoice fast.
Primary: contact the client (call, mail, address).
Primary: create a follow-on document with client prefilled.
Secondary: edit client details. Secondary: browse full history per type.
Secondary: inspect project linkage. Tertiary: view activity counts.
Missing: delete or archive the client through a guarded flow.

## Proposed New Information Architecture

One scroll page with sticky context, ordered by task frequency:

1. Sticky identity bar (name, balance chip, overflow).
2. Money position strip (outstanding first, then invoiced and collected).
3. Needs Attention group (overdue, unconverted, idle drafts). Absent when
   empty, with no placeholder gap.
4. Quick actions (create document, contact actions). Fixed above content,
   not stacked with tabs.
5. Grouped history (money documents, then service and logistics records),
   each group collapsible with counts and a See all drill-down.
6. Contact and account details as a disclosure section, not an aside.
7. Danger zone (delete or archive) at the page end behind confirmation.

Why: each group maps to one job. Nothing appears twice. Empty groups
vanish instead of showing zero-state cards.

## Proposed Mobile Layout

Above the fold: identity bar, outstanding balance, Needs Attention
summary, and the primary create action./action/ Below: money strip
details, grouped history, contact disclosure, danger zone. One vertical
scroll. No horizontal tab strip. Groups collapse independently. The create
action stays reachable through a bottom action surface inside the page,
clear of the global bottom nav.

## Proposed Header Architecture

The sticky bar carries back, client name with a compact status line
(balance or overdue count), and an overflow menu. Edit moves into
overflow beside delete and duplicate-type secondary actions. The bar
never shows 5 competing pills. Identity persists while scrolling.

## Proposed Action Hierarchy

- Primary: context-aware create (New Invoice by default; surfaces the
  most likely next document from client state).
- Secondary: call, mail, directions, edit, view full history.
- Contextual: per-row open, per-group See all, retry on section error.
- Destructive: delete or archive, page end, canonical destructive
  treatment, confirmation dialog, no one-tap path.
- Guidance surfaces stay informational per the workflow-safety rule.

## Tabs Decision

Remove the 6 tabs. Replace with grouped sections plus drill-down routes.
Rationale: tabs hide the overdue signal, duplicate overview content, force
context switching between related records, and cost a full horizontal
strip on 360px screens. Groups with counts plus See all links preserve
every current destination with fewer taps for the top 3 jobs. Keep the
existing per-type list routes as drill-down targets so bookmarks and
notifications keep working.

## Progressive Disclosure Strategy

- Needs Attention: visible when non-empty, hidden otherwise.
- History groups: first 3 rows visible, expandable, See all navigates.
- Contact details: collapsed disclosure, one tap to expand.
- Danger zone: collapsed, confirmation-gated.
- Large histories: paged drill-down routes, never infinite inline lists.

## Empty Loading Error State Strategy

- No documents: group shows a single compact empty row with a create
  action, not a full illustration card.
- No projects: same compact pattern with project creation.
- No activity: history section collapses to a one-line statement.
- Zero outstanding: money strip states "Settled" positively, keeps shape.
- Incomplete contact: disclosure lists only available channels, no
  "None listed" rows.
- Loading: skeleton per group in final shape, no spinner plus skeleton
  duplication.
- Section failure: inline retry inside the failed group, rest of page
  usable. Full record failure keeps the existing page-level error.

## Responsive Strategy

- Small and large phones: single column, order above.
- Foldable folded: phone layout. Unfolded: two columns with money plus
  attention left and history right, contact disclosure full width below.
- Tablet: two columns from 700dp, sticky identity bar, groups keep
  phone order within columns (money and attention first).
- Desktop: max-width content, three-column only for history density,
  identity and money never move below the fold equivalent.

## Accessibility and Touch Strategy

- 44px minimum on all controls including overflow, disclosures, and row
  affordances. Whole-row tap targets with labels.
- Focus order follows visual order. Disclosures use native button
  semantics. Destructive confirmation traps focus per dialog pattern.
- Reduced motion: collapses instant, no animated counters.
- Screen readers: group headings as landmarks, money values as plain
  text, status announced once per group, not per row.

## Visual Treatment Requirements

- Reuse current tokens only. No new palette.
- One surface for content, one muted surface for grouping. No card
  inside card.
- Value-first numerals with tabular figures. Labels stay muted and small.
- Status meaning comes from existing status tokens.
- Keep the solid destructive treatment for the danger zone.

## What Should Be Removed

- 6-tab bar and its horizontal strip.
- Recent Streams mixed chronology as a concept (replaced by groups).
- Activity Count metric card.
- Standalone Contact and Account aside card (becomes disclosure).
- Duplicate quick-create pill row (replaced by prioritized actions).
- "None listed" placeholder rows.

## What Should Be Combined

- Overdue plus unconverted plus idle items into Needs Attention.
- Per-type tabs into grouped history with drill-down.
- Call, mail, directions into one contact action row.
- Edit plus overflow lifecycle actions into the header menu.

## What Should Be Reordered

- Money position above history. Attention above history. Contact above
  history on phones (it currently sits last). Danger zone last always.

## What Should Become Progressive or Secondary

- Full history per type: drill-down routes.
- Contact details: disclosure.
- Projects: collapsed group unless an active project exists.
- Delete or archive: page-end zone with confirmation.
- Activity metadata: tertiary, inside group headers as counts.

## Proposed Component Structure

- `ClientDetailPage`: route component, keeps all current data logic.
- `ClientIdentityBar`: sticky header with name, status line, overflow.
- `MoneyPositionStrip`: outstanding-first summary, no card grid.
- `NeedsAttentionGroup`: conditional list with per-item open actions.
- `ClientQuickActions`: primary create plus contact row.
- `GroupedHistory`: per-group collapsible lists reusing row renderers
  from the current document and project tabs.
- `ContactDisclosure`: progressive contact section.
- `ClientDangerZone`: guarded lifecycle actions (needs new guarded
  delete or archive flow definition before build).
- Existing skeleton, error-box, and empty-row primitives reused.

## Migration Strategy

1. Approve this proposal and define the delete or archive flow (missing
   capability, needs product decision).
2. Build groups and rows from existing tab renderers without data
   changes. Keep old tabs behind no flag; replace in one pass since the
   data contracts are identical.
3. Move quick actions and header per the hierarchy. Preserve all current
   prefill navigation state.
4. Verify empty, loading, error, and large-history states per group.
5. Device pass on small phone, foldable, tablet, desktop.

## Risks and Trade-offs

- Tab removal changes muscle memory for current users. Mitigation: keep
  all destinations one tap away and preserve deep routes.
- One long page risks scroll fatigue for history-heavy clients.
  Mitigation: collapsible groups, counts first, drill-down early.
- Delete or archive is a new capability requiring permission, audit,
  and data-rule decisions before build.
- Another agent is active in this repo (prior commit and staged files
  observed). Coordinate file ownership before implementation to avoid
  same-file collisions.

## Acceptance Criteria

- No tab bar on Client Detail. All current destinations reachable.
- Outstanding balance and overdue items visible without scrolling past
  history on a 360px viewport.
- No record appears in two places on the same screen.
- Empty groups collapse without placeholder gaps.
- Contact actions reachable within two taps from page top.
- Destructive path exists, guarded, canonical treatment.
- Data, queries, permissions, routes unchanged except approved additions.
- Typecheck passes on implementation. Build not run.
