Prompt 2 of 2 — Apply remaining Waybill customizations: custody, signatures, notes, terms, FAB, save, PDF

Send this AFTER Prompt 1 is complete.

```
You are completing the Waybill form refactor. The shared Invoice form structure is now in place. Apply the remaining Waybill-specific sections and finalize save behavior.

---

## MANDATORY PREREAD

1. `src/components/waybill/WaybillForm.tsx` — current state after Prompt 1.
2. `src/components/waybill/waybillUtils.ts` — types and helpers.

---

## STEP 1 — Custody Details (below items table)

Add a section after the line items:
- `SectionLabel` with `Users` icon, title "Custody Details"
- Row: DELIVERED BY | RECEIVED BY (two text inputs side by side)
- No validation blockers on these fields
- No helper text beneath them

---

## STEP 2 — Signatures

- `SectionLabel` with `PenTool` icon, title "Signatures"
- Three eye toggles: Global toggle in the SectionLabel header (right-aligned). Sender toggle inside the Sender block. Receiver toggle inside the Receiver block. Never bundle all three in one row.
- Sender block (Delivered By): 3 sources — Saved Signature, Upload, Draw
- Receiver block (Collected By): External waybills get Upload + Draw only. Internal waybills get all three (Saved, Upload, Draw).
- No Signature Status, Confidence, or Evidence fields.

---

## STEP 3 — Notes

- `CollapseCard` with `ScrollText` icon, collapsed by default
- Editable title (tap "Notes" label to rename)
- Rich text editor (lazy-loaded, same as Invoice uses)
- Bold, Italic, Underline, Strikethrough, Bulleted List, Numbered List, Blockquote, Code Block in toolbar

---

## STEP 4 — Terms & Conditions

- `CollapseCard` with `ScrollText` icon, collapsed by default
- Blank by default — no prefilled text
- Editable textarea (use rich text editor)
- Visibility controlled by Table Settings toggle
- If blank, does not render on PDF

---

## STEP 5 — Save

- Copy Invoice's FAB component exactly — same import, same styling, same position (bottom-right)
- No Save button in any top bar
- Only 4 save blockers: client missing (External only), waybill number missing, items list empty, any item missing description or qty ≤ 0
- UUID fields sanitized: empty string → null for client_id, project_id, invoice_id, created_by

---

## STEP 6 — PDF Rules

In the PDF generation logic:
- External waybill title: "Waybill/Delivery note" (not "External Waybill")
- Blank/empty fields render nothing on PDF (no "—" dash)
- Receiver signature blank renders empty signable space (no "Acknowledgement pending" text)

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual tests:
1. Custody Details visible below items, no save blockers on these fields.
2. Signatures: eye toggles correctly placed. Sender has 3 sources. Receiver conditional sources work.
3. Notes collapsed by default, title editable, toolbar visible.
4. Terms & Conditions collapsed, blank, visibility controlled by Table Settings.
5. FAB matches Invoice FAB exactly.
6. Save works with valid data. Save blocked only by the 4 conditions.

Commit and push:
```

git add -A && git commit -m "feat: complete waybill form with custody, signatures, notes, terms, FAB, and PDF rules" && git push origin main

```

---

## AFTER PUSH — REPORT

Create report at `Task/reports/waybill-shared-form-refactor.md` documenting:
- What was copied from Invoice
- What was stripped
- What waybill-specific additions were made

Commit and push the report:
```

git add Task/reports/ && git commit -m "docs: waybill shared form refactor report" && git push origin main

```

---

## NO PLANS. NO QUESTIONS. EXECUTE AND PUSH.
```