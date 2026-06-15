# Phase 2 — Invoice Add Mode (Anti-Inference Layer)

**Date:** 2026-06-15
**Status:** ✅ Complete

---

## Objective

Add 2 anti-inference rules to the Add mode prompt and implement a `hasScatteredGroups` ordering-integrity guard in `apply.ts` to silently strip clustered group assignments.

---

## Changes Made

### 1. `src/domain/import/promptGenerator.ts`

**Lines 85-86** — Added 2 new rules to the end of the Add mode `rules` array:

```typescript
`Never infer groups from indentation, indentation depth, bullet style, or visual spacing — only from explicit section headings or category labels`,
`Preserve the exact item order from the source document — do not reorder items based on groups or any other criteria`,
```

These rules reinforce the discipline spec at the prompt level, instructing the AI to:
- Only create groups from explicit section headings/category labels (not from visual layout cues)
- Never reorder items based on groups or any other criteria

### 2. `src/domain/import/apply.ts`

**Lines 7-42** — Added `hasScatteredGroups()` private helper function:

```typescript
function hasScatteredGroups(
  items: { baseFields: Record<string, unknown> }[],
  groups: { id?: string; itemIds: string[] }[],
): boolean
```

Logic:
- Builds a boolean sequence: `true` if item has group assignment, `false` if not
- Checks for clustered patterns: all grouped at start (`lastTrue < firstFalse`) or all grouped at end (`lastFalse < firstTrue`)
- Returns `false` if clustered (strip groups), `true` if scattered (preserve groups)

**Lines 93-132** — Inserted cluster check in Add mode path of `buildApplyResult()`, BEFORE the existing group assignment logic:

```typescript
const scattered = hasScatteredGroups(resolved.items, groups)
if (!scattered && groups.length > 0) {
  // Clustered groups detected — strip silently, apply items in original order
  // ... returns early with groups: []
}
```

When clustered groups are detected:
- No toast, no warning — silent strip
- Items are applied in original JSON array order
- All items get `group_id: null` and `group_name: ''`
- Returns `groups: []` in the result

---

## Test Cases

| # | Input | `hasScatteredGroups` | Cluster Check | Result |
|---|---|---|---|---|
| 1 | No groups (`[]`) | `false` (early return) | Skip | Existing logic runs, no groups to process |
| 2 | All items in one group | `false` (all true → early return) | Strip | Items added in original order, no group headers |
| 3 | Grouped at start, ungrouped at end | `false` (clustered start) | Strip | Items added in original order, no group headers |
| 4 | Ungrouped at start, grouped at end | `false` (clustered end) | Strip | Items added in original order, no group headers |
| 5 | Mixed scattered groups | `true` | Preserve | Existing group logic runs normally |

---

## Verification

- ✅ `bun run audit:load` — passed (no new issues)
- ✅ `bun run typecheck` — passed (no errors in changed files)
- ✅ Lint — no new issues
- ✅ No UI changes, no new toasts, no schema changes
- ✅ Update mode untouched
- ✅ Quotation reuses invoice pipeline — no separate changes needed

---

## Files Modified

| File | Change |
|---|---|
| `src/domain/import/promptGenerator.ts` | Added 2 anti-inference rules to Add mode rules array |
| `src/domain/import/apply.ts` | Added `hasScatteredGroups()` helper + cluster check in Add mode path |
