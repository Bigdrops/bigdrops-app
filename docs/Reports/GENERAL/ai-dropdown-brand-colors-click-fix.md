# AI Dropdown: Brand Colors & Click Race Fix — Implementation Report

## Bugs

1. All 6 provider icons rendered in monochrome (inherited gray text color)
2. Clicking a provider icon closed the popup without launching the app

## Changes (single file: `src/components/ui/OpenInAIDropdown.tsx`)

### Fix 1 — Brand Colors
Added `BRAND_COLORS` map and applied `color` prop to each `HugeiconsIcon`:

| Provider | Hex |
|---|---|
| Gemini | `#1a73e8` |
| ChatGPT | `#10a37f` |
| Claude | `#cc785c` |
| DeepSeek | `#2b5bed` |
| Qwen | `#5046e5` |
| Kimi | `#e6533c` |

### Fix 2 — Race Condition
Changed the global outside-click listener from `mousedown` to `click`. `click` fires after the React `onClick` handler, so the provider button's `handleProviderClick` runs before the document-level close check. The `contains()` guard already prevents closing when clicking inside the popup or trigger.

## Verification
- `bun run typecheck` — **passed**
- `bun run eslint` on changed file — **passed**
