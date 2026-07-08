

---

Phase 2.2 — Remove Generic Panel & Restore CSR UX Exactly

You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel. Runtime: Bun only. Never use npm, yarn, or pnpm.

==================================================================== CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE

OpenCode has full repository access.

Read AGENTS.md before touching any code.

Load every relevant skill from docs/PROJECTSKILLINDEX.md, especially:

using-superpowers

frontend-design

Karpathy

typescript-advanced-types

pdf-rendering-correctness


Follow the Report Protocol in AGENTS.md exactly. Do not invent your own report format.

==================================================================== OBJECTIVE

The previous implementation misunderstood the architecture.

The shared PDF Customization Engine is headless.

It provides:

state

persistence

resolver

policy

capabilities


It does NOT own UI.

Waybill should use the same UI/UX pattern already proven in CSR.

The generic PdfCustomizationPanel is no longer part of the architecture.

==================================================================== CHANGE 1 — DELETE THE GENERIC PANEL

Delete:

src/components/pdf-customization/PdfCustomizationPanel.tsx

Remove every import and every reference.

It must no longer exist anywhere in the project.

The engine remains.

Only the generic UI is removed.

==================================================================== CHANGE 2 — COPY THE CSR CUSTOMIZATION UX

Study the CSR implementation first.

Use CSR as the visual and interaction standard.

Replicate its customization experience inside Waybill's existing DocumentSheet.

This means using the same UI components and interaction model, including:

switches

dropdowns

handwriting font chips

colour swatches

live colour preview

layout

spacing

section organization

behaviour


Do not redesign it.

Do not simplify it.

Do not invent a different UX.

Waybill should feel like CSR adapted for Waybill's three supported customization sockets.

==================================================================== CHANGE 3 — WAYBILL SUPPORTS ONLY THREE CUSTOMIZATIONS

Keep only:

Document Font

Ink Font

Ink Colour


No Accent Colour.

No extra controls.

No new concepts.

Only the existing CSR experience mapped onto Waybill.

==================================================================== CHANGE 4 — FIX THE ENGINE WIRING

Current behaviour is incorrect.

Changing fonts or colours updates the UI but the generated PDF still uses defaults.

Trace the complete data flow.

Verify:

DocumentSheet UI

↓

usePdfCustomization()

↓

ResolvedPdfCustomization

↓

bridgeToDesignPreset()

↓

WaybillPDF

↓

Template Components

↓

React PDF rendering

Determine exactly where the resolved customization stops being propagated.

Do not assume.

Audit every step.

Repair the broken link.

==================================================================== REQUIRED BEHAVIOUR

After this change:

✓ Changing Document Font immediately affects document typography.

✓ Changing Ink Font changes only fillable handwriting.

✓ Changing Ink Colour changes only handwriting colour.

✓ Saving persists settings.

✓ Reload restores settings.

✓ Generated PDF reflects the saved customization.

The rendered PDF must no longer remain on template defaults after customization.

==================================================================== DO NOT

Do not recreate PdfCustomizationPanel.

Do not introduce another reusable customization UI.

Do not redesign CSR.

Do not redesign Waybill.

Do not modify Invoice, Quotation or BOQ.

Do not run bun run build.

==================================================================== VERIFICATION

Run only the verification required by AGENTS.md for active code changes.

Additionally perform manual verification:

Open Waybill customization.

Confirm the UI matches CSR's interaction model.

Change Document Font → PDF changes.

Change Ink Font → handwriting changes.

Change Ink Colour → handwriting colour changes.

Reload page → settings persist.

Generate multiple templates → customization still applies.


If the PDF still renders defaults, continue tracing until the broken propagation path is identified and fixed. The task is not complete until the customization engine actually affects the rendered PDF.