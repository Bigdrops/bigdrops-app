

```
Fix two critical errors in the Waybill form. Execute both, verify, push, and report.

---

## FIX 1 — Table Settings stuck open and contains row override

**Problem:** The Table Settings modal is opening immediately when the Waybill form loads, blocking the entire UI. It also shows the row override feature which was supposed to be stripped.

**Fix:**
- In `WaybillForm.tsx`, find the `ColumnManager` component. It must NOT open by default. It should only open when the user taps the "Table Settings" button in the Line Items toolbar.
- Ensure the `ColumnManager` is rendered inside a sheet/modal controlled by a state variable that defaults to `false`.
- Remove any row override section from the `ColumnManager` instance used by Waybill. If the shared `ColumnManager` component includes row override by default, pass a prop to hide it (e.g., `showRowOverride={false}` or similar). Check `ColumnManager`'s props interface.

---

## FIX 2 — Copy Invoice's save buttons exactly

**Problem:** The agent built a custom sticky bottom bar instead of copying Invoice's save button pattern.

**Fix:**
- Delete any custom save button, bottom bar, or FAB the agent created in `WaybillForm.tsx`.
- Open `SharedDocumentForm.tsx` or `NewInvoice.tsx`. Find how the Invoice form renders its save buttons — there's a save button and a cancel button together at the bottom.
- Copy that exact pattern into `WaybillForm.tsx`. Same imports, same components, same props, same styling, same position. Do not change anything. Do not describe the shape. Just copy it.
- If Invoice has a floating button AND a bottom save button, copy both. Copy whatever exists. Make it identical.

---

## VERIFICATION

```

bun run typecheck

```

Manual tests:
1. Open the Waybill form. The Table Settings modal must NOT appear. The form must be fully visible and usable.
2. Tap "Table Settings" in the Line Items toolbar. The modal opens. No row override section visible inside it.
3. The save button(s) at the bottom must look identical to Invoice's save/cancel buttons.
4. Save a valid waybill — must succeed.

Commit and push:
```

git add -A && git commit -m "fix: close table settings by default, remove row override, copy invoice save buttons" && git push origin main

```

---

## AFTER PUSH — REPORT

Create a report at `Task/reports/waybill-critical-fixes-report.md` documenting:
- How Table Settings default state was fixed
- How row override was removed
- How save buttons were copied from Invoice

Commit and push the report:
```

git add Task/reports/ && git commit -m "docs: waybill critical fixes report" && git push origin main

```

---

No questions. Execute everything. Push both the fixes and the report.
```

