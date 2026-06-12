
You are executing Phase 2 of the Waybill form rebuild. This is a complete layout and behavior restructure. The gateway overlay is done; now the form itself must match the Invoice form's visual composition and implement all remaining features from the fix roadmap.

---

## MANDATORY PREREAD

Read these files in full before writing a single line:

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
2. `.agents/skills/frontend-design/SKILL.md` — anti-"AI slop" production aesthetics.
3. `docs/waybillfixroadmap.md` — Sections 2-7. This is your task list.
4. `src/components/document/SharedDocumentForm.tsx` — the Invoice form. Your output must look like its sibling.
5. `src/components/invoice/mobile/mobileFormPrimitives.tsx` — `SectionLabel`, `CollapseCard`, `pageCardCls`, `fieldCls`, `labelCls`, `MobileField`, `MobileTextField`, `CompactSelectField`, `ChipButton`, `SegmentedControl`. Use these as your only form building blocks.
6. `src/components/document/FormHeader.tsx` — the header pattern with type badge, title, and client picker block. You will replicate this structure.
7. `src/pages/NewInvoice.tsx` — how the Invoice creation page wires form, columns, and save logic. Use as integration reference.
8. `src/components/waybill/waybillUtils.ts` — types, sequence generator, helpers.
9. `src/components/waybill/WaybillForm.tsx` — current form (will be heavily rewritten).
10. `src/components/waybill/WaybillFormOverlay.tsx` — overlay shell (already fixed, may need minor adjustments).

---

## ABSOLUTE RULES

- **No shadcn `Card`, `Label`, or `Input` components in the form body.** Use only the primitives from `mobileFormPrimitives.tsx`.
- **No hardcoded colors, fonts, or spacing.** Every visual property uses a `var(--bd-*)` design token or a Tailwind utility that references the project's design system.
- **No `Card` wrappers around sections.** Sections are separated by `SectionLabel` dividers — a colored dot + uppercase title + optional action buttons. Fields follow directly after the divider, edge-to-edge.
- **The Invoice form is your visual law.** Every layout decision must answer the question: "Does this look like `SharedDocumentForm.tsx`?" If no, fix it.
- **Karpathy discipline:** think before editing, surgical changes, verify after each file.

---

## IMPLEMENTATION STEPS — EXECUTE IN ORDER

---

### STEP 1 — Delete architectural violations from WaybillForm.tsx

Before rebuilding, surgically remove what shouldn't exist:

1. Remove Type dropdown entirely. Type comes from props (`type: WaybillType`).
2. Remove Status dropdown. All new waybills are `'dispatched'`.
3. Remove Signature Status, Confidence, Evidence fields. Delete their state variables and types.
4. If there are three separate notes fields (General, Sender, Receiver), merge them into one.
5. Remove any sender/receiver validation from save blockers (keep only the 4 from roadmap Section 4).

---

### STEP 2 — Rebuild the form header block

The top of the form must mirror the Invoice form's density and structure.

**2.1 Type badge pill**
- Small pill/badge: "EXTERNAL DELIVERY NOTE" or "INTERNAL TRANSFER NOTE".
- Use `bg-[var(--bd-primary)]/10 text-[var(--bd-primary)]` for external, `bg-[var(--bd-warning)]/10 text-[var(--bd-warning)]` for internal.
- Rounded, uppercase, small font.

**2.2 Waybill Number**
- Large, monospace, `text-[var(--bd-text)]`.
- Displays the actual generated number from `generateWaybillSequenceNumber()` or the passed-in value.
- Never a placeholder. Never "[Auto-generated]".
- Read-only display; editable if the user taps it (manual override — optional, but the field must show the number).

**2.3 Date/Time row**
- A two-column row: `DATE | TIME` side by side.
- Date: date input, default today.
- Time: time input, default now.
- Use `MobileTextField` or equivalent compact input styling.

**2.4 Client Picker Block (External only)**
- Prominent block, full-width, matching the Invoice form's CLIENT card.
- Structure: briefcase icon on left, "CLIENT" title, selected client name as subtitle, chevron on right.
- Tapping opens the client selection sheet/dropdown.
- Background: `bg-[var(--bd-bg-card)]`, border: `border-[var(--bd-border)]`, rounded.
- For Internal waybills: this block is hidden entirely.

**2.5 Linked Invoice / P.O. Number row (External only)**
- Two-column row: `LINKED INVOICE | P.O. NUMBER`.
- Each field has an **eye toggle icon** on its label (lucide-react Eye / EyeOff).
- When toggled off: field opacity reduces to `opacity-50`. This is PDF exclusion marking — no data change.
- For Internal waybills: this row is hidden entirely.

---

### STEP 3 — Build Transport Details section

**SectionLabel** with `Truck` icon, title "Transport Details".

Below it, in a single compact block (no Card wrapper):

- **Transport Mode dropdown:** Compact dropdown style (keep what's already used). Default: blank/null. Options: `Vehicle`, `Hand`, `Courier`, `Blank` (sets to null). Use `CompactSelectField`.
- **Vehicle Plate / Driver Name row:** Two-column row. Vehicle Plate input (uppercase, monospace), Driver Name input (text).
- **Interlocking logic:**
  - Mode `Hand` or `Courier` → hide Vehicle Plate (remove from DOM).
  - Mode `Vehicle` → both visible.
  - Mode `Blank` → both visible, optional.
  - No "Self Pick-Up" option unless the spec adds it later; current prototype uses Hand/Courier/Vehicle only.

---

### STEP 4 — Build Line Items section

**SectionLabel** with `List` icon, title "Line Items", and a **count badge** showing number of items.

**Toolbar row** (directly below SectionLabel):
- Left: "Import Items" button (with upload/entry icon from lucide-react).
- Left: "Table Settings" button (with sliders icon).
- Right: "Rows" label with count.
- Use `ChipButton` or small `Button variant="outline"` styled with tokens.

**Table:**
- Always visible columns: **S/N** (auto-increment, read-only, narrow), **Description** (flexible, text input), **Qty** (narrow, **numeric input only**), **Unit** (narrow, text input, toggleable from Table Settings).
- Hidden by default, shown via Table Settings or auto-scan: **Make** (text, brand name), **Part No.** (text), **Condition** (text), **Custom Column** (text).
- **Table Settings modal controls:** column visibility toggles, column title editing (all titles editable except S/N), column ordering.
- **Auto-hide rule:** A hidden-by-default column auto-shows when **any row** has non-empty data for that column. If **all rows** become empty, the column hides again. This applies to Make, Part No, Condition, Custom Column.
- Table must fit the viewport. Use `w-full` with `overflow-x-auto` only if columns exceed width. No bleeding.
- Add item row button at table bottom. Delete row button (trash icon) per row.
- Each row: drag handle (optional, for reorder) on left, delete on right.

**Table Settings Modal:**
- Opens from the "Table Settings" toolbar button.
- Lists all available columns with toggle switches.
- Column titles are editable inline (tap to rename: e.g., "Description" → "Items", "Make" → "Brand").
- Terms & Conditions visibility toggle is here (see Step 8).
- Changes apply immediately to the table.

---

### STEP 5 — Build Custody Details section (below items)

**SectionLabel** with `Users` icon, title "Custody Details".

- Two-column row: **DELIVERED BY** (sender_name) | **RECEIVED BY** (receiver_name).
- Both are text inputs. No helper text. No validation blockers.
- These are optional at save time.

---

### STEP 6 — Build Signatures section

**SectionLabel** with `PenTool` icon, title "Signatures".

**Three eye toggle icons** in the section header row (right-aligned):
1. **Global toggle:** Hides the entire Signatures section.
2. **Sender toggle:** Hides the Sender/Delivered By signature block.
3. **Receiver toggle:** Hides the Receiver/Collected By signature block.

Use `Eye` / `EyeOff` icons from lucide-react. Small, `text-[var(--bd-text-muted)]`, hover to `text-[var(--bd-text)]`.

**Sender / Delivered By block:**
- Three source tabs/buttons: **Saved Signature** (pulls from user profile), **Upload** (file picker), **Draw** (canvas capture).
- One source active at a time. Renders the corresponding input/signature display.

**Receiver / Collected By block:**
- **External waybill:** Only 2 sources — **Upload** and **Draw** (no Saved, receiver is a client without a profile).
- **Internal waybill:** All 3 sources — **Saved**, **Upload**, **Draw**.

**When a block is toggled hidden via eye icon:**
- Removed from the form DOM.
- On the PDF, renders as an empty signable blank space.

**No Signature Status, Confidence, or Evidence fields exist.**

---

### STEP 7 — Build Notes section

**SectionLabel** with `FileText` icon. The title is **editable** — the user can tap the label "Notes" and rename it to "Book", "Special Instructions", or any custom text. This custom title persists per waybill (store in `custom_fields` or a dedicated field).

**Rich text toolbar** above the textarea:
- Bold, Italic, Underline, Strikethrough.
- Bulleted List, Numbered List.
- Blockquote, Code Block.
- Use a lightweight contentEditable-based editor if the project already has one; otherwise, implement a simple toolbar that toggles formatting on selected text within a textarea or rich text div.
- Output stored as HTML string in the `notes` field (or `custom_fields.notes` if the column is JSONB).

---

### STEP 8 — Build Terms & Conditions section

**CollapseCard** with `ScrollText` icon, title "Terms & Conditions".

- **Blank by default.** No prefilled text.
- **Editable** by the operator per waybill. Plain textarea.
- **Visibility controlled by Table Settings.** There is a toggle in the Table Settings modal: "Show Terms & Conditions". No eye toggle on the section itself. No special permissions.
- **If blank:** the section does not render on the PDF. If it has text, it renders.
- **If toggled off in Table Settings:** the entire section is hidden from the form and the PDF.

---

### STEP 9 — Floating Save Button

**Remove** any Save button from the top action bar.

**Add** the exact same Floating Action Button (FAB) component used by the Invoice form. Import it from wherever `SharedDocumentForm.tsx` or `NewInvoice.tsx` gets it.

- Fixed position: `bottom-6 right-6`, `z-50`.
- Round: `w-14 h-14 rounded-full`.
- Background: `bg-[var(--bd-primary)]`, text/icon: `text-[var(--bd-primary-foreground)]`.
- Icon: `Save` or diskette from lucide-react.
- Shows loading spinner when `isSaving` is true.
- Calls `onSave` when tapped.

---

### STEP 10 — Validation: 4 Save Blockers Only

Implement client-side validation in the save handler. **Only these 4 conditions block save:**

| # | Condition | Applies To |
|---|-----------|------------|
| 1 | Client account not selected | External only |
| 2 | Waybill number missing or invalid | All |
| 3 | Line items list is empty | All |
| 4 | Any item missing Description or Qty ≤ 0 | All |

**Nothing else blocks save.** Sender, receiver, driver, plate, transport mode, signatures, notes, terms — all optional. Show a specific toast/alert for each failed condition. Surface all database errors via toast.

---

### STEP 11 — Wiring in NewWaybill.tsx

Update the NewWaybill page to integrate the rebuilt form:

- After gateway selection, render the `WaybillFormOverlay` with `WaybillForm` inside.
- `onSave`: call the save mutation. Generate waybill number if not already set. Set `purpose = 'Supply'` (default) for external; `null` for internal. Catch errors, display via toast.
- `onClose`: navigate back or close overlay.
- Pass `type` from gateway to form.
- Handle `isSaving` state.

---

## FILES TO CREATE

- None. Modify existing files only.

## FILES TO MODIFY

- `src/components/waybill/WaybillForm.tsx` — major restructure (Steps 1-8).
- `src/pages/NewWaybill.tsx` — wiring updates (Step 11).
- `src/components/waybill/WaybillFormOverlay.tsx` — ensure edge-to-edge, no shell chrome, portal rendering (from Phase 1 fix; verify it's still correct).

## FILES TO REFERENCE (READ ONLY)

- `docs/waybillfixroadmap.md`
- `src/components/document/SharedDocumentForm.tsx`
- `src/components/invoice/mobile/mobileFormPrimitives.tsx`
- `src/components/document/FormHeader.tsx`
- `src/pages/NewInvoice.tsx`
- `src/components/waybill/waybillUtils.ts`

---

## VERIFICATION

After each file edit: `bun run typecheck`. Fix all errors.

After all changes: `bun run typecheck && bun run lint && bun run audit:load`. All must pass.

---

## SUCCESS CRITERIA

Open the app, create a new waybill. The form must:

### Top Block
- [ ] Type badge pill visible (EXTERNAL DELIVERY NOTE or INTERNAL TRANSFER NOTE).
- [ ] Waybill number is prominent, monospace, showing the actual generated number.
- [ ] `DATE | TIME` in a two-column row.
- [ ] External: Client picker block (briefcase icon, CLIENT title, selected name, chevron). Internal: this block is hidden.
- [ ] External: `LINKED INVOICE | P.O. NUMBER` in two-column row with eye toggles. Internal: hidden.

### Transport
- [ ] Transport Mode: blank default, compact dropdown.
- [ ] `VEHICLE PLATE | DRIVER NAME` in two-column row.
- [ ] Hand or Courier selected: Vehicle Plate removed from DOM.

### Line Items
- [ ] Toolbar: Import Items, Table Settings, Rows count.
- [ ] Table: S/N, Description, Qty (numeric), Unit visible by default.
- [ ] Make, Part No, Condition hidden by default, auto-show on data.
- [ ] Table Settings modal: toggles, editable titles, T&C visibility.
- [ ] Table fits viewport, no bleeding.

### Below Items
- [ ] Custody Details: `DELIVERED BY | RECEIVED BY` in two-column row.
- [ ] Signatures: SectionLabel with 3 eye toggles. Sender has 3 sources. Receiver has 2 (External) or 3 (Internal). No bloat fields.
- [ ] Notes: editable title, rich text toolbar above textarea.
- [ ] Terms & Conditions: CollapseCard, blank default, editable. Visibility from Table Settings.

### Save & Validation
- [ ] Floating save button in bottom-right (Invoice's FAB component). No Save in top bar.
- [ ] Save without client (External) → blocked with error.
- [ ] Save without items → blocked.
- [ ] Save with item missing description or qty ≤ 0 → blocked.
- [ ] Valid waybill → saves, appears in list.
- [ ] Saving with blank sender/receiver → succeeds.

### Technical
- [ ] Zero hardcoded hex values in the form body.
- [ ] No shadcn `Card` components in the form body.
- [ ] `bun run typecheck`, `bun run lint`, `bun run audit:load` all pass.

---

## EXECUTION RULES

- No questions. No progress reports. Execute all steps in order.
- Commit after Step 1-8 are complete and verified: `feat: rebuild waybill form layout with SectionLabel dividers, two-column rows, and all roadmap fixes`
- Push to main.
- Then execute Steps 9-11 if not already included.
- Final commit: `feat: add floating save button and finalize waybill form wiring`
- Push to main.
```


