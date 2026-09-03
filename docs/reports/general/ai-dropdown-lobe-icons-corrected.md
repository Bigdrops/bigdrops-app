# AI Dropdown — Lobe Icons Correction Report

**Date:** 2026-06-27
**File:** `src/components/ui/OpenInAIDropdown.tsx`

---

## What Was Wrong

The initial migration used `.Mono` as a property on the lobe-icons components (e.g. `OpenAI.Mono`, `Anthropic.Mono`, `Moonshot.Mono`). These properties don't exist in the type definitions.

### Root Cause

In `@lobehub/icons`, each provider's default export IS the monochrome icon. The compound type is built by assigning `Mono` as the base and then attaching named sub-components (`.Color`, `.Text`, `.Avatar`, `.Combine`) as properties. So there is no `.Mono` property — calling the component directly (`<OpenAI />`) renders the mono variant.

---

## What Was Fixed

Replaced all `.Mono` references with the correct pattern:

| Provider | Before (broken) | After (correct) |
|----------|------------------|------------------|
| Gemini | `<Google.Color>` | `<Google.Color>` (unchanged — has `.Color`) |
| ChatGPT | `<OpenAI.Mono style={{...}}>` | `<OpenAI style={{ color: OpenAI.colorPrimary }}>` |
| Claude | `<Anthropic.Mono style={{...}}>` | `<Anthropic style={{ color: Anthropic.colorPrimary }}>` |
| DeepSeek | `<DeepSeek.Color>` | `<DeepSeek.Color>` (unchanged — has `.Color`) |
| Qwen | `<Qwen.Color>` | `<Qwen.Color>` (unchanged — has `.Color`) |
| Kimi | `<Moonshot.Mono style={{...}}>` | `<Moonshot style={{ color: Moonshot.colorPrimary }}>` |

Also removed the now-unnecessary `FALLBACK_COLORS` constant — each icon's `.colorPrimary` is referenced inline.

---

## Verification

- **TypeScript:** `bunx tsc --noEmit` — zero errors in `OpenInAIDropdown.tsx`
- **Lint:** `bunx eslint src/components/ui/OpenInAIDropdown.tsx` — clean
- Pre-existing `@/` alias errors from single-file tsc invocation are resolved when running via project tsconfig

---

## Preserved

All existing behavior unchanged:
- Portal to `document.body`
- `getBoundingClientRect()` positioning
- `AnimatePresence` + `motion.div` animation
- Click-based outside-close (not mousedown)
- `contains()` guard for icon clicks
- Android deep-link intent URLs + Play Store fallback
- Desktop `window.open()` fallback
- Clipboard copy before navigation
