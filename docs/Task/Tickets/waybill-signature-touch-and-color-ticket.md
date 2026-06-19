# Ticket: Waybill Signature — Touch Drawing & Hardcoded Colours

**Status:** Parked — needs verification on next pass
**Component:** `src/components/waybill/WaybillSignatures.tsx`
**Related:** `src/components/waybill/WaybillForm.tsx` (parent, unaffected)
**Date opened:** 2026-06-19

---

## Issue 1: Signature pad doesn't draw on phone (touch)

**Symptom:** `DrawPad` canvas works fine with mouse on PC, but does not
respond to finger input on a real phone.

**Root cause (suspected):** Original implementation used separate
`onMouseDown/Move/Up` and `onTouchStart/Move/End` handlers. Touch-specific
event handling on real touchscreens is fragile (passive listener quirks,
multi-touch arrays, browser gesture interception) compared to mouse events.

**Fix applied:** Rewrote `DrawPad` to use **Pointer Events** instead —
`onPointerDown` / `onPointerMove` / `onPointerUp` / `onPointerCancel` /
`onPointerLeave`, with `canvas.setPointerCapture(e.pointerId)` so the
canvas keeps receiving the gesture even if the finger drifts slightly off
its bounds. This unifies mouse, touch, and pen into one code path and
removes the touch-specific branch entirely.

**Status:** Fix written, delivered as full file replacement. **Not yet
verified on an actual phone** — needs to be tested after the file is
applied to the repo.

**Verification steps when resumed:**
1. Confirm the new `DrawPad` (Pointer Events version) is actually in the
   repo — check git diff or open the file and confirm `onPointerDown` etc.
   are present, not `onTouchStart`.
2. Test drawing with a finger on a real phone (not emulator).
3. Run `bun run typecheck` and `bun run lint` — confirm 0 new errors.

---

## Issue 2: "Signatures" / "Pick" / "Shown" buttons still show wrong colours

**Symptom:** Buttons visually still show colours that don't match the
app's `--bd-*` design tokens, despite the JSX already using
`var(--bd-*)` classes (e.g. `bg-[var(--bd-indigo-bg)]`,
`text-[var(--bd-indigo)]`, `border-[var(--bd-indigo-border)]`).

**What's confirmed already fixed (verified by agent report, 9 line
changes in `PickSignatorySheet`):**
- `text-muted-foreground` → `text-[var(--bd-text-muted)]` (multiple instances)
- `border border-border bg-card` → `border border-[var(--bd-border)] bg-[var(--bd-surface)]`
- `hover:bg-muted/40` → `hover:bg-[var(--bd-bg2)]`
- `bg-muted` → `bg-[var(--bd-bg2)]`
- `text-muted-foreground/60` → `text-[var(--bd-text-muted)]/60`

**Two more caught afterward (included in the latest file, not yet
confirmed live):**
- Signature thumbnail border in `PickSignatorySheet` result rows: was
  `border border-border` → `border border-[var(--bd-border)]`
- `DrawPad`'s "Draw with mouse or finger" label: was
  `text-muted-foreground` → `text-[var(--bd-text-muted)]`

**Open question — root cause not yet confirmed.** The `SignatureCard`
buttons ("Pick", "Shown", and the "Signatures" section badge) **already
use `--bd-*` tokens in the JSX** and were never using shadcn defaults.
If they still render with the wrong colour after all of the above, the
className fix is not the actual bug. Two live possibilities:

1. **File not actually swapped in yet** — old version still deployed/running.
2. **The CSS variables themselves are missing or mis-scoped.** Tokens
   like `--bd-indigo`, `--bd-indigo-bg`, `--bd-indigo-border`,
   `--bd-emerald`, `--bd-emerald-bg` need to be defined in
   `formTheme.css` (or wherever `--bd-*` lives) and in scope for this
   component. If undefined, `var(--bd-indigo)` silently resolves to
   nothing, and the browser falls back to default/transparent — which
   looks "wrong" even though the className is correct.

**Verification steps when resumed:**
1. Confirm the latest `WaybillSignatures.tsx` is actually the file
   running in the browser (hard refresh / check git log).
2. Open dev tools on the "Pick" button, inspect computed `background-color`
   and `color`. If it shows `rgba(0, 0, 0, 0)` or an unrelated default —
   confirms missing/mis-scoped token, not a className problem.
3. Grep `formTheme.css` (or wherever `--bd-*` tokens are defined) for
   `--bd-indigo`, `--bd-indigo-bg`, `--bd-indigo-border`, `--bd-emerald`,
   `--bd-emerald-bg`, `--bd-bg2`, `--bd-text-muted`, `--bd-border`,
   `--bd-surface` — confirm all exist and are in scope for
   `WaybillSignatures.tsx`'s render tree.
4. If tokens are missing, that's a separate, smaller fix (add the
   missing CSS variable definitions) — not a re-tokenization of this file.

---

## Files involved

- `src/components/waybill/WaybillSignatures.tsx` — both fixes live here
- `formTheme.css` (or equivalent) — likely location of the actual root
  cause for Issue 2 if className fix didn't resolve it

## Next session checklist

- [ ] Confirm latest file is deployed/running
- [ ] Test signature drawing with finger on real phone
- [ ] Inspect computed styles on "Pick" button via dev tools
- [ ] Confirm or add missing `--bd-*` token definitions if that's the cause
- [ ] Re-run `bun run typecheck` + `bun run lint`
