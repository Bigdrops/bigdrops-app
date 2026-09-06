# PDF Customize Popup Audit Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Determine why the Invoice/Quotation customization popup is tall.
- Answer whether the Facelift PRD directed the current design.
- Answer whether the previous agent misinterpreted the task.
- Use evidence from the PRD, the handover, and the code.

## Scope

- Facelift PRD in `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/`.
- Handover in `docs/session-memories/pdf-customize.md`.
- Current code: `DocumentSheet`, `DocumentCustomizeCard`, `CommercialTemplatePicker`, `InvoiceOverlays`, `ViewQuotation`, `ViewCSR`, `ViewWaybill`, `PdfOutputSettings`.
- Git history of commit `43f8dede` (unification commit).
- No application code was changed.

## Files changed

- `docs/reports/invoice-quote/pdf-customize-audit-2026-09-06.md` (this report, new file).
- No application code changed.

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Definitions

- Popup means the bottom sheet or side sheet that opens from the palette button.
- Inline means controls that render on the view page below the document card.
- Minimal pattern means the CSR/Waybill popup: template picker, document font, ink color, handwriting font, save button. No bank controls. No output options.

## Executive verdict

- The fault is primarily a previous-agent problem.
- The PRD contributed ambiguity, but it did not direct the tall popup.
- The correction must originate in the implementation, not in a PRD rewrite.
- Add one short PRD rule to prevent recurrence.

## What the PRD actually says

- The Facelift PRD contains no specification for popup contents.
- No PRD section lists what belongs in the palette popup.
- No PRD section defines popup density or minimalism.
- No PRD section places bank selection inside the popup.
- Relevant PRD sources:
  - `21-surfaces-and-overlays.md` lists `PdfOutputCustomizeSheet` only as an inventory consumer. It assigns settings panels to bottom sheet on mobile and side sheet on desktop. It assigns template and font pickers to bottom sheet. It sets radius, shadow, z-index, and animation. It says nothing about bank controls.
  - `09-documents.md` defines document view structure and action sheets. It does not describe the palette popup.
  - `20-pdf-view-fidelity.md` moves bank details into the document view card. It removes the separate bank card. It does not move bank selection into the popup.
  - `05-navigation-shell.md` and `15-interaction-model.md` define sheet behavior. They do not define popup contents.
  - `Waterfall-roadmap.md` M2 Step 1 says "Extend DocumentCustomizeCard with optional slots (bank account, tagline, footer, output options)". This roadmap entry was written as part of the same unification work. It is not an independent PRD requirement.
  - `Design-direction/form/wireframes/invoice-live-form-wireframe.md` describes `PdfOutputSettings` fields (template, bank, footer, tagline, toggles). It describes the settings model. It does not assign bank controls to the popup.

## What is implemented

- Invoice popup (`InvoiceOverlays.tsx:167-214`):
  - Template section with `CommercialTemplatePicker` (4-column dot grid, 7 templates).
  - Bank Details section with `PdfBankControls`.
  - Output Options section with `PdfDocumentOptionsCard` (collapsed by default).
  - Accent Color section (6 swatches plus color input).
  - Document Font selector.
  - Ink Color and Handwriting Font are disabled (empty arrays, `"auto"`).
  - Save button.
  - No compact or landscape toggles.
- Quotation popup (`ViewQuotation.tsx:222-268`):
  - Identical structure to the Invoice popup.
- Bank controls (`PdfOutputSettings.tsx:122-202`):
  - Bank Details card with show or hide switch.
  - Selected account detail grid (account name, account number, bank, sort code).
  - Switch Account button.
  - Switch Account opens a second nested sheet (`BankAccountPickerSheet`).
  - This block is the tallest element in the popup.
