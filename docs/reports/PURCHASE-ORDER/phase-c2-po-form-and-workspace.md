# Phase C2 — Supplier Purchase Order Form and Workspace

This report was written by OpenCode on 2026-10-15.

Skills used: react-dev, typescript-advanced-types, accessibility, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read. Four registered
skills were loaded and applied.

- `react-dev` — typed React 19 patterns, explicit event and hook typing.
- `typescript-advanced-types` — adapter typings between the PO domain
  and the shared form's invoice-shaped contract.
- `accessibility` — accessible names on the supplier picker, labelled
  inputs, `role="alert"` on the save-error banner, keyboard-operable
  dialogs and disclosure sections.
- `karpathy` — simplicity first and surgical changes. No new hooks, no
  new save authority, no new calculation, numbering, search, or PDF
  path. Every shared-component change is a backward-compatible
  conditional with unchanged defaults.

No Supabase skill was loaded: this phase changes no schema and runs no
migration. The deployed C1 through C1.2 backend is consumed unchanged.

---

## Objective

Make the deployed PO backend accessible through a complete,
production-integrated Purchase Order interface: descriptor, supplier
picker adapter, create and edit form, list, detail, lifecycle controls,
navigation, and permissions.

A Purchase Order is an outgoing procurement commitment issued to a
supplier. It is not an invoice, quotation, expense, payment, goods
receipt, or inventory movement.

## Scope

In scope: `PURCHASE_ORDER_DESCRIPTOR`, `SupplierPartySelector`, the PO
form adapter, PO form/list/detail pages, routes, procurement
navigation, permission gating, audit-history labels, and focused tests.

Out of scope and not built: PO PDF (React PDF and FormePDF untouched),
RFQ conversion, goods receiving, supplier payments, accounts payable
posting, stock adjustments, Item Library dependency, new supplier
directory, commercial-party registry, new numbering or calculation
engines, and any document-search change.

## Files changed

### New files

| File | Lines | Purpose |
|---|---|---|
| `src/domain/purchase-order/formAdapter.ts` | 200 | Pure PO to shared-form mapping, columns, import mapping, list search |
| `src/components/supplier/SupplierPartySelector.tsx` | 42 | Neutral party-slot adapter over `SupplierSelector` |
| `src/pages/PurchaseOrderFormPage.tsx` | 560 | Create and edit form page (`mode` prop) |
| `src/pages/NewPurchaseOrder.tsx` | 5 | Create delegator |
| `src/pages/EditPurchaseOrder.tsx` | 5 | Edit delegator |
| `src/pages/PurchaseOrders.tsx` | 330 | PO workspace list |
| `src/pages/PurchaseOrderDetail.tsx` | 480 | PO detail with lifecycle controls and history |
| `src/tests/critical/purchaseOrderWorkspace.test.js` | 330 | 17 workspace contract tests |

### Modified files

| File | Change |
|---|---|
| `src/components/document/documentDescriptor.ts` | `purchase_order` family, optional `hiddenSections`, `PURCHASE_ORDER_DESCRIPTOR` |
| `src/components/document/FormHeader.tsx` | Three backward-compatible visibility conditionals |
| `src/components/document/FormCommercialTerms.tsx` | Three backward-compatible visibility conditionals, dynamic control count |
| `src/components/document/FormNotesTerms.tsx` | Optional `hideSignatorySection`, `hideReferenceLinksSection` |
| `src/components/document/SharedDocumentForm.tsx` | Forwards the two hide flags |
| `src/components/document/FormLineItems.tsx` | Optional `enableItemSuggestions` override, default preserves current rule |
| `src/components/app/AppShell.tsx` | Four PO routes with lazy pages |
| `src/components/layout/navData.ts` | `procurementPicker`, `getProcurementPath`, PO tab mapping |
| `src/components/layout/MobileSidebar.tsx` | Procurement section |
| `src/components/layout/DesktopSidebar.tsx` | Procurement section |
| `src/components/Layout.tsx` | `handleProcurementPick` handler and prop threading |
| `src/domain/audit/auditTypes.ts` | `purchase_order` entity member |
| `src/domain/audit/auditFormatters.ts` | `purchase_order` action labels |
| `src/lib/cache/listCache.ts` | `purchaseOrderListCacheKey` |
| `src/lib/iconRegistry.ts` | `purchase_order` icon |
| `src/tests/critical/supplierDomain.test.js` | Test 59 converted to the authorized-surface assertion (C1 precedent) |

No other file changed. No migration created. No PDF renderer touched.

## Changes made

1. Added the PO descriptor with supplier party binding and seven hidden
   sections. Invoice and Quotation descriptors are untouched and keep
   every section visible.
2. Generalized five shared form files with optional flags whose
   defaults reproduce current Invoice and Quotation output exactly.
3. Added the supplier party adapter over the existing
   `SupplierSelector`. No client table is read and no client id travels.
4. Added the pure PO form adapter: column set, header and item mapping,
   discount-timing mapping, list search, and import-row mapping.
5. Built the form, list, and detail pages with save, numbering,
   lifecycle, archive, permission, and history wiring.
6. Registered routes, procurement navigation on both sidebars, icon,
   cache key, and audit-history labels.
7. Added 17 workspace tests. Converted the superseded Phase A UI guard
   to a positive assertion, following the C1 test-59 precedent.

## Shared form reuse details

