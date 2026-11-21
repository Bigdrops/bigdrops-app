# BOUXRE Cold-Launch & Startup Flow Audit Report

This report was written by Antigravity on 2026-11-20 via Antigravity Runner.

Skills used: modern-web-guidance, tailwind-css-patterns, safe-area-handling
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Objective

Audit the BOUXRE cold-launch flow, splash screens, loaders, and intermediate gates before the dashboard across Web and Android platforms. Evaluate visual assets, theming, background sources, logo rendering issues, Quick Tip behavior, and responsive layout across four viewport classes.

---

## 2. Scope

* **In scope:**
  * Inspection of `android/app/src/main/res/values/styles.xml` and Android launch theme.
  * Inspection of `index.html` inline theme initialization script.
  * Inspection of `src/App.tsx` cold-launch state machine, routing gates, and suspense boundaries.
  * Inspection of `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx`.
  * Inspection of `src/components/app/PageLoader.tsx` (`StartupPageLoader`).
  * Inspection of `src/components/layout/bx-logo.tsx`.
  * Inspection of `src/lib/tipContent.ts` and `src/domain/guidance/guidanceEngine.ts`.
  * Execution of geometry calculations via `src/components/cold-launch/preview-tree-geometry.ts` in Bun runtime.
  * Live curl testing against the local Vite development server on port 5000.
* **Out of scope (Protected):**
  * Modifying application source code.
  * Staging, committing, resetting, or stashing Git changes.
  * Executing `bun run build` (strictly prohibited by host memory governance).
  * Mutating remote Supabase database state.

---

## 3. Skill & Index Verification

* **Repository Skill Index:** Confirmed that `docs/SKILLINDEX.md` does **not** exist (`Test-Path docs/SKILLINDEX.md` returned `False`). The authoritative skill catalog is `docs/PROJECTSKILLINDEX.md` (`Test-Path docs/PROJECTSKILLINDEX.md` returned `True`, 52,227 bytes).
* **Skills Loaded & Applied:**
  1. **`modern-web-guidance` (`.agents/skills/modern-web-guidance/SKILL.md`):**
     * *Finding 1 (Critical Rendering Path)*: `index.html` lines 4–8 import external font stylesheets from Google Fonts and cdnfonts synchronously in `<head>` without media attributes or async loading, creating render-blocking network requests before the inline theme script or root module can paint pixels.
     * *Finding 2 (Largest Contentful Paint & Resource Fetching)*: In both `ColdLaunchTenantTreePresentation.tsx` (line 147) and `PageLoader.tsx` (line 221), the central brand logo is an `<img>` tag rendered only after client-side JavaScript bundle execution and React mounting. No `<link rel="preload" as="image">` exists in `index.html`, and neither `<img>` has `fetchpriority="high"`. This violates the guidance rule ("DON'T implement complex JavaScript loaders for the hero section: Client-side rendering of the LCP element introduces substantial request chains").
  2. **`tailwind-css-patterns` (`.agents/skills/tailwind-css-patterns/SKILL.md`):**
     * *Finding*: In `ColdLaunchTenantTreePresentation.tsx` (lines 146–149), responsive sizing relies solely on `size-16 sm:size-20` (64px to 80px) and `text-xl sm:text-2xl`. Breakpoint scaling terminates at `sm` (640px) and lacks `md:` and `lg:` density adjustments, leaving desktop viewports with a disproportionately small 80px card.
  3. **`safe-area-handling` (`.agents/skills/safe-area-handling/SKILL.md`):**
     * *Finding*: `PageLoader.tsx` (line 75) correctly applies full 4-axis safe area padding: `calc(24px + env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-left,0px)) calc(24px + env(safe-area-inset-bottom,0px)) max(18px,env(safe-area-inset-right,0px))`. In contrast, `ColdLaunchTenantTreePresentation.tsx` (line 360) applies only bottom safe area padding (`calc(10px + env(safe-area-inset-bottom,0px))`) on `.clp-lower`, omitting lateral padding (`env(safe-area-inset-left)` / `env(safe-area-inset-right)`). In landscape orientation on notched or cutout devices, side graph nodes sit directly beneath hardware cutouts.
* **Excluded Skills:** Claude's `frontend-design` was strictly excluded per governance.

---

## 4. Screenshot Mapping & Evidence Reconciliation

