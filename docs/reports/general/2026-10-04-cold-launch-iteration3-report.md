# Cold-Launch Iteration 3 Report

This report was written by Muse Spark on 2026-10-04 via OpenCode.

## Objective

- Create six completely new cold-launch concepts for returning BIGDROPS users.
- Target emotion: premium, alive, serious, curiosity about the application behind the experience.
- Split the set into three Mobile x Fold designs and three desktop designs.
- Use white as a major visual component with slate and navy contrast.

## Scope

- Create six files under `docs/templates/html-temps/onboarding-candidates/`.
- Change no production application source code.
- Do not modify `navy-launch.html`. Do not overwrite previous explorations.
- Run no build, no typecheck, no lint, no audit.

## Files changed

- `docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-01.html` (new)
- `docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-02.html` (new)
- `docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-03.html` (new)
- `docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-01.html` (new)
- `docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-02.html` (new)
- `docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-03.html` (new)
- This report (new)

## Skills used

Skills used: animate, valyu-best-practices, design-artifact, html-prototype, mobile-app-ui-design, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

- ASD-STE100 Simplified Technical English.

## Negative reference

- Inspected `navy-launch.html`. Identified its grammar: central morphing rings, breathing logo, shards flying outward from center, radial flash, perspective grid floor, bottom headline plus tip card.
- Moved deliberately away. No candidate uses a central composition, rings, a breathing logo, radial bursts, a perspective grid, or a headline-plus-card layout.
- The viewport itself is the experience in all six files. No animation sits inside a card.

## Research pass

- Read `docs/PROJECTSKILLINDEX.md`. Located the animation skill (`animate`) and the Valyu skill (`valyu-best-practices`).
- Loaded the `animate` skill and applied its build sequence. Purpose is delight at once-per-day frequency. Tool is CSS animation for off-main-thread motion during load. Properties are transform, opacity, clip-path, and SVG stroke motion. Curves are strong ease-out, ease-in-out, and snap overshoot. Reduced-motion variants ship in all files.
- Loaded the `valyu-best-practices` skill. The Valyu API needs an API key. No key exists in the environment. The CLI returns `setup_required`. Ran the equivalent research through web search instead.
- Inspiration categories explored and their influence per concept:
  - OS boot-part architecture (play-once intro plus looping part, exit at any point): all six use a fast hook plus a seamless living loop with exit from any frame.
  - Saul Bass title sequences (type flying in from off-screen, masked credit reveals): MF2 slice shear, D1 mask lanes, D3 letter burst.
  - HMI startup sequences (layered decisive full-screen state change): MF1 panel unfold, MF3 block slam assembly.
  - Kinetic typography systems (staggered overshoot entrances, ripple waves, intermission cards): D3 letter system, MF2 fragment alignment.
  - Editorial and fintech motion systems (modular grids, contour fields, stream accents): D2 contour current.
  - Masked cinematic transitions (clip-path wipes, diagonal band sweeps): D1 lanes, MF1 intermission band, desktop tip wipes.
- Also applied `design-artifact` (per-file art direction), `html-prototype` (self-contained files), `mobile-app-ui-design` (phone-first composition, 44px targets), and `accessibility` (labels, focus, contrast, reduced motion).

## Concepts

- MF1 Unfold. Grammar: spatial folding and unfolding. Three white planes snap open from a spine in 700ms, revealing a navy field with an oversized wordmark. Fold state: five panels unfold from center plus a mono ledger strip. Fold-specific choreography, not a wider phone.
- MF2 Shear. Grammar: slicing and segmentation. Five horizontal slices shear in from alternating edges and align one fragmented headline. A scanline keeps the field alive. Fold state: six vertical slices plus a static figures column. Different axis, different rhythm.
- MF3 Assembly. Grammar: physical assembly with overshoot. A navy header slams down, ledger rows and stat blocks snap in from opposite edges, a cyan bridge locks them. A heartbeat pulse travels the scaffold. Fold state: a second block column plus a cross bridge between columns.
- D1 Mask. Grammar: masked cinematic reveal. Three staggered clip-path lanes wipe across the wide canvas: wordmark, slate band, rising white working surface with ledger and figures. Width carries three simultaneous lanes.
- D2 Current. Grammar: flowing information. Contour lines drift across white while a bright stream surges through them. No discrete carried objects. No chips on rails. Width gives the stream run length.
- D3 Type. Grammar: kinetic typography. Per-letter burst, staggered snap reassembly, ripple waves, cycling verbs. Tips arrive as numbered typographic intermissions. Width carries 12vw letterforms plus flanking figure columns.

