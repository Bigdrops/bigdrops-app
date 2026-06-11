

```
You are fixing critical blocking issues in the Waybill creation flow. This is not a full rebuild — it's a surgical strike on the gateway overlay, the save failure, and form field violations. Execute exactly what's specified. No extra changes.

---

## MANDATORY PREREAD

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
frontend skill for design implementation 
2. `src/components/waybill/WaybillGatewayOverlay.tsx` — current broken version.
3. `src/components/waybill/WaybillFormOverlay.tsx` — current overlay shell.
4. `src/components/waybill/WaybillForm.tsx` — current form.
5. `src/pages/NewWaybill.tsx` — current wiring.
6. `src/components/waybill/waybillUtils.ts` — types, sequence generator.
7. `docs/waybillfixroadmap.md` — Sections 1-4 for context.

---

## FIX 1 — OVERLAY CONTAINMENT (B3, B4)

**Problem:** Gateway and form overlays render inside the app shell, causing the bottom nav to clip them and dashboard chrome (hamburger, search) to appear.

**Fix:**
- Render both `WaybillGatewayOverlay` and `WaybillFormOverlay` via React portal (`createPortal`) to `document.body`.
- Ensure `z-50` on the overlay containers.
- Remove any layout wrappers that include the dashboard shell from the form page. `NewWaybill.tsx` should render the overlays directly, not inside `AppShell` or similar layout.
- The overlays must cover the full viewport including over the bottom navigation bar.

---

## FIX 2 — REBUILD GATEWAY OVERLAY (B1, B2, D1)

**Problem:** Gateway is a tiny modal with massive margins. Cards are in wrong order. No blank template download cards.

**Rebuild `WaybillGatewayOverlay.tsx` from scratch.**

**Props:**
```typescript
interface WaybillGatewayOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'external' | 'internal') => void;
  onDownloadBlank: (type: 'external' | 'internal') => void;
}
```

Structure:

· Full-screen overlay: fixed inset-0 z-50, semi-transparent backdrop using bg-[var(--bd-overlay)], flex centered.
· White panel: bg-[var(--bd-bg)], max-w-md w-full mx-4, rounded-[var(--bd-radius-lg)], shadow-[var(--bd-shadow-lg)]. No excessive margins — it should span nearly the screen width on mobile.
· Header: close button (X), "Create New Waybill", "Select Document Type".
· Card 1: "External / Client Delivery Note" — colored icon container (bg-[var(--bd-primary)]), title, "Outbound shipment to external clients and vendors with invoice linkage", chevron. onClick → onSelect('external').
· Card 2: "Internal Transfer Note" — colored icon container (bg-[var(--bd-warning)]), title, "Stock movement between company depots, workshops, and service centers", chevron. onClick → onSelect('internal').
· Divider with "or" text.
· Card 3: "Download Blank External Template" — outlined style, download icon, "Blank External Delivery Note (PDF)". onClick → onDownloadBlank('external').
· Card 4: "Download Blank Internal Template" — outlined style, download icon, "Blank Internal Transfer Note (PDF)". onClick → onDownloadBlank('internal').

Styling: Cards have border border-[var(--bd-border)] rounded-[var(--bd-radius-md)] p-4 cursor-pointer hover:border-[var(--bd-primary)] transition-all. Use tokens for all colors. No hardcoded hex values.

---

FIX 3 — FIX SAVE PIPELINE (A3, C2)

Problem: Save fails silently. Waybill number may be "[Auto-generated]". Purpose may be missing. Errors swallowed.

Fix in src/pages/NewWaybill.tsx (or wherever onSave is handled):

· Before save, generate the waybill number using generateWaybillSequenceNumber() from waybillUtils.ts. Never send a placeholder string.
· For external waybills, set purpose to 'Supply' as default if not explicitly chosen.
· For internal waybills, purpose must be null.
· After calling the save mutation, catch any error and display it using the project's feedback toast (import { toast } from '@/lib/feedback' or equivalent). Show the actual error message from the database.
· Implement the 4 save blockers only (from roadmap Section 4). Client-side validation before calling the mutation:
  1. External: client must be selected.
  2. Waybill number must be present.
  3. At least one line item.
  4. Every item must have description and qty > 0.
· No other field blocks save. Delete all existing sender/receiver/transport validation.

Blank Template Download implementation:

· onDownloadBlank function: call generateWaybillSequenceNumber() with isManual = true and the selected type.
· Insert a row into blank_waybill_logs via Supabase: { assigned_waybill_number: number, type: type }.
· Show success toast: "Blank template {number} generated."
· For now, trigger a PDF download using the existing WaybillPDF component rendered with empty data and pen-and-ink lines. If that's too complex for this step, just insert the log and show the toast; PDF generation can be a follow-up. But the log insertion and toast are mandatory.

---

FIX 4 — STRIP FORM VIOLATIONS (A1, C3, B15)

Surgical removals from WaybillForm.tsx — do not restructure layout yet.

1. Remove Waybill Type dropdown. Type is passed as a prop (type: 'external' | 'internal'). It's immutable.
2. Remove Status dropdown. All new waybills default to 'dispatched'.
3. Remove Signature Status, Confidence, Evidence fields. Delete them entirely — form fields, state variables, types.
4. Collapse three notes fields into one. If there are separate "General Notes", "Sender Notes", "Receiver Notes" fields, merge them into a single "Notes" field. The title "Notes" should be an editable text element (tap to rename). Add a basic rich text toolbar above the textarea with: Bold, Italic, Underline, Strikethrough, Bulleted List, Numbered List, Blockquote, Code Block. Use a simple contentEditable div or a lightweight editor if the project already has one. Store output as HTML string in the notes field.

Important: These are the ONLY changes to WaybillForm.tsx in this step. Do not change section layout, do not remove Card wrappers yet, do not move fields. That's Phase 2.

---

FILES TO MODIFY

· src/components/waybill/WaybillGatewayOverlay.tsx — full rebuild
· src/components/waybill/WaybillFormOverlay.tsx — add portal rendering
· src/components/waybill/WaybillForm.tsx — remove type/status/bloat, merge notes, add rich text toolbar
· src/pages/NewWaybill.tsx — fix save pipeline, implement blank download, wire gateway changes

---

VERIFICATION

After each file edit: bun run typecheck. Fix all errors before proceeding.

After all changes: bun run typecheck && bun run lint && bun run audit:load. All must pass.

---

SUCCESS CRITERIA (Test these manually if possible)

1. Tap "+" on waybill list → full-screen gateway overlay appears, not clipped by bottom nav.
2. External card is first, Internal second.
3. Two blank download cards are present.
4. Tapping a creation card opens the form overlay — no hamburger/search/dashboard chrome.
5. Form no longer has Waybill Type or Status dropdowns.
6. Form no longer has Signature Status/Confidence/Evidence fields.
7. Form has one Notes field (not three) with editable title and formatting toolbar.
8. Saving an external waybill with client + items → succeeds, record appears in list.
9. Saving without client (external) → clear validation error, does not save.
10. Saving without items → clear validation error.
11. Tapping blank template card → toast confirmation, row in blank_waybill_logs.

---

ABSOLUTE RULES

· No questions. No progress updates. Execute and report only when done.
· Commit message: fix: gateway overlay rebuild, save pipeline, form violations stripped
· Push to main immediately after verification.
· If something is unclear, note it in the final report but do not stop execution. Make the best decision and proceed.