The user provided two screenshots capturing distinct cold-launch visual states:

| Screenshot | Environment & URL | Visual Elements Observed | Corresponding Implementation |
| :--- | :--- | :--- | :--- |
| **Image 1** | **Vercel Production** (`bigdrops-app.vercel.app`) | Peach/cream gradient background, official BX logo rendered inside rounded card, uppercase "BOUXRE", pulsing dot with "LOADING". **No Quick Tip card.** | `ColdLaunchTenantTreePresentation.tsx` lines 133–160 (Web Production cold-launch branch: `!isNative && !isPreviewMode`). |
| **Image 2** | **LAN Dev Server** (`192.168.100.8:5000/des...`) | Blue-grey blurred background, empty frosted-glass squircle container, uppercase "BOUXRE", and bottom "QUICK TIP" card with `(X)` close button. | `StartupPageLoader` in `src/components/app/PageLoader.tsx` lines 31–244 (AppShell initial route Suspense fallback). |

---

## 5. Architectural Findings

### 5.1 Hardcoded Colors & Theme-Awareness

* **[Observed] Native Android Window Splash (`android/app/src/main/res/values/styles.xml` lines 16–20):**
  * `windowSplashScreenBackground`: `@android:color/white` (**NOT theme-aware**). Flashes white on app launch even when system dark mode is active.
  * `android:windowBackground`: `@android:color/white` (**NOT theme-aware**).
  * `android:background`: `@drawable/splash` (**NOT theme-aware** static bitmap).
* **[Observed] Web Boot Script (`index.html` lines 55–63):**
  * `bgColors` table contains hardcoded hex values: `slate-navy` (`#0b1524` / `#f8fafc`), `amber-terracotta` (`#161311` / `#faf8f5`), `ocean-teal` (`#0d1716` / `#f4fbf9`), `rose-gold` (`#181114` / `#fdf8f9`), `forest-green` (`#0d1712` / `#f4fbf6`), fallback `#ffffff`.
  * **Theme-aware**: Selects background color dynamically using `localStorage` preference and `prefers-color-scheme`.
* **[Observed] Web Production Cold-Launch (`ColdLaunchTenantTreePresentation.tsx` lines 135–156):**
  * `ring-white/20` (`rgba(255, 255, 255, 0.20)`): Hardcoded white border ring (**NOT theme-aware**).
  * Fallback colors `#0d1624` (dark) and `#fbf8f5` (light) inside CSS `var(--scene-intro, var(--bg, #0d1624))` and `var(--bg, #fbf8f5)` (**Theme-aware** via active theme variables).
  * Fallbacks `#f1f5f9` (`--ink`) and `#94a3b8` (`--ink-2`) (**Theme-aware** when custom properties resolve).
* **[Observed] Startup PageLoader Fallback (`PageLoader.tsx` lines 38–40, 58–111):**
  * **NOT Theme-Family Aware**: Line 39 hardcodes `getPhotoHeroVars('slate-navy', appearance)`. This forces the Slate Navy palette regardless of the user's saved theme preset (e.g., Amber Terracotta in Image 1). Only brightness mode (`light` vs `dark`) adapts.
  * Dismiss button: `rgba(128,128,128,.18)` and hover `rgba(128,128,128,.28)` (**NOT theme-aware** neutral alpha).
  * Light theme recipe (`photo-hero-v2-theme.ts` lines 273–330): Hardcoded shadow alphas `rgba(15,23,42,.16)`, `rgba(15,23,42,.10)`, `rgba(15,23,42,.08)`, and tint base `#ffffff` / `#000000`.
  * Dark theme recipe (`photo-hero-v2-theme.ts` lines 85–100): Hardcoded colors `#0f172a`, `#93c5fd`, `rgba(15,23,42,.50)`, `rgba(148,163,184,.22)`, `rgba(15,23,42,.28)`, `linear-gradient(165deg,#16283f 0%,#1e3a5f 44%,#3b5c82 78%,#7d97b4 100%)`, `#60a5fa`, `#fbbf24`, `#0b1524`, `#13233a`.
