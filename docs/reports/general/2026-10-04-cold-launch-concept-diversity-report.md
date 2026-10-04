# Return-User Cold Launch — Concept Diversity Report

This report was written by Buffy on 2026-10-04 via Freebuff (Codebuff).

Skills used: animate, design-artifact, html-prototype, mobile-app-ui-design
Documentation standard: ASD-STE100 Simplified Technical English

---

## Objective

Create six unrelated motion identities for the BIGDROPS returning-user cold launch.
Three identities target mobile and fold. Three identities target desktop.
The work is a design exploration. It does not change production behavior.

## Scope

- Work area: `docs/templates/html-temps/onboarding-candidates/`.
- Deliverable: six new standalone HTML candidates and this report.
- Out of scope: production source, Supabase, migrations, build, typecheck, lint, audit:load.

## Files changed

| File | Change |
| :--- | :--- |
| `docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-01.html` | New. Concept "Live Type". |
| `docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-02.html` | New. Concept "Ink Bloom". |
| `docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-03.html` | New. Concept "Folded Sheet". |
| `docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-01.html` | New. Concept "Corridor". |
| `docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-02.html` | New. Concept "Constellation". |
| `docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-03.html` | New. Concept "Clockwork Line". |
| `docs/reports/general/2026-10-04-cold-launch-concept-diversity-report.md` | New. This report. |

No other file changed. The two surviving reference files did not change.

## 1. Skills used

- **animate** — decided the purpose, the tool, the properties, the curve, and the reduced-motion path for each candidate.
- **design-artifact** — chose one palette, one type pairing, and one composition idea per candidate. Used the anti-cliché checklist.
- **html-prototype** — enforced one self-contained file per candidate, responsive composition, visible focus, and reduced motion.
- **mobile-app-ui-design** — guided the 8-point spacing, the safe areas, the 60/30/10 color rule, and the tip sizes.

## 2. Research and inspiration categories

The research did not stay inside "loading screen". The following categories were examined.

- Film and broadcast title sequences: establish tone in the first seconds; use one visual metaphor rather than many.
- Kinetic typography: motion must amplify meaning; keep type readable while it moves; use one motion direction.
- Operating-system boot identities: a boot owns the whole screen and never implies "percentage complete".
- Automotive HMI startup: a cold open is a handshake, not a progress report.
- Premium fintech motion: fluid and viscous motion reads as money and care; rigid motion reads as machinery.
- Physical mechanisms, paper engineering, and cartography: real materials give believable weight.

Principles extracted and applied:

| Principle | Where it is used |
| :--- | :--- |
| One metaphor per identity. | All six. Each uses one dominant primitive. |
| A deliberate first event inside 800 ms. | All six. See section 8. |
| Living motion must be causal, not drifting. | All six. See section 5. |
| A limited palette beats a wide one. | All six. White and navy bind the set. |
| Typography is either the subject or the signage, never both. | "Live Type" uses type as subject. The other five use type as signage. |
| Paper and mechanisms give weight; fluids give care; depth gives scale. | Assigned per candidate. |

## 3. Why the two surviving references look different

Two reference files survive in the folder:

- `BIGDROPS cold launch v3.html` — warm cream and amber. A circular lens window holds two counters that scroll in opposite directions. A three-position switch (Portal, Shutter, Floor) offers a lens, a split shutter, and a marquee floor. Composition is centred lens plus a bottom copy stack. Motion is linear marquee scroll and scale pulses.
- `navy-launch.html` — cold navy and light blue. Concentric rotating rings and a centred mark. Four labelled shards radiate outward. Composition is centred machinery plus a left-hand copy block. Motion is rotational and radial.

They read as different because they disagree on every axis that the eye reads first.

| Axis | "cold launch v3" | "navy-launch" |
| :--- | :--- | :--- |
| Temperature | Warm (cream, amber, orange) | Cold (navy, ice blue) |
| Dominant primitive | Rectilinear scrolling columns inside a circular window | Concentric rotating rings with radial shards |
| Silhouette | Round window, square cards, bottom stack | Round core, diagonal shards, left stack |
| Motion physics | Linear marquee, continuous | Rotational pulses, pulsed |
| Type role | Label and marquee material | Kicker and left-hand headline |
| Depth | Flat, layered | Simulated grid floor |

The user kept both because the eye files them in two different cabinets. Neither is copied here.

## 4. Six-concept pre-implementation diversity matrix

Hard rule held: no two concepts share a dominant primitive.

