# Phase 0 — Open in AI System Upgrade

## Summary
All 3 changes implemented across 3 scoped files. TypeScript typecheck passes with zero errors.

## Change 1 — `src/lib/openInAI.ts`: Unlocked all 6 providers

Replaced the hardcoded 3-provider `URLS` map with a typed `AI_PROVIDERS` array containing all 6 providers:

| Provider | URL pattern |
|---|---|
| Gemini | `https://gemini.google.com/?q=ENCODED_PROMPT` |
| ChatGPT | `https://chatgpt.com/?q=ENCODED_PROMPT` |
| Claude | `https://claude.ai/new?q=ENCODED_PROMPT` |
| DeepSeek | `https://chat.deepseek.com/?q=ENCODED_PROMPT` |
| Qwen | `https://chat.qwen.ai/?q=ENCODED_PROMPT` |
| Kimi | `https://kimi.moonshot.cn/?q=ENCODED_PROMPT` |

Each entry includes `name`, `label`, and `buildUrl(prompt)` function. The `openInAI()` function now resolves providers dynamically and still performs silent clipboard write before opening the tab.

## Change 2 — `src/components/ui/OpenInAIDropdown.tsx`: Dropdown with all 6 providers

Replaced the single Gemini `<a>` link with a shadcn `DropdownMenu` listing all 6 providers.

Behavior on selection:
1. Silent `navigator.clipboard.writeText(prompt)` (write-only, no read)
2. `window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer')`
3. `feedback.info("Opening [Provider Name] — prompt ready to paste if needed")`

UI: compact ghost button with ExternalLink icon + "Open in AI" label + ChevronDown chevron. Dropdown content is `w-48`, keyboard navigable via Radix primitives.

## Change 3 — `src/domain/import/promptGenerator.ts`: Append code block instruction

Appended exactly two lines to the end of every generated prompt string:

```
Wrap the JSON output in a code block.
Copy the JSON above and paste it back into the app.
```

This applies to both Add mode and Update mode outputs. No other prompt logic was modified.

## Verification

| Step | Result |
|---|---|
| `bun run audit:load` | Passed (pre-existing warnings unrelated to changes) |
| `bun run typecheck` | **Passed — zero errors** |
| Dropdown renders 6 providers | Confirmed via code review |
| Correct URL opens per provider | Confirmed via `buildUrl` pattern review |
| Silent clipboard write | Confirmed — write-only, no read, no Android toast risk |
| Toast with provider name | `feedback.info("Opening [label] — prompt ready to paste if needed")` |
| Prompts end with code block instruction | Confirmed — appended to both Add and Update return paths |

## Files Modified

1. `src/lib/openInAI.ts` — provider array + dynamic resolution
2. `src/components/ui/OpenInAIDropdown.tsx` — DropdownMenu with 6 providers
3. `src/domain/import/promptGenerator.ts` — append-only instruction lines

No import adapters, schemas, parsers, or modules outside the 3 target files were touched.