* **[Observed] Android Native / Preview Tenant Tree (`ColdLaunchTenantTreePresentation.tsx` lines 214–243):**
  * Hardcoded dark overlay values: `rgba(255,255,255,.34)`, `rgba(6,10,18,.42)`, `rgba(3,6,12,.88)`.
  * Hardcoded light overlay values: `rgba(15,23,42,.12)`, `rgba(15,23,42,.26)`, `rgba(15,23,42,.28)`, `rgba(15,23,42,.14)`.
  * Subtle grid lines: `rgba(128,128,128,.10)` and `rgba(128,128,128,.08)`.

---

### 5.2 Source of the Blurred Blue-Grey Background

* **[Observed] Component Owner:** `StartupPageLoader` in `src/components/app/PageLoader.tsx` (lines 38–40, 76–80, 101–111).
* **[Observed] Code Mechanism:**
  1. Line 39 calls `getPhotoHeroVars('slate-navy', appearance)`. In light mode, `lightVars('slate-navy')` generates:
     * `--bg`: `hsl(210 40% 98%)` (`#f8fafc`).
     * `--field-a`: `hsl(217 91% 60%)` (`#60a5fa` soft blue).
     * `--field-b`: `hsl(215 16% 47%)` (`#94a3b8` slate grey).
     * `--field-c`: `hsl(213 94% 68%)` (`#93c5fd` light blue).
     * `--scene-intro`: 165° linear gradient from pale slate through light blue and slate tints.
  2. The outer container applies compound radial gradients over `--scene-intro`:
     ```css
     background:
       radial-gradient(ellipse at 14% 16%, color-mix(in srgb, var(--field-c) 34%, transparent), transparent 31%),
       radial-gradient(ellipse at 84% 18%, color-mix(in srgb, var(--field-a) 32%, transparent), transparent 30%),
       radial-gradient(ellipse at 50% 70%, color-mix(in srgb, var(--field-b) 20%, transparent), transparent 34%),
       var(--scene-intro);
     ```
  3. Behind the logo container, `.bd-startup-loader::after` renders an explicit blurred halo:
     ```css
     background: radial-gradient(closest-side, color-mix(in srgb, var(--loader-accent) 18%, var(--loader-bg) 36%) 0%, color-mix(in srgb, var(--loader-bg) 34%, transparent) 50%, transparent 76%);
     filter: blur(2px);
     ```
* **[Inferred]:** In Image 2, the LAN dev session loaded `StartupPageLoader` with default `'slate-navy'` tokens in light mode, creating the blurred blue-grey metallic background.

---

### 5.3 Empty Logo Cause in Dev Build

* **[Observed] Import Path Discrepancy:**
  * `ColdLaunchTenantTreePresentation.tsx` line 15:
    `import bigdropsLogo from '../../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'` (Runtime resource).
  * `src/components/layout/bx-logo.tsx` line 2:
    `import bxLogoSrc from '../../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png'` (Documentation resource).
* **[Observed] Dev Server Resolution Check:**
  * Raw URL with spaces:
    `curl -I "http://localhost:5000/docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png"`
    Result: **`curl: (3) URL rejected: Malformed input to a URL function`**. Network stacks and HTTP clients reject raw unencoded spaces.
  * Percent-encoded URL:
    `curl -I "http://localhost:5000/docs/prd/Adaptive%20Mobile-First%20UIUX%20Facelift%20PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png"`
    Result: **`HTTP/1.1 200 OK`** (`Content-Type: image/png`, `Content-Length: 62155`).
  * In the compiled dev module (`http://localhost:5000/src/components/layout/bx-logo.tsx`), Vite outputs:
    `import bxLogoSrc from "/docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png?import";`
    The import specifier retains raw unencoded spaces in client JavaScript.
* **[Inferred] Container & Object-Fit Behavior:**
  * In `PageLoader.tsx` lines 121–139, `.bd-startup-logo-card` defines a frosted background (`background: color-mix(in srgb,var(--loader-glass) 78%,var(--surface-raised) 22%)`).
  * `BxLogo` renders `<img src={bxLogoSrc} alt="BOUXRE logo" className="shrink-0 h-full w-full rounded-[inherit]" />`.
  * When asset loading fails or is delayed due to space-encoding issues in browser module fetch, `.bd-startup-logo-card`'s `overflow: hidden` and `object-fit: cover` suppress standard broken image icons in mobile Chromium, leaving only the empty frosted-glass card visible (Image 2).

---

### 5.4 Origin of the Quick Tip & Gating

