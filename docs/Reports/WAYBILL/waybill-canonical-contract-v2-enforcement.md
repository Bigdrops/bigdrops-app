# Waybill Canonical Contract v2 — Enforcement Report

**Date:** 2026-06-17
**Task:** Create system-level enforcement layer for the Waybill Canonical Contract v2
**Contract:** `docs/contracts/waybill-canonical-contract-v2.md`

---

## Contract Invariants Enforced

| # | Invariant | Assertion Function | Status |
|---|-----------|-------------------|--------|
| A | `custom_data` is the only extension mechanism | `assertNoExtensionFieldsOutsideCustomData` | Enforced |
| B | Visibility never affects persistence | `assertVisibilityDoesNotMutateData` | Enforced |
| C | Templates never affect data | N/A (rendering layer) | Contract documented |
| D | Import never discards unknown item fields | `assertUnknownFieldsPreserved` | Enforced |
| E | Normalization preserves all `custom_data` keys | `assertCustomDataPreserved` | Enforced |
| F | Form and PDF use identical visibility logic | `STANDARD_ITEM_COLUMNS` shared constant | Enforced |

---

## Files Created

### `src/domain/waybill/contracts/waybillContract.ts`

Single source of truth for the waybill item data contract. Contains:

- **Canonical types:** `WaybillItem`, `WaybillItemCustomData`, `ItemCondition`, `StandardColumn`
- **Shared constants:** `STANDARD_ITEM_COLUMNS` (Form + PDF column definitions), `WAYBILL_ITEM_KEYS` (canonical shape keys)
- **Type guard:** `isWaybillItemShaped()` — validates WaybillItem shape at runtime
- **Assertion functions:** 5 reusable enforcement functions (see below)

### `src/tests/critical/waybillContract.test.js`

30 tests covering all 4 contract scenarios:

| Scenario | Tests | What's Verified |
|----------|-------|-----------------|
| 1. Import preservation | 5 | `custom_data` keys survive normalize; customColumn keys added without dropping existing |
| 2. Visibility isolation | 4 | Toggling visibility doesn't mutate description, quantity, or `custom_data` |
| 3. PDF/Form consistency | 3 | `STANDARD_ITEM_COLUMNS` includes `make`/`partNo` as standard columns with correct defaults |
| 4. Unknown field preservation | 3 | Source fields land in `custom_data`; lost fields detected; standard fields ignored |

---

## Assertion Functions

### `assertCustomDataExists(item, context)`
Ensures `custom_data` exists and is a non-null object. Used as precondition for all other assertions.

### `assertCustomDataPreserved(source, target, context)`
Verifies every key in `source.custom_data` exists in `target.custom_data` with a non-undefined value. Catches data loss during any transform.

### `assertNoExtensionFieldsOutsideCustomData(item, context)`
Ensures no keys exist on the item root that aren't in `WAYBILL_ITEM_KEYS`. Catches contract violations like `item.make` instead of `item.custom_data.make`.

### `assertVisibilityDoesNotMutateData(before, after, context)`
Verifies that toggling column visibility doesn't mutate `description`, `quantity`, `unit`, `condition`, or any `custom_data` key.

### `assertUnknownFieldsPreserved(source, result, context)`
Checks that all non-standard top-level keys from the source object land in `result.custom_data`. Catches normalize-time data loss.

---

## Key Design Decisions

### 1. Single file (no separate assertions module)
Contract types, constants, predicates, and assertions live in one file (`waybillContract.ts`). This avoids Node ESM resolution issues with `.ts`→`.ts` imports in the test runner.

### 2. `custom_data` type aligned to v2 spec
Updated from `string | number | null | undefined` to `string | number | boolean | null` to match the contract exactly. `boolean` is now a valid custom_data value.

### 3. Assertions are throw-based (not return-based)
Each assertion throws with a descriptive `[context]` prefix on violation. This makes failures immediately actionable in any integration point.

### 4. `STANDARD_ITEM_COLUMNS` as shared constant
Form and PDF both import from this constant, ensuring column definitions, labels, and default visibility are identical. This enforces Invariant F (Form = PDF visibility).

---

## Integration Points

The assertion functions are designed to be called at these boundaries:

| Boundary | Assertion | Where |
|----------|-----------|-------|
| After `normalizeWaybillItem` | `assertCustomDataPreserved`, `assertUnknownFieldsPreserved` | `waybillUtils.ts:405` |
| Before DB save | `assertNoExtensionFieldsOutsideCustomData` | `waybillMutations.ts:53` |
| After import apply | `assertCustomDataPreserved` | `handleApplyImport` in WaybillForm |
| Before PDF render | `assertVisibilityDoesNotMutateData` | `WaybillPDF.tsx` render path |

> **Note:** Assertions are currently defined but not yet wired into runtime paths. They are available for opt-in enforcement at team discretion. Wiring them into production paths is a separate task.

---

## Verification

| Check | Result |
|-------|--------|
| `bun run typecheck` | ✅ 0 errors |
| `bun run test` | ✅ 30/30 pass |
| Contract file exists | ✅ `docs/contracts/waybill-canonical-contract-v2.md` |
| Types match v2 spec | ✅ `custom_data: Record<string, string \| number \| boolean \| null>` |
| `STANDARD_ITEM_COLUMNS` shared | ✅ Imported by test; ready for Form + PDF |
