
```
You are fixing the Waybill form rebuild. The previous version built custom code where the Invoice form already has proven, working modules. Your job is to delete custom code and import the shared modules instead. This is a surgical correction, not another rebuild.

---

## MANDATORY PREREAD

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
2. `src/components/document/SharedDocumentForm.tsx` — the Invoice form. Find every shared module reference.
3. `src/pages/NewInvoice.tsx` — how Invoice wires modules.
4. `src/components/waybill/WaybillForm.tsx` — current (broken) form.

---

## FIX 1 — HEADER FIELD ORDER

**Problem:** Fields are in wrong sequence. "[Auto-generated]" banner exists.

**Fix:**
- Delete the "Waybill Number: [Auto-generated]" text block entirely. It should not exist anywhere in the component.
- Reorder the top block to this exact structure:

```

[Type badge pill: "EXTERNAL DELIVERY NOTE" or "INTERNAL TRANSFER NOTE"]
[Client Picker Block]  ← Absolute top, matches Invoice's CLIENT card (External only)
[Row: WAYBILL NO. | PO NUMBER]  ← Waybill No. on left, PO Number on right
[Row: DATE | TIME]  ← Date on left, Time on right

```

- The waybill number must be displayed directly inside the WAYBILL NO. input field, monospace, showing the actual generated number. No placeholder. No banner.

---

## FIX 2 — CLIENT PICKER BLOCK

**Problem:** Missing or misplaced.

**Fix:**
- This must be the first content block after the type badge.
- Copy the Invoice form's CLIENT card pattern exactly: briefcase icon, "CLIENT" title, selected client name as subtitle, chevron on right.
- For Internal waybills: hide this block entirely.
- Use the same component or pattern that `SharedDocumentForm.tsx` uses for its client selection. Do not build a new one.

---

## FIX 3 — LINKED INVOICE

**Problem:** Rendered as a text input field.

**Fix:**
- Delete the text input entirely.
- Import the same "Link Documents" action used by the Invoice form. This is a button that opens a search pop-up, authenticates, and links an existing invoice.
- Display the linked invoice number as a badge/chip with an "✕ Unlink" action next to it.
- For Internal waybills: this is hidden.
- Find this exact mechanism in the Invoice form's codebase and import it. Do not build a custom version.

---

## FIX 4 — NOTES MODULE

**Problem:** Custom rich text editor built from scratch.

**Fix:**
- Delete the custom rich text editor entirely.
- Find the Notes/rich text module used by `SharedDocumentForm.tsx`. Import and render that exact component.
- The Notes title must be editable (tap "Notes" label → rename). If the Invoice module doesn't support this, add that one feature. But start by importing the shared module.
- Notes must render inside a `CollapseCard` (from `mobileFormPrimitives.tsx`) that starts **collapsed by default**.

---

## FIX 5 — TERMS & CONDITIONS

**Problem:** Missing entirely.

**Fix:**
- Add a `CollapseCard` with `ScrollText` icon, title "Terms & Conditions".
- Must start **collapsed by default**.
- Contains an editable textarea, blank by default.
- Visibility controlled by Table Settings toggle. If toggled off, the entire CollapseCard is hidden from the form and PDF.
- If blank, does not render on PDF.

---

## FIX 6 — ITEM TABLE

**Problem:** Custom table built from scratch. Import Items button broken.

**Fix:**
- Delete the custom item table entirely.
- Import the Invoice form's item table component. This is a shared component used by `SharedDocumentForm.tsx`. Find it, import it, render it.
- Configure it for waybill columns: S/N, Description, Qty (numeric), Unit, Make, Part No, Condition, Custom Column.
- Default visible: S/N, Description, Qty, Unit.
- Auto-hide: Make, Part No, Condition, Custom Column show when any row has data.
- Do NOT port the invoice group-rows feature.
- The Import Items button must work — use the exact same import flow as the Invoice table.
- Insert-row-between-rows must work — same behavior as Invoice table.

---

## FIX 7 — TABLE SETTINGS MODAL

**Problem:** Transparent background, no drag handles, no reordering logic.

**Fix:**
- Delete the custom modal.
- Import the Invoice's Table Settings modal component.
- Apply these waybill-specific rules:
  1. Background: solid `bg-[var(--bd-bg-card)]` — no transparency. Match Invoice's modal exactly.
  2. Column toggles: on/off switches for each column.
  3. Column titles: editable inline (tap to rename).
  4. Terms & Conditions visibility toggle: included here.
  5. **Column reordering (PDF only):** Add drag handles (grip icons from lucide-react) to every column row EXCEPT Description. Description is locked — it cannot be moved. All other columns (S/N, Qty, Unit, Make, Part No, Condition, Custom) are drag-and-drop reorderable. This reordering affects ONLY the PDF output layout — the on-screen form table grid stays fixed.
  6. If the Invoice modal doesn't have drag handles, build them using a lightweight drag-and-drop library already in the project, or implement simple up/down arrow buttons per row as a fallback. But the reordering must be interactive, not static text rows.

---

## FIX 8 — SIGNATURES SECTION

**Problem:** Eye toggles bundled together in one row. Saved signature broken. Upload/draw extraction broken.

**Fix:**
- **Eye toggle layout:** 
  - The **Global toggle** (hides entire Signatures section) sits in the `SectionLabel` header row, right-aligned.
  - The **Sender toggle** sits inside the Sender/Delivered By block, next to its title.
  - The **Receiver toggle** sits inside the Receiver/Collected By block, next to its title.
  - Never bundle all three together in one row.

- **Sender signature sources:** Import the exact same signature capture mechanism used by the Invoice form for saved signatures. This pulls from the user's profile. If broken, match the Invoice's working implementation exactly. Do not build a new hook.

- **Upload/Draw extraction:** Import the CSR form's signature extraction logic. The app has an existing ability to extract a signature from a paper photo without the background. Find that module and reuse it. Do not build new upload/draw handlers.

- **Receiver conditional sources:** External: only Upload and Draw (no Saved). Internal: all three.

---

## FIX 9 — FLOATING SAVE BUTTON

**Problem:** Wrong color token — transparent/white instead of primary.

**Fix:**
- Import the exact same FAB component the Invoice form uses.
- Apply `bg-[var(--bd-primary)] text-[var(--bd-primary-foreground)]` — match the Invoice's FAB exactly.
- Remove any Save button from the top action bar. Only the FAB saves.

---

## FIX 10 — SHELL CHROME REGRESSION

**Problem:** Back arrow, "Waybills" title, Save button appearing in top bar. This was fixed in Phase 1 but regressed.

**Fix:**
- Ensure the Waybill form overlay renders as a clean full-screen overlay with no dashboard shell chrome.
- No back arrow in a shell bar. No "Waybills" title. No Save button in a top bar.
- The close button is the X in the overlay header. Navigation is handled by the overlay's own close logic.

---

## FIX 11 — PDF TITLE

**Problem:** PDF header says "External Waybill" or similar.

**Fix:**
- In the PDF generation logic (`WaybillPDF.tsx` or wherever the PDF header is rendered), the title for external waybills must read exactly: "Waybill/Delivery note".
- For internal waybills: "Internal Transfer Note" (verify this is correct — if the client hasn't specified, use "Waybill/Transfer note").

---

## FIX 12 — NOTES & TERMS DEFAULT STATE

**Problem:** Both render open by default.

**Fix:**
- Both Notes and Terms & Conditions must be `CollapseCard` components that start **collapsed** (folded) on page load.
- The user expands them by tapping. They never initialize open.

---

## ABSOLUTE RULES

- **Import shared modules. Do not build custom replacements.** Before writing any new code, ask: "Does the Invoice form already solve this?" If yes, import it.
- **Delete custom code aggressively.** Custom rich text editor → delete. Custom item table → delete. Custom Table Settings modal → delete. Custom Linked Invoice field → delete.
- **Match the Invoice form's visual tokens exactly.** Every background, border, text color, and component style must be identical.
- **No hardcoded hex values anywhere.** Only `var(--bd-*)` tokens.
- **Verify after every fix.** Run `bun run typecheck` after each file change.

---

## FILES TO MODIFY

- `src/components/waybill/WaybillForm.tsx` — all fixes above
- `src/components/waybill/WaybillPDF.tsx` — PDF title fix (if PDF generation is in a separate file)

## FILES TO REFERENCE (READ ONLY)

- `src/components/document/SharedDocumentForm.tsx` — source of all shared modules
- `src/pages/NewInvoice.tsx` — wiring reference
- `src/components/invoice/mobile/mobileFormPrimitives.tsx` — primitives
- CSR form signature components (locate and read for extraction logic)

---

## SUCCESS CRITERIA

After all fixes, the form must pass this checklist:

### Header
- [ ] Type badge at top.
- [ ] Client picker block directly below badge (External only).
- [ ] Row: WAYBILL NO. | PO NUMBER.
- [ ] Row: DATE | TIME.
- [ ] No "[Auto-generated]" banner anywhere.
- [ ] Waybill number visible inside the WAYBILL NO. input.

### Content Sections
- [ ] Transport section with interlocking.
- [ ] Line Items: Invoice's table component, toolbar working, Import Items working.
- [ ] Custody Details: DELIVERED BY | RECEIVED BY.
- [ ] Signatures: eye toggles correctly placed (Global in header, Sender/Receiver inside their blocks). Saved signature works. Upload/draw extraction works.
- [ ] Notes: collapsed CollapseCard by default. Invoice's rich text module. Editable title.
- [ ] Terms & Conditions: collapsed CollapseCard by default. Blank. Editable. Visibility from Table Settings.

### Table Settings
- [ ] Solid background matching Invoice.
- [ ] Toggle switches per column.
- [ ] Editable column titles.
- [ ] Drag handles on all columns except Description.
- [ ] Description locked in position.
- [ ] Reorder affects PDF only.

### Save & Shell
- [ ] FAB: primary color token, bottom-right. No Save in top bar.
- [ ] No dashboard shell chrome (no back arrow in shell, no "Waybills" title).
- [ ] 4 save blockers only.

### Technical
- [ ] `bun run typecheck` — zero errors.
- [ ] `bun run lint` — no new errors.
- [ ] `bun run audit:load` — no regressions.
- [ ] Zero hardcoded hex values in the form body.

---

## EXECUTION

Execute all fixes in order. After each fix, run `bun run typecheck`. Fix errors before proceeding.

After all fixes pass: commit with message `fix: import shared modules, correct header order, add missing T&C, fix signatures, fix table settings, fix FAB token`

Push to main.

No questions. No plans. No progress reports. Fix and push.
```