| Concept | Dominant primitive | Spatial model | Primary motion | Motion physics | Typography role | Tip mechanism | Color balance | Depth model | Emotional character | Fold / wide transformation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Live Type | Typography as physical material | One vertical type column on a page | Letters drop, lock, and hand off to a tip beat | Elastic spring with overshoot | Subject | The tip becomes the type: a full-width pull-quote interlude | 82% white / 18% navy | Flat, ink on paper | Confident, editorial | One page becomes a two-page spread with a crease and an index page |
| Ink Bloom | Fluid pigment | A vertical vessel that holds ink | Ink blooms, rivers crawl, a pool pulses | Viscous, slow ease-in-out | Carved negative space | Ink-written margin note, revealed by a wipe | 72% white / 28% navy | Wet, soft, blurred | Organic, patient | One vessel becomes two communicating vessels joined by a siphon |
| Folded Sheet | Paper | A folded leaf on a desk | The sheet folds, creases snap, flaps peel | Crisp mechanical snap | Letterpress print | Printed label with a folded corner, slotted into the paper | 65% white / 35% navy | Physical shadow and crease | Crafted, tactile | A stack of folded leaves unfolds into a three-panel panorama |
| Corridor | 3D spatial depth | A colonnade of bays receding to a vanishing point | The camera dollies through the bays | Cinematic inertial ease | Architectural signage | Spatial annotation on a leader line, in the corridor | 28% white / 72% navy | True perspective, 1500 px | Immersive, cinematic | Width supplies parallel bays; a phone collapses to one tunnel |
| Constellation | Point field | A wide cartographic plane | Points burst and converge into constellations | Inertial gravity with damping | Chart annotation | Chart caption with a coordinate prefix and a serif body | 78% ivory / 22% navy | Flat chart plane | Precise, curious | Width spreads six constellations; a phone crops the chart |
| Clockwork Line | Mechanical linkage | A long horizontal machine | Gears mesh in sequence and a conveyor carries plates | Precise geared stepping | Industrial labelling | Engraved data plate with a rolling readout | 75% white / 25% navy | Technical line work | Engineered, purposeful | Width is the machine; a phone breaks the gear train |

## 5. Concepts rejected during self-critique

| Candidate | Problem found | Action |
| :--- | :--- | :--- |
| A grid-of-light-cells tile field | Tiles belong to the panel family. This would have duplicated "Fold later panels" and risked the reference "v3" cards. | Rejected before code. |
| A ribbon and path-flow field | Flowing lines were already the internal motion of "Constellation" hairlines. | Rejected before code. |
| A second typographic candidate ("typeset receipt roll") | Two candidates would have used type as the dominant mover. | Rejected before code. |
| A second paper candidate ("card shuffle") | Paper was already taken by "Folded Sheet". | Rejected before code. |
| "Ink Bloom" first build used a full-screen ink wash | White lost its role. The screen read as one dark field, close to "Corridor". | Redesigned to a white paper ground with navy ink. |
| "Clockwork Line" first build slid the tip plate across the viewport | The tip left the screen and became unreadable. | Redesigned to a fixed engraved plate with a rolling readout. |

## 6. Final six concept names

1. Live Type (mobile + fold)
2. Ink Bloom (mobile + fold)
3. Folded Sheet (mobile + fold)
4. Corridor (desktop)
5. Constellation (desktop)
6. Clockwork Line (desktop)

## 7. Dominant primitive for each

1. Live Type — typography.
2. Ink Bloom — fluid pigment.
3. Folded Sheet — paper.
4. Corridor — spatial depth.
5. Constellation — point field.
6. Clockwork Line — mechanical linkage.

No two are the same.

## 8. First-800 ms event for each

| Concept | First event |
| :--- | :--- |
| Live Type | Each letter of BIGDROPS drops from above and locks with an overshoot. A baseline rule draws under the word. |
| Ink Bloom | An ink drop strikes the top well. A wet splat blooms and four capillary rivers start to crawl. |
| Folded Sheet | A white leaf drops onto the desk and a crease snaps down the sheet with a shadow. |
| Corridor | A thin vertical slit of white light snaps open at the vanishing point and blooms. The camera starts to push. |
| Constellation | About 140 points burst from the centre and snap into a constellation in 900 ms. A hairline draws. |
| Clockwork Line | The left gear train engages left to right with a stepped clatter after a short lateral recoil. |

## 9. Motion physics for each

| Concept | Physics | Curve family | Cycle |
| :--- | :--- | :--- | :--- |
| Live Type | Elastic spring | `cubic-bezier(.2,1.35,.35,1)` | 1.3 s word beat, 4.4 s tip beat |
| Ink Bloom | Viscous fluid | `cubic-bezier(.65,.03,.36,1)` | 6.8 s to 15.2 s per element |
| Folded Sheet | Mechanical snap | `cubic-bezier(.2,1.2,.3,1)` | 2.2 s to 7.4 s |
| Corridor | Cinematic inertial | `cubic-bezier(.4,.02,.62,1)` | 1.1 s dolly loop, 7.5 s portal |
| Constellation | Inertial gravity | `cubic-bezier(.16,1.05,.3,1)` | 3.4 s pulse, 9 s migration |
| Clockwork Line | Precise geared stepping | `cubic-bezier(.35,1.4,.4,1)` | 5 s lamp, 5.5 s conveyor |

