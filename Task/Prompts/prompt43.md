

```
This is a copy task. You are not creating anything new. You are importing the Invoice form's Table Settings and item table into the Waybill form, then adding one improvement.

---

## MANDATORY PREREAD

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
2. `src/components/document/SharedDocumentForm.tsx` — find where the Table Settings modal and item table are imported. Note the exact import paths.
3. `src/pages/NewInvoice.tsx` — how the Invoice wires Table Settings and item table.
4. `src/components/waybill/WaybillForm.tsx` — where the custom table and Table Settings are currently rendered. You will replace them.

---

## STEP 1 — Copy Invoice's Item Table

Delete the custom item table from `WaybillForm.tsx`. Import the Invoice form's item table component directly. Use the exact same component, same props pattern.

Waybill-specific configuration:
- Default visible columns: S/N, Description, Qty, Unit
- Hidden by default, shown via Table Settings: Make, Part No, Condition, Custom Column
- Qty is numeric-only input
- Do NOT copy the invoice group-rows feature
- Do NOT copy the row override feature — it's not needed for waybills

---

## STEP 2 — Copy Invoice's Table Settings Modal

Delete the custom Table Settings modal from `WaybillForm.tsx`. Import the Invoice form's Table Settings modal directly. Use the exact same component, same props pattern, same styling — no changes to colors, backgrounds, or layout.

Copy everything from Invoice, including:
- The solid background
- The toggle switches per column
- The editable column titles
- The reset-to-default button and its popup/confirmation
- The Terms & Conditions visibility toggle

Waybill-specific additions:
- Add drag handles (grip icons from lucide-react) to every column row except Description. Description is locked — it cannot be moved.
- All other columns (S/N, Qty, Unit, Make, Part No, Condition, Custom Column) are reorderable via drag-and-drop.
- Column reordering affects only the PDF output layout. The on-screen form table grid stays fixed.

For drag-and-drop, use whatever lightweight library the project already uses, or implement simple up/down arrow buttons per row as a fallback. But the reordering must be interactive.

---

## STEP 3 — Copy Invoice's FAB

Delete the current floating save button from `WaybillForm.tsx`. Import the Invoice form's FAB component directly. Render it in the same position (bottom-right) with the same size, same icon, same behavior. No custom styling — use whatever the Invoice FAB uses.

---

## STEP 4 — Column Auto-Hide

The copied item table must respect the auto-hide rule: Make, Part No, Condition, and Custom Column are hidden by default. They auto-show when any row in that column has non-empty data. If all rows become empty, the column hides again. This is already in the Invoice table — verify it works for waybill columns.

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual tests:
1. Open a waybill form. The item table must look and behave exactly like the Invoice item table.
2. Tap Table Settings. The modal must look exactly like Invoice's Table Settings modal. Solid background, toggles, editable titles, reset button with popup.
3. Column titles editable. Toggle a column off — it disappears from the table.
4. Drag handles visible on all columns except Description. Reorder columns in Table Settings.
5. FAB must look exactly like Invoice's FAB — same color, same position, same icon.
6. Add data to Part No. column — column appears. Clear all Part No. data — column hides.

Commit and push:
```

git add -A && git commit -m "fix: copy invoice table, table settings, and FAB into waybill form" && git push origin main

```

---

## AFTER PUSH — REPORT

Create a report at `Task/reports/waybill-table-settings-copy-report.md` documenting:
- Which Invoice components were copied
- What Waybill-specific changes were made (column catalog, Description locked, drag handles, PDF-only reorder)
- What was deliberately excluded (row override, group rows)

Commit and push the report:
```

git add Task/reports/ && git commit -m "docs: table settings copy report" && git push origin main

```

---

## NO QUESTIONS. NO CREATION. COPY ONLY.
```

Target: Claude Code / Codex | Strategy: Delete custom Waybill table, Table Settings modal, and FAB. Import Invoice's versions directly. Add drag handles as the only enhancement. Exclude row override and group rows. Report after push.