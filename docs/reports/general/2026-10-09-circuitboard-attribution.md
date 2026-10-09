# CircuitBoard Animation — Source Attribution

Creator: **Harsh Jadhav / Componentry**
GitHub / registry source: **https://componentry.dev/r/circuit-board.json**
Live demo and docs: **https://componentry.dev/docs/components/circuit-board** (mirror: https://www.componentry.fun/docs/components/circuit-board)

Attribution confidence: **VERIFIED** (registry source fetched and compared line-for-line; see §6).

This report was written by Muse Spark on 2026-10-09 via OpenCode.

Objective: identify the origin of the CircuitBoard animation used by BIGDROPS cold launch. Zero code changes apply.

Files changed: `docs/reports/general/2026-10-09-circuitboard-attribution.md` (this report only).

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## 1. Verdict

CircuitBoard is a **copied, minimally adapted open-source component** from the Componentry shadcn registry. It is not a shadcn/ui core component. It is not an npm-installed package. It is not locally authored.

BIGDROPS uses a **modified copy**: one import path changed, one directive dropped (see §5).

## 2. Creator and organization

- Name: Harsh Jadhav, publishing as **Componentry**.
- Tagline (registry site): "Beautiful, animated React UI Components for React. Built with Tailwind CSS, TypeScript, and Framer Motion."
- Corroboration: Component Hunt lists "Circuit Board — Attribution Component by Harsh Jadhav / Componentry. Verified attribution" (`componenthunt.dev/componentry/circuit-board`).

## 3. Original locations

- Registry item: `https://componentry.dev/r/circuit-board.json` (`name: "circuit-board"`, `type: "registry:ui"`).
- Demo and docs: `https://componentry.dev/docs/components/circuit-board` (usage, API table, live preview).
- Install command (registry docs): `shadcn add @componentry/circuit-board`, or `npx shadcn@latest add https://componentry.dev/r/circuit-board.json`.
- Declared runtime dependencies: `framer-motion`, `clsx`, `tailwind-merge`, `lucide-react`.

## 4. Installed package

None. The component was copy-pasted into `src/components/ui/circuit-board.tsx`. No `circuit-board` entry exists in `package.json` or the lockfile. Its runtime dependency `framer-motion@^12.38.0` is present in `package.json:79` (plus `motion@^12.42.2` at line 83).

## 5. Original versus BIGDROPS copy

The registry source and the local file match line-for-line across all exports (`CircuitBoard`, `CircuitPattern` with `data-flow`/`network`/`processor`/`tree` presets, `CircuitNode`, `CircuitTrace`, and all types), except two deliberate adaptations:

1. Import path: registry ships `import { cn } from "@workspace/ui/lib/utils"`. Local file uses `@/lib/utils` (`circuit-board.tsx:3`). Git proves the copy arrived with the upstream path and was fixed 8 minutes later (commit `b03e5a00`, diff `1 insertion, 1 deletion`, see §6).
2. The registry file opens with `"use client"`. The local file omits it (line 1 is the React import).

No BIGDROPS-specific logic was added. Distinctive signatures identical in both: `pulseSpeed = 2`, `traceWidth = 2`, node sizes 24/36/48, `pathLength = 500` approximation, `rgba(163,163,163,…)` dark defaults, `MutationObserver` theme detection, `electricGradient-${i}` / `circuitGrid` / `glow` defs.

## 6. Evidence

- `src/components/ui/circuit-board.tsx:1-120` — no header, license, or attribution comment. Interfaces and defaults identical to registry.
- `src/components/ui/circuit-board.tsx:377-454` — `CircuitPattern` presets identical to registry (`Input/Process/Validate/Merge/Output`, server/clients/db, ALU/registers, root/L1/R1 tree).
- `src/components/ui/circuit-board.tsx:666-673` — exports identical to registry tail.
- `src/components/app/SplashOverlay.tsx:4, 103, 153, 203` — sole production importer; renders three responsive instances (Session → Auth → Workspace).
- `package.json:79, 83, 93` — `framer-motion`, `motion`, `shadcn` tooling present; no circuit package.
- `components.json` (`registries` block) — lists `@componentry: https://componentry.fun/r/{name}.json` (plus `@unlumen-ui`, `@pdfcn`).
- Git commit `4647fc1b` (2026-05-05, author Bigdrops, message "Rem") — introduces `circuit-board.tsx` (673 lines, full file) and registers `@componentry` in the same commit; also touches `Clients.tsx`/`Projects.tsx` query narrowing (unrelated).
- Git commit `b03e5a00` (2026-05-05, 8 minutes later, "Update circuit-board.tsx") — the single import-path fix.
- Registry JSON fetched 2026-10-09 from `componentry.dev/r/circuit-board.json` — full source compared, match confirmed.
- Lockfile: no circuit-board entry (component is copy-paste, not installed).

## 7. License note

Component Hunt marks the component open source with "License Declared". The Componentry docs advise verifying licenses before production use. No LICENSE text was fetched during this audit. Confirm the exact license file in the Componentry repository before reusing sibling components commercially.

## 8. Where to look next

Sibling animated components live in the same catalog (`componentry.dev`, `componenthunt.dev/componentry/*`, `docs.21st.dev/@componentry/*`). Any adoption should follow the same pattern: install via the registry item (keeps the `@workspace` alias working or fix it as before), record the registry URL in the review report, and keep the cold-launch usage to presentation props only.

## 9. Verification statement

- `git status` ran before and after. Only this report was added.
- Zero source, config, dependency, or test modifications. No builds, no typecheck, no lint, no audit:load. No code executed.
