# Cold Launch Concepts — V4 Review

Author: Buffy. Date: 2026-10-08.

Subject: the four-concept comparison file "BIGDROPS — Cold Launch Concepts" (A · SUNRISE, B · TRAILS, C · BLUEPRINT, D · GLASS), reviewed against the production launch architecture.

Deliverable: `docs/templates/html-temps/onboarding-candidates/BIGDROPS cold launch v4.html`

Reference: `docs/reports/general/2026-10-07-existing-cold-launch-startup-audit.md`

## 1. Summary

The four concepts are good posters. None of them is a launch screen.

They were designed from the outside: a designer's idea of a business day, dropped behind the word "BIGDROPS". The production launch screen is already defined in code. It has real content (a status sentence, a quick tip, a wordmark), a real budget (about 600 ms), a real theme system (two themes, semantic tokens), and a real honesty rule (no fake progress). The concepts do not respect any of those five constraints.

V4 keeps the strongest idea of each concept and rebuilds it on the real launch. It is one line. A single light travels the line through the real startup chain and stops on the brand mark.

## 2. Findings

### 2.1 A disqualifying flaw common to all four concepts

Concepts B, C, and D show business work completing during startup.

- B shows QUOTE / APPROVAL / PAYMENT / RECEIPT completing.
- C shows SALES / REVIEW / ACCOUNTS / RECORDS completing.
- D shows the same four as glass cards.

The application is not doing that work at startup. It restores a session, loads a profile, and resolves a workspace. The audit records this as a deliberate property of the current build: "No fake progress exists to remove: CONFIRMED." A launch screen that reports "Payment recorded" while the app is still checking a session token is a false statement to the user.

Dropping this flaw also removes the reason those concepts exist. Their whole structure is a four-step document relay. V4 keeps the line and the flow, and puts the real launch stages on it.

### 2.2 Reduced motion is handled by a parallel list, not by the keyframes

Every concept animates back to `opacity: 0`. For example `dawnReveal` ends at `opacity: 0`, `glassIn` ends at `opacity: 0`, and `trailCard` has `0%, 100% { opacity: 0 }`.

The comparison file protects itself with its own block:

```css
@media(prefers-reduced-motion:reduce){
  *{ animation:none !important; }
  .dawn-glow, .dawn-title span, .dawn-copy, .trail-card, .trail-glow { opacity: 1; }
}
```

That list is hand-made. Add one element and the element is invisible for a reduced-motion user until someone remembers the list.

The risk is larger inside the app. The app's global rule is not `animation: none`. It is:

```css
animation-duration: 0.01ms !important;
animation-iteration-count: 1 !important;
```

Under that rule each animation jumps to its 100% frame. For these four concepts, the 100% frame is the faded-out state. Pasted into the app without the file's own block, all four concepts render an empty screen for reduced-motion users.

V4 inverts the rule. Every keyframe in the V4 file ends at the resting "ready" frame. The reduced-motion collapse and the ready frame are the same image by construction.

### 2.3 The app's reduced-motion rule does not collapse `animation-delay`

This trap caught V4 during testing, so it is recorded here.

The first V4 build set each beat with `animation-delay: calc(var(--loop) * .80)`. Under the app's global rule the duration collapsed but the delay did not. A reduced-motion user saw an unfinished launch for about five seconds: no light, unlit stations, no mark. The measured state is in section 4.

V4 adds one line to its own reduced-motion block: `animation-delay: 0ms !important`. Any future launch animation that uses delays needs the same line.

### 2.4 Palette drift

The comparison file invents a palette: `--night:#020812`, `--blue:#168cff`, `--orange:#ff9417`, `--gold:#ffc642`.

The app has its own tokens in `src/index.css`. Light: `--primary: 225 75% 48%`, `--background: 210 40% 98%`. Dark: `--primary: 235 70% 60%`, `--background: 222 25% 8%`. Concept B is a light screen and A, C, and D are dark screens, so the four concepts also need four separate theme solutions. None of them has one.

V4 copies the app tokens verbatim and uses `hsl(var(--token))`. It works in both themes with no second design and no duplicated value.