* **[Observed] Content Source:** `src/lib/tipContent.ts` lines 428–439:
  ```ts
  id: 'tip.contextual.quotation-expiry'
  category: 'Contextual Tips'
  message: 'Set an expiry date on quotations to automatically flag overdue responses.'
  context: 'quotations'
  priority: 1
  ```
* **[Observed] Engine Selection:** `src/domain/guidance/guidanceEngine.ts` (`GuidanceEngine.selectTip()`). Selects context matches first, then priority 1.
* **[Observed] Consumer Components:**
  1. `StartupPageLoader` (`PageLoader.tsx` lines 225–240): Renders inside `.bd-startup-tip` with dismiss button (`bd-startup-tip-dismiss`).
  2. `ColdLaunchTips` (`ColdLaunchTenantTreePresentation.tsx` lines 33–47): Renders inside `.clp-tip-body` with no dismiss button.
* **[Observed] Gating Status:**
  * **Web Production Cold Launch (`ColdLaunchTenantTreePresentation.tsx`):** **GATED OUT / EXCLUDED.** Lines 133–160 bypass `clp-lower`. Web production cold launch never shows Quick Tips (Image 1).
  * **Android Native Cold Launch:** **NOT GATED.** Renders immediately via `ColdLaunchTips`.
  * **Startup PageLoader (`PageLoader.tsx`):** **NOT GATED.** `useLoadingTip({ pathname, active: true })` connects synchronously on mount. Displays immediately on frame 1 (Image 2).

---

### 5.5 Accessibility Audit of Quick Tip Dismiss Button

* **[Observed] Button Geometry:** `PageLoader.tsx` lines 164–178 defines `.bd-startup-tip-dismiss` with `width: 28px; height: 28px;`.
* **[Observed] WCAG 2.5.8 (Target Size (Minimum), Level AA):**
  * Requirement: Target size of at least $24 \times 24\text{ CSS pixels}$ (or sufficient spacing).
  * Status: **PASSES Level AA.** At $28 \times 28\text{px}$, the button exceeds the 24px minimum.
* **[Observed] WCAG 2.5.5 (Target Size (Enhanced), Level AAA) & Usability:**
  * Requirement: Target size of at least $44 \times 44\text{ CSS pixels}$.
  * Status: Fails Level AAA. On mobile touch screens, a 28px target in the card corner is small for coarse pointer use and represents an advisory design recommendation, not a standard Level AA failure.

---

## 6. Viewport Coverage & Responsive Layout Audit

### 6.1 Viewport Coverage Matrix

| Viewport Class | Typical Dimensions | Web Build Status | Android Build Status | Audit Method |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile / Fold Closed** | $320\text{px} - 480\text{px}$ width | Rendered (Image 1 & Image 2) | Computed | Rendered via mobile screenshots; tree layout computed via geometry script. |
| **Fold Open** | $600\text{px} - 840\text{px}$ width | Source-only | Computed | Media queries and geometry calculations audited. |
| **Tablets** | $768\text{px} - 1024\text{px}$ width | Source-only | Computed | Portrait and landscape layout constraints evaluated. |
| **Desktop** | $1024\text{px} - 1920\text{px}+$ width | Source-only | Computed | CSS clamp rules and graph centering evaluated. |

*Note: Physical foldable and tablet devices were not connected for live hardware mirroring; coverage in those tiers is derived from computed geometry and source inspection.*

---

### 6.2 Viewport Layout Findings

#### A. Mobile / Fold Closed (< 560px width)
* **[Observed] Web Minimal Launch:** Scaled to `size-16` (64px) with `text-xl` (20px). Centers cleanly.
* **[Observed] Startup PageLoader:** Padding adjusts to `calc(18px + env(safe-area-inset-top, 0px))`. Card clamps to minimum `58px`.
* **[Computed] Android Native Tenant Tree Overflow:**
  * Script: `buildGraph(w, h)` from `src/components/cold-launch/preview-tree-geometry.ts`.
  * Inputs: Viewport $320 \times 600\text{px}$; wrap box $w = 320\text{px}, h = 358\text{px}$ (derived from total height $600\text{px} - 44\text{px} \text{ [top]} - 198\text{px} \text{ [comm]}$).
  * Result: Real nodes span $Y \in [20, 378\text{px}]$, **exceeding available height by 20px**.
  * Input with preview controls: Wrap box $w = 320\text{px}, h = 248\text{px}$ ($600 - 154 - 198$). Nodes extend to $Y = 378\text{px}$, **exceeding wrap height by 130px**.
  * Result: Lower nodes (Operations/Finance lobes) collide with and are partially obscured by the `.clp-lower` Quick Tip container.