No two candidates share a curve or a cycle time.

## 10. Tip treatment for each

Each candidate carries exactly three rotating tips. Rotation is 4.4 s to 5.5 s.

| Concept | Treatment |
| :--- | :--- |
| Live Type | The tip replaces the type: it becomes a full-width pull-quote that closes the spread. |
| Ink Bloom | An ink-written margin note. A paper wipe reveals it and an ink underline draws itself. |
| Folded Sheet | A printed label with a folded corner slotted into the paper. It slides out and the next slides in. |
| Corridor | A spatial annotation on a leader line, floating in the corridor depth. |
| Constellation | A chart caption with a coordinate prefix and a serif body under a heavy top rule. |
| Clockwork Line | An engraved riveted data plate with a rolling readout that stays fixed in place. |

## 11. Phone to Fold transformation for each mobile candidate

| Concept | Phone (360–430 px) | Fold open (640–900 px) | Conceptual change |
| :--- | :--- | :--- | :--- |
| Live Type | One vertical type column. Fold-only content hidden. | Two-page spread. A crease, a right-hand index page, and the tip closes the spread. | One page becomes two coordinated pages. |
| Ink Bloom | One vertical vessel: well, bloom, pool. | Two vessels side by side joined by a siphon. Ink crosses between them. | One vessel becomes two communicating vessels. |
| Folded Sheet | A stack of three folded leaves with visible edges. | The stack unfolds into a three-panel panorama with hinge shading. | A folded object opens into a wider object. |

Each fold state was confirmed in the browser. See section 17.

## 12. Width-native behavior for each desktop candidate

| Concept | Why width is essential |
| :--- | :--- |
| Corridor | The colonnade needs parallel bays across the width. A phone collapses the perspective into a single tunnel. Bays are `min(66vw, 880px)` wide. |
| Constellation | Six constellations span x = 17% to x = 88%. A phone crops most constellations and the chart frame. |
| Clockwork Line | The gear train is one linkage. Stations spread from x = 58 px to x = 1290 px at 1440 px wide. A phone breaks the train. |

## 13. Post-implementation cross-candidate similarity audit

Every candidate was compared with the other five.

| Pair checked | Shared silhouette? | Shared primitive? | Shared physics? | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Live Type vs Ink Bloom | No (type block vs vessel) | No | No | Pass |
| Live Type vs Folded Sheet | No | No | No | Pass |
| Live Type vs Corridor | No | No | No | Pass |
| Live Type vs Constellation | No | No | No | Pass |
| Live Type vs Clockwork Line | No | No | No | Pass |
| Ink Bloom vs Folded Sheet | No (organic vs geometric) | No | No | Pass |
| Ink Bloom vs Corridor | No (light ground vs dark depth) | No | No | Pass |
| Ink Bloom vs Constellation | No (mass vs points) | No | No | Pass |
| Ink Bloom vs Clockwork Line | No | No | No | Pass |
| Folded Sheet vs Corridor | No | No | No | Pass |
| Folded Sheet vs Constellation | No | No | No | Pass |
| Folded Sheet vs Clockwork Line | No | No | No | Pass |
| Corridor vs Constellation | No (dark depth vs light flat) | No | No | Pass |
| Corridor vs Clockwork Line | No | No | No | Pass |
| Constellation vs Clockwork Line | No (scatter vs rigid train) | No | No | Pass |

Also checked against the two surviving references.

- No candidate uses the centred-lens composition of "cold launch v3".
- No candidate uses the concentric-ring core of "navy-launch".
- No candidate reuses the bottom copy stack plus rounded tip card of the references.

One pair was at risk during the build. "Live Type" and "Constellation" both use line work on a light ground. They were kept apart by the dominant primitive: "Live Type" moves type; "Constellation" moves points. "Corridor" and "Constellation" are both dark-bodied fields; they were kept apart because "Constellation" is flat and cartographic while "Corridor" is a true perspective volume. No redesign was required after the build.

## 14. Dominant primitive uniqueness

Confirmed. Typography, fluid pigment, paper, spatial depth, point field, and mechanical linkage are six different primitives. No two candidates share one.

## 15. Surviving references untouched

Confirmed. `BIGDROPS cold launch v3.html` and `navy-launch.html` were read but never written. Their file timestamps (04:53 and 04:49) are older than all six new files (05:12 to 05:24).

