You are working on the BIGDROPS business platform.

Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

OpenCode has full repository access.

Read AGENTS.md immediately before doing anything else.

It defines:
- Project architecture
- Audit-first workflow
- Locked business rules
- Skills loading requirements
- Report protocol
- Verification protocol
- Standards compliance
- Implementation constraints

Load all required skills from docs/PROJECTSKILLINDEX.md before making any code changes.

This task primarily requires:
- using-superpowers
- Karpathy
- frontend-design
- typescript-advanced-types
- pdf-rendering-correctness

====================================================================
PHASE 2 — WAYBILL ADOPTION OF THE PDF CUSTOMIZATION ENGINE
====================================================================

The shared PDF Customization Engine has already been implemented and audited.

Waybill will become the first production document family to adopt it.

The objective is to replace Waybill's existing customization infrastructure with the shared engine while preserving every aspect of existing PDF rendering behaviour.

This is an integration task—not a redesign.

Existing PDF appearance, template layouts, pagination, rendering behaviour, blank waybill generation, and business logic must remain unchanged.

====================================================================
MANDATORY ENGINE AUDIT
====================================================================

This task depends entirely on the Phase 1 engine.

Before making any code changes, audit the implementation and derive the engine's actual public API directly from source.

Read completely:

- src/domain/pdf/customization/types.ts
- src/domain/pdf/customization/resolver.ts
- src/domain/pdf/customization/hooks.ts
- src/domain/pdf/customization/fontRegistry.ts
- src/components/pdf-customization/PdfCustomizationPanel.tsx

Determine:

- Actual hook signature
- Actual hook return values
- Resolver API
- Available types
- Font registry APIs
- Persistence behaviour
- Panel props

Do NOT assume or invent hook signatures, resolver APIs, prop names, storage helpers, persistence methods, or component props.

Integrate with the engine exactly as implemented.

====================================================================
OBJECTIVE
====================================================================

Replace Waybill's document customization implementation with the shared engine.

After completion:

• Waybill becomes the first consumer of the shared customization engine.

• Existing inline customization controls are removed.

• Existing customization persistence is handled by the engine.

• Waybill PDF rendering consumes the engine's resolved customization.

• Existing rendering behaviour remains visually identical.

No Invoice, Quotation or CSR behaviour may change.

====================================================================
CHANGE 1 — DECLARE WAYBILL CUSTOMIZATION METADATA
====================================================================

Create an appropriate Waybill customization definition inside the Waybill domain.

Use the engine's existing types.

Waybill supports exactly three customization sockets:

- Document Font
- Ink Font
- Ink Colour

Waybill does NOT support:

- Accent Colour

Declare:

- WaybillCapabilities
- WaybillPolicy
- WaybillTemplateDefaults

Do not invent font or colour libraries.

Where possible, source available fonts and colours from the existing engine, registry, or existing design preset system.

Avoid duplicated configuration.

====================================================================
CHANGE 2 — ADOPT THE SHARED CUSTOMIZATION PANEL
====================================================================

Audit the existing Waybill customization UI.

Identify every control that currently performs customization responsibilities, including:

- Ink font selection
- Ink colour selection
- Document font selection
- Any localStorage-backed customization controls

Replace those responsibilities with PdfCustomizationPanel.

Retain unrelated Waybill functionality such as:

- Template selection
- Template preview
- Other document options unrelated to customization

If existing customization components become redundant after integration, remove them.

The resulting Waybill customization experience should be entirely driven by the shared engine.

====================================================================
CHANGE 3 — ADOPT SHARED PERSISTENCE
====================================================================

Replace direct customization persistence with the engine's persistence layer.

Use the engine's actual API.

Do not duplicate persistence logic.

Do not create competing storage helpers.

Where migration from existing localStorage keys is required, implement it safely without breaking existing users.

Maintain backward compatibility wherever practical.

====================================================================
CHANGE 4 — PASS RESOLVED CUSTOMIZATION TO THE PDF PIPELINE
====================================================================

Keep React hooks inside page/container components.

Do NOT place React hooks inside the PDF renderer.

The page should obtain resolved customization from the engine and pass it into the rendering pipeline.

Update the Waybill PDF rendering path so it consumes resolved customization rather than reading raw customization values directly.

Where appropriate, introduce optional props so existing rendering paths continue functioning.

Blank waybill generation must continue working without regression.

====================================================================
CHANGE 5 — FONT REGISTRATION
====================================================================

Adopt the shared customization font registry abstraction created during Phase 1.

Use the engine's registry abstraction instead of document-specific registration where appropriate.

Preserve all existing rendering behaviour.

Do not remove legacy registration until the shared abstraction fully replaces it.

====================================================================
PRESERVE EXISTING BEHAVIOUR
====================================================================

Do NOT redesign Waybill.

Do NOT modify:

- Render engine
- Pagination
- Table layout
- Template routing
- Template appearance
- Signature rendering
- Blank waybill generation
- Business calculations

Visual PDF output should remain functionally identical except where customization selections intentionally affect typography or ink colour.

====================================================================
CONSTRAINTS
====================================================================

Preserve existing behaviour unless explicitly required.

Avoid unnecessary refactoring.

Keep changes minimal and scoped.

Maintain backward compatibility.

Reuse the Phase 1 engine instead of creating parallel implementations.

Avoid duplicate configuration.

Avoid duplicate persistence.

Avoid duplicate customization logic.

====================================================================
VERIFICATION
====================================================================

Do NOT run:

- bun run build

Run only the verification required by AGENTS.md for active code changes, including the required type safety checks and repository verification.

Verify:

- Waybill customization panel only exposes:
  - Document Font
  - Ink Font
  - Ink Colour

- Accent customization is unavailable.

- Customization persists correctly.

- Existing template picker still functions.

- Existing PDF generation still functions.

- Blank Waybill generation still functions.

- Existing rendering behaviour remains unchanged apart from intended customization effects.

====================================================================
DO NOT
====================================================================

Do NOT modify:

- Invoice
- Quotation
- CSR

Do NOT invent APIs.

Do NOT redesign the engine.

Do NOT redesign Waybill.

Do NOT duplicate customization logic.

Do NOT duplicate persistence.

Do NOT duplicate font configuration.

Do NOT run bun run build.

====================================================================
REPORTING
====================================================================

Follow the Report Protocol defined in AGENTS.md exactly.

Do not invent report locations, filenames, formats, or verification steps.

Use the project's established reporting workflow and naming conventions.

Ensure the report fully documents the completed work, verification performed, architectural decisions, issues encountered, and any deferred work in accordance with AGENTS.md.