#### B. Fold Open (~600px – 840px width, 1:1 or 4:3 aspect ratio)
* **[Observed] Web Minimal Launch:** Sizing expands to `sm:size-20` (80px) and `sm:text-2xl` (24px).
* **[Observed] Startup PageLoader:** Compound media query `@media (max-width:560px),(max-height:740px)` causes compact mobile mode to trigger on squarish fold screens when height $\le 740\text{px}$.
* **[Computed] Android Native Tenant Tree:** At $600 \times 700\text{px}$ (wrap $h = 480\text{px}$), real nodes span $X \in [90, 563\text{px}]$ and $Y \in [24, 452\text{px}]$, fitting with 28px clearance.

#### C. Tablets (768px – 1024px width, Portrait & Landscape)
* **[Observed] Startup PageLoader:** In landscape mode ($1024 \times 768\text{px}$), browser chrome reduces viewport height below 740px, triggering mobile compact mode.
* **[Computed] Android Native Tenant Tree:** At $800 \times 1000\text{px}$, real nodes span $X \in [138, 716\text{px}]$ and $Y \in [24, 562\text{px}]$, clearing `.clp-lower` with 138px margin.

#### D. Desktop (1024px – 1920px+ width)
* **[Observed] Web Minimal Launch:** Capped at 80px card in the center of the display. Zero contextual loading information or tenant status is presented on large monitors.
* **[Observed] Startup PageLoader:** Logo card clamps to `82px`, tip card caps at `560px`. Content remains legible but sparse.
* **[Computed] Android Native Tenant Tree:** At $1280 \times 800\text{px}$ (wrap $h = 560\text{px}$), nodes span $X \in [253, 1071\text{px}]$, leaving $>250\text{px}$ lateral whitespace on each side.

---

## 7. Git State & Working Tree Evidence

* **Pre-Audit Git Status (`git status --porcelain`):**
  * Modified files (pre-existing): `.github/workflows/build-android-debug.yml`, `api/bolu-chat.ts`, `api/bolu-provider-config.ts`, `scripts/release/changelog.mjs`, `scripts/release/releaseGate.mjs`, `scripts/release/reportProposals.mjs`, `server.ts`, `src/components/ai-assistant/...`, `src/lib/ai-assistant/...`, `src/pages/settings/...`, `src/tests/...`.
  * Untracked files (pre-existing): `docs/reports/bolu-model-routing/`, `docs/reports/whats-new-changelog/...`, `src/components/ai-assistant/...`.
* **Post-Audit Git Status:**
  * Only one file was added to the repository: `docs/reports/cold-launch/2026-11-20-bouxre-cold-launch-audit.md` (this report).
  * No source code files in `src/`, `android/`, `api/`, or `scripts/` were modified, staged, committed, or stashed.
  * Temporary command output from `modern-web-guidance` was generated in OS temp (`AppData/Local/Temp/`) and did not touch the repository worktree.

---

## 8. Verification Summary

* Verification:
  * Audit inspection: completed
  * Skill index check: `docs/PROJECTSKILLINDEX.md` verified; `docs/SKILLINDEX.md` confirmed absent
  * Live curl testing (port 5000): raw spaces rejected (code 3); percent-encoded resolved (`200 OK`)
  * Geometry script computations: verified via Bun runtime across 6 viewport dimensions
  * bun run build: skipped due to hardware memory governance policy (4 GB RAM host)
  * git diff check: no source changes introduced

---

## 9. Status

**Status: Completed**

Outstanding recommendations for future implementation tasks (outside audit scope):
1. Migrate `bx-logo.tsx` import path from `docs/prd/...` to `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` or public runtime assets.
2. Update `android/app/src/main/res/values/styles.xml` to include `values-night` splash theming.
3. Preload the startup logo in `index.html` with `fetchpriority="high"` to optimize Largest Contentful Paint (LCP).
4. Remove the hardcoded `'slate-navy'` family in `StartupPageLoader` to inherit the active user theme family.
