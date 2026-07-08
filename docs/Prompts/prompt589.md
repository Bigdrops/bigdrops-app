```text
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It defines project architecture, audit workflow, locked business rules,
standards, and implementation constraints.

Also load all relevant skills from docs/PROJECTSKILLINDEX.md before
making changes. This task primarily requires:
- using-superpowers
- Karpathy
- frontend-design
- typescript-advanced-types
====================================================================

OBJECTIVE

Implement the foundational PDF Customization Engine only. This phase
builds the architecture. No existing document family may adopt it yet.
No rendering behaviour may change. No PDF output may change. No existing
UI may be replaced. This is an architecture extraction phase only.

--------------------------------------------------------------------
ENGINE RESPONSIBILITIES

Create the following reusable concepts.

PdfCustomizationCapabilities
Defines what a document/template supports. Examples include:
- accent colour
- document font
- handwriting font
- handwriting colour
The type must be extensible.

------------------------------------------------
PdfCustomizationPolicy
Defines which supported capabilities are exposed to users.
Policies must be declarative. No UI logic.

------------------------------------------------
PdfTemplateDefaults
Represents immutable template defaults. These are template-owned
defaults only. Do not migrate existing templates.

------------------------------------------------
ResolvedPdfCustomization
Represents the fully resolved immutable customization object that
downstream document engines consume. No template should need to
perform fallback logic.

------------------------------------------------
resolvePdfCustomization()
Implement as a pure function.

Inputs:
- template defaults
- customization policy
- user settings
- capabilities

Output: ResolvedPdfCustomization

No React. No storage. No side effects.

------------------------------------------------
User Settings

Create a versioned settings model. Include schema versioning from the
beginning. Use the exact interface defined below (do not invent your own):

```typescript
export interface PdfCustomizationSettings {
  version: 1;
  accentColor?: string;
  documentFont?: string;
  inkFont?: string;
  inkColour?: string;
}
```

Do not migrate existing storage keys yet. No existing persistence
should change.

---

usePdfCustomization()

Create a reusable hook.

Responsibilities:

· load settings
· save settings
· invoke resolvePdfCustomization()
· expose resolved customization

The hook should support document-family storage names but MUST NOT
replace existing document usage during this phase.

---

Font Registry

Create a unified font registration abstraction. This layer will
eventually replace existing font registration.

During this phase:
DO NOT modify: Invoice, Quotation, Waybill, CSR
They must continue using their existing font registration.
The new abstraction simply exists ready for adoption.

---

Shared UI

Create PdfCustomizationPanel.

Requirements:

· capability-driven
· policy-driven
· reusable
· no document-specific assumptions

It must not be wired into any existing page.

---

FILE STRUCTURE

Create all engine files under a new directory:

src/domain/pdf/customization/

Use the following structure:

src/domain/pdf/customization/
types.ts                  — PdfCustomizationCapabilities, PdfCustomizationPolicy,
PdfTemplateDefaults, ResolvedPdfCustomization,
PdfCustomizationSettings
resolver.ts               — resolvePdfCustomization() pure function
hooks.ts                  — usePdfCustomization()
fontRegistry.ts           — unified font registration abstraction

src/components/pdf-customization/
PdfCustomizationPanel.tsx — shared UI component

Do NOT create files outside this structure. Keep all engine code co-located.

---

IMPORTANT ARCHITECTURAL RULES

The shared customization engine MUST NOT own:

· render models
· adapters
· pagination
· HTML sanitization
· PDF generation
· React-PDF rendering
· template layout
· document transformation

Those responsibilities remain permanently inside the existing document
engines. The only output produced by the engine is:

ResolvedPdfCustomization

Existing document engines will consume that object during future
migration phases.

---

DO NOT

Do not modify:

· Invoice pipeline
· Quotation pipeline
· Waybill pipeline
· CSR pipeline
· React-PDF templates
· Render models
· Preview systems
· Adapters
· Existing persistence keys
· Existing UI
· Existing document behaviour
· Existing rendering behaviour

---

VERIFICATION

Perform only safe verification. Run:
bun run typecheck
git status

DO NOT run:
bun run build

Only report files actually created or modified. Changes must remain
minimal, isolated, and backward compatible.

---

ACCEPTANCE CRITERIA

· All types, the resolver, the hook, the font registry abstraction,
  and the shared UI component exist under the specified directories.
· bun run typecheck passes with zero errors.
· No existing PDF pipeline, template, adapter, or UI component was
  modified.
· The engine can be imported by a future document without requiring
  immediate migration of existing code.

```