### 2.5 Smaller findings

- B uses `preserveAspectRatio="none"` on the trail SVG, so `stroke-width: 5` stretches with the viewport. The stroke is uneven between the vertical and horizontal parts.
- D animates four `backdrop-filter: blur(12px)` layers plus a blurred sweeping beam. That is the most expensive work in any of the four files, on the surface where an Android WebView has the least headroom.
- D's `glassIn` keyframes drop the per-card `rotateY` and `rotateZ` offsets at the end state, so all four cards flatten to the same transform. The entrance variation is lost on arrival.
- The four concepts have no failure state, no slow state, and no offline state. `resolveLaunchStatus` in `src/domain/guidance/guidanceEngine.ts` returns an override for each of them.
- Nothing in the four concepts connects to the existing tips engine or to the `LaunchStage` type, so none of them can be driven by real readiness.
- A and B place large text at fixed percentages of the viewport. On a 360x404 stage (a 360x640 phone after the tip card and the safe areas) the layout has very little headroom.

## 3. What V4 Is

One artifact: `BIGDROPS cold launch v4.html`. HTML, CSS, and vanilla JavaScript. No framework, no build step, no network request, inline SVG only.

The idea: one line. A single light travels the line, stops at each real startup stage, and ends on the brand mark. The mark is the last station, so the chain finishes on the brand and not on a card.

Design decisions:

1. The stations are the real chain, not invented business work. `SESSION` and `ACCOUNT` are the splash gate (`getSession`, `loadProfile`). `WORKSPACE` is the tenant gate. The status sentences are the verbatim strings from `STAGE_STATUS`: "Preparing your workspace...", "Loading your account. This takes only a moment.", "Getting documents and projects in order...", and "Ready.".
2. The rail spans both full-screen loaders. Today a cold start shows the splash, then a second loader inside `TenantGate`. V4 is one visual that advances, so the user sees one line instead of two unrelated screens.
3. The lockup keeps the production content order and values: the visual, then the wordmark, then the status sentence, then the quick tip card at 280 px and 18 px radius. The brand is visible from the first frame, as it is in `SplashOverlay`. V4 does not hide the brand behind a reveal.
4. Tokens are the app tokens. `--fire` is the one colour the rail burns with. One property retints the whole launch, and connectivity states use it: the offline and slow states turn the rail amber and replace the sentence with the honest override from `resolveLaunchStatus`.
5. Every keyframe ends at the ready frame. Nothing is infinite, so any element can be fast-forwarded with one call and the reduced-motion collapse lands on the same image.
6. The launch plays once and holds. A launch screen does not loop.
7. Mobile and desktop are separate compositions. Mobile is a compact 26 px-gutter rail with 7 px station names. Desktop runs the rail to 1120 px and holds the lockup to a 768 px measure, with a measuring ruler under the line. The rail earns the width; the sentences do not.
8. The rail is one horizontal axis. A separating fold cuts a centred circular composition in half. It does not cut a line.

## 4. Verification

Environment: Chromium through the Freebuff preview panel. No device, no emulator, no Safari.

Checked:

