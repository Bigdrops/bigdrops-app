# Modern Web Guidance — Skill Audit

Date: 2026-11-21
Scope: `.agents/skills/modern-web-guidance` and the three approved component libraries recorded alongside it in `AGENTS.md`
Type: Read-only audit plus the documentation change it justified

## Method

- Inspected `.agents/skills/modern-web-guidance/SKILL.md` (90 lines) and its corpus layout (`guides/`, 209 `.md` files across 18 disciplines).
- Cross-checked `docs/PROJECTSKILLINDEX.md` entry 159 and the three `docs/templates/*.md` stubs against their local prototype paths.
- Executed the skill once through Bun: `bunx modern-web-guidance@latest search "light dismiss dialog" --skill-version 2026_11_09-5bcc021b` (exit 0, 10 results).
- Confirmed the invocation wrote no project lockfile (`bun.lock` unchanged, dated 2026-11-17).

## Findings

| ID | Severity | Finding | Evidence |
| :--- | :--- | :--- | :--- |
| A1 | Medium | The pinned skill version is stale; the CLI reports a newer one on every run. | `Latest version: 2026_11_10-47b4c80e` vs pinned `2026_11_09-5bcc021b`, plus the warning "a new SKILL.md is available for modern-web-guidance. Please update." |
| A2 | High | The skill's documented runners (`npx`, `pnpx`, `npx.cmd`) violate this repository's Bun-only package rule. `bunx` works as a substitute. | SKILL.md "Using npx / pnpx"; `AGENTS.md` stack rule; verified `bunx` resolution and search output. |
| A3 | Medium | The bundled corpus and the CLI can drift apart: guides are static files on disk, while the CLI resolves `@latest` from the network. | 209 guide files present locally; CLI downloads the package each run. |
| A4 | Low | Guides cross-reference retrieval heavily (50+ inline `retrieve` instructions), so following them literally would reintroduce A2. | e.g. `guides/ui-components/toolbar.md`, `guides/user-experience/natural-interactions.md`. |
| A5 | Low | No local index maps guide ids to file paths; the id equals the filename and the discipline is the parent directory. | `guides/ui-behaviors/light-dismiss-a-dialog.md`, `guides/ui-components/dialog.md`. |
| A6 | Info | The skill's own trigger scope excludes backend, infra, and tooling work, which conflicts with "first-class for all tasks". | SKILL.md front matter: "DO NOT trigger for: backend (SQL, ORMs, API routes), infra/scripts…". |
| A7 | Info | The mirror at the user-level root (`C:\Users\DELL\.agents\skills\modern-web-guidance\`) was not inspected; it is outside the workspace. | `docs/PROJECTSKILLINDEX.md` entry 159. |

## Decisions applied to `AGENTS.md`

- A2 is resolved by a runner rule: use `bunx` only; `npx`/`pnpx` are not permitted for this skill.
- A6 is resolved by the gate wording: every task records the check, but non-UI work records "not applicable" rather than forcing the corpus onto backend work.
- A1 is left as reported drift: the pinned version is reported, not silently changed, so an upgrade stays a deliberate task.
- A3 and A5 are resolved by an offline fallback: read `guides/<discipline>/<guide-id>.md` directly when the CLI is unavailable.
- A4 is covered by the same runner rule, which supersedes the guides' inline `npx` examples.

The three approved component libraries (`bigdrops-free`, `kinetics`, `water-melon`) were recorded alongside the skill as first-class design build material, used on every build, with read-only, stack-adaptation, and no-foreign-token boundaries. Their stub files are unchanged.

## Limitations

- The full 209-guide corpus was not reviewed for correctness or currency; only layout, count, and cross-reference density were audited.
- No browser, preview, or runtime verification applies: this change is documentation-only.
- The `--skill-version` flag's effect on `retrieve` was not exercised; only `search` was run.