Limitation: the folder is untracked in git, so git cannot show a diff for those two files. The timestamp evidence and the absence of any write call support the claim.

## 16. Exact git status scope

Before work and after work, the production changes and the untracked report files were unchanged.

New untracked paths added by this task:

```text
docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-01.html
docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-02.html
docs/templates/html-temps/onboarding-candidates/cold-launch-mobile-fold-03.html
docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-01.html
docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-02.html
docs/templates/html-temps/onboarding-candidates/cold-launch-desktop-03.html
docs/reports/general/2026-10-04-cold-launch-concept-diversity-report.md
```

The folder `docs/templates/html-temps/onboarding-candidates/` stays untracked as a whole. The pre-existing modified source files under `src/` and the pre-existing reports were not touched.

## 17. Browser preview and verification result

Verification:

- `bun run build`: not run (banned by hardware policy).
- `bun run audit:load`: not run (not required; no code change).
- `bun run typecheck`: not run (not required; no code change).
- `git status`: captured before and after. Scope is correct.
- Supabase push: not applicable.

Browser preview: **yes, all six were loaded in the browser preview** and inspected at both target widths.

| Candidate | Phone 390 × 844 | Fold 720–820 × 844 | Desktop 1440 × 820 | Result |
| :--- | :--- | :--- | :--- | :--- |
| Live Type | Type column, rail, tip interlude at 22.6 px | Two columns 356/304 px, crease visible, index shown | — | Pass |
| Ink Bloom | One vessel, 4 blobs, 4 capillary paths, tip 15 px | Two vessels 334 px each, siphon visible and animated | — | Pass |
| Folded Sheet | Stack of 3 leaves, flap peel, tip 15 px | Three columns 251 px each, equal tops, hinge shading | — | Pass |
| Corridor | — | — | 11 bays, near bay 918 px to far bay 482 px, depth confirmed | Pass |
| Constellation | — | — | 123 points, 6 labels, 12 polylines, spread confirmed | Pass |
| Clockwork Line | — | — | 6 gears spinning, 6 plates riding, stations spread 58 px to 1290 px, tip plate on screen | Pass |

Checks performed on the six files:

- Exactly three rotating tips in each. Confirmed by source and by runtime tip swaps.
- Tip body copy is 15 px on phone and 15–16 px on desktop. Confirmed by computed style.
- No emoji. Only typographic marks (em dash, middle dot, degree sign).
- No spinner, spinner ring, orbiting loader, progress bar, percentage, fake stage, bouncing dot, skeleton, or shimmer.
- No waybill, truck, route, parcel, or map concept.
- `prefers-reduced-motion` block present in all six files, plus a `matchMedia` guard in each script. Verified at runtime that the media rule is registered.
- Console: no errors at load on the desktop candidates after the aspect-ratio guard was added. No errors on the mobile candidates.

Two real defects were found during verification and fixed:

1. "Folded Sheet" kept the phone stack offsets at fold width, because a more specific selector won. Fixed with an equal-specificity reset.
2. "Constellation" produced `NaN` polyline coordinates on a zero-size first paint, because the aspect ratio divided by zero. Fixed with a guarded aspect ratio. The reload is now clean.

Limitation: pixel screenshots could not be captured. The preview webview reported that it was not composited. Visual quality is therefore confirmed by DOM geometry, computed styles, and console checks, not by eye. One visual judgement remains open for the user: the exact feel of the six motion rhythms.

## Changes made

- Added six standalone HTML candidates, one per concept.
- Added this report.

## Verification result

- `bun run audit:load`: not run (no code change).
- `bun run typecheck`: not run (no code change).
- `git status`: reviewed before and after. Scope correct.
- Browser preview: passed for all six, at phone, fold, and desktop widths as applicable.
- `supabase db push`: not applicable.

## Supabase push status

Not applicable. This task did not change SQL or the database.

## Risks or limitations

- Pixel-level rendering was not captured. See section 17.
- The six candidates are standalone design artifacts. They do not load production code, and production does not load them.
- Fold states depend on a media query at 640 px. A true foldable device reports a wide viewport, so the fold state triggers on width, not on a fold signal.
- Font stacks use system fonts. The intended faces (Inter, Georgia, Arial Narrow, a monospace) may fall back on some machines.

## Deferred work

- Add a hinge-angle or `device-posture` signal if the real fold hardware exposes one.
- Choose one concept and rebuild it inside the real application shell as the cold open.
- Wire the chosen concept to the real initialization events, with no minimum display time.
- Add a static poster frame for the reduced-motion state if the browser paints before styles load.

## Confirmation

No production behavior changed. The cold launch motion never blocks and never reports fake readiness. Each candidate is an ambient loop that a user can interrupt at any moment.
