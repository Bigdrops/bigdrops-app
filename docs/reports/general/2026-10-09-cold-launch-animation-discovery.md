# Cold-Launch Animation Discovery Survey

This report was written by Muse Spark on 2026-10-09 via OpenCode.

Objective: determine whether Componentry or comparable React libraries offer animations suitable for the selected Tree cold-launch design. Zero code changes apply.

Design reference: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/cold-launch-tenant-tree/variations/the final.html` (TREE option, dark-only).

Files changed: `docs/reports/general/2026-10-09-cold-launch-animation-discovery.md` (this report only).

Skills used: animate, karpathy, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

## 1. What the selected Tree actually uses

Verified from source (no visual run):

- Radial SVG dendrogram built in JS: tier rings (dashed circles), edges as quadratic paths drawn via `stroke-dashoffset` with `pathLength="1"`, nodes as SVG groups popping from parent positions.
- Hot path INV → PAY → RCP: second overlay path plus a pulse dot driven by SMIL `<animateMotion dur="1.8s" begin="2.5s">`.
- Hero: DOM logo spring (`logoLife`), halo, `.beat` phrase, eat veil via `clip-path:circle()`.
- Tips: two alternating `steps()` tip cards, 8 s cycle, `role="status"`.
- Reduced motion: full static end-state via `.rm` class plus media query. Single active option only.
- No framework, no network, no canvas. All motion is CSS plus one SMIL element.

Any candidate must beat this baseline on structure, not decoration. Nothing below replaces the bespoke tenant geometry. Candidates can only supply techniques.

## 2. Componentry catalog verdict

Catalog inspected (53 components, `componentry.dev`). Nothing in it is genuinely comparable to CircuitBoard's network/node/branching behavior:

- Closest structural item is **Orbit Card Stack** — a hover-driven card fan for team profiles. Wrong interaction model for a splash (no hover intent, marketing pattern). Excluded.
- **Magnet Lines**, **Aurora Flow**, **Spectral Ribbon**: cursor- or ambient-driven decoration with no node semantics. Excluded per brief.
- Text effects (**Letter Cascade**, **Kinetic Text Reveal**, **Split Flap Display**) are usable only as moments, not structure (see shortlist).
- Verdict: Componentry offers no second CircuitBoard. Its value here is two text-moment techniques, not a tree alternative.

## 3. External survey (excluded with reasons)

- **React Bits** (DavidHDev/react-bits): motion is GSAP plus ScrollTrigger-driven (verified in `SplitText` source). A splash has no scroll trigger, and GSAP would be a new dependency (project standard is framer-motion/motion). Decorative WebGL backgrounds (`Ballpit`, `LightRays`) are excluded per brief. No fit.
- **Aceternity Tracing Beam**: verified scroll-driven ("a beam that follows the path of an SVG as the user scrolls"). No scroll exists on cold launch. Excluded. Its `Multi Step Loader` and `Text Flipping Board` are generic loader/text patterns with no structural advantage over the current build. Excluded.
- **Animate UI** (Skyleen): animated Radix/Base/Headless control primitives (tabs, tooltips, sheets). Control-level motion, no node graphs. Excluded.
- **Cult UI**: no node-graph, beam, or tree offering found. Excluded.
- **Motion Primitives** (ibelick, 34 components): no node graphs, but `Text Effect` stagger and `Animated Group` presets are legitimate small utilities (see shortlist).

## 4. Shortlist (ranked by Tree usefulness)

### 1. Magic UI AnimatedBeam

- Creator: Magic UI (dillionverma), `github.com/magicuidesign/magicui` (~22.5k stars).
- Demo: `https://magicui.design/docs/components/animated-beam` (verified live; uni/bi/multi-input examples).
- Source: same page (copy-paste component + demos).
- License: repository states MIT; re-confirm the file header at adoption.
- Dependencies: framer-motion (already a project dependency), clsx, tailwind-merge.
- Rendering: SVG beams between measured DOM refs, gradient pulse travel, curvature/reverse props.
- Best BIGDROPS use: cross-workspace handoffs (INV-A → PAY-B → RCP-C) and workspace branching edges — exactly the Tree's weakest hand-built part (static quadratic paths plus one SMIL dot).
- Performance risk: low. Runs on framer-motion; beams are a handful of SVG paths. Must be converted from infinite to one-shot and gated on reduced motion (demos loop forever).
- Integration complexity: low-medium. Needs DOM refs for tenant/function nodes; geometry stays custom.
- Recommendation: **preview first**. Strongest structural fit found.

### 2. motion-primitives-website SvgCircuitBoard (+ SvgGradientFlow)

