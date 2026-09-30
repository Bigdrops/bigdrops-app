# FAB Standard vs Current Implementation Audit Report

This report was written by OpenCode on 2026-09-29 via Local Runner.

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive Finding

**Classification: PARTIALLY STALE.**

The FAB standard (`docs/standard/fab-standard.md`, last updated 2026-09-06) is current in its container spec, icon taxonomy, and role rules. It is stale in its motion model, one file reference, placement values, z-index rule, and its silence on the Settings FAB system.

**The known Download/Save motion change is missing from the standard.** The standard documents only `hover:scale-105` and `active:scale-95`. It contains no ambient animation of any kind. On 2026-09-07 — one day after the standard's last update — commit `41ac5f93` propagated a continuous ambient float (`csr-fab-float`: translateY 0 → -3px, 4s ease-in-out infinite) to every Save and Download FAB. The standard predates this change and does not represent it.

**Terminology correction:** the commit and its report call this motion a "bounce." The repository evidence shows the document FABs received a continuous ambient **float**, not a bounce. A true bounce keyframe (`suFabBounce`: translateY 0 → -7px → 0 → -3px → 0, 2.6s infinite) exists only in the Settings module. The standard must not conflate the two.

**The change was intentional.** Commit `41ac5f93` (2026-09-07, "feat(compliance): add record capture foundation and fab bounce animation") and report `docs/reports/general/fab-bounce-propagation-2026-09-07.md` explicitly document the propagation of the CSR Save FAB motion to all Save and Download FABs. The motion originated in commit `314cefed` (2026-09-03, "Refine MobileFab with subtle float motion and halo glow").

**One genuine implementation non-conformance exists:** the CSR desktop download-blank FAB uses the Lucide `Download` icon, violating the standard's own rule 5 (custom SVG required).

---

## 2. Authoritative Standard

- **Path:** `docs/standard/fab-standard.md` (126 lines, Version 1.0, Last Updated 2026-09-06).
- **Purpose:** define the canonical FAB shape, size, icons, and placement rules; prevent icon divergence across the application.
- **Major normative areas:**
  - Section 2 — canonical container spec (50×50, rounded-[18px], tokens, hover/active, icon size).
  - Section 3 — role/icon taxonomy (Create=Plus, Save=SaveAll, Download=custom SVG).
  - Section 4 — placement rules (mobile/desktop offsets, z-index, one-primary-FAB rule).
  - Section 5 — file inventory.
  - Section 6 — seven rules (no new icons, no new shapes, MobileFab for create, SaveAll for save, custom SVG for download, one primary FAB per view, reduced motion).
  - Section 7 — procedure for adding a new FAB.
- **Origin:** written 2026-09-06 from `docs/reports/ui-ux/fab-consistency-audit.md` (Codex, 2026-09-06), which inventoried 9 FAB variants.
- **Other documents referencing it:** none found in `docs/standard/`. The standard is standalone; no other standard depends on it.

---

## 3. Current FAB Architecture

### 3.1 Shared Components

| Component | File | Role |
|---|---|---|
| `MobileFab` | `src/components/layout/MobileFab.tsx` | Generic FAB. Default icon `Plus`; accepts any `Icon`. Used for create on all list pages AND for save on CSR mobile. |
| `FloatingDownloadButton` | `src/components/document-view/shared/FloatingDownloadButton.tsx` | Shared download FAB with custom SVG `DownloadIcon`. |
| `FloatingDocumentButton` | `src/components/document-view/shared/FloatingDocumentButton.tsx` | Accessible button primitive (aria-label + title) used by FloatingDownloadButton. |
| `FormFooter` | `src/components/document/FormFooter.tsx` | Sticky form footer (Cancel/Draft/Save) plus the floating Save FAB. Used by `SharedDocumentForm` (invoice/quotation) and `WaybillForm`. |
| `fabFloat.css` | `src/components/layout/fabFloat.css` | Shared ambient float + halo keyframes with reduced-motion handling. |

### 3.2 Specialized / Inline FABs

