PRD — Gradual Retirement of "@react-pdf/renderer"

Project: BIGDROPS
Status: Proposed
Objective: Progressively replace "@react-pdf/renderer" with the new pdfcn-based PDF rendering architecture without disrupting existing production documents.

---

1. CORE OBJECTIVE

BIGDROPS will gradually retire "@react-pdf/renderer" as its PDF rendering engine.

The replacement architecture will use pdfcn with its supported rendering backend(s) for new PDF templates and, progressively, for existing document families.

This is not a big-bang migration.

Existing React-PDF documents remain operational while individual document families are migrated and verified. No existing production document should be migrated merely for the sake of migration.

The final architectural objective is:

Business Data
      ↓
Canonical Document Model
      ↓
BIGDROPS PDF Design System
      ↓
pdfcn
      ↓
Supported PDF Renderer
      ↓
PDF

The long-term goal is to remove "@react-pdf/renderer" completely once every required document family has successfully migrated.

---

2. PROBLEM STATEMENT

The current "@react-pdf/renderer" implementation has become a constraint on the BIGDROPS document system.

The existing renderer contributes to several recurring problems:

2.1 Customisation engine limitations

The BIGDROPS PDF customisation system does not behave reliably enough with the current renderer.

Document-level customization such as:

- accent colors
- layout variants
- compact/expanded presentation
- landscape output
- template presentation choices

is harder to control cleanly because the rendering system imposes its own layout and styling model.

The replacement architecture must allow the customization engine to operate as a first-class design-system concern rather than fighting renderer-specific limitations.

2.2 Landscape rendering quality

The current landscape implementation produces unsatisfactory results.

Landscape must become a genuine document layout mode rather than a renderer workaround.

The new architecture must support:

- portrait A4
- landscape A4
- correct width/height calculations
- predictable table widths
- consistent margins
- correct headers and footers
- correct pagination
- consistent customization behavior between orientations

2.3 Unnecessary page breaks

The current renderer can introduce undesirable pagination behavior.

Documents may break when there is still practical space available, resulting in:

- excessive page counts
- isolated totals
- awkward section breaks
- large unused areas
- poor table continuity
- visually fragmented documents

The replacement architecture must provide substantially better control over pagination and content flow.

2.4 Lack of practical "1 Page" output mode

BIGDROPS requires a document output mode equivalent to the "1 page" functionality found in Refrens.

The meaning of this feature is:

«The complete document should be compressed/reflowed to fit onto one physical PDF page where possible, regardless of how many logical content sections or normal-flow pages the document would otherwise require.»

This is not equivalent to simply deleting page breaks.

The implementation should intelligently reduce the rendered document's physical footprint while preserving:

- all required content
- document hierarchy
- readable text
- tables
- totals
- branding
- critical spacing
- required signatures/verification information

The feature must not silently discard content.

If the content cannot reasonably fit onto one page without violating minimum readability or document-integrity requirements, the system should preserve content rather than producing an unusable PDF.

---

3. STRATEGIC DIRECTION

BIGDROPS will treat PDF rendering as a dedicated presentation layer.

The business/application layer must not become coupled to either:

- "@react-pdf/renderer"
- pdfcn
- Takumi
- Forme
- or another future renderer

The document model remains renderer-independent.

The renderer becomes an implementation detail.

---

4. TARGET ARCHITECTURE

4.1 Required separation

Application / Supabase
        ↓
Business Document Data
        ↓
Canonical Document Model
        ↓
BIGDROPS PDF Presentation Layer
        ↓
pdfcn Components / BIGDROPS Components
        ↓
Renderer Backend
        ↓
PDF

The canonical document model must remain independent from the rendering engine.

---

4.2 Renderer abstraction

The architecture should permit renderer implementations to coexist during migration.

Conceptually:

PDF Renderer Interface
        │
        ├── ReactPdfRenderer [LEGACY]
        │
        └── PdfcnRenderer [TARGET]

The legacy renderer must not receive new architectural investment except where required to preserve existing functionality during migration.

New document families should default to the target pdfcn architecture.

---

5. MIGRATION STRATEGY

Migration will occur incrementally by document family.

Potential migration sequence:

Phase 1
New PDF module
        ↓
Validate pdfcn architecture

Phase 2
Migrate one existing document family
        ↓
Validate

Phase 3
Migrate additional document families
        ↓
Validate

Phase 4
Retire React-PDF-dependent infrastructure
        ↓
Remove @react-pdf/renderer

The exact document-family order must be determined from the existing repository architecture and dependency relationships.

Do not invent migration paths or filenames.

---

6. NEW TEMPLATE REQUIREMENT

All new PDF templates created after adoption of this PRD should use the target pdfcn architecture unless an explicit exception is documented.

