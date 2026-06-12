

Pair 2 — Fix #6 + #7

Two issues, both in the form:

#6: User can tap "Link Invoice" before selecting a client. The invoice search pop-up opens with no client context. Fix: disable the Linked Invoice button until a client is selected. Show it grayed out. When client is selected, enable it.

#7: There are TWO client pickers — one at the top (correct) and a duplicate at the bottom of the form. Find the second one and delete it. Only the top client picker remains.

---



```
Fix two bugs in WaybillForm.tsx. Execute both, verify, push.

---

## BUG 1 — Linked Invoice accessible before Client is selected

**Symptom:** User can tap the Linked Invoice button and open the search pop-up before selecting a client. This makes no sense — you're linking an invoice to an unknown client.

**Fix:**
- In `WaybillForm.tsx`, locate the Linked Invoice button/action.
- Add a disabled state: the button is disabled (grayed out, not interactive) until a client is selected.
- When `client_id` is null/undefined: button shows muted styling, `cursor-not-allowed`, `opacity-50`, no onClick fires.
- When `client_id` has a value: button is active and functional.
- This applies to External waybills only. Internal waybills don't have this button at all (already hidden — confirm this is still correct).

---

## BUG 2 — Duplicate Client Picker

**Symptom:** There are TWO client picker blocks in the form — one at the top (correct) and another duplicate further down (incorrect).

**Fix:**
- Search `WaybillForm.tsx` for all instances of the client picker component or client selection UI.
- Identify the duplicate — it's likely a leftover from before the header reorder, or a second rendering in a different section.
- Delete the duplicate entirely. Keep only the one at the top of the form, directly below the type badge.
- Ensure no props, state, or handlers reference the deleted instance.

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual test:
1. Open External waybill form.
2. Before selecting a client: the Linked Invoice button must be disabled/grayed out. Tapping it does nothing.
3. Select a client: the Linked Invoice button becomes active.
4. Scroll the entire form. There must be exactly ONE client picker — at the top. No duplicate anywhere.
5. Open Internal waybill form. Confirm no client picker at all (correct behavior).

Commit and push:
```

git add -A && git commit -m "fix: disable linked invoice until client selected, remove duplicate client picker" && git push origin main

```
```

Target: Claude Code / Codex | Strategy: Two surgical fixes — guard Linked Invoice behind client selection, delete duplicate client picker.Got it. Moving straight to Pair 2 — the client-validation gate and the duplicate client picker. Here's the prompt for the agent.

---

Prompt Master applied

```
Fix two bugs in WaybillForm.tsx. Execute both, verify, push.

---

## BUG 1 — Linked Invoice accessible before Client is selected

**Symptom:** User can tap the Linked Invoice button and open the search pop-up before selecting a client. This makes no sense — you're linking an invoice to an unknown client.

**Fix:**
- In `WaybillForm.tsx`, locate the Linked Invoice button/action.
- Add a disabled state: the button is disabled (grayed out, not interactive) until a client is selected.
- When `client_id` is null/undefined: button shows muted styling, `cursor-not-allowed`, `opacity-50`, no onClick fires.
- When `client_id` has a value: button is active and functional.
- This applies to External waybills only. Internal waybills don't have this button at all (already hidden — confirm this is still correct).

---

## BUG 2 — Duplicate Client Picker

**Symptom:** There are TWO client picker blocks in the form — one at the top (correct) and another duplicate further down (incorrect).

**Fix:**
- Search `WaybillForm.tsx` for all instances of the client picker component or client selection UI.
- Identify the duplicate — it's likely a leftover from before the header reorder, or a second rendering in a different section.
- Delete the duplicate entirely. Keep only the one at the top of the form, directly below the type badge.
- Ensure no props, state, or handlers reference the deleted instance.

---

## VERIFICATION

Run:
```

bun run typecheck

```

Manual test:
1. Open External waybill form.
2. Before selecting a client: the Linked Invoice button must be disabled/grayed out. Tapping it does nothing.
3. Select a client: the Linked Invoice button becomes active.
4. Scroll the entire form. There must be exactly ONE client picker — at the top. No duplicate anywhere.
5. Open Internal waybill form. Confirm no client picker at all (correct behavior).

Commit and push:
```

git add -A && git commit -m "fix: disable linked invoice until client selected, remove duplicate client picker" && git push origin main

```
```

