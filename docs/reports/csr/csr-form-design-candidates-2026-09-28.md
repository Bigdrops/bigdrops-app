# CSR Form Design Candidates Report

This report was written by Buffy on 2026-09-28 via Freebuff.

## Objective

Create two full-page CSR form design candidates: one Desktop file and one Mobile/Fold file. Both use the accepted BOQ V12 structure and design system. Both respect the CSR workflow from the legacy prototype.

## Scope

Two standalone HTML prototypes only. No production code changed. No database change. The BOQ V12 source file and the legacy CSR JSX stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/csr/csr-form-candidate-mobile-fold.html` (new, 1,247 lines)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/csr/csr-form-candidate-desktop.html` (new, 1,331 lines)

## Skills used

html-prototype, accessibility, mobile-app-ui-design, frontend-design

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

- Copied the accepted BOQ V12 file as the structural base. Kept its tokens, topbar, numbered section headers, segmented enumeration rail, identity stack, delete junction, insert-below control, sheet system, toast, FAB, savebar, and dark mode.
- Replaced BOQ money semantics with CSR semantics. Nine sections: Document details, Service parameters, Equipment specifications, Problem and service details, Execution timeline, Operational readings, Materials used, Technician endorsement, Customer acknowledgement.
- Materials is a flat item list with quantity and unit. No groups. A parts readout line closes the section.
- Save validation requires CSR number and client account. Bad rows flash an error state.
- Client picker and signatory picker reuse the V12 sheet anatomy. Escape closes sheets. Focus returns to the opener.
- The Desktop file adds a two-column workspace at 1024px and above. The main column holds the continuous document. A sticky summary rail shows status, materials, client, report number, and a persistent save. Below 1024px the Desktop file matches the Mobile/Fold file.

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
- The Desktop file keeps the summary rail in the DOM below 1024px. The grid stacks it under the document. This is intentional but needs a visual check.
- Sample data is fictional. Real client and signatory wiring happens in production code, not in prototypes.

## Deferred work

- Visual browser review of all four breakpoints: phone, fold, 1024px, and wide desktop.
- Dark-mode spot check for the new status chips, readings grid, and signature strip.
- User acceptance against the accepted BOQ V12 baseline.