New templates must not introduce additional dependencies on "@react-pdf/renderer".

Templates should be composed from reusable BIGDROPS PDF components.

Expected reusable areas include:

- document header
- company identity
- customer/supplier information
- document metadata
- line-item table
- totals
- tax/VAT summary
- payment information
- notes
- signatures
- QR/verification
- page header
- page footer
- page numbering
- legal/terms sections

---

7. BIGDROPS PDF DESIGN SYSTEM

The new renderer must support a centralized BIGDROPS PDF design system.

The PDF design system should own:

- typography
- colors
- spacing
- borders
- table styling
- document margins
- page dimensions
- header/footer behavior
- visual hierarchy
- density variants
- orientation
- template-level visual variants

The existing BIGDROPS/Divine Blood design principles should be translated into PDF-appropriate tokens rather than copied blindly from the application UI.

---

8. CUSTOMISATION ENGINE

The PDF customization engine must be renderer-independent.

Customization must be represented as document presentation configuration rather than direct manipulation of renderer primitives.

Potential customization dimensions include:

Accent
Orientation
Density
Template variant
Table presentation
Header presentation
Footer presentation
Logo presentation

The exact existing customization options must be audited before migration.

The new renderer must not reproduce renderer-specific workarounds that currently exist solely because of React-PDF limitations.

---

9. ORIENTATION REQUIREMENTS

The target architecture must support:

Portrait

A4 Portrait
210 × 297 mm

Landscape

A4 Landscape
297 × 210 mm

Landscape must be treated as a first-class document layout.

Changing orientation must correctly recalculate:

- page dimensions
- content width
- table width
- margins
- header layout
- footer layout
- available content height
- pagination behavior

No CSS/transform hack should be used merely to simulate landscape.

---

10. PAGINATION REQUIREMENTS

The target renderer must provide predictable pagination.

Requirements:

- Avoid unnecessary page breaks.
- Preserve natural document flow.
- Prevent totals from being stranded unnecessarily.
- Keep related sections together where practical.
- Support long tables across pages.
- Support repeating table headers where supported.
- Prevent important blocks from being split when the renderer supports appropriate keep-together behavior.
- Avoid large unexplained blank areas.
- Preserve footer placement.
- Preserve document readability.

Pagination behavior must be tested with both short and long documents.

---

11. "1 PAGE" MODE

BIGDROPS shall provide a document-level output option:

1 Page

Semantics:

«Attempt to fit the entire rendered document onto one physical PDF page through controlled scaling/reflow/compression while preserving all content.»

This mode must be implemented as a rendering/layout capability, not as a destructive content shortcut.

Priority order

When fitting a document to one page:

1. Preserve all content.
2. Preserve document structure.
3. Preserve essential readability.
4. Reduce unnecessary spacing.
5. Reduce non-essential decorative elements where the template permits.
6. Adjust typography/spacing within defined minimum limits.
7. Apply controlled document-level scaling where supported.
8. Produce multiple pages only when one-page output would violate defined readability/integrity limits.

The system must never:

- silently remove line items
- truncate required text
- hide totals
- omit VAT
- omit signatures
- omit payment information
- remove required legal information
- create overlapping content

unless the document's explicit business rules allow such behavior.

---

12. TEMPLATE DESIGN PRINCIPLES

Templates must be:

Reusable

Shared document components should be reused across document families.

Data-driven

Templates receive already-prepared document data.

Templates should not directly query Supabase.

Deterministic

Given identical document data and configuration, rendering should produce equivalent output.

Renderer-aware but renderer-isolated

Components may use pdfcn capabilities but business logic must remain independent of the underlying renderer.

Minimal

Do not reproduce the architectural complexity of the existing React-PDF pipeline simply under a different library.

---

13. DOCUMENT FAMILIES

The migration architecture must support the BIGDROPS document families, including:

- Quotation
- Invoice
- Waybill
- RFQ
- BOQ
- CSR
- future document types

Each family may have multiple visual templates.

Template selection must remain independent from the underlying business data model.

---

14. EXISTING PDF PIPELINE

The current PDF pipeline must be audited before each migration.

Known architecture includes concepts such as:

PdfDocumentModel
      ↓
industryAdapter
      ↓
IndustryTemplate
      ↓
PdfRenderer
      ↓
DefaultPdfGenerator

Migration must preserve business-document behavior while replacing renderer-specific implementation where appropriate.

The audit must identify:

- renderer-specific APIs
- renderer-specific components
- renderer-specific styling
- renderer-specific pagination workarounds
- renderer-specific orientation logic
- renderer-specific customization logic
- renderer-specific PDF generation/download logic

These must not automatically be copied into the new architecture.

---

15. MIGRATION ACCEPTANCE CRITERIA

A document family is considered migrated only when:

