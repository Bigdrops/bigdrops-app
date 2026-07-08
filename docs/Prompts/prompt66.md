You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

OpenCode has full repository access.

Read AGENTS.md immediately.

Load all relevant skills from docs/PROJECTSKILLINDEX.md before making changes.

This task requires at minimum:

- using-superpowers
- Karpathy
- frontend-design
- typescript-advanced-types
- pdf-rendering-correctness

Follow the Report Protocol defined in AGENTS.md.

====================================================================
PHASE 2.1 — WAYBILL UX RESTORATION
====================================================================

The PDF Customization Engine introduced in Phase 1 is correct.

The current Waybill integration is not.

The implementation changed the application's UX instead of changing the implementation underneath the existing UX.

This task restores the original Waybill customization experience while keeping the new engine.

The engine is now the backend.

The existing Waybill customization sheet remains the frontend.

The engine owns:

- state
- persistence
- resolver
- capabilities
- policy
- font registration

Waybill owns:

- layout
- interaction
- presentation
- user experience

The engine must adapt to the application.

The application must NOT adapt to the engine.

====================================================================
MANDATORY AUDIT
====================================================================

Before writing any code, audit these implementations completely.

Current Waybill:

- src/pages/ViewWaybill.tsx
- src/components/waybill/WaybillTemplateSelector.tsx

Reference UX implementations:

- src/pages/ViewCSR.tsx
- src/components/document-view/shared/PdfOutputCustomizeSheet.tsx

Engine:

- src/domain/pdf/customization/
- src/components/pdf-customization/

Study:

- layout
- spacing
- save flow
- scrolling
- interaction model
- font picker UX
- colour picker UX
- switch behaviour
- swatch behaviour

Use the existing application UX as the source of truth.

====================================================================
PROBLEM TO FIX
====================================================================

The previous implementation introduced a separate PdfCustomizationPanel
Sheet/Drawer.

This caused severe UX regressions.

Specifically:

• The template picker became shorter.

• A second drawer immediately opens from the right before the template
picker finishes opening.

• The second drawer overlays the template picker.

• Users cannot properly interact with template cards.

• Save lives on one panel while customization lives on another.

• Closing one panel closes the other.

• The original colour swatches disappeared.

• Toggle switches disappeared.

• The workflow became fragmented.

This behaviour is rejected.

====================================================================
REQUIRED USER EXPERIENCE
====================================================================

When the user taps 🎨

ONLY ONE customization sheet opens.

Inside that SAME sheet must be:

1. Template picker

2. Custom Font

3. Ink Font

4. Ink Colour

5. Save button

Everything must live inside one continuous scrollable customization sheet exactly as before.

No nested sheets.

No second drawer.

No overlay.

No competing panels.

====================================================================
CUSTOMIZATION CONTROLS
====================================================================

Restore the original Waybill interaction model.

Do NOT invent a new one.

Use the engine underneath the existing controls.

If the previous UI contained:

- switches
- font chips
- colour swatches
- live colour preview
- hex editor

restore those interactions.

Do NOT replace them with generic controls simply because the engine exposes different data.

====================================================================
PDFCUSTOMIZATIONPANEL
====================================================================

PdfCustomizationPanel must no longer dictate presentation.

Treat it as reusable customization controls.

NOT as a mandatory Sheet.

NOT as a mandatory Drawer.

If necessary:

Refactor PdfCustomizationPanel into reusable presentation components so existing document customization sheets can embed those controls naturally.

The engine provides behaviour.

The document page provides layout.

====================================================================
WAYBILL PAGE
====================================================================

Keep:

- existing template selector
- existing scrolling
- existing Save button
- existing workflow

Embed the engine-powered customization controls into that existing sheet.

Do NOT create another popup.

Do NOT create another sheet.

Do NOT create another drawer.

====================================================================
FONT REGISTRY
====================================================================

Future font expansion must require ONLY updating the shared font registry.

Adding a new font must NOT require modifying:

- Waybill
- CSR
- Invoice
- Quotation

The UI should automatically display newly available fonts from the shared registry according to the document's capability and policy.

====================================================================
COLOUR PICKER
====================================================================

Restore the previous Waybill colour picker UX.

Use the existing swatch interaction.

Maintain:

- preset swatches
- live/custom swatch
- hex editing

Do NOT replace this with a single rectangular colour selector.

====================================================================
SAVE FLOW
====================================================================

There must be ONE Save button.

That button saves:

- selected template
- customization settings
- existing persistence
- existing database updates

There must never be separate save flows.

====================================================================
PRESERVE
====================================================================

Keep all successful Phase 2 architectural work.

Do NOT remove:

- customization engine
- resolver
- bridgeToDesignPreset()
- capabilities
- policy
- font registry wrapper

These are now the foundation.

Only the presentation layer should change.

====================================================================
DO NOT
====================================================================

Do NOT modify:

- Invoice
- Quotation
- CSR

Do NOT change:

- Waybill render engine
- pagination
- PDF generation
- template routing
- template rendering

Do NOT introduce additional dialogs.

Do NOT introduce nested Sheets.

Do NOT introduce overlay Drawers.

Do NOT run:

bun run build

====================================================================
REQUIRED VERIFICATION
====================================================================

Run only:

bun run typecheck

git status

Manual verification:

✓ Clicking 🎨 opens exactly one customization sheet.

✓ Template picker is fully usable.

✓ Custom Font is inside the same sheet.

✓ Ink Font is inside the same sheet.

✓ Ink Colour is inside the same sheet.

✓ Colour swatches are restored.

✓ Existing interaction model is preserved.

✓ Save persists template and customization together.

✓ No overlapping panels exist.

✓ PDF output remains unchanged.

✓ No regressions occur.

====================================================================
ACCEPTANCE CRITERIA
====================================================================

The user should not feel that the UI changed.

Only the implementation underneath it should have changed.

The Waybill customization experience should feel identical to the pre-engine version while now being fully powered by the shared PDF Customization Engine.