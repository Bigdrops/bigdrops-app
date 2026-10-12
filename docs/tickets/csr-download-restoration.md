# Restore CSR Header Download Action

Status: Deferred
Area: Customer Service Report
Priority: Backlog

## Summary

The blank CSR download action was removed from the CSR creation form header during the compact header correction. The previous action competed with the mode badge, the field-mode toggle, the theme toggle, and the options button on small screens. It also increased the chance of header control wrapping and visual crowding.

## Confirmed Implementation Details

- CSR creation and edit routes render `src/pages/CsrFormPage.tsx`.
- `src/pages/CsrFormPage.tsx` renders `src/components/csr/CsrFormScreen.tsx`.
- `src/components/csr/CsrFormScreen.tsx` owns shared CSR interaction state and selects the presentation family.
- `src/components/csr/CsrFormPresentations.tsx` owns the mobile/fold and desktop/tablet header compositions.
- The previous header download action was in `src/components/csr/CsrFormScreen.tsx` beside the theme toggle and field-mode toggle.
- A second visible blank-download action was in the desktop floating action group in `src/components/csr/CsrFormScreen.tsx`.
- The blank CSR handler remains in `src/pages/CsrFormPage.tsx` as `handleDownloadBlankCsr`.
- The handler reads existing CSR numbers, resolves the CSR prefix, computes the next CSR number, writes `blank_csr_logs`, advances the auto cursor when logging succeeds, renders the CSR PDF with `getCsrPdfDocument`, and saves the PDF through `downloadBlobFile`.
- Field-mode save still has a separate PDF generation path in `src/pages/CsrFormPage.tsx`. That path was not removed.

## Permission And State Notes

- The blank CSR pathway uses the tenant Supabase client.
- It writes to `blank_csr_logs`.
- It depends on document numbering state and can advance the auto cursor after a successful blank-log insert.
- Restoration must preserve the current create/edit distinction. The previous blank download action was create-mode only.

## Proposed Restoration

- Restore the action as a compact secondary control in the CSR header overflow or a compact actions sheet.
- Do not place it between the title and primary form metadata.
- Do not add a floating download button unless the full document action model requires it.
- Use a clear accessible name such as `Download blank CSR`.

## Accessibility Expectations

- Use a native `button`.
- Provide an accessible name for icon-only presentation.
- Keep the target at least 24px by 24px, with a preferred touch size near 44px.
- Preserve visible keyboard focus.
- Do not rely on icon shape alone to communicate the action when inside an overflow list.

## Responsive Expectations

- The action must not cause horizontal overflow at 320px.
- The title and CSR number must remain visible.
- Header controls must wrap only as a deliberate compact row or menu, not as scattered controls.
- The action must work on narrow mobile, standard mobile, fold closed, fold open, tablet, and desktop layouts.

## Restoration Acceptance Criteria

- The CSR creation form exposes one blank CSR download entry point.
- The entry point calls the existing `handleDownloadBlankCsr` pathway or its documented replacement.
- The action remains create-mode only unless product requirements change.
- The compact header height remains close to the current corrected header height.
- The title, CSR number, field-mode toggle, theme toggle, and options control do not collide.
- No reusable PDF/export utility is deleted or duplicated.
- A responsive review confirms no horizontal overflow at 320px.
- A keyboard review confirms the action is reachable and has a visible focus state.
