You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKILLINDEX.md`
2. Load: `Karpathy` (surgical execution)
3. All skills in project directory only. Fallback to direct read. Stop if unreadable.
4. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save work report to `docs/Reports/ai-dropdown-restore-and-click-fix.md`

==================================================
TASK: Restore Previous Icons + Fix Click Navigation
==================================================

Two issues:
1. The previous agent accidentally changed ChatGPT, DeepSeek, Qwen, and Kimi
   icons to single letters instead of the correct brand icons that existed
   before. Restore those four to their previous correct versions.
2. The most critical bug: clicking ANY provider icon still does NOT open
   the app or website. This must be fixed.

READ FIRST:
- `src/components/ui/OpenInAIDropdown.tsx` (current state)
- Run `git show 62e00648703cc4b58f75314fd83d9d2365434f40:src/components/ui/OpenInAIDropdown.tsx`
  to see the previous version where the four icons were correct.
- `AGENTS.md`

==================================================
CHANGE 1 — RESTORE THE FOUR PROVIDER ICONS
==================================================

From the git reference commit, extract ONLY the icon rendering code for
these four providers: ChatGPT, DeepSeek, Qwen, Kimi.

Do NOT touch Gemini or Claude icons — they are correct now and must stay
as `<ModelIcon model="gemini" />` and `<ModelIcon model="claude" />`.

The other four must be restored to exactly how they rendered in commit
`62e00648703cc4b58f75314fd83d9d2365434f40`. Copy the JSX for their
icon buttons from that commit.

==================================================
CHANGE 2 — DEBUG AND FIX THE CLICK NAVIGATION
==================================================

All six provider icons share the same `handleProviderClick` function,
but clicking them does nothing. Investigate and fix:

1. Add a temporary `console.log('clicked', providerId)` at the very top
   of `handleProviderClick`. Confirm it fires when you click an icon.
2. If it does NOT fire, the `onClick` is not wired correctly or a
   parent event is swallowing the click.
3. If it DOES fire but navigation still fails, check:
   - Is `navigator.clipboard.writeText(prompt)` being called? Is `prompt`
     a valid non-empty string?
   - On desktop, does `window.open(url, '_blank', 'noopener,noreferrer')`
     execute? Are pop-ups blocked?
   - On Android, does the `intent://` URL actually redirect? Check with
     a simple `window.location.href = intentUrl` instead of `window.open`.
4. Fix the root cause. The icons MUST open the app/website when clicked.

==================================================
VERIFICATION
==================================================
1. `bun run typecheck` — must pass
2. `bun run lint` — focused on changed file

Manual checks (document in report):
- ChatGPT, DeepSeek, Qwen, Kimi show their correct brand icons (not single letters)
- Gemini and Claude still show their ModelIcon versions
- Clicking ANY of the 6 icons opens the app/website and copies the prompt

==================================================
DONE WHEN
==================================================
- [ ] ChatGPT, DeepSeek, Qwen, Kimi icons restored to previous correct versions
- [ ] Gemini and Claude icons unchanged from current ModelIcon versions
- [ ] Clicking any provider icon successfully opens the app/website
- [ ] `bun run typecheck` passes
- [ ] Work report saved

==================================================
DO NOT
==================================================
- Do NOT touch Gemini or Claude icons
- Do NOT change the provider list
- Do NOT change the portal or animation logic
- Do NOT run `bun run dev`
- Do NOT skip the work report