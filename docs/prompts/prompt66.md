You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
Follow its audit-first workflow, locked rules, skills registry, and standards completely.
====================================================================

A. CONTEXT & OBJECTIVE

This is a TARGETED VISUAL FIDELITY CORRECTION.

DO NOT demolish or rebuild the Cost & Pricing Sheet implementation again.

The latest transplant is substantially closer to the accepted V13 design, and its working business architecture must be preserved.

I have attached two screenshots:

1. ACCEPTED V13 DESKTOP CANDIDATE
2. CURRENT PRODUCTION IMPLEMENTATION

Use the screenshots together with the authoritative HTML candidate:

docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-desktop.html

The accepted candidate is the source of truth.

The current production screenshot is evidence of remaining visual drift.

Your job is to close that drift.

DO NOT perform another feature interpretation.
DO NOT redesign.
DO NOT introduce another generic document-form system.
DO NOT change the underlying CPS business architecture.

This task is primarily CSS, composition, typography, sizing, spacing, and exact candidate-structure correction.

====================================================================
CRITICAL: DO NOT COMPARE DIFFERENT DATA STATES AS DESIGN DIFFERENCES
====================================================================

The candidate screenshot contains populated sample rows.

The production screenshot is currently an empty/new document.

Do not mistake the absence of rows in the production screenshot for a structural design defect.

Compare equivalent regions independently.

When rows exist, their production rendering must still follow the V13 candidate HTML exactly.

Do not inject fake production rows merely to make the page resemble the screenshot.

B. OBSERVED VISUAL DRIFT TO CORRECT

The implementation is CLOSE, but it is not there yet.

Use direct inspection of the HTML/CSS to determine exact values. Do not rely only on this prose.

### 1. Overall scale and density

The production implementation feels substantially more enlarged and loose than the candidate.

The candidate has:
- tighter overall density;
- smaller, more disciplined typography;
- more compact controls;
- less oversized whitespace;
- a stronger technical/workspace character;
- a wider usable information density.

Production currently feels zoomed-in and simplified.

Match the candidate's actual:
- max widths;
- column proportions;
- vertical rhythm;
- field heights;
- gaps;
- section spacing;
- typography sizes;
- button heights;
- rail width;
- content density.

Do NOT solve this with browser zoom or transform: scale().

Correct the actual CSS dimensions.

### 2. Header fidelity

Candidate:
- compact back control;
- restrained document title;
- small secondary DRAFT / workspace identity line;
- compact Save BOQ-style candidate button geometry;
- candidate header proportions and spacing.

Production:
- title is much larger and heavier;
- header occupies a different visual hierarchy;
- Save treatment is too lightweight/different;
- spacing does not match.

Reproduce the candidate header structure and sizing faithfully.

User-facing terminology must remain:

Cost & Pricing Sheet

Do NOT restore Bill of Quantities or BOQ user-facing terminology just because it appears in the historical candidate screenshot.

Translate terminology only.
Preserve candidate geometry.

### 3. Section heading treatment

The candidate section headers have a specific technical-document treatment:
- numbered prefix;
- compact uppercase heading;
- horizontal rule;
- small trailing context/identifier.

Production is similar but not sufficiently faithful in scale, spacing, and weight.

Match the candidate precisely.

### 4. Metadata grid

The candidate metadata block is denser and has different:
- label sizing;
- input height;
- border treatment;
- spacing;
- grid proportions;
- title-field placement.

Production currently makes these controls too large and spacious.

Use the candidate HTML values.

Do not substitute generic application input sizing.

### 5. Main workspace proportions

Candidate desktop has a deliberate left authoring workspace + right commercial rail relationship.

Production has the concept, but the proportions and whitespace differ.

Match:
- candidate main-column width;
- rail width;
- gutter;
- top alignment;
- sticky behavior where candidate defines it;
- vertical spacing between rail panels.

Do not let the rail become a generic dashboard sidebar.

### 6. Commercial rail

The candidate rail is visually stronger and more intentional.

Production currently looks like generic white cards.

Match the candidate:
- card geometry;
- internal padding;
- heading treatment;
- large selling-total typography;
- handwritten/technical number treatment where the candidate specifies it;
- separators;
- row spacing;
- Instant Markup card;
- Save card;
- button geometry.

Do not reinterpret these through generic shared Card components if those components prevent fidelity.

### 7. Action toolbar

Candidate actions are compact, deliberate controls.

Production actions currently look like large text actions spread across excessive space.

Match the candidate:
- button sizing;
- icon sizing;
- borders;
- gaps;
- grouping;
- Clear All positioning;
- active/hover treatment.

Preserve functionality:
- Add Item;
- Add Group;
- Import;
- Columns;
- Instant Markup;
- Clear.

### 8. Empty state

Production currently has a large dashed empty-state area and large Add Item / Add Group buttons.

Verify this against the V13 HTML.

If this exact empty-state composition is NOT defined by V13, do not let an invented empty state dominate the page.

An empty CPS should still look like the same V13 pricing workspace waiting for its first row.

Keep Add Item / Add Group discoverable without turning the empty document into a generic onboarding panel.

### 9. Row fidelity

DO NOT damage the row implementation while correcting the empty state.

When rows are present, reproduce the candidate row exactly enough that the candidate screenshot and production are recognizably the same composition.

