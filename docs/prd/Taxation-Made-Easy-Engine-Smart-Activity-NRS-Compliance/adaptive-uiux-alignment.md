# Adaptive Mobile-First UIUX Alignment & Tracking

> Purpose: Keep this PRD folder conscious of the Adaptive Mobile-First
> UIUX Facelift PRD and ensure the documents in this folder neither
> violate nor contradict it.
> Status: Active
> Last updated: 2026-09-05

---

## 1. Authority

| Item | Value |
|---|---|
| Authority document | `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/00-index.md` |
| Chapter index | `00-index.md`; chapters 01–22 define design system, navigation, components, forms, surfaces, Capacitor behavior |
| Status | Active — Foundation Established |

## 2. UIUX constraints this folder must respect

| Constraint | Source |
|---|---|
| Mobile-first: phone is the design source; desktop adapts. All design starts at phone width. | 00-index.md |
| Design tokens, components, and spacing come from the design system (chapters 03–06). No bespoke styling. | 03, 04, 06 |
| Navigation: bottom nav on phone, sidebar on desktop; top-bar search opens an overlay | 05-navigation-shell.md |
| Bottom sheet is the default mobile overlay; side sheets must fall back to bottom sheets on mobile | 21-surfaces-and-overlays.md |
| Progressive disclosure: advanced/compliance data only where the task requires it | 00-index.md, contribution §15 |
| Capacitor behavior, offline handling, and accessibility apply to every surface | 12-capacitor-native.md, 11-accessibility.md |

## 3. Alignment status of documents in this folder

| Document | Status | Notes |
|---|---|---|
| Files-tax-monthly-v1.md | Aligned | Surfaces reuse existing dashboard card, notification, and Compliance Hub patterns. |
| Record-capture-v1.md | Aligned | Plain-language form follows the folder's form patterns (chapter 07); bottom-sheet entry consistent with chapter 21. |
| Record-engagement-plan-v1.md | Aligned | Prompts use existing surfaces (banners, sheets, notification center); escalation increases visibility, not new UI. |
| ai-integration.md | Aligned | Assistant bottom sheet, top-bar search, and inline suggestions match the Facelift interaction patterns. |
| bigdrops-tax-ux-vision-v1.md | Draft | Discovery only; not buildable yet — no UI conflict. |
| NRS-docs/, Refrences/ | N/A | Reference material. |

## 4. Contradiction rules

1. If a document in this folder specifies a surface that conflicts with
   the Facelift design system or navigation model, the Facelift PRD wins.
2. Tax-content rules in this folder (guardrails, statutory sourcing)
   are additive to the Facelift conventions; they do not restyle UI.
3. Where a document proposes a new surface, it must name the Facelift
   chapter it conforms to before implementation.

## 5. Tracking log

| Date | Change | Checked by |
|---|---|---|
| 2026-09-05 | Created. Initial alignment pass over the folder. | Buffy |

## 6. Change log

| Date | Change |
|---|---|
| 2026-09-05 | Created. |