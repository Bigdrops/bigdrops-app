# Onboarding Redesign Report — Facelift and Tax Ease Variants

This report was written by Buffy on 2026-09-09 via Freebuff.

---

## Objective

Redesign the BIGDROPS onboarding experience. Replace the desktop-style horizontal storyboard with a premium, mobile-first, full-screen flow. Then produce a second variant aligned with the Taxation Made Easy Engine PRD, with a dedicated taxes slide.

## Scope

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-Animated.html` — rewritten in place.
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-Tax-Ease.html` — new file.
- Both are design prototypes. No production code, no backend, no new business claims.

## Skills used

Skills used: apple-design, animate, webapp-testing (loaded; Playwright not executed — visual verification left to the user per instruction)
Documentation standard: ASD-STE100 Simplified Technical English

## Source authorities

- Facelift PRD: `00-index.md` (mobile-first, slate-navy locked, Manrope + DM Mono, bottom of file safe areas).
- Tax PRD: `Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md`. Constraints honored: compliance is a side effect of recording activity; no invented statutory values (no rates, no deadline dates — the VAT date is an open item in `OBLIGATION-LOOKUP-INDEX.md`); Files.tax monthly position (VAT position, WHT position, attention items); no tax jargon.

## Files changed

- `BIGDROPS_Onboarding-Animated.html` — full rewrite (was: 5-card horizontal storyboard).
- `BIGDROPS_Onboarding-Tax-Ease.html` — new file (variant of the rewritten file).

## Changes made

### Both files share

- Full-screen slides, edge-to-edge, `100dvh`, no horizontal storyboard, no desktop controls.
- Story preserved: Intro → Invoicing → Logistics → Projects → (Taxes) → All-in-one → Sign Up.
- Swipe navigation: Pointer Events, 1:1 tracking, ~10px hysteresis, rubber-band edges, momentum projection (deceleration 0.998), velocity handoff into a critically damped spring (response 0.42s), fully interruptible mid-flight. Flick veto at ±350 px/s.
- Buttons, dots, keyboard arrows, and Skip (hidden on first and last steps). Back button appears from step 2.
- Safe areas: `env(safe-area-inset-top/bottom)` on top bar, rail, slide padding, and bottom zone. Small-phone media query at 640px height.
- Dark theme through Liquid Onyx tokens under `prefers-color-scheme`; themes change color only.
- Reduced motion: animations dropped, transforms neutralized, slides become instant, forms keep opacity transitions; a live `role="status"` region announces steps; skiplink, focus-visible, 44px targets, `aria-roledescription` carousel semantics.
- Sign Up slide: full name / work email / password with blur-then-live validation, error text wired through `aria-invalid` and `aria-describedby`, password visibility toggle (`aria-pressed`), 3-segment strength meter, simulated submit with busy state, and a Sign in swap with matched fields.
- Logistics hero: layered SVG cargo van scene — far skyline, midground trees, road with moving dashes; gradients for body, navy band, glass, rim; reflection streak, mirror, bumpers, lights, wheel arches, spinning wheels; soft radial ground shadow that breathes with the body; van enters from the left once per activation, then a subtle 2.5px bob; parallax marquee at two speeds (44s / 26s); waybill and pin chips float above.
- Type: Manrope (display and UI) + DM Mono (financial figures), per the locked typography decision.

### Tax Ease variant only

- 7 slides. New slide 5, "Your taxes, handled quietly".
- Files.tax card: brand header with "Sorted" pill; VAT position (Tracked), WHT position (Tracked), Attention items (Review) rows; a status flow (Recorded → Calculated → Ready for NRS) with a looping dot. No amounts, no rates, no dates — the card shows state, not fabricated figures.
- Three floating chips: "Record payment", "VAT & WHT applied", "NRS-ready invoice" — the Record → Explain → Comply → Transmit philosophy from the Tax PRD, in plain words.
- Ecosystem orbit expanded to five modules: Invoices, Waybills, Projects, Files.tax, Compliance.
- Onboarding copy updated: "Invoicing, logistics, projects, taxes, and more".

### Animation decisions (animate skill)

- Gate: onboarding = rare/first-time tier; purpose = Explanation. Delight budget spent here only.
- Tool: CSS animations for predetermined motion (reveal, marquee, wheels, flow dot); JS springs only for gesture-driven track motion.
- Properties: transform and opacity only; loops use ease-in-out or linear by role; entrances use `cubic-bezier(.22,1,.36,1)`; no `ease-in` anywhere; UI durations under 650ms only for the once-per-activation reveal (explanatory tier).

## Verification result

Verification:
- Visual verification: left to the user per explicit instruction ("leave visual verification to me. leave playwright alone"). Not executed.
- A small defect from the earlier session was found in code review and fixed in both files: `.rv-l`/`.rv-r` lacked a base `opacity:0`, which would cause a one-frame flash before slide activation.
- A dead-code line in the drag clamp was removed.
- bun run audit:load: not applicable (docs/ prototype only, no source change)
- bun run typecheck: not applicable (no TypeScript change)
- git status: not run at time of writing; new/changed files are the two HTML files and this report

Known limitation: the hash deep-link (`#s0`…`#s6` in the Tax Ease file, `#s0`…`#s5` in the base file) jumps with motion disabled by design, so reviewers land on the exact slide.

## Risks or limitations

- The van is a crafted SVG illustration, not a photograph or 3D render. It reads as a modern branded van; the "photographed" quality depends on the viewer. A raster image can replace it later without touching layout.
- The wheels use a 4-spoke cross; at high spin speed this can strobe slightly on some panels. If seen, slow `wheelSpin` from 0.85s to 1.1s.
- Google Fonts load over network; offline devices fall back to system fonts. Layout tolerates this (no fixed text boxes).
- The Files.tax card uses the words "Tracked", "Review", "Sorted" — states only. Any future numeric values must come from the engine, per the Tax PRD guardrails.

## Update 2026-09-09 (same day)

The logistics hero vehicle changed from a cargo van to a branded commercial tricycle (keke napep). This matches real Nigerian last-mile freight and the reference direction the user gave. All three onboarding files use the same keke drawing with yellow body, navy band, BIGDROPS wordmark, three spinning wheels, and unchanged animation behavior. The unused van body gradient was removed. The PhotoHero report records the same change for its file.

## Deferred work

- User visual verification on real devices (iPhone notch, small Android, dark mode).
- Decide which variant ships as canonical; the base file keeps 6 slides, Tax Ease has 7.
- Optional: extract the shared engine into a partial if a third variant is ever requested.
