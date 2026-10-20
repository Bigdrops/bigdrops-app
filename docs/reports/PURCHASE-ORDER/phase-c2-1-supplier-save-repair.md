# Phase C2.1 — Purchase Order Supplier Selection Save Repair

This report was written by OpenCode on 2026-10-15.

Skills used: react-dev, typescript-advanced-types, accessibility, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read. Four registered
skills were loaded and applied.

- `react-dev` — functional state updates for sequential event handling.
- `typescript-advanced-types` — adapter typings (no type change needed).
- `accessibility` — toast close control stays reachable; error
  announcement retained; wrapping changes no accessible names.
- `karpathy` — smallest repair at the earliest proven cause. Two files
  changed, one test file added. Nothing else touched.

No Supabase skill was loaded: no schema, query, or data-layer logic
changed. No migration created. No database was mutated.

---

## Objective

Repair the live failure where a visibly selected supplier was rejected
at save as missing. Identify the exact cause from source evidence and
fix it minimally without touching Invoice or Quotation behaviour.

## Scope

In scope: the supplier identity flow from picker to persistence
payload, the failing state boundary, a scoped mobile toast correction,
and focused regression tests.

Out of scope and not built: form redesign, second save pathway,
numbering or calculation changes, Item Library work, PDF, accounting,
inventory, search, migrations, and any database mutation.

## Exact root cause

The form page's header updater closed over a stale state snapshot.

`SharedDocumentForm.handlePartyChange` emits party selection as two
synchronous updates: `(supplier_id, uuid)` then `(supplier_name,
name)`. `PurchaseOrderFormPage.updateHeader` applied each update to the
`po` value captured when the callback was created and called
`setPo(next)` with the result. The second call recomputed from the
pre-selection snapshot, so it overwrote the first call's `supplier_id`
with `''` while keeping `supplier_name: 'BIGDROPS'`.

Result: the picker button displayed BIGDROPS (it reads the name) while
validation read an empty `supplier_id` and refused with "Choose the
supplier this purchase order is issued to." Every other save input
(number, date, all ten items, computed amounts) was intact.

The Invoice form never had this defect: its updater is a functional
`setInvoice((current) => ...)` with no closed-over snapshot, so
sequential writes compose.

## First broken integration boundary

D — `PurchaseOrderFormPage` maintained the update function over an
unsynchronized snapshot. All earlier boundaries were verified intact:

| Boundary | Evidence | Verdict |
|---|---|---|
| A. Selector callback | `onSupplierChange(supplier?.id \|\| '', supplier?.name \|\| '', supplier)` | Correct values |
| B. Party adapter | `(id, name) => onPartyChange(id, name)` with supplier props | Correct mapping |
| C. Shared form field write | `updateInvoice(descriptor.party.idField, id)` with `supplier_id` | Correct field |
| D. Page state update | `applySharedHeaderUpdate(po, ...)` over closed-over `po` | **Broken** |
| E. Adapter | Sets `supplier_id` from the field argument | Correct |
| F. Validation | Reads `purchaseOrder.supplier_id`, refuses empty | Correct |
| G. Normalization | Passes `supplier_id`, omits server-resolved name | Correct |
| H. Service | Validates, then persists through the RPC | Correct |
| I. RPC and RLS | Ownership probe plus foreign key in the tenant schema | Correct |

The repair targets D only, the earliest proven cause.

## Files changed

### Modified files

| File | Change |
|---|---|
| `src/pages/PurchaseOrderFormPage.tsx` | `updateHeader` applies through functional `setPo`, matching the invoice updater shape (+7/−5 lines) |
| `src/styles/formTheme.css` | Long toast titles wrap; close control keeps a fixed, reachable box (+9 lines) |

### New files

| File | Tests | Purpose |
|---|---|---|
| `src/tests/critical/purchaseOrderSupplierSave.test.js` | 12 | Boundary regression suite |

No other file changed.

## Before and after supplier data flow

Before (broken):

```
picker emits (id, name)
  -> updateHeader('supplier_id', uuid) reads po{supplier_id: ''}
     setPo({...po, supplier_id: uuid})          // queued, not yet applied
  -> updateHeader('supplier_name', name) reads po{supplier_id: ''}
     setPo({...po, supplier_name: name})       // overwrites the queued id
state: { supplier_id: '', supplier_name: 'BIGDROPS' }
display: BIGDROPS · validation: missing supplier
```

After (repaired):

```
picker emits (id, name)
  -> setPo((current) => apply(current, 'supplier_id', uuid))
  -> setPo((current) => apply(current, 'supplier_name', name))
state: { supplier_id: uuid, supplier_name: 'BIGDROPS' }
display: BIGDROPS · validation: pass · payload carries the UUID
```

## Save-path verification

A ten-item draft built through the real selection sequence validates,
prepares totals through the canonical adapter, and produces an RPC
payload containing `supplier_id`, ten ordered item rows with
procurement costs, and no caller-claimed `supplier_name`. Failed
validation and failed RPC paths keep every item and every field: the
page never resets form state except on successful navigation.

## Regression tests

| Test | Guards |
|---|---|
| Selection stores UUID with display name | Folded selection validates |
| Stale application reproduces the live failure | Name kept, id lost, refusal raised |
| Selection survives item, date, number, discount edits | No edit clears the id |
| Selection survives item import | Import mapping keeps the id |
| Save payload contains the UUID, all ten items ordered | Persistence contract |
| Clear causes the expected refusal; re-select restores validity | Intentional clear still works |
| Any non-empty id validates; ownership stays server-side | No name-based acceptance |
| Draft hydration preserves supplier identity | Edit path keeps the id |
| Validation keys on the UUID, never the name | Display-only name cannot satisfy |
| Page applies header updates functionally | The actual repair, pinned |
| Client selectors unchanged | Invoice and Quotation parity |
| Toast titles wrap without redesign | Scoped CSS correction |

## Mobile toast correction

The `goey-toast` library forces single-line truncated titles
(`white-space: nowrap` plus ellipsis), which clipped the validation
message and crowded the close control on narrow screens. The existing
toast override block in `formTheme.css` now lets the title wrap with
`min-width: 0` and keeps the close control at a fixed, reachable box
with `flex-shrink: 0`. Short titles render unchanged. No toast
component, tone, announcement behaviour, or global notification logic
changed.

## Verification result

```
Verification:
- git status before work: clean tree, 0 changes
- git status after work: 2 scoped modifications, 1 new test file
- bun run typecheck: passed (exit 0, 0 errors)
- bun run audit:load: passed (exit 0, no finding in any purchase-order file)
- bun run test: 1345 tests, 1330 pass, 15 fail — all 15 pre-existing (see below)
- focused supplier suite: 12 tests, 12 pass, 0 fail
- git diff --check: clean (exit 0)
- supabase db push: not applicable — no schema changed
- bun run build: skipped due to hardware policy
```

The 15 full-suite failures are the known pre-existing set and touch no
file this task changed.

## Supabase push status

Not applicable. No migration was created and no database was mutated.

## Remaining limitations

- No live Android save was performed. The repair is verified by
  boundary tests, typecheck, and the full suite. The first live save
  attempt remains the true field confirmation.
- The defect class (stale closure over sequential shared-form updates)
  was audited only for the header path. All other PO state setters in
  the page already use functional updates and were re-verified.
- In-app navigation away from a dirty draft still does not prompt,
  matching the Invoice and Quotation convention.

(End of file)
