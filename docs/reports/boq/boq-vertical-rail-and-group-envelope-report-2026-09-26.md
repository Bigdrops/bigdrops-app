# BOQ Vertical Utility Rail and Group Envelope Report

This report was written by Gemini 3.7 Flash on 2026-09-26 via Antigravity.

## Objective

Correct the visual architecture of the BOQ Full-Page Live Form prototype to resolve two specific requirements:
1. Reconstruct item enumeration and item management controls into a dedicated vertical left-side utility rail, with the delete control attached to the right boundary.
2. Establish a strong, continuous physical envelope for expanded Groups around all member items.

## Scope

- Standalone HTML prototype file only: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`
- No changes to React application source.
- No changes to business logic, financial calculations, data structures, or JSON import contracts.

## Files Changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### 1. Item Architecture: Vertical Left Utility Rail & Right Delete Notch

- **Removed horizontal toolbar (`.ihead`):** Eliminated the previous top-row horizontal flex bar.
- **Added `.irail` (Vertical Utility Rail):**
  - Positioned along the left boundary (`width: 28px`).
  - Stacks enumeration badge (`.idx`: 28px × 26px), Move Up (`.mbtn`: 28px × 28px), Move Down (`.mbtn`: 28px × 28px), and Duplicate (`.mbtn`: 28px × 28px).
  - Maintains comfortable touch targets while occupying minimal horizontal space.
- **Added `.ibody` (Main Editable Body):**
  - Flexible container (`flex: 1`) taking up all remaining width.
  - Contains description, collapsible sub-description, specification, quantity/unit/make, cost price/selling price, line profit banner, and "Insert below" action.
  - Provided `padding-right: 24px` to ensure text and inputs do not overlap the right-edge delete control.
- **Added `.del-notch` (Attached Right Delete Notch):**
  - Positioned on the right boundary (`position: absolute; top: 10px; right: 0;`).
  - Styled as a compact edge tab (`22px × 24px`) with soft red highlight and clear delete icon.

### 2. Group Architecture: Strong, Continuous Physical Envelope

- **Unified Envelope (`.gwrap`):**
  - Expanded Groups render as a continuous card envelope with `border: 1.5px solid rgba(30,58,95,.22)`, `border-radius: 16px`, `box-shadow: 0 4px 14px rgba(30,58,95,.05)`, and `overflow: hidden`.
- **Top Envelope Banner (`.ghdr`):**
  - Dark linear gradient header (`#0f172a` to `#1e3a5f`) forming the seamless top edge of the envelope.
- **Enclosed Member Area (`.gbody`):**
  - Light background (`#fcfdff`) containing all member rows.
  - Member rows use subtle horizontal separators (`1px solid rgba(15,23,42,.08)`) with zero nested card shells.
  - Empty groups render an explicit italicized placeholder ("No items in this group yet").
- **Closing Footer (`.gfoot`):**
  - Anchors the bottom of the envelope with `#f1f5f9` surface and `1px solid rgba(30,58,95,.12)` top boundary.
  - Contains the full-width `+ Add item to this group` button (`.gfoot-btn`).
- **Collapsed Group (`.gwrap.collapsed`):**
  - Dissolves the envelope container borders/background.
  - Body and footer are hidden via `display: none`.
  - Header renders as a compact standalone pill with dashed border and rotated chevron.

## Invariant and Behavior Verification

1. **Item enumeration:** Global sequential numbering preserved (Groups do not consume item numbers; all items increment continuously: 01, 02, 03...).
2. **Move / Duplicate / Insert / Delete:** Fully functional and mapped to rows and sibling lists.
3. **Sub-description:** Expand/collapse behavior preserved with autofocus on open.
4. **Calculations & Totals:** CP, SP, Profit, Margin, and Words format verified intact.
5. **Column Manager:** Visibility toggles and locked flags intact.
6. **JSON Import:** Schema mapping and group/item association intact.
7. **Bottom Creation Pair:** "Add line item" and "Add group" remain below final content.

## Verification

- `git diff --check`: passed (exit code 0)
- `git status`: clean for task scope (only target HTML file modified)
- `bun run typecheck`: not applicable (standalone HTML prototype)
- `bun run audit:load`: not applicable (standalone HTML prototype)
- `supabase db push`: not applicable
- `bun run build`: skipped due to hardware policy

## Supabase Push Status

not applicable

## Risks or Limitations

- Prototype is standalone HTML/JS. When integrating into the React codebase, equivalent Tailwind / CSS modules should follow the `.irail` + `.ibody` + `.del-notch` and `.gwrap` envelope composition.

## Deferred Work

- None. Task-scoped visual architecture correction is complete.