Pay special attention to:
- narrow numbering rail;
- reorder controls;
- description field;
- secondary description treatment;
- make/brand;
- photo control;
- quantity/unit;
- CP;
- SP;
- CP MONEY OUT / SP MONEY IN labels;
- line-profit strip;
- remove control;
- Insert Below;
- group boundaries.

Do not turn rows into generic cards.

### 10. Group fidelity

Groups must retain the V13 candidate treatment.

Do not create large independent card islands.

Group boundaries organize the schedule; individual rows must remain visually legible inside them.

### 11. Candidate typography

Audit the candidate's complete typography hierarchy.

Production currently appears too large in several places.

Match:
- title;
- section heading;
- labels;
- input text;
- toolbar text;
- totals;
- helper text;
- rail headings;
- row financial labels;
- group headings.

Do not globally shrink the page blindly.

Reproduce the candidate hierarchy intentionally.

### 12. Hardcoded styling remains authorized

For these CPS presentation surfaces, hardcoded candidate styling remains explicitly authorized.

Do NOT translate candidate values back into generic BIGDROPS theme tokens merely for consistency.

Candidate CSS is the visual contract.

C. PRESERVE THE CURRENT ARCHITECTURE

Do NOT undo the successful transplant architecture.

Preserve:

- BoqFormPage orchestration;
- BoqEditor controller;
- BoqV13DesktopFormPresentation;
- BoqV13MobileFoldFormPresentation;
- separate V4.1 View presentations;
- useBoqSave;
- useDocumentSave;
- JSON Import;
- Instant Markup;
- Cloudinary item photos;
- column management;
- normalization;
- persistence;
- calculation adapters;
- computeBoqTotals();
- computeDocument() separation;
- viewData;
- Create → Save → View → Edit → Save → View lifecycle.

This is not an architecture rewrite.

D. MOBILE/FOLD WARNING

Although the screenshots supplied for this correction show desktop, DO NOT fix desktop by introducing CSS that damages the accepted mobile/fold presentation.

The mobile/fold source remains:

docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/boq-form-candidate-v13-mobile-fold.html

Any shared CSS modification must be checked against the mobile/fold presentation.

Desktop-specific corrections should remain desktop-scoped where appropriate.

Do not merge desktop and mobile/fold DOM compositions.

Do not alter stable presentation selection.

Do not introduce keyboard-sensitive breakpoint logic.

E. VIEW PAGE PROTECTION

Do not casually modify V4.1 View while correcting V13 Form fidelity.

The current screenshots concern the FORM.

Only modify shared styling that affects View if necessary and proven safe.

Do not start another View redesign in this task.

We will visually inspect V4.1 separately.

F. TARGET FILES

Inspect before editing.

Expected relevant files include:

src/components/boq/BoqEditor.tsx
src/components/boq/BoqV13FormPresentations.tsx
src/components/boq/boq-v13-form.css

Inspect other files only where necessary.

Do not resurrect:
- BoqEditorParts.tsx
- BoqFormPresentations.tsx

Do not invent another abstraction layer.

G. IMPLEMENTATION METHOD

Before changing CSS, perform a region-by-region comparison between:

AUTHORITATIVE:
boq-form-candidate-v13-desktop.html

and:

CURRENT:
BoqV13DesktopFormPresentation + boq-v13-form.css

Create a private implementation checklist covering:

- shell;
- top bar;
- title hierarchy;
- document details heading;
- metadata grid;
- pricing schedule heading;
- toolbar;
- individual row;
- group;
- commercial rail;
- totals;
- Instant Markup rail entry;
- Save rail entry;
- close-out;
- empty state.

Then correct the actual production implementation.

Do not merely eyeball a few colors.

H. REQUIRED VERIFICATION

DO NOT run bun run build.

Run:
- bun run typecheck
- focused CPS tests
- Instant Markup regression tests
- import/View regression tests
- git diff --check
- git status

Do not run audit:load unless query/data-layer logic changes.

No database work should be necessary.

I. ACCEPTANCE CRITERIA

This correction succeeds only if:

- production desktop V13 is visually much closer to the accepted screenshot;
- page scale matches;
- density matches;
- typography hierarchy matches;
- header geometry matches;
- metadata geometry matches;
- toolbar geometry matches;
- right rail matches;
- populated rows retain candidate structure;
- empty state does not introduce a foreign generic design;
- candidate hardcoded styling is preserved;
- Cost & Pricing Sheet terminology remains user-facing;
- no BOQ/Bill of Quantities user-facing regression occurs;
- no business behavior changes;
- JSON Import still works;
- Instant Markup still works;
- Cloudinary photo behavior still works;
- Save/Edit lifecycle still works;
- mobile/fold is not regressed;
- keyboard-safety mechanics are not regressed;
- typecheck passes;
- focused tests pass;
- git diff --check passes.

J. FINAL REPORT

Do not give me a generic "fidelity improved" statement.

Report the actual visual corrections made.

Include:

1. shell/max-width before → after;
2. desktop column/rail proportions before → after;
3. header typography before → after;
4. metadata input geometry before → after;
5. toolbar control geometry before → after;
6. row geometry changes;
7. commercial rail geometry changes;
8. empty-state changes;
9. CSS selectors/media queries changed;
10. confirmation that mobile/fold presentation remains separate;
11. confirmation that no business/domain behavior changed;
12. exact files changed;
13. any remaining known visual mismatch.

If any region remains an approximation, say so explicitly.

Do not mark visual fidelity PASS merely because typecheck passes.