| Location | Role | Notes |
|---|---|---|
| `src/pages/Dashboard.tsx:131-146` | Create (inline) | Gradient background, panel toggle. |
| `src/components/csr/CsrFormScreen.tsx:991-997` | Save (mobile) | Uses `MobileFab` with `SaveAll`/`Loader2` icon. |
| `src/components/csr/CsrFormScreen.tsx:1001-1011` | Download-blank (desktop) | Inline, Lucide `Download` icon. |
| `src/components/csr/CsrFormScreen.tsx:1012-1020` | Save (desktop) | Inline, `SaveAll`/`Loader2`. |
| `src/components/settings/settings.css:221-240` (`.su-fab`) | Settings module FAB | 48px circle, gradient, `suFabBounce` true bounce. Used by `AdminSettingsSection.tsx`, `WorkspaceSwitchSection.tsx`. |
| `src/components/settings/settings.css:672-686` (`.su-fab-float`) | Settings form save FAB | 50×50 rounded-[18px], `suFabBounce` bounce. Used by `CreateCompanySheet.tsx:637-645` with Lucide `Save` icon. |

### 3.3 How FAB Actions Are Composed

- **Create:** `MobileFab` (shared) on 13 list/workspace pages; inline gradient button on Dashboard.
- **Save (forms):** `FormFooter` floating button (invoice, quotation, waybill); `MobileFab` with `SaveAll` (CSR mobile); inline button (CSR desktop); `.su-fab-float` with `Save` (Settings create-company sheet).
- **Download:** `FloatingDownloadButton` (shared) on ViewInvoice (via `InvoiceWorkspace.tsx:110`), ViewQuotation, ViewCSR, ViewWaybill, ViewRfq, ViewReceipt; inline Lucide `Download` button (CSR desktop download-blank).

### 3.4 Positioning

| FAB | Position | z-index |
|---|---|---|
| MobileFab | `fixed bottom-[94px] right-4 z-50 md:hidden` | 50 |
| Dashboard create (mobile) | `bottom: calc(82px + env(safe-area-inset-bottom))`, `right: 4` | 50 |
| Dashboard create (desktop) | `lg:top-24 lg:right-8` | 50 |
| FormFooter save | `bottom-[calc(var(--bd-app-bottom-nav-offset,72px)+safe-area+16px)] right-4 sm:right-8` | **60** |
| CSR desktop save/download | `fixed bottom-6 right-6` | 30 |
| FloatingDownloadButton | Host-controlled (rendered as `floating` prop or inline); no intrinsic position | — |
| Settings `.su-fab` | `absolute bottom: calc(20px + var(--su-safe-bottom)) right: 20px` | 30 |
| Settings `.su-fab-float` | `sticky float: right bottom: calc(20px + var(--su-safe-bottom))` | 30 |

### 3.5 Animation Behavior

- **Ambient float (`csr-fab-float`):** translateY 0 → -3px, 4s ease-in-out infinite, continuous from mount. Applied via wrapper span to MobileFab, FormFooter save, FloatingDownloadButton, CSR desktop save/download-blank. Wrapper placement is required: a running transform on the button would override its hover/active transforms (`fabFloat.css:9-12`).
- **Halo glow:** MobileFab only. Radial-gradient div behind the button, `csrFabHaloPulse` (opacity 0.35→0.55, scale 1→1.08, 4s). Not propagated to other FABs (deliberate, per the propagation report).
- **True bounce (`suFabBounce`):** translateY 0 → -7px → 0 → -3px → 0, 2.6s infinite, cubic-bezier(0.28, 0.84, 0.42, 1). Settings module only (`.su-fab`, `.su-fab-float`).
- **Hover/active:** `hover:scale-105` / `active:scale-95` on MobileFab, FormFooter, CSR desktop. Dashboard uses `active:scale-90`. Download FAB uses `translateY(-2px)` hover / `translateY(0)` active (150ms ease) instead of scale.
- **Reduced motion:** `fabFloat.css:32-35` disables float and halo under `prefers-reduced-motion: reduce` (halo rests at opacity 0.4). `settings.css:342-344` blanket-disables animation/transitions under reduced motion.

