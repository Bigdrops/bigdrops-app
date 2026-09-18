JSON Import — Group Creation Is Unreliable

Status: OPEN
Area: Quotation) invoice JSON Import
Priority: High
Type: Data Integrity / Import Bug

Problem

Group creation through JSON import is unreliable.

A valid quotation JSON can contain:

- "groups[].id"
- "groups[].itemIds"
- "items[].temp_ref"
- "items[].group_id"

The references can match correctly, but the imported items can still appear without their groups.

The same group structure can work in one import and fail in another.

Expected Behavior

Group import must be deterministic.

For each grouped item:

"items[].group_id" must match "groups[].id".

"items[].temp_ref" must exist in the matching "groups[].itemIds".

When these references are valid, the importer must create the group and place the correct items in it.

A valid group relationship must not be silently lost.

Failure Behavior

If a group reference cannot be resolved, the importer must report the error.

It must not silently import the affected items as ungrouped items.

Audit Scope

Trace group data through the full import pipeline:

Parse → Zod → Normalize → Resolve → Apply → Adapter → Editor

Check for:

1. "temp_ref" being removed before group resolution.
2. Group resolution occurring before item IDs are available.
3. Final item IDs replacing "temp_ref" without updating "group.itemIds".
4. "group_id" being removed or changed during normalization.
5. "groups[].itemIds" and "items[].group_id" being resolved independently.
6. React/editor state updates causing groups to resolve against stale item state.
7. Failed group resolution silently falling back to ungrouped items.
8. Any save/reload transformation that removes an already-created group relationship.

Required Fix

Resolve the complete imported document before applying it to editor state.

Required sequence:

1. Parse JSON.
2. Validate items and groups.
3. Build the "temp_ref" → final item ID mapping.
4. Resolve all item IDs.
5. Resolve all group membership.
6. Validate "group_id" against the resolved groups.
7. Reject dangling or conflicting references.
8. Build one complete normalized document.
9. Apply the complete document to editor state.
10. Remove temporary import references only after resolution.

Do not allow group creation to depend on React state timing or update order.

Relationship Integrity

Use one canonical group relationship internally.

Recommended:

"items[].group_id" = canonical relationship.

"groups[].itemIds" should be validated against that relationship and derived where appropriate.

Do not maintain two independent mutable representations that can drift.

Acceptance Criteria

- The same valid JSON produces the same groups on every import.
- Multiple groups import correctly.
- All grouped items remain in their correct groups.
- Item order is preserved.
- "temp_ref" survives until relationship resolution is complete.
- "temp_ref" does not leak into persisted database records.
- Invalid or dangling references produce an explicit import error.
- Group resolution failure never silently converts grouped items to ungrouped items.
- Import, editor state, save, and reload preserve the same group structure.
- Existing ungrouped JSON imports continue to work.
- Automated tests cover repeated imports of the same grouped payload.