- Critical history:
  - The deleted `PdfOutputCustomizeSheet` had a `designOnly` gate.
  - When `designOnly` was true, bank controls and document options did not render.
  - Before unification, Invoice passed `designOnly` (see `git diff HEAD~1 HEAD -- InvoiceOverlays.tsx`).
  - Before unification, Quotation passed `designOnly` (see `git diff HEAD~1 HEAD -- ViewQuotation.tsx`).
  - After unification, both pages inject `bankAccountSelector` and `outputOptions` explicitly.
  - The agent removed the minimal gate. The components existed before. The visibility is new.
- Duplication:
  - `InvoiceWorkspace.tsx:125-131` renders `BankDetailsCard` and `DocumentOptionsCard` inline.
  - `QuotationViewPage.tsx:56-68` renders `BankDetailsCard` and `DocumentOptionsCard` inline.
  - The popup now repeats the same bank and option controls.
  - Bank selection exists in two places at the same time.

## CSR vs Waybill vs Invoice vs Quotation

| Aspect | CSR | Waybill | Invoice / Quotation (current) |
|---|---|---|---|
| Template picker | Carousel | Selector | 4-column dot grid |
| Bank in popup | No | No | Yes, full card plus nested sheet |
| Output options in popup | No | No | Yes, collapsed card |
| Accent color | No | No | Yes |
| Document font | Yes | Yes | Yes |
| Ink color | Yes, active | Yes, active | Disabled |
| Handwriting font | Yes, active | Yes, active | Disabled |
| Compact / landscape | No | No | No |
| Popup height | Short | Short | Tall |
| Bank handling | Not applicable | Not applicable | Inline card plus popup card (duplicate) |

- CSR (`ViewCSR.tsx:374-402`) passes template, swatches, fonts, save. It passes no bank, no output options, no accent.
- Waybill (`ViewWaybill.tsx:430-476`) passes the same minimal set as CSR.
- CSR and Waybill establish the intended minimal pattern.
- Invoice and Quotation diverge from that pattern.
- Commercial documents correctly disable handwriting controls (see `commercial.ts:44-56`). That part is correct.

## Discrepancy matrix

| # | Decision | Requirement or source | Current implementation | Classification | Reasoning | Correction source |
|---|---|---|---|---|---|---|
| 1 | Bank picker inside Invoice/Quotation popup | No PRD requirement. Handover documents `PdfBankControls` props only. Prior code hid it with `designOnly`. CSR/Waybill omit it. Inline cards already provide it. | `PdfBankControls` with detail grid and nested picker sheet inside popup | Agent deviation. Existing-pattern mismatch. | The agent removed an existing minimal gate and ignored the CSR/Waybill pattern. The PRD never requested this placement. | Implementation |
| 2 | Output options inside popup | No PRD requirement. Prior code hid it with `designOnly`. Inline `DocumentOptionsCard` already provides it. | `PdfDocumentOptionsCard` inside popup, collapsed | Agent deviation. Existing-pattern mismatch. | Same cause as #1. Collapsed state reduces harm but still adds chrome and height. | Implementation |
| 3 | Compact and landscape toggles removed | Old sheet showed them even in `designOnly` mode. No request removed them. | Not passed, not rendered | Agent deviation. Unrelated change. | Function disappeared without a requirement. User did not request removal. | Implementation (restore or confirm removal) |
| 4 | Template picker replaced with dot grid | User requested minimal height. No PRD visual mandates a specific picker. | 4-column dot grid, 7 templates | PRD-ambiguous | The choice reduces height. It is a reasonable reading of "minimal". Preview fidelity is lower, but intent aligns. | Leave as-is |
| 5 | Shared `DocumentSheet` plus `DocumentCustomizeCard` unification, deletion of `PdfOutputCustomizeSheet` | `21-surfaces-and-overlays.md` mandates canonical overlay types and the `DocumentSheet` responsive pattern | Single shared popup replaces per-type sheets | PRD-ambiguous | Unification direction is sound. Only the slot contents are wrong. | Leave as-is |
| 6 | `previewControls = null` in `ViewQuotation` | None | Dead prop set to null | No discrepancy | `QuotationViewPage` never renders `previewControls`. No visual change. | Leave as-is |
| 7 | Preset save path changed (old code called `setPdfDesignPreset`, new code passes `undefined` preset to `handleSaveCustomization`) | None found | Save path differs; engine live-writes accent and font | Unverified change | Effect on persistence is unclear. No verification ran per task constraint. | Implementation (verify separately) |
| 8 | Carousel refactor, accounting foundation, migration, tests in the same commit | Roadmap M1, M3, M6 | Bundled with popup work | Unrelated change | These are separate milestones. They inflate the commit but are not popup defects. | Leave as-is; do not bundle again |

