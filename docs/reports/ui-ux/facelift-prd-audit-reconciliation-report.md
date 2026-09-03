# Adaptive Mobile-First UIUX Facelift PRD — Audit & Reconciliation Report

This report was written by Buffy on 2026-09-01 via Freebuff.

---

## Objective

Audit the complete Facelift PRD (`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/`) against the current BIGDROPS repository. Classify every PRD requirement as COMPLETE, PARTIAL, NOT IMPLEMENTED, OUTDATED/SUPERSEDED, or NEEDS VERIFICATION. Reconcile the roadmap against actual implementation state. Identify missing requirements.

## Scope

- All 23 PRD files (§00–§21 + Design.md)
- Repository implementation: navigation, components, forms, tables, documents, loading, accessibility, Capacitor/native, AI, context switchers, onboarding, document peek, column manager, PDF view, surfaces/overlays
- Android-first integrity audit
- Shared architecture gap analysis
- Roadmap reconciliation

## Files Changed

None. This is a zero-code audit. No application source, PRD, or standard files were modified.

## Skills Used

mobile-app-ui-design, frontend-design, redesign-existing-projects, capacitor-best-practices, capacitor-accessibility

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

None. This is a discovery and reconciliation audit only.

## Verification Result

- git status before audit: 4 modified + 2 untracked (from prior DocumentCustomizeCard task)
- git status after audit: identical — zero application/PRD/standard changes
- bun run build: not run (zero-code audit)
- bun run typecheck: not run (zero-code audit)

---

## 1. Executive Status

The Facelift PRD is **substantially implemented at the structural and component level** (~55-60% of total scope). The repository has working navigation, responsive layout, document views, theme system, Capacitor integration, and loading infrastructure. Major gaps remain in Android polish, shared architecture enforcement, and several newer specifications.

---

## 2. Completed

