# UI/UX Consolidation — P1 + P2 Implementation Report

**Identity:** This report was written by OpenCode on 2026-07-12 via Local Runner.  
**Delegation:** `[DELEGATION] task="UI/UX consolidation P1+P2" | domain="ui-ux-consolidation" | subagent="NONE" | justification="No SUBAGENTS.md entry matches multi-domain CSS/component consolidation; used ponytail skill + codebase audit" | harness="Local Runner"`

---

## Scope

Implements P1 (sidebar scroll fix, button primitives, dead code) and P2 (formTheme.css duplicate vars) from the UI/UX Consolidation PRD. Audit phase separated done from pending; implementation targeted surgical changes only.

---

## Changes

### P1 — Sidebar Scroll Fix (D-003)
- **File:** `src/components/layout/DesktopSidebar.tsx`
- **Change:** Moved `bd-custom-scrollbar` class from outer wrapper `<div>` (which doesn't scroll) to the `flex-1 overflow-y-auto` inner `<div>` (the actual scroll container)
- **Bug:** The 4px thin custom scrollbar CSS never applied — default thick scrollbar was always shown on desktop sidebar
- **Fix:** 2-line change, verified via typecheck

### P1 — Dead Code Removal (D-013)
- **Deleted:** `src/components/ui/sidebar.tsx` (715 lines)
- **Evidence:** Confirmed zero imports across the codebase via grep. `Layout.tsx` uses `DesktopSidebar.tsx`, not this shadcn sidebar primitive.

### P1 — ButtonGroup/InputGroup Primitives (D-014)
- **Created:** `src/components/ui/button-group.tsx`
  - Exports: `ButtonGroup` (inline-flex container with `-space-x-px` + border-radius merging), `ButtonGroupSeparator` (vertical Separator)
  - Matches import pattern from `filter-button-reference.tsx` template
- **Created:** `src/components/ui/input-group.tsx`
  - Exports: `InputGroup` (flex column container), `InputGroupAddon` (toolbar strip with `align` prop), `InputGroupButton` (icon-sized Button), `InputGroupTextarea` (borderless-bottom Textarea)
  - Matches import pattern from `richtextform.tsx` template

### P2 — CSS Variable Deduplication (D-011 Phase 1)
- **File:** `src/styles/formTheme.css`
- **Change:** Removed 5 CSS variable declarations that duplicate `src/index.css` (which already defines them with fallback values):
  - `--bd-surface`, `--bd-surface-muted`, `--bd-border`, `--bd-text`, `--bd-text-muted`
- **Safety:** index.css already has these with fallback values, so removing from formTheme.css is no-op

---

## Verification Gate

| Check | Result |
|-------|--------|
| `bun run typecheck` | ✅ Passed (0 errors) |
| `bun run audit:load` | ✅ Passed (no new warnings) |
| `git status` | ✅ Only intended files changed |

---

## Files Affected

| File | Action |
|------|--------|
| `src/components/layout/DesktopSidebar.tsx` | Modified (scroll fix) |
| `src/components/ui/sidebar.tsx` | Deleted (dead code, 715 lines) |
| `src/components/ui/button-group.tsx` | Created (new primitive) |
| `src/components/ui/input-group.tsx` | Created (new primitive) |
| `src/styles/formTheme.css` | Modified (removed 5 duplicate vars) |

---

## Deferred (Not in Scope)

- D-004 (FilterButton001): No concrete template to extract
- D-010 (Reduced-Motion): Pure CSS change, not a P1/P2 priority
- D-009/D-015 (Sticky columns): DataGrid-level change, separate task
- D-006/D-007/D-005: Higher-effort Phase 2 items
