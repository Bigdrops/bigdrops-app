# Returning-User Startup Round 2 Report

This report was written by Muse Spark on 2026-10-04 via OpenCode.

## Objective

- Start a fresh creative exploration. Do not iterate the rejected first-round candidates.
- Create six new standalone HTML startup candidates for returning BIGDROPS users.
- Split the set into three mobile/fold-specific designs and three desktop-specific designs.
- Visualize BIGDROPS being alive. Do not visualize loading.

## Scope

- Create six files under `docs/templates/html-temps/onboarding-candidates/`.
- Change no production application source code.
- Change no existing reference design. Do not overwrite the previous three candidates.
- Run no build, no typecheck, no lint, no audit. This task assigns no build duties.

## Files changed

- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-mobile-01.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-mobile-02.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-mobile-03.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-desktop-01.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-desktop-02.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-desktop-03.html` (new)
- This report (new)

## Skills used

Skills used: animate, valyu-best-practices, design-artifact, html-prototype, mobile-app-ui-design, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

- ASD-STE100 Simplified Technical English.

## Research pass

- Read `docs/PROJECTSKILLINDEX.md`. Located the animation skill (`animate`, entry 97) and the Valyu skill (`valyu-best-practices`, entry 49).
- Loaded and applied the `animate` skill. Motion decisions follow its build sequence. Purpose is explanation and delight at a once-per-day frequency. Tool is CSS animation, because predetermined motion stays smooth while the page loads. Properties are transform and opacity, plus sanctioned clip-path and SVG stroke-dashoffset. Easing uses the strong ease-out and in-out curves. Snap easing provides overshoot. Reduced-motion variants ship in all six files.
- Loaded the `valyu-best-practices` skill. The Valyu API needs an API key. No key exists in the environment or repository. The CLI returns `setup_required`. No key was requested from the user, because this task assigns no credential duties.
- Ran the equivalent inspiration research through the session web-search channel instead. Categories covered:
  - Premium app startup experiences (Android SplashScreen guidance, 60fps.design splash analyses, SVGator launch patterns).
  - Motion identity (brand-as-system case work, diagonal mask-block transitions, loader-to-mark morphs, staggered spring entrances).
  - Editorial motion graphics and fintech motion (modular line-and-dot environments, data-viz plus abstract shape systems on modular grids).
  - Kinetic typography (staggered letter entrances with overshoot, sliding typographic reveals, text-as-texture columns).
  - SVG techniques (single-stroke draw paths, dashoffset loops, GPU-composited scenes under 150KB).
  - Sophisticated loading alternatives (skippable loops, exit-at-any-frame transitions, spatial-continuity patterns).
- Key translations into BIGDROPS: mask-bar reset wipe (D3), sweep and morph transitions (M1, D1), modular channel environments (D2), magnetic rail alignment (M3), stroke-drawn approval checks (D1, D3), exit-from-any-frame loops (all six).
- Also applied `design-artifact` (per-artifact art direction), `html-prototype` (self-contained files, semantic structure), `mobile-app-ui-design` (phone-first composition, 44px targets), and `accessibility` (labels, focus states, contrast, reduced motion).

## Changes made

- M1 `bigdrops-returning-mobile-01.html` — Vertical cascade press. A request sheet drops down a tall shaft, folds at station one, takes an approval stamp strike at station two, splits into invoice and receipt at station three, and files into a bottom slot. Depth comes from rotateX folding, stamp anticipation plus overshoot, and layered scale. The tip prints vertically on the document edge.
- M2 `bigdrops-returning-mobile-02.html` — Living business desk. An in-tray feeds slips to a ledger, a calculator ripples key presses while its display ticks three totals, a stamp strikes the page, and records slide into archive slots. All objects use CSS geometry. The tip sits on an engraved brass plate on the desk.
- M3 `bigdrops-returning-mobile-03.html` — Abstract system named Sort. Labelled chips fall into three magnetic rails, snap into slots with overshoot, a sweeper bar aligns them, and streams converge into a balance beam that levels. Kinetic module words drift behind as texture. The tip sits on a specimen label. This candidate takes the greatest mobile risk.
- D1 `bigdrops-returning-desktop-01.html` — Business command table. RFQ enters from the left edge, pricing chips rain from the top, a quotation forms center-left, an invoice emerges center-right, a payment token arcs in with a stroke-drawn check, and a receipt files into a right-edge archive drawer. The tip sits on the drawer face.
- D2 `bigdrops-returning-desktop-02.html` — Kinetic business network. Client, project, and ledger hubs connect through curved SVG channels with flowing dashes. Invoice, payment, VAT-split, and receipt packets travel the channels. Relationship badges form and dissolve. Values propagate as tickers. The tip is etched on the ledger hub. This is not a generic node graph. Hubs are business cards and packets are documents.
- D3 `bigdrops-returning-desktop-03.html` — Cinematic editorial signature. Oversized masked words cycle RECORD, RECONCILE, READY. Parallax document outlines drift. A signature path draws in a loop. A diagonal mask bar sweeps to hide the loop reset. The tip sits in a colophon footer. This candidate is the desktop wild card.
- Each candidate shows one stable tip. No tip rotates. Each tip presentation differs per candidate.
- No candidate centers on a waybill, van, route, or map. No logistics workflow appears.
- Status text reads "Opening your workspace…" in small type only. No dot pulses. No indicator competes with the scene.
- All animation loops indefinitely. All loops exit cleanly from any frame. No completion state exists.
- All files support light and dark themes with a toggle. M3 and D3 default to dark as an art-direction choice. The toggle still offers light.
- All files support `prefers-reduced-motion` with deliberate static compositions.
- Mobile files cap at 480px and fill the tall canvas with full-height scenes. Desktop files compose at 1360px with full-width stages. No file is a scaled copy of another.

## Why mobile suits narrow and fold displays

- M1 uses the phone height as the machine. The shaft needs vertical travel. A wide screen would dilute it.
- M2 packs one hand-sized desk into the viewport. Controls sit at 44px. Nothing hides behind taps.
- M3 stacks three rails across 360px. Chips stay legible at close viewing distance. The drift column fills height without demanding width.

## Why desktop uses wide-screen space

- D1 needs four horizontal lanes plus edge entry points. The composition collapses on a phone.
- D2 needs three hubs spread across 1200px so packets visibly travel. Channels need run length.
- D3 needs a two-column editorial grid plus oversized type at 9vw. The mask sweep needs horizontal distance.

## Verification result

- `git status` before changes: recorded. Pre-existing CPS modifications and untracked CPS reports belong to another workstream. They were not touched.
- `git status` after changes: confirms six new candidate files plus this report. No production source file changed.
- Static Node check across all six files: passed. Valid document structure, no emoji, no banned concepts, reduced-motion present, theme handling present, all script IDs resolve, all inline scripts parse, tips and labels present.
- One `✓` glyph in D2 tripped the emoji-range check. Replaced with text. Re-ran the check. All checks passed.
- Emoji confirmation: no emoji appears in any of the six files. All illustration uses CSS geometry, inline SVG, or typographic shapes.
- Production-source confirmation: no file under `src/` was added or modified by this task.
- `bun run audit:load`: not run. Excluded by task instruction.
- `bun run typecheck`: not run. Excluded by task instruction.
- Lint: not run. Excluded by task instruction.
- `supabase db push`: not applicable.
- `bun run build`: not run. Permanently banned for this task.

## Supabase push status

- Not applicable. No schema change. No SQL change.

## Risks or limitations

- Browser rendering was not executed. Timing was reviewed by source inspection only. Open each file on a real phone and a wide monitor before user testing.
- The Valyu API key was unavailable. Inspiration research used web search instead. Source quality is lower than a Valyu deep-research pass.
- D2 packet positions use percentage coordinates tuned for wide stages. Narrow windows keep the file viewable but the composition targets 1024px and above.
- D3 oversized type uses viewport-relative sizing. Confirm no clipping at 1024px exactly.
- Google Fonts links degrade to system stacks offline. Layout does not depend on web fonts.

## Deferred work

- Motion tuning after real-device review.
- Selection of winning candidates after stakeholder review.
- Production transition design from any loop frame into the ready application.
- A Valyu deep-research pass if an API key becomes available.
