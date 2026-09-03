# AI Dropdown — Inspection Report

## 1. Icon Availability

| Icon | JS File | Type Declarations |
|---|---|---|
| ChatGPTIcon | `ChatGptIcon.js` | ✅ exported |
| ClaudeIcon | `ClaudeIcon.js` | ✅ exported |
| GoogleGeminiIcon | `GoogleGeminiIcon.js` | ✅ exported |
| DeepseekIcon | `DeepseekIcon.js` | ❌ missing from types |
| QwenIcon | `QwenIcon.js` | ❌ missing from types |
| KimiAiIcon | `KimiAiIcon.js` | ❌ missing from types |

**Finding:** JS runtime files exist for all 6 provider icons, but TypeScript declarations only export `ChatGptIcon`, `ClaudeIcon`, `GoogleGeminiIcon`. Deepseek, Qwen, and Kimi are runtime-available but untyped.

**Workaround:** Add ambient declarations in a `.d.ts` or augment `@hugeicons/core-free-icons` module:

```ts
declare module '@hugeicons/react' {
  export declare const DeepseekIcon: React.FC<IconProps>;
  export declare const QwenIcon: React.FC<IconProps>;
  export declare const KimiAiIcon: React.FC<IconProps>;
}
```

---

## 2. Animation Pattern (from `select-ai-agent.tsx`)

- **Library:** `motion/react` (NOT framer-motion — AGENTS.md forbids framer-motion)
- **Popup visibility:** controlled by `isOpen` state (boolean toggle via button `onClick`)
- **AnimatePresence:** wraps the popup, provides `mode="wait"` or no explicit mode
- **LayoutGroup:** wraps the entire container for smooth layout transitions on add/remove
- **motion.div (popup):**
  - `initial={{ opacity: 0, scale: 0.95, y: -4 }}`
  - `animate={{ opacity: 1, scale: 1, y: 0 }}`
  - `exit={{ opacity: 0, scale: 0.95, y: -4 }}`
  - `transition={{ type: "spring", duration: 0.25 }}`
- **Popup positioning:** above the trigger button via `bottom: "100%"` + `marginBottom: 8` (or similar `mb-2`)
- **Popup styling:** white bg, rounded, shadow, `p-2`, `min-w-[200px]`, flex column, gap
- **Trigger button:** predefined `onClick` toggle, `type="button"` to prevent form submit

---

## 3. Adaptation Plan for Floating Icon Bar

Replace the single-dropdown popup with a horizontal row of icon buttons inside the same `AnimatePresence` / `motion.div` wrapper:

```tsx
{isOpen && (
  <motion.div
    className="absolute bottom-full mb-2 flex flex-row gap-1 rounded-lg border bg-white p-1.5 shadow-lg"
    initial={{ opacity: 0, scale: 0.95, y: -4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: -4 }}
    transition={{ type: "spring", duration: 0.25 }}
  >
    {providers.map((p) => (
      <button key={p.id} onClick={() => openInAI(p)} ...>
        <p.icon size={18} />
      </button>
    ))}
  </motion.div>
)}
```

**Key changes from dropdown:**
- `flex-row` instead of `flex-col`
- `gap-1 p-1.5` instead of `gap-0.5 p-2`
- Each item is a `<button>` with icon-only (no text label)
- `onClick` calls `openInAI(p)` directly instead of `onSelect(p.id)`
- Remove `onMouseEnter` infinite-carousel logic from template (not needed for finite provider set)
- Remove `<ChevronDown>` since popup is icon-grid, not a select list
- Keep `HiSparkles` on the trigger button as the visual entry point

---

## Prerequisites Verified

| Prerequisite | Status |
|---|---|
| `motion` package available | ✅ Already in deps (`motion/react` used in template) |
| `@hugeicons/react` wrapper available | ✅ Already installed |
| Provider-specific icon JS files exist | ✅ All 6 present |
| Type declarations complete | ❌ 3 missing; needs ambient augmentation |
| `react-icons` (for HiSparkles) | ✅ Already installed |
