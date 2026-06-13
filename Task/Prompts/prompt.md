The save is failing because custom_fields is missing from the local SQLite schema. The remote database has it (we added it), but the offline table was never updated to include it.

---

Quick Diagnostic

Run this query against the local SQLite database to see all columns in waybills_local. If you don't have direct SQLite access, the agent can log the schema. But the fix is straightforward:

---



```
The waybill save fails with: "Could not find the 'custom_fields' column"

The remote Supabase database has `custom_fields` (added via migration). The local SQLite table `waybills_local` does NOT have this column. You must add it.

---

## FIX — Add `custom_fields` to the local SQLite schema

In `src/lib/native/waybillOffline.ts`, find the CREATE TABLE statement for `waybills_local`.

Add the column:
```

custom_fields text

```
(or `custom_fields jsonb` if SQLite supports it — otherwise use `text` and JSON.stringify when saving).

Also verify that ALL columns from the remote schema are present in the local schema. The full remote column list is:
`id, waybill_number, type, date, time, sender_name, receiver_name, receiver_signature_url, receiver_description, client_id, client_name, project_id, invoice_id, po_number, vehicle_plate, delivery_location, items, notes, status, created_by, created_at, archived_at, purpose, transport_mode, driver_name, custom_fields`

Check each one against the local CREATE TABLE. Add any that are missing.

---

## VERIFICATION

Run:
```

bun run typecheck

```

Then manual test:
1. Create an External waybill.
2. Add a client, one item with qty > 0, select unit.
3. Save. Must succeed and appear in list.

Commit and push:
```

git add -A && git commit -m "fix: add custom_fields and missing columns to local SQLite schema" && git push origin main

```
```

Target: Claude Code / Codex | Strategy: Add custom_fields column to local SQLite table, verify all columns match remote schema, test save.The error is clear: custom_fields exists in the remote Supabase database (we added it) but is missing from the local SQLite table. Prompt is above — the agent adds the column, verifies all columns match, and pushes.