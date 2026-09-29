You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel. 
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately. 
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.
====================================================================

A. CONTEXT & OBJECTIVE

Refine the accepted BOQ View Page V4 design direction into V4.1.

V4's overall visual language and information hierarchy are accepted.

DO NOT create another clean-sheet redesign.

The human visual review identified two specific structural problems:

1. The outer gutters plus individual rounded/shadowed item cards make the BOQ schedule feel like a feed of disconnected cards rather than one continuous professional document.
2. Cost and margin information is hidden behind disclosure controls. This creates unnecessary interaction. Commercial information must be immediately readable without clicking.

The objective is to preserve what works in V4 while transforming the schedule into a continuous, full-flowing BOQ document.

B. TARGET COMPONENTS / FILES

Primary source:
- docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/view/boq/boq-view-candidate-mobile-fold-v4.html

Create a V4.1 mobile/fold candidate beside the existing V4 file.

Also inspect the corresponding V4 desktop candidate and determine whether the same commercial-disclosure principle should be reflected there.

Do not overwrite V4.
Do not modify production application code.
Do not modify form candidates.
Do not modify V2 or V3.

C. CONSTRAINTS (EXECUTION-SAFE ONLY)

Read AGENTS.md first.

Load relevant skills from docs/PROJECTSKILLINDEX.md, particularly skills appropriate for HTML prototypes, design artifacts, responsive/mobile UI design, and visual hierarchy.

Preserve existing system behavior unless explicitly modified.
Avoid unnecessary refactors and follow existing project conventions.
No build execution responsibilities assigned to OpenCode.

PRESERVE FROM V4:
- overall typography and visual tone;
- compact app bar;
- BOQ number and status treatment;
- dossier/document identity approach;
- editorial chapter/group hierarchy;
- description-first item hierarchy;
- photo/reference-image concept and read-only lightbox;
- Download FAB behavior and fab-standard compliance;
- simulated MobileBottomNav;
- fold-specific responsive behavior;
- More sheet/action hierarchy;
- dark mode;
- locked BOQ mathematics.

CHANGE THE PAGE STRUCTURE:

The BOQ schedule must become a continuous document surface.

Remove the floating-card treatment from individual schedule items:
- no rounded specimen cards;
- no per-item shadows;
- no visible card islands;
- no large gaps that make entries appear detached.

Do not simply reduce border-radius.

Actually change the composition from "cards in a gutter" to "one flowing document."

The schedule should use substantially more of the viewport width.

Text may still have deliberate horizontal inset for readability, but the page must not look like a stack of narrow cards floating inside a grey background.

Use editorial structure instead:
- whitespace;
- thin horizontal rules;
- item numbering;
- typographic hierarchy;
- chapter boundaries;
- alignment.

Items should visually belong to the same BOQ.

PHOTO BEHAVIOR:

Retain the successful reference-photo concept.

A photo belonging to an item should integrate naturally into that item's document flow rather than forcing the whole item back into a card.

Photo remains tappable for the existing read-only preview/lightbox.

Items without photos reserve no image space.

COMMERCIAL INFORMATION — NO DISCLOSURE INTERACTION:

Remove the per-item "Cost & margin" toggle entirely.

Do not require any click/tap to inspect:
- quantity;
- unit;
- cost price;
- selling price;
- line cost;
- line selling total;
- line gross profit;
- margin.

Design a compact permanently-visible commercial composition for every item.

Do not turn this into a spreadsheet/table.

The commercial block should remain visually subordinate to the description/specification but instantly scannable.

Use the existing commercial color semantics carefully:
- cost information uses the established cost tone;
- selling/profit information uses the established selling/profit tone.

The overall BOQ commercial summary must also be permanently exposed.

Remove the collapsed/expanded commercial capsule behavior.

Show the relevant overall values directly:
- Total Cost
- Selling Total
- Gross Profit
- Margin

Keep this summary compact and in normal document flow.
Do not make it sticky.
Do not create a dark commercial band.
Do not resurrect V3's persistent commercial chrome.

The existing final close-out may still provide the formal concluding totals; intentional summary repetition at the document close is acceptable.

GROUPS:

Retain the V4 editorial chapter concept.

Groups remain static and in-flow.
No horizontal group-chip rail.
No group tabs.
No sticky group navigation.
No dark group envelopes.

MOBILE BOTTOM NAV + FAB:

The candidate must continue to simulate the actual mobile/fold bottom navigation.

Keep the standard Download FAB positioned correctly above the bottom navigation according to docs/standard/fab-standard.md.

Ensure schedule content can scroll completely clear of both FAB and bottom navigation.

The bottom nav must remain visible in the prototype so the human reviewer can judge the true available viewport.

RESPONSIVE/FOLD:

Phone and fold remain in the same mobile-fold candidate.

