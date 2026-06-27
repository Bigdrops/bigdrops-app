# AI Dropdown Hotfix — Correct Icons & Launch Navigation

**Date:** 2026-06-28
**Files changed:** `src/components/ui/OpenInAIDropdown.tsx`, `src/lib/openInAI.ts`

---

## What was done

### FIX 1 — Corrected the provider list

Removed all third-party icon library imports (`@lobehub/icons`). Defined a self-contained `AI_PROVIDERS` array with exactly 6 approved providers: Gemini, ChatGPT, Claude, DeepSeek, Qwen, Kimi. No Perplexity or Mistral.

### FIX 2 — Hard-coded custom SVG icons

Replaced the `ProviderIcon` component with inline SVGs for each provider:

| Provider | Icon | Background |
|----------|------|------------|
| Gemini | Circle with "G" | `#1A73E8` |
| ChatGPT | Circle with "C" | `#10A37F` |
| Claude | Anthropic logo path | `#D97757` |
| DeepSeek | Circle with "D" | `#2B5BED` |
| Qwen | Circle with "Q" | `#615CED` |
| Kimi | Circle with "K" | `#000000` |

### FIX 3 — Restored the navigation pipeline

- `handleProviderClick` copies the prompt to clipboard, then calls `navigateToProvider()`.
- `navigateToProvider()` checks `navigator.userAgent` for Android. On Android, sets `window.location.href` to the provider's intent URL. On desktop, calls `window.open()` with the provider's web URL.
- `setIsOpen(false)` closes the popup after navigation.

### Side effects

- `src/lib/openInAI.ts` updated to match the new `AIProvider` type (fields: `id`, `name`, `url`, `androidIntent`). The standalone `openInAI()` function still works.

---

## Verification

| Check | Result |
|-------|--------|
| `bun run typecheck` | Pass |
| `bunx eslint OpenInAIDropdown.tsx` | Pass |
| No `@lobehub/icons` import | Confirmed |
| No `@hugeicons` import | Confirmed |
| 6 providers in array | Confirmed |
| Portal / animation unchanged | Confirmed |

## Manual testing needed

1. Open JSON import sheet, click "Open in AI" button.
2. Popup shows exactly 6 icons: G, C, Claude SVG, D, Q, K.
3. Click any icon — correct app/website opens in new tab (desktop) or deep-links (Android).
4. Prompt is copied to clipboard before navigation.