- Creator: itsjwill (`github.com/itsjwill/motion-primitives-website`), copy-paste collection.
- Demo: site component gallery (paths `svg/animated-svg.tsx`; page copy verified via repo listing).
- Source: same repository.
- License: UNVERIFIED — confirm before use.
- Dependencies: per repo, varies (site uses Framer Motion, GSAP, Three.js across components); the SVG pair itself is SVG SMIL/CSS-grade — verify at extraction.
- Rendering: SVG — auto-generated circuit traces with pulsing nodes and data particles; flowing gradients on paths.
- Best BIGDROPS use: edge-drawing and pulse vocabulary for tree edges; a second opinion on the current hand-rolled dash technique.
- Performance risk: low (SVG). Same one-shot conversion required.
- Integration complexity: low (technique reference; likely adapt, not adopt).
- Recommendation: inspect as technique reference alongside AnimatedBeam.

### 3. Componentry Letter Cascade

- Creator: Harsh Jadhav / Componentry.
- Demo: `https://componentry.dev/docs/components/letter-cascade` (verified live; hover/click/center-wave variants).
- Source: `npx shadcn add @componentry/letter-cascade`.
- License: creator notes "verify licenses before production" — confirm at adoption.
- Dependencies: framer-motion, clsx, tailwind-merge (all present or trivial).
- Rendering: DOM spans with 3D flip, motion blur, springs; exposes `onComplete` and mount-compatible triggers.
- Best BIGDROPS use: the BIGDROPS wordmark hero moment as an alternative to the current CSS mask reveal.
- Performance risk: low (one word, one shot). Must trigger on mount, not hover.
- Integration complexity: low.
- Recommendation: optional preview for the wordmark only; do not touch the tree for this.

### 4. Componentry Split Flap Display

- Creator: Harsh Jadhav / Componentry.
- Demo: `https://componentry.dev/docs/components/split-flap-display` (verified live; rows API verified).
- Source: `npx shadcn add @componentry/split-flap-display`.
- License: same verify-note as above.
- Dependencies: framer-motion (per catalog pattern).
- Rendering: DOM character cells with flip steps, stagger delays.
- Best BIGDROPS use: rotating status-line phrases ("Securing your session" → …) as an alternative to the current phase-swapped text.
- Performance risk: low. Novelty value only — current status line already works.
- Integration complexity: low.
- Recommendation: preview only if the status line feels flat; lowest priority of the four.

### 5. Motion Primitives Text Effect / Animated Group (ibelick)

- Creator: ibelick, `github.com/ibelick/motion-primitives` (34 components).
- Demo: `https://motion-primitives.com/docs` (catalog verified; per-effect pages not individually opened — mark effect-level details UNVERIFIED).
- Source: same repository.
- License: UNVERIFIED — confirm before use.
- Dependencies: `motion` (project already carries `motion@^12.42.2` — zero new weight).
- Rendering: DOM with Motion variants, stagger presets.
- Best BIGDROPS use: staggered node entrances if the tree is ever rebuilt in React (replaces hand-tuned CSS delays with variants).
- Performance risk: low.
- Integration complexity: low, but only pays off in a React rebuild, not in the current static HTML.
- Recommendation: keep on file for the production React build; not useful for the current prototype.

## 5. Performance and offline safety

- All shortlisted items bundle locally (copy-paste source, no CDN, no runtime fetch). None requires a network request at startup.
- framer-motion and motion are already project dependencies — candidates 1, 3, 4, 5 add zero new weight. Only candidate 2 needs a dependency check at extraction.
- Every candidate demos an infinite loop; each must be converted to a one-shot with a settled end-state before cold-launch use, exactly as the current Tree already does.
- All must be gated on `prefers-reduced-motion` (current Tree's `.rm` static end-state is the pattern to copy).
- SVG/DOM techniques (1, 2) suit Android low-end devices; spring text (3, 4) is one word — cheap. No WebGL anywhere in the shortlist by design.
- No candidate delays initialization: all are presentational and mount after the existing readiness flags.

## 6. Final verdict

A. Does Componentry offer anything genuinely comparable to CircuitBoard? **No.** The catalog has no second network/node component. Its usable items are two text moments (Letter Cascade, Split Flap).

B. Is there a better component elsewhere for the Tenant Tree? **Yes, one: Magic UI AnimatedBeam** — the only surveyed component whose mechanism (beams between live elements) directly maps to the Tree's handoff problem.

C. Adopt, adapt, or keep? **Adapt.** Keep the custom Tree (its tenant geometry and eat ending are bespoke and already built); adapt AnimatedBeam's beam technique for handoff edges and optionally Letter Cascade's spring flip for the wordmark. Adopt nothing wholesale.

D. Single most promising preview: **Magic UI AnimatedBeam** (`https://magicui.design/docs/components/animated-beam`).

## 7. Verification statement

- `git status` ran before and after. Only this report was added.
- Zero source, config, dependency, or test modifications. No builds, typecheck, lint, or audit:load. No code executed or installed.
- Links above were fetched live during this survey except where marked UNVERIFIED. No URLs invented.
