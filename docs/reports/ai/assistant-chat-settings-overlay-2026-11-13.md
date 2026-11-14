# Assistant Chat Settings Overlay Report

This report was written by gpt-6-luna on 2026-11-13 via DeepAI.

Objective: Keep provider settings out of the live invoice artifact and show them only in an explicit responsive overlay.
Scope: Assistant layout, invoice panel, preview wiring, responsive styles, and regression coverage.
Files changed: `src/components/design-lab/assistant-chat-layouts.tsx`, `src/components/design-lab/assistant-chat-preview.tsx`, `src/components/design-lab/assistant-chat-panel.tsx`, `src/components/design-lab/assistant-chat-workspace.css`, `src/tests/critical/assistantChatUxContracts.test.js`, and this report.
Skills used: react-dev, test-driven-development
Documentation standard: ASD-STE100 Simplified Technical English

Changes made:
- Fold Open and Desktop now keep the Live Document panel in the right-side artifact area.
- Provider settings mount in a slide-over overlay only while `settingsOpen` is true.
- Tablet keeps its existing context/settings drawer. Fold Closed keeps its bottom sheet.
- Removed provider/key content and settings shortcuts from the invoice panel.
- Added regression checks for the overlay-only settings and invoice-only artifact area.

Verification:
- `bun test src/tests/critical/assistantChatUxContracts.test.js`: passed (8 tests).
- `bun run audit:load`: completed with repository-wide existing warnings; no new assistant-chat source-size warning.
- `bun run typecheck`: failed with 9 existing errors in `AssistantSheet.tsx`, `DashboardOverview.tsx`, `keys.ts`, `uiSoundEvent.ts`, and three PDF template test files. No reported error points to the files changed for this task.
- `git diff --check`: passed.
- `supabase db push`: not applicable.
- `bun run build` and `bun run lint`: skipped per hardware policy.

Supabase push status: Not applicable; no database changes were made.
Risks or limitations: Provider settings use the existing Design Lab simulations. Typecheck remains blocked by errors outside this change.
Deferred work: Resolve the existing type errors in their owning changes.