### Design System & Tokens (§03, §04)
- `--bd-*` token system in `src/lib/themeTokens.ts`
- Theme presets (slate-navy + 5 variants) in `src/lib/themePresets.ts`
- Light/dark mode via `data-theme` attribute
- Theme = color only (structural tokens in `formTheme.css` don't change with theme)
- Lucide icon library used consistently

### Navigation Shell (§05)
- 5-tab bottom nav: `MobileBottomNav.tsx` — solid `var(--nav)`, no glassmorphism
- Top bar: `MobilePageHeader.tsx` — sticky, workspace identity
- Drawer: `MobileSidebar.tsx` — `min(84%, 340px)`, left slide-in
- Search overlay: `GlobalSearch.tsx` — full-screen
- FAB: `MobileFab.tsx` — above bottom nav
- Bottom sheets: `DocumentSheet.tsx`, `UnifiedActionSheet.tsx`

### Core Components (§06)
- KPI metric cards (4-currency model): `KpiGrid.tsx`
- Activity rows, alert cards, audit rows, section headers, empty states, status badges, toasts, reminder banners — all present

### Documents (§09)
- All 8 document families have View pages with shared `DocumentTopNav`, `DocumentHero`, `DocumentSheet`, `DocumentMoreSheet`, `DocumentConfirmDialog`
- `DocumentCustomizeCard` — single canonical card, capability-driven
- Template picker injected via prop, shared across CSR/Waybill/BOQ/Invoice/Quotation

### Loading & Refresh (§10)
- Progressive loading levels: `PageLoader.tsx` (Level 2-3), `SplashOverlay.tsx` (Level 4-5)
- Quick tip system: `useLoadingTip.ts`, `QuickTipCard.tsx` — contextual, anti-repetition
- Skeleton loading, button loading states, reduced motion handling

### Capacitor/Native (§12)
- Safe area handling via `env(safe-area-inset-*)`
- Android back handler: `AndroidBackHandler.tsx`
- Fold awareness: `AndroidFoldAwareness.tsx`, `FoldAwareness.ts`, `useLayoutMode.ts`
- System bars: `AndroidSystemBars.tsx`
- Keyboard awareness: `KeyboardAwareness.tsx`
- Splash/loading transition: `SplashOverlay.tsx`

### Interaction Model (§15)
- Elevation via shadow (no blur): `--shadow` and `--shadow-float` tokens
- Edge-to-edge insets on nav, FAB, sheets
- Bottom sheets as default overlay

### Context Switchers (§16)
- Company Switcher in drawer: `BusinessSwitcher.tsx`, `CompanySelectionSheet.tsx`
- Workspace Switcher in Settings: `WorkspaceSwitcherRow.tsx`, `WorkspaceSelectionSheet.tsx`
- Provider/state ownership correct

### App Entry & Onboarding (§17)
- Session restoration, auth entry, password recovery, onboarding, workspace setup, provisioning — all present

### Document Customization (Recent Work)
- ONE `DocumentCustomizeCard` — single canonical card
- Capability-driven: `showAccentColor`, `showDocumentFont`, `showCompact`, `showLandscape`
- Template picker as baseline, injected via prop
- CSR, Waybill, BOQ use card directly; Invoice/Quotation use `PdfOutputCustomizeSheet` wrapping the card
- RFQ domain customization remains separate (correct)

---

## 3. Partially Complete

### Responsive Breakpoints (§02)
- `useLayoutMode` uses 600/1200. `FoldAwareness.getWebFallback()` uses 600/840/1200. Inconsistent.
- PRD proposes 600/840/1200 but notes device testing needed.

### Forms (§07)
- Invoice form 2-col layout, line items, row totals — present
- Line item reorder via drag — needs verification
- Form validation error states — need verification against spec

### Tables & Data (§08)
- Card layout on phone — present
- Column priority system — not formally implemented
- Swipe actions, sticky columns, column resize — not confirmed

### Accessibility (§11)
- `aria-label` on many elements — present
- `prefers-reduced-motion` in CSS — present
- Focus trapping via Radix — present
- Skip links — NOT found
- `role="main"`, `role="navigation"`, `role="tablist"` — NOT found on page-level elements
- Keyboard shortcuts (Ctrl+S, Ctrl+Enter) — NOT found
- Screen reader testing — no evidence
- Contrast/touch target audits — no evidence

### Animations (§05, §15)
- Ink ripple — NOT implemented (only `active:scale` interim)
- Consistent transition timing — varies across components

### Snackbar System (§15 §6)
- OUTDATED — toast system (`use-toast.ts`, `sonner.tsx`) already existed before PRD and covers bottom-positioned actionable notifications. PRD §15 §6 describes what was already shipped.

### PDF-View Fidelity (§20)
- Bank details in separate card, notes in edit sheets, footer text PDF-only — not consolidated

### Surfaces & Overlays (§21)
- Draft standard exists. Radius inconsistent (26/28/30px vs token). z-index inconsistent (z-50 vs z-[250]).

---

## 4. Not Implemented

| Requirement | PRD Section | Evidence |
|-------------|-------------|----------|
| Ink ripple feedback | §15 §1 | Only `active:scale` exists |
| ~~Snackbar system~~ | §15 §6 | OUTDATED — toast system already existed before PRD was written and covers this use case |
| Predictive back gesture (Android 14+) | §15 §3 | Only basic `AndroidBackHandler` |
| Document peek card (long-press preview) | §18 | `useLongPress` disconnected; no Capacitor plugin |
| Column Manager mobile redesign (44×44px targets, @dnd-kit) | §19 | `ColumnManager.tsx` still uses HTML5 drag, small targets |
| PDF-view fidelity consolidation | §20 | Bank/notes/terms/footer not inlined in document card |
| AI integration (free-llm-gateway backend) | §13 | No `src/services/ai/` directory |
| Foldable side-by-side panels | §02 | No list+detail layout |
| Full data tables (desktop) | §08 | Card layout only, no full table with resize/reorder |
| Keyboard shortcuts (Ctrl+S, Ctrl+Enter) | §11 | Not found |

---

## 5. Outdated / Superseded

| Requirement | Reason |
|-------------|--------|
| Breakpoint values 768/1024 | Superseded by actual code thresholds: 600/840/1200 |
| Fixed loading duration (~2.2s) | Superseded by `useLoadingTip` tying to actual operation duration |
| Bottom nav glassmorphism | Superseded by locked decision: solid `var(--nav)` + shadow |

---

## 6. Needs Verification

| Requirement | What Evidence Is Missing |
|-------------|------------------------|
| Touch target sizes (44×44px) | Formal audit across all interactive elements |
| Keyboard navigation | Systematic Tab/Enter/Escape testing |
| Screen reader compatibility | NVDA/VoiceOver testing on core flows |
| Orientation handling | Real device testing portrait/landscape |
| Capacitor native feel | Physical device testing |
| 200% text zoom | Layout testing at 200% zoom |
| Font loading (Manrope + DM Mono) | Verify fonts load correctly across all views |

---

## 7. Android Integrity Gaps

### Phone (Priority 1)
- **ColumnManager touch targets** — CONFIRMED FAILING: grip 14×20px, chevrons 18×14px, toggles 30×28px. All below 44×44px minimum.
- **No ink ripple** — Only `active:scale` interim exists
- **No predictive back** — Only Escape dispatch
- **No document peek card** — Long-press disconnected, no native plugin

### Foldable (Priority 2)
- **No side-by-side panels** — List+detail layout not implemented
- **Hinge safe area** — CSS exists but untested on real devices
- **Posture behavior** — Flat/tent mode not implemented

### Tablet (Priority 3)
- **Multi-column not systematic** — Some components adapt, no consistent layout
- **Higher density** — Card layout may not maximize screen real estate

### Desktop (Priority 4)
- **Sidebar content incomplete** — `DesktopSidebar.tsx` exists, needs verification
- **No column resize/reorder** — Not implemented
- **No keyboard shortcuts** — Not found

---

## 8. Document UX Status

| Family | View | TopNav | Hero | Customize | MoreActions | PDF | Status |
|--------|------|--------|------|-----------|-------------|-----|--------|
| Invoice | ✅ | ✅ | ✅ | ✅ via PdfOutputCustomizeSheet | ✅ | ✅ | GOOD |
| Quotation | ✅ | ✅ | ✅ | ✅ via PdfOutputCustomizeSheet | ✅ | ✅ | GOOD |
| Waybill | ✅ | ✅ | ✅ | ✅ DocumentCustomizeCard | ✅ | ✅ | GOOD |
| CSR | ✅ | ✅ | ✅ | ✅ DocumentCustomizeCard | ✅ | ✅ | GOOD |
| BOQ | ✅ | ✅ | ✅ | ✅ DocumentCustomizeCard | ✅ | ✅ | GOOD |
| RFQ | ✅ | ✅ | ✅ | ⚠️ Separate panel (by design) | ✅ | ⚠️ | OK |
| Letter | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | MINIMAL |
| Receipt | ✅ | ✅ | ⚠️ | ❌ | ❌ | ✅ | MINIMAL |

---

## 9. Shared Architecture Gaps

### Duplication Found
- **Sheet `isMobile` detection**: `DocumentSheet.tsx`, `InvoiceAdvanceSheet.tsx`, `JsonImportLayout.tsx` each have their own `useState` + `window.innerWidth` check instead of using `useLayoutMode`
- **Confirmation dialogs**: `ConfirmActionDialog` (list views) and `DocumentConfirmDialog` (document views) — different wrappers for same pattern
- **Settings responsive**: `SettingsShell.tsx` manually checks `viewportWidth < 768` instead of `useLayoutMode`

### Consistency Enforcement
- **Enforced architecturally**: DocumentCustomizeCard, DocumentSheet, DocumentTopNav
- **Not enforced**: Overlay radius (some hardcoded), z-index (inconsistent), transition timing (varies)
- **Should be enforced**: `useLayoutMode` usage (manual width checks remain)

---

## 10. Roadmap Reconciliation

| Phase | Status | Remaining |
|-------|--------|-----------|
| 0: Design Decisions | ✅ ALL DONE | Remove from active roadmap |
| 1: Foundation/Tokens | ✅ MOSTLY DONE | Minor old token cleanup |
| 2: Mobile Shell | ✅ DONE | None |
| 3: Core Components | ✅ DONE | None |
| 4: Responsive Adaptation | ⚠️ PARTIAL | Foldable panels, tablet multi-col, breakpoint alignment |
| 5: Forms and Data | ⚠️ PARTIAL | Line item reorder, validation, tablet/desktop tables |
| 6: Documents | ✅ MOSTLY DONE | Letter/Receipt need more work |
| 7: Desktop Adaptation | ❌ MOSTLY NOT DONE | Full tables, column resize, keyboard shortcuts |
| 8: Accessibility/Native | ⚠️ PARTIAL | Screen reader test, touch target audit, contrast audit |
| 9: Final Polish | ❌ NOT DONE | Cross-platform audit, performance audit |

---

## 11. PRD Additions Required

1. **Android-first integrity as hard acceptance gate** — Not currently a gate
2. **Foldable width/posture behavior** — Lacks specific implementation guidance
3. **Tablet-as-expanded-mobile enforcement** — Prevent desktop patterns bleeding in
4. **Shared overlay standard** — §21 is draft, needs promotion to locked
5. **Document customization architecture** — Lock the unified card as architectural decision
6. **Future document extensibility contract** — How new families adopt shared UX
7. **Component-level accessibility contracts** — Per-component ARIA/keyboard/focus specs
8. **Consistent interaction pattern enforcement** — Same action = same behavior everywhere

---

## 12. Recommended Remaining Work Order

### Phase A: Critical Android (Highest)
1. ColumnManager touch target fix (@dnd-kit)
2. Touch target audit across all interactive elements
3. Screen reader baseline test

### Phase B: Architecture Enforcement (High)
4. Unify `isMobile` detection to `useLayoutMode`
5. Overlay standard enforcement (radius, z-index, timing)
6. Confirm dialog consolidation

### Phase C: Missing Features (Medium)
7. ~~Snackbar system~~ — OUTDATED, toast already covers this
8. Foldable side-by-side panels (§02)
9. Document peek card (§18)
10. PDF-view fidelity consolidation (§20)

### Phase D: Polish (Lower)
11. Ink ripple
12. Keyboard shortcuts
13. Desktop full data tables
14. Orientation/zoom testing

---

## 13. Final Verdict

**What is actually left:** Android polish (ColumnManager, ripple, predictive back, peek card), shared architecture enforcement (overlay standard, `useLayoutMode` unification), missing features (foldable panels, PDF-view fidelity), and accessibility verification (screen reader, keyboard, contrast).

**What should be removed from roadmap:** Phases 0-3 are complete. Remove from active planning.

**What should be added:** Phase A (Android Integrity Gate), Phase B (Architecture Enforcement), Phase C (Missing Features).

**What should be prioritized next:** ColumnManager touch target fix — confirmed Android failure with clear implementation path (@dnd-kit already installed).

---

## Risks or Limitations

- This audit is based on static repository inspection. Device testing on real Android phones, foldables, and tablets would reveal additional issues.
- The AI integration (§13) is deferred by design and not counted as a gap.
- Letter and Receipt document families are minimal but may not need the full customization experience.

## Deferred Work

- AI integration (deferred per PRD)
- Letter/Receipt full customization
- iOS equivalent of document peek card
- Desktop full data tables with column resize
