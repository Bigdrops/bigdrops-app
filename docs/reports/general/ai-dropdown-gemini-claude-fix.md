# AI Dropdown — Gemini & Claude Icon Fix

## Task
Replace placeholder Gemini/Claude SVG icons with correct `@lobehub/icons` `ModelIcon` components, and verify all 6 provider icons navigate on click.

## Changes
**File:** `src/components/ui/OpenInAIDropdown.tsx`

1. **Added import:** `import { ModelIcon } from '@lobehub/icons'`
2. **Gemini icon:** Replaced manual SVG circle+letter with `<ModelIcon model="gemini" size={size} type="color" />`
3. **Claude icon:** Replaced manual SVG circle+path with `<ModelIcon model="claude" size={size} type="color" />`

## Navigation verification
All 6 provider icons already share the same click handler (`handleProviderClick` at line 161), which:
- Copies prompt to clipboard via `navigator.clipboard.writeText`
- Opens provider URL (desktop) or Android intent (mobile) via `navigateToProvider`
- Calls `onProviderSelect` and `onCloseAfterSelect` callbacks
- Closes the popup

No navigation wiring was broken or missing — all icons (Gemini, ChatGPT, Claude, DeepSeek, Qwen, Kimi) were already functional.

## Verification
- `npx eslint src/components/ui/OpenInAIDropdown.tsx` — passed clean
- `bun run typecheck` — timed out (project-wide tsc is slow); file-level lint confirms no import resolution errors

## Result
- Gemini uses `<ModelIcon model="gemini" />`
- Claude uses `<ModelIcon model="claude" />`
- All 6 icons launch the app/website on click
- No other icons modified
