## Bug Fix: Manual "Add Group" Not Rendering Group Container

### Bug Diagnosis
When clicking the "Add Group" button in the invoice form, the button highlighted (acknowledging the click) but no group container rendered on screen. The `addGroup` function correctly created a new `InvoiceGroup` in state and pushed a `group_header` item to the items array. However, the `groupEntries` memo in `FormLineItems.tsx` returned the new group with an empty `items` array (since no standard items belong to it yet), and the rendering logic filtered it out with a `groupItems.length > 0` guard.

### Root Cause
`FormLineItems.tsx:182-205` — The rendering used a conditional `groupItems.length > 0 ? <MobileGroupCard /> : null`, which silently dropped empty groups. The `MobileGroupCard` component already handled the empty state (displaying "No items in this group" at lines 87-90), but was never reached.

### Fix
Removed the `groupItems.length > 0` guard, letting `MobileGroupCard` render unconditionally for every group. The empty state is now correctly displayed with the "No items in this group" placeholder and the "Add item to group" button, matching the expected UX.

### Files Modified
- `src/components/document/FormLineItems.tsx:182` — Changed `groupEntries.map(({ group, items: groupItems }) => groupItems.length > 0 ? ( ... ) : null)` to always render `MobileGroupCard`.
