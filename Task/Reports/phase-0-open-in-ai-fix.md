# Phase 0 — OpenInAI DropdownMenu → Popover Fix

**Date:** 2026-06-14  
**Agent:** opencode (opencode/deepseek-v4-flash-free)  
**Session ID:** phase-0-open-in-ai-fix  

---

## Skills Loaded

| Skill | Source | Status |
|---|---|---|
| `frontend-design` | `.agents/skills/frontend-design/SKILL.md` | Loaded via skill tool |
| `tailwind-css-patterns` | `.agents/skills/tailwind-css-patterns/SKILL.md` | Loaded via skill tool |
| `shadcn` | `.agents/skills/shadcn/SKILL.md` | Loaded via skill tool |
| `vercel-composition-patterns` | `.agents/skills/vercel-composition-patterns/SKILL.md` | Loaded via skill tool |

No fallback reads needed — all skills loaded successfully via the skill tool.

---

## Files Touched

| File | Action |
|---|---|
| `src/components/ui/OpenInAIDropdown.tsx` | Rewritten — DropdownMenu → Popover |
| `src/components/import/JsonImportLayout.tsx` | Modified — added `feedback` import + `onProviderSelect` wiring |

No files outside the 2-file scope were modified.

---

## Changes — Detail

### 1. `src/components/ui/OpenInAIDropdown.tsx`

**What changed:**
- Replaced `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` imports with `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
- Removed `import { feedback } from '@/lib/feedback'`
- Added `cn` import from `@/lib/utils` for className merging
- Added `onProviderSelect?: (providerName: string, providerLabel: string) => void` to Props
- Added `className?: string` to Props
- `handleSelect` now: `clipboard.writeText` (voided, fire-and-forget) → `window.open` → `onProviderSelect?.(name, label)` → `setOpen(false)`
- Trigger uses `aria-label="Open in AI provider picker"` and `aria-haspopup="menu"`
- Popover content lists all 6 providers from `AI_PROVIDERS` (no hardcoded list)
- Each item is a `<button>` with `role="menuitem"`, hover styles via `hover:bg-accent hover:text-accent-foreground`, separated by `border-b border-border last:border-b-0`
- Popover styling: `w-56 p-1 z-50 rounded-md shadow-md border bg-popover`

### 2. `src/components/import/JsonImportLayout.tsx`

**What changed:**
- Added `import { feedback } from '@/lib/feedback'` at line 10
- Wired `onProviderSelect` on `<OpenInAIDropdown>` to call `feedback.info(...)` with the provider label

**What did NOT change (per design):**
- `promptText` remains a prop of `JsonImportUI` — already pre-computed by parent, not computed inside the dropdown
- `generateImportPrompt()` is not called inside either file — prompt is already a stable prop

---

## Verification Results

| Step | Command | Result |
|---|---|---|
| 0. audit:load | `bun run audit:load` | PASS (pre-existing warnings only) |
| 1. typecheck | `bun run typecheck` | No errors in target files (full project typecheck timed out at 180s, but focused `tsc` on target files returns clean) |
| 2. lint | `bunx eslint src/components/ui/OpenInAIDropdown.tsx src/components/import/JsonImportLayout.tsx` | PASS — only error is pre-existing unused `helpText` in `JsonImportLayout.tsx:71` (not introduced by changes) |

---

## Issues & Resolutions

| Issue | Resolution |
|---|---|
| Typecheck timeout (60s, then 180s) | Ran focused `tsc --pretty` piped through `Select-String` targeting our files — zero errors |
| Lint: `helpText` unused | Pre-existing issue, not introduced by changes |

---

## Done-Criteria Checklist

| Criteria | Status |
|---|---|
| DropdownMenu completely removed from `OpenInAIDropdown.tsx` | PASS |
| Popover-based picker renders all 6 providers from `AI_PROVIDERS` | PASS |
| Prompt is passed as a prop, not computed inside the dropdown | PASS |
| Click sequence: clipboard write → window.open → callback → close popover | PASS |
| `JsonImportLayout.tsx` pre-computes the prompt (already a prop, stable) | PASS (pre-existing) |
| Correct toast/feedback import used (`@/lib/feedback`) | PASS |
| `bun run audit:load` passes | PASS |
| Typecheck — zero errors on target files | PASS |
| Lint — zero new errors on target files | PASS |
| Work report saved to `Task/reports/phase-0-open-in-ai-fix.md` | PASS |
| No files outside 2-file scope modified | PASS |
| No `generateImportPrompt()` called inside `OpenInAIDropdown` | PASS |
| No `DropdownMenu`/`MenuItem`/etc. used | PASS |
| No emoji in UI | PASS |
| No Tailwind v4 syntax | PASS |
| No framer-motion | PASS |

---

## Deviations from Prompt

None. All instructions were followed exactly.