Do not treat fold as merely a wider phone.

At fold width, use the extra horizontal room intelligently for commercial alignment and image/text composition while retaining the continuous-document principle.

Do not reintroduce cards at fold width.

DESIGN INTENT:

The target feeling is:

"One BOQ document flowing through the application"

not:

"A collection of BOQ item cards"

and not:

"A spreadsheet/ledger."

D. REQUIRED VERIFICATION (HARD HARDWARE GATE)

DO NOT run bun run build. Permanently banned due to host 4GB RAM limits.

This is a design-direction HTML task.

Do not run bun run typecheck or lint.

Perform:
- git status immediately before work;
- git status after work;
- git diff --check;
- static inspection of the resulting standalone HTML;
- verify V4 remains untouched;
- verify no production application source files changed;
- verify no V2/V3/form candidate files changed;
- verify all BOQ monetary values still derive from the locked formulas;
- verify there are no per-item commercial disclosure/toggle controls;
- verify overall commercial values are visible without interaction;
- verify item commercial values are visible without interaction;
- verify mobile bottom navigation remains simulated;
- verify Download FAB remains compliant with the current FAB standard.

Do not perform browser/runtime visual verification on behalf of the human reviewer.

E. REQUIRED BEHAVIOR

Keep changes minimal and scoped to this design-direction iteration.

Do not use this feedback as permission to redesign accepted V4 elements unrelated to the identified issues.

The most important transformation is structural:

V4 card feed
→
V4.1 continuous BOQ document.

Commercial information must be readable immediately.

No click-to-reveal cost or margin behavior.

F. ACCEPTANCE CRITERIA

- V4's accepted visual identity remains recognizable.
- Individual BOQ items no longer appear as floating rounded cards.
- The schedule reads as one continuous document.
- Excessive schedule gutters are removed.
- Items remain clearly distinguishable through editorial hierarchy and separators.
- Cost and margin require zero interaction.
- CP/SP and derived commercial values are immediately scannable.
- Overall BOQ commercial figures require zero interaction.
- The layout does not resemble a spreadsheet or ledger.
- Photo behavior remains functional and integrated into the flow.
- Chapter/group hierarchy remains clear.
- Mobile bottom navigation is visibly simulated.
- Download FAB clears the bottom navigation and follows the current standard.
- Fold receives a deliberate responsive composition.
- Locked BOQ math remains unchanged.
- No unintended files are modified.

DESKTOP WIDTH / LARGE-SCREEN COMPOSITION:

The desktop candidate has another structural problem: it does not use enough of the available PC viewport width.

Redesign the desktop composition so it feels intentionally desktop-native rather than like a constrained mobile/tablet document centered on a large screen.

Do NOT use a narrow fixed max-width that leaves excessive dead space on both sides.

The desktop view should make strong use of the available viewport:
- use a fluid responsive shell;
- expand meaningfully across normal laptop and desktop widths;
- retain sensible outer margins rather than huge empty gutters;
- allow the primary BOQ schedule to occupy the majority of the available width;
- use the remaining horizontal space intentionally for document context/actions/commercial information where appropriate;
- scale gracefully on 1366px, 1440px, 1920px and wider displays;
- introduce a sensible maximum only at genuinely very large viewport sizes if necessary for readability.

This does NOT mean stretching every text line from edge to edge.

Use desktop width through composition:
- wider schedule area;
- deliberate columns where useful;
- better commercial alignment;
- appropriately sized image regions;
- a useful supporting/context rail if retained;
- whitespace inside the composition rather than wasting large areas outside the entire page.

The continuous-document principle from mobile/fold also applies to desktop:
- do not turn schedule items into floating cards;
- do not create a narrow paper sheet surrounded by empty background;
- do not reproduce a PDF-page preview metaphor;
- do not make desktop look like an enlarged phone layout.

Desktop should feel like a purpose-built BOQ workspace taking advantage of a PC screen.

Inspect the existing V4 desktop candidate specifically for:
- max-width constraints;
- wrapper/container width;
- schedule-to-rail ratio;
- unnecessary outer margins;
- unused viewport space.

Replace those constraints where they are responsible for the narrow appearance.

At desktop sizes, the human reviewer should immediately perceive that the application is using the screen rather than merely centering content within it.


- Desktop uses the available PC viewport substantially better than V4.
- No excessive empty margins caused by an unnecessarily restrictive max-width.
- Desktop is a genuinely desktop-specific composition, not a centered tablet/mobile layout.
- At 1366px, 1440px and 1920px widths, the BOQ workspace expands appropriately.
- The main schedule receives the dominant share of desktop width.
- Wider layout does not produce excessively long text lines; width is consumed through composition and alignment.
- Desktop retains the same continuous-document philosophy as mobile/fold.