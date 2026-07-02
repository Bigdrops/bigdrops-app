# Group Creation Atomicity — Implementation Report

## Root Cause

When a user created a new group via `addGroup`, only two things happened:

1. A new `InvoiceGroup` entry was pushed to the `groups` array.
2. A single `group_header` row (with `row_type: 'group_header'`, `group_id` set to the new group's ID) was appended to the `items` array.

No child `standard` row was created inside the group. This meant every newly created group appeared as an **empty standalone group** with no items — the user had to take a separate manual action ("Add Item") to populate it. The group was effectively an orphan until the user explicitly added a child row via `addItemToGroup`.

## Files Modified

| File | Change |
|---|---|
| `src/pages/NewInvoice.tsx` | `addGroup` — appended a `standard` child row after the `group_header` |
| `src/pages/EditInvoice.tsx` | `addGroup` — appended a `standard` child row after the `group_header` |
| `src/components/quotation/useQuotationLineItems.ts` | `addQuotationGroup` — appended a `standard` child row after the `group_header` |

## Before / After Behaviour

**Before** — adding a group produced an empty shell:

```
Row 1
Add Group →
Row 1
Group A              ← empty, no children
```

**After** — adding a group atomically creates the group with its first child:

```
Row 1
Add Group →
Row 1
Group A
└── (empty row)      ← first child created atomically
```

The child row is a standard `InvoiceItem` with:
- `row_type: 'standard'`
- `group_id` set to the new group's ID
- `group_name` set to the new group's name
- `sort_order` immediately after the `group_header`

From the user's perspective, the new group is immediately editable — clicking into the group shows a ready-to-type row.

## Edge Cases Handled

| Edge Case | Handling |
|---|---|
| **Existing standalone rows preserved** | Only the new group's items array is extended; existing items are unchanged |
| **Existing rows not absorbed into new group** | The child row is a fresh `makeEmptyItem()`, not a copy of any existing row |
| **Sequential numbering preserved** | `sort_order` values are assigned based on array position (`prev.length`, `prev.length + 1`) and `normalizeQuotationGrouping` recalculates them on the array index |
| **No orphan groups** | Every `addGroup` call now produces exactly 1 group entry + 1 header row + 1 child row — no group is created without at least one child |
| **Existing group metadata preserved** | Group name, `showSubtotal`, and all `InvoiceGroup` fields are untouched from the original `makeEmptyGroup()` call |
| **Drag-and-drop unaffected** | DnD operates only on ungrouped items (those without `group_id`). The child row belongs to the group and is rendered by `lineItemRows` in the group section — it never enters the sortable ungrouped pool |
| **Invoice vs Quotation consistency** | Both invoice consumers (`NewInvoice`, `EditInvoice`) use direct `setItems`/`setGroups`; quotations use `commitGrouping` with `normalizeQuotationGrouping`. Both paths receive the same two-row append pattern |
| **Normalization safety (quotation)** | `normalizeQuotationGrouping` overwrites `sort_order` on all items to match array index, so the child's `sort_order` is always correct regardless of any subsequent normalization |

## Remaining Limitations

1. **No API-level atomicity** — The group + child row are written as two separate state updates within the same synchronous callback (nested `setItems` inside `setGroups` for invoices; a single `commitGrouping` call for quotations). Both are batched by React's batching (React 18+), so there is no intermediate render with only the header and no child. This is sufficient but worth noting if the state management were ever extracted to a server-side mutation.

2. **`sort_order` gap under concurrent state readers** — The `addGroup` in `NewInvoice` and `EditInvoice` uses a closure over `prev.length` / `current.length` which is correct at call time. If another concurrent state update were to modify the items array between the read and the write, the `sort_order` could be off. This is consistent with the pre-existing pattern used by all other item mutations in these files and is mitigated by React's batching.

3. **Child row is always empty** — The first child is a blank `makeEmptyItem()`. It does not copy any fields from a "last" row or apply any defaults beyond `quantity: 1`. This is consistent with how `addItem` / `addUngroupedItem` behaves.