- It renders successfully through pdfcn.
- Required content is preserved.
- Tables render correctly.
- Multi-page documents paginate correctly.
- Landscape mode works correctly where supported.
- Portrait mode works correctly.
- Header/footer behavior is correct.
- Totals remain correctly positioned.
- VAT information is preserved.
- Customization options work.
- PDF download/generation works.
- Long descriptions wrap correctly.
- Long tables remain usable.
- No renderer-specific business logic has leaked into the canonical document model.
- No unnecessary React-PDF dependency remains in that migrated path.
- Static type verification passes.
- The resulting diff is scoped to the migration.

---

16. REGRESSION REQUIREMENTS

Migration must preserve existing business semantics.

The migration must not alter:

- tax calculations
- totals
- discounts
- document numbering
- customer/supplier data
- payment data
- document status
- approval data
- audit behavior
- permissions
- Supabase behavior

unless explicitly included in the migration scope.

This is a rendering migration, not a business-logic rewrite.

---

17. DEPENDENCY RETIREMENT

"@react-pdf/renderer" must remain installed only while an active production document still depends upon it.

As each document family migrates:

1. Remove React-PDF-specific imports from the migrated path.
2. Remove obsolete renderer components.
3. Remove obsolete renderer adapters.
4. Remove obsolete workarounds.
5. Verify no remaining consumers require the legacy renderer.

Once repository-wide dependency analysis proves there are no remaining consumers:

@react-pdf/renderer

shall be removed from the project.

No premature dependency removal is permitted.

---

18. VERIFICATION

OpenCode must follow repository standards and read "AGENTS.md" before modifying code.

Relevant skills must be loaded from:

docs/PROJECTSKILLINDEX.md

based on the task, especially relevant PDF rendering/design skills.

For active code changes:

- Run "bun run typecheck".
- Run "bun run audit:load" when schema/query/data-layer logic is touched.
- Run "git status" before and after changes.
- Confirm only intended files were modified.

Explicit restriction

DO NOT run bun run build.

Build execution is permanently excluded because of the project's host resource constraints.

---

19. PHASED IMPLEMENTATION MODEL

Phase 0 — Architecture Audit

Document the existing renderer architecture and identify:

- React-PDF boundaries
- document models
- templates
- customization engine
- pagination logic
- orientation logic
- PDF generation entry points

No unnecessary code changes.

---

Phase 1 — pdfcn Foundation

Introduce the target renderer architecture.

Establish:

- pdfcn integration
- BIGDROPS PDF theme
- renderer boundary
- reusable PDF primitives
- template structure
- PDF generation entry point

Do not migrate every existing document.

---

Phase 2 — First Production Template

Create one complete production-quality pdfcn template.

It must exercise:

- branding
- typography
- tables
- totals
- VAT
- long content
- pagination
- portrait
- landscape where applicable
- customization
- QR/verification where applicable
- footer/page numbering
- one-page mode

This template becomes the reference implementation.

---

Phase 3 — Progressive Migration

Migrate document families individually.

Each migration must be independently verifiable.

Existing unmigrated documents remain on React-PDF.

---

Phase 4 — Legacy Cleanup

After all document families have migrated:

- remove obsolete React-PDF components
- remove obsolete adapters
- remove renderer-specific workarounds
- remove dead customization code
- remove "@react-pdf/renderer"
- update documentation
- verify repository references to React-PDF are gone

---

20. SUCCESS DEFINITION

The migration is successful when BIGDROPS has a PDF architecture where:

Business data
      ↓
Canonical document model
      ↓
BIGDROPS PDF design system
      ↓
pdfcn
      ↓
PDF

and no longer depends on "@react-pdf/renderer".

The resulting system must provide substantially better control over:

- document customization
- portrait/landscape output
- pagination
- table layout
- template consistency
- document density
- one-page output
- reusable document components

while preserving all business-document semantics.

---

21. NON-GOALS

This PRD does not authorize:

- redesigning the entire BIGDROPS application UI
- rewriting document business logic
- changing taxation calculations
- changing database schemas unrelated to PDF rendering
- changing RLS
- changing document numbering
- migrating every document in one operation
- removing React-PDF before its consumers are migrated
- running a production build as verification
- introducing unrelated refactors

---

22. FINAL ARCHITECTURAL PRINCIPLE

The legacy renderer should eventually become history.

BIGDROPS should own its document presentation system rather than being constrained by the layout limitations of a renderer.

The migration is therefore not merely:

React-PDF → pdfcn

It is:

Renderer-coupled PDF system
            ↓
Renderer-independent document architecture
            ↓
BIGDROPS-owned PDF design system
            ↓
pdfcn-powered rendering

The objective is not simply to make PDFs generate.

The objective is to make BIGDROPS PDFs controllable, customizable, predictable, and genuinely template-driven.