- No network request other than the document itself. No external reference, no `@font-face` file, no framework.
- Zero console errors and zero console warnings.
- Every animated element enumerated with `document.getAnimations()`: 32 animations, one clock, no infinite animation.
- Frames frozen by setting `currentTime` on all 32 animations. The light arrives at station 1 at 10% of the clock, station 2 at 34%, station 3 at 58%, and the mark at 80%. Each station ignites exactly when the light reaches it, and stays lit. The status sentence changes once per station.
- The status sentence never drops below 0.35 opacity outside its first frame. The first V4 build had a 380 ms gap with no sentence between the third beat and "Ready.". The handoffs now overlap.
- Layout at 320x568, 360x640, 390x844, 740x360, and 1440x900. No clipping, no overflow, no overlap. `scrollWidth` and `scrollHeight` equal the viewport at every size.
- Station pitch is even at every size (for example 77, 78, 77 px at 320 wide, and 336 px at 1440 wide). Station names stay inside the viewport at both extremes.
- Token resolution read back in both themes. Dark: background `rgb(15,18,26)`, primary `rgb(82,93,224)`, card `rgb(19,23,32)`. These match the `.dark` block in `src/index.css`.
- The offline signal: `--fire` becomes `28 92% 42%`, the rail turns amber, the stage sentence is replaced by "Connect to the internet to continue.", and the live region text follows.
- The integration fast-forward: `window.bigDrops.ready()` raises no error and produces the complete ready frame.
- Reduced motion, by injecting the app's global rule plus the file's own block: the rail is fully drawn, all three stations are lit, the mark is drawn and filled, the beam rests at the mark, the wordmark, the halo, and the tip are visible, and the only visible sentence is "Ready.". Without the `animation-delay` line the same test produced the unfinished state described in section 2.3. That failure is the reason the line exists.
- The timing model of all 32 animations read back with `effect.getTiming()`. Every delay and every duration matches the design: the rail draws over 0-10%, the light runs over 10-80%, station ignites are at 10%, 34%, and 58%, the mark draws at 80-88% and fills at 84-94%, and the four status sentences run on the full clock. Every animation has `iterations` of 1, except one halo breath set of 6. Nothing is infinite, so `finish()` is safe on all 32.

Limits of this evidence:

- The preview webview never composited a frame. Chromium therefore never gave these animations a start time, and the page's own animation clock stayed at zero (`document.timeline.currentTime` advanced, the animations did not). Real-time playback was not observed. Every beat was inspected by setting `currentTime` on all 32 animations and reading the result, which gives the exact state the browser will render at that time, but it is not the same as watching the launch run.
- Screenshot capture was unavailable for the same reason. All layout evidence is geometric: `getBoundingClientRect`, computed style, `scrollWidth`, and `scrollHeight`. No pixel review was done, so nothing about colour balance, contrast, or visual polish is confirmed by measurement.
- No foldable device and no Safari were available, so `100dvh`, `env(safe-area-inset-*)`, and separating-fold behaviour are unverified on hardware. The fold argument in section 3 point 8 is a layout argument, not a measurement.
- The `Broken Planet` wordmark font is not available to a standalone file. The wordmark renders in the `Manrope`/system fallback. The layout does not depend on the webfont.
- `bun run typecheck`, `bun run lint`, and `bun run test` are not applicable. The file imports nothing from `src/`.

## 5. Integration Notes

The seam already exists and the audit supports it (`§14`). `SplashOverlay` receives `visible`, `tip`, and `quickTip`. V4 replaces the visual layer and reads the same signals:

- `visible` maps to mount and unmount.
- `tip` maps to the status sentence. V4 already uses the `STAGE_STATUS` strings.
- `quickTip` maps to the tip card. Keep `useLoadingTip` as the content authority.
- One logic change is required for a clean handoff, and it is not part of V4: `minimumVisible = 600` in `src/App.tsx` line 526. With the rail on screen, the 600 ms minimum delays readiness for no benefit.
- The native Android splash is still white (`android/app/src/main/res/values/styles.xml`). V4 does not fix the white flash for dark-mode users, and it cannot: the flash happens before any application code runs. A `values-night` splash resource is the fix, and it is a separate change.
- One new token is proposed. The design system has no semantic colour for "waiting" or "offline", so V4 declares `--signal`. Promote it to `--tone-signal` in `src/index.css` and `src/lib/themeTokens.ts` if the launch rail is adopted.

## 6. Open Questions

1. Does the rail replace the tenant gate loader too, or only the splash? V4 assumes both. If only the splash, the rail needs three stations instead of four and the `WORKSPACE` stage becomes a second, separate screen.
2. Is the amber `--signal` colour acceptable, or should the unavailable state stay neutral?
3. Should the ready frame hold until the app removes the overlay, or should the overlay fade out on the `Ready.` beat?

## 7. Files Changed

- Added: `docs/templates/html-temps/onboarding-candidates/BIGDROPS cold launch v4.html`
- Added: `docs/reports/general/2026-10-08-cold-launch-concepts-v4-review.md` (this report)

No file under `src/` changed. No pre-existing change was staged, discarded, or reverted.
