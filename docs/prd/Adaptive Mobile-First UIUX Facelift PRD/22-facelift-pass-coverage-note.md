# Facelift Pass — Visual Token & Surface Coverage Note

> Status: Coverage note, not normative design authority
> Last updated: 2026-09-04
> Author: Buffy (Freebuff/local runner)
> Related PRD: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/00-index.md`

This note records the scope, token additions, and component coverage of one visual facelift pass applied to the BIGDROPS dashboard and document-view surfaces. It does not change the design contract. It does not change locked decisions. It does not introduce a new visual language.

## Purpose

This note helps the PRD body track what was covered in a themeing/polish pass, and where coverage still remains relative to the canonical component patterns.

## Scope of this pass

- Colors and visual treatment only.
- No layout changes.
- No spacing scale changes.
- No component structure changes.
- No navigation model changes.
- No responsive behavior changes.
- No interaction logic changes.
- 2-column KPI grid remained locked.

## Bug fixed

`src/components/layout/MobileBottomNav.tsx`

Reported symptom: the active tab appeared to disappear from the bottom nav.

Diagnosis: all five tabs always rendered. There was no `.filter`, no `.find`, and no conditional unmount. The symptom was visual, not structural:
- The active button used a strong gradient plus `text-white` plus a large primary-tinted drop shadow.
- On some theme/nav backgrounds that treatment reduced icon/label contrast enough to look missing.

Fix approach: replace the one-off gradient/color treatment with the existing semantic nav tokens already defined in the theme system, and keep icon/label always present. Active state is now visually distinguished through color/background/pill treatment rather than removed.

## New token additions

`src/index.css`

Introduced three standardized UI text tone tokens, mirroring the PRD ink hierarchy rather than inventing a new naming scheme:

- `--bd-ink` — primary text
- `--bd-ink-muted` — muted text
- `--bd-ink-icon` — icon accent color

These are defined in both light and dark root blocks and are mapped to the existing `bd-text` / `bd-text-muted` / `primary` bridge tokens. They are intended for consistent use in UI text and icon color, not for structural decisions.

## Component coverage in this pass

The following surfaces were updated for elevation and token consistency:

### Top bar and nav

- Mobile bottom nav
- Dashboard top bar
- Top bar icon buttons (menu, theme toggle, search, AI)
- Dashboard eyebrow and section headers

### KPI surface

- KPI metric cards
- KPI tick bars (inactive tick color switched to a semantic muted token)
- KPI metric value and label typography tightened within the locked type scale

### Activity, alerts, and audit surfaces

- Recent activity list rows
- Payment reminder banner
- Recent alerts carousel
- Audit trail skeleton and rows

### List surfaces

- Dense list card
- Entity list card

### Document-view surfaces

- Document top nav icon buttons
- Document more sheet action rows and pills
- Invoice advance sheet options and computed box
- Invoice payments section card and rows
- Invoice document card inline text colors
- Waybill summary strip and row separators
- Document action buttons (primary, outline, chips)
- Floating download button
- Document preview card and hero
- Project document card and its action buttons

## Visual treatment applied

- Cards and metric tiles moved toward layered box shadows plus a subtle inset highlight instead of a single 1px stroke where appropriate.
- Interactive controls moved toward soft drop shadow plus subtle inset top highlight instead of a flat solid fill or a visible hard border where appropriate.
- List row dividers moved toward a low-contrast track token rather than a high-contrast border color.
- Bottom nav retained solid/near-solid treatment — no glassmorphism added.
- Text colors were standardized to the new ink/muted/icon tokens where they had been inconsistent.

## Coverage gaps still remaining

This pass did not claim full coverage of the PRD component inventory. The following were not part of this pass and remain open for separate work:

- Form surfaces under `07-forms.md`
- Data tables under `08-tables-and-data.md`
- Dedicated document view UX spec under `09-documents.md`
- Overlays and sheets under `21-surfaces-and-overlays.md`
- All PDF rendering surfaces
- Other document-view module CSS files not listed above

## Relationship to locked decisions

This pass is compatible with the locked decisions in `00-index.md`, including but not limited to:

- mobile-first
- 5-tab navigation model
- Manrope + DM Mono typography
- 2-column KPI grid
- bottom nav solid/near-solid, no glassmorphism
- themes = color only

## Notes for future passes

- The documented visual contract in `03-design-system.md`, `04-theme-system.md`, `06-component-patterns.md`, and `Design.md` remains authoritative for structural and color rules.
- Token adoption in this pass was selective. Remaining hardcoded UI colors in other components should be reconciled to the semantic token set in a later pass rather than assumed complete here.
- Because this pass touched both globals and component CSS, any later theme pass should verify that new token usage does not conflict with the color-only theme contract.
