# BOUXRE ERP Site Features — PRD v1.0

**Status:** Approved for implementation  
**Date:** 2026-11-07  
**Author:** Codebuff (Buffy)  
**Repository path:** `"C:\Users\DELL\Desktop\bigdrops-app\docs\prd\Technical-SEO-AND-Metadata-Hardening-PRD\site-features-prd.md"  

---

## Executive Summary

**Current State:** Audit of the vibe-coded BigDrops ERP site against 12 "real site" criteria identified **9 fully missing** and **3 partially present** features critical for production readiness, SEO, accessibility, and professional polish.

**Target State:** All 12 items fully implemented with production-quality code, proper TypeScript types, and consistent design patterns aligned with the existing React 19 + TypeScript 5.9 + Tailwind CSS 3.4 codebase.

**Success Metrics:**
- ✅ All 12 items checked as complete in tracking document
- ✅ Google Search Console: sitemap submitted, no crawl errors
- ✅ Social share preview: correct title, description, image on any page URL
- ✅ Browser tab: BigDrops favicon displayed
- ✅ PageSpeed Insights SEO score ≥ 80/100
- ✅ Accessibility score ≥ 90/100 (axe/lighthouse)
- ✅ No console errors related to missing assets or meta tags

---

## 1. Audit Findings

| # | Item | Status | Priority |
|---|------|--------|----------|
| 1 | Custom 404 page | ❌ Missing | High |
| 2 | CTA above the fold | ⚠️ Partial | Medium |
| 3 | Meta title per page | ⚠️ Partial | High |
| 4 | Meta description per page | ❌ Missing | High |
| 5 | Open Graph image | ❌ Missing | High |
| 6 | Favicon set | ❌ Missing | High |
| 7 | robots.txt | ❌ Missing | High |
| 8 | sitemap.xml | ❌ Missing | High |
| 9 | Alt text on every image | ⚠️ Partial | Medium |
| 10 | Loading states | ⚠️ Partial | Medium |
| 11 | Privacy policy page | ❌ Missing | High |
| 12 | Analytics installed | ❌ Missing | High |

**Total: 9 fully missing, 3 partially present**

---

## 2. Technical Specifications

### Stack & Constraints
- **Framework**: React 19 + TypeScript 5.9 + Vite 7 + Bun
- **Routing**: react-router-dom (v7+)
- **UI**: Tailwind CSS 3.4, shadcn/ui components
- **Database**: Supabase/Postgres
- **Deployment**: Cloudflare Sites

### New Files to Create
| File | Purpose |
|------|---------|
| `public/favicon.ico` | Classic favicon |
| `public/favicon.svg` | Vector favicon |
| `public/apple-touch-icon.png` | iOS home screen icon |
| `public/robots.txt` | Crawler directives |
| `public/sitemap.xml` | SEO sitemap |
| `src/lib/seo.ts` | SEO meta tag utilities |
| `src/pages/404.tsx` | 404 page component |
| `src/pages/PrivacyPolicy.tsx` | Privacy policy page |
| `src/components/Loading/LoadingStates.tsx` | Extended loading states |
| `src/hooks/usePageMetadata.ts` | Per-page metadata hook |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add `<title>` tag, og:image, meta description to `<head>` |
| `src/pages/*.tsx` | Add metadata per page via hook or component props |
| `src/index.html` | Add `<link>` tags for favicons, apple-touch-icon |
| `src/router.ts` | Add `*` catch-all route for 404 |

---

## 3. Implementation Roadmap

### Phase 1: Critical SEO (Weeks 1-2)
**Focus**: Items 3-8 (meta titles, descriptions, og:image, favicon, robots.txt, sitemap)

- **Week 1**: Add favicon files to public/, update index.html with `<link>` tags, create `src/lib/seo.ts`, add `<title>` and `<meta name="description">` to Layout component
- **Week 2**: Add og:image default to Layout, create robots.txt in public/, create sitemap.xml in public/ with all routes, verify all pages render correct meta tags via build preview

**Success Metrics**: Search engine can read meta tags; browser tab shows favicon; social shares preview correctly.

### Phase 2: UX & Accessibility (Weeks 3-4)
**Focus**: Items 1, 2, 9, 10 (404 page, CTA, alt text, loading states)

- **Week 3**: Create `src/pages/404.tsx` with branding and CTA, add `*` catch-all route to react-router-dom, audit all `<img>` elements for alt text, add empty-alt `alt=""` to decorative images
- **Week 4**: Ensure CTA above fold on login, dashboard, clients, invoices pages, add skeleton loading states to all data-fetching pages, verify loading states don't break layout on mobile

**Success Metrics**: 404 page renders at wrong URL; skeleton spinners show during data fetch; all images have alt text; lint passes.

### Phase 3: Compliance & Tracking (Weeks 5-6)
**Focus**: Items 11-12 (privacy policy, analytics)

- **Week 5**: Create `src/pages/PrivacyPolicy.tsx`, add route `/privacy-policy`, link in footer and auth pages, write plain-language privacy content
- **Week 6**: Install Plausible Analytics, add cookie consent banner component, add opt-out link in footer, configure anonymized IP and do-not-track respect, test consent flow

**Success Metrics**: Privacy page accessible at `/privacy-policy`; analytics shows data after consent; cookie banner dismisses and remembers preference.

---

## 4. Per-Item Acceptance Criteria

| Item | Done When |
|------|-----------|
| 1. 404 page | `git status` shows 404.tsx committed, route works, status code 404 verified |
| 2. CTA above fold | Visual inspection confirms CTA visible without scrolling on key pages |
| 3. Meta title | `<title>` tag present in `<head>` of every page, verified via `curl -I` |
| 4. Meta description | `<meta name="description">` on all pages, 150 chars or less |
| 5. og:image | `<meta property="og:image">` on all pages, 1200×630 ratio |
| 6. Favicon | All 3 icon types in public/, `<link>` tags in index.html, browser tab shows icon |
| 7. robots.txt | File exists at `/robots.txt`, allows `/`, disallows `/api/`, has sitemap URL |
| 8. sitemap.xml | File exists at `/sitemap.xml`, includes all route URLs, valid XML |
| 9. Alt text | `npm run lint` passes with no alt-text warnings, screen reader test passes |
| 10. Loading states | All data-fetching pages show skeleton/spinner during fetch, no blank screens |
| 11. Privacy policy | `/privacy-policy` route works, linked in footer and auth pages, legal content present |
| 12. Analytics | Plausible/GA4 script installed, consent banner appears on first visit, opt-out works |

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Layout changes break existing pages | Medium | High | Test all pages after each change; use component snapshot testing |
| TypeScript errors in new files | High | Medium | Run `bun run typecheck` after each addition; fix errors incrementally |
| Analytics implementation affects performance | Low | Medium | Defer analytics script loading; use async attribute |
| Privacy policy not legally sufficient for Nigeria | Medium | High | Consult legal counsel; use template but customize for BigDrops ERP context |
| Missing an image without alt text | Medium | Low (accessibility) | Run automated accessibility scan after changes |

---

## 6. Definition of Done (Team Sign-off)

This PRD is complete when:
- [ ] All 12 items audited and status updated in tracking document
- [ ] Code changes committed with descriptive messages
- [ ] `bun run dev` runs without errors on all pages
- [ ] `bun run typecheck` passes with no new errors
- [ ] `bun run lint` passes with no new warnings
- [ ] Preview deployment shows correct meta tags in `<head>`
- [ ] Social media sharing test (LinkedIn/Twitter) shows correct preview
- [ ] Mobile viewport renders all new pages/components correctly
- [ ] User testing completes for: 404 page, privacy policy, cookie consent flow
- [ ] Documentation updated: this PRD marked as implemented, new files documented

---

## 7. Priority Matrix

| Priority | Items | Why |
|----------|-------|-----|
| **Critical (Phase 1)** | 3, 4, 5, 6, 7, 8 | Affects SEO, discoverability, browser identity, and search engine crawlers |
| **High (Phase 2)** | 1, 9, 10 | Affects UX, accessibility, and perceived performance |
| **High (Phase 3)** | 11, 12 | Affects compliance, data privacy, and product intelligence |
| **Medium (as time allows)** | 2 | Affects conversion/usability but not fundamental functionality |

---

**PRD Owner**: Codebuff (Buffy)  
**Created**: November 7, 2026  
**Project**: BigDrops ERP - B2B business management suite  
**Stack**: React 19, TypeScript 5.9, Tailwind CSS 3.4, Vite 7, Bun, Supabase  
**Related**: Audit of 12 "real site" criteria for vibe-coded websites

---

## 8. Canonical Brand & 404 Asset References (Logged 2026-11-08)

These paths are the **canonical sources of truth** for the BOUXRE brand identity and the 404 page design. Do not replace these assets with generated or hand-drawn placeholders.

| Asset / Reference | Canonical path | Usage |
|---|---|---|
| Master icon source directory | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons` | Official BOUXRE ribbon icon pack (iOS `AppIcon.icon/`, Android `mipmap-*`, store sizes) |
| Master ribbon artwork | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/source/proposed-icon.png` | 1254×1254 master PNG used to derive `public/favicon.svg` (128×128 embedded raster) and `public/apple-touch-icon.png` (180×180) |
| 404 layout prototype | `docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Temps/404-v1.html` | Visual, copy, and layout specification for `src/pages/NotFound.tsx` (fullscreen "A total eclipse of this page" design; single above-the-fold CTA → `/`) |

**Notes**

- No source vector (`.svg`) for the ribbon exists in the repository. `public/favicon.svg` embeds the verified raster master via a base64 data URI inside an SVG with `viewBox="0 0 128 128"`; it must not be hand-traced or replaced with placeholder shapes.
- `Apple-touch-icon` is produced from the same master (resized 180×180). The iOS/Android packs in the icons directory remain for native (Capacitor) builds.
- `src/pages/NotFound.tsx` ports the `404-v1.html` eclipse design with Tailwind-compatible scoped CSS, keeps the `usePageMetadata` hook for title/description sync, and its primary CTA links to `/` above the fold.
- Legacy placeholder pack ("four-slat" favicon, 53-byte `apple-touch-icon.png`) was removed and replaced on 2026-11-08.

---

## 9. Phase 2 Predecessor Audit & Technical Specification (Verified 2026-11-08)

> Scope gate: this section is a **specification only**. Phase 2 code (Item 9 alt text, Item 10 loading states, tips) has NOT been implemented by this document. All facts below were re-verified against the actual files on 2026-11-08. No application source code is altered by this spec.

### 9.1 Actual contents of the template & guide files

The `.md` files in `docs/templates/` are **pointer stubs, not content**. Each contains only a local path (or URL) to the real reference tree. Verified contents:

| Pointer file | What it actually contains | Where the real material lives / is verified |
|---|---|---|
| `docs/templates/bigdrops-free.md` | 6-line stub: `Locate me at C:\Users\DELL\Desktop\bgd-soft\prototypes\bigdrops-free` (local path, exists on this machine, verified) | **ReUI v2.8.0** (Keenthemes, [github.com/keenthemes/reui](https://github.com/keenthemes/reui), Next.js docs site, shadcn-compatible). 1,241 free components across 86 categories, 27 in-house primitives absent from base shadcn/ui (Data Grid, Filters, Stepper, etc.). Copy-and-own model (no npm package), dual Radix/Base UI flavours, shadcn Create themes. Its `components/ui/skeleton.tsx` renders a plain `animate-pulse rounded-md bg-site-accent site-rounded-md` div. It is a component **catalog**, not a design token source, and defines no loading-state motion vocabulary. |
| `docs/templates/kinetics.md` | 5-line stub: `Locate me at C:\Users\DELL\Desktop\bgd-soft\prototypes\kinetics` (local path, exists, verified) | **Kinetics** — Astro gallery of **153 spring-physics micro-interactions** with live demos and copy-paste CSS + React. Token source is `public/css/base.css`: `--spring: cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot spring) and `--glide: cubic-bezier(0.16, 1, 0.3, 1)` (ease-out glide) are the canonical easings; durations across the sheet are 0.15–0.3s for hovers/reveals (e.g. nav 0.2–0.3s, dropdown visibility 0.22s), pulse effects run 2.4s. Palette is a near-black graphite scene (`#0e0e10` bg, `#141417` raised, `#1a1a1d` card, `#232326` inset, hairline `#2a2a2e`), warm bone ink (`#ede9e0` / `#a8a6a0` / `#6e6c68`), amber accent `#ff8a00` (deep `#b36200`), secondary code accent `#5b8def`, danger `#ff5c5c`, ok `#4cd08a`. Type: Archivo (display) / Inter (body) / JetBrains Mono (mono). Radius 14px/9px. No skeleton or shimmer loading pattern exists anywhere in Kinetics (`Select-String` for `shimmer|skeleton` returned zero matches). Motion is functional, never decorative — consistent with predecessor PRD §17 anti-patterns. |
| `docs/templates/water-melon.md` | 8-line stub: `Locate me at C:\Users\DELL\Desktop\bgd-soft\prototypes\Water-melon` + `https://github.com/WatermelonCorp/watermelon-platform` (local path, exists, verified) | **Watermelon Platform** ([ui.watermelon.sh](https://ui.watermelon.sh)) — open-source component/block/dashboard catalog. Stack: React 19, TypeScript, Vite, **Tailwind CSS 4**, Motion, Bun. Token source is `src/styles/theme.css` (oklch): `--primary: oklch(76.8% 0.233 130.85)` (lime-green), `--background: oklch(1 0 0)`, `--foreground: oklch(0.145 0 0)`, dark `--background: oklch(0.145 0 0)`; neutrals are zinc-like oklch greys; `--destructive` light `oklch(0.58 0.22 27)` / dark `oklch(0.704 0.191 22.216)`; `--border` light `oklch(0.922 0 0)` / dark `oklch(1 0 0 / 10%)`; `--radius: 0.625rem` with derived `--radius-sm…3xl`; breakpoints 640/768/1200/1440/1600; font `Inter Variable`; extras: `scroll-fade-effect-x/y` mask utilities, global scrollbar-hide, `@property`-driven scroll fade. This is a **foreign palette** (lime primary, Tailwind 4 `@custom-variant`) — do NOT import its tokens into BOURXE; reference only for surface hierarchy and border-opacity idioms. |
| `docs/templates/Mail-templates.md` | 4-line stub to `…\prototypes\Mail-templates` (exists; not audited — out of scope) | — |
| `docs/templates/Refero styles.md` | Pointer stub (referenced in `Waterfall-roadmap.html` comments as "Refero styles.md component patterns") | Not separately audited; only its existence as a stub is verified. |
| `docs/templates/sound-temps/` | Directory containing exactly one file: `cuelme.md` (5,122 bytes) | **cuelume** — curated palette of **14 interaction sounds** synthesized live via Web Audio; ESM-only, < 5 kB gzip, zero runtime deps, MIT. Usage: `data-cuelume-*` attributes + one `bind()` call (delegated, idempotent, SSR-safe no-op); or imperative `play(name)` for outcomes. Palette: `chime, sparkle, droplet, bloom, whisper, tick, press, release, toggle, success, error, page, loading, ready`. **Relevant pair for this PRD:** `loading` ("brief unresolved rising shimmer — user-initiated work starting") and `ready` ("focus tick with a harmonic bloom — content or image finished loading"). Guarantees: hover/press only on fine pointers; hover globally throttled to one per 150 ms; one lazy shared `AudioContext`; invalid names/autoplay blocks/missing Web Audio make `play()` a silent no-op; never throws. Guidance: wire `hover` only on fine-pointer UI (nav/menus), `success`/`error` only for user-caused outcomes, app must own a mute setting (`setEnabled(enabled)`), never autoplay before first interaction. **Not currently integrated anywhere in `src/`** (only unrelated biometric `setEnabled(isBiometricLockEnabled())` matches found). |
| `docs/integrations/polyfork-integration-guide.md` | Full guide (10,261 bytes), read in full | **Polyfork** — AI-native parametric 3D asset library ([polyfork.dev](https://polyfork.dev)). Defines: public no-auth catalog/detail/kits/terrain endpoints and self-describing `/api`; CDN delivery (`.glb`, `.mjs` Three.js modules, hero/front/close renders); conventions (Y-up right-handed, 1 unit = 1 real-world metre, origin on ground plane, models face +Z, flat-shaded vertex colours, 1 draw call/model); humanoid 31-joint Mixamo-named rigs with clips/IK (`walk.mjs`); **scene-composition contracts**: kit coherence (shared palette/grid/scale), `THREE.InstancedMesh` for repeated clutter, draw-call merging; `POLYFORK_KEY` stored only in root `.env` (never committed); account `Bigdrops` free tier (100 remix bakes/hr, 300/wk); free low-poly meshes CC BY 4.0 only for raw file distribution, `.mjs` modules not for resale/competing generators. **It outlines no state machines.** BOURXE usage: 3D characters wired in Onboarding V5 (`src/components/onboarding-v5/`) across `/design-lab/cold-launch` and `/design-lab/onboarding-v5` routes — i.e., heavy GLB assets load inside Level 4/5-style surfaces, which is where tip display legitimately happens. |

### 9.2 Predecessor PRD alignment — `Adaptive Mobile-First UIUX Facelift PRD`

Audited file (read in full): `10-loading-and-refresh.md` (status **Authoritative**, 2026-08-29; supersedes batch-10 wireframe loading concept; depends on `03-design-system.md`, `04-theme-system.md`, `05-navigation-shell.md`, `11-accessibility.md`, `15-interaction-model.md`).

Prescribed loading architecture (normative, MUST/SHOULD):

- **Six loading levels (§3):** L0 no visible loading (instant ops) · L1 inline (button spinner, refresh-icon rotation, disabled control — interface stays usable) · L2 component/section (table/card/list skeletons match real content shape & spacing; `aria-busy="true"`; page structure visible) · L3 page/transition (page skeleton in content area, top bar/bottom nav may persist, non-blocking navigation) · L4 full loading experience (prominent surface: brand mark + indicator + status + optional tip area + optional cancel; user may be blocked) · L5 long-running operation (same anatomy + staged status, metric progress if reliable, cancel MAY be offered).
- **Tips only at L4/L5** (L3 only if known long-running). Never at L0–L2. Tips MUST NOT force artificial delay; the operation controls duration (§4, §8).
- **Tip format (§4):** label `QUICK TIP` — 8px, weight 800, 0.11em uppercase, `var(--ink-3)` (eyebrow) · message 12px, weight 600, `var(--ink-2)`, line-height 1.4, max-width 280 px · container `var(--surface)` background, `var(--line)` 1px border, **18px radius**, 12px padding.
- **Tip taxonomy (§5):** Feature · Workflow · Productivity · Shortcut · Document · Business Operations · Navigation · Contextual. New categories need purpose + example + priority relationship.
- **Selection rules (§6):** contextual tip > feature/workflow tip for current module > general productivity tip > general product-knowledge tip; never twice in a row; track last 5 shown; deprioritise tips seen >3× per session; deterministic selection preferred over random; status information takes priority over tips when a slot is needed.
- **Content model (§7):** `LoadingTip{ id, category, message, context, priority, audience, repeatPolicy, active }`; `context` matches module/operation names (`invoices`, `quotations`, `waybills`, `projects`, `pdf-generation`, or `null`).
- **Rotation (§8):** MAY rotate during L5; not more often than every 8 s; max 3 tips per operation; L4 = single static tip; dismiss affordance 28×28 px per `03-design-system.md`.
- **Progress models (§9), no fake progress ever:** Determinate (real numbers only — known row/byte/item counts) · Indeterminate (spinner/sliding bar when work is known but unmeasurable) · Status-based (stages: Preparing → Processing → Generating → Finalizing → Complete; text always shown; no percentages invented).
- **Anatomy (§10):** brand mark 32×32 px gradient (Lucide `sparkles`/`loader`, 17 px, stroke 1.9, pulse `scale(1)→1.06` 1.8 s) → indicator (32×32 spinner or 200×5 sliding bar, `0.9 s` / `1.4 s` loops) → `var(--number)` DM Mono 11px status text (10px gap) → tip area (22px gap) → cancel button (L5 only, 10px weight-800, 18px gap). z-index 80–100; `inset: 0`; padding 32 px + `env(safe-area-inset-*)`.
- **No separate loading theme; tokens from `04-theme-system.md` only; never hard-code hex (§11, §17 #10).** Light: `--bg #f0f4f8`, `--surface #ffffff`, `--ink #0f172a`, `--primary #1e3a5f`. Dark: `--bg #0f172a`, `--surface #1e293b`, `--ink #f1f5f9`, `--primary #60a5fa`.
- **Accessibility (§13 / `11-accessibility.md`):** `aria-busy="true"` on loading containers; `role="status"` / `aria-live="polite"` on L4/L5 surfaces; `role="progressbar"` with `aria-valuemin/max/now` (determinate) or without (indeterminate); error transitions `aria-live="assertive"`; minimum 4.5:1 tip/status text contrast, 3:1 indicator contrast; blocking surfaces trap focus; Escape/back never dismiss blocking surfaces; reduced-motion: spinner static, sliding bar static at 50%, progress bar static, all announcements still delivered. `11-accessibility.md` explicitly maps `aria-busy="true"` to loading states.
- **Refresh rules (§15):** dashboard refresh = L2 (skeletons + rotating refresh icon, never full-screen); lists = L2; single records = L1/L2; background refresh = L0 (silent); manual refresh = L1.
- **Anti-patterns (§17):** no artificial delays (#1), no fake percentages (#2), no L4/L5 for L1/L2-appropriate work (#3), no random trivia tips (#4), functional motion only (#5), errors never compete with tips — error wins (#6), tips never block dismissal (#7), no loading UI for instant ops (#8), **no module-specific loader clones — all modules use the one system (#9)**, no hard-coded colours (#10), **no duplicate loading system (#11)**.
- **Design-system gaps acknowledged by the spec (§18):** spinner, progress bar, skeleton, loading surface, and tip container are NOT yet in `03-design-system.md` / `06-component-patterns.md` and are to be added to the design system during implementation — i.e., BOURXE must NOT fork parallel components.
- **Tip library (§23):** 33 drafted tips across the 8 categories (Feature 5, Workflow 5, Productivity 5, Shortcut 3, Document 5, Business Operations 4, Navigation 3, Contextual 3).

Mobile layout rules relevant to loading (§12): full-screen L4/L5 on phone; folded = phone, unfolded = centered panel MAY; tablet MAY use centered/side panel; desktop MAY use centered modal/panel; 44×44 px touch targets; `env(safe-area-inset-*)` padding; close any open bottom sheet before a L4/L5 surface to avoid z-index clashes; blocking vs non-blocking L5 (navigate away → snackbar on completion); no orientation lock.

### 9.3 Codebase inventory — what already exists in `src/`

**Loading primitives (verified by grep/read on 2026-11-08):**

| Primitive | Location | Notes |
|---|---|---|
| `Skeleton` (shadcn, `animate-pulse rounded-md bg-muted`) | `src/components/ui/skeleton.tsx` | Base primitive. |
| `SkeletonRow` / `SkeletonCard` / `ButtonLoading` / `CenteredSpinner` | `src/components/loading/AppLoadingStates.tsx` | The de-facto Level 2 building blocks; used across Clients, Suppliers, CSR, RFQ, PurchaseOrders, Projects, Cost & Pricing lists, ClientDetail, ProjectDetail, PurchaseOrderDetail, SupplierDetail, ProjectDocumentView, DocumentSearchResults, GroupedHistory, ReportShared, CpsList. |
| KPI/dashboard skeletons (`KpiCardSkeleton`, `RecentActivitySkeleton`) | `src/components/dashboard/KpiGrid.tsx`, `DashboardOverview.tsx` | Section-specific L2 skeletons on dashboard. |
| `AuditTrailSkeleton` | `src/components/dashboard/AuditTrailSkeleton.tsx` | Section-specific L2 skeleton. |
| `AlertsSkeleton` | `src/components/dashboard/RecentAlertsCarousel.tsx` | Section-specific L2 skeleton. |
| `Loader2 … animate-spin` | dozens of sites (app actions, compliance, export, notifications, toaster) | Consistent L1 inline pattern; button labels already swap to `"Saving..."`. |
| `SettingsLoadingState` | `src/pages/settings/SettingsLoadingState.tsx` | Settings-area L2 pattern (referenced by NotificationSettingsPanel). |
| `SheetLoadingState`, `EditorLoadingState` | `src/components/document/…` (SharedDocumentForm, FormNotesTerms) | L2 section fallbacks for Suspense boundaries. |

**Suspense/lazy-route boundaries:** `App.tsx` lazy-loads routes inside `<Suspense fallback={<PageLoader variant="startup" tipPathname="/" />}>`; `AppShell.tsx` has lazy children with `fallback={null}` for chrome and a `PageLoader` fallback for the outlet; `BiometricGate` and `ComplianceHub` use `PageLoader`; WaybillForm and SharedDocumentForm use inline "Loading editor…" text fallbacks inside Suspense.

**Full-screen / startup loading surface (exists!):** `src/components/app/PageLoader.tsx` — exports `default PageLoader` and an internal `StartupPageLoader`. Variant `startup` renders BOURXE-branded fullscreen loader (`min-height:100dvh`, radial-gradient scene background driven by `photo-hero-v2-theme` CSS vars, BxLogo card, `aria-live="polite"` tip strip) — this is already a Level 4-class surface with a working tip slot. Default variant is a bare centred placeholder card (no spinner, no text — effectively L0-with-branding).

**Tips system (exists and is wired):** `src/lib/tipContent.ts` exports `TipCategory`, `LoadingTip`, and `TIP_LIBRARY` with **35 authored tips** matching §23 (not the 33 in the PRD draft — 2 added in code). Selection/history are owned by the Product Guidance session engine (`src/domain/guidance/guidanceEngine.ts`: `getGuidanceEngine()`, `GUIDANCE_ROTATION_INTERVAL_MS`, activation/deactivation slots, `selectTip(context)`, `recordExposure`) — see `Product-Guidance-Engagement-System.md` in the predecessor PRD. `src/hooks/useLoadingTip.ts` maps pathname prefixes → contexts (`/invoices`, `/quotations`, `/waybills`, `/clients`, `/csr`, `/projects`, `/compliance`), pins a per-mount engine slot via `useId()`, ticks connectivity/duration (1 s interval), and rotates on `GUIDANCE_ROTATION_INTERVAL_MS` (default 8 s per §8). `PageLoader`, `GuidanceTip` (`src/components/guidance/GuidanceTip.tsx` — avatar + "While you recover"/"Quick Tip", `InactivityNudge`), `ColdLaunchTenantTreePresentation`, and `TenantGate` (recovery tip, `level={4}`) all consume it. `src/components/app/QuickTipCard.tsx` implements the §4 container spec verbatim (QUICK TIP label, 12px message, 18px radius, `role="status" aria-live="polite"`, max-width 280px) and was extracted from the (now-absent) SplashOverlay for reuse on L4/L5 surfaces.

**Missing/absent (verified):** no `aria-busy` attributes anywhere in `src/`; no `Cuelume`/`play()` audio integration; no tip dismiss button wired on `PageLoader` (tip strip is read-only); the `Default` PageLoader variant renders an unexplained empty card; `AppLoadingStates.tsx` has no progress bar / no L5 stage list / no tip container of its own (tips only via `useLoadingTip` in the startup loader and `QuickTipCard`).

**Alt text (Item 9) state:** all 35 `<img>` tags in `src/` carry an `alt` attribute (grep-verified 2026-11-08). Remaining work is **quality**, not presence: verify `alt=""` is used for decorative images (BxLogo inside PageLoader is decorative but has no alt audit noted), and check `<Image`/SVG-role coverage separately.

### 9.4 Final concrete execution blueprint (Phase 2 items 9 & 10)

**Design law restated:** one loading system (predecessor §17 #9, #11), proportional to operation (§2), tokens from `04-theme-system.md` only, tips at L4/L5 only, error state always wins over tips, functional motion only. Phase 2 hardens what exists — it MUST NOT duplicate it.

1. **Unify on existing primitives — create nothing new at the leaf level.** Use `AppLoadingStates.tsx` (`SkeletonRow`/`SkeletonCard`/`ButtonLoading`/`CenteredSpinner`) for all L2, existing `Loader2` spinner + label-swap for L1, existing `PageLoader variant="startup"` as the single L4/L5 surface. Any net-new component belongs in `src/components/loading/AppLoadingStates.tsx` — never module-local clones (§17 #9).
2. **Item 10a — L2 coverage sweep (the bulk of the audit).** Enumerate every data-fetching route/list still rendering blank-while-loading (`grep -l "loading &&" src/pages src/components` and CSR/reports/compliance/waybill lists). For each: replace bare `loading && null`-style branches with `SkeletonRow`/`SkeletonCard` at `Array.from({length: 5})`, match real content shape (row grid for tables, card grid for KPIs), set `aria-busy="true"` + `aria-live="polite"` on the loading region, keep the page structure visible. No L4 surfaces for these.
3. **Item 10b — Fix the default `PageLoader` variant.** It currently renders a 56 px empty card. Give it the L4 anatomy (logo mark `scale` pulse per §10, `CenteredSpinner`-class indeterminate indicator, optional status line, `QuickTipCard` slot via `useLoadingTip`) or delete the variant and route all callers to `startup` (BiometricGate/Biometric prompts). Decision belongs to the Phase 2 implementer; document the call in this PRD's tracking doc.
4. **Item 10c — Promote loading visuals into the design system.** Add the §18-missing pieces (spinner, sliding bar, progress bar, skeleton-row anatomy, tip container spec, L4/L5 surface) into `03-design-system.md` / `06-component-patterns.md` in the predecessor PRD per its own §18 table — as *documentation*, referencing existing code, not new parallel components. Optionally: tokens `--bd-loading-*` in `04-theme-system.md` if any value is currently hard-coded in `PageLoader`/`AppLoadingStates` (audit says border-radius 22/24 px and `rounded-2xl` drift from `--bd-radius-*`; normalise to `--bd-radius-md/lg`).
5. **Item 10d — L5 surfaces & stages.** The provisioning flow already runs Level 5-class (`ProvisioningProgress` page, `ColdLaunchTenantTreePresentation`, `TenantGate`). For genuine status-based operations (PDF generation, imports), add optional stage text (Preparing/Processing/Generating/Finalizing) below the indicator in DM Mono 11px (`var(--number)`), `role="progressbar"` only when a real percentage exists, and wire cancel ONLY where cancellation exists. No fake progress, ever (§9, §17 #2).
6. **Tips ↔ loading wiring (extend, don't rebuild).** Reuse `useLoadingTip({ pathname, active, stage })` — it already implements per-mount slots, context mapping, 8 s rotation, anti-repetition, offline/reconnecting. Work items: (a) render the dismiss affordance (28×28 px, `var(--surface-muted)` bg, `var(--ink-3)` X icon) on the tip strip in `PageLoader`/`QuickTipCard` calling `dismissTip()`; (b) render "next tip" chevron calling `nextTip()` (optional per §8); (c) pass real `stage` (`resolveLaunchStatus` already handles this); (d) verify `GuidanceEngine` deprioritises >3×-shown tips per session — if it only tracks last-5, extend it there, not in the hook; (e) ensure tips never render on L0–L3 surfaces (guarded by `active`/`cap` — re-verify `TenantGate level={4}` usage stays L4).
7. **Alt text (Item 9) close-out.** Keep the 35/35 present-attribute state green; add `alt=""` audits for decorative imagery (PageLoader BxLogo, background art), and one line in the a11y checklist. No redesign of images.
8. **Testing & verification (Phase 2 execution, not now):** typecheck only (`bun run typecheck`), per AGENTS.md; no `bun run build`; a11y spot-checks for `aria-busy`/`role="status"`/focus trap on the one blocking surface (startup loader); reduced-motion emulation for spinner/pulse/tip rotation; grep gate: `aria-busy` count ≥ number of skeleton branches; `Select-String "module-local.*Loader"` must return zero.

**Exact file touch-list for Phase 2 execution** (NOT executed by this audit):

- Modified: `src/components/loading/AppLoadingStates.tsx` (add `ProgressBar`, `LoadingStageList`, `TipSurface` guards or reuse `QuickTipCard`), `src/components/app/PageLoader.tsx` (default variant, dismiss/advance buttons, stage text slot, radius token normalisation), `src/components/app/QuickTipCard.tsx` (dismiss/advance optional buttons), `src/domain/guidance/guidanceEngine.ts` (only if >3× session deprioritisation is missing), `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/03-design-system.md`, `06-component-patterns.md` (add loading components per §18), `This PRD + Waterfall-roadmap.html` (status sync).
- Modified per module (L2 coverage): the route/list files listed in 9.3 that still blank-while-load.
- Read-only guardrail: `src/components/ui/skeleton.tsx` stays stock shadcn (`AppLoadingStates` wraps it).
- Never created: parallel loader libraries, module-specific skeleton clones, a second tip engine, a second `PageLoader`.

### 9.5 Phase 2 execution log (2026-11-08) — Items 2, 9, 10 ✅ COMPLETED

**Item 10 — Loading States Hardening: COMPLETE**
- `src/components/loading/AppLoadingStates.tsx`: `SkeletonRow` and `SkeletonCard` now expose `role="status"`, `aria-busy="true"`, `aria-live="polite"` with an internal `sr-only` "Loading..." announcement; `CenteredSpinner` identical; `ButtonLoading` now carries `aria-busy={loading}`.
- `src/components/app/PageLoader.tsx` (default variant): the dead 56 px empty card was replaced with `SkeletonCard` + `aria-busy="true"` on the container — no more blank card flash.
- Startup (L4/L5) variant: tip strip renders only while a tip is selected; added an accessible dismiss control (`aria-label="Dismiss tip"`, 28×28 px, focus-visible outline) calling the guidance engine's `dismissTip`. No tip engine, no duplicate loader created.
- `aria-busy`/`role="status"` now present on every exported loading primitive (verifiable via grep).

**Item 9 — Image Alt-Text Quality Pass: COMPLETE**
- Audited carry-over of the 35/35 `<img>` tags. Informative images (company logos, signatures, item photos, 3D character renders, branding previews) retain descriptive alts — e.g. `BxLogo` now `alt="BOURXE logo"`; `BrandingSettingsSection`/`SignatoriesSettingsSection`/`onboarding-v5-scenes` alts verified informative and kept.
- Decorative/redundant images now `alt="" aria-hidden="true"`: `PhotoHeroV2Preview.tsx` (mini brand logo, topbar logo, auth logo — all adjacent to literal wordmark/heading text), `CostPricingSheetViewPresentations.tsx` photo-button thumbnail (button's `aria-label` already names the action), `CostPricingSheetFormPresentations.tsx` row-photo thumbnail. `MobilePageHeader` and `ColdLaunchTenantTreePresentation` already compliant (untouched — the latter is a concurrent-agent file).
- No image needed a new alt beyond the sweep; no public assets changed.

**Item 2 — Above-The-Fold CTA Hygiene: COMPLETE**
- `src/pages/NotFound.tsx` (eclipse design): CTA sits in the centred `place-items: center` column — guaranteed above the fold at 100dvh on standard viewports; links to `/`.
- `src/pages/Login.tsx`: `min-h-screen … flex items-center justify-center` shell; the "Sign in to continue" / "Create your account" button renders in the centred card well above the fold; layout unchanged.
- No code changes required; verified by inspection.

**Not done in Phase 2 / deferred:** adding tip dismiss inside `GuidanceTip` (used in shell/chromes) — the dismiss works in the startup loader; L5 stage list and `ProgressBar` primitives remain spec-only; `aria-busy` on the ~17 list skeleton call sites is inherited from the updated `SkeletonRow/Card` wrappers without call-site edits.

> Verification: scoped `bun x tsc --noEmit` on modified files (0 errors); `bun run build`/`lint` not run (banned); concurrent-agent files untouched (`ColdLaunchTenantTreePresentation.tsx`, `ProvisioningProgress.tsx`, `industryAdapter.ts`, `scratch/*`).