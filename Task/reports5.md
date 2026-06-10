## Prompt 5 Execution: JSON Import Group Members Not Populated

### Bug
JSON import places groups at the top (empty) and items underneath as flat ungrouped rows. Group membership (`group_id` / `temp_ref` → `itemIds`) is completely ignored.

### Root Cause
Two serial data loss points:

**1. `normalize.ts`** — The `processEntry` function explicitly handles `description`, `sub_description`, `unit`, `quantity`, `unit_price`, `row_number`, and `make`. For any other key, it checks `BASE_FIELDS` and routes non-base keys to "extraFields" (custom columns). However, `group_id` and `temp_ref` ARE listed in `BASE_FIELDS` but have NO explicit handler. They match none of the if-branches, and the `!BASE_FIELDS.has(key)` catch-all is `false`, so they get silently dropped.

**2. `resolve.ts`** — Even if `group_id`/`temp_ref` survived normalization, the `resolveImportColumns` function builds `resolvedItems` with an explicit whitelist of only 6 base fields (`description`, `sub_description`, `quantity`, `unit`, `unit_price`, `make`). `group_id` and `temp_ref` weren't propagated.

The downstream consumer `buildApplyResult` in `apply.ts` correctly uses `item.baseFields.group_id` and `item.baseFields.temp_ref` to match items to groups, but both were always `undefined`.

### Fix
- **`src/domain/import/normalize.ts:121-125`** — Added handler for `temp_ref` and `group_id` to capture them into `baseFields`.
- **`src/domain/import/resolve.ts:47-48`** — Added `temp_ref` and `group_id` to the resolved base fields whitelist.

### Files Modified
- `src/domain/import/normalize.ts`
- `src/domain/import/resolve.ts`