### 3.6 State Transitions

- **Loading (save):** icon swaps `SaveAll` → `Loader2 animate-spin` (FormFooter, CSR). Button `disabled={saving}`.
- **Loading (download):** host passes `disabled={downloading}` (all view pages). No spinner inside the FAB itself.
- **Disabled:** MobileFab `disabled:opacity-50`; FormFooter `disabled:opacity-100` with muted border/bg/text; Download FAB `.disabled` class forces `opacity: 0.5`, `cursor: not-allowed`, `transform: none !important`.
- **Success/error:** not represented in the FAB; handled by toast/feedback layer (`src/lib/feedback.ts`).

### 3.7 Accessibility

- All FABs are `<button type="button">` with `aria-label` (MobileFab, FormFooter via title, FloatingDownloadButton, CSR desktop via title, Dashboard).
- Download FAB: `aria-label="Download PDF"` + `title` + visually-hidden label span (`srOnly`).
- MobileFab: `focus-visible:ring-2 ring-ring ring-offset-2`.
- Reduced motion handled (Section 3.5).

---

## 4. Download FAB — Current Behavior

**Component:** `src/components/document-view/shared/FloatingDownloadButton.tsx` (shared). CSR desktop download-blank is a separate inline implementation.

| Behavior | Evidence |
|---|---|
| Resting state | 50×50, rounded-[18px], `hsl(var(--primary))` background, custom SVG `DownloadIcon` (22px), multi-layer box-shadow (`FloatingDownloadButton.module.css:1-15`). Wrapped in `csr-fab-float` span (ambient float). |
| Ambient animation | `csr-fab-float`: translateY 0 → -3px, 4s ease-in-out infinite, from mount. Continuous, not a bounce. |
| Press/tap | `active: translateY(0)` with 150ms ease shadow transition (`module.css:24-29`). Hover: `translateY(-2px)` + deeper shadow (`module.css:17-22`). |
| Bounce timing | No bounce. The float runs continuously and independently of the click. It does not start on press, does not react to the download action, and does not change on repeated taps. |
| Repeated tap | No special handling; float continues uninterrupted. |
| Loading | Host-controlled `disabled={downloading}` (ViewInvoice, ViewQuotation, ViewCSR, ViewWaybill, ViewRfq, ViewReceipt). No internal spinner. |
| Disabled | `.disabled` class: `opacity: 0.5`, `cursor: not-allowed`, `transform: none !important` (suppresses float), muted shadow (`module.css:37-43`). |
| Success/failure | Not represented in the FAB. |
| Reduced motion | Float disabled via `fabFloat.css:32-35`. Hover/active transitions remain (150ms). |
| Shared vs specific | Shared component across 6 document-view pages. CSR desktop download-blank is a distinct inline FAB (Lucide `Download`, no module.css, `csr-fab-float` wrapper). |
| Diagnostics | `console.group` diagnostic logging on every click (lines 31-44) — temporary debug code, not documented in the standard. |

---

## 5. Save FAB — Current Behavior

**Components:** `FormFooter.tsx:57-66` (invoice/quotation/waybill forms), `CsrFormScreen.tsx:991-997` (mobile, via MobileFab) and `1012-1020` (desktop inline), `CreateCompanySheet.tsx:637-645` (Settings, `.su-fab-float`).

| Behavior | Evidence |
|---|---|
| Resting state | 50×50, rounded-[18px], `bg-bd-button-primary-bg`, `SaveAll` icon (h-5 w-5), `shadow-lg`. `csr-fab-float` wrapper (ambient float). |
| Ambient animation | Same `csr-fab-float` primitive as Download — translateY 0 → -3px, 4s ease-in-out infinite. Identical keyframes, shared CSS file. |
| Press/tap | `active:scale-95` (FormFooter, CSR). No scale on hover for FormFooter/CSR save (hover:scale-105 only on CSR desktop). |
| Bounce timing | No bounce. Same continuous float as Download. |
| Loading | Icon swaps to `Loader2 animate-spin`; button disabled. |
| Disabled | FormFooter: `disabled:opacity-100` + muted tokens. CSR: `disabled:opacity-50`. |
| Success/failure | Not represented in the FAB. |
| Reduced motion | Float disabled via `fabFloat.css:32-35`. |
| Settings variant | `.su-fab-float` uses the TRUE bounce (`suFabBounce`, 2.6s, -7px/-3px) and Lucide `Save` icon — a different motion system and a different icon from the document Save FABs. |