## Root cause

- The previous agent treated "unify" as "move all controls into one popup".
- The agent extended `DocumentCustomizeCard` with bank and output slots (roadmap M2 Step 1).
- The agent then filled those slots for Invoice and Quotation.
- The agent dropped the `designOnly` gate that kept the old popup minimal.
- The agent did not copy the CSR/Waybill minimal composition.
- The agent duplicated controls that already exist inline on the view pages.
- The PRD enabled this error because it has no explicit popup content rule.
- The handover did not mandate bank-in-popup placement. It only documented component props.
- The strongest ignored signals were `designOnly`, CSR/Waybill, and the inline cards.
- The template grid change was the only part that served the original request.

## Recommended correction point

- Change the implementation. Do not rewrite the PRD.
- Remove `bankAccountSelector` from the Invoice and Quotation popups.
- Remove `outputOptions` from the Invoice and Quotation popups.
- Keep bank and document options inline (`BankDetailsCard`, `DocumentOptionsCard`).
- Keep the shared sheet, shared card, and dot-grid template picker.
- Decide compact and landscape explicitly: restore them or record intentional removal.
- Verify the preset save path in a separate task.
- Optionally add one PRD sentence to `21-surfaces-and-overlays.md`:
  - "Commercial palette popup contains template, accent, and document font only. Bank and document options stay inline on the view page."
- This prevents recurrence without a broad PRD rewrite.

## Scope of suspected nonsense

- Bank picker in popup: unnecessary addition. Remove.
- Output options in popup: unnecessary addition. Remove.
- Compact and landscape removal: unrequested loss. Restore or confirm.
- Preset save change: unrequested behavior change. Verify.
- Carousel, accounting, migration, tests: valid work, wrong bundle. Keep, but do not mix with popup tasks.
- Genuine required work: shared sheet, shared card, template grid, dead-prop cleanup.

## Verification result

- Verification commands did not run per explicit task constraint.
- `bun run audit:load`: skipped (forbidden by task).
- `bun run typecheck`: skipped (forbidden by task).
- `bun run lint`: skipped (forbidden by task).
- `bun run test`: skipped (forbidden by task).
- `bun run build`: skipped (forbidden by task and hardware policy).
- `git status`: observed before report creation. Pre-existing changes were `D docs/Session-memories/accounting-and-pdf-customize.md`, `A docs/Session-memories/accounting.md`, `A docs/Session-memories/pdf-customize.md`. This report adds one new file. It reverts nothing.
- AGENTS.md requires `audit:load` and `typecheck` before completion. Explicit user instruction takes precedence over that gate for this audit-only task.

## Risks or limitations

- No runtime check of popup height occurred. Findings rest on code reads and git diffs.
- Preset persistence after the save-path change remains unverified.
- User intent ("make minimal like CSR/Waybill") comes from the task brief, not from a quoted ticket.
- PRD silence is established by search, not by exhaustive review of every HTML mockup.

## Deferred work

- Remove bank and output controls from the Invoice and Quotation popups.
- Resolve compact and landscape toggle placement.
- Verify accent, font, template, bank, and option persistence after unification.
- Add the one-sentence popup content rule to the PRD.
- Measure popup height on a phone viewport after the fix.
