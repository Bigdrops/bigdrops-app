Good. The

```
You are fixing the local SQLite schema mismatch that is preventing waybill saves. The remote Supabase database is now correct. The local offline database is NOT.

---

## THE ERROR

`NOT NULL constraint failed: waybills.waybill_no`

The remote database uses `waybill_number`. The local SQLite database uses `waybill_no`. Your code sends the payload to the local database first (offline-first architecture), and the local schema rejects it because the column names don't match.

---

## MANDATORY PREREAD

1. `src/lib/native/waybillOffline.ts` — the local SQLite schema definition. Find where the `waybills_local` table is created. Identify every column name.
2. `src/domain/waybill/waybillMutations.ts` — the save function. Find where it sends data to the local database. Check what field names it uses.
3. `src/pages/NewWaybill.tsx` — where the waybill number is generated and passed to the form.
4. `src/components/waybill/WaybillForm.tsx` — where the WAYBILL NO. field is rendered.

---

## FIX 1 — Align the local SQLite schema with the remote schema

In `waybillOffline.ts`, find the SQL statement that creates the `waybills_local` table.

**Change `waybill_no` to `waybill_number`** in the CREATE TABLE statement.

Also check for these mismatches and fix them:
- `quantity` → `qty` (in items JSON)
- Any other column names that differ from the remote schema

The remote schema column names are:
`id, waybill_number, type, date, time, sender_name, receiver_name, receiver_signature_url, receiver_description, client_id, client_name, project_id, invoice_id, po_number, vehicle_plate, delivery_location, items, notes, status, created_by, created_at, archived_at, purpose, transport_mode, driver_name, custom_fields`

Match these exactly in the local schema.

---

## FIX 2 — Bind the generated waybill number to the form field

In `NewWaybill.tsx`:
- The `useEffect` that calls `generateWaybillSequenceNumber()` must store the result in state.
- Pass that generated number to `WaybillForm` as the `waybill_number` value.

In `WaybillForm.tsx`:
- The WAYBILL NO. `MobileTextField` must have `value={waybill_number}` — the actual generated number.
- It must NOT have `placeholder="Auto-generated"` or `placeholder="AWB-—"` or any placeholder text that isn't the real number.
- If the number hasn't been generated yet (gateway not selected), show a disabled state. Once generated, display it.
- The field is read-only by default but the user can still edit it (manual override).

---

## FIX 3 — Ensure `qty` not `quantity` in items payload

In `waybillMutations.ts`, the save function maps items. Confirm it sends `qty` (not `quantity`) in the items array. The database CHECK constraint `check_items_json_structure` requires `qty` as the key.

---

## FIX 4 — Unit column must be a dropdown

In `WaybillForm.tsx`, the Unit input in the line items table is free-text. Find the Invoice form's unit dropdown/dictionary component. Import it. Replace the free-text Unit input with this dropdown.

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual test:
1. Open the app, create an External waybill.
2. The WAYBILL NO. field must show an actual generated number (e.g., `WBL-E-000001`).
3. Fill in client, add an item with description and qty > 0.
4. Select a unit from the dropdown.
5. Tap the FAB to save.
6. The waybill must save successfully and appear in the list.
7. Repeat for Internal waybill.

Commit and push:
```

git add -A && git commit -m "fix: align local SQLite schema, bind waybill number, unit dropdown" && git push origin main

```

---

## NO QUESTIONS. NO PLANS.

Fix all four issues. Verify. Push. Report the commit hash and whether saves succeed.
```

Target: Claude Code / Codex | Strategy: Fix local SQLite column name mismatch (waybill_no → waybill_number), bind generated waybill number as actual field value, ensure qty not quantity in payload, add unit dropdown from Invoice form.Migration locked. Now the agent fixes the local SQLite mismatch and waybill number binding — the two things actually blocking saves. Prompt is above.