**Relationship between Save and Download motion:** both use the same `csr-fab-float` primitive from the same `fabFloat.css` file. They are not duplicated implementations. The Settings `.su-fab-float` is a related but distinct animation (true bounce, different timing/easing).

---

## 6. Standard vs Implementation Matrix

| # | Standard requirement | Classification | Current implementation | Source evidence | Explanation |
|---|---|---|---|---|---|
| 1 | Container 50×50, rounded-[18px] | **CURRENT** | All document FABs match | `MobileFab.tsx:35`, `FormFooter.tsx:62`, `Dashboard.tsx:137`, `CsrFormScreen.tsx:1005,1016` | Exact match. Exception: Settings `.su-fab` is 48px circle (see #14). |
| 2 | Background `bg-bd-button-primary-bg` | **CURRENT** | MobileFab, FormFooter, CSR save use it; Dashboard uses gradient (documented); Download uses `hsl(var(--primary))` (documented as alternative) | `MobileFab.tsx:35`, `FormFooter.tsx:62`, `FloatingDownloadButton.module.css:5` | Covered by standard's own alternatives. |
| 3 | Hover `hover:scale-105`, Active `active:scale-95` | **PARTIALLY CURRENT** | MobileFab/FormFooter/CSR match. Dashboard uses `active:scale-90`. Download uses translateY hover/active instead of scale. | `Dashboard.tsx:137`, `FloatingDownloadButton.module.css:17-29` | Two deviations from the container spec. |
| 4 | Icon size `h-5 w-5, stroke-[2]` | **PARTIALLY CURRENT** | MobileFab, FormFooter match. CSR desktop uses `h-6 w-6`. Download uses 22px SVG (size undocumented in standard). | `CsrFormScreen.tsx:1008,1018`, `FloatingDownloadButton.module.css:31-35` | CSR desktop icon is larger than spec. |
| 5 | No ambient animation (implied by omission) | **STALE** | `csr-fab-float` ambient float on all document FABs | `fabFloat.css:14-26`, `MobileFab.tsx:35`, `FormFooter.tsx:57`, `FloatingDownloadButton.tsx:47`, `CsrFormScreen.tsx:1002,1012` | Standard documents only hover/active. Float introduced 2026-09-07, after standard's last update. |
| 6 | Create FAB: Lucide `Plus` | **CURRENT** | MobileFab default and Dashboard use `Plus` | `MobileFab.tsx:1,37`, `Dashboard.tsx:145` | Match. |
| 7 | Save FAB: Lucide `SaveAll` | **IMPLEMENTATION NON-CONFORMANCE** | FormFooter and CSR use `SaveAll`. Settings create-company uses `Save`. | `FormFooter.tsx:64`, `CsrFormScreen.tsx:993,1018`, `CreateCompanySheet.tsx:644` | Settings variant violates rule 4. |
| 8 | Download FAB: custom SVG `DownloadIcon` | **IMPLEMENTATION NON-CONFORMANCE** | FloatingDownloadButton uses custom SVG. CSR desktop download-blank uses Lucide `Download`. | `FloatingDownloadButton.tsx:5-16`, `CsrFormScreen.tsx:1008` | CSR desktop violates rule 5. |
| 9 | MobileFab is the create FAB | **PARTIALLY CURRENT** | MobileFab is role-agnostic; CSR uses it for save with `SaveAll`/`Loader2` | `CsrFormScreen.tsx:991-996` | Standard frames MobileFab as create-only. Rule 3 ("Use MobileFab for create") does not reflect its save usage. |
| 10 | Mobile placement `bottom: calc(82px + safe-area)`, right 16px | **STALE** | Dashboard matches. MobileFab: `bottom-[94px]`. FormFooter: `calc(72px + safe-area + 16px)` ≈ 88px. | `MobileFab.tsx:21`, `FormFooter.tsx:57`, `Dashboard.tsx:139` | Three different mobile offsets in production; standard documents one. |
| 11 | Desktop (CSR) `bottom: 24px, right: 24px` | **CURRENT** | `bottom-6 right-6` | `CsrFormScreen.tsx:1000` | Match. |
| 12 | Dashboard desktop `top: 96px, right: 32px` | **CURRENT** | `lg:top-24 lg:right-8` | `Dashboard.tsx:137` | Match. |
| 13 | z-index: z-50 mobile / z-30 desktop | **STALE** | MobileFab z-50, CSR desktop z-30 match. FormFooter uses z-[60]. | `MobileFab.tsx:21`, `FormFooter.tsx:57`, `CsrFormScreen.tsx:1000` | FormFooter z-[60] contradicts the rule. |
| 14 | "No exceptions" to container spec | **IMPLEMENTATION NON-CONFORMANCE** | Settings `.su-fab` is 48px `rounded-full` circle | `settings.css:221-229` | Direct violation of Section 2. Undocumented in standard. |
| 15 | One primary FAB per view | **CURRENT** | CSR desktop: save (primary) + download-blank (secondary) — permitted by rule 6 | `CsrFormScreen.tsx:1000-1021` | Match. |
| 16 | Reduced motion degradation | **CURRENT** | `fabFloat.css:32-35` and `settings.css:342-344` | — | Match. Rule 7 satisfied. |
| 17 | File inventory (Section 5) | **STALE** | `MobileInvoiceCollapsibleSections.tsx` cited as Save source — file deleted 2026-09-06 (commit `0bc7aec0`). FormFooter line ref `:56-63` → actual `:57-66`. CsrFormScreen `:982-1010` → actual `:989-1021`. `fabFloat.css` and `FloatingDocumentButton.tsx` not listed. Settings FABs not listed. | `git log --diff-filter=D`, current files | One dead reference, two drifted line refs, three missing files. |
| 18 | Halo glow (MobileFab) | **UNVERIFIABLE** | Decorative halo behind MobileFab | `MobileFab.tsx:23-29` | Not mentioned in standard; neither required nor forbidden. |

---

## 7. Bounce Change History

| Date | Commit | Event |
|---|---|---|
| 2026-09-03 | `314cefed` | CSR form redesign. MobileFab refined with subtle float motion + halo glow. Motion originates here. |
| 2026-09-06 | `0bc7aec0` | `MobileInvoiceCollapsibleSections.tsx` deleted (dead-file cleanup). Same day the standard was last updated — the standard retained the dead reference. |
| 2026-09-06 | — | Standard last updated. Documents pre-float motion model. |
| 2026-09-07 | `41ac5f93` | "feat(compliance): add record capture foundation and fab bounce animation." Creates `fabFloat.css`; propagates `csr-fab-float` to MobileFab, FormFooter save, FloatingDownloadButton, CSR desktop save/download-blank. Removes MobileFab's inline style block. |
| 2026-09-07 | — | Report `docs/reports/general/fab-bounce-propagation-2026-09-07.md` written. States: "Propagate the CSR Save FAB bounce to all applicable Save and Download FABs. Change nothing else about any FAB." |

**Intentionality:** clearly intentional product evolution. The commit message, the report, and the preservation notes ("Dimensions, position, shape, radius, colors, typography, icons, shadows, z-index unchanged") all confirm deliberate scope control.

**Terminology:** the commit and report say "bounce"; the implementation is a continuous ambient float (translateY 0 → -3px, 4s ease-in-out infinite). The report's own forensics section calls it a "float." The true bounce (`suFabBounce`) is a separate Settings-module motion introduced later (`be0b9ac3`, settings UI rebuild). The standard should document the float, not a bounce, for document FABs.

---

## 8. Other Standard Drift (Beyond the Known Motion Change)

### 8.1 Stale Documentation

1. **Dead file reference:** `MobileInvoiceCollapsibleSections.tsx` (standard Sections 3.2 and 5) — deleted in `0bc7aec0` (2026-09-06). The invoice mobile save FAB now lives in `FormFooter.tsx`.
2. **Mobile placement value:** standard says `calc(82px + safe-area)`; actual values are 94px (MobileFab), 88px (FormFooter), 82px (Dashboard). The standard documented one of three values as the rule.
3. **z-index rule:** standard says z-50/z-30; FormFooter uses z-[60].
4. **Icon size:** standard says h-5 w-5; CSR desktop FABs use h-6 w-6.
5. **Line references:** FormFooter `:56-63` → actual `:57-66`; CsrFormScreen `:982-1010` → actual `:989-1021`.

### 8.2 Deliberate Implementation Evolution (standard should catch up)

1. **Ambient float** on all document FABs (Section 7).
2. **MobileFab role expansion:** from create-only to role-agnostic (CSR save). The standard's rule 3 ("Use MobileFab for create") is now incomplete.
3. **Download FAB hover model:** translateY(-2px) instead of scale-105 — a deliberate CSS-module design, undocumented.
4. **Settings FAB system:** `.su-fab` (48px circle, true bounce) and `.su-fab-float` (50×50, true bounce) — a parallel FAB design system entirely absent from the standard.

### 8.3 Actual Implementation Violations of Still-Valid Rules

1. **CSR desktop download-blank uses Lucide `Download`** — violates rule 5 (custom SVG required). The standard should remain unchanged; the implementation should be fixed.
2. **Settings `.su-fab` is a 48px circle** — violates the Section 2 container spec ("No exceptions"). Arguably out of scope (separate design system), but the standard currently claims app-wide scope.

### 8.4 Obsolete Examples

- Standard Section 5 lists `MobileInvoiceCollapsibleSections.tsx:256-263` as a Save FAB source — obsolete (file deleted).
- The standard's file inventory predates `fabFloat.css` and `FloatingDocumentButton.tsx`.

---

## 9. Test Coverage

| Test | File | Status |
|---|---|---|
| Download FAB accessibility (aria-label, title, srOnly) | `src/tests/document-view/invoiceQuotationViewRegression.test.js:39-53` | **CURRENT** — matches implementation. |
| Download FAB background tokens | `src/tests/document-view/documentOverlayTokenRegression.test.js:38` | **STALE** — asserts `FloatingDownloadButton.module.css` contains `--bd-button-primary-bg\|--bd-fab-bg`. Current module.css uses `hsl(var(--primary))`; neither token is present. Would fail if run. |
| Ambient float / bounce animation | — | **UNTESTED** — no test references `fabFloat.css`, `csr-fab-float`, or `suFabBounce`. |
| FAB container spec (50×50, rounded-[18px]) | — | **UNTESTED** — no test asserts FAB dimensions. |
| FAB icon rules (SaveAll, custom SVG) | — | **PARTIALLY TESTED** — `invoiceQuotationViewRegression.test.js:50` asserts the download FAB does not render a Lucide `Download` icon with a visible label, but no test covers CSR desktop's `Download` violation. |

---

## 10. Recommended Standard Update

### KEEP (still-correct normative requirements)

- Container spec: 50×50, rounded-[18px], `bg-bd-button-primary-bg`, `text-bd-button-primary-text`, `shadow-lg`.
- Icon taxonomy: Plus (create), SaveAll (save), custom SVG (download) — for the document design system.
- One primary FAB per view; download may accompany save.
- Reduced-motion degradation requirement (rule 7).
- "No new icons / no new shapes" rules for the document design system.
- Dashboard placement values (mobile 82px, desktop top 96px/right 32px) — verified exact.

### UPDATE (conceptually correct, needs current details)

1. **Add a motion section.** Document the ambient float as the behavioral contract: "Document FABs (create, save, download) carry a continuous ambient float: translateY 0 → -3px, 4s ease-in-out infinite, from mount. The float lives on a wrapper element, never on the button, so hover/active transforms are preserved. Reduced motion disables the float." Do not call it a bounce.
2. **Fix mobile placement.** Either specify per-component offsets (MobileFab 94px, FormFooter 88px, Dashboard 82px) or mandate one value and migrate the components. The current single value matches only Dashboard.
3. **Fix z-index rule.** Add FormFooter z-[60] or migrate it to z-50.
4. **Fix icon size.** Either correct CSR desktop to h-5 w-5 or document h-6 w-6 as the desktop-FAB size.
5. **Correct MobileFab role.** Rule 3 should read: "MobileFab is the shared FAB for create and any role needing a generic icon. Default icon Plus." Document CSR's save usage.
6. **Document the Download FAB hover model** (translateY(-2px), 150ms) as an allowed alternative to scale-105 for CSS-module FABs.
7. **Fix file inventory.** Remove `MobileInvoiceCollapsibleSections.tsx`; add `fabFloat.css`, `FloatingDocumentButton.tsx`; correct line refs.
8. **Add a scope boundary for Settings FABs.** Either bring `.su-fab`/`.su-fab-float` under the standard or explicitly exclude the Settings design system with a pointer to `settings.css`.

### ADD (current behavior missing entirely)

1. Ambient float contract (see UPDATE 1).
2. Halo glow (MobileFab) — decorative, optional to standardize.
3. Settings FAB system: `.su-fab` (48px circle, `suFabBounce` 2.6s true bounce) and `.su-fab-float` (50×50, bounce) — if brought under scope.
4. Diagnostic logging in FloatingDownloadButton — should be flagged for removal, not standardized.

### REMOVE (obsolete)

1. `MobileInvoiceCollapsibleSections.tsx` references (Sections 3.2, 5).
2. The implied "no ambient animation" model (silent omission that contradicts production).

### IMPLEMENTATION ISSUE (standard stays; code should change)

1. **CSR desktop download-blank** must use the custom SVG `DownloadIcon` (or the standard must explicitly permit a Lucide icon for secondary download actions — but the current rule 5 admits no exception).
2. **Settings `.su-fab`** violates the container spec. Either the standard's scope excludes Settings, or the component must migrate.

---

## 11. Proposed Next Action

**Option (a): update only the FAB standard — plus two small implementation fixes tracked separately.**

Rationale:

- The standard's core (container, icons, roles) is sound and mostly conforming. The drift is documentation lag, not architectural conflict.
- The motion change is verified intentional (commit `41ac5f93` + propagation report). No investigation needed.
- The two implementation violations (CSR desktop Lucide `Download`, Settings 48px circle) are small, well-defined fixes. They should be tracked as separate implementation tasks, not bundled into a standard rewrite — except CSR desktop, which is a genuine rule-5 violation the standard already forbids.
- No behavior-preservation risk in a documentation update; the float is live production behavior that the standard must catch up to.

Concrete next tasks (separate from this audit):

1. Rewrite `docs/standard/fab-standard.md` per Section 10 (motion section, placement, z-index, icon size, MobileFab role, file inventory, Settings scope).
2. Fix `CsrFormScreen.tsx:1008` to use the custom SVG `DownloadIcon` (restores rule-5 conformance).
3. Update `documentOverlayTokenRegression.test.js:38` to match the current `hsl(var(--primary))` background.
4. Decide Settings FAB scope: extend the standard or document the exclusion.
5. Remove the diagnostic `console.group` block from `FloatingDownloadButton.tsx:31-44`.

---

## Verification

- `git status` (before): pre-existing BOQ-related modifications and untracked files from another agent. Not touched.
- `git status` (after): unchanged except this report file added.
- No application source, standard, CSS, test, configuration, or migration file was modified.
- `bun run build`: skipped due to hardware policy.
- `bun run typecheck`, `bun run lint`, `bun run audit:load`, tests: not run (documentation-only investigation; prohibited by task constraints).
