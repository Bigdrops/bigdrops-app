

```
Project root: C:\Users\DELL\desktop\bigdrops-app

You are fixing ONE specific bug in the Waybill form. Do not touch anything else.

---

## SKILL SYSTEM (HARD GATE)

1. Read: docs/PROJECTSKIILINDEX.md
2. Load: Karpathy
3. You MUST resolve Karpathy BEFORE writing any code. If load fails, open the index, find the path, read SKILL.md manually.

---

## THE BUG

Part No and Condition columns don't appear in the table when toggled ON in Table Settings. Unit works. Custom columns work. But Part No and Condition — which are built-in optional columns — don't respond.

## ROOT CAUSE (LIKELY)

The `isColumnVisible` function or visibility map in `WaybillForm.tsx` handles `custom_` prefixed columns correctly but does NOT correctly propagate visibility for built-in optional columns like `partNo` and `condition`.

---

## REQUIRED FILE

- `src/components/waybill/WaybillForm.tsx` — only this file

---

## FIX

Trace the full path from Table Settings toggle → column visibility state → `isColumnVisible` → `FormLineItems` rendering.

Find where `partNo` and `condition` keys are checked for visibility. These are NOT custom columns — they have fixed keys. Ensure they are handled the same way `description`, `quantity`, and `unit` are handled when toggled.

Do NOT add another `custom_` workaround. Fix the actual visibility propagation for `partNo` and `condition` keys.

---

## SHARED-COMPONENT SAFETY

Do NOT modify `FormLineItems.tsx` or `ColumnManager.tsx`. Only edit `WaybillForm.tsx`.

---

## ALLOWED COMMANDS

- `bun run typecheck`

Do NOT run `bun run dev`. Do NOT claim runtime behavior.

---

## VERIFY YOUR FIX LOGICALLY

Before finishing, trace: "If I toggle Part No ON in Table Settings, does the visibility boolean for key `partNo` reach the point where columns are rendered?"

If the answer is no, your fix is incomplete.

---

## COMMIT

```

git add -A && git commit -m "fix: propagate partNo and condition column visibility toggles" && git push origin main

```
```

Target: Claude Code / Codex | Strategy: Single-bug focus — trace Part No and Condition visibility from Table Settings toggle through visibility state to FormLineItems rendering. Fix the propagation for these specific built-in optional column keys. No workarounds. One file only.