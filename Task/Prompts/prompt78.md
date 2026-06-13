

```
Fix two missing features in the Waybill form. Execute both, verify, push.

---

## MANDATORY PREREAD

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
2. `src/components/document/SharedDocumentForm.tsx` — the Invoice form. Find the Terms & Conditions section and the Import Items flow. You will replicate both.
3. `src/components/waybill/WaybillForm.tsx` — current form where fixes are applied.
4. `src/components/invoice/mobile/mobileFormPrimitives.tsx` — `CollapseCard` component for Terms & Conditions.

---

## FIX 1 — Add Terms & Conditions section

**Problem:** The Terms & Conditions section is completely missing from the waybill form.

**Fix:**
- Add a `CollapseCard` (from `mobileFormPrimitives.tsx`) at the bottom of the form, below Notes.
- Icon: `ScrollText` from lucide-react.
- Title: "Terms & Conditions".
- Starts **collapsed by default** (`open={false}`).
- Contains an editable textarea (use the shared `RichTextEditor` component, lazy-loaded like Notes).
- **Blank by default.** No prefilled text of any kind.
- Visibility controlled by the Table Settings modal. If toggled off, the CollapseCard is hidden from the form and PDF.
- If the textarea is empty, nothing renders on PDF.
- Replicate how the Invoice form's Terms & Conditions is structured — import the same component if possible. Do not build a custom version.

---

## FIX 2 — Fix Import Items button

**Problem:** The Import Items button in the Line Items toolbar does nothing when tapped.

**Fix:**
- Find the Invoice form's Import Items flow. It opens a sheet/modal where users can import items from JSON, CSV, or another source.
- Import that exact same component and wire it to the Waybill form's "Import Items" button.
- The imported items must map to the waybill's item structure: `{ description, qty, unit }` with optional `part_number`, `condition`, and `make`.
- After import, items populate the line items table.
- The button must respond to taps immediately — no delay, no silent failure.

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual test:
1. Open a waybill form. Scroll to the bottom. Terms & Conditions CollapseCard must be present, collapsed. Expand it — editable textarea, blank.
2. Go to Line Items. Tap "Import Items". The import sheet must open. Import an item — it must appear in the table.
3. Save a waybill with Terms text filled in. Confirm it persists.

Commit and push:
```

git add -A && git commit -m "fix: add Terms & Conditions section, fix Import Items button" && git push origin main

```

---

## NO QUESTIONS. EXECUTE.
```

Target: Claude Code / Codex | Strategy: Two fixes — add missing Terms & Conditions using Invoice's pattern, fix Import Items by importing Invoice's working flow.Pair 3 prompt is above. Terms & Conditions added via CollapseCard (matching Invoice), Import Items wired to Invoice's existing import flow.