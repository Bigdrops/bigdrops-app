Prompt 1 of 2 — Copy Invoice form structure, strip irrelevant features, apply Waybill header + transport + items

```
You are refactoring the Waybill creation form to reuse the same shared document form components that the Invoice module uses. This is a copy-and-strip task — not a build-from-scratch task.

---

## MANDATORY PREREAD

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
2. `src/components/document/SharedDocumentForm.tsx` — the Invoice form. Study what it imports and how it structures sections.
3. `src/pages/NewInvoice.tsx` — how Invoice wires the shared form.
4. `src/components/waybill/WaybillForm.tsx` — current Waybill form.
5. `src/components/invoice/mobile/mobileFormPrimitives.tsx` — primitives.

---

## OBJECTIVE

Restructure `WaybillForm.tsx` to use the same sub-components as `SharedDocumentForm.tsx`. Strip Invoice-only features. Apply Waybill-specific header, transport, and line items sections.

---

## STEP 1 — Import shared components

Replace the current form body structure by importing these from the Invoice stack:

- `FormLineItems` from `@/components/document/FormLineItems`
- `ColumnManager` from `@/components/ColumnManager`
- The FAB component — find its import path in `SharedDocumentForm.tsx` or `NewInvoice.tsx`
- `SectionLabel`, `CollapseCard`, `MobileField`, `MobileTextField`, `CompactSelectField` from `mobileFormPrimitives.tsx`

---

## STEP 2 — Strip Invoice-only features

Remove from WaybillForm:
- Group rows feature
- Row override feature
- Commercial Terms section
- Totals section
- Rate, amount, and any monetary fields
- Invoice-specific header fields

---

## STEP 3 — Waybill Header

- Type badge pill: "EXTERNAL DELIVERY NOTE" or "INTERNAL TRANSFER NOTE"
- Waybill Number: prominent, monospace, actual generated number — not a placeholder
- Row: DATE | TIME
- Client Picker block (External only, matching Invoice's CLIENT card pattern: briefcase icon, title, name, chevron)
- Row: LINKED INVOICE (button action with ✕ Unlink) | P.O. NUMBER (with eye toggle)
- Linked Invoice disabled until client is selected

---

## STEP 4 — Transport Details

- Transport Mode dropdown: blank default, options Vehicle/Hand/Courier/Blank
- Row: VEHICLE PLATE | DRIVER NAME
- Interlocking: Hand or Courier selected → Vehicle Plate removed from DOM

---

## STEP 5 — Line Items

- Use `FormLineItems` (the same component Invoice uses)
- Default visible columns: S/N, Description, Qty, Unit
- Hidden by default: Make, Part No, Condition, Custom Column
- Auto-hide: column shows when any row has data, hides when all rows empty
- Qty is numeric-only input
- Import Items button reconnected to existing `WaybillImportSheet`

---

## STEP 6 — Table Settings

- Use `ColumnManager` (the same component Invoice uses)
- Solid background — copy Invoice's styling exactly
- Toggle switches per column
- Editable column titles
- Reset-to-default button with confirmation popup
- **Drag handles:** add `GripVertical` icons (lucide-react) to all columns EXCEPT Description. Description is locked.
- Reordering affects ONLY the PDF output. On-screen form stays fixed.
- Terms & Conditions visibility toggle included here

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual tests:
1. Create External waybill — header shows client picker, linked invoice, correct fields.
2. Create Internal waybill — no client picker, no linked invoice.
3. Transport interlocking works.
4. Line items uses FormLineItems, auto-hide works.
5. Table Settings uses ColumnManager, drag handles present, reorder works, reset works.

Commit and push:
```

git add -A && git commit -m "refactor: copy invoice form structure to waybill, strip irrelevant features" && git push origin main

```

---

## NO PLANS. NO QUESTIONS. COPY, STRIP, PUSH.
```

---

