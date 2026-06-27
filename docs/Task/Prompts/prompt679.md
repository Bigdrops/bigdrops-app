```text
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKILLINDEX.md`
2. Load: `Karpathy` (surgical execution), `frontend-design` (brand accuracy), `using-superpowers` (instruction hierarchy)
3. All skills in project directory only. Fallback to direct read. Stop if unreadable.
4. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save work report to `docs/Task/reports/ai-dropdown-lobe-icons-migration.md`
Push to main when complete.

==================================================
TASK: AI Provider Dropdown — Migrate to @lobehub/icons
==================================================

The current floating AI provider icon bar uses `@hugeicons/core-free-icons`
with manually chosen hex colors. The icons are inaccurate and the colors
look fake. This task replaces them with the official AI brand icons from
`@lobehub/icons` — a dedicated library of 200+ AI/LLM brand SVG logos.

READ FIRST (mandatory):
- Read the lobe-icons skill: `https://lobehub.com/icons/skill.md`
  This explains how to use the package, including React component
  variants (`.Color`, `.Brand`, etc.) and helper components.
- `src/components/ui/OpenInAIDropdown.tsx` (current implementation)
- `AGENTS.md`

==================================================
STEP 1 — INSTALL THE PACKAGE
==================================================
Install via Bun:
```bash
bun add @lobehub/icons
```

Do NOT use npm or yarn.

==================================================
STEP 2 — REPLACE ICONS IN THE DROPDOWN
==================================================

Open src/components/ui/OpenInAIDropdown.tsx. Replace every Hugeicons
icon import and usage with the corresponding lobe-icons component.

Use the .Color variant for each provider to get authentic brand colors
without manual hex codes:

Provider Import Component Notes
ChatGPT import { OpenAI } from '@lobehub/icons' <OpenAI.Color size={20} /> OpenAI = ChatGPT
Gemini import { Google } from '@lobehub/icons' <Google.Color size={20} /> Google = Gemini
Claude import { Anthropic } from '@lobehub/icons' <Anthropic.Color size={20} /> Anthropic = Claude
DeepSeek import { DeepSeek } from '@lobehub/icons' <DeepSeek.Color size={20} /> 
Qwen import { AlibabaCloud } from '@lobehub/icons' <AlibabaCloud.Color size={20} /> Alibaba Cloud = Qwen
Kimi import { Moonshot } from '@lobehub/icons' <Moonshot.Color size={20} /> Moonshot = Kimi

If any icon does NOT have a .Color variant, fall back to the base
component with the brand hex color applied via style={{ color }}.

Remove all HugeiconsIcon imports and the BRAND_COLORS map — lobe
icons handle their own colors internally.

==================================================
STEP 3 — VERIFY AND CLEAN UP
==================================================

1. Remove the HugeiconsIcon import and any remaining references.
2. Remove the BRAND_COLORS constant — lobe icons are self-colored.
3. Remove the @hugeicons/core-free-icons import entirely if no
   other file in the project uses it.
4. Remove the ambient type declarations (src/types/hugeicons.d.ts)
   if they were created earlier — they are no longer needed.

==================================================
STEP 4 — PRESERVE EXISTING FUNCTIONALITY
==================================================
The following must continue to work exactly as before:

· Portal to document.body (keeps popup above the Sheet)
· getBoundingClientRect() for positioning
· AnimatePresence + motion.div animation
· click event for outside-click close (not mousedown)
· contains() guard so icon clicks launch apps, not just close
· Android deep-link logic (intent URLs + Play Store fallback)
· Desktop window.open() fallback
· Clipboard copy before navigation

==================================================
VERIFICATION
==================================================

1. bun run typecheck — must pass with zero errors
2. bun run lint — focused on changed files

Manual checks:

· Each provider icon is instantly recognizable as its brand
· Colors are vibrant and authentic (not washed-out or fake)
· Clicking an icon launches the app/web exactly as before
· No Hugeicons or BRAND_COLORS remain in the file
· bun run typecheck passes with no new errors

==================================================
DONE WHEN
==================================================

· @lobehub/icons installed via Bun
· All 6 provider icons replaced with lobe-icons .Color variants
· HugeiconsIcon, BRAND_COLORS, and ambient type declarations removed
· All existing functionality preserved (portal, animation, deep links)
· bun run typecheck passes
· Work report saved and pushed to main

==================================================
DO NOT
==================================================

· Do NOT change the portal or positioning logic
· Do NOT change the Android deep-link logic
· Do NOT use framer-motion (use motion/react)
· Do NOT reintroduce Radix DropdownMenu or Popover
· Do NOT run bun run dev
· Do NOT skip the work report

```