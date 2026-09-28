# Waybill Form Design Candidates Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Create two full-page Waybill form design candidates: one Desktop file and one Mobile/Fold file. Both use the accepted BOQ V12 structure and design system. Both respect the Waybill workflow from the legacy prototype.

## Scope

Two standalone HTML prototypes only. No production code changed. No database change. The BOQ V12 source file and the legacy Waybill JSX stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/waybill/waybill-form-candidate-mobile-fold.html` (new, 1,532 lines)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/waybill/waybill-form-candidate-desktop.html` (new, 1,628 lines)

## Skills used

html-prototype, accessibility, mobile-app-ui-design, frontend-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

- Copied the accepted BOQ V12 file as the structural base. Kept its tokens, topbar, numbered section headers, segmented enumeration rail, identity stack, delete junction, groups, sheet system, toast, FAB, savebar, Column Manager, and dark mode.
- Replaced BOQ money semantics with dispatch semantics. Six sections: Document details, Transport, Manifest, Custody, Signatures, Notes and terms.
- Added a kind segmented control: External delivery note or Internal transfer note. The kind drives the number prefix WB-E / WB-I, purpose defaults, client, PO, and invoice visibility, the location label, and the required state of Received By. The legacy gateway dialog became this inline control.
- Manifest lines use a seven-column contract: description, handling note, unit, quantity, make, part number, condition. Condition renders as a state badge. Groups stay allowed because one manifest can carry several jobs.
- A dispatch readout replaces totals: units, lines, groups, plus the words "No monetary totals". The Column Manager sheet was ported and bound to the Waybill column registry.
- Signature cards give each side a status chip and pick-saved, camera, and draw actions. Camera and draw toast a native-capability boundary. A capture counter sits in the section header.
- Save validation is kind-aware. External waybills require a client account. Internal waybills require Received By. Bad rows flash an error state.
- The Desktop file adds a two-column workspace at 1024px and above. The main column holds the continuous document. A sticky dispatch rail shows the summary, note kind, client, waybill number, and a persistent save. Below 1024px the Desktop file matches the Mobile/Fold file.

## Verification

- `node /tmp/fw-check.cjs` on both files: all 20 static checks passed. Checks cover JS parse, DOM-shim execution, generated markup tag balance, id resolution, handler resolution, V12 anatomy, accessibility attributes, and removal of BOQ-only semantics.
- `bun run audit:load`: not run. This task set a hardware gate that allows static checks only.
- `bun run typecheck`: not run. Same gate. The files are standalone HTML with no TypeScript.
- `git status` before and after: captured. Only the two new files were added by this task. No pre-existing change was reverted or overwritten.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Static verification executes the scripts against a DOM shim. It does not render pixels. A human must review the visual result in a browser.
- Camera and draw signature capture are boundary toasts by design. Native capability work is out of scope for prototypes.
- The Desktop rail stacks below the document under 1024px. This is intentional but needs a visual check.
- Sample clients, invoices, and signatories are fictional.

## Deferred work

- Visual browser review of all four breakpoints: phone, fold, 1024px, and wide desktop.
- Dark-mode spot check for signature cards, state badges, and the dispatch rail.
- User acceptance against the accepted BOQ V12 baseline.