The PO form renders through `SharedDocumentForm` with
`descriptor={PURCHASE_ORDER_DESCRIPTOR}` and
`partySelector={SupplierPartySelector}`. Reused unchanged: header
layout, line-item presentation with drag ordering and mobile cards,
commercial-terms ledger, totals presentation, desktop action rail,
mobile action bar, responsive breakpoints, and theme tokens.

The PO page supplies a page-level adapter object, so the shared form
required no Invoice-shaped persistence change. Item suggestions are
disabled for PO: catalog sales prices must never populate supplier
costs. JSON import maps invoice-shaped rows onto PO lines at the page
boundary. Custom-column creation shows an informational notice because
custom columns have no PO column to persist into.

Invoice and Quotation parity: every generalization defaults to current
behaviour, and the existing descriptor, form-regression, and picker
regression suites pass unchanged.

## Supplier identity mapping

Selection writes `supplier_id` through the neutral party contract and
only during creation. The save persists `supplier_id`; the database
resolves `supplier_name` from the supplier row in the same tenant
schema. Saved POs show the frozen snapshot with an explanatory note.
`client_supplier_links` is never read and clients are never converted.
The edit form blocks supplier changes with an informational notice, and
non-draft or archived POs redirect to the read-only detail view.

## Financial mapping

Display and persistence totals come exclusively from
`computePurchaseOrderTotals` over the canonical engine. The form edits
`unit_cost` through the editor's `unit_price` mirror, plus VAT percent,
discount value and type, discount timing, and per-charge `withTax`
flags. No selling price, payment field, WHT, workmanship, or install
rate exists anywhere in the PO surface. Computed line amounts are
read-only. Full engine precision is preserved.

## Numbering behavior

Automatic preview through the PO numbering service without clobbering
typed input. A differing value is sent as the authoritative manual
number and never advances the automatic cursor. Collisions surface the
service refusal with form data intact. Saved numbers render read-only
and are never rewritten.

## Lifecycle UI behavior

Draft detail offers Edit, Issue, Cancel, and Archive. Issued detail
offers Close, Cancel, and Archive. Cancelled and closed detail offers
Archive with a terminal-history note. Archived detail offers Restore
with an original-status note. Every transition requires explicit
confirmation stating its consequences and runs through
`transitionPurchaseOrderStatus`, never through content save. Issue is
available only on persisted drafts. Stale and permission refusals toast
with form data intact and reload state. Archive and restore preserve
history exactly.

## Navigation and permission integration

Routes `/purchase-orders`, `/new`, `/edit/:id`, and `/:id` follow the
supplier route pattern with lazy pages and error boundaries. A
Procurement section in both sidebars navigates through
`getProcurementPath`; PO routes highlight the More tab. The list hides
creation without the `create` grant and shows a no-access notice
without the `view` grant. Edit, lifecycle, archive, and restore
controls require the `edit` grant. Database RLS remains authoritative
and every server refusal is surfaced gracefully.

## Responsive implementation

The shared form's mobile, fold, tablet, and desktop architecture is
reused without a second engine: compact header and reachable actions on
mobile, card-based items on narrow widths, and the desktop document
workspace with action rail on wide screens. List and detail pages use
the established module cards with wrapping grids. No horizontal
overflow is introduced.

## Test results

| Suite | Result |
|---|---|
| New `purchaseOrderWorkspace.test.js` | 17 pass, 0 fail |
| Full critical suite | 1333 tests, 1318 pass, 15 fail |

The 15 full-suite failures are the known pre-existing set and touch no
file this task changed. The converted supplier test 59 passes (60 of 60
in that file).

## Verification result

```
Verification:
- git status before work: 3 untracked files (prior-session C1.2 migration, test, report), tree otherwise clean
- git status after work: scoped task changes only, prior files untouched
- bun run audit:load: passed (exit 0, no finding in any purchase-order file)
- bun run typecheck: passed (exit 0, 0 errors)
- bun run test: 1333 tests, 1318 pass, 15 fail — all 15 pre-existing (see above)
- focused PO suites: 103 tests across lifecycle, persistence, domain, calculations, integrity, workspace — all pass
- git diff --check: clean (exit 0)
- supabase db push: not applicable — no schema changed
- bun run build: skipped due to hardware policy
```

## Supabase push status

Not applicable. No migration was created and no database object changed.

## Risks or limitations

- The form has a refresh and tab-close guard only. In-app navigation
  away from a dirty draft does not prompt, matching the Invoice and
  Quotation convention.
- The line-item toolbar Import and Settings buttons are live; custom
  column creation is display-only and reports itself as unsaved.
- The list fetches the tenant PO set and filters client-side, matching
  the supplier directory convention. No server pagination exists.
- Audit history renders the merged audit feed for the PO entity. Feed
  entries before this phase do not exist because no PO UI existed.
- `bun run build` was not run, by hardware policy. Type safety is
  checked by `tsc --noEmit` only.
- The 15 pre-existing test failures remain, owned by other work
  streams.

## Deferred work

- Supplier PO PDF on the CPS FormePDF architecture (later phase).
- RFQ-to-PO conversion, goods receiving, supplier payments, and
  inventory movement (all explicitly excluded here).
- Server-side PO search authority, if list scale ever requires it.
- Dashboard quick-tile entries for the PO workspace (registry pattern
  reviewed; not wired).
- In-app navigation exit guard, if product requires it beyond the
  refresh guard.

## Explicit statement

PDF and accounting remain untouched. No PDF engine, renderer, template,
or delivery path was added or modified. No source transaction, journal,
expense, payment, receipt, or inventory table is read or written by any
file this task added or changed. Procurement costs never occupy a sales
price field.

(End of file)