## First-second hooks

- MF1: panels snap open by 700ms with overshoot.
- MF2: slices shear in from both edges by 800ms.
- MF3: header bar slams down at 200ms, blocks stagger in by 700ms.
- D1: wordmark mask wipe opens immediately at first paint.
- D2: bright stream surges across the full width within 800ms.
- D3: letters drop from above with rotation by 700ms.

## Fold changes

- MF1: three left-hinged panels become five center-out panels plus a ledger strip.
- MF2: five horizontal slices become six vertical slices plus a figures column.
- MF3: one block column becomes two columns joined by a cross bridge, with wider tip card placement.

## Desktop wide-space use

- D1: three full-width staggered mask lanes plus a two-column working surface.
- D2: full-bleed contour field with 1440-unit stream path plus a 400px side panel.
- D3: full-width 12vw letterforms, flanking columns, full-width intermission band.

## Tips

- Each candidate contains exactly three tips. The three tips use the exact approved product wording.
- Tips rotate every 5.2 seconds with eased transitions. No progress indicator. No dots.
- Presentations differ: intermission band (MF1), moving ribbon (MF2), emerging spatial card (MF3), masked wipe panel (D1), side panel reveal (D2), typographic intermission (D3).
- Tip body copy is 15px minimum on phone and 16px to 19px on desktop, with strong contrast.
- Reduced-motion users see the first tip statically. All three tips remain in the DOM.

## Verification result

- `git status` before work: recorded. Pre-existing CPS modifications belong to another workstream. They were not touched.
- `git status` after work: confirms six new cold-launch files plus this report. No production source changed. `navy-launch.html` unchanged.
- Static Node check: passed for document structure, JS parsing, tip counts, reduced motion, fold breakpoints, and wide-space markers in all six files.
- Emoji check: no emoji in any of the six files. One check glyph in an earlier draft was replaced with text.
- Banned-concept check: no spinner, ring, progress bar, skeleton, shimmer, dots indicator, waybill, truck, route map, orbit, conveyor, desk, machine, or navy-launch grammar in any file.
- Percentage check: all `%` tokens are CSS keyframe stops, clip-path insets, layout dimensions, or the VAT 7.5% business tax rate. No loading percentage exists.
- Browser preview: no candidate was browser-previewed. This workstation has no browser preview step in the workflow. Visual success is claimed from source inspection only. Open each file on a real phone, a foldable or 700px viewport, and a wide monitor before user testing.
- `bun run audit:load`: not run. Excluded by task instruction.
- `bun run typecheck`: not run. Excluded by task instruction.
- Lint: not run. Excluded by task instruction.
- `supabase db push`: not applicable.
- `bun run build`: not run. Permanently banned for this task.

## Supabase push status

- Not applicable. No schema change. No SQL change.

## Risks or limitations

- No browser preview occurred. Timing, fold breakpoint behavior, and clip-path performance need real-device review.
- Tip rotation pauses when the tab hides and resumes on return. This is intentional.
- Google Fonts degrade to system stacks offline. Layout does not depend on web fonts.
- D2 and D3 target wide viewports. Small windows stay functional but lose the intended composition.

## Deferred work

- Real-device timing tuning after browser preview.
- Stakeholder selection among the six directions.
- Production transition design from any loop frame into the ready application.
- A Valyu deep-research pass if an API key